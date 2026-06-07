// Flatten the store's RunRecord[] to one LeadProfile per enriched lead.
//
// CRM / Single  → 1 lead per run (uses run.profile)
// Bulk          → 1 lead per row in run.leadsTotal (uses run.leads[i] when
//                 seeded, else synthesizes from CRM_NAMES_POOL, kept in
//                 sync with the per-lead drawer in enriched-leads.tsx)

import {
  CRM_NAMES_POOL,
  sampleProfile,
  varyProfile,
  type EnrichedProfile,
  type EnrichmentType,
  type RunRecord,
} from "@/lib/enrichment-crm-data";
import type { LeadProfile, LeadStatus, RangeBounds } from "./types";

export interface FlattenOpts {
  bounds?: RangeBounds;
}

export function flattenRunsToLeadProfiles(
  runs: RunRecord[],
  opts: FlattenOpts = {},
): LeadProfile[] {
  const out: LeadProfile[] = [];
  const inRange = (ms: number) => {
    const b = opts.bounds;
    if (!b) return true;
    if (b.startMs != null && ms < b.startMs) return false;
    if (b.endMs != null && ms > b.endMs) return false;
    return true;
  };

  for (const r of runs) {
    if (r.source === "crm" || r.source === "single") {
      const ts = new Date(r.startedAt).getTime();
      if (!inRange(ts)) continue;
      out.push({
        id: r.id,
        runId: r.id,
        source: r.source,
        status: deriveLeadStatus(r),
        startedAt: r.startedAt,
        profile: r.profile,
      });
      continue;
    }

    // Bulk
    const total = r.leadsTotal || 0;
    const success = Math.min(total, r.leadsSuccess || 0);
    const failed = Math.min(total - success, r.leadsFailed || 0);
    const notEnriched = Math.max(0, total - success - failed);
    const seed = hashCode(r.id);
    const renderCap = 200;            // generous enough for dashboard math
    const rowsToRender = Math.min(total, renderCap);

    for (let i = 0; i < rowsToRender; i++) {
      const person = CRM_NAMES_POOL[(seed + i * 7) % CRM_NAMES_POOL.length];
      const ts = new Date(r.startedAt).getTime() + i * 1000;
      if (!inRange(ts)) continue;

      const ratio = total === 0 ? 0 : i / total;
      let status: LeadStatus;
      if (r.status === "in_progress") status = "running";
      else if (r.status === "failed") status = "failed";
      else if (ratio < success / total) status = "enriched";
      else if (ratio < (success + failed) / total) status = "failed";
      else status = notEnriched > 0 ? "not_enriched" : "enriched";

      const seeded = r.leads?.[i];
      const profile: EnrichedProfile | undefined =
        seeded ??
        (status === "failed" || status === "running"
          ? undefined
          : synthBulkProfile({
              person,
              types: r.types,
              status,
              seed: seed * 1000 + i,
            }));

      out.push({
        id: `${r.id}::${i}`,
        runId: r.id,
        source: "bulk",
        status,
        startedAt: new Date(ts).toISOString(),
        profile,
      });
    }
  }

  return out;
}

function deriveLeadStatus(r: RunRecord): LeadStatus {
  if (r.status === "in_progress") return "running";
  if (r.status === "failed") return "failed";
  const es = r.profile?.enrichment_status;
  if (es === "Zero Enrichment" || !r.profile) return "not_enriched";
  return "enriched";
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function synthBulkProfile(args: {
  person: (typeof CRM_NAMES_POOL)[number];
  types: EnrichmentType[];
  status: LeadStatus;
  seed: number;
}): EnrichedProfile {
  const { person, types, status, seed } = args;
  const wantsPro = types.includes("professional");
  const wantsFin = types.includes("financial");
  const isPartial = status === "not_enriched";
  const v = varyProfile(seed);
  return {
    enrichment_status: isPartial ? "Partial Enrichment" : "Fully Enriched",
    finance_data: wantsFin && !isPartial ? "Available" : "Not Available",
    contact: { name: person.name, email: person.email, phone: person.phone },
    professional:
      wantsPro && !isPartial
        ? {
            ...sampleProfile.professional,
            ...v.professional,
            name: person.name,
            job_title: person.title,
            company_name: person.company,
          }
        : undefined,
    financial:
      wantsFin && !isPartial
        ? { ...sampleProfile.financial, ...v.financial }
        : undefined,
  };
}
