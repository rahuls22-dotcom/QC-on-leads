// EdTech (Guyju's)-themed campaign mock — the data the new Campaigns
// dashboard reads from. Existing campaign-data.ts is real-estate themed
// and is still referenced by legacy pages (single-campaign detail, leads,
// etc); we keep that intact and side-step it with a smaller, dense
// dataset purpose-built for the dashboard rebuild.
//
// Shape priorities:
//   · Every numeric metric has a trend delta so we can show ↑/↓ arrows.
//   · Each row carries the parent product so the product filter can
//     scope the table.
//   · Each row carries a `metaUrl` so the inline "Open in Meta" link
//     can deep-link without a separate Actions column.

export type EdTechCampaignStatus = "enabled" | "paused" | "draft";
export type EdTechHealth = "on-track" | "needs-attention" | "underperforming";

/**
 * Trend deltas — % change vs the prior equivalent window. Positive
 * doesn't always mean "good" (CPL going up is bad); the renderer
 * inverts the colour for cost metrics.
 */
export type TrendDelta = {
  /** % change. Display as ↑ X% / ↓ X%. */
  pct: number;
  /** True for cost metrics where down is good — inverts colour. */
  invert?: boolean;
};

export type EdTechMetrics = {
  spend: number;
  impressions: number;
  cpm: number;
  ctr: number;
  cpc: number;
  leads: number;
  cpl: number;
  verified: number;
  verificationRate: number;
  qualified: number;
  qualificationRate: number;
  costPerQualified: number;
};

/** Same shape, % deltas vs prior period. */
export type EdTechMetricDeltas = {
  spend: TrendDelta;
  cpm: TrendDelta;
  ctr: TrendDelta;
  leads: TrendDelta;
  cpl: TrendDelta;
  qualificationRate: TrendDelta;
  costPerQualified: TrendDelta;
};

export type EdTechAd = {
  id: string;
  name: string;
  format: "1:1" | "4:5" | "9:16" | "16:9";
  kind: "image" | "video" | "carousel" | "search";
  status: EdTechCampaignStatus;
  metrics: EdTechMetrics;
  deltas: EdTechMetricDeltas;
  metaUrl: string;
};

export type EdTechAdSet = {
  id: string;
  name: string;
  status: EdTechCampaignStatus;
  metrics: EdTechMetrics;
  deltas: EdTechMetricDeltas;
  metaUrl: string;
  ads: EdTechAd[];
};

export type EdTechCampaign = {
  id: string;
  name: string;
  /** Maps to a product id in PRODUCTS. */
  productId: string;
  productName: string;
  channel: "Meta" | "Google";
  objective: "Lead Gen" | "Retargeting" | "Lookalike" | "Search" | "Discover";
  status: EdTechCampaignStatus;
  health: EdTechHealth;
  metrics: EdTechMetrics;
  deltas: EdTechMetricDeltas;
  metaUrl: string;
  adsets: EdTechAdSet[];
};

/* ─── Helpers to build child rows that roll up roughly correctly ─── */

function splitMetrics(parent: EdTechMetrics, share: number): EdTechMetrics {
  return {
    spend: Math.round(parent.spend * share),
    impressions: Math.round(parent.impressions * share),
    cpm: parent.cpm,
    ctr: +(parent.ctr * (0.9 + Math.random() * 0.2)).toFixed(2),
    cpc: parent.cpc,
    leads: Math.round(parent.leads * share),
    cpl: parent.cpl,
    verified: Math.round(parent.verified * share),
    verificationRate: parent.verificationRate,
    qualified: Math.round(parent.qualified * share),
    qualificationRate: parent.qualificationRate,
    costPerQualified: parent.costPerQualified,
  };
}

function jitterDeltas(d: EdTechMetricDeltas): EdTechMetricDeltas {
  const j = (pct: number) => +(pct + (Math.random() - 0.5) * 4).toFixed(1);
  return {
    spend: { pct: j(d.spend.pct) },
    cpm: { pct: j(d.cpm.pct), invert: true },
    ctr: { pct: j(d.ctr.pct) },
    leads: { pct: j(d.leads.pct) },
    cpl: { pct: j(d.cpl.pct), invert: true },
    qualificationRate: { pct: j(d.qualificationRate.pct) },
    costPerQualified: { pct: j(d.costPerQualified.pct), invert: true },
  };
}

/* ─── The data ────────────────────────────────────────────────────── */

export const edTechCampaigns: EdTechCampaign[] = [
  // ── Guyju's JEE Crack — healthy product, 4 active campaigns
  {
    id: "etc-jee-tofu",
    name: "JEE Crack · TOFU · Mentor-led hook",
    productId: "prod-guyjus-jee",
    productName: "Guyju's JEE Crack",
    channel: "Meta",
    objective: "Lead Gen",
    status: "enabled",
    health: "on-track",
    metaUrl: "https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=etc-jee-tofu",
    metrics: {
      spend: 218000, impressions: 1820000, cpm: 120, ctr: 1.92, cpc: 6.25,
      leads: 612, cpl: 356, verified: 198, verificationRate: 32.4,
      qualified: 84, qualificationRate: 13.7, costPerQualified: 2595,
    },
    deltas: {
      spend: { pct: 12.4 }, cpm: { pct: -3.1, invert: true }, ctr: { pct: 8.6 },
      leads: { pct: 18.2 }, cpl: { pct: -5.4, invert: true },
      qualificationRate: { pct: 4.8 }, costPerQualified: { pct: -9.8, invert: true },
    },
    adsets: [],
  },
  {
    id: "etc-jee-lal",
    name: "JEE Crack · LAL · Class 11 parents",
    productId: "prod-guyjus-jee",
    productName: "Guyju's JEE Crack",
    channel: "Meta",
    objective: "Lookalike",
    status: "enabled",
    health: "on-track",
    metaUrl: "https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=etc-jee-lal",
    metrics: {
      spend: 184000, impressions: 1480000, cpm: 124, ctr: 2.21, cpc: 5.62,
      leads: 548, cpl: 336, verified: 188, verificationRate: 34.3,
      qualified: 79, qualificationRate: 14.4, costPerQualified: 2329,
    },
    deltas: {
      spend: { pct: 6.8 }, cpm: { pct: 1.2, invert: true }, ctr: { pct: 14.2 },
      leads: { pct: 22.6 }, cpl: { pct: -12.8, invert: true },
      qualificationRate: { pct: 7.1 }, costPerQualified: { pct: -14.6, invert: true },
    },
    adsets: [],
  },
  {
    id: "etc-jee-retarget",
    name: "JEE Crack · BOFU · Retargeting · Demo class",
    productId: "prod-guyjus-jee",
    productName: "Guyju's JEE Crack",
    channel: "Meta",
    objective: "Retargeting",
    status: "enabled",
    health: "on-track",
    metaUrl: "https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=etc-jee-retarget",
    metrics: {
      spend: 142000, impressions: 920000, cpm: 154, ctr: 3.18, cpc: 4.85,
      leads: 488, cpl: 291, verified: 184, verificationRate: 37.7,
      qualified: 64, qualificationRate: 13.1, costPerQualified: 2219,
    },
    deltas: {
      spend: { pct: 4.2 }, cpm: { pct: 0.6, invert: true }, ctr: { pct: 5.4 },
      leads: { pct: 9.8 }, cpl: { pct: -5.1, invert: true },
      qualificationRate: { pct: -1.2 }, costPerQualified: { pct: 3.9, invert: true },
    },
    adsets: [],
  },
  {
    id: "etc-jee-search",
    name: "JEE Crack · Google Search · Brand + non-brand",
    productId: "prod-guyjus-jee",
    productName: "Guyju's JEE Crack",
    channel: "Google",
    objective: "Search",
    status: "enabled",
    health: "on-track",
    metaUrl: "https://ads.google.com/aw/campaigns?campaignId=etc-jee-search",
    metrics: {
      spend: 98000, impressions: 412000, cpm: 238, ctr: 4.62, cpc: 5.15,
      leads: 192, cpl: 510, verified: 42, verificationRate: 21.9,
      qualified: 21, qualificationRate: 10.9, costPerQualified: 4667,
    },
    deltas: {
      spend: { pct: -2.4 }, cpm: { pct: 1.8, invert: true }, ctr: { pct: -3.6 },
      leads: { pct: -8.2 }, cpl: { pct: 6.4, invert: true },
      qualificationRate: { pct: -2.8 }, costPerQualified: { pct: 9.2, invert: true },
    },
    adsets: [],
  },

  // ── Guyju's NEET Pro — high CPL, 2 active
  {
    id: "etc-neet-tofu",
    name: "NEET Pro · TOFU · Parents-see-progress hook",
    productId: "prod-guyjus-neet",
    productName: "Guyju's NEET Pro",
    channel: "Meta",
    objective: "Lead Gen",
    status: "enabled",
    health: "needs-attention",
    metaUrl: "https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=etc-neet-tofu",
    metrics: {
      spend: 296000, impressions: 1640000, cpm: 180, ctr: 1.42, cpc: 12.68,
      leads: 484, cpl: 612, verified: 128, verificationRate: 26.4,
      qualified: 46, qualificationRate: 9.5, costPerQualified: 6435,
    },
    deltas: {
      spend: { pct: 18.4 }, cpm: { pct: 8.2, invert: true }, ctr: { pct: -6.8 },
      leads: { pct: 4.2 }, cpl: { pct: 13.4, invert: true },
      qualificationRate: { pct: -3.6 }, costPerQualified: { pct: 18.9, invert: true },
    },
    adsets: [],
  },
  {
    id: "etc-neet-retarget",
    name: "NEET Pro · BOFU · Retargeting · Biology mocks",
    productId: "prod-guyjus-neet",
    productName: "Guyju's NEET Pro",
    channel: "Meta",
    objective: "Retargeting",
    status: "enabled",
    health: "needs-attention",
    metaUrl: "https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=etc-neet-retarget",
    metrics: {
      spend: 192000, impressions: 840000, cpm: 229, ctr: 2.18, cpc: 10.5,
      leads: 302, cpl: 636, verified: 90, verificationRate: 29.8,
      qualified: 32, qualificationRate: 10.6, costPerQualified: 6000,
    },
    deltas: {
      spend: { pct: 9.4 }, cpm: { pct: 4.8, invert: true }, ctr: { pct: -2.4 },
      leads: { pct: 2.8 }, cpl: { pct: 6.4, invert: true },
      qualificationRate: { pct: 1.4 }, costPerQualified: { pct: 4.6, invert: true },
    },
    adsets: [],
  },

  // ── Foundation 9-10 — underperforming, 1 active, 1 draft
  {
    id: "etc-found-tofu",
    name: "Foundation 9-10 · TOFU · Lab-bench hook",
    productId: "prod-guyjus-foundation",
    productName: "Guyju's Foundation 9-10",
    channel: "Meta",
    objective: "Lead Gen",
    status: "enabled",
    health: "underperforming",
    metaUrl: "https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=etc-found-tofu",
    metrics: {
      spend: 188000, impressions: 980000, cpm: 192, ctr: 1.18, cpc: 16.3,
      leads: 286, cpl: 657, verified: 62, verificationRate: 21.7,
      qualified: 19, qualificationRate: 6.6, costPerQualified: 9895,
    },
    deltas: {
      spend: { pct: 22.6 }, cpm: { pct: 14.2, invert: true }, ctr: { pct: -12.4 },
      leads: { pct: -4.8 }, cpl: { pct: 28.6, invert: true },
      qualificationRate: { pct: -8.4 }, costPerQualified: { pct: 36.4, invert: true },
    },
    adsets: [],
  },
  {
    id: "etc-found-discover",
    name: "Foundation 9-10 · Google Discover · Parent intent",
    productId: "prod-guyjus-foundation",
    productName: "Guyju's Foundation 9-10",
    channel: "Google",
    objective: "Discover",
    status: "draft",
    health: "on-track",
    metaUrl: "https://ads.google.com/aw/campaigns?campaignId=etc-found-discover",
    metrics: {
      spend: 0, impressions: 0, cpm: 0, ctr: 0, cpc: 0,
      leads: 0, cpl: 0, verified: 0, verificationRate: 0,
      qualified: 0, qualificationRate: 0, costPerQualified: 0,
    },
    deltas: {
      spend: { pct: 0 }, cpm: { pct: 0, invert: true }, ctr: { pct: 0 },
      leads: { pct: 0 }, cpl: { pct: 0, invert: true },
      qualificationRate: { pct: 0 }, costPerQualified: { pct: 0, invert: true },
    },
    adsets: [],
  },
];

/* ─── Generate ad sets + ads under each campaign ─────────────── */

const ADSET_PRESETS = [
  { name: "Core · Class 11/12 parents", share: 0.55 },
  { name: "Lookalike · 1% · prior buyers", share: 0.3 },
  { name: "Retargeting · 30d engagers", share: 0.15 },
] as const;

const AD_PRESETS: Array<Pick<EdTechAd, "name" | "format" | "kind"> & { share: number }> = [
  { name: "Mentor-led · static", format: "1:1", kind: "image", share: 0.45 },
  { name: "Weekly mocks · reel", format: "9:16", kind: "video", share: 0.35 },
  { name: "Demo class · carousel", format: "4:5", kind: "carousel", share: 0.2 },
];

for (const c of edTechCampaigns) {
  if (c.status === "draft" || c.metrics.spend === 0) continue;
  const presets = c.objective === "Retargeting" ? ADSET_PRESETS.slice(0, 2) : ADSET_PRESETS;
  let asIdx = 0;
  for (const preset of presets) {
    const asId = `${c.id}-as-${++asIdx}`;
    const asMetrics = splitMetrics(c.metrics, preset.share);
    const asDeltas = jitterDeltas(c.deltas);
    const ads: EdTechAd[] = AD_PRESETS.map((ap, i) => {
      const adId = `${asId}-ad-${i + 1}`;
      return {
        id: adId,
        name: ap.name,
        format: ap.format,
        kind: ap.kind,
        status: c.status,
        metrics: splitMetrics(asMetrics, ap.share),
        deltas: jitterDeltas(asDeltas),
        metaUrl: `https://www.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adId}`,
      };
    });
    c.adsets.push({
      id: asId,
      name: preset.name,
      status: c.status,
      metrics: asMetrics,
      deltas: asDeltas,
      metaUrl: `https://www.facebook.com/adsmanager/manage/adsets?selected_adset_ids=${asId}`,
      ads,
    });
  }
}

/** Convenience list of products that have at least one campaign — used
 *  to populate the product filter dropdown. */
export function productOptions() {
  const seen = new Map<string, string>();
  for (const c of edTechCampaigns) {
    if (!seen.has(c.productId)) seen.set(c.productId, c.productName);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}
