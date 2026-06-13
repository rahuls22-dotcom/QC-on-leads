"use client";

import { UserSearch, Sparkles, ShieldCheck, Database } from "lucide-react";
import { LockedProduct } from "@/components/locked/locked-product";

export default function LockedEnrichmentPage() {
  return (
    <LockedProduct
      icon={UserSearch}
      eyebrow="Add-on product"
      title="Enrichment"
      lede="Turn a thin lead into a rich profile. Pull professional context, financial signals, and intent — ready to score, route, and call."
      features={[
        {
          icon: Sparkles,
          title: "Professional + financial enrichment",
          body: "Title, company, seniority, income bracket, and more — verified at source.",
        },
        {
          icon: ShieldCheck,
          title: "Verified flag on every field",
          body: "Your CRM only ingests data you can trust.",
        },
        {
          icon: Database,
          title: "Bulk-ready",
          body: "One row inline, or a CSV of tens of thousands — same pipeline.",
        },
      ]}
      mailSubject="Interested in Enrichment"
    />
  );
}
