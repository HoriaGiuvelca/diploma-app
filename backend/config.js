require('dotenv').config();

const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ENABLE_EMAIL_FEATURE = process.env.ENABLE_EMAIL_FEATURE !== 'false';
const ENABLE_FEEDBACK_GATE = process.env.ENABLE_FEEDBACK_GATE !== 'false';

// Gmail API settings
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL || '';
const GMAIL_FROM_DISPLAY_NAME = process.env.GMAIL_FROM_DISPLAY_NAME || 'Rotary Club Pitesti Unity';

// Google Sheets settings
const FEEDBACK_SHEET_ID = process.env.FEEDBACK_SHEET_ID || '';
const FEEDBACK_SHEET_NAME = process.env.FEEDBACK_SHEET_NAME || 'Feedback';
const CONFIG_SHEET_NAME = process.env.CONFIG_SHEET_NAME || 'Config';
const FEEDBACK_GOOGLE_CLIENT_EMAIL = process.env.FEEDBACK_GOOGLE_CLIENT_EMAIL || '';
const FEEDBACK_GOOGLE_PRIVATE_KEY = process.env.FEEDBACK_GOOGLE_PRIVATE_KEY || '';
const FEEDBACK_TIMEZONE = process.env.FEEDBACK_TIMEZONE || 'Europe/Bucharest';
const FEEDBACK_TIMESTAMP_FORMAT = process.env.FEEDBACK_TIMESTAMP_FORMAT || 'dd/mm/yyyy hh:mm';

// JWT settings
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// File paths
const DIPLOMA_IMAGE_FILE = process.env.DIPLOMA_IMAGE_FILE || 'diploma_final.jpg';
const FRONTEND_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(FRONTEND_DIR, 'assets');
const INDEX_FILE = path.join(FRONTEND_DIR, 'index.html');

// Cache settings
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// CORS settings
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

module.exports = {
  PORT,
  ENABLE_EMAIL_FEATURE,
  ENABLE_FEEDBACK_GATE,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL,
  GMAIL_FROM_DISPLAY_NAME,
  FEEDBACK_SHEET_ID,
  FEEDBACK_SHEET_NAME,
  CONFIG_SHEET_NAME,
  FEEDBACK_GOOGLE_CLIENT_EMAIL,
  FEEDBACK_GOOGLE_PRIVATE_KEY,
  FEEDBACK_TIMEZONE,
  FEEDBACK_TIMESTAMP_FORMAT,
  JWT_SECRET,
  JWT_EXPIRY,
  DIPLOMA_IMAGE_FILE,
  FRONTEND_DIR,
  ASSETS_DIR,
  INDEX_FILE,
  CONFIG_CACHE_TTL,
  CORS_ORIGIN
};
