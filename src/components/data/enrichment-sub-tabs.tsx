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
