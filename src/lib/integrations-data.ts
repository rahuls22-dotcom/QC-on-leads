// Integrations mock data

export interface AdAccount {
  id: string;
  platform: "meta" | "google" | "linkedin";
  name: string;
  label: string;
  description: string;
  connected: boolean;
  accountName?: string;
  activeCampaigns?: number;
  monthlySpend?: string;
}

export const adAccounts: AdAccount[] = [
  {
    id: "ad-meta",
    platform: "meta",
    name: "Meta Business Manager",
    label: "Meta",
    description: "Connect your Meta ad account to import campaigns and sync leads.",
    connected: true,
    accountName: "Godrej Properties Ad Account",
    activeCampaigns: 5,
    monthlySpend: "₹2.1L/mo",
  },
  {
    id: "ad-google",
    platform: "google",
    name: "Google Ads",
    label: "Google",
    description: "Connect Google Ads to import search and display campaigns.",
    connected: true,
    accountName: "Godrej Properties Google",
    activeCampaigns: 4,
    monthlySpend: "₹1.8L/mo",
  },
  {
    id: "ad-linkedin",
    platform: "linkedin",
    name: "LinkedIn Campaign Manager",
    label: "LinkedIn",
    description: "Connect LinkedIn for B2B lead generation campaigns.",
    connected: false,
  },
];

export interface CRMOption {
  id: string;
  name: string;
  connected: boolean;
  connectedAgo?: string;
}

export const crmOptions: CRMOption[] = [
  { id: "crm-ghl", name: "GoHighLevel", connected: true, connectedAgo: "14 days ago" },
  { id: "crm-hubspot", name: "HubSpot", connected: false },
  { id: "crm-salesforce", name: "Salesforce", connected: false },
  { id: "crm-other", name: "Other", connected: false },
];

export interface AutoSyncRule {
  id: string;
  label: string;
  helper: string;
  enabled: boolean;
}

export const autoSyncRules: AutoSyncRule[] = [
  {
    id: "sync-qualified",
    label: "Push qualified leads automatically",
    helper: "Leads with status 'Intent Qualified' are pushed immediately after AI qualification",
    enabled: true,
  },
  {
    id: "sync-interested",
    label: "Push interested leads to nurture",
    helper: "Leads marked 'Interested but Not Ready' go to a separate nurture pipeline",
    enabled: false,
  },
  {
    id: "sync-unqualified",
    label: "Push unqualified leads",
    helper: "Not recommended — keeps your CRM pipeline clean",
    enabled: false,
  },
  {
    id: "sync-stage-back",
    label: "Sync stage changes from CRM back to Revspot",
    helper: "When your sales team updates a lead stage in GoHighLevel, it syncs back here",
    enabled: true,
  },
];

export interface FieldMapping {
  id: string;
  revspotField: string;
  crmField: string;
  defaultValue: string;
}

export const fieldMappings: FieldMapping[] = [
  { id: "fm-1", revspotField: "Full Name", crmField: "contact_name", defaultValue: "" },
  { id: "fm-2", revspotField: "Phone", crmField: "phone", defaultValue: "" },
  { id: "fm-3", revspotField: "Email", crmField: "email", defaultValue: "" },
  { id: "fm-4", revspotField: "Lead Status", crmField: "custom.revspot_status", defaultValue: "" },
  { id: "fm-5", revspotField: "Temperature", crmField: "custom.lead_temp", defaultValue: "" },
  { id: "fm-6", revspotField: "Source Campaign", crmField: "custom.source_campaign", defaultValue: "" },
  { id: "fm-7", revspotField: "AI Qualification", crmField: "custom.ai_qualified", defaultValue: "" },
  { id: "fm-8", revspotField: "Call Recording URL", crmField: "custom.recording_url", defaultValue: "" },
  { id: "fm-9", revspotField: "Project Name", crmField: "custom.project", defaultValue: "(from campaign)" },
];

export interface StageMapping {
  revspotStage: string;
  crmStage: string;
}

export const stageMappings: StageMapping[] = [
  { revspotStage: "New", crmStage: "New Lead" },
  { revspotStage: "Contacted", crmStage: "Attempted Contact" },
  { revspotStage: "Site Visit Scheduled", crmStage: "Appointment Set" },
  { revspotStage: "Site Visit Done", crmStage: "Qualified" },
  { revspotStage: "Negotiation", crmStage: "Proposal Sent" },
  { revspotStage: "Won", crmStage: "Closed Won" },
  { revspotStage: "Lost", crmStage: "Closed Lost" },
];

export const ghlStageOptions = [
  "New Lead",
  "Attempted Contact",
  "Contacted",
  "Appointment Set",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
  "Nurture",
];

export interface SyncLogEntry {
  id: string;
  time: string;
  leadName: string;
  action: string;
  status: "success" | "failed";
  details: string;
}

export const syncLog: SyncLogEntry[] = [
  { id: "sl-1", time: "2 min ago", leadName: "V***** R*****", action: "Push to CRM", status: "success", details: "Created contact #4521" },
  { id: "sl-2", time: "15 min ago", leadName: "G***** M***", action: "Push to CRM", status: "failed", details: "Duplicate phone number" },
  { id: "sl-3", time: "18 min ago", leadName: "Stage sync", action: "CRM → Revspot", status: "success", details: "3 stages updated" },
  { id: "sl-4", time: "42 min ago", leadName: "A***** K*****", action: "Push to CRM", status: "success", details: "Created contact #4520" },
  { id: "sl-5", time: "1 hr ago", leadName: "S***** M*****", action: "Push to CRM", status: "success", details: "Created contact #4519" },
  { id: "sl-6", time: "1 hr ago", leadName: "P***** J*****", action: "Push to CRM", status: "success", details: "Updated contact #4401" },
  { id: "sl-7", time: "2 hr ago", leadName: "R***** B*****", action: "Push to CRM", status: "success", details: "Created contact #4518" },
  { id: "sl-8", time: "3 hr ago", leadName: "Stage sync", action: "CRM → Revspot", status: "success", details: "5 stages updated" },
  { id: "sl-9", time: "4 hr ago", leadName: "N***** D*****", action: "Push to CRM", status: "failed", details: "CRM rate limit exceeded" },
  { id: "sl-10", time: "5 hr ago", leadName: "M***** S*****", action: "Push to CRM", status: "success", details: "Created contact #4517" },
];
