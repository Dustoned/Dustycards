import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAllCollection } from '../hooks/useCollection.js';
import { useSettings } from '../hooks/useSettings.js';
import StatsCard from '../components/dashboard/StatsCard.jsx';
import ValueChart from '../components/dashboard/ValueChart.jsx';
import TopMovers from '../components/dashboard/TopMovers.jsx';
import CardImage from '../components/cards/CardImage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { format } from 'date-fns';

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function calcStats(items, priceType = 'market') {
  let totalValue = 0;
  let totalInvested = 0;
  let singlesValue = 0;
  let sealedValue = 0;
  let totalCards = 0;

  for (const item of items) {
    const qty = item.quantity || 1;
    const market = item.pricing?.[priceType] ?? item.pricing?.market ?? 0;
    const paid = item.purchase_price ?? 0;

    totalValue += market * qty;
    totalInvested += paid * qty;
    totalCards += qty;

    if (item.category === 'sealed') {
      sealedValue += market * qty;
    } else {
      singlesValue += market * qty;
    }
  }

  const pnl = totalValue - totalInvested;
  const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

  return { totalValue, totalInvested, pnl, pnlPct, singlesValue, sealedValue, totalCards };
}

export default function Dashboard() {
  const { items, isLoading } = useAllCollection();
  const { settings } = useSettings();

  const stats = useMemo(() => calcStats(items, settings.priceType), [items, settings.priceType]);

  // Recent items — last 5 added
  const recentItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    [items],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          subtitle={`${items.length} unique items`}
          accent
          isLoading={isLoading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Total Invested"
          value={formatCurrency(stats.totalInvested)}
          subtitle={`${stats.totalCards} total cards`}
          isLoading={isLoading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Total P&L"
          value={formatCurrency(stats.pnl)}
          delta={stats.pnlPct}
          deltaLabel="vs purchase price"
          isLoading={isLoading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
        />
        <StatsCard
          title="Singles Value"
          value={formatCurrency(stats.singlesValue)}
          subtitle={`${items.filter((i) => i.category === 'single').length} singles`}
          isLoading={isLoading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatsCard
          title="Sealed Value"
          value={formatCurrency(stats.sealedValue)}
          subtitle={`${items.filter((i) => i.category === 'sealed').length} sealed`}
          isLoading={isLoading}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          }
        />
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart — takes 2/3 width */}
        <div className="lg:col-span-2">
          <ValueChart currentValue={stats.totalValue} isLoading={isLoading} />
        </div>

        {/* Recent Activity */}
        <div className="bg-surface border border-subtle rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Additions</h3>
            <Link
              to="/collection"
              className="text-xs text-accent-primary hover:text-accent-hover transition-colors"
            >
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="shimmer w-8 h-11 rounded flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="shimmer h-3.5 rounded w-3/4" />
                    <div className="shimmer h-3 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="w-10 h-10 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-sm text-text-muted">No cards yet</p>
              <Link to="/search" className="text-xs text-accent-primary mt-1 hover:underline">
                Add your first card
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-subtle last:border-0">
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
                    <p className="text-xs text-text-muted">
                      {item.created_at ? format(new Date(item.created_at), 'MMM d') : ''}
                    </p>
                  </div>
                  <Badge variant={item.category === 'sealed' ? 'sealed' : 'single'}>
                    {item.category}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Movers */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-4">Performance</h2>
        <TopMovers items={items} isLoading={isLoading} />
      </div>
    </div>
  );
}
