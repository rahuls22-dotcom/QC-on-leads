"use client";

// Operations view for Contact extraction. Bulk first (CSV of LinkedIn URLs),
// then Single (one URL). Each sub-tab pairs a composer with that source's run
// history. Mirrors the Enrichment module's Operations shape.

import { useState } from "react";

import { useCEProgressTicker, useCEStore } from "@/lib/contact-extraction-data";
import { EmptyState } from "@/components/layout/empty-state";
import { ScanLine } from "lucide-react";

import { CESubTabs, type CESubTabKey } from "./sub-tabs";
import { ContactExtractionComposer } from "./composer";
import { CEHistoryTable } from "./history-table";

export function ContactExtractionOperations() {
  useCEProgressTicker();
  const [sub, setSub] = useState<CESubTabKey>("bulk");
  const runs = useCEStore((s) => s.runs);

  const bulkRuns = runs.filter((r) => r.source === "bulk");
  const singleRuns = runs.filter((r) => r.source === "single");

  return (
    <div>
      <CESubTabs value={sub} onChange={setSub} />

      {sub === "bulk" && (
        <div className="space-y-8">
          <ContactExtractionComposer mode="bulk" />
          {bulkRuns.length === 0 ? (
            <EmptyState
              illustration={<ScanLine size={34} strokeWidth={1.25} className="text-text-tertiary" />}
              title="No bulk runs yet"
              description="Upload a CSV of LinkedIn URLs to extract phone numbers and emails in bulk."
            />
          ) : (
            <CEHistoryTable source="bulk" title="Bulk run history" />
          )}
        </div>
      )}

      {sub === "single" && (
        <div className="space-y-8">
          <ContactExtractionComposer mode="single" />
          {singleRuns.length === 0 ? (
            <EmptyState
              illustration={<ScanLine size={34} strokeWidth={1.25} className="text-text-tertiary" />}
              title="No single lookups yet"
              description="Paste one LinkedIn profile URL to extract and verify their contact details."
            />
          ) : (
            <CEHistoryTable source="single" title="Single lookup history" />
          )}
        </div>
      )}
    </div>
  );
}
