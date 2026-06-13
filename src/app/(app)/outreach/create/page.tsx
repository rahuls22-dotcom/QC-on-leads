"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Upload, FileSpreadsheet, X, Rocket,
  CheckCircle2, AlertCircle, Plus, Download, Check, Phone, Clock,
  Users, Calendar, Bot, FlaskConical, Loader2, FolderKanban,
  Info, ChevronDown, Sparkles, Pencil,
} from "lucide-react";
import { voiceAgents } from "@/lib/outreach-data";
import { projectsList } from "@/lib/project-data";
import { useDemoMode } from "@/lib/demo-mode";
import { PhoneInput } from "@/components/shared/phone-input";

// Opacity-only step transition. Earlier the variant animated `x: 10 → 0`,
// but framer-motion under AnimatePresence sometimes leaves a residual
// translateX on the element after the animation completes — which then
// shifts the step body horizontally relative to its sibling nav buttons
// (which sit outside the motion.div). The result was a ~7 px misalignment
// between widgets and the Back/Next bar on Step 2. Dropping the x animation
// keeps the slide-in feel via opacity alone and removes the source of the
// residual transform.
const fadeSlide: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Hard caps on the audience upload. These exist to protect the dialer
// from absurd batch sizes (which would also blow past the user's wallet
// in a single launch) and to keep the in-browser parse cheap. Numbers
// chosen for a real-estate workflow — most CSVs from a portal export
// land under 5k rows, so 10k per file + 5 files (= 50k leads max) gives
// breathing room without inviting accidents.
const MAX_FILES_PER_UPLOAD = 5;
const MAX_ROWS_PER_FILE    = 10000;
// Step descriptors match the campaign wizard pattern: each step carries its
// own icon (rendered in the circle when not yet completed) and a label that
// sits below the circle. Keeps the create flow visually consistent with the
// campaign create flow.
// Two-step flow: create the outreach (name + agent + churn), then add an
// audience (CSV + schedule + optional test calls). The old "Review & Launch"
// step was folded into Step 2 because there's no meaningful review work to
// do once the audience is in place — the user already saw their settings
// on Step 1 and can edit them by going back. A confirmation interstitial
// appears between Step 1 and Step 2 so the user explicitly chooses to add
// audience now vs. later.
const STEPS = [
  { id: 1 as const, label: "Outreach",  icon: Sparkles },
  { id: 2 as const, label: "Audience",  icon: Users },
];
type Step = 1 | 2;

interface ManualLead { id: string; name: string; phone: string; }

// CSV upload data model — mirrors the AddLeadsModal pattern from the outreach
// detail page so the audience step behaves the same way (real parsing, real
// validation, per-row failure reasons surfaced to the user).
type RowStatus = "valid" | "missingName" | "missingPhone" | "invalidFormat" | "duplicate";
interface PreviewRow {
  cells: string[];
  status: RowStatus;
  // Carry the extracted Name/Phone alongside the raw cells so the
  // cumulative cross-file preview can render a consistent Name/Phone column
  // even when each file has its own column shape (e.g. "Full Name" vs
  // "Name", "Mobile" vs "Phone").
  name: string;
  phone: string;
}
interface CsvInvalidBreakdown {
  missingPhone:   number;
  invalidFormat:  number;
  duplicatePhone: number;
  missingName:    number;
}
// One file in the audience. Carries three concerns:
//   1. Identity + content (name, parsed row counts, validation breakdown).
//   2. Upload state (uploading vs ready vs failed, with a progress %).
//      Files appear in the list immediately on selection so the user can
//      see them, with a progress bar that ticks up until parsing completes.
//   3. Per-file schedule — each file is treated as its own dial batch,
//      so a user can drop two CSVs and start one immediately while
//      queuing the other for a later time.
type FileStatus = "uploading" | "ready" | "failed";
interface CsvFile {
  id:             string;
  name:           string;
  status:         FileStatus;
  // Upload progress in percent (0-100). Only meaningful while status is
  // "uploading"; once "ready" we don't bother resetting it.
  progress:       number;
  totalRows:      number;
  validRows:      number;
  invalid:        CsvInvalidBreakdown;
  previewHeaders: string[];
  previewRows:    PreviewRow[];
  allRows:        PreviewRow[];
  // Per-file schedule. Default is "immediately"; flipping to "schedule"
  // reveals the date + time pickers in the file's footer strip.
  startMode:      "immediately" | "schedule";
  startDate:      string;
  startTime:      string;
}

const INVALID_REASONS: Array<{ key: keyof CsvInvalidBreakdown; label: string; hint: string }> = [
  { key: "missingPhone",   label: "Missing phone",   hint: "Row has no value in the phone column" },
  { key: "invalidFormat",  label: "Invalid format",  hint: "Couldn't parse as a 10-digit number" },
  { key: "duplicatePhone", label: "Duplicate",       hint: "Already exists in this file" },
  { key: "missingName",    label: "Missing name",    hint: "Row has no value in the name column" },
];

const ROW_STATUS_LABEL: Record<Exclude<RowStatus, "valid">, string> = {
  missingName:   "Missing name",
  missingPhone:  "Missing phone",
  invalidFormat: "Invalid format",
  duplicate:     "Duplicate",
};


// Minimal CSV splitter — handles quoted fields with embedded commas. Not a
// full RFC 4180 implementation, but covers the shapes spreadsheets emit.
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

// Parsed-content shape — what the CSV string yields. The full CsvFile is
// composed by merging this with the upload-state + schedule fields that
// the caller manages separately.
type ParsedCsv = Pick<
  CsvFile,
  "totalRows" | "validRows" | "invalid" | "previewHeaders" | "previewRows" | "allRows"
>;

function parseAndValidateCsv(text: string): ParsedCsv {
  const allLines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (allLines.length === 0) {
    return {
      totalRows: 0, validRows: 0,
      invalid: { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 },
      previewHeaders: [], previewRows: [], allRows: [],
    };
  }

  const headerCells = splitCsvLine(allLines[0]);
  const headerLower = headerCells.map(h => h.toLowerCase());
  const phoneIdx = headerLower.findIndex(h => /phone|mobile|whatsapp|^number$/.test(h));
  const nameIdx  = headerLower.findIndex(h => /^name$|^full\s*name$|^lead\s*name$|first\s*name|^contact$/.test(h));

  const dataLines = allLines.slice(1);
  const seen = new Set<string>();

  const taggedAll: PreviewRow[] = dataLines.map((line) => {
    const cols = splitCsvLine(line);
    const phoneRaw = phoneIdx >= 0 ? (cols[phoneIdx] ?? "") : "";
    const nameRaw  = nameIdx  >= 0 ? (cols[nameIdx]  ?? "") : "";
    const name  = nameRaw.trim();
    const phone = phoneRaw.trim();

    if (!name)  return { cells: cols, status: "missingName",  name, phone };
    if (!phone) return { cells: cols, status: "missingPhone", name, phone };

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 12) return { cells: cols, status: "invalidFormat", name, phone };

    if (seen.has(digits)) return { cells: cols, status: "duplicate", name, phone };
    seen.add(digits);
    return { cells: cols, status: "valid", name, phone };
  });

  let missingPhone = 0, invalidFormat = 0, duplicatePhone = 0, missingName = 0, valid = 0;
  for (const r of taggedAll) {
    if      (r.status === "valid")         valid++;
    else if (r.status === "missingPhone")  missingPhone++;
    else if (r.status === "invalidFormat") invalidFormat++;
    else if (r.status === "duplicate")     duplicatePhone++;
    else if (r.status === "missingName")   missingName++;
  }

  // Sample preview = first 5 failed + first 5 valid, so the user sees both
  // signals even on largely clean files.
  const failed = taggedAll.filter(r => r.status !== "valid").slice(0, 5);
  const ok     = taggedAll.filter(r => r.status === "valid").slice(0, 5);
  const previewRows = [...failed, ...ok].slice(0, 10);

  return {
    totalRows: dataLines.length,
    validRows: valid,
    invalid: { missingPhone, invalidFormat, duplicatePhone, missingName },
    previewHeaders: headerCells,
    previewRows,
    allRows: taggedAll,
  };
}

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

// Minimal CSV-cell escaper for the per-file preview download. Quoted only
// when the cell contains a separator, quote, or newline — keeps the output
// human-readable when it can be.
function csvEscape(cell: string): string {
  if (cell == null) return "";
  const s = String(cell);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// "Download preview" — produces a CSV that mirrors the user's original file
// plus an extra `Status` column showing how each row was classified ("OK" or
// the failure reason). The user can open it in Excel/Numbers to spot-check
// what's about to be dialed without us trying to render 600k rows in the
// browser. Caps at 500 rows because this is a sample, not an export.
function downloadFilePreview(file: CsvFile) {
  const MAX_ROWS = 500;
  const lines: string[] = [];
  lines.push([...file.previewHeaders, "Status"].map(csvEscape).join(","));
  const rows = file.allRows.slice(0, MAX_ROWS);
  for (const row of rows) {
    const statusLabel =
      row.status === "valid"
        ? "OK"
        : ROW_STATUS_LABEL[row.status as Exclude<RowStatus, "valid">];
    lines.push([...row.cells, statusLabel].map(csvEscape).join(","));
  }
  const base = file.name.replace(/\.csv$/i, "");
  downloadTextFile(`${base}-preview.csv`, lines.join("\n"));
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

const inputCls = "w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary";
const selectCls = `${inputCls} appearance-none cursor-pointer`;
const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center" as const,
};

function Label({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-[12.5px] font-medium text-text-primary">
        {children}{required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-text-tertiary mt-0.5">{hint}</p>}
    </div>
  );
}

// Conversational section heading — replaces the old numbered-circle pattern,
// which the user found confusing. Each section now leads with a short
// accent-coloured eyebrow ("THE BASICS", "CALLING SCHEDULE"), a friendly
// title sentence, and an optional subtitle. The hairline border-b stitches
// sections together vertically inside a single card surface, so the page
// reads as one continuous form instead of a row of boxes glued together.
function Section({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="px-7 py-7 border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon size={12} strokeWidth={1.75} className="text-accent" />}
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px]">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-[16px] font-semibold text-text-primary leading-tight">{title}</h2>
      {subtitle && (
        <p className="text-[12.5px] text-text-secondary mt-1 leading-relaxed max-w-[560px]">
          {subtitle}
        </p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

// Field row used inside a Section — label + hint + input(s).
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5">
        <label className="text-[12.5px] font-medium text-text-primary">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
        {hint && <p className="text-[11px] text-text-tertiary mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

// Step 3 review row — inline label/value list with a hover-only Edit link.
// Replaces the old 4-up grid of summary tiles, which read as "boxes inside
// a box". This pattern feels more like a receipt: scannable top-to-bottom,
// no visual chrome competing with the values themselves.
function ReviewRow({
  icon: Icon,
  label,
  value,
  onEdit,
  multiline = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onEdit?: () => void;
  multiline?: boolean;
}) {
  const empty = !value || value === "—";
  return (
    <div className="group flex items-start gap-4 px-7 py-3.5 hover:bg-surface-page/40 transition-colors">
      <div className="flex items-center gap-2 w-[148px] shrink-0 pt-0.5">
        <Icon size={13} strokeWidth={1.5} className="text-text-tertiary" />
        <span className="text-[11.5px] font-medium text-text-secondary">{label}</span>
      </div>
      <div className={`flex-1 min-w-0 text-[13px] leading-relaxed ${
        empty ? "text-text-tertiary" : "text-text-primary"
      } ${multiline ? "" : "truncate"}`}>
        {empty ? "—" : value}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
        >
          <Pencil size={10} strokeWidth={2} />
          Edit
        </button>
      )}
    </div>
  );
}

// (Prompt→form inference for the Spot onboarding composer was removed when
// we collapsed to a manual-only onboarding flow. Users always start with a
// blank form now.)

// ── Voice agent picker ────────────────────────────────────────────────────
// Matches the SelectField popover used on /campaigns/create — same chrome
// (button trigger + chevron, popover panel, hover state, check mark on the
// selected row). Earlier this widget had Bot avatars and a "+ Create a new
// agent" footer; both got dropped to align with how every other dropdown
// in the product renders.
// Custom popover for selecting the parent project of this outreach.
// Same chrome as AgentPicker (chevron trigger, hairline panel, check
// on selected row) so the two pickers feel like one component.
// Projects render their short name + a meta line with category to
// disambiguate sibling launches.
function ProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: Array<{ id: string; name: string; category: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((p) => p.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full h-10 px-3 flex items-center justify-between text-left text-[13px] border border-border rounded-input bg-white transition-colors duration-150 focus:outline-none focus:border-accent ${
          selected ? "text-text-primary" : "text-text-tertiary"
        }`}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <FolderKanban size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
          <span className="truncate">{selected ? selected.name.split(" · ")[0] : "Pick a project…"}</span>
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={`text-text-tertiary shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-card shadow-lg z-40 max-h-[280px] overflow-y-auto py-1">
            {projects.length === 0 && (
              <div className="px-3 py-2 text-[13px] text-text-tertiary">No projects yet.</div>
            )}
            {projects.map((p) => {
              const isActive = p.id === value;
              const shortName = p.name.split(" · ")[0];
              const location  = p.name.split(" · ")[1] ?? p.category;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-accent/5" : "hover:bg-surface-page"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text-primary truncate">{shortName}</div>
                    <div className="text-[11px] text-text-tertiary truncate">{location}</div>
                  </div>
                  {isActive && (
                    <Check size={13} strokeWidth={2} className="text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Voice-agent picker. Mirrors ProjectPicker exactly so the two
// dropdowns sit next to each other on Step 1 reading as siblings —
// same height, same trigger layout (icon + label + chevron), same
// panel chrome. Each option carries a one-line "outbound bot"
// subtitle so the picker matches the way agents are referenced
// across the rest of the product (e.g. on the outreach listing
// rows: "Vox outbound bot").
function AgentPicker({
  agents,
  value,
  onChange,
}: {
  agents: Array<{ id: string; name: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = agents.find((a) => a.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full h-10 px-3 flex items-center justify-between text-left text-[13px] border border-border rounded-input bg-white transition-colors duration-150 focus:outline-none focus:border-accent ${
          selected ? "text-text-primary" : "text-text-tertiary"
        }`}
      >
        <span className="inline-flex items-center gap-2 truncate">
          <Bot size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
          <span className="truncate">{selected ? selected.name : "Pick an agent…"}</span>
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={`text-text-tertiary shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-card shadow-lg z-40 max-h-[280px] overflow-y-auto py-1">
            {agents.length === 0 && (
              <div className="px-3 py-2 text-[13px] text-text-tertiary">No agents yet.</div>
            )}
            {agents.map((a) => {
              const isActive = a.id === value;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive ? "bg-accent/5" : "hover:bg-surface-page"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text-primary truncate">{a.name}</div>
                    <div className="text-[11px] text-text-tertiary truncate">Outbound bot</div>
                  </div>
                  {isActive && (
                    <Check size={13} strokeWidth={2} className="text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CreateOutreachInner() {
  const router = useRouter();
  const { isEmpty, setMode } = useDemoMode();
  const [step, setStep] = useState<Step>(1);
  // `phase` controls what's rendered for the current step:
  //   "form"    → the step's form fields
  //   "created" → the success interstitial shown after Step 1 commits,
  //               asking the user whether to add an audience now or later.
  // Step 2 always renders the form; the interstitial only ever shows
  // when step === 2 && phase === "created".
  const [phase, setPhase] = useState<"form" | "created">("form");

  /* ── Step 1 ──────────────────────────────────────────────────────────── */
  // Every outreach belongs to a project. When the user arrives from a
  // project page we honour the `?project=<id>` query param and skip the
  // picker UI. Otherwise the picker is the first required field.
  const searchParams = useSearchParams();
  const presetProjectId = searchParams?.get("project") ?? "";
  const [projectId, setProjectId]     = useState(presetProjectId);
  useEffect(() => {
    if (presetProjectId) setProjectId(presetProjectId);
  }, [presetProjectId]);
  const [name, setName]               = useState("");
  const [agent, setAgent]             = useState("");

  // Agent hand-off from /agents/create. When the user clicks
  // "Save & use in outreach" there, the agent id is encoded in the
  // URL and the agent name is stashed in sessionStorage. We pluck
  // both, prepend a synthetic entry to the agent picker list, and
  // auto-select it so the user lands on Step 1 with the voice agent
  // already filled in.
  const presetAgentId = searchParams?.get("agent") ?? "";
  const [justCreatedAgent, setJustCreatedAgent] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!presetAgentId) return;
    setAgent(presetAgentId);
    try {
      const raw = sessionStorage.getItem("just_created_agent");
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.id === presetAgentId && data?.name) {
          setJustCreatedAgent(data);
        }
      }
    } catch { /* ignore */ }
  }, [presetAgentId]);
  // Merge the just-created agent (if any) onto the static list.
  const agentsForPicker = justCreatedAgent
    ? [justCreatedAgent, ...voiceAgents.filter((va) => va.id !== justCreatedAgent.id)]
    : voiceAgents;
  // Schedule moved per-file in Step 2 (each uploaded CSV owns its own
  // start time). The launch handler computes the outreach-level
  // startMode/startDate/startTime from the files at submit time.
  const [activeDays, setActiveDays]   = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  // Single calling-window applied to every active day. We dropped the
  // multiple-slots feature — no one asked for two non-contiguous windows,
  // and the extra UI muddled what was meant to be a simple "from–to"
  // question. Plain start/end state, no array gymnastics.
  const [callStart, setCallStart] = useState("09:00");
  const [callEnd, setCallEnd]     = useState("19:00");
  // Retries: default 10, allowed range 1–20. Stored as a string so the
  // user can type freely; we clamp on blur (see input below) so the
  // committed value is always inside [1, 20].
  const [maxRetries, setMaxRetries]       = useState("10");
  // Interval between retries — value + unit. Default 6 hours. Per-unit
  // bounds applied on blur: minutes 1–60, hours 1–24, days 1–30.
  type IntervalUnit = "min" | "hours" | "days";
  const [retryInterval, setRetryInterval]         = useState("6");
  const [retryIntervalUnit, setRetryIntervalUnit] = useState<IntervalUnit>("hours");

  /* ── Step 2 ──────────────────────────────────────────────────────────── */
  const [csvFiles, setCsvFiles]       = useState<CsvFile[]>([]);
  const [isDragging, setIsDragging]   = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  // Rejection reasons surfaced inline on the upload card. Cleared the
  // moment the user makes another upload attempt so the panel doesn't
  // accumulate stale messages from previous tries.
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  /* ── Step 3: Test before launch ──────────────────────────────────────── */
  const [testContacts, setTestContacts] = useState<ManualLead[]>([{ id: "t1", name: "", phone: "" }]);
  const [testState, setTestState]       = useState<"idle" | "sending" | "sent">("idle");
  // When should the test call go out? Default is "now" — most users
  // want immediate validation. The "Schedule for later" option mirrors
  // the per-file schedule pattern so test calls feel like a sibling
  // of the real dialing flow.
  const [testStartMode, setTestStartMode] = useState<"immediately" | "schedule">("immediately");
  const [testStartDate, setTestStartDate] = useState("");
  const [testStartTime, setTestStartTime] = useState("10:00");

  /* ── Derived ─────────────────────────────────────────────────────────── */
  // Only valid rows count — invalid ones get skipped at launch time and are
  // shown separately so the user knows what was dropped and why.
  const totalContacts    = csvFiles.reduce((s, f) => s + f.validRows, 0);
  const totalRowsScanned = csvFiles.reduce((s, f) => s + f.totalRows, 0);
  const totalSkipped     = totalRowsScanned - totalContacts;
  const selectedAgent    = agentsForPicker.find(va => va.id === agent);
  const selectedProject  = projectsList.find(p => p.id === projectId);

  const toggleDay = (day: string) =>
    setActiveDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day]);

  // Human-readable summary of the calling-window — used in the Step 3
  // review block. Same calling window applies to every active day.
  const slotsSummary = `${callStart}–${callEnd}`;

  // Bounds for the retry-interval input depend on the unit. Used both
  // by the input's min/max attributes (UI feedback) and by the on-blur
  // clamp (committed value).
  const intervalBounds = (() => {
    if (retryIntervalUnit === "min")  return { min: 1, max: 60 };
    if (retryIntervalUnit === "days") return { min: 1, max: 30 };
    return { min: 1, max: 24 }; // hours
  })();
  const intervalUnitLabel = (() => {
    const n = parseInt(retryInterval || "0", 10);
    if (retryIntervalUnit === "min")  return n === 1 ? "minute" : "minutes";
    if (retryIntervalUnit === "days") return n === 1 ? "day" : "days";
    return n === 1 ? "hour" : "hours";
  })();

  // Two-phase CSV ingest:
  //
  //   Phase 1 (synchronous) — read each file, parse it, decide whether
  //   it passes the hard caps (file count, row count). Rejected files
  //   surface in red. Accepted files get a placeholder row pushed into
  //   state with status: "uploading" and progress: 0 so the user sees
  //   them appear instantly.
  //
  //   Phase 2 (animated) — for each accepted file, tick progress up to
  //   100% over ~1.5 seconds, then flip status to "ready" and merge in
  //   the parsed row counts + validation breakdown. The parse already
  //   happened in phase 1, so the simulated "upload" is purely visual
  //   — but it gives the UI room to communicate "we're working on it"
  //   and exercises the progress + ready states that a real backend
  //   would drive over a slow network.
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const errors: string[] = [];
    const remainingSlots = Math.max(0, MAX_FILES_PER_UPLOAD - csvFiles.length);
    const incoming = Array.from(files);
    const accepted = incoming.slice(0, remainingSlots);
    const overflow = incoming.slice(remainingSlots);

    const placeholders: CsvFile[] = [];
    const jobs: Array<{ id: string; parsed: ParsedCsv }> = [];

    // Default each new file's schedule from the *last* file the user
    // already configured. Most audiences are uploaded as one batch on
    // one schedule, so inheriting saves a click. The user can still
    // override per file via the row's footer toggle.
    const lastFile = csvFiles[csvFiles.length - 1];
    const inheritedStartMode = lastFile?.startMode ?? "immediately";
    const inheritedStartDate = lastFile?.startDate ?? "";
    const inheritedStartTime = lastFile?.startTime ?? "10:00";

    for (const file of accepted) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        errors.push(`${file.name} isn't a .csv — only CSV files are supported.`);
        continue;
      }
      const text = await file.text();
      const parsed = parseAndValidateCsv(text);
      if (parsed.totalRows > MAX_ROWS_PER_FILE) {
        errors.push(
          `${file.name} has ${parsed.totalRows.toLocaleString()} rows. Files can hold up to ${MAX_ROWS_PER_FILE.toLocaleString()} rows — split it into smaller files and try again.`
        );
        continue;
      }
      const id = `f${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      placeholders.push({
        id,
        name: file.name,
        status: "uploading",
        progress: 0,
        // Parsed counts are filled in once the upload animation finishes;
        // the row UI shows "Uploading…" until then.
        totalRows: 0,
        validRows: 0,
        invalid: { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 },
        previewHeaders: [],
        previewRows: [],
        allRows: [],
        startMode: inheritedStartMode,
        startDate: inheritedStartDate,
        startTime: inheritedStartTime,
      });
      jobs.push({ id, parsed });
    }

    if (overflow.length > 0) {
      errors.push(
        `Only ${MAX_FILES_PER_UPLOAD} files per audience. ${overflow.length} file${overflow.length === 1 ? " was" : "s were"} skipped — remove one before adding more.`
      );
    }

    setUploadErrors(errors);
    if (placeholders.length === 0) return;
    setCsvFiles(p => [...p, ...placeholders]);

    // Animate progress per file. Slight stagger between files so a multi-
    // file drop reads as a queue rather than a synchronized march.
    const TICKS = [15, 40, 70, 95];
    const TICK_MS = 320;
    jobs.forEach((job, fileIdx) => {
      const stagger = fileIdx * 180;
      TICKS.forEach((pct, t) => {
        setTimeout(() => {
          setCsvFiles(p => p.map(f => f.id === job.id ? { ...f, progress: pct } : f));
        }, stagger + (t + 1) * TICK_MS);
      });
      setTimeout(() => {
        setCsvFiles(p => p.map(f =>
          f.id === job.id
            ? { ...f, ...job.parsed, status: "ready", progress: 100 }
            : f
        ));
      }, stagger + (TICKS.length + 1) * TICK_MS);
    });
  };

  // Update a single file's per-file schedule. Used by the per-row
  // "Start now / Schedule" toggle and the date/time inputs.
  const updateFileSchedule = (id: string, patch: Partial<Pick<CsvFile, "startMode" | "startDate" | "startTime">>) =>
    setCsvFiles(p => p.map(f => f.id === id ? { ...f, ...patch } : f));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeCsv = (idx: number) =>
    setCsvFiles(p => p.filter((_, i) => i !== idx));

  const updateTestContact = (id: string, field: keyof ManualLead, value: string) =>
    setTestContacts(p => p.map(c => c.id === id ? { ...c, [field]: value } : c));

  const addTestContact = () => {
    if (testContacts.length >= 3) return;
    setTestContacts(p => [...p, { id: `t${Date.now()}`, name: "", phone: "" }]);
  };

  const removeTestContact = (id: string) =>
    setTestContacts(p => p.length > 1 ? p.filter(c => c.id !== id) : p);

  const validTestContacts = testContacts.filter(c => c.phone.trim());

  const sendTestCalls = () => {
    if (validTestContacts.length === 0) return;
    setTestState("sending");
    setTimeout(() => setTestState("sent"), 1600);
  };

  // Block launch while any file is still uploading — partial launches
  // would surprise the user ("I dropped two files but only one is live?").
  const anyUploading = csvFiles.some(f => f.status === "uploading");
  const canAdvance = () => {
    // Project removed from Step 1 — outreach create no longer
    // requires a manual project pick. The deep-link param still
    // carries one through if present, but it's not a gating field.
    if (step === 1) return name.trim() !== "" && agent !== "";
    if (step === 2) return totalContacts > 0 && !anyUploading;
    return true;
  };

  /* ════════════════════════════════════════════════════════════════════ */

  return (
    <div className="pb-8">

      {/* Breadcrumb — matches /campaigns/create header chrome. The H1
          "Create Outreach" was dropped to mirror campaigns: the step
          indicator + each step's section heading carry the context, so
          a separate page title is redundant chrome. */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.push("/outreach")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Lead Generation › Outreach › Create</span>
      </div>

      {/* Step indicator — same shape as campaigns/create. Each step is an
          icon circle with the label below; completed steps show a Check
          and a filled accent connector to the next one. Centered on the
          page rather than stretched edge-to-edge, which reads as a more
          intentional progress strip and stops the labels from drifting
          far from their dots. */}
      <div className="flex items-center justify-center mb-10">
        <div className="flex items-center gap-0">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isComplete = step > s.id;
            const isCurrent  = step === s.id;
            const isReachable = s.id <= step;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (!isReachable) return;
                    setStep(s.id);
                    // Stepping back resets the interstitial — phase only
                    // affects Step 2's render, so this is safe to always
                    // reset to "form" when the user jumps to another step.
                    if (s.id !== step) setPhase("form");
                  }}
                  disabled={!isReachable}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isComplete
                        ? "bg-status-success text-white"
                        : isCurrent
                          ? "bg-accent text-white ring-4 ring-accent/10"
                          : "bg-surface-secondary text-text-tertiary"
                    } ${isReachable ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    {isComplete ? (
                      <Check size={14} strokeWidth={2.5} />
                    ) : (
                      <Icon size={14} strokeWidth={1.5} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium transition-colors duration-150 whitespace-nowrap ${
                      isCurrent
                        ? "text-text-primary"
                        : isComplete
                          ? "text-text-secondary"
                          : "text-text-tertiary"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-10 h-[2px] mx-1 mt-[-18px] transition-colors duration-200 ${
                      isComplete ? "bg-status-success" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content lives in a centered 860px column — same width as
          /campaigns/create so the two flows feel like siblings. Earlier we
          used 1200px to "fill space"; matching campaigns is more important
          than horizontal density. */}
      <div className="mx-auto max-w-[860px]">
        <div>
          <AnimatePresence mode="wait">

            {/* ══ STEP 1: Setup ═════════════════════════════════════════
                Single white canvas with hairline-divided sections — replaces
                the previous two-card grid with numbered circles. The eyebrow
                + title pattern in each Section reads as conversational
                progress without explicit numbering, and the whole form
                breathes more because we're no longer fitting two parallel
                stacks side-by-side. */}
            {step === 1 && (
              <motion.div key="step1" initial="hidden" animate="show" exit="exit" variants={fadeSlide} className="space-y-6">
                {/* Step header — same pattern as /campaigns/create: bold
                    step title + secondary subtitle, then the section card.
                    Anchors the page and tells the user what this step is
                    for before they hit the form fields. */}
                <div>
                  <h2 className="text-[20px] font-semibold text-text-primary">Create outreach</h2>
                  <p className="text-meta text-text-secondary mt-1">Name it, pick a voice, set retry behaviour, and tell us which days &amp; hours the agent can call. The audience comes next.</p>
                </div>

                <div className="bg-white border border-border rounded-card overflow-hidden">

                  {/* The basics — name, project, agent (in that order).
                      Name first because it's the user's own input — the
                      identifier they're crafting. Project second because
                      it scopes the outreach into a workspace, and Voice
                      agent third because it's the most "configuration"
                      of the three. When the user lands here via Create
                      outreach from a project, the ?project=<id> query
                      param locks the project chip — visible but not
                      editable from this flow. */}
                  <Section
                    eyebrow="The basics"
                    title="What are we calling about?"
                    subtitle="Give your outreach a name, then pick the voice that'll be on the line."
                    icon={Sparkles}
                  >
                    <div className="grid grid-cols-1 gap-y-4">
                      <Field label="Outreach name" required>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="e.g. Godrej Reflections — Q2 follow-up"
                          className={inputCls}
                        />
                      </Field>

                      {/* Project picker removed at the user's request —
                          outreach create no longer requires linking to a
                          project. The data layer still carries the
                          presetProjectId from a ?project=<id> deep-link
                          (so coming from a project page still attaches
                          the outreach), but there's no manual picker. */}
                      <Field label="Voice agent" required hint="The voice that'll dial the leads.">
                        <AgentPicker
                          agents={agentsForPicker}
                          value={agent}
                          onChange={setAgent}
                        />
                      </Field>
                    </div>

                    {/* MAX CHURN — simplified to a single inline sentence:
                        retry count + interval between attempts. No status
                        chips; the rule applies uniformly to any retryable
                        call outcome. Reads naturally: "Retry up to 10
                        times with an interval of 6 hours between calls." */}
                    <div className="mt-6 pt-5 border-t border-border-subtle">
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-[12.5px] font-medium text-text-primary">Max churn</label>
                        {/* Info icon is a direct link to the docs — no
                            inline tooltip body. Users who want a quick
                            definition can find it in the docs; keeping
                            this icon to a single action (open docs) means
                            no hover-vs-click ambiguity. */}
                        <a
                          href="https://docs.revspot.ai/outreach/churn"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-text-tertiary hover:text-text-secondary transition-colors"
                          aria-label="Read churn documentation"
                          title="Read churn documentation"
                        >
                          <Info size={12} strokeWidth={1.5} />
                        </a>
                      </div>
                      <p className="text-[11.5px] text-text-tertiary mb-4">
                        Pick how many times to retry, and how long to wait between attempts.
                      </p>

                      {/* Single inline sentence — two numeric inputs flowing
                          naturally inside the prose. */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-2">
                        <span className="text-[13px] text-text-secondary shrink-0">
                          Retry up to
                        </span>
                        <input
                          type="number"
                          value={maxRetries}
                          onChange={e => setMaxRetries(e.target.value)}
                          onBlur={e => {
                            const n = parseInt(e.target.value, 10);
                            if (Number.isNaN(n) || n < 1) setMaxRetries("1");
                            else if (n > 20)              setMaxRetries("20");
                            else                          setMaxRetries(String(n));
                          }}
                          min={1}
                          max={20}
                          className="h-8 w-12 px-1.5 text-[13px] tabular-nums text-center border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        <span className="text-[13px] text-text-secondary shrink-0">
                          time{maxRetries === "1" ? "" : "s"} with an interval of
                        </span>
                        <input
                          type="number"
                          value={retryInterval}
                          onChange={e => setRetryInterval(e.target.value)}
                          onBlur={e => {
                            const n = parseInt(e.target.value, 10);
                            const { min, max } = intervalBounds;
                            if (Number.isNaN(n) || n < min) setRetryInterval(String(min));
                            else if (n > max)              setRetryInterval(String(max));
                            else                           setRetryInterval(String(n));
                          }}
                          min={intervalBounds.min}
                          max={intervalBounds.max}
                          className="h-8 w-12 px-1.5 text-[13px] tabular-nums text-center border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                        />
                        {/* Unit selector — compact native select sized to
                            match the number input alongside it. Keeps the
                            sentence reading naturally instead of having
                            two oversized controls compete for attention. */}
                        <select
                          value={retryIntervalUnit}
                          onChange={e => {
                            const next = e.target.value as IntervalUnit;
                            const newBounds =
                              next === "min"  ? { min: 1, max: 60 }
                              : next === "days" ? { min: 1, max: 30 }
                              : { min: 1, max: 24 };
                            const n = parseInt(retryInterval || "0", 10);
                            if (!Number.isNaN(n)) {
                              if (n < newBounds.min) setRetryInterval(String(newBounds.min));
                              else if (n > newBounds.max) setRetryInterval(String(newBounds.max));
                            }
                            setRetryIntervalUnit(next);
                          }}
                          className="h-8 pl-2 pr-6 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="min">minute{retryInterval === "1" ? "" : "s"}</option>
                          <option value="hours">hour{retryInterval === "1" ? "" : "s"}</option>
                          <option value="days">day{retryInterval === "1" ? "" : "s"}</option>
                        </select>
                        <span className="text-[13px] text-text-secondary shrink-0">
                          between calls.
                        </span>
                      </div>
                    </div>
                  </Section>

                  {/* ── Recurring schedule (outreach-level) ─────────────
                      Lives on the outreach because it's a property of
                      *how* the agent operates, not what list it's
                      dialing. Each audience inherits these days + hours.
                      Only the "start now vs schedule for later" choice
                      sits on the audience, since that's the one piece
                      that varies batch-to-batch. */}
                  <Section
                    eyebrow="Calling schedule"
                    title="Which days and hours can the agent call?"
                    subtitle="Applies to every audience you add to this outreach. You can adjust it later if your hours change."
                    icon={Clock}
                  >
                    <Field label="Active days">
                      <div className="flex items-center gap-1.5">
                        {DAYS.map(day => {
                          const isOn = activeDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              title={day}
                              aria-pressed={isOn}
                              className={`w-9 h-9 text-[11px] font-bold rounded-[8px] transition-all ${
                                isOn
                                  ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                                  : "bg-white border border-border text-text-tertiary hover:border-text-tertiary hover:text-text-secondary"
                              }`}
                            >
                              {day[0]}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-text-tertiary mt-2">
                        {activeDays.length === 0
                          ? "No days selected — pick at least one."
                          : `Calling on ${activeDays.join(", ")}.`}
                      </p>
                    </Field>

                    <Field label="Calling hours">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={callStart}
                          onChange={e => setCallStart(e.target.value)}
                          className="h-9 px-2.5 text-[12.5px] border border-border rounded-input"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="time"
                          value={callEnd}
                          onChange={e => setCallEnd(e.target.value)}
                          className="h-9 px-2.5 text-[12.5px] border border-border rounded-input"
                        />
                      </div>
                    </Field>
                  </Section>

                </div>
              </motion.div>
            )}

            {/* ══ STEP 2: Audience ══════════════════════════════════════
                Upload-first design. The hero dropzone is the primary action.
                Below it, each uploaded file gets its own row showing valid /
                skipped counts, a thin success/failure bar, and a "Download
                preview" action that lets the user spot-check a sampled CSV
                without us trying to render large tables in-browser. */}
            {step === 2 && phase === "form" && (
              <motion.div key="step2" initial="hidden" animate="show" exit="exit" variants={fadeSlide} className="space-y-6">
                {/* Step header — bold step title + subtitle, same chrome as
                    /campaigns/create. The schedule lives here (not on Step 1)
                    because it belongs to *this* audience, not the outreach
                    itself — an outreach can have multiple audiences each on
                    its own schedule. */}
                <div>
                  <h2 className="text-[20px] font-semibold text-text-primary">Add audience</h2>
                  <p className="text-meta text-text-secondary mt-1">Upload the leads and choose whether to start now or queue for later. Test calls are optional.</p>
                </div>

                {/* Hidden native file picker — driven by the hero CTA and by
                    "Add more files" once at least one file is uploaded. */}
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

                {/* HERO UPLOAD — split design. The dashed-rectangle look
                    only appears when actively dragging; idle state is a
                    clean white card with soft radial accents in the
                    corners so it doesn't read as a giant empty box. The
                    hero half holds the single primary action ("Choose
                    CSV files"); the bottom strip carries the format
                    requirements and the sample-CSV link, both clearly
                    subordinate. */}
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
                  {/* HERO HALF — neutral surface. Decorative gradients
                      were removed to keep the screen calm; the only
                      colour cue is the primary CTA button below. */}
                  <div className="relative">
                    <div className="relative px-8 pt-10 pb-8 text-center">
                      {/* Icon in a neutral surface circle — focal element
                          without leaning on the accent palette. */}
                      <div className="relative inline-flex mb-4">
                        <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-full transition-colors ${
                          isDragging
                            ? "bg-text-primary text-white shadow-md"
                            : "bg-surface-page border border-border text-text-secondary"
                        }`}>
                          <Upload size={22} strokeWidth={1.75} />
                        </div>
                      </div>

                      <h2 className="text-[18px] font-semibold text-text-primary leading-tight mb-1.5">
                        {isDragging ? "Drop your files to upload" : "Upload your leads"}
                      </h2>
                      <p className="text-[13px] text-text-secondary leading-relaxed max-w-[400px] mx-auto">
                        Drag CSVs anywhere on this card, or click below to choose.
                      </p>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="inline-flex items-center gap-2 h-11 px-6 mt-5 bg-accent text-white text-[13.5px] font-medium rounded-button hover:bg-accent-hover transition-colors shadow-sm"
                      >
                        <Upload size={15} strokeWidth={2} />
                        Choose CSV files
                      </button>
                    </div>
                  </div>

                  {/* BOTTOM STRIP — clearly secondary. Format requirements
                      as inline dot-separated chips on the left, sample
                      download as a small text link on the right. Visually
                      separated from the hero by a hairline + a lighter
                      surface so it doesn't compete for attention. */}
                  <div className="relative border-t border-border-subtle bg-surface-page/70 px-6 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-tertiary">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                        Name + Phone columns required
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                        Up to {MAX_FILES_PER_UPLOAD} files
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                        {MAX_ROWS_PER_FILE.toLocaleString()} rows max per file
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-text-tertiary" />
                        .csv only
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); downloadTextFile("leads-sample.csv", generateSampleCsv()); }}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-text-secondary hover:text-accent transition-colors"
                    >
                      <Download size={11} strokeWidth={1.75} />
                      Download sample CSV
                    </button>
                  </div>
                </div>

                {/* UPLOAD ERRORS — rendered in red, one row per
                    rejection (oversize file, too many files, wrong
                    type). Stays visible until the user tries another
                    upload; we don't auto-clear on time because the user
                    needs to see *why* a file didn't show up in the
                    list below. Dismiss button clears the panel. */}
                {uploadErrors.length > 0 && (
                  <div className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-card p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={16}
                        strokeWidth={1.75}
                        className="shrink-0 text-[#DC2626] mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold text-[#B91C1C] mb-1">
                          {uploadErrors.length === 1
                            ? "Couldn't add that file"
                            : `Couldn't add ${uploadErrors.length} files`}
                        </div>
                        <ul className="space-y-1">
                          {uploadErrors.map((msg, i) => (
                            <li
                              key={i}
                              className="text-[12px] text-[#B91C1C] leading-relaxed"
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

                {/* UPLOADED FILES — one row per file, showing valid /
                    skipped counts, a thin success/failure bar, and a
                    Preview download action. No in-browser table; the
                    user downloads a sample CSV to inspect rows. */}
                {csvFiles.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-3 text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                      Uploaded files · {csvFiles.length}
                    </div>
                    {/* "Add more files" link was here — removed because
                        the user can already add more via the hero
                        upload card above. The header strip now just
                        labels the section without competing CTAs. */}

                    <div className="space-y-2">
                      {csvFiles.map((file, idx) => {
                        const invalidTotal = Object.values(file.invalid).reduce((a, b) => a + b, 0);
                        const hasErrors = invalidTotal > 0;
                        const allClean = invalidTotal === 0 && file.totalRows > 0;
                        const isUploading = file.status === "uploading";
                        // Natural-language reason breakdown — only mention
                        // the categories that actually occurred.
                        const reasonPhrases: string[] = [];
                        if (file.invalid.missingPhone   > 0) reasonPhrases.push(`${file.invalid.missingPhone} missing phone`);
                        if (file.invalid.invalidFormat  > 0) reasonPhrases.push(`${file.invalid.invalidFormat} invalid phone`);
                        if (file.invalid.duplicatePhone > 0) reasonPhrases.push(`${file.invalid.duplicatePhone} duplicate`);
                        if (file.invalid.missingName    > 0) reasonPhrases.push(`${file.invalid.missingName} missing name`);

                        // Icon tile colour reflects upload state so the
                        // user can scan a column of files for status:
                        //   • Uploading → neutral surface + Loader2
                        //   • Ready clean → green
                        //   • Ready with skipped rows → amber
                        const iconCls = isUploading
                          ? "bg-surface-page border border-border text-text-secondary"
                          : hasErrors
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#F0FDF4] text-[#15803D]";

                        return (
                          <div
                            key={file.id}
                            className="bg-white border border-border rounded-card overflow-hidden hover:border-text-tertiary transition-colors"
                          >
                            {/* Top strip — icon + filename + prose + actions */}
                            <div className="px-4 py-3.5 flex items-start gap-4">
                              <div className={`shrink-0 w-10 h-10 rounded-[8px] flex items-center justify-center ${iconCls}`}>
                                {isUploading
                                  ? <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
                                  : <FileSpreadsheet size={18} strokeWidth={1.5} />
                                }
                              </div>

                              {/* Filename + status pill + prose */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <div className="text-[13px] text-text-primary truncate" title={file.name}>
                                    {file.name}
                                  </div>
                                  {/* Status pill — explicit textual status next
                                      to the filename so the user reads the row
                                      state at a glance, not just from the icon
                                      colour. Mirrors the tinted-badge pattern
                                      used elsewhere in the product. */}
                                  {isUploading ? (
                                    <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
                                      Uploading
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                                      Uploaded
                                    </span>
                                  )}
                                  {!isUploading && (
                                    <span className="text-[10.5px] text-text-tertiary tabular-nums shrink-0">
                                      {file.totalRows.toLocaleString()} rows
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12.5px] text-text-secondary leading-relaxed">
                                  {isUploading ? (
                                    <span className="text-text-tertiary">Reading rows and validating phone numbers…</span>
                                  ) : allClean ? (
                                    <>
                                      All <span className="text-[#15803D]">{file.validRows.toLocaleString()}</span> rows look good — ready to dial.
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

                              {/* Per-file actions — Download CSV is hidden
                                  while uploading because there's no parsed
                                  content to download yet. Remove stays
                                  available throughout so the user can
                                  cancel an in-progress upload. */}
                              <div className="shrink-0 flex items-center gap-1">
                                {!isUploading && (
                                  <button
                                    type="button"
                                    onClick={() => downloadFilePreview(file)}
                                    title="Download validated CSV"
                                    className="inline-flex items-center gap-1.5 h-8 px-3 text-[11.5px] text-text-secondary hover:text-accent hover:bg-surface-page rounded-button transition-colors"
                                  >
                                    <Download size={12} strokeWidth={1.75} />
                                    Download CSV
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeCsv(idx)}
                                  className="inline-flex items-center justify-center w-8 h-8 text-text-tertiary hover:text-[#DC2626] hover:bg-surface-page rounded-button transition-colors"
                                  title={isUploading ? "Cancel upload" : "Remove file"}
                                  aria-label={`Remove ${file.name}`}
                                >
                                  <X size={14} strokeWidth={1.75} />
                                </button>
                              </div>
                            </div>

                            {/* Footer band — depends on upload state:
                                  • Uploading: progress bar + percent
                                  • Ready:    per-file schedule (start now /
                                               schedule for future time) */}
                            {isUploading ? (
                              <div className="px-4 pb-3.5 pt-1">
                                <div className="flex items-center justify-between text-[10.5px] mb-1.5">
                                  <span className="text-text-secondary">Uploading…</span>
                                  <span className="tabular-nums text-text-secondary font-medium">{file.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface-page rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-300 ease-out"
                                    style={{
                                      width: `${file.progress}%`,
                                      backgroundColor: "rgba(15, 23, 42, 0.78)",
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="px-4 py-3 bg-surface-page/60 border-t border-border-subtle">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Clock size={11} strokeWidth={1.75} className="text-text-tertiary" />
                                  <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                                    Start dialing
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`startMode-${file.id}`}
                                      checked={file.startMode === "immediately"}
                                      onChange={() => updateFileSchedule(file.id, { startMode: "immediately" })}
                                      className="w-3.5 h-3.5 text-accent focus:ring-accent/20 cursor-pointer"
                                    />
                                    <span className="text-[12.5px] text-text-primary">Right after launch</span>
                                  </label>
                                  <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`startMode-${file.id}`}
                                      checked={file.startMode === "schedule"}
                                      onChange={() => updateFileSchedule(file.id, { startMode: "schedule" })}
                                      className="w-3.5 h-3.5 text-accent focus:ring-accent/20 cursor-pointer"
                                    />
                                    <span className="text-[12.5px] text-text-primary">Schedule for later</span>
                                  </label>
                                  {file.startMode === "schedule" && (
                                    <span className="inline-flex items-center gap-2">
                                      <input
                                        type="date"
                                        value={file.startDate}
                                        onChange={e => updateFileSchedule(file.id, { startDate: e.target.value })}
                                        className="h-8 px-2.5 text-[12px] border border-border rounded-input bg-white"
                                      />
                                      <input
                                        type="time"
                                        value={file.startTime}
                                        onChange={e => updateFileSchedule(file.id, { startTime: e.target.value })}
                                        className="w-[100px] h-8 px-2.5 text-[12px] border border-border rounded-input bg-white"
                                      />
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Aggregate readout — the bottom line. Two big numbers
                        side-by-side so the user instantly sees the calling
                        audience vs what got skipped, then a breakdown of
                        skip reasons when there are any. Anchors the page
                        before the user hits Next. */}
                    {(() => {
                      // Roll up skip reasons across all files so we can
                      // show a single inline breakdown rather than asking
                      // the user to read each file row.
                      const skipBreakdown = csvFiles.reduce(
                        (acc, f) => ({
                          missingPhone:   acc.missingPhone   + f.invalid.missingPhone,
                          invalidFormat:  acc.invalidFormat  + f.invalid.invalidFormat,
                          duplicatePhone: acc.duplicatePhone + f.invalid.duplicatePhone,
                          missingName:    acc.missingName    + f.invalid.missingName,
                        }),
                        { missingPhone: 0, invalidFormat: 0, duplicatePhone: 0, missingName: 0 }
                      );
                      const skipPhrases: string[] = [];
                      if (skipBreakdown.missingPhone   > 0) skipPhrases.push(`${skipBreakdown.missingPhone.toLocaleString()} missing phone`);
                      if (skipBreakdown.invalidFormat  > 0) skipPhrases.push(`${skipBreakdown.invalidFormat.toLocaleString()} invalid phone`);
                      if (skipBreakdown.duplicatePhone > 0) skipPhrases.push(`${skipBreakdown.duplicatePhone.toLocaleString()} duplicate`);
                      if (skipBreakdown.missingName    > 0) skipPhrases.push(`${skipBreakdown.missingName.toLocaleString()} missing name`);

                      return (
                        <div className="mt-5 bg-white border border-border rounded-card overflow-hidden">
                          <div className="grid grid-cols-2 divide-x divide-border-subtle">
                            {/* Will-be-dialled — primary, the headline */}
                            <div className="px-6 py-5">
                              <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-1.5">
                                <Phone size={11} strokeWidth={1.75} />
                                Will be dialled
                              </div>
                              <div className="flex items-baseline gap-2">
                                <div className="text-[32px] font-semibold text-text-primary leading-none tabular-nums">
                                  {totalContacts.toLocaleString()}
                                </div>
                                <div className="text-[12.5px] text-text-secondary">
                                  lead{totalContacts === 1 ? "" : "s"}
                                </div>
                              </div>
                              <div className="text-[11.5px] text-text-tertiary mt-1.5">
                                Across {csvFiles.length} file{csvFiles.length === 1 ? "" : "s"} · {totalRowsScanned.toLocaleString()} rows scanned
                              </div>
                            </div>

                            {/* Skipped — secondary, muted when zero so the
                                user doesn't feel scolded for a clean upload */}
                            <div className="px-6 py-5">
                              <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-1.5">
                                <Info size={11} strokeWidth={1.75} />
                                Skipped
                              </div>
                              <div className="flex items-baseline gap-2">
                                <div className={`text-[32px] font-semibold leading-none tabular-nums ${
                                  totalSkipped > 0 ? "text-[#92400E]" : "text-text-tertiary"
                                }`}>
                                  {totalSkipped.toLocaleString()}
                                </div>
                                <div className="text-[12.5px] text-text-secondary">
                                  lead{totalSkipped === 1 ? "" : "s"}
                                </div>
                              </div>
                              <div className="text-[11.5px] text-text-tertiary mt-1.5 truncate">
                                {totalSkipped === 0
                                  ? "Every row is dialable — nothing to drop."
                                  : skipPhrases.join(" · ")}
                              </div>
                            </div>
                          </div>

                          {/* Coverage bar — a thin visual ratio so the user
                              can feel the split, not just read it. Hidden
                              when there's nothing to compare against. */}
                          {totalRowsScanned > 0 && (
                            <div className="px-6 pb-4">
                              <div className="h-1.5 w-full bg-surface-page rounded-full overflow-hidden flex">
                                <div
                                  className="h-full bg-[#15803D]"
                                  style={{ width: `${(totalContacts / totalRowsScanned) * 100}%` }}
                                  aria-label={`${totalContacts} dialable`}
                                />
                                {totalSkipped > 0 && (
                                  <div
                                    className="h-full bg-[#FCD34D]"
                                    style={{ width: `${(totalSkipped / totalRowsScanned) * 100}%` }}
                                    aria-label={`${totalSkipped} skipped`}
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Hint shown only when no files yet — soft, encouraging. */}
                {csvFiles.length === 0 && (
                  <div className="mt-5 flex items-center gap-2.5 px-4 py-3 bg-surface-page border border-border-subtle rounded-card">
                    <Info size={13} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
                    <span className="text-[12px] text-text-tertiary">
                      Upload at least one CSV to continue. After uploading, use the per-file{" "}
                      <span className="font-medium text-text-secondary">Preview</span> download to spot-check what's about to be dialed.
                    </span>
                  </div>
                )}


                {/* ── Test panel (optional) ─────────────────────────────
                    Moved here from the old Step 3. Still optional — most
                    users skip it and test after launch, but anyone nervous
                    about their script can dry-run on a few of their own
                    numbers first. */}
                <div className="bg-white border border-border rounded-card overflow-hidden">
                  <div className="px-7 py-4 border-b border-border-subtle">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={15} strokeWidth={1.5} className="text-text-secondary" />
                      <h3 className="text-[14px] font-semibold text-text-primary">Try it first</h3>
                      <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.6px] px-2 py-0.5 rounded-badge bg-surface-page">
                        Optional
                      </span>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                      Send the pitch to up to 3 numbers so you can listen before going wide. You can skip this and test after launch too.
                    </p>
                  </div>

                  <div className="px-7 py-5">
                    {testState === "sent" ? (
                      <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-input">
                        <CheckCircle2 size={16} strokeWidth={1.5} className="text-green-600 shrink-0" />
                        <div className="flex-1">
                          <div className="text-[12.5px] font-semibold text-green-800">
                            Test call{validTestContacts.length !== 1 ? "s" : ""} sent to {validTestContacts.length} contact{validTestContacts.length !== 1 ? "s" : ""}
                          </div>
                          <div className="text-[11.5px] text-green-700 mt-0.5">
                            Recordings will land in your inbox when each call completes. Launch when you&apos;re happy with the result.
                          </div>
                        </div>
                        <button
                          onClick={() => setTestState("idle")}
                          className="shrink-0 text-[11.5px] font-medium text-green-700 hover:text-green-800 hover:underline"
                        >
                          Test again
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Test-call schedule — sits above the contact
                            rows so the user reads it as "when?" before
                            "who?". Mirrors the per-file schedule on
                            uploaded CSVs so the pattern feels familiar. */}
                        <div className="mb-4 pb-4 border-b border-border-subtle">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Clock size={11} strokeWidth={1.75} className="text-text-tertiary" />
                            <span className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
                              When should the test call go out?
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="testStartMode"
                                checked={testStartMode === "immediately"}
                                onChange={() => setTestStartMode("immediately")}
                                className="w-3.5 h-3.5 text-accent focus:ring-accent/20 cursor-pointer"
                              />
                              <span className="text-[12.5px] text-text-primary">Right after I send</span>
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="testStartMode"
                                checked={testStartMode === "schedule"}
                                onChange={() => setTestStartMode("schedule")}
                                className="w-3.5 h-3.5 text-accent focus:ring-accent/20 cursor-pointer"
                              />
                              <span className="text-[12.5px] text-text-primary">Schedule for later</span>
                            </label>
                            {testStartMode === "schedule" && (
                              <span className="inline-flex items-center gap-2">
                                <input
                                  type="date"
                                  value={testStartDate}
                                  onChange={e => setTestStartDate(e.target.value)}
                                  className="h-8 px-2.5 text-[12px] border border-border rounded-input bg-white"
                                />
                                <input
                                  type="time"
                                  value={testStartTime}
                                  onChange={e => setTestStartTime(e.target.value)}
                                  className="w-[100px] h-8 px-2.5 text-[12px] border border-border rounded-input bg-white"
                                />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {testContacts.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={c.name}
                                onChange={e => updateTestContact(c.id, "name", e.target.value)}
                                placeholder="Name (optional)"
                                className="flex-1 h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary"
                              />
                              <PhoneInput
                                value={c.phone}
                                onChange={(v) => updateTestContact(c.id, "phone", v)}
                                placeholder="98765 43210"
                                className="flex-1"
                              />
                              {testContacts.length > 1 ? (
                                <button
                                  onClick={() => removeTestContact(c.id)}
                                  title="Remove"
                                  className="h-9 w-9 inline-flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-page rounded-input transition-colors"
                                >
                                  <X size={14} strokeWidth={1.5} />
                                </button>
                              ) : (
                                <div className="h-9 w-9 shrink-0" aria-hidden />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <button
                            onClick={addTestContact}
                            disabled={testContacts.length >= 3}
                            className="inline-flex items-center gap-1 h-8 px-2 text-[12px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus size={13} strokeWidth={2} />
                            Add contact {testContacts.length >= 3 && "(max 3)"}
                          </button>
                          <button
                            onClick={sendTestCalls}
                            disabled={validTestContacts.length === 0 || testState === "sending"}
                            className="inline-flex items-center gap-1.5 h-9 px-4 text-[12.5px] font-medium border border-border bg-white text-text-primary rounded-button hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {testState === "sending" ? (
                              <><Loader2 size={13} strokeWidth={2} className="animate-spin" /> Sending…</>
                            ) : (
                              <>
                                <Phone size={13} strokeWidth={1.5} />
                                {testStartMode === "schedule"
                                  ? `Schedule test call${validTestContacts.length > 1 ? "s" : ""}`
                                  : `Send test call${validTestContacts.length > 1 ? "s" : ""}`}
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ INTERSTITIAL: Outreach created ═══════════════════════
                Sits between Step 1 (create outreach) and Step 2 (add
                audience). The outreach now exists as a real entity in
                the user's workspace; we name that explicitly so the
                "create" moment lands, then offer the natural next step
                (add audience) without making it feel mandatory. Picking
                "Later" saves the outreach with no audience and returns
                to the listing; the row will appear there with a "needs
                audience" affordance the user can resume from. */}
            {step === 2 && phase === "created" && (
              <motion.div
                key="interstitial"
                initial="hidden"
                animate="show"
                exit="exit"
                variants={fadeSlide}
                className="flex items-center justify-center"
              >
                <div className="w-full max-w-[560px] bg-white border border-border rounded-card overflow-hidden">
                  {/* Success header — green check sits in a soft tinted
                      circle so the moment feels earned without overdoing
                      it. Title names the outreach explicitly so the user
                      sees their own input echoed back. */}
                  <div className="px-8 pt-9 pb-5 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F0FDF4] text-[#15803D] mb-4">
                      <Check size={20} strokeWidth={2.25} />
                    </div>
                    <h2 className="text-[20px] font-semibold text-text-primary leading-tight mb-1.5">
                      Outreach created
                    </h2>
                    <p className="text-[13px] text-text-secondary leading-relaxed max-w-[420px] mx-auto">
                      <span className="font-medium text-text-primary">
                        {name.trim() || "Untitled outreach"}
                      </span>{" "}
                      is saved. Review the setup below, then add an audience to start calling.
                    </p>
                  </div>

                  {/* Summary card — compact recap of the basic fields
                      the user just configured. Reads as a receipt: each
                      row is a label + value pair, no chrome around it.
                      Helps the user verify they set things up correctly
                      before committing to adding an audience or
                      stashing for later. */}
                  <div className="mx-8 mb-6 rounded-[8px] bg-surface-page border border-border-subtle px-4 py-3 space-y-2.5 text-left">
                    {/* Project row removed — outreach create no longer
                        prompts for a project, so the review block
                        should not list one. If a project came in via
                        the deep-link param it's still attached at
                        save time; the review just doesn't surface it
                        as a primary identity field. */}
                    <div className="grid grid-cols-[110px_1fr] gap-3 items-center text-[12.5px]">
                      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
                        <Bot size={11} strokeWidth={1.75} />
                        Voice agent
                      </span>
                      <span className="text-text-primary font-medium truncate">
                        {selectedAgent?.name ?? "—"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] gap-3 items-center text-[12.5px]">
                      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
                        <Calendar size={11} strokeWidth={1.75} />
                        Calling days
                      </span>
                      <span className="text-text-primary font-medium truncate">
                        {activeDays.length === 7
                          ? "Every day"
                          : activeDays.length === 6 && !activeDays.includes("Sun")
                            ? "Mon – Sat"
                            : activeDays.length === 5 && !activeDays.includes("Sat") && !activeDays.includes("Sun")
                              ? "Mon – Fri"
                              : activeDays.join(", ")}
                      </span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] gap-3 items-center text-[12.5px]">
                      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
                        <Clock size={11} strokeWidth={1.75} />
                        Calling hours
                      </span>
                      <span className="text-text-primary font-medium tabular-nums">
                        {callStart} – {callEnd}
                      </span>
                    </div>
                    <div className="grid grid-cols-[110px_1fr] gap-3 items-center text-[12.5px]">
                      <span className="inline-flex items-center gap-1.5 text-text-tertiary">
                        <Phone size={11} strokeWidth={1.75} />
                        Max churn
                      </span>
                      <span className="text-text-primary font-medium tabular-nums">
                        {maxRetries} attempt{maxRetries === "1" ? "" : "s"}
                        <span className="text-text-tertiary font-normal ml-1.5">
                          · {retryInterval} {retryIntervalUnit === "min" ? `minute${retryInterval === "1" ? "" : "s"}` : retryIntervalUnit === "hours" ? `hour${retryInterval === "1" ? "" : "s"}` : `day${retryInterval === "1" ? "" : "s"}`} apart
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* CTAs — primary leads to the audience flow, secondary
                      stashes the outreach and returns to the listing. */}
                  <div className="px-8 pb-8 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setPhase("form")}
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-accent text-white text-[13.5px] font-medium rounded-button hover:bg-accent-hover transition-colors"
                    >
                      <Users size={15} strokeWidth={1.75} />
                      Add audience now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Save the outreach with no audience yet. The
                        // listing picks it up via sessionStorage and
                        // shows it as draft (status === "draft" with
                        // 0 contacts) — the user can return later and
                        // add an audience to start dialing.
                        const launched = {
                          id: `out-new-${Date.now()}`,
                          projectId,
                          name: name.trim() || "Untitled outreach",
                          voiceAgent: selectedAgent?.name ?? "—",
                          totalContacts: 0,
                          status: "draft" as const,
                          createdAt: new Date().toISOString().slice(0, 10),
                          needsAudience: true,
                        };
                        try {
                          sessionStorage.setItem("outreach_just_launched", JSON.stringify(launched));
                        } catch {
                          /* ignore */
                        }
                        if (isEmpty) setMode("populated");
                        // Onboarding: "I'll add audience later" still
                        // counts as the outreach step done — the user
                        // committed to an outreach existing. Routes
                        // them back to /welcome to see the celebration.
                        if (searchParams?.get("onboarding") === "1") {
                          try { sessionStorage.setItem("onboarding_outreach_done", "true"); } catch {}
                          router.push("/welcome");
                          return;
                        }
                        router.push("/outreach");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 h-10 text-[12.5px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      I&apos;ll add audience later
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nav buttons — hidden during the interstitial because the
              success card carries its own CTAs ("Add audience now" /
              "I'll add audience later"). Otherwise:
                Step 1 form:    (nothing on left) → "Create outreach"
                Step 2 form:    "Back"            → "Launch outreach"
              Save as Draft was dropped — the flow is short enough that
              "draft" wasn't carrying its weight (users either created
              the outreach or abandoned, almost no one came back to a
              half-finished draft) and the button sat in awkward
              isolation on step 1's left edge. */}
          {!(step === 2 && phase === "created") && (
            <div className="flex items-center justify-between mt-5">
              <div>
                {step === 2 && phase === "form" && (
                  <button
                    onClick={() => { setStep(1); setPhase("form"); }}
                    className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
                  >
                    <ArrowLeft size={14} strokeWidth={1.5} /> Back
                  </button>
                )}
              </div>
              {step === 1 ? (
                <button
                  onClick={() => {
                    // Commit the outreach — advance to step 2 in the
                    // "created" phase so the success interstitial shows.
                    // The actual persistence happens at launch / "later".
                    setStep(2);
                    setPhase("created");
                  }}
                  disabled={!canAdvance()}
                  className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Create outreach <ArrowRight size={15} strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Derive the listing-level schedule from the per-file
                    // schedules. Rules:
                    //   • All "immediately" → in_progress, no banner date.
                    //   • Any "schedule"    → scheduled. Use the earliest
                    //     scheduled date+time across the files for the
                    //     banner — that's the next dial moment the user
                    //     should anticipate.
                    const scheduled = csvFiles
                      .filter(f => f.status === "ready" && f.startMode === "schedule" && f.startDate)
                      .sort((a, b) => {
                        const ad = `${a.startDate}T${a.startTime || "00:00"}`;
                        const bd = `${b.startDate}T${b.startTime || "00:00"}`;
                        return ad.localeCompare(bd);
                      });
                    const anyScheduled = scheduled.length > 0;
                    const earliest = scheduled[0];
                    // Once audience is provided, the outreach is
                    // running — startDate/startTime still describe
                    // when dialing will actually kick off, but the
                    // status itself is "in_progress" rather than the
                    // separate "scheduled" state that used to exist.
                    // "draft" is reserved for the no-audience case
                    // (handled in the other branch of this submit).
                    const launched = {
                      id: `out-new-${Date.now()}`,
                      projectId,
                      name: name.trim() || "Untitled outreach",
                      voiceAgent: selectedAgent?.name ?? "—",
                      totalContacts,
                      status: "in_progress" as const,
                      createdAt: new Date().toISOString().slice(0, 10),
                      startMode: anyScheduled ? "schedule" as const : "immediately" as const,
                      startDate: earliest?.startDate ?? "",
                      startTime: earliest?.startTime ?? "",
                    };
                    try {
                      sessionStorage.setItem("outreach_just_launched", JSON.stringify(launched));
                    } catch {
                      /* ignore */
                    }
                    if (isEmpty) setMode("populated");
                    // Onboarding hand-off — same logic as the "later"
                    // path above. Mark step done, route to /welcome
                    // so the celebration band lands.
                    if (searchParams?.get("onboarding") === "1") {
                      try { sessionStorage.setItem("onboarding_outreach_done", "true"); } catch {}
                      router.push("/welcome");
                      return;
                    }
                    router.push("/outreach");
                  }}
                  disabled={!canAdvance()}
                  className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Rocket size={15} strokeWidth={1.5} /> Launch outreach
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function CreateOutreachPage() {
  return (
    <Suspense
      fallback={
        <div className="pb-8">
          <div className="h-8 mb-6" />
          <div className="h-10 w-48 bg-surface-page rounded mb-6 animate-pulse" />
          <div className="bg-white border border-border rounded-card h-[420px] animate-pulse" />
        </div>
      }
    >
      <CreateOutreachInner />
    </Suspense>
  );
}
