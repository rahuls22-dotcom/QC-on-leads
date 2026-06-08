"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricChart } from "@/components/shared/metric-chart";
import type { MetricChartDef, MetricOption } from "@/components/shared/metric-chart";
import { Insights } from "@/components/dashboard/insights";
import { ProjectPerformanceTable } from "@/components/dashboard/project-performance-table";
import { RecentlyQualified } from "@/components/dashboard/recently-qualified";
import { VoiceAgentPerformance } from "@/components/dashboard/voice-agent-performance";
import {
  voiceAgentMetrics,
  disqualificationReasons,
} from "@/lib/mock-data";
import { outreachList } from "@/lib/outreach-data";
import {
  workspaceDailySeries,
  rangeWindowFromPreset,
  prevWindow,
  sumInRange,
  sliceRange,
  pctChange,
  safeRatio,
  SERIES_LENGTH,
} from "@/lib/daily-series";
import { GettingStartedChecklist } from "@/components/dashboard/getting-started";
import { IllustrationCampaigns, IllustrationAgents, IllustrationProjects, IllustrationLeads } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";
import { useAppStore } from "@/lib/store";
import { useCurrentScope, useCurrentWorkspaceLabel } from "@/lib/workspace-store";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

// ── Dashboard metrics — derived from workspace daily series ────────────────
//
// Previously this file had a giant `metricsByRange` lookup with 4 hand-tuned
// presets and a silent fallback to 30d for every other preset (this week,
// last week, this month, lifetime). That made the dashboard read as a
// static prototype — pick any range outside the 4 presets and nothing
// moved. It's now derived from the unified workspace daily series, so
// any preset (and any future custom range) returns coherent numbers
// with trend deltas based on the prior comparable window.

const MAX_CHART_METRICS = 3;

type MetricSet = {
  activeCampaigns: { value: number; prev: number; delta: string; pct: number };
  spends: { value: string; full: string; prev: string; delta: string; pct: number };
  totalLeads: { value: number; prev: number; delta: string; pct: number };
  verifiedLeads: { value: number; prev: number; delta: string; pct: number; rate: string };
  qualifiedLeads: { value: number; prev: number; delta: string; pct: number; rate: string };
  cpl: { value: string; prev: string; delta: string; pct: number };
  cpvl: { value: string; prev: string; delta: string; pct: number };
  cpql: { value: string; prev: string; delta: string; pct: number };
};

// Compact Indian-format INR — "₹6.8L" / "₹85K" / "₹1,234".
function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1_000_000 ? 1 : 2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// Full Indian-comma-style INR for the Spends tooltip — "₹6,80,000".
function formatINRFull(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// "+₹62" / "-₹1,234" — currency delta with sign.
function formatINRDelta(diff: number): string {
  if (diff === 0) return "—";
  const sign = diff > 0 ? "+" : "-";
  return `${sign}${formatINR(Math.abs(diff))}`;
}

// "+91" / "-7" / "—".
function formatNumDelta(diff: number): string {
  if (diff === 0) return "—";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${Math.round(diff).toLocaleString("en-IN")}`;
}

// "was 754 last week" / "was 754 in prev. period". This label is the
// MetricCard's hover-prev text, so it has to read naturally for any
// range the user picks — not just the 4 we used to hardcode.
function getPrevLabel(range: string) {
  const labels: Record<string, string> = {
    today: "yesterday",
    yesterday: "day before",
    thisweek: "last week",
    "7": "previous 7 days",
    "14": "previous 14 days",
    "30": "previous 30 days",
    thismonth: "last month",
    lastmonth: "month before",
    lastweek: "week before",
    lifetime: "in prev. period",
  };
  return labels[range] || "in prev. period";
}

// Build the metric set for the given preset by summing the workspace
// daily series over the current window and its prior comparable window.
// Trend chip percentages, deltas, and previous values all stay in sync
// because they come from the same two numbers.
function buildMetricSet(preset: string): MetricSet {
  const series = workspaceDailySeries();
  const win = rangeWindowFromPreset(preset);
  const prev = prevWindow(win);
  const curr = sumInRange(series, win);
  const prv  = sumInRange(series, prev);

  // Active campaigns is a workspace-level constant — count of outreaches
  // currently running. Doesn't really have a time dimension; we still
  // produce a small delta vs an arbitrary prior so the trend chip can
  // animate, but the value itself isn't windowed.
  const activeNow  = outreachList.filter((o) => o.status === "in_progress").length;
  const activePrev = Math.max(0, activeNow - 1);

  // Cost-per-lead family — derived ratios. Each one's previous value is
  // computed the same way over the prior window so the % change actually
  // means something. Note the trend semantics flip for CPL/CPVL/CPQL:
  // a fall in cost-per is GOOD, so trend.positive = (curr < prv).
  const cpl  = safeRatio(curr.spend, curr.newLeads);
  const cpvl = safeRatio(curr.spend, curr.verifiedLeads);
  const cpql = safeRatio(curr.spend, curr.qualified);
  const cplPrev  = safeRatio(prv.spend, prv.newLeads);
  const cpvlPrev = safeRatio(prv.spend, prv.verifiedLeads);
  const cpqlPrev = safeRatio(prv.spend, prv.qualified);

  // Verification / qualification rates — percentages over the window.
  const verifRate = safeRatio(curr.verifiedLeads, curr.newLeads) * 100;
  const qualRate  = safeRatio(curr.qualified,    curr.newLeads) * 100;

  return {
    activeCampaigns: {
      value: activeNow,
      prev:  activePrev,
      delta: formatNumDelta(activeNow - activePrev),
      pct:   pctChange(activeNow, activePrev),
    },
    spends: {
      value: formatINR(curr.spend),
      full:  formatINRFull(curr.spend),
      prev:  formatINR(prv.spend),
      delta: formatINRDelta(curr.spend - prv.spend),
      pct:   Math.abs(pctChange(curr.spend, prv.spend)),
    },
    totalLeads: {
      value: curr.newLeads,
      prev:  prv.newLeads,
      delta: formatNumDelta(curr.newLeads - prv.newLeads),
      pct:   Math.abs(pctChange(curr.newLeads, prv.newLeads)),
    },
    verifiedLeads: {
      value: curr.verifiedLeads,
      prev:  prv.verifiedLeads,
      delta: formatNumDelta(curr.verifiedLeads - prv.verifiedLeads),
      pct:   Math.abs(pctChange(curr.verifiedLeads, prv.verifiedLeads)),
      rate:  `${verifRate.toFixed(1)}%`,
    },
    qualifiedLeads: {
      value: curr.qualified,
      prev:  prv.qualified,
      delta: formatNumDelta(curr.qualified - prv.qualified),
      pct:   Math.abs(pctChange(curr.qualified, prv.qualified)),
      rate:  `${qualRate.toFixed(1)}%`,
    },
    cpl: {
      value: formatINR(cpl),
      prev:  formatINR(cplPrev),
      delta: formatINRDelta(cpl - cplPrev),
      pct:   Math.abs(pctChange(cpl, cplPrev)),
    },
    cpvl: {
      value: formatINR(cpvl),
      prev:  formatINR(cpvlPrev),
      delta: formatINRDelta(cpvl - cpvlPrev),
      pct:   Math.abs(pctChange(cpvl, cpvlPrev)),
    },
    cpql: {
      value: formatINR(cpql),
      prev:  formatINR(cpqlPrev),
      delta: formatINRDelta(cpql - cpqlPrev),
      pct:   Math.abs(pctChange(cpql, cpqlPrev)),
    },
  };
}

// Build the per-metric chart series for the selected window. The
// MetricChart consumes a flat number[] per metric; we slice the
// workspace daily series into the window and project each day onto
// the requested metric. Rate metrics (CPL etc.) are computed per day.
function buildTrendDefs(preset: string): Record<string, MetricChartDef> {
  const series = workspaceDailySeries();
  const win = rangeWindowFromPreset(preset);
  const slice = sliceRange(series, win);

  const spend          = slice.map((d) => d.spend);
  const leads          = slice.map((d) => d.newLeads);
  const verified       = slice.map((d) => d.verifiedLeads);
  const qualified      = slice.map((d) => d.qualified);
  const connected      = slice.map((d) => d.connected);
  const calls          = slice.map((d) => d.calls);

  // Active campaigns is workspace-level — we draw a flat-with-jitter line
  // so the chart still has shape but doesn't imply windowed changes.
  const activeNow = outreachList.filter((o) => o.status === "in_progress").length;
  const activeSeries = slice.map((_, i) => activeNow - (i < 2 ? 1 : 0));

  // Per-day ratios for cost-per cards. Using safeRatio so days with
  // zero leads don't break the line with NaN / Infinity gaps.
  const cplSeries  = slice.map((d) => safeRatio(d.spend, d.newLeads));
  const cpvlSeries = slice.map((d) => safeRatio(d.spend, d.verifiedLeads));
  const cpqlSeries = slice.map((d) => safeRatio(d.spend, d.qualified));
  const verifRate  = slice.map((d) => safeRatio(d.verifiedLeads, d.newLeads) * 100);
  const qualRate   = slice.map((d) => safeRatio(d.qualified,    d.newLeads) * 100);
  // CTR + connect rate aren't fed by outreach (no impressions in this
  // mock) so we shape them off voice activity as a stand-in. They still
  // move with the window, just don't represent ad performance.
  const ctrSeries     = slice.map(() => 1.6 + Math.random() * 0.5);
  const connectSeries = slice.map((d) => safeRatio(d.connected, d.calls) * 100);

  return {
    activeCampaigns:   { key: "activeCampaigns",   label: "Active Campaigns",   unit: "number",     data: activeSeries },
    spends:            { key: "spends",            label: "Spends",             unit: "currency",   data: spend },
    totalLeads:        { key: "totalLeads",        label: "Total Leads",        unit: "number",     data: leads },
    verifiedLeads:     { key: "verifiedLeads",     label: "Verified Leads",     unit: "number",     data: verified },
    qualifiedLeads:    { key: "qualifiedLeads",    label: "Qualified Leads",    unit: "number",     data: qualified },
    cpl:               { key: "cpl",               label: "CPL",                unit: "currency",   data: cplSeries },
    cpvl:              { key: "cpvl",              label: "CPVL",               unit: "currency",   data: cpvlSeries },
    cpql:              { key: "cpql",              label: "CPQL",               unit: "currency",   data: cpqlSeries },
    verificationRate:  { key: "verificationRate",  label: "Verification Rate",  unit: "percentage", data: verifRate },
    qualificationRate: { key: "qualificationRate", label: "Qualification Rate", unit: "percentage", data: qualRate },
    ctr:               { key: "ctr",               label: "CTR",                unit: "percentage", data: ctrSeries },
    connectRate:       { key: "connectRate",       label: "Connect Rate",       unit: "percentage", data: connectSeries },
  };
}

export default function DashboardPage() {
  const { isEmpty } = useDemoMode();
  const projects = useAppStore((s) => s.projects);
  const hasProjects = projects.length > 0;
  const wsLabel = useCurrentWorkspaceLabel();
  const scope = useCurrentScope();
  const isAllWorkspaces = scope.kind === "all";
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState("30");

  const toggleMetric = useCallback((key: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_CHART_METRICS) return prev;
      return [...prev, key];
    });
  }, []);

  // Recompute metrics + chart series whenever the date range changes.
  // Both are pure derivations from the workspace daily series — cheap,
  // and memoising here means the MetricCard / MetricChart props are
  // referentially stable when the range is unchanged (selectedMetrics
  // toggling shouldn't reshape the underlying series).
  const m  = useMemo(() => buildMetricSet(dateRange), [dateRange]);
  const trends = useMemo(() => buildTrendDefs(dateRange), [dateRange]);
  const pl = getPrevLabel(dateRange);

  // Date labels for the chart x-axis — one per day in the window, in
  // "Jun 6" form. The chart's data array length has to match this, so
  // we drive both off the same RangeWindow.
  const dates = useMemo(() => {
    const win = rangeWindowFromPreset(dateRange);
    const today = new Date();
    const out: string[] = [];
    // Today is the last day in the series; older days walk backwards.
    const daysBackFromToday = (SERIES_LENGTH - 1) - win.endIndex;
    for (let i = 0; i < win.days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - daysBackFromToday - (win.days - 1 - i));
      out.push(d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
    }
    return out;
  }, [dateRange]);

  // The metric picker shows "current value" beside each metric so the
  // user can pick by reading the live number. Derive these from the
  // same metric set so the picker doesn't lie about today's values.
  const allAvailableMetrics: MetricOption[] = useMemo(() => ([
    { key: "activeCampaigns",   label: "Active Campaigns",   category: "Overview", currentValue: String(m.activeCampaigns.value) },
    { key: "spends",            label: "Spends",             category: "Overview", currentValue: m.spends.value },
    { key: "totalLeads",        label: "Total Leads",        category: "Leads",    currentValue: String(m.totalLeads.value) },
    { key: "verifiedLeads",     label: "Verified Leads",     category: "Leads",    currentValue: String(m.verifiedLeads.value) },
    { key: "qualifiedLeads",    label: "Qualified Leads",    category: "Leads",    currentValue: String(m.qualifiedLeads.value) },
    { key: "cpl",               label: "CPL",                category: "Cost",     currentValue: m.cpl.value },
    { key: "cpvl",              label: "CPVL",               category: "Cost",     currentValue: m.cpvl.value },
    { key: "cpql",              label: "CPQL",               category: "Cost",     currentValue: m.cpql.value },
    { key: "verificationRate",  label: "Verification Rate",  category: "Rates",    currentValue: m.verifiedLeads.rate },
    { key: "qualificationRate", label: "Qualification Rate", category: "Rates",    currentValue: m.qualifiedLeads.rate },
    { key: "ctr",               label: "CTR",                category: "Rates",    currentValue: "2.1%" },
    { key: "connectRate",       label: "Voice Connect Rate", category: "Rates",    currentValue: `${(trends.connectRate.data.reduce((a, b) => a + b, 0) / Math.max(1, trends.connectRate.data.length)).toFixed(1)}%` },
  ]), [m, trends]);

  const selectedChartDefs = selectedMetrics.map((k) => trends[k]).filter(Boolean);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">
            {wsLabel} · Lead Generation
          </div>
          <h1 className="text-page-title text-text-primary">Dashboard</h1>
        </div>
        {/* Date range only applies to the per-workspace metrics; the
            all-workspaces rollup table is point-in-time. */}
        {!isAllWorkspaces && <DateRangeSelector onChange={setDateRange} />}
      </motion.div>

      {isAllWorkspaces ? (
        /* All-workspaces view: only the workspace performance rollup.
           Per spec, no other metric cards / insights / voice agent /
           recently qualified — drill into a single workspace to see
           those. */
        <motion.div variants={fadeUp}>
          <ProjectPerformanceTable />
        </motion.div>
      ) : isEmpty ? (
        <>
          {/* Getting Started Checklist — only in empty state */}
          <motion.div variants={fadeUp} className="mb-5">
            <GettingStartedChecklist />
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
            {[
              ...(!hasProjects
                ? [
                    {
                      illustration: <IllustrationProjects />,
                      title: "Create a project",
                      description: "Group campaigns and leads by property or development",
                      ctaLabel: "Create project",
                      href: "/projects",
                    },
                  ]
                : []),
              {
                illustration: <IllustrationCampaigns />,
                title: "Create a campaign",
                description: "Launch ads and start capturing leads",
                ctaLabel: "Create campaign",
                href: "/campaigns/create",
              },
              {
                illustration: <IllustrationAgents />,
                title: "Connect a voice agent",
                description: "Automate lead verification with AI-powered calls",
                ctaLabel: "Set up agent",
                href: "/agents-mvp",
              },
              ...(hasProjects
                ? [
                    {
                      illustration: <IllustrationLeads />,
                      title: "Explore your CRM",
                      description: "Track, filter, and manage all your incoming leads",
                      ctaLabel: "Go to CRM",
                      href: "/enquiries",
                    },
                  ]
                : []),
            ].map((card) => (
              <a
                key={card.href}
                href={card.href}
                className="group bg-white border border-border rounded-card p-5 flex flex-col items-center text-center hover:shadow-card-hover hover:border-border-hover transition-all duration-150"
              >
                <div className="mb-4">{card.illustration}</div>
                <h3 className="text-card-title text-text-primary mb-1">{card.title}</h3>
                <p className="text-meta text-text-secondary mb-5">{card.description}</p>
                <span className="mt-auto h-8 px-3 text-[12px] font-medium text-white bg-accent rounded-button hover:bg-accent-hover transition-colors duration-150 inline-flex items-center">
                  {card.ctaLabel}
                </span>
              </a>
            ))}
          </motion.div>
        </>
      ) : (
      <>
      {/* Metric cards — 4x2 grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3 mb-3" key={dateRange}>
        <MetricCard label="Active campaigns" value={m.activeCampaigns.value} previous={m.activeCampaigns.prev} previousLabel={pl}
          delta={m.activeCampaigns.delta} trend={m.activeCampaigns.pct ? { value: m.activeCampaigns.pct, direction: "up" } : undefined}
          chartKey="activeCampaigns" isSelected={selectedMetrics.includes("activeCampaigns")} onToggle={toggleMetric} />
        <MetricCard label="Spends" value={m.spends.value} previous={m.spends.prev} previousLabel={pl}
          delta={m.spends.delta} tooltip={m.spends.full} trend={{ value: m.spends.pct, direction: "up" }}
          chartKey="spends" isSelected={selectedMetrics.includes("spends")} onToggle={toggleMetric} />
        <MetricCard label="Total leads" value={m.totalLeads.value} previous={m.totalLeads.prev} previousLabel={pl}
          delta={m.totalLeads.delta} trend={{ value: m.totalLeads.pct, direction: "up" }}
          chartKey="totalLeads" isSelected={selectedMetrics.includes("totalLeads")} onToggle={toggleMetric} />
        <MetricCard label="Verified leads" value={m.verifiedLeads.value} previous={m.verifiedLeads.prev} previousLabel={pl}
          delta={m.verifiedLeads.delta} trend={{ value: m.verifiedLeads.pct, direction: "up" }}
          subMetric={`${m.verifiedLeads.rate} verification rate`}
          chartKey="verifiedLeads" isSelected={selectedMetrics.includes("verifiedLeads")} onToggle={toggleMetric} />
        <MetricCard label="Qualified leads" value={m.qualifiedLeads.value} previous={m.qualifiedLeads.prev} previousLabel={pl}
          delta={m.qualifiedLeads.delta} trend={{ value: m.qualifiedLeads.pct, direction: "up" }}
          subMetric={`${m.qualifiedLeads.rate} qualification rate`}
          chartKey="qualifiedLeads" isSelected={selectedMetrics.includes("qualifiedLeads")} onToggle={toggleMetric} />
        <MetricCard label="CPL" value={m.cpl.value} previous={m.cpl.prev} previousLabel={pl}
          delta={m.cpl.delta} trend={{ value: m.cpl.pct, direction: "down", positive: true }}
          chartKey="cpl" isSelected={selectedMetrics.includes("cpl")} onToggle={toggleMetric} />
        <MetricCard label="CPVL" value={m.cpvl.value} previous={m.cpvl.prev} previousLabel={pl}
          delta={m.cpvl.delta} tooltip="Cost per verified lead"
          trend={{ value: m.cpvl.pct, direction: m.cpvl.delta.startsWith("-") ? "down" : "up", positive: m.cpvl.delta.startsWith("-") }}
          chartKey="cpvl" isSelected={selectedMetrics.includes("cpvl")} onToggle={toggleMetric} />
        <MetricCard label="CPQL" value={m.cpql.value} previous={m.cpql.prev} previousLabel={pl}
          delta={m.cpql.delta} tooltip="Cost per qualified lead"
          trend={{ value: m.cpql.pct, direction: m.cpql.delta.startsWith("-") ? "down" : "up", positive: m.cpql.delta.startsWith("-") }}
          chartKey="cpql" isSelected={selectedMetrics.includes("cpql")} onToggle={toggleMetric} />
      </motion.div>

      {/* Chart with Add Metric dropdown */}
      {selectedChartDefs.length > 0 ? (
        <motion.div variants={fadeUp} className="mb-5">
          <MetricChart metrics={selectedChartDefs} dates={dates} onRemove={toggleMetric}
            onAdd={toggleMetric} availableMetrics={allAvailableMetrics} selectedKeys={selectedMetrics} maxMetrics={MAX_CHART_METRICS} />
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="mb-5">
          <div className="text-[11px] text-text-tertiary text-center py-2">Click any metric card to visualize its trend</div>
        </motion.div>
      )}

      {/* Two column: Insights + Voice Agent Performance */}
      <motion.div variants={fadeUp} className="grid grid-cols-[3fr_2fr] gap-5 mb-5">
        <Insights />
        <VoiceAgentPerformance metrics={voiceAgentMetrics} disqualificationReasons={disqualificationReasons} />
      </motion.div>

      {/* Two column: Campaign table + Recently qualified leads */}
      <motion.div variants={fadeUp} className="grid grid-cols-[3fr_2fr] gap-5">
        <ProjectPerformanceTable />
        <RecentlyQualified />
      </motion.div>
      </>
      )}
    </motion.div>
  );
}
