// Compile a FilterClause to a (LeadProfile)→boolean predicate. AND-combine
// multiple clauses with evalFilters().

import { DIM_REGISTRY } from "./dim-registry";
import type { FilterClause, LeadProfile } from "./types";

export function compileFilter(clause: FilterClause): (p: LeadProfile) => boolean {
  const dim = DIM_REGISTRY[clause.dim];
  if (!dim) return () => true;

  switch (clause.op) {
    case "eq": {
      const v = String(clause.value);
      return (p) => dim.bucket(p) === v;
    }
    case "in": {
      const set = new Set((clause.value as string[]).map(String));
      return (p) => {
        const b = dim.bucket(p);
        return b != null && set.has(b);
      };
    }
    case "gte": {
      const v = Number(clause.value);
      return (p) => {
        const n = dim.numeric?.(p);
        return n != null && n >= v;
      };
    }
    case "lte": {
      const v = Number(clause.value);
      return (p) => {
        const n = dim.numeric?.(p);
        return n != null && n <= v;
      };
    }
    case "between": {
      const [lo, hi] = clause.value as [number, number];
      return (p) => {
        const n = dim.numeric?.(p);
        return n != null && n >= lo && n <= hi;
      };
    }
    default:
      return () => true;
  }
}

export function evalFilters(p: LeadProfile, clauses: FilterClause[]): boolean {
  for (const c of clauses) {
    if (!compileFilter(c)(p)) return false;
  }
  return true;
}

// Pretty-print a clause for a chip label.
export function clauseLabel(c: FilterClause): string {
  const dim = DIM_REGISTRY[c.dim];
  const dimLabel = dim?.label ?? c.dim;
  switch (c.op) {
    case "eq":
      return `${dimLabel}: ${c.value}`;
    case "in":
      return `${dimLabel}: ${(c.value as string[]).join(", ")}`;
    case "gte":
      return `${dimLabel} ≥ ${formatNumberInr(c.value as number)}`;
    case "lte":
      return `${dimLabel} ≤ ${formatNumberInr(c.value as number)}`;
    case "between": {
      const [lo, hi] = c.value as [number, number];
      return `${dimLabel}: ${formatNumberInr(lo)} – ${formatNumberInr(hi)}`;
    }
  }
}

function formatNumberInr(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
  return n.toLocaleString("en-IN");
}
