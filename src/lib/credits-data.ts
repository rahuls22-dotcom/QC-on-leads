/**
 * Credit / wallet data model.
 *
 * Credits are the user-facing unit. Each capability defines a `rate` in
 * credits per unit of action (e.g. 2 credits per enrichment record, 5
 * credits per minute of voice talk time). The ₹-to-credit price is set
 * elsewhere in the buy flow — keeping it out of this file means we can
 * change pricing (volume discounts, promo bundles) without touching the
 * wallet's display logic. The demo uses the baseline 1 credit = ₹1 INR.
 *
 * Mirrors what we want in the eventual data layer:
 *   - a Wallet is scoped to a subscription period (period_start / end)
 *   - utilization is captured as usage_event rows, each tagged with a
 *     meter that maps to a capability under that wallet
 *   - "remaining" is derived (total − utilized), not stored, so the wallet
 *     and the events stay consistent
 *
 * Capability rows surface the unit count alongside the credit cost (e.g.
 * "1,080 records · 2 credits each") so the rate is legible without
 * exposing a ledger.
 */

// Display constant — used by the "1 credit = ₹X INR" footnote on the
// wallet page. Decoupled from the rate logic so we can adjust pricing
// without rewriting every wallet display.
export const RUPEES_PER_CREDIT = 1;

// Supported display currencies and their per-credit conversion rate.
// The wallet page lets the user switch between these — the underlying
// credit accounting is currency-agnostic; the currency only affects
// what we render alongside the credit number. Add more currencies
// here as needed; ordering controls the picker order.
export type Currency = "INR" | "USD";

export const CURRENCIES: Record<Currency, {
  symbol: string;
  code:   string;
  /** How much 1 credit is worth in this currency, for display only. */
  perCredit: number;
  /** Whether to show the symbol prefix-style ("$5") or suffix-style. */
  position: "prefix" | "suffix";
}> = {
  INR: { symbol: "₹", code: "INR", perCredit: 1,     position: "prefix" },
  USD: { symbol: "$", code: "USD", perCredit: 0.012, position: "prefix" },
};

/**
 * Format a money amount derived from a credit count. Use this whenever
 * you want to show the rupee/dollar equivalent of credits anywhere in
 * the wallet UI so the formatting stays consistent.
 */
export function formatMoney(credits: number, currency: Currency): string {
  const { symbol, perCredit, position } = CURRENCIES[currency];
  const amount = credits * perCredit;
  // For amounts < 1, show 3 decimals; ≥ 1 < 100 show 2; ≥100 show whole
  // with Indian comma grouping. This keeps the smallest USD figures
  // readable while not littering rupee values with trailing zeros.
  let display: string;
  if (amount < 1)        display = amount.toFixed(3);
  else if (amount < 100) display = amount.toFixed(2);
  else                   display = Math.round(amount).toLocaleString("en-IN");
  return position === "prefix" ? `${symbol}${display}` : `${display}${symbol}`;
}

// NOTE on pricing ownership: per-capability `rate` values arrive from
// an external admin product (which talks to the ERP for contracts).
// This product just consumes them — there is no UI here to view or
// edit contract terms. Rates are baked into the seed data below as
// if they had already been synced in.

import type { LucideIcon } from "lucide-react";
import {
  Database,
  Phone,
  MessageCircle,
  User as UserIcon,
  BadgeDollarSign,
  Building,
  PhoneCall,
  PhoneIncoming,
  Users,
  Megaphone,
  Bell,
  Lock,
  ChevronsLeftRight,
  Mail,
  Gauge,
  Briefcase,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────────────
//  Types
// ────────────────────────────────────────────────────────────────────────

export interface CapabilityRow {
  id:          string;
  label:       string;
  icon:        LucideIcon;
  // Credits this capability has consumed in the current period.
  creditsUsed: number;
  // The unit count behind those credits (records, minutes, messages…).
  // Combined with `rate` this makes the cost legible without doing
  // mental math: 750 records × 2 credits each = 1,500 credits.
  unitCount:   number;
  unitLabel:   string; // singular, lowercase ("record", "min", "message")
  // Per-action rate — what this workspace pays per unit of this
  // capability. Synced in from the admin product (which holds the
  // contract). The credit meter just reads this value.
  rate:        number;
  // `included` is for things that are part of plan capacity rather than
  // spend, e.g. Concurrency on the Voice wallet — we render those rows
  // with a muted style and no credit figure.
  included?:   boolean;
  // For included rows, surface the capacity figure ("10 parallel calls").
  includedNote?: string;
}

// Modules are spend categories. They DON'T own their own credit
// allotment — credits are pooled at the workspace level (see
// CREDIT_POOL below). Each module reports how much of that pool it's
// consumed this period and exposes the rates that drove that spend.
export interface Module {
  id:           string;
  name:         string;
  description:  string;          // single-sentence "what this pays for"
  icon:         LucideIcon;
  // Visual identity — pastel `bg` for the chip / tile header, dark `text`
  // for the chip label, soft `gradient` for hero blocks. `chartColor`
  // is a brighter, more saturated cousin used specifically for
  // visualization (stacked bars, legend dots, sidebar widget) — the
  // dark `text` colours were getting lost as thin bar segments and
  // hard to tell apart from each other.
  bg:           string;
  text:         string;
  border:       string;
  gradient:     string;
  chartColor:   string;
  // Credits spent on this module in the current period. Sum across
  // modules = CREDIT_POOL.utilized.
  utilized:     number;
  // Capabilities — what got spent on. Sums to `utilized` for non-included
  // rows. `included` rows are surfaced for transparency but don't count.
  capabilities: CapabilityRow[];
  // The subscription period this module's totals apply to. Mirrored
  // from CREDIT_POOL so each Module row carries its own copy for the
  // small "period chip" we render on the card header.
  periodStart:  string;          // ISO date
  periodEnd:    string;
  // Per-day utilization for the last 90 days, keyed by ISO date. Drives
  // the stacked time-period chart on the wallet page.
  daily:        { date: string; amount: number }[];
  // Operational rate-limit — separate from the credit pool. Even with
  // credits in the bank, the module is capped at this count/day. Today
  // most modules don't have one; Enrichment is the obvious example.
  dailyLimit?: {
    count: number;   // e.g. 5000
    unit:  string;   // singular, lowercase ("record")
    used:  number;   // how many already consumed today
  };
}

// Back-compat alias — older consumers import `Wallet`. New code should
// reach for `Module`, but renaming everything in one go would balloon
// this diff so we keep both type names pointing at the same shape.
export type Wallet = Module;

// ────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────

// Generate a deterministic-feeling per-day series. We don't want the
// charts to look like flat random noise, so this combines a base level
// with a slow weekly sine, a stronger Mon/Thu spike, and a per-wallet
// seed offset so the three wallets don't move in lockstep.
// AI Calling's daily wallet consumption equals the workspace outreach
// voice spend for the same day — they describe the same underlying
// activity (every minute of voice goes through outreach). Earlier the
// wallet had its own independent random series, which meant the
// dashboard / outreach spend numbers diverged from the wallet's
// AI Calling row — a user reconciling "how much did I spend on voice
// this month" would get different answers depending on which page they
// were on. Pulling the series from daily-series.ts fixes that.
//
// Lazy-required to keep the credits-data ⇄ daily-series import order
// safe (daily-series builds workspace aggregates at module load by
// summing outreach data; credits-data also evaluates module data at
// load — easier to dodge the cycle by reading the workspace series on
// first access).
function workspaceVoiceDaily(): { date: string; amount: number }[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { workspaceDailySeries } = require("./daily-series") as typeof import("./daily-series");
  const series = workspaceDailySeries();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return series.map((d, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (series.length - 1 - i));
    return { date: date.toISOString().slice(0, 10), amount: d.spend };
  });
}

// Sum the entries of a daily series that fall inside the current calendar
// month (1st through today, inclusive). Used to compute month-to-date
// per-product utilization figures that anchor the wallet hero — the
// alternative was "last 30 days", which can stretch into the previous
// cycle and make the wallet look over-utilized on the first week of a
// new month.
function monthToDateOf(daily: { date: string; amount: number }[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayIso      = today.toISOString().slice(0, 10);
  return daily
    .filter((d) => d.date >= monthStartIso && d.date <= todayIso)
    .reduce((s, d) => s + d.amount, 0);
}

function monthToDateVoiceSpend(): number {
  return monthToDateOf(workspaceVoiceDaily());
}

function generateDailySeries(
  base:     number,    // mean spend per day in rupees
  variance: number,    // amplitude of variation
  seed:     number,    // wallet-specific offset (e.g. 0, 1, 2)
  days     = 90,
): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dow = d.getDay();
    // Hashing the date string gives us a stable pseudo-random per day.
    const key = d.toISOString().slice(0, 10);
    let h = seed * 31;
    for (const ch of key) h = ch.charCodeAt(0) + ((h << 5) - h);
    const wave  = Math.sin((i / 7) * Math.PI + seed) * 0.4;
    const noise = ((Math.abs(h) % 1000) / 1000 - 0.5) * 0.6;
    const dowBoost = dow === 1 || dow === 4 ? 0.25 : 0; // Mon / Thu push
    const weekend  = dow === 0 || dow === 6 ? -0.45 : 0; // weekend dip
    const amount   = Math.max(
      0,
      Math.round(base + variance * (wave + noise + dowBoost + weekend))
    );
    out.push({ date: key, amount });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
//  Period — billing cycle for the demo
// ────────────────────────────────────────────────────────────────────────
//
// Customers don't all bill on the calendar month. A workspace can sign
// up mid-month and have their cycle reset on, e.g., the 13th of each
// month — running 13 May → 13 Jun, 13 Jun → 13 Jul, and so on. The
// `cycleStartDay` argument lets the helpers express that. Default
// remains 1 so any caller that hasn't been converted still gets the
// classic calendar-month windows.

// Compute the cycle window that contains `now`, given a start-day.
// Rule: cycles start at `cycleStartDay` of each month. If today's day
// is >= cycleStartDay, the current cycle started this month; otherwise
// it started last month. The end is one day before the next cycle's
// start (cycleStartDay of the following month, minus 1ms).
function currentPeriod(cycleStartDay: number = 1): { start: string; end: string } {
  const now = new Date();
  const day = now.getDate();
  // Year/month of the cycle start. If today is before this month's
  // cycleStartDay, we're still inside the cycle that began last month.
  const startMonthOffset = day >= cycleStartDay ? 0 : -1;
  const start = new Date(
    now.getFullYear(),
    now.getMonth() + startMonthOffset,
    cycleStartDay,
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    cycleStartDay,
    0, 0, 0, -1, // one millisecond before the next cycle's start
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

const { start: PERIOD_START, end: PERIOD_END } = currentPeriod();

// ────────────────────────────────────────────────────────────────────────
//  Credit pool — the single bucket modules draw from
// ────────────────────────────────────────────────────────────────────────

// All modules share one bucket of credits per period. The workspace
// buys credits in bulk and each module's metered actions deduct from
// this pool at their own rates (see Module.capabilities[i].rate). This
// matches how usage-based SaaS pricing usually works at the account
// level — Vercel, OpenAI, ElevenLabs all expose a single usage figure
// even when the spend breaks down across features.
export const CREDIT_POOL = {
  // ₹5 lakh per cycle — sized to the actual agency activity the rest of
  // the prototype shows. Once AI Calling was linked to the workspace
  // outreach spend (~₹150K of voice in a typical month, on top of the
  // other products' ~₹85K), the previous ₹2L plan was visibly
  // over-utilized in the wallet widget — red for an active month. ₹5L
  // gives the demo a healthy mid-range read (~50% utilized at month
  // close) while staying believable for a busy real-estate agency
  // running 15+ outreaches a month.
  totalCredits: 500000,
  // Sum of every module's `utilized` below — derived rather than
  // hand-rolled so the hero and the modules can't drift out of sync.
  // Computed lazily after MODULES is declared (see below).
  utilized:     0,
  periodStart:  PERIOD_START,
  periodEnd:    PERIOD_END,
};

// ────────────────────────────────────────────────────────────────────────
//  Wallets
// ────────────────────────────────────────────────────────────────────────

export const MODULES: Module[] = [
  {
    // ── Contact Extraction ─────────────────────────────────────────
    // Pulls verified phone numbers and email addresses from leads —
    // the entry point before anything else. Low-cost-per-action,
    // high-volume bucket.
    id:          "contact-extraction",
    name:        "Contact Extraction",
    description: "Pull verified phone numbers and email addresses from your leads.",
    icon:        UserIcon,
    // Muted slate-blue. The wallet palette is intentionally desaturated
    // so the stacked chart sits in the same grey-tinted aesthetic as
    // the dashboard's other widgets (voice-agent perf, metric cards) —
    // hue is just enough to keep the 3 modules distinguishable.
    bg:          "#EEF2F7",
    text:        "#475569",
    border:      "#D9E0EA",
    gradient:    "linear-gradient(135deg, #EEF2F7 0%, #D9E0EA 100%)",
    chartColor:  "#7B8FA8", // muted slate-blue
    // Month-to-date utilization, derived from the same daily series the
    // chart and the table read from. Cycle target is ~₹45K at month
    // close (phone + email split ~40/60), so early in a new month this
    // will be a small fraction of that — exactly what a real wallet
    // shows in the first week of a fresh cycle.
    utilized:     monthToDateOf(generateDailySeries(1500, 750, 1)),
    capabilities: [
      {
        id:         "phone-extract",
        label:      "Phone extraction",
        icon:       Phone,
        // 2 credits/phone. 40% of the module's month-to-date spend
        // (phone extraction is the larger half by units, smaller by
        // spend share); units derive at the contracted rate so the
        // displayed phone-count agrees with the spend.
        creditsUsed: Math.round(monthToDateOf(generateDailySeries(1500, 750, 1)) * 0.4),
        unitCount:   Math.round(monthToDateOf(generateDailySeries(1500, 750, 1)) * 0.4 / 2),
        unitLabel:   "phone",
        rate:        2,
      },
      {
        id:         "email-extract",
        label:      "Email extraction",
        icon:       Mail,
        // 1.5 credits/email. 60% of the module's month-to-date spend.
        creditsUsed: Math.round(monthToDateOf(generateDailySeries(1500, 750, 1)) * 0.6),
        unitCount:   Math.round(monthToDateOf(generateDailySeries(1500, 750, 1)) * 0.6 / 1.5),
        unitLabel:   "email",
        rate:        1.5,
      },
    ],
    periodStart:  PERIOD_START,
    periodEnd:    PERIOD_END,
    daily:        generateDailySeries(1500, 750, 1),
  },
  {
    // ── Enrichment ─────────────────────────────────────────────────
    // Premium profile + financial signals per lead. Higher cost per
    // lookup, smaller pool — this is what turns a "name + email" into
    // "qualified or not".
    id:          "enrichment",
    name:        "Enrichment",
    description: "Professional and financial data lookups per lead.",
    icon:        Database,
    // Muted warm taupe — sits between the slate and sage hues so the
    // three modules read as a quiet family of greys with just enough
    // chroma to tell apart in the stacked chart.
    bg:          "#F6F2EE",
    text:        "#78604C",
    border:      "#E8DFD2",
    gradient:    "linear-gradient(135deg, #F6F2EE 0%, #E8DFD2 100%)",
    chartColor:  "#B59B82", // muted warm taupe
    // Month-to-date utilization. Cycle target ~₹40K split 55/45 between
    // professional and financial; early-month values scale down naturally.
    utilized:     monthToDateOf(generateDailySeries(1300, 650, 4)),
    // Vendor-imposed throttle. The enrichment provider honours 6K record
    // lookups per day — surfaced here so users hit a clear daily ceiling
    // instead of a confusing API error.
    dailyLimit:  { count: 6000, unit: "record", used: 2400 },
    capabilities: [
      {
        id:         "profile",
        // Renamed from "Professional" → "Professional enrichment"
        // so the label is self-contained in any UI surface (the
        // "...enrichment" suffix used to come from concatenating
        // label + unitLabel, but unitLabel is now "enrichment"
        // too and we no longer want "lookup" anywhere).
        label:      "Professional enrichment",
        icon:       UserIcon,
        // 5 credits/lookup. 55% of the module's month-to-date spend.
        creditsUsed: Math.round(monthToDateOf(generateDailySeries(1300, 650, 4)) * 0.55),
        unitCount:   Math.round(monthToDateOf(generateDailySeries(1300, 650, 4)) * 0.55 / 5),
        unitLabel:   "enrichment",
        rate:        5,
      },
      {
        id:         "financial",
        label:      "Financial enrichment",
        icon:       BadgeDollarSign,
        // 8 credits/lookup. 45% of the module's month-to-date spend.
        creditsUsed: Math.round(monthToDateOf(generateDailySeries(1300, 650, 4)) * 0.45),
        unitCount:   Math.round(monthToDateOf(generateDailySeries(1300, 650, 4)) * 0.45 / 8),
        unitLabel:   "enrichment",
        rate:        8,
      },
    ],
    periodStart:  PERIOD_START,
    periodEnd:    PERIOD_END,
    daily:        generateDailySeries(1300, 650, 4),
  },
  {
    // ── AI Calling ─────────────────────────────────────────────────
    // Outbound voice minutes across all agents. Concurrency is part
    // of plan capacity, not metered spend.
    id:          "ai-calling",
    name:        "AI Calling",
    description: "Outbound voice minutes across all your agents.",
    icon:        Phone,
    // Muted sage — completes the cool / warm / cool-green trio at the
    // same low saturation. Keeps the chart legible without competing
    // with the rest of the page's mostly-greyscale chrome.
    bg:          "#EFF3F0",
    text:        "#4F6B5C",
    border:      "#DAE3DD",
    gradient:    "linear-gradient(135deg, #EFF3F0 0%, #DAE3DD 100%)",
    chartColor:  "#8AA395", // muted sage
    // Wallet AI Calling lifetime/cycle totals derive from the workspace
    // outreach spend — same activity, single source of truth. Sum is
    // calendar-month-to-date (not rolling 30 days), matching the real
    // billing cycle so the sidebar wallet widget and the in-page hero
    // tell a healthy "X used of plan so far this cycle" story instead
    // of accidentally tipping past 100% by counting the previous month.
    utilized:     monthToDateVoiceSpend(),
    capabilities: [
      {
        id:         "talktime",
        label:      "Talk time",
        icon:       PhoneCall,
        // ₹4 per minute. Credits = month-to-date voice spend (linked to
        // outreach). Units derive at the contracted rate so the per-
        // minute count agrees with the spend column.
        creditsUsed: monthToDateVoiceSpend(),
        unitCount:   Math.round(monthToDateVoiceSpend() / 4),
        unitLabel:   "min",
        rate:        4,
      },
      {
        id:         "concurrency",
        label:      "Concurrency",
        icon:       ChevronsLeftRight,
        creditsUsed: 0,
        unitCount:   0,
        unitLabel:   "",
        rate:        0,
        included:    true,
        includedNote: "10 parallel calls",
      },
    ],
    periodStart:  PERIOD_START,
    periodEnd:    PERIOD_END,
    // Same source of truth as the outreach pages — each day's wallet
    // consumption equals that day's workspace outreach spend.
    daily:        workspaceVoiceDaily(),
  },
];

// Back-compat — older imports reach for `WALLETS`. New code should
// import `MODULES`. Same array under the hood.
export const WALLETS = MODULES;

// Reconcile CREDIT_POOL.utilized = sum of module spends. Done after
// MODULES is declared so the source of truth is the per-module rows.
CREDIT_POOL.utilized = MODULES.reduce((sum, m) => sum + m.utilized, 0);

// ────────────────────────────────────────────────────────────────────────
//  Derived helpers
// ────────────────────────────────────────────────────────────────────────

// Pool-level summary — drives the wallet page hero and the sidebar
// widget's headline figures. Both surfaces show the same numbers so
// they never disagree.
export function poolSummary(): {
  totalCredits: number;
  utilized:     number;
  remaining:    number;
  pctUsed:      number;
} {
  const totalCredits = CREDIT_POOL.totalCredits;
  const utilized     = CREDIT_POOL.utilized;
  const remaining    = Math.max(0, totalCredits - utilized);
  const pctUsed      = totalCredits > 0
    ? Math.min(100, (utilized / totalCredits) * 100)
    : 0;
  return { totalCredits, utilized, remaining, pctUsed };
}

// Back-compat alias — older callers used totalAcrossWallets().
export function totalAcrossWallets(): {
  totalCredits: number;
  utilized:     number;
  remaining:    number;
} {
  const { totalCredits, utilized, remaining } = poolSummary();
  return { totalCredits, utilized, remaining };
}

// Per-module utilization for an arbitrary window. Powers the page's
// "utilized in last N days" stat and the module split bar when the
// user filters to a window narrower than the full period.
// `color` is the bright `chartColor` — meant for bars and dots.
export function moduleSplitInRange(days: number): {
  id:           string;
  name:         string;
  color:        string;
  bg:           string;
  utilized:     number;
  pctOfUtilized: number;
}[] {
  const perModule = MODULES.map((m) => ({
    id:    m.id,
    name:  m.name,
    color: m.chartColor,
    bg:    m.bg,
    utilized: sliceDailyToRange(m.daily, days).reduce((s, d) => s + d.amount, 0),
  }));
  const total = perModule.reduce((s, m) => s + m.utilized, 0);
  return perModule.map((m) => ({
    ...m,
    pctOfUtilized: total > 0 ? (m.utilized / total) * 100 : 0,
  }));
}

// Total credits utilized across modules within a window.
// `offsetFromEnd` slides the window back from "today" — pass 0 (default)
// for "last N days", or N>0 to look at a window that ended N days ago
// (used by the billing month selector — e.g. "May 2026" passes the days
// in May as `days` and the days back from today to end-of-May as
// `offsetFromEnd`).
//
// `moduleIds` optionally restricts the sum to a subset — drives the
// "module mix" demo so a customer on, say, voice-only sees totals that
// don't include extraction or enrichment they never bought.
export function utilizedInRange(
  days: number,
  offsetFromEnd: number = 0,
  moduleIds?: readonly string[],
): number {
  const list = moduleIds ? MODULES.filter((m) => moduleIds.includes(m.id)) : MODULES;
  return list.reduce(
    (sum, m) =>
      sum + sliceDailyToRange(m.daily, days, offsetFromEnd).reduce((s, d) => s + d.amount, 0),
    0
  );
}

// ─── Current-cycle wallet (single source of truth) ─────────────────────
//
// Both the Billing hero and the sidebar widget call this so they can
// never disagree. Inputs are the demo state knobs (plan type, carry-
// forward, enabled modules) and the cycle's day count + offset; the
// function returns a fully-derived wallet snapshot for that cycle.
//
// The math mirrors the billing hero exactly:
//   planBaseline    = subscription? totalCredits : 0
//   topupBalance    = subscription? 20% of totalCredits : totalCredits
//   carriedForward  = carryForward enabled? 7.5% of totalCredits : 0
//   totalAvailable  = planBaseline + topupBalance + carriedForward
//   used            = min(utilizedInRange(...), totalAvailable)
//   remaining       = max(0, totalAvailable - used)
//
// `used` is clamped at `totalAvailable` so the impossible state
// "used > available" never reaches the UI — for a prepaid wallet
// you can't spend more than the cap; once you hit it, new actions
// block and the displayed total ceiling is what's actually true.
export function currentCycleWallet(opts: {
  planType:        "subscription" | "pure";
  carryForward:    "enabled" | "disabled";
  cycleDays:       number;
  cycleOffsetFromEnd?: number;
  enabledModuleIds?: readonly string[];
}): {
  used:           number;
  totalAvailable: number;
  remaining:      number;
  pctUsed:        number;
  planBaseline:   number;
  topupBalance:   number;
  carriedForward: number;
} {
  const { planType, carryForward, cycleDays, cycleOffsetFromEnd = 0, enabledModuleIds } = opts;
  const { totalCredits } = poolSummary();
  const planBaseline   = planType === "subscription" ? totalCredits : 0;
  const topupBalance   = planType === "subscription"
    ? Math.round(totalCredits * 0.2)
    : totalCredits;
  const carriedForward = carryForward === "enabled"
    ? Math.round(totalCredits * 0.075)
    : 0;
  const totalAvailable = planBaseline + topupBalance + carriedForward;
  const rawUsed        = utilizedInRange(cycleDays, cycleOffsetFromEnd, enabledModuleIds);
  const used           = Math.min(rawUsed, totalAvailable);
  const remaining      = Math.max(0, totalAvailable - used);
  const pctUsed        = totalAvailable > 0
    ? Math.max(0, Math.min(100, (used / totalAvailable) * 100))
    : 0;
  return { used, totalAvailable, remaining, pctUsed, planBaseline, topupBalance, carriedForward };
}

// ─── Billing month options ──────────────────────────────────────────────
//
// Billing is anchored to calendar months — that's how invoices are cut.
// Each option converts to a (days, offsetFromEnd) window that the rest
// of the wallet helpers already understand, so the table / chart math
// doesn't need a parallel code path.
//
// Today's date drives the windowing. For "This month" we look at
// 1st-to-today; for past months the window covers the full month and
// `offsetFromEnd` slides it back from today.

export interface BillingMonth {
  /** Stable identifier — e.g. "2026-05". */
  id: string;
  /** UI label — "This month", "Last month", or "Apr 2026". */
  label: string;
  /** Secondary label, e.g. "1 – 6 Jun" or "1 – 31 May" — shown under the primary. */
  range: string;
  /** Length of the window in days. */
  days: number;
  /** Days back from today where the window ends. 0 for current month. */
  offsetFromEnd: number;
}

// Build a BillingMonth (really: billing *cycle*) anchored to the
// (year, monthIdx, cycleStartDay) tuple. The cycle starts on
// `cycleStartDay` of (year, monthIdx) and runs up to the day before
// `cycleStartDay` of the following month. When cycleStartDay = 1 the
// cycle exactly matches the calendar month and the labels read the
// classic way; when cycleStartDay > 1 the labels read as a span
// ("13 Jun – 13 Jul 2026") because the cycle crosses a month boundary.
export function billingMonthFor(
  year: number,
  monthIdx: number,
  cycleStartDay: number = 1,
): BillingMonth {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cycleStart = new Date(year, monthIdx, cycleStartDay);
  // End is the day BEFORE the next cycle starts. For cycleStartDay = 1
  // that's the last day of the month; for cycleStartDay = 13 that's
  // the 12th of the next month.
  const cycleEndPlusOne = new Date(year, monthIdx + 1, cycleStartDay);
  const cycleEnd = new Date(cycleEndPlusOne);
  cycleEnd.setDate(cycleEnd.getDate() - 1);
  cycleEnd.setHours(0, 0, 0, 0);

  const startMonthName = cycleStart.toLocaleDateString("en-IN", { month: "short" });
  const endMonthName   = cycleEnd.toLocaleDateString("en-IN",   { month: "short" });
  const isWholeMonth   = cycleStartDay === 1;

  // Which cycle this falls relative to "today" — drives This/Last
  // labels and the days/offsetFromEnd math. We compare today against
  // the cycle window directly so the labels stay correct when the
  // cycle crosses a month boundary.
  const isCurrent = today.getTime() >= cycleStart.getTime() && today.getTime() <= cycleEnd.getTime();
  const isLast    = !isCurrent && today.getTime() > cycleEnd.getTime() && (
    // "Last cycle" = the cycle that ended in the same month as the
    // current cycle's start, OR the immediately preceding cycle.
    () => {
      const nextCycleStart = new Date(year, monthIdx + 1, cycleStartDay);
      const nextCycleEnd   = new Date(year, monthIdx + 2, cycleStartDay);
      nextCycleEnd.setDate(nextCycleEnd.getDate() - 1);
      nextCycleEnd.setHours(0, 0, 0, 0);
      return today.getTime() >= nextCycleStart.getTime() && today.getTime() <= nextCycleEnd.getTime();
    }
  )();

  const label = isCurrent
    ? (isWholeMonth ? "This month" : "This cycle")
    : isLast
    ? (isWholeMonth ? "Last month" : "Last cycle")
    : isWholeMonth
    ? `${startMonthName} ${cycleStart.getFullYear()}`
    : `${cycleStartDay} ${startMonthName} – ${cycleStartDay} ${endMonthName} ${cycleEnd.getFullYear()}`;

  // For an in-progress current cycle, the window ends today and spans
  // days-elapsed; for a closed past cycle, it spans the full cycle.
  const totalCycleDays = Math.round(
    (cycleEndPlusOne.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const elapsedThisCycle = Math.max(
    1,
    Math.round((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const days = isCurrent ? Math.min(totalCycleDays, elapsedThisCycle) : totalCycleDays;
  const offsetFromEnd = isCurrent
    ? 0
    : Math.round((today.getTime() - cycleEnd.getTime()) / (1000 * 60 * 60 * 24));

  const range = isWholeMonth
    ? `1 – ${isCurrent ? today.getDate() : totalCycleDays} ${startMonthName}`
    : `${cycleStartDay} ${startMonthName} – ${cycleStartDay} ${endMonthName}`;

  return {
    id: `${cycleStart.getFullYear()}-${String(cycleStart.getMonth() + 1).padStart(2, "0")}`,
    label,
    range,
    days,
    offsetFromEnd,
  };
}

// Returns the most recent `count` billing cycles, newest first.
// Index 0 is always the current cycle ("This month" / "This cycle");
// index 1 is the immediately preceding cycle.
export function billingMonthOptions(
  count: number = 6,
  cycleStartDay: number = 1,
): BillingMonth[] {
  const now = new Date();
  // Find the month that the CURRENT cycle starts in. With
  // cycleStartDay = 1 that's just this month; with cycleStartDay > 1
  // we're either still inside last month's cycle (today.day <
  // cycleStartDay) or we've crossed into this month's cycle.
  const currentCycleStartMonthOffset = now.getDate() >= cycleStartDay ? 0 : -1;
  const out: BillingMonth[] = [];
  for (let i = 0; i < count; i++) {
    const cycleStartMonth = new Date(
      now.getFullYear(),
      now.getMonth() + currentCycleStartMonthOffset - i,
      1,
    );
    out.push(billingMonthFor(
      cycleStartMonth.getFullYear(),
      cycleStartMonth.getMonth(),
      cycleStartDay,
    ));
  }
  return out;
}


// Module split — each module's spend as a share of the pool's utilized
// portion. Drives the stacked utilization bar in the hero.
export function moduleSplit(): {
  id:           string;
  name:         string;
  color:        string;
  bg:           string;
  utilized:     number;
  pctOfUtilized: number;
  pctOfPool:    number;
}[] {
  const { utilized: total, totalCredits } = poolSummary();
  return MODULES.map((m) => ({
    id:    m.id,
    name:  m.name,
    color: m.chartColor,
    bg:    m.bg,
    utilized: m.utilized,
    pctOfUtilized: total > 0 ? (m.utilized / total) * 100 : 0,
    pctOfPool:     totalCredits > 0 ? (m.utilized / totalCredits) * 100 : 0,
  }));
}

// Days elapsed and remaining in the active billing cycle. When called
// with no arg, falls back to the module-load defaults (cycleStartDay
// = 1, i.e. classic calendar month). Pass the workspace's actual
// cycle start day to get the period-aware window.
export function periodProgress(cycleStartDay?: number): {
  start:        Date;
  end:          Date;
  daysElapsed:  number;
  daysTotal:    number;
  daysLeft:     number;
  pctElapsed:   number;
} {
  const { start: s, end: e } = cycleStartDay !== undefined
    ? currentPeriod(cycleStartDay)
    : { start: PERIOD_START, end: PERIOD_END };
  const start = new Date(s);
  const end   = new Date(e);
  const now   = new Date();
  const MS    = 24 * 60 * 60 * 1000;
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / MS));
  const elapsed = Math.min(
    total,
    Math.max(0, Math.round((now.getTime() - start.getTime()) / MS))
  );
  const left = Math.max(0, total - elapsed);
  return {
    start,
    end,
    daysElapsed: elapsed,
    daysTotal:   total,
    daysLeft:    left,
    pctElapsed:  total > 0 ? (elapsed / total) * 100 : 0,
  };
}

// Limit the daily series to a window — used by the time-period chart
// on the wallet page.
//
// - `days`: how many days the window spans
// - `offsetFromEnd`: how many days back from today the window *ends*.
//   Zero (default) gives "last N days". A positive value shifts the
//   window back, so e.g. `sliceDailyToRange(daily, 31, 7)` returns the
//   31-day window that ended 7 days ago — handy for "last month" when
//   we're a week into the new month.
export function sliceDailyToRange(
  daily: { date: string; amount: number }[],
  days:  number,
  offsetFromEnd: number = 0,
): { date: string; amount: number }[] {
  if (offsetFromEnd <= 0) return daily.slice(-days);
  const end = daily.length - offsetFromEnd;
  if (end <= 0) return [];
  return daily.slice(Math.max(0, end - days), end);
}

// Compute the per-wallet spend in the active period from the daily
// series — used by the time-period summary at the bottom of the page.
export function totalInRange(
  daily: { date: string; amount: number }[],
  days:  number,
  offsetFromEnd: number = 0,
): number {
  return sliceDailyToRange(daily, days, offsetFromEnd).reduce((s, d) => s + d.amount, 0);
}

// ─── Invoice line items ────────────────────────────────────────────────
//
// Resolves per-capability spend for a given calendar month so an invoice
// PDF can list real numbers (units × rate = amount), not a placeholder.
// Same windowing logic as UtilizationByProductTable on screen — we slice
// each module's daily series to the month's (days, offsetFromEnd), then
// scale the stored `unitCount` by the spend ratio so capability counts
// move with the month. That way the downloadable invoice matches what
// the user sees in the Modules table for the same month: no drift
// between what we display and what we put on the invoice.

export interface InvoiceCapability {
  id:        string;
  name:      string;
  unitCount: number;
  unitLabel: string;
  rate:      number;
  amount:    number;
}

export interface InvoiceModuleSection {
  id:           string;
  name:         string;
  capabilities: InvoiceCapability[];
  subtotal:     number;
}

export interface InvoiceUsageBreakdown {
  sections: InvoiceModuleSection[];
  total:    number;
}

export function invoiceLineItemsFor(
  month: BillingMonth,
  moduleIds?: readonly string[],
): InvoiceUsageBreakdown {
  const sections: InvoiceModuleSection[] = [];
  const list = moduleIds ? MODULES.filter((m) => moduleIds.includes(m.id)) : MODULES;
  let total = 0;
  for (const m of list) {
    const used = sliceDailyToRange(m.daily, month.days, month.offsetFromEnd)
      .reduce((s, d) => s + d.amount, 0);
    const ratio = m.utilized > 0 ? used / m.utilized : 0;
    const capabilities: InvoiceCapability[] = m.capabilities
      // Skip `included` rows (capacity-only, e.g. concurrent calls)
      // and zero-rate rows — they don't translate to billable lines.
      .filter((c) => !c.included && c.rate > 0)
      .map((c) => {
        const capUnits = Math.round(c.unitCount * ratio);
        const amount   = Math.round(capUnits * c.rate);
        return {
          id:        c.id,
          name:      c.label,
          unitCount: capUnits,
          unitLabel: c.unitLabel,
          rate:      c.rate,
          amount,
        };
      });
    const subtotal = capabilities.reduce((s, c) => s + c.amount, 0);
    sections.push({ id: m.id, name: m.name, capabilities, subtotal });
    total += subtotal;
  }
  return { sections, total };
}

// Re-export icon for the page module — saves the page importing both
// the wallet data and a separate icon for the "Building" header
// illustration on the empty state.
export { Building };
