/**
 * CardMarket scraper using Puppeteer + existing Chrome installation.
 *
 * Architecture:
 * - pricing results are cached in cardmarket_cache.json
 * - product URLs can be auto-resolved from CardMarket search results
 * - collection loads read from cache first for fast responses
 */

const puppeteer = require('puppeteer-core');
const axios = require('axios').default;
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CACHE_PATH = path.join(__dirname, '../data/cardmarket_cache.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const RESOLVE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const CONDITION_MAP = {
  Mint: 1,
  'Near Mint': 2,
  Excellent: 3,
  Good: 4,
  'Light Played': 5,
  Played: 6,
  Poor: null,
  NM: 2,
  EX: 3,
  LP: 5,
  GD: 4,
  MP: 4,
  HP: 6,
  DMG: null,
};

const LANGUAGE_MAP = {
  EN: 1,
  FR: 2,
  DE: 3,
  IT: 4,
  ES: 5,
  ZH: 6,
  JP: 7,
  PT: 8,
  KO: 10,
};

let scrapeJobRunning = false;

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeCache(data) {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = CACHE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, CACHE_PATH);
  } catch (err) {
    console.warn('[CM scraper] Cache write failed:', err.message);
  }
}

function normalizeProductUrl(productUrl) {
  if (!productUrl) return '';
  try {
    const url = new URL(productUrl);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(productUrl).split('?')[0].split('#')[0].replace(/\/$/, '');
  }
}

function cacheKey(productUrl, language, condition) {
  const langCode = LANGUAGE_MAP[language] ?? 1;
  const condCode = Object.prototype.hasOwnProperty.call(CONDITION_MAP, condition)
    ? CONDITION_MAP[condition]
    : 2;
  return `${normalizeProductUrl(productUrl)}|${langCode}|${condCode ?? 'none'}`;
}

function resolveCacheKey(name, setName, category) {
  return `resolve|${String(category || '').toLowerCase()}|${String(name || '').toLowerCase()}|${String(setName || '').toLowerCase()}`;
}

function productResolveCacheKey(expansionId, productId) {
  return `resolve-product|${String(expansionId)}|${String(productId)}`;
}

function getCached(productUrl, language, condition, { allowStale = false } = {}) {
  const cache = readCache();
  const key = cacheKey(productUrl, language, condition);
  const entry = cache[key];
  if (!entry) return null;
  if (!allowStale && Date.now() - entry.ts > CACHE_TTL) return null;
  return entry.data;
}

function getResolvedProductUrl(name, setName, category) {
  const cache = readCache();
  const key = resolveCacheKey(name, setName, category);
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > RESOLVE_TTL) return null;
  return entry.data ?? null;
}

function getResolvedProductUrlByProduct(expansionId, productId) {
  const cache = readCache();
  const entry = cache[productResolveCacheKey(expansionId, productId)];
  if (!entry) return null;
  if (Date.now() - entry.ts > RESOLVE_TTL) return null;
  return entry.data ?? null;
}

function setResolvedProductUrl(name, setName, category, productUrl) {
  const cache = readCache();
  cache[resolveCacheKey(name, setName, category)] = {
    ts: Date.now(),
    data: productUrl ?? null,
  };
  writeCache(cache);
}

function setResolvedProductUrlByProduct(expansionId, productId, productUrl) {
  const cache = readCache();
  cache[productResolveCacheKey(expansionId, productId)] = {
    ts: Date.now(),
    data: productUrl ?? null,
  };
  writeCache(cache);
}

function parseEuroPrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/[€\s\u00a0]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(cleaned);
  return Number.isNaN(val) || val <= 0 ? null : val;
}

function normalizeSearchText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(pokemon|pokémon|cards|products|miscellaneous)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(str) {
  return normalizeSearchText(str)
    .split(' ')
    .filter((token) => token.length >= 3);
}

function scoreCandidate(candidate, name, setName, category) {
  const haystack = `${candidate.label} ${candidate.href}`;
  const normalizedHaystack = normalizeSearchText(haystack);
  const normalizedName = normalizeSearchText(name);
  const normalizedSet = normalizeSearchText(setName);
  const nameTokens = tokenize(name);
  const setTokens = tokenize(setName);

  let score = 0;

  if (category === 'sealed') {
    if (candidate.href.includes('/Products/Singles/')) return -Infinity;
    if (candidate.href.includes('/Products/Sealed-Products/')) score += 50;
  } else if (candidate.href.includes('/Products/Singles/')) {
    score += 50;
  }

  if (normalizedName && normalizedHaystack.includes(normalizedName)) score += 80;
  if (normalizedSet && normalizedHaystack.includes(normalizedSet)) score += 20;

  for (const token of nameTokens) {
    if (normalizedHaystack.includes(token)) score += 8;
  }
  for (const token of setTokens) {
    if (normalizedHaystack.includes(token)) score += 3;
  }

  if (category === 'sealed') {
    const sealedTerms = ['collection', 'premium', 'box', 'bundle', 'tin', 'upc', 'booster'];
    for (const term of sealedTerms) {
      if (normalizedHaystack.includes(term)) score += 4;
    }
  }

  return score;
}

function unwrapDuckDuckGoUrl(href) {
  try {
    const url = new URL(href.startsWith('http') ? href : `https:${href}`);
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : null;
  } catch {
    return null;
  }
}

async function resolveViaDuckDuckGo({ name, setName = '', category = 'single' }) {
  const query = `site:cardmarket.com Pokemon ${name} ${setName}`.trim();
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    timeout: 20000,
  });

  const $ = cheerio.load(response.data);
  const candidates = [];
  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const label = $(element).text().trim().replace(/\s+/g, ' ');
    const unwrapped = href ? unwrapDuckDuckGoUrl(href) : null;
    if (unwrapped && unwrapped.includes('cardmarket.com/')) {
      candidates.push({ href: unwrapped, label });
    }
  });

  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, name, setName, category);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return bestScore > 0 ? normalizeProductUrl(best.href) : null;
}

async function configurePage(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
}

async function resolveProductUrl(browser, { name, setName = '', category = 'single' }) {
  const cached = getResolvedProductUrl(name, setName, category);
  if (cached !== null) return cached;

  const query = [name, setName].filter(Boolean).join(' ').trim();
  if (!query) return null;

  const url = `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}`;
  const page = await browser.newPage();
  try {
    await configurePage(page);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1200));

    const candidates = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/Pokemon/Products/"]'));
      const seen = new Set();
      return anchors
        .map((anchor) => ({
          href: anchor.href || '',
          label: anchor.textContent.trim().replace(/\s+/g, ' '),
        }))
        .filter((candidate) => {
          if (!candidate.href || !candidate.label) return false;
          if (seen.has(candidate.href)) return false;
          seen.add(candidate.href);
          return true;
        });
    });

    let best = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const score = scoreCandidate(candidate, name, setName, category);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    let resolved = bestScore > 0 ? normalizeProductUrl(best.href) : null;
    if (!resolved || resolved.includes('/Products/Search')) {
      resolved = await resolveViaDuckDuckGo({ name, setName, category }).catch(() => null);
    }
    setResolvedProductUrl(name, setName, category, resolved);
    return resolved;
  } catch (err) {
    console.warn(`[CM scraper] Resolve failed for "${name}": ${err.message}`);
    const resolved = await resolveViaDuckDuckGo({ name, setName, category }).catch(() => null);
    setResolvedProductUrl(name, setName, category, resolved);
    return resolved;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeOne(browser, productUrl, language, condition) {
  const langCode = LANGUAGE_MAP[language] ?? 1;
  const condCode = Object.prototype.hasOwnProperty.call(CONDITION_MAP, condition)
    ? CONDITION_MAP[condition]
    : 2;

  const url = new URL(normalizeProductUrl(productUrl));
  url.searchParams.set('language', String(langCode));
  if (condCode == null) {
    url.searchParams.delete('minCondition');
  } else {
    url.searchParams.set('minCondition', String(condCode));
  }

  const page = await browser.newPage();
  try {
    await configurePage(page);
    await page.goto(url.toString(), { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1500));

    const result = await page.evaluate(() => {
      const out = { low: null, trend: null, avg7: null, avg30: null, avg1: null };

      document.querySelectorAll('dl dt').forEach((dt) => {
        const label = dt.textContent.trim().toLowerCase();
        const dd = dt.nextElementSibling;
        if (!dd) return;
        const value = (dd.querySelector('a') || dd).textContent.trim();
        if (label.startsWith('price trend') || label === 'trend') out.trend = value;
        else if (label.includes('30-day') || label.includes('30 day')) out.avg30 = value;
        else if (label.includes('7-day') || label.includes('7 day')) out.avg7 = value;
        else if (label.includes('1-day') || label.includes('1 day')) out.avg1 = value;
      });

      const priceSpans = Array.from(
        document.querySelectorAll('span.color-primary.small.text-end.text-nowrap.fw-bold')
      );
      const seen = new Set();
      for (const span of priceSpans) {
        const text = span.textContent.trim();
        if (!seen.has(text)) {
          seen.add(text);
          out.low = text;
          break;
        }
      }

      return out;
    });

    const parsed = {
      low: parseEuroPrice(result.low),
      trend: parseEuroPrice(result.trend),
      avg7: parseEuroPrice(result.avg7),
      avg30: parseEuroPrice(result.avg30),
      avg1: parseEuroPrice(result.avg1),
    };

    return Object.values(parsed).some((value) => value !== null) ? parsed : null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function runBackgroundScrape(targets) {
  if (scrapeJobRunning || targets.length === 0) return;
  scrapeJobRunning = true;

  console.log(`[CM scraper] Background job: scanning ${targets.length} card(s)...`);
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const updatedCache = readCache();
    const seen = new Set();

    for (const target of targets) {
      try {
        let productUrl = target.productUrl || null;
        if (!productUrl && target.name) {
          productUrl = await resolveProductUrl(browser, target);
        }
        if (!productUrl) continue;

        const key = cacheKey(productUrl, target.language, target.condition);
        if (seen.has(key)) continue;
        seen.add(key);

        const entry = updatedCache[key];
        if (entry && Date.now() - entry.ts <= CACHE_TTL) continue;

        const data = await scrapeOne(browser, productUrl, target.language, target.condition);
        if (data) {
          updatedCache[key] = { ts: Date.now(), data };
          console.log(`[CM scraper] ${target.language} ${target.condition} -> ${productUrl.split('/').pop()}: low=${data.low}, trend=${data.trend}`);
        }
      } catch (err) {
        console.warn(`[CM scraper] Failed for ${target.name || target.productUrl}: ${err.message}`);
      }
    }

    writeCache(updatedCache);
  } catch (err) {
    console.warn('[CM scraper] Background job failed:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
    scrapeJobRunning = false;
    console.log('[CM scraper] Background job done.');
  }
}

function getScrapedPrice(productUrl, language = 'EN', condition = 'Near Mint') {
  return getCached(productUrl, language, condition, { allowStale: true });
}

function scheduleScrape(targets) {
  setImmediate(() => runBackgroundScrape(targets).catch(() => {}));
}

async function scrapeAndCacheNow(productUrl, language = 'EN', condition = 'Near Mint') {
  const cached = getCached(productUrl, language, condition);
  if (cached) return cached;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const data = await scrapeOne(browser, productUrl, language, condition);
    if (!data) return null;

    const cache = readCache();
    cache[cacheKey(productUrl, language, condition)] = { ts: Date.now(), data };
    writeCache(cache);
    return data;
  } catch (err) {
    console.warn(`[CM scraper] Immediate scrape failed for ${productUrl}: ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function resolveProductUrlNow(target) {
  const cached = getResolvedProductUrl(target.name, target.setName, target.category);
  if (cached !== null) return cached;

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return await resolveProductUrl(browser, target);
  } catch (err) {
    console.warn(`[CM scraper] Immediate resolve failed for "${target?.name}": ${err.message}`);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = {
  getScrapedPrice,
  scheduleScrape,
  scrapeAndCacheNow,
  resolveProductUrlNow,
  getResolvedProductUrl,
  getResolvedProductUrlByProduct,
  setResolvedProductUrlByProduct,
};
