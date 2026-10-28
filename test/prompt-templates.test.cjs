const test = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../src/prompt-templates.js');

test('central interview prompts provide all three roles and safe data boundaries', () => {
  for (const role of ['interviewer', 'coach', 'summarizer']) {
    const prompt = templates.get(role);
    assert.ok(prompt.length > 80, `${role} prompt should be defined`);
    assert.match(prompt, /(untrusted|reference data)/i);
  }
  assert.match(templates.get('interviewer'), /exactly one/i);
  assert.match(templates.get('coach'), /Never invent/i);
  assert.match(templates.get('summarizer'), /Follow-up actions/i);
  assert.equal(templates.get('unknown-role'), '');
});
