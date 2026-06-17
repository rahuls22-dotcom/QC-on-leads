"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultQualificationCriteria,
  defaultFAQs,
  type AgentMvpDetail,
} from "./voice-agent-data";

// ── Calibration ────────────────────────────────────────────────────────────
//
// Vapi-style: take the user's free-text goal and synthesize a calibrated
// system prompt + first message + starter FAQs. Pure string templating for
// the demo — no LLM call. The output reads as "this was crafted for me"
// because the goal text gets woven through every section.

export interface AgentSeed {
  name: string;
  goal: string;
}

/** Tiny deterministic id so the agent has a stable URL slug. */
function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24) || "agent";
  // Suffix to avoid collisions with the static demo set.
  const stamp = Math.floor(performance.now() % 100000).toString(36);
  return `new-${base}-${stamp}`;
}

/** Pull lightweight intent signals from the goal text — keyword presence
 *  rather than NLU. Drives FAQ seeding + greeting tone. */
function readIntent(goal: string) {
  const t = goal.toLowerCase();
  return {
    qualify:   /qualif|screen|filter|eligib/.test(t),
    book:      /book|appoint|schedul|site visit|demo|meet/.test(t),
    support:   /support|help|complain|ticket|issue/.test(t),
    survey:    /survey|feedback|nps/.test(t),
    sales:     /sale|sell|upsell|cross.?sell|pitch/.test(t),
    handoff:   /human|agent|hand.?off|transfer|escalat/.test(t),
    budget:    /budget|price|cost|cr|lakh|crore|usd|inr|₹|\$/.test(t),
    timeline:  /timeline|when|month|quarter|year|asap|urgent/.test(t),
  };
}

export function calibrateFromGoal(seed: AgentSeed): AgentMvpDetail {
  const { name, goal } = seed;
  const intent = readIntent(goal);

  // Prompt — Role / Tone / Ask / Handoff. Each section quotes the goal so
  // the prompt feels woven from their words, not generic.
  const systemPrompt = [
    `# Role`,
    `You are ${name}, a voice agent calling on behalf of the user's business.`,
    `Your purpose, as defined by the user: "${goal.trim()}"`,
    ``,
    `# Tone`,
    `Warm, professional, concise. Mirror the caller's energy. Never pushy.`,
    `Speak in short sentences — voice, not chat. Pause for the caller to respond.`,
    ``,
    `# What to ask`,
    intent.qualify
      ? `Qualify the caller against the criteria implicit in the goal above. Confirm fit before going deeper.`
      : `Open with a check-in on the caller's situation, then move to the goal.`,
    intent.budget   ? `- Confirm budget range early; don't push past it.` : ``,
    intent.timeline ? `- Establish urgency / timeline before discussing next steps.` : ``,
    intent.book     ? `- If the caller is qualified, offer two concrete time slots.` : ``,
    ``,
    `# Handoff`,
    intent.handoff
      ? `Transfer to a human the moment the caller asks, OR when the conversation moves outside your scope.`
      : `Wrap up cleanly once the goal is met. Summarize what was agreed before hanging up.`,
    ``,
    `# Hard rules`,
    `- Never invent prices, dates, or commitments not provided in your knowledge base.`,
    `- If you don't know the answer, say so and offer to follow up by email or human callback.`,
    `- Confirm contact details before ending the call.`,
  ].filter(Boolean).join("\n");

  // Greeting — first message the caller hears. References the calibrated
  // identity but stays generic enough that the {{customer_name}} variable
  // does the personalisation at call time.
  const greetingTemplate = intent.support
    ? `Hi, this is ${name}. I'm calling about your recent ticket — is now a good time to chat?`
    : intent.book
    ? `Hi {{customer_name}}, this is ${name}. I'm calling to help set up a quick meeting — do you have two minutes?`
    : `Hi {{customer_name}}, this is ${name}. I'm calling on behalf of the team — do you have a quick minute?`;

  // FAQ seeding — picks 4 from the default set plus 1-2 intent-driven.
  const faqs = [
    ...defaultFAQs.slice(0, 4),
    ...(intent.book
      ? [{ id: "faq-cal-1", question: "Can we reschedule?", answer: "Of course — I can offer two other slots that work, or hand you to my human team to find a better time." }]
      : []),
    ...(intent.handoff
      ? [{ id: "faq-cal-2", question: "Can I speak to a person?", answer: "Absolutely — let me connect you to my human teammate now." }]
      : []),
  ].map((f, i) => ({ ...f, id: `faq-c${i}` }));

  return {
    id: slugFor(name),
    name,
    status: "draft",
    agentType: "AI Call",
    agentId: `livekit_${slugFor(name).replace(/-/g, "_")}_outbound`,
    phoneNumber: "+91 80654 81600", // shared demo number
    systemPrompt,
    systemPromptSections: systemPrompt.split(/^# /m).length - 1,
    greetingTemplate,
    voiceId: "v-1",
    voiceName: "Vox (Revspot)",
    llmConfig:      { provider: "Groq",     model: "GPT-OSS 120B", temperature: 0.2 },
    sttConfig:      { provider: "Deepgram", model: "Nova 3",       language: "English (en)" },
    languageConfig: { primary: "English",  additional: ["Hindi"] },
    otherConfig:    { timezone: "Asia/Kolkata (IST)", concurrency: 2, speakingSpeed: 1.0 },
    knowledgeFiles: [],
    faqs,
    qualificationCriteria: defaultQualificationCriteria,
    capabilities: [],
  };
}

// ── Store ──────────────────────────────────────────────────────────────────
//
// Holds agents the user creates via the speedrun flow. Persisted so a page
// reload after creation doesn't lose the agent. The detail page reads from
// this store first, then falls back to the static `agentMvpDetails`.

type AgentMvpStore = {
  agents: Record<string, AgentMvpDetail>;
  upsertAgent: (agent: AgentMvpDetail) => void;
  removeAgent: (id: string) => void;
};

export const useAgentMvpStore = create<AgentMvpStore>()(
  persist(
    (set) => ({
      agents: {},
      upsertAgent: (agent) =>
        set((s) => ({ agents: { ...s.agents, [agent.id]: agent } })),
      removeAgent: (id) =>
        set((s) => {
          const next = { ...s.agents };
          delete next[id];
          return { agents: next };
        }),
    }),
    { name: "revspot:agent-mvp-store" },
  ),
);

/** Look up an agent by id from BOTH the user-created store and the static
 *  demo set. User-created wins on collision (shouldn't happen given the
 *  `new-` prefix on slugs). */
export function lookupAgentMvp(
  id: string,
  staticSet: Record<string, AgentMvpDetail>,
  userSet: Record<string, AgentMvpDetail>,
): AgentMvpDetail | undefined {
  return userSet[id] ?? staticSet[id];
}
