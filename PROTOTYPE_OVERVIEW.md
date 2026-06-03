# Revspot — Prototype Overview

Self-contained reference for this Next.js prototype: what it is, what it does, how it's wired, and the conventions to follow when adding to it.

## What this prototype solves

Revspot is an AI-powered performance-marketing workspace aimed at Indian real-estate developers. The prototype demonstrates a full lead lifecycle in one product:

1. **Campaign creation** — wizard that takes a campaign brief, infers personas, generates creatives, attaches forms, and lays out an ad-account structure.
2. **Outreach** — voice-agent calling campaigns that turn raw CSV lead lists into qualified-lead pipelines. The agent dials, qualifies on the call, drops to CRM.
3. **Leads** — unified CRM view of every contact and the calls/conversations behind them.
4. **Spot** — workspace AI assistant that observes activity and surfaces insights (cost per qualified lead, best call slots, top-performing campaigns, etc.).

The prototype is a mock — no real backend. Data lives in TypeScript modules under `src/lib/` and is shaped to look realistic for the demo workspace **Godrej South** (Bangalore + Hyderabad). All copy and chrome are tuned for a real estate audience.

## Core features

### Lead Generation
- **Projects** — top-level real-estate properties (Godrej Reflections, Lodha Bellissimo, etc.). Each project rolls up its campaigns and outreach activity.
- **Campaigns** — Meta/Google ad campaigns with a full Analysis tab (5 MetricCards + Funnel/Health strip + Metric Explorer chart), Diagnosis, Insights, Leads, Setup, Settings.
- **Outreach** — voice-agent dialer campaigns. Detail page has 4 KPI widgets (Talktime, Spend, Performance Funnel, Leads by Dial Attempt), a Total Leads progress bar, a contacts table with tabs (All / Qualified / Disqualified / Follow-up / RnR / Yet to dial) and an 8-field filter popover, plus a Lead Drill-Down drawer with Overview / Profile / Logs tabs (Logs has chat-bubble transcripts with collapse + scroll).

### CRM
- **Leads** — workspace-wide enquiries view with a MetricCard strip, source/status filters, search, and a Lead Detail panel.

### Tools
- **Creatives** — generated ad creatives library.
- **Agents** (legacy) and **Agents MVP** — AI agent configuration (objective-based + manual). The Outreach agent-picker links to `/agents-mvp?create=1`.
- **Audiences** (coming soon).
- **Integrations** — third-party connections including WhatsApp (multi-provider: Gupshup / Qikberry / Other).

### Workspace
- **Brand** — workspace brand kit.
- **Settings** — workspace + member management.

### Cross-cutting
- **Empty states** — every screen has a Spot-led empty hero so the product never reads as broken.
- **Spot Insights** — narrated AI brief on each high-level listing (4 observations as a list, no decorative chrome).
- **DateRangeSelector** — shared compact preset picker (Today / 7d / 30d / 90d / custom).
- **Status pills** — consistent green / amber / blue / grey tinted-badge language across campaigns + outreach + agents.
- **MetricCard** — shared dashboard tile (`src/components/dashboard/metric-card.tsx`): uppercase eyebrow + trend chip + 22 px headline number + delta chip + sub-metric badge + "was X" footer. Used wherever a numeric KPI appears.
- **Custom dropdowns** — every `<select>` in user-facing flows is replaced with a custom popover (chevron + scrollable panel + check on selected) so the native browser menu never appears.

## Architecture

### Routing
- Next.js 14+ **App Router** under `src/app/`.
- All authenticated screens live under the `(app)` route group with a shared sidebar.
- Public auth screens live under `(auth)`.

### File layout
```
src/
├── app/
│   ├── (app)/              # authenticated screens, share AppShell
│   │   ├── dashboard/      # main dashboard
│   │   ├── spot/           # Spot assistant
│   │   ├── projects/
│   │   ├── campaigns/
│   │   ├── outreach/       # this prototype's primary focus
│   │   │   ├── page.tsx          # listing
│   │   │   ├── [id]/page.tsx     # detail
│   │   │   └── create/page.tsx   # 3-step wizard
│   │   ├── leads/  enquiries/
│   │   ├── creatives/  agents/  agents-mvp/
│   │   ├── audiences/  integrations/  channels/
│   │   ├── brand/  settings/  workflows/
│   │   └── admin/
│   └── (auth)/             # public — login, etc.
├── components/
│   ├── layout/             # sidebar, app shell, empty-state
│   ├── dashboard/          # MetricCard, DateRangeSelector, MetricChart
│   ├── outreach/           # EditOutreachDrawer + outreach-specific bits
│   ├── campaigns/          # Analysis / Diagnosis / Insights tabs
│   ├── wizard/             # campaign create steps + agents-mvp steps
│   ├── leads/              # lead panel, lead row, filters
│   ├── shared/             # PhoneInput, creative-launcher, etc.
│   └── spot/  illustrations/
└── lib/                    # mock data + shared helpers
```

### State + data
- All data is mocked at module load (`src/lib/*-data.ts`). No fetches.
- Workspace context + demo mode (empty-state preview toggle) live in `src/lib/workspace-context.tsx` and `src/lib/demo-mode.ts`.
- Page state is local `useState` / `useMemo`. Cross-screen handoffs (e.g. "I just launched an outreach") use `sessionStorage`.
- Form-heavy flows (`outreach/create`) use a `useState` per field with shared inline helpers (`Field`, `Section`, `AgentPicker`, etc.).

### Conventions
- **Tokens.** Colours and spacing live in Tailwind's config: `text-text-primary` (#0A0A0A), `text-text-secondary` (#6B6B6B), `text-text-tertiary` (#9B9B9B), `border-border`, `border-border-subtle`, `bg-accent` (dark), `bg-surface-page`, `bg-surface-secondary`. Status hex pairs use `#F0FDF4/#15803D/#BBF7D0` for green, `#FEF3C7/#92400E/#FDE68A` for amber, `#FEF2F2/#DC2626/#FECACA` for red.
- **Type sizes.** Page title 24 px / 600. Section header 16 px / 600. Card title 14 px / 600. Body 13 px. Meta 11.5 px. Eyebrow `text-[10.5px] font-medium uppercase tracking-[0.3-0.6px]`.
- **Numbers** use `tabular-nums`.
- **Buttons.** Primary CTA = `bg-accent text-white rounded-button`. Secondary = `border border-border bg-white`. Status actions = tinted (green/amber/red). Filters and tabs use the `inline-flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5` segmented pattern.
- **Cards.** `bg-white border border-border rounded-card`. Hero widgets `px-4 py-3.5 min-h-[140px]`.
- **Trend direction.** Up = green / Down = red by default. Spend passes `inverted` so up=red.
- **Funnels & dial-attempts** share a `ChartRow` helper — same `grid-cols-[60px_minmax(0,1fr)_72px]`, same `h-2 rounded-full` bar at `rgba(15,23,42,0.78)`.

### Key shared components
- `MetricCard` — campaign-style KPI tile.
- `DateRangeSelector` — preset picker (compact variant in most places).
- `PhoneInput` — country-code dropdown + local-number input (default +91).
- `SpotMark` — branded AI icon, used everywhere Spot speaks.
- `EditOutreachDrawer` — slide-in drawer for editing an outreach (name, agent, schedule, max churn).
- `LeadDetailPanel` — slide-in panel for inspecting a lead.

## Key design decisions

- **Consistency over novelty.** Every listing in the product uses the same `<table>` chrome (`border border-border rounded-card overflow-hidden`, uppercase tracked column heads, alternating row bg, right-aligned `tabular-nums` numerics). Every dropdown uses the same custom popover. Every status pill uses the same green / amber / blue / grey tinted-badge.
- **Quiet visual language.** No rainbows. No coloured icon tiles per row. Charts use a single dark slate or stepped opacity. Colour is reserved for status (green = good direction, red = bad, amber = warning).
- **One trend rule across the product.** Direction (up/down) drives the chip colour, except where rising is bad (Spend, CPQL, frequency) — those pass `inverted` so the up-arrow shows in red.
- **AI as a writer, not a chrome.** Spot Insights reads as a narrated brief — bold lede + regular elaboration, no rainbow icon tiles. Each insight stands on its own line.
- **Empty states are first-class.** Every section ships a Spot-led hero (single card, brand mark, 3-/4-step "how it works" strip) when the workspace is empty.
- **Two flows, one shape.** Outreach create and Campaign create are byte-identical in chrome: 860 px column, breadcrumb header, centred step indicator, completed step turns green, content fills white cards with eyebrow / title / subtitle / form fields.

## Tech stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom tokens in `tailwind.config.ts`
- **Animation**: `framer-motion` (used for page-level `fadeUp` + stagger variants)
- **Icons**: `lucide-react`
- **Dates**: `date-fns`
- **Demo data**: hand-curated TypeScript modules under `src/lib/`
- **Dev server**: `npm run dev` on port 3000, defined in `.claude/launch.json` as `revspot-dev`

## Constraints

- **No backend.** Everything is mocked. Any "save" action either updates local state or stashes in `sessionStorage`. Network code is intentionally absent.
- **Prototype-grade data.** Numbers are realistic-but-handpicked. Date ranges centre on demo dates around March 2026 so the workspace looks lived-in.
- **Single workspace.** All data assumes the **Godrej South** workspace. Workspace switching is in the sidebar but doesn't actually load different data.
- **No real auth.** The `(auth)` group exists structurally but flows are mocked.
- **Indian real-estate framing.** Copy, units (₹, lakh/crore), names (masked: `R***** K*****`), and phone formats (+91, 10 digits) all assume an Indian audience. Translations would require a deeper pass.
- **Performance not optimised.** Lists are not virtualised; the mock data is small enough that it doesn't matter. Don't take this code as a guide for a real production listing.
- **TypeScript declaration warnings.** `lucide-react` and `date-fns` produce TS7016 untyped-declaration warnings — these are intentionally ignored in the prototype.

## Recent direction

- **Outreach** has been the focus of the most recent iteration: redesigned widgets (4-up grid with consistent chrome across detail + listing), tabbed status filter, segmented filter popover with every column the table renders, expanded contacts dataset for pagination, Lead Drill-Down with collapsible transcripts, and a Spot-led empty state.
- **Campaign create** chrome is the reference shape for **outreach create** — same breadcrumb, same centred 860 px column, same step-indicator (current = dark, complete = green tick, pending = grey).
- **Voice agents** are renamed Vox / Atlas / Nova / Lyra / Halo / Echo / Orbit / Pulse to avoid mistaking them for human team members.
