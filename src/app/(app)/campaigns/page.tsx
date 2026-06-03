"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Plus,
  Search,
  CircleCheck,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Columns3,
  Trash2,
} from "lucide-react";
import { campaignsList } from "@/lib/campaign-data";
import type { CampaignStatus, CampaignHealth, CampaignListItem } from "@/lib/campaign-data";
import { agentsList } from "@/lib/voice-agent-data";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationCampaigns, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";
import { useCurrentScope, useCurrentWorkspaceLabel } from "@/lib/workspace-store";
import { workspaceIdForLegacyProject } from "@/lib/project-data";

// ── Metric column definitions ──────────────────────────────

interface MetricColumn {
  key: string;
  label: string;
  category: string;
  format: "currency" | "number" | "percent";
  getValue: (c: CampaignListItem) => number;
  defaultVisible: boolean;
}

const ALL_METRICS: MetricColumn[] = [
  // Traffic & Engagement
  { key: "spend", label: "Spend", category: "Traffic & Engagement", format: "currency", getValue: (c) => c.spend, defaultVisible: true },
  { key: "cpm", label: "CPM", category: "Traffic & Engagement", format: "currency", getValue: (c) => c.cpm, defaultVisible: true },
  { key: "ctr", label: "CTR", category: "Traffic & Engagement", format: "percent", getValue: (c) => c.ctr, defaultVisible: true },
  { key: "cpc", label: "CPC", category: "Traffic & Engagement", format: "currency", getValue: (c) => c.cpc, defaultVisible: false },
  // Video Engagement
  { key: "firstFrameRetention", label: "1st Frame Ret.", category: "Video Engagement", format: "percent", getValue: (c) => c.firstFrameRetention, defaultVisible: false },
  { key: "hookRate", label: "Hook Rate", category: "Video Engagement", format: "percent", getValue: (c) => c.hookRate, defaultVisible: false },
  { key: "holdRate", label: "Hold Rate", category: "Video Engagement", format: "percent", getValue: (c) => c.holdRate, defaultVisible: false },
  { key: "playRate95", label: "95% Play", category: "Video Engagement", format: "percent", getValue: (c) => c.playRate95, defaultVisible: false },
  // Conversion Funnel
  { key: "leads", label: "Leads", category: "Conversion Funnel", format: "number", getValue: (c) => c.leads, defaultVisible: true },
  { key: "verifiedLeads", label: "Verified", category: "Conversion Funnel", format: "number", getValue: (c) => c.verifiedLeads, defaultVisible: true },
  { key: "qualifiedLeads", label: "Qualified", category: "Conversion Funnel", format: "number", getValue: (c) => c.qualifiedLeads, defaultVisible: true },
  { key: "cpl", label: "CPL", category: "Conversion Funnel", format: "currency", getValue: (c) => c.cpl, defaultVisible: true },
  { key: "costPerLinkClick", label: "CPC (Link)", category: "Conversion Funnel", format: "currency", getValue: (c) => c.costPerLinkClick, defaultVisible: false },
  { key: "costPerVerifiedLead", label: "CPVL", category: "Conversion Funnel", format: "currency", getValue: (c) => c.costPerVerifiedLead, defaultVisible: true },
  { key: "costPerQualifiedLead", label: "CPQL", category: "Conversion Funnel", format: "currency", getValue: (c) => c.costPerQualifiedLead, defaultVisible: true },
  { key: "verificationRate", label: "Verif. Rate", category: "Conversion Funnel", format: "percent", getValue: (c) => c.verificationRate, defaultVisible: false },
  { key: "qualificationRate", label: "Qual. Rate", category: "Conversion Funnel", format: "percent", getValue: (c) => c.qualificationRate, defaultVisible: false },
];

const METRIC_CATEGORIES = [...new Set(ALL_METRICS.map((m) => m.category))];

function formatMetricValue(value: number, format: MetricColumn["format"]) {
  if (format === "currency") {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString("en-IN")}`;
  }
  if (format === "percent") return `${value}%`;
  return value.toLocaleString();
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { label: string; cls: string }> = {
    enabled: { label: "Enabled", cls: "bg-[#F0FDF4] text-[#15803D]" },
    paused: { label: "Paused", cls: "bg-surface-secondary text-text-secondary" },
    draft: { label: "Draft", cls: "bg-[#FEF3C7] text-[#92400E]" },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

function HealthBadge({ health }: { health: CampaignHealth }) {
  const config = {
    "on-track": { icon: CircleCheck, label: "On track", cls: "text-status-success bg-[#F0FDF4]" },
    "needs-attention": { icon: AlertTriangle, label: "Attention", cls: "text-[#92400E] bg-[#FEF3C7]" },
    underperforming: { icon: XCircle, label: "Low", cls: "text-status-error bg-[#FEF2F2]" },
  };
  const { icon: Icon, label, cls } = config[health];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      <Icon size={11} strokeWidth={2} />
      {label}
    </span>
  );
}

const PAGE_SIZE = 15;

export default function CampaignsPage() {
  const router = useRouter();
  const { isEmpty } = useDemoMode();
  const scope = useCurrentScope();
  const wsLabel = useCurrentWorkspaceLabel();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CampaignStatus>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(ALL_METRICS.filter((m) => m.defaultVisible).map((m) => m.key))
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<CampaignListItem | null>(null);
  const getStatus = (c: CampaignListItem): CampaignStatus => c.status;

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(deleteTarget.id);
      return next;
    });
    setDeleteTarget(null);
  };

  const activeMetrics = useMemo(
    () => ALL_METRICS.filter((m) => visibleColumns.has(m.key)),
    [visibleColumns]
  );

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const projectNames = useMemo(() => {
    const names = new Set(campaignsList.map((c) => c.client));
    return ["all", ...Array.from(names).sort()];
  }, []);

  // Filter by current workspace scope before any other filter so the
  // status / project / search dropdowns only ever operate on the
  // workspace the user is in.
  const scopeFiltered = useMemo(() => {
    if (scope.kind === "all") return campaignsList;
    return campaignsList.filter(
      (c) => workspaceIdForLegacyProject(c.projectId) === scope.id,
    );
  }, [scope]);

  const filtered = useMemo(() => {
    if (isEmpty) return [];
    return scopeFiltered.filter((c) => {
      if (deletedIds.has(c.id)) return false;
      if (statusFilter !== "all" && getStatus(c) !== statusFilter) return false;
      if (projectFilter !== "all" && c.client !== projectFilter) return false;
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.client.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [scopeFiltered, search, statusFilter, projectFilter, isEmpty, deletedIds]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const [showImport, setShowImport] = useState(false);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">
            {wsLabel} · Lead Generation
          </div>
          <h1 className="text-page-title text-text-primary">Campaigns</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
          >
            <Download size={15} strokeWidth={1.5} />
            Import Campaigns
          </button>
          <button
            onClick={() => router.push("/campaigns/create")}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
          >
            <Plus size={15} strokeWidth={2} />
            Create campaign
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
          {(["all", "enabled", "paused", "draft"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors duration-150 capitalize ${
                statusFilter === s
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* Project Filter */}
        <select
          value={projectFilter}
          onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
          className="h-8 px-2.5 pr-7 text-[12px] font-medium border border-border rounded-[6px] bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
        >
          {projectNames.map((p) => (
            <option key={p} value={p}>{p === "all" ? "All Projects" : p}</option>
          ))}
        </select>

        <div className="relative flex-1 max-w-[280px]">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-9 pl-8 pr-3 text-[13px] border border-border rounded-input bg-white focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
          />
        </div>

        {/* Column picker */}
        <div className="relative">
          <button
            onClick={() => setShowColumnPicker((v) => !v)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
          >
            <Columns3 size={14} strokeWidth={1.5} />
            Columns
          </button>

          {showColumnPicker && (
            <>
              <div className="fixed inset-0 z-[40]" onClick={() => setShowColumnPicker(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-[300px] bg-white border border-border rounded-card shadow-lg z-[50] py-2 max-h-[400px] overflow-y-auto">
                {METRIC_CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <div className="px-3 pt-3 pb-1 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                      {cat}
                    </div>
                    {ALL_METRICS.filter((m) => m.category === cat).map((m) => (
                      <label
                        key={m.key}
                        className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-surface-page transition-colors duration-100"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(m.key)}
                          onChange={() => toggleColumn(m.key)}
                          className="w-3.5 h-3.5 rounded cursor-pointer"
                        />
                        <span className="text-[13px] text-text-primary">{m.label}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-white border border-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                  Campaign
                </th>
                <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                  Status
                </th>
                {activeMetrics.map((m) => (
                  <th
                    key={m.key}
                    className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right"
                  >
                    {m.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-center">
                  Health
                </th>
                <th className="w-16 px-3 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={activeMetrics.length + 4}>
                    {search || statusFilter !== "all" || projectFilter !== "all" ? (
                      <EmptyState
                        illustration={<IllustrationSearchEmpty />}
                        title="No campaigns match your filters"
                        description="Try adjusting your search or clearing filters."
                        action={
                          <button onClick={() => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); }}
                            className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                            Clear filters
                          </button>
                        }
                        compact
                      />
                    ) : (
                      <EmptyState
                        illustration={<IllustrationCampaigns />}
                        title="No campaigns yet"
                        description="Create your first campaign or import existing ones from Meta Ads."
                        action={
                          <div className="flex items-center gap-2">
                            <button onClick={() => router.push("/campaigns/create")}
                              className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                              Create campaign
                            </button>
                            <button onClick={() => setShowImport(true)}
                              className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                              Import Campaigns
                            </button>
                          </div>
                        }
                      />
                    )}
                  </td>
                </tr>
              ) : paginated.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                  className={`group hover:bg-surface-page transition-colors duration-150 cursor-pointer border-b border-border-subtle last:border-b-0 ${
                    i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                  }`}
                >
                  <td className="px-4 py-2.5 max-w-[280px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[13px] text-text-primary font-medium">{c.name}</span>
                      {c.id === "camp-7" && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8] shrink-0" title="Optimization suggestions available">
                          <Lightbulb size={9} strokeWidth={2} />
                          Optimize
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-tertiary mt-0.5 truncate">{c.client}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={getStatus(c)} />
                  </td>
                  {activeMetrics.map((m) => {
                    const isQualMetric = ["qualifiedLeads", "costPerQualifiedLead", "qualificationRate"].includes(m.key);
                    const noAgent = !c.agentConnected && isQualMetric;
                    return (
                      <td key={m.key} className="px-4 py-3 text-[13px] text-right tabular-nums">
                        {noAgent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#92400E]" title="Connect an agent to see qualification data">
                            <AlertTriangle size={10} strokeWidth={2} className="text-[#F59E0B]" />
                            No agent
                          </span>
                        ) : (
                          <span className="text-text-primary">{formatMetricValue(m.getValue(c), m.format)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <HealthBadge health={c.health} />
                  </td>
                  <td className="w-16 px-3 py-3 text-center">
                    {getStatus(c) === "draft" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(c);
                        }}
                        title="Delete draft"
                        aria-label={`Delete draft ${c.name}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-button text-status-error border border-status-error/40 bg-white hover:bg-[#FEF2F2] hover:border-status-error transition-colors duration-150"
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-[12px] text-text-tertiary">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} campaigns
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
      </motion.div>

      {/* Import Modal */}
      {showImport && <ImportCampaignsModal onClose={() => setShowImport(false)} />}

      {/* Delete draft confirmation */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setDeleteTarget(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-card border border-border shadow-xl w-full max-w-[420px] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-9 w-9 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
                  <Trash2 size={16} strokeWidth={1.5} className="text-status-error" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-text-primary">Delete draft campaign?</h3>
                  <p className="text-[12px] text-text-secondary leading-relaxed mt-1">
                    <span className="font-medium text-text-primary">{deleteTarget.name}</span> will be permanently deleted. This can&apos;t be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium bg-status-error text-white rounded-button hover:bg-[#B91C1C] transition-colors"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  Delete draft
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Import Campaigns Modal ──────────────────────────────────

const importableCampaigns = {
  meta: [
    { id: "imp-m1", name: "Whitefield Villas LeadGen", status: "Active", spend: "₹2.4L/mo", leads: 320, adSets: 4, imported: false },
    { id: "imp-m2", name: "Sarjapur 2BHK Campaign", status: "Active", spend: "₹89K/mo", leads: 210, adSets: 3, imported: false },
    { id: "imp-m3", name: "NRI Investment Campaign", status: "Active", spend: "₹45K/mo", leads: 65, adSets: 2, imported: false },
    { id: "imp-m4", name: "Brand Awareness — Q1", status: "Paused", spend: "₹25K/mo", leads: 0, adSets: 1, imported: true },
  ],
  google: [
    { id: "imp-g1", name: "Luxury Villas Search", status: "Active", spend: "₹1.8L/mo", leads: 148, adSets: 5, imported: false },
    { id: "imp-g2", name: "Brand Campaign", status: "Active", spend: "₹55K/mo", leads: 42, adSets: 2, imported: false },
    { id: "imp-g3", name: "Competitor Keywords", status: "Active", spend: "₹40K/mo", leads: 35, adSets: 3, imported: false },
  ],
  linkedin: [
    { id: "imp-l1", name: "CXO Real Estate", status: "Active", spend: "₹65K/mo", leads: 28, adSets: 2, imported: false },
    { id: "imp-l2", name: "IT Pros Bangalore", status: "Active", spend: "₹35K/mo", leads: 18, adSets: 1, imported: false },
  ],
};

type Platform = "meta" | "google" | "linkedin";

function ImportToggle({ enabled, onToggle, label, helper }: { enabled: boolean; onToggle: () => void; label: string; helper?: string }) {
  return (
    <div className="flex items-start justify-between px-4 py-3">
      <div className="flex-1 mr-4">
        <span className="text-[13px] text-text-primary">{label}</span>
        {helper && <p className="text-[11px] text-text-tertiary mt-0.5">{helper}</p>}
      </div>
      <button onClick={onToggle} className={`relative w-9 h-5 rounded-full transition-colors duration-150 shrink-0 mt-0.5 ${enabled ? "bg-accent" : "bg-silver-light"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${enabled ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function isLeadGenCampaign(c: { name: string; leads: number }) {
  return c.leads > 0 && !/brand/i.test(c.name);
}

function ImportCampaignsModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignProject, setAssignProject] = useState("skip");
  const [importing, setImporting] = useState(false);

  // Lead processing (step 2)
  const [verifyLeads, setVerifyLeads] = useState(true);
  const [enableAICalling, setEnableAICalling] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");

  const campaigns = platform ? importableCampaigns[platform] : [];
  const selectableCount = campaigns.filter((c) => !c.imported).length;

  const selectedLeadGen = campaigns.filter((c) => selected.has(c.id) && isLeadGenCampaign(c));
  const hasLeadGen = selectedLeadGen.length > 0;

  const activeAgents = agentsList.filter((a) => a.status === "active");

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const selectAll = () => {
    if (selected.size === selectableCount) setSelected(new Set());
    else setSelected(new Set(campaigns.filter((c) => !c.imported).map((c) => c.id)));
  };

  const goBack = () => {
    if (step === 3 && !hasLeadGen) setStep(1);
    else setStep((s) => s - 1);
  };

  const platforms: { key: Platform; label: string; connected: boolean; account: string }[] = [
    { key: "meta", label: "Meta Ads", connected: true, account: "Godrej Properties Ad Account" },
    { key: "google", label: "Google Ads", connected: true, account: "Godrej Properties Google" },
    { key: "linkedin", label: "LinkedIn Ads", connected: true, account: "Godrej Properties LinkedIn" },
  ];

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat" as const,
    backgroundPosition: "right 10px center",
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-card border border-border shadow-lg w-full max-w-[600px] max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between shrink-0">
            <h2 className="text-[16px] font-semibold text-text-primary">Import Campaigns</h2>
            <button onClick={onClose} className="p-1 text-text-secondary hover:bg-surface-secondary rounded-button"><X size={16} strokeWidth={1.5} /></button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 0 — Select Platform */}
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-[13px] text-text-secondary mb-4">Import campaigns from</p>
                <div className="space-y-2">
                  {platforms.map((p) => (
                    <button key={p.key} onClick={() => { setPlatform(p.key); setStep(1); setSelected(new Set()); }}
                      className={`w-full flex items-center justify-between p-4 border rounded-card text-left hover:border-border-hover transition-all duration-150 ${
                        platform === p.key ? "border-accent" : "border-border"
                      }`}>
                      <div>
                        <div className="text-[14px] font-medium text-text-primary">{p.label}</div>
                        <div className="text-[12px] text-text-secondary mt-0.5 flex items-center gap-1">
                          {p.connected ? (
                            <><CheckCircle2 size={12} strokeWidth={2} className="text-[#15803D]" /> Connected — {p.account}</>
                          ) : "Not connected"}
                        </div>
                      </div>
                      <ArrowRight size={16} strokeWidth={1.5} className="text-text-tertiary" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 — Select Campaigns */}
            {step === 1 && (
              <div>
                <p className="text-[13px] text-text-secondary mb-4">Select campaigns from {platforms.find((p) => p.key === platform)?.label}</p>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="px-3 py-2 text-left w-8">
                        <input type="checkbox" checked={selected.size === selectableCount && selectableCount > 0} onChange={selectAll}
                          className="w-3.5 h-3.5 rounded cursor-pointer" />
                      </th>
                      {["Campaign", "Status", "Spend", "Leads"].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className={`border-b border-border-subtle last:border-0 ${c.imported ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2.5">
                          {c.imported ? (
                            <span className="text-[10px] text-text-tertiary">—</span>
                          ) : (
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                              className="w-3.5 h-3.5 rounded cursor-pointer" />
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-[12px] text-text-primary font-medium">{c.name}</div>
                          {c.imported && <span className="text-[10px] text-text-tertiary">Already imported</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-text-secondary">{c.status}</td>
                        <td className="px-3 py-2.5 text-[11px] text-text-secondary tabular-nums">{c.spend}</td>
                        <td className="px-3 py-2.5 text-[11px] text-text-secondary tabular-nums">{c.leads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Step 2 — Lead Processing (conditional) */}
            {step === 2 && hasLeadGen && (
              <div className="space-y-4">
                <p className="text-[13px] text-text-secondary">Configure lead processing for imported campaigns</p>
                <p className="text-[12px] text-text-tertiary">{selectedLeadGen.length} campaign{selectedLeadGen.length !== 1 ? "s" : ""} with {selectedLeadGen.reduce((s, c) => s + c.leads, 0).toLocaleString()} existing leads detected.</p>

                <div className="space-y-1.5">
                  {selectedLeadGen.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-surface-page rounded-[6px]">
                      <span className="text-[12px] text-text-primary font-medium">{c.name}</span>
                      <span className="text-[11px] text-text-tertiary tabular-nums">{c.leads} leads</span>
                    </div>
                  ))}
                </div>

                <div className="border border-border rounded-card overflow-hidden">
                  {/* Verification — for existing leads */}
                  <div className="border-b border-border-subtle">
                    <ImportToggle enabled={verifyLeads} onToggle={() => setVerifyLeads(!verifyLeads)}
                      label="Verify existing leads" helper={`Run email & phone verification on ${selectedLeadGen.reduce((s, c) => s + c.leads, 0).toLocaleString()} imported leads`} />
                  </div>

                  {/* AI Calling — for future leads only */}
                  <div className="border-b border-border-subtle">
                    <ImportToggle enabled={enableAICalling} onToggle={() => setEnableAICalling(!enableAICalling)}
                      label="Enable AI calling for new leads" helper="Automatically call and qualify new leads that come in after import. Past leads won't be called." />
                  </div>

                  {enableAICalling && (
                    <div className="px-4 py-3 space-y-2.5">
                      <div className="flex items-start gap-2 bg-[#EFF6FF] border border-[#3B82F6]/15 rounded-[6px] px-3 py-2">
                        <span className="text-[11px] text-[#1D4ED8] leading-relaxed">
                          AI calling applies to <span className="font-medium">future leads only</span>. Existing {selectedLeadGen.reduce((s, c) => s + c.leads, 0).toLocaleString()} leads won&apos;t be called — use Sequences for bulk calling past leads.
                        </span>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5 block">Select Agent</label>
                        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                          className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                          style={selectStyle}>
                          <option value="">Choose an agent...</option>
                          {activeAgents.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} · {a.qualificationRate}% qual rate</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3 — Assign to Project */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-[13px] text-text-secondary">Assign to a project (optional)</p>
                <p className="text-[12px] text-text-tertiary">Organize imported campaigns into a project, or leave them unassigned.</p>
                <div className="space-y-2">
                  {[
                    { value: "skip", label: "Skip — leave unassigned" },
                    { value: "proj-1", label: "Whitefield Luxury Villas" },
                    { value: "proj-2", label: "Godrej Air — Phase 3 Launch" },
                    { value: "proj-3", label: "Godrej Eternity — Pre-launch" },
                    { value: "__new__", label: "+ Create new project" },
                  ].map((opt) => (
                    <label key={opt.value} className={`flex items-center gap-3 p-3 border rounded-card cursor-pointer transition-all ${
                      assignProject === opt.value ? "border-accent bg-surface-page" : "border-border hover:border-border-hover"
                    }`}>
                      <input type="radio" name="project" value={opt.value} checked={assignProject === opt.value}
                        onChange={() => setAssignProject(opt.value)} className="w-3.5 h-3.5" />
                      <span className="text-[13px] text-text-primary">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 — Importing / Conclusion */}
            {step === 4 && (
              <div className="py-4">
                {importing ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 border-[3px] border-surface-secondary border-t-accent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[14px] font-medium text-text-primary">Importing {selected.size} campaign{selected.size !== 1 ? "s" : ""}...</p>
                    <p className="text-[12px] text-text-tertiary mt-1">Syncing data from {platforms.find(p => p.key === platform)?.label}</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Success */}
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={24} strokeWidth={1.5} className="text-[#15803D]" />
                      </div>
                      <h3 className="text-[16px] font-semibold text-text-primary mb-1">
                        {selected.size} campaign{selected.size !== 1 ? "s" : ""} imported
                      </h3>
                      <p className="text-[12px] text-text-tertiary">
                        From {platforms.find(p => p.key === platform)?.label} · {platforms.find(p => p.key === platform)?.account}
                      </p>
                    </div>

                    {/* Status items */}
                    {(hasLeadGen && (verifyLeads || enableAICalling)) && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px]">Processing</div>
                        {verifyLeads && (
                          <div className="flex items-center gap-3 px-4 py-3 bg-[#FFFBF5] border border-[#F5EDD8] rounded-card">
                            <div className="w-5 h-5 border-2 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin shrink-0" />
                            <div>
                              <p className="text-[13px] text-text-primary font-medium">Verifying existing leads</p>
                              <p className="text-[11px] text-text-tertiary mt-0.5">
                                Running verification on {selectedLeadGen.reduce((sum, c) => sum + c.leads, 0).toLocaleString()} existing leads across {selectedLeadGen.length} campaign{selectedLeadGen.length !== 1 ? "s" : ""}. You&apos;ll be notified when complete.
                              </p>
                            </div>
                          </div>
                        )}
                        {enableAICalling && selectedAgent && (
                          <div className="flex items-start gap-3 px-4 py-3 bg-[#F0FDF4] border border-[#E2F5E9] rounded-card">
                            <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#15803D] mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[13px] text-text-primary font-medium">AI calling enabled for new leads</p>
                              <p className="text-[11px] text-text-tertiary mt-0.5">
                                New leads from {selectedLeadGen.length} campaign{selectedLeadGen.length !== 1 ? "s" : ""} will be automatically called and qualified by your voice agent.
                                Existing leads are not affected — use <span className="font-medium text-text-secondary">Sequences</span> to call past leads in bulk.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Summary */}
                    <div className="bg-surface-page rounded-card p-4 space-y-2">
                      {campaigns.filter(c => selected.has(c.id)).map(c => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span className="text-[12px] text-text-primary font-medium">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-text-tertiary tabular-nums">{c.leads} leads</span>
                            <CheckCircle2 size={12} strokeWidth={2} className="text-[#15803D]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {step < 4 && (
            <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between shrink-0">
              {step > 0 ? (
                <button onClick={goBack}
                  className="inline-flex items-center gap-1 h-9 px-3 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft size={14} strokeWidth={1.5} /> Back
                </button>
              ) : <div />}
              <div className="flex items-center gap-3">
                {step === 1 && selected.size > 0 && (
                  <span className="text-[12px] text-text-secondary">{selected.size} selected</span>
                )}
                {step === 0 && <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-text-secondary">Cancel</button>}
                {step === 1 && (
                  <button onClick={() => setStep(hasLeadGen ? 2 : 3)} disabled={selected.size === 0}
                    className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1">
                    Continue <ArrowRight size={14} strokeWidth={1.5} />
                  </button>
                )}
                {step === 2 && (
                  <button onClick={() => setStep(3)}
                    className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors inline-flex items-center gap-1">
                    Continue <ArrowRight size={14} strokeWidth={1.5} />
                  </button>
                )}
                {step === 3 && (
                  <button onClick={() => { setStep(4); setImporting(true); setTimeout(() => setImporting(false), 2000); }}
                    className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors">
                    Import {selected.size} Campaign{selected.size !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
          )}
          {step === 4 && !importing && (
            <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-end shrink-0">
              <button onClick={onClose}
                className="h-9 px-5 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
