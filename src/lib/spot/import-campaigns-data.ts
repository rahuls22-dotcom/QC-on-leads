// Mock ad accounts + their campaigns for the "Import campaigns" flow.
// When a user finishes setting up product memory, Spot offers to import
// existing campaigns from a connected ad account instead of launching
// new ones. This is the data that powers the right-pane import canvas:
// a list of ad accounts → a selectable list of that account's campaigns.
//
// All EdTech-flavoured (Guyju's) so it reads coherently with the rest of
// the demo. Numbers are illustrative only.

export type ImportPlatform = "Meta" | "Google";

export type ImportAdAccount = {
  id: string;
  name: string;
  platform: ImportPlatform;
  /** act_… handle (Meta) or 123-456-7890 (Google). */
  handle: string;
  currency: string;
  status: "active" | "limited";
  /** Number of campaigns Spot can pull from this account. */
  campaignCount: number;
  /** Trailing-30-day spend, in rupees. */
  spend30d: number;
};

export type ImportCampaignStatus = "active" | "paused";

export type ImportableCampaign = {
  id: string;
  accountId: string;
  name: string;
  platform: ImportPlatform;
  objective: "Lead generation" | "Conversions" | "Traffic" | "Awareness";
  status: ImportCampaignStatus;
  /** Trailing-30-day spend, in rupees. */
  spend: number;
  leads: number;
  /** Cost per lead, in rupees. */
  cpl: number;
  /** Relative last-edited label. */
  updated: string;
};

export const IMPORT_AD_ACCOUNTS: ImportAdAccount[] = [
  {
    id: "act-meta-main",
    name: "Guyju's — Meta Ads",
    platform: "Meta",
    handle: "act_409221445588",
    currency: "INR",
    status: "active",
    campaignCount: 7,
    spend30d: 1840000,
  },
  {
    id: "act-google-main",
    name: "Guyju's — Google Ads",
    platform: "Google",
    handle: "742-118-9043",
    currency: "INR",
    status: "active",
    campaignCount: 5,
    spend30d: 920000,
  },
  {
    id: "act-meta-brand",
    name: "Guyju's Brand — Meta",
    platform: "Meta",
    handle: "act_771903224410",
    currency: "INR",
    status: "active",
    campaignCount: 4,
    spend30d: 610000,
  },
  {
    id: "act-google-perf",
    name: "Guyju's Performance — Google",
    platform: "Google",
    handle: "508-442-7761",
    currency: "INR",
    status: "limited",
    campaignCount: 3,
    spend30d: 285000,
  },
];

export const IMPORTABLE_CAMPAIGNS: ImportableCampaign[] = [
  // ── Guyju's — Meta Ads (7) ───────────────────────────────────
  {
    id: "imp-m-1",
    accountId: "act-meta-main",
    name: "JEE Crack · Lead Gen · Class 11 Parents",
    platform: "Meta",
    objective: "Lead generation",
    status: "active",
    spend: 412000,
    leads: 1184,
    cpl: 348,
    updated: "2d ago",
  },
  {
    id: "imp-m-2",
    accountId: "act-meta-main",
    name: "JEE Crack · Retargeting · Demo Abandoners",
    platform: "Meta",
    objective: "Conversions",
    status: "active",
    spend: 168000,
    leads: 392,
    cpl: 429,
    updated: "1d ago",
  },
  {
    id: "imp-m-3",
    accountId: "act-meta-main",
    name: "NEET Pro · Lead Gen · Biology Hook",
    platform: "Meta",
    objective: "Lead generation",
    status: "active",
    spend: 356000,
    leads: 968,
    cpl: 368,
    updated: "3d ago",
  },
  {
    id: "imp-m-4",
    accountId: "act-meta-main",
    name: "Foundation 9-10 · Cold · Tier-2 Cities",
    platform: "Meta",
    objective: "Lead generation",
    status: "paused",
    spend: 142000,
    leads: 511,
    cpl: 278,
    updated: "8d ago",
  },
  {
    id: "imp-m-5",
    accountId: "act-meta-main",
    name: "Spoken English · Working Pros · Reels",
    platform: "Meta",
    objective: "Traffic",
    status: "active",
    spend: 224000,
    leads: 740,
    cpl: 303,
    updated: "1d ago",
  },
  {
    id: "imp-m-6",
    accountId: "act-meta-main",
    name: "JEE Crack · Lookalike · Demo Attendees 30d",
    platform: "Meta",
    objective: "Conversions",
    status: "active",
    spend: 198000,
    leads: 426,
    cpl: 465,
    updated: "4d ago",
  },
  {
    id: "imp-m-7",
    accountId: "act-meta-main",
    name: "NEET Pro · Cold · Aspiring Doctor Parent",
    platform: "Meta",
    objective: "Lead generation",
    status: "paused",
    spend: 132000,
    leads: 318,
    cpl: 415,
    updated: "11d ago",
  },

  // ── Guyju's — Google Ads (5) ─────────────────────────────────
  {
    id: "imp-g-1",
    accountId: "act-google-main",
    name: "JEE · Search · Brand Defense",
    platform: "Google",
    objective: "Lead generation",
    status: "active",
    spend: 96000,
    leads: 488,
    cpl: 197,
    updated: "1d ago",
  },
  {
    id: "imp-g-2",
    accountId: "act-google-main",
    name: "JEE · Search · Category Queries",
    platform: "Google",
    objective: "Lead generation",
    status: "active",
    spend: 268000,
    leads: 712,
    cpl: 376,
    updated: "2d ago",
  },
  {
    id: "imp-g-3",
    accountId: "act-google-main",
    name: "NEET · Search · Competitor Bidding",
    platform: "Google",
    objective: "Lead generation",
    status: "active",
    spend: 184000,
    leads: 392,
    cpl: 469,
    updated: "3d ago",
  },
  {
    id: "imp-g-4",
    accountId: "act-google-main",
    name: "Discover · Cold · Top-of-Funnel",
    platform: "Google",
    objective: "Awareness",
    status: "paused",
    spend: 142000,
    leads: 286,
    cpl: 497,
    updated: "9d ago",
  },
  {
    id: "imp-g-5",
    accountId: "act-google-main",
    name: "Spoken English · Search · Category",
    platform: "Google",
    objective: "Lead generation",
    status: "active",
    spend: 124000,
    leads: 372,
    cpl: 333,
    updated: "2d ago",
  },

  // ── Guyju's Brand — Meta (4) ─────────────────────────────────
  {
    id: "imp-b-1",
    accountId: "act-meta-brand",
    name: "Brand · Awareness · Founder Story",
    platform: "Meta",
    objective: "Awareness",
    status: "active",
    spend: 188000,
    leads: 142,
    cpl: 1324,
    updated: "5d ago",
  },
  {
    id: "imp-b-2",
    accountId: "act-meta-brand",
    name: "Brand · Engagement · Results Reel",
    platform: "Meta",
    objective: "Traffic",
    status: "active",
    spend: 164000,
    leads: 268,
    cpl: 612,
    updated: "2d ago",
  },
  {
    id: "imp-b-3",
    accountId: "act-meta-brand",
    name: "Brand · Cold · Mentor Spotlight",
    platform: "Meta",
    objective: "Awareness",
    status: "paused",
    spend: 132000,
    leads: 96,
    cpl: 1375,
    updated: "12d ago",
  },
  {
    id: "imp-b-4",
    accountId: "act-meta-brand",
    name: "Brand · Retarget · Site Visitors 30d",
    platform: "Meta",
    objective: "Conversions",
    status: "active",
    spend: 126000,
    leads: 214,
    cpl: 589,
    updated: "1d ago",
  },

  // ── Guyju's Performance — Google (3) ─────────────────────────
  {
    id: "imp-p-1",
    accountId: "act-google-perf",
    name: "Perf · Search · High-Intent · JEE",
    platform: "Google",
    objective: "Conversions",
    status: "active",
    spend: 118000,
    leads: 364,
    cpl: 324,
    updated: "2d ago",
  },
  {
    id: "imp-p-2",
    accountId: "act-google-perf",
    name: "Perf · PMax · All Products",
    platform: "Google",
    objective: "Conversions",
    status: "active",
    spend: 102000,
    leads: 248,
    cpl: 411,
    updated: "4d ago",
  },
  {
    id: "imp-p-3",
    accountId: "act-google-perf",
    name: "Perf · Search · NEET Long-Tail",
    platform: "Google",
    objective: "Lead generation",
    status: "paused",
    spend: 65000,
    leads: 172,
    cpl: 378,
    updated: "10d ago",
  },
];

export function campaignsForAccount(accountId: string): ImportableCampaign[] {
  return IMPORTABLE_CAMPAIGNS.filter((c) => c.accountId === accountId);
}

export function importAccount(accountId: string | null | undefined): ImportAdAccount | undefined {
  if (!accountId) return undefined;
  return IMPORT_AD_ACCOUNTS.find((a) => a.id === accountId);
}

/** Roll up a set of imported campaigns for the post-import summary. */
export function summariseImport(campaignIds: string[]): {
  count: number;
  spend: number;
  leads: number;
  blendedCpl: number;
  active: number;
} {
  const set = new Set(campaignIds);
  const rows = IMPORTABLE_CAMPAIGNS.filter((c) => set.has(c.id));
  const spend = rows.reduce((s, c) => s + c.spend, 0);
  const leads = rows.reduce((s, c) => s + c.leads, 0);
  const active = rows.filter((c) => c.status === "active").length;
  return {
    count: rows.length,
    spend,
    leads,
    blendedCpl: leads > 0 ? Math.round(spend / leads) : 0,
    active,
  };
}
