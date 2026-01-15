# ADR 0002: PII Detection Strategy - Warn, Not Block

## Status

Accepted

## Context

Donedex handles property inspection data which may inadvertently contain Personal Identifiable Information (PII). We need to balance:

- GDPR/privacy compliance
- User experience (not blocking legitimate work)
- Flexibility for different organization needs
- Audit trail for compliance

## Decision

We will implement a **warn-first approach** with configurable blocking:

### Default Strategy: WARN

1. Detect PII patterns in text fields during input
2. Show inline warnings when PII is detected
3. Require acknowledgment for critical PII (SSN, NI numbers, credit cards)
4. Log all detections for audit purposes
5. **Allow users to proceed** after warning

### Optional: BLOCK

Organizations can configure stricter policies:
- `block-critical`: Block saving when critical PII detected
- `block-all`: Block all detected PII

### PII Categories and Severities

| Category | Severity | Examples |
|----------|----------|----------|
| Email | High | john@example.com |
| Phone | High | +44 7911 123456 |
| UK NI Number | Critical | AB123456C |
| US SSN | Critical | 123-45-6789 |
| Credit Card | Critical | 1234 5678 9012 3456 |
| UK Postcode | Low | SW1A 1AA |
| IBAN | Critical | GB82WEST12345698765432 |

### Field Exemptions

Structured field types designed for PII skip detection:
- email, phone, contractor, witness, person_picker, signature, gps_location

## Consequences

### Positive

- Users aren't blocked from legitimate work
- Clear audit trail for compliance
- Configurable per organization
- Reduces false positive frustration

### Negative

- PII may be saved if user ignores warnings
- Requires user training on proper data handling
- Audit log storage requirements

### Neutral

- Pattern matching has inherent false positive rate
- Some edge cases may slip through

## Related Files

- `piiDetection.ts`: Pattern matching and detection logic
- `piiAudit.ts`: Audit logging service
