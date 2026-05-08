require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');

const app = express();

const PORT = Number(process.env.PORT) || 8080;
const ENABLE_EMAIL_FEATURE = process.env.ENABLE_EMAIL_FEATURE !== 'false';
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL || '';
const GMAIL_FROM = "Rotary Club Pitesti Unity <giuvelcah@gmail.com>"
const FRONTEND_DIR = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(FRONTEND_DIR, 'index.html');

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(FRONTEND_DIR));

app.get('/', (_req, res) => {
  res.sendFile(INDEX_FILE);
});

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeFileName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function buildRawEmail({ from, to, subject, text, fileName, pdfBuffer }) {
  const boundary = `rotary-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const normalizedFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    'MIME-Version: 1.0',
    `Subject: ${encodedSubject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${normalizedFileName}"`,
    `Content-Disposition: attachment; filename="${normalizedFileName}"`,
    'Content-Transfer-Encoding: base64',
    '',
    pdfBuffer.toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(message, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sendViaGmailApi({ from, to, subject, text, fileName, pdfBuffer }) {
  const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const raw = buildRawEmail({ from, to, subject, text, fileName, pdfBuffer });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error?.message || error);
});

process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error?.message || error);
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/app-config', (_req, res) => {
  res.status(200).json({
    enableEmailFeature: ENABLE_EMAIL_FEATURE
  });
});

app.post('/send-diploma-email', async (req, res) => {
  try {
    if (!ensureGmailConfigured()) {
      const missingVars = getMissingGmailVars();
      return res.status(500).json({
        ok: false,
        error: `Email is not configured. Missing env vars: ${missingVars.join(', ')}`
      });
    }

    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const fileName = sanitizeFileName(req.body?.fileName || `Diploma - ${name || 'participant'}.pdf`) || 'Diploma.pdf';
    const pdfBase64 = String(req.body?.pdfBase64 || '');

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Missing name.' });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email.' });
    }

    if (!pdfBase64) {
      return res.status(400).json({ ok: false, error: 'Missing PDF payload.' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (!pdfBuffer.length) {
      return res.status(400).json({ ok: false, error: 'Invalid PDF payload.' });
    }

    if (pdfBuffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'PDF payload too large.' });
    }

    const subject = `Diploma pentru ${name}`;
    const text = `Buna ziua ${name},\n\nAtașat găsiți diploma dvs.\n\nCu drag,\nEchipa Rotary Club Pitești Unity.`;
    await sendViaGmailApi({
      from: GMAIL_FROM,
      to: email,
      subject,
      text,
      fileName,
      pdfBuffer
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    const code = error?.code || 'UNKNOWN';
    const command = error?.command || 'UNKNOWN';
    console.error('[send-diploma-email] failed', {
      code,
      command,
      message: error?.message
    });

    let message = 'Nu s-a putut trimite email-ul.';
    if (code === 401 || code === '401' || error?.status === 401) {
      message = 'Autentificare Gmail API eșuată. Verificați credențialele Google.';
    } else if (error?.response?.status === 403) {
      message = 'Acces Gmail API refuzat. Verificați scope-ul si contul autorizat.';
    }

    return res.status(500).json({
      ok: false,
      error: message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Email backend running on port ${PORT}`);
});
