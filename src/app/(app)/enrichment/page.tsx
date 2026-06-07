"use client";

// /enrichment, base/Dashboard tab for the Enrichment module.
// Module-level tabs (Dashboard / Operations / Database) live just below the
// header. The dashboard itself shows analytics across every enrichment source.
//
// Header filters (time range + source) live here so they can render in the
// DataPageShell.headerAction slot, inline with the page title. The enrichment
// demo variant lives in the sidebar so all enrichment tabs respond to it.

import { useMemo, useState } from "react";

import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichmentDashboard } from "@/components/data/enrichment-dashboard";
import { DashboardTimeFilter } from "@/components/data/dashboard/dashboard-time-filter";
import { SourceFilterPills, type SourceFilter } from "@/components/data/dashboard/source-filter-pills";
import { CrmConnectBanner } from "@/components/enrichment-crm/crm-connect-nudge";
import { EnrichmentStorageOffNotice } from "@/components/data/enrichment-storage-off-notice";
import { useEnrichmentCrmStore } from "@/lib/enrichment-crm-data";
import { flattenRunsToLeadProfiles } from "@/lib/dashboard/flatten-leads";
import { resolveRange } from "@/lib/dashboard/trend-bucketing";
import { useDemoMode } from "@/lib/demo-mode";
import type { TimeRange } from "@/lib/dashboard/types";

export default function EnrichmentDashboardPage() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const {
    isEnrichmentEmpty,
    isEnrichmentNoCrm,
    isEnrichmentNoStorage,
    crmRequestSubmitted,
  } = useDemoMode();

  // Only the true "Empty" variant should blank the dashboard. No-CRM still
  // has bulk + single data flowing; No-storage shows the slim KPI view.
  const forceEmpty = isEnrichmentEmpty;
  // No-CRM drops the crm source from feeds — the user explicitly hasn't
  // wired it yet, so showing CRM-sourced rows would be a lie.
  const dropCrmSource = isEnrichmentNoCrm;

  // Count profiles per source in the current window for the source-filter pills.
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const profilesForCounts = useMemo(() => {
    if (forceEmpty) return [];
    const bounds = resolveRange(range, customStart, customEnd);
    const flat = flattenRunsToLeadProfiles(runs, { bounds });
    return dropCrmSource ? flat.filter((p) => p.source !== "crm") : flat;
  }, [runs, range, customStart, customEnd, forceEmpty, dropCrmSource]);

  const headerAction = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <SourceFilterPills value={sourceFilter} onChange={setSourceFilter} profiles={profilesForCounts} dropCrmSource={dropCrmSource} />
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
      variant={forceEmpty ? "empty" : "connected"}
      title="Enrichment"
      rootLabel="Enrichment"
      rootHref="/enrichment"
      description="Professional + Financial enrichment via CRM sync, bulk upload, or single lookup."
      headerAction={headerAction}
    >
      {({ openRun, openConnectFlow }) => (
        <div className="space-y-5">
          {isEnrichmentNoCrm && (
            <CrmConnectBanner onConnect={openConnectFlow} pending={crmRequestSubmitted} />
          )}
          {isEnrichmentNoStorage && <EnrichmentStorageOffNotice />}
          <EnrichmentDashboard
            onOpenRun={openRun}
            forceEmpty={forceEmpty}
            slim={isEnrichmentNoStorage}
            dropCrmSource={dropCrmSource}
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
        </div>
      )}
    </DataPageShell>
  );
}
