const test = require('node:test');
const assert = require('node:assert/strict');
const { consumeProviderStream } = require('../src/provider-stream.js');

function streamedResponse(chunks, ok = true, status = 200) {
  let index = 0;
  const encoder = new TextEncoder();
  return {
    ok, status,
    body: { getReader: () => ({ read: async () => index < chunks.length ? { value: encoder.encode(chunks[index++]), done: false } : { value: undefined, done: true } }) },
    json: async () => ({})
  };
}

test('parses Ollama NDJSON chunks and returns accumulated content', async () => {
  const chunks = [];
  const result = await consumeProviderStream(streamedResponse([
    '{"message":{"content":"Hello "},"done":false}\n{"message":{"content":"there."},"done":true}\n'
  ]), 'ollama', (chunk) => chunks.push(chunk));
  assert.equal(result, 'Hello there.');
  assert.deepEqual(chunks, ['Hello ', 'there.']);
});

test('parses OpenAI-compatible SSE deltas and ignores the terminal marker', async () => {
  const result = await consumeProviderStream(streamedResponse([
    'data: {"choices":[{"delta":{"content":"early "}}]}\n',
    'data: {"choices":[{"delta":{"content":"answer"}}]}\n\ndata: [DONE]\n'
  ]), 'openai');
  assert.equal(result, 'early answer');
});

test('rejects failed endpoints and malformed stream records', async () => {
  await assert.rejects(consumeProviderStream({ ok: false, status: 500, json: async () => ({ message: 'server error' }) }, 'ollama'), /server error/);
  await assert.rejects(consumeProviderStream(streamedResponse(['not json\n']), 'ollama'), /malformed streaming/);
});
