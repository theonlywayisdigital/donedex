# Offline Sync Strategy

> **Status:** Implemented (MVP)
> **Last Updated:** January 2026

## Overview

Donedex uses an **offline-first architecture** that allows field workers to complete inspections even without network connectivity. Data is stored locally and synchronized with the server when connectivity is restored.

## Architecture Components

### 1. Local Storage Service (`localStorage.ts`)

Cross-platform storage abstraction that handles data persistence:

| Platform | Storage Backend |
|----------|----------------|
| iOS/Android | `@react-native-async-storage/async-storage` |
| Web | `localStorage` API |

**Storage Keys:**
```typescript
STORAGE_KEYS = {
  INSPECTION_DRAFTS: 'inspection_drafts',  // In-progress inspections
  TEMPLATE_CACHE: 'template_cache',         // Cached templates (not yet implemented)
  SYNC_QUEUE: 'sync_queue',                 // Pending sync operations
  LAST_SYNC: 'last_sync',                   // Last successful sync timestamp
  USER_PREFERENCES: 'user_preferences',     // User settings
}
```

### 2. Network Status Service (`networkStatus.ts`)

Monitors connectivity using `@react-native-community/netinfo`:

- **`isOnline()`**: Check current connectivity (cached for instant response)
- **`useNetworkStatus()`**: React hook for reactive network state
- **`subscribeToNetworkChanges()`**: Subscribe to connectivity changes
- **`useOfflineAwareAction()`**: Wrap actions with offline awareness

### 3. Sync Service (`syncService.ts`)

Manages the synchronization queue and processes pending operations:

- **Queue-based**: Operations are queued when offline
- **Automatic retry**: Up to 3 retries per operation
- **Auto-sync on reconnection**: Triggers when network is restored
- **Operation types**: `response`, `photo`, `report_submit`

### 4. Inspection Store (`inspectionStore.ts`)

Zustand store that coordinates offline-aware inspection workflow:

- Auto-saves drafts to local storage on every response change
- Queues operations when offline
- Merges local and server data on load (preferring newer local data)

## Data Flow

### Online Flow

```
User Action → Zustand Store → Save Local Draft → API Call → Server
```

### Offline Flow

```
User Action → Zustand Store → Save Local Draft → Add to Sync Queue
                                                       ↓
Network Restored → Process Sync Queue → API Call → Server
                                                       ↓
                                              Remove from Queue
```

## Inspection Draft Structure

```typescript
interface InspectionDraft {
  reportId: string;
  templateId: string;
  recordId: string;
  responses: Array<{
    templateItemId: string;
    responseValue: string | null;
    photos: string[];          // Local file URIs
    notes: string | null;
    severity: string | null;
  }>;
  currentSectionIndex: number; // Resume position
  lastUpdated: string;         // ISO timestamp for conflict detection
}
```

## Sync Queue Item Structure

```typescript
interface SyncQueueItem {
  id: string;                              // Unique identifier
  type: 'response' | 'photo' | 'report_submit';
  data: Record<string, unknown>;           // Operation-specific payload
  createdAt: string;                       // ISO timestamp
  retryCount: number;                      // 0-3, fails after 3
  lastError?: string;                      // Last error message
}
```

## Sync Operations

### 1. Response Sync

Upserts inspection responses to `report_responses` table:

```typescript
{
  type: 'response',
  data: {
    reportId: string,
    templateItemId: string,
    responseValue: string | null,
    notes: string | null,
    severity: string | null,
  }
}
```

### 2. Photo Sync

Uploads photos to Supabase Storage, then creates database record:

```typescript
{
  type: 'photo',
  data: {
    reportId: string,
    responseId: string,
    photoUri: string,  // Local file URI
  }
}
```

**Photo Processing:**
- Compressed to max 2000x2000px, 80% quality before upload
- Uploaded to `report-photos` bucket
- Path format: `{reportId}/{responseId}/{timestamp}.jpg`

### 3. Report Submit Sync

Updates report status to 'submitted':

```typescript
{
  type: 'report_submit',
  data: {
    reportId: string,
  }
}
```

## Conflict Resolution

### Current Implementation

**Field-level merging** with configurable strategy using `conflictResolution.ts`:

1. On load, both server responses and local draft are fetched
2. Each field (responseValue, severity, notes) is compared independently
3. Timestamps determine the winner for each field using the selected strategy
4. Photos are preserved from local storage (additive)

```typescript
// Strategy options
type ConflictResolutionStrategy = 'local-wins' | 'server-wins' | 'newest-wins';

// Default: newest-wins
const { merged, conflictCount } = mergeAllResponses(
  localDraft?.responses || [],
  serverResponses,
  templateItems,
  'newest-wins'
);
```

### Field-Level Merge Logic

Each field is merged independently based on:

1. **Null handling**: Non-null values are preferred over null
2. **Timestamp comparison**: When both have values, timestamps determine winner
3. **Strategy override**: `local-wins` or `server-wins` can override timestamp logic

```typescript
interface InspectionDraftResponse {
  templateItemId: string;
  responseValue: string | null;
  severity: string | null;
  notes: string | null;
  photos: string[];
  /** Per-field timestamp for precise conflict resolution */
  fieldUpdatedAt: string;
}
```

### Merge Result

The merge operation returns detailed information about conflicts:

```typescript
interface MergedResponse {
  templateItemId: string;
  responseValue: string | null;
  severity: string | null;
  notes: string | null;
  photos: string[];
  hadConflicts: boolean;      // Whether any field had different values
  localWins: string[];        // Fields where local data was used
  serverWins: string[];       // Fields where server data was used
}
```

### Conflict Detection

For UI notification (future enhancement):

```typescript
const conflicts = detectConflicts(localResponse, serverResponse, itemLabel);
// Returns null if no conflicts, or:
// {
//   templateItemId: string,
//   itemLabel: string,
//   conflicts: Array<{
//     field: 'responseValue' | 'severity' | 'notes',
//     localValue: string | null,
//     serverValue: string | null,
//     localTimestamp: string,
//     serverTimestamp: string,
//   }>
// }
```

### Current Limitations

- No UI for manual conflict resolution (auto-resolved using strategy)
- Photos are additive only (deletions not synced)
- Template changes while offline may cause field mismatches
- Version number not yet used for optimistic locking

### Future Enhancements

- Conflict resolution UI showing both values
- Manual selection for important conflicts
- Optimistic locking using version numbers
- Photo deletion sync

## Auto-Save Behavior

Drafts are saved automatically on every response change:

```typescript
setResponse: (templateItemId, item, value, severity, notes) => {
  // Update in-memory state
  // ...

  // Auto-save draft locally (fire and forget)
  if (report && template) {
    saveInspectionDraft(draft).catch(console.error);
  }
}
```

This ensures:
- No data loss on app crash
- Instant local persistence
- Background operation (non-blocking)

## Network Reconnection

The sync service automatically triggers on network restoration:

```typescript
initializeAutoSync(): () => void {
  let wasOffline = false;

  subscribeToNetworkChanges(async (online) => {
    if (online && wasOffline) {
      await processSyncQueue();
    }
    wasOffline = !online;
  });
}
```

## Retry Logic

Failed sync operations are retried up to 3 times:

```typescript
const MAX_RETRIES = 3;

if (result) {
  await removeFromSyncQueue(item.id);
} else {
  const newRetryCount = item.retryCount + 1;

  if (newRetryCount >= MAX_RETRIES) {
    // Keep in queue but mark as failed
    await updateSyncQueueItem(item.id, {
      retryCount: newRetryCount,
      lastError: 'Max retries exceeded',
    });
  } else {
    await updateSyncQueueItem(item.id, { retryCount: newRetryCount });
  }
}
```

## Status Monitoring

Components can subscribe to sync status:

```typescript
// Hook usage
const { isOnline, isLoading } = useNetworkStatus();

// Direct subscription
subscribeToSyncStatus((syncing, pending) => {
  console.log(`Syncing: ${syncing}, Pending: ${pending}`);
});

// Get current status
const status = await getSyncStatus();
// { isSyncing: boolean, pendingItems: number, lastSync: string | null }
```

## User Experience Considerations

### Visual Indicators

- Show offline banner when disconnected
- Display pending sync count
- Show last sync timestamp
- Indicate when auto-saving

### Error Handling

- Silent failures for queue operations (user sees success)
- Manual retry available for failed items
- Clear error messages when truly offline

## Phase 2 Improvements

Planned enhancements for conflict resolution:

1. **Field-level merging**: Merge individual fields instead of entire responses
2. **Conflict detection UI**: Show conflicts and let user choose
3. **Timestamp comparison**: Compare server `updated_at` with local `lastUpdated`
4. **Template versioning**: Handle template changes during offline period
5. **Photo deletion sync**: Queue photo deletions for sync
6. **Optimistic locking**: Use version numbers to detect concurrent edits

## Testing Considerations

### Manual Testing

1. Complete inspection offline
2. Kill app, reopen - verify draft restored
3. Go online - verify sync completes
4. Check server data matches local

### Automated Testing

- Mock `NetInfo` to simulate offline/online states
- Mock `AsyncStorage` for storage operations
- Test sync queue processing order
- Test retry logic with failures

## Security Notes

- Local storage is not encrypted (device encryption is relied upon)
- Photos stored as local file URIs until synced
- No sensitive data in sync queue payloads
- Server validates all synced data via RLS policies

## Related Files

| File | Purpose |
|------|---------|
| `src/services/localStorage.ts` | Storage abstraction |
| `src/services/networkStatus.ts` | Connectivity monitoring |
| `src/services/syncService.ts` | Sync queue management |
| `src/services/conflictResolution.ts` | Field-level merge logic |
| `src/store/inspectionStore.ts` | Inspection state + offline logic |
| `src/services/imageCompression.ts` | Photo compression before upload |
