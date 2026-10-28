(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FullyPreparedSessionState = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  function cleanMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages.filter((message) => message && typeof message.text === 'string')
      .map((message) => ({ text: message.text, source: typeof message.source === 'string' ? message.source : 'Session' }));
  }

  function cleanContextIds(ids) {
    if (!Array.isArray(ids)) return [];
    return [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 180))].slice(0, 20);
  }

  function createSession({ company, jobDescription, model = '', language = 'en', type = 'Mock interview', contextIds = [], saveTranscript = true, autoGenerate = false, now = Date.now() }) {
    return {
      id: `session-${now}-${Math.random().toString(36).slice(2, 8)}`,
      company: String(company || '').trim(),
      jobDescription: String(jobDescription || '').trim(),
      model: String(model || ''),
      language: /^[a-z]{2,3}$/i.test(language) ? language.toLowerCase() : 'en',
      type: ['Interview', 'Regular call', 'Mock interview'].includes(type) ? type : 'Mock interview',
      contextIds: cleanContextIds(contextIds),
      saveTranscript: saveTranscript !== false,
      autoGenerate: autoGenerate === true,
      paused: false,
      startedAt: new Date(now).toISOString(),
      elapsedSeconds: 0,
      status: 'active',
      messages: []
    };
  }

  function restoreActiveSession(serialized) {
    try {
      const session = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
      if (!session || typeof session.id !== 'string' || !['active', 'interrupted'].includes(session.status) || !Array.isArray(session.messages)) return null;
      return {
        ...session,
        company: typeof session.company === 'string' ? session.company : '',
        jobDescription: typeof session.jobDescription === 'string' ? session.jobDescription : '',
        type: ['Interview', 'Regular call', 'Mock interview'].includes(session.type) ? session.type : 'Mock interview',
        language: typeof session.language === 'string' && /^[a-z]{2,3}$/i.test(session.language) ? session.language.toLowerCase() : 'en',
        contextIds: cleanContextIds(session.contextIds),
        saveTranscript: session.saveTranscript !== false,
        autoGenerate: session.autoGenerate === true,
        paused: false,
        elapsedSeconds: Math.max(0, Number(session.elapsedSeconds) || 0),
        messages: cleanMessages(session.messages),
        status: 'interrupted'
      };
    } catch {
      return null;
    }
  }

  function setSessionPaused(session, paused) {
    if (!session || session.status !== 'active') return session || null;
    return { ...session, paused: paused === true };
  }

  function snapshotSession(session, messages, elapsedSeconds) {
    if (!session) return null;
    return {
      ...session,
      elapsedSeconds: Math.max(0, Number(elapsedSeconds) || 0),
      messages: session.saveTranscript === false ? [] : cleanMessages(messages)
    };
  }

  function completeSession(session, messages, elapsedSeconds, endedAt = new Date().toISOString()) {
    const snapshot = snapshotSession(session, messages, elapsedSeconds);
    if (!snapshot) return null;
    return { ...snapshot, paused: false, status: 'completed', endedAt };
  }

  return { createSession, restoreActiveSession, snapshotSession, completeSession, setSessionPaused };
});
