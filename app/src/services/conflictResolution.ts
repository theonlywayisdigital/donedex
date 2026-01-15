/**
 * Conflict Resolution Service
 * Handles merging local and server data when syncing offline changes
 */

import type { ReportResponse } from './reports';
import type { InspectionDraftResponse } from './localStorage';

export interface ConflictField {
  field: 'responseValue' | 'severity' | 'notes';
  localValue: string | null;
  serverValue: string | null;
  localTimestamp: string;
  serverTimestamp: string;
}

export interface ResponseConflict {
  templateItemId: string;
  itemLabel: string;
  conflicts: ConflictField[];
}

export interface MergedResponse {
  templateItemId: string;
  responseValue: string | null;
  severity: string | null;
  notes: string | null;
  photos: string[];
  /** Whether any fields had conflicts that were auto-resolved */
  hadConflicts: boolean;
  /** Fields that were taken from local (newer) */
  localWins: string[];
  /** Fields that were taken from server (newer) */
  serverWins: string[];
}

export type ConflictResolutionStrategy = 'local-wins' | 'server-wins' | 'newest-wins';

/**
 * Compare timestamps to determine which is newer
 */
function isNewer(timestamp1: string, timestamp2: string): boolean {
  return new Date(timestamp1) > new Date(timestamp2);
}

/**
 * Merge a single response field based on timestamps
 * Returns the winning value and which side won
 */
function mergeField(
  localValue: string | null,
  serverValue: string | null,
  localTimestamp: string,
  serverTimestamp: string,
  strategy: ConflictResolutionStrategy
): { value: string | null; winner: 'local' | 'server' | 'same' } {
  // If values are the same, no conflict
  if (localValue === serverValue) {
    return { value: localValue, winner: 'same' };
  }

  // If one is null and other isn't, prefer the non-null value
  if (localValue === null && serverValue !== null) {
    return { value: serverValue, winner: 'server' };
  }
  if (serverValue === null && localValue !== null) {
    return { value: localValue, winner: 'local' };
  }

  // Both have values - resolve based on strategy
  switch (strategy) {
    case 'local-wins':
      return { value: localValue, winner: 'local' };
    case 'server-wins':
      return { value: serverValue, winner: 'server' };
    case 'newest-wins':
    default:
      if (isNewer(localTimestamp, serverTimestamp)) {
        return { value: localValue, winner: 'local' };
      }
      return { value: serverValue, winner: 'server' };
  }
}

/**
 * Merge local draft response with server response
 * Uses field-level merging based on timestamps
 */
export function mergeResponse(
  localResponse: InspectionDraftResponse | undefined,
  serverResponse: ReportResponse | undefined,
  itemLabel: string,
  itemType: string,
  strategy: ConflictResolutionStrategy = 'newest-wins'
): MergedResponse {
  const now = new Date().toISOString();
  const localTimestamp = localResponse?.fieldUpdatedAt || now;
  const serverTimestamp = serverResponse?.updated_at || serverResponse?.created_at || now;

  // If only one exists, use that
  if (!localResponse && serverResponse) {
    return {
      templateItemId: serverResponse.template_item_id,
      responseValue: serverResponse.response_value,
      severity: serverResponse.severity,
      notes: serverResponse.notes,
      photos: [],
      hadConflicts: false,
      localWins: [],
      serverWins: ['responseValue', 'severity', 'notes'],
    };
  }

  if (localResponse && !serverResponse) {
    return {
      templateItemId: localResponse.templateItemId,
      responseValue: localResponse.responseValue,
      severity: localResponse.severity,
      notes: localResponse.notes,
      photos: localResponse.photos || [],
      hadConflicts: false,
      localWins: ['responseValue', 'severity', 'notes'],
      serverWins: [],
    };
  }

  // Neither exists - return empty
  if (!localResponse && !serverResponse) {
    return {
      templateItemId: '',
      responseValue: null,
      severity: null,
      notes: null,
      photos: [],
      hadConflicts: false,
      localWins: [],
      serverWins: [],
    };
  }

  // Both exist - merge field by field
  const local = localResponse!;
  const server = serverResponse!;

  const responseValueMerge = mergeField(
    local.responseValue,
    server.response_value,
    localTimestamp,
    serverTimestamp,
    strategy
  );

  const severityMerge = mergeField(
    local.severity,
    server.severity,
    localTimestamp,
    serverTimestamp,
    strategy
  );

  const notesMerge = mergeField(
    local.notes,
    server.notes,
    localTimestamp,
    serverTimestamp,
    strategy
  );

  const localWins: string[] = [];
  const serverWins: string[] = [];
  let hadConflicts = false;

  if (responseValueMerge.winner === 'local') localWins.push('responseValue');
  else if (responseValueMerge.winner === 'server') serverWins.push('responseValue');
  if (responseValueMerge.winner !== 'same') hadConflicts = true;

  if (severityMerge.winner === 'local') localWins.push('severity');
  else if (severityMerge.winner === 'server') serverWins.push('severity');
  if (severityMerge.winner !== 'same') hadConflicts = true;

  if (notesMerge.winner === 'local') localWins.push('notes');
  else if (notesMerge.winner === 'server') serverWins.push('notes');
  if (notesMerge.winner !== 'same') hadConflicts = true;

  return {
    templateItemId: local.templateItemId,
    responseValue: responseValueMerge.value,
    severity: severityMerge.value,
    notes: notesMerge.value,
    photos: local.photos || [],
    hadConflicts,
    localWins,
    serverWins,
  };
}

/**
 * Detect conflicts between local and server responses
 * Returns list of conflicts for UI display
 */
export function detectConflicts(
  localResponse: InspectionDraftResponse,
  serverResponse: ReportResponse,
  itemLabel: string
): ResponseConflict | null {
  const localTimestamp = localResponse.fieldUpdatedAt || new Date().toISOString();
  const serverTimestamp = serverResponse.updated_at || serverResponse.created_at;

  const conflicts: ConflictField[] = [];

  // Check each field for conflicts
  if (
    localResponse.responseValue !== serverResponse.response_value &&
    localResponse.responseValue !== null &&
    serverResponse.response_value !== null
  ) {
    conflicts.push({
      field: 'responseValue',
      localValue: localResponse.responseValue,
      serverValue: serverResponse.response_value,
      localTimestamp,
      serverTimestamp,
    });
  }

  if (
    localResponse.severity !== serverResponse.severity &&
    localResponse.severity !== null &&
    serverResponse.severity !== null
  ) {
    conflicts.push({
      field: 'severity',
      localValue: localResponse.severity,
      serverValue: serverResponse.severity,
      localTimestamp,
      serverTimestamp,
    });
  }

  if (
    localResponse.notes !== serverResponse.notes &&
    localResponse.notes !== null &&
    serverResponse.notes !== null
  ) {
    conflicts.push({
      field: 'notes',
      localValue: localResponse.notes,
      serverValue: serverResponse.notes,
      localTimestamp,
      serverTimestamp,
    });
  }

  if (conflicts.length === 0) {
    return null;
  }

  return {
    templateItemId: localResponse.templateItemId,
    itemLabel,
    conflicts,
  };
}

/**
 * Batch merge all responses from local draft with server responses
 */
export function mergeAllResponses(
  localResponses: InspectionDraftResponse[],
  serverResponses: ReportResponse[],
  templateItems: Array<{ id: string; label: string; item_type: string }>,
  strategy: ConflictResolutionStrategy = 'newest-wins'
): {
  merged: MergedResponse[];
  conflictCount: number;
  localWinCount: number;
  serverWinCount: number;
} {
  const serverMap = new Map(serverResponses.map((r) => [r.template_item_id, r]));
  const localMap = new Map(localResponses.map((r) => [r.templateItemId, r]));

  let conflictCount = 0;
  let localWinCount = 0;
  let serverWinCount = 0;

  const merged = templateItems.map((item) => {
    const local = localMap.get(item.id);
    const server = serverMap.get(item.id);

    const result = mergeResponse(local, server, item.label, item.item_type, strategy);

    if (result.hadConflicts) conflictCount++;
    localWinCount += result.localWins.length;
    serverWinCount += result.serverWins.length;

    return result;
  });

  return {
    merged,
    conflictCount,
    localWinCount,
    serverWinCount,
  };
}
