"use client";

// Donut + side legend for the source split (CRM / Bulk / Single).
// Style matches BreakdownChartCard's DonutVis: 180px wheel, big center
// number, hover-synced legend, palette aligned with the breakdown charts.
//
// `activeSource` reflects the top-level source filter. When set, the
// donut keeps the full mix but dims non-active slices and rings the
// active one. Hovering a slice/legend row pre-empts that filter cue
// and shows the focused bucket's count + pct in the center.

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { LeadProfile } from "@/lib/dashboard/types";
import type { SourceFilter } from "./source-filter-pills";

interface Props {
  profiles: LeadProfile[];
  activeSource?: SourceFilter;
}

// Muted palette, shared with BreakdownChartCard. Slate-blue / teal /
// violet pulled from the editorial set so this donut sits in the same
// visual register as the rest of the dashboard.
const SOURCE_META = {
  crm: { label: "CRM", color: "#8B9EC7" },
  bulk: { label: "Bulk", color: "#5BA3A3" },
  single: { label: "Single", color: "#9985CC" },
} as const;

const ORDER: (keyof typeof SOURCE_META)[] = ["crm", "bulk", "single"];

export function SourceDonut({ profiles, activeSource = "all" }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const counts: Record<keyof typeof SOURCE_META, number> = { crm: 0, bulk: 0, single: 0 };
  for (const p of profiles) counts[p.source]++;
  const total = profiles.length;

  const rows = ORDER.filter((k) => counts[k] > 0).map((k) => ({
    key: k,
    label: SOURCE_META[k].label,
    color: SOURCE_META[k].color,
    value: counts[k],
    pct: total === 0 ? 0 : Math.round((counts[k] / total) * 100),
  }));

  if (total === 0 || rows.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[12px] text-text-tertiary">
        No data.
      </div>
    );
  }

  const focused = hoverIdx != null ? rows[hoverIdx] : null;

  return (
    <div className="flex items-center gap-6 min-h-[200px]">
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={1}
              stroke="white"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {rows.map((r, i) => {
                const filterDimmed =
                  activeSource !== "all" && activeSource !== r.key;
                const filterActive =
                  activeSource !== "all" && activeSource === r.key;
                const hoverDimmed = hoverIdx != null && hoverIdx !== i;
                const hoverActive = hoverIdx === i;
                const dimmed = hoverDimmed || filterDimmed;
                const active = hoverActive || filterActive;
                return (
                  <Cell
                    key={r.key}
                    fill={r.color}
                    fillOpacity={dimmed ? 0.25 : 1}
                    stroke={active ? r.color : "white"}
                    strokeWidth={active ? 3 : 2}
                    onMouseEnter={() => setHoverIdx(i)}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[24px] font-semibold text-text-primary tabular-nums leading-none">
            {focused ? formatCompact(focused.value) : formatCompact(total)}
          </div>
          <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.4px] truncate max-w-[140px] mt-1.5">
            {focused ? `${focused.pct}%` : "total"}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {rows.map((r, i) => {
          const filterDimmed = activeSource !== "all" && activeSource !== r.key;
          const filterActive = activeSource !== "all" && activeSource === r.key;
          const hoverDimmed = hoverIdx != null && hoverIdx !== i;
          const hoverActive = hoverIdx === i;
          const dimmed = hoverDimmed || filterDimmed;
          const active = hoverActive || filterActive;
          return (
            <div
              key={r.key}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className={[
                "flex items-center gap-2.5 text-[13px] py-1.5 rounded-[5px] px-2 -mx-2 transition-opacity cursor-default",
                dimmed ? "opacity-40" : "opacity-100",
                active ? "bg-surface-secondary" : "",
              ].join(" ")}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: r.color }}
              />
              <span
                className={
                  active
                    ? "text-text-primary font-semibold truncate"
                    : "text-text-primary truncate"
                }
              >
                {r.label}
              </span>
              <span className="tabular-nums ml-auto whitespace-nowrap">
                <span className="text-text-tertiary">{r.pct}%</span>
                <span className="text-text-tertiary"> · </span>
                <span className="text-text-primary font-semibold">
                  {r.value.toLocaleString("en-IN")}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
