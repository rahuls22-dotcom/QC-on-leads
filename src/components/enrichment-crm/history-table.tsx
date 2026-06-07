"use client";

// Recent runs table, single + bulk, unified.
// Columns: Run · Type · Status · Enriched · Credits · Started · (open)

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Users, MoreHorizontal, Eye, X, ChevronDown, Check } from "lucide-react";
import {
  formatRelative,
  successPct,
  type EnrichmentType,
  type RunRecord,
  type RunSource,
  type RunStatus,
  useEnrichmentCrmStore,
} from "@/lib/enrichment-crm-data";
import { IllustrationSearchEmpty } from "@/components/illustrations/empty-states";

interface HistoryTableProps {
  onView: (run: RunRecord) => void;
  /** When set, the source-filter chip is hidden and runs are locked to this source. */
  forceSource?: RunSource;
  /** Title override, default "Enrichment history". */
  title?: string;
  /** Past-retention mode: hide Download + Build audience, keep the row as a
   *  summary (file, enriched count, credits). Used in no-storage variant. */
  summaryOnly?: boolean;
  /** Per-row expiry. Rows older than this many days are treated as summaryOnly
   *  (downloads + audience build no longer available). Used in no-storage to
   *  mix recent actionable rows with older expired ones. */
  summaryAfterDays?: number;
}

type TypeFilter = "all" | "professional" | "financial" | "both";
type StatusFilter = "all" | RunStatus;
type SourceFilter = "all" | RunSource;

export function HistoryTable({ onView, forceSource, title, summaryOnly = false, summaryAfterDays }: HistoryTableProps) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const router = useRouter();

  // Single-lookup view keeps Status (Enriched / Not enriched / Failed) but drops
  // the "n of n" Enriched count — a single lookup is always 1 lead.
  const single = forceSource === "single";
  const gridClass = single
    ? "grid grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(130px,0.9fr)_minmax(120px,0.8fr)_minmax(110px,0.8fr)_48px] gap-4"
    : "grid grid-cols-[minmax(220px,1.8fr)_minmax(200px,1.3fr)_minmax(150px,1.1fr)_minmax(140px,1fr)_minmax(170px,1.1fr)_110px_56px] gap-6";

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const filtered = useMemo(() => {
    // CRM-sourced runs live in the CRM activity tab. The bottom history is
    // scoped to manual work only (bulk + single).
    let out = runs.filter((r) => r.source !== "crm");

    // Hard lock when caller forces a source.
    if (forceSource) out = out.filter((r) => r.source === forceSource);

    if (typeFilter !== "all") {
      out = out.filter((r) => {
        if (typeFilter === "both") return r.types.length === 2;
        return r.types.length === 1 && r.types[0] === typeFilter;
      });
    }
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
    if (!forceSource && sourceFilter !== "all") out = out.filter((r) => r.source === sourceFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) =>
        r.source === "bulk"
          ? (r.filename || "").toLowerCase().includes(q)
          : (r.inputValue || "").toLowerCase().includes(q),
      );
    }

    // Always newest first.
    out.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return out;
  }, [runs, typeFilter, statusFilter, sourceFilter, search, forceSource]);

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  const filtersActive = typeFilter !== "all" || statusFilter !== "all" || (!forceSource && sourceFilter !== "all") || search.trim().length > 0;

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  return (
    <div>
      {/* Header row: title left · search + filters right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-section-header text-text-primary">{title ?? "Enrichment history"}</h2>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="relative">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file or email"
              className="h-8 pl-8 pr-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-primary placeholder:text-text-tertiary w-[240px]"
            />
          </div>

          {!single && (
            <FilterChip
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { v: "all", label: "Any status" },
                { v: "in_progress", label: "Running" },
              ]}
            />
          )}
          <FilterChip
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { v: "all", label: "Any type" },
              { v: "professional", label: "Professional", dot: "#1D4ED8" },
              { v: "financial", label: "Financial", dot: "#6D28D9" },
              { v: "both", label: "Both" },
            ]}
          />
          {!forceSource && (
            <FilterChip
              label="Source"
              value={sourceFilter}
              onChange={(v) => setSourceFilter(v as SourceFilter)}
              options={[
                { v: "all", label: "Any source" },
                { v: "single", label: "Single lookup" },
                { v: "bulk", label: "Bulk upload" },
              ]}
            />
          )}

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-8 px-2 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={11} strokeWidth={1.5} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className={`${gridClass} px-6 py-3.5 bg-surface-page border-b border-border text-[11px] uppercase tracking-[0.4px] text-text-tertiary font-medium`}>
          <div>Run</div>
          <div>Type</div>
          <div>Status</div>
          {!single && <div>Enriched</div>}
          <div>Credits</div>
          <div>Started</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <div className="opacity-90 mb-3">
              <IllustrationSearchEmpty />
            </div>
            <div className="text-[14px] font-semibold text-text-primary">
              {filtersActive ? "No runs match these filters" : "No runs yet"}
            </div>
            <div className="text-[12px] text-text-tertiary mt-1 max-w-[280px]">
              {filtersActive
                ? "Try a different status, type, or source. Or clear filters to see everything."
                : "Run your first enrichment above to see it land here."}
            </div>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary bg-white border border-border rounded-button hover:text-text-primary hover:border-border-hover transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((run) => {
            const ageDays = (Date.now() - new Date(run.startedAt).getTime()) / 86_400_000;
            const expired = summaryAfterDays != null && ageDays > summaryAfterDays;
            return (
              <Row
                key={run.id}
                run={run}
                onView={() => onView(run)}
                onBuildAudience={() => onBuildAudience(run)}
                summaryOnly={summaryOnly || expired}
                expired={expired}
                single={single}
                gridClass={gridClass}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────

function Row({ run, onView, onBuildAudience, summaryOnly = false, expired = false, single = false, gridClass }: { run: RunRecord; onView: () => void; onBuildAudience: () => void; summaryOnly?: boolean; expired?: boolean; single?: boolean; gridClass: string }) {
  const isInProgress = run.status === "in_progress";
  const enrichedNow = isInProgress
    ? Math.round((run.progressPct || 0) * run.leadsTotal / 100)
    : run.leadsSuccess;

  return (
    <div
      onClick={onView}
      className={`${gridClass} px-6 py-5 items-center border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors cursor-pointer`}
    >
      {/* Run identity */}
      <div className="min-w-0">
        <div className="text-[13px] text-text-primary truncate font-medium">
          {run.source === "bulk" ? run.filename : run.inputValue}
        </div>
        <div className="text-[12px] text-text-secondary truncate mt-0.5">
          {run.source === "bulk"
            ? `Bulk · ${run.leadsTotal.toLocaleString("en-IN")} rows`
            : "Single lookup"}
        </div>
      </div>

      {/* Type */}
      <div>
        <TypePill types={run.types} />
      </div>

      {/* Status */}
      <div>
        <StatusCell run={run} single={single} />
      </div>

      {/* Enriched */}
      {!single && (
        <div className="text-[13px] text-text-primary tabular-nums">
          <span className="font-medium">{enrichedNow.toLocaleString("en-IN")}</span>
          <span className="text-text-secondary"> of {run.leadsTotal.toLocaleString("en-IN")}</span>
        </div>
      )}

      {/* Credits */}
      <div className="text-[13px] tabular-nums leading-snug">
        {isInProgress ? (
          <span className="text-text-secondary">{run.creditsBlocked.toLocaleString("en-IN")} reserved</span>
        ) : (
          <div>
            <div className="text-text-primary font-medium">{run.creditsCharged.toLocaleString("en-IN")} used</div>
            {/* Single lookups only charge on a successful enrich, so there's
                never a refund to surface — hide the refunded line for single. */}
            {!single && run.creditsRefunded > 0 && (
              <div className="text-text-secondary text-[12px] mt-0.5">+{run.creditsRefunded.toLocaleString("en-IN")} refunded</div>
            )}
          </div>
        )}
      </div>

      {/* Started */}
      <div className="text-[13px] text-text-secondary tabular-nums">
        {formatRelative(run.startedAt)}
      </div>

      {/* Action: kebab menu */}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end">
        <RowMenu run={run} onView={onView} onBuildAudience={onBuildAudience} summaryOnly={summaryOnly} />
      </div>
    </div>
  );
}

function TypePill({ types }: { types: EnrichmentType[] }) {
  // One tag per type, full name, color-coded.
  return (
    <div className="flex items-center gap-1.5">
      {types.map((t) => (
        <span key={t} className={`inline-flex items-center text-[12px] font-medium px-2 py-0.5 rounded-badge whitespace-nowrap ${typeColor(t)}`}>
          {typeLabel(t)}
        </span>
      ))}
    </div>
  );
}

export function typeLabel(t: EnrichmentType): string {
  return t === "professional" ? "Professional" : "Financial";
}

export function typeColor(t: EnrichmentType): string {
  // Professional → blue (career / network). Financial → purple (wealth / premium).
  return t === "professional"
    ? "bg-[#EFF6FF] text-[#1D4ED8]"
    : "bg-[#F5F3FF] text-[#6D28D9]";
}

function StatusCell({ run, single = false }: { run: RunRecord; single?: boolean }) {
  if (run.status === "in_progress") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D4ED8] opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1D4ED8]" />
        </span>
        <span className="text-[13px] text-[#1D4ED8] font-medium tabular-nums">
          {single ? "Running" : `Running · ${run.progressPct || 0}%`}
        </span>
      </div>
    );
  }
  if (run.status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13px] text-[#DC2626] font-medium"
        title={run.errorMessage}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
        Failed
      </span>
    );
  }
  // Single lookup: 1 lead, no percentage. "done" splits into Enriched (data
  // came back) vs Not enriched (API ran, nothing returned).
  if (single) {
    if (run.leadsSuccess > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#15803D] font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
          Enriched
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
        Not enriched
      </span>
    );
  }
  const pct = successPct(run);
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#15803D] font-medium tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
      {pct}% enriched
    </span>
  );
}

// ── Row kebab menu ──────────────────────────────────────────────────

function RowMenu({
  run,
  onView,
  onBuildAudience,
  summaryOnly = false,
}: {
  run: RunRecord;
  onView: () => void;
  onBuildAudience: () => void;
  summaryOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // In summary-only mode the workspace's storage window has passed, so
  // download links and CRM-writeback actions are gone — we only show details.
  const canDownload = !summaryOnly && run.status === "done" && run.source === "bulk";
  const canBuildAudience = !summaryOnly && run.status === "done" && run.source === "bulk";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-9 h-9 flex items-center justify-center rounded-button transition-colors ${
          open
            ? "text-text-primary bg-white"
            : "text-text-tertiary hover:text-text-primary hover:bg-white"
        }`}
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.04)] py-1"
        >
          <MenuItem
            icon={<Eye size={14} strokeWidth={1.5} />}
            label="View details"
            onClick={() => { setOpen(false); onView(); }}
          />
          {canDownload && (
            <>
              <MenuItem
                icon={<Download size={14} strokeWidth={1.5} />}
                label="Download CSV"
                onClick={() => { setOpen(false); downloadStub(run, "csv"); }}
              />
              <MenuItem
                icon={<Download size={14} strokeWidth={1.5} />}
                label="Download Excel"
                onClick={() => { setOpen(false); downloadStub(run, "xlsx"); }}
              />
            </>
          )}
          {canBuildAudience && (
            <MenuItem
              icon={<Users size={14} strokeWidth={1.5} />}
              label="Build audience"
              onClick={() => { setOpen(false); onBuildAudience(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors text-left"
    >
      <span className="text-text-tertiary">{icon}</span>
      {label}
    </button>
  );
}

// ── Filter chip (custom dropdown) ──────────────────────────────────

interface FilterOption {
  v: string;
  label: string;
  dot?: string;
}

function FilterChip({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = value !== "all";
  const current = options.find((o) => o.v === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 text-[12px] bg-white border rounded-input transition-colors ${
          active
            ? "border-border text-text-primary"
            : "border-border text-text-secondary hover:text-text-primary"
        }`}
      >
        {active && current?.dot && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: current.dot }} />
        )}
        {active && current ? (
          <span className="font-medium">{current.label}</span>
        ) : (
          <span>{label === "Status" ? "Any status" : label === "Type" ? "Any type" : "Any source"}</span>
        )}
        <ChevronDown size={12} strokeWidth={1.5} className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.04)] py-1"
        >
          {options.map((o) => {
            const selected = o.v === value;
            return (
              <button
                key={o.v}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.v); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors ${
                  selected
                    ? "text-text-primary bg-surface-secondary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-page"
                }`}
              >
                {o.dot ? (
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.dot }} />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0" />
                )}
                <span className="flex-1">{o.label}</span>
                {selected && <Check size={13} strokeWidth={2} className="text-text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Download stub ───────────────────────────────────────────────────

function downloadStub(run: RunRecord, format: "csv" | "xlsx" = "csv") {
  const content = `# Enriched export\n# Run: ${run.id}\n# File: ${run.filename}\n# Leads: ${run.leadsSuccess}/${run.leadsTotal}\n`;
  const mime = format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(run.filename || "enriched").replace(/\.[^.]+$/, "")}-enriched.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
