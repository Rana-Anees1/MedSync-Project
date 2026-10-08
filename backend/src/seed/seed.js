import { env, requireEnv } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { seedDatabase } from './seedData.js';
import mongoose from 'mongoose';

requireEnv();
await connectDB(env.mongoUri);
await seedDatabase();
await mongoose.disconnect();
console.log('[seed] DEMO DATA loaded. All demo accounts use the password Demo@1234');
