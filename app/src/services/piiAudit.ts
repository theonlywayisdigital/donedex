/**
 * PII Audit Logging Service
 *
 * Logs PII detection events for compliance and audit purposes.
 * These logs help demonstrate due diligence in handling personal data.
 *
 * Features:
 * - Logs when PII is detected in user input
 * - Records user actions (saved anyway, edited, cancelled)
 * - Supports batch logging for form submissions with multiple fields
 * - Async/non-blocking to avoid impacting user experience
 */

import { supabase } from './supabase';
import type { PIIDetectionResult, PIIMatch } from './piiDetection';
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

  // Create one event per detection type (deduped by category)
  const loggedCategories = new Set<string>();
  const events = detectionResult.matches
    .filter((match) => {
      // Only log each category once per field
      if (loggedCategories.has(match.category)) {
        return false;
      }
      loggedCategories.add(match.category);
      return true;
    })
    .map((match) => ({
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
    }));

  if (events.length === 0) {
    return;
  }

  try {
    const { error } = await supabase
      .from('pii_detection_events')
      .insert(events as never[]);

    if (error) {
      // Log to console but don't throw - audit logging should never break the app
      console.error('[PII Audit] Failed to log detection:', error.message);
    }
  } catch (err) {
    console.error('[PII Audit] Exception during logging:', err);
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

  const events: Array<{
    organisation_id: string;
    user_id: string | null;
    record_id: string | null;
    record_type_id: string | null;
    field_id: string | null;
    field_label: string;
    detection_type: string;
    severity: PiiSeverity;
    detected_pattern: string | null;
    user_action: PiiUserAction;
    was_warned: boolean;
    client_platform: string;
  }> = [];

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

      events.push({
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
      });
    });
  });

  if (events.length === 0) {
    return;
  }

  try {
    const { error } = await supabase
      .from('pii_detection_events')
      .insert(events as never[]);

    if (error) {
      console.error('[PII Audit] Failed to log batch detection:', error.message);
    }
  } catch (err) {
    console.error('[PII Audit] Exception during batch logging:', err);
  }
}

// ============================================
// Query Functions (for admin/compliance)
// ============================================

// Internal type for query results (Supabase returns generic types)
interface PIIEventRow {
  id: string;
  severity: string;
  detection_type: string;
  user_action: string;
  field_label: string;
  created_at: string;
}

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
    let query = supabase
      .from('pii_detection_events')
      .select('severity, detection_type, user_action')
      .eq('organisation_id', organisationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('[PII Audit] Failed to get summary:', error?.message);
      return null;
    }

    const events = data as unknown as PIIEventRow[];

    const summary: PIIAuditSummary = {
      totalDetections: events.length,
      savedAnyway: 0,
      edited: 0,
      cancelled: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {},
    };

    events.forEach((event) => {
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
    const { data, error } = await supabase
      .from('pii_detection_events')
      .select('id, field_label, detection_type, severity, user_action, created_at')
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error('[PII Audit] Failed to get record events:', error?.message);
      return null;
    }

    const events = data as unknown as PIIEventRow[];

    return events.map((event) => ({
      id: event.id,
      fieldLabel: event.field_label,
      detectionType: event.detection_type,
      severity: event.severity as PiiSeverity,
      userAction: event.user_action as PiiUserAction,
      createdAt: event.created_at,
    }));
  } catch (err) {
    console.error('[PII Audit] Exception getting record events:', err);
    return null;
  }
}
