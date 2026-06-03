"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Bot,
  LifeBuoy,
  RefreshCw,
  Check,
} from "lucide-react";
import { newAgentsList } from "@/lib/voice-agent-data";

interface CampaignResultProps {
  onRetry: () => void;
}

type ResultState = "launching" | "success" | "failure";

const FAILURE_CONTEXT = {
  step: "Create Adset Broad | Interest Stack | Delhi | 40-62",
  issue: "Invalid Facebook position",
  details: "Invalid value reels for the placement field facebook_positions.",
  errorCode: "1815433",
} as const;

export function CampaignResult({ onRetry }: CampaignResultProps) {
  const [state, setState] = useState<ResultState>("launching");

  // Simulate the launch call. Default to success. Append ?result=failure to URL to see the failure state.
  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        setState(p.get("result") === "failure" ? "failure" : "success");
      } else {
        setState("success");
      }
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  if (state === "launching") return <LaunchingView />;
  if (state === "failure") return <FailureView onRetry={onRetry} />;
  return <SuccessView />;
}

/* ──────────────────────────────────────────────────────── */
/*  Launching                                               */
/* ──────────────────────────────────────────────────────── */

function LaunchingView() {
  return (
    <div className="text-center py-24">
      <div className="w-14 h-14 mx-auto mb-5 bg-accent/5 rounded-full flex items-center justify-center">
        <div className="h-7 w-7 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-[22px] font-semibold text-text-primary mb-2">Creating campaign on Meta</h2>
      <p className="text-[13px] text-text-secondary max-w-[440px] mx-auto">
        This usually takes a few seconds...
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Success                                                 */
/* ──────────────────────────────────────────────────────── */

function SuccessView() {
  const [agentId, setAgentId] = useState<string>("");
  const [agentConnected, setAgentConnected] = useState(false);
  const activeAgents = newAgentsList.filter((a) => a.status === "active");
  const selectedAgent = activeAgents.find((a) => a.id === agentId);

  return (
    <div className="py-8">
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-4 bg-[#F0FDF4] rounded-full flex items-center justify-center">
          <CheckCircle2 size={28} strokeWidth={1.5} className="text-status-success" />
        </div>
        <h2 className="text-[22px] font-semibold text-text-primary mb-2">
          Campaign launched successfully
        </h2>
        <p className="text-[13px] text-text-secondary max-w-[520px] mx-auto leading-relaxed">
          Your campaign{" "}
          <span className="font-medium text-text-primary">&quot;Godrej Air Phase 3&quot;</span> is live on Meta
          in <span className="font-medium text-text-primary">paused state</span>. Review the setup on Meta Ads Manager, then enable when ready.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-border rounded-card p-5 max-w-[560px] mx-auto mb-6">
        <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-4">
          What was created
        </h3>
        <div className="space-y-2.5">
          {[
            { label: "Campaign", value: "Godrej Air Phase 3 — Lead Gen" },
            { label: "Ad Sets", value: "3 (Whitefield HNI, Sarjapur IT, Broad Bangalore)" },
            { label: "Ads", value: "9 (3 per ad set)" },
            { label: "Lead Forms", value: "2 (High Intent, Quick Inquiry)" },
            { label: "Daily Budget", value: "₹8,000" },
            {
              label: "Status",
              value: (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
                  Paused — ready for review
                </span>
              ),
            },
          ].map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4">
              <span className="text-[12px] text-text-secondary shrink-0">{item.label}</span>
              <span className="text-[12px] text-text-primary font-medium text-right">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Agent card */}
      <div className="bg-white border border-border rounded-card p-5 max-w-[560px] mx-auto mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Bot size={16} strokeWidth={1.5} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold text-text-primary">
              Connect an agent{" "}
              <span className="text-[11px] font-normal text-text-tertiary">(Optional)</span>
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Qualify incoming leads automatically with an AI calling agent.
            </p>
          </div>
          {agentConnected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D] shrink-0">
              <Check size={10} strokeWidth={2.5} />
              Connected
            </span>
          )}
        </div>

        {agentConnected && selectedAgent ? (
          <div className="bg-surface-page border border-border-subtle rounded-[8px] px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-text-primary font-medium truncate">
                {selectedAgent.name}
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {selectedAgent.qualification_rate}% qualification rate &middot;{" "}
                {selectedAgent.languages.join(", ")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAgentConnected(false);
                setAgentId("");
              }}
              className="text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors shrink-0"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="flex-1 h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              <option value="">Select an agent...</option>
              {activeAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} &middot; {a.qualification_rate}% qual rate
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => agentId && setAgentConnected(true)}
              disabled={!agentId}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Connect
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link
          href="/campaigns/camp-7"
          className="inline-flex items-center gap-2 h-10 px-5 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
        >
          View campaign
          <ArrowRight size={14} strokeWidth={2} />
        </Link>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
        >
          All campaigns
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
        >
          <ExternalLink size={13} strokeWidth={1.5} />
          Open in Meta
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Failure                                                 */
/* ──────────────────────────────────────────────────────── */

function FailureView({ onRetry }: { onRetry: () => void }) {
  const [supportState, setSupportState] = useState<"idle" | "sending" | "sent">("idle");
  const userEmail = "sourabh@revspot.ai";

  const requestSupport = () => {
    if (supportState !== "idle") return;
    setSupportState("sending");
    setTimeout(() => setSupportState("sent"), 1500);
  };

  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-full flex items-center justify-center">
          <AlertOctagon size={26} strokeWidth={1.5} className="text-status-error" />
        </div>
        <h2 className="text-[22px] font-semibold text-text-primary mb-2">
          Campaign creation failed
        </h2>
        <p className="text-[13px] text-text-secondary max-w-[520px] mx-auto leading-relaxed">
          We couldn&apos;t create your campaign{" "}
          <span className="font-medium text-text-primary">&quot;Godrej Air Phase 3&quot;</span> on Meta. Review the error below, resolve it, then retry.
        </p>
      </div>

      {/* Support sent banner */}
      {supportState === "sent" && (
        <div className="max-w-[560px] mx-auto mb-5 flex items-start gap-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card px-4 py-3">
          <Check size={14} strokeWidth={2} className="text-[#15803D] mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-[#15803D]">Your request has been raised</div>
            <div className="text-[11px] text-[#166534] mt-0.5 leading-relaxed">
              We&apos;ll contact you at <span className="font-medium">{userEmail}</span> with next steps.
            </div>
          </div>
        </div>
      )}

      {/* Error details card */}
      <div className="bg-white border border-border rounded-card p-5 max-w-[560px] mx-auto mb-6">
        <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-4">
          What went wrong
        </h3>
        <div className="space-y-2.5">
          <FailureRow label="Step" value={FAILURE_CONTEXT.step} />
          <FailureRow label="Issue" value={FAILURE_CONTEXT.issue} valueClass="font-medium" />
          <FailureRow label="Details" value={FAILURE_CONTEXT.details} />
          <FailureRow label="Error Code" value={FAILURE_CONTEXT.errorCode} mono />
          <div className="flex items-start justify-between gap-4">
            <span className="text-[12px] text-text-secondary shrink-0">Status</span>
            <span className="text-[12px] text-status-error font-medium text-right">
              Not created
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 h-10 px-5 bg-text-primary text-white text-[13px] font-medium rounded-button hover:bg-black transition-colors duration-150"
        >
          <RefreshCw size={13} strokeWidth={2} />
          Try again
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Back to Structure
        </button>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
        >
          All campaigns
        </Link>
        {supportState !== "sent" && (
          <button
            type="button"
            onClick={requestSupport}
            disabled={supportState === "sending"}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-status-error border border-status-error/30 rounded-button bg-white hover:bg-[#FEF2F2] transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {supportState === "sending" ? (
              <>
                <span className="h-3 w-3 border-2 border-status-error/40 border-t-status-error rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <LifeBuoy size={13} strokeWidth={1.5} />
                Contact support
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function FailureRow({
  label,
  value,
  valueClass = "",
  mono = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-[12px] text-text-secondary shrink-0">{label}</span>
      <span
        className={`text-[12px] text-text-primary text-right ${valueClass} ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

