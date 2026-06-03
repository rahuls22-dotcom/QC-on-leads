"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type WorkspaceType = "agency" | "client";

export type FlowStub = { id: string; name: string; status: "live" | "draft" | "paused"; runs: number; conversion: number };

export type DashboardStats = {
  leadsInFlow: number;
  handedOffCRM: number;
  svScheduled: number;
  svDone: number;
  qualifiedRate: string;
  activeCampaigns: number;
};

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  initials: string;
  color: string;
  waba?: string;
  vendor?: string;
  category?: string;
  accountManager?: string;
  // Per-workspace data
  flows: FlowStub[];
  stats: DashboardStats;
  projectCount: number;
  campaignCount: number;
  // CRM config
  primaryCRM?: { name: string; type: "zoho" | "ghl" | "custom"; url?: string };
  secondaryCRM?: { name: string; type: "zoho" | "ghl" | "custom"; url?: string };
};

type WorkspaceContextType = {
  currentWorkspace: Workspace;
  agencyWorkspace: Workspace;
  clientWorkspaces: Workspace[];
  switchWorkspace: (id: string) => void;
  addClient: (client: Omit<Workspace, "flows" | "stats" | "projectCount" | "campaignCount">) => void;
  updateWorkspaceFlows: (workspaceId: string, flows: FlowStub[]) => void;
  isAgency: boolean;
};

// ── Seed data ─────────────────────────────────────────────────────────────────

const TOFU_MASTER: FlowStub = {
  id: "master", name: "TOFU Master Flow", status: "live", runs: 3841, conversion: 41,
};

const PROPSTAR: Workspace = {
  id: "propstar",
  name: "PropStar",
  type: "agency",
  initials: "PS",
  color: "#f97316",
  waba: "+91 98765 00000",
  vendor: "Wati",
  flows: [TOFU_MASTER],
  stats: { leadsInFlow: 1240, handedOffCRM: 482, svScheduled: 218, svDone: 147, qualifiedRate: "38%", activeCampaigns: 8 },
  projectCount: 8,
  campaignCount: 24,
  primaryCRM: { name: "Zoho CRM", type: "zoho" },
};

const GODREJ: Workspace = {
  id: "godrej",
  name: "Godrej Properties",
  type: "client",
  initials: "GP",
  color: "#2563eb",
  waba: "+91 80 4716 5400",
  vendor: "Wati",
  category: "Real Estate",
  accountManager: "Rahul Soren",
  flows: [
    TOFU_MASTER,
    { id: "gd_1", name: "Lead Qualified — SV push (10 messages)", status: "live", runs: 624, conversion: 52 },
    { id: "gd_2", name: "SV Scheduled — Pre-visit (4 touchpoints)", status: "live", runs: 318, conversion: 71 },
    { id: "gd_3", name: "Visit Missed — Re-engagement", status: "paused", runs: 184, conversion: 29 },
  ],
  stats: { leadsInFlow: 482, handedOffCRM: 251, svScheduled: 89, svDone: 53, qualifiedRate: "41%", activeCampaigns: 3 },
  projectCount: 3,
  campaignCount: 9,
  primaryCRM: { name: "Zoho CRM", type: "zoho" },
};

const CONSIGN: Workspace = {
  id: "consign",
  name: "Consign Realty",
  type: "client",
  initials: "CR",
  color: "#16a34a",
  waba: "+91 90 1234 5678",
  vendor: "Gupshup",
  category: "Real Estate",
  accountManager: "Ankit Mehta",
  flows: [
    TOFU_MASTER,
    { id: "cs_1", name: "New Lead — WhatsApp warm-up (3 messages)", status: "live", runs: 892, conversion: 36 },
    { id: "cs_2", name: "Bully Bot — Off-hours RNR dialling", status: "live", runs: 4200, conversion: 58 },
  ],
  stats: { leadsInFlow: 312, handedOffCRM: 148, svScheduled: 44, svDone: 31, qualifiedRate: "35%", activeCampaigns: 2 },
  projectCount: 2,
  campaignCount: 6,
  // Dual CRM — qualified → Consign's own CRM, unverified → PropStar Zoho
  primaryCRM:   { name: "Consign CRM", type: "custom", url: "https://crm.consignrealty.com/webhook/leads" },
  secondaryCRM: { name: "PropStar Zoho", type: "zoho" },
};

const MANA: Workspace = {
  id: "mana",
  name: "Mana Realty",
  type: "client",
  initials: "MR",
  color: "#7c3aed",
  waba: "+91 80 8765 4321",
  vendor: "Wati",
  category: "Real Estate",
  accountManager: "Priya Sharma",
  flows: [
    TOFU_MASTER,
    { id: "mn_1", name: "Form Fill → Auto-WhatsApp + S1 routing", status: "live", runs: 3841, conversion: 41 },
    { id: "mn_2", name: "Bully Bot — 7-day churn", status: "live", runs: 8204, conversion: 58 },
    { id: "mn_3", name: "Voice AI cold outbound → qualify", status: "draft", runs: 0, conversion: 0 },
  ],
  stats: { leadsInFlow: 891, handedOffCRM: 391, svScheduled: 142, svDone: 98, qualifiedRate: "44%", activeCampaigns: 4 },
  projectCount: 4,
  campaignCount: 12,
  primaryCRM: { name: "GoHighLevel", type: "ghl", url: "https://services.leadconnectorhq.com/hooks/jo5DsuSiOp7Xgiq4Hkae/webhook-trigger/e5375943-4dde-4678-a73c-56a171392203" },
};

// ── Context ───────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextType>({
  currentWorkspace: PROPSTAR,
  agencyWorkspace: PROPSTAR,
  clientWorkspaces: [GODREJ, CONSIGN, MANA],
  switchWorkspace: () => {},
  addClient: () => {},
  updateWorkspaceFlows: () => {},
  isAgency: true,
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<string>(PROPSTAR.id);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([PROPSTAR, GODREJ, CONSIGN, MANA]);

  const currentWorkspace = workspaces.find(w => w.id === current) || PROPSTAR;
  const agencyWorkspace  = workspaces.find(w => w.type === "agency") || PROPSTAR;
  const clientWorkspaces = workspaces.filter(w => w.type === "client");

  const switchWorkspace = (id: string) => setCurrent(id);

  const addClient = (client: Omit<Workspace, "flows" | "stats" | "projectCount" | "campaignCount">) => {
    const newWs: Workspace = {
      ...client,
      flows: [TOFU_MASTER],
      stats: { leadsInFlow: 0, handedOffCRM: 0, svScheduled: 0, svDone: 0, qualifiedRate: "—", activeCampaigns: 0 },
      projectCount: 0,
      campaignCount: 0,
    };
    setWorkspaces(prev => [...prev, newWs]);
  };

  const updateWorkspaceFlows = (workspaceId: string, flows: FlowStub[]) => {
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, flows } : w));
  };

  return (
    <WorkspaceContext.Provider value={{
      currentWorkspace, agencyWorkspace, clientWorkspaces,
      switchWorkspace, addClient, updateWorkspaceFlows,
      isAgency: currentWorkspace.type === "agency",
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
