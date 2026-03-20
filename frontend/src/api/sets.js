import client from './client.js';

/**
 * Fetch all TCG sets.
 */
export async function getSets() {
  const { data } = await client.get('/sets');
  return data;
}
