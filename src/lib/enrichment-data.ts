// Enrichment domain types + mock data + lightweight runs store.
// V1 ports app.revspot enrichment into launchpad. No new functionality.

"use client";

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────

export type EnrichmentType = "professional" | "financial";

export type RunStatus = "in_progress" | "done" | "failed";

export type RunSource = "single" | "bulk";

export type RequiredField = "email" | "phone" | "linkedin" | "name";

export interface ColumnMapping {
  field: RequiredField;
  detectedColumn: string | null; // null = unmapped
  sampleValue?: string;
}

export interface SingleInput {
  email?: string;
  phone?: string;
  linkedin?: string;
  name?: string;
}

// Pricing, v1 placeholder. Real values come later.
export const CREDITS_PER_LEAD: Record<EnrichmentType, number> = {
  professional: 1,
  financial: 1,
};

// User's current credit balance (mocked in store).
// Real implementation would read from billing.

// ── Profile shape (what an enriched lead looks like) ─────────────────────

export interface ProfessionalEnrichment {
  name?: string;
  linkedin?: string;
  profile_summary?: string;
  personality?: string;
  age?: number;
  age_group?: string;
  location?: string;
  location_type?: string;
  state?: string;
  city?: string;
  country?: string;
  employed?: boolean;
  engineer?: boolean;
  professional_level?: string;
  years_of_experience?: number;
  job_title?: string;
  company_name?: string;
  company_tier?: string;
  company_industry?: string;
  university_tier?: string;
  iit_iim?: boolean;
  mba?: boolean;
  photo_url?: string;
  languages?: string[];
}

export interface FinancialEnrichment {
  credit_limit?: number;
  credit_utilization?: number;
  credit_score?: number;
  total_credit_cards?: number;
  car_loan_amount?: number;
  total_cars?: number;
  home_loan_amount?: number;
  home_emi?: number;
  total_home_loans?: number;
  estimated_yearly_earnings?: number;
  estimated_lifetime_earnings?: number;
  annual_earnings_inr_min?: number;
  annual_earnings_inr_max?: number;
  potential_tier?: "Low" | "Medium" | "High";
  final_score?: number;
}

export interface EnrichedProfile {
  lead_id?: string;
  professional?: ProfessionalEnrichment;
  financial?: FinancialEnrichment;
  // status fields
  enrichment_status?: "Zero Enrichment" | "Fully Enriched" | "Partial Enrichment";
  finance_data?: "Available" | "Not Available";
  email_verification_status?: string;
  phone_verification_status?: string;
  valid_indian_name?: boolean;
  // Original input the user typed, used as fallback header when no professional block.
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  };
}

// ── Run record ───────────────────────────────────────────────────────────

export interface RunRecord {
  id: string;
  source: RunSource;            // single | bulk
  filename?: string;            // bulk only
  inputValue?: string;          // single only (email/phone/linkedin/name display)
  types: EnrichmentType[];      // ["professional"], ["financial"], or both
  status: RunStatus;
  progressPct?: number;         // in_progress only
  leadsTotal: number;
  leadsSuccess: number;
  leadsFailed: number;
  leadsSkipped: number;
  creditsBlocked: number;       // up front
  creditsCharged: number;       // on completion
  creditsRefunded: number;      // on completion
  startedAt: string;
  finishedAt?: string;
  errorCode?: string;           // failed only
  errorMessage?: string;        // failed only
  profile?: EnrichedProfile;    // single only
}

// ── Mock data ────────────────────────────────────────────────────────────

export const sampleProfile: EnrichedProfile = {
  lead_id: "00Qe200000Sygly",
  enrichment_status: "Fully Enriched",
  finance_data: "Available",
  email_verification_status: "Valid",
  phone_verification_status: "Valid",
  valid_indian_name: true,
  professional: {
    name: "Arjun Mehta",
    linkedin: "https://linkedin.com/in/arjunmehta",
    profile_summary:
      "Senior software engineer with 11 years experience across fintech and consumer. IIT Delhi → Goldman Sachs → Razorpay → currently Staff Eng at PhonePe.",
    personality: "Analytical, pragmatic, growth-oriented",
    age: 34,
    age_group: "30-39",
    location: "Bangalore",
    location_type: "Metro",
    state: "Karnataka",
    city: "Bangalore",
    country: "India",
    employed: true,
    engineer: true,
    professional_level: "Senior",
    years_of_experience: 11,
    job_title: "Staff Software Engineer",
    company_name: "PhonePe",
    company_tier: "Tier 1",
    company_industry: "Fintech",
    university_tier: "Tier 1",
    iit_iim: true,
    mba: false,
    languages: ["English", "Hindi"],
  },
  financial: {
    credit_limit: 850000,
    credit_utilization: 0.18,
    credit_score: 812,
    total_credit_cards: 4,
    car_loan_amount: 0,
    total_cars: 1,
    home_loan_amount: 9500000,
    home_emi: 78000,
    total_home_loans: 1,
    estimated_yearly_earnings: 6500000,
    estimated_lifetime_earnings: 145000000,
    annual_earnings_inr_min: 6000000,
    annual_earnings_inr_max: 7500000,
    potential_tier: "High",
    final_score: 87,
  },
  contact: {
    name: "Arjun Mehta",
    email: "arjun.mehta@phonepe.com",
    phone: "+91 98765 43210",
    linkedin: "https://linkedin.com/in/arjunmehta",
  },
};

const mockRuns: RunRecord[] = [
  {
    id: "run-1",
    source: "bulk",
    filename: "godrej-whitefield-leads.csv",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 1000,
    leadsSuccess: 782,
    leadsFailed: 198,
    leadsSkipped: 20,
    creditsBlocked: 2000,
    creditsCharged: 1564,
    creditsRefunded: 436,
    startedAt: "2026-05-22T08:14:00Z",
    finishedAt: "2026-05-22T10:42:00Z",
  },
  {
    id: "run-2",
    source: "bulk",
    filename: "assetz-sarjapur-q2.xlsx",
    types: ["professional"],
    status: "in_progress",
    progressPct: 47,
    leadsTotal: 2400,
    leadsSuccess: 0,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 2400,
    creditsCharged: 0,
    creditsRefunded: 0,
    startedAt: "2026-05-22T11:20:00Z",
  },
  {
    id: "run-3",
    source: "single",
    inputValue: "arjun.mehta@phonepe.com",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 1,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 2,
    creditsCharged: 2,
    creditsRefunded: 0,
    startedAt: "2026-05-22T07:02:00Z",
    finishedAt: "2026-05-22T07:02:08Z",
    profile: sampleProfile,
  },
  {
    id: "run-4",
    source: "bulk",
    filename: "chefworks-hni-mar.csv",
    types: ["financial"],
    status: "failed",
    leadsTotal: 540,
    leadsSuccess: 0,
    leadsFailed: 540,
    leadsSkipped: 0,
    creditsBlocked: 540,
    creditsCharged: 0,
    creditsRefunded: 540,
    startedAt: "2026-05-21T16:00:00Z",
    finishedAt: "2026-05-21T16:08:00Z",
    errorCode: "PROVIDER_TIMEOUT",
    errorMessage: "Financial enrichment provider timed out after 3 retries.",
  },
  {
    id: "run-5",
    source: "single",
    inputValue: "+91 9876543210",
    types: ["professional"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 1,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 1,
    creditsCharged: 1,
    creditsRefunded: 0,
    startedAt: "2026-05-20T14:23:00Z",
    finishedAt: "2026-05-20T14:23:04Z",
    profile: { ...sampleProfile, financial: undefined },
  },
];

// ── Sample CSV files (download links) ────────────────────────────────────

// Picks the right static sample file based on enrichment types.
//   - prof + fin → name, phone, email, linkedin (full)
//   - financial  → name, phone (minimum for financial)
//   - professional / empty → email, phone, linkedin (no name needed)
// Files live under public/sample-csvs/ and contain ~50 demo leads each
// so an uploaded run shows real chart variation.

export function sampleCsvFilename(types: EnrichmentType[]): string {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (hasPro && hasFin) return "enrichment-sample-pro-fin.csv";
  if (hasFin) return "enrichment-sample-financial.csv";
  return "enrichment-sample-professional.csv";
}

export function sampleCsvDataUrl(types: EnrichmentType[]): string {
  return `/sample-csvs/${sampleCsvFilename(types)}`;
}

// ── Validation: which types are runnable given inputs available ──────────

export function runnableTypes(
  selected: EnrichmentType[],
  available: Set<RequiredField>,
): { runnable: EnrichmentType[]; skipped: { type: EnrichmentType; missing: RequiredField[] }[] } {
  const runnable: EnrichmentType[] = [];
  const skipped: { type: EnrichmentType; missing: RequiredField[] }[] = [];

  for (const t of selected) {
    if (t === "professional") {
      // Any one of email / phone / linkedin
      if (available.has("email") || available.has("phone") || available.has("linkedin")) {
        runnable.push("professional");
      } else {
        skipped.push({ type: "professional", missing: ["email", "phone", "linkedin"] });
      }
    } else if (t === "financial") {
      // Phone + Name required (name derivable from email/linkedin downstream, but phone always required)
      const missing: RequiredField[] = [];
      if (!available.has("phone")) missing.push("phone");
      // Name can be derived if email or linkedin present
      const nameDerivable = available.has("name") || available.has("email") || available.has("linkedin");
      if (!nameDerivable) missing.push("name");
      if (missing.length === 0) runnable.push("financial");
      else skipped.push({ type: "financial", missing });
    }
  }
  return { runnable, skipped };
}

// ── Auto-detect CSV column → required field mapping ──────────────────────

const FIELD_HINTS: Record<RequiredField, string[]> = {
  email: ["email", "e-mail", "mail", "email_address", "emailaddress"],
  phone: ["phone", "phone_number", "mobile", "contact", "phone_no", "mobileno", "tel"],
  linkedin: ["linkedin", "linkedin_url", "li_url", "li", "profile_url", "linkedinprofile"],
  name: ["name", "full_name", "fullname", "first_name", "lead_name", "contact_name"],
};

export function autoDetectMapping(headers: string[]): Record<RequiredField, string | null> {
  const lower = headers.map((h) => ({ original: h, norm: h.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  const out: Record<RequiredField, string | null> = { email: null, phone: null, linkedin: null, name: null };
  for (const field of ["email", "phone", "linkedin", "name"] as RequiredField[]) {
    const hints = FIELD_HINTS[field].map((h) => h.replace(/[^a-z0-9]/g, ""));
    const hit = lower.find(({ norm }) => hints.some((h) => norm === h || norm.includes(h)));
    if (hit) out[field] = hit.original;
  }
  return out;
}

// ── Store ─────────────────────────────────────────────────────────────────

interface EnrichmentStore {
  runs: RunRecord[];
  balance: number;
  unseenCompletions: number;   // for sidebar badge
  addRun: (run: RunRecord) => void;
  markCompletionsSeen: () => void;
  setRuns: (runs: RunRecord[]) => void;
  tickProgress: () => void;    // advances any in_progress bulk runs; flips to "done" at 100%
}

export const useEnrichmentStore = create<EnrichmentStore>((set) => ({
  runs: mockRuns,
  balance: 12480,
  unseenCompletions: 1,        // one new completion since last visit (for demo)
  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  markCompletionsSeen: () => set({ unseenCompletions: 0 }),
  setRuns: (runs) => set({ runs }),
  tickProgress: () =>
    set((s) => {
      let changed = false;
      const next = s.runs.map((r) => {
        if (r.status !== "in_progress") return r;
        const cur = r.progressPct ?? 0;
        // Bumps of 3–9% per tick, feels organic, not linear.
        const bump = 3 + Math.floor(Math.random() * 7);
        const np = Math.min(100, cur + bump);
        changed = true;
        if (np >= 100) {
          // Settle the run: 92% success, ~6% skipped, ~2% failed, realistic-ish.
          const total = r.leadsTotal ?? 0;
          const success = Math.round(total * 0.92);
          const skipped = Math.round(total * 0.06);
          const failed = Math.max(0, total - success - skipped);
          const perLead = r.types.reduce((sum, t) => sum + CREDITS_PER_LEAD[t], 0);
          const charged = (success + failed) * perLead;
          const refunded = Math.max(0, (r.creditsBlocked ?? 0) - charged);
          return {
            ...r,
            status: "done" as RunStatus,
            progressPct: 100,
            leadsSuccess: success,
            leadsSkipped: skipped,
            leadsFailed: failed,
            creditsCharged: charged,
            creditsRefunded: refunded,
            finishedAt: new Date().toISOString(),
          };
        }
        return { ...r, progressPct: np };
      });
      return changed ? { runs: next } : s;
    }),
}));

// ── Formatting helpers ───────────────────────────────────────────────────

export function formatCredits(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function successPct(run: RunRecord): number {
  if (run.leadsTotal === 0) return 0;
  return Math.round((run.leadsSuccess / run.leadsTotal) * 100);
}

export function typeLabel(types: EnrichmentType[]): string {
  if (types.length === 2) return "Both";
  if (types[0] === "professional") return "Professional";
  if (types[0] === "financial") return "Financial";
  return "—";
}

export function typeShortLabel(types: EnrichmentType[]): string {
  if (types.length === 2) return "Pro · Fin";
  if (types[0] === "professional") return "Pro";
  if (types[0] === "financial") return "Fin";
  return "—";
}
