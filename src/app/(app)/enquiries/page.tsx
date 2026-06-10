"use client";

import { Suspense, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { PRODUCTS } from "@/lib/products-data";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Search,
  Download,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  ShieldCheck,
  ExternalLink,
  Copy,
  Phone,
  Bot,
  SlidersHorizontal,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricChart } from "@/components/shared/metric-chart";
import type { MetricChartDef, MetricOption } from "@/components/shared/metric-chart";
import { format } from "date-fns";
import {
  allLeads,
  campaignFilterOptions,
  leadStageLabels,
  leadStageColors,
} from "@/lib/enquiries-data";
import type { EnquiryLead, LeadStage } from "@/lib/enquiries-data";
import { LeadDetailPanel } from "@/components/campaigns/lead-detail-panel";
import type {
  LeadTemperature,
  LeadQualification,
} from "@/lib/campaign-data";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationLeads, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const avatarColors = ["#F87171", "#FB923C", "#FBBF24", "#34D399", "#60A5FA", "#A78BFA", "#F472B6", "#6EE7B7"];

// ── Badge Components ────────────────────────────────────────
function LeadStageBadge({ stage }: { stage: LeadStage }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${leadStageColors[stage]}`}
    >
      {leadStageLabels[stage]}
    </span>
  );
}

function TemperatureDot({ temp }: { temp: LeadTemperature }) {
  const config = {
    hot: { label: "Hot", color: "#DC2626" },
    warm: { label: "Warm", color: "#F59E0B" },
    lukewarm: { label: "Lukewarm", color: "#9CA3AF" },
    cold: { label: "Cold", color: "#3B82F6" },
  };
  const { label, color } = config[temp];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary whitespace-nowrap">
      <span
        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function QualificationBadge({ status }: { status: LeadQualification }) {
  const config = {
    qualified: { label: "Qualified", cls: "bg-[#F0FDF4] text-[#15803D]" },
    not_qualified: {
      label: "Not Qualified",
      cls: "bg-[#FEF2F2] text-[#DC2626]",
    },
    pending: { label: "N/A", cls: "bg-[#F0F0F0] text-text-secondary" },
  };
  const { label, cls } = config[status];
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}
    >
      {label}
    </span>
  );
}

function TemperatureBadge({ temp }: { temp: LeadTemperature }) {
  const config = {
    hot: { label: "Hot", cls: "bg-[#FEF2F2] text-[#DC2626]" },
    warm: { label: "Warm", cls: "bg-[#FEF3C7] text-[#92400E]" },
    lukewarm: { label: "Lukewarm", cls: "bg-[#F0F0F0] text-text-secondary" },
    cold: { label: "Cold", cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  };
  const { label, cls } = config[temp];
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}
    >
      {label}
    </span>
  );
}

function NextActionCell({ action }: { action: string | null }) {
  if (!action) return <span className="text-[11px] text-text-tertiary">—</span>;
  if (action === "Callback From Sales" || action === "Send to CRM") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary whitespace-nowrap">
        <Phone size={12} strokeWidth={1.5} className="text-text-tertiary" />
        {action === "Send to CRM" ? "Callback From Sales" : action}
      </span>
    );
  }
  if (action === "Bot Follow Up") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary whitespace-nowrap">
        <Bot size={12} strokeWidth={1.5} className="text-text-tertiary" />
        {action}
      </span>
    );
  }
  return <span className="text-[12px] text-text-secondary">{action}</span>;
}

function formatLeadStatus(status: string) {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Lead detail panel: using LeadDetailPanel from @/components/campaigns/lead-detail-panel

// ── Main Page ───────────────────────────────────────────────
const PAGE_SIZE = 10;

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 10px center",
};

// Date labels for the metric chart — the last 14 days ending today.
// Was previously a static "Mar 10–23" array which never reflected
// today's date; now anchored on `new Date()` so the chart's x-axis
// always reads as "the past two weeks".
function lastFourteenDayLabels(): string[] {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  });
}

// Distribute a total across a 14-day window with realistic shape —
// weekday/weekend dip + small noise. Same pattern used by the daily-
// series module on the outreach side. Total sums to roughly `count` so
// the chart's max bar ≈ the headline number, which makes the visual
// scale match the card without needing a separate axis spec.
function shapeFourteenDays(count: number, seed: number): number[] {
  if (count <= 0) return new Array(14).fill(0);
  const weights: number[] = [];
  for (let i = 0; i < 14; i++) {
    const dow = (new Date().getDay() - (13 - i) + 14) % 7;
    const isWeekend = dow === 0 || dow === 6;
    const baseline = isWeekend ? 0.45 : 1;
    const noise = 1 + (((seed * 31 + i * 17) % 100) / 100 - 0.5) * 0.3;
    weights.push(baseline * noise);
  }
  const sumW = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.max(0, Math.round((w / sumW) * count)));
}

export default function EnquiriesPage() {
  return (
    <Suspense fallback={<div />}>
      <EnquiriesPageInner />
    </Suspense>
  );
}

function EnquiriesPageInner() {
  const { isEmpty } = useDemoMode();
  const searchParams = useSearchParams();
  // Deep-link from a project: /enquiries?product=<id>. Lead data isn't
  // product-aware yet, so we surface an honest banner rather than fake a
  // filter — true per-product lead filtering is a follow-up.
  const productParam = searchParams.get("product");
  const linkedProduct = productParam
    ? PRODUCTS.find((p) => p.id === productParam)
    : null;
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("All Campaigns");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "qualified" | "not_qualified" | "pending"
  >("all");
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<EnquiryLead | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const toggleMetric = useCallback((key: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  }, []);

  const filtered = useMemo(() => {
    if (isEmpty) return [];
    return allLeads.filter((l) => {
      if (
        campaignFilter !== "All Campaigns" &&
        l.campaign !== campaignFilter
      )
        return false;
      if (statusFilter !== "all" && l.aiQualification !== statusFilter)
        return false;
      if (
        search &&
        !l.name.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone.includes(search) &&
        !l.campaign.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [search, campaignFilter, statusFilter, isEmpty]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Live metric counts derived from the filtered set. Was previously a
  // hardcoded `enquiryStats` constant that never changed regardless of
  // which filters the user applied — picking "Godrej Reflections" still
  // showed "845 total leads" even though only a fraction of those were
  // from that campaign. Now the cards reflect exactly what's in the
  // table below them.
  const counts = useMemo(() => {
    const total        = filtered.length;
    const verified     = filtered.filter((l) => l.verified).length;
    const qualified    = filtered.filter((l) => l.aiQualification === "qualified").length;
    const notQualified = filtered.filter((l) => l.aiQualification === "not_qualified").length;
    const pending      = filtered.filter((l) => l.aiQualification === "pending").length;
    return { total, verified, qualified, notQualified, pending };
  }, [filtered]);

  // Chart trends — distribute each count across the last 14 days using
  // the shared shapeFourteenDays helper. Sum of each series ≈ that
  // metric's count, so the chart's scale and the card's value never
  // disagree. Date labels recompute too so the x-axis always reads as
  // the actual past two weeks.
  const leadDates  = useMemo(lastFourteenDayLabels, []);
  const leadTrends = useMemo<Record<string, MetricChartDef>>(() => ({
    total:        { key: "total",        label: "Total Leads",   unit: "number", data: shapeFourteenDays(counts.total,        1) },
    verified:     { key: "verified",     label: "Verified",      unit: "number", data: shapeFourteenDays(counts.verified,     2) },
    qualified:    { key: "qualified",    label: "Qualified",     unit: "number", data: shapeFourteenDays(counts.qualified,    3) },
    notQualified: { key: "notQualified", label: "Not Qualified", unit: "number", data: shapeFourteenDays(counts.notQualified, 4) },
    pending:      { key: "pending",      label: "Follow Up",     unit: "number", data: shapeFourteenDays(counts.pending,      5) },
  }), [counts]);

  const leadMetricOptions: MetricOption[] = useMemo(() => ([
    { key: "total",        label: "Total Leads",   category: "Leads", currentValue: String(counts.total) },
    { key: "verified",     label: "Verified",      category: "Leads", currentValue: String(counts.verified) },
    { key: "qualified",    label: "Qualified",     category: "Leads", currentValue: String(counts.qualified) },
    { key: "notQualified", label: "Not Qualified", category: "Leads", currentValue: String(counts.notQualified) },
    { key: "pending",      label: "Follow Up",     category: "Leads", currentValue: String(counts.pending) },
  ]), [counts]);

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">CRM</div>
          <h1 className="text-page-title text-text-primary">
            Leads ({counts.total})
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[240px]">
            <Search
              size={14}
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 text-[12px] border border-border rounded-input bg-white focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
            <SlidersHorizontal size={13} strokeWidth={1.5} />
            Filters
          </button>
          <button className="inline-flex items-center gap-1.5 h-8 px-4 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
            <Download size={13} strokeWidth={1.5} />
            Export Leads
          </button>
        </div>
      </div>

      {/* Came in from a project — honest banner; lead data isn't per-product yet. */}
      {linkedProduct && (
        <div className="mb-4 flex items-center gap-2 bg-[#FEFCE8] border border-[#FDE68A] rounded-card px-3.5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#92740E]">
            {linkedProduct.name}
          </span>
          <span className="text-[12px] text-[#92740E]/90">
            Showing all leads — per-product lead filtering is coming soon.
          </span>
        </div>
      )}

      {/* Metric Cards — derived from `counts` (the filtered lead set).
          Every card recomputes when the user changes campaign filter,
          status filter, or search. Previously these read from a static
          `enquiryStats` constant so they never moved. */}
      <div className="grid grid-cols-5 gap-2.5 mb-3">
        <MetricCard label="Total" value={counts.total}
          chartKey="total" isSelected={selectedMetrics.includes("total")} onToggle={toggleMetric} />
        <MetricCard label="Verified" value={counts.verified}
          subMetric={counts.total > 0 ? `${Math.round((counts.verified / counts.total) * 100)}% rate` : "—"}
          chartKey="verified" isSelected={selectedMetrics.includes("verified")} onToggle={toggleMetric} />
        <MetricCard label="Qualified" value={counts.qualified}
          subMetric={counts.total > 0 ? `${Math.round((counts.qualified / counts.total) * 100)}% rate` : "—"}
          chartKey="qualified" isSelected={selectedMetrics.includes("qualified")} onToggle={toggleMetric} />
        <MetricCard label="Not Qualified" value={counts.notQualified}
          chartKey="notQualified" isSelected={selectedMetrics.includes("notQualified")} onToggle={toggleMetric} />
        <MetricCard label="Follow Up" value={counts.pending}
          chartKey="pending" isSelected={selectedMetrics.includes("pending")} onToggle={toggleMetric} />
      </div>

      {/* Chart */}
      {selectedMetrics.length > 0 && (
        <div className="mb-5">
          <MetricChart
            metrics={selectedMetrics.map((k) => leadTrends[k]).filter(Boolean)}
            dates={leadDates} onRemove={toggleMetric}
            onAdd={toggleMetric} availableMetrics={leadMetricOptions}
            selectedKeys={selectedMetrics} maxMetrics={3} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={campaignFilter}
          onChange={(e) => {
            setCampaignFilter(e.target.value);
            setPage(1);
          }}
          className="h-8 px-3 pr-7 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
          style={selectStyle}
        >
          {campaignFilterOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
          {(["all", "qualified", "not_qualified", "pending"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-[5px] transition-colors duration-150 ${
                  statusFilter === s
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {s === "all"
                  ? "All"
                  : s === "not_qualified"
                  ? "Not Qualified"
                  : s === "pending"
                  ? "Follow Up"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {[
                  { label: "Name", align: "left" },
                  { label: "Phone", align: "left" },
                  { label: "Project", align: "left" },
                  { label: "Lead Stage", align: "left" },
                  { label: "Verification", align: "center" },
                  { label: "Lead Temperature", align: "left" },
                  { label: "AI Qualification", align: "left" },
                  { label: "Next Action", align: "left" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-${h.align} whitespace-nowrap`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    {search || campaignFilter !== "All Campaigns" || statusFilter !== "all" ? (
                      <EmptyState
                        illustration={<IllustrationSearchEmpty />}
                        title="No leads match your filters"
                        description="Try adjusting your search, campaign, or qualification filter."
                        action={
                          <button onClick={() => { setSearch(""); setCampaignFilter("All Campaigns"); setStatusFilter("all"); }}
                            className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                            Clear filters
                          </button>
                        }
                        compact
                      />
                    ) : (
                      <EmptyState
                        illustration={<IllustrationLeads />}
                        title="No leads yet"
                        description="Leads from all your campaigns will appear here once they start coming in."
                      />
                    )}
                  </td>
                </tr>
              ) : paginated.map((lead, i) => {
                const globalIndex = (page - 1) * PAGE_SIZE + i;
                const initials = lead.name
                  .split(" ")
                  .map((w) => w.replace(/\*/g, "").charAt(0))
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const avatarColor = avatarColors[globalIndex % avatarColors.length];

                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`hover:bg-surface-page transition-colors duration-150 cursor-pointer border-b border-border-subtle last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                    }`}
                  >
                    {/* Name with Avatar */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <span className="text-[13px] text-text-primary font-medium">
                          {lead.name}
                        </span>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                      {lead.phone}
                    </td>
                    {/* Project (Campaign) */}
                    <td className="px-3 py-2.5 text-[12px] text-text-secondary whitespace-nowrap max-w-[160px] truncate">
                      {lead.campaign}
                    </td>
                    {/* Lead Stage */}
                    <td className="px-3 py-2.5">
                      <LeadStageBadge stage={lead.leadStage} />
                    </td>
                    {/* Verification */}
                    <td className="px-3 py-2.5 text-center">
                      {lead.verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                          <ShieldCheck size={11} strokeWidth={2} />
                          Verified
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-tertiary">—</span>
                      )}
                    </td>
                    {/* Lead Temperature */}
                    <td className="px-3 py-2.5">
                      <TemperatureDot temp={lead.temperature} />
                    </td>
                    {/* AI Qualification */}
                    <td className="px-3 py-2.5">
                      <QualificationBadge status={lead.aiQualification} />
                    </td>
                    {/* Next Action */}
                    <td className="px-3 py-2.5">
                      <NextActionCell action={lead.nextAction} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-[12px] text-text-tertiary">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
            leads
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

      {/* Slide-over Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </motion.div>
  );
}
