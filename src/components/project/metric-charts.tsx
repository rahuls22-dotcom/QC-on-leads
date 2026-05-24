"use client";

import { useMemo, useState } from "react";
import type { MetricDef, MetricSnapshot } from "./dashboard-metrics";
import { formatMetric } from "./dashboard-metrics";

/**
 * Two pure-SVG chart primitives for the Dashboard:
 *   · Sparkline — a slim, color-coded 14-pt line for metric tiles
 *   · LargeChart — an expanded view with axis labels, area fill, and a
 *     hover tooltip showing the day's value. Used by the click-to-visualize
 *     flow.
 *
 * No charting library — keeps bundle slim and the visuals consistent with
 * the rest of the prototype.
 */

// ─── Sparkline ──────────────────────────────────────────────────────────

export function Sparkline({
  series,
  trendUp,
  width = 96,
  height = 28,
}: {
  series: number[];
  /** Color the path green for "good trend" and red for "bad". */
  trendUp?: boolean;
  width?: number;
  height?: number;
}) {
  const { d, fillD, lastX, lastY } = useMemo(
    () => pathForSeries(series, width, height, 2),
    [series, width, height],
  );
  const stroke =
    trendUp == null
      ? "var(--text-2)"
      : trendUp
        ? "var(--ok-fg)"
        : "var(--err-fg)";
  const fill =
    trendUp == null
      ? "rgba(120,120,120,0.10)"
      : trendUp
        ? "rgba(16,185,129,0.14)"
        : "rgba(220,38,38,0.12)";
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

// ─── Large chart (click-to-visualize body) ──────────────────────────────

export function LargeChart({
  snapshot,
}: {
  snapshot: MetricSnapshot;
}) {
  const w = 640;
  const h = 200;
  const padding = { top: 10, right: 16, bottom: 24, left: 44 };
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;
  const series = snapshot.series;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const points = series.map((v, i) => ({
    x: padding.left + (i / (series.length - 1)) * innerW,
    y: padding.top + (1 - (v - min) / range) * innerH,
    v,
    i,
  }));

  const pathD = points.reduce((acc, p, i) => {
    return acc + (i === 0 ? `M${p.x},${p.y}` : ` L${p.x},${p.y}`);
  }, "");
  const fillD =
    pathD +
    ` L${padding.left + innerW},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`;

  const goodTrend = isGoodTrend(snapshot);
  const stroke = goodTrend == null ? "#7C3AED" : goodTrend ? "#15803D" : "#DC2626";
  const fill = goodTrend == null ? "rgba(124,58,237,0.10)" : goodTrend ? "rgba(16,185,129,0.10)" : "rgba(220,38,38,0.08)";

  const [hover, setHover] = useState<number | null>(null);
  const dayOffset = (i: number) => 13 - i; // 0 = today, 13 = 13 days ago

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        style={{ display: "block" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * w;
          // find nearest point
          let best = 0;
          let bestDist = Infinity;
          points.forEach((p, i) => {
            const d = Math.abs(p.x - x);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          });
          setHover(best);
        }}
      >
        {/* Y axis ticks */}
        {[0, 0.5, 1].map((t) => {
          const y = padding.top + t * innerH;
          const v = max - t * range;
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
                strokeDasharray={t === 0 || t === 1 ? "" : "2,3"}
              />
              <text
                x={padding.left - 6}
                y={y + 4}
                fontSize="9"
                fill="var(--text-tertiary)"
                textAnchor="end"
                style={{ fontFamily: "var(--font-sans, sans-serif)" }}
              >
                {formatMetric(v, snapshot.def.unit)}
              </text>
            </g>
          );
        })}
        {/* X axis labels (just first/last for clarity) */}
        <text
          x={padding.left}
          y={h - 6}
          fontSize="9"
          fill="var(--text-tertiary)"
        >
          14 days ago
        </text>
        <text
          x={padding.left + innerW}
          y={h - 6}
          fontSize="9"
          fill="var(--text-tertiary)"
          textAnchor="end"
        >
          today
        </text>

        {/* Area + line */}
        <path d={fillD} fill={fill} />
        <path d={pathD} stroke={stroke} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {points.map((p) => (
          <circle
            key={p.i}
            cx={p.x}
            cy={p.y}
            r={hover === p.i ? "4" : "2.5"}
            fill={stroke}
            stroke="#FFF"
            strokeWidth={hover === p.i ? "2" : "0"}
          />
        ))}

        {/* Hover guide */}
        {hover != null && (
          <line
            x1={points[hover].x}
            x2={points[hover].x}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="var(--text-2)"
            strokeDasharray="3,3"
            strokeWidth="1"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hover != null && (
        <div
          className="absolute rounded-[6px] px-2 py-1.5 pointer-events-none"
          style={{
            top: 4,
            left: `${(points[hover].x / w) * 100}%`,
            transform: "translateX(-50%)",
            background: "#0A0A0A",
            color: "#FFF",
            fontSize: 11,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
          }}
        >
          <div className="tabular-nums" style={{ fontWeight: 600 }}>
            {formatMetric(points[hover].v, snapshot.def.unit)}
          </div>
          <div style={{ fontSize: 9.5, opacity: 0.7 }}>
            {dayOffset(hover) === 0
              ? "today"
              : `${dayOffset(hover)} day${dayOffset(hover) === 1 ? "" : "s"} ago`}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Path helpers ───────────────────────────────────────────────────────

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
  const fillD =
    d +
    ` L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];
  return { d, fillD, lastX: last.x, lastY: last.y };
}

function isGoodTrend(s: MetricSnapshot): boolean | null {
  if (!s.delta || s.delta.sign === "flat") return null;
  return s.def.higherIsBetter
    ? s.delta.sign === "up"
    : s.delta.sign === "down";
}

// Re-export for convenience.
export type { MetricDef };
