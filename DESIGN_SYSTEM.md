# Revspot — Design System Reference

Portable cheat sheet of every token, recipe and convention the prototype uses, written so you can hand it to another tool (Claude, a designer, an LLM) and recreate the same visual language without studying the codebase.

The product's whole personality is "quiet workspace tool, not dashboard candy" — most of these rules exist to enforce that.

---

## 1 · Colour

### Surface

| Token | Hex | Use |
| --- | --- | --- |
| `bg-surface-page` | #FAFAFA | Page background |
| `bg-surface-secondary` | #F4F4F5 | Subtle band inside cards (alt row, segmented filter track) |
| `bg-white` | #FFFFFF | Card surface, table rows, popovers |
| `bg-accent` | #1A1A1A | Primary CTA, active sidebar item, selected step circle |
| `bg-accent-hover` | #2A2A2A | Accent button hover state |

### Borders

| Token | Hex | Use |
| --- | --- | --- |
| `border-border` | #E4E4E7 | Default card / input border |
| `border-border-subtle` | #EAEAEC | Hairline divider inside a card |

### Text

| Token | Hex | Use |
| --- | --- | --- |
| `text-text-primary` | #0A0A0A | Headlines, primary values, hero numbers |
| `text-text-secondary` | #6B6B6B | Body copy, secondary labels |
| `text-text-tertiary` | #9B9B9B | Meta, eyebrows, helper text |

### Status (always used as a hex pair: bg / fg / border)

| Status | bg | fg | border |
| --- | --- | --- | --- |
| Green (success, "good direction") | `#F0FDF4` | `#15803D` | `#BBF7D0` |
| Amber (warning, paused) | `#FEF3C7` | `#92400E` | `#FDE68A` |
| Red (error, bad direction) | `#FEF2F2` | `#DC2626` | `#FECACA` |
| Blue (informational, scheduled) | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` |

**Chart fill (mono):** `rgba(15, 23, 42, 0.78)` — used for funnel bars, dial-attempt bars, total-leads progress.

---

## 2 · Type

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Page title | 24px | 600 | Top of every screen ("Outreach", "Campaigns") |
| Section header | 16-20px | 600 | Card titles, modal titles, step headings |
| Card title | 14px | 600 | Smaller card heads ("Try it first") |
| Body | 13px | 400 | Normal text |
| Meta | 11.5px | 400 | Helper text, subtitles |
| Eyebrow | 10.5px | 500 | UPPERCASE, `tracking-[0.3-0.6px]` |
| Value (KPI headline) | 20-22px | 600 | `tabular-nums` |
| Value (sub-stat) | 11.5px | 500 | `tabular-nums` |

**Numbers always use `tabular-nums`**. Never bold an input field's text. Bold only where something has earned weight (the headline KPI, a status pill, the row's primary metric).

---

## 3 · Spacing & shape

| Token | Value |
| --- | --- |
| `rounded-card` | 12px |
| `rounded-button` | 8px |
| `rounded-input` | 8px |
| `rounded-badge` | 6px |
| Card padding (default) | `px-4 py-3.5` |
| Hero widget min-height | `min-h-[140px]` |
| Modal width | `max-w-[440px]` for confirm, `max-w-[820px]` for sheets |
| Create-flow column width | `max-w-[860px]` |

---

## 4 · Component recipes

### Primary button
```
bg-accent text-white text-[13px] font-medium h-9 px-4
rounded-button hover:bg-accent-hover transition-colors
```

### Secondary button
```
border border-border bg-white text-text-primary text-[13px] font-medium
h-9 px-4 rounded-button hover:bg-surface-page transition-colors
```

### Status pill (tinted badge)
```
inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge
bg-[#F0FDF4] text-[#15803D]   // green: Running
bg-surface-secondary text-text-secondary  // grey: Completed
bg-[#FEF3C7] text-[#92400E]   // amber: Paused
bg-[#EFF6FF] text-[#1D4ED8]   // blue:  Scheduled
```

### Segmented tabs (campaigns + outreach status filter)
Wrapper:
```
inline-flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5
```
Each tab:
```
px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors
// active
bg-white text-text-primary shadow-sm
// inactive
text-text-secondary hover:text-text-primary
```
Counts appear next to the label in `text-text-tertiary tabular-nums`.

### Table chrome
```
<div class="bg-white border border-border rounded-card overflow-hidden">
  <table class="w-full table-auto">
    <thead class="bg-surface-page/60 border-b border-border-subtle">
      <th class="px-4 py-3 text-[11px] font-medium text-text-tertiary
                 uppercase tracking-[0.5px] text-left">...
    <tbody>
      <tr class="border-b border-border-subtle last:border-b-0
                 hover:bg-surface-page bg-white">  // alternate with bg-surface-page/40
        <td class="px-4 py-3 text-[13px] text-text-primary">...
        <td class="px-3 py-3 text-right text-[13px] tabular-nums">...
```

Numerics right-aligned, with `tabular-nums`. Hero metric (the column the user came to see) is `font-semibold text-[14px]`.

### MetricCard (KPI tile)
```
<div class="bg-white border border-border rounded-card px-4 py-3.5
            min-h-[140px] flex flex-col">
  <!-- eyebrow + trend chip -->
  <div class="flex items-center justify-between mb-2">
    <span class="text-[11px] font-medium text-text-tertiary
                 uppercase tracking-[0.3px]">Talktime</span>
    <TrendChip delta={...} />
  </div>
  <!-- headline number -->
  <div class="flex items-baseline gap-1.5">
    <span class="text-[20px] font-semibold text-text-primary leading-none
                 tabular-nums">3,072</span>
    <span class="text-[11.5px] text-text-secondary leading-none">min</span>
  </div>
  <!-- sub-stats -->
  <div class="mt-auto pt-2 space-y-1 text-[11.5px] tabular-nums">
    <div class="flex items-center justify-between">
      <span class="text-text-tertiary">Calls</span>
      <span class="text-text-primary font-medium">247</span>
    </div>
  </div>
</div>
```

When the metric trend is meaningful, the **whole card** tints:
- Up by default → green tint (`bg-[#F7FDF9] border-[#E2F5E9]`)
- Down by default → red tint (`bg-[#FEF9F9] border-[#F5E2E2]`)
- Spend / CPQL / frequency etc. pass `inverted` so the meaning flips.

### Trend chip
```
inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums
// good direction
text-[#15803D]
// bad direction
text-[#DC2626]
+ ArrowUpRight or ArrowDownRight, 12px stroke 2
+ % value
```

Rule: **direction drives colour**, except metrics where rising is bad (Spend, CPQL, frequency, churn rate) — those pass an `inverted` prop.

### ChartRow (shared funnel + dial-attempt bar)
```
<div class="grid grid-cols-[60px_minmax(0,1fr)_72px] items-center gap-2">
  <span class="text-[10.5px] text-text-tertiary truncate">Dialed</span>
  <div class="h-2 rounded-full bg-surface-page overflow-hidden">
    <div class="h-full rounded-full"
         style="width: 70%; background-color: rgba(15, 23, 42, 0.78)" />
  </div>
  <span class="inline-flex items-baseline gap-1 justify-end tabular-nums">
    <span class="text-[11.5px] font-medium text-text-primary">247</span>
    <span class="text-[10px] text-text-tertiary">70%</span>
  </span>
</div>
```

Every horizontal bar chart in the product uses this exact pattern.

### Custom dropdown (replaces native `<select>` everywhere)
- Trigger: looks like an input (`h-10 px-3 border border-border rounded-input bg-white`) with a chevron icon right-aligned.
- Panel: `absolute mt-1.5 bg-white border border-border rounded-card shadow-lg max-h-[280px] overflow-y-auto`.
- Each row: `px-3 py-2 hover:bg-surface-page` with a check (`Check size=14`) right-aligned on the selected one.

### Info tooltip
```
<span class="relative inline-flex group">
  <Info size=11 stroke 1.5 class="text-text-tertiary hover:text-text-secondary cursor-help" />
  <span role="tooltip"
        class="absolute left-0 top-full mt-1.5 z-20 w-[260px]
               rounded-[8px] bg-text-primary text-white text-[11.5px]
               leading-snug px-3 py-2.5 shadow-md
               opacity-0 group-hover:opacity-100 transition-opacity
               pointer-events-none normal-case tracking-normal">
    Body copy here.
  </span>
</span>
```

### Empty state (Spot-led)
- Centred in viewport: `min-h-[calc(100vh-96px)] flex items-center justify-center`
- Single hero card `max-w-[920px]`
- Top half: small mark in a soft accent-tint circle (`w-12 h-12 bg-accent/5`), `26px font-semibold` headline, `14px text-text-secondary` body, primary CTA.
- Bottom half: connected band `bg-surface-page border-t`, 4 numbered "how it works" steps, icon in white tile.

### Sidebar wallet
Compact tile pinned above the user row:
```
<div class="rounded-[8px] border border-border-subtle bg-white px-2.5 py-2">
  <header>icon + WALLET label + % chip (text-text-primary)</header>
  <bar class="h-1 rounded-full bg-surface-secondary">
    <fill style="width:65%; background:rgba(15, 23, 42, 0.78)" />
  </bar>
  <footer>used / total min + Top up link</footer>
</div>
```

Tone switches by usage threshold: ≥90% red, ≥75% amber, otherwise neutral dark slate.

### Error banner (red, inline)
Used when a user action couldn't be completed (CSV too big, too many files):
```
<div class="bg-[#FEF2F2] border border-[#FECACA] rounded-card p-4">
  <AlertCircle size=16 stroke 1.75 class="text-[#DC2626]" />
  <div>
    <div class="text-[12.5px] font-semibold text-[#B91C1C]">Couldn't add that file</div>
    <ul class="text-[12px] text-[#B91C1C] leading-relaxed">
      <li>file.csv has 12,000 rows. Files can hold up to 10,000 — split it…</li>
    </ul>
  </div>
  <X dismiss button />
</div>
```

### Success banner (green, dismissable)
Used for one-shot confirmations (just-launched outreach):
```
<div class="bg-green-50 border border-green-200 rounded-card px-4 py-3
            flex items-center gap-3">
  <div class="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
    <Rocket size=14 class="text-green-700" />
  </div>
  <div class="text-[13px] font-semibold text-green-800">Launched — your outreach is live</div>
  <div class="text-[11.5px] text-green-700">subtitle…</div>
  <button class="text-green-700 hover:text-green-800">Open</button>
  <button aria-label="Dismiss"><X /></button>
</div>
```

---

## 5 · Conventions

- **Numbers are tabular-nums, always.** Inputs, tables, sub-stats, deltas — never a proportional digit.
- **No emojis, no rainbow icons.** Colour is reserved for status. Charts use a single dark slate.
- **One trend rule.** Up arrow = positive direction → green by default. Pass `inverted` only when rising is bad.
- **Inputs are never bold.** Even a filled value stays at default weight. Bold the label, not the field.
- **Every native `<select>` is replaced with a custom popover** (chevron + scrollable panel + check on selected). Native menus never appear in user-facing flows.
- **Empty states are first-class.** Every listing has a Spot-led hero with a clear CTA + "how it works" strip.
- **Cards over chrome.** No cards-in-cards, no decorative gradients (except a single radial whisper for AI surfaces), no coloured icon backdrops per row.
- **AI is a writer, not a widget.** Spot Insights is a narrated brief — bold lede + regular elaboration — not a 4-up grid of tiles.

---

## 6 · Motion

Framer Motion variants applied at page + section level:

```js
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = {
  hidden: { opacity: 0, y: 4 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};
```

Step transitions use `AnimatePresence mode="wait"` with a `fadeSlide` variant. Hover transitions are `transition-colors duration-150`. No bouncy or spring physics anywhere — everything is `easeOut` and short.

---

## 7 · Icons

Single source: `lucide-react`. Stroke widths are **1.5** for inline icons, **1.75** for icons inside circles/tiles, **2** for arrows + chevrons + CTA glyphs.
Sizes: 11-12px (meta), 13-14px (button), 16px (section), 18-22px (hero).

---

## 8 · Layout grid

- Page padding inherits from the app shell (no custom paddings on screen roots).
- Listings: full width minus sidebar.
- Detail screens: full width, with optional right rail / drawer slides in from edge.
- Wizards (create flows): `mx-auto max-w-[860px]`, centred breadcrumb + step indicator at top, content cards stacked vertically, footer with Back + primary CTA.
- 4-up KPI grid: `grid grid-cols-4 gap-4`. 3-up: `grid grid-cols-3 gap-4`. When mixing compact + wide widgets (e.g. 2 numbers + 1 wide bar chart), use `grid-cols-4` with the wide widget on `col-span-2`.

---

## 9 · Voice & copy

- Headers are nouns or sentences ("Outreach", "When can the agent call them?"), never marketing slogans.
- Helper text is a friendly explanation ending in a period.
- Empty states address the user directly ("Let's get your first outreach running.").
- Error messages name the problem + give the fix in the same sentence: "file.csv has 12,000 rows. Files can hold up to 10,000 — split it into smaller files and try again."
- Status labels are single words: Running / Paused / Completed / Scheduled / Qualified / Disqualified.

---

## 10 · Stack

- **Tailwind CSS** with the tokens above defined in `tailwind.config.ts`.
- **Next.js App Router** for routing.
- **TypeScript** everywhere.
- **lucide-react** for icons.
- **framer-motion** for the page + step transitions.
- **date-fns** for date formatting.

Tokens are real Tailwind classes — they exist as `bg-accent`, `text-text-primary`, `border-border-subtle` etc. in the project. If you're porting to a different toolkit, map them to the hex values in section 1.
