"use client";

import { useState } from "react";
import {
  ArrowLeft, Rocket, Bot, ShieldCheck, Lock, Info, Pause, Play, Check,
} from "lucide-react";
import { newAgentsList } from "@/lib/voice-agent-data";

interface Step4Props {
  onNext: () => void;
  onBack: () => void;
}

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center",
};

export function Step4Launch({ onNext, onBack }: Step4Props) {
  const [launching, setLaunching] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [launchState, setLaunchState] = useState<"paused" | "enabled">("paused");

  // Verification — ON by default, locked ON if objective is verified_leads
  const isVerifiedLeadsObjective = true;
  const [verificationEnabled, setVerificationEnabled] = useState(true);

  const handleLaunch = () => {
    setLaunching(true);
    setTimeout(() => { setLaunching(false); onNext(); }, 2000);
  };

  const activeAgents = newAgentsList.filter(a => a.status === "active");
  const agent = activeAgents.find(a => a.id === selectedAgent);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-[20px] font-semibold text-text-primary">Launch Campaign</h2>
        <p className="text-meta text-text-secondary mt-1">Review settings and launch your campaign</p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-surface-page border border-border-subtle rounded-card p-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">Campaign</span>
            <span className="block text-[13px] text-text-primary font-medium">Godrej Air Phase 3</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">Ad Account</span>
            <span className="block text-[13px] text-text-primary font-medium">Godrej Properties — Primary</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">Ad Sets</span>
            <span className="block text-[13px] text-text-primary font-medium">3</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">Daily Budget</span>
            <span className="block text-[13px] text-text-primary font-medium">₹8,000</span>
          </div>
        </div>
      </div>

      {/* Lead Verification */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={16} strokeWidth={1.5} className="text-[#15803D]" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-text-primary">Lead Verification</h3>
              <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                Automatically verify incoming leads via phone/email.
                {isVerifiedLeadsObjective && (
                  <span className="text-[11px] text-[#15803D] font-medium block mt-1">
                    Required — your campaign objective is set to Verified Leads
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {isVerifiedLeadsObjective && <Lock size={12} strokeWidth={2} className="text-text-tertiary" />}
            <button type="button"
              onClick={() => !isVerifiedLeadsObjective && setVerificationEnabled(!verificationEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 ${
                verificationEnabled ? "bg-[#15803D]" : "bg-gray-200"
              } ${isVerifiedLeadsObjective ? "opacity-70 cursor-not-allowed" : ""}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150 ${
                verificationEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Agent Selection (Optional) */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Bot size={16} strokeWidth={1.5} className="text-accent" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary">Connect Agent <span className="text-[12px] font-normal text-text-tertiary">(Optional)</span></h3>
            <p className="text-[12px] text-text-secondary mt-0.5">Select an agent to automatically qualify leads from this campaign</p>
          </div>
        </div>

        <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
          className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
          style={selectStyle}>
          <option value="">No agent — skip qualification</option>
          {activeAgents.map((a) => (
            <option key={a.id} value={a.id}>{a.name} · {a.qualification_rate}% qual rate</option>
          ))}
        </select>

        {agent && (
          <div className="mt-3 bg-surface-page border border-border-subtle rounded-[8px] px-4 py-3">
            <div className="text-[12px] text-text-primary font-medium">{agent.name}</div>
            <div className="text-[11px] text-text-secondary mt-0.5">{agent.languages.join(", ")} · {agent.qualification_rate}% qualification rate</div>
            <div className="text-[11px] text-text-tertiary mt-0.5">{agent.objectives_count} objectives · {agent.supported_channels.join(" + ")}</div>
          </div>
        )}

        {!selectedAgent && (
          <div className="mt-3 flex items-start gap-2 text-[11px] text-text-tertiary leading-relaxed">
            <Info size={13} strokeWidth={1.5} className="shrink-0 mt-0.5" />
            <span>You can launch without an agent. Qualification metrics (Qualified Leads, CPQL, Qualification Rate) won&apos;t be available until you connect an agent from the campaign settings.</span>
          </div>
        )}
      </div>

      {/* Launch state — choose how campaign goes live on Meta */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
            <Rocket size={15} strokeWidth={1.5} className="text-text-secondary" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-text-primary">Launch state on Meta</h3>
            <p className="text-[12px] text-text-secondary mt-0.5">Choose how the campaign is created in Meta Ads Manager</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Paused option */}
          <button
            type="button"
            onClick={() => setLaunchState("paused")}
            className={`relative text-left p-4 rounded-card border transition-all duration-150 ${
              launchState === "paused"
                ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                : "border-border bg-white hover:border-accent/40"
            }`}
          >
            {launchState === "paused" && (
              <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
                <Check size={10} strokeWidth={3} className="text-white" />
              </div>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <Pause size={13} strokeWidth={2} className="text-text-secondary" />
              <span className="text-[13px] font-semibold text-text-primary">Paused</span>
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Created in paused state. Review targeting &amp; creatives on Meta Ads Manager, then enable when ready.
            </p>
          </button>

          {/* Active option */}
          <button
            type="button"
            onClick={() => setLaunchState("enabled")}
            className={`relative text-left p-4 rounded-card border transition-all duration-150 ${
              launchState === "enabled"
                ? "border-[#15803D] bg-[#F0FDF4] ring-1 ring-[#15803D]/20"
                : "border-border bg-white hover:border-[#15803D]/40"
            }`}
          >
            {launchState === "enabled" && (
              <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-[#15803D] flex items-center justify-center">
                <Check size={10} strokeWidth={3} className="text-white" />
              </div>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <Play size={13} strokeWidth={2} className="text-[#15803D]" />
              <span className="text-[13px] font-semibold text-text-primary">Active</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Goes live immediately on Meta. Budget starts spending and ads start serving right away.
            </p>
          </button>
        </div>

        {/* Subtle hint under selection */}
        <div className="mt-3 flex items-start gap-2 text-[11px] text-text-tertiary leading-relaxed">
          <Info size={12} strokeWidth={1.5} className="shrink-0 mt-0.5" />
          <span>
            {launchState === "paused"
              ? "You can enable the campaign from the campaign detail page or on Meta Ads Manager."
              : "Ads will start serving within minutes of Meta approval. You can pause anytime."}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
          <ArrowLeft size={15} strokeWidth={1.5} /> Back
        </button>
        <button onClick={handleLaunch} disabled={launching}
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-50">
          {launching ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating on Meta...</>
          ) : (
            <>
              <Rocket size={15} strokeWidth={1.5} />
              Create Campaign on Meta
              <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-white/20 ml-1">
                {launchState === "paused" ? "Paused" : "Active"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
