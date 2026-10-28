const test = require('node:test');
const assert = require('node:assert/strict');
const { createResumeHtml, normalizeResumeDraft } = require('../src/resume-pdf.cjs');

const draft = {
  name: 'Taylor Example', headline: 'Operations Analyst', email: 'taylor@example.com',
  phone: '+1 555 0100', location: 'Austin, TX', summary: 'Analyst focused on practical process improvements.',
  experiences: [{ role: 'Operations Analyst', company: 'Example Co', dates: '2022-2025', details: 'Improved reporting workflows\nPartnered with operations teams' }],
  education: 'BA, Economics', skills: 'Analysis, Reporting'
};

test('resume PDF export creates a styled document with all supplied sections', () => {
  const html = createResumeHtml(draft);
  for (const content of ['Taylor Example', 'Operations Analyst', 'Professional Summary', 'Example Co', 'Education & Training', 'Reporting']) assert.ok(html.includes(content), `expected ${content}`);
  assert.match(html, /@page\{size:A4/);
  assert.doesNotMatch(html, /<script/i);
});

test('resume PDF export escapes markup and preserves newlines as text breaks', () => {
  const html = createResumeHtml({ ...draft, name: '<img src=x onerror=alert(1)>', summary: 'Safe <strong>text</strong>\nNext line' });
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /Safe &lt;strong&gt;text&lt;\/strong&gt;<br>Next line/);
  assert.doesNotMatch(html, /<img src=x/);
});

test('resume PDF export validates fields and limits before rendering', () => {
  assert.throws(() => normalizeResumeDraft({ ...draft, name: 'x'.repeat(101) }), /name is invalid or too long/);
  assert.throws(() => normalizeResumeDraft({ ...draft, experiences: Array(9).fill({}) }), /experience data is invalid/);
  assert.throws(() => normalizeResumeDraft({ ...draft, name: '' }), /name and professional headline/);
});

test('resume PDF export supports distinct modern, classic, and compact layouts', () => {
  const modern = createResumeHtml({ ...draft, template: 'modern' });
  const classic = createResumeHtml({ ...draft, template: 'classic' });
  const compact = createResumeHtml({ ...draft, template: 'compact' });
  assert.match(modern, /#159d4b/);
  assert.match(classic, /Georgia,"Times New Roman",serif/);
  assert.match(compact, /font:9\.5pt/);
  assert.throws(() => createResumeHtml({ ...draft, template: 'unknown' }), /supported resume PDF template/);
});
