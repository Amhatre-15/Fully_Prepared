const { contextBridge, ipcRenderer } = require('electron');
let localOnly = true;

contextBridge.exposeInMainWorld('fullyPrepared', {
  appName: 'Fully Prepared',
  version: '0.1.0',
  getVersion: () => ipcRenderer.invoke('app-version'),
  getCapabilities: () => ipcRenderer.invoke('app-capabilities'),
  diagnostics: {
    getCrashReports: () => ipcRenderer.invoke('crash-reporting-get'),
    setCrashReportsEnabled: (enabled) => ipcRenderer.invoke('crash-reporting-set', enabled),
    exportCrashReport: () => ipcRenderer.invoke('crash-reporting-export'),
    clearCrashReports: () => ipcRenderer.invoke('crash-reporting-clear'),
    clearPrivateLocalData: () => ipcRenderer.invoke('local-data-clear-private')
  },
  resume: {
    exportPdf: (draft) => ipcRenderer.invoke('resume-export-pdf', draft)
  },
  models: {
    setLocalOnly: (enabled) => { localOnly = enabled !== false; },
    list: (payload) => ipcRenderer.invoke('provider-list-models', { ...payload, localOnly }),
    chat: (payload) => ipcRenderer.invoke('provider-chat', { ...payload, localOnly }),
    chatStream: (payload, onChunk) => {
      const requestId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      const listener = (_event, chunk) => { if (chunk?.requestId === requestId) onChunk?.(chunk); };
      ipcRenderer.on('provider-chat-stream-chunk', listener);
      return ipcRenderer.invoke('provider-chat-stream', { ...payload, requestId, localOnly })
        .finally(() => ipcRenderer.removeListener('provider-chat-stream-chunk', listener));
    },
    cancelCurrent: () => ipcRenderer.invoke('provider-chat-cancel-current'),
    storeApiKey: (value) => ipcRenderer.invoke('provider-store-api-key', value)
  },
  speech: {
    transcribeLocal: (payload) => ipcRenderer.invoke('speech-transcribe-local', payload),
    diagnose: (payload) => ipcRenderer.invoke('speech-diagnostics', payload),
    getModel: () => ipcRenderer.invoke('speech-get-model'),
    selectModel: (options) => ipcRenderer.invoke('speech-select-model', options),
    synthesizeLocal: (payload) => ipcRenderer.invoke('speech-synthesize-local', payload)
  },
  library: {
    importFile: (kind) => ipcRenderer.invoke('library-import-file', kind)
  },
  jobLinks: {
    import: (url) => ipcRenderer.invoke('job-link-import', url)
  },
  headshots: {
    importPhoto: () => ipcRenderer.invoke('headshots-import-photo'),
    generateLocal: (payload) => ipcRenderer.invoke('headshots-generate-local', payload)
  },
  ollama: {
    listModels: (endpoint) => ipcRenderer.invoke('provider-list-models', { provider: 'ollama', endpoint, localOnly }),
    chat: (payload) => ipcRenderer.invoke('provider-chat', { ...payload, provider: payload?.provider || 'ollama', localOnly })
  }
});
