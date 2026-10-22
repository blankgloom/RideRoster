---
name: Executive Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#444651'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#4f625c'
  on-secondary: '#ffffff'
  secondary-container: '#d2e7de'
  on-secondary-container: '#556861'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d2e7de'
  secondary-fixed-dim: '#b7cbc3'
  on-secondary-fixed: '#0d1f1a'
  on-secondary-fixed-variant: '#384b44'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  display-mobile:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.025em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system targets modern enterprise workflows, mission-critical data environments, and high-density productivity platforms. The visual personality balances institutional authority with modern software agility: disciplined, uncluttered, effortlessly legible, and reassuringly precise. 

The aesthetic is anchored in contemporary modern corporate minimalism:
- **Tone:** Methodical, sharp, authoritative, and quiet. It avoids unnecessary decoration, relying instead on structural alignment, precise typographic rhythm, and deliberate contrast.
- **Visual Stance:** Crisp white cards resting on a cool slate background, framed by hairline borders and ambient, tinted shadows.
- **Interaction Ethos:** Direct and instantaneous. Transitions are short (150–200ms) and purposeful, reinforcing stability and high system responsiveness.

## Colors

The palette establishes an immediate sense of governance and calm clarity through disciplined tonal grouping.

### Core Roles
- **Primary (`#1E3A8A`):** Deep royal blue. Used for primary calls-to-action, key selected states, active navigation indicators, and prominent metric emphasis.
- **Secondary (`#DFF4EB`):** Pale sage/soft mint. Employed as a supportive accent for low-friction surface fills, positive state highlights, subtle badge backgrounds, and secondary focus areas.
- **Neutral / Text (`#1E293B`):** Dark slate navy. Primary text color delivering deep contrast without the harshness of pure black (`#000000`).

### Workspace & Structure
- **Canvas / App Canvas:** `#F1F5F9` (Slate-100) provides an eye-resting, cool architectural foundation.
- **Surfaces & Cards:** `#FFFFFF` (Pure white) brings crisp figure-ground separation over the slate canvas.
- **Borders & Dividers:** `#E2E8F0` (Slate-200) serves as hairline structure across containers, inputs, and tabular layouts.
- **Muted Text / Secondary Labels:** `#64748B` (Slate-500) provides balanced hierarchy for secondary data points and helper strings.

### Feedback & Status
- **Success:** `#10B981` (Emerald) paired with `#ECFDF5` surface tints.
- **Warning:** `#F59E0B` (Amber) paired with `#FFFBEB` surface tints.
- **Error / Danger:** `#EF4444` (Red) paired with `#FEF2F2` surface tints.

## Typography

The typography uses Inter across all roles to maintain functional clarity and dense information processing. 

### Typographic Rules
- **Proportional Tracking:** Display and headline levels feature tight negative tracking (`-0.025em` to `-0.01em`) to create dense, commanding titles. Smaller labels and badges feature open tracking (`+0.01em` to `+0.03em`) to preserve legibility at micro scales.
- **Tabular Figures:** For enterprise analytics, tables, and financial metrics, enforce `font-feature-settings: "tnum" 1` to guarantee vertical column alignment.
- **Line Length:** Optimal reading width for documentation and body panels is constrained to 60–75 characters (max `65ch`).

## Layout & Spacing

The layout model is governed by an 8pt base grid with a 4pt sub-grid for micro-alignments, buttons, and input geometry.

### Grid Architecture
- **Desktop (1200px+):** 12-column fluid grid, `2rem` (32px) margins, `1.5rem` (24px) gutters. Maximum content canvas spans 1440px with horizontal auto-centering.
- **Tablet (768px – 1199px):** 8-column grid, `1.5rem` (24px) margins, `1rem` (16px) gutters.
- **Mobile (< 768px):** 4-column grid, `1rem` (16px) margins, `1rem` (16px) gutters.

### Layout Principles
- **Density Controls:** High-density workspaces (data tables, filter bars) adopt condensed padding (`space-xs` and `space-sm`) to surface high-priority information above the fold.
- **Vertical Rhythm:** Structural page sections maintain an orderly step progression: `space-lg` (24px) for card interiors and `space-xl` to `space-2xl` between major dashboard segments.

## Elevation & Depth

Visual hierarchy uses a refined hybrid approach: low-contrast borders (`#E2E8F0`) provide physical definition, while soft, ambient-tinted shadows lift cards and interactive modals off the `#F1F5F9` canvas.

### Shadow Scale
- **Flat / Base:** No shadow. Elements rely solely on a 1px border of `#E2E8F0`. Used for nested lists, table structures, and inset form containers.
- **Level 1 (Cards & Data Tiles):** 
  `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`, bounded by a 1px solid `#E2E8F0` border.
- **Level 2 (Hover States, Popovers & Dropdowns):** 
  `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`, bounded by a 1px solid `#E2E8F0` border.
- **Level 3 (Modals, Overlays & Drawers):** 
  `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`, flanked by a deep slate backdrop scrim (`#0F172A` at 40% opacity).

## Shapes

The geometric signature balances enterprise order with accessible softness using a Level 2 (`0.5rem` / 8px default) baseline.

- **Base Components (`rounded`, 0.5rem / 8px):** Buttons, inputs, search bars, selects, and alert containers.
- **Standard Surfaces (`rounded-lg`, 1rem / 16px):** Primary content cards, data table wrappers, and sidebar panels.
- **Major Containers (`rounded-xl`, 1.5rem / 24px):** Central application dashboards, key metrics overviews, modals, and spotlight modules.
- **Pills (`rounded-full`):** Exclusively reserved for status indicators, numeric counters, and analytical filter chips.

## Components

### Buttons
- **Primary:** Background `#1E3A8A`, text `#FFFFFF`, rounded 8px (`rounded-md` / `rounded`), padding `0.5rem 1rem` (`space-sm` / `space-md`). Hover state `#172554`. Focus ring: 2px offset with `#1E3A8A` ring.
- **Secondary:** Background `#DFF4EB`, text `#1E3A8A`, border none. Hover state shifts to `#CBEADF`.
- **Outline:** Background `#FFFFFF`, text `#1E293B`, border 1px solid `#E2E8F0`. Hover state `#F8FAFC`.
- **Danger:** Background `#EF4444`, text `#FFFFFF`. Hover state `#DC2626`.

### Cards & Surfaces
- Structured with `#FFFFFF` background, `rounded-lg` (16px) or `rounded-xl` (24px) corners, and a 1px solid border in `#E2E8F0`.
- Padding defaults to `1.5rem` (`space-lg`). Header bars within cards are separated with a bottom hairline border (`#E2E8F0`) and `1rem` vertical padding.

### Input Fields & Controls
- **Inputs & Selects:** Height 40px, background `#FFFFFF`, border 1px solid `#CBD5E1` (Slate-300), rounded 8px. Text is `#1E293B` (`body-sm`). Placeholder text uses `#94A3B8`. Active/Focus state uses `#1E3A8A` border with a 3px ambient focus ring (`rgba(30, 58, 138, 0.15)`).
- **Checkboxes & Radios:** Size 16px × 16px. Border `#CBD5E1`. When checked, background fills with `#1E3A8A` and an inset white checkmark or dot.
- **Switches:** 36px width, 20px height, fully rounded pill. Inactive background `#CBD5E1`; active state `#1E3A8A` with a smooth 16px white circle sliding right.

### Chips & Badges
- **Status Chips:** Height 24px, pill-shaped (`rounded-full`), horizontal padding `0.625rem`.
  - *Success:* `#ECFDF5` background, `#065F46` text, Emerald 6px indicator dot.
  - *Warning:* `#FFFBEB` background, `#92400E` text, Amber 6px indicator dot.
  - *Error:* `#FEF2F2` background, `#991B1B` text, Red 6px indicator dot.
  - *Neutral/Info:* `#F1F5F9` background, `#1E293B` text.
- **Filter Chips:** `#FFFFFF` background, border 1px solid `#E2E8F0`, rounded 8px, typography `label-sm`. Active state applies `#DFF4EB` background and `#1E3A8A` text.

### Data Tables
- Header row features `#F8FAFC` background, 1px solid `#E2E8F0` bottom border, with column titles set in `label-md` and `#64748B`.
- Row height: 48px regular, 40px compact. Background `#FFFFFF` alternating with subtle hover highlight `#F8FAFC`.
- Cells are padded with `0.75rem 1rem` and separated by hairline horizontal dividers.