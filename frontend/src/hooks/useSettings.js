import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/settings.js';

const SETTINGS_KEY = ['settings'];

/**
 * Hook to read and update app settings.
 */
export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, error } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getSettings,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(SETTINGS_KEY, updated);
      // Re-fetch collection if price source changed — prices come from backend based on this setting
      if (variables.priceSource !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['collection'] });
        queryClient.invalidateQueries({ queryKey: ['cards', 'search'] });
        queryClient.invalidateQueries({ queryKey: ['cards'] });
      }
    },
  });

  return {
    settings: settings ?? {
      priceSource: 'cardmarket',
      priceType: 'low',
      currency: 'EUR',
      cardSize: 'xl',
      theme: 'dark',
      defaultCondition: 'Near Mint',
      defaultLanguage: 'EN',
    },
    isLoading,
    isError,
    error,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  };
}
