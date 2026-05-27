"use client";

// Top half: KPI row + (trend | donut) two-column grid.
//
// Note: `profiles` is the source-filtered slice (drives KPIs + trend).
// `donutProfiles` is the full source mix in the time window — donut
// always renders the full mix, dimming non-active slices when the
// header source filter is set.

import { ReliabilityKpis } from "./reliability-kpis";
import { EnrichedTrendChart } from "./enriched-trend-chart";
import { SourceDonut } from "./source-donut";
import type { LeadProfile, RangeBounds, TimeRange } from "@/lib/dashboard/types";
import type { SourceFilter } from "./source-filter-pills";

interface Props {
  profiles: LeadProfile[];
  prevProfiles: LeadProfile[];
  donutProfiles: LeadProfile[];
  sourceFilter: SourceFilter;
  range: TimeRange;
  bounds: RangeBounds;
}

export function ReliabilitySection({
  profiles,
  prevProfiles,
  donutProfiles,
  sourceFilter,
  range,
  bounds,
}: Props) {
  return (
    <section className="mb-8">
      <ReliabilityKpis profiles={profiles} prevProfiles={prevProfiles} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3">
        <div className="bg-white border border-border rounded-card p-4">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
                Enrichment volume
              </div>
              <div className="text-[13px] font-semibold text-text-primary mt-0.5">
                Enriched vs not-enriched
              </div>
            </div>
          </div>
          <EnrichedTrendChart profiles={profiles} range={range} bounds={bounds} />
        </div>

        <div className="bg-white border border-border rounded-card p-4">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
            Split by source
          </div>
          <div className="text-[13px] font-semibold text-text-primary mt-0.5 mb-3">
            Volume mix
          </div>
          <SourceDonut profiles={donutProfiles} activeSource={sourceFilter} />
        </div>
      </div>
    </section>
  );
}
