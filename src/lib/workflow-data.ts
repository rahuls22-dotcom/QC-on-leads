// Sequence mock data — cadence engine layer

import type {
  Workflow,
  WorkflowListItem,
  SequenceLogEntry,
  FollowUpRule,
} from "./types/workflow";
import type { WorkflowContact } from "./types/common";

// ─── Default Follow-Up Rules ────────────────────────────────────────

export const defaultFollowUpRules: FollowUpRule[] = [
  { id: "fr-1", outcome: "no_answer", action: "retry", delay_hours: 4, description: "No answer → Retry in 4 hours" },
  { id: "fr-2", outcome: "partially_qualified", action: "follow_up", delay_hours: 48, description: "Partially qualified → Follow up in 2 days" },
  { id: "fr-3", outcome: "callback", action: "follow_up", delay_hours: 24, description: "Callback requested → Follow up in 24 hours" },
  { id: "fr-4", outcome: "voicemail", action: "retry", delay_hours: 6, description: "Voicemail → Retry in 6 hours" },
  { id: "fr-5", outcome: "not_interested", action: "stop", delay_hours: 0, description: "Not interested → Stop sequence" },
];

// ─── Outcome Options (for follow-up rule builder) ───────────────────

export const outcomeOptions = [
  "No answer",
  "Voicemail",
  "Partially qualified",
  "Callback requested",
  "Not interested",
  "Qualified",
  "Wrong number",
];

export const actionOptions: FollowUpRule["action"][] = ["retry", "follow_up", "stop"];

// ─── Sequence List ──────────────────────────────────────────────────

export const workflowsList: WorkflowListItem[] = [
  {
    id: "wf-1",
    name: "Godrej Reflections — Lead Qualification",
    description: "Qualify inbound leads from Godrej Reflections campaign via voice calls",
    trigger_type: "csv_upload",
    agent_names: ["Priya — Qualification Agent"],
    status: "active",
    progress: 70.2,
    stats: {
      totalContacts: 487, called: 342, connected: 268,
      qualified: 89, notQualified: 142, callback: 37, noAnswer: 74,
    },
    createdAt: "2026-03-18",
  },
  {
    id: "wf-2",
    name: "Godrej Eternity — Re-engagement",
    description: "Re-engage cold leads from Godrej Eternity campaign",
    trigger_type: "csv_upload",
    agent_names: ["Arjun — Follow-up Agent"],
    status: "completed",
    progress: 100,
    stats: {
      totalContacts: 215, called: 215, connected: 178,
      qualified: 52, notQualified: 98, callback: 28, noAnswer: 37,
    },
    createdAt: "2026-03-10",
  },
  {
    id: "wf-3",
    name: "Godrej Air — Site Visit Follow-up",
    description: "Follow up with leads who showed interest in site visits",
    trigger_type: "csv_upload",
    agent_names: ["Priya — Qualification Agent"],
    status: "scheduled",
    progress: 0,
    stats: {
      totalContacts: 64, called: 0, connected: 0,
      qualified: 0, notQualified: 0, callback: 0, noAnswer: 0,
    },
    createdAt: "2026-03-22",
  },
  {
    id: "wf-4",
    name: "Scripbox — Quality-Based Routing",
    description: "Route high-quality leads to humans, others to AI agent for onboarding",
    trigger_type: "crm_webhook",
    agent_names: ["Priya — Qualification Agent", "Arjun — Follow-up Agent"],
    status: "active",
    progress: 45.5,
    stats: {
      totalContacts: 320, called: 146, connected: 112,
      qualified: 48, notQualified: 39, callback: 15, noAnswer: 34,
    },
    createdAt: "2026-03-20",
  },
];

// ─── Full Sequence Detail (for wf-1) ────────────────────────────────

export const workflowDetail: Workflow = {
  id: "wf-1",
  name: "Godrej Reflections — Lead Qualification",
  description: "Qualify inbound leads from Godrej Reflections campaign via voice calls",
  status: "active",
  trigger: {
    type: "csv_upload",
    config: { file_ref: "godrej_reflections_leads_mar2026.csv" },
  },
  default_step: {
    agent_id: "va-1",
    schedule: {
      daily_limit: 200,
      active_hours: { start: "10:00", end: "19:00" },
      active_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      retry: { enabled: true, max_retries: 2, interval_hours: 4 },
      follow_up_rules: defaultFollowUpRules,
    },
  },
  stats: {
    totalContacts: 487, called: 342, connected: 268,
    qualified: 89, notQualified: 142, callback: 37, noAnswer: 74,
  },
  progress: 70.2,
  createdAt: "2026-03-18",
};

// ─── Sequence with Routing (for wf-4) ──────────────────────────────

export const workflowWithRouting: Workflow = {
  id: "wf-4",
  name: "Scripbox — Quality-Based Routing",
  description: "Route high-quality leads to humans, others to AI agent for onboarding",
  status: "active",
  trigger: {
    type: "crm_webhook",
    config: { webhook_url: "https://api.revspot.io/webhooks/scripbox-leads" },
  },
  routing: {
    mode: "ai",
    ai_prompt:
      "Route leads based on their quality score. If the lead has a quality score of 80 or above, assign to a human sales rep. If the score is between 50-79, route to Priya qualification agent. If below 50, route to Arjun follow-up agent.",
    branches: [
      {
        id: "br-1",
        label: "High Quality (80+) → Human",
        agent_id: "human",
        schedule: {
          daily_limit: 50,
          active_hours: { start: "09:00", end: "18:00" },
          active_days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          retry: { enabled: false, max_retries: 0, interval_hours: 0 },
          follow_up_rules: [
            { id: "fr-h1", outcome: "no_response_24h", action: "follow_up", delay_hours: 24, description: "No response in 24h → Escalate to manager" },
          ],
        },
      },
      {
        id: "br-2",
        label: "Medium Quality (50-79) → AI",
        agent_id: "va-1",
        schedule: {
          daily_limit: 150,
          active_hours: { start: "10:00", end: "19:00" },
          active_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          retry: { enabled: true, max_retries: 3, interval_hours: 4 },
          follow_up_rules: [
            ...defaultFollowUpRules,
            { id: "fr-m1", outcome: "qualified", action: "stop", delay_hours: 0, description: "Qualified → Stop (CRM push handled by agent)" },
          ],
        },
      },
      {
        id: "br-3",
        label: "Low Quality (<50) → AI",
        agent_id: "va-2",
        schedule: {
          daily_limit: 200,
          active_hours: { start: "09:00", end: "21:00" },
          active_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          retry: { enabled: false, max_retries: 0, interval_hours: 0 },
          follow_up_rules: [
            { id: "fr-l1", outcome: "no_reply_24h", action: "follow_up", delay_hours: 24, description: "No reply 24h → Send reminder" },
            { id: "fr-l2", outcome: "no_reply_72h", action: "stop", delay_hours: 0, description: "No reply 72h → Stop sequence" },
            { id: "fr-l3", outcome: "not_interested", action: "stop", delay_hours: 0, description: "Not interested → Stop" },
          ],
        },
      },
    ],
  },
  stats: {
    totalContacts: 320, called: 146, connected: 112,
    qualified: 48, notQualified: 39, callback: 15, noAnswer: 34,
  },
  progress: 45.5,
  createdAt: "2026-03-20",
};

// ─── Contacts ───────────────────────────────────────────────────────

export const workflowContacts: WorkflowContact[] = [
  {
    id: "wc-1", name: "Ramesh K*****", phone: "98XXX XX123",
    outcome: "qualified", duration: "4:12", qualification: "qualified",
    verified: true, keyNotes: "Budget ₹1.8Cr, wants 3BHK, can visit this weekend",
    calledAt: "2026-03-21T14:32:00",
  },
  {
    id: "wc-2", name: "Sunita P*****", phone: "90XXX XX456",
    outcome: "qualified", duration: "3:32", qualification: "qualified",
    verified: true, keyNotes: "NRI investor, budget ₹2Cr+, interested in rental yield",
    calledAt: "2026-03-21T14:18:00",
  },
  {
    id: "wc-3", name: "Vikram S*****", phone: "87XXX XX789",
    outcome: "not_qualified", duration: "2:06", qualification: "not_qualified",
    verified: false, keyNotes: "Budget below ₹80L, looking for 1BHK",
    calledAt: "2026-03-21T13:55:00",
  },
  {
    id: "wc-4", name: "Ananya R*****", phone: "91XXX XX234",
    outcome: "callback", duration: "0:48", qualification: undefined,
    verified: false, keyNotes: "Asked to call back after 5 PM",
    calledAt: "2026-03-21T13:40:00",
  },
  {
    id: "wc-5", name: "Deepak M*****", phone: "80XXX XX567",
    outcome: "no_answer", duration: undefined, qualification: undefined,
    verified: false, keyNotes: "",
    calledAt: "2026-03-21T13:22:00",
  },
  {
    id: "wc-6", name: "Kavitha L*****", phone: "99XXX XX890",
    outcome: "qualified", duration: "5:06", qualification: "qualified",
    verified: true, keyNotes: "Family of 4, upgrading from 2BHK, timeline 3 months",
    calledAt: "2026-03-21T12:50:00",
  },
  {
    id: "wc-7", name: "Prashant G*****", phone: "96XXX XX345",
    outcome: "not_qualified", duration: "1:48", qualification: "not_qualified",
    verified: false, keyNotes: "Timeline > 2 years, just browsing",
    calledAt: "2026-03-21T12:35:00",
  },
  {
    id: "wc-8", name: "Meera T*****", phone: "88XXX XX678",
    outcome: "not_qualified", duration: "2:24", qualification: "not_qualified",
    verified: false, keyNotes: "Not decision maker, will check with spouse",
    calledAt: "2026-03-21T12:10:00",
  },
  {
    id: "wc-9", name: "Arun V*****", phone: "70XXX XX901",
    outcome: "wrong_number", duration: "0:18", qualification: undefined,
    verified: false, keyNotes: "Wrong number",
    calledAt: "2026-03-21T11:55:00",
  },
  {
    id: "wc-10", name: "Lakshmi N*****", phone: "85XXX XX012",
    outcome: "not_called", duration: undefined, qualification: undefined,
    verified: false, keyNotes: "",
    calledAt: undefined,
  },
];

// ─── Sequence Log (replaces AI Decision Log) ────────────────────────

export const sequenceLog: SequenceLogEntry[] = [
  {
    id: "sl-1", contact_name: "Ramesh K*****", timestamp: "2026-03-21T14:32:00",
    agent_outcome: "Qualified",
    agent_suggested_next: "No further calls needed",
    agent_reasoning: "Budget ₹1.8Cr (above threshold), 3-month timeline, wants site visit. Sent brochure via WhatsApp and pushed to CRM during call.",
    sequence_decision: "Stopped",
    sequence_reasoning: "Agent marked as qualified → stop rule applied. No further sequence triggers.",
  },
  {
    id: "sl-2", contact_name: "Sunita P*****", timestamp: "2026-03-21T14:18:00",
    agent_outcome: "Qualified",
    agent_suggested_next: "No further calls needed",
    agent_reasoning: "NRI investor, ₹2Cr+ budget. Sent project details and rental yield calculator via WhatsApp. Pushed to CRM with HNI tag.",
    sequence_decision: "Stopped",
    sequence_reasoning: "Agent marked as qualified → stop rule applied.",
  },
  {
    id: "sl-3", contact_name: "Vikram S*****", timestamp: "2026-03-21T13:55:00",
    agent_outcome: "Not qualified",
    agent_suggested_next: "No follow-up needed",
    agent_reasoning: "Budget ₹80L — significantly below ₹1Cr threshold. Looking for 1BHK, not in portfolio.",
    sequence_decision: "Stopped",
    sequence_reasoning: "Not interested → stop rule applied. Lead archived.",
  },
  {
    id: "sl-4", contact_name: "Ananya R*****", timestamp: "2026-03-21T13:40:00",
    agent_outcome: "Callback requested",
    agent_suggested_next: "Call back after 5 PM today",
    agent_reasoning: "Lead was busy, asked to be called back after 5 PM. Seemed interested based on initial response.",
    sequence_decision: "Follow up scheduled",
    sequence_reasoning: "Callback requested → follow up in 24 hours. Scheduled for Mar 22, 10:15 AM.",
    next_trigger_at: "2026-03-22T10:15:00",
  },
  {
    id: "sl-5", contact_name: "Deepak M*****", timestamp: "2026-03-21T13:22:00",
    agent_outcome: "No answer",
    agent_suggested_next: "Retry later",
    agent_reasoning: "Call not answered. No voicemail left.",
    sequence_decision: "Retry scheduled",
    sequence_reasoning: "No answer → retry in 4 hours. Attempt 1 of 2.",
    next_trigger_at: "2026-03-21T17:22:00",
  },
  {
    id: "sl-6", contact_name: "Kavitha L*****", timestamp: "2026-03-21T12:50:00",
    agent_outcome: "Qualified",
    agent_suggested_next: "Schedule site visit",
    agent_reasoning: "Family of 4 upgrading from 2BHK, 3-month timeline. Sent site visit details via WhatsApp. Pushed to CRM.",
    sequence_decision: "Stopped",
    sequence_reasoning: "Agent marked as qualified → stop rule applied.",
  },
  {
    id: "sl-7", contact_name: "Prashant G*****", timestamp: "2026-03-21T12:35:00",
    agent_outcome: "Partially qualified",
    agent_suggested_next: "Follow up in a few months",
    agent_reasoning: "Budget OK but timeline > 2 years. Interested but not ready. Sent project updates link via WhatsApp.",
    sequence_decision: "Follow up scheduled",
    sequence_reasoning: "Partially qualified → follow up in 48 hours. Will re-assess interest.",
    next_trigger_at: "2026-03-23T12:35:00",
  },
  {
    id: "sl-8", contact_name: "Meera T*****", timestamp: "2026-03-21T12:10:00",
    agent_outcome: "Partially qualified",
    agent_suggested_next: "Call back after spousal discussion",
    agent_reasoning: "Not the primary decision maker but showed genuine interest. Needs to consult spouse.",
    sequence_decision: "Follow up scheduled",
    sequence_reasoning: "Partially qualified → follow up in 48 hours. Scheduled for Mar 23.",
    next_trigger_at: "2026-03-23T12:10:00",
  },
  {
    id: "sl-9", contact_name: "Arun V*****", timestamp: "2026-03-21T11:55:00",
    agent_outcome: "Wrong number",
    agent_suggested_next: "Remove from list",
    agent_reasoning: "Confirmed wrong number.",
    sequence_decision: "Stopped",
    sequence_reasoning: "Wrong number → stop. Contact archived.",
  },
];

// ─── Disqualification Reasons ───────────────────────────────────────

export const disqualReasons = [
  { reason: "Budget below ₹1Cr", percentage: 38 },
  { reason: "Timeline > 12 months", percentage: 26 },
  { reason: "Not decision maker", percentage: 18 },
  { reason: "Already purchased", percentage: 11 },
  { reason: "Not interested", percentage: 7 },
];

// ─── Sequence Purposes ──────────────────────────────────────────────

export const workflowPurposes = [
  "Lead Qualification",
  "Follow-up",
  "Survey",
  "Re-engagement",
  "Onboarding",
];

// ─── CSV Preview Mock ───────────────────────────────────────────────

export const csvPreviewHeaders = ["Name", "Phone", "Email", "Source", "Budget"];
export const csvPreviewRows = [
  ["Ramesh Kumar", "9876543210", "ramesh@gmail.com", "Meta Lead", "₹1.5Cr"],
  ["Sunita Patel", "9012345678", "sunita@yahoo.com", "Website", "₹2Cr"],
  ["Vikram Singh", "8765432109", "vikram@outlook.com", "Meta Lead", "₹80L"],
  ["Ananya Rao", "9123456780", "ananya@gmail.com", "Referral", "₹1.8Cr"],
  ["Deepak Menon", "8012345679", "deepak@gmail.com", "Meta Lead", "₹1.2Cr"],
];

// ─── Trigger Types ──────────────────────────────────────────────────

export const triggerTypes = [
  { type: "csv_upload" as const, label: "CSV Upload", description: "Upload a contact list", comingSoon: false },
  {
    type: "crm_webhook" as const,
    label: "CRM Webhook",
    description: "Trigger when a lead enters your CRM",
    comingSoon: true,
  },
  {
    type: "campaign_lead" as const,
    label: "Campaign Lead",
    description: "Select a campaign to trigger this sequence when a new lead arrives",
    comingSoon: false,
  },
  {
    type: "manual" as const,
    label: "Manually (API)",
    description: "Get an API endpoint to trigger this sequence programmatically",
    comingSoon: false,
  },
  {
    type: "workflow_trigger" as const,
    label: "From Another Sequence",
    description: "Triggered by another sequence's completion",
    comingSoon: true,
  },
];
