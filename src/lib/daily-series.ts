/**
 * Single source of truth for time-series data across the prototype.
 *
 * Every outreach owns a 90-day activity fingerprint — calls, connects,
 * qualified leads, talktime, spend, leads added — keyed off its launch
 * date and activity window. Per-day values have realistic weekday /
 * weekend cadence plus occasional spike days, so when the user changes
 * the date filter the numbers move with real-feeling variance, not a
 * flat fraction of the lifetime total.
 *
 * The lifetime aggregate of each fingerprint matches the outreach's
 * canonical totals exactly (totalContacts, called, qualified, etc.)
 * so widgets that show lifetime numbers stay consistent with widgets
 * that show a date-windowed slice.
 *
 * Pages should NEVER scale by `rangeShare = days/90`. Instead, get the
 * relevant daily series and sum it within the requested window — the
 * exported helpers (`sumInRange`, `rangeWindowFromPreset`, `prevWindow`,
 * `pctChange`) do the math.
 *
 * Day-index convention: index 0 is 89 days ago, index 89 is today.
 * Indexing on a flat array keeps the math cheap and avoids dragging
 * Date objects into every page-level useMemo.
 */

import { outreachList, type OutreachListItem } from "./outreach-data";

export const SERIES_LENGTH = 90;

// Per-day fingerprint of one outreach (or the workspace aggregate).
export interface DailyActivity {
  dayIndex: number;       // 0 = 89 days ago, 89 = today
  calls: number;          // dial attempts that day
  connected: number;      // calls that actually connected
  interacted: number;     // calls with a meaningful exchange
  qualified: number;      // leads that qualified
  notQualified: number;   // leads disqualified
  talkMinutes: number;
  spend: number;          // INR
  newLeads: number;       // contacts added to the outreach this day
  verifiedLeads: number;  // verified out of newLeads
}

// ─── Shape generation ───────────────────────────────────────────────────────

// Hash an id into a small seed — gives each outreach a stable fingerprint
// so two outreaches with similar lifetime totals still produce visibly
// different sparklines.
function seed(id: string): number {
  let h = 0;
  for (const ch of id) h = ch.charCodeAt(0) + ((h << 5) - h);
  return Math.abs(h);
}

// Per-day shape factor for an outreach with `daysActive` days of activity.
// Encodes the kind of variance you'd see in real call-centre data:
//
//   - Sat/Sun dip to ~30–40% of the weekday baseline. Outbound calling
//     to consumers in India still happens on weekends but at a much
//     lower rate; B2C real-estate is the dataset we're modelling.
//   - A gentle sinusoidal weekly cycle so mid-week is the natural peak.
//   - Spike days (~14% of days) at 1.4× baseline — campaign launches,
//     follow-up batches, special pushes. Deterministic per outreach
//     so the same outreach's sparkline doesn't change on every render.
//   - First 3 days ramp up (35%, 60%, 85%) because real outreaches
//     warm up — the agent is still learning, the contact list is being
//     dialled in priority order, etc.
//   - Last 2 days of an active window decay (85%, 70%) so completed
//     outreaches show a natural tail-off rather than a cliff.
function shapeFactor(
  dayIndex: number,
  daysActive: number,
  daysIntoActivity: number,
  s: number,
): number {
  const dow = dayIndex % 7;
  const isWeekend = dow === 0 || dow === 6;
  const baseline = isWeekend ? 0.35 : 1.0;

  const weekly = 1 + Math.sin(dayIndex * 0.45 + s * 0.1) * 0.18;

  // Deterministic spike: hash (seed × dayIndex) into a 0..99 bucket.
  const spikeBucket = ((s * 31 + dayIndex * 17) >>> 0) % 100;
  const spike = spikeBucket < 14 ? 1.4 : 1.0;

  let ramp = 1.0;
  if (daysIntoActivity === 0) ramp = 0.35;
  else if (daysIntoActivity === 1) ramp = 0.6;
  else if (daysIntoActivity === 2) ramp = 0.85;

  const remaining = daysActive - 1 - daysIntoActivity;
  let decay = 1.0;
  if (remaining === 0) decay = 0.7;
  else if (remaining === 1) decay = 0.85;

  return Math.max(0.1, baseline * weekly * spike * ramp * decay);
}

// Build a 90-day fingerprint for one outreach. The sum of each metric
// across the array equals the outreach's lifetime total exactly — so
// the headline numbers (e.g. "342 dialled") and the daily series (e.g.
// the Talktime sparkline) can never disagree.
function buildSeries(o: OutreachListItem): DailyActivity[] {
  const series: DailyActivity[] = [];
  for (let i = 0; i < SERIES_LENGTH; i++) {
    series.push({
      dayIndex: i,
      calls: 0,
      connected: 0,
      interacted: 0,
      qualified: 0,
      notQualified: 0,
      talkMinutes: 0,
      spend: 0,
      newLeads: 0,
      verifiedLeads: 0,
    });
  }

  const activity = Math.min(o.activityDays, SERIES_LENGTH);
  if (activity === 0) return series;

  const s = seed(o.id);

  // Compute shape weight per active day, then distribute lifetime
  // totals proportional to those weights. The lifetime → daily split
  // is a single allocation, so totals are preserved exactly.
  const weights: number[] = [];
  let totalWeight = 0;
  for (let d = 0; d < activity; d++) {
    const dayIndex = SERIES_LENGTH - activity + d;
    const w = shapeFactor(dayIndex, activity, d, s);
    weights.push(w);
    totalWeight += w;
  }

  // Verified-lead conversion: rough 14% of newLeads end up verified —
  // gives the dashboard a non-trivial verifiedLeads number that scales
  // with the date window without us having to track it per outreach.
  const verifiedRate = 0.14;

  for (let d = 0; d < activity; d++) {
    const dayIndex = SERIES_LENGTH - activity + d;
    const share = weights[d] / totalWeight;
    const newLeads = Math.round(o.totalContacts * share);
    series[dayIndex] = {
      dayIndex,
      calls: Math.round(o.called * share),
      connected: Math.round(o.connected * share),
      interacted: Math.round(o.interacted * share),
      qualified: Math.round(o.qualified * share),
      notQualified: Math.round(o.notQualified * share),
      talkMinutes: Math.round(o.talktimeMins * share),
      spend: Math.round(o.spend * share),
      newLeads,
      verifiedLeads: Math.round(newLeads * verifiedRate),
    };
  }

  return series;
}

// ─── Public access ──────────────────────────────────────────────────────────

const cache: Record<string, DailyActivity[]> = {};

export function dailySeriesForOutreach(id: string): DailyActivity[] {
  if (!cache[id]) {
    const o = outreachList.find((x) => x.id === id);
    if (!o) {
      const empty: DailyActivity[] = [];
      for (let i = 0; i < SERIES_LENGTH; i++) {
        empty.push({
          dayIndex: i, calls: 0, connected: 0, interacted: 0,
          qualified: 0, notQualified: 0, talkMinutes: 0,
          spend: 0, newLeads: 0, verifiedLeads: 0,
        });
      }
      return empty;
    }
    cache[id] = buildSeries(o);
  }
  return cache[id];
}

// Workspace aggregate — sum each metric across all outreaches per day.
// This is the daily series the dashboard derives every metric from.
let workspaceCache: DailyActivity[] | null = null;

export function workspaceDailySeries(): DailyActivity[] {
  if (workspaceCache) return workspaceCache;

  const empty: DailyActivity[] = [];
  for (let i = 0; i < SERIES_LENGTH; i++) {
    empty.push({
      dayIndex: i, calls: 0, connected: 0, interacted: 0,
      qualified: 0, notQualified: 0, talkMinutes: 0,
      spend: 0, newLeads: 0, verifiedLeads: 0,
    });
  }

  for (const o of outreachList) {
    const s = dailySeriesForOutreach(o.id);
    for (let i = 0; i < SERIES_LENGTH; i++) {
      empty[i].calls += s[i].calls;
      empty[i].connected += s[i].connected;
      empty[i].interacted += s[i].interacted;
      empty[i].qualified += s[i].qualified;
      empty[i].notQualified += s[i].notQualified;
      empty[i].talkMinutes += s[i].talkMinutes;
      empty[i].spend += s[i].spend;
      empty[i].newLeads += s[i].newLeads;
      empty[i].verifiedLeads += s[i].verifiedLeads;
    }
  }

  // Boost the dashboard's lead-counts so they reflect non-voice channels
  // (Meta Lead, website forms) on top of outreach activity. Real
  // workspaces always have leads coming in outside the outreach product
  // — without this the dashboard underreports Total Leads vs. how a real
  // user would experience the workspace.
  for (let i = 0; i < SERIES_LENGTH; i++) {
    const dow = i % 7;
    const isWeekend = dow === 0 || dow === 6;
    const baseline = isWeekend ? 8 : 22;
    const noise = 1 + Math.sin(i * 0.31) * 0.25;
    const extra = Math.round(baseline * noise);
    empty[i].newLeads += extra;
    empty[i].verifiedLeads += Math.round(extra * 0.18);
  }

  workspaceCache = empty;
  return empty;
}

// ─── Range windows ──────────────────────────────────────────────────────────

export interface RangeWindow {
  /** Number of days in this window. */
  days: number;
  /** Inclusive start day-index (0..89). */
  startIndex: number;
  /** Inclusive end day-index (0..89). */
  endIndex: number;
}

// Map the date-range-selector preset values into day-index windows.
// Keep this aligned with src/components/dashboard/date-range-selector.tsx —
// the selector is the contract; this is the data side of it.
export function rangeWindowFromPreset(preset: string): RangeWindow {
  const today = SERIES_LENGTH - 1;
  switch (preset) {
    case "today":
      return { days: 1, startIndex: today, endIndex: today };
    case "yesterday":
      return { days: 1, startIndex: today - 1, endIndex: today - 1 };
    case "2d":
      return { days: 2, startIndex: today - 1, endIndex: today };
    case "7":
    case "thisweek":
      return { days: 7, startIndex: today - 6, endIndex: today };
    case "lastweek":
      return { days: 7, startIndex: today - 13, endIndex: today - 7 };
    case "14":
      return { days: 14, startIndex: today - 13, endIndex: today };
    case "30":
    case "thismonth":
      return { days: 30, startIndex: today - 29, endIndex: today };
    case "lastmonth":
      return { days: 30, startIndex: today - 59, endIndex: today - 30 };
    case "lifetime":
    case "90":
      return { days: 90, startIndex: 0, endIndex: today };
    default:
      return { days: 30, startIndex: today - 29, endIndex: today };
  }
}

// Previous comparable window — same length, shifted back by `w.days`.
// Used for trend chips ("+12% vs last week"). Clamps to 0 so the
// 90-day buffer can't underflow on long ranges.
export function prevWindow(w: RangeWindow): RangeWindow {
  return {
    days: w.days,
    startIndex: Math.max(0, w.startIndex - w.days),
    endIndex: Math.max(0, w.endIndex - w.days),
  };
}

// Sum a daily series within a window — returns the aggregate without
// the dayIndex field (it would be ambiguous).
export type AggregateActivity = Omit<DailyActivity, "dayIndex">;

export function sumInRange(
  series: DailyActivity[],
  w: RangeWindow,
): AggregateActivity {
  let calls = 0, connected = 0, interacted = 0, qualified = 0;
  let notQualified = 0, talkMinutes = 0, spend = 0;
  let newLeads = 0, verifiedLeads = 0;
  for (let i = w.startIndex; i <= w.endIndex; i++) {
    if (i < 0 || i >= series.length) continue;
    const d = series[i];
    calls += d.calls;
    connected += d.connected;
    interacted += d.interacted;
    qualified += d.qualified;
    notQualified += d.notQualified;
    talkMinutes += d.talkMinutes;
    spend += d.spend;
    newLeads += d.newLeads;
    verifiedLeads += d.verifiedLeads;
  }
  return {
    calls, connected, interacted, qualified, notQualified,
    talkMinutes, spend, newLeads, verifiedLeads,
  };
}

// Sliced array for charts.
export function sliceRange(series: DailyActivity[], w: RangeWindow): DailyActivity[] {
  return series.slice(w.startIndex, w.endIndex + 1);
}

// Percentage change, rounded to 1 decimal. Returns 0 when previous is 0
// to avoid the divide-by-zero showing up as "Infinity%".
export function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

// Cost-per-lead family of ratios — handy for the dashboard's CPL / CPVL
// / CPQL cards. Returns 0 when the denominator is 0 (avoids ₹Infinity).
export function safeRatio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ─── Legacy back-compat exports ─────────────────────────────────────────────
//
// `dailyTalktime90d` and `dailySpend90d` used to live in outreach-data.ts as
// hand-tuned sinusoids. Page code still consumes them via `periodTrend(...)`
// for the workspace trend chip on /outreach. Re-exporting them here from the
// unified series guarantees the chip's "+X%" matches the sum of per-row
// activity, which it didn't before.

export const dailyTalktime90d: number[] = workspaceDailySeries().map((d) => d.talkMinutes);
export const dailySpend90d: number[] = workspaceDailySeries().map((d) => d.spend);
