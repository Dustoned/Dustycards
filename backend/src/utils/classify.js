/**
 * Card category classifier.
 * Determines whether a product is "sealed" or "single" based on name patterns.
 */

const SEALED_KEYWORDS = [
  'Booster Box',
  'Elite Trainer Box',
  'ETB',
  ' Pack',
  'Bundle',
  'Collection Box',
  ' Tin',
  'Blister',
  'Display',
  ' Case',
  'Booster Bundle',
  'Premium Collection',
  'Gift Box',
  'Mini Tin',
  'Pokémon Center',
  'Pokemon Center',
  'Ultra-Premium Collection',
  'UPC',
  'Special Collection',
  'Super Premium Collection',
  'Super-Premium Collection',
  'Premium Collection',
  'Ultra Premium Collection',
  'Ultra-Premium Collection',
  'Collection',
  'UPC',
];

/**
 * Classify a card/product as "single" or "sealed" based on its name.
 * @param {Object|string} card - Card object with `name` property, or a plain name string
 * @returns {'single'|'sealed'}
 */
function classifyCard(card) {
  const name = typeof card === 'string' ? card : (card?.name || '');

  if (!name) return 'single';

  const nameLower = name.toLowerCase();

  for (const keyword of SEALED_KEYWORDS) {
    if (nameLower.includes(keyword.toLowerCase())) {
      return 'sealed';
    }
  }

  return 'single';
}

/**
 * Determine if a name matches any sealed keyword.
 * @param {string} name
 * @returns {boolean}
 */
function isSealed(name) {
  return classifyCard(name) === 'sealed';
}

module.exports = { classifyCard, isSealed, SEALED_KEYWORDS };
