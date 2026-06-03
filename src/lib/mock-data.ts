export const dashboardMetrics = {
  activeCampaigns: {
    value: 9,
    previous: 7,
    label: "Active campaigns",
    trend: { value: 28.6, direction: "up" as const },
    comparisonText: "+2 vs previous period",
  },
  spends: {
    value: "₹6.8L",
    rawValue: 680000,
    formattedFull: "₹6,80,000",
    previous: "₹5.9L",
    previousRaw: 590000,
    label: "Spends",
    trend: { value: 15, direction: "up" as const },
  },
  totalLeads: {
    value: 845,
    previous: 754,
    label: "Total leads",
    trend: { value: 12, direction: "up" as const },
  },
  verifiedLeads: {
    value: 127,
    previous: 104,
    label: "Verified leads",
    trend: { value: 22.1, direction: "up" as const },
  },
  qualifiedLeads: {
    value: 68,
    previous: 63,
    label: "Qualified leads",
    trend: { value: 7.9, direction: "up" as const },
  },
  verificationRate: {
    value: "15%",
    previous: "13.8%",
    label: "Verification rate",
    trend: { value: 8.7, direction: "up" as const },
  },
  avgCPL: {
    value: "₹1,183",
    previous: "₹1,245",
    label: "Avg CPL",
    trend: { value: 5, direction: "down" as const, positive: true },
  },
  costPerVerified: {
    value: "₹5,354",
    previous: "₹5,192",
    label: "Cost per verified lead",
    trend: { value: 3.1, direction: "up" as const, positive: false },
  },
};

// ── Insights ────────────────────────────────────────────────

export interface InsightItem {
  id: string;
  icon: string;
  text: string;
  highlights: string[]; // Bold segments within the text
}

export const yesterdayInsights: InsightItem[] = [
  {
    id: "yi-1",
    icon: "📊",
    text: "You received 32 new enquiries yesterday — 18% above your daily average of 27.",
    highlights: ["32 new enquiries", "18% above", "27"],
  },
  {
    id: "yi-2",
    icon: "💰",
    text: "Meta spend was ₹14,200 with a CPL of ₹890 — your best Meta CPL day this month.",
    highlights: ["₹14,200", "₹890", "best Meta CPL day"],
  },
  {
    id: "yi-3",
    icon: "📞",
    text: "Voice agent qualified 8 leads yesterday. Top disqualification reason: budget below threshold (4 leads).",
    highlights: ["8 leads", "budget below threshold", "4 leads"],
  },
  {
    id: "yi-4",
    icon: "🔻",
    text: "Google Search CPL spiked to ₹1,450 — 42% above your 7-day average. Keyword 'luxury villas whitefield' drove most of the spend.",
    highlights: ["₹1,450", "42% above", "luxury villas whitefield"],
  },
  {
    id: "yi-5",
    icon: "✅",
    text: "3 leads moved to 'Site Visit Scheduled' stage in your CRM.",
    highlights: ["3 leads", "Site Visit Scheduled"],
  },
];

export const weeklyInsights: InsightItem[] = [
  {
    id: "wi-1",
    icon: "📊",
    text: "You received 198 enquiries in the last 7 days — up 12% from the previous week.",
    highlights: ["198 enquiries", "12%"],
  },
  {
    id: "wi-2",
    icon: "💰",
    text: "Total spend across channels: ₹1.58L. Meta accounted for 62% of spend but 71% of qualified leads.",
    highlights: ["₹1.58L", "62% of spend", "71% of qualified leads"],
  },
  {
    id: "wi-3",
    icon: "📞",
    text: "Voice agent made 342 calls, qualifying 45 leads (13.2% qualification rate). Rate is improving — was 11.8% the week before.",
    highlights: ["342 calls", "45 leads", "13.2%", "11.8%"],
  },
  {
    id: "wi-4",
    icon: "🔻",
    text: "LinkedIn campaigns generated only 6 enquiries at ₹2,100 CPL — consider pausing or reallocating budget.",
    highlights: ["6 enquiries", "₹2,100 CPL"],
  },
  {
    id: "wi-5",
    icon: "📈",
    text: "Your overall CPL dropped from ₹1,245 to ₹1,183 week-over-week. Meta optimization is driving the improvement.",
    highlights: ["₹1,245", "₹1,183", "Meta optimization"],
  },
];

// ── Recently Qualified Leads ────────────────────────────────

export interface QualifiedLead {
  id: string;
  name: string;
  phone: string;
  campaign: string;
  timeAgo: string;
  temperature: "warm" | "lukewarm" | "cold";
  crmSynced: boolean; // true = pushed, false = pending
}

export const recentlyQualifiedLeads: QualifiedLead[] = [
  { id: "ql-1", name: "R***** M*****", phone: "+91 ****9826", campaign: "Godrej Reflections", timeAgo: "2 hours ago", temperature: "warm", crmSynced: true },
  { id: "ql-2", name: "A***** K*****", phone: "+91 ****4156", campaign: "Godrej Air Phase 3", timeAgo: "3 hours ago", temperature: "warm", crmSynced: true },
  { id: "ql-3", name: "T***** S*****", phone: "+91 ****7390", campaign: "Godrej Nurture", timeAgo: "5 hours ago", temperature: "lukewarm", crmSynced: false },
  { id: "ql-4", name: "D***** T*****", phone: "+91 ****2912", campaign: "Godrej Reserve", timeAgo: "8 hours ago", temperature: "warm", crmSynced: true },
  { id: "ql-5", name: "M***** P*****", phone: "+91 ****6218", campaign: "Godrej Air Phase 3", timeAgo: "12 hours ago", temperature: "lukewarm", crmSynced: true },
  { id: "ql-6", name: "V***** R*****", phone: "+91 ****8342", campaign: "Godrej Reflections", timeAgo: "1 day ago", temperature: "warm", crmSynced: false },
];

// ── Campaign Performance (unchanged) ────────────────────────

export interface CampaignRow {
  id: string;
  name: string;
  spend: number;
  leads: number;
  verified: number;
  qualified: number;
  cpl: number;
  status: "on-track" | "needs-attention" | "underperforming";
}

export const campaignPerformance: CampaignRow[] = [
  { id: "camp-1", name: "Godrej Reflections — Lead Gen", spend: 185000, leads: 214, verified: 38, qualified: 18, cpl: 864, status: "on-track" },
  { id: "camp-2", name: "Godrej Eternity — Retargeting", spend: 142000, leads: 156, verified: 22, qualified: 11, cpl: 910, status: "needs-attention" },
  { id: "camp-3", name: "Godrej Nurture — Lookalike", spend: 95000, leads: 128, verified: 24, qualified: 14, cpl: 742, status: "on-track" },
  { id: "camp-4", name: "Godrej Platinum — Lead Gen", spend: 110000, leads: 142, verified: 18, qualified: 8, cpl: 775, status: "underperforming" },
  { id: "camp-5", name: "Godrej Reserve — HNI", spend: 88000, leads: 98, verified: 16, qualified: 10, cpl: 898, status: "on-track" },
  { id: "camp-6", name: "Godrej Ananda — Carousel", spend: 60000, leads: 107, verified: 9, qualified: 7, cpl: 561, status: "on-track" },
];

// Keep old exports for backward compat
export const aiRecommendations = [] as { id: string; priority: "high" | "medium" | "low"; title: string; description: string }[];

export interface RecentLead {
  id: string;
  name: string;
  phone: string;
  campaign: string;
  timeAgo: string;
  status: "qualified" | "not_qualified" | "pending";
  verified: boolean;
}
export const recentLeads: RecentLead[] = [];

export const voiceAgentMetrics = {
  totalCalls: 142,
  connected: { value: 112, rate: 78.9 },
  qualified: { value: 52, rate: 46.4 },
  avgDuration: 3.2,
};

export const disqualificationReasons = [
  { reason: "Budget below threshold", percentage: 41 },
  { reason: "Timeline >12 months", percentage: 30 },
  { reason: "Not decision maker", percentage: 17 },
  { reason: "Not interested", percentage: 12 },
];
