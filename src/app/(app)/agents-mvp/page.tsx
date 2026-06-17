"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bot, Phone, MessageCircle, Plus, Pause, Clock,
} from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationAgents } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";
import {
  TemplatePickerModal,
  type TemplateKey,
} from "@/components/agents-mvp/template-picker-modal";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// Mock agents with packaged sequence
const agentsMvp = [
  {
    id: "amvp-1",
    name: "Godrej Air — Lead Qualifier",
    status: "active" as const,
    channels: ["Voice", "WhatsApp"],
    campaign: "Godrej Air Phase 3 — Lead Gen",
    createdBy: "AI (Campaign Launcher)",
    objectives: ["Budget fit (≥₹1Cr)", "Timeline (≤6 months)", "Site visit interest", "Decision maker"],
    sequence: {
      dailyLimit: 200,
      callingHours: "10 AM – 7 PM",
      retryPolicy: "2 retries, 4-hour interval",
      followUpRules: ["No answer → Retry 4h", "Partially qualified → Follow up 48h", "Not interested → Stop"],
    },
    stats: { totalCalls: 342, connected: 268, qualified: 89, qualRate: 33.2, avgDuration: 3.1 },
  },
  {
    id: "amvp-2",
    name: "Godrej Reflections — Re-engagement",
    status: "active" as const,
    channels: ["Voice"],
    campaign: "Godrej Reflections Habitat — Lead Gen",
    createdBy: "AI (Campaign Launcher)",
    objectives: ["Re-confirm interest", "Budget update", "Schedule site visit"],
    sequence: {
      dailyLimit: 100,
      callingHours: "10 AM – 6 PM",
      retryPolicy: "3 retries, 6-hour interval",
      followUpRules: ["No answer → Retry 6h", "Callback → Follow up 24h", "Not interested → Stop"],
    },
    stats: { totalCalls: 156, connected: 112, qualified: 42, qualRate: 37.5, avgDuration: 2.8 },
  },
];

// Wrap the body in Suspense because it consumes useSearchParams.
// Without this Next.js 16 fails the production build with
// "useSearchParams() should be wrapped in a suspense boundary"
// during static prerender — see /agents-mvp?create=1&onboarding=1
// deep-link flow.
export default function AgentsMvpPage() {
  return (
    <Suspense fallback={null}>
      <AgentsMvpInner />
    </Suspense>
  );
}

function AgentsMvpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isEmpty } = useDemoMode();
  const agents = isEmpty ? [] : agentsMvp;

  // Template-picker modal. Opened from the "Create Agent" button or from
  // a ?create=1 deep-link. On pick, we navigate to /agents-mvp/create
  // with the chosen template encoded as a query param — the create page
  // jumps straight into the wizard on Step 1.
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Deep-link: /agents-mvp?create=1 → open the picker.
  // ?onboarding=1 is preserved through the navigation so the create
  // page knows to route back to /welcome after the agent is saved.
  useEffect(() => {
    if (searchParams?.get("create") === "1") {
      setShowTemplateModal(true);
    }
  }, [searchParams]);

  const onPickTemplate = (key: TemplateKey) => {
    setShowTemplateModal(false);
    const onboarding = searchParams?.get("onboarding") === "1";
    const qs = new URLSearchParams();
    qs.set("template", key);
    if (onboarding) qs.set("onboarding", "1");
    router.push(`/agents-mvp/create?${qs.toString()}`);
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
          <div>
            <div className="text-meta text-text-secondary mb-1">Tools</div>
            <div className="flex items-center gap-2">
              <h1 className="text-page-title text-text-primary">Agents MVP</h1>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-accent/10 text-accent">Beta</span>
            </div>
            <p className="text-[12px] text-text-secondary mt-1">AI agents with built-in sequences — created automatically from campaign context</p>
          </div>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
          >
            <Plus size={15} strokeWidth={2} /> Create Agent
          </button>
        </motion.div>

        {/* Agent Cards */}
        <motion.div variants={fadeUp} className="space-y-4">
          {agents.length === 0 ? (
            <EmptyState
              illustration={<IllustrationAgents />}
              title="No agents created"
              description="Create a voice or WhatsApp agent to start qualifying your leads automatically."
              action={
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
                >
                  Create Agent
                </button>
              }
            />
          ) : agents.map((agent) => (
            <div key={agent.id} onClick={() => router.push(`/agents-mvp/${agent.id}`)}
              className="bg-white border border-border rounded-card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow duration-150">
              {/* Agent Header */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-[14px] font-semibold text-text-primary">{agent.name}</h3>
                      {agent.channels.map((ch) => (
                        <span key={ch} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge ${
                          ch === "Voice" ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-[#F0FDF4] text-[#15803D]"
                        }`}>
                          {ch === "Voice" ? <Phone size={10} strokeWidth={2} /> : <MessageCircle size={10} strokeWidth={2} />}
                          {ch}
                        </span>
                      ))}
                      <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">Active</span>
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      Campaign: <span className="text-text-primary font-medium">{agent.campaign}</span>
                      <span className="mx-1.5 text-border">·</span>
                      Created by: <span className="text-accent font-medium">{agent.createdBy}</span>
                    </div>
                  </div>
                  <button onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-button text-text-tertiary hover:text-[#92400E] hover:bg-[#FEF3C7] transition-colors" title="Pause">
                    <Pause size={13} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Stats + Details in two columns */}
              <div className="grid grid-cols-2 border-t border-border-subtle">
                {/* Left: Agent Details */}
                <div className="p-5 border-r border-border-subtle">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock size={13} strokeWidth={1.5} className="text-text-tertiary" />
                      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">Sequence (Built-in)</span>
                    </div>
                    <div className="text-[11px] text-text-secondary space-y-1">
                      <p>{agent.sequence.dailyLimit} calls/day · {agent.sequence.callingHours}</p>
                      <p>{agent.sequence.retryPolicy}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agent.sequence.followUpRules.map((rule, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-text-tertiary">{rule}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Performance Stats */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Bot size={13} strokeWidth={1.5} className="text-text-tertiary" />
                    <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">Performance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[22px] font-bold text-text-primary tabular-nums">{agent.stats.totalCalls}</span>
                      <span className="block text-[11px] text-text-tertiary">Total Calls</span>
                    </div>
                    <div>
                      <span className="block text-[22px] font-bold text-text-primary tabular-nums">{agent.stats.connected}</span>
                      <span className="block text-[11px] text-text-tertiary">Connected</span>
                    </div>
                    <div>
                      <span className="block text-[22px] font-bold text-accent tabular-nums">{agent.stats.qualified}</span>
                      <span className="block text-[11px] text-text-tertiary">Qualified</span>
                    </div>
                    <div>
                      <span className="block text-[22px] font-bold text-text-primary tabular-nums">{agent.stats.qualRate}%</span>
                      <span className="block text-[11px] text-text-tertiary">Qual Rate</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle text-[11px] text-text-tertiary">
                    Avg call duration: {agent.stats.avgDuration} min
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Template-picker modal */}
      <TemplatePickerModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onPick={onPickTemplate}
      />
    </>
  );
}
