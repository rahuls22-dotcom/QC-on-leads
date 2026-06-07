"use client";

// Sub-tabs under the Contact-extraction primary tab. Two input modes, Bulk
// first (the common case: a CSV of LinkedIn URLs), then Single (one profile).
// Same pill-style strip as the Enrichment module.

import { Search, Upload, type LucideIcon } from "lucide-react";

export type CESubTabKey = "bulk" | "single";

interface TabDef {
  key: CESubTabKey;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { key: "bulk", label: "Bulk upload", icon: Upload },
  { key: "single", label: "Single", icon: Search },
];

export function CESubTabs({
  value,
  onChange,
}: {
  value: CESubTabKey;
  onChange: (k: CESubTabKey) => void;
}) {
  return (
    <div className="mb-6">
      <div
        role="tablist"
        aria-label="Contact extraction input mode"
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
