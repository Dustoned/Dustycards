import client from './client.js';

/**
 * Search for cards by query.
 * @param {string} q - Search query
 * @param {string} category - 'single' | 'sealed' | 'all'
 */
export async function searchCards(q, category = 'all') {
  const { data } = await client.get('/cards/search', {
    params: { q, category },
  });
  return data;
}

/**
 * Get a single card by PokéWallet ID.
 * @param {string} id
 */
export async function getCard(id) {
  const { data } = await client.get(`/cards/${id}`);
  return data;
}
