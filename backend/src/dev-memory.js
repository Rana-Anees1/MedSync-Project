/**
 * Zero-install development mode: starts an in-memory MongoDB, loads the DEMO DATA and runs the API.
 * Data is lost when the process stops. For persistent data use `npm run dev` with MONGO_URI.
 */
import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.JWT_SECRET ||= 'dev-memory-only-secret-change-me-123';
const mongod = await MongoMemoryServer.create();
const uri = mongod.getUri('medsync');
process.env.MONGO_URI = uri;
const { start } = await import('./server.js');
const { seedDatabase } = await import('./seed/seedData.js');
await start({ mongoUri: uri });
await seedDatabase();
console.log('[dev:memory] in-memory MongoDB ready with DEMO DATA. Sign in with any demo account (password Demo@1234).');
const stop = async () => { await mongod.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
