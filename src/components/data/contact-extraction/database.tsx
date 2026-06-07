"use client";

// Extracted-contacts database. Every contact pulled across all runs, with a
// quiet per-field verification indicator (phone / personal email / work email).
// Topped with a compact metrics strip (the few numbers a subscriber actually
// cares about — folded in from the old Dashboard tab). Search by name/company,
// filter by verification, optionally scope to one run via ?run=<id>.

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Search, X } from "lucide-react";

import { DateRangePopover, formatRangeLabel } from "../date-range-popover";

import {
  CE_TYPE_LABEL,
  useCEProgressTicker,
  useCEStore,
  type CEContact,
  type CEContactType,
  type CEFieldResult,
} from "@/lib/contact-extraction-data";
import { EmptyState } from "@/components/layout/empty-state";
import { ContactRound } from "lucide-react";

import { ContactFieldCell, Pagination, ProfileNameLink, TypeCheckboxes } from "./parts";

const PAGE_SIZE = 50;

type DateRange = "7d" | "30d" | "90d" | "all" | "custom";

const DATE_DAYS: Record<"7d" | "30d" | "90d", number> = { "7d": 7, "30d": 30, "90d": 90 };

function fieldOf(c: CEContact, t: CEContactType): CEFieldResult | undefined {
  return t === "phone" ? c.phone : t === "personal_email" ? c.personalEmail : c.workEmail;
}
// Multi-select "Has": contact must carry EVERY picked field (AND). No picks = any.
function hasFields(c: CEContact, types: CEContactType[]): boolean {
  return types.every((t) => Boolean(fieldOf(c, t)?.value));
}

export function ContactExtractionDatabase() {
  useCEProgressTicker();
  const contacts = useCEStore((s) => s.contacts);
  const getRun = useCEStore((s) => s.getRun);
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get("run");
  const run = runId ? getRun(runId) : undefined;

  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<CEContactType[]>([]);
  const [range, setRange] = useState<DateRange>("all");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [page, setPage] = useState(0);

  const resetPage = () => setPage(0);

  // Date predicate: presets count back from today; custom uses the picked range
  // (inclusive of the end day). "all" / unfinished custom = no date filter.
  const inRange = useMemo(() => {
    if (range === "all") return () => true;
    if (range === "custom") {
      if (!customStart || !customEnd) return () => true;
      const s = customStart.getTime();
      const e = new Date(customEnd).setHours(23, 59, 59, 999);
      return (t: number) => t >= s && t <= e;
    }
    const cutoff = Date.now() - DATE_DAYS[range] * 86400000;
    return (t: number) => t >= cutoff;
  }, [range, customStart, customEnd]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts
      .filter((c) => (runId ? c.runId === runId : true))
      .filter((c) => inRange(+new Date(c.extractedAt)))
      .filter((c) => hasFields(c, fields))
      .filter((c) =>
        q
          ? c.name.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => +new Date(b.extractedAt) - +new Date(a.extractedAt));
  }, [contacts, runId, query, fields, inRange]);

  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const clearRunFilter = () => router.push("/contact-extraction/database");

  if (contacts.length === 0) {
    return (
      <EmptyState
        illustration={<ContactRound size={36} strokeWidth={1.25} className="text-text-tertiary" />}
        title="No contacts yet"
        description="Run an extraction and every contact lands here, ready to filter and export."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar sits ABOVE the metric tiles — every filter narrows both the
          cards and the table, so the numbers always describe what's shown. */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search
            size={15}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="Search name, title, or company"
            className="w-full h-9 pl-9 pr-3 text-[12.5px] bg-white border border-border rounded-input focus:border-text-primary focus:outline-none transition-colors placeholder:text-text-tertiary"
          />
        </div>

        {/* Date range — preset segments + a calendar for custom (mirrors Enriched leads). */}
        <div className="relative inline-flex items-center h-9 px-0.5 gap-0.5 bg-surface-secondary rounded-input">
          {([
            { v: "7d", l: "7d" },
            { v: "30d", l: "30d" },
            { v: "90d", l: "90d" },
            { v: "all", l: "All" },
          ] as { v: DateRange; l: string }[]).map((opt) => {
            const active = range === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => {
                  setRange(opt.v);
                  resetPage();
                }}
                className={[
                  "h-8 px-2.5 text-[12px] font-medium rounded-[5px] transition-colors",
                  active
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                {opt.l}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className={[
              "h-8 inline-flex items-center gap-1 px-2.5 text-[12px] font-medium rounded-[5px] transition-colors",
              range === "custom"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            <Calendar size={12} strokeWidth={1.75} />
            {range === "custom" && customStart && customEnd
              ? formatRangeLabel(customStart, customEnd)
              : "Custom"}
          </button>
          <DateRangePopover
            open={customOpen}
            onClose={() => setCustomOpen(false)}
            initialStart={customStart}
            initialEnd={customEnd}
            anchorClass="absolute z-40 top-full left-0 mt-1"
            onApply={(s, e) => {
              setCustomStart(s);
              setCustomEnd(e);
              setRange("custom");
              setCustomOpen(false);
              resetPage();
            }}
          />
        </div>

        <HasFilter
          selected={fields}
          onChange={(next) => {
            setFields(next);
            resetPage();
          }}
        />

        {run && (
          <button
            onClick={clearRunFilter}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-medium text-text-secondary bg-surface-secondary border border-border rounded-input hover:text-text-primary transition-colors"
          >
            Run: <span className="text-text-primary max-w-[180px] truncate">{run.label}</span>
            <X size={13} strokeWidth={1.75} />
          </button>
        )}

        <div className="ml-auto text-[12px] text-text-tertiary tabular-nums">
          {filtered.length.toLocaleString("en-IN")} contact{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Per-type performance funnel — reflects the active filters above. */}
      <PerformancePanel contacts={filtered} />

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-text-tertiary border-b border-border-subtle">
                <th className="font-medium px-5 py-2.5">Name</th>
                <th className="font-medium px-3 py-2.5">Company</th>
                <th className="font-medium px-3 py-2.5">Phone</th>
                <th className="font-medium px-3 py-2.5">Personal email</th>
                <th className="font-medium px-5 py-2.5">Work email</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-tertiary">
                    No contacts match your search or filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((c) => <ContactRow key={c.id} contact={c} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

// Compact, subscriber-facing overview. Dropped from the old dashboard: run
// counts and profile throughput (operational noise). Kept: how many contacts
// you have, how many are verified, and what you actually got (phones / emails).
// Per-type performance funnel. For each contact type we count, over the
// currently-filtered contacts: Requested (the type was asked for — field is
// defined), Found (we returned a value), Verified (value passed verification).
// Three stacked bars per card, each % relative to Requested — so a card reads
// as "of what we promised, how much did we deliver and confirm." Reactive: the
// same `filtered` list feeding the table feeds this, so it narrows with every
// filter (date, Has, search).
const PERF_TYPES: CEContactType[] = ["phone", "personal_email", "work_email"];

function PerfBar({
  label,
  value,
  total,
  rate,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  rate?: number;
  tone: "track" | "found" | "verified";
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const fill =
    tone === "found" ? "bg-[#1D4ED8]" : tone === "verified" ? "bg-[#059669]" : "bg-text-primary/20";
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[58px] shrink-0 text-[11px] text-text-tertiary">{label}</span>
      <div className="flex-1 h-[7px] rounded-full bg-surface-secondary overflow-hidden">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-[86px] shrink-0 text-right text-[11.5px] tabular-nums">
        <span className="text-text-primary font-medium">{value.toLocaleString("en-IN")}</span>
        {rate !== undefined && <span className="text-text-tertiary"> · {rate}%</span>}
      </span>
    </div>
  );
}

function PerformancePanel({ contacts }: { contacts: CEContact[] }) {
  const stats = PERF_TYPES.map((t) => {
    let requested = 0;
    let found = 0;
    let verified = 0;
    for (const c of contacts) {
      const f = fieldOf(c, t);
      if (!f) continue; // type wasn't requested for this contact
      requested += 1;
      if (f.value) found += 1;
      if (f.status === "verified") verified += 1;
    }
    return {
      type: t,
      requested,
      found,
      verified,
      foundRate: requested > 0 ? Math.round((found / requested) * 100) : 0,
      verifiedRate: requested > 0 ? Math.round((verified / requested) * 100) : 0,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.type} className="bg-white border border-border rounded-card px-4 py-3.5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[12.5px] font-semibold text-text-primary">
              {CE_TYPE_LABEL[s.type]}
            </span>
            <span className="text-[11px] text-text-tertiary tabular-nums">
              {s.requested.toLocaleString("en-IN")} requested
            </span>
          </div>
          <div className="space-y-2">
            <PerfBar label="Requested" value={s.requested} total={s.requested} tone="track" />
            <PerfBar
              label="Found"
              value={s.found}
              total={s.requested}
              rate={s.foundRate}
              tone="found"
            />
            <PerfBar
              label="Verified"
              value={s.verified}
              total={s.requested}
              rate={s.verifiedRate}
              tone="verified"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Multi-select "Has" filter. Fields combine freely (phone + work email, all
// three, etc.), so a single-select dropdown can't express it — this opens a
// small popover with the SAME TypeCheckboxes used in the composer. AND-semantics:
// a contact shows only if it carries every checked field.
function HasFilter({
  selected,
  onChange,
}: {
  selected: CEContactType[];
  onChange: (next: CEContactType[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = selected.length > 0;

  const label =
    selected.length === 0
      ? "Any field"
      : selected.length === 1
        ? CE_TYPE_LABEL[selected[0]]
        : `${selected.length} fields`;

  const toggle = (t: CEContactType) =>
    onChange(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center h-9 pl-3 pr-2 text-[12px] font-medium bg-white border rounded-input transition-colors",
          active
            ? "border-text-primary text-text-primary"
            : "border-border text-text-secondary hover:border-text-tertiary",
        ].join(" ")}
      >
        <span className="text-text-tertiary mr-1">Has:</span>
        <span className="text-text-primary">{label}</span>
        <ChevronDown size={14} strokeWidth={1.75} className="ml-1.5 text-text-tertiary" />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 top-full left-0 mt-1 w-[200px] bg-white border border-border rounded-card shadow-lg p-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
                Has field
              </span>
              {active && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="[&>div]:flex-col [&>div]:!gap-y-2.5 [&>div]:items-start">
              <TypeCheckboxes selected={selected} onToggle={toggle} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ContactRow({ contact }: { contact: CEContact }) {
  return (
    <tr className="border-b border-border-subtle last:border-0 hover:bg-surface-page/50">
      <td className="px-5 py-3 align-top">
        <ProfileNameLink name={contact.name} linkedin={contact.linkedin} />
        <div className="text-[11px] text-text-tertiary mt-0.5 max-w-[200px] truncate">{contact.title}</div>
      </td>
      <td className="px-3 py-3 align-top">
        <div className="text-text-secondary">{contact.company}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5 max-w-[180px] truncate">{contact.location}</div>
      </td>
      <td className="px-3 py-3 align-top"><ContactFieldCell field={contact.phone} /></td>
      <td className="px-3 py-3 align-top"><ContactFieldCell field={contact.personalEmail} /></td>
      <td className="px-5 py-3 align-top"><ContactFieldCell field={contact.workEmail} /></td>
    </tr>
  );
}
