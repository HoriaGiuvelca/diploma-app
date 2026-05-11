const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function generateFeedbackToken() {
  const { JWT_EXPIRY } = require('../config');
  return jwt.sign({ feedback: true }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyFeedbackToken(token) {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (_err) {
    return false;
  }
}

function requireFeedbackToken(req, res, next) {
  const { feedbackToken } = req.body;
  
  if (!feedbackToken || !verifyFeedbackToken(feedbackToken)) {
    return res.status(403).json({ error: 'Feedback token required or invalid' });
  }
  
  next();
}

module.exports = {
  generateFeedbackToken,
  verifyFeedbackToken,
  requireFeedbackToken
};
