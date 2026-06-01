// Mock data for the /spot landing page.
//
// "Sessions" is the unified surface (replacing past chats + queue).
// Every piece of work Spot is doing — actively executing, waiting on
// human approval, or recently completed — shows up here.

export type PastChat = {
  id: string;
  title: string;
  scope: string;
  when: string;
  preview: string;
};

export const PAST_CHATS: PastChat[] = [
  {
    id: "c1",
    title: "Launch campaign — JEE Crack",
    scope: "Guyju's JEE Crack",
    when: "2h ago",
    preview: "Aligned on persona mix · approved 3 angles · briefing Creative Agent.",
  },
  {
    id: "c2",
    title: "Persona research — School counsellors",
    scope: "Workspace",
    when: "Yesterday",
    preview: "Mapped 1,820 CBSE counsellors into a new referral cohort.",
  },
  {
    id: "c3",
    title: "Diagnose week — NEET Pro CPL spike",
    scope: "Guyju's NEET Pro",
    when: "Tue",
    preview: "CPL up ₹120 across Meta · recommended pausing 2 ad sets in Kerala.",
  },
  {
    id: "c4",
    title: "Lookalike build — top demo attendees 30d",
    scope: "Workspace",
    when: "Mon",
    preview: "Built audience · pushed to Meta + Google.",
  },
];

/**
 * A Session is a coherent stretch of Spot's work — a launch run, an
 * optimize pass, an angle test, a campaign dive. Each session has:
 *
 *   · status = "executing" → Spot is actively working. UI shows the
 *     orbit loader. No CTA — the user just waits or watches.
 *   · status = "needs-approval" → Spot's done and needs a human call
 *     before moving forward. UI shows a "Review" button.
 *   · status = "completed" → Done. UI shows a subtle "View" link.
 *
 * Sessions replace the older PastChats + SPOT_QUEUE split because
 * users were confused which one was "in progress" vs "done".
 */
export type SessionStatus = "executing" | "needs-approval" | "completed";

export type SpotSession = {
  id: string;
  status: SessionStatus;
  /** Imperative title — what the session is about. */
  title: string;
  /** What scope the session is operating on. */
  scope: string;
  /** Workflow kind so we can colour the icon. */
  kind: "launch" | "scale" | "optimize" | "test-angles" | "campaign-dive" | "other";
  /** What Spot is currently doing (executing) / what's waiting (approval) / what got done (completed). */
  detail: string;
  /** Time string · "12 min ago", "2h ago", "Yesterday". */
  when: string;
  /** For executing: % progress 0-100. For others: undefined. */
  progress?: number;
  /** For executing: what Spot is doing right now. */
  currentStep?: string;
  /** For needs-approval: short label for what needs the user's call. */
  approvalAsk?: string;
  /** For executing: optional ETA label. */
  eta?: string;
};

export const SPOT_SESSIONS: SpotSession[] = [
  // Executing — orbit loader, no CTA
  {
    id: "s1",
    status: "executing",
    title: "Building launch · Guyju's Spoken English",
    scope: "Guyju's Spoken English",
    kind: "launch",
    detail:
      "Creative Agent drafting 12 statics + 6 reels. Resize Agent queueing variants.",
    currentStep: "Composing the demo-class landing page…",
    progress: 64,
    eta: "~45 min",
    when: "started 1h ago",
  },
  {
    id: "s2",
    status: "executing",
    title: "Optimize pass · NEET Pro",
    scope: "Guyju's NEET Pro",
    kind: "optimize",
    detail:
      "Root-cause analysis finished. Drafting fix plan for the 3 root causes Spot found.",
    currentStep: "Composing the Day-1 fix list…",
    progress: 38,
    eta: "~12 min",
    when: "started 22 min ago",
  },

  // Needs approval — Review button
  {
    id: "s3",
    status: "needs-approval",
    title: "Scale execution plan ready · JEE Crack",
    scope: "Guyju's JEE Crack",
    kind: "scale",
    detail:
      "3-week scaling execution plan · Stage 1 lift on Engineer Parent + Self-Studier winners. Deploy agent to run it.",
    approvalAsk: "Deploy agent",
    when: "4 min ago",
  },
  {
    id: "s4",
    status: "needs-approval",
    title: "6 new angles ready · Engineer Parent test",
    scope: "Guyju's JEE Crack",
    kind: "test-angles",
    detail:
      "Audit + insight synthesis done. 6 angles drafted, A/B execution plan ready. Approve to launch.",
    approvalAsk: "Review angles",
    when: "1h ago",
  },
  {
    id: "s5",
    status: "needs-approval",
    title: "Stage 2 budget lift on Engineer Parent",
    scope: "Guyju's JEE Crack",
    kind: "scale",
    detail:
      "Stage 1 held · CPL drift only +6.4%. Ready to compound to +50% total lift.",
    approvalAsk: "Approve",
    when: "2h ago",
  },

  // Completed
  {
    id: "s6",
    status: "completed",
    title: "Persona research · School counsellors",
    scope: "Workspace",
    kind: "other",
    detail: "Mapped 1,820 CBSE counsellors into a new referral cohort. Written to memory.",
    when: "Yesterday",
  },
  {
    id: "s7",
    status: "completed",
    title: "Diagnose week · NEET Pro CPL spike",
    scope: "Guyju's NEET Pro",
    kind: "optimize",
    detail: "Paused 2 Kerala ad sets · CPL recovered to ₹468 within 48 hrs.",
    when: "Tue",
  },
  {
    id: "s8",
    status: "completed",
    title: "Lookalike audience · Top demo attendees 30d",
    scope: "Workspace",
    kind: "other",
    detail: "Built and pushed to Meta + Google. Ready to use on any campaign.",
    when: "Mon",
  },
];

/** Deprecated · kept for any legacy import. Use SPOT_SESSIONS. */
export type QueueStatus = "needs-approval" | "running" | "done";
export type QueueItem = {
  id: string;
  status: QueueStatus;
  title: string;
  detail: string;
  when: string;
  agent?: "Creative" | "Media" | "Voice" | "WhatsApp" | "Enrichment";
};
export const SPOT_QUEUE: QueueItem[] = [];
