"use client";

// Segmented control: 7d / 14d / 30d / 90d / All / Custom. Reuses the existing
// DateRangePopover for custom ranges.

import { useState } from "react";
import { Calendar } from "lucide-react";
import { DateRangePopover, formatRangeLabel } from "@/components/data/date-range-popover";
import type { TimeRange } from "@/lib/dashboard/types";

interface Props {
  range: TimeRange;
  customStart: Date | null;
  customEnd: Date | null;
  onChange: (range: TimeRange, customStart: Date | null, customEnd: Date | null) => void;
}

const PRESETS: { v: TimeRange; l: string }[] = [
  { v: "7d", l: "7d" },
  { v: "14d", l: "14d" },
  { v: "30d", l: "30d" },
  { v: "90d", l: "90d" },
  { v: "all", l: "All" },
];

export function DashboardTimeFilter({ range, customStart, customEnd, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-0.5 gap-0.5">
      {PRESETS.map((opt) => {
        const active = opt.v === range;
        return (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v, null, null)}
            className={[
              "h-6 px-2.5 text-[11.5px] font-medium rounded-[5px] transition-colors",
              active
                ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {opt.l}
          </button>
        );
      })}

      <button
        onClick={() => setCustomOpen((v) => !v)}
        className={[
          "h-6 inline-flex items-center gap-1 px-2 text-[11.5px] font-medium rounded-[5px] transition-colors",
          range === "custom"
            ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
            : "text-text-secondary hover:text-text-primary",
        ].join(" ")}
      >
        <Calendar size={11} strokeWidth={1.75} />
        {range === "custom" && customStart && customEnd
          ? formatRangeLabel(customStart, customEnd)
          : "Custom"}
      </button>

      <DateRangePopover
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        initialStart={customStart}
        initialEnd={customEnd}
        onApply={(s, e) => {
          onChange("custom", s, e);
          setCustomOpen(false);
        }}
      />
    </div>
  );
}
