const { spawnSync } = require('node:child_process');

const result = spawnSync(process.execPath, ['--test', 'test/e2e-smoke.test.cjs'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: { ...process.env, FULLY_PREPARED_RUN_E2E: '1' }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
