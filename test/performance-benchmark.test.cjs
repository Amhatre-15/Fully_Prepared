const assert = require('node:assert/strict');
const test = require('node:test');
const { assertLoopback, runCoreBenchmark, runModelBenchmark } = require('../scripts/benchmark-local.cjs');

test('performance harness exercises resume review, context budgeting, and local text extraction', async () => {
  const results = await runCoreBenchmark(2);
  assert.deepEqual(results.map((item) => item.name), ['role-specific resume review', 'bounded model-context budgeting', 'UTF-8 document extraction']);
  assert.ok(results.every((item) => item.totalMs >= 0 && item.averageMs >= 0));
});

test('CPU and automatic-accelerator profiles send only fixed local Ollama benchmark prompts', async () => {
  for (const profile of ['cpu', 'gpu']) {
    let request;
    const report = await runModelBenchmark({ profile, model: 'local-model', endpoint: 'http://127.0.0.1:11434', rounds: 1, fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ total_duration: 1_000_000_000, load_duration: 100_000_000, prompt_eval_count: 6, eval_count: 3, eval_duration: 500_000_000 }) };
    } });
    assert.equal(request.url, 'http://127.0.0.1:11434/api/generate');
    assert.match(request.body.prompt, /^Reply with exactly/);
    assert.equal(request.body.options.num_gpu, profile === 'cpu' ? 0 : undefined);
    assert.equal(report.samples[0].tokensPerSecond, 6);
  }
  assert.throws(() => assertLoopback('https://example.org'), /local HTTP Ollama/);
});
