"use client";

// /enrichment — base/Dashboard tab for the Enrichment module.
// Module-level tabs (Dashboard / Operations / Database) live just below the
// header. The dashboard itself shows analytics across every enrichment source.
//
// Header filters (time range + source) live here so they can render in the
// DataPageShell.headerAction slot, inline with the page title.

import { useMemo, useState } from "react";

import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichmentDashboard } from "@/components/data/enrichment-dashboard";
import { DashboardTimeFilter } from "@/components/data/dashboard/dashboard-time-filter";
import { SourceFilterPills, type SourceFilter } from "@/components/data/dashboard/source-filter-pills";
import { useEnrichmentCrmStore } from "@/lib/enrichment-crm-data";
import { flattenRunsToLeadProfiles } from "@/lib/dashboard/flatten-leads";
import { resolveRange } from "@/lib/dashboard/trend-bucketing";
import type { TimeRange } from "@/lib/dashboard/types";

export default function EnrichmentDashboardPage() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Count profiles per source in the current window for the source-filter pills.
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const profilesForCounts = useMemo(() => {
    const bounds = resolveRange(range, customStart, customEnd);
    return flattenRunsToLeadProfiles(runs, { bounds });
  }, [runs, range, customStart, customEnd]);

  const headerAction = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <SourceFilterPills value={sourceFilter} onChange={setSourceFilter} profiles={profilesForCounts} />
      <DashboardTimeFilter
        range={range}
        customStart={customStart}
        customEnd={customEnd}
        onChange={(r, s, e) => {
          setRange(r);
          setCustomStart(s);
          setCustomEnd(e);
        }}
      />
    </div>
  );

  return (
    <DataPageShell
      variant="connected"
      title="Enrichment"
      rootLabel="Enrichment"
      rootHref="/enrichment"
      description="Professional + Financial enrichment via CRM sync, bulk upload, or single lookup."
      headerAction={headerAction}
    >
      {({ openRun }) => (
        <EnrichmentDashboard
          onOpenRun={openRun}
          range={range}
          customStart={customStart}
          customEnd={customEnd}
          onRangeChange={(r, s, e) => {
            setRange(r);
            setCustomStart(s);
            setCustomEnd(e);
          }}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
        />
      )}
    </DataPageShell>
  );
}
