// Shared campaign rollup — the canonical per-set aggregation used by BOTH the
// Campaigns page (top stat cards) and the Project (= Product) detail page, so
// the numbers can never disagree. Pure functions, no React.
//
// Lifted verbatim from the campaigns-page `rollup` useMemo, then extended with
// CPVL + verification/qualification rates (which the project metric grid needs
// but the campaigns page didn't surface).

import {
  edTechCampaigns,
  type EdTechCampaign,
  type EdTechMetrics,
  type EdTechMetricDeltas,
} from "./campaigns-edtech";

export type CampaignRollup = {
  spend: number;
  leads: number;
  verified: number;
  qualified: number;
  /** ₹ blended cost per lead / verified / qualified. 0 when denom is 0. */
  blendedCpl: number;
  blendedCpvl: number;
  blendedCpql: number;
  /** % of leads that verified / qualified. 0 when leads is 0. */
  verificationRate: number;
  qualificationRate: number;
  activeCampaigns: number;
  // Weighted deltas (same formulas as the campaigns page).
  spendDelta: number;
  leadsDelta: number;
  verifiedDelta: number;
  qualifiedDelta: number;
  blendedCplDelta: number;
  blendedCpvlDelta: number;
  blendedCpqlDelta: number;
};

/** Every campaign tied to a product (mirrors the campaigns-page filter). */
export function campaignsForProduct(productId: string): EdTechCampaign[] {
  return edTechCampaigns.filter((c) => c.productId === productId);
}

export function rollupCampaigns(campaigns: EdTechCampaign[]): CampaignRollup {
  const sumMetric = (k: keyof EdTechMetrics) =>
    campaigns.reduce((s, c) => s + (c.metrics[k] as number), 0);

  // sum(value · delta) / sum(value) — value-weighted blended delta.
  const weightedDelta = (
    k: keyof EdTechMetricDeltas,
    valueKey: keyof EdTechMetrics,
  ) => {
    const total = sumMetric(valueKey);
    if (!total) return 0;
    const weighted =
      campaigns.reduce(
        (s, c) => s + (c.metrics[valueKey] as number) * c.deltas[k].pct,
        0,
      ) / total;
    return +weighted.toFixed(1);
  };

  const spend = sumMetric("spend");
  const leads = sumMetric("leads");
  const verified = sumMetric("verified");
  const qualified = sumMetric("qualified");

  const blendedCpl = leads ? Math.round(spend / leads) : 0;
  const blendedCpvl = verified ? Math.round(spend / verified) : 0;
  const blendedCpql = qualified ? Math.round(spend / qualified) : 0;

  const verificationRate = leads ? +((verified / leads) * 100).toFixed(1) : 0;
  const qualificationRate = leads ? +((qualified / leads) * 100).toFixed(1) : 0;

  const spendDelta = weightedDelta("spend", "spend");
  const leadsDelta = weightedDelta("leads", "leads");
  const verifiedDelta = weightedDelta("verified", "verified");
  const qualifiedDelta = weightedDelta("qualified", "qualified");

  // Cost delta ≈ spend% − volume% (rough but directionally right; we lack
  // prior-period absolutes).
  const blendedCplDelta = +((spendDelta - leadsDelta) || 0).toFixed(1);
  const blendedCpvlDelta = +((spendDelta - verifiedDelta) || 0).toFixed(1);
  const blendedCpqlDelta = +((spendDelta - qualifiedDelta) || 0).toFixed(1);

  const activeCampaigns = campaigns.filter((c) => c.status === "enabled").length;

  return {
    spend,
    leads,
    verified,
    qualified,
    blendedCpl,
    blendedCpvl,
    blendedCpql,
    verificationRate,
    qualificationRate,
    activeCampaigns,
    spendDelta,
    leadsDelta,
    verifiedDelta,
    qualifiedDelta,
    blendedCplDelta,
    blendedCpvlDelta,
    blendedCpqlDelta,
  };
}
