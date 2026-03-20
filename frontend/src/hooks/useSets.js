import { useQuery } from '@tanstack/react-query';
import { getSets } from '../api/sets.js';

/**
 * Hook to fetch all TCG sets (cached 1hr).
 */
export function useSets() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sets'],
    queryFn: getSets,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return {
    sets: data?.sets ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
  };
}
