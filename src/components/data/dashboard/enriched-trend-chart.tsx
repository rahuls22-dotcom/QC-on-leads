"use client";

// Stacked area: % enriched vs % not-enriched/failed over time. Bucketing
// (daily vs weekly) decided by trend-bucketing.pickBucketing().

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
  enriched: number;
  failed: number;
  enrichedPct: number;
  failedPct: number;
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
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(15,15,15,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary, #71717a)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10, fill: "var(--color-text-tertiary, #71717a)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            `${value}%`,
            name === "enrichedPct" ? "Enriched" : "Not enriched / Failed",
          ]}
          labelFormatter={(label) => label}
        />
        <Area
          type="monotone"
          dataKey="enrichedPct"
          stackId="1"
          stroke="#22C55E"
          fill="#22C55E"
          fillOpacity={0.55}
        />
        <Area
          type="monotone"
          dataKey="failedPct"
          stackId="1"
          stroke="#F59E0B"
          fill="#F59E0B"
          fillOpacity={0.55}
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
  const byBucket = new Map<string, { enriched: number; failed: number }>();
  for (const p of profiles) {
    const ts = new Date(p.startedAt).getTime();
    if (Number.isNaN(ts)) continue;
    const k = bucketKey(ts, mode);
    let row = byBucket.get(k);
    if (!row) {
      row = { enriched: 0, failed: 0 };
      byBucket.set(k, row);
    }
    if (p.status === "enriched") row.enriched++;
    else if (p.status === "failed" || p.status === "not_enriched") row.failed++;
  }

  const points: TrendPoint[] = [];
  for (const [k, v] of byBucket) {
    const total = v.enriched + v.failed;
    const enrichedPct = total === 0 ? 0 : Math.round((v.enriched / total) * 100);
    const failedPct = total === 0 ? 0 : 100 - enrichedPct;
    points.push({
      bucket: k,
      date: formatBucketLabel(k),
      enriched: v.enriched,
      failed: v.failed,
      enrichedPct,
      failedPct,
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
