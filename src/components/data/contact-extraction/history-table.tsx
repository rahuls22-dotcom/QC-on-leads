"use client";

// Run history for one source (bulk or single). Single rows surface the actual
// extracted values inline. Bulk rows roll up into requested / found-verified /
// credit totals, and open a side drawer with the per-type breakdown + export.

import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";

import {
  CE_TYPE_SHORT,
  runCredits,
  useCEStore,
  type CEContact,
  type CEContactType,
  type CERun,
  type CERunSource,
} from "@/lib/contact-extraction-data";

import { RunStatusBadge, relativeTime } from "./dashboard";
import { ContactFieldCell, Pagination, ProfileNameLink } from "./parts";
import { CEBulkRunDrawer } from "./run-drawer";

const PAGE_SIZE = 10;

export function CEHistoryTable({
  source,
  title,
}: {
  source: CERunSource;
  title: string;
}) {
  const runs = useCEStore((s) => s.runs);
  const contacts = useCEStore((s) => s.contacts);

  // single lookups are one profile each, so we surface the actual extracted
  // values per field. Bulk runs roll up into found/verified totals instead.
  const single = source === "single";

  // bulk rows open a side drawer; track which run is open.
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  // search + status filter (status filter only applies to bulk runs)
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () =>
      [...runs]
        .filter((r) => r.source === source)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [runs, source],
  );

  const contactByRun = useMemo(() => {
    const m = new Map<string, CEContact>();
    for (const c of contacts) if (!m.has(c.runId)) m.set(c.runId, c);
    return m;
  }, [contacts]);

  // Apply status + free-text search. For single lookups we also match against
  // the extracted name / phone / emails so you can find a contact by value.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const done = r.status === "done";
      if (status === "done" && !done) return false;
      if (status === "running" && done) return false;
      if (!q) return true;
      const c = contactByRun.get(r.id);
      const hay = [
        r.label,
        ...(single && c
          ? [c.name, c.phone?.value, c.personalEmail?.value, c.workEmail?.value]
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, status, contactByRun, single]);

  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openRun = openRunId ? (rows.find((r) => r.id === openRunId) ?? null) : null;
  const openRunContacts = useMemo(
    () => (openRunId ? contacts.filter((c) => c.runId === openRunId) : []),
    [contacts, openRunId],
  );

  const colSpan = single ? 6 : 8;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-semibold text-text-primary">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={single ? "Search name, phone, email…" : "Search runs…"}
              className="h-8 w-[210px] pl-8 pr-7 text-[12.5px] bg-white border border-border rounded-input focus:border-text-primary focus:outline-none transition-colors placeholder:text-text-tertiary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            )}
          </div>
          {/* Status filter is only meaningful for bulk runs (single lookups
              resolve instantly, so Done/Running adds nothing). */}
          {!single && (
            <StatusFilterTabs
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            />
          )}
        </div>
      </div>
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-[12.5px] ${single ? "" : "table-fixed"}`}>
            {/* Bulk: fixed even-fill column proportions so the few numeric
                columns distribute edge-to-edge instead of bunching or leaving a
                void. Run gets the widest share; the rest are evenly sized. */}
            {!single && (
              <colgroup>
                <col style={{ width: "27%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "5%" }} />
              </colgroup>
            )}
            <thead>
              <tr className="text-left text-text-tertiary border-b border-border-subtle">
                {single ? (
                  <>
                    <th className="font-medium px-5 py-2.5">Name</th>
                    <th className="font-medium px-3 py-2.5">Company</th>
                    <th className="font-medium px-3 py-2.5">Phone</th>
                    <th className="font-medium px-3 py-2.5">Personal email</th>
                    <th className="font-medium px-3 py-2.5">Work email</th>
                    <th className="font-medium px-5 py-2.5 text-right">When</th>
                  </>
                ) : (
                  <>
                    <th className="font-medium px-5 py-2.5">Run</th>
                    <th className="font-medium px-4 py-2.5 text-right whitespace-nowrap">Uploaded</th>
                    <th className="font-medium px-4 py-2.5 text-right whitespace-nowrap">Requested</th>
                    <th className="font-medium px-4 py-2.5 text-right whitespace-nowrap">Extracted</th>
                    <th className="font-medium px-4 py-2.5 text-right whitespace-nowrap">Credits</th>
                    <th className="font-medium px-4 py-2.5 text-center whitespace-nowrap">Status</th>
                    <th className="font-medium px-4 py-2.5 text-right whitespace-nowrap">When</th>
                    <th className="px-5 py-2.5" />
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-5 py-10 text-center text-text-tertiary">
                    {rows.length === 0
                      ? "No runs yet."
                      : "No runs match your search or filter."}
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <Row
                    key={r.id}
                    run={r}
                    single={single}
                    contact={contactByRun.get(r.id)}
                    onOpen={single ? undefined : () => setOpenRunId(r.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {!single && (
        <CEBulkRunDrawer
          run={openRun}
          contacts={openRunContacts}
          open={openRunId !== null}
          onClose={() => setOpenRunId(null)}
        />
      )}
    </div>
  );
}

type StatusFilter = "all" | "done" | "running";

// Small segmented control for the status filter.
function StatusFilterTabs({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  const opts: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "done", label: "Done" },
    { key: "running", label: "Running" },
  ];
  return (
    <div className="inline-flex items-center h-8 p-0.5 bg-surface-secondary rounded-input">
      {opts.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={[
              "h-7 px-2.5 text-[12px] font-medium rounded-[5px] transition-colors",
              on
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  run,
  single,
  contact,
  onOpen,
}: {
  run: CERun;
  single: boolean;
  contact?: CEContact;
  onOpen?: () => void;
}) {
  if (single) return <SingleRow run={run} contact={contact} />;
  return <BulkRow run={run} onOpen={onOpen} />;
}

// Single lookup = one extracted contact, so the row mirrors the Database table
// exactly (Name / Company / field cells with status pills), plus a When column.
function SingleRow({ run, contact }: { run: CERun; contact?: CEContact }) {
  const running = run.status !== "done";
  return (
    <tr className="border-b border-border-subtle last:border-0 hover:bg-surface-page/50">
      <td className="px-5 py-3 align-top">
        <ProfileNameLink name={contact?.name ?? run.label} linkedin={contact?.linkedin} />
        <div className="text-[11px] text-text-tertiary mt-0.5 max-w-[200px] truncate">
          {contact?.title ?? (running ? "Looking up…" : "")}
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <div className="text-text-secondary">{contact?.company ?? <Dash />}</div>
        {contact?.location && (
          <div className="text-[11px] text-text-tertiary mt-0.5 max-w-[180px] truncate">
            {contact.location}
          </div>
        )}
      </td>
      <td className="px-3 py-3 align-top">
        {running ? <Skeleton /> : <ContactFieldCell field={contact?.phone} />}
      </td>
      <td className="px-3 py-3 align-top">
        {running ? <Skeleton /> : <ContactFieldCell field={contact?.personalEmail} />}
      </td>
      <td className="px-3 py-3 align-top">
        {running ? <Skeleton /> : <ContactFieldCell field={contact?.workEmail} />}
      </td>
      <td className="px-5 py-3 align-top text-right text-text-tertiary whitespace-nowrap">
        {relativeTime(run.createdAt)}
      </td>
    </tr>
  );
}

// Bulk run = a rollup across many profiles; opens the side drawer on click.
// Contact types shown as proper tag chips (not "·"-joined text). Verification is
// surfaced as the verified count under Found, not a separate chip here.
function TypeTags({ types }: { types: CEContactType[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {types.map((t) => (
        <span
          key={t}
          className="inline-flex items-center h-[18px] px-1.5 rounded-[4px] text-[10.5px] font-medium text-text-secondary bg-surface-secondary border border-border-subtle"
        >
          {CE_TYPE_SHORT[t]}
        </span>
      ))}
    </div>
  );
}

function BulkRow({ run, onOpen }: { run: CERun; onOpen?: () => void }) {
  const found = sumOver(run, "found");
  // "Requested" = total field requests across every selected type (leads × types),
  // so it's comparable to Extracted (also summed across types).
  const requested = run.total * run.requestedTypes.length;
  const running = run.status !== "done";
  const credits = runCredits(run);

  return (
    <tr
      onClick={onOpen}
      className={[
        "border-b border-border-subtle last:border-0",
        onOpen ? "hover:bg-surface-page/50 cursor-pointer" : "",
      ].join(" ")}
    >
      <td className="px-5 py-2.5">
        <div className="text-text-primary font-medium max-w-[240px] truncate">{run.label}</div>
        <TypeTags types={run.requestedTypes} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary whitespace-nowrap">
        {run.total.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-text-secondary whitespace-nowrap">
        {requested.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
        {run.status === "done" ? (
          <span className="text-text-primary font-medium">{found.toLocaleString("en-IN")}</span>
        ) : (
          <Dash />
        )}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
        {running ? (
          <span className="text-text-tertiary">{credits.blocked.toLocaleString("en-IN")} blocked</span>
        ) : (
          <div className="leading-tight">
            <span className="text-text-primary font-medium">
              {credits.used.toLocaleString("en-IN")}
            </span>
            <span className="text-text-tertiary"> used</span>
            {credits.refunded > 0 && (
              <div className="text-[11px] text-[#059669]">
                {credits.refunded.toLocaleString("en-IN")} refunded
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        <RunStatusBadge run={run} />
      </td>
      <td className="px-4 py-2.5 text-right text-text-tertiary whitespace-nowrap">
        {relativeTime(run.createdAt)}
      </td>
      <td className="px-5 py-2.5 text-right">
        {onOpen && <ChevronRight size={15} strokeWidth={1.75} className="text-text-tertiary inline" />}
      </td>
    </tr>
  );
}

function Dash() {
  return <span className="text-text-tertiary">—</span>;
}

function Skeleton() {
  return <span className="block h-2.5 w-32 bg-surface-page rounded animate-pulse" />;
}

function sumOver(run: CERun, key: "found" | "verified"): number {
  return run.requestedTypes.reduce((a, t) => a + run.counts[t][key], 0);
}
