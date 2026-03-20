import CardImage from '../cards/CardImage.jsx';
import clsx from 'clsx';
import { useDisplayPrice } from '../../hooks/useDisplayPrice.js';

function formatPrice(value) {
  if (value == null) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function MoverRow({ item, rank }) {
  const market = item._displayPrice ?? item.pricing?.market;
  const paid = item.purchase_price;

  const gain = market != null && paid != null ? market - paid : null;
  const pct = gain != null && paid > 0 ? (gain / paid) * 100 : null;
  const isGain = gain != null && gain >= 0;

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-subtle last:border-0">
      <span className="text-xs font-bold text-text-muted w-5 text-center flex-shrink-0">
        {rank}
      </span>
      <div className="w-8 h-11 flex-shrink-0">
        <CardImage
          src={item.image_url}
          alt={item.name}
          rounded="rounded"
          className="w-full h-full"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
        <p className="text-xs text-text-muted truncate">{item.set_name}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-text-primary">{formatPrice(market)}</p>
        {pct != null && (
          <p className={clsx('text-xs font-medium', isGain ? 'text-gain' : 'text-loss')}>
            {isGain ? '+' : ''}{pct.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-subtle last:border-0">
      <div className="shimmer w-5 h-4 rounded flex-shrink-0" />
      <div className="shimmer w-8 h-11 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="shimmer h-3.5 rounded w-3/4" />
        <div className="shimmer h-3 rounded w-1/2" />
      </div>
      <div className="space-y-1.5">
        <div className="shimmer h-3.5 rounded w-16" />
        <div className="shimmer h-3 rounded w-12" />
      </div>
    </div>
  );
}

export default function TopMovers({ items = [], isLoading = false }) {
  const getPrice = useDisplayPrice();

  const withPnl = items
    .filter((i) => getPrice(i.pricing) != null && i.purchase_price > 0)
    .map((i) => ({
      ...i,
      _displayPrice: getPrice(i.pricing),
      pct: ((getPrice(i.pricing) - i.purchase_price) / i.purchase_price) * 100,
    }));

  const gainers = [...withPnl].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const losers = [...withPnl].sort((a, b) => a.pct - b.pct).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Gainers */}
      <div className="bg-surface border border-subtle rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gain inline-block" />
          Top Gainers
        </h3>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : gainers.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">
            Add cards with purchase prices to track performance
          </p>
        ) : (
          gainers.map((item, i) => (
            <MoverRow key={item.id} item={item} rank={i + 1} />
          ))
        )}
      </div>

      {/* Top Losers */}
      <div className="bg-surface border border-subtle rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-loss inline-block" />
          Top Losers
        </h3>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : losers.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center">
            Add cards with purchase prices to track performance
          </p>
        ) : (
          losers.map((item, i) => (
            <MoverRow key={item.id} item={item} rank={i + 1} />
          ))
        )}
      </div>
    </div>
  );
}
