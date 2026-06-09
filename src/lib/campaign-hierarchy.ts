// Hierarchical mock data for the Campaigns dashboard.
// Each Campaign expands to a list of Ad Sets; each Ad Set expands to a
// list of Ads. The platform is **read-only** on these — the only edit
// paths are "Open in Meta" (link out) and "Ask Spot to edit".

import { campaignsList, type CampaignListItem, type CampaignStatus } from "./campaign-data";

export type AdRow = {
  id: string;
  name: string;
  format: "1:1" | "4:5" | "9:16" | "16:9";
  kind: "image" | "video" | "carousel";
  status: CampaignStatus;
  spend: number;
  impressions: number;
  ctr: number;
  leads: number;
  cpl: number;
  /** Direct deep link into Meta Ads Manager for this ad. */
  metaUrl: string;
};

export type AdSetRowHier = {
  id: string;
  name: string;
  status: CampaignStatus;
  spend: number;
  impressions: number;
  ctr: number;
  leads: number;
  cpl: number;
  verifiedLeads: number;
  qualifiedLeads: number;
  ads: AdRow[];
  metaUrl: string;
};

export type CampaignHier = {
  campaign: CampaignListItem;
  adsets: AdSetRowHier[];
  metaUrl: string;
};

// Deterministic ad-set + ad construction off each campaign so the
// totals look roughly consistent with the parent campaign row.
function makeAdSets(c: CampaignListItem): AdSetRowHier[] {
  // 2-3 ad sets per campaign, split spend asymmetrically
  const splits = c.leads > 150 ? [0.55, 0.3, 0.15] : [0.65, 0.35];
  const adsetNames =
    c.leads > 150
      ? ["Core audience", "Lookalike 1%", "Retargeting"]
      : ["Core audience", "Lookalike 1%"];

  return splits.map((share, i) => {
    const id = `${c.id}-as-${i + 1}`;
    const spend = Math.round(c.spend * share);
    const leads = Math.round(c.leads * share);
    const verified = Math.round(c.verifiedLeads * share);
    const qualified = Math.round(c.qualifiedLeads * share);
    const impressions = Math.round((spend / Math.max(c.cpm, 1)) * 1000);
    const ctr = +(c.ctr + (i === 0 ? 0.2 : -0.15) * (i + 1)).toFixed(2);
    const cpl = leads > 0 ? Math.round(spend / leads) : 0;
    return {
      id,
      name: adsetNames[i],
      status: c.status,
      spend,
      impressions,
      ctr,
      leads,
      cpl,
      verifiedLeads: verified,
      qualifiedLeads: qualified,
      ads: makeAds(id, spend, leads, ctr, c.status),
      metaUrl: `https://www.facebook.com/adsmanager/manage/adsets?act=${encodeURIComponent(c.client)}&selected_adset_ids=${id}`,
    };
  });
}

function makeAds(
  adsetId: string,
  parentSpend: number,
  parentLeads: number,
  parentCtr: number,
  status: CampaignStatus,
): AdRow[] {
  const variants: { fmt: AdRow["format"]; kind: AdRow["kind"]; name: string }[] = [
    { fmt: "1:1", kind: "image", name: "Static · primary" },
    { fmt: "9:16", kind: "video", name: "Reel · hook variant" },
    { fmt: "4:5", kind: "image", name: "Static · alt copy" },
  ];
  const shares = [0.5, 0.3, 0.2];
  return variants.map((v, i) => {
    const spend = Math.round(parentSpend * shares[i]);
    const leads = Math.round(parentLeads * shares[i]);
    const impressions = Math.round(spend * 6);
    const cpl = leads > 0 ? Math.round(spend / leads) : 0;
    return {
      id: `${adsetId}-ad-${i + 1}`,
      name: v.name,
      format: v.fmt,
      kind: v.kind,
      status,
      spend,
      impressions,
      ctr: +(parentCtr + (i === 0 ? 0.1 : -0.05 * i)).toFixed(2),
      leads,
      cpl,
      metaUrl: `https://www.facebook.com/adsmanager/manage/ads?selected_ad_ids=${adsetId}-ad-${i + 1}`,
    };
  });
}

export const campaignHierarchy: CampaignHier[] = campaignsList.map((c) => ({
  campaign: c,
  adsets: makeAdSets(c),
  metaUrl: `https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${c.id}`,
}));
