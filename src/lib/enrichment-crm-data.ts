// Enrichment domain types + mock data + lightweight runs store.
// V1 ports app.revspot enrichment into launchpad. No new functionality.

"use client";

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────

export type EnrichmentType = "professional" | "financial";

export type RunStatus = "in_progress" | "done" | "failed";

export type RunSource = "single" | "bulk" | "crm";

// ── CRM integration ──────────────────────────────────────────────────────

export type CrmProvider = "salesforce" | "hubspot" | "pipedrive";
export type CrmLeadChannel = "Web form" | "API" | "Salesforce" | "Chat" | "Import";

export interface CrmOriginRef {
  provider: CrmProvider;
  objectType: "Lead" | "Contact" | "Account";
  recordId: string;
  recordUrl?: string;
  channel: CrmLeadChannel;          // how the lead landed in the CRM
}

export interface CrmSyncState {
  status: "not_pushed" | "pending" | "synced" | "failed";
  syncedAt?: string;
  pushedRecords?: number;
  failedRecords?: number;
  errorMessage?: string;
}

export interface CrmConnection {
  provider: CrmProvider;
  accountName: string;
  connectedAt: string;
  lastSyncedAt: string;
  status: "connected" | "degraded" | "disconnected";
  mappedFieldCount: number;
  writeBackPolicy: "fill_blanks" | "overwrite" | "field_selective";
}

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
  profile?: EnrichedProfile;    // single only (and crm, one profile per row)
  leads?: EnrichedProfile[];    // bulk only, sample of enriched lead profiles
  // CRM-only fields
  crmOrigin?: CrmOriginRef;     // when source=crm
  crmSync?: CrmSyncState;       // for any run that was pushed back to CRM
}

// ── Mock data ────────────────────────────────────────────────────────────

// Deterministic per-lead variation. Without this every synthesized profile
// inherits the sampleProfile's tier/seniority/location/etc. → dashboard
// charts collapse to one bar per card. `seed` is any integer (e.g.
// row index combined with run-hash) and produces consistent values across
// re-renders for the same seed.
export function varyProfile(seed: number): {
  professional: Partial<NonNullable<EnrichedProfile["professional"]>>;
  financial: Partial<NonNullable<EnrichedProfile["financial"]>>;
} {
  const s = Math.abs(seed | 0);
  const pick = <T>(arr: readonly T[], salt: number) => arr[(s * 9301 + salt) % arr.length];

  const TIERS = ["Tier 1", "Tier 1", "Tier 2", "Tier 2", "Tier 3", "Tier 4"] as const;
  const LOCATIONS = ["Metro", "Metro", "Metro", "Tier-2", "Tier-2", "Tier-3"] as const;
  const LEVELS = ["Senior", "Senior", "Mid", "Mid", "Exec", "Junior"] as const;
  const AGE_GROUPS = ["18-29", "30-39", "30-39", "30-39", "40-49", "50+"] as const;
  const UNIS = ["Tier 1", "Tier 1", "Tier 2", "Tier 2", "Tier 3", "Other"] as const;
  const INDUSTRIES = ["Fintech", "SaaS", "E-commerce", "Edtech", "Healthcare", "Other"] as const;
  const POTENTIAL = ["High", "Medium", "Medium", "Medium", "Low", "Low"] as const;

  const level = pick(LEVELS, 13);
  const ageGroup = pick(AGE_GROUPS, 29);
  const yoe =
    ageGroup === "18-29" ? 2 + ((s * 7) % 5)
    : ageGroup === "30-39" ? 6 + ((s * 11) % 8)
    : ageGroup === "40-49" ? 14 + ((s * 13) % 10)
    : 22 + ((s * 17) % 10);
  const creditScore = 540 + ((s * 23) % 290); // 540..829
  const creditLimit = Math.round(50_000 + ((s * 41) % 20) * 100_000); // 50k..2M
  const cards = (s * 31) % 7; // 0..6
  const cars = (s * 19) % 4;  // 0..3
  // Income band keyed off level + small jitter so seniority correlates with earnings.
  const incomeBase =
    level === "Exec" ? 30_00_000
    : level === "Senior" ? 15_00_000
    : level === "Mid" ? 8_00_000
    : 4_00_000;
  const jitter = ((s * 37) % 50) * 50_000; // 0..2.45M
  const lo = incomeBase + jitter;
  const hi = lo + (10_00_000 + ((s * 53) % 30) * 100_000);
  const homeLoan = (s * 47) % 3 === 0
    ? 0
    : Math.round(((s * 59) % 60) * 5_00_000); // 0..30M
  const finalScore = 25 + ((s * 67) % 70); // 25..94
  const potential =
    finalScore >= 75 ? "High"
    : finalScore >= 50 ? "Medium"
    : pick(POTENTIAL, 71);

  return {
    professional: {
      location_type: pick(LOCATIONS, 3),
      professional_level: level,
      age_group: ageGroup,
      years_of_experience: yoe,
      company_tier: pick(TIERS, 7),
      company_industry: pick(INDUSTRIES, 19),
      university_tier: pick(UNIS, 23),
      iit_iim: (s * 5) % 10 < 2,
      mba: (s * 11) % 10 < 3,
      engineer: (s * 13) % 10 < 7,
      employed: (s * 17) % 100 < 96,
    },
    financial: {
      credit_score: creditScore,
      credit_limit: creditLimit,
      total_credit_cards: cards,
      total_cars: cars,
      home_loan_amount: homeLoan,
      annual_earnings_inr_min: lo,
      annual_earnings_inr_max: hi,
      potential_tier: potential,
      final_score: finalScore,
    },
  };
}

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

// ── CRM connection (mocked) ──────────────────────────────────────────────

export const mockCrmConnection: CrmConnection = {
  provider: "salesforce",
  accountName: "Revspot Demo Org",
  connectedAt: "2026-04-08T09:00:00Z",
  lastSyncedAt: "2026-05-23T11:54:00Z",
  status: "connected",
  mappedFieldCount: 14,
  writeBackPolicy: "fill_blanks",
};

// ── CRM activity seed (deterministic 14-day history) ─────────────────────
// Module-level deterministic generation so chart + table render identically
// on every load (no Math.random/Date.now at init).

export const CRM_NAMES_POOL: { name: string; email: string; phone: string; company: string; title: string }[] = [
  { name: "Aarav Sharma",   email: "aarav.sharma@infosys.com",   phone: "+91 98201 23456", company: "Infosys",       title: "Senior Manager" },
  { name: "Priya Iyer",     email: "priya.iyer@phonepe.com",     phone: "+91 99845 67890", company: "PhonePe",       title: "Product Lead" },
  { name: "Rohan Kapoor",   email: "rohan.kapoor@razorpay.com",  phone: "+91 98677 11223", company: "Razorpay",      title: "Engineering Manager" },
  { name: "Ananya Reddy",   email: "ananya.reddy@flipkart.com",  phone: "+91 99800 33445", company: "Flipkart",      title: "Director" },
  { name: "Vikram Singh",   email: "vikram.singh@swiggy.in",     phone: "+91 98765 55667", company: "Swiggy",        title: "VP Sales" },
  { name: "Neha Patel",     email: "neha.patel@zomato.com",      phone: "+91 99812 77889", company: "Zomato",        title: "Growth Lead" },
  { name: "Karthik Menon",  email: "karthik.m@cred.club",        phone: "+91 98300 99001", company: "CRED",          title: "Principal Engineer" },
  { name: "Divya Nair",     email: "divya.nair@meesho.com",      phone: "+91 99002 22334", company: "Meesho",        title: "Senior PM" },
  { name: "Arjun Bhatia",   email: "arjun.bhatia@paytm.com",     phone: "+91 98044 44556", company: "Paytm",         title: "AVP" },
  { name: "Sneha Joshi",    email: "sneha.joshi@oyo.com",        phone: "+91 99056 66778", company: "OYO",           title: "Marketing Director" },
  { name: "Rahul Verma",    email: "rahul.verma@byjus.com",      phone: "+91 98178 88990", company: "Byju's",        title: "Head of Sales" },
  { name: "Pooja Krishnan", email: "pooja.k@dream11.com",        phone: "+91 99109 11223", company: "Dream11",       title: "Senior Director" },
  { name: "Aditya Rao",     email: "aditya.rao@nykaa.com",       phone: "+91 98321 33445", company: "Nykaa",         title: "Group PM" },
  { name: "Ishita Gupta",   email: "ishita.g@unacademy.com",     phone: "+91 99432 55667", company: "Unacademy",     title: "VP Engineering" },
  { name: "Kunal Desai",    email: "kunal.desai@upgrad.com",     phone: "+91 98553 77889", company: "upGrad",        title: "CTO" },
  { name: "Meera Pillai",   email: "meera.pillai@licious.in",    phone: "+91 99564 99001", company: "Licious",       title: "Senior Director" },
  { name: "Sanjay Khanna",  email: "sanjay.k@policybazaar.com",  phone: "+91 98675 22334", company: "PolicyBazaar",  title: "Senior VP" },
  { name: "Ritu Agarwal",   email: "ritu.a@delhivery.com",       phone: "+91 99786 44556", company: "Delhivery",     title: "Head of Product" },
  { name: "Manish Tiwari",  email: "manish.t@bharatpe.com",      phone: "+91 98897 66778", company: "BharatPe",      title: "Director" },
  { name: "Tanvi Saxena",   email: "tanvi.s@zerodha.com",        phone: "+91 99908 88990", company: "Zerodha",       title: "Lead Analyst" },
];

const CRM_CHANNELS: CrmLeadChannel[] = ["Web form", "API", "Salesforce", "Chat", "Import"];
const CRM_PROVIDERS: CrmProvider[] = ["salesforce", "hubspot", "pipedrive"];

// "Today" anchor for seeded CRM runs. We derive it from the real current
// date (truncated to UTC midnight) so the demo always shows data ending today —
// otherwise the Today/7d windows in the chart go empty whenever the wall clock
// drifts past the hardcoded date.
function seedTodayMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function buildCrmRuns(): RunRecord[] {
  const today = seedTodayMs();
  const out: RunRecord[] = [];
  let runIdx = 0;

  // 3 years of history, day 0 = today, day 1094 = oldest. Volume tapers off
  // for older periods so the seed stays under ~5k records but the chart still
  // shows a believable activity curve at every granularity (day/week/month).
  const DAYS = 1095;
  for (let d = 0; d < DAYS; d++) {
    const dow = (today / 86400000 - d) % 7;
    const isWeekend = ((Math.round(dow) % 7) + 7) % 7 < 2;

    // Tiered density. Newest period = full volume, older periods thin out.
    //   0..30   → 8–20/day
    //   31..180 → 4–10/day
    //   181..365→ 3–8/day
    //   366..1095→ 1–5/day
    let dayCount: number;
    if (d <= 30) {
      dayCount = isWeekend ? 6 + (d % 3) : 12 + ((d * 5) % 9);
    } else if (d <= 180) {
      dayCount = isWeekend ? 3 + (d % 3) : 6 + ((d * 3) % 5);
    } else if (d <= 365) {
      dayCount = isWeekend ? 2 + (d % 2) : 4 + ((d * 2) % 5);
    } else {
      dayCount = isWeekend ? 1 + (d % 2) : 2 + (d % 4);
    }

    for (let i = 0; i < dayCount; i++) {
      const ts = today - d * 86400000 + (8 + i * 0.4) * 3600000; // 08:00 onwards, 24-min cadence
      const startedAt = new Date(ts).toISOString();
      const finishedAt = new Date(ts + 2400 + (i % 5) * 800).toISOString(); // 2.4–6s later

      const person = CRM_NAMES_POOL[(d * 7 + i) % CRM_NAMES_POOL.length];
      const channel = CRM_CHANNELS[(d * 3 + i) % CRM_CHANNELS.length];
      const provider = CRM_PROVIDERS[(d + i) % CRM_PROVIDERS.length];

      // Types: 50% pro-only, 25% fin-only, 25% both.
      const tBucket = (d * 11 + i * 3) % 4;
      const types: EnrichmentType[] =
        tBucket === 0 ? ["financial"] :
        tBucket === 3 ? ["professional", "financial"] :
        ["professional"];

      // Outcome buckets, calibrated to ~65% enriched SLA, near-zero system failures:
      //   0..62  → fully enriched   (63%)
      //   63..69 → partial enriched (7%)   → still counts as "enriched" in KPI
      //   70..98 → zero enrichment  (29%) → status=done, no public data found
      //   99     → failed           (1%)  → system-side failure, target is zero
      const oBucket = (d * 17 + i * 5) % 100;
      const failed = oBucket === 99;
      const zeroEnrichment = !failed && oBucket >= 70;
      const partial = !failed && !zeroEnrichment && oBucket >= 63;

      const wantsPro = types.includes("professional");
      const wantsFin = types.includes("financial");
      const gotPro = !failed && !zeroEnrichment && wantsPro && !(partial && (i % 2 === 0));
      const gotFin = !failed && !zeroEnrichment && wantsFin && !(partial && (i % 2 === 1));

      const profile: EnrichedProfile | undefined = failed ? undefined : {
        lead_id: `${provider.slice(0, 2).toUpperCase()}-${100000 + runIdx}`,
        enrichment_status: zeroEnrichment ? "Zero Enrichment" : partial ? "Partial Enrichment" : "Fully Enriched",
        finance_data: gotFin ? "Available" : "Not Available",
        email_verification_status: "Valid",
        phone_verification_status: i % 9 === 0 ? "Unverified" : "Valid",
        valid_indian_name: true,
        contact: {
          name: person.name,
          email: person.email,
          phone: person.phone,
        },
        professional: gotPro ? {
          ...sampleProfile.professional,
          ...varyProfile(d * 10000 + runIdx).professional,
          name: person.name,
          job_title: person.title,
          company_name: person.company,
        } : undefined,
        financial: gotFin
          ? { ...sampleProfile.financial, ...varyProfile(d * 10000 + runIdx).financial }
          : undefined,
      };

      const perLead = types.reduce((s, t) => s + CREDITS_PER_LEAD[t], 0);
      const success = failed ? 0 : 1;
      const fail = failed ? 1 : 0;
      const recordId = `00Q${(2_000_000 + runIdx).toString(36).toUpperCase().padStart(10, "0")}`;

      out.push({
        id: `crm-${d}-${i}`,
        source: "crm",
        types,
        status: failed ? "failed" : "done",
        leadsTotal: 1,
        leadsSuccess: success,
        leadsFailed: fail,
        leadsSkipped: 0,
        creditsBlocked: perLead,
        creditsCharged: failed ? 0 : perLead,
        creditsRefunded: failed ? perLead : 0,
        startedAt,
        finishedAt,
        errorCode: failed ? "PROVIDER_NO_MATCH" : undefined,
        errorMessage: failed ? "No matching record found for the supplied identifiers." : undefined,
        profile,
        crmOrigin: {
          provider,
          objectType: "Lead",
          recordId,
          recordUrl: `https://app.${provider}.com/lightning/r/Lead/${recordId}/view`,
          channel,
        },
        crmSync: failed
          ? { status: "not_pushed" }
          : { status: "synced", syncedAt: new Date(ts + 8000).toISOString(), pushedRecords: 1 },
      });
      runIdx++;
    }
  }
  // Newest first to match the rest of the runs array convention.
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

const crmRuns = buildCrmRuns();

// Generate a sample slice of enriched lead profiles for a bulk run. Caps at
// 50, drawer doesn't need every row, just enough to feel real.
function buildBulkLeads(
  successCount: number,
  failedCount: number,
  types: EnrichmentType[],
  seed: number,
): EnrichedProfile[] {
  const total = Math.min(successCount + failedCount, 50);
  const out: EnrichedProfile[] = [];
  for (let i = 0; i < total; i++) {
    const person = CRM_NAMES_POOL[(seed * 7 + i) % CRM_NAMES_POOL.length];
    const isFailed = i >= successCount;
    const oBucket = (seed * 17 + i * 5) % 100;
    const zero    = !isFailed && oBucket >= 80;
    const partial = !isFailed && !zero && oBucket >= 70;
    const wantsPro = types.includes("professional");
    const wantsFin = types.includes("financial");
    const gotPro = !isFailed && !zero && wantsPro && !(partial && i % 2 === 0);
    const gotFin = !isFailed && !zero && wantsFin && !(partial && i % 2 === 1);
    out.push({
      lead_id: `BLK-${seed}RUN${seed}-${String(i).padStart(4, "0")}`,
      enrichment_status: isFailed
        ? "Zero Enrichment"
        : zero
          ? "Zero Enrichment"
          : partial
            ? "Partial Enrichment"
            : "Fully Enriched",
      finance_data: gotFin ? "Available" : "Not Available",
      email_verification_status: i % 11 === 0 ? "Unverified" : "Valid",
      phone_verification_status: i % 9 === 0 ? "Unverified" : "Valid",
      valid_indian_name: true,
      contact: {
        name: person.name,
        email: person.email,
        phone: person.phone,
      },
      professional: gotPro ? {
        ...sampleProfile.professional,
        ...varyProfile(seed * 100 + i).professional,
        name: person.name,
        job_title: person.title,
        company_name: person.company,
      } : undefined,
      financial: gotFin
        ? { ...sampleProfile.financial, ...varyProfile(seed * 100 + i).financial }
        : undefined,
    });
  }
  return out;
}

const mockRuns: RunRecord[] = [
  {
    id: "run-0",
    source: "bulk",
    filename: "prestige-tech-park-may.csv",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 640,
    leadsSuccess: 512,
    leadsFailed: 108,
    leadsSkipped: 20,
    creditsBlocked: 1280,
    creditsCharged: 1024,
    creditsRefunded: 256,
    startedAt: "2026-05-27T09:30:00Z",
    finishedAt: "2026-05-27T11:05:00Z",
    leads: buildBulkLeads(512, 108, ["professional", "financial"], 7),
  },
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
    leads: buildBulkLeads(782, 198, ["professional", "financial"], 1),
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
    leads: buildBulkLeads(20, 0, ["professional"], 2),
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
  {
    // Single · not enriched — lookup ran but the provider returned nothing.
    // Only the input identity survives; no credits charged.
    id: "run-6",
    source: "single",
    inputValue: "rohan.kapoor@gmail.com",
    types: ["professional"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 0,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 1,
    creditsCharged: 0,
    creditsRefunded: 1,
    startedAt: "2026-05-19T10:11:00Z",
    finishedAt: "2026-05-19T10:11:05Z",
    profile: {
      enrichment_status: "Zero Enrichment",
      finance_data: "Not Available",
      valid_indian_name: true,
      contact: { name: "Rohan Kapoor", email: "rohan.kapoor@gmail.com" },
    },
  },
  {
    // Single · failed — the enrichment provider errored. No data, no charge.
    id: "run-7",
    source: "single",
    inputValue: "+91 9988776655",
    types: ["financial"],
    status: "failed",
    leadsTotal: 1,
    leadsSuccess: 0,
    leadsFailed: 1,
    leadsSkipped: 0,
    creditsBlocked: 1,
    creditsCharged: 0,
    creditsRefunded: 1,
    startedAt: "2026-05-18T15:42:00Z",
    finishedAt: "2026-05-18T15:42:03Z",
    errorCode: "PROVIDER_TIMEOUT",
    errorMessage: "Enrichment provider timed out. No credits were charged.",
  },
];

// ── Sample CSV files (download links) ────────────────────────────────────

// Picks the right static sample file based on enrichment types.
// Files live under public/sample-csvs/, ~50 demo leads each so an uploaded
// run shows real chart variation across tiers / industries / income bands.

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
  crmConnection: CrmConnection;
  addRun: (run: RunRecord) => void;
  markCompletionsSeen: () => void;
  setRuns: (runs: RunRecord[]) => void;
  tickProgress: () => void;    // advances any in_progress bulk runs; flips to "done" at 100%
  pushRunToCrm: (runId: string) => void; // mock 1.8s push; updates crmSync
}

export const useEnrichmentCrmStore = create<EnrichmentStore>((set, get) => ({
  // Seed = manual bulk/single runs + 14 days of CRM-sourced runs.
  runs: [...mockRuns, ...crmRuns],
  balance: 12480,
  unseenCompletions: 1,        // one new completion since last visit (for demo)
  crmConnection: mockCrmConnection,
  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  markCompletionsSeen: () => set({ unseenCompletions: 0 }),
  setRuns: (runs) => set({ runs }),
  pushRunToCrm: (runId) => {
    // Optimistic: mark pending, then settle after ~1.8s with 95% success.
    set((s) => ({
      runs: s.runs.map((r) =>
        r.id === runId
          ? { ...r, crmSync: { ...(r.crmSync ?? { status: "not_pushed" }), status: "pending" } }
          : r,
      ),
    }));
    window.setTimeout(() => {
      const run = get().runs.find((r) => r.id === runId);
      if (!run) return;
      const totalToPush = Math.max(1, run.leadsSuccess);
      // Tiny deterministic failure rate so the demo shows partial-push states sometimes.
      const failedRecords = run.id.charCodeAt(run.id.length - 1) % 20 === 0 ? Math.ceil(totalToPush * 0.05) : 0;
      const pushedRecords = totalToPush - failedRecords;
      set((s) => ({
        runs: s.runs.map((r) =>
          r.id === runId
            ? {
                ...r,
                crmSync: {
                  status: failedRecords > 0 && pushedRecords === 0 ? "failed" : "synced",
                  syncedAt: new Date().toISOString(),
                  pushedRecords,
                  failedRecords,
                  errorMessage: failedRecords > 0 ? `${failedRecords} record(s) rejected by CRM (duplicate or validation).` : undefined,
                },
              }
            : r,
        ),
      }));
      window.dispatchEvent(
        new CustomEvent("enrichment-crm:push-complete", { detail: { runId, pushedRecords, failedRecords } }),
      );
    }, 1800);
  },
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
          // Seed bulk leads on completion if not already present (for newly-uploaded runs).
          const leads = r.source === "bulk" && !r.leads
            ? buildBulkLeads(success, failed, r.types, Date.now() % 1000)
            : r.leads;
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
            leads,
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
