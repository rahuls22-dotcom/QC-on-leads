"use client";

// Side drawer for inspecting a run record (single or bulk).
// Sections: header · status · leads · credits · actions · error (if failed) · profile (single)

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Users, Check, Loader2, AlertTriangle, Upload, RotateCw } from "lucide-react";
import {
  formatRelative,
  successPct,
  useEnrichmentCrmStore,
  type RunRecord,
} from "@/lib/enrichment-crm-data";
import { useDemoMode } from "@/lib/demo-mode";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";

// No-storage variant treats runs older than this many days as expired:
// downloads, CRM push, audience build all disappear.
const NO_STORAGE_EXPIRY_DAYS = 3;

interface RunDrawerProps {
  run: RunRecord | null;
  onClose: () => void;
  onBuildAudience: (run: RunRecord) => void;
}

export function RunDrawer({ run: runProp, onClose, onBuildAudience }: RunDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Subscribe to the live store version of this run so push state updates while open.
  const liveRun = useEnrichmentCrmStore((s) =>
    runProp ? s.runs.find((r) => r.id === runProp.id) ?? runProp : null,
  );
  const run = liveRun;

  const { isEnrichmentNoStorage } = useDemoMode();
  const expired =
    run != null &&
    isEnrichmentNoStorage &&
    (Date.now() - new Date(run.startedAt).getTime()) / 86_400_000 > NO_STORAGE_EXPIRY_DAYS;

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, onClose]);

  if (!mounted || !run) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[560px] max-w-[92vw] bg-white border-l border-border z-[70] flex flex-col">
        <Header run={run} onClose={onClose} />

        <div className="flex-1 overflow-y-auto">
          {run.source === "crm" && (
            <>
              <CrmStatusSection run={run} />
              {run.profile && (
                <>
                  <Divider />
                  <section className="p-5">
                    <SectionLabel>Enriched profile</SectionLabel>
                    <div className="mt-3">
                      <LeadProfileCard profile={run.profile} variant="inline" />
                    </div>
                  </section>
                </>
              )}
              {run.status === "done" && (
                <>
                  <Divider />
                  <PushToCrmSection run={run} />
                </>
              )}
            </>
          )}

          {run.source === "bulk" && (
            <>
              <StatusSection run={run} />
              <Divider />
              <LeadsSection run={run} />
              <Divider />
              <CreditsSection run={run} />
              {run.status === "done" && !expired && (
                <>
                  <Divider />
                  <PushToCrmSection run={run} />
                </>
              )}
              {run.status === "done" && !expired && (
                <>
                  <Divider />
                  <ActionsSection
                    run={run}
                    onBuildAudience={() => onBuildAudience(run)}
                    noStorage={isEnrichmentNoStorage}
                  />
                </>
              )}
            </>
          )}

          {run.source === "single" && run.profile && (
            <>
              <Divider />
              <section className="p-5">
                <SectionLabel>Profile</SectionLabel>
                <div className="mt-3">
                  <LeadProfileCard profile={run.profile} variant="inline" />
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}

function Header({ run, onClose }: { run: RunRecord; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-5 py-4 border-b border-border">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-text-primary truncate">
          {run.source === "bulk"
            ? run.filename
            : run.source === "crm"
              ? run.profile?.contact?.name || run.profile?.contact?.email || run.crmOrigin?.recordId || "CRM lead"
              : run.inputValue}
        </h2>
        {run.source === "crm" && (
          <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
            {run.crmOrigin?.channel} · {run.crmOrigin?.provider ? capitalize(run.crmOrigin.provider) : ""}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {run.types.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${
                t === "professional"
                  ? "bg-[#EFF6FF] text-[#1D4ED8]"
                  : "bg-[#F5F3FF] text-[#6D28D9]"
              }`}
            >
              {t === "professional" ? "Professional" : "Financial"}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors"
        aria-label="Close"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function CrmStatusSection({ run }: { run: RunRecord }) {
  const enrichStatus = run.profile?.enrichment_status;

  let pillClass = "bg-surface-secondary text-text-secondary";
  let label = "—";
  if (run.status === "failed") { pillClass = "bg-[#FEF2F2] text-[#DC2626]"; label = "Failed"; }
  else if (enrichStatus === "Zero Enrichment") { pillClass = "bg-surface-secondary text-text-secondary"; label = "Not enriched"; }
  else if (enrichStatus === "Partial Enrichment") { pillClass = "bg-[#FFFBEB] text-[#B45309]"; label = "Partial"; }
  else if (run.status === "done") { pillClass = "bg-[#F0FDF4] text-[#15803D]"; label = "Enriched"; }

  return (
    <section className="p-5">
      <SectionLabel>Status</SectionLabel>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-badge ${pillClass}`}>{label}</span>
        <span className="text-[11.5px] text-text-tertiary">
          {formatRelative(run.startedAt)}
        </span>
      </div>
    </section>
  );
}

function StatusSection({ run }: { run: RunRecord }) {
  let pillClass = "bg-surface-secondary text-text-secondary";
  let label = "—";
  if (run.status === "done") { pillClass = "bg-[#F0FDF4] text-[#15803D]"; label = `Done · ${successPct(run)}% success`; }
  if (run.status === "in_progress") { pillClass = "bg-[#EFF6FF] text-[#1D4ED8]"; label = `In progress · ${run.progressPct || 0}%`; }
  if (run.status === "failed") { pillClass = "bg-[#FEF2F2] text-[#DC2626]"; label = "Failed"; }

  return (
    <section className="p-5">
      <SectionLabel>Status</SectionLabel>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-badge ${pillClass}`}>{label}</span>
      </div>
      <div className="text-[12px] text-text-tertiary mt-2">
        Started {formatRelative(run.startedAt)}
        {run.finishedAt && <span> · Finished {formatRelative(run.finishedAt)}</span>}
      </div>
    </section>
  );
}

function LeadsSection({ run }: { run: RunRecord }) {
  return (
    <section className="p-5">
      <SectionLabel>Leads</SectionLabel>
      <div className="grid grid-cols-4 gap-3 mt-3">
        <Stat label="Success" value={run.leadsSuccess} accent="ok" />
        <Stat label="Failed" value={run.leadsFailed} accent={run.leadsFailed > 0 ? "err" : "muted"} />
        <Stat label="Skipped" value={run.leadsSkipped} accent="muted" />
        <Stat label="Total" value={run.leadsTotal} accent="primary" />
      </div>
    </section>
  );
}

function CreditsSection({ run }: { run: RunRecord }) {
  return (
    <section className="p-5">
      <SectionLabel>Credits</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Stat label="Blocked" value={run.creditsBlocked} accent="muted" />
        <Stat label="Charged" value={run.creditsCharged} accent="primary" />
        <Stat label="Refunded" value={run.creditsRefunded} accent={run.creditsRefunded > 0 ? "ok" : "muted"} />
      </div>
      {run.creditsRefunded > 0 && (
        <p className="text-[11px] text-text-tertiary mt-3">
          {run.creditsRefunded.toLocaleString("en-IN")} credits refunded for leads we couldn't enrich.
        </p>
      )}
    </section>
  );
}

function PushToCrmSection({ run }: { run: RunRecord }) {
  const conn = useEnrichmentCrmStore((s) => s.crmConnection);
  const pushRunToCrm = useEnrichmentCrmStore((s) => s.pushRunToCrm);

  const providerLabel = capitalize(conn.provider);
  const sync = run.crmSync;
  const isPending = sync?.status === "pending";
  const isSynced  = sync?.status === "synced";
  const isFailed  = sync?.status === "failed";

  return (
    <section className="p-5">
      <SectionLabel>Push to CRM</SectionLabel>

      {!sync || sync.status === "not_pushed" ? (
        // Idle, primary CTA
        <>
          <p className="text-[12px] text-text-secondary mt-2 leading-snug">
            Send {run.leadsSuccess.toLocaleString("en-IN")} enriched leads to {providerLabel} ({conn.accountName}).
            Policy: <span className="text-text-primary">{policyLabel(conn.writeBackPolicy)}</span>.
          </p>
          <div className="mt-3">
            <ActionBtn primary onClick={() => pushRunToCrm(run.id)}>
              <Upload size={13} strokeWidth={1.75} />
              Send to {providerLabel}
            </ActionBtn>
          </div>
        </>
      ) : isPending ? (
        // Pending, disabled button + spinner pill
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
              <Loader2 size={11} strokeWidth={2} className="animate-spin" />
              Pushing to {providerLabel}…
            </span>
          </div>
          <p className="text-[12px] text-text-tertiary mt-2 leading-snug">
            Writing {run.leadsSuccess.toLocaleString("en-IN")} enriched records back. Usually finishes in a few seconds.
          </p>
        </>
      ) : isSynced ? (
        // Synced, success pill + counts + re-push
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-[#F0FDF4] text-[#15803D]">
              <Check size={11} strokeWidth={2.5} />
              Pushed to {providerLabel}
            </span>
            <span className="text-[11.5px] text-text-tertiary">{formatRelative(sync.syncedAt!)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Stat label="Pushed" value={sync.pushedRecords ?? 0} accent="ok" />
            <Stat label="Rejected" value={sync.failedRecords ?? 0} accent={(sync.failedRecords ?? 0) > 0 ? "err" : "muted"} />
          </div>
          {sync.errorMessage && (
            <p className="text-[12px] text-[#7F1D1D] bg-[#FEF2F2] border border-[#FECACA] rounded-card px-3 py-2 mt-3 leading-snug">
              {sync.errorMessage}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <ActionBtn onClick={() => pushRunToCrm(run.id)}>
              <RotateCw size={13} strokeWidth={1.75} />
              Push again
            </ActionBtn>
          </div>
        </>
      ) : isFailed ? (
        // Failed, error state + retry
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-[#FEF2F2] text-[#DC2626]">
              <AlertTriangle size={11} strokeWidth={2} />
              Push failed
            </span>
          </div>
          <p className="text-[12px] text-[#7F1D1D] bg-[#FEF2F2] border border-[#FECACA] rounded-card px-3 py-2 mt-3 leading-snug">
            {sync.errorMessage || `${providerLabel} rejected the request. Try again or check the connection.`}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <ActionBtn primary onClick={() => pushRunToCrm(run.id)}>
              <RotateCw size={13} strokeWidth={1.75} />
              Retry push
            </ActionBtn>
          </div>
        </>
      ) : null}
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function policyLabel(p: string): string {
  if (p === "fill_blanks") return "Fill blanks only";
  if (p === "overwrite") return "Overwrite existing";
  if (p === "field_selective") return "Field-selective";
  return p;
}

function ActionsSection({
  run,
  onBuildAudience,
  noStorage,
}: {
  run: RunRecord;
  onBuildAudience: () => void;
  noStorage: boolean;
}) {
  if (run.status !== "done") return null;
  return (
    <section className="p-5">
      <SectionLabel>Export</SectionLabel>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <ActionBtn onClick={() => download(run, "csv")}>
          <Download size={13} strokeWidth={1.5} />
          Download CSV
        </ActionBtn>
        <ActionBtn onClick={() => download(run, "xlsx")}>
          <Download size={13} strokeWidth={1.5} />
          Download Excel
        </ActionBtn>
        <ActionBtn onClick={onBuildAudience} primary>
          <Users size={13} strokeWidth={1.5} />
          Build audience
        </ActionBtn>
      </div>
      {noStorage && (
        <p className="text-[11.5px] text-text-tertiary mt-3 leading-snug">
          Available for 7 days from the time enrichment completes.
        </p>
      )}
    </section>
  );
}

// ── primitives ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">{children}</div>
  );
}

function Divider() {
  return <div className="border-t border-border-subtle" />;
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "ok" | "err" | "primary" | "muted" }) {
  const map = {
    ok: "text-[#15803D]",
    err: "text-[#DC2626]",
    primary: "text-text-primary",
    muted: "text-text-secondary",
  };
  return (
    <div>
      <div className="text-[11px] text-text-tertiary">{label}</div>
      <div className={`text-[18px] font-semibold tabular-nums mt-0.5 ${map[accent]}`}>{value.toLocaleString("en-IN")}</div>
    </div>
  );
}

function ActionBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-button transition-colors ${
        primary
          ? "bg-text-primary text-white hover:bg-accent-hover"
          : "bg-white text-text-secondary border border-border hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function download(run: RunRecord, format: "csv" | "xlsx") {
  const content = `# Enriched export, ${format.toUpperCase()}\n# Run: ${run.id}\n# File: ${run.filename}\n# Leads: ${run.leadsSuccess}/${run.leadsTotal}\n# Backend wires real export.\n`;
  const mime = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(run.filename || "enriched").replace(/\.[^.]+$/, "")}-enriched.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
