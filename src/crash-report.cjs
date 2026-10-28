const REASONS = new Set(['crashed', 'oom', 'killed', 'clean-exit', 'abnormal-exit', 'unknown']);

function normalizeCrashRecord(value = {}) {
  const source = value.source === 'main-process' ? 'main-process' : 'renderer-process';
  const reason = REASONS.has(value.reason) ? value.reason : 'unknown';
  const exitCode = Number.isInteger(value.exitCode) && Math.abs(value.exitCode) <= 1_000_000 ? value.exitCode : null;
  const date = new Date(value.at || Date.now());
  return {
    source,
    reason,
    exitCode,
    version: String(value.version || 'unknown').replace(/[^0-9A-Za-z.+-]/g, '').slice(0, 40) || 'unknown',
    at: Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString()
  };
}

function formatCrashReport(records) {
  const safeRecords = (Array.isArray(records) ? records : []).slice(-50).map(normalizeCrashRecord);
  return [
    'Fully Prepared local crash report',
    'Saved only on this device by explicit opt-in. This report contains event metadata only.',
    'No transcript, document text, file path, endpoint, exception message, stack trace, or API key is included.',
    '',
    ...safeRecords.map((record) => `${record.at} · ${record.source} · ${record.reason} · exit ${record.exitCode ?? 'n/a'} · version ${record.version}`)
  ].join('\n');
}

module.exports = { normalizeCrashRecord, formatCrashReport };
