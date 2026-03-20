import client from './client.js';

export async function getExpansions(q = '') {
  const { data } = await client.get('/expansions', {
    params: { q },
  });
  return data;
}

export async function getExpansion(id, { q = '', category = 'all' } = {}) {
  const { data } = await client.get(`/expansions/${id}`, {
    params: { q, category },
  });
  return data;
}
