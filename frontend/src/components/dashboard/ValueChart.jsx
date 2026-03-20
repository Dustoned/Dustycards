import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, subDays } from 'date-fns';

function formatCurrency(value) {
  if (value == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-elevated border border-subtle rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-bold text-accent-primary">
        {formatCurrency(payload[0]?.value)}
      </p>
    </div>
  );
}

/**
 * Generate mock historical data if no real history exists.
 * Creates a smooth curve leading up to the current value.
 */
function generateMockHistory(currentValue, days = 30) {
  const data = [];
  const baseValue = currentValue * 0.85;
  const variance = currentValue * 0.08;

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const progress = (days - i) / days;
    // S-curve interpolation toward current value with some noise
    const trend = baseValue + (currentValue - baseValue) * Math.pow(progress, 0.7);
    const noise = (Math.random() - 0.5) * variance * (1 - progress * 0.5);
    const value = Math.max(0, trend + noise);

    data.push({
      date: format(date, 'MMM d'),
      value: parseFloat(value.toFixed(2)),
    });
  }

  // Ensure the last point is exactly the current value
  if (data.length > 0) {
    data[data.length - 1].value = currentValue;
  }

  return data;
}

export default function ValueChart({ currentValue = 0, history = [], isLoading = false }) {
  const chartData = history.length > 1
    ? history
    : generateMockHistory(currentValue);

  if (isLoading) {
    return (
      <div className="bg-surface border border-subtle rounded-2xl p-5">
        <div className="shimmer h-4 rounded w-40 mb-4" />
        <div className="shimmer h-48 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Portfolio Value
          </p>
          <p className="text-2xl font-bold text-text-primary mt-0.5">
            {formatCurrency(currentValue)}
          </p>
        </div>
        {history.length === 0 && (
          <span className="text-xs text-text-muted bg-elevated px-2 py-1 rounded-full">
            Simulated trend
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#portfolioGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
