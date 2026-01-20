/**
 * Quick Start Store
 * Manages quick-start data for the dashboard (drafts, recent combinations)
 */

import { create } from 'zustand';
import * as usageTracking from '../services/usageTracking';
import type {
  DraftReport,
  RecentUsageCombination,
} from '../services/usageTracking';

interface QuickStartStoreState {
  // Data
  drafts: DraftReport[];
  recentCombinations: RecentUsageCombination[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Timestamps for cache management
  lastFetched: number | null;

  // Actions
  fetchQuickStartData: (userId: string) => Promise<void>;
  refreshDrafts: (userId: string) => Promise<void>;
  refreshRecentCombinations: (userId: string) => Promise<void>;
  clearCache: () => void;
  reset: () => void;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useQuickStartStore = create<QuickStartStoreState>((set, get) => ({
  // Initial state
  drafts: [],
  recentCombinations: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  // Fetch all quick-start data
  fetchQuickStartData: async (userId: string) => {
    // Check cache
    const { lastFetched } = get();
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      return; // Use cached data
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await usageTracking.getQuickStartData(userId);

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({
        drafts: data.drafts,
        recentCombinations: data.recentCombinations,
        isLoading: false,
        lastFetched: Date.now(),
      });
    } catch (err) {
      console.error('Error fetching quick start data:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch quick start data',
        isLoading: false,
      });
    }
  },

  // Refresh drafts only
  refreshDrafts: async (userId: string) => {
    try {
      const { data, error } = await usageTracking.getDraftReports(userId, 3);

      if (error) {
        console.error('Error refreshing drafts:', error.message);
        return;
      }

      set({ drafts: data });
    } catch (err) {
      console.error('Error refreshing drafts:', err);
    }
  },

  // Refresh recent combinations only
  refreshRecentCombinations: async (userId: string) => {
    try {
      const { data, error } = await usageTracking.getRecentCombinations(userId, 5);

      if (error) {
        console.error('Error refreshing recent combinations:', error.message);
        return;
      }

      set({ recentCombinations: data });
    } catch (err) {
      console.error('Error refreshing recent combinations:', err);
    }
  },

  // Clear cache to force refresh
  clearCache: () => {
    set({ lastFetched: null });
  },

  // Reset store
  reset: () => {
    set({
      drafts: [],
      recentCombinations: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    });
  },
}));
