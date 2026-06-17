"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowLeft, Phone, PhoneCall, Sparkles, X } from "lucide-react";
import { agentMvpDetails } from "@/lib/voice-agent-data";
import { useAgentMvpStore } from "@/lib/agent-mvp-store";
import { AgentTab } from "@/components/agents-mvp/agent-tab";
import { ConfigurationTab } from "@/components/agents-mvp/configuration-tab";
import { KnowledgeBaseTab } from "@/components/agents-mvp/knowledge-base-tab";
import { FaqsTab } from "@/components/agents-mvp/faqs-tab";
import { QualificationCriteriaTab } from "@/components/agents-mvp/qualification-criteria-tab";
import { TalkToAgentPanel } from "@/components/agents-mvp/talk-to-agent-panel";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

type Tab = "agent" | "configuration" | "knowledge" | "faqs" | "qualification";

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: "Ready To Use", cls: "bg-[#F0FDF4] text-[#15803D]" },
  draft: { label: "Draft", cls: "bg-surface-secondary text-text-secondary" },
  paused: { label: "Paused", cls: "bg-[#FEF3C7] text-[#92400E]" },
};

export default function AgentMvpDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("agent");
  const [talkOpen, setTalkOpen] = useState(false);

  // User-created agents live in the speedrun store; demo seeds live in
  // the static map. Store wins on collision (slugs are prefixed `new-`
  // so collisions shouldn't happen anyway).
  const userAgent = useAgentMvpStore((s) => s.agents[agentId]);
  const agent = userAgent ?? agentMvpDetails[agentId];

  // Dopamine moment: when arriving from /agents-mvp/create, auto-open
  // the Talk-to-agent panel so the very first thing the user does is
  // hear their bot speak. Single-shot — strip the flag after firing.
  const justCreated = searchParams.get("just_created") === "1";
  useEffect(() => {
    if (!justCreated || !agent) return;
    const t = setTimeout(() => setTalkOpen(true), 300);
    return () => clearTimeout(t);
  }, [justCreated, agent]);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary text-[14px]">Agent not found.</p>
      </div>
    );
  }

  const sCfg = statusConfig[agent.status] ?? statusConfig.draft;

  const tabs: { key: Tab; label: string }[] = [
    { key: "agent", label: "Agent" },
    { key: "configuration", label: "Configuration" },
    { key: "knowledge", label: "Knowledge Base" },
    { key: "faqs", label: "FAQs" },
    { key: "qualification", label: "Qualification Criteria" },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push("/agents-mvp")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">
          Tools &rsaquo; Agents MVP &rsaquo; {agent.name}
        </span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-page-title text-text-primary">{agent.name}</h1>
              <span
                className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${sCfg.cls}`}
              >
                {sCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-text-secondary">
              <span>
                {agent.agentType} &bull; ID: {agent.agentId}
              </span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1">
                <Phone size={11} strokeWidth={1.5} />
                {agent.phoneNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              onClick={() => setTalkOpen(true)}
              className="h-9 px-4 text-[13px] font-medium bg-text-primary text-white rounded-button hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <PhoneCall size={14} strokeWidth={1.75} />
              Talk to agent
            </button>
          </div>
        </div>

        {/* Just-created banner — only fires on the first visit after the
            speedrun create flow. Frames the prompt + voice + FAQs as a
            starting point so the user feels in control of what comes
            next. Auto-dismissable; reload clears the ?just_created flag. */}
        <AnimatePresence>
          {justCreated && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 flex items-start gap-3 px-3.5 py-2.5 bg-[#FAF8F2] border border-[#E9DEC2] rounded-card"
            >
              <Sparkles size={14} strokeWidth={1.75} className="text-[#92400E] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-[#92400E]">
                  Spot calibrated {agent.name} from your goal — try it now.
                </p>
                <p className="text-[11.5px] text-[#92400E]/80 mt-0.5">
                  Voice, prompt, and FAQs are pre-filled. Edit any of them in the tabs below.
                </p>
              </div>
              <button
                onClick={() => router.replace(`/agents-mvp/${agentId}`)}
                className="p-1 rounded-button text-[#92400E]/70 hover:text-[#92400E] hover:bg-[#E9DEC2]/40 transition-colors"
                aria-label="Dismiss"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
              activeTab === tab.key
                ? "text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="agent-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                transition={{ duration: 0.15 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "agent" && <AgentTab agent={agent} />}
        {activeTab === "configuration" && <ConfigurationTab agent={agent} />}
        {activeTab === "knowledge" && <KnowledgeBaseTab agent={agent} />}
        {activeTab === "faqs" && <FaqsTab agent={agent} />}
        {activeTab === "qualification" && <QualificationCriteriaTab agent={agent} />}
      </div>
    </motion.div>
  );
}
