"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Zap, Bot, Phone, MessageCircle, Plus, Sparkles, Play, Pause,
  Clock, ArrowRight, Pencil, Upload, FileText, X,
  FolderKanban, Monitor,
} from "lucide-react";
import { projectsList, campaignsList } from "@/lib/campaign-data";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationAgents } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";

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

export default function AgentsMvpPage() {
  const router = useRouter();
  const { isEmpty } = useDemoMode();
  const agents = isEmpty ? [] : agentsMvp;
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<"select" | "ai" | "manual">("select");
  const [projectContext, setProjectContext] = useState("");
  const [contextSource, setContextSource] = useState<"project" | "campaign" | "manual" | "">("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const handleAICreate = () => {
    setIsCreating(true);
    setTimeout(() => {
      setIsCreating(false);
      setShowCreateForm(false);
      router.push("/agents-mvp/amvp-1");
    }, 3000);
  };

  return (
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
        <button onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
          <Plus size={15} strokeWidth={2} /> Create Agent
        </button>
      </motion.div>

      {/* Create Agent */}
      {showCreateForm && (
        <motion.div variants={fadeUp} className="mb-6 bg-white border border-border rounded-card p-6">
          {createMode === "select" && (
            <>
              <h3 className="text-[16px] font-semibold text-text-primary mb-1">Create Agent</h3>
              <p className="text-[12px] text-text-secondary mb-5">Choose how you want to create your agent</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button onClick={() => setCreateMode("ai")}
                  className="text-left p-5 rounded-card border border-border bg-white hover:border-accent hover:bg-accent/5 transition-colors duration-150">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles size={16} strokeWidth={1.5} className="text-accent" />
                    <span className="text-[14px] font-semibold text-text-primary">Create with AI</span>
                  </div>
                  <p className="text-[12px] text-text-tertiary">Describe what you want and AI will set up the agent, objectives, knowledge base, and calling sequence automatically.</p>
                </button>
                <button onClick={() => router.push("/agents-mvp/amvp-1")}
                  className="text-left p-5 rounded-card border border-border bg-white hover:border-accent hover:bg-accent/5 transition-colors duration-150">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Pencil size={16} strokeWidth={1.5} className="text-accent" />
                    <span className="text-[14px] font-semibold text-text-primary">Create Manually</span>
                  </div>
                  <p className="text-[12px] text-text-tertiary">Configure the agent step-by-step: identity, channels, knowledge, conversation flow, objectives, and sequence settings.</p>
                </button>
              </div>
              <button onClick={() => { setShowCreateForm(false); setCreateMode("select"); }}
                className="text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            </>
          )}

          {createMode === "ai" && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} strokeWidth={1.5} className="text-accent" />
                <h3 className="text-[16px] font-semibold text-text-primary">Create with AI</h3>
              </div>
              <p className="text-[12px] text-text-secondary mb-5 leading-relaxed">
                Give AI context about your business so it can build the right agent. Select a project, campaign, or provide context manually.
              </p>

              {/* Context Source Selection */}
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-text-primary mb-2">Where should AI get context from?</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setContextSource("project"); setSelectedCampaign(""); }}
                    className={`text-left p-3 rounded-[8px] border transition-colors ${contextSource === "project" ? "border-accent bg-accent/5" : "border-border hover:border-border-hover"}`}>
                    <FolderKanban size={14} strokeWidth={1.5} className={contextSource === "project" ? "text-accent mb-1" : "text-text-tertiary mb-1"} />
                    <div className="text-[12px] font-medium text-text-primary">Project</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">Use project knowledge base</div>
                  </button>
                  <button onClick={() => { setContextSource("campaign"); setSelectedProject(""); }}
                    className={`text-left p-3 rounded-[8px] border transition-colors ${contextSource === "campaign" ? "border-accent bg-accent/5" : "border-border hover:border-border-hover"}`}>
                    <Monitor size={14} strokeWidth={1.5} className={contextSource === "campaign" ? "text-accent mb-1" : "text-text-tertiary mb-1"} />
                    <div className="text-[12px] font-medium text-text-primary">Campaign</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">Use campaign context</div>
                  </button>
                  <button onClick={() => { setContextSource("manual"); setSelectedProject(""); setSelectedCampaign(""); }}
                    className={`text-left p-3 rounded-[8px] border transition-colors ${contextSource === "manual" ? "border-accent bg-accent/5" : "border-border hover:border-border-hover"}`}>
                    <FileText size={14} strokeWidth={1.5} className={contextSource === "manual" ? "text-accent mb-1" : "text-text-tertiary mb-1"} />
                    <div className="text-[12px] font-medium text-text-primary">Manual</div>
                    <div className="text-[10px] text-text-tertiary mt-0.5">Upload or type context</div>
                  </button>
                </div>
              </div>

              {/* Project Selector */}
              {contextSource === "project" && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">Select a project</label>
                  <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                    <option value="">Choose a project...</option>
                    {projectsList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <p className="text-[10px] text-text-tertiary mt-1">AI will use this project&apos;s knowledge base, brochures, and details as context. The agent won&apos;t be auto-attached to the project.</p>
                </div>
              )}

              {/* Campaign Selector */}
              {contextSource === "campaign" && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">Select a campaign</label>
                  <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                    <option value="">Choose a campaign...</option>
                    {campaignsList.filter(c => c.status !== "draft").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-[10px] text-text-tertiary mt-1">AI will use this campaign&apos;s targeting, creatives, and ad copy as context. The agent won&apos;t be auto-attached.</p>
                </div>
              )}

              {/* Manual Context */}
              {contextSource === "manual" && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">Describe your agent</label>
                  <textarea
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    rows={4}
                    placeholder="e.g., Create a qualification agent for Godrej Air Phase 3. It should call new leads, verify their budget (min ₹1Cr), timeline, and interest in a site visit. Use Voice + WhatsApp."
                    className="w-full px-3 py-2.5 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* Always show additional instructions textarea when project/campaign is selected */}
              {(contextSource === "project" || contextSource === "campaign") && (selectedProject || selectedCampaign) && (
                <div className="mb-4">
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">Additional instructions <span className="text-text-tertiary font-normal">(optional)</span></label>
                  <textarea
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    rows={3}
                    placeholder="Any specific instructions for the agent — e.g., qualification criteria, tone, special handling..."
                    className="w-full px-3 py-2.5 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none leading-relaxed"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button onClick={handleAICreate}
                  disabled={isCreating || (!projectContext.trim() && !selectedProject && !selectedCampaign)}
                  className="inline-flex items-center gap-2 h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {isCreating ? (
                    <><div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Agent...</>
                  ) : (
                    <><Sparkles size={14} strokeWidth={1.5} /> Create with AI</>
                  )}
                </button>
                <button onClick={() => { setCreateMode("select"); setContextSource(""); }}
                  className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors">
                  Back
                </button>
              </div>
            </>
          )}

        </motion.div>
      )}

      {/* Agent Cards */}
      <motion.div variants={fadeUp} className="space-y-4">
        {agents.length === 0 ? (
          <EmptyState
            illustration={<IllustrationAgents />}
            title="No agents created"
            description="Create a voice or WhatsApp agent to start qualifying your leads automatically."
            action={
              <button onClick={() => setShowCreateForm(true)}
                className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
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
  );
}
