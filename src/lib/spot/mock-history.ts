// Mock data for the /spot landing page: past chats + Spot's queue.
// In a real build these would come from the conversation store and
// the agent dispatch log respectively.

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

export type QueueStatus = "needs-approval" | "running" | "done";

export type QueueItem = {
  id: string;
  status: QueueStatus;
  title: string;
  detail: string;
  when: string;
  /** Sub-agent that owns this work, surfaces as a tiny tag. */
  agent?: "Creative" | "Media" | "Voice" | "WhatsApp" | "Enrichment";
};

export const SPOT_QUEUE: QueueItem[] = [
  {
    id: "q1",
    status: "needs-approval",
    title: "3 angles ready · The Aspiring Engineer Parent",
    detail: "Mentor-led · Weekly mocks · Parent dashboard. Approve to brief the Creative Agent.",
    when: "4h ago",
    agent: "Creative",
  },
  {
    id: "q2",
    status: "needs-approval",
    title: "Media plan · NEET Pro — first week",
    detail: "₹3.8L across Meta (60%) · Google (28%) · WhatsApp (12%). Review allocation.",
    when: "Yesterday",
    agent: "Media",
  },
  {
    id: "q3",
    status: "running",
    title: "Enriching 318 parent leads",
    detail: "Truecaller · Surepass · parent-occupation match in progress.",
    when: "Now",
    agent: "Enrichment",
  },
  {
    id: "q4",
    status: "done",
    title: "Built audience · Top demo attendees 30d",
    detail: "Pushed to Meta + Google. Ready to use in any campaign.",
    when: "1h ago",
    agent: "Media",
  },
  {
    id: "q5",
    status: "done",
    title: "Generated 12 creative shells · School-Zone parent",
    detail: "Live on Creatives. 4 statics need final copy.",
    when: "3h ago",
    agent: "Creative",
  },
];
