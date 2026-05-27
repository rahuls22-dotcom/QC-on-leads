"use client";

// Top-level dashboard for /enrichment. Two halves stacked, single time
// filter at top, two slices of LeadProfile[] in flight at once: the
// active range and the prior-equal-length range (for the success-rate
// delta KPI).
//
// The header filters (time + source) are rendered by the page wrapper
// via DataPageShell.headerAction. State is owned here and exposed via
// onHeaderFiltersChange so the wrapper can mirror it.

import { useEffect, useMemo, useState } from "react";

import { Sparkles } from "lucide-react";
import { useEnrichmentCrmStore, type RunRecord } from "@/lib/enrichment-crm-data";
import { useDemoMode } from "@/lib/demo-mode";

import { flattenRunsToLeadProfiles } from "@/lib/dashboard/flatten-leads";
import { resolveRange } from "@/lib/dashboard/trend-bucketing";
import { loadDashboardState, saveDashboardState } from "@/lib/dashboard/dashboard-storage";
import { DEFAULT_CHART_CARDS } from "@/lib/dashboard/types";
import type {
  ChartCardId,
  FilterClause,
  LeadProfile,
  SavedView,
  TimeRange,
} from "@/lib/dashboard/types";

import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationEnrichment } from "@/components/illustrations/empty-states";

import { DashboardTimeFilter } from "./dashboard-time-filter";
import { ReliabilitySection } from "./reliability-section";
import { LeadExplorer } from "./lead-explorer";
import type { SourceFilter } from "./source-filter-pills";

interface Props {
  onOpenRun?: (r: RunRecord) => void;
  forceEmpty?: boolean;

  // Controlled header filters. When provided, the dashboard does NOT render
  // its own time/source pills — the page wrapper does that via headerAction.
  range?: TimeRange;
  customStart?: Date | null;
  customEnd?: Date | null;
  onRangeChange?: (range: TimeRange, customStart: Date | null, customEnd: Date | null) => void;
  sourceFilter?: SourceFilter;
  onSourceFilterChange?: (v: SourceFilter) => void;
}

export function EnrichmentDashboard({
  forceEmpty = false,
  range: rangeProp,
  customStart: customStartProp,
  customEnd: customEndProp,
  onRangeChange,
  sourceFilter: sourceFilterProp,
  onSourceFilterChange: _onSourceFilterChange,
}: Props) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const { isEmpty: demoEmpty } = useDemoMode();
  const isEmpty = forceEmpty || demoEmpty;

  // Internal fallback state — used if the parent doesn't control the filters.
  const [internalRange, setInternalRange] = useState<TimeRange>("30d");
  const [internalCustomStart, setInternalCustomStart] = useState<Date | null>(null);
  const [internalCustomEnd, setInternalCustomEnd] = useState<Date | null>(null);

  const range = rangeProp ?? internalRange;
  const customStart = customStartProp ?? internalCustomStart;
  const customEnd = customEndProp ?? internalCustomEnd;
  const sourceFilter: SourceFilter = sourceFilterProp ?? "all";
  const isControlled = onRangeChange != null;

  const [filters, setFilters] = useState<FilterClause[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [chartCards, setChartCards] = useState<ChartCardId[]>([...DEFAULT_CHART_CARDS]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const s = loadDashboardState();
    setSavedViews(s.savedViews);
    setChartCards(s.chartCards);
    setHydrated(true);
  }, []);

  // Persist after hydration only — otherwise we'd wipe storage on first render.
  useEffect(() => {
    if (!hydrated) return;
    saveDashboardState({ savedViews, chartCards });
  }, [hydrated, savedViews, chartCards]);

  const bounds = useMemo(
    () => resolveRange(range, customStart, customEnd),
    [range, customStart, customEnd],
  );

  // Previous-period bounds: same length, immediately before the active range.
  const prevBounds = useMemo(() => {
    if (bounds.startMs == null || bounds.endMs == null) {
      return { startMs: null, endMs: null };
    }
    const span = bounds.endMs - bounds.startMs;
    return { startMs: bounds.startMs - span, endMs: bounds.startMs };
  }, [bounds]);

  // Empty-mode override: treat the demo's "empty" state as no runs.
  const effectiveRuns = isEmpty ? [] : runs;

  // All profiles in the active time range (unfiltered by source).
  const allProfiles: LeadProfile[] = useMemo(
    () => flattenRunsToLeadProfiles(effectiveRuns, { bounds }),
    [effectiveRuns, bounds],
  );
  // Source-filtered slice. Drives KPIs, trend, lead explorer.
  const profiles: LeadProfile[] = useMemo(
    () => (sourceFilter === "all" ? allProfiles : allProfiles.filter((p) => p.source === sourceFilter)),
    [allProfiles, sourceFilter],
  );
  const allPrevProfiles: LeadProfile[] = useMemo(
    () => flattenRunsToLeadProfiles(effectiveRuns, { bounds: prevBounds }),
    [effectiveRuns, prevBounds],
  );
  const prevProfiles: LeadProfile[] = useMemo(
    () =>
      sourceFilter === "all"
        ? allPrevProfiles
        : allPrevProfiles.filter((p) => p.source === sourceFilter),
    [allPrevProfiles, sourceFilter],
  );

  // Fallback time-filter row when this component renders its own header.
  const fallbackTimeFilter = !isControlled && (
    <div className="flex justify-end mb-6">
      <DashboardTimeFilter
        range={range}
        customStart={customStart}
        customEnd={customEnd}
        onChange={(r, s, e) => {
          setInternalRange(r);
          setInternalCustomStart(s);
          setInternalCustomEnd(e);
        }}
      />
    </div>
  );

  // Empty state — no enriched leads in the active range.
  if (profiles.length === 0) {
    const allTime = flattenRunsToLeadProfiles(effectiveRuns);
    const description =
      allTime.length === 0
        ? "Connect your CRM or upload a CSV to start enriching."
        : sourceFilter !== "all"
          ? `No enriched leads from ${sourceFilter.toUpperCase()} in this window.`
          : "No enriched leads in the selected range. Try a wider window.";

    return (
      <div>
        {fallbackTimeFilter}
        <EmptyState
          illustration={allTime.length === 0 ? <IllustrationEnrichment /> : <Sparkles size={36} strokeWidth={1.25} className="text-text-tertiary" />}
          title={allTime.length === 0 ? "No enriched leads yet" : "No leads in this window"}
          description={description}
        />
      </div>
    );
  }

  return (
    <div>
      {fallbackTimeFilter}
      <ReliabilitySection
        profiles={profiles}
        prevProfiles={prevProfiles}
        donutProfiles={allProfiles}
        sourceFilter={sourceFilter}
        range={range}
        bounds={bounds}
      />
      <LeadExplorer
        profiles={profiles}
        filters={filters}
        onFiltersChange={setFilters}
        savedViews={savedViews}
        onSavedViewsChange={setSavedViews}
        chartCards={chartCards}
        onChartCardsChange={setChartCards}
      />
    </div>
  );
}
