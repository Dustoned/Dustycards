import client from './client.js';

/**
 * Fetch current settings.
 */
export async function getSettings() {
  const { data } = await client.get('/settings');
  return data;
}

/**
 * Update settings.
 * @param {Object} updates
 */
export async function updateSettings(updates) {
  const { data } = await client.patch('/settings', updates);
  return data;
}
