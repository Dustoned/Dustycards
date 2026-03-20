import clsx from 'clsx';

export default function StatsCard({
  title,
  value,
  subtitle,
  delta,
  deltaLabel,
  icon,
  accent = false,
  isLoading = false,
}) {
  const isPositive = delta >= 0;
  const hasDelta = delta != null && !isNaN(delta);

  if (isLoading) {
    return (
      <div className="bg-surface border border-subtle rounded-2xl p-5 space-y-3">
        <div className="shimmer h-4 rounded w-1/2" />
        <div className="shimmer h-8 rounded w-3/4" />
        <div className="shimmer h-3 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'bg-surface border rounded-2xl p-5 transition-all duration-150',
        accent
          ? 'border-accent-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.08)]'
          : 'border-subtle hover:border-accent-primary/20',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className={clsx('text-2xl font-bold', accent ? 'text-accent-primary' : 'text-text-primary')}>
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div className={clsx(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            accent ? 'bg-accent-primary/15 text-accent-primary' : 'bg-elevated text-text-muted',
          )}>
            {icon}
          </div>
        )}
      </div>

      {hasDelta && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-subtle">
          <span className={clsx('flex items-center gap-0.5 text-sm font-medium', isPositive ? 'text-gain' : 'text-loss')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d={isPositive ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
              />
            </svg>
            {isPositive ? '+' : ''}{typeof delta === 'number' ? delta.toFixed(2) : delta}%
          </span>
          {deltaLabel && (
            <span className="text-xs text-text-muted">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
