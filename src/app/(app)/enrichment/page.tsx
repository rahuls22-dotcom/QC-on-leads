"use client";

// /enrichment, base/Dashboard tab for the Enrichment module.
// Module-level tabs (Dashboard / Operations / Database) live just below the
// header. The dashboard itself shows analytics across every enrichment source.
//
// Header filters (time range + source) live here so they can render in the
// DataPageShell.headerAction slot, inline with the page title. The enrichment
// demo variant lives in the sidebar so all enrichment tabs respond to it.

import { useMemo, useState } from "react";

import { Timer } from "lucide-react";

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
import { WALLETS } from "@/lib/credits-data";
import type { TimeRange } from "@/lib/dashboard/types";

// Daily limit lives on the module (credits-data). Surfacing it on the
// module's own page header is the right home for it — it's a per-
// module operational signal ("am I going to hit the cap today?"),
// not a usage / billing breakdown line.
const enrichmentModule = WALLETS.find((w) => w.id === "enrichment");
const enrichmentDailyLimit = enrichmentModule?.dailyLimit;

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

  // Tone escalates only as the org gets close to the daily ceiling
  // so the chip's colour means something when it appears. Default is
  // a quiet text-tertiary tone — same chrome as the rest of the
  // page filters.
  const dl = enrichmentDailyLimit;
  const dlPct = dl && dl.count > 0 ? Math.min(100, (dl.used / dl.count) * 100) : 0;
  const dlTone =
      dl && dlPct >= 90 ? "text-[#DC2626]"
    : dl && dlPct >= 75 ? "text-[#92400E]"
    : "text-text-secondary";

  const headerAction = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {dl && (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-button border border-border-subtle bg-white text-[11.5px] font-medium tabular-nums ${dlTone}`}
          title={`Daily limit · ${dl.used.toLocaleString()} of ${dl.count.toLocaleString()} ${dl.unit}${dl.count === 1 ? "" : "s"} used today.`}
        >
          <Timer size={12} strokeWidth={1.75} />
          Daily {dl.used.toLocaleString()} / {dl.count.toLocaleString()} {dl.unit}{dl.count === 1 ? "" : "s"}
        </div>
      )}
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
