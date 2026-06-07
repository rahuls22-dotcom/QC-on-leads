"use client";

// /contact-extraction/operations, where extraction runs are started.
// Bulk (CSV of LinkedIn URLs) first, then Single (one URL).

import { DataPageShell } from "@/components/data/data-page-shell";
import { ContactExtractionOperations } from "@/components/data/contact-extraction/operations";

export default function ContactExtractionOperationsPage() {
  return (
    <DataPageShell
      variant="connected"
      title="New extraction"
      description="Upload a list of LinkedIn URLs or paste a single one. Pick which contact types to pull and whether to verify."
    >
      {() => <ContactExtractionOperations />}
    </DataPageShell>
  );
}
