"use client";

// Shown on /enrichment-crm-empty, the "no CRM connected" flow.
// Two pieces:
//   - CrmConnectBanner: amber strip at the top of the page, replaces CrmStatusBanner.
//   - CrmConnectHero:  big card inside the Activity tab, replaces CrmActivity.
// Both nudge the user toward connecting a CRM. Bulk + Single tabs still work below.

import { ArrowRight, Briefcase, CheckCircle2, CircleDollarSign, PlugZap, Sparkles, Upload, UserSearch, Zap } from "lucide-react";

interface NudgeProps {
  onConnect: () => void;
  onManual?: () => void; // switch to bulk/single tab
  /** When true, banner shows the post-submit "we're on it" state instead of CTA. */
  pending?: boolean;
}

// ── Top banner ───────────────────────────────────────────────────────────

export function CrmConnectBanner({ onConnect, pending = false }: NudgeProps) {
  // Pending state: request submitted, support team is the next mover.
  if (pending) {
    return (
      <div className="flex items-start sm:items-center gap-3 flex-wrap bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0] rounded-card px-4 py-3 mb-4">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-button bg-white border border-[#BBF7D0] flex-shrink-0">
          <CheckCircle2 size={15} strokeWidth={1.75} className="text-[#15803D]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text-primary">
            Your CRM connect request is in
          </div>
          <div className="text-[12px] text-text-secondary mt-0.5">
            Action on your side is complete. Our team will reach out to wire up the integration. Bulk and single lookup still work in the meantime.
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11.5px] font-medium text-[#15803D] bg-white border border-[#BBF7D0] rounded-button flex-shrink-0">
          Request submitted
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start sm:items-center gap-3 flex-wrap bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-card px-4 py-3 mb-4">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-button bg-white border border-[#FDE68A] flex-shrink-0">
        <PlugZap size={15} strokeWidth={1.75} className="text-[#B45309]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text-primary">
          Your CRM isn&rsquo;t connected yet
        </div>
        <div className="text-[12px] text-text-secondary mt-0.5">
          Connect Salesforce, HubSpot, Zoho, LeadSquared, or a custom webhook to enrich leads automatically the moment they hit your CRM, and write the enriched data back to the same record.
        </div>
      </div>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors flex-shrink-0"
      >
        Connect CRM
        <ArrowRight size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Activity-tab hero (big card) ────────────────────────────────────────

export function CrmConnectHero({ onConnect, onManual }: NudgeProps) {
  return (
    <section className="bg-white border border-border rounded-card overflow-hidden">
      {/* Hero header */}
      <div className="relative px-6 sm:px-10 pt-10 pb-8 bg-gradient-to-br from-[#FAFAFA] via-white to-[#F0FDF4] border-b border-border-subtle overflow-hidden">
        {/* Decorative glyph */}
        <div className="absolute top-6 right-6 hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-white border border-border-subtle">
          <PlugZap size={22} strokeWidth={1.5} className="text-text-secondary" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-badge px-2 py-1 mb-3">
          <Sparkles size={11} strokeWidth={2} />
          Recommended setup
        </div>
        <h2 className="text-[22px] sm:text-[26px] font-semibold text-text-primary tracking-tight max-w-[640px]">
          Plug in your CRM to unlock auto-enrichment
        </h2>
        <p className="text-[13.5px] text-text-secondary mt-2 max-w-[640px] leading-relaxed">
          Every new lead in your CRM gets <span className="font-medium text-text-primary">Professional</span> and{" "}
          <span className="font-medium text-text-primary">Financial</span> data appended automatically, then written back to the same record. No manual exports, no copy-paste.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors"
          >
            Connect CRM
            <ArrowRight size={13} strokeWidth={2} />
          </button>
          {onManual && (
            <button
              onClick={onManual}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-text-secondary hover:text-text-primary border border-border rounded-button bg-white transition-colors"
            >
              <Upload size={13} strokeWidth={1.75} />
              Use CSV upload meanwhile
            </button>
          )}
        </div>
      </div>

      {/* What enrichment fills in */}
      <div className="px-6 sm:px-10 py-7 border-b border-border-subtle">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
          What enrichment fills in
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DataCard
            icon={<Briefcase size={14} strokeWidth={1.75} />}
            tint="blue"
            title="Professional"
            items={["Verified name & gender", "Job title & seniority", "Company, industry, size", "LinkedIn URL & work email"]}
          />
          <DataCard
            icon={<CircleDollarSign size={14} strokeWidth={1.75} />}
            tint="green"
            title="Financial"
            items={["Income band", "Net-worth signals", "Investment capacity", "Affordability score"]}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="px-6 sm:px-10 py-7 border-b border-border-subtle">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
          How it works once connected
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Step
            n={1}
            icon={<UserSearch size={13} strokeWidth={1.75} />}
            title="Lead lands in CRM"
            body="Web form, API, native entry, chat, or import, Revspot watches every channel."
          />
          <Step
            n={2}
            icon={<Zap size={13} strokeWidth={1.75} />}
            title="We enrich in real time"
            body="Pro + Financial data attached within seconds. Zero manual work."
          />
          <Step
            n={3}
            icon={<ArrowRight size={13} strokeWidth={1.75} />}
            title="Written back to the lead"
            body="Mapped to your CRM fields. Sales reps see enriched data on the same record."
          />
        </div>
      </div>

      {/* Supported providers */}
      <div className="px-6 sm:px-10 py-6 bg-surface-page/40">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
          Supported CRMs
        </div>
        <div className="flex flex-wrap gap-2">
          {["Salesforce", "HubSpot", "Zoho", "LeadSquared", "Freshsales", "Paramantra", "Custom webhook"].map((p) => (
            <span
              key={p}
              className="inline-flex items-center text-[12px] font-medium text-text-secondary bg-white border border-border rounded-button px-2.5 py-1"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Small bits ──────────────────────────────────────────────────────────

function DataCard({
  icon,
  tint,
  title,
  items,
}: {
  icon: React.ReactNode;
  tint: "blue" | "green";
  title: string;
  items: string[];
}) {
  const tintBg = tint === "blue" ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-[#F0FDF4] text-[#15803D]";
  return (
    <div className="border border-border-subtle rounded-card p-4 bg-white">
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-button ${tintBg}`}>
          {icon}
        </span>
        <div className="text-[13px] font-semibold text-text-primary">{title}</div>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it} className="text-[12.5px] text-text-secondary flex items-start gap-2">
            <span className="mt-1 w-1 h-1 rounded-full bg-text-tertiary flex-shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-text-primary text-white text-[10px] font-semibold tabular-nums">
          {n}
        </span>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-button bg-surface-secondary text-text-secondary">
          {icon}
        </span>
        <span className="text-[12.5px] font-semibold text-text-primary">{title}</span>
      </div>
      <p className="text-[12px] text-text-secondary leading-snug pl-7">{body}</p>
    </div>
  );
}
