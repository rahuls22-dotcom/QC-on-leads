"use client";

// Right-side drawer for a single bulk run. Shows the credit ledger (blocked /
// used / refunded), a per-contact-type found+verified breakdown, and buttons to
// download every contact in the run as CSV or Excel. Same scrim + sliding panel
// language as the enrichment mapping-drawer.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileSpreadsheet, RotateCcw, X } from "lucide-react";

import {
  CE_TYPE_LABEL,
  runCredits,
  type CEContact,
  type CEContactType,
  type CEFieldResult,
  type CERun,
} from "@/lib/contact-extraction-data";

import { RunStatusBadge, relativeTime } from "./dashboard";

export function CEBulkRunDrawer({
  run,
  contacts,
  open,
  onClose,
}: {
  run: CERun | null;
  contacts: CEContact[];
  open: boolean;
  onClose: () => void;
}) {

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  const credits = run ? runCredits(run) : null;
  const running = run?.status !== "done";

  return createPortal(
    <AnimatePresence>
      {open && run && credits && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/30"
            aria-hidden
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-[71] h-screen w-full sm:w-[560px] bg-surface-page border-l border-border shadow-[0_0_40px_rgba(15,15,15,0.12)] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Run details"
          >
            <header className="flex items-start justify-between px-5 py-3 border-b border-border bg-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-text-primary truncate max-w-[360px]">
                    {run.label}
                  </h2>
                  <RunStatusBadge run={run} />
                </div>
                <div className="text-[11.5px] text-text-tertiary mt-0.5">
                  {run.total.toLocaleString("en-IN")} profiles requested ·{" "}
                  {run.requestedTypes.map((t) => CE_TYPE_LABEL[t]).join(" · ")} · {relativeTime(run.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 -mr-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors shrink-0"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Credits */}
              <section>
                <h3 className="text-[12px] font-semibold text-text-primary mb-2">Credits</h3>
                <div className="grid grid-cols-3 gap-2.5">
                  <CreditTile label="Blocked" value={credits.blocked} tone="neutral" />
                  <CreditTile label="Used" value={running ? null : credits.used} tone="charge" />
                  <CreditTile label="Refunded" value={running ? null : credits.refunded} tone="refund" />
                </div>
                <p className="flex items-start gap-1.5 text-[11px] text-text-tertiary mt-2 leading-snug">
                  <RotateCcw size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  {running
                    ? "Credits are blocked while the run is in progress. Anything we can't find is refunded once it finishes."
                    : "1 credit blocked per contact type per profile. Every field we couldn't find was refunded — you only paid for delivered contacts."}
                </p>
              </section>

              {/* Per-type breakdown */}
              <section>
                <h3 className="text-[12px] font-semibold text-text-primary mb-2">By contact type</h3>
                <div className="space-y-2.5">
                  {run.requestedTypes.map((type) => (
                    <TypeBreakdown
                      key={type}
                      type={type}
                      requested={run.counts[type].requested}
                      found={run.counts[type].found}
                      verified={run.counts[type].verified}
                      running={running}
                    />
                  ))}
                </div>
              </section>

              {/* Export */}
              <section>
                <h3 className="text-[12px] font-semibold text-text-primary mb-2">Export</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => downloadCsv(run, contacts)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-input border border-border bg-white text-[12.5px] font-medium text-text-secondary hover:border-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={13} strokeWidth={1.75} />
                    Download CSV
                  </button>
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => downloadExcel(run, contacts)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-input border border-border bg-white text-[12.5px] font-medium text-text-secondary hover:border-text-tertiary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileSpreadsheet size={13} strokeWidth={1.75} />
                    Download Excel
                  </button>
                </div>
                {running && (
                  <p className="text-[11px] text-text-tertiary mt-1.5">Available once the run finishes.</p>
                )}
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function CreditTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "neutral" | "charge" | "refund";
}) {
  const color =
    tone === "refund" ? "text-[#059669]" : tone === "charge" ? "text-text-primary" : "text-text-primary";
  return (
    <div className="bg-white border border-border rounded-card px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1">{label}</div>
      <div className={["text-[18px] font-semibold tabular-nums tracking-tight", color].join(" ")}>
        {value === null ? <span className="text-text-tertiary">—</span> : value.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

function TypeBreakdown({
  type,
  requested,
  found,
  verified,
  running,
}: {
  type: CEContactType;
  requested: number;
  found: number;
  verified: number;
  running: boolean;
}) {
  const foundPct = requested ? Math.round((found / requested) * 100) : 0;
  const verifiedPct = requested ? Math.round((verified / requested) * 100) : 0;
  return (
    <div className="bg-white border border-border rounded-card p-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12.5px] font-semibold text-text-primary">{CE_TYPE_LABEL[type]}</span>
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {requested.toLocaleString("en-IN")} requested
        </span>
      </div>
      {running ? (
        <div className="text-[11.5px] text-text-tertiary">Extracting…</div>
      ) : (
        <>
          <Bar label="Found" value={found} pct={foundPct} color="#2563EB" track="#EFF6FF" />
          <Bar label="Verified" value={verified} pct={verifiedPct} color="#059669" track="#ECFDF5" />
        </>
      )}
    </div>
  );
}

function Bar({
  label,
  value,
  pct,
  color,
  track,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  track: string;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11.5px] text-text-secondary">{label}</span>
        <span className="text-[11.5px] tabular-nums text-text-primary">
          <span className="font-semibold">{value.toLocaleString("en-IN")}</span>
          <span className="text-text-tertiary"> · {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

function fieldCells(f: CEFieldResult | undefined): [string, string] {
  if (!f) return ["", ""];
  return [f.value ?? "", f.value ? f.status : "not_found"];
}

// Builds the header + rows for a run, including only the contact-type columns
// that were actually requested.
function exportTable(run: CERun, contacts: CEContact[]): { header: string[]; rows: string[][] } {
  const wantPhone = run.requestedTypes.includes("phone");
  const wantPersonal = run.requestedTypes.includes("personal_email");
  const wantWork = run.requestedTypes.includes("work_email");

  const header = ["Name", "Title", "Company", "Location", "LinkedIn"];
  if (wantPhone) header.push("Phone", "Phone status");
  if (wantPersonal) header.push("Personal email", "Personal status");
  if (wantWork) header.push("Work email", "Work status");

  const rows = contacts.map((c) => {
    const row = [c.name, c.title, c.company, c.location, c.linkedin];
    if (wantPhone) row.push(...fieldCells(c.phone));
    if (wantPersonal) row.push(...fieldCells(c.personalEmail));
    if (wantWork) row.push(...fieldCells(c.workEmail));
    return row;
  });
  return { header, rows };
}

function baseName(label: string): string {
  return label.replace(/\.(csv|xlsx?|tsv)$/i, "").trim() || "contact-extraction";
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(run: CERun, contacts: CEContact[]) {
  const { header, rows } = exportTable(run, contacts);
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  // BOM so Excel reads UTF-8 correctly.
  downloadBlob("﻿" + lines.join("\r\n"), "text/csv;charset=utf-8", `${baseName(run.label)}.csv`);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// SpreadsheetML 2003 — a dependency-free .xls that Excel/Numbers/Sheets open
// natively, with a real header row in bold.
function downloadExcel(run: CERun, contacts: CEContact[]) {
  const { header, rows } = exportTable(run, contacts);
  const cell = (v: string) => `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`;
  const headRow = `<Row>${header.map((h) => `<Cell ss:StyleID="h"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join("")}</Row>`;
  const bodyRows = rows.map((r) => `<Row>${r.map(cell).join("")}</Row>`).join("");
  const xml =
    `<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>` +
    `<Worksheet ss:Name="Contacts"><Table>${headRow}${bodyRows}</Table></Worksheet></Workbook>`;
  downloadBlob(xml, "application/vnd.ms-excel", `${baseName(run.label)}.xls`);
}
