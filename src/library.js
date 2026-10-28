(() => {
  const DB_NAME = 'fullyPreparedLibrary';
  const DB_VERSION = 1;
  const app = window.fullyPrepared;
  const view = document.querySelector('#libraryView');
  const createButton = document.querySelector('#createSession');
  let databasePromise;
  let currentPage = 'resumes';
  let docsCache = [];

  function database() {
    if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('documents')) request.result.createObjectStore('documents', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the local document library'));
    });
    return databasePromise;
  }

  async function allDocuments() {
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction('documents', 'readonly').objectStore('documents').getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.importedAt.localeCompare(a.importedAt)));
      request.onerror = () => reject(request.error);
    });
  }

  async function saveDocument(documentRecord) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      transaction.objectStore('documents').put(documentRecord);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Could not save this document locally'));
    });
  }

  async function removeDocument(id) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('documents', 'readwrite');
      transaction.objectStore('documents').delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function selectedDocuments(kind) {
    return docsCache.filter((item) => item.kind === kind);
  }

  function updateMockContextOptions() {
    let selected = [];
    try { selected = JSON.parse(localStorage.getItem('fullyPreparedSelectedContext') || '[]'); }
    catch { localStorage.removeItem('fullyPreparedSelectedContext'); }
    const selectedIds = new Set(Array.isArray(selected) ? selected.filter((id) => typeof id === 'string') : []);
    for (const [containerId, kind, emptyLabel] of [
      ['resumeContextOptions', 'resume', 'No resumes yet. Add one in Resumes.'],
      ['documentContextOptions', 'document', 'No documents yet. Add one in Documents.']
    ]) {
      const container = document.querySelector(`#${containerId}`);
      if (!container) continue;
      container.replaceChildren();
      const items = selectedDocuments(kind);
      if (!items.length) {
        container.append(node('p', emptyLabel, 'context-empty'));
        continue;
      }
      for (const item of items) {
        const label = node('label', undefined, 'context-option');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = item.id;
        checkbox.checked = selectedIds.has(item.id);
        checkbox.addEventListener('change', () => {
          const ids = [...document.querySelectorAll('.context-options input:checked')].map((input) => input.value);
          localStorage.setItem('fullyPreparedSelectedContext', JSON.stringify(ids));
        });
        const copy = node('span', undefined, 'context-option-copy');
        copy.append(node('strong', item.name), node('small', `${item.wordCount} words available locally`));
        label.append(checkbox, copy);
        container.append(label);
      }
    }
  }

  function renderPageShell(page) {
    currentPage = page;
    const isResume = page === 'resumes';
    createButton.classList.add('hidden');
    document.querySelector('#sessionsView').classList.add('hidden');
    document.querySelector('#settingsView').classList.add('hidden');
    document.querySelector('#placeholderView').classList.add('hidden');
    view.classList.remove('hidden');
    view.replaceChildren();

    const header = node('div', undefined, 'library-heading');
    const copy = node('div');
    copy.append(node('p', isResume ? 'CAREER WORKSPACE' : 'FILE LIBRARY', 'settings-kicker'));
    copy.append(node('h2', isResume ? 'Resumes' : 'Documents'));
    copy.append(node('p', isResume
      ? 'Keep versions organized and see how the evidence in your resume lines up with a specific role.'
      : 'Keep job descriptions, notes, and supporting files together. Files are read and stored on this device.'));
    const upload = node('button', isResume ? 'Upload resume' : 'Add document', 'library-primary');
    upload.type = 'button';
    upload.addEventListener('click', () => importDocument(isResume ? 'resume' : 'document'));
    header.append(copy, upload);
    view.append(header);

    if (isResume) renderResumeReview();
    else renderDocumentTools();

    const listHeader = node('div', undefined, 'library-list-heading');
    listHeader.append(node('h3', isResume ? 'Your resumes' : 'Your documents'));
    listHeader.append(node('span', `${selectedDocuments(isResume ? 'resume' : 'document').length} saved`));
    view.append(listHeader);
    const list = node('div', undefined, 'library-list');
    list.id = 'libraryItems';
    view.append(list);
    renderItems();
    updateMockContextOptions();
  }

  function renderResumeReview() {
    const panel = node('section', undefined, 'resume-review-panel');
    const intro = node('div', undefined, 'review-intro');
    intro.append(node('p', 'JOB-SPECIFIC REVIEW', 'settings-kicker'));
    intro.append(node('h3', 'How closely does your resume fit?'));
    intro.append(node('p', 'Compare a resume with the role and job post. The score is based on visible text, section structure, and evidence—not a hiring prediction.'));

    const form = node('div', undefined, 'review-form');
    const resumeLabel = node('label', 'Resume to review');
    resumeLabel.htmlFor = 'reviewResume';
    const resumeSelect = node('select');
    resumeSelect.id = 'reviewResume';
    resumeSelect.required = true;
    resumeSelect.append(new Option('Choose a saved resume', ''));
    for (const resume of selectedDocuments('resume')) resumeSelect.add(new Option(resume.name, resume.id));
    resumeSelect.addEventListener('change', () => {
      document.querySelector('#resumeReviewResults').classList.add('hidden');
      document.querySelector('#reviewStatus').textContent = '';
    });
    const previousReview = selectedDocuments('resume').find((resume) => resume.lastReview?.result);
    if (previousReview) resumeSelect.value = previousReview.id;
    resumeLabel.append(resumeSelect);

    const roleLabel = node('label', 'Job title');
    roleLabel.htmlFor = 'reviewJobTitle';
    const roleInput = node('input');
    roleInput.id = 'reviewJobTitle';
    roleInput.type = 'text';
    roleInput.maxLength = 120;
    roleInput.placeholder = 'e.g. Junior Data Analyst';
    roleLabel.append(roleInput);

    const descriptionLabel = node('label', 'Job description');
    descriptionLabel.htmlFor = 'reviewJobDescription';
    const description = node('textarea');
    description.id = 'reviewJobDescription';
    description.maxLength = 30000;
    description.rows = 5;
    description.placeholder = 'Paste the responsibilities and requirements here for the most useful comparison.';
    descriptionLabel.append(description);
    if (previousReview) {
      roleInput.value = previousReview.lastReview.role || '';
      description.value = previousReview.lastReview.description || '';
    }

    const status = node('p', '', 'library-status');
    status.id = 'reviewStatus';
    status.setAttribute('role', 'status');
    const run = node('button', 'Review resume', 'library-primary');
    run.type = 'button';
    run.id = 'runResumeReview';
    run.addEventListener('click', runReview);
    form.append(resumeLabel, roleLabel, descriptionLabel, run, status);
    panel.append(intro, form);
    view.append(panel);

    const results = node('section', undefined, 'resume-review-results hidden');
    results.id = 'resumeReviewResults';
    view.append(results);

    if (previousReview) buildReviewResults(previousReview.lastReview.result, previousReview, previousReview.lastReview.role);
  }

  function renderDocumentTools() {
    const tools = node('div', undefined, 'document-tools');
    const label = node('label', 'Search documents');
    label.htmlFor = 'documentSearch';
    const search = node('input');
    search.id = 'documentSearch';
    search.type = 'search';
    search.placeholder = 'Search names and extracted text';
    label.append(search);
    search.addEventListener('input', renderItems);
    const note = node('p', 'Supported formats: PDF, DOCX, and TXT. Text extraction and scanned-PDF OCR run locally; imported text stays in this app library.');
    tools.append(label, note);
    view.append(tools);
  }

  async function importDocument(kind) {
    if (localStorage.getItem('fullyPreparedDocumentDisclosure') !== 'accepted') {
      const consent = confirm('Document privacy: the file is opened by the app and readable text is extracted locally, then stored in this app profile. Text stays on this device unless you select the item as model context; hosted model endpoints can receive that selected text. Continue to choose a file?');
      if (!consent) return;
      localStorage.setItem('fullyPreparedDocumentDisclosure', 'accepted');
    }
    let status = currentPage === 'resumes' ? document.querySelector('#reviewStatus') : null;
    if (status) status.textContent = 'Choose a PDF, DOCX, or TXT file…';
    try {
      const imported = await app.library.importFile(kind);
      if (!imported) {
        if (status) status.textContent = '';
        return;
      }
      await saveDocument(imported);
      docsCache = await allDocuments();
      if (currentPage === `${kind}s`) {
        renderPageShell(currentPage);
        status = currentPage === 'resumes' ? document.querySelector('#reviewStatus') : null;
        if (kind === 'resume') document.querySelector('#reviewResume').value = imported.id;
      }
      if (status) status.textContent = `Saved ${imported.name} on this device.`;
    } catch (error) {
      if (status) status.textContent = error.message;
      else alert(error.message);
    }
  }

  function buildReviewResults(result, resume, role) {
    const section = document.querySelector('#resumeReviewResults');
    section.replaceChildren();
    section.classList.remove('hidden');
    const top = node('div', undefined, 'review-result-top');
    const score = node('div', String(result.score), 'review-score');
    score.setAttribute('aria-label', `Role alignment estimate: ${result.score} out of 100`);
    const title = node('div');
    title.append(node('p', 'ROLE ALIGNMENT ESTIMATE', 'settings-kicker'));
    title.append(node('h3', result.band));
    title.append(node('p', `${resume.name} · ${role || 'Job description match'}`));
    top.append(score, title);

    const rubric = node('div', undefined, 'review-rubric');
    const rubricItems = [
      ['Job-title overlap', result.rubric.roleTerms, 25],
      ['Job keyword coverage', result.rubric.jobKeywords, 45],
      ['Resume structure', result.rubric.structure, 15],
      ['Outcome evidence', result.rubric.evidence, 15]
    ];
    for (const [label, value, max] of rubricItems) {
      const row = node('div', undefined, 'rubric-row');
      row.append(node('span', label));
      const meter = node('progress');
      meter.max = max;
      meter.value = value;
      meter.setAttribute('aria-label', `${label}: ${value} out of ${max}`);
      row.append(meter, node('strong', `${value}/${max}`));
      rubric.append(row);
    }
    section.append(top, rubric);

    const columns = node('div', undefined, 'review-columns');
    for (const [heading, terms, empty] of [
      ['Evidence found in your resume', result.matchedKeywords, 'No direct keyword matches found in the compared text.'],
      ['Terms not found in the text', result.missingKeywords, 'All compared terms appear in the resume text.']
    ]) {
      const box = node('section', undefined, 'review-term-box');
      box.append(node('h4', heading));
      if (!terms.length) box.append(node('p', empty));
      else {
        const list = node('ul');
        for (const term of terms) list.append(node('li', term));
        box.append(list);
      }
      columns.append(box);
    }
    section.append(columns);

    const advice = node('section', undefined, 'review-advice');
    advice.append(node('h4', 'Practical next steps'));
    const adviceList = node('ul');
    for (const recommendation of result.recommendations) adviceList.append(node('li', recommendation));
    advice.append(adviceList);
    section.append(advice, node('p', result.caveat, 'review-caveat'));
  }

  async function runReview() {
    const status = document.querySelector('#reviewStatus');
    const resume = docsCache.find((item) => item.id === document.querySelector('#reviewResume').value);
    const role = document.querySelector('#reviewJobTitle').value.trim();
    const description = document.querySelector('#reviewJobDescription').value.trim();
    if (!resume) { status.textContent = 'Choose a resume to review.'; document.querySelector('#reviewResume').focus(); return; }
    const button = document.querySelector('#runResumeReview');
    button.disabled = true;
    button.textContent = 'Reviewing…';
    status.textContent = 'Comparing the resume text with the role requirements locally…';
    try {
      const result = window.FullyPreparedResumeAnalysis.analyzeResume({ resumeText: resume.text, jobTitle: role, jobDescription: description });
      resume.lastReview = { createdAt: new Date().toISOString(), role, description, result };
      await saveDocument(resume);
      buildReviewResults(result, resume, role);
      status.textContent = 'Review complete. Your resume content was analyzed locally.';
      document.querySelector('#resumeReviewResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      status.textContent = error.message;
      document.querySelector('#resumeReviewResults').classList.add('hidden');
    } finally {
      button.disabled = false;
      button.textContent = 'Review resume';
    }
  }

  function renderItems() {
    const list = document.querySelector('#libraryItems');
    if (!list) return;
    const kind = currentPage === 'resumes' ? 'resume' : 'document';
    const query = (document.querySelector('#documentSearch')?.value || '').trim().toLowerCase();
    const items = selectedDocuments(kind).filter((item) => !query || `${item.name} ${item.text}`.toLowerCase().includes(query));
    list.replaceChildren();
    if (!items.length) {
      const empty = node('div', undefined, 'library-empty');
      empty.append(node('span', kind === 'resume' ? 'Resume library' : 'Document library', 'settings-kicker'));
      empty.append(node('h3', kind === 'resume' ? 'Add your first resume' : 'Keep useful files close at hand'));
      empty.append(node('p', kind === 'resume'
        ? 'Upload a PDF, Word document, or text file. We extract readable text locally so you can compare it to a specific job.'
        : 'Add job descriptions, notes, and supporting files. You can review and remove each item whenever you like.'));
      const add = node('button', kind === 'resume' ? 'Upload resume' : 'Add document', 'library-secondary');
      add.addEventListener('click', () => importDocument(kind));
      empty.append(add);
      list.append(empty);
      return;
    }

    for (const item of items) {
      const card = node('article', undefined, 'library-item');
      const info = node('div', undefined, 'library-item-info');
      info.append(node('span', item.extension.toUpperCase(), 'file-type'));
      const detail = node('div');
      detail.append(node('h4', item.name));
      detail.append(node('p', `${new Date(item.importedAt).toLocaleDateString()} · ${formatBytes(item.size)} · ${item.wordCount} words extracted`));
      info.append(detail);
      const actions = node('div', undefined, 'library-item-actions');
      if (kind === 'resume') {
        const review = node('button', 'Review for a job');
        review.addEventListener('click', () => {
          const select = document.querySelector('#reviewResume');
          select.value = item.id;
          document.querySelector('#reviewJobTitle').focus();
        });
        actions.append(review);
      }
      const remove = node('button', 'Remove', 'library-remove');
      remove.addEventListener('click', async () => {
        if (!confirm(`Remove “${item.name}” from this device's library?`)) return;
        await removeDocument(item.id);
        docsCache = await allDocuments();
        renderPageShell(currentPage);
      });
      actions.append(remove);
      card.append(info, actions);
      const details = node('details', undefined, 'document-preview');
      details.append(node('summary', 'View extracted text'));
      details.append(node('pre', item.text));
      card.append(details);
      if (kind === 'resume' && item.lastReview) {
        card.append(node('p', `Last review: ${item.lastReview.result.score}/100 · ${item.lastReview.role || 'job description'} · ${new Date(item.lastReview.createdAt).toLocaleDateString()}`, 'last-review'));
      }
      list.append(card);
    }
  }

  async function renderLibraryView(page) {
    if (!['resumes', 'documents'].includes(page)) return;
    try {
      docsCache = await allDocuments();
      renderPageShell(page);
    } catch (error) {
      view.classList.remove('hidden');
      view.replaceChildren(node('p', `Could not open the local library: ${error.message}`, 'library-error'));
    }
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.nav-link');
    if (!link) return;
    if (['resumes', 'documents'].includes(link.dataset.view)) {
      createButton.classList.add('hidden');
      window.renderLibraryView(link.dataset.view);
    } else {
      view.classList.add('hidden');
      createButton.classList.remove('hidden');
    }
  });

  window.renderLibraryView = renderLibraryView;
  window.FullyPreparedLibraryStore = {
    getSelectedContext() {
      const ids = [...document.querySelectorAll('.context-options input:checked')].map((input) => input.value);
      return docsCache.filter((item) => ids.includes(item.id)).map(({ id, name, kind }) => ({ id, name, kind }));
    },
    async getContextText(ids) {
      const wanted = new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []);
      return docsCache.filter((item) => wanted.has(item.id)).map(({ name, text, kind }) => ({ name, kind, text: String(text || '').slice(0, 12000) }));
    },
    async saveGeneratedResume({ name, text }) {
      const content = String(text || '').trim();
      const filename = String(name || 'Resume.txt').slice(0, 180);
      if (content.length < 80) throw new Error('Add a little more resume information before saving it.');
      const record = {
        id: `resume-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: filename,
        extension: 'txt',
        size: new Blob([content]).size,
        kind: 'resume',
        text: content.slice(0, 100_000),
        wordCount: content.split(/\s+/).filter(Boolean).length,
        importedAt: new Date().toISOString()
      };
      await saveDocument(record);
      docsCache = await allDocuments();
      updateMockContextOptions();
      return record;
    }
  };
  allDocuments().then((items) => { docsCache = items; updateMockContextOptions(); }).catch(() => {});
})();
