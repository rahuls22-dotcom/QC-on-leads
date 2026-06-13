import { create } from "zustand";
import type { AgentListItem } from "./types/agent";
import type { WorkflowListItem } from "./types/workflow";

export interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "draft";
  platform: string;
  budget: number;
  spent: number;
  leads: number;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  campaignCount: number;
  status: "active" | "archived";
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  verified: boolean;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string[];
  createdAt: string;
}

export interface ConnectedAccount {
  id: string;
  platform: string;
  accountName: string;
  status: "connected" | "disconnected" | "error";
}

// Legacy types kept for backward compatibility
export interface VoiceAgent {
  id: string;
  name: string;
  status: "active" | "inactive" | "training";
  callsMade: number;
  successRate: number;
  createdAt: string;
}

export interface CompanyProfile {
  companyName: string;
  industry: string;
  logoUrl?: string;
  userName: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  href: string;
}

interface AppState {
  connectedAccounts: ConnectedAccount[];
  campaigns: Campaign[];
  projects: Project[];
  leads: Lead[];
  contacts: Contact[];
  agents: AgentListItem[];
  sequences: WorkflowListItem[];
  voiceAgents: VoiceAgent[];

  // Onboarding
  onboardingComplete: boolean;
  companyProfile: CompanyProfile | null;
  gettingStartedChecklist: ChecklistItem[];
  checklistDismissed: boolean;

  setConnectedAccounts: (accounts: ConnectedAccount[]) => void;
  setCampaigns: (campaigns: Campaign[]) => void;
  setProjects: (projects: Project[]) => void;
  setLeads: (leads: Lead[]) => void;
  setContacts: (contacts: Contact[]) => void;
  setAgents: (agents: AgentListItem[]) => void;
  setSequences: (sequences: WorkflowListItem[]) => void;
  setVoiceAgents: (agents: VoiceAgent[]) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setCompanyProfile: (profile: CompanyProfile) => void;
  completeChecklistItem: (key: string) => void;
  dismissChecklist: () => void;
}

const defaultChecklist: ChecklistItem[] = [
  { key: "company", label: "Set up your organization", completed: false, href: "/onboarding" },
  { key: "ad_account", label: "Connect ad account", completed: false, href: "/onboarding" },
  { key: "project", label: "Create your first project", completed: false, href: "/onboarding" },
  { key: "agent", label: "Set up a voice agent", completed: false, href: "/agents" },
];

export const useAppStore = create<AppState>((set) => ({
  connectedAccounts: [],
  campaigns: [],
  projects: [],
  leads: [],
  contacts: [],
  agents: [],
  sequences: [],
  voiceAgents: [],

  onboardingComplete: false,
  companyProfile: null,
  gettingStartedChecklist: defaultChecklist,
  checklistDismissed: false,

  setConnectedAccounts: (accounts) => set({ connectedAccounts: accounts }),
  setCampaigns: (campaigns) => set({ campaigns }),
  setProjects: (projects) => set({ projects }),
  setLeads: (leads) => set({ leads }),
  setContacts: (contacts) => set({ contacts }),
  setAgents: (agents) => set({ agents }),
  setSequences: (sequences) => set({ sequences }),
  setVoiceAgents: (agents) => set({ voiceAgents: agents }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  setCompanyProfile: (profile) => set({ companyProfile: profile }),
  completeChecklistItem: (key) =>
    set((state) => ({
      gettingStartedChecklist: state.gettingStartedChecklist.map((item) =>
        item.key === key ? { ...item, completed: true } : item
      ),
    })),
  dismissChecklist: () => set({ checklistDismissed: true }),
}));
