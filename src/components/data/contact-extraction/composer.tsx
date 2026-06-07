"use client";

// Contact-extraction composer. One shape, two modes:
//   bulk   , drop a CSV of LinkedIn URLs → pick contact types → run
//   single , paste one LinkedIn URL → pick contact types → run
//
// On submit we create an in_progress run in the CE store (which the page shell
// ticks to completion) and fire a toast. No real network — this ports the
// app.revspot flow into launchpad with a cleaner UX.

import { useRef, useState } from "react";
import { BadgeCheck, Coins, Download, FileText, Loader2, UploadCloud, X } from "lucide-react";

import {
  CE_TYPE_LABEL,
  sampleCsvDataUrl,
  sampleCsvFilename,
  useCEStore,
  type CEContact,
  type CEContactType,
  type CERun,
} from "@/lib/contact-extraction-data";

import { CopyButton, LinkedInIcon, TypeCheckboxes, VerifiedTick } from "./parts";

// Pre-select everything — most lookups want the full contact set, and any field
// we can't find is refunded anyway.
const DEFAULT_TYPES: CEContactType[] = ["phone", "personal_email", "work_email"];

// Every requested contact type, in display order. The single-lookup result panel
// walks this (not just the requested set) so a type the user didn't ask for still
// gets a row labelled "Not requested" instead of vanishing.
const ALL_TYPES: CEContactType[] = ["phone", "personal_email", "work_email"];

// Hard cap on a single bulk upload. Mirrors the app.revspot limit.
const MAX_ROWS = 10000;

export function ContactExtractionComposer({ mode }: { mode: "bulk" | "single" }) {
  const addRun = useCEStore((s) => s.addRun);

  const [types, setTypes] = useState<CEContactType[]>(DEFAULT_TYPES);
  const [submitting, setSubmitting] = useState(false);
  const [resultRunId, setResultRunId] = useState<string | null>(null);

  // The latest single-lookup run + its one contact, for the inline result panel.
  const resultRun = useCEStore((s) => s.runs.find((r) => r.id === resultRunId));
  const resultContact = useCEStore((s) => s.contacts.find((c) => c.runId === resultRunId));

  // bulk
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; rows: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // single
  const [linkedin, setLinkedin] = useState("");

  // Credits block at run start: 1 per contact type, per profile. Refunded for
  // any field we can't find.
  const profiles = mode === "bulk" ? file?.rows ?? 0 : 1;
  const creditCost = profiles * types.length;

  const toggleType = (t: CEContactType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const onFileChosen = async (f: File | null) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      setFile(null);
      setFileError("Only CSV files are supported.");
      return;
    }
    let rows = 0;
    try {
      const text = await f.text();
      rows = text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
      if (rows > 1) rows -= 1; // assume header row
    } catch {
      rows = 0;
    }
    rows = Math.max(rows, 1);
    if (rows > MAX_ROWS) {
      setFile(null);
      setFileError(
        `That file has ${rows.toLocaleString("en-IN")} rows — the max is ${MAX_ROWS.toLocaleString("en-IN")}. Split it and upload again.`,
      );
      return;
    }
    setFileError(null);
    setFile({ name: f.name, rows });
  };

  const canSubmit =
    types.length > 0 &&
    !submitting &&
    (mode === "bulk" ? !!file && file.rows > 0 : isLikelyLinkedin(linkedin));

  const submit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const label = mode === "bulk" ? file!.name : prettyNameFromUrl(linkedin);
    const total = mode === "bulk" ? file!.rows : 1;
    const id = addRun({
      source: mode,
      label,
      total,
      requestedTypes: types,
      verifyPhone: true, // verification is always on now
    });

    if (mode === "single") setResultRunId(id);
    window.dispatchEvent(
      new CustomEvent("enrichment-crm:toast", {
        detail: {
          title: mode === "bulk" ? "Extraction started" : "Lookup started",
          description:
            mode === "bulk"
              ? `Running ${total.toLocaleString("en-IN")} profiles across ${types.length} contact type${types.length === 1 ? "" : "s"}. This view updates as results land.`
              : `Looking up ${label}. Results land in All contacts.`,
        },
      }),
    );

    // reset input for the next run
    if (mode === "bulk") {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setLinkedin("");
    }
    window.setTimeout(() => setSubmitting(false), 400);
  };

  return (
    <div className="space-y-3">
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Top strip: contact types on the left, credit info on the right */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-5 py-3.5 border-b border-border-subtle">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <span className="text-[12px] font-medium text-text-tertiary">Extract</span>
          <TypeCheckboxes selected={types} onToggle={toggleType} />
        </div>
        <CreditInfo />
      </div>

      {/* Auto-verify note: verification is always on now, so we state it once
          here and let the green tick mark each result we could confirm. */}
      <div className="flex items-center gap-1.5 px-5 py-2 bg-surface-page/40 border-b border-border-subtle text-[11.5px] text-text-tertiary">
        <BadgeCheck size={13} strokeWidth={2} className="text-[#059669] shrink-0" />
        <span>
          Every contact is verified automatically. A{" "}
          <BadgeCheck size={12} strokeWidth={2} className="inline-block align-[-2px] text-[#059669]" />{" "}
          marks each result we could confirm.
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {mode === "bulk" ? (
          <BulkBody
            file={file}
            error={fileError}
            fileInputRef={fileInputRef}
            onChosen={onFileChosen}
            onClear={() => {
              setFile(null);
              setFileError(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
        ) : (
          <SingleBody
            value={linkedin}
            onChange={setLinkedin}
            onSubmit={submit}
            canSubmit={canSubmit}
            submitting={submitting}
            creditCost={creditCost}
          />
        )}
      </div>

      {/* Footer — bulk only. Single drives its run from the inline button next
          to the URL field, so it needs no footer. */}
      {mode === "bulk" && (
      <div className="px-5 py-3 flex items-center gap-3 bg-surface-page/40 border-t border-border-subtle">
        <div className="flex-1 min-w-0 text-[12px] text-text-tertiary truncate">
          {types.length === 0 ? (
            "Pick at least one contact type"
          ) : creditCost > 0 ? (
            <>
              <span className="text-text-secondary font-medium">
                {creditCost.toLocaleString("en-IN")} credit{creditCost === 1 ? "" : "s"}
              </span>{" "}
              blocked
              <span className="hidden sm:inline">
                {" "}
                ({profiles.toLocaleString("en-IN")} × {types.length} type{types.length === 1 ? "" : "s"})
              </span>{" "}
              · refunded for anything we can&apos;t find
            </>
          ) : (
            "Drop a CSV of LinkedIn URLs to begin"
          )}
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className={[
            "inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium rounded-button transition-colors",
            canSubmit
              ? "bg-text-primary text-white hover:bg-accent-hover"
              : "bg-surface-secondary text-text-tertiary cursor-not-allowed",
          ].join(" ")}
        >
          {submitting && <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />}
          {mode === "bulk" ? "Run extraction" : "Extract contact"}
          {creditCost > 0 && (
            <span className={canSubmit ? "text-white/70" : "text-text-tertiary"}>
              · {creditCost.toLocaleString("en-IN")} credit{creditCost === 1 ? "" : "s"}
            </span>
          )}
        </button>
      </div>
      )}
    </div>

    {/* Inline result for the latest single lookup */}
    {mode === "single" && resultRun && (
      <SingleResultPanel
        run={resultRun}
        contact={resultContact}
        onDismiss={() => setResultRunId(null)}
      />
    )}
    </div>
  );
}

// ── Credit info ──────────────────────────────────────────────────────────────

// Top-right credit readout: a static price list — each contact type costs 1
// credit. Stays fixed regardless of selection; the running total / blocked
// amount lives in the footer instead.
// Static per-type pricing. Costs are independent — one type can be priced
// differently from another — so we read each from this map rather than assume
// a single flat rate.
const CREDIT_PER_TYPE: Record<CEContactType, number> = {
  phone: 1,
  personal_email: 1,
  work_email: 1,
};

function CreditInfo() {
  const items: CEContactType[] = ["phone", "personal_email", "work_email"];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-text-tertiary">
      <Coins size={13} strokeWidth={1.75} className="text-text-secondary" />
      {items.map((t, i) => {
        const n = CREDIT_PER_TYPE[t];
        return (
          <span key={t} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-border">·</span>}
            <span>
              {CE_TYPE_LABEL[t]}{" "}
              <span className="font-semibold text-text-secondary tabular-nums">{n}</span> credit
              {n === 1 ? "" : "s"}
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ── Single result panel ──────────────────────────────────────────────────────

function SingleResultPanel({
  run,
  contact,
  onDismiss,
}: {
  run: CERun;
  contact?: CEContact;
  onDismiss: () => void;
}) {
  const running = run.status !== "done";
  // Walk every contact type, not just the requested set, so a type the user
  // didn't ask for still renders a box labelled "Not requested".
  const rows: CEContactType[] = ALL_TYPES;
  const requested = new Set(run.requestedTypes);

  // Profile attributes pulled from the LinkedIn match — role, company, location.
  // Mirrors app.revspot, which always showed who the person is alongside their
  // extracted contacts.
  const profile: { label: string; value?: string }[] = [
    { label: "Role", value: contact?.title },
    { label: "Company", value: contact?.company },
    { label: "Location", value: contact?.location },
  ];

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Header: status + name + LinkedIn link */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border-subtle">
        <div className="flex items-center gap-2.5 min-w-0">
          {running ? (
            <Loader2 size={15} strokeWidth={1.75} className="text-[#1D4ED8] animate-spin shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#059669] shrink-0" />
          )}
          <span className="text-[14px] font-semibold text-text-primary truncate">
            {running ? "Looking up…" : contact?.name ?? run.label}
          </span>
          {!running && contact?.linkedin && (
            <a
              href={contact.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              title="Open LinkedIn profile"
              className="inline-flex items-center shrink-0 opacity-80 hover:opacity-100 transition-opacity"
            >
              <LinkedInIcon size={16} />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss result"
          className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      {/* Profile: who this person is */}
      {!running && contact && (
        <dl className="divide-y divide-border-subtle">
          {profile.map((p) =>
            p.value ? (
              <div key={p.label} className="flex items-baseline gap-4 px-5 py-2.5">
                <dt className="w-28 shrink-0 text-[12px] text-text-tertiary">{p.label}</dt>
                <dd className="text-[13px] text-text-primary truncate">{p.value}</dd>
              </div>
            ) : null,
          )}
        </dl>
      )}

      {/* Extracted contacts — one box per requested type, laid out side by side. */}
      <div className="border-t border-border-subtle bg-surface-page/40 px-5 py-4">
        <div className="pb-2.5 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
          Extracted contacts
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((t) => {
            const wasRequested = requested.has(t);
            const field =
              t === "phone" ? contact?.phone : t === "personal_email" ? contact?.personalEmail : contact?.workEmail;
            return (
              <div
                key={t}
                className="rounded-card border border-border-subtle bg-white px-3.5 py-3 min-w-0"
              >
                <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-2">
                  {CE_TYPE_LABEL[t]}
                </div>
                {!wasRequested ? (
                  <span className="text-[12.5px] text-text-tertiary">Not requested</span>
                ) : running ? (
                  <span className="inline-block h-2.5 w-28 bg-surface-secondary rounded animate-pulse" />
                ) : field?.value ? (
                  <div className="flex items-start gap-1 min-w-0">
                    <span className="flex-1 text-[13px] text-text-primary tabular-nums break-all leading-snug">
                      {field.value}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {field.status === "verified" && <VerifiedTick />}
                      <CopyButton value={field.value} />
                    </div>
                  </div>
                ) : (
                  <span className="text-[12.5px] text-text-tertiary">
                    {field?.status === "not_found" ? "Not found" : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Bulk body ──────────────────────────────────────────────────────────────

function BulkBody({
  file,
  error,
  fileInputRef,
  onChosen,
  onClear,
}: {
  file: { name: string; rows: number } | null;
  error?: string | null;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onChosen: (f: File | null) => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  if (file) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-surface-page rounded-card border border-border-subtle">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#EFF6FF]">
          <FileText size={15} strokeWidth={1.75} className="text-[#1D4ED8]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-text-primary truncate">{file.name}</div>
          <div className="text-[11.5px] text-text-tertiary">{file.rows.toLocaleString("en-IN")} rows</div>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove file"
          className="p-1.5 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onChosen(e.dataTransfer.files?.[0] ?? null);
        }}
        className={[
          "border-2 border-dashed rounded-card px-6 py-10 flex flex-col items-center justify-center text-center transition-colors",
          error ? "border-[#FCA5A5]" : dragOver ? "border-text-primary bg-surface-page" : "border-border",
        ].join(" ")}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onChosen(e.target.files?.[0] ?? null)}
        />
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-secondary mb-3">
          <UploadCloud size={18} strokeWidth={1.5} className="text-text-secondary" />
        </span>
        <div className="text-[13px] font-semibold text-text-primary">Drop your CSV here</div>
        <div className="text-[12px] text-text-tertiary mt-1 max-w-[320px] leading-[1.5]">
          A column of LinkedIn profile URLs is all we need. Names and companies help us match faster.
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-text-primary text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
          >
            Choose file
          </button>
          <a
            href={sampleCsvDataUrl()}
            download={sampleCsvFilename}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Download size={14} strokeWidth={1.5} />
            Sample CSV
          </a>
        </div>
        <div className="text-[11.5px] text-text-tertiary mt-4">
          CSV only · up to {MAX_ROWS.toLocaleString("en-IN")} rows · one file at a time
        </div>
      </div>
      {error && (
        <div className="text-[11.5px] text-[#B91C1C]">{error}</div>
      )}
    </div>
  );
}

// ── Single body ──────────────────────────────────────────────────────────────

function SingleBody({
  value,
  onChange,
  onSubmit,
  canSubmit,
  submitting,
  creditCost,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitting: boolean;
  creditCost: number;
}) {
  return (
    <div className="max-w-[760px]">
      <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
        LinkedIn profile URL
      </label>
      <div className="flex items-start gap-2.5">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
            <LinkedInIcon size={15} />
          </span>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            placeholder="https://www.linkedin.com/in/username/"
            className="w-full h-10 pl-9 pr-3 text-[13px] bg-white border border-border rounded-input focus:border-text-primary focus:outline-none transition-colors placeholder:text-text-tertiary"
          />
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={[
            "inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium rounded-button transition-colors whitespace-nowrap shrink-0",
            canSubmit
              ? "bg-text-primary text-white hover:bg-accent-hover"
              : "bg-surface-secondary text-text-tertiary cursor-not-allowed",
          ].join(" ")}
        >
          {submitting && <Loader2 size={14} strokeWidth={1.75} className="animate-spin" />}
          Extract contact
          {creditCost > 0 && (
            <span className={canSubmit ? "text-white/70" : "text-text-tertiary"}>
              · up to {creditCost.toLocaleString("en-IN")} credit{creditCost === 1 ? "" : "s"}
            </span>
          )}
        </button>
      </div>
      {value && !isLikelyLinkedin(value) && (
        <div className="text-[11.5px] text-[#B45309] mt-1.5">
          That doesn&apos;t look like a LinkedIn profile URL.
        </div>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isLikelyLinkedin(url: string): boolean {
  return /linkedin\.com\/in\//i.test(url.trim());
}

function prettyNameFromUrl(url: string): string {
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!m) return "LinkedIn profile";
  const slug = decodeURIComponent(m[1]).replace(/-\w{6,}$/, "");
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
