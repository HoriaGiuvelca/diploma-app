require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

const PORT = Number(process.env.PORT) || 8080;
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT) || 20000;
const SMTP_GREETING_TIMEOUT = Number(process.env.SMTP_GREETING_TIMEOUT) || 15000;
const SMTP_SOCKET_TIMEOUT = Number(process.env.SMTP_SOCKET_TIMEOUT) || 30000;
const SMTP_TLS_REJECT_UNAUTHORIZED = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';
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

function ensureSmtpConfigured() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM);
}

function createTransporter() {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT,
    greetingTimeout: SMTP_GREETING_TIMEOUT,
    socketTimeout: SMTP_SOCKET_TIMEOUT,
    tls: {
      rejectUnauthorized: SMTP_TLS_REJECT_UNAUTHORIZED,
      minVersion: 'TLSv1.2'
    },
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  transporter.on('error', (error) => {
    console.error('[SMTP transport error]', {
      code: error?.code,
      command: error?.command,
      message: error?.message
    });
  });

  return transporter;
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

app.post('/send-diploma-email', async (req, res) => {
  try {
    if (!ensureSmtpConfigured()) {
      return res.status(500).json({
        ok: false,
        error: 'SMTP is not configured. Set SMTP_* variables.'
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

    const transporter = createTransporter();
    await transporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: `Diploma pentru ${name}`,
      text: `Salut ${name},\n\nAtașat găsești diploma ta.\n\nCu drag,\nEchipa Rotary Club Pitești Unity.`,
      attachments: [
        {
          filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
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
    if (code === 'ECONNRESET' || code === 'ESOCKET' || code === 'ETIMEDOUT') {
      message = 'Eroare de conexiune SMTP. Contactați administratorul.';
    } else if (code === 'EAUTH') {
      message = 'Autentificare SMTP eșuată. Contactați administratorul.';
    }

    return res.status(500).json({
      ok: false,
      error: message
    });
  }
});

app.listen(PORT, () => {
  console.log(`SMTP backend running on port ${PORT}`);
});
