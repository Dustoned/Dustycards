import { useState } from 'react';
import { useSearch } from '../hooks/useSearch.js';
import SearchBar from '../components/search/SearchBar.jsx';
import CategoryToggle from '../components/search/CategoryToggle.jsx';
import SearchResults from '../components/search/SearchResults.jsx';
import AddToCollectionModal from '../components/collection/AddToCollectionModal.jsx';
import useStore from '../store/useStore.js';

export default function Search() {
  const { searchCategory, setSearchCategory } = useStore();
  const { query, setQuery, clearQuery, results, total, isLoading, isFetching, isError, error, hasQuery } =
    useSearch(searchCategory);

  const [addCard, setAddCard] = useState(null);

  function handleAdd(card) {
    setAddCard(card);
  }

  function handleModalClose() {
    setAddCard(null);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Search controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={clearQuery}
          isLoading={isFetching && hasQuery}
          placeholder="Search for cards, sets, products..."
          className="flex-1"
        />
        <CategoryToggle
          value={searchCategory}
          onChange={setSearchCategory}
        />
      </div>

      {/* Results summary */}
      {hasQuery && !isLoading && !isError && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {total > 0 ? (
              <>
                <span className="text-text-primary font-medium">{total}</span> results for{' '}
                <span className="text-text-primary font-medium">"{query}"</span>
              </>
            ) : (
              'No results'
            )}
          </p>
        </div>
      )}

      {/* Results grid */}
      <SearchResults
        results={results}
        isLoading={isLoading}
        isError={isError}
        error={error}
        hasQuery={hasQuery}
        onAdd={handleAdd}
      />

      {/* Add to collection modal */}
      <AddToCollectionModal
        card={addCard}
        isOpen={!!addCard}
        onClose={handleModalClose}
      />
    </div>
  );
}
