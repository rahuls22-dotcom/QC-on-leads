# Enrichment Module — Handoff

Generated: 2026-05-29T07:44:20Z
Commit: 5c40cb5
Live: https://revspot-mvp-final-1.vercel.app/enrichment

## States / Variants

Driven by `useDemoMode` (see `src/lib/demo-mode.tsx`). Switched via the sidebar Enrichment-variant picker. Four routes back the same surface:

| Route | Flag | Behavior |
|---|---|---|
| `/enrichment` (default) | none | CRM connected, storage on. Full dashboard + leads table + CRM activity, bulk + single composers all active. |
| `/enrichment-empty` | `isEnrichmentEmpty` | Zero data. Composers visible but history empty. Dashboard blank state. |
| `/enrichment-crm` / no-CRM flag | `isEnrichmentNoCrm` | CRM banner + connect-flow modal. Drops crm source from feeds, keeps bulk + single. |
| storage-off flag | `isEnrichmentNoStorage` | Slim KPI-only dashboard, post-retention summary rows in bulk history, single tab hidden. Run drawer shows '7 days from enrichment completion' hint instead of stored-actions UI. |

Module tabs are: **Dashboard** (root), **Operations** (`/enrichment/operations` — CRM/Bulk/Single composer + history), **Database** (`/enrichment/database` — unified enriched-leads table).

## File Tree (in-order below)

- `src/app/(app)/enrichment/page.tsx`
- `src/app/(app)/enrichment/operations/page.tsx`
- `src/app/(app)/enrichment/database/page.tsx`
- `src/app/(app)/enrichment-empty/page.tsx`
- `src/app/(app)/enrichment-empty/operations/page.tsx`
- `src/app/(app)/enrichment-empty/database/page.tsx`
- `src/app/(app)/enrichment-crm/page.tsx`
- `src/app/(app)/enrichment-crm-empty/page.tsx`
- `src/lib/demo-mode.tsx`
- `src/lib/enrichment-data.ts`
- `src/lib/enrichment-crm-data.ts`
- `src/lib/dashboard/types.ts`
- `src/lib/dashboard/dim-registry.ts`
- `src/lib/dashboard/breakdown.ts`
- `src/lib/dashboard/filter-eval.ts`
- `src/lib/dashboard/flatten-leads.ts`
- `src/lib/dashboard/trend-bucketing.ts`
- `src/lib/dashboard/dashboard-storage.ts`
- `src/components/data/data-page-shell.tsx`
- `src/components/data/data-tabs.tsx`
- `src/components/data/module-tabs.tsx`
- `src/components/data/enrichment-sub-tabs.tsx`
- `src/components/data/enrichment-variant-picker.tsx`
- `src/components/data/enrichment-storage-off-notice.tsx`
- `src/components/data/enriched-leads.tsx`
- `src/components/data/enrichment-dashboard.tsx`
- `src/components/data/enrichment-section.tsx`
- `src/components/data/date-range-popover.tsx`
- `src/components/data/mapping-drawer.tsx`
- `src/components/data/crm-mapped-fields.tsx`
- `src/components/data/contact-extraction-dashboard.tsx`
- `src/components/data/contact-extraction.tsx`
- `src/components/data/dashboard/enrichment-dashboard.tsx`
- `src/components/data/dashboard/reliability-section.tsx`
- `src/components/data/dashboard/reliability-kpis.tsx`
- `src/components/data/dashboard/enriched-trend-chart.tsx`
- `src/components/data/dashboard/source-donut.tsx`
- `src/components/data/dashboard/source-filter-pills.tsx`
- `src/components/data/dashboard/dashboard-time-filter.tsx`
- `src/components/data/dashboard/lead-explorer.tsx`
- `src/components/data/dashboard/breakdown-chart-card.tsx`
- `src/components/data/dashboard/add-chart-card-menu.tsx`
- `src/components/data/dashboard/add-filter-menu.tsx`
- `src/components/data/dashboard/chart-builder-dialog.tsx`
- `src/components/enrichment-crm/crm-tabs.tsx`
- `src/components/enrichment-crm/crm-status-banner.tsx`
- `src/components/enrichment-crm/crm-connect-nudge.tsx`
- `src/components/enrichment-crm/crm-connect-modal.tsx`
- `src/components/enrichment-crm/crm-activity.tsx`
- `src/components/enrichment-crm/composer.tsx`
- `src/components/enrichment-crm/composer-shared.tsx`
- `src/components/enrichment-crm/history-table.tsx`
- `src/components/enrichment-crm/mapping-table.tsx`
- `src/components/enrichment-crm/run-drawer.tsx`
- `src/components/enrichment-crm/spot.ts`
- `src/components/enrichment/composer.tsx`
- `src/components/enrichment/composer-shared.tsx`
- `src/components/enrichment/history-table.tsx`
- `src/components/enrichment/mapping-table.tsx`
- `src/components/enrichment/run-drawer.tsx`
- `src/components/enrichment/spot.ts`

---

## `src/app/(app)/enrichment/page.tsx`

```tsx
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
```

## `src/app/(app)/enrichment/operations/page.tsx`

```tsx
"use client";

// /enrichment/operations, where enrichment actually happens.
// Hosts the 2 input sub-tabs (Bulk upload / Single). Variant driven by
// the module-wide enrichment demo picker in the sidebar.

import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichmentSection } from "@/components/data/enrichment-section";
import { EnrichmentStorageOffNotice } from "@/components/data/enrichment-storage-off-notice";
import { useDemoMode } from "@/lib/demo-mode";

export default function EnrichmentOperationsPage() {
  const { enrichmentVariant, isEnrichmentNoCrm, isEnrichmentNoStorage } = useDemoMode();
  const connected = !isEnrichmentNoCrm;

  return (
    <DataPageShell
      variant={enrichmentVariant === "populated" ? "connected" : "empty"}
      title="Enrich"
      rootLabel="Enrichment"
      rootHref="/enrichment"
      breadcrumbTrail={[
        { label: "Enrichment", href: "/enrichment" },
        { label: "Enrich" },
      ]}
      description="Run enrichment via bulk CSV upload or a single lookup."
    >
      {({ openRun, openConnectFlow }) => (
        <div className="space-y-5">
          {isEnrichmentNoStorage && <EnrichmentStorageOffNotice />}
          <EnrichmentSection
            connected={connected}
            onOpenRun={openRun}
            onConnect={openConnectFlow}
          />
        </div>
      )}
    </DataPageShell>
  );
}
```

## `src/app/(app)/enrichment/database/page.tsx`

```tsx
"use client";

// /enrichment/database, unified DB of every enriched lead.
// Output of all 3 inputs (CRM / Bulk / Single) lives here.
// Variant driven by the module-wide enrichment demo picker in the sidebar.

import { Database, EyeOff, FileDown } from "lucide-react";
import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichedLeads, EnrichedLeadsEmpty } from "@/components/data/enriched-leads";
import { CrmConnectBanner } from "@/components/enrichment-crm/crm-connect-nudge";
import { useDemoMode } from "@/lib/demo-mode";

export default function EnrichmentDatabasePage() {
  const { enrichmentVariant, crmRequestSubmitted } = useDemoMode();

  return (
    <DataPageShell
      variant={enrichmentVariant === "populated" ? "connected" : "empty"}
      title="Enrichment records"
      rootLabel="Enrichment"
      rootHref="/enrichment"
      breadcrumbTrail={[
        { label: "Enrichment", href: "/enrichment" },
        { label: "Enrichment records" },
      ]}
      description="Every lead processed through CRM sync, bulk upload, or single lookup, enriched, partial, or failed."
    >
      {({ openRun, openConnectFlow }) => (
        <div className="space-y-5">
          {enrichmentVariant === "populated" && <EnrichedLeads onOpenRun={openRun} />}

          {enrichmentVariant === "empty" && <EnrichedLeadsEmpty />}

          {enrichmentVariant === "no-crm" && (
            <>
              <CrmConnectBanner onConnect={openConnectFlow} pending={crmRequestSubmitted} />
              <EnrichedLeads onOpenRun={openRun} dropCrmSource />
            </>
          )}

          {enrichmentVariant === "no-storage" && <EnrichedLeadsNoStorage />}
        </div>
      )}
    </DataPageShell>
  );
}

function EnrichedLeadsNoStorage() {
  return (
    <div className="bg-white border border-border rounded-card px-6 py-14">
      <div className="max-w-[560px] mx-auto text-center">
        <div className="w-12 h-12 rounded-card bg-surface-secondary border border-border-subtle flex items-center justify-center mx-auto mb-4">
          <EyeOff size={20} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">
          Enrichment data storage is off
        </h3>
        <p className="text-[12.5px] text-text-secondary leading-relaxed mb-6">
          Your workspace is configured to process enrichment in-flight without saving lead records here.
          Bulk runs are still available as time-limited downloads. Single lookups return inline and aren&apos;t stored.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left mb-5">
          <div className="flex items-start gap-3 p-3.5 bg-surface-secondary/30 border border-border-subtle rounded-card">
            <div className="w-8 h-8 rounded-[6px] bg-white border border-border-subtle flex items-center justify-center flex-shrink-0">
              <FileDown size={14} strokeWidth={1.75} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                Bulk downloads
              </div>
              <div className="text-[11.5px] text-text-tertiary leading-snug">
                Find enriched CSVs in your bulk run history. Links expire after your workspace&rsquo;s storage window.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3.5 bg-surface-secondary/30 border border-border-subtle rounded-card">
            <div className="w-8 h-8 rounded-[6px] bg-white border border-border-subtle flex items-center justify-center flex-shrink-0">
              <Database size={14} strokeWidth={1.75} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                CRM writeback only
              </div>
              <div className="text-[11.5px] text-text-tertiary leading-snug">
                Enriched fields are written straight to your CRM. Nothing persists in Revspot.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
```

## `src/app/(app)/enrichment-empty/page.tsx`

```tsx
"use client";

// /enrichment-empty, base/Dashboard tab for the Enrichment module
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

  // Empty variant, no profiles, counts default to 0.
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
```

## `src/app/(app)/enrichment-empty/operations/page.tsx`

```tsx
"use client";

// /enrichment-empty/operations, Operations tab in the "no CRM" demo variant.

import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichmentSection } from "@/components/data/enrichment-section";

export default function EnrichmentEmptyOperationsPage() {
  return (
    <DataPageShell
      variant="empty"
      title="Enrich"
      rootLabel="Enrichment"
      rootHref="/enrichment-empty"
      breadcrumbTrail={[
        { label: "Enrichment", href: "/enrichment-empty" },
        { label: "Enrich" },
      ]}
      description="Connect your CRM to auto-enrich every lead, or upload a CSV / run a single lookup right now."
    >
      {({ openRun, openConnectFlow }) => (
        <EnrichmentSection
          connected={false}
          onOpenRun={openRun}
          onConnect={openConnectFlow}
        />
      )}
    </DataPageShell>
  );
}
```

## `src/app/(app)/enrichment-empty/database/page.tsx`

```tsx
"use client";

// /enrichment-empty/database, enriched leads DB in the "no CRM" demo.
// Bulk + Single runs still flow into this view even when CRM isn't connected.

import { CrmConnectBanner } from "@/components/enrichment-crm/crm-connect-nudge";
import { DataPageShell } from "@/components/data/data-page-shell";
import { EnrichedLeads } from "@/components/data/enriched-leads";

export default function EnrichmentEmptyDatabasePage() {
  return (
    <DataPageShell
      variant="empty"
      title="Enrichment records"
      rootLabel="Enrichment"
      rootHref="/enrichment-empty"
      breadcrumbTrail={[
        { label: "Enrichment", href: "/enrichment-empty" },
        { label: "Enrichment records" },
      ]}
      description="Every lead processed through bulk upload or single lookup, enriched, partial, or failed. Connect your CRM to backfill leads from there too."
    >
      {({ openRun, openConnectFlow }) => (
        <div className="space-y-6">
          <CrmConnectBanner onConnect={openConnectFlow} />
          <EnrichedLeads onOpenRun={openRun} />
        </div>
      )}
    </DataPageShell>
  );
}
```

## `src/app/(app)/enrichment-crm/page.tsx`

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, X } from "lucide-react";

import { useDemoMode } from "@/lib/demo-mode";
import { sampleCsvDataUrl, sampleCsvFilename, useEnrichmentCrmStore, type RunRecord } from "@/lib/enrichment-crm-data";
import { EnrichmentComposer } from "@/components/enrichment-crm/composer";
import { HistoryTable } from "@/components/enrichment-crm/history-table";
import { RunDrawer } from "@/components/enrichment-crm/run-drawer";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationEnrichment } from "@/components/illustrations/empty-states";
import { CrmStatusBanner } from "@/components/enrichment-crm/crm-status-banner";
import { CrmTabs, type CrmTabKey } from "@/components/enrichment-crm/crm-tabs";
import { CrmActivity } from "@/components/enrichment-crm/crm-activity";

export default function EnrichmentPage() {
  const { isEmpty } = useDemoMode();
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const setRuns = useEnrichmentCrmStore((s) => s.setRuns);
  const markCompletionsSeen = useEnrichmentCrmStore((s) => s.markCompletionsSeen);
  const tickProgress = useEnrichmentCrmStore((s) => s.tickProgress);
  const router = useRouter();

  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [tab, setTab] = useState<CrmTabKey>("activity");

  // History per tab, bulk tab shows bulk runs only, single tab shows single runs only.
  // CRM-sourced runs live inside the CRM activity tab and are excluded everywhere else.
  const bulkRuns   = isEmpty ? [] : runs.filter((r) => r.source === "bulk");
  const singleRuns = isEmpty ? [] : runs.filter((r) => r.source === "single");

  // Mark completions seen on visit
  useEffect(() => {
    markCompletionsSeen();
  }, [markCompletionsSeen]);

  // Walk any in_progress bulk runs toward completion so the UI feels live.
  useEffect(() => {
    const hasInFlight = runs.some((r) => r.status === "in_progress");
    if (!hasInFlight) return;
    const id = window.setInterval(() => tickProgress(), 900);
    return () => window.clearInterval(id);
  }, [runs, tickProgress]);

  // Listen for composer toast events
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<RawToastDetail>;
      const payload: ToastPayload = normalizeToast(ce.detail);
      setToast(payload);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 5200);
    };
    window.addEventListener("enrichment-crm:toast", handler);
    return () => {
      window.removeEventListener("enrichment-crm:toast", handler);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Listen for "expand inline result to drawer" requests from the composer.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ runId?: string }>;
      const runId = ce.detail?.runId;
      if (!runId) return;
      const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
      if (run) setSelectedRun(run);
    };
    window.addEventListener("enrichment-crm:open-run", handler);
    return () => window.removeEventListener("enrichment-crm:open-run", handler);
  }, []);

  const openToastRun = (runId: string) => {
    const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
    if (run) setSelectedRun(run);
    setToast(null);
  };

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  // Demo: if empty mode toggled mid-session, snapshot to empty
  useEffect(() => {
    if (isEmpty) {
      // Don't actually wipe, empty state is rendered conditionally below.
      // Real demo-empty wipe would call setRuns([]); skipping to preserve mock data.
    }
  }, [isEmpty, setRuns]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-meta text-text-secondary mb-1">Tools</div>
          <h1 className="text-page-title text-text-primary">Enrichment</h1>
          <p className="text-[13px] text-text-secondary mt-1.5 max-w-[760px] leading-relaxed">
            Enrichment fills two layers of data on every lead: <span className="font-medium text-text-primary">Professional</span> (name, title, company, LinkedIn, work email) and <span className="font-medium text-text-primary">Financial</span> (income band, investment capacity, net-worth signals).
            Connected CRM leads get enriched and pushed back automatically. You can also upload a CSV or run a single lookup.
          </p>
        </div>
        <DemoVariantToggle />
      </div>

      {/* Tabs */}
      <CrmTabs value={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === "activity" && (
        <div className="space-y-6">
          <CrmStatusBanner />
          <CrmActivity onOpenRun={(r) => setSelectedRun(r)} />
        </div>
      )}

      {tab === "bulk" && (
        <>
          <EnrichmentComposer mode="bulk" />

          <div className="mt-8">
            {bulkRuns.length === 0 ? (
              <EmptyState
                illustration={<IllustrationEnrichment />}
                title="No bulk uploads yet"
                description="Upload a CSV to enrich in bulk. Push the result back to your CRM when it lands."
                action={
                  <a
                    href={sampleCsvDataUrl([])}
                    download={sampleCsvFilename([])}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-text-primary text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
                  >
                    <Download size={14} strokeWidth={1.5} />
                    Download sample CSV
                  </a>
                }
              />
            ) : (
              <HistoryTable
                onView={(r) => setSelectedRun(r)}
                forceSource="bulk"
                title="Bulk upload history"
              />
            )}
          </div>
        </>
      )}

      {tab === "single" && (
        <>
          <EnrichmentComposer mode="single" />

          <div className="mt-8">
            {singleRuns.length === 0 ? (
              <EmptyState
                illustration={<IllustrationEnrichment />}
                title="No single lookups yet"
                description="Enrich one lead at a time using email, phone, or LinkedIn. Each successful lookup lands below."
              />
            ) : (
              <HistoryTable
                onView={(r) => setSelectedRun(r)}
                forceSource="single"
                title="Single lookup history"
              />
            )}
          </div>
        </>
      )}

      {/* Drawer */}
      <RunDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        onBuildAudience={onBuildAudience}
      />

      {/* Toast, sonner-style */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[80] w-[380px] max-w-[calc(100vw-32px)] bg-white border border-border rounded-card shadow-[0_12px_32px_rgba(15,15,15,0.12),0_0_0_1px_rgba(15,15,15,0.04)]"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <Loader2 size={14} strokeWidth={1.75} className="text-[#1D4ED8] animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary">{toast.title}</div>
                {toast.description && (
                  <div className="text-[12px] text-text-secondary leading-snug mt-1">{toast.description}</div>
                )}
                {toast.runId && (
                  <button
                    onClick={() => openToastRun(toast.runId!)}
                    className="text-[12px] font-medium text-text-primary underline underline-offset-2 hover:opacity-80 mt-2"
                  >
                    View run
                  </button>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Demo variant toggle ───────────────────────────────────────────────

function DemoVariantToggle() {
  return (
    <div className="inline-flex items-center bg-white border border-border rounded-input p-0.5 text-[11px] flex-shrink-0">
      <span className="h-7 px-2.5 inline-flex items-center font-medium bg-text-primary text-white rounded-[6px]">
        CRM connected
      </span>
      <Link
        href="/enrichment-crm-empty"
        className="h-7 px-2.5 inline-flex items-center font-medium text-text-secondary hover:text-text-primary rounded-[6px] transition-colors"
      >
        Not connected
      </Link>
    </div>
  );
}

// ── Toast types & helpers ─────────────────────────────────────────────

type RawToastDetail =
  | string
  | { message: string }
  | {
      kind?: string;
      title?: string;
      description?: string;
      runId?: string;
      message?: string;
    };

interface ToastPayload {
  id: string;
  title: string;
  description?: string;
  runId?: string;
}

function normalizeToast(d: RawToastDetail): ToastPayload {
  const id = `t-${Date.now()}`;
  if (typeof d === "string") return { id, title: d };
  if ("message" in d && d.message && !("title" in d && d.title)) {
    return { id, title: d.message };
  }
  const obj = d as { title?: string; description?: string; runId?: string };
  return {
    id,
    title: obj.title || "Done",
    description: obj.description,
    runId: obj.runId,
  };
}
```

## `src/app/(app)/enrichment-crm-empty/page.tsx`

```tsx
"use client";

// Demo variant of /enrichment-crm where no CRM is connected.
// Same shell, but:
//   - Top status banner is replaced with the amber "Connect CRM" nudge banner.
//   - Activity tab swaps the live activity dashboard for a hero card explaining
//     what enrichment is and pushing the user to connect.
//   - Bulk + Single tabs still work, those don't need a CRM.
// Switch back to the connected view via the toggle in the header.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, X } from "lucide-react";

import { useDemoMode } from "@/lib/demo-mode";
import { sampleCsvDataUrl, sampleCsvFilename, useEnrichmentCrmStore, type RunRecord } from "@/lib/enrichment-crm-data";
import { EnrichmentComposer } from "@/components/enrichment-crm/composer";
import { HistoryTable } from "@/components/enrichment-crm/history-table";
import { RunDrawer } from "@/components/enrichment-crm/run-drawer";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationEnrichment } from "@/components/illustrations/empty-states";
import { CrmTabs, type CrmTabKey } from "@/components/enrichment-crm/crm-tabs";
import { CrmConnectBanner, CrmConnectHero } from "@/components/enrichment-crm/crm-connect-nudge";

export default function EnrichmentEmptyPage() {
  const { isEmpty } = useDemoMode();
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const setRuns = useEnrichmentCrmStore((s) => s.setRuns);
  const markCompletionsSeen = useEnrichmentCrmStore((s) => s.markCompletionsSeen);
  const tickProgress = useEnrichmentCrmStore((s) => s.tickProgress);
  const router = useRouter();

  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [tab, setTab] = useState<CrmTabKey>("activity");

  const bulkRuns   = isEmpty ? [] : runs.filter((r) => r.source === "bulk");
  const singleRuns = isEmpty ? [] : runs.filter((r) => r.source === "single");

  useEffect(() => {
    markCompletionsSeen();
  }, [markCompletionsSeen]);

  useEffect(() => {
    const hasInFlight = runs.some((r) => r.status === "in_progress");
    if (!hasInFlight) return;
    const id = window.setInterval(() => tickProgress(), 900);
    return () => window.clearInterval(id);
  }, [runs, tickProgress]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<RawToastDetail>;
      const payload: ToastPayload = normalizeToast(ce.detail);
      setToast(payload);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 5200);
    };
    window.addEventListener("enrichment-crm:toast", handler);
    return () => {
      window.removeEventListener("enrichment-crm:toast", handler);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ runId?: string }>;
      const runId = ce.detail?.runId;
      if (!runId) return;
      const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
      if (run) setSelectedRun(run);
    };
    window.addEventListener("enrichment-crm:open-run", handler);
    return () => window.removeEventListener("enrichment-crm:open-run", handler);
  }, []);

  const openToastRun = (runId: string) => {
    const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
    if (run) setSelectedRun(run);
    setToast(null);
  };

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  useEffect(() => {
    if (isEmpty) {
      // Preserve mock data; empty handled below.
    }
  }, [isEmpty, setRuns]);

  const openConnectFlow = () => {
    // Demo handler, in real product this would open the OAuth/credential flow.
    window.dispatchEvent(
      new CustomEvent("enrichment-crm:toast", {
        detail: { title: "Connect CRM (demo)", description: "Real flow opens the integrations setup. Not wired in this prototype." },
      }),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-meta text-text-secondary mb-1">Tools</div>
          <h1 className="text-page-title text-text-primary">Enrichment</h1>
          <p className="text-[13px] text-text-secondary mt-1.5 max-w-[760px] leading-relaxed">
            Enrichment fills two layers of data on every lead: <span className="font-medium text-text-primary">Professional</span> (name, title, company, LinkedIn, work email) and <span className="font-medium text-text-primary">Financial</span> (income band, investment capacity, net-worth signals).
            Connect your CRM to enrich automatically, or upload a CSV / run a single lookup.
          </p>
        </div>
        <DemoVariantToggle />
      </div>

      {/* Tabs */}
      <CrmTabs value={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === "activity" && (
        <div className="space-y-6">
          <CrmConnectBanner onConnect={openConnectFlow} />
          <CrmConnectHero
            onConnect={openConnectFlow}
            onManual={() => setTab("bulk")}
          />
        </div>
      )}

      {tab === "bulk" && (
        <>
          <CrmConnectBanner onConnect={openConnectFlow} />
          <EnrichmentComposer mode="bulk" />

          <div className="mt-8">
            {bulkRuns.length === 0 ? (
              <EmptyState
                illustration={<IllustrationEnrichment />}
                title="No bulk uploads yet"
                description="Upload a CSV to enrich in bulk. Push the result back to your CRM when it lands."
                action={
                  <a
                    href={sampleCsvDataUrl([])}
                    download={sampleCsvFilename([])}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-text-primary text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
                  >
                    <Download size={14} strokeWidth={1.5} />
                    Download sample CSV
                  </a>
                }
              />
            ) : (
              <HistoryTable
                onView={(r) => setSelectedRun(r)}
                forceSource="bulk"
                title="Bulk upload history"
              />
            )}
          </div>
        </>
      )}

      {tab === "single" && (
        <>
          <CrmConnectBanner onConnect={openConnectFlow} />
          <EnrichmentComposer mode="single" />

          <div className="mt-8">
            {singleRuns.length === 0 ? (
              <EmptyState
                illustration={<IllustrationEnrichment />}
                title="No single lookups yet"
                description="Enrich one lead at a time using email, phone, or LinkedIn. Each successful lookup lands below."
              />
            ) : (
              <HistoryTable
                onView={(r) => setSelectedRun(r)}
                forceSource="single"
                title="Single lookup history"
              />
            )}
          </div>
        </>
      )}

      {/* Drawer */}
      <RunDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        onBuildAudience={onBuildAudience}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[80] w-[380px] max-w-[calc(100vw-32px)] bg-white border border-border rounded-card shadow-[0_12px_32px_rgba(15,15,15,0.12),0_0_0_1px_rgba(15,15,15,0.04)]"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <Loader2 size={14} strokeWidth={1.75} className="text-[#1D4ED8] animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary">{toast.title}</div>
                {toast.description && (
                  <div className="text-[12px] text-text-secondary leading-snug mt-1">{toast.description}</div>
                )}
                {toast.runId && (
                  <button
                    onClick={() => openToastRun(toast.runId!)}
                    className="text-[12px] font-medium text-text-primary underline underline-offset-2 hover:opacity-80 mt-2"
                  >
                    View run
                  </button>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Demo variant toggle ───────────────────────────────────────────────

function DemoVariantToggle() {
  return (
    <div className="inline-flex items-center bg-white border border-border rounded-input p-0.5 text-[11px] flex-shrink-0">
      <Link
        href="/enrichment-crm"
        className="h-7 px-2.5 inline-flex items-center font-medium text-text-secondary hover:text-text-primary rounded-[6px] transition-colors"
      >
        CRM connected
      </Link>
      <span className="h-7 px-2.5 inline-flex items-center font-medium bg-text-primary text-white rounded-[6px]">
        Not connected
      </span>
    </div>
  );
}

// ── Toast types & helpers ─────────────────────────────────────────────

type RawToastDetail =
  | string
  | { message: string }
  | {
      kind?: string;
      title?: string;
      description?: string;
      runId?: string;
      message?: string;
    };

interface ToastPayload {
  id: string;
  title: string;
  description?: string;
  runId?: string;
}

function normalizeToast(d: RawToastDetail): ToastPayload {
  const id = `t-${Date.now()}`;
  if (typeof d === "string") return { id, title: d };
  if ("message" in d && d.message && !("title" in d && d.title)) {
    return { id, title: d.message };
  }
  const obj = d as { title?: string; description?: string; runId?: string };
  return {
    id,
    title: obj.title || "Done",
    description: obj.description,
    runId: obj.runId,
  };
}
```

## `src/lib/demo-mode.tsx`

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

type DemoMode = "populated" | "empty";

// Module-scoped variant for the Enrichment product. Drives Dashboard,
// Operations, Database, and CRM-tab states from a single picker.
export type EnrichmentVariant = "populated" | "empty" | "no-crm" | "no-storage";

interface DemoModeContextValue {
  mode: DemoMode;
  toggle: () => void;
  isEmpty: boolean;
  // Enrichment-only demo variant. Independent of the global isEmpty so
  // toggling enrichment to no-crm doesn't blank out other modules.
  enrichmentVariant: EnrichmentVariant;
  setEnrichmentVariant: (v: EnrichmentVariant) => void;
  isEnrichmentEmpty: boolean;
  isEnrichmentNoCrm: boolean;
  isEnrichmentNoStorage: boolean;
  // No-CRM flow: user has submitted a "connect via support" request. Flips
  // the CRM connect banner from CTA → pending state. Persists across navs.
  crmRequestSubmitted: boolean;
  setCrmRequestSubmitted: (v: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  mode: "populated",
  toggle: () => {},
  isEmpty: false,
  enrichmentVariant: "populated",
  setEnrichmentVariant: () => {},
  isEnrichmentEmpty: false,
  isEnrichmentNoCrm: false,
  isEnrichmentNoStorage: false,
  crmRequestSubmitted: false,
  setCrmRequestSubmitted: () => {},
});

const STORAGE_KEY = "revspot:enrichment-variant";
const CRM_REQUEST_KEY = "revspot:crm-request-submitted";

function isValidVariant(v: string | null): v is EnrichmentVariant {
  return v === "populated" || v === "empty" || v === "no-crm" || v === "no-storage";
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DemoMode>("populated");
  const [enrichmentVariant, setEnrichmentVariantState] =
    useState<EnrichmentVariant>("populated");
  const [crmRequestSubmitted, setCrmRequestSubmittedState] = useState(false);

  // Hydrate enrichment variant + CRM-request flag from localStorage so demo
  // state survives page nav.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidVariant(stored)) setEnrichmentVariantState(stored);
    setCrmRequestSubmittedState(window.localStorage.getItem(CRM_REQUEST_KEY) === "1");
  }, []);

  const setEnrichmentVariant = useCallback((v: EnrichmentVariant) => {
    setEnrichmentVariantState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, v);
    }
  }, []);

  const setCrmRequestSubmitted = useCallback((v: boolean) => {
    setCrmRequestSubmittedState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CRM_REQUEST_KEY, v ? "1" : "0");
    }
  }, []);

  const toggle = useCallback(
    () => setMode((m) => (m === "populated" ? "empty" : "populated")),
    [],
  );

  // Global "Preview Empty States" and the enrichment variant are independent
  // controls now. Sidebar exposes both side-by-side so flipping enrichment to
  // "No CRM" doesn't blank out non-enrichment modules.
  const globalEmpty = mode === "empty";

  return (
    <DemoModeContext.Provider
      value={{
        mode,
        toggle,
        isEmpty: globalEmpty,
        enrichmentVariant,
        setEnrichmentVariant,
        isEnrichmentEmpty: enrichmentVariant === "empty",
        isEnrichmentNoCrm: enrichmentVariant === "no-crm",
        isEnrichmentNoStorage: enrichmentVariant === "no-storage",
        crmRequestSubmitted,
        setCrmRequestSubmitted,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
```

## `src/lib/enrichment-data.ts`

```tsx
// Enrichment domain types + mock data + lightweight runs store.
// V1 ports app.revspot enrichment into launchpad. No new functionality.

"use client";

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────

export type EnrichmentType = "professional" | "financial";

export type RunStatus = "in_progress" | "done" | "failed";

export type RunSource = "single" | "bulk";

export type RequiredField = "email" | "phone" | "linkedin" | "name";

export interface ColumnMapping {
  field: RequiredField;
  detectedColumn: string | null; // null = unmapped
  sampleValue?: string;
}

export interface SingleInput {
  email?: string;
  phone?: string;
  linkedin?: string;
  name?: string;
}

// Pricing, v1 placeholder. Real values come later.
export const CREDITS_PER_LEAD: Record<EnrichmentType, number> = {
  professional: 1,
  financial: 1,
};

// User's current credit balance (mocked in store).
// Real implementation would read from billing.

// ── Profile shape (what an enriched lead looks like) ─────────────────────

export interface ProfessionalEnrichment {
  name?: string;
  linkedin?: string;
  profile_summary?: string;
  personality?: string;
  age?: number;
  age_group?: string;
  location?: string;
  location_type?: string;
  state?: string;
  city?: string;
  country?: string;
  employed?: boolean;
  engineer?: boolean;
  professional_level?: string;
  years_of_experience?: number;
  job_title?: string;
  company_name?: string;
  company_tier?: string;
  company_industry?: string;
  university_tier?: string;
  iit_iim?: boolean;
  mba?: boolean;
  photo_url?: string;
  languages?: string[];
}

export interface FinancialEnrichment {
  credit_limit?: number;
  credit_utilization?: number;
  credit_score?: number;
  total_credit_cards?: number;
  car_loan_amount?: number;
  total_cars?: number;
  home_loan_amount?: number;
  home_emi?: number;
  total_home_loans?: number;
  estimated_yearly_earnings?: number;
  estimated_lifetime_earnings?: number;
  annual_earnings_inr_min?: number;
  annual_earnings_inr_max?: number;
  potential_tier?: "Low" | "Medium" | "High";
  final_score?: number;
}

export interface EnrichedProfile {
  lead_id?: string;
  professional?: ProfessionalEnrichment;
  financial?: FinancialEnrichment;
  // status fields
  enrichment_status?: "Zero Enrichment" | "Fully Enriched" | "Partial Enrichment";
  finance_data?: "Available" | "Not Available";
  email_verification_status?: string;
  phone_verification_status?: string;
  valid_indian_name?: boolean;
  // Original input the user typed, used as fallback header when no professional block.
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  };
}

// ── Run record ───────────────────────────────────────────────────────────

export interface RunRecord {
  id: string;
  source: RunSource;            // single | bulk
  filename?: string;            // bulk only
  inputValue?: string;          // single only (email/phone/linkedin/name display)
  types: EnrichmentType[];      // ["professional"], ["financial"], or both
  status: RunStatus;
  progressPct?: number;         // in_progress only
  leadsTotal: number;
  leadsSuccess: number;
  leadsFailed: number;
  leadsSkipped: number;
  creditsBlocked: number;       // up front
  creditsCharged: number;       // on completion
  creditsRefunded: number;      // on completion
  startedAt: string;
  finishedAt?: string;
  errorCode?: string;           // failed only
  errorMessage?: string;        // failed only
  profile?: EnrichedProfile;    // single only
}

// ── Mock data ────────────────────────────────────────────────────────────

export const sampleProfile: EnrichedProfile = {
  lead_id: "00Qe200000Sygly",
  enrichment_status: "Fully Enriched",
  finance_data: "Available",
  email_verification_status: "Valid",
  phone_verification_status: "Valid",
  valid_indian_name: true,
  professional: {
    name: "Arjun Mehta",
    linkedin: "https://linkedin.com/in/arjunmehta",
    profile_summary:
      "Senior software engineer with 11 years experience across fintech and consumer. IIT Delhi → Goldman Sachs → Razorpay → currently Staff Eng at PhonePe.",
    personality: "Analytical, pragmatic, growth-oriented",
    age: 34,
    age_group: "30-39",
    location: "Bangalore",
    location_type: "Metro",
    state: "Karnataka",
    city: "Bangalore",
    country: "India",
    employed: true,
    engineer: true,
    professional_level: "Senior",
    years_of_experience: 11,
    job_title: "Staff Software Engineer",
    company_name: "PhonePe",
    company_tier: "Tier 1",
    company_industry: "Fintech",
    university_tier: "Tier 1",
    iit_iim: true,
    mba: false,
    languages: ["English", "Hindi"],
  },
  financial: {
    credit_limit: 850000,
    credit_utilization: 0.18,
    credit_score: 812,
    total_credit_cards: 4,
    car_loan_amount: 0,
    total_cars: 1,
    home_loan_amount: 9500000,
    home_emi: 78000,
    total_home_loans: 1,
    estimated_yearly_earnings: 6500000,
    estimated_lifetime_earnings: 145000000,
    annual_earnings_inr_min: 6000000,
    annual_earnings_inr_max: 7500000,
    potential_tier: "High",
    final_score: 87,
  },
  contact: {
    name: "Arjun Mehta",
    email: "arjun.mehta@phonepe.com",
    phone: "+91 98765 43210",
    linkedin: "https://linkedin.com/in/arjunmehta",
  },
};

const mockRuns: RunRecord[] = [
  {
    id: "run-1",
    source: "bulk",
    filename: "godrej-whitefield-leads.csv",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 1000,
    leadsSuccess: 782,
    leadsFailed: 198,
    leadsSkipped: 20,
    creditsBlocked: 2000,
    creditsCharged: 1564,
    creditsRefunded: 436,
    startedAt: "2026-05-22T08:14:00Z",
    finishedAt: "2026-05-22T10:42:00Z",
  },
  {
    id: "run-2",
    source: "bulk",
    filename: "assetz-sarjapur-q2.xlsx",
    types: ["professional"],
    status: "in_progress",
    progressPct: 47,
    leadsTotal: 2400,
    leadsSuccess: 0,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 2400,
    creditsCharged: 0,
    creditsRefunded: 0,
    startedAt: "2026-05-22T11:20:00Z",
  },
  {
    id: "run-3",
    source: "single",
    inputValue: "arjun.mehta@phonepe.com",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 1,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 2,
    creditsCharged: 2,
    creditsRefunded: 0,
    startedAt: "2026-05-22T07:02:00Z",
    finishedAt: "2026-05-22T07:02:08Z",
    profile: sampleProfile,
  },
  {
    id: "run-4",
    source: "bulk",
    filename: "chefworks-hni-mar.csv",
    types: ["financial"],
    status: "failed",
    leadsTotal: 540,
    leadsSuccess: 0,
    leadsFailed: 540,
    leadsSkipped: 0,
    creditsBlocked: 540,
    creditsCharged: 0,
    creditsRefunded: 540,
    startedAt: "2026-05-21T16:00:00Z",
    finishedAt: "2026-05-21T16:08:00Z",
    errorCode: "PROVIDER_TIMEOUT",
    errorMessage: "Financial enrichment provider timed out after 3 retries.",
  },
  {
    id: "run-5",
    source: "single",
    inputValue: "+91 9876543210",
    types: ["professional"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 1,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 1,
    creditsCharged: 1,
    creditsRefunded: 0,
    startedAt: "2026-05-20T14:23:00Z",
    finishedAt: "2026-05-20T14:23:04Z",
    profile: { ...sampleProfile, financial: undefined },
  },
];

// ── Sample CSV files (download links) ────────────────────────────────────

// Picks the right static sample file based on enrichment types.
//   - prof + fin → name, phone, email, linkedin (full)
//   - financial  → name, phone (minimum for financial)
//   - professional / empty → email, phone, linkedin (no name needed)
// Files live under public/sample-csvs/ and contain ~50 demo leads each
// so an uploaded run shows real chart variation.

export function sampleCsvFilename(types: EnrichmentType[]): string {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (hasPro && hasFin) return "enrichment-sample-pro-fin.csv";
  if (hasFin) return "enrichment-sample-financial.csv";
  return "enrichment-sample-professional.csv";
}

export function sampleCsvDataUrl(types: EnrichmentType[]): string {
  return `/sample-csvs/${sampleCsvFilename(types)}`;
}

// ── Validation: which types are runnable given inputs available ──────────

export function runnableTypes(
  selected: EnrichmentType[],
  available: Set<RequiredField>,
): { runnable: EnrichmentType[]; skipped: { type: EnrichmentType; missing: RequiredField[] }[] } {
  const runnable: EnrichmentType[] = [];
  const skipped: { type: EnrichmentType; missing: RequiredField[] }[] = [];

  for (const t of selected) {
    if (t === "professional") {
      // Any one of email / phone / linkedin
      if (available.has("email") || available.has("phone") || available.has("linkedin")) {
        runnable.push("professional");
      } else {
        skipped.push({ type: "professional", missing: ["email", "phone", "linkedin"] });
      }
    } else if (t === "financial") {
      // Phone + Name required (name derivable from email/linkedin downstream, but phone always required)
      const missing: RequiredField[] = [];
      if (!available.has("phone")) missing.push("phone");
      // Name can be derived if email or linkedin present
      const nameDerivable = available.has("name") || available.has("email") || available.has("linkedin");
      if (!nameDerivable) missing.push("name");
      if (missing.length === 0) runnable.push("financial");
      else skipped.push({ type: "financial", missing });
    }
  }
  return { runnable, skipped };
}

// ── Auto-detect CSV column → required field mapping ──────────────────────

const FIELD_HINTS: Record<RequiredField, string[]> = {
  email: ["email", "e-mail", "mail", "email_address", "emailaddress"],
  phone: ["phone", "phone_number", "mobile", "contact", "phone_no", "mobileno", "tel"],
  linkedin: ["linkedin", "linkedin_url", "li_url", "li", "profile_url", "linkedinprofile"],
  name: ["name", "full_name", "fullname", "first_name", "lead_name", "contact_name"],
};

export function autoDetectMapping(headers: string[]): Record<RequiredField, string | null> {
  const lower = headers.map((h) => ({ original: h, norm: h.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  const out: Record<RequiredField, string | null> = { email: null, phone: null, linkedin: null, name: null };
  for (const field of ["email", "phone", "linkedin", "name"] as RequiredField[]) {
    const hints = FIELD_HINTS[field].map((h) => h.replace(/[^a-z0-9]/g, ""));
    const hit = lower.find(({ norm }) => hints.some((h) => norm === h || norm.includes(h)));
    if (hit) out[field] = hit.original;
  }
  return out;
}

// ── Store ─────────────────────────────────────────────────────────────────

interface EnrichmentStore {
  runs: RunRecord[];
  balance: number;
  unseenCompletions: number;   // for sidebar badge
  addRun: (run: RunRecord) => void;
  markCompletionsSeen: () => void;
  setRuns: (runs: RunRecord[]) => void;
  tickProgress: () => void;    // advances any in_progress bulk runs; flips to "done" at 100%
}

export const useEnrichmentStore = create<EnrichmentStore>((set) => ({
  runs: mockRuns,
  balance: 12480,
  unseenCompletions: 1,        // one new completion since last visit (for demo)
  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  markCompletionsSeen: () => set({ unseenCompletions: 0 }),
  setRuns: (runs) => set({ runs }),
  tickProgress: () =>
    set((s) => {
      let changed = false;
      const next = s.runs.map((r) => {
        if (r.status !== "in_progress") return r;
        const cur = r.progressPct ?? 0;
        // Bumps of 3–9% per tick, feels organic, not linear.
        const bump = 3 + Math.floor(Math.random() * 7);
        const np = Math.min(100, cur + bump);
        changed = true;
        if (np >= 100) {
          // Settle the run: 92% success, ~6% skipped, ~2% failed, realistic-ish.
          const total = r.leadsTotal ?? 0;
          const success = Math.round(total * 0.92);
          const skipped = Math.round(total * 0.06);
          const failed = Math.max(0, total - success - skipped);
          const perLead = r.types.reduce((sum, t) => sum + CREDITS_PER_LEAD[t], 0);
          const charged = (success + failed) * perLead;
          const refunded = Math.max(0, (r.creditsBlocked ?? 0) - charged);
          return {
            ...r,
            status: "done" as RunStatus,
            progressPct: 100,
            leadsSuccess: success,
            leadsSkipped: skipped,
            leadsFailed: failed,
            creditsCharged: charged,
            creditsRefunded: refunded,
            finishedAt: new Date().toISOString(),
          };
        }
        return { ...r, progressPct: np };
      });
      return changed ? { runs: next } : s;
    }),
}));

// ── Formatting helpers ───────────────────────────────────────────────────

export function formatCredits(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function successPct(run: RunRecord): number {
  if (run.leadsTotal === 0) return 0;
  return Math.round((run.leadsSuccess / run.leadsTotal) * 100);
}

export function typeLabel(types: EnrichmentType[]): string {
  if (types.length === 2) return "Both";
  if (types[0] === "professional") return "Professional";
  if (types[0] === "financial") return "Financial";
  return "—";
}

export function typeShortLabel(types: EnrichmentType[]): string {
  if (types.length === 2) return "Pro · Fin";
  if (types[0] === "professional") return "Pro";
  if (types[0] === "financial") return "Fin";
  return "—";
}
```

## `src/lib/enrichment-crm-data.ts`

```tsx
// Enrichment domain types + mock data + lightweight runs store.
// V1 ports app.revspot enrichment into launchpad. No new functionality.

"use client";

import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────

export type EnrichmentType = "professional" | "financial";

export type RunStatus = "in_progress" | "done" | "failed";

export type RunSource = "single" | "bulk" | "crm";

// ── CRM integration ──────────────────────────────────────────────────────

export type CrmProvider = "salesforce" | "hubspot" | "pipedrive";
export type CrmLeadChannel = "Web form" | "API" | "Salesforce" | "Chat" | "Import";

export interface CrmOriginRef {
  provider: CrmProvider;
  objectType: "Lead" | "Contact" | "Account";
  recordId: string;
  recordUrl?: string;
  channel: CrmLeadChannel;          // how the lead landed in the CRM
}

export interface CrmSyncState {
  status: "not_pushed" | "pending" | "synced" | "failed";
  syncedAt?: string;
  pushedRecords?: number;
  failedRecords?: number;
  errorMessage?: string;
}

export interface CrmConnection {
  provider: CrmProvider;
  accountName: string;
  connectedAt: string;
  lastSyncedAt: string;
  status: "connected" | "degraded" | "disconnected";
  mappedFieldCount: number;
  writeBackPolicy: "fill_blanks" | "overwrite" | "field_selective";
}

export type RequiredField = "email" | "phone" | "linkedin" | "name";

export interface ColumnMapping {
  field: RequiredField;
  detectedColumn: string | null; // null = unmapped
  sampleValue?: string;
}

export interface SingleInput {
  email?: string;
  phone?: string;
  linkedin?: string;
  name?: string;
}

// Pricing, v1 placeholder. Real values come later.
export const CREDITS_PER_LEAD: Record<EnrichmentType, number> = {
  professional: 1,
  financial: 1,
};

// User's current credit balance (mocked in store).
// Real implementation would read from billing.

// ── Profile shape (what an enriched lead looks like) ─────────────────────

export interface ProfessionalEnrichment {
  name?: string;
  linkedin?: string;
  profile_summary?: string;
  personality?: string;
  age?: number;
  age_group?: string;
  location?: string;
  location_type?: string;
  state?: string;
  city?: string;
  country?: string;
  employed?: boolean;
  engineer?: boolean;
  professional_level?: string;
  years_of_experience?: number;
  job_title?: string;
  company_name?: string;
  company_tier?: string;
  company_industry?: string;
  university_tier?: string;
  iit_iim?: boolean;
  mba?: boolean;
  photo_url?: string;
  languages?: string[];
}

export interface FinancialEnrichment {
  credit_limit?: number;
  credit_utilization?: number;
  credit_score?: number;
  total_credit_cards?: number;
  car_loan_amount?: number;
  total_cars?: number;
  home_loan_amount?: number;
  home_emi?: number;
  total_home_loans?: number;
  estimated_yearly_earnings?: number;
  estimated_lifetime_earnings?: number;
  annual_earnings_inr_min?: number;
  annual_earnings_inr_max?: number;
  potential_tier?: "Low" | "Medium" | "High";
  final_score?: number;
}

export interface EnrichedProfile {
  lead_id?: string;
  professional?: ProfessionalEnrichment;
  financial?: FinancialEnrichment;
  // status fields
  enrichment_status?: "Zero Enrichment" | "Fully Enriched" | "Partial Enrichment";
  finance_data?: "Available" | "Not Available";
  email_verification_status?: string;
  phone_verification_status?: string;
  valid_indian_name?: boolean;
  // Original input the user typed, used as fallback header when no professional block.
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  };
}

// ── Run record ───────────────────────────────────────────────────────────

export interface RunRecord {
  id: string;
  source: RunSource;            // single | bulk
  filename?: string;            // bulk only
  inputValue?: string;          // single only (email/phone/linkedin/name display)
  types: EnrichmentType[];      // ["professional"], ["financial"], or both
  status: RunStatus;
  progressPct?: number;         // in_progress only
  leadsTotal: number;
  leadsSuccess: number;
  leadsFailed: number;
  leadsSkipped: number;
  creditsBlocked: number;       // up front
  creditsCharged: number;       // on completion
  creditsRefunded: number;      // on completion
  startedAt: string;
  finishedAt?: string;
  errorCode?: string;           // failed only
  errorMessage?: string;        // failed only
  profile?: EnrichedProfile;    // single only (and crm, one profile per row)
  leads?: EnrichedProfile[];    // bulk only, sample of enriched lead profiles
  // CRM-only fields
  crmOrigin?: CrmOriginRef;     // when source=crm
  crmSync?: CrmSyncState;       // for any run that was pushed back to CRM
}

// ── Mock data ────────────────────────────────────────────────────────────

// Deterministic per-lead variation. Without this every synthesized profile
// inherits the sampleProfile's tier/seniority/location/etc. → dashboard
// charts collapse to one bar per card. `seed` is any integer (e.g.
// row index combined with run-hash) and produces consistent values across
// re-renders for the same seed.
export function varyProfile(seed: number): {
  professional: Partial<NonNullable<EnrichedProfile["professional"]>>;
  financial: Partial<NonNullable<EnrichedProfile["financial"]>>;
} {
  const s = Math.abs(seed | 0);
  const pick = <T>(arr: readonly T[], salt: number) => arr[(s * 9301 + salt) % arr.length];

  const TIERS = ["Tier 1", "Tier 1", "Tier 2", "Tier 2", "Tier 3", "Tier 4"] as const;
  const LOCATIONS = ["Metro", "Metro", "Metro", "Tier-2", "Tier-2", "Tier-3"] as const;
  const LEVELS = ["Senior", "Senior", "Mid", "Mid", "Exec", "Junior"] as const;
  const AGE_GROUPS = ["18-29", "30-39", "30-39", "30-39", "40-49", "50+"] as const;
  const UNIS = ["Tier 1", "Tier 1", "Tier 2", "Tier 2", "Tier 3", "Other"] as const;
  const INDUSTRIES = ["Fintech", "SaaS", "E-commerce", "Edtech", "Healthcare", "Other"] as const;
  const POTENTIAL = ["High", "Medium", "Medium", "Medium", "Low", "Low"] as const;

  const level = pick(LEVELS, 13);
  const ageGroup = pick(AGE_GROUPS, 29);
  const yoe =
    ageGroup === "18-29" ? 2 + ((s * 7) % 5)
    : ageGroup === "30-39" ? 6 + ((s * 11) % 8)
    : ageGroup === "40-49" ? 14 + ((s * 13) % 10)
    : 22 + ((s * 17) % 10);
  const creditScore = 540 + ((s * 23) % 290); // 540..829
  const creditLimit = Math.round(50_000 + ((s * 41) % 20) * 100_000); // 50k..2M
  const cards = (s * 31) % 7; // 0..6
  const cars = (s * 19) % 4;  // 0..3
  // Income band keyed off level + small jitter so seniority correlates with earnings.
  const incomeBase =
    level === "Exec" ? 30_00_000
    : level === "Senior" ? 15_00_000
    : level === "Mid" ? 8_00_000
    : 4_00_000;
  const jitter = ((s * 37) % 50) * 50_000; // 0..2.45M
  const lo = incomeBase + jitter;
  const hi = lo + (10_00_000 + ((s * 53) % 30) * 100_000);
  const homeLoan = (s * 47) % 3 === 0
    ? 0
    : Math.round(((s * 59) % 60) * 5_00_000); // 0..30M
  const finalScore = 25 + ((s * 67) % 70); // 25..94
  const potential =
    finalScore >= 75 ? "High"
    : finalScore >= 50 ? "Medium"
    : pick(POTENTIAL, 71);

  return {
    professional: {
      location_type: pick(LOCATIONS, 3),
      professional_level: level,
      age_group: ageGroup,
      years_of_experience: yoe,
      company_tier: pick(TIERS, 7),
      company_industry: pick(INDUSTRIES, 19),
      university_tier: pick(UNIS, 23),
      iit_iim: (s * 5) % 10 < 2,
      mba: (s * 11) % 10 < 3,
      engineer: (s * 13) % 10 < 7,
      employed: (s * 17) % 100 < 96,
    },
    financial: {
      credit_score: creditScore,
      credit_limit: creditLimit,
      total_credit_cards: cards,
      total_cars: cars,
      home_loan_amount: homeLoan,
      annual_earnings_inr_min: lo,
      annual_earnings_inr_max: hi,
      potential_tier: potential,
      final_score: finalScore,
    },
  };
}

export const sampleProfile: EnrichedProfile = {
  lead_id: "00Qe200000Sygly",
  enrichment_status: "Fully Enriched",
  finance_data: "Available",
  email_verification_status: "Valid",
  phone_verification_status: "Valid",
  valid_indian_name: true,
  professional: {
    name: "Arjun Mehta",
    linkedin: "https://linkedin.com/in/arjunmehta",
    profile_summary:
      "Senior software engineer with 11 years experience across fintech and consumer. IIT Delhi → Goldman Sachs → Razorpay → currently Staff Eng at PhonePe.",
    personality: "Analytical, pragmatic, growth-oriented",
    age: 34,
    age_group: "30-39",
    location: "Bangalore",
    location_type: "Metro",
    state: "Karnataka",
    city: "Bangalore",
    country: "India",
    employed: true,
    engineer: true,
    professional_level: "Senior",
    years_of_experience: 11,
    job_title: "Staff Software Engineer",
    company_name: "PhonePe",
    company_tier: "Tier 1",
    company_industry: "Fintech",
    university_tier: "Tier 1",
    iit_iim: true,
    mba: false,
    languages: ["English", "Hindi"],
  },
  financial: {
    credit_limit: 850000,
    credit_utilization: 0.18,
    credit_score: 812,
    total_credit_cards: 4,
    car_loan_amount: 0,
    total_cars: 1,
    home_loan_amount: 9500000,
    home_emi: 78000,
    total_home_loans: 1,
    estimated_yearly_earnings: 6500000,
    estimated_lifetime_earnings: 145000000,
    annual_earnings_inr_min: 6000000,
    annual_earnings_inr_max: 7500000,
    potential_tier: "High",
    final_score: 87,
  },
  contact: {
    name: "Arjun Mehta",
    email: "arjun.mehta@phonepe.com",
    phone: "+91 98765 43210",
    linkedin: "https://linkedin.com/in/arjunmehta",
  },
};

// ── CRM connection (mocked) ──────────────────────────────────────────────

export const mockCrmConnection: CrmConnection = {
  provider: "salesforce",
  accountName: "Revspot Demo Org",
  connectedAt: "2026-04-08T09:00:00Z",
  lastSyncedAt: "2026-05-23T11:54:00Z",
  status: "connected",
  mappedFieldCount: 14,
  writeBackPolicy: "fill_blanks",
};

// ── CRM activity seed (deterministic 14-day history) ─────────────────────
// Module-level deterministic generation so chart + table render identically
// on every load (no Math.random/Date.now at init).

export const CRM_NAMES_POOL: { name: string; email: string; phone: string; company: string; title: string }[] = [
  { name: "Aarav Sharma",   email: "aarav.sharma@infosys.com",   phone: "+91 98201 23456", company: "Infosys",       title: "Senior Manager" },
  { name: "Priya Iyer",     email: "priya.iyer@phonepe.com",     phone: "+91 99845 67890", company: "PhonePe",       title: "Product Lead" },
  { name: "Rohan Kapoor",   email: "rohan.kapoor@razorpay.com",  phone: "+91 98677 11223", company: "Razorpay",      title: "Engineering Manager" },
  { name: "Ananya Reddy",   email: "ananya.reddy@flipkart.com",  phone: "+91 99800 33445", company: "Flipkart",      title: "Director" },
  { name: "Vikram Singh",   email: "vikram.singh@swiggy.in",     phone: "+91 98765 55667", company: "Swiggy",        title: "VP Sales" },
  { name: "Neha Patel",     email: "neha.patel@zomato.com",      phone: "+91 99812 77889", company: "Zomato",        title: "Growth Lead" },
  { name: "Karthik Menon",  email: "karthik.m@cred.club",        phone: "+91 98300 99001", company: "CRED",          title: "Principal Engineer" },
  { name: "Divya Nair",     email: "divya.nair@meesho.com",      phone: "+91 99002 22334", company: "Meesho",        title: "Senior PM" },
  { name: "Arjun Bhatia",   email: "arjun.bhatia@paytm.com",     phone: "+91 98044 44556", company: "Paytm",         title: "AVP" },
  { name: "Sneha Joshi",    email: "sneha.joshi@oyo.com",        phone: "+91 99056 66778", company: "OYO",           title: "Marketing Director" },
  { name: "Rahul Verma",    email: "rahul.verma@byjus.com",      phone: "+91 98178 88990", company: "Byju's",        title: "Head of Sales" },
  { name: "Pooja Krishnan", email: "pooja.k@dream11.com",        phone: "+91 99109 11223", company: "Dream11",       title: "Senior Director" },
  { name: "Aditya Rao",     email: "aditya.rao@nykaa.com",       phone: "+91 98321 33445", company: "Nykaa",         title: "Group PM" },
  { name: "Ishita Gupta",   email: "ishita.g@unacademy.com",     phone: "+91 99432 55667", company: "Unacademy",     title: "VP Engineering" },
  { name: "Kunal Desai",    email: "kunal.desai@upgrad.com",     phone: "+91 98553 77889", company: "upGrad",        title: "CTO" },
  { name: "Meera Pillai",   email: "meera.pillai@licious.in",    phone: "+91 99564 99001", company: "Licious",       title: "Senior Director" },
  { name: "Sanjay Khanna",  email: "sanjay.k@policybazaar.com",  phone: "+91 98675 22334", company: "PolicyBazaar",  title: "Senior VP" },
  { name: "Ritu Agarwal",   email: "ritu.a@delhivery.com",       phone: "+91 99786 44556", company: "Delhivery",     title: "Head of Product" },
  { name: "Manish Tiwari",  email: "manish.t@bharatpe.com",      phone: "+91 98897 66778", company: "BharatPe",      title: "Director" },
  { name: "Tanvi Saxena",   email: "tanvi.s@zerodha.com",        phone: "+91 99908 88990", company: "Zerodha",       title: "Lead Analyst" },
];

const CRM_CHANNELS: CrmLeadChannel[] = ["Web form", "API", "Salesforce", "Chat", "Import"];
const CRM_PROVIDERS: CrmProvider[] = ["salesforce", "hubspot", "pipedrive"];

// "Today" anchor for seeded CRM runs. We derive it from the real current
// date (truncated to UTC midnight) so the demo always shows data ending today —
// otherwise the Today/7d windows in the chart go empty whenever the wall clock
// drifts past the hardcoded date.
function seedTodayMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function buildCrmRuns(): RunRecord[] {
  const today = seedTodayMs();
  const out: RunRecord[] = [];
  let runIdx = 0;

  // 3 years of history, day 0 = today, day 1094 = oldest. Volume tapers off
  // for older periods so the seed stays under ~5k records but the chart still
  // shows a believable activity curve at every granularity (day/week/month).
  const DAYS = 1095;
  for (let d = 0; d < DAYS; d++) {
    const dow = (today / 86400000 - d) % 7;
    const isWeekend = ((Math.round(dow) % 7) + 7) % 7 < 2;

    // Tiered density. Newest period = full volume, older periods thin out.
    //   0..30   → 8–20/day
    //   31..180 → 4–10/day
    //   181..365→ 3–8/day
    //   366..1095→ 1–5/day
    let dayCount: number;
    if (d <= 30) {
      dayCount = isWeekend ? 6 + (d % 3) : 12 + ((d * 5) % 9);
    } else if (d <= 180) {
      dayCount = isWeekend ? 3 + (d % 3) : 6 + ((d * 3) % 5);
    } else if (d <= 365) {
      dayCount = isWeekend ? 2 + (d % 2) : 4 + ((d * 2) % 5);
    } else {
      dayCount = isWeekend ? 1 + (d % 2) : 2 + (d % 4);
    }

    for (let i = 0; i < dayCount; i++) {
      const ts = today - d * 86400000 + (8 + i * 0.4) * 3600000; // 08:00 onwards, 24-min cadence
      const startedAt = new Date(ts).toISOString();
      const finishedAt = new Date(ts + 2400 + (i % 5) * 800).toISOString(); // 2.4–6s later

      const person = CRM_NAMES_POOL[(d * 7 + i) % CRM_NAMES_POOL.length];
      const channel = CRM_CHANNELS[(d * 3 + i) % CRM_CHANNELS.length];
      const provider = CRM_PROVIDERS[(d + i) % CRM_PROVIDERS.length];

      // Types: 50% pro-only, 25% fin-only, 25% both.
      const tBucket = (d * 11 + i * 3) % 4;
      const types: EnrichmentType[] =
        tBucket === 0 ? ["financial"] :
        tBucket === 3 ? ["professional", "financial"] :
        ["professional"];

      // Outcome buckets, calibrated to ~65% enriched SLA, near-zero system failures:
      //   0..62  → fully enriched   (63%)
      //   63..69 → partial enriched (7%)   → still counts as "enriched" in KPI
      //   70..98 → zero enrichment  (29%) → status=done, no public data found
      //   99     → failed           (1%)  → system-side failure, target is zero
      const oBucket = (d * 17 + i * 5) % 100;
      const failed = oBucket === 99;
      const zeroEnrichment = !failed && oBucket >= 70;
      const partial = !failed && !zeroEnrichment && oBucket >= 63;

      const wantsPro = types.includes("professional");
      const wantsFin = types.includes("financial");
      const gotPro = !failed && !zeroEnrichment && wantsPro && !(partial && (i % 2 === 0));
      const gotFin = !failed && !zeroEnrichment && wantsFin && !(partial && (i % 2 === 1));

      const profile: EnrichedProfile | undefined = failed ? undefined : {
        lead_id: `${provider.slice(0, 2).toUpperCase()}-${100000 + runIdx}`,
        enrichment_status: zeroEnrichment ? "Zero Enrichment" : partial ? "Partial Enrichment" : "Fully Enriched",
        finance_data: gotFin ? "Available" : "Not Available",
        email_verification_status: "Valid",
        phone_verification_status: i % 9 === 0 ? "Unverified" : "Valid",
        valid_indian_name: true,
        contact: {
          name: person.name,
          email: person.email,
          phone: person.phone,
        },
        professional: gotPro ? {
          ...sampleProfile.professional,
          ...varyProfile(d * 10000 + runIdx).professional,
          name: person.name,
          job_title: person.title,
          company_name: person.company,
        } : undefined,
        financial: gotFin
          ? { ...sampleProfile.financial, ...varyProfile(d * 10000 + runIdx).financial }
          : undefined,
      };

      const perLead = types.reduce((s, t) => s + CREDITS_PER_LEAD[t], 0);
      const success = failed ? 0 : 1;
      const fail = failed ? 1 : 0;
      const recordId = `00Q${(2_000_000 + runIdx).toString(36).toUpperCase().padStart(10, "0")}`;

      out.push({
        id: `crm-${d}-${i}`,
        source: "crm",
        types,
        status: failed ? "failed" : "done",
        leadsTotal: 1,
        leadsSuccess: success,
        leadsFailed: fail,
        leadsSkipped: 0,
        creditsBlocked: perLead,
        creditsCharged: failed ? 0 : perLead,
        creditsRefunded: failed ? perLead : 0,
        startedAt,
        finishedAt,
        errorCode: failed ? "PROVIDER_NO_MATCH" : undefined,
        errorMessage: failed ? "No matching record found for the supplied identifiers." : undefined,
        profile,
        crmOrigin: {
          provider,
          objectType: "Lead",
          recordId,
          recordUrl: `https://app.${provider}.com/lightning/r/Lead/${recordId}/view`,
          channel,
        },
        crmSync: failed
          ? { status: "not_pushed" }
          : { status: "synced", syncedAt: new Date(ts + 8000).toISOString(), pushedRecords: 1 },
      });
      runIdx++;
    }
  }
  // Newest first to match the rest of the runs array convention.
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

const crmRuns = buildCrmRuns();

// Generate a sample slice of enriched lead profiles for a bulk run. Caps at
// 50, drawer doesn't need every row, just enough to feel real.
function buildBulkLeads(
  successCount: number,
  failedCount: number,
  types: EnrichmentType[],
  seed: number,
): EnrichedProfile[] {
  const total = Math.min(successCount + failedCount, 50);
  const out: EnrichedProfile[] = [];
  for (let i = 0; i < total; i++) {
    const person = CRM_NAMES_POOL[(seed * 7 + i) % CRM_NAMES_POOL.length];
    const isFailed = i >= successCount;
    const oBucket = (seed * 17 + i * 5) % 100;
    const zero    = !isFailed && oBucket >= 80;
    const partial = !isFailed && !zero && oBucket >= 70;
    const wantsPro = types.includes("professional");
    const wantsFin = types.includes("financial");
    const gotPro = !isFailed && !zero && wantsPro && !(partial && i % 2 === 0);
    const gotFin = !isFailed && !zero && wantsFin && !(partial && i % 2 === 1);
    out.push({
      lead_id: `BLK-${seed}RUN${seed}-${String(i).padStart(4, "0")}`,
      enrichment_status: isFailed
        ? "Zero Enrichment"
        : zero
          ? "Zero Enrichment"
          : partial
            ? "Partial Enrichment"
            : "Fully Enriched",
      finance_data: gotFin ? "Available" : "Not Available",
      email_verification_status: i % 11 === 0 ? "Unverified" : "Valid",
      phone_verification_status: i % 9 === 0 ? "Unverified" : "Valid",
      valid_indian_name: true,
      contact: {
        name: person.name,
        email: person.email,
        phone: person.phone,
      },
      professional: gotPro ? {
        ...sampleProfile.professional,
        ...varyProfile(seed * 100 + i).professional,
        name: person.name,
        job_title: person.title,
        company_name: person.company,
      } : undefined,
      financial: gotFin
        ? { ...sampleProfile.financial, ...varyProfile(seed * 100 + i).financial }
        : undefined,
    });
  }
  return out;
}

const mockRuns: RunRecord[] = [
  {
    id: "run-0",
    source: "bulk",
    filename: "prestige-tech-park-may.csv",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 640,
    leadsSuccess: 512,
    leadsFailed: 108,
    leadsSkipped: 20,
    creditsBlocked: 1280,
    creditsCharged: 1024,
    creditsRefunded: 256,
    startedAt: "2026-05-27T09:30:00Z",
    finishedAt: "2026-05-27T11:05:00Z",
    leads: buildBulkLeads(512, 108, ["professional", "financial"], 7),
  },
  {
    id: "run-1",
    source: "bulk",
    filename: "godrej-whitefield-leads.csv",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 1000,
    leadsSuccess: 782,
    leadsFailed: 198,
    leadsSkipped: 20,
    creditsBlocked: 2000,
    creditsCharged: 1564,
    creditsRefunded: 436,
    startedAt: "2026-05-22T08:14:00Z",
    finishedAt: "2026-05-22T10:42:00Z",
    leads: buildBulkLeads(782, 198, ["professional", "financial"], 1),
  },
  {
    id: "run-2",
    source: "bulk",
    filename: "assetz-sarjapur-q2.xlsx",
    types: ["professional"],
    status: "in_progress",
    progressPct: 47,
    leadsTotal: 2400,
    leadsSuccess: 0,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 2400,
    creditsCharged: 0,
    creditsRefunded: 0,
    startedAt: "2026-05-22T11:20:00Z",
    leads: buildBulkLeads(20, 0, ["professional"], 2),
  },
  {
    id: "run-3",
    source: "single",
    inputValue: "arjun.mehta@phonepe.com",
    types: ["professional", "financial"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 1,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 2,
    creditsCharged: 2,
    creditsRefunded: 0,
    startedAt: "2026-05-22T07:02:00Z",
    finishedAt: "2026-05-22T07:02:08Z",
    profile: sampleProfile,
  },
  {
    id: "run-4",
    source: "bulk",
    filename: "chefworks-hni-mar.csv",
    types: ["financial"],
    status: "failed",
    leadsTotal: 540,
    leadsSuccess: 0,
    leadsFailed: 540,
    leadsSkipped: 0,
    creditsBlocked: 540,
    creditsCharged: 0,
    creditsRefunded: 540,
    startedAt: "2026-05-21T16:00:00Z",
    finishedAt: "2026-05-21T16:08:00Z",
    errorCode: "PROVIDER_TIMEOUT",
    errorMessage: "Financial enrichment provider timed out after 3 retries.",
  },
  {
    id: "run-5",
    source: "single",
    inputValue: "+91 9876543210",
    types: ["professional"],
    status: "done",
    leadsTotal: 1,
    leadsSuccess: 1,
    leadsFailed: 0,
    leadsSkipped: 0,
    creditsBlocked: 1,
    creditsCharged: 1,
    creditsRefunded: 0,
    startedAt: "2026-05-20T14:23:00Z",
    finishedAt: "2026-05-20T14:23:04Z",
    profile: { ...sampleProfile, financial: undefined },
  },
];

// ── Sample CSV files (download links) ────────────────────────────────────

// Picks the right static sample file based on enrichment types.
// Files live under public/sample-csvs/, ~50 demo leads each so an uploaded
// run shows real chart variation across tiers / industries / income bands.

export function sampleCsvFilename(types: EnrichmentType[]): string {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (hasPro && hasFin) return "enrichment-sample-pro-fin.csv";
  if (hasFin) return "enrichment-sample-financial.csv";
  return "enrichment-sample-professional.csv";
}

export function sampleCsvDataUrl(types: EnrichmentType[]): string {
  return `/sample-csvs/${sampleCsvFilename(types)}`;
}

// ── Validation: which types are runnable given inputs available ──────────

export function runnableTypes(
  selected: EnrichmentType[],
  available: Set<RequiredField>,
): { runnable: EnrichmentType[]; skipped: { type: EnrichmentType; missing: RequiredField[] }[] } {
  const runnable: EnrichmentType[] = [];
  const skipped: { type: EnrichmentType; missing: RequiredField[] }[] = [];

  for (const t of selected) {
    if (t === "professional") {
      // Any one of email / phone / linkedin
      if (available.has("email") || available.has("phone") || available.has("linkedin")) {
        runnable.push("professional");
      } else {
        skipped.push({ type: "professional", missing: ["email", "phone", "linkedin"] });
      }
    } else if (t === "financial") {
      // Phone + Name required (name derivable from email/linkedin downstream, but phone always required)
      const missing: RequiredField[] = [];
      if (!available.has("phone")) missing.push("phone");
      // Name can be derived if email or linkedin present
      const nameDerivable = available.has("name") || available.has("email") || available.has("linkedin");
      if (!nameDerivable) missing.push("name");
      if (missing.length === 0) runnable.push("financial");
      else skipped.push({ type: "financial", missing });
    }
  }
  return { runnable, skipped };
}

// ── Auto-detect CSV column → required field mapping ──────────────────────

const FIELD_HINTS: Record<RequiredField, string[]> = {
  email: ["email", "e-mail", "mail", "email_address", "emailaddress"],
  phone: ["phone", "phone_number", "mobile", "contact", "phone_no", "mobileno", "tel"],
  linkedin: ["linkedin", "linkedin_url", "li_url", "li", "profile_url", "linkedinprofile"],
  name: ["name", "full_name", "fullname", "first_name", "lead_name", "contact_name"],
};

export function autoDetectMapping(headers: string[]): Record<RequiredField, string | null> {
  const lower = headers.map((h) => ({ original: h, norm: h.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  const out: Record<RequiredField, string | null> = { email: null, phone: null, linkedin: null, name: null };
  for (const field of ["email", "phone", "linkedin", "name"] as RequiredField[]) {
    const hints = FIELD_HINTS[field].map((h) => h.replace(/[^a-z0-9]/g, ""));
    const hit = lower.find(({ norm }) => hints.some((h) => norm === h || norm.includes(h)));
    if (hit) out[field] = hit.original;
  }
  return out;
}

// ── Store ─────────────────────────────────────────────────────────────────

interface EnrichmentStore {
  runs: RunRecord[];
  balance: number;
  unseenCompletions: number;   // for sidebar badge
  crmConnection: CrmConnection;
  addRun: (run: RunRecord) => void;
  markCompletionsSeen: () => void;
  setRuns: (runs: RunRecord[]) => void;
  tickProgress: () => void;    // advances any in_progress bulk runs; flips to "done" at 100%
  pushRunToCrm: (runId: string) => void; // mock 1.8s push; updates crmSync
}

export const useEnrichmentCrmStore = create<EnrichmentStore>((set, get) => ({
  // Seed = manual bulk/single runs + 14 days of CRM-sourced runs.
  runs: [...mockRuns, ...crmRuns],
  balance: 12480,
  unseenCompletions: 1,        // one new completion since last visit (for demo)
  crmConnection: mockCrmConnection,
  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  markCompletionsSeen: () => set({ unseenCompletions: 0 }),
  setRuns: (runs) => set({ runs }),
  pushRunToCrm: (runId) => {
    // Optimistic: mark pending, then settle after ~1.8s with 95% success.
    set((s) => ({
      runs: s.runs.map((r) =>
        r.id === runId
          ? { ...r, crmSync: { ...(r.crmSync ?? { status: "not_pushed" }), status: "pending" } }
          : r,
      ),
    }));
    window.setTimeout(() => {
      const run = get().runs.find((r) => r.id === runId);
      if (!run) return;
      const totalToPush = Math.max(1, run.leadsSuccess);
      // Tiny deterministic failure rate so the demo shows partial-push states sometimes.
      const failedRecords = run.id.charCodeAt(run.id.length - 1) % 20 === 0 ? Math.ceil(totalToPush * 0.05) : 0;
      const pushedRecords = totalToPush - failedRecords;
      set((s) => ({
        runs: s.runs.map((r) =>
          r.id === runId
            ? {
                ...r,
                crmSync: {
                  status: failedRecords > 0 && pushedRecords === 0 ? "failed" : "synced",
                  syncedAt: new Date().toISOString(),
                  pushedRecords,
                  failedRecords,
                  errorMessage: failedRecords > 0 ? `${failedRecords} record(s) rejected by CRM (duplicate or validation).` : undefined,
                },
              }
            : r,
        ),
      }));
      window.dispatchEvent(
        new CustomEvent("enrichment-crm:push-complete", { detail: { runId, pushedRecords, failedRecords } }),
      );
    }, 1800);
  },
  tickProgress: () =>
    set((s) => {
      let changed = false;
      const next = s.runs.map((r) => {
        if (r.status !== "in_progress") return r;
        const cur = r.progressPct ?? 0;
        // Bumps of 3–9% per tick, feels organic, not linear.
        const bump = 3 + Math.floor(Math.random() * 7);
        const np = Math.min(100, cur + bump);
        changed = true;
        if (np >= 100) {
          // Settle the run: 92% success, ~6% skipped, ~2% failed, realistic-ish.
          const total = r.leadsTotal ?? 0;
          const success = Math.round(total * 0.92);
          const skipped = Math.round(total * 0.06);
          const failed = Math.max(0, total - success - skipped);
          const perLead = r.types.reduce((sum, t) => sum + CREDITS_PER_LEAD[t], 0);
          const charged = (success + failed) * perLead;
          const refunded = Math.max(0, (r.creditsBlocked ?? 0) - charged);
          // Seed bulk leads on completion if not already present (for newly-uploaded runs).
          const leads = r.source === "bulk" && !r.leads
            ? buildBulkLeads(success, failed, r.types, Date.now() % 1000)
            : r.leads;
          return {
            ...r,
            status: "done" as RunStatus,
            progressPct: 100,
            leadsSuccess: success,
            leadsSkipped: skipped,
            leadsFailed: failed,
            creditsCharged: charged,
            creditsRefunded: refunded,
            finishedAt: new Date().toISOString(),
            leads,
          };
        }
        return { ...r, progressPct: np };
      });
      return changed ? { runs: next } : s;
    }),
}));

// ── Formatting helpers ───────────────────────────────────────────────────

export function formatCredits(n: number): string {
  return n.toLocaleString("en-IN");
}

export function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function successPct(run: RunRecord): number {
  if (run.leadsTotal === 0) return 0;
  return Math.round((run.leadsSuccess / run.leadsTotal) * 100);
}

export function typeLabel(types: EnrichmentType[]): string {
  if (types.length === 2) return "Both";
  if (types[0] === "professional") return "Professional";
  if (types[0] === "financial") return "Financial";
  return "—";
}

export function typeShortLabel(types: EnrichmentType[]): string {
  if (types.length === 2) return "Pro · Fin";
  if (types[0] === "professional") return "Pro";
  if (types[0] === "financial") return "Fin";
  return "—";
}
```

## `src/lib/dashboard/types.ts`

```tsx
// Shared types for the Enrichment dashboard.
//
// LeadProfile = flat record per enriched lead (one row per CRM hit / single
// lookup / bulk row). Lighter than the existing LeadRow in enriched-leads.tsx
// because the table needs presentation strings while the dashboard only
// needs the enrichment data + a few derived bucket fields.

import type { EnrichedProfile, RunRecord } from "@/lib/enrichment-crm-data";

export interface LeadProfile {
  /** Stable id: `${runId}::${index}` for bulk rows, `runId` for crm/single. */
  id: string;
  runId: string;
  source: RunRecord["source"];
  /** Lead-level outcome derived from (run.status, profile.enrichment_status). */
  status: LeadStatus;
  /** ISO timestamp (run.startedAt for crm/single, run.startedAt + i*1000 for bulk). */
  startedAt: string;
  /** Raw enriched data when available. */
  profile?: EnrichedProfile;
}

export type LeadStatus = "enriched" | "not_enriched" | "failed" | "running";

// ── Time range ────────────────────────────────────────────────────────────

export type TimeRange = "7d" | "14d" | "30d" | "90d" | "all" | "custom";

export interface RangeBounds {
  /** Inclusive lower bound (ms epoch). null = no lower bound. */
  startMs: number | null;
  /** Inclusive upper bound (ms epoch). null = no upper bound. */
  endMs: number | null;
}

// ── Filters ───────────────────────────────────────────────────────────────

export type FilterDim =
  | "source"
  | "location_type"
  | "seniority"
  | "company_tier"
  | "industry"
  | "annual_earnings"
  | "net_worth"
  | "potential_tier"
  | "age_group"
  | "employed"
  | "iit_iim"
  | "mba"
  // Expanded, enables richer chart builder.
  | "university_tier"
  | "engineer"
  | "years_of_experience"
  | "credit_score"
  | "credit_limit"
  | "total_credit_cards"
  | "total_cars"
  | "home_loan_amount"
  | "final_score";

export type FilterOp = "eq" | "in" | "gte" | "lte" | "between";

export interface FilterClause {
  dim: FilterDim;
  op: FilterOp;
  value: string | number | boolean | string[] | [number, number];
}

// ── Chart cards ───────────────────────────────────────────────────────────

/** Default presets that ship in every dashboard.
 *  `location`, `years_of_experience`, `company_tier` render in the top 3-up grid.
 *  `net_worth` and `salary_range` render in a dedicated 2-up financial row. */
export type ChartCardId =
  | "location"
  | "years_of_experience"
  | "company_tier"
  | "age_group"
  | "net_worth"
  | "salary_range";

/** Top 3-up grid of demographic charts. */
export const DEFAULT_CHART_CARDS: ChartCardId[] = [
  "location",
  "years_of_experience",
  "company_tier",
];

/** Wide single-card row beneath the 3-up demographics. Renders as a
 *  horizontal bar — visually distinct from the donut + column above. */
export const DEMOGRAPHIC_EXTRA_CARDS: ChartCardId[] = ["age_group"];

/** Financial 2-up row, rendered as a separate band beneath the defaults. */
export const FINANCIAL_CHART_CARDS: ChartCardId[] = ["net_worth", "salary_range"];

/** User-built chart card, pick any dim, scope with filters, give it a name. */
export interface CustomChartCard {
  id: string;            // uuid
  name: string;          // user-supplied title
  dim: FilterDim;        // dimension to slice the bar chart by
  filters: FilterClause[]; // local filters applied before bucketing
  createdAt: string;
}

/** Card slot in the grid, either one of the 5 presets or a custom build. */
export type DashboardChart =
  | { kind: "default"; id: ChartCardId }
  | { kind: "custom"; card: CustomChartCard };

// ── Saved views (legacy, kept for storage migration) ─────────────────────

export interface SavedView {
  id: string;
  name: string;
  starred?: boolean;
  filters: FilterClause[];
  createdAt: string;
}

// ── Breakdown output ──────────────────────────────────────────────────────

export interface BreakdownRow {
  bucket: string;
  count: number;
  pct: number;
}
```

## `src/lib/dashboard/dim-registry.ts`

```tsx
// Single source of truth for every filter/breakdown dimension.
// One entry = one dim. Each dim knows:
//   - its display label
//   - how to extract a bucket from a LeadProfile (for breakdowns)
//   - its filterable value type (enum / range / bool)
//   - the enum value list (where applicable) for the AddFilterMenu

import type { FilterDim, ChartCardId, LeadProfile } from "./types";

export type DimType = "enum" | "range_money" | "range_number" | "bool";
export type ChartKind = "donut" | "column" | "hbar";

export interface DimConfig {
  id: FilterDim;
  label: string;
  type: DimType;
  /** Top-level grouping in the chart-builder slice-picker. */
  group: "Professional" | "Financial" | "Meta";
  /** Preferred visualization. Donut for nominal/categorical splits,
   *  column for ordinal or range-bucketed values. Defaults to "column". */
  chartKind?: ChartKind;
  /** Enum/range dims: ordered list of bucket labels for breakdowns + filter menu. */
  values?: string[];
  /** Extracts the bucket value from a profile. Returns null when missing. */
  bucket: (p: LeadProfile) => string | null;
  /** Returns numeric value used by range filters. */
  numeric?: (p: LeadProfile) => number | null;
  /** Returns boolean for bool filters. */
  boolean?: (p: LeadProfile) => boolean | null;
  /** Units suffix for range inputs (₹ / yrs / pts / cards / cars). */
  unitHint?: string;
  /** Multiplier applied to user-typed range values before evaluation. E.g.
   *  money dims stored in raw rupees but typed in lakhs use inputScale=100_000. */
  inputScale?: number;
}

// ── Bucketers ────────────────────────────────────────────────────────────

function seniorityBucket(level?: string | null): string | null {
  if (!level) return null;
  const l = level.toLowerCase();
  if (/(exec|c-?level|chief|founder|cto|ceo|cfo|coo|vp|head)/.test(l)) return "Exec";
  if (/(senior|staff|principal|lead|director|manager)/.test(l)) return "Senior";
  if (/(mid|associate|engineer ii|engineer iii)/.test(l)) return "Mid";
  if (/(junior|entry|analyst|intern|graduate)/.test(l)) return "Junior";
  return "Mid";
}

function avgEarnings(p: LeadProfile): number | null {
  const f = p.profile?.financial;
  if (!f) return null;
  const lo = f.annual_earnings_inr_min;
  const hi = f.annual_earnings_inr_max;
  if (typeof lo === "number" && typeof hi === "number") return (lo + hi) / 2;
  if (typeof hi === "number") return hi;
  if (typeof lo === "number") return lo;
  return null;
}

// Salary range, in lakhs INR.
export function incomeBucket(p: LeadProfile): string | null {
  const v = avgEarnings(p);
  if (v == null) return null;
  if (v < 500_000) return "1-5 L";
  if (v < 1_000_000) return "5-10 L";
  if (v < 2_000_000) return "10-20 L";
  if (v < 3_000_000) return "20-30 L";
  if (v < 5_000_000) return "30-50 L";
  if (v < 10_000_000) return "50L - 1Cr";
  return "1Cr+";
}

export const INCOME_BUCKETS = ["1-5 L", "5-10 L", "10-20 L", "20-30 L", "30-50 L", "50L - 1Cr", "1Cr+"];

// Net worth. Mock data has no net-worth field, derive a synthetic from salary
// (avg annual earnings × 5) so the demo chart is plausible without inventing
// a whole new column. Real backend would replace this with a stored value.
const NET_WORTH_BUCKETS = ["0-50 L", "50L - 1Cr", "1-2 Cr", "2-5 Cr", "5 Cr+"];
function netWorthValue(p: LeadProfile): number | null {
  const v = avgEarnings(p);
  return v == null ? null : v * 5;
}
function netWorthBucket(p: LeadProfile): string | null {
  const v = netWorthValue(p);
  if (v == null) return null;
  if (v < 5_000_000) return "0-50 L";
  if (v < 10_000_000) return "50L - 1Cr";
  if (v < 20_000_000) return "1-2 Cr";
  if (v < 50_000_000) return "2-5 Cr";
  return "5 Cr+";
}

// Generic range bucketer, exclusive upper, last bucket catches the rest.
// Returns null when the underlying value is missing, so breakdownByDim
// skips the lead instead of producing an "Unknown" bucket.
function bucketRange(
  v: number | null | undefined,
  steps: { upTo: number; label: string }[],
  topLabel: string,
): string | null {
  if (v == null) return null;
  for (const s of steps) if (v < s.upTo) return s.label;
  return topLabel;
}

const YOE_BUCKETS = ["0-2 years", "3-5 years", "6-10 years", "11-20 years", "20+ years"];
function yoeBucket(p: LeadProfile): string | null {
  return bucketRange(
    p.profile?.professional?.years_of_experience,
    [
      { upTo: 3, label: "0-2 years" },
      { upTo: 6, label: "3-5 years" },
      { upTo: 11, label: "6-10 years" },
      { upTo: 21, label: "11-20 years" },
    ],
    "20+ years",
  );
}

const CREDIT_BUCKETS = ["< 600", "600-699", "700-749", "750-799", "800+"];
function creditScoreBucket(p: LeadProfile): string | null {
  return bucketRange(
    p.profile?.financial?.credit_score,
    [
      { upTo: 600, label: "< 600" },
      { upTo: 700, label: "600-699" },
      { upTo: 750, label: "700-749" },
      { upTo: 800, label: "750-799" },
    ],
    "800+",
  );
}

const CREDIT_LIMIT_BUCKETS = ["< 1L", "1L - 5L", "5L - 10L", "10L+"];
function creditLimitBucket(p: LeadProfile): string | null {
  return bucketRange(
    p.profile?.financial?.credit_limit,
    [
      { upTo: 100_000, label: "< 1L" },
      { upTo: 500_000, label: "1L - 5L" },
      { upTo: 1_000_000, label: "5L - 10L" },
    ],
    "10L+",
  );
}

const CARD_COUNT_BUCKETS = ["0", "1", "2-3", "4-5", "6+"];
function cardCountBucket(p: LeadProfile): string | null {
  return bucketRange(
    p.profile?.financial?.total_credit_cards,
    [
      { upTo: 1, label: "0" },
      { upTo: 2, label: "1" },
      { upTo: 4, label: "2-3" },
      { upTo: 6, label: "4-5" },
    ],
    "6+",
  );
}

const CAR_BUCKETS = ["0", "1", "2", "3+"];
function carBucket(p: LeadProfile): string | null {
  return bucketRange(
    p.profile?.financial?.total_cars,
    [
      { upTo: 1, label: "0" },
      { upTo: 2, label: "1" },
      { upTo: 3, label: "2" },
    ],
    "3+",
  );
}

const HOME_LOAN_BUCKETS = ["None", "< 25L", "25L - 75L", "75L - 1.5Cr", "1.5Cr+"];
function homeLoanBucket(p: LeadProfile): string | null {
  const v = p.profile?.financial?.home_loan_amount;
  if (v == null) return null;
  if (v === 0) return "None";
  if (v < 2_500_000) return "< 25L";
  if (v < 7_500_000) return "25L - 75L";
  if (v < 15_000_000) return "75L - 1.5Cr";
  return "1.5Cr+";
}

const SCORE_BUCKETS = ["0-25", "25-50", "50-75", "75-100"];
function finalScoreBucket(p: LeadProfile): string | null {
  return bucketRange(
    p.profile?.financial?.final_score,
    [
      { upTo: 25, label: "0-25" },
      { upTo: 50, label: "25-50" },
      { upTo: 75, label: "50-75" },
    ],
    "75-100",
  );
}

// ── Registry ─────────────────────────────────────────────────────────────

export const DIM_REGISTRY: Record<FilterDim, DimConfig> = {
  source: {
    id: "source",
    label: "Source",
    type: "enum",
    group: "Meta",
    chartKind: "donut",
    values: ["CRM", "Bulk", "Single"],
    bucket: (p) => (p.source === "crm" ? "CRM" : p.source === "bulk" ? "Bulk" : "Single"),
  },
  location_type: {
    id: "location_type",
    label: "Location",
    type: "enum",
    group: "Professional",
    chartKind: "donut",
    values: ["Metro", "Tier-2", "Tier-3"],
    bucket: (p) => p.profile?.professional?.location_type ?? null,
  },
  seniority: {
    id: "seniority",
    label: "Seniority",
    type: "enum",
    group: "Professional",
    values: ["Exec", "Senior", "Mid", "Junior"],
    bucket: (p) => seniorityBucket(p.profile?.professional?.professional_level),
  },
  company_tier: {
    id: "company_tier",
    label: "Company tier",
    type: "enum",
    group: "Professional",
    chartKind: "donut",
    values: ["Tier 1", "Tier 2", "Tier 3", "Tier 4"],
    bucket: (p) => p.profile?.professional?.company_tier ?? null,
  },
  industry: {
    id: "industry",
    label: "Industry",
    type: "enum",
    group: "Professional",
    chartKind: "donut",
    values: ["Fintech", "SaaS", "E-commerce", "Edtech", "Healthcare", "Other"],
    bucket: (p) => p.profile?.professional?.company_industry ?? null,
  },
  university_tier: {
    id: "university_tier",
    label: "University tier",
    type: "enum",
    group: "Professional",
    chartKind: "donut",
    values: ["Tier 1", "Tier 2", "Tier 3", "Other"],
    bucket: (p) => p.profile?.professional?.university_tier ?? null,
  },
  age_group: {
    id: "age_group",
    label: "Age",
    type: "enum",
    group: "Professional",
    chartKind: "hbar",
    values: ["18-29", "30-39", "40-49", "50+"],
    bucket: (p) => p.profile?.professional?.age_group ?? null,
  },
  years_of_experience: {
    id: "years_of_experience",
    label: "Years of experience",
    type: "range_number",
    group: "Professional",
    values: YOE_BUCKETS,
    bucket: yoeBucket,
    numeric: (p) => p.profile?.professional?.years_of_experience ?? null,
    unitHint: "yrs",
  },
  employed: {
    id: "employed",
    label: "Employed",
    type: "bool",
    group: "Professional",
    chartKind: "donut",
    bucket: (p) =>
      p.profile?.professional?.employed == null
        ? null
        : p.profile.professional.employed
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.employed ?? null,
  },
  engineer: {
    id: "engineer",
    label: "Engineer",
    type: "bool",
    group: "Professional",
    chartKind: "donut",
    bucket: (p) =>
      p.profile?.professional?.engineer == null
        ? null
        : p.profile.professional.engineer
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.engineer ?? null,
  },
  iit_iim: {
    id: "iit_iim",
    label: "IIT / IIM",
    type: "bool",
    group: "Professional",
    chartKind: "donut",
    bucket: (p) =>
      p.profile?.professional?.iit_iim == null
        ? null
        : p.profile.professional.iit_iim
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.iit_iim ?? null,
  },
  mba: {
    id: "mba",
    label: "MBA",
    type: "bool",
    group: "Professional",
    chartKind: "donut",
    bucket: (p) =>
      p.profile?.professional?.mba == null
        ? null
        : p.profile.professional.mba
        ? "Yes"
        : "No",
    boolean: (p) => p.profile?.professional?.mba ?? null,
  },
  annual_earnings: {
    id: "annual_earnings",
    label: "Salary range (₹L)",
    type: "range_money",
    group: "Financial",
    values: INCOME_BUCKETS,
    bucket: incomeBucket,
    numeric: avgEarnings,
    unitHint: "L",
    inputScale: 100_000,
  },
  net_worth: {
    id: "net_worth",
    label: "Net worth",
    type: "range_money",
    group: "Financial",
    chartKind: "donut",
    values: NET_WORTH_BUCKETS,
    bucket: netWorthBucket,
    numeric: netWorthValue,
    unitHint: "L",
    inputScale: 100_000,
  },
  potential_tier: {
    id: "potential_tier",
    label: "Potential tier",
    type: "enum",
    group: "Financial",
    chartKind: "donut",
    values: ["High", "Medium", "Low"],
    bucket: (p) => p.profile?.financial?.potential_tier ?? null,
  },
  credit_score: {
    id: "credit_score",
    label: "Credit score",
    type: "range_number",
    group: "Financial",
    values: CREDIT_BUCKETS,
    bucket: creditScoreBucket,
    numeric: (p) => p.profile?.financial?.credit_score ?? null,
    unitHint: "pts",
  },
  credit_limit: {
    id: "credit_limit",
    label: "Credit limit",
    type: "range_money",
    group: "Financial",
    values: CREDIT_LIMIT_BUCKETS,
    bucket: creditLimitBucket,
    numeric: (p) => p.profile?.financial?.credit_limit ?? null,
    unitHint: "L",
    inputScale: 100_000,
  },
  total_credit_cards: {
    id: "total_credit_cards",
    label: "Credit cards",
    type: "range_number",
    group: "Financial",
    values: CARD_COUNT_BUCKETS,
    bucket: cardCountBucket,
    numeric: (p) => p.profile?.financial?.total_credit_cards ?? null,
    unitHint: "cards",
  },
  total_cars: {
    id: "total_cars",
    label: "Cars owned",
    type: "range_number",
    group: "Financial",
    values: CAR_BUCKETS,
    bucket: carBucket,
    numeric: (p) => p.profile?.financial?.total_cars ?? null,
    unitHint: "cars",
  },
  home_loan_amount: {
    id: "home_loan_amount",
    label: "Home loan",
    type: "range_money",
    group: "Financial",
    values: HOME_LOAN_BUCKETS,
    bucket: homeLoanBucket,
    numeric: (p) => p.profile?.financial?.home_loan_amount ?? null,
    unitHint: "L",
    inputScale: 100_000,
  },
  final_score: {
    id: "final_score",
    label: "Final score",
    type: "range_number",
    group: "Financial",
    values: SCORE_BUCKETS,
    bucket: finalScoreBucket,
    numeric: (p) => p.profile?.financial?.final_score ?? null,
    unitHint: "pts",
  },
};

/** Default preset cards mapped to a dim. */
export const CHART_CARD_TO_DIM: Record<ChartCardId, FilterDim> = {
  location: "location_type",
  years_of_experience: "years_of_experience",
  company_tier: "company_tier",
  age_group: "age_group",
  net_worth: "net_worth",
  salary_range: "annual_earnings",
};

export const CHART_CARD_LABEL: Record<ChartCardId, string> = {
  location: "Location",
  years_of_experience: "Years of experience",
  company_tier: "Company tier",
  age_group: "Age",
  net_worth: "Net worth",
  salary_range: "Salary range (₹L)",
};

/** Group dims for the chart-builder slice picker. */
export function groupedDims(): Record<DimConfig["group"], DimConfig[]> {
  const out: Record<DimConfig["group"], DimConfig[]> = {
    Professional: [],
    Financial: [],
    Meta: [],
  };
  for (const d of Object.values(DIM_REGISTRY)) out[d.group].push(d);
  return out;
}
```

## `src/lib/dashboard/breakdown.ts`

```tsx
// Group profiles by a dimension's bucket. Returns sorted rows with counts +
// percentages relative to the input set (NOT all leads, already-filtered).

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

/** Default preset cards still address by ChartCardId, thin wrapper. */
export function breakdownByCard(
  profiles: LeadProfile[],
  cardId: ChartCardId,
): BreakdownRow[] {
  return breakdownByDim(profiles, CHART_CARD_TO_DIM[cardId]);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
```

## `src/lib/dashboard/filter-eval.ts`

```tsx
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
```

## `src/lib/dashboard/flatten-leads.ts`

```tsx
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
```

## `src/lib/dashboard/trend-bucketing.ts`

```tsx
// Resolve a TimeRange to absolute (startMs, endMs) bounds + pick daily vs
// weekly bucketing for the trend chart.

import type { RangeBounds, TimeRange } from "./types";

export function resolveRange(
  range: TimeRange,
  customStart: Date | null,
  customEnd: Date | null,
  now: number = Date.now(),
): RangeBounds {
  if (range === "all") return { startMs: null, endMs: null };
  if (range === "custom") {
    const s = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : null;
    const e = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : null;
    return { startMs: s, endMs: e };
  }
  const days = range === "7d" ? 7 : range === "14d" ? 14 : range === "30d" ? 30 : 90;
  return { startMs: now - days * 86_400_000, endMs: now };
}

export type Bucketing = "daily" | "weekly";

export function pickBucketing(range: TimeRange, bounds: RangeBounds): Bucketing {
  if (range === "7d" || range === "14d" || range === "30d") return "daily";
  if (range === "90d") return "weekly";
  // all + custom: span-based
  if (bounds.startMs != null && bounds.endMs != null) {
    const days = (bounds.endMs - bounds.startMs) / 86_400_000;
    return days >= 90 ? "weekly" : "daily";
  }
  return "weekly";
}

/** Returns the bucket key (YYYY-MM-DD) a timestamp falls into, given a
 *  daily/weekly bucketing scheme. Week buckets start Monday. */
export function bucketKey(ms: number, mode: Bucketing): string {
  const d = new Date(ms);
  if (mode === "daily") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // Move back to Monday of the week.
  const dow = (d.getDay() + 6) % 7; // 0 = Mon
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  return `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
```

## `src/lib/dashboard/dashboard-storage.ts`

```tsx
// Versioned localStorage I/O for the dashboard. Persists the user's grid
// configuration: which preset cards are active, plus any custom-built cards.
// Range / source / page filters are NOT persisted, they reset per load.

import {
  DEFAULT_CHART_CARDS,
  type ChartCardId,
  type CustomChartCard,
} from "./types";

const STORAGE_KEY = "revspot.dashboard.v3";
const LEGACY_KEY = "revspot.dashboard.v1";

interface Persisted {
  v: 3;
  defaultCards: ChartCardId[];
  customCards: CustomChartCard[];
}

interface LegacyPersisted {
  v: 1;
  savedViews?: unknown;
  chartCards?: string[];
}

export interface DashboardPersistedState {
  defaultCards: ChartCardId[];
  customCards: CustomChartCard[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function fresh(): DashboardPersistedState {
  return { defaultCards: [...DEFAULT_CHART_CARDS], customCards: [] };
}

export function loadDashboardState(): DashboardPersistedState {
  if (!isBrowser()) return fresh();
  try {
    // v3 first.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Persisted = JSON.parse(raw);
      if (parsed.v === 3) {
        const defaults = Array.isArray(parsed.defaultCards)
          ? (parsed.defaultCards.filter((c) =>
              (DEFAULT_CHART_CARDS as string[]).includes(c),
            ) as ChartCardId[])
          : [...DEFAULT_CHART_CARDS];
        return {
          defaultCards: defaults.length > 0 ? defaults : [...DEFAULT_CHART_CARDS],
          customCards: Array.isArray(parsed.customCards) ? parsed.customCards : [],
        };
      }
    }
    // Legacy v1 migration, drop savedViews + any non-default chartCard ids
    // (the new model only retains the 5 presets as defaults).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed: LegacyPersisted = JSON.parse(legacy);
      if (parsed.v === 1) {
        const defaults = Array.isArray(parsed.chartCards)
          ? (parsed.chartCards.filter((c) =>
              (DEFAULT_CHART_CARDS as string[]).includes(c),
            ) as ChartCardId[])
          : [...DEFAULT_CHART_CARDS];
        return {
          defaultCards: defaults.length > 0 ? defaults : [...DEFAULT_CHART_CARDS],
          customCards: [],
        };
      }
    }
    return fresh();
  } catch {
    return fresh();
  }
}

export function saveDashboardState(state: DashboardPersistedState): void {
  if (!isBrowser()) return;
  try {
    const payload: Persisted = { v: 3, ...state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or disabled, silently ignore. Dashboard still works in-session.
  }
}

export function newCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
```

## `src/components/data/data-page-shell.tsx`

```tsx
"use client";

// Shared shell for every top-level Tools module page (Enrichment, Contact
// extraction, ...). Owns:
//   - page header with breadcrumb (Tools / [Module] / [section])
//   - run drawer state
//   - composer toast + open-run bridge
//
// Each child page just renders its content via {children}. Pass `rootLabel` +
// `rootHref` so the breadcrumb's first link points back to the module base
// (e.g. "Enrichment" → "/enrichment"). Defaults stay on "Data" / "/data" for
// any caller we haven't migrated yet.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, X } from "lucide-react";

import { useEnrichmentCrmStore, type RunRecord } from "@/lib/enrichment-crm-data";
import { RunDrawer } from "@/components/enrichment-crm/run-drawer";
import { CrmConnectModal } from "@/components/enrichment-crm/crm-connect-modal";

interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

interface ShellProps {
  variant: "connected" | "empty";
  title: string;
  description: ReactNode;
  /** @deprecated breadcrumbs removed, prop kept for back-compat, ignored. */
  breadcrumb?: string;
  /** @deprecated breadcrumbs removed, prop kept for back-compat, ignored. */
  breadcrumbTrail?: BreadcrumbCrumb[];
  /** Optional back-arrow href shown left of the title. */
  backHref?: string;
  /** Optional element rendered top-right of the title row (e.g. a primary CTA). */
  headerAction?: ReactNode;
  /** @deprecated breadcrumbs removed. */
  rootLabel?: string;
  /** @deprecated breadcrumbs removed. */
  rootHref?: string;
  // Render-prop so children can dispatch into the shared run drawer and connect
  // flow without prop-drilling.
  children: (ctx: ShellChildCtx) => ReactNode;
}

export interface ShellChildCtx {
  openRun: (run: RunRecord) => void;
  openConnectFlow: () => void;
}

export function DataPageShell({
  variant: _variant,
  title,
  description,
  breadcrumb: _breadcrumb,
  breadcrumbTrail: _breadcrumbTrail,
  backHref,
  headerAction,
  rootLabel: _rootLabel,
  rootHref: _rootHref,
  children,
}: ShellProps) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const markCompletionsSeen = useEnrichmentCrmStore((s) => s.markCompletionsSeen);
  const tickProgress = useEnrichmentCrmStore((s) => s.tickProgress);
  const router = useRouter();

  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    markCompletionsSeen();
  }, [markCompletionsSeen]);

  useEffect(() => {
    const hasInFlight = runs.some((r) => r.status === "in_progress");
    if (!hasInFlight) return;
    const id = window.setInterval(() => tickProgress(), 900);
    return () => window.clearInterval(id);
  }, [runs, tickProgress]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<RawToastDetail>;
      const payload: ToastPayload = normalizeToast(ce.detail);
      setToast(payload);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 5200);
    };
    window.addEventListener("enrichment-crm:toast", handler);
    return () => {
      window.removeEventListener("enrichment-crm:toast", handler);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ runId?: string }>;
      const runId = ce.detail?.runId;
      if (!runId) return;
      const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
      if (run) setSelectedRun(run);
    };
    window.addEventListener("enrichment-crm:open-run", handler);
    return () => window.removeEventListener("enrichment-crm:open-run", handler);
  }, []);

  const openToastRun = (runId: string) => {
    const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
    if (run) setSelectedRun(run);
    setToast(null);
  };

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  // Open the support-handoff modal. Real product would launch the OAuth /
  // integrations flow; for the prototype we collect the request and reach
  // out from the support side.
  const openConnectFlow = () => setCrmModalOpen(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Back"
                className="inline-flex items-center justify-center h-8 w-8 -ml-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary/70 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
              </Link>
            )}
            <h1 className="text-page-title text-text-primary truncate">{title}</h1>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
        <p className="text-[12px] text-text-secondary mt-2 leading-snug truncate">
          {description}
        </p>
      </div>

      {/* Page content */}
      {children({
        openRun: (r) => setSelectedRun(r),
        openConnectFlow,
      })}

      {/* Shared drawer */}
      <RunDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        onBuildAudience={onBuildAudience}
      />

      {/* Shared CRM connect modal (support-handoff flow) */}
      <CrmConnectModal open={crmModalOpen} onClose={() => setCrmModalOpen(false)} />

      {/* Shared toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[80] w-[380px] max-w-[calc(100vw-32px)] bg-white border border-border rounded-card shadow-[0_12px_32px_rgba(15,15,15,0.12),0_0_0_1px_rgba(15,15,15,0.04)]"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <Loader2 size={14} strokeWidth={1.75} className="text-[#1D4ED8] animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary">{toast.title}</div>
                {toast.description && (
                  <div className="text-[12px] text-text-secondary leading-snug mt-1">{toast.description}</div>
                )}
                {toast.runId && (
                  <button
                    onClick={() => openToastRun(toast.runId!)}
                    className="text-[12px] font-medium text-text-primary underline underline-offset-2 hover:opacity-80 mt-2"
                  >
                    View run
                  </button>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Toast types & helpers ─────────────────────────────────────────────────

type RawToastDetail =
  | string
  | { message: string }
  | {
      kind?: string;
      title?: string;
      description?: string;
      runId?: string;
      message?: string;
    };

interface ToastPayload {
  id: string;
  title: string;
  description?: string;
  runId?: string;
}

function normalizeToast(d: RawToastDetail): ToastPayload {
  const id = `t-${Date.now()}`;
  if (typeof d === "string") return { id, title: d };
  if ("message" in d && d.message && !("title" in d && d.title)) {
    return { id, title: d.message };
  }
  const obj = d as { title?: string; description?: string; runId?: string };
  return {
    id,
    title: obj.title || "Done",
    description: obj.description,
    runId: obj.runId,
  };
}
```

## `src/components/data/data-tabs.tsx`

```tsx
"use client";

// Primary tabs for the /data shell:
//   Data dashboard (combined metrics across products)
//   Enrichment    (CRM / Bulk / Single / Enriched leads, sub-tabs inside)
//   Contact extraction (coming soon demo)

import { LayoutDashboard, UserSearch, ContactRound, type LucideIcon } from "lucide-react";

export type DataTabKey = "dashboard" | "enrichment" | "contacts";

const TABS: { key: DataTabKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard",  label: "Data",               icon: LayoutDashboard },
  { key: "enrichment", label: "Enrichment",         icon: UserSearch },
  { key: "contacts",   label: "Contact extraction", icon: ContactRound },
];

export function DataTabs({ value, onChange }: { value: DataTabKey; onChange: (k: DataTabKey) => void }) {
  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-border mb-6">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={[
              "inline-flex items-center gap-1.5 h-10 px-4 text-[13.5px] font-medium transition-colors -mb-px border-b-2",
              active
                ? "text-text-primary border-text-primary"
                : "text-text-secondary border-transparent hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={14} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

## `src/components/data/module-tabs.tsx`

```tsx
"use client";

// Module-level tab strip shared by every top-level Tools module (Enrichment,
// Contact extraction, ...). Three tabs by convention:
//   Dashboard , analytics view (the module's base route)
//   Operations, where the user does work (composers, CRM sync, etc.)
//   Database  , the resulting record store for that module
//
// Each link is a real route so URLs are shareable and the active tab survives
// reload. Pass `basePath` (e.g. "/enrichment") and the currently active key.

import Link from "next/link";
import { Activity, Database, LayoutGrid, type LucideIcon } from "lucide-react";

export type ModuleTabKey = "dashboard" | "operations" | "database";

interface TabDef {
  key: ModuleTabKey;
  label: string;
  icon: LucideIcon;
  segment: string;
}

const TABS: TabDef[] = [
  { key: "dashboard",  label: "Dashboard",  icon: LayoutGrid, segment: "" },
  { key: "operations", label: "Operations", icon: Activity,   segment: "/operations" },
  { key: "database",   label: "Database",   icon: Database,   segment: "/database" },
];

export function ModuleTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: ModuleTabKey;
}) {
  return (
    <div className="mb-6">
      <div
        role="tablist"
        aria-label="Module section"
        className="inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-1 gap-1"
      >
        {TABS.map(({ key, label, icon: Icon, segment }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={`${basePath}${segment}`}
              role="tab"
              aria-selected={isActive}
              className={[
                "inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-[6px] transition-colors",
                isActive
                  ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Icon size={12.5} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

## `src/components/data/enrichment-sub-tabs.tsx`

```tsx
"use client";

// Sub-tabs under the Enrichment primary tab. Two input modes:
//   Bulk upload, CSV upload composer + history
//   Single     , single-lead lookup composer + history
//
// The unified "Enriched leads" output DB lives on its own route at
// /data/enrichment/leads (linked from the page header's primary action), so it
// stays out of this tab strip and scales when more tools get their own DBs.

import { Search, Upload, type LucideIcon } from "lucide-react";

export type EnrichSubTabKey = "bulk" | "single";

interface TabDef {
  key: EnrichSubTabKey;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { key: "bulk",   label: "Bulk upload", icon: Upload },
  { key: "single", label: "Single",      icon: Search },
];

export function EnrichmentSubTabs({
  value,
  onChange,
}: {
  value: EnrichSubTabKey;
  onChange: (k: EnrichSubTabKey) => void;
}) {
  return (
    <div className="mb-6">
      <div
        role="tablist"
        aria-label="Enrichment input mode"
        className="inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-1 gap-1"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === value;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(key)}
              className={[
                "inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-[6px] transition-colors",
                active
                  ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Icon size={12.5} strokeWidth={1.75} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## `src/components/data/enrichment-variant-picker.tsx`

```tsx
"use client";

// Module-wide demo picker for the Enrichment product.
// Drops into any DataPageShell.headerAction slot. State persists across
// nav via DemoModeProvider + localStorage so every enrichment tab
// (Dashboard / Operations / Database / CRM activity) renders the same
// variant without the user re-selecting.

import { useDemoMode, type EnrichmentVariant } from "@/lib/demo-mode";

const OPTIONS: { v: EnrichmentVariant; l: string }[] = [
  { v: "populated", l: "Populated" },
  { v: "empty", l: "Empty" },
  { v: "no-crm", l: "No CRM" },
  { v: "no-storage", l: "No storage" },
];

export function EnrichmentVariantPicker() {
  const { enrichmentVariant, setEnrichmentVariant } = useDemoMode();
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-tertiary flex-shrink-0">
      <span className="font-medium uppercase tracking-[0.4px]">Demo view</span>
      <div className="inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-0.5 gap-0.5">
        {OPTIONS.map((opt) => {
          const active = opt.v === enrichmentVariant;
          return (
            <button
              key={opt.v}
              onClick={() => setEnrichmentVariant(opt.v)}
              className={[
                "h-6 px-2.5 text-[11px] font-medium rounded-[5px] transition-colors",
                active
                  ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              {opt.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## `src/components/data/enrichment-storage-off-notice.tsx`

```tsx
"use client";

// Inline banner shown on Enrichment surfaces when the workspace has
// storage disabled. Lighter than EnrichedLeadsNoStorage (full-page),
// used at the top of Dashboard + Operations so the user always knows
// records won't persist.

import { EyeOff } from "lucide-react";

export function EnrichmentStorageOffNotice() {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-[#FEF3C7]/40 border border-[#F59E0B]/30 rounded-card">
      <div className="w-7 h-7 rounded-[6px] bg-white border border-[#F59E0B]/30 flex items-center justify-center flex-shrink-0">
        <EyeOff size={14} strokeWidth={1.75} className="text-[#92400E]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
          Storage off, enrichment runs in-flight
        </div>
        <div className="text-[11.5px] text-text-secondary leading-snug">
          Bulk results download as time-limited CSVs. CRM-sourced leads write straight back. Nothing is saved to Revspot.
        </div>
      </div>
    </div>
  );
}
```

## `src/components/data/enriched-leads.tsx`

```tsx
"use client";

// Unified per-lead view. Every CRM hit, every Single lookup, and every row inside
// every Bulk upload becomes one row here.
//
// Filters: Range · Type · Source · Status · search.
// Pagination: 50 leads per page.
// Click a row → opens the lead-profile drawer (the enriched data for THAT person).
// Run-level status / credits / push-to-CRM live in the upload history drawer, not here.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Briefcase, Calendar, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, Database, FileSpreadsheet, Search, Upload, X } from "lucide-react";
import Link from "next/link";

import {
  CRM_NAMES_POOL,
  sampleProfile,
  type EnrichedProfile,
  type EnrichmentType,
  type RunRecord,
  useEnrichmentCrmStore,
} from "@/lib/enrichment-crm-data";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";
import { DateRangePopover, formatRangeLabel } from "./date-range-popover";

type DateRange = "7d" | "14d" | "30d" | "all" | "custom";
type TypeFilter = "any" | "professional" | "financial" | "both";
type UploadFilter = "any" | "crm" | "bulk" | "single";
type StatusFilter = "any" | "enriched" | "not_enriched" | "failed";

type LeadStatus = "enriched" | "not_enriched" | "failed" | "running";

interface LeadRow {
  id: string;
  runId: string;
  source: RunRecord["source"];
  leadId?: string;
  name: string;
  subline: string;
  types: EnrichmentType[];
  status: LeadStatus;
  startedAt: string;
  filename?: string;
  profile?: EnrichedProfile;
}

interface Props {
  /** @deprecated rows now open a lead-profile drawer; prop kept for caller back-compat. */
  onOpenRun?: (run: RunRecord) => void;
  /** When true, drop the "crm" source from rows and hide the CRM filter option
   *  (used by the No-CRM variant). */
  dropCrmSource?: boolean;
}

const PAGE_SIZE = 50;

// Every column gets an fr weight so wide viewports distribute slack evenly
// across all cells instead of pooling whitespace in one spot. Weights
// roughly match content needs: LEAD widest (name + email), ENRICHMENT
// medium (two pills), STATUS/STARTED/SOURCE/LEAD ID equal small.
const TABLE_COLS =
  "grid-cols-[minmax(72px,1fr)_minmax(128px,1.4fr)_minmax(220px,1.6fr)_minmax(180px,1.8fr)_minmax(120px,1.2fr)_minmax(80px,0.9fr)]";

export function EnrichedLeads({ onOpenRun: _onOpenRun, dropCrmSource = false }: Props) {
  const allRuns = useEnrichmentCrmStore((s) => s.runs);
  const runs = useMemo(
    () => (dropCrmSource ? allRuns.filter((r) => r.source !== "crm") : allRuns),
    [allRuns, dropCrmSource],
  );
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

  const [range, setRange] = useState<DateRange>("14d");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd,   setCustomEnd]   = useState<Date | null>(null);
  const [customOpen,  setCustomOpen]  = useState(false);
  const [typeF, setTypeF] = useState<TypeFilter>("any");
  const [uploadF, setUploadF] = useState<UploadFilter>("any");
  const [statusF, setStatusF] = useState<StatusFilter>("any");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const allLeads = useMemo<LeadRow[]>(() => flattenRunsToLeads(runs), [runs]);

  const inRange = useMemo(
    () => makeRangePredicate(range, customStart, customEnd),
    [range, customStart, customEnd],
  );

  const filtered = useMemo(() => {
    return allLeads
      .filter((l) => inRange(new Date(l.startedAt).getTime()))
      .filter((l) => matchType(l, typeF))
      .filter((l) => matchUpload(l, uploadF))
      .filter((l) => matchStatus(l, statusF))
      .filter((l) => matchQuery(l, query));
  }, [allLeads, inRange, typeF, uploadF, statusF, query]);

  // Reset to page 0 whenever filters change
  useEffect(() => {
    setPage(0);
  }, [range, customStart, customEnd, typeF, uploadF, statusF, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(total, pageStart + PAGE_SIZE);
  const pageRows = filtered.slice(pageStart, pageEnd);

  // KPIs reflect every active filter, not just the date range. If user filters
  // by Source: CRM, the cards collapse to CRM-only counts in lockstep.
  const totalLeads  = filtered.length;
  const enrichedC   = filtered.filter((l) => l.status === "enriched").length;
  const notEnrichedC = filtered.filter((l) => l.status === "not_enriched").length;
  const failedC     = filtered.filter((l) => l.status === "failed").length;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (typeF !== "any") activeChips.push({ label: `Type: ${typeLabelFor(typeF)}`, clear: () => setTypeF("any") });
  if (uploadF !== "any") activeChips.push({ label: `Source: ${capitalize(uploadF)}`, clear: () => setUploadF("any") });
  if (statusF !== "any") activeChips.push({ label: `Status: ${statusLabelFor(statusF)}`, clear: () => setStatusF("any") });
  if (query.trim()) activeChips.push({ label: `Search: "${query.trim()}"`, clear: () => setQuery("") });

  const openLead = (lead: LeadRow) => {
    setSelectedLead(lead);
  };

  if (allLeads.length === 0) {
    return <EnrichedLeadsEmpty />;
  }

  return (
    <div className="space-y-5">
      {/* Page-level filter bar, drives both KPIs and the table below */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search size={12} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, lead ID..."
              className="h-8 pl-7 pr-2.5 w-full text-[12.5px] bg-white border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-text-primary/15 focus:border-text-primary/40 transition-shadow"
            />
          </div>

          {/* Filter dropdowns */}
          <FilterDropdown<TypeFilter>
            label="Type"
            value={typeF}
            onChange={setTypeF}
            options={[
              { v: "any",          l: "Any" },
              { v: "professional", l: "Professional" },
              { v: "financial",    l: "Financial" },
              { v: "both",         l: "Both" },
            ]}
          />
          <FilterDropdown<UploadFilter>
            label="Source"
            value={uploadF}
            onChange={setUploadF}
            options={[
              { v: "any",    l: "Any" },
              ...(dropCrmSource ? [] : [{ v: "crm" as const, l: "CRM" }]),
              { v: "bulk",   l: "Bulk" },
              { v: "single", l: "Single" },
            ]}
          />
          <FilterDropdown<StatusFilter>
            label="Status"
            value={statusF}
            onChange={setStatusF}
            options={[
              { v: "any",           l: "Any" },
              { v: "enriched",      l: "Enriched" },
              { v: "not_enriched",  l: "Not enriched" },
              { v: "failed",        l: "Failed" },
            ]}
          />

          <div className="w-px h-6 bg-border" />

          {/* Range segmented control (primary axis) */}
          <div className="relative inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-0.5 gap-0.5">
            {(
              [
                { v: "7d",  l: "7d" },
                { v: "14d", l: "14d" },
                { v: "30d", l: "30d" },
                { v: "all", l: "All" },
              ] as { v: DateRange; l: string }[]
            ).map((opt) => {
              const active = opt.v === range;
              return (
                <button
                  key={opt.v}
                  onClick={() => setRange(opt.v)}
                  className={[
                    "h-6 px-2.5 text-[11.5px] font-medium rounded-[5px] transition-colors",
                    active
                      ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                      : "text-text-secondary hover:text-text-primary",
                  ].join(" ")}
                >
                  {opt.l}
                </button>
              );
            })}

            {/* Custom date range trigger */}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className={[
                "h-6 inline-flex items-center gap-1 px-2 text-[11.5px] font-medium rounded-[5px] transition-colors",
                range === "custom"
                  ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Calendar size={11} strokeWidth={1.75} />
              {range === "custom" && customStart && customEnd
                ? formatRangeLabel(customStart, customEnd)
                : "Custom"}
            </button>

            <DateRangePopover
              open={customOpen}
              onClose={() => setCustomOpen(false)}
              initialStart={customStart}
              initialEnd={customEnd}
              onApply={(s, e) => {
                setCustomStart(s);
                setCustomEnd(e);
                setRange("custom");
                setCustomOpen(false);
              }}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {activeChips.map((c) => (
              <button
                key={c.label}
                onClick={c.clear}
                className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium text-text-secondary bg-surface-secondary border border-border rounded-badge hover:text-text-primary hover:bg-surface-tertiary/60 transition-colors"
              >
                {c.label}
                <X size={10} strokeWidth={2} />
              </button>
            ))}
            <button
              onClick={() => {
                setTypeF("any");
                setUploadF("any");
                setStatusF("any");
                setQuery("");
              }}
              className="text-[11px] font-medium text-text-tertiary hover:text-text-primary ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* KPI strip, reflects current filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Total leads"  value={totalLeads.toLocaleString()}    tint="neutral" />
        <Kpi label="Enriched"     value={enrichedC.toLocaleString()}     tint="good" />
        <Kpi label="Not enriched" value={notEnrichedC.toLocaleString()}  tint="muted" />
        <Kpi label="Failed"       value={failedC.toLocaleString()}       tint={failedC > 0 ? "bad" : "muted"} />
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className={`grid ${TABLE_COLS} gap-4 px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary bg-surface-page/40 border-b border-border-subtle`}>
          <div>Source</div>
          <div>Lead ID</div>
          <div>Lead</div>
          <div>Enrichment</div>
          <div>Status</div>
          <div className="text-right">Started</div>
        </div>

        {pageRows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-[13px] font-medium text-text-primary mb-1">No matching leads</div>
            <div className="text-[12px] text-text-secondary">Try widening the date range or clearing filters.</div>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {pageRows.map((l) => (
              <li
                key={l.id}
                onClick={() => openLead(l)}
                className={`grid ${TABLE_COLS} gap-4 px-5 py-3.5 items-center cursor-pointer hover:bg-surface-page/40 transition-colors`}
              >
                <div>
                  <SourcePill source={l.source} />
                </div>
                <div className="min-w-0">
                  {l.leadId ? (
                    <span className="inline-block text-[11.5px] font-mono tabular-nums text-text-secondary bg-surface-secondary/60 border border-border rounded-input px-1.5 py-0.5 truncate max-w-full">
                      {l.leadId}
                    </span>
                  ) : (
                    <span className="text-[11.5px] text-text-tertiary">—</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-text-primary truncate">{l.name}</div>
                  <div className="text-[11.5px] text-text-secondary truncate mt-0.5">{l.subline}</div>
                </div>
                <div>
                  <TypePill types={l.types} />
                </div>
                <div>
                  <StatusPill status={l.status} />
                </div>
                <div className="text-right text-[11.5px] text-text-secondary tabular-nums">
                  {formatStarted(l.startedAt)}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-surface-page/30">
            <div className="text-[11.5px] text-text-secondary tabular-nums">
              {pageStart + 1}–{pageEnd} of {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-medium text-text-secondary border border-border rounded-button bg-white hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={12} strokeWidth={2} />
                Prev
              </button>
              <span className="text-[11.5px] text-text-tertiary tabular-nums px-1">
                {safePage + 1} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-medium text-text-secondary border border-border rounded-button bg-white hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LeadProfileDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  );
}

export function EnrichedLeadsEmpty() {
  return (
    <div className="bg-white border border-border rounded-card px-6 py-14">
      <div className="max-w-[520px] mx-auto text-center">
        <div className="w-12 h-12 rounded-card bg-surface-secondary border border-border-subtle flex items-center justify-center mx-auto mb-4">
          <Database size={20} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <h3 className="text-[15px] font-semibold text-text-primary mb-1.5">
          No enrichment records yet
        </h3>
        <p className="text-[12.5px] text-text-secondary leading-relaxed mb-6">
          Records show up here as soon as a lead is enriched, from your CRM, a bulk upload, or a single lookup.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          <Link
            href="/enrichment/operations"
            className="group flex items-start gap-3 p-3.5 bg-white border border-border rounded-card hover:border-text-primary/40 hover:shadow-[0_1px_3px_rgba(15,15,15,0.04)] transition-all"
          >
            <div className="w-8 h-8 rounded-[6px] bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <Upload size={14} strokeWidth={1.75} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                Bulk upload
              </div>
              <div className="text-[11.5px] text-text-tertiary leading-snug">
                Drop a CSV of leads to enrich in one go.
              </div>
            </div>
          </Link>

          <Link
            href="/enrichment/operations"
            className="group flex items-start gap-3 p-3.5 bg-white border border-border rounded-card hover:border-text-primary/40 hover:shadow-[0_1px_3px_rgba(15,15,15,0.04)] transition-all"
          >
            <div className="w-8 h-8 rounded-[6px] bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <Search size={14} strokeWidth={1.75} className="text-text-secondary" />
            </div>
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
                Single lookup
              </div>
              <div className="text-[11.5px] text-text-tertiary leading-snug">
                Enrich one lead by name, email, or phone.
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-5 pt-5 border-t border-border-subtle text-[11.5px] text-text-tertiary">
          Connected CRM? New leads auto-enrich and land here within minutes.
        </div>
      </div>
    </div>
  );
}

// ── Flatten runs to per-lead rows ─────────────────────────────────────────
// NOTE: Indexing scheme (seed=hashCode(run.id), step=i*7) is mirrored in
// src/lib/dashboard/flatten-leads.ts so the dashboard and this table show
// the same set of bulk leads. Keep both in sync.

function flattenRunsToLeads(runs: RunRecord[]): LeadRow[] {
  const out: LeadRow[] = [];
  for (const r of runs) {
    if (r.source === "crm" || r.source === "single") {
      const c = r.profile?.contact;
      const name =
        c?.name ||
        r.profile?.professional?.name ||
        r.inputValue ||
        (r.source === "crm" ? r.crmOrigin?.recordId ?? "CRM lead" : "Single lookup");
      const subline =
        c?.email ||
        c?.phone ||
        c?.linkedin ||
        (r.source === "crm"
          ? `${r.crmOrigin?.channel ?? "CRM"}${r.crmOrigin?.provider ? ` · ${capitalize(r.crmOrigin.provider)}` : ""}`
          : r.inputValue || "");

      // Lead ID resolution order: CRM record id > profile.lead_id > undefined.
      const leadId = r.source === "crm"
        ? r.crmOrigin?.recordId || r.profile?.lead_id
        : r.profile?.lead_id;

      out.push({
        id: r.id,
        runId: r.id,
        source: r.source,
        leadId,
        name,
        subline,
        types: r.types,
        status: deriveLeadStatus(r),
        startedAt: r.startedAt,
        profile: r.profile,
      });
      continue;
    }

    // Bulk, synthesize one row per lead from the deterministic name pool.
    // ~70% of bulk leads get a lead_id after write-back; the rest don't (pending push, mapping miss).
    const total = r.leadsTotal || 0;
    const success = Math.min(total, r.leadsSuccess || 0);
    const failed = Math.min(total - success, r.leadsFailed || 0);
    const notEnriched = Math.max(0, total - success - failed);
    const seed = hashCode(r.id);

    const renderCap = 60;
    const rowsToRender = Math.min(total, renderCap);
    const runShort = r.id.replace(/[^A-Za-z0-9]/g, "").slice(-5).toUpperCase().padStart(5, "0");

    for (let i = 0; i < rowsToRender; i++) {
      const person = CRM_NAMES_POOL[(seed + i * 7) % CRM_NAMES_POOL.length];
      const ratio = total === 0 ? 0 : i / total;
      let status: LeadStatus;
      if (r.status === "in_progress") {
        status = "running";
      } else if (r.status === "failed") {
        status = "failed";
      } else if (ratio < success / total) {
        status = "enriched";
      } else if (ratio < (success + failed) / total) {
        status = "failed";
      } else {
        status = notEnriched > 0 ? "not_enriched" : "enriched";
      }

      // ~70% of bulk leads get a lead_id, the rest don't.
      const hasLeadId = ((seed + i) % 10) < 7 && status !== "failed";
      const leadId = hasLeadId
        ? `BLK-${runShort}-${String(i + 1).padStart(4, "0")}`
        : undefined;

      const ts = new Date(r.startedAt).getTime() + i * 1000;

      // Per-lead profile. Prefer the seeded sample on the run (real shape),
      // else synthesize a minimal one so the lead drawer always has data
      // to render for any successful row.
      const seeded = r.leads?.[i];
      const profile: EnrichedProfile | undefined =
        seeded ??
        (status === "failed" || status === "running"
          ? undefined
          : synthBulkLeadProfile({
              leadId,
              person,
              types: r.types,
              status,
            }));

      out.push({
        id: `${r.id}::${i}`,
        runId: r.id,
        source: "bulk",
        leadId,
        name: person.name,
        subline: person.email,
        types: r.types,
        status,
        startedAt: new Date(ts).toISOString(),
        filename: r.filename,
        profile,
      });
    }
  }

  out.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return out;
}

// Build a believable EnrichedProfile for a synthesized bulk row using the
// shared sampleProfile as a base. Patches identity from the deterministic
// CRM_NAMES_POOL person and honours the run's enrichment types.
function synthBulkLeadProfile(args: {
  leadId?: string;
  person: { name: string; email: string; phone: string; company: string; title: string };
  types: EnrichmentType[];
  status: LeadStatus;
}): EnrichedProfile {
  const { leadId, person, types, status } = args;
  const wantsPro = types.includes("professional");
  const wantsFin = types.includes("financial");
  const isPartial = status === "not_enriched";

  return {
    lead_id: leadId,
    enrichment_status: isPartial ? "Partial Enrichment" : "Fully Enriched",
    finance_data: wantsFin && !isPartial ? "Available" : "Not Available",
    email_verification_status: "Valid",
    phone_verification_status: "Valid",
    valid_indian_name: true,
    contact: {
      name: person.name,
      email: person.email,
      phone: person.phone,
    },
    professional: wantsPro && !isPartial
      ? {
          ...sampleProfile.professional,
          name: person.name,
          job_title: person.title,
          company_name: person.company,
        }
      : undefined,
    financial: wantsFin && !isPartial ? sampleProfile.financial : undefined,
  };
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
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Filter helpers ────────────────────────────────────────────────────────

function makeRangePredicate(
  r: DateRange,
  customStart: Date | null,
  customEnd: Date | null,
): (t: number) => boolean {
  if (r === "all") return () => true;
  if (r === "custom") {
    if (!customStart || !customEnd) return () => true;
    const startMs = new Date(customStart).setHours(0, 0, 0, 0);
    const endMs   = new Date(customEnd).setHours(23, 59, 59, 999);
    return (t) => t >= startMs && t <= endMs;
  }
  const days = r === "7d" ? 7 : r === "14d" ? 14 : 30;
  const cutoff = Date.now() - days * 86_400_000;
  return (t) => t >= cutoff;
}

function matchType(l: LeadRow, f: TypeFilter): boolean {
  if (f === "any") return true;
  const hasPro = l.types.includes("professional");
  const hasFin = l.types.includes("financial");
  if (f === "professional") return hasPro && !hasFin;
  if (f === "financial") return hasFin && !hasPro;
  return hasPro && hasFin;
}

function matchUpload(l: LeadRow, f: UploadFilter): boolean {
  if (f === "any") return true;
  return l.source === f;
}

function matchStatus(l: LeadRow, f: StatusFilter): boolean {
  if (f === "any") return true;
  if (f === "enriched") return l.status === "enriched";
  if (f === "not_enriched") return l.status === "not_enriched";
  return l.status === "failed";
}

function matchQuery(l: LeadRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [l.name, l.subline, l.leadId, l.filename].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(needle);
}

function formatStarted(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function typeLabelFor(t: TypeFilter): string {
  if (t === "professional") return "Professional";
  if (t === "financial") return "Financial";
  if (t === "both") return "Both";
  return "Any";
}

function statusLabelFor(s: StatusFilter): string {
  if (s === "enriched") return "Enriched";
  if (s === "not_enriched") return "Not enriched";
  if (s === "failed") return "Failed";
  return "Any";
}

// ── Filter dropdown ───────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = options.find((o) => o.v === value);
  const isAny = value === ("any" as T);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center gap-1.5 h-8 px-2.5 text-[12px] rounded-input border transition-colors",
          isAny
            ? "bg-white border-border text-text-secondary hover:text-text-primary"
            : "bg-surface-secondary border-border text-text-primary",
        ].join(" ")}
      >
        <span className="text-text-tertiary">{label}:</span>
        <span className="font-medium">{current?.l ?? "Any"}</span>
        <ChevronDown size={11} strokeWidth={2} className="text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 right-0 min-w-[160px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08)] py-1">
          {options.map((opt) => {
            const active = opt.v === value;
            return (
              <button
                key={opt.v}
                onClick={() => {
                  onChange(opt.v);
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between gap-3 transition-colors",
                  active
                    ? "bg-surface-secondary text-text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-page hover:text-text-primary",
                ].join(" ")}
              >
                <span>{opt.l}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────

function Kpi({ label, value, tint }: { label: string; value: string; tint: "good" | "bad" | "muted" | "neutral" }) {
  const dot =
    tint === "good"
      ? "bg-[#22C55E]"
      : tint === "bad"
      ? "bg-[#EF4444]"
      : tint === "muted"
      ? "bg-[#CBD5E1]"
      : "bg-text-tertiary";
  return (
    <div className="bg-white border border-border rounded-card p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">{label}</div>
      </div>
      <div className="text-[20px] font-semibold text-text-primary tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function SourcePill({ source }: { source: RunRecord["source"] }) {
  if (source === "crm") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-2 py-0.5">
        CRM
      </span>
    );
  }
  if (source === "bulk") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#9A3412] bg-[#FFF7ED] border border-[#FED7AA] rounded-badge px-2 py-0.5">
        <Upload size={9} strokeWidth={2} />
        Bulk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] rounded-badge px-2 py-0.5">
      <FileSpreadsheet size={9} strokeWidth={2} />
      Single
    </span>
  );
}

function TypePill({ types }: { types: EnrichmentType[] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="inline-flex items-center gap-1 flex-wrap">
      {hasPro && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-1.5 py-0.5">
          <Briefcase size={9} strokeWidth={2} />
          Professional
        </span>
      )}
      {hasFin && (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#6D28D9] bg-[#F5F3FF] border border-[#DDD6FE] rounded-badge px-1.5 py-0.5">
          <CircleDollarSign size={9} strokeWidth={2} />
          Financial
        </span>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-badge px-2 py-0.5">
        <span className="w-1 h-1 rounded-full bg-[#EF4444]" />
        Failed
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-badge px-2 py-0.5">
        <span className="w-1 h-1 rounded-full bg-[#F59E0B] animate-pulse" />
        Running
      </span>
    );
  }
  if (status === "not_enriched") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-secondary bg-surface-secondary border border-border rounded-badge px-2 py-0.5">
        <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
        Not enriched
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-badge px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
      Enriched
    </span>
  );
}

// ── Lead profile drawer ───────────────────────────────────────────────────
// Lead-centric, not run-centric. Shows ONLY the enriched profile for the
// clicked person. Run-level info (upload status, credits, push-to-CRM) lives
// in the upload history drawer, not here.

function LeadProfileDrawer({ lead, onClose }: { lead: LeadRow | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!lead) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  if (!mounted || !lead) return null;

  const displayName =
    lead.profile?.contact?.name ||
    lead.profile?.professional?.name ||
    lead.name ||
    "Lead";

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[560px] max-w-[92vw] bg-white border-l border-border z-[70] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border-subtle">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <SourcePill source={lead.source} />
              {lead.leadId && (
                <span className="text-[11px] font-mono tabular-nums text-text-tertiary">{lead.leadId}</span>
              )}
            </div>
            <div className="text-[15px] font-semibold text-text-primary truncate">{displayName}</div>
            <div className="text-[12px] text-text-secondary truncate mt-0.5">{lead.subline}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors flex-shrink-0"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {lead.profile ? (
            <LeadProfileCard profile={lead.profile} variant="inline" />
          ) : (
            <div className="text-center py-12">
              <div className="text-[13px] font-medium text-text-primary mb-1">No enriched data</div>
              <div className="text-[12px] text-text-secondary">
                {lead.status === "failed"
                  ? "This lead failed enrichment."
                  : lead.status === "running"
                  ? "Enrichment still in progress."
                  : "Nothing to show for this lead yet."}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}
```

## `src/components/data/enrichment-dashboard.tsx`

```tsx
"use client";

// Re-export the dashboard root so existing imports
// (`@/components/data/enrichment-dashboard`) keep working.

export { EnrichmentDashboard } from "./dashboard/enrichment-dashboard";
```

## `src/components/data/enrichment-section.tsx`

```tsx
"use client";

// Operations view for the Enrichment module. Two input sub-tabs (Bulk / Single).
// CRM-sourced leads flow in automatically and surface on the Dashboard's lead
// explorer, Operations is purely about user-initiated runs.

import { useState } from "react";
import { Download } from "lucide-react";

import {
  sampleCsvDataUrl,
  sampleCsvFilename,
  type RunRecord,
  useEnrichmentCrmStore,
} from "@/lib/enrichment-crm-data";
import { useDemoMode } from "@/lib/demo-mode";
import { EnrichmentComposer } from "@/components/enrichment-crm/composer";
import { HistoryTable } from "@/components/enrichment-crm/history-table";
import { CrmConnectBanner } from "@/components/enrichment-crm/crm-connect-nudge";
import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationEnrichment } from "@/components/illustrations/empty-states";

import { EnrichmentSubTabs, type EnrichSubTabKey } from "./enrichment-sub-tabs";

interface Props {
  connected: boolean;
  onOpenRun: (run: RunRecord) => void;
  onConnect: () => void;
}

export function EnrichmentSection({ connected, onOpenRun, onConnect }: Props) {
  const [sub, setSub] = useState<EnrichSubTabKey>("bulk");
  const { enrichmentVariant, crmRequestSubmitted } = useDemoMode();
  const runs = useEnrichmentCrmStore((s) => s.runs);
  // Bulk + single composers still work without CRM, so the "no-crm" variant
  // shouldn't blank Operations. Only literal "empty" wipes everything.
  const wipe = enrichmentVariant === "empty";
  const isNoStorage = enrichmentVariant === "no-storage";

  const bulkRuns   = wipe ? [] : runs.filter((r) => r.source === "bulk");
  const singleRuns = wipe ? [] : runs.filter((r) => r.source === "single");

  return (
    <div>
      <EnrichmentSubTabs value={sub} onChange={setSub} />

      {/* Bulk upload tab */}
      {sub === "bulk" && (
        <>
          {!connected && (
            <CrmConnectBanner onConnect={onConnect} pending={crmRequestSubmitted} />
          )}
          <EnrichmentComposer mode="bulk" />
          <div className="mt-8">
            {bulkRuns.length === 0 ? (
              <EmptyState
                illustration={<IllustrationEnrichment />}
                title="No bulk uploads yet"
                description="Upload a CSV to enrich in bulk."
                action={
                  <a
                    href={sampleCsvDataUrl([])}
                    download={sampleCsvFilename([])}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-text-primary text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
                  >
                    <Download size={14} strokeWidth={1.5} />
                    Download sample CSV
                  </a>
                }
              />
            ) : (
              <HistoryTable
                onView={onOpenRun}
                forceSource="bulk"
                title="Bulk upload history"
                summaryAfterDays={isNoStorage ? 3 : undefined}
              />
            )}
          </div>
        </>
      )}

      {/* Single tab */}
      {sub === "single" && (
        <>
          {!connected && (
            <CrmConnectBanner onConnect={onConnect} pending={crmRequestSubmitted} />
          )}
          <EnrichmentComposer mode="single" />
          {/* History is suppressed entirely under no-storage — single lookups
              are in-flight only, nothing persists. */}
          {!isNoStorage && (
            <div className="mt-8">
              {singleRuns.length === 0 ? (
                <EmptyState
                  illustration={<IllustrationEnrichment />}
                  title="No single lookups yet"
                  description="Enrich one lead at a time using email, phone, or LinkedIn."
                />
              ) : (
                <HistoryTable
                  onView={onOpenRun}
                  forceSource="single"
                  title="Single lookup history"
                />
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
```

## `src/components/data/date-range-popover.tsx`

```tsx
"use client";

// Custom date range popover. Same calendar visuals as the global dashboard
// date-range-selector, trimmed to a single calendar + apply/cancel, no
// compare period UI. Anchors to its trigger button (positioned by caller).

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtFull(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  /** Open state controlled by parent. */
  open: boolean;
  onClose: () => void;
  /** Initial selected range; null = nothing selected yet. */
  initialStart: Date | null;
  initialEnd: Date | null;
  /** Called on Apply with the chosen range. */
  onApply: (start: Date, end: Date) => void;
  /** Optional anchor className override for positioning. Default: top-full right-0 mt-1. */
  anchorClass?: string;
}

export function DateRangePopover({
  open,
  onClose,
  initialStart,
  initialEnd,
  onApply,
  anchorClass = "absolute z-40 top-full right-0 mt-1",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [calMonth, setCalMonth] = useState(initialStart ? initialStart.getMonth() : now.getMonth());
  const [calYear,  setCalYear]  = useState(initialStart ? initialStart.getFullYear() : now.getFullYear());

  const [selStart, setSelStart] = useState<Date | null>(initialStart);
  const [selEnd,   setSelEnd]   = useState<Date | null>(initialEnd);
  const [hovered,  setHovered]  = useState<Date | null>(null);

  // Reset selection state every time the popover opens.
  useEffect(() => {
    if (open) {
      setSelStart(initialStart);
      setSelEnd(initialEnd);
      if (initialStart) {
        setCalMonth(initialStart.getMonth());
        setCalYear(initialStart.getFullYear());
      }
    }
  }, [open, initialStart, initialEnd]);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleDateClick = (d: Date) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d);
      setSelEnd(null);
      return;
    }
    if (d < selStart) {
      setSelEnd(selStart);
      setSelStart(d);
    } else {
      setSelEnd(d);
    }
  };

  const isInRange = (d: Date) => {
    if (selStart && selEnd) return d >= selStart && d <= selEnd;
    if (selStart && hovered) {
      const min = selStart < hovered ? selStart : hovered;
      const max = selStart < hovered ? hovered : selStart;
      return d >= min && d <= max;
    }
    return false;
  };
  const isStart = (d: Date) => !!(selStart && d.toDateString() === selStart.toDateString());
  const isEnd   = (d: Date) => !!(selEnd && d.toDateString() === selEnd.toDateString());

  const navMonth = (dir: number) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  const canApply = !!(selStart && selEnd);

  const applyShortcut = (days: number) => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setSelStart(start);
    setSelEnd(end);
    setCalMonth(start.getMonth());
    setCalYear(start.getFullYear());
  };

  return (
    <div
      ref={ref}
      className={`${anchorClass} bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10)] overflow-hidden`}
    >
      <div className="flex">
        {/* Preset shortcuts */}
        <div className="w-[120px] border-r border-border-subtle py-2">
          {[
            { l: "Last 7 days",  d: 7 },
            { l: "Last 14 days", d: 14 },
            { l: "Last 30 days", d: 30 },
            { l: "Last 90 days", d: 90 },
          ].map((s) => (
            <button
              key={s.d}
              onClick={() => applyShortcut(s.d)}
              className="w-full text-left px-3 py-1.5 text-[11.5px] text-text-secondary hover:bg-surface-page hover:text-text-primary transition-colors"
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="w-[260px] p-3">
          <CalendarGrid
            month={calMonth}
            year={calYear}
            onNav={navMonth}
            onDateClick={handleDateClick}
            onHover={setHovered}
            isInRange={isInRange}
            isStartFn={isStart}
            isEndFn={isEnd}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border-subtle bg-surface-page/40">
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {selStart && selEnd
            ? `${fmtShort(selStart)} – ${fmtShort(selEnd)}`
            : selStart
              ? `${fmtShort(selStart)} – …`
              : "Pick a start date"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelStart(null);
              setSelEnd(null);
              onClose();
            }}
            className="h-7 px-3 text-[11px] font-medium text-text-secondary hover:text-text-primary rounded-button transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canApply}
            onClick={() => {
              if (selStart && selEnd) onApply(selStart, selEnd);
            }}
            className="h-7 px-3 bg-text-primary text-white text-[11px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar grid (range-aware) ──────────────────────────────────────────

function CalendarGrid({
  month, year, onNav, onDateClick, onHover, isInRange, isStartFn, isEndFn,
}: {
  month: number;
  year: number;
  onNav: (dir: number) => void;
  onDateClick: (d: Date) => void;
  onHover: (d: Date) => void;
  isInRange: (d: Date) => boolean;
  isStartFn: (d: Date) => boolean;
  isEndFn: (d: Date) => boolean;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const calDays: { day: number; inMonth: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calDays.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calDays.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - calDays.length;
  for (let d = 1; d <= remaining; d++) {
    calDays.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onNav(-1)}
          className="p-1 hover:bg-surface-page rounded text-text-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </button>
        <span className="text-[12px] font-medium text-text-primary">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => onNav(1)}
          className="p-1 hover:bg-surface-page rounded text-text-secondary"
          aria-label="Next month"
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAY_LABELS.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-[10px] font-medium text-text-tertiary">
            {d}
          </div>
        ))}
        {calDays.map((cd, i) => {
          const inR = isInRange(cd.date);
          const start = isStartFn(cd.date);
          const end = isEndFn(cd.date);
          return (
            <button
              key={i}
              onClick={() => onDateClick(cd.date)}
              onMouseEnter={() => onHover(cd.date)}
              className={[
                "h-7 flex items-center justify-center text-[11px] transition-colors rounded-[4px]",
                !cd.inMonth
                  ? "text-text-tertiary/40"
                  : start || end
                    ? "bg-text-primary text-white font-medium"
                    : inR
                      ? "bg-surface-secondary text-text-primary"
                      : "text-text-primary hover:bg-surface-page",
              ].join(" ")}
            >
              {cd.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatRangeLabel(start: Date, end: Date): string {
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
    return fmtFull(start);
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmtShort(start)} – ${fmtShort(end)}`;
  }
  return `${fmtFull(start)} – ${fmtFull(end)}`;
}
```

## `src/components/data/mapping-drawer.tsx`

```tsx
"use client";

// Right-side drawer that hosts the CRM field-mapping view. Same visual
// language as the run-drawer: scrim + sliding panel + close on Esc.

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MappingDrawer({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/30"
            aria-hidden
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-[71] h-screen w-full sm:w-[560px] bg-surface-page border-l border-border shadow-[0_0_40px_rgba(15,15,15,0.12)] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Field mapping"
          >
            <header className="flex items-center justify-between px-5 h-12 border-b border-border bg-white">
              <div className="text-[13px] font-semibold text-text-primary">Field mapping</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 -mr-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
```

## `src/components/data/crm-mapped-fields.tsx`

```tsx
"use client";

// Read-only view of how the connected CRM's fields map to Revspot's enrichment fields.
// Demo only, real product would let users edit the mapping. Here we just show the table
// so the user can see what gets read in and what gets written back.

import { ArrowRight, Briefcase, CircleDollarSign, Database, Pencil } from "lucide-react";

import { useEnrichmentCrmStore } from "@/lib/enrichment-crm-data";

type Direction = "read" | "write" | "both";
type Layer = "identity" | "professional" | "financial";

interface Mapping {
  crmField: string;
  crmObject?: string;
  revspotField: string;
  layer: Layer;
  direction: Direction;
}

const MAPPINGS: Mapping[] = [
  // Identity (read)
  { crmField: "Email",         crmObject: "Lead", revspotField: "contact.email",           layer: "identity",     direction: "read" },
  { crmField: "Phone",         crmObject: "Lead", revspotField: "contact.phone",           layer: "identity",     direction: "read" },
  { crmField: "Name",          crmObject: "Lead", revspotField: "contact.name",            layer: "identity",     direction: "read" },
  { crmField: "LinkedIn URL",  crmObject: "Lead", revspotField: "contact.linkedin",        layer: "identity",     direction: "read" },

  // Professional (write back)
  { crmField: "Title",                crmObject: "Lead", revspotField: "professional.job_title",        layer: "professional", direction: "write" },
  { crmField: "Company",              crmObject: "Lead", revspotField: "professional.company_name",     layer: "professional", direction: "write" },
  { crmField: "Industry",             crmObject: "Lead", revspotField: "professional.company_industry", layer: "professional", direction: "write" },
  { crmField: "rev_seniority__c",     crmObject: "Lead", revspotField: "professional.professional_level", layer: "professional", direction: "write" },
  { crmField: "rev_years_exp__c",     crmObject: "Lead", revspotField: "professional.years_of_experience", layer: "professional", direction: "write" },
  { crmField: "rev_location__c",      crmObject: "Lead", revspotField: "professional.location",        layer: "professional", direction: "write" },

  // Financial (write back)
  { crmField: "rev_income_band__c",   crmObject: "Lead", revspotField: "financial.annual_earnings_inr_max", layer: "financial", direction: "write" },
  { crmField: "rev_potential__c",     crmObject: "Lead", revspotField: "financial.potential_tier",     layer: "financial", direction: "write" },
  { crmField: "rev_credit_score__c",  crmObject: "Lead", revspotField: "financial.credit_score",       layer: "financial", direction: "write" },
  { crmField: "rev_final_score__c",   crmObject: "Lead", revspotField: "financial.final_score",        layer: "financial", direction: "write" },
];

export function CrmMappedFields() {
  const crm = useEnrichmentCrmStore((s) => s.crmConnection);

  const readCount = MAPPINGS.filter((m) => m.direction === "read" || m.direction === "both").length;
  const writeCount = MAPPINGS.filter((m) => m.direction === "write" || m.direction === "both").length;

  return (
    <section className="bg-white border border-border rounded-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border-subtle flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">Mapped fields</div>
          <h3 className="text-[14px] font-semibold text-text-primary mt-0.5">
            {capitalize(crm.provider)} · {crm.mappedFieldCount} fields linked
          </h3>
          <p className="text-[12px] text-text-secondary mt-1 max-w-[640px] leading-relaxed">
            What we read from your CRM, and what we write back after enrichment.{" "}
            Write-back policy: <span className="font-medium text-text-primary">{policyLabel(crm.writeBackPolicy)}</span>.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white opacity-70 cursor-not-allowed"
          title="Editing mapping ships in a future release"
        >
          <Pencil size={12} strokeWidth={1.75} />
          Edit mapping
        </button>
      </header>

      <div className="px-5 py-3 flex items-center gap-4 text-[11.5px] text-text-secondary border-b border-border-subtle bg-surface-page/30">
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="blue" /> Read from CRM
          <span className="tabular-nums text-text-primary font-medium ml-1">{readCount}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="green" /> Write back to CRM
          <span className="tabular-nums text-text-primary font-medium ml-1">{writeCount}</span>
        </span>
      </div>

      <MappingGroup
        layer="identity"
        title="Identity"
        sub="Lead fields used to look up enrichment data."
        icon={<Database size={13} strokeWidth={1.75} />}
        rows={MAPPINGS.filter((m) => m.layer === "identity")}
      />
      <MappingGroup
        layer="professional"
        title="Professional"
        sub="Title, company, location, seniority."
        icon={<Briefcase size={13} strokeWidth={1.75} />}
        rows={MAPPINGS.filter((m) => m.layer === "professional")}
      />
      <MappingGroup
        layer="financial"
        title="Financial"
        sub="Income band, credit score, affordability."
        icon={<CircleDollarSign size={13} strokeWidth={1.75} />}
        rows={MAPPINGS.filter((m) => m.layer === "financial")}
        last
      />
    </section>
  );
}

function MappingGroup({
  layer,
  title,
  sub,
  icon,
  rows,
  last,
}: {
  layer: Layer;
  title: string;
  sub: string;
  icon: React.ReactNode;
  rows: Mapping[];
  last?: boolean;
}) {
  const tint =
    layer === "identity"
      ? "bg-surface-secondary text-text-secondary"
      : layer === "professional"
      ? "bg-[#EFF6FF] text-[#1D4ED8]"
      : "bg-[#F5F3FF] text-[#6D28D9]";
  return (
    <div className={last ? "" : "border-b border-border-subtle"}>
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-button ${tint}`}>{icon}</span>
        <div>
          <div className="text-[12.5px] font-semibold text-text-primary">{title}</div>
          <div className="text-[11px] text-text-secondary">{sub}</div>
        </div>
      </div>
      <div className="px-5 pb-4">
        <div className="grid grid-cols-[1fr_28px_1fr_88px] gap-2 px-3 py-2 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary border-b border-border-subtle">
          <div>CRM field</div>
          <div />
          <div>Revspot field</div>
          <div className="text-right">Direction</div>
        </div>
        <ul className="divide-y divide-border-subtle">
          {rows.map((m) => (
            <li key={m.crmField} className="grid grid-cols-[1fr_28px_1fr_88px] gap-2 px-3 py-2.5 items-center">
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary truncate font-mono tabular-nums">{m.crmField}</div>
                {m.crmObject && (
                  <div className="text-[10.5px] text-text-tertiary truncate">{m.crmObject}</div>
                )}
              </div>
              <div className="flex items-center justify-center text-text-tertiary">
                <ArrowRight size={12} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary truncate font-mono tabular-nums">{m.revspotField}</div>
              </div>
              <div className="flex justify-end">
                <DirectionPill direction={m.direction} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DirectionPill({ direction }: { direction: Direction }) {
  if (direction === "read") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-2 py-0.5">
        Read
      </span>
    );
  }
  if (direction === "write") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-badge px-2 py-0.5">
        Write
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-primary bg-surface-secondary border border-border rounded-badge px-2 py-0.5">
      Both
    </span>
  );
}

function Dot({ tone }: { tone: "blue" | "green" }) {
  const c = tone === "blue" ? "bg-[#3B82F6]" : "bg-[#22C55E]";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${c}`} />;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function policyLabel(p: "fill_blanks" | "overwrite" | "field_selective"): string {
  if (p === "fill_blanks") return "Fill blanks only";
  if (p === "overwrite") return "Overwrite existing";
  return "Field-by-field";
}
```

## `src/components/data/contact-extraction-dashboard.tsx`

```tsx
"use client";

// Base/landing view for the Contact extraction module. Demo placeholder, the
// real product hasn't shipped yet, but this matches the Enrichment dashboard
// shape (KPI strip + volume strip) so the layout reads as a real module.

import { ContactRound, Globe, Mail, ShieldCheck } from "lucide-react";

export function ContactExtractionDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-section-header text-text-primary">Extraction overview</h2>
          <span className="inline-flex items-center text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-badge px-2 py-0.5">
            Demo data
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Sources crawled" value="47"    sub="Last 14 days" />
          <Tile label="Contacts found"  value="2,184" sub="Across all sources" />
          <Tile label="Verified emails" value="1,803" sub="83% verification rate" />
          <Tile label="Pushed to CRM"   value="1,612" sub="Net new rows" />
        </div>
      </div>

      {/* What we pull */}
      <section className="bg-white border border-border rounded-card p-5">
        <h3 className="text-section-header text-text-primary mb-3">What we pull</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Capability icon={<Mail size={14} strokeWidth={1.75} />}        title="Emails"        body="Verified, role-aware, deliverable." />
          <Capability icon={<ContactRound size={14} strokeWidth={1.75} />} title="Phones"        body="Mobile + landline with HLR check." />
          <Capability icon={<Globe size={14} strokeWidth={1.75} />}       title="Domains"       body="Company URL, socials, country." />
          <Capability icon={<ShieldCheck size={14} strokeWidth={1.75} />} title="Verified rows" body="DNC-aware, bounce-tested." />
        </div>
      </section>

      {/* Recent extractions */}
      <section className="bg-white border border-border rounded-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-subtle">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">Recent extractions</div>
          <div className="text-[13px] font-semibold text-text-primary mt-0.5">Across all sources</div>
        </div>
        <ul className="divide-y divide-border-subtle">
          <Row title="sobha.com" found={48} verified={38} when="4 hr ago" />
          <Row title="prestige-group-listings.csv" found={612} verified={524} when="yesterday" />
          <Row title="brigade-orchards.in" found={31} verified={29} when="2 days ago" />
          <Row title="apartment-listings-bangalore" found={1493} verified={1212} when="last week" />
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="text-[11.5px] text-text-secondary font-medium uppercase tracking-wide">{label}</div>
      <div className="text-[24px] font-semibold text-text-primary tabular-nums mt-2">{value}</div>
      <div className="text-[11.5px] text-text-secondary mt-1">{sub}</div>
    </div>
  );
}

function Capability({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-border-subtle rounded-card p-3.5 bg-white">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-button bg-[#ECFDF5] text-[#065F46]">
          {icon}
        </span>
        <div className="text-[13px] font-semibold text-text-primary">{title}</div>
      </div>
      <p className="text-[12px] text-text-secondary leading-snug">{body}</p>
    </div>
  );
}

function Row({ title, found, verified, when }: { title: string; found: number; verified: number; when: string }) {
  return (
    <li className="px-5 py-3 flex items-center gap-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-button bg-surface-secondary border border-border-subtle">
        <Globe size={13} strokeWidth={1.75} className="text-text-secondary" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-text-primary truncate">{title}</div>
        <div className="text-[11.5px] text-text-secondary truncate">
          <span className="tabular-nums">{found.toLocaleString()}</span> contacts found ·{" "}
          <span className="tabular-nums">{verified.toLocaleString()}</span> verified · {when}
        </div>
      </div>
    </li>
  );
}
```

## `src/components/data/contact-extraction.tsx`

```tsx
"use client";

// Demo placeholder for the second data product. Mirrors the structure of the
// enrichment surface (top KPI + recent activity) so the eventual real screen
// has somewhere obvious to slot into.

import { ArrowRight, ContactRound, Globe, ListTree, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";

export function ContactExtraction({ onBack }: { onBack?: () => void }) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="bg-white border border-border rounded-card overflow-hidden">
        <div className="relative px-6 sm:px-10 pt-9 pb-7 bg-gradient-to-br from-[#ECFDF5] via-white to-white border-b border-border-subtle overflow-hidden">
          <div className="absolute top-6 right-6 hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-white border border-border-subtle">
            <ContactRound size={22} strokeWidth={1.5} className="text-[#065F46]" />
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-badge px-2 py-1 mb-3">
            <Sparkles size={11} strokeWidth={2} />
            Demo · coming soon
          </div>
          <h2 className="text-[22px] sm:text-[26px] font-semibold text-text-primary tracking-tight max-w-[640px]">
            Pull verified contacts from anywhere into your CRM
          </h2>
          <p className="text-[13.5px] text-text-secondary mt-2 max-w-[640px] leading-relaxed">
            Point us at a website, directory, or uploaded list. We crawl, dedupe, verify
            emails and phones, then push clean rows back to the same CRM you use for enrichment.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <button
              disabled
              className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-text-primary rounded-button opacity-60 cursor-not-allowed"
              title="Real flow ships in a future release"
            >
              Start extraction
              <ArrowRight size={13} strokeWidth={2} />
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-text-secondary hover:text-text-primary border border-border rounded-button bg-white transition-colors"
              >
                Back to dashboard
              </button>
            )}
          </div>
        </div>

        {/* Capabilities */}
        <div className="px-6 sm:px-10 py-7 border-b border-border-subtle">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
            What we pull
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Capability icon={<Mail size={14} strokeWidth={1.75} />}        title="Emails"        body="Verified, role-aware, deliverable." />
            <Capability icon={<Phone size={14} strokeWidth={1.75} />}       title="Phones"        body="Mobile + landline with HLR check." />
            <Capability icon={<Globe size={14} strokeWidth={1.75} />}       title="Domains"       body="Company URL, socials, country." />
            <Capability icon={<ShieldCheck size={14} strokeWidth={1.75} />} title="Verified rows" body="DNC-aware, bounce-tested." />
          </div>
        </div>

        {/* Sources */}
        <div className="px-6 sm:px-10 py-7">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
            Sources
          </div>
          <div className="flex flex-wrap gap-2">
            {["Company website", "Apollo", "LinkedIn Sales Nav", "ZoomInfo", "Crunchbase", "Custom upload", "Public directories"].map(
              (p) => (
                <span
                  key={p}
                  className="inline-flex items-center text-[12px] font-medium text-text-secondary bg-white border border-border rounded-button px-2.5 py-1"
                >
                  <ListTree size={11} strokeWidth={1.75} className="mr-1.5 text-text-tertiary" />
                  {p}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Recent activity demo strip */}
      <section className="bg-white border border-border rounded-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-subtle">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">Recent extractions</div>
          <div className="text-[13px] font-semibold text-text-primary mt-0.5">Demo data, wired to real crawler in next release</div>
        </div>
        <ul className="divide-y divide-border-subtle">
          <Row title="sobha.com" found={48} verified={38} when="4 hr ago" />
          <Row title="prestige-group-listings.csv" found={612} verified={524} when="yesterday" />
          <Row title="brigade-orchards.in" found={31} verified={29} when="2 days ago" />
          <Row title="apartment-listings-bangalore" found={1493} verified={1212} when="last week" />
        </ul>
      </section>
    </div>
  );
}

function Capability({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-border-subtle rounded-card p-3.5 bg-white">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-button bg-[#ECFDF5] text-[#065F46]">
          {icon}
        </span>
        <div className="text-[13px] font-semibold text-text-primary">{title}</div>
      </div>
      <p className="text-[12px] text-text-secondary leading-snug">{body}</p>
    </div>
  );
}

function Row({ title, found, verified, when }: { title: string; found: number; verified: number; when: string }) {
  return (
    <li className="px-5 py-3 flex items-center gap-3">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-button bg-surface-secondary border border-border-subtle">
        <Globe size={13} strokeWidth={1.75} className="text-text-secondary" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-text-primary truncate">{title}</div>
        <div className="text-[11.5px] text-text-secondary truncate">
          <span className="tabular-nums">{found.toLocaleString()}</span> contacts found ·{" "}
          <span className="tabular-nums">{verified.toLocaleString()}</span> verified · {when}
        </div>
      </div>
    </li>
  );
}
```

## `src/components/data/dashboard/enrichment-dashboard.tsx`

```tsx
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
  CustomChartCard,
  LeadProfile,
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
  /** Slim mode for the no-storage variant. Renders only the enrichment-rate
   *  KPI card — no breakdowns, no demographics, no charts. */
  slim?: boolean;
  /** When true, drop the "crm" source from all feeds (used in no-CRM variant
   *  where CRM-sourced rows would be a lie). */
  dropCrmSource?: boolean;

  // Controlled header filters. When provided, the dashboard does NOT render
  // its own time/source pills, the page wrapper does that via headerAction.
  range?: TimeRange;
  customStart?: Date | null;
  customEnd?: Date | null;
  onRangeChange?: (range: TimeRange, customStart: Date | null, customEnd: Date | null) => void;
  sourceFilter?: SourceFilter;
  onSourceFilterChange?: (v: SourceFilter) => void;
}

export function EnrichmentDashboard({
  forceEmpty = false,
  slim = false,
  dropCrmSource = false,
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

  // Internal fallback state, used if the parent doesn't control the filters.
  const [internalRange, setInternalRange] = useState<TimeRange>("30d");
  const [internalCustomStart, setInternalCustomStart] = useState<Date | null>(null);
  const [internalCustomEnd, setInternalCustomEnd] = useState<Date | null>(null);

  const range = rangeProp ?? internalRange;
  const customStart = customStartProp ?? internalCustomStart;
  const customEnd = customEndProp ?? internalCustomEnd;
  const sourceFilter: SourceFilter = sourceFilterProp ?? "all";
  const isControlled = onRangeChange != null;

  const [defaultCards, setDefaultCards] = useState<ChartCardId[]>([...DEFAULT_CHART_CARDS]);
  const [customCards, setCustomCards] = useState<CustomChartCard[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const s = loadDashboardState();
    setDefaultCards(s.defaultCards);
    setCustomCards(s.customCards);
    setHydrated(true);
  }, []);

  // Persist after hydration only, otherwise we'd wipe storage on first render.
  useEffect(() => {
    if (!hydrated) return;
    saveDashboardState({ defaultCards, customCards });
  }, [hydrated, defaultCards, customCards]);
  // Defaults are fixed for v1; setter exists for future "reorder/hide" UX.
  void setDefaultCards;

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

  // Empty-mode override: treat the demo's "empty" state as no runs. No-CRM
  // variant additionally strips crm-sourced runs from the feed.
  const effectiveRuns = useMemo(() => {
    if (isEmpty) return [];
    return dropCrmSource ? runs.filter((r) => r.source !== "crm") : runs;
  }, [isEmpty, dropCrmSource, runs]);

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

  // Empty state, no enriched leads in the active range.
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
      {/* Demographics breakdowns require per-lead persistence — hide under
          no-storage where rows are processed in-flight and never saved. */}
      {!slim && (
        <LeadExplorer
          profiles={profiles}
          defaultCards={defaultCards}
          customCards={customCards}
          onCustomCardsChange={setCustomCards}
        />
      )}
    </div>
  );
}

```

## `src/components/data/dashboard/reliability-section.tsx`

```tsx
"use client";

// Top half: KPI row + (trend | donut) two-column grid.
//
// Note: `profiles` is the source-filtered slice (drives KPIs + trend).
// `donutProfiles` is the full source mix in the time window, donut
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
        <div className="bg-white border border-border rounded-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
              Submitted vs enriched
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#D4B96A" }} />
                <span className="text-text-secondary">Submitted</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: "#5BA3A3" }} />
                <span className="text-text-secondary">Enriched</span>
              </span>
            </div>
          </div>
          <EnrichedTrendChart profiles={profiles} range={range} bounds={bounds} />
        </div>

        <div className="bg-white border border-border rounded-card p-5">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
            Split by source
          </div>
          <SourceDonut profiles={donutProfiles} activeSource={sourceFilter} />
        </div>
      </div>
    </section>
  );
}
```

## `src/components/data/dashboard/reliability-kpis.tsx`

```tsx
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
```

## `src/components/data/dashboard/enriched-trend-chart.tsx`

```tsx
"use client";

// Overlapping areas: total leads submitted for enrichment per bucket vs
// the subset that actually got enriched. Submitted = enriched + failed +
// not_enriched (everything that came in). Enriched = succeeded. The
// enriched area sits inside the submitted area, the gap visually = the
// not-yet-enriched / failed bucket. Bucketing decided by pickBucketing().

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { bucketKey, pickBucketing } from "@/lib/dashboard/trend-bucketing";
import type { LeadProfile, RangeBounds, TimeRange } from "@/lib/dashboard/types";

interface Props {
  profiles: LeadProfile[];
  range: TimeRange;
  bounds: RangeBounds;
}

interface TrendPoint {
  bucket: string;
  date: string;
  submitted: number;
  enriched: number;
  enrichedPct: number;
}

export function EnrichedTrendChart({ profiles, range, bounds }: Props) {
  const data = useMemo(() => buildTrend(profiles, range, bounds), [profiles, range, bounds]);

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[12px] text-text-tertiary">
        No data for this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(15,15,15,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary, #71717a)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={formatCount}
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary, #71717a)" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            (value as number).toLocaleString("en-IN"),
            name === "submitted" ? "Submitted" : "Enriched",
          ]}
          labelFormatter={(label) => label}
          // Force order: Submitted on top, Enriched below.
          itemSorter={(item) => (item.dataKey === "submitted" ? 0 : 1)}
        />
        {/* Outer envelope = total leads given for enrichment */}
        <Area
          type="monotone"
          dataKey="submitted"
          stroke="#D4B96A"
          fill="#D4B96A"
          fillOpacity={0.3}
          strokeWidth={1.5}
        />
        {/* Inner = subset that actually got enriched */}
        <Area
          type="monotone"
          dataKey="enriched"
          stroke="#5BA3A3"
          fill="#5BA3A3"
          fillOpacity={0.65}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function buildTrend(
  profiles: LeadProfile[],
  range: TimeRange,
  bounds: RangeBounds,
): TrendPoint[] {
  const mode = pickBucketing(range, bounds);
  const byBucket = new Map<string, { submitted: number; enriched: number }>();
  for (const p of profiles) {
    const ts = new Date(p.startedAt).getTime();
    if (Number.isNaN(ts)) continue;
    const k = bucketKey(ts, mode);
    let row = byBucket.get(k);
    if (!row) {
      row = { submitted: 0, enriched: 0 };
      byBucket.set(k, row);
    }
    // Every record that came in counts as "submitted for enrichment".
    row.submitted++;
    if (p.status === "enriched") row.enriched++;
  }

  const points: TrendPoint[] = [];
  for (const [k, v] of byBucket) {
    const enrichedPct = v.submitted === 0 ? 0 : Math.round((v.enriched / v.submitted) * 100);
    points.push({
      bucket: k,
      date: formatBucketLabel(k),
      submitted: v.submitted,
      enriched: v.enriched,
      enrichedPct,
    });
  }
  points.sort((a, b) => a.bucket.localeCompare(b.bucket));
  return points;
}

function formatBucketLabel(key: string): string {
  // "2026-05-27" → "May 27"
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatCount(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return String(v);
}
```

## `src/components/data/dashboard/source-donut.tsx`

```tsx
"use client";

// Donut + side legend for the source split (CRM / Bulk / Single).
// Style matches BreakdownChartCard's DonutVis: 180px wheel, big center
// number, hover-synced legend, palette aligned with the breakdown charts.
//
// `activeSource` reflects the top-level source filter. When set, the
// donut keeps the full mix but dims non-active slices and rings the
// active one. Hovering a slice/legend row pre-empts that filter cue
// and shows the focused bucket's count + pct in the center.

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { LeadProfile } from "@/lib/dashboard/types";
import type { SourceFilter } from "./source-filter-pills";

interface Props {
  profiles: LeadProfile[];
  activeSource?: SourceFilter;
}

// Muted palette, shared with BreakdownChartCard. Slate-blue / teal /
// violet pulled from the editorial set so this donut sits in the same
// visual register as the rest of the dashboard.
const SOURCE_META = {
  crm: { label: "CRM", color: "#8B9EC7" },
  bulk: { label: "Bulk", color: "#5BA3A3" },
  single: { label: "Single", color: "#9985CC" },
} as const;

const ORDER: (keyof typeof SOURCE_META)[] = ["crm", "bulk", "single"];

export function SourceDonut({ profiles, activeSource = "all" }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const counts: Record<keyof typeof SOURCE_META, number> = { crm: 0, bulk: 0, single: 0 };
  for (const p of profiles) counts[p.source]++;
  const total = profiles.length;

  const rows = ORDER.filter((k) => counts[k] > 0).map((k) => ({
    key: k,
    label: SOURCE_META[k].label,
    color: SOURCE_META[k].color,
    value: counts[k],
    pct: total === 0 ? 0 : Math.round((counts[k] / total) * 100),
  }));

  if (total === 0 || rows.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[12px] text-text-tertiary">
        No data.
      </div>
    );
  }

  const focused = hoverIdx != null ? rows[hoverIdx] : null;

  return (
    <div className="flex items-center gap-6 min-h-[200px]">
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={1}
              stroke="white"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {rows.map((r, i) => {
                const filterDimmed =
                  activeSource !== "all" && activeSource !== r.key;
                const filterActive =
                  activeSource !== "all" && activeSource === r.key;
                const hoverDimmed = hoverIdx != null && hoverIdx !== i;
                const hoverActive = hoverIdx === i;
                const dimmed = hoverDimmed || filterDimmed;
                const active = hoverActive || filterActive;
                return (
                  <Cell
                    key={r.key}
                    fill={r.color}
                    fillOpacity={dimmed ? 0.25 : 1}
                    stroke={active ? r.color : "white"}
                    strokeWidth={active ? 3 : 2}
                    onMouseEnter={() => setHoverIdx(i)}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[24px] font-semibold text-text-primary tabular-nums leading-none">
            {focused ? formatCompact(focused.value) : formatCompact(total)}
          </div>
          <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.4px] truncate max-w-[140px] mt-1.5">
            {focused ? `${focused.pct}%` : "total"}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {rows.map((r, i) => {
          const filterDimmed = activeSource !== "all" && activeSource !== r.key;
          const filterActive = activeSource !== "all" && activeSource === r.key;
          const hoverDimmed = hoverIdx != null && hoverIdx !== i;
          const hoverActive = hoverIdx === i;
          const dimmed = hoverDimmed || filterDimmed;
          const active = hoverActive || filterActive;
          return (
            <div
              key={r.key}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className={[
                "flex items-center gap-2.5 text-[13px] py-1.5 rounded-[5px] px-2 -mx-2 transition-opacity cursor-default",
                dimmed ? "opacity-40" : "opacity-100",
                active ? "bg-surface-secondary" : "",
              ].join(" ")}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: r.color }}
              />
              <span
                className={
                  active
                    ? "text-text-primary font-semibold truncate"
                    : "text-text-primary truncate"
                }
              >
                {r.label}
              </span>
              <span className="tabular-nums ml-auto whitespace-nowrap">
                <span className="text-text-tertiary">{r.pct}%</span>
                <span className="text-text-tertiary"> · </span>
                <span className="text-text-primary font-semibold">
                  {r.value.toLocaleString("en-IN")}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
```

## `src/components/data/dashboard/source-filter-pills.tsx`

```tsx
"use client";

// Top-level source filter as a dropdown: All / CRM / Bulk / Single.
// Filename kept as `source-filter-pills` for back-compat; the API is the
// same (value/onChange/profiles) but the visual is a button + popover.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { LeadProfile } from "@/lib/dashboard/types";

export type SourceFilter = "all" | "crm" | "bulk" | "single";

interface Props {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
  profiles: LeadProfile[];
  /** Hide the CRM option entirely (No-CRM variant). */
  dropCrmSource?: boolean;
}

const ALL_OPTIONS: { v: SourceFilter; l: string }[] = [
  { v: "all", l: "All sources" },
  { v: "crm", l: "CRM" },
  { v: "bulk", l: "Bulk" },
  { v: "single", l: "Single" },
];

const SHORT_LABEL: Record<SourceFilter, string> = {
  all: "All sources",
  crm: "CRM",
  bulk: "Bulk",
  single: "Single",
};

export function SourceFilterPills({ value, onChange, profiles, dropCrmSource = false }: Props) {
  const counts: Record<SourceFilter, number> = { all: profiles.length, crm: 0, bulk: 0, single: 0 };
  for (const p of profiles) counts[p.source]++;
  const OPTIONS = dropCrmSource ? ALL_OPTIONS.filter((o) => o.v !== "crm") : ALL_OPTIONS;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 inline-flex items-center gap-1.5 px-2.5 text-[11.5px] font-medium rounded-input border border-border bg-surface-secondary/60 text-text-primary hover:bg-white transition-colors"
      >
        <span className="text-text-secondary">Source:</span>
        <span>{SHORT_LABEL[value]}</span>
        <span className="text-text-tertiary tabular-nums text-[10.5px]">
          {counts[value].toLocaleString("en-IN")}
        </span>
        <ChevronDown size={12} strokeWidth={1.75} className="text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-30 w-[180px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08),0_0_0_1px_rgba(15,15,15,0.04)] p-1">
          {OPTIONS.map((opt) => {
            const active = opt.v === value;
            return (
              <button
                key={opt.v}
                onClick={() => {
                  onChange(opt.v);
                  setOpen(false);
                }}
                className={[
                  "w-full inline-flex items-center gap-2 h-7 px-2 rounded-[5px] text-[12px] transition-colors",
                  active ? "bg-surface-secondary text-text-primary font-medium" : "text-text-primary hover:bg-surface-secondary/70",
                ].join(" ")}
              >
                <span className="w-3.5 inline-flex justify-center">
                  {active && <Check size={12} strokeWidth={2} />}
                </span>
                <span className="flex-1 text-left">{opt.l}</span>
                <span className="text-text-tertiary tabular-nums text-[10.5px]">
                  {counts[opt.v].toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

## `src/components/data/dashboard/dashboard-time-filter.tsx`

```tsx
"use client";

// Segmented control: 7d / 14d / 30d / 90d / All / Custom. Reuses the existing
// DateRangePopover for custom ranges.

import { useState } from "react";
import { Calendar } from "lucide-react";
import { DateRangePopover, formatRangeLabel } from "@/components/data/date-range-popover";
import type { TimeRange } from "@/lib/dashboard/types";

interface Props {
  range: TimeRange;
  customStart: Date | null;
  customEnd: Date | null;
  onChange: (range: TimeRange, customStart: Date | null, customEnd: Date | null) => void;
}

const PRESETS: { v: TimeRange; l: string }[] = [
  { v: "7d", l: "7d" },
  { v: "14d", l: "14d" },
  { v: "30d", l: "30d" },
  { v: "90d", l: "90d" },
  { v: "all", l: "All" },
];

export function DashboardTimeFilter({ range, customStart, customEnd, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-0.5 gap-0.5">
      {PRESETS.map((opt) => {
        const active = opt.v === range;
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v, null, null)}
            className={[
              "h-6 px-2.5 text-[11.5px] font-medium rounded-[5px] transition-colors",
              active
                ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {opt.l}
          </button>
        );
      })}

      <button
        onClick={() => setCustomOpen((v) => !v)}
        className={[
          "h-6 inline-flex items-center gap-1 px-2 text-[11.5px] font-medium rounded-[5px] transition-colors",
          range === "custom"
            ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
            : "text-text-secondary hover:text-text-primary",
        ].join(" ")}
      >
        <Calendar size={11} strokeWidth={1.75} />
        {range === "custom" && customStart && customEnd
          ? formatRangeLabel(customStart, customEnd)
          : "Custom"}
      </button>

      <DateRangePopover
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        initialStart={customStart}
        initialEnd={customEnd}
        onApply={(s, e) => {
          onChange("custom", s, e);
          setCustomOpen(false);
        }}
      />
    </div>
  );
}
```

## `src/components/data/dashboard/lead-explorer.tsx`

```tsx
"use client";

// Chart grid. Two fixed rows of preset cards:
//   Row 1, 3-up: Location · Years of experience · Company tier
//   Row 2, 2-up: Net worth · Salary range
// Followed by user-built custom cards, then the "+ Build a chart" tile.

import { useState } from "react";
import {
  DEMOGRAPHIC_EXTRA_CARDS,
  FINANCIAL_CHART_CARDS,
  type ChartCardId,
  type CustomChartCard,
  type LeadProfile,
} from "@/lib/dashboard/types";

import { BreakdownChartCard } from "./breakdown-chart-card";
import { AddChartCardMenu } from "./add-chart-card-menu";
import { ChartBuilderDialog } from "./chart-builder-dialog";

interface Props {
  profiles: LeadProfile[];
  defaultCards: ChartCardId[];
  customCards: CustomChartCard[];
  onCustomCardsChange: (cards: CustomChartCard[]) => void;
}

export function LeadExplorer({
  profiles,
  defaultCards,
  customCards,
  onCustomCardsChange,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomChartCard | undefined>();

  const openNew = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (card: CustomChartCard) => {
    setEditing(card);
    setDialogOpen(true);
  };

  const handleSave = (card: CustomChartCard) => {
    const idx = customCards.findIndex((c) => c.id === card.id);
    if (idx === -1) onCustomCardsChange([...customCards, card]);
    else {
      const next = [...customCards];
      next[idx] = card;
      onCustomCardsChange(next);
    }
  };

  const handleRemove = (id: string) => {
    onCustomCardsChange(customCards.filter((c) => c.id !== id));
  };

  return (
    <section className="space-y-3">
      {/* Demographic 3-up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {defaultCards.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
      </div>

      {/* Age — single full-width horizontal bar row */}
      <div className="grid grid-cols-1 gap-3">
        {DEMOGRAPHIC_EXTRA_CARDS.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
      </div>

      {/* Financial 2-up: Net worth + Salary range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FINANCIAL_CHART_CARDS.map((cardId) => (
          <BreakdownChartCard
            key={cardId}
            mode="preset"
            cardId={cardId}
            profiles={profiles}
          />
        ))}
      </div>

      {/* Custom-built cards + the add-tile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {customCards.map((card) => (
          <BreakdownChartCard
            key={card.id}
            mode="custom"
            card={card}
            profiles={profiles}
            onEdit={() => openEdit(card)}
            onRemove={() => handleRemove(card.id)}
          />
        ))}
        <AddChartCardMenu onClick={openNew} />
      </div>

      <ChartBuilderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        profiles={profiles}
        existing={editing}
        onSave={handleSave}
      />
    </section>
  );
}
```

## `src/components/data/dashboard/breakdown-chart-card.tsx`

```tsx
"use client";

// One chart card. Picks the visualization off the dim's chartKind:
//   - donut  → Pie + side legend (nominal / categorical splits)
//   - column → Vertical bar chart (ordinal / range-bucketed values)
//
// Two modes:
//   1. Preset, pass `cardId` (source/company_tier/seniority/...)
//   2. Custom build, pass `card` (CustomChartCard). Filters in `card.filters`
//      are AND-ed onto the incoming profiles before bucketing.

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { breakdownByDim } from "@/lib/dashboard/breakdown";
import {
  CHART_CARD_LABEL,
  CHART_CARD_TO_DIM,
  DIM_REGISTRY,
} from "@/lib/dashboard/dim-registry";
import { evalFilters, clauseLabel } from "@/lib/dashboard/filter-eval";
import type {
  BreakdownRow,
  ChartCardId,
  CustomChartCard,
  FilterDim,
  LeadProfile,
} from "@/lib/dashboard/types";

interface PresetProps {
  mode: "preset";
  cardId: ChartCardId;
  profiles: LeadProfile[];
}

interface CustomProps {
  mode: "custom";
  card: CustomChartCard;
  profiles: LeadProfile[];
  onEdit?: () => void;
  onRemove?: () => void;
}

type Props = PresetProps | CustomProps;

// Muted editorial palette. Matches the campaigns/lead-insights tones so
// charts across modules feel like one product, not a Christmas tree.
// Earthier than the old set: teal, slate-blue, coral, mustard, taupe.
const PALETTE = [
  "#5BA3A3", // muted teal
  "#8B9EC7", // soft slate-blue
  "#E8927C", // soft coral
  "#D4B96A", // mustard
  "#A8A29E", // warm gray
  "#B8956A", // tan
  "#94A3B8", // cool gray
  "#9985CC", // soft violet
];

function bucketColor(_bucket: string, idx: number): string {
  return PALETTE[idx % PALETTE.length];
}

export function BreakdownChartCard(props: Props) {
  const isCustom = props.mode === "custom";
  const dimId: FilterDim = isCustom ? props.card.dim : CHART_CARD_TO_DIM[props.cardId];
  const dim = DIM_REGISTRY[dimId];
  const label = isCustom ? props.card.name : CHART_CARD_LABEL[props.cardId];

  // Apply local filters for custom cards.
  const scoped = isCustom
    ? props.profiles.filter((p) => evalFilters(p, props.card.filters))
    : props.profiles;

  const rows = breakdownByDim(scoped, dimId);
  const total = scoped.length;
  const chartKind = dim.chartKind ?? "column";

  return (
    <div className="group relative bg-white border border-border rounded-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary truncate">
            {isCustom ? `Slice by ${dim.label}` : label}
          </div>
          {isCustom && (
            <div className="text-[14px] font-semibold text-text-primary truncate mt-0.5">
              {label}
            </div>
          )}
        </div>

        {isCustom && (props.onEdit || props.onRemove) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {props.onEdit && (
              <button
                onClick={props.onEdit}
                aria-label={`Edit ${label}`}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <Pencil size={12} strokeWidth={1.75} />
              </button>
            )}
            {props.onRemove && (
              <button
                onClick={props.onRemove}
                aria-label={`Remove ${label}`}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <X size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter chips (custom cards only) */}
      {isCustom && props.card.filters.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {props.card.filters.map((c, i) => (
            <span
              key={`${c.dim}-${i}`}
              className="inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-text-secondary bg-surface-secondary rounded-[4px]"
            >
              {clauseLabel(c)}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      {rows.length === 0 ? (
        <div className="text-[12px] text-text-tertiary py-6 text-center">No data.</div>
      ) : chartKind === "donut" ? (
        <DonutVis rows={rows} total={total} />
      ) : chartKind === "hbar" ? (
        <HBarVis rows={rows} total={total} />
      ) : (
        <ColumnVis rows={rows} />
      )}
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────

function DonutVis({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const data = rows.map((r, i) => ({
    name: r.bucket,
    value: r.count,
    color: bucketColor(r.bucket, i),
  }));

  const focused = activeIdx != null ? rows[activeIdx] : null;

  return (
    <div className="flex items-center gap-6 min-h-[200px]">
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={1}
              stroke="white"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseLeave={() => setActiveIdx(null)}
            >
              {data.map((d, i) => {
                const dimmed = activeIdx != null && activeIdx !== i;
                const active = activeIdx === i;
                return (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    fillOpacity={dimmed ? 0.25 : 1}
                    stroke={active ? d.color : "white"}
                    strokeWidth={active ? 3 : 2}
                    onMouseEnter={() => setActiveIdx(i)}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[24px] font-semibold text-text-primary tabular-nums leading-none">
            {focused ? formatCompact(focused.count) : formatCompact(total)}
          </div>
          <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.4px] truncate max-w-[140px] mt-1.5">
            {focused ? `${focused.pct}%` : "total"}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1 max-h-[200px] overflow-y-auto pr-1">
        {rows.map((r, i) => {
          const dimmed = activeIdx != null && activeIdx !== i;
          const active = activeIdx === i;
          return (
            <div
              key={r.bucket}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              className={[
                "flex items-center gap-2.5 text-[13px] py-1.5 rounded-[5px] px-2 -mx-2 transition-opacity cursor-default",
                dimmed ? "opacity-40" : "opacity-100",
                active ? "bg-surface-secondary" : "",
              ].join(" ")}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: bucketColor(r.bucket, i) }}
              />
              <span className={active ? "text-text-primary font-semibold truncate" : "text-text-primary truncate"}>
                {r.bucket}
              </span>
              <span className="tabular-nums ml-auto whitespace-nowrap">
                <span className="text-text-tertiary">{r.pct}%</span>
                <span className="text-text-tertiary"> · </span>
                <span className="text-text-primary font-semibold">{r.count.toLocaleString("en-IN")}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Column ──────────────────────────────────────────────────────────────

function ColumnVis({ rows }: { rows: BreakdownRow[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const data = rows.map((r, i) => ({
    bucket: r.bucket,
    count: r.count,
    pct: r.pct,
    color: bucketColor(r.bucket, i),
  }));

  return (
    <div>
      <div className="h-[180px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: "#525252" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #E5E5E5",
              }}
              formatter={(v) => [Number(v).toLocaleString("en-IN"), "Leads"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => {
                const dimmed = activeIdx != null && activeIdx !== i;
                return (
                  <Cell
                    key={d.bucket}
                    fill={d.color}
                    fillOpacity={dimmed ? 0.3 : 1}
                    onMouseEnter={() => setActiveIdx(i)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {rows.map((r, i) => {
          const dimmed = activeIdx != null && activeIdx !== i;
          const active = activeIdx === i;
          return (
            <div
              key={r.bucket}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              className={[
                "flex items-center gap-2 text-[12px] px-1.5 py-1 rounded-[4px] transition-opacity cursor-default",
                dimmed ? "opacity-40" : "opacity-100",
                active ? "bg-surface-secondary" : "",
              ].join(" ")}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: bucketColor(r.bucket, i) }}
              />
              <span className={active ? "text-text-primary font-semibold" : "text-text-secondary"}>
                {r.bucket}
              </span>
              <span className="tabular-nums">
                <span className="text-text-primary font-semibold">{r.count.toLocaleString("en-IN")}</span>
                <span className="text-text-tertiary"> · {r.pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Horizontal bar ──────────────────────────────────────────────────────
// Ranked horizontal bars, labels on the left, track + filled bar, count
// and pct on the right. Native divs (no recharts) so the row scales cleanly
// at any card width. Used for ordinal small-bucket dims like age_group.

function HBarVis({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Scale each bar against the largest bucket so small ones stay readable.
  const max = Math.max(...rows.map((r) => r.count), 1);
  void total;

  return (
    <div className="space-y-2.5 py-1.5">
      {rows.map((r, i) => {
        const dimmed = activeIdx != null && activeIdx !== i;
        const active = activeIdx === i;
        const color = bucketColor(r.bucket, i);
        const widthPct = (r.count / max) * 100;
        return (
          <div
            key={r.bucket}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            className={[
              "grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-1 -mx-2 rounded-[5px] cursor-default transition-opacity",
              dimmed ? "opacity-40" : "opacity-100",
              active ? "bg-surface-secondary" : "",
            ].join(" ")}
          >
            <span
              className={
                active
                  ? "text-[12.5px] text-text-primary font-semibold truncate"
                  : "text-[12.5px] text-text-secondary truncate"
              }
            >
              {r.bucket}
            </span>
            <div className="h-2.5 rounded-full bg-surface-page/80 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${widthPct}%`,
                  background: color,
                  opacity: dimmed ? 0.5 : 1,
                }}
              />
            </div>
            <span className="text-[12px] tabular-nums whitespace-nowrap">
              <span className="text-text-primary font-semibold">
                {r.count.toLocaleString("en-IN")}
              </span>
              <span className="text-text-tertiary"> · {r.pct}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

## `src/components/data/dashboard/add-chart-card-menu.tsx`

```tsx
"use client";

// Dashed "+ Build a chart" tile at the end of the grid. Clicking it opens
// the ChartBuilderDialog (state lives in the parent so the same modal can
// also handle "edit existing"). Intentionally dumb, purely a visual CTA.

import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
}

export function AddChartCardMenu({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[160px] border border-dashed border-border rounded-card text-[12px] text-text-secondary hover:text-text-primary hover:border-text-primary/40 hover:bg-white transition-colors flex flex-col items-center justify-center gap-1.5"
    >
      <Plus size={16} strokeWidth={1.75} />
      <span className="font-medium">Build a chart</span>
      <span className="text-[10.5px] text-text-tertiary px-4 text-center leading-tight">
        Slice your leads by any field. Filter. Save.
      </span>
    </button>
  );
}
```

## `src/components/data/dashboard/add-filter-menu.tsx`

```tsx
"use client";

// Popover invoked from "+ Add filter". Step 1: pick a dimension. Step 2: pick
// values for it (enum: checkbox list; range: min/max inputs; bool: Yes/No).
// Confirms with Apply → returns a new FilterClause to the parent.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { DIM_REGISTRY } from "@/lib/dashboard/dim-registry";
import type { FilterClause, FilterDim } from "@/lib/dashboard/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (clause: FilterClause) => void;
  /** Dims already in the active filter set, disabled in the picker. */
  activeDims: FilterDim[];
}

export function AddFilterMenu({ open, onClose, onApply, activeDims }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<"pick-dim" | "pick-value">("pick-dim");
  const [dim, setDim] = useState<FilterDim | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("pick-dim");
      setDim(null);
      setSelected(new Set());
      setRangeMin("");
      setRangeMax("");
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pickedDim = dim ? DIM_REGISTRY[dim] : null;

  return (
    <div
      ref={rootRef}
      className="absolute top-full left-0 mt-1 z-30 min-w-[260px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08)] overflow-hidden"
    >
      {step === "pick-dim" && (
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {Object.values(DIM_REGISTRY).map((d) => {
            const disabled = activeDims.includes(d.id);
            return (
              <button
                key={d.id}
                disabled={disabled}
                onClick={() => {
                  setDim(d.id);
                  setStep("pick-value");
                }}
                className={[
                  "w-full text-left px-3 py-2 text-[12.5px] flex items-center justify-between gap-3",
                  disabled
                    ? "text-text-tertiary cursor-not-allowed"
                    : "text-text-primary hover:bg-surface-page",
                ].join(" ")}
              >
                <span>{d.label}</span>
                {disabled ? (
                  <span className="text-[10px] text-text-tertiary">in use</span>
                ) : (
                  <ChevronRight size={12} strokeWidth={1.75} className="text-text-tertiary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {step === "pick-value" && pickedDim && (
        <div className="p-3 w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
              {pickedDim.label}
            </div>
            <button
              onClick={() => setStep("pick-dim")}
              className="text-[11px] text-text-tertiary hover:text-text-primary"
            >
              ← back
            </button>
          </div>

          {pickedDim.type === "enum" && pickedDim.values && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto -mx-1 px-1">
              {pickedDim.values.map((v) => {
                const checked = selected.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(v);
                      else next.add(v);
                      setSelected(next);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[12.5px] rounded-input hover:bg-surface-page"
                  >
                    <span
                      className={[
                        "w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center flex-shrink-0",
                        checked ? "bg-text-primary border-text-primary" : "border-border",
                      ].join(" ")}
                    >
                      {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                    </span>
                    <span className="text-text-primary">{v}</span>
                  </button>
                );
              })}
            </div>
          )}

          {(pickedDim.type === "range_money" || pickedDim.type === "range_number") && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={`min${pickedDim.unitHint ? ` (${pickedDim.unitHint})` : ""}`}
                value={rangeMin}
                onChange={(e) => setRangeMin(e.target.value)}
                className="flex-1 h-7 px-2 text-[12px] bg-white border border-border rounded-input"
              />
              <span className="text-text-tertiary text-[11px]">to</span>
              <input
                type="number"
                placeholder={`max${pickedDim.unitHint ? ` (${pickedDim.unitHint})` : ""}`}
                value={rangeMax}
                onChange={(e) => setRangeMax(e.target.value)}
                className="flex-1 h-7 px-2 text-[12px] bg-white border border-border rounded-input"
              />
            </div>
          )}

          {pickedDim.type === "bool" && (
            <div className="flex gap-2">
              {["Yes", "No"].map((v) => {
                const checked = selected.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => setSelected(new Set([v]))}
                    className={[
                      "flex-1 h-7 text-[12px] border rounded-input",
                      checked
                        ? "bg-text-primary border-text-primary text-white"
                        : "bg-white border-border text-text-primary",
                    ].join(" ")}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (!pickedDim) return;
                let clause: FilterClause | null = null;
                if (pickedDim.type === "enum" && selected.size > 0) {
                  clause = { dim: pickedDim.id, op: "in", value: [...selected] };
                } else if (pickedDim.type === "range_money" || pickedDim.type === "range_number") {
                  const scale = pickedDim.inputScale ?? 1;
                  const lo = rangeMin ? Number(rangeMin) * scale : NaN;
                  const hi = rangeMax ? Number(rangeMax) * scale : NaN;
                  if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
                    clause = { dim: pickedDim.id, op: "between", value: [lo, hi] };
                  } else if (!Number.isNaN(lo)) {
                    clause = { dim: pickedDim.id, op: "gte", value: lo };
                  } else if (!Number.isNaN(hi)) {
                    clause = { dim: pickedDim.id, op: "lte", value: hi };
                  }
                } else if (pickedDim.type === "bool" && selected.size > 0) {
                  const val = selected.has("Yes");
                  clause = { dim: pickedDim.id, op: "eq", value: val ? "Yes" : "No" };
                }
                if (clause) {
                  onApply(clause);
                  onClose();
                }
              }}
              className="h-7 px-3 text-[12px] font-medium bg-text-primary text-white rounded-button hover:bg-accent-hover transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## `src/components/data/dashboard/chart-builder-dialog.tsx`

```tsx
"use client";

// Modal: build a custom chart card.
//   1. Pick a slice-by dimension (grouped by Professional / Financial / Meta).
//   2. Add filters via AddFilterMenu chips (each filter is AND-ed).
//   3. Name it, see a live preview, Save.
//
// Save returns a CustomChartCard to the caller. The caller persists.

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { groupedDims, DIM_REGISTRY } from "@/lib/dashboard/dim-registry";
import { newCardId } from "@/lib/dashboard/dashboard-storage";
import { clauseLabel } from "@/lib/dashboard/filter-eval";
import type {
  CustomChartCard,
  FilterClause,
  FilterDim,
  LeadProfile,
} from "@/lib/dashboard/types";
import { AddFilterMenu } from "./add-filter-menu";
import { BreakdownChartCard } from "./breakdown-chart-card";

interface Props {
  open: boolean;
  onClose: () => void;
  /** All profiles in the active time/source window, for the live preview. */
  profiles: LeadProfile[];
  /** Existing card to edit (optional). When set, dialog opens pre-filled. */
  existing?: CustomChartCard;
  onSave: (card: CustomChartCard) => void;
}

export function ChartBuilderDialog({ open, onClose, profiles, existing, onSave }: Props) {
  const [dim, setDim] = useState<FilterDim>(existing?.dim ?? "seniority");
  const [name, setName] = useState<string>(existing?.name ?? "");
  const [filters, setFilters] = useState<FilterClause[]>(existing?.filters ?? []);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    setDim(existing?.dim ?? "seniority");
    setName(existing?.name ?? "");
    setFilters(existing?.filters ?? []);
    setFilterMenuOpen(false);
  }, [open, existing]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => groupedDims(), []);
  const dimLabel = DIM_REGISTRY[dim]?.label ?? dim;

  // Sensible default name derived from slice + filter set.
  const placeholderName = useMemo(() => {
    if (filters.length === 0) return `By ${dimLabel}`;
    return `${dimLabel} · ${filters.length} filter${filters.length === 1 ? "" : "s"}`;
  }, [dim, filters, dimLabel]);

  const previewCard: CustomChartCard = useMemo(
    () => ({
      id: existing?.id ?? "preview",
      name: name.trim() || placeholderName,
      dim,
      filters,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }),
    [existing, name, placeholderName, dim, filters],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white border border-border rounded-card w-[820px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(15,15,15,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <div className="text-[14px] font-semibold text-text-primary">
              {existing ? "Edit chart" : "Build a chart"}
            </div>
            <div className="text-[11.5px] text-text-secondary mt-0.5">
              Slice your enriched leads by any dimension. Filter to narrow it down.
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary rounded-input"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px]">
          {/* Left: form */}
          <div className="p-5 border-r border-border space-y-5 overflow-visible">
            {/* Name */}
            <div>
              <label className="block text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
                Chart name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholderName}
                className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-input placeholder:text-text-tertiary focus:outline-none focus:border-text-primary/40"
              />
            </div>

            {/* Slice by */}
            <div>
              <label className="block text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
                Slice by
              </label>
              <SlicePicker value={dim} onChange={setDim} grouped={grouped} />
            </div>

            {/* Filters */}
            <div>
              <label className="block text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
                Filters
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {filters.length === 0 && (
                  <span className="text-[12px] text-text-tertiary">
                    No filters, slice covers all leads in the active window.
                  </span>
                )}
                {filters.map((c, i) => (
                  <span
                    key={`${c.dim}-${i}`}
                    className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 text-[11.5px] font-medium text-white bg-text-primary rounded-input"
                  >
                    {clauseLabel(c)}
                    <button
                      onClick={() => setFilters(filters.filter((_, j) => j !== i))}
                      aria-label="Remove filter"
                      className="p-0.5 -mr-0.5 hover:bg-white/15 rounded-[3px] transition-colors"
                    >
                      <X size={11} strokeWidth={2} />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setFilterMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-medium text-text-secondary bg-white border border-border rounded-input hover:text-text-primary"
                  >
                    <Plus size={11} strokeWidth={2} />
                    Add filter
                  </button>
                  <AddFilterMenu
                    open={filterMenuOpen}
                    onClose={() => setFilterMenuOpen(false)}
                    activeDims={filters.map((f) => f.dim)}
                    onApply={(c) => setFilters([...filters, c])}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="p-5 bg-surface-page overflow-y-auto">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-2">
              Preview
            </div>
            <BreakdownChartCard mode="custom" card={previewCard} profiles={profiles} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-page">
          <button
            onClick={onClose}
            className="h-8 px-3 text-[12.5px] font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const card: CustomChartCard = {
                id: existing?.id ?? newCardId(),
                name: name.trim() || placeholderName,
                dim,
                filters,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
              };
              onSave(card);
              onClose();
            }}
            className="h-8 px-4 text-[12.5px] font-medium bg-text-primary text-white rounded-button hover:bg-accent-hover transition-colors"
          >
            {existing ? "Save changes" : "Save chart"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Slice picker (grouped dropdown) ───────────────────────────────────────

function SlicePicker({
  value,
  onChange,
  grouped,
}: {
  value: FilterDim;
  onChange: (v: FilterDim) => void;
  grouped: ReturnType<typeof groupedDims>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = DIM_REGISTRY[value];

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 px-3 inline-flex items-center justify-between text-[13px] bg-white border border-border rounded-input hover:border-text-primary/40"
      >
        <span className="flex items-center gap-2">
          <span className="text-text-tertiary text-[10.5px] uppercase tracking-[0.4px]">
            {current.group}
          </span>
          <span className="text-text-primary">{current.label}</span>
        </span>
        <ChevronDown size={12} strokeWidth={1.75} className="text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 w-full max-h-[280px] overflow-y-auto bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08)] py-1">
          {(["Professional", "Financial", "Meta"] as const).map((g) => {
            const dims = grouped[g];
            if (dims.length === 0) return null;
            return (
              <div key={g}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-text-tertiary">
                  {g}
                </div>
                {dims.map((d) => {
                  const active = d.id === value;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        onChange(d.id);
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-1.5 text-[12.5px] flex items-center justify-between hover:bg-surface-page",
                        active ? "text-text-primary font-medium" : "text-text-primary",
                      ].join(" ")}
                    >
                      <span>{d.label}</span>
                      <span className="text-[10px] text-text-tertiary">{labelType(d.type)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function labelType(t: string): string {
  switch (t) {
    case "enum":
      return "categorical";
    case "range_money":
      return "money";
    case "range_number":
      return "numeric";
    case "bool":
      return "yes / no";
    default:
      return t;
  }
}
```

## `src/components/enrichment-crm/crm-tabs.tsx`

```tsx
"use client";

import { Activity, Upload, Search, type LucideIcon } from "lucide-react";

export type CrmTabKey = "activity" | "bulk" | "single";

const TABS: { key: CrmTabKey; label: string; icon: LucideIcon }[] = [
  { key: "activity", label: "CRM activity",  icon: Activity },
  { key: "bulk",     label: "Bulk upload",   icon: Upload },
  { key: "single",   label: "Single lookup", icon: Search },
];

export function CrmTabs({ value, onChange }: { value: CrmTabKey; onChange: (k: CrmTabKey) => void }) {
  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-border mb-6">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={[
              "inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium transition-colors -mb-px border-b-2",
              active
                ? "text-text-primary border-text-primary"
                : "text-text-secondary border-transparent hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={13} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
```

## `src/components/enrichment-crm/crm-status-banner.tsx`

```tsx
"use client";

import { useEnrichmentCrmStore, type CrmConnection } from "@/lib/enrichment-crm-data";
import { Database, Settings2 } from "lucide-react";

interface BannerProps {
  onViewMapping?: () => void;
  mappingOpen?: boolean;
}

// Small horizontal status strip that sits above the tabs.
// Assumes the CRM is connected, mapped, and pre-configured, this is read-only.
export function CrmStatusBanner({ onViewMapping, mappingOpen }: BannerProps = {}) {
  const conn = useEnrichmentCrmStore((s) => s.crmConnection);

  return (
    <div className="flex items-center gap-3 flex-wrap bg-white border border-border rounded-card px-4 py-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-button bg-[#F0FDF4]">
          <Database size={14} strokeWidth={1.75} className="text-[#15803D]" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-text-primary capitalize">{conn.provider}</span>
            <StatusDot status={conn.status} />
            <span className="text-[12px] text-text-secondary truncate">{conn.accountName}</span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Last sync {relative(conn.lastSyncedAt)} · {conn.mappedFieldCount} fields mapped · Policy: {policyLabel(conn.writeBackPolicy)}
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onViewMapping}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-button transition-colors bg-white"
          title="View field mapping (read-only)"
          aria-expanded={mappingOpen}
        >
          <Settings2 size={12} strokeWidth={1.75} />
          {mappingOpen ? "Hide mapping" : "View mapping"}
        </button>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: CrmConnection["status"] }) {
  const tone =
    status === "connected" ? "bg-[#22C55E]" :
    status === "degraded" ? "bg-[#F59E0B]" :
    "bg-[#EF4444]";
  const label = status === "connected" ? "Connected" : status === "degraded" ? "Degraded" : "Disconnected";
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-text-secondary">
      <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function policyLabel(p: CrmConnection["writeBackPolicy"]): string {
  return p === "fill_blanks" ? "Fill blanks only" : p === "overwrite" ? "Overwrite all" : "Selective fields";
}

function relative(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
```

## `src/components/enrichment-crm/crm-connect-nudge.tsx`

```tsx
"use client";

// Shown on /enrichment-crm-empty, the "no CRM connected" flow.
// Two pieces:
//   - CrmConnectBanner: amber strip at the top of the page, replaces CrmStatusBanner.
//   - CrmConnectHero:  big card inside the Activity tab, replaces CrmActivity.
// Both nudge the user toward connecting a CRM. Bulk + Single tabs still work below.

import { ArrowRight, Briefcase, CheckCircle2, CircleDollarSign, PlugZap, Sparkles, Upload, UserSearch, Zap } from "lucide-react";

interface NudgeProps {
  onConnect: () => void;
  onManual?: () => void; // switch to bulk/single tab
  /** When true, banner shows the post-submit "we're on it" state instead of CTA. */
  pending?: boolean;
}

// ── Top banner ───────────────────────────────────────────────────────────

export function CrmConnectBanner({ onConnect, pending = false }: NudgeProps) {
  // Pending state: request submitted, support team is the next mover.
  if (pending) {
    return (
      <div className="flex items-start sm:items-center gap-3 flex-wrap bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] border border-[#BBF7D0] rounded-card px-4 py-3 mb-4">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-button bg-white border border-[#BBF7D0] flex-shrink-0">
          <CheckCircle2 size={15} strokeWidth={1.75} className="text-[#15803D]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text-primary">
            Your CRM connect request is in
          </div>
          <div className="text-[12px] text-text-secondary mt-0.5">
            Action on your side is complete. Our team will reach out to wire up the integration. Bulk and single lookup still work in the meantime.
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11.5px] font-medium text-[#15803D] bg-white border border-[#BBF7D0] rounded-button flex-shrink-0">
          Request submitted
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start sm:items-center gap-3 flex-wrap bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border border-[#FDE68A] rounded-card px-4 py-3 mb-4">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-button bg-white border border-[#FDE68A] flex-shrink-0">
        <PlugZap size={15} strokeWidth={1.75} className="text-[#B45309]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text-primary">
          Your CRM isn&rsquo;t connected yet
        </div>
        <div className="text-[12px] text-text-secondary mt-0.5">
          Connect Salesforce, HubSpot, Zoho, LeadSquared, or a custom webhook to enrich leads automatically the moment they hit your CRM, and write the enriched data back to the same record.
        </div>
      </div>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors flex-shrink-0"
      >
        Connect CRM
        <ArrowRight size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

// ── Activity-tab hero (big card) ────────────────────────────────────────

export function CrmConnectHero({ onConnect, onManual }: NudgeProps) {
  return (
    <section className="bg-white border border-border rounded-card overflow-hidden">
      {/* Hero header */}
      <div className="relative px-6 sm:px-10 pt-10 pb-8 bg-gradient-to-br from-[#FAFAFA] via-white to-[#F0FDF4] border-b border-border-subtle overflow-hidden">
        {/* Decorative glyph */}
        <div className="absolute top-6 right-6 hidden md:flex items-center justify-center w-16 h-16 rounded-full bg-white border border-border-subtle">
          <PlugZap size={22} strokeWidth={1.5} className="text-text-secondary" />
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-badge px-2 py-1 mb-3">
          <Sparkles size={11} strokeWidth={2} />
          Recommended setup
        </div>
        <h2 className="text-[22px] sm:text-[26px] font-semibold text-text-primary tracking-tight max-w-[640px]">
          Plug in your CRM to unlock auto-enrichment
        </h2>
        <p className="text-[13.5px] text-text-secondary mt-2 max-w-[640px] leading-relaxed">
          Every new lead in your CRM gets <span className="font-medium text-text-primary">Professional</span> and{" "}
          <span className="font-medium text-text-primary">Financial</span> data appended automatically, then written back to the same record. No manual exports, no copy-paste.
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors"
          >
            Connect CRM
            <ArrowRight size={13} strokeWidth={2} />
          </button>
          {onManual && (
            <button
              onClick={onManual}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-text-secondary hover:text-text-primary border border-border rounded-button bg-white transition-colors"
            >
              <Upload size={13} strokeWidth={1.75} />
              Use CSV upload meanwhile
            </button>
          )}
        </div>
      </div>

      {/* What enrichment fills in */}
      <div className="px-6 sm:px-10 py-7 border-b border-border-subtle">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
          What enrichment fills in
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DataCard
            icon={<Briefcase size={14} strokeWidth={1.75} />}
            tint="blue"
            title="Professional"
            items={["Verified name & gender", "Job title & seniority", "Company, industry, size", "LinkedIn URL & work email"]}
          />
          <DataCard
            icon={<CircleDollarSign size={14} strokeWidth={1.75} />}
            tint="green"
            title="Financial"
            items={["Income band", "Net-worth signals", "Investment capacity", "Affordability score"]}
          />
        </div>
      </div>

      {/* How it works */}
      <div className="px-6 sm:px-10 py-7 border-b border-border-subtle">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
          How it works once connected
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Step
            n={1}
            icon={<UserSearch size={13} strokeWidth={1.75} />}
            title="Lead lands in CRM"
            body="Web form, API, native entry, chat, or import, Revspot watches every channel."
          />
          <Step
            n={2}
            icon={<Zap size={13} strokeWidth={1.75} />}
            title="We enrich in real time"
            body="Pro + Financial data attached within seconds. Zero manual work."
          />
          <Step
            n={3}
            icon={<ArrowRight size={13} strokeWidth={1.75} />}
            title="Written back to the lead"
            body="Mapped to your CRM fields. Sales reps see enriched data on the same record."
          />
        </div>
      </div>

      {/* Supported providers */}
      <div className="px-6 sm:px-10 py-6 bg-surface-page/40">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-3">
          Supported CRMs
        </div>
        <div className="flex flex-wrap gap-2">
          {["Salesforce", "HubSpot", "Zoho", "LeadSquared", "Freshsales", "Paramantra", "Custom webhook"].map((p) => (
            <span
              key={p}
              className="inline-flex items-center text-[12px] font-medium text-text-secondary bg-white border border-border rounded-button px-2.5 py-1"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Small bits ──────────────────────────────────────────────────────────

function DataCard({
  icon,
  tint,
  title,
  items,
}: {
  icon: React.ReactNode;
  tint: "blue" | "green";
  title: string;
  items: string[];
}) {
  const tintBg = tint === "blue" ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-[#F0FDF4] text-[#15803D]";
  return (
    <div className="border border-border-subtle rounded-card p-4 bg-white">
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-button ${tintBg}`}>
          {icon}
        </span>
        <div className="text-[13px] font-semibold text-text-primary">{title}</div>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it} className="text-[12.5px] text-text-secondary flex items-start gap-2">
            <span className="mt-1 w-1 h-1 rounded-full bg-text-tertiary flex-shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-text-primary text-white text-[10px] font-semibold tabular-nums">
          {n}
        </span>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-button bg-surface-secondary text-text-secondary">
          {icon}
        </span>
        <span className="text-[12.5px] font-semibold text-text-primary">{title}</span>
      </div>
      <p className="text-[12px] text-text-secondary leading-snug pl-7">{body}</p>
    </div>
  );
}
```

## `src/components/enrichment-crm/crm-connect-modal.tsx`

```tsx
"use client";

// Modal that opens when user clicks "Connect CRM" anywhere in the enrichment
// product. We don't ship a self-serve OAuth flow yet, the integration is a
// support-assisted handoff. Two states:
//   1. Form — short pitch + Submit button
//   2. Success — request submitted, support will reach out
// After submit we flip a flag in useDemoMode so the banner reads "request in"
// and the modal opens directly into success on re-open.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Headset, PlugZap, X } from "lucide-react";

import { useDemoMode } from "@/lib/demo-mode";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrmConnectModal({ open, onClose }: Props) {
  const { crmRequestSubmitted, setCrmRequestSubmitted } = useDemoMode();
  // Local submitting state so the button shows a spinner. The real submit is
  // a no-op in the prototype, but we still gate the success transition on a
  // short delay to keep the feedback feeling real.
  const [submitting, setSubmitting] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = () => {
    if (crmRequestSubmitted) {
      onClose();
      return;
    }
    setSubmitting(true);
    // Simulated handoff. Real impl would POST to /api/support/crm-request.
    window.setTimeout(() => {
      setCrmRequestSubmitted(true);
      setSubmitting(false);
    }, 650);
  };

  const showSuccess = crmRequestSubmitted;

  // Portal to body so the dialog isn't trapped inside a transformed ancestor
  // (DataPageShell wraps content in a motion.div that applies transform on
  // mount, which breaks `position: fixed` for descendants).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-connect-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[min(440px,calc(100vw-32px))] bg-white border border-border rounded-card shadow-[0_24px_64px_rgba(15,15,15,0.18),0_0_0_1px_rgba(15,15,15,0.04)]"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
            >
              <X size={16} strokeWidth={1.75} />
            </button>

            {!showSuccess && (
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-card bg-[#FEF3C7] border border-[#FDE68A] flex-shrink-0">
                    <PlugZap size={16} strokeWidth={1.75} className="text-[#B45309]" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div
                      id="crm-connect-title"
                      className="text-[15px] font-semibold text-text-primary leading-tight"
                    >
                      Connect with support to wire up your CRM
                    </div>
                    <p className="text-[12.5px] text-text-secondary leading-snug mt-1.5">
                      Send a request and our integrations team will reach out to set up the connection.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-border-subtle">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
                    <Headset size={12} strokeWidth={1.75} />
                    Typically a single 30-min call.
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors disabled:opacity-60 disabled:cursor-progress"
                  >
                    {submitting ? "Submitting…" : "Request connection"}
                    {!submitting && <ArrowRight size={13} strokeWidth={2} />}
                  </button>
                </div>
              </div>
            )}

            {showSuccess && (
              <div className="p-6 text-center">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] mx-auto mb-4">
                  <CheckCircle2 size={22} strokeWidth={1.75} className="text-[#15803D]" />
                </span>
                <div className="text-[16px] font-semibold text-text-primary mb-1.5">
                  Request submitted
                </div>
                <p className="text-[12.5px] text-text-secondary leading-relaxed max-w-[340px] mx-auto mb-5">
                  Our integrations team will reach out to set up the CRM connection. No further action needed on your side.
                </p>
                <div className="pt-4 border-t border-border-subtle flex items-center justify-center">
                  <button
                    onClick={onClose}
                    className="inline-flex items-center h-9 px-5 text-[13px] font-medium text-text-primary bg-surface-secondary hover:bg-surface-page rounded-button transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
```

## `src/components/enrichment-crm/crm-activity.tsx`

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronRight, Download, Search, X } from "lucide-react";
import { useEnrichmentCrmStore, type RunRecord, type CrmLeadChannel } from "@/lib/enrichment-crm-data";

// ── Top-level activity tab ────────────────────────────────────────────────

type Window = "today" | "7d" | "30d" | "90d" | "6m" | "1y" | "all";
type Granularity = "hour" | "day" | "week" | "month";

export function CrmActivity({
  onOpenRun: _onOpenRun,
  scope = "crm",
  heading,
}: {
  onOpenRun: (r: RunRecord) => void;
  /**
   * "crm"  → only CRM-sourced runs (CRM activity view).
   * "all"  → every enrichment run (dashboard view across CRM + bulk + single).
   */
  scope?: "crm" | "all";
  /** Override the Overview heading. Defaults to "Overview". */
  heading?: string;
}) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const scoped = useMemo(
    () => (scope === "all" ? runs : runs.filter((r) => r.source === "crm")),
    [runs, scope],
  );

  const [windowKey, setWindowKey] = useState<Window>("7d");

  return (
    <div className="space-y-6">
      <KpiStrip runs={scoped} windowKey={windowKey} onWindowChange={setWindowKey} heading={heading} />
      <VolumeChart runs={scoped} windowKey={windowKey} />
    </div>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────

function KpiStrip({
  runs,
  windowKey,
  onWindowChange,
  heading,
}: {
  runs: RunRecord[];
  windowKey: Window;
  onWindowChange: (w: Window) => void;
  heading?: string;
}) {
  const cutoffMs = windowMs(windowKey);
  const cutoff = cutoffMs === null ? null : Date.now() - cutoffMs;

  const cur = cutoff === null
    ? runs
    : runs.filter((r) => Date.parse(r.startedAt) >= cutoff);

  // Previous period (same length, just before cur). Skipped for "all".
  const prev = cutoffMs === null
    ? []
    : runs.filter((r) => {
        const t = Date.parse(r.startedAt);
        return t >= Date.now() - cutoffMs * 2 && t < (cutoff as number);
      });

  const incoming = cur.length;
  const enriched = cur.filter(
    (r) => r.status === "done" && r.profile?.enrichment_status !== "Zero Enrichment",
  ).length;
  const notEnriched = cur.filter(
    (r) => r.status === "done" && r.profile?.enrichment_status === "Zero Enrichment",
  ).length;
  const failed = cur.filter((r) => r.status === "failed").length;

  const incomingDelta = cutoffMs === null
    ? undefined
    : Math.round(((incoming - prev.length) / (prev.length || 1)) * 100);

  // Show Failed tile only when there's an actual system failure to report.
  const showFailed = failed > 0;
  const cols = showFailed ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-section-header text-text-primary">{heading ?? "Overview"}</h2>
        <WindowSelector value={windowKey} onChange={onWindowChange} />
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols} gap-3`}>
        <Tile label="Incoming leads"  value={incoming}     delta={incomingDelta} accent="neutral" />
        <Tile label="Enriched"        value={enriched}     sub={pct(enriched, incoming) + "% success"} accent="good" />
        <Tile
          label="Not enriched"
          value={notEnriched}
          sub={pct(notEnriched, incoming) + "%, data unavailable"}
          accent="neutral"
          hint="Lead processed but no public data found for these contacts. Expected baseline."
        />
        {showFailed && (
          <Tile
            label="Failed"
            value={failed}
            sub={pct(failed, incoming) + "%, system error"}
            accent="bad"
            hint="System-side failures (timeouts, API errors). Target is zero."
          />
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  delta,
  accent,
  hint,
}: {
  label: string;
  value: number;
  sub?: string;
  delta?: number;
  accent: "good" | "bad" | "info" | "neutral";
  hint?: string;
}) {
  const ring = accent === "good" ? "bg-[#F0FDF4] text-[#15803D]" :
               accent === "bad"  ? "bg-[#FEF2F2] text-[#DC2626]" :
               accent === "info" ? "bg-[#EFF6FF] text-[#1D4ED8]" :
               "bg-surface-secondary text-text-secondary";
  return (
    <div className="bg-white border border-border rounded-card p-4" title={hint}>
      <div className="text-[11.5px] text-text-secondary font-medium uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="text-[24px] font-semibold text-text-primary tabular-nums">{value.toLocaleString("en-IN")}</div>
        {typeof delta === "number" && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]"}`}>
            <ArrowUpRight size={11} strokeWidth={2} className={delta < 0 ? "rotate-90" : ""} />
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

function WindowSelector({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const opts: { k: Window; label: string }[] = [
    { k: "today", label: "Today" },
    { k: "7d",    label: "7d" },
    { k: "30d",   label: "30d" },
    { k: "90d",   label: "90d" },
    { k: "6m",    label: "6m" },
    { k: "1y",    label: "1y" },
    { k: "all",   label: "All" },
  ];
  return (
    <div className="inline-flex items-center bg-white border border-border rounded-input p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={[
            "h-7 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors",
            o.k === value
              ? "bg-text-primary text-white"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Volume chart (line, works at every range) ────────────────────────────

function VolumeChart({ runs, windowKey }: { runs: RunRecord[]; windowKey: Window }) {
  const granularity = granularityFor(windowKey);
  const bucketDefs = useMemo(() => buildBuckets(windowKey), [windowKey]);
  const data = useMemo(() => {
    const map: Record<string, { enriched: number; notEnriched: number; failed: number }> = {};
    bucketDefs.forEach((b) => (map[b.key] = { enriched: 0, notEnriched: 0, failed: 0 }));
    runs.forEach((r) => {
      const k = bucketKey(new Date(r.startedAt), granularity);
      if (!map[k]) return;
      if (r.status === "failed") map[k].failed += 1;
      else if (r.status === "done") {
        if (r.profile?.enrichment_status === "Zero Enrichment") map[k].notEnriched += 1;
        else map[k].enriched += 1;
      }
    });
    return map;
  }, [bucketDefs, runs, granularity]);

  // Scale to the largest single series value, not the stacked total. Lines
  // read better when each series has visible amplitude.
  const max = Math.max(
    4,
    ...bucketDefs.flatMap((b) => [data[b.key].enriched, data[b.key].notEnriched, data[b.key].failed]),
  );

  const rangeLabel = windowLabel(windowKey);
  const title =
    granularity === "hour"  ? "Hourly volume" :
    granularity === "day"   ? "Daily volume" :
    granularity === "week"  ? "Weekly volume" :
    "Monthly volume";

  return (
    <section className="bg-white border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-section-header text-text-primary">{title}</h3>
          <p className="text-[12px] text-text-tertiary mt-0.5">{rangeLabel} · enriched, not enriched, failed</p>
        </div>
        <Legend />
      </div>
      <LineChart bucketDefs={bucketDefs} data={data} max={max} granularity={granularity} />
    </section>
  );
}

// ── Line chart ───────────────────────────────────────────────────────────
//
// Three lines (enriched / not enriched / failed). Enriched also gets a soft
// fill underneath as the dominant series. Scales to any bucket count.

interface BucketDef { key: string; shortLabel: string; fullLabel: string }
interface BucketVal { enriched: number; notEnriched: number; failed: number }

function LineChart({
  bucketDefs,
  data,
  max,
  granularity,
}: {
  bucketDefs: BucketDef[];
  data: Record<string, BucketVal>;
  max: number;
  granularity: Granularity;
}) {
  const W = 1000; // viewBox width, actual width is responsive
  const H = 180;
  const PADDING_Y = 8;
  const innerH = H - PADDING_Y * 2;
  const n = bucketDefs.length;

  const xAt = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const yAt = (val: number) => H - PADDING_Y - (max ? (val / max) * innerH : 0);

  const sEnriched    = bucketDefs.map((b) => data[b.key].enriched);
  const sNotEnriched = bucketDefs.map((b) => data[b.key].notEnriched);
  const sFailed      = bucketDefs.map((b) => data[b.key].failed);

  const linePath = (series: number[]) => {
    if (series.length === 0) return "";
    return series.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  };

  // Soft fill under the enriched line (closes path down to baseline).
  const fillPath = (series: number[]) => {
    if (series.length === 0) return "";
    const top = series.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
    return `${top} L ${xAt(n - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
  };

  const hasFailed = sFailed.some((v) => v > 0);

  const [hoverI, setHoverI] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    setHoverI(i);
  };

  const tip = hoverI != null ? {
    d: bucketDefs[hoverI],
    b: data[bucketDefs[hoverI].key],
    x: xAt(hoverI),
    i: hoverI,
  } : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-[180px] block"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverI(null)}
      >
        {/* Faint horizontal gridlines (quarters) */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={0}
            y1={PADDING_Y + innerH * p}
            x2={W}
            y2={PADDING_Y + innerH * p}
            stroke="#F1F5F9"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Baseline */}
        <line x1={0} y1={H - PADDING_Y} x2={W} y2={H - PADDING_Y} stroke="#E5E7EB" strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {/* Enriched fill */}
        <path d={fillPath(sEnriched)} fill="#22C55E" opacity={0.08} />

        {/* Lines, draw failed first (least frequent, on top of others rarely),
            then not-enriched, then enriched on top so the dominant series wins. */}
        {hasFailed && (
          <path
            d={linePath(sFailed)}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={linePath(sNotEnriched)}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={linePath(sEnriched)}
          fill="none"
          stroke="#22C55E"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Hover crosshair + dots on each series */}
        {tip && (
          <>
            <line
              x1={tip.x} y1={PADDING_Y} x2={tip.x} y2={H - PADDING_Y}
              stroke="#0F0F0F" strokeOpacity={0.25} strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={tip.x} cy={yAt(sEnriched[tip.i])} r={3.5} fill="#22C55E" stroke="white" strokeWidth={1.5} />
            <circle cx={tip.x} cy={yAt(sNotEnriched[tip.i])} r={3} fill="#94A3B8" stroke="white" strokeWidth={1.5} />
            {hasFailed && (
              <circle cx={tip.x} cy={yAt(sFailed[tip.i])} r={3} fill="#EF4444" stroke="white" strokeWidth={1.5} />
            )}
          </>
        )}
      </svg>

      {/* Tooltip (DOM, not SVG, so sizing isn't stretched by preserveAspectRatio) */}
      {tip && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: `${(tip.x / W) * 100}%`,
            transform: "translate(-50%, -100%)",
            top: 0,
          }}
        >
          <div className="bg-text-primary text-white rounded-input shadow-lg px-2.5 py-1.5 whitespace-nowrap">
            <div className="text-[11px] font-medium text-white/70 mb-0.5">{tip.d.fullLabel}</div>
            <div className="flex items-center gap-3 text-[11.5px] tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                {tip.b.enriched} enriched
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                {tip.b.notEnriched} not enriched
              </span>
              {tip.b.failed > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  {tip.b.failed} failed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* X-axis labels, thinned by bucket count. */}
      <div className="flex mt-2">
        {bucketDefs.map((d, i) => {
          const show = shouldShowAxisLabel(i, bucketDefs.length, granularity);
          return (
            <div
              key={d.key}
              className="flex-1 text-[10px] text-text-tertiary tabular-nums text-center min-w-0"
            >
              {show ? d.shortLabel : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function shouldShowAxisLabel(i: number, total: number, g: Granularity): boolean {
  if (i === 0 || i === total - 1) return true;
  if (g === "month") return true;
  if (g === "week") return total <= 13 ? i % 2 === 0 : i % 4 === 0;
  if (g === "hour") return i % 4 === 0; // every 4h (00, 04, 08, 12, 16, 20, 23)
  // day
  if (total <= 14) return true;
  return i % 3 === 0;
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11.5px] text-text-secondary">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#22C55E]" />
        Enriched
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#94A3B8]" />
        Not enriched
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#EF4444]" />
        Failed
      </span>
    </div>
  );
}

// ── Daily activity table (date-wise stats, click → drawer) ───────────────

interface DayGroup {
  key: string;
  label: string;
  dateSub: string;
  leads: RunRecord[];
  incoming: number;
  enriched: number;
  notEnriched: number;
  partial: number;
  failed: number;
  pushed: number;
}

type DateRange = "7d" | "14d" | "30d" | "all" | "custom";
const PAGE_SIZE = 10;

const COL_GRID = "grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_28px]";

function DailyActivityTable({ runs, onOpenRun }: { runs: RunRecord[]; onOpenRun: (r: RunRecord) => void }) {
  const allDays = useMemo<DayGroup[]>(() => buildDayGroups(runs), [runs]);
  const [range, setRange] = useState<DateRange>("14d");
  const [page, setPage] = useState(0);
  const [customFrom, setCustomFrom] = useState<string>(isoNDaysAgo(7));
  const [customTo, setCustomTo] = useState<string>(isoNDaysAgo(0));

  // Filter by range
  const filteredDays = useMemo(() => {
    if (range === "all") return allDays;
    if (range === "custom") {
      if (!customFrom || !customTo) return allDays;
      const from = new Date(customFrom).getTime();
      const to = new Date(customTo).getTime() + 86400000; // inclusive end day
      return allDays.filter((d) => {
        const [y, m, dd] = d.key.split("-").map(Number);
        const t = new Date(y, m - 1, dd).getTime();
        return t >= from && t < to;
      });
    }
    const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    const cutoff = Date.now() - days * 86400000;
    return allDays.filter((d) => {
      const [y, m, dd] = d.key.split("-").map(Number);
      return new Date(y, m - 1, dd).getTime() >= cutoff - 86400000;
    });
  }, [allDays, range, customFrom, customTo]);

  // Reset to first page whenever filters change
  useEffect(() => { setPage(0); }, [range, customFrom, customTo]);

  const total = filteredDays.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(total, pageStart + PAGE_SIZE);
  const pageDays = filteredDays.slice(pageStart, pageEnd);

  const [selected, setSelected] = useState<DayGroup | null>(null);

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="text-section-header text-text-primary">Daily activity</h3>
          <p className="text-[12px] text-text-tertiary mt-0.5">One row per day. Click a day to see every lead.</p>
        </div>
        <div className="flex items-center gap-2">
          <RangeChips value={range} onChange={setRange} />
          {range === "custom" && (
            <CustomDateInputs
              from={customFrom}
              to={customTo}
              onChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
            />
          )}
          <button
            onClick={() => downloadCsv(filteredDays.flatMap((d) => d.leads), `crm-activity-${range}`)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-button bg-white transition-colors"
          >
            <Download size={12} strokeWidth={1.75} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Column header */}
        <div className={`grid ${COL_GRID} gap-3 px-4 h-9 items-center border-b border-border bg-surface-page text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
          <div>Date</div>
          <div className="text-right">Incoming</div>
          <div className="text-right">Enriched</div>
          <div className="text-right" title="Lead processed but no public data found. Expected baseline.">Not enriched</div>
          <div className="text-right" title="System-side failures. Target is zero.">Failed</div>
          <div className="text-right">Pushed</div>
          <div className="text-right">Success</div>
          <div />
        </div>

        {total === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-text-tertiary">No CRM activity in this date range.</div>
        ) : pageDays.map((day) => {
          const successPct = day.incoming ? Math.round((day.enriched / day.incoming) * 100) : 0;
          return (
            <button
              key={day.key}
              onClick={() => setSelected(day)}
              className={`w-full text-left grid ${COL_GRID} gap-3 px-4 h-10 border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors items-center`}
            >
              <div className="text-[13px] font-medium text-text-primary tabular-nums">{day.dateSub}</div>
              <NumCell value={day.incoming} tone="neutral" />
              <NumCell value={day.enriched} tone="good" />
              <NumCell value={day.notEnriched} tone="neutral" />
              <NumCell value={day.failed} tone="bad" muted />
              <NumCell value={day.pushed} tone="info" />
              <div className="text-right text-[13px] font-medium text-text-secondary tabular-nums">{successPct}%</div>
              <ChevronRight size={14} strokeWidth={2} className="text-text-tertiary justify-self-end" />
            </button>
          );
        })}

        {/* Pagination footer */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 h-10 border-t border-border-subtle text-[12px] text-text-tertiary">
            <span className="tabular-nums">
              {total <= PAGE_SIZE
                ? `${total} day${total === 1 ? "" : "s"}`
                : `${(pageStart + 1).toLocaleString("en-IN")}–${pageEnd.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="tabular-nums">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => (pageEnd >= total ? p : p + 1))}
                  disabled={pageEnd >= total}
                  className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DayLeadsDrawer
        day={selected}
        onClose={() => setSelected(null)}
        onOpenRun={(r) => {
          setSelected(null);
          onOpenRun(r);
        }}
      />
    </section>
  );
}

function RangeChips({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const opts: { k: DateRange; label: string }[] = [
    { k: "7d",  label: "7d" },
    { k: "14d", label: "14d" },
    { k: "30d", label: "30d" },
    { k: "all", label: "All" },
    { k: "custom", label: "Custom" },
  ];
  return (
    <div className="inline-flex items-center bg-white border border-border rounded-input p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={[
            "h-7 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors",
            o.k === value
              ? "bg-text-primary text-white"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomDateInputs({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 h-8 px-2 bg-white border border-border rounded-input">
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange(e.target.value, to)}
        className="text-[12px] bg-transparent text-text-primary focus:outline-none tabular-nums"
      />
      <span className="text-[11px] text-text-tertiary">to</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        max={isoNDaysAgo(0)}
        onChange={(e) => onChange(from, e.target.value)}
        className="text-[12px] bg-transparent text-text-primary focus:outline-none tabular-nums"
      />
    </div>
  );
}

function NumCell({ value, tone, muted }: { value: number; tone: "good" | "bad" | "warn" | "info" | "neutral"; muted?: boolean }) {
  if (muted && value === 0) {
    return <div className="text-right text-[13px] text-text-tertiary tabular-nums">—</div>;
  }
  const color =
    tone === "good" ? "text-[#15803D]" :
    tone === "bad"  ? "text-[#DC2626]" :
    tone === "warn" ? "text-[#B45309]" :
    tone === "info" ? "text-[#1D4ED8]" :
    "text-text-primary";
  return <div className={`text-right text-[13px] font-medium tabular-nums ${color}`}>{value.toLocaleString("en-IN")}</div>;
}

// ── Day leads drawer ─────────────────────────────────────────────────────

type StatusFilter = "any" | "enriched" | "not_enriched" | "failed" | "partial";
type ChannelFilter = "any" | CrmLeadChannel;

function DayLeadsDrawer({
  day,
  onClose,
  onOpenRun,
}: {
  day: DayGroup | null;
  onClose: () => void;
  onOpenRun: (r: RunRecord) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("any");
  const [channel, setChannel] = useState<ChannelFilter>("any");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Reset state whenever a new day opens
  useEffect(() => {
    if (day) {
      setQuery("");
      setStatus("any");
      setChannel("any");
      setPage(0);
    }
  }, [day]);

  // ESC to close
  useEffect(() => {
    if (!day) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day, onClose]);

  const filtered = useMemo(() => {
    if (!day) return [];
    const q = query.trim().toLowerCase();
    return day.leads.filter((r) => {
      if (status === "enriched" && !(r.status === "done" && r.profile?.enrichment_status !== "Zero Enrichment")) return false;
      if (status === "not_enriched" && !(r.status === "done" && r.profile?.enrichment_status === "Zero Enrichment")) return false;
      if (status === "failed" && r.status !== "failed") return false;
      if (status === "partial" && r.profile?.enrichment_status !== "Partial Enrichment") return false;
      if (channel !== "any" && r.crmOrigin?.channel !== channel) return false;
      if (q) {
        const hay = `${r.profile?.contact?.name ?? ""} ${r.profile?.contact?.email ?? ""} ${r.profile?.contact?.phone ?? ""} ${r.crmOrigin?.recordId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [day, query, status, channel]);

  if (!mounted || !day) return null;

  const total = filtered.length;
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(total, pageStart + PAGE_SIZE);
  const rows = filtered.slice(pageStart, pageEnd);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[760px] max-w-[96vw] bg-white border-l border-border z-[70] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11.5px] text-text-tertiary uppercase tracking-wide font-medium">Daily detail</div>
            <h2 className="text-section-header text-text-primary mt-0.5 tabular-nums">{day.dateSub}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px]">
              <SummaryStat label="Incoming" value={day.incoming} tone="neutral" />
              <SummaryStat label="Enriched" value={day.enriched} tone="good" />
              <SummaryStat label="Not enriched" value={day.notEnriched} tone="neutral" />
              {day.failed > 0 && <SummaryStat label="Failed" value={day.failed} tone="bad" />}
              <SummaryStat label="Pushed" value={day.pushed} tone="info" />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Filters + export */}
        <div className="px-5 py-3 border-b border-border-subtle flex flex-wrap items-center gap-2 bg-surface-page/30">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search size={12} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search name, email, phone, ID…"
              className="h-8 pl-7 pr-3 w-full text-[12px] border border-border rounded-input bg-white placeholder:text-text-tertiary focus:outline-none focus:border-text-secondary"
            />
          </div>
          <Select
            value={status}
            onChange={(v) => { setStatus(v as StatusFilter); setPage(0); }}
            options={[
              { value: "any", label: "Any status" },
              { value: "enriched", label: "Enriched" },
              { value: "partial", label: "Partial" },
              { value: "not_enriched", label: "Not enriched" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <Select
            value={channel}
            onChange={(v) => { setChannel(v as ChannelFilter); setPage(0); }}
            options={[
              { value: "any", label: "Any source" },
              { value: "Web form", label: "Web form" },
              { value: "API", label: "API" },
              { value: "Salesforce", label: "Salesforce" },
              { value: "Chat", label: "Chat" },
              { value: "Import", label: "Import" },
            ]}
          />
          <div className="flex-1" />
          <button
            onClick={() => downloadCsv(filtered, `crm-${day.key}`)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors"
          >
            <Download size={12} strokeWidth={1.75} />
            Download {total.toLocaleString("en-IN")} leads
          </button>
        </div>

        {/* Lead table */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[80px_minmax(220px,1fr)_140px_170px_110px] gap-3 px-5 py-2 border-b border-border-subtle bg-white sticky top-0 text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary">
            <div>Time</div>
            <div>Lead</div>
            <div title="Where the lead first landed before reaching your CRM (Web form, API, native CRM entry, Chat, Import).">Lead origin</div>
            <div>Enrichment type</div>
            <div>Status</div>
          </div>
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-[13px] text-text-tertiary">No leads match these filters.</div>
          ) : rows.map((r) => (
            <button
              key={r.id}
              onClick={() => onOpenRun(r)}
              className="w-full text-left grid grid-cols-[80px_minmax(220px,1fr)_140px_170px_110px] gap-3 px-5 py-2.5 border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors items-center"
            >
              <div className="text-[12px] text-text-secondary tabular-nums">{timeOnly(r.startedAt)}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary truncate">{r.profile?.contact?.name ?? "—"}</div>
                <div className="text-[11px] text-text-tertiary truncate">{r.profile?.contact?.email ?? r.profile?.contact?.phone ?? "—"}</div>
              </div>
              <div className="text-[12px] text-text-secondary truncate">{r.crmOrigin?.channel ?? "—"}</div>
              <div><TypePill types={r.types} /></div>
              <div><StatusPill run={r} /></div>
            </button>
          ))}
        </div>

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[12px] text-text-tertiary bg-white">
          <span>
            {total === 0
              ? "0 leads"
              : `Showing ${(pageStart + 1).toLocaleString("en-IN")}–${pageEnd.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}`}
          </span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => (pageEnd >= total ? p : p + 1))}
              disabled={pageEnd >= total}
              className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "good" | "bad" | "warn" | "info" | "neutral" }) {
  const color =
    tone === "good" ? "text-[#15803D]" :
    tone === "bad"  ? "text-[#DC2626]" :
    tone === "warn" ? "text-[#B45309]" :
    tone === "info" ? "text-[#1D4ED8]" :
    "text-text-primary";
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-semibold tabular-nums ${color}`}>{value.toLocaleString("en-IN")}</span>
      <span className="text-text-tertiary">{label}</span>
    </span>
  );
}

// ── small bits ────────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-secondary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function TypePill({ types }: { types: RunRecord["types"] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="flex flex-wrap gap-1">
      {hasPro && (
        <span className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
          Professional
        </span>
      )}
      {hasFin && (
        <span className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded-badge bg-[#F5F3FF] text-[#6D28D9]">
          Financial
        </span>
      )}
    </div>
  );
}

function StatusPill({ run }: { run: RunRecord }) {
  if (run.status === "failed") {
    return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FEF2F2] text-[#DC2626]">Failed</span>;
  }
  if (run.profile?.enrichment_status === "Zero Enrichment") {
    return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">Not enriched</span>;
  }
  if (run.profile?.enrichment_status === "Partial Enrichment") {
    return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FFFBEB] text-[#B45309]">Partial</span>;
  }
  return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">Enriched</span>;
}

// ── helpers ───────────────────────────────────────────────────────────────

function windowMs(w: Window): number | null {
  const DAY = 86_400_000;
  switch (w) {
    case "today": return DAY;
    case "7d":    return 7 * DAY;
    case "30d":   return 30 * DAY;
    case "90d":   return 90 * DAY;
    case "6m":    return 182 * DAY;
    case "1y":    return 365 * DAY;
    case "all":   return null;
  }
}

function windowLabel(w: Window): string {
  switch (w) {
    case "today": return "Today";
    case "7d":    return "Last 7 days";
    case "30d":   return "Last 30 days";
    case "90d":   return "Last 90 days";
    case "6m":    return "Last 6 months";
    case "1y":    return "Last 12 months";
    case "all":   return "All time";
  }
}

function granularityFor(w: Window): Granularity {
  if (w === "today") return "hour";
  if (w === "7d" || w === "30d") return "day";
  if (w === "90d" || w === "6m") return "week";
  return "month";
}

function bucketCountFor(w: Window): number {
  switch (w) {
    case "today": return 24;   // hours
    case "7d":    return 7;
    case "30d":   return 30;
    case "90d":   return 13;   // weeks
    case "6m":    return 26;   // weeks
    case "1y":    return 12;   // months
    case "all":   return 36;   // months (3-year history)
  }
}

function bucketKey(date: Date, g: Granularity): string {
  if (g === "hour") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    return `${y}-${m}-${d}T${h}`;
  }
  if (g === "day") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (g === "week") {
    // Anchor to Monday-week start.
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildBuckets(w: Window): { key: string; shortLabel: string; fullLabel: string }[] {
  const g = granularityFor(w);
  const n = bucketCountFor(w);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { key: string; shortLabel: string; fullLabel: string }[] = [];

  if (g === "hour") {
    // 24 buckets, midnight (00:00) → 23:00 of "today".
    const dateStamp = `${today.getDate()} ${MONTHS[today.getMonth()]}`;
    for (let h = 0; h < n; h++) {
      const d = new Date(today.getTime() + h * 3_600_000);
      const hh = String(d.getHours()).padStart(2, "0");
      out.push({
        key: bucketKey(d, "hour"),
        shortLabel: `${hh}:00`,
        fullLabel: `${dateStamp}, ${hh}:00`,
      });
    }
    return out;
  }

  if (g === "day") {
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86_400_000);
      const isToday = i === 0;
      const isYesterday = i === 1;
      out.push({
        key: bucketKey(d, "day"),
        shortLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        fullLabel: isToday
          ? `Today, ${d.getDate()} ${MONTHS[d.getMonth()]}`
          : isYesterday
            ? `Yesterday, ${d.getDate()} ${MONTHS[d.getMonth()]}`
            : `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      });
    }
    return out;
  }

  if (g === "week") {
    // Find this week's Monday.
    const wkStart = new Date(today);
    const dow = wkStart.getDay();
    wkStart.setDate(wkStart.getDate() + (dow === 0 ? -6 : 1 - dow));
    for (let i = n - 1; i >= 0; i--) {
      const ws = new Date(wkStart.getTime() - i * 7 * 86_400_000);
      const we = new Date(ws.getTime() + 6 * 86_400_000);
      out.push({
        key: bucketKey(ws, "week"),
        shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
        fullLabel: `Week of ${ws.getDate()} ${MONTHS[ws.getMonth()]} – ${we.getDate()} ${MONTHS[we.getMonth()]}`,
      });
    }
    return out;
  }

  // month
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({
      key: bucketKey(m, "month"),
      shortLabel: MONTHS[m.getMonth()],
      fullLabel: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`,
    });
  }
  return out;
}

function pct(part: number, total: number): string {
  if (!total) return "0";
  return Math.round((part / total) * 100).toString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function isoNDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function timeOnly(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayHeading(k: string): string {
  const [y, m, d] = k.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return WEEKDAYS[date.getDay()];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function daySubLabel(k: string): string {
  const [y, m, d] = k.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function buildDayGroups(runs: RunRecord[]): DayGroup[] {
  const map = new Map<string, RunRecord[]>();
  runs.forEach((r) => {
    const k = dayKey(r.startedAt);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  });
  const out: DayGroup[] = [];
  Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .forEach(([k, leads]) => {
      leads.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      const enriched = leads.filter(
        (r) => r.status === "done" && r.profile?.enrichment_status !== "Zero Enrichment",
      ).length;
      const notEnriched = leads.filter(
        (r) => r.status === "done" && r.profile?.enrichment_status === "Zero Enrichment",
      ).length;
      const partial = leads.filter((r) => r.profile?.enrichment_status === "Partial Enrichment").length;
      const failed = leads.filter((r) => r.status === "failed").length;
      const pushed = leads.filter((r) => r.crmSync?.status === "synced").length;
      out.push({
        key: k,
        label: dayHeading(k),
        dateSub: daySubLabel(k),
        leads,
        incoming: leads.length,
        enriched,
        notEnriched,
        partial,
        failed,
        pushed,
      });
    });
  return out;
}

function downloadCsv(runs: RunRecord[], stem: string) {
  const header = ["Entered", "Name", "Email", "Phone", "Source", "Type", "Status", "CRM Record ID", "CRM URL"];
  const rows = runs.map((r) => [
    r.startedAt,
    r.profile?.contact?.name ?? "",
    r.profile?.contact?.email ?? "",
    r.profile?.contact?.phone ?? "",
    r.crmOrigin?.channel ?? "",
    r.types.join("+"),
    r.status === "failed"
      ? "Failed"
      : r.profile?.enrichment_status === "Zero Enrichment"
        ? "Not enriched"
        : r.profile?.enrichment_status === "Partial Enrichment"
          ? "Partial"
          : "Enriched",
    r.crmOrigin?.recordId ?? "",
    r.crmOrigin?.recordUrl ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${stem}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

## `src/components/enrichment-crm/composer.tsx`

```tsx
"use client";

// Enrichment composer, single shape.
// Top: Bulk/Single tabs + Professional/Financial checkboxes.
// Bulk body: pre-drop = "Fields needed" card + drop zone. Post-drop = file pill + mapping table.
// Single body: 60/40 split, adaptive inputs on the left, result panel on the right.
// Footer: Spot tip area + cost + submit.

import { useEffect, useState } from "react";
import {
  useComposerState,
  TabSwitcher,
  TypeCheckboxes,
  TypeCostInfo,
  FieldsNeededCard,
  SingleInputsAdaptive,
  FileCard,
  DropZone,
  SubmitButton,
  submitLabelBulk,
  submitLabelSingle,
} from "./composer-shared";
import { MappingTable } from "./mapping-table";
import { computeSpot, staticInstruction, SPOT_NAME_NOTE } from "./spot";
import { TipCallout } from "@/components/project/shared/spot-callout";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";
import { AlertTriangle } from "lucide-react";
import { IllustrationEnrichment, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";

export function EnrichmentComposer({ mode }: { mode?: "bulk" | "single" } = {}) {
  const state = useComposerState(mode ?? "bulk");
  const { tab } = state;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Top strip */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {!mode && <TabSwitcher tab={tab} setTab={state.setTab} />}
            {!mode && <div className="w-px h-5 bg-border-subtle" />}
            <TypeCheckboxes types={state.types} toggle={state.toggleType} />
          </div>
          <TypeCostInfo types={state.types} />
        </div>

        {/* Body */}
        {tab === "bulk" ? <BulkBody state={state} /> : <SingleBody state={state} />}

        {/* Footer, only Bulk shows the global footer (after a file is dropped).
            Single mode owns its own actions inside the left column. */}
        {tab === "bulk" && state.file && <Footer state={state} />}
      </div>
    </div>
  );
}

// ── Bulk body ──────────────────────────────────────────────────────

function BulkBody({ state }: { state: ReturnType<typeof useComposerState> }) {
  if (!state.file) {
    return (
      <div className="grid grid-cols-[260px_1fr] gap-4 px-5 py-5">
        <FieldsNeededCard hasPro={state.hasPro} hasFin={state.hasFin} />
        <DropZone
          fileInputRef={state.fileInputRef}
          onChosen={state.onFileChosen}
          hasPro={state.hasPro}
          hasFin={state.hasFin}
          sampleHref={state.sampleHref}
          sampleName={state.sampleName}
        />
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-4">
      <FileCard file={state.file} rowCount={state.rowCount} onClear={state.resetBulk} />
      {state.headers.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold text-text-primary">Pick matching columns</div>
              <div className="text-[11.5px] text-text-tertiary mt-0.5">
                We auto-mapped what we recognised. Adjust the dropdown above any column to remap.
              </div>
            </div>
          </div>
          <MappingTable
            headers={state.headers}
            preview={state.preview}
            columnMap={state.columnMap}
            setColumnMap={state.setColumnMap}
            needName={state.hasFin}
            needPro={state.hasPro}
          />
        </div>
      ) : (
        <div className="text-[12px] text-text-tertiary px-3 py-2 bg-surface-page rounded-card">
          Couldn&apos;t read column headers from this file. Try a CSV with a header row.
        </div>
      )}
    </div>
  );
}

// ── Single body ────────────────────────────────────────────────────
// Left column: top tip → inputs → (push down) spot tip → actions row.
// Right column: result panel. No global footer in Single mode.

function SingleBody({ state }: { state: ReturnType<typeof useComposerState> }) {
  const spot = state.singleReady
    ? computeSpot({ types: state.types, available: state.singleAvailable })
    : null;

  const topInstruction = !state.singleReady ? staticInstruction(state.types) : null;

  return (
    <div className="grid grid-cols-2 divide-x divide-border-subtle">
      {/* Left: inputs + actions */}
      <div className="px-5 pt-5 pb-4 flex flex-col min-h-[440px]">
        {/* Instruction line, sits above inputs so the ask is visible before fields */}
        {topInstruction && (
          <p className="text-[12px] text-text-secondary mb-3">{topInstruction}</p>
        )}

        {/* Inputs */}
        <SingleInputsAdaptive
          hasPro={state.hasPro}
          hasFin={state.hasFin}
          email={state.singleEmail} setEmail={state.setSingleEmail}
          phone={state.singlePhone} setPhone={state.setSinglePhone}
          linkedin={state.singleLinkedin} setLinkedin={state.setSingleLinkedin}
          name={state.singleName} setName={state.setSingleName}
        />

        {/* Push the actions block to the bottom of the column */}
        <div className="mt-auto pt-4 space-y-3">
          {spot && (
            <TipCallout
              body={[spot.primary, spot.nameNote ? SPOT_NAME_NOTE : null]
                .filter(Boolean)
                .join("\n\n")}
            />
          )}
          <SingleActionsRow state={state} />
        </div>
      </div>

      {/* Right: result */}
      <div className="px-5 py-5">
        <ResultPanel state={state} />
      </div>
    </div>
  );
}

function SingleActionsRow({ state }: { state: ReturnType<typeof useComposerState> }) {
  const cost = state.singleCost;
  const insufficient = state.insufficientForSingle;
  const ready = state.singleReady;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {insufficient ? (
          <div className="flex items-start gap-1.5 text-[12px] text-[#DC2626]">
            <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>Not enough credits. Top up to continue.</span>
          </div>
        ) : ready ? (
          <span className="text-[12px] text-text-secondary tabular-nums">
            ≈ {cost} credit{cost === 1 ? "" : "s"} per lead
          </span>
        ) : null}
      </div>
      <SubmitButton
        label={submitLabelSingle(state)}
        disabled={!state.singleReady || state.insufficientForSingle}
        loading={state.isEnriching}
        onClick={state.submitSingle}
      />
    </div>
  );
}

function ResultPanel({ state }: { state: ReturnType<typeof useComposerState> }) {
  const failed =
    state.inlineResult &&
    (!state.inlineResult.profile || Object.keys(state.inlineResult.profile).length === 0);

  return (
    <div className="h-[400px] overflow-y-auto">
      {state.isEnriching ? (
        <EnrichingSkeleton types={state.types} />
      ) : failed ? (
        <FailedState />
      ) : state.inlineResult && state.inlineResult.profile ? (
        <LeadProfileCard
          profile={state.inlineResult.profile}
          variant="inline"
          onExpand={() => {
            // Page-level RunDrawer listens for this and opens with the matched run.
            const run = state.inlineResult;
            if (!run) return;
            window.dispatchEvent(new CustomEvent("enrichment-crm:open-run", { detail: { runId: run.id } }));
          }}
        />
      ) : (
        <EmptyResultState />
      )}
    </div>
  );
}

function EmptyResultState() {
  return (
    <div className="h-full border-2 border-dashed border-border rounded-card flex flex-col items-center justify-center text-center px-6 bg-surface-page">
      <div className="opacity-90 mb-2">
        <IllustrationEnrichment />
      </div>
      <div className="text-[13px] font-semibold text-text-primary">Result appears here</div>
      <div className="text-[12px] text-text-tertiary leading-[1.5] mt-1 max-w-[240px]">
        Fill the fields on the left and hit Enrich. The matched profile shows up here.
      </div>
    </div>
  );
}

function FailedState() {
  return (
    <div className="h-full border-2 border-dashed border-border rounded-card flex flex-col items-center justify-center text-center px-6 bg-surface-page">
      <div className="opacity-90 mb-2">
        <IllustrationSearchEmpty />
      </div>
      <div className="text-[13px] font-semibold text-text-primary">No match found</div>
      <div className="text-[12px] text-text-tertiary leading-[1.5] mt-1 max-w-[240px]">
        We couldn&apos;t find this lead across our sources. Credits have been refunded.
      </div>
    </div>
  );
}

// Stepped progress while a single enrichment is "running", feels like real work.
function EnrichingSkeleton({ types }: { types: ReturnType<typeof useComposerState>["types"] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  const steps = [
    "Looking up the lead",
    hasPro ? "Pulling professional data" : null,
    hasFin ? "Verifying financial profile" : null,
    "Stitching the result",
  ].filter(Boolean) as string[];

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const tick = Math.max(380, Math.floor(1800 / steps.length));
    const id = window.setInterval(() => {
      setActiveIdx((i) => Math.min(i + 1, steps.length - 1));
    }, tick);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className="h-full border border-border-subtle rounded-card bg-white p-4 flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-surface-page animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 bg-surface-page rounded animate-pulse" />
          <div className="h-2.5 w-44 bg-surface-page rounded animate-pulse" />
        </div>
      </div>
      {/* Field placeholders */}
      <div className="space-y-2 mb-5">
        <div className="h-2.5 w-full bg-surface-page rounded animate-pulse" />
        <div className="h-2.5 w-4/5 bg-surface-page rounded animate-pulse" />
        <div className="h-2.5 w-3/5 bg-surface-page rounded animate-pulse" />
      </div>
      {/* Live step list */}
      <div className="mt-auto space-y-1.5">
        {steps.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s} className="flex items-center gap-2 text-[11.5px]">
              {done ? (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-emerald-600">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : active ? (
                <svg className="animate-spin text-text-primary" width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <span className="w-[11px] h-[11px] rounded-full border border-border-subtle" />
              )}
              <span className={done ? "text-text-secondary" : active ? "text-text-primary font-medium" : "text-text-tertiary"}>
                {s}
                {active ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────

function Footer({ state }: { state: ReturnType<typeof useComposerState> }) {
  const isBulk = state.tab === "bulk";
  const available = isBulk ? state.bulkAvailable : state.singleAvailable;
  const ready = isBulk ? state.bulkReady : state.singleReady;
  const insufficient = isBulk ? state.insufficientForBulk : state.insufficientForSingle;
  const cost = isBulk ? state.bulkCost : state.singleCost;

  // Spot speaks only when required fields are met; otherwise static instruction renders.
  const spot = ready ? computeSpot({ types: state.types, available }) : null;
  const instruction = !ready ? staticInstruction(state.types) : null;

  // Special case: bulk pre-drop → no instruction, no spot
  const preDrop = isBulk && !state.file;

  return (
    <div className="border-t border-border-subtle">
      {/* Tip / instruction area */}
      {!preDrop && (spot || instruction) && (
        <div className="px-5 pt-4 pb-1">
          {spot ? (
            <TipCallout
              body={[spot.primary, spot.nameNote ? SPOT_NAME_NOTE : null]
                .filter(Boolean)
                .join("\n\n")}
            />
          ) : (
            <div className="text-[12px] text-text-secondary">{instruction}</div>
          )}
        </div>
      )}

      {/* Submit row */}
      <div className="px-5 py-3 flex items-center gap-3 bg-surface-page/40">
        <div className="flex-1 min-w-0">
          {insufficient ? (
            <div className="flex items-start gap-1.5 text-[12px] text-[#DC2626]">
              <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>Not enough credits. Top up to continue.</span>
            </div>
          ) : ready ? (
            <span className="text-[12px] text-text-secondary tabular-nums">
              {isBulk ? (
                <>
                  ≈ {cost.toLocaleString("en-IN")} credits
                  <span className="text-text-tertiary">
                    {" "}({state.rowCount.toLocaleString("en-IN")} rows × {state.perLead})
                  </span>
                </>
              ) : (
                <>≈ {cost} credit{cost === 1 ? "" : "s"} per lead</>
              )}
            </span>
          ) : (
            <span className="text-[12px] text-text-tertiary">
              {isBulk && !state.file ? "Drop a file to see the cost" : ""}
            </span>
          )}
        </div>
        <SubmitButton
          label={isBulk ? submitLabelBulk(state) : submitLabelSingle(state)}
          disabled={isBulk ? !state.bulkReady || state.insufficientForBulk : !state.singleReady || state.insufficientForSingle}
          loading={isBulk ? state.isQueuing : state.isEnriching}
          onClick={isBulk ? state.submitBulk : state.submitSingle}
        />
      </div>
    </div>
  );
}
```

## `src/components/enrichment-crm/composer-shared.tsx`

```tsx
"use client";

// Shared state hook for the enrichment composer (single-shape).
// Owns: tab (bulk/single), checkboxes (professional/financial),
// single-mode inputs, bulk-mode file + column map, derived flags.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, FileSpreadsheet, Download } from "lucide-react";
import {
  CREDITS_PER_LEAD,
  type EnrichmentType,
  type RequiredField,
  sampleCsvDataUrl,
  sampleCsvFilename,
  useEnrichmentCrmStore,
  type RunRecord,
  sampleProfile,
} from "@/lib/enrichment-crm-data";
import { autoBuildColumnMap, mappedFields, type ColumnMap } from "./mapping-table";
import { requiredFieldsMet } from "./spot";

export type Tab = "bulk" | "single";

const PREVIEW_ROWS = 6;

export function useComposerState(initialTab: Tab = "bulk") {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [types, setTypes] = useState<EnrichmentType[]>(["professional"]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isQueuing, setIsQueuing] = useState(false);

  // Single-mode inputs
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePhone, setSinglePhone] = useState("");
  const [singleLinkedin, setSingleLinkedin] = useState("");
  const [singleName, setSingleName] = useState("");

  // Bulk-mode file + headers + preview + column map
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});

  const [inlineResult, setInlineResult] = useState<RunRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const balance = useEnrichmentCrmStore((s) => s.balance);
  const addRun = useEnrichmentCrmStore((s) => s.addRun);

  const toggleType = useCallback((t: EnrichmentType) => {
    setTypes((cur) => {
      const has = cur.includes(t);
      // Block unticking the last remaining type, at least one must stay on.
      if (has && cur.length === 1) return cur;
      return has ? cur.filter((x) => x !== t) : [...cur, t];
    });
    setInlineResult(null);
  }, []);

  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");

  // ── Field availability ──────────────────────────────────────────
  const singleAvailable = useMemo(() => {
    const set = new Set<RequiredField>();
    if (singleEmail.trim()) set.add("email");
    if (singlePhone.trim()) set.add("phone");
    if (singleLinkedin.trim()) set.add("linkedin");
    if (singleName.trim()) set.add("name");
    return set;
  }, [singleEmail, singlePhone, singleLinkedin, singleName]);

  const bulkAvailable = useMemo(() => mappedFields(columnMap), [columnMap]);

  // ── Required-fields-met (drives submit-enabled) ─────────────────
  const singleReady = useMemo(
    () => requiredFieldsMet(types, singleAvailable),
    [types, singleAvailable],
  );
  const bulkReady = useMemo(
    () => !!file && requiredFieldsMet(types, bulkAvailable),
    [file, types, bulkAvailable],
  );

  // ── Cost ────────────────────────────────────────────────────────
  const perLead = useMemo(
    () => types.reduce((sum, t) => sum + CREDITS_PER_LEAD[t], 0),
    [types],
  );
  const singleCost = perLead;
  const bulkCost = useMemo(() => perLead * rowCount, [perLead, rowCount]);

  const insufficientForSingle = singleReady && singleCost > balance;
  const insufficientForBulk = bulkReady && bulkCost > balance;

  // ── File handling ───────────────────────────────────────────────
  const onFileChosen = useCallback(async (f: File) => {
    setFile(f);
    setInlineResult(null);
    try {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setHeaders([]);
        setPreview([]);
        setRowCount(0);
        setColumnMap({});
        return;
      }
      const heads = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const body = lines.slice(1, 1 + PREVIEW_ROWS).map((l) =>
        l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
      );
      setHeaders(heads);
      setPreview(body);
      setRowCount(Math.max(0, lines.length - 1));
      setColumnMap(autoBuildColumnMap(heads));
    } catch {
      const estRows = Math.max(1, Math.floor(f.size / 120));
      setHeaders([]);
      setPreview([]);
      setRowCount(estRows);
      setColumnMap({});
    }
  }, []);

  const resetBulk = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setRowCount(0);
    setColumnMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const resetSingle = useCallback(() => {
    setSingleEmail(""); setSinglePhone(""); setSingleLinkedin(""); setSingleName("");
  }, []);

  // Clear stale single inputs when their owning checkbox is turned off
  useEffect(() => {
    if (!hasFin) setSingleName("");
    if (!hasPro) {
      setSingleEmail("");
      setSingleLinkedin("");
    }
  }, [hasFin, hasPro]);

  // ── Submit ──────────────────────────────────────────────────────
  // Single: fake a ~1.8s enrichment so the UI feels real (network + processing).
  const submitSingle = useCallback(() => {
    if (!singleReady || insufficientForSingle || isEnriching) return;
    setIsEnriching(true);
    setInlineResult(null);
    const startedAt = new Date().toISOString();
    window.setTimeout(() => {
      // ~15% no-match rate keeps the demo honest and shows the failed state in normal use.
      // Test triggers: phone "0000000000" or email containing "fail" always misses.
      const forceFail =
        singlePhone.replace(/\D/g, "") === "0000000000" ||
        /fail/i.test(singleEmail);
      const miss = forceFail || Math.random() < 0.15;
      // Pull from any existing enriched run first (so demo state evolves),
      // fall back to the canonical sampleProfile so financial-only / professional-only
      // submissions still surface the requested blocks.
      const baseProfile = useEnrichmentCrmStore.getState().runs.find((r) => r.profile)?.profile || sampleProfile;
      const resultProfile = miss
        ? undefined
        : {
            ...baseProfile,
            // Only include blocks the user actually paid for.
            professional: hasPro ? baseProfile.professional : undefined,
            financial: hasFin ? baseProfile.financial : undefined,
            // Always carry the typed input so the card has a header even when pro is off.
            // Fall back to enriched contact from the base sample so we surface the
            // discovered email + phone, not just the one the user typed.
            contact: {
              name: singleName || baseProfile.contact?.name,
              email: singleEmail || baseProfile.contact?.email,
              phone: singlePhone || baseProfile.contact?.phone,
              linkedin: singleLinkedin || baseProfile.contact?.linkedin,
            },
          };
      const run: RunRecord = {
        id: `run-${Date.now()}`,
        source: "single",
        inputValue: singleEmail || singlePhone || singleLinkedin || singleName,
        types,
        status: miss ? "failed" : "done",
        leadsTotal: 1,
        leadsSuccess: miss ? 0 : 1,
        leadsFailed: miss ? 1 : 0,
        leadsSkipped: 0,
        creditsBlocked: singleCost,
        creditsCharged: miss ? 0 : singleCost,
        creditsRefunded: miss ? singleCost : 0,
        startedAt,
        finishedAt: new Date().toISOString(),
        profile: resultProfile,
      };
      addRun(run);
      setInlineResult(run);
      setIsEnriching(false);
    }, 1800);
  }, [singleReady, insufficientForSingle, isEnriching, singleEmail, singlePhone, singleLinkedin, singleName, types, singleCost, addRun, hasPro, hasFin]);

  // Bulk: short queuing delay so it feels like an upload, then drop into history with 0% progress
  // (the page-level ticker walks it up to 100%).
  const submitBulk = useCallback(() => {
    if (!file || !bulkReady || insufficientForBulk || isQueuing) return;
    setIsQueuing(true);
    const captured = { file, types: [...types], rowCount, bulkCost };
    window.setTimeout(() => {
      const run: RunRecord = {
        id: `run-${Date.now()}`,
        source: "bulk",
        filename: captured.file.name,
        types: captured.types,
        status: "in_progress",
        progressPct: 0,
        leadsTotal: captured.rowCount,
        leadsSuccess: 0,
        leadsFailed: 0,
        leadsSkipped: 0,
        creditsBlocked: captured.bulkCost,
        creditsCharged: 0,
        creditsRefunded: 0,
        startedAt: new Date().toISOString(),
      };
      addRun(run);
      resetBulk();
      setIsQueuing(false);
      window.dispatchEvent(
        new CustomEvent("enrichment-crm:toast", {
          detail: {
            kind: "bulk_started",
            title: `Enriching ${captured.rowCount.toLocaleString("en-IN")} leads`,
            description: `${captured.file.name} · ${captured.bulkCost.toLocaleString("en-IN")} credits reserved. We'll email you when it's done.`,
            runId: run.id,
          },
        }),
      );
    }, 900);
  }, [file, bulkReady, insufficientForBulk, isQueuing, types, rowCount, bulkCost, addRun, resetBulk]);

  return {
    tab, setTab,
    types, toggleType, hasPro, hasFin,

    // single
    singleEmail, setSingleEmail,
    singlePhone, setSinglePhone,
    singleLinkedin, setSingleLinkedin,
    singleName, setSingleName,
    singleAvailable, singleReady,
    singleCost, insufficientForSingle,
    submitSingle, resetSingle,
    inlineResult, setInlineResult,
    isEnriching, isQueuing,

    // bulk
    file, headers, preview, rowCount, columnMap, setColumnMap, fileInputRef,
    bulkAvailable, bulkReady,
    bulkCost, insufficientForBulk, perLead,
    onFileChosen, resetBulk, submitBulk,

    // shared
    balance,
    sampleHref: sampleCsvDataUrl(types),
    sampleName: sampleCsvFilename(types),
  };
}

export type ComposerState = ReturnType<typeof useComposerState>;

// ── Sub-components ──────────────────────────────────────────────

export function TabSwitcher({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  // Prominent segmented pill, bigger surface, stronger active contrast, icon hint.
  return (
    <div className="inline-flex items-center bg-surface-page border border-border rounded-[10px] p-1">
      {(["bulk", "single"] as Tab[]).map((t) => {
        const active = t === tab;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-[7px] transition-all duration-150 ${
              active
                ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.08)]"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t === "bulk" ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-90">
                <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 6.5h12M6 3v10M10 3v10" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-90">
                <circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 13.5c.6-2.4 2.7-3.6 5-3.6s4.4 1.2 5 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
            {t === "bulk" ? "Bulk CSV" : "One lead"}
          </button>
        );
      })}
    </div>
  );
}

export function TypeCheckboxes({
  types,
  toggle,
}: {
  types: EnrichmentType[];
  toggle: (t: EnrichmentType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <CheckboxPill
        active={types.includes("professional")}
        label="Professional"
        onClick={() => toggle("professional")}
      />
      <CheckboxPill
        active={types.includes("financial")}
        label="Financial"
        onClick={() => toggle("financial")}
      />
    </div>
  );
}

// Right-aligned per-lead cost summary for the top strip. Shown so the
// user knows the unit price up front, before they pick a tab or drop a
// file. Each type is dimmed when not currently selected so the active
// cost stack reads as the live total.
export function TypeCostInfo({ types }: { types: EnrichmentType[] }) {
  const pro = CREDITS_PER_LEAD.professional;
  const fin = CREDITS_PER_LEAD.financial;
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="flex items-center gap-3 text-[11.5px] tabular-nums">
      <span
        className={`inline-flex items-center gap-1 ${
          hasPro ? "text-text-secondary" : "text-text-tertiary"
        }`}
      >
        <span>Professional</span>
        <span className="text-text-tertiary">
          · {pro} credit{pro === 1 ? "" : "s"}/lead
        </span>
      </span>
      <span className="w-px h-3 bg-border-subtle" />
      <span
        className={`inline-flex items-center gap-1 ${
          hasFin ? "text-text-secondary" : "text-text-tertiary"
        }`}
      >
        <span>Financial</span>
        <span className="text-text-tertiary">
          · {fin} credit{fin === 1 ? "" : "s"}/lead
        </span>
      </span>
    </div>
  );
}

function CheckboxPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  // Quiet checkbox, no border, no fill. Just box + label. Active just darkens the text.
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-1 text-[12.5px] font-normal transition-colors"
    >
      <span
        className={`w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-colors ${
          active ? "border-text-primary bg-text-primary" : "border-border-hover bg-white"
        }`}
      >
        {active && (
          <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
            <path d="M2 4.5L3.8 6.3L7 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={active ? "text-text-primary" : "text-text-tertiary"}>{label}</span>
    </button>
  );
}

// "Fields needed" reference card, adapts to checkbox selection.
// The variable "Download sample CSV" link lives inside the DropZone now,
// not here, this card is purely a field-requirements reference.
export function FieldsNeededCard({
  hasPro,
  hasFin,
}: {
  hasPro: boolean;
  hasFin: boolean;
}) {
  if (!hasPro && !hasFin) {
    return (
      <div className="p-4 bg-surface-page border border-border-subtle rounded-card">
        <div className="text-[12px] text-text-tertiary">Pick an enrichment type above.</div>
      </div>
    );
  }
  return (
    <div className="p-4 bg-surface-page border border-border-subtle rounded-card flex flex-col gap-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
        Fields needed
      </div>
      {hasPro && (
        <div>
          <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Professional</div>
          <div className="text-[12px] text-text-secondary">Any of: LinkedIn URL, Email, Phone</div>
        </div>
      )}
      {hasFin && (
        <div>
          <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Financial</div>
          <div className="text-[12px] text-text-secondary">Name + Phone (required)</div>
        </div>
      )}
    </div>
  );
}

// Single-mode input set, fields appear/disappear based on selection
export function SingleInputsAdaptive({
  hasPro,
  hasFin,
  email, setEmail,
  phone, setPhone,
  linkedin, setLinkedin,
  name, setName,
}: {
  hasPro: boolean;
  hasFin: boolean;
  email: string; setEmail: (s: string) => void;
  phone: string; setPhone: (s: string) => void;
  linkedin: string; setLinkedin: (s: string) => void;
  name: string; setName: (s: string) => void;
}) {
  // Show phone whenever any type is on
  const showPhone = hasPro || hasFin;
  // Show email + linkedin only when Pro is on
  const showEmail = hasPro;
  const showLinkedin = hasPro;
  // Show name only when Fin is on
  const showName = hasFin;

  // Order: Name first (Financial req), then Professional hierarchy LinkedIn → Email → Phone.
  return (
    <div className="space-y-3">
      {showName && (
        <Input
          label="Name"
          required
          value={name}
          onChange={setName}
          placeholder="Saurabh Nandwani"
        />
      )}
      {showLinkedin && (
        <Input
          label="LinkedIn URL"
          value={linkedin}
          onChange={setLinkedin}
          placeholder="linkedin.com/in/..."
        />
      )}
      {showEmail && (
        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="jane@example.com"
        />
      )}
      {showPhone && (
        <Input
          label="Phone"
          required={hasFin}
          value={phone}
          onChange={setPhone}
          placeholder="+91 9876543210"
        />
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[11.5px] text-text-secondary mb-1">
        {label}
        {required && <span className="text-[#DC2626]">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-primary transition-colors placeholder:text-text-tertiary"
      />
    </div>
  );
}

export function FileCard({ file, rowCount, onClear }: { file: File; rowCount: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-surface-page rounded-card border border-border-subtle">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-[6px] bg-white border border-border flex items-center justify-center shrink-0">
          <FileSpreadsheet size={14} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-text-primary truncate">{file.name}</div>
          <div className="text-[11px] text-text-tertiary tabular-nums">
            {rowCount.toLocaleString("en-IN")} rows · {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="p-1.5 text-text-tertiary hover:text-text-primary rounded-button hover:bg-white transition-colors"
        aria-label="Remove file"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function DropZone({
  fileInputRef,
  onChosen,
  hasPro,
  hasFin,
  sampleHref,
  sampleName,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onChosen: (f: File) => void;
  // Optional sample-CSV link rendered inside the dropbox. Label adapts to
  // the selected enrichment types so the user grabs the right template.
  hasPro?: boolean;
  hasFin?: boolean;
  sampleHref?: string;
  sampleName?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const showSample = sampleHref && sampleName && (hasPro || hasFin);
  const sampleLabel =
    hasPro && hasFin
      ? "Download Professional + Financial sample CSV"
      : hasFin
      ? "Download Financial sample CSV"
      : "Download Professional sample CSV";
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onChosen(f);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[220px] rounded-card border-2 border-dashed transition-colors p-6 ${
        dragging
          ? "border-text-primary bg-surface-secondary"
          : "border-border hover:border-border-hover hover:bg-surface-page"
      }`}
    >
      <Upload size={20} strokeWidth={1.5} className="text-text-tertiary mb-3" />
      <p className="text-[13px] text-text-primary font-medium">
        Drop CSV here or <span className="underline underline-offset-2">click to browse</span>
      </p>
      <p className="text-[11px] text-text-tertiary mt-1">CSV, XLSX, XLS up to 50 MB</p>
      {showSample && (
        <a
          href={sampleHref}
          download={sampleName}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-text-secondary hover:text-text-primary underline underline-offset-2"
        >
          <Download size={11} strokeWidth={1.75} />
          {sampleLabel}
        </a>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChosen(f);
        }}
      />
    </div>
  );
}

export function SubmitButton({
  label,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  disabled: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 h-9 px-5 text-[13px] font-medium rounded-button transition-colors whitespace-nowrap ${
        disabled || loading
          ? "bg-text-primary/85 text-white cursor-not-allowed"
          : "bg-text-primary text-white hover:bg-accent-hover"
      } ${disabled && !loading ? "!bg-surface-secondary !text-text-tertiary" : ""}`}
    >
      {loading && (
        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function submitLabelSingle(state: ComposerState): string {
  if (state.isEnriching) return "Enriching…";
  if (state.insufficientForSingle) return "Top up credits";
  return `Enrich · ${state.singleCost.toLocaleString("en-IN")} credit${state.singleCost === 1 ? "" : "s"}`;
}

export function submitLabelBulk(state: ComposerState): string {
  if (state.isQueuing) return "Queuing…";
  if (state.insufficientForBulk) return "Top up credits";
  const rows = state.rowCount || 0;
  return `Enrich ${rows.toLocaleString("en-IN")} leads · ${state.bulkCost.toLocaleString("en-IN")} credits`;
}
```

## `src/components/enrichment-crm/history-table.tsx`

```tsx
"use client";

// Recent runs table, single + bulk, unified.
// Columns: Run · Type · Status · Enriched · Credits · Started · (open)

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Users, MoreHorizontal, Eye, X, ChevronDown, Check } from "lucide-react";
import {
  formatRelative,
  successPct,
  type EnrichmentType,
  type RunRecord,
  type RunSource,
  type RunStatus,
  useEnrichmentCrmStore,
} from "@/lib/enrichment-crm-data";
import { IllustrationSearchEmpty } from "@/components/illustrations/empty-states";

interface HistoryTableProps {
  onView: (run: RunRecord) => void;
  /** When set, the source-filter chip is hidden and runs are locked to this source. */
  forceSource?: RunSource;
  /** Title override, default "Enrichment history". */
  title?: string;
  /** Past-retention mode: hide Download + Build audience, keep the row as a
   *  summary (file, enriched count, credits). Used in no-storage variant. */
  summaryOnly?: boolean;
  /** Per-row expiry. Rows older than this many days are treated as summaryOnly
   *  (downloads + audience build no longer available). Used in no-storage to
   *  mix recent actionable rows with older expired ones. */
  summaryAfterDays?: number;
}

type TypeFilter = "all" | "professional" | "financial" | "both";
type StatusFilter = "all" | RunStatus;
type SourceFilter = "all" | RunSource;

export function HistoryTable({ onView, forceSource, title, summaryOnly = false, summaryAfterDays }: HistoryTableProps) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const filtered = useMemo(() => {
    // CRM-sourced runs live in the CRM activity tab. The bottom history is
    // scoped to manual work only (bulk + single).
    let out = runs.filter((r) => r.source !== "crm");

    // Hard lock when caller forces a source.
    if (forceSource) out = out.filter((r) => r.source === forceSource);

    if (typeFilter !== "all") {
      out = out.filter((r) => {
        if (typeFilter === "both") return r.types.length === 2;
        return r.types.length === 1 && r.types[0] === typeFilter;
      });
    }
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
    if (!forceSource && sourceFilter !== "all") out = out.filter((r) => r.source === sourceFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) =>
        r.source === "bulk"
          ? (r.filename || "").toLowerCase().includes(q)
          : (r.inputValue || "").toLowerCase().includes(q),
      );
    }

    // Always newest first.
    out.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return out;
  }, [runs, typeFilter, statusFilter, sourceFilter, search, forceSource]);

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  const filtersActive = typeFilter !== "all" || statusFilter !== "all" || (!forceSource && sourceFilter !== "all") || search.trim().length > 0;

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  return (
    <div>
      {/* Header row: title left · search + filters right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-section-header text-text-primary">{title ?? "Enrichment history"}</h2>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="relative">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file or email"
              className="h-8 pl-8 pr-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-primary placeholder:text-text-tertiary w-[240px]"
            />
          </div>

          <FilterChip
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { v: "all", label: "Any status" },
              { v: "done", label: "Done" },
              { v: "in_progress", label: "Running" },
              { v: "failed", label: "Failed" },
            ]}
          />
          <FilterChip
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { v: "all", label: "Any type" },
              { v: "professional", label: "Professional", dot: "#1D4ED8" },
              { v: "financial", label: "Financial", dot: "#6D28D9" },
              { v: "both", label: "Both" },
            ]}
          />
          {!forceSource && (
            <FilterChip
              label="Source"
              value={sourceFilter}
              onChange={(v) => setSourceFilter(v as SourceFilter)}
              options={[
                { v: "all", label: "Any source" },
                { v: "single", label: "Single lookup" },
                { v: "bulk", label: "Bulk upload" },
              ]}
            />
          )}

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-8 px-2 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={11} strokeWidth={1.5} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="grid grid-cols-[minmax(240px,2fr)_120px_minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(170px,1.1fr)_110px_56px] gap-6 px-6 py-3.5 bg-surface-page border-b border-border text-[11px] uppercase tracking-[0.4px] text-text-tertiary font-medium">
          <div>Run</div>
          <div>Type</div>
          <div>Status</div>
          <div>Enriched</div>
          <div>Credits</div>
          <div>Started</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <div className="opacity-90 mb-3">
              <IllustrationSearchEmpty />
            </div>
            <div className="text-[14px] font-semibold text-text-primary">
              {filtersActive ? "No runs match these filters" : "No runs yet"}
            </div>
            <div className="text-[12px] text-text-tertiary mt-1 max-w-[280px]">
              {filtersActive
                ? "Try a different status, type, or source. Or clear filters to see everything."
                : "Run your first enrichment above to see it land here."}
            </div>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary bg-white border border-border rounded-button hover:text-text-primary hover:border-border-hover transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((run) => {
            const ageDays = (Date.now() - new Date(run.startedAt).getTime()) / 86_400_000;
            const expired = summaryAfterDays != null && ageDays > summaryAfterDays;
            return (
              <Row
                key={run.id}
                run={run}
                onView={() => onView(run)}
                onBuildAudience={() => onBuildAudience(run)}
                summaryOnly={summaryOnly || expired}
                expired={expired}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────

function Row({ run, onView, onBuildAudience, summaryOnly = false, expired = false }: { run: RunRecord; onView: () => void; onBuildAudience: () => void; summaryOnly?: boolean; expired?: boolean }) {
  const isInProgress = run.status === "in_progress";
  const enrichedNow = isInProgress
    ? Math.round((run.progressPct || 0) * run.leadsTotal / 100)
    : run.leadsSuccess;

  return (
    <div
      onClick={onView}
      className="grid grid-cols-[minmax(240px,2fr)_120px_minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(170px,1.1fr)_110px_56px] gap-6 px-6 py-5 items-center border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors cursor-pointer"
    >
      {/* Run identity */}
      <div className="min-w-0">
        <div className="text-[13px] text-text-primary truncate font-medium">
          {run.source === "bulk" ? run.filename : run.inputValue}
        </div>
        <div className="text-[12px] text-text-secondary truncate mt-0.5">
          {run.source === "bulk"
            ? `Bulk · ${run.leadsTotal.toLocaleString("en-IN")} rows`
            : "Single lookup"}
        </div>
      </div>

      {/* Type */}
      <div>
        <TypePill types={run.types} />
      </div>

      {/* Status */}
      <div>
        <StatusCell run={run} />
      </div>

      {/* Enriched */}
      <div className="text-[13px] text-text-primary tabular-nums">
        <span className="font-medium">{enrichedNow.toLocaleString("en-IN")}</span>
        <span className="text-text-secondary"> of {run.leadsTotal.toLocaleString("en-IN")}</span>
      </div>

      {/* Credits */}
      <div className="text-[13px] tabular-nums leading-snug">
        {isInProgress ? (
          <span className="text-text-secondary">{run.creditsBlocked.toLocaleString("en-IN")} reserved</span>
        ) : (
          <div>
            <div className="text-text-primary font-medium">{run.creditsCharged.toLocaleString("en-IN")} used</div>
            {run.creditsRefunded > 0 && (
              <div className="text-text-secondary text-[12px] mt-0.5">+{run.creditsRefunded.toLocaleString("en-IN")} refunded</div>
            )}
          </div>
        )}
      </div>

      {/* Started */}
      <div className="text-[13px] text-text-secondary tabular-nums">
        {formatRelative(run.startedAt)}
      </div>

      {/* Action: kebab menu */}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end">
        <RowMenu run={run} onView={onView} onBuildAudience={onBuildAudience} summaryOnly={summaryOnly} />
      </div>
    </div>
  );
}

function TypePill({ types }: { types: EnrichmentType[] }) {
  // One tag per type, full name, color-coded.
  return (
    <div className="flex flex-wrap items-center gap-1">
      {types.map((t) => (
        <span key={t} className={`inline-flex items-center text-[12px] font-medium px-2 py-0.5 rounded-badge whitespace-nowrap ${typeColor(t)}`}>
          {typeLabel(t)}
        </span>
      ))}
    </div>
  );
}

export function typeLabel(t: EnrichmentType): string {
  return t === "professional" ? "Professional" : "Financial";
}

export function typeColor(t: EnrichmentType): string {
  // Professional → blue (career / network). Financial → purple (wealth / premium).
  return t === "professional"
    ? "bg-[#EFF6FF] text-[#1D4ED8]"
    : "bg-[#F5F3FF] text-[#6D28D9]";
}

function StatusCell({ run }: { run: RunRecord }) {
  if (run.status === "in_progress") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D4ED8] opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1D4ED8]" />
        </span>
        <span className="text-[13px] text-[#1D4ED8] font-medium tabular-nums">
          Running · {run.progressPct || 0}%
        </span>
      </div>
    );
  }
  if (run.status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13px] text-[#DC2626] font-medium"
        title={run.errorMessage}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
        Failed
      </span>
    );
  }
  const pct = successPct(run);
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#15803D] font-medium tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
      {pct}% enriched
    </span>
  );
}

// ── Row kebab menu ──────────────────────────────────────────────────

function RowMenu({
  run,
  onView,
  onBuildAudience,
  summaryOnly = false,
}: {
  run: RunRecord;
  onView: () => void;
  onBuildAudience: () => void;
  summaryOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // In summary-only mode the workspace's storage window has passed, so
  // download links and CRM-writeback actions are gone — we only show details.
  const canDownload = !summaryOnly && run.status === "done" && run.source === "bulk";
  const canBuildAudience = !summaryOnly && run.status === "done" && run.source === "bulk";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-9 h-9 flex items-center justify-center rounded-button transition-colors ${
          open
            ? "text-text-primary bg-white"
            : "text-text-tertiary hover:text-text-primary hover:bg-white"
        }`}
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.04)] py-1"
        >
          <MenuItem
            icon={<Eye size={14} strokeWidth={1.5} />}
            label="View details"
            onClick={() => { setOpen(false); onView(); }}
          />
          {canDownload && (
            <>
              <MenuItem
                icon={<Download size={14} strokeWidth={1.5} />}
                label="Download CSV"
                onClick={() => { setOpen(false); downloadStub(run, "csv"); }}
              />
              <MenuItem
                icon={<Download size={14} strokeWidth={1.5} />}
                label="Download Excel"
                onClick={() => { setOpen(false); downloadStub(run, "xlsx"); }}
              />
            </>
          )}
          {canBuildAudience && (
            <MenuItem
              icon={<Users size={14} strokeWidth={1.5} />}
              label="Build audience"
              onClick={() => { setOpen(false); onBuildAudience(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors text-left"
    >
      <span className="text-text-tertiary">{icon}</span>
      {label}
    </button>
  );
}

// ── Filter chip (custom dropdown) ──────────────────────────────────

interface FilterOption {
  v: string;
  label: string;
  dot?: string;
}

function FilterChip({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = value !== "all";
  const current = options.find((o) => o.v === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 text-[12px] bg-white border rounded-input transition-colors ${
          active
            ? "border-border text-text-primary"
            : "border-border text-text-secondary hover:text-text-primary"
        }`}
      >
        {active && current?.dot && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: current.dot }} />
        )}
        {active && current ? (
          <span className="font-medium">{current.label}</span>
        ) : (
          <span>{label === "Status" ? "Any status" : label === "Type" ? "Any type" : "Any source"}</span>
        )}
        <ChevronDown size={12} strokeWidth={1.5} className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.04)] py-1"
        >
          {options.map((o) => {
            const selected = o.v === value;
            return (
              <button
                key={o.v}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.v); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors ${
                  selected
                    ? "text-text-primary bg-surface-secondary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-page"
                }`}
              >
                {o.dot ? (
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.dot }} />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0" />
                )}
                <span className="flex-1">{o.label}</span>
                {selected && <Check size={13} strokeWidth={2} className="text-text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Download stub ───────────────────────────────────────────────────

function downloadStub(run: RunRecord, format: "csv" | "xlsx" = "csv") {
  const content = `# Enriched export\n# Run: ${run.id}\n# File: ${run.filename}\n# Leads: ${run.leadsSuccess}/${run.leadsTotal}\n`;
  const mime = format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(run.filename || "enriched").replace(/\.[^.]+$/, "")}-enriched.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## `src/components/enrichment-crm/mapping-table.tsx`

```tsx
"use client";

// Mapping table, required-fields-first view.
// One row per field we need (Name/Phone/Email/LinkedIn/Lead Id).
// Each row shows which CSV column we auto-mapped to it, sample values, and
// status. User can change the source column from a dropdown of file headers.
// Unused CSV columns are tucked into a collapsed footer so they don't add noise.

import { useState } from "react";
import { ChevronDown, Check, AlertCircle } from "lucide-react";
import type { RequiredField } from "@/lib/enrichment-crm-data";

export type MapTarget = "custom" | "leadId" | RequiredField;
export type ColumnMap = Record<string, MapTarget>;

const TARGET_LABELS: Record<Exclude<MapTarget, "custom">, string> = {
  leadId: "Lead Id",
  name: "Name",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
};

interface TargetRow {
  target: Exclude<MapTarget, "custom">;
  required: boolean;
}

// Build the list of target rows to show, based on enrichment type selection.
function targetRows(needName: boolean, needPro: boolean): TargetRow[] {
  const out: TargetRow[] = [];
  if (needName) out.push({ target: "name", required: true });
  if (needPro) {
    out.push({ target: "email", required: true });
    out.push({ target: "phone", required: true });
    out.push({ target: "linkedin", required: true });
  } else {
    out.push({ target: "phone", required: true });
  }
  out.push({ target: "leadId", required: false });
  return out;
}

export function MappingTable({
  headers,
  preview,
  columnMap,
  setColumnMap,
  needName,
  needPro,
}: {
  headers: string[];
  preview: string[][];
  columnMap: ColumnMap;
  setColumnMap: (m: ColumnMap) => void;
  needName: boolean;
  needPro: boolean;
}) {
  const rows = targetRows(needName, needPro);

  // Inverse map: target → which CSV header currently maps to it (if any)
  const headerByTarget: Partial<Record<Exclude<MapTarget, "custom">, string>> = {};
  for (const h of headers) {
    const t = columnMap[h];
    if (t && t !== "custom") headerByTarget[t] = h;
  }

  // Headers already used by another target (used to disable in pickers)
  const usedHeaders = new Set(Object.values(headerByTarget).filter(Boolean) as string[]);

  // Headers not mapped to any target → shown in collapsed footer
  const unusedHeaders = headers.filter(
    (h) => !columnMap[h] || columnMap[h] === "custom",
  );

  const onPick = (target: Exclude<MapTarget, "custom">, header: string) => {
    const next: ColumnMap = { ...columnMap };
    // Clear the header currently mapped to this target (if any)
    for (const h of headers) {
      if (next[h] === target) next[h] = "custom";
    }
    // Empty string = "Not in file" → leave target unmapped
    if (header) next[header] = target;
    setColumnMap(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-[13px] font-semibold text-text-primary">
          Map your file to enrichment fields
        </h4>
        <p className="text-[12px] text-text-tertiary mt-0.5">
          We auto-detected these from your headers. Change any row to remap.
        </p>
      </div>

      <div className="border border-border rounded-card overflow-hidden bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-surface-page/60">
            <tr className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary">
              <th className="text-left px-4 py-2 font-medium w-[180px]">Field we need</th>
              <th className="text-left px-4 py-2 font-medium w-[260px]">Column in your file</th>
              <th className="text-left px-4 py-2 font-medium">Sample values</th>
              <th className="text-right px-4 py-2 font-medium w-[100px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ target, required }) => {
              const mapped = headerByTarget[target];
              const samples = mapped ? sampleValues(preview, headers, mapped) : [];
              return (
                <tr key={target} className="border-t border-border-subtle">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-text-primary">
                        {TARGET_LABELS[target]}
                      </span>
                      {required ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FEF2F2] text-[#DC2626]">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
                          Recommended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <HeaderPicker
                      headers={headers}
                      value={mapped ?? ""}
                      usedHeaders={usedHeaders}
                      onPick={(h) => onPick(target, h)}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-[12px] text-text-secondary truncate max-w-[320px]">
                    {samples.length === 0 ? (
                      <span className="text-text-tertiary italic">No sample</span>
                    ) : (
                      <span title={samples.join(" • ")}>{samples.join("  •  ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {mapped ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
                        <Check size={12} strokeWidth={2.5} />
                        Mapped
                      </span>
                    ) : required ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#DC2626]">
                        <AlertCircle size={12} strokeWidth={2} />
                        Missing
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unusedHeaders.length > 0 && (
        <UnusedColumns
          unusedHeaders={unusedHeaders}
          allHeaders={headers}
          preview={preview}
        />
      )}
    </div>
  );
}

function HeaderPicker({
  headers,
  value,
  usedHeaders,
  onPick,
}: {
  headers: string[];
  value: string;
  usedHeaders: Set<string>;
  onPick: (header: string) => void;
}) {
  const isMapped = value !== "";
  return (
    <div className="relative inline-block w-full max-w-[240px]">
      <select
        value={value}
        onChange={(e) => onPick(e.target.value)}
        className={`appearance-none w-full pr-7 pl-2.5 py-1.5 text-[12px] font-medium rounded-button border bg-white focus:outline-none cursor-pointer transition-colors ${
          isMapped
            ? "border-text-primary text-text-primary"
            : "border-border text-text-secondary hover:border-border-hover"
        }`}
      >
        <option value="">Not in file</option>
        {headers.map((h) => {
          const isUsedElsewhere = usedHeaders.has(h) && h !== value;
          return (
            <option key={h} value={h} disabled={isUsedElsewhere}>
              {h}
              {isUsedElsewhere ? " (already used)" : ""}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={12}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
    </div>
  );
}

function UnusedColumns({
  unusedHeaders,
  allHeaders,
  preview,
}: {
  unusedHeaders: string[];
  allHeaders: string[];
  preview: string[][];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-subtle rounded-card bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-text-secondary hover:bg-surface-page/50 transition-colors"
      >
        <span>
          <span className="font-medium text-text-primary">
            {unusedHeaders.length}
          </span>{" "}
          other column{unusedHeaders.length === 1 ? "" : "s"} in your file won&apos;t be sent
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border-subtle px-4 py-3 space-y-1.5">
          {unusedHeaders.map((h) => {
            const samples = sampleValues(preview, allHeaders, h);
            return (
              <div key={h} className="flex items-baseline gap-3 text-[11.5px]">
                <span className="font-medium text-text-secondary min-w-[140px] truncate">
                  {h}
                </span>
                <span className="text-text-tertiary truncate">
                  {samples.join(" • ") || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function sampleValues(
  preview: string[][],
  headers: string[],
  header: string,
): string[] {
  const idx = headers.indexOf(header);
  if (idx < 0) return [];
  return preview
    .slice(0, 3)
    .map((row) => (row[idx] ?? "").trim())
    .filter((v) => v.length > 0);
}

// Builds an initial ColumnMap by auto-detecting common header names.
export function autoBuildColumnMap(headers: string[]): ColumnMap {
  const out: ColumnMap = {};
  const taken = new Set<MapTarget>();
  const try_ = (header: string, candidates: MapTarget[]) => {
    for (const c of candidates) {
      if (!taken.has(c)) {
        out[header] = c;
        taken.add(c);
        return;
      }
    }
  };
  for (const h of headers) {
    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (out[h]) continue;
    if (/email|mail/.test(norm)) try_(h, ["email"]);
    else if (/linkedin|liurl|profileurl/.test(norm)) try_(h, ["linkedin"]);
    else if (/phone|mobile|contact|tel/.test(norm)) try_(h, ["phone"]);
    else if (/^name$|fullname|leadname|firstname|lastname|givenname|surname/.test(norm)) try_(h, ["name"]);
    else if (/leadid|^id$|recordid/.test(norm)) try_(h, ["leadId"]);
    if (!out[h]) out[h] = "custom";
  }
  return out;
}

// Convert ColumnMap to a Set of mapped required fields (for spot/required checks).
export function mappedFields(columnMap: ColumnMap): Set<RequiredField> {
  const s = new Set<RequiredField>();
  for (const t of Object.values(columnMap)) {
    if (t === "name" || t === "phone" || t === "email" || t === "linkedin") {
      s.add(t);
    }
  }
  return s;
}
```

## `src/components/enrichment-crm/run-drawer.tsx`

```tsx
"use client";

// Side drawer for inspecting a run record (single or bulk).
// Sections: header · status · leads · credits · actions · error (if failed) · profile (single)

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Users, Copy, Check, Loader2, AlertTriangle, Upload, RotateCw } from "lucide-react";
import {
  formatRelative,
  successPct,
  useEnrichmentCrmStore,
  type RunRecord,
} from "@/lib/enrichment-crm-data";
import { useDemoMode } from "@/lib/demo-mode";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";

// No-storage variant treats runs older than this many days as expired:
// downloads, CRM push, audience build all disappear.
const NO_STORAGE_EXPIRY_DAYS = 3;

interface RunDrawerProps {
  run: RunRecord | null;
  onClose: () => void;
  onBuildAudience: (run: RunRecord) => void;
}

export function RunDrawer({ run: runProp, onClose, onBuildAudience }: RunDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Subscribe to the live store version of this run so push state updates while open.
  const liveRun = useEnrichmentCrmStore((s) =>
    runProp ? s.runs.find((r) => r.id === runProp.id) ?? runProp : null,
  );
  const run = liveRun;

  const { isEnrichmentNoStorage } = useDemoMode();
  const expired =
    run != null &&
    isEnrichmentNoStorage &&
    (Date.now() - new Date(run.startedAt).getTime()) / 86_400_000 > NO_STORAGE_EXPIRY_DAYS;

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, onClose]);

  if (!mounted || !run) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[560px] max-w-[92vw] bg-white border-l border-border z-[70] flex flex-col">
        <Header run={run} onClose={onClose} />

        <div className="flex-1 overflow-y-auto">
          {run.source === "crm" && (
            <>
              <CrmStatusSection run={run} />
              {run.profile && (
                <>
                  <Divider />
                  <section className="p-5">
                    <SectionLabel>Enriched profile</SectionLabel>
                    <div className="mt-3">
                      <LeadProfileCard profile={run.profile} variant="inline" />
                    </div>
                  </section>
                </>
              )}
              {run.status === "done" && (
                <>
                  <Divider />
                  <PushToCrmSection run={run} />
                </>
              )}
            </>
          )}

          {run.source === "bulk" && (
            <>
              <StatusSection run={run} />
              <Divider />
              <LeadsSection run={run} />
              <Divider />
              <CreditsSection run={run} />
              {run.status === "done" && !expired && (
                <>
                  <Divider />
                  <PushToCrmSection run={run} />
                </>
              )}
              {!expired && (
                <>
                  <Divider />
                  <ActionsSection
                    run={run}
                    onBuildAudience={() => onBuildAudience(run)}
                    noStorage={isEnrichmentNoStorage}
                  />
                </>
              )}
            </>
          )}

          {run.status === "failed" && (
            <>
              <Divider />
              <ErrorSection run={run} />
            </>
          )}

          {run.source === "single" && run.profile && (
            <>
              <Divider />
              <section className="p-5">
                <SectionLabel>Profile</SectionLabel>
                <div className="mt-3">
                  <LeadProfileCard profile={run.profile} variant="inline" />
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}

function Header({ run, onClose }: { run: RunRecord; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-5 py-4 border-b border-border">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-text-primary truncate">
          {run.source === "bulk"
            ? run.filename
            : run.source === "crm"
              ? run.profile?.contact?.name || run.profile?.contact?.email || run.crmOrigin?.recordId || "CRM lead"
              : run.inputValue}
        </h2>
        {run.source === "crm" && (
          <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
            {run.crmOrigin?.channel} · {run.crmOrigin?.provider ? capitalize(run.crmOrigin.provider) : ""}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {run.types.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${
                t === "professional"
                  ? "bg-[#EFF6FF] text-[#1D4ED8]"
                  : "bg-[#F5F3FF] text-[#6D28D9]"
              }`}
            >
              {t === "professional" ? "Professional" : "Financial"}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors"
        aria-label="Close"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function CrmStatusSection({ run }: { run: RunRecord }) {
  const enrichStatus = run.profile?.enrichment_status;

  let pillClass = "bg-surface-secondary text-text-secondary";
  let label = "—";
  if (run.status === "failed") { pillClass = "bg-[#FEF2F2] text-[#DC2626]"; label = "Failed"; }
  else if (enrichStatus === "Zero Enrichment") { pillClass = "bg-surface-secondary text-text-secondary"; label = "Not enriched"; }
  else if (enrichStatus === "Partial Enrichment") { pillClass = "bg-[#FFFBEB] text-[#B45309]"; label = "Partial"; }
  else if (run.status === "done") { pillClass = "bg-[#F0FDF4] text-[#15803D]"; label = "Enriched"; }

  return (
    <section className="p-5">
      <SectionLabel>Status</SectionLabel>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-badge ${pillClass}`}>{label}</span>
        <span className="text-[11.5px] text-text-tertiary">
          {formatRelative(run.startedAt)}
        </span>
      </div>
    </section>
  );
}

function StatusSection({ run }: { run: RunRecord }) {
  let pillClass = "bg-surface-secondary text-text-secondary";
  let label = "—";
  if (run.status === "done") { pillClass = "bg-[#F0FDF4] text-[#15803D]"; label = `Done · ${successPct(run)}% success`; }
  if (run.status === "in_progress") { pillClass = "bg-[#EFF6FF] text-[#1D4ED8]"; label = `In progress · ${run.progressPct || 0}%`; }
  if (run.status === "failed") { pillClass = "bg-[#FEF2F2] text-[#DC2626]"; label = "Failed"; }

  return (
    <section className="p-5">
      <SectionLabel>Status</SectionLabel>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-badge ${pillClass}`}>{label}</span>
      </div>
      <div className="text-[12px] text-text-tertiary mt-2">
        Started {formatRelative(run.startedAt)}
        {run.finishedAt && <span> · Finished {formatRelative(run.finishedAt)}</span>}
      </div>
    </section>
  );
}

function LeadsSection({ run }: { run: RunRecord }) {
  return (
    <section className="p-5">
      <SectionLabel>Leads</SectionLabel>
      <div className="grid grid-cols-4 gap-3 mt-3">
        <Stat label="Success" value={run.leadsSuccess} accent="ok" />
        <Stat label="Failed" value={run.leadsFailed} accent={run.leadsFailed > 0 ? "err" : "muted"} />
        <Stat label="Skipped" value={run.leadsSkipped} accent="muted" />
        <Stat label="Total" value={run.leadsTotal} accent="primary" />
      </div>
    </section>
  );
}

function CreditsSection({ run }: { run: RunRecord }) {
  return (
    <section className="p-5">
      <SectionLabel>Credits</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Stat label="Blocked" value={run.creditsBlocked} accent="muted" />
        <Stat label="Charged" value={run.creditsCharged} accent="primary" />
        <Stat label="Refunded" value={run.creditsRefunded} accent={run.creditsRefunded > 0 ? "ok" : "muted"} />
      </div>
      {run.creditsRefunded > 0 && (
        <p className="text-[11px] text-text-tertiary mt-3">
          {run.creditsRefunded.toLocaleString("en-IN")} credits refunded for leads we couldn't enrich.
        </p>
      )}
    </section>
  );
}

function PushToCrmSection({ run }: { run: RunRecord }) {
  const conn = useEnrichmentCrmStore((s) => s.crmConnection);
  const pushRunToCrm = useEnrichmentCrmStore((s) => s.pushRunToCrm);

  const providerLabel = capitalize(conn.provider);
  const sync = run.crmSync;
  const isPending = sync?.status === "pending";
  const isSynced  = sync?.status === "synced";
  const isFailed  = sync?.status === "failed";

  return (
    <section className="p-5">
      <SectionLabel>Push to CRM</SectionLabel>

      {!sync || sync.status === "not_pushed" ? (
        // Idle, primary CTA
        <>
          <p className="text-[12px] text-text-secondary mt-2 leading-snug">
            Send {run.leadsSuccess.toLocaleString("en-IN")} enriched leads to {providerLabel} ({conn.accountName}).
            Policy: <span className="text-text-primary">{policyLabel(conn.writeBackPolicy)}</span>.
          </p>
          <div className="mt-3">
            <ActionBtn primary onClick={() => pushRunToCrm(run.id)}>
              <Upload size={13} strokeWidth={1.75} />
              Send to {providerLabel}
            </ActionBtn>
          </div>
        </>
      ) : isPending ? (
        // Pending, disabled button + spinner pill
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
              <Loader2 size={11} strokeWidth={2} className="animate-spin" />
              Pushing to {providerLabel}…
            </span>
          </div>
          <p className="text-[12px] text-text-tertiary mt-2 leading-snug">
            Writing {run.leadsSuccess.toLocaleString("en-IN")} enriched records back. Usually finishes in a few seconds.
          </p>
        </>
      ) : isSynced ? (
        // Synced, success pill + counts + re-push
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-[#F0FDF4] text-[#15803D]">
              <Check size={11} strokeWidth={2.5} />
              Pushed to {providerLabel}
            </span>
            <span className="text-[11.5px] text-text-tertiary">{formatRelative(sync.syncedAt!)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Stat label="Pushed" value={sync.pushedRecords ?? 0} accent="ok" />
            <Stat label="Rejected" value={sync.failedRecords ?? 0} accent={(sync.failedRecords ?? 0) > 0 ? "err" : "muted"} />
          </div>
          {sync.errorMessage && (
            <p className="text-[12px] text-[#7F1D1D] bg-[#FEF2F2] border border-[#FECACA] rounded-card px-3 py-2 mt-3 leading-snug">
              {sync.errorMessage}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <ActionBtn onClick={() => pushRunToCrm(run.id)}>
              <RotateCw size={13} strokeWidth={1.75} />
              Push again
            </ActionBtn>
          </div>
        </>
      ) : isFailed ? (
        // Failed, error state + retry
        <>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-[#FEF2F2] text-[#DC2626]">
              <AlertTriangle size={11} strokeWidth={2} />
              Push failed
            </span>
          </div>
          <p className="text-[12px] text-[#7F1D1D] bg-[#FEF2F2] border border-[#FECACA] rounded-card px-3 py-2 mt-3 leading-snug">
            {sync.errorMessage || `${providerLabel} rejected the request. Try again or check the connection.`}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <ActionBtn primary onClick={() => pushRunToCrm(run.id)}>
              <RotateCw size={13} strokeWidth={1.75} />
              Retry push
            </ActionBtn>
          </div>
        </>
      ) : null}
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function policyLabel(p: string): string {
  if (p === "fill_blanks") return "Fill blanks only";
  if (p === "overwrite") return "Overwrite existing";
  if (p === "field_selective") return "Field-selective";
  return p;
}

function ActionsSection({
  run,
  onBuildAudience,
  noStorage,
}: {
  run: RunRecord;
  onBuildAudience: () => void;
  noStorage: boolean;
}) {
  if (run.status !== "done") return null;
  return (
    <section className="p-5">
      <SectionLabel>Export</SectionLabel>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <ActionBtn onClick={() => download(run, "csv")}>
          <Download size={13} strokeWidth={1.5} />
          Download CSV
        </ActionBtn>
        <ActionBtn onClick={() => download(run, "xlsx")}>
          <Download size={13} strokeWidth={1.5} />
          Download Excel
        </ActionBtn>
        <ActionBtn onClick={onBuildAudience} primary>
          <Users size={13} strokeWidth={1.5} />
          Build audience
        </ActionBtn>
      </div>
      {noStorage && (
        <p className="text-[11.5px] text-text-tertiary mt-3 leading-snug">
          Available for 7 days from the time enrichment completes.
        </p>
      )}
    </section>
  );
}

function ErrorSection({ run }: { run: RunRecord }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${run.id}\n${run.errorCode}\n${run.errorMessage || ""}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* noop */ }
  };
  return (
    <section className="p-5">
      <SectionLabel>Why this run failed</SectionLabel>
      <div className="mt-3 p-3 rounded-card bg-[#FEF2F2] border border-[#FECACA]">
        <div className="text-[12px] font-medium text-[#DC2626]">{run.errorCode || "Unknown error"}</div>
        <p className="text-[12px] text-[#7F1D1D] mt-1">{run.errorMessage}</p>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <ActionBtn onClick={onCopy}>
          {copied ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy error ID"}
        </ActionBtn>
      </div>
    </section>
  );
}

// ── primitives ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">{children}</div>
  );
}

function Divider() {
  return <div className="border-t border-border-subtle" />;
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "ok" | "err" | "primary" | "muted" }) {
  const map = {
    ok: "text-[#15803D]",
    err: "text-[#DC2626]",
    primary: "text-text-primary",
    muted: "text-text-secondary",
  };
  return (
    <div>
      <div className="text-[11px] text-text-tertiary">{label}</div>
      <div className={`text-[18px] font-semibold tabular-nums mt-0.5 ${map[accent]}`}>{value.toLocaleString("en-IN")}</div>
    </div>
  );
}

function ActionBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-button transition-colors ${
        primary
          ? "bg-text-primary text-white hover:bg-accent-hover"
          : "bg-white text-text-secondary border border-border hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function download(run: RunRecord, format: "csv" | "xlsx") {
  const content = `# Enriched export, ${format.toUpperCase()}\n# Run: ${run.id}\n# File: ${run.filename}\n# Leads: ${run.leadsSuccess}/${run.leadsTotal}\n# Backend wires real export.\n`;
  const mime = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(run.filename || "enriched").replace(/\.[^.]+$/, "")}-enriched.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## `src/components/enrichment-crm/spot.ts`

```tsx
// Spot nudge engine, pure function.
// Inputs: which enrichment types are picked + which fields have a value.
// Output: optional upgrade line + optional name-quality note.
// Spot stays silent when (a) required fields aren't filled, or (b) the user already
// has the strongest input combination.

import type { EnrichmentType, RequiredField } from "@/lib/enrichment-crm-data";

export type SpotInput = {
  types: EnrichmentType[];
  available: Set<RequiredField>;
};

export type SpotMessage = {
  primary?: string;     // upgrade hint shown as first line
  nameNote?: boolean;   // shows "Use the exact name registered with the phone number"
};

export const SPOT_NAME_NOTE = "Use the exact name registered with the phone number.";

export function computeSpot({ types, available }: SpotInput): SpotMessage | null {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return null;

  const has = (f: RequiredField) => available.has(f);

  // Professional only ───────────────────────────────────────────────
  if (hasPro && !hasFin) {
    const proRequiredMet = has("email") || has("phone") || has("linkedin");
    if (!proRequiredMet) return null;             // static instruction takes over
    if (has("linkedin")) return null;             // strongest path, silent
    if (has("email") && has("phone")) return null; // skip per spec
    if (has("email")) {
      return {
        primary: "Add LinkedIn URL for a higher enrichment rate. Email alone still works.",
      };
    }
    if (has("phone")) {
      return {
        primary: "Add LinkedIn URL or Email for a higher enrichment rate. Phone alone still works.",
      };
    }
    return null;
  }

  // Financial only ──────────────────────────────────────────────────
  if (hasFin && !hasPro) {
    const finRequiredMet = has("name") && has("phone");
    if (!finRequiredMet) return null;
    return { nameNote: true };
  }

  // Professional + Financial ────────────────────────────────────────
  const bothRequiredMet = has("name") && has("phone");
  if (!bothRequiredMet) return null;

  // Required met. Decide if Pro upgrade also fires.
  if (has("linkedin") || has("email")) {
    // Pro path already strong enough, name note only
    return { nameNote: true };
  }

  // Only Name + Phone → nudge Pro upgrade + name note
  return {
    primary:
      "Add LinkedIn URL or Email for a higher Professional enrichment rate. Name + Phone still works.",
    nameNote: true,
  };
}

// Static instruction shown when required fields aren't filled.
// Renders in the footer area (not in Spot bubble), it's a hard requirement, not a tip.
export function staticInstruction(types: EnrichmentType[]): string | null {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return "Pick at least one enrichment type to get started.";
  if (hasPro && !hasFin) return "Add LinkedIn URL, Email, or Phone to get started.";
  if (hasFin && !hasPro) return "Add Name and Phone to get started.";
  return "Add Name and Phone to get started.";
}

// Required-fields-met check used to enable/disable the submit button.
export function requiredFieldsMet(
  types: EnrichmentType[],
  available: Set<RequiredField>,
): boolean {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return false;

  const has = (f: RequiredField) => available.has(f);

  if (hasFin && (!has("name") || !has("phone"))) return false;
  if (hasPro && !hasFin && !has("email") && !has("phone") && !has("linkedin")) return false;
  return true;
}
```

## `src/components/enrichment/composer.tsx`

```tsx
"use client";

// Enrichment composer, single shape.
// Top: Bulk/Single tabs + Professional/Financial checkboxes.
// Bulk body: pre-drop = "Fields needed" card + drop zone. Post-drop = file pill + mapping table.
// Single body: 60/40 split, adaptive inputs on the left, result panel on the right.
// Footer: Spot tip area + cost + submit.

import { useEffect, useState } from "react";
import {
  useComposerState,
  TabSwitcher,
  TypeCheckboxes,
  TypeCostInfo,
  FieldsNeededCard,
  SingleInputsAdaptive,
  FileCard,
  DropZone,
  SubmitButton,
  submitLabelBulk,
  submitLabelSingle,
} from "./composer-shared";
import { MappingTable } from "./mapping-table";
import { computeSpot, staticInstruction, SPOT_NAME_NOTE } from "./spot";
import { TipCallout } from "@/components/project/shared/spot-callout";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";
import { AlertTriangle } from "lucide-react";
import { IllustrationEnrichment, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";

export function EnrichmentComposer() {
  const state = useComposerState();
  const { tab } = state;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Top strip */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <TabSwitcher tab={tab} setTab={state.setTab} />
            <div className="w-px h-5 bg-border-subtle" />
            <TypeCheckboxes types={state.types} toggle={state.toggleType} />
          </div>
          <TypeCostInfo types={state.types} />
        </div>

        {/* Body */}
        {tab === "bulk" ? <BulkBody state={state} /> : <SingleBody state={state} />}

        {/* Footer, only Bulk shows the global footer (after a file is dropped).
            Single mode owns its own actions inside the left column. */}
        {tab === "bulk" && state.file && <Footer state={state} />}
      </div>
    </div>
  );
}

// ── Bulk body ──────────────────────────────────────────────────────

function BulkBody({ state }: { state: ReturnType<typeof useComposerState> }) {
  if (!state.file) {
    return (
      <div className="grid grid-cols-[260px_1fr] gap-4 px-5 py-5">
        <FieldsNeededCard hasPro={state.hasPro} hasFin={state.hasFin} />
        <DropZone
          fileInputRef={state.fileInputRef}
          onChosen={state.onFileChosen}
          sampleHref={state.sampleHref}
          sampleName={state.sampleName}
        />
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-4">
      <FileCard file={state.file} rowCount={state.rowCount} onClear={state.resetBulk} />
      {state.headers.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold text-text-primary">Pick matching columns</div>
              <div className="text-[11.5px] text-text-tertiary mt-0.5">
                We auto-mapped what we recognised. Adjust the dropdown above any column to remap.
              </div>
            </div>
          </div>
          <MappingTable
            headers={state.headers}
            preview={state.preview}
            columnMap={state.columnMap}
            setColumnMap={state.setColumnMap}
            needName={state.hasFin}
            needPro={state.hasPro}
          />
        </div>
      ) : (
        <div className="text-[12px] text-text-tertiary px-3 py-2 bg-surface-page rounded-card">
          Couldn&apos;t read column headers from this file. Try a CSV with a header row.
        </div>
      )}
    </div>
  );
}

// ── Single body ────────────────────────────────────────────────────
// Left column: top tip → inputs → (push down) spot tip → actions row.
// Right column: result panel. No global footer in Single mode.

function SingleBody({ state }: { state: ReturnType<typeof useComposerState> }) {
  const spot = state.singleReady
    ? computeSpot({ types: state.types, available: state.singleAvailable })
    : null;

  const topInstruction = !state.singleReady ? staticInstruction(state.types) : null;

  return (
    <div className="grid grid-cols-2 divide-x divide-border-subtle">
      {/* Left: inputs + actions */}
      <div className="px-5 pt-5 pb-4 flex flex-col min-h-[440px]">
        {/* Instruction line, sits above inputs so the ask is visible before fields */}
        {topInstruction && (
          <p className="text-[12px] text-text-secondary mb-3">{topInstruction}</p>
        )}

        {/* Inputs */}
        <SingleInputsAdaptive
          hasPro={state.hasPro}
          hasFin={state.hasFin}
          email={state.singleEmail} setEmail={state.setSingleEmail}
          phone={state.singlePhone} setPhone={state.setSinglePhone}
          linkedin={state.singleLinkedin} setLinkedin={state.setSingleLinkedin}
          name={state.singleName} setName={state.setSingleName}
        />

        {/* Push the actions block to the bottom of the column */}
        <div className="mt-auto pt-4 space-y-3">
          {spot && (
            <TipCallout
              body={[spot.primary, spot.nameNote ? SPOT_NAME_NOTE : null]
                .filter(Boolean)
                .join("\n\n")}
            />
          )}
          <SingleActionsRow state={state} />
        </div>
      </div>

      {/* Right: result */}
      <div className="px-5 py-5">
        <ResultPanel state={state} />
      </div>
    </div>
  );
}

function SingleActionsRow({ state }: { state: ReturnType<typeof useComposerState> }) {
  const cost = state.singleCost;
  const insufficient = state.insufficientForSingle;
  const ready = state.singleReady;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {insufficient ? (
          <div className="flex items-start gap-1.5 text-[12px] text-[#DC2626]">
            <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>Not enough credits. Top up to continue.</span>
          </div>
        ) : ready ? (
          <span className="text-[12px] text-text-secondary tabular-nums">
            ≈ {cost} credit{cost === 1 ? "" : "s"} per lead
          </span>
        ) : null}
      </div>
      <SubmitButton
        label={submitLabelSingle(state)}
        disabled={!state.singleReady || state.insufficientForSingle}
        loading={state.isEnriching}
        onClick={state.submitSingle}
      />
    </div>
  );
}

function ResultPanel({ state }: { state: ReturnType<typeof useComposerState> }) {
  const failed =
    state.inlineResult &&
    (!state.inlineResult.profile || Object.keys(state.inlineResult.profile).length === 0);

  return (
    <div className="h-[400px] overflow-y-auto">
      {state.isEnriching ? (
        <EnrichingSkeleton types={state.types} />
      ) : failed ? (
        <FailedState />
      ) : state.inlineResult && state.inlineResult.profile ? (
        <LeadProfileCard
          profile={state.inlineResult.profile}
          variant="inline"
          onExpand={() => {
            // Page-level RunDrawer listens for this and opens with the matched run.
            const run = state.inlineResult;
            if (!run) return;
            window.dispatchEvent(new CustomEvent("enrichment:open-run", { detail: { runId: run.id } }));
          }}
        />
      ) : (
        <EmptyResultState />
      )}
    </div>
  );
}

function EmptyResultState() {
  return (
    <div className="h-full border-2 border-dashed border-border rounded-card flex flex-col items-center justify-center text-center px-6 bg-surface-page">
      <div className="opacity-90 mb-2">
        <IllustrationEnrichment />
      </div>
      <div className="text-[13px] font-semibold text-text-primary">Result appears here</div>
      <div className="text-[12px] text-text-tertiary leading-[1.5] mt-1 max-w-[240px]">
        Fill the fields on the left and hit Enrich. The matched profile shows up here.
      </div>
    </div>
  );
}

function FailedState() {
  return (
    <div className="h-full border-2 border-dashed border-border rounded-card flex flex-col items-center justify-center text-center px-6 bg-surface-page">
      <div className="opacity-90 mb-2">
        <IllustrationSearchEmpty />
      </div>
      <div className="text-[13px] font-semibold text-text-primary">No match found</div>
      <div className="text-[12px] text-text-tertiary leading-[1.5] mt-1 max-w-[240px]">
        We couldn&apos;t find this lead across our sources. Credits have been refunded.
      </div>
    </div>
  );
}

// Stepped progress while a single enrichment is "running", feels like real work.
function EnrichingSkeleton({ types }: { types: ReturnType<typeof useComposerState>["types"] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  const steps = [
    "Looking up the lead",
    hasPro ? "Pulling professional data" : null,
    hasFin ? "Verifying financial profile" : null,
    "Stitching the result",
  ].filter(Boolean) as string[];

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const tick = Math.max(380, Math.floor(1800 / steps.length));
    const id = window.setInterval(() => {
      setActiveIdx((i) => Math.min(i + 1, steps.length - 1));
    }, tick);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className="h-full border border-border-subtle rounded-card bg-white p-4 flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-surface-page animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 bg-surface-page rounded animate-pulse" />
          <div className="h-2.5 w-44 bg-surface-page rounded animate-pulse" />
        </div>
      </div>
      {/* Field placeholders */}
      <div className="space-y-2 mb-5">
        <div className="h-2.5 w-full bg-surface-page rounded animate-pulse" />
        <div className="h-2.5 w-4/5 bg-surface-page rounded animate-pulse" />
        <div className="h-2.5 w-3/5 bg-surface-page rounded animate-pulse" />
      </div>
      {/* Live step list */}
      <div className="mt-auto space-y-1.5">
        {steps.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s} className="flex items-center gap-2 text-[11.5px]">
              {done ? (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-emerald-600">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : active ? (
                <svg className="animate-spin text-text-primary" width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <span className="w-[11px] h-[11px] rounded-full border border-border-subtle" />
              )}
              <span className={done ? "text-text-secondary" : active ? "text-text-primary font-medium" : "text-text-tertiary"}>
                {s}
                {active ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────

function Footer({ state }: { state: ReturnType<typeof useComposerState> }) {
  const isBulk = state.tab === "bulk";
  const available = isBulk ? state.bulkAvailable : state.singleAvailable;
  const ready = isBulk ? state.bulkReady : state.singleReady;
  const insufficient = isBulk ? state.insufficientForBulk : state.insufficientForSingle;
  const cost = isBulk ? state.bulkCost : state.singleCost;

  // Spot speaks only when required fields are met; otherwise static instruction renders.
  const spot = ready ? computeSpot({ types: state.types, available }) : null;
  const instruction = !ready ? staticInstruction(state.types) : null;

  // Special case: bulk pre-drop → no instruction, no spot
  const preDrop = isBulk && !state.file;

  return (
    <div className="border-t border-border-subtle">
      {/* Tip / instruction area */}
      {!preDrop && (spot || instruction) && (
        <div className="px-5 pt-4 pb-1">
          {spot ? (
            <TipCallout
              body={[spot.primary, spot.nameNote ? SPOT_NAME_NOTE : null]
                .filter(Boolean)
                .join("\n\n")}
            />
          ) : (
            <div className="text-[12px] text-text-secondary">{instruction}</div>
          )}
        </div>
      )}

      {/* Submit row */}
      <div className="px-5 py-3 flex items-center gap-3 bg-surface-page/40">
        <div className="flex-1 min-w-0">
          {insufficient ? (
            <div className="flex items-start gap-1.5 text-[12px] text-[#DC2626]">
              <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>Not enough credits. Top up to continue.</span>
            </div>
          ) : ready ? (
            <span className="text-[12px] text-text-secondary tabular-nums">
              {isBulk ? (
                <>
                  ≈ {cost.toLocaleString("en-IN")} credits
                  <span className="text-text-tertiary">
                    {" "}({state.rowCount.toLocaleString("en-IN")} rows × {state.perLead})
                  </span>
                </>
              ) : (
                <>≈ {cost} credit{cost === 1 ? "" : "s"} per lead</>
              )}
            </span>
          ) : (
            <span className="text-[12px] text-text-tertiary">
              {isBulk && !state.file ? "Drop a file to see the cost" : ""}
            </span>
          )}
        </div>
        <SubmitButton
          label={isBulk ? submitLabelBulk(state) : submitLabelSingle(state)}
          disabled={isBulk ? !state.bulkReady || state.insufficientForBulk : !state.singleReady || state.insufficientForSingle}
          loading={isBulk ? state.isQueuing : state.isEnriching}
          onClick={isBulk ? state.submitBulk : state.submitSingle}
        />
      </div>
    </div>
  );
}
```

## `src/components/enrichment/composer-shared.tsx`

```tsx
"use client";

// Shared state hook for the enrichment composer (single-shape).
// Owns: tab (bulk/single), checkboxes (professional/financial),
// single-mode inputs, bulk-mode file + column map, derived flags.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import {
  CREDITS_PER_LEAD,
  type EnrichmentType,
  type RequiredField,
  sampleCsvDataUrl,
  sampleCsvFilename,
  useEnrichmentStore,
  type RunRecord,
  sampleProfile,
} from "@/lib/enrichment-data";
import { autoBuildColumnMap, mappedFields, type ColumnMap } from "./mapping-table";
import { requiredFieldsMet } from "./spot";

export type Tab = "bulk" | "single";

const PREVIEW_ROWS = 6;

export function useComposerState() {
  const [tab, setTab] = useState<Tab>("bulk");
  const [types, setTypes] = useState<EnrichmentType[]>(["professional"]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isQueuing, setIsQueuing] = useState(false);

  // Single-mode inputs
  const [singleEmail, setSingleEmail] = useState("");
  const [singlePhone, setSinglePhone] = useState("");
  const [singleLinkedin, setSingleLinkedin] = useState("");
  const [singleName, setSingleName] = useState("");

  // Bulk-mode file + headers + preview + column map
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});

  const [inlineResult, setInlineResult] = useState<RunRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const balance = useEnrichmentStore((s) => s.balance);
  const addRun = useEnrichmentStore((s) => s.addRun);

  const toggleType = useCallback((t: EnrichmentType) => {
    setTypes((cur) => {
      const has = cur.includes(t);
      // Block unticking the last remaining type, at least one must stay on.
      if (has && cur.length === 1) return cur;
      return has ? cur.filter((x) => x !== t) : [...cur, t];
    });
    setInlineResult(null);
  }, []);

  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");

  // ── Field availability ──────────────────────────────────────────
  const singleAvailable = useMemo(() => {
    const set = new Set<RequiredField>();
    if (singleEmail.trim()) set.add("email");
    if (singlePhone.trim()) set.add("phone");
    if (singleLinkedin.trim()) set.add("linkedin");
    if (singleName.trim()) set.add("name");
    return set;
  }, [singleEmail, singlePhone, singleLinkedin, singleName]);

  const bulkAvailable = useMemo(() => mappedFields(columnMap), [columnMap]);

  // ── Required-fields-met (drives submit-enabled) ─────────────────
  const singleReady = useMemo(
    () => requiredFieldsMet(types, singleAvailable),
    [types, singleAvailable],
  );
  const bulkReady = useMemo(
    () => !!file && requiredFieldsMet(types, bulkAvailable),
    [file, types, bulkAvailable],
  );

  // ── Cost ────────────────────────────────────────────────────────
  const perLead = useMemo(
    () => types.reduce((sum, t) => sum + CREDITS_PER_LEAD[t], 0),
    [types],
  );
  const singleCost = perLead;
  const bulkCost = useMemo(() => perLead * rowCount, [perLead, rowCount]);

  const insufficientForSingle = singleReady && singleCost > balance;
  const insufficientForBulk = bulkReady && bulkCost > balance;

  // ── File handling ───────────────────────────────────────────────
  const onFileChosen = useCallback(async (f: File) => {
    setFile(f);
    setInlineResult(null);
    try {
      const text = await f.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        setHeaders([]);
        setPreview([]);
        setRowCount(0);
        setColumnMap({});
        return;
      }
      const heads = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const body = lines.slice(1, 1 + PREVIEW_ROWS).map((l) =>
        l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
      );
      setHeaders(heads);
      setPreview(body);
      setRowCount(Math.max(0, lines.length - 1));
      setColumnMap(autoBuildColumnMap(heads));
    } catch {
      const estRows = Math.max(1, Math.floor(f.size / 120));
      setHeaders([]);
      setPreview([]);
      setRowCount(estRows);
      setColumnMap({});
    }
  }, []);

  const resetBulk = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setRowCount(0);
    setColumnMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const resetSingle = useCallback(() => {
    setSingleEmail(""); setSinglePhone(""); setSingleLinkedin(""); setSingleName("");
  }, []);

  // Clear stale single inputs when their owning checkbox is turned off
  useEffect(() => {
    if (!hasFin) setSingleName("");
    if (!hasPro) {
      setSingleEmail("");
      setSingleLinkedin("");
    }
  }, [hasFin, hasPro]);

  // ── Submit ──────────────────────────────────────────────────────
  // Single: fake a ~1.8s enrichment so the UI feels real (network + processing).
  const submitSingle = useCallback(() => {
    if (!singleReady || insufficientForSingle || isEnriching) return;
    setIsEnriching(true);
    setInlineResult(null);
    const startedAt = new Date().toISOString();
    window.setTimeout(() => {
      // ~15% no-match rate keeps the demo honest and shows the failed state in normal use.
      // Test triggers: phone "0000000000" or email containing "fail" always misses.
      const forceFail =
        singlePhone.replace(/\D/g, "") === "0000000000" ||
        /fail/i.test(singleEmail);
      const miss = forceFail || Math.random() < 0.15;
      // Pull from any existing enriched run first (so demo state evolves),
      // fall back to the canonical sampleProfile so financial-only / professional-only
      // submissions still surface the requested blocks.
      const baseProfile = useEnrichmentStore.getState().runs.find((r) => r.profile)?.profile || sampleProfile;
      const resultProfile = miss
        ? undefined
        : {
            ...baseProfile,
            // Only include blocks the user actually paid for.
            professional: hasPro ? baseProfile.professional : undefined,
            financial: hasFin ? baseProfile.financial : undefined,
            // Always carry the typed input so the card has a header even when pro is off.
            // Fall back to enriched contact from the base sample so we surface the
            // discovered email + phone, not just the one the user typed.
            contact: {
              name: singleName || baseProfile.contact?.name,
              email: singleEmail || baseProfile.contact?.email,
              phone: singlePhone || baseProfile.contact?.phone,
              linkedin: singleLinkedin || baseProfile.contact?.linkedin,
            },
          };
      const run: RunRecord = {
        id: `run-${Date.now()}`,
        source: "single",
        inputValue: singleEmail || singlePhone || singleLinkedin || singleName,
        types,
        status: miss ? "failed" : "done",
        leadsTotal: 1,
        leadsSuccess: miss ? 0 : 1,
        leadsFailed: miss ? 1 : 0,
        leadsSkipped: 0,
        creditsBlocked: singleCost,
        creditsCharged: miss ? 0 : singleCost,
        creditsRefunded: miss ? singleCost : 0,
        startedAt,
        finishedAt: new Date().toISOString(),
        profile: resultProfile,
      };
      addRun(run);
      setInlineResult(run);
      setIsEnriching(false);
    }, 1800);
  }, [singleReady, insufficientForSingle, isEnriching, singleEmail, singlePhone, singleLinkedin, singleName, types, singleCost, addRun, hasPro, hasFin]);

  // Bulk: short queuing delay so it feels like an upload, then drop into history with 0% progress
  // (the page-level ticker walks it up to 100%).
  const submitBulk = useCallback(() => {
    if (!file || !bulkReady || insufficientForBulk || isQueuing) return;
    setIsQueuing(true);
    const captured = { file, types: [...types], rowCount, bulkCost };
    window.setTimeout(() => {
      const run: RunRecord = {
        id: `run-${Date.now()}`,
        source: "bulk",
        filename: captured.file.name,
        types: captured.types,
        status: "in_progress",
        progressPct: 0,
        leadsTotal: captured.rowCount,
        leadsSuccess: 0,
        leadsFailed: 0,
        leadsSkipped: 0,
        creditsBlocked: captured.bulkCost,
        creditsCharged: 0,
        creditsRefunded: 0,
        startedAt: new Date().toISOString(),
      };
      addRun(run);
      resetBulk();
      setIsQueuing(false);
      window.dispatchEvent(
        new CustomEvent("enrichment:toast", {
          detail: {
            kind: "bulk_started",
            title: `Enriching ${captured.rowCount.toLocaleString("en-IN")} leads`,
            description: `${captured.file.name} · ${captured.bulkCost.toLocaleString("en-IN")} credits reserved. We'll email you when it's done.`,
            runId: run.id,
          },
        }),
      );
    }, 900);
  }, [file, bulkReady, insufficientForBulk, isQueuing, types, rowCount, bulkCost, addRun, resetBulk]);

  return {
    tab, setTab,
    types, toggleType, hasPro, hasFin,

    // single
    singleEmail, setSingleEmail,
    singlePhone, setSinglePhone,
    singleLinkedin, setSingleLinkedin,
    singleName, setSingleName,
    singleAvailable, singleReady,
    singleCost, insufficientForSingle,
    submitSingle, resetSingle,
    inlineResult, setInlineResult,
    isEnriching, isQueuing,

    // bulk
    file, headers, preview, rowCount, columnMap, setColumnMap, fileInputRef,
    bulkAvailable, bulkReady,
    bulkCost, insufficientForBulk, perLead,
    onFileChosen, resetBulk, submitBulk,

    // shared
    balance,
    sampleHref: sampleCsvDataUrl(types),
    sampleName: sampleCsvFilename(types),
  };
}

export type ComposerState = ReturnType<typeof useComposerState>;

// ── Sub-components ──────────────────────────────────────────────

export function TabSwitcher({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  // Prominent segmented pill, bigger surface, stronger active contrast, icon hint.
  return (
    <div className="inline-flex items-center bg-surface-page border border-border rounded-[10px] p-1">
      {(["bulk", "single"] as Tab[]).map((t) => {
        const active = t === tab;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-[7px] transition-all duration-150 ${
              active
                ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.08)]"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t === "bulk" ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-90">
                <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 6.5h12M6 3v10M10 3v10" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" className="opacity-90">
                <circle cx="8" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 13.5c.6-2.4 2.7-3.6 5-3.6s4.4 1.2 5 3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
            {t === "bulk" ? "Bulk CSV" : "One lead"}
          </button>
        );
      })}
    </div>
  );
}

export function TypeCheckboxes({
  types,
  toggle,
}: {
  types: EnrichmentType[];
  toggle: (t: EnrichmentType) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <CheckboxPill
        active={types.includes("professional")}
        label="Professional"
        onClick={() => toggle("professional")}
      />
      <CheckboxPill
        active={types.includes("financial")}
        label="Financial"
        onClick={() => toggle("financial")}
      />
    </div>
  );
}

// Right-aligned per-lead cost summary for the top strip. Shown so the
// user knows the unit price up front, before they pick a tab or drop a
// file. Each type is dimmed when not currently selected so the active
// cost stack reads as the live total.
export function TypeCostInfo({ types }: { types: EnrichmentType[] }) {
  const pro = CREDITS_PER_LEAD.professional;
  const fin = CREDITS_PER_LEAD.financial;
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="flex items-center gap-3 text-[11.5px] tabular-nums">
      <span
        className={`inline-flex items-center gap-1 ${
          hasPro ? "text-text-secondary" : "text-text-tertiary"
        }`}
      >
        <span>Professional</span>
        <span className="text-text-tertiary">
          · {pro} credit{pro === 1 ? "" : "s"}/lead
        </span>
      </span>
      <span className="w-px h-3 bg-border-subtle" />
      <span
        className={`inline-flex items-center gap-1 ${
          hasFin ? "text-text-secondary" : "text-text-tertiary"
        }`}
      >
        <span>Financial</span>
        <span className="text-text-tertiary">
          · {fin} credit{fin === 1 ? "" : "s"}/lead
        </span>
      </span>
    </div>
  );
}

function CheckboxPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  // Quiet checkbox, no border, no fill. Just box + label. Active just darkens the text.
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-7 px-1 text-[12.5px] font-normal transition-colors"
    >
      <span
        className={`w-[13px] h-[13px] rounded-[3px] border flex items-center justify-center transition-colors ${
          active ? "border-text-primary bg-text-primary" : "border-border-hover bg-white"
        }`}
      >
        {active && (
          <svg width="8" height="8" viewBox="0 0 9 9" fill="none">
            <path d="M2 4.5L3.8 6.3L7 3" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={active ? "text-text-primary" : "text-text-tertiary"}>{label}</span>
    </button>
  );
}

// "Fields needed" reference card, adapts to checkbox selection
export function FieldsNeededCard({ hasPro, hasFin }: { hasPro: boolean; hasFin: boolean }) {
  if (!hasPro && !hasFin) {
    return (
      <div className="p-4 bg-surface-page border border-border-subtle rounded-card">
        <div className="text-[12px] text-text-tertiary">Pick an enrichment type above.</div>
      </div>
    );
  }
  return (
    <div className="p-4 bg-surface-page border border-border-subtle rounded-card space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
        Fields needed
      </div>
      {hasPro && (
        <div>
          <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Professional</div>
          <div className="text-[12px] text-text-secondary">Any of: LinkedIn URL, Email, Phone</div>
        </div>
      )}
      {hasFin && (
        <div>
          <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Financial</div>
          <div className="text-[12px] text-text-secondary">Name + Phone (required)</div>
        </div>
      )}
    </div>
  );
}

// Single-mode input set, fields appear/disappear based on selection
export function SingleInputsAdaptive({
  hasPro,
  hasFin,
  email, setEmail,
  phone, setPhone,
  linkedin, setLinkedin,
  name, setName,
}: {
  hasPro: boolean;
  hasFin: boolean;
  email: string; setEmail: (s: string) => void;
  phone: string; setPhone: (s: string) => void;
  linkedin: string; setLinkedin: (s: string) => void;
  name: string; setName: (s: string) => void;
}) {
  // Show phone whenever any type is on
  const showPhone = hasPro || hasFin;
  // Show email + linkedin only when Pro is on
  const showEmail = hasPro;
  const showLinkedin = hasPro;
  // Show name only when Fin is on
  const showName = hasFin;

  // Order: Name first (Financial req), then Professional hierarchy LinkedIn → Email → Phone.
  return (
    <div className="space-y-3">
      {showName && (
        <Input
          label="Name"
          required
          value={name}
          onChange={setName}
          placeholder="Saurabh Nandwani"
        />
      )}
      {showLinkedin && (
        <Input
          label="LinkedIn URL"
          value={linkedin}
          onChange={setLinkedin}
          placeholder="linkedin.com/in/..."
        />
      )}
      {showEmail && (
        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="jane@example.com"
        />
      )}
      {showPhone && (
        <Input
          label="Phone"
          required={hasFin}
          value={phone}
          onChange={setPhone}
          placeholder="+91 9876543210"
        />
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[11.5px] text-text-secondary mb-1">
        {label}
        {required && <span className="text-[#DC2626]">*</span>}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-primary transition-colors placeholder:text-text-tertiary"
      />
    </div>
  );
}

export function FileCard({ file, rowCount, onClear }: { file: File; rowCount: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-surface-page rounded-card border border-border-subtle">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-[6px] bg-white border border-border flex items-center justify-center shrink-0">
          <FileSpreadsheet size={14} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-text-primary truncate">{file.name}</div>
          <div className="text-[11px] text-text-tertiary tabular-nums">
            {rowCount.toLocaleString("en-IN")} rows · {(file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
      <button
        onClick={onClear}
        className="p-1.5 text-text-tertiary hover:text-text-primary rounded-button hover:bg-white transition-colors"
        aria-label="Remove file"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function DropZone({
  fileInputRef,
  onChosen,
  sampleHref,
  sampleName,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onChosen: (f: File) => void;
  sampleHref: string;
  sampleName: string;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onChosen(f);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`flex flex-col items-center justify-center text-center cursor-pointer h-full min-h-[220px] rounded-card border-2 border-dashed transition-colors p-6 ${
        dragging
          ? "border-text-primary bg-surface-secondary"
          : "border-border hover:border-border-hover hover:bg-surface-page"
      }`}
    >
      <Upload size={20} strokeWidth={1.5} className="text-text-tertiary mb-3" />
      <p className="text-[13px] text-text-primary font-medium">
        Drop CSV here or <span className="underline underline-offset-2">click to browse</span>
      </p>
      <p className="text-[11px] text-text-tertiary mt-1">CSV, XLSX, XLS up to 50 MB</p>
      <a
        href={sampleHref}
        download={sampleName}
        onClick={(e) => e.stopPropagation()}
        className="text-[11px] text-text-secondary hover:text-text-primary underline underline-offset-2 mt-3"
      >
        Download sample CSV
      </a>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChosen(f);
        }}
      />
    </div>
  );
}

export function SubmitButton({
  label,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  disabled: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 h-9 px-5 text-[13px] font-medium rounded-button transition-colors whitespace-nowrap ${
        disabled || loading
          ? "bg-text-primary/85 text-white cursor-not-allowed"
          : "bg-text-primary text-white hover:bg-accent-hover"
      } ${disabled && !loading ? "!bg-surface-secondary !text-text-tertiary" : ""}`}
    >
      {loading && (
        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function submitLabelSingle(state: ComposerState): string {
  if (state.isEnriching) return "Enriching…";
  if (state.insufficientForSingle) return "Top up credits";
  return `Enrich · ${state.singleCost.toLocaleString("en-IN")} credit${state.singleCost === 1 ? "" : "s"}`;
}

export function submitLabelBulk(state: ComposerState): string {
  if (state.isQueuing) return "Queuing…";
  if (state.insufficientForBulk) return "Top up credits";
  const rows = state.rowCount || 0;
  return `Enrich ${rows.toLocaleString("en-IN")} leads · ${state.bulkCost.toLocaleString("en-IN")} credits`;
}
```

## `src/components/enrichment/history-table.tsx`

```tsx
"use client";

// Recent runs table, single + bulk, unified.
// Columns: Run · Type · Status · Enriched · Credits · Started · (open)

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search, Users, MoreHorizontal, Eye, X, ChevronDown, Check } from "lucide-react";
import {
  formatRelative,
  successPct,
  type EnrichmentType,
  type RunRecord,
  type RunSource,
  type RunStatus,
  useEnrichmentStore,
} from "@/lib/enrichment-data";
import { IllustrationSearchEmpty } from "@/components/illustrations/empty-states";

interface HistoryTableProps {
  onView: (run: RunRecord) => void;
}

type TypeFilter = "all" | "professional" | "financial" | "both";
type StatusFilter = "all" | RunStatus;
type SourceFilter = "all" | RunSource;

export function HistoryTable({ onView }: HistoryTableProps) {
  const runs = useEnrichmentStore((s) => s.runs);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const filtered = useMemo(() => {
    let out = [...runs];

    if (typeFilter !== "all") {
      out = out.filter((r) => {
        if (typeFilter === "both") return r.types.length === 2;
        return r.types.length === 1 && r.types[0] === typeFilter;
      });
    }
    if (statusFilter !== "all") out = out.filter((r) => r.status === statusFilter);
    if (sourceFilter !== "all") out = out.filter((r) => r.source === sourceFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) =>
        r.source === "bulk"
          ? (r.filename || "").toLowerCase().includes(q)
          : (r.inputValue || "").toLowerCase().includes(q),
      );
    }

    // Always newest first.
    out.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    return out;
  }, [runs, typeFilter, statusFilter, sourceFilter, search]);

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  const filtersActive = typeFilter !== "all" || statusFilter !== "all" || sourceFilter !== "all" || search.trim().length > 0;

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setSearch("");
  };

  return (
    <div>
      {/* Header row: title left · search + filters right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-section-header text-text-primary">Enrichment history</h2>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="relative">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file or email"
              className="h-8 pl-8 pr-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-primary placeholder:text-text-tertiary w-[240px]"
            />
          </div>

          <FilterChip
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { v: "all", label: "Any status" },
              { v: "done", label: "Done" },
              { v: "in_progress", label: "Running" },
              { v: "failed", label: "Failed" },
            ]}
          />
          <FilterChip
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { v: "all", label: "Any type" },
              { v: "professional", label: "Professional", dot: "#1D4ED8" },
              { v: "financial", label: "Financial", dot: "#6D28D9" },
              { v: "both", label: "Both" },
            ]}
          />
          <FilterChip
            label="Source"
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as SourceFilter)}
            options={[
              { v: "all", label: "Any source" },
              { v: "single", label: "Single lookup" },
              { v: "bulk", label: "Bulk upload" },
            ]}
          />

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-8 px-2 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={11} strokeWidth={1.5} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="grid grid-cols-[minmax(240px,2fr)_120px_minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(170px,1.1fr)_110px_56px] gap-6 px-6 py-3.5 bg-surface-page border-b border-border text-[11px] uppercase tracking-[0.4px] text-text-tertiary font-medium">
          <div>Run</div>
          <div>Type</div>
          <div>Status</div>
          <div>Enriched</div>
          <div>Credits</div>
          <div>Started</div>
          <div></div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <div className="opacity-90 mb-3">
              <IllustrationSearchEmpty />
            </div>
            <div className="text-[14px] font-semibold text-text-primary">
              {filtersActive ? "No runs match these filters" : "No runs yet"}
            </div>
            <div className="text-[12px] text-text-tertiary mt-1 max-w-[280px]">
              {filtersActive
                ? "Try a different status, type, or source. Or clear filters to see everything."
                : "Run your first enrichment above to see it land here."}
            </div>
            {filtersActive && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary bg-white border border-border rounded-button hover:text-text-primary hover:border-border-hover transition-colors"
              >
                <X size={12} strokeWidth={2} />
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((run) => (
            <Row
              key={run.id}
              run={run}
              onView={() => onView(run)}
              onBuildAudience={() => onBuildAudience(run)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────

function Row({ run, onView, onBuildAudience }: { run: RunRecord; onView: () => void; onBuildAudience: () => void }) {
  const isInProgress = run.status === "in_progress";
  const enrichedNow = isInProgress
    ? Math.round((run.progressPct || 0) * run.leadsTotal / 100)
    : run.leadsSuccess;

  return (
    <div
      onClick={onView}
      className="grid grid-cols-[minmax(240px,2fr)_120px_minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(170px,1.1fr)_110px_56px] gap-6 px-6 py-5 items-center border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors cursor-pointer"
    >
      {/* Run identity */}
      <div className="min-w-0">
        <div className="text-[13px] text-text-primary truncate font-medium">
          {run.source === "bulk" ? run.filename : run.inputValue}
        </div>
        <div className="text-[12px] text-text-secondary truncate mt-0.5">
          {run.source === "bulk"
            ? `Bulk · ${run.leadsTotal.toLocaleString("en-IN")} rows`
            : "Single lookup"}
        </div>
      </div>

      {/* Type */}
      <div>
        <TypePill types={run.types} />
      </div>

      {/* Status */}
      <div>
        <StatusCell run={run} />
      </div>

      {/* Enriched */}
      <div className="text-[13px] text-text-primary tabular-nums">
        <span className="font-medium">{enrichedNow.toLocaleString("en-IN")}</span>
        <span className="text-text-secondary"> of {run.leadsTotal.toLocaleString("en-IN")}</span>
      </div>

      {/* Credits */}
      <div className="text-[13px] tabular-nums leading-snug">
        {isInProgress ? (
          <span className="text-text-secondary">{run.creditsBlocked.toLocaleString("en-IN")} reserved</span>
        ) : (
          <div>
            <div className="text-text-primary font-medium">{run.creditsCharged.toLocaleString("en-IN")} used</div>
            {run.creditsRefunded > 0 && (
              <div className="text-text-secondary text-[12px] mt-0.5">+{run.creditsRefunded.toLocaleString("en-IN")} refunded</div>
            )}
          </div>
        )}
      </div>

      {/* Started */}
      <div className="text-[13px] text-text-secondary tabular-nums">
        {formatRelative(run.startedAt)}
      </div>

      {/* Action: kebab menu */}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end">
        <RowMenu run={run} onView={onView} onBuildAudience={onBuildAudience} />
      </div>
    </div>
  );
}

function TypePill({ types }: { types: EnrichmentType[] }) {
  // One tag per type, full name, color-coded.
  return (
    <div className="flex flex-wrap items-center gap-1">
      {types.map((t) => (
        <span key={t} className={`inline-flex items-center text-[12px] font-medium px-2 py-0.5 rounded-badge whitespace-nowrap ${typeColor(t)}`}>
          {typeLabel(t)}
        </span>
      ))}
    </div>
  );
}

export function typeLabel(t: EnrichmentType): string {
  return t === "professional" ? "Professional" : "Financial";
}

export function typeColor(t: EnrichmentType): string {
  // Professional → blue (career / network). Financial → purple (wealth / premium).
  return t === "professional"
    ? "bg-[#EFF6FF] text-[#1D4ED8]"
    : "bg-[#F5F3FF] text-[#6D28D9]";
}

function StatusCell({ run }: { run: RunRecord }) {
  if (run.status === "in_progress") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D4ED8] opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1D4ED8]" />
        </span>
        <span className="text-[13px] text-[#1D4ED8] font-medium tabular-nums">
          Running · {run.progressPct || 0}%
        </span>
      </div>
    );
  }
  if (run.status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13px] text-[#DC2626] font-medium"
        title={run.errorMessage}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
        Failed
      </span>
    );
  }
  const pct = successPct(run);
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#15803D] font-medium tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
      {pct}% enriched
    </span>
  );
}

// ── Row kebab menu ──────────────────────────────────────────────────

function RowMenu({
  run,
  onView,
  onBuildAudience,
}: {
  run: RunRecord;
  onView: () => void;
  onBuildAudience: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const canDownload = run.status === "done" && run.source === "bulk";
  const canBuildAudience = run.status === "done" && run.source === "bulk";

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-9 h-9 flex items-center justify-center rounded-button transition-colors ${
          open
            ? "text-text-primary bg-white"
            : "text-text-tertiary hover:text-text-primary hover:bg-white"
        }`}
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.04)] py-1"
        >
          <MenuItem
            icon={<Eye size={14} strokeWidth={1.5} />}
            label="View details"
            onClick={() => { setOpen(false); onView(); }}
          />
          {canDownload && (
            <>
              <MenuItem
                icon={<Download size={14} strokeWidth={1.5} />}
                label="Download CSV"
                onClick={() => { setOpen(false); downloadStub(run, "csv"); }}
              />
              <MenuItem
                icon={<Download size={14} strokeWidth={1.5} />}
                label="Download Excel"
                onClick={() => { setOpen(false); downloadStub(run, "xlsx"); }}
              />
            </>
          )}
          {canBuildAudience && (
            <MenuItem
              icon={<Users size={14} strokeWidth={1.5} />}
              label="Build audience"
              onClick={() => { setOpen(false); onBuildAudience(); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors text-left"
    >
      <span className="text-text-tertiary">{icon}</span>
      {label}
    </button>
  );
}

// ── Filter chip (custom dropdown) ──────────────────────────────────

interface FilterOption {
  v: string;
  label: string;
  dot?: string;
}

function FilterChip({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = value !== "all";
  const current = options.find((o) => o.v === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 text-[12px] bg-white border rounded-input transition-colors ${
          active
            ? "border-border text-text-primary"
            : "border-border text-text-secondary hover:text-text-primary"
        }`}
      >
        {active && current?.dot && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: current.dot }} />
        )}
        {active && current ? (
          <span className="font-medium">{current.label}</span>
        ) : (
          <span>{label === "Status" ? "Any status" : label === "Type" ? "Any type" : "Any source"}</span>
        )}
        <ChevronDown size={12} strokeWidth={1.5} className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 min-w-[200px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10),0_0_0_1px_rgba(15,15,15,0.04)] py-1"
        >
          {options.map((o) => {
            const selected = o.v === value;
            return (
              <button
                key={o.v}
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(o.v); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors ${
                  selected
                    ? "text-text-primary bg-surface-secondary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-page"
                }`}
              >
                {o.dot ? (
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.dot }} />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0" />
                )}
                <span className="flex-1">{o.label}</span>
                {selected && <Check size={13} strokeWidth={2} className="text-text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Download stub ───────────────────────────────────────────────────

function downloadStub(run: RunRecord, format: "csv" | "xlsx" = "csv") {
  const content = `# Enriched export\n# Run: ${run.id}\n# File: ${run.filename}\n# Leads: ${run.leadsSuccess}/${run.leadsTotal}\n`;
  const mime = format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(run.filename || "enriched").replace(/\.[^.]+$/, "")}-enriched.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## `src/components/enrichment/mapping-table.tsx`

```tsx
"use client";

// Mapping table, shows uploaded file's columns with a dropdown above each
// to map it to a target field (Name / Phone / Email / LinkedIn Link / Lead Id / Custom).
// Auto-map runs on file drop; user can override here.

import { ChevronDown } from "lucide-react";
import type { RequiredField } from "@/lib/enrichment-data";

export type MapTarget = "custom" | "leadId" | RequiredField;

export type ColumnMap = Record<string, MapTarget>;

const TARGET_LABELS: Record<MapTarget, string> = {
  custom: "Skip column",
  leadId: "Lead Id",
  name: "Name",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn Link",
};

// Targets visible in the dropdown based on which types are picked.
// Real fields listed first, "Skip column" pinned to the bottom.
function visibleTargets(needName: boolean, needPro: boolean): MapTarget[] {
  const t: MapTarget[] = [];
  if (needName) t.push("name");
  if (needPro) {
    t.push("email", "phone", "linkedin");
  } else {
    // Financial-only, phone still needed
    t.push("phone");
  }
  t.push("leadId");
  t.push("custom");
  return t;
}

export function MappingTable({
  headers,
  preview,
  columnMap,
  setColumnMap,
  needName,
  needPro,
}: {
  headers: string[];
  preview: string[][];        // first N rows (cell values, headers excluded)
  columnMap: ColumnMap;
  setColumnMap: (m: ColumnMap) => void;
  needName: boolean;
  needPro: boolean;
}) {
  const targets = visibleTargets(needName, needPro);

  const onPick = (header: string, target: MapTarget) => {
    // If another column already maps to this target (excluding custom/leadId),
    // reset it to custom, we only allow one mapping per target field.
    const unique = target !== "custom" && target !== "leadId";
    const next: ColumnMap = { ...columnMap };
    if (unique) {
      for (const h of Object.keys(next)) {
        if (h !== header && next[h] === target) next[h] = "custom";
      }
    }
    next[header] = target;
    setColumnMap(next);
  };

  return (
    <div className="border border-border rounded-card overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          {/* Dropdown row */}
          <thead>
            <tr className="bg-surface-page/60">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 border-b border-border-subtle text-left align-top min-w-[140px]"
                >
                  <ColumnPicker
                    value={columnMap[h] || "custom"}
                    targets={targets}
                    onPick={(t) => onPick(h, t)}
                  />
                </th>
              ))}
            </tr>
            {/* Original header names row */}
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 border-b border-border-subtle text-left text-[11px] uppercase tracking-[0.4px] text-text-tertiary font-medium bg-white"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} className="odd:bg-white even:bg-surface-page/30">
                {headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 border-b border-border-subtle text-text-secondary truncate max-w-[200px]"
                    title={row[ci] || ""}
                  >
                    {row[ci] || <span className="text-text-tertiary">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnPicker({
  value,
  targets,
  onPick,
}: {
  value: MapTarget;
  targets: MapTarget[];
  onPick: (t: MapTarget) => void;
}) {
  const isMapped = value !== "custom" && value !== "leadId";
  const isSkipped = value === "custom";
  return (
    <div className="relative inline-block w-full">
      <select
        value={value}
        onChange={(e) => onPick(e.target.value as MapTarget)}
        className={`appearance-none w-full pr-7 pl-2.5 py-1.5 text-[12px] font-medium rounded-button border bg-white focus:outline-none transition-colors cursor-pointer ${
          isMapped
            ? "border-text-primary text-text-primary"
            : isSkipped
            ? "border-border-subtle text-text-tertiary bg-surface-page/50 hover:text-text-secondary"
            : "border-border text-text-secondary hover:border-border-hover"
        }`}
      >
        {targets.map((t) => (
          <option key={t} value={t}>
            {TARGET_LABELS[t]}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
    </div>
  );
}

// Builds an initial ColumnMap by auto-detecting common header names.
export function autoBuildColumnMap(headers: string[]): ColumnMap {
  const out: ColumnMap = {};
  const taken = new Set<MapTarget>();
  const try_ = (header: string, candidates: MapTarget[]) => {
    for (const c of candidates) {
      if (!taken.has(c)) {
        out[header] = c;
        taken.add(c);
        return;
      }
    }
  };
  for (const h of headers) {
    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (out[h]) continue;
    if (/email|mail/.test(norm)) try_(h, ["email"]);
    else if (/linkedin|liurl|profileurl/.test(norm)) try_(h, ["linkedin"]);
    else if (/phone|mobile|contact|tel/.test(norm)) try_(h, ["phone"]);
    else if (/^name$|fullname|leadname|firstname|lastname|givenname|surname/.test(norm)) try_(h, ["name"]);
    else if (/leadid|^id$|recordid/.test(norm)) try_(h, ["leadId"]);
    if (!out[h]) out[h] = "custom";
  }
  return out;
}

// Convert ColumnMap to a Set of mapped required fields (for spot/required checks).
export function mappedFields(columnMap: ColumnMap): Set<RequiredField> {
  const s = new Set<RequiredField>();
  for (const t of Object.values(columnMap)) {
    if (t === "name" || t === "phone" || t === "email" || t === "linkedin") {
      s.add(t);
    }
  }
  return s;
}
```

## `src/components/enrichment/run-drawer.tsx`

```tsx
"use client";

// Side drawer for inspecting a run record (single or bulk).
// Sections: header · status · leads · credits · actions · error (if failed) · profile (single)

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, Users, Copy, Check } from "lucide-react";
import {
  formatRelative,
  successPct,
  type RunRecord,
} from "@/lib/enrichment-data";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";

interface RunDrawerProps {
  run: RunRecord | null;
  onClose: () => void;
  onBuildAudience: (run: RunRecord) => void;
}

export function RunDrawer({ run, onClose, onBuildAudience }: RunDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, onClose]);

  if (!mounted || !run) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[560px] max-w-[92vw] bg-white border-l border-border z-[70] flex flex-col">
        <Header run={run} onClose={onClose} />

        <div className="flex-1 overflow-y-auto">
          {run.source === "bulk" && (
            <>
              <StatusSection run={run} />
              <Divider />
              <LeadsSection run={run} />
              <Divider />
              <CreditsSection run={run} />
              <Divider />
              <ActionsSection run={run} onBuildAudience={() => onBuildAudience(run)} />
            </>
          )}

          {run.status === "failed" && (
            <>
              <Divider />
              <ErrorSection run={run} />
            </>
          )}

          {run.source === "single" && run.profile && (
            <>
              <Divider />
              <section className="p-5">
                <SectionLabel>Profile</SectionLabel>
                <div className="mt-3">
                  <LeadProfileCard profile={run.profile} variant="inline" />
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}

function Header({ run, onClose }: { run: RunRecord; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between px-5 py-4 border-b border-border">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-text-primary truncate">
          {run.source === "bulk" ? run.filename : run.inputValue}
        </h2>
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {run.types.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${
                t === "professional"
                  ? "bg-[#EFF6FF] text-[#1D4ED8]"
                  : "bg-[#F5F3FF] text-[#6D28D9]"
              }`}
            >
              {t === "professional" ? "Professional" : "Financial"}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors"
        aria-label="Close"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function StatusSection({ run }: { run: RunRecord }) {
  let pillClass = "bg-surface-secondary text-text-secondary";
  let label = "—";
  if (run.status === "done") { pillClass = "bg-[#F0FDF4] text-[#15803D]"; label = `Done · ${successPct(run)}% success`; }
  if (run.status === "in_progress") { pillClass = "bg-[#EFF6FF] text-[#1D4ED8]"; label = `In progress · ${run.progressPct || 0}%`; }
  if (run.status === "failed") { pillClass = "bg-[#FEF2F2] text-[#DC2626]"; label = "Failed"; }

  return (
    <section className="p-5">
      <SectionLabel>Status</SectionLabel>
      <div className="flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center text-[12px] font-medium px-2.5 py-1 rounded-badge ${pillClass}`}>{label}</span>
      </div>
      <div className="text-[12px] text-text-tertiary mt-2">
        Started {formatRelative(run.startedAt)}
        {run.finishedAt && <span> · Finished {formatRelative(run.finishedAt)}</span>}
      </div>
    </section>
  );
}

function LeadsSection({ run }: { run: RunRecord }) {
  return (
    <section className="p-5">
      <SectionLabel>Leads</SectionLabel>
      <div className="grid grid-cols-4 gap-3 mt-3">
        <Stat label="Success" value={run.leadsSuccess} accent="ok" />
        <Stat label="Failed" value={run.leadsFailed} accent={run.leadsFailed > 0 ? "err" : "muted"} />
        <Stat label="Skipped" value={run.leadsSkipped} accent="muted" />
        <Stat label="Total" value={run.leadsTotal} accent="primary" />
      </div>
    </section>
  );
}

function CreditsSection({ run }: { run: RunRecord }) {
  return (
    <section className="p-5">
      <SectionLabel>Credits</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Stat label="Blocked" value={run.creditsBlocked} accent="muted" />
        <Stat label="Charged" value={run.creditsCharged} accent="primary" />
        <Stat label="Refunded" value={run.creditsRefunded} accent={run.creditsRefunded > 0 ? "ok" : "muted"} />
      </div>
      {run.creditsRefunded > 0 && (
        <p className="text-[11px] text-text-tertiary mt-3">
          {run.creditsRefunded.toLocaleString("en-IN")} credits refunded for leads we couldn't enrich.
        </p>
      )}
    </section>
  );
}

function ActionsSection({ run, onBuildAudience }: { run: RunRecord; onBuildAudience: () => void }) {
  if (run.status !== "done") return null;
  return (
    <section className="p-5">
      <SectionLabel>Export</SectionLabel>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <ActionBtn onClick={() => download(run, "csv")}>
          <Download size={13} strokeWidth={1.5} />
          Download CSV
        </ActionBtn>
        <ActionBtn onClick={() => download(run, "xlsx")}>
          <Download size={13} strokeWidth={1.5} />
          Download Excel
        </ActionBtn>
        <ActionBtn onClick={onBuildAudience} primary>
          <Users size={13} strokeWidth={1.5} />
          Build audience
        </ActionBtn>
      </div>
    </section>
  );
}

function ErrorSection({ run }: { run: RunRecord }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${run.id}\n${run.errorCode}\n${run.errorMessage || ""}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* noop */ }
  };
  return (
    <section className="p-5">
      <SectionLabel>Why this run failed</SectionLabel>
      <div className="mt-3 p-3 rounded-card bg-[#FEF2F2] border border-[#FECACA]">
        <div className="text-[12px] font-medium text-[#DC2626]">{run.errorCode || "Unknown error"}</div>
        <p className="text-[12px] text-[#7F1D1D] mt-1">{run.errorMessage}</p>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <ActionBtn onClick={onCopy}>
          {copied ? <Check size={13} strokeWidth={1.5} /> : <Copy size={13} strokeWidth={1.5} />}
          {copied ? "Copied" : "Copy error ID"}
        </ActionBtn>
      </div>
    </section>
  );
}

// ── primitives ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">{children}</div>
  );
}

function Divider() {
  return <div className="border-t border-border-subtle" />;
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "ok" | "err" | "primary" | "muted" }) {
  const map = {
    ok: "text-[#15803D]",
    err: "text-[#DC2626]",
    primary: "text-text-primary",
    muted: "text-text-secondary",
  };
  return (
    <div>
      <div className="text-[11px] text-text-tertiary">{label}</div>
      <div className={`text-[18px] font-semibold tabular-nums mt-0.5 ${map[accent]}`}>{value.toLocaleString("en-IN")}</div>
    </div>
  );
}

function ActionBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-button transition-colors ${
        primary
          ? "bg-text-primary text-white hover:bg-accent-hover"
          : "bg-white text-text-secondary border border-border hover:bg-surface-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function download(run: RunRecord, format: "csv" | "xlsx") {
  const content = `# Enriched export, ${format.toUpperCase()}\n# Run: ${run.id}\n# File: ${run.filename}\n# Leads: ${run.leadsSuccess}/${run.leadsTotal}\n# Backend wires real export.\n`;
  const mime = format === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(run.filename || "enriched").replace(/\.[^.]+$/, "")}-enriched.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## `src/components/enrichment/spot.ts`

```tsx
// Spot nudge engine, pure function.
// Inputs: which enrichment types are picked + which fields have a value.
// Output: optional upgrade line + optional name-quality note.
// Spot stays silent when (a) required fields aren't filled, or (b) the user already
// has the strongest input combination.

import type { EnrichmentType, RequiredField } from "@/lib/enrichment-data";

export type SpotInput = {
  types: EnrichmentType[];
  available: Set<RequiredField>;
};

export type SpotMessage = {
  primary?: string;     // upgrade hint shown as first line
  nameNote?: boolean;   // shows "Use the exact name registered with the phone number"
};

export const SPOT_NAME_NOTE = "Use the exact name registered with the phone number.";

export function computeSpot({ types, available }: SpotInput): SpotMessage | null {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return null;

  const has = (f: RequiredField) => available.has(f);

  // Professional only ───────────────────────────────────────────────
  if (hasPro && !hasFin) {
    const proRequiredMet = has("email") || has("phone") || has("linkedin");
    if (!proRequiredMet) return null;             // static instruction takes over
    if (has("linkedin")) return null;             // strongest path, silent
    if (has("email") && has("phone")) return null; // skip per spec
    if (has("email")) {
      return {
        primary: "Add LinkedIn URL for a higher enrichment rate. Email alone still works.",
      };
    }
    if (has("phone")) {
      return {
        primary: "Add LinkedIn URL or Email for a higher enrichment rate. Phone alone still works.",
      };
    }
    return null;
  }

  // Financial only ──────────────────────────────────────────────────
  if (hasFin && !hasPro) {
    const finRequiredMet = has("name") && has("phone");
    if (!finRequiredMet) return null;
    return { nameNote: true };
  }

  // Professional + Financial ────────────────────────────────────────
  const bothRequiredMet = has("name") && has("phone");
  if (!bothRequiredMet) return null;

  // Required met. Decide if Pro upgrade also fires.
  if (has("linkedin") || has("email")) {
    // Pro path already strong enough, name note only
    return { nameNote: true };
  }

  // Only Name + Phone → nudge Pro upgrade + name note
  return {
    primary:
      "Add LinkedIn URL or Email for a higher Professional enrichment rate. Name + Phone still works.",
    nameNote: true,
  };
}

// Static instruction shown when required fields aren't filled.
// Renders in the footer area (not in Spot bubble), it's a hard requirement, not a tip.
export function staticInstruction(types: EnrichmentType[]): string | null {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return "Pick at least one enrichment type to get started.";
  if (hasPro && !hasFin) return "Add LinkedIn URL, Email, or Phone to get started.";
  if (hasFin && !hasPro) return "Add Name and Phone to get started.";
  return "Add Name and Phone to get started.";
}

// Required-fields-met check used to enable/disable the submit button.
export function requiredFieldsMet(
  types: EnrichmentType[],
  available: Set<RequiredField>,
): boolean {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return false;

  const has = (f: RequiredField) => available.has(f);

  if (hasFin && (!has("name") || !has("phone"))) return false;
  if (hasPro && !hasFin && !has("email") && !has("phone") && !has("linkedin")) return false;
  return true;
}
```


---

## Single lookup history — drop Status + Enriched columns (2026-06-01)

`src/components/enrichment-crm/history-table.tsx`. Single-lookup view only ever
holds successful 1-of-1 results, so Status and "n of n" Enriched were always
trivially 100% — pure noise. Removed both for `forceSource === "single"`:

- `single = forceSource === "single"` flag; `gridClass` swaps the column template
  (5 cols: Run · Type · Credits · Started · kebab) so header + rows stay aligned
  and fill full width evenly.
- Filter now drops non-`done` runs in single mode (`r.status === "done"`).
- Status filter chip hidden when single (redundant once only successes show).
- Status + Enriched `<div>`s gated behind `{!single && ...}` in header and Row.

Bulk view unchanged (still shows all 7 columns + Status filter).

## Single lookup table — inline type chips + rebalanced columns (2026-06-01)

`enrichment-crm/history-table.tsx`. Two fixes:
- TYPE chips were stacking (Professional over Financial) because the Type column
  was a fixed 120px — too narrow for two chips. `TypePill` dropped `flex-wrap`
  (now `flex items-center gap-1.5`) so chips stay inline; run.types maxes at 2.
- Single `gridClass` rebalanced from a Run-hogging 2fr layout to fr-weighted
  columns: Run 1.6fr · Type min200/1fr · Credits 0.8fr · Started 0.8fr · chevron 48,
  gap-4. Slack now spreads evenly instead of pooling after Run.

`lead-profile-card.tsx`: removed the `pro.languages` chip row (English/Hindi) —
not real data, was synthesized. Gone from the lead drawer everywhere it renders.

## Enrichment outcome model corrected — failed / not-enriched / partial (2026-06-01)

Aligned the prototype to the real 3-outcome semantics:
- **Failed** = API call broke, couldn't reach the enrichment API → no data.
- **Not enriched** = API was called but returned nothing → identity-only
  (uploaded contact), no professional/financial layers.
- **Enriched** = some or all layers returned. **Partial counts as enriched**:
  professional present, financial missing, billed only for what came back.

Edits:
- `data/enriched-leads.tsx` `synthBulkLeadProfile`: not_enriched now returns
  `enrichment_status "Zero Enrichment"` with contact only (no pro/fin). New
  `partial` arg → professional present + financial "Not Available", status
  "Partial Enrichment". Removed the old mislabel where not_enriched was tagged
  "Partial Enrichment" with no cards.
- `data/enriched-leads.tsx` bulk loop: computes `partial` (only when run requests
  both layers; ~1 in 4 enriched-both leads) and passes it to the synth.
- `data/enriched-leads.tsx` drawer: failed copy is user-facing, no internal/API
  wording — "We couldn't enrich this lead. No credits were charged."
- `lead/lead-profile-card.tsx` `EnrichmentStatusBadge`: "Fully Enriched" AND
  "Partial Enrichment" both render green "Enriched"; "Zero Enrichment" renders
  "Not enriched". Added a Financial card for partials ("No financial data
  returned for this lead. No financial credits were charged.").

Verified on local /enrichment/database: partial → green Enriched + pro card +
"No financial data returned"; not_enriched → identity-only, "Not enriched" badge;
failed → new API-unreachable copy. `tsc --noEmit` clean.

## Not-enriched drawer — show input only, no fake verification (2026-06-01)

A not-enriched lead returned nothing from the API, so showing "Verified" email/
phone was a false claim. `lead-profile-card.tsx`: when `enrichment_status ===
"Zero Enrichment"`, ContactBar drops verification badges and shows an "Input data"
caption (new `label` prop). `enriched-leads.tsx` synth: not_enriched bulk leads no
longer carry a fabricated phone or verification status — contact is name + email
(the CSV input) only.

## Not-enriched — hide Raw JSON tab (2026-06-01)

No enrichment payload exists for a not-enriched lead, and the raw object still
carried stale verification fields. `lead-profile-card.tsx`: when `enrichment_status
=== "Zero Enrichment"`, the Raw JSON tab is hidden and the view is forced to
Profile (input data only).

### Bulk history Type column overflow fix
The "Bulk upload history" table's TYPE column was a fixed `120px` track, too narrow
for two full-name chips (Professional + Financial), so they overflowed into the
STATUS column. `enrichment-crm/history-table.tsx`: changed the bulk `gridClass`
Type column to `minmax(200px,1.3fr)` (and rebalanced Run to `minmax(220px,1.8fr)`,
Enriched to `minmax(140px,1fr)`). Header + Row share the one `gridClass` string, so
both fixed together. Verified on local: chips clear of Status.

### Single lookup: 3 outcomes (Enriched / Not enriched / Failed)
Single history previously filtered to `status === "done"` and hid the Status
column, so only enriched single lookups showed. Now single shows all 3 outcomes.
`enrichment-crm/history-table.tsx`: dropped the single done-only filter; Status
column now renders for single too (added to grid as a real column). `StatusCell`
takes a `single` flag — for single it shows "Enriched" (leadsSuccess>0) vs
"Not enriched" (leadsSuccess===0, grey) instead of a percentage; "Failed" stays
red. `enrichment-crm-data.ts`: added two single seed runs — run-6 (not enriched,
Zero Enrichment profile, input identity only, 0 charged / +1 refunded) and run-7
(failed, no profile, 0 charged / +1 refunded). The Enrichment records table
already derived these via `deriveLeadStatus`, so the new seeds surface there too
(verified Source=Single: Enriched, Not enriched, Failed all render).

## Contact extraction: always-verify + "Not requested" cells (2026-06-02)

Verification is now always on — the phone-verify toggle is gone. Three changes:

1. **Toggle removed.** `contact-extraction/parts.tsx`: deleted the `VerifyToggle`
   component. `composer.tsx`: dropped the `VerifyToggle` import, the `verifyPhone`
   state, and the now-unused `wantsPhone`; the run is created with
   `verifyPhone: true`. Data layer (`contact-extraction-data.ts`) was already
   pinned to `phoneResult(rnd, true)` and `verifyPhone: true`.

2. **Auto-verify note.** A static line sits below the contact-type strip in the
   composer: "Every contact is verified automatically. A ✓ marks each result we
   could confirm." States the default-on behaviour and what the green tick means.
   We never render an invalid/risky badge — a contact we couldn't confirm still
   shows the value, just without the tick.

3. **"Not requested" cells.** `ContactFieldCell` (shared by the All-contacts
   database and lookup-history tables) now renders "Not requested" for an
   undefined field (a type the run didn't ask for) instead of "—". The single
   result panel (`SingleResultPanel`) walks `ALL_TYPES` rather than only the
   requested set, so a non-requested type still gets a box labelled "Not
   requested". "Not found" (requested but nothing came back) is unchanged.

Verified on local: single lookup requesting only Phone shows Phone (value +
green tick), Personal/Work email as "Not requested" in both the result panel and
the history table; toggle absent; auto-verify note present.
