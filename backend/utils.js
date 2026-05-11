const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL,
  FEEDBACK_SHEET_ID,
  FEEDBACK_GOOGLE_CLIENT_EMAIL,
  FEEDBACK_GOOGLE_PRIVATE_KEY
} = require('./config');

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeFileName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSafeContentDisposition(fileName) {
  const cleaned = sanitizeFileName(fileName || 'Diploma.pdf') || 'Diploma.pdf';
  const asciiFallback = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/"/g, '');
  const fallback = asciiFallback || 'Diploma.pdf';
  const utf8Encoded = encodeURIComponent(cleaned);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${utf8Encoded}`;
}

function getMissingGmailVars() {
  const required = [
    ['GMAIL_CLIENT_ID', GMAIL_CLIENT_ID],
    ['GMAIL_CLIENT_SECRET', GMAIL_CLIENT_SECRET],
    ['GMAIL_REFRESH_TOKEN', GMAIL_REFRESH_TOKEN],
    ['GMAIL_SENDER_EMAIL', GMAIL_SENDER_EMAIL]
  ];

  return required.filter(([, value]) => !value).map(([key]) => key);
}

function ensureGmailConfigured() {
  return getMissingGmailVars().length === 0;
}

function getMissingFeedbackVars() {
  const required = [
    ['FEEDBACK_SHEET_ID', FEEDBACK_SHEET_ID],
    ['FEEDBACK_GOOGLE_CLIENT_EMAIL', FEEDBACK_GOOGLE_CLIENT_EMAIL],
    ['FEEDBACK_GOOGLE_PRIVATE_KEY', FEEDBACK_GOOGLE_PRIVATE_KEY]
  ];

  return required.filter(([, value]) => !value).map(([key]) => key);
}

function ensureFeedbackConfigured() {
  return getMissingFeedbackVars().length === 0;
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

module.exports = {
  isValidEmail,
  sanitizeFileName,
  buildSafeContentDisposition,
  getMissingGmailVars,
  ensureGmailConfigured,
  getMissingFeedbackVars,
  ensureFeedbackConfigured,
  normalizePrivateKey
};
