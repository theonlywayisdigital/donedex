# ADR 0005: Supabase as Backend

## Status

Accepted

## Context

We needed a backend solution that provides:

- Authentication with email/password and magic links
- PostgreSQL database with RLS (Row Level Security)
- Real-time subscriptions (future feature)
- File storage for photos
- Edge functions for server-side logic
- Managed infrastructure (we don't want to manage servers)

Options considered:
- Firebase: Good but vendor lock-in, NoSQL limitations
- AWS Amplify: Complex, steep learning curve
- Custom Node.js: Full control but operational overhead
- Supabase: PostgreSQL, open source, managed

## Decision

We will use **Supabase** as our complete backend solution:

### Components Used

| Component | Purpose |
|-----------|---------|
| Auth | Email/password, magic links, session management |
| Database | PostgreSQL with RLS for multi-tenant security |
| Storage | Photo uploads with presigned URLs |
| Edge Functions | PDF generation, email sending, AI processing |
| Realtime | Future: live collaboration |

### Database Schema Highlights

- Multi-tenant via `organisation_id` on most tables
- RLS policies enforce tenant isolation
- Soft deletes with `deleted_at` columns
- Audit trails via trigger functions

### Edge Functions

```
/supabase/functions/
├── send-email/           # Email notifications
├── send-invite/          # Team invitations
├── generate-report-pdf/  # PDF export
├── template-builder-chat/ # AI template builder
├── stripe-webhook/       # Payment processing
└── parse-checklist/      # AI checklist parsing
```

### Security Model

1. **RLS everywhere**: Every table has RLS policies
2. **Service role only in edge functions**: Client never uses service key
3. **JWT validation**: All requests authenticated
4. **Audit logging**: Super admin actions logged

## Consequences

### Positive

- Rapid development with managed infrastructure
- PostgreSQL power (transactions, joins, constraints)
- RLS provides security at database level
- Open source - no vendor lock-in
- Generous free tier for development

### Negative

- Some PostgreSQL features require raw SQL
- Edge function cold starts (mitigated with warm-up)
- Less flexibility than custom backend
- Realtime has connection limits

### Neutral

- Need to understand RLS patterns
- TypeScript types generated from schema
- Some operations require admin API

## Related

- Database migrations in `/supabase/migrations/`
- Edge functions in `/supabase/functions/`
