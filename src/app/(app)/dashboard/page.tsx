"use client";

import { useState, useCallback } from "react";
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

// ── Trend Data ──────────────────────────────────────────────
const dates = Array.from({ length: 14 }, (_, i) => `Mar ${10 + i}`);

function makeTrend(start: number, end: number) {
  return Array.from({ length: 14 }, (_, i) => {
    const progress = i / 13;
    return Math.round((start + (end - start) * progress + (Math.random() * start * 0.05 - start * 0.025)) * 10) / 10;
  });
}

const dashboardTrends: Record<string, MetricChartDef> = {
  activeCampaigns: { key: "activeCampaigns", label: "Active Campaigns", unit: "number", data: makeTrend(7, 9) },
  spends: { key: "spends", label: "Spends", unit: "currency", data: makeTrend(540000, 680000) },
  totalLeads: { key: "totalLeads", label: "Total Leads", unit: "number", data: makeTrend(754, 845) },
  verifiedLeads: { key: "verifiedLeads", label: "Verified Leads", unit: "number", data: makeTrend(104, 127) },
  qualifiedLeads: { key: "qualifiedLeads", label: "Qualified Leads", unit: "number", data: makeTrend(63, 68) },
  cpl: { key: "cpl", label: "CPL", unit: "currency", data: makeTrend(1245, 1183) },
  cpvl: { key: "cpvl", label: "CPVL", unit: "currency", data: makeTrend(5192, 5354) },
  cpql: { key: "cpql", label: "CPQL", unit: "currency", data: makeTrend(9524, 10000) },
  verificationRate: { key: "verificationRate", label: "Verification Rate", unit: "percentage", data: makeTrend(13.8, 15) },
  qualificationRate: { key: "qualificationRate", label: "Qualification Rate", unit: "percentage", data: makeTrend(7.4, 8.1) },
  ctr: { key: "ctr", label: "CTR", unit: "percentage", data: makeTrend(1.6, 2.1) },
  connectRate: { key: "connectRate", label: "Connect Rate", unit: "percentage", data: makeTrend(72, 78.9) },
};

const allAvailableMetrics: MetricOption[] = [
  { key: "activeCampaigns", label: "Active Campaigns", category: "Overview", currentValue: "9" },
  { key: "spends", label: "Spends", category: "Overview", currentValue: "₹6.8L" },
  { key: "totalLeads", label: "Total Leads", category: "Leads", currentValue: "845" },
  { key: "verifiedLeads", label: "Verified Leads", category: "Leads", currentValue: "127" },
  { key: "qualifiedLeads", label: "Qualified Leads", category: "Leads", currentValue: "68" },
  { key: "cpl", label: "CPL", category: "Cost", currentValue: "₹1,183" },
  { key: "cpvl", label: "CPVL", category: "Cost", currentValue: "₹5,354" },
  { key: "cpql", label: "CPQL", category: "Cost", currentValue: "₹10,000" },
  { key: "verificationRate", label: "Verification Rate", category: "Rates", currentValue: "15%" },
  { key: "qualificationRate", label: "Qualification Rate", category: "Rates", currentValue: "8.1%" },
  { key: "ctr", label: "CTR", category: "Rates", currentValue: "2.1%" },
  { key: "connectRate", label: "Voice Connect Rate", category: "Rates", currentValue: "78.9%" },
];

const MAX_CHART_METRICS = 3;

// Mock data by date range
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

const metricsByRange: Record<string, MetricSet> = {
  "30": {
    activeCampaigns: { value: 9, prev: 7, delta: "+2", pct: 28.6 },
    spends: { value: "₹6.8L", full: "₹6,80,000", prev: "₹5.9L", delta: "+₹90K", pct: 15 },
    totalLeads: { value: 845, prev: 754, delta: "+91", pct: 12 },
    verifiedLeads: { value: 127, prev: 104, delta: "+23", pct: 22.1, rate: "15%" },
    qualifiedLeads: { value: 68, prev: 63, delta: "+5", pct: 7.9, rate: "8.1%" },
    cpl: { value: "₹1,183", prev: "₹1,245", delta: "-₹62", pct: 5 },
    cpvl: { value: "₹5,354", prev: "₹5,192", delta: "+₹162", pct: 3.1 },
    cpql: { value: "₹10,000", prev: "₹9,524", delta: "+₹476", pct: 5 },
  },
  "7": {
    activeCampaigns: { value: 9, prev: 9, delta: "—", pct: 0 },
    spends: { value: "₹1.58L", full: "₹1,58,000", prev: "₹1.41L", delta: "+₹17K", pct: 12 },
    totalLeads: { value: 198, prev: 177, delta: "+21", pct: 11.9 },
    verifiedLeads: { value: 32, prev: 26, delta: "+6", pct: 23.1, rate: "16.2%" },
    qualifiedLeads: { value: 18, prev: 15, delta: "+3", pct: 20, rate: "9.1%" },
    cpl: { value: "₹798", prev: "₹797", delta: "-₹1", pct: 0.1 },
    cpvl: { value: "₹4,938", prev: "₹5,423", delta: "-₹485", pct: 8.9 },
    cpql: { value: "₹8,778", prev: "₹9,400", delta: "-₹622", pct: 6.6 },
  },
  "14": {
    activeCampaigns: { value: 9, prev: 8, delta: "+1", pct: 12.5 },
    spends: { value: "₹3.2L", full: "₹3,20,000", prev: "₹2.8L", delta: "+₹40K", pct: 14.3 },
    totalLeads: { value: 412, prev: 368, delta: "+44", pct: 12 },
    verifiedLeads: { value: 62, prev: 51, delta: "+11", pct: 21.6, rate: "15%" },
    qualifiedLeads: { value: 34, prev: 30, delta: "+4", pct: 13.3, rate: "8.3%" },
    cpl: { value: "₹1,068", prev: "₹1,087", delta: "-₹19", pct: 1.7 },
    cpvl: { value: "₹5,161", prev: "₹5,490", delta: "-₹329", pct: 6 },
    cpql: { value: "₹9,412", prev: "₹9,333", delta: "+₹79", pct: 0.8 },
  },
  "yesterday": {
    activeCampaigns: { value: 9, prev: 9, delta: "—", pct: 0 },
    spends: { value: "₹24.2K", full: "₹24,200", prev: "₹22.8K", delta: "+₹1.4K", pct: 6.1 },
    totalLeads: { value: 32, prev: 27, delta: "+5", pct: 18.5 },
    verifiedLeads: { value: 6, prev: 4, delta: "+2", pct: 50, rate: "18.8%" },
    qualifiedLeads: { value: 3, prev: 2, delta: "+1", pct: 50, rate: "9.4%" },
    cpl: { value: "₹756", prev: "₹844", delta: "-₹88", pct: 10.4 },
    cpvl: { value: "₹4,033", prev: "₹5,700", delta: "-₹1,667", pct: 29.2 },
    cpql: { value: "₹8,067", prev: "₹11,400", delta: "-₹3,333", pct: 29.2 },
  },
};

// Fallback to 30d
function getMetrics(range: string): MetricSet {
  return metricsByRange[range] || metricsByRange["30"];
}

function getPrevLabel(range: string) {
  // "was X yesterday" / "was X last week" / "was X in prev. period"
  const labels: Record<string, string> = {
    "today": "yesterday",
    "yesterday": "day before",
    "thisweek": "last week",
    "thismonth": "last month",
  };
  return labels[range] || "in prev. period";
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

  const selectedChartDefs = selectedMetrics.map((k) => dashboardTrends[k]).filter(Boolean);
  const m = getMetrics(dateRange);
  const pl = getPrevLabel(dateRange);

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
