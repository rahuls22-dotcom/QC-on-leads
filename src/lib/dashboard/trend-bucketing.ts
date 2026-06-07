// Resolve a TimeRange to absolute (startMs, endMs) bounds + pick daily vs
// weekly bucketing for the trend chart.

import type { RangeBounds, TimeRange } from "./types";

export function resolveRange(
  range: TimeRange,
  customStart: Date | null,
  customEnd: Date | null,
  now: number = Date.now(),
): RangeBounds {
  if (range === "all") return { startMs: null, endMs: null };
  if (range === "custom") {
    const s = customStart ? new Date(customStart).setHours(0, 0, 0, 0) : null;
    const e = customEnd ? new Date(customEnd).setHours(23, 59, 59, 999) : null;
    return { startMs: s, endMs: e };
  }
  const days = range === "7d" ? 7 : range === "14d" ? 14 : range === "30d" ? 30 : 90;
  return { startMs: now - days * 86_400_000, endMs: now };
}

export type Bucketing = "daily" | "weekly";

export function pickBucketing(range: TimeRange, bounds: RangeBounds): Bucketing {
  if (range === "7d" || range === "14d" || range === "30d") return "daily";
  if (range === "90d") return "weekly";
  // all + custom: span-based
  if (bounds.startMs != null && bounds.endMs != null) {
    const days = (bounds.endMs - bounds.startMs) / 86_400_000;
    return days >= 90 ? "weekly" : "daily";
  }
  return "weekly";
}

/** Returns the bucket key (YYYY-MM-DD) a timestamp falls into, given a
 *  daily/weekly bucketing scheme. Week buckets start Monday. */
export function bucketKey(ms: number, mode: Bucketing): string {
  const d = new Date(ms);
  if (mode === "daily") {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // Move back to Monday of the week.
  const dow = (d.getDay() + 6) % 7; // 0 = Mon
  const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  return `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
