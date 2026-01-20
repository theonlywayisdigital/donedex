import { supabase } from './supabase';
import type { Record as RecordModel, RecordType, Template } from '../types';
import {
  type PaginationParams,
  type PaginatedResult,
  getValidPageSize,
  decodeCursor,
  processPaginatedResults,
  emptyPaginatedResult,
} from './pagination';

// Re-export types for convenience
export type { RecordModel as Record };

export interface RecordsResult {
  data: RecordModel[];
  error: { message: string } | null;
}

export interface RecordResult {
  data: RecordModel | null;
  error: { message: string } | null;
}

export interface RecordWithRecordType extends RecordModel {
  record_type: RecordType;
}

export interface RecordsWithRecordTypeResult {
  data: RecordWithRecordType[];
  error: { message: string } | null;
}

/**
 * Fetch all records the current user has access to
 * - Admins/owners see all organisation records
 * - Regular users see only records assigned to them
 * - Filters out archived records AND records whose record type is archived
 */
export async function fetchRecords(): Promise<RecordsResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*, record_type:record_types(id, archived)')
      .eq('archived', false)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    // Filter out records whose record type is archived or missing
    // Then strip out the record_type join data
    const records = (data || [])
      .filter((r: any) => {
        // Exclude if record_type is null, undefined, empty, or archived
        if (!r.record_type) return false;
        if (typeof r.record_type !== 'object') return false;
        if (!r.record_type.id) return false; // Empty object check
        if (r.record_type.archived === true) return false;
        return true;
      })
      .map((r: any) => {
        const { record_type, ...record } = r;
        return record as RecordModel;
      });

    return { data: records, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch records';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch all records with their record type info
 */
export async function fetchRecordsWithRecordType(): Promise<RecordsWithRecordTypeResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select(`
        *,
        record_type:record_types (*)
      `)
      .eq('archived', false)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return { data: (data as RecordWithRecordType[]) || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch records with record type';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch records by record type
 */
export async function fetchRecordsByType(recordTypeId: string): Promise<RecordsResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('record_type_id', recordTypeId)
      .eq('archived', false)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return { data: (data as RecordModel[]) || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch records by type';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a single record by ID
 */
export async function fetchRecordById(recordId: string): Promise<RecordResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as RecordModel, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch record';
    return { data: null, error: { message } };
  }
}

/**
 * Create a new record (admin only)
 */
export async function createRecord(
  record: Omit<RecordModel, 'id' | 'created_at' | 'updated_at' | 'archived'>
): Promise<RecordResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .insert(record as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as RecordModel, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create record';
    return { data: null, error: { message } };
  }
}

/**
 * Update an existing record (admin only)
 */
export async function updateRecord(
  recordId: string,
  updates: Partial<Omit<RecordModel, 'id' | 'created_at' | 'updated_at' | 'organisation_id' | 'record_type_id'>>
): Promise<RecordResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .update(updates as never)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as RecordModel, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update record';
    return { data: null, error: { message } };
  }
}

/**
 * Archive a record (soft delete - admin only)
 */
export async function archiveRecord(recordId: string): Promise<{ error: { message: string } | null }> {
  try {
    const { error } = await supabase
      .from('records')
      .update({ archived: true } as never)
      .eq('id', recordId);

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to archive record';
    return { error: { message } };
  }
}

/**
 * Delete a record permanently (admin only)
 * Use archiveRecord for soft delete instead
 */
export async function deleteRecord(recordId: string): Promise<{ error: { message: string } | null }> {
  try {
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId);

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete record';
    return { error: { message } };
  }
}

/**
 * Fetch all published templates for the organisation
 * Templates are organisation-wide (not associated to specific records)
 */
export async function fetchPublishedTemplates(): Promise<{ data: Template[]; error: { message: string } | null }> {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_published', true)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return { data: (data as Template[]) || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch templates';
    return { data: [], error: { message } };
  }
}

/**
 * @deprecated Use fetchPublishedTemplates() instead - templates are organisation-wide, not record-specific
 */
export async function fetchRecordTemplates(
  _recordId: string
): Promise<{ data: Template[]; error: { message: string } | null }> {
  return fetchPublishedTemplates();
}

// ============================================
// Paginated & Search Functions
// ============================================

export interface FetchRecordsPaginatedOptions {
  /** Filter by record type ID */
  recordTypeId?: string;
  /** Search query (searches name and address) */
  search?: string;
  /** Pagination parameters */
  pagination?: PaginationParams;
  /** Sort field */
  sortBy?: 'name' | 'created_at' | 'updated_at';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Fetch records with cursor-based pagination
 * Supports filtering by record type, search, and sorting
 */
export async function fetchRecordsPaginated(
  options: FetchRecordsPaginatedOptions = {}
): Promise<PaginatedResult<RecordWithRecordType>> {
  try {
    const {
      recordTypeId,
      search,
      pagination = {},
      sortBy = 'name',
      sortDirection = 'asc',
    } = options;

    const { cursor, direction = 'forward' } = pagination;
    const limit = getValidPageSize(pagination.limit);
    // Fetch one extra to determine if there's a next page
    const fetchLimit = limit + 1;

    let query = supabase
      .from('records')
      .select(
        `
        *,
        record_type:record_types (*)
      `,
        { count: 'exact' }
      )
      .eq('archived', false);

    // Apply record type filter
    if (recordTypeId) {
      query = query.eq('record_type_id', recordTypeId);
    }

    // Apply search filter (name or address)
    if (search && search.trim().length >= 2) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`);
    }

    // Apply cursor pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData) {
        // For cursor-based pagination, we need to filter based on sort field
        // Using created_at for cursor positioning
        if (direction === 'forward') {
          if (sortDirection === 'asc') {
            query = query.or(
              `created_at.gt.${cursorData.timestamp},and(created_at.eq.${cursorData.timestamp},id.gt.${cursorData.id})`
            );
          } else {
            query = query.or(
              `created_at.lt.${cursorData.timestamp},and(created_at.eq.${cursorData.timestamp},id.lt.${cursorData.id})`
            );
          }
        }
      }
    }

    // Apply sorting - use created_at for consistent cursor pagination
    query = query
      .order('created_at', { ascending: sortDirection === 'asc' })
      .order('id', { ascending: true })
      .limit(fetchLimit);

    const { data, error, count } = await query;

    if (error) {
      return emptyPaginatedResult();
    }

    const records = (data || []) as RecordWithRecordType[];
    const result = processPaginatedResults(records, limit, cursor);

    // Add total count if available
    if (count !== null) {
      result.pageInfo.totalCount = count;
    }

    return result;
  } catch {
    return emptyPaginatedResult();
  }
}

/**
 * Quick search for records - returns minimal data for autocomplete/picker
 * Limited to 10 results for performance
 */
export interface RecordSearchResult {
  id: string;
  name: string;
  address: string | null;
  record_type: {
    id: string;
    name: string;
    name_singular: string | null;
    icon: string | null;
    color: string | null;
  };
}

export interface SearchRecordsOptions {
  /** Search query (min 2 characters) */
  query: string;
  /** Optional record type filter */
  recordTypeId?: string;
  /** Max results (default: 10) */
  limit?: number;
}

export async function searchRecords(
  options: SearchRecordsOptions
): Promise<{ data: RecordSearchResult[]; error: { message: string } | null }> {
  try {
    const { query, recordTypeId, limit = 10 } = options;

    // Require at least 2 characters for search
    if (!query || query.trim().length < 2) {
      return { data: [], error: null };
    }

    const searchTerm = `%${query.trim()}%`;

    let dbQuery = supabase
      .from('records')
      .select(
        `
        id,
        name,
        address,
        record_type:record_types (
          id,
          name,
          name_singular,
          icon,
          color
        )
      `
      )
      .eq('archived', false)
      .or(`name.ilike.${searchTerm},address.ilike.${searchTerm}`)
      .order('name', { ascending: true })
      .limit(limit);

    if (recordTypeId) {
      dbQuery = dbQuery.eq('record_type_id', recordTypeId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    return { data: (data || []) as RecordSearchResult[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search records';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch a record with its record type (for detail page)
 */
export async function fetchRecordWithType(
  recordId: string
): Promise<{ data: RecordWithRecordType | null; error: { message: string } | null }> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select(
        `
        *,
        record_type:record_types (*)
      `
      )
      .eq('id', recordId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as RecordWithRecordType, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch record with type';
    return { data: null, error: { message } };
  }
}

/**
 * Report summary for record detail page
 */
export interface ReportSummary {
  id: string;
  status: 'draft' | 'submitted';
  started_at: string;
  submitted_at: string | null;
  created_at: string;
  template_name: string;
  user_name: string | null;
}

/**
 * Fetch report summaries for a record (for detail page Reports tab)
 */
export async function fetchRecordReportsSummary(
  recordId: string,
  limit: number = 20
): Promise<{ data: ReportSummary[]; error: { message: string } | null }> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        id,
        status,
        started_at,
        submitted_at,
        created_at,
        template:templates (name),
        user_profile:user_profiles (full_name)
      `
      )
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: [], error: { message: error.message } };
    }

    // Transform to summary format
    const summaries: ReportSummary[] = ((data as unknown[]) || []).map((report: unknown) => {
      const r = report as {
        id: string;
        status: 'draft' | 'submitted';
        started_at: string;
        submitted_at: string | null;
        created_at: string;
        template: { name: string } | null;
        user_profile: { full_name: string } | null;
      };
      return {
        id: r.id,
        status: r.status,
        started_at: r.started_at,
        submitted_at: r.submitted_at,
        created_at: r.created_at,
        template_name: r.template?.name || 'Unknown Template',
        user_name: r.user_profile?.full_name || null,
      };
    });

    return { data: summaries, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch record reports';
    return { data: [], error: { message } };
  }
}

/**
 * Fetch paginated reports for a record (for "View All" reports)
 */
export async function fetchRecordReportsPaginated(
  recordId: string,
  pagination: PaginationParams = {}
): Promise<PaginatedResult<ReportSummary>> {
  try {
    const { cursor, direction = 'forward' } = pagination;
    const limit = getValidPageSize(pagination.limit);
    const fetchLimit = limit + 1;

    let query = supabase
      .from('reports')
      .select(
        `
        id,
        status,
        started_at,
        submitted_at,
        created_at,
        template:templates (name),
        user_profile:user_profiles (full_name)
      `,
        { count: 'exact' }
      )
      .eq('record_id', recordId);

    // Apply cursor pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData) {
        // Descending order - so "forward" means older records
        query = query.lt('created_at', cursorData.timestamp);
      }
    }

    query = query.order('created_at', { ascending: false }).limit(fetchLimit);

    const { data, error, count } = await query;

    if (error) {
      return emptyPaginatedResult();
    }

    // Transform to summary format
    const reports: (ReportSummary & { created_at: string; id: string })[] = (
      (data as unknown[]) || []
    ).map((report: unknown) => {
      const r = report as {
        id: string;
        status: 'draft' | 'submitted';
        started_at: string;
        submitted_at: string | null;
        created_at: string;
        template: { name: string } | null;
        user_profile: { full_name: string } | null;
      };
      return {
        id: r.id,
        status: r.status,
        started_at: r.started_at,
        submitted_at: r.submitted_at,
        created_at: r.created_at,
        template_name: r.template?.name || 'Unknown Template',
        user_name: r.user_profile?.full_name || null,
      };
    });

    const result = processPaginatedResults(reports, limit, cursor);

    if (count !== null) {
      result.pageInfo.totalCount = count;
    }

    return result;
  } catch {
    return emptyPaginatedResult();
  }
}

// ============================================
// Filtered Reports for Record Detail Page
// ============================================

/**
 * Filter options for fetching reports
 */
export interface ReportFilters {
  templateId?: string | null;
  status?: 'all' | 'submitted' | 'draft';
  dateFrom?: string | null; // ISO date string
  dateTo?: string | null; // ISO date string
  userId?: string | null;
  search?: string;
}

/**
 * Extended report summary with template_id for filtering
 */
export interface ReportSummaryExtended extends ReportSummary {
  template_id: string;
  user_id: string | null;
}

/**
 * Fetch filtered and paginated reports for a record
 * Supports filtering by template, status, date range, user, and search
 */
export async function fetchRecordReportsFiltered(
  recordId: string,
  filters: ReportFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResult<ReportSummaryExtended>> {
  try {
    const { templateId, status, dateFrom, dateTo, userId, search } = filters;
    const { cursor } = pagination;
    const limit = getValidPageSize(pagination.limit);
    const fetchLimit = limit + 1;

    let query = supabase
      .from('reports')
      .select(
        `
        id,
        status,
        started_at,
        submitted_at,
        created_at,
        template_id,
        user_id,
        template:templates (name),
        user_profile:user_profiles (full_name)
      `,
        { count: 'exact' }
      )
      .eq('record_id', recordId);

    // Apply template filter
    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    // Apply status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    // Apply user filter
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply search filter (searches template name via a subquery approach)
    // Note: For search, we fetch and filter client-side since Supabase doesn't support
    // searching across joined tables efficiently

    // Apply cursor pagination
    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (cursorData) {
        query = query.lt('created_at', cursorData.timestamp);
      }
    }

    query = query.order('created_at', { ascending: false }).limit(fetchLimit);

    const { data, error, count } = await query;

    if (error) {
      return emptyPaginatedResult();
    }

    // Transform to summary format
    let reports: (ReportSummaryExtended & { created_at: string; id: string })[] = (
      (data as unknown[]) || []
    ).map((report: unknown) => {
      const r = report as {
        id: string;
        status: 'draft' | 'submitted';
        started_at: string;
        submitted_at: string | null;
        created_at: string;
        template_id: string;
        user_id: string | null;
        template: { name: string } | null;
        user_profile: { full_name: string } | null;
      };
      return {
        id: r.id,
        status: r.status,
        started_at: r.started_at,
        submitted_at: r.submitted_at,
        created_at: r.created_at,
        template_id: r.template_id,
        user_id: r.user_id,
        template_name: r.template?.name || 'Unknown Template',
        user_name: r.user_profile?.full_name || null,
      };
    });

    // Apply client-side search filter if provided
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      reports = reports.filter(
        (r) =>
          r.template_name.toLowerCase().includes(searchLower) ||
          (r.user_name && r.user_name.toLowerCase().includes(searchLower))
      );
    }

    const result = processPaginatedResults(reports, limit, cursor);

    if (count !== null) {
      // Adjust total count if we're doing client-side search filtering
      result.pageInfo.totalCount = search ? reports.length : count;
    }

    return result;
  } catch {
    return emptyPaginatedResult();
  }
}

// ============================================
// Quick Record Creation (for inline creation in report flow)
// ============================================

/**
 * Create a new record with minimal info (for quick inline creation)
 * Only requires name, record_type_id, and organisation_id
 */
export async function createRecordQuick(
  organisationId: string,
  recordTypeId: string,
  name: string,
  address?: string
): Promise<RecordResult> {
  try {
    const { data, error } = await supabase
      .from('records')
      .insert({
        organisation_id: organisationId,
        record_type_id: recordTypeId,
        name: name.trim(),
        address: address?.trim() || null,
      } as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message } };
    }

    return { data: data as RecordModel, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create record';
    return { data: null, error: { message } };
  }
}

// ============================================
// Legacy aliases for backwards compatibility
// ============================================

/** @deprecated Use fetchRecords instead */
export const fetchSites = fetchRecords;
/** @deprecated Use fetchRecordById instead */
export const fetchSiteById = fetchRecordById;
/** @deprecated Use createRecord instead */
export const createSite = createRecord;
/** @deprecated Use updateRecord instead */
export const updateSite = updateRecord;
/** @deprecated Use deleteRecord instead */
export const deleteSite = deleteRecord;
/** @deprecated Use fetchRecordTemplates instead */
export const fetchSiteTemplates = fetchRecordTemplates;

// Legacy type alias
/** @deprecated Use RecordModel instead */
export type Site = RecordModel;
