"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  Filter,
  Download,
  Database,
  Sparkles,
  Send,
  LayoutGrid,
  Pencil,
  User as UserIcon,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  leads,
  projectContext,
  maskName,
  maskPhone,
  formatDate,
  formatDuration,
  hasDiscrepancy,
  type Lead,
} from "@/lib/qc-data";
import {
  QualificationBadge,
  TemperatureBadge,
  RunningBadge,
} from "@/components/ui/qualification-badge";
import {
  FiltersPopover,
  type MismatchFilter,
} from "@/components/leads/filters-popover";

const TABS = ["Dashboard", "Leads", "Sources", "Settings"] as const;

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Leads");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mismatch, setMismatch] = useState<MismatchFilter>("all");
  const filtersBtnRef = useRef<HTMLButtonElement | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (mismatch === "yes" && !hasDiscrepancy(l)) return false;
      if (mismatch === "no" && hasDiscrepancy(l)) return false;
      if (!q) return true;
      // Search on real values so it works even though display is masked
      return (
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
      );
    });
  }, [search, mismatch]);

  const activeFilterCount = mismatch === "all" ? 0 : 1;

  return (
    <div className="px-8 py-6">
      {/* Project header */}
      <div className="flex items-center gap-3 mb-1.5">
        <button
          aria-label="Back"
          className="w-7 h-7 rounded-md hover:bg-secondary text-foreground flex items-center justify-center"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <h1 className="text-[22px] font-bold text-foreground">
          {projectContext.project}
        </h1>
        <button
          aria-label="Edit project name"
          className="w-6 h-6 rounded-md hover:bg-secondary text-muted-foreground flex items-center justify-center"
        >
          <Pencil size={13} strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-6 pl-10">
        <span className="inline-flex items-center border border-border rounded-md px-2 py-[3px] text-[11px] font-medium text-secondary-foreground bg-secondary/60">
          {projectContext.client}
        </span>
        <RunningBadge />
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-5">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 h-9 text-[13.5px] font-medium relative -mb-px transition-colors",
                  active
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative w-[260px]">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
          />
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <ToolbarButton icon={<Download size={14} strokeWidth={2} />} label="Export" />
        <ToolbarButton icon={<Database size={14} strokeWidth={2} />} label="Mark SQL" />
        <ToolbarButton
          icon={<Sparkles size={14} strokeWidth={2} />}
          label="Enrich Leads"
        />
        <ToolbarButton icon={<Send size={14} strokeWidth={2} />} label="Send To Campaign" />
        <ToolbarButton
          icon={<LayoutGrid size={14} strokeWidth={2} />}
          label="Send To CRM"
        />

        <div className="text-[12px] text-muted-foreground tabular px-2 whitespace-nowrap">
          Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of{" "}
          {filtered.length} leads
        </div>

        {/* Filters button + popover */}
        <div className="relative">
          <button
            ref={filtersBtnRef}
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[13px] transition-colors",
              filtersOpen || activeFilterCount > 0
                ? "border-foreground bg-secondary text-foreground"
                : "border-border text-foreground hover:bg-secondary",
            )}
          >
            <Filter size={14} strokeWidth={2} />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-foreground text-background text-[10px] font-semibold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          <FiltersPopover
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            mismatch={mismatch}
            onMismatchChange={setMismatch}
            onClearAll={() => setMismatch("all")}
            anchorRef={filtersBtnRef}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <table className="w-full border-collapse text-[13px] min-w-[1500px]">
          <thead>
            <tr className="border-b border-border bg-background">
              {/* Discrepancy indicator column header */}
              <th className="w-[6px] p-0" />
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Created At</Th>
              <Th>Updated At</Th>
              <Th>Call Duration</Th>
              <Th>Enrichment Status</Th>
              <Th>AI Qualification Status</Th>
              <Th>
                <span className="flex items-center gap-1">
                  QC Qualification
                </span>
              </Th>
              <Th align="right">Signal</Th>
              <Th>Temperature</Th>
              <Th>Lead Status</Th>
              <Th>Next Action Time</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-muted-foreground text-[13px]">
                  No leads match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => <LeadRow key={lead.id} lead={lead} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button className="h-8 px-3 rounded-md border border-border text-[12.5px] text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none" disabled>
          Previous
        </button>
        <div className="h-8 px-3 rounded-md border border-border bg-secondary text-[12.5px] text-foreground flex items-center">
          Page 1 of 1
        </div>
        <button className="h-8 px-3 rounded-md border border-border text-[12.5px] text-foreground hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none" disabled>
          Next
        </button>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-3 py-3 text-[12px] font-semibold text-muted-foreground whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function ToolbarButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-transparent text-foreground text-[13px] hover:bg-secondary transition-colors whitespace-nowrap">
      {icon}
      {label}
    </button>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const discrepancy = hasDiscrepancy(lead);
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(`/leads/${lead.id}`)}
      className={cn(
        "border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30 cursor-pointer",
      )}
    >
      {/* Discrepancy indicator — 6px-wide warning strip on rows where AI ≠ QC */}
      <td className="p-0 relative w-[6px]">
        {discrepancy && (
          <span
            aria-label="Qualification mismatch"
            title="AI and QC qualifications differ"
            className="absolute inset-y-0 left-0 w-[3px] bg-warning"
          />
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2 text-foreground">
          <UserIcon size={13} strokeWidth={1.75} className="text-muted-foreground" />
          {maskName(lead.name)}
        </div>
      </td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.72 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0122 16.92z" />
          </svg>
          {maskPhone(lead.phone)}
        </span>
      </td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
        {formatDate(lead.createdAt)}
      </td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
        {formatDate(lead.updatedAt)}
      </td>
      <td className="px-3 py-3 text-foreground whitespace-nowrap tabular">
        {formatDuration(lead.callDurationSeconds)}
      </td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap italic">
        {lead.enrichment}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <QualificationBadge value={lead.aiQualification} />
      </td>
      {/* QC Qualification — adds a warning icon when it differs from AI */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          <QualificationBadge value={lead.qcQualification} />
          {discrepancy && (
            <AlertTriangle
              size={13}
              strokeWidth={2}
              className="text-warning"
              aria-label="Differs from AI qualification"
            />
          )}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular font-semibold whitespace-nowrap">
        <SignalCell score={lead.signal} />
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <TemperatureBadge value={lead.temperature} />
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <QualificationBadge value={lead.leadStatus} />
      </td>
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
        {lead.nextActionTime === "triggered" ? (
          <span className="italic">triggered</span>
        ) : (
          formatDate(lead.nextActionTime)
        )}
      </td>
    </tr>
  );
}

function SignalCell({ score }: { score: number }) {
  // Color thresholds for the AI confidence number
  const color =
    score >= 75 ? "text-success" : score >= 40 ? "text-foreground" : "text-destructive";
  return <span className={color}>{score}</span>;
}
