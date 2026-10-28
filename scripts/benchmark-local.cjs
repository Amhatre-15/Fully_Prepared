const os = require('node:os');
const { performance } = require('node:perf_hooks');
const { analyzeResume } = require('../src/resume-analysis.js');
const { budgetModelMessages } = require('../src/model-context.js');
const { extractImportedText } = require('../src/import-text.cjs');

function parseArgs(args) {
  const output = {};
  for (let index = 0; index < args.length; index++) {
    if (!args[index].startsWith('--')) continue;
    const key = args[index].slice(2);
    output[key] = args[index + 1]?.startsWith('--') || !args[index + 1] ? true : args[++index];
  }
  return output;
}

function assertLoopback(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('Provide an Ollama URL on this computer, such as http://127.0.0.1:11434.'); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (url.protocol !== 'http:' || !(host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host)) || url.username || url.password) {
    throw new Error('Performance profiles only send the fixed test prompt to a local HTTP Ollama endpoint.');
  }
  return url.origin;
}

async function runCoreBenchmark(iterations = 100) {
  const resume = `Product engineer\nExperience\nDesigned and launched an internal workflow used by 2,400 customers. Improved reliability by 31 percent.\nSkills\nJavaScript, SQL, testing, communication\nEducation\nComputer Science\nEmail: candidate@example.test`;
  const job = 'Senior product engineer who designs reliable workflows, communicates with stakeholders, and builds tested JavaScript services.';
  const messages = [
    { role: 'system', content: 'Follow the interview guidance.' },
    ...Array.from({ length: 20 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `Interview answer ${index}: ${resume}` }))
  ];
  const text = 'Imported resume text. '.repeat(5000);
  const cases = [
    ['role-specific resume review', () => analyzeResume({ resumeText: resume, jobTitle: 'Senior product engineer', jobDescription: job })],
    ['bounded model-context budgeting', () => budgetModelMessages(messages, 8000)],
    ['UTF-8 document extraction', () => extractImportedText('txt', Buffer.from(text))]
  ];
  const results = [];
  for (const [name, run] of cases) {
    const start = performance.now();
    for (let index = 0; index < iterations; index++) await run();
    const elapsed = performance.now() - start;
    results.push({ name, iterations, totalMs: Number(elapsed.toFixed(2)), averageMs: Number((elapsed / iterations).toFixed(3)) });
  }
  return results;
}

async function runModelBenchmark({ profile, model, endpoint, fetchImpl = fetch, rounds = 3 }) {
  if (!model || typeof model !== 'string' || model.length > 200) throw new Error('Provide --model with an installed Ollama model name.');
  const baseUrl = assertLoopback(endpoint || 'http://127.0.0.1:11434');
  const samples = [];
  for (let index = 0; index < rounds; index++) {
    const options = { num_predict: 32, temperature: 0 };
    if (profile === 'cpu') options.num_gpu = 0;
    const response = await fetchImpl(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, prompt: 'Reply with exactly the word READY.', stream: false, keep_alive: '5m', options }),
      signal: AbortSignal.timeout(180_000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`Local Ollama benchmark failed: ${String(data.error || response.statusText).slice(0, 250)}`);
    samples.push({
      totalMs: Number(((data.total_duration || 0) / 1e6).toFixed(2)),
      loadMs: Number(((data.load_duration || 0) / 1e6).toFixed(2)),
      promptTokens: data.prompt_eval_count || 0,
      generatedTokens: data.eval_count || 0,
      tokensPerSecond: data.eval_duration ? Number(((data.eval_count || 0) / (data.eval_duration / 1e9)).toFixed(2)) : null
    });
  }
  return { profile, model, endpoint: baseUrl, rounds, samples };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: node scripts/benchmark-local.cjs [--profile cpu|gpu] [--model MODEL] [--endpoint http://127.0.0.1:11434]\nWithout --model, measures local CPU preparation and text-processing workloads.\n');
    return;
  }
  const profile = args.profile || 'cpu';
  if (!['cpu', 'gpu'].includes(profile)) throw new Error('Choose --profile cpu or --profile gpu.');
  const report = {
    generatedAt: new Date().toISOString(),
    device: { platform: process.platform, architecture: process.arch, cpu: os.cpus()[0]?.model || 'unknown', logicalCores: os.cpus().length, memoryGiB: Number((os.totalmem() / 2 ** 30).toFixed(1)) },
    inferenceMode: profile === 'cpu' ? 'Ollama GPU layers disabled (num_gpu=0)' : 'Ollama automatic accelerator selection',
    core: await runCoreBenchmark()
  };
  if (args.model) report.inference = await runModelBenchmark({ profile, model: args.model, endpoint: args.endpoint });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { assertLoopback, runCoreBenchmark, runModelBenchmark };
