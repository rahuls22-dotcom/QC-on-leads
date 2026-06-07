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
