(() => {
  const root = document.querySelector('#preparationView');
  const navTitles = {
    questions: ['Question Bank', 'Build a steady interview-practice habit with a searchable local library.'],
    'resume-maker': ['Resume Maker', 'Create a clean, editable resume and keep the draft on this device.'],
    headshots: ['Headshots', 'Prepare profile-ready crops from your own photos.']
  };
  let dbPromise;
  let activeQuestionId = '';
  let currentPhoto = null;
  let currentPage = '';
  let renderToken = 0;
  const builtInQuestions = [
    ['Tell me about yourself and the experience most relevant to this role.', 'Opening', 'story, experience'],
    ['What interested you in this position and our company?', 'Motivation', 'research, fit'],
    ['What are you looking for in your next role?', 'Motivation', 'goals, growth'],
    ['Describe a project you are proud of. What did you contribute?', 'Behavioral', 'ownership, impact'],
    ['Tell me about a time you had to learn something quickly.', 'Behavioral', 'learning, adaptability'],
    ['Describe a time you received difficult feedback. What did you do with it?', 'Behavioral', 'feedback, growth'],
    ['Tell me about a disagreement with a teammate and how you resolved it.', 'Behavioral', 'communication, conflict'],
    ['Describe a mistake you made at work and what you learned.', 'Behavioral', 'accountability, learning'],
    ['Tell me about a time you had several competing deadlines.', 'Behavioral', 'prioritization, delivery'],
    ['Give an example of a process you improved.', 'Problem solving', 'initiative, improvement'],
    ['How do you approach an unfamiliar problem when the requirements are unclear?', 'Problem solving', 'ambiguity, reasoning'],
    ['Tell me about a decision you made with incomplete information.', 'Problem solving', 'judgment, risk'],
    ['How do you decide what to work on first?', 'Problem solving', 'prioritization, tradeoffs'],
    ['Describe a time you used data or evidence to change your approach.', 'Problem solving', 'analysis, evidence'],
    ['How do you explain a complex topic to someone without your technical background?', 'Communication', 'clarity, audience'],
    ['Tell me about a time you influenced a decision without formal authority.', 'Leadership', 'influence, collaboration'],
    ['How do you help a team stay aligned when priorities change?', 'Leadership', 'alignment, change'],
    ['What is your approach to delegating work?', 'Leadership', 'trust, ownership'],
    ['How do you create an environment where teammates can raise concerns?', 'Leadership', 'psychological safety, listening'],
    ['How do you test and maintain the quality of your work?', 'Technical', 'quality, testing'],
    ['Walk me through a technical decision and the tradeoffs you considered.', 'Technical', 'architecture, tradeoffs'],
    ['How would you investigate a performance issue in a system you did not build?', 'Technical', 'debugging, performance'],
    ['What would you do if you discovered a security concern close to release?', 'Situational', 'security, escalation'],
    ['What questions would you like to ask us?', 'Closing', 'curiosity, evaluation']
  ].map(([text, category, tags], index) => ({
    id: `builtin-${index + 1}`,
    text,
    category,
    tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    origin: 'builtin',
    favorite: false,
    practiced: false,
    notes: ''
  }));

  function element(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function database() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('fullyPreparedPreparation', 1);
      request.onupgradeneeded = () => {
        for (const store of ['questions', 'headshots']) {
          if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open this local workspace.'));
    });
    return dbPromise;
  }

  async function allFrom(storeName) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function putInto(storeName, item) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(item);
      transaction.oncomplete = () => resolve(item);
      transaction.onerror = () => reject(transaction.error || new Error('Could not save on this device.'));
    });
  }

  async function removeFrom(storeName, id) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function seedQuestions() {
    const existing = await allFrom('questions');
    if (existing.length) return existing;
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('questions', 'readwrite');
      const store = transaction.objectStore('questions');
      builtInQuestions.forEach((item) => store.put(item));
      transaction.oncomplete = () => resolve(builtInQuestions);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function setPageHeader(page) {
    currentPage = page;
    const [title, subtitle] = navTitles[page];
    document.querySelector('#pageTitle').textContent = title;
    document.querySelector('#pageSubtitle').textContent = subtitle;
    document.querySelector('#placeholderView').classList.add('hidden');
    document.querySelector('#sessionsView').classList.add('hidden');
    document.querySelector('#settingsView').classList.add('hidden');
    document.querySelector('#libraryView').classList.add('hidden');
    root.classList.remove('hidden');
    root.replaceChildren();
  }

  function makeHeading(kicker, title, description, action) {
    const header = element('header', undefined, 'prep-heading');
    const copy = element('div');
    copy.append(element('p', kicker, 'settings-kicker'), element('h2', title), element('p', description));
    header.append(copy);
    if (action) header.append(action);
    return header;
  }

  function statusLine(parent, id, text = '') {
    const status = element('p', text, 'prep-status');
    status.id = id;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    parent.append(status);
    return status;
  }

  function labelledInput(labelText, id, props = {}) {
    const label = element('label', labelText, 'prep-field');
    label.htmlFor = id;
    const control = document.createElement(props.multiline ? 'textarea' : 'input');
    control.id = id;
    if (props.multiline) control.rows = props.rows || 3;
    else control.type = props.type || 'text';
    if (props.placeholder) control.placeholder = props.placeholder;
    if (props.maxLength) control.maxLength = props.maxLength;
    if (props.autocomplete) control.autocomplete = props.autocomplete;
    label.append(control);
    if (props.help) label.append(element('small', props.help));
    return { label, control };
  }

  async function renderQuestions(token) {
    setPageHeader('questions');
    const data = await seedQuestions();
    if (token !== renderToken || currentPage !== 'questions') return;
    const saved = element('button', 'Add my question', 'prep-primary');
    saved.type = 'button';
    const header = makeHeading('PRACTICE LIBRARY', 'Question Bank', 'Browse common interview prompts, save the ones you want to practice, and keep private notes on your answers.', saved);
    root.append(header);

    const stats = element('div', undefined, 'prep-stats');
    const favoriteCount = data.filter((item) => item.favorite).length;
    const practicedCount = data.filter((item) => item.practiced).length;
    for (const [number, label] of [[String(data.length), 'Questions available'], [String(favoriteCount), 'Saved for later'], [String(practicedCount), 'Practiced']]) {
      const card = element('div', undefined, 'prep-stat');
      card.append(element('strong', number), element('span', label));
      stats.append(card);
    }
    root.append(stats);

    const tools = element('div', undefined, 'question-tools');
    const searchLabel = element('label', 'Search questions', 'prep-field');
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Try “feedback”, “technical”, or “leadership”';
    search.setAttribute('aria-label', 'Search questions');
    searchLabel.append(search);
    const categoryLabel = element('label', 'Category', 'prep-field');
    const category = document.createElement('select');
    category.setAttribute('aria-label', 'Filter questions by category');
    for (const value of ['All categories', ...new Set(data.map((item) => item.category).sort())]) category.add(new Option(value, value === 'All categories' ? '' : value));
    categoryLabel.append(category);
    const onlySavedLabel = element('label', undefined, 'question-saved-filter');
    const onlySaved = document.createElement('input');
    onlySaved.type = 'checkbox';
    onlySavedLabel.append(onlySaved, element('span', 'Saved only'));
    tools.append(searchLabel, categoryLabel, onlySavedLabel);
    root.append(tools);

    const workspace = element('div', undefined, 'question-workspace');
    const list = element('div', undefined, 'question-list');
    const detail = element('section', undefined, 'question-detail');
    detail.setAttribute('aria-label', 'Practice notes');
    workspace.append(list, detail);
    root.append(workspace);
    const addForm = createQuestionForm();
    root.append(addForm.panel);
    addForm.panel.classList.add('hidden');
    saved.addEventListener('click', () => { addForm.panel.classList.toggle('hidden'); if (!addForm.panel.classList.contains('hidden')) addForm.question.focus(); });

    async function refresh() {
      const records = await allFrom('questions');
      const query = search.value.trim().toLowerCase();
      const filtered = records.filter((item) => (!onlySaved.checked || item.favorite)
        && (!category.value || item.category === category.value)
        && (!query || `${item.text} ${item.category} ${(item.tags || []).join(' ')}`.toLowerCase().includes(query)));
      list.replaceChildren();
      if (!filtered.length) {
        const empty = element('div', undefined, 'prep-empty');
        empty.append(element('h3', onlySaved.checked ? 'No saved questions match' : 'No questions match that search'));
        empty.append(element('p', 'Try a broader phrase or category, or add a question that fits your target role.'));
        const clear = element('button', 'Clear filters', 'prep-secondary');
        clear.addEventListener('click', () => { search.value = ''; category.value = ''; onlySaved.checked = false; refresh(); });
        empty.append(clear);
        list.append(empty);
      } else {
        for (const item of filtered) {
          const card = element('article', undefined, `question-card${item.id === activeQuestionId ? ' selected' : ''}`);
          const categoryPill = element('span', item.category, 'prep-pill');
          const title = element('h3', item.text);
          const tags = element('p', (item.tags || []).join(' · '), 'question-tags');
          const actions = element('div', undefined, 'question-actions');
          const practice = element('button', item.practiced ? 'Practice again' : 'Practice', 'prep-primary');
          practice.addEventListener('click', async () => { activeQuestionId = item.id; await refresh(); document.querySelector('#practiceNotes')?.focus(); });
          const favorite = element('button', item.favorite ? 'Saved' : 'Save', 'prep-secondary');
          favorite.setAttribute('aria-pressed', String(Boolean(item.favorite)));
          favorite.addEventListener('click', async () => { await putInto('questions', { ...item, favorite: !item.favorite }); await refresh(); });
          actions.append(practice, favorite);
          if (item.origin === 'custom') {
            const remove = element('button', 'Remove', 'prep-danger-text');
            remove.addEventListener('click', async () => {
              if (!confirm('Remove this custom question from your local bank?')) return;
              await removeFrom('questions', item.id);
              if (activeQuestionId === item.id) activeQuestionId = '';
              await refresh();
            });
            actions.append(remove);
          }
          card.append(categoryPill, title, tags, actions);
          list.append(card);
        }
      }
      const current = records.find((item) => item.id === activeQuestionId);
      renderQuestionDetail(detail, current, refresh);
      const statElements = stats.querySelectorAll('.prep-stat strong');
      statElements[0].textContent = String(records.length);
      statElements[1].textContent = String(records.filter((item) => item.favorite).length);
      statElements[2].textContent = String(records.filter((item) => item.practiced).length);
    }

    search.addEventListener('input', refresh);
    category.addEventListener('change', refresh);
    onlySaved.addEventListener('change', refresh);
    addForm.panel.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = addForm.question.value.trim();
      if (text.length < 12) { addForm.status.textContent = 'Write a complete interview question (at least 12 characters).'; addForm.question.focus(); return; }
      try {
        const custom = window.FullyPreparedPreparationCore.createCustomQuestion({ text, category: addForm.category.value, tags: addForm.tags.value });
        await putInto('questions', custom);
        addForm.question.value = '';
        addForm.tags.value = '';
        addForm.status.textContent = 'Question saved on this device.';
        await refresh();
      } catch (error) { addForm.status.textContent = error.message; }
    });
    await refresh();
  }

  function createQuestionForm() {
    const panel = element('form', undefined, 'custom-question-form');
    panel.append(element('h3', 'Add a custom question'));
    const question = labelledInput('Question', 'customQuestion', { multiline: true, rows: 3, maxLength: 600, placeholder: 'Write the question you want to practice…' });
    const category = labelledInput('Category', 'customQuestionCategory');
    category.control.replaceWith(Object.assign(document.createElement('select'), { id: 'customQuestionCategory' }));
    const select = category.label.querySelector('select');
    ['Behavioral', 'Technical', 'Leadership', 'Motivation', 'Situational', 'Other'].forEach((value) => select.add(new Option(value, value)));
    const tags = labelledInput('Tags', 'customQuestionTags', { placeholder: 'e.g. teamwork, delivery, role-specific' });
    const status = statusLine(panel, 'customQuestionStatus');
    const submit = element('button', 'Save question', 'prep-primary');
    submit.type = 'submit';
    const close = element('button', 'Cancel', 'prep-secondary');
    close.type = 'button';
    close.addEventListener('click', () => panel.classList.add('hidden'));
    const actions = element('div', undefined, 'prep-actions');
    actions.append(submit, close);
    panel.append(question.label, category.label, tags.label, status, actions);
    return { panel, question: question.control, category: select, tags: tags.control, status };
  }

  function renderQuestionDetail(detail, question, refresh) {
    detail.replaceChildren();
    if (!question) {
      detail.append(element('p', 'PRACTICE NOTES', 'settings-kicker'), element('h3', 'Choose a question to begin'));
      detail.append(element('p', 'Pick any prompt to rehearse it and keep your answer notes privately on this device.'));
      return;
    }
    detail.append(element('p', 'PRACTICE NOTES', 'settings-kicker'), element('h3', question.text), element('span', question.category, 'prep-pill'));
    const field = labelledInput('Your answer notes', 'practiceNotes', { multiline: true, rows: 10, maxLength: 8000, placeholder: 'Use Situation, Task, Action, Result—or jot down the main points you want to remember.' });
    field.control.value = question.notes || '';
    detail.append(field.label);
    const status = statusLine(detail, 'practiceStatus', question.practiced ? 'You have practiced this question before.' : 'Notes are saved locally as you type.');
    let saveTimer;
    field.control.addEventListener('input', () => {
      status.textContent = 'Saving notes…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try { await putInto('questions', { ...question, notes: field.control.value }); status.textContent = 'Notes saved on this device.'; }
        catch (error) { status.textContent = `Could not save: ${error.message}`; }
      }, 250);
    });
    const practiced = element('button', question.practiced ? 'Practiced' : 'Mark as practiced', 'prep-primary');
    practiced.disabled = Boolean(question.practiced);
    practiced.addEventListener('click', async () => { await putInto('questions', { ...question, practiced: true }); await refresh(); });
    detail.append(practiced);
  }

  function loadResumeDraft() {
    try {
      const value = JSON.parse(localStorage.getItem('fullyPreparedResumeDraft') || '{}');
      return { name: '', headline: '', email: '', phone: '', location: '', summary: '', experiences: [{ role: '', company: '', dates: '', details: '' }], education: '', skills: '', ...value };
    } catch { return { name: '', headline: '', email: '', phone: '', location: '', summary: '', experiences: [{ role: '', company: '', dates: '', details: '' }], education: '', skills: '' }; }
  }

  function renderResumeMaker() {
    setPageHeader('resume-maker');
    const draft = loadResumeDraft();
    const saveLibraryButton = element('button', 'Save to Resumes', 'prep-primary');
    saveLibraryButton.type = 'button';
    const header = makeHeading('CAREER TOOLKIT', 'Resume Maker', 'Draft a straightforward, editable resume. Your content stays local until you choose to send or export it.', saveLibraryButton);
    root.append(header);
    const layout = element('div', undefined, 'resume-maker-layout');
    const form = element('form', undefined, 'resume-maker-form');
    const preview = element('section', undefined, 'resume-live-preview');
    preview.setAttribute('aria-label', 'Resume text preview');
    const inputFields = [
      ['Full name', 'name', { autocomplete: 'name', maxLength: 100 }],
      ['Professional headline', 'headline', { placeholder: 'e.g. Operations analyst | process improvement', maxLength: 140 }],
      ['Email', 'email', { type: 'email', autocomplete: 'email', maxLength: 160 }],
      ['Phone', 'phone', { type: 'tel', autocomplete: 'tel', maxLength: 60 }],
      ['Location', 'location', { autocomplete: 'address-level2', maxLength: 120 }],
      ['Professional summary', 'summary', { multiline: true, rows: 4, maxLength: 1500, placeholder: 'Summarize your experience and strengths in your own words.' }]
    ];
    const controls = {};
    const summaryDraftButton = element('button', 'Draft summary with AI', 'prep-secondary');
    summaryDraftButton.type = 'button';
    const summaryAiHelp = element('small', 'The selected model receives your resume facts. Review every suggestion; nothing is added automatically.', 'resume-ai-help');
    const summarySuggestion = element('section', undefined, 'resume-ai-suggestion');
    summarySuggestion.hidden = true;
    summarySuggestion.setAttribute('aria-labelledby', 'resume-ai-suggestion-title');
    const suggestionTitle = element('h4', 'AI draft · review before use');
    suggestionTitle.id = 'resume-ai-suggestion-title';
    const suggestionText = element('p', undefined, 'resume-ai-suggestion-text');
    const applySummary = element('button', 'Use this summary', 'prep-primary');
    applySummary.type = 'button';
    summarySuggestion.append(suggestionTitle, suggestionText, applySummary);
    for (const [title, key, properties] of inputFields) {
      const field = labelledInput(title, `resume-${key}`, properties);
      field.control.value = draft[key] || '';
      controls[key] = field.control;
      form.append(field.label);
      if (key === 'summary') form.append(summaryDraftButton, summaryAiHelp, summarySuggestion);
    }

    const experienceHeading = element('div', undefined, 'prep-subheading');
    experienceHeading.append(element('h3', 'Experience'));
    const addExperience = element('button', 'Add another role', 'prep-secondary');
    addExperience.type = 'button';
    experienceHeading.append(addExperience);
    form.append(experienceHeading);
    const experiences = element('div', undefined, 'resume-experiences');
    form.append(experiences);
    function addExperienceFields(value = {}) {
      if (experiences.children.length >= 8) { saveStatus.textContent = 'The builder supports up to eight roles per draft.'; return; }
      const group = element('fieldset', undefined, 'resume-experience');
      group.append(element('legend', `Role ${experiences.children.length + 1}`));
      const fields = [
        ['Job title', 'role', { maxLength: 100 }],
        ['Company', 'company', { maxLength: 100 }],
        ['Dates', 'dates', { placeholder: 'e.g. 2022–2025', maxLength: 80 }],
        ['Achievements and responsibilities', 'details', { multiline: true, rows: 4, maxLength: 2500, placeholder: 'One achievement per line. Include only claims you can support.' }]
      ];
      for (const [title, key, props] of fields) {
        const field = labelledInput(title, `experience-${experiences.children.length}-${key}`, props);
        field.control.value = value[key] || '';
        field.control.dataset.experienceKey = key;
        group.append(field.label);
      }
      const remove = element('button', 'Remove role', 'prep-danger-text');
      remove.type = 'button';
      remove.addEventListener('click', () => { group.remove(); [...experiences.children].forEach((item, index) => { item.querySelector('legend').textContent = `Role ${index + 1}`; }); updatePreview(); });
      group.append(remove);
      experiences.append(group);
    }
    (draft.experiences?.length ? draft.experiences.slice(0, 8) : [{}]).forEach(addExperienceFields);
    addExperience.addEventListener('click', () => addExperienceFields());
    const education = labelledInput('Education and training', 'resume-education', { multiline: true, rows: 3, maxLength: 1200, placeholder: 'Degree, institution, and year' });
    education.control.value = draft.education || '';
    controls.education = education.control;
    form.append(education.label);
    const skills = labelledInput('Skills', 'resume-skills', { multiline: true, rows: 3, maxLength: 1200, placeholder: 'List skills separated by commas. Include only skills you can discuss.' });
    skills.control.value = draft.skills || '';
    controls.skills = skills.control;
    form.append(skills.label);
    const templateLabel = element('label');
    templateLabel.htmlFor = 'resume-template';
    templateLabel.append(element('span', 'PDF layout'));
    const templateSelect = element('select');
    templateSelect.id = 'resume-template';
    templateSelect.append(new Option('Modern green', 'modern'), new Option('Classic serif', 'classic'), new Option('Compact', 'compact'));
    templateSelect.value = draft.template || 'modern';
    templateLabel.append(templateSelect);
    controls.template = templateSelect;
    form.append(templateLabel);
    const saveStatus = statusLine(form, 'resumeMakerStatus', 'Draft auto-saves on this device.');
    const actions = element('div', undefined, 'prep-actions');
    const download = element('button', 'Download TXT', 'prep-secondary');
    download.type = 'button';
    const downloadPdf = element('button', 'Export PDF', 'prep-primary');
    downloadPdf.type = 'button';
    actions.append(download, downloadPdf);
    form.append(actions);
    layout.append(form, preview);
    root.append(layout);

    function collectDraft() {
      return {
        ...Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value.trim()])),
        experiences: [...experiences.querySelectorAll('.resume-experience')].map((group) => Object.fromEntries([...group.querySelectorAll('[data-experience-key]')].map((control) => [control.dataset.experienceKey, control.value.trim()])))
      };
    }
    function updatePreview() {
      const current = collectDraft();
      preview.replaceChildren(element('p', 'LIVE PREVIEW', 'settings-kicker'));
      preview.append(element('pre', window.FullyPreparedPreparationCore.buildResumeText(current) || 'Your resume preview will appear here as you add details.', 'resume-preview-text'));
      try { localStorage.setItem('fullyPreparedResumeDraft', JSON.stringify(current)); saveStatus.textContent = 'Draft saved on this device.'; }
      catch { saveStatus.textContent = 'This draft cannot be saved in the current app storage profile. You can still download the text.'; }
    }
    summaryDraftButton.addEventListener('click', async () => {
      const config = window.currentModelConfig?.();
      if (!config?.model) { saveStatus.textContent = 'Connect and select a model in Configure model before drafting with AI.'; return; }
      let messages;
      try { messages = window.FullyPreparedResumeContent.buildSummaryMessages(collectDraft()); }
      catch (error) { saveStatus.textContent = error.message; return; }
      summaryDraftButton.disabled = true;
      summaryDraftButton.textContent = 'Drafting…';
      saveStatus.textContent = 'Asking your selected model for a source-grounded draft…';
      try {
        const result = await window.fullyPrepared.models.chat({ provider: config.provider, endpoint: config.endpoint, model: config.model, messages });
        suggestionText.textContent = window.FullyPreparedResumeContent.normalizeSummarySuggestion(result.message?.content);
        summarySuggestion.hidden = false;
        saveStatus.textContent = 'AI draft ready. Review it for accuracy before using it.';
        applySummary.focus();
      } catch (error) {
        saveStatus.textContent = `Could not draft a summary: ${window.FullyPreparedDiagnostics?.redact(error.message) || 'Check your model connection.'}`;
      } finally { summaryDraftButton.disabled = false; summaryDraftButton.textContent = 'Draft summary with AI'; }
    });
    applySummary.addEventListener('click', () => {
      controls.summary.value = suggestionText.textContent;
      controls.summary.dispatchEvent(new Event('input', { bubbles: true }));
      saveStatus.textContent = 'Summary applied to your draft. Verify every detail before sharing.';
      controls.summary.focus();
    });
    form.addEventListener('input', updatePreview);
    form.addEventListener('change', updatePreview);
    form.addEventListener('submit', (event) => event.preventDefault());
    updatePreview();

    download.addEventListener('click', () => {
      const current = collectDraft();
      const error = window.FullyPreparedPreparationCore.validateResumeDraft(current);
      if (error) { saveStatus.textContent = error; form.querySelector(':invalid')?.focus(); return; }
      const text = window.FullyPreparedPreparationCore.buildResumeText(current);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${current.name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'resume'}.txt`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      saveStatus.textContent = 'Resume text downloaded.';
    });
    downloadPdf.addEventListener('click', async () => {
      const current = collectDraft();
      const error = window.FullyPreparedPreparationCore.validateResumeDraft(current);
      if (error) { saveStatus.textContent = error; form.querySelector(':invalid')?.focus(); return; }
      downloadPdf.disabled = true;
      downloadPdf.textContent = 'Preparing PDF…';
      saveStatus.textContent = 'Preparing a print-ready A4 PDF on this device…';
      try {
        const result = await window.fullyPrepared.resume.exportPdf(current);
        if (result?.saved) saveStatus.textContent = 'PDF saved successfully.';
        else if (result?.canceled) saveStatus.textContent = 'PDF export canceled. Your draft is still saved on this device.';
        else saveStatus.textContent = 'The PDF could not be saved.';
      } catch (error) { saveStatus.textContent = `Could not export PDF: ${error.message}`; }
      finally { downloadPdf.disabled = false; downloadPdf.textContent = 'Export PDF'; }
    });
    saveLibraryButton.addEventListener('click', async () => {
      const current = collectDraft();
      const error = window.FullyPreparedPreparationCore.validateResumeDraft(current);
      if (error) { saveStatus.textContent = error; return; }
      saveLibraryButton.disabled = true;
      saveLibraryButton.textContent = 'Saving…';
      try {
        await window.FullyPreparedLibraryStore.saveGeneratedResume({ name: `${current.name} - Resume.txt`, text: window.FullyPreparedPreparationCore.buildResumeText(current) });
        saveStatus.textContent = 'Saved to Resumes. You can review it against a job there.';
      } catch (error) { saveStatus.textContent = `Could not save: ${error.message}`; }
      finally { saveLibraryButton.disabled = false; saveLibraryButton.textContent = 'Save to Resumes'; }
    });
  }

  async function renderHeadshots() {
    setPageHeader('headshots');
    const header = makeHeading('PROFILE TOOLKIT', 'Headshots', 'Create profile ready crops and optionally refine your photo with an image model running on your computer.');
    root.append(header);
    const editor = element('section', undefined, 'headshot-editor');
    const help = element('div', undefined, 'headshot-help');
    help.append(element('span', 'LOCAL PHOTO TOOL', 'settings-kicker'), element('h3', 'Make a profile-ready crop'), element('p', 'Choose JPEG, PNG, or WebP up to 10 MB. Adjust the crop position, then save or download a 512 × 512 JPEG copy. Your original photo is not changed.'));
    const choose = element('button', 'Choose photo', 'prep-primary');
    choose.type = 'button';
    help.append(choose);
    const stage = element('div', undefined, 'headshot-stage');
    const preview = element('img');
    preview.alt = 'Preview of your locally selected photo';
    preview.className = 'headshot-preview hidden';
    stage.append(preview, element('p', 'Your photo preview appears here after you choose one.', 'headshot-empty'));
    const controls = element('div', undefined, 'headshot-controls');
    const status = statusLine(controls, 'headshotStatus');
    const aiLabel = element('label', 'Optional local AI portrait'); aiLabel.className = 'prep-field';
    const endpoint = document.createElement('input'); endpoint.type = 'url'; endpoint.value = localStorage.getItem('fullyPreparedImageEndpoint') || 'http://127.0.0.1:7860'; endpoint.setAttribute('aria-label', 'Local Stable Diffusion WebUI address');
    const endpointHint = element('small', 'Uses Stable Diffusion WebUI API on this device only.');
    aiLabel.append(endpoint, endpointHint);
    const styleField = labelledInput('Photo style', 'headshotStyle', { type: 'text' });
    styleField.control.value = 'natural studio lighting, neutral background, business casual clothing';
    styleField.control.maxLength = 500;
    const generate = element('button', 'Generate with local model', 'prep-secondary');
    generate.type = 'button'; generate.disabled = true;
    controls.append(aiLabel, styleField.label, generate);
    const cropX = labelledInput('Horizontal position', 'headshotCropX', { type: 'range' });
    cropX.control.min = 0; cropX.control.max = 100; cropX.control.value = 50; cropX.control.disabled = true;
    const cropY = labelledInput('Vertical position', 'headshotCropY', { type: 'range' });
    cropY.control.min = 0; cropY.control.max = 100; cropY.control.value = 50; cropY.control.disabled = true;
    const save = element('button', 'Save cropped copy', 'prep-primary');
    save.type = 'button'; save.disabled = true;
    controls.append(cropX.label, cropY.label, save);
    editor.append(help, stage, controls);
    root.append(editor);
    const savedHeading = element('div', undefined, 'prep-subheading');
    savedHeading.append(element('h3', 'Saved headshots'));
    const gallery = element('div', undefined, 'headshot-gallery');
    root.append(savedHeading, gallery);

    async function renderSaved() {
      const items = await allFrom('headshots');
      gallery.replaceChildren();
      if (!items.length) {
        const empty = element('div', undefined, 'prep-empty');
        empty.append(element('h3', 'No saved crops yet'), element('p', 'Your finished profile crops will appear here. You can keep several versions and remove them when they are no longer useful.'));
        gallery.append(empty);
        return;
      }
      for (const item of items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
        const card = element('article', undefined, 'headshot-card');
        const image = element('img'); image.src = item.dataUrl; image.alt = `Saved crop: ${item.name}`;
        const title = element('h4', item.name);
        const date = element('p', new Date(item.createdAt).toLocaleDateString());
        const download = element('a', 'Download'); download.href = item.dataUrl; download.download = `${item.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'headshot'}.jpg`;
        const remove = element('button', 'Remove', 'prep-danger-text');
        remove.addEventListener('click', async () => {
          if (!confirm(`Remove “${item.name}” from this device?`)) return;
          await removeFrom('headshots', item.id);
          await renderSaved();
        });
        const actions = element('div', undefined, 'prep-actions'); actions.append(download, remove);
        card.append(image, title, date, actions);
        gallery.append(card);
      }
    }

    choose.addEventListener('click', async () => {
      choose.disabled = true; choose.textContent = 'Choose a photo…'; status.textContent = 'The file picker will only read a photo you select.';
      try {
        const photo = await window.fullyPrepared.headshots.importPhoto();
        if (!photo) { status.textContent = ''; return; }
        currentPhoto = photo;
        preview.src = photo.dataUrl;
        preview.classList.remove('hidden');
        stage.querySelector('.headshot-empty').classList.add('hidden');
        cropX.control.disabled = false; cropY.control.disabled = false; save.disabled = false;
        generate.disabled = false;
        status.textContent = `${photo.name} selected. Adjust the crop preview; the original remains unchanged.`;
      } catch (error) { status.textContent = error.message; }
      finally { choose.disabled = false; choose.textContent = 'Choose photo'; }
    });

    generate.addEventListener('click', async () => {
      if (!currentPhoto) { status.textContent = 'Choose a photo first. The local model will use it as its source image.'; return; }
      generate.disabled = true; generate.textContent = 'Generating locally…'; save.disabled = true;
      status.textContent = 'Sending your photo only to the local image service. This can take a few minutes on CPU.';
      try {
        localStorage.setItem('fullyPreparedImageEndpoint', endpoint.value.trim());
        const result = await window.fullyPrepared.headshots.generateLocal({ endpoint: endpoint.value, image: currentPhoto.dataUrl, style: styleField.control.value });
        currentPhoto = { name: `AI portrait - ${currentPhoto.name}`, dataUrl: result.dataUrl };
        preview.src = currentPhoto.dataUrl;
        cropX.control.value = '50'; cropY.control.value = '50'; updateCrop();
        save.disabled = false;
        status.textContent = 'Local portrait ready. Review that it still represents you accurately before saving or sharing.';
      } catch (error) { status.textContent = `Could not generate a portrait: ${error.message}`; }
      finally { generate.disabled = false; save.disabled = !currentPhoto; generate.textContent = 'Generate with local model'; }
    });

    function updateCrop() { preview.style.objectPosition = `${cropX.control.value}% ${cropY.control.value}%`; }
    cropX.control.addEventListener('input', updateCrop);
    cropY.control.addEventListener('input', updateCrop);
    save.addEventListener('click', async () => {
      if (!currentPhoto) return;
      save.disabled = true; save.textContent = 'Preparing…'; status.textContent = 'Creating a local 512 × 512 crop…';
      try {
        const image = new Image();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('This image could not be decoded. Try another supported photo.')); image.src = currentPhoto.dataUrl; });
        if (image.naturalWidth > 12000 || image.naturalHeight > 12000 || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('This image is unusually large. Choose one below 40 megapixels and no wider or taller than 12,000 pixels.');
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const left = (image.naturalWidth - side) * Number(cropX.control.value) / 100;
        const top = (image.naturalHeight - side) * Number(cropY.control.value) / 100;
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas image processing is unavailable in this app.');
        context.drawImage(image, left, top, side, side, 0, 0, 512, 512);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const saved = { id: `headshot-${Date.now()}`, name: currentPhoto.name.replace(/\.[^.]+$/, ''), dataUrl, createdAt: new Date().toISOString() };
        await putInto('headshots', saved);
        status.textContent = 'Cropped copy saved on this device.';
        await renderSaved();
      } catch (error) { status.textContent = error.message; }
      finally { save.disabled = false; save.textContent = 'Save cropped copy'; }
    });
    try { await renderSaved(); } catch (error) { status.textContent = error.message; }
  }

  async function renderPreparationView(page) {
    if (!Object.hasOwn(navTitles, page)) return;
    const token = ++renderToken;
    try {
      if (page === 'questions') await renderQuestions(token);
      else if (page === 'resume-maker') renderResumeMaker();
      else await renderHeadshots();
    } catch (error) {
      if (token !== renderToken) return;
      setPageHeader(page);
      const issue = element('section', undefined, 'prep-empty');
      issue.append(element('h2', 'This workspace could not open'), element('p', error.message));
      root.append(issue);
    }
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.nav-link');
    if (!link || !Object.hasOwn(navTitles, link.dataset.view)) return;
    document.querySelector('#createSession').classList.remove('hidden');
    window.renderPreparationView(link.dataset.view);
  });
  window.renderPreparationView = renderPreparationView;
})();
