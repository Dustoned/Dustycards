import clsx from 'clsx';
import Spinner from '../ui/Spinner.jsx';

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search cards...',
  isLoading = false,
  className = '',
}) {
  return (
    <div className={clsx('relative flex items-center', className)}>
      {/* Search icon */}
      <div className="absolute left-3 pointer-events-none">
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <svg
            className="w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          'w-full bg-elevated border border-subtle rounded-xl pl-10 pr-10 py-3',
          'text-text-primary placeholder-text-muted',
          'focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20',
          'transition-all duration-150 text-base',
        )}
        autoComplete="off"
        spellCheck="false"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 p-1 rounded-md text-text-muted hover:text-text-primary transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
