import client from './client.js';

/**
 * Fetch all collection items with optional filters.
 */
export async function getCollection(filters = {}) {
  const { data } = await client.get('/collection', { params: filters });
  return data;
}

/**
 * Add a new item to the collection.
 * @param {Object} item
 */
export async function addToCollection(item) {
  const { data } = await client.post('/collection', item);
  return data;
}

/**
 * Update a collection item.
 * @param {string} id
 * @param {Object} updates
 */
export async function updateCollectionItem(id, updates) {
  const { data } = await client.patch(`/collection/${id}`, updates);
  return data;
}

/**
 * Remove a collection item.
 * @param {string} id
 */
export async function removeFromCollection(id) {
  const { data } = await client.delete(`/collection/${id}`);
  return data;
}

/**
 * Get price history snapshots for a collection item.
 * @param {string} id - Collection item UUID
 */
export async function getCollectionItemPriceHistory(id) {
  const { data } = await client.get(`/collection/${id}/price-history`);
  return data;
}
