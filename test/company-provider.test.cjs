const test = require('node:test');
const assert = require('node:assert/strict');
const provider = require('../src/company-provider.js');
const directory = [['Amazon', 'amazon.com'], ['Apple', 'apple.com'], ['Anthropic', 'anthropic.com']];

test('local company provider matches names and domains case-insensitively', () => {
  provider.resetProvider();
  assert.deepEqual(provider.search('ANTH', directory), [['Anthropic', 'anthropic.com']]);
  assert.deepEqual(provider.search('apple.com', directory), [['Apple', 'apple.com']]);
  assert.deepEqual(provider.search('', directory), []);
});

test('company suggestion provider can be replaced and restored', () => {
  provider.setProvider((query) => [['Custom example', `${query}.example`]]);
  assert.deepEqual(provider.search('acme', directory), [['Custom example', 'acme.example']]);
  provider.resetProvider();
  assert.throws(() => provider.setProvider({}), /must be a function/);
});
