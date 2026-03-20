import clsx from 'clsx';
import Spinner from './Spinner.jsx';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-base';

  const variants = {
    primary: 'bg-accent-primary hover:bg-accent-hover text-white focus:ring-accent-primary',
    secondary:
      'bg-elevated hover:bg-card text-text-primary border border-subtle hover:border-accent focus:ring-accent-primary',
    danger: 'bg-loss/10 hover:bg-loss/20 text-loss border border-loss/20 focus:ring-loss',
    ghost: 'hover:bg-elevated text-text-secondary hover:text-text-primary focus:ring-accent-primary',
    outline:
      'border border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white focus:ring-accent-primary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    icon: 'p-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
