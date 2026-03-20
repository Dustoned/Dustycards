const { classifyCard } = require('./classify');

const BACKEND_BASE = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Normalize TCGPlayer prices into unified format.
 * @param {Array|null} tcgPrices
 */
function normalizeTcgPrice(tcgPrices) {
  if (!Array.isArray(tcgPrices) || tcgPrices.length === 0) {
    return { market: null, low: null, mid: null, high: null, trend: null, avg1: null, avg7: null, avg30: null, source: 'tcgplayer', variant: null, all_variants: [] };
  }

  const entry =
    tcgPrices.find((e) => (e.sub_type_name || '').toLowerCase() === 'normal') ||
    tcgPrices[0];

  return {
    market: parseFloat(entry.market_price) || null,
    low: parseFloat(entry.low_price) || null,
    mid: parseFloat(entry.mid_price) || null,
    high: parseFloat(entry.high_price) || null,
    trend: null,
    avg1: null,
    avg7: null,
    avg30: null,
    source: 'tcgplayer',
    variant: entry.sub_type_name || null,
    all_variants: tcgPrices.map((e) => ({
      name: e.sub_type_name || 'Normal',
      market: parseFloat(e.market_price) || null,
      low: parseFloat(e.low_price) || null,
      mid: parseFloat(e.mid_price) || null,
    })),
  };
}

/**
 * Normalize CardMarket prices into unified format.
 * @param {Array|null} cmPrices
 */
function normalizeCmPrice(cmPrices) {
  if (!Array.isArray(cmPrices) || cmPrices.length === 0) {
    return { market: null, low: null, mid: null, high: null, trend: null, avg1: null, avg7: null, avg30: null, source: 'cardmarket', variant: null, all_variants: [] };
  }

  const entry =
    cmPrices.find((e) => (e.variant_type || '').toLowerCase() === 'normal') ||
    cmPrices[0];

  // Use trend as market price — it's based on actual sales and excludes
  // outliers like non-English cards or poor condition listings.
  // avg/low include ALL listings regardless of language or condition.
  const trend = parseFloat(entry.trend) || null;
  const avg7 = parseFloat(entry.avg7) || null;
  const avg30 = parseFloat(entry.avg30) || null;
  const market = trend ?? avg7 ?? avg30 ?? parseFloat(entry.avg) ?? null;

  return {
    market,
    low: parseFloat(entry.low) || null,
    mid: null,
    high: null,
    trend,
    avg1: parseFloat(entry.avg1) || null,
    avg7,
    avg30,
    source: 'cardmarket',
    variant: entry.variant_type || null,
    all_variants: cmPrices.map((e) => ({
      name: e.variant_type || 'Normal',
      market: parseFloat(e.avg) || null,
      low: parseFloat(e.low) || null,
      trend: parseFloat(e.trend) || null,
    })),
  };
}

/**
 * Normalize a raw PokéWallet API response into the app's unified card format.
 *
 * @param {Object} rawCard - Raw card from PokéWallet API
 * @param {string} priceSource - 'tcgplayer' | 'cardmarket'
 * @returns {Object|null}
 */
function normalizeCard(rawCard, priceSource = 'tcgplayer') {
  if (!rawCard) return null;

  const id = rawCard.id || rawCard.card_id || rawCard._id || '';
  const info = rawCard.card_info || {};

  const name = info.name || info.clean_name || rawCard.name || '';
  const setName = info.set_name || rawCard.set_name || '';
  const setCode = info.set_code || info.set_id || rawCard.set_code || '';
  const number = info.card_number || info.number || rawCard.number || null;
  const rarity = info.rarity || rawCard.rarity || null;
  const artist = info.artist || rawCard.artist || null;
  const cardType = info.card_type || null;
  const hp = info.hp ? parseInt(info.hp) || null : null;
  const stage = info.stage || null;

  const imageUrl = id ? `${BACKEND_BASE}/api/images/${encodeURIComponent(id)}` : '';

  const tcgPrices = rawCard.tcgplayer?.prices || null;
  const cmPrices = rawCard.cardmarket?.prices || null;

  const tcgPricing = normalizeTcgPrice(tcgPrices);
  const cmPricing = normalizeCmPrice(cmPrices);

  // Pick preferred source. CardMarket mode never falls back to TCGPlayer —
  // if CM has no data the caller will show "—" instead of misleading TCG prices.
  let pricing;
  if (priceSource === 'cardmarket') {
    pricing = cmPricing;
  } else {
    pricing = tcgPricing.market != null ? tcgPricing : cmPricing;
  }

  const categoryHint = classifyCard(name);
  const variant = pricing.variant || rarity || null;
  const productType = rawCard.product_type || cardType || null;

  return {
    id,
    name,
    set_name: setName,
    set_code: setCode,
    number,
    image_url: imageUrl,
    category_hint: categoryHint,
    variant,
    product_type: productType,
    rarity,
    artist,
    card_type: cardType,
    hp,
    stage,
    tcgplayer_url: rawCard.tcgplayer?.url || null,
    pricing,
    raw: rawCard,
  };
}

module.exports = { normalizeCard, normalizeTcgPrice, normalizeCmPrice };
