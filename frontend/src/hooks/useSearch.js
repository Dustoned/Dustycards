import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchCards } from '../api/cards.js';

const DEBOUNCE_MS = 300;

/**
 * Debounced search hook with TanStack Query.
 * @param {string} category - 'all' | 'single' | 'sealed'
 */
export function useSearch(category = 'all') {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef(null);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, DEBOUNCE_MS);
  }, []);

  const clearQuery = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const { data, isLoading, isFetching, error, isError } = useQuery({
    queryKey: ['cards', 'search', debouncedQuery, category],
    queryFn: () => searchCards(debouncedQuery, category),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
    placeholderData: (prev) => prev,
  });

  return {
    query,
    setQuery: handleQueryChange,
    clearQuery,
    results: data?.results ?? [],
    total: data?.total ?? 0,
    isLoading: isLoading && debouncedQuery.length >= 2,
    isFetching,
    isError,
    error,
    hasQuery: debouncedQuery.length >= 2,
  };
}
