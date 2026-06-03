// Agent mock data — unified (voice + whatsapp)
// NOTE: Legacy types (AgentItem, AgentChannel, etc.) kept for backward compat.
// New types are in ./types/agent.ts — use AgentListItem and Agent for new pages.

import type { AgentListItem, Agent, Objective, VoiceOption } from "./types/agent";

export type AgentStatus = "active" | "draft" | "paused";
export type AgentChannel = "voice" | "whatsapp";
export type AgentTemplate = "qualifying" | "blank";

export interface AgentItem {
  id: string;
  name: string;
  channel: AgentChannel;
  template: AgentTemplate;
  languages: string[];
  status: AgentStatus;
  callsMade: number;
  qualificationRate: number;
  avgDuration: number;
  lastUsed: string;
  postCallSummary: string;
}

export const agentsList: AgentItem[] = [
  {
    id: "va-1",
    name: "Vox — Qualification Agent",
    channel: "voice",
    template: "qualifying",
    languages: ["English", "Hindi", "Kannada"],
    status: "active",
    callsMade: 1284,
    qualificationRate: 34.2,
    avgDuration: 3.1,
    lastUsed: "2 hours ago",
    postCallSummary: "Auto-push to CRM · 2 retries · Slack notifications",
  },
  {
    id: "va-2",
    name: "Atlas — Follow-up Agent",
    channel: "voice",
    template: "qualifying",
    languages: ["English", "Hindi"],
    status: "active",
    callsMade: 856,
    qualificationRate: 28.7,
    avgDuration: 2.4,
    lastUsed: "1 day ago",
    postCallSummary: "Auto-push to CRM · 3 retries · Email notifications",
  },
  {
    id: "va-3",
    name: "Nova — Survey Agent",
    channel: "voice",
    template: "blank",
    languages: ["English"],
    status: "draft",
    callsMade: 0,
    qualificationRate: 0,
    avgDuration: 0,
    lastUsed: "Never",
    postCallSummary: "No post-call actions configured",
  },
];

// Voices for Step 3
export const voiceOptions = [
  { id: "v-1", name: "Vox", gender: "Female", languages: ["EN", "HI", "KN"] },
  { id: "v-2", name: "Atlas", gender: "Male", languages: ["EN", "HI"] },
  { id: "v-3", name: "Lyra", gender: "Female", languages: ["EN", "HI", "TA"] },
  { id: "v-4", name: "Orbit", gender: "Male", languages: ["EN", "HI", "KN"] },
  { id: "v-5", name: "Halo", gender: "Female", languages: ["EN", "HI", "MR"] },
  { id: "v-6", name: "Echo", gender: "Male", languages: ["EN", "HI", "TE"] },
];

export const languageOptions = [
  "English", "Hindi", "Kannada", "Tamil", "Telugu", "Marathi", "Bengali",
];

export interface QualificationMetric {
  id: string;
  name: string;
  type: "yes_no" | "scale" | "text" | "number";
  condition: string;
  weight: "critical" | "high" | "medium" | "low";
}

export const defaultMetrics: QualificationMetric[] = [
  { id: "qm-1", name: "Budget fit", type: "yes_no", condition: "Budget ≥ ₹5 Cr", weight: "critical" },
  { id: "qm-2", name: "Timeline", type: "scale", condition: "Planning within 6 months (score 4+)", weight: "high" },
  { id: "qm-3", name: "Site visit intent", type: "yes_no", condition: "Willing to visit = Yes", weight: "high" },
  { id: "qm-4", name: "Decision maker", type: "yes_no", condition: "Is primary decision maker", weight: "medium" },
];

export const conversationSteps = [
  { id: "cs-1", step: 1, name: "Greeting", script: "Hello, this is [Agent Name] from Godrej Properties. Am I speaking with [Lead Name]?" },
  { id: "cs-2", step: 2, name: "Interest confirmation", script: "I see you expressed interest in [Project]. Is this a good time for a quick chat?" },
  { id: "cs-3", step: 3, name: "Qualification questions", script: "Ask about: Budget range, Purchase timeline, Property type preference, Family size" },
  { id: "cs-4", step: 4, name: "Scoring", script: "Rate the lead based on qualification metrics" },
  { id: "cs-5", step: 5, name: "Next steps", script: "If qualified: offer site visit. If not qualified: thank them, note reason." },
  { id: "cs-6", step: 6, name: "Closing", script: "Summarize what was discussed, confirm next steps, thank them." },
];

export const defaultSystemPrompt = `You are a professional real estate qualification agent for Godrej Properties. You call leads who have expressed interest in luxury properties in Bangalore. Be warm, professional, and consultative. Your goal is to understand the caller's budget, timeline, and property preferences. Never be pushy. If the lead is qualified, offer to schedule a site visit. If not, thank them politely and note the reason.`;

export const defaultFAQs = [
  { id: "dfaq-1", question: "What is the price range?", answer: "4 & 5 BHK villas starting from ₹6.5 Crore" },
  { id: "dfaq-2", question: "Is it RERA registered?", answer: "Yes, fully RERA registered with clear title" },
  { id: "dfaq-3", question: "Where is the project located?", answer: "IVC Road, near Kempegowda International Airport, North Bangalore" },
];

// ── Agent Performance Data ───────────────────────────────────

export const agentPerformance = {
  dateRange: { start: "2025-10-01", end: "2026-03-23", days: 187 },
  leadMetrics: {
    totalLeads: 397,
    leadsDialed: 397,
    leadsConnected: 318,
    leadsInteracted: 170,
    leadsQualified: 123,
    coverageRate: 100.0,
    connectRate: 80.1,
    interactionRate: 53.46,
    qualificationRate: 30.98,
  },
  callMetrics: {
    totalCalls: 2730,
    callsPerLead: 7,
    totalMinutes: 822,
    avgMinPerLead: 2.07,
    totalCost: 12329,
    costPerLead: 31,
    cpql: 100,
    spentOnQLs: 12329,
    qualifiedLeads: 123,
  },
  dialAttemptsDistribution: [
    { dials: "1", count: 71 },
    { dials: "2", count: 35 },
    { dials: "3", count: 21 },
    { dials: "4", count: 12 },
    { dials: "5", count: 11 },
    { dials: "6", count: 5 },
    { dials: "7", count: 12 },
    { dials: "8", count: 5 },
    { dials: "9", count: 5 },
    { dials: "10", count: 220 },
  ],
  leadStatusDistribution: [
    { name: "RNR", value: 209, color: "#F87171" },
    { name: "Follow Up", value: 39, color: "#FBBF24" },
    { name: "Customer Follow Up", value: 3, color: "#FB923C" },
    { name: "Intent Qualified", value: 23, color: "#F97316" },
    { name: "Qualified", value: 36, color: "#1A1A1A" },
    { name: "Disqualified", value: 87, color: "#991B1B" },
  ],
  funnelData: [
    { label: "Total Leads", value: 397, pct: 100 },
    { label: "Dialed", value: 397, pct: 100 },
    { label: "Connected", value: 318, pct: 80.1 },
    { label: "Interacted", value: 170, pct: 42.8 },
    { label: "Qualified", value: 123, pct: 30.98 },
  ],
  dailyCallActivity: Array.from({ length: 30 }, (_, i) => ({
    date: `${i < 8 ? "Feb" : "Mar"} ${i < 8 ? 22 + i : i - 7}`,
    calls: Math.floor(10 + Math.random() * 15 + (i > 15 ? 5 : 0)),
  })),
  disqualificationReasons: [
    { reason: "Budget below threshold", pct: 41, count: 36 },
    { reason: "Timeline beyond 12 months", pct: 30, count: 26 },
    { reason: "Not the decision maker", pct: 17, count: 15 },
    { reason: "Not interested", pct: 12, count: 10 },
  ],
};

// Agent detail data
export const agentDetail = {
  ...agentsList[0],
  goal: "Qualify inbound leads for luxury real estate properties in Whitefield, Bangalore. Determine budget, timeline, configuration preference, and schedule site visits for qualified leads.",
  systemPrompt: defaultSystemPrompt,
  knowledgeBases: ["Godrej_Reflections_Brochure.pdf", "Godrej_Air_Pricing.pdf"],
  metrics: defaultMetrics,
  voice: voiceOptions[0],
  selectedLanguages: ["English", "Hindi", "Kannada"],
  tone: "conversational" as const,
  flow: conversationSteps,
  postCall: {
    pushToCRM: true,
    retryUnanswered: true,
    maxRetries: 2,
    retryAfter: "4 hours",
    sendFollowUpVoicemail: true,
    notifyOnQualified: true,
    notifyChannels: ["slack"],
    callingHoursStart: "10:00 AM",
    callingHoursEnd: "7:00 PM",
    activeDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
  stats: {
    totalCalls: 1284,
    connected: 1012,
    qualified: 346,
    notQualified: 520,
    callback: 146,
    avgDuration: 3.1,
    qualificationRate: 34.2,
    connectionRate: 78.8,
  },
  recentCalls: [
    { id: "rc-1", name: "V***** R*****", phone: "98XXX XX342", outcome: "qualified" as const, duration: 4.2, date: "2026-03-22T14:32:00", qualification: "Intent Qualified" },
    { id: "rc-2", name: "S***** M*****", phone: "90XXX XX891", outcome: "not_qualified" as const, duration: 2.1, date: "2026-03-22T14:18:00", qualification: "Not Qualified" },
    { id: "rc-3", name: "A***** K*****", phone: "87XXX XX156", outcome: "qualified" as const, duration: 3.5, date: "2026-03-22T13:55:00", qualification: "Intent Qualified" },
    { id: "rc-4", name: "P***** J*****", phone: "99XXX XX723", outcome: "callback" as const, duration: 0.8, date: "2026-03-22T13:40:00", qualification: "Pending" },
    { id: "rc-5", name: "R***** B*****", phone: "80XXX XX445", outcome: "no_answer" as const, duration: 0, date: "2026-03-22T13:22:00", qualification: "—" },
    { id: "rc-6", name: "N***** D*****", phone: "91XXX XX867", outcome: "voicemail" as const, duration: 0.5, date: "2026-03-22T12:50:00", qualification: "—" },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// NEW: Objective-based agent data (for redesigned pages)
// ═══════════════════════════════════════════════════════════════════

/** Default objectives for a real estate qualification agent */
export const defaultObjectives: Objective[] = [
  {
    id: "obj-1",
    name: "Confirm Identity",
    description: "Verify you are speaking with the right person",
    priority: "critical",
    required: true,
    extract_field: { name: "name_confirmed", type: "boolean" },
    prompt_hint: "Greet the lead by name and confirm their identity",
  },
  {
    id: "obj-2",
    name: "Determine Budget",
    description: "Understand the lead's budget range for the property",
    priority: "critical",
    required: true,
    extract_field: { name: "budget", type: "currency", unit: "₹" },
    prompt_hint: "Naturally ask about their budget range without being pushy",
    qualification_rule: "budget >= {{min_budget}}",
  },
  {
    id: "obj-3",
    name: "Assess Timeline",
    description: "Find out when the lead plans to make a purchase",
    priority: "high",
    required: true,
    extract_field: { name: "timeline", type: "duration", unit: "months" },
    prompt_hint: "Ask when they are planning to buy or move",
    qualification_rule: "timeline <= 6",
  },
  {
    id: "obj-4",
    name: "Site Visit Interest",
    description: "Check if the lead is willing to visit the property",
    priority: "high",
    required: false,
    extract_field: { name: "site_visit_interest", type: "boolean" },
    prompt_hint: "If they seem interested, offer to schedule a site visit",
  },
  {
    id: "obj-5",
    name: "Decision Maker Status",
    description: "Confirm if the lead is the primary decision maker",
    priority: "medium",
    required: false,
    extract_field: { name: "is_decision_maker", type: "boolean" },
    prompt_hint: "Gently ask if they are the one making the purchase decision",
    qualification_rule: "is_decision_maker == true",
  },
  {
    id: "obj-6",
    name: "Property Preferences",
    description: "Understand BHK preference, location, and amenity priorities",
    priority: "low",
    required: false,
    extract_field: { name: "property_preference", type: "string" },
    prompt_hint: "Ask about their ideal configuration and must-have amenities",
  },
];

/** New agent list (objective-based, channel-agnostic) */
export const newAgentsList: AgentListItem[] = [
  {
    id: "va-1",
    name: "Vox — Qualification Agent",
    description: "Qualifies inbound leads for luxury real estate properties in Bangalore",
    template: "qualifying",
    status: "active",
    supported_channels: ["voice", "whatsapp"],
    languages: ["English", "Hindi", "Kannada"],
    objectives_count: 6,
    variables_count: 2,
    total_calls: 1284,
    qualification_rate: 34.2,
    avg_duration: 3.1,
    last_used: "2 hours ago",
    post_call_summary: "Used in 3 active workflows",
  },
  {
    id: "va-2",
    name: "Atlas — Follow-up Agent",
    description: "Re-engages cold leads and handles follow-up conversations",
    template: "follow_up",
    status: "active",
    supported_channels: ["voice"],
    languages: ["English", "Hindi"],
    objectives_count: 4,
    variables_count: 1,
    total_calls: 856,
    qualification_rate: 28.7,
    avg_duration: 2.4,
    last_used: "1 day ago",
    post_call_summary: "Used in 1 active workflow",
  },
  {
    id: "va-3",
    name: "Nova — Survey Agent",
    description: "Conducts satisfaction surveys and collects feedback",
    template: "survey",
    status: "draft",
    supported_channels: ["voice", "whatsapp"],
    languages: ["English"],
    objectives_count: 0,
    variables_count: 0,
    total_calls: 0,
    qualification_rate: 0,
    avg_duration: 0,
    last_used: "Never",
    post_call_summary: "No workflows configured",
  },
];

/** Full agent detail (objective-based) for Vox */
export const newAgentDetail: Agent = {
  id: "va-1",
  name: "Vox — Qualification Agent",
  description: "Qualifies inbound leads for luxury real estate properties in Bangalore",
  status: "active",
  template: "qualifying",

  identity: {
    persona: "Vox",
    tone: "conversational",
    languages: ["English", "Hindi", "Kannada"],
    language_behavior: "match_lead",
  },

  knowledge: {
    product_brief: "Luxury 4 & 5 BHK villas in Whitefield, Bangalore starting from ₹6.5 Crore. RERA registered with world-class amenities including clubhouse, swimming pool, and landscaped gardens.",
    system_prompt: defaultSystemPrompt,
    faqs: defaultFAQs,
    objection_handling: [
      "If they say it's too expensive: Highlight the EMI options and investment value",
      "If they are unsure about the location: Mention proximity to IT parks and infrastructure development",
      "If they want to think about it: Offer to send a brochure and schedule a follow-up",
    ],
    custom_docs: ["Godrej_Reflections_Brochure.pdf", "Godrej_Air_Pricing.pdf"],
  },

  objectives: defaultObjectives,

  variables: [
    { name: "min_budget", type: "currency", required: true, default: "1Cr", description: "Minimum budget threshold for qualification" },
    { name: "project_name", type: "string", required: false, default: "Godrej Reflections", description: "Name of the property project" },
  ],

  voice_config: {
    voice_id: "v-1",
    voice_name: "Vox",
    max_duration_min: 5,
    silence_timeout_sec: 10,
    interruption_handling: true,
  },

  whatsapp_config: {
    first_message_template: "Hi {{lead_name}}, this is Vox from Godrej Properties. 🏡 I saw you were interested in {{project_name}}. Would you like to know more about our exclusive offers?",
    quick_replies: ["Yes, tell me more", "Schedule a site visit", "Send brochure", "Not interested"],
    reply_timeout_hours: 24,
    rich_media: [
      { type: "image", url: "/assets/godrej-hero.jpg", caption: "Godrej Reflections — Luxury Villas" },
      { type: "document", url: "/assets/brochure.pdf", caption: "Download Brochure" },
    ],
  },

  output_schema: {
    qualification_threshold: "all critical + 1 high",
    custom_extract_fields: [
      { name: "budget", label: "Budget Range", type: "currency", unit: "₹" },
      { name: "timeline", label: "Purchase Timeline", type: "duration", unit: "months" },
      { name: "site_visit_interest", label: "Site Visit Interest", type: "boolean" },
      { name: "is_decision_maker", label: "Decision Maker", type: "boolean" },
      { name: "property_preference", label: "Property Preference", type: "string" },
    ],
  },

  stats: {
    total_calls: 1284,
    connection_rate: 78.8,
    qualification_rate: 34.2,
    avg_duration_min: 3.1,
    last_used: "2 hours ago",
  },
};

/** Voice options with new type structure */
export const newVoiceOptions: VoiceOption[] = [
  { id: "v-1", name: "Vox", gender: "Female", languages: ["English", "Hindi", "Kannada"] },
  { id: "v-2", name: "Atlas", gender: "Male", languages: ["English", "Hindi"] },
  { id: "v-3", name: "Lyra", gender: "Female", languages: ["English", "Hindi", "Tamil"] },
  { id: "v-4", name: "Orbit", gender: "Male", languages: ["English", "Hindi", "Kannada"] },
  { id: "v-5", name: "Halo", gender: "Female", languages: ["English", "Hindi", "Marathi"] },
  { id: "v-6", name: "Echo", gender: "Male", languages: ["English", "Hindi", "Telugu"] },
];

// ═══════════════════════════════════════════════════════════════════
// Agents MVP — Qualification Criteria types & mock data
// ═══════════════════════════════════════════════════════════════════

export const POST_CALL_METRICS = [
  "location_fit",
  "budget_fit",
  "configuration_fit",
  "possession_fit",
  "site_visit_interest",
  "timeline_fit",
  "decision_maker",
  "loan_eligibility",
] as const;

export type PostCallMetric = (typeof POST_CALL_METRICS)[number];

export interface QualificationCondition {
  id: string;
  field: PostCallMetric;
  value: string;
}

export interface QualificationRule {
  id: string;
  description: string;
  conditions: QualificationCondition[];
}

export interface QualificationCriteriaConfig {
  qualified: QualificationRule[];
  disqualified: QualificationRule[];
}

const defaultQualificationCriteria: QualificationCriteriaConfig = {
  qualified: [
    {
      id: "q-rule-1",
      description: "location_fit, budget_fit, configuration_fit, possession_fit",
      conditions: [
        { id: "qc-1", field: "location_fit", value: "yes" },
        { id: "qc-2", field: "budget_fit", value: "yes" },
        { id: "qc-3", field: "configuration_fit", value: "yes" },
        { id: "qc-4", field: "possession_fit", value: "yes" },
      ],
    },
    {
      id: "q-rule-2",
      description: "location_fit, budget_fit, site_visit_interest",
      conditions: [
        { id: "qc-5", field: "location_fit", value: "yes" },
        { id: "qc-6", field: "budget_fit", value: "yes" },
        { id: "qc-7", field: "site_visit_interest", value: "yes" },
      ],
    },
    {
      id: "q-rule-3",
      description: "budget_fit, timeline_fit, decision_maker",
      conditions: [
        { id: "qc-8", field: "budget_fit", value: "yes" },
        { id: "qc-9", field: "timeline_fit", value: "yes" },
        { id: "qc-10", field: "decision_maker", value: "yes" },
      ],
    },
  ],
  disqualified: [
    {
      id: "d-rule-1",
      description: "if budget_fit is no",
      conditions: [
        { id: "dc-1", field: "budget_fit", value: "no" },
      ],
    },
    {
      id: "d-rule-2",
      description: "if location_fit is no and site_visit_interest is no",
      conditions: [
        { id: "dc-2", field: "location_fit", value: "no" },
        { id: "dc-3", field: "site_visit_interest", value: "no" },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// Agents MVP — Detail page mock data
// ═══════════════════════════════════════════════════════════════════

export interface AgentMvpDetail {
  id: string;
  name: string;
  status: "active" | "draft" | "paused";
  agentType: string;
  agentId: string;
  phoneNumber: string;
  systemPrompt: string;
  systemPromptSections: number;
  greetingTemplate: string;
  voiceId: string;
  voiceName: string;
  llmConfig: { provider: string; model: string; temperature: number };
  sttConfig: { provider: string; model: string; language: string };
  languageConfig: { primary: string; additional: string[] };
  otherConfig: { timezone: string; concurrency: number; speakingSpeed: number };
  knowledgeFiles: { id: string; name: string; type: string }[];
  faqs: { id: string; question: string; answer: string }[];
  qualificationCriteria: QualificationCriteriaConfig;
}

export const agentMvpDetails: Record<string, AgentMvpDetail> = {
  "amvp-1": {
    id: "amvp-1",
    name: "Godrej Air — Lead Qualifier",
    status: "active",
    agentType: "AI Call",
    agentId: "livekit_godrej_air_outbound",
    phoneNumber: "+918065481615",
    systemPrompt: defaultSystemPrompt,
    systemPromptSections: 22,
    greetingTemplate: "Good {{greeting_time}}, am I speaking with {{salutation}} {{customer_name}}?",
    voiceId: "v-1",
    voiceName: "Pulse (Revspot)",
    llmConfig: { provider: "Groq", model: "GPT-OSS 120B", temperature: 0.2 },
    sttConfig: { provider: "Deepgram", model: "Nova 3", language: "Hindi (hi)" },
    languageConfig: { primary: "English", additional: ["Hindi", "Kannada"] },
    otherConfig: { timezone: "Asia/Kolkata (IST)", concurrency: 2, speakingSpeed: 1.0 },
    knowledgeFiles: [
      { id: "kf-1", name: "Godrej Air Brochure.pdf", type: "pdf" },
      { id: "kf-2", name: "Pricing Sheet Q1 2026.pdf", type: "pdf" },
    ],
    faqs: [
      ...defaultFAQs,
      { id: "faq-4", question: "What are the payment terms?", answer: "Flexible payment plans available with 10% booking amount and construction-linked payments." },
      { id: "faq-5", question: "Is home loan available?", answer: "Yes, pre-approved home loans from SBI, HDFC, ICICI, and Axis Bank at competitive rates." },
    ],
    qualificationCriteria: defaultQualificationCriteria,
  },
  "amvp-2": {
    id: "amvp-2",
    name: "Godrej Reflections — Re-engagement",
    status: "active",
    agentType: "AI Call",
    agentId: "livekit_godrej_reflections_outbound",
    phoneNumber: "+918065481620",
    systemPrompt: "You are a friendly follow-up agent for Godrej Properties. You are calling leads who previously expressed interest in Godrej Reflections but haven't taken the next step. Your goal is to understand what held them back, address concerns, and help them move forward. Be empathetic and never pushy.",
    systemPromptSections: 15,
    greetingTemplate: "Hi {{customer_name}}, this is Vox from Godrej Properties. We spoke earlier about Godrej Reflections — do you have a moment?",
    voiceId: "v-1",
    voiceName: "Vox (Revspot)",
    llmConfig: { provider: "OpenAI", model: "GPT-4o", temperature: 0.3 },
    sttConfig: { provider: "Deepgram", model: "Nova 3", language: "English (en)" },
    languageConfig: { primary: "English", additional: ["Hindi"] },
    otherConfig: { timezone: "Asia/Kolkata (IST)", concurrency: 3, speakingSpeed: 1.0 },
    knowledgeFiles: [
      { id: "kf-3", name: "Godrej Reflections Offerings.pdf", type: "pdf" },
    ],
    faqs: defaultFAQs,
    qualificationCriteria: {
      qualified: [
        {
          id: "q-rule-r1",
          description: "budget_fit, location_fit",
          conditions: [
            { id: "qc-r1", field: "budget_fit", value: "yes" },
            { id: "qc-r2", field: "location_fit", value: "yes" },
          ],
        },
      ],
      disqualified: [
        {
          id: "d-rule-r1",
          description: "if budget_fit is no",
          conditions: [
            { id: "dc-r1", field: "budget_fit", value: "no" },
          ],
        },
      ],
    },
  },
};
