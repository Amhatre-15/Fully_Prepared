const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('third-party notice inventory is present and lockfile package entries declare licenses', () => {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const packages = Object.entries(lock.packages).filter(([name]) => name);
  assert.ok(packages.length > 0);
  assert.ok(packages.every(([, entry]) => typeof entry.license === 'string' && entry.license.length > 0));
  for (const file of [
    'docs/THIRD_PARTY_NOTICES.md',
    'node_modules/electron/LICENSE',
    'node_modules/electron/dist/LICENSES.chromium.html',
    'node_modules/mammoth/LICENSE',
    'node_modules/pdfjs-dist/LICENSE',
    'vendor/whisper/Release/LICENSE',
    'vendor/whisper/Release/SDL2-LICENSE.txt'
  ]) assert.ok(fs.existsSync(path.join(root, file)), `missing notice: ${file}`);
});
