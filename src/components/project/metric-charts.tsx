"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { MetricDef, MetricSnapshot } from "./dashboard-metrics";
import { formatMetric } from "./dashboard-metrics";

/**
 * Two pure-SVG chart primitives + a multi-metric comparison chart for
 * the Dashboard:
 *
 *   · Sparkline       — slim 14-pt line on tiles
 *   · LargeChart      — single-metric expanded chart
 *   · ComparisonChart — up to 4 metrics on one chart, normalized to their
 *                       own ranges, with a shared X axis, color-coded
 *                       legend, and a vertical hover guide that shows
 *                       every series' actual value at the hovered day.
 *
 * No charting library — keeps the bundle slim and visuals consistent.
 */

// ─── Sparkline ──────────────────────────────────────────────────────────

export function Sparkline({
  series,
  trendUp,
  width = 96,
  height = 28,
  strokeOverride,
  fillOverride,
}: {
  series: number[];
  trendUp?: boolean;
  width?: number;
  height?: number;
  /** Force a specific stroke color (used in selected-tile state). */
  strokeOverride?: string;
  fillOverride?: string;
}) {
  const { d, fillD, lastX, lastY } = useMemo(
    () => pathForSeries(series, width, height, 2),
    [series, width, height],
  );
  const defaultStroke =
    trendUp == null
      ? "var(--text-2)"
      : trendUp
        ? "var(--ok-fg)"
        : "var(--err-fg)";
  const defaultFill =
    trendUp == null
      ? "rgba(120,120,120,0.10)"
      : trendUp
        ? "rgba(16,185,129,0.14)"
        : "rgba(220,38,38,0.12)";
  const stroke = strokeOverride ?? defaultStroke;
  const fill = fillOverride ?? defaultFill;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: "block" }}
      aria-hidden
    >
      <path d={fillD} fill={fill} />
      <path d={d} stroke={stroke} strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={stroke} />
    </svg>
  );
}

// ─── Large single-metric chart ──────────────────────────────────────────

export function LargeChart({ snapshot }: { snapshot: MetricSnapshot }) {
  return (
    <ComparisonChart
      snapshots={[snapshot]}
      colors={[primaryColorForSnapshot(snapshot)]}
    />
  );
}

// ─── Multi-metric comparison chart ──────────────────────────────────────

/** Max metrics the user can compare at once. Above ~4 the legend and
 * lines get too noisy to read; this gives plenty of headroom for typical
 * "CPL vs CPVL" / "Verified vs Qualified" style comparisons. */
export const MAX_COMPARISON_METRICS = 4;

/** Distinct, high-contrast palette for the comparison lines. */
export const COMPARISON_PALETTE: string[] = [
  "#7C3AED", // primary purple
  "#0EA5E9", // sky
  "#F59E0B", // amber
  "#DC2626", // red
];

export function colorForIndex(i: number): string {
  return COMPARISON_PALETTE[i % COMPARISON_PALETTE.length];
}

export function ComparisonChart({
  snapshots,
  colors,
  onRemove,
}: {
  snapshots: MetricSnapshot[];
  colors: string[];
  /** Optional remove callback per snapshot — when present, the legend
   * shows an X next to each entry. */
  onRemove?: (key: string) => void;
}) {
  const w = 720;
  const h = 220;
  const padding = { top: 16, right: 24, bottom: 32, left: 12 };
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;

  // For each series, compute its own min/max so we can normalize independently.
  const normalized = snapshots.map((snap) => {
    const min = Math.min(...snap.series);
    const max = Math.max(...snap.series);
    const range = max - min || 1;
    const points = snap.series.map((v, i) => ({
      x: padding.left + (i / (snap.series.length - 1)) * innerW,
      y: padding.top + (1 - (v - min) / range) * innerH,
      v,
      i,
    }));
    return { snap, min, max, points };
  });

  const [hover, setHover] = useState<number | null>(null);
  const dayOffset = (i: number) => 13 - i;

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        {snapshots.map((snap, i) => (
          <LegendChip
            key={snap.def.key}
            label={snap.def.label}
            value={formatMetric(snap.current, snap.def.unit)}
            color={colors[i]}
            onRemove={onRemove ? () => onRemove(snap.def.key) : undefined}
          />
        ))}
        <span className="text-[10.5px] text-text-tertiary ml-auto">
          Values normalized to each metric&apos;s own range · hover for actuals
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * w;
          // Snap to nearest day index based on x.
          const points = normalized[0]?.points || [];
          let best = 0;
          let bestDist = Infinity;
          points.forEach((p, i) => {
            const dist = Math.abs(p.x - x);
            if (dist < bestDist) {
              bestDist = dist;
              best = i;
            }
          });
          setHover(best);
        }}
      >
        {/* Horizontal gridlines (top, mid, bottom) — purely decorative since
            we don't share a Y scale across metrics. */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            x2={padding.left + innerW}
            y1={padding.top + t * innerH}
            y2={padding.top + t * innerH}
            stroke="var(--border-subtle)"
            strokeWidth="1"
            strokeDasharray={t === 0 || t === 1 ? "" : "2,3"}
          />
        ))}

        {/* Date labels at the bottom */}
        <text
          x={padding.left}
          y={h - 8}
          fontSize="10"
          fill="var(--text-tertiary)"
        >
          14 days ago
        </text>
        <text
          x={padding.left + innerW}
          y={h - 8}
          fontSize="10"
          fill="var(--text-tertiary)"
          textAnchor="end"
        >
          today
        </text>

        {/* One line per series */}
        {normalized.map(({ points }, idx) => {
          const color = colors[idx];
          const pathD = points.reduce(
            (acc, p, i) =>
              acc + (i === 0 ? `M${p.x},${p.y}` : ` L${p.x},${p.y}`),
            "",
          );
          return (
            <g key={normalized[idx].snap.def.key}>
              <path
                d={pathD}
                stroke={color}
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.map((p) => (
                <circle
                  key={p.i}
                  cx={p.x}
                  cy={p.y}
                  r={hover === p.i ? "3.5" : "2"}
                  fill={color}
                  stroke="#FFF"
                  strokeWidth={hover === p.i ? "1.5" : "0"}
                />
              ))}
            </g>
          );
        })}

        {/* Hover guide */}
        {hover != null && (
          <line
            x1={normalized[0].points[hover].x}
            x2={normalized[0].points[hover].x}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="var(--text-2)"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
        )}
      </svg>

      {/* Tooltip — shows every series' actual value at the hovered day */}
      {hover != null && (
        <div
          className="absolute rounded-[7px] px-2.5 py-2 pointer-events-none"
          style={{
            top: 4,
            left: `${(normalized[0].points[hover].x / w) * 100}%`,
            transform: "translateX(-50%)",
            background: "#0A0A0A",
            color: "#FFF",
            fontSize: 11,
            whiteSpace: "nowrap",
            boxShadow: "0 6px 18px rgba(0,0,0,0.24)",
            minWidth: 160,
          }}
        >
          <div style={{ fontSize: 9.5, opacity: 0.7, marginBottom: 4 }}>
            {dayOffset(hover) === 0
              ? "today"
              : `${dayOffset(hover)} day${dayOffset(hover) === 1 ? "" : "s"} ago`}
          </div>
          <div className="space-y-1">
            {normalized.map(({ snap, points }, idx) => (
              <div key={snap.def.key} className="flex items-center gap-2">
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colors[idx],
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 10.5, opacity: 0.85 }}>
                  {snap.def.label}
                </span>
                <span
                  className="tabular-nums"
                  style={{ fontWeight: 600, fontSize: 11 }}
                >
                  {formatMetric(points[hover].v, snap.def.unit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendChip({
  label,
  value,
  color,
  onRemove,
}: {
  label: string;
  value: string;
  color: string;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-button px-2 py-1"
      style={{
        background: "#FFF",
        border: `1px solid var(--border)`,
        fontSize: 11,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span className="font-medium">{label}</span>
      <span className="tabular-nums text-text-tertiary">{value}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center text-text-tertiary hover:text-text-secondary"
          style={{ marginLeft: 2, width: 14, height: 14 }}
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function pathForSeries(
  series: number[],
  width: number,
  height: number,
  pad: number,
): { d: string; fillD: string; lastX: number; lastY: number } {
  if (series.length === 0) {
    return { d: "", fillD: "", lastX: 0, lastY: height / 2 };
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const usableH = height - pad * 2;
  const points = series.map((v, i) => ({
    x: (i / (series.length - 1)) * width,
    y: pad + (1 - (v - min) / range) * usableH,
  }));
  const d = points.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M${p.x},${p.y}` : ` L${p.x},${p.y}`);
  }, "");
  const fillD = d + ` L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];
  return { d, fillD, lastX: last.x, lastY: last.y };
}

function primaryColorForSnapshot(s: MetricSnapshot): string {
  if (!s.delta || s.delta.sign === "flat") return "#7C3AED";
  const good = s.def.higherIsBetter ? s.delta.sign === "up" : s.delta.sign === "down";
  return good ? "#15803D" : "#DC2626";
}

export type { MetricDef };
