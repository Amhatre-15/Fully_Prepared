const test = require('node:test');
const assert = require('node:assert/strict');
const { buildResumeText, validateResumeDraft, createCustomQuestion } = require('../src/preparation-core.js');

test('resume maker creates a readable text resume without invented content', () => {
  const resume = buildResumeText({
    name: 'Taylor Example', headline: 'Support specialist', email: 'taylor@example.com',
    summary: 'Customer support professional focused on clear, helpful communication.',
    experiences: [{ role: 'Support Specialist', company: 'Example Co', dates: '2023–2025', details: 'Resolved customer issues\nDocumented common problems' }],
    education: 'BA, Communications', skills: 'Customer support, writing'
  });
  assert.match(resume, /Taylor Example/);
  assert.match(resume, /PROFESSIONAL SUMMARY/);
  assert.match(resume, /Support Specialist — Example Co/);
  assert.match(resume, /• Resolved customer issues/);
  assert.match(resume, /EDUCATION/);
  assert.match(resume, /SKILLS/);
  assert.doesNotMatch(resume, /invented|generated metrics/i);
});

test('resume maker validates core fields and optional email format', () => {
  assert.match(validateResumeDraft({}), /Enter your name/);
  assert.match(validateResumeDraft({ name: 'Taylor', headline: 'Analyst', email: 'not-an-email', summary: 'A professional summary.' }), /email address format/);
  assert.match(validateResumeDraft({ name: 'Taylor', headline: 'Analyst' }), /summary or at least one role/);
  assert.equal(validateResumeDraft({ name: 'Taylor', headline: 'Analyst', summary: 'Experienced analyst.' }), '');
});

test('custom interview questions are validated and normalized before saving', () => {
  assert.throws(() => createCustomQuestion({ text: 'Short' }), /between 12 and 600 characters/);
  assert.throws(() => createCustomQuestion({ text: 'A complete interview question', category: 'Unlisted' }), /available question categories/);
  const question = createCustomQuestion({ text: '  How did you improve that process?  ', category: 'Behavioral', tags: 'process, ownership' });
  assert.equal(question.text, 'How did you improve that process?');
  assert.deepEqual(question.tags, ['process', 'ownership']);
  assert.equal(question.origin, 'custom');
  assert.equal(question.favorite, false);
});
