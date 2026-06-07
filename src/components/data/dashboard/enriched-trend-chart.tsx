"use client";

// Overlapping areas: total leads submitted for enrichment per bucket vs
// the subset that actually got enriched. Submitted = enriched + failed +
// not_enriched (everything that came in). Enriched = succeeded. The
// enriched area sits inside the submitted area, the gap visually = the
// not-yet-enriched / failed bucket. Bucketing decided by pickBucketing().

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { bucketKey, pickBucketing } from "@/lib/dashboard/trend-bucketing";
import type { LeadProfile, RangeBounds, TimeRange } from "@/lib/dashboard/types";

interface Props {
  profiles: LeadProfile[];
  range: TimeRange;
  bounds: RangeBounds;
}

interface TrendPoint {
  bucket: string;
  date: string;
  submitted: number;
  enriched: number;
  enrichedPct: number;
}

export function EnrichedTrendChart({ profiles, range, bounds }: Props) {
  const data = useMemo(() => buildTrend(profiles, range, bounds), [profiles, range, bounds]);

  if (data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-[12px] text-text-tertiary">
        No data for this range.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(15,15,15,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary, #71717a)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={formatCount}
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary, #71717a)" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            (value as number).toLocaleString("en-IN"),
            name === "submitted" ? "Submitted" : "Enriched",
          ]}
          labelFormatter={(label) => label}
          // Force order: Submitted on top, Enriched below.
          itemSorter={(item) => (item.dataKey === "submitted" ? 0 : 1)}
        />
        {/* Outer envelope = total leads given for enrichment */}
        <Area
          type="monotone"
          dataKey="submitted"
          stroke="#D4B96A"
          fill="#D4B96A"
          fillOpacity={0.3}
          strokeWidth={1.5}
        />
        {/* Inner = subset that actually got enriched */}
        <Area
          type="monotone"
          dataKey="enriched"
          stroke="#5BA3A3"
          fill="#5BA3A3"
          fillOpacity={0.65}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function buildTrend(
  profiles: LeadProfile[],
  range: TimeRange,
  bounds: RangeBounds,
): TrendPoint[] {
  const mode = pickBucketing(range, bounds);
  const byBucket = new Map<string, { submitted: number; enriched: number }>();
  for (const p of profiles) {
    const ts = new Date(p.startedAt).getTime();
    if (Number.isNaN(ts)) continue;
    const k = bucketKey(ts, mode);
    let row = byBucket.get(k);
    if (!row) {
      row = { submitted: 0, enriched: 0 };
      byBucket.set(k, row);
    }
    // Every record that came in counts as "submitted for enrichment".
    row.submitted++;
    if (p.status === "enriched") row.enriched++;
  }

  const points: TrendPoint[] = [];
  for (const [k, v] of byBucket) {
    const enrichedPct = v.submitted === 0 ? 0 : Math.round((v.enriched / v.submitted) * 100);
    points.push({
      bucket: k,
      date: formatBucketLabel(k),
      submitted: v.submitted,
      enriched: v.enriched,
      enrichedPct,
    });
  }
  points.sort((a, b) => a.bucket.localeCompare(b.bucket));
  return points;
}

function formatBucketLabel(key: string): string {
  // "2026-05-27" → "May 27"
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatCount(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return String(v);
}
