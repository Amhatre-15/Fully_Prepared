(function () {
  const panel = document.querySelector('.speech-settings');
  const output = window.FullyPreparedSpeechOutput;
  if (!panel || !output) return;

  const label = document.createElement('label');
  label.htmlFor = 'interviewerVoice';
  label.textContent = 'Interviewer voice';
  const selector = document.createElement('select');
  selector.id = 'interviewerVoice';
  selector.setAttribute('aria-describedby', 'voiceOutputHelp voiceOutputStatus');
  const providerLabel = document.createElement('label');
  providerLabel.htmlFor = 'speechOutputProvider'; providerLabel.textContent = 'Question voice provider';
  const providerSelect = document.createElement('select'); providerSelect.id = 'speechOutputProvider';
  providerSelect.append(new Option('Windows installed voice', 'system'), new Option('Piper (local service)', 'piper'), new Option('Kokoro (local service)', 'kokoro'));
  const localVoiceSettings = document.createElement('div'); localVoiceSettings.className = 'local-voice-settings';
  const endpointLabel = document.createElement('label'); endpointLabel.htmlFor = 'localSpeechEndpoint'; endpointLabel.textContent = 'Local speech endpoint';
  const endpointInput = document.createElement('input'); endpointInput.id = 'localSpeechEndpoint'; endpointInput.type = 'url';
  const voiceNameLabel = document.createElement('label'); voiceNameLabel.htmlFor = 'localSpeechVoice'; voiceNameLabel.textContent = 'Local voice name';
  const voiceNameInput = document.createElement('input'); voiceNameInput.id = 'localSpeechVoice'; voiceNameInput.maxLength = 120;
  const localVoiceHelp = document.createElement('small'); localVoiceHelp.className = 'voice-output-help';
  localVoiceHelp.textContent = 'Connect a locally running Piper OpenAI-compatible TTS server or Kokoro-FastAPI. Fully Prepared does not install or download voice models; some external servers may download a missing voice on first use.';
  localVoiceSettings.append(endpointLabel, endpointInput, voiceNameLabel, voiceNameInput, localVoiceHelp);
  let savedTts = {};
  try { savedTts = JSON.parse(localStorage.getItem('fullyPreparedTtsSettings') || '{}') || {}; } catch { localStorage.removeItem('fullyPreparedTtsSettings'); }
  providerSelect.value = ['system', 'piper', 'kokoro'].includes(savedTts.provider) ? savedTts.provider : 'system';
  endpointInput.value = savedTts.endpoint || (providerSelect.value === 'piper' ? 'http://127.0.0.1:5000/v1/audio/speech' : 'http://127.0.0.1:8880/v1/audio/speech');
  voiceNameInput.value = savedTts.voice || (providerSelect.value === 'piper' ? 'en_US-lessac-medium' : 'af_sky');
  const help = document.createElement('small');
  help.id = 'voiceOutputHelp';
  help.className = 'voice-output-help';
  help.textContent = 'Uses voices installed for Windows. Voice availability depends on your system; speech is generated on this device.';
  const actions = document.createElement('div');
  actions.className = 'voice-output-actions';
  const preview = document.createElement('button');
  preview.type = 'button';
  preview.className = 'prep-secondary';
  preview.textContent = 'Preview voice';
  preview.setAttribute('aria-label', 'Preview selected interviewer voice');
  const stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'prep-secondary';
  stop.textContent = 'Stop speech';
  stop.setAttribute('aria-label', 'Stop queued interviewer speech');
  actions.append(preview, stop);
  const status = document.createElement('p');
  status.id = 'voiceOutputStatus';
  status.className = 'voice-output-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const modelLabel = document.createElement('label');
  modelLabel.htmlFor = 'localWhisperModel';
  modelLabel.textContent = 'Speech recognition model';
  const modelSelect = document.createElement('select');
  modelSelect.id = 'localWhisperModel';
  modelSelect.setAttribute('aria-describedby', 'localWhisperModelHelp');
  const modelHelp = document.createElement('small');
  modelHelp.id = 'localWhisperModelHelp';
  modelHelp.className = 'voice-output-help';
  modelHelp.textContent = 'The bundled base model works offline. Larger compatible .bin models you supply may improve accuracy but use more memory and time; results depend on your hardware and the model. This app does not download model files.';
  const modelButton = document.createElement('button');
  modelButton.type = 'button';
  modelButton.className = 'prep-secondary';
  modelButton.textContent = 'Choose local model file…';
  modelButton.setAttribute('aria-label', 'Choose a local Whisper model file');
  const modelStatus = document.createElement('p');
  modelStatus.className = 'voice-output-status';
  modelStatus.setAttribute('role', 'status');
  modelStatus.setAttribute('aria-live', 'polite');
  const resetModel = document.createElement('button');
  resetModel.type = 'button';
  resetModel.className = 'prep-secondary';
  resetModel.textContent = 'Use bundled base model';
  resetModel.setAttribute('aria-label', 'Use the bundled Whisper base speech recognition model');
  const modelActions = document.createElement('div');
  modelActions.className = 'voice-output-actions';
  modelActions.append(modelButton, resetModel);
  panel.append(providerLabel, providerSelect, localVoiceSettings, label, selector, help, actions, status, modelLabel, modelSelect, modelHelp, modelActions, modelStatus);

  function currentTtsSettings() {
    return { provider: providerSelect.value, endpoint: endpointInput.value.trim(), voice: voiceNameInput.value.trim(), voiceURI: selector.value };
  }
  function saveTtsSettings() {
    const settings = currentTtsSettings();
    localStorage.setItem('fullyPreparedTtsSettings', JSON.stringify(settings));
    const local = settings.provider !== 'system';
    localVoiceSettings.hidden = !local; label.hidden = local; selector.hidden = local;
    help.textContent = local
      ? `Questions use ${settings.provider === 'piper' ? 'Piper' : 'Kokoro'} through a loopback endpoint. Audio is generated on your device.`
      : 'Uses voices installed for Windows. Voice availability depends on your system; speech is generated on this device.';
    preview.disabled = !local && output.voices().length === 0;
  }
  providerSelect.addEventListener('change', () => {
    if (providerSelect.value === 'piper' && !endpointInput.value.includes(':5000/')) endpointInput.value = 'http://127.0.0.1:5000/v1/audio/speech';
    if (providerSelect.value === 'kokoro' && !endpointInput.value.includes(':8880/')) endpointInput.value = 'http://127.0.0.1:8880/v1/audio/speech';
    if (providerSelect.value === 'piper' && !voiceNameInput.value.startsWith('en_US-')) voiceNameInput.value = 'en_US-lessac-medium';
    if (providerSelect.value === 'kokoro' && !voiceNameInput.value.startsWith('af_')) voiceNameInput.value = 'af_sky';
    saveTtsSettings();
  });
  endpointInput.addEventListener('change', saveTtsSettings);
  voiceNameInput.addEventListener('change', saveTtsSettings);

  async function loadSpeechModel() {
    const model = await window.fullyPrepared.speech.getModel();
    modelSelect.replaceChildren(new Option(model.custom ? 'User-selected local model' : 'Bundled Whisper base model', model.name));
    modelStatus.textContent = `${model.name} · ${model.available ? 'available on this device' : 'file not found; choose another model'}`;
  }
  modelButton.addEventListener('click', async () => {
    modelButton.disabled = true;
    modelStatus.textContent = 'Choose a compatible Whisper.cpp model file from this device.';
    try {
      const result = await window.fullyPrepared.speech.selectModel();
      if (result) {
        await loadSpeechModel();
        modelStatus.textContent += ' The next recording will launch the service with this model.';
      }
    } catch (error) { modelStatus.textContent = `Could not select speech model: ${window.FullyPreparedDiagnostics?.redact(error.message) || error.message}`; }
    finally { modelButton.disabled = false; }
  });
  resetModel.addEventListener('click', async () => {
    resetModel.disabled = true;
    try { await window.fullyPrepared.speech.selectModel({ clear: true }); await loadSpeechModel(); }
    catch (error) { modelStatus.textContent = `Could not restore bundled model: ${error.message}`; }
    finally { resetModel.disabled = false; }
  });
  void loadSpeechModel().catch((error) => { modelStatus.textContent = `Speech model status unavailable: ${error.message}`; });

  function populateVoices() {
    const voices = output.voices();
    const selected = localStorage.getItem('fullyPreparedVoiceURI') || '';
    selector.replaceChildren(new Option(voices.length ? 'System default' : 'No system voices available', ''));
    voices.forEach((voice) => selector.appendChild(new Option(`${voice.name} · ${voice.lang}`, voice.voiceURI)));
    selector.value = voices.some((voice) => voice.voiceURI === selected) ? selected : '';
    preview.disabled = voices.length === 0;
    status.textContent = providerSelect.value !== 'system' ? 'Local provider selected. Use Preview voice to verify its connection.' : voices.length ? `${voices.length} system voice${voices.length === 1 ? '' : 's'} available. Speech queue is ready.` : 'No system voices are currently available. Install a Windows speech voice to enable spoken questions.';
  }
  selector.addEventListener('change', () => {
    localStorage.setItem('fullyPreparedVoiceURI', selector.value);
    status.textContent = selector.value ? `Selected ${selector.selectedOptions[0]?.textContent}.` : 'Using the system default voice.';
  });
  preview.addEventListener('click', () => {
    saveTtsSettings();
    const settings = currentTtsSettings();
    const accepted = output.enqueue('Hello. This is a preview of your selected interviewer voice.', { ...settings, onError: (error) => { status.textContent = `Voice preview failed: ${window.FullyPreparedDiagnostics?.redact(error.message) || 'Check the local voice service.'}`; } });
    status.textContent = accepted ? 'Voice preview added to the speech queue.' : 'Speech output is unavailable in this build.';
  });
  stop.addEventListener('click', () => { output.stop(); status.textContent = 'Queued speech stopped.'; });
  window.speechSynthesis?.addEventListener?.('voiceschanged', populateVoices);
  document.querySelector('#stopLive')?.addEventListener('click', () => output.stop());
  document.querySelector('#disconnectLive')?.addEventListener('click', () => output.stop());
  document.querySelector('#pauseLive')?.addEventListener('click', () => {
    if (document.querySelector('#pauseLive')?.getAttribute('aria-pressed') === 'true') output.stop();
  });
  populateVoices();
  saveTtsSettings();
})();
