import { useQuery } from '@tanstack/react-query';
import { getExpansion, getExpansions } from '../api/expansions.js';

export function useExpansions(query = '') {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expansions', query],
    queryFn: () => getExpansions(query),
    staleTime: 1000 * 60 * 60,
  });

  return {
    expansions: data?.expansions ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
  };
}

export function useExpansion(expansionId, query = '', category = 'all') {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expansions', 'detail', expansionId, query, category],
    queryFn: () => getExpansion(expansionId, { q: query, category }),
    enabled: !!expansionId,
    staleTime: 1000 * 60 * 15,
  });

  return {
    expansion: data ?? null,
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
  };
}
