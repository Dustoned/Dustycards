import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Modal from '../ui/Modal.jsx';
import CardImage from './CardImage.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import Input, { Select, Textarea } from '../ui/Input.jsx';
import { useCollectionMutations } from '../../hooks/useCollection.js';
import { getCollectionItemPriceHistory } from '../../api/collection.js';
import { useDisplayPrice, PRICE_TYPE_LABELS } from '../../hooks/useDisplayPrice.js';
import { useSettings } from '../../hooks/useSettings.js';
import { CONDITION_CODES, CONDITION_LABELS, CONDITION_OPTION_LABELS } from '../../constants/cardConditions.js';
import { format } from 'date-fns';
import clsx from 'clsx';

const CARDMARKET_LANGUAGE_MAP = {
  EN: 1,
  FR: 2,
  DE: 3,
  IT: 4,
  ES: 5,
  ZH: 6,
  JP: 7,
  PT: 8,
  KO: 10,
};

const CARDMARKET_CONDITION_MAP = {
  Mint: 1,
  'Near Mint': 2,
  Excellent: 3,
  Good: 4,
  'Light Played': 5,
  Played: 6,
  Poor: null,
};

function formatPrice(value, fallback = '—') {
  if (value == null || isNaN(value)) return fallback;
  return `$${Number(value).toFixed(2)}`;
}

function buildFilteredCardmarketUrl(productUrl, language = 'EN', condition = 'Near Mint') {
  if (!productUrl) return '';

  try {
    const url = new URL(productUrl);
    url.searchParams.set('language', String(CARDMARKET_LANGUAGE_MAP[language] ?? 1));
    const conditionCode = Object.prototype.hasOwnProperty.call(CARDMARKET_CONDITION_MAP, condition)
      ? CARDMARKET_CONDITION_MAP[condition]
      : 2;
    if (conditionCode == null) {
      url.searchParams.delete('minCondition');
    } else {
      url.searchParams.set('minCondition', String(conditionCode));
    }
    return url.toString();
  } catch {
    return productUrl;
  }
}

function PriceRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-subtle last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{formatPrice(value)}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-subtle rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-text-muted mb-0.5">{label}</p>
      <p className="font-bold text-accent-primary">{formatPrice(payload[0]?.value)}</p>
    </div>
  );
}

function PriceHistoryChart({ itemId, currentPrice }) {
  const { data, isLoading } = useQuery({
    queryKey: ['price-history', itemId],
    queryFn: () => getCollectionItemPriceHistory(itemId),
    enabled: !!itemId,
    staleTime: 1000 * 60 * 5,
  });

  const history = data?.history ?? [];

  // Build chart data — include today's current price as final point
  let chartData = history.map((s) => ({
    date: s.date,
    value: s.market ?? s.trend ?? null,
  })).filter((d) => d.value != null);

  // If we only have 1 or 0 snapshots and we have a current price, show a minimal 2-point chart
  // so the line at least appears
  if (chartData.length < 2 && currentPrice != null) {
    const today = new Date().toISOString().split('T')[0];
    if (chartData.length === 0 || chartData[chartData.length - 1].date !== today) {
      chartData.push({ date: today, value: currentPrice });
    }
    if (chartData.length < 2) {
      // Pad with the same value a month ago to give context
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoDate = monthAgo.toISOString().split('T')[0];
      chartData.unshift({ date: monthAgoDate, value: currentPrice });
    }
  }

  // Format dates nicely
  const formatted = chartData.map((d) => ({
    ...d,
    label: (() => {
      try { return format(new Date(d.date + 'T12:00:00'), 'MMM d'); } catch { return d.date; }
    })(),
  }));

  const hasRealHistory = history.length > 1;
  const minVal = Math.min(...formatted.map((d) => d.value)) * 0.97;
  const maxVal = Math.max(...formatted.map((d) => d.value)) * 1.03;
  const first = formatted[0]?.value;
  const last = formatted[formatted.length - 1]?.value;
  const delta = first && last ? last - first : null;
  const isPositive = delta != null ? delta >= 0 : null;

  if (isLoading) {
    return <div className="shimmer h-28 rounded-lg mt-3" />;
  }

  return (
    <div className="mt-3 bg-elevated rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
          Price History
        </p>
        <div className="flex items-center gap-2">
          {delta != null && (
            <span className={clsx('text-xs font-semibold', isPositive ? 'text-gain' : 'text-loss')}>
              {isPositive ? '+' : ''}{formatPrice(delta)}
            </span>
          )}
          {!hasRealHistory && (
            <span className="text-xs text-text-muted bg-card px-2 py-0.5 rounded-full">
              Today only — builds over time
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cardPriceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal, maxVal]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#cardPriceGradient)"
            dot={false}
            activeDot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CardModal({ item, isOpen, onClose }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({});

  const { updateItem, removeItem, isUpdating, isRemoving } = useCollectionMutations();
  const getPrice = useDisplayPrice();
  const { settings } = useSettings();

  if (!item) return null;

  const pricing = item.pricing || {};
  const displayPrice = getPrice(pricing);
  const priceLabel = PRICE_TYPE_LABELS[settings.priceType] ?? 'Market';
  const isSealed = item.category === 'sealed';

  const gain =
    displayPrice != null && item.purchase_price != null
      ? displayPrice - item.purchase_price
      : null;
  const gainPct =
    gain != null && item.purchase_price > 0
      ? (gain / item.purchase_price) * 100
      : null;

  function startEdit() {
    setForm({
      quantity: item.quantity,
      condition: item.condition,
      language: item.language,
      purchase_price: item.purchase_price,
      purchase_date: item.purchase_date,
      notes: item.notes || '',
      cardmarket_url: item.cardmarket_url || '',
      category: item.category,
      variant: item.variant || '',
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({});
  }

  async function handleSave() {
    try {
      await updateItem({ id: item.id, updates: { ...form } });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  }

  async function handleDelete() {
    try {
      await removeItem(item.id);
      onClose();
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  }

  function fieldChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const sourceLabel =
    pricing.source === 'tcgplayer'
      ? 'TCGPlayer'
      : pricing.source === 'cardmarket'
      ? 'CardMarket'
      : 'Unknown source';

  const sourceBadgeVariant =
    pricing.source === 'tcgplayer' ? 'blue' : pricing.source === 'cardmarket' ? 'purple' : 'default';
  const filteredCardmarketUrl = buildFilteredCardmarketUrl(
    item.cardmarket_url,
    item.language,
    item.condition
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col md:flex-row gap-6 p-5">
        {/* Left: Image */}
        <div className="flex-shrink-0 w-full md:w-52">
          <CardImage
            src={item.image_url}
            alt={item.name}
            rounded="rounded-xl"
            className={clsx('w-full shadow-xl', isSealed && 'bg-card')}
            imgClassName={isSealed ? 'p-4' : ''}
            aspectRatio={isSealed ? '1 / 1' : '5 / 7'}
            fit={isSealed ? 'contain' : 'cover'}
          />
          <div className="flex justify-center mt-3">
            <Badge variant={sourceBadgeVariant}>{sourceLabel}</Badge>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 min-w-0 overflow-y-auto max-h-[80vh] pr-1">
          {/* Name + set */}
          <div className="mb-4">
            <div className="flex items-start gap-2 flex-wrap">
              <Badge variant={item.category === 'sealed' ? 'sealed' : 'single'}>
                {item.category}
              </Badge>
              {item.condition && (
                <Badge variant={item.condition} className="shrink-0 whitespace-nowrap" title={CONDITION_LABELS[item.condition] || item.condition}>
                  {CONDITION_LABELS[item.condition] || item.condition}
                </Badge>
              )}
              {item.language && item.language !== 'EN' && (
                <Badge variant="default">{item.language}</Badge>
              )}
            </div>
            <h2 className="text-xl font-bold text-text-primary mt-2">{item.name}</h2>
            <p className="text-sm text-text-muted">
              {item.set_name}
              {item.number ? ` · #${item.number}` : ''}
            </p>
            {item.variant && (
              <p className="text-xs text-text-muted mt-0.5">Variant: {item.variant}</p>
            )}
          </div>

          {/* Pricing section */}
          <div className="bg-elevated rounded-lg p-3 mb-3">
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-2">
              Pricing
            </p>
            <PriceRow label={`${priceLabel} Price`} value={displayPrice} />
            <PriceRow label="Low" value={pricing.low} />
            {pricing.mid != null && <PriceRow label="Mid" value={pricing.mid} />}
            {pricing.trend != null && <PriceRow label="Trend" value={pricing.trend} />}
            {pricing.avg7 != null && <PriceRow label="7-day Avg" value={pricing.avg7} />}
            {pricing.avg30 != null && <PriceRow label="30-day Avg" value={pricing.avg30} />}
          </div>

          {/* P&L row */}
          {gain !== null && (
            <div className="flex items-center gap-4 mb-3 p-3 bg-elevated rounded-lg">
              <div>
                <p className="text-xs text-text-muted">Paid</p>
                <p className="text-sm font-bold text-text-primary">
                  {formatPrice(item.purchase_price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">{priceLabel}</p>
                <p className="text-sm font-bold text-text-primary">{formatPrice(displayPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">P&L</p>
                <p className={clsx('text-sm font-bold', gain >= 0 ? 'text-gain' : 'text-loss')}>
                  {gain >= 0 ? '+' : ''}
                  {formatPrice(gain)}
                  {gainPct != null && (
                    <span className="text-xs ml-1">
                      ({gain >= 0 ? '+' : ''}
                      {gainPct.toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
              {item.quantity > 1 && (
                <div>
                  <p className="text-xs text-text-muted">Qty</p>
                  <p className="text-sm font-bold text-text-primary">×{item.quantity}</p>
                </div>
              )}
            </div>
          )}

          {/* Price History Chart */}
          <PriceHistoryChart itemId={item.id} currentPrice={displayPrice} />

          {/* Edit form or info */}
          <div className="mt-3">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => fieldChange('quantity', parseInt(e.target.value, 10))}
                  />
                  <Input
                    label="Purchase Price"
                    type="number"
                    step="0.01"
                    min="0"
                    prefix="$"
                    value={form.purchase_price}
                    onChange={(e) => fieldChange('purchase_price', parseFloat(e.target.value))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Condition"
                    value={form.condition}
                    onChange={(e) => fieldChange('condition', e.target.value)}
                  >
                    {CONDITION_CODES.map((c) => (
                      <option key={c} value={c}>{CONDITION_OPTION_LABELS[c]}</option>
                    ))}
                  </Select>
                  <Select
                    label="Language"
                    value={form.language}
                    onChange={(e) => fieldChange('language', e.target.value)}
                  >
                    {['EN', 'JP', 'DE', 'FR', 'ES', 'IT', 'PT', 'KO', 'ZH'].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </Select>
                </div>
                <Input
                  label="Purchase Date"
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => fieldChange('purchase_date', e.target.value)}
                />
                <Input
                  label="CardMarket URL"
                  type="url"
                  value={form.cardmarket_url}
                  onChange={(e) => fieldChange('cardmarket_url', e.target.value)}
                  placeholder="https://www.cardmarket.com/en/Pokemon/Products/..."
                />
                <Textarea
                  label="Notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => fieldChange('notes', e.target.value)}
                  placeholder="Any notes about this card..."
                />
                <div className="flex gap-2 pt-2">
                  <Button variant="primary" loading={isUpdating} onClick={handleSave}>
                    Save Changes
                  </Button>
                  <Button variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3 pt-3 border-t border-subtle">
                <div className="text-sm text-text-secondary">
                  <span className="text-text-muted">Added:</span>{' '}
                  {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : '—'}
                </div>
                {item.purchase_date && (
                  <div className="text-sm text-text-secondary">
                    <span className="text-text-muted">Purchased:</span>{' '}
                    {format(new Date(item.purchase_date), 'MMM d, yyyy')}
                  </div>
                )}
                {filteredCardmarketUrl && (
                  <div className="text-sm text-text-secondary">
                    <span className="text-text-muted block mb-1">CardMarket URL:</span>
                    <div className="bg-elevated rounded-lg p-2.5 border border-subtle">
                      <a
                        href={filteredCardmarketUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent-primary break-all hover:underline"
                      >
                        {filteredCardmarketUrl}
                      </a>
                    </div>
                  </div>
                )}
                {item.notes && (
                  <div className="text-sm text-text-secondary bg-elevated rounded-lg p-2.5">
                    <span className="text-text-muted block text-xs mb-1">Notes</span>
                    {item.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!editing && (
            <div className="flex items-center gap-2 pt-3 border-t border-subtle">
              <Button variant="secondary" size="sm" onClick={startEdit}>
                Edit
              </Button>
              {confirmDelete ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={isRemoving}
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
