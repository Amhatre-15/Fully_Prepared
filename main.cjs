const { app, BrowserWindow, dialog, ipcMain, safeStorage, session } = require('electron');
const { spawn } = require('node:child_process');
const os = require('node:os');
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const { extractImportedText } = require('./src/import-text.cjs');
const { extractScannedPdfText } = require('./src/ocr-pdf.cjs');
const { createResumeHtml, normalizeResumeDraft } = require('./src/resume-pdf.cjs');
const { protectModelMessages, budgetModelMessages } = require('./src/model-context.js');
const { consumeProviderStream } = require('./src/provider-stream.js');
const { fetchJobPosting } = require('./src/job-link.cjs');
const { generateLocalHeadshot } = require('./src/local-headshot.cjs');
const { normalizeCrashRecord, formatCrashReport } = require('./src/crash-report.cjs');

const requestTimeoutMs = 120_000;
let providerApiKey = '';
let apiKeyPath = '';
let whisperServerProcess = null;
let whisperServerStartPromise = null;
const activeChatRequests = new Map();
let nextChatRequestNumber = 0;
let crashReportsEnabled = false;

function crashReportDirectory() {
  return path.join(app.getPath('userData'), 'crash-reports');
}

async function readLocalCrashReports() {
  try {
    const files = (await fs.promises.readdir(crashReportDirectory())).filter((name) => /^crash-\d+\.json$/.test(name)).sort().slice(-50);
    const reports = [];
    for (const file of files) {
      try { reports.push(normalizeCrashRecord(JSON.parse(await fs.promises.readFile(path.join(crashReportDirectory(), file), 'utf8')))); } catch {}
    }
    return reports;
  } catch { return []; }
}

function recordLocalCrash(source, details = {}) {
  if (!crashReportsEnabled) return;
  const report = normalizeCrashRecord({ source, reason: details.reason, exitCode: details.exitCode, version: app.getVersion() });
  const filename = `crash-${Date.now()}.json`;
  void fs.promises.mkdir(crashReportDirectory(), { recursive: true })
    .then(() => fs.promises.writeFile(path.join(crashReportDirectory(), filename), JSON.stringify(report), { encoding: 'utf8', flag: 'wx' }))
    .then(async () => {
      const files = (await fs.promises.readdir(crashReportDirectory())).filter((name) => /^crash-\d+\.json$/.test(name)).sort();
      for (const old of files.slice(0, Math.max(0, files.length - 20))) await fs.promises.rm(path.join(crashReportDirectory(), old), { force: true });
    })
    .catch(() => {});
}

function bundledWhisperPaths() {
  const root = app.isPackaged
    ? path.join(process.resourcesPath, 'whisper')
    : path.join(__dirname, 'vendor', 'whisper', 'Release');
  return {
    root,
    executable: path.join(root, 'whisper-server.exe'),
    model: path.join(root, 'ggml-base.bin')
  };
}

function configuredWhisperModel() {
  const bundled = bundledWhisperPaths().model;
  try {
    const preferencePath = path.join(app.getPath('userData'), 'speech-model.json');
    const preference = JSON.parse(fs.readFileSync(preferencePath, 'utf8'));
    if (typeof preference.modelPath === 'string' && path.isAbsolute(preference.modelPath)) {
      return { modelPath: preference.modelPath, custom: true, name: path.basename(preference.modelPath) };
    }
  } catch { /* No custom model has been selected; use the bundled base model. */ }
  return { modelPath: bundled, custom: false, name: path.basename(bundled) };
}

async function stopBundledWhisperServer() {
  const current = whisperServerProcess;
  whisperServerProcess = null;
  whisperServerStartPromise = null;
  if (!current || current.exitCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2000);
    current.once('close', () => { clearTimeout(timer); resolve(); });
    try { current.kill(); } catch { clearTimeout(timer); resolve(); }
  });
}

async function ensureBundledWhisperServer(endpoint) {
  const url = new URL(endpoint);
  if (url.hostname !== '127.0.0.1' || url.port !== '8080') return;
  const paths = bundledWhisperPaths();
  const model = configuredWhisperModel();
  if (!fs.existsSync(paths.executable) || !fs.existsSync(model.modelPath)) return;

  if (!whisperServerStartPromise) {
    whisperServerStartPromise = (async () => {
      try {
        const existing = await fetch('http://127.0.0.1:8080/', { signal: AbortSignal.timeout(1500) });
        if (existing.ok) return;
      } catch { /* No compatible local service is listening; start our bundled server. */ }

      whisperServerProcess = spawn(paths.executable, [
        '--model', model.modelPath,
        '--host', '127.0.0.1',
        '--port', '8080',
        '--no-gpu'
      ], {
        cwd: paths.root,
        windowsHide: true,
        stdio: 'ignore'
      });
      whisperServerProcess.once('error', (error) => {
        console.error('Could not start the bundled local speech server:', error.message);
        whisperServerProcess = null;
      });

      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        if (!whisperServerProcess || whisperServerProcess.exitCode !== null) {
          whisperServerProcess = null;
          throw new Error('The bundled Whisper.cpp server stopped during startup');
        }
        try {
          const response = await fetch('http://127.0.0.1:8080/', { signal: AbortSignal.timeout(1200) });
          if (response.ok) return;
        } catch { /* Model is still loading or the local socket is not ready yet. */ }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      throw new Error('The local Whisper model did not finish loading within 60 seconds');
    })().catch((error) => {
      whisperServerStartPromise = null;
      throw error;
    });
  }
  await whisperServerStartPromise;
}

async function ocrScannedPdf(fileBuffer, pageCount) {
  const tesseract = require('tesseract.js');
  const language = require('@tesseract.js-data/eng');
  const worker = await tesseract.createWorker('eng', 1, {
    langPath: language.langPath,
    gzip: true,
    cachePath: path.join(app.getPath('userData'), 'ocr-cache'),
    corePath: path.dirname(require.resolve('tesseract.js-core')),
    workerPath: require.resolve('tesseract.js/src/worker-script/node/index.js'),
    logger: () => {}
  });
  const renderer = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  try {
    await renderer.loadFile(path.join(__dirname, 'src', 'ocr-renderer.html'));
    const dataUrl = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
    const quotedDataUrl = JSON.stringify(dataUrl);
    const renderedPageCount = await renderer.webContents.executeJavaScript(`window.loadPdfForOcr(${quotedDataUrl})`);
    if (renderedPageCount !== pageCount) throw new Error('The PDF page count changed while preparing OCR.');
    return await extractScannedPdfText(pageCount, {
      renderPage: (pageNumber) => renderer.webContents.executeJavaScript(`window.renderPdfOcrPage(${pageNumber})`),
      recognizePage: async (imageDataUrl) => {
        const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
        if (!match || match[1].length > 12_000_000) throw new Error('The rendered PDF page is invalid or too large for OCR.');
        const result = await worker.recognize(Buffer.from(match[1], 'base64'));
        return result.data.text;
      }
    });
  } finally {
    if (!renderer.isDestroyed()) renderer.destroy();
    await worker.terminate();
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'Fully Prepared',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, 'src', 'index.html'));
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url || '';
  if (!senderUrl.startsWith('file://') || !senderUrl.endsWith('/src/index.html')) {
    throw new Error('Request was not sent by the Fully Prepared app window');
  }
}

function isLoopbackEndpoint(url) {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
}

function validateEndpoint(endpoint, localOnly = false) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('Enter a valid model endpoint URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Endpoint must use HTTP or HTTPS and cannot contain credentials');
  }
  if (localOnly && !isLoopbackEndpoint(url)) throw new Error('Local-only mode blocks remote model endpoints. Turn it off only if you intend to send prompts to a hosted service.');
  return url.toString().replace(/\/$/, '');
}

function validateChatPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Model request is invalid');
  const localOnly = payload.localOnly === true;
  const endpoint = validateEndpoint(payload.endpoint || 'http://127.0.0.1:11434', localOnly);
  const model = String(payload.model || '').trim();
  const provider = String(payload.provider || 'ollama');
  if (!model || model.length > 200) throw new Error('Choose a valid model name first');
  if (!['ollama', 'lmstudio', 'openai', 'custom'].includes(provider)) throw new Error('Choose a supported model provider');
  if (!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 40) {
    throw new Error('Model request must contain between 1 and 40 messages');
  }
  const messages = payload.messages.map((message) => {
    if (!message || !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string') {
      throw new Error('Model messages must have a supported role and text content');
    }
    if (message.content.length > 40_000) throw new Error('A model message exceeds the 40,000 character limit');
    return { role: message.role, content: message.content };
  });
  return { endpoint, model, provider, messages: budgetModelMessages(protectModelMessages(messages)), localOnly };
}

function validateSpeechPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Speech request is invalid');
  const endpoint = validateEndpoint(payload.endpoint || 'http://127.0.0.1:8080');
  const url = new URL(endpoint);
  const host = url.hostname.toLowerCase();
  const isLoopback = host === 'localhost' || host === '[::1]' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
  if (url.protocol !== 'http:' || !isLoopback || url.username || url.password || url.search || url.hash) {
    throw new Error('Speech transcription must use a local HTTP endpoint such as http://127.0.0.1:8080');
  }
  if (url.pathname !== '/' && url.pathname !== '/inference') throw new Error('Whisper endpoint path must be / or /inference');
  const mimeType = String(payload.mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
  if (!['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4'].includes(mimeType)) throw new Error('Unsupported recording format');
  const source = payload.audio;
  if (!(source instanceof Uint8Array) && !(source instanceof ArrayBuffer)) throw new Error('Audio recording data is missing');
  const audio = Buffer.from(source instanceof ArrayBuffer ? new Uint8Array(source) : source);
  if (audio.length < 64) throw new Error('Recording is too short to transcribe');
  if (audio.length > 20 * 1024 * 1024) throw new Error('Recording is too large (maximum 20 MB)');
  const language = String(payload.language || 'auto');
  if (language !== 'auto' && !/^[a-z]{2,3}$/i.test(language)) throw new Error('Speech language code is invalid');
  return { endpoint: url.pathname === '/inference' ? endpoint : `${endpoint.replace(/\/$/, '')}/inference`, audio, mimeType, language };
}

function validateSpeechSynthesisPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Speech output request is invalid.');
  const provider = String(payload.provider || '');
  if (!['piper', 'kokoro'].includes(provider)) throw new Error('Choose Piper or Kokoro for local speech output.');
  const endpoint = validateEndpoint(payload.endpoint || (provider === 'piper' ? 'http://127.0.0.1:5000/v1/audio/speech' : 'http://127.0.0.1:8880/v1/audio/speech'));
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || !isLoopbackEndpoint(url) || url.username || url.password || url.search || url.hash || url.pathname !== '/v1/audio/speech') {
    throw new Error('Piper and Kokoro speech endpoints must use a loopback HTTP URL ending in /v1/audio/speech.');
  }
  const text = String(payload.text || '').trim();
  if (!text || text.length > 4000) throw new Error('Speech text must contain between 1 and 4,000 characters.');
  const voice = String(payload.voice || (provider === 'piper' ? 'en_US-lessac-medium' : 'af_sky')).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._+-]{0,119}$/.test(voice)) throw new Error('Enter a valid local speech voice name.');
  return { provider, endpoint, text, voice };
}

async function fetchJson(url, options, providerName, localOnly = false, requestRecord = null) {
  const controller = requestRecord?.controller || new AbortController();
  let timedOut = false;
  const timeoutTimer = setTimeout(() => { timedOut = true; controller.abort(); }, requestTimeoutMs);
  try {
    let response;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch(url, { ...options, ...(localOnly ? { redirect: 'error' } : {}), signal: controller.signal });
        break;
      } catch (error) {
        if (controller.signal.aborted) throw error;
        if (error.name !== 'TypeError' || attempt === 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    const raw = await response.text();
    let data;
    try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`${providerName} returned an invalid response`); }
    if (!response.ok) {
      const detail = data.error?.message || data.error || data.message || `HTTP ${response.status}`;
      throw new Error(`${providerName} request failed: ${String(detail).slice(0, 400)}`);
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted && requestRecord?.cancelled) throw new Error('Model request was cancelled.');
    if (error.name === 'AbortError') throw new Error(timedOut ? `${providerName} did not respond within 120 seconds` : 'Model request was cancelled.');
    if (error.name === 'TypeError') throw new Error(`Could not reach ${providerName}. Check the endpoint and whether the service is running.`);
    throw error;
  } finally {
    clearTimeout(timeoutTimer);
  }
}

function loadApiKey() {
  if (!apiKeyPath || !safeStorage.isEncryptionAvailable()) return;
  try {
    if (fs.existsSync(apiKeyPath)) providerApiKey = safeStorage.decryptString(fs.readFileSync(apiKeyPath));
  } catch {
    providerApiKey = '';
  }
}

app.whenReady().then(() => {
  apiKeyPath = path.join(app.getPath('userData'), 'provider-api-key.bin');
  loadApiKey();
  try {
    const preference = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'crash-report-settings.json'), 'utf8'));
    crashReportsEnabled = preference.enabled === true;
  } catch { crashReportsEnabled = false; }

  ipcMain.handle('app-version', (event) => {
    assertTrustedSender(event);
    return app.getVersion();
  });

  ipcMain.handle('crash-reporting-get', async (event) => {
    assertTrustedSender(event);
    return { enabled: crashReportsEnabled, count: (await readLocalCrashReports()).length };
  });
  ipcMain.handle('crash-reporting-set', async (event, enabled) => {
    assertTrustedSender(event);
    if (typeof enabled !== 'boolean') throw new Error('Choose whether local crash reports are enabled.');
    crashReportsEnabled = enabled;
    await fs.promises.mkdir(app.getPath('userData'), { recursive: true });
    await fs.promises.writeFile(path.join(app.getPath('userData'), 'crash-report-settings.json'), JSON.stringify({ enabled }), 'utf8');
    return { enabled };
  });
  ipcMain.handle('crash-reporting-export', async (event) => {
    assertTrustedSender(event);
    const reports = await readLocalCrashReports();
    if (!reports.length) return { saved: false, empty: true };
    const selection = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Export local crash report',
      defaultPath: 'fully-prepared-crash-report.txt',
      filters: [{ name: 'Text report', extensions: ['txt'] }]
    });
    if (selection.canceled || !selection.filePath) return { saved: false, canceled: true };
    await fs.promises.writeFile(selection.filePath, formatCrashReport(reports), 'utf8');
    return { saved: true };
  });
  ipcMain.handle('crash-reporting-clear', async (event) => {
    assertTrustedSender(event);
    await fs.promises.rm(crashReportDirectory(), { recursive: true, force: true });
    return { cleared: true };
  });
  ipcMain.handle('local-data-clear-private', async (event) => {
    assertTrustedSender(event);
    crashReportsEnabled = false;
    await Promise.all([
      fs.promises.rm(crashReportDirectory(), { recursive: true, force: true }),
      fs.promises.rm(path.join(app.getPath('userData'), 'ocr-cache'), { recursive: true, force: true }),
      fs.promises.writeFile(path.join(app.getPath('userData'), 'crash-report-settings.json'), JSON.stringify({ enabled: false }), 'utf8')
    ]);
    return { cleared: true };
  });

  ipcMain.handle('job-link-import', async (event, value) => {
    assertTrustedSender(event);
    return fetchJobPosting(value);
  });

  ipcMain.handle('app-capabilities', async (event) => {
    assertTrustedSender(event);
    const processors = os.cpus();
    let gpuNames = [];
    try {
      const info = await app.getGPUInfo('basic');
      const devices = Array.isArray(info?.gpuDevice) ? info.gpuDevice : Array.isArray(info?.devices) ? info.devices : [];
      gpuNames = devices.map((device) => String(device.deviceString || device.description || device.vendorString || '').trim()).filter(Boolean).slice(0, 4);
    } catch { /* GPU details may be unavailable on headless or software-rendered devices. */ }
    const featureStatus = app.getGPUFeatureStatus?.() || {};
    return {
      cpu: processors[0]?.model || 'Unknown processor',
      logicalCores: processors.length,
      memoryGiB: Math.round(os.totalmem() / (1024 ** 3)),
      architecture: os.arch(),
      gpuNames,
      gpuAcceleration: featureStatus.gpu_compositing || 'unknown'
    };
  });

  ipcMain.handle('speech-diagnostics', async (event, payload = {}) => {
    assertTrustedSender(event);
    const endpoint = validateEndpoint(payload.endpoint || 'http://127.0.0.1:8080');
    const url = new URL(endpoint);
    if (url.protocol !== 'http:' || !isLoopbackEndpoint(url) || url.username || url.password || url.search || url.hash || !['/', '/inference'].includes(url.pathname)) {
      throw new Error('Voice diagnostics only support a local Whisper.cpp endpoint on this device.');
    }
    const paths = bundledWhisperPaths();
    const selectedModel = configuredWhisperModel();
    const binaryAvailable = fs.existsSync(paths.executable);
    const modelAvailable = fs.existsSync(selectedModel.modelPath);
    let serverReachable = false;
    let serverMessage = 'Whisper.cpp is not responding at the configured local endpoint.';
    let startupMessage = '';
    if (payload.startBundled === true) {
      try { await ensureBundledWhisperServer(endpoint); }
      catch (error) { startupMessage = String(error.message || error).slice(0, 300); }
    }
    try {
      const response = await fetch(`${url.origin}/`, { signal: AbortSignal.timeout(1800), redirect: 'error' });
      serverReachable = response.ok;
      serverMessage = response.ok ? 'Local Whisper.cpp server responded.' : `Local server returned HTTP ${response.status}.`;
    } catch (error) {
      if (startupMessage) serverMessage = startupMessage;
      else if (error.name === 'AbortError') serverMessage = 'Local Whisper.cpp health check timed out.';
    }
    return { binaryAvailable, modelAvailable, modelName: selectedModel.name, customModel: selectedModel.custom, serverReachable, serverMessage };
  });

  ipcMain.handle('speech-synthesize-local', async (event, payload = {}) => {
    assertTrustedSender(event);
    const { provider, endpoint, text, voice } = validateSpeechSynthesisPayload(payload);
    const body = provider === 'piper'
      ? { model: 'piper', voice, input: text, response_format: 'wav' }
      : { model: 'kokoro', voice, input: text, response_format: 'wav', stream: false, return_timestamps: false };
    let response;
    try {
      response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/wav,application/octet-stream' }, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') throw new Error('Local voice synthesis timed out after 30 seconds.');
      throw new Error('Could not reach the local Piper/Kokoro voice service. Confirm it is running and the endpoint is correct.');
    }
    if (!response.ok) throw new Error(`Local voice service returned HTTP ${response.status}.`);
    const mimeType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!['audio/wav', 'audio/x-wav', 'application/octet-stream'].includes(mimeType)) throw new Error('Local voice service returned an unsupported audio format; configure WAV output.');
    const audio = new Uint8Array(await response.arrayBuffer());
    if (!audio.length || audio.length > 20 * 1024 * 1024) throw new Error('Local voice service returned empty or oversized audio.');
    return { audio, mimeType: mimeType === 'application/octet-stream' ? 'audio/wav' : mimeType };
  });

  ipcMain.handle('speech-get-model', (event) => {
    assertTrustedSender(event);
    const selected = configuredWhisperModel();
    return { name: selected.name, custom: selected.custom, available: fs.existsSync(selected.modelPath) };
  });

  ipcMain.handle('speech-select-model', async (event, options = {}) => {
    assertTrustedSender(event);
    const preferencePath = path.join(app.getPath('userData'), 'speech-model.json');
    if (options.clear === true) {
      await fs.promises.rm(preferencePath, { force: true });
      await stopBundledWhisperServer();
      return { ...configuredWhisperModel(), available: fs.existsSync(configuredWhisperModel().modelPath) };
    }
    const selection = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Choose a local Whisper.cpp model', properties: ['openFile'],
      filters: [{ name: 'Whisper model', extensions: ['bin'] }]
    });
    if (selection.canceled || !selection.filePaths.length) return null;
    const modelPath = selection.filePaths[0];
    if (path.extname(modelPath).toLowerCase() !== '.bin') throw new Error('Choose a local Whisper.cpp .bin model file.');
    const stats = await fs.promises.stat(modelPath);
    if (!stats.isFile() || stats.size < 1024 * 1024 || stats.size > 4 * 1024 ** 3) throw new Error('Choose a model file between 1 MB and 4 GB.');
    await fs.promises.mkdir(path.dirname(preferencePath), { recursive: true });
    await fs.promises.writeFile(preferencePath, JSON.stringify({ modelPath }), { mode: 0o600 });
    await stopBundledWhisperServer();
    return { name: path.basename(modelPath), custom: true, available: true, sizeBytes: stats.size };
  });

  ipcMain.handle('resume-export-pdf', async (event, input) => {
    assertTrustedSender(event);
    const draft = normalizeResumeDraft(input);
    const safeName = draft.name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'resume';
    const selection = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Export resume as PDF',
      defaultPath: `${safeName}-resume.pdf`,
      buttonLabel: 'Save PDF',
      filters: [{ name: 'PDF document', extensions: ['pdf'] }]
    });
    if (selection.canceled || !selection.filePath) return { canceled: true };
    const targetPath = selection.filePath.toLowerCase().endsWith('.pdf') ? selection.filePath : `${selection.filePath}.pdf`;
    const printWindow = new BrowserWindow({
      show: false,
      width: 900,
      height: 1200,
      backgroundColor: '#ffffff',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, javascript: false }
    });
    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createResumeHtml(draft))}`);
      const pdf = await printWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        preferCSSPageSize: true
      });
      await fs.promises.writeFile(targetPath, pdf, { flag: 'w' });
      return { saved: true };
    } finally {
      if (!printWindow.isDestroyed()) printWindow.close();
    }
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const audioOnly = details?.mediaTypes?.includes('audio') && !details?.mediaTypes?.includes('video');
    callback(permission === 'media' && audioOnly);
  });

  ipcMain.handle('provider-store-api-key', async (event, value) => {
    assertTrustedSender(event);
    if (typeof value !== 'string' || value.length > 4096) throw new Error('API key value is invalid');
    if (!value) {
      providerApiKey = '';
      if (fs.existsSync(apiKeyPath)) fs.unlinkSync(apiKeyPath);
      return { stored: false };
    }
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Encrypted API key storage is unavailable on this device');
    const encrypted = safeStorage.encryptString(value);
    fs.writeFileSync(apiKeyPath, encrypted);
    providerApiKey = value;
    return { stored: true };
  });

  ipcMain.handle('provider-list-models', async (event, payload = {}) => {
    assertTrustedSender(event);
    const provider = String(payload.provider || 'ollama');
    const localOnly = payload.localOnly === true;
    const endpoint = validateEndpoint(payload.endpoint || (provider === 'ollama' ? 'http://127.0.0.1:11434' : ''), localOnly);
    if (!['ollama', 'lmstudio', 'openai', 'custom'].includes(provider)) throw new Error('Choose a supported model provider');
    const isOllama = provider === 'ollama';
    if (payload.apiKey !== undefined && (typeof payload.apiKey !== 'string' || payload.apiKey.length > 4096)) throw new Error('API key value is invalid');
    const requestKey = payload.apiKey || providerApiKey;
    const headers = !isOllama && requestKey ? { Authorization: `Bearer ${requestKey}` } : {};
    const data = await fetchJson(`${endpoint}${isOllama ? '/api/tags' : '/models'}`, { headers }, isOllama ? 'Ollama' : 'OpenAI-compatible provider', localOnly);
    const models = isOllama ? data.models || [] : data.data || data.models || [];
    return { models: models.map((item) => typeof item === 'string' ? item : item.name || item.id).filter(Boolean) };
  });

  ipcMain.handle('provider-chat', async (event, payload = {}) => {
    assertTrustedSender(event);
    const { endpoint, model, provider, messages, localOnly } = validateChatPayload(payload);
    const isOllama = provider === 'ollama';
    const headers = { 'Content-Type': 'application/json' };
    if (!isOllama && providerApiKey) headers.Authorization = `Bearer ${providerApiKey}`;
    const url = `${endpoint}${isOllama ? '/api/chat' : '/chat/completions'}`;
    const body = isOllama
      ? { model, messages, stream: false, options: { temperature: 0.4 } }
      : { model, messages, stream: false, temperature: 0.4 };
    const senderId = event.sender.id;
    const requestRecord = { number: ++nextChatRequestNumber, controller: new AbortController(), cancelled: false };
    const requests = activeChatRequests.get(senderId) || new Set();
    requests.add(requestRecord);
    activeChatRequests.set(senderId, requests);
    let data;
    try {
      data = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) }, isOllama ? 'Ollama' : 'OpenAI-compatible provider', localOnly, requestRecord);
    } finally {
      requests.delete(requestRecord);
      if (!requests.size) activeChatRequests.delete(senderId);
    }
    if (isOllama) return data;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Provider returned no assistant text');
    return { message: { content } };
  });

  ipcMain.handle('provider-chat-stream', async (event, payload = {}) => {
    assertTrustedSender(event);
    const requestId = String(payload.requestId || '');
    if (!/^[a-zA-Z0-9_-]{8,96}$/.test(requestId)) throw new Error('Streaming request id is invalid');
    const { endpoint, model, provider, messages, localOnly } = validateChatPayload(payload);
    const isOllama = provider === 'ollama';
    const headers = { 'Content-Type': 'application/json', Accept: isOllama ? 'application/x-ndjson' : 'text/event-stream' };
    if (!isOllama && providerApiKey) headers.Authorization = `Bearer ${providerApiKey}`;
    const url = `${endpoint}${isOllama ? '/api/chat' : '/chat/completions'}`;
    const body = isOllama
      ? { model, messages, stream: true, options: { temperature: 0.4 } }
      : { model, messages, stream: true, temperature: 0.4 };
    const senderId = event.sender.id;
    const requestRecord = { number: ++nextChatRequestNumber, requestId, controller: new AbortController(), cancelled: false };
    const requests = activeChatRequests.get(senderId) || new Set();
    requests.add(requestRecord);
    activeChatRequests.set(senderId, requests);
    let timedOut = false;
    const timeoutTimer = setTimeout(() => { timedOut = true; requestRecord.controller.abort(); }, requestTimeoutMs);
    const send = (data) => {
      if (!event.sender.isDestroyed?.()) event.sender.send('provider-chat-stream-chunk', { requestId, ...data });
    };
    try {
      const response = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify(body), signal: requestRecord.controller.signal,
        ...(localOnly ? { redirect: 'error' } : {})
      });
      const content = await consumeProviderStream(response, isOllama ? 'ollama' : 'openai', (delta) => send({ delta }));
      if (!content.trim()) throw new Error('Provider returned no assistant text');
      send({ done: true });
      return { message: { content } };
    } catch (error) {
      const message = requestRecord.cancelled ? 'Model request was cancelled.'
        : error.name === 'AbortError' ? (timedOut ? 'Model did not respond within 120 seconds.' : 'Model request was cancelled.')
          : error.name === 'TypeError' ? `Could not reach ${isOllama ? 'Ollama' : 'OpenAI-compatible provider'}. Check the endpoint and service.`
            : String(error.message || error).slice(0, 400);
      send({ done: true, error: message });
      throw new Error(message);
    } finally {
      clearTimeout(timeoutTimer);
      requests.delete(requestRecord);
      if (!requests.size) activeChatRequests.delete(senderId);
    }
  });

  ipcMain.handle('provider-chat-cancel-current', (event) => {
    assertTrustedSender(event);
    const requests = activeChatRequests.get(event.sender.id);
    const current = requests ? [...requests].at(-1) : null;
    if (!current) return { cancelled: false };
    current.cancelled = true;
    current.controller.abort();
    return { cancelled: true };
  });

  ipcMain.handle('library-import-file', async (event, kind) => {
    assertTrustedSender(event);
    if (!['resume', 'document'].includes(kind)) throw new Error('Choose a valid library category');
    const selection = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: kind === 'resume' ? 'Import a resume' : 'Add a document',
      properties: ['openFile'],
      filters: [{ name: 'PDF, Word, or text document', extensions: ['pdf', 'docx', 'txt'] }]
    });
    if (selection.canceled || !selection.filePaths.length) return null;
    const filePath = selection.filePaths[0];
    const extension = path.extname(filePath).slice(1).toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(extension)) throw new Error('Choose a PDF, DOCX, or TXT file.');
    const fileStat = await fs.promises.stat(filePath);
    if (fileStat.size < 1 || fileStat.size > 10 * 1024 * 1024) throw new Error('Files must be between 1 byte and 10 MB.');
    const fileBuffer = await fs.promises.readFile(filePath);
    let text;
    try { text = await extractImportedText(extension, fileBuffer, { ocrPdf: ocrScannedPdf }); }
    catch (error) { throw new Error(`Could not read this ${extension.toUpperCase()} file: ${String(error.message || error).slice(0, 300)}`); }
    text = String(text || '').replace(/\u0000/g, '').replace(/[\t ]+\n/g, '\n').trim().slice(0, 100_000);
    if (text.length < 20) {
      throw new Error(extension === 'pdf'
        ? 'The PDF has no readable text after local OCR. Try a clearer scan, or import a text-based PDF, DOCX, or TXT file.'
        : 'This file contains too little readable text to add.');
    }
    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: path.basename(filePath),
      extension,
      size: fileStat.size,
      kind,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      importedAt: new Date().toISOString()
    };
  });

  ipcMain.handle('headshots-import-photo', async (event) => {
    assertTrustedSender(event);
    const selection = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
      title: 'Choose an existing headshot',
      properties: ['openFile'],
      filters: [{ name: 'Photo', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
    });
    if (selection.canceled || !selection.filePaths.length) return null;
    const filePath = selection.filePaths[0];
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const fileStat = await fs.promises.stat(filePath);
    if (fileStat.size < 16 || fileStat.size > 10 * 1024 * 1024) throw new Error('Choose a photo between 16 bytes and 10 MB.');
    const data = await fs.promises.readFile(filePath);
    const isPng = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    const isWebp = data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
    const mime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : isWebp ? 'image/webp' : '';
    const allowedExtension = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] }[mime] || [];
    if (!allowedExtension.includes(extension)) throw new Error('The selected file is not a supported JPEG, PNG, or WebP photo.');
    return { name: path.basename(filePath), size: fileStat.size, mime, dataUrl: `data:${mime};base64,${data.toString('base64')}` };
  });

  ipcMain.handle('headshots-generate-local', async (event, payload) => {
    assertTrustedSender(event);
    return generateLocalHeadshot(payload);
  });

  ipcMain.handle('speech-transcribe-local', async (event, payload = {}) => {
    assertTrustedSender(event);
    const { endpoint, audio, mimeType, language } = validateSpeechPayload(payload);
    await ensureBundledWhisperServer(endpoint);
    const extension = mimeType === 'audio/wav' ? 'wav' : mimeType === 'audio/ogg' ? 'ogg' : mimeType === 'audio/mp4' ? 'm4a' : 'webm';
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), `answer.${extension}`);
    form.append('response_format', 'json');
    if (language !== 'auto') form.append('language', language);
    const data = await fetchJson(endpoint, { method: 'POST', body: form }, 'Local speech model');
    if (typeof data.text !== 'string') throw new Error('Local speech model returned no transcript text');
    return { text: data.text.trim() };
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (whisperServerProcess && whisperServerProcess.exitCode === null) whisperServerProcess.kill();
  whisperServerProcess = null;
});

app.on('render-process-gone', (_event, _webContents, details = {}) => {
  recordLocalCrash('renderer-process', { reason: details.reason, exitCode: details.exitCode });
});
process.on('uncaughtExceptionMonitor', (_error, _origin) => {
  recordLocalCrash('main-process', { reason: 'abnormal-exit' });
});
