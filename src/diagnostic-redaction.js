(function (root) {
  const scrub = (value) => String(value ?? '')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email redacted]')
    .replace(/\bBearer\s+[A-Z0-9._~+/-]+=*/gi, 'Bearer [token redacted]')
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_-]{12,}\b/g, '[key redacted]')
    .replace(/((?:api[_-]?key|access[_-]?token|password)=)([^\s&]+)/gi, '$1[redacted]')
    .replace(/(?<!\w)\+?\d[\d(). -]{7,}\d(?!\w)/g, '[phone redacted]')
    .slice(0, 2000);
  function createSafeDiagnosticReport({ version = 'unknown', cpu = 'unknown', memoryGiB = 0, architecture = 'unknown', speech = 'not checked', provider = 'not configured', details = '' } = {}) {
    return [
      'Fully Prepared diagnostic summary (local only)',
      `Version: ${scrub(version)}`,
      `Device: ${scrub(cpu)} · ${Number(memoryGiB) || 0} GiB · ${scrub(architecture)}`,
      `Model provider: ${scrub(provider)}`,
      `Speech service: ${scrub(speech)}`,
      `Details: ${scrub(details)}`,
      'Transcript text, imported document contents, endpoints, and API keys are not included.'
    ].join('\n');
  }
  const api = Object.freeze({ redact: scrub, createSafeDiagnosticReport });
  if (root) root.FullyPreparedDiagnostics = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
