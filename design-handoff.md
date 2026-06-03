# Revspot — Outreach Module Design Handoff

This bundle contains the four source files that make up the Outreach experience
in the Revspot MVP. Hand this off to Claude Design to redesign the product.

## What's inside

| # | Path | What it is |
|---|------|------------|
| 1 | `src/app/(app)/outreach/page.tsx`         | Outreach **listing** — KPIs, Spot Insights, performance funnel, outreach table, empty-state landing |
| 2 | `src/app/(app)/outreach/create/page.tsx`  | **Create flow** — 3-step manual wizard (Setup → Audience → Review & Launch) |
| 3 | `src/app/(app)/outreach/[id]/page.tsx`    | **Detail page** — per-outreach analytics, contacts table, dial attempts, lead coverage |
| 4 | `src/components/layout/sidebar.tsx`       | **Left navigation** + wallet widget |

## Design tokens currently in use

- Page title: `text-page-title` (22px font-semibold) — never 28px bold
- Section eyebrow: `text-meta` (11px font-medium uppercase tracking-0.3)
- KPI card padding: `px-4 py-3.5` with `min-h-[120px]`
- Card surface: `bg-white border border-border rounded-card`
- Accent color: `accent` (indigo-violet)
- Status dots: Running `#22C55E`, Paused `#F59E0B`, Completed `#3B82F6`, Scheduled `#A855F7`
- Funnel ramp: Leads `#1F2937` → Dialed `#3730A3` → Connected `#4F46E5` → Interacted `#7C3AED` → Qualified `#16A34A`

## Recent design decisions worth preserving (or revisiting)

- Spot onboarding was **removed** — only the manual create wizard exists
- Funnel bars are **truly proportional** (no minWidth clamp) so small stages look small
- `InlineStatusBadge` on detail page is **read-only** (not a dropdown)
- DialAttempts is rendered as horizontal bars with a single indigo ramp
- Default landing time range is **Last 7 days**
- The wallet widget lives **above** the user row in the sidebar (~58px tall)

---


## 1. `src/app/(app)/outreach/page.tsx`

```tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Plus, ArrowUpRight, ArrowDownRight, Clock, IndianRupee, GitBranch, Check, Info,
  ChevronDown, Upload, Bot, TrendingDown, Trophy, CalendarDays,
  Rocket, X,
} from "lucide-react";
import { outreachList, dailyTalktime90d, dailySpend90d } from "@/lib/outreach-data";
import type { OutreachStatus, OutreachListItem } from "@/lib/outreach-data";
import { useDemoMode } from "@/lib/demo-mode";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { SpotMark } from "@/components/spot/spot-mark";

// ── Time range filter ────────────────────────────────────────────────────────
// Map the DateRangeSelector preset values to a (days, label) pair so the rest
// of the page can keep slicing data by day count. Mirrors the preset list in
// components/dashboard/date-range-selector.tsx.
function presetToRange(preset: string): { days: number; label: string } {
  switch (preset) {
    case "today":      return { days: 1,  label: "Today" };
    case "yesterday":  return { days: 1,  label: "Yesterday" };
    case "2d":         return { days: 2,  label: "Today and yesterday" };
    case "thisweek":   return { days: 7,  label: "This week" };
    case "lastweek":   return { days: 7,  label: "Last week" };
    case "7":          return { days: 7,  label: "Last 7 days" };
    case "14":         return { days: 14, label: "Last 14 days" };
    case "30":         return { days: 30, label: "Last 30 days" };
    case "thismonth":  return { days: 30, label: "This month" };
    case "lastmonth":  return { days: 30, label: "Last month" };
    case "lifetime":   return { days: 90, label: "Lifetime" };
    default:           return { days: 30, label: "Last 30 days" };
  }
}

function periodSlice(series: number[], days: number): number[] {
  return series.slice(-days);
}

function periodSum(series: number[], days: number): number {
  return periodSlice(series, days).reduce((a, b) => a + b, 0);
}

// Compare last `days` to the prior `days` window. Returns whole-number %.
function periodTrend(series: number[], days: number): number {
  const recent = periodSum(series, days);
  const prior = series.slice(-days * 2, -days).reduce((a, b) => a + b, 0);
  if (prior === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - prior) / prior) * 100);
}

// ── Motion ────────────────────────────────────────────────────────────────────
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ── Status pill — dot + label, colour-coded ───────────────────────────────────
function StatusPill({ status }: { status: OutreachStatus }) {
  const cfg: Record<OutreachStatus, { label: string; dot: string; text: string }> = {
    in_progress: { label: "Running",   dot: "#22C55E", text: "text-text-primary" },
    paused:      { label: "Paused",    dot: "#F59E0B", text: "text-text-primary" },
    completed:   { label: "Completed", dot: "#3B82F6", text: "text-text-primary" },
    scheduled:   { label: "Scheduled", dot: "#A855F7", text: "text-text-primary" },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${c.text}`}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: c.dot,
          boxShadow: status === "in_progress" ? `0 0 0 3px ${c.dot}33` : undefined,
        }}
      />
      {c.label}
    </span>
  );
}

// ── Avatar chip for creator ───────────────────────────────────────────────────
function CreatorChip({ name, initials, color }: OutreachListItem["createdBy"]) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9.5px] font-semibold text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {initials}
      </span>
      <span className="text-[12px] text-text-secondary">{name}</span>
    </span>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 120;
  const H = 36;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const pts = data.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M ${pts.join(" L ")}`;
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-9">
      <defs>
        <linearGradient id="sparkfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkfill)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Trend chip ───────────────────────────────────────────────────────────────
function TrendChip({ delta }: { delta: number }) {
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${
        up ? "text-[#15803D]" : "text-[#DC2626]"
      }`}
    >
      {up ? <ArrowUpRight size={12} strokeWidth={2} /> : <ArrowDownRight size={12} strokeWidth={2} />}
      {Math.abs(delta)}%
    </span>
  );
}

// ── Talktime widget ──────────────────────────────────────────────────────
// Matches the MetricCard design language used on /enquiries:
//   • label  → 11 px font-medium uppercase tracking-0.3
//   • value  → 22 px font-semibold (NOT 28 px bold)
//   • padding → px-4 py-3.5 (not p-5)
//   • sub-metric → small surface-secondary badge, not standalone columns
function TalktimeWidget({
  totalMins,
  totalCalls,
  delta,
  rangeLabel,
}: {
  totalMins: number;
  totalCalls: number;
  delta: number;
  rangeLabel: string;
}) {
  const avgMinPerCall = totalCalls > 0 ? totalMins / totalCalls : 0;
  const avgMins = Math.floor(avgMinPerCall);
  const avgSecs = Math.round((avgMinPerCall - avgMins) * 60);
  const avg = totalCalls > 0 ? `${avgMins}m ${String(avgSecs).padStart(2, "0")}s` : "—";
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          <Clock size={13} strokeWidth={1.5} />
          Total talktime
        </div>
        <TrendChip delta={delta} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-text-primary leading-tight tabular-nums">
          {totalMins.toLocaleString()}
        </span>
        <span className="text-[12px] text-text-secondary leading-tight">min</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {totalCalls.toLocaleString()} calls
        </span>
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {avg} avg
        </span>
      </div>
      <div className="mt-auto pt-1">
        <div className="text-[10px] text-text-tertiary tabular-nums">last {rangeLabel}</div>
      </div>
    </div>
  );
}

// ── Spend widget — emphasises qualified leads + cost-per-qualified-lead ─────
function SpendWidget({
  totalSpend,
  totalQualified,
  totalMinutes,
  delta,
  rangeLabel,
}: {
  totalSpend: number;
  totalQualified: number;
  totalMinutes: number;
  delta: number;
  rangeLabel: string;
}) {
  const cpql = totalQualified > 0 ? Math.round(totalSpend / totalQualified) : 0;
  const cpm  = totalMinutes > 0 ? Math.round(totalSpend / totalMinutes) : 0;
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          <IndianRupee size={13} strokeWidth={1.5} />
          Total spend
          <span className="relative inline-flex group">
            <Info
              size={11}
              strokeWidth={1.5}
              className="text-text-tertiary hover:text-text-secondary cursor-help"
              aria-label="How total spend is calculated"
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 whitespace-nowrap rounded-[6px] bg-text-primary text-white text-[11px] font-medium tabular-nums px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity normal-case tracking-normal"
            >
              {totalMinutes.toLocaleString()} min × {formatINR(cpm)}/min = {formatINR(totalSpend)}
              <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 -mt-1 rotate-45 bg-text-primary" aria-hidden />
            </span>
          </span>
        </div>
        <TrendChip delta={delta} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-text-primary leading-tight tabular-nums">
          {formatINR(totalSpend)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {totalQualified.toLocaleString()} qualified
        </span>
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {totalQualified > 0 ? `${formatINR(cpql)} / qual` : "—"}
        </span>
      </div>
      <div className="mt-auto pt-1">
        <div className="text-[10px] text-text-tertiary tabular-nums">last {rangeLabel}</div>
      </div>
    </div>
  );
}

// ── Performance funnel — aggregate across all (filtered) outreaches ─────────
//
// Layout: each stage is a row with a fixed-width label column on the left,
// a proportional bar in the middle, and a value/rate column on the right.
// The bar widths are truly proportional to value (no minWidth clamp), so
// "Qualified" with 56 leads visibly looks much smaller than "Dialed" with
// 247. The old design used capsule-with-text-inside and forced a 140px min
// width to fit the labels, which made small stages look the same as bigger
// ones — the very thing the funnel exists to show.
function PerformanceFunnel({
  leads, dialed, connected, interacted, qualified,
}: {
  leads: number; dialed: number; connected: number; interacted: number; qualified: number;
}) {
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const stages = [
    { key: "leads",      label: "Leads",      value: leads,      color: "#1F2937", rate: null },
    { key: "dialed",     label: "Dialed",     value: dialed,     color: "#3730A3", rate: pct(dialed, leads) },
    { key: "connected",  label: "Connected",  value: connected,  color: "#4F46E5", rate: pct(connected, dialed) },
    { key: "interacted", label: "Interacted", value: interacted, color: "#7C3AED", rate: pct(interacted, connected) },
    { key: "qualified",  label: "Qualified",  value: qualified,  color: "#16A34A", rate: pct(qualified, leads) },
  ];

  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          <GitBranch size={13} strokeWidth={1.5} />
          Performance funnel
        </div>
        <span className="text-[11px] font-medium text-text-tertiary tabular-nums">
          {pct(qualified, leads)}% overall
        </span>
      </div>
      <div className="space-y-1.5">
        {stages.map((s) => {
          // Width as a fraction of the widest stage (leads). Truly
          // proportional — no minWidth, so tiny stages stay tiny.
          const w = leads > 0 ? (s.value / leads) * 100 : 0;
          return (
            <div
              key={s.key}
              className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2"
            >
              {/* Label column — same width for all rows so bars line up */}
              <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-text-secondary">
                {s.label}
              </span>
              {/* Bar track + fill. Track gives the visual "100%" reference
                  even at 0 so a stage with 0 is still recognisable. */}
              <div className="h-4 rounded-[3px] bg-surface-page overflow-hidden">
                <div
                  className="h-full rounded-[3px] transition-all"
                  style={{ width: `${w.toFixed(2)}%`, backgroundColor: s.color, minWidth: s.value > 0 ? 2 : 0 }}
                />
              </div>
              {/* Right column — value + rate. Rate hidden for "Leads" since
                  it'd always be 100% of itself. */}
              <span className="inline-flex items-baseline gap-1.5 justify-end shrink-0 min-w-[72px]">
                <span className="text-[12.5px] font-bold tabular-nums text-text-primary leading-none">
                  {s.value.toLocaleString()}
                </span>
                {s.rate !== null && (
                  <span className="text-[10px] font-medium tabular-nums text-text-tertiary">
                    {s.rate}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Status multi-select filter ──────────────────────────────────────────────
const STATUS_OPTS: { value: OutreachStatus; label: string; dot: string }[] = [
  { value: "in_progress", label: "Running",   dot: "#22C55E" },
  { value: "paused",      label: "Paused",    dot: "#F59E0B" },
  { value: "completed",   label: "Completed", dot: "#3B82F6" },
  { value: "scheduled",   label: "Scheduled", dot: "#A855F7" },
];

// Status filter — three useful states only: all selected, multi-select,
// or single-status focus. Going to "zero selected" was never useful (the
// listing just empties), so we removed the "Clear all" affordance and
// guarantee at least one status stays checked. Each row has an "Only" hover
// link so a user can jump straight to single-status view in one click —
// faster than ticking off the other three.
function StatusFilter({
  selected,
  onToggle,
  onSetAll,
  onSelectOnly,
}: {
  selected: Set<OutreachStatus>;
  onToggle: (v: OutreachStatus) => void;
  onSetAll: (all: boolean) => void;
  onSelectOnly: (v: OutreachStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.size === STATUS_OPTS.length;
  const label = allSelected
    ? "All statuses"
    : selected.size === 1
      ? STATUS_OPTS.find(s => selected.has(s.value))?.label ?? ""
      : `${selected.size} statuses`;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-medium rounded-button border transition-colors ${
          allSelected
            ? "border-border bg-white text-text-secondary hover:bg-surface-page"
            : "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
        }`}
      >
        {label}
        <ChevronDown size={13} strokeWidth={1.5} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
              <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Status</span>
              {/* "Select all" is the only reset action — clearing to zero
                  would just empty the list. Hidden when everything is
                  already selected since it'd be a no-op. */}
              {!allSelected && (
                <button
                  onClick={() => onSetAll(true)}
                  className="text-[11.5px] font-medium text-accent hover:underline"
                >
                  Select all
                </button>
              )}
            </div>
            {STATUS_OPTS.map(s => {
              const isChecked = selected.has(s.value);
              const isOnlyOneSelected = isChecked && selected.size === 1;
              return (
                <div
                  key={s.value}
                  className="group flex items-center gap-2.5 px-3 py-2 hover:bg-surface-page"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    // Toggling off the LAST selected status would leave the
                    // listing empty — block that interaction explicitly so the
                    // user can't get into a useless state. The user sees the
                    // checkbox stay checked, which signals the constraint.
                    onChange={() => {
                      if (isChecked && selected.size === 1) return;
                      onToggle(s.value);
                    }}
                    className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/20 cursor-pointer disabled:cursor-not-allowed"
                    disabled={isOnlyOneSelected}
                    aria-label={isOnlyOneSelected ? `${s.label} (cannot deselect the last status)` : s.label}
                  />
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                  <span className="flex-1 text-[12.5px] text-text-primary cursor-default">{s.label}</span>
                  {/* "Only" link — jump to single-status focus in one click.
                      Hidden when already focused on this status. */}
                  {!isOnlyOneSelected && (
                    <button
                      onClick={() => onSelectOnly(s.value)}
                      className="text-[10.5px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                    >
                      Only
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Spot Insights — 4-up grid (the original design) ─────────────────────────
// Reverted to this after trying denser layouts; we'll iterate later. Each
// insight tile: tinted icon block + bolded title + muted detail. Capped at
// 4 — anything beyond is dropped on the floor (the caller already feeds
// exactly 4 today).
function SpotInsightsWidget({ insights }: {
  insights: Array<{
    id: string;
    icon: React.ElementType;
    iconColor: string;
    title: string;
    detail: string;
  }>;
}) {
  if (insights.length === 0) return null;
  const shown = insights.slice(0, 4);
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <SpotMark size={13} />
        <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
          Spot Insights
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        {shown.map((i) => {
          const Icon = i.icon;
          return (
            <div key={i.id} className="flex items-start gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${i.iconColor}15` }}
              >
                <Icon size={15} strokeWidth={1.8} style={{ color: i.iconColor }} />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-text-primary leading-snug">
                  {i.title}
                </div>
                <div className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
                  {i.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mini-funnel cell — 5 stages matching the detail page + aggregate funnel ─
function MiniFunnel({
  leads, dialed, connected, interacted, qualified,
}: {
  leads: number; dialed: number; connected: number; interacted: number; qualified: number;
}) {
  const max = Math.max(leads, 1);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  // Each stage carries its own rate definition — Coverage / Connect rate /
  // Interaction rate / Qualification rate — same as the Performance funnel
  // widget and the detail page, so a user sees identical numbers everywhere.
  const stages = [
    { label: "Leads",      value: leads,      color: "#1F2937", rate: null },
    { label: "Dialed",     value: dialed,     color: "#3730A3", rate: pct(dialed, leads) },
    { label: "Connected",  value: connected,  color: "#4F46E5", rate: pct(connected, dialed) },
    { label: "Interacted", value: interacted, color: "#7C3AED", rate: pct(interacted, connected) },
    { label: "Qualified",  value: qualified,  color: "#16A34A", rate: pct(qualified, leads) },
  ];
  return (
    <div className="grid grid-cols-5 gap-2 min-w-[440px]">
      {stages.map((s) => {
        const widthPct = max > 0 ? Math.max(2, (s.value / max) * 100) : 0;
        return (
          <div key={s.label}>
            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.4px] mb-0.5 truncate">
              {s.label}
            </div>
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className="text-[15px] font-bold tabular-nums text-text-primary leading-none">
                {s.value.toLocaleString()}
              </span>
              {s.rate !== null && (
                <span className="text-[10px] font-medium tabular-nums text-text-tertiary leading-none">
                  {s.rate}%
                </span>
              )}
            </div>
            <div className="h-1 bg-surface-page rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct.toFixed(1)}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Outreach row card ─────────────────────────────────────────────────────────
function OutreachCard({ o }: { o: OutreachListItem }) {
  const router = useRouter();
  return (
    <motion.button
      variants={fadeUp}
      onClick={() => router.push(`/outreach/${o.id}`)}
      className="w-full text-left bg-white border border-border rounded-card px-5 py-4 hover:border-text-secondary hover:shadow-sm transition-all duration-150 flex items-center gap-6"
    >
      {/* Left: name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <h3 className="text-[15px] font-semibold text-text-primary truncate">{o.name}</h3>
          <StatusPill status={o.status} />
        </div>
        <div className="flex items-center gap-3 text-[12px] text-text-secondary">
          <span className="tabular-nums">
            Created {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="text-border">·</span>
          <CreatorChip {...o.createdBy} />
          {/* Voice agent attached to this outreach — surfaces who's doing the
              calling at a glance so the user doesn't have to open the detail
              page to know which agent's voice is on the line. */}
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1 text-text-secondary">
            <Bot size={12} strokeWidth={1.5} className="text-text-tertiary" />
            <span className="font-medium text-text-primary">{o.voiceAgent}</span>
          </span>
        </div>
      </div>

      {/* Right: mini funnel */}
      <div className="shrink-0">
        <MiniFunnel
          leads={o.totalContacts}
          dialed={o.called}
          connected={o.connected}
          interacted={o.interacted}
          qualified={o.qualified}
        />
      </div>
    </motion.button>
  );
}

// Compute the fraction of an outreach's lifetime that falls inside the
// selected time range. An outreach with 60 activity days viewed at "last 7d"
// contributes 7/60; at "90d" it contributes 1 (cap). An outreach with 0 days
// of activity (Scheduled) contributes 0. This keeps per-row numbers, the
// aggregates, and the funnel internally consistent.
function rangeShare(activityDays: number, rangeDays: number): number {
  if (activityDays <= 0) return 0;
  return Math.min(1, rangeDays / activityDays);
}

// ── First-time landing ────────────────────────────────────────────────────
// When the workspace has no outreaches yet, we skip the populated chrome
// (filters, hero widgets, list) and show a Spot-led hero. The user has two
// ways to start: type a natural-language brief into Spot and let the system
// pre-fill the create form, or jump into the create flow blank.
//
// On submit we route to /outreach/create?prompt=<text>&via=spot — the create
// page reads the query param, infers a name / description / agent, and shows
// a "Spot drafted this" banner above Step 1 so the user can review what was
// interpreted before continuing.

// 4-step intro tied to the actual product flow. Step 1 maps to the Setup
// stage of /outreach/create, step 2 to Audience, step 3 to Review & Launch,
// step 4 to the live outreach detail page. The bodies stay literal — what
// the user is going to do, not marketing fluff.
const HOW_IT_WORKS: Array<{ icon: React.ElementType; title: string; body: string }> = [
  {
    icon: Bot,
    title: "Set up the outreach",
    body: "Give it a name, pick the voice agent that does the calling, and choose when and how fast it should run.",
  },
  {
    icon: Upload,
    title: "Add your leads",
    body: "Drop one or more CSVs with Name and Phone columns. We validate every row and skip the broken ones before dialing.",
  },
  {
    icon: Clock,
    title: "Review and launch",
    body: "Confirm the agent, schedule and pace. Optionally place a quick test call to yourself, then launch the outreach.",
  },
  {
    icon: Rocket,
    title: "Track results live",
    body: "Watch dials, connects, qualified leads and recordings update in real time. Pause, resume, or extend whenever.",
  },
];

function EmptyOutreachLanding() {
  const router = useRouter();

  return (
    <motion.div initial="hidden" animate="show" variants={stagger}>
      {/* Page title — kept so the section still reads as "Outreach", just
          without the populated chrome (filters, range selector). */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="text-meta text-text-secondary mb-1">Lead Generation</div>
        <h1 className="text-page-title text-text-primary">Outreach</h1>
      </motion.div>

      {/* Hero — clean welcome + primary CTA. No Spot composer, no AI chat
          handoff. Users walk through the manual 3-step create flow. */}
      <motion.div variants={fadeUp} className="bg-white border border-border rounded-card overflow-hidden">
        <div className="relative px-8 pt-12 pb-9">
          <div className="relative max-w-[640px] mx-auto text-center">
            <h2 className="text-[24px] font-semibold text-text-primary leading-tight mb-2">
              Let's get your first outreach running.
            </h2>
            <p className="text-[13.5px] text-text-secondary leading-relaxed max-w-[520px] mx-auto">
              Outreach turns your contact lists into AI voice-agent dials.
              Upload an audience, pick an agent, set a schedule — and watch
              the calls happen in real time.
            </p>

            <div className="mt-7">
              <button
                onClick={() => router.push("/outreach/create")}
                className="inline-flex items-center gap-2 h-11 px-6 bg-accent text-white text-[14px] font-medium rounded-button hover:bg-accent-hover transition-colors"
              >
                <Plus size={16} strokeWidth={2} />
                Create your first outreach
              </button>
              <div className="mt-2.5 text-[11.5px] text-text-tertiary">
                Walk through the 3-step form. Takes about a minute.
              </div>
            </div>
          </div>
        </div>

        {/* How it works — strip across the bottom of the hero card */}
        <div className="bg-surface-page border-t border-border-subtle px-8 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1000px] mx-auto">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-[8px] bg-white border border-border-subtle flex items-center justify-center text-text-secondary">
                    <Icon size={14} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-text-primary mb-0.5 flex items-center gap-1.5">
                      <span className="text-text-tertiary tabular-nums">{i + 1}.</span>
                      {step.title}
                    </div>
                    <div className="text-[11.5px] text-text-secondary leading-relaxed">
                      {step.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Shape of the "just launched" payload the create page stashes in
// sessionStorage on Launch, so the listing can pick it up and show a
// success banner + a fresh row at the top of the list.
type JustLaunched = {
  id: string;
  name: string;
  voiceAgent: string;
  totalContacts: number;
  status: OutreachStatus;
  createdAt: string;
  description?: string;
  startMode?: "immediately" | "schedule";
  startDate?: string;
  startTime?: string;
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OutreachPage() {
  const router = useRouter();
  const { isEmpty } = useDemoMode();

  // Pick up any outreach that was just launched (from /outreach/create's
  // Launch button). The handoff is via sessionStorage so we don't need a
  // global store for a one-shot event. The entry is consumed on mount and
  // kept in component state for the lifetime of this page view, so the
  // banner + prepended row survive filter/range changes until the user
  // navigates away.
  const [justLaunched, setJustLaunched] = useState<JustLaunched | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("outreach_just_launched");
      if (!raw) return;
      const parsed = JSON.parse(raw) as JustLaunched;
      if (parsed && parsed.id && parsed.name) setJustLaunched(parsed);
      sessionStorage.removeItem("outreach_just_launched");
    } catch {
      /* ignore */
    }
  }, []);

  // Synthesize an OutreachListItem from the just-launched payload so it can
  // be rendered by the same card component as everything else. Brand-new
  // outreach has zero calling activity yet — every funnel stage is 0 — so
  // we set activityDays=1 to keep the row visible at any time range
  // (it'd otherwise be filtered out as "no activity in this window").
  const newOutreachAsListItem: OutreachListItem | null = useMemo(() => {
    if (!justLaunched) return null;
    return {
      id: justLaunched.id,
      name: justLaunched.name,
      voiceAgent: justLaunched.voiceAgent,
      totalContacts: justLaunched.totalContacts,
      called: 0,
      connected: 0,
      interacted: 0,
      qualified: 0,
      notQualified: 0,
      callback: 0,
      noAnswer: 0,
      status: justLaunched.status,
      progress: 0,
      createdAt: justLaunched.createdAt,
      activityDays: 1,
      talktimeMins: 0,
      spend: 0,
      createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
    };
  }, [justLaunched]);

  const allOutreach = useMemo(() => {
    const base = isEmpty ? [] : outreachList;
    // Prepend the new one so it lands at the top of the list — the user
    // just made it and that's the first thing they want to see.
    return newOutreachAsListItem ? [newOutreachAsListItem, ...base] : base;
  }, [isEmpty, newOutreachAsListItem]);

  // Branch: empty workspace → Spot-led landing; otherwise → populated body.
  // The populated body lives in its own component because it owns additional
  // hooks (rangePreset, statusFilter, scaled, insights, …). Returning
  // conditionally BEFORE those hooks would change the hook count between
  // renders and break the Rules of Hooks. Splitting into two components
  // keeps each one's hook set unconditional.
  if (allOutreach.length === 0) {
    return <EmptyOutreachLanding />;
  }
  return (
    <PopulatedOutreach
      allOutreach={allOutreach}
      justLaunched={justLaunched}
      clearJustLaunched={() => setJustLaunched(null)}
    />
  );
}

// ── Populated outreach page ────────────────────────────────────────────────
// Renders only when the workspace has at least one outreach. Owns the
// filters, range, computed visible set and the full layout.
function PopulatedOutreach({
  allOutreach,
  justLaunched,
  clearJustLaunched,
}: {
  allOutreach: OutreachListItem[];
  justLaunched: JustLaunched | null;
  clearJustLaunched: () => void;
}) {
  const router = useRouter();
  // Default landing view is the last 7 days — that's the cadence users
  // typically check on (week-over-week). 30d is reachable from the selector.
  const [rangePreset, setRangePreset] = useState<string>("7");
  const [statusFilter, setStatusFilter] = useState<Set<OutreachStatus>>(
    () => new Set(STATUS_OPTS.map(s => s.value))
  );
  const toggleStatus = (v: OutreachStatus) =>
    setStatusFilter(prev => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v); else next.add(v);
      // Defensive — the filter UI already prevents deselecting the last
      // status, but if anyone calls this with zero-state we restore "all"
      // so the listing never goes empty.
      if (next.size === 0) return new Set(STATUS_OPTS.map(s => s.value));
      return next;
    });
  const setAllStatus = (all: boolean) =>
    setStatusFilter(all ? new Set(STATUS_OPTS.map(s => s.value)) : new Set(STATUS_OPTS.map(s => s.value)));
  // Jump to single-status focus in one click — same as ticking one box and
  // unticking the other three.
  const selectOnlyStatus = (v: OutreachStatus) => setStatusFilter(new Set([v]));

  const { days, label: rangeLabel } = presetToRange(rangePreset);
  const talktimeDelta  = periodTrend(dailyTalktime90d, days);
  const spendDelta     = periodTrend(dailySpend90d, days);

  // Apply status filter, then scale every outreach's numbers to the period.
  const scaled = useMemo(() => {
    return allOutreach
      .filter(o => statusFilter.has(o.status))
      .map(o => {
        const share = rangeShare(o.activityDays, days);
        return {
          ...o,
          totalContacts: Math.round(o.totalContacts * share),
          called:        Math.round(o.called        * share),
          connected:     Math.round(o.connected     * share),
          interacted:    Math.round(o.interacted    * share),
          qualified:     Math.round(o.qualified     * share),
          talktimeMins:  Math.round(o.talktimeMins  * share),
          spend:         Math.round(o.spend         * share),
          // Hide rows with no activity in the selected period — they'd be
          // entirely zero and confusing.
          _hasActivity:  share > 0,
        };
      });
  }, [allOutreach, statusFilter, days]);

  const visible = scaled.filter(o => o._hasActivity);

  // Aggregate from the scaled rows so all numbers tie out: hero widgets are
  // exactly the sum of the rows the user sees below.
  const agg = visible.reduce(
    (a, o) => ({
      leads:      a.leads      + o.totalContacts,
      dialed:     a.dialed     + o.called,
      connected:  a.connected  + o.connected,
      interacted: a.interacted + o.interacted,
      qualified:  a.qualified  + o.qualified,
      talktime:   a.talktime   + o.talktimeMins,
      spend:      a.spend      + o.spend,
    }),
    { leads: 0, dialed: 0, connected: 0, interacted: 0, qualified: 0, talktime: 0, spend: 0 }
  );

  // Derived insights from the visible (scaled, filtered) data. Each one is a
  // self-contained observation a fresh viewer can act on.
  const insights = useMemo(() => {
    const cpql = agg.qualified > 0 ? Math.round(agg.spend / agg.qualified) : 0;
    // Pick the outreach with the most qualified leads
    const topByQual = [...visible].sort((a, b) => b.qualified - a.qualified)[0];
    const topByQualCpql =
      topByQual && topByQual.qualified > 0
        ? Math.round(topByQual.spend / topByQual.qualified)
        : 0;

    return [
      {
        id: "cpql",
        icon: TrendingDown,
        iconColor: "#16A34A",
        title: `Cost per qualified lead is down ${Math.abs(spendDelta)}%`,
        detail:
          spendDelta < 0
            ? `Now ${formatINR(cpql)} — your most efficient ${rangeLabel.toLowerCase()} yet.`
            : `Trending toward ${formatINR(cpql)} per qualified. Worth reviewing your top outreach.`,
      },
      {
        id: "best-slot",
        icon: Clock,
        iconColor: "#4F46E5",
        title: "Best slot: Tuesday & Thursday, 2–4 PM",
        detail: "68% pickup rate in that window vs 41% across all outreaches.",
      },
      {
        id: "top-outreach",
        icon: Trophy,
        iconColor: "#D97706",
        title: topByQual
          ? `${topByQual.name.split(" — ")[0]} is your top performer`
          : "No outreach has qualified leads yet",
        detail: topByQual
          ? `${topByQual.qualified.toLocaleString()} qualified · ${formatINR(topByQualCpql)} per qualified lead.`
          : "Run more dials to surface a leader.",
      },
      {
        id: "best-day",
        icon: CalendarDays,
        iconColor: "#7C3AED",
        title: "Wednesdays convert best",
        detail: "24% qualification rate — 6 points above the weekly average.",
      },
    ];
  }, [visible, agg, spendDelta, rangeLabel]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Just-launched banner — appears once after Launch from /create.
          Confirms the outreach landed and points the user at the new row
          (which is also prepended to the list below). Dismissable. */}
      {justLaunched && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-card"
        >
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <Rocket size={14} strokeWidth={1.75} className="text-green-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-green-800">
              {justLaunched.status === "scheduled"
                ? "Scheduled — your outreach is queued"
                : "Launched — your outreach is live"}
            </div>
            <div className="text-[11.5px] text-green-700 mt-0.5 truncate">
              <span className="font-medium">{justLaunched.name}</span>
              {" · "}{justLaunched.voiceAgent} · {justLaunched.totalContacts.toLocaleString()} leads
              {justLaunched.status === "scheduled" && justLaunched.startDate
                ? ` · starts ${justLaunched.startDate}${justLaunched.startTime ? ` at ${justLaunched.startTime}` : ""}`
                : " — dialing has begun"}
            </div>
          </div>
          <button
            onClick={() => router.push(`/outreach/${justLaunched.id}`)}
            className="shrink-0 text-[12px] font-medium text-green-700 hover:text-green-800 hover:underline"
          >
            Open
          </button>
          <button
            onClick={clearJustLaunched}
            className="shrink-0 text-green-700/70 hover:text-green-800 p-0.5"
            aria-label="Dismiss"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">Lead Generation</div>
          <h1 className="text-page-title text-text-primary">Outreach</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusFilter
            selected={statusFilter}
            onToggle={toggleStatus}
            onSetAll={setAllStatus}
            onSelectOnly={selectOnlyStatus}
          />
          <DateRangeSelector compact onChange={setRangePreset} defaultPreset="7" />
          <button
            onClick={() => router.push("/outreach/create")}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
          >
            <Plus size={15} strokeWidth={2} />
            New outreach
          </button>
        </div>
      </motion.div>

      {/* Row 1: Spot Insights — full width, 4 insights horizontal */}
      <motion.div variants={fadeUp} className="mb-4">
        <SpotInsightsWidget insights={insights} />
      </motion.div>

      {/* Row 2: aggregate widgets — Talktime / Spend / Performance funnel */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 mb-6">
          <TalktimeWidget
            totalMins={agg.talktime}
            totalCalls={agg.dialed}
            delta={talktimeDelta}
            rangeLabel={rangeLabel}
          />
          <SpendWidget
            totalSpend={agg.spend}
            totalQualified={agg.qualified}
            totalMinutes={agg.talktime}
            delta={spendDelta}
            rangeLabel={rangeLabel}
          />
          <PerformanceFunnel
            leads={agg.leads}
            dialed={agg.dialed}
            connected={agg.connected}
            interacted={agg.interacted}
            qualified={agg.qualified}
          />
      </motion.div>

      {/* List — empty case is handled by the early-return above (Spot
          landing). Here we only need to handle the case where the user has
          outreaches but none matched the filters / time range. */}
      {visible.length === 0 ? (
        <div className="bg-white border border-border rounded-card px-5 py-10 text-center">
          <p className="text-[13px] text-text-secondary">
            No outreaches had activity in {rangeLabel.toLowerCase()}
            {statusFilter.size < STATUS_OPTS.length && " for the selected status"}.
          </p>
          <p className="text-[12px] text-text-tertiary mt-1">
            Try widening the time range or selecting more statuses.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map(o => (
            <OutreachCard key={o.id} o={o} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
```

---

## 2. `src/app/(app)/outreach/create/page.tsx`

```tsx
"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Upload, FileSpreadsheet, X, Rocket, Save,
  CheckCircle2, AlertCircle, Plus, Download, Check, Phone, Clock,
  PhoneCall, Users, Calendar, BarChart2, Bot, Repeat, FlaskConical, Loader2,
  Info, ChevronDown,
} from "lucide-react";
import { voiceAgents } from "@/lib/outreach-data";
import { useDemoMode } from "@/lib/demo-mode";

// Opacity-only step transition. Earlier the variant animated `x: 10 → 0`,
// but framer-motion under AnimatePresence sometimes leaves a residual
// translateX on the element after the animation completes — which then
// shifts the step body horizontally relative to its sibling nav buttons
// (which sit outside the motion.div). The result was a ~7 px misalignment
// between widgets and the Back/Next bar on Step 2. Dropping the x animation
// keeps the slide-in feel via opacity alone and removes the source of the
// residual transform.
const fadeSlide: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STEPS = [
  { id: 1 as const, label: "Setup" },
  { id: 2 as const, label: "Audience" },
  { id: 3 as const, label: "Review & Launch" },
];
type Step = 1 | 2 | 3;

interface ManualLead { id: string; name: string; phone: string; }

// CSV upload data model — mirrors the AddLeadsModal pattern from the outreach
// detail page so the audience step behaves the same way (real parsing, real
// validation, per-row failure reasons surfaced to the user).
type RowStatus = "valid" | "missingName" | "missingPhone" | "invalidFormat" | "duplicate";
interface PreviewRow {
  cells: string[];
  status: RowStatus;
  // Carry the extracted Name/Phone alongside the raw cells so the
  // cumulative cross-file preview can render a consistent Name/Phone column
  // even when each file has its own column shape (e.g. "Full Name" vs
  // "Name", "Mobile" vs "Phone").
  name: string;
  phone: string;
}
interface CsvInvalidBreakdown {
  missingPhone:   number;
  invalidFormat:  number;
  duplicatePhone: number;
  missingName:    number;
}
interface CsvFile {
  name:           string;
  totalRows:      number;
  validRows:      number;
  invalid:        CsvInvalidBreakdown;
  previewHeaders: string[];
  previewRows:    PreviewRow[];
  // The full set of tagged rows — used for the right-side preview panel which
  // wants to scroll through everything, not just the first few sample rows.
  allRows:        PreviewRow[];
}

const INVALID_REASONS: Array<{ key: keyof CsvInvalidBreakdown; label: string; hint: string }> = [
  { key: "missingPhone",   label: "Missing phone",   hint: "Row has no value in the phone column" },
  { key: "invalidFormat",  label: "Invalid format",  hint: "Couldn't parse as a 10-digit number" },
  { key: "duplicatePhone", label: "Duplicate",       hint: "Already exists in this file" },
  { key: "missingName",    label: "Missing name",    hint: "Row has no value in the name column" },
];

const ROW_STATUS_LABEL: Record<Exclude<RowStatus, "valid">, string> = {
  missingName:   "Missing name",
  missingPhone:  "Missing phone",
  invalidFormat: "Invalid format",
  duplicate:     "Duplicate",
};

// Minimal CSV splitter — handles quoted fields with embedded commas. Not a
// full RFC 4180 implementation, but covers the shapes spreadsheets emit.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseAndValidateCsv(name: string, text: string): CsvFile {
  const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (allLines.length === 0) {
    return {
      name, totalRows: 0, validRows: 0,
      invalid: { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 },
      previewHeaders: [], previewRows: [], allRows: [],
    };
  }

  const headerCells = splitCsvLine(allLines[0]);
  const headerLower = headerCells.map(h => h.toLowerCase());
  const phoneIdx = headerLower.findIndex(h => /phone|mobile|whatsapp|^number$/.test(h));
  const nameIdx  = headerLower.findIndex(h => /^name$|^full\s*name$|^lead\s*name$|first\s*name|^contact$/.test(h));

  const dataLines = allLines.slice(1);
  const seen = new Set<string>();

  const taggedAll: PreviewRow[] = dataLines.map((line) => {
    const cols = splitCsvLine(line);
    const phoneRaw = phoneIdx >= 0 ? (cols[phoneIdx] ?? "") : "";
    const nameRaw  = nameIdx  >= 0 ? (cols[nameIdx]  ?? "") : "";
    const name  = nameRaw.trim();
    const phone = phoneRaw.trim();

    if (!name)  return { cells: cols, status: "missingName",  name, phone };
    if (!phone) return { cells: cols, status: "missingPhone", name, phone };

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 12) return { cells: cols, status: "invalidFormat", name, phone };

    if (seen.has(digits)) return { cells: cols, status: "duplicate", name, phone };
    seen.add(digits);
    return { cells: cols, status: "valid", name, phone };
  });

  let missingPhone = 0, invalidFormat = 0, duplicatePhone = 0, missingName = 0, valid = 0;
  for (const r of taggedAll) {
    if      (r.status === "valid")         valid++;
    else if (r.status === "missingPhone")  missingPhone++;
    else if (r.status === "invalidFormat") invalidFormat++;
    else if (r.status === "duplicate")     duplicatePhone++;
    else if (r.status === "missingName")   missingName++;
  }

  // Sample preview = first 5 failed + first 5 valid, so the user sees both
  // signals even on largely clean files.
  const failed = taggedAll.filter(r => r.status !== "valid").slice(0, 5);
  const ok     = taggedAll.filter(r => r.status === "valid").slice(0, 5);
  const previewRows = [...failed, ...ok].slice(0, 10);

  return {
    name,
    totalRows: dataLines.length,
    validRows: valid,
    invalid: { missingPhone, invalidFormat, duplicatePhone, missingName },
    previewHeaders: headerCells,
    previewRows,
    allRows: taggedAll,
  };
}

function generateSampleCsv(): string {
  return [
    "Name,Phone,Email,Source,Budget",
    "Ramesh Kumar,9876543210,ramesh@gmail.com,Meta Lead,1.5Cr",
    "Sunita Patel,9012345678,sunita@yahoo.com,Website,2Cr",
    "Vikram Singh,8765432109,vikram@outlook.com,Meta Lead,80L",
    "Ananya Rao,9123456780,ananya@gmail.com,Referral,1.8Cr",
    "Deepak Menon,8012345679,deepak@gmail.com,Meta Lead,1.2Cr",
  ].join("\n");
}

// Build a canonical header list across multiple uploaded files. Different
// CSVs may have different column shapes (Name/Phone in one, Full Name/Mobile
// in another); we de-dupe case-insensitively and preserve first-seen display
// casing so the merged preview reads like a single spreadsheet.
function buildCanonicalHeaders(files: CsvFile[]): string[] {
  const seen = new Map<string, string>(); // normalized key → display label
  for (const f of files) {
    for (const h of f.previewHeaders) {
      const key = h.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, h.trim());
    }
  }
  return Array.from(seen.values());
}

// Align a row from a specific file's cells (which sit in the order of that
// file's headers) into the union canonical-header order, returning a cell
// for every canonical column. Cells from columns the file didn't have come
// back as empty strings.
function alignRowToCanonical(
  cells: string[],
  fileHeaders: string[],
  canonical: string[]
): string[] {
  return canonical.map(ch => {
    const key = ch.trim().toLowerCase();
    const fileIdx = fileHeaders.findIndex(h => h.trim().toLowerCase() === key);
    return fileIdx >= 0 ? (cells[fileIdx] ?? "") : "";
  });
}

function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const inputCls = "w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary";
const selectCls = `${inputCls} appearance-none cursor-pointer`;
const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center" as const,
};

function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-[12.5px] font-medium text-text-primary">
        {children}{required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-text-tertiary mt-0.5">{hint}</p>}
    </div>
  );
}

// Numbered section heading — bridges the gap between "page heading" and "form
// field" with a sense of progression as the user moves down.
function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 py-4 border-b border-border-subtle last:border-b-0">
      <div className="flex items-start gap-2.5 mb-3.5">
        <div className="w-6 h-6 rounded-full bg-text-primary text-white flex items-center justify-center text-[11px] font-bold shrink-0">
          {number}
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-[14px] font-semibold text-text-primary leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-[12px] text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="pl-[34px] space-y-4">{children}</div>
    </section>
  );
}

// Field row used inside a Section — label + hint + input(s).
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5">
        <label className="text-[12.5px] font-medium text-text-primary">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
        {hint && <p className="text-[11px] text-text-tertiary mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string;
}) {
  const empty = !value;
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border-subtle last:border-0">
      <Icon size={12} strokeWidth={1.5} className="text-text-tertiary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[9.5px] font-bold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">{label}</div>
        <div className={`text-[12.5px] font-medium truncate ${empty ? "text-text-tertiary" : "text-text-primary"}`}>
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

// (Prompt→form inference for the Spot onboarding composer was removed when
// we collapsed to a manual-only onboarding flow. Users always start with a
// blank form now.)

// ── Voice agent picker ────────────────────────────────────────────────────
// A native <select> can only render text options, so we built a tiny custom
// dropdown that mirrors the native styling and adds a separated "Create new
// agent" item at the bottom. Picking that routes to the agent creation flow
// so the user never gets stuck if none of the existing agents fit.
function AgentPicker({
  agents,
  value,
  onChange,
  onCreateNew,
}: {
  agents: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = agents.find(a => a.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputCls} flex items-center justify-between text-left ${
          selected ? "text-text-primary" : "text-text-tertiary"
        }`}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <Bot size={14} strokeWidth={1.5} className="text-text-secondary shrink-0" />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span>Pick an agent…</span>
          )}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={`text-text-tertiary shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto py-1">
              {agents.length === 0 && (
                <div className="px-3 py-2 text-[12px] text-text-tertiary">No agents yet.</div>
              )}
              {agents.map(a => {
                const isActive = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { onChange(a.id); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-accent/5 text-text-primary" : "hover:bg-surface-page"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-surface-page text-text-secondary shrink-0">
                      <Bot size={12} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 min-w-0 text-[12.5px] font-medium text-text-primary truncate">{a.name}</span>
                    {isActive && <Check size={13} strokeWidth={2} className="text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>
            {/* Divider + create-new — always visible so the user has a clear
                escape hatch if no existing agent fits the outreach. */}
            <div className="border-t border-border-subtle">
              <button
                type="button"
                onClick={() => { setOpen(false); onCreateNew(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent/5 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-accent/10 text-accent shrink-0">
                  <Plus size={13} strokeWidth={2} />
                </span>
                <span className="flex-1 text-[12.5px] font-medium text-accent">Create a new agent</span>
                <ArrowRight size={12} strokeWidth={1.75} className="text-accent shrink-0" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CreateOutreachInner() {
  const router = useRouter();
  const { isEmpty, setMode } = useDemoMode();
  const [step, setStep] = useState<Step>(1);

  /* ── Step 1 ──────────────────────────────────────────────────────────── */
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [agent, setAgent]             = useState("");
  const [startMode, setStartMode]     = useState<"immediately" | "schedule">("immediately");
  const [startDate, setStartDate]     = useState("");
  const [startTime, setStartTime]     = useState("10:00");
  const [activeDays, setActiveDays]   = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [slotMode, setSlotMode]       = useState<"same" | "perDay">("same");
  // Shared slots used when slotMode === "same"
  const [sharedSlots, setSharedSlots] = useState<Array<{ start: string; end: string }>>(
    [{ start: "09:00", end: "19:00" }]
  );
  // Per-day slots used when slotMode === "perDay"; keyed by day code (Mon, Tue…)
  const [perDaySlots, setPerDaySlots] = useState<Record<string, Array<{ start: string; end: string }>>>(
    () => Object.fromEntries(DAYS.map(d => [d, [{ start: "09:00", end: "19:00" }]]))
  );
  const [maxRetries, setMaxRetries]   = useState("2");

  /* ── Step 2 ──────────────────────────────────────────────────────────── */
  const [csvFiles, setCsvFiles]       = useState<CsvFile[]>([]);
  // Which uploaded file is currently rendered in the right-side preview pane.
  const [activeFileIdx, setActiveFileIdx] = useState<number>(0);
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  /* ── Step 3: Test before launch ──────────────────────────────────────── */
  const [testContacts, setTestContacts] = useState<ManualLead[]>([{ id: "t1", name: "", phone: "" }]);
  const [testState, setTestState]       = useState<"idle" | "sending" | "sent">("idle");

  /* ── Derived ─────────────────────────────────────────────────────────── */
  // Only valid rows count — invalid ones get skipped at launch time and are
  // shown separately so the user knows what was dropped and why.
  const totalContacts    = csvFiles.reduce((s, f) => s + f.validRows, 0);
  const totalRowsScanned = csvFiles.reduce((s, f) => s + f.totalRows, 0);
  const totalSkipped     = totalRowsScanned - totalContacts;
  const selectedAgent    = voiceAgents.find(va => va.id === agent);

  const toggleDay = (day: string) =>
    setActiveDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day]);

  // Slot mutation helpers — work for either shared or per-day mode.
  const addSharedSlot = () =>
    setSharedSlots(p => [...p, { start: "09:00", end: "19:00" }]);
  const updateSharedSlot = (idx: number, field: "start" | "end", v: string) =>
    setSharedSlots(p => p.map((s, i) => i === idx ? { ...s, [field]: v } : s));
  const removeSharedSlot = (idx: number) =>
    setSharedSlots(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p);

  const addPerDaySlot = (day: string) =>
    setPerDaySlots(p => ({ ...p, [day]: [...(p[day] ?? []), { start: "09:00", end: "19:00" }] }));
  const updatePerDaySlot = (day: string, idx: number, field: "start" | "end", v: string) =>
    setPerDaySlots(p => ({
      ...p,
      [day]: (p[day] ?? []).map((s, i) => i === idx ? { ...s, [field]: v } : s),
    }));
  const removePerDaySlot = (day: string, idx: number) =>
    setPerDaySlots(p => ({
      ...p,
      [day]: (p[day] ?? []).length > 1
        ? (p[day] ?? []).filter((_, i) => i !== idx)
        : (p[day] ?? []),
    }));

  // Human-readable summary of the calling-window configuration. Used in the
  // Step 3 review block.
  const slotsSummary = (() => {
    const fmt = (slots: Array<{ start: string; end: string }>) =>
      slots.map(s => `${s.start}–${s.end}`).join(", ");
    if (slotMode === "same") return fmt(sharedSlots);
    // Per-day: only include active days, list their slot ranges.
    const parts = activeDays
      .map(d => {
        const ranges = fmt(perDaySlots[d] ?? []);
        return ranges ? `${d}: ${ranges}` : null;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "—";
  })();

  // Real CSV ingest — parses each file, validates rows, and stores the full
  // tagged set so the right-side preview can scroll through any row.
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: CsvFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".csv")) continue;
      const text = await file.text();
      next.push(parseAndValidateCsv(file.name, text));
    }
    if (next.length === 0) return;
    setCsvFiles(p => {
      const merged = [...p, ...next];
      // Focus the preview on the first newly added file so the user gets
      // immediate feedback on what they just dropped.
      setActiveFileIdx(p.length);
      return merged;
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeCsv = (idx: number) => setCsvFiles(p => {
    const next = p.filter((_, i) => i !== idx);
    // Keep activeFileIdx in bounds after removal.
    setActiveFileIdx(prev => Math.max(0, Math.min(prev, next.length - 1)));
    return next;
  });

  const updateTestContact = (id: string, field: keyof ManualLead, value: string) =>
    setTestContacts(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));

  const addTestContact = () => {
    if (testContacts.length >= 3) return;
    setTestContacts(p => [...p, { id: `t${Date.now()}`, name: "", phone: "" }]);
  };

  const removeTestContact = (id: string) =>
    setTestContacts(p => p.length > 1 ? p.filter(c => c.id !== id) : p);

  const validTestContacts = testContacts.filter(c => c.phone.trim());

  const sendTestCalls = () => {
    if (validTestContacts.length === 0) return;
    setTestState("sending");
    setTimeout(() => setTestState("sent"), 1600);
  };

  const canAdvance = () => {
    if (step === 1) return name.trim() !== "" && agent !== "";
    if (step === 2) return totalContacts > 0;
    return true;
  };

  const advance = () => { if (step < 3) setStep(s => (s + 1) as Step); };
  const back    = () => { if (step > 1) setStep(s => (s - 1) as Step); };

  /* ════════════════════════════════════════════════════════════════════ */

  return (
    <div className="pb-8">

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => router.push("/outreach")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Outreach › Create</span>
      </div>
      <h1 className="text-page-title text-text-primary mb-4">Create Outreach</h1>

      {/* Step indicator — full width */}
      <div className="flex items-center w-full mb-5">
        {STEPS.map((s, idx) => (
          <div key={s.id} className={`flex items-center ${idx < STEPS.length - 1 ? "flex-1" : ""}`}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-200 ${
                step > s.id  ? "bg-green-600 text-white"
                : step === s.id ? "bg-accent text-white ring-4 ring-accent/20"
                : "bg-surface-secondary text-text-tertiary"
              }`}>
                {step > s.id ? <Check size={12} strokeWidth={3} /> : s.id}
              </div>
              <span className={`text-[13px] font-medium whitespace-nowrap ${
                step === s.id ? "text-text-primary" : "text-text-tertiary"
              }`}>{s.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-4 transition-colors duration-300 ${step > s.id ? "bg-green-600" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* All three steps use the same wide container so we actually fill the
          available area instead of stretching a 720-px ribbon down the page.
          Each step's body then carves that width into the layout it needs:
          two-column form on Step 1, upload + preview on Step 2, condensed
          review grid on Step 3. */}
      <div className="mx-auto max-w-[1200px]">
        <div>
          <AnimatePresence mode="wait">

            {/* ══ STEP 1: Setup ═════════════════════════════════════════
                Two-column layout — Basics + Pace stack on the left, the
                taller Schedule section owns the right. Numbering still reads
                ①→②→③ top-to-bottom-then-right, so the conversational flow
                survives the denser layout. */}
            {step === 1 && (
              <motion.div key="step1" initial="hidden" animate="show" exit="exit" variants={fadeSlide}>
                {/* items-stretch (default for grid, set explicitly for clarity)
                    keeps both card columns at the same height regardless of
                    how much the schedule expands — esp. when the user picks
                    "Customise per day" and adds many slots, which would
                    otherwise tower over the Basics+Retries column. h-full on
                    each inner card carries the stretch into the visible
                    surface so we get two equally-tall white boxes. */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">

                  {/* LEFT COLUMN — ① Basics + ③ Pace */}
                  <div className="bg-white border border-border rounded-card h-full">

                  {/* ① BASICS */}
                  <Section number={1} title="Basics" subtitle="Name your outreach and pick the agent that'll do the calling.">
                    <Field label="Outreach name" required>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Godrej Reflections — Q2 follow-up"
                        className={inputCls}
                      />
                    </Field>

                    <Field label="Description" hint="A short note for your team. Optional.">
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                        placeholder="What's this outreach for? Who are the leads?"
                        className="w-full px-3 py-2.5 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary resize-none"
                      />
                    </Field>

                    <Field label="Voice agent" required>
                      <AgentPicker
                        agents={voiceAgents}
                        value={agent}
                        onChange={setAgent}
                        onCreateNew={() => router.push("/agents-mvp/create")}
                      />
                    </Field>

                    {/* Churn — how many times to redial a lead before we
                        mark it as RnR (Ring no Response). Covers both the
                        couldn't-reach case AND the connected-but-uncertain
                        case. The Info icon spells out the rule so the user
                        knows exactly what the number does. */}
                    <div>
                      <div className="mb-1.5">
                        <div className="inline-flex items-center gap-1.5">
                          <label className="text-[12.5px] font-medium text-text-primary">Max churn</label>
                          <span className="relative inline-flex group">
                            <Info
                              size={12}
                              strokeWidth={1.5}
                              className="text-text-tertiary hover:text-text-secondary cursor-help"
                              aria-label="How churn is applied"
                            />
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 w-[280px] rounded-[8px] bg-text-primary text-white text-[11.5px] leading-snug font-normal px-3 py-2 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <span className="block font-semibold mb-1">How max churn works</span>
                              We&apos;ll dial a lead up to{" "}
                              <span className="font-semibold tabular-nums">{maxRetries || "0"}</span>{" "}
                              time{maxRetries === "1" ? "" : "s"} before marking them as{" "}
                              <span className="font-semibold">RnR</span> (Ring no Response). This applies to:
                              <span className="block mt-1.5">• Leads we couldn&apos;t connect with</span>
                              <span className="block">• Leads we connected with but no qualification status was captured</span>
                            </span>
                          </span>
                        </div>
                        <p className="text-[11px] text-text-tertiary mt-0.5">
                          Number of dial attempts before a lead is marked RnR.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-text-primary">
                        <span>Dial up to</span>
                        <input
                          type="number"
                          value={maxRetries}
                          onChange={e => setMaxRetries(e.target.value)}
                          min={0}
                          max={5}
                          className="h-9 w-14 px-2 text-[13px] tabular-nums text-center border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        <span>time{maxRetries === "1" ? "" : "s"}</span>
                      </div>
                    </div>
                  </Section>
                  </div>

                  {/* RIGHT COLUMN — ② Schedule (taller, owns the full column) */}
                  <div className="bg-white border border-border rounded-card h-full">

                  {/* ② SCHEDULE */}
                  <Section number={2} title="Calling schedule" subtitle="When the agent is allowed to place calls.">
                    {/* When to start */}
                    <Field label="When should it start?">
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="startMode"
                            checked={startMode === "immediately"}
                            onChange={() => setStartMode("immediately")}
                            className="w-3.5 h-3.5 text-accent focus:ring-accent/20 cursor-pointer"
                          />
                          <span className="text-[13px] text-text-primary">Right after I launch it</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="startMode"
                            checked={startMode === "schedule"}
                            onChange={() => setStartMode("schedule")}
                            className="w-3.5 h-3.5 text-accent focus:ring-accent/20 cursor-pointer"
                          />
                          <span className="text-[13px] text-text-primary">Schedule for a future time</span>
                          {startMode === "schedule" && (
                            <span className="flex items-center gap-2 ml-2">
                              <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="h-8 px-2.5 text-[12.5px] border border-border rounded-input"
                              />
                              <input
                                type="time"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                className="w-[110px] h-8 px-2.5 text-[12.5px] border border-border rounded-input"
                              />
                            </span>
                          )}
                        </label>
                      </div>
                    </Field>

                    {/* Days */}
                    <Field label="Which days can the agent call?">
                      <div className="flex items-center gap-1.5">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            title={day}
                            className={`w-10 h-10 text-[11px] font-bold rounded-[8px] transition-colors ${
                              activeDays.includes(day)
                                ? "bg-accent text-white"
                                : "bg-surface-page text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                            }`}
                          >
                            {day[0]}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-text-tertiary mt-2">
                        {activeDays.length === 0
                          ? "No days selected — pick at least one."
                          : `Calling will happen on ${activeDays.join(", ")}.`}
                      </p>
                    </Field>

                    {/* Slots */}
                    <Field label="What time of day?">
                      <div className="flex gap-0.5 bg-surface-secondary rounded-input p-0.5 max-w-xs mb-3">
                        {([
                          { v: "same",   label: "Same every day" },
                          { v: "perDay", label: "Customise per day" },
                        ] as const).map(opt => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setSlotMode(opt.v)}
                            className={`flex-1 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                              slotMode === opt.v
                                ? "bg-white text-text-primary shadow-sm"
                                : "text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {slotMode === "same" ? (
                        <div className="space-y-2">
                          {sharedSlots.map((slot, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={slot.start}
                                onChange={e => updateSharedSlot(idx, "start", e.target.value)}
                                className="h-9 px-2.5 text-[12.5px] border border-border rounded-input"
                              />
                              <span className="text-[12px] text-text-tertiary">to</span>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={e => updateSharedSlot(idx, "end", e.target.value)}
                                className="h-9 px-2.5 text-[12.5px] border border-border rounded-input"
                              />
                              {sharedSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSharedSlot(idx)}
                                  className="ml-1 text-text-tertiary hover:text-text-primary transition-colors"
                                  aria-label="Remove slot"
                                >
                                  <X size={13} strokeWidth={1.5} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addSharedSlot}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
                          >
                            <Plus size={12} strokeWidth={2} /> Add another slot
                          </button>
                        </div>
                      ) : (
                        // Per-day list — 2-column grid with each day's label
                        // sitting ABOVE its time inputs (not beside them).
                        // The previous side-by-side layout made the right
                        // column's label visually adjacent to the left
                        // column's last input, which read as a glitch. With
                        // labels-on-top, each day is a self-contained block
                        // separated by clear whitespace.
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          {DAYS.map(day => {
                            const isActive = activeDays.includes(day);
                            return (
                              <div
                                key={day}
                                className={`min-w-0 ${isActive ? "" : "opacity-40"}`}
                              >
                                <div className="text-[10.5px] font-semibold text-text-secondary uppercase tracking-[0.5px] mb-1.5">
                                  {day}
                                </div>
                                <div className="space-y-1.5">
                                  {(perDaySlots[day] ?? []).map((slot, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 min-w-0">
                                      <input
                                        type="time"
                                        value={slot.start}
                                        onChange={e => updatePerDaySlot(day, idx, "start", e.target.value)}
                                        disabled={!isActive}
                                        className="h-8 px-2 text-[12px] border border-border rounded-input disabled:opacity-50 min-w-0 flex-1"
                                      />
                                      <span className="text-[11.5px] text-text-tertiary shrink-0">to</span>
                                      <input
                                        type="time"
                                        value={slot.end}
                                        onChange={e => updatePerDaySlot(day, idx, "end", e.target.value)}
                                        disabled={!isActive}
                                        className="h-8 px-2 text-[12px] border border-border rounded-input disabled:opacity-50 min-w-0 flex-1"
                                      />
                                      {(perDaySlots[day]?.length ?? 0) > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removePerDaySlot(day, idx)}
                                          disabled={!isActive}
                                          className="shrink-0 ml-0.5 text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
                                          aria-label="Remove slot"
                                        >
                                          <X size={12} strokeWidth={1.5} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {isActive && (
                                    <button
                                      type="button"
                                      onClick={() => addPerDaySlot(day)}
                                      className="text-[11px] font-medium text-accent hover:underline"
                                    >
                                      + Add slot
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Field>
                  </Section>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ STEP 2: Audience ══════════════════════════════════════
                Two-column layout — actions/upload on the left, live preview
                on the right. Mirrors the way Retell.ai lays out batch-call
                setup: you can see what you're about to dial as you build it. */}
            {step === 2 && (
              <motion.div key="step2" initial="hidden" animate="show" exit="exit" variants={fadeSlide}>
                {/* Hidden native file picker — driven by both the drop zone
                    and the "Add more" tile in the file list. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                {/* items-stretch keeps the upload card and the preview card
                    at the same height regardless of how many files were
                    uploaded or how tall the preview table is. h-full on each
                    card ties the stretch into the visible surface. */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] gap-5 items-stretch">

                  {/* ── LEFT: Drop + uploaded files ──────────────────── */}
                  <div className="bg-white border border-border rounded-card overflow-hidden h-full flex flex-col">
                    <div className="px-5 py-4 border-b border-border-subtle">
                      <h2 className="text-[14px] font-semibold text-text-primary">Upload your leads</h2>
                      <p className="text-[12px] text-text-secondary mt-0.5">
                        Drop CSV files with at least <span className="font-medium text-text-primary">Name</span> and{" "}
                        <span className="font-medium text-text-primary">Phone</span> columns. We'll validate every row.
                      </p>
                    </div>

                    <div className="p-5 space-y-4 flex-1">
                      {/* Drop zone — clickable, drag-target. Same UX as the
                          modal on the outreach detail page so the user
                          learns it once. */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-input p-7 text-center cursor-pointer transition-all duration-150 ${
                          isDragging
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-text-tertiary hover:bg-surface-page/60"
                        }`}
                      >
                        <Upload
                          size={22}
                          strokeWidth={1.5}
                          className={`mx-auto mb-2.5 ${isDragging ? "text-accent" : "text-text-tertiary"}`}
                        />
                        <p className="text-[13px] text-text-secondary">
                          {isDragging ? (
                            <span className="text-accent font-medium">Drop your CSV files here</span>
                          ) : (
                            <>Drag & drop CSV files, or <span className="text-accent font-medium">browse</span></>
                          )}
                        </p>
                        <p className="text-[11px] text-text-tertiary mt-1">Multiple files supported · .csv only</p>
                      </div>

                      {/* Sample helper — subtle, single line */}
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="text-text-tertiary">Need a template to start from?</span>
                        <button
                          type="button"
                          onClick={() => downloadTextFile("leads-sample.csv", generateSampleCsv())}
                          className="inline-flex items-center gap-1 text-accent font-medium hover:underline"
                        >
                          <Download size={11} strokeWidth={2} /> Download sample CSV
                        </button>
                      </div>

                      {/* Uploaded files — compact cards. Click a card to make
                          it the active one in the right-side preview. */}
                      {csvFiles.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                            Uploaded files
                          </div>
                          {csvFiles.map((file, idx) => {
                            const invalidTotal = Object.values(file.invalid).reduce((a, b) => a + b, 0);
                            const validPct = file.totalRows > 0 ? (file.validRows / file.totalRows) * 100 : 0;
                            // File tiles are informational only — the preview
                            // on the right is cumulative across every file,
                            // so there's no "active" file to highlight here.
                            return (
                              <div
                                key={idx}
                                className="w-full text-left rounded-[8px] p-3 bg-surface-page border border-transparent"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#F0FDF4] text-[#15803D] shrink-0">
                                    <FileSpreadsheet size={13} strokeWidth={1.75} />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[12.5px] font-medium text-text-primary truncate" title={file.name}>
                                      {file.name}
                                    </div>
                                    <div className="text-[10.5px] text-text-tertiary tabular-nums">
                                      {file.totalRows.toLocaleString()} rows scanned
                                    </div>
                                  </div>
                                  <span
                                    onClick={(e) => { e.stopPropagation(); removeCsv(idx); }}
                                    className="text-text-tertiary hover:text-text-primary transition-colors shrink-0 p-1 cursor-pointer"
                                    role="button"
                                    aria-label="Remove file"
                                  >
                                    <X size={13} strokeWidth={1.5} />
                                  </span>
                                </div>

                                {/* Two compact counters: Success / Failure */}
                                <div className="flex items-center gap-3 text-[11px] tabular-nums">
                                  <span className="inline-flex items-center gap-1 text-[#15803D]">
                                    <CheckCircle2 size={11} strokeWidth={2} />
                                    <span className="font-semibold">{file.validRows.toLocaleString()}</span>
                                    <span className="text-text-tertiary font-normal">valid</span>
                                  </span>
                                  {invalidTotal > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[#DC2626]">
                                      <AlertCircle size={11} strokeWidth={2} />
                                      <span className="font-semibold">{invalidTotal.toLocaleString()}</span>
                                      <span className="text-text-tertiary font-normal">skipped</span>
                                    </span>
                                  ) : (
                                    <span className="text-text-tertiary">No errors</span>
                                  )}
                                </div>

                                {/* Success/failure bar */}
                                <div className="h-1 rounded-full overflow-hidden bg-[#FECACA] mt-2">
                                  <div
                                    className="h-full bg-[#22C55E]"
                                    style={{ width: `${validPct.toFixed(2)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    {/* Footer summary — what's actually queued for dialing.
                        Pulls together both files into one number so the user
                        can compare against the pace estimate from Step 1. */}
                    <div className="px-5 py-3 bg-surface-page border-t border-border-subtle">
                      {totalContacts > 0 ? (
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-text-secondary">Audience size</span>
                          <span className="text-text-primary font-semibold tabular-nums">
                            {totalContacts.toLocaleString()} valid lead{totalContacts !== 1 ? "s" : ""}
                            {totalSkipped > 0 && (
                              <span className="text-text-tertiary font-normal ml-1.5">
                                · {totalSkipped.toLocaleString()} skipped
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
                          <Info size={11} strokeWidth={1.5} />
                          Upload at least one file to continue.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT: Cumulative preview across ALL uploaded files
                      Rows from every file are concatenated into one
                      scrollable table so the user sees their whole audience
                      at a glance, not just one file at a time. Columns are
                      File / Name / Phone / Status — a canonical shape that
                      works no matter what columns each source file used. */}
                  <div className="bg-white border border-border rounded-card overflow-hidden h-full">
                    {csvFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center px-6 py-16 min-h-[420px]">
                        <div className="w-12 h-12 rounded-full bg-surface-page flex items-center justify-center mb-3">
                          <FileSpreadsheet size={20} strokeWidth={1.5} className="text-text-tertiary" />
                        </div>
                        <div className="text-[13px] font-medium text-text-primary">No files uploaded yet</div>
                        <p className="text-[12px] text-text-tertiary mt-1 max-w-[300px]">
                          Drop CSV files on the left. We'll merge them into one preview here with invalid rows highlighted.
                        </p>
                      </div>
                    ) : (() => {
                      // Cumulative roll-up — every row from every uploaded
                      // file, aligned to a single canonical header set so
                      // the table reads like a real spreadsheet of all the
                      // leads regardless of which CSV they came from.
                      const canonicalHeaders = buildCanonicalHeaders(csvFiles);
                      type MergedRow = PreviewRow & { _file: string; _aligned: string[] };
                      const merged: MergedRow[] = csvFiles.flatMap(f =>
                        f.allRows.map(r => ({
                          ...r,
                          _file: f.name,
                          _aligned: alignRowToCanonical(r.cells, f.previewHeaders, canonicalHeaders),
                        }))
                      );
                      const totals = csvFiles.reduce(
                        (acc, f) => {
                          acc.totalRows  += f.totalRows;
                          acc.validRows  += f.validRows;
                          acc.missingPhone   += f.invalid.missingPhone;
                          acc.invalidFormat  += f.invalid.invalidFormat;
                          acc.duplicatePhone += f.invalid.duplicatePhone;
                          acc.missingName    += f.invalid.missingName;
                          return acc;
                        },
                        { totalRows: 0, validRows: 0, missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 }
                      );
                      const invalidTotal = totals.totalRows - totals.validRows;
                      const validPct = totals.totalRows > 0 ? (totals.validRows / totals.totalRows) * 100 : 0;
                      const activeReasons = INVALID_REASONS.filter(r => totals[r.key] > 0);
                      return (
                        <>
                          {/* Preview header — sums across all files */}
                          <div className="px-5 py-4 border-b border-border-subtle">
                            <div className="flex items-center gap-2 mb-1">
                              <FileSpreadsheet size={14} strokeWidth={1.5} className="text-text-secondary shrink-0" />
                              <span className="text-[13px] font-semibold text-text-primary">
                                Combined preview
                              </span>
                              <span className="text-[11px] text-text-tertiary tabular-nums">
                                · {csvFiles.length} file{csvFiles.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="text-[11.5px] text-text-tertiary">
                              All uploaded rows merged. Invalid rows are highlighted — scroll to review.
                            </div>
                          </div>

                          {/* Cumulative stats — Total / Valid / Skipped */}
                          <div className="grid grid-cols-3 gap-2 px-5 pt-4">
                            <div className="bg-surface-page rounded-[6px] px-3 py-2">
                              <div className="text-[9.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Total</div>
                              <div className="text-[18px] font-bold tabular-nums text-text-primary mt-0.5 leading-none">
                                {totals.totalRows.toLocaleString()}
                              </div>
                            </div>
                            <div className="bg-[#F0FDF4] rounded-[6px] px-3 py-2">
                              <div className="text-[9.5px] font-semibold text-[#15803D] uppercase tracking-[0.5px]">Valid</div>
                              <div className="text-[18px] font-bold tabular-nums text-[#15803D] mt-0.5 leading-none">
                                {totals.validRows.toLocaleString()}
                              </div>
                            </div>
                            <div className={`${invalidTotal > 0 ? "bg-[#FEF2F2]" : "bg-surface-page"} rounded-[6px] px-3 py-2`}>
                              <div className={`text-[9.5px] font-semibold uppercase tracking-[0.5px] ${
                                invalidTotal > 0 ? "text-[#DC2626]" : "text-text-tertiary"
                              }`}>Skipped</div>
                              <div className={`text-[18px] font-bold tabular-nums mt-0.5 leading-none ${
                                invalidTotal > 0 ? "text-[#DC2626]" : "text-text-tertiary"
                              }`}>
                                {invalidTotal.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Stacked success/failure bar + reason chips */}
                          <div className="px-5 pt-2.5">
                            <div className="h-1.5 rounded-full overflow-hidden bg-[#FECACA]">
                              <div
                                className="h-full bg-[#22C55E]"
                                style={{ width: `${validPct.toFixed(2)}%` }}
                              />
                            </div>
                            {invalidTotal > 0 && (
                              <div className="text-[11px] text-text-tertiary leading-relaxed mt-2">
                                {activeReasons.map((r, i) => (
                                  <span key={r.key} title={r.hint}>
                                    {r.label}{" "}
                                    <span className="font-medium text-text-secondary tabular-nums">
                                      {totals[r.key]}
                                    </span>
                                    {i < activeReasons.length - 1 && <span className="text-border mx-1.5">·</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Cumulative table — every row from every file
                              shown spreadsheet-style with their actual data
                              columns (Name / Phone / Email / Source / Budget,
                              whatever the CSVs contained), aligned to a
                              single canonical header set. Scrolls vertically
                              through all leads; horizontally if the column
                              set is wide. */}
                          <div className="px-5 pt-4 pb-5">
                            {merged.length > 0 && canonicalHeaders.length > 0 ? (
                              <div className="border border-border-subtle rounded-[8px] overflow-hidden">
                                <div className="max-h-[480px] overflow-auto">
                                  <table className="w-full">
                                    <thead className="sticky top-0 z-10">
                                      <tr className="bg-surface-page border-b border-border-subtle">
                                        {canonicalHeaders.map((h, i) => (
                                          <th
                                            key={i}
                                            className="px-3 py-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap"
                                          >
                                            {h}
                                          </th>
                                        ))}
                                        <th className="px-3 py-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] text-right whitespace-nowrap">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {merged.map((row, i) => {
                                        const isInvalid = row.status !== "valid";
                                        return (
                                          <tr
                                            key={i}
                                            className={`border-b border-border-subtle last:border-0 ${
                                              isInvalid ? "bg-[#FEF2F2]" : ""
                                            }`}
                                            title={`From ${row._file}`}
                                          >
                                            {row._aligned.map((cell, j) => (
                                              <td
                                                key={j}
                                                className={`px-3 py-1.5 text-[11.5px] whitespace-nowrap ${
                                                  isInvalid ? "text-[#991B1B]" : "text-text-secondary"
                                                }`}
                                              >
                                                {cell || <span className="text-text-tertiary italic">empty</span>}
                                              </td>
                                            ))}
                                            <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                              {isInvalid ? (
                                                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FEE2E2] text-[#991B1B]">
                                                  {ROW_STATUS_LABEL[row.status as Exclude<RowStatus, "valid">]}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-text-tertiary">OK</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="px-3 py-1.5 bg-surface-page border-t border-border-subtle text-[10.5px] text-text-tertiary">
                                  Showing{" "}
                                  <span className="text-text-secondary font-medium tabular-nums">
                                    {merged.length.toLocaleString()}
                                  </span>{" "}
                                  leads across{" "}
                                  <span className="text-text-secondary font-medium tabular-nums">
                                    {csvFiles.length}
                                  </span>{" "}
                                  file{csvFiles.length === 1 ? "" : "s"} — scroll to see all
                                </div>
                              </div>
                            ) : (
                              <div className="text-[12px] text-text-tertiary text-center py-6">
                                No parseable rows in the uploaded file{csvFiles.length === 1 ? "" : "s"}.
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ STEP 3: Review & Launch ═══════════════════════════════
                The whole review fits on one screen now — review card across
                the top (4-up grid), then test panel + ready banner side by
                side underneath so the eye doesn't have to travel down a
                tall column of stacked cards. */}
            {step === 3 && (
              <motion.div key="step3" initial="hidden" animate="show" exit="exit" variants={fadeSlide} className="space-y-4">

                {/* Review Configuration — dense 4-col grid */}
                <div className="bg-white border border-border rounded-card p-5">
                  <h2 className="text-[14px] font-semibold text-text-primary mb-3.5">Review configuration</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {[
                      { label: "Outreach name", value: name || "—", icon: PhoneCall },
                      { label: "Voice agent",   value: selectedAgent?.name ?? "—", icon: Bot },
                      { label: "Description",   value: description || "—",                       icon: BarChart2 },
                      { label: "Contacts",      value: `${totalContacts.toLocaleString()} leads`, icon: Users },
                      { label: "Start",         value: startMode === "immediately" ? "On launch" : startDate ? `${startDate} ${startTime}` : "—", icon: Calendar },
                      { label: "Calling hours", value: slotsSummary,                              icon: Clock },
                      { label: "Active days",   value: activeDays.length > 0 ? activeDays.join(", ") : "None", icon: Calendar },
                      { label: "Max churn",     value: `Up to ${maxRetries} dial${maxRetries === "1" ? "" : "s"} before RnR`, icon: Phone },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-surface-page rounded-[8px] px-3 py-2.5 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon size={11} strokeWidth={1.5} className="text-text-tertiary" />
                          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider truncate">{label}</span>
                        </div>
                        <div className="text-[12.5px] font-medium text-text-primary truncate" title={String(value)}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom row: Test panel (wider) + Ready-to-launch banner */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-4 items-start">

                  {/* Test before launching — optional */}
                  <div className="bg-white border border-border rounded-card p-5">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <FlaskConical size={15} strokeWidth={1.5} className="text-text-secondary" />
                        <h2 className="text-[14px] font-semibold text-text-primary">Test before launching</h2>
                      </div>
                      <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-2 py-0.5 rounded-badge bg-surface-secondary">
                        Optional
                      </span>
                    </div>
                    <p className="text-[12px] text-text-tertiary mb-3.5">
                      Send a test call to up to 3 numbers to validate the agent's script and flow. Or skip this and go straight to launch.
                    </p>

                    {testState === "sent" ? (
                      // After a test is sent, keep this panel terse — the
                      // "Ready to launch" banner on the right already covers
                      // the next action ("launch when ready"). Repeating it
                      // here was making the screen feel like it shouted the
                      // same line twice.
                      <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-[8px]">
                        <CheckCircle2 size={16} strokeWidth={1.5} className="text-green-600 shrink-0" />
                        <div className="flex-1">
                          <div className="text-[12.5px] font-semibold text-green-800">
                            Test call{validTestContacts.length !== 1 ? "s" : ""} sent to {validTestContacts.length} contact{validTestContacts.length !== 1 ? "s" : ""}
                          </div>
                          <div className="text-[11.5px] text-green-700 mt-0.5">
                            Recordings will appear here once the call completes.
                          </div>
                        </div>
                        <button
                          onClick={() => { setTestState("idle"); }}
                          className="text-[11.5px] font-medium text-green-700 hover:text-green-800 underline-offset-2 hover:underline"
                        >
                          Test again
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {testContacts.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={c.name}
                                onChange={e => updateTestContact(c.id, "name", e.target.value)}
                                placeholder="Name (optional)"
                                className="flex-1 h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                              />
                              <input
                                type="tel"
                                value={c.phone}
                                onChange={e => updateTestContact(c.id, "phone", e.target.value)}
                                placeholder="+91 98765 43210"
                                className="flex-1 h-9 px-3 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                              />
                              {testContacts.length > 1 ? (
                                <button
                                  onClick={() => removeTestContact(c.id)}
                                  title="Remove"
                                  className="h-9 w-9 inline-flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-page rounded-input transition-colors"
                                >
                                  <X size={14} strokeWidth={1.5} />
                                </button>
                              ) : (
                                <div className="h-9 w-9 shrink-0" aria-hidden />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <button
                            onClick={addTestContact}
                            disabled={testContacts.length >= 3}
                            className="inline-flex items-center gap-1 h-8 px-2 text-[12px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus size={13} strokeWidth={2} />
                            Add contact {testContacts.length >= 3 && "(max 3)"}
                          </button>
                          <button
                            onClick={sendTestCalls}
                            disabled={validTestContacts.length === 0 || testState === "sending"}
                            className="inline-flex items-center gap-1.5 h-9 px-4 text-[12.5px] font-medium border border-border bg-white text-text-primary rounded-button hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {testState === "sending" ? (
                              <><Loader2 size={13} strokeWidth={2} className="animate-spin" /> Sending…</>
                            ) : (
                              <><Phone size={13} strokeWidth={1.5} /> Send test call{validTestContacts.length > 1 ? "s" : ""}</>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Ready-to-launch — compact callout on the right rail */}
                  <div className="bg-green-50 border border-green-200 rounded-card p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle2 size={16} strokeWidth={1.5} className="text-green-600 shrink-0" />
                      <div className="text-[13px] font-semibold text-green-800">Ready to launch</div>
                    </div>
                    <p className="text-[11.5px] text-green-700 leading-relaxed">
                      {testState === "sent"
                        ? "Test calls placed. Launch when you're happy with the agent's performance."
                        : "Click Launch to start your outreach — testing is optional and can be done after launch too."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-5">
            <div>
              {step > 1 ? (
                <button onClick={back}
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors">
                  <ArrowLeft size={14} strokeWidth={1.5} /> Back
                </button>
              ) : (
                <button className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors">
                  <Save size={14} strokeWidth={1.5} /> Save as Draft
                </button>
              )}
            </div>
            {step < 3 ? (
              <button onClick={advance} disabled={!canAdvance()}
                className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next <ArrowRight size={15} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                onClick={() => {
                  // Build a representative new outreach entry from the form
                  // state and stash it for the listing page to consume. The
                  // listing shows it at the top with a success banner so the
                  // user immediately sees their outreach exists.
                  const launched = {
                    id: `out-new-${Date.now()}`,
                    name: name.trim() || "Untitled outreach",
                    voiceAgent: selectedAgent?.name ?? "—",
                    totalContacts,
                    status: startMode === "schedule" ? "scheduled" : "in_progress",
                    createdAt: new Date().toISOString().slice(0, 10),
                    description,
                    startMode,
                    startDate,
                    startTime,
                  };
                  try {
                    sessionStorage.setItem("outreach_just_launched", JSON.stringify(launched));
                  } catch {
                    // storage may be unavailable in some sandboxed contexts —
                    // navigate anyway, the listing just won't show the banner
                  }
                  // First-time launch — drop the user out of the "empty"
                  // demo-mode so the listing actually shows their outreaches.
                  if (isEmpty) setMode("populated");
                  router.push("/outreach");
                }}
                className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
              >
                <Rocket size={15} strokeWidth={1.5} /> Launch Outreach
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function CreateOutreachPage() {
  return (
    <Suspense
      fallback={
        <div className="pb-8">
          <div className="h-8 mb-6" />
          <div className="h-10 w-48 bg-surface-page rounded mb-6 animate-pulse" />
          <div className="bg-white border border-border rounded-card h-[420px] animate-pulse" />
        </div>
      }
    >
      <CreateOutreachInner />
    </Suspense>
  );
}
```

---

## 3. `src/app/(app)/outreach/[id]/page.tsx`

```tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  UserPlus,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Filter as FilterIcon,
  Info,
  Pause,
  Play,
  Database,
  Download,
  Clock,
  IndianRupee,
} from "lucide-react";
import { format } from "date-fns";
import {
  outreachDetail,
  outreachContacts,
} from "@/lib/outreach-data";
import type { ContactOutcome, LeadType, LeadTemperature, AIQualStatus, OutreachContact } from "@/lib/outreach-data";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";

// Avatar palette matched to /enquiries — same eight colours so contacts in
// the outreach detail get the same look as leads in the Leads page.
const avatarColors = ["#F87171", "#FB923C", "#FBBF24", "#34D399", "#60A5FA", "#A78BFA", "#F472B6", "#6EE7B7"];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

function OutcomeBadge({ outcome }: { outcome: ContactOutcome }) {
  const config: Record<ContactOutcome, { label: string; cls: string }> = {
    qualified:     { label: "Qualified",     cls: "bg-[#F0FDF4] text-[#15803D]" },
    not_qualified: { label: "Not Qualified", cls: "bg-[#FEF2F2] text-[#DC2626]" },
    callback:      { label: "Callback",      cls: "bg-[#FEF3C7] text-[#92400E]" },
    no_answer:     { label: "No Answer",     cls: "bg-surface-secondary text-text-secondary" },
    not_called:    { label: "Not Called",    cls: "bg-surface-secondary text-text-tertiary" },
    busy:          { label: "Busy",          cls: "bg-[#FEF3C7] text-[#92400E]" },
    wrong_number:  { label: "Wrong #",       cls: "bg-[#FEF2F2] text-[#DC2626]" },
  };
  const { label, cls } = config[outcome];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

// ── Outreach status control: prominent pill + change-status dropdown ──────────

const STATUS_CONFIG = {
  running:   { label: "Running",   dot: "#22C55E", cls: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]" },
  paused:    { label: "Paused",    dot: "#F5A623", cls: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" },
  completed: { label: "Completed", dot: "#3B82F6", cls: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  draft:     { label: "Draft",     dot: "#9CA3AF", cls: "bg-surface-secondary text-text-secondary border-border" },
} as const;

// Inline status badge — read-only pill that sits next to the campaign name.
// Status changes happen via the separate Pause/Resume action button on the
// right of the header, so this badge no longer carries a dropdown affordance
// (no chevron, no menu, no click). It's purely informational.
function InlineStatusBadge({
  status,
}: {
  status: keyof typeof STATUS_CONFIG;
}) {
  const current = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-full border ${current.cls}`}
      aria-label={`Status: ${current.label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.dot }} />
      {current.label}
    </span>
  );
}

// Major action button — solid fill, contextual to the campaign state. Reads
// as the primary thing you'd do right now: pause when running, resume when
// paused, launch when draft, reactivate when completed.
function StatusActionButton({
  status,
  onChange,
}: {
  status: keyof typeof STATUS_CONFIG;
  onChange: (s: keyof typeof STATUS_CONFIG) => void;
}) {
  const ACTION: Record<keyof typeof STATUS_CONFIG, {
    label: string; next: keyof typeof STATUS_CONFIG; icon: typeof Pause; bg: string; bgHover: string;
  }> = {
    running:   { label: "Pause",      next: "paused",    icon: Pause, bg: "#D97706", bgHover: "#B45309" },
    paused:    { label: "Resume",     next: "running",   icon: Play,  bg: "#16A34A", bgHover: "#15803D" },
    completed: { label: "Reactivate", next: "running",   icon: Play,  bg: "#1F2937", bgHover: "#111827" },
    draft:     { label: "Launch",     next: "running",   icon: Play,  bg: "#4F46E5", bgHover: "#4338CA" },
  };
  const a = ACTION[status];
  const Icon = a.icon;
  return (
    <button
      onClick={() => onChange(a.next)}
      className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-button text-white transition-colors shadow-sm"
      style={{ backgroundColor: a.bg }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = a.bgHover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = a.bg)}
    >
      <Icon size={14} strokeWidth={2} fill="currentColor" />
      {a.label}
    </button>
  );
}

// ── Modern contact row ─────────────────────────────────────────────────────

// Deterministic per-name avatar colour so the same lead always gets the same chip.
function avatarColor(name: string): string {
  const palette = ["#4F46E5", "#7C3AED", "#22C55E", "#0EA5E9", "#F59E0B", "#EC4899", "#14B8A6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 2147483647;
  return palette[hash % palette.length];
}

function ContactRow({ c }: { c: OutreachContact }) {
  const initials = c.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="px-5 py-3.5 grid grid-cols-[1fr_auto_1fr_auto_auto] gap-5 items-center hover:bg-surface-page/40 transition-colors duration-150">
      {/* Lead — avatar + name + phone */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11.5px] font-semibold text-white shrink-0"
          style={{ backgroundColor: avatarColor(c.name) }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-text-primary truncate">{c.name}</div>
          <div className="text-[11.5px] text-text-tertiary tabular-nums">{c.phone}</div>
        </div>
      </div>

      {/* AI qualification pill */}
      <div className="shrink-0">
        <QualStatusBadge status={c.qualStatus} />
      </div>

      {/* Next action + time */}
      <div className="min-w-0">
        {c.nextAction ? (
          <>
            <div className="text-[12.5px] font-medium text-text-primary truncate flex items-center gap-1.5">
              <ArrowRight size={11} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
              {c.nextAction}
            </div>
            {c.nextActionAt && (
              <div className="text-[11px] text-text-tertiary tabular-nums mt-0.5">
                {format(new Date(c.nextActionAt), "dd MMM · HH:mm")}
              </div>
            )}
          </>
        ) : (
          <span className="text-[12px] text-text-tertiary">No follow-up</span>
        )}
      </div>

      {/* Duration */}
      <div className="text-right shrink-0">
        <div className="text-[12px] text-text-tertiary uppercase tracking-[0.4px]">Duration</div>
        <div className="text-[13px] font-semibold text-text-primary tabular-nums mt-0.5">
          {c.duration !== null ? `${c.duration} min` : "—"}
        </div>
      </div>

      {/* Created / Updated */}
      <div className="text-right shrink-0 text-[11.5px] tabular-nums">
        <div className="text-text-tertiary">
          Created <span className="text-text-secondary font-medium">{format(new Date(c.createdAt), "dd MMM")}</span>
        </div>
        <div className="text-text-tertiary mt-0.5">
          Updated <span className="text-text-secondary font-medium">{format(new Date(c.updatedAt), "dd MMM")}</span>
        </div>
      </div>
    </div>
  );
}

// ── Source filter — page-level multi-select scoping all widgets ─────────────

function SourceFilter({
  sources,
  selected,
  allSelected,
  menuOpen,
  setMenuOpen,
  onToggle,
  onSetAll,
}: {
  sources: { id: string; name: string; leads: number; uploadedAt: string }[];
  selected: string[];
  allSelected: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  onToggle: (id: string) => void;
  onSetAll: (all: boolean) => void;
}) {
  const label = allSelected
    ? `All files · ${sources.length}`
    : selected.length === 0
      ? "No files"
      : `${selected.length} of ${sources.length} files`;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className={`inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-medium rounded-button border transition-colors ${
          allSelected
            ? "border-border bg-white text-text-secondary hover:bg-surface-page"
            : "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
        }`}
      >
        <Database size={13} strokeWidth={1.5} />
        {label}
        <ChevronDown size={13} strokeWidth={1.5} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1.5 w-[300px] bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
              <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Uploaded lead files</span>
              <button
                onClick={() => onSetAll(!allSelected)}
                className="text-[11.5px] font-medium text-accent hover:underline"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto py-1">
              {sources.map(s => {
                const checked = selected.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-page cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(s.id)}
                      className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
                    />
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#F0FDF4] text-[#15803D] shrink-0">
                      <FileSpreadsheet size={12} strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-text-primary truncate" title={s.name}>{s.name}</div>
                      <div className="text-[10.5px] text-text-tertiary tabular-nums flex items-center gap-1">
                        <span>Uploaded {format(new Date(s.uploadedAt), "dd MMM yyyy")}</span>
                        <span className="text-border">·</span>
                        <span>{s.leads.toLocaleString()} leads</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-border-subtle text-[10.5px] text-text-tertiary tabular-nums">
              Selected: <span className="text-text-secondary font-medium">{selected.reduce((sum, id) => sum + (sources.find(s => s.id === id)?.leads ?? 0), 0).toLocaleString()}</span> leads
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QualStatusBadge({ status }: { status: AIQualStatus }) {
  if (status === null) {
    return <span className="text-[11px] text-text-tertiary">—</span>;
  }
  const config: Record<NonNullable<AIQualStatus>, { label: string; cls: string }> = {
    qualified:         { label: "Qualified",         cls: "bg-[#F0FDF4] text-[#15803D]" },
    disqualified:      { label: "Disqualified",      cls: "bg-[#FEF2F2] text-[#DC2626]" },
    intent_qualified:  { label: "Intent Qualified",  cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
    customer_followup: { label: "Customer Follow up", cls: "bg-[#FEF3C7] text-[#92400E]" },
    rnr:               { label: "RnR",               cls: "bg-surface-secondary text-text-secondary" },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

// ── Add Leads Modal ────────────────────────────────────────────────────────────

interface ManualLead {
  id: string;
  name: string;
  phone: string;
}

interface CsvInvalidBreakdown {
  missingPhone: number;
  invalidFormat: number;
  duplicatePhone: number;
  missingName: number;
}

type RowStatus = "valid" | "missingName" | "missingPhone" | "invalidFormat" | "duplicate";

interface PreviewRow {
  cells: string[];
  status: RowStatus;
}

interface CsvFile {
  name: string;
  totalRows: number;
  validRows: number;
  invalid: CsvInvalidBreakdown;
  previewHeaders: string[];
  previewRows: PreviewRow[];
}

const INVALID_REASONS: Array<{ key: keyof CsvInvalidBreakdown; label: string; hint: string }> = [
  { key: "missingPhone",   label: "Missing phone",   hint: "Row has no value in the phone column" },
  { key: "invalidFormat",  label: "Invalid format",  hint: "Couldn't parse as a 10-digit number" },
  { key: "duplicatePhone", label: "Duplicate",       hint: "Already exists in this file" },
  { key: "missingName",    label: "Missing name",    hint: "Row has no value in the name column" },
];

// Short labels for the per-row status pill shown in the preview.
const ROW_STATUS_LABEL: Record<Exclude<RowStatus, "valid">, string> = {
  missingName:   "Missing name",
  missingPhone:  "Missing phone",
  invalidFormat: "Invalid format",
  duplicate:     "Duplicate",
};

// Minimal CSV row splitter — supports double-quoted fields with embedded
// commas. Doesn't try to be a full RFC 4180 parser; sufficient for typical
// exports from spreadsheets.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

// Parse and validate a CSV file's text content. Auto-detects which columns
// hold the name and phone by common header names.
function parseAndValidateCsv(name: string, text: string): CsvFile {
  const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (allLines.length === 0) {
    return {
      name,
      totalRows: 0,
      validRows: 0,
      invalid: { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 },
      previewHeaders: [],
      previewRows: [],
    };
  }

  const headerCells = splitCsvLine(allLines[0]);
  const headerLower = headerCells.map(h => h.toLowerCase());
  const phoneIdx = headerLower.findIndex(h => /phone|mobile|whatsapp|^number$/.test(h));
  const nameIdx  = headerLower.findIndex(h => /^name$|^full\s*name$|^lead\s*name$|first\s*name|^contact$/.test(h));

  const dataLines = allLines.slice(1);
  const seen = new Set<string>();

  // Tag every row with its status while we scan, so the preview can highlight
  // exactly the rows the user lost — without re-running validation per row.
  const taggedAll: PreviewRow[] = dataLines.map((line) => {
    const cols = splitCsvLine(line);
    const phoneRaw = phoneIdx >= 0 ? (cols[phoneIdx] ?? "") : "";
    const nameRaw  = nameIdx  >= 0 ? (cols[nameIdx]  ?? "") : "";

    if (!nameRaw.trim())  return { cells: cols, status: "missingName" };
    if (!phoneRaw.trim()) return { cells: cols, status: "missingPhone" };

    const digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 12) return { cells: cols, status: "invalidFormat" };

    if (seen.has(digits)) return { cells: cols, status: "duplicate" };
    seen.add(digits);
    return { cells: cols, status: "valid" };
  });

  // Roll up counts from the tagged set.
  let missingPhone = 0, invalidFormat = 0, duplicatePhone = 0, missingName = 0, valid = 0;
  for (const r of taggedAll) {
    if (r.status === "valid")         valid++;
    else if (r.status === "missingPhone")  missingPhone++;
    else if (r.status === "invalidFormat") invalidFormat++;
    else if (r.status === "duplicate")     duplicatePhone++;
    else if (r.status === "missingName")   missingName++;
  }

  // Preview = the first 10 rows, biased to include any failures so the user
  // actually sees them (otherwise a clean run shows the first 10 valid rows).
  const failedRows = taggedAll.filter(r => r.status !== "valid").slice(0, 5);
  const validRows  = taggedAll.filter(r => r.status === "valid").slice(0, 5);
  const previewRows = [...failedRows, ...validRows].slice(0, 10);

  return {
    name,
    totalRows: dataLines.length,
    validRows: valid,
    invalid: { missingPhone, invalidFormat, duplicatePhone, missingName },
    previewHeaders: headerCells,
    previewRows,
  };
}

// Sample CSV — small, valid, includes one row of each common variation so it
// also serves as a quick template the user can build on.
function generateSampleCsv(): string {
  return [
    "Name,Phone,Email,Source,Budget",
    "Ramesh Kumar,9876543210,ramesh@gmail.com,Meta Lead,1.5Cr",
    "Sunita Patel,9012345678,sunita@yahoo.com,Website,2Cr",
    "Vikram Singh,8765432109,vikram@outlook.com,Meta Lead,80L",
    "Ananya Rao,9123456780,ananya@gmail.com,Referral,1.8Cr",
    "Deepak Menon,8012345679,deepak@gmail.com,Meta Lead,1.2Cr",
  ].join("\n");
}

// CSV-safe quoting — wraps in double quotes only if the cell contains a
// character that would break the parse (comma, quote, newline). Embedded
// quotes get doubled up per RFC 4180.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Build a CSV string from a list of contacts. The column set mirrors what
// the user sees in the table plus a few useful machine-readable fields
// (outcome, lead type, temperature, sent_to_crm) so the export is useful
// for downstream CRM imports too. Empty cells are left empty so importers
// can distinguish "not yet" from "explicit no".
function buildContactsCsv(rows: OutreachContact[]): string {
  const headers = [
    "Name", "Phone",
    "Outcome", "AI Qualification", "Lead Type", "Temperature",
    "Next Action", "Next Action At",
    "Duration (min)", "Called At",
    "Verified", "Sent to CRM",
    "Key Notes",
    "Created At", "Updated At",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push([
      c.name, c.phone,
      c.outcome, c.qualStatus ?? "", c.leadType, c.temperature,
      c.nextAction ?? "", c.nextActionAt ?? "",
      c.duration ?? "", c.calledAt ?? "",
      c.verified ? "yes" : "no", c.sentToCrm ? "yes" : "no",
      c.keyNotes,
      c.createdAt, c.updatedAt,
    ].map(csvCell).join(","));
  }
  return lines.join("\n");
}

function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AddLeadsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"csv" | "manual">("csv");
  const [csvFiles, setCsvFiles] = useState<CsvFile[]>([]);
  const [manualLeads, setManualLeads] = useState<ManualLead[]>([
    { id: "1", name: "", phone: "" },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  // Which files have their preview expanded. Default: collapsed (preview off).
  const [previewOpen, setPreviewOpen] = useState<Set<number>>(new Set());
  const togglePreview = (idx: number) =>
    setPreviewOpen(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: CsvFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".csv")) continue;
      const text = await file.text();
      next.push(parseAndValidateCsv(file.name, text));
    }
    if (next.length > 0) setCsvFiles(p => [...p, ...next]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeCsv = (idx: number) => setCsvFiles((p) => p.filter((_, i) => i !== idx));

  const updateManual = (id: string, field: keyof ManualLead, value: string) =>
    setManualLeads((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const addRow = () =>
    setManualLeads((p) => [...p, { id: String(Date.now()), name: "", phone: "" }]);

  const removeRow = (id: string) =>
    setManualLeads((p) => p.filter((l) => l.id !== id));

  const totalValid = csvFiles.reduce((s, f) => s + f.validRows, 0);
  const totalInvalid = csvFiles.reduce(
    (s, f) => s + Object.values(f.invalid).reduce((a, b) => a + b, 0),
    0
  );
  const totalNew = totalValid + manualLeads.filter((l) => l.phone.trim()).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-xl w-[820px] max-w-[96vw] max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-text-primary">Add Leads</div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              Add more contacts to this running outreach
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-border px-5 flex-shrink-0">
          {(["csv", "manual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 ${
                tab === t
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t === "csv" ? "Upload CSV" : "Add Manually"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* CSV tab */}
          {tab === "csv" && (
            <div className="space-y-4">
              {/* Hidden native file picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  // Reset so the same file can be re-selected later
                  e.target.value = "";
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-input p-8 text-center cursor-pointer transition-all duration-150 ${
                  isDragging
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-text-tertiary hover:bg-surface-page/50"
                }`}
              >
                <Upload size={22} strokeWidth={1.5} className={`mx-auto mb-2.5 ${isDragging ? "text-accent" : "text-text-tertiary"}`} />
                <p className="text-[13px] text-text-secondary">
                  {isDragging ? (
                    <span className="text-accent font-medium">Drop your CSV files here</span>
                  ) : (
                    <>Drag & drop CSV files, or <span className="text-accent font-medium">browse</span></>
                  )}
                </p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Multiple CSV files supported · .csv only
                </p>
              </div>

              {/* Sample download — subtle helper link */}
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-text-tertiary">
                  Need a template? Your CSV should have columns: <span className="text-text-secondary font-medium">Name, Phone</span>{" "}
                  (Email, Source, Budget optional).
                </span>
                <button
                  onClick={() => downloadTextFile("leads-sample.csv", generateSampleCsv())}
                  className="inline-flex items-center gap-1 text-accent font-medium hover:underline shrink-0"
                >
                  <Download size={11} strokeWidth={2} />
                  Download sample CSV
                </button>
              </div>

              {csvFiles.length > 0 ? (
                <div className="space-y-3">
                  {csvFiles.map((file, idx) => {
                    const invalidTotal = Object.values(file.invalid).reduce((a, b) => a + b, 0);
                    const validPct = file.totalRows > 0 ? (file.validRows / file.totalRows) * 100 : 0;
                    const activeReasons = INVALID_REASONS.filter(r => file.invalid[r.key] > 0);
                    return (
                      <div key={idx} className="bg-surface-page rounded-[8px] p-3.5">
                        {/* Filename + remove */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet size={15} strokeWidth={1.5} className="text-text-secondary shrink-0" />
                            <span className="text-[13px] text-text-primary font-medium truncate">{file.name}</span>
                          </div>
                          <button onClick={() => removeCsv(idx)} className="text-text-tertiary hover:text-text-primary transition-colors shrink-0">
                            <X size={13} strokeWidth={1.5} />
                          </button>
                        </div>

                        {/* Headline counts — Total / Success / Failure */}
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <div className="bg-white rounded-[6px] px-3 py-2">
                            <div className="text-[9.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Total</div>
                            <div className="text-[16px] font-bold tabular-nums text-text-primary mt-0.5 leading-none">
                              {file.totalRows.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-[#F0FDF4] rounded-[6px] px-3 py-2">
                            <div className="text-[9.5px] font-semibold text-[#15803D] uppercase tracking-[0.5px]">Success</div>
                            <div className="text-[16px] font-bold tabular-nums text-[#15803D] mt-0.5 leading-none">
                              {file.validRows.toLocaleString()}
                            </div>
                          </div>
                          <div className={`${invalidTotal > 0 ? "bg-[#FEF2F2]" : "bg-white"} rounded-[6px] px-3 py-2`}>
                            <div className={`text-[9.5px] font-semibold uppercase tracking-[0.5px] ${
                              invalidTotal > 0 ? "text-[#DC2626]" : "text-text-tertiary"
                            }`}>Failure</div>
                            <div className={`text-[16px] font-bold tabular-nums mt-0.5 leading-none ${
                              invalidTotal > 0 ? "text-[#DC2626]" : "text-text-tertiary"
                            }`}>
                              {invalidTotal.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Single stacked bar — success (green) vs failure (red) */}
                        <div className="h-1.5 rounded-full overflow-hidden bg-[#FECACA] mb-2">
                          <div
                            className="h-full bg-[#22C55E]"
                            style={{ width: `${validPct.toFixed(2)}%` }}
                          />
                        </div>

                        {/* Reasons — single muted line, comma-style */}
                        {invalidTotal > 0 && (
                          <div className="text-[11px] text-text-tertiary leading-relaxed">
                            {activeReasons.map((r, i) => (
                              <span key={r.key} title={r.hint}>
                                {r.label}{" "}
                                <span className="font-medium text-text-secondary tabular-nums">
                                  {file.invalid[r.key]}
                                </span>
                                {i < activeReasons.length - 1 && <span className="text-border mx-1.5">·</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Preview toggle + collapsible preview (failed rows highlighted) */}
                        {file.previewHeaders.length > 0 && file.previewRows.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border-subtle">
                            <button
                              onClick={() => togglePreview(idx)}
                              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                            >
                              <ChevronDown
                                size={12}
                                strokeWidth={2}
                                className={`transition-transform ${previewOpen.has(idx) ? "rotate-180" : ""}`}
                              />
                              {previewOpen.has(idx) ? "Hide preview" : "Show preview"}
                              <span className="text-text-tertiary ml-1">
                                · {Math.min(file.previewRows.length, 10)} of {file.totalRows.toLocaleString()} rows
                              </span>
                            </button>

                            {previewOpen.has(idx) && (
                              <div className="mt-2.5 border border-border-subtle rounded-[6px] overflow-hidden bg-white">
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="bg-surface-page border-b border-border-subtle">
                                        {file.previewHeaders.map((h, i) => (
                                          <th key={i} className="px-3 py-1.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">
                                            {h}
                                          </th>
                                        ))}
                                        <th className="px-3 py-1.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right whitespace-nowrap">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {file.previewRows.map((row, i) => {
                                        const isInvalid = row.status !== "valid";
                                        return (
                                          <tr
                                            key={i}
                                            className={`border-b border-border-subtle last:border-0 ${
                                              isInvalid ? "bg-[#FEF2F2]" : ""
                                            }`}
                                          >
                                            {row.cells.map((cell, j) => (
                                              <td
                                                key={j}
                                                className={`px-3 py-1.5 text-[11px] whitespace-nowrap ${
                                                  isInvalid ? "text-[#991B1B]" : "text-text-secondary"
                                                }`}
                                              >
                                                {cell || <span className="text-text-tertiary italic">empty</span>}
                                              </td>
                                            ))}
                                            <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                              {isInvalid ? (
                                                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FEE2E2] text-[#991B1B]">
                                                  {ROW_STATUS_LABEL[row.status as Exclude<RowStatus, "valid">]}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-text-tertiary">OK</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-text-tertiary text-center py-1">No files uploaded yet</p>
              )}
            </div>
          )}

          {/* Manual tab */}
          {tab === "manual" && (
            <div className="space-y-3">
              <p className="text-[12px] text-text-secondary">
                Add leads directly with their name and phone number.
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 px-1">
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Name</span>
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Phone</span>
                  <span />
                </div>
                {manualLeads.map((lead) => (
                  <div key={lead.id} className="grid grid-cols-[1fr_1fr_32px] gap-2">
                    <input
                      type="text"
                      value={lead.name}
                      onChange={(e) => updateManual(lead.id, "name", e.target.value)}
                      placeholder="Full name"
                      className="h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                    />
                    <input
                      type="tel"
                      value={lead.phone}
                      onChange={(e) => updateManual(lead.id, "phone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className="h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                    />
                    <button
                      onClick={() => removeRow(lead.id)}
                      disabled={manualLeads.length === 1}
                      className="h-9 w-8 flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addRow} className="inline-flex items-center gap-1.5 text-[12.5px] text-accent font-medium hover:underline">
                <Plus size={13} strokeWidth={2.5} />
                Add row
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border flex-shrink-0">
          <span className="text-[12px] text-text-secondary">
            {totalNew > 0 ? (
              <>
                <span className="font-medium text-text-primary">{totalNew.toLocaleString()} lead{totalNew !== 1 ? "s" : ""}</span>{" "}
                ready to add
                {totalInvalid > 0 && (
                  <span className="text-text-tertiary">
                    {" "}· <span className="text-[#DC2626]">{totalInvalid} skipped</span>
                  </span>
                )}
              </>
            ) : (
              "No leads added yet"
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={totalNew === 0}
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-white bg-accent rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add {totalNew > 0 ? `${totalNew} Lead${totalNew !== 1 ? "s" : ""}` : "Leads"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Filter tabs config ────────────────────────────────────────────────────────

type FilterTab = "all" | "yet_to_dial" | "qualified" | "follow_up" | "disqualified";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "yet_to_dial",  label: "Yet to dial" },
  { id: "qualified",    label: "Qualified" },
  { id: "follow_up",    label: "Follow-up" },
  { id: "disqualified", label: "Disqualified" },
];

// How each tab maps to the contact data — qualStatus is the primary signal,
// outcome covers contacts that haven't reached qualification yet.
function matchesTab(c: { outcome: ContactOutcome; qualStatus: AIQualStatus }, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "yet_to_dial")  return c.outcome === "not_called";
  if (tab === "qualified")    return c.qualStatus === "qualified";
  if (tab === "follow_up")    return (
    c.qualStatus === "customer_followup" ||
    c.qualStatus === "rnr" ||
    c.qualStatus === "intent_qualified" ||
    c.outcome === "callback"
  );
  if (tab === "disqualified") return c.qualStatus === "disqualified" || c.outcome === "wrong_number";
  return true;
}

const PAGE_SIZE = 8;

const LEAD_TYPE_OPTS: { id: LeadType; label: string }[] = [
  { id: "standard",     label: "Standard" },
  { id: "verified",     label: "Verified" },
  { id: "ai_qualified", label: "AI Qualified" },
];

const TEMPERATURE_OPTS: { id: LeadTemperature; label: string }[] = [
  { id: "hot",      label: "Hot" },
  { id: "warm",     label: "Warm" },
  { id: "lukewarm", label: "Lukewarm" },
  { id: "cold",     label: "Cold" },
];

const QUAL_STATUS_OPTS: { id: NonNullable<AIQualStatus>; label: string }[] = [
  { id: "qualified",         label: "Qualified" },
  { id: "disqualified",      label: "Disqualified" },
  { id: "intent_qualified",  label: "Intent Qualified" },
  { id: "customer_followup", label: "Customer Follow up" },
  { id: "rnr",               label: "RnR" },
];

const SENT_TO_CRM_OPTS: { id: "yes" | "no"; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "no",  label: "No" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

type OutreachStatus = "running" | "paused" | "completed" | "draft";

export default function OutreachDetailPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus>("running");
  // Time range — same selector used on the outreach listing. Defaults to
  // "Last 7 days" so the analytics view opens on the most actionable window
  // out of the box.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [rangePreset, setRangePreset] = useState<string>("7");
  const [addLeadsOpen, setAddLeadsOpen] = useState(false);

  // Page-level source filter — scopes every widget + the table to the
  // selected CSVs. Default: all sources selected.
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(() =>
    outreachDetail.sources.map(s => s.id)
  );
  const toggleSource = (id: string) =>
    setSelectedSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const setAllSources = (all: boolean) =>
    setSelectedSources(all ? outreachDetail.sources.map(s => s.id) : []);
  const sourcesAllSelected = selectedSources.length === outreachDetail.sources.length;
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Filters popover state — chip multi-selects + range inputs
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [leadTypes, setLeadTypes] = useState<LeadType[]>([]);
  const [temperatures, setTemperatures] = useState<LeadTemperature[]>([]);
  const [qualStatuses, setQualStatuses] = useState<NonNullable<AIQualStatus>[]>([]);
  const [durationMin, setDurationMin] = useState("");
  const [durationMax, setDurationMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sentToCrm, setSentToCrm] = useState<"yes" | "no" | "">("");

  const d = outreachDetail;
  const progressPercent = (d.called / d.totalContacts) * 100;

  // Counts per tab for the badges next to each tab label.
  const outcomeCounts = useMemo(() => {
    const counts: Partial<Record<FilterTab, number>> = {};
    for (const tab of FILTER_TABS) {
      counts[tab.id] = outreachContacts.filter(c => matchesTab(c, tab.id)).length;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    let rows = outreachContacts;
    if (activeFilter !== "all") rows = rows.filter((c) => matchesTab(c, activeFilter));
    if (leadTypes.length > 0) rows = rows.filter((c) => leadTypes.includes(c.leadType));
    if (temperatures.length > 0) rows = rows.filter((c) => temperatures.includes(c.temperature));
    if (qualStatuses.length > 0) rows = rows.filter((c) => c.qualStatus !== null && qualStatuses.includes(c.qualStatus));
    // Call Duration in seconds (data is in minutes — convert)
    const dMinSec = durationMin === "" ? null : parseFloat(durationMin);
    const dMaxSec = durationMax === "" ? null : parseFloat(durationMax);
    if (dMinSec !== null || dMaxSec !== null) {
      rows = rows.filter((c) => {
        if (c.duration === null) return false;
        const secs = c.duration * 60;
        if (dMinSec !== null && secs < dMinSec) return false;
        if (dMaxSec !== null && secs > dMaxSec) return false;
        return true;
      });
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).getTime() : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
      rows = rows.filter((c) => {
        if (!c.calledAt) return false;
        const t = new Date(c.calledAt).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
        return true;
      });
    }
    if (sentToCrm !== "") {
      const want = sentToCrm === "yes";
      rows = rows.filter((c) => c.sentToCrm === want);
    }
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    return rows;
  }, [search, activeFilter, leadTypes, temperatures, qualStatuses, durationMin, durationMax, dateFrom, dateTo, sentToCrm]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (f: FilterTab) => {
    setActiveFilter(f);
    setPage(1);
  };

  const popoverFilterCount =
    leadTypes.length +
    temperatures.length +
    qualStatuses.length +
    (durationMin !== "" || durationMax !== "" ? 1 : 0) +
    (dateFrom !== "" || dateTo !== "" ? 1 : 0) +
    (sentToCrm !== "" ? 1 : 0);

  // Human-readable label for the Export button. Tells the user exactly which
  // contacts will end up in the CSV — the active tab and the current count.
  // When the user also has popover filters or a search term active we tack
  // on a "(filtered)" qualifier so they don't accidentally export less than
  // they expected.
  const activeTabLabel = FILTER_TABS.find(t => t.id === activeFilter)?.label ?? "All";
  const exportNoun =
      activeFilter === "all"          ? "contacts"
    : activeFilter === "yet_to_dial"  ? "not-yet-dialed contacts"
    : activeFilter === "qualified"    ? "qualified contacts"
    : activeFilter === "follow_up"    ? "follow-up contacts"
    : "disqualified contacts";
  const hasExtraFilter = popoverFilterCount > 0 || search.trim().length > 0;
  const exportLabel = `Export ${filtered.length.toLocaleString()} ${exportNoun}${hasExtraFilter ? " (filtered)" : ""}`;

  const handleExportContacts = () => {
    if (filtered.length === 0) return;
    // File name encodes the outreach, the active tab, and the date so users
    // can tell two exports apart when they end up next to each other.
    const today = new Date().toISOString().slice(0, 10);
    const safeName = outreachDetail.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const safeTab = activeTabLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const fileName = `${safeName}_${safeTab}_${today}.csv`;
    downloadTextFile(fileName, buildContactsCsv(filtered));
  };

  const resetPopoverFilters = () => {
    setLeadTypes([]);
    setTemperatures([]);
    setQualStatuses([]);
    setDurationMin("");
    setDurationMax("");
    setDateFrom("");
    setDateTo("");
    setSentToCrm("");
    setPage(1);
  };

  const toggleInList = <T,>(list: T[], setter: (v: T[]) => void, value: T) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    setPage(1);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb — back arrow + parent only (the campaign name is the H1) */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push("/outreach")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Outreach</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          {/* Title row — name + status badge sit together */}
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-page-title text-text-primary">{d.name}</h1>
            <InlineStatusBadge status={outreachStatus} />
          </div>
          <div className="flex items-center gap-3 text-[12px] text-text-secondary">
            <span>{d.voiceAgent}</span>
            <span className="text-border">|</span>
            <span className="tabular-nums">{Math.round(progressPercent)}% complete</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Common time-range filter — same selector used on the outreach
              listing, so the user sees a consistent control across analytics
              surfaces. */}
          <DateRangeSelector compact onChange={setRangePreset} defaultPreset="7" />
          <SourceFilter
            sources={d.sources}
            selected={selectedSources}
            allSelected={sourcesAllSelected}
            menuOpen={sourceMenuOpen}
            setMenuOpen={setSourceMenuOpen}
            onToggle={toggleSource}
            onSetAll={setAllSources}
          />
          <StatusActionButton
            status={outreachStatus}
            onChange={setOutreachStatus}
          />
          <button
            onClick={() => setAddLeadsOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium rounded-button border border-border bg-white text-text-secondary hover:bg-surface-page transition-colors duration-150"
          >
            <UserPlus size={14} strokeWidth={1.5} />
            Add Leads
          </button>
        </div>
      </div>

      {/* Source filter context banner — only when partially filtered */}
      {!sourcesAllSelected && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-card bg-accent/5 border border-accent/20 text-[12px]">
          <FilterIcon size={12} strokeWidth={1.5} className="text-accent" />
          <span className="text-text-secondary">
            Showing data from{" "}
            <span className="font-semibold text-text-primary">
              {selectedSources.length} of {d.sources.length} uploaded files
            </span>
            . Widgets and the contacts table are scoped to these files only.
          </span>
          <button
            onClick={() => setAllSources(true)}
            className="ml-auto text-[12px] font-medium text-accent hover:underline"
          >
            Show all files
          </button>
        </div>
      )}

      {/* 0. KPI hero strip — same three widgets as the listing aggregate row,
          scoped to THIS outreach. Lets the user judge a single outreach's
          performance using the same Talktime / Spend / Funnel metrics they
          see on the listing, so numbers tie back to the rollup. */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <TalktimeKpi
          totalMinutes={d.totalMinutes}
          totalCalls={d.totalCalls}
        />
        <SpendKpi
          totalSpend={d.spend}
          totalQualified={d.qualified}
          totalMinutes={d.totalMinutes}
        />
        <PerformanceFunnelKpi
          leads={d.totalContacts}
          dialed={d.called}
          connected={d.connected}
          interacted={d.interacted}
          qualified={d.qualified}
        />
      </div>

      {/* 1. Lead coverage — total / called / remaining + ETA.
          Pace is approximated from called ÷ a typical 4-week activity
          window — gives a believable "calls per day" number to project the
          remaining work into a calendar date. */}
      <LeadCoverageBar
        total={d.totalContacts}
        called={d.called}
        remaining={d.totalContacts - d.called}
        dialsPerDay={Math.max(5, Math.round(d.called / 28))}
      />

      {/* 2. Row: Dial attempts bar chart + Drop-offs panel side by side.
          Conversion funnel was duplicating the new top Performance Funnel
          KPI — removed. The unique drop-offs info (Not qualified / Callback /
          No answer) lives here as a small stat panel so we don't lose it. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-4 mb-4">
        <DialAttemptsWidget
          total={d.totalContacts}
          attempts={d.dialAttempts}
          notDialled={d.totalContacts - d.called}
        />
        <DropoffsPanel
          notQualified={d.notQualified}
          callback={d.callback}
          noAnswer={d.noAnswer}
        />
      </div>

      {/* Contacts Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-section-header text-text-primary">Contacts</h3>
          <div className="flex items-center gap-2 relative">
            <div className="relative max-w-[240px]">
              <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-8 pl-8 pr-3 text-[13px] border border-border rounded-input bg-white focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              className={`inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-input border transition-colors ${
                popoverFilterCount > 0
                  ? "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
                  : "border-border bg-white text-text-secondary hover:text-text-primary hover:bg-surface-page"
              }`}
            >
              <FilterIcon size={13} strokeWidth={1.5} />
              Filters
              {popoverFilterCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-white">
                  {popoverFilterCount}
                </span>
              )}
            </button>

            {/* Export — tab-aware. Label literally says what's in the file
                ("Export 47 qualified contacts") so the user doesn't wonder
                whether the active tab/filter narrows the export or not. */}
            <button
              type="button"
              onClick={handleExportContacts}
              disabled={filtered.length === 0}
              title={exportLabel}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-input border border-border bg-white text-text-secondary hover:text-text-primary hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">{exportLabel}</span>
              <span className="sm:hidden">Export</span>
            </button>

            {filtersOpen && (
              <>
                {/* click-outside backdrop */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setFiltersOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1.5 w-[420px] bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                    <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-text-primary">
                      <FilterIcon size={13} strokeWidth={1.5} />
                      Filters
                    </div>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-4 text-left">
                    <ChipGroup
                      label="Lead Type"
                      options={LEAD_TYPE_OPTS}
                      selected={leadTypes}
                      onToggle={(v) => toggleInList(leadTypes, setLeadTypes, v)}
                    />
                    <ChipGroup
                      label="Lead Temperature"
                      options={TEMPERATURE_OPTS}
                      selected={temperatures}
                      onToggle={(v) => toggleInList(temperatures, setTemperatures, v)}
                    />
                    <ChipGroup
                      label="AI Qualification Status"
                      options={QUAL_STATUS_OPTS}
                      selected={qualStatuses}
                      onToggle={(v) => toggleInList(qualStatuses, setQualStatuses, v)}
                    />
                    <ChipGroup
                      label="Send to CRM"
                      options={SENT_TO_CRM_OPTS}
                      selected={sentToCrm === "" ? [] : [sentToCrm]}
                      onToggle={(v) => { setSentToCrm(sentToCrm === v ? "" : v); setPage(1); }}
                    />

                    {/* Call Duration (seconds) */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Call Duration (seconds)</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={durationMin}
                          onChange={e => { setDurationMin(e.target.value); setPage(1); }}
                          placeholder="Min"
                          min={0}
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="number"
                          value={durationMax}
                          onChange={e => { setDurationMax(e.target.value); setPage(1); }}
                          placeholder="Max"
                          min={0}
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                      </div>
                    </div>

                    {/* Created Date */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Created Date</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                          placeholder="From"
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => { setDateTo(e.target.value); setPage(1); }}
                          placeholder="To"
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-page/40">
                    <span className="text-[11.5px] text-text-tertiary tabular-nums">
                      {filtered.length} of {outreachContacts.length} contacts
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={resetPopoverFilters}
                        disabled={popoverFilterCount === 0}
                        className="h-7 px-3 text-[12px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setFiltersOpen(false)}
                        className="h-7 px-3 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab strip — pill style matching /enquiries Leads page. Selected
            tab gets white background + shadow; inactive tabs are flat text
            on the grey surface-secondary track. */}
        <div className="px-5 py-3 border-b border-border-subtle">
          <div className="inline-flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
            {FILTER_TABS.map((tab) => {
              const count = outcomeCounts[tab.id] ?? 0;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleFilterChange(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[5px] whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? "bg-white text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`tabular-nums ${isActive ? "text-text-tertiary" : "text-text-tertiary"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contacts table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Name</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Phone</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">AI Qualification</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Next Action</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Next Action Time</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Duration
                    <span title="Call duration in minutes" className="cursor-help text-text-tertiary">
                      <Info size={11} strokeWidth={1.5} />
                    </span>
                  </span>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Created</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Updated</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-text-tertiary">
                    No contacts match this filter
                  </td>
                </tr>
              ) : (
                paginated.map((c, i) => {
                  const globalIndex = (page - 1) * PAGE_SIZE + i;
                  // Derive deterministic initials from the masked name.
                  // The masked format ("Ramesh K*****") still surfaces the
                  // first letter of each word — same trick /enquiries uses.
                  const initials = c.name
                    .split(" ")
                    .map((w) => w.replace(/\*/g, "").charAt(0))
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const avatarColor = avatarColors[globalIndex % avatarColors.length];
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors duration-150 ${
                        i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                      }`}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <span className="text-[13px] text-text-primary font-medium">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">{c.phone}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><QualStatusBadge status={c.qualStatus} /></td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">
                        {c.nextAction ?? <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {c.nextActionAt ? format(new Date(c.nextActionAt), "dd MMM, HH:mm") : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary font-medium text-right tabular-nums whitespace-nowrap">
                        {c.duration !== null ? `${c.duration} min` : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {format(new Date(c.createdAt), "dd MMM")}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {format(new Date(c.updatedAt), "dd MMM")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-[12px] text-text-tertiary">
            {filtered.length === 0
              ? "No results"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Add Leads Modal */}
      {addLeadsOpen && <AddLeadsModal onClose={() => setAddLeadsOpen(false)} />}
    </motion.div>
  );
}

// ── KPI hero strip — same three widgets as the listing, scoped to one
// outreach. Lets the user judge an individual outreach's performance against
// the same metrics the listing aggregates use, so numbers tie back. Static
// numbers (no trend chip) — there's no week-over-week baseline for a single
// outreach without daily time-series, and a synthetic delta would be misleading.

function formatINRDetail(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 2)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function TalktimeKpi({
  totalMinutes,
  totalCalls,
}: {
  totalMinutes: number;
  totalCalls: number;
}) {
  const avgMinPerCall = totalCalls > 0 ? totalMinutes / totalCalls : 0;
  const avgMins = Math.floor(avgMinPerCall);
  const avgSecs = Math.round((avgMinPerCall - avgMins) * 60);
  const avg = totalCalls > 0 ? `${avgMins}m ${String(avgSecs).padStart(2, "0")}s` : "—";
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px] mb-1.5">
        <Clock size={13} strokeWidth={1.5} />
        Total talktime
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-text-primary leading-tight tabular-nums">
          {totalMinutes.toLocaleString()}
        </span>
        <span className="text-[12px] text-text-secondary leading-tight">min</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {totalCalls.toLocaleString()} calls
        </span>
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {avg} avg
        </span>
      </div>
    </div>
  );
}

function SpendKpi({
  totalSpend,
  totalQualified,
  totalMinutes,
}: {
  totalSpend: number;
  totalQualified: number;
  totalMinutes: number;
}) {
  const cpql = totalQualified > 0 ? Math.round(totalSpend / totalQualified) : 0;
  const cpm  = totalMinutes > 0 ? Math.round(totalSpend / totalMinutes) : 0;
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px] mb-1.5">
        <IndianRupee size={13} strokeWidth={1.5} />
        Total spend
        <span className="relative inline-flex group">
          <Info
            size={11}
            strokeWidth={1.5}
            className="text-text-tertiary hover:text-text-secondary cursor-help"
            aria-label="How total spend is calculated"
          />
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 whitespace-nowrap rounded-[6px] bg-text-primary text-white text-[11px] font-medium tabular-nums px-2.5 py-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity normal-case tracking-normal"
          >
            {totalMinutes.toLocaleString()} min × {formatINRDetail(cpm)}/min = {formatINRDetail(totalSpend)}
            <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 -mt-1 rotate-45 bg-text-primary" aria-hidden />
          </span>
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-text-primary leading-tight tabular-nums">
          {formatINRDetail(totalSpend)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {totalQualified.toLocaleString()} qualified
        </span>
        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">
          {totalQualified > 0 ? `${formatINRDetail(cpql)} / qual` : "—"}
        </span>
      </div>
    </div>
  );
}

function PerformanceFunnelKpi({
  leads, dialed, connected, interacted, qualified,
}: {
  leads: number; dialed: number; connected: number; interacted: number; qualified: number;
}) {
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const stages = [
    { key: "leads",      label: "Leads",      value: leads,      color: "#1F2937", rate: null },
    { key: "dialed",     label: "Dialed",     value: dialed,     color: "#3730A3", rate: pct(dialed, leads) },
    { key: "connected",  label: "Connected",  value: connected,  color: "#4F46E5", rate: pct(connected, dialed) },
    { key: "interacted", label: "Interacted", value: interacted, color: "#7C3AED", rate: pct(interacted, connected) },
    { key: "qualified",  label: "Qualified",  value: qualified,  color: "#16A34A", rate: pct(qualified, leads) },
  ];
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Performance funnel
        </div>
        <span className="text-[11px] font-medium text-text-tertiary tabular-nums">
          {pct(qualified, leads)}% overall
        </span>
      </div>
      <div className="space-y-1.5">
        {stages.map((s) => {
          const w = leads > 0 ? (s.value / leads) * 100 : 0;
          return (
            <div
              key={s.key}
              className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-text-secondary">
                {s.label}
              </span>
              <div className="h-4 rounded-[3px] bg-surface-page overflow-hidden">
                <div
                  className="h-full rounded-[3px] transition-all"
                  style={{ width: `${w.toFixed(2)}%`, backgroundColor: s.color, minWidth: s.value > 0 ? 2 : 0 }}
                />
              </div>
              <span className="inline-flex items-baseline gap-1.5 justify-end shrink-0 min-w-[72px]">
                <span className="text-[12.5px] font-bold tabular-nums text-text-primary leading-none">
                  {s.value.toLocaleString()}
                </span>
                {s.rate !== null && (
                  <span className="text-[10px] font-medium tabular-nums text-text-tertiary">
                    {s.rate}%
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 1. Lead coverage — single compact strip. Scales to any volume. ─────────

// Compact drop-offs panel — preserves the unique signal that lived inside
// the now-removed conversion funnel. Three colour-coded counters: leads that
// were called but didn't qualify, asked for a callback, or didn't answer.
function DropoffsPanel({
  notQualified,
  callback,
  noAnswer,
}: {
  notQualified: number;
  callback: number;
  noAnswer: number;
}) {
  const items = [
    { label: "Not qualified", value: notQualified, dot: "#DC2626" },
    { label: "Callback",      value: callback,     dot: "#D97706" },
    { label: "No answer",     value: noAnswer,     dot: "#6B7280" },
  ];
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 flex flex-col">
      <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px] mb-3">
        Drop-offs
      </div>
      <div className="flex-1 space-y-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: it.dot }}
                aria-hidden
              />
              <span className="text-[12.5px] text-text-secondary">{it.label}</span>
            </div>
            <span className="text-[13px] font-semibold text-text-primary tabular-nums">
              {it.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadCoverageBar({
  total,
  called,
  remaining,
  dialsPerDay,
}: {
  total: number;
  called: number;
  remaining: number;
  // Derived pace — used to project an ETA. Caller is responsible for
  // computing this from current activity (e.g. total dials / activityDays).
  dialsPerDay: number;
}) {
  const calledPct = total > 0 ? (called / total) * 100 : 0;
  // ETA = remaining ÷ pace. Floors at 1 day so a near-finished outreach
  // doesn't show "0 days" awkwardly.
  const etaDays = dialsPerDay > 0 && remaining > 0
    ? Math.max(1, Math.ceil(remaining / dialsPerDay))
    : null;
  // Project the calendar date by adding etaDays to today. The detail page is
  // demo-only so the user just wants a feel for "around when does this end".
  const etaDate = etaDays !== null
    ? new Date(Date.now() + etaDays * 24 * 60 * 60 * 1000)
    : null;
  const etaLabel = etaDate
    ? etaDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="bg-white border border-border rounded-card px-4 py-3 mb-4 flex items-center gap-5">
      <div className="shrink-0">
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Total leads
        </div>
        <div className="text-[22px] font-semibold tabular-nums text-text-primary leading-tight mt-0.5">
          {total.toLocaleString()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 text-[11.5px] flex-wrap gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-text-primary" />
            <span className="text-text-secondary">Called</span>
            <span className="font-semibold text-text-primary tabular-nums">{called.toLocaleString()}</span>
            <span className="text-text-tertiary tabular-nums">({Math.round(calledPct)}%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="text-text-secondary">Remaining</span>
            <span className="font-semibold text-text-primary tabular-nums">{remaining.toLocaleString()}</span>
            <span className="text-text-tertiary tabular-nums">({Math.round(100 - calledPct)}%)</span>
          </span>
        </div>
        <div className="relative w-full h-2 rounded-full overflow-hidden bg-surface-page">
          <div
            className="absolute inset-y-0 left-0 bg-text-primary"
            style={{ width: `${calledPct.toFixed(2)}%` }}
          />
        </div>
      </div>
      {/* ETA — projects when the remaining leads will be dialled at current
          pace. Hidden once everything is called. */}
      {etaDays !== null && (
        <div className="shrink-0 text-right">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
            Est. completion
          </div>
          <div className="text-[13px] font-semibold text-text-primary tabular-nums leading-tight mt-0.5">
            {etaLabel}
          </div>
          <div className="text-[10.5px] text-text-tertiary tabular-nums mt-0.5">
            ~{etaDays} day{etaDays === 1 ? "" : "s"} · {dialsPerDay}/day
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2A. Leads by dial attempt — horizontal bars, matching the Performance
// Funnel pattern. Previously this was a vertical-gradient bar chart that
// looked oversaturated and out of sync with the rest of the page. Now uses
// the same row layout as the funnel: label column on the left, proportional
// bar in the middle, value + percent on the right. Single muted accent
// colour replaces the indigo→pink rainbow gradient.

function DialAttemptsWidget({
  total,
  attempts,
  notDialled,
}: {
  total: number;
  attempts: number[];      // index 0 = 1× attempt, length = max attempts configured
  notDialled: number;
}) {
  // Single-hue ramp — successive attempts get darker indigo. "Not yet" is
  // neutral grey. Quieter than the previous rainbow and consistent with the
  // accent palette used elsewhere on the page.
  const indigoRamp = ["#A5B4FC", "#818CF8", "#6366F1", "#4F46E5", "#4338CA", "#3730A3"];
  const rows = [
    ...attempts.map((value, i) => ({
      key: `a-${i}`,
      label: `${i + 1}×`,
      value,
      color: indigoRamp[Math.min(i, indigoRamp.length - 1)],
    })),
    { key: "nd", label: "Not yet", value: notDialled, color: "#9CA3AF" },
  ];
  const max = Math.max(...rows.map(b => b.value), 1);
  const pctOf = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[120px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Leads by dial attempt
        </div>
        <span className="text-[11px] font-medium text-text-tertiary tabular-nums">
          {attempts.length}× max
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const w = max > 0 ? (r.value / max) * 100 : 0;
          return (
            <div
              key={r.key}
              className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-text-secondary tabular-nums">
                {r.label}
              </span>
              <div className="h-4 rounded-[3px] bg-surface-page overflow-hidden">
                <div
                  className="h-full rounded-[3px] transition-all"
                  style={{ width: `${w.toFixed(2)}%`, backgroundColor: r.color, minWidth: r.value > 0 ? 2 : 0 }}
                />
              </div>
              <span className="inline-flex items-baseline gap-1.5 justify-end shrink-0 min-w-[72px]">
                <span className="text-[12.5px] font-bold tabular-nums text-text-primary leading-none">
                  {r.value.toLocaleString()}
                </span>
                <span className="text-[10px] font-medium tabular-nums text-text-tertiary">
                  {pctOf(r.value)}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Goal pacing progress bar ──────────────────────────────────────────────────

// Stable reference "today" so the demo pacing math gives the same result
// during SSR and on the client (avoids hydration mismatch).
const DEMO_NOW = "2026-05-25";

function GoalProgressBar({
  label,
  current,
  goal,
  windowStart,
  windowEnd,
}: {
  label: string;
  current: number;
  goal: number;
  windowStart: string;
  windowEnd: string;
}) {
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  const now = Math.min(new Date(DEMO_NOW).getTime(), end);
  const totalMs = end - start;
  const elapsedMs = Math.max(0, now - start);
  const timePct = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;
  const dayOf = Math.max(1, Math.round(elapsedMs / 86400000));
  const totalDays = Math.max(1, Math.round(totalMs / 86400000));

  const achievedPct = goal > 0 ? Math.min(1, current / goal) : 0;
  const expected = Math.round(timePct * goal);
  const forecast = elapsedMs > 0 ? Math.round((current / elapsedMs) * totalMs) : current;

  const pacingPct =
    expected > 0 ? Math.round(((current - expected) / expected) * 100) : 0;
  const isAhead = current >= expected;

  // Positions on the bar (clamped 0..1). toFixed keeps SSR + client strings identical.
  const achievedX = achievedPct;
  const expectedX = Math.min(1, Math.max(0, timePct));

  const stripeStart = Math.min(achievedX, expectedX);
  const stripeEnd = Math.max(achievedX, expectedX);
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className="bg-white border border-border rounded-card p-5 mb-4">
      {/* Top row: label + pacing badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
          Goal · {label}
        </div>
        <span
          className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-badge tabular-nums ${
            isAhead ? "bg-[#F0FDF4] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"
          }`}
        >
          {isAhead ? "AHEAD" : "BEHIND"} · {pacingPct > 0 ? "+" : ""}{pacingPct}%
        </span>
      </div>

      {/* Big number + window */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[32px] font-bold tabular-nums text-text-primary leading-none">
          {current.toLocaleString()}
        </span>
        <span className="text-[18px] font-medium text-text-tertiary tabular-nums">
          / {goal.toLocaleString()}
        </span>
        <span className="text-[12.5px] text-text-tertiary ml-3">
          {format(new Date(windowStart), "MMM d")} → {format(new Date(windowEnd), "MMM d, yyyy")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-surface-page">
        {/* Solid achieved */}
        <div
          className="absolute inset-y-0 left-0 bg-text-primary"
          style={{ width: pct(achievedX) }}
        />
        {/* Striped deficit/surplus zone between achieved and expected */}
        {Math.abs(achievedX - expectedX) > 0.005 && (
          <div
            className="absolute inset-y-0"
            style={{
              left: pct(stripeStart),
              width: pct(stripeEnd - stripeStart),
              backgroundImage:
                "repeating-linear-gradient(90deg, #D4D4D4 0 4px, transparent 4px 8px)",
            }}
          />
        )}
      </div>

      {/* Footer: 4 labels under the bar */}
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-text-tertiary tabular-nums">
        <span>
          <span className="text-text-secondary font-medium">{Math.round(achievedPct * 100)}%</span> achieved
        </span>
        <span>
          Expected by now · <span className="text-text-secondary font-medium">{expected.toLocaleString()}</span>
        </span>
        <span>
          Forecast end · <span className="text-text-secondary font-medium">{forecast.toLocaleString()}</span>
        </span>
        <span>
          Day <span className="text-text-secondary font-medium">{dayOf}</span> of {totalDays}
        </span>
      </div>
    </div>
  );
}

// ── Horizontal funnel: Total → Called → Connected → Qualified ─────────────────

function FunnelWidget({
  leads,
  dialed,
  connected,
  interacted,
  qualified,
  notQualified,
  callback,
  noAnswer,
}: {
  leads: number;
  dialed: number;
  connected: number;
  interacted: number;
  qualified: number;
  notQualified: number;
  callback: number;
  noAnswer: number;
}) {
  // Each stage carries its own rate definition so the percentage shown inside
  // the capsule matches the standard metric name (Coverage, Connect rate,
  // Interaction rate, Qualification rate).
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const stages = [
    { key: "leads",      label: "Leads",      value: leads,      color: "#1F2937", rate: null },
    { key: "dialed",     label: "Dialed",     value: dialed,     color: "#3730A3", rate: pct(dialed, leads) },
    { key: "connected",  label: "Connected",  value: connected,  color: "#4F46E5", rate: pct(connected, dialed) },
    { key: "interacted", label: "Interacted", value: interacted, color: "#7C3AED", rate: pct(interacted, connected) },
    { key: "qualified",  label: "Qualified",  value: qualified,  color: "#16A34A", rate: pct(qualified, leads) },
  ];

  const dropoffs = [
    { label: "Not qualified", value: notQualified },
    { label: "Callback",      value: callback },
    { label: "No answer",     value: noAnswer },
  ];

  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
        Conversion funnel
      </div>

      {/* Vertical cascade — capsules taper in width based on count vs leads.
          Each capsule carries the stage's own rate (Coverage / Connect rate /
          Interaction rate / Qualification rate) inline with the value. */}
      <div className="flex flex-col items-center gap-1">
        {stages.map((s) => {
          const widthPct = leads > 0 ? Math.max(28, (s.value / leads) * 100) : 28;
          return (
            <div
              key={s.key}
              className="relative rounded-full text-white px-3.5 py-1.5 flex items-center justify-between"
              style={{ width: `${widthPct.toFixed(2)}%`, backgroundColor: s.color, minWidth: 180 }}
            >
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.5px] opacity-85">
                {s.label}
              </span>
              <span className="flex items-baseline gap-2">
                {s.rate !== null && (
                  <span className="text-[10.5px] font-medium tabular-nums opacity-75">
                    {s.rate}%
                  </span>
                )}
                <span className="text-[14px] font-bold tabular-nums leading-none">
                  {s.value.toLocaleString()}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Drop-offs — single compact line */}
      <div className="mt-3 pt-2 border-t border-border-subtle flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="text-text-tertiary uppercase tracking-[0.3px] text-[10px] font-semibold">Dropped</span>
        {dropoffs.map((d, i) => (
          <span key={d.label} className="inline-flex items-center gap-1">
            <span>{d.label}</span>
            <span className="font-semibold text-text-primary tabular-nums">{d.value}</span>
            {i < dropoffs.length - 1 && <span className="text-border">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Chip multi-select group used inside the Filters popover ───────────────────

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-[12.5px] font-semibold text-text-primary mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const isOn = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={`h-7 px-3 text-[12px] font-medium rounded-[14px] border transition-colors ${
                isOn
                  ? "bg-accent text-white border-accent"
                  : "bg-white border-border text-text-secondary hover:text-text-primary hover:border-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 4. `src/components/layout/sidebar.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  Monitor,
  Zap,
  FileText,
  Globe,
  Image as ImageIcon,
  Plug,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  PhoneCall,
  Wallet,
  Plus,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { WorkspaceSwitcher, UserRolePill } from "@/components/layout/workspace-switcher";
import { useCurrentUser } from "@/lib/workspace-store";

const dashboardItem = { name: "Dashboard", href: "/dashboard", icon: LayoutGrid };

// Wallet — representative balance shown in the sidebar so the user always
// knows how much head-room they have before they need to top up. The unit is
// minutes since that's what voice-agent platforms actually meter; we also
// expose the rupee equivalent for the demo persona (Indian real-estate).
// Numbers are intentionally a "real-feeling" middle state — not full, not
// empty — so the bar reads as actively in use.
const WALLET = {
  totalMinutes: 5000,
  usedMinutes:  3250,
  // Used for the secondary rupee display. ₹X per minute is editorial.
  rupeesPerMinute: 8,
};

function formatInrShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Compact sidebar wallet — sized to sit comfortably above the user row
// without crowding the nav. We dropped the inner card + decorative coin
// from the earlier version; both were eating vertical space that the nav
// items needed. What remains: utilization % + minutes used/total + a thin
// bar + a tiny Top up link. The whole widget fits in ~58 px of vertical.
function WalletWidget() {
  const { totalMinutes, usedMinutes, rupeesPerMinute } = WALLET;
  const remaining = Math.max(0, totalMinutes - usedMinutes);
  const pctUsed = totalMinutes > 0 ? Math.min(100, (usedMinutes / totalMinutes) * 100) : 0;
  const tone =
      pctUsed >= 90 ? { bar: "#DC2626", text: "text-[#DC2626]" }
    : pctUsed >= 75 ? { bar: "#D97706", text: "text-[#92400E]" }
    : { bar: "#7C3AED", text: "text-accent" };

  return (
    <div className="px-3 pb-2">
      <div className="rounded-[8px] border border-border-subtle bg-white px-2.5 py-2">
        {/* Single-row header: icon + label + percent + Top up. All in one
            line so the wallet fits in the chrome without taking real-estate
            from nav items. The percent doubles as both a status indicator
            and the only header chip — no separate "used" sub-line below. */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wallet size={11} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Wallet</span>
          <span className={`text-[10px] font-semibold tabular-nums ${tone.text} ml-auto`}>
            {Math.round(pctUsed)}%
          </span>
        </div>

        {/* Bar — primary visual */}
        <div className="h-1 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctUsed.toFixed(1)}%`, background: tone.bar }}
          />
        </div>

        {/* Footer: used/total minutes + Top up */}
        <div className="flex items-center justify-between mt-1.5 text-[10px] tabular-nums">
          <span className="text-text-tertiary">
            <span className="text-text-secondary font-medium">{usedMinutes.toLocaleString()}</span>
            <span className="mx-0.5">/</span>
            {totalMinutes.toLocaleString()} min
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent hover:underline"
            title={`${remaining.toLocaleString()} min · ${formatInrShort(remaining * rupeesPerMinute)} left`}
          >
            <Plus size={9} strokeWidth={2.5} />
            Top up
          </button>
        </div>
      </div>
    </div>
  );
}

// Nav structure mirrors origin/main exactly — only addition is the new
// "Outreach" entry under Lead Generation. Everything else (CRM/Leads tab,
// Tools group, Workspace > Brand, original icon set and section weights)
// is preserved so the sidebar matches the deployed dashboard 1:1.
const navSections = [
  {
    label: "Lead Generation",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Campaigns", href: "/campaigns", icon: Monitor },
      { name: "Outreach", href: "/outreach", icon: PhoneCall },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Leads", href: "/enquiries", icon: FileText },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Creatives", href: "/creatives", icon: ImageIcon },
      { name: "Agents", href: "/agents-mvp", icon: Zap },
      { name: "Audiences", href: "/audiences", icon: Globe, comingSoon: true },
      { name: "Integrations", href: "/integrations", icon: Plug, comingSoon: true },
    ],
  },
  {
    label: "Workspace",
    items: [
      { name: "Brand", href: "/brand", icon: Sparkles },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isEmpty, toggle } = useDemoMode();
  const askSpot = useSpotStore((s) => s.askSpot);
  const spotOpen = useSpotStore((s) => s.open);
  const user = useCurrentUser();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    `relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
      isActive(href)
        ? "bg-surface-secondary text-text-primary font-medium"
        : "text-text-secondary hover:bg-surface-secondary/60"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white border-r border-border flex flex-col z-50">
      {/* Workspace switcher — sits in the brand row; the workspace mark IS
          the brand mark in this product (Revspot is implicit). */}
      <div className="px-2 pt-3 pb-2 border-b border-border-subtle">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 pb-2">
        {/* Dashboard + Spot — standalone at top */}
        <div className="mb-3 space-y-0.5">
          <Link href={dashboardItem.href} className={navLinkClass(dashboardItem.href)} style={{ fontSize: "13.5px" }}>
            <dashboardItem.icon size={16} strokeWidth={1.5} />
            <span>{dashboardItem.name}</span>
          </Link>
          <button
            type="button"
            onClick={() => askSpot("")}
            className={`relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 w-full text-left ${
              spotOpen
                ? "bg-surface-secondary text-text-primary font-medium"
                : "text-text-secondary hover:bg-surface-secondary/60"
            }`}
            style={{ fontSize: "13.5px" }}
          >
            <span className="inline-flex items-center justify-center" style={{ width: 16, height: 16 }}>
              <SpotMark size={14} />
            </span>
            <span>Spot</span>
            <span
              className="ml-auto"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#1A1A1A" }}
              aria-hidden
              title="New from Spot"
            />
          </button>
        </div>

        {/* Sections */}
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            <div className="label-section px-2 mb-1">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const cs = "comingSoon" in item && item.comingSoon;
                if (cs) {
                  return (
                    <div key={item.href} className="relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] text-text-tertiary cursor-default" style={{ fontSize: "13.5px" }}>
                      <item.icon size={16} strokeWidth={1.5} />
                      <span>{item.name}</span>
                      <span className="ml-auto text-[8px] font-medium px-1 py-0.5 rounded bg-surface-secondary text-text-tertiary">Soon</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navLinkClass(item.href)}
                    style={{ fontSize: "13.5px" }}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Settings — bottom of nav */}
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <Link href="/settings" className={navLinkClass("/settings")} style={{ fontSize: "13.5px" }}>
            <Settings size={16} strokeWidth={1.5} />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Wallet — always visible above the user section so the user knows
          how much head-room they have without leaving the page. */}
      <WalletWidget />

      {/* Demo mode toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[11px] font-medium transition-all duration-150 ${
            isEmpty
              ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
              : "bg-surface-secondary text-text-tertiary hover:text-text-secondary"
          }`}
        >
          {isEmpty ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}
          {isEmpty ? "Empty State Mode ON" : "Preview Empty States"}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-medium text-text-secondary">
              {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-text-primary leading-tight flex items-center gap-1.5">
              <span className="truncate">{user.name}</span>
              <UserRolePill />
            </div>
            <div className="text-[10px] text-text-tertiary truncate">{user.email}</div>
          </div>
          <button className="p-1 text-text-tertiary hover:text-text-secondary transition-colors">
            <Settings size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
```
