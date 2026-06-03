/**
 * Mock diagnosis payload for the Campaign Detail page (camp-7 / Godrej Air Phase 3).
 * Shape matches docs/ai-prompt-campaign-diagnosis.md → docs/ai-system-prompt.md.
 *
 * Numbers are intentionally chosen to surface a realistic OFF_TARGET state with
 * a clear reallocation move (Pause Broad Bangalore → Whitefield HNI), so the
 * dashboard has visible variety: a verdict pill, an actionable NBA, a partially-
 * trailing goal tracker, and 4 diagnosis bullets each linked to an action.
 */

import type { DiagnosisPayload } from "./types/diagnosis-payload";

export const campaignDiagnosisPayload: DiagnosisPayload = {
  status_strip: {
    verdict: "OFF_TARGET",
    headline: "Off Target — projecting 215 of 300 leads",
    days_live: 14,
    days_total: 30,
    primary_metric_summary: "143 / 300 leads · projecting 215 (-28%)",
  },

  next_best_action: {
    id: "nba-1",
    verb: "INTERVENE",
    color: "amber",
    headline: "Pause Broad Bangalore — 25-55, redeploy ₹25K to Whitefield HNI",
    reason:
      "Broad Bangalore burned ₹63K for 0 qualified leads (CTR 0.9%, verify 11%). Whitefield HNI is delivering at ₹6,786 CPQL — half the campaign average.",
    expected_impact:
      "Recovers ~22 qualified leads · closes 88% of the qualified-lead gap (22 of 25)",
    cta_label: "Apply reallocation",
    target_entity: "Broad Bangalore — 25-55",
    redeploy_to: "Whitefield HNI — 30-45",
    why_action_ids: ["diag-1", "diag-2"],
  },

  goal_tracker: {
    leads: {
      actual: 143,
      goal: 300,
      projected: 215,
      gap_pct: -28.3,
      on_track: false,
    },
    verified: {
      actual: 32,
      goal: 90,
      projected: 48,
      gap_pct: -46.7,
      on_track: false,
    },
    qualified: {
      actual: 16,
      goal: 50,
      projected: 25,
      gap_pct: -50.0,
      on_track: false,
    },
    budget: {
      spent: 220000,
      total: 360000,
      burn_pct: 61.1,
    },
    time: {
      elapsed: 14,
      total: 30,
      burn_pct: 46.7,
    },
    pacing_index: 1.31,
    required_cpl: 1200,
    current_cpl: 1538,
    headroom_cpl: -338,
  },

  budget_allocation: {
    adsets: [
      {
        name: "Whitefield HNI — 30-45",
        spend_share_pct: 43.2,
        lead_share_pct: 50.3,
        qualified_share_pct: 87.5,
        efficiency_ratio: 1.16,
        stance: "scale",
      },
      {
        name: "Sarjapur IT Corridor",
        spend_share_pct: 28.2,
        lead_share_pct: 40.6,
        qualified_share_pct: 12.5,
        efficiency_ratio: 1.44,
        stance: "hold",
      },
      {
        name: "Broad Bangalore — 25-55",
        spend_share_pct: 28.6,
        lead_share_pct: 9.1,
        qualified_share_pct: 0,
        efficiency_ratio: 0.32,
        stance: "pause",
      },
    ],
    top_move: {
      from_adset: "Broad Bangalore — 25-55",
      to_adset: "Whitefield HNI — 30-45",
      amount: 25000,
      recoverable_leads: 22,
      gap_close_pct: 88,
      headline:
        "Pause Broad Bangalore (₹25K) → Whitefield HNI · recovers 22 qualified · closes 88% of gap",
    },
  },

  more_actions: [
    {
      id: "act-2",
      verb: "PAUSE",
      headline: "Pause 'Floor Plan Static' creative",
      reason: "CTR 0.8% (-40% in 7 days), 0 of 6 leads from this creative verified.",
      expected: "Frees ~₹4K/day to reinvest into Lifestyle Video.",
      cta_label: "Pause creative",
      target_entity: "Floor Plan Static",
    },
    {
      id: "act-3",
      verb: "REFRESH",
      headline: "Add a creative variant for Whitefield HNI",
      reason: "Frequency climbed to 3.18 over 7 days; CTR drifting from 2.8% → 2.4%.",
      expected: "Restores CTR to ~2.8%, lowers CPL by ~₹150 across the adset.",
      cta_label: "Add creative",
      target_entity: "Whitefield HNI — 30-45",
    },
    {
      id: "act-4",
      verb: "ADD_ADSET",
      headline: "Add Sarjapur Road as a separate adset",
      reason:
        "Sarjapur leads verify at 24% (vs 16% project avg) but no dedicated targeting exists.",
      expected: "+8-12 verified leads/week at projected CPVL ₹3,800.",
      cta_label: "Create adset",
      target_entity: null,
    },
  ],

  diagnosis: [
    {
      id: "diag-1",
      bullet:
        "Broad Bangalore is the project's biggest leak — 28.6% of spend produces 0 qualified leads.",
      tof: "CTR 0.9% vs 2.4% top adset",
      mof: "Verify rate 11% vs 31%",
      bof: "0 qualified · 0 site visits",
      drives_action_id: "nba-1",
    },
    {
      id: "diag-2",
      bullet:
        "Whitefield HNI is your growth lever — 87.5% of qualified leads from 43% of spend.",
      tof: "CTR 2.4% (project leader)",
      mof: "Verify rate 31%",
      bof: "14 qualified · 4 site visits",
      drives_action_id: "nba-1",
    },
    {
      id: "diag-3",
      bullet:
        "Pacing index 1.31 — at this burn rate, budget exhausts on day 25 of 30.",
      tof: "Daily spend ₹15.7K vs ₹12K planned",
      mof: null,
      bof: null,
      drives_action_id: "nba-1",
    },
    {
      id: "diag-4",
      bullet:
        "Form bracket 'Below ₹1Cr' is bringing 27% of leads but qualifies at 0%.",
      tof: null,
      mof: "50 leads in this bracket",
      bof: "0 qualified · top DQ reason: 'Budget' (52%)",
      drives_action_id: "act-4",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  UI helpers — keep verdict/color logic colocated with the data so   */
/*  components can stay presentation-only.                             */
/* ------------------------------------------------------------------ */

import type { Verdict, ActionColor } from "./types/diagnosis-payload";

interface VerdictStyle {
  label: string;
  pillBg: string;
  pillText: string;
  banner: string;
  bannerBorder: string;
  bannerText: string;
}

export const verdictStyles: Record<Verdict, VerdictStyle> = {
  LEARNING: {
    label: "Learning",
    pillBg: "bg-surface-secondary",
    pillText: "text-text-secondary",
    banner: "bg-surface-page",
    bannerBorder: "border-border",
    bannerText: "text-text-secondary",
  },
  ON_TRACK: {
    label: "On Track",
    pillBg: "bg-[#DCFCE7]",
    pillText: "text-[#15803D]",
    banner: "bg-[#F0FDF4]",
    bannerBorder: "border-[#BBF7D0]",
    bannerText: "text-[#15803D]",
  },
  SCALE_WINNER: {
    label: "Scale Winner",
    pillBg: "bg-[#DCFCE7]",
    pillText: "text-[#15803D]",
    banner: "bg-[#F0FDF4]",
    bannerBorder: "border-[#BBF7D0]",
    bannerText: "text-[#15803D]",
  },
  NEAR_TARGET: {
    label: "Near Target",
    pillBg: "bg-[#FEF9C3]",
    pillText: "text-[#854D0E]",
    banner: "bg-[#FEFCE8]",
    bannerBorder: "border-[#FDE68A]",
    bannerText: "text-[#854D0E]",
  },
  OFF_TARGET: {
    label: "Off Target",
    pillBg: "bg-[#FEF3C7]",
    pillText: "text-[#92400E]",
    banner: "bg-[#FFFBEB]",
    bannerBorder: "border-[#FDE68A]",
    bannerText: "text-[#92400E]",
  },
  REFRESH: {
    label: "Refresh Needed",
    pillBg: "bg-[#DBEAFE]",
    pillText: "text-[#1E40AF]",
    banner: "bg-[#EFF6FF]",
    bannerBorder: "border-[#BFDBFE]",
    bannerText: "text-[#1E40AF]",
  },
  CRITICAL: {
    label: "Critical",
    pillBg: "bg-[#FED7AA]",
    pillText: "text-[#9A3412]",
    banner: "bg-[#FFF7ED]",
    bannerBorder: "border-[#FED7AA]",
    bannerText: "text-[#9A3412]",
  },
  URGENT: {
    label: "Urgent",
    pillBg: "bg-[#FEE2E2]",
    pillText: "text-[#B91C1C]",
    banner: "bg-[#FEF2F2]",
    bannerBorder: "border-[#FECACA]",
    bannerText: "text-[#B91C1C]",
  },
};

interface ActionColorStyle {
  badgeBg: string;
  badgeText: string;
  cardBg: string;
  cardBorder: string;
  ctaBg: string;
  ctaHover: string;
}

export const actionColorStyles: Record<ActionColor, ActionColorStyle> = {
  gray: {
    badgeBg: "bg-surface-secondary",
    badgeText: "text-text-secondary",
    cardBg: "bg-white",
    cardBorder: "border-border",
    ctaBg: "bg-text-primary",
    ctaHover: "hover:bg-black",
  },
  green: {
    badgeBg: "bg-[#DCFCE7]",
    badgeText: "text-[#15803D]",
    cardBg: "bg-[#F0FDF4]",
    cardBorder: "border-[#BBF7D0]",
    ctaBg: "bg-[#15803D]",
    ctaHover: "hover:bg-[#166534]",
  },
  amber: {
    badgeBg: "bg-[#FEF3C7]",
    badgeText: "text-[#92400E]",
    cardBg: "bg-[#FFFBEB]",
    cardBorder: "border-[#FDE68A]",
    ctaBg: "bg-[#B45309]",
    ctaHover: "hover:bg-[#92400E]",
  },
  red: {
    badgeBg: "bg-[#FEE2E2]",
    badgeText: "text-[#B91C1C]",
    cardBg: "bg-[#FEF2F2]",
    cardBorder: "border-[#FECACA]",
    ctaBg: "bg-[#DC2626]",
    ctaHover: "hover:bg-[#B91C1C]",
  },
};

interface StanceStyle {
  label: string;
  cls: string;
}

export const stanceStyles: Record<
  "scale" | "hold" | "reduce" | "pause",
  StanceStyle
> = {
  scale: { label: "Scale", cls: "bg-[#DCFCE7] text-[#15803D]" },
  hold: { label: "Hold", cls: "bg-surface-secondary text-text-secondary" },
  reduce: { label: "Reduce", cls: "bg-[#FEF3C7] text-[#92400E]" },
  pause: { label: "Pause", cls: "bg-[#FEE2E2] text-[#B91C1C]" },
};

/** Format integer as Indian Rupees with comma grouping (₹1,25,000). */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Compact Rupee formatting: ₹6.8L / ₹1.2Cr / ₹14,200. */
export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return formatINR(amount);
}
