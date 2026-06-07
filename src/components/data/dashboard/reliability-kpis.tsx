"use client";

// Three KPI tiles for the top half:
//   Total leads · Enriched leads · Enrichment % (with delta vs prev period)

import type { LeadProfile } from "@/lib/dashboard/types";

interface Props {
  /** Profiles already scoped to the active time range. */
  profiles: LeadProfile[];
  /** Profiles from the previous equal-length period, for the success-rate delta. */
  prevProfiles: LeadProfile[];
}

export function ReliabilityKpis({ profiles, prevProfiles }: Props) {
  const stats = computeStats(profiles);
  const prevStats = computeStats(prevProfiles);

  const delta =
    prevStats.attempted === 0
      ? null
      : round1(stats.successRate - prevStats.successRate);

  return (
    <div className="grid grid-cols-3 gap-3 mb-3">
      <Kpi label="Total leads" value={stats.attempted.toLocaleString("en-IN")} />
      <Kpi label="Enriched leads" value={stats.enriched.toLocaleString("en-IN")} />
      <Kpi
        label="Enrichment %"
        value={`${round1(stats.successRate)}%`}
        delta={delta}
      />
    </div>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-[22px] font-semibold text-text-primary tabular-nums tracking-tight">{value}</div>
        {delta != null && (
          <span
            className={[
              "inline-flex items-center text-[10.5px] font-semibold px-1.5 py-0.5 rounded-badge",
              delta >= 0 ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]",
            ].join(" ")}
          >
            {delta >= 0 ? "+" : ""}{delta} vs prev
          </span>
        )}
      </div>
    </div>
  );
}

interface Stats {
  enriched: number;
  failed: number;
  attempted: number;
  successRate: number;
}

function computeStats(profiles: LeadProfile[]): Stats {
  let enriched = 0;
  let failed = 0;
  for (const p of profiles) {
    if (p.status === "enriched") enriched++;
    else if (p.status === "failed" || p.status === "not_enriched") failed++;
  }
  const attempted = enriched + failed;
  const successRate = attempted === 0 ? 0 : (enriched / attempted) * 100;
  return { enriched, failed, attempted, successRate };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
