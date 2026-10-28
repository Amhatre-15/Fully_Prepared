const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSummaryMessages, normalizeSummarySuggestion } = require('../src/resume-content.js');

test('resume summary prompt sends only bounded allowlisted facts with an untrusted-data boundary', () => {
  const messages = buildSummaryMessages({
    name: 'private name is not sent', email: 'private@example.com', headline: 'Data Analyst',
    experiences: [{ role: 'Analyst', company: 'Example', details: 'Built SQL dashboards.' }],
    education: 'BA', skills: 'SQL'
  });
  assert.match(messages[0].content, /only facts explicitly present/);
  assert.match(messages[0].content, /untrusted reference data/);
  assert.match(messages[1].content, /Built SQL dashboards/);
  assert.doesNotMatch(messages[1].content, /private name|private@example\.com/);
});

test('resume summary prompt rejects empty sources and bounds role data', () => {
  assert.throws(() => buildSummaryMessages({}), /Add a role, experience, or skills first/);
  const messages = buildSummaryMessages({ headline: 'Analyst', experiences: Array(10).fill({ role: 'x'.repeat(200) }) });
  const facts = JSON.parse(messages[1].content.split('\n').slice(1).join('\n'));
  assert.equal(facts.experience.length, 8);
  assert.equal(facts.experience[0].role.length, 100);
});

test('resume model output is normalized, non-empty, and capped at the editor limit', () => {
  assert.equal(normalizeSummarySuggestion('```text\nExperienced analyst.\n```'), 'Experienced analyst.');
  assert.throws(() => normalizeSummarySuggestion(''), /empty suggestion/);
  assert.throws(() => normalizeSummarySuggestion('x'.repeat(1501)), /longer than the resume summary limit/);
});
