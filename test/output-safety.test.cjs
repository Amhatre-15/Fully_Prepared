const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('model answers are inserted as plain text, never interpreted as HTML', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
  assert.match(renderer, /message\.appendChild\(document\.createTextNode\(String\(text\?\?''\)\)\)/);
  assert.match(renderer, /line\.textContent=item\.text\|\|''/);
});
