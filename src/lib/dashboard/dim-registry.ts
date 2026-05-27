// Single source of truth for every filter/breakdown dimension.
// One entry = one dim. Each dim knows:
//   - its display label
//   - how to extract a bucket from a LeadProfile (for breakdowns)
//   - its filterable value type (enum / range / bool)
//   - the enum value list (where applicable) for the AddFilterMenu

import type { FilterDim, ChartCardId, LeadProfile } from "./types";

export type DimType = "enum" | "range_money" | "range_number" | "bool";

export interface DimConfig {
  id: FilterDim;
  label: string;
  type: DimType;
  /** Top-level grouping in the chart-builder slice-picker. */
  group: "Professional" | "Financial" | "Meta";
  /** Enum/range dims: ordered list of bucket labels for breakdowns + filter menu. */
  values?: string[];
  /** Extracts the bucket value from a profile. Returns null when missing. */
  bucket: (p: LeadProfile) => string | null;
  /** Returns numeric value used by range filters. */
  numeric?: (p: LeadProfile) => number | null;
  /** Returns boolean for bool filters. */
  boolean?: (p: LeadProfile) => boolean | null;
  /** Units suffix for range inputs (₹ / yrs / pts / cards / cars). */
  unitHint?: string;
  /** Multiplier applied to user-typed range values before evaluation. E.g.
   *  money dims stored in raw rupees but typed in lakhs use inputScale=100_000. */
  inputScale?: number;
}

// ── Bucketers ────────────────────────────────────────────────────────────

function seniorityBucket(level?: string | null): string | null {
  if (!level) return null;
  const l = level.toLowerCase();
  if (/(exec|c-?level|chief|founder|cto|ceo|cfo|coo|vp|head)/.test(l)) return "Exec";
  if (/(senior|staff|principal|lead|director|manager)/.test(l)) return "Senior";
  if (/(mid|associate|engineer ii|engineer iii)/.test(l)) return "Mid";
  if (/(junior|entry|analyst|intern|graduate)/.test(l)) return "Junior";
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

// Generic range bucketer — exclusive upper, last bucket catches the rest.
function bucketRange(
  v: number | null | undefined,
  steps: { upTo: number; label: string }[],
  topLabel: string,
): string {
  if (v == null) return "Unknown";
  for (const s of steps) if (v < s.upTo) return s.label;
  return topLabel;
}

const YOE_BUCKETS = ["0-2 yrs", "3-5 yrs", "6-10 yrs", "11-15 yrs", "15+ yrs", "Unknown"];
function yoeBucket(p: LeadProfile): string {
  return bucketRange(
    p.profile?.professional?.years_of_experience,
    [
      { upTo: 3, label: "0-2 yrs" },
      { upTo: 6, label: "3-5 yrs" },
      { upTo: 11, label: "6-10 yrs" },
      { upTo: 16, label: "11-15 yrs" },
    ],
    "15+ yrs",
  );
}

const CREDIT_BUCKETS = ["< 600", "600-699", "700-749", "750-799", "800+", "Unknown"];
function creditScoreBucket(p: LeadProfile): string {
  return bucketRange(
    p.profile?.financial?.credit_score,
    [
      { upTo: 600, label: "< 600" },
      { upTo: 700, label: "600-699" },
      { upTo: 750, label: "700-749" },
      { upTo: 800, label: "750-799" },
    ],
    "800+",
  );
}

const CREDIT_LIMIT_BUCKETS = ["< 1L", "1L - 5L", "5L - 10L", "10L+", "Unknown"];
function creditLimitBucket(p: LeadProfile): string {
  return bucketRange(
    p.profile?.financial?.credit_limit,
    [
      { upTo: 100_000, label: "< 1L" },
      { upTo: 500_000, label: "1L - 5L" },
      { upTo: 1_000_000, label: "5L - 10L" },
    ],
    "10L+",
  );
}

const CARD_COUNT_BUCKETS = ["0", "1", "2-3", "4-5", "6+", "Unknown"];
function cardCountBucket(p: LeadProfile): string {
  return bucketRange(
    p.profile?.financial?.total_credit_cards,
    [
      { upTo: 1, label: "0" },
      { upTo: 2, label: "1" },
      { upTo: 4, label: "2-3" },
      { upTo: 6, label: "4-5" },
    ],
    "6+",
  );
}

const CAR_BUCKETS = ["0", "1", "2", "3+", "Unknown"];
function carBucket(p: LeadProfile): string {
  return bucketRange(
    p.profile?.financial?.total_cars,
    [
      { upTo: 1, label: "0" },
      { upTo: 2, label: "1" },
      { upTo: 3, label: "2" },
    ],
    "3+",
  );
}

const HOME_LOAN_BUCKETS = ["None", "< 25L", "25L - 75L", "75L - 1.5Cr", "1.5Cr+", "Unknown"];
function homeLoanBucket(p: LeadProfile): string {
  const v = p.profile?.financial?.home_loan_amount;
  if (v == null) return "Unknown";
  if (v === 0) return "None";
  if (v < 2_500_000) return "< 25L";
  if (v < 7_500_000) return "25L - 75L";
  if (v < 15_000_000) return "75L - 1.5Cr";
  return "1.5Cr+";
}

const SCORE_BUCKETS = ["0-25", "25-50", "50-75", "75-100", "Unknown"];
function finalScoreBucket(p: LeadProfile): string {
  return bucketRange(
    p.profile?.financial?.final_score,
    [
      { upTo: 25, label: "0-25" },
      { upTo: 50, label: "25-50" },
      { upTo: 75, label: "50-75" },
    ],
    "75-100",
  );
}

// ── Registry ─────────────────────────────────────────────────────────────

export const DIM_REGISTRY: Record<FilterDim, DimConfig> = {
  source: {
    id: "source",
    label: "Source",
    type: "enum",
    group: "Meta",
    values: ["CRM", "Bulk", "Single"],
    bucket: (p) => (p.source === "crm" ? "CRM" : p.source === "bulk" ? "Bulk" : "Single"),
  },
  location_type: {
    id: "location_type",
    label: "Geography",
    type: "enum",
    group: "Professional",
    values: ["Metro", "Tier-2", "Tier-3"],
    bucket: (p) => p.profile?.professional?.location_type ?? null,
  },
  seniority: {
    id: "seniority",
    label: "Seniority",
    type: "enum",
    group: "Professional",
    values: ["Exec", "Senior", "Mid", "Junior"],
    bucket: (p) => seniorityBucket(p.profile?.professional?.professional_level),
  },
  company_tier: {
    id: "company_tier",
    label: "Company tier",
    type: "enum",
    group: "Professional",
    values: ["Unicorn", "Mid-Market", "SMB", "Startup"],
    bucket: (p) => p.profile?.professional?.company_tier ?? null,
  },
  industry: {
    id: "industry",
    label: "Industry",
    type: "enum",
    group: "Professional",
    values: ["Fintech", "SaaS", "E-commerce", "Edtech", "Healthcare", "Other"],
    bucket: (p) => p.profile?.professional?.company_industry ?? null,
  },
  university_tier: {
    id: "university_tier",
    label: "University tier",
    type: "enum",
    group: "Professional",
    values: ["Tier 1", "Tier 2", "Tier 3", "Other"],
    bucket: (p) => p.profile?.professional?.university_tier ?? null,
  },
  age_group: {
    id: "age_group",
    label: "Age",
    type: "enum",
    group: "Professional",
    values: ["18-29", "30-39", "40-49", "50+"],
    bucket: (p) => p.profile?.professional?.age_group ?? null,
  },
  years_of_experience: {
    id: "years_of_experience",
    label: "Years of experience",
    type: "range_number",
    group: "Professional",
    values: YOE_BUCKETS,
    bucket: yoeBucket,
    numeric: (p) => p.profile?.professional?.years_of_experience ?? null,
    unitHint: "yrs",
  },
  employed: {
    id: "employed",
    label: "Employed",
    type: "bool",
    group: "Professional",
    bucket: (p) =>
      p.profile?.professional?.employed == null
        ? null
        : p.profile.professional.employed
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.employed ?? null,
  },
  engineer: {
    id: "engineer",
    label: "Engineer",
    type: "bool",
    group: "Professional",
    bucket: (p) =>
      p.profile?.professional?.engineer == null
        ? null
        : p.profile.professional.engineer
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.engineer ?? null,
  },
  iit_iim: {
    id: "iit_iim",
    label: "IIT / IIM",
    type: "bool",
    group: "Professional",
    bucket: (p) =>
      p.profile?.professional?.iit_iim == null
        ? null
        : p.profile.professional.iit_iim
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.iit_iim ?? null,
  },
  mba: {
    id: "mba",
    label: "MBA",
    type: "bool",
    group: "Professional",
    bucket: (p) =>
      p.profile?.professional?.mba == null
        ? null
        : p.profile.professional.mba
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.mba ?? null,
  },
  annual_earnings: {
    id: "annual_earnings",
    label: "Annual earnings",
    type: "range_money",
    group: "Financial",
    values: INCOME_BUCKETS,
    bucket: incomeBucket,
    numeric: avgEarnings,
    unitHint: "L",
    inputScale: 100_000,
  },
  potential_tier: {
    id: "potential_tier",
    label: "Potential tier",
    type: "enum",
    group: "Financial",
    values: ["High", "Medium", "Low"],
    bucket: (p) => p.profile?.financial?.potential_tier ?? null,
  },
  credit_score: {
    id: "credit_score",
    label: "Credit score",
    type: "range_number",
    group: "Financial",
    values: CREDIT_BUCKETS,
    bucket: creditScoreBucket,
    numeric: (p) => p.profile?.financial?.credit_score ?? null,
    unitHint: "pts",
  },
  credit_limit: {
    id: "credit_limit",
    label: "Credit limit",
    type: "range_money",
    group: "Financial",
    values: CREDIT_LIMIT_BUCKETS,
    bucket: creditLimitBucket,
    numeric: (p) => p.profile?.financial?.credit_limit ?? null,
    unitHint: "L",
    inputScale: 100_000,
  },
  total_credit_cards: {
    id: "total_credit_cards",
    label: "Credit cards",
    type: "range_number",
    group: "Financial",
    values: CARD_COUNT_BUCKETS,
    bucket: cardCountBucket,
    numeric: (p) => p.profile?.financial?.total_credit_cards ?? null,
    unitHint: "cards",
  },
  total_cars: {
    id: "total_cars",
    label: "Cars owned",
    type: "range_number",
    group: "Financial",
    values: CAR_BUCKETS,
    bucket: carBucket,
    numeric: (p) => p.profile?.financial?.total_cars ?? null,
    unitHint: "cars",
  },
  home_loan_amount: {
    id: "home_loan_amount",
    label: "Home loan",
    type: "range_money",
    group: "Financial",
    values: HOME_LOAN_BUCKETS,
    bucket: homeLoanBucket,
    numeric: (p) => p.profile?.financial?.home_loan_amount ?? null,
    unitHint: "L",
    inputScale: 100_000,
  },
  final_score: {
    id: "final_score",
    label: "Final score",
    type: "range_number",
    group: "Financial",
    values: SCORE_BUCKETS,
    bucket: finalScoreBucket,
    numeric: (p) => p.profile?.financial?.final_score ?? null,
    unitHint: "pts",
  },
};

/** Default preset cards mapped to a dim. */
export const CHART_CARD_TO_DIM: Record<ChartCardId, FilterDim> = {
  source: "source",
  company_tier: "company_tier",
  seniority: "seniority",
  geography: "location_type",
  income_range: "annual_earnings",
};

export const CHART_CARD_LABEL: Record<ChartCardId, string> = {
  source: "Source",
  company_tier: "Company tier",
  seniority: "Seniority",
  geography: "Geography",
  income_range: "Income range",
};

/** Group dims for the chart-builder slice picker. */
export function groupedDims(): Record<DimConfig["group"], DimConfig[]> {
  const out: Record<DimConfig["group"], DimConfig[]> = {
    Professional: [],
    Financial: [],
    Meta: [],
  };
  for (const d of Object.values(DIM_REGISTRY)) out[d.group].push(d);
  return out;
}
