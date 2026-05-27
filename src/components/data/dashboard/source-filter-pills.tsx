"use client";

// Top-level source filter: All / CRM / Bulk / Single. Same segmented-pill
// design language as DashboardTimeFilter so the header reads as one unit.

import type { LeadProfile } from "@/lib/dashboard/types";

export type SourceFilter = "all" | "crm" | "bulk" | "single";

interface Props {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
  profiles: LeadProfile[];
}

const OPTIONS: { v: SourceFilter; l: string }[] = [
  { v: "all", l: "All" },
  { v: "crm", l: "CRM" },
  { v: "bulk", l: "Bulk" },
  { v: "single", l: "Single" },
];

export function SourceFilterPills({ value, onChange, profiles }: Props) {
  const counts: Record<SourceFilter, number> = { all: profiles.length, crm: 0, bulk: 0, single: 0 };
  for (const p of profiles) counts[p.source]++;

  return (
    <div className="inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-0.5 gap-0.5">
      {OPTIONS.map((opt) => {
        const active = opt.v === value;
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={[
              "h-6 px-2.5 text-[11.5px] font-medium rounded-[5px] transition-colors inline-flex items-center gap-1.5",
              active
                ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            <span>{opt.l}</span>
            <span
              className={[
                "tabular-nums text-[10px]",
                active ? "text-text-tertiary" : "text-text-tertiary/80",
              ].join(" ")}
            >
              {counts[opt.v].toLocaleString("en-IN")}
            </span>
          </button>
        );
      })}
    </div>
  );
}
