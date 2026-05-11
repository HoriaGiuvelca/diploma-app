const { google } = require('googleapis');
const {
  FEEDBACK_SHEET_ID,
  FEEDBACK_SHEET_NAME,
  CONFIG_SHEET_NAME,
  FEEDBACK_GOOGLE_CLIENT_EMAIL,
  FEEDBACK_GOOGLE_PRIVATE_KEY,
  CONFIG_CACHE_TTL,
  FEEDBACK_TIMEZONE,
  FEEDBACK_TIMESTAMP_FORMAT
} = require('../config');
const { normalizePrivateKey } = require('../utils');

let cachedFeedbackConfig = null;
let cachedConfigTime = 0;

function normalizeLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function getSheetAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: FEEDBACK_GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(FEEDBACK_GOOGLE_PRIVATE_KEY)
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
}

async function loadFeedbackConfigFromSheets() {
  if (cachedFeedbackConfig && Date.now() - cachedConfigTime < CONFIG_CACHE_TTL) {
    return cachedFeedbackConfig;
  }

  try {
    const auth = await getSheetAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FEEDBACK_SHEET_ID,
      range: `${CONFIG_SHEET_NAME}!A:B`
    });

    const rows = response.data.values || [];
    const config = { questions: [] };

    // Parse rows: each question block starts with "Question N", followed by options
    let currentQuestion = null;
    for (let i = 0; i < rows.length; i++) {
      const [rawCell, rawValue] = rows[i] || ['', ''];
      const cell = String(rawCell || '').trim();
      const value = String(rawValue || '').trim();
      if (!cell || !value) continue;

      const normalizedCell = normalizeLabel(cell);
      const isQuestionLabel = normalizedCell.startsWith('question') || normalizedCell.startsWith('intrebare');
      const isOptionLabel = normalizedCell === 'option' || normalizedCell === 'optiune';

      if (isQuestionLabel) {
        if (currentQuestion) {
          config.questions.push(currentQuestion);
        }
        currentQuestion = {
          id: `q${config.questions.length + 1}`,
          text: value,
          options: []
        };
      } else if (isOptionLabel && currentQuestion) {
        currentQuestion.options.push(value);
      }
    }
    if (currentQuestion) {
      config.questions.push(currentQuestion);
    }

    cachedFeedbackConfig = config;
    cachedConfigTime = Date.now();
    return config;
  } catch (error) {
    console.error('[loadFeedbackConfigFromSheets] failed:', error?.message);
    return null;
  }
}

function getConfiguredTimestamp() {
  const date = new Date();
  let formatter;

  try {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: FEEDBACK_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (_err) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bucharest',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  const format = String(FEEDBACK_TIMESTAMP_FORMAT || 'dd/mm/yyyy hh:mm');
  return format
    .replace(/yyyy/g, values.year)
    .replace(/dd/g, values.day)
    .replace(/mm/g, values.month)
    .replace(/hh/g, values.hour)
    .replace(/HH/g, values.hour)
    .replace(/MM/g, values.minute);
}

function columnIndexToLetter(columnIndex) {
  let index = Number(columnIndex) || 1;
  let letters = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    index = Math.floor((index - 1) / 26);
  }
  return letters || 'A';
}

async function saveFeedbackToSheets(answers) {
  const normalizedAnswers = Array.isArray(answers)
    ? answers.map((answer) => String(answer || '').trim())
    : [];

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: FEEDBACK_GOOGLE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(FEEDBACK_GOOGLE_PRIVATE_KEY)
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const totalColumns = 1 + normalizedAnswers.length; // timestamp + answers
  const endColumn = columnIndexToLetter(totalColumns);

  await sheets.spreadsheets.values.append({
    spreadsheetId: FEEDBACK_SHEET_ID,
    range: `${FEEDBACK_SHEET_NAME}!A:${endColumn}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[getConfiguredTimestamp(), ...normalizedAnswers]]
    }
  });
}

module.exports = {
  loadFeedbackConfigFromSheets,
  saveFeedbackToSheets
};
