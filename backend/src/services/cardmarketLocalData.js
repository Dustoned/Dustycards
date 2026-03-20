const fs = require('fs');
const path = require('path');

const DEFAULT_PRODUCTS_SINGLES_PATH = 'C:/Users/Dustoned/Downloads/products_singles_6.json';
const DEFAULT_PRODUCTS_NONSINGLES_PATH = 'C:/Users/Dustoned/Downloads/products_nonsingles_6.json';
const DEFAULT_PRICE_GUIDE_PATH = 'C:/Users/Dustoned/Downloads/price_guide_6.json';

let cachedDataset = null;

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCardBaseName(name) {
  return normalizeText(
    String(name || '')
      .replace(/\s+-\s+\d+\/\d+\s*$/i, '')
      .replace(/\s+\((secret|illustration rare|special illustration rare|hyper rare|ultra rare)\)\s*$/i, '')
      .trim()
  );
}

function normalizeProductBaseName(name) {
  return normalizeText(String(name || '').replace(/\s*\[.*?\]\s*/g, ' ').trim());
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3);
}

function normalizeSetSearchName(setName) {
  return normalizeText(
    String(setName || '')
      .replace(/^[A-Z0-9]{1,6}\s*[:|-]\s*/i, '')
      .trim()
  );
}

function getDatasetPaths() {
  return {
    singlesPath: process.env.CARDMARKET_PRODUCTS_SINGLES_PATH || DEFAULT_PRODUCTS_SINGLES_PATH,
    nonSinglesPath: process.env.CARDMARKET_PRODUCTS_NONSINGLES_PATH || DEFAULT_PRODUCTS_NONSINGLES_PATH,
    priceGuidePath: process.env.CARDMARKET_PRICE_GUIDE_PATH || DEFAULT_PRICE_GUIDE_PATH,
  };
}

function loadDataset() {
  if (cachedDataset) return cachedDataset;

  const { singlesPath, nonSinglesPath, priceGuidePath } = getDatasetPaths();
  if (!fs.existsSync(singlesPath) || !fs.existsSync(nonSinglesPath) || !fs.existsSync(priceGuidePath)) {
    cachedDataset = null;
    return null;
  }

  const singles = readJson(singlesPath).products || [];
  const nonSingles = readJson(nonSinglesPath).products || [];
  const priceGuides = readJson(priceGuidePath).priceGuides || [];

  const guideByProductId = new Map(priceGuides.map((guide) => [guide.idProduct, guide]));
  const productsByExpansion = new Map();

  for (const product of [...singles, ...nonSingles]) {
    if (!productsByExpansion.has(product.idExpansion)) {
      productsByExpansion.set(product.idExpansion, []);
    }
    productsByExpansion.get(product.idExpansion).push(product);
  }

  cachedDataset = {
    singles,
    nonSingles,
    guideByProductId,
    productsByExpansion,
  };
  return cachedDataset;
}

function titleCase(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cleanExpansionCandidate(name) {
  return normalizeText(
    String(name || '')
      .replace(/\b(elite trainer boxes|elite trainer box|booster boxes|booster box|booster bundles|booster bundle|super premium collections|super premium collection|ultra premium collections|ultra premium collection|premium collections|premium collection|tech sticker collections|tech sticker collection|binder collections|binder collection|poster collections|poster collection|mini tins|mini tin|tins|tin|boosters|booster|displays|display|blisters|blister|box sets|box set|boxes|box|collections|collection)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function inferExpansionDisplayName(products, expansionId) {
  const sourceProducts = products.some((product) => product.categoryName !== 'Pokémon Single')
    ? products.filter((product) => product.categoryName !== 'Pokémon Single')
    : products;
  const ranked = new Map();

  for (const product of sourceProducts) {
    const candidate = cleanExpansionCandidate(product.name);
    if (!candidate) continue;
    const tokens = candidate.split(' ').filter(Boolean);
    const limited = tokens.slice(0, 4).join(' ').trim();
    if (!limited) continue;
    ranked.set(limited, (ranked.get(limited) || 0) + 1);
  }

  const best = [...ranked.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return b[0].length - a[0].length;
    })[0]?.[0];

  return best ? titleCase(best) : `Expansion ${expansionId}`;
}

function inferExpansionIds(setName) {
  const dataset = loadDataset();
  const normalizedSet = normalizeSetSearchName(setName);
  if (!dataset || !normalizedSet) return [];

  const counts = new Map();
  for (const product of dataset.nonSingles) {
    const productName = normalizeText(product.name);
    if (!productName.includes(normalizedSet)) continue;
    counts.set(product.idExpansion, (counts.get(product.idExpansion) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([idExpansion]) => idExpansion);
}

function scoreCandidate(product, item, referenceTrend, expectedExpansionIds) {
  const itemBaseName = normalizeCardBaseName(item.name);
  const productBaseName = normalizeProductBaseName(product.name);
  const itemTokens = tokenize(itemBaseName);
  const productTokens = tokenize(productBaseName);

  let score = 0;

  if (productBaseName === itemBaseName) score += 2000;
  else if (productBaseName.startsWith(itemBaseName)) score += 1200;
  else if (productBaseName.includes(itemBaseName)) score += 700;

  for (const token of itemTokens) {
    if (productTokens.includes(token)) score += 120;
  }

  if (item.category === 'sealed') {
    const setTokens = tokenize(item.set_name);
    for (const token of setTokens) {
      if (productTokens.includes(token)) score += 50;
    }
  }

  if (expectedExpansionIds.length > 0) {
    const expansionIndex = expectedExpansionIds.indexOf(product.idExpansion);
    if (expansionIndex === 0) score += 1500;
    else if (expansionIndex > 0) score += Math.max(400, 1200 - expansionIndex * 150);
    else score -= 250;
  }

  if (referenceTrend != null) {
    const guide = loadDataset()?.guideByProductId.get(product.idProduct);
    const candidateTrend = guide?.trend ?? null;
    if (candidateTrend != null && candidateTrend > 0) {
      const diffRatio = Math.abs(candidateTrend - referenceTrend) / Math.max(referenceTrend, 1);
      score += Math.max(0, 500 - diffRatio * 500);
    }
  }

  if (product.dateAdded && product.dateAdded !== '0000-00-00 00:00:00') {
    score += 10;
  }

  return score;
}

function guideToPricing(guide, category) {
  if (!guide) return null;

  const market = guide.trend ?? guide.avg7 ?? guide.avg30 ?? guide.avg ?? null;
  return {
    market,
    low: category === 'sealed' ? guide.low ?? null : null,
    mid: null,
    high: null,
    trend: guide.trend ?? null,
    avg1: guide.avg1 ?? null,
    avg7: guide.avg7 ?? null,
    avg30: guide.avg30 ?? null,
    source: 'cardmarket',
    variant: null,
    all_variants: [],
    _localGuideLow: guide.low ?? null,
    _localGuideProductId: guide.idProduct ?? null,
  };
}

function findLocalCardmarketPricing(item, normalizedCard) {
  const dataset = loadDataset();
  if (!dataset || !item?.name) return null;

  const products = item.category === 'sealed' ? dataset.nonSingles : dataset.singles;
  const itemBaseName = normalizeCardBaseName(item.name);
  if (!itemBaseName) return null;

  const referenceTrend = normalizedCard?.pricing?.trend ?? normalizedCard?.pricing?.market ?? null;
  const expectedExpansionIds = inferExpansionIds(item.set_name);

  const candidates = products.filter((product) => {
    const productBaseName = normalizeProductBaseName(product.name);
    if (!productBaseName) return false;

    if (item.category === 'sealed') {
      return productBaseName.includes(itemBaseName) || itemBaseName.includes(productBaseName);
    }

    return (
      productBaseName === itemBaseName ||
      productBaseName.startsWith(itemBaseName) ||
      itemBaseName.startsWith(productBaseName)
    );
  });

  if (candidates.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, item, referenceTrend, expectedExpansionIds);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  if (!best) return null;

  const guide = dataset.guideByProductId.get(best.idProduct);
  if (!guide) return null;

  return {
    product: best,
    guide,
    pricing: guideToPricing(guide, item.category),
  };
}

function toExpansionSummary(expansionId, products, guideByProductId) {
  const singles = products.filter((product) => product.categoryName === 'Pokémon Single');
  const sealed = products.filter((product) => product.categoryName !== 'Pokémon Single');
  const pricedProducts = products
    .map((product) => guideByProductId.get(product.idProduct))
    .filter(Boolean);

  const latestTrend = pricedProducts
    .map((guide) => guide.trend ?? guide.avg7 ?? guide.avg30 ?? guide.avg ?? null)
    .find((value) => value != null);

  return {
    idExpansion: expansionId,
    name: inferExpansionDisplayName(products, expansionId),
    totalProducts: products.length,
    totalSingles: singles.length,
    totalSealed: sealed.length,
    latestTrend: latestTrend ?? null,
  };
}

function listLocalExpansions(query = '') {
  const dataset = loadDataset();
  if (!dataset) return [];

  const normalizedQuery = normalizeText(query);
  const summaries = [...dataset.productsByExpansion.entries()]
    .map(([expansionId, products]) => toExpansionSummary(expansionId, products, dataset.guideByProductId))
    .filter((expansion) => !normalizedQuery || normalizeText(expansion.name).includes(normalizedQuery))
    .sort((a, b) => {
      if (b.totalProducts !== a.totalProducts) return b.totalProducts - a.totalProducts;
      return a.name.localeCompare(b.name);
    });

  return summaries;
}

function getLocalExpansion(expansionId, { query = '', category = 'all' } = {}) {
  const dataset = loadDataset();
  if (!dataset) return null;

  const products = dataset.productsByExpansion.get(Number(expansionId));
  if (!products || products.length === 0) return null;

  const normalizedQuery = normalizeText(query);
  const summary = toExpansionSummary(Number(expansionId), products, dataset.guideByProductId);

  const items = products
    .filter((product) => {
      const kind = product.categoryName === 'Pokémon Single' ? 'single' : 'sealed';
      if (category !== 'all' && kind !== category) return false;
      if (!normalizedQuery) return true;
      return normalizeText(product.name).includes(normalizedQuery);
    })
    .map((product) => {
      const guide = dataset.guideByProductId.get(product.idProduct);
      const kind = product.categoryName === 'Pokémon Single' ? 'single' : 'sealed';
      return {
        idProduct: product.idProduct,
        idExpansion: product.idExpansion,
        name: product.name,
        category: kind,
        categoryName: product.categoryName,
        pricing: guideToPricing(guide, kind),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...summary,
    items,
    total: items.length,
  };
}

function getLocalExpansionProduct(expansionId, productId) {
  const expansion = getLocalExpansion(expansionId, { category: 'all' });
  if (!expansion) return null;
  return expansion.items.find((item) => Number(item.idProduct) === Number(productId)) || null;
}

module.exports = {
  findLocalCardmarketPricing,
  listLocalExpansions,
  getLocalExpansion,
  getLocalExpansionProduct,
};
