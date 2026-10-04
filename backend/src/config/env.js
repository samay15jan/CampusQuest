// Loads .env and exposes one typed config object.
import 'dotenv/config';

const str = (v, d = '') => (v === undefined || v === '' ? d : String(v));
const num = (v, d = null) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

// Private keys arrive with literal "\n" in .env / Docker; restore real line breaks.
const normalizeKey = (v) => (v ? v.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n') : '');

const NODE_ENV = str(process.env.NODE_ENV, 'development');
const isProd = NODE_ENV === 'production';

export const env = {
  NODE_ENV,
  isProd,
  PORT: num(process.env.PORT, 3000),
  CORS_ORIGIN: str(process.env.CORS_ORIGIN).split(',').map((s) => s.trim()).filter(Boolean),

  DB_HOST: str(process.env.DB_HOST, 'localhost'),
  DB_PORT: num(process.env.DB_PORT, 5432),
  DB_NAME: str(process.env.DB_NAME, 'campusquest'),
  DB_USER: str(process.env.DB_USER, 'campus'),
  DB_PASSWORD: str(process.env.DB_PASSWORD, 'campus123'),

  FIREBASE_PROJECT_ID: str(process.env.FIREBASE_PROJECT_ID),
  FIREBASE_CLIENT_EMAIL: str(process.env.FIREBASE_CLIENT_EMAIL),
  FIREBASE_PRIVATE_KEY: normalizeKey(process.env.FIREBASE_PRIVATE_KEY),

  ADMIN_API_KEY: str(process.env.ADMIN_API_KEY),

  CAMPUS_TZ: str(process.env.CAMPUS_TZ, 'Asia/Kolkata'),
  PORTAL_WINDOWS: str(process.env.PORTAL_WINDOWS, '09:00-12:30,14:00-17:00'),

  IMAGE_MATCHER: str(process.env.IMAGE_MATCHER, 'mock'),
  IMAGE_MATCHER_URL: str(process.env.IMAGE_MATCHER_URL),
  MATCHER_MOCK_SIMILARITY: num(process.env.MATCHER_MOCK_SIMILARITY, 0.72),
  IMAGE_MATCH_THRESHOLD: num(process.env.IMAGE_MATCH_THRESHOLD, 0.7),
  DEPLOY_RANGE_M: num(process.env.DEPLOY_RANGE_M),
  ATTACK_RANGE_M: num(process.env.ATTACK_RANGE_M),

  UPLOAD_DIR: str(process.env.UPLOAD_DIR, './uploads'),

  // Dev switches: hard-disabled in production.
  DEV_AUTH_BYPASS: !isProd && bool(process.env.DEV_AUTH_BYPASS),
  DEV_IGNORE_HOURS: !isProd && bool(process.env.DEV_IGNORE_HOURS),
};

if (isProd && (bool(process.env.DEV_AUTH_BYPASS) || bool(process.env.DEV_IGNORE_HOURS))) {
  throw new Error('DEV_AUTH_BYPASS / DEV_IGNORE_HOURS must not be set in production');
}
