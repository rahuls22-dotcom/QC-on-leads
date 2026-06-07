"use client";

// Unified per-lead view. Every CRM hit, every Single lookup, and every row inside
// every Bulk upload becomes one row here.
//
// Filters: Range · Type · Source · Status · search.
// Pagination: 50 leads per page.
// Click a row → opens the lead-profile drawer (the enriched data for THAT person).
// Run-level status / credits / push-to-CRM live in the upload history drawer, not here.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Briefcase, Calendar, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Database, FileSpreadsheet, Search, Upload, X } from "lucide-react";
import Link from "next/link";

import {
  CRM_NAMES_POOL,
  sampleProfile,
  type EnrichedProfile,
  type EnrichmentType,
  type RunRecord,
  useEnrichmentCrmStore,
} from "@/lib/enrichment-crm-data";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";
import { DateRangePopover, formatRangeLabel } from "./date-range-popover";

type DateRange = "7d" | "14d" | "30d" | "all" | "custom";
type TypeFilter = "any" | "professional" | "financial" | "both";
type UploadFilter = "any" | "crm" | "bulk" | "single";
type StatusFilter = "any" | "enriched" | "not_enriched" | "failed";

type LeadStatus = "enriched" | "not_enriched" | "failed" | "running";

interface LeadRow {
  id: string;
  runId: string;
  source: RunRecord["source"];
  leadId?: string;
  name: string;
  subline: string;
  types: EnrichmentType[];
  status: LeadStatus;
  startedAt: string;
  filename?: string;
  profile?: EnrichedProfile;
}

interface Props {
  /** @deprecated rows now open a lead-profile drawer; prop kept for caller back-compat. */
  onOpenRun?: (run: RunRecord) => void;
  /** When true, drop the "crm" source from rows and hide the CRM filter option
   *  (used by the No-CRM variant). */
  dropCrmSource?: boolean;
}

const PAGE_SIZE = 50;

// Every column gets an fr weight so wide viewports distribute slack evenly
// across all cells instead of pooling whitespace in one spot. Weights
// roughly match content needs: LEAD widest (name + email), ENRICHMENT
// medium (two pills), STATUS/STARTED/SOURCE/LEAD ID equal small.
const TABLE_COLS =
  "grid-cols-[minmax(72px,1fr)_minmax(128px,1.4fr)_minmax(220px,1.6fr)_minmax(180px,1.8fr)_minmax(120px,1.2fr)_minmax(80px,0.9fr)]";

export function EnrichedLeads({ onOpenRun: _onOpenRun, dropCrmSource = false }: Props) {
  const allRuns = useEnrichmentCrmStore((s) => s.runs);
  const runs = useMemo(
    () => (dropCrmSource ? allRuns.filter((r) => r.source !== "crm") : allRuns),
    [allRuns, dropCrmSource],
  );
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

  const [range, setRange] = useState<DateRange>("14d");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd,   setCustomEnd]   = useState<Date | null>(null);
  const [customOpen,  setCustomOpen]  = useState(false);
  const [typeF, setTypeF] = useState<TypeFilter>("any");
  const [uploadF, setUploadF] = useState<UploadFilter>("any");
  const [statusF, setStatusF] = useState<StatusFilter>("any");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const allLeads = useMemo<LeadRow[]>(() => flattenRunsToLeads(runs), [runs]);

  const inRange = useMemo(
    () => makeRangePredicate(range, customStart, customEnd),
    [range, customStart, customEnd],
  );

  const filtered = useMemo(() => {
    return allLeads
      .filter((l) => inRange(new Date(l.startedAt).getTime()))
      .filter((l) => matchType(l, typeF))
      .filter((l) => matchUpload(l, uploadF))
      .filter((l) => matchStatus(l, statusF))
      .filter((l) => matchQuery(l, query));
  }, [allLeads, inRange, typeF, uploadF, statusF, query]);

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setPage(0);
  }, [range, customStart, customEnd, typeF, uploadF, statusF, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(total, pageStart + PAGE_SIZE);
  const pageRows = filtered.slice(pageStart, pageEnd);

  // KPIs reflect every active filter, not just the date range. If user filters
  // by Source: CRM, the cards collapse to CRM-only counts in lockstep.
  const totalLeads  = filtered.length;
  const enrichedC   = filtered.filter((l) => l.status === "enriched").length;
  const notEnrichedC = filtered.filter((l) => l.status === "not_enriched").length;
  const failedC     = filtered.filter((l) => l.status === "failed").length;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (typeF !== "any") activeChips.push({ label: `Type: ${typeLabelFor(typeF)}`, clear: () => setTypeF("any") });
  if (uploadF !== "any") activeChips.push({ label: `Source: ${capitalize(uploadF)}`, clear: () => setUploadF("any") });
  if (statusF !== "any") activeChips.push({ label: `Status: ${statusLabelFor(statusF)}`, clear: () => setStatusF("any") });
  if (query.trim()) activeChips.push({ label: `Search: "${query.trim()}"`, clear: () => setQuery("") });

  const openLead = (lead: LeadRow) => {
    setSelectedLead(lead);
  };

  if (allLeads.length === 0) {
    return <EnrichedLeadsEmpty />;
  }

  return (
    <div className="space-y-5">
      {/* Page-level filter bar, drives both KPIs and the table below */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search size={12} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, lead ID..."
              className="h-8 pl-7 pr-2.5 w-full text-[12.5px] bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-text-primary/15 focus:border-text-primary/40 transition-shadow"
            />
          </div>

          {/* Filter dropdowns */}
          <FilterDropdown<TypeFilter>
            label="Type"
            value={typeF}
            onChange={setTypeF}
            options={[
              { v: "any",          l: "Any" },
              { v: "professional", l: "Professional" },
              { v: "financial",    l: "Financial" },
              { v: "both",         l: "Both" },
            ]}
          />
          <FilterDropdown<UploadFilter>
            label="Source"
            value={uploadF}
            onChange={setUploadF}
            options={[
              { v: "any",    l: "Any" },
              ...(dropCrmSource ? [] : [{ v: "crm" as const, l: "CRM" }]),
              { v: "bulk",   l: "Bulk" },
              { v: "single", l: "Single" },
            ]}
          />
          <FilterDropdown<StatusFilter>
            label="Status"
            value={statusF}
            onChange={setStatusF}
            options={[
              { v: "any",           l: "Any" },
              { v: "enriched",      l: "Enriched" },
              { v: "not_enriched",  l: "Not enriched" },
              { v: "failed",        l: "Failed" },
            ]}
          />

          <div className="w-px h-6 bg-border" />

          {/* Range segmented control (primary axis) */}
          <div className="relative inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-0.5 gap-0.5">
            {(
              [
                { v: "7d",  l: "7d" },
                { v: "14d", l: "14d" },
                { v: "30d", l: "30d" },
                { v: "all", l: "All" },
              ] as { v: DateRange; l: string }[]
            ).map((opt) => {
              const active = opt.v === range;
              return (
                <button
                  key={opt.v}
                  onClick={() => setRange(opt.v)}
                  className={[
                    "h-6 px-2.5 text-[11.5px] font-medium rounded-[5px] transition-colors",
                    active
                      ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                      : "text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {opt.l}
                </button>
              );
            })}

            {/* Custom date range trigger */}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className={[
                "h-6 inline-flex items-center gap-1 px-2 text-[11.5px] font-medium rounded-[5px] transition-colors",
                range === "custom"
                  ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Calendar size={11} strokeWidth={1.75} />
              {range === "custom" && customStart && customEnd
                ? formatRangeLabel(customStart, customEnd)
                : "Custom"}
            </button>

            <DateRangePopover
              open={customOpen}
              onClose={() => setCustomOpen(false)}
              initialStart={customStart}
              initialEnd={customEnd}
              onApply={(s, e) => {
                setCustomStart(s);
                setCustomEnd(e);
                setRange("custom");
                setCustomOpen(false);
              }}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {activeChips.map((c) => (
              <button
                key={c.label}
                onClick={c.clear}
                className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-text-secondary bg-surface-secondary border border-border rounded-badge hover:text-text-primary hover:bg-surface-tertiary/60 transition-colors"
              >
                {c.label}
                <X size={10} strokeWidth={2} />
              </button>
            ))}
            <button
              onClick={() => {
                setTypeF("any");
                setUploadF("any");
                setStatusF("any");
                setQuery("");
              }}
              className="text-[11px] font-medium text-text-tertiary hover:text-text-primary ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* KPI strip, reflects current filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Total leads"  value={totalLeads.toLocaleString()}    tint="neutral" />
        <Kpi label="Enriched"     value={enrichedC.toLocaleString()}     tint="good" />
        <Kpi label="Not enriched" value={notEnrichedC.toLocaleString()}  tint="muted" />
        <Kpi label="Failed"       value={failedC.toLocaleString()}       tint={failedC > 0 ? "bad" : "muted"} />
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className={`grid ${TABLE_COLS} gap-4 px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary bg-surface-page/40 border-b border-border-subtle`}>
          <div>Source</div>
          <div>Lead ID</div>
          <div>Lead</div>
          <div>Enrichment</div>
          <div>Status</div>
          <div className="text-right">Started</div>
        </div>

        {pageRows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-[13px] font-medium text-text-primary mb-1">No matching leads</div>
            <div className="text-[12px] text-text-secondary">Try widening the date range or clearing filters.</div>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {pageRows.map((l) => (
              <li
                key={l.id}
                onClick={() => openLead(l)}
                className={`grid ${TABLE_COLS} gap-4 px-5 py-3.5 items-center cursor-pointer hover:bg-surface-page/40 transition-colors`}
              >
                <div>
                  <SourcePill source={l.source} />
                </div>
                <div className="min-w-0">
                  {l.leadId ? (
                    <span className="inline-block text-[11.5px] font-mono tabular-nums text-text-secondary bg-surface-secondary/60 border border-border rounded-input px-1.5 py-0.5 truncate max-w-full">
                      {l.leadId}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-text-tertiary">—</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text-primary truncate">{l.name}</div>
                  <div className="text-[11.5px] text-text-secondary truncate mt-0.5">{l.subline}</div>
                </div>
                <div>
                  <TypePill types={l.types} />
                </div>
                <div>
                  <StatusPill status={l.status} />
                </div>
                <div className="text-right text-[11.5px] text-text-secondary tabular-nums">
                  {formatStarted(l.startedAt)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-surface-page/30">
            <div className="text-[11.5px] text-text-secondary tabular-nums">
              {pageStart + 1}–{pageEnd} of {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-medium text-text-secondary border border-border rounded-button bg-white hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={12} strokeWidth={2} />
                Prev
              </button>
              <span className="text-[11.5px] text-text-tertiary tabular-nums px-1">
                {safePage + 1} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-medium text-text-secondary border border-border rounded-button bg-white hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LeadProfileDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}

export function EnrichedLeadsEmpty() {
  return (
    <div className="bg-white border border-border rounded-card px-6 py-14">
      <div className="max-w-[520px] mx-auto text-center">
        <div className="w-12 h-12 rounded-card bg-surface-secondary border border-border-subtle flex items-center justify-center mx-auto mb-4">
          <Database size={20} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">
          No history yet
        </h3>
        <p className="text-[12.5px] text-text-secondary leading-relaxed mb-6">
          Records show up here as soon as a lead is enriched, from your CRM, a bulk upload, or a single lookup.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          <Link
            href="/enrichment/operations"
            className="group flex items-start gap-3 p-3.5 bg-white border border-border rounded-card hover:border-text-primary/40 hover:shadow-[0_1px_3px_rgba(15,15,15,0.04)] transition-all"
          >
            <div className="w-8 h-8 rounded-[6px] bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <Upload size={14} strokeWidth={1.75} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                Bulk upload
              </div>
              <div className="text-[11.5px] text-text-tertiary leading-snug">
                Drop a CSV of leads to enrich in one go.
              </div>
            </div>
          </Link>

          <Link
            href="/enrichment/operations"
            className="group flex items-start gap-3 p-3.5 bg-white border border-border rounded-card hover:border-text-primary/40 hover:shadow-[0_1px_3px_rgba(15,15,15,0.04)] transition-all"
          >
            <div className="w-8 h-8 rounded-[6px] bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <Search size={14} strokeWidth={1.75} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                Single lookup
              </div>
              <div className="text-[11.5px] text-text-tertiary leading-snug">
                Enrich one lead by name, email, or phone.
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-5 pt-5 border-t border-border-subtle text-[11.5px] text-text-tertiary">
          Connected CRM? New leads auto-enrich and land here within minutes.
        </div>
      </div>
    </div>
  );
}

// ── Flatten runs to per-lead rows ─────────────────────────────────────────
// NOTE: Indexing scheme (seed=hashCode(run.id), step=i*7) is mirrored in
// src/lib/dashboard/flatten-leads.ts so the dashboard and this table show
// the same set of bulk leads. Keep both in sync.

function flattenRunsToLeads(runs: RunRecord[]): LeadRow[] {
  const out: LeadRow[] = [];
  for (const r of runs) {
    if (r.source === "crm" || r.source === "single") {
      const c = r.profile?.contact;
      const name =
        c?.name ||
        r.profile?.professional?.name ||
        r.inputValue ||
        (r.source === "crm" ? r.crmOrigin?.recordId ?? "CRM lead" : "Single lookup");
      const subline =
        c?.email ||
        c?.phone ||
        c?.linkedin ||
        (r.source === "crm"
          ? `${r.crmOrigin?.channel ?? "CRM"}${r.crmOrigin?.provider ? ` · ${capitalize(r.crmOrigin.provider)}` : ""}`
          : r.inputValue || "");

      // Lead ID resolution order: CRM record id > profile.lead_id > undefined.
      const leadId = r.source === "crm"
        ? r.crmOrigin?.recordId || r.profile?.lead_id
        : r.profile?.lead_id;

      out.push({
        id: r.id,
        runId: r.id,
        source: r.source,
        leadId,
        name,
        subline,
        types: r.types,
        status: deriveLeadStatus(r),
        startedAt: r.startedAt,
        profile: r.profile,
      });
      continue;
    }

    // Bulk, synthesize one row per lead from the deterministic name pool.
    // ~70% of bulk leads get a lead_id after write-back; the rest don't (pending push, mapping miss).
    const total = r.leadsTotal || 0;
    const success = Math.min(total, r.leadsSuccess || 0);
    const failed = Math.min(total - success, r.leadsFailed || 0);
    const notEnriched = Math.max(0, total - success - failed);
    const seed = hashCode(r.id);

    const renderCap = 60;
    const rowsToRender = Math.min(total, renderCap);
    const runShort = r.id.replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase().padStart(5, "0");

    for (let i = 0; i < rowsToRender; i++) {
      const person = CRM_NAMES_POOL[(seed + i * 7) % CRM_NAMES_POOL.length];
      const ratio = total === 0 ? 0 : i / total;
      let status: LeadStatus;
      if (r.status === "in_progress") {
        status = "running";
      } else if (r.status === "failed") {
        status = "failed";
      } else if (ratio < success / total) {
        status = "enriched";
      } else if (ratio < (success + failed) / total) {
        status = "failed";
      } else {
        status = notEnriched > 0 ? "not_enriched" : "enriched";
      }

      // ~70% of bulk leads get a lead_id, the rest don't.
      const hasLeadId = ((seed + i) % 10) < 7 && status !== "failed";
      const leadId = hasLeadId
        ? `BLK-${runShort}-${String(i + 1).padStart(4, "0")}`
        : undefined;

      const ts = new Date(r.startedAt).getTime() + i * 1000;

      // Per-lead profile. Prefer the seeded sample on the run (real shape),
      // else synthesize a minimal one so the lead drawer always has data
      // to render for any successful row.
      // Partial = professional layer returned but financial didn't. Only
      // possible when the run requested both. ~1 in 4 enriched-both leads.
      // Still counts/renders as enriched; financial just shows Not Available.
      const bothTypes = r.types.includes("professional") && r.types.includes("financial");
      const partial = status === "enriched" && bothTypes && (seed + i) % 4 === 0;

      const seeded = r.leads?.[i];
      const profile: EnrichedProfile | undefined =
        seeded ??
        (status === "failed" || status === "running"
          ? undefined
          : synthBulkLeadProfile({
              leadId,
              person,
              types: r.types,
              status,
              partial,
            }));

      out.push({
        id: `${r.id}::${i}`,
        runId: r.id,
        source: "bulk",
        leadId,
        name: person.name,
        subline: person.email,
        types: r.types,
        status,
        startedAt: new Date(ts).toISOString(),
        filename: r.filename,
        profile,
      });
    }
  }

  out.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return out;
}

// Build a believable EnrichedProfile for a synthesized bulk row using the
// shared sampleProfile as a base. Patches identity from the deterministic
// CRM_NAMES_POOL person and honours the run's enrichment types.
function synthBulkLeadProfile(args: {
  leadId?: string;
  person: { name: string; email: string; phone: string; company: string; title: string };
  types: EnrichmentType[];
  status: LeadStatus;
  partial?: boolean;
}): EnrichedProfile {
  const { leadId, person, types, status, partial = false } = args;
  const wantsPro = types.includes("professional");
  const wantsFin = types.includes("financial");

  // Not enriched: the API WAS called but returned nothing. Only the uploaded
  // identity survives — no professional, no financial layer.
  if (status === "not_enriched") {
    return {
      lead_id: leadId,
      enrichment_status: "Zero Enrichment",
      finance_data: "Not Available",
      valid_indian_name: true,
      // Only the input identity from the CSV — no enriched layers, no fabricated
      // phone, no verification (nothing came back from the API).
      contact: { name: person.name, email: person.email },
      professional: undefined,
      financial: undefined,
    };
  }

  // Enriched: some or all requested layers came back. "partial" = professional
  // found but financial missing. We bill for what returned and still count it
  // as enriched (financial just shows "Not Available").
  const giveFin = wantsFin && !partial;

  return {
    lead_id: leadId,
    enrichment_status: partial ? "Partial Enrichment" : "Fully Enriched",
    finance_data: giveFin ? "Available" : "Not Available",
    email_verification_status: "Valid",
    phone_verification_status: "Valid",
    valid_indian_name: true,
    contact: {
      name: person.name,
      email: person.email,
      phone: person.phone,
    },
    professional: wantsPro
      ? {
          ...sampleProfile.professional,
          name: person.name,
          job_title: person.title,
          company_name: person.company,
        }
      : undefined,
    financial: giveFin ? sampleProfile.financial : undefined,
  };
}

function deriveLeadStatus(r: RunRecord): LeadStatus {
  if (r.status === "in_progress") return "running";
  if (r.status === "failed") return "failed";
  const es = r.profile?.enrichment_status;
  if (es === "Zero Enrichment" || !r.profile) return "not_enriched";
  return "enriched";
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Filter helpers ────────────────────────────────────────────────────────

function makeRangePredicate(
  r: DateRange,
  customStart: Date | null,
  customEnd: Date | null,
): (t: number) => boolean {
  if (r === "all") return () => true;
  if (r === "custom") {
    if (!customStart || !customEnd) return () => true;
    const startMs = new Date(customStart).setHours(0, 0, 0, 0);
    const endMs   = new Date(customEnd).setHours(23, 59, 59, 999);
    return (t) => t >= startMs && t <= endMs;
  }
  const days = r === "7d" ? 7 : r === "14d" ? 14 : 30;
  const cutoff = Date.now() - days * 86_400_000;
  return (t) => t >= cutoff;
}

function matchType(l: LeadRow, f: TypeFilter): boolean {
  if (f === "any") return true;
  const hasPro = l.types.includes("professional");
  const hasFin = l.types.includes("financial");
  if (f === "professional") return hasPro && !hasFin;
  if (f === "financial") return hasFin && !hasPro;
  return hasPro && hasFin;
}

function matchUpload(l: LeadRow, f: UploadFilter): boolean {
  if (f === "any") return true;
  return l.source === f;
}

function matchStatus(l: LeadRow, f: StatusFilter): boolean {
  if (f === "any") return true;
  if (f === "enriched") return l.status === "enriched";
  if (f === "not_enriched") return l.status === "not_enriched";
  return l.status === "failed";
}

function matchQuery(l: LeadRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [l.name, l.subline, l.leadId, l.filename].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(needle);
}

function formatStarted(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function typeLabelFor(t: TypeFilter): string {
  if (t === "professional") return "Professional";
  if (t === "financial") return "Financial";
  if (t === "both") return "Both";
  return "Any";
}

function statusLabelFor(s: StatusFilter): string {
  if (s === "enriched") return "Enriched";
  if (s === "not_enriched") return "Not enriched";
  if (s === "failed") return "Failed";
  return "Any";
}

// ── Filter dropdown ───────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = options.find((o) => o.v === value);
  const isAny = value === ("any" as T);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] rounded-input border transition-colors",
          isAny
            ? "bg-white border-border text-text-secondary hover:text-text-primary"
            : "bg-surface-secondary border-border text-text-primary",
        ].join(" ")}
      >
        <span className="text-text-tertiary">{label}:</span>
        <span className="font-medium">{current?.l ?? "Any"}</span>
        <ChevronDown size={11} strokeWidth={2} className="text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 right-0 min-w-[160px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08)] py-1">
          {options.map((opt) => {
            const active = opt.v === value;
            return (
              <button
                key={opt.v}
                onClick={() => {
                  onChange(opt.v);
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between gap-3 transition-colors",
                  active
                    ? "bg-surface-secondary text-text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-page hover:text-text-primary",
                ].join(" ")}
              >
                <span>{opt.l}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────

function Kpi({ label, value, tint }: { label: string; value: string; tint: "good" | "bad" | "muted" | "neutral" }) {
  const dot =
    tint === "good"
      ? "bg-[#22C55E]"
      : tint === "bad"
      ? "bg-[#EF4444]"
      : tint === "muted"
      ? "bg-[#CBD5E1]"
      : "bg-text-tertiary";
  return (
    <div className="bg-white border border-border rounded-card p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">{label}</div>
      </div>
      <div className="text-[20px] font-semibold text-text-primary tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function SourcePill({ source }: { source: RunRecord["source"] }) {
  if (source === "crm") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-2 py-0.5">
        CRM
      </span>
    );
  }
  if (source === "bulk") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#9A3412] bg-[#FFF7ED] border border-[#FED7AA] rounded-badge px-2 py-0.5">
        <Upload size={9} strokeWidth={2} />
        Bulk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] rounded-badge px-2 py-0.5">
      <FileSpreadsheet size={9} strokeWidth={2} />
      Single
    </span>
  );
}

function TypePill({ types }: { types: EnrichmentType[] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {hasPro && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-1.5 py-0.5">
          <Briefcase size={9} strokeWidth={2} />
          Professional
        </span>
      )}
      {hasFin && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] rounded-badge px-1.5 py-0.5">
          <CircleDollarSign size={9} strokeWidth={2} />
          Financial
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-badge px-2 py-0.5">
        <span className="w-1 h-1 rounded-full bg-[#EF4444]" />
        Failed
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-badge px-2 py-0.5">
        <span className="w-1 h-1 rounded-full bg-[#F59E0B] animate-pulse" />
        Running
      </span>
    );
  }
  if (status === "not_enriched") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-secondary bg-surface-secondary border border-border rounded-badge px-2 py-0.5">
        <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
        Not enriched
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-badge px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
      Enriched
    </span>
  );
}

// ── Lead profile drawer ───────────────────────────────────────────────────
// Lead-centric, not run-centric. Shows ONLY the enriched profile for the
// clicked person. Run-level info (upload status, credits, push-to-CRM) lives
// in the upload history drawer, not here.

function LeadProfileDrawer({ lead, onClose }: { lead: LeadRow | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  if (!mounted || !lead) return null;

  const displayName =
    lead.profile?.contact?.name ||
    lead.profile?.professional?.name ||
    lead.name ||
    "Lead";

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[560px] max-w-[92vw] bg-white border-l border-border z-[70] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border-subtle">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <SourcePill source={lead.source} />
              {lead.leadId && (
                <span className="text-[11px] font-mono tabular-nums text-text-tertiary">{lead.leadId}</span>
              )}
            </div>
            <div className="text-[15px] font-semibold text-text-primary truncate">{displayName}</div>
            <div className="text-[12px] text-text-secondary truncate mt-0.5">{lead.subline}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors flex-shrink-0"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {lead.profile ? (
            <LeadProfileCard profile={lead.profile} variant="inline" />
          ) : (
            <div className="text-center py-12">
              <div className="text-[13px] font-medium text-text-primary mb-1">No enriched data</div>
              <div className="text-[12px] text-text-secondary">
                {lead.status === "failed"
                  ? "We couldn't enrich this lead. No credits were charged."
                  : lead.status === "running"
                  ? "Enrichment still in progress."
                  : "Nothing to show for this lead yet."}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
