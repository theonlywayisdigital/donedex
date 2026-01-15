# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions made in the Donedex project.

## What is an ADR?

An ADR is a document that captures an important architectural decision along with its context and consequences.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-offline-first-architecture.md) | Offline-First Architecture | Accepted |
| [0002](0002-pii-detection-strategy.md) | PII Detection Strategy | Accepted |
| [0003](0003-state-management-zustand.md) | State Management with Zustand | Accepted |
| [0004](0004-web-first-compatibility.md) | Web-First Compatibility | Accepted |
| [0005](0005-supabase-backend.md) | Supabase as Backend | Accepted |

## Template

When creating a new ADR, use this template:

```markdown
# ADR XXXX: Title

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
### Negative
### Neutral

## Related

Links to related files, docs, or ADRs.
```

## Naming Convention

- Use sequential numbering: `0001`, `0002`, etc.
- Use lowercase with hyphens for filenames
- Keep titles concise but descriptive
