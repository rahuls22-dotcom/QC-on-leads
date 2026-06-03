"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Phone, MessageCircle, Upload,
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Volume2,
  ShieldCheck, RefreshCw, ClipboardList, Users, FileText,
  Globe, Target, Send, MessageSquare, Bot,
} from "lucide-react";
import {
  newVoiceOptions, languageOptions, defaultObjectives,
  defaultSystemPrompt, defaultFAQs, conversationSteps,
} from "@/lib/voice-agent-data";
import type {
  AgentTemplate, AgentTone, LanguageBehavior, Objective,
} from "@/lib/types/agent";
import type { Priority, FieldType } from "@/lib/types/common";

/* ── Template Presets ──────────────────────────────────────────── */

interface TemplatePreset {
  goal: string;
  tone: AgentTone;
  systemPrompt: string;
  productDetails: string;
  faqs: { question: string; answer: string; id: string }[];
  objectives: Objective[];
}

const blankPreset: TemplatePreset = {
  goal: "",
  tone: "conversational",
  systemPrompt: "",
  productDetails: "",
  faqs: [],
  objectives: [],
};

const templatePresets: Record<AgentTemplate, TemplatePreset> = {
  qualifying: {
    goal: "Qualify inbound leads for luxury real estate properties. Determine budget, timeline, configuration preference, and schedule site visits for qualified leads.",
    tone: "conversational",
    systemPrompt: defaultSystemPrompt,
    productDetails: "",
    faqs: defaultFAQs.map((f, i) => ({ ...f, id: `faq-${i}` })),
    objectives: defaultObjectives,
  },
  follow_up: {
    goal: "Re-engage leads who previously showed interest but didn't convert. Understand their current situation, address concerns, and move them towards a decision.",
    tone: "friendly",
    systemPrompt: "You are a warm, friendly follow-up agent. You are calling leads who previously expressed interest but haven't taken the next step. Your goal is to understand what held them back, address any concerns, and help them move forward. Be empathetic and never pushy.",
    productDetails: "",
    faqs: [
      { question: "Why are you calling again?", answer: "We wanted to check in and see if you had any new questions since we last spoke.", id: "faq-0" },
      { question: "Has anything changed?", answer: "We have some new options and offers that might interest you.", id: "faq-1" },
    ],
    objectives: [
      { id: "obj-f1", name: "Re-confirm Interest", description: "Check if the lead is still interested", priority: "critical" as const, required: true, extract_field: { name: "still_interested", type: "boolean" as const }, prompt_hint: "Ask if they are still looking or if their situation has changed" },
      { id: "obj-f2", name: "Identify Blocker", description: "Understand what prevented them from moving forward", priority: "high" as const, required: true, extract_field: { name: "blocker", type: "string" as const }, prompt_hint: "Gently ask what held them back — budget, timing, other options?" },
      { id: "obj-f3", name: "Address Concerns", description: "Resolve any objections or concerns", priority: "high" as const, required: false, extract_field: { name: "concerns_resolved", type: "boolean" as const }, prompt_hint: "Address their concerns with relevant information" },
      { id: "obj-f4", name: "Schedule Next Step", description: "Book a site visit or callback", priority: "medium" as const, required: false, extract_field: { name: "next_step", type: "string" as const }, prompt_hint: "If interested, offer to schedule a site visit or send updated info" },
    ],
  },
  survey: {
    goal: "Conduct a brief satisfaction survey with existing customers. Collect feedback on their experience, identify areas for improvement, and gauge referral potential.",
    tone: "friendly",
    systemPrompt: "You are a friendly survey agent conducting a brief satisfaction survey. Keep it conversational and quick (under 3 minutes). Thank the customer for their time and be genuinely interested in their feedback. Never be defensive about negative feedback.",
    productDetails: "",
    faqs: [
      { question: "How long will this take?", answer: "Just 2-3 minutes of your time.", id: "faq-0" },
      { question: "Is this anonymous?", answer: "Your feedback helps us improve but individual responses are kept confidential.", id: "faq-1" },
    ],
    objectives: [
      { id: "obj-s1", name: "Overall Satisfaction", description: "Rate overall experience on a scale of 1-10", priority: "critical" as const, required: true, extract_field: { name: "satisfaction_score", type: "number" as const }, prompt_hint: "Ask how they would rate their overall experience from 1 to 10" },
      { id: "obj-s2", name: "Best Aspect", description: "What did they like most?", priority: "high" as const, required: true, extract_field: { name: "best_aspect", type: "string" as const }, prompt_hint: "Ask what they liked most about their experience" },
      { id: "obj-s3", name: "Improvement Area", description: "What could be better?", priority: "high" as const, required: true, extract_field: { name: "improvement", type: "string" as const }, prompt_hint: "Ask what could have been better or what they'd change" },
      { id: "obj-s4", name: "Referral Likelihood", description: "Would they recommend to others?", priority: "medium" as const, required: false, extract_field: { name: "would_refer", type: "boolean" as const }, prompt_hint: "Ask if they would recommend us to friends or family" },
    ],
  },
  onboarding: {
    goal: "Guide new customers through the onboarding process. Explain next steps, collect required information, and ensure they have everything they need to get started.",
    tone: "formal",
    systemPrompt: "You are a professional onboarding agent. Your role is to welcome new customers, walk them through the process step by step, and ensure they understand what to expect. Be clear, thorough, and patient. Confirm understanding at each step.",
    productDetails: "",
    faqs: [
      { question: "What do I need to get started?", answer: "We'll need some basic documentation which I'll walk you through.", id: "faq-0" },
      { question: "How long does the process take?", answer: "The onboarding process typically takes 3-5 business days.", id: "faq-1" },
    ],
    objectives: [
      { id: "obj-o1", name: "Welcome & Verify", description: "Welcome the customer and verify their identity", priority: "critical" as const, required: true, extract_field: { name: "identity_verified", type: "boolean" as const }, prompt_hint: "Welcome them warmly and verify their name and account details" },
      { id: "obj-o2", name: "Explain Process", description: "Walk through the onboarding steps", priority: "high" as const, required: true, extract_field: { name: "process_understood", type: "boolean" as const }, prompt_hint: "Explain the onboarding steps clearly and check for understanding" },
      { id: "obj-o3", name: "Collect Requirements", description: "Gather required information or documents", priority: "high" as const, required: true, extract_field: { name: "docs_submitted", type: "boolean" as const }, prompt_hint: "Ask about required documents and guide them on submission" },
      { id: "obj-o4", name: "Set Expectations", description: "Confirm timeline and next steps", priority: "medium" as const, required: false, extract_field: { name: "expectations_set", type: "boolean" as const }, prompt_hint: "Confirm what happens next and expected timeline" },
    ],
  },
  blank: blankPreset,
};

/* ── Animation variants ────────────────────────────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

/* ── Toggle component ──────────────────────────────────────────── */

function Toggle({ enabled, onToggle, label, helper }: { enabled: boolean; onToggle: () => void; label: string; helper?: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border-subtle last:border-0">
      <div className="flex-1 pr-4">
        <span className="text-[13px] text-text-primary">{label}</span>
        {helper && <div className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{helper}</div>}
      </div>
      <button onClick={onToggle} className={`relative w-9 h-5 rounded-full transition-colors duration-150 shrink-0 mt-0.5 ${enabled ? "bg-accent" : "bg-silver-light"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${enabled ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

/* ── Shared styles ─────────────────────────────────────────────── */

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center",
};

const inputCls = "w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary";
const textareaCls = "w-full px-3 py-2.5 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none leading-relaxed";
const labelCls = "block text-[13px] font-medium text-text-primary mb-1.5";
const subLabelCls = "block text-[12px] text-text-secondary mb-1";

const STEPS = [
  { label: "Identity" },
  { label: "Channels" },
  { label: "Knowledge" },
  { label: "Flow" },
  { label: "Objectives" },
  { label: "Review" },
];

const TEMPLATES: { key: AgentTemplate; icon: typeof ShieldCheck; title: string; desc: string }[] = [
  { key: "qualifying", icon: ShieldCheck, title: "Qualifying agent", desc: "Pre-configured for lead qualification and scoring." },
  { key: "follow_up", icon: RefreshCw, title: "Follow-up agent", desc: "Re-engage cold leads and handle follow-up calls." },
  { key: "survey", icon: ClipboardList, title: "Survey agent", desc: "Conduct satisfaction surveys and collect feedback." },
  { key: "onboarding", icon: Users, title: "Onboarding agent", desc: "Guide new customers through setup and activation." },
  { key: "blank", icon: FileText, title: "Blank agent", desc: "Start from scratch. You define all rules and behavior." },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-blue-50 text-blue-700 border-blue-200",
  low: "bg-gray-50 text-gray-600 border-gray-200",
};

const FIELD_TYPES: FieldType[] = ["string", "number", "boolean", "currency", "duration", "enum", "range"];

/* ═══════════════════════════════════════════════════════════════ */

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  /* ── Step 1: Identity ──────────────────────────────────────── */
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<AgentTemplate>("qualifying");
  const [persona, setPersona] = useState("");
  const [tone, setTone] = useState<AgentTone>("conversational");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["English", "Hindi"]);
  const [langBehavior, setLangBehavior] = useState<LanguageBehavior>("match_lead");
  const [goal, setGoal] = useState(templatePresets.qualifying.goal);

  /* ── Template change handler ──────────────────────────────────── */
  function applyTemplate(t: AgentTemplate) {
    setTemplate(t);
    const preset = templatePresets[t];
    setGoal(preset.goal);
    setTone(preset.tone);
    setSystemPrompt(preset.systemPrompt);
    setProductDetails(preset.productDetails);
    setFaqs(preset.faqs);
    setObjectives(preset.objectives);
  }

  /* ── Step 2: Channels ──────────────────────────────────────── */
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  // voice settings
  const [selectedVoice, setSelectedVoice] = useState("v-1");
  const [maxDuration, setMaxDuration] = useState("5");
  // whatsapp settings
  const [firstMessage, setFirstMessage] = useState("Hi {{lead_name}}, this is {{persona}} from Godrej Properties. I saw you were interested in {{project_name}}. Would you like to know more?");
  const [quickReplies, setQuickReplies] = useState<string[]>(["Yes, tell me more", "Schedule a site visit", "Send brochure", "Not interested"]);
  const [replyTimeout, setReplyTimeout] = useState("24");

  /* ── Step 3: Knowledge ─────────────────────────────────────── */
  const [knowledgeTab, setKnowledgeTab] = useState<"upload" | "manual">("manual");
  const [productDetails, setProductDetails] = useState("");
  const [faqs, setFaqs] = useState(defaultFAQs.map((f, i) => ({ ...f, id: `faq-${i}` })));
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);

  /* ── Step 4: Conversation Flow ─────────────────────────────── */
  const [conversationFlow, setConversationFlow] = useState(
    conversationSteps.map(cs => ({ ...cs }))
  );
  const [expandedFlowStep, setExpandedFlowStep] = useState<string | null>(null);

  /* ── Step 5: Objectives ──────────────────────────────────── */
  const [budgetThreshold, setBudgetThreshold] = useState("1");
  const [timelineThreshold, setTimelineThreshold] = useState("6");
  const [requireDecisionMaker, setRequireDecisionMaker] = useState(true);
  const [requireSiteVisit, setRequireSiteVisit] = useState(true);
  const [qualificationThresholdRule, setQualificationThresholdRule] = useState("all_critical_1_high");
  const [objectives, setObjectives] = useState<Objective[]>(defaultObjectives);
  const [expandedObj, setExpandedObj] = useState<string | null>(null);
  const [threshold, setThreshold] = useState("all_critical_1_high");

  /* ── Helpers ────────────────────────────────────────────────── */
  const canContinue0 = name.trim().length > 0;
  const canContinue1 = voiceEnabled || whatsappEnabled;

  function moveFlow(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= conversationFlow.length) return;
    const arr = [...conversationFlow];
    [arr[from], arr[to]] = [arr[to], arr[from]];
    setConversationFlow(arr.map((s, i) => ({ ...s, step: i + 1 })));
  }

  function addFlowStep() {
    const ns = {
      id: `cs-${Date.now()}`,
      step: conversationFlow.length + 1,
      name: "",
      script: "",
    };
    setConversationFlow(prev => [...prev, ns]);
    setExpandedFlowStep(ns.id);
  }

  function moveObj(from: number, dir: -1 | 1) {
    const to = from + dir;
    if (to < 0 || to >= objectives.length) return;
    const arr = [...objectives];
    [arr[from], arr[to]] = [arr[to], arr[from]];
    setObjectives(arr);
  }

  function updateObj(id: string, patch: Partial<Objective>) {
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  }

  function addObjective() {
    const obj: Objective = {
      id: `obj-${Date.now()}`,
      name: "",
      description: "",
      priority: "medium",
      required: false,
      extract_field: { name: "", type: "string" },
      prompt_hint: "",
    };
    setObjectives(prev => [...prev, obj]);
    setExpandedObj(obj.id);
  }

  /* ═══════════════════════════════════════════════════════════ */

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push("/agents")} className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Tools &rsaquo; Agents &rsaquo; Create</span>
      </div>

      {/* ── Progress stepper (6 steps) ───────────────────────── */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center">
            <button onClick={() => i <= step && setStep(i)} disabled={i > step} className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-200 ${
                i < step ? "bg-accent text-white" : i === step ? "bg-accent text-white ring-4 ring-accent/10" : "bg-surface-secondary text-text-tertiary"
              } ${i <= step ? "cursor-pointer" : "cursor-not-allowed"}`}>
                {i < step ? <Check size={14} strokeWidth={2.5} /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${i === step ? "text-text-primary" : i < step ? "text-text-secondary" : "text-text-tertiary"}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`w-14 h-[2px] mx-1.5 mt-[-18px] ${i < step ? "bg-accent" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="max-w-[780px] mx-auto pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>

            {/* ════════════════════════════════════════════════════
                STEP 1 — Identity
            ════════════════════════════════════════════════════ */}
            {step === 0 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h2 className="text-[20px] font-semibold text-text-primary">Define your agent&apos;s identity</h2>
                  <p className="text-meta text-text-secondary mt-1">Name it, choose a template, and shape its personality.</p>
                </div>

                <div className="bg-white border border-border rounded-card p-6 space-y-5">
                  {/* Name */}
                  <div>
                    <label className={labelCls}>Agent name *</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Villa Qualifier"
                      className={inputCls} />
                  </div>

                  {/* Template */}
                  <div>
                    <label className="block text-[13px] font-medium text-text-primary mb-2">Template *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {TEMPLATES.map((t) => (
                        <button key={t.key} onClick={() => applyTemplate(t.key)}
                          className={`flex items-start gap-3 p-4 rounded-card border transition-all duration-150 text-left ${template === t.key ? "border-accent ring-1 ring-accent/20 bg-white" : "border-border hover:border-border-hover bg-white"}`}>
                          <div className="w-10 h-10 rounded-[8px] bg-surface-secondary flex items-center justify-center shrink-0 mt-0.5">
                            <t.icon size={18} strokeWidth={1.5} className={template === t.key ? "text-text-primary" : "text-text-tertiary"} />
                          </div>
                          <div>
                            <div className="text-[13px] font-medium text-text-primary">{t.title}</div>
                            <div className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{t.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Persona name */}
                  <div>
                    <label className={labelCls}>Persona name</label>
                    <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="e.g., Vox"
                      className={inputCls} />
                    <div className="text-[11px] text-text-tertiary mt-1">The name the agent uses when speaking to leads.</div>
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-[13px] font-medium text-text-primary mb-2">Tone</label>
                    <div className="flex gap-2">
                      {(["formal", "conversational", "friendly"] as const).map((t) => (
                        <button key={t} onClick={() => setTone(t)}
                          className={`px-3 py-1.5 text-[12px] font-medium rounded-badge capitalize transition-colors ${tone === t ? "bg-accent text-white" : "bg-surface-secondary text-text-secondary hover:text-text-primary"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="block text-[13px] font-medium text-text-primary mb-2">Languages</label>
                    <div className="flex flex-wrap gap-1.5">
                      {languageOptions.map((lang) => (
                        <button key={lang} onClick={() => setSelectedLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-badge transition-colors ${selectedLangs.includes(lang) ? "bg-accent text-white" : "bg-surface-secondary text-text-secondary hover:text-text-primary"}`}>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language behavior */}
                  <div>
                    <label className="block text-[13px] font-medium text-text-primary mb-2">Language behavior</label>
                    <div className="flex gap-2">
                      {([
                        { key: "match_lead" as const, label: "Match lead" },
                        { key: "primary_only" as const, label: "Primary only" },
                        { key: "ask_preference" as const, label: "Ask preference" },
                      ]).map((lb) => (
                        <button key={lb.key} onClick={() => setLangBehavior(lb.key)}
                          className={`px-3 py-1.5 text-[12px] font-medium rounded-badge transition-colors ${langBehavior === lb.key ? "bg-accent text-white" : "bg-surface-secondary text-text-secondary hover:text-text-primary"}`}>
                          {lb.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-1">
                      {langBehavior === "match_lead" && "Agent detects and matches the lead\u2019s language automatically."}
                      {langBehavior === "primary_only" && "Agent always speaks in the primary language (first selected)."}
                      {langBehavior === "ask_preference" && "Agent asks the lead which language they prefer."}
                    </div>
                  </div>

                  {/* Main goal */}
                  <div>
                    <label className={labelCls}>Main goal</label>
                    <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3}
                      placeholder="Describe what this agent should achieve (e.g., Qualify inbound leads for luxury villa project and schedule site visits)"
                      className={textareaCls} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={() => setStep(1)} disabled={!canContinue0}
                    className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 2 — Channels
            ════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h2 className="text-[20px] font-semibold text-text-primary">Choose channels</h2>
                  <p className="text-meta text-text-secondary mt-1">Toggle which channels this agent supports and configure each one.</p>
                </div>

                {/* Voice channel */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[8px] bg-surface-secondary flex items-center justify-center shrink-0">
                        <Phone size={18} strokeWidth={1.5} className={voiceEnabled ? "text-text-primary" : "text-text-tertiary"} />
                      </div>
                      <div>
                        <h3 className="text-card-title text-text-primary">Voice Call</h3>
                        <p className="text-[11px] text-text-tertiary mt-0.5">Interactive voice conversations over phone</p>
                      </div>
                    </div>
                    <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`relative w-9 h-5 rounded-full transition-colors duration-150 shrink-0 ${voiceEnabled ? "bg-accent" : "bg-silver-light"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${voiceEnabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {voiceEnabled && (
                    <div className="mt-5 pt-4 border-t border-border-subtle space-y-5">
                      {/* Voice selection */}
                      <div>
                        <label className={subLabelCls}>Voice</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {newVoiceOptions.map((v) => (
                            <button key={v.id} onClick={() => setSelectedVoice(v.id)}
                              className={`flex items-center gap-3 p-3 rounded-[6px] border transition-all duration-150 text-left ${selectedVoice === v.id ? "border-accent ring-1 ring-accent/20" : "border-border hover:border-border-hover"}`}>
                              <div className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
                                <Volume2 size={14} strokeWidth={1.5} className="text-text-tertiary" />
                              </div>
                              <div>
                                <div className="text-[12px] font-medium text-text-primary">{v.name}</div>
                                <div className="text-[10px] text-text-tertiary">{v.gender} &middot; {v.languages.join(", ")}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={subLabelCls}>Max duration (minutes)</label>
                        <input type="number" value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)}
                          className="w-32 h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent tabular-nums" />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp channel */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[8px] bg-surface-secondary flex items-center justify-center shrink-0">
                        <MessageCircle size={18} strokeWidth={1.5} className={whatsappEnabled ? "text-text-primary" : "text-text-tertiary"} />
                      </div>
                      <div>
                        <h3 className="text-card-title text-text-primary">WhatsApp</h3>
                        <p className="text-[11px] text-text-tertiary mt-0.5">Automated text-based conversations via WhatsApp</p>
                      </div>
                    </div>
                    <button onClick={() => setWhatsappEnabled(!whatsappEnabled)} className={`relative w-9 h-5 rounded-full transition-colors duration-150 shrink-0 ${whatsappEnabled ? "bg-accent" : "bg-silver-light"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${whatsappEnabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {whatsappEnabled && (
                    <div className="mt-5 pt-4 border-t border-border-subtle space-y-5">
                      <div>
                        <label className={subLabelCls}>First message template</label>
                        <textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} rows={3}
                          className={textareaCls + " font-mono text-[12px]"} />
                        <div className="text-[11px] text-text-tertiary mt-1">Use &#123;&#123;variable&#125;&#125; syntax for dynamic values.</div>
                      </div>

                      <div>
                        <label className={subLabelCls}>Quick replies</label>
                        <div className="space-y-1.5">
                          {quickReplies.map((qr, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="text" value={qr} onChange={(e) => setQuickReplies(prev => prev.map((r, j) => j === i ? e.target.value : r))}
                                className="flex-1 h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent" />
                              <button onClick={() => setQuickReplies(prev => prev.filter((_, j) => j !== i))} className="p-1 text-text-tertiary hover:text-status-error">
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setQuickReplies(prev => [...prev, ""])}
                          className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-text-secondary hover:text-text-primary">
                          <Plus size={13} strokeWidth={1.5} /> Add reply
                        </button>
                      </div>

                      <div>
                        <label className={subLabelCls}>Reply timeout (hours)</label>
                        <input type="number" value={replyTimeout} onChange={(e) => setReplyTimeout(e.target.value)}
                          className="w-32 h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent tabular-nums" />
                        <div className="text-[11px] text-text-tertiary mt-1">If lead doesn&apos;t reply within this window, mark as timed out.</div>
                      </div>
                    </div>
                  )}
                </div>

                {!canContinue1 && (
                  <div className="text-[12px] text-status-error text-center">Enable at least one channel to continue.</div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(0)} className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                    <ArrowLeft size={15} strokeWidth={1.5} /> Back
                  </button>
                  <button onClick={() => setStep(2)} disabled={!canContinue1}
                    className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 3 — Knowledge
            ════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h2 className="text-[20px] font-semibold text-text-primary">Teach your agent</h2>
                  <p className="text-meta text-text-secondary mt-1">Give your agent context about your product and define how it should converse.</p>
                </div>

                {/* Knowledge Base */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-card-title text-text-primary">Knowledge base</h3>
                      <p className="text-[11px] text-text-tertiary mt-0.5">What does your agent know?</p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
                      {(["upload", "manual"] as const).map((t) => (
                        <button key={t} onClick={() => setKnowledgeTab(t)}
                          className={`px-3 py-1 text-[11px] font-medium rounded-[5px] transition-colors ${knowledgeTab === t ? "bg-white text-text-primary shadow-sm" : "text-text-secondary"}`}>
                          {t === "upload" ? "Upload documents" : "Enter manually"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {knowledgeTab === "upload" && (
                    <div className="border-2 border-dashed border-border rounded-[8px] p-8 text-center">
                      <Upload size={24} strokeWidth={1.5} className="text-text-tertiary mx-auto mb-2" />
                      <div className="text-[13px] text-text-secondary">Click to upload files</div>
                      <div className="text-[11px] text-text-tertiary mt-1">PDF, DOC, or DOCX (max 10MB each)</div>
                    </div>
                  )}

                  {knowledgeTab === "manual" && (
                    <div className="space-y-4">
                      <div>
                        <label className={subLabelCls}>Product/Service details</label>
                        <textarea value={productDetails} onChange={(e) => setProductDetails(e.target.value)} rows={3}
                          placeholder="Location, price range, unit types, amenities, builder info, key selling points..."
                          className={textareaCls} />
                      </div>
                      <div>
                        <label className="block text-[12px] text-text-secondary mb-2">FAQs</label>
                        <div className="space-y-2">
                          {faqs.map((faq, i) => (
                            <div key={faq.id} className="flex gap-2 items-start">
                              <div className="flex-1 space-y-1.5">
                                <input type="text" defaultValue={faq.question} placeholder="Question"
                                  className="w-full h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent" />
                                <textarea defaultValue={faq.answer} placeholder="Answer" rows={2}
                                  className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent resize-none" />
                              </div>
                              <button onClick={() => setFaqs(f => f.filter((_, j) => j !== i))} className="p-1.5 text-text-tertiary hover:text-status-error mt-1"><Trash2 size={13} strokeWidth={1.5} /></button>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setFaqs(f => [...f, { id: `faq-${Date.now()}`, question: "", answer: "" }])}
                          className="inline-flex items-center gap-1 mt-2 text-[12px] font-medium text-text-secondary hover:text-text-primary">
                          <Plus size={13} strokeWidth={1.5} /> Add FAQ
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* System Prompt */}
                <div className="bg-white border border-border rounded-card p-6">
                  <h3 className="text-card-title text-text-primary mb-1">System prompt</h3>
                  <p className="text-[11px] text-text-tertiary mb-4">Core instructions that shape how the agent behaves.</p>
                  <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6}
                    className="w-full px-3 py-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 resize-none leading-relaxed font-mono" />
                  <button onClick={() => setSystemPrompt(defaultSystemPrompt)} className="text-[11px] text-text-tertiary hover:text-text-secondary mt-1">Reset to template</button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                    <ArrowLeft size={15} strokeWidth={1.5} /> Back
                  </button>
                  <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                    Continue <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 4 — Conversation Flow
            ════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h2 className="text-[20px] font-semibold text-text-primary">Conversation Flow</h2>
                  <p className="text-meta text-text-secondary mt-1">Define the flow of the conversation your agent will follow.</p>
                </div>

                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-card-title text-text-primary">Conversation steps</h3>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{conversationFlow.length} step{conversationFlow.length !== 1 ? "s" : ""} configured</p>
                    </div>
                    <button onClick={addFlowStep}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                      <Plus size={13} strokeWidth={1.5} /> Add step
                    </button>
                  </div>

                  <div className="space-y-2">
                    {conversationFlow.map((fs, i) => (
                      <div key={fs.id} className="border border-border rounded-[6px] overflow-hidden">
                        <button onClick={() => setExpandedFlowStep(expandedFlowStep === fs.id ? null : fs.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-page transition-colors text-left">
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveFlow(i, -1); }} disabled={i === 0} className="text-text-tertiary hover:text-text-secondary disabled:opacity-30">
                              <ChevronUp size={11} strokeWidth={2} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveFlow(i, 1); }} disabled={i === conversationFlow.length - 1} className="text-text-tertiary hover:text-text-secondary disabled:opacity-30">
                              <ChevronDown size={11} strokeWidth={2} />
                            </button>
                          </div>
                          <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] font-semibold text-text-tertiary">{i + 1}</span>
                          <span className="text-[13px] font-medium text-text-primary flex-1">{fs.name || "Untitled step"}</span>
                          {expandedFlowStep === fs.id ? <ChevronUp size={14} strokeWidth={1.5} className="text-text-tertiary" /> : <ChevronDown size={14} strokeWidth={1.5} className="text-text-tertiary" />}
                        </button>

                        {expandedFlowStep === fs.id && (
                          <div className="px-4 pb-4 pt-2 border-t border-border-subtle space-y-4">
                            <div>
                              <label className={subLabelCls}>Step name</label>
                              <input type="text" value={fs.name} onChange={(e) => setConversationFlow(prev => prev.map(s => s.id === fs.id ? { ...s, name: e.target.value } : s))}
                                placeholder="e.g., Greeting" className="w-full h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent" />
                            </div>
                            <div>
                              <label className={subLabelCls}>Script</label>
                              <textarea value={fs.script} onChange={(e) => setConversationFlow(prev => prev.map(s => s.id === fs.id ? { ...s, script: e.target.value } : s))} rows={3}
                                placeholder="What should the agent say or do in this step?"
                                className="w-full px-2.5 py-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed" />
                            </div>
                            <div className="flex justify-end">
                              <button onClick={() => { setConversationFlow(prev => prev.filter(s => s.id !== fs.id).map((s, idx) => ({ ...s, step: idx + 1 }))); setExpandedFlowStep(null); }}
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-status-error hover:text-red-700 transition-colors">
                                <Trash2 size={13} strokeWidth={1.5} /> Remove step
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {conversationFlow.length === 0 && (
                    <div className="text-center py-8 text-[13px] text-text-tertiary">
                      No steps yet. Click &ldquo;Add step&rdquo; to get started.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                    <ArrowLeft size={15} strokeWidth={1.5} /> Back
                  </button>
                  <button onClick={() => setStep(4)} className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                    Continue <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 5 — Objectives
            ════════════════════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h2 className="text-[20px] font-semibold text-text-primary">Define objectives</h2>
                  <p className="text-meta text-text-secondary mt-1">What should the agent accomplish in each conversation? Add, edit, and reorder objectives below.</p>
                </div>

                {/* Qualification Criteria — only for qualifying template */}
                {template === "qualifying" && (
                  <div className="bg-white border border-border rounded-card p-6">
                    <h3 className="text-card-title text-text-primary mb-1">Qualification Criteria</h3>
                    <p className="text-[11px] text-text-tertiary mb-4">Define what makes a lead qualified. The agent will score leads against these criteria.</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={subLabelCls}>Budget threshold</label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] text-text-secondary">&#8377;</span>
                          <input type="number" value={budgetThreshold} onChange={(e) => setBudgetThreshold(e.target.value)}
                            className="w-24 h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent tabular-nums" />
                          <span className="text-[12px] text-text-tertiary">Cr</span>
                        </div>
                      </div>
                      <div>
                        <label className={subLabelCls}>Timeline threshold</label>
                        <div className="flex items-center gap-1.5">
                          <input type="number" value={timelineThreshold} onChange={(e) => setTimelineThreshold(e.target.value)}
                            className="w-24 h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent tabular-nums" />
                          <span className="text-[12px] text-text-tertiary">months</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-0">
                      <Toggle enabled={requireDecisionMaker} onToggle={() => setRequireDecisionMaker(!requireDecisionMaker)}
                        label="Decision maker" helper="Require lead to be the primary decision maker" />
                      <Toggle enabled={requireSiteVisit} onToggle={() => setRequireSiteVisit(!requireSiteVisit)}
                        label="Site visit willingness" helper="Lead should be willing to visit the site" />
                    </div>

                    <div className="mt-4">
                      <label className={subLabelCls}>Threshold rule</label>
                      <select value={qualificationThresholdRule} onChange={(e) => setQualificationThresholdRule(e.target.value)}
                        className="h-9 px-3 pr-8 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer" style={selectStyle}>
                        <option value="all_critical_1_high">All critical + at least 1 high metric</option>
                        <option value="all_critical">All critical metrics</option>
                        <option value="any_3">Any 3 metrics</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-card-title text-text-primary">Objectives</h3>
                      <p className="text-[11px] text-text-tertiary mt-0.5">{objectives.length} objective{objectives.length !== 1 ? "s" : ""} configured</p>
                    </div>
                    <button onClick={addObjective}
                      className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                      <Plus size={13} strokeWidth={1.5} /> Add objective
                    </button>
                  </div>

                  <div className="space-y-2">
                    {objectives.map((obj, i) => (
                      <div key={obj.id} className="border border-border rounded-[6px] overflow-hidden">
                        <button onClick={() => setExpandedObj(expandedObj === obj.id ? null : obj.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-page transition-colors text-left">
                          <div className="flex flex-col gap-0.5">
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveObj(i, -1); }} disabled={i === 0} className="text-text-tertiary hover:text-text-secondary disabled:opacity-30">
                              <ChevronUp size={11} strokeWidth={2} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveObj(i, 1); }} disabled={i === objectives.length - 1} className="text-text-tertiary hover:text-text-secondary disabled:opacity-30">
                              <ChevronDown size={11} strokeWidth={2} />
                            </button>
                          </div>
                          <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] font-semibold text-text-tertiary">{i + 1}</span>
                          <span className="text-[13px] font-medium text-text-primary flex-1">{obj.name || "Untitled objective"}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-badge border ${PRIORITY_COLORS[obj.priority]}`}>{obj.priority}</span>
                          {obj.required && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-badge bg-accent/10 text-accent">Required</span>}
                          {expandedObj === obj.id ? <ChevronUp size={14} strokeWidth={1.5} className="text-text-tertiary" /> : <ChevronDown size={14} strokeWidth={1.5} className="text-text-tertiary" />}
                        </button>

                        {expandedObj === obj.id && (
                          <div className="px-4 pb-4 pt-2 border-t border-border-subtle space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={subLabelCls}>Name</label>
                                <input type="text" value={obj.name} onChange={(e) => updateObj(obj.id, { name: e.target.value })}
                                  placeholder="e.g., Determine Budget" className="w-full h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent" />
                              </div>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className={subLabelCls}>Priority</label>
                                  <select value={obj.priority} onChange={(e) => updateObj(obj.id, { priority: e.target.value as Priority })}
                                    className="w-full h-9 px-2.5 pr-8 text-[12px] border border-border rounded-input bg-white text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent" style={selectStyle}>
                                    {(["critical", "high", "medium", "low"] as const).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                  </select>
                                </div>
                                <div className="flex items-end pb-0.5">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={obj.required} onChange={(e) => updateObj(obj.id, { required: e.target.checked })}
                                      className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/20" />
                                    <span className="text-[12px] text-text-secondary">Required</span>
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className={subLabelCls}>Description</label>
                              <input type="text" value={obj.description} onChange={(e) => updateObj(obj.id, { description: e.target.value })}
                                placeholder="Brief description of this objective" className="w-full h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={subLabelCls}>Extract field name</label>
                                <input type="text" value={obj.extract_field.name} onChange={(e) => updateObj(obj.id, { extract_field: { ...obj.extract_field, name: e.target.value } })}
                                  placeholder="e.g., budget" className="w-full h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent font-mono" />
                              </div>
                              <div>
                                <label className={subLabelCls}>Field type</label>
                                <select value={obj.extract_field.type} onChange={(e) => updateObj(obj.id, { extract_field: { ...obj.extract_field, type: e.target.value as FieldType } })}
                                  className="w-full h-9 px-2.5 pr-8 text-[12px] border border-border rounded-input bg-white text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-accent" style={selectStyle}>
                                  {FIELD_TYPES.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className={subLabelCls}>Prompt hint</label>
                              <textarea value={obj.prompt_hint} onChange={(e) => updateObj(obj.id, { prompt_hint: e.target.value })} rows={2}
                                placeholder="Guidance for the AI on how to achieve this objective"
                                className="w-full px-2.5 py-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed" />
                            </div>

                            <div>
                              <label className={subLabelCls}>Qualification rule <span className="text-text-tertiary font-normal">(optional)</span></label>
                              <input type="text" value={obj.qualification_rule ?? ""} onChange={(e) => updateObj(obj.id, { qualification_rule: e.target.value || undefined })}
                                placeholder='e.g., budget >= {{min_budget}}' className="w-full h-9 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent font-mono" />
                              <div className="text-[11px] text-text-tertiary mt-1">Use &#123;&#123;variable&#125;&#125; syntax for parameterized rules.</div>
                            </div>

                            <div className="flex justify-end">
                              <button onClick={() => setObjectives(prev => prev.filter(o => o.id !== obj.id))}
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-status-error hover:text-red-700 transition-colors">
                                <Trash2 size={13} strokeWidth={1.5} /> Remove objective
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {objectives.length === 0 && (
                    <div className="text-center py-8 text-[13px] text-text-tertiary">
                      No objectives yet. Click &ldquo;Add objective&rdquo; to get started.
                    </div>
                  )}
                </div>

                {/* Qualification threshold */}
                <div className="bg-white border border-border rounded-card p-6">
                  <h3 className="text-card-title text-text-primary mb-1">Qualification threshold</h3>
                  <p className="text-[11px] text-text-tertiary mb-3">When should a lead be marked as qualified?</p>
                  <select value={threshold} onChange={(e) => setThreshold(e.target.value)}
                    className="h-9 px-3 pr-8 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer" style={selectStyle}>
                    <option value="all_critical_1_high">All critical + at least 1 high objective met</option>
                    <option value="all_critical">All critical objectives met</option>
                    <option value="all_required">All required objectives met</option>
                    <option value="any_3">Any 3 objectives met</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(3)} className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                    <ArrowLeft size={15} strokeWidth={1.5} /> Back
                  </button>
                  <button onClick={() => setStep(5)} className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                    Continue <ArrowRight size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                STEP 6 — Review
            ════════════════════════════════════════════════════ */}
            {step === 5 && (
              <div className="space-y-5">
                <div className="mb-2">
                  <h2 className="text-[20px] font-semibold text-text-primary">Review &amp; create</h2>
                  <p className="text-meta text-text-secondary mt-1">Review your agent configuration before creating it.</p>
                </div>

                {/* Identity summary */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-card-title text-text-primary">Identity</h3>
                    <button onClick={() => setStep(0)} className="text-[11px] font-medium text-accent hover:underline">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <span className="text-[11px] text-text-tertiary">Name</span>
                      <p className="text-[13px] text-text-primary">{name || "\u2014"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-tertiary">Template</span>
                      <p className="text-[13px] text-text-primary capitalize">{template.replace("_", " ")}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-tertiary">Persona</span>
                      <p className="text-[13px] text-text-primary">{persona || "\u2014"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-tertiary">Tone</span>
                      <p className="text-[13px] text-text-primary capitalize">{tone}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-tertiary">Languages</span>
                      <p className="text-[13px] text-text-primary">{selectedLangs.join(", ") || "\u2014"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-tertiary">Language behavior</span>
                      <p className="text-[13px] text-text-primary capitalize">{langBehavior.replace("_", " ")}</p>
                    </div>
                    {goal && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-text-tertiary">Goal</span>
                        <p className="text-[13px] text-text-primary leading-relaxed">{goal}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Channels summary */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-card-title text-text-primary">Channels</h3>
                    <button onClick={() => setStep(1)} className="text-[11px] font-medium text-accent hover:underline">Edit</button>
                  </div>
                  <div className="flex gap-3">
                    {voiceEnabled && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-surface-page rounded-[6px] border border-border">
                        <Phone size={14} strokeWidth={1.5} className="text-text-secondary" />
                        <div>
                          <div className="text-[12px] font-medium text-text-primary">Voice</div>
                          <div className="text-[10px] text-text-tertiary">{newVoiceOptions.find(v => v.id === selectedVoice)?.name} &middot; {maxDuration}m max</div>
                        </div>
                      </div>
                    )}
                    {whatsappEnabled && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-surface-page rounded-[6px] border border-border">
                        <MessageCircle size={14} strokeWidth={1.5} className="text-text-secondary" />
                        <div>
                          <div className="text-[12px] font-medium text-text-primary">WhatsApp</div>
                          <div className="text-[10px] text-text-tertiary">{quickReplies.length} quick replies &middot; {replyTimeout}h timeout</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Knowledge summary */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-card-title text-text-primary">Knowledge</h3>
                    <button onClick={() => setStep(2)} className="text-[11px] font-medium text-accent hover:underline">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div>
                      <span className="text-[11px] text-text-tertiary">Product details</span>
                      <p className="text-[13px] text-text-primary">{productDetails ? `${productDetails.slice(0, 80)}${productDetails.length > 80 ? "..." : ""}` : "Not provided"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-tertiary">FAQs</span>
                      <p className="text-[13px] text-text-primary">{faqs.length} question{faqs.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[11px] text-text-tertiary">System prompt</span>
                      <p className="text-[13px] text-text-primary">{systemPrompt.slice(0, 120)}...</p>
                    </div>
                  </div>
                </div>

                {/* Flow summary */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-card-title text-text-primary">Conversation Flow</h3>
                    <button onClick={() => setStep(3)} className="text-[11px] font-medium text-accent hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1.5">
                    {conversationFlow.map((fs, i) => (
                      <div key={fs.id} className="flex items-center gap-2.5 py-1.5">
                        <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] font-semibold text-text-tertiary">{i + 1}</span>
                        <span className="text-[13px] text-text-primary">{fs.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Objectives summary */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-card-title text-text-primary">Objectives</h3>
                    <button onClick={() => setStep(4)} className="text-[11px] font-medium text-accent hover:underline">Edit</button>
                  </div>
                  <div className="space-y-1.5">
                    {objectives.map((obj, i) => (
                      <div key={obj.id} className="flex items-center gap-2.5 py-1.5">
                        <span className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] font-semibold text-text-tertiary">{i + 1}</span>
                        <span className="text-[13px] text-text-primary flex-1">{obj.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-badge border ${PRIORITY_COLORS[obj.priority]}`}>{obj.priority}</span>
                        {obj.required && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-badge bg-accent/10 text-accent">Required</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <span className="text-[11px] text-text-tertiary">Threshold: </span>
                    <span className="text-[12px] text-text-primary">{threshold.replace(/_/g, " ")}</span>
                  </div>
                </div>

                {/* Test sandbox placeholder */}
                <div className="bg-white border border-border rounded-card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-[8px] bg-surface-secondary flex items-center justify-center shrink-0">
                      <Bot size={18} strokeWidth={1.5} className="text-text-tertiary" />
                    </div>
                    <div>
                      <h3 className="text-card-title text-text-primary">Test your agent</h3>
                      <p className="text-[11px] text-text-tertiary mt-0.5">Preview how your agent will behave in a live conversation.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_280px] gap-4">
                    {/* Chat mockup */}
                    <div className="border border-border rounded-[8px] bg-surface-page p-4 space-y-3 min-h-[200px]">
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <Bot size={14} strokeWidth={1.5} className="text-accent" />
                        </div>
                        <div className="bg-white border border-border rounded-[8px] px-3 py-2 text-[12px] text-text-primary leading-relaxed max-w-[80%]">
                          Hello, this is {persona || name || "your agent"} from Godrej Properties. Am I speaking with the right person?
                        </div>
                      </div>
                      <div className="flex gap-2.5 justify-end">
                        <div className="bg-accent/5 border border-accent/20 rounded-[8px] px-3 py-2 text-[12px] text-text-secondary leading-relaxed max-w-[80%]">
                          Yes, this is correct. I was looking at your properties.
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                          <Bot size={14} strokeWidth={1.5} className="text-accent" />
                        </div>
                        <div className="bg-white border border-border rounded-[8px] px-3 py-2 text-[12px] text-text-tertiary italic leading-relaxed max-w-[80%]">
                          Agent would continue with objective: {objectives[0]?.name || "..."}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                        <input type="text" placeholder="Type a test message..." disabled
                          className="flex-1 h-8 px-3 text-[12px] border border-border rounded-input bg-white text-text-tertiary placeholder:text-text-tertiary cursor-not-allowed" />
                        <button disabled className="w-8 h-8 rounded-input bg-surface-secondary flex items-center justify-center cursor-not-allowed">
                          <Send size={13} strokeWidth={1.5} className="text-text-tertiary" />
                        </button>
                      </div>
                    </div>

                    {/* Live extraction panel */}
                    <div className="border border-border rounded-[8px] bg-surface-page p-4">
                      <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Live Extraction</div>
                      <div className="space-y-2.5">
                        {objectives.slice(0, 5).map((obj) => (
                          <div key={obj.id} className="flex items-center justify-between">
                            <span className="text-[11px] text-text-secondary">{obj.extract_field.name || obj.name}</span>
                            <span className="text-[11px] text-text-tertiary italic">\u2014</span>
                          </div>
                        ))}
                        {objectives.length > 5 && (
                          <div className="text-[11px] text-text-tertiary">+{objectives.length - 5} more fields</div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-border-subtle">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-text-secondary">Qualification</span>
                          <span className="text-[11px] text-text-tertiary">Pending</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-text-secondary">Confidence</span>
                          <span className="text-[11px] text-text-tertiary">\u2014</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-text-tertiary mt-3 text-center">Sandbox testing available after agent is created.</div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 pb-8">
                  <button onClick={() => setStep(4)} className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                    <ArrowLeft size={15} strokeWidth={1.5} /> Back
                  </button>
                  <button onClick={() => router.push("/agents/va-1")} className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                    <Check size={15} strokeWidth={2} /> Create Agent
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
