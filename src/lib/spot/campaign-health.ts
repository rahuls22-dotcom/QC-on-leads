// Campaign health — "Spot's take" logic.
//
// The canonical spec lives in docs/campaign-health.md (and the skill at
// .claude/skills/campaign-health/SKILL.md). This module is the runtime
// implementation the Campaigns table reads from.
//
// Principle: a single "health %" is fake precision. Instead we compute a
// few explainable signals, gate on sample size, and let the WORST real
// signal drive a 4-state verdict. Every verdict carries its driver — it's
// never a black box.
//
//   Stabilizing → below the sample gate, don't judge noise
//   Healthy     → all signals green
//   Watch       → exactly one amber, no red
//   At-risk     → any red, or two-or-more amber
//
// Where does the per-campaign target come from? The execution plan that
// launched the campaign sets a target CPL; absent that, we fall back to a
// product-level benchmark (PRODUCT_BENCHMARK below). See docs for detail.

import type { EdTechCampaign, EdTechMetrics, EdTechMetricDeltas } from "../campaigns-edtech";

export type HealthVerdict = "healthy" | "watch" | "at-risk" | "stabilizing";
export type SignalLevel = "green" | "amber" | "red";

export type HealthSignal = {
  key: "efficiency" | "quality" | "fatigue" | "momentum";
  label: string;
  level: SignalLevel;
  /** Human-readable "why" for this signal. */
  detail: string;
};

export type SpotTake = {
  verdict: HealthVerdict;
  /** The single signal that drove the verdict — shown next to the badge. */
  driver: string;
  signals: HealthSignal[];
};

/* ── Targets & benchmarks ──────────────────────────────────────── */

// Per-product benchmark — the fallback target when a campaign isn't tied
// to an execution-plan target. targetCpl = what "good" costs (₹/lead);
// qualBenchmark = the qualification rate (in PERCENT, matching the campaign
// data) we expect a healthy campaign to clear.
export const PRODUCT_BENCHMARK: Record<string, { targetCpl: number; qualBenchmark: number }> = {
  "prod-guyjus-jee": { targetCpl: 320, qualBenchmark: 11 },
  "prod-guyjus-neet": { targetCpl: 300, qualBenchmark: 12 },
  "prod-guyjus-foundation": { targetCpl: 280, qualBenchmark: 9 },
  "prod-guyjus-spoken-english": { targetCpl: 300, qualBenchmark: 10 },
};

const DEFAULT_BENCHMARK = { targetCpl: 320, qualBenchmark: 10 };

export function benchmarkFor(productId: string) {
  return PRODUCT_BENCHMARK[productId] ?? DEFAULT_BENCHMARK;
}

// Below this many leads, a verdict is noise — show "Stabilizing" instead.
export const SAMPLE_GATE_LEADS = 50;

/* ── Signal computation ────────────────────────────────────────── */

function efficiencySignal(m: EdTechMetrics, targetCpl: number): HealthSignal {
  const ratio = m.cpl / targetCpl;
  let level: SignalLevel = "green";
  if (ratio > 1.5) level = "red";
  else if (ratio > 1.0) level = "amber";
  return {
    key: "efficiency",
    label: "Efficiency",
    level,
    detail:
      level === "green"
        ? `CPL ₹${m.cpl} at or under target ₹${targetCpl}`
        : `CPL ₹${m.cpl} is ${ratio.toFixed(1)}× target ₹${targetCpl}`,
  };
}

// qualificationRate is stored in percent units (e.g. 9.5 = 9.5%), as is the
// benchmark — compare them directly.
function qualitySignal(m: EdTechMetrics, qualBenchmark: number): HealthSignal {
  const ratio = m.qualificationRate / qualBenchmark;
  let level: SignalLevel = "green";
  if (ratio < 0.7) level = "red";
  else if (ratio < 1.0) level = "amber";
  return {
    key: "quality",
    label: "Quality",
    level,
    detail:
      level === "green"
        ? `Qual rate ${m.qualificationRate.toFixed(1)}% at or above benchmark ${qualBenchmark}%`
        : `Qual rate ${m.qualificationRate.toFixed(1)}% vs benchmark ${qualBenchmark}%`,
  };
}

// Fatigue — without an impression-frequency field we read the CTR trend as
// the fatigue proxy (a sharp CTR drop = creative wearing out), backed by
// the absolute CTR floor.
function fatigueSignal(m: EdTechMetrics, d: EdTechMetricDeltas): HealthSignal {
  const ctrTrend = d.ctr.pct; // negative = CTR falling
  let level: SignalLevel = "green";
  if (ctrTrend <= -25 || m.ctr < 0.6) level = "red";
  else if (ctrTrend <= -12 || m.ctr < 0.9) level = "amber";
  return {
    key: "fatigue",
    label: "Fatigue",
    level,
    detail:
      level === "green"
        ? `CTR ${m.ctr}% holding`
        : ctrTrend < 0
          ? `CTR ${m.ctr}% · down ${Math.abs(ctrTrend).toFixed(0)}% — creative tiring`
          : `CTR ${m.ctr}% is low`,
  };
}

// Momentum — leads trend as a delivery-health proxy (no budget-pacing field
// available). A steep lead drop means the campaign is choking.
function momentumSignal(d: EdTechMetricDeltas): HealthSignal {
  const leadsTrend = d.leads.pct;
  let level: SignalLevel = "green";
  if (leadsTrend <= -30) level = "red";
  else if (leadsTrend <= -12) level = "amber";
  return {
    key: "momentum",
    label: "Momentum",
    level,
    detail:
      level === "green"
        ? `Leads ${leadsTrend >= 0 ? "+" : ""}${leadsTrend.toFixed(0)}% — delivering`
        : `Leads down ${Math.abs(leadsTrend).toFixed(0)}% — delivery slipping`,
  };
}

/* ── Roll-up: worst-signal-dominates, sample-gated ─────────────── */

const LEVEL_RANK: Record<SignalLevel, number> = { green: 0, amber: 1, red: 2 };

export function computeSpotTake(c: EdTechCampaign): SpotTake {
  const { targetCpl, qualBenchmark } = benchmarkFor(c.productId);

  // Sample gate — too few leads to judge.
  if (c.metrics.leads < SAMPLE_GATE_LEADS) {
    return {
      verdict: "stabilizing",
      driver: `Only ${c.metrics.leads} leads — gathering signal`,
      signals: [],
    };
  }

  const signals: HealthSignal[] = [
    efficiencySignal(c.metrics, targetCpl),
    qualitySignal(c.metrics, qualBenchmark),
    fatigueSignal(c.metrics, c.deltas),
    momentumSignal(c.deltas),
  ];

  const reds = signals.filter((s) => s.level === "red");
  const ambers = signals.filter((s) => s.level === "amber");

  let verdict: HealthVerdict;
  if (reds.length >= 1 || ambers.length >= 2) verdict = "at-risk";
  else if (ambers.length === 1) verdict = "watch";
  else verdict = "healthy";

  // Driver = worst signal (reds first, then ambers, then the best green).
  const worst = [...signals].sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])[0];
  const driver =
    verdict === "healthy"
      ? "All signals green — leave it running"
      : worst.detail;

  return { verdict, driver, signals };
}

/* ── Display helpers ───────────────────────────────────────────── */

export const VERDICT_LABEL: Record<HealthVerdict, string> = {
  healthy: "Healthy",
  watch: "Watch",
  "at-risk": "At-risk",
  stabilizing: "Stabilizing",
};

export const VERDICT_TONE: Record<
  HealthVerdict,
  { bg: string; text: string; dot: string }
> = {
  healthy: { bg: "#ECFDF3", text: "#15803D", dot: "#22C55E" },
  watch: { bg: "#FEFCE8", text: "#92740E", dot: "#CA8A04" },
  "at-risk": { bg: "#FEF2F2", text: "#B91C1C", dot: "#EF4444" },
  stabilizing: { bg: "#F4F4F2", text: "#6B6B63", dot: "#9CA3AF" },
};
