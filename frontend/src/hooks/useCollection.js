import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCollection,
  addToCollection,
  updateCollectionItem,
  removeFromCollection,
} from '../api/collection.js';
import useStore from '../store/useStore.js';

const COLLECTION_KEY = ['collection'];

/**
 * Hook for reading the collection with active filters.
 */
export function useCollection() {
  const { filters } = useStore();

  // Build params, omitting empty values
  const params = {};
  if (filters.category && filters.category !== 'all') params.category = filters.category;
  if (filters.set_code) params.set_code = filters.set_code;
  if (filters.condition) params.condition = filters.condition;
  if (filters.language) params.language = filters.language;
  if (filters.sort) params.sort = filters.sort;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...COLLECTION_KEY, params],
    queryFn: () => getCollection(params),
    staleTime: 1000 * 30, // 30 seconds — collection is user-owned data, keep fairly fresh
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook for the unfiltered collection (used by dashboard for stats).
 */
export function useAllCollection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...COLLECTION_KEY, 'all'],
    queryFn: () => getCollection(),
    staleTime: 1000 * 30,
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError,
    error,
  };
}

/**
 * Mutation hooks for collection CRUD.
 */
export function useCollectionMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: COLLECTION_KEY });
  };

  const addMutation = useMutation({
    mutationFn: addToCollection,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => updateCollectionItem(id, updates),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromCollection,
    onSuccess: invalidate,
  });

  return {
    addItem: addMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    addError: addMutation.error,
    updateError: updateMutation.error,
    removeError: removeMutation.error,
  };
}
