const express = require('express');
const cors = require('cors');
const { PORT, FRONTEND_DIR, CORS_ORIGIN } = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(FRONTEND_DIR));

// API Routes
app.use('/', apiRoutes);

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error?.message || error);
});

process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error?.message || error);
});

// Start server
app.listen(PORT, () => {
  console.log(`Email backend running on port ${PORT}`);
});

