// Lead data for the project-scoped Leads view (e.g. Mana Dale Inbound SV).
//
// Schema mirrors the production admin's columns — Name / Phone / Created At /
// Updated At / Call Duration / Enrichment / AI Qualification / Temperature /
// Lead Status / Next Action Time — and adds two QC-layer fields:
//
//   - qcQualification : the human reviewer's verdict (uses the same value
//                       set as aiQualification).
//   - signal          : numeric AI confidence score 0..100 ("has score" per
//                       the spec).
//
// A discrepancy is `aiQualification !== qcQualification`. Roughly a third of
// the seed rows are intentionally mismatched so the mismatch filter has
// real work to do.

export type Qualification =
  | "Qualified"
  | "Intent Qualified"
  | "Follow up"
  | "RnR On Voicemail"
  | "Disqualified";

export type Temperature = "Hot" | "Warm" | "Lukewarm" | "Cold";

export type EnrichmentStatus = "N/A" | "Enriched" | "Pending" | "Failed";

export interface SignalFactor {
  label: string;
  weight: number;       // -100..100 — contribution to overall signal
  detail: string;
}

export interface TranscriptTurn {
  speaker: "Agent" | "Customer";
  at: string;          // mm:ss
  text: string;
  /** Optional QC flag — short reason this line triggered the override. */
  flag?: string;
}

export interface TimelineEvent {
  at: string;                            // ISO
  kind: "ai" | "qc" | "system" | "call"; // affects icon + tint
  title: string;
  detail?: string;
}

export interface Lead {
  id: string;
  name: string;        // Real name — masked at display time
  phone: string;       // Real phone — masked at display time
  createdAt: string;   // ISO
  updatedAt: string;   // ISO
  callDurationSeconds: number;
  enrichment: EnrichmentStatus;
  aiQualification: Qualification;
  qcQualification: Qualification;
  signal: number;
  temperature: Temperature;
  leadStatus: Qualification; // mirrors AI in the existing screen
  nextActionTime: string;    // ISO or "triggered"
  // Optional richer fields used by the drill-down. Filled in by `getLeadDetail`
  // for any lead that doesn't define them explicitly.
  email?: string;
  source?: string;
  campaign?: string;
  budget?: string;
  location?: string;
  aiSummary?: string;
  aiReason?: string;       // one-line rationale for the AI label
  qcReason?: string;       // one-line rationale for the QC label / override
  signalFactors?: SignalFactor[];
  qcNote?: string;
  timeline?: TimelineEvent[];
  transcript?: TranscriptTurn[];
}

/** Project context — would normally come from route params. */
export const projectContext = {
  client: "mana_projects",
  project: "Mana Dale Inbound SV",
  status: "Running" as const,
};

export const leads: Lead[] = [
  // Matches AI (no discrepancy)
  {
    id: "l-001", name: "Manish Mehta", phone: "+91 9820011235",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 40, enrichment: "N/A",
    aiQualification: "Disqualified", qcQualification: "Disqualified", signal: 22,
    temperature: "Lukewarm", leadStatus: "Disqualified",
    nextActionTime: "2026-05-27T10:30:00",
  },
  // Matches AI
  {
    id: "l-002", name: "Suresh Sundaram", phone: "+91 9833077261",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 24, enrichment: "N/A",
    aiQualification: "Disqualified", qcQualification: "Disqualified", signal: 18,
    temperature: "Lukewarm", leadStatus: "Disqualified",
    nextActionTime: "2026-05-27T10:30:00",
  },
  // DISCREPANCY: AI says Intent Qualified, QC overrode to Qualified
  {
    id: "l-003", name: "Vikram Devarajan", phone: "+91 9821166346",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 50, enrichment: "N/A",
    aiQualification: "Intent Qualified", qcQualification: "Qualified", signal: 81,
    temperature: "Warm", leadStatus: "Intent Qualified",
    nextActionTime: "2026-05-27T05:10:00",
  },
  // Matches AI
  {
    id: "l-004", name: "Madhuri", phone: "+91 9856701459",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 0, enrichment: "N/A",
    aiQualification: "Follow up", qcQualification: "Follow up", signal: 54,
    temperature: "Lukewarm", leadStatus: "Follow up",
    nextActionTime: "2026-05-28T11:45:00",
  },
  // DISCREPANCY: AI Follow up → QC Disqualified after manual review
  {
    id: "l-005", name: "Anil Kanniyappan", phone: "+91 9911227241",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 21, enrichment: "N/A",
    aiQualification: "Follow up", qcQualification: "Disqualified", signal: 31,
    temperature: "Lukewarm", leadStatus: "Follow up",
    nextActionTime: "triggered",
  },
  // Matches AI
  {
    id: "l-006", name: "Chandra Narayanan", phone: "+91 9847118273",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 50, enrichment: "N/A",
    aiQualification: "RnR On Voicemail", qcQualification: "RnR On Voicemail", signal: 47,
    temperature: "Lukewarm", leadStatus: "RnR On Voicemail",
    nextActionTime: "2026-05-27T10:30:00",
  },
  // Matches AI
  {
    id: "l-007", name: "Vikram Sharma", phone: "+91 9876538417",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 11, enrichment: "N/A",
    aiQualification: "RnR On Voicemail", qcQualification: "RnR On Voicemail", signal: 38,
    temperature: "Lukewarm", leadStatus: "RnR On Voicemail",
    nextActionTime: "2026-05-26T03:30:00",
  },
  // DISCREPANCY: AI Follow up → QC Qualified (QC found stronger signal)
  {
    id: "l-008", name: "Indira Govindarajan", phone: "+91 9333348801",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 0, enrichment: "N/A",
    aiQualification: "Follow up", qcQualification: "Qualified", signal: 72,
    temperature: "Lukewarm", leadStatus: "Follow up",
    nextActionTime: "2026-05-28T11:50:00",
  },
  // Matches AI
  {
    id: "l-009", name: "Pranab Krishnan", phone: "+91 9333133761",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 0, enrichment: "N/A",
    aiQualification: "Follow up", qcQualification: "Follow up", signal: 49,
    temperature: "Lukewarm", leadStatus: "Follow up",
    nextActionTime: "2026-05-28T11:50:00",
  },
  // DISCREPANCY: AI Follow up → QC Intent Qualified
  {
    id: "l-010", name: "Rohit Mohanasundaram", phone: "+91 9210980754",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 0, enrichment: "N/A",
    aiQualification: "Follow up", qcQualification: "Intent Qualified", signal: 64,
    temperature: "Lukewarm", leadStatus: "Follow up",
    nextActionTime: "2026-05-28T11:50:00",
  },
  // Matches AI (Qualified — gold case)
  {
    id: "l-011", name: "Venkatesh Krishnamurthy", phone: "+91 9876026860",
    createdAt: "2026-05-26T15:45:00", updatedAt: "2026-05-27T22:25:00",
    callDurationSeconds: 58, enrichment: "N/A",
    aiQualification: "Qualified", qcQualification: "Qualified", signal: 94,
    temperature: "Warm", leadStatus: "Qualified",
    nextActionTime: "2026-05-27T10:30:00",
  },
];

// ── Display helpers ───────────────────────────────────────────────────────

/** Mask a name: keep first letter + surname initial, e.g. "Manish Mehta" → "M****** M***" */
export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => p.charAt(0) + "*".repeat(Math.max(p.length - 1, 0)))
    .join(" ");
}

/** Mask a phone, keeping country code and last 4 digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  const tail = digits.slice(-4);
  return `+${"*".repeat(digits.length - 4)}${tail}`;
}

export function formatDate(iso: string): string {
  if (iso === "triggered") return "triggered";
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${day} ${month} ${year}, ${h12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

export function formatDuration(sec: number): string {
  if (sec === 0) return "0s";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function hasDiscrepancy(lead: Lead): boolean {
  return lead.aiQualification !== lead.qcQualification;
}

// ── Detail-view helpers ───────────────────────────────────────────────────

export function findLead(id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

/**
 * Returns the lead with sensible defaults filled in for any rich fields
 * that the seed didn't set. Lets the drill-down page assume every field
 * is available without forcing us to author 11 walls of mock content.
 */
export function getLeadDetail(lead: Lead) {
  const slug = lead.id.replace(/^l-/, "");
  return {
    ...lead,
    email: lead.email ?? `${lead.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
    source: lead.source ?? "Voice Agent — Aria",
    campaign: lead.campaign ?? "Mana Dale Inbound SV",
    budget: lead.budget ?? "₹1.5–₹2 Cr",
    location: lead.location ?? "Whitefield, Bangalore",
    aiSummary:    lead.aiSummary    ?? defaultAiSummary(lead),
    aiReason:     lead.aiReason     ?? defaultAiReason(lead),
    qcReason:     lead.qcReason     ?? defaultQcReason(lead),
    signalFactors: lead.signalFactors ?? defaultSignalFactors(lead),
    qcNote:       lead.qcNote       ?? defaultQcNote(lead),
    timeline:     lead.timeline     ?? defaultTimeline(lead),
    transcript:   lead.transcript   ?? defaultTranscript(lead),
    _ref: slug, // useful for breadcrumbs
  };
}

export type LeadDetail = ReturnType<typeof getLeadDetail>;

function defaultAiSummary(lead: Lead): string {
  switch (lead.aiQualification) {
    case "Qualified":
      return "Caller confirmed budget, intent to buy within 60 days, and willingness to schedule a site visit. Strong tonal indicators throughout the call.";
    case "Intent Qualified":
      return "Engaged for the full duration, asked product-specific questions, but did not commit to a budget range. Moderate-strong intent signals.";
    case "Follow up":
      return "Conversation was civil but inconclusive. Caller asked for more details and said they would 'think about it' — needs a nudge later this week.";
    case "RnR On Voicemail":
      return "Voicemail reached after multiple ring attempts. No live conversation, but ringback patterns suggest the number is active.";
    case "Disqualified":
      return "Budget mismatch and/or out-of-target geography. Indicators across budget, intent, and timeline were below thresholds.";
  }
}

function defaultSignalFactors(lead: Lead): SignalFactor[] {
  const high = lead.signal >= 75;
  const mid = lead.signal >= 40 && lead.signal < 75;
  return [
    {
      label: "Budget alignment",
      weight: high ? 28 : mid ? 12 : -22,
      detail: high ? "Stated budget within target band" : mid ? "Budget hinted but not confirmed" : "Below floor for listed inventory",
    },
    {
      label: "Intent strength",
      weight: high ? 24 : mid ? 14 : -8,
      detail: high ? "Asked about possession date and EMI options" : mid ? "Showed product interest but no urgency" : "Curious browser, no near-term plan",
    },
    {
      label: "Engagement quality",
      weight: high ? 18 : mid ? 12 : 4,
      detail: lead.callDurationSeconds === 0 ? "No live call — score from form/messages only" : `Held attention for ${lead.callDurationSeconds}s`,
    },
    {
      label: "Geography fit",
      weight: high ? 12 : mid ? 8 : -10,
      detail: high ? "Target locality match" : mid ? "Adjacent locality" : "Outside target catchment",
    },
    {
      label: "Profile enrichment",
      weight: lead.enrichment === "Enriched" ? 10 : 0,
      detail:
        lead.enrichment === "Enriched"
          ? "Profile matched 3rd-party data"
          : "No enrichment data available",
    },
  ];
}

function defaultAiReason(lead: Lead): string {
  // One-liner: what the AI based its label on.
  switch (lead.aiQualification) {
    case "Qualified":
      return "Budget, intent, and timeline all above qualification thresholds.";
    case "Intent Qualified":
      return "Strong engagement and product interest; budget unconfirmed.";
    case "Follow up":
      return "Inconclusive call — caller asked questions but didn't commit.";
    case "RnR On Voicemail":
      return "No live conversation; voicemail with active ringback.";
    case "Disqualified":
      return "Signal below qualification floor across budget / intent.";
  }
}

function defaultQcReason(lead: Lead): string {
  // What the human reviewer caught that flipped the verdict (or confirms it).
  if (!hasDiscrepancy(lead)) {
    return "Reviewer confirmed AI label — no override.";
  }
  const from = lead.aiQualification;
  const to = lead.qcQualification;

  // Pick the most likely reason based on the override direction.
  if (to === "Qualified" && (from === "Intent Qualified" || from === "Follow up")) {
    return "Caller explicitly confirmed budget and asked to book a site visit — AI under-weighted the closing turn.";
  }
  if (to === "Intent Qualified" && from === "Follow up") {
    return "Caller asked detailed ROI / possession questions, indicating real intent — not just curious browsing.";
  }
  if (to === "Disqualified" && (from === "Follow up" || from === "Intent Qualified")) {
    return "Caller stated a non-buy intent (rental, job, info-only) that AI missed in the transcript.";
  }
  if (to === "Follow up" && from === "Qualified") {
    return "Caller hedged in the final turn — too soft a commitment to release to sales.";
  }
  // Generic fallback
  return `AI labelled "${from}" but reviewer found contradicting evidence in the call. See flagged turn(s) in transcript.`;
}

function defaultQcNote(lead: Lead): string {
  if (hasDiscrepancy(lead)) {
    return `AI scored ${lead.signal} and labelled this "${lead.aiQualification}". Reviewer overrode to "${lead.qcQualification}" — see notes from manager review on ${formatDate(lead.updatedAt)}.`;
  }
  return "QC review confirmed AI judgement. No override.";
}

function defaultTranscript(lead: Lead): TranscriptTurn[] {
  // Always return a small, realistic-looking conversation. If the lead has
  // a QC override, embed a flagged turn that explains WHY QC disagreed —
  // this is the "evidence" the reviewer would point to.
  const base: TranscriptTurn[] = [
    {
      speaker: "Agent",
      at: "00:02",
      text:
        "Hi, this is Aria from Mana Dale. I'm calling about your enquiry for the project in Whitefield. Is now an okay time to talk?",
    },
    {
      speaker: "Customer",
      at: "00:08",
      text: "Yeah, sure. Go ahead.",
    },
    {
      speaker: "Agent",
      at: "00:14",
      text:
        "Great. Could I quickly understand — are you looking at this for self-use, or as an investment? And do you have a budget range in mind?",
    },
  ];

  if (!hasDiscrepancy(lead)) {
    // No-mismatch path: caller answers cleanly, AI label stays.
    return [
      ...base,
      {
        speaker: "Customer",
        at: "00:22",
        text:
          lead.aiQualification === "Qualified"
            ? `Self-use. Budget is around ${lead.budget ?? "₹1.8 Cr"}. I'd like to visit the site this weekend if possible.`
            : lead.aiQualification === "Disqualified"
            ? "Honestly I'm just browsing, not really planning to buy anytime soon."
            : "I'm exploring options. Let me see what fits and I'll get back.",
      },
      {
        speaker: "Agent",
        at: "00:34",
        text: "Got it — I'll send over the brochure and follow up later this week.",
      },
    ];
  }

  // Mismatched case — drop in a flagged turn keyed to the override direction.
  const from = lead.aiQualification;
  const to = lead.qcQualification;
  let flaggedTurn: TranscriptTurn;

  if (to === "Disqualified" && from !== "Disqualified") {
    flaggedTurn = {
      speaker: "Customer",
      at: "00:21",
      text:
        "Actually I should mention — I'm looking for a rental, not to buy. I was told you guys also handle leasing?",
      flag: "Stated non-buy intent (rental). Should disqualify — AI missed this turn.",
    };
  } else if (to === "Qualified") {
    flaggedTurn = {
      speaker: "Customer",
      at: "00:24",
      text:
        "Budget is fine — around ₹1.9 Cr. Can we book a site visit this Saturday? My wife and I are ready to move on this.",
      flag: "Explicit budget + site visit ask = clear close intent. AI under-scored this turn.",
    };
  } else if (to === "Intent Qualified") {
    flaggedTurn = {
      speaker: "Customer",
      at: "00:24",
      text:
        "What's the expected ROI over 5 years? And what's the possession timeline — I'd want delivery before March 2027.",
      flag: "Specific ROI + possession questions signal real intent, not casual browsing.",
    };
  } else {
    flaggedTurn = {
      speaker: "Customer",
      at: "00:24",
      text: "I'll need to think about it and check with my partner before committing.",
      flag: "Soft commitment — too tentative for the AI's stronger label.",
    };
  }

  return [
    ...base,
    flaggedTurn,
    {
      speaker: "Agent",
      at: "00:35",
      text:
        to === "Disqualified"
          ? "Ah understood — we don't handle rentals, but I can connect you with a partner. Let me follow up by email."
          : "Perfect, I'll set up the slot and send confirmation by SMS.",
    },
  ];
}

function defaultTimeline(lead: Lead): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      at: lead.createdAt,
      kind: "system",
      title: "Lead created",
      detail: "Source: voice agent — campaign Mana Dale Inbound SV",
    },
    {
      at: lead.createdAt,
      kind: "call",
      title:
        lead.callDurationSeconds === 0
          ? "Call attempted — no answer"
          : `Call completed (${lead.callDurationSeconds}s)`,
      detail: lead.callDurationSeconds === 0
        ? "Voicemail; agent left a callback message"
        : "Voice agent Aria conducted qualification",
    },
    {
      at: lead.updatedAt,
      kind: "ai",
      title: `AI qualified as "${lead.aiQualification}"`,
      detail: `Signal score: ${lead.signal}/100`,
    },
  ];
  if (hasDiscrepancy(lead)) {
    events.push({
      at: lead.updatedAt,
      kind: "qc",
      title: `QC override → "${lead.qcQualification}"`,
      detail: "Reviewer disagreed with AI label after listening to call",
    });
  }
  return events;
}
