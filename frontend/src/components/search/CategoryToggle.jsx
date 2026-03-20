import clsx from 'clsx';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'single', label: 'Singles' },
  { value: 'sealed', label: 'Sealed' },
];

export default function CategoryToggle({ value, onChange, className = '' }) {
  return (
    <div
      className={clsx(
        'inline-flex items-center bg-elevated border border-subtle rounded-lg p-1 gap-1',
        className,
      )}
    >
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={clsx(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
            value === cat.value
              ? 'bg-accent-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-card',
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
