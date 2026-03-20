/**
 * In-memory cache with TTL support.
 * Stores entries as { value, expiresAt } and evicts on read or via clear().
 */

const DEFAULT_TTLS = {
  search: 5 * 60 * 1000,   // 5 minutes
  sets: 60 * 60 * 1000,    // 1 hour
  cards: 10 * 60 * 1000,   // 10 minutes
};

class Cache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Retrieve a value from cache. Returns null if missing or expired.
   * @param {string} key
   * @returns {*|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Store a value with a TTL.
   * @param {string} key
   * @param {*} value
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs = DEFAULT_TTLS.search) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Delete a specific key.
   * @param {string} key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Return number of entries (including potentially expired ones).
   */
  size() {
    return this.store.size;
  }

  /**
   * Evict all expired entries.
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
const cache = new Cache();

module.exports = { cache, DEFAULT_TTLS, Cache };
