const test = require('node:test');
const assert = require('node:assert/strict');
const { redact, createSafeDiagnosticReport } = require('../src/diagnostic-redaction.js');

test('redacts common direct identifiers and credentials from diagnostic text', () => {
  const safe = redact('Contact alex@example.com at +1 (555) 234-5678. Bearer abcdef123456789 sk-abcdefghijklmnop API_KEY=private123');
  assert.doesNotMatch(safe, /alex@example\.com|555\) 234-5678|abcdef123456789|sk-abcdefghijklmnop|private123/);
  assert.match(safe, /email redacted/);
  assert.match(safe, /phone redacted/);
  assert.match(safe, /key redacted/);
});

test('diagnostic report uses an allowlist and never includes transcript or document fields', () => {
  const report = createSafeDiagnosticReport({
    version: '1.0', cpu: 'Test CPU', memoryGiB: 16, architecture: 'x64', provider: 'Ollama',
    transcript: 'private transcript text', documentText: 'secret resume data', details: 'alex@example.com'
  });
  assert.match(report, /Test CPU/);
  assert.match(report, /email redacted/);
  assert.doesNotMatch(report, /private transcript text|secret resume data/);
});
