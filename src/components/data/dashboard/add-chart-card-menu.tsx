"use client";

// Dashed "+ Build a chart" tile at the end of the grid. Clicking it opens
// the ChartBuilderDialog (state lives in the parent so the same modal can
// also handle "edit existing"). Intentionally dumb — purely a visual CTA.

import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
}

export function AddChartCardMenu({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[160px] border border-dashed border-border rounded-card text-[12px] text-text-secondary hover:text-text-primary hover:border-text-primary/40 hover:bg-white transition-colors flex flex-col items-center justify-center gap-1.5"
    >
      <Plus size={16} strokeWidth={1.75} />
      <span className="font-medium">Build a chart</span>
      <span className="text-[10.5px] text-text-tertiary px-4 text-center leading-tight">
        Slice your leads by any field. Filter. Save.
      </span>
    </button>
  );
}
