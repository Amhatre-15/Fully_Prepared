const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeCrashRecord, formatCrashReport } = require('../src/crash-report.cjs');

test('crash records keep only safe event metadata', () => {
  const record = normalizeCrashRecord({
    source: 'renderer-process', reason: 'crashed', exitCode: 7, version: '0.1.0',
    at: '2026-10-21T00:00:00.000Z', message: 'resume.pdf at C:\\Users\\Alex\\Documents', stack: 'secret stack'
  });
  assert.deepEqual(Object.keys(record).sort(), ['at', 'exitCode', 'reason', 'source', 'version']);
  assert.equal(record.reason, 'crashed');
});

test('exported crash reports never contain exception text, paths, endpoints, or personal data', () => {
  const text = formatCrashReport([{ source: 'main-process', reason: 'abnormal-exit', exitCode: 1, version: '0.1.0', message: 'user@example.com http://private.local resume text' }]);
  assert.match(text, /main-process · abnormal-exit/);
  assert.doesNotMatch(text, /user@example|private\.local|resume text/);
  assert.match(text, /No transcript, document text/);
});
