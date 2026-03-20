import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set) => ({
      // Search state
      searchCategory: 'all', // 'all' | 'single' | 'sealed'
      setSearchCategory: (category) => set({ searchCategory: category }),

      // View mode for collection
      viewMode: 'binder', // 'binder' | 'list'
      setViewMode: (mode) => set({ viewMode: mode }),

      // Card size preference (also synced to settings)
      cardSize: 'xl', // 'sm' | 'md' | 'lg' | 'xl'
      setCardSize: (size) => set({ cardSize: size }),

      // Collection filters
      filters: {
        category: 'all',
        set_code: '',
        condition: '',
        language: '',
        sort: 'added_desc',
      },
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      resetFilters: () =>
        set({
          filters: {
            category: 'all',
            set_code: '',
            condition: '',
            language: '',
            sort: 'added_desc',
          },
        }),

      // Selected item (for modals)
      selectedItem: null,
      setSelectedItem: (item) => set({ selectedItem: item }),
      clearSelectedItem: () => set({ selectedItem: null }),

      // Add-to-collection modal state
      addModalCard: null,   // the search result card to add
      setAddModalCard: (card) => set({ addModalCard: card }),
      clearAddModalCard: () => set({ addModalCard: null }),

      // Sidebar collapse state
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'dustycards-ui',
      // Only persist view preferences, not modal states
      partialize: (state) => ({
        viewMode: state.viewMode,
        cardSize: state.cardSize,
        searchCategory: state.searchCategory,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
);

export default useStore;
