"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  X,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import {
  triggerTypes,
  csvPreviewHeaders,
  csvPreviewRows,
} from "@/lib/workflow-data";
import { newAgentsList } from "@/lib/voice-agent-data";
import type { TriggerType, FollowUpRule } from "@/lib/types/workflow";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const STEPS = [
  { num: 1, label: "Trigger" },
  { num: 2, label: "Routing" },
  { num: 3, label: "Agent Selection" },
  { num: 4, label: "Cadence & Schedule" },
  { num: 5, label: "Review" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const OUTCOME_OPTIONS = [
  "No answer",
  "Voicemail",
  "Partially qualified",
  "Callback requested",
  "Not interested",
  "Qualified",
  "Wrong number",
];

const ACTION_OPTIONS: FollowUpRule["action"][] = ["retry", "follow_up", "stop"];

const DEFAULT_FOLLOW_UP_RULES: FollowUpRule[] = [
  { id: "fur-1", outcome: "No answer", action: "retry", delay_hours: 4, description: "Retry in 4 hours" },
  { id: "fur-2", outcome: "Partially qualified", action: "follow_up", delay_hours: 48, description: "Follow up in 48 hours" },
  { id: "fur-3", outcome: "Callback requested", action: "follow_up", delay_hours: 24, description: "Follow up in 24 hours" },
  { id: "fur-4", outcome: "Voicemail", action: "retry", delay_hours: 6, description: "Retry in 6 hours" },
  { id: "fur-5", outcome: "Not interested", action: "stop", delay_hours: 0, description: "Stop" },
];

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center",
};

interface RoutingRule {
  field: string;
  operator: string;
  value: string;
}

interface Branch {
  id: string;
  label: string;
  agentId: string;
  rules: RoutingRule[];
}

interface CadenceState {
  dailyLimit: string;
  startTime: string;
  endTime: string;
  activeDays: string[];
  retryEnabled: boolean;
  maxRetries: string;
  retryInterval: string;
  followUpRules: FollowUpRule[];
}

const DEFAULT_CADENCE: CadenceState = {
  dailyLimit: "200",
  startTime: "10:00",
  endTime: "19:00",
  activeDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  retryEnabled: true,
  maxRetries: "2",
  retryInterval: "4",
  followUpRules: DEFAULT_FOLLOW_UP_RULES,
};

export default function CreateWorkflowPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — Trigger
  const [triggerType, setTriggerType] = useState<TriggerType | "">("");
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");

  // Step 2 — Routing
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [routingMode, setRoutingMode] = useState<"rules" | "ai">("rules");
  const [aiRoutingPrompt, setAiRoutingPrompt] = useState("");
  const [branches, setBranches] = useState<Branch[]>([
    { id: "br-1", label: "Branch 1", agentId: "", rules: [{ field: "", operator: "equals", value: "" }] },
  ]);

  // Step 3 — Agent Selection (single, when no routing)
  const [singleAgentId, setSingleAgentId] = useState("");

  // Step 4 — Cadence & Schedule (single-agent / default_step)
  const [dailyLimit, setDailyLimit] = useState("200");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");
  const [activeDays, setActiveDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [maxRetries, setMaxRetries] = useState("2");
  const [retryInterval, setRetryInterval] = useState("4");
  const [followUpRules, setFollowUpRules] = useState<FollowUpRule[]>(DEFAULT_FOLLOW_UP_RULES);

  // Step 4 — Per-branch cadence (when routing is enabled)
  const [branchCadences, setBranchCadences] = useState<Record<string, CadenceState>>({
    "br-1": { ...DEFAULT_CADENCE, followUpRules: DEFAULT_FOLLOW_UP_RULES.map((r) => ({ ...r })) },
  });

  const toggleDay = (day: string) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const updateBranchCadence = (branchId: string, updates: Partial<CadenceState>) => {
    setBranchCadences((prev) => ({
      ...prev,
      [branchId]: { ...prev[branchId], ...updates },
    }));
  };

  const toggleBranchDay = (branchId: string, day: string) => {
    setBranchCadences((prev) => {
      const cadence = prev[branchId];
      return {
        ...prev,
        [branchId]: {
          ...cadence,
          activeDays: cadence.activeDays.includes(day)
            ? cadence.activeDays.filter((d) => d !== day)
            : [...cadence.activeDays, day],
        },
      };
    });
  };

  const addBranchFollowUpRule = (branchId: string) => {
    setBranchCadences((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        followUpRules: [
          ...prev[branchId].followUpRules,
          { id: `fur-${Date.now()}`, outcome: "No answer", action: "retry" as const, delay_hours: 4, description: "" },
        ],
      },
    }));
  };

  const removeBranchFollowUpRule = (branchId: string, ruleId: string) => {
    setBranchCadences((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        followUpRules: prev[branchId].followUpRules.filter((r) => r.id !== ruleId),
      },
    }));
  };

  const updateBranchFollowUpRule = (branchId: string, ruleId: string, updates: Partial<FollowUpRule>) => {
    setBranchCadences((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        followUpRules: prev[branchId].followUpRules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
      },
    }));
  };

  const addBranch = () => {
    if (branches.length >= 3) return;
    const newId = `br-${Date.now()}`;
    setBranches((prev) => [
      ...prev,
      {
        id: newId,
        label: `Branch ${prev.length + 1}`,
        agentId: "",
        rules: [{ field: "", operator: "equals", value: "" }],
      },
    ]);
    setBranchCadences((prev) => ({
      ...prev,
      [newId]: { ...DEFAULT_CADENCE, followUpRules: DEFAULT_FOLLOW_UP_RULES.map((r) => ({ ...r })) },
    }));
  };

  const removeBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    setBranchCadences((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateBranch = (id: string, updates: Partial<Branch>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const updateBranchRule = (branchId: string, ruleIdx: number, updates: Partial<RoutingRule>) => {
    setBranches((prev) =>
      prev.map((b) => {
        if (b.id !== branchId) return b;
        const rules = [...b.rules];
        rules[ruleIdx] = { ...rules[ruleIdx], ...updates };
        return { ...b, rules };
      })
    );
  };

  const addFollowUpRule = () => {
    setFollowUpRules((prev) => [
      ...prev,
      { id: `fur-${Date.now()}`, outcome: "No answer", action: "retry", delay_hours: 4, description: "" },
    ]);
  };

  const removeFollowUpRule = (id: string) => {
    setFollowUpRules((prev) => prev.filter((r) => r.id !== id));
  };

  const updateFollowUpRule = (id: string, updates: Partial<FollowUpRule>) => {
    setFollowUpRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const canNext = () => {
    if (step === 1) return triggerType !== "";
    return true;
  };

  const triggerLabel = triggerTypes.find((t) => t.type === triggerType)?.label ?? triggerType;

  /** Find the selected agent's data from newAgentsList */
  const getAgentInfo = (agentId: string) => newAgentsList.find((a) => a.id === agentId);

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push("/workflows")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">
          Lead Generation &rsaquo; Sequences &rsaquo; Create
        </span>
      </div>

      <div className="max-w-[720px]">
        <h1 className="text-page-title text-text-primary mb-1">Create Sequence</h1>
        <p className="text-meta text-text-secondary mb-8">
          Build an automated sequence to process leads end-to-end
        </p>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1">
              <button
                onClick={() => step > s.num && setStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors duration-150 ${
                  step === s.num
                    ? "bg-accent text-white"
                    : step > s.num
                    ? "bg-[#F0FDF4] text-[#15803D] cursor-pointer"
                    : "bg-surface-secondary text-text-tertiary"
                }`}
              >
                {step > s.num ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  <span>{s.num}</span>
                )}
                <span>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-4 h-px bg-border" />
              )}
            </div>
          ))}
        </div>

        {/* ──────────── Step 1: Trigger ──────────── */}
        {step === 1 && (
          <div className="bg-white border border-border rounded-card p-6 mb-5">
            <h2 className="text-card-title text-text-primary mb-4">Select Trigger</h2>
            <div className="grid grid-cols-1 gap-2">
              {triggerTypes.map((t) => (
                <button
                  key={t.type}
                  onClick={() => { if (!t.comingSoon) { setTriggerType(t.type); setCsvUploaded(false); } }}
                  className={`flex items-start gap-3 text-left px-4 py-3 rounded-[8px] border transition-all duration-150 ${
                    t.comingSoon
                      ? "border-border bg-surface-page/50 opacity-60 cursor-not-allowed"
                      : triggerType === t.type
                        ? "border-accent bg-[#EFF6FF]/50 ring-1 ring-accent/20"
                        : "border-border hover:border-border-hover hover:bg-surface-page/50"
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      triggerType === t.type && !t.comingSoon ? "border-accent" : "border-border"
                    }`}
                  >
                    {triggerType === t.type && !t.comingSoon && (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-text-primary">{t.label}</span>
                      {t.comingSoon && (
                        <span className="text-[10px] font-medium text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">Coming soon</span>
                      )}
                    </div>
                    <div className="text-[12px] text-text-secondary mt-0.5">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* CSV Upload area */}
            {triggerType === "csv_upload" && (
              <div className="mt-5">
                {!csvUploaded ? (
                  <div
                    onClick={() => setCsvUploaded(true)}
                    className="border-2 border-dashed border-border rounded-input p-8 text-center cursor-pointer hover:border-border-hover hover:bg-surface-page/50 transition-all duration-150"
                  >
                    <Upload size={24} strokeWidth={1.5} className="mx-auto text-text-tertiary mb-3" />
                    <p className="text-[13px] text-text-secondary">
                      Drag & drop your CSV file, or <span className="text-accent font-medium">browse</span>
                    </p>
                    <p className="text-[11px] text-text-tertiary mt-1">.csv files only</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-surface-page rounded-[6px] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={16} strokeWidth={1.5} className="text-text-secondary" />
                        <span className="text-[13px] text-text-primary font-medium">
                          godrej_reflections_leads.csv
                        </span>
                      </div>
                      <button
                        onClick={() => setCsvUploaded(false)}
                        className="text-text-tertiary hover:text-text-primary transition-colors duration-150"
                      >
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} strokeWidth={2} className="text-status-success" />
                        <span className="text-[12px] text-text-primary font-medium">487 contacts detected</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={13} strokeWidth={2} className="text-status-warning" />
                        <span className="text-[12px] text-text-secondary">12 duplicates removed</span>
                      </div>
                    </div>
                    <div className="border border-border-subtle rounded-[6px] overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-surface-page border-b border-border-subtle">
                            {csvPreviewHeaders.map((h) => (
                              <th key={h} className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreviewRows.map((row, i) => (
                            <tr key={i} className="border-b border-border-subtle last:border-0">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5 text-[11px] text-text-secondary">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-3 py-1.5 bg-surface-page text-[10px] text-text-tertiary">
                        Showing 5 of 487 rows
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Lead selector */}
            {triggerType === "campaign_lead" && (
              <div className="mt-5">
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Select Campaign</label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                  style={selectStyle}
                >
                  <option value="">Choose a campaign...</option>
                  <option value="camp-1">Godrej Reflections Habitat — Lead Gen</option>
                  <option value="camp-2">Godrej Eternity — Retargeting</option>
                  <option value="camp-3">Godrej Nurture — Lookalike</option>
                  <option value="camp-4">Godrej Platinum — Lead Gen</option>
                  <option value="camp-7">Godrej Air Phase 3 — Lead Gen</option>
                </select>
                <p className="text-[11px] text-text-tertiary mt-1.5">New leads from this campaign will automatically enter the sequence.</p>
              </div>
            )}

            {/* Manual (API) endpoint */}
            {triggerType === "manual" && (
              <div className="mt-5">
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">API Endpoint</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-surface-page border border-border rounded-input px-3 py-2.5 font-mono text-[12px] text-text-primary select-all">
                    POST https://api.revspot.io/v1/sequences/<span className="text-accent">&#123;sequence_id&#125;</span>/trigger
                  </div>
                  <button
                    onClick={() => navigator.clipboard?.writeText("https://api.revspot.io/v1/sequences/{sequence_id}/trigger")}
                    className="h-10 px-3 border border-border rounded-input bg-white text-text-secondary hover:text-text-primary hover:bg-surface-page transition-colors text-[12px] font-medium"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1.5">Send a POST request with lead data in the body to trigger this sequence programmatically.</p>

                <div className="mt-3 bg-surface-page border border-border-subtle rounded-[6px] p-3">
                  <div className="text-[11px] font-medium text-text-secondary mb-1.5">Example payload</div>
                  <pre className="text-[11px] text-text-primary font-mono leading-relaxed">{`{
  "name": "Vikram Reddy",
  "phone": "+919876543210",
  "email": "vikram@example.com",
  "budget": "1.5Cr",
  "source": "website"
}`}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────── Step 2: Routing ──────────── */}
        {step === 2 && (
          <div className="bg-white border border-border rounded-card p-6 mb-5">
            <h2 className="text-card-title text-text-primary mb-4">Lead Routing</h2>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-[13px] text-text-primary">Route leads to different agents?</span>
              <button
                onClick={() => setRoutingEnabled(!routingEnabled)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
                  routingEnabled ? "bg-accent" : "bg-silver-light"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${
                    routingEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {!routingEnabled && (
              <div className="bg-surface-page rounded-[8px] px-4 py-3 text-[12px] text-text-secondary">
                All leads will be sent to the same agent (configured in the next step).
              </div>
            )}

            {routingEnabled && (
              <div className="space-y-5">
                {/* Mode Toggle */}
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-2">Routing Method</label>
                  <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5 w-fit">
                    {(["rules", "ai"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setRoutingMode(m)}
                        className={`px-4 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors duration-150 ${
                          routingMode === m
                            ? "bg-white text-text-primary shadow-sm"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        {m === "rules" ? "Rules" : "AI decides"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Prompt */}
                {routingMode === "ai" && (
                  <div>
                    <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                      Routing Instructions
                    </label>
                    <textarea
                      value={aiRoutingPrompt}
                      onChange={(e) => setAiRoutingPrompt(e.target.value)}
                      placeholder="Describe how leads should be routed. E.g., 'Route leads with budget > 1Cr to Vox, others to Atlas.'"
                      rows={3}
                      className="w-full px-3 py-2 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none"
                    />
                  </div>
                )}

                {/* Branches */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[13px] font-medium text-text-primary">Branches</label>
                    {branches.length < 3 && (
                      <button
                        onClick={addBranch}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
                      >
                        <Plus size={13} strokeWidth={2} />
                        Add Branch
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {branches.map((br) => (
                      <div key={br.id} className="border border-border rounded-[8px] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={br.label}
                            onChange={(e) => updateBranch(br.id, { label: e.target.value })}
                            className="text-[13px] font-medium text-text-primary bg-transparent border-none focus:outline-none"
                          />
                          {branches.length > 1 && (
                            <button
                              onClick={() => removeBranch(br.id)}
                              className="p-1 text-text-tertiary hover:text-status-error transition-colors duration-150"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>

                        {/* Rules Builder (only for rules mode) */}
                        {routingMode === "rules" && (
                          <div className="space-y-2 mb-3">
                            {br.rules.map((rule, ri) => (
                              <div key={ri} className="grid grid-cols-[1fr_auto_1fr] gap-2">
                                <input
                                  type="text"
                                  value={rule.field}
                                  onChange={(e) => updateBranchRule(br.id, ri, { field: e.target.value })}
                                  placeholder="Field (e.g., lead.budget)"
                                  className="h-9 px-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                                />
                                <select
                                  value={rule.operator}
                                  onChange={(e) => updateBranchRule(br.id, ri, { operator: e.target.value })}
                                  className="h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                                  style={selectStyle}
                                >
                                  <option value="equals">equals</option>
                                  <option value="not_equals">not equals</option>
                                  <option value="greater_than">greater than</option>
                                  <option value="less_than">less than</option>
                                  <option value="contains">contains</option>
                                  <option value="in">in</option>
                                </select>
                                <input
                                  type="text"
                                  value={rule.value}
                                  onChange={(e) => updateBranchRule(br.id, ri, { value: e.target.value })}
                                  placeholder="Value"
                                  className="h-9 px-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────── Step 3: Agent Selection ──────────── */}
        {step === 3 && (
          <div className="space-y-5">
            {routingEnabled ? (
              branches.map((br) => {
                const branchAgent = getAgentInfo(br.agentId);
                return (
                  <div key={br.id} className="bg-white border border-border rounded-card p-6">
                    <h2 className="text-card-title text-text-primary mb-4">{br.label}</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                          Agent <span className="text-status-error">*</span>
                        </label>
                        <select
                          value={br.agentId}
                          onChange={(e) => updateBranch(br.id, { agentId: e.target.value })}
                          className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                          style={selectStyle}
                        >
                          <option value="">Select agent...</option>
                          {newAgentsList.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Agent info card */}
                      {branchAgent && (
                        <div className="bg-surface-page border border-border-subtle rounded-[8px] p-4 space-y-2">
                          <p className="text-[12px] text-text-secondary">{branchAgent.description}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-text-tertiary">Channels:</span>
                            {branchAgent.supported_channels.map((ch) => (
                              <span
                                key={ch}
                                className="px-2 py-0.5 text-[11px] font-medium rounded-badge bg-surface-secondary text-text-secondary capitalize"
                              >
                                {ch === "whatsapp" ? "WhatsApp" : "Voice"}
                              </span>
                            ))}
                            <span className="text-[11px] text-text-tertiary ml-2">
                              {branchAgent.objectives_count} objectives
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white border border-border rounded-card p-6">
                <h2 className="text-card-title text-text-primary mb-4">Agent Selection</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium text-text-primary mb-1.5">
                      Agent <span className="text-status-error">*</span>
                    </label>
                    <select
                      value={singleAgentId}
                      onChange={(e) => setSingleAgentId(e.target.value)}
                      className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                      style={selectStyle}
                    >
                      <option value="">Select agent...</option>
                      {newAgentsList.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Agent info card */}
                  {(() => {
                    const selectedAgent = getAgentInfo(singleAgentId);
                    if (!selectedAgent) return null;
                    return (
                      <div className="bg-surface-page border border-border-subtle rounded-[8px] p-4 space-y-2">
                        <p className="text-[12px] text-text-secondary">{selectedAgent.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-text-tertiary">Channels:</span>
                          {selectedAgent.supported_channels.map((ch) => (
                            <span
                              key={ch}
                              className="px-2 py-0.5 text-[11px] font-medium rounded-badge bg-surface-secondary text-text-secondary capitalize"
                            >
                              {ch === "whatsapp" ? "WhatsApp" : "Voice"}
                            </span>
                          ))}
                          <span className="text-[11px] text-text-tertiary ml-2">
                            {selectedAgent.objectives_count} objectives
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────── Step 4: Cadence & Schedule ──────────── */}
        {step === 4 && (
          <div className="space-y-5">
            {routingEnabled ? (
              /* ── Per-branch cadence cards ── */
              branches.map((br) => {
                const cadence = branchCadences[br.id] ?? DEFAULT_CADENCE;
                const branchAgent = getAgentInfo(br.agentId);
                const branchHeader = `${br.label}${branchAgent ? ` \u2192 ${branchAgent.name}` : ""}`;
                return (
                  <div key={br.id}>
                    {/* Combined cadence card for this branch */}
                    <div className="bg-white border border-border rounded-card p-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-badge bg-[#EFF6FF] text-accent">{branchHeader}</span>
                      </div>
                      <h2 className="text-card-title text-text-primary mb-4">Cadence & Schedule</h2>
                      <div className="space-y-5">
                        {/* Daily limit */}
                        <div>
                          <label className="block text-[13px] font-medium text-text-primary mb-1.5">Daily Limit</label>
                          <input
                            type="number"
                            value={cadence.dailyLimit}
                            onChange={(e) => updateBranchCadence(br.id, { dailyLimit: e.target.value })}
                            className="w-[120px] h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums"
                          />
                        </div>

                        {/* Calling hours */}
                        <div>
                          <label className="block text-[13px] font-medium text-text-primary mb-1.5">Calling Hours</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={cadence.startTime}
                              onChange={(e) => updateBranchCadence(br.id, { startTime: e.target.value })}
                              className="h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                            />
                            <span className="text-[12px] text-text-tertiary">to</span>
                            <input
                              type="time"
                              value={cadence.endTime}
                              onChange={(e) => updateBranchCadence(br.id, { endTime: e.target.value })}
                              className="h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                            />
                          </div>
                        </div>

                        {/* Active days */}
                        <div>
                          <label className="block text-[13px] font-medium text-text-primary mb-2">Active Days</label>
                          <div className="flex items-center gap-1.5">
                            {DAYS.map((day) => (
                              <button
                                key={day}
                                onClick={() => toggleBranchDay(br.id, day)}
                                className={`w-10 h-9 text-[12px] font-medium rounded-[6px] transition-colors duration-150 ${
                                  cadence.activeDays.includes(day)
                                    ? "bg-accent text-white"
                                    : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Retry */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-text-primary">Retry unanswered calls</span>
                            <button
                              onClick={() => updateBranchCadence(br.id, { retryEnabled: !cadence.retryEnabled })}
                              className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
                                cadence.retryEnabled ? "bg-accent" : "bg-silver-light"
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${
                                  cadence.retryEnabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                          {cadence.retryEnabled && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[12px] text-text-secondary mb-1">Max retries</label>
                                <input
                                  type="number"
                                  value={cadence.maxRetries}
                                  onChange={(e) => updateBranchCadence(br.id, { maxRetries: e.target.value })}
                                  className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums"
                                />
                              </div>
                              <div>
                                <label className="block text-[12px] text-text-secondary mb-1">Retry interval (hours)</label>
                                <input
                                  type="number"
                                  value={cadence.retryInterval}
                                  onChange={(e) => updateBranchCadence(br.id, { retryInterval: e.target.value })}
                                  className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Follow-up Rules */}
                      <div className="mt-6 pt-5 border-t border-border-subtle">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-text-primary">Follow-up Rules</h3>
                        <button
                          onClick={() => addBranchFollowUpRule(br.id)}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
                        >
                          <Plus size={13} strokeWidth={2} />
                          Add Rule
                        </button>
                      </div>
                      <p className="text-[12px] text-text-secondary mb-4">
                        Define what the sequence does after each call based on the agent outcome.
                      </p>
                      <div className="space-y-2">
                        {cadence.followUpRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] border border-border"
                          >
                            <select
                              value={rule.outcome}
                              onChange={(e) => updateBranchFollowUpRule(br.id, rule.id, { outcome: e.target.value })}
                              className="h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer flex-1"
                              style={selectStyle}
                            >
                              {OUTCOME_OPTIONS.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                            <span className="text-[12px] text-text-tertiary flex-shrink-0">&rarr;</span>
                            <select
                              value={rule.action}
                              onChange={(e) => updateBranchFollowUpRule(br.id, rule.id, { action: e.target.value as FollowUpRule["action"] })}
                              className="h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer w-[120px]"
                              style={selectStyle}
                            >
                              {ACTION_OPTIONS.map((a) => (
                                <option key={a} value={a}>
                                  {a === "retry" ? "Retry" : a === "follow_up" ? "Follow up" : "Stop"}
                                </option>
                              ))}
                            </select>
                            {rule.action !== "stop" ? (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[12px] text-text-tertiary">in</span>
                                <input
                                  type="number"
                                  value={rule.delay_hours}
                                  onChange={(e) => updateBranchFollowUpRule(br.id, rule.id, { delay_hours: Number(e.target.value) })}
                                  className="w-[64px] h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums text-center"
                                />
                                <span className="text-[12px] text-text-tertiary">hrs</span>
                              </div>
                            ) : (
                              <div className="w-[120px]" />
                            )}
                            <button
                              onClick={() => removeBranchFollowUpRule(br.id, rule.id)}
                              className="p-1 text-text-tertiary hover:text-status-error transition-colors duration-150 flex-shrink-0"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          </div>
                        ))}
                        {cadence.followUpRules.length === 0 && (
                          <div className="text-[12px] text-text-tertiary py-2">No follow-up rules configured</div>
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* ── Single cadence (default_step) ── */
              <>
                {/* Schedule */}
                <div className="bg-white border border-border rounded-card p-6">
                  <h2 className="text-card-title text-text-primary mb-4">Cadence & Schedule</h2>
                  <div className="space-y-5">
                    {/* Daily limit */}
                    <div>
                      <label className="block text-[13px] font-medium text-text-primary mb-1.5">Daily Limit</label>
                      <input
                        type="number"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        className="w-[120px] h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums"
                      />
                    </div>

                    {/* Calling hours */}
                    <div>
                      <label className="block text-[13px] font-medium text-text-primary mb-1.5">Calling Hours</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                        />
                        <span className="text-[12px] text-text-tertiary">to</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                        />
                      </div>
                    </div>

                    {/* Active days */}
                    <div>
                      <label className="block text-[13px] font-medium text-text-primary mb-2">Active Days</label>
                      <div className="flex items-center gap-1.5">
                        {DAYS.map((day) => (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={`w-10 h-9 text-[12px] font-medium rounded-[6px] transition-colors duration-150 ${
                              activeDays.includes(day)
                                ? "bg-accent text-white"
                                : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Retry */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-text-primary">Retry unanswered calls</span>
                        <button
                          onClick={() => setRetryEnabled(!retryEnabled)}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
                            retryEnabled ? "bg-accent" : "bg-silver-light"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${
                              retryEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      {retryEnabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] text-text-secondary mb-1">Max retries</label>
                            <input
                              type="number"
                              value={maxRetries}
                              onChange={(e) => setMaxRetries(e.target.value)}
                              className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-text-secondary mb-1">Retry interval (hours)</label>
                            <input
                              type="number"
                              value={retryInterval}
                              onChange={(e) => setRetryInterval(e.target.value)}
                              className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Follow-up Rules */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-card-title text-text-primary">Follow-up Rules</h2>
                    <button
                      onClick={addFollowUpRule}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
                    >
                      <Plus size={13} strokeWidth={2} />
                      Add Rule
                    </button>
                  </div>
                  <p className="text-[12px] text-text-secondary mb-4">
                    Define what the sequence does after each call based on the agent outcome.
                  </p>
                  <div className="space-y-2">
                    {followUpRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] border border-border"
                      >
                        {/* Outcome dropdown */}
                        <select
                          value={rule.outcome}
                          onChange={(e) => updateFollowUpRule(rule.id, { outcome: e.target.value })}
                          className="h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer flex-1"
                          style={selectStyle}
                        >
                          {OUTCOME_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>

                        <span className="text-[12px] text-text-tertiary flex-shrink-0">&rarr;</span>

                        {/* Action dropdown */}
                        <select
                          value={rule.action}
                          onChange={(e) => updateFollowUpRule(rule.id, { action: e.target.value as FollowUpRule["action"] })}
                          className="h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer w-[120px]"
                          style={selectStyle}
                        >
                          {ACTION_OPTIONS.map((a) => (
                            <option key={a} value={a}>
                              {a === "retry" ? "Retry" : a === "follow_up" ? "Follow up" : "Stop"}
                            </option>
                          ))}
                        </select>

                        {/* Delay (hidden for "stop") */}
                        {rule.action !== "stop" ? (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[12px] text-text-tertiary">in</span>
                            <input
                              type="number"
                              value={rule.delay_hours}
                              onChange={(e) => updateFollowUpRule(rule.id, { delay_hours: Number(e.target.value) })}
                              className="w-[64px] h-9 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums text-center"
                            />
                            <span className="text-[12px] text-text-tertiary">hrs</span>
                          </div>
                        ) : (
                          <div className="w-[120px]" />
                        )}

                        {/* Remove */}
                        <button
                          onClick={() => removeFollowUpRule(rule.id)}
                          className="p-1 text-text-tertiary hover:text-status-error transition-colors duration-150 flex-shrink-0"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                    {followUpRules.length === 0 && (
                      <div className="text-[12px] text-text-tertiary py-2">No follow-up rules configured</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ──────────── Step 5: Review ──────────── */}
        {step === 5 && (
          <div className="space-y-5">
            {/* Review Summary */}
            <div className="bg-white border border-border rounded-card p-6">
              <h2 className="text-card-title text-text-primary mb-4">Review Summary</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Trigger</span>
                  <span className="text-[13px] font-medium text-text-primary">{triggerLabel}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Routing</span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {routingEnabled ? `${branches.length} branch(es) via ${routingMode === "ai" ? "AI" : "rules"}` : "Single path"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Agent</span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {routingEnabled
                      ? branches.map((b) => newAgentsList.find((a) => a.id === b.agentId)?.name || "Unassigned").join(", ")
                      : newAgentsList.find((a) => a.id === singleAgentId)?.name || "Unassigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Daily Limit</span>
                  <span className="text-[13px] font-medium text-text-primary tabular-nums">{dailyLimit}/day</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Calling Hours</span>
                  <span className="text-[13px] font-medium text-text-primary tabular-nums">{startTime} &ndash; {endTime}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Active Days</span>
                  <span className="text-[13px] font-medium text-text-primary">{activeDays.join(", ")}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border-subtle">
                  <span className="text-[12px] text-text-secondary">Retry Policy</span>
                  <span className="text-[13px] font-medium text-text-primary">
                    {retryEnabled ? `Up to ${maxRetries} retries, every ${retryInterval}h` : "Disabled"}
                  </span>
                </div>
              </div>
            </div>

            {/* Follow-up Rules Summary */}
            <div className="bg-white border border-border rounded-card p-6">
              <h2 className="text-card-title text-text-primary mb-4">Follow-up Rules</h2>
              {followUpRules.length > 0 ? (
                <div className="border border-border-subtle rounded-[6px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-page border-b border-border-subtle">
                        <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                          Outcome
                        </th>
                        <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                          Action
                        </th>
                        <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                          Delay
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUpRules.map((rule) => (
                        <tr key={rule.id} className="border-b border-border-subtle last:border-0">
                          <td className="px-3 py-2 text-[12px] text-text-primary">{rule.outcome}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-badge ${
                                rule.action === "retry"
                                  ? "bg-[#EFF6FF] text-accent"
                                  : rule.action === "follow_up"
                                  ? "bg-[#FFF7ED] text-[#C2410C]"
                                  : "bg-surface-secondary text-text-secondary"
                              }`}
                            >
                              {rule.action === "retry" ? "Retry" : rule.action === "follow_up" ? "Follow up" : "Stop"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-text-secondary tabular-nums">
                            {rule.action !== "stop" ? `${rule.delay_hours}h` : "\u2014"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-[12px] text-text-tertiary">No follow-up rules configured</div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between py-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : router.push("/workflows"))}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            {step > 1 ? "Back" : "Cancel"}
          </button>

          {step < 5 ? (
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={() => router.push("/workflows/wf-1")}
              className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
            >
              <Rocket size={15} strokeWidth={1.5} />
              Create Sequence
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
