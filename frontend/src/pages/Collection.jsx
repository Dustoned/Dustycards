import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection.js';
import BinderView from '../components/collection/BinderView.jsx';
import ListView from '../components/collection/ListView.jsx';
import FilterBar from '../components/collection/FilterBar.jsx';
import CardModal from '../components/cards/CardModal.jsx';
import Button from '../components/ui/Button.jsx';
import useStore from '../store/useStore.js';
import clsx from 'clsx';

const CATEGORY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'single', label: 'Singles' },
  { value: 'sealed', label: 'Sealed' },
];

export default function Collection() {
  const { viewMode, setViewMode, filters, setFilter } = useStore();
  const { items, total, isLoading, isError, error } = useCollection();
  const [selectedCard, setSelectedCard] = useState(null);

  function handleCardClick(item) {
    setSelectedCard(item);
  }

  function handleModalClose() {
    setSelectedCard(null);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Category tabs */}
        <div className="flex items-center gap-1 bg-elevated border border-subtle rounded-lg p-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter('category', tab.value)}
              className={clsx(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                filters.category === tab.value
                  ? 'bg-accent-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-card',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Total count */}
          <span className="text-sm text-text-muted">
            {isLoading ? '…' : `${total} item${total !== 1 ? 's' : ''}`}
          </span>

          {/* View mode toggle */}
          <div className="flex items-center bg-elevated border border-subtle rounded-lg p-1">
            <button
              onClick={() => setViewMode('binder')}
              className={clsx(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'binder'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-muted hover:text-text-primary',
              )}
              aria-label="Binder view"
              title="Binder view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-muted hover:text-text-primary',
              )}
              aria-label="List view"
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar />

      {/* Error state */}
      {isError && (
        <div className="bg-loss/10 border border-loss/20 rounded-xl p-4 text-center">
          <p className="text-loss font-medium">Failed to load collection</p>
          <p className="text-sm text-text-muted mt-1">{error?.message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-elevated flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Your collection is empty</h3>
          <p className="text-text-muted text-sm max-w-sm mb-6">
            Search for Pokémon cards and sealed products to start building your collection.
          </p>
          <Link to="/search">
            <Button variant="primary">
              Search for Cards
            </Button>
          </Link>
        </div>
      )}

      {/* Card views */}
      {!isError && (items.length > 0 || isLoading) && (
        viewMode === 'binder' ? (
          <BinderView items={items} isLoading={isLoading} onCardClick={handleCardClick} />
        ) : (
          <ListView items={items} isLoading={isLoading} onCardClick={handleCardClick} />
        )
      )}

      {/* Card detail modal */}
      <CardModal
        item={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleModalClose}
      />
    </div>
  );
}
