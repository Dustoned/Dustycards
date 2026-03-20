const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_PATH = path.join(__dirname, '../data/settings.json');

const DEFAULT_SETTINGS = {
  priceSource: 'cardmarket',  // 'tcgplayer' | 'cardmarket'
  priceType: 'low',           // 'market' | 'low' | 'mid' | 'trend'
  currency: 'EUR',            // 'USD' | 'EUR' | 'GBP'
  cardSize: 'xl',             // 'sm' | 'md' | 'lg' | 'xl'
  theme: 'dark',              // 'dark' (only dark is supported right now)
  defaultCondition: 'Near Mint',
  defaultLanguage: 'EN',
};

function normalizeConditionCode(condition) {
  const map = {
    MINT: 'Mint',
    Mint: 'Mint',
    NM: 'Near Mint',
    'Near Mint': 'Near Mint',
    EX: 'Excellent',
    Excellent: 'Excellent',
    GD: 'Good',
    MP: 'Good',
    Good: 'Good',
    LP: 'Light Played',
    'Light Played': 'Light Played',
    HP: 'Played',
    Played: 'Played',
    DMG: 'Poor',
    Poor: 'Poor',
  };
  return map[condition] || condition;
}

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
}

function readSettings() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  settings.defaultCondition = normalizeConditionCode(settings.defaultCondition) || 'Near Mint';
  return settings;
}

function writeSettings(data) {
  ensureDataFile();
  const tmp = DATA_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_PATH);
}

/**
 * GET /api/settings
 */
router.get('/', (req, res, next) => {
  try {
    const settings = readSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/settings
 */
router.patch('/', (req, res, next) => {
  try {
    const body = req.body;
    const current = readSettings();

    const allowed = [
      'priceSource', 'priceType', 'currency', 'cardSize', 'theme',
      'defaultCondition', 'defaultLanguage',
    ];

    const updated = { ...current };
    for (const key of allowed) {
      if (key in body) {
        updated[key] = body[key];
      }
    }

    // Validate
    const validSources = ['tcgplayer', 'cardmarket'];
    if (!validSources.includes(updated.priceSource)) {
      return res.status(400).json({ error: `priceSource must be one of: ${validSources.join(', ')}` });
    }
    const validTypes = ['market', 'low', 'mid', 'trend'];
    if (!validTypes.includes(updated.priceType)) {
      return res.status(400).json({ error: `priceType must be one of: ${validTypes.join(', ')}` });
    }
    const validSizes = ['sm', 'md', 'lg', 'xl'];
    if (!validSizes.includes(updated.cardSize)) {
      return res.status(400).json({ error: `cardSize must be one of: ${validSizes.join(', ')}` });
    }
    const validConditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];
    updated.defaultCondition = normalizeConditionCode(updated.defaultCondition) || 'Near Mint';
    if (!validConditions.includes(updated.defaultCondition)) {
      return res.status(400).json({ error: `defaultCondition must be one of: ${validConditions.join(', ')}` });
    }

    writeSettings(updated);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
