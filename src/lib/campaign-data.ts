// Campaign mock data — realistic Bangalore luxury real estate

// ── Campaign List ───────────────────────────────────────────

export type CampaignStatus = "enabled" | "paused" | "draft";
export type CampaignType = "Performance" | "Brand";
export type CampaignHealth = "on-track" | "needs-attention" | "underperforming";

export interface CampaignListItem {
  id: string;
  name: string;
  type: CampaignType;
  client: string; // internal — maps to project name in UI
  projectId: string | null; // null = unassigned
  status: CampaignStatus;
  spend: number;
  leads: number;
  verifiedLeads: number;
  qualifiedLeads: number;
  cpl: number;
  health: CampaignHealth;
  createdAt: string;
  // Traffic & Engagement
  cpm: number;
  ctr: number;
  cpc: number;
  // Video Engagement
  firstFrameRetention: number;
  hookRate: number;
  holdRate: number;
  playRate95: number;
  // Conversion Funnel
  costPerLinkClick: number;
  costPerVerifiedLead: number;
  costPerQualifiedLead: number;
  verificationRate: number;
  qualificationRate: number;
  agentConnected: boolean;
}

export const campaignsList: CampaignListItem[] = [
  {
    id: "camp-1", name: "Godrej Reflections Habitat — Lead Gen", type: "Performance",
    client: "Whitefield Luxury Villas", projectId: "proj-1",
    status: "enabled", spend: 185000, leads: 214, verifiedLeads: 38, qualifiedLeads: 18, cpl: 864, health: "on-track", createdAt: "2025-12-15",
    cpm: 245, ctr: 2.1, cpc: 18,
    firstFrameRetention: 94, hookRate: 32, holdRate: 28, playRate95: 26,
    costPerLinkClick: 15, costPerVerifiedLead: 4868, costPerQualifiedLead: 10278, verificationRate: 18, qualificationRate: 8, agentConnected: true,
  },
  {
    id: "camp-2", name: "Godrej Eternity — Retargeting", type: "Performance",
    client: "Godrej Eternity Pre-launch", projectId: "proj-3",
    status: "enabled", spend: 142000, leads: 156, verifiedLeads: 22, qualifiedLeads: 11, cpl: 910, health: "needs-attention", createdAt: "2026-01-08",
    cpm: 310, ctr: 1.4, cpc: 32,
    firstFrameRetention: 91, hookRate: 25, holdRate: 22, playRate95: 18,
    costPerLinkClick: 28, costPerVerifiedLead: 6455, costPerQualifiedLead: 12909, verificationRate: 14, qualificationRate: 7, agentConnected: true,
  },
  {
    id: "camp-3", name: "Godrej Nurture — Lookalike", type: "Performance",
    client: "Godrej Nurture", projectId: null,
    status: "enabled", spend: 95000, leads: 128, verifiedLeads: 24, qualifiedLeads: 14, cpl: 742, health: "on-track", createdAt: "2026-01-22",
    cpm: 198, ctr: 2.8, cpc: 12,
    firstFrameRetention: 96, hookRate: 36, holdRate: 31, playRate95: 34,
    costPerLinkClick: 10, costPerVerifiedLead: 3958, costPerQualifiedLead: 6786, verificationRate: 19, qualificationRate: 11, agentConnected: true,
  },
  {
    id: "camp-4", name: "Godrej Platinum — Lead Gen", type: "Performance",
    client: "Godrej Platinum", projectId: null,
    status: "enabled", spend: 110000, leads: 142, verifiedLeads: 18, qualifiedLeads: 8, cpl: 775, health: "underperforming", createdAt: "2026-02-03",
    cpm: 380, ctr: 0.9, cpc: 45,
    firstFrameRetention: 87, hookRate: 21, holdRate: 20, playRate95: 16,
    costPerLinkClick: 42, costPerVerifiedLead: 6111, costPerQualifiedLead: 13750, verificationRate: 13, qualificationRate: 6, agentConnected: true,
  },
  {
    id: "camp-5", name: "Godrej Reserve — HNI", type: "Performance",
    client: "Godrej Reserve", projectId: null,
    status: "enabled", spend: 88000, leads: 98, verifiedLeads: 16, qualifiedLeads: 10, cpl: 898, health: "on-track", createdAt: "2026-02-14",
    cpm: 265, ctr: 1.9, cpc: 22,
    firstFrameRetention: 93, hookRate: 29, holdRate: 26, playRate95: 22,
    costPerLinkClick: 20, costPerVerifiedLead: 5500, costPerQualifiedLead: 8800, verificationRate: 16, qualificationRate: 10, agentConnected: true,
  },
  {
    id: "camp-6", name: "Godrej Ananda — Carousel", type: "Brand",
    client: "Godrej Ananda", projectId: null,
    status: "paused", spend: 60000, leads: 107, verifiedLeads: 9, qualifiedLeads: 7, cpl: 561, health: "on-track", createdAt: "2026-01-05",
    cpm: 150, ctr: 3.2, cpc: 8,
    firstFrameRetention: 97, hookRate: 38, holdRate: 33, playRate95: 38,
    costPerLinkClick: 7, costPerVerifiedLead: 6667, costPerQualifiedLead: 8571, verificationRate: 8, qualificationRate: 7, agentConnected: true,
  },
  {
    id: "camp-7", name: "Godrej Air Phase 3 — Lead Gen", type: "Performance",
    client: "Godrej Air Phase 3", projectId: "proj-2",
    status: "enabled", spend: 220000, leads: 186, verifiedLeads: 42, qualifiedLeads: 22, cpl: 1183, health: "on-track", createdAt: "2025-11-20",
    cpm: 280, ctr: 2.4, cpc: 19,
    firstFrameRetention: 95, hookRate: 34, holdRate: 29, playRate95: 30,
    costPerLinkClick: 16, costPerVerifiedLead: 5238, costPerQualifiedLead: 10000, verificationRate: 23, qualificationRate: 12, agentConnected: false,
  },
  {
    id: "camp-8", name: "Godrej Woodland — Brand Awareness", type: "Brand",
    client: "Godrej Woodland", projectId: null,
    status: "enabled", spend: 75000, leads: 92, verifiedLeads: 11, qualifiedLeads: 5, cpl: 815, health: "needs-attention", createdAt: "2026-02-28",
    cpm: 175, ctr: 2.6, cpc: 11,
    firstFrameRetention: 92, hookRate: 27, holdRate: 24, playRate95: 20,
    costPerLinkClick: 9, costPerVerifiedLead: 6818, costPerQualifiedLead: 15000, verificationRate: 12, qualificationRate: 5, agentConnected: true,
  },
  {
    id: "camp-9", name: "Godrej Summit — Lead Gen", type: "Performance",
    client: "Godrej Summit Full Funnel", projectId: "proj-4",
    status: "paused", spend: 310000, leads: 340, verifiedLeads: 58, qualifiedLeads: 29, cpl: 912, health: "on-track", createdAt: "2025-09-10",
    cpm: 220, ctr: 2.3, cpc: 15,
    firstFrameRetention: 95, hookRate: 33, holdRate: 30, playRate95: 28,
    costPerLinkClick: 12, costPerVerifiedLead: 5345, costPerQualifiedLead: 10690, verificationRate: 17, qualificationRate: 9, agentConnected: true,
  },
  {
    id: "camp-10", name: "Godrej Horizon — Retargeting", type: "Performance",
    client: "Whitefield Luxury Villas", projectId: "proj-1",
    status: "paused", spend: 48000, leads: 64, verifiedLeads: 8, qualifiedLeads: 4, cpl: 750, health: "needs-attention", createdAt: "2026-01-30",
    cpm: 340, ctr: 1.1, cpc: 38,
    firstFrameRetention: 88, hookRate: 23, holdRate: 21, playRate95: 17,
    costPerLinkClick: 35, costPerVerifiedLead: 6000, costPerQualifiedLead: 12000, verificationRate: 13, qualificationRate: 6, agentConnected: true,
  },
  {
    id: "camp-11", name: "Godrej Reserve — HNI Launch", type: "Performance",
    client: "Godrej Reserve", projectId: "proj-3",
    status: "draft", spend: 0, leads: 0, verifiedLeads: 0, qualifiedLeads: 0, cpl: 0, health: "on-track", createdAt: "2026-04-02",
    cpm: 0, ctr: 0, cpc: 0,
    firstFrameRetention: 0, hookRate: 0, holdRate: 0, playRate95: 0,
    costPerLinkClick: 0, costPerVerifiedLead: 0, costPerQualifiedLead: 0, verificationRate: 0, qualificationRate: 0, agentConnected: false,
  },
];

// ── Campaign Detail (Godrej Air Phase 3) ───────────────────

export type CampaignGoalKind = "leads" | "verified" | "qualified";

/** CBO = Campaign Budget Optimization (Meta distributes); ABO = Ad Set Budget Optimization (manual). */
export type BudgetMode = "CBO" | "ABO";

export interface CampaignDetail {
  id: string;
  name: string;
  status: CampaignStatus;
  type: CampaignType;
  client: string;
  owner: string;
  platform: string;
  platformPageId: string;
  platformCampaignId: string;
  targetCPL: number;
  dailyBudget: number;
  createdAt: string;
  agentConnected: boolean;
  primaryGoal: CampaignGoalKind;
  budgetMode: BudgetMode;
}

export const campaignDetail: CampaignDetail = {
  id: "camp-7",
  name: "Godrej Air Phase 3",
  status: "enabled",
  type: "Performance",
  client: "Godrej Properties",
  owner: "demo@godrejproperties.com",
  platform: "Meta",
  platformPageId: "109284756301",
  platformCampaignId: "23851029384710",
  targetCPL: 1200,
  dailyBudget: 8000,
  createdAt: "2025-11-20",
  agentConnected: false,
  primaryGoal: "leads",
  budgetMode: "CBO",
};

// ── Leads Tab Data ──────────────────────────────────────────

export type LeadTemperature = "hot" | "warm" | "lukewarm" | "cold";
export type LeadQualification = "qualified" | "not_qualified" | "pending";
export type LeadStatusValue =
  | "intent_qualified"
  | "not_qualified"
  | "interested_not_ready"
  | "duplicate"
  | "invalid";
export type LeadStage =
  | "new"
  | "contacted"
  | "site_visit_scheduled"
  | "site_visit_done"
  | "negotiation"
  | "won"
  | "lost";
// Alias for backward compat with enquiries-data
export type LeadStatus = LeadStatusValue;
export type EnrichmentStatus = "enriched" | "not_enriched" | "failed";
export type CRMSyncStatus = "pushed" | "pending" | "failed" | "not_synced" | "na";

export interface CRMSyncInfo {
  status: CRMSyncStatus;
  pushedAt?: string;
  crmRecordId?: string;
  failReason?: string;
  syncHistory?: { date: string; action: string }[];
}

export interface CampaignLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  enrichmentStatus: EnrichmentStatus;
  aiQualification: LeadQualification;
  temperature: LeadTemperature;
  leadStatus: LeadStatusValue;
  leadStage: LeadStage;
  verified: boolean;
  sql: boolean;
  crmSync: CRMSyncInfo;
  campaign: string;
  adset: string;
  adName: string;
  formResponses: { question: string; answer: string }[];
}

export const campaignLeads: CampaignLead[] = [
  {
    id: "lead-101", name: "V***** R*****", phone: "98XXX XX342", email: "v*****@gmail.com",
    createdAt: "2026-03-20T14:32:00", updatedAt: "2026-03-20T15:10:00",
    enrichmentStatus: "enriched", aiQualification: "qualified",
    temperature: "warm", leadStatus: "intent_qualified", leadStage: "site_visit_done",
    verified: true, sql: true,
    crmSync: { status: "pushed", pushedAt: "2026-03-20T15:12:00", crmRecordId: "Contact #4521",
      syncHistory: [
        { date: "Mar 20, 3:12 PM", action: "Pushed to CRM (auto-sync)" },
        { date: "Mar 21, 10:34 AM", action: "Stage updated: Contacted → Site Visit Done (synced from CRM)" },
      ] },
    campaign: "Godrej Air Phase 3", adset: "Whitefield HNI — 30-45", adName: "Godrej Air 3BHK Carousel v2",
    formResponses: [
      { question: "Budget range?", answer: "₹1.5Cr - ₹2Cr" },
      { question: "Configuration preference?", answer: "3 BHK" },
      { question: "Timeline to purchase?", answer: "Within 3 months" },
      { question: "Current location?", answer: "Whitefield" },
    ],
  },
  {
    id: "lead-102", name: "S***** M*****", phone: "90XXX XX891", email: "s*****@yahoo.com",
    createdAt: "2026-03-20T11:15:00", updatedAt: "2026-03-20T14:45:00",
    enrichmentStatus: "enriched", aiQualification: "pending",
    temperature: "lukewarm", leadStatus: "interested_not_ready", leadStage: "contacted",
    verified: false, sql: false,
    crmSync: { status: "pending" },
    campaign: "Godrej Air Phase 3", adset: "Sarjapur IT Corridor", adName: "Godrej Air Lifestyle Video",
    formResponses: [
      { question: "Budget range?", answer: "₹1Cr - ₹1.5Cr" },
      { question: "Configuration preference?", answer: "2 BHK" },
      { question: "Timeline to purchase?", answer: "6-12 months" },
    ],
  },
  {
    id: "lead-103", name: "A***** K*****", phone: "87XXX XX156", email: "a*****@outlook.com",
    createdAt: "2026-03-19T18:22:00", updatedAt: "2026-03-20T09:30:00",
    enrichmentStatus: "enriched", aiQualification: "qualified",
    temperature: "warm", leadStatus: "intent_qualified", leadStage: "site_visit_scheduled",
    verified: true, sql: true,
    crmSync: { status: "pushed", pushedAt: "2026-03-19T18:30:00", crmRecordId: "Contact #4518",
      syncHistory: [
        { date: "Mar 19, 6:30 PM", action: "Pushed to CRM (auto-sync)" },
        { date: "Mar 20, 9:30 AM", action: "Stage updated: New → Site Visit Scheduled (synced from CRM)" },
      ] },
    campaign: "Godrej Air Phase 3", adset: "Whitefield HNI — 30-45", adName: "Godrej Air Floor Plan Static",
    formResponses: [
      { question: "Budget range?", answer: "₹2Cr - ₹2.5Cr" },
      { question: "Configuration preference?", answer: "3 BHK Premium" },
      { question: "Timeline to purchase?", answer: "Immediate" },
      { question: "Current location?", answer: "Indiranagar" },
    ],
  },
  {
    id: "lead-104", name: "P***** J*****", phone: "99XXX XX723", email: "p*****@gmail.com",
    createdAt: "2026-03-19T16:05:00", updatedAt: "2026-03-19T16:05:00",
    enrichmentStatus: "not_enriched", aiQualification: "not_qualified",
    temperature: "cold", leadStatus: "not_qualified", leadStage: "new",
    verified: false, sql: false,
    crmSync: { status: "not_synced" },
    campaign: "Godrej Air Phase 3", adset: "Broad Bangalore — 25-55", adName: "Godrej Air 3BHK Carousel v2",
    formResponses: [
      { question: "Budget range?", answer: "Below ₹80L" },
      { question: "Configuration preference?", answer: "2 BHK" },
      { question: "Timeline to purchase?", answer: "Not sure" },
    ],
  },
  {
    id: "lead-105", name: "R***** B*****", phone: "80XXX XX445", email: "r*****@gmail.com",
    createdAt: "2026-03-19T10:48:00", updatedAt: "2026-03-20T11:20:00",
    enrichmentStatus: "enriched", aiQualification: "qualified",
    temperature: "warm", leadStatus: "intent_qualified", leadStage: "contacted",
    verified: true, sql: false,
    crmSync: { status: "pushed", pushedAt: "2026-03-19T11:00:00", crmRecordId: "Contact #4515",
      syncHistory: [{ date: "Mar 19, 11:00 AM", action: "Pushed to CRM (auto-sync)" }] },
    campaign: "Godrej Air Phase 3", adset: "Sarjapur IT Corridor", adName: "Godrej Air Lifestyle Video",
    formResponses: [
      { question: "Budget range?", answer: "₹1.5Cr - ₹2Cr" },
      { question: "Configuration preference?", answer: "3 BHK" },
      { question: "Timeline to purchase?", answer: "3-6 months" },
      { question: "Current location?", answer: "Sarjapur Road" },
    ],
  },
  {
    id: "lead-106", name: "N***** D*****", phone: "91XXX XX867", email: "n*****@hotmail.com",
    createdAt: "2026-03-18T21:30:00", updatedAt: "2026-03-19T10:15:00",
    enrichmentStatus: "enriched", aiQualification: "not_qualified",
    temperature: "lukewarm", leadStatus: "not_qualified", leadStage: "contacted",
    verified: false, sql: false,
    crmSync: { status: "not_synced" },
    campaign: "Godrej Air Phase 3", adset: "Whitefield HNI — 30-45", adName: "Godrej Air Amenities Carousel",
    formResponses: [
      { question: "Budget range?", answer: "₹1Cr - ₹1.5Cr" },
      { question: "Configuration preference?", answer: "2 BHK" },
      { question: "Timeline to purchase?", answer: ">12 months" },
    ],
  },
  {
    id: "lead-107", name: "M***** S*****", phone: "96XXX XX218", email: "m*****@gmail.com",
    createdAt: "2026-03-18T15:12:00", updatedAt: "2026-03-19T16:40:00",
    enrichmentStatus: "enriched", aiQualification: "qualified",
    temperature: "warm", leadStatus: "intent_qualified", leadStage: "negotiation",
    verified: true, sql: true,
    crmSync: { status: "pushed", pushedAt: "2026-03-18T15:20:00", crmRecordId: "Contact #4510",
      syncHistory: [
        { date: "Mar 18, 3:20 PM", action: "Pushed to CRM (auto-sync)" },
        { date: "Mar 19, 4:40 PM", action: "Stage updated: Contacted → Negotiation (synced from CRM)" },
      ] },
    campaign: "Godrej Air Phase 3", adset: "Whitefield HNI — 30-45", adName: "Godrej Air 3BHK Carousel v2",
    formResponses: [
      { question: "Budget range?", answer: "₹2Cr+" },
      { question: "Configuration preference?", answer: "4 BHK" },
      { question: "Timeline to purchase?", answer: "Immediate" },
      { question: "Current location?", answer: "Koramangala" },
    ],
  },
  {
    id: "lead-108", name: "K***** G*****", phone: "88XXX XX534", email: "k*****@gmail.com",
    createdAt: "2026-03-18T09:45:00", updatedAt: "2026-03-18T09:45:00",
    enrichmentStatus: "not_enriched", aiQualification: "pending",
    temperature: "lukewarm", leadStatus: "interested_not_ready", leadStage: "new",
    verified: false, sql: false,
    crmSync: { status: "pending" },
    campaign: "Godrej Air Phase 3", adset: "Broad Bangalore — 25-55", adName: "Godrej Air Floor Plan Static",
    formResponses: [
      { question: "Budget range?", answer: "₹1Cr - ₹1.5Cr" },
      { question: "Configuration preference?", answer: "3 BHK" },
    ],
  },
  {
    id: "lead-109", name: "D***** T*****", phone: "70XXX XX912", email: "d*****@gmail.com",
    createdAt: "2026-03-17T20:18:00", updatedAt: "2026-03-18T14:30:00",
    enrichmentStatus: "enriched", aiQualification: "qualified",
    temperature: "warm", leadStatus: "intent_qualified", leadStage: "site_visit_done",
    verified: true, sql: true,
    crmSync: { status: "pushed", pushedAt: "2026-03-17T20:25:00", crmRecordId: "Contact #4505",
      syncHistory: [
        { date: "Mar 17, 8:25 PM", action: "Pushed to CRM (auto-sync)" },
        { date: "Mar 18, 2:30 PM", action: "Stage updated: Contacted → Site Visit Done (synced from CRM)" },
      ] },
    campaign: "Godrej Air Phase 3", adset: "Sarjapur IT Corridor", adName: "Godrej Air Amenities Carousel",
    formResponses: [
      { question: "Budget range?", answer: "₹1.5Cr - ₹2Cr" },
      { question: "Configuration preference?", answer: "3 BHK" },
      { question: "Timeline to purchase?", answer: "Within 3 months" },
      { question: "Current location?", answer: "HSR Layout" },
    ],
  },
  {
    id: "lead-110", name: "G***** P*****", phone: "95XXX XX671", email: "g*****@yahoo.com",
    createdAt: "2026-03-17T14:55:00", updatedAt: "2026-03-17T14:55:00",
    enrichmentStatus: "failed", aiQualification: "pending",
    temperature: "cold", leadStatus: "duplicate", leadStage: "new",
    verified: false, sql: false,
    crmSync: { status: "failed", failReason: "Duplicate phone number found in CRM" },
    campaign: "Godrej Air Phase 3", adset: "Broad Bangalore — 25-55", adName: "Godrej Air Lifestyle Video",
    formResponses: [
      { question: "Budget range?", answer: "Not specified" },
      { question: "Configuration preference?", answer: "Any" },
    ],
  },
  {
    id: "lead-111", name: "T***** A*****", phone: "85XXX XX390", email: "t*****@gmail.com",
    createdAt: "2026-03-17T11:30:00", updatedAt: "2026-03-18T10:00:00",
    enrichmentStatus: "enriched", aiQualification: "qualified",
    temperature: "warm", leadStatus: "intent_qualified", leadStage: "won",
    verified: true, sql: true,
    crmSync: { status: "pushed", pushedAt: "2026-03-17T11:35:00", crmRecordId: "Contact #4500",
      syncHistory: [
        { date: "Mar 17, 11:35 AM", action: "Pushed to CRM (auto-sync)" },
        { date: "Mar 18, 10:00 AM", action: "Stage updated: Negotiation → Won (synced from CRM)" },
      ] },
    campaign: "Godrej Air Phase 3", adset: "Whitefield HNI — 30-45", adName: "Godrej Air 3BHK Carousel v2",
    formResponses: [
      { question: "Budget range?", answer: "₹2Cr - ₹3Cr" },
      { question: "Configuration preference?", answer: "4 BHK Penthouse" },
      { question: "Timeline to purchase?", answer: "Immediate" },
      { question: "Current location?", answer: "MG Road" },
    ],
  },
  {
    id: "lead-112", name: "H***** V*****", phone: "93XXX XX148", email: "h*****@gmail.com",
    createdAt: "2026-03-16T19:42:00", updatedAt: "2026-03-17T09:15:00",
    enrichmentStatus: "enriched", aiQualification: "not_qualified",
    temperature: "cold", leadStatus: "invalid", leadStage: "lost",
    verified: false, sql: false,
    crmSync: { status: "not_synced" },
    campaign: "Godrej Air Phase 3", adset: "Broad Bangalore — 25-55", adName: "Godrej Air Floor Plan Static",
    formResponses: [
      { question: "Budget range?", answer: "Below ₹70L" },
      { question: "Timeline to purchase?", answer: ">12 months" },
    ],
  },
];

// ── Analysis Tab Data ───────────────────────────────────────

export interface AnalysisMetric {
  label: string;
  value: string | number;
  subtext?: string;
}

export const analysisMetrics = {
  row1: [
    { label: "Total spend", value: "₹2.2L", subtext: "₹2,20,000" },
    { label: "Total leads", value: 186 },
    { label: "CPL", value: "₹1,183" },
    { label: "Margin %", value: "1.4%", subtext: "vs target ₹1,200" },
    { label: "Daily budget", value: "₹8,000" },
    { label: "Trend", value: "Improving", subtext: "Last 7 days" },
  ] as AnalysisMetric[],
  row2: [
    { label: "Verified leads", value: 42, subtext: "22.6% rate" },
    { label: "AI qualified", value: 34, subtext: "18.3% rate" },
    { label: "CPVL", value: "₹5,238", subtext: "Cost per verified" },
    { label: "Qualified Leads", value: 22, subtext: "11.8% rate" },
    { label: "CPQL", value: "₹10,000", subtext: "Cost per qualified lead" },
    { label: "Sent to CRM", value: 18, subtext: "81.8% of qualified" },
  ] as AnalysisMetric[],
};

export interface CPLDataPoint {
  date: string;
  cpl: number;
  target: number;
}

export const cplTrendData: CPLDataPoint[] = [
  { date: "Feb 20", cpl: 1450, target: 1200 },
  { date: "Feb 24", cpl: 1380, target: 1200 },
  { date: "Feb 28", cpl: 1320, target: 1200 },
  { date: "Mar 4", cpl: 1280, target: 1200 },
  { date: "Mar 8", cpl: 1250, target: 1200 },
  { date: "Mar 12", cpl: 1190, target: 1200 },
  { date: "Mar 16", cpl: 1210, target: 1200 },
  { date: "Mar 20", cpl: 1183, target: 1200 },
];

export type DiagnosisVerb =
  | "Pause"
  | "Increase"
  | "Refresh"
  | "Shift"
  | "Add"
  | "Investigate"
  | "Maintain";

export interface DiagnosisHeadlineAction {
  verb: DiagnosisVerb;
  target: string;
  outcome: string;
  expected_impact: string;
  cta_label: string;
  cta_href: string;
}

export interface DiagnosisReason {
  text: string;
  evidence: { stage: "TOF" | "MOF" | "BOF"; fact: string }[];
}

export const campaignDiagnosis = {
  status: "near-target" as "on-target" | "near-target" | "off-target",
  headline_action: {
    verb: "Pause" as DiagnosisVerb,
    target: "Broad Bangalore — 25-55 adset",
    outcome:
      "Stop ₹3K/day burning on traffic that isn't qualifying — 0 qualified leads from this audience after ₹63K spent.",
    expected_impact:
      "Frees ~₹25K over the remaining 8 days; CPQL drops ~22% if reallocated to Whitefield HNI.",
    cta_label: "Review in Settings",
    cta_href: "/campaigns/camp-7?tab=settings",
  },
  summary:
    "Campaign is NEAR TARGET — CPL ₹1,183 is 1.4% below target ₹1,200. Improving trend visible in second half of the flight.",
  reasons: [
    {
      text: "Broad Bangalore is dragging the campaign — CTR 0.9% leads to verification rate of just 11% and 0 qualified leads.",
      evidence: [
        { stage: "TOF" as const, fact: "CTR 0.9% vs 2.4% top adset" },
        { stage: "MOF" as const, fact: "Verify 11% vs 31% top adset" },
        { stage: "BOF" as const, fact: "0 qualified leads in 14 days" },
      ],
    },
    {
      text: "Whitefield HNI is the project's growth engine — converts 19% of leads to qualified and produces 4 of 7 site visits.",
      evidence: [
        { stage: "TOF" as const, fact: "CTR 2.4%" },
        { stage: "MOF" as const, fact: "Verify 31%" },
        { stage: "BOF" as const, fact: "4 site visits attributed" },
      ],
    },
    {
      text: "Form bracket 'Below ₹1Cr' generates 27% of leads but 0% qualify — audience too broad for a ₹2.5Cr property.",
      evidence: [
        { stage: "MOF" as const, fact: "50 leads from this bracket" },
        { stage: "BOF" as const, fact: "0 qualified, 0 site visits" },
      ],
    },
    {
      text: "Lifestyle Video creative shows fatigue — CTR dropped from 3.4% to 2.6% over 7 days as frequency rose to 3.18.",
      evidence: [
        { stage: "TOF" as const, fact: "CTR -22% in 7 days" },
        { stage: "TOF" as const, fact: "Frequency 3.18 (saturating)" },
      ],
    },
  ],
  recommendations: [
    "Shift 20% budget from Broad Bangalore to Whitefield HNI adset",
    "Refresh Lifestyle Video creative — try testimonial format",
    "Add Sarjapur Road as a separate adset (12% of qualified leads from there)",
    "Consider pausing Floor Plan Static ad — lowest CTR at 0.8%",
  ],
};

export interface AdSetRow {
  id: string;
  name: string;
  spend: number;
  leads: number;
  verifiedLeads: number;
  qualifiedLeads: number;
  cpl: number;
  cpql: number;
  margin: number;
  ctr: number;
  ctlPercent: number;
  enrichedPercent: number;
  aiQualPercent: number;
  sqlPercent: number;
  diagnosis: "on-track" | "needs-attention" | "pause-candidate";
}

export const adSetsData: AdSetRow[] = [
  {
    id: "adset-1",
    name: "Whitefield HNI — 30-45",
    spend: 95000,
    leads: 72,
    verifiedLeads: 22,
    qualifiedLeads: 14,
    cpl: 920,
    cpql: 6786,
    margin: -23.3,
    ctr: 2.4,
    ctlPercent: 4.2,
    enrichedPercent: 88,
    aiQualPercent: 42,
    sqlPercent: 19.4,
    diagnosis: "on-track",
  },
  {
    id: "adset-2",
    name: "Sarjapur IT Corridor",
    spend: 62000,
    leads: 58,
    verifiedLeads: 14,
    qualifiedLeads: 8,
    cpl: 1069,
    cpql: 7750,
    margin: -10.9,
    ctr: 1.9,
    ctlPercent: 3.6,
    enrichedPercent: 82,
    aiQualPercent: 34,
    sqlPercent: 13.8,
    diagnosis: "on-track",
  },
  {
    id: "adset-3",
    name: "Broad Bangalore — 25-55",
    spend: 63000,
    leads: 56,
    verifiedLeads: 6,
    qualifiedLeads: 0,
    cpl: 1680,
    cpql: 0,
    margin: 40,
    ctr: 0.9,
    ctlPercent: 2.1,
    enrichedPercent: 64,
    aiQualPercent: 14,
    sqlPercent: 0,
    diagnosis: "pause-candidate",
  },
];

// ── Metric Explorer Metadata ────────────────────────────────

export interface MetricMeta {
  key: string;
  label: string;
  category: "headline" | "funnel" | "cost" | "health";
  unit: "currency" | "percentage" | "number";
  currentValue: string;
  color: string;
}

export const metricsMeta: MetricMeta[] = [
  // Headlines (also selectable in explorer)
  { key: "spend", label: "Spend", category: "headline", unit: "currency", currentValue: "₹2.2L", color: "#1A1A1A" },
  { key: "leads", label: "Leads", category: "headline", unit: "number", currentValue: "186", color: "#1A1A1A" },
  { key: "qualified", label: "Qualified", category: "headline", unit: "number", currentValue: "22", color: "#1A1A1A" },
  { key: "cpl", label: "CPL", category: "headline", unit: "currency", currentValue: "₹1,183", color: "#1A1A1A" },
  // Funnel
  { key: "ctr", label: "CTR", category: "funnel", unit: "percentage", currentValue: "2.1%", color: "#3B82F6" },
  { key: "cvr", label: "CVR", category: "funnel", unit: "percentage", currentValue: "4.8%", color: "#3B82F6" },
  { key: "verificationRate", label: "Verification Rate", category: "funnel", unit: "percentage", currentValue: "22.6%", color: "#3B82F6" },
  { key: "aiQualRate", label: "AI Qual Rate", category: "funnel", unit: "percentage", currentValue: "18.3%", color: "#3B82F6" },
  { key: "sqlRate", label: "Qualification Rate", category: "funnel", unit: "percentage", currentValue: "11.8%", color: "#3B82F6" },
  // Cost
  { key: "cpm", label: "CPM", category: "cost", unit: "currency", currentValue: "₹245", color: "#F59E0B" },
  { key: "cpc", label: "CPC", category: "cost", unit: "currency", currentValue: "₹57", color: "#F59E0B" },
  { key: "cpvl", label: "CPVL", category: "cost", unit: "currency", currentValue: "₹5,238", color: "#F59E0B" },
  { key: "cpql", label: "CPQL", category: "cost", unit: "currency", currentValue: "₹10,000", color: "#F59E0B" },
  // Health
  { key: "frequency", label: "Frequency", category: "health", unit: "number", currentValue: "2.4", color: "#22C55E" },
  { key: "budgetPacing", label: "Budget Pacing", category: "health", unit: "percentage", currentValue: "97.5%", color: "#22C55E" },
];

export const healthIndicators = [
  { key: "ctr", label: "CTR", value: "2.1%", status: "green" as const },
  { key: "cvr", label: "CVR", value: "4.8%", status: "green" as const },
  { key: "cpl", label: "CPL vs Target", value: "₹1,183", status: "green" as const },
  { key: "cpm", label: "CPM", value: "₹245", status: "green" as const },
  { key: "budgetPacing", label: "Budget", value: "97.5%", status: "green" as const },
  { key: "frequency", label: "Frequency", value: "2.4", status: "green" as const },
];

// ── Settings Tab Data ───────────────────────────────────────

export interface ConnectedAdset {
  id: string;
  name: string;
  adsetId: string;
  status: "active" | "paused";
}

export const connectedAdsets: ConnectedAdset[] = [
  {
    id: "cas-1",
    name: "Whitefield HNI — 30-45",
    adsetId: "23851029384711",
    status: "active",
  },
  {
    id: "cas-2",
    name: "Sarjapur IT Corridor",
    adsetId: "23851029384712",
    status: "active",
  },
  {
    id: "cas-3",
    name: "Broad Bangalore — 25-55",
    adsetId: "23851029384713",
    status: "active",
  },
];

export interface ResponseField {
  id: string;
  fieldId: string;
  systemKey: string;
  defaultValue: string;
}

export const responseFormatFields: ResponseField[] = [
  { id: "rf-1", fieldId: "full_name", systemKey: "name", defaultValue: "" },
  { id: "rf-2", fieldId: "phone_number", systemKey: "phone", defaultValue: "" },
  { id: "rf-3", fieldId: "email", systemKey: "email", defaultValue: "" },
  {
    id: "rf-4",
    fieldId: "budget_range",
    systemKey: "budget",
    defaultValue: "Not specified",
  },
  {
    id: "rf-5",
    fieldId: "configuration",
    systemKey: "config",
    defaultValue: "Any",
  },
  {
    id: "rf-6",
    fieldId: "purchase_timeline",
    systemKey: "timeline",
    defaultValue: "Not specified",
  },
];

// ── Projects Data ───────────────────────────────────────────

export interface ProjectItem {
  id: string;
  name: string;
  client: string;
  category: string;
  status: "active" | "paused" | "completed";
  campaignIds: string[];
  totalSpend: number;
  totalLeads: number;
  verifiedLeads: number;
  qualifiedLeads: number;
  avgCPL: number;
  createdAt: string;
  costPerVerifiedLead: number;
  costPerQualifiedLead: number;
  verificationRate: number;
  qualificationRate: number;
  ctr: number;
  cpm: number;
  activeCampaigns: number;
}

export const projectsList: ProjectItem[] = [
  {
    id: "proj-1",
    name: "Whitefield Luxury Villas",
    client: "Godrej Properties",
    category: "Real Estate",
    status: "active",
    campaignIds: ["camp-1", "camp-10"],
    totalSpend: 233000,
    totalLeads: 278,
    verifiedLeads: 46,
    qualifiedLeads: 22,
    avgCPL: 838,
    createdAt: "2025-12-01",
    costPerVerifiedLead: 5065,
    costPerQualifiedLead: 10590,
    verificationRate: 16.5,
    qualificationRate: 7.9,
    ctr: 1.8,
    cpm: 285,

    activeCampaigns: 2,
  },
  {
    id: "proj-2",
    name: "Godrej Air — Phase 3 Launch",
    client: "Godrej Properties",
    category: "Real Estate",
    status: "active",
    campaignIds: ["camp-7"],
    totalSpend: 220000,
    totalLeads: 186,
    verifiedLeads: 42,
    qualifiedLeads: 22,
    avgCPL: 1183,
    createdAt: "2025-11-15",
    costPerVerifiedLead: 5238,
    costPerQualifiedLead: 10000,
    verificationRate: 22.6,
    qualificationRate: 8.1,
    ctr: 2.1,
    cpm: 320,

    activeCampaigns: 1,
  },
  {
    id: "proj-3",
    name: "Godrej Eternity — Pre-launch",
    client: "Godrej Properties",
    category: "Real Estate",
    status: "active",
    campaignIds: ["camp-2"],
    totalSpend: 142000,
    totalLeads: 156,
    verifiedLeads: 22,
    qualifiedLeads: 11,
    avgCPL: 910,
    createdAt: "2026-01-08",
    costPerVerifiedLead: 6454,
    costPerQualifiedLead: 12800,
    verificationRate: 14.1,
    qualificationRate: 6.4,
    ctr: 1.5,
    cpm: 245,

    activeCampaigns: 1,
  },
  {
    id: "proj-4",
    name: "Godrej Summit — Full Funnel",
    client: "Godrej Properties",
    category: "Real Estate",
    status: "completed",
    campaignIds: ["camp-9"],
    totalSpend: 310000,
    totalLeads: 340,
    verifiedLeads: 58,
    qualifiedLeads: 29,
    avgCPL: 912,
    createdAt: "2025-09-10",
    costPerVerifiedLead: 5344,
    costPerQualifiedLead: 11200,
    verificationRate: 17.1,
    qualificationRate: 8.2,
    ctr: 1.9,
    cpm: 310,

    activeCampaigns: 0,
  },
];

export function getProjectCampaigns(projectId: string) {
  const project = projectsList.find((p) => p.id === projectId);
  if (!project) return [];
  return campaignsList.filter((c) => project.campaignIds.includes(c.id));
}

// ── Project-Level Insights (AI-generated, mocked) ──────────────────────────

export type ProjectInsightVerb =
  | "Reallocate"
  | "Pause"
  | "Scale"
  | "Refresh"
  | "Tighten"
  | "Investigate"
  | "Maintain";

export interface ProjectFinding {
  id: string;
  icon: "🎯" | "⚠️" | "📈" | "🎨" | "📞" | "✅" | "🔻";
  title: string;
  narrative: string;
  funnel_evidence: { stage: "TOF" | "MOF" | "BOF"; fact: string }[];
  scope: "audience" | "creative" | "form_signal" | "campaign" | "funnel" | "trend";
  tone: "positive" | "neutral" | "concern";
}

export interface ProjectInsights {
  project_status: "on-track" | "needs-attention" | "underperforming";
  headline_action: {
    verb: ProjectInsightVerb;
    target: string;
    outcome: string;
    expected_impact: string;
    cta_label: string;
    /** href to navigate to. May include query string to deep-link a tab. */
    cta_href: string;
  };
  summary: string;
  findings: ProjectFinding[];
  generated_at: string;
}

/**
 * Mock project insights for proj-1 (Whitefield Luxury Villas).
 * The findings are intentionally mixed in tone (positive + concern) so the UI
 * has variety to render across both the inline panel and the Diagnosis tab.
 */
export const projectInsights: ProjectInsights = {
  project_status: "needs-attention",
  headline_action: {
    verb: "Reallocate",
    target: "20% of budget from Retargeting → Whitefield HNI",
    outcome:
      "Concentrate spend on the audience converting to site visits — Retargeting's CPQL is 1.8× project average and the audience is saturating.",
    expected_impact:
      "Project CPQL drops ~30% (₹10.6K → ~₹7.4K); +3 site visits/month at current funnel rates.",
    cta_label: "Open Retargeting campaign",
    cta_href: "/campaigns/camp-10?tab=settings",
  },
  summary:
    "Across 2 campaigns spending ₹2.33L, qualification is at 7.9% (vs ~10% benchmark) with 22% of spend producing zero qualified leads. Whitefield HNI is your clear lever — 41% of qualified leads from 28% of spend.",
  findings: [
    {
      id: "pf-1",
      icon: "📈",
      title: "Whitefield HNI is your project's growth lever",
      narrative:
        "Across both campaigns, Whitefield HNI accounts for 41% of qualified leads from just 28% of spend — and 4 of 6 site visits trace back to it.",
      funnel_evidence: [
        { stage: "TOF", fact: "CTR 2.4% vs 1.6% project avg" },
        { stage: "MOF", fact: "Verify 31% vs 16% project avg" },
        { stage: "BOF", fact: "4 of 6 site visits attributed" },
      ],
      scope: "audience",
      tone: "positive",
    },
    {
      id: "pf-2",
      icon: "🔻",
      title: "'Below ₹1Cr' budget bracket is leaking spend",
      narrative:
        "102 leads (37% of total) come from the 'Below ₹1Cr' budget bracket — but 0 of them qualify and 0 reach site visit. The audience is too broad for a ₹2.5Cr property.",
      funnel_evidence: [
        { stage: "MOF", fact: "Verify 6% vs 16% avg" },
        { stage: "BOF", fact: "0 qualified, 0 site visits" },
        { stage: "BOF", fact: "Top DQ reason: 'Budget' (52%)" },
      ],
      scope: "form_signal",
      tone: "concern",
    },
    {
      id: "pf-3",
      icon: "⚠️",
      title: "Broad Bangalore audience is saturating",
      narrative:
        "Frequency has climbed to 4.05 across 3 campaigns running this audience; CTR has dropped to 0.95% with only 9% verification.",
      funnel_evidence: [
        { stage: "TOF", fact: "Frequency 4.05 (>3.0 saturation line)" },
        { stage: "TOF", fact: "CTR 0.95% (-40% vs Whitefield)" },
        { stage: "MOF", fact: "Verify rate 9%" },
      ],
      scope: "audience",
      tone: "concern",
    },
    {
      id: "pf-4",
      icon: "🎨",
      title: "Lakeside 3BHK Carousel converts above its weight",
      narrative:
        "Carousel format drives 21% of impressions but 50% of qualified leads. Worth scaling and testing similar variants.",
      funnel_evidence: [
        { stage: "TOF", fact: "CTR 2.8% (project leader)" },
        { stage: "MOF", fact: "Verify 21%" },
        { stage: "BOF", fact: "11 of 22 qualified leads" },
      ],
      scope: "creative",
      tone: "positive",
    },
    {
      id: "pf-5",
      icon: "📞",
      title: "Half of disqualifications cite 'Budget below threshold'",
      narrative:
        "32 of 62 voice agent disqualifications cite the same reason — your TOF audience is bringing in too many sub-budget leads. Tighten interest/lookalike targeting.",
      funnel_evidence: [
        { stage: "MOF", fact: "124 leads in '₹1Cr-₹2Cr' bracket" },
        { stage: "BOF", fact: "32 budget-based DQs (52%)" },
      ],
      scope: "funnel",
      tone: "concern",
    },
    {
      id: "pf-6",
      icon: "✅",
      title: "'Past site visitors' retargeting converts 100%",
      narrative:
        "Both qualified leads from this audience visited the site — small pool but a strong signal. Worth scaling cautiously with tight frequency cap.",
      funnel_evidence: [
        { stage: "MOF", fact: "Verify 3% (small pool)" },
        { stage: "BOF", fact: "2 of 2 qualified → site visit" },
      ],
      scope: "audience",
      tone: "positive",
    },
  ],
  generated_at: "2 hours ago",
};


export const settingsData = {
  channelConfig: {
    platform: "Meta",
    pageId: "109284756301",
    campaignId: "23851029384710",
  },
  sequenceSettings: {
    aiCallingEnabled: true,
    maxAttempts: 3,
    callInterval: "4 hours",
  },
  crmSettings: {
    sendQLeadToCRM: true,
    sendIQLeadToCRM: false,
    autoSendConfig: {
      enabled: true,
      trigger: "on_qualification",
      delay: "0",
      destination: "salesforce",
    },
  },
  notifications: {
    emailOnNewLead: true,
    emailOnQualification: true,
    slackIntegration: false,
    dailyDigest: true,
  },
};

// ── Lead Distribution / Verification Dashboard Data ────────

export const leadDistributionData = {
  ageGroups: [
    { label: "18-24", count: 42 },
    { label: "25-34", count: 89 },
    { label: "35-44", count: 67 },
    { label: "45-54", count: 34 },
    { label: "55+", count: 12 },
  ],
  locations: [
    { label: "Bangalore", count: 98 },
    { label: "Mumbai", count: 34 },
    { label: "Delhi NCR", count: 22 },
    { label: "Hyderabad", count: 18 },
    { label: "Other", count: 14 },
  ],
  budgetRanges: [
    { label: "Below ₹1Cr", count: 45 },
    { label: "₹1-2Cr", count: 72 },
    { label: "₹2-3Cr", count: 48 },
    { label: "₹3Cr+", count: 21 },
  ],
  temperatures: [
    { label: "Hot", count: 34 },
    { label: "Warm", count: 67 },
    { label: "Lukewarm", count: 56 },
    { label: "Cold", count: 29 },
  ],
  netWorth: [
    { label: "0-50L", count: 52 },
    { label: "50L-1Cr", count: 38 },
    { label: "1-2Cr", count: 65 },
    { label: "2-5Cr", count: 31 },
  ],
  seniorityLevel: [
    { label: "Senior", count: 42 },
    { label: "Management", count: 56 },
    { label: "Executive", count: 34 },
    { label: "Other", count: 54 },
  ],
};
