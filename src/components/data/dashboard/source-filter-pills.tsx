"use client";

// Top-level source filter as a dropdown: All / CRM / Bulk / Single.
// Filename kept as `source-filter-pills` for back-compat; the API is the
// same (value/onChange/profiles) but the visual is a button + popover.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { LeadProfile } from "@/lib/dashboard/types";

export type SourceFilter = "all" | "crm" | "bulk" | "single";

interface Props {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
  profiles: LeadProfile[];
  /** Hide the CRM option entirely (No-CRM variant). */
  dropCrmSource?: boolean;
}

const ALL_OPTIONS: { v: SourceFilter; l: string }[] = [
  { v: "all", l: "All sources" },
  { v: "crm", l: "CRM" },
  { v: "bulk", l: "Bulk" },
  { v: "single", l: "Single" },
];

const SHORT_LABEL: Record<SourceFilter, string> = {
  all: "All sources",
  crm: "CRM",
  bulk: "Bulk",
  single: "Single",
};

export function SourceFilterPills({ value, onChange, profiles, dropCrmSource = false }: Props) {
  const counts: Record<SourceFilter, number> = { all: profiles.length, crm: 0, bulk: 0, single: 0 };
  for (const p of profiles) counts[p.source]++;
  const OPTIONS = dropCrmSource ? ALL_OPTIONS.filter((o) => o.v !== "crm") : ALL_OPTIONS;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 inline-flex items-center gap-1.5 px-2.5 text-[11.5px] font-medium rounded-input border border-border bg-surface-secondary/60 text-text-primary hover:bg-white transition-colors"
      >
        <span className="text-text-secondary">Source:</span>
        <span>{SHORT_LABEL[value]}</span>
        <span className="text-text-tertiary tabular-nums text-[10.5px]">
          {counts[value].toLocaleString("en-IN")}
        </span>
        <ChevronDown size={12} strokeWidth={1.75} className="text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-30 w-[180px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08),0_0_0_1px_rgba(15,15,15,0.04)] p-1">
          {OPTIONS.map((opt) => {
            const active = opt.v === value;
            return (
              <button
                key={opt.v}
                onClick={() => {
                  onChange(opt.v);
                  setOpen(false);
                }}
                className={[
                  "w-full inline-flex items-center gap-2 h-7 px-2 rounded-[5px] text-[12px] transition-colors",
                  active ? "bg-surface-secondary text-text-primary font-medium" : "text-text-primary hover:bg-surface-secondary/70",
                ].join(" ")}
              >
                <span className="w-3.5 inline-flex justify-center">
                  {active && <Check size={12} strokeWidth={2} />}
                </span>
                <span className="flex-1 text-left">{opt.l}</span>
                <span className="text-text-tertiary tabular-nums text-[10.5px]">
                  {counts[opt.v].toLocaleString("en-IN")}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
