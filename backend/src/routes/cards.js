const express = require('express');
const fs = require('fs');
const path = require('path');
const { searchCards, getCard } = require('../services/pokewallet');
const { normalizeCard } = require('../utils/normalize');

const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');

function getPreferredPriceSource() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw).priceSource || 'cardmarket';
  } catch {
    return 'cardmarket';
  }
}

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreSearchResult(card, query) {
  const q = normalizeSearchText(query);
  const name = normalizeSearchText(card.name);
  const setName = normalizeSearchText(card.set_name);
  const number = normalizeSearchText(card.number);

  if (!q) return 0;

  let score = 0;

  if (name === q) score += 1000;
  if (name.startsWith(`${q} `) || name.startsWith(`${q}-`)) score += 700;
  if (name.includes(q)) score += 400;

  const queryTokens = q.split(' ').filter(Boolean);
  for (const token of queryTokens) {
    if (name === token) score += 500;
    else if (name.startsWith(`${token} `) || name.startsWith(`${token}-`)) score += 250;
    else if (name.includes(token)) score += 100;

    if (setName.includes(token)) score -= 15;
    if (number === token) score += 50;
  }

  if (setName.includes(q) && !name.includes(q)) score -= 120;

  return score;
}

const router = express.Router();

/**
 * GET /api/cards/search?q=&category=
 * Search for cards. Optional category filter: "single" | "sealed" | "all"
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, category = 'all' } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    const priceSource = getPreferredPriceSource();
    const rawResults = await searchCards(q);
    const normalized = rawResults.map((c) => normalizeCard(c, priceSource)).filter(Boolean);

    // Apply category filter
    let filtered = normalized;
    if (category === 'single') {
      filtered = normalized.filter((c) => c.category_hint === 'single');
    } else if (category === 'sealed') {
      filtered = normalized.filter((c) => c.category_hint === 'sealed');
    }

    filtered.sort((a, b) => {
      const scoreDiff = scoreSearchResult(b, q) - scoreSearchResult(a, q);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Limit to 10 results to conserve API credits
    const limited = filtered.slice(0, 10);

    res.json({
      results: limited,
      total: limited.length,
      query: q,
      category,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cards/:id
 * Get a single card by its PokéWallet ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Card ID is required.' });
    }

    const rawCard = await getCard(id);
    const normalized = normalizeCard(rawCard, getPreferredPriceSource());

    if (!normalized) {
      return res.status(404).json({ error: 'Card not found.' });
    }

    res.json(normalized);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
