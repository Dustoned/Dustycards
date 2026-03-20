import clsx from 'clsx';
import CardImage from './CardImage.jsx';
import Badge from '../ui/Badge.jsx';
import useStore from '../../store/useStore.js';
import { useDisplayPrice } from '../../hooks/useDisplayPrice.js';
import { CONDITION_LABELS } from '../../constants/cardConditions.js';

function formatPrice(value) {
  if (value == null || isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function PnlIndicator({ purchasePrice, marketPrice }) {
  if (!purchasePrice || !marketPrice) return null;

  const gain = marketPrice - purchasePrice;
  const pct = ((gain / purchasePrice) * 100).toFixed(1);
  const isGain = gain >= 0;

  return (
    <div
      className={clsx(
        'flex items-center gap-0.5 text-xs font-medium',
        isGain ? 'text-gain' : 'text-loss',
      )}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d={isGain ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
      <span>{Math.abs(pct)}%</span>
    </div>
  );
}

export default function CardTile({ item, onClick }) {
  const { cardSize } = useStore();
  const getPrice = useDisplayPrice();
  const isSealed = item.category === 'sealed';

  const market = getPrice(item.pricing);
  const purchasePrice = item.purchase_price ?? null;

  return (
    <div
      className={clsx(
        'group relative bg-card border border-subtle rounded-xl overflow-hidden cursor-pointer card-hover',
        'flex flex-col',
      )}
      onClick={() => onClick?.(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(item)}
    >
      {/* Image */}
      <div className="relative">
        <CardImage
          src={item.image_url}
          alt={item.name}
          rounded="rounded-none"
          className={clsx('w-full', isSealed && 'bg-card')}
          imgClassName={isSealed ? 'p-3' : ''}
          aspectRatio={isSealed ? '1 / 1' : '5 / 7'}
          fit={isSealed ? 'contain' : 'cover'}
        />

        {/* Quantity badge */}
        {item.quantity > 1 && (
          <div className="absolute top-2 right-2 bg-accent-primary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
            {item.quantity > 99 ? '99+' : item.quantity}
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <Badge variant={item.category === 'sealed' ? 'sealed' : 'single'}>
            {item.category === 'sealed' ? 'Sealed' : 'Single'}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-xs font-semibold text-text-primary leading-tight line-clamp-2">
          {item.name}
        </p>
        <p className="text-xs text-text-muted truncate">
          {item.set_name}
          {item.number ? ` #${item.number}` : ''}
        </p>

        {/* Price row */}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-sm font-bold text-text-primary">
            {formatPrice(market)}
          </span>
          <PnlIndicator purchasePrice={purchasePrice} marketPrice={market} />
        </div>

        {/* Condition badge */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {item.condition && (
            <Badge
              variant={item.condition}
              className="text-[10px] shrink-0 whitespace-nowrap"
              title={CONDITION_LABELS[item.condition] || item.condition}
            >
              {CONDITION_LABELS[item.condition] || item.condition}
            </Badge>
          )}
          {item.language && item.language !== 'EN' && (
            <Badge variant="default" className="text-[10px] shrink-0 whitespace-nowrap">
              {item.language}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
