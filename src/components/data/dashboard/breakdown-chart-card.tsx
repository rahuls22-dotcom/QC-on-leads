"use client";

// One chart card. Picks the visualization off the dim's chartKind:
//   - donut  → Pie + side legend (nominal / categorical splits)
//   - column → Vertical bar chart (ordinal / range-bucketed values)
//
// Two modes:
//   1. Preset, pass `cardId` (source/company_tier/seniority/...)
//   2. Custom build, pass `card` (CustomChartCard). Filters in `card.filters`
//      are AND-ed onto the incoming profiles before bucketing.

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { breakdownByDim } from "@/lib/dashboard/breakdown";
import {
  CHART_CARD_LABEL,
  CHART_CARD_TO_DIM,
  DIM_REGISTRY,
} from "@/lib/dashboard/dim-registry";
import { evalFilters, clauseLabel } from "@/lib/dashboard/filter-eval";
import type {
  BreakdownRow,
  ChartCardId,
  CustomChartCard,
  FilterDim,
  LeadProfile,
} from "@/lib/dashboard/types";

interface PresetProps {
  mode: "preset";
  cardId: ChartCardId;
  profiles: LeadProfile[];
}

interface CustomProps {
  mode: "custom";
  card: CustomChartCard;
  profiles: LeadProfile[];
  onEdit?: () => void;
  onRemove?: () => void;
}

type Props = PresetProps | CustomProps;

// Muted editorial palette. Matches the campaigns/lead-insights tones so
// charts across modules feel like one product, not a Christmas tree.
// Earthier than the old set: teal, slate-blue, coral, mustard, taupe.
const PALETTE = [
  "#5BA3A3", // muted teal
  "#8B9EC7", // soft slate-blue
  "#E8927C", // soft coral
  "#D4B96A", // mustard
  "#A8A29E", // warm gray
  "#B8956A", // tan
  "#94A3B8", // cool gray
  "#9985CC", // soft violet
];

function bucketColor(_bucket: string, idx: number): string {
  return PALETTE[idx % PALETTE.length];
}

export function BreakdownChartCard(props: Props) {
  const isCustom = props.mode === "custom";
  const dimId: FilterDim = isCustom ? props.card.dim : CHART_CARD_TO_DIM[props.cardId];
  const dim = DIM_REGISTRY[dimId];
  const label = isCustom ? props.card.name : CHART_CARD_LABEL[props.cardId];

  // Apply local filters for custom cards.
  const scoped = isCustom
    ? props.profiles.filter((p) => evalFilters(p, props.card.filters))
    : props.profiles;

  const rows = breakdownByDim(scoped, dimId);
  const total = scoped.length;
  const chartKind = dim.chartKind ?? "column";

  return (
    <div className="group relative bg-white border border-border rounded-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary truncate">
            {isCustom ? `Slice by ${dim.label}` : label}
          </div>
          {isCustom && (
            <div className="text-[14px] font-semibold text-text-primary truncate mt-0.5">
              {label}
            </div>
          )}
        </div>

        {isCustom && (props.onEdit || props.onRemove) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {props.onEdit && (
              <button
                onClick={props.onEdit}
                aria-label={`Edit ${label}`}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <Pencil size={12} strokeWidth={1.75} />
              </button>
            )}
            {props.onRemove && (
              <button
                onClick={props.onRemove}
                aria-label={`Remove ${label}`}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <X size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter chips (custom cards only) */}
      {isCustom && props.card.filters.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {props.card.filters.map((c, i) => (
            <span
              key={`${c.dim}-${i}`}
              className="inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-text-secondary bg-surface-secondary rounded-[4px]"
            >
              {clauseLabel(c)}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      {rows.length === 0 ? (
        <div className="text-[12px] text-text-tertiary py-6 text-center">No data.</div>
      ) : chartKind === "donut" ? (
        <DonutVis rows={rows} total={total} />
      ) : chartKind === "hbar" ? (
        <HBarVis rows={rows} total={total} />
      ) : (
        <ColumnVis rows={rows} />
      )}
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────

function DonutVis({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const data = rows.map((r, i) => ({
    name: r.bucket,
    value: r.count,
    color: bucketColor(r.bucket, i),
  }));

  const focused = activeIdx != null ? rows[activeIdx] : null;

  return (
    <div className="flex items-center gap-6 min-h-[200px]">
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={1}
              stroke="white"
              strokeWidth={2}
              isAnimationActive={false}
              onMouseLeave={() => setActiveIdx(null)}
            >
              {data.map((d, i) => {
                const dimmed = activeIdx != null && activeIdx !== i;
                const active = activeIdx === i;
                return (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    fillOpacity={dimmed ? 0.25 : 1}
                    stroke={active ? d.color : "white"}
                    strokeWidth={active ? 3 : 2}
                    onMouseEnter={() => setActiveIdx(i)}
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[24px] font-semibold text-text-primary tabular-nums leading-none">
            {focused ? formatCompact(focused.count) : formatCompact(total)}
          </div>
          <div className="text-[10.5px] text-text-tertiary uppercase tracking-[0.4px] truncate max-w-[140px] mt-1.5">
            {focused ? `${focused.pct}%` : "total"}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1 max-h-[200px] overflow-y-auto pr-1">
        {rows.map((r, i) => {
          const dimmed = activeIdx != null && activeIdx !== i;
          const active = activeIdx === i;
          return (
            <div
              key={r.bucket}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              className={[
                "flex items-center gap-2.5 text-[13px] py-1.5 rounded-[5px] px-2 -mx-2 transition-opacity cursor-default",
                dimmed ? "opacity-40" : "opacity-100",
                active ? "bg-surface-secondary" : "",
              ].join(" ")}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: bucketColor(r.bucket, i) }}
              />
              <span className={active ? "text-text-primary font-semibold truncate" : "text-text-primary truncate"}>
                {r.bucket}
              </span>
              <span className="tabular-nums ml-auto whitespace-nowrap">
                <span className="text-text-tertiary">{r.pct}%</span>
                <span className="text-text-tertiary"> · </span>
                <span className="text-text-primary font-semibold">{r.count.toLocaleString("en-IN")}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Column ──────────────────────────────────────────────────────────────

function ColumnVis({ rows }: { rows: BreakdownRow[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const data = rows.map((r, i) => ({
    bucket: r.bucket,
    count: r.count,
    pct: r.pct,
    color: bucketColor(r.bucket, i),
  }));

  return (
    <div>
      <div className="h-[180px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 6, left: 0, bottom: 0 }}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: "#525252" }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{
                fontSize: "11px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #E5E5E5",
              }}
              formatter={(v) => [Number(v).toLocaleString("en-IN"), "Leads"]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d, i) => {
                const dimmed = activeIdx != null && activeIdx !== i;
                return (
                  <Cell
                    key={d.bucket}
                    fill={d.color}
                    fillOpacity={dimmed ? 0.3 : 1}
                    onMouseEnter={() => setActiveIdx(i)}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {rows.map((r, i) => {
          const dimmed = activeIdx != null && activeIdx !== i;
          const active = activeIdx === i;
          return (
            <div
              key={r.bucket}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              className={[
                "flex items-center gap-2 text-[12px] px-1.5 py-1 rounded-[4px] transition-opacity cursor-default",
                dimmed ? "opacity-40" : "opacity-100",
                active ? "bg-surface-secondary" : "",
              ].join(" ")}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: bucketColor(r.bucket, i) }}
              />
              <span className={active ? "text-text-primary font-semibold" : "text-text-secondary"}>
                {r.bucket}
              </span>
              <span className="tabular-nums">
                <span className="text-text-primary font-semibold">{r.count.toLocaleString("en-IN")}</span>
                <span className="text-text-tertiary"> · {r.pct}%</span>
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

// ── Horizontal bar ──────────────────────────────────────────────────────
// Ranked horizontal bars, labels on the left, track + filled bar, count
// and pct on the right. Native divs (no recharts) so the row scales cleanly
// at any card width. Used for ordinal small-bucket dims like age_group.

function HBarVis({ rows, total }: { rows: BreakdownRow[]; total: number }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  // Scale each bar against the largest bucket so small ones stay readable.
  const max = Math.max(...rows.map((r) => r.count), 1);
  void total;

  return (
    <div className="space-y-2.5 py-1.5">
      {rows.map((r, i) => {
        const dimmed = activeIdx != null && activeIdx !== i;
        const active = activeIdx === i;
        const color = bucketColor(r.bucket, i);
        const widthPct = (r.count / max) * 100;
        return (
          <div
            key={r.bucket}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            className={[
              "grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-1 -mx-2 rounded-[5px] cursor-default transition-opacity",
              dimmed ? "opacity-40" : "opacity-100",
              active ? "bg-surface-secondary" : "",
            ].join(" ")}
          >
            <span
              className={
                active
                  ? "text-[12.5px] text-text-primary font-semibold truncate"
                  : "text-[12.5px] text-text-secondary truncate"
              }
            >
              {r.bucket}
            </span>
            <div className="h-2.5 rounded-full bg-surface-page/80 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${widthPct}%`,
                  background: color,
                  opacity: dimmed ? 0.5 : 1,
                }}
              />
            </div>
            <span className="text-[12px] tabular-nums whitespace-nowrap">
              <span className="text-text-primary font-semibold">
                {r.count.toLocaleString("en-IN")}
              </span>
              <span className="text-text-tertiary"> · {r.pct}%</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
