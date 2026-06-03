# Handoff Index — files to take to Claude Design

This is the pack you carry over to a fresh tool (Claude Design, a new
codebase, a redesign session). The first three are mandatory; everything
else is reference. Order is "smallest → richest"; reading top-to-bottom
gives you increasingly detailed context.

---

## 1 · Mandatory — the design language

### `DESIGN_SYSTEM.md` ⭐
Self-contained cheat sheet. Tokens, type scale, status colours, 14
component recipes (button, status pill, segmented tabs, table chrome,
MetricCard, TrendChip, ChartRow, custom dropdown, info tooltip, empty
state, sidebar wallet, red error banner, green success banner), the 8
core conventions, motion variants, icon stroke widths, layout grids,
voice & copy rules, stack.

**If you only take one file, take this one.**

### `tailwind.config.ts`
Canonical token definitions — every `text-text-primary`, `bg-accent`,
`border-border-subtle`, `rounded-card`, etc. is declared here. Pair
with `DESIGN_SYSTEM.md` to get hex ↔ token mapping.

### `PROTOTYPE_OVERVIEW.md`
What this prototype solves, the four product surfaces (Lead generation,
CRM, Tools, Workspace), routing layout, key shared components, design
decisions, constraints. Gives you the *why* behind the rules in
`DESIGN_SYSTEM.md`.

---

## 2 · Reference components

These are the components that demonstrate the recipes. Read them only
if you need to *implement* something — `DESIGN_SYSTEM.md` will be enough
for most design conversations.

### Shared / cross-cutting
- `src/components/dashboard/metric-card.tsx` — the canonical KPI tile
  (uppercase eyebrow + trend chip + 22 px headline + delta + sub-metric
  + "was X" footer). Used wherever a numeric KPI appears.
- `src/components/dashboard/date-range-selector.tsx` — preset picker
  (Today / 7d / 30d / 90d / custom) shared across listings.
- `src/components/layout/sidebar.tsx` — sidebar nav + the compact
  wallet widget (with red/amber/neutral usage tones).
- `src/components/shared/phone-input.tsx` — the country-code dropdown
  pattern (+91 default).

### Outreach surface (most evolved)
- `src/app/(app)/outreach/page.tsx` — listing with status tabs,
  segmented filter, 4-up KPI strip, narrated Spot Insights, table.
- `src/app/(app)/outreach/[id]/page.tsx` — detail with the same KPI
  chrome locked across Talktime / Spend / Funnel / Dial-attempts,
  contacts table with status tabs + filter popover, lead drill-down
  drawer.
- `src/app/(app)/outreach/create/page.tsx` — two-step wizard with the
  success interstitial between steps, custom AgentPicker /
  ProjectPicker, per-file upload progress + per-file schedule, error
  banner.

### Project surface
- `src/app/(app)/projects/[id]/page.tsx` — tabbed detail (Dashboard,
  Personas, Campaigns, Outreach, Library, Settings).
- `src/components/project/outreach-section.tsx` — the Outreach tab
  body: header CTA + 3-up KPI strip + table of project-scoped
  outreaches + empty state.

### Spot
- `src/components/spot/spot-mark.tsx` — the brand mark, used wherever
  Spot speaks.

---

## 3 · Data shape (for filling realistic mocks)

- `src/lib/outreach-data.ts` — `OutreachListItem`, `OutreachContact`,
  `voiceAgents`, 90-day daily aggregates.
- `src/lib/project-data.ts` — `ProjectSummary`, `ProjectDetail`,
  `ProjectGoal`, `Creative`, `MediaPlan`, plus the seed projects
  themselves.
- `src/lib/demo-mode.ts` + `src/lib/workspace-context.tsx` — how the
  Preview-empty-states toggle works.

---

## 4 · Optional context

- `src/app/(app)/campaigns/[id]/page.tsx` — the legacy / sibling surface
  to Outreach. Useful if a designer wants to see the *other* dial of
  the same product (paid media vs voice agents) sharing chrome.
- `src/app/(app)/enquiries/page.tsx` — the workspace-wide leads view,
  which is the CRM the outreach + campaigns funnel into.

---

## 5 · How to use this pack with Claude Design

1. **Start by uploading `DESIGN_SYSTEM.md`.** It tells the model
   exactly which tokens, sizes and recipes to use.
2. **Then upload `PROTOTYPE_OVERVIEW.md`** so the model knows what kind
   of product surface it's designing for.
3. **Drop in `tailwind.config.ts`** so the model can ground tokens to
   real hex values and class names.
4. **Reference component files on demand** — if a design conversation
   needs a specific pattern (e.g. "how does the per-file upload row
   work?"), paste that file in. Don't dump the whole component tree
   up front; it's noise.
5. **Treat data files as last-resort context** — they're useful for
   realistic copy/numbers but not for visual decisions.

The prototype is intentionally quiet and consistent. The most useful
thing this pack does is keep a designer from inventing colours, weights,
or chrome that don't exist in the system.
