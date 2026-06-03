"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { findAgent, agentDetail } from "@/lib/agents-data";

// ── Shell ─────────────────────────────────────────────────────────────────

function ModalShell({
  title,
  badge,
  children,
  footer,
  onClose,
  width = "max-w-[440px]",
}: {
  title: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  width?: string;
}) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full rounded-xl border border-border bg-card shadow-xl",
          width,
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            {title}
            {badge}
          </h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-7 h-7 rounded-md text-muted-foreground hover:bg-secondary flex items-center justify-center"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
        {children}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle">
          {footer}
        </div>
      </div>
    </div>
  );
}

function PhaseTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-info-bg text-info">
      {children}
    </span>
  );
}

// ── Pause ─────────────────────────────────────────────────────────────────

export function PauseModal({
  agentId,
  onConfirm,
  onClose,
}: {
  agentId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const agent = findAgent(agentId);
  if (!agent) return null;

  const rows: [string, string][] = [
    ["Agent", agent.name],
    ["Composite", agent.composite != null ? String(agent.composite) : "—"],
    ["Top offender", agent.lowestSignal ?? "—"],
    ["Calls in window", String(agent.callCount)],
  ];

  return (
    <ModalShell
      title="Pause this agent?"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Pause agent
          </Button>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Calls will stop being routed to this agent immediately. The audit log
          will record actor, timestamp, and current composite score.
        </p>
        <div className="mt-3.5 rounded-lg border border-border-subtle bg-muted/60 divide-y divide-border-subtle">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 px-3.5 py-2 text-[12.5px]"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium text-right truncate">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Resume ────────────────────────────────────────────────────────────────

export function ResumeModal({
  agentId,
  onConfirm,
  onClose,
}: {
  agentId: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const agent = findAgent(agentId);
  if (!agent) return null;

  return (
    <ModalShell
      title="Resume this agent?"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-success text-white hover:brightness-110"
          >
            Resume agent
          </Button>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Calls will resume being routed to{" "}
          <span className="text-foreground font-medium">{agent.name}</span>. The
          audit log will record actor and timestamp.
        </p>
      </div>
    </ModalShell>
  );
}

// ── Slack preview ─────────────────────────────────────────────────────────

export function SlackModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell
      title="Slack alert preview"
      badge={<PhaseTag>V1.1+</PhaseTag>}
      width="max-w-[520px]"
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="px-5 py-4">
        {/* Slack message card */}
        <div className="rounded-lg border-l-[3px] border-l-destructive border border-border-subtle bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            QC Bot
            <span className="inline-flex items-center rounded px-1 py-px text-[9px] font-bold bg-secondary text-secondary-foreground tracking-wide">
              APP
            </span>
          </div>
          <div className="mt-1.5 text-[13.5px] font-semibold text-foreground">
            🔴 Quality alert: Ramky Fortuna Outbound
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            <span className="text-foreground font-medium">Composite:</span> 64
            (rolling-20) ·{" "}
            <span className="text-foreground font-medium">Trend:</span> ↓ 8 vs
            7-day baseline
          </div>
          <div className="text-[12px] text-muted-foreground">
            <span className="text-foreground font-medium">Owner:</span> @
            {agentDetail.owner} ·{" "}
            <span className="text-foreground font-medium">Calls:</span> 47 in
            window
          </div>

          <div className="mt-2.5 rounded-md border border-border-subtle bg-card px-3 py-2.5 text-[12px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Top offender:</span> S1
            Qualification Data Capture (58/100, weight 45%)
            <br />→ Sub-signal{" "}
            <span className="text-foreground font-medium">
              1.2 Field accuracy
            </span>{" "}
            (44/100) · 14 calls affected · confidence 0.88
            <br />
            <span className="italic">Likely cause:</span> Budget captured without
            currency unit (₹/lakhs/cr) — validator failing accuracy.
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button className="h-7 px-2.5 rounded-md border border-border bg-card text-[12px] text-foreground hover:bg-secondary">
              View affected calls
            </button>
            <button className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[12px] hover:brightness-110">
              View scorecard
            </button>
            <button className="h-7 px-2.5 rounded-md bg-destructive text-white text-[12px] hover:brightness-110">
              Pause agent
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11.5px] text-muted-foreground leading-relaxed">
          Alert fires only when ≥10 calls scored, confidence ≥ 0.8, and threshold
          breached. Rate-limited: max 3/agent/hour, deduped within 30 min.
        </p>
      </div>
    </ModalShell>
  );
}
