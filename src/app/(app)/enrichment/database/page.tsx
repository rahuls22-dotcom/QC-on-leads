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
      title="History"
      rootLabel="Enrichment"
      rootHref="/enrichment"
      breadcrumbTrail={[
        { label: "Enrichment", href: "/enrichment" },
        { label: "History" },
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
