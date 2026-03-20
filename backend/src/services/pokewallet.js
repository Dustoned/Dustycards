const axios = require('axios');
const { cache, DEFAULT_TTLS } = require('./cache');

const BASE_URL = process.env.POKEWALLET_BASE_URL || 'https://api.pokewallet.io';
const API_KEY = process.env.POKEWALLET_API_KEY || '';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/**
 * Create a pre-configured axios instance for PokéWallet.
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Sleep helper for retry backoff.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a request with exponential backoff and rate-limit handling.
 * @param {Function} requestFn - Function that returns an axios promise
 * @param {number} attempt - Current attempt number (starts at 0)
 * @returns {Promise<any>}
 */
async function withRetry(requestFn, attempt = 0) {
  try {
    const response = await requestFn();
    return response.data;
  } catch (error) {
    const status = error.response?.status;

    // Don't retry on client errors (except 429)
    if (status && status !== 429 && status >= 400 && status < 500) {
      throw error;
    }

    if (attempt >= MAX_RETRIES - 1) {
      throw error;
    }

    let delayMs;

    // Respect Retry-After header for 429s
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.pow(2, attempt) * BASE_DELAY_MS;
      console.warn(`Rate limited by PokéWallet API. Retrying in ${delayMs}ms...`);
    } else {
      delayMs = Math.pow(2, attempt) * BASE_DELAY_MS;
      console.warn(`PokéWallet request failed (attempt ${attempt + 1}). Retrying in ${delayMs}ms...`);
    }

    await sleep(delayMs);
    return withRetry(requestFn, attempt + 1);
  }
}

/**
 * Search for cards by query string.
 * @param {string} q - Search query
 * @returns {Promise<Array>}
 */
async function searchCards(q) {
  if (!q || !q.trim()) return [];

  const cacheKey = `search:${q.trim().toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await withRetry(() =>
    apiClient.get('/search', { params: { q: q.trim() } })
  );

  const results = Array.isArray(data) ? data : (data?.results || data?.cards || []);
  cache.set(cacheKey, results, DEFAULT_TTLS.search);
  return results;
}

/**
 * Get a single card by ID.
 * @param {string} id - PokéWallet card ID
 * @returns {Promise<Object>}
 */
async function getCard(id) {
  const cacheKey = `card:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await withRetry(() => apiClient.get(`/cards/${id}`));

  cache.set(cacheKey, data, DEFAULT_TTLS.cards);
  return data;
}

/**
 * Get all TCG sets.
 * @returns {Promise<Array>}
 */
async function getSets() {
  const cacheKey = 'sets:all';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await withRetry(() => apiClient.get('/sets'));

  const sets = Array.isArray(data) ? data : (data?.sets || data?.results || []);
  cache.set(cacheKey, sets, DEFAULT_TTLS.sets);
  return sets;
}

/**
 * Get the image URL for a card ID.
 * PokéWallet serves images from /images/:id — we construct the URL without
 * making an extra HTTP request, since the image tag itself will load it.
 * @param {string} id - PokéWallet card ID
 * @returns {string}
 */
function getImageUrl(id) {
  return `${BASE_URL}/images/${id}`;
}

/**
 * Health check against PokéWallet API.
 * @returns {Promise<Object>}
 */
async function checkHealth() {
  return withRetry(() => apiClient.get('/health'));
}

module.exports = {
  searchCards,
  getCard,
  getSets,
  getImageUrl,
  checkHealth,
  apiClient,
};
