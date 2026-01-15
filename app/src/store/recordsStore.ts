import { create } from 'zustand';
import * as recordsService from '../services/records';
import * as recordTypesService from '../services/recordTypes';
import type { Record as RecordModel, RecordType, Template, RecordWithRecordType } from '../types';
import type { PageInfo, PaginatedResult } from '../services/pagination';
import type {
  RecordSearchResult,
  ReportSummary,
  RecordWithRecordType as ServiceRecordWithRecordType,
} from '../services/records';

// ============================================
// State Types for Pagination
// ============================================

interface RecordsListState {
  records: ServiceRecordWithRecordType[];
  pageInfo: PageInfo;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface RecordSearchState {
  query: string;
  results: RecordSearchResult[];
  isSearching: boolean;
}

interface RecordDetailState {
  record: ServiceRecordWithRecordType | null;
  reports: ReportSummary[];
  templates: Template[];
  isLoading: boolean;
  error: string | null;
}

const INITIAL_LIST_STATE: RecordsListState = {
  records: [],
  pageInfo: {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
  isLoading: false,
  isLoadingMore: false,
  error: null,
};

const INITIAL_SEARCH_STATE: RecordSearchState = {
  query: '',
  results: [],
  isSearching: false,
};

interface RecordsState {
  // ============================================
  // NEW: Paginated List State
  // ============================================
  list: RecordsListState;
  currentRecordTypeId: string | null;

  // NEW: Search State
  search: RecordSearchState;

  // NEW: Record Detail Cache (keyed by record ID)
  detailCache: Map<string, RecordDetailState>;
  currentRecordId: string | null;

  // ============================================
  // LEGACY: Original State (kept for backwards compatibility)
  // ============================================
  records: RecordModel[];
  recordTypes: RecordType[];
  currentRecord: RecordModel | null;
  currentRecordType: RecordType | null;
  recordTemplates: Template[];
  isLoading: boolean;
  error: string | null;

  // Legacy aliases for backwards compatibility
  sites: RecordModel[];
  currentSite: RecordModel | null;
  siteTemplates: Template[];

  // Record Type Actions
  fetchRecordTypes: () => Promise<void>;
  fetchDefaultRecordType: () => Promise<RecordType | null>;
  createRecordType: (recordType: Omit<RecordType, 'id' | 'created_at' | 'updated_at' | 'archived'>) => Promise<{ error: string | null; data: RecordType | null }>;
  updateRecordType: (recordTypeId: string, updates: Partial<RecordType>) => Promise<{ error: string | null }>;
  archiveRecordType: (recordTypeId: string) => Promise<{ error: string | null }>;
  setCurrentRecordType: (recordType: RecordType | null) => void;

  // Record Actions
  fetchRecords: () => Promise<void>;
  fetchRecordsByType: (recordTypeId: string) => Promise<void>;
  fetchRecordById: (recordId: string) => Promise<RecordModel | null>;
  fetchRecordTemplates: (recordId: string) => Promise<void>;
  createRecord: (record: Omit<RecordModel, 'id' | 'created_at' | 'updated_at' | 'archived'>) => Promise<{ error: string | null; data: RecordModel | null }>;
  updateRecord: (recordId: string, updates: Partial<RecordModel>) => Promise<{ error: string | null }>;
  archiveRecord: (recordId: string) => Promise<{ error: string | null }>;
  deleteRecord: (recordId: string) => Promise<{ error: string | null }>;
  setCurrentRecord: (record: RecordModel | null) => void;

  // Legacy aliases for backwards compatibility
  fetchSites: () => Promise<void>;
  fetchSiteById: (siteId: string) => Promise<RecordModel | null>;
  fetchSiteTemplates: (siteId: string) => Promise<void>;
  createSite: (site: Omit<RecordModel, 'id' | 'created_at' | 'updated_at' | 'archived'>) => Promise<{ error: string | null }>;
  updateSite: (siteId: string, updates: Partial<RecordModel>) => Promise<{ error: string | null }>;
  deleteSite: (siteId: string) => Promise<{ error: string | null }>;
  setCurrentSite: (site: RecordModel | null) => void;

  // ============================================
  // NEW: Paginated List Actions
  // ============================================
  fetchRecordsPaginated: (recordTypeId?: string) => Promise<void>;
  fetchMoreRecords: () => Promise<void>;
  refreshRecords: () => Promise<void>;
  setCurrentRecordTypeFilter: (recordTypeId: string | null) => void;

  // NEW: Search Actions
  setSearchQuery: (query: string) => void;
  searchRecords: (query: string, recordTypeId?: string) => Promise<void>;
  clearSearch: () => void;

  // NEW: Record Detail Actions
  fetchRecordDetail: (recordId: string) => Promise<void>;
  clearRecordDetail: () => void;
  getRecordDetail: (recordId: string) => RecordDetailState | undefined;

  // Utility
  clearError: () => void;
}

export const useRecordsStore = create<RecordsState>((set, get) => ({
  // ============================================
  // NEW: Paginated State
  // ============================================
  list: INITIAL_LIST_STATE,
  currentRecordTypeId: null,
  search: INITIAL_SEARCH_STATE,
  detailCache: new Map<string, RecordDetailState>(),
  currentRecordId: null,

  // ============================================
  // LEGACY: Original State
  // ============================================
  records: [],
  recordTypes: [],
  currentRecord: null,
  currentRecordType: null,
  recordTemplates: [],
  isLoading: false,
  error: null,

  // Legacy aliases - duplicate properties that stay in sync
  sites: [],
  currentSite: null,
  siteTemplates: [],

  // Record Type Actions
  fetchRecordTypes: async () => {
    set({ isLoading: true, error: null });

    const result = await recordTypesService.fetchRecordTypes();

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
    } else {
      set({ recordTypes: result.data, isLoading: false });
    }
  },

  fetchDefaultRecordType: async () => {
    set({ isLoading: true, error: null });

    const result = await recordTypesService.fetchDefaultRecordType();

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return null;
    }

    set({ currentRecordType: result.data, isLoading: false });
    return result.data;
  },

  createRecordType: async (recordType) => {
    set({ isLoading: true, error: null });

    const result = await recordTypesService.createRecordType(recordType);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message, data: null };
    }

    const { recordTypes } = get();
    set({
      recordTypes: [...recordTypes, result.data!].sort((a, b) => a.name.localeCompare(b.name)),
      isLoading: false,
    });

    return { error: null, data: result.data };
  },

  updateRecordType: async (recordTypeId, updates) => {
    set({ isLoading: true, error: null });

    const result = await recordTypesService.updateRecordType(recordTypeId, updates);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message };
    }

    const { recordTypes } = get();
    set({
      recordTypes: recordTypes.map((rt) => (rt.id === recordTypeId ? { ...rt, ...result.data } : rt)),
      currentRecordType: result.data,
      isLoading: false,
    });

    return { error: null };
  },

  archiveRecordType: async (recordTypeId) => {
    set({ isLoading: true, error: null });

    const result = await recordTypesService.archiveRecordType(recordTypeId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message };
    }

    const { recordTypes } = get();
    set({
      recordTypes: recordTypes.filter((rt) => rt.id !== recordTypeId),
      currentRecordType: null,
      isLoading: false,
    });

    return { error: null };
  },

  setCurrentRecordType: (recordType) => {
    set({ currentRecordType: recordType });
  },

  // Record Actions
  fetchRecords: async () => {
    set({ isLoading: true, error: null });

    const result = await recordsService.fetchRecords();

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
    } else {
      set({ records: result.data, sites: result.data, isLoading: false });
    }
  },

  fetchRecordsByType: async (recordTypeId: string) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.fetchRecordsByType(recordTypeId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
    } else {
      set({ records: result.data, sites: result.data, isLoading: false });
    }
  },

  fetchRecordById: async (recordId: string) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.fetchRecordById(recordId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return null;
    }

    set({ currentRecord: result.data, currentSite: result.data, isLoading: false });
    return result.data;
  },

  fetchRecordTemplates: async (recordId: string) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.fetchRecordTemplates(recordId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
    } else {
      set({ recordTemplates: result.data, siteTemplates: result.data, isLoading: false });
    }
  },

  createRecord: async (record) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.createRecord(record);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message, data: null };
    }

    const { records } = get();
    set({
      records: [...records, result.data!].sort((a, b) => a.name.localeCompare(b.name)),
      isLoading: false,
    });

    return { error: null, data: result.data };
  },

  updateRecord: async (recordId, updates) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.updateRecord(recordId, updates);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message };
    }

    const { records } = get();
    set({
      records: records.map((r) => (r.id === recordId ? { ...r, ...result.data } : r)),
      currentRecord: result.data,
      isLoading: false,
    });

    return { error: null };
  },

  archiveRecord: async (recordId) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.archiveRecord(recordId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message };
    }

    const { records } = get();
    set({
      records: records.filter((r) => r.id !== recordId),
      currentRecord: null,
      isLoading: false,
    });

    return { error: null };
  },

  deleteRecord: async (recordId) => {
    set({ isLoading: true, error: null });

    const result = await recordsService.deleteRecord(recordId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { error: result.error.message };
    }

    const { records } = get();
    set({
      records: records.filter((r) => r.id !== recordId),
      currentRecord: null,
      isLoading: false,
    });

    return { error: null };
  },

  setCurrentRecord: (record) => {
    set({ currentRecord: record, currentSite: record });
  },

  // Legacy aliases - these just call the new methods
  fetchSites: async () => {
    return get().fetchRecords();
  },

  fetchSiteById: async (siteId: string) => {
    return get().fetchRecordById(siteId);
  },

  fetchSiteTemplates: async (siteId: string) => {
    return get().fetchRecordTemplates(siteId);
  },

  createSite: async (site) => {
    const result = await get().createRecord(site);
    return { error: result.error };
  },

  updateSite: async (siteId, updates) => {
    return get().updateRecord(siteId, updates);
  },

  deleteSite: async (siteId) => {
    return get().deleteRecord(siteId);
  },

  setCurrentSite: (site) => {
    set({ currentRecord: site, currentSite: site });
  },

  // ============================================
  // NEW: Paginated List Actions
  // ============================================

  fetchRecordsPaginated: async (recordTypeId?: string) => {
    set((state) => ({
      list: { ...INITIAL_LIST_STATE, isLoading: true },
      currentRecordTypeId: recordTypeId ?? null,
    }));

    const result = await recordsService.fetchRecordsPaginated({
      recordTypeId,
      pagination: { limit: 25 },
    });

    set({
      list: {
        records: result.data,
        pageInfo: result.pageInfo,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      },
    });
  },

  fetchMoreRecords: async () => {
    const { list, currentRecordTypeId, search } = get();

    // Don't fetch if already loading or no more pages
    if (!list.pageInfo.hasNextPage || list.isLoadingMore) {
      return;
    }

    set((state) => ({
      list: { ...state.list, isLoadingMore: true },
    }));

    const result = await recordsService.fetchRecordsPaginated({
      recordTypeId: currentRecordTypeId ?? undefined,
      search: search.query || undefined,
      pagination: {
        limit: 25,
        cursor: list.pageInfo.endCursor,
        direction: 'forward',
      },
    });

    set((state) => ({
      list: {
        records: [...state.list.records, ...result.data],
        pageInfo: result.pageInfo,
        isLoading: false,
        isLoadingMore: false,
        error: null,
      },
    }));
  },

  refreshRecords: async () => {
    const { currentRecordTypeId } = get();
    await get().fetchRecordsPaginated(currentRecordTypeId ?? undefined);
  },

  setCurrentRecordTypeFilter: (recordTypeId) => {
    set({ currentRecordTypeId: recordTypeId });
  },

  // ============================================
  // NEW: Search Actions
  // ============================================

  setSearchQuery: (query) => {
    set((state) => ({
      search: { ...state.search, query },
    }));
  },

  searchRecords: async (query, recordTypeId) => {
    // Clear results for short queries
    if (query.length < 2) {
      set((state) => ({
        search: { ...state.search, results: [], isSearching: false },
      }));
      return;
    }

    set((state) => ({
      search: { ...state.search, isSearching: true },
    }));

    const result = await recordsService.searchRecords({
      query,
      recordTypeId,
      limit: 10,
    });

    set((state) => ({
      search: {
        ...state.search,
        results: result.data,
        isSearching: false,
      },
    }));
  },

  clearSearch: () => {
    set({ search: INITIAL_SEARCH_STATE });
  },

  // ============================================
  // NEW: Record Detail Actions
  // ============================================

  fetchRecordDetail: async (recordId) => {
    set({ currentRecordId: recordId });

    // Check cache first
    const cached = get().detailCache.get(recordId);
    if (cached && cached.record && !cached.error) {
      return; // Use cached data
    }

    // Set loading state in cache
    set((state) => {
      const newCache = new Map(state.detailCache);
      newCache.set(recordId, {
        record: null,
        reports: [],
        templates: [],
        isLoading: true,
        error: null,
      });
      return { detailCache: newCache };
    });

    // Fetch record, reports, and templates in parallel
    const [recordResult, reportsResult, templatesResult] = await Promise.all([
      recordsService.fetchRecordWithType(recordId),
      recordsService.fetchRecordReportsSummary(recordId),
      recordsService.fetchRecordTemplates(recordId),
    ]);

    set((state) => {
      const newCache = new Map(state.detailCache);
      newCache.set(recordId, {
        record: recordResult.data,
        reports: reportsResult.data,
        templates: templatesResult.data,
        isLoading: false,
        error: recordResult.error?.message ?? null,
      });
      return { detailCache: newCache };
    });
  },

  clearRecordDetail: () => {
    set({ currentRecordId: null });
  },

  getRecordDetail: (recordId) => {
    return get().detailCache.get(recordId);
  },

  // ============================================
  // Utility
  // ============================================

  clearError: () => {
    set({ error: null });
  },
}));

// Legacy alias
/** @deprecated Use useRecordsStore instead */
export const useSitesStore = useRecordsStore;
