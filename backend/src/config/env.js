import 'dotenv/config';

const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing required environment variable ${name}. Copy backend/.env.example to backend/.env and fill it in.`);
  return v;
};

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  aiServiceUrl: process.env.AI_SERVICE_URL || '',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  dailyCheckCron: process.env.DAILY_CHECK_CRON || '0 7 * * *',
  nodeEnv: process.env.NODE_ENV || 'development',
};
export const requireEnv = () => {
  required('MONGO_URI', env.mongoUri);
  required('JWT_SECRET', env.jwtSecret);
  if (env.jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters long.');
};
