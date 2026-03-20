const express = require('express');
const { checkHealth } = require('../services/pokewallet');
const { cache } = require('../services/cache');

const router = express.Router();

/**
 * GET /api/health
 * Returns backend status and upstream API status.
 */
router.get('/', async (req, res) => {
  const upstreamStatus = { status: 'unknown', latency: null };

  try {
    const start = Date.now();
    await checkHealth();
    upstreamStatus.status = 'ok';
    upstreamStatus.latency = Date.now() - start;
  } catch (err) {
    upstreamStatus.status = 'error';
    upstreamStatus.error = err.message;
  }

  res.json({
    status: 'ok',
    service: 'DustyCards Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: {
      entries: cache.size(),
    },
    upstream: upstreamStatus,
  });
});

module.exports = router;
