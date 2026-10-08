import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { todayISO } from './domain/date.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import procedureTypeRoutes from './routes/procedureTypes.js';
import procedureRoutes from './routes/procedures.js';
import readinessRoutes from './routes/readiness.js';
import recoveryRoutes from './routes/recovery.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import fileRoutes from './routes/files.js';

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientUrl.split(',').map((s) => s.trim()), credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', today: todayISO(), time: new Date().toISOString() } }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/procedure-types', procedureTypeRoutes);
  app.use('/api/procedures', procedureRoutes);
  app.use('/api/readiness', readinessRoutes);
  app.use('/api/recovery', recoveryRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api', adminRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
