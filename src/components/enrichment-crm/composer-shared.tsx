"use client";

// Shared state hook for the enrichment composer (single-shape).
// Owns: tab (bulk/single), checkboxes (professional/financial),
// single-mode inputs, bulk-mode file + column map, derived flags.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, FileSpreadsheet, Download } from "lucide-react";
import {
  CREDITS_PER_LEAD,
  type EnrichmentType,
  type RequiredField,
  sampleCsvDataUrl,
  sampleCsvFilename,
  useEnrichmentCrmStore,
  type RunRecord,
  sampleProfile,
} from "@/lib/enrichment-crm-data";
import { autoBuildColumnMap, mappedFields, type ColumnMap } from "./mapping-table";
import { requiredFieldsMet } from "./spot";

export type Tab = "bulk" | "single";

const PREVIEW_ROWS = 6;

export function useComposerState(initialTab: Tab = "bulk") {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [types, setTypes] = useState<EnrichmentType[]>(["professional"]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isQueuing, setIsQueuing] = useState(false);

  // Single-mode inputs
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePhone, setSinglePhone] = useState("");
  const [singleLinkedin, setSingleLinkedin] = useState("");
  const [singleName, setSingleName] = useState("");

  // Bulk-mode file + headers + preview + column map
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});

  const [inlineResult, setInlineResult] = useState<RunRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const balance = useEnrichmentCrmStore((s) => s.balance);
  const addRun = useEnrichmentCrmStore((s) => s.addRun);

  const toggleType = useCallback((t: EnrichmentType) => {
    setTypes((cur) => {
      const has = cur.includes(t);
      // Block unticking the last remaining type, at least one must stay on.
      if (has && cur.length === 1) return cur;
      return has ? cur.filter((x) => x !== t) : [...cur, t];
    });
    setInlineResult(null);
  }, []);

  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");

  // ── Field availability ──────────────────────────────────────────
  const singleAvailable = useMemo(() => {
    const set = new Set<RequiredField>();
    if (singleEmail.trim()) set.add("email");
    if (singlePhone.trim()) set.add("phone");
    if (singleLinkedin.trim()) set.add("linkedin");
    if (singleName.trim()) set.add("name");
    return set;
  }, [singleEmail, singlePhone, singleLinkedin, singleName]);

  const bulkAvailable = useMemo(() => mappedFields(columnMap), [columnMap]);

  // ── Required-fields-met (drives submit-enabled) ─────────────────
  const singleReady = useMemo(
    () => requiredFieldsMet(types, singleAvailable),
    [types, singleAvailable],
  );
  const bulkReady = useMemo(
    () => !!file && requiredFieldsMet(types, bulkAvailable),
    [file, types, bulkAvailable],
  );

  // ── Cost ────────────────────────────────────────────────────────
  const perLead = useMemo(
    () => types.reduce((sum, t) => sum + CREDITS_PER_LEAD[t], 0),
    [types],
  );
  const singleCost = perLead;
  const bulkCost = useMemo(() => perLead * rowCount, [perLead, rowCount]);

  const insufficientForSingle = singleReady && singleCost > balance;
  const insufficientForBulk = bulkReady && bulkCost > balance;

  // ── File handling ───────────────────────────────────────────────
  const onFileChosen = useCallback(async (f: File) => {
    setFile(f);
    setInlineResult(null);
    try {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setHeaders([]);
        setPreview([]);
        setRowCount(0);
        setColumnMap({});
        return;
      }
      const heads = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const body = lines.slice(1, 1 + PREVIEW_ROWS).map((l) =>
        l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
      );
      setHeaders(heads);
      setPreview(body);
      setRowCount(Math.max(0, lines.length - 1));
      setColumnMap(autoBuildColumnMap(heads));
    } catch {
      const estRows = Math.max(1, Math.floor(f.size / 120));
      setHeaders([]);
      setPreview([]);
      setRowCount(estRows);
      setColumnMap({});
    }
  }, []);

  const resetBulk = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setRowCount(0);
    setColumnMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const resetSingle = useCallback(() => {
    setSingleEmail(""); setSinglePhone(""); setSingleLinkedin(""); setSingleName("");
  }, []);

  // Clear stale single inputs when their owning checkbox is turned off
  useEffect(() => {
    if (!hasFin) setSingleName("");
    if (!hasPro) {
      setSingleEmail("");
      setSingleLinkedin("");
    }
  }, [hasFin, hasPro]);

  // ── Submit ──────────────────────────────────────────────────────
  // Single: fake a ~1.8s enrichment so the UI feels real (network + processing).
  const submitSingle = useCallback(() => {
    if (!singleReady || insufficientForSingle || isEnriching) return;
    setIsEnriching(true);
    setInlineResult(null);
    const startedAt = new Date().toISOString();
    window.setTimeout(() => {
      // ~15% no-match rate keeps the demo honest and shows the failed state in normal use.
      // Test triggers: phone "0000000000" or email containing "fail" always misses.
      const forceFail =
        singlePhone.replace(/\D/g, "") === "0000000000" ||
        /fail/i.test(singleEmail);
      const miss = forceFail || Math.random() < 0.15;
      // Pull from any existing enriched run first (so demo state evolves),
      // fall back to the canonical sampleProfile so financial-only / professional-only
      // submissions still surface the requested blocks.
      const baseProfile = useEnrichmentCrmStore.getState().runs.find((r) => r.profile)?.profile || sampleProfile;
      const resultProfile = miss
        ? undefined
        : {
            ...baseProfile,
            // Only include blocks the user actually paid for.
            professional: hasPro ? baseProfile.professional : undefined,
            financial: hasFin ? baseProfile.financial : undefined,
            // Always carry the typed input so the card has a header even when pro is off.
            // Fall back to enriched contact from the base sample so we surface the
            // discovered email + phone, not just the one the user typed.
            contact: {
              name: singleName || baseProfile.contact?.name,
              email: singleEmail || baseProfile.contact?.email,
              phone: singlePhone || baseProfile.contact?.phone,
              linkedin: singleLinkedin || baseProfile.contact?.linkedin,
            },
          };
      const run: RunRecord = {
        id: `run-${Date.now()}`,
        source: "single",
        inputValue: singleEmail || singlePhone || singleLinkedin || singleName,
        types,
        status: miss ? "failed" : "done",
        leadsTotal: 1,
        leadsSuccess: miss ? 0 : 1,
        leadsFailed: miss ? 1 : 0,
        leadsSkipped: 0,
        creditsBlocked: singleCost,
        creditsCharged: miss ? 0 : singleCost,
        creditsRefunded: miss ? singleCost : 0,
        startedAt,
        finishedAt: new Date().toISOString(),
        profile: resultProfile,
      };
      addRun(run);
      setInlineResult(run);
      setIsEnriching(false);
    }, 1800);
  }, [singleReady, insufficientForSingle, isEnriching, singleEmail, singlePhone, singleLinkedin, singleName, types, singleCost, addRun, hasPro, hasFin]);

  // Bulk: short queuing delay so it feels like an upload, then drop into history with 0% progress
  // (the page-level ticker walks it up to 100%).
  const submitBulk = useCallback(() => {
    if (!file || !bulkReady || insufficientForBulk || isQueuing) return;
    setIsQueuing(true);
    const captured = { file, types: [...types], rowCount, bulkCost };
    window.setTimeout(() => {
      const run: RunRecord = {
        id: `run-${Date.now()}`,
        source: "bulk",
        filename: captured.file.name,
        types: captured.types,
        status: "in_progress",
        progressPct: 0,
        leadsTotal: captured.rowCount,
        leadsSuccess: 0,
        leadsFailed: 0,
        leadsSkipped: 0,
        creditsBlocked: captured.bulkCost,
        creditsCharged: 0,
        creditsRefunded: 0,
        startedAt: new Date().toISOString(),
      };
      addRun(run);
      resetBulk();
      setIsQueuing(false);
      window.dispatchEvent(
        new CustomEvent("enrichment-crm:toast", {
          detail: {
            kind: "bulk_started",
            title: `Enriching ${captured.rowCount.toLocaleString("en-IN")} leads`,
            description: `${captured.file.name} · ${captured.bulkCost.toLocaleString("en-IN")} credits reserved. We'll email you when it's done.`,
            runId: run.id,
          },
        }),
      );
    }, 900);
  }, [file, bulkReady, insufficientForBulk, isQueuing, types, rowCount, bulkCost, addRun, resetBulk]);

  return {
    tab, setTab,
    types, toggleType, hasPro, hasFin,

    // single
    singleEmail, setSingleEmail,
    singlePhone, setSinglePhone,
    singleLinkedin, setSingleLinkedin,
    singleName, setSingleName,
    singleAvailable, singleReady,
    singleCost, insufficientForSingle,
    submitSingle, resetSingle,
    inlineResult, setInlineResult,
    isEnriching, isQueuing,

    // bulk
    file, headers, preview, rowCount, columnMap, setColumnMap, fileInputRef,
    bulkAvailable, bulkReady,
    bulkCost, insufficientForBulk, perLead,
    onFileChosen, resetBulk, submitBulk,

    // shared
    balance,
    sampleHref: sampleCsvDataUrl(types),
    sampleName: sampleCsvFilename(types),
  };
}

export type ComposerState = ReturnType<typeof useComposerState>;

// ── Sub-components ──────────────────────────────────────────────

export function TabSwitcher({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  // Prominent segmented pill, bigger surface, stronger active contrast, icon hint.
  return (
    <div className="inline-flex items-center bg-surface-page border border-border rounded-[10px] p-1">
      {(["bulk", "single"] as Tab[]).map((t) => {
        const active = t === tab;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-[7px] transition-all duration-150 ${
              active
                ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.08)]"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t === "bulk" ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-90">
                <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 6.5h12M6 3v10M10 3v10" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-90">
                <circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 13.5c.6-2.4 2.7-3.6 5-3.6s4.4 1.2 5 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
            {t === "bulk" ? "Bulk CSV" : "One lead"}
          </button>
        );
      })}
    </div>
  );
}

export function TypeCheckboxes({
  types,
  toggle,
}: {
  types: EnrichmentType[];
  toggle: (t: EnrichmentType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <CheckboxPill
        active={types.includes("professional")}
        label="Professional"
        onClick={() => toggle("professional")}
      />
      <CheckboxPill
        active={types.includes("financial")}
        label="Financial"
        onClick={() => toggle("financial")}
      />
    </div>
  );
}

// Right-aligned per-lead cost summary for the top strip. Shown so the
// user knows the unit price up front, before they pick a tab or drop a
// file. Each type is dimmed when not currently selected so the active
// cost stack reads as the live total.
export function TypeCostInfo({ types }: { types: EnrichmentType[] }) {
  const pro = CREDITS_PER_LEAD.professional;
  const fin = CREDITS_PER_LEAD.financial;
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="flex items-center gap-3 text-[11.5px] tabular-nums">
      <span
        className={`inline-flex items-center gap-1 ${
          hasPro ? "text-text-secondary" : "text-text-tertiary"
        }`}
      >
        <span>Professional</span>
        <span className="text-text-tertiary">
          · {pro} credit{pro === 1 ? "" : "s"}/lead
        </span>
      </span>
      <span className="w-px h-3 bg-border-subtle" />
      <span
        className={`inline-flex items-center gap-1 ${
          hasFin ? "text-text-secondary" : "text-text-tertiary"
        }`}
      >
        <span>Financial</span>
        <span className="text-text-tertiary">
          · {fin} credit{fin === 1 ? "" : "s"}/lead
        </span>
      </span>
    </div>
  );
}

function CheckboxPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  // Quiet checkbox, no border, no fill. Just box + label. Active just darkens the text.
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-1 text-[12.5px] font-normal transition-colors"
    >
      <span
        className={`w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-colors ${
          active ? "border-text-primary bg-text-primary" : "border-border-hover bg-white"
        }`}
      >
        {active && (
          <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
            <path d="M2 4.5L3.8 6.3L7 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={active ? "text-text-primary" : "text-text-tertiary"}>{label}</span>
    </button>
  );
}

// "Fields needed" reference card, adapts to checkbox selection.
// The variable "Download sample CSV" link lives inside the DropZone now,
// not here, this card is purely a field-requirements reference.
export function FieldsNeededCard({
  hasPro,
  hasFin,
}: {
  hasPro: boolean;
  hasFin: boolean;
}) {
  if (!hasPro && !hasFin) {
    return (
      <div className="p-4 bg-surface-page border border-border-subtle rounded-card">
        <div className="text-[12px] text-text-tertiary">Pick an enrichment type above.</div>
      </div>
    );
  }
  return (
    <div className="p-4 bg-surface-page border border-border-subtle rounded-card flex flex-col gap-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
        Fields needed
      </div>
      {hasPro && (
        <div>
          <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Professional</div>
          <div className="text-[12px] text-text-secondary">Any of: LinkedIn URL, Email, Phone</div>
        </div>
      )}
      {hasFin && (
        <div>
          <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Financial</div>
          <div className="text-[12px] text-text-secondary">Name + Phone (required)</div>
        </div>
      )}
    </div>
  );
}

// Single-mode input set, fields appear/disappear based on selection
export function SingleInputsAdaptive({
  hasPro,
  hasFin,
  email, setEmail,
  phone, setPhone,
  linkedin, setLinkedin,
  name, setName,
}: {
  hasPro: boolean;
  hasFin: boolean;
  email: string; setEmail: (s: string) => void;
  phone: string; setPhone: (s: string) => void;
  linkedin: string; setLinkedin: (s: string) => void;
  name: string; setName: (s: string) => void;
}) {
  // Show phone whenever any type is on
  const showPhone = hasPro || hasFin;
  // Show email + linkedin only when Pro is on
  const showEmail = hasPro;
  const showLinkedin = hasPro;
  // Show name only when Fin is on
  const showName = hasFin;

  // Order: Name first (Financial req), then Professional hierarchy LinkedIn → Email → Phone.
  return (
    <div className="space-y-3">
      {showName && (
        <Input
          label="Name"
          required
          value={name}
          onChange={setName}
          placeholder="Saurabh Nandwani"
        />
      )}
      {showLinkedin && (
        <Input
          label="LinkedIn URL"
          value={linkedin}
          onChange={setLinkedin}
          placeholder="linkedin.com/in/..."
        />
      )}
      {showEmail && (
        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="jane@example.com"
        />
      )}
      {showPhone && (
        <Input
          label="Phone"
          required={hasFin}
          value={phone}
          onChange={setPhone}
          placeholder="+91 9876543210"
        />
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[11.5px] text-text-secondary mb-1">
        {label}
        {required && <span className="text-[#DC2626]">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-primary transition-colors placeholder:text-text-tertiary"
      />
    </div>
  );
}

export function FileCard({ file, rowCount, onClear }: { file: File; rowCount: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-surface-page rounded-card border border-border-subtle">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-[6px] bg-white border border-border flex items-center justify-center shrink-0">
          <FileSpreadsheet size={14} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-text-primary truncate">{file.name}</div>
          <div className="text-[11px] text-text-tertiary tabular-nums">
            {rowCount.toLocaleString("en-IN")} rows · {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="p-1.5 text-text-tertiary hover:text-text-primary rounded-button hover:bg-white transition-colors"
        aria-label="Remove file"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function DropZone({
  fileInputRef,
  onChosen,
  hasPro,
  hasFin,
  sampleHref,
  sampleName,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onChosen: (f: File) => void;
  // Optional sample-CSV link rendered inside the dropbox. Label adapts to
  // the selected enrichment types so the user grabs the right template.
  hasPro?: boolean;
  hasFin?: boolean;
  sampleHref?: string;
  sampleName?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const showSample = sampleHref && sampleName && (hasPro || hasFin);
  const sampleLabel =
    hasPro && hasFin
      ? "Download Professional + Financial sample CSV"
      : hasFin
      ? "Download Financial sample CSV"
      : "Download Professional sample CSV";
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onChosen(f);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[220px] rounded-card border-2 border-dashed transition-colors p-6 ${
        dragging
          ? "border-text-primary bg-surface-secondary"
          : "border-border hover:border-border-hover hover:bg-surface-page"
      }`}
    >
      <Upload size={20} strokeWidth={1.5} className="text-text-tertiary mb-3" />
      <p className="text-[13px] text-text-primary font-medium">
        Drop CSV here or <span className="underline underline-offset-2">click to browse</span>
      </p>
      <p className="text-[11px] text-text-tertiary mt-1">CSV, XLSX, XLS up to 50 MB</p>
      {showSample && (
        <a
          href={sampleHref}
          download={sampleName}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-text-secondary hover:text-text-primary underline underline-offset-2"
        >
          <Download size={11} strokeWidth={1.75} />
          {sampleLabel}
        </a>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChosen(f);
        }}
      />
    </div>
  );
}

export function SubmitButton({
  label,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  disabled: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 h-9 px-5 text-[13px] font-medium rounded-button transition-colors whitespace-nowrap ${
        disabled || loading
          ? "bg-text-primary/85 text-white cursor-not-allowed"
          : "bg-text-primary text-white hover:bg-accent-hover"
      } ${disabled && !loading ? "!bg-surface-secondary !text-text-tertiary" : ""}`}
    >
      {loading && (
        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function submitLabelSingle(state: ComposerState): string {
  if (state.isEnriching) return "Enriching…";
  if (state.insufficientForSingle) return "Top up credits";
  return `Enrich · ${state.singleCost.toLocaleString("en-IN")} credit${state.singleCost === 1 ? "" : "s"}`;
}

export function submitLabelBulk(state: ComposerState): string {
  if (state.isQueuing) return "Queuing…";
  if (state.insufficientForBulk) return "Top up credits";
  const rows = state.rowCount || 0;
  return `Enrich ${rows.toLocaleString("en-IN")} leads · ${state.bulkCost.toLocaleString("en-IN")} credits`;
}
