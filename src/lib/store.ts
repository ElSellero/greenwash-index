'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SelectionState = {
  selectedPersonId: number | null;
  selectedVehicleId: number | null;
  select: (personId: number | null, vehicleId?: number | null) => void;
  favorites: number[]; // person ids, persisted to localStorage
  toggleFavorite: (personId: number) => void;
  search: string;
  setSearch: (q: string) => void;
  rankMode: '12m' | 'all'; // leaderboard window: rolling 12 months vs all-time
  setRankMode: (m: '12m' | 'all') => void;
};

export const useAppStore = create<SelectionState>()(
  persist(
    (set, get) => ({
      selectedPersonId: null,
      selectedVehicleId: null,
      select: (personId, vehicleId = null) =>
        set({ selectedPersonId: personId, selectedVehicleId: vehicleId }),
      favorites: [],
      toggleFavorite: (personId) =>
        set({
          favorites: get().favorites.includes(personId)
            ? get().favorites.filter((id) => id !== personId)
            : [...get().favorites, personId],
        }),
      search: '',
      setSearch: (q) => set({ search: q }),
      rankMode: '12m',
      setRankMode: (m) => set({ rankMode: m }),
    }),
    {
      name: 'greenwash-index', // localStorage key — functional only, no consent needed
      partialize: (s) => ({ favorites: s.favorites }),
    },
  ),
);
