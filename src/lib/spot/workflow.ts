import type { SpotMessage } from "./types";
import {
  ANGLES_STEPS,
  EXTENDED_STEP_LABELS,
  EXTENDED_TOOL_CALLS,
  OPTIMIZE_STEPS,
  SCALE_STEPS,
  extendedIntroMessage,
} from "./extended-flows";

// Spot workflows — types + mock content per step.
//
// Four workflow kinds share this engine:
//   · launch-campaign — full launch flow (product memory → live)
//   · scale           — analyse winners, propose scale plays
//   · optimize        — find losers, root-cause, ship fixes
//   · test-angles     — audit creatives, generate new angles, A/B test
//
// Each flow has its own STEP_ORDER. The right pane renders the active
// step's UI; the chat narrates and carries the approval CTAs.

export type WorkflowStep =
  // Launch flow — new consolidated structure:
  // deep-research → product-setup → kickoff → launch-plan
  //   → launch-building (async) → launch-review → done
  | "deep-research"
  | "product-setup"
  | "kickoff"
  | "launch-plan"
  | "launch-building"
  | "launch-review"
  | "launch-deploy"
  // Legacy launch step types — kept in the union so existing canvas
  // components keep compiling, but removed from STEP_ORDER. The new
  // flow folds all of these into launch-plan + launch-review.
  | "personas"
  | "media-plan"
  | "angles"
  | "resize-qa"
  | "forms"
  | "campaigns"
  | "voice-agent"
  // Diagnostic flows — 4 steps each: analyze → clarify → plan → live
  | "scale-analyze"
  | "scale-clarify"
  | "scale-plan"
  | "scale-live"
  | "opt-analyze"
  | "opt-clarify"
  | "opt-plan"
  | "opt-live"
  | "ang-analyze"
  | "ang-clarify"
  | "ang-plan"
  | "ang-live"
  // Campaign dive · single-step "Spot it" surface that opens
  // chat-on-left + campaign-detail-on-right from the campaigns table
  | "campaign-dive"
  // Shared terminal state
  | "done";

export type WorkflowKind =
  | "launch-campaign"
  | "scale"
  | "optimize"
  | "test-angles"
  | "campaign-dive";

/** Files the right canvas can show — Claude-Code-style file browser
 *  of the product workspace. The chat header owns the picker (so the
 *  toggle stays on the input side, like Claude), and the canvas
 *  renders up to two of them side-by-side. `analysis` is only shown
 *  for diagnostic workflows (scale / optimize / test-angles) where
 *  Spot's findings are persisted as part of memory. */
export type CanvasFile =
  | "memory"
  | "plan"
  | "dashboard"
  | "assets"
  | "analysis";

export const STEP_ORDER: WorkflowStep[] = [
  "deep-research",
  "product-setup",
  "kickoff",
  "launch-plan",
  "launch-building",
  // launch-review and launch-deploy are kept in the union for back-compat
  // but no longer in the flow — building runs all 5 tasks (including
  // launching campaigns) and advances straight to `done`.
  "done",
];

/** Labels used in the step indicator at the top of the workspace pane. */
export const STEP_LABELS: Record<WorkflowStep, string> = {
  // launch (new structure)
  "deep-research": "Deep research",
  "product-setup": "Product memory",
  kickoff: "Memory",
  "launch-plan": "Plan",
  "launch-building": "Spot working",
  "launch-review": "Review & deploy",
  "launch-deploy": "Deploying",
  // legacy step labels — kept for type-completeness only
  personas: "Personas",
  "media-plan": "Plan",
  angles: "Creatives",
  "resize-qa": "Resize & QA",
  forms: "Forms & pages",
  campaigns: "Campaign structure",
  "voice-agent": "Voice agent",
  // diagnostic flows — pulled from EXTENDED_STEP_LABELS so the labels
  // live next to their per-flow mock content.
  "scale-analyze": EXTENDED_STEP_LABELS["scale-analyze"],
  "scale-clarify": EXTENDED_STEP_LABELS["scale-clarify"],
  "scale-plan": EXTENDED_STEP_LABELS["scale-plan"],
  "scale-live": EXTENDED_STEP_LABELS["scale-live"],
  "opt-analyze": EXTENDED_STEP_LABELS["opt-analyze"],
  "opt-clarify": EXTENDED_STEP_LABELS["opt-clarify"],
  "opt-plan": EXTENDED_STEP_LABELS["opt-plan"],
  "opt-live": EXTENDED_STEP_LABELS["opt-live"],
  "ang-analyze": EXTENDED_STEP_LABELS["ang-analyze"],
  "ang-clarify": EXTENDED_STEP_LABELS["ang-clarify"],
  "ang-plan": EXTENDED_STEP_LABELS["ang-plan"],
  "ang-live": EXTENDED_STEP_LABELS["ang-live"],
  "campaign-dive": "Spot it",
  done: "Done",
};

/** Steps that show in the visible step rail (launch flow default). */
export const VISIBLE_STEPS: WorkflowStep[] = [
  "kickoff",
  "launch-plan",
  "launch-building",
];

/** Per-kind step order. nextStep() reads this off the workflow kind. */
export const STEP_ORDER_BY_KIND: Record<WorkflowKind, readonly WorkflowStep[]> = {
  "launch-campaign": STEP_ORDER,
  scale: SCALE_STEPS,
  optimize: OPTIMIZE_STEPS,
  "test-angles": ANGLES_STEPS,
  "campaign-dive": ["campaign-dive"], // single-step
};

/** Per-kind visible step rail. */
export const VISIBLE_STEPS_BY_KIND: Record<WorkflowKind, readonly WorkflowStep[]> = {
  "launch-campaign": VISIBLE_STEPS,
  scale: SCALE_STEPS.filter((s) => s !== "done"),
  optimize: OPTIMIZE_STEPS.filter((s) => s !== "done"),
  "test-angles": ANGLES_STEPS.filter((s) => s !== "done"),
  // Single-step flow — no rail.
  "campaign-dive": [],
};

export type WorkflowBudget = {
  amountInr: number;
  days: number;
};

export type WorkflowApprovals = {
  personaIds: string[];
  angleIds: string[];
  formIds: string[];
};

/** Memory Spot synthesises on the fly during deep research.
 *  Mirrors the relevant subset of ProductSummary so the kickoff canvas
 *  can render the freshly-researched product the same way it renders
 *  existing products from the library. */
export type ResearchedMemory = {
  tagline: string;
  usps: string[];
  avoid: string[];
  sources: string[];
  /** Suggested pricing plans · Spot proposes based on category benchmarks. */
  pricing: { name: string; cost: string; cadence?: string; badge?: string }[];
  /** Promotional offers · Spot proposes based on competitive landscape. */
  offers: { label: string; meta?: string }[];
  /** Structured product brief rows · Spot's read on what the product *is*. */
  brief: { icon: string; label: string; value: string }[];
  /** Personas Spot drafted from category research. First-class part of
   *  product memory — the launch plan opens with persona creation, so
   *  these need to live alongside the brief from day one. */
  personas: { name: string; meta: string; pain: string }[];
};

/** Which question of the chat-driven new-product setup is currently
 *  active. The right canvas displays only what's been captured so far;
 *  the left chat asks each question and accepts the answer. */
export type ProductSetupStage = "name" | "url" | "files" | "ready" | "complete";

export type ProductSetupAnswers = {
  name?: string;
  url?: string;
  /** File names · the demo doesn't actually parse files. */
  files?: string[];
};

export type LaunchWorkflow = {
  kind: "launch-campaign";
  step: WorkflowStep;
  /** The product this launch is for. null while in deep-research / product-setup. */
  productId: string | null;
  productName: string;
  budget: WorkflowBudget | null;
  approvals: WorkflowApprovals;
  /** Stamped when workflow started — used for "started X ago" labels. */
  startedAt: number;
  /** Memory Spot researched live (only set when productId is null). */
  researchedMemory: ResearchedMemory | null;
  /**
   * Whether the kickoff canvas has finished its "Memory Reader" loader.
   * Defaults to false at the start of `startLaunchFlow`; flips to true
   * after the fake API delay so the canvas reveals the content.
   */
  kickoffReady: boolean;
  /** Voice AI agent the user picked at the voice-agent step. */
  attachedVoiceAgentId: string | null;
  /** Chat-driven product setup state. Only meaningful while step is
   *  "product-setup"; ignored after. */
  productSetupStage?: ProductSetupStage;
  productSetupAnswers?: ProductSetupAnswers;
  /** Bottom-drawer open state on the left chat panel. False
   *  immediately after startNewProductFlow (Spot's "preparing form"
   *  tool-call is still running); flips to true after the ~1.4s
   *  delay so the drawer slides up. Drives the entrance animation. */
  productSetupModalOpen?: boolean;
};

/**
 * Diagnostic workflows — Scale, Optimize, Test-Angles. Three steps:
 *
 *   1. clarify  — user answers 2-3 questions, verifies the brief
 *   2. plan     — Spot runs the analysis autonomously, presents one
 *                 time-phased plan, user approves once
 *   3. live     — plan running, recommendations flow to dashboard
 *
 * `clarifyAnswers` is the answers map captured at step 1; `planApproved`
 * gates the transition from plan → live.
 */
export type DiagnosticWorkflow = {
  kind: "scale" | "optimize" | "test-angles";
  step: WorkflowStep;
  productId: string;
  productName: string;
  startedAt: number;
  /** Loader → reveal gate. */
  ready: boolean;
  /** Map of clarify-question id → selected option id. */
  clarifyAnswers: Record<string, string>;
  /** True once the user has approved the plan. */
  planApproved: boolean;
};

/**
 * Campaign-dive workflow — single-step surface that opens chat-on-
 * left + campaign-detail-on-right when the user clicks "Spot it" on
 * a campaign / ad-set / ad row. The right pane is a read-only
 * campaign brief with quick-action buttons (pause, scale, optimize,
 * open on Meta); the left pane is the standard chat for asking Spot
 * about the campaign.
 */
export type CampaignDiveWorkflow = {
  kind: "campaign-dive";
  step: WorkflowStep; // always "campaign-dive"
  productId: string;
  productName: string;
  /** Campaign / ad-set / ad ID this dive is scoped to. */
  entityId: string;
  /** Display name of the entity. */
  entityName: string;
  /** Entity tier — controls which actions are available. */
  entityTier: "campaign" | "adset" | "ad";
  channel: "Meta" | "Google";
  metaUrl: string;
  startedAt: number;
};

/** Any workflow currently active in the Spot store. */
export type SpotWorkflow =
  | LaunchWorkflow
  | DiagnosticWorkflow
  | CampaignDiveWorkflow;

export const EMPTY_APPROVALS: WorkflowApprovals = {
  personaIds: [],
  angleIds: [],
  formIds: [],
};

/**
 * Walk to the next step in the given workflow kind's order. Returns
 * "done" if the current step is the last one (or not found in the
 * kind's sequence — defensive).
 */
export function nextStepFor(
  kind: WorkflowKind,
  step: WorkflowStep,
): WorkflowStep {
  const order = STEP_ORDER_BY_KIND[kind];
  const i = order.indexOf(step);
  if (i < 0 || i >= order.length - 1) return "done";
  return order[i + 1];
}

/** Legacy launch-only helper — kept for the existing launch flow. */
export function nextStep(step: WorkflowStep): WorkflowStep {
  return nextStepFor("launch-campaign", step);
}

/* ─── Mock content per step ───────────────────────────────────── */

export type RecommendedPersona = {
  id: string;
  name: string;
  rationale: string;
  /** Where this persona has worked before. */
  evidence: string;
  selected: boolean;
};

export const SAMPLE_EXISTING_PERSONAS = [
  { id: "pers-aspiring-engineer-parent", name: "The Aspiring Engineer Parent", note: "Strong winner on JEE Crack last quarter" },
  { id: "pers-aspiring-doctor-parent", name: "The Aspiring Doctor Parent", note: "Biology-first hook hits hard on NEET cohort" },
  { id: "pers-self-studier", name: "The Self-Studier", note: "Cheap leads from tier-2/3 cities, lower BOFU" },
];

export const SAMPLE_RECOMMENDED_PERSONAS: RecommendedPersona[] = [
  {
    id: "rec-investor",
    name: "The Plot-Investor",
    rationale: "Tier-2 city HNI with no immediate move plan — buys for appreciation.",
    evidence: "Spot saw 18% lift on similar Bangalore N. corridor product",
    selected: true,
  },
  {
    id: "rec-second-home",
    name: "The Second-Home Buyer",
    rationale: "Mumbai/Pune buyer looking for a Bangalore second home.",
    evidence: "Cross-product fit: Yelahanka + Banerghatta show overlap",
    selected: false,
  },
];

/**
 * The user-facing list of "personas Spot recommends for this launch".
 * Combines existing personas (already in the library) with net-new
 * proposals. From the user's POV they're all just "recommended" — the
 * platform takes care of writing the new ones to the library on
 * approval.
 */
export type LaunchPersona = {
  id: string;
  name: string;
  rationale: string;
  /** Already in the global personas library vs. proposed by Spot for this run. */
  origin: "existing" | "new";
};

/** Insight derived from past memory — colour matches the tone of the lift. */
export type PersonaInsight = {
  icon: "trophy" | "trending" | "layers";
  label: string;
  /** Mild = info pill, strong = ok pill, warn = warn pill. */
  tone: "strong" | "mild" | "warn";
};

export const LAUNCH_PERSONAS: (LaunchPersona & {
  insights: PersonaInsight[];
  hue: number;
  avatarLetters: string;
})[] = [
  {
    id: "pers-aspiring-engineer-parent",
    name: "The Aspiring Engineer Parent",
    rationale: "Mentor-led hook held strongest on Class 11 parent cohort last quarter.",
    origin: "existing",
    hue: 215,
    avatarLetters: "EP",
    insights: [
      { icon: "trophy", label: "Best CPL · ₹312 on JEE Crack", tone: "strong" },
      { icon: "trending", label: "BOFU 2.1× workspace avg", tone: "strong" },
      { icon: "layers", label: "Spans 2 products", tone: "mild" },
    ],
  },
  {
    id: "pers-self-studier",
    name: "The Self-Studier",
    rationale: "Tier-2/3 cities. Doubt-clearing hook works; quality lower but volume high.",
    origin: "existing",
    hue: 40,
    avatarLetters: "SS",
    insights: [
      { icon: "trending", label: "Lowest CPL · ₹186", tone: "strong" },
      { icon: "trending", label: "BOFU 0.6× avg", tone: "warn" },
      { icon: "layers", label: "Spans 2 products", tone: "mild" },
    ],
  },
  {
    id: "pers-coaching-hopper",
    name: "The Coaching Hopper",
    rationale: "Class 11/12 students switching from offline coaching — high intent, premium AOV.",
    origin: "existing",
    hue: 290,
    avatarLetters: "CH",
    insights: [
      { icon: "trophy", label: "Highest AOV · ₹68K", tone: "strong" },
      { icon: "trending", label: "+22% CTR on Reels", tone: "strong" },
      { icon: "layers", label: "Retargeting layer", tone: "mild" },
    ],
  },
  {
    id: "rec-school-counsellor",
    name: "The School Counsellor Referral",
    rationale: "CBSE counsellors who push 8–9 kids to the program a year.",
    origin: "new",
    hue: 145,
    avatarLetters: "SC",
    insights: [
      { icon: "trending", label: "+22% lift on NEET Pro last qtr", tone: "strong" },
      { icon: "layers", label: "First test on JEE Crack", tone: "mild" },
    ],
  },
];

// Each channel has its own campaign structure. Meta uses a 3-bucket
// model (experiment / scaling / cost-cap) that mirrors how Spot
// actually reasons about media — test what's new, scale what wins,
// cost-cap what's mature. Google splits Search and Discover into their
// own channels. Outreach handles Voice + WhatsApp.
export type AdTypeAvailability = "available" | "needs-connection";

export type CampaignBucket =
  // Meta
  | "experiment"
  | "scaling"
  | "cost-cap"
  // Google Search
  | "search-brand"
  | "search-category"
  | "search-competitor"
  // Google Discover
  | "discover-cold"
  | "discover-retarget"
  | "discover-lookalike"
  // Outreach
  | "voice"
  | "whatsapp";

export type CampaignInPlan = {
  id: string;
  kind: CampaignBucket;
  /** Display name on the card. */
  name: string;
  /** Why we're running it — Spot's reasoning. */
  purpose: string;
  /** Personas + angles included. */
  targets: string[];
  /** Share of channel budget. */
  budgetShare: number;
  availability: AdTypeAvailability;
  connectionKey?: "whatsapp";
};

export type Channel = {
  id: "meta" | "google-search" | "google-discover" | "outreach";
  name: string;
  share: number; // share of total plan budget
  /** Channel-level reasoning. */
  rationale: string;
  campaigns: CampaignInPlan[];
};

/** Generate the launch plan. Reasoning is informed by which personas
 *  are new vs. existing — experiment campaigns target new + under-
 *  performing personas, scaling campaigns lift the winners, cost-cap
 *  controls the mature spend. */
export function generatePlan(
  _budget: number,
  whatsAppConnected: boolean = false,
): Channel[] {
  return [
    {
      id: "meta",
      name: "Meta Ads",
      share: 0.55,
      rationale: "Three-bucket model · experiment new personas, scale winners, cost-cap the mature ones.",
      campaigns: [
        {
          id: "meta-experiment",
          kind: "experiment",
          name: "Experiment · new personas + angles",
          purpose:
            "Test The School Counsellor Referral (new) and 2 fresh angles on the underperforming Coaching Hopper cohort. Small budget — we're buying data, not leads.",
          targets: ["School Counsellor (new)", "Coaching Hopper · 2 new angles"],
          budgetShare: 0.15,
          availability: "available",
        },
        {
          id: "meta-scaling",
          kind: "scaling",
          name: "Scaling · proven personas × winning angles",
          purpose:
            "Lift budget on Engineer Parent × mentor-led hook (best CPL last qtr) and Self-Studier × doubt-clearing reel. Highest BOFU history.",
          targets: ["Engineer Parent", "Self-Studier"],
          budgetShare: 0.55,
          availability: "available",
        },
        {
          id: "meta-cost-cap",
          kind: "cost-cap",
          name: "Cost cap · mature spend",
          purpose:
            "Cost-capped at ₹420 CPL on Engineer Parent's evergreen lead-form variant. Hold floor while scaling explores ceiling.",
          targets: ["Engineer Parent · evergreen"],
          budgetShare: 0.3,
          availability: "available",
        },
      ],
    },
    {
      id: "google-search",
      name: "Google Search",
      share: 0.18,
      rationale: "High-intent capture — brand defense, category queries, competitor bidding.",
      campaigns: [
        {
          id: "gs-brand",
          kind: "search-brand",
          name: "Brand defense",
          purpose:
            "Defend 'Guyju's JEE Crack' + branded variants. Cheap, near-100% intent.",
          targets: ["Brand keywords", "Branded misspellings"],
          budgetShare: 0.3,
          availability: "available",
        },
        {
          id: "gs-category",
          kind: "search-category",
          name: "Category queries",
          purpose:
            "Capture 'JEE online coaching', 'IIT prep at home', 'best JEE classes for Class 11' searches.",
          targets: ["Category keywords · ~340 phrases"],
          budgetShare: 0.5,
          availability: "available",
        },
        {
          id: "gs-competitor",
          kind: "search-competitor",
          name: "Competitor bidding",
          purpose:
            "Bid on competitor brand queries (Allen, Aakash, FIITJEE online). Higher CPL but high-intent switchers.",
          targets: ["Competitor brand queries"],
          budgetShare: 0.2,
          availability: "available",
        },
      ],
    },
    {
      id: "google-discover",
      name: "Google Discover",
      share: 0.12,
      rationale: "Native feed surfaces — feed top-of-funnel, retarget visitors, lookalike on winners.",
      campaigns: [
        {
          id: "gd-cold",
          kind: "discover-cold",
          name: "Cold Discover · top-of-funnel",
          purpose:
            "Broad Engineer-Parent + Self-Studier audience on YouTube + Discover homepage. Brand + category awareness.",
          targets: ["Engineer Parent", "Self-Studier"],
          budgetShare: 0.45,
          availability: "available",
        },
        {
          id: "gd-retarget",
          kind: "discover-retarget",
          name: "Retargeting · visitors + form abandoners",
          purpose:
            "Re-engage site visitors and demo-class form abandoners. Tight 30-day window, premium creative.",
          targets: ["Site visitors 30d", "Form abandoners"],
          budgetShare: 0.35,
          availability: "available",
        },
        {
          id: "gd-lookalike",
          kind: "discover-lookalike",
          name: "Lookalike · top demo attendees",
          purpose:
            "1% lookalike on Class 11 parents who attended a demo class in the last 30 days. Quality > volume.",
          targets: ["Lookalike · top demo attendees 30d"],
          budgetShare: 0.2,
          availability: "available",
        },
      ],
    },
    {
      id: "outreach",
      name: "Outreach",
      share: 0.15,
      rationale: "Warm-lead outbound on Voice + WhatsApp · attaches a Voice AI agent at the deploy step.",
      campaigns: [
        {
          id: "or-voice",
          kind: "voice",
          name: "Voice AI · parents",
          purpose:
            "Outbound calls on enriched parent contacts from Revspot's audience graph. Voice agent picks up the demo-class booking flow.",
          targets: ["Engineer Parent", "Doctor Parent"],
          budgetShare: 0.55,
          availability: "available",
        },
        {
          id: "or-whatsapp",
          kind: "whatsapp",
          name: "WhatsApp · student follow-up",
          purpose: whatsAppConnected
            ? "Multi-turn qualification + demo-class booking via WhatsApp Agent on Click-to-WA leads."
            : "Multi-turn qualification — needs a WhatsApp Business account connected before it can run.",
          targets: ["Engineer Parent", "Self-Studier"],
          budgetShare: 0.45,
          availability: whatsAppConnected ? "available" : "needs-connection",
          connectionKey: "whatsapp",
        },
      ],
    },
  ];
}

export type AnglePack = {
  personaId: string;
  personaName: string;
  angles: {
    id: string;
    hook: string;
    cta: string;
    format: "Static" | "Reel" | "Carousel";
  }[];
};

export const SAMPLE_ANGLES: AnglePack[] = [
  {
    personaId: "pers-aspiring-engineer-parent",
    personaName: "The Aspiring Engineer Parent",
    angles: [
      { id: "ang-aep-1", hook: "Watch your kid solve a JEE problem this week", cta: "Book demo class", format: "Reel" },
      { id: "ang-aep-2", hook: "IIT-alum mentors · class size capped at 60", cta: "See sample class", format: "Static" },
      { id: "ang-aep-3", hook: "Parent dashboard — see weekly mock rankings", cta: "Try it free for a week", format: "Carousel" },
    ],
  },
  {
    personaId: "pers-self-studier",
    personaName: "The Self-Studier",
    angles: [
      { id: "ang-ss-1", hook: "Doubt-clearing in 15 minutes · live", cta: "Join the next class", format: "Reel" },
      { id: "ang-ss-2", hook: "Recordings stay live for 24 months", cta: "See library tour", format: "Static" },
      { id: "ang-ss-3", hook: "Rank against 1.2L+ JEE aspirants", cta: "Take a free mock", format: "Static" },
    ],
  },
  {
    personaId: "pers-coaching-hopper",
    personaName: "The Coaching Hopper",
    angles: [
      { id: "ang-ch-1", hook: "Switching from offline coaching mid-year? Here's how", cta: "Book a 1:1 call", format: "Static" },
      { id: "ang-ch-2", hook: "Mentor 1:1 every fortnight — actually heard", cta: "Meet the mentors", format: "Carousel" },
    ],
  },
];

/** One headline/description combination inside a Search Ad group.
 *  Google rotates these — more variants generally lift Ad Strength. */
export type SearchAdVariant = {
  headline: string;
  description: string;
};

/** A Google Search ad group — primary copy + multiple variants the
 *  AI generated. Strength reflects Google's diagnostic. */
export type SearchAdGroup = {
  id: string;
  campaign: "Brand" | "Category" | "Competitor";
  primaryHeadline: string;
  primaryDescription: string;
  variants: SearchAdVariant[];
  keywords: string;
  adStrength: "excellent" | "good" | "average";
};

export const SAMPLE_SEARCH_ADS: SearchAdGroup[] = [
  {
    id: "sa-brand",
    campaign: "Brand",
    primaryHeadline: "Guyju's JEE Crack · Class 11 + 12",
    primaryDescription:
      "Live cohort with IIT-alum mentors. Weekly mocks. 24-mo recordings. Book a free demo class.",
    variants: [
      {
        headline: "Guyju's JEE Crack · live online cohort",
        description: "Class 11/12 prep with IIT-alum mentors and weekly all-India mocks.",
      },
      {
        headline: "Guyju's JEE program · Class 11 + 12",
        description: "Live doubts answered in-class · 24-month replay · 60-student cap.",
      },
      {
        headline: "Guyju's official JEE coaching",
        description: "Two-year JEE Mains + Advanced program. Free demo class today.",
      },
      {
        headline: "Join Guyju's JEE cohort online",
        description: "Mentor-led classes capped at 60. Try a free class before you decide.",
      },
    ],
    keywords: "guyju's jee, guyjus jee crack, guyjus iit coaching, guyju jee classes",
    adStrength: "excellent",
  },
  {
    id: "sa-category",
    campaign: "Category",
    primaryHeadline: "JEE online coaching · live mentors",
    primaryDescription:
      "Class 11/12 prep with live doubts, weekly all-India mocks, and 24-month recordings. Free demo.",
    variants: [
      {
        headline: "JEE online coaching · live cohort",
        description: "Mentor-led classes capped at 60 · weekly mocks. Take a free demo today.",
      },
      {
        headline: "Best JEE classes for Class 11",
        description: "Live doubt-clearing + weekly mocks ranked all-India. 24-mo replay access.",
      },
      {
        headline: "IIT prep online · live + mentor-led",
        description: "Cohort capped at 60 students. IIT-alum mentors. Try a free class first.",
      },
      {
        headline: "Online JEE Mains + Advanced",
        description: "Two-year prep with personal study planner and weekly mocks. Demo class free.",
      },
      {
        headline: "Free JEE mock · ranked all-India",
        description: "See where your child stands against 1.2L+ JEE aspirants. Instant report.",
      },
    ],
    keywords: "jee online coaching, iit prep online, jee classes class 11, best jee coaching online",
    adStrength: "excellent",
  },
  {
    id: "sa-competitor",
    campaign: "Competitor",
    primaryHeadline: "Switching coaching? Try Guyju's JEE",
    primaryDescription:
      "Mentor-led classes capped at 60. Bring your old syllabus — we cover the gap. Free demo class today.",
    variants: [
      {
        headline: "Looking for an Allen alternative?",
        description: "Live cohort capped at 60. We honour your existing syllabus. Free demo.",
      },
      {
        headline: "Switching from FIITJEE? Guyju's helps",
        description: "Cover the gap mid-year · live doubt-clearing · mentor 1:1 monthly.",
      },
      {
        headline: "Aakash alternative · online + mentor-led",
        description: "No 200-student auditorium. Cohort of 60. Try one class before you switch.",
      },
    ],
    keywords:
      "allen alternative, fiitjee alternative, aakash online review, switch jee coaching",
    adStrength: "good",
  },
];

/** A resized variant of an approved angle. QA Agent reviews each. */
export type ResizedVariant = {
  id: string;
  format: "1:1" | "4:5" | "9:16" | "16:9";
  channel: "Meta" | "Google";
  status: "approved" | "needs-fix";
  /** When needs-fix, QA Agent's note. */
  note?: string;
};

export type ResizeReview = {
  personaId: string;
  personaName: string;
  angles: {
    id: string;
    hook: string;
    hue: number;
    variants: ResizedVariant[];
  }[];
};

/** Build review data from existing SAMPLE_ANGLES — every angle gets 4
 *  resized variants (1:1, 4:5, 9:16, 16:9). Most pass; one per persona
 *  is flagged with a realistic QA Agent comment. */
export function buildResizeReviews(): ResizeReview[] {
  // Stable seed: which (personaIndex, angleIndex, format) is flagged.
  const flags: Record<string, string> = {
    "0-0-9:16": "Headline overflows on the 9:16 crop — Resize will tighten kerning.",
    "1-1-16:9": "Mentor photo cuts off at 16:9 ratio — Resize will reposition.",
  };
  return SAMPLE_ANGLES.map((pack, pi) => ({
    personaId: pack.personaId,
    personaName: pack.personaName,
    angles: pack.angles.map((a, ai) => {
      const hue = (ai * 90 + pi * 30) % 360;
      const variants: ResizedVariant[] = (
        [
          ["1:1", "Meta"],
          ["4:5", "Meta"],
          ["9:16", "Meta"],
          ["16:9", "Google"],
        ] as const
      ).map(([fmt, ch]) => {
        const key = `${pi}-${ai}-${fmt}`;
        const note = flags[key];
        return {
          id: `${a.id}-${fmt}`,
          format: fmt as ResizedVariant["format"],
          channel: ch as ResizedVariant["channel"],
          status: note ? ("needs-fix" as const) : ("approved" as const),
          note,
        };
      });
      return { id: a.id, hook: a.hook, hue, variants };
    }),
  }));
}

export type FormAsset = {
  id: string;
  name: string;
  kind: "lead-form" | "landing-page";
  status: "drafted" | "ready" | "needs-review";
  personaId: string;
  personaName: string;
};

export const SAMPLE_FORMS: FormAsset[] = [
  { id: "form-aep-1", name: "Engineer Parent · demo class form", kind: "lead-form", status: "ready", personaId: "pers-aspiring-engineer-parent", personaName: "Engineer Parent" },
  { id: "form-aep-2", name: "Engineer Parent · curriculum landing", kind: "landing-page", status: "drafted", personaId: "pers-aspiring-engineer-parent", personaName: "Engineer Parent" },
  { id: "form-ss-1", name: "Self-Studier · free-mock opt-in", kind: "lead-form", status: "ready", personaId: "pers-self-studier", personaName: "Self-Studier" },
  { id: "form-ss-2", name: "Self-Studier · library tour landing", kind: "landing-page", status: "needs-review", personaId: "pers-self-studier", personaName: "Self-Studier" },
  { id: "form-ch-1", name: "Coaching Hopper · 1:1 call landing", kind: "landing-page", status: "ready", personaId: "pers-coaching-hopper", personaName: "Coaching Hopper" },
];

export type CampaignStructure = {
  id: string;
  name: string;
  channel: "Meta" | "Google";
  budgetInr: number;
  adsets: {
    id: string;
    name: string;
    personaName: string;
    adsCount: number;
  }[];
};

/** Library of Voice AI agents the workspace has access to. Each has
 *  a different channel mix and follow-up workflow — the right one
 *  depends on how warm the cohort is and how aggressive the nurture. */
export type VoiceAgentOption = {
  id: string;
  /** Friendly name. */
  name: string;
  /** Channels the agent uses. */
  channels: ("Voice" | "WhatsApp" | "SMS")[];
  /** One-line workflow narrative. */
  workflow: string;
  /** Phone number assigned. */
  number: string;
  /** Past performance. */
  qualRate: number; // % of calls that produce a qualified lead
  connectRate: number; // % of dialled numbers that connect
  /** Best-fit tag — when Spot would pick this one. */
  bestFor: string;
};

export const VOICE_AGENTS: VoiceAgentOption[] = [
  {
    id: "agent-scout",
    name: "Scout",
    channels: ["Voice"],
    workflow: "Voice-only · 2 call attempts, no follow-up. Best when speed beats nurture.",
    number: "+91 80-1234-5678",
    qualRate: 14,
    connectRate: 71,
    bestFor: "High-volume cohorts where leads decay fast",
  },
  {
    id: "agent-sherpa",
    name: "Sherpa",
    channels: ["Voice", "WhatsApp"],
    workflow: "Voice first · auto-follow-up on WhatsApp if the call drops. One nudge, 24h later.",
    number: "+91 80-4567-8901",
    qualRate: 22,
    connectRate: 76,
    bestFor: "Balanced cohorts · proven workhorse for Engineer Parent",
  },
  {
    id: "agent-anchor",
    name: "Anchor",
    channels: ["Voice", "WhatsApp"],
    workflow:
      "Voice + 3-touch WhatsApp nurture sequence over 7 days. Handles demo-class booking end-to-end.",
    number: "+91 80-7890-1234",
    qualRate: 31,
    connectRate: 81,
    bestFor: "Premium products with longer consideration · NRI parents, NEET cohort",
  },
  {
    id: "agent-compass",
    name: "Compass",
    channels: ["WhatsApp"],
    workflow: "WhatsApp-only · multi-turn qualification. Cheaper, lower intent.",
    number: "+91 80-2345-6789",
    qualRate: 9,
    connectRate: 92,
    bestFor: "Tier-2/3 Self-Studier cohorts where calls don't convert",
  },
];

export const SAMPLE_STRUCTURE: CampaignStructure[] = [
  {
    id: "draft-c1",
    name: "JEE Crack · Cold · Meta",
    channel: "Meta",
    budgetInr: 250000,
    adsets: [
      { id: "ds-1", name: "Engineer Parent · 36-48 · tier-1 metros", personaName: "Engineer Parent", adsCount: 3 },
      { id: "ds-2", name: "Self-Studier · 16-19 · tier-2/3 India", personaName: "Self-Studier", adsCount: 3 },
      { id: "ds-3", name: "Coaching Hopper · 16-18 · Kota + Hyderabad", personaName: "Coaching Hopper", adsCount: 2 },
    ],
  },
  {
    id: "draft-c2",
    name: "JEE Crack · Search · Google",
    channel: "Google",
    budgetInr: 120000,
    adsets: [
      { id: "ds-4", name: "Brand + 'JEE online coaching' queries", personaName: "Mixed", adsCount: 4 },
      { id: "ds-5", name: "Competitor brand · Allen/Aakash queries", personaName: "Mixed", adsCount: 4 },
    ],
  },
  {
    id: "draft-c3",
    name: "JEE Crack · Lookalike · Meta",
    channel: "Meta",
    budgetInr: 80000,
    adsets: [
      { id: "ds-6", name: "1% Lookalike — top demo-class attendees 30d", personaName: "Engineer Parent", adsCount: 2 },
    ],
  },
];

/* ─── Tool-call narration ──────────────────────────────────────
 *
 * Each step transition fires a fake "agent dispatch" — Spot says
 * "Calling Persona Researcher…" with a spinner before the next
 * step's content lands. Makes the platform feel like there's a team
 * of agents being spawned, which is the actual product mental model.
 */

export type StepToolCall = {
  agent: string;
  detail: string;
  /** ms to keep the spinner running before the next step's intro lands. */
  delayMs: number;
};

export const STEP_TOOL_CALL: Partial<Record<WorkflowStep, StepToolCall>> = {
  // Extended flows — folded in from extended-flows.ts so the engine has
  // a single tool-call map regardless of which workflow kind is active.
  ...(EXTENDED_TOOL_CALLS as unknown as Partial<Record<WorkflowStep, StepToolCall>>),
  // New launch-plan step — builds the consolidated plan (parallel agents).
  "launch-plan": {
    agent: "spot.plan",
    detail:
      "personas.draft · memory.read · media.plan · creative.brief · rollout.sequence · budget.lock — running in parallel…",
    delayMs: 11800,
  },
  // Building step — Spot runs 5 tasks end-to-end: build creatives +
  // forms + landing pages → lock campaign plan → verify CRM →
  // build Pre-Sales Agent → launch campaigns. ~28s total, matching
  // the task durations rendered in LaunchBuildingTaskLoader.
  "launch-building": {
    agent: "build.execute",
    detail:
      "Task 1/5 · creatives + forms + landing pages → 2/5 · campaign plan → 3/5 · CRM integrations → 4/5 · Pre-Sales Agent → 5/5 · launch campaigns.",
    delayMs: 28000,
  },
  // Review step lands quickly — Spot just compiles assets for review.
  "launch-review": {
    agent: "build.complete",
    detail: "compiling preview · creatives, landing pages, lead forms, campaign tree…",
    delayMs: 2200,
  },
  // Deploy step · pushes everything live to Meta + Google + WhatsApp.
  "launch-deploy": {
    agent: "deploy.execute",
    detail:
      "ads.publish · pages.deploy · forms.publish · pixels.activate · tracking.verify…",
    delayMs: 14000,
  },
  // Legacy steps below kept so any old in-flight workflow still narrates.
  personas: {
    agent: "personas.lookup",
    detail: "scanning library + cross-product audience graph…",
    delayMs: 3800,
  },
  "media-plan": {
    agent: "media.plan",
    detail: "splitting baseline budget across channels by persona payoff…",
    delayMs: 4200,
  },
  angles: {
    agent: "creative.brief",
    detail: "drafting 3 angles per persona + queueing the asset generator…",
    delayMs: 4500,
  },
  "resize-qa": {
    agent: "qa.review",
    detail: "resizing 36 variants across formats + reviewing for layout drift…",
    delayMs: 4200,
  },
  forms: {
    agent: "forms.draft",
    detail: "generating per-persona lead forms + landing-page mocks…",
    delayMs: 3800,
  },
  campaigns: {
    agent: "campaigns.compile",
    detail: "compiling campaign → ad-set → ad tree on Meta and Google…",
    delayMs: 4200,
  },
  "voice-agent": {
    agent: "agents.list",
    detail: "loading Voice AI agent library + matching against your cohorts…",
    delayMs: 3200,
  },
  done: {
    agent: "deploy.push",
    detail: "pushing to Meta and Google ad accounts…",
    delayMs: 4800,
  },
};

/* ─── Step intro chat messages ──────────────────────────────────
 *
 * Each step entry appends a Spot message into the chat. The message
 * narrates what's happening on the right pane *and* carries the
 * inline step-cta button — actions live in the chat, not the canvas.
 */

export function stepIntroMessage(
  step: WorkflowStep,
  w: SpotWorkflow,
): SpotMessage | null {
  // Campaign-dive has no scripted intro — chat is seeded directly in
  // startCampaignDive · skip the intro lookup.
  if (w.kind === "campaign-dive") return null;
  // Extended-flow steps (scale / optimize / test-angles) have their own
  // intro copy — dispatch to extended-flows for anything not in the
  // launch flow's switch below.
  if (w.kind !== "launch-campaign") {
    return extendedIntroMessage(step, w.productName, w.kind);
  }
  switch (step) {
    case "launch-plan":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text:
              "Here's the plan — personas, media, creatives, landing pages, lead forms, campaign tree, and outreach. Five concrete tasks ready to run end-to-end: build creatives + forms + landing pages, lock the campaign plan, verify CRM integrations, spin up the Pre-Sales Agent, and launch campaigns. Approve once and I'll handle the rest.",
          },
          {
            type: "step-cta",
            label: "Put Spot to work",
            helper:
              "5 tasks · ~25 seconds end-to-end · I'll surface a summary once everything's live.",
            refineHint: "or tell me what to change before I start",
          },
        ],
      };
    case "launch-building":
      return {
        role: "spot",
        parts: [
          {
            type: "headline",
            text: `On it — running 5 tasks for ${w.productName}.`,
            verdict: "info",
          },
          {
            type: "text",
            text:
              "Building creatives + forms + landing pages → locking the campaign plan → verifying CRM integrations → spinning up the Pre-Sales Agent (Voice + WhatsApp) → launching campaigns. You can watch on the right or step away — I'll ping you when everything is live.",
          },
        ],
      };
    case "launch-review":
      return {
        role: "spot",
        parts: [
          {
            type: "headline",
            text: `${w.productName} · ready to review.`,
            verdict: "ok",
          },
          {
            type: "text",
            text:
              "All assets built. Right pane has the full preview — creatives, landing pages, lead forms, campaign tree, voice agent. Approve to deploy live to Meta + Google.",
          },
          {
            type: "step-cta",
            label: "Approve all · deploy live",
            helper: "I'll push to Meta + Google immediately and start the watchers.",
            refineHint: "or tell me which assets need a tweak",
          },
        ],
      };
    case "launch-deploy":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text:
              "Deploying to Meta + Google + WhatsApp now. ~14s end-to-end. Feel free to step away — I'll surface the final summary the moment it's live.",
          },
        ],
      };
    case "personas":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "Here's the mix I'd run. Three from your library that already win on this product, plus one net-new worth testing. Tick the ones you want me to use.",
          },
          {
            type: "step-cta",
            label: "Approve & continue",
            helper: "I'll save the new persona to your library and start the media plan.",
            refineHint: "or describe a different cohort",
          },
        ],
      };
    case "media-plan":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "Plan's on the right — three-bucket Meta model (experiment / scaling / cost-cap), Google Search + Discover split, and an Outreach lane for Voice + WhatsApp. Reasoning mirrors what we did with personas — experiment on the new ones, scale the winners, cost-cap the mature spend.",
          },
          {
            type: "step-cta",
            label: "Approve plan, start creatives",
            helper: "Creative Agent briefs itself once you approve.",
            refineHint: "or type a weekly budget · e.g. \"₹4L/week\"",
          },
        ],
      };
    case "angles":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "Creatives are spinning up — visual angles per persona for Meta, and a separate set of search-ad copies for Google.",
          },
          {
            type: "step-cta",
            label: "Approve creatives, resize next",
            helper: "Resize Agent will handle ad-size variants in the next step.",
          },
        ],
      };
    case "resize-qa":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "Resize Agent produced **36 variants** (4 sizes per angle). QA Agent reviewed them — **34 clean, 2 flagged**. Right pane shows the flags. Tell me to fix or proceed.",
          },
          {
            type: "step-cta",
            label: "Looks good — build forms",
            helper: "I'll regenerate the flagged variants in the background and move on.",
            refineHint: "or type 'fix headline overflow on Tech-Lead 9:16' for targeted edits",
          },
        ],
      };
    case "forms":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "Lead forms + landing pages + click-to-WhatsApp scripts ready. Hover any tile to preview.",
          },
          {
            type: "step-cta",
            label: "Approve & finalize structure",
            helper: "Last step — the campaign → ad set → ad tree.",
          },
        ],
      };
    case "campaigns":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "3 campaigns mapped to your approved personas. After you confirm I'll ask which Voice AI agent should handle outbound, then deploy.",
          },
          {
            type: "step-cta",
            label: "Approve structure, pick voice agent",
            helper: "Next: attach a Voice AI agent or skip outbound.",
          },
        ],
      };
    case "voice-agent":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: "Pick a Voice AI agent for outreach. Each handles voice + WhatsApp follow-up differently. I've put **Sherpa** on top — it's the proven fit for Engineer Parent. Skip if you'd rather run paid-only.",
          },
          {
            type: "step-cta",
            label: "Approve & deploy",
            helper: "I'll deploy campaigns + attach the agent (or skip) to all outbound flows.",
            refineHint: "or pick a different agent from the canvas",
          },
        ],
      };
    case "done":
      return {
        role: "spot",
        parts: [
          { type: "headline", text: `${w.productName} is live.`, verdict: "ok" },
          {
            type: "text",
            text: "Track it on **Campaigns**. I'll watch for drift and surface fixes here.",
          },
        ],
      };
    default:
      return null;
  }
}
