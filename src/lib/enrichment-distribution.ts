// Enrichment lead-distribution data — the "Lead Distribution" dashboard shown
// on a project's Enrichment tab. Demographic + firmographic breakdowns of the
// leads Spot's enrichment has appended (age, company tier, location, salary,
// net worth, seniority, experience). Mock data seeded to match the demo
// design; in production this comes from the enrichment store.

export type DistItem = { label: string; count: number };

export type LeadDistribution = {
  ageGroup: DistItem[];
  companyTier: DistItem[];
  location: DistItem[];
  salaryRange: DistItem[]; // INR / Lakh
  netWorth: DistItem[];
  seniority: DistItem[];
  yearsExperience: DistItem[];
};

// Shared palette for the enrichment charts (teal family for bars, the warm
// accents for pie/donut categories).
export const ENRICH_PALETTE = {
  teal: "#3DAE9B",
  tealDark: "#2E9587",
  tealMid: "#52BBAA",
  tealLight: "#7FD0C2",
  coral: "#E8765A",
  coralLight: "#F0A48E",
  gold: "#F0C04E",
  tan: "#C9A878",
  navy: "#1F3A4D",
};

// Categorical colours (pie/donut + seniority bars), in legend order.
export const TIER_COLORS = ["#E8765A", "#F0C04E", "#C9A878", "#F0A48E"];
export const LOCATION_COLORS = ["#3DAE9B", "#E8765A", "#1F3A4D"];
export const NETWORTH_COLORS = ["#E8765A", "#F0C04E", "#C9A878", "#F0A48E", "#F5D98A"];
export const SENIORITY_COLORS = ["#3DAE9B", "#E8765A", "#1F3A4D", "#F0C04E"];

// The default distribution (matches the supplied design). Used for every
// product for now; can be made per-product later.
const DEFAULT_DISTRIBUTION: LeadDistribution = {
  ageGroup: [
    { label: "18-24", count: 2 },
    { label: "25-34", count: 38 },
    { label: "35-44", count: 54 },
    { label: "45-54", count: 22 },
    { label: "55-64", count: 1 },
  ],
  companyTier: [
    { label: "Tier 1", count: 35 },
    { label: "Tier 2", count: 12 },
    { label: "Tier 3", count: 9 },
    { label: "Tier 4", count: 6 },
  ],
  location: [
    { label: "india_metro", count: 69 },
    { label: "other", count: 41 },
    { label: "international", count: 6 },
  ],
  salaryRange: [
    { label: "1-5", count: 23 },
    { label: "5-10", count: 14 },
    { label: "10-20", count: 9 },
    { label: "20-30", count: 4 },
    { label: "30-50", count: 29 },
    { label: "50-100", count: 31 },
    { label: "100+", count: 14 },
  ],
  netWorth: [
    { label: "0-50 L", count: 28 },
    { label: "50L-1 Cr", count: 21 },
    { label: "1-2 Cr", count: 7 },
    { label: "2-5 Cr", count: 35 },
    { label: "5 Cr +", count: 13 },
  ],
  seniority: [
    { label: "Senior", count: 24 },
    { label: "Management", count: 18 },
    { label: "Executive", count: 8 },
    { label: "Other", count: 13 },
  ],
  yearsExperience: [
    { label: "0-2 years", count: 3 },
    { label: "3-5 years", count: 8 },
    { label: "6-10 years", count: 20 },
    { label: "11-20 years", count: 56 },
    { label: "20+ years", count: 30 },
  ],
};

/** Lead distribution for a product. Single dataset for now. */
export function distributionForProduct(_productId: string): LeadDistribution {
  return DEFAULT_DISTRIBUTION;
}

export function distTotal(items: DistItem[]): number {
  return items.reduce((s, d) => s + d.count, 0);
}
