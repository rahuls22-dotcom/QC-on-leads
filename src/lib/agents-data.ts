// Agent-level Quality Control data — the fleet view ported from the QC
// prototype into the QC-on-leads design system.
//
// Shape mirrors the production /agents screen (name + phone, channel, status,
// created date) and adds the QC layer: a composite 0..100 score with a trend
// delta, a rolling call count, and — for the wired demo agent — a full
// signal breakdown (S1..S4 with sub-signals), ranked failure reasons, the
// list of affected calls, and a representative call transcript.

export type AgentStatus = "live" | "paused" | "draft";

/**
 * Optional capability catalogue surfaced on the agent Configuration tab.
 * Operators opt in to each one; the runtime always loads the two core
 * handlers (end_call, voice_mail_detection) regardless.
 */
export interface AgentCapability {
  id: string;
  label: string;
  /** Underlying tool keys the platform should load when this is enabled. */
  tools: string[];
}

export const OPTIONAL_CAPABILITIES: AgentCapability[] = [
  { id: "multilingual_detection", label: "Multilingual detection", tools: ["detect_language"] },
  { id: "email_capture", label: "Email capture", tools: ["capture_email"] },
  { id: "budget_calculator", label: "Budget calculator", tools: ["budget_calculator"] },
  {
    id: "experience_center_info",
    label: "Experience center info",
    tools: ["get_experience_centre", "get_experience_center_address"],
  },
  { id: "transfer_to_human", label: "Transfer to human", tools: ["transfer_call"] },
];

export interface Agent {
  id: string;
  name: string;
  phone: string | null;
  channel: string;
  status: AgentStatus;
  /** Composite QC score 0..100, or null when not yet scored. */
  composite: number | null;
  /** Delta vs the 7-day baseline. Positive = improving. */
  trend?: number;
  callCount: number;
  createdAt: string;
  /** Has calls but fewer than the 10 needed to score reliably (US-06). */
  insufficientData?: boolean;
  /** Signal id of the lowest-scoring signal, e.g. "S1". */
  lowestSignal?: string;
  /** The one agent wired with full drill-down detail. */
  isMain?: boolean;
  /**
   * IDs from OPTIONAL_CAPABILITIES the agent has enabled. Live/paused
   * agents are grandfathered with the tools they were already using.
   * Draft agents start empty.
   */
  capabilities?: string[];
}

export interface SubSignal {
  id: string;        // internal key, e.g. "1.2"
  name: string;
  description: string;
  score: number;
  calls: number;
}

export interface Signal {
  id: string;        // internal key, "S1"..
  name: string;
  description: string;
  weight: number;    // % contribution to composite
  score: number;
  callsAffected: number;
  isLowest?: boolean;
  subsignals: SubSignal[];
}

export interface Reason {
  /** Human-readable metric this reason maps to (used to focus affected calls). */
  metric: string;
  priority: 1 | 2 | 3;
  title: string;
  calls: number;
  body: string;
}

export interface AgentDetail {
  qr: number;             // qualification rate %
  lastUpdated: string;
  owner: string;
  signals: Signal[];
  reasons: Reason[];
}

export type CallOutcome = "qualified" | "disqualified" | "hangup";

export interface AffectedCall {
  id: string;
  time: string;
  duration: string;
  outcome: CallOutcome;
  evidence: string;
  confidence: number;
}

export interface CallTurn {
  speaker: "bot" | "user";
  t: string;
  text: string;
  flag?: {
    signal: string;
    subsignal: string;
    reason: string;
    confidence: number;
  };
}

export interface CallDetail {
  id: string;
  time: string;
  duration: string;
  outcome: CallOutcome;
  composite: number;
  turns: CallTurn[];
}

// ── Agents (entry-point list) ─────────────────────────────────────────────

export const agents: Agent[] = [
  { id: "a1", name: "TVS Emerald Altura", phone: null, channel: "Ai Call", status: "live", composite: 78, trend: 2, callCount: 32, createdAt: "04/05/2026", lowestSignal: "S4", capabilities: ["experience_center_info", "budget_calculator", "transfer_to_human"] },
  { id: "a2", name: "Godrej Reserve Multilingual (English+Marathi+Hindi)", phone: null, channel: "Ai Call", status: "draft", composite: null, callCount: 0, createdAt: "04/05/2026", capabilities: [] },
  { id: "a3", name: "Ramky Fortuna Outbound", phone: "+918065481192", channel: "Ai Call", status: "live", composite: 64, trend: -8, callCount: 47, createdAt: "30/04/2026", lowestSignal: "S1", isMain: true, capabilities: ["multilingual_detection", "budget_calculator", "experience_center_info", "transfer_to_human"] },
  { id: "a4", name: "Godrej Skyshore OBD", phone: "+918065481193", channel: "Ai Call", status: "live", composite: 81, trend: 3, callCount: 28, createdAt: "30/04/2026", capabilities: ["multilingual_detection", "transfer_to_human"] },
  { id: "a5", name: "Godrej Reserve Test", phone: null, channel: "Ai Call", status: "live", composite: 71, trend: -2, callCount: 19, createdAt: "30/04/2026", capabilities: ["budget_calculator"] },
  { id: "a6", name: "Podar School Inbound", phone: "+918065481217", channel: "Ai Call", status: "paused", composite: 41, trend: -22, callCount: 31, createdAt: "30/04/2026", lowestSignal: "S1", capabilities: ["email_capture", "transfer_to_human"] },
  { id: "a7", name: "Godrej Trilogy OBD", phone: "+918065481248", channel: "Ai Call", status: "live", composite: 87, trend: 1, callCount: 56, createdAt: "29/04/2026", capabilities: ["multilingual_detection", "budget_calculator", "experience_center_info", "email_capture", "transfer_to_human"] },
  { id: "a8", name: "Neha: Godrej Reserve (English + Marathi)", phone: "+918065481194", channel: "Ai Call", status: "live", composite: null, insufficientData: true, callCount: 6, createdAt: "28/04/2026", capabilities: ["multilingual_detection", "transfer_to_human"] },
  { id: "a9", name: "Test Agent 33", phone: null, channel: "Ai Call", status: "draft", composite: null, callCount: 0, createdAt: "28/04/2026", capabilities: [] },
  { id: "a10", name: "Neha: Godrej Arden (English + Hindi)", phone: "+918065481291", channel: "Ai Call", status: "live", composite: 73, trend: 0, callCount: 24, createdAt: "28/04/2026", capabilities: ["multilingual_detection", "budget_calculator", "transfer_to_human"] },
];

// ── Full drill-down detail — wired for the main agent (a3) ────────────────

export const agentDetail: AgentDetail = {
  qr: 11,
  lastUpdated: "2 min ago",
  owner: "rahul.soren",
  signals: [
    {
      id: "S1", name: "Qualification Data Capture",
      description: "Did the agent capture the required lead details accurately and completely?",
      weight: 45, score: 58, callsAffected: 21, isLowest: true,
      subsignals: [
        { id: "1.1", name: "Field presence", description: "Asked for every required field", score: 72, calls: 8 },
        { id: "1.2", name: "Field accuracy", description: "Captured values match what the caller said", score: 44, calls: 14 },
        { id: "1.3", name: "Field completeness", description: "Captured every part of each field", score: 68, calls: 6 },
        { id: "1.4", name: "Final acknowledgement", description: "Read captured values back before ending", score: 54, calls: 11 },
        { id: "1.5", name: "Conditional path respect", description: "Asked follow-ups only when relevant", score: 80, calls: 3 },
      ],
    },
    {
      id: "S2", name: "Content Accuracy",
      description: "Did the agent stay factual and on-message, avoiding invented claims?",
      weight: 25, score: 71, callsAffected: 8,
      subsignals: [
        { id: "2.1", name: "Hallucination rate", description: "Avoided stating unverified facts", score: 76, calls: 3 },
        { id: "2.2", name: "Compliance items", description: "Spoke the required disclosures", score: 88, calls: 2 },
        { id: "2.3", name: "Claim boundary", description: "Stayed within approved claims", score: 70, calls: 4 },
        { id: "2.4", name: "Intra-call consistency", description: "Didn't contradict itself mid-call", score: 65, calls: 1 },
        { id: "2.5", name: "Numerical accuracy", description: "Stated prices and numbers correctly", score: 78, calls: 2 },
      ],
    },
    {
      id: "S3", name: "Script / Prompt Adherence",
      description: "Did the agent follow the required questions, order, and branching?",
      weight: 15, score: 78, callsAffected: 5,
      subsignals: [
        { id: "3.1", name: "Mandatory question coverage", description: "Asked every required question", score: 82, calls: 3 },
        { id: "3.2", name: "Flow order adherence", description: "Kept questions in the intended order", score: 74, calls: 5 },
        { id: "3.3", name: "Correct branching", description: "Took the right path on caller answers", score: 79, calls: 2 },
        { id: "3.4", name: "Opening adherence", description: "Used the approved opening", score: 85, calls: 1 },
        { id: "3.5", name: "Closing adherence", description: "Used the approved closing", score: 72, calls: 4 },
      ],
    },
    {
      id: "S4", name: "Latency & Responsiveness",
      description: "How quickly did the agent respond across the conversation?",
      weight: 15, score: 62, callsAffected: 12,
      subsignals: [
        { id: "4.1", name: "Median turn latency", description: "Typical reply speed across turns", score: 58, calls: 12 },
        { id: "4.2", name: "First-response latency", description: "Time to the first reply", score: 62, calls: 8 },
        { id: "4.3", name: "Overlap-inducing latency", description: "Pauses that caused talk-over", score: 70, calls: 4 },
        { id: "4.4", name: "Tool call latency", description: "Speed of data and tool lookups", score: 65, calls: 6 },
      ],
    },
  ],
  reasons: [
    { metric: "Field accuracy",      priority: 1, title: "Budget captured without a currency unit",  calls: 14, body: "Prompt the agent to reconfirm ₹/lakhs/cr, or assume INR for India." },
    { metric: "Median turn latency", priority: 2, title: "Replies slower than the 1.5s target",      calls: 12, body: "Enable streaming on the model, or shrink first-token KB lookups." },
    { metric: "Final acknowledgement", priority: 3, title: "No read-back before the call ends",      calls: 11, body: "Add a final-summary step to the prompt template." },
  ],
};

export const affectedCalls: AffectedCall[] = [
  { id: "C-48291", time: "2026-05-04 10:42", duration: "3m 22s", outcome: "disqualified", evidence: "User: '50' · Bot: 'Got it. And what's your timeline?'", confidence: 0.92 },
  { id: "C-48283", time: "2026-05-04 09:58", duration: "4m 11s", outcome: "qualified", evidence: "User: 'around fifty' · Bot moved to next question without unit", confidence: 0.89 },
  { id: "C-48267", time: "2026-05-04 08:31", duration: "2m 47s", outcome: "hangup", evidence: "Budget value '60' captured. No reconfirmation of unit (lakhs/crore).", confidence: 0.86 },
  { id: "C-48254", time: "2026-05-03 21:14", duration: "3m 03s", outcome: "qualified", evidence: "User: 'budget is one' — captured as 1 with no unit", confidence: 0.81 },
  { id: "C-48241", time: "2026-05-03 19:22", duration: "5m 28s", outcome: "qualified", evidence: "Budget captured as numeric '75' — validator failed; required: amount + currency", confidence: 0.94 },
  { id: "C-48232", time: "2026-05-03 18:09", duration: "2m 55s", outcome: "disqualified", evidence: "User said 'no specific budget' but bot logged '0' — accuracy fail", confidence: 0.78 },
  { id: "C-48218", time: "2026-05-03 16:42", duration: "4m 02s", outcome: "qualified", evidence: "User: 'fifty lakh' (audio) — ASR captured as '50' only", confidence: 0.85 },
  { id: "C-48201", time: "2026-05-03 15:18", duration: "3m 39s", outcome: "hangup", evidence: "Numeric value missing currency context — schema validator failed", confidence: 0.91 },
];

export const callDetail: CallDetail = {
  id: "C-48291",
  time: "2026-05-04 10:42",
  duration: "3m 22s",
  outcome: "disqualified",
  composite: 52,
  turns: [
    { speaker: "bot", t: "0:00", text: "Hi, this is Maya from Ramky Fortuna calling about your inquiry. This call is being recorded for quality. Is this a good time to talk for 2 minutes?" },
    { speaker: "user", t: "0:08", text: "Yeah sure, go ahead." },
    { speaker: "bot", t: "0:11", text: "Great. I see you were looking at our 3BHK options. Could you tell me — are you looking for self-use or investment?" },
    { speaker: "user", t: "0:16", text: "Self-use, for the family." },
    { speaker: "bot", t: "0:19", text: "Got it. And what's your budget range?" },
    { speaker: "user", t: "0:23", text: "About 50." },
    { speaker: "bot", t: "0:26", text: "Got it. And what's your timeline to move in?", flag: { signal: "S1.2", subsignal: "Field accuracy", reason: "Captured budget value '50' without currency unit. Validator rejected (expected: amount + ₹/lakhs/cr). Bot should have reconfirmed unit before progressing.", confidence: 0.92 } },
    { speaker: "user", t: "0:32", text: "Hopefully in the next 6 months." },
    { speaker: "bot", t: "0:35", text: "Perfect. Are you currently looking at any other projects in the area?" },
    { speaker: "user", t: "0:40", text: "Yes, also looking at Brigade Cornerstone." },
    { speaker: "bot", t: "0:44", text: "Okay. And one last thing — would you be financing this with a home loan?" },
    { speaker: "user", t: "0:50", text: "Yes, partly." },
    { speaker: "bot", t: "0:53", text: "Great. I'll arrange a site visit. Our team will reach out within 24 hours. Anything else?", flag: { signal: "S1.4", subsignal: "Final acknowledgement", reason: "Closing missing the final read-back of all captured fields (budget, timeline, financing). Required acknowledgement step skipped.", confidence: 0.81 } },
    { speaker: "user", t: "1:01", text: "No, that's all." },
    { speaker: "bot", t: "1:03", text: "Thanks for your time. Have a great day!" },
  ],
};

// ── Lookups ───────────────────────────────────────────────────────────────

export function findAgent(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}

/** Full detail only exists for the wired demo agent. */
export function getAgentDetail(agent: Agent): AgentDetail | null {
  return agent.isMain ? agentDetail : null;
}

// ── Score / confidence helpers ────────────────────────────────────────────

export type ScoreBand = "good" | "warn" | "bad";

export function scoreBand(score: number): ScoreBand {
  return score >= 75 ? "good" : score >= 60 ? "warn" : "bad";
}

/**
 * Text color for a score. Kept deliberately calm: numbers read neutral, with
 * red reserved for genuinely failing scores so the eye lands on real problems.
 */
export function scoreTextClass(score: number): string {
  return scoreBand(score) === "bad" ? "text-destructive" : "text-foreground";
}

/** Progress-fill color: green when healthy, neutral when borderline, red when failing. */
export function scoreFillClass(score: number): string {
  const band = scoreBand(score);
  return band === "good"
    ? "bg-success"
    : band === "warn"
      ? "bg-foreground/35"
      : "bg-destructive";
}

/** Human-readable names for the internal signal keys (S1..S4). */
export const SIGNAL_NAMES: Record<string, string> = {
  S1: "Qualification Data Capture",
  S2: "Content Accuracy",
  S3: "Script / Prompt Adherence",
  S4: "Latency & Responsiveness",
};

/** Resolve a signal key (or undefined) to a display label. */
export function signalLabel(code?: string): string {
  if (!code) return "—";
  return SIGNAL_NAMES[code] ?? code;
}

export function outcomeLabel(o: CallOutcome): string {
  return o === "qualified" ? "Qualified" : o === "disqualified" ? "Disqualified" : "Hangup";
}
