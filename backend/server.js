require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { apiClient } = require('./src/services/pokewallet');
const healthRouter = require('./src/routes/health');
const setsRouter = require('./src/routes/sets');
const cardsRouter = require('./src/routes/cards');
const expansionsRouter = require('./src/routes/expansions');
const collectionRouter = require('./src/routes/collection');
const settingsRouter = require('./src/routes/settings');
const { errorHandler } = require('./src/middleware/errorHandler');
const { requestLogger } = require('./src/middleware/logger');
const { refreshIfNeeded, startPeriodicRefresh, setOnRefreshComplete } = require('./src/services/cardmarketDataRefresh');
const { invalidateCache: invalidateCmCache } = require('./src/services/cardmarketLocalData');

const app = express();
const PORT = process.env.PORT || 3001;

// Core middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/sets', setsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/expansions', expansionsRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/settings', settingsRouter);

// Image proxy — streams PokéWallet images with auth header so browser img tags work
app.get('/api/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await apiClient.get(`/images/${id}`, {
      responseType: 'stream',
      timeout: 10000,
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    response.data.pipe(res);
  } catch (err) {
    // Return a 1x1 transparent PNG on failure so broken images don't error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(pixel);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler (must be last)
app.use(errorHandler);

// Wire up CardMarket data refresh → invalidate in-memory cache after download
setOnRefreshComplete(() => invalidateCmCache());

const server = app.listen(PORT, () => {
  console.log(`DustyCards backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (!process.env.POKEWALLET_API_KEY) {
    console.warn('WARNING: POKEWALLET_API_KEY is not set. API calls will fail.');
  }

  // Auto-refresh CardMarket price guide data on startup (non-blocking)
  refreshIfNeeded().catch((err) => {
    console.warn('[CM data] Startup refresh failed:', err.message);
  });
  startPeriodicRefresh();
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error('An old DustyCards backend is probably still running.');
    console.error(`Stop the old process or change PORT, then try again.`);
    process.exit(1);
  }

  console.error('Failed to start backend server.');
  console.error(err);
  process.exit(1);
});

module.exports = app;
