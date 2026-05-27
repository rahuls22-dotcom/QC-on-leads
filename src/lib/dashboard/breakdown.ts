// Group profiles by a dimension's bucket. Returns sorted rows with counts +
// percentages relative to the input set (NOT all leads — already-filtered).

import { DIM_REGISTRY, CHART_CARD_TO_DIM } from "./dim-registry";
import type { BreakdownRow, ChartCardId, FilterDim, LeadProfile } from "./types";

export function breakdownByDim(
  profiles: LeadProfile[],
  dimId: FilterDim,
): BreakdownRow[] {
  const dim = DIM_REGISTRY[dimId];
  if (!dim) return [];

  const counts = new Map<string, number>();
  for (const p of profiles) {
    const bucket = dim.bucket(p);
    if (bucket == null) continue;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const total = profiles.length || 1;
  const rows: BreakdownRow[] = [];

  // Enum / range dims with a declared value order: respect that order.
  if (dim.values) {
    for (const bucket of dim.values) {
      const count = counts.get(bucket);
      if (!count) continue;
      rows.push({ bucket, count, pct: round1((count / total) * 100) });
    }
    // Append any unexpected buckets at the end, descending.
    const seen = new Set(dim.values);
    const extras = [...counts.entries()].filter(([k]) => !seen.has(k));
    extras.sort((a, b) => b[1] - a[1]);
    for (const [bucket, count] of extras) {
      rows.push({ bucket, count, pct: round1((count / total) * 100) });
    }
    return rows;
  }

  // Free-form dims: descending by count.
  const all = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [bucket, count] of all) {
    rows.push({ bucket, count, pct: round1((count / total) * 100) });
  }
  return rows;
}

/** Default preset cards still address by ChartCardId — thin wrapper. */
export function breakdownByCard(
  profiles: LeadProfile[],
  cardId: ChartCardId,
): BreakdownRow[] {
  return breakdownByDim(profiles, CHART_CARD_TO_DIM[cardId]);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
