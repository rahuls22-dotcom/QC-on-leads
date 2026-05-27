"use client";

// /enrichment-empty — base/Dashboard tab for the Enrichment module
// in the "no CRM connected" demo variant.

import { useState } from "react";

import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichmentDashboard } from "@/components/data/enrichment-dashboard";
import { DashboardTimeFilter } from "@/components/data/dashboard/dashboard-time-filter";
import { SourceFilterPills, type SourceFilter } from "@/components/data/dashboard/source-filter-pills";
import type { TimeRange } from "@/lib/dashboard/types";

export default function EnrichmentEmptyDashboardPage() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Empty variant — no profiles, counts default to 0.
  const headerAction = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <SourceFilterPills value={sourceFilter} onChange={setSourceFilter} profiles={[]} />
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
      variant="empty"
      title="Enrichment"
      rootLabel="Enrichment"
      rootHref="/enrichment-empty"
      description="Professional + Financial enrichment. Connect CRM, upload CSV, or run a single lookup."
      headerAction={headerAction}
    >
      {({ openRun }) => (
        <EnrichmentDashboard
          onOpenRun={openRun}
          forceEmpty
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
