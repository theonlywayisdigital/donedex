/**
 * Reports Service
 * Handles report creation, responses, and photo uploads
 *
 * Migrated to Firebase/Firestore + Firebase Storage
 */

import { db, storage } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collections, generateId } from './firestore';
import { compressImageToBase64 } from './imageCompression';
import { decode as base64Decode } from 'base-64';
import {
  type PaginationParams,
  type PaginatedResult,
  getValidPageSize,
  decodeCursor,
  processPaginatedResults,
  emptyPaginatedResult,
} from './pagination';

// Types matching database schema
export interface Report {
  id: string;
  organisation_id: string;
  record_id: string;
  template_id: string;
  user_id: string;
  status: 'draft' | 'submitted';
  started_at: string;
  submitted_at: string | null;
  created_at: string;
}

// Legacy alias
/** @deprecated Use record_id instead of site_id */
export type ReportWithSiteId = Report & { site_id?: string };

export interface ReportResponse {
  id: string;
  report_id: string;
  template_item_id: string;
  item_label: string;
  item_type: string;
  response_value: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportPhoto {
  id: string;
  report_response_id: string;
  storage_path: string;
  created_at: string;
}

export interface ReportWithDetails extends Report {
  record: { name: string };
  template: { name: string };
  user_profile: { full_name: string } | null;
}

// Legacy alias
/** @deprecated Use ReportWithDetails with record instead */
export interface ReportWithSiteDetails extends Report {
  site: { name: string };
  template: { name: string };
  user_profile: { full_name: string } | null;
}

export interface CreateReportInput {
  organisation_id: string;
  record_id: string;
  template_id: string;
  user_id: string;
}

// Legacy alias
/** @deprecated Use record_id instead of site_id */
export interface CreateReportInputLegacy {
  organisation_id: string;
  site_id: string;
  template_id: string;
  user_id: string;
}

export interface CreateResponseInput {
  report_id: string;
  template_item_id: string;
  item_label: string;
  item_type: string;
  response_value?: string | null;
  severity?: 'low' | 'medium' | 'high' | null;
  notes?: string | null;
}

/**
 * Create a new report (draft)
 */
export async function createReport(input: CreateReportInput): Promise<{ data: Report | null; error: { message: string } | null }> {
  try {
    const reportId = generateId();
    const reportRef = doc(db, collections.reports, reportId);
    const now = new Date().toISOString();

    const reportData = {
      organisation_id: input.organisation_id,
      record_id: input.record_id,
      template_id: input.template_id,
      user_id: input.user_id,
      status: 'draft',
      started_at: now,
      submitted_at: null,
      created_at: now,
    };

    await setDoc(reportRef, reportData);

    return { data: { id: reportId, ...reportData } as Report, error: null };
  } catch (err) {
    console.error('Error creating report:', err);
    const message = err instanceof Error ? err.message : 'Failed to create report';
    return { data: null, error: { message } };
  }
}

/**
 * Fetch a report by ID with record and template details
 */
export async function fetchReportById(reportId: string): Promise<{ data: ReportWithDetails | null; error: { message: string } | null }> {
  try {
    const reportRef = doc(db, collections.reports, reportId);
    const reportSnap = await getDoc(reportRef);

    if (!reportSnap.exists()) {
      return { data: null, error: { message: 'Report not found' } };
    }

    const reportData = reportSnap.data();

    // Fetch record
    let record = { name: 'Unknown' };
    if (reportData.record_id) {
      const recordDoc = await getDoc(doc(db, collections.records, reportData.record_id));
      if (recordDoc.exists()) {
        record = { name: recordDoc.data().name };
      }
    }

    // Fetch template
    let template = { name: 'Unknown' };
    if (reportData.template_id) {
      const templateDoc = await getDoc(doc(db, collections.templates, reportData.template_id));
      if (templateDoc.exists()) {
        template = { name: templateDoc.data().name };
      }
    }

    // Fetch user profile
    let userProfile: { full_name: string } | null = null;
    if (reportData.user_id) {
      const userDoc = await getDoc(doc(db, collections.users, reportData.user_id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const fullName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
        if (fullName) {
          userProfile = { full_name: fullName };
        }
      }
    }

    return {
      data: {
        id: reportSnap.id,
        ...reportData,
        record,
        template,
        user_profile: userProfile,
      } as ReportWithDetails,
      error: null,
    };
  } catch (err) {
    console.error('Error fetching report:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch report';
    return { data: null, error: { message } };
  }
}

/**
 * Fetch all responses for a report
 */
export async function fetchReportResponses(reportId: string): Promise<{ data: ReportResponse[]; error: { message: string } | null }> {
  try {
    const responsesQuery = query(
      collection(db, 'report_responses'),
      where('report_id', '==', reportId)
    );
    const snapshot = await getDocs(responsesQuery);

    const responses: ReportResponse[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ReportResponse));

    return { data: responses, error: null };
  } catch (err) {
    console.error('Error fetching report responses:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch responses';
    return { data: [], error: { message } };
  }
}

/**
 * Create or update a response
 */
export async function upsertResponse(input: CreateResponseInput): Promise<{ data: ReportResponse | null; error: { message: string } | null }> {
  try {
    // Check if response exists for this report/item combo
    const existingQuery = query(
      collection(db, 'report_responses'),
      where('report_id', '==', input.report_id),
      where('template_item_id', '==', input.template_item_id)
    );
    const existingSnapshot = await getDocs(existingQuery);

    const now = new Date().toISOString();

    if (!existingSnapshot.empty) {
      // Update existing
      const existingDoc = existingSnapshot.docs[0];
      const responseRef = doc(db, 'report_responses', existingDoc.id);
      await updateDoc(responseRef, {
        response_value: input.response_value ?? null,
        severity: input.severity ?? null,
        notes: input.notes ?? null,
        updated_at: now,
      });

      const updatedSnap = await getDoc(responseRef);
      return { data: { id: updatedSnap.id, ...updatedSnap.data() } as ReportResponse, error: null };
    } else {
      // Create new
      const responseId = generateId();
      const responseRef = doc(db, 'report_responses', responseId);

      const responseData = {
        report_id: input.report_id,
        template_item_id: input.template_item_id,
        item_label: input.item_label,
        item_type: input.item_type,
        response_value: input.response_value ?? null,
        severity: input.severity ?? null,
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
      };

      await setDoc(responseRef, responseData);

      return { data: { id: responseId, ...responseData } as ReportResponse, error: null };
    }
  } catch (err) {
    console.error('Error upserting response:', err);
    const message = err instanceof Error ? err.message : 'Failed to save response';
    return { data: null, error: { message } };
  }
}

/**
 * Submit a report (change status from draft to submitted)
 */
export async function submitReport(reportId: string): Promise<{ error: { message: string } | null }> {
  try {
    const reportRef = doc(db, collections.reports, reportId);
    await updateDoc(reportRef, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });

    return { error: null };
  } catch (err) {
    console.error('Error submitting report:', err);
    const message = err instanceof Error ? err.message : 'Failed to submit report';
    return { error: { message } };
  }
}

/**
 * Fetch reports for a record
 */
export async function fetchRecordReports(recordId: string): Promise<{ data: ReportWithDetails[]; error: { message: string } | null }> {
  try {
    const reportsQuery = query(
      collection(db, collections.reports),
      where('record_id', '==', recordId),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(reportsQuery);

    const reports: ReportWithDetails[] = [];

    // Cache for templates and users to avoid repeated fetches
    const templateCache = new Map<string, { name: string }>();
    const userCache = new Map<string, { full_name: string } | null>();

    for (const reportDoc of snapshot.docs) {
      const data = reportDoc.data();

      // Fetch record (same for all in this query)
      let record = { name: 'Unknown' };
      const recordDoc = await getDoc(doc(db, collections.records, recordId));
      if (recordDoc.exists()) {
        record = { name: recordDoc.data().name };
      }

      // Fetch template (cached)
      let template = templateCache.get(data.template_id);
      if (!template && data.template_id) {
        const templateDoc = await getDoc(doc(db, collections.templates, data.template_id));
        if (templateDoc.exists()) {
          template = { name: templateDoc.data().name };
          templateCache.set(data.template_id, template);
        }
      }

      // Fetch user profile (cached)
      let userProfile = userCache.get(data.user_id);
      if (userProfile === undefined && data.user_id) {
        const userDoc = await getDoc(doc(db, collections.users, data.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
          userProfile = fullName ? { full_name: fullName } : null;
        } else {
          userProfile = null;
        }
        userCache.set(data.user_id, userProfile);
      }

      reports.push({
        id: reportDoc.id,
        ...data,
        record,
        template: template || { name: 'Unknown' },
        user_profile: userProfile || null,
      } as ReportWithDetails);
    }

    return { data: reports, error: null };
  } catch (err) {
    console.error('Error fetching record reports:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch reports';
    return { data: [], error: { message } };
  }
}

/** @deprecated Use fetchRecordReports instead */
export const fetchSiteReports = fetchRecordReports;

/**
 * Fetch all reports for the user's organisation
 */
export async function fetchAllReports(): Promise<{ data: ReportWithDetails[]; error: { message: string } | null }> {
  try {
    const reportsQuery = query(
      collection(db, collections.reports),
      orderBy('created_at', 'desc')
    );
    const snapshot = await getDocs(reportsQuery);

    const reports: ReportWithDetails[] = [];

    // Caches
    const recordCache = new Map<string, { name: string }>();
    const templateCache = new Map<string, { name: string }>();
    const userCache = new Map<string, { full_name: string } | null>();

    for (const reportDoc of snapshot.docs) {
      const data = reportDoc.data();

      // Fetch record (cached)
      let record = recordCache.get(data.record_id);
      if (!record && data.record_id) {
        const recordDoc = await getDoc(doc(db, collections.records, data.record_id));
        if (recordDoc.exists()) {
          record = { name: recordDoc.data().name };
          recordCache.set(data.record_id, record);
        }
      }

      // Fetch template (cached)
      let template = templateCache.get(data.template_id);
      if (!template && data.template_id) {
        const templateDoc = await getDoc(doc(db, collections.templates, data.template_id));
        if (templateDoc.exists()) {
          template = { name: templateDoc.data().name };
          templateCache.set(data.template_id, template);
        }
      }

      // Fetch user profile (cached)
      let userProfile = userCache.get(data.user_id);
      if (userProfile === undefined && data.user_id) {
        const userDoc = await getDoc(doc(db, collections.users, data.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
          userProfile = fullName ? { full_name: fullName } : null;
        } else {
          userProfile = null;
        }
        userCache.set(data.user_id, userProfile);
      }

      reports.push({
        id: reportDoc.id,
        ...data,
        record: record || { name: 'Unknown' },
        template: template || { name: 'Unknown' },
        user_profile: userProfile || null,
      } as ReportWithDetails);
    }

    return { data: reports, error: null };
  } catch (err) {
    console.error('Error fetching reports:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch reports';
    return { data: [], error: { message } };
  }
}

// ============================================
// Paginated & Filtered Reports
// ============================================

export interface FetchReportsPaginatedOptions {
  /** Search query (searches template name, record name, user name) */
  search?: string;
  /** Filter by status */
  status?: 'all' | 'submitted' | 'draft';
  /** Filter by record ID */
  recordId?: string | null;
  /** Filter by organisation ID (super admin) */
  organisationId?: string | null;
  /** Filter by date - start (ISO string) */
  dateFrom?: string | null;
  /** Filter by date - end (ISO string) */
  dateTo?: string | null;
  /** Pagination parameters */
  pagination?: PaginationParams;
}

/**
 * Fetch reports with cursor-based pagination and server-side filters.
 * Search is still client-side (across joined fields), but status/record/date/org
 * filters are applied server-side.
 */
export async function fetchReportsPaginated(
  options: FetchReportsPaginatedOptions = {}
): Promise<PaginatedResult<ReportWithDetails>> {
  try {
    const {
      search,
      status,
      recordId,
      organisationId,
      dateFrom,
      dateTo,
      pagination = {},
    } = options;

    const { cursor } = pagination;
    const limit = getValidPageSize(pagination.limit);
    const fetchLimit = limit + 1;

    // Build query constraints
    let constraints: any[] = [];

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    if (recordId) {
      constraints.push(where('record_id', '==', recordId));
    }

    if (organisationId) {
      constraints.push(where('organisation_id', '==', organisationId));
    }

    constraints.push(orderBy('created_at', 'desc'));
    constraints.push(orderBy('__name__', 'desc'));
    constraints.push(firestoreLimit(fetchLimit));

    const reportsQuery = query(collection(db, collections.reports), ...constraints);
    const snapshot = await getDocs(reportsQuery);

    // Caches
    const recordCache = new Map<string, { name: string }>();
    const templateCache = new Map<string, { name: string }>();
    const userCache = new Map<string, { full_name: string } | null>();

    let reports: ReportWithDetails[] = [];

    for (const reportDoc of snapshot.docs) {
      const data = reportDoc.data();

      // Apply date filters client-side
      if (dateFrom && data.created_at < dateFrom) continue;
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        if (data.created_at >= endDate.toISOString()) continue;
      }

      // Fetch record (cached)
      let record = recordCache.get(data.record_id);
      if (!record && data.record_id) {
        const recordDoc = await getDoc(doc(db, collections.records, data.record_id));
        if (recordDoc.exists()) {
          record = { name: recordDoc.data().name };
          recordCache.set(data.record_id, record);
        }
      }

      // Fetch template (cached)
      let template = templateCache.get(data.template_id);
      if (!template && data.template_id) {
        const templateDoc = await getDoc(doc(db, collections.templates, data.template_id));
        if (templateDoc.exists()) {
          template = { name: templateDoc.data().name };
          templateCache.set(data.template_id, template);
        }
      }

      // Fetch user profile (cached)
      let userProfile = userCache.get(data.user_id);
      if (userProfile === undefined && data.user_id) {
        const userDoc = await getDoc(doc(db, collections.users, data.user_id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullName = userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
          userProfile = fullName ? { full_name: fullName } : null;
        } else {
          userProfile = null;
        }
        userCache.set(data.user_id, userProfile);
      }

      reports.push({
        id: reportDoc.id,
        ...data,
        record: record || { name: 'Unknown' },
        template: template || { name: 'Unknown' },
        user_profile: userProfile || null,
      } as ReportWithDetails);
    }

    // Client-side search (across joined fields that can't be filtered server-side)
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      reports = reports.filter(
        r =>
          r.template?.name?.toLowerCase().includes(q) ||
          r.record?.name?.toLowerCase().includes(q) ||
          r.user_profile?.full_name?.toLowerCase().includes(q)
      );
    }

    return processPaginatedResults(reports, limit, cursor);
  } catch {
    return emptyPaginatedResult();
  }
}

/**
 * Upload a photo for a response
 * Photos are automatically compressed to max 2000px before upload
 * @deprecated Use uploadMediaFile instead
 */
export async function uploadResponsePhoto(
  reportId: string,
  responseId: string,
  photoUri: string
): Promise<{ data: ReportPhoto | null; error: { message: string } | null }> {
  try {
    // Compress the image and get base64 - works reliably on all platforms
    const compressed = await compressImageToBase64(photoUri, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    });

    if (!compressed.base64) {
      return { data: null, error: { message: 'Image compression failed' } };
    }

    // Generate unique filename
    const filename = `report-photos/${reportId}/${responseId}/${Date.now()}.jpg`;

    // Convert base64 to Uint8Array for upload
    const binaryString = base64Decode(compressed.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, bytes, { contentType: 'image/jpeg' });

    // Create photo record in database
    const photoId = generateId();
    const photoRef = doc(db, 'report_photos', photoId);
    const now = new Date().toISOString();

    const photoData = {
      report_response_id: responseId,
      storage_path: filename,
      created_at: now,
    };

    await setDoc(photoRef, photoData);

    return { data: { id: photoId, ...photoData } as ReportPhoto, error: null };
  } catch (err) {
    console.error('Error in uploadResponsePhoto:', err);
    return { data: null, error: { message: 'Failed to upload photo' } };
  }
}

/**
 * Get public URL for a photo
 */
export async function getPhotoUrl(storagePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error('Error getting photo URL:', err);
    return '';
  }
}

/**
 * Upload a signature image for a response
 * @param reportId - The report ID
 * @param responseId - The response ID
 * @param base64Data - Base64 encoded signature image data
 * @returns Storage path for the uploaded signature
 */
export async function uploadSignature(
  reportId: string,
  responseId: string,
  base64Data: string
): Promise<{ data: string | null; error: { message: string } | null }> {
  try {
    // Generate unique filename
    const filename = `report-signatures/${reportId}/${responseId}/${Date.now()}.png`;

    // Remove data URL prefix if present
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to Uint8Array
    const binaryString = base64Decode(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, bytes, { contentType: 'image/png' });

    return { data: filename, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[uploadSignature] Exception:', err);
    return { data: null, error: { message: `Failed to upload signature: ${errorMessage}` } };
  }
}

/**
 * Get public URL for a signature
 */
export async function getSignatureUrl(storagePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error('Error getting signature URL:', err);
    return '';
  }
}

/**
 * Upload a media file (photo) for a response
 * Simplified upload that stores files by reportId/templateItemId path
 * @param reportId - The report ID
 * @param templateItemId - The template item ID (used for path organization)
 * @param fileUri - Local URI to the file
 * @param mediaType - Type of media ('photo')
 * @returns Storage path for the uploaded file
 */
export async function uploadMediaFile(
  reportId: string,
  templateItemId: string,
  fileUri: string,
  mediaType: 'photo'
): Promise<{ data: string | null; error: { message: string } | null }> {
  try {
    // Generate unique filename using reportId and templateItemId
    const filename = `report-photos/${reportId}/${templateItemId}/${Date.now()}.jpg`;

    // Compress image and get base64 - this works reliably on all platforms
    const compressed = await compressImageToBase64(fileUri, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 0.8,
    });

    if (!compressed.base64) {
      console.error('[uploadMediaFile] No base64 data returned from compression');
      return { data: null, error: { message: 'Image compression failed - no data returned' } };
    }

    // Convert base64 to Uint8Array for upload
    const binaryString = base64Decode(compressed.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to Firebase Storage
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, bytes, { contentType: 'image/jpeg' });

    return { data: filename, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[uploadMediaFile] Exception:', err);
    console.error('[uploadMediaFile] Error stack:', err instanceof Error ? err.stack : 'No stack');
    return { data: null, error: { message: `Photo upload failed: ${errorMessage}` } };
  }
}
