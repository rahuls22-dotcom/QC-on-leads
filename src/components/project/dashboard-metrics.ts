import type { ProjectDetail } from "@/lib/project-data";

/**
 * Dashboard metric & time-series synthesis at the **project level**.
 *
 * Operational/TOFU metrics like CPM, CPC, CTR — which only make sense at
 * the ad / ad-set / creative level — live in the Campaigns tab and the
 * persona winning-concept row. The Dashboard sticks to business outcomes:
 *
 *   · Outcomes — what the goal is measured against
 *   · Pipeline — funnel conversion + cost-per-outcome
 *   · Spend & pacing — burn, runway, days to goal
 *
 * Time-series is synthesized deterministically per (projectId, metricKey)
 * so refresh doesn't churn the chart.
 */

export type MetricKey =
  | "verified"
  | "qualified"
  | "cpvl"
  | "cpql"
  | "leads"
  | "cpl"
  | "verifRate"
  | "qualRate";

export type MetricCategory = "outcome" | "pipeline";

export type MetricDef = {
  key: MetricKey;
  label: string;
  unit: "currency" | "pct" | "raw" | "days";
  category: MetricCategory;
  /** Higher = better. CPL/CPVL/etc. flip to false. */
  higherIsBetter: boolean;
  /** Tooltip explaining the metric in plain English. */
  hint: string;
};

export const METRIC_DEFS: MetricDef[] = [
  // Outcomes — the goal-level numbers
  {
    key: "verified",
    label: "Verified leads",
    unit: "raw",
    category: "outcome",
    higherIsBetter: true,
    hint: "Leads that passed verification — your goal metric for most projects.",
  },
  {
    key: "qualified",
    label: "Qualified leads",
    unit: "raw",
    category: "outcome",
    higherIsBetter: true,
    hint: "Verified leads who also passed sales qualification.",
  },
  {
    key: "cpvl",
    label: "Cost per verified",
    unit: "currency",
    category: "outcome",
    higherIsBetter: false,
    hint: "Spend ÷ verified leads. Your true efficiency number.",
  },
  {
    key: "cpql",
    label: "Cost per qualified",
    unit: "currency",
    category: "outcome",
    higherIsBetter: false,
    hint: "Spend ÷ qualified leads. Sales-readiness efficiency.",
  },

  // Pipeline — business-level funnel (no impressions/CTR/CPM)
  {
    key: "leads",
    label: "Total leads",
    unit: "raw",
    category: "pipeline",
    higherIsBetter: true,
    hint: "All leads captured — before verification or qualification.",
  },
  {
    key: "cpl",
    label: "Cost per lead",
    unit: "currency",
    category: "pipeline",
    higherIsBetter: false,
    hint: "Spend ÷ total leads. Top-of-pipeline efficiency.",
  },
  {
    key: "verifRate",
    label: "Verification rate",
    unit: "pct",
    category: "pipeline",
    higherIsBetter: true,
    hint: "% of total leads that passed verification.",
  },
  {
    key: "qualRate",
    label: "Qualification rate",
    unit: "pct",
    category: "pipeline",
    higherIsBetter: true,
    hint: "% of verified leads that passed sales qualification.",
  },
];

/**
 * Total spend isn't a tile any more — it lives on the pacing strip at the
 * top of the Dashboard. Exposed as a separate helper for that strip.
 */
export function computeTotalSpend(project: ProjectDetail): number {
  return estimateSpend(project);
}

export const METRICS_BY_KEY = new Map(METRIC_DEFS.map((m) => [m.key, m]));

export type MetricSnapshot = {
  def: MetricDef;
  current: number | null;
  /** Avg over the previous 7 days vs the trailing 7 — sign + magnitude. */
  delta: { pct: number; sign: "up" | "down" | "flat" } | null;
  /** 14 points, oldest → newest. */
  series: number[];
};

/**
 * Compute every dashboard metric from a project's current state.
 */
export function computeMetrics(project: ProjectDetail): MetricSnapshot[] {
  const totalSpend = estimateSpend(project);
  const totalLeads =
    sumAdField(project, "leads") ||
    project.personas.reduce((s, p) => s + p.verifiedLeads * 2, 0);
  const totalVerified = project.goal.achieved;
  const totalQualified = Math.max(0, Math.round(totalVerified * 0.42));

  const cpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : null;
  const cpvl = totalVerified > 0 ? Math.round(totalSpend / totalVerified) : null;
  const cpql = totalQualified > 0 ? Math.round(totalSpend / totalQualified) : null;
  const verifRate = totalLeads > 0 ? (totalVerified / totalLeads) * 100 : null;
  const qualRate = totalVerified > 0 ? (totalQualified / totalVerified) * 100 : null;

  const currents: Record<MetricKey, number | null> = {
    verified: totalVerified,
    qualified: totalQualified,
    leads: totalLeads || null,
    cpl,
    cpvl,
    cpql,
    verifRate,
    qualRate,
  };

  return METRIC_DEFS.map((def) => {
    const current = currents[def.key];
    const series = synthesizeSeries(project.id, def, current);
    const delta = computeDelta(series);
    return { def, current, delta, series };
  });
}

function sumAdField(
  project: ProjectDetail,
  field: "spend" | "leads",
): number {
  let total = 0;
  for (const r of project.mediaPlan.rows) {
    for (const s of r.adSets) {
      for (const a of s.ads) {
        const v = a[field];
        if (typeof v === "number") total += v;
      }
    }
  }
  return total;
}

function estimateSpend(project: ProjectDetail): number {
  const fromAds = sumAdField(project, "spend");
  if (fromAds > 0) return fromAds;
  // Sum daily budgets × days elapsed for live campaigns.
  const dailyTotal = project.mediaPlan.rows
    .filter((r) => r.status === "live")
    .reduce((s, r) => s + r.budgetDaily, 0);
  const days = Math.max(1, project.goal.daysElapsed || 14);
  return dailyTotal * days;
}

/**
 * Deterministic 14-day series synthesis. Anchored so the *last* point
 * lands at the current value; earlier points trend slightly down to
 * give a credible up-and-to-the-right curve (or inverted for "lower
 * is better" metrics).
 */
function synthesizeSeries(
  projectId: string,
  def: MetricDef,
  current: number | null,
): number[] {
  if (current == null) return new Array(14).fill(0);
  const seed = hashString(`${projectId}:${def.key}`);
  const rng = mulberry32(seed);
  const points: number[] = [];
  const startFactor = def.higherIsBetter ? 0.65 : 1.35;
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const base = current * (startFactor + (1 - startFactor) * t);
    const jitter = (rng() - 0.5) * 0.18 * current;
    points.push(Math.max(0, base + jitter));
  }
  return points;
}

function computeDelta(series: number[]): MetricSnapshot["delta"] {
  if (series.length < 14) return null;
  const recent = avg(series.slice(7, 14));
  const prior = avg(series.slice(0, 7));
  if (prior === 0) return null;
  const pct = ((recent - prior) / prior) * 100;
  return {
    pct: Math.abs(pct),
    sign: Math.abs(pct) < 1 ? "flat" : pct > 0 ? "up" : "down",
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Formatters ─────────────────────────────────────────────────────────

export function formatMetric(value: number | null, unit: MetricDef["unit"]): string {
  if (value == null) return "—";
  if (unit === "currency") {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${Math.round(value)}`;
  }
  if (unit === "pct") {
    return `${value.toFixed(value < 10 ? 2 : 1)}%`;
  }
  if (unit === "days") {
    if (value === 0) return "Met";
    if (value >= 999) return "—";
    return `${Math.round(value)} d`;
  }
  // raw
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function formatDelta(d: MetricSnapshot["delta"]): string {
  if (!d) return "—";
  if (d.sign === "flat") return "flat vs last 7d";
  const arrow = d.sign === "up" ? "↑" : "↓";
  return `${arrow} ${d.pct.toFixed(1)}% vs last 7d`;
}

export function deltaColor(
  d: MetricSnapshot["delta"],
  higherIsBetter: boolean,
): string {
  if (!d || d.sign === "flat") return "var(--text-tertiary)";
  const goodDirection = higherIsBetter ? "up" : "down";
  return d.sign === goodDirection ? "var(--ok-fg)" : "var(--err-fg)";
}
