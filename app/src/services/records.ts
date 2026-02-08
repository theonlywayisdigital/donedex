/**
 * Records Service
 * Handles record (formerly "site") management
 *
 * Migrated to Firebase/Firestore
 */

import { db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';
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
    const recordsQuery = query(
      collection(db, collections.records),
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(recordsQuery);

    // Get all record type IDs to filter out archived ones
    const recordTypeIds = new Set<string>();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.record_type_id) {
        recordTypeIds.add(data.record_type_id);
      }
    });

    // Fetch record types to check which are archived
    const archivedRecordTypeIds = new Set<string>();
    for (const rtId of recordTypeIds) {
      const rtDoc = await getDoc(doc(db, 'record_types', rtId));
      if (rtDoc.exists() && rtDoc.data().archived === true) {
        archivedRecordTypeIds.add(rtId);
      }
    }

    const records: RecordModel[] = snapshot.docs
      .filter(doc => {
        const data = doc.data();
        // Filter out records with archived record types
        if (data.record_type_id && archivedRecordTypeIds.has(data.record_type_id)) {
          return false;
        }
        return true;
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as RecordModel));

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
    const recordsQuery = query(
      collection(db, collections.records),
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(recordsQuery);

    const records: RecordWithRecordType[] = [];

    for (const recordDoc of snapshot.docs) {
      const recordData = recordDoc.data();

      // Fetch the record type
      let recordType: RecordType | null = null;
      if (recordData.record_type_id) {
        const rtDoc = await getDoc(doc(db, 'record_types', recordData.record_type_id));
        if (rtDoc.exists()) {
          recordType = { id: rtDoc.id, ...rtDoc.data() } as RecordType;
        }
      }

      if (recordType) {
        records.push({
          id: recordDoc.id,
          ...recordData,
          record_type: recordType,
        } as RecordWithRecordType);
      }
    }

    return { data: records, error: null };
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
    const recordsQuery = query(
      collection(db, collections.records),
      where('record_type_id', '==', recordTypeId),
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(recordsQuery);

    const records: RecordModel[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as RecordModel));

    return { data: records, error: null };
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
    const recordRef = doc(db, collections.records, recordId);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      return { data: null, error: { message: 'Record not found' } };
    }

    return { data: { id: recordSnap.id, ...recordSnap.data() } as RecordModel, error: null };
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
    const recordId = generateId();
    const recordRef = doc(db, collections.records, recordId);
    const now = new Date().toISOString();

    const recordData = {
      ...record,
      archived: false,
      created_at: now,
      updated_at: now,
    };

    await setDoc(recordRef, recordData);

    return { data: { id: recordId, ...recordData } as RecordModel, error: null };
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
    const recordRef = doc(db, collections.records, recordId);
    await updateDoc(recordRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    const recordSnap = await getDoc(recordRef);
    return { data: { id: recordSnap.id, ...recordSnap.data() } as RecordModel, error: null };
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
    const recordRef = doc(db, collections.records, recordId);
    await updateDoc(recordRef, {
      archived: true,
      updated_at: new Date().toISOString(),
    });

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
    const recordRef = doc(db, collections.records, recordId);
    await deleteDoc(recordRef);

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
    const templatesQuery = query(
      collection(db, collections.templates),
      where('is_published', '==', true),
      where('archived', '==', false),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(templatesQuery);

    const templates: Template[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Template));

    return { data: templates, error: null };
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

    const { cursor } = pagination;
    const limit = getValidPageSize(pagination.limit);
    const fetchLimit = limit + 1;

    // Build base query
    let constraints: any[] = [
      where('archived', '==', false),
    ];

    if (recordTypeId) {
      constraints.push(where('record_type_id', '==', recordTypeId));
    }

    constraints.push(orderBy('created_at', sortDirection));
    constraints.push(orderBy('__name__', 'asc'));
    constraints.push(firestoreLimit(fetchLimit));

    const recordsQuery = query(collection(db, collections.records), ...constraints);
    const snapshot = await getDocs(recordsQuery);

    // Fetch record types
    const recordTypeCache = new Map<string, RecordType>();

    let records: RecordWithRecordType[] = [];

    for (const recordDoc of snapshot.docs) {
      const data = recordDoc.data();

      // Get or fetch record type
      let recordType = recordTypeCache.get(data.record_type_id);
      if (!recordType && data.record_type_id) {
        const rtDoc = await getDoc(doc(db, 'record_types', data.record_type_id));
        if (rtDoc.exists()) {
          recordType = { id: rtDoc.id, ...rtDoc.data() } as RecordType;
          recordTypeCache.set(data.record_type_id, recordType);
        }
      }

      if (recordType) {
        records.push({
          id: recordDoc.id,
          ...data,
          record_type: recordType,
        } as RecordWithRecordType);
      }
    }

    // Apply client-side search filter
    if (search && search.trim().length >= 2) {
      const searchLower = search.toLowerCase().trim();
      records = records.filter(r =>
        r.name.toLowerCase().includes(searchLower) ||
        (r.address && r.address.toLowerCase().includes(searchLower))
      );
    }

    return processPaginatedResults(records, limit, cursor);
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
    const { query: searchQuery, recordTypeId, limit: maxResults = 10 } = options;

    // Require at least 2 characters for search
    if (!searchQuery || searchQuery.trim().length < 2) {
      return { data: [], error: null };
    }

    const searchLower = searchQuery.toLowerCase().trim();

    // Build query
    let constraints: any[] = [
      where('archived', '==', false),
    ];

    if (recordTypeId) {
      constraints.push(where('record_type_id', '==', recordTypeId));
    }

    constraints.push(orderBy('name', 'asc'));
    constraints.push(firestoreLimit(100)); // Fetch more for client-side filtering

    const recordsQuery = query(collection(db, collections.records), ...constraints);
    const snapshot = await getDocs(recordsQuery);

    const recordTypeCache = new Map<string, any>();
    const results: RecordSearchResult[] = [];

    for (const recordDoc of snapshot.docs) {
      if (results.length >= maxResults) break;

      const data = recordDoc.data();

      // Check if matches search
      const nameMatch = data.name?.toLowerCase().includes(searchLower);
      const addressMatch = data.address?.toLowerCase().includes(searchLower);

      if (!nameMatch && !addressMatch) continue;

      // Get or fetch record type
      let recordType = recordTypeCache.get(data.record_type_id);
      if (!recordType && data.record_type_id) {
        const rtDoc = await getDoc(doc(db, 'record_types', data.record_type_id));
        if (rtDoc.exists()) {
          const rtData = rtDoc.data();
          recordType = {
            id: rtDoc.id,
            name: rtData.name,
            name_singular: rtData.name_singular || null,
            icon: rtData.icon || null,
            color: rtData.color || null,
          };
          recordTypeCache.set(data.record_type_id, recordType);
        }
      }

      if (recordType) {
        results.push({
          id: recordDoc.id,
          name: data.name,
          address: data.address || null,
          record_type: recordType,
        });
      }
    }

    return { data: results, error: null };
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
    const recordRef = doc(db, collections.records, recordId);
    const recordSnap = await getDoc(recordRef);

    if (!recordSnap.exists()) {
      return { data: null, error: { message: 'Record not found' } };
    }

    const recordData = recordSnap.data();

    // Fetch record type
    let recordType: RecordType | null = null;
    if (recordData.record_type_id) {
      const rtDoc = await getDoc(doc(db, 'record_types', recordData.record_type_id));
      if (rtDoc.exists()) {
        recordType = { id: rtDoc.id, ...rtDoc.data() } as RecordType;
      }
    }

    if (!recordType) {
      return { data: null, error: { message: 'Record type not found' } };
    }

    return {
      data: {
        id: recordSnap.id,
        ...recordData,
        record_type: recordType,
      } as RecordWithRecordType,
      error: null,
    };
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
  maxResults: number = 20
): Promise<{ data: ReportSummary[]; error: { message: string } | null }> {
  try {
    const reportsQuery = query(
      collection(db, collections.reports),
      where('record_id', '==', recordId),
      orderBy('created_at', 'desc'),
      firestoreLimit(maxResults)
    );
    const snapshot = await getDocs(reportsQuery);

    const summaries: ReportSummary[] = [];

    for (const reportDoc of snapshot.docs) {
      const data = reportDoc.data();

      // Fetch template name
      let templateName = 'Unknown Template';
      if (data.template_id) {
        const templateDoc = await getDoc(doc(db, collections.templates, data.template_id));
        if (templateDoc.exists()) {
          templateName = templateDoc.data().name || templateName;
        }
      }

      // Fetch user name
      let userName: string | null = null;
      if (data.user_id) {
        const userDoc = await getDoc(doc(db, collections.users, data.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null;
        }
      }

      summaries.push({
        id: reportDoc.id,
        status: data.status,
        started_at: data.started_at,
        submitted_at: data.submitted_at || null,
        created_at: data.created_at,
        template_name: templateName,
        user_name: userName,
      });
    }

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
    const { cursor } = pagination;
    const limit = getValidPageSize(pagination.limit);
    const fetchLimit = limit + 1;

    const reportsQuery = query(
      collection(db, collections.reports),
      where('record_id', '==', recordId),
      orderBy('created_at', 'desc'),
      firestoreLimit(fetchLimit)
    );
    const snapshot = await getDocs(reportsQuery);

    const reports: (ReportSummary & { created_at: string; id: string })[] = [];

    for (const reportDoc of snapshot.docs) {
      const data = reportDoc.data();

      // Fetch template name
      let templateName = 'Unknown Template';
      if (data.template_id) {
        const templateDoc = await getDoc(doc(db, collections.templates, data.template_id));
        if (templateDoc.exists()) {
          templateName = templateDoc.data().name || templateName;
        }
      }

      // Fetch user name
      let userName: string | null = null;
      if (data.user_id) {
        const userDoc = await getDoc(doc(db, collections.users, data.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null;
        }
      }

      reports.push({
        id: reportDoc.id,
        status: data.status,
        started_at: data.started_at,
        submitted_at: data.submitted_at || null,
        created_at: data.created_at,
        template_name: templateName,
        user_name: userName,
      });
    }

    return processPaginatedResults(reports, limit, cursor);
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

    // Build query constraints
    let constraints: any[] = [
      where('record_id', '==', recordId),
    ];

    if (templateId) {
      constraints.push(where('template_id', '==', templateId));
    }

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    if (userId) {
      constraints.push(where('user_id', '==', userId));
    }

    constraints.push(orderBy('created_at', 'desc'));
    constraints.push(firestoreLimit(fetchLimit));

    const reportsQuery = query(collection(db, collections.reports), ...constraints);
    const snapshot = await getDocs(reportsQuery);

    let reports: (ReportSummaryExtended & { created_at: string; id: string })[] = [];

    for (const reportDoc of snapshot.docs) {
      const data = reportDoc.data();

      // Apply date filters client-side
      if (dateFrom && data.created_at < dateFrom) continue;
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        if (data.created_at >= endDate.toISOString()) continue;
      }

      // Fetch template name
      let templateName = 'Unknown Template';
      if (data.template_id) {
        const templateDoc = await getDoc(doc(db, collections.templates, data.template_id));
        if (templateDoc.exists()) {
          templateName = templateDoc.data().name || templateName;
        }
      }

      // Fetch user name
      let userName: string | null = null;
      if (data.user_id) {
        const userDoc = await getDoc(doc(db, collections.users, data.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null;
        }
      }

      reports.push({
        id: reportDoc.id,
        status: data.status,
        started_at: data.started_at,
        submitted_at: data.submitted_at || null,
        created_at: data.created_at,
        template_id: data.template_id,
        user_id: data.user_id || null,
        template_name: templateName,
        user_name: userName,
      });
    }

    // Apply client-side search filter
    if (search && search.trim().length > 0) {
      const searchLower = search.toLowerCase().trim();
      reports = reports.filter(
        r =>
          r.template_name.toLowerCase().includes(searchLower) ||
          (r.user_name && r.user_name.toLowerCase().includes(searchLower))
      );
    }

    return processPaginatedResults(reports, limit, cursor);
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
    const recordId = generateId();
    const recordRef = doc(db, collections.records, recordId);
    const now = new Date().toISOString();

    const recordData = {
      organisation_id: organisationId,
      record_type_id: recordTypeId,
      name: name.trim(),
      address: address?.trim() || null,
      archived: false,
      created_at: now,
      updated_at: now,
    };

    await setDoc(recordRef, recordData);

    return { data: { id: recordId, ...recordData } as RecordModel, error: null };
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
