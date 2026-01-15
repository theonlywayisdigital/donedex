# ADR 0001: Offline-First Architecture

## Status

Accepted

## Context

Donedex is used by field workers conducting property inspections, often in locations with poor or no network connectivity (basements, rural areas, buildings with thick walls). Data loss due to connectivity issues would be unacceptable as it could mean re-doing hours of inspection work.

## Decision

We will implement an **offline-first architecture** where:

1. All user input is immediately persisted to local storage
2. A sync queue manages pending operations
3. Automatic sync triggers when network connectivity is restored
4. Field-level conflict resolution merges local and server changes

### Key Components

- **localStorage.ts**: Cross-platform storage abstraction (AsyncStorage on native, localStorage on web)
- **networkStatus.ts**: Real-time connectivity monitoring via NetInfo
- **syncService.ts**: Queue-based sync with retry logic
- **conflictResolution.ts**: Field-level merge with configurable strategies
- **inspectionStore.ts**: Zustand store coordinating offline-aware workflows

### Sync Queue Types

- `response`: Inspection responses (answers to template items)
- `photo`: Photo uploads (compressed before sync)
- `report_submit`: Report status changes

## Consequences

### Positive

- Users can work completely offline
- No data loss from connectivity issues
- Automatic recovery when online

### Negative

- Increased local storage usage
- Potential for stale data if offline too long
- Complexity in conflict resolution
- Template changes during offline period require careful handling

### Neutral

- Slightly delayed server updates (acceptable trade-off)
- Requires user education about offline indicators

## Related

- [offline-sync-strategy.md](../offline-sync-strategy.md) for implementation details
