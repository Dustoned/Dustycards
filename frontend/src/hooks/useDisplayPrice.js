import { useSettings } from './useSettings.js';

/**
 * Returns a function that extracts the user's preferred price
 * from any pricing object, based on the priceType setting.
 *
 * Usage:
 *   const getPrice = useDisplayPrice();
 *   const price = getPrice(item.pricing); // respects priceType setting
 */
export function useDisplayPrice() {
  const { settings } = useSettings();
  const priceType = settings.priceType || 'trend';

  return (pricing) => {
    if (!pricing) return null;
    if (!Object.prototype.hasOwnProperty.call(pricing, priceType)) {
      return null;
    }
    return pricing[priceType] ?? null;
  };
}

/**
 * Label for the active price type.
 */
export const PRICE_TYPE_LABELS = {
  market: 'Market',
  low:    'Low',
  mid:    'Mid',
  trend:  'Trend',
};
