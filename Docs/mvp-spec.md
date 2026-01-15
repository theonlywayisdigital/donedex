# Donedex MVP Specification

> **Version:** 1.0
> **Last Updated:** January 2025
> **Purpose:** Complete specification for building MVP with Claude Code

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core User Flows](#4-core-user-flows)
5. [Database Schema](#5-database-schema)
6. [Template Builder](#6-template-builder)
7. [AI Checklist Import](#7-ai-checklist-import)
8. [Inspection Flow](#8-inspection-flow)
9. [Reports & Storage](#9-reports--storage)
10. [Screen Specifications](#10-screen-specifications)
11. [API Endpoints](#11-api-endpoints)
12. [Project Structure](#12-project-structure)
13. [MVP Feature Checklist](#13-mvp-feature-checklist)
14. [Future Phases](#14-future-phases)

---

## 1. Product Overview

### What is Donedex?

A mobile-first inspection and checklist tool for commercial property management. Users create custom inspection templates and complete daily site checks, capturing evidence for insurance and compliance purposes.

### Core Problem

Commercial property managers (shopping centres, retail parks, etc.) currently use handwritten check sheets for daily site inspections. These are:
- Hard to search and retrieve
- Not standardised across sites
- Difficult to use as evidence for insurance claims
- Time-consuming to manage

### Solution

A tablet/mobile app where:
1. Admins create custom inspection templates (manually or via AI import)
2. Site staff complete inspections on their devices
3. Reports are stored securely and searchable
4. Evidence (photos, timestamps) is captured automatically

### Target Users

- **Primary:** Shopping centre managers, facilities managers
- **Secondary:** Retail property landlords, commercial estate managers

### Business Model

- "Talk to Sales" approach initially
- Manual account provisioning
- Pricing TBD after beta testing (likely per-site or per-organisation monthly fee)

---

## 2. Tech Stack

### Frontend (Mobile App)

| Technology | Purpose |
|------------|---------|
| React Native | Cross-platform mobile development |
| Expo | Development tooling and build services |
| TypeScript | Type safety |
| React Navigation | Screen navigation |
| React Native Paper or Tamagui | UI component library |

**Design Priority:** Tablet-first (iPad), with mobile phone support

### Backend & Infrastructure

| Technology | Purpose |
|------------|---------|
| Supabase Auth | User authentication (email/password) |
| Supabase Database | PostgreSQL database |
| Supabase Storage | Photo storage for inspection evidence |
| Supabase Edge Functions | Server-side logic, AI integration |
| Supabase Realtime | (Future) Live sync between devices |

### AI Integration

| Technology | Purpose |
|------------|---------|
| Claude API (Anthropic) | Parse uploaded checklists into structured templates |

### Website (Marketing/Sales)

| Technology | Purpose |
|------------|---------|
| Next.js or Astro | Simple marketing site |
| Calendly embed | "Book a Demo" scheduling |

### Payments (Future)

| Technology | Purpose |
|------------|---------|
| Stripe | Subscription billing (web only, not in-app) |

---

## 3. User Roles & Permissions

### Role Definitions

| Role | Description |
|------|-------------|
| `owner` | Organisation creator, full access, can delete organisation |
| `admin` | Can manage templates, sites, users, view all reports |
| `user` | Can complete inspections at assigned sites, view own reports |

### Permission Matrix

| Action | Owner | Admin | User |
|--------|-------|-------|------|
| Create/edit templates | ✅ | ✅ | ❌ |
| Delete templates | ✅ | ✅ | ❌ |
| Create/edit sites | ✅ | ✅ | ❌ |
| Delete sites | ✅ | ✅ | ❌ |
| Invite users | ✅ | ✅ | ❌ |
| Remove users | ✅ | ✅ | ❌ |
| Assign users to sites | ✅ | ✅ | ❌ |
| Complete inspections | ✅ | ✅ | ✅ |
| View all reports | ✅ | ✅ | ❌ |
| View own reports | ✅ | ✅ | ✅ |
| Export reports | ✅ | ✅ | ❌ |
| Delete organisation | ✅ | ❌ | ❌ |
| Billing/subscription | ✅ | ❌ | ❌ |

---

## 4. Core User Flows

### Flow 1: Account Setup (Admin)

```
1. Admin receives login credentials (provisioned manually after sales call)
2. Admin logs in
3. Admin lands on empty dashboard
4. Admin creates first site
5. Admin creates first template (manual or AI import)
6. Admin assigns template to site
7. Admin invites site users (optional)
```

### Flow 2: Template Creation - Manual

```
1. Admin taps "New Template"
2. Admin enters template name
3. Admin adds sections (e.g., "Car Park", "Main Entrance")
4. Within each section, admin adds check items:
   - Item label
   - Response type (pass/fail, condition, etc.)
   - Photo requirement (never / on fail / always)
5. Admin reorders sections/items as needed
6. Admin saves template
7. Admin assigns template to one or more sites
```

### Flow 3: Template Creation - AI Import

```
1. Admin taps "New Template"
2. Admin selects "Import from existing checklist"
3. Admin uploads file (PDF, image, Word doc)
4. System sends file to Claude API for parsing
5. System displays parsed template for review
6. Admin edits/adjusts as needed
7. Admin saves and assigns to sites
```

### Flow 4: Complete an Inspection (User)

```
1. User logs in on tablet/phone
2. User sees list of assigned sites
3. User selects site
4. User sees available templates for today
5. User taps template to start inspection
6. User works through sections:
   - For each item, selects response
   - If issue found, optionally adds photo
   - If high severity, flags it
7. User reviews completed inspection
8. User submits
9. Report is timestamped, locked, and stored
```

### Flow 5: View Reports (Admin)

```
1. Admin navigates to Reports section
2. Admin filters by site, date range, or user
3. Admin sees list of completed inspections
4. Admin taps report to view details
5. Admin can export as PDF
```

---

## 5. Database Schema

### Entity Relationship Overview

```
organisations
    ├── users (via organisation_users join table)
    ├── record_types
    │   └── record_type_fields (custom fields for this type)
    ├── records (instances of record types, formerly "sites")
    │   └── record_template_assignments
    ├── templates
    │   └── template_sections
    │       └── template_items
    └── reports
        └── report_responses
            └── report_photos

library (global, read-only)
    ├── library_record_types (pre-built templates for record types)
    └── library_templates (pre-built inspection templates)
```

### Table Definitions

#### `organisations`

```sql
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `users`

Uses Supabase Auth. Additional profile data:

```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `organisation_users`

Join table for users ↔ organisations with roles:

```sql
CREATE TABLE organisation_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);
```

#### `record_types`

Record types define categories of records with custom field schemas:

```sql
CREATE TABLE record_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#0F4C5C',
    is_system BOOLEAN DEFAULT FALSE,
    source_library_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `record_type_fields`

Custom fields for each record type (supports 53 field types from fieldTypes.ts):

```sql
CREATE TABLE record_type_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type_id UUID NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL, -- e.g., 'short_text', 'number', 'single_select', etc.
    is_required BOOLEAN DEFAULT FALSE,
    help_text TEXT,
    placeholder_text TEXT,
    default_value TEXT,
    options JSONB, -- For select fields: ["Option 1", "Option 2"]
    min_value NUMERIC,
    max_value NUMERIC,
    unit_type TEXT, -- e.g., 'length', 'weight', 'temperature'
    unit_options JSONB, -- Custom units: ["kg", "lb"]
    default_unit TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `records` (formerly `sites`)

Records are instances of record types with dynamic field values:

```sql
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    record_type_id UUID REFERENCES record_types(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    metadata JSONB, -- Stores custom field values: { "field_id": "value" }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `library_record_types`

Pre-built record type templates (global, read-only):

```sql
CREATE TABLE library_record_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#0F4C5C',
    category TEXT, -- e.g., 'property', 'assets', 'people'
    fields JSONB NOT NULL, -- Array of field definitions
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Pre-built record types include:
- **Vehicles** - Registration, make, model, mileage, service dates
- **Sites** - Address, postcode, square footage, floors
- **Properties** - Property type, bedrooms, year built, landlord
- **Equipment** - Serial number, manufacturer, warranty, next service
- **People** - Contact details, role, department
- **Projects** - Status, budget, timeline, manager
- **Clients** - Company name, contact, account number
- **Residents** - Unit number, lease dates, emergency contact
- **Rooms** - Floor, dimensions, capacity
- **Events** - Date, time, venue, attendees

#### `library_templates`

Pre-built inspection templates (global, read-only):

```sql
CREATE TABLE library_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'safety', 'maintenance', 'compliance'
    record_type_category TEXT, -- Links to library_record_types category
    sections JSONB NOT NULL, -- Full template structure
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Pre-built templates include:
- **Property:** Inventory Check-In, Inventory Check-Out, Periodic Inspection
- **Vehicle:** Pre-Trip Inspection, Post-Trip Inspection, Monthly Maintenance Check
- **Equipment:** Daily Equipment Check, Preventive Maintenance
- **Safety:** Fire Safety Audit, Health & Safety Walkthrough
- **Facility:** Building Exterior Inspection, Common Areas Inspection
- **Event:** Pre-Event Setup Check, Post-Event Breakdown Check
- **Compliance:** ADA Accessibility Audit, Environmental Compliance Check

#### `user_site_assignments`

Which users can access which sites:

```sql
CREATE TABLE user_site_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, site_id)
);
```

#### `templates`

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `template_sections`

```sql
CREATE TABLE template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `template_items`

```sql
CREATE TABLE template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES template_sections(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN (
        'pass_fail',
        'yes_no', 
        'condition',
        'severity',
        'text',
        'number',
        'select',
        'multi_select',
        'photo'
    )),
    is_required BOOLEAN DEFAULT TRUE,
    photo_rule TEXT DEFAULT 'never' CHECK (photo_rule IN ('never', 'on_fail', 'always')),
    options JSONB, -- For select/multi_select: ["Option 1", "Option 2"]
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `site_template_assignments`

Which templates are available at which sites:

```sql
CREATE TABLE site_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, template_id)
);
```

#### `reports`

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `report_responses`

```sql
CREATE TABLE report_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    template_item_id UUID REFERENCES template_items(id),
    -- Store item snapshot in case template changes later
    item_label TEXT NOT NULL,
    item_type TEXT NOT NULL,
    -- Response data
    response_value TEXT, -- The actual response
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `report_photos`

```sql
CREATE TABLE report_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_response_id UUID REFERENCES report_responses(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

Enable RLS on all tables. Key policies:

```sql
-- Users can only see their own organisation's data
CREATE POLICY "Users can view own organisation"
ON organisations FOR SELECT
USING (
    id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid()
    )
);

-- Users can only see sites in their organisation
CREATE POLICY "Users can view organisation sites"
ON sites FOR SELECT
USING (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid()
    )
);

-- Site users can only see their assigned sites
CREATE POLICY "Users can view assigned sites"
ON sites FOR SELECT
USING (
    id IN (
        SELECT site_id FROM user_site_assignments
        WHERE user_id = auth.uid()
    )
    OR
    -- Admins/owners can see all sites in their org
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Similar policies for templates, reports, etc.
```

### Database Indexes

```sql
CREATE INDEX idx_organisation_users_user ON organisation_users(user_id);
CREATE INDEX idx_organisation_users_org ON organisation_users(organisation_id);
CREATE INDEX idx_sites_organisation ON sites(organisation_id);
CREATE INDEX idx_templates_organisation ON templates(organisation_id);
CREATE INDEX idx_reports_site ON reports(site_id);
CREATE INDEX idx_reports_submitted ON reports(submitted_at);
CREATE INDEX idx_report_responses_report ON report_responses(report_id);
```

---

## 6. Template Builder

### Field Types

| Type | Description | UI Component | Response Format |
|------|-------------|--------------|-----------------|
| `pass_fail` | Binary pass/fail check | Two buttons: ✓ Pass / ✗ Fail | `"pass"` or `"fail"` |
| `yes_no` | Binary yes/no question | Two buttons: Yes / No | `"yes"` or `"no"` |
| `condition` | Three-level condition | Three buttons: Good / Fair / Poor | `"good"`, `"fair"`, `"poor"` |
| `severity` | Hazard severity rating | Three buttons: Low / Medium / High | `"low"`, `"medium"`, `"high"` |
| `text` | Free text input | Text input field | String |
| `number` | Numeric input | Number input | Number as string |
| `select` | Single choice from list | Dropdown or radio buttons | Selected option string |
| `multi_select` | Multiple choices | Checkboxes | JSON array of selected options |
| `photo` | Required photo capture | Camera button | Photo taken (stored separately) |

### Photo Rules

| Rule | Behaviour |
|------|-----------|
| `never` | No photo option shown |
| `on_fail` | Photo button appears only when response indicates an issue (fail, poor, high severity) |
| `always` | Photo button always shown, may be required |

### Template Builder UI States

**Empty State:**
```
No templates yet.
[+ Create Template] or [Import Checklist]
```

**Template List:**
```
Templates (3)
├── Daily Security Check ✓ Published (5 sites)
├── Weekly Fire Safety ✓ Published (2 sites)
└── Monthly Deep Clean [Draft]
```

**Template Editor Structure:**
```
Template Name: [_______________]
Description: [_______________] (optional)

Sections:
┌─ Section: [Car Park] ──────────────── [⋮ Menu] ─┐
│  ☐ [Floor condition]    [Condition ▼] [📷 On Fail ▼]  [⋮] │
│  ☐ [Lighting working]   [Yes/No ▼]    [📷 On Fail ▼]  [⋮] │
│  ☐ [Barriers intact]    [Pass/Fail ▼] [📷 On Fail ▼]  [⋮] │
│  [+ Add Item]                                              │
└────────────────────────────────────────────────────────────┘

[+ Add Section]

[Save Draft]  [Publish]
```

---

## 7. AI Checklist Import

### Overview

Users can upload an existing checklist (PDF, image, or Word document) and the system will parse it into a structured template using Claude.

### Supported File Types

| Type | Extensions | Notes |
|------|------------|-------|
| PDF | .pdf | Text-based or scanned |
| Images | .jpg, .jpeg, .png | Photos of handwritten or printed checklists |
| Word | .docx | Exported from existing systems |

### Processing Flow

```
1. User uploads file
2. Frontend sends file to Supabase Edge Function
3. Edge Function:
   a. If PDF/Word: Extract text
   b. If image: Send directly to Claude with vision
   c. Send to Claude API with parsing prompt
4. Claude returns structured JSON
5. Edge Function validates JSON structure
6. Return parsed template to frontend
7. Frontend displays for user review/edit
8. User saves (goes through normal template save flow)
```

### Claude Prompt for Parsing

```typescript
const CHECKLIST_PARSE_PROMPT = `
You are a checklist parsing assistant. Analyze the provided document and extract its structure into a standardized inspection template format.

Return ONLY valid JSON in this exact structure:
{
  "suggested_name": "string - descriptive name for this checklist",
  "sections": [
    {
      "name": "string - section/area name",
      "items": [
        {
          "label": "string - the check item text",
          "suggested_type": "pass_fail | yes_no | condition | severity | text | number | select | multi_select | photo",
          "suggested_photo_rule": "never | on_fail | always",
          "options": ["array", "of", "options"] // Only for select/multi_select types
        }
      ]
    }
  ],
  "parsing_notes": "string - any notes about assumptions made or items that were unclear"
}

Guidelines for choosing field types:
- Safety/hazard checks → "severity" or "pass_fail" with photo_rule "on_fail"
- General condition assessments → "condition" (good/fair/poor)
- Yes/no questions → "yes_no"
- Counts or measurements → "number"
- Notes or comments → "text"
- Choices from a list → "select" or "multi_select"
- Items requiring photographic evidence → "photo"

If the document structure is unclear:
- Make reasonable assumptions based on context
- Group related items into logical sections
- Note any ambiguities in parsing_notes

If the document cannot be parsed (not a checklist, unreadable, etc.):
{
  "error": "string - explanation of why parsing failed",
  "suggested_name": null,
  "sections": []
}
`;
```

### Edge Function Implementation

```typescript
// supabase/functions/parse-checklist/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

serve(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const base64Data = btoa(
      String.fromCharCode(...new Uint8Array(fileBuffer))
    );

    // Determine media type
    const mediaType = file.type.startsWith("image/") 
      ? file.type 
      : "application/pdf";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: mediaType.startsWith("image/") ? "image" : "document",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: CHECKLIST_PARSE_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract JSON from response
    const responseText = response.content[0].type === "text" 
      ? response.content[0].text 
      : "";
    
    // Parse and validate JSON
    const parsed = JSON.parse(responseText);
    
    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Parse error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to parse checklist" }),
      { status: 500 }
    );
  }
});
```

### Error Handling

| Scenario | User Message |
|----------|--------------|
| File too large (>10MB) | "File is too large. Please upload a file under 10MB." |
| Unsupported format | "Unsupported file type. Please upload a PDF, image, or Word document." |
| AI can't parse | "We couldn't automatically parse this document. Please create your template manually." |
| Partial parse | Show what was extracted with warning: "Some items couldn't be parsed. Please review and complete the template." |

---

## 8. Inspection Flow

### Starting an Inspection

```
1. User opens app
2. App shows assigned sites
3. User selects site
4. App shows available templates (assigned to this site, published)
5. User taps template
6. App creates new report record (status: draft)
7. App loads template structure
8. User begins inspection
```

### During Inspection

**Screen Layout (Tablet):**
```
┌────────────────────────────────────────────────────────────────┐
│  ← Daily Security Check          Site: Westfield Mall          │
│  Section 2 of 5                  Started: 9:15 AM              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─ Car Park ─────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  Floor condition                                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│  │  │   Good   │ │   Fair   │ │   Poor   │               │   │
│  │  └──────────┘ └──────────┘ └──────────┘               │   │
│  │                                           [📷 Add Photo] │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                         │   │
│  │  Lighting operational                                   │   │
│  │  ┌──────────┐ ┌──────────┐                             │   │
│  │  │   Yes    │ │    No    │                             │   │
│  │  └──────────┘ └──────────┘                             │   │
│  │                                                         │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                         │   │
│  │  Any hazards identified?                                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│  │  │   Low    │ │  Medium  │ │   High   │               │   │
│  │  └──────────┘ └──────────┘ └──────────┘               │   │
│  │                                           [📷 Add Photo] │   │
│  │  Notes: [_________________________________]             │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  Section Progress: ████████░░ 8/10 items                       │
│                                                                │
│  [← Previous Section]                    [Next Section →]      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Photo Capture

```
1. User taps [📷 Add Photo]
2. Camera opens
3. User takes photo
4. Preview shown with options: [Retake] [Use Photo]
5. Photo saved locally (not uploaded until submit)
6. Thumbnail shown next to item
7. User can add multiple photos per item
8. User can delete photos before submit
```

### Completing Inspection

```
1. User reaches last section
2. Taps [Review & Submit]
3. Review screen shows:
   - Summary of all responses
   - Count of issues flagged
   - Count of photos attached
   - Any required items not completed (validation)
4. If validation fails: highlight missing items, prevent submit
5. If validation passes: [Submit Inspection] button enabled
6. User taps Submit
7. Report status changes to "submitted"
8. submitted_at timestamp recorded
9. Photos uploaded to Supabase Storage
10. Confirmation screen shown
11. User cannot edit after submission
```

### Offline Handling (MVP - Basic)

For MVP, require internet connection:
- Show warning if offline when starting inspection
- Allow completion of in-progress inspection offline
- Queue submission until back online
- Photos stored locally until upload succeeds

---

## 9. Reports & Storage

### Report States

| Status | Description |
|--------|-------------|
| `draft` | In progress, can be edited |
| `submitted` | Completed, locked, timestamped |

### Report List View (Admin)

```
Reports
─────────────────────────────────────────────────────────────
Filter: [All Sites ▼] [Last 7 days ▼] [All Users ▼]

┌──────────────────────────────────────────────────────────────┐
│  Daily Security Check                                         │
│  Westfield Mall · John Smith · Today 9:32 AM                 │
│  ✓ Completed · 2 issues flagged · 3 photos                   │
├──────────────────────────────────────────────────────────────┤
│  Daily Security Check                                         │
│  Riverside Centre · Sarah Jones · Today 8:15 AM              │
│  ✓ Completed · No issues                                     │
├──────────────────────────────────────────────────────────────┤
│  Weekly Fire Safety                                           │
│  Westfield Mall · John Smith · Yesterday 2:45 PM             │
│  ✓ Completed · 1 issue flagged · 1 photo                     │
└──────────────────────────────────────────────────────────────┘
```

### Report Detail View

```
┌──────────────────────────────────────────────────────────────┐
│  ← Reports          Daily Security Check        [Export PDF] │
├──────────────────────────────────────────────────────────────┤
│  Site: Westfield Mall                                        │
│  Completed by: John Smith                                    │
│  Date: 9 January 2025, 9:32 AM                              │
│  Duration: 23 minutes                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ▼ Car Park                                                  │
│    Floor condition: Fair                                     │
│    Lighting operational: Yes                                 │
│    Hazards identified: Medium ⚠️                             │
│      Notes: "Wet patch near entrance bay 3"                  │
│      📷 2 photos attached                                    │
│                                                              │
│  ▼ Main Entrance                                             │
│    Doors operational: Pass                                   │
│    Floor condition: Good                                     │
│    Signage visible: Yes                                      │
│                                                              │
│  ▼ Service Yard                                              │
│    ...                                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### PDF Export

Generate PDF containing:
- Header with organisation logo (if set), site name, date
- Inspector name and completion time
- All sections and responses
- Embedded photos (thumbnails with ability to click for full size)
- Timestamp and unique report ID for verification
- Footer with page numbers

### Photo Storage Structure

```
Supabase Storage Bucket: report-photos

Path structure:
/{organisation_id}/{report_id}/{response_id}/{filename}.jpg

Example:
/abc123/report456/resp789/photo_001.jpg
```

Storage policies:
- Only authenticated users in the organisation can read
- Only the report creator can write (during submission)
- No public access

### Data Retention

- Reports stored indefinitely (configurable per organisation in future)
- Photos compressed on upload (max 2000px longest edge)
- Original timestamps preserved in EXIF data

---

## 10. Screen Specifications

### Mobile App Screens

#### Authentication
| Screen | Purpose |
|--------|---------|
| Login | Email/password login |
| Forgot Password | Password reset flow |

#### Main Navigation (Tab Bar)
| Tab | Icon | Destination |
|-----|------|-------------|
| Home | 🏠 | Dashboard / Today's inspections |
| Reports | 📋 | Report list (filtered by permission) |
| Settings | ⚙️ | User settings, logout |

#### Admin-Only Navigation (visible to admin/owner)
| Tab | Icon | Destination |
|-----|------|-------------|
| Templates | 📝 | Template list and builder |
| Sites | 📍 | Site management |
| Team | 👥 | User management |

#### Screen List

**Auth:**
- `LoginScreen`
- `ForgotPasswordScreen`

**Home:**
- `DashboardScreen` - Today's pending inspections, quick stats
- `SiteListScreen` - List of user's assigned sites
- `TemplateSelectScreen` - Templates available at selected site

**Inspection:**
- `InspectionScreen` - Main inspection form
- `PhotoCaptureScreen` - Camera for taking photos
- `InspectionReviewScreen` - Review before submit
- `InspectionCompleteScreen` - Confirmation after submit

**Reports:**
- `ReportListScreen` - Filterable list of reports
- `ReportDetailScreen` - Single report view
- `PhotoViewerScreen` - Full-screen photo viewer

**Templates (Admin):**
- `TemplateListScreen` - All templates
- `TemplateEditorScreen` - Create/edit template
- `TemplateImportScreen` - AI import flow
- `TemplateAssignScreen` - Assign to sites

**Sites (Admin):**
- `SiteListScreen` - All sites
- `SiteEditorScreen` - Create/edit site
- `SiteAssignUsersScreen` - Assign users to site

**Team (Admin):**
- `TeamListScreen` - All users in organisation
- `InviteUserScreen` - Invite new user
- `UserDetailScreen` - View/edit user, change role

**Settings:**
- `SettingsScreen` - Main settings menu
- `ProfileScreen` - Edit own profile
- `ChangePasswordScreen` - Change password
- `AboutScreen` - App version, links

---

## 11. API Endpoints

### Supabase Auto-Generated

Supabase provides REST and GraphQL APIs automatically. Use the Supabase JS client:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Example: Fetch user's sites
const { data: sites } = await supabase
  .from('sites')
  .select('*')
  .order('name');
```

### Custom Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `/parse-checklist` | POST | AI checklist import |
| `/generate-report-pdf` | POST | Generate PDF export |
| `/invite-user` | POST | Send invitation email |

### Key Queries

**Get user's assigned sites:**
```typescript
const { data } = await supabase
  .from('sites')
  .select(`
    *,
    site_template_assignments (
      template:templates (*)
    )
  `)
  .in('id', userSiteIds);
```

**Get template with full structure:**
```typescript
const { data } = await supabase
  .from('templates')
  .select(`
    *,
    template_sections (
      *,
      template_items (*)
    )
  `)
  .eq('id', templateId)
  .order('sort_order', { foreignTable: 'template_sections' })
  .order('sort_order', { foreignTable: 'template_sections.template_items' })
  .single();
```

**Submit report with responses:**
```typescript
// Start transaction
const { data: report } = await supabase
  .from('reports')
  .update({ 
    status: 'submitted', 
    submitted_at: new Date().toISOString() 
  })
  .eq('id', reportId)
  .select()
  .single();

// Upload photos
for (const photo of photos) {
  await supabase.storage
    .from('report-photos')
    .upload(photo.path, photo.file);
}
```

---

## 12. Project Structure

### React Native App

```
/app
├── /src
│   ├── /components
│   │   ├── /ui              # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── ...
│   │   ├── /templates       # Template-related components
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── SectionEditor.tsx
│   │   │   ├── ItemEditor.tsx
│   │   │   └── FieldTypeSelector.tsx
│   │   ├── /inspection      # Inspection-related components
│   │   │   ├── InspectionItem.tsx
│   │   │   ├── ResponseInput.tsx
│   │   │   ├── PhotoCapture.tsx
│   │   │   └── SectionProgress.tsx
│   │   └── /reports         # Report-related components
│   │       ├── ReportCard.tsx
│   │       ├── ReportSection.tsx
│   │       └── PhotoThumbnail.tsx
│   │
│   ├── /screens
│   │   ├── /auth
│   │   │   ├── LoginScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── /home
│   │   │   ├── DashboardScreen.tsx
│   │   │   └── SiteSelectScreen.tsx
│   │   ├── /inspection
│   │   │   ├── InspectionScreen.tsx
│   │   │   ├── ReviewScreen.tsx
│   │   │   └── CompleteScreen.tsx
│   │   ├── /reports
│   │   │   ├── ReportListScreen.tsx
│   │   │   └── ReportDetailScreen.tsx
│   │   ├── /templates
│   │   │   ├── TemplateListScreen.tsx
│   │   │   ├── TemplateEditorScreen.tsx
│   │   │   └── TemplateImportScreen.tsx
│   │   ├── /sites
│   │   │   ├── SiteListScreen.tsx
│   │   │   └── SiteEditorScreen.tsx
│   │   ├── /team
│   │   │   ├── TeamListScreen.tsx
│   │   │   └── InviteScreen.tsx
│   │   └── /settings
│   │       ├── SettingsScreen.tsx
│   │       └── ProfileScreen.tsx
│   │
│   ├── /navigation
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   └── linking.ts
│   │
│   ├── /hooks
│   │   ├── useAuth.ts
│   │   ├── useOrganisation.ts
│   │   ├── useSites.ts
│   │   ├── useTemplates.ts
│   │   ├── useReports.ts
│   │   └── useInspection.ts
│   │
│   ├── /services
│   │   ├── supabase.ts      # Supabase client setup
│   │   ├── auth.ts          # Auth functions
│   │   ├── templates.ts     # Template CRUD
│   │   ├── inspections.ts   # Inspection logic
│   │   ├── reports.ts       # Report queries
│   │   └── ai.ts            # AI import functions
│   │
│   ├── /store               # State management (Zustand or similar)
│   │   ├── authStore.ts
│   │   ├── inspectionStore.ts
│   │   └── index.ts
│   │
│   ├── /types
│   │   ├── database.ts      # Generated from Supabase
│   │   ├── templates.ts
│   │   ├── inspections.ts
│   │   └── index.ts
│   │
│   ├── /utils
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── photos.ts
│   │
│   └── /constants
│       ├── fieldTypes.ts
│       ├── theme.ts
│       └── config.ts
│
├── /assets
│   ├── /images
│   └── /fonts
│
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

### Supabase Backend

```
/supabase
├── /functions
│   ├── /parse-checklist
│   │   └── index.ts
│   ├── /generate-report-pdf
│   │   └── index.ts
│   └── /invite-user
│       └── index.ts
│
├── /migrations
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_indexes.sql
│
├── /seed
│   └── seed.sql            # Demo data for testing
│
└── config.toml
```

---

## 13. MVP Feature Checklist

### Must Have (MVP) ✅

- [ ] User authentication (login, logout, password reset)
- [ ] Organisation and user management (admin invites users)
- [ ] Site creation and management
- [ ] Manual template builder
  - [ ] Add/edit/delete sections
  - [ ] Add/edit/delete items
  - [ ] All field types supported
  - [ ] Photo rules configurable
  - [ ] Reorder sections and items
- [ ] AI checklist import (upload → parse → review → save)
- [ ] Template assignment to sites
- [ ] User assignment to sites
- [ ] Inspection completion flow
  - [ ] Navigate through sections
  - [ ] Input all response types
  - [ ] Capture photos
  - [ ] Flag severity
  - [ ] Add notes
  - [ ] Review and submit
- [ ] Report storage and retrieval
- [ ] Report list with filters
- [ ] Report detail view
- [ ] PDF export
- [ ] Basic offline support (complete in-progress inspection)

### Should Have (v1.1) 🔜

- [ ] Pre-built starter templates
- [ ] Issue library (common issues to select from)
- [ ] Email alerts for high-severity issues
- [ ] Dashboard with statistics
- [ ] Report search (full text)
- [ ] Bulk export reports
- [ ] Organisation settings (logo, etc.)

### Could Have (v1.2) 📋

- [ ] Full offline mode with sync
- [ ] QR checkpoint scanning
- [ ] Recurring issue tracking
- [ ] Handover notes between shifts
- [ ] Push notifications
- [ ] Multi-language support

### Won't Have (Future Phases) 🚫

- [ ] Annual inspection module (separate product area)
- [ ] Integration with property management systems
- [ ] API access for customers
- [ ] White-labelling
- [ ] Self-serve sign-up and billing

---

## 14. Future Phases

### Phase 2: Enhanced Reporting

- Recurring issue detection (flag if same hazard reported 3+ times)
- Trend analysis dashboard
- Scheduled report emails to stakeholders
- Custom report templates

### Phase 3: Advanced Features

- QR codes at checkpoints (prove physical presence)
- GPS location stamping
- Weather conditions logging
- Integration with external systems (API)

### Phase 4: Annual Inspections Module

- Landlord-tenant inspections
- Fire safety compliance
- Equipment servicing records
- Certificate tracking and expiry alerts

### Phase 5: Self-Serve & Scale

- Self-serve sign-up
- Stripe billing integration
- Usage-based pricing
- White-label options for enterprise

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Record Type | A category/template for records (e.g., "Vehicles", "Properties") with custom fields |
| Record Type Field | A custom field definition within a record type (e.g., "Registration Number") |
| Record | An instance of a record type (formerly "Site") - the thing being inspected |
| Template | A reusable inspection form structure |
| Section | A grouping within a template (e.g., "Car Park") |
| Item | A single check within a section |
| Report | A completed inspection instance |
| Response | The answer to a single item in a report |
| Library | Pre-built record types and templates available to copy into an organisation |
| Field Type | One of 53 supported input types (text, number, date, select, etc.) |

---

## Appendix B: Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

---

## Appendix C: Environment Variables

```bash
# App
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx

# Supabase Edge Functions
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

*End of Specification*
