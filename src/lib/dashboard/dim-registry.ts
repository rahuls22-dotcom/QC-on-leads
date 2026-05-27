// Single source of truth for every filter/breakdown dimension.
// One entry = one dim. Each dim knows:
//   - its display label
//   - how to extract a bucket from a LeadProfile (for breakdowns)
//   - its filterable value type (enum / range / bool)
//   - the enum value list (where applicable) for the AddFilterMenu

import type { FilterDim, ChartCardId, LeadProfile } from "./types";

export type DimType = "enum" | "range_money" | "bool";

export interface DimConfig {
  id: FilterDim;
  label: string;
  type: DimType;
  /** Enum dims only: ordered list of bucket labels for breakdowns + filter menu. */
  values?: string[];
  /** Extracts the bucket value from a profile. Returns null when missing. */
  bucket: (p: LeadProfile) => string | null;
  /** Returns numeric value used by range filters. */
  numeric?: (p: LeadProfile) => number | null;
  /** Returns boolean for bool filters. */
  boolean?: (p: LeadProfile) => boolean | null;
}

// Seniority bucketing from raw professional_level strings ("Junior", "Mid",
// "Senior", "Executive", "C-level", etc.) into 4 stable buckets.
function seniorityBucket(level?: string | null): string | null {
  if (!level) return null;
  const l = level.toLowerCase();
  if (/(exec|c-?level|chief|founder|cto|ceo|cfo|coo|vp|head)/.test(l)) return "Exec";
  if (/(senior|staff|principal|lead|director|manager)/.test(l)) return "Senior";
  if (/(mid|associate|engineer ii|engineer iii)/.test(l)) return "Mid";
  if (/(junior|entry|analyst|intern|graduate)/.test(l)) return "Junior";
  // Anything else falls into Mid by default (most enriched levels land here).
  return "Mid";
}

function avgEarnings(p: LeadProfile): number | null {
  const f = p.profile?.financial;
  if (!f) return null;
  const lo = f.annual_earnings_inr_min;
  const hi = f.annual_earnings_inr_max;
  if (typeof lo === "number" && typeof hi === "number") return (lo + hi) / 2;
  if (typeof hi === "number") return hi;
  if (typeof lo === "number") return lo;
  return null;
}

export function incomeBucket(p: LeadProfile): string {
  const v = avgEarnings(p);
  if (v == null) return "Unknown";
  if (v >= 10_000_000) return "> 1Cr";
  if (v >= 5_000_000) return "50L - 1Cr";
  if (v >= 2_500_000) return "25L - 50L";
  return "< 25L";
}

export const INCOME_BUCKETS = ["> 1Cr", "50L - 1Cr", "25L - 50L", "< 25L", "Unknown"];

export const DIM_REGISTRY: Record<FilterDim, DimConfig> = {
  source: {
    id: "source",
    label: "Source",
    type: "enum",
    values: ["CRM", "Bulk", "Single"],
    bucket: (p) => (p.source === "crm" ? "CRM" : p.source === "bulk" ? "Bulk" : "Single"),
  },
  location_type: {
    id: "location_type",
    label: "Geography",
    type: "enum",
    values: ["Metro", "Tier-2", "Tier-3"],
    bucket: (p) => p.profile?.professional?.location_type ?? null,
  },
  seniority: {
    id: "seniority",
    label: "Seniority",
    type: "enum",
    values: ["Exec", "Senior", "Mid", "Junior"],
    bucket: (p) => seniorityBucket(p.profile?.professional?.professional_level),
  },
  company_tier: {
    id: "company_tier",
    label: "Company tier",
    type: "enum",
    values: ["Unicorn", "Mid-Market", "SMB", "Startup"],
    bucket: (p) => p.profile?.professional?.company_tier ?? null,
  },
  industry: {
    id: "industry",
    label: "Industry",
    type: "enum",
    // Values are dynamic — derived from data in the menu. The default list
    // below seeds the picker when no data is present.
    values: ["Fintech", "SaaS", "E-commerce", "Edtech", "Healthcare", "Other"],
    bucket: (p) => p.profile?.professional?.company_industry ?? null,
  },
  annual_earnings: {
    id: "annual_earnings",
    label: "Annual earnings",
    type: "range_money",
    bucket: incomeBucket,
    numeric: avgEarnings,
  },
  potential_tier: {
    id: "potential_tier",
    label: "Potential tier",
    type: "enum",
    values: ["High", "Medium", "Low"],
    bucket: (p) => p.profile?.financial?.potential_tier ?? null,
  },
  age_group: {
    id: "age_group",
    label: "Age",
    type: "enum",
    values: ["18-29", "30-39", "40-49", "50+"],
    bucket: (p) => p.profile?.professional?.age_group ?? null,
  },
  employed: {
    id: "employed",
    label: "Employed",
    type: "bool",
    bucket: (p) => (p.profile?.professional?.employed == null ? null : p.profile.professional.employed ? "Yes" : "No"),
    boolean: (p) => p.profile?.professional?.employed ?? null,
  },
  iit_iim: {
    id: "iit_iim",
    label: "IIT / IIM",
    type: "bool",
    bucket: (p) => (p.profile?.professional?.iit_iim == null ? null : p.profile.professional.iit_iim ? "Yes" : "No"),
    boolean: (p) => p.profile?.professional?.iit_iim ?? null,
  },
  mba: {
    id: "mba",
    label: "MBA",
    type: "bool",
    bucket: (p) => (p.profile?.professional?.mba == null ? null : p.profile.professional.mba ? "Yes" : "No"),
    boolean: (p) => p.profile?.professional?.mba ?? null,
  },
};

// Chart-card id → dim id. Most chart cards map 1:1 to a dim; "geography" maps
// to location_type, "income_range" to annual_earnings.
export const CHART_CARD_TO_DIM: Record<ChartCardId, FilterDim> = {
  source: "source",
  company_tier: "company_tier",
  seniority: "seniority",
  geography: "location_type",
  income_range: "annual_earnings",
  industry: "industry",
  potential_tier: "potential_tier",
  age_group: "age_group",
  employed: "employed",
  iit_iim: "iit_iim",
  mba: "mba",
};

export const CHART_CARD_LABEL: Record<ChartCardId, string> = {
  source: "Source",
  company_tier: "Company tier",
  seniority: "Seniority",
  geography: "Geography",
  income_range: "Income range",
  industry: "Industry",
  potential_tier: "Potential tier",
  age_group: "Age",
  employed: "Employed",
  iit_iim: "IIT / IIM",
  mba: "MBA",
};
