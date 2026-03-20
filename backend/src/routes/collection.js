const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getCard } = require('../services/pokewallet');
const { normalizeCard } = require('../utils/normalize');
const { classifyCard } = require('../utils/classify');
const { recordBatch, getHistory } = require('../services/priceHistory');
const {
  getScrapedPrice,
  scheduleScrape,
  scrapeAndCacheNow,
  resolveProductUrlNow,
  getResolvedProductUrl,
} = require('../services/cardmarketScraper');
const { findLocalCardmarketPricing } = require('../services/cardmarketLocalData');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '../data/collection.json');
const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');

function getPreferredPriceSource() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw).priceSource || 'cardmarket';
  } catch {
    return 'cardmarket';
  }
}

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

function normalizeCategory(category, name) {
  if (classifyCard(name) === 'sealed') return 'sealed';
  return category || 'single';
}

function isSingleCardmarketUrl(productUrl) {
  return typeof productUrl === 'string' && productUrl.includes('/Products/Singles/');
}

function emptyCardmarketPricing() {
  return {
    market: null,
    low: null,
    mid: null,
    high: null,
    trend: null,
    avg1: null,
    avg7: null,
    avg30: null,
    source: 'cardmarket',
    variant: null,
    all_variants: [],
  };
}

function sanitizeCardmarketPricing(pricing, { keepMarket = true } = {}) {
  if (!pricing) return emptyCardmarketPricing();
  return {
    ...pricing,
    market: keepMarket ? pricing.market ?? null : null,
    low: null,
    mid: null,
    high: null,
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ items: [] }, null, 2), 'utf-8');
  }
}

function readCollection() {
  ensureDataFile();
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  data.items = (data.items || []).map((item) => ({
    ...item,
    condition: normalizeConditionCode(item.condition) || item.condition,
    category: normalizeCategory(item.category, item.name),
  }));
  return data;
}

function writeCollection(data) {
  ensureDataFile();
  const tmp = DATA_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_PATH);
}

function persistCardmarketUrl(itemId, productUrl) {
  if (!itemId || !productUrl) return;
  const collection = readCollection();
  const index = collection.items.findIndex((item) => item.id === itemId);
  if (index === -1) return;
  if (collection.items[index].cardmarket_url === productUrl) return;
  collection.items[index] = {
    ...collection.items[index],
    cardmarket_url: productUrl,
    updated_at: new Date().toISOString(),
  };
  writeCollection(collection);
}

// ---------------------------------------------------------------------------
// Price enrichment
// ---------------------------------------------------------------------------

/**
 * Fetch live pricing for a collection item from PokéWallet.
 * Returns null if no pokewallet_card_id or if the fetch fails.
 */
async function fetchLivePricing(item, priceSource = 'tcgplayer', preferFreshScrape = false) {
  if (!item.pokewallet_card_id) return null;
  try {
    const rawCard = await getCard(item.pokewallet_card_id);
    const normalized = normalizeCard(rawCard, priceSource);
    if (!normalized) return null;
    const isSealed = normalizeCategory(item.category, item.name) === 'sealed';
    const rawProductUrl = rawCard.cardmarket?.product_url || null;
    const resolvedProductUrl = getResolvedProductUrl(item.name, item.set_name, item.category);

    if (priceSource === 'cardmarket' && isSealed && !item.cardmarket_url && !resolvedProductUrl && isSingleCardmarketUrl(rawProductUrl)) {
      return emptyCardmarketPricing();
    }

    // For CardMarket: check persistent scrape cache for filtered EN/NM prices.
    // Use item.cardmarket_url as override if set (for cards PokéWallet lacks CM data for).
    // The actual scraping happens in the background via scheduleScrape().
    if (priceSource === 'cardmarket') {
      let productUrl = item.cardmarket_url || resolvedProductUrl || (isSealed ? null : rawProductUrl);
      if (!productUrl && preferFreshScrape) {
        productUrl = await resolveProductUrlNow({
          name: item.name,
          setName: item.set_name,
          category: item.category,
        });
      }
      if (productUrl && !item.cardmarket_url) {
        persistCardmarketUrl(item.id, productUrl);
      }
      const localGuideMatch = findLocalCardmarketPricing(item, normalized);
      const basePricing = isSealed
        ? (localGuideMatch?.pricing || emptyCardmarketPricing())
        : sanitizeCardmarketPricing(localGuideMatch?.pricing || normalized.pricing);
      let scraped = productUrl
        ? getScrapedPrice(productUrl, item.language || 'EN', item.condition || 'Near Mint')
        : null;
      if (!scraped && preferFreshScrape && productUrl) {
        scraped = await scrapeAndCacheNow(productUrl, item.language || 'EN', item.condition || 'Near Mint');
      }
      if (scraped) {
        return {
          ...basePricing,
          low:    scraped.low   ?? basePricing.low,
          trend:  scraped.trend ?? basePricing.trend,
          avg7:   scraped.avg7  ?? basePricing.avg7,
          avg30:  scraped.avg30 ?? basePricing.avg30,
          avg1:   scraped.avg1  ?? basePricing.avg1,
          market: scraped.trend ?? basePricing.market,
        };
      }
      return basePricing;
    }

    return normalized.pricing;
  } catch {
    return null;
  }
}

/**
 * Resolve CardMarket product URLs and schedule background scrapes.
 * Uses cached PokéWallet raw card data — no extra API calls.
 */
async function scheduleCardMarketScrapes(targets) {
  const scrapeTargets = [];
  for (const { pokewalletId, productUrl: overrideUrl, language, condition, category, name, setName } of targets) {
    try {
      let productUrl = overrideUrl || null;
      if (!productUrl && pokewalletId) {
        const rawCard = await getCard(pokewalletId); // hits in-memory cache
        productUrl = rawCard?.cardmarket?.product_url || null;
      }
      if (normalizeCategory(category, name) === 'sealed' && !overrideUrl && isSingleCardmarketUrl(productUrl)) {
        continue;
      }
      if (productUrl) {
        scrapeTargets.push({ productUrl, language, condition, name, setName, category });
      } else {
        scrapeTargets.push({ productUrl: null, language, condition, name, setName, category });
      }
    } catch { /* skip */ }
  }
  if (scrapeTargets.length > 0) scheduleScrape(scrapeTargets);
}

/**
 * Enrich a list of collection items with live pricing.
 * Runs fetches in parallel (cache means no extra API calls for repeated hits).
 */
async function enrichWithPricing(items, preferFreshScrape = false) {
  const priceSource = getPreferredPriceSource();
  const pricingResults = await Promise.all(
    items.map((item) => fetchLivePricing(item, priceSource, preferFreshScrape))
  );

  const enriched = items.map((item, i) => {
    const pricing = pricingResults[i];
    if (!pricing) return item;
    return { ...item, pricing };
  });

  // Record daily price snapshots in the background (don't block response)
  const snapshotInputs = enriched
    .filter((item) => item.pokewallet_card_id && item.pricing)
    .map((item) => ({ pokewallet_card_id: item.pokewallet_card_id, pricing: item.pricing }));

  setImmediate(() => {
    try { recordBatch(snapshotInputs); } catch { /* non-critical */ }
  });

  // For CardMarket source: schedule background scrape for filtered EN/NM prices
  if (priceSource === 'cardmarket') {
    const scrapeTargets = enriched
      .filter((item) => item.pokewallet_card_id)
      .map((item) => ({
        productUrl: item.cardmarket_url || null,
        pokewalletId: item.pokewallet_card_id,
        language: item.language || 'EN',
        condition: item.condition || 'Near Mint',
        category: item.category,
        name: item.name,
        setName: item.set_name,
      }));
    setImmediate(() => scheduleCardMarketScrapes(scrapeTargets).catch(() => {}));
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateItem(body) {
  if (!body.pokewallet_card_id && !body.name) {
    return 'Either pokewallet_card_id or name is required.';
  }
  if (body.quantity !== undefined && (isNaN(body.quantity) || body.quantity < 1)) {
    return 'quantity must be a positive integer.';
  }
  const validConditions = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor'];
  const normalizedCondition = normalizeConditionCode(body.condition);
  if (normalizedCondition && !validConditions.includes(normalizedCondition)) {
    return `condition must be one of: ${validConditions.join(', ')}`;
  }
  const validLanguages = ['EN', 'JP', 'DE', 'FR', 'ES', 'IT', 'PT', 'KO', 'ZH'];
  if (body.language && !validLanguages.includes(body.language)) {
    return `language must be one of: ${validLanguages.join(', ')}`;
  }
  const validCategories = ['single', 'sealed'];
  if (body.category && !validCategories.includes(body.category)) {
    return `category must be one of: ${validCategories.join(', ')}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/collection
 * Return all collection items enriched with live pricing.
 */
router.get('/', async (req, res, next) => {
  try {
    const { items } = readCollection();
    const { category, set_code, condition, language, sort } = req.query;

    let filtered = [...items];

    if (category && category !== 'all') {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (set_code) {
      filtered = filtered.filter((i) => i.set_code === set_code);
    }
    if (condition) {
      filtered = filtered.filter((i) => i.condition === condition);
    }
    if (language) {
      filtered = filtered.filter((i) => i.language === language);
    }

    // Sort before enrichment so we don't pay for enriching all then filtering
    if (sort) {
      switch (sort) {
        case 'name_asc':
          filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          break;
        case 'name_desc':
          filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
          break;
        case 'purchase_price_asc':
          filtered.sort((a, b) => (a.purchase_price || 0) - (b.purchase_price || 0));
          break;
        case 'purchase_price_desc':
          filtered.sort((a, b) => (b.purchase_price || 0) - (a.purchase_price || 0));
          break;
        case 'added_asc':
          filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          break;
        case 'added_desc':
        default:
          filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }
    } else {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // Enrich with live prices
    const enriched = await enrichWithPricing(filtered);

    res.json({ items: enriched, total: enriched.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/collection/:id/price-history
 * Return price history snapshots for a specific collection item.
 */
router.get('/:id/price-history', (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = readCollection();
    const item = items.find((i) => i.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Collection item not found.' });
    }

    if (!item.pokewallet_card_id) {
      return res.json({ history: [], message: 'No PokéWallet ID — price history unavailable.' });
    }

    const history = getHistory(item.pokewallet_card_id);
    res.json({ history, pokewallet_card_id: item.pokewallet_card_id });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/collection
 * Add a new item to the collection.
 */
router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const validationError = validateItem(body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const now = new Date().toISOString();
    const newItem = {
      id: uuidv4(),
      pokewallet_card_id: body.pokewallet_card_id || null,
      name: body.name || '',
      set_name: body.set_name || '',
      set_code: body.set_code || '',
      number: body.number || null,
      image_url: body.image_url || '',
      quantity: parseInt(body.quantity, 10) || 1,
      condition: body.condition || 'Near Mint',
      language: body.language || 'EN',
      purchase_price: parseFloat(body.purchase_price) || 0,
      purchase_date: body.purchase_date || now.split('T')[0],
      notes: body.notes || '',
      cardmarket_url: body.cardmarket_url || '',
      variant: body.variant || '',
      category: body.category || 'single',
      product_type: body.product_type || null,
      created_at: now,
      updated_at: now,
    };
    newItem.condition = normalizeConditionCode(newItem.condition) || 'Near Mint';
    newItem.category = normalizeCategory(newItem.category, newItem.name);

    const collection = readCollection();
    collection.items.push(newItem);
    writeCollection(collection);

    // Enrich the response with live pricing
    const [enriched] = await enrichWithPricing([newItem], true);
    res.status(201).json(enriched);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/collection/:id
 * Update a collection item by ID.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const collection = readCollection();
    const index = collection.items.findIndex((i) => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Collection item not found.' });
    }

    const validationError = validateItem({ ...collection.items[index], ...body });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const allowedFields = [
      'quantity', 'condition', 'language', 'purchase_price', 'purchase_date',
      'notes', 'variant', 'category', 'product_type', 'name', 'set_name',
      'set_code', 'number', 'image_url', 'cardmarket_url',
    ];

    const updated = { ...collection.items[index] };
    for (const field of allowedFields) {
      if (field in body) updated[field] = body[field];
    }
    if ('condition' in body) updated.condition = normalizeConditionCode(body.condition);
    updated.category = normalizeCategory(updated.category, updated.name);
    if ('quantity' in body) updated.quantity = parseInt(body.quantity, 10) || 1;
    if ('purchase_price' in body) updated.purchase_price = parseFloat(body.purchase_price) || 0;
    updated.updated_at = new Date().toISOString();

    collection.items[index] = updated;
    writeCollection(collection);

    const [enriched] = await enrichWithPricing([updated], true);
    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/collection/:id
 * Remove a collection item by ID.
 */
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const collection = readCollection();
    const index = collection.items.findIndex((i) => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Collection item not found.' });
    }

    const removed = collection.items.splice(index, 1)[0];
    writeCollection(collection);

    res.json({ message: 'Item removed from collection.', item: removed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
