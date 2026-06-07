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
