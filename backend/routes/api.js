const express = require('express');
const path = require('path');
const PDFDocument = require('pdfkit');
const {
  ENABLE_FEEDBACK_GATE,
  ENABLE_EMAIL_FEATURE,
  ASSETS_DIR,
  DIPLOMA_IMAGE_FILE,
  INDEX_FILE
} = require('../config');
const { generateFeedbackToken, verifyFeedbackToken, requireFeedbackToken } = require('../middleware/auth');
const { loadFeedbackConfigFromSheets, saveFeedbackToSheets } = require('../services/googleSheets');
const { sendViaGmailApi } = require('../services/email');
const {
  isValidEmail,
  sanitizeFileName,
  buildSafeContentDisposition,
  getMissingGmailVars,
  ensureGmailConfigured,
  getMissingFeedbackVars,
  ensureFeedbackConfigured
} = require('../utils');

const router = express.Router();

// Serve index.html for root
router.get('/', (_req, res) => {
  res.sendFile(INDEX_FILE);
});

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Serve diploma image asset
router.get('/diploma-image', (_req, res) => {
  const imageFile = path.join(ASSETS_DIR, DIPLOMA_IMAGE_FILE);
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(imageFile, (err) => {
    if (err) {
      console.error('Error serving diploma image:', err);
      res.status(404).json({ error: 'Diploma image not found' });
    }
  });
});

// Get app configuration (feedback questions, feature flags)
router.get('/app-config', async (_req, res) => {
  try {
    const feedbackConfig = await loadFeedbackConfigFromSheets();
    res.status(200).json({
      enableEmailFeature: ENABLE_EMAIL_FEATURE,
      enableFeedbackGate: ENABLE_FEEDBACK_GATE,
      feedbackQuestions: feedbackConfig?.questions || []
    });
  } catch (error) {
    console.error('[app-config] error:', error?.message);
    res.status(200).json({
      enableEmailFeature: ENABLE_EMAIL_FEATURE,
      enableFeedbackGate: ENABLE_FEEDBACK_GATE,
      feedbackQuestions: []
    });
  }
});

// Submit feedback form
router.post('/submit-feedback', async (req, res) => {
  try {
    if (!ENABLE_FEEDBACK_GATE) {
      const token = generateFeedbackToken();
      return res.status(200).json({ ok: true, gateDisabled: true, token });
    }

    if (!ensureFeedbackConfigured()) {
      const missingVars = getMissingFeedbackVars();
      return res.status(500).json({
        ok: false,
        error: `Feedback is not configured. Missing env vars: ${missingVars.join(', ')}`
      });
    }

    const feedbackConfig = await loadFeedbackConfigFromSheets();
    if (!feedbackConfig || !feedbackConfig.questions || feedbackConfig.questions.length === 0) {
      return res.status(500).json({
        ok: false,
        error: 'Feedback configuration not found. Cannot validate responses.'
      });
    }

    const responses = req.body?.responses || {};
    const answers = [];

    // Validate each response against the config
    for (const question of feedbackConfig.questions) {
      const answer = String(responses[question.id] || '').trim();
      if (!answer) {
        return res.status(400).json({
          ok: false,
          error: `Missing response for ${question.id}.`
        });
      }

      if (!question.options.includes(answer)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid response for ${question.id}.`
        });
      }
      answers.push(answer);
    }

    // Save to Feedback sheet
    await saveFeedbackToSheets(answers);

    // Generate and return token
    const token = generateFeedbackToken();
    return res.status(200).json({ ok: true, token });
  } catch (error) {
    console.error('[submit-feedback] failed', {
      message: error?.message,
      status: error?.response?.status
    });

    return res.status(500).json({
      ok: false,
      error: 'Nu am putut salva feedback-ul. Incearca din nou.'
    });
  }
});

// Generate diploma PDF
router.post('/generate-diploma', async (req, res) => {
  try {
    if (ENABLE_FEEDBACK_GATE) {
      const token = String(req.body?.feedbackToken || '').trim();
      if (!token || !verifyFeedbackToken(token)) {
        return res.status(403).json({
          ok: false,
          error: 'Feedback not completed. Please submit feedback first.'
        });
      }
    }

    const name = String(req.body?.name || '').trim();
    const canvasImageBase64 = String(req.body?.canvasImageBase64 || '').trim();

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Missing name.' });
    }

    if (!canvasImageBase64) {
      return res.status(400).json({ ok: false, error: 'Missing canvas image.' });
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(canvasImageBase64.split(',')[1] || canvasImageBase64, 'base64');

    // Create PDF document
    const doc = new PDFDocument({
      size: [842, 595], // A4 landscape in points (297mm × 210mm)
      margin: 0
    });

    // Set response headers
    const safeName = sanitizeFileName(name) || 'Diploma';
    const fileName = `Diploma - ${safeName}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', buildSafeContentDisposition(fileName));

    // Pipe PDF to response
    doc.pipe(res);

    // Add canvas image to PDF (scaled to fit page)
    doc.image(imageBuffer, 0, 0, {
      width: 842,
      height: 595
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('[generate-diploma] failed', {
      message: error?.message
    });

    return res.status(500).json({
      ok: false,
      error: 'Nu am putut genera diploma. Incearca din nou.'
    });
  }
});

// Send diploma via email
router.post('/send-diploma-email', async (req, res) => {
  try {
    if (ENABLE_FEEDBACK_GATE) {
      const token = String(req.body?.feedbackToken || '').trim();
      if (!token || !verifyFeedbackToken(token)) {
        return res.status(403).json({
          ok: false,
          error: 'Feedback not completed. Please submit feedback first.'
        });
      }
    }

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

    const { GMAIL_SENDER_EMAIL, GMAIL_FROM_DISPLAY_NAME } = require('../config');
    const subject = `Diploma pentru ${name}`;
    const text = `Buna ziua ${name},\n\nAtașat găsiți diploma dvs.\n\nCu drag,\nEchipa Rotary Club Pitești Unity.`;
    await sendViaGmailApi({
      from: GMAIL_SENDER_EMAIL,
      to: email,
      subject,
      text,
      fileName,
      pdfBuffer,
      displayName: GMAIL_FROM_DISPLAY_NAME
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

module.exports = router;
