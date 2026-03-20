const express = require('express');
const { getSets } = require('../services/pokewallet');

const router = express.Router();

/**
 * GET /api/sets
 * Returns all TCG sets from PokéWallet API (cached 1hr).
 */
router.get('/', async (req, res, next) => {
  try {
    const sets = await getSets();

    // Sort sets by release date descending if that field exists
    const sorted = [...sets].sort((a, b) => {
      const dateA = new Date(a.release_date || a.releaseDate || 0);
      const dateB = new Date(b.release_date || b.releaseDate || 0);
      return dateB - dateA;
    });

    res.json({ sets: sorted, total: sorted.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
