import Badge from '../ui/Badge.jsx';
import CardImage from '../cards/CardImage.jsx';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useDisplayPrice, PRICE_TYPE_LABELS } from '../../hooks/useDisplayPrice.js';
import { useSettings } from '../../hooks/useSettings.js';
import { CONDITION_LABELS } from '../../constants/cardConditions.js';

function formatPrice(value) {
  if (value == null || isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function PnlCell({ purchasePrice, marketPrice }) {
  if (!purchasePrice || !marketPrice) return <span className="text-text-muted">—</span>;

  const gain = marketPrice - purchasePrice;
  const pct = purchasePrice > 0 ? (gain / purchasePrice) * 100 : 0;
  const isGain = gain >= 0;

  return (
    <span className={clsx('text-sm font-medium', isGain ? 'text-gain' : 'text-loss')}>
      {isGain ? '+' : ''}{formatPrice(gain)} ({isGain ? '+' : ''}{pct.toFixed(1)}%)
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-subtle">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="shimmer h-4 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function ListView({ items, isLoading, onCardClick }) {
  const getPrice = useDisplayPrice();
  const { settings } = useSettings();
  const priceLabel = PRICE_TYPE_LABELS[settings.priceType] ?? 'Market';
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-xl border border-subtle">
        <table className="w-full text-sm">
          <thead className="bg-elevated border-b border-subtle">
            <tr>
              {['Card', 'Set', 'Category', 'Condition', 'Qty', 'Paid', 'Market', 'P&L'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-subtle">
      <table className="w-full text-sm">
        <thead className="bg-elevated border-b border-subtle">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-64">Card</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Set</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Condition</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Qty</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Paid</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">{priceLabel}</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-subtle bg-surface">
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-elevated transition-colors cursor-pointer"
              onClick={() => onCardClick?.(item)}
            >
              {/* Card name + thumbnail */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-11 flex-shrink-0">
                    <CardImage
                      src={item.image_url}
                      alt={item.name}
                      rounded="rounded"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">{item.name}</p>
                    {item.number && (
                      <p className="text-xs text-text-muted">#{item.number}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* Set */}
              <td className="px-4 py-3">
                <span className="text-text-secondary truncate max-w-[150px] block">
                  {item.set_name}
                </span>
              </td>

              {/* Category */}
              <td className="px-4 py-3">
                <Badge variant={item.category === 'sealed' ? 'sealed' : 'single'}>
                  {item.category}
                </Badge>
              </td>

              {/* Condition */}
              <td className="px-4 py-3">
                <Badge
                  variant={item.condition || 'default'}
                  title={CONDITION_LABELS[item.condition] || item.condition || 'Unknown'}
                >
                  {CONDITION_LABELS[item.condition] || item.condition || '—'}
                </Badge>
              </td>

              {/* Quantity */}
              <td className="px-4 py-3 text-text-primary font-medium">{item.quantity}</td>

              {/* Purchase price */}
              <td className="px-4 py-3 text-text-secondary">
                {formatPrice(item.purchase_price)}
              </td>

              {/* Price */}
              <td className="px-4 py-3 font-medium text-text-primary">
                {formatPrice(getPrice(item.pricing))}
              </td>

              {/* P&L */}
              <td className="px-4 py-3">
                <PnlCell
                  purchasePrice={item.purchase_price}
                  marketPrice={getPrice(item.pricing)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
