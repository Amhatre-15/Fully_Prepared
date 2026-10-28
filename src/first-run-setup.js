(function () {
  const dialog = document.createElement('dialog');
  dialog.className = 'first-run-setup';
  dialog.setAttribute('aria-labelledby', 'setupTitle');
  const title = document.createElement('h2'); title.id = 'setupTitle'; title.textContent = 'Connect your own AI model';
  const intro = document.createElement('p'); intro.className = 'setup-intro'; intro.textContent = 'Fully Prepared is free. Choose a local model or a compatible endpoint; the app does not include a paid AI service.';
  const progress = document.createElement('p'); progress.className = 'setup-progress'; progress.setAttribute('role', 'status'); progress.setAttribute('aria-live', 'polite');
  const stepOne = document.createElement('section');
  const choiceLabel = document.createElement('p'); choiceLabel.textContent = 'Step 1 · Choose your provider';
  const localChoice = document.createElement('button'); localChoice.type = 'button'; localChoice.textContent = 'Use Ollama on this computer';
  const customChoice = document.createElement('button'); customChoice.type = 'button'; customChoice.textContent = 'Use a compatible endpoint';
  stepOne.append(choiceLabel, localChoice, customChoice);
  const stepTwo = document.createElement('section'); stepTwo.hidden = true;
  const guidance = document.createElement('p');
  const finishHelp = document.createElement('p'); finishHelp.className = 'setup-help'; finishHelp.textContent = 'You can save the connection, test it, and choose an installed model in settings. The setup guide can be reopened later.';
  const openSettings = document.createElement('button'); openSettings.type = 'button'; openSettings.className = 'setup-primary'; openSettings.textContent = 'Open model settings';
  const later = document.createElement('button'); later.type = 'button'; later.textContent = 'Not now';
  stepTwo.append(guidance, finishHelp, openSettings, later);
  dialog.append(title, intro, progress, stepOne, stepTwo);
  document.body.append(dialog);

  const open = () => { stepOne.hidden = false; stepTwo.hidden = true; progress.textContent = 'Step 1 of 2'; if (!dialog.open) dialog.showModal(); };
  function choose(provider) {
    const providerSelect = document.querySelector('#providerSelect');
    const endpoint = document.querySelector('#endpointUrl');
    providerSelect.value = provider;
    providerSelect.dispatchEvent(new Event('change', { bubbles: true }));
    if (provider === 'ollama' && !endpoint.value) endpoint.value = 'http://127.0.0.1:11434';
    guidance.textContent = provider === 'ollama'
      ? 'Step 2 · Make sure Ollama is running and install a model (for example, `ollama pull qwen3.5:4b`). Then save and test the local connection.'
      : 'Step 2 · Enter your endpoint URL and model name. Hosted services may receive the text you send them; local-only mode blocks non-local providers.';
    stepOne.hidden = true; stepTwo.hidden = false; progress.textContent = 'Step 2 of 2';
    openSettings.focus();
  }
  localChoice.addEventListener('click', () => choose('ollama'));
  customChoice.addEventListener('click', () => choose('custom'));
  function close(deferred) {
    if (deferred) localStorage.setItem('fullyPreparedSetupDeferred', 'true');
    dialog.close();
    document.querySelector('#modelButton')?.focus();
  }
  later.addEventListener('click', () => close(true));
  openSettings.addEventListener('click', () => {
    close(true);
    document.querySelector('#modelButton')?.click();
    document.querySelector('#providerSelect')?.focus();
  });
  const markConnected = () => {
    const connected = [...document.querySelectorAll('#saveStatus,#sessionModelStatus')].some((status) => status.textContent.startsWith('Connected'));
    if (!connected) return;
    localStorage.setItem('fullyPreparedModelSetupComplete', 'true');
    if (dialog.open) dialog.close();
  };
  for (const status of document.querySelectorAll('#saveStatus,#sessionModelStatus')) {
    new MutationObserver(markConnected).observe(status, { childList: true, characterData: true, subtree: true });
  }
  const reopen = document.createElement('button'); reopen.type = 'button'; reopen.className = 'setup-reopen'; reopen.textContent = 'Open first-run setup guide';
  document.querySelector('.settings-card')?.append(reopen);
  reopen.addEventListener('click', open);
  if (localStorage.getItem('fullyPreparedModelSetupComplete') !== 'true' && localStorage.getItem('fullyPreparedSetupDeferred') !== 'true') open();
})();
