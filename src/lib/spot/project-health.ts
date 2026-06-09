// Project (= product) health — derived, not stored.
//
// Spec: docs/project-health.md. A project's health is the worst-dominates
// roll-up of its live campaigns' Spot's-takes (see campaign-health.ts). One
// at-risk campaign drags the whole project to At-risk; this mirrors how a
// growth lead actually reads a portfolio — the weakest live line item is what
// needs attention.

import { campaignsForProduct } from "../campaigns-edtech-rollup";
import { computeSpotTake } from "./campaign-health";

export type ProjectHealthState =
  | "on-track"
  | "needs-attention"
  | "underperforming"
  | "stabilizing";

export type ProjectHealth = {
  state: ProjectHealthState;
  label: string;
  /** Tailwind pill class. */
  tone: string;
  /** One-line reason. */
  driver: string;
};

const PRESENT: Record<ProjectHealthState, { label: string; tone: string }> = {
  "on-track": { label: "On track", tone: "pill-ok" },
  "needs-attention": { label: "Attention", tone: "pill-warn" },
  underperforming: { label: "At risk", tone: "pill-err" },
  stabilizing: { label: "Stabilizing", tone: "pill" },
};

export function projectHealth(productId: string): ProjectHealth {
  const live = campaignsForProduct(productId).filter((c) => c.status === "enabled");

  if (live.length === 0) {
    return {
      state: "stabilizing",
      ...PRESENT.stabilizing,
      driver: "No live campaigns yet.",
    };
  }

  const takes = live.map((c) => ({ c, verdict: computeSpotTake(c).verdict }));
  const atRisk = takes.filter((t) => t.verdict === "at-risk");
  const watch = takes.filter((t) => t.verdict === "watch");
  const healthy = takes.filter((t) => t.verdict === "healthy");

  // Worst-dominates.
  if (atRisk.length) {
    return {
      state: "underperforming",
      ...PRESENT.underperforming,
      driver:
        atRisk.length === 1
          ? `${atRisk[0].c.name} is at-risk.`
          : `${atRisk.length} campaigns at-risk — start with ${atRisk[0].c.name}.`,
    };
  }
  if (watch.length) {
    return {
      state: "needs-attention",
      ...PRESENT["needs-attention"],
      driver: `${watch.length} campaign${watch.length === 1 ? "" : "s"} on watch.`,
    };
  }
  if (healthy.length) {
    return {
      state: "on-track",
      ...PRESENT["on-track"],
      driver: `${healthy.length} healthy · nothing flagged.`,
    };
  }
  // Everything live is still stabilizing (below the lead sample gate).
  return {
    state: "stabilizing",
    ...PRESENT.stabilizing,
    driver: "Live campaigns still gathering signal.",
  };
}
