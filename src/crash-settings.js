(() => {
  const deleteAllButton = document.querySelector('.danger-button');
  deleteAllButton?.addEventListener('click', async (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    if (!confirm('Delete all Fully Prepared data on this device? This removes sessions, imported files, question notes, headshots, settings, saved keys, local OCR cache, and crash reports. This cannot be undone.')) return;
    deleteAllButton.disabled = true; deleteAllButton.textContent = 'Deleting…';
    try {
      await window.fullyPrepared.diagnostics.clearPrivateLocalData();
      const databases = await indexedDB.databases();
      for (const database of databases) if (database.name) await clearDatabaseContents(database.name);
      await window.fullyPrepared.models.storeApiKey('');
      localStorage.clear(); sessionStorage.clear(); location.reload();
    } catch (error) {
      deleteAllButton.disabled = false; deleteAllButton.textContent = 'Try deletion again';
      window.showFoundationToast?.(`Could not finish deleting local data: ${error.message}`, 'error');
    }
  }, { capture: true });

  const anchor = document.querySelector('.about-card');
  if (!anchor || !window.fullyPrepared?.diagnostics) return;
  const card = document.createElement('section');
  card.className = 'crash-report-card';
  const title = document.createElement('h3'); title.textContent = 'Optional crash reports';
  const description = document.createElement('p'); description.textContent = 'If the app crashes, save a small report on this device with the process type and exit reason. Reports are never uploaded. They exclude transcripts, document contents, file paths, keys, and error text.';
  const label = document.createElement('label'); label.className = 'crash-report-toggle';
  const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.setAttribute('aria-label', 'Save local crash reports');
  const toggleText = document.createElement('span'); toggleText.textContent = 'Save crash reports on this device';
  label.append(toggle, toggleText);
  const status = document.createElement('p'); status.className = 'crash-report-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div'); actions.className = 'crash-report-actions';
  const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.textContent = 'Export report'; exportButton.disabled = true;
  const clearButton = document.createElement('button'); clearButton.type = 'button'; clearButton.textContent = 'Delete reports'; clearButton.disabled = true;
  actions.append(exportButton, clearButton);
  card.append(title, description, label, status, actions);
  anchor.after(card);

  async function refresh() {
    const settings = await window.fullyPrepared.diagnostics.getCrashReports();
    toggle.checked = settings.enabled;
    exportButton.disabled = !settings.count;
    clearButton.disabled = !settings.count;
    status.textContent = settings.count ? `${settings.count} local report${settings.count === 1 ? '' : 's'} saved.` : 'No crash reports saved.';
  }
  toggle.addEventListener('change', async () => {
    toggle.disabled = true;
    try {
      await window.fullyPrepared.diagnostics.setCrashReportsEnabled(toggle.checked);
      localStorage.setItem('fullyPreparedCrashCapture', String(toggle.checked));
      status.textContent = toggle.checked ? 'Crash reports are enabled and stay on this device.' : 'Crash reports are off. Existing reports remain until you delete them.';
    } catch (error) { toggle.checked = !toggle.checked; status.textContent = `Could not save this preference: ${error.message}`; }
    finally { toggle.disabled = false; }
  });
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      const result = await window.fullyPrepared.diagnostics.exportCrashReport();
      status.textContent = result.saved ? 'Local crash report exported.' : result.canceled ? 'Export canceled.' : 'There are no reports to export.';
    } catch (error) { status.textContent = `Could not export the report: ${error.message}`; }
    finally { await refresh(); }
  });
  clearButton.addEventListener('click', async () => {
    if (!confirm('Delete all local crash reports from this device? This cannot be undone.')) return;
    clearButton.disabled = true;
    try { await window.fullyPrepared.diagnostics.clearCrashReports(); status.textContent = 'Local crash reports deleted.'; }
    catch (error) { status.textContent = `Could not delete crash reports: ${error.message}`; }
    finally { await refresh(); }
  });
  void refresh().catch((error) => { status.textContent = `Crash report settings are unavailable: ${error.message}`; });
})();
