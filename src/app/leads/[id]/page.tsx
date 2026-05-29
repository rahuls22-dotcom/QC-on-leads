"use client";

import { use, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Copy,
  Database,
  Sparkles,
  RotateCw,
  Play,
  Pause,
  PhoneCall,
  FileText,
  AlertTriangle,
  ChevronDown,
  Bot,
  ShieldCheck,
  ArrowDown,
  Flag as FlagIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findLead,
  getLeadDetail,
  hasDiscrepancy,
  formatDate,
  leads,
  maskName,
  maskPhone,
  type Qualification,
  type TranscriptTurn,
} from "@/lib/qc-data";
import { Button } from "@/components/ui/button";
import { QualificationBadge } from "@/components/ui/qualification-badge";

const QUALIFICATIONS: Qualification[] = [
  "Qualified",
  "Intent Qualified",
  "Follow up",
  "RnR On Voicemail",
  "Disqualified",
];

const INTEREST_LEVELS = [
  "Very Interested",
  "Interested",
  "Mildly Interested",
  "Not Interested",
];

export default function QualityCheckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const lead = findLead(id);
  if (!lead) notFound();

  const router = useRouter();
  const detail = getLeadDetail(lead);
  const discrepancy = hasDiscrepancy(lead);

  // Position in the queue, for "X of N" pagination.
  const index = useMemo(() => leads.findIndex((l) => l.id === lead.id), [lead.id]);
  const total = leads.length;
  const prevId = index > 0 ? leads[index - 1].id : null;
  const nextId = index < total - 1 ? leads[index + 1].id : null;

  // Editable QC fields
  const [leadStatus, setLeadStatus] = useState<Qualification>(detail.qcQualification);
  const [interest, setInterest] = useState<string>(
    detail.aiQualification === "Disqualified" ? "Not Interested" : "Interested",
  );
  const [remarks, setRemarks] = useState("");
  const [recordingUrl, setRecordingUrl] = useState("");

  // Transcript expand/collapse — opened from the doc icon in Call Logs
  // and from the "View flagged transcript" link in the discrepancy banner.
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const openAndScrollTranscript = () => {
    setTranscriptOpen(true);
    // Scroll after the panel renders.
    setTimeout(() => {
      transcriptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const flaggedTurnCount = detail.transcript.filter((t) => t.flag).length;

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <button
            aria-label="Back"
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-md hover:bg-secondary text-foreground flex items-center justify-center"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground">Quality Check</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* X of N pagination */}
          <div className="inline-flex items-center h-9 rounded-md border border-border bg-card overflow-hidden text-[13px]">
            <button
              aria-label="Previous lead"
              onClick={() => prevId && router.push(`/leads/${prevId}`)}
              disabled={!prevId}
              className="w-9 h-9 flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <div className="px-3 tabular text-foreground border-x border-border h-9 flex items-center">
              {index + 1} of {total}
            </div>
            <button
              aria-label="Next lead"
              onClick={() => nextId && router.push(`/leads/${nextId}`)}
              disabled={!nextId}
              className="w-9 h-9 flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
          <Button variant="outline" size="default">
            <Database size={14} strokeWidth={2} />
            Mark as SQL
          </Button>
          <Button variant="outline" size="default">
            <Sparkles size={14} strokeWidth={2} />
            View Enrichment
          </Button>
        </div>
      </div>

      {/* Discrepancy banner — full AI vs QC reasoning, not just labels.
          Shows up only when AI ≠ QC. */}
      {discrepancy && (
        <div className="mb-5 rounded-lg border border-[hsl(35_70%_75%)] bg-[hsl(45_85%_96%)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(35_70%_82%)] bg-[hsl(45_85%_91%)] text-[hsl(35_70%_22%)]">
            <AlertTriangle size={15} strokeWidth={2} />
            <span className="text-[13px] font-semibold">
              Qualification mismatch — reviewer overrode the AI label
            </span>
            <span className="ml-auto text-[11.5px] font-medium">
              {flaggedTurnCount > 0 ? `${flaggedTurnCount} flagged turn${flaggedTurnCount > 1 ? "s" : ""} in transcript` : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-[hsl(35_70%_85%)]">
            {/* AI side */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Bot size={13} strokeWidth={2} className="text-muted-foreground" />
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  AI says
                </span>
                <QualificationBadge value={detail.aiQualification} />
                <span className="text-[11px] text-muted-foreground tabular ml-auto">
                  signal {detail.signal}
                </span>
              </div>
              <p className="text-[12.5px] leading-relaxed text-foreground/85">
                {detail.aiReason}
              </p>
            </div>
            {/* QC side */}
            <div className="px-4 py-3 bg-[hsl(45_85%_98%)]">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck size={13} strokeWidth={2} className="text-[hsl(35_70%_32%)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[hsl(35_70%_32%)]">
                  QC reviewer says
                </span>
                <QualificationBadge value={detail.qcQualification} />
              </div>
              <p className="text-[12.5px] leading-relaxed text-foreground">
                {detail.qcReason}
              </p>
              <button
                onClick={openAndScrollTranscript}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[hsl(35_70%_28%)] hover:underline underline-offset-2"
              >
                <ArrowDown size={12} strokeWidth={2} />
                View flagged transcript
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* LEFT — Call Logs card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-5 space-y-5">
            <div className="space-y-2 text-[14px]">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Lead:</span>
                <span className="font-medium text-foreground">{maskName(lead.name)}</span>
                <button
                  aria-label="Edit lead name"
                  className="w-6 h-6 rounded-md hover:bg-secondary text-muted-foreground flex items-center justify-center"
                >
                  <Pencil size={12} strokeWidth={1.75} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium text-foreground tabular">{maskPhone(lead.phone)}</span>
                <button
                  aria-label="Copy phone"
                  className="w-6 h-6 rounded-md hover:bg-secondary text-muted-foreground flex items-center justify-center"
                >
                  <Copy size={12} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <button className="inline-flex items-center h-8 px-3 rounded-md bg-primary-soft text-primary text-[13px] font-medium hover:brightness-95">
              Validate
            </button>

            <div>
              <div className="text-[15px] font-semibold text-foreground mb-3">Call Logs</div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <Th>Date</Th>
                      <Th>Call ID</Th>
                      <Th>Status</Th>
                      <Th align="right">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <td className="px-4 py-3 text-foreground/90 whitespace-nowrap">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground tabular">
                          {fakeCallId(lead.id).slice(0, 8)}…
                          <button
                            aria-label="Copy call ID"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy size={11} strokeWidth={1.75} />
                          </button>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[11.5px] font-medium">
                          Ended
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn
                            label={transcriptOpen ? "Hide transcript" : "View transcript"}
                            active={transcriptOpen}
                            onClick={() => setTranscriptOpen((v) => !v)}
                          >
                            <FileText size={13} strokeWidth={1.75} />
                            {flaggedTurnCount > 0 && !transcriptOpen && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-warning border-2 border-card" />
                            )}
                          </IconBtn>
                          <IconBtn label="Copy">
                            <Copy size={13} strokeWidth={1.75} />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-4 py-2 text-[11.5px] text-muted-foreground">
                        N/A · N/A
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <AudioPlayerStub durationSeconds={lead.callDurationSeconds || 40} />

            {/* Transcript — toggled from the doc icon in the Call Logs row,
                or via "View flagged transcript" in the discrepancy banner. */}
            {transcriptOpen && (
              <TranscriptPanel
                ref={transcriptRef}
                turns={detail.transcript}
                flaggedCount={flaggedTurnCount}
                onClose={() => setTranscriptOpen(false)}
              />
            )}
          </div>
        </div>

        {/* RIGHT — Quality Assessment card */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
            <div className="text-[15px] font-semibold text-foreground">Quality Assessment</div>
            <Button variant="outline" size="sm">
              <RotateCw size={12} strokeWidth={2} />
              Rederive Variables
            </Button>
          </div>

          <div className="px-6 pb-4 space-y-5 flex-1 overflow-y-auto">
            <Field label="Customer Summary">
              <textarea
                readOnly
                value={detail.aiSummary}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-[13px] text-foreground/90 outline-none resize-y leading-relaxed"
              />
            </Field>

            <Field label="QC Remarks">
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks"
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground resize-y"
              />
            </Field>

            <Field label="Lead Status">
              <Dropdown
                value={leadStatus}
                onChange={(v) => setLeadStatus(v as Qualification)}
                options={QUALIFICATIONS}
              />
            </Field>

            <Field label="Interest Level">
              <Dropdown
                value={interest}
                onChange={setInterest}
                options={INTEREST_LEVELS}
              />
            </Field>

            <Field label="Relevant Call Recording">
              <input
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                placeholder="Paste call recording URL"
                className="w-full h-9 px-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
              />
            </Field>

            <div>
              <div className="text-[13.5px] font-medium text-foreground mb-2">
                Matched Qualification Criteria
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <CriteriaPill tone="status" value={detail.aiQualification} />
                <CriteriaPill tone="code" value="D1" />
                {discrepancy && (
                  <CriteriaPill tone="warn" value="QC override" />
                )}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">Send to CRM</Button>
              <Button variant="outline" size="sm">Copy to Campaign</Button>
            </div>
            <Button size="sm">Save Assessment</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13.5px] font-medium text-foreground mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-border bg-transparent text-[13px] text-foreground outline-none focus-visible:border-foreground"
      >
        <span>{value}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn("text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <>
          {/* Click-away guard */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-lg border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-1.5">
            {options.map((opt) => {
              const active = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-[calc(100%-12px)] mx-1.5 my-0.5 px-3 h-9 rounded-md text-left text-[13px] transition-colors",
                    active
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[12px] font-semibold text-muted-foreground whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function IconBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "relative w-7 h-7 rounded-md border flex items-center justify-center transition-colors",
        active
          ? "border-foreground bg-secondary text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

// ── Transcript panel ──────────────────────────────────────────────────────

const TranscriptPanel = ({
  ref,
  turns,
  flaggedCount,
  onClose,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  turns: TranscriptTurn[];
  flaggedCount: number;
  onClose: () => void;
}) => {
  return (
    <div
      ref={ref}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <FileText size={13} strokeWidth={2} className="text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">
            Transcript
          </span>
          {flaggedCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded-md bg-[hsl(45_85%_91%)] text-[hsl(35_70%_28%)] text-[10.5px] font-bold border border-[hsl(45_70%_80%)]">
              <FlagIcon size={9} strokeWidth={2.25} />
              {flaggedCount} flagged
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[12px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Hide
        </button>
      </div>
      <ol className="divide-y divide-border">
        {turns.map((turn, i) => (
          <TranscriptTurnRow key={i} turn={turn} />
        ))}
      </ol>
    </div>
  );
};

function TranscriptTurnRow({ turn }: { turn: TranscriptTurn }) {
  const flagged = !!turn.flag;
  const isAgent = turn.speaker === "Agent";
  return (
    <li
      className={cn(
        "relative px-4 py-3",
        flagged && "bg-[hsl(45_85%_96%)]",
      )}
    >
      {/* Left accent bar for flagged turns */}
      {flagged && (
        <span className="absolute inset-y-0 left-0 w-1 bg-warning" />
      )}
      <div className="flex items-baseline gap-2 mb-1">
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.06em]",
            isAgent ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {turn.speaker}
        </span>
        <span className="text-[11px] text-muted-foreground tabular">{turn.at}</span>
      </div>
      <p
        className={cn(
          "text-[13px] leading-relaxed",
          flagged ? "text-foreground" : "text-foreground/85",
        )}
      >
        {turn.text}
      </p>
      {flagged && (
        <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[hsl(35_70%_28%)]">
          <FlagIcon size={11} strokeWidth={2.25} className="mt-[2px] shrink-0" />
          <span>
            <span className="font-bold uppercase tracking-wider">Flagged by QC:</span>{" "}
            <span>{turn.flag}</span>
          </span>
        </div>
      )}
    </li>
  );
}

function CriteriaPill({ tone, value }: { tone: "status" | "code" | "warn"; value: string }) {
  const cls =
    tone === "status"
      ? "bg-[hsl(0_75%_95%)] text-[hsl(0_70%_42%)] border-[hsl(0_70%_88%)]"
      : tone === "warn"
      ? "bg-[hsl(45_85%_91%)] text-[hsl(35_70%_32%)] border-[hsl(45_70%_80%)]"
      : "bg-primary-soft text-primary border-transparent";
  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-md px-2 py-[3px] text-[11.5px] font-medium",
        cls,
      )}
    >
      {value}
    </span>
  );
}

function AudioPlayerStub({ durationSeconds }: { durationSeconds: number }) {
  const [playing, setPlaying] = useState(false);
  const totalLabel = formatTimecode(durationSeconds);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Play"}
        className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center hover:brightness-95"
      >
        {playing ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11.5px] tabular text-muted-foreground mb-1">
          <span>0:00</span>
          <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-0 bg-foreground" />
          </div>
          <span>{totalLabel}</span>
        </div>
      </div>
      <button className="inline-flex items-center h-7 px-2.5 rounded-md border border-border text-[12px] text-foreground hover:bg-secondary">
        1x
      </button>
      <button
        aria-label="Call back"
        className="w-9 h-9 rounded-md border border-border bg-card text-foreground hover:bg-secondary flex items-center justify-center"
      >
        <PhoneCall size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}

function formatTimecode(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fakeCallId(leadId: string): string {
  // Deterministic id-looking string per lead so re-renders stay stable.
  let hash = 0;
  for (let i = 0; i < leadId.length; i++) hash = (hash * 31 + leadId.charCodeAt(i)) >>> 0;
  return hash.toString(16).padStart(12, "0") + "0000";
}
