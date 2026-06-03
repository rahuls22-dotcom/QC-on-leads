"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  UserPlus,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Filter as FilterIcon,
  Info,
  Pause,
  Play,
  Database,
  Download,
  Clock,
  IndianRupee,
  Code2,
  FileText,
  Pencil,
  PhoneOff,
  PhoneIncoming,
  Loader2,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";
import {
  outreachDetail,
  outreachContacts,
  dailyTalktime90d,
  dailySpend90d,
} from "@/lib/outreach-data";
import type { ContactOutcome, AIQualStatus, OutreachContact } from "@/lib/outreach-data";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EditOutreachDrawer, type EditOutreachInitial } from "@/components/outreach/edit-outreach-drawer";
import { PhoneInput } from "@/components/shared/phone-input";

// Avatar palette matched to /enquiries — same eight colours so contacts in
// the outreach detail get the same look as leads in the Leads page.
const avatarColors = ["#F87171", "#FB923C", "#FBBF24", "#34D399", "#60A5FA", "#A78BFA", "#F472B6", "#6EE7B7"];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

function OutcomeBadge({ outcome }: { outcome: ContactOutcome }) {
  const config: Record<ContactOutcome, { label: string; cls: string }> = {
    qualified:     { label: "Qualified",     cls: "bg-[#F0FDF4] text-[#15803D]" },
    not_qualified: { label: "Not Qualified", cls: "bg-[#FEF2F2] text-[#DC2626]" },
    callback:      { label: "Callback",      cls: "bg-[#FEF3C7] text-[#92400E]" },
    no_answer:     { label: "No Answer",     cls: "bg-surface-secondary text-text-secondary" },
    not_called:    { label: "Not Called",    cls: "bg-surface-secondary text-text-tertiary" },
    busy:          { label: "Busy",          cls: "bg-[#FEF3C7] text-[#92400E]" },
    wrong_number:  { label: "Wrong #",       cls: "bg-[#FEF2F2] text-[#DC2626]" },
  };
  const { label, cls } = config[outcome];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

// ── Outreach status control: prominent pill + change-status dropdown ──────────

const STATUS_CONFIG = {
  running:   { label: "Running",   dot: "#22C55E", cls: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]" },
  paused:    { label: "Paused",    dot: "#F5A623", cls: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" },
  completed: { label: "Completed", dot: "#3B82F6", cls: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  draft:     { label: "Draft",     dot: "#9CA3AF", cls: "bg-surface-secondary text-text-secondary border-border" },
} as const;

// Inline status badge — read-only pill that sits next to the campaign name.
// Status changes happen via the separate Pause/Resume action button on the
// right of the header, so this badge no longer carries a dropdown affordance
// (no chevron, no menu, no click). It's purely informational.
function InlineStatusBadge({
  status,
}: {
  status: keyof typeof STATUS_CONFIG;
}) {
  const current = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-full border ${current.cls}`}
      aria-label={`Status: ${current.label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.dot }} />
      {current.label}
    </span>
  );
}

// Major action button — solid fill, contextual to the campaign state. Reads
// as the primary thing you'd do right now: pause when running, resume when
// paused, launch when draft, reactivate when completed.
function StatusActionButton({
  status,
  onChange,
}: {
  status: keyof typeof STATUS_CONFIG;
  onChange: (s: keyof typeof STATUS_CONFIG) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Button styles follow the campaigns pattern — tinted, not solid colour.
  // Pause = amber tint (warning-but-recoverable), Resume = green tint (going
  // back to healthy), Reactivate = neutral outline, Launch = primary accent.
  const ACTION: Record<keyof typeof STATUS_CONFIG, {
    label: string;
    next: keyof typeof STATUS_CONFIG;
    icon: typeof Pause;
    /** Tailwind classes for the button itself */
    btn: string;
    /** Hex used for the icon circle in the confirm modal */
    accent: string;
    confirmTitle: string;
    confirmBody: string;
    confirmCta: string;
  }> = {
    running: {
      label: "Pause", next: "paused", icon: Pause,
      btn: "text-text-secondary bg-white border-border hover:bg-surface-page hover:text-text-primary",
      accent: "#D97706",
      confirmTitle: "Pause this outreach?",
      confirmBody:
        "Calls in progress will finish, but no new dials will be placed until you resume. You can pick this back up anytime.",
      confirmCta: "Pause outreach",
    },
    paused: {
      label: "Resume", next: "running", icon: Play,
      btn: "text-[#15803D] bg-[#F0FDF4] border-[#BBF7D0] hover:bg-[#DCFCE7]",
      accent: "#16A34A",
      confirmTitle: "Resume this outreach?",
      confirmBody:
        "We'll start placing calls again from where we left off, following the schedule and pace you configured.",
      confirmCta: "Resume outreach",
    },
    completed: {
      label: "Reactivate", next: "running", icon: Play,
      btn: "text-text-secondary bg-white border-border hover:bg-surface-page hover:text-text-primary",
      accent: "#1F2937",
      confirmTitle: "Reactivate this outreach?",
      confirmBody:
        "Re-opens the queue so the agent can keep working any leads that weren't qualified.",
      confirmCta: "Reactivate",
    },
    draft: {
      label: "Launch", next: "running", icon: Play,
      btn: "text-white bg-accent border-accent hover:bg-accent-hover",
      accent: "#1A1A1A",
      confirmTitle: "Launch this outreach?",
      confirmBody:
        "We'll start dialing immediately, following the schedule you configured. Make sure the agent script is ready.",
      confirmCta: "Launch",
    },
  };
  const a = ACTION[status];
  const Icon = a.icon;

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className={`inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-medium border rounded-button transition-colors ${a.btn}`}
      >
        <Icon size={13} strokeWidth={2} fill="currentColor" />
        {a.label}
      </button>

      {/* Confirmation modal — every status flip goes through this prompt
          because each one materially changes call activity for everyone
          using the outreach. */}
      {confirmOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[70]"
            onClick={() => setConfirmOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-confirm-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] bg-white rounded-card shadow-xl z-[80] overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: a.accent }}
                  aria-hidden
                >
                  <Icon size={16} strokeWidth={2} fill="currentColor" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3
                    id="status-confirm-title"
                    className="text-[15px] font-semibold text-text-primary leading-tight"
                  >
                    {a.confirmTitle}
                  </h3>
                  <p className="text-[13px] text-text-secondary leading-relaxed mt-1.5">
                    {a.confirmBody}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-surface-page/60 border-t border-border-subtle">
              <button
                onClick={() => setConfirmOpen(false)}
                className="inline-flex items-center h-9 px-4 text-[13px] font-medium text-text-secondary rounded-button hover:bg-white transition-colors"
              >
                Cancel
              </button>
              {/* Confirm CTA — solid dark accent button (matches primary
                  actions like "Add Leads"). Falls back to the existing
                  per-state accent colour for the icon circle. */}
              <button
                onClick={() => {
                  onChange(a.next);
                  setConfirmOpen(false);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium rounded-button text-white bg-accent hover:bg-accent-hover transition-colors"
              >
                <Icon size={13} strokeWidth={2} fill="currentColor" />
                {a.confirmCta}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Modern contact row ─────────────────────────────────────────────────────

// Deterministic per-name avatar colour so the same lead always gets the same chip.
function avatarColor(name: string): string {
  const palette = ["#4F46E5", "#7C3AED", "#22C55E", "#0EA5E9", "#F59E0B", "#EC4899", "#14B8A6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 2147483647;
  return palette[hash % palette.length];
}

function ContactRow({ c }: { c: OutreachContact }) {
  const initials = c.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="px-5 py-3.5 grid grid-cols-[1fr_auto_1fr_auto_auto] gap-5 items-center hover:bg-surface-page/40 transition-colors duration-150">
      {/* Lead — avatar + name + phone */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11.5px] font-semibold text-white shrink-0"
          style={{ backgroundColor: avatarColor(c.name) }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-text-primary truncate">{c.name}</div>
          <div className="text-[11.5px] text-text-tertiary tabular-nums">{c.phone}</div>
        </div>
      </div>

      {/* AI qualification pill */}
      <div className="shrink-0">
        <QualStatusBadge status={c.qualStatus} />
      </div>

      {/* Next action + time */}
      <div className="min-w-0">
        {c.nextAction ? (
          <>
            <div className="text-[12.5px] font-medium text-text-primary truncate flex items-center gap-1.5">
              <ArrowRight size={11} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
              {c.nextAction}
            </div>
            {c.nextActionAt && (
              <div className="text-[11px] text-text-tertiary tabular-nums mt-0.5">
                {format(new Date(c.nextActionAt), "dd MMM · HH:mm")}
              </div>
            )}
          </>
        ) : (
          <span className="text-[12px] text-text-tertiary">No follow-up</span>
        )}
      </div>

      {/* Duration */}
      <div className="text-right shrink-0">
        <div className="text-[12px] text-text-tertiary uppercase tracking-[0.4px]">Duration</div>
        <div className="text-[13px] font-semibold text-text-primary tabular-nums mt-0.5">
          {c.duration !== null ? `${c.duration} min` : "—"}
        </div>
      </div>

      {/* Created / Updated */}
      <div className="text-right shrink-0 text-[11.5px] tabular-nums">
        <div className="text-text-tertiary">
          Created <span className="text-text-secondary font-medium">{format(new Date(c.createdAt), "dd MMM")}</span>
        </div>
        <div className="text-text-tertiary mt-0.5">
          Updated <span className="text-text-secondary font-medium">{format(new Date(c.updatedAt), "dd MMM")}</span>
        </div>
      </div>
    </div>
  );
}

// ── Source filter — page-level multi-select scoping all widgets ─────────────

function SourceFilter({
  sources,
  selected,
  allSelected,
  menuOpen,
  setMenuOpen,
  onToggle,
  onSetAll,
}: {
  sources: { id: string; name: string; leads: number; uploadedAt: string }[];
  selected: string[];
  allSelected: boolean;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  onToggle: (id: string) => void;
  onSetAll: (all: boolean) => void;
}) {
  const label = allSelected
    ? `All sources · ${sources.length}`
    : selected.length === 0
      ? "No sources"
      : `${selected.length} of ${sources.length} sources`;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className={`inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-medium rounded-button border transition-colors ${
          allSelected
            ? "border-border bg-white text-text-secondary hover:bg-surface-page"
            : "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
        }`}
      >
        <Database size={13} strokeWidth={1.5} />
        {label}
        <ChevronDown size={13} strokeWidth={1.5} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1.5 w-[300px] bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
              <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Uploaded sources</span>
              <button
                onClick={() => onSetAll(!allSelected)}
                className="text-[11.5px] font-medium text-accent hover:underline"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto py-1">
              {sources.map(s => {
                const checked = selected.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-page cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(s.id)}
                      className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
                    />
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#F0FDF4] text-[#15803D] shrink-0">
                      <FileSpreadsheet size={12} strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-text-primary truncate" title={s.name}>{s.name}</div>
                      <div className="text-[10.5px] text-text-tertiary tabular-nums flex items-center gap-1">
                        <span>Uploaded {format(new Date(s.uploadedAt), "dd MMM yyyy")}</span>
                        <span className="text-border">·</span>
                        <span>{s.leads.toLocaleString()} leads</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="px-3 py-2 border-t border-border-subtle text-[10.5px] text-text-tertiary tabular-nums">
              Selected: <span className="text-text-secondary font-medium">{selected.reduce((sum, id) => sum + (sources.find(s => s.id === id)?.leads ?? 0), 0).toLocaleString()}</span> leads
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QualStatusBadge({ status }: { status: AIQualStatus }) {
  if (status === null) {
    return <span className="text-[11px] text-text-tertiary">—</span>;
  }
  const config: Record<NonNullable<AIQualStatus>, { label: string; cls: string }> = {
    qualified:         { label: "Qualified",         cls: "bg-[#F0FDF4] text-[#15803D]" },
    disqualified:      { label: "Disqualified",      cls: "bg-[#FEF2F2] text-[#DC2626]" },
    intent_qualified:  { label: "Intent Qualified",  cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
    customer_followup: { label: "Customer Follow up", cls: "bg-[#FEF3C7] text-[#92400E]" },
    rnr:               { label: "RnR",               cls: "bg-surface-secondary text-text-secondary" },
  };
  const { label, cls } = config[status];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

// ── Add Leads Modal ────────────────────────────────────────────────────────────

interface ManualLead {
  id: string;
  name: string;
  phone: string;
}

interface CsvInvalidBreakdown {
  missingPhone: number;
  invalidFormat: number;
  duplicatePhone: number;
  missingName: number;
}

type RowStatus = "valid" | "missingName" | "missingPhone" | "invalidFormat" | "duplicate";

interface PreviewRow {
  cells: string[];
  status: RowStatus;
}

interface CsvFile {
  name: string;
  totalRows: number;
  validRows: number;
  invalid: CsvInvalidBreakdown;
  previewHeaders: string[];
  previewRows: PreviewRow[];
  // Full tagged row set — used by the per-file "Download CSV" action so the
  // user can grab a copy of every row with its validation status appended.
  // Capped at MAX rows downstream because this is a sample, not an export.
  allRows: PreviewRow[];
}

const INVALID_REASONS: Array<{ key: keyof CsvInvalidBreakdown; label: string; hint: string }> = [
  { key: "missingPhone",   label: "Missing phone",   hint: "Row has no value in the phone column" },
  { key: "invalidFormat",  label: "Invalid format",  hint: "Couldn't parse as a 10-digit number" },
  { key: "duplicatePhone", label: "Duplicate",       hint: "Already exists in this file" },
  { key: "missingName",    label: "Missing name",    hint: "Row has no value in the name column" },
];

// Short labels for the per-row status pill shown in the preview.
const ROW_STATUS_LABEL: Record<Exclude<RowStatus, "valid">, string> = {
  missingName:   "Missing name",
  missingPhone:  "Missing phone",
  invalidFormat: "Invalid format",
  duplicate:     "Duplicate",
};

// Minimal CSV row splitter — supports double-quoted fields with embedded
// commas. Doesn't try to be a full RFC 4180 parser; sufficient for typical
// exports from spreadsheets.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

// Parse and validate a CSV file's text content. Auto-detects which columns
// hold the name and phone by common header names.
function parseAndValidateCsv(name: string, text: string): CsvFile {
  const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (allLines.length === 0) {
    return {
      name,
      totalRows: 0,
      validRows: 0,
      invalid: { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 },
      previewHeaders: [],
      previewRows: [],
      allRows: [],
    };
  }

  const headerCells = splitCsvLine(allLines[0]);
  const headerLower = headerCells.map(h => h.toLowerCase());
  const phoneIdx = headerLower.findIndex(h => /phone|mobile|whatsapp|^number$/.test(h));
  const nameIdx  = headerLower.findIndex(h => /^name$|^full\s*name$|^lead\s*name$|first\s*name|^contact$/.test(h));

  const dataLines = allLines.slice(1);
  const seen = new Set<string>();

  // Tag every row with its status while we scan, so the preview can highlight
  // exactly the rows the user lost — without re-running validation per row.
  const taggedAll: PreviewRow[] = dataLines.map((line) => {
    const cols = splitCsvLine(line);
    const phoneRaw = phoneIdx >= 0 ? (cols[phoneIdx] ?? "") : "";
    const nameRaw  = nameIdx  >= 0 ? (cols[nameIdx]  ?? "") : "";

    if (!nameRaw.trim())  return { cells: cols, status: "missingName" };
    if (!phoneRaw.trim()) return { cells: cols, status: "missingPhone" };

    const digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 12) return { cells: cols, status: "invalidFormat" };

    if (seen.has(digits)) return { cells: cols, status: "duplicate" };
    seen.add(digits);
    return { cells: cols, status: "valid" };
  });

  // Roll up counts from the tagged set.
  let missingPhone = 0, invalidFormat = 0, duplicatePhone = 0, missingName = 0, valid = 0;
  for (const r of taggedAll) {
    if (r.status === "valid")         valid++;
    else if (r.status === "missingPhone")  missingPhone++;
    else if (r.status === "invalidFormat") invalidFormat++;
    else if (r.status === "duplicate")     duplicatePhone++;
    else if (r.status === "missingName")   missingName++;
  }

  // Preview = the first 10 rows, biased to include any failures so the user
  // actually sees them (otherwise a clean run shows the first 10 valid rows).
  const failedRows = taggedAll.filter(r => r.status !== "valid").slice(0, 5);
  const validRows  = taggedAll.filter(r => r.status === "valid").slice(0, 5);
  const previewRows = [...failedRows, ...validRows].slice(0, 10);

  return {
    name,
    totalRows: dataLines.length,
    validRows: valid,
    invalid: { missingPhone, invalidFormat, duplicatePhone, missingName },
    previewHeaders: headerCells,
    previewRows,
    allRows: taggedAll,
  };
}

// Sample CSV — small, valid, includes one row of each common variation so it
// also serves as a quick template the user can build on.
function generateSampleCsv(): string {
  return [
    "Name,Phone,Email,Source,Budget",
    "Ramesh Kumar,9876543210,ramesh@gmail.com,Meta Lead,1.5Cr",
    "Sunita Patel,9012345678,sunita@yahoo.com,Website,2Cr",
    "Vikram Singh,8765432109,vikram@outlook.com,Meta Lead,80L",
    "Ananya Rao,9123456780,ananya@gmail.com,Referral,1.8Cr",
    "Deepak Menon,8012345679,deepak@gmail.com,Meta Lead,1.2Cr",
  ].join("\n");
}

// CSV-safe quoting — wraps in double quotes only if the cell contains a
// character that would break the parse (comma, quote, newline). Embedded
// quotes get doubled up per RFC 4180.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Build a CSV string from a list of contacts. The column set mirrors what
// the user sees in the table plus a few useful machine-readable fields
// (outcome, lead type, temperature, sent_to_crm) so the export is useful
// for downstream CRM imports too. Empty cells are left empty so importers
// can distinguish "not yet" from "explicit no".
function buildContactsCsv(rows: OutreachContact[]): string {
  const headers = [
    "Name", "Phone",
    "Outcome", "AI Qualification",
    "Next Action", "Next Action At",
    "Duration (min)", "Called At",
    "Verified", "Sent to CRM",
    "Key Notes",
    "Created At", "Updated At",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push([
      c.name, c.phone,
      c.outcome, c.qualStatus ?? "",
      c.nextAction ?? "", c.nextActionAt ?? "",
      c.duration ?? "", c.calledAt ?? "",
      c.verified ? "yes" : "no", c.sentToCrm ? "yes" : "no",
      c.keyNotes,
      c.createdAt, c.updatedAt,
    ].map(csvCell).join(","));
  }
  return lines.join("\n");
}

function downloadTextFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AddLeadsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"csv" | "manual">("csv");
  const [csvFiles, setCsvFiles] = useState<CsvFile[]>([]);
  const [manualLeads, setManualLeads] = useState<ManualLead[]>([
    { id: "1", name: "", phone: "" },
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download the parsed file as a validated CSV — keeps the user's original
  // columns and appends a Status column so they can open it in Excel/Numbers
  // and see exactly which rows we'd skip. Capped at 500 rows because this
  // is a sanity-check download, not a full export.
  const downloadValidatedCsv = (file: CsvFile) => {
    const MAX = 500;
    const rows = file.allRows.slice(0, MAX);
    const lines = [
      [...file.previewHeaders, "Status"].map(csvCell).join(","),
      ...rows.map(r => [
        ...r.cells,
        r.status === "valid" ? "OK" : ROW_STATUS_LABEL[r.status as Exclude<RowStatus, "valid">],
      ].map(csvCell).join(",")),
    ];
    const base = file.name.replace(/\.csv$/i, "");
    downloadTextFile(`${base}-validated.csv`, lines.join("\n"));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: CsvFile[] = [];
    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith(".csv")) continue;
      const text = await file.text();
      next.push(parseAndValidateCsv(file.name, text));
    }
    if (next.length > 0) setCsvFiles(p => [...p, ...next]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeCsv = (idx: number) => setCsvFiles((p) => p.filter((_, i) => i !== idx));

  const updateManual = (id: string, field: keyof ManualLead, value: string) =>
    setManualLeads((p) => p.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const addRow = () =>
    setManualLeads((p) => [...p, { id: String(Date.now()), name: "", phone: "" }]);

  const removeRow = (id: string) =>
    setManualLeads((p) => p.filter((l) => l.id !== id));

  const totalValid = csvFiles.reduce((s, f) => s + f.validRows, 0);
  const totalInvalid = csvFiles.reduce(
    (s, f) => s + Object.values(f.invalid).reduce((a, b) => a + b, 0),
    0
  );
  const totalNew = totalValid + manualLeads.filter((l) => l.phone.trim()).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-xl w-[820px] max-w-[96vw] max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-text-primary">Add Leads</div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              Add more contacts to this running outreach
            </div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-colors">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-border px-5 flex-shrink-0">
          {(["csv", "manual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150 ${
                tab === t
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t === "csv" ? "Upload CSV" : "Add Manually"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* CSV tab */}
          {tab === "csv" && (
            <div className="space-y-4">
              {/* Hidden native file picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  // Reset so the same file can be re-selected later
                  e.target.value = "";
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-input p-8 text-center cursor-pointer transition-all duration-150 ${
                  isDragging
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-text-tertiary hover:bg-surface-page/50"
                }`}
              >
                <Upload size={22} strokeWidth={1.5} className={`mx-auto mb-2.5 ${isDragging ? "text-accent" : "text-text-tertiary"}`} />
                <p className="text-[13px] text-text-secondary">
                  {isDragging ? (
                    <span className="text-accent font-medium">Drop your CSV files here</span>
                  ) : (
                    <>Drag & drop CSV files, or <span className="text-accent font-medium">browse</span></>
                  )}
                </p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Multiple CSV files supported · .csv only
                </p>
              </div>

              {/* Sample download — subtle helper link */}
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-text-tertiary">
                  Need a template? Your CSV should have columns: <span className="text-text-secondary font-medium">Name, Phone</span>{" "}
                  (Email, Source, Budget optional).
                </span>
                <button
                  onClick={() => downloadTextFile("leads-sample.csv", generateSampleCsv())}
                  className="inline-flex items-center gap-1 text-accent font-medium hover:underline shrink-0"
                >
                  <Download size={11} strokeWidth={2} />
                  Download sample CSV
                </button>
              </div>

              {csvFiles.length > 0 ? (
                <div className="space-y-2.5">
                  {csvFiles.map((file, idx) => {
                    const invalidTotal = Object.values(file.invalid).reduce((a, b) => a + b, 0);
                    const hasErrors = invalidTotal > 0;
                    const allClean = invalidTotal === 0 && file.totalRows > 0;
                    // Build the prose breakdown — only mention reasons that
                    // actually occurred. Phrasing follows the natural-language
                    // pattern the user asked for: "2 invalid phone, 1 duplicate,
                    // 5 missing data."
                    const reasonPhrases: string[] = [];
                    if (file.invalid.missingPhone   > 0) reasonPhrases.push(`${file.invalid.missingPhone} missing phone`);
                    if (file.invalid.invalidFormat  > 0) reasonPhrases.push(`${file.invalid.invalidFormat} invalid phone`);
                    if (file.invalid.duplicatePhone > 0) reasonPhrases.push(`${file.invalid.duplicatePhone} duplicate`);
                    if (file.invalid.missingName    > 0) reasonPhrases.push(`${file.invalid.missingName} missing name`);
                    return (
                      <div key={idx} className="bg-surface-page rounded-[8px] p-3.5 flex items-start gap-3">
                        {/* Status icon — green when clean, amber when issues */}
                        <div className={`shrink-0 w-9 h-9 rounded-[8px] flex items-center justify-center ${
                          hasErrors
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#F0FDF4] text-[#15803D]"
                        }`}>
                          <FileSpreadsheet size={16} strokeWidth={1.5} />
                        </div>

                        {/* Filename + analysis */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] text-text-primary truncate">{file.name}</span>
                            <span className="text-[11px] text-text-tertiary tabular-nums shrink-0">
                              {file.totalRows.toLocaleString()} rows
                            </span>
                          </div>
                          <p className="text-[12.5px] text-text-secondary leading-relaxed">
                            {allClean ? (
                              <>
                                All <span className="text-[#15803D]">{file.validRows.toLocaleString()}</span> rows look good — ready to add.
                              </>
                            ) : (
                              <>
                                <span className="text-[#15803D]">{file.validRows.toLocaleString()} valid</span>
                                {hasErrors && (
                                  <>
                                    , <span className="text-[#92400E]">{invalidTotal.toLocaleString()} skipped</span>
                                    {reasonPhrases.length > 0 && (
                                      <span className="text-text-tertiary"> — {reasonPhrases.join(", ")}</span>
                                    )}
                                  </>
                                )}
                                .
                              </>
                            )}
                          </p>
                        </div>

                        {/* Actions — Download CSV + Remove. Download produces
                            a copy of the file with a Status column appended,
                            so the user can spot-check in Excel instead of us
                            rendering rows in-browser. */}
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => downloadValidatedCsv(file)}
                            title="Download validated CSV"
                            className="inline-flex items-center gap-1.5 h-8 px-3 text-[11.5px] text-text-secondary hover:text-accent hover:bg-white rounded-button transition-colors"
                          >
                            <Download size={12} strokeWidth={1.75} />
                            Download CSV
                          </button>
                          <button
                            onClick={() => removeCsv(idx)}
                            title="Remove file"
                            aria-label="Remove file"
                            className="inline-flex items-center justify-center w-8 h-8 text-text-tertiary hover:text-[#DC2626] hover:bg-white rounded-button transition-colors"
                          >
                            <X size={13} strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-text-tertiary text-center py-1">No files uploaded yet</p>
              )}
            </div>
          )}

          {/* Manual tab */}
          {tab === "manual" && (
            <div className="space-y-3">
              <p className="text-[12px] text-text-secondary">
                Add leads directly with their name and phone number.
              </p>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 px-1">
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Name</span>
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">Phone</span>
                  <span />
                </div>
                {manualLeads.map((lead) => (
                  <div key={lead.id} className="grid grid-cols-[1fr_1fr_32px] gap-2">
                    <input
                      type="text"
                      value={lead.name}
                      onChange={(e) => updateManual(lead.id, "name", e.target.value)}
                      placeholder="Full name"
                      className="h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                    />
                    <PhoneInput
                      value={lead.phone}
                      onChange={(v) => updateManual(lead.id, "phone", v)}
                      placeholder="98765 43210"
                    />
                    <button
                      onClick={() => removeRow(lead.id)}
                      disabled={manualLeads.length === 1}
                      className="h-9 w-8 flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addRow} className="inline-flex items-center gap-1.5 text-[12.5px] text-accent font-medium hover:underline">
                <Plus size={13} strokeWidth={2.5} />
                Add row
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border flex-shrink-0">
          <span className="text-[12px] text-text-secondary">
            {totalNew > 0 ? (
              <>
                <span className="font-medium text-text-primary">{totalNew.toLocaleString()} lead{totalNew !== 1 ? "s" : ""}</span>{" "}
                ready to add
                {totalInvalid > 0 && (
                  <span className="text-text-tertiary">
                    {" "}· <span className="text-[#DC2626]">{totalInvalid} skipped</span>
                  </span>
                )}
              </>
            ) : (
              "No leads added yet"
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={totalNew === 0}
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-white bg-accent rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add {totalNew > 0 ? `${totalNew} Lead${totalNew !== 1 ? "s" : ""}` : "Leads"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead drill-down ────────────────────────────────────────────────────────
//
// Slide-in drawer that opens when a row in the contacts table is clicked.
// Three tabs:
//   • Overview — last call outcome + key stats (calls placed, total talk time,
//     created/updated, next action).
//   • Profile  — every field we have on the lead (phone, source, type, etc.).
//   • Logs     — call history with a mock audio player + transcript snippet
//     per call. Logs is the default tab because that's the most common reason
//     to drill into a lead.
//
// Call records are synthesised from the contact's existing fields (number of
// attempts implied by outcome, duration, calledAt) plus a small pool of
// canned transcripts — enough to make the screen feel populated without
// adding new data to the source file. No real audio playback (no asset
// files), the player is a static placeholder.

type CallLog = {
  id: string;
  dateTime: string;     // ISO
  status: string;       // e.g. "Ended", "Call Completed Normally"
  statusTone: "red" | "green" | "amber";
  durationSec: number;
  transcript: Array<{ speaker: "Agent" | "User"; text: string }>;
};

// Hash a contact id → deterministic pseudo-random number in [0,1). Used to
// pick canned transcripts and attempt counts so each contact gets a stable
// generated history across renders.
function seedRand(seed: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(Math.sin(h)) % 1;
}

const TRANSCRIPT_POOL: Array<CallLog["transcript"]> = [
  // Wrong number — short
  [
    { speaker: "Agent", text: "Hello, am I speaking with the right person?" },
    { speaker: "User",  text: "Wrong number" },
  ],
  // Brief misunderstanding
  [
    { speaker: "Agent", text: "Hello, am I speaking with यशवंत?" },
    { speaker: "User",  text: "Avara Daddy" },
    { speaker: "Agent", text: "Namaskara! This is Arya from Quad AI. Would you prefer to speak in English, or…" },
  ],
  // Voicemail
  [
    { speaker: "Agent", text: "Hi, this is Arya from Quad AI calling about your enquiry on Reflections. Please call us back when convenient." },
  ],
  // Engaged — qualifying conversation
  [
    { speaker: "Agent", text: "Hello, am I speaking with Ramesh?" },
    { speaker: "User",  text: "Yes, who is this?" },
    { speaker: "Agent", text: "This is Vox from Godrej Properties. You recently enquired about Reflections — do you have a moment to discuss?" },
    { speaker: "User",  text: "Sure, what's the price range?" },
    { speaker: "Agent", text: "3BHK units start at ₹1.65 Cr. Would that fit your budget?" },
    { speaker: "User",  text: "Possible. I'd like to visit on weekend." },
  ],
  // Callback requested
  [
    { speaker: "Agent", text: "Hello, am I speaking with Priya?" },
    { speaker: "User",  text: "Yes, but I'm in a meeting right now." },
    { speaker: "Agent", text: "Of course — when would be a better time to reach you?" },
    { speaker: "User",  text: "Tomorrow after 6 PM works." },
  ],
];

function generateCallLogs(contact: OutreachContact): CallLog[] {
  // Number of calls — qualified leads usually had 1–2 conversations; RnR /
  // no-answer outcomes have 3–5 attempts. Bound between 1 and 5.
  const baseAttempts =
    contact.qualStatus === "rnr" ? 4
    : contact.outcome === "no_answer" ? 3
    : contact.outcome === "qualified" || contact.outcome === "callback" ? 2
    : 2;
  const variance = Math.floor(seedRand(contact.id, 1) * 2); // 0 or 1
  const n = Math.max(1, Math.min(5, baseAttempts + variance - 1));

  const anchorMs = contact.calledAt
    ? new Date(contact.calledAt).getTime()
    : new Date("2026-05-25T14:00:00").getTime();

  const calls: CallLog[] = [];
  for (let i = 0; i < n; i++) {
    // Earlier attempts are older — space them out by 12–36 hours.
    const offsetHours = i * (12 + Math.floor(seedRand(contact.id, i + 7) * 24));
    const ts = new Date(anchorMs - offsetHours * 60 * 60 * 1000);

    // Most recent call uses the contact's actual outcome to set status tone;
    // earlier attempts default to a neutral "Ended" so the timeline reads
    // as a real escalation.
    const isLatest = i === 0;
    const transcriptIdx = Math.floor(seedRand(contact.id, i + 13) * TRANSCRIPT_POOL.length);
    const transcript = TRANSCRIPT_POOL[transcriptIdx];

    let status: string;
    let statusTone: CallLog["statusTone"];
    if (isLatest && contact.outcome === "qualified") {
      status = "Call Completed Normally";
      statusTone = "green";
    } else if (isLatest && contact.outcome === "no_answer") {
      status = "No Answer";
      statusTone = "amber";
    } else if (isLatest) {
      status = "Call Completed Normally";
      statusTone = "red";
    } else {
      status = "Ended";
      statusTone = "red";
    }

    // Duration: latest call uses the contact's recorded duration (min→sec);
    // earlier attempts are shorter (often just a few seconds for missed
    // pickups or wrong-number hangups).
    const durSec = isLatest && contact.duration !== null
      ? Math.max(6, Math.round(contact.duration * 60))
      : 6 + Math.floor(seedRand(contact.id, i + 21) * 25);

    calls.push({
      id: `${contact.id}-call-${i}`,
      dateTime: ts.toISOString(),
      status,
      statusTone,
      durationSec: durSec,
      transcript,
    });
  }
  return calls;
}

function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Avatar palette used for the lead drill-down header — same colours as the
// Leads drawer so a contact picked up here visually feels like the same
// person they'd see on /enquiries.
const drillAvatarColors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1"];
function drillAvatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return drillAvatarColors[Math.abs(hash) % drillAvatarColors.length];
}

// Qualification → badge mapping. Mirrors the Leads panel's three-state
// model (Qualified / Disqualified / Pending), with our extra "RnR" and
// "Follow-up" statuses folded into Pending since both are still working
// states.
function drillQualBadge(q: AIQualStatus): { label: string; cls: string } {
  if (q === "qualified" || q === "intent_qualified")
    return { label: q === "intent_qualified" ? "Intent Qualified" : "Qualified", cls: "bg-[#F0FDF4] text-[#15803D]" };
  if (q === "disqualified")
    return { label: "Disqualified", cls: "bg-[#FEF2F2] text-[#DC2626]" };
  return { label: "Pending", cls: "bg-[#FEF3C7] text-[#92400E]" };
}
// Translate the synthesized call list into a plain-English activity
// summary — same shape as the Leads panel.
function buildDrillSummary(calls: CallLog[]): string {
  if (calls.length === 0) return "No contact attempts yet.";
  const total = calls.length;
  const connected = calls.filter(c => c.statusTone === "green").length;
  const noAnswer  = calls.filter(c => c.statusTone === "amber").length;
  const ended     = total - connected - noAnswer;
  const parts: string[] = [];
  if (noAnswer > 0) parts.push(`${noAnswer} no answer`);
  if (ended > 0)    parts.push(`${ended} ended`);
  if (connected > 0) {
    const last = calls.find(c => c.statusTone === "green");
    parts.push(`${connected} connected${last ? ` (${fmtSec(last.durationSec)})` : ""}`);
  }
  const summary = `Called ${total} time${total > 1 ? "s" : ""} — ${parts.join(", ")}.`;
  const lastConnected = calls.find(c => c.statusTone === "green");
  if (lastConnected) {
    return `${summary} Last connected on ${format(new Date(lastConnected.dateTime), "dd MMM")}.`;
  }
  return summary;
}

function LeadDrillDown({ contact, onClose }: { contact: OutreachContact; onClose: () => void }) {
  const [tab, setTab] = useState<"overview" | "profile" | "logs">("overview");
  const [manuallyQualified, setManuallyQualified] = useState(false);
  const [isQualifying, setIsQualifying] = useState(false);
  // Per-call transcript collapse state — keyed by call id. Default to
  // expanded so first-time viewers see the conversation; long transcripts
  // get capped height with internal scroll so they don't push the rest of
  // the drawer offscreen.
  const [collapsedTranscripts, setCollapsedTranscripts] = useState<Set<string>>(new Set());
  const toggleTranscript = (id: string) => setCollapsedTranscripts(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const calls = useMemo(() => generateCallLogs(contact), [contact]);

  const initials = contact.name
    .split(/\s+/)
    .map((w) => w.replace(/\*/g, "").charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isQualified = contact.qualStatus === "qualified" || manuallyQualified;
  const qBadge = drillQualBadge(isQualified ? "qualified" : contact.qualStatus);
  const summary = buildDrillSummary(calls);
  const mostRecentCall = calls.length > 0 ? calls[0] : null;

  const handleQualify = () => {
    if (isQualified || isQualifying) return;
    setIsQualifying(true);
    setTimeout(() => {
      setIsQualifying(false);
      setManuallyQualified(true);
    }, 700);
  };

  const tabs: Array<{ key: typeof tab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "profile",  label: "Profile" },
    { key: "logs",     label: "Call logs" },
  ];

  // Tone for the call-log status pill (Call logs tab).
  const statusToneCls = (t: CallLog["statusTone"]) =>
    t === "green" ? "border-[#16A34A] text-[#15803D] bg-[#F0FDF4]"
    : t === "amber" ? "border-[#D97706] text-[#92400E] bg-[#FEF3C7]"
    : "border-[#DC2626] text-[#B91C1C] bg-[#FEF2F2]";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} aria-hidden />

      {/* Drawer — matches the Leads panel layout 1:1: header with avatar +
          pills + AI summary + Mark-as-Qualified CTA, underline-style tabs,
          and a scrollable body with the same three section blocks the
          Leads panel uses. */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[640px] bg-white z-[70] shadow-lg border-l border-border flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close lead detail"
          className="absolute top-4 right-4 p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors duration-150 z-10"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-semibold shrink-0"
              style={{ backgroundColor: drillAvatarColor(contact.name) }}
            >
              {initials || "—"}
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-semibold text-text-primary leading-tight">{contact.name}</h2>
                <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${qBadge.cls}`}>
                  {qBadge.label}
                </span>
              </div>
              <div className="text-[13px] text-text-secondary mt-0.5 tabular-nums">{contact.phone}</div>
              <div className="text-[11px] text-text-tertiary mt-1 flex items-center gap-1">
                <Clock size={10} strokeWidth={1.5} />
                Lead created {format(new Date(contact.createdAt), "dd MMM yyyy, HH:mm")}
              </div>
              {contact.keyNotes && (
                <p className="text-[12px] text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                  {contact.keyNotes}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-4">
            {isQualified ? (
              <button
                disabled
                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-medium rounded-button bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] cursor-default"
              >
                <Check size={13} strokeWidth={2} /> Qualified
              </button>
            ) : (
              <button
                onClick={handleQualify}
                disabled={isQualifying}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-medium rounded-button bg-accent text-white hover:bg-accent-hover transition-colors duration-150 disabled:opacity-60"
              >
                {isQualifying ? (
                  <><Loader2 size={13} strokeWidth={2} className="animate-spin" /> Qualifying…</>
                ) : (
                  "Mark as Qualified"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab strip — underline style, same as Leads panel */}
        <div className="shrink-0 border-b border-border px-6 flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                tab === t.key
                  ? "text-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "overview" && (
            <div className="space-y-5">
              {/* Activity summary */}
              <div className="bg-surface-page rounded-[8px] p-4">
                <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
                  Activity Summary
                </h3>
                <div className="flex items-start gap-2.5">
                  {calls.length === 0 ? (
                    <PhoneOff size={14} strokeWidth={1.5} className="text-text-tertiary mt-0.5 shrink-0" />
                  ) : (
                    <PhoneIncoming size={14} strokeWidth={1.5} className="text-accent mt-0.5 shrink-0" />
                  )}
                  <p className="text-[13px] text-text-primary leading-relaxed">{summary}</p>
                </div>
              </div>

              {/* Source — outreach + agent attribution */}
              <div>
                <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">Source</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-[#EFF6FF] text-[#1D4ED8] border border-[#3B82F6]/15">
                    <span className="text-[#1D4ED8]/60">Outreach:</span> <span className="font-medium">{outreachDetail.name.split(" — ")[0]}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-surface-secondary text-text-secondary border border-border">
                    <span className="text-text-tertiary">Agent:</span> <span className="font-medium text-text-primary">{outreachDetail.voiceAgent}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-surface-secondary text-text-secondary border border-border">
                    <span className="text-text-tertiary">Lead type:</span> <span className="font-medium text-text-primary capitalize">{contact.leadType.replace("_", " ")}</span>
                  </span>
                </div>
              </div>

              {/* Lead summary — key notes verbatim */}
              {contact.keyNotes && (
                <div className="bg-surface-page rounded-[8px] p-4">
                  <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
                    Lead Summary
                  </h3>
                  <p className="text-[13px] text-text-primary leading-relaxed">{contact.keyNotes}</p>
                </div>
              )}

              {/* Next action callout — surfaces the planned follow-up */}
              {contact.nextAction && (
                <div className="bg-surface-page rounded-[8px] p-4">
                  <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">Next Action</h3>
                  <div className="flex items-center gap-2 text-[13px] text-text-primary">
                    <ArrowRight size={13} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                    <span className="flex-1 font-medium">{contact.nextAction}</span>
                    {contact.nextActionAt && (
                      <span className="text-[11.5px] text-text-tertiary tabular-nums">
                        {format(new Date(contact.nextActionAt), "dd MMM · HH:mm")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Most relevant call — single inline card so the user
                  doesn't have to switch tabs to hear the latest. */}
              {mostRecentCall && (
                <div className="bg-surface-page rounded-[8px] p-4">
                  <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">
                    Most Relevant Call
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-text-secondary">
                      {format(new Date(mostRecentCall.dateTime), "dd MMM yyyy, HH:mm")}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-badge border ${statusToneCls(mostRecentCall.statusTone)}`}>
                      {mostRecentCall.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-white rounded-[6px] border border-border-subtle px-3 py-2">
                    <button className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 hover:bg-accent-hover transition-colors">
                      <Play size={14} strokeWidth={2} className="text-white ml-0.5" />
                    </button>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-accent rounded-full" />
                    </div>
                    <span className="text-[11px] text-text-tertiary whitespace-nowrap tabular-nums">
                      0:00 / {fmtSec(mostRecentCall.durationSec)}
                    </span>
                    <span className="text-[10px] font-medium text-text-secondary bg-surface-secondary px-1.5 py-0.5 rounded">1x</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "profile" && (
            <div className="divide-y divide-border-subtle">
              {[
                // Outcome was removed — for qualified leads it duplicated
                // Qual status verbatim, and qualStatus is the canonical
                // qualification field used in the filter tabs and the AI
                // Qualification column of the contacts table.
                { label: "Phone",         value: contact.phone },
                { label: "Lead type",     value: contact.leadType.replace("_", " ") },
                { label: "AI qualification", value: contact.qualStatus ?? "—" },
                { label: "Verified",      value: contact.verified ? "Yes" : "No" },
                { label: "Sent to CRM",   value: contact.sentToCrm ? "Yes" : "No" },
                { label: "Created",       value: format(new Date(contact.createdAt), "dd MMM yyyy, HH:mm") },
                { label: "Updated",       value: format(new Date(contact.updatedAt), "dd MMM yyyy, HH:mm") },
                { label: "Last called",   value: contact.calledAt ? format(new Date(contact.calledAt), "dd MMM yyyy, HH:mm") : "—" },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <span className="text-[11.5px] font-medium text-text-secondary">{row.label}</span>
                  <span className="text-[13px] text-text-primary capitalize">{String(row.value)}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "logs" && (
            <div className="space-y-5">
              {calls.map((call) => (
                <div key={call.id}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="text-[12.5px] font-medium text-text-primary tabular-nums">
                      {format(new Date(call.dateTime), "dd MMM yyyy, hh:mm a")}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] font-medium ${statusToneCls(call.statusTone)}`}>
                        {call.status}
                      </span>
                      {/* Collapse / expand the transcript for this call.
                          Chevron rotates to indicate state. Long transcripts
                          also get a max-height + scroll below. */}
                      <button
                        type="button"
                        onClick={() => toggleTranscript(call.id)}
                        aria-label={collapsedTranscripts.has(call.id) ? "Show transcript" : "Hide transcript"}
                        aria-expanded={!collapsedTranscripts.has(call.id)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded border border-border bg-white text-text-tertiary hover:text-text-primary hover:bg-surface-page transition-colors"
                      >
                        <ChevronDown
                          size={13}
                          strokeWidth={1.75}
                          className={`transition-transform ${collapsedTranscripts.has(call.id) ? "" : "rotate-180"}`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="bg-surface-page rounded-[10px] px-3 py-3 flex items-center gap-3">
                    <button
                      aria-label="Play recording"
                      className="shrink-0 w-9 h-9 rounded-full bg-accent flex items-center justify-center hover:bg-accent-hover transition-colors"
                    >
                      <Play size={14} strokeWidth={2} className="text-white ml-0.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] text-text-tertiary tabular-nums mb-1">
                        <span>0:00</span>
                        <span>{fmtSec(call.durationSec)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-border overflow-hidden">
                        <div className="h-full w-0 bg-accent" />
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center h-7 px-2.5 rounded border border-border bg-white text-[11px] font-medium text-text-secondary">1x</span>
                  </div>

                  {/* Chat-bubble transcript — Agent left (green), User
                      right (blue). Wrapped in a max-height + overflow scroll
                      so long conversations don't push the rest of the drawer
                      offscreen. The chevron in the header toggles collapse. */}
                  {!collapsedTranscripts.has(call.id) && (
                    <div className="mt-2 bg-white border border-border-subtle rounded-[10px] px-4 py-3.5 space-y-1.5 max-h-[360px] overflow-y-auto">
                      {call.transcript.map((line, i) => {
                        const isAgent = line.speaker === "Agent";
                        const prev = i > 0 ? call.transcript[i - 1] : null;
                        const showLabel = !prev || prev.speaker !== line.speaker;
                        const wrapperGap = showLabel && i > 0 ? "mt-2.5" : "";
                        return (
                          <div
                            key={i}
                            className={`flex flex-col ${isAgent ? "items-start" : "items-end"} ${wrapperGap}`}
                          >
                            {showLabel && (
                              <div
                                className={`text-[10.5px] font-medium mb-0.5 px-0.5 ${
                                  isAgent ? "text-[#15803D]" : "text-[#2563EB]"
                                }`}
                              >
                                {line.speaker}
                              </div>
                            )}
                            <div
                              className={`max-w-[85%] px-3 py-2 text-[12.5px] leading-relaxed rounded-[10px] ${
                                isAgent
                                  ? "bg-[#F0FDF4] text-text-primary rounded-tl-[3px]"
                                  : "bg-[#EFF6FF] text-text-primary rounded-tr-[3px]"
                              }`}
                            >
                              {line.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {calls.length === 0 && (
                <div className="text-center py-12 text-[13px] text-text-tertiary">
                  No call logs yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Filter tabs config ────────────────────────────────────────────────────────

type FilterTab = "all" | "qualified" | "disqualified" | "follow_up" | "rnr" | "yet_to_dial";

// Tab order picked to read like a funnel from "closed positively" to
// "open / unresolved" — Qualified and Disqualified are terminal outcomes,
// Follow-up and RnR are open work, Yet-to-dial trails the list as the
// least-actionable bucket. RnR has its own tab now (previously folded
// into Follow-up) because a long Ring-no-Response pile is something the
// user explicitly wants to triage.
const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",          label: "All" },
  { id: "qualified",    label: "Qualified" },
  { id: "disqualified", label: "Disqualified" },
  { id: "follow_up",    label: "Follow-up" },
  { id: "rnr",          label: "RnR" },
  { id: "yet_to_dial",  label: "Yet to dial" },
];

// How each tab maps to the contact data — qualStatus is the primary signal,
// outcome covers contacts that haven't reached qualification yet.
function matchesTab(c: { outcome: ContactOutcome; qualStatus: AIQualStatus }, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "qualified")    return c.qualStatus === "qualified";
  if (tab === "disqualified") return c.qualStatus === "disqualified" || c.outcome === "wrong_number";
  if (tab === "follow_up")    return (
    c.qualStatus === "customer_followup" ||
    c.qualStatus === "intent_qualified" ||
    c.outcome === "callback"
  );
  if (tab === "rnr")          return c.qualStatus === "rnr";
  if (tab === "yet_to_dial")  return c.outcome === "not_called";
  return true;
}

const PAGE_SIZE = 8;

const QUAL_STATUS_OPTS: { id: NonNullable<AIQualStatus>; label: string }[] = [
  { id: "qualified",         label: "Qualified" },
  { id: "disqualified",      label: "Disqualified" },
  { id: "intent_qualified",  label: "Intent Qualified" },
  { id: "customer_followup", label: "Customer Follow up" },
  { id: "rnr",               label: "RnR" },
];

const SENT_TO_CRM_OPTS: { id: "yes" | "no"; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "no",  label: "No" },
];

// Lead type — surfaces verification provenance. "standard" leads came in as
// raw CSV uploads; "verified" went through identity verification; "ai_qualified"
// already passed the agent's screening.
const LEAD_TYPE_OPTS: { id: "standard" | "verified" | "ai_qualified"; label: string }[] = [
  { id: "standard",     label: "Standard" },
  { id: "verified",     label: "Verified" },
  { id: "ai_qualified", label: "AI Qualified" },
];

// Outcome — what happened on the prominent call. Matches the
// ContactOutcome union in outreach-data.ts.
const OUTCOME_OPTS: { id: ContactOutcome; label: string }[] = [
  { id: "qualified",      label: "Qualified" },
  { id: "not_qualified",  label: "Not qualified" },
  { id: "callback",       label: "Callback" },
  { id: "no_answer",      label: "No answer" },
  { id: "busy",           label: "Busy" },
  { id: "wrong_number",   label: "Wrong number" },
  { id: "not_called",     label: "Not called" },
];

const VERIFIED_OPTS: { id: "yes" | "no"; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "no",  label: "No" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

type OutreachStatus = "running" | "paused" | "completed" | "draft";

export default function OutreachDetailPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [outreachStatus, setOutreachStatus] = useState<OutreachStatus>("running");
  // Time range — same selector used on the outreach listing. Defaults to
  // "Last 7 days" so the analytics view opens on the most actionable window
  // out of the box.
  const [rangePreset, setRangePreset] = useState<string>("7");
  const [addLeadsOpen, setAddLeadsOpen] = useState(false);
  // Lead drill-down — opened when a row in the contacts table is clicked.
  // Holds the contact whose detail drawer is currently visible (or null).
  const [drillContact, setDrillContact] = useState<OutreachContact | null>(null);
  // Edit drawer — opens when the header Edit button is clicked.
  const [editOpen, setEditOpen] = useState(false);

  // Page-level source filter — scopes every widget + the table to the
  // selected CSVs. Default: all sources selected.
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(() =>
    outreachDetail.sources.map(s => s.id)
  );
  const toggleSource = (id: string) =>
    setSelectedSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const setAllSources = (all: boolean) =>
    setSelectedSources(all ? outreachDetail.sources.map(s => s.id) : []);
  const sourcesAllSelected = selectedSources.length === outreachDetail.sources.length;
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Filters popover state — chip multi-selects + range inputs
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qualStatuses, setQualStatuses] = useState<NonNullable<AIQualStatus>[]>([]);
  const [durationMin, setDurationMin] = useState("");
  const [durationMax, setDurationMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sentToCrm, setSentToCrm] = useState<"yes" | "no" | "">("");
  // Newly-expanded filters — every column the contacts table renders has
  // a way to narrow by here, so users can answer "show me verified standard
  // leads scheduled to be called next week" in one popover.
  const [leadTypes, setLeadTypes] = useState<("standard" | "verified" | "ai_qualified")[]>([]);
  const [outcomes, setOutcomes] = useState<ContactOutcome[]>([]);
  const [verifiedFilter, setVerifiedFilter] = useState<"yes" | "no" | "">("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [nextActionFrom, setNextActionFrom] = useState("");
  const [nextActionTo, setNextActionTo] = useState("");

  const d = outreachDetail;

  // ── Time-range scaling ──────────────────────────────────────────────
  // Mirror the listing-page logic so the detail-page widgets respond to
  // the DateRangeSelector. Activity numbers (calls, minutes, spend, funnel
  // stages, dial-attempt buckets) are scaled by the share of the outreach
  // lifetime that falls inside the selected window. Audience-level numbers
  // (totalContacts, remaining) stay lifetime because they're about the
  // overall workload, not the window.
  const { days: rangeDays, label: rangeLabel } = (() => {
    switch (rangePreset) {
      case "today":      return { days: 1,  label: "Today" };
      case "yesterday":  return { days: 1,  label: "Yesterday" };
      case "2d":         return { days: 2,  label: "Today and yesterday" };
      case "thisweek":   return { days: 7,  label: "This week" };
      case "lastweek":   return { days: 7,  label: "Last week" };
      case "7":          return { days: 7,  label: "Last 7 days" };
      case "14":         return { days: 14, label: "Last 14 days" };
      case "30":         return { days: 30, label: "Last 30 days" };
      case "thismonth":  return { days: 30, label: "This month" };
      case "lastmonth":  return { days: 30, label: "Last month" };
      case "lifetime":   return { days: 9999, label: "Lifetime" };
      default:           return { days: 30, label: "Last 30 days" };
    }
  })();

  const scaled = useMemo(() => {
    const activity = d.activityDays || 1;
    const share = Math.min(1, rangeDays / activity);
    const r = (n: number) => Math.round(n * share);
    return {
      called:        r(d.called),
      connected:     r(d.connected),
      interacted:    r(d.interacted),
      qualified:     r(d.qualified),
      notQualified:  r(d.notQualified),
      callback:      r(d.callback),
      noAnswer:      r(d.noAnswer),
      talktimeMins:  r(d.totalMinutes),
      totalCalls:    r(d.totalCalls),
      spend:         r(d.spend),
      // Dial-attempt bucket distribution stays the same shape; magnitudes scale.
      dialAttempts:  d.dialAttempts.map(v => r(v)),
      // For the funnel: leads = audience worked in this window, also scaled
      // so all five stages remain proportional. At lifetime it equals total.
      leadsInWindow: r(d.totalContacts),
    };
  }, [d, rangeDays]);

  const progressPercent = (d.called / d.totalContacts) * 100;

  // Counts per tab for the badges next to each tab label.
  const outcomeCounts = useMemo(() => {
    const counts: Partial<Record<FilterTab, number>> = {};
    for (const tab of FILTER_TABS) {
      counts[tab.id] = outreachContacts.filter(c => matchesTab(c, tab.id)).length;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    let rows = outreachContacts;
    if (activeFilter !== "all") rows = rows.filter((c) => matchesTab(c, activeFilter));
    if (qualStatuses.length > 0) rows = rows.filter((c) => c.qualStatus !== null && qualStatuses.includes(c.qualStatus));
    // Call Duration in seconds (data is in minutes — convert)
    const dMinSec = durationMin === "" ? null : parseFloat(durationMin);
    const dMaxSec = durationMax === "" ? null : parseFloat(durationMax);
    if (dMinSec !== null || dMaxSec !== null) {
      rows = rows.filter((c) => {
        if (c.duration === null) return false;
        const secs = c.duration * 60;
        if (dMinSec !== null && secs < dMinSec) return false;
        if (dMaxSec !== null && secs > dMaxSec) return false;
        return true;
      });
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom).getTime() : null;
      const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
      rows = rows.filter((c) => {
        if (!c.calledAt) return false;
        const t = new Date(c.calledAt).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
        return true;
      });
    }
    if (sentToCrm !== "") {
      const want = sentToCrm === "yes";
      rows = rows.filter((c) => c.sentToCrm === want);
    }
    if (leadTypes.length > 0) {
      rows = rows.filter((c) => leadTypes.includes(c.leadType));
    }
    if (outcomes.length > 0) {
      rows = rows.filter((c) => outcomes.includes(c.outcome));
    }
    if (verifiedFilter !== "") {
      const want = verifiedFilter === "yes";
      rows = rows.filter((c) => c.verified === want);
    }
    if (updatedFrom || updatedTo) {
      const from = updatedFrom ? new Date(updatedFrom).getTime() : null;
      const to = updatedTo ? new Date(updatedTo + "T23:59:59").getTime() : null;
      rows = rows.filter((c) => {
        const t = new Date(c.updatedAt).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
        return true;
      });
    }
    if (nextActionFrom || nextActionTo) {
      const from = nextActionFrom ? new Date(nextActionFrom).getTime() : null;
      const to = nextActionTo ? new Date(nextActionTo + "T23:59:59").getTime() : null;
      rows = rows.filter((c) => {
        if (!c.nextActionAt) return false;
        const t = new Date(c.nextActionAt).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
        return true;
      });
    }
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    return rows;
  }, [search, activeFilter, qualStatuses, durationMin, durationMax, dateFrom, dateTo, sentToCrm, leadTypes, outcomes, verifiedFilter, updatedFrom, updatedTo, nextActionFrom, nextActionTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (f: FilterTab) => {
    setActiveFilter(f);
    setPage(1);
  };

  const popoverFilterCount =
    qualStatuses.length +
    (durationMin !== "" || durationMax !== "" ? 1 : 0) +
    (dateFrom !== "" || dateTo !== "" ? 1 : 0) +
    (sentToCrm !== "" ? 1 : 0) +
    leadTypes.length +
    outcomes.length +
    (verifiedFilter !== "" ? 1 : 0) +
    (updatedFrom !== "" || updatedTo !== "" ? 1 : 0) +
    (nextActionFrom !== "" || nextActionTo !== "" ? 1 : 0);

  // Human-readable label for the Export button. Tells the user exactly which
  // contacts will end up in the CSV — the active tab and the current count.
  // When the user also has popover filters or a search term active we tack
  // on a "(filtered)" qualifier so they don't accidentally export less than
  // they expected.
  const activeTabLabel = FILTER_TABS.find(t => t.id === activeFilter)?.label ?? "All";
  const exportNoun =
      activeFilter === "all"          ? "contacts"
    : activeFilter === "yet_to_dial"  ? "not-yet-dialed contacts"
    : activeFilter === "qualified"    ? "qualified contacts"
    : activeFilter === "follow_up"    ? "follow-up contacts"
    : "disqualified contacts";
  const hasExtraFilter = popoverFilterCount > 0 || search.trim().length > 0;
  const exportLabel = `Export ${filtered.length.toLocaleString()} ${exportNoun}${hasExtraFilter ? " (filtered)" : ""}`;

  const handleExportContacts = () => {
    if (filtered.length === 0) return;
    // File name encodes the outreach, the active tab, and the date so users
    // can tell two exports apart when they end up next to each other.
    const today = new Date().toISOString().slice(0, 10);
    const safeName = outreachDetail.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const safeTab = activeTabLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const fileName = `${safeName}_${safeTab}_${today}.csv`;
    downloadTextFile(fileName, buildContactsCsv(filtered));
  };

  const resetPopoverFilters = () => {
    setQualStatuses([]);
    setDurationMin("");
    setDurationMax("");
    setDateFrom("");
    setDateTo("");
    setSentToCrm("");
    setLeadTypes([]);
    setOutcomes([]);
    setVerifiedFilter("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setNextActionFrom("");
    setNextActionTo("");
    setPage(1);
  };

  const toggleInList = <T,>(list: T[], setter: (v: T[]) => void, value: T) => {
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    setPage(1);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="pb-12">
      {/* Breadcrumb — back arrow + parent only (the campaign name is the H1) */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push("/outreach")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Outreach</span>
      </div>

      {/* Header — title on its own line so it can breathe, with status
          pill + agent + progress collapsed into a single compact metadata
          row underneath. Previously the status pill wrapped to its own
          line whenever the right-side action cluster was wide, leaving
          three vertical rows of header chrome above the content. */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div className="min-w-0">
          <h1 className="text-page-title text-text-primary truncate">{d.name}</h1>
          <div className="flex items-center gap-2.5 text-[12px] text-text-secondary mt-1.5 flex-wrap">
            <InlineStatusBadge status={outreachStatus} />
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Bot size={12} strokeWidth={1.5} className="text-text-tertiary" />
              {d.voiceAgent} outbound bot
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Common time-range filter — same selector used on the outreach
              listing, so the user sees a consistent control across analytics
              surfaces. */}
          <DateRangeSelector compact onChange={setRangePreset} defaultPreset="7" />
          <SourceFilter
            sources={d.sources}
            selected={selectedSources}
            allSelected={sourcesAllSelected}
            menuOpen={sourceMenuOpen}
            setMenuOpen={setSourceMenuOpen}
            onToggle={toggleSource}
            onSetAll={setAllSources}
          />
          <StatusActionButton
            status={outreachStatus}
            onChange={setOutreachStatus}
          />
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium rounded-button border border-border bg-white text-text-secondary hover:bg-surface-page hover:text-text-primary transition-colors duration-150"
            title="Edit outreach"
          >
            <Pencil size={14} strokeWidth={1.5} />
            Edit
          </button>
          <button
            onClick={() => setAddLeadsOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
          >
            <UserPlus size={14} strokeWidth={1.5} />
            Add Leads
          </button>
        </div>
      </div>

      {/* Source filter context banner — only when partially filtered */}
      {!sourcesAllSelected && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-card bg-accent/5 border border-accent/20 text-[12px]">
          <FilterIcon size={12} strokeWidth={1.5} className="text-accent" />
          <span className="text-text-secondary">
            Showing data from{" "}
            <span className="font-medium text-text-primary">
              {selectedSources.length} of {d.sources.length} uploaded sources
            </span>
            . Widgets and the contacts table are scoped to these files only.
          </span>
          <button
            onClick={() => setAllSources(true)}
            className="ml-auto text-[12px] font-medium text-accent hover:underline"
          >
            Show all files
          </button>
        </div>
      )}

      {/* 0. KPI hero strip — Talktime + Spend + Performance funnel, the same
          three widgets that anchor the listing page so per-outreach metrics
          tie back to the workspace aggregate. Scoped to THIS outreach AND
          to the selected time range. */}
      {(() => {
        // Period-over-period deltas — same calculation as the listing page,
        // computed against the synthetic daily series. Drives the green/red
        // trend chip in the corner of each KPI.
        const sumLast = (series: number[], n: number) =>
          series.slice(-n).reduce((s, v) => s + v, 0);
        const sumPrev = (series: number[], n: number) =>
          series.slice(-2 * n, -n).reduce((s, v) => s + v, 0);
        const trendPct = (series: number[], n: number): number => {
          const cur = sumLast(series, n);
          const prev = sumPrev(series, n);
          if (prev <= 0) return 0;
          return Math.round(((cur - prev) / prev) * 1000) / 10;
        };
        const talktimeDelta = trendPct(dailyTalktime90d, Math.max(rangeDays, 1));
        const spendDelta    = trendPct(dailySpend90d, Math.max(rangeDays, 1));
        // Synthetic previous-period values so the delta + "was X" chip
        // line have something to reference. Real backend would supply.
        const prevTalktime = Math.round(scaled.talktimeMins * (1 - talktimeDelta / 100));
        const prevSpend    = Math.round(scaled.spend * (1 - spendDelta / 100));
        const fmtINR = (n: number) => n >= 100000
          ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 2)}L`
          : n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
          : `₹${Math.round(n).toLocaleString("en-IN")}`;
        const cpql = scaled.qualified > 0 ? Math.round(scaled.spend / scaled.qualified) : 0;
        const avgMinPerCall = scaled.totalCalls > 0 ? scaled.talktimeMins / scaled.totalCalls : 0;
        const avgMins = Math.floor(avgMinPerCall);
        const avgSecs = Math.round((avgMinPerCall - avgMins) * 60);
        return (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <TalktimeKpi
              totalMinutes={scaled.talktimeMins}
              totalCalls={scaled.totalCalls}
              rangeLabel={rangeLabel}
              delta={talktimeDelta}
            />
            <SpendKpi
              totalSpend={scaled.spend}
              totalQualified={scaled.qualified}
              totalMinutes={scaled.talktimeMins}
              rangeLabel={rangeLabel}
              delta={spendDelta}
            />
            <PerformanceFunnelKpi
              leads={scaled.leadsInWindow}
              dialed={scaled.called}
              connected={scaled.connected}
              interacted={scaled.interacted}
              qualified={scaled.qualified}
              rangeLabel={rangeLabel}
            />
            <DialAttemptsWidget
              attempts={scaled.dialAttempts}
              rangeLabel={rangeLabel}
            />
          </div>
        );
      })()}

      {/* 1. Lead coverage — lifetime audience progress. Doesn't scale with
          the time range because "leads remaining" is a property of the
          whole outreach, not a window. The pace estimate still uses
          lifetime called ÷ activityDays so the ETA is meaningful. */}
      <LeadCoverageBar
        total={d.totalContacts}
        called={d.called}
        remaining={d.totalContacts - d.called}
        dialsPerDay={Math.max(5, Math.round(d.called / Math.max(1, d.activityDays)))}
      />

      {/* Contacts Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-section-header text-text-primary">Contacts</h3>
          <div className="flex items-center gap-2 relative">
            <div className="relative max-w-[240px]">
              <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-8 pl-8 pr-3 text-[13px] border border-border rounded-input bg-white focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              className={`inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-input border transition-colors ${
                popoverFilterCount > 0
                  ? "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
                  : "border-border bg-white text-text-secondary hover:text-text-primary hover:bg-surface-page"
              }`}
            >
              <FilterIcon size={13} strokeWidth={1.5} />
              Filters
              {popoverFilterCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-white">
                  {popoverFilterCount}
                </span>
              )}
            </button>

            {/* Export — tab-aware. Label literally says what's in the file
                ("Export 47 qualified contacts") so the user doesn't wonder
                whether the active tab/filter narrows the export or not. */}
            <button
              type="button"
              onClick={handleExportContacts}
              disabled={filtered.length === 0}
              title={exportLabel}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-input border border-border bg-white text-text-secondary hover:text-text-primary hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">{exportLabel}</span>
              <span className="sm:hidden">Export</span>
            </button>

            {filtersOpen && (
              <>
                {/* click-outside backdrop */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setFiltersOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1.5 w-[420px] bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle">
                    <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-text-primary">
                      <FilterIcon size={13} strokeWidth={1.5} />
                      Filters
                    </div>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-4 text-left">
                    <ChipGroup
                      label="AI Qualification Status"
                      options={QUAL_STATUS_OPTS}
                      selected={qualStatuses}
                      onToggle={(v) => toggleInList(qualStatuses, setQualStatuses, v)}
                    />
                    <ChipGroup
                      label="Outcome"
                      options={OUTCOME_OPTS}
                      selected={outcomes}
                      onToggle={(v) => toggleInList(outcomes, setOutcomes, v)}
                    />
                    <ChipGroup
                      label="Lead Type"
                      options={LEAD_TYPE_OPTS}
                      selected={leadTypes}
                      onToggle={(v) => toggleInList(leadTypes, setLeadTypes, v)}
                    />
                    <ChipGroup
                      label="Verified"
                      options={VERIFIED_OPTS}
                      selected={verifiedFilter === "" ? [] : [verifiedFilter]}
                      onToggle={(v) => { setVerifiedFilter(verifiedFilter === v ? "" : v); setPage(1); }}
                    />
                    <ChipGroup
                      label="Send to CRM"
                      options={SENT_TO_CRM_OPTS}
                      selected={sentToCrm === "" ? [] : [sentToCrm]}
                      onToggle={(v) => { setSentToCrm(sentToCrm === v ? "" : v); setPage(1); }}
                    />

                    {/* Call Duration (seconds) */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Call Duration (seconds)</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={durationMin}
                          onChange={e => { setDurationMin(e.target.value); setPage(1); }}
                          placeholder="Min"
                          min={0}
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="number"
                          value={durationMax}
                          onChange={e => { setDurationMax(e.target.value); setPage(1); }}
                          placeholder="Max"
                          min={0}
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                      </div>
                    </div>

                    {/* Created Date */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Created Date</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                          placeholder="From"
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => { setDateTo(e.target.value); setPage(1); }}
                          placeholder="To"
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>

                    {/* Updated Date */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Updated Date</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={updatedFrom}
                          onChange={e => { setUpdatedFrom(e.target.value); setPage(1); }}
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="date"
                          value={updatedTo}
                          onChange={e => { setUpdatedTo(e.target.value); setPage(1); }}
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>

                    {/* Next Action Time */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Next Action Time</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={nextActionFrom}
                          onChange={e => { setNextActionFrom(e.target.value); setPage(1); }}
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="date"
                          value={nextActionTo}
                          onChange={e => { setNextActionTo(e.target.value); setPage(1); }}
                          className="flex-1 h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border-subtle bg-surface-page/40">
                    <span className="text-[11.5px] text-text-tertiary tabular-nums">
                      {filtered.length} of {outreachContacts.length} contacts
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={resetPopoverFilters}
                        disabled={popoverFilterCount === 0}
                        className="h-7 px-3 text-[12px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => setFiltersOpen(false)}
                        className="h-7 px-3 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab strip — pill style matching /enquiries Leads page. Selected
            tab gets white background + shadow; inactive tabs are flat text
            on the grey surface-secondary track. */}
        <div className="px-5 py-3 border-b border-border-subtle">
          <div className="inline-flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
            {FILTER_TABS.map((tab) => {
              const count = outcomeCounts[tab.id] ?? 0;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleFilterChange(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[5px] whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? "bg-white text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`tabular-nums ${isActive ? "text-text-tertiary" : "text-text-tertiary"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contacts table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Name</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Phone</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">AI Qualification</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Next Action</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Next Action Time</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Prominent call
                    <span title="The call on which this lead reached a terminal state (qualified, disqualified, or otherwise classified). Duration is in minutes." className="cursor-help text-text-tertiary">
                      <Info size={11} strokeWidth={1.5} />
                    </span>
                  </span>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Total talktime
                    <span title="Sum of all call durations for this lead across every attempt" className="cursor-help text-text-tertiary">
                      <Info size={11} strokeWidth={1.5} />
                    </span>
                  </span>
                </th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Created</th>
                <th className="px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left whitespace-nowrap">Updated</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-text-tertiary">
                    No contacts match this filter
                  </td>
                </tr>
              ) : (
                paginated.map((c, i) => {
                  const globalIndex = (page - 1) * PAGE_SIZE + i;
                  // Derive deterministic initials from the masked name.
                  // The masked format ("Ramesh K*****") still surfaces the
                  // first letter of each word — same trick /enquiries uses.
                  const initials = c.name
                    .split(" ")
                    .map((w) => w.replace(/\*/g, "").charAt(0))
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const avatarColor = avatarColors[globalIndex % avatarColors.length];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setDrillContact(c)}
                      className={`cursor-pointer border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors duration-150 ${
                        i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                      }`}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <span className="text-[13px] text-text-primary font-medium">
                            {c.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">{c.phone}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap"><QualStatusBadge status={c.qualStatus} /></td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">
                        {c.nextAction ?? <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {c.nextActionAt ? format(new Date(c.nextActionAt), "dd MMM, HH:mm") : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary font-medium text-right tabular-nums whitespace-nowrap">
                        {c.duration !== null ? `${c.duration} min` : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary font-medium text-right tabular-nums whitespace-nowrap">
                        {(() => {
                          // Total talktime = sum across this lead's calls.
                          // Derived from `duration` × a seeded multiplier
                          // (1.0–2.2) so leads with multiple attempts show
                          // a realistic cumulative without us tracking per-
                          // call durations on the row data model.
                          if (c.duration === null) return <span className="text-text-tertiary">—</span>;
                          let h = 0;
                          for (const ch of c.id) h = ch.charCodeAt(0) + ((h << 5) - h);
                          const mult = 1 + (Math.abs(Math.sin(h)) * 1.2);
                          const total = (c.duration * mult).toFixed(1);
                          return `${total} min`;
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {format(new Date(c.createdAt), "dd MMM")}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                        {format(new Date(c.updatedAt), "dd MMM")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-[12px] text-text-tertiary">
            {filtered.length === 0
              ? "No results"
              : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
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

      {/* Add Leads Modal */}
      {addLeadsOpen && <AddLeadsModal onClose={() => setAddLeadsOpen(false)} />}

      {/* Lead drill-down — opens when a contact row is clicked. Slides in
          from the right; clicking the backdrop or pressing Esc closes it. */}
      {drillContact && (
        <LeadDrillDown
          contact={drillContact}
          onClose={() => setDrillContact(null)}
        />
      )}

      {/* Edit drawer — slides in from the right when header Edit is clicked.
          Pre-fills with this outreach's current schedule, agent, and churn
          config so the user lands on the existing setup, not a blank form. */}
      {editOpen && (
        <EditOutreachDrawer
          initial={{
            id: d.id,
            name: d.name,
            voiceAgentName: d.voiceAgent,
            activeDays: d.schedule.days.includes("Sun")
              ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            callingStart: "10:00",
            callingEnd: "19:00",
            maxRetries: String(d.schedule.maxRetries),
            retryInterval: "6",
            retryIntervalUnit: "hours",
          } satisfies EditOutreachInitial}
          onClose={() => setEditOpen(false)}
        />
      )}
    </motion.div>
  );
}

// ── KPI hero widgets — Talktime + Spend + Performance funnel ───────────────
// Same three widgets that anchor the listing aggregate row, scoped here to
// a single outreach + the selected time range. Numbers tie back to the
// listing roll-up so users see identical figures whether they're looking
// at workspace-aggregate or per-outreach views.

function formatINRDetail(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 2)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Trend chip — green for "good direction", red for "bad direction".
// `inverted` flips the meaning so e.g. Spend going up reads as red, even
// though numerically delta is positive.
function DetailTrendChip({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) return null;
  const up = delta >= 0;
  const isGood = inverted ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
        isGood ? "text-[#15803D]" : "text-[#DC2626]"
      }`}
    >
      {up ? <ArrowUpRight size={11} strokeWidth={2.25} /> : <ArrowDownRight size={11} strokeWidth={2.25} />}
      {Math.abs(delta)}%
    </span>
  );
}

function TalktimeKpi({
  totalMinutes,
  totalCalls,
  rangeLabel,
  delta = 0,
}: {
  totalMinutes: number;
  totalCalls: number;
  rangeLabel: string;
  delta?: number;
}) {
  const avgMinPerCall = totalCalls > 0 ? totalMinutes / totalCalls : 0;
  const avgMins = Math.floor(avgMinPerCall);
  const avgSecs = Math.round((avgMinPerCall - avgMins) * 60);
  const avg = totalCalls > 0 ? `${avgMins}m ${String(avgSecs).padStart(2, "0")}s` : "—";
  // Card bg tints with the trend direction — green when up (good for
  // talktime), red when down, neutral when flat. Same tokens as the
  // /campaigns MetricCard so the colour language carries across.
  const tint = delta > 0 ? "bg-[#F7FDF9] border-[#E2F5E9]"
    : delta < 0 ? "bg-[#FEF9F9] border-[#F5E2E2]"
    : "bg-white border-border";
  return (
    <div className={`${tint} border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Talktime
        </span>
        <DetailTrendChip delta={delta} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {totalMinutes.toLocaleString()}
        </span>
        <span className="text-[11.5px] text-text-secondary leading-none">min</span>
      </div>
      <div className="mt-auto pt-2 space-y-1 text-[11.5px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Calls</span>
          <span className="text-text-primary font-medium">{totalCalls.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Avg duration</span>
          <span className="text-text-primary font-medium">{avg}</span>
        </div>
      </div>
    </div>
  );
}

function SpendKpi({
  totalSpend,
  totalQualified,
  totalMinutes,
  rangeLabel,
  delta = 0,
}: {
  totalSpend: number;
  totalQualified: number;
  totalMinutes: number;
  rangeLabel: string;
  delta?: number;
}) {
  const cpql = totalQualified > 0 ? Math.round(totalSpend / totalQualified) : 0;
  // Inverted tint — spend going up is bad (red), down is good (green).
  const tint = delta > 0 ? "bg-[#FEF9F9] border-[#F5E2E2]"
    : delta < 0 ? "bg-[#F7FDF9] border-[#E2F5E9]"
    : "bg-white border-border";
  return (
    <div className={`${tint} border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Spend
          {/* Hover tooltip — explains the math behind Spend so the user
              doesn't have to guess what this aggregates. Mirrors the
              same tooltip on the outreach listing for consistency. */}
          <span className="relative inline-flex group">
            <Info
              size={11}
              strokeWidth={1.5}
              className="text-text-tertiary hover:text-text-secondary cursor-help"
              aria-label="How spend is calculated"
            />
            <span
              role="tooltip"
              className="absolute left-0 top-full mt-1.5 z-20 w-[260px] rounded-[8px] bg-text-primary text-white text-[11.5px] leading-snug font-normal normal-case tracking-normal px-3 py-2.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              <span className="block font-semibold mb-1">How spend is calculated</span>
              Talktime minutes × per-minute call cost.
            </span>
          </span>
        </span>
        {/* Spend rising is bad — invert so an up-arrow shows in red. */}
        <DetailTrendChip delta={delta} inverted />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {formatINRDetail(totalSpend)}
        </span>
      </div>
      <div className="mt-auto pt-2 space-y-1 text-[11.5px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Qualified</span>
          <span className="text-text-primary font-medium">{totalQualified.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">CPQL</span>
          <span className="text-text-primary font-medium">{totalQualified > 0 ? formatINRDetail(cpql) : "—"}</span>
        </div>
      </div>
    </div>
  );
}

// Shared bar-row layout — both Performance Funnel and Dial Attempts render
// identically. label · bar · value+sub. Same grid, bar dimensions, fonts.
function ChartRow({ label, value, sub, widthPct }: {
  label: string; value: number; sub: string | null; widthPct: number;
}) {
  return (
    <div className="grid grid-cols-[60px_minmax(0,1fr)_72px] items-center gap-2">
      <span className="text-[10.5px] text-text-tertiary truncate">{label}</span>
      <div className="h-2 rounded-full bg-surface-page overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(widthPct, 1.5).toFixed(2)}%`,
            backgroundColor: "rgba(15, 23, 42, 0.78)",
          }}
        />
      </div>
      <span className="inline-flex items-baseline gap-1 justify-end tabular-nums">
        <span className="text-[11.5px] font-medium text-text-primary leading-none">
          {value.toLocaleString()}
        </span>
        {sub && (
          <span className="text-[10px] text-text-tertiary leading-none">{sub}</span>
        )}
      </span>
    </div>
  );
}

function PerformanceFunnelKpi({
  leads, dialed, connected, interacted, qualified, rangeLabel,
}: {
  leads: number; dialed: number; connected: number; interacted: number; qualified: number;
  rangeLabel: string;
}) {
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const stages = [
    { key: "leads",      label: "Leads",      value: leads,      rate: null as number | null },
    { key: "dialed",     label: "Dialed",     value: dialed,     rate: pct(dialed, leads) },
    { key: "connected",  label: "Connected",  value: connected,  rate: pct(connected, dialed) },
    { key: "interacted", label: "Interacted", value: interacted, rate: pct(interacted, connected) },
    { key: "qualified",  label: "Qualified",  value: qualified,  rate: pct(qualified, leads) },
  ];
  const topValue = Math.max(leads, 1);
  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Performance funnel
        </span>
        <span className="text-[10.5px] text-text-tertiary tabular-nums">
          {pct(qualified, leads)}% overall
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-1">
        {stages.map((s) => (
          <ChartRow
            key={s.key}
            label={s.label}
            value={s.value}
            sub={s.rate !== null ? `${s.rate}%` : null}
            widthPct={(s.value / topValue) * 100}
          />
        ))}
      </div>
    </div>
  );
}

// ── 1. Lead coverage — single compact strip. Scales to any volume. ─────────

function LeadCoverageBar({
  total,
  called,
  remaining,
  dialsPerDay,
}: {
  total: number;
  called: number;
  remaining: number;
  // Derived pace — used to project an ETA. Caller is responsible for
  // computing this from current activity (e.g. total dials / activityDays).
  dialsPerDay: number;
}) {
  const calledPct = total > 0 ? (called / total) * 100 : 0;
  // ETA = remaining ÷ pace. Floors at 1 day so a near-finished outreach
  // doesn't show "0 days" awkwardly.
  const etaDays = dialsPerDay > 0 && remaining > 0
    ? Math.max(1, Math.ceil(remaining / dialsPerDay))
    : null;
  // Project the calendar date by adding etaDays to today. The detail page is
  // demo-only so the user just wants a feel for "around when does this end".
  const etaDate = etaDays !== null
    ? new Date(Date.now() + etaDays * 24 * 60 * 60 * 1000)
    : null;
  const etaLabel = etaDate
    ? etaDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="bg-white border border-border rounded-card px-4 py-3 mb-4 flex items-center gap-5">
      <div className="shrink-0">
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Total leads
        </div>
        <div className="text-[22px] font-semibold tabular-nums text-text-primary leading-tight mt-0.5">
          {total.toLocaleString()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5 text-[11.5px] flex-wrap gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-text-primary" />
            <span className="text-text-secondary">Called</span>
            <span className="font-medium text-text-primary tabular-nums">{called.toLocaleString()}</span>
            <span className="text-text-tertiary tabular-nums">({Math.round(calledPct)}%)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-border" />
            <span className="text-text-secondary">Remaining</span>
            <span className="font-medium text-text-primary tabular-nums">{remaining.toLocaleString()}</span>
            <span className="text-text-tertiary tabular-nums">({Math.round(100 - calledPct)}%)</span>
          </span>
        </div>
        <div className="relative w-full h-2 rounded-full overflow-hidden bg-surface-page">
          <div
            className="absolute inset-y-0 left-0 bg-text-primary"
            style={{ width: `${calledPct.toFixed(2)}%` }}
          />
        </div>
      </div>
      {/* ETA — projects when the remaining leads will be dialled at current
          pace. Hidden once everything is called. */}
      {etaDays !== null && (
        <div className="shrink-0 text-right">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
            Est. completion
          </div>
          <div className="text-[13px] font-medium text-text-primary tabular-nums leading-tight mt-0.5">
            {etaLabel}
          </div>
          <div className="text-[10.5px] text-text-tertiary tabular-nums mt-0.5">
            ~{etaDays} day{etaDays === 1 ? "" : "s"} · {dialsPerDay}/day
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2A. Leads by dial attempt — horizontal bars, matching the Performance
// Funnel pattern. Previously this was a vertical-gradient bar chart that
// looked oversaturated and out of sync with the rest of the page. Now uses
// the same row layout as the funnel: label column on the left, proportional
// bar in the middle, value + percent on the right. Single muted accent
// colour replaces the indigo→pink rainbow gradient.

function DialAttemptsWidget({
  attempts,
  rangeLabel,
}: {
  attempts: number[];
  rangeLabel: string;
}) {
  const rows = attempts.map((value, i) => ({
    key: `a-${i}`,
    label: `${i + 1}×`,
    value,
  }));
  const dialedTotal = attempts.reduce((s, v) => s + v, 0);
  const max = Math.max(...rows.map(b => b.value), 1);
  const pctOf = (v: number) => (dialedTotal > 0 ? Math.round((v / dialedTotal) * 100) : 0);

  return (
    <div className="bg-white border border-border rounded-card px-4 py-3.5 min-h-[140px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          Leads by dial attempt
        </span>
        <span className="text-[10.5px] text-text-tertiary tabular-nums">
          {dialedTotal.toLocaleString()} dialed
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-1">
        {rows.map((r) => (
          <ChartRow
            key={r.key}
            label={r.label}
            value={r.value}
            sub={`${pctOf(r.value)}%`}
            widthPct={(r.value / max) * 100}
          />
        ))}
      </div>
    </div>
  );
}

// ── Goal pacing progress bar ──────────────────────────────────────────────────

// Stable reference "today" so the demo pacing math gives the same result
// during SSR and on the client (avoids hydration mismatch).
const DEMO_NOW = "2026-05-25";

function GoalProgressBar({
  label,
  current,
  goal,
  windowStart,
  windowEnd,
}: {
  label: string;
  current: number;
  goal: number;
  windowStart: string;
  windowEnd: string;
}) {
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  const now = Math.min(new Date(DEMO_NOW).getTime(), end);
  const totalMs = end - start;
  const elapsedMs = Math.max(0, now - start);
  const timePct = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;
  const dayOf = Math.max(1, Math.round(elapsedMs / 86400000));
  const totalDays = Math.max(1, Math.round(totalMs / 86400000));

  const achievedPct = goal > 0 ? Math.min(1, current / goal) : 0;
  const expected = Math.round(timePct * goal);
  const forecast = elapsedMs > 0 ? Math.round((current / elapsedMs) * totalMs) : current;

  const pacingPct =
    expected > 0 ? Math.round(((current - expected) / expected) * 100) : 0;
  const isAhead = current >= expected;

  // Positions on the bar (clamped 0..1). toFixed keeps SSR + client strings identical.
  const achievedX = achievedPct;
  const expectedX = Math.min(1, Math.max(0, timePct));

  const stripeStart = Math.min(achievedX, expectedX);
  const stripeEnd = Math.max(achievedX, expectedX);
  const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

  return (
    <div className="bg-white border border-border rounded-card p-5 mb-4">
      {/* Top row: label + pacing badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
          Goal · {label}
        </div>
        <span
          className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-badge tabular-nums ${
            isAhead ? "bg-[#F0FDF4] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"
          }`}
        >
          {isAhead ? "AHEAD" : "BEHIND"} · {pacingPct > 0 ? "+" : ""}{pacingPct}%
        </span>
      </div>

      {/* Big number + window */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[32px] font-bold tabular-nums text-text-primary leading-none">
          {current.toLocaleString()}
        </span>
        <span className="text-[18px] font-medium text-text-tertiary tabular-nums">
          / {goal.toLocaleString()}
        </span>
        <span className="text-[12.5px] text-text-tertiary ml-3">
          {format(new Date(windowStart), "MMM d")} → {format(new Date(windowEnd), "MMM d, yyyy")}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-surface-page">
        {/* Solid achieved */}
        <div
          className="absolute inset-y-0 left-0 bg-[#2C3E50]"
          style={{ width: pct(achievedX) }}
        />
        {/* Striped deficit/surplus zone between achieved and expected */}
        {Math.abs(achievedX - expectedX) > 0.005 && (
          <div
            className="absolute inset-y-0"
            style={{
              left: pct(stripeStart),
              width: pct(stripeEnd - stripeStart),
              backgroundImage:
                "repeating-linear-gradient(90deg, #D4D4D4 0 4px, transparent 4px 8px)",
            }}
          />
        )}
      </div>

      {/* Footer: 4 labels under the bar */}
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-text-tertiary tabular-nums">
        <span>
          <span className="text-text-secondary font-medium">{Math.round(achievedPct * 100)}%</span> achieved
        </span>
        <span>
          Expected by now · <span className="text-text-secondary font-medium">{expected.toLocaleString()}</span>
        </span>
        <span>
          Forecast end · <span className="text-text-secondary font-medium">{forecast.toLocaleString()}</span>
        </span>
        <span>
          Day <span className="text-text-secondary font-medium">{dayOf}</span> of {totalDays}
        </span>
      </div>
    </div>
  );
}

// ── Horizontal funnel: Total → Called → Connected → Qualified ─────────────────

function FunnelWidget({
  leads,
  dialed,
  connected,
  interacted,
  qualified,
  notQualified,
  callback,
  noAnswer,
}: {
  leads: number;
  dialed: number;
  connected: number;
  interacted: number;
  qualified: number;
  notQualified: number;
  callback: number;
  noAnswer: number;
}) {
  // Each stage carries its own rate definition so the percentage shown inside
  // the capsule matches the standard metric name (Coverage, Connect rate,
  // Interaction rate, Qualification rate).
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const stages = [
    { key: "leads",      label: "Leads",      value: leads,      color: "#1F2937", rate: null },
    { key: "dialed",     label: "Dialed",     value: dialed,     color: "#3730A3", rate: pct(dialed, leads) },
    { key: "connected",  label: "Connected",  value: connected,  color: "#4F46E5", rate: pct(connected, dialed) },
    { key: "interacted", label: "Interacted", value: interacted, color: "#7C3AED", rate: pct(interacted, connected) },
    { key: "qualified",  label: "Qualified",  value: qualified,  color: "#16A34A", rate: pct(qualified, leads) },
  ];

  const dropoffs = [
    { label: "Not qualified", value: notQualified },
    { label: "Callback",      value: callback },
    { label: "No answer",     value: noAnswer },
  ];

  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
        Conversion funnel
      </div>

      {/* Vertical cascade — capsules taper in width based on count vs leads.
          Each capsule carries the stage's own rate (Coverage / Connect rate /
          Interaction rate / Qualification rate) inline with the value. */}
      <div className="flex flex-col items-center gap-1">
        {stages.map((s) => {
          const widthPct = leads > 0 ? Math.max(28, (s.value / leads) * 100) : 28;
          return (
            <div
              key={s.key}
              className="relative rounded-full text-white px-3.5 py-1.5 flex items-center justify-between"
              style={{ width: `${widthPct.toFixed(2)}%`, backgroundColor: s.color, minWidth: 180 }}
            >
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.5px] opacity-85">
                {s.label}
              </span>
              <span className="flex items-baseline gap-2">
                {s.rate !== null && (
                  <span className="text-[10.5px] font-medium tabular-nums opacity-75">
                    {s.rate}%
                  </span>
                )}
                <span className="text-[14px] font-bold tabular-nums leading-none">
                  {s.value.toLocaleString()}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Drop-offs — single compact line */}
      <div className="mt-3 pt-2 border-t border-border-subtle flex items-center gap-3 text-[11px] text-text-secondary">
        <span className="text-text-tertiary uppercase tracking-[0.3px] text-[10px] font-semibold">Dropped</span>
        {dropoffs.map((d, i) => (
          <span key={d.label} className="inline-flex items-center gap-1">
            <span>{d.label}</span>
            <span className="font-semibold text-text-primary tabular-nums">{d.value}</span>
            {i < dropoffs.length - 1 && <span className="text-border">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Chip multi-select group used inside the Filters popover ───────────────────

function ChipGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { id: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div>
      <div className="text-[12.5px] font-semibold text-text-primary mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const isOn = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => onToggle(opt.id)}
              className={`h-7 px-3 text-[12px] font-medium rounded-[14px] border transition-colors ${
                isOn
                  ? "bg-accent text-white border-accent"
                  : "bg-white border-border text-text-secondary hover:text-text-primary hover:border-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
