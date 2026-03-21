const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GAME_ID = 6; // Pokemon

const S3_BASE = 'https://downloads.s3.cardmarket.com/productCatalog';
const FILES = {
  priceGuide: {
    url: `${S3_BASE}/priceGuide/price_guide_${GAME_ID}.json`,
    filename: `price_guide_${GAME_ID}.json`,
  },
  productsSingles: {
    url: `${S3_BASE}/productList/products_singles_${GAME_ID}.json`,
    filename: `products_singles_${GAME_ID}.json`,
  },
  productsNonSingles: {
    url: `${S3_BASE}/productList/products_nonsingles_${GAME_ID}.json`,
    filename: `products_nonsingles_${GAME_ID}.json`,
  },
};

// Default refresh interval: 12 hours
const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

let refreshTimer = null;
let lastRefreshAt = null;
let refreshInProgress = false;

// Callback to invalidate in-memory caches after refresh
let onRefreshComplete = null;

function setOnRefreshComplete(callback) {
  onRefreshComplete = callback;
}

function getFilePath(filename) {
  return path.join(DATA_DIR, filename);
}

function getStatus() {
  const files = {};
  for (const [key, { filename }] of Object.entries(FILES)) {
    const filePath = getFilePath(filename);
    let exists = false;
    let size = 0;
    let mtime = null;
    try {
      const stat = fs.statSync(filePath);
      exists = true;
      size = stat.size;
      mtime = stat.mtime.toISOString();
    } catch { /* file doesn't exist */ }
    files[key] = { filename, exists, size, mtime };
  }
  return {
    lastRefreshAt,
    refreshInProgress,
    files,
  };
}

async function downloadFile(url, destPath) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000, // 2 min timeout for large files
    headers: { 'Accept-Encoding': 'gzip, deflate' },
  });

  // Validate JSON before writing
  const text = Buffer.from(response.data).toString('utf-8');
  JSON.parse(text); // throws if invalid

  fs.writeFileSync(destPath, text, 'utf-8');
  return text.length;
}

async function refreshAll() {
  if (refreshInProgress) {
    console.log('[CM data] Refresh already in progress, skipping.');
    return { skipped: true };
  }

  refreshInProgress = true;
  const results = {};

  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    for (const [key, { url, filename }] of Object.entries(FILES)) {
      const destPath = getFilePath(filename);
      try {
        console.log(`[CM data] Downloading ${filename}...`);
        const bytes = await downloadFile(url, destPath);
        console.log(`[CM data] ${filename}: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
        results[key] = { success: true, bytes };
      } catch (err) {
        console.warn(`[CM data] Failed to download ${filename}: ${err.message}`);
        results[key] = { success: false, error: err.message };
      }
    }

    lastRefreshAt = new Date().toISOString();

    // Invalidate in-memory cache so next query picks up fresh data
    if (onRefreshComplete) {
      try { onRefreshComplete(); } catch { /* non-critical */ }
    }

    console.log(`[CM data] Refresh complete at ${lastRefreshAt}`);
    return { success: true, results, lastRefreshAt };
  } finally {
    refreshInProgress = false;
  }
}

function needsRefresh() {
  for (const { filename } of Object.values(FILES)) {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) return true;
    try {
      const stat = fs.statSync(filePath);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs > REFRESH_INTERVAL_MS) return true;
    } catch {
      return true;
    }
  }
  return false;
}

async function refreshIfNeeded() {
  if (needsRefresh()) {
    return refreshAll();
  }
  console.log('[CM data] Files are fresh, skipping refresh.');
  return { skipped: true, reason: 'files are fresh' };
}

function startPeriodicRefresh() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    refreshIfNeeded().catch((err) => {
      console.warn('[CM data] Periodic refresh failed:', err.message);
    });
  }, REFRESH_INTERVAL_MS);
  // Don't block process exit
  if (refreshTimer.unref) refreshTimer.unref();
  console.log(`[CM data] Periodic refresh scheduled every ${REFRESH_INTERVAL_MS / 3600000}h`);
}

function stopPeriodicRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

module.exports = {
  refreshAll,
  refreshIfNeeded,
  startPeriodicRefresh,
  stopPeriodicRefresh,
  getStatus,
  setOnRefreshComplete,
  getFilePath,
  FILES,
};
