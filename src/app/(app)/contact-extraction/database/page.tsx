"use client";

// /contact-extraction/database, every extracted contact with a per-field
// verification status. Wrapped in Suspense because the table reads ?run= via
// useSearchParams.

import { Suspense } from "react";

import { DataPageShell } from "@/components/data/data-page-shell";
import { ContactExtractionDatabase } from "@/components/data/contact-extraction/database";

export default function ContactExtractionDatabasePage() {
  return (
    <DataPageShell
      variant="connected"
      title="All contacts"
      description="Every contact extracted so far, with phone, personal email, and work email plus their verification status."
    >
      {() => (
        <Suspense fallback={null}>
          <ContactExtractionDatabase />
        </Suspense>
      )}
    </DataPageShell>
  );
}
