(function () {
  const trigger = document.querySelector('.job-link-button');
  const form = document.querySelector('#mockDetails');
  const company = document.querySelector('#companyInput');
  const description = document.querySelector('#jobDescription');
  if (!trigger || !form || !company || !description || !window.fullyPrepared?.jobLinks) return;

  const entry = document.createElement('section');
  entry.className = 'job-link-entry';
  entry.hidden = true;
  const urlLabel = document.createElement('label');
  urlLabel.htmlFor = 'jobLinkUrl'; urlLabel.textContent = 'Job posting URL';
  const urlRow = document.createElement('div'); urlRow.className = 'job-link-url-row';
  const urlInput = document.createElement('input');
  urlInput.id = 'jobLinkUrl'; urlInput.type = 'url'; urlInput.required = true; urlInput.autocomplete = 'url';
  urlInput.placeholder = 'https://careers.example.com/jobs/…';
  const importButton = document.createElement('button');
  importButton.type = 'button'; importButton.className = 'prep-primary'; importButton.textContent = 'Import for review';
  urlRow.append(urlInput, importButton);
  const disclosure = document.createElement('small');
  disclosure.textContent = 'Only the public HTTPS page is fetched. The job site receives a request from your computer; review the details before adding them to a session.';
  const status = document.createElement('p');
  status.className = 'job-link-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  entry.append(urlLabel, urlRow, disclosure, status);
  trigger.insertAdjacentElement('afterend', entry);
  trigger.setAttribute('aria-expanded', 'false');

  const dialog = document.createElement('dialog');
  dialog.className = 'job-link-review'; dialog.setAttribute('aria-labelledby', 'jobLinkReviewTitle');
  const heading = document.createElement('h2'); heading.id = 'jobLinkReviewTitle'; heading.textContent = 'Review imported job details';
  const explanation = document.createElement('p'); explanation.textContent = 'The page may contain incomplete or inaccurate metadata. Edit it here; nothing is added until you confirm.';
  const titleField = document.createElement('label'); titleField.textContent = 'Detected role title';
  const titleInput = document.createElement('input'); titleInput.maxLength = 240; titleField.append(titleInput);
  const companyField = document.createElement('label'); companyField.textContent = 'Company';
  const companyInput = document.createElement('input'); companyInput.maxLength = 120; companyField.append(companyInput);
  const descriptionField = document.createElement('label'); descriptionField.textContent = 'Job description';
  const descriptionInput = document.createElement('textarea'); descriptionInput.maxLength = 20_000; descriptionInput.rows = 10; descriptionField.append(descriptionInput);
  const source = document.createElement('p'); source.className = 'job-link-source';
  const actions = document.createElement('div'); actions.className = 'job-link-review-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'prep-secondary'; cancel.textContent = 'Cancel';
  const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'prep-primary'; apply.textContent = 'Use these details';
  actions.append(cancel, apply);
  dialog.append(heading, explanation, titleField, companyField, descriptionField, source, actions);
  document.body.append(dialog);

  trigger.addEventListener('click', () => {
    entry.hidden = !entry.hidden;
    trigger.setAttribute('aria-expanded', String(!entry.hidden));
    if (!entry.hidden) urlInput.focus();
  });
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => importButton.focus());
  importButton.addEventListener('click', async () => {
    if (!urlInput.reportValidity()) return;
    importButton.disabled = true; importButton.textContent = 'Reading page…';
    status.textContent = 'Fetching the public page and looking for job-post metadata…';
    try {
      const result = await window.fullyPrepared.jobLinks.import(urlInput.value.trim());
      titleInput.value = result.title || '';
      companyInput.value = result.company || '';
      descriptionInput.value = result.description || '';
      source.textContent = `Source: ${result.sourceUrl}`;
      dialog.showModal();
      titleInput.focus();
      status.textContent = 'Details found. Review and confirm them before using.';
    } catch (error) {
      status.textContent = `Could not import this job page: ${window.FullyPreparedDiagnostics?.redact(error.message) || 'Check the URL and try again.'}`;
    } finally { importButton.disabled = false; importButton.textContent = 'Import for review'; }
  });
  apply.addEventListener('click', () => {
    if (companyInput.value.trim()) { company.value = companyInput.value.trim(); company.dispatchEvent(new Event('input', { bubbles: true })); }
    if (descriptionInput.value.trim()) { description.value = descriptionInput.value.trim(); description.dispatchEvent(new Event('input', { bubbles: true })); }
    dialog.close();
    status.textContent = 'Reviewed details added to the interview form. Check them before continuing.';
  });
})();
