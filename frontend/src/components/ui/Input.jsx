import clsx from 'clsx';

export default function Input({
  label,
  error,
  hint,
  className = '',
  inputClassName = '',
  prefix,
  suffix,
  ...props
}) {
  const id = props.id || props.name;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-text-muted text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          className={clsx(
            'w-full bg-elevated border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted',
            'focus:outline-none focus:ring-1 focus:border-accent-primary focus:ring-accent-primary/30',
            'transition-colors duration-150',
            error ? 'border-loss' : 'border-subtle',
            prefix && 'pl-7',
            suffix && 'pr-7',
            inputClassName,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-text-muted text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-loss">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, hint, className = '', children, ...props }) {
  const id = props.id || props.name;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        id={id}
        className={clsx(
          'w-full bg-elevated border rounded-lg px-3 py-2 text-sm text-text-primary',
          'focus:outline-none focus:ring-1 focus:border-accent-primary focus:ring-accent-primary/30',
          'transition-colors duration-150 appearance-none',
          error ? 'border-loss' : 'border-subtle',
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-loss">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className = '', ...props }) {
  const id = props.id || props.name;

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={clsx(
          'w-full bg-elevated border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted',
          'focus:outline-none focus:ring-1 focus:border-accent-primary focus:ring-accent-primary/30',
          'transition-colors duration-150 resize-none',
          error ? 'border-loss' : 'border-subtle',
        )}
        {...props}
      />
      {error && <p className="text-xs text-loss">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
