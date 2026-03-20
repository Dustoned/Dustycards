import clsx from 'clsx';

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-[3px]',
    xl: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={clsx(
        'rounded-full border-surface border-t-accent-primary animate-spin',
        sizes[size] || sizes.md,
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
