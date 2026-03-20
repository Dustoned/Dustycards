import clsx from 'clsx';

const variants = {
  default: 'bg-elevated text-text-secondary border border-subtle',
  blue: 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20',
  green: 'bg-gain/10 text-gain border border-gain/20',
  red: 'bg-loss/10 text-loss border border-loss/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  single: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  sealed: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  NM: 'bg-gain/10 text-gain border border-gain/20',
  LP: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  GD: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  HP: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  DMG: 'bg-loss/10 text-loss border border-loss/20',
  Mint: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'Near Mint': 'bg-gain/10 text-gain border border-gain/20',
  Excellent: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  Good: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'Light Played': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  Played: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  Poor: 'bg-loss/10 text-loss border border-loss/20',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant] || variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
