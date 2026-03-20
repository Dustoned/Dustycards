/**
 * Price snapshot service.
 * Records daily price snapshots per card so we can build price history charts.
 * Snapshots are stored in backend/src/data/price_snapshots.json
 *
 * Structure:
 * {
 *   snapshots: {
 *     "<pokewallet_card_id>": [
 *       { date: "2026-03-19", market: 45.00, low: 38.00, trend: null, source: "tcgplayer" },
 *       ...
 *     ]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOTS_PATH = path.join(__dirname, '../data/price_snapshots.json');
const MAX_SNAPSHOTS_PER_CARD = 365;

function ensureFile() {
  const dir = path.dirname(SNAPSHOTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SNAPSHOTS_PATH)) {
    fs.writeFileSync(SNAPSHOTS_PATH, JSON.stringify({ snapshots: {} }, null, 2), 'utf-8');
  }
}

function readSnapshots() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOTS_PATH, 'utf-8'));
  } catch {
    return { snapshots: {} };
  }
}

function writeSnapshots(data) {
  ensureFile();
  const tmp = SNAPSHOTS_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, SNAPSHOTS_PATH);
}

/**
 * Record a price snapshot for a card.
 * Only records one snapshot per card per day to avoid duplicates.
 * @param {string} pokewalletCardId
 * @param {Object} pricing - Normalized pricing object
 */
function recordSnapshot(pokewalletCardId, pricing) {
  if (!pokewalletCardId || !pricing) return;
  if (pricing.market == null && pricing.low == null) return; // nothing to record

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const data = readSnapshots();

  if (!data.snapshots[pokewalletCardId]) {
    data.snapshots[pokewalletCardId] = [];
  }

  const existing = data.snapshots[pokewalletCardId];

  // Check if we already have a snapshot for today
  const alreadyToday = existing.some((s) => s.date === today);
  if (alreadyToday) return;

  const snapshot = {
    date: today,
    market: pricing.market ?? null,
    low: pricing.low ?? null,
    mid: pricing.mid ?? null,
    trend: pricing.trend ?? null,
    avg7: pricing.avg7 ?? null,
    avg30: pricing.avg30 ?? null,
    source: pricing.source || 'unknown',
  };

  existing.push(snapshot);

  // Keep only the most recent MAX_SNAPSHOTS_PER_CARD entries
  if (existing.length > MAX_SNAPSHOTS_PER_CARD) {
    existing.splice(0, existing.length - MAX_SNAPSHOTS_PER_CARD);
  }

  writeSnapshots(data);
}

/**
 * Get price history for a specific card.
 * @param {string} pokewalletCardId
 * @returns {Array} Array of { date, market, low, trend, source }
 */
function getHistory(pokewalletCardId) {
  if (!pokewalletCardId) return [];
  const data = readSnapshots();
  return data.snapshots[pokewalletCardId] || [];
}

/**
 * Record snapshots for multiple cards at once.
 * @param {Array<{ pokewallet_card_id: string, pricing: Object }>} items
 */
function recordBatch(items) {
  if (!items || items.length === 0) return;

  const today = new Date().toISOString().split('T')[0];
  const data = readSnapshots();
  let changed = false;

  for (const item of items) {
    const { pokewallet_card_id, pricing } = item;
    if (!pokewallet_card_id || !pricing) continue;
    if (pricing.market == null && pricing.low == null) continue;

    if (!data.snapshots[pokewallet_card_id]) {
      data.snapshots[pokewallet_card_id] = [];
    }

    const existing = data.snapshots[pokewallet_card_id];
    const alreadyToday = existing.some((s) => s.date === today);
    if (alreadyToday) continue;

    existing.push({
      date: today,
      market: pricing.market ?? null,
      low: pricing.low ?? null,
      mid: pricing.mid ?? null,
      trend: pricing.trend ?? null,
      avg7: pricing.avg7 ?? null,
      avg30: pricing.avg30 ?? null,
      source: pricing.source || 'unknown',
    });

    if (existing.length > MAX_SNAPSHOTS_PER_CARD) {
      existing.splice(0, existing.length - MAX_SNAPSHOTS_PER_CARD);
    }

    changed = true;
  }

  if (changed) writeSnapshots(data);
}

module.exports = { recordSnapshot, recordBatch, getHistory };
