/**
 * Schema produced by the campaign-diagnosis prompt and consumed by the
 * Campaign Detail page. The orchestrator AI returns ONE object of this shape
 * (no prose, no markdown) which the dashboard renders directly.
 *
 * Do not add fields here without updating the prompt in
 * docs/ai-prompt-campaign-diagnosis.md and docs/ai-system-prompt.md.
 */

export type Verdict =
  | "LEARNING"
  | "ON_TRACK"
  | "SCALE_WINNER"
  | "NEAR_TARGET"
  | "OFF_TARGET"
  | "CRITICAL"
  | "URGENT"
  | "REFRESH";

export type ActionVerb =
  | "WAIT"
  | "CONTINUE"
  | "SCALE"
  | "OPTIMIZE"
  | "INTERVENE"
  | "URGENT"
  | "REFRESH"
  | "ADD_ADSET"
  | "PAUSE"
  | "SHIFT_BUDGET"
  | "ADD_CREATIVE";

export type ActionColor = "gray" | "green" | "amber" | "red";

export type AdsetStance = "scale" | "hold" | "reduce" | "pause";

export interface StatusStripData {
  verdict: Verdict;
  /** 5–10 words. e.g. "Near Target — projecting 250 of 300 leads". */
  headline: string;
  days_live: number;
  days_total: number;
  /** Free-form summary, e.g. "143 / 300 leads · projecting 250 (-17%)". */
  primary_metric_summary: string;
}

export interface NextBestAction {
  id: string; // "nba-1"
  verb: ActionVerb;
  color: ActionColor;
  /** Verb + object, e.g. "Pause Broad Bangalore — 25-55". */
  headline: string;
  /** One line citing 2–3 actual numbers from the input. */
  reason: string;
  /** Always in goal units (leads / verified / qualified). */
  expected_impact: string;
  /** Button text. */
  cta_label: string;
  /** Adset / ad / campaign name, or null when no concrete target. */
  target_entity: string | null;
  /** When the action redeploys budget, name the recipient. */
  redeploy_to: string | null;
  /** Diagnosis bullet IDs that motivate this action. */
  why_action_ids: string[];
}

export interface GoalProgress {
  actual: number;
  goal: number;
  projected: number;
  gap_pct: number;
  on_track: boolean;
}

export type FunnelGoal = GoalProgress | "no_bofu_data" | null;

export interface GoalTrackerData {
  leads: GoalProgress;
  verified: FunnelGoal;
  qualified: FunnelGoal;
  budget: { spent: number; total: number; burn_pct: number };
  time: { elapsed: number; total: number; burn_pct: number };
  /** > 1 means burning faster than time elapsing. */
  pacing_index: number;
  required_cpl: number;
  current_cpl: number;
  /** required - current; negative means overspending vs target CPL. */
  headroom_cpl: number;
}

export interface AdsetAllocation {
  name: string;
  spend_share_pct: number;
  lead_share_pct: number;
  qualified_share_pct: number | null;
  /** lead_share / spend_share — > 1 punches above its weight. */
  efficiency_ratio: number;
  stance: AdsetStance;
}

export interface TopMove {
  from_adset: string;
  to_adset: string;
  amount: number;
  recoverable_leads: number;
  /** Percent of the lead/qualified gap closed. Null when there's no gap. */
  gap_close_pct: number | null;
  /** Pre-formatted headline for inline display. */
  headline: string;
}

export interface BudgetAllocationData {
  adsets: AdsetAllocation[];
  top_move: TopMove | null;
}

export interface SecondaryAction {
  id: string;
  verb: ActionVerb;
  headline: string;
  reason: string;
  expected: string;
  cta_label: string;
  target_entity?: string | null;
}

export interface DiagnosisBullet {
  id: string;
  /** Sentence with two real numbers from the input. */
  bullet: string;
  /** Chip text for the relevant funnel stage, or null when not applicable. */
  tof: string | null;
  mof: string | null;
  bof: string | null;
  /** ID of the action this bullet motivates (links visually). */
  drives_action_id: string | null;
}

export interface DiagnosisPayload {
  status_strip: StatusStripData;
  next_best_action: NextBestAction;
  goal_tracker: GoalTrackerData;
  budget_allocation: BudgetAllocationData;
  more_actions: SecondaryAction[];
  diagnosis: DiagnosisBullet[];
}
