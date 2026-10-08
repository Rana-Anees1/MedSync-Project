import { connectDB } from '../src/config/db.js';
import { env, requireEnv } from '../src/config/env.js';
import { getRules } from '../src/services/rules.js';
import { createApp } from '../src/app.js';

requireEnv();
await connectDB(env.mongoUri);
await getRules();

const app = createApp();

export default app;