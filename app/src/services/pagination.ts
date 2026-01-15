/**
 * Pagination utilities for cursor-based pagination with Supabase
 * Uses created_at + id compound cursor for consistent performance at scale
 */

// ============================================
// Types
// ============================================

export interface PaginationParams {
  /** Number of records per page (default: 25) */
  limit?: number;
  /** Encoded cursor for the next/previous page */
  cursor?: string | null;
  /** Direction of pagination */
  direction?: 'forward' | 'backward';
}

export interface PageInfo {
  /** Whether there are more records after this page */
  hasNextPage: boolean;
  /** Whether there are records before this page */
  hasPreviousPage: boolean;
  /** Cursor for the first item in the current page */
  startCursor: string | null;
  /** Cursor for the last item in the current page */
  endCursor: string | null;
  /** Total count of records (optional - can be expensive) */
  totalCount?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pageInfo: PageInfo;
}

export interface CursorData {
  /** Timestamp for cursor positioning */
  timestamp: string;
  /** Record ID for tie-breaking */
  id: string;
}

// ============================================
// Constants
// ============================================

/** Default number of records per page */
export const DEFAULT_PAGE_SIZE = 25;

/** Minimum allowed page size */
export const MIN_PAGE_SIZE = 1;

/** Maximum allowed page size */
export const MAX_PAGE_SIZE = 100;

// ============================================
// Cursor Utilities
// ============================================

/**
 * Encode cursor data into a base64 string
 * Uses JSON serialization for flexibility
 */
export function encodeCursor(timestamp: string, id: string): string {
  const data: CursorData = { timestamp, id };
  // Use btoa for React Native compatibility
  return btoa(JSON.stringify(data));
}

/**
 * Decode a cursor string back to cursor data
 * Returns null if the cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    // Use atob for React Native compatibility
    const decoded = atob(cursor);
    const data = JSON.parse(decoded) as CursorData;

    // Validate the cursor data
    if (!data.timestamp || !data.id) {
      console.warn('[Pagination] Invalid cursor data - missing fields');
      return null;
    }

    return data;
  } catch (error) {
    console.warn('[Pagination] Failed to decode cursor:', error);
    return null;
  }
}

/**
 * Create cursor from a record with created_at and id fields
 */
export function createCursorFromRecord<T extends { created_at: string; id: string }>(
  record: T
): string {
  return encodeCursor(record.created_at, record.id);
}

// ============================================
// Pagination Helpers
// ============================================

/**
 * Get validated page size within allowed bounds
 */
export function getValidPageSize(limit?: number): number {
  if (!limit) return DEFAULT_PAGE_SIZE;
  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, limit));
}

/**
 * Process paginated results to determine page info
 * Expects data fetched with limit + 1 to check for next page
 */
export function processPaginatedResults<T extends { created_at: string; id: string }>(
  data: T[],
  limit: number,
  cursor: string | null | undefined
): PaginatedResult<T> {
  const hasMore = data.length > limit;
  const pageData = hasMore ? data.slice(0, limit) : data;

  return {
    data: pageData,
    pageInfo: {
      hasNextPage: hasMore,
      hasPreviousPage: !!cursor,
      startCursor: pageData.length > 0 ? createCursorFromRecord(pageData[0]) : null,
      endCursor: pageData.length > 0 ? createCursorFromRecord(pageData[pageData.length - 1]) : null,
    },
  };
}

/**
 * Empty paginated result for error cases
 */
export function emptyPaginatedResult<T>(): PaginatedResult<T> {
  return {
    data: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  };
}
