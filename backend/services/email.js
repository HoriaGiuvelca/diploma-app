const { google } = require('googleapis');
const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL,
  GMAIL_FROM_DISPLAY_NAME
} = require('../config');

function buildRawEmail({ from, to, subject, text, fileName, pdfBuffer, displayName }) {
  const boundary = `rotary-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const normalizedFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  
  // Format From header with display name: "Display Name <email@example.com>"
  const fromHeader = displayName ? `"${displayName}" <${from}>` : from;

  const message = [
    `From: ${fromHeader}`,
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

async function sendViaGmailApi({ from, to, subject, text, fileName, pdfBuffer, displayName }) {
  const oauth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const raw = buildRawEmail({ from, to, subject, text, fileName, pdfBuffer, displayName });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });
}

module.exports = {
  sendViaGmailApi
};
