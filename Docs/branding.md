# Donedex Branding

> **Status:** Official brand identity

## Brand Overview

**Product Name:** Donedex
**Tagline:** TBD
**Brand Voice:** Professional, reliable, straightforward

## Brand Personality

**Trusted Tool** — Reliable, no-nonsense, gets the job done. Like a good clipboard, but digital.

Combined with **Modern, Simple UX/UI** — Clean, uncluttered, intuitive for all skill levels.

**Target Users:**
- 50% non-tech savvy (older property managers, security staff)
- 50% younger, more tech comfortable

**Design Principles:**
- Big touch targets, clear labels (for non-tech users)
- Clean visual hierarchy, minimal clicks (for everyone)
- No jargon, no clever icons without text labels
- Looks like a "proper app" — professional, not experimental
- Works outdoors in bright light
- Feels fast and responsive

---

## Logo

**Logo Files:**
- `assets/Donedex_Icon.png` — Icon only (app icon, favicon)
- `assets/Donedex_Logo.png` — Icon + wordmark (splash screen, headers)

**Usage Guidelines:**
- Use icon-only version for app icons, favicons, and small spaces
- Use full logo for splash screens, marketing, and headers
- Maintain clear space around logo equal to icon height
- Do not distort, rotate, or add effects to the logo

---

## Colours

### Primary Palette (Deep Teal)

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#0F4C5C` | Logo, primary buttons, main actions, links, focus states |
| Primary Dark | `#1F6F8B` | Hover states, secondary actions, highlights |
| Primary Light | `#E6F2F5` | Backgrounds, highlights, selected states |

### Semantic Colours

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#059669` | Pass, Good, Complete |
| Warning | `#D97706` | Medium severity, Fair, Attention |
| Danger | `#DC2626` | Fail, Poor, High severity |

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Black | `#000000` | Pure black (use sparingly) |
| Dark Charcoal | `#1A1A1A` | Primary text |
| Mid Grey | `#6B7280` | Secondary text, placeholders |
| Light Grey | `#E5E7EB` | Borders, dividers |
| Off White | `#F9FAFB` | Page backgrounds |
| White | `#FFFFFF` | Cards, inputs |

### Colour Usage Rules

- Primary teal anchors the brand — use for all interactive elements
- Semantic colours do heavy lifting for inspection states (pass/fail/etc)
- Keep backgrounds light (Off White or White) for outdoor readability
- Ensure 4.5:1 contrast ratio minimum (WCAG AA)

---

## Typography

### Font Family

**Primary:** Inter
- Available via @expo-google-fonts/inter
- Clean, modern, highly legible
- Excellent for both headings and body text

**Weights Used:**
- Regular (400) — body text
- Medium (500) — UI labels, buttons
- SemiBold (600) — headings, titles

**Fallbacks:** System fonts (San Francisco iOS, Roboto Android)

### Scale

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| Page Title | 28px | SemiBold | Screen headers |
| Section Title | 20px | SemiBold | Card headers, sections |
| Body Large | 18px | Regular | Important form labels |
| Body | 16px | Regular | Default text |
| Caption | 14px | Regular | Secondary info, timestamps |

### Typography Rules

- Never go below 14px for any readable text
- Headings use +1-3% letter spacing for improved readability
- Body text uses default tracking
- Use sentence case for all UI text
- Left-align all text (no centred paragraphs)

---

## Spacing

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing, inline elements |
| sm | 8px | Related elements |
| md | 16px | Standard spacing |
| lg | 24px | Section spacing |
| xl | 32px | Major sections |
| 2xl | 48px | Screen padding (tablet) |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 4px | Small elements, chips, tags |
| md | 8px | Buttons, cards, inputs |
| lg | 12px | Modals, large cards |
| full | 9999px | Pills, avatars, circular buttons |

**Default:** Use `md` (8px) for most components — modern but not too soft.

---

## Shadows

```css
/* Card shadow - subtle lift */
shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);

/* Elevated shadow - dropdowns, popovers */
shadow-elevated: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);

/* Modal shadow */
shadow-modal: 0 10px 25px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.1);
```

Use shadows sparingly — just enough to create hierarchy.

---

## Iconography

**Icon Set:** Lucide Icons (https://lucide.dev)
- Consistent stroke width (2px)
- Default size: 24px
- Outlined style

**Icon Rules:**
- Always pair icons with text labels for key actions
- Icons alone only for universally understood actions (close, back, menu)
- Use semantic colours for status icons (check = green, x = red)

---

## Components

### Buttons

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| Primary | `#0F4C5C` | White | None | Main actions |
| Secondary | White | `#0F4C5C` | 1px `#0F4C5C` | Secondary actions |
| Ghost | Transparent | `#6B7280` | None | Tertiary actions |
| Danger | `#DC2626` | White | None | Destructive actions |

**Button Specs:**
- Minimum height: **48px**
- Minimum touch target: **48×48px**
- Padding: 12px 24px
- Border radius: 8px (md)
- Full-width on mobile where appropriate
- Always use sentence case ("Save template" not "Save Template")

### Inputs

- Height: **48px**
- Background: White
- Border: 1px `#E5E7EB` (Light Grey)
- Border radius: 8px
- Focus state: 2px `#0F4C5C` ring
- Error state: 1px `#DC2626` border + error text below
- Placeholder text: `#6B7280` (Mid Grey)

**Input Rules:**
- Labels always above inputs, never inside as placeholders
- Required fields marked with asterisk
- Error messages appear immediately below input in red

### Cards

- Background: White
- Border: 1px `#E5E7EB`
- Border radius: 12px (lg)
- Shadow: shadow-card
- Padding: 16px (mobile), 24px (tablet)

### Form Sections

When grouping form fields:
- Section header: 20px semibold, margin-bottom 16px
- Field spacing: 16px between fields
- Section spacing: 32px between sections

---

## Status Indicators

For inspection responses and report states:

| Status | Colour | Hex | Icon |
|--------|--------|-----|------|
| Pass / Good / Complete | Success | `#059669` | Check circle |
| Fair / Medium | Warning | `#D97706` | Alert triangle |
| Fail / Poor / High | Danger | `#DC2626` | X circle |
| Pending / Not started | Neutral | `#6B7280` | Circle outline |
| In Progress | Primary | `#0F4C5C` | Clock or half circle |

**Display Rules:**
- Always combine colour with icon (don't rely on colour alone)
- Use filled icons for definitive states (pass/fail)
- Use outlined icons for pending/neutral states

---

## Responsive Breakpoints

| Name | Min Width | Target Device |
|------|-----------|---------------|
| mobile | 0px | Phones |
| tablet | 768px | iPad Mini and up |
| desktop | 1024px | iPad Pro landscape, web |

**Tablet-First Approach:**
- Design for tablet (768px+) first
- Ensure layouts work on mobile (320px minimum)
- Tablet gets side-by-side layouts, mobile stacks vertically

---

## Accessibility Requirements

- Minimum contrast ratio: 4.5:1 (WCAG AA)
- Touch targets: minimum 44×44px, prefer 48×48px
- Focus states visible on all interactive elements
- Don't rely on colour alone to convey meaning
- Support dynamic type sizes where possible
- Test in bright outdoor lighting conditions

---

## Notes for Implementation

- All colours available as theme constants in `src/constants/theme.ts`
- Use semantic colour names in code (e.g., `colors.primary.DEFAULT` not hardcoded hex)
- Spacing should use the token scale, not arbitrary values
- Install Inter font: `npx expo install @expo-google-fonts/inter expo-font`
- Test on real devices — not just simulators
- Test with older users if possible before customer demo
