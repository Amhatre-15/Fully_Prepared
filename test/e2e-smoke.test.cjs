const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');
const CDP = require('chrome-remote-interface');

const root = path.resolve(__dirname, '..');
const electron = process.env.FULLY_PREPARED_ELECTRON_PATH || path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const appRoot = process.env.FULLY_PREPARED_APP_PATH || root;

test('Electron end-to-end smoke: dashboard, onboarding dismissal, and preparation navigation', { skip: process.env.FULLY_PREPARED_RUN_E2E !== '1', timeout: 60_000 }, async (t) => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'fully-prepared-e2e-'));
  const child = spawn(electron, [appRoot, '--remote-debugging-port=0', `--user-data-dir=${profile}`], {
    cwd: appRoot,
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' }
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-8000); });
  let client;
  t.after(async () => {
    try { client?.close(); } catch {}
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([new Promise((resolve) => child.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 4000))]);
    }
    await fs.rm(profile, { recursive: true, force: true });
  });

  const activePortPath = path.join(profile, 'DevToolsActivePort');
  let debugPort;
  const startupDeadline = Date.now() + 35_000;
  while (Date.now() < startupDeadline) {
    if (child.exitCode !== null) throw new Error(`Electron exited during startup (${child.exitCode}). ${stderr}`);
    try {
      const lines = (await fs.readFile(activePortPath, 'utf8')).split(/\r?\n/);
      debugPort = Number(lines[0]);
      if (debugPort > 0) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(debugPort, `Electron did not expose its temporary DevTools port. ${stderr}`);

  let target;
  const pageDeadline = Date.now() + 20_000;
  while (Date.now() < pageDeadline) {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`).catch(() => null);
    const pages = response?.ok ? await response.json() : [];
    target = pages.find((page) => page.type === 'page' && page.webSocketDebuggerUrl);
    if (target) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(target, `Electron opened no renderer target. ${stderr}`);

  client = await CDP({ target: target.webSocketDebuggerUrl });
  const evaluate = async (expression) => {
    const result = await client.Runtime.evaluate({ expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Renderer evaluation failed');
    return result.result?.value;
  };
  await client.Runtime.enable();
  const uiDeadline = Date.now() + 20_000;
  let ready = false;
  while (Date.now() < uiDeadline) {
    ready = await evaluate("Boolean(document.querySelector('#preparationView') && document.querySelector('.nav-link[data-view=\\\"headshots\\\"]'))").catch(() => false);
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(ready, true, 'dashboard renderer did not finish loading');
  assert.equal(await evaluate("document.querySelector('main')?.innerText.includes('Call Sessions') || document.body.innerText.includes('Call Sessions')"), true, 'call sessions dashboard is not visible');
  await evaluate("document.querySelector('.first-run-setup button:last-child')?.click()");

  for (const [view, expected] of [['questions', 'Question Bank'], ['resume-maker', 'Resume Maker'], ['headshots', 'Headshots']]) {
    const result = await evaluate(`(() => { document.querySelector('.nav-link[data-view="${view}"]')?.click(); return new Promise(resolve => setTimeout(() => resolve(document.querySelector('#preparationView')?.innerText || ''), 250)); })()`);
    assert.match(result, new RegExp(expected), `${view} page did not render its expected heading`);
  }
});
