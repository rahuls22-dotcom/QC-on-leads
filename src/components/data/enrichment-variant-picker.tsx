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
