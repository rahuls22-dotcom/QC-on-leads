"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Plus, ArrowUpRight, ArrowDownRight, ArrowLeft, ArrowRight, Clock, IndianRupee, GitBranch, Check, Info,
  ChevronDown, Upload, Bot, TrendingDown, Trophy, CalendarDays,
  Rocket, X, Pencil,
} from "lucide-react";
import { outreachList } from "@/lib/outreach-data";
import {
  dailyTalktime90d,
  dailySpend90d,
  dailySeriesForOutreach,
  rangeWindowFromPreset,
  sumInRange,
} from "@/lib/daily-series";
import type { OutreachStatus, OutreachListItem } from "@/lib/outreach-data";
import { useDemoMode } from "@/lib/demo-mode";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { SpotMark } from "@/components/spot/spot-mark";
import { EditOutreachDrawer, type EditOutreachInitial } from "@/components/outreach/edit-outreach-drawer";

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

// ── Status pill — tinted badge, matches /campaigns StatusBadge ────────────────
// The previous dot-and-label form felt off in the table — quiet to a fault.
// The campaigns list uses a tinted rounded badge (green for active, grey
// for done, amber for paused). Mirroring that here so the listing inherits
// the same status language users already learnt on /campaigns.
function StatusPill({ status }: { status: OutreachStatus }) {
  const cfg: Record<OutreachStatus, { label: string; cls: string }> = {
    in_progress: { label: "Running",   cls: "bg-[#F0FDF4] text-[#15803D]" },
    completed:   { label: "Completed", cls: "bg-surface-secondary text-text-secondary" },
    paused:      { label: "Paused",    cls: "bg-[#FEF3C7] text-[#92400E]" },
    // "Draft" replaces the old "Scheduled" pill. A draft outreach is
    // one that's been created but doesn't have an audience yet, so it
    // cannot run. Visually demoted (subtle slate) to read as
    // unfinished work rather than something that's queued and about
    // to start.
    draft:       { label: "Draft",     cls: "bg-surface-secondary text-text-tertiary" },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
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
function TrendChip({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) return null;
  const up = delta >= 0;
  // `inverted` flips meaning for metrics where rising is bad (e.g. Spend).
  const isGood = inverted ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
        isGood ? "text-[#15803D]" : "text-[#DC2626]"
      }`}
    >
      {up ? <ArrowUpRight size={12} strokeWidth={2} /> : <ArrowDownRight size={12} strokeWidth={2} />}
      {Math.abs(delta)}%
    </span>
  );
}

// ── Talktime widget ──────────────────────────────────────────────────────
// Mirrors the TalktimeKpi on /outreach/[id]: same chrome, same heights,
// same tinted backgrounds, same label-value sub-stat rows. The two screens
// now render the same widget; only the data scope (aggregate vs per-outreach)
// differs.
function TalktimeWidget({
  totalMins,
  totalCalls,
  delta,
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
  const tint = delta > 0 ? "bg-[#F7FDF9] border-[#E2F5E9]"
    : delta < 0 ? "bg-[#FEF9F9] border-[#F5E2E2]"
    : "bg-white border-border";
  return (
    <div className={`${tint} border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Talktime
        </span>
        <TrendChip delta={delta} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {totalMins.toLocaleString()}
        </span>
        <span className="text-[11.5px] text-text-secondary leading-none">min</span>
      </div>
      <div className="mt-auto pt-2 space-y-1 text-[11.5px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Calls</span>
          <span className="text-text-primary font-medium">{totalCalls.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Avg duration</span>
          <span className="text-text-primary font-medium">{avg}</span>
        </div>
      </div>
    </div>
  );
}

// ── Spend widget — mirrors SpendKpi on the detail page ────────────────────
function SpendWidget({
  totalSpend,
  totalQualified,
  delta,
}: {
  totalSpend: number;
  totalQualified: number;
  totalMinutes: number;
  delta: number;
  rangeLabel: string;
}) {
  const cpql = totalQualified > 0 ? Math.round(totalSpend / totalQualified) : 0;
  // Spend rising is bad — invert tint so up reads red, down reads green.
  const tint = delta > 0 ? "bg-[#FEF9F9] border-[#F5E2E2]"
    : delta < 0 ? "bg-[#F7FDF9] border-[#E2F5E9]"
    : "bg-white border-border";
  return (
    <div className={`${tint} border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Spend
          {/* Hover tooltip — explains the math behind Spend so the user
              doesn't have to guess what this aggregates. Same dark-pill
              treatment used elsewhere; normal-case + tracking-normal
              overrides the uppercase context so the body text stays
              readable. */}
          <span className="relative inline-flex group">
            <Info
              size={11}
              strokeWidth={1.5}
              className="text-text-tertiary hover:text-text-secondary cursor-help"
              aria-label="How spend is calculated"
            />
            <span
              role="tooltip"
              className="absolute left-0 top-full mt-1.5 z-20 w-[260px] rounded-[8px] bg-text-primary text-white text-[11.5px] leading-snug font-normal normal-case tracking-normal px-3 py-2.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              <span className="block font-semibold mb-1">How spend is calculated</span>
              Talktime minutes × per-minute call cost.
            </span>
          </span>
        </span>
        <TrendChip delta={delta} inverted />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {formatINR(totalSpend)}
        </span>
      </div>
      <div className="mt-auto pt-2 space-y-1 text-[11.5px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Qualified</span>
          <span className="text-text-primary font-medium">{totalQualified.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">CPQL</span>
          <span className="text-text-primary font-medium">{totalQualified > 0 ? formatINR(cpql) : "—"}</span>
        </div>
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
    { key: "leads",      label: "Leads",      value: leads,      rate: null as number | null },
    { key: "dialed",     label: "Dialed",     value: dialed,     rate: pct(dialed, leads) },
    { key: "connected",  label: "Connected",  value: connected,  rate: pct(connected, dialed) },
    { key: "interacted", label: "Interacted", value: interacted, rate: pct(interacted, connected) },
    { key: "qualified",  label: "Qualified",  value: qualified,  rate: pct(qualified, leads) },
  ];
  const topValue = Math.max(leads, 1);

  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Performance funnel
        </span>
        <span className="text-[10.5px] text-text-tertiary tabular-nums">
          {pct(qualified, leads)}% overall
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-1">
        {stages.map((s) => {
          const w = (s.value / topValue) * 100;
          return (
            <div key={s.key} className="grid grid-cols-[60px_minmax(0,1fr)_72px] items-center gap-2">
              <span className="text-[10.5px] text-text-tertiary truncate">{s.label}</span>
              <div className="h-2 rounded-full bg-surface-page overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(w, 1.5).toFixed(2)}%`,
                    backgroundColor: "rgba(15, 23, 42, 0.78)",
                  }}
                />
              </div>
              <span className="inline-flex items-baseline gap-1 justify-end tabular-nums">
                <span className="text-[11.5px] font-medium text-text-primary leading-none">
                  {s.value.toLocaleString()}
                </span>
                {s.rate !== null && (
                  <span className="text-[10px] text-text-tertiary leading-none">
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
  { value: "draft",       label: "Draft",     dot: "#94A3B8" },
  { value: "in_progress", label: "Running",   dot: "#22C55E" },
  { value: "paused",      label: "Paused",    dot: "#F59E0B" },
  { value: "completed",   label: "Completed", dot: "#3B82F6" },
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
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px]">Status</span>
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

// ── Spot Insights — narrated editorial brief ───────────────────────────────
// The 4-up grid of coloured icon tiles read as a generic dashboard widget,
// not as something an AI noticed. This version reframes the same four
// observations as a brief written *by Spot*: a hero observation given
// typographic weight, then a quiet list of "also worth noting" follow-ups.
// No rainbow icon backgrounds — every observation lives in the same text
// tokens the rest of the product uses, so it reads as content not chrome.
//
// The left-edge accent bar on the hero is the only visual flourish, and
// it earns its keep by signalling "this is the headline" without needing
// a bigger font or a louder colour. The supporting list keeps its
// observation icons but renders them in text-tertiary so they ride along
// with the prose instead of demanding attention.
function SpotInsightsWidget({ insights }: {
  insights: Array<{
    id: string;
    icon: React.ElementType;
    iconColor: string;  // accepted but ignored — kept on the type so the
                        // caller doesn't break; we render mono icons
    title: string;
    detail: string;
  }>;
}) {
  if (insights.length === 0) return null;
  const [headline, ...rest] = insights.slice(0, 4);
  return (
    <div className="relative bg-white border border-border rounded-card overflow-hidden">
      {/* A whisper of Spot's brand colour at the top-right corner, just
          enough to mark this as AI-generated content vs. raw metrics. */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-64 h-32 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at top right, rgba(124,58,237,0.06), transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative p-5">
        {/* Header — light touch. The SpotMark + a writerly title set the
            tone: this is a brief, not a row of stats. */}
        <div className="flex items-center gap-2 mb-4">
          <SpotMark size={14} />
          <h3 className="text-[13.5px] font-semibold text-text-primary">
            Spot&apos;s read this week
          </h3>
          <span className="text-[11.5px] text-text-tertiary">
            · {insights.length} observation{insights.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Observations — flat list, all equal weight. Each line is one
            bullet: mono icon · bold lede · regular elaboration. No hero
            treatment, no "also worth noting" hierarchy — the four reads
            stand on their own and the user decides which matters most. */}
        <ul className="space-y-2.5">
          {[headline, ...rest].filter(Boolean).map((i) => {
            const Icon = i!.icon;
            return (
              <li key={i!.id} className="flex items-start gap-2.5">
                <Icon
                  size={13}
                  strokeWidth={1.5}
                  className="text-text-tertiary mt-[3px] shrink-0"
                />
                <p className="text-[13px] leading-snug min-w-0">
                  <span className="font-medium text-text-primary">
                    {i!.title}.
                  </span>{" "}
                  <span className="text-text-secondary">{i!.detail}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ── Outreach table row ────────────────────────────────────────────────────
// The previous design rendered each outreach as a "card row" with a five-stage
// funnel widget hanging off the right edge. It read as neither a card nor a
// list — too dense to scan, too dressed-up to feel like data. Replaced with
// a proper <table>: same chrome as /campaigns/[id] · Analysis (rounded outer,
// uppercase column heads, alternating row bg, right-aligned numerics) so this
// listing inherits the table conventions the rest of the product uses.
function OutreachRow({
  o,
  onEdit,
  alt,
}: {
  o: OutreachListItem;
  onEdit: (o: OutreachListItem) => void;
  alt: boolean;
}) {
  const router = useRouter();
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const qualRate = pct(o.qualified, o.totalContacts);
  return (
    <tr
      onClick={() => router.push(`/outreach/${o.id}`)}
      className={`group cursor-pointer border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors duration-150 ${
        alt ? "bg-surface-page/40" : "bg-white"
      }`}
    >
      {/* Name — primary cell with agent shown as a meta line underneath.
          Agent was previously its own column, but it doesn't deserve that
          much horizontal weight — it pairs naturally with the outreach
          name (which agent is calling this list?) so we treat it as the
          row's subtitle instead of a sortable axis. */}
      <td className="px-4 py-3 max-w-[280px]">
        <div className="text-[13px] font-medium text-text-primary truncate">{o.name}</div>
        <div className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-text-tertiary">
          <Bot size={11} strokeWidth={1.5} />
          <span>{o.voiceAgent} outbound bot</span>
        </div>
      </td>
      {/* Status moves up to column 2 — it's the first thing a user wants
          to know after seeing the name (is this still running?). */}
      <td className="px-3 py-3">
        <StatusPill status={o.status} />
      </td>
      {/* Leads — top of the funnel, no rate beside it (it IS the
          baseline that everything else divides by). Same weight/size
          as the other funnel numbers so the column reads as one
          consistent visual ladder. */}
      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
        <span className="text-[15px] font-medium text-text-primary">{o.totalContacts.toLocaleString()}</span>
      </td>
      {/* Funnel stages — number + "% of leads" rendered inline on a
          single line. Stacking the percentage below the number read
          as visual noise; pushing it beside the number keeps each
          cell to one line and lets the column scan vertically as
          plain numbers. Rates are all vs. the top of the funnel
          (Leads), not stage-over-stage — each column reads "how
          many of my leads made it this far?". */}
      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
        <span className="text-[15px] font-medium text-text-primary">{o.called.toLocaleString()}</span>
        <span className="text-[10.5px] text-text-tertiary ml-2">{pct(o.called, o.totalContacts)}%</span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
        <span className="text-[15px] font-medium text-text-primary">{o.connected.toLocaleString()}</span>
        <span className="text-[10.5px] text-text-tertiary ml-2">{pct(o.connected, o.totalContacts)}%</span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
        <span className="text-[15px] font-medium text-text-primary">{o.interacted.toLocaleString()}</span>
        <span className="text-[10.5px] text-text-tertiary ml-2">{pct(o.interacted, o.totalContacts)}%</span>
      </td>
      {/* Qualified — bottom of the funnel and the headline metric.
          Kept on the same weight/size ladder as the other funnel
          numbers so nothing reads as accidentally bold; the column
          itself (rightmost stage) and the % chip do the work of
          calling attention to the outcome. */}
      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">
        <span className="text-[15px] font-medium text-text-primary">{o.qualified.toLocaleString()}</span>
        <span className="text-[10.5px] text-text-tertiary ml-2">{qualRate}%</span>
      </td>
      {/* Dates trail to the right — useful metadata but not the headline.
          Created / Updated sit together so the user can read them as a
          single "lifespan" pair. Extra left padding on Created on gives
          the right-aligned numbers (Qual %) breathing room before the
          left-aligned date text starts. */}
      <td className="pl-6 pr-3 py-3 text-[12.5px] text-text-secondary tabular-nums whitespace-nowrap">
        {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </td>
      <td className="px-4 py-3 text-[12.5px] text-text-secondary tabular-nums whitespace-nowrap">
        {new Date(o.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </td>
      {/* Edit — hover-revealed pencil, stop propagation so it opens the
          drawer instead of navigating to the detail page. */}
      <td className="w-10 px-2 py-3 text-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(o);
          }}
          title="Edit outreach"
          aria-label={`Edit ${o.name}`}
          className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-primary hover:bg-white hover:border hover:border-border transition-all"
        >
          <Pencil size={12} strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}

// `rangeShare` used to live here — it scaled an outreach's lifetime totals
// by `rangeDays / activityDays` to fake a windowed view. We now derive
// per-row numbers from each outreach's real daily fingerprint (see
// daily-series.ts), so the scaling helper is no longer needed.

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
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="min-h-[calc(100vh-96px)] flex items-center justify-center"
    >
      {/* Single hero card that owns the whole empty state — no separate
          page title up top. Spot mark + headline + CTA at the top, the
          "How it works" 4-step strip below as a connected band. Sized
          to feel substantive without needing to fill the viewport. */}
      <motion.div
        variants={fadeUp}
        className="w-full max-w-[920px] bg-white border border-border rounded-card overflow-hidden"
      >
        <div className="px-10 pt-12 pb-10 text-center">
          {/* Spot mark — a tiny brand cue that the page isn't broken,
              just waiting for input. Sits above the headline so the eye
              walks down: mark → title → body → CTA. */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/5 mb-5">
            <SpotMark size={22} />
          </div>
          <h1 className="text-[26px] font-semibold text-text-primary leading-tight mb-2.5">
            Let&apos;s get your first outreach running.
          </h1>
          <p className="text-[14px] text-text-secondary leading-relaxed max-w-[520px] mx-auto">
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
            <div className="mt-3 text-[12px] text-text-tertiary">
              Walk through the 3-step form. Takes about a minute.
            </div>
          </div>
        </div>

        {/* How it works — strip across the bottom of the hero card */}
        <div className="bg-surface-page border-t border-border-subtle px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-[8px] bg-white border border-border-subtle flex items-center justify-center text-text-secondary">
                    <Icon size={14} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-text-primary mb-0.5 flex items-center gap-1.5">
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
  projectId?: string;
  name: string;
  voiceAgent: string;
  totalContacts: number;
  status: OutreachStatus;
  createdAt: string;
  startMode?: "immediately" | "schedule";
  startDate?: string;
  startTime?: string;
  // True when the user chose "I'll add audience later" from the create
  // flow's interstitial. The banner switches copy to acknowledge the
  // outreach exists but isn't dialing yet — no audience attached.
  needsAudience?: boolean;
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
      projectId: justLaunched.projectId ?? "",
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
      // Brand-new outreach — never updated yet, so updated == created.
      updatedAt: justLaunched.createdAt,
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
  // Which outreach is currently being edited (drawer is open). Null = closed.
  const [editingOutreach, setEditingOutreach] = useState<OutreachListItem | null>(null);
  // Status tab — single-select segmented control, same as /campaigns. "all"
  // shows every outreach; otherwise a single OutreachStatus narrows the list.
  const [statusTab, setStatusTab] = useState<"all" | OutreachStatus>("all");

  const { days, label: rangeLabel } = presetToRange(rangePreset);
  const talktimeDelta  = periodTrend(dailyTalktime90d, days);
  const spendDelta     = periodTrend(dailySpend90d, days);

  // Apply status filter, then derive each outreach's in-window numbers
  // from its real daily fingerprint. Previously this multiplied the
  // outreach's lifetime total by `rangeDays / activityDays` — a flat
  // scaling that made 7d look like exactly half of 14d. Now we sum the
  // actual per-day series within the requested window, so the numbers
  // pick up real weekday/weekend variation and per-outreach launch
  // timing (an outreach launched 3 days ago contributes only its 3
  // most-recent days to a "Last 7 days" view, not 3/45 of its lifetime).
  const scaled = useMemo(() => {
    const win = rangeWindowFromPreset(rangePreset);
    return allOutreach
      .filter(o => statusTab === "all" || o.status === statusTab)
      .map(o => {
        const agg = sumInRange(dailySeriesForOutreach(o.id), win);
        return {
          ...o,
          totalContacts: agg.newLeads,
          called:        agg.calls,
          connected:     agg.connected,
          interacted:    agg.interacted,
          qualified:     agg.qualified,
          talktimeMins:  agg.talkMinutes,
          spend:         agg.spend,
          // Hide rows with no activity in the selected window. Real data
          // can be zero for a draft outreach, an outreach whose entire
          // active window predates the filter, or a completed outreach
          // viewed at "Today" — surfacing them as all-zero rows would
          // confuse the funnel scan.
          _hasActivity:  agg.calls > 0 || agg.newLeads > 0,
        };
      });
  }, [allOutreach, statusTab, rangePreset]);

  const visible = scaled.filter(o => o._hasActivity);

  // ── Pagination ──────────────────────────────────────────────────────
  // 10 outreaches per page — same density convention as the other
  // listings in the product (campaigns, enquiries). Resets to page 1
  // whenever the visible set changes shape (status tab flip, range
  // change, just-launched row prepend) so the user doesn't get
  // stranded on a page that no longer exists.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);
  useEffect(() => {
    // Status tab flip or range change → snap back to page 1. Without
    // this the user could be on page 3 of Running, click Paused,
    // and see "no rows" because Paused only has 1 page.
    setPage(1);
  }, [statusTab, days]);
  const pageStart   = (page - 1) * PAGE_SIZE;
  const pageEnd     = Math.min(visible.length, pageStart + PAGE_SIZE);
  const pageVisible = visible.slice(pageStart, pageEnd);

  // Per-status counts for the tab badges. Calculated from allOutreach (not
  // scaled / visible) so the badge values don't change as the user clicks
  // between tabs — the count next to "Running" always means "total running
  // in the workspace", regardless of which tab is currently selected.
  const statusCounts = useMemo(() => {
    const counts: Record<OutreachStatus | "all", number> = {
      all:         allOutreach.length,
      draft:       0,
      in_progress: 0,
      completed:   0,
      paused:      0,
    };
    for (const o of allOutreach) counts[o.status]++;
    return counts;
  }, [allOutreach]);

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
    <motion.div variants={stagger} initial="hidden" animate="show" className="pb-12">
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
              {justLaunched.needsAudience
                ? "Outreach saved as draft — add an audience to start calling"
                : justLaunched.status === "draft"
                  ? "Saved as draft — add an audience to start calling"
                  : "Launched — your outreach is live"}
            </div>
            <div className="text-[11.5px] text-green-700 mt-0.5 truncate">
              <span className="font-medium">{justLaunched.name}</span>
              {" · "}{justLaunched.voiceAgent}
              {justLaunched.needsAudience
                ? " · no audience yet"
                : (
                  <>
                    {" · "}{justLaunched.totalContacts.toLocaleString()} leads
                    {justLaunched.status === "draft" && justLaunched.startDate
                      ? ` · starts ${justLaunched.startDate}${justLaunched.startTime ? ` at ${justLaunched.startTime}` : ""}`
                      : " — dialing has begun"}
                  </>
                )}
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

      {/* Spot Insights widget removed — we're not introducing Spot in
          this iteration. The widget code still lives in this file
          (commented out below for the empty state, and kept defined as
          SpotInsightsWidget) in case we bring it back; nothing
          renders on the listing while Spot is paused. */}

      {/* Row 2: aggregate widgets — Talktime / Spend / Performance funnel.
          4-col grid mirrors the detail page so Talktime + Spend stay the
          same compact size as on /outreach/[id]. The Performance funnel
          spans the remaining two columns because its bars can read very
          short when the top stage is much larger than the rest — extra
          width prevents the small stages from collapsing visually. */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4 mb-6">
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
          <div className="col-span-2">
            <PerformanceFunnel
              leads={agg.leads}
              dialed={agg.dialed}
              connected={agg.connected}
              interacted={agg.interacted}
              qualified={agg.qualified}
            />
          </div>
      </motion.div>

      {/* Status tabs — same segmented control pattern as /campaigns. Sits
          above the list so the user can narrow by lifecycle status in one
          click without opening a popover. Tab order puts the live states
          first (Running → Paused → Completed) so the user can scan their
          active work without their eye getting caught by Draft, which is
          a pre-launch parking lot and lives at the far end of the strip. */}
      <motion.div variants={fadeUp} className="flex items-center mb-3">
        <div className="inline-flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
          {(["all", "in_progress", "paused", "completed", "draft"] as const).map((s) => {
            const label =
              s === "all" ? "All" :
              s === "draft" ? "Draft" :
              s === "in_progress" ? "Running" :
              s === "paused" ? "Paused" :
              "Completed";
            const count = statusCounts[s];
            const isActive = statusTab === s;
            return (
              <button
                key={s}
                onClick={() => setStatusTab(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors duration-150 ${
                  isActive
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {label}
                <span className={`tabular-nums ${isActive ? "text-text-tertiary" : "text-text-tertiary"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* List — empty case is handled by the early-return above (Spot
          landing). Here we only need to handle the case where the user has
          outreaches but none matched the filters / time range. */}
      {visible.length === 0 ? (
        <div className="bg-white border border-border rounded-card px-5 py-10 text-center">
          <p className="text-[13px] text-text-secondary">
            No outreaches had activity in {rangeLabel.toLowerCase()}
            {statusTab !== "all" && " for the selected status"}.
          </p>
          <p className="text-[12px] text-text-tertiary mt-1">
            Try widening the time range or selecting more statuses.
          </p>
        </div>
      ) : (
        <motion.div variants={fadeUp} className="bg-white border border-border rounded-card overflow-hidden">
          <table className="w-full table-auto">
            <thead className="bg-surface-page/60 border-b border-border-subtle">
              <tr>
                <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                  Outreach
                </th>
                <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                  Status
                </th>
                {/* Funnel columns — Leads is the top of the funnel,
                    then Dialed / Connected / Interacted / Qualified
                    narrow into the bottom. Each cell renders both the
                    absolute number and the stage's conversion rate vs
                    the top, so the user can scan the funnel shape per
                    outreach without opening the detail page. */}
                <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                  Leads
                </th>
                <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                  Dialed
                </th>
                <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                  Connected
                </th>
                <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                  Interacted
                </th>
                <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                  Qualified
                </th>
                <th className="pl-6 pr-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                  Created on
                </th>
                <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                  Updated on
                </th>
                <th className="w-10 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageVisible.map((o, i) => (
                <OutreachRow key={o.id} o={o} onEdit={setEditingOutreach} alt={i % 2 === 1} />
              ))}
            </tbody>
          </table>

          {/* Pager — only renders when there's more than one page.
              Same chrome as the other product listings: range label
              on the left ("Showing 1–10 of 24"), Prev/Next pills on
              the right with a compact "Page X of Y" between them.
              Numeric page buttons are intentionally omitted for now;
              prev/next + the range label gives the user everything
              they need at this volume and keeps the footer quiet. */}
          {visible.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-surface-page/40">
              <div className="text-[11.5px] text-text-tertiary tabular-nums">
                Showing{" "}
                <span className="text-text-secondary font-medium">{pageStart + 1}</span>
                –
                <span className="text-text-secondary font-medium">{pageEnd}</span>{" "}
                of <span className="text-text-secondary font-medium">{visible.length.toLocaleString()}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 h-8 px-2.5 text-[12px] font-medium text-text-secondary border border-border bg-white rounded-button hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft size={12} strokeWidth={1.75} />
                  Prev
                </button>
                <span className="text-[11.5px] text-text-tertiary tabular-nums">
                  Page <span className="text-text-secondary font-medium">{page}</span> of{" "}
                  <span className="text-text-secondary font-medium">{totalPages}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 h-8 px-2.5 text-[12px] font-medium text-text-secondary border border-border bg-white rounded-button hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ArrowRight size={12} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Edit drawer — slides in from the right when a pencil is clicked. */}
      {editingOutreach && (
        <EditOutreachDrawer
          initial={{
            id: editingOutreach.id,
            name: editingOutreach.name,
            voiceAgentName: editingOutreach.voiceAgent,
          } satisfies EditOutreachInitial}
          onClose={() => setEditingOutreach(null)}
        />
      )}
    </motion.div>
  );
}
