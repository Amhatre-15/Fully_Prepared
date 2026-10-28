(function () {
  const liveHeader = document.querySelector('.live-header');
  if (liveHeader) {
    const liveStatus = document.createElement('span');
    liveStatus.id = 'liveModelStatus';
    liveStatus.className = 'live-model-status';
    liveStatus.setAttribute('role', 'status');
    liveStatus.setAttribute('aria-live', 'polite');
    liveStatus.setAttribute('aria-atomic', 'true');
    liveHeader.insertBefore(liveStatus, liveHeader.querySelector('strong'));
    const renderLiveStatus = () => {
      let settings = {};
      try { settings = JSON.parse(localStorage.getItem('fullyPreparedModel') || '{}') || {}; } catch {}
      const providers = { ollama: 'Ollama', lmstudio: 'LM Studio', openai: 'OpenAI-compatible', custom: 'Custom provider' };
      const model = document.querySelector('#interviewModel')?.value || settings.modelName || '';
      const testState = document.querySelector('#sessionModelStatus')?.textContent || '';
      const state = testState.includes('Connected') ? 'connected' : testState.includes('Checking') ? 'checking' : testState.includes('Could not') ? 'unavailable' : 'not tested';
      liveStatus.dataset.state = state;
      liveStatus.textContent = model ? `${providers[settings.providerSelect] || 'Model'} · ${model} · ${state}` : 'Model not configured';
    };
    renderLiveStatus();
    for (const selector of ['#providerSelect', '#modelName', '#interviewModel']) {
      document.querySelector(selector)?.addEventListener('change', renderLiveStatus);
    }
    const sessionStatus = document.querySelector('#sessionModelStatus');
    if (sessionStatus) new MutationObserver(renderLiveStatus).observe(sessionStatus, { childList: true, characterData: true, subtree: true });
    const answerButton = document.querySelector('#answerLive');
    if (answerButton) new MutationObserver(() => {
      if (answerButton.textContent.includes('Thinking')) {
        liveStatus.dataset.state = 'working';
        liveStatus.textContent = `${liveStatus.textContent.split(' · ').slice(0, 2).join(' · ')} · generating`;
      } else renderLiveStatus();
    }).observe(answerButton, { childList: true, characterData: true, subtree: true });
  }

  const speechPanel = document.querySelector('.speech-settings');
  if (speechPanel) {
    const diagnosticsButton = document.createElement('button');
    diagnosticsButton.type = 'button';
    diagnosticsButton.className = 'prep-secondary voice-diagnostics-button';
    diagnosticsButton.textContent = 'Check local voice setup';
    const diagnosticsStatus = document.createElement('p');
    diagnosticsStatus.className = 'voice-diagnostics-status';
    diagnosticsStatus.setAttribute('role', 'status');
    diagnosticsStatus.setAttribute('aria-live', 'polite');
    diagnosticsStatus.setAttribute('aria-atomic', 'true');
    speechPanel.append(diagnosticsButton, diagnosticsStatus);
    diagnosticsButton.addEventListener('click', async () => {
      diagnosticsButton.disabled = true;
      diagnosticsButton.textContent = 'Checking local speech service…';
      diagnosticsStatus.textContent = 'Checking bundled files and starting the local service if available. First startup may take a minute.';
      try {
        const endpoint = document.querySelector('#speechEndpoint')?.value.trim() || 'http://127.0.0.1:8080';
        const result = await window.fullyPrepared.speech.diagnose({ endpoint, startBundled: true });
        window.FullyPreparedDiagnosticState = { ...(window.FullyPreparedDiagnosticState || {}), speech: result.serverMessage };
        const assets = result.binaryAvailable && result.modelAvailable ? 'Bundled engine and speech model are present.' : 'A bundled speech engine or model is missing.';
        diagnosticsStatus.textContent = `${assets} ${result.serverMessage}`;
      } catch (error) {
        diagnosticsStatus.textContent = `Voice check failed: ${error.message}`;
      } finally {
        diagnosticsButton.disabled = false;
        diagnosticsButton.textContent = 'Check local voice setup';
      }
    });
  }

  const settingsCard = document.querySelector('.settings-card');
  if (settingsCard) {
    const deviceCard = document.createElement('section');
    deviceCard.className = 'device-capabilities';
    deviceCard.innerHTML = '<p class="settings-kicker">THIS DEVICE</p><h3>Local model readiness</h3><p id="deviceCapabilitiesStatus" role="status" aria-live="polite">Checking processor and graphics capabilities…</p>';
    const reportButton = document.createElement('button');
    reportButton.type = 'button';
    reportButton.className = 'prep-secondary safe-diagnostic-button';
    reportButton.textContent = 'Copy privacy-safe diagnostic summary';
    reportButton.setAttribute('aria-label', 'Copy a diagnostic summary without transcript or document contents');
    const reportStatus = document.createElement('p');
    reportStatus.className = 'voice-output-status';
    reportStatus.setAttribute('role', 'status');
    reportStatus.setAttribute('aria-live', 'polite');
    deviceCard.append(reportButton, reportStatus);
    settingsCard.after(deviceCard);
    let deviceInfo = null;
    reportButton.addEventListener('click', async () => {
      const settings = (() => { try { return JSON.parse(localStorage.getItem('fullyPreparedModel') || '{}') || {}; } catch { return {}; } })();
      const report = window.FullyPreparedDiagnostics.createSafeDiagnosticReport({
        version: window.fullyPrepared.version,
        cpu: deviceInfo?.cpu,
        memoryGiB: deviceInfo?.memoryGiB,
        architecture: deviceInfo?.architecture,
        provider: settings.providerSelect || 'not configured',
        speech: window.FullyPreparedDiagnosticState?.speech || 'not checked',
        details: reportStatus.textContent
      });
      try { await navigator.clipboard.writeText(report); reportStatus.textContent = 'Copied. The report excludes transcripts, imported file contents, endpoints, and API keys.'; }
      catch { reportStatus.textContent = report; }
    });
    window.fullyPrepared.getCapabilities().then((capabilities) => {
      deviceInfo = capabilities;
      const gpu = capabilities.gpuNames.length ? capabilities.gpuNames.join(', ') : `No discrete GPU reported (graphics: ${capabilities.gpuAcceleration})`;
      document.querySelector('#deviceCapabilitiesStatus').textContent = `${capabilities.cpu} · ${capabilities.logicalCores} logical cores · ${capabilities.memoryGiB} GiB RAM · ${capabilities.architecture}. Graphics: ${gpu}. This check runs locally and is not saved.`;
    }).catch((error) => {
      document.querySelector('#deviceCapabilitiesStatus').textContent = `Device details are unavailable: ${error.message}`;
    });
  }
})();
