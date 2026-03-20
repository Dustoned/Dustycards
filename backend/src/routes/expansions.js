const express = require('express');
const { listLocalExpansions, getLocalExpansion, getLocalExpansionProduct } = require('../services/cardmarketLocalData');
const {
  getResolvedProductUrl,
  getResolvedProductUrlByProduct,
  resolveProductUrlNow,
  setResolvedProductUrlByProduct,
} = require('../services/cardmarketScraper');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const expansions = listLocalExpansions(q);
    res.json({
      expansions,
      total: expansions.length,
      query: q,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { q = '', category = 'all' } = req.query;
    const expansion = getLocalExpansion(id, { query: q, category });

    if (!expansion) {
      return res.status(404).json({ error: 'Expansion not found.' });
    }

    res.json(expansion);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/products/:productId/open', async (req, res, next) => {
  try {
    const { id, productId } = req.params;
    const product = getLocalExpansionProduct(id, productId);

    if (!product) {
      return res.status(404).json({ error: 'Expansion product not found.' });
    }

    const expansion = getLocalExpansion(id, { category: 'all' });
    const setName = expansion?.name || '';

    let productUrl = getResolvedProductUrlByProduct(id, productId);
    if (!productUrl) {
      productUrl = getResolvedProductUrl(product.name, setName, product.category);
      if (productUrl) {
        setResolvedProductUrlByProduct(id, productId, productUrl);
      }
    }
    if (!productUrl) {
      productUrl = await resolveProductUrlNow({
        name: product.name,
        setName,
        category: product.category,
      });
      if (productUrl) {
        setResolvedProductUrlByProduct(id, productId, productUrl);
      }
    }

    if (!productUrl) {
      const query = [product.name, setName].filter(Boolean).join(' ').trim();
      const fallback = `https://www.cardmarket.com/en/Pokemon/Products/Search?searchString=${encodeURIComponent(query)}`;
      return res.redirect(302, fallback);
    }

    return res.redirect(302, productUrl);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
