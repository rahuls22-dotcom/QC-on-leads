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
