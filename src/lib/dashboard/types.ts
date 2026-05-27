// Shared types for the Enrichment dashboard.
//
// LeadProfile = flat record per enriched lead (one row per CRM hit / single
// lookup / bulk row). Lighter than the existing LeadRow in enriched-leads.tsx
// because the table needs presentation strings while the dashboard only
// needs the enrichment data + a few derived bucket fields.

import type { EnrichedProfile, RunRecord } from "@/lib/enrichment-crm-data";

export interface LeadProfile {
  /** Stable id: `${runId}::${index}` for bulk rows, `runId` for crm/single. */
  id: string;
  runId: string;
  source: RunRecord["source"];
  /** Lead-level outcome derived from (run.status, profile.enrichment_status). */
  status: LeadStatus;
  /** ISO timestamp (run.startedAt for crm/single, run.startedAt + i*1000 for bulk). */
  startedAt: string;
  /** Raw enriched data when available. */
  profile?: EnrichedProfile;
}

export type LeadStatus = "enriched" | "not_enriched" | "failed" | "running";

// ── Time range ────────────────────────────────────────────────────────────

export type TimeRange = "7d" | "14d" | "30d" | "90d" | "all" | "custom";

export interface RangeBounds {
  /** Inclusive lower bound (ms epoch). null = no lower bound. */
  startMs: number | null;
  /** Inclusive upper bound (ms epoch). null = no upper bound. */
  endMs: number | null;
}

// ── Filters ───────────────────────────────────────────────────────────────

export type FilterDim =
  | "source"
  | "location_type"
  | "seniority"
  | "company_tier"
  | "industry"
  | "annual_earnings"
  | "potential_tier"
  | "age_group"
  | "employed"
  | "iit_iim"
  | "mba";

export type FilterOp = "eq" | "in" | "gte" | "lte" | "between";

export interface FilterClause {
  dim: FilterDim;
  op: FilterOp;
  value: string | number | boolean | string[] | [number, number];
}

// ── Chart cards ───────────────────────────────────────────────────────────

export type ChartCardId =
  | "source"
  | "company_tier"
  | "seniority"
  | "geography"
  | "income_range"
  // Optional, addable via + Add chart:
  | "industry"
  | "potential_tier"
  | "age_group"
  | "employed"
  | "iit_iim"
  | "mba";

export const DEFAULT_CHART_CARDS: ChartCardId[] = [
  "source",
  "company_tier",
  "seniority",
  "geography",
  "income_range",
];

// ── Saved views ───────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  starred?: boolean;
  filters: FilterClause[];
  createdAt: string;
}

// ── Breakdown output ──────────────────────────────────────────────────────

export interface BreakdownRow {
  bucket: string;
  count: number;
  pct: number;
}
