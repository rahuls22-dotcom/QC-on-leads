"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ArrowLeft, Phone, FlaskConical, PhoneCall, Check, X } from "lucide-react";
import { agentMvpDetails } from "@/lib/voice-agent-data";
import { AgentTab } from "@/components/agents/agent-tab";
import { ConfigurationTab } from "@/components/agents/configuration-tab";
import { KnowledgeBaseTab } from "@/components/agents/knowledge-base-tab";
import { FaqsTab } from "@/components/agents/faqs-tab";
import { QualificationCriteriaTab } from "@/components/agents/qualification-criteria-tab";

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
  const agentId = params.id as string;
  const [activeTab, setActiveTab] = useState<Tab>("agent");
  const [showTestCall, setShowTestCall] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const agent = agentMvpDetails[agentId];

  const handleTestCall = () => {
    if (!testPhone.trim()) return;
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    }, 2000);
  };

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
          onClick={() => router.push("/agents")}
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
            <button className="h-9 px-4 text-[13px] font-medium border border-border rounded-button bg-white text-text-primary hover:bg-surface-page transition-colors inline-flex items-center gap-1.5">
              <FlaskConical size={14} strokeWidth={1.5} />
              Test Agent
            </button>
            <button onClick={() => setShowTestCall(!showTestCall)}
              className={`h-9 px-4 text-[13px] font-medium rounded-button transition-colors inline-flex items-center gap-1.5 ${
                showTestCall ? "bg-accent/10 text-accent border border-accent/30" : "bg-accent text-white hover:bg-accent-hover"
              }`}>
              <PhoneCall size={14} strokeWidth={1.5} />
              Test Call
            </button>
          </div>
        </div>

        {/* Test Call Section */}
        {showTestCall && (
          <div className="mt-3 bg-surface-page border border-border-subtle rounded-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[13px] text-text-secondary shrink-0">+91</span>
                <input type="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="flex-1 h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary" />
              </div>
              <button onClick={handleTestCall} disabled={!testPhone.trim() || isTesting}
                className="h-9 px-4 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors disabled:opacity-40 inline-flex items-center gap-1.5">
                {isTesting ? (
                  <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calling...</>
                ) : (
                  <><PhoneCall size={13} strokeWidth={1.5} /> Make Test Call</>
                )}
              </button>
              <button onClick={() => { setShowTestCall(false); setTestPhone(""); setTestSuccess(false); }}
                className="p-1.5 text-text-tertiary hover:text-text-primary rounded-button hover:bg-surface-secondary">
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
            {testSuccess && (
              <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#15803D] font-medium">
                <Check size={13} strokeWidth={2} /> Test call initiated to +91 {testPhone}
              </div>
            )}
          </div>
        )}
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
