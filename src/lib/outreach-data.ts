// Outreach mock data — voice agent CSV calling campaigns

// Status lifecycle:
//   draft       → outreach created, no audience uploaded yet (and so no
//                 dialing can happen). This replaces the old "scheduled"
//                 state — there's no longer a separate "queued but
//                 starting later" status; an outreach is either still
//                 being set up (draft) or actually running.
//   in_progress → dialing is happening (or about to, immediately).
//   paused      → was running, user (or system) paused it.
//   completed   → the entire audience has been processed.
export type OutreachStatus = "in_progress" | "completed" | "paused" | "draft";
export type ContactOutcome =
  | "qualified"
  | "not_qualified"
  | "callback"
  | "no_answer"
  | "not_called"
  | "busy"
  | "wrong_number";

export interface OutreachListItem {
  id: string;
  // Outreaches must belong to a project — that's the lead-gen unit a
  // sales/marketing team thinks in. The project owns the brief, brand,
  // audience definition, and goals; the outreach is one of several
  // channels (alongside paid campaigns) the project can use to fill
  // its pipeline. Listed and rolled-up on the project detail page.
  projectId: string;
  name: string;
  voiceAgent: string;
  totalContacts: number;
  called: number;
  connected: number;
  interacted: number;
  qualified: number;
  notQualified: number;
  callback: number;
  noAnswer: number;
  status: OutreachStatus;
  progress: number;
  createdAt: string;
  // Last time the outreach's state changed in any meaningful way — a new dial
  // landed, the status flipped, a follow-up was scheduled. Surfaced on the
  // listing so users can see which outreach moved most recently without
  // opening it.
  updatedAt: string;
  // How many days back from today the outreach has activity for. Drives the
  // time-range filter — an outreach with activityDays=12 contributes nothing
  // when the user picks 7d, full numbers at 30d, etc.
  activityDays: number;
  talktimeMins: number;
  spend: number;
  createdBy: { name: string; initials: string; color: string };
}

export const outreachList: OutreachListItem[] = [
  {
    id: "out-1",
    projectId: "godrej-banerghatta",
    name: "Godrej Reflections — Lead Qualification",
    voiceAgent: "Vox",
    totalContacts: 487,
    called: 342,
    connected: 268,
    interacted: 195,
    qualified: 89,
    notQualified: 142,
    callback: 37,
    noAnswer: 74,
    status: "in_progress",
    progress: 70.2,
    createdAt: "2026-03-18",
    updatedAt: "2026-05-27",
    activityDays: 45,
    talktimeMins: 4580,
    spend: 91600,
    createdBy: { name: "Priya Mehra",  initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-2",
    projectId: "godrej-kukatpally",
    name: "Godrej Eternity — Re-engagement",
    voiceAgent: "Atlas",
    totalContacts: 215,
    called: 215,
    connected: 178,
    interacted: 128,
    qualified: 52,
    notQualified: 98,
    callback: 28,
    noAnswer: 37,
    status: "completed",
    progress: 100,
    createdAt: "2026-03-10",
    updatedAt: "2026-05-09",
    activityDays: 60,
    talktimeMins: 1720,
    spend: 34400,
    createdBy: { name: "Rohan Sharma", initials: "RS", color: "#22C55E" },
  },
  {
    id: "out-3",
    projectId: "godrej-arden",
    name: "Godrej Air — Site Visit Follow-up",
    voiceAgent: "Vox",
    totalContacts: 64,
    called: 0,
    connected: 0,
    interacted: 0,
    qualified: 0,
    notQualified: 0,
    callback: 0,
    noAnswer: 0,
    status: "draft",
    progress: 0,
    createdAt: "2026-03-22",
    updatedAt: "2026-03-22",
    activityDays: 0,
    talktimeMins: 0,
    spend: 0,
    createdBy: { name: "Priya Mehra",  initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-4",
    projectId: "godrej-reserve",
    name: "Prestige Lakeside — Re-engagement",
    voiceAgent: "Atlas",
    totalContacts: 320,
    called: 145,
    connected: 102,
    interacted: 65,
    qualified: 18,
    notQualified: 58,
    callback: 12,
    noAnswer: 22,
    status: "paused",
    progress: 45.3,
    createdAt: "2026-04-02",
    updatedAt: "2026-05-15",
    activityDays: 20,
    talktimeMins: 1880,
    spend: 37600,
    createdBy: { name: "Rohan Sharma", initials: "RS", color: "#22C55E" },
  },
  {
    id: "out-5",
    projectId: "godrej-varanya",
    name: "Lodha Bellissimo — Lead Qualification",
    voiceAgent: "Vox",
    totalContacts: 612,
    called: 487,
    connected: 380,
    interacted: 281,
    qualified: 124,
    notQualified: 178,
    callback: 51,
    noAnswer: 97,
    status: "in_progress",
    progress: 79.6,
    createdAt: "2026-03-25",
    updatedAt: "2026-05-28",
    activityDays: 38,
    talktimeMins: 6740,
    spend: 134800,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-6",
    projectId: "godrej-banerghatta",
    name: "Birla Niyaara — Site Visit Follow-up",
    voiceAgent: "Nova",
    totalContacts: 158,
    called: 158,
    connected: 138,
    interacted: 102,
    qualified: 38,
    notQualified: 70,
    callback: 22,
    noAnswer: 18,
    status: "completed",
    progress: 100,
    createdAt: "2026-02-18",
    updatedAt: "2026-03-30",
    activityDays: 40,
    talktimeMins: 1480,
    spend: 29600,
    createdBy: { name: "Rohan Sharma", initials: "RS", color: "#22C55E" },
  },
  {
    id: "out-7",
    projectId: "godrej-kukatpally",
    name: "Sobha Dream Acres — Lead Qualification",
    voiceAgent: "Vox",
    totalContacts: 95,
    called: 0,
    connected: 0,
    interacted: 0,
    qualified: 0,
    notQualified: 0,
    callback: 0,
    noAnswer: 0,
    status: "draft",
    progress: 0,
    createdAt: "2026-04-22",
    updatedAt: "2026-04-22",
    activityDays: 0,
    talktimeMins: 0,
    spend: 0,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
  // ── Extra demo entries to exercise pagination ────────────────────
  // Past task #151 extended the *contacts* dataset; the outreach list
  // itself was still only 7 rows. With per-page = 10 the pager would
  // never render. These eight extra entries push the visible set past
  // a single page (at default 7d range you'll see ~12), giving us a
  // realistic Prev / Next demo without changing the page-size logic.
  {
    id: "out-8",
    projectId: "godrej-arden",
    name: "Godrej Arden — Brochure follow-up",
    voiceAgent: "Atlas",
    totalContacts: 264, called: 198, connected: 142, interacted: 102, qualified: 41, notQualified: 78, callback: 23, noAnswer: 56,
    status: "in_progress", progress: 75, createdAt: "2026-04-04", updatedAt: "2026-05-26",
    activityDays: 30, talktimeMins: 2110, spend: 42200,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-9",
    projectId: "godrej-reserve",
    name: "Godrej Reserve — Walk-in Reminder",
    voiceAgent: "Nova",
    totalContacts: 156, called: 156, connected: 124, interacted: 87, qualified: 28, notQualified: 59, callback: 18, noAnswer: 32,
    status: "completed", progress: 100, createdAt: "2026-02-28", updatedAt: "2026-04-18",
    activityDays: 35, talktimeMins: 1340, spend: 26800,
    createdBy: { name: "Rohan Sharma", initials: "RS", color: "#22C55E" },
  },
  {
    id: "out-10",
    projectId: "godrej-banerghatta",
    name: "Godrej Banerghatta — Re-engagement Q2",
    voiceAgent: "Atlas",
    totalContacts: 412, called: 287, connected: 198, interacted: 142, qualified: 56, notQualified: 86, callback: 29, noAnswer: 89,
    status: "in_progress", progress: 68, createdAt: "2026-04-12", updatedAt: "2026-05-28",
    activityDays: 25, talktimeMins: 3120, spend: 62400,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-11",
    projectId: "godrej-varanya",
    name: "Lodha Varanya — Cold list outreach",
    voiceAgent: "Vox",
    totalContacts: 89, called: 67, connected: 41, interacted: 22, qualified: 6, notQualified: 16, callback: 8, noAnswer: 26,
    status: "paused", progress: 60, createdAt: "2026-04-15", updatedAt: "2026-05-08",
    activityDays: 14, talktimeMins: 640, spend: 12800,
    createdBy: { name: "Rohan Sharma", initials: "RS", color: "#22C55E" },
  },
  {
    id: "out-12",
    projectId: "godrej-kukatpally",
    name: "Godrej Kukatpally — Site visit booking",
    voiceAgent: "Nova",
    totalContacts: 198, called: 156, connected: 118, interacted: 78, qualified: 34, notQualified: 44, callback: 15, noAnswer: 38,
    status: "in_progress", progress: 80, createdAt: "2026-04-20", updatedAt: "2026-05-25",
    activityDays: 20, talktimeMins: 1480, spend: 29600,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-13",
    projectId: "godrej-arden",
    name: "Godrej Arden — Festive offer push",
    voiceAgent: "Vox",
    totalContacts: 312, called: 290, connected: 220, interacted: 168, qualified: 72, notQualified: 96, callback: 36, noAnswer: 70,
    status: "completed", progress: 100, createdAt: "2026-03-12", updatedAt: "2026-05-02",
    activityDays: 50, talktimeMins: 2680, spend: 53600,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
  {
    id: "out-14",
    projectId: "godrej-reserve",
    name: "Godrej Reserve — Loan partner survey",
    voiceAgent: "Echo",
    totalContacts: 124, called: 96, connected: 82, interacted: 64, qualified: 22, notQualified: 42, callback: 10, noAnswer: 14,
    status: "in_progress", progress: 77, createdAt: "2026-04-25", updatedAt: "2026-05-27",
    activityDays: 18, talktimeMins: 1120, spend: 22400,
    createdBy: { name: "Rohan Sharma", initials: "RS", color: "#22C55E" },
  },
  {
    id: "out-15",
    projectId: "godrej-banerghatta",
    name: "Godrej Banerghatta — Investor calls",
    voiceAgent: "Atlas",
    totalContacts: 76, called: 0, connected: 0, interacted: 0, qualified: 0, notQualified: 0, callback: 0, noAnswer: 0,
    status: "draft", progress: 0, createdAt: "2026-05-26", updatedAt: "2026-05-26",
    activityDays: 0, talktimeMins: 0, spend: 0,
    createdBy: { name: "Priya Mehra", initials: "PM", color: "#6366F1" },
  },
];

// All outreaches linked to a given project. Pure function over the
// static seed (extend if a runtime store is added later, mirroring the
// `runtimeProjects` pattern in project-data.ts). Used by the project
// detail page's Outreach tab + by the outreach create flow to pre-
// select a project when launched from a project context.
export function outreachesForProject(projectId: string): OutreachListItem[] {
  return outreachList.filter(o => o.projectId === projectId);
}

// dailyTalktime90d / dailySpend90d used to live here. They now derive
// from the unified daily-series module (see ./daily-series.ts) so that
// the workspace trend chip always agrees with what each row contributes.
// Import them from "@/lib/daily-series" instead.

export const voiceAgents = [
  { id: "va-1", name: "Vox" },
  { id: "va-2", name: "Atlas" },
  { id: "va-3", name: "Nova" },
];

export const outreachPurposes = [
  "Lead Qualification",
  "Follow-up",
  "Survey",
  "Re-engagement",
];

// Detail page data for "out-1"
export const outreachDetail = {
  id: "out-1",
  name: "Godrej Reflections — Lead Qualification",
  voiceAgent: "Vox",
  purpose: "Lead Qualification",
  status: "in_progress" as OutreachStatus,
  totalContacts: 487,
  called: 342,
  connected: 268,
  interacted: 195,
  qualified: 89,
  notQualified: 142,
  callback: 37,
  noAnswer: 74,
  busy: 12,
  wrongNumber: 8,
  remaining: 145,
  avgDuration: 2.8,
  // Aggregate call activity — sum of dial attempts and total talk minutes
  // across the campaign. Drives the "Total calls / Total minutes" header
  // stats inside the Dial Attempts widget.
  totalCalls: 750,       // 140×1 + 80×2 + 60×3 + 40×4 + 22×5
  totalMinutes: 950,
  // Per-outreach spend — mirrors what's in the listing roll-up so the
  // listing-aggregate widgets (Talktime/Spend/Funnel) can also render on
  // the detail page scoped to this single outreach.
  spend: 91600,
  // How many days this outreach has been actively running. Used on the
  // detail page to scale the windowed widgets when the user picks a time
  // range — e.g. at "Last 7 days" with activityDays=60 we show 7/60 of
  // every windowed metric (calls, minutes, spend, dial-attempt buckets).
  activityDays: 60,
  // Lead sources — the CSV files actually uploaded by the user during
  // outreach creation. Names follow upload convention (snake_case .csv) and
  // each carries the upload date so the user can tell which batch is which.
  sources: [
    { id: "src-1", name: "reflections_meta_q1.csv",       uploadedAt: "2026-03-18", leads: 215 },
    { id: "src-2", name: "whitefield_google_search.csv",  uploadedAt: "2026-03-19", leads: 168 },
    { id: "src-3", name: "website_inbound_mar.csv",       uploadedAt: "2026-03-20", leads: 64 },
    { id: "src-4", name: "channel_partner_referrals.csv", uploadedAt: "2026-03-22", leads: 40 },
  ],
  createdAt: "2026-03-18",
  windowStart: "2026-04-15",
  windowEnd: "2026-06-30",
  // Dial attempt distribution — sums to `called` (342). Index 0 = 1 attempt,
  // index 1 = 2 attempts, etc. Length determined by maxRetries + 1.
  dialAttempts: [140, 80, 60, 40, 22],
  schedule: {
    dailyLimit: 200,
    callingHours: "10:00 AM – 7:00 PM",
    days: "Mon–Sat",
    retryEnabled: true,
    maxRetries: 4,
    retryInterval: "4 hours",
  },
};

export const disqualReasons = [
  { reason: "Budget below ₹1Cr", percentage: 38 },
  { reason: "Timeline > 12 months", percentage: 26 },
  { reason: "Not decision maker", percentage: 18 },
  { reason: "Already purchased", percentage: 11 },
  { reason: "Not interested", percentage: 7 },
];

export type LeadType = "standard" | "verified" | "ai_qualified";
export type LeadTemperature = "hot" | "warm" | "lukewarm" | "cold";
export type AIQualStatus =
  | "qualified"
  | "disqualified"
  | "intent_qualified"
  | "customer_followup"
  | "rnr"
  | null;

export interface OutreachContact {
  id: string;
  // Foreign-key back to the outreach this contact belongs to. Without this
  // a click into any outreach detail showed the same flat list of 60 — every
  // outreach looked identical. We assign outreachId in the build step below
  // so the seed entries themselves don't need to be touched.
  outreachId: string;
  name: string;
  phone: string;
  outcome: ContactOutcome;
  duration: number | null;
  qualification: "qualified" | "not_qualified" | null;
  verified: boolean;
  keyNotes: string;
  calledAt: string | null;
  leadType: LeadType;
  temperature: LeadTemperature;
  qualStatus: AIQualStatus;
  sentToCrm: boolean;
  nextAction: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Raw seed list — written before per-outreach scoping existed, so the entries
// don't carry an outreachId. The exported `outreachContacts` (further down)
// stitches that on by index, which keeps this block readable and avoids 60
// rote edits.
const _rawContacts: Omit<OutreachContact, "outreachId">[] = [
  {
    id: "oc-1",
    name: "Rajesh Kumar",
    phone: "98XXX XX123",
    outcome: "qualified",
    duration: 4.2,
    qualification: "qualified",
    verified: true,
    keyNotes: "Budget ₹1.8Cr, wants 3BHK, can visit this weekend",
    calledAt: "2026-03-21T14:32:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Schedule site visit",
    nextActionAt: "2026-03-23T11:00:00",
    createdAt: "2026-03-20T09:15:00",
    updatedAt: "2026-03-21T14:35:00",
  },
  {
    id: "oc-2",
    name: "Suresh Patil",
    phone: "90XXX XX456",
    outcome: "qualified",
    duration: 3.5,
    qualification: "qualified",
    verified: true,
    keyNotes: "NRI investor, budget ₹2Cr+, interested in rental yield",
    calledAt: "2026-03-21T14:18:00",
    leadType: "ai_qualified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Send brochure + floor plans",
    nextActionAt: "2026-03-22T10:00:00",
    createdAt: "2026-03-20T09:18:00",
    updatedAt: "2026-03-21T14:22:00",
  },
  {
    id: "oc-3",
    name: "Vivek Sharma",
    phone: "87XXX XX789",
    outcome: "not_qualified",
    duration: 2.1,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Budget below ₹80L, looking for 1BHK",
    calledAt: "2026-03-21T13:55:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T09:21:00",
    updatedAt: "2026-03-21T13:58:00",
  },
  {
    id: "oc-4",
    name: "Anjali Rao",
    phone: "91XXX XX234",
    outcome: "callback",
    duration: 0.8,
    qualification: null,
    verified: false,
    keyNotes: "Asked to call back after 5 PM",
    calledAt: "2026-03-21T13:40:00",
    leadType: "standard",
    temperature: "warm",
    qualStatus: "customer_followup",
    sentToCrm: false,
    nextAction: "Call back",
    nextActionAt: "2026-03-21T17:00:00",
    createdAt: "2026-03-20T09:24:00",
    updatedAt: "2026-03-21T13:42:00",
  },
  {
    id: "oc-5",
    name: "Deepa Mehta",
    phone: "80XXX XX567",
    outcome: "no_answer",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: "2026-03-21T13:22:00",
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: "rnr",
    sentToCrm: false,
    nextAction: "Retry call",
    nextActionAt: "2026-03-22T11:00:00",
    createdAt: "2026-03-20T09:27:00",
    updatedAt: "2026-03-21T13:22:00",
  },
  {
    id: "oc-6",
    name: "Kunal Lal",
    phone: "99XXX XX890",
    outcome: "qualified",
    duration: 5.1,
    qualification: "qualified",
    verified: true,
    keyNotes: "Family of 4, upgrading from 2BHK, timeline 3 months",
    calledAt: "2026-03-21T12:50:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Schedule site visit",
    nextActionAt: "2026-03-24T16:00:00",
    createdAt: "2026-03-20T09:30:00",
    updatedAt: "2026-03-21T12:55:00",
  },
  {
    id: "oc-7",
    name: "Priya Gupta",
    phone: "96XXX XX345",
    outcome: "not_qualified",
    duration: 1.8,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Timeline > 2 years, just browsing",
    calledAt: "2026-03-21T12:35:00",
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: "intent_qualified",
    sentToCrm: false,
    nextAction: "Add to nurture list",
    nextActionAt: "2026-04-21T10:00:00",
    createdAt: "2026-03-20T09:33:00",
    updatedAt: "2026-03-21T12:37:00",
  },
  {
    id: "oc-8",
    name: "Manoj Tiwari",
    phone: "88XXX XX678",
    outcome: "not_qualified",
    duration: 2.4,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Not decision maker, will check with spouse",
    calledAt: "2026-03-21T12:10:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T09:36:00",
    updatedAt: "2026-03-21T12:13:00",
  },
  {
    id: "oc-9",
    name: "Aarav Verma",
    phone: "70XXX XX901",
    outcome: "wrong_number",
    duration: 0.3,
    qualification: null,
    verified: false,
    keyNotes: "Wrong number",
    calledAt: "2026-03-21T11:55:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: null,
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T09:39:00",
    updatedAt: "2026-03-21T11:56:00",
  },
  {
    id: "oc-10",
    name: "Lakshmi Nair",
    phone: "85XXX XX012",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-22T10:00:00",
    createdAt: "2026-03-20T09:42:00",
    updatedAt: "2026-03-20T09:42:00",
  },
  // ── Additional contacts to demonstrate pagination ──────────────────────────
  {
    id: "oc-11",
    name: "Aditya Khanna",
    phone: "98XXX XX201",
    outcome: "qualified",
    duration: 5.1,
    qualification: "qualified",
    verified: true,
    keyNotes: "Budget ₹2.2Cr, looking for 4BHK, ready to book",
    calledAt: "2026-03-21T10:18:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Schedule site visit",
    nextActionAt: "2026-03-24T11:30:00",
    createdAt: "2026-03-20T10:02:00",
    updatedAt: "2026-03-21T10:21:00",
  },
  {
    id: "oc-12",
    name: "Bhavna Singh",
    phone: "97XXX XX202",
    outcome: "qualified",
    duration: 3.8,
    qualification: "qualified",
    verified: true,
    keyNotes: "3BHK, possession by Dec 2026, loan pre-approved",
    calledAt: "2026-03-21T11:05:00",
    leadType: "ai_qualified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Send brochure",
    nextActionAt: "2026-03-22T09:00:00",
    createdAt: "2026-03-20T10:12:00",
    updatedAt: "2026-03-21T11:08:00",
  },
  {
    id: "oc-13",
    name: "Chetan Patel",
    phone: "96XXX XX203",
    outcome: "qualified",
    duration: 4.5,
    qualification: "qualified",
    verified: true,
    keyNotes: "Budget ₹1.6Cr, comparing with Lodha, wants 3BHK east-facing",
    calledAt: "2026-03-21T11:42:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Schedule site visit",
    nextActionAt: "2026-03-25T10:00:00",
    createdAt: "2026-03-20T10:22:00",
    updatedAt: "2026-03-21T11:45:00",
  },
  {
    id: "oc-14",
    name: "Divya Raman",
    phone: "95XXX XX204",
    outcome: "qualified",
    duration: 6.2,
    qualification: "qualified",
    verified: true,
    keyNotes: "End user, family of 4, prefers higher floors",
    calledAt: "2026-03-21T12:30:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Site visit confirmed",
    nextActionAt: "2026-03-23T15:00:00",
    createdAt: "2026-03-20T10:32:00",
    updatedAt: "2026-03-21T12:33:00",
  },
  {
    id: "oc-15",
    name: "Esha Mathur",
    phone: "94XXX XX205",
    outcome: "qualified",
    duration: 3.4,
    qualification: "qualified",
    verified: true,
    keyNotes: "Investor, looking at 2BHK, expects rental yield",
    calledAt: "2026-03-21T13:15:00",
    leadType: "ai_qualified",
    temperature: "warm",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Share rental projections",
    nextActionAt: "2026-03-22T11:00:00",
    createdAt: "2026-03-20T10:42:00",
    updatedAt: "2026-03-21T13:18:00",
  },
  {
    id: "oc-16",
    name: "Farhan Nazir",
    phone: "93XXX XX206",
    outcome: "qualified",
    duration: 4.9,
    qualification: "qualified",
    verified: true,
    keyNotes: "Budget ₹2Cr, wants corner unit, willing to pay premium",
    calledAt: "2026-03-21T14:01:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Connect with sales head",
    nextActionAt: "2026-03-22T16:00:00",
    createdAt: "2026-03-20T10:52:00",
    updatedAt: "2026-03-21T14:04:00",
  },
  {
    id: "oc-17",
    name: "Gaurav Tandon",
    phone: "92XXX XX207",
    outcome: "qualified",
    duration: 5.8,
    qualification: "qualified",
    verified: true,
    keyNotes: "Relocating from Pune, needs possession by Q3 2026",
    calledAt: "2026-03-21T14:48:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Schedule virtual tour",
    nextActionAt: "2026-03-23T12:00:00",
    createdAt: "2026-03-20T11:02:00",
    updatedAt: "2026-03-21T14:51:00",
  },
  {
    id: "oc-18",
    name: "Hema Vyas",
    phone: "91XXX XX208",
    outcome: "qualified",
    duration: 4.1,
    qualification: "qualified",
    verified: true,
    keyNotes: "3BHK, budget ₹1.75Cr, partner working in Whitefield",
    calledAt: "2026-03-21T15:22:00",
    leadType: "ai_qualified",
    temperature: "warm",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Send floor plan",
    nextActionAt: "2026-03-22T10:30:00",
    createdAt: "2026-03-20T11:12:00",
    updatedAt: "2026-03-21T15:25:00",
  },
  {
    id: "oc-19",
    name: "Imran Bose",
    phone: "90XXX XX209",
    outcome: "qualified",
    duration: 3.6,
    qualification: "qualified",
    verified: true,
    keyNotes: "Senior citizen, ground floor preference, accessible amenities",
    calledAt: "2026-03-21T16:08:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Site visit",
    nextActionAt: "2026-03-26T11:00:00",
    createdAt: "2026-03-20T11:22:00",
    updatedAt: "2026-03-21T16:11:00",
  },
  {
    id: "oc-20",
    name: "Jyoti Oza",
    phone: "98XXX XX210",
    outcome: "qualified",
    duration: 5.3,
    qualification: "qualified",
    verified: true,
    keyNotes: "NRI buyer, Dubai-based, looking for 3BHK as investment",
    calledAt: "2026-03-22T09:14:00",
    leadType: "ai_qualified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Share NRI documentation",
    nextActionAt: "2026-03-23T10:00:00",
    createdAt: "2026-03-20T11:32:00",
    updatedAt: "2026-03-22T09:17:00",
  },
  {
    id: "oc-21",
    name: "Karan Apte",
    phone: "97XXX XX211",
    outcome: "qualified",
    duration: 4.7,
    qualification: "qualified",
    verified: true,
    keyNotes: "First-time buyer, 2BHK, loan via HDFC pre-sanctioned",
    calledAt: "2026-03-22T10:02:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Schedule site visit",
    nextActionAt: "2026-03-24T15:00:00",
    createdAt: "2026-03-20T11:42:00",
    updatedAt: "2026-03-22T10:05:00",
  },
  {
    id: "oc-22",
    name: "Lalit Desai",
    phone: "96XXX XX212",
    outcome: "qualified",
    duration: 3.9,
    qualification: "qualified",
    verified: true,
    keyNotes: "Software exec, wants premium amenities, club access important",
    calledAt: "2026-03-22T10:48:00",
    leadType: "ai_qualified",
    temperature: "warm",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Share amenity deck",
    nextActionAt: "2026-03-23T11:30:00",
    createdAt: "2026-03-20T11:52:00",
    updatedAt: "2026-03-22T10:51:00",
  },
  {
    id: "oc-23",
    name: "Mahesh Iyer",
    phone: "95XXX XX213",
    outcome: "qualified",
    duration: 5.0,
    qualification: "qualified",
    verified: true,
    keyNotes: "Doctor couple, 3BHK with study, willing to close fast",
    calledAt: "2026-03-22T11:35:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "qualified",
    sentToCrm: true,
    nextAction: "Send token amount details",
    nextActionAt: "2026-03-23T14:00:00",
    createdAt: "2026-03-20T12:02:00",
    updatedAt: "2026-03-22T11:38:00",
  },
  // ── intent_qualified (verified intent, qualification pending) ──
  {
    id: "oc-24",
    name: "Neha Joshi",
    phone: "94XXX XX214",
    outcome: "callback",
    duration: 2.8,
    qualification: "pending",
    verified: true,
    keyNotes: "Wants to discuss with spouse first, callback Friday",
    calledAt: "2026-03-22T12:20:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "intent_qualified",
    sentToCrm: false,
    nextAction: "Callback",
    nextActionAt: "2026-03-26T11:00:00",
    createdAt: "2026-03-20T12:12:00",
    updatedAt: "2026-03-22T12:23:00",
  },
  {
    id: "oc-25",
    name: "Omar Faruq",
    phone: "93XXX XX215",
    outcome: "callback",
    duration: 3.2,
    qualification: "pending",
    verified: true,
    keyNotes: "Comparing 2 projects, will revert by Monday",
    calledAt: "2026-03-22T13:05:00",
    leadType: "ai_qualified",
    temperature: "warm",
    qualStatus: "intent_qualified",
    sentToCrm: false,
    nextAction: "Callback",
    nextActionAt: "2026-03-25T10:30:00",
    createdAt: "2026-03-20T12:22:00",
    updatedAt: "2026-03-22T13:08:00",
  },
  {
    id: "oc-26",
    name: "Pooja Quadri",
    phone: "92XXX XX216",
    outcome: "callback",
    duration: 4.0,
    qualification: "pending",
    verified: true,
    keyNotes: "Interested in 3BHK, needs to align travel — callback next week",
    calledAt: "2026-03-22T14:00:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "intent_qualified",
    sentToCrm: false,
    nextAction: "Callback",
    nextActionAt: "2026-03-27T15:00:00",
    createdAt: "2026-03-20T12:32:00",
    updatedAt: "2026-03-22T14:03:00",
  },
  {
    id: "oc-27",
    name: "Qadir Lateef",
    phone: "91XXX XX217",
    outcome: "callback",
    duration: 2.5,
    qualification: "pending",
    verified: true,
    keyNotes: "Wants WhatsApp details, will decide by month-end",
    calledAt: "2026-03-22T14:48:00",
    leadType: "ai_qualified",
    temperature: "lukewarm",
    qualStatus: "intent_qualified",
    sentToCrm: false,
    nextAction: "Send WhatsApp details",
    nextActionAt: "2026-03-23T09:00:00",
    createdAt: "2026-03-20T12:42:00",
    updatedAt: "2026-03-22T14:51:00",
  },
  {
    id: "oc-28",
    name: "Rahul Zaveri",
    phone: "90XXX XX218",
    outcome: "callback",
    duration: 3.6,
    qualification: "pending",
    verified: true,
    keyNotes: "Touring city this weekend, will visit site Sat",
    calledAt: "2026-03-22T15:32:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "intent_qualified",
    sentToCrm: false,
    nextAction: "Site visit follow-up",
    nextActionAt: "2026-03-28T11:00:00",
    createdAt: "2026-03-20T12:52:00",
    updatedAt: "2026-03-22T15:35:00",
  },
  // ── customer_followup ──
  {
    id: "oc-29",
    name: "Sneha Walia",
    phone: "98XXX XX219",
    outcome: "callback",
    duration: 4.4,
    qualification: "qualified",
    verified: true,
    keyNotes: "Already a Godrej customer, expansion buy",
    calledAt: "2026-03-22T16:18:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "customer_followup",
    sentToCrm: true,
    nextAction: "Loyalty offer review",
    nextActionAt: "2026-03-24T14:00:00",
    createdAt: "2026-03-20T13:02:00",
    updatedAt: "2026-03-22T16:21:00",
  },
  {
    id: "oc-30",
    name: "Tarun Uppal",
    phone: "97XXX XX220",
    outcome: "callback",
    duration: 3.7,
    qualification: "qualified",
    verified: true,
    keyNotes: "Existing customer, referred a friend — wants joint deal",
    calledAt: "2026-03-23T09:30:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "customer_followup",
    sentToCrm: true,
    nextAction: "Joint deal review",
    nextActionAt: "2026-03-25T11:00:00",
    createdAt: "2026-03-20T13:12:00",
    updatedAt: "2026-03-23T09:33:00",
  },
  {
    id: "oc-31",
    name: "Uma Chopra",
    phone: "96XXX XX221",
    outcome: "callback",
    duration: 4.1,
    qualification: "qualified",
    verified: true,
    keyNotes: "Past buyer of Godrej Reflection, looking at second home",
    calledAt: "2026-03-23T10:15:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "customer_followup",
    sentToCrm: true,
    nextAction: "Schedule site visit",
    nextActionAt: "2026-03-26T15:00:00",
    createdAt: "2026-03-20T13:22:00",
    updatedAt: "2026-03-23T10:18:00",
  },
  {
    id: "oc-32",
    name: "Varun Xavier",
    phone: "95XXX XX222",
    outcome: "callback",
    duration: 3.3,
    qualification: "qualified",
    verified: true,
    keyNotes: "Owns unit in Phase 1, interested in upgrade",
    calledAt: "2026-03-23T11:02:00",
    leadType: "verified",
    temperature: "warm",
    qualStatus: "customer_followup",
    sentToCrm: true,
    nextAction: "Upgrade options call",
    nextActionAt: "2026-03-25T16:00:00",
    createdAt: "2026-03-20T13:32:00",
    updatedAt: "2026-03-23T11:05:00",
  },
  {
    id: "oc-33",
    name: "Wasim Yusuf",
    phone: "94XXX XX223",
    outcome: "callback",
    duration: 4.9,
    qualification: "qualified",
    verified: true,
    keyNotes: "Loyal customer — 3 prior bookings, white-glove handling",
    calledAt: "2026-03-23T11:48:00",
    leadType: "verified",
    temperature: "hot",
    qualStatus: "customer_followup",
    sentToCrm: true,
    nextAction: "VIP visit",
    nextActionAt: "2026-03-24T17:00:00",
    createdAt: "2026-03-20T13:42:00",
    updatedAt: "2026-03-23T11:51:00",
  },
  // ── disqualified ──
  {
    id: "oc-34",
    name: "Xavier Eapen",
    phone: "93XXX XX224",
    outcome: "not_qualified",
    duration: 2.1,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Budget too low — ₹60L, looking for 1BHK",
    calledAt: "2026-03-23T12:34:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T13:52:00",
    updatedAt: "2026-03-23T12:37:00",
  },
  {
    id: "oc-35",
    name: "Yash Hegde",
    phone: "92XXX XX225",
    outcome: "not_qualified",
    duration: 1.8,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Looking in different city, mis-routed lead",
    calledAt: "2026-03-23T13:20:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T14:02:00",
    updatedAt: "2026-03-23T13:23:00",
  },
  {
    id: "oc-36",
    name: "Zara Gandhi",
    phone: "91XXX XX226",
    outcome: "not_qualified",
    duration: 2.4,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Already booked elsewhere last month",
    calledAt: "2026-03-23T14:06:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T14:12:00",
    updatedAt: "2026-03-23T14:09:00",
  },
  {
    id: "oc-37",
    name: "Arnav Fernandes",
    phone: "90XXX XX227",
    outcome: "not_qualified",
    duration: 1.5,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Renter, not a buyer — wrong audience",
    calledAt: "2026-03-23T14:52:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T14:22:00",
    updatedAt: "2026-03-23T14:55:00",
  },
  {
    id: "oc-38",
    name: "Bharti Mishra",
    phone: "98XXX XX228",
    outcome: "not_qualified",
    duration: 2.0,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Looking only for plot, not apartment",
    calledAt: "2026-03-23T15:38:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T14:32:00",
    updatedAt: "2026-03-23T15:41:00",
  },
  {
    id: "oc-39",
    name: "Charu Nanda",
    phone: "97XXX XX229",
    outcome: "not_qualified",
    duration: 2.7,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Budget mismatch — sub-₹50L",
    calledAt: "2026-03-23T16:24:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T14:42:00",
    updatedAt: "2026-03-23T16:27:00",
  },
  {
    id: "oc-40",
    name: "Dilip Ohri",
    phone: "96XXX XX230",
    outcome: "not_qualified",
    duration: 1.9,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Not currently in buying mode, casual enquiry",
    calledAt: "2026-03-24T09:10:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T14:52:00",
    updatedAt: "2026-03-24T09:13:00",
  },
  {
    id: "oc-41",
    name: "Eshan Pillai",
    phone: "95XXX XX231",
    outcome: "not_qualified",
    duration: 2.3,
    qualification: "not_qualified",
    verified: false,
    keyNotes: "Not decision maker — gatekeeper picked up",
    calledAt: "2026-03-24T09:56:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "disqualified",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T15:02:00",
    updatedAt: "2026-03-24T09:59:00",
  },
  // ── rnr (ring no response) ──
  {
    id: "oc-42",
    name: "Fatima Qureshi",
    phone: "94XXX XX232",
    outcome: "no_answer",
    duration: 0.3,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: "2026-03-24T10:42:00",
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: "rnr",
    sentToCrm: false,
    nextAction: "Retry call",
    nextActionAt: "2026-03-25T11:00:00",
    createdAt: "2026-03-20T15:12:00",
    updatedAt: "2026-03-24T10:42:00",
  },
  {
    id: "oc-43",
    name: "Gopal Reddy",
    phone: "93XXX XX233",
    outcome: "no_answer",
    duration: 0.2,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: "2026-03-24T11:28:00",
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: "rnr",
    sentToCrm: false,
    nextAction: "Retry call",
    nextActionAt: "2026-03-25T15:00:00",
    createdAt: "2026-03-20T15:22:00",
    updatedAt: "2026-03-24T11:28:00",
  },
  {
    id: "oc-44",
    name: "Harish Sastry",
    phone: "92XXX XX234",
    outcome: "busy",
    duration: 0.1,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: "2026-03-24T12:14:00",
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: "rnr",
    sentToCrm: false,
    nextAction: "Retry call",
    nextActionAt: "2026-03-25T17:00:00",
    createdAt: "2026-03-20T15:32:00",
    updatedAt: "2026-03-24T12:14:00",
  },
  {
    id: "oc-45",
    name: "Indira Tagore",
    phone: "91XXX XX235",
    outcome: "no_answer",
    duration: 0.3,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: "2026-03-24T13:00:00",
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: "rnr",
    sentToCrm: false,
    nextAction: "Retry call",
    nextActionAt: "2026-03-26T11:00:00",
    createdAt: "2026-03-20T15:42:00",
    updatedAt: "2026-03-24T13:00:00",
  },
  {
    id: "oc-46",
    name: "Jaya Unnikrishnan",
    phone: "90XXX XX236",
    outcome: "wrong_number",
    duration: 0.4,
    qualification: null,
    verified: false,
    keyNotes: "Wrong number — DNC flagged",
    calledAt: "2026-03-24T13:46:00",
    leadType: "standard",
    temperature: "cold",
    qualStatus: "rnr",
    sentToCrm: false,
    nextAction: null,
    nextActionAt: null,
    createdAt: "2026-03-20T15:52:00",
    updatedAt: "2026-03-24T13:46:00",
  },
  // ── not yet dialled (qualStatus null, outcome not_called) ──
  {
    id: "oc-47",
    name: "Kabir Vohra",
    phone: "98XXX XX237",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-25T10:00:00",
    createdAt: "2026-03-21T09:02:00",
    updatedAt: "2026-03-21T09:02:00",
  },
  {
    id: "oc-48",
    name: "Lila Walia",
    phone: "97XXX XX238",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-25T11:30:00",
    createdAt: "2026-03-21T09:12:00",
    updatedAt: "2026-03-21T09:12:00",
  },
  {
    id: "oc-49",
    name: "Madhuri Xerxes",
    phone: "96XXX XX239",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-25T14:00:00",
    createdAt: "2026-03-21T09:22:00",
    updatedAt: "2026-03-21T09:22:00",
  },
  {
    id: "oc-50",
    name: "Nidhi Yagnik",
    phone: "95XXX XX240",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-25T15:30:00",
    createdAt: "2026-03-21T09:32:00",
    updatedAt: "2026-03-21T09:32:00",
  },
  {
    id: "oc-51",
    name: "Om Zaveri",
    phone: "94XXX XX241",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-25T16:30:00",
    createdAt: "2026-03-21T09:42:00",
    updatedAt: "2026-03-21T09:42:00",
  },
  {
    id: "oc-52",
    name: "Prerna Anand",
    phone: "93XXX XX242",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-26T09:30:00",
    createdAt: "2026-03-21T09:52:00",
    updatedAt: "2026-03-21T09:52:00",
  },
  {
    id: "oc-53",
    name: "Qasim Bhatia",
    phone: "92XXX XX243",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-26T11:00:00",
    createdAt: "2026-03-21T10:02:00",
    updatedAt: "2026-03-21T10:02:00",
  },
  {
    id: "oc-54",
    name: "Ravi Chandra",
    phone: "91XXX XX244",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-26T13:00:00",
    createdAt: "2026-03-21T10:12:00",
    updatedAt: "2026-03-21T10:12:00",
  },
  {
    id: "oc-55",
    name: "Sumit Das",
    phone: "90XXX XX245",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-26T14:30:00",
    createdAt: "2026-03-21T10:22:00",
    updatedAt: "2026-03-21T10:22:00",
  },
  {
    id: "oc-56",
    name: "Tara Eswaran",
    phone: "98XXX XX246",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-26T16:00:00",
    createdAt: "2026-03-21T10:32:00",
    updatedAt: "2026-03-21T10:32:00",
  },
  {
    id: "oc-57",
    name: "Uday Furtado",
    phone: "97XXX XX247",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-27T10:00:00",
    createdAt: "2026-03-21T10:42:00",
    updatedAt: "2026-03-21T10:42:00",
  },
  {
    id: "oc-58",
    name: "Vikram Gokhale",
    phone: "96XXX XX248",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-27T11:30:00",
    createdAt: "2026-03-21T10:52:00",
    updatedAt: "2026-03-21T10:52:00",
  },
  {
    id: "oc-59",
    name: "Wasim Hashmi",
    phone: "95XXX XX249",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-27T13:00:00",
    createdAt: "2026-03-21T11:02:00",
    updatedAt: "2026-03-21T11:02:00",
  },
  {
    id: "oc-60",
    name: "Xander Inamdar",
    phone: "94XXX XX250",
    outcome: "not_called",
    duration: null,
    qualification: null,
    verified: false,
    keyNotes: "",
    calledAt: null,
    leadType: "standard",
    temperature: "lukewarm",
    qualStatus: null,
    sentToCrm: false,
    nextAction: "Initial call",
    nextActionAt: "2026-03-27T15:00:00",
    createdAt: "2026-03-21T11:12:00",
    updatedAt: "2026-03-21T11:12:00",
  },
];

// Per-outreach contact distribution — index ranges into _rawContacts.
// The Reflections (out-1) outreach keeps the diverse demo set intact;
// the rest get smaller, status-appropriate slices so each detail page
// reflects its own audience rather than echoing the same 60 names.
// Scheduled outreaches (out-3 / out-7 / out-15) intentionally get nothing
// — they haven't called anyone yet, so an empty contact list is honest.
const _contactDistribution: { id: string; start: number; end: number }[] = [
  { id: "out-1",  start: 0,  end: 30 }, // 30 — the rich demo dataset
  { id: "out-2",  start: 30, end: 34 }, // 4
  { id: "out-4",  start: 34, end: 37 }, // 3
  { id: "out-5",  start: 37, end: 42 }, // 5
  { id: "out-6",  start: 42, end: 45 }, // 3
  { id: "out-8",  start: 45, end: 48 }, // 3
  { id: "out-9",  start: 48, end: 50 }, // 2
  { id: "out-10", start: 50, end: 54 }, // 4
  { id: "out-11", start: 54, end: 56 }, // 2
  { id: "out-12", start: 56, end: 58 }, // 2
  { id: "out-13", start: 58, end: 59 }, // 1
  { id: "out-14", start: 59, end: 60 }, // 1
];

// Build the exported contact list with outreachId attached. Index falls
// through the distribution table — any contact whose index isn't covered
// (shouldn't happen given the ranges above sum to 60) gets pinned to
// out-1 as a safe default so it still renders somewhere.
function _outreachIdForIndex(idx: number): string {
  for (const { id, start, end } of _contactDistribution) {
    if (idx >= start && idx < end) return id;
  }
  return "out-1";
}

export const outreachContacts: OutreachContact[] = _rawContacts.map((c, i) => ({
  ...c,
  outreachId: _outreachIdForIndex(i),
}));

// All contacts that belong to a given outreach. Used by the detail page to
// drive every widget — funnel counts, the table, search/filter scoping —
// so the per-outreach numbers actually match what the user is looking at.
export function outreachContactsForId(id: string): OutreachContact[] {
  return outreachContacts.filter(c => c.outreachId === id);
}

// ── Per-outreach detail synthesis ────────────────────────────────────
// The original `outreachDetail` was a single hand-written object for out-1.
// That made every detail page render with out-1's data regardless of which
// outreach the user clicked. We now synthesize the detail shape on demand
// from the listing entry, which already has the authoritative call counts,
// activity window, talktime, and spend for each outreach.

export interface OutreachDetail {
  id: string;
  name: string;
  voiceAgent: string;
  purpose: string;
  status: OutreachStatus;
  totalContacts: number;
  called: number;
  connected: number;
  interacted: number;
  qualified: number;
  notQualified: number;
  callback: number;
  noAnswer: number;
  busy: number;
  wrongNumber: number;
  remaining: number;
  avgDuration: number;
  totalCalls: number;
  totalMinutes: number;
  spend: number;
  activityDays: number;
  sources: { id: string; name: string; uploadedAt: string; leads: number }[];
  createdAt: string;
  windowStart: string;
  windowEnd: string;
  dialAttempts: number[];
  schedule: {
    dailyLimit: number;
    callingHours: string;
    days: string;
    retryEnabled: boolean;
    maxRetries: number;
    retryInterval: string;
  };
}

// Stable hash from an id string — lets every derivation below be
// deterministic per outreach without needing per-row seed data.
function _seed(id: string): number {
  let h = 0;
  for (const ch of id) h = ch.charCodeAt(0) + ((h << 5) - h);
  return Math.abs(h);
}

// Split `total` into `buckets` parts where the first bucket gets the
// most weight and each subsequent one falls off — mirrors how real
// dial-attempt distributions look (most leads answer on attempt 1,
// fewer on attempt 2, etc.). The shape is seeded per outreach so two
// outreaches with similar totals still draw different curves.
function _dialAttemptBuckets(called: number, id: string): number[] {
  if (called <= 0) return [0, 0, 0, 0, 0];
  const s = _seed(id);
  const ratios = [0.41, 0.23, 0.18, 0.12, 0.06].map((r, i) => {
    // ±15% wiggle per bucket, seeded.
    const jitter = 1 + (((s >> (i * 3)) & 0xff) / 0xff - 0.5) * 0.3;
    return r * jitter;
  });
  const sum = ratios.reduce((a, b) => a + b, 0);
  const norm = ratios.map(r => r / sum);
  const buckets = norm.map(r => Math.round(called * r));
  // Force exact sum to match `called` by fixing the largest bucket.
  const diff = called - buckets.reduce((a, b) => a + b, 0);
  let maxIdx = 0;
  for (let i = 1; i < buckets.length; i++) if (buckets[i] > buckets[maxIdx]) maxIdx = i;
  buckets[maxIdx] += diff;
  return buckets;
}

// Source CSV files for this outreach — names follow the upload convention
// (snake_case) and lead counts add up to totalContacts so the Source filter
// math doesn't lie. The list length varies by outreach so the dropdown
// doesn't feel templated.
function _synthSources(o: OutreachListItem): OutreachDetail["sources"] {
  const sourceLibrary = [
    "meta_leads_q1.csv",
    "google_search_intent.csv",
    "website_inbound.csv",
    "channel_partner_referrals.csv",
    "broker_network.csv",
    "exhibition_signups.csv",
    "whatsapp_campaign.csv",
    "cold_database.csv",
  ];
  const s = _seed(o.id);
  const count = 2 + (s % 3); // 2-4 sources
  const startOffset = s % sourceLibrary.length;
  const picked: string[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(sourceLibrary[(startOffset + i) % sourceLibrary.length]);
  }
  // Weighted split — first source dominates, rest split the remainder.
  const weights = picked.map((_, i) => 1 / (i + 1));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const leads = weights.map(w => Math.round((w / wsum) * o.totalContacts));
  // Fix rounding so the sum lands exactly.
  const diff = o.totalContacts - leads.reduce((a, b) => a + b, 0);
  leads[0] += diff;
  const created = new Date(o.createdAt);
  return picked.map((name, i) => {
    const uploaded = new Date(created);
    uploaded.setDate(uploaded.getDate() + i);
    return {
      id: `${o.id}-src-${i + 1}`,
      name,
      uploadedAt: uploaded.toISOString().slice(0, 10),
      leads: leads[i],
    };
  });
}

// Pull the human-readable purpose out of the outreach name. We name outreaches
// `<Project> — <Purpose>` so a substring match is reliable; fall back to
// "Lead Qualification" for anything quirky.
function _purposeFromName(name: string): string {
  const m = name.match(/—\s*(.+)$/);
  if (m) return m[1].trim();
  return "Lead Qualification";
}

// Synthesise the full detail object for any outreach id. Mostly a lookup
// + a handful of derivations (totalCalls, avgDuration, source list, dial
// attempt buckets) so every widget on the detail page has real data tied
// to *this* outreach — not a hardcoded singleton.
export function outreachDetailForId(id: string): OutreachDetail | null {
  const o = outreachList.find(x => x.id === id);
  if (!o) return null;

  // Total dial attempts are usually higher than unique leads called —
  // some leads needed 2–5 attempts. The 1.5× multiplier is a rough
  // industry average; outreaches with no calls naturally stay at zero.
  const totalCalls = o.called > 0 ? Math.round(o.called * 1.55) : 0;
  const totalMinutes = o.talktimeMins;
  const avgDuration = totalCalls > 0
    ? Math.round((totalMinutes / totalCalls) * 10) / 10
    : 0;
  // Small failure modes — not big enough to dominate the funnel, but
  // present so the Profile tab has something to show.
  const busy = Math.round(o.called * 0.03);
  const wrongNumber = Math.round(o.called * 0.02);
  const remaining = Math.max(0, o.totalContacts - o.called);

  // Schedule + window — common defaults for the prototype. Editing in
  // EditOutreachDrawer overrides this; we just provide a sensible base.
  const created = new Date(o.createdAt);
  const windowEnd = new Date(created);
  windowEnd.setDate(windowEnd.getDate() + 90);

  return {
    id: o.id,
    name: o.name,
    voiceAgent: o.voiceAgent,
    purpose: _purposeFromName(o.name),
    status: o.status,
    totalContacts: o.totalContacts,
    called: o.called,
    connected: o.connected,
    interacted: o.interacted,
    qualified: o.qualified,
    notQualified: o.notQualified,
    callback: o.callback,
    noAnswer: o.noAnswer,
    busy,
    wrongNumber,
    remaining,
    avgDuration,
    totalCalls,
    totalMinutes,
    spend: o.spend,
    activityDays: o.activityDays,
    sources: _synthSources(o),
    createdAt: o.createdAt,
    windowStart: o.createdAt,
    windowEnd: windowEnd.toISOString().slice(0, 10),
    dialAttempts: _dialAttemptBuckets(o.called, o.id),
    schedule: {
      dailyLimit: 200,
      callingHours: "10:00 AM – 7:00 PM",
      days: "Mon–Sat",
      retryEnabled: true,
      maxRetries: 4,
      retryInterval: "4 hours",
    },
  };
}

// 90-day per-outreach activity series, used by the KPI widgets on the
// Per-outreach sparkline series. Both functions now derive from the
// unified daily-series module — talktime and spend are independent fields
// on each day's fingerprint, so the spend curve no longer has to be an
// exact ₹20 × talktime multiple. That removes a tell that real call-centre
// data wouldn't have (some calls connect but barely talk, etc.) and means
// the spend trend chip can move differently from the talktime one.
export function outreachDailyTalktimeForId(id: string): number[] {
  return outreachDailySeriesForIdInternal(id).map((d) => d.talkMinutes);
}

export function outreachDailySpendForId(id: string): number[] {
  return outreachDailySeriesForIdInternal(id).map((d) => d.spend);
}

// Lazy delegation so the import cycle between daily-series.ts and this
// file resolves cleanly — daily-series needs OutreachListItem, and
// outreach-data is the canonical home for the legacy talktime/spend
// shape exporters. Keeps both modules cycle-safe.
function outreachDailySeriesForIdInternal(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { dailySeriesForOutreach } = require("./daily-series") as typeof import("./daily-series");
  return dailySeriesForOutreach(id);
}

// CSV preview mock
export const csvPreviewHeaders = ["Name", "Phone", "Email", "Source", "Budget"];
export const csvPreviewRows = [
  ["Ramesh Kumar", "9876543210", "ramesh@gmail.com", "Meta Lead", "₹1.5Cr"],
  ["Sunita Patel", "9012345678", "sunita@yahoo.com", "Website", "₹2Cr"],
  ["Vikram Singh", "8765432109", "vikram@outlook.com", "Meta Lead", "₹80L"],
  ["Ananya Rao", "9123456780", "ananya@gmail.com", "Referral", "₹1.8Cr"],
  ["Deepak Menon", "8012345679", "deepak@gmail.com", "Meta Lead", "₹1.2Cr"],
];
