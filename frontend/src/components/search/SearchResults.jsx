import CardImage from '../cards/CardImage.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';

function formatPrice(value) {
  if (value == null || isNaN(value)) return '—';
  return `$${Number(value).toFixed(2)}`;
}

function SearchCardSkeleton() {
  return (
    <div className="bg-card border border-subtle rounded-xl overflow-hidden animate-pulse">
      <div className="shimmer w-full aspect-[5/7]" />
      <div className="p-3 space-y-2">
        <div className="shimmer h-4 rounded w-3/4" />
        <div className="shimmer h-3 rounded w-1/2" />
        <div className="shimmer h-5 rounded w-1/3" />
        <div className="shimmer h-8 rounded" />
      </div>
    </div>
  );
}

function SearchCard({ card, onAdd }) {
  return (
    <div className="bg-card border border-subtle rounded-xl overflow-hidden flex flex-col group card-hover">
      <div className="relative">
        <CardImage
          src={card.image_url}
          alt={card.name}
          rounded="rounded-none"
          className="w-full"
        />
        <div className="absolute top-2 left-2">
          <Badge variant={card.category_hint === 'sealed' ? 'sealed' : 'single'}>
            {card.category_hint === 'sealed' ? 'Sealed' : 'Single'}
          </Badge>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm font-semibold text-text-primary line-clamp-2">{card.name}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {card.set_name}
            {card.number ? ` · #${card.number}` : ''}
          </p>
        </div>

        {card.rarity && (
          <Badge variant="default" className="w-fit text-[10px]">
            {card.rarity}
          </Badge>
        )}

        <p className="mt-auto text-[11px] text-text-muted">
          Price appears after adding to your collection
        </p>

        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => onAdd(card)}
        >
          + Add to Collection
        </Button>
      </div>
    </div>
  );
}

export default function SearchResults({ results, isLoading, isError, error, hasQuery, onAdd }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <SearchCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-loss/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-loss" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p className="text-text-primary font-semibold text-lg">Search failed</p>
        <p className="text-text-muted text-sm mt-1 max-w-sm">
          {error?.message || 'Could not fetch results. Make sure the backend is running.'}
        </p>
      </div>
    );
  }

  if (!hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <p className="text-text-primary font-semibold text-lg">Search for cards</p>
        <p className="text-text-muted text-sm mt-1">
          Type at least 2 characters to search the PokéWallet database
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-elevated flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-text-primary font-semibold text-lg">No results found</p>
        <p className="text-text-muted text-sm mt-1">
          Try a different search term or category
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {results.map((card) => (
        <SearchCard key={card.id} card={card} onAdd={onAdd} />
      ))}
    </div>
  );
}
