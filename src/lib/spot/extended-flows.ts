// Diagnostic Spot workflows — Scale · Optimize · Test New Angles.
//
// The mental model is "Claude does the heavy lifting, the human approves
// once". So each workflow has only THREE steps, not four-or-more:
//
//   1. clarify  — Spot asks 2-3 quick questions to lock the brief,
//                 user verifies. On the right pane, a Brief card fills
//                 in as questions get answered.
//   2. plan     — Spot autonomously runs the analysis (memory.read +
//                 personas.fetch + creative.audit + competitor.scan +
//                 plan.build, all in parallel) and presents ONE plan
//                 with a time-phased structure (Week 1 / Week 2 / Week
//                 3, what Spot will do, what it'll observe, the
//                 decision points and guardrails). User approves once.
//   3. live     — Plan is running. Canvas shows the active phase, the
//                 timeline, and recommendations Spot has surfaced for
//                 human approval (those also feed the dashboard).
//
// This file holds:
//   · Clarifying questions per workflow kind
//   · Time-phased plan templates per workflow kind
//   · Pending recommendations Spot surfaces during live execution
//   · Step ordering + labels + tool-call narration + intro messages
//
// All copy is Guyju's-themed (EdTech) so the demo holds together.

import type { SpotMessage } from "./types";

/* ────────────────────────────────────────────────────────────────
 * SHARED TYPES
 * ──────────────────────────────────────────────────────────────── */

export type ClarifyOption = {
  /** Stable id used in answers map. */
  value: string;
  /** Display label on the chip. */
  label: string;
  /** Optional one-liner for context (shown on hover or under chip). */
  hint?: string;
};

export type ClarifyQuestion = {
  /** Stable id used as the key in the answers map. */
  id: string;
  /** The question Spot is asking. */
  question: string;
  /** Tight one-liner under the question explaining the why. */
  why?: string;
  /** Quick-pick options. */
  options: ClarifyOption[];
  /** Pre-selected option id. */
  defaultValue: string;
  /** Allow a free-text override after a chip is selected. */
  allowFreeText?: boolean;
};

export type PlanInsight = {
  /** Short headline — what Spot found. */
  title: string;
  /** Evidence behind the insight. */
  detail: string;
  /** Tone drives the colour. */
  tone: "good" | "warn" | "neutral";
};

export type PlanPhase = {
  id: string;
  /** "Week 1" / "Weeks 1-2" etc. */
  week: string;
  /** Date label — Spot computes from "today". */
  dates: string;
  /** Phase title. */
  title: string;
  /** Bullet list of what Spot will actually do this phase. */
  actions: string[];
  /** What Spot watches during this phase to inform the next decision. */
  observes: string[];
  /** When Spot will make a call. Null on the final phase. */
  decisionAt?: string;
  /** Decision tree branches — "if X, do Y". */
  decisionRule?: string;
};

export type WorkflowPlan = {
  /** One-line statement of the goal Spot is chasing. */
  goal: string;
  /** 3-4 insights from the analysis Spot just ran. */
  insights: PlanInsight[];
  /** 3 phases over 2-3 weeks. */
  phases: PlanPhase[];
  /** Automatic safety rules Spot enforces without asking. */
  guardrails: string[];
  /** When + how Spot will report progress back to the user. */
  reportingCadence: string;
};

export type PendingRecommendation = {
  id: string;
  /** Which workflow this came from. */
  sourceKind: "scale" | "optimize" | "test-angles" | "launch-campaign";
  sourceProduct: string;
  /** When Spot surfaced it — humanised. */
  surfacedAt: string;
  /** Imperative ("Pause X", "Lift budget on Y"). */
  title: string;
  /** One-liner detail. */
  detail: string;
  /** Evidence Spot is using to justify the rec. */
  evidence: string[];
  /** Projected impact if approved. */
  projectedImpact: string;
  /** Urgency — drives the dashboard sort + colour. */
  urgency: "high" | "medium" | "low";
};

/* ────────────────────────────────────────────────────────────────
 * ANALYSIS — what Spot already knows
 *
 * The first step for every diagnostic flow. Spot scans the product's
 * recent performance + chats and surfaces what it's found *before*
 * asking the user anything. The clarifying questions in the next step
 * adapt to these findings — e.g. "Stop the decay" only appears as an
 * option if decay was detected.
 *
 * In a real product these findings would be computed live; here they
 * encode the realistic state of Guyju's mock data.
 * ──────────────────────────────────────────────────────────────── */

export type AnalysisCampaignSignal = {
  /** Campaign name. */
  name: string;
  /** One-line summary of the signal. */
  signal: string;
  /** Tag rendered as a pill. */
  tag: "winner" | "decay" | "chronic" | "neutral";
  /** Compact metric chips. */
  metrics: { label: string; value: string; delta?: string; deltaTone?: "good" | "bad" }[];
};

export type AnalysisFindings = {
  /** Top-line tl;dr from Spot. */
  summary: string;
  /** Per-campaign signals. */
  signals: AnalysisCampaignSignal[];
  /** Whether recent decay was detected anywhere. */
  hasDecay: boolean;
  /** Whether chronic underperformers were detected. */
  hasChronic: boolean;
  /** Whether clear winners were detected. */
  hasWinners: boolean;
  /** What Spot thinks is the biggest single problem (drives default goal). */
  biggestProblem?: string;
  /** Whether there's headroom to scale. */
  hasHeadroom: boolean;
  /** Memory entries Spot read while analysing — cited for traceability. */
  memoryRefs: string[];
};

/**
 * Analysis findings per workflow kind. The Scale flow's analysis
 * leads with winners + headroom; Optimize leads with decay + chronic;
 * Test-Angles leads with the angle audit verdicts.
 */
export const SCALE_ANALYSIS: AnalysisFindings = {
  summary:
    "Two ad sets are winning with significant headroom left, and Brand Search is severely underspent at 100% intent. There's clear room to push without breaking what's working.",
  signals: [
    {
      name: "JEE Crack · LAL · Class 11 parents",
      signal: "Best CPL on the workspace · 28% audience saturation · room to 2× spend.",
      tag: "winner",
      metrics: [
        { label: "Spend", value: "₹1.84L" },
        { label: "CPL", value: "₹336", delta: "↓ 22%", deltaTone: "good" },
        { label: "Qual rate", value: "14.4%", delta: "↑ 7pts", deltaTone: "good" },
      ],
    },
    {
      name: "JEE Crack · TOFU · Mentor-led hook",
      signal: "Strongest qualified-lead pull · 52% saturation · LAL seed reaching threshold.",
      tag: "winner",
      metrics: [
        { label: "Spend", value: "₹2.18L" },
        { label: "CPL", value: "₹356", delta: "↓ 5%", deltaTone: "good" },
        { label: "Qual %", value: "13.7%", delta: "↑ 5pts", deltaTone: "good" },
      ],
    },
    {
      name: "JEE Crack · Google Search · Brand defense",
      signal: "Underspent by ~60% · losing 31% of branded impressions to category bidders.",
      tag: "neutral",
      metrics: [
        { label: "Spend", value: "₹38K" },
        { label: "CPL", value: "₹463" },
        { label: "Impression share", value: "69%", delta: "↓ 8pts", deltaTone: "bad" },
      ],
    },
  ],
  hasDecay: false,
  hasChronic: false,
  hasWinners: true,
  hasHeadroom: true,
  biggestProblem:
    "Not enough money chasing the winners — Brand Search defense alone has ₹50K/week of free volume.",
  memoryRefs: [
    "Memory · last 30 days · workspace audience graph",
    "Memory · 'Mentor-led hook outperforms rank-focused hook by 31% on hold-rate' (May 24)",
  ],
};

export const OPTIMIZE_ANALYSIS: AnalysisFindings = {
  summary:
    "NEET TOFU was working until two weeks ago — CPL just jumped 18% with falling qual rate. Foundation 9-10 has been underperforming since launch. Different root causes, different fixes.",
  signals: [
    {
      name: "NEET Pro · TOFU · Parents-see-progress",
      signal: "Recent decay · top Reel hit 5.2× freq · 14 negative comments · Allen launched price drop on May 12.",
      tag: "decay",
      metrics: [
        { label: "CPL", value: "₹612", delta: "↑ 13%", deltaTone: "bad" },
        { label: "Qual %", value: "9.5%", delta: "↓ 3.6pts", deltaTone: "bad" },
        { label: "Frequency", value: "5.2×", delta: "vs 4× cap", deltaTone: "bad" },
      ],
    },
    {
      name: "Foundation 9-10 · TOFU · Lab-bench hook",
      signal: "Chronic · never hit target CPL since launch · hook reads as 'play-school' to JEE-prep parents.",
      tag: "chronic",
      metrics: [
        { label: "CPL", value: "₹657", delta: "vs ₹420 target", deltaTone: "bad" },
        { label: "Qual %", value: "6.6%", delta: "vs 12% avg", deltaTone: "bad" },
        { label: "Mobile bounce", value: "64%" },
      ],
    },
    {
      name: "Foundation 9-10 · /pricing landing page",
      signal: "Mobile CTA below the fold · 71% of visitors never reach it.",
      tag: "chronic",
      metrics: [
        { label: "Mobile session", value: "24s" },
        { label: "CTA scroll depth", value: "2.4×" },
      ],
    },
  ],
  hasDecay: true,
  hasChronic: true,
  hasWinners: false,
  hasHeadroom: false,
  biggestProblem:
    "NEET TOFU decay — three things broke at once (creative fatigue + sentiment + Allen pricing) and CPL is still climbing.",
  memoryRefs: [
    "Memory · creative-feedback · 'Mentor-led hook outperforms rank-focused' (May 24)",
    "Memory · constraint · 'Avoid pressure-free framing — parents read it as unserious' (May 18)",
    "Memory · last 14 days · sentiment scoring on Reels",
  ],
};

export const ANGLES_ANALYSIS: AnalysisFindings = {
  summary:
    "Engineer Parent has 3 clear winners and 2 clear losers in the last 30 days. Winners share a pattern (specificity + autonomy), losers share an inverse one (anxiety + outcome promises). The pattern is clean enough to generate against.",
  signals: [
    {
      name: "Engineer Parent · 'Mentor-led · capped at 60'",
      signal: "Winner · best CPL on the persona · specific + authority framing.",
      tag: "winner",
      metrics: [
        { label: "CPL", value: "₹312" },
        { label: "Qual %", value: "16.8%" },
        { label: "CTR", value: "2.81%" },
      ],
    },
    {
      name: "Engineer Parent · 'All-India ranked mocks weekly'",
      signal: "Loser · anxiety framing · 6 of 9 top comments express stress.",
      tag: "decay",
      metrics: [
        { label: "CPL", value: "₹612", delta: "vs ₹360 target", deltaTone: "bad" },
        { label: "Hold rate", value: "21%" },
      ],
    },
    {
      name: "Engineer Parent · 'Crack JEE — guaranteed strategy'",
      signal: "Loser · outcome promise · triggers skepticism · also flagged in memory.",
      tag: "decay",
      metrics: [
        { label: "CPL", value: "₹584", delta: "vs ₹360 target", deltaTone: "bad" },
        { label: "Qual %", value: "3.4%", deltaTone: "bad" },
      ],
    },
  ],
  hasDecay: false,
  hasChronic: false,
  hasWinners: true,
  hasHeadroom: true,
  biggestProblem:
    "Some loud losers in the rotation are dragging the cohort CPL up — replacing them with insight-grounded angles should lift the whole portfolio.",
  memoryRefs: [
    "Memory · constraint · 'No outcome guarantees · legal flagged'",
    "Memory · constraint · 'Avoid name-checking competitors'",
    "Memory · creative-feedback · 'Mentor-led hook outperforms rank-focused by 31%'",
  ],
};

export function analysisFor(kind: "scale" | "optimize" | "test-angles"): AnalysisFindings {
  if (kind === "scale") return SCALE_ANALYSIS;
  if (kind === "optimize") return OPTIMIZE_ANALYSIS;
  return ANGLES_ANALYSIS;
}

/* ────────────────────────────────────────────────────────────────
 * CLARIFYING QUESTIONS
 *
 * Three questions per workflow kind — enough to constrain Spot's plan
 * meaningfully without overwhelming the user. Each question pre-picks
 * the default Spot would have chosen anyway (so the fastest path is
 * "scroll, confirm, go").
 *
 * Questions are *contextual* — they read from analysis findings to
 * show only the options that actually apply. E.g. "Stop the decay"
 * is only offered when decay was detected.
 * ──────────────────────────────────────────────────────────────── */

export const SCALE_QUESTIONS: ClarifyQuestion[] = [
  {
    id: "goal",
    question: "What's the primary goal of scaling?",
    why: "Determines whether I optimise for volume, cost, or audience expansion.",
    options: [
      { value: "more-leads", label: "More leads · same quality", hint: "Scale volume on what's already winning" },
      { value: "lower-cpl", label: "Lower CPL at current volume", hint: "Efficiency before expansion" },
      { value: "expand-personas", label: "Expand to new personas", hint: "Open new audience layers" },
      { value: "geo-expand", label: "Expand to new geographies", hint: "Replicate winners in new metros" },
    ],
    defaultValue: "more-leads",
  },
  {
    id: "budget",
    question: "Weekly budget headroom?",
    why: "Caps how aggressive the staged lifts can be.",
    options: [
      { value: "2L", label: "Up to ₹2L / week" },
      { value: "4L", label: "₹2–4L / week" },
      { value: "8L", label: "₹4–8L / week" },
      { value: "open", label: "No fixed ceiling" },
    ],
    defaultValue: "4L",
  },
  {
    id: "guardrails",
    question: "Any constraints I should respect?",
    why: "Things I won't touch even if the data suggests I should.",
    options: [
      { value: "none", label: "No constraints" },
      { value: "preserve", label: "Don't touch current best performers" },
      { value: "conservative", label: "Move slowly · max 25% lift per week" },
      { value: "weekends", label: "No deploys on weekends" },
    ],
    defaultValue: "preserve",
  },
];

export const OPTIMIZE_QUESTIONS: ClarifyQuestion[] = [
  {
    id: "priority",
    question: "What's the priority?",
    why: "Determines what I fix first when multiple issues compete.",
    options: [
      { value: "cpl", label: "Bring CPL down", hint: "Pause fatigued creative · counter-position on pricing" },
      { value: "quality", label: "Improve lead quality", hint: "Refine targeting · fix qualification rate" },
      { value: "fix-decay", label: "Stop the recent decay", hint: "Restore what was working two weeks ago" },
      { value: "everything", label: "Fix all of it · I'll pick" },
    ],
    defaultValue: "fix-decay",
  },
  {
    id: "scope",
    question: "Which campaigns are in scope?",
    why: "I can scope this to recent decay only, or include chronic losers too.",
    options: [
      { value: "decay", label: "Recent decay only" },
      { value: "chronic", label: "Chronic losers only" },
      { value: "both", label: "Both — full sweep" },
    ],
    defaultValue: "both",
  },
  {
    id: "autonomy",
    question: "How autonomous should I be?",
    why: "Some fixes are reversible (creative rotation); some aren't (landing page rebuild).",
    options: [
      { value: "ship-small", label: "Auto-ship small · ask before big", hint: "Recommended" },
      { value: "ask-everything", label: "Ask before every change" },
      { value: "ship-all", label: "Ship everything · within guardrails" },
    ],
    defaultValue: "ship-small",
  },
];

export const ANGLES_QUESTIONS: ClarifyQuestion[] = [
  {
    id: "focus",
    question: "Which persona should I focus angles on?",
    why: "Different personas need different framing — better to pick than spray.",
    options: [
      { value: "engineer-parent", label: "The Aspiring Engineer Parent" },
      { value: "self-studier", label: "The Self-Studier" },
      { value: "coaching-hopper", label: "The Coaching Hopper" },
      { value: "all", label: "All three · cross-cutting test" },
    ],
    defaultValue: "engineer-parent",
  },
  {
    id: "format",
    question: "Which creative formats?",
    why: "Drives what I'll brief the Creative Agent on.",
    options: [
      { value: "video", label: "Video / Reels only" },
      { value: "static", label: "Static + Carousel only" },
      { value: "mixed", label: "Mix · video + static" },
    ],
    defaultValue: "mixed",
  },
  {
    id: "test-spend",
    question: "How much weekly spend on the A/B test?",
    why: "Determines how fast we'll get a directional read.",
    options: [
      { value: "low", label: "₹20K / week", hint: "Slower · 14-day signal" },
      { value: "med", label: "₹40K / week", hint: "Recommended · 10-day signal" },
      { value: "high", label: "₹80K / week", hint: "Fast · 7-day signal" },
    ],
    defaultValue: "med",
  },
];

/**
 * Get the clarify questions for a workflow kind, *filtered against
 * the analysis findings*. Options that don't apply to the current
 * data are dropped; defaults are adjusted to the most useful option
 * given what Spot found.
 *
 * Examples:
 *   · Optimize · no decay detected → "Stop the recent decay" hidden,
 *     default shifts to "Fix all of it · I'll pick".
 *   · Optimize · only chronic problems → "Recent decay only" removed
 *     from the scope question, default flips to "Chronic only".
 *   · Scale · no headroom → questions don't change, but Spot would
 *     have framed the goal differently upstream.
 */
export function clarifyQuestionsFor(
  kind: "scale" | "optimize" | "test-angles",
  findings?: AnalysisFindings,
): ClarifyQuestion[] {
  if (kind === "scale") return contextualizeScale(SCALE_QUESTIONS, findings);
  if (kind === "optimize") return contextualizeOptimize(OPTIMIZE_QUESTIONS, findings);
  return contextualizeAngles(ANGLES_QUESTIONS, findings);
}

function contextualizeScale(
  base: ClarifyQuestion[],
  f?: AnalysisFindings,
): ClarifyQuestion[] {
  if (!f) return base;
  return base.map((q) => {
    if (q.id === "goal" && !f.hasHeadroom) {
      // No headroom → "More leads" is a bad default; lead with efficiency.
      return { ...q, defaultValue: "lower-cpl" };
    }
    return q;
  });
}

function contextualizeOptimize(
  base: ClarifyQuestion[],
  f?: AnalysisFindings,
): ClarifyQuestion[] {
  if (!f) return base;
  return base.map((q) => {
    if (q.id === "priority") {
      // Filter options based on findings + adjust default.
      const options = q.options.filter((o) => {
        if (o.value === "fix-decay" && !f.hasDecay) return false;
        return true;
      });
      // Default = the most pressing thing Spot found.
      let defaultValue = q.defaultValue;
      if (f.hasDecay) defaultValue = "fix-decay";
      else if (f.hasChronic) defaultValue = "cpl";
      else defaultValue = "quality";
      // If we filtered out the default, pick the first remaining.
      if (!options.find((o) => o.value === defaultValue)) {
        defaultValue = options[0]?.value ?? defaultValue;
      }
      return { ...q, options, defaultValue };
    }
    if (q.id === "scope") {
      const options = q.options.filter((o) => {
        if (o.value === "decay" && !f.hasDecay) return false;
        if (o.value === "chronic" && !f.hasChronic) return false;
        if (o.value === "both" && !(f.hasDecay && f.hasChronic)) return false;
        return true;
      });
      let defaultValue: string;
      if (f.hasDecay && f.hasChronic) defaultValue = "both";
      else if (f.hasDecay) defaultValue = "decay";
      else if (f.hasChronic) defaultValue = "chronic";
      else defaultValue = options[0]?.value ?? q.defaultValue;
      return { ...q, options, defaultValue };
    }
    return q;
  });
}

function contextualizeAngles(
  base: ClarifyQuestion[],
  f?: AnalysisFindings,
): ClarifyQuestion[] {
  if (!f) return base;
  // For Test New Angles, the analysis tells us which persona has the
  // cleanest signal — bias the focus default toward that persona. Mock
  // data points at Engineer Parent so we keep that default; in a real
  // build this would scan winners[].personaName for the dominant one.
  return base;
}

/** Render a captured answer (for the verification card). */
export function answerLabel(
  kind: "scale" | "optimize" | "test-angles",
  questionId: string,
  value: string,
): string {
  const q = clarifyQuestionsFor(kind).find((q) => q.id === questionId);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}

/* ────────────────────────────────────────────────────────────────
 * TIME-PHASED PLANS
 *
 * One plan per workflow kind. The "element of time" the user asked for
 * is the explicit Week 1 / Week 2 / Week 3 structure — Spot doesn't
 * just say "ship the fix", it commits to a watching window and a
 * decision date.
 *
 * Dates are illustrative — in a real product Spot would compute them
 * relative to "today" (workflow.startedAt).
 * ──────────────────────────────────────────────────────────────── */

export const SCALE_PLAN: WorkflowPlan = {
  goal:
    "Grow qualified-lead volume 35–45% over 3 weeks while keeping CPL drift under 10%.",
  insights: [
    {
      title: "Two winning ad sets have real headroom",
      detail:
        "Engineer Parent × Mentor-led hook and Self-Studier × Doubt-clearing reel are sitting at 28% and 52% saturation respectively — significant room before reach plateaus.",
      tone: "good",
    },
    {
      title: "1% LAL seed cohort just crossed the threshold",
      detail:
        "Qualified-lead cohort hit 248 (Meta needs 1k seed; our verified+qualified pool is 860). Sharper LAL than the one currently running on visitors.",
      tone: "good",
    },
    {
      title: "Brand Search is severely underspent",
      detail:
        "₹38K against ₹98K total Google spend — defending brand queries at ~100% intent, but we're losing ~31% of branded impressions to category bidders.",
      tone: "warn",
    },
    {
      title: "Stories placement untouched on winning Reels",
      detail:
        "Top 2 Reels run on Feed only. Workspace benchmarks show +18% CTR on Stories for video-led EdTech creative.",
      tone: "neutral",
    },
  ],
  phases: [
    {
      id: "p1",
      week: "Week 1",
      dates: "May 28 – Jun 3",
      title: "Stage 1 lift · build the LAL seed",
      actions: [
        "Lift budget +25% on Engineer Parent × Mentor-led hook (staggered over 3 days)",
        "Lift budget +25% on Self-Studier × Doubt-clearing reel",
        "Brief the LAL audience from the 860-strong verified+qualified cohort",
        "Open Brand Search defense budget cap by 2.4× (₹38K → ₹92K)",
      ],
      observes: [
        "CPL drift on lifted ad sets · expecting ≤ 8%",
        "Frequency on the top Reel · cap at 4×",
        "Brand Search impression share recovery",
      ],
      decisionAt: "Day 4 · Jun 1",
      decisionRule:
        "If CPL drift ≤ 8% on both ad sets → fire Stage 2. If drift 8–12% → hold one more day. If > 12% → auto-pause that ad set.",
    },
    {
      id: "p2",
      week: "Week 2",
      dates: "Jun 4 – Jun 10",
      title: "Decide · launch LAL · expand placements",
      actions: [
        "If Stage 1 holds, fire Stage 2 lift (+25% more, compounds to +50% total)",
        "Launch the new 1% LAL audience inside the Scaling bucket",
        "Open Stories + Reels Discover placements on the top 2 winning Reels",
        "Continue Brand Search defense at the new budget cap",
      ],
      observes: [
        "LAL audience CPL vs. core (target: within 15%)",
        "Stories placement CTR vs. Feed",
        "Qualified-lead trajectory (the actual goal, not CPL)",
      ],
      decisionAt: "Day 11 · Jun 8",
      decisionRule:
        "If qualified-lead delta ≥ +25% vs baseline → green-light Week 3 geo expansion. Else hold + audit before expanding.",
    },
    {
      id: "p3",
      week: "Week 3",
      dates: "Jun 11 – Jun 17",
      title: "Scale winners · prune losers · expand geo",
      actions: [
        "Geo expand the winning Engineer Parent ad set to Indore + Lucknow + Coimbatore",
        "Pause any placement still underperforming benchmark after 10 days",
        "Move the LAL audience into its own scaling bucket if it's pulling ≥ 80% of core CPL",
        "Post final report-back to the dashboard · I'll write the learnings to product memory",
      ],
      observes: [
        "Tier-2 CPL vs. tier-1 baseline (expect 8–15% lower)",
        "End-of-window CPQL · the actual scaling KPI",
        "Whether the LAL is sharper than visitor LAL we used to run",
      ],
    },
  ],
  guardrails: [
    "If CPL drift exceeds 15% on any lift stage, auto-pause that stage and ping you immediately",
    "If frequency hits 4.5× on a winning ad, rotate creative without waiting for permission",
    "If qualified-lead rate drops more than 3 points, pause the affected ad set",
    "Never push more than one major change on a weekend",
  ],
  reportingCadence:
    "I'll drop a short check-in on your dashboard every Monday morning, plus a flag the moment any guardrail fires. End of Week 3 I'll write a learnings entry into product memory.",
};

export const OPTIMIZE_PLAN: WorkflowPlan = {
  goal:
    "Restore NEET TOFU CPL from ₹612 back to the ₹468 it was at three weeks ago · fix Foundation chronic underperformance in parallel.",
  insights: [
    {
      title: "Top NEET Reel is fatigued · 5.2× frequency",
      detail:
        "CTR fell from 2.4% → 1.49% over 21 days. Reach plateaued at 76% of pool size on Day 19. We're spending against an exhausted audience.",
      tone: "warn",
    },
    {
      title: "Negative sentiment spike on Day 18",
      detail:
        "14 negative comments in 3 days flagged the 'Parents see weekly progress' hook as 'surveillance framing'. Sentiment dropped from +0.78 → −0.18. Meta's relevance score on the ad dropped 8 → 5.",
      tone: "warn",
    },
    {
      title: "Allen launched ₹6K NEET price drop on May 12",
      detail:
        "Our /pricing click-through dropped 41% same day. Their 'Pay-on-result' framing is a direct attack on our 'No outcome guarantees' positioning — needs a counter.",
      tone: "warn",
    },
    {
      title: "Foundation is a positioning issue, not a media issue",
      detail:
        "Lab-bench hook reads as 'play-school' to JEE-prep parents. Memory already has the constraint ('Avoid pressure-free framing') — Creative Agent missed it on the brief.",
      tone: "neutral",
    },
  ],
  phases: [
    {
      id: "p1",
      week: "Week 1",
      dates: "May 28 – Jun 3",
      title: "Ship the small fixes · rewrite the Foundation brief",
      actions: [
        "Pause the fatigued 'Parents see weekly progress' Reel immediately",
        "Brief Creative Agent on 2 new NEET hooks: mentor-led + biology-first",
        "Re-frame: replace 'parents see' with 'your kid tracks their own progress'",
        "Rewrite the Foundation creative brief · enforce the memory constraint",
      ],
      observes: [
        "NEET TOFU CPL trajectory · expect recovery to ₹520-540 by Day 6",
        "Comment sentiment on the new Reels (target: back above +0.4)",
        "New Foundation creative briefs · approved by the QA Agent",
      ],
      decisionAt: "Day 5 · Jun 2",
      decisionRule:
        "If sentiment recovers and CPL trending down → continue Week 2. If sentiment stays negative → escalate, pull all NEET TOFU spend pending creative review.",
    },
    {
      id: "p2",
      week: "Week 2",
      dates: "Jun 4 – Jun 10",
      title: "Counter-position on price · rebuild Foundation page",
      actions: [
        "Launch the '14-day money-back' offer card on NEET pricing page",
        "Push 4 new Foundation creatives based on the rewritten brief",
        "Ticket the Foundation landing-page rebuild · sticky mobile CTA above the fold",
        "Run a side-by-side A/B on NEET hook framing (autonomy vs. trust)",
      ],
      observes: [
        "NEET /pricing bounce rate · expect 38% → ~28%",
        "Foundation CPL drift (chronic issue · expect 8-15% improvement)",
        "Mobile session length on the new Foundation page",
      ],
      decisionAt: "Day 10 · Jun 7",
      decisionRule:
        "If NEET CPL ≤ ₹510 and Foundation CPL trending down → declare both recovered, move into watch mode. Else triage what's still broken.",
    },
    {
      id: "p3",
      week: "Week 3",
      dates: "Jun 11 – Jun 17",
      title: "Watch mode · write learnings to memory",
      actions: [
        "Hold all changes · just watch trajectories",
        "If recovery holds, freeze new creative + new positioning into the locked brief",
        "Write 3 learnings to product memory: creative fatigue threshold, counter-positioning template, Foundation positioning constraint",
        "Schedule auto-flag for next decay event · 14-day rolling check on frequency + sentiment",
      ],
      observes: [
        "Whether CPL stays in band without new interventions",
        "Whether the Foundation positioning fix actually moved qual rate",
        "Allen's pricing — does our counter-position close the gap?",
      ],
    },
  ],
  guardrails: [
    "If NEET CPL spikes above ₹700 on any single day, pause TOFU spend until I diagnose",
    "If a new creative gets 3+ negative comments in 24 hours, auto-pause it pending review",
    "If Allen drops price again, escalate immediately rather than reacting alone",
    "No landing-page changes ship to prod without your sign-off — only briefs and tickets",
  ],
  reportingCadence:
    "Daily CPL ping on the dashboard for the first 5 days, then weekly. Any guardrail fire = immediate notification. End of Week 3 = full retro entry into product memory.",
};

export const ANGLES_PLAN: WorkflowPlan = {
  goal:
    "Identify 2 new winning angles for Engineer Parent that beat the current best (CPL ₹312, qual rate 16.8%) — without losing the wins we already have.",
  insights: [
    {
      title: "Winners share a pattern: specificity + autonomy",
      detail:
        "'Mentor-led · capped at 60' and '24-month replay · no time pressure' both lean specific + student-owned. Abstract or pressure framings lost.",
      tone: "good",
    },
    {
      title: "Losers share a pattern too: anxiety + outcome promises",
      detail:
        "'All-India ranked mocks weekly' and 'Crack JEE — guaranteed strategy' both lost on CTR and CPL. Comment data shows parents read them as pressure.",
      tone: "warn",
    },
    {
      title: "Memory constraint must guide generation",
      detail:
        "Product memory flags: no rank promises (legal), no name-checking competitors. The hypothesis we're testing respects both.",
      tone: "neutral",
    },
    {
      title: "Engineer Parent ad set is the right host",
      detail:
        "Highest volume of the three personas → fastest signal. 30% traffic split gives us ~180 leads per angle in 10 days — directionally significant on the top 2.",
      tone: "good",
    },
  ],
  phases: [
    {
      id: "p1",
      week: "Week 1",
      dates: "May 28 – Jun 3",
      title: "Launch the 6-angle A/B test",
      actions: [
        "Push 6 new angles into the Engineer Parent scaling ad set · ₹40K/week budget",
        "30% traffic split to the test · 70% continues on current winners",
        "Run a 7-day early-stop guard · pause any angle with CTR < 0.8% or freq > 4×",
        "Daily watchlist: CPL per angle, hold-rate, comment sentiment",
      ],
      observes: [
        "Which 2-3 angles clear the CPL ≤ ₹360 threshold",
        "Whether qual rate stays ≥ 14% on the leading angles",
        "Comment sentiment on each angle — early signal for memory updates",
      ],
      decisionAt: "Day 7 · Jun 4",
      decisionRule:
        "If 2+ angles clear threshold → continue Week 2 with those. If only 1 clears → extend test with that one + 2 fresh variants. If 0 clear → pull, audit, restart with new hypothesis.",
    },
    {
      id: "p2",
      week: "Week 2",
      dates: "Jun 4 – Jun 10",
      title: "Lock winners · prune losers",
      actions: [
        "Pause all angles that didn't clear threshold (typically 3-4 of the 6)",
        "Double traffic share on the top 2 angles (60% of test budget each)",
        "Brief Resize Agent on the variants needed for full deployment",
        "Run a sentiment audit on the comment sections weekly",
      ],
      observes: [
        "CPL trajectory of the winners as they scale",
        "Whether they hold qual rate when budget shifts toward them",
        "How they're performing across the full audience (not just the test cohort)",
      ],
      decisionAt: "Day 11 · Jun 8",
      decisionRule:
        "If winners hold CPL ≤ ₹360 under doubled share → move them into the main Scaling bucket. Else they were narrow wins; iterate.",
    },
    {
      id: "p3",
      week: "Week 3",
      dates: "Jun 11 – Jun 17",
      title: "Promote winners to the main rotation · write learnings",
      actions: [
        "Move winning angles out of the test and into the primary Scaling bucket",
        "Retire the angles they displaced (the previous winners get demoted to retargeting)",
        "Write the angle-pattern insight to product memory (specificity + autonomy)",
        "Brief next angle generation cycle using the validated pattern",
      ],
      observes: [
        "Final lift in qualified-lead volume from the new winners",
        "Whether the demoted-but-not-paused old winners still hold in retargeting",
        "What the pattern says about the next testing cycle",
      ],
    },
  ],
  guardrails: [
    "Any angle that gets 5+ negative comments in 48 hours gets auto-paused pending review",
    "If overall ad-set CPL drifts > 12% during the test, throttle test budget",
    "Never let the test eat more than 30% of the host ad set's traffic",
    "All new copy passes through the 'avoid' list from product memory before going live",
  ],
  reportingCadence:
    "Mid-test check-in on the dashboard at Day 4. Full result + winner declaration at Day 10. Learnings update to memory on Day 14.",
};

export function planFor(kind: "scale" | "optimize" | "test-angles"): WorkflowPlan {
  if (kind === "scale") return SCALE_PLAN;
  if (kind === "optimize") return OPTIMIZE_PLAN;
  return ANGLES_PLAN;
}

/* ────────────────────────────────────────────────────────────────
 * CREATIVE ANGLES — the ang-creatives iteration surface
 *
 * After the brief is locked (ang-clarify), Spot's Creative Agent drafts
 * a set of candidate angles. Each one renders on the canvas as the
 * ACTUAL ad creative (a visual HTML mockup — hook + visual + CTA composed
 * like a real Meta ad), not a markdown spec. The user then iterates three
 * ways, all on the same card:
 *   1. Edit the copy directly (hook / primary text / button) — inline.
 *   2. Ask Spot to revise it — relayed THROUGH the chat thread (a
 *      `creative.revise` tool-call runs and Spot redrafts it). The user
 *      never chats a worker directly (Principle 1).
 *   3. Scrub the version history — every revision is a version; the user
 *      can step back/forward and refine any version.
 *
 * Each angle is grounded in the winning pattern (specificity + parent
 * autonomy) and screened against memory constraints (no rank/outcome
 * guarantees — legal; no competitor name-checks).
 * ──────────────────────────────────────────────────────────────── */

export type CreativeAngle = {
  /** Stable id used to key revisions + local UI state. */
  id: string;
  /** Short human label for the angle. */
  label: string;
  /** The scroll-stopping hook line (rendered big on the creative). */
  hook: string;
  /** The supporting body / primary text. */
  body: string;
  /** The call to action (the button label on the creative). */
  cta: string;
  /** Production format — drives how the creative renders. */
  format: "Reel" | "Static" | "Carousel";
  /** Which slice of the winning pattern this leans on. */
  patternTag: string;
  /** Art direction for the visual — the imagery the creative renders. */
  visualConcept: string;
  /** Hue token driving the creative's gradient + the card accent. */
  hue: "violet" | "sky" | "emerald" | "amber" | "rose" | "indigo";
};

export type AngleRevision = {
  /** The suggestion-chip label the user clicks (imperative, short). */
  changeLabel: string;
  /** Spot's one-line confirmation of what it changed + why. */
  note: string;
  /** The redrafted angle. id + hue carry over; visualConcept is optional
   *  (revisions usually change copy, not the art direction). */
  angle: Omit<CreativeAngle, "id" | "hue" | "visualConcept"> & {
    visualConcept?: string;
  };
};

/**
 * Six candidate angles for the demo's flagship persona — the
 * Engineer-Parent. All grounded in specificity + autonomy; none make an
 * outcome promise or name a competitor.
 */
export const ANGLE_CANDIDATES: CreativeAngle[] = [
  {
    id: "ang-1",
    label: "The 11pm doubt",
    hook: "It's 11pm. You're still wondering if the concept actually landed today.",
    body: "Most parents find out at the report card. You'll see the weak chapter flagged the same night — and exactly what we're doing about it tomorrow.",
    cta: "See tonight's flag",
    format: "Reel",
    patternTag: "Specificity · the named moment",
    visualConcept:
      "Close-up of a parent's face lit only by a laptop at night, then a soft notification glow as the flag arrives.",
    hue: "violet",
  },
  {
    id: "ang-2",
    label: "They own the dashboard",
    hook: "Your kid checks their own progress before you do.",
    body: "Every concept, every reset, every streak — on one screen they actually open. Autonomy isn't a buzzword here; it's the default screen.",
    cta: "Tour the dashboard",
    format: "Carousel",
    patternTag: "Autonomy · the learner owns it",
    visualConcept:
      "A teen swiping through a clean progress dashboard on their phone, parent watching over the shoulder, relaxed.",
    hue: "sky",
  },
  {
    id: "ang-3",
    label: "A mentor who knows the weak chapters",
    hook: "Not a tutor who repeats the textbook. A mentor who knows which three chapters are shaky.",
    body: "We map the exact concepts that didn't stick, then a mentor works those — not the whole syllabus again. You see the map too.",
    cta: "See the concept map",
    format: "Static",
    patternTag: "Specificity · the diagnosis",
    visualConcept:
      "Split frame — a generic textbook on the left, a highlighted concept-map with three chapters circled on the right.",
    hue: "emerald",
  },
  {
    id: "ang-4",
    label: "The Sunday plan they build",
    hook: "Sunday, 10 minutes: your kid sets their own week.",
    body: "They pick the concepts to reset, we suggest the order, and the week runs itself. You get the recap — you don't have to nag.",
    cta: "Watch a week get built",
    format: "Reel",
    patternTag: "Autonomy · self-directed cadence",
    visualConcept:
      "Sunday-morning kitchen table — a kid dragging concept cards into a weekly planner on a tablet, coffee steaming.",
    hue: "amber",
  },
  {
    id: "ang-5",
    label: "15-minute concept resets",
    hook: "One shaky concept. Fifteen focused minutes. Done before dinner.",
    body: "No three-hour cram. We isolate the exact concept that slipped and reset it in a single short session — and show you which one it was.",
    cta: "See a reset session",
    format: "Static",
    patternTag: "Specificity · the small unit",
    visualConcept:
      "A 15-minute timer mid-countdown beside a single neatly-solved problem — calm, uncluttered desk.",
    hue: "rose",
  },
  {
    id: "ang-6",
    label: "The recording that waits two years",
    hook: "Every session is recorded — so the concept is still there when the board exam asks for it.",
    body: "Two years later, your kid re-opens the exact explanation that made it click the first time. Nothing's lost between Class 9 and the boards.",
    cta: "Browse the library",
    format: "Carousel",
    patternTag: "Specificity · the durable asset",
    visualConcept:
      "A video library scrubbing back two years to the exact lesson, a 'still here' timestamp badge glowing.",
    hue: "indigo",
  },
];

/**
 * Pre-authored revisions per angle. When the user picks one of these (or
 * types a free-text request that maps to one), Spot "redrafts" the angle
 * to the version stored here. Keyed by angle id. The `changeLabel`s
 * become the suggestion chips on each card.
 */
export const ANGLE_REVISIONS: Record<string, AngleRevision[]> = {
  "ang-1": [
    {
      changeLabel: "Make the hook less anxious",
      note: "Pulled the 11pm-worry framing — leads with the reassurance instead of the dread, keeps the same-night specificity.",
      angle: {
        label: "The 11pm doubt",
        hook: "You'll know how today's concept landed — tonight, not at the report card.",
        body: "The weak chapter gets flagged the same evening, with exactly what we're doing about it tomorrow. No waiting, no guessing.",
        cta: "See tonight's flag",
        format: "Reel",
        patternTag: "Specificity · the named moment",
      },
    },
    {
      changeLabel: "Try a shorter hook",
      note: "Tightened the hook to one breath — punchier for a Reel cold-open, same idea.",
      angle: {
        label: "The 11pm doubt",
        hook: "Stop guessing if it landed.",
        body: "You'll see the weak chapter flagged the same night — and the plan for tomorrow. Most parents wait for the report card. You won't.",
        cta: "See tonight's flag",
        format: "Reel",
        patternTag: "Specificity · the named moment",
      },
    },
  ],
  "ang-2": [
    {
      changeLabel: "Lead with the parent",
      note: "Re-centred on the parent's relief while keeping the kid-autonomy as the proof — you stop chasing, they self-track.",
      angle: {
        label: "They own the dashboard",
        hook: "You stopped asking 'did you study?' — they just show you.",
        body: "Your kid checks their own progress before you do. Every concept, reset and streak on one screen they actually open.",
        cta: "Tour the dashboard",
        format: "Carousel",
        patternTag: "Autonomy · the learner owns it",
      },
    },
    {
      changeLabel: "Make it more specific",
      note: "Swapped the abstract 'progress' for the three concrete things on the screen — specificity over vibe.",
      angle: {
        label: "They own the dashboard",
        hook: "Three taps: weak chapters, next reset, current streak.",
        body: "Your kid opens it before you do. The whole picture — what's shaky, what's next, how consistent — on one screen they own.",
        cta: "Tour the dashboard",
        format: "Carousel",
        patternTag: "Autonomy · the learner owns it",
      },
    },
  ],
  "ang-3": [
    {
      changeLabel: "Lead with the mentor",
      note: "Put the human mentor up front — the relationship is the hook, the concept-map is the proof underneath.",
      angle: {
        label: "A mentor who knows the weak chapters",
        hook: "A mentor who already knows which three chapters are shaky — before the first session.",
        body: "We map the exact concepts that didn't stick, then your mentor works those, not the whole syllabus again. You see the map too.",
        cta: "Meet the mentor",
        format: "Static",
        patternTag: "Specificity · the diagnosis",
      },
    },
    {
      changeLabel: "Make the hook less anxious",
      note: "Softened the 'shaky chapters' anxiety — frames it as a head-start rather than a problem to fear.",
      angle: {
        label: "A mentor who knows the weak chapters",
        hook: "Imagine a mentor who's already done the homework on your kid.",
        body: "We map which concepts need a second pass, then a mentor works exactly those. Targeted from day one — and you can see the map.",
        cta: "See the concept map",
        format: "Static",
        patternTag: "Specificity · the diagnosis",
      },
    },
  ],
  "ang-4": [
    {
      changeLabel: "Make it more specific",
      note: "Named the actual Sunday ritual + the 10-minute unit instead of a generic 'plan' — concrete beats aspirational.",
      angle: {
        label: "The Sunday plan they build",
        hook: "Sunday, 10 minutes, kitchen table: your kid picks next week's resets.",
        body: "They choose the shaky concepts, we order them, the week runs itself. You get the Friday recap — no nagging in between.",
        cta: "Watch a week get built",
        format: "Reel",
        patternTag: "Autonomy · self-directed cadence",
      },
    },
    {
      changeLabel: "Try a shorter hook",
      note: "Cut the hook to a single line for the Reel open — keeps the self-directed angle.",
      angle: {
        label: "The Sunday plan they build",
        hook: "Your kid plans their own week now.",
        body: "Ten minutes on Sunday: they pick the concepts to reset, we suggest the order, the week runs itself. You just get the recap.",
        cta: "Watch a week get built",
        format: "Reel",
        patternTag: "Autonomy · self-directed cadence",
      },
    },
  ],
  "ang-5": [
    {
      changeLabel: "Lead with the parent",
      note: "Opened on the parent's evening relief — the 15-minute unit becomes the reason it's possible.",
      angle: {
        label: "15-minute concept resets",
        hook: "No more three-hour cram sessions you have to police.",
        body: "We isolate the one concept that slipped and reset it in fifteen focused minutes — done before dinner, and you see which concept it was.",
        cta: "See a reset session",
        format: "Static",
        patternTag: "Specificity · the small unit",
      },
    },
    {
      changeLabel: "Make the hook less anxious",
      note: "Dropped the 'shaky concept' worry framing — leads with the calm, short-session promise.",
      angle: {
        label: "15-minute concept resets",
        hook: "Fifteen focused minutes. One concept. Done before dinner.",
        body: "We pick the single concept worth revisiting and reset it in one short session — no marathon, and you see exactly what got covered.",
        cta: "See a reset session",
        format: "Static",
        patternTag: "Specificity · the small unit",
      },
    },
  ],
  "ang-6": [
    {
      changeLabel: "Make it more specific",
      note: "Anchored the abstract 'two years' to the concrete Class 9 → boards span — specificity sharpens the payoff.",
      angle: {
        label: "The recording that waits two years",
        hook: "The Class 9 explanation that finally clicked? Still there in Class 11.",
        body: "Every session is recorded, so your kid re-opens the exact explanation that worked the first time — right when the boards ask for it.",
        cta: "Browse the library",
        format: "Carousel",
        patternTag: "Specificity · the durable asset",
      },
    },
    {
      changeLabel: "Lead with the parent",
      note: "Framed it as the parent never having to re-explain or re-pay for the same concept — value to the household.",
      angle: {
        label: "The recording that waits two years",
        hook: "You never pay to re-teach the same concept twice.",
        body: "Every session's recorded. When the board exam circles back to a Class 9 concept, your kid re-opens the explanation that already worked.",
        cta: "Browse the library",
        format: "Carousel",
        patternTag: "Specificity · the durable asset",
      },
    },
  ],
};

/* ────────────────────────────────────────────────────────────────
 * PERSISTENT PRODUCT PLAN
 *
 * Every product has ONE long-lived plan. The Agent keeps working on
 * it; the user evolves it by chatting with Spot. New product → plan
 * is created. Optimize / Scale / Test-Angles flows update the plan
 * rather than spinning a brand-new isolated artefact.
 *
 * Where the plan surfaces:
 *   · Memory > Plans tab        — canonical home
 *   · Dashboard "Active plans"  — at-a-glance status across products
 *   · /spot product cards       — small chip ("Week 1 of 3 · 2 recs")
 *   · Campaigns dashboard       — each campaign cites its plan
 * ──────────────────────────────────────────────────────────────── */

export type ProductPlanHistoryEntry = {
  at: string;
  who: string;
  /** Imperative: "Plan started", "Updated by Optimize flow", etc. */
  entry: string;
};

export type ProductPlan = {
  id: string;
  productId: string;
  /** Latest plan kind that updated this plan. */
  origin: "launch" | "scale" | "optimize" | "test-angles";
  /** Single-sentence goal the plan is chasing. */
  goal: string;
  /** active | watching | paused | drafting */
  status: "active" | "watching" | "paused" | "drafting";
  /** 1-indexed current phase. */
  currentPhase: number;
  /** Day X of Y (computed from dates in a real product). */
  dayLabel: string;
  /** Same phase shape as WorkflowPlan.phases. */
  phases: PlanPhase[];
  guardrails: string[];
  /** Next decision date label. */
  nextDecision: string;
  /** Count of pending recommendations attributed to this plan. */
  pendingRecs: number;
  /** When the plan was created / last updated. */
  createdAt: string;
  updatedAt: string;
  /** Append-only history — every meaningful change to the plan. */
  history: ProductPlanHistoryEntry[];
};

/**
 * Mock product plans — one per Guyju's product. The shape mirrors what
 * a freshly-approved diagnostic plan would persist as.
 */
export const PRODUCT_PLANS: ProductPlan[] = [
  {
    id: "plan-jee",
    productId: "prod-guyjus-jee",
    origin: "scale",
    goal:
      "Grow qualified-lead volume 35–45% over 3 weeks while keeping CPL drift under 10%.",
    status: "active",
    currentPhase: 1,
    dayLabel: "Day 4 of 17",
    phases: SCALE_PLAN.phases,
    guardrails: SCALE_PLAN.guardrails,
    nextDecision: "Jun 1",
    pendingRecs: 1, // Stage 2 budget lift waiting on approval
    createdAt: "2026-05-24",
    updatedAt: "2026-05-28",
    history: [
      {
        at: "2026-05-24",
        who: "Spot",
        entry: "Plan created · scaling Engineer Parent + Self-Studier winners.",
      },
      {
        at: "2026-05-25",
        who: "Spot",
        entry: "Stage 1 lift deployed (+25% on top 2 ad sets, staggered).",
      },
      {
        at: "2026-05-28",
        who: "Spot",
        entry: "Stage 1 holding — CPL drift +6.4%, under 8% threshold. Stage 2 ready.",
      },
    ],
  },
  {
    id: "plan-neet",
    productId: "prod-guyjus-neet",
    origin: "optimize",
    goal:
      "Restore NEET TOFU CPL to ₹468 by retiring fatigued creative and counter-positioning against Allen.",
    status: "active",
    currentPhase: 1,
    dayLabel: "Day 2 of 17",
    phases: OPTIMIZE_PLAN.phases,
    guardrails: OPTIMIZE_PLAN.guardrails,
    nextDecision: "Jun 2",
    pendingRecs: 1, // Pause fatigued Reel waiting
    createdAt: "2026-05-26",
    updatedAt: "2026-05-28",
    history: [
      {
        at: "2026-05-26",
        who: "Spot",
        entry:
          "Plan created · 3 root causes: creative fatigue + sentiment surge + Allen pricing.",
      },
      {
        at: "2026-05-27",
        who: "Ankit Purohit",
        entry: "Approved Week 1 fixes · paused 'Parents see weekly progress' Reel.",
      },
      {
        at: "2026-05-28",
        who: "Spot",
        entry: "Frequency back to 4.1× · waiting on sentiment recovery in next 48 hrs.",
      },
    ],
  },
  {
    id: "plan-foundation",
    productId: "prod-guyjus-foundation",
    origin: "test-angles",
    goal:
      "Identify a winning creative angle for Foundation that beats the current chronic CPL of ₹657.",
    status: "drafting",
    currentPhase: 0,
    dayLabel: "Not started",
    phases: ANGLES_PLAN.phases,
    guardrails: ANGLES_PLAN.guardrails,
    nextDecision: "—",
    pendingRecs: 1, // Foundation landing-page ticket
    createdAt: "2026-05-28",
    updatedAt: "2026-05-28",
    history: [
      {
        at: "2026-05-28",
        who: "Spot",
        entry:
          "Plan drafted from creative audit — hook mismatch identified · landing-page ticket queued.",
      },
    ],
  },
];

export function planForProduct(productId: string): ProductPlan | undefined {
  return PRODUCT_PLANS.find((p) => p.productId === productId);
}

export const PLAN_STATUS_TONE: Record<ProductPlan["status"], string> = {
  active: "pill-ok",
  watching: "pill-info",
  paused: "pill-warn",
  drafting: "pill",
};

export const PLAN_STATUS_LABEL: Record<ProductPlan["status"], string> = {
  active: "Active",
  watching: "Watching",
  paused: "Paused",
  drafting: "Drafting",
};

export const PLAN_ORIGIN_LABEL: Record<ProductPlan["origin"], string> = {
  launch: "Launch plan",
  scale: "Scale plan",
  optimize: "Optimize plan",
  "test-angles": "Angle-test plan",
};

/* ────────────────────────────────────────────────────────────────
 * RECOMMENDATIONS FED TO THE DASHBOARD
 *
 * These are the things Spot has surfaced from active plans that need
 * a human approval. The dashboard renders a feed; clicking Approve
 * dismisses + pretends to deploy. Each recommendation carries enough
 * evidence that the user can decide in 5 seconds.
 * ──────────────────────────────────────────────────────────────── */

export const PENDING_RECOMMENDATIONS: PendingRecommendation[] = [
  {
    id: "rec-1",
    sourceKind: "optimize",
    sourceProduct: "Guyju's NEET Pro",
    surfacedAt: "12 min ago",
    title: "Pause 'Parents see weekly progress' Reel",
    detail:
      "Frequency hit 5.2× this morning · CTR is now below the threshold I set on Day 1. Negative comments are stacking on top.",
    evidence: [
      "Frequency 5.2× (cap: 4×)",
      "CTR fell to 1.42% (Day 1: 2.4%)",
      "5 new negative comments in last 18 hrs",
    ],
    projectedImpact: "CPL recovers to ₹530-545 within 48 hrs · sentiment back above zero in 10 days",
    urgency: "high",
  },
  {
    id: "rec-2",
    sourceKind: "scale",
    sourceProduct: "Guyju's JEE Crack",
    surfacedAt: "2 hr ago",
    title: "Fire Stage 2 budget lift on Engineer Parent",
    detail:
      "Stage 1 held — CPL drift is +6.4%, well under the 8% threshold. Ready to compound to +50% total lift.",
    evidence: [
      "Stage 1 CPL drift: +6.4% (limit: 8%)",
      "Frequency on top creative: 3.1× (under cap)",
      "Qualified-lead rate stable at 14.2%",
    ],
    projectedImpact: "+ ₹85K weekly spend · + 140-170 weekly leads · CPL drifts to +9-11% total",
    urgency: "medium",
  },
  {
    id: "rec-3",
    sourceKind: "test-angles",
    sourceProduct: "Guyju's JEE Crack",
    surfacedAt: "4 hr ago",
    title: "Promote 2 winning angles to Scaling bucket",
    detail:
      "'Your kid tracks their own progress' and 'Live mentor at 11pm' both cleared the threshold with room. Day 7 early-stop fired.",
    evidence: [
      "Angle 1 CPL: ₹298 (target: ≤ ₹360)",
      "Angle 2 CPL: ₹324",
      "Both holding qual rate ≥ 15.8%",
    ],
    projectedImpact: "Replaces 2 demoted angles · lifts portfolio CPL by ~6%",
    urgency: "medium",
  },
  {
    id: "rec-4",
    sourceKind: "optimize",
    sourceProduct: "Guyju's Foundation 9-10",
    surfacedAt: "yesterday",
    title: "Ticket the Foundation pricing page rebuild",
    detail:
      "Mobile CTA is below the fold · 71% of visitors don't reach it. Spec is ready · just needs 2 days of dev.",
    evidence: [
      "Mobile bounce rate: 64%",
      "Avg session: 24s on mobile",
      "Heatmap shows CTA at 2.4× scroll depth",
    ],
    projectedImpact: "Mobile bounce 64% → ~45% · demo form fills +60%",
    urgency: "low",
  },
];

/* ────────────────────────────────────────────────────────────────
 * INTRO MESSAGES + TOOL CALLS
 *
 * The new 3-step model maps to:
 *   clarify  → tool-call: "spot.brief"     (fast, just confirms)
 *   plan     → tool-calls: 5 parallel agents (memory, personas,
 *              creative.audit, competitor.scan, plan.build)
 *   live     → tool-call: "deploy.push"
 * ──────────────────────────────────────────────────────────────── */

export function extendedIntroMessage(
  step: string,
  productName: string,
  kind: "scale" | "optimize" | "test-angles" = "scale",
): SpotMessage | null {
  switch (step) {
    /* ─── analyze (per kind) ──────────────────────────────────── */
    case "scale-analyze":
    case "opt-analyze":
    case "ang-analyze": {
      const verb =
        kind === "scale"
          ? "what's been working, what's saturated, where the headroom is"
          : kind === "optimize"
            ? "what's underperforming, which problems are recent vs chronic, the actual root causes"
            : "which angles are winning, which are losing, the pattern underneath both";
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: `Here's what I'm seeing on **${productName}** — ${verb}. Right pane has the breakdown. Once you've read it, we'll talk about what you want to do.`,
          },
          {
            type: "step-cta",
            label: "Got it — let's set the goal",
            helper: "I'll fold your goal + constraints into the execution plan next.",
          },
        ],
      };
    }

    /* ─── clarify (per kind) ───────────────────────────────────── */
    case "scale-clarify":
    case "opt-clarify":
    case "ang-clarify": {
      const text =
        kind === "scale"
          ? `Three questions on the right — I've picked defaults based on what I found in the analysis. Confirm or change, then I'll fold them into the execution plan.`
          : kind === "optimize"
            ? `Three questions on the right — I've biased the defaults toward what I think the priority should be based on the analysis. Confirm or change.`
            : `Three questions on the right — these constrain what I generate. Defaults are picked from the audit.`;
      // For test-angles the next step isn't the plan — it's the angle
      // drafting surface. So the CTA points there instead.
      const clarifyCta =
        kind === "test-angles"
          ? {
              type: "step-cta" as const,
              label: "Confirm · draft the angles",
              helper:
                "I'll generate a fresh set of angles from these constraints for you to review.",
              refineHint: "or change the picks on the right",
            }
          : {
              type: "step-cta" as const,
              label: "Confirm · build the execution plan",
              helper: "I'll fold these into a time-phased execution plan to approve.",
              refineHint: "or change the picks on the right",
            };
      return {
        role: "spot",
        parts: [{ type: "text", text }, clarifyCta],
      };
    }

    /* ─── creatives (test-angles only) ─────────────────────────── */
    case "ang-creatives":
      return {
        role: "spot",
        parts: [
          {
            type: "text",
            text: `Drafted six fresh angles for **${productName}** — rendered on the right as the actual ad creatives, each built off the winning pattern (specificity + parent autonomy) and screened against your memory constraints (no outcome promises, no competitor name-checks). Edit any copy right on the card, ask me to revise an angle and I'll redraft it, and scrub each card's version history to compare drafts. Lock the ones you want in the test.`,
          },
          {
            type: "step-cta",
            label: "Approve these angles · build the test plan",
            helper: "I'll fold the locked angles into the time-phased A/B test plan.",
            refineHint:
              'or tell me which angle to revise — e.g. "make angle 2 less anxious"',
          },
        ],
      };

    /* ─── plan ────────────────────────────────────────────────── */
    case "scale-plan":
    case "opt-plan":
    case "ang-plan": {
      const intro =
        kind === "scale"
          ? "Execution plan's ready · 3 phases over 3 weeks. The actions for Week 1 are concrete; the later phases adapt based on what I observe. Guardrails are listed at the bottom — I enforce them without asking."
          : kind === "optimize"
            ? "Execution plan's ready · 3 phases over 3 weeks. Week 1 ships the small reversible fixes. Week 2 is the bigger swings. Week 3 is watch-mode + writing learnings to memory."
            : "Execution plan's ready · 3 phases over ~17 days — built around the angles you just approved. Week 1 launches the test. Week 2 prunes and doubles down. Week 3 promotes winners + writes the pattern to memory.";
      return {
        role: "spot",
        parts: [
          { type: "text", text: intro },
          {
            type: "step-cta",
            label: "Deploy agent · kick off Week 1",
            helper:
              "Once deployed, I'll execute Week 1 today and ping your dashboard at every decision point.",
            refineHint: "or tell me what to change before I start",
          },
        ],
      };
    }

    /* ─── live ────────────────────────────────────────────────── */
    case "scale-live":
    case "opt-live":
    case "ang-live":
      return {
        role: "spot",
        parts: [
          {
            type: "headline",
            text: `Plan live for ${productName}.`,
            verdict: "ok",
          },
          {
            type: "text",
            text: "Week 1 actions are running. You'll see me ping your dashboard at the next decision date with what to approve. Anything I need *before* that, I'll surface here.",
          },
        ],
      };

    /* ─── done (terminal, shared) ─────────────────────────────── */
    case "done":
      return {
        role: "spot",
        parts: [
          { type: "headline", text: `${productName} · plan complete.`, verdict: "ok" },
          {
            type: "text",
            text: "Final report's on your dashboard · learnings written to memory · next observation cycle queued.",
          },
        ],
      };

    default:
      return null;
  }
}

/* ────────────────────────────────────────────────────────────────
 * STEP ORDERING + LABELS + TOOL CALLS
 * ──────────────────────────────────────────────────────────────── */

export const SCALE_STEPS = [
  "scale-analyze",
  "scale-clarify",
  "scale-plan",
  "scale-live",
  "done",
] as const;
export const OPTIMIZE_STEPS = [
  "opt-analyze",
  "opt-clarify",
  "opt-plan",
  "opt-live",
  "done",
] as const;
export const ANGLES_STEPS = [
  "ang-analyze",
  "ang-clarify",
  // New: Spot generates a set of candidate angles from the brief and
  // the user iterates on them (AI-revise, Spot-mediated) before the
  // test plan gets built. This is the creative-iteration surface.
  "ang-creatives",
  "ang-plan",
  "ang-live",
  "done",
] as const;

export const EXTENDED_STEP_LABELS: Record<string, string> = {
  "scale-analyze": "Analysis",
  "scale-clarify": "Goals",
  "scale-plan": "Execution plan",
  "scale-live": "Running",
  "opt-analyze": "Analysis",
  "opt-clarify": "Goals",
  "opt-plan": "Execution plan",
  "opt-live": "Running",
  "ang-analyze": "Analysis",
  "ang-clarify": "Goals",
  "ang-creatives": "New angles",
  "ang-plan": "Execution plan",
  "ang-live": "Running",
};

/**
 * Tool-call narration per step transition. The clarify → plan
 * transition is the heavy one — it shows 5 parallel agents running.
 * (Only one tool-call is rendered at a time per the chat protocol,
 * but the detail string lists them so it reads as parallel work.)
 */
export const EXTENDED_TOOL_CALLS: Record<
  string,
  { agent: string; detail: string; delayMs: number }
> = {
  // Analyze — the big agentic step. 5 parallel agents reading recent
  // performance. Shown as parallel work in the detail string.
  "scale-analyze": {
    agent: "spot.analyze",
    detail:
      "memory.read · campaigns.scan · audience.headroom · personas.fetch · benchmarks.compare — running in parallel…",
    delayMs: 5400,
  },
  "opt-analyze": {
    agent: "spot.analyze",
    detail:
      "memory.read · campaigns.scan · root-cause.analyze · competitor.scan · sentiment.audit — running in parallel…",
    delayMs: 5400,
  },
  "ang-analyze": {
    agent: "spot.analyze",
    detail:
      "memory.read · creative.audit · pattern.synthesize · comment.scan · benchmarks.compare — running in parallel…",
    delayMs: 5400,
  },
  // Clarify → just a transition + setup ack.
  "scale-clarify": {
    agent: "spot.brief",
    detail: "framing the goal · narrowing the option space…",
    delayMs: 1800,
  },
  "opt-clarify": {
    agent: "spot.brief",
    detail: "framing the goal · narrowing the option space…",
    delayMs: 1800,
  },
  "ang-clarify": {
    agent: "spot.brief",
    detail: "framing the goal · narrowing the option space…",
    delayMs: 1800,
  },
  // Creatives — Spot generates the candidate angles from the brief.
  // The Creative Agent drafts each one grounded in the winning pattern
  // and screened against the product's memory constraints.
  "ang-creatives": {
    agent: "creative.generate",
    detail:
      "drafting fresh angles from the brief · grounding each in the winning pattern · screening against memory constraints…",
    delayMs: 4500,
  },
  // Plan — now a shorter recompute since most of the work happened at
  // analyze. Spot is just folding the user's picks in.
  "scale-plan": {
    agent: "spot.plan",
    detail:
      "folding your picks into the execution plan · sequencing phases · setting guardrails…",
    delayMs: 3600,
  },
  "opt-plan": {
    agent: "spot.plan",
    detail:
      "folding your picks into the plan · sequencing fixes by effort × impact · setting guardrails…",
    delayMs: 3600,
  },
  "ang-plan": {
    agent: "spot.plan",
    detail:
      "drafting 6 angles · sizing the A/B test · setting early-stop guardrails…",
    delayMs: 3600,
  },
  // Live — quick deploy ack.
  "scale-live": {
    agent: "deploy.push",
    detail: "staging Week 1 actions · setting watchers · queueing dashboard pings…",
    delayMs: 3400,
  },
  "opt-live": {
    agent: "deploy.push",
    detail: "pausing fatigued ad · briefing rewrites · queueing watchers…",
    delayMs: 3400,
  },
  "ang-live": {
    agent: "deploy.push",
    detail: "pushing 6 angles to Meta · setting traffic split · arming early-stop guard…",
    delayMs: 3400,
  },
};
