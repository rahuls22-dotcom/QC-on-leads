"use client";

import { Activity, Upload, Search, type LucideIcon } from "lucide-react";

export type CrmTabKey = "activity" | "bulk" | "single";

const TABS: { key: CrmTabKey; label: string; icon: LucideIcon }[] = [
  { key: "activity", label: "CRM activity",  icon: Activity },
  { key: "bulk",     label: "Bulk upload",   icon: Upload },
  { key: "single",   label: "Single lookup", icon: Search },
];

export function CrmTabs({ value, onChange }: { value: CrmTabKey; onChange: (k: CrmTabKey) => void }) {
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
              "inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium transition-colors -mb-px border-b-2",
              active
                ? "text-text-primary border-text-primary"
                : "text-text-secondary border-transparent hover:text-text-primary",
            ].join(" ")}
          >
            <Icon size={13} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
