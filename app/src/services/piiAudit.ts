/**
 * PII Audit Logging Service
 *
 * Logs PII detection events for compliance and audit purposes.
 * These logs help demonstrate due diligence in handling personal data.
 *
 * Migrated to Firebase/Firestore
 *
 * Features:
 * - Logs when PII is detected in user input
 * - Records user actions (saved anyway, edited, cancelled)
 * - Supports batch logging for form submissions with multiple fields
 * - Async/non-blocking to avoid impacting user experience
 */

import { db } from './firebase';
import {
  doc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
} from 'firebase/firestore';
import { generateId } from './firestore';
import type { PIIDetectionResult } from './piiDetection';
import { maskForStorage } from './piiDetection';
import type { PiiSeverity, PiiUserAction } from '../types';
import { Platform } from 'react-native';

// ============================================
// Types
// ============================================

export interface PIIAuditEventInput {
  organisationId: string;
  userId?: string;
  recordId?: string;
  recordTypeId?: string;
  fieldId?: string;
  fieldLabel: string;
  detectionResult: PIIDetectionResult;
  userAction: PiiUserAction;
  wasWarned?: boolean;
}

export interface PIIAuditBatchInput {
  organisationId: string;
  userId?: string;
  recordId?: string;
  recordTypeId?: string;
  userAction: PiiUserAction;
  wasWarned?: boolean;
  /** Map of field ID to detection result */
  fieldDetections: Map<string, { label: string; result: PIIDetectionResult }>;
}

// ============================================
// Core Functions
// ============================================

/**
 * Log a single PII detection event
 *
 * Call this when:
 * - User saves data despite PII warning
 * - User edits data after seeing warning
 * - User cancels after seeing warning
 * - User dismisses inline warning
 */
export async function logPiiDetection(input: PIIAuditEventInput): Promise<void> {
  const {
    organisationId,
    userId,
    recordId,
    recordTypeId,
    fieldId,
    fieldLabel,
    detectionResult,
    userAction,
    wasWarned = true,
  } = input;

  // Don't log if no detections
  if (!detectionResult.hasDetections) {
    return;
  }

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // Create one event per detection type (deduped by category)
    const loggedCategories = new Set<string>();

    for (const match of detectionResult.matches) {
      // Only log each category once per field
      if (loggedCategories.has(match.category)) {
        continue;
      }
      loggedCategories.add(match.category);

      const eventId = generateId();
      const eventRef = doc(db, 'pii_detection_events', eventId);

      batch.set(eventRef, {
        organisation_id: organisationId,
        user_id: userId || null,
        record_id: recordId || null,
        record_type_id: recordTypeId || null,
        field_id: fieldId || null,
        field_label: fieldLabel,
        detection_type: match.category,
        severity: match.severity as PiiSeverity,
        detected_pattern: maskForStorage(match.matchedText, match.category),
        user_action: userAction,
        was_warned: wasWarned,
        client_platform: Platform.OS,
        created_at: now,
      });
    }

    await batch.commit();
  } catch (err) {
    // Log to console but don't throw - audit logging should never break the app
    console.error('[PII Audit] Failed to log detection:', err);
  }
}

/**
 * Log multiple PII detection events at once (form submission)
 *
 * More efficient than calling logPiiDetection multiple times.
 * Use when saving a form with multiple fields that may contain PII.
 */
export async function logPiiDetectionBatch(input: PIIAuditBatchInput): Promise<void> {
  const {
    organisationId,
    userId,
    recordId,
    recordTypeId,
    userAction,
    wasWarned = true,
    fieldDetections,
  } = input;

  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    let hasEvents = false;

    // Collect all events from all fields
    fieldDetections.forEach((detection, fieldId) => {
      if (!detection.result.hasDetections) {
        return;
      }

      const loggedCategories = new Set<string>();

      detection.result.matches.forEach((match) => {
        if (loggedCategories.has(match.category)) {
          return;
        }
        loggedCategories.add(match.category);

        const eventId = generateId();
        const eventRef = doc(db, 'pii_detection_events', eventId);

        batch.set(eventRef, {
          organisation_id: organisationId,
          user_id: userId || null,
          record_id: recordId || null,
          record_type_id: recordTypeId || null,
          field_id: fieldId || null,
          field_label: detection.label,
          detection_type: match.category,
          severity: match.severity as PiiSeverity,
          detected_pattern: maskForStorage(match.matchedText, match.category),
          user_action: userAction,
          was_warned: wasWarned,
          client_platform: Platform.OS,
          created_at: now,
        });

        hasEvents = true;
      });
    });

    if (hasEvents) {
      await batch.commit();
    }
  } catch (err) {
    console.error('[PII Audit] Failed to log batch detection:', err);
  }
}

// ============================================
// Query Functions (for admin/compliance)
// ============================================

export interface PIIAuditSummary {
  totalDetections: number;
  savedAnyway: number;
  edited: number;
  cancelled: number;
  bySeverity: Record<PiiSeverity, number>;
  byType: Record<string, number>;
}

/**
 * Get PII detection summary for an organisation
 *
 * Useful for compliance dashboards and audits.
 */
export async function getPiiAuditSummary(
  organisationId: string,
  startDate?: Date,
  endDate?: Date
): Promise<PIIAuditSummary | null> {
  try {
    let eventsQuery = query(
      collection(db, 'pii_detection_events'),
      where('organisation_id', '==', organisationId)
    );

    // Note: Firestore requires composite indexes for multiple where clauses with different fields
    // We'll filter dates client-side for simplicity
    const snapshot = await getDocs(eventsQuery);

    const summary: PIIAuditSummary = {
      totalDetections: 0,
      savedAnyway: 0,
      edited: 0,
      cancelled: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {},
    };

    snapshot.docs.forEach((doc) => {
      const event = doc.data();

      // Filter by date range if specified
      if (startDate || endDate) {
        const createdAt = new Date(event.created_at);
        if (startDate && createdAt < startDate) return;
        if (endDate && createdAt > endDate) return;
      }

      summary.totalDetections++;

      // Count by action
      switch (event.user_action) {
        case 'saved_anyway':
          summary.savedAnyway++;
          break;
        case 'edited':
          summary.edited++;
          break;
        case 'cancelled':
          summary.cancelled++;
          break;
      }

      // Count by severity
      if (event.severity in summary.bySeverity) {
        summary.bySeverity[event.severity as PiiSeverity]++;
      }

      // Count by type
      summary.byType[event.detection_type] = (summary.byType[event.detection_type] || 0) + 1;
    });

    return summary;
  } catch (err) {
    console.error('[PII Audit] Exception getting summary:', err);
    return null;
  }
}

/**
 * Get recent PII detection events for a specific record
 *
 * Useful for record detail screens and data subject access requests.
 */
export async function getPiiEventsForRecord(
  recordId: string,
  limit = 50
): Promise<Array<{
  id: string;
  fieldLabel: string;
  detectionType: string;
  severity: PiiSeverity;
  userAction: PiiUserAction;
  createdAt: string;
}> | null> {
  try {
    const eventsQuery = query(
      collection(db, 'pii_detection_events'),
      where('record_id', '==', recordId),
      orderBy('created_at', 'desc'),
      firestoreLimit(limit)
    );
    const snapshot = await getDocs(eventsQuery);

    return snapshot.docs.map((doc) => {
      const event = doc.data();
      return {
        id: doc.id,
        fieldLabel: event.field_label,
        detectionType: event.detection_type,
        severity: event.severity as PiiSeverity,
        userAction: event.user_action as PiiUserAction,
        createdAt: event.created_at,
      };
    });
  } catch (err) {
    console.error('[PII Audit] Exception getting record events:', err);
    return null;
  }
}
