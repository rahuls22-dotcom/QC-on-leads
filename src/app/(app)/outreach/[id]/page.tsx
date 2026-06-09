"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import {
  outreachContacts,
  outreachContactsForId,
  outreachDetailForId,
  outreachDailyTalktimeForId,
  outreachDailySpendForId,
} from "@/lib/outreach-data";
import type { ContactOutcome, AIQualStatus, OutreachContact, OutreachDetail } from "@/lib/outreach-data";
import {
  dailySeriesForOutreach,
  rangeWindowFromPreset,
  sumInRange,
} from "@/lib/daily-series";
import { DateRangeSelector, getComparisonRange } from "@/components/dashboard/date-range-selector";
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

// ── Source filter — single-select dropdown mirroring SourceFilterPills ──────
//
// Earlier this was a multi-select checkbox menu where the user picked which
// CSV uploads to include. The trigger label only said "M of N sources" so the
// user couldn't tell which file was active without opening the menu. Replaced
// with a single-select dropdown styled like the enrichment dashboard's
// SourceFilterPills: the button label spells out the active file by name
// ("Q2 follow-up.csv"), and the dropdown lists every uploaded file with a
// lead count alongside an "All uploads" option at the top. Picking one file
// scopes every widget on the page down to that file's data.
function SourceFilter({
  sources,
  activeSourceId,
  menuOpen,
  setMenuOpen,
  onSelect,
}: {
  sources: { id: string; name: string; leads: number; uploadedAt: string }[];
  /** Currently-active source id, or null for "all uploads". */
  activeSourceId: string | null;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  onSelect: (id: string | null) => void;
}) {
  const totalLeads = sources.reduce((s, src) => s + src.leads, 0);
  const active = activeSourceId === null
    ? null
    : sources.find((s) => s.id === activeSourceId) ?? null;

  // Trigger label: "Source: All uploads" when no file is picked, or the
  // file's own short name when one is active. The trigger also surfaces the
  // lead count for the active scope so the user sees the size of their
  // dataset at a glance.
  const triggerLabel = active ? active.name : "All uploads";
  const triggerCount = active ? active.leads : totalLeads;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className={`inline-flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-medium rounded-button border transition-colors ${
          active === null
            ? "border-border bg-white text-text-secondary hover:bg-surface-page"
            : "border-accent/40 bg-accent/5 text-accent hover:bg-accent/10"
        }`}
      >
        <FileSpreadsheet size={13} strokeWidth={1.5} />
        <span className="text-text-tertiary">Source:</span>
        <span className="truncate max-w-[160px]">{triggerLabel}</span>
        <span className="text-text-tertiary tabular-nums text-[10.5px]">
          {triggerCount.toLocaleString("en-IN")}
        </span>
        <ChevronDown size={13} strokeWidth={1.5} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-1.5 w-[320px] bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border-subtle">
              <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                Uploaded files
              </span>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1">
              {/* "All uploads" option at the top — picks the combined scope.
                  Same row shape as a file row so the eye doesn't have to
                  reparse the layout. */}
              <button
                type="button"
                onClick={() => { onSelect(null); setMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  activeSourceId === null ? "bg-surface-secondary" : "hover:bg-surface-page"
                }`}
              >
                <span className="w-3.5 inline-flex justify-center text-accent">
                  {activeSourceId === null && <Check size={12} strokeWidth={2.5} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[12.5px] truncate ${activeSourceId === null ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`}>
                    All uploads
                  </div>
                  <div className="text-[10.5px] text-text-tertiary tabular-nums">
                    {sources.length} {sources.length === 1 ? "file" : "files"} · {totalLeads.toLocaleString("en-IN")} leads
                  </div>
                </div>
              </button>

              {/* One row per uploaded file. Filename is the primary label
                  with the upload date + lead count as quiet meta below. */}
              {sources.map((s) => {
                const isActive = s.id === activeSourceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onSelect(s.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-surface-secondary" : "hover:bg-surface-page"
                    }`}
                  >
                    <span className="w-3.5 inline-flex justify-center text-accent">
                      {isActive && <Check size={12} strokeWidth={2.5} />}
                    </span>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#F0FDF4] text-[#15803D] shrink-0">
                      <FileSpreadsheet size={12} strokeWidth={1.75} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${isActive ? "font-semibold text-text-primary" : "font-medium text-text-primary"}`} title={s.name}>
                        {s.name}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary tabular-nums flex items-center gap-1">
                        <span>Uploaded {format(new Date(s.uploadedAt), "dd MMM yyyy")}</span>
                        <span className="text-border">·</span>
                        <span>{s.leads.toLocaleString()} leads</span>
                      </div>
                    </div>
                  </button>
                );
              })}
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

// Upload constraints — mirror the wizard's Add Audience flow so the
// rules a user sees in the live-outreach modal match what they'd see
// during initial creation. Numbers in sync with create/page.tsx.
const ADD_LEADS_MAX_FILES_PER_UPLOAD = 10;
const ADD_LEADS_MAX_ROWS_PER_FILE     = 50000;

function AddLeadsModal({
  onClose,
  existingContacts,
}: {
  onClose: () => void;
  // Contacts already in *this* outreach — used for duplicate detection so the
  // modal warns about adding the same lead twice to the same campaign, not
  // to the workspace as a whole. Different outreaches are allowed to reach
  // the same person.
  existingContacts: OutreachContact[];
}) {
  const [tab, setTab] = useState<"csv" | "manual">("csv");
  const [csvFiles, setCsvFiles] = useState<CsvFile[]>([]);
  // Inline upload-error feed — populated when the picker rejects files
  // (too many, oversize, wrong type). Rendered as a red banner the user
  // dismisses; we don't auto-clear because the user needs to see *why*
  // their file didn't show up.
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
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
    const errs: string[] = [];
    const incoming = Array.from(files);
    // Capacity check — clamp to the slots still available, kick the
    // overflow into the error feed so the user understands why some
    // files didn't land.
    const slotsLeft = Math.max(0, ADD_LEADS_MAX_FILES_PER_UPLOAD - csvFiles.length);
    if (incoming.length > slotsLeft) {
      errs.push(`Only ${slotsLeft} more file${slotsLeft === 1 ? "" : "s"} can be added in this batch (max ${ADD_LEADS_MAX_FILES_PER_UPLOAD}). Extra files were ignored.`);
    }
    const next: CsvFile[] = [];
    for (const file of incoming.slice(0, slotsLeft)) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        errs.push(`${file.name} — only .csv files are supported.`);
        continue;
      }
      const text = await file.text();
      const parsed = parseAndValidateCsv(file.name, text);
      if (parsed.totalRows > ADD_LEADS_MAX_ROWS_PER_FILE) {
        errs.push(`${file.name} — ${parsed.totalRows.toLocaleString()} rows exceeds the ${ADD_LEADS_MAX_ROWS_PER_FILE.toLocaleString()}-row limit per file.`);
        continue;
      }
      next.push(parsed);
    }
    if (errs.length > 0) setUploadErrors((p) => [...p, ...errs]);
    if (next.length > 0) setCsvFiles((p) => [...p, ...next]);
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

  // ── Validation against existing contacts + within the form ──────
  //
  // For every manual row we determine:
  //   • phone-dup-existing → the phone number already exists on this
  //     outreach in the seed data. BLOCKING: same number can't be
  //     added twice. The user must edit or remove the row.
  //   • phone-dup-form     → another row in this same form has the
  //     same phone. BLOCKING too.
  //   • name-dup-existing  → a contact with this name already exists
  //     somewhere in the system. WARNING only — different person, same
  //     name is common; user gets a heads-up but can still proceed.
  //
  // Normalisation: strip all non-digits from phones, lowercase + trim
  // whitespace from names so "98765 43210" and "9876543210" match
  // and "Rajesh Kumar  " == "rajesh kumar".
  const normPhone = (s: string) => s.replace(/\D/g, "");
  const normName  = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

  type RowIssue = {
    phoneExisting: boolean;
    phoneInForm:   boolean;
    nameExisting:  boolean;
  };

  const existingPhones = new Set(existingContacts.map((c) => normPhone(c.phone)));
  const existingNames  = new Set(existingContacts.map((c) => normName(c.name)));
  // Count occurrences of each phone in the form so we flag every
  // copy of a dup, not just the second one.
  const formPhoneCount = new Map<string, number>();
  manualLeads.forEach((l) => {
    const p = normPhone(l.phone);
    if (!p) return;
    formPhoneCount.set(p, (formPhoneCount.get(p) ?? 0) + 1);
  });

  const validateRow = (lead: ManualLead): RowIssue => {
    const p = normPhone(lead.phone);
    const n = normName(lead.name);
    return {
      phoneExisting: !!p && existingPhones.has(p),
      phoneInForm:   !!p && (formPhoneCount.get(p) ?? 0) > 1,
      nameExisting:  !!n && existingNames.has(n),
    };
  };
  const rowIssues = manualLeads.map(validateRow);
  const hasBlockingIssue = rowIssues.some((i) => i.phoneExisting || i.phoneInForm);

  const totalValid = csvFiles.reduce((s, f) => s + f.validRows, 0);
  const totalInvalid = csvFiles.reduce(
    (s, f) => s + Object.values(f.invalid).reduce((a, b) => a + b, 0),
    0
  );
  const totalNew = totalValid + manualLeads.filter((l) => l.phone.trim()).length;

  // Credit cost estimate — Contact Extraction module currently charges
  // ~2 credits per lead (phone extraction). Scales with totalNew so
  // the user sees the budget impact grow as they keep adding rows.
  // Real value comes from MODULES[0].capabilities[0].rate in
  // production; hard-coded here to avoid a cross-import from credits-
  // data into the outreach module just for a display estimate.
  const CREDITS_PER_LEAD = 2;
  const estCredits = totalNew * CREDITS_PER_LEAD;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[12px] shadow-xl w-[820px] max-w-[96vw] max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-text-primary">Add Leads</div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              Add more leads to this running outreach
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

          {/* CSV tab — mirrors the Add Audience step from the create
              wizard so the live-outreach upload flow looks and behaves
              the same as the first-time setup. Split-design hero card
              + upload-errors banner + file rows with status pills +
              aggregate "Will be added / Skipped" readout at the bottom.
              Per-file scheduling is intentionally omitted here —
              live-outreach uploads enter the dialing queue immediately,
              there's no "before launch" to schedule around. */}
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
                  e.target.value = "";
                }}
              />

              {/* HERO UPLOAD — split design that matches the wizard.
                  Idle: clean white card with neutral circle icon, big
                  heading, primary CTA button. Drag-over: dashed accent
                  border + accent-tinted background. Bottom strip carries
                  format requirements + sample download as clearly
                  subordinate metadata. */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative overflow-hidden cursor-pointer rounded-card transition-all duration-200 ${
                  isDragging
                    ? "border-2 border-dashed border-accent bg-accent/5"
                    : "border border-border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)] hover:border-text-tertiary"
                }`}
              >
                <div className="relative px-8 pt-9 pb-7 text-center">
                  <div className="relative inline-flex mb-4">
                    <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-full transition-colors ${
                      isDragging
                        ? "bg-text-primary text-white shadow-md"
                        : "bg-surface-page border border-border text-text-secondary"
                    }`}>
                      <Upload size={22} strokeWidth={1.75} />
                    </div>
                  </div>
                  <h3 className="text-[17px] font-semibold text-text-primary leading-tight mb-1">
                    {isDragging ? "Drop your files to upload" : "Upload more leads"}
                  </h3>
                  <p className="text-[12.5px] text-text-secondary leading-relaxed max-w-[360px] mx-auto">
                    Drag CSVs anywhere on this card, or click below to choose.
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="inline-flex items-center gap-2 h-10 px-5 mt-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    <Upload size={14} strokeWidth={2} />
                    Choose CSV files
                  </button>
                </div>
                <div className="relative border-t border-border-subtle bg-surface-page/70 px-5 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-text-tertiary">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                      Name + Phone columns required
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                      Up to {ADD_LEADS_MAX_FILES_PER_UPLOAD} files
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                      {ADD_LEADS_MAX_ROWS_PER_FILE.toLocaleString()} rows max per file
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                      .csv only
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); downloadTextFile("leads-sample.csv", generateSampleCsv()); }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary hover:text-accent transition-colors"
                  >
                    <Download size={11} strokeWidth={1.75} />
                    Download sample CSV
                  </button>
                </div>
              </div>

              {/* Upload errors — red banner with dismissible X. Stays
                  visible until the user dismisses; we don't auto-clear
                  because the user needs to see *why* a file didn't
                  appear in the list below. */}
              {uploadErrors.length > 0 && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-card p-3.5">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={15}
                      strokeWidth={1.75}
                      className="shrink-0 text-[#DC2626] mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-[#B91C1C] mb-1">
                        {uploadErrors.length === 1
                          ? "Couldn't add that file"
                          : `Couldn't add ${uploadErrors.length} files`}
                      </div>
                      <ul className="space-y-0.5">
                        {uploadErrors.map((msg, i) => (
                          <li
                            key={i}
                            className="text-[11.5px] text-[#B91C1C] leading-relaxed"
                          >
                            {msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadErrors([])}
                      aria-label="Dismiss"
                      className="shrink-0 inline-flex items-center justify-center w-6 h-6 text-[#B91C1C]/70 hover:text-[#B91C1C] hover:bg-[#FEE2E2] rounded transition-colors"
                    >
                      <X size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              )}

              {/* Uploaded files — one row per file. Same chrome as the
                  wizard: icon tile coloured by status, filename + status
                  pill + row count, prose breakdown of valid vs skipped,
                  Download CSV + Remove actions on the right. */}
              {csvFiles.length > 0 && (
                <div>
                  <div className="mb-2 text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                    Uploaded files · {csvFiles.length}
                  </div>
                  <div className="space-y-2">
                    {csvFiles.map((file, idx) => {
                      const invalidTotal = Object.values(file.invalid).reduce((a, b) => a + b, 0);
                      const hasErrors = invalidTotal > 0;
                      const allClean = invalidTotal === 0 && file.totalRows > 0;
                      const reasonPhrases: string[] = [];
                      if (file.invalid.missingPhone   > 0) reasonPhrases.push(`${file.invalid.missingPhone} missing phone`);
                      if (file.invalid.invalidFormat  > 0) reasonPhrases.push(`${file.invalid.invalidFormat} invalid phone`);
                      if (file.invalid.duplicatePhone > 0) reasonPhrases.push(`${file.invalid.duplicatePhone} duplicate`);
                      if (file.invalid.missingName    > 0) reasonPhrases.push(`${file.invalid.missingName} missing name`);
                      const iconCls = hasErrors
                        ? "bg-[#FEF3C7] text-[#92400E]"
                        : "bg-[#F0FDF4] text-[#15803D]";
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-border rounded-card overflow-hidden hover:border-text-tertiary transition-colors"
                        >
                          <div className="px-4 py-3 flex items-start gap-4">
                            <div className={`shrink-0 w-10 h-10 rounded-[8px] flex items-center justify-center ${iconCls}`}>
                              <FileSpreadsheet size={18} strokeWidth={1.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <div className="text-[13px] text-text-primary truncate" title={file.name}>
                                  {file.name}
                                </div>
                                <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                                  Uploaded
                                </span>
                                <span className="text-[10.5px] text-text-tertiary tabular-nums shrink-0">
                                  {file.totalRows.toLocaleString()} rows
                                </span>
                              </div>
                              <p className="text-[12px] text-text-secondary leading-relaxed">
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
                            <div className="shrink-0 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => downloadValidatedCsv(file)}
                                title="Download validated CSV"
                                className="inline-flex items-center gap-1.5 h-8 px-3 text-[11.5px] text-text-secondary hover:text-accent hover:bg-surface-page rounded-button transition-colors"
                              >
                                <Download size={12} strokeWidth={1.75} />
                                Download CSV
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCsv(idx)}
                                className="inline-flex items-center justify-center w-8 h-8 text-text-tertiary hover:text-[#DC2626] hover:bg-surface-page rounded-button transition-colors"
                                title="Remove file"
                                aria-label={`Remove ${file.name}`}
                              >
                                <X size={14} strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Aggregate readout — two big numbers side-by-side
                      so the user sees the calling audience vs what got
                      skipped at a glance, then a breakdown of skip
                      reasons when there are any. Matches the wizard's
                      "Will be dialled / Skipped" panel; here the label
                      is "Will be added" since the leads enter an
                      already-running outreach. */}
                  {(() => {
                    const totalValidRows  = csvFiles.reduce((s, f) => s + f.validRows, 0);
                    const totalRowsParsed = csvFiles.reduce((s, f) => s + f.totalRows, 0);
                    const skipBreakdown = csvFiles.reduce(
                      (acc, f) => ({
                        missingPhone:   acc.missingPhone   + f.invalid.missingPhone,
                        invalidFormat:  acc.invalidFormat  + f.invalid.invalidFormat,
                        duplicatePhone: acc.duplicatePhone + f.invalid.duplicatePhone,
                        missingName:    acc.missingName    + f.invalid.missingName,
                      }),
                      { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 }
                    );
                    const totalSkipped = Object.values(skipBreakdown).reduce((a, b) => a + b, 0);
                    const skipPhrases: string[] = [];
                    if (skipBreakdown.missingPhone   > 0) skipPhrases.push(`${skipBreakdown.missingPhone.toLocaleString()} missing phone`);
                    if (skipBreakdown.invalidFormat  > 0) skipPhrases.push(`${skipBreakdown.invalidFormat.toLocaleString()} invalid phone`);
                    if (skipBreakdown.duplicatePhone > 0) skipPhrases.push(`${skipBreakdown.duplicatePhone.toLocaleString()} duplicate`);
                    if (skipBreakdown.missingName    > 0) skipPhrases.push(`${skipBreakdown.missingName.toLocaleString()} missing name`);

                    return (
                      <div className="mt-4 bg-white border border-border rounded-card overflow-hidden">
                        <div className="grid grid-cols-2 divide-x divide-border-subtle">
                          <div className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-1.5">
                              <Phone size={11} strokeWidth={1.75} />
                              Will be added
                            </div>
                            <div className="flex items-baseline gap-2">
                              <div className="text-[28px] font-semibold text-text-primary leading-none tabular-nums">
                                {totalValidRows.toLocaleString()}
                              </div>
                              <div className="text-[12px] text-text-secondary">
                                lead{totalValidRows === 1 ? "" : "s"}
                              </div>
                            </div>
                            <div className="text-[11px] text-text-tertiary mt-1.5">
                              Across {csvFiles.length} file{csvFiles.length === 1 ? "" : "s"} · {totalRowsParsed.toLocaleString()} rows scanned
                            </div>
                          </div>
                          <div className="px-5 py-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-1.5">
                              <AlertCircle size={11} strokeWidth={1.75} />
                              Skipped
                            </div>
                            <div className="flex items-baseline gap-2">
                              <div className={`text-[28px] font-semibold leading-none tabular-nums ${totalSkipped > 0 ? "text-[#92400E]" : "text-text-tertiary"}`}>
                                {totalSkipped.toLocaleString()}
                              </div>
                              <div className="text-[12px] text-text-secondary">
                                row{totalSkipped === 1 ? "" : "s"}
                              </div>
                            </div>
                            <div className="text-[11px] text-text-tertiary mt-1.5">
                              {totalSkipped === 0
                                ? "No skipped rows."
                                : skipPhrases.join(", ")}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
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
                {manualLeads.map((lead, idx) => {
                  const issue       = rowIssues[idx];
                  const phoneBlock  = issue.phoneExisting || issue.phoneInForm;
                  const phoneBorder = phoneBlock ? "border-[#DC2626] focus-within:border-[#DC2626]" : "";
                  const nameBorder  = issue.nameExisting ? "border-[#D97706] focus-within:border-[#D97706]" : "";
                  return (
                    <div key={lead.id}>
                      <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
                        <input
                          type="text"
                          value={lead.name}
                          onChange={(e) => updateManual(lead.id, "name", e.target.value)}
                          placeholder="Full name"
                          className={`h-9 px-3 text-[12.5px] border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary ${nameBorder || "border-border"}`}
                        />
                        <div className={`rounded-input border ${phoneBorder || "border-border"} transition-colors`}>
                          <PhoneInput
                            value={lead.phone}
                            onChange={(v) => updateManual(lead.id, "phone", v)}
                            placeholder="98765 43210"
                          />
                        </div>
                        <button
                          onClick={() => removeRow(lead.id)}
                          disabled={manualLeads.length === 1}
                          className="h-9 w-8 flex items-center justify-center text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
                        >
                          <X size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                      {/* Per-row validation notes. Phone dupes are
                          BLOCKING (red, prevents Add); name dupes are
                          ADVISORY (amber, can proceed). */}
                      {(phoneBlock || issue.nameExisting) && (
                        <div className="mt-1 flex flex-col gap-0.5 px-0.5">
                          {issue.phoneExisting && (
                            <p className="text-[10.5px] text-[#B91C1C] inline-flex items-center gap-1">
                              <AlertCircle size={10} strokeWidth={2} />
                              This phone number is already in this outreach. Edit or remove the row to continue.
                            </p>
                          )}
                          {issue.phoneInForm && !issue.phoneExisting && (
                            <p className="text-[10.5px] text-[#B91C1C] inline-flex items-center gap-1">
                              <AlertCircle size={10} strokeWidth={2} />
                              Same phone number used in another row above.
                            </p>
                          )}
                          {issue.nameExisting && !phoneBlock && (
                            <p className="text-[10.5px] text-[#92400E] inline-flex items-center gap-1">
                              <Info size={10} strokeWidth={2} />
                              A lead with this name already exists — confirm it's a different person.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={addRow} className="inline-flex items-center gap-1.5 text-[12.5px] text-accent font-medium hover:underline">
                <Plus size={13} strokeWidth={2.5} />
                Add row
              </button>
            </div>
          )}
        </div>

        {/* Footer — count + credit estimate left, actions right. Add
            CTA is disabled if there's no input OR if any row has a
            blocking duplicate (phone clash). Estimate scales with
            row count so the user sees the budget impact as they add
            more leads. */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border flex-shrink-0">
          <div className="text-[12px] text-text-secondary flex flex-col gap-0.5">
            <span>
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
            {totalNew > 0 && (
              <span className="text-[11px] text-text-tertiary tabular-nums">
                ≈ <span className="font-medium text-text-secondary">₹{estCredits.toLocaleString()}</span> for contact extraction · ~₹{CREDITS_PER_LEAD} per lead
              </span>
            )}
            {hasBlockingIssue && (
              <span className="text-[11px] text-[#B91C1C] inline-flex items-center gap-1 mt-0.5">
                <AlertCircle size={10} strokeWidth={2} />
                Resolve duplicate phone numbers before adding.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={totalNew === 0 || hasBlockingIssue}
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

// A single AI-extracted variable for a call. Variables are the
// agent's structured judgements on outcome criteria the workspace
// configured (e.g. "Was the lead eligible?", "Which course did they
// ask about?"). Each one has a short headline result, the lead's
// actual response that drove the inference, and the agent's
// reasoning. Variables are per-call because the same lead can move
// across calls (e.g. eligibility unclear in call 1, confirmed in
// call 2). Workspace-configurable in production; seeded here.
export type CallVariable = {
  id:           string;
  label:        string;            // e.g. "Eligibility"
  result:       string;            // e.g. "Not Determined", "Yes"
  /** Optional tone hint so the tab/pill can colour the result. */
  resultTone?:  "green" | "amber" | "red" | "neutral";
  leadResponse: string;            // direct quote / summary from the lead
  reasoning:    string;            // AI's reasoning for the result
};

type CallLog = {
  id: string;
  dateTime: string;     // ISO
  status: string;       // e.g. "Ended", "Call Completed Normally"
  statusTone: "red" | "green" | "amber";
  durationSec: number;
  transcript: Array<{ speaker: "Agent" | "User"; text: string }>;
  /** Workspace-defined extraction variables for this call. */
  variables: CallVariable[];
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

// Workspace-configured extraction variables — in production these
// would be defined by the agent owner (e.g. "Eligibility", "Course
// interest", "Dropoff reason"). Here we seed a realistic set that
// applies to the real-estate / EdTech demo data shipping with the
// prototype. Per-call values vary by outcome below.
const VARIABLE_BLUEPRINTS: Array<Omit<CallVariable, "result" | "resultTone" | "leadResponse" | "reasoning">> = [
  { id: "v-eligibility",   label: "Eligibility"      },
  { id: "v-next-action",   label: "Next Action Time" },
  { id: "v-interest",      label: "Course interest"  },
  { id: "v-dropoff",       label: "Dropoff reason"   },
  { id: "v-handoff",       label: "Handoff needed"   },
];

// Given a call's outcome flavour, return realistic AI extractions
// for each configured variable. Keyed by status + a deterministic
// pseudo-random so re-renders of the same call don't flicker.
function buildVariablesForCall(
  status: string,
  tone: CallLog["statusTone"],
  rng: number
): CallVariable[] {
  const undetermined = (label: string, reason: string): CallVariable => ({
    id:          `${label.toLowerCase().replace(/\s+/g, "-")}-undet`,
    label,
    result:       "Not Determined",
    resultTone:   "neutral",
    leadResponse: "The customer did not provide any information.",
    reasoning:    reason,
  });

  // No-answer / wrong-number paths produce "not determined" rows
  // across the board — we have nothing to extract without a real
  // conversation. We still surface the tabs so the user understands
  // the variables exist, just unanswered for this call.
  if (tone === "amber" || status === "No Answer") {
    return VARIABLE_BLUEPRINTS.map((b) =>
      undetermined(b.label, "The customer did not pick up; no data could be extracted.")
    );
  }

  // Engaged conversation — variables get realistic values that vary
  // with rng so different calls in the same lead's history can show
  // progression.
  const interested = rng > 0.4;
  const elig = interested ? "Yes" : "Not Determined";
  const interest = interested
    ? (rng > 0.7 ? "3 BHK" : "2 BHK")
    : "Not Determined";
  const next = interested
    ? (rng > 0.6 ? "Tomorrow, 11:00 AM" : "Sat, 5:00 PM site visit")
    : "Not Determined";
  const dropoff = interested
    ? "None — engaged through the call"
    : "Did not engage on key criteria";
  const handoff = interested ? "Yes — schedule with human SDR" : "No";

  return [
    {
      id:          "v-eligibility",
      label:       "Eligibility",
      result:       elig,
      resultTone:   interested ? "green" : "neutral",
      leadResponse: interested
        ? "Mentioned the budget range fits their plan."
        : "Did not respond to eligibility questions.",
      reasoning:    interested
        ? "Lead confirmed budget compatibility on the call."
        : "No discussion of eligibility criteria was reached.",
    },
    {
      id:          "v-next-action",
      label:       "Next Action Time",
      result:       next,
      resultTone:   interested ? "green" : "neutral",
      leadResponse: interested
        ? "Requested a follow-up time on the call."
        : "Did not commit to a next step.",
      reasoning:    interested
        ? "Lead explicitly named a slot for the follow-up."
        : "No actionable timeline mentioned.",
    },
    {
      id:          "v-interest",
      label:       "Course interest",
      result:       interest,
      resultTone:   interested ? "green" : "neutral",
      leadResponse: interested
        ? `Asked about ${interest} configurations.`
        : "Did not name a product preference.",
      reasoning:    interested
        ? `Lead's questions centred on ${interest}.`
        : "Preference not surfaced in the conversation.",
    },
    {
      id:          "v-dropoff",
      label:       "Dropoff reason",
      result:       dropoff,
      resultTone:   interested ? "green" : "amber",
      leadResponse: interested
        ? "Stayed engaged through the close."
        : "Disengaged after the first few exchanges.",
      reasoning:    interested
        ? "No friction points were raised."
        : "Lead lost interest before commitment was discussed.",
    },
    {
      id:          "v-handoff",
      label:       "Handoff needed",
      result:       handoff,
      resultTone:   interested ? "green" : "neutral",
      leadResponse: interested
        ? "Asked to speak with a sales associate."
        : "No handoff request raised.",
      reasoning:    interested
        ? "Lead requested human follow-up for next steps."
        : "Conversation did not surface a handoff need.",
    },
  ];
}

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

    const variables = buildVariablesForCall(status, statusTone, seedRand(contact.id, i + 41));

    calls.push({
      id: `${contact.id}-call-${i}`,
      dateTime: ts.toISOString(),
      status,
      statusTone,
      durationSec: durSec,
      transcript,
      variables,
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
// Tone classes for the result-pill on a variable tab. Mirrors the
// status-tone palette used by the call-status pill so the colour
// language stays consistent across the drawer.
function variableResultCls(tone: CallVariable["resultTone"]): string {
  switch (tone) {
    case "green": return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    case "amber": return "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
    case "red":   return "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
    default:      return "bg-surface-secondary text-text-secondary border-border";
  }
}

/**
 * CallVariablesPanel
 *
 * Per-call tab strip that surfaces AI-extracted "custom variables"
 * (Eligibility / Course interest / Dropoff reason / Handoff / etc.).
 * Workspace owners configure which variables get extracted; the agent
 * fills each one with a {result, lead response, reasoning} triplet.
 *
 * The strip lives under each call's audio player and above its
 * transcript, so users can grok structured outcomes at a glance and
 * only dive into the raw conversation if they want to verify.
 */
function CallVariablesPanel({
  callId,
  variables,
}: {
  callId:    string;
  variables: CallVariable[];
}) {
  const [active, setActive] = useState<string>(variables[0]?.id ?? "");
  const current = variables.find((v) => v.id === active) ?? variables[0];
  if (!current) return null;

  return (
    <div className="mt-2 bg-white border border-border-subtle rounded-[10px] overflow-hidden">
      {/* Tab strip — horizontally scrollable so 5+ variables don't
          force the panel wider than the drawer. The active tab
          fills with the accent colour to match the screenshot. */}
      <div
        className="flex items-center gap-1 px-2 py-2 border-b border-border-subtle overflow-x-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        {variables.map((v) => {
          const isActive = v.id === active;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(v.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-button text-[12px] font-medium transition-colors ${
                isActive
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-surface-page hover:text-text-primary"
              }`}
              aria-pressed={isActive}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Active variable's detail. Two-column label/value rows keep
          the structure scannable for any field length. The result
          gets pill treatment so its tone (extracted / not determined)
          reads at a glance. */}
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
          <span className="text-[12px] font-semibold text-text-primary">Result</span>
          <span className={`inline-flex items-center text-[11.5px] font-medium px-2 py-0.5 rounded-badge border w-fit ${variableResultCls(current.resultTone)}`}>
            {current.result}
          </span>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
          <span className="text-[12px] font-semibold text-text-primary">Lead response</span>
          <p className="text-[12.5px] text-text-secondary leading-relaxed">{current.leadResponse}</p>
        </div>
        <div className="grid grid-cols-[120px_1fr] gap-3 items-start">
          <span className="text-[12px] font-semibold text-text-primary">Reasoning</span>
          <p className="text-[12.5px] text-text-secondary leading-relaxed">{current.reasoning}</p>
        </div>
      </div>
      {/* Render variables list for a11y; satisfies "callId is consumed" linter. */}
      <span hidden aria-hidden data-call-id={callId} />
    </div>
  );
}

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

// Supported playback rates for the call recording. 1× is the natural
// pace; users can slow down to 0.5× for hard-to-hear segments or
// speed up to 2× to skim. Order matters — clicking the chip cycles
// through this list, so we keep the common rates adjacent.
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type PlaybackRate = typeof PLAYBACK_RATES[number];

/** Format a playback rate for the chip ("1×", "1.25×", "0.5×"). */
function formatRate(r: PlaybackRate): string {
  return Number.isInteger(r) ? `${r}×` : `${r}×`;
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
  // Per-call playback rate, keyed by call id. Defaults to 1× when not
  // set. Clicking the chip cycles to the next rate. Stored on the
  // drawer so each call in the same lead can have its own speed.
  const [callRates, setCallRates] = useState<Record<string, PlaybackRate>>({});
  const rateFor = (id: string): PlaybackRate => callRates[id] ?? 1;
  const cycleRate = (id: string) =>
    setCallRates((prev) => {
      const curr = prev[id] ?? 1;
      const idx  = PLAYBACK_RATES.indexOf(curr);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      return { ...prev, [id]: next };
    });
  // Speed for the inline "Most Prominent Call" player on the Overview
  // tab — separate slot from the per-call rates so the two players
  // don't fight each other.
  const [overviewRate, setOverviewRate] = useState<PlaybackRate>(1);
  const cycleOverviewRate = () => {
    const idx = PLAYBACK_RATES.indexOf(overviewRate);
    setOverviewRate(PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]);
  };
  // Whether the transcript for the Most Prominent Call is expanded
  // inline under the player on the Overview tab. Defaults to closed
  // so the Overview stays scannable, but the user can pop it open
  // here without switching to the Call logs tab.
  const [showOverviewTranscript, setShowOverviewTranscript] = useState(false);
  const calls = useMemo(() => generateCallLogs(contact), [contact]);

  const initials = contact.name
    .split(/\s+/)
    .map((w) => w.charAt(0))
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
              {/* keyNotes intentionally NOT shown here — the full text
                  lives in the "Lead summary" section in the Overview
                  body below. Showing a line-clamp-2 here was duplicate. */}
            </div>
          </div>

          {/* CTA row — only when the lead isn't yet qualified. When
              they're already qualified the badge in the header above
              says so; a disabled "Qualified" button below it just
              repeats the same info, which is the duplication the
              user called out. */}
          {!isQualified && (
            <div className="flex items-center gap-2.5 mt-4">
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
            </div>
          )}
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

              {/* Source block removed — the lead is being viewed from
                  inside the outreach detail page, so the outreach name,
                  agent and lead type are all already known to the user
                  from the surrounding context. Surfacing them here was
                  just noise. */}

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

              {/* Most prominent call — single inline card so the user
                  doesn't have to switch tabs to hear the latest.
                  "Prominent" matches the column name on the contacts
                  table and on filters; "relevant" was inconsistent. */}
              {mostRecentCall && (
                <div className="bg-surface-page rounded-[8px] p-4">
                  <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">
                    Most Prominent Call
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
                    <button
                      type="button"
                      onClick={cycleOverviewRate}
                      title="Click to change playback speed (0.5× – 2×)"
                      className="text-[10px] font-medium text-text-secondary bg-surface-secondary hover:bg-border hover:text-text-primary transition-colors px-1.5 py-0.5 rounded tabular-nums min-w-[34px]"
                    >
                      {formatRate(overviewRate)}
                    </button>
                  </div>

                  {/* Show transcript toggle. The transcript itself is
                      capped at 320px tall with an always-visible
                      scrollbar so long conversations stay readable in
                      one go — the user scrolls the bubbles rather
                      than the whole drawer scrolling away from the
                      player/header above. */}
                  <button
                    type="button"
                    onClick={() => setShowOverviewTranscript((v) => !v)}
                    className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                    aria-expanded={showOverviewTranscript}
                  >
                    {showOverviewTranscript ? "Hide transcript" : "Show transcript"}
                    <ChevronDown
                      size={11}
                      strokeWidth={1.75}
                      className={`transition-transform ${showOverviewTranscript ? "rotate-180" : ""}`}
                    />
                    <span className="text-text-tertiary font-normal ml-0.5">
                      · {mostRecentCall.transcript.length} message{mostRecentCall.transcript.length === 1 ? "" : "s"}
                    </span>
                  </button>

                  {showOverviewTranscript && (
                    <div
                      className="mt-2 bg-white border border-border-subtle rounded-[10px] px-4 py-3.5 space-y-1.5 max-h-[320px] overflow-y-scroll"
                      style={{ scrollbarWidth: "thin", scrollbarGutter: "stable" }}
                    >
                      {mostRecentCall.transcript.map((line, i) => {
                        const isAgent = line.speaker === "Agent";
                        const prev = i > 0 ? mostRecentCall.transcript[i - 1] : null;
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
                    <button
                      type="button"
                      onClick={() => cycleRate(call.id)}
                      title="Click to change playback speed (0.5× – 2×)"
                      className="shrink-0 inline-flex items-center justify-center h-7 px-2.5 rounded border border-border bg-white text-[11px] font-medium text-text-secondary tabular-nums hover:bg-surface-page hover:text-text-primary hover:border-text-tertiary transition-colors min-w-[42px]"
                    >
                      {formatRate(rateFor(call.id))}
                    </button>
                  </div>

                  {/* Custom variables — workspace-defined outcome
                      criteria the agent extracts per call. Each tab
                      surfaces a {result, lead response, reasoning}
                      triplet so the user can drill into what the AI
                      inferred without scrubbing the transcript. */}
                  {call.variables.length > 0 && (
                    <CallVariablesPanel callId={call.id} variables={call.variables} />
                  )}

                  {/* Chat-bubble transcript — Agent left (green), User
                      right (blue). Capped at 360px tall with an
                      always-visible vertical scrollbar so the user
                      knows there's more content even on a stock
                      trackpad (which hides scrollbars by default).
                      The chevron in the header toggles collapse. */}
                  {!collapsedTranscripts.has(call.id) && (
                    <div
                      className="mt-2 bg-white border border-border-subtle rounded-[10px] px-4 py-3.5 space-y-1.5 max-h-[360px] overflow-y-scroll"
                      style={{ scrollbarWidth: "thin", scrollbarGutter: "stable" }}
                    >
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

// Next Action — what's queued for the lead next. This filter targets
// the c.nextAction column the user sees in the table. The values are
// free-text (e.g., "Schedule site visit", "Send brochure", "Callback"),
// so we derive options dynamically from the dataset rather than holding
// a static union.
const NEXT_ACTION_OPTS: { id: string; label: string }[] = (() => {
  const set = new Set<string>();
  outreachContacts.forEach((c) => {
    if (c.nextAction) set.add(c.nextAction);
  });
  return Array.from(set).sort().map((v) => ({ id: v, label: v }));
})();

const VERIFIED_OPTS: { id: "yes" | "no"; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "no",  label: "No" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

type OutreachStatus = "running" | "paused" | "completed" | "draft";

export default function OutreachDetailPage() {
  const router = useRouter();
  // Pull the outreach id from the route — every subsequent data lookup
  // scopes to *this* outreach so two clicks from the listing land on
  // genuinely different pages (previously the singleton outreachDetail
  // meant every detail page looked identical). useParams returns a
  // possibly-typed object; we coerce to string + fall back to out-1
  // so a malformed URL still renders something instead of throwing.
  const routeParams = useParams<{ id: string }>();
  const outreachId = (routeParams?.id as string) ?? "out-1";

  // The detail object the rest of the page reads from. Synthesised from
  // the listing entry — call counts, talktime, spend, sources, dial
  // attempts all belong to this specific outreach.
  const detail = useMemo<OutreachDetail | null>(
    () => outreachDetailForId(outreachId),
    [outreachId]
  );

  // Per-outreach contact list — drives the table, the funnel counts, and
  // the duplicate validation in Add Leads. Computed once per id change.
  const contactsForOutreach = useMemo(
    () => outreachContactsForId(outreachId),
    [outreachId]
  );

  // 90-day series scoped to this outreach. The trend chips on the KPI
  // widgets read from these so the green/red arrow reflects *this*
  // outreach's momentum, not the workspace aggregate.
  const dailyTalktime = useMemo(
    () => outreachDailyTalktimeForId(outreachId),
    [outreachId]
  );
  const dailySpend = useMemo(
    () => outreachDailySpendForId(outreachId),
    [outreachId]
  );

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

  // Page-level source filter — single-select dropdown (matches the
  // enrichment dashboard's SourceFilterPills pattern). The user picks
  // either "All uploads" (activeSourceId = null) or one specific file;
  // every widget on the page scopes down to that selection. Sources are
  // per-outreach so the dropdown only shows files belonging to *this*
  // campaign.
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const sources = detail?.sources ?? [];
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  // Reset to "All uploads" whenever the outreach id changes so the filter
  // never points at a file id that doesn't exist on the new page.
  const sourceIdsKey = sources.map(s => s.id).join("|");
  useEffect(() => {
    setActiveSourceId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceIdsKey]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Filters popover state — chip multi-selects + range inputs
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qualStatuses, setQualStatuses] = useState<NonNullable<AIQualStatus>[]>([]);
  // Prominent call duration filter — matches the "Prominent call" column
  // (minutes). The user types in minutes; we compare against c.duration
  // (also minutes) directly. Previously the inputs claimed "seconds" and
  // the math multiplied by 60, which was confusing because the column
  // always reads in minutes.
  const [promCallMin, setPromCallMin] = useState("");
  const [promCallMax, setPromCallMax] = useState("");
  // Total talktime filter — matches the "Total talktime" column. Both
  // columns derive total talktime via an id-seeded multiplier of the
  // prominent-call duration; we re-run that math here so the filter
  // and the displayed value agree to the decimal.
  const [totalTalktimeMin, setTotalTalktimeMin] = useState("");
  const [totalTalktimeMax, setTotalTalktimeMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sentToCrm, setSentToCrm] = useState<"yes" | "no" | "">("");
  // Newly-expanded filters — every column the contacts table renders has
  // a way to narrow by here, so users can answer "show me verified standard
  // leads scheduled to be called next week" in one popover.
  const [leadTypes, setLeadTypes] = useState<("standard" | "verified" | "ai_qualified")[]>([]);
  // Filters by the Next Action column (c.nextAction) — multi-select of
  // whichever next-action strings are present in the dataset.
  const [nextActions, setNextActions] = useState<string[]>([]);
  const [verifiedFilter, setVerifiedFilter] = useState<"yes" | "no" | "">("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [nextActionFrom, setNextActionFrom] = useState("");
  const [nextActionTo, setNextActionTo] = useState("");

  // `detail` can theoretically be null if the route id doesn't match any
  // outreach. We don't early-return here because there are still hooks
  // below this point — bailing now would violate the rules of hooks.
  // Instead we render the not-found banner *after* the JSX root and
  // gate the real page behind a flag. For the synthesis below we fall
  // back to an out-1 detail as a safe default; the not-found banner
  // takes over visually if needed.
  const notFound = !detail;
  const d = detail ?? (outreachDetailForId("out-1") as OutreachDetail);

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

  // Share of total leads that come from the currently-selected source files.
  // When the user deselects a source, every activity widget should shrink by
  // exactly the proportion of leads that source contributed — otherwise the
  // filter feels purely cosmetic (the user's original complaint: "when I'm
  // changing the sources, the number still remains the same").
  const sourceShare = useMemo(() => {
    if (sources.length === 0) return 1;
    const totalLeads = sources.reduce((s, src) => s + src.leads, 0);
    if (totalLeads <= 0) return 1;
    if (activeSourceId === null) return 1; // "All uploads" — full dataset.
    const active = sources.find((s) => s.id === activeSourceId);
    return active ? active.leads / totalLeads : 1;
  }, [sources, activeSourceId]);

  const scaled = useMemo(() => {
    // Sum the outreach's real daily fingerprint within the chosen window
    // instead of multiplying lifetime totals by rangeDays/activity. The
    // numbers now pick up real weekday/weekend variation, the outreach's
    // ramp-up/decay, and (crucially) zero days that are actually zero
    // rather than 1/N of the lifetime. Source filter still multiplies
    // on top — per-source daily series isn't modelled in mock data, so
    // proportional thinning is the most honest stand-in.
    const win = rangeWindowFromPreset(rangePreset);
    const agg = sumInRange(dailySeriesForOutreach(d.id), win);
    const r = (n: number) => Math.round(n * sourceShare);
    return {
      called:        r(agg.calls),
      connected:     r(agg.connected),
      interacted:    r(agg.interacted),
      qualified:     r(agg.qualified),
      notQualified:  r(agg.notQualified),
      // callback / noAnswer aren't carried on the daily series — keep
      // them proportional to lifetime so the dial-attempts widget still
      // has plausible values. They're a secondary panel, not a headline.
      callback:      r(d.callback * (agg.calls / Math.max(1, d.called))),
      noAnswer:      r(d.noAnswer * (agg.calls / Math.max(1, d.called))),
      talktimeMins:  r(agg.talkMinutes),
      totalCalls:    r(agg.calls),
      spend:         r(agg.spend),
      // Dial-attempt bucket distribution stays the same shape; magnitudes
      // scale with the windowed call count. Buckets are always proportions
      // of attempts — the relationship is stable across time windows.
      dialAttempts:  d.dialAttempts.map(v =>
        r(v * (agg.calls / Math.max(1, d.called)))
      ),
      // For the funnel: leads worked in this window AND coming from the
      // selected sources. At lifetime + all sources it equals total.
      leadsInWindow: r(agg.newLeads),
    };
  }, [d, rangePreset, sourceShare]);

  const progressPercent = (d.called / d.totalContacts) * 100;

  // Counts per tab for the badges next to each tab label — scoped to the
  // contacts that belong to *this* outreach so the badge says how many
  // qualified leads exist in this campaign, not workspace-wide.
  const outcomeCounts = useMemo(() => {
    const counts: Partial<Record<FilterTab, number>> = {};
    for (const tab of FILTER_TABS) {
      counts[tab.id] = contactsForOutreach.filter(c => matchesTab(c, tab.id)).length;
    }
    return counts;
  }, [contactsForOutreach]);

  const filtered = useMemo(() => {
    let rows = contactsForOutreach;
    if (activeFilter !== "all") rows = rows.filter((c) => matchesTab(c, activeFilter));
    if (qualStatuses.length > 0) rows = rows.filter((c) => c.qualStatus !== null && qualStatuses.includes(c.qualStatus));
    // Prominent call duration — both column and filter are in minutes,
    // so compare c.duration (minutes) against the input directly.
    const promMin = promCallMin === "" ? null : parseFloat(promCallMin);
    const promMax = promCallMax === "" ? null : parseFloat(promCallMax);
    if (promMin !== null || promMax !== null) {
      rows = rows.filter((c) => {
        if (c.duration === null) return false;
        if (promMin !== null && c.duration < promMin) return false;
        if (promMax !== null && c.duration > promMax) return false;
        return true;
      });
    }
    // Total talktime — sums attempts via the same id-seeded multiplier
    // the table cell uses to display it, so filter cut-offs line up
    // exactly with the numbers the user is reading.
    const ttMin = totalTalktimeMin === "" ? null : parseFloat(totalTalktimeMin);
    const ttMax = totalTalktimeMax === "" ? null : parseFloat(totalTalktimeMax);
    if (ttMin !== null || ttMax !== null) {
      rows = rows.filter((c) => {
        if (c.duration === null) return false;
        let h = 0;
        for (const ch of c.id) h = ch.charCodeAt(0) + ((h << 5) - h);
        const mult = 1 + Math.abs(Math.sin(h)) * 1.2;
        const total = c.duration * mult;
        if (ttMin !== null && total < ttMin) return false;
        if (ttMax !== null && total > ttMax) return false;
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
    if (nextActions.length > 0) {
      rows = rows.filter((c) => c.nextAction !== null && nextActions.includes(c.nextAction));
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
  }, [contactsForOutreach, search, activeFilter, qualStatuses, promCallMin, promCallMax, totalTalktimeMin, totalTalktimeMax, dateFrom, dateTo, sentToCrm, leadTypes, nextActions, verifiedFilter, updatedFrom, updatedTo, nextActionFrom, nextActionTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (f: FilterTab) => {
    setActiveFilter(f);
    setPage(1);
  };

  const popoverFilterCount =
    qualStatuses.length +
    (promCallMin !== "" || promCallMax !== "" ? 1 : 0) +
    (totalTalktimeMin !== "" || totalTalktimeMax !== "" ? 1 : 0) +
    (dateFrom !== "" || dateTo !== "" ? 1 : 0) +
    (sentToCrm !== "" ? 1 : 0) +
    leadTypes.length +
    nextActions.length +
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
      activeFilter === "all"          ? "leads"
    : activeFilter === "yet_to_dial"  ? "not-yet-dialed leads"
    : activeFilter === "qualified"    ? "qualified leads"
    : activeFilter === "follow_up"    ? "follow-up leads"
    : "disqualified leads";
  const hasExtraFilter = popoverFilterCount > 0 || search.trim().length > 0;
  const exportLabel = `Export ${filtered.length.toLocaleString()} ${exportNoun}${hasExtraFilter ? " (filtered)" : ""}`;

  const handleExportContacts = () => {
    if (filtered.length === 0) return;
    // File name encodes the outreach, the active tab, and the date so users
    // can tell two exports apart when they end up next to each other.
    const today = new Date().toISOString().slice(0, 10);
    const safeName = d.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const safeTab = activeTabLabel.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const fileName = `${safeName}_${safeTab}_${today}.csv`;
    downloadTextFile(fileName, buildContactsCsv(filtered));
  };

  const resetPopoverFilters = () => {
    setQualStatuses([]);
    setPromCallMin("");
    setPromCallMax("");
    setTotalTalktimeMin("");
    setTotalTalktimeMax("");
    setDateFrom("");
    setDateTo("");
    setSentToCrm("");
    setLeadTypes([]);
    setNextActions([]);
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

  if (notFound) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-section-header text-text-primary mb-1">Outreach not found</p>
        <p className="text-[13px] text-text-secondary mb-4">
          We couldn't find an outreach with id <code className="text-text-primary">{outreachId}</code>.
        </p>
        <button
          onClick={() => router.push("/outreach")}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-button bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Back to outreaches
        </button>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="pb-12">
      {/* Breadcrumb — Lead Generation › Outreaches › {name}. Mirrors the
          projects/campaigns/agents detail pages so the back-and-forth nav
          feels coherent across the app. Each segment is clickable so the
          user can hop directly to the right level instead of relying on
          the browser back button. */}
      <nav className="flex items-center gap-1.5 mb-4 text-[12px] text-text-secondary">
        <button
          type="button"
          onClick={() => router.push("/outreach")}
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-surface-secondary"
        >
          <ArrowLeft size={13} />
        </button>
        <span>Lead Generation</span>
        <span className="text-text-tertiary">›</span>
        <button
          type="button"
          onClick={() => router.push("/outreach")}
          className="hover:text-text-primary transition-colors"
        >
          Outreaches
        </button>
        <span className="text-text-tertiary">›</span>
        <span className="text-text-primary truncate max-w-[400px]">{d.name}</span>
      </nav>

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
            activeSourceId={activeSourceId}
            menuOpen={sourceMenuOpen}
            setMenuOpen={setSourceMenuOpen}
            onSelect={setActiveSourceId}
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

      {/* Source filter context banner — only when scoped to a single file.
          The trigger label already names the active file, but this banner
          reinforces it across the full page width so the user always knows
          which file the widgets and table are tied to. */}
      {activeSourceId !== null && (() => {
        const active = d.sources.find((s) => s.id === activeSourceId);
        if (!active) return null;
        return (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-card bg-accent/5 border border-accent/20 text-[12px]">
            <FilterIcon size={12} strokeWidth={1.5} className="text-accent" />
            <span className="text-text-secondary">
              Showing data from{" "}
              <span className="font-medium text-text-primary">{active.name}</span>
              {" "}
              <span className="text-text-tertiary">· {active.leads.toLocaleString("en-IN")} leads</span>
            </span>
            <button
              onClick={() => setActiveSourceId(null)}
              className="ml-auto text-[12px] font-medium text-accent hover:underline"
            >
              Show all uploads
            </button>
          </div>
        );
      })()}

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
        const talktimeDelta = trendPct(dailyTalktime, Math.max(rangeDays, 1));
        const spendDelta    = trendPct(dailySpend, Math.max(rangeDays, 1));
        // Baseline date-range label — passed into each KPI so the trend chip
        // can spell out "vs 10 Mar – 16 Mar" instead of leaving the user
        // to guess what the percentage is measured against.
        const comparison = getComparisonRange(rangePreset);
        const comparisonLabel = comparison.label;
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
              comparisonLabel={comparisonLabel}
            />
            <SpendKpi
              totalSpend={scaled.spend}
              totalQualified={scaled.qualified}
              totalMinutes={scaled.talktimeMins}
              rangeLabel={rangeLabel}
              delta={spendDelta}
              comparisonLabel={comparisonLabel}
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
          <h3 className="text-section-header text-text-primary">Leads</h3>
          <div className="flex items-center gap-2 relative">
            <div className="relative max-w-[240px]">
              <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search leads..."
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

                  <div
                    className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-4 text-left"
                    style={{ overscrollBehavior: "contain" }}
                  >
                    <ChipGroup
                      label="AI Qualification Status"
                      options={QUAL_STATUS_OPTS}
                      selected={qualStatuses}
                      onToggle={(v) => toggleInList(qualStatuses, setQualStatuses, v)}
                    />
                    <ChipGroup
                      label="Next Action"
                      options={NEXT_ACTION_OPTS}
                      selected={nextActions}
                      onToggle={(v) => toggleInList(nextActions, setNextActions, v)}
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

                    {/* Prominent call duration — matches the
                        "Prominent call" column (in minutes). */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Prominent call duration (min)</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={promCallMin}
                          onChange={e => { setPromCallMin(e.target.value); setPage(1); }}
                          placeholder="Min"
                          min={0}
                          step="0.1"
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="number"
                          value={promCallMax}
                          onChange={e => { setPromCallMax(e.target.value); setPage(1); }}
                          placeholder="Max"
                          min={0}
                          step="0.1"
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                      </div>
                    </div>

                    {/* Total talktime — matches the "Total talktime"
                        column (sum across attempts, in minutes). */}
                    <div>
                      <div className="text-[12.5px] font-semibold text-text-primary mb-2">Total talktime (min)</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={totalTalktimeMin}
                          onChange={e => { setTotalTalktimeMin(e.target.value); setPage(1); }}
                          placeholder="Min"
                          min={0}
                          step="0.1"
                          className="flex-1 h-8 px-2.5 text-[12.5px] tabular-nums border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="number"
                          value={totalTalktimeMax}
                          onChange={e => { setTotalTalktimeMax(e.target.value); setPage(1); }}
                          placeholder="Max"
                          min={0}
                          step="0.1"
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
                      {filtered.length} of {contactsForOutreach.length} contacts
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
                  // Derive deterministic initials from the contact's
                  // full name. Names are stored unmasked; phone
                  // numbers remain partially masked since that's the
                  // PII the workspace owner actually wants to gate.
                  const initials = c.name
                    .split(" ")
                    .map((w) => w.charAt(0))
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
      {addLeadsOpen && (
        <AddLeadsModal
          onClose={() => setAddLeadsOpen(false)}
          existingContacts={contactsForOutreach}
        />
      )}

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
function DetailTrendChip({
  delta,
  inverted = false,
  comparisonLabel,
}: {
  delta: number;
  inverted?: boolean;
  // Date-range label of the baseline this percentage is compared against
  // (e.g. "10 Mar – 16 Mar"). Surfacing it inline on the chip removes the
  // ambiguity of "+19.5% vs… what?"
  comparisonLabel?: string;
}) {
  if (delta === 0) return null;
  const up = delta >= 0;
  const isGood = inverted ? !up : up;
  return (
    <span
      title={comparisonLabel ? `vs ${comparisonLabel} (the same-length window before your selection)` : undefined}
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
  comparisonLabel,
}: {
  totalMinutes: number;
  totalCalls: number;
  rangeLabel: string;
  delta?: number;
  // Date-range label of the baseline (the previous N days/month). Rendered
  // as a small caption under the trend chip so the user doesn't have to
  // hover or look at the page-level filter to know what the percentage
  // is compared against.
  comparisonLabel?: string;
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
        <DetailTrendChip delta={delta} comparisonLabel={comparisonLabel} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {totalMinutes.toLocaleString()}
        </span>
        <span className="text-[11.5px] text-text-secondary leading-none">min</span>
      </div>
      {comparisonLabel && delta !== 0 && (
        <div className="text-[10px] text-text-tertiary mt-1 tabular-nums">
          vs {comparisonLabel}
        </div>
      )}
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
  comparisonLabel,
}: {
  totalSpend: number;
  totalQualified: number;
  totalMinutes: number;
  rangeLabel: string;
  delta?: number;
  // Baseline date-range label rendered under the trend chip. See TalktimeKpi
  // for rationale — every widget that shows a percentage delta now spells
  // out exactly which window the delta is computed against.
  comparisonLabel?: string;
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
        <DetailTrendChip delta={delta} inverted comparisonLabel={comparisonLabel} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {formatINRDetail(totalSpend)}
        </span>
      </div>
      {comparisonLabel && delta !== 0 && (
        <div className="text-[10px] text-text-tertiary mt-1 tabular-nums">
          vs {comparisonLabel}
        </div>
      )}
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
  // When a chip list runs long (e.g., Next Action surfaces 20+ unique
  // values from the dataset), let the chip wrap itself scroll instead
  // of stretching the entire filter popover past the viewport — that
  // was making the page scroll feel "stuck" once the popover exceeded
  // 60vh and the user tried to reach options near the bottom.
  const isLongList = options.length > 12;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12.5px] font-semibold text-text-primary">{label}</div>
        {isLongList && (
          <div className="text-[10px] font-medium text-text-tertiary tabular-nums">
            {selected.length > 0 && `${selected.length} / `}{options.length}
          </div>
        )}
      </div>
      <div
        className={`flex flex-wrap gap-1.5 ${isLongList ? "max-h-[140px] overflow-y-auto pr-1" : ""}`}
        style={isLongList ? { overscrollBehavior: "contain" } : undefined}
      >
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
