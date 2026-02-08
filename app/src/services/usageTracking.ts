/**
 * Usage Tracking Service
 * Tracks template+record combinations for quick-start functionality
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
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';

// ============================================
// Types
// ============================================

export interface RecentUsageCombination {
  template_id: string;
  template_name: string;
  record_id: string;
  record_name: string;
  record_type_id: string;
  record_type_name: string;
  last_used_at: string;
  use_count: number;
}

export interface DraftReport {
  id: string;
  status: 'draft';
  started_at: string;
  created_at: string;
  template_id: string;
  template_name: string;
  record_id: string;
  record_name: string;
}

export interface QuickStartData {
  drafts: DraftReport[];
  recentCombinations: RecentUsageCombination[];
}

// ============================================
// Track Usage
// ============================================

/**
 * Track when a user starts an inspection with a template+record combination
 */
export async function trackUsage(
  organisationId: string,
  userId: string,
  templateId: string,
  recordId: string,
  reportId?: string
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  try {
    const usageId = generateId();
    const now = new Date().toISOString();

    // Insert usage record
    const usageRef = doc(db, 'report_usage_history', usageId);
    await setDoc(usageRef, {
      organisation_id: organisationId,
      user_id: userId,
      template_id: templateId,
      record_id: recordId,
      report_id: reportId || null,
      used_at: now,
    });

    // Also update last_used_at on the record
    const recordRef = doc(db, collections.records, recordId);
    await updateDoc(recordRef, {
      last_used_at: now,
    });

    return { data: { id: usageId }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to track usage';
    console.error('Failed to track usage:', message);
    return { data: null, error: { message } };
  }
}

// ============================================
// Get Recent Combinations
// ============================================

/**
 * Get recent template+record combinations for quick-start
 */
export async function getRecentCombinations(
  userId: string,
  limit: number = 5
): Promise<{ data: RecentUsageCombination[]; error: { message: string } | null }> {
  try {
    const usageQuery = query(
      collection(db, 'report_usage_history'),
      where('user_id', '==', userId),
      orderBy('used_at', 'desc'),
      firestoreLimit(limit * 2) // Fetch extra to account for deduplication
    );
    const usageSnap = await getDocs(usageQuery);

    // Transform and deduplicate by template+record combination
    const seen = new Set<string>();
    const combinations: RecentUsageCombination[] = [];

    for (const usageDoc of usageSnap.docs) {
      const usage = usageDoc.data();
      const key = `${usage.template_id}-${usage.record_id}`;

      if (seen.has(key)) continue;
      seen.add(key);

      // Fetch template name
      let templateName = 'Unknown Template';
      const templateRef = doc(db, collections.templates, usage.template_id);
      const templateSnap = await getDoc(templateRef);
      if (templateSnap.exists()) {
        templateName = templateSnap.data().name || templateName;
      }

      // Fetch record details
      let recordName = 'Unknown Record';
      let recordTypeId = '';
      let recordTypeName = 'Unknown Type';
      let archived = false;

      const recordRef = doc(db, collections.records, usage.record_id);
      const recordSnap = await getDoc(recordRef);
      if (recordSnap.exists()) {
        const recordData = recordSnap.data();
        recordName = recordData.name || recordName;
        recordTypeId = recordData.record_type_id || '';
        archived = recordData.archived || false;

        // Fetch record type name
        if (recordTypeId) {
          const rtRef = doc(db, 'record_types', recordTypeId);
          const rtSnap = await getDoc(rtRef);
          if (rtSnap.exists()) {
            recordTypeName = rtSnap.data().name || recordTypeName;
          }
        }
      }

      // Skip archived records
      if (archived) continue;

      combinations.push({
        template_id: usage.template_id,
        template_name: templateName,
        record_id: usage.record_id,
        record_name: recordName,
        record_type_id: recordTypeId,
        record_type_name: recordTypeName,
        last_used_at: usage.used_at,
        use_count: 1, // Simplified - actual count would need aggregation
      });

      if (combinations.length >= limit) break;
    }

    return { data: combinations, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get recent combinations';
    return { data: [], error: { message } };
  }
}

// ============================================
// Get Draft Reports
// ============================================

/**
 * Get draft reports for the current user
 */
export async function getDraftReports(
  userId: string,
  limit: number = 5
): Promise<{ data: DraftReport[]; error: { message: string } | null }> {
  try {
    const reportsQuery = query(
      collection(db, collections.reports),
      where('user_id', '==', userId),
      where('status', '==', 'draft'),
      orderBy('updated_at', 'desc'),
      firestoreLimit(limit)
    );
    const reportsSnap = await getDocs(reportsQuery);

    const drafts: DraftReport[] = [];

    for (const reportDoc of reportsSnap.docs) {
      const report = reportDoc.data();

      // Fetch template name
      let templateName = 'Unknown Template';
      const templateRef = doc(db, collections.templates, report.template_id);
      const templateSnap = await getDoc(templateRef);
      if (templateSnap.exists()) {
        templateName = templateSnap.data().name || templateName;
      }

      // Fetch record details and check if archived
      let recordName = 'Unknown Record';
      let archived = false;
      const recordRef = doc(db, collections.records, report.record_id);
      const recordSnap = await getDoc(recordRef);
      if (recordSnap.exists()) {
        const recordData = recordSnap.data();
        recordName = recordData.name || recordName;
        archived = recordData.archived || false;
      }

      // Skip reports for archived records
      if (archived) continue;

      drafts.push({
        id: reportDoc.id,
        status: 'draft',
        started_at: report.started_at,
        created_at: report.created_at,
        template_id: report.template_id,
        template_name: templateName,
        record_id: report.record_id,
        record_name: recordName,
      });
    }

    return { data: drafts, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get draft reports';
    return { data: [], error: { message } };
  }
}

// ============================================
// Get All Quick Start Data
// ============================================

/**
 * Get all quick-start data in a single call
 */
export async function getQuickStartData(
  userId: string
): Promise<{ data: QuickStartData; error: { message: string } | null }> {
  try {
    // Fetch drafts and recent combinations in parallel
    const [draftsResult, recentResult] = await Promise.all([
      getDraftReports(userId, 3),
      getRecentCombinations(userId, 5),
    ]);

    // Return data even if one fails
    return {
      data: {
        drafts: draftsResult.data,
        recentCombinations: recentResult.data,
      },
      error: draftsResult.error || recentResult.error,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get quick start data';
    return {
      data: { drafts: [], recentCombinations: [] },
      error: { message },
    };
  }
}

// ============================================
// Get Recent Records By Type
// ============================================

/**
 * Get recently used records of a specific type
 * Ordered by last_used_at (most recent first), then by name
 */
export async function getRecentRecordsByType(
  recordTypeId: string,
  limit: number = 5
): Promise<{
  data: Array<{
    id: string;
    name: string;
    address: string | null;
    last_used_at: string | null;
  }>;
  error: { message: string } | null;
}> {
  try {
    // Query records with last_used_at, ordered by most recent
    const recordsQuery = query(
      collection(db, collections.records),
      where('record_type_id', '==', recordTypeId),
      where('archived', '==', false),
      orderBy('last_used_at', 'desc'),
      firestoreLimit(limit)
    );
    const recordsSnap = await getDocs(recordsQuery);

    const records = recordsSnap.docs
      .filter(doc => doc.data().last_used_at != null)
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          address: data.address || null,
          last_used_at: data.last_used_at || null,
        };
      });

    return { data: records, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get recent records by type';
    return { data: [], error: { message } };
  }
}
