// Production release from apps/.env: deploys the Worker with its variables, then
// uploads its secrets in one batch. Run: npm run deploy:prod
import { spawnSync } from 'node:child_process';
import { OPTIONAL_VARS, WORKER_SECRETS, WORKER_VARS, loadProdEnv } from './prodEnv.mjs';

const env = loadProdEnv([...WORKER_SECRETS, ...WORKER_VARS]);
const wrangler = (args, input) => {
  const res = spawnSync('npx', ['wrangler', ...args], { stdio: [input ? 'pipe' : 'inherit', 'inherit', 'inherit'], input });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

const vars = { ...env, ...Object.fromEntries(OPTIONAL_VARS.map((k) => [k, (process.env[k] ?? '').trim()]).filter(([, v]) => v)) };
const varKeys = [...WORKER_VARS, ...OPTIONAL_VARS].filter((k) => vars[k]);
wrangler(['deploy', '--env', 'production', ...varKeys.flatMap((k) => ['--var', `${k}:${vars[k]}`])]);
// Secrets go over stdin, so they never appear in the process list or shell history.
wrangler(['secret', 'bulk', '--env', 'production'], JSON.stringify(Object.fromEntries(WORKER_SECRETS.map((k) => [k, env[k]]))));
console.log(`\nMedRec API is live at ${env.PUBLIC_URL} — check ${env.PUBLIC_URL}/api/ready`);
