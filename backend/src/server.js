import cron from 'node-cron';
import { env, requireEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { runDailyChecks } from './services/dailyChecks.js';
import { getRules } from './services/rules.js';

export async function start({ mongoUri = env.mongoUri } = {}) {
  if (mongoUri === env.mongoUri) requireEnv();
  await connectDB(mongoUri);
  await getRules();
  const app = createApp();
  const server = app.listen(env.port, () => console.log(`[api] MedSync API listening on http://localhost:${env.port}/api`));
  cron.schedule(env.dailyCheckCron, () => runDailyChecks().then((r) => console.log('[cron] daily checks', r)).catch((e) => console.error('[cron] failed', e)));
  return server;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) start().catch((err) => { console.error(`[startup] ${err.message}`); process.exit(1); });
