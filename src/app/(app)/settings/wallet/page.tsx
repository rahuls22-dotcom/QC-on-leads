"use client";

/**
 * Wallet / Credit Management
 *
 * Inspired by ElevenLabs' subscription page: one place where the user
 * sees what they have, what they've used, and where it went. Three
 * pieces:
 *
 *   1. Period header — current month + a thin "days elapsed" bar, plus
 *      a combined total (₹ remaining across all wallets) so the user
 *      starts with the big picture.
 *   2. Wallet grid — one card per wallet (Enrichment, Voice, WhatsApp).
 *      Each card shows present / utilized / capability breakdown.
 *      The grouping matches how spend actually accrues — by meter
 *      under a wallet — which is also how the eventual data layer
 *      groups usage_event rows.
 *   3. Utilization over time — date-range selector (7d / 30d / 90d)
 *      and a stacked daily bar chart so the user can see spike days
 *      and which wallet drove them.
 */

import { useMemo, useState, useEffect } from "react";
import {
  WALLETS,
  poolSummary,
  utilizedInRange,
  periodProgress,
  sliceDailyToRange,
  CURRENCIES,
  formatMoney,
} from "@/lib/credits-data";
import type { Currency } from "@/lib/credits-data";
import { useCurrencyStore } from "@/lib/currency-store";
import { useBillingModeStore, type BillingMode, type WalletBalanceState, isBalanceBlocking } from "@/lib/billing-mode-store";
import { LowBalanceModal } from "@/components/wallet/low-balance-modal";
import { WalletCard } from "@/components/wallet/wallet-card";
import { TopUpEstimatorModal } from "@/components/wallet/top-up-estimator-modal";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { Plus, Receipt, TrendingUp, Calendar, ArrowDown, Timer, BarChart3, AlertTriangle, Send } from "lucide-react";

// The shared DateRangeSelector emits a preset string ("7", "30",
// "thismonth", "lifetime", etc.). Our daily series is keyed by N-day
// windows, so we collapse the preset down to a day count. Mapping is
// intentionally permissive — pages that need exact start/end can read
// the dates off the preset themselves later.
function presetToDays(preset: string): number {
  switch (preset) {
    case "today":      return 1;
    case "yesterday":  return 1;
    case "2d":         return 2;
    case "thisweek":   return 7;
    case "lastweek":   return 7;
    case "7":          return 7;
    case "14":         return 14;
    case "thismonth":  return 30;
    case "lastmonth":  return 30;
    case "30":         return 30;
    case "lifetime":   return 90;
    default:           return 30;
  }
}

// Indian comma-grouping number format — used everywhere a raw
// ₹ amount needs the en-IN grouping ("1,00,000" not "100,000").
function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}

// Round a raw maximum up to a "nice" round number so the Y-axis
// labels read as clean tick values (e.g. 187 → 200, 1,432 → 1.5K)
// rather than the literal max which would force ugly tick labels.
// Standard 1/2/2.5/5/10 ladder used by most charting libraries.
function niceMax(n: number): number {
  if (n <= 0) return 1;
  const exp        = Math.floor(Math.log10(n));
  const base       = Math.pow(10, exp);
  const mantissa   = n / base;
  const niceMant   =
      mantissa <= 1   ? 1
    : mantissa <= 2   ? 2
    : mantissa <= 2.5 ? 2.5
    : mantissa <= 5   ? 5
    :                   10;
  return niceMant * base;
}

// Short Indian-grouped form used on Y-axis tick labels — the same
// "1.5K"/"2L" scheme that the wallet hero uses, but always plain
// numbers (no "credits" suffix). The chart prefixes "₹" itself.
function formatYTick(n: number): string {
  if (n === 0) return "0";
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString("en-IN");
}

// Derive per-capability fill + stroke colours for the stacked chart
// layers. We don't store per-capability colours in the data layer —
// each product has a single `chartColor`, and we want each layer
// inside a product to share that identity. This helper picks a fill
// opacity (denser for the bottom layer, lighter for the top) so the
// stack still reads as one product but the layer boundaries are
// distinguishable. Strokes pick up the same colour at higher
// opacity so the boundary between layers is visible against the
// fill.
function capLayerColor(baseHex: string, capIdx: number): { fill: string; stroke: string } {
  // Bottom layer is the most saturated, layers above fade. Past
  // three capabilities we cycle back — products don't currently
  // have more than three capabilities so this is a safety net, not
  // a real path.
  const fillOpacities   = [0.55, 0.30, 0.18];
  const strokeOpacities = [1.00, 0.65, 0.45];
  const fO = fillOpacities[capIdx % fillOpacities.length];
  const sO = strokeOpacities[capIdx % strokeOpacities.length];
  // SVG colour with alpha — using rgba would force us to parse the
  // hex; using the colour with a hex alpha byte avoids that. We round
  // opacity to a 0–255 byte.
  const alpha = (op: number) => {
    const byte = Math.round(op * 255);
    return byte.toString(16).padStart(2, "0").toUpperCase();
  };
  return {
    fill:   `${baseHex}${alpha(fO)}`,
    stroke: `${baseHex}${alpha(sO)}`,
  };
}

// ── Currency-aware formatters ────────────────────────────────────────
// Every number on the wallet runs through one of these so that flipping
// the currency switch genuinely changes the whole page. Credits stay
// the underlying accounting unit — these just convert at render time
// using the per-credit rate from CURRENCIES.
//
// formatAmount       → headline numbers in the hero + table cells
// formatAmountShort  → compact form (K/L/M) for tight chrome
// unitLabel          → the right caption for stand-alone labels
//                      ("credits" vs "INR" vs "USD")
function formatAmount(credits: number, currency: Currency): string {
  const { symbol, perCredit, position } = CURRENCIES[currency];
  const amount = credits * perCredit;
  let display: string;
  if (amount < 1)        display = amount.toFixed(3);
  else if (amount < 100) display = amount.toFixed(2);
  else                   display = Math.round(amount).toLocaleString("en-IN");
  return position === "prefix" ? `${symbol}${display}` : `${display}${symbol}`;
}

function formatAmountShort(credits: number, currency: Currency): string {
  const { symbol, perCredit, position } = CURRENCIES[currency];
  const amount = credits * perCredit;
  let display: string;
  if (amount >= 1_00_00_000) display = `${(amount / 1_00_00_000).toFixed(amount % 1_00_00_000 === 0 ? 0 : 1)}Cr`;
  else if (amount >= 100000) display = `${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  else if (amount >= 1000)   display = `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  else if (amount < 1)       display = amount.toFixed(2);
  else                       display = Math.round(amount).toLocaleString("en-IN");
  return position === "prefix" ? `${symbol}${display}` : `${display}${symbol}`;
}

// ────────────────────────────────────────────────────────────────────
//  Dynamic chart bucketing
//
//  Picks the time unit that makes the chart most readable for the
//  selected range. The rule of thumb: aim for 12–40 bars. Fewer and
//  the chart feels sparse; more and individual bars become unreadable
//  pixel strips. Buckets derive from the existing daily series, so
//  changing the range never refetches — it just regroups.
// ────────────────────────────────────────────────────────────────────

interface ChartBucket {
  /** ISO-ish key used by React for stable keys. */
  key:       string;
  /** Short human label shown on hover (e.g. "10 May", "Week of 5 May", "2pm"). */
  label:     string;
  /** Per-wallet amounts inside this bucket, indexed same as WALLETS order. */
  perWallet: number[];
  /** Sum of perWallet — used for max-scale + tooltip. */
  total:     number;
}

interface ChartData {
  buckets:     ChartBucket[];
  /** First/middle/last bucket labels for the X-axis ticks. */
  ticks:       [string, string, string];
  /** Per-wallet totals across the whole range — drives the pills. */
  walletTotals: number[];
  grandTotal:  number;
  maxBucket:   number;
  /** Human-readable unit name for the caption ("hour", "day", "week"). */
  unit:        "hour" | "day" | "week";
}

function buildChartBuckets(rangeDays: number): ChartData {
  const seriesPerWallet = WALLETS.map((w) => sliceDailyToRange(w.daily, rangeDays));
  const dailyDates       = seriesPerWallet[0].map((d) => d.date);

  // Choose unit based on range. The thresholds keep the bar count
  // in a readable zone:
  //   1 day            → 24 hours
  //   2–60 days        → daily
  //   61+ days         → weekly
  let unit: "hour" | "day" | "week" =
      rangeDays <= 1  ? "hour"
    : rangeDays <= 60 ? "day"
    :                   "week";

  let buckets: ChartBucket[] = [];

  if (unit === "hour") {
    // Hourly view — take the last day's total and spread it across
    // 24 hours using a typical workday curve (low overnight, peaks
    // late morning + mid-afternoon). Deterministic per wallet so the
    // chart doesn't flicker between renders.
    const lastIdx = dailyDates.length - 1;
    const dayLabel = new Date(dailyDates[lastIdx]).toLocaleString("en-IN", {
      day: "numeric", month: "short",
    });
    const hourlyShape = (h: number) => {
      // Bell-ish curve centered around 11am + 4pm. Returns a weight
      // we'll normalise; not credits directly.
      const a = Math.exp(-Math.pow((h - 11) / 3.5, 2));
      const b = Math.exp(-Math.pow((h - 16) / 4.0, 2));
      const base = 0.05; // small overnight floor
      return base + 0.55 * a + 0.4 * b;
    };
    const weights = Array.from({ length: 24 }, (_, h) => hourlyShape(h));
    const weightSum = weights.reduce((s, w) => s + w, 0);

    for (let h = 0; h < 24; h++) {
      const share = weights[h] / weightSum;
      const perWallet = seriesPerWallet.map((s) =>
        Math.round((s[lastIdx]?.amount ?? 0) * share)
      );
      const total = perWallet.reduce((s, n) => s + n, 0);
      const hr12 = ((h + 11) % 12) + 1;
      const ampm = h < 12 ? "am" : "pm";
      buckets.push({
        key:   `${dayLabel}-${h}`,
        label: `${dayLabel} · ${hr12}${ampm}`,
        perWallet,
        total,
      });
    }
  } else if (unit === "day") {
    // Daily view — one bucket per date.
    for (let i = 0; i < dailyDates.length; i++) {
      const perWallet = seriesPerWallet.map((s) => s[i].amount);
      const total = perWallet.reduce((s, n) => s + n, 0);
      const label = new Date(dailyDates[i]).toLocaleString("en-IN", {
        day: "numeric", month: "short",
      });
      buckets.push({ key: dailyDates[i], label, perWallet, total });
    }
  } else {
    // Weekly view — group runs of 7 consecutive days into a single
    // bucket; the last bucket may be a partial week, which is fine.
    for (let i = 0; i < dailyDates.length; i += 7) {
      const slice = dailyDates.slice(i, i + 7);
      const perWallet = seriesPerWallet.map((s) =>
        slice.reduce((sum, _, j) => sum + (s[i + j]?.amount ?? 0), 0)
      );
      const total = perWallet.reduce((s, n) => s + n, 0);
      const first = new Date(slice[0]);
      const label = `Week of ${first.toLocaleString("en-IN", { day: "numeric", month: "short" })}`;
      buckets.push({ key: slice[0], label, perWallet, total });
    }
  }

  const walletTotals = WALLETS.map((_, i) =>
    buckets.reduce((s, b) => s + b.perWallet[i], 0)
  );
  const grandTotal = walletTotals.reduce((s, n) => s + n, 0);
  const maxBucket  = Math.max(1, ...buckets.map((b) => b.total));

  // First / middle / last labels for X-axis ticks. Falls back gracefully
  // when there are fewer than 3 buckets.
  const ticks: [string, string, string] = [
    buckets[0]?.label ?? "",
    buckets[Math.floor(buckets.length / 2)]?.label ?? "",
    buckets[buckets.length - 1]?.label ?? "",
  ];

  return { buckets, ticks, walletTotals, grandTotal, maxBucket, unit };
}

// Direct default export — the Suspense wrapper used to exist because
// the wallet read ?topup=1 from useSearchParams to auto-open the
// estimator modal. That deep-link is gone (it was hijacking the
// dashboard), so there's nothing here that needs a Suspense
// boundary anymore. Adding credits is now strictly user-initiated.
// Three routes mount the same component with different views:
//   /settings/utilization → view = "utilization" (balance + per-product
//     consumption + utilization-over-time charts)
//   /settings/billing     → view = "billing"     (billing-mode, money
//     hero, products spend table, invoices)
//   /settings/wallet      → view = "wallet"      (legacy URL — kept
//     alive for back-compat; renders the same as "utilization")
//
// Splitting at the section level keeps the pages distinct without
// forking the underlying data hooks.
export type WalletPageView = "utilization" | "billing" | "wallet";

export default function WalletSettingsPage({ view = "utilization" }: { view?: WalletPageView } = {}) {
  // Treat the legacy "wallet" view as a synonym for "utilization" so
  // the rest of the file only has to branch on two cases.
  const v: "utilization" | "billing" = view === "billing" ? "billing" : "utilization";
  // Single credit pool — drives the hero's big remaining number.
  const pool   = useMemo(() => poolSummary(), []);
  const period = useMemo(() => periodProgress(), []);

  // Page-level date range. Drives the chart and the "utilized in
  // range" stat in the hero. The pool's remaining / total figures are
  // period-based and intentionally NOT filtered — they reflect your
  // billing cycle, not whatever window you're looking at. Stored as
  // a day count so the existing data helpers don't care which
  // DateRangeSelector preset triggered the change.
  const [range, setRange] = useState<number>(30);

  // Range-windowed total — recomputed on every range change.
  const rangeUtilized = useMemo(() => utilizedInRange(range), [range]);

  // Hydrate the currency store once on mount so the user's last
  // chosen currency (INR or USD) sticks across reloads.
  // Currency forced to INR — the wallet is now a pure cash system.
  // The store stays around so other (legacy) consumers don't break,
  // but this page reads "INR" everywhere directly.
  const currency: Currency = "INR";

  // Billing mode picks which Billing layout renders below: prepaid
  // (top-up + balance) or postpaid (cycle-end bill). Both share the
  // Usage block above. We also pull the balance state — only prepaid
  // uses it, but it drives the empty/expired hero takeover and the
  // low-balance modal that blocks any new product action.
  const billingMode    = useBillingModeStore((s) => s.mode);
  const balanceState   = useBillingModeStore((s) => s.balance);
  const hydrateMode    = useBillingModeStore((s) => s.hydrate);
  useEffect(() => { hydrateMode(); }, [hydrateMode]);

  // Low-balance / expired modal — shown when a prepaid org tries to
  // run any new action while its wallet is blocking. The modal also
  // serves as the "send recharge request" surface that was on the
  // wallet hero card itself in earlier versions.
  const [lowBalanceOpen, setLowBalanceOpen] = useState(false);

  // Top-up estimator modal. Only opens when the user clicks the
  // "+ Add credits" button on this page. The previous behaviour of
  // auto-opening on a ?topup=1 deep-link was hijacking the wallet
  // dashboard — the user landed on /settings/wallet from the sidebar
  // and the modal popped on top of the page they actually wanted to
  // see. Adding credits is an explicit action, not a side effect of
  // navigating to the wallet.
  const [topupOpen, setTopupOpen] = useState(false);

  // (The "Utilization over time" chart used to derive its bucket
  // series from this page-level `range`, but it now owns its own
  // date filter — see <WalletUsageChart/> — so there's nothing to
  // precompute here.)

  const periodLabel = `${period.start.toLocaleString("en-IN", { day: "numeric", month: "short" })} – ${period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}`;

  return (
    <div className="pb-8 space-y-6">
      {/* ── Section header ────────────────────────────────────────────
          The DateRangeSelector lives next to "Add credits" so the
          filter is visible without taking its own row — empty space
          was making the page read as dead. Uses the same component
          that drives /dashboard, /campaigns and /outreach. */}
      {/* Header — title is route-specific so each settings option
          owns its own page identity. Wallet route stays scoped to
          balance + recharge; Billing route covers usage, spend, and
          invoices. Date filter is shared chrome — both routes use
          the same range when computing range-windowed numbers. The
          right-hand CTA only appears on the wallet route since
          adding money is a wallet action. */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {v === "utilization" ? "Utilization" : "Billing"}
          </h2>
          {/* Subtitle removed — the section title is self-explanatory
              and the supporting copy was just restating it. The page
              cards below carry the real context. */}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DateRangeSelector
            compact
            defaultPreset="30"
            onChange={(preset) => setRange(presetToDays(preset))}
          />
          {v === "utilization" && (
            <BillingPrimaryCta
              onAddMoney={() => {
                // When the wallet is blocking (empty/expired), redirect
                // the Add Money click to the recharge-request modal —
                // there's no balance left to top up against the normal
                // estimator. Otherwise open the estimator as usual.
                if (isBalanceBlocking(billingMode, balanceState)) {
                  setLowBalanceOpen(true);
                } else {
                  setTopupOpen(true);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Billing-mode switch — lives on both routes now so the user
          can flip between prepaid/postpaid to see how the page
          changes. On Utilization the switch matters because the
          balance hero only renders for prepaid; on Billing it
          drives the entire spend layout. */}
      <div className="flex items-center gap-6 flex-wrap">
        <BillingModeSwitch />
        {billingMode === "prepaid" && <BalanceStateDemoSwitch />}
      </div>

      {/* ── Utilization route: order driven by billing mode ───────────
          - Prepaid: balance hero FIRST (how much you have left), then
            the per-product breakdown (what you used it on).
          - Postpaid: skip balance hero entirely — there's no balance
            to show — and just lead with the breakdown.
          Render order matches the mental model the user reads in. */}
      {v === "utilization" && billingMode === "prepaid" && isBalanceBlocking(billingMode, balanceState) && (
        <PrepaidEmptyHero
          balance={balanceState}
          onRecharge={() => setLowBalanceOpen(true)}
        />
      )}
      {v === "utilization" && billingMode === "prepaid" && !isBalanceBlocking(billingMode, balanceState) && (
        <PrepaidBalanceHero
          rangeUtilized={rangeUtilized}
          range={range}
          pool={pool}
          period={period}
          periodLabel={periodLabel}
        />
      )}
      {v === "utilization" && <WalletUtilizationSection rangeDays={range} />}

      {/* Billing section starts here — header, spend hero, products
          table, charts, invoices. The Wallet route renders the
          balance hero only and skips this whole block. */}
      {v === "billing" && (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Receipt size={14} strokeWidth={1.6} className="text-text-tertiary" />
          <h3 className="text-[14px] font-semibold text-text-primary">Billing</h3>
          <span
            className={`text-[10.5px] font-medium uppercase tracking-[0.3px] px-1.5 py-0.5 rounded-badge ${
              billingMode === "prepaid"
                ? "bg-[#EFF6FF] text-[#1D4ED8]"
                : "bg-[#FEF3C7] text-[#92400E]"
            }`}
          >
            {billingMode === "prepaid" ? "Prepaid" : "Postpaid"}
          </span>
        </div>
        <p className="text-[12px] text-text-secondary mb-4">
          {billingMode === "prepaid"
            ? "You top up a balance; usage in the last " + range + " days draws against it."
            : "Usage accrues this cycle and gets invoiced when the cycle closes."}
        </p>
      </div>
      )}

      {/* Postpaid hero — billing-side story (no balance to manage),
          so it only renders on the Billing route. */}
      {v === "billing" && billingMode === "postpaid" && (
        <PostpaidBillingHero rangeUtilized={rangeUtilized} period={period} periodLabel={periodLabel} />
      )}

      {/* (Prepaid balance hero rendered above via <PrepaidBalanceHero/>
          so the order is balance-first, then per-product breakdown.) */}

      {/* Modules table — same chrome in both modes; just the column
          headings shift ("% of plan" in prepaid, "vs last cycle" in
          postpaid). Currency arg pinned to INR. */}
      {v === "billing" && (
        <ModulesTable rangeDays={range} totalPool={pool.totalCredits} currency="INR" billingMode={billingMode} />
      )}

      {/* ── Old wallet card grid — kept disabled in case we need to
          revert. Not rendered. */}
      {false && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WALLETS.map((w) => (
            <WalletCard key={w.id} wallet={w} rangeDays={range} />
          ))}
        </div>
      )}

      {/* ── Utilization over time ──────────────────────────────────────
          Reimagined to mirror ElevenLabs' usage chart:
          - the boxy "Total spend" tile + three module pills used to
            sit above the chart and felt like dashboard widgets in
            their own right. They're now compressed into a quiet inline
            total in the header and a legend row below the chart.
          - the canvas is bigger and shows hover tooltips on every
            bucket — the previous `title` attribute relied on browser
            tooltips which delay and feel disconnected.
          - the x-axis carries 5 evenly-spaced labels rather than just
            first/mid/last, so the user can read what time a peak hit
            without counting bars.
          - credits stay the only unit on this chart (no rupee
            conversion alongside) — money already lives at the top of
            the page, repeating it here added noise. */}
      {/* Utilization over time — single chart with three product tabs
          and its own inline date filter. Lives only on the
          Utilization page because it visualises consumption rather
          than money. */}
      {v === "utilization" && <WalletUsageChart />}

      {/* ── Activity / invoices footer ────────────────────────────────
          Lives only on the Billing route. The wallet route is the
          recharge story; invoices belong on the spend side. */}
      {v === "billing" && (
        <div className="bg-white border border-border rounded-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Receipt size={13} strokeWidth={1.6} className="text-text-tertiary" />
            <h3 className="text-[13px] font-semibold text-text-primary">Activity &amp; invoices</h3>
          </div>
          <p className="text-[12px] text-text-secondary mb-3">
            Detailed ledger view with line-item history is on the way. For now, individual wallets show their own breakdown.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-3 text-[12px] font-medium border border-border rounded-button bg-white text-text-secondary hover:bg-surface-page transition-colors"
            >
              Download invoices
            </button>
            <button
              type="button"
              className="h-8 px-3 text-[12px] font-medium border border-border rounded-button bg-white text-text-secondary hover:bg-surface-page transition-colors"
            >
              Export usage CSV
            </button>
          </div>
        </div>
      )}

      {/* Top-up estimator — mounted at the page root so the overlay
          covers the full viewport. Opened via the "Add credits" CTA
          and via the ?topup=1 deep-link from the sidebar widget. */}
      <TopUpEstimatorModal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
      />

      {/* Low-balance / expired modal — blocks new actions when a
          prepaid org has drained its wallet or its prepaid window
          has lapsed. Mounted page-level so any future action handler
          (Create outreach, Add leads, etc.) can open it with the
          same setLowBalanceOpen(true) call. */}
      <LowBalanceModal
        open={lowBalanceOpen}
        onClose={() => setLowBalanceOpen(false)}
        actionLabel="add money"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  ModulesTable — sortable, scales linearly with module count.
//  Trend column intentionally lives in the chart below — a 64px
//  sparkline can't tell a story, so we don't pretend it can.
// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
//  CurrencySwitcher — small chip next to the page title that shows
//  the current denomination and lets the user cycle through supported
//  currencies. Clicking advances to the next; the store persists the
//  choice across reloads. Chip-style so it reads as a setting, not a
//  primary action.
// ────────────────────────────────────────────────────────────────────

// Single, visible currency switch. The earlier chip read as a footnote
// ("1 credit = ₹1 INR") and didn't make it obvious that clicking it
// would change every number on the page. This is now a segmented
// toggle — the user clearly sees the two states, picks one, and every
// money number across the hero, modules table, and chart re-renders
// in the chosen currency. The per-credit rate is small and right of
// the toggle so the conversion stays visible without competing for
// attention.
// ────────────────────────────────────────────────────────────────────
//  WalletUtilizationSection — the "Utilization" half of the wallet
//  page. Currency-free by design: rows show how much *work* was done
//  in real units (phones extracted, lookups run, minutes talked), not
//  what it cost. The cost story lives in the Billing section below.
//
//  Per-capability counts come from credits-data.ts; we scale them by
//  the share of the selected range vs the full period so the numbers
//  shrink/grow when the user changes the date filter. Capabilities
//  marked `included` (plan perks like Concurrency) are filtered out
//  because they don't carry a unit count.
// ────────────────────────────────────────────────────────────────────
function WalletUtilizationSection({ rangeDays }: { rangeDays: number }) {
  // Per-product summary. Each row shows the product identity on the
  // left and a stat per capability on the right — no aggregate hero
  // number for the product. The user pointed out that "total actions
  // / total lookups / total mins" don't carry meaning across products
  // (you can't compare 2,441 actions to 526 lookups), and they hide
  // the only numbers that actually do: how many phone extractions,
  // how many email extractions, how many minutes talked.
  const moduleRows = useMemo(() => {
    return WALLETS.map((w) => {
      const rangeUtilized  = sliceDailyToRange(w.daily, rangeDays).reduce((s, d) => s + d.amount, 0);
      const periodUtilized = w.utilized;
      const ratio = periodUtilized > 0 ? rangeUtilized / periodUtilized : 0;
      const caps = w.capabilities
        .filter((c) => !c.included && c.unitCount > 0)
        .map((c) => ({
          id:        c.id,
          icon:      c.icon,
          label:     c.label,
          unitCount: Math.round(c.unitCount * ratio),
          unitLabel: c.unitLabel,
        }));
      return { module: w, caps };
    });
  }, [rangeDays]);

  return (
    <div>
      {/* Section header — title + one-line subtitle that spells out
          exactly what numbers the user is looking at. Earlier copy
          ("in real units") was jargon; this is plain English. */}
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={14} strokeWidth={1.6} className="text-text-tertiary" />
        <h3 className="text-[14px] font-semibold text-text-primary">Utilization by product</h3>
      </div>
      <p className="text-[12px] text-text-secondary mb-3">
        How much each product was used in the last {rangeDays} days. Numbers reflect successful actions only.
      </p>

      {/* One row per product. Each row is a 2-column grid:
            [ product identity ]   [ capability stats — N stat blocks ]
          The product is the row's identity; each capability is its
          own headline number inside the row. No product-level total
          — that aggregate wasn't meaningful (you can't sum phones
          and emails into a useful "actions" number). */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {moduleRows.map(({ module: m, caps }, idx) => {
          const ModIcon = m.icon;
          return (
            <div
              key={m.id}
              className={`grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-x-6 gap-y-3 px-5 py-4 items-center ${
                idx > 0 ? "border-t border-border-subtle" : ""
              }`}
            >
              {/* Column 1 — product identity. No capability count
                  caption since the capabilities are visible right
                  next to it. */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: m.chartColor }}
                />
                <div
                  className="w-8 h-8 rounded-input flex items-center justify-center shrink-0"
                  style={{ background: m.gradient }}
                >
                  <ModIcon size={14} strokeWidth={1.6} style={{ color: m.text }} />
                </div>
                <p className="text-[13px] font-medium text-text-primary truncate">
                  {m.name}
                </p>
              </div>

              {/* Column 2 — capability stats. Each capability gets
                  its own headline number (big tabular figure) with
                  the capability label as a small caption underneath.
                  This way "Phone extraction 779" and "Email extraction
                  1,662" both read as first-class stats, not as
                  footnotes to an aggregate. For AI Calling there's
                  just one capability, so a single stat fills the
                  column — still consistent chrome with the others. */}
              <div className="flex items-center gap-x-10 gap-y-4 flex-wrap">
                {caps.length === 0 ? (
                  <span className="text-text-tertiary text-[11.5px]">
                    No usage yet in this range.
                  </span>
                ) : (
                  caps.map((c) => {
                    // Talk time is the only capability where the unit
                    // ("mins") actually carries information beyond the
                    // label — minutes vs hours matters. For phone /
                    // email extraction the unit ("phone", "email") is
                    // already implied by the label, so we omit it. For
                    // enrichment we don't have a meaningful unit
                    // suffix either — the label "Professional
                    // enrichment" already says what one count means.
                    const suffix = c.unitLabel === "min"
                      ? ` ${c.unitLabel}${c.unitCount === 1 ? "" : "s"}`
                      : "";
                    return (
                      <div key={c.id} className="tabular-nums">
                        <p className="text-[22px] font-semibold text-text-primary leading-none">
                          {c.unitCount.toLocaleString("en-IN")}
                          {suffix && (
                            <span className="text-[13px] font-medium text-text-secondary ml-1">
                              {suffix.trim()}
                            </span>
                          )}
                        </p>
                        <p className="text-[10.5px] text-text-tertiary uppercase tracking-[0.4px] mt-1.5">
                          {c.label}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  WalletUsageChart — the Utilization over time block, rebuilt to
//  mirror the ElevenLabs usage view.
//
//  Earlier this section opened with three big tiles (Total spend +
//  three module summaries with mini bars) before the chart even
//  started. They drew the eye away from the actual graph and made
//  the section read like a dashboard rather than a chart. The
//  redesign:
//
//  - Compresses the per-module totals into a quiet legend row below
//    the chart (dot + name + credits + share %). It functions as
//    both a key and a summary, matching how ElevenLabs labels series.
//  - Promotes the chart canvas — taller, more breathing room.
//  - Shows a hover tooltip on every bar with the bucket label and a
//    per-module breakdown, instead of relying on browser-native
//    title attributes that lag and feel disconnected.
//  - Surfaces 5 evenly-spaced x-axis ticks instead of just first/
//    mid/last so users can read times directly off the axis.
//  - Drops the "≈ ₹X" caption next to the credit total — money
//    lives at the top of the page, repeating it here was noise.
// ────────────────────────────────────────────────────────────────────
function WalletUsageChart() {
  // Independent date filter — the chart owns its own time window so
  // the user can scope the trend without scrolling back to the page
  // header. Defaults to the same 30-day preset as the page so the
  // first view is consistent with the per-product widget above.
  const [range, setRange] = useState<number>(30);

  // Active product tab. Defaults to WALLETS[0] (Contact Extraction —
  // the topmost product in the per-product utilization widget), per
  // explicit user request that "the default will be the topmost
  // product listed at the top in the first widget".
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Bucket the daily series for the chart's local range. Reuses the
  // page-level helper so the bucketing logic stays in one place.
  const days = useMemo(() => buildChartBuckets(range), [range]);
  const activeWallet = WALLETS[activeIdx];

  // Capabilities of the active product (filtering out plan-feature
  // rows like AI Calling's "Concurrency"). These drive the stacked
  // layers in the chart so the user can see WHERE within a product
  // the spend went. E.g. Contact Extraction stacks Phone + Email,
  // Enrichment stacks Professional + Financial.
  const activeCaps = activeWallet.capabilities.filter((c) => !c.included);

  // Each capability's share of the product's total spend, derived
  // from credits_used on the static seed. We don't have separate
  // daily series per capability, so the stack apportions the
  // wallet's daily series by these shares. For real data we'd swap
  // this for true per-capability series; the visual story is the
  // same either way.
  const capShares = (() => {
    const tot = activeCaps.reduce((s, c) => s + c.creditsUsed, 0);
    if (tot === 0) return activeCaps.map(() => 0);
    return activeCaps.map((c) => c.creditsUsed / tot);
  })();

  // series[bucketIdx] = total ₹ for the active product in that bucket
  const series = days.buckets.map((b) => b.perWallet[activeIdx] ?? 0);
  const total  = days.walletTotals[activeIdx] ?? 0;

  // capSeries[capIdx][bucketIdx] = ₹ for one capability in one bucket
  const capSeries: number[][] = activeCaps.map((_, capIdx) =>
    series.map((v) => v * capShares[capIdx])
  );

  // capPerBucketTotals[capIdx] = total ₹ for one capability across
  // the whole range — used for the legend chips and the tooltip
  // totals line.
  const capTotals = capSeries.map((row) => row.reduce((s, v) => s + v, 0));

  // Pad the raw max up to a round number so the Y-axis labels can be
  // clean increments (0, 50, 100, 150, 200) instead of awkward
  // fractions of the literal peak. Trade-off: the top of the line
  // sits a touch below the top of the canvas, which is the standard
  // chart convention and reads as breathing room rather than waste.
  const max    = niceMax(Math.max(1, ...series));

  const CHART_H = 240;
  const viewW   = 100;

  // x positions are shared across all capability layers — they only
  // differ on the y axis. Pre-compute once.
  const xs = series.map((_, i) =>
    series.length > 1 ? (i / (series.length - 1)) * viewW : viewW / 2
  );

  // Stacked layer paths. layerPaths[capIdx] holds the filled polygon
  // path and the top-edge stroke path for one capability. Stacking
  // is bottom-up: layer 0 sits on the baseline, layer N sits on top
  // of the sum of layers 0..N-1.
  const layerPaths = activeCaps.map((_, capIdx) => {
    // Top edge of this layer at each bucket = sum of layers 0..capIdx
    const topVals = series.map((_, bIdx) => {
      let acc = 0;
      for (let i = 0; i <= capIdx; i++) acc += capSeries[i][bIdx];
      return acc;
    });
    // Bottom edge = sum of layers 0..capIdx-1 (or 0 for the bottom)
    const bottomVals = series.map((_, bIdx) => {
      if (capIdx === 0) return 0;
      let acc = 0;
      for (let i = 0; i < capIdx; i++) acc += capSeries[i][bIdx];
      return acc;
    });
    const toPx = (v: number) => CHART_H - (v / max) * CHART_H;
    const topPts    = xs.map((x, i) => ({ x, y: toPx(topVals[i]) }));
    const bottomPts = xs.map((x, i) => ({ x, y: toPx(bottomVals[i]) }));

    // Top edge as a path (Mx Ly Lx Ly ...). Used for the stroke
    // between layers.
    const topPath = topPts.length
      ? "M " + topPts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")
      : "";
    // Filled polygon: top edge forward, bottom edge backward, close.
    const polyPath = topPts.length
      ? topPath + " L " + bottomPts.slice().reverse()
          .map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ") + " Z"
      : "";
    return { topPath, polyPath };
  });

  // When there's only one capability (AI Calling has just Talk
  // time), the stack collapses to a single layer — but we still use
  // the layer-based rendering for consistency. The single layer
  // simply fills from baseline to the line.

  // Hit-detection still uses the total `series`; the user is
  // hovering over the whole stack, not a particular layer.
  const points = series.map((v, i) => ({
    x: xs[i],
    y: CHART_H - (v / max) * CHART_H,
    v,
    idx: i,
  }));

  const [hover, setHover] = useState<number | null>(null);

  // X-axis tick density adapts to bucket count. Earlier the chart
  // showed only 5 ticks regardless of range — for a 30-day window
  // that's a label every six days, sparse enough that the user
  // couldn't tell which date a peak sat on. The new ladder targets
  // a label every 3–4 buckets so you can read the date directly off
  // the axis without counting.
  const xTickTarget =
      days.buckets.length <= 7  ? days.buckets.length
    : days.buckets.length <= 14 ? 7
    : days.buckets.length <= 30 ? 9
    : days.buckets.length <= 60 ? 10
    :                             8;
  const xTicks = (() => {
    const n = days.buckets.length;
    if (n === 0) return [] as { idx: number; label: string }[];
    if (n <= xTickTarget) return days.buckets.map((b, idx) => ({ idx, label: b.label }));
    return Array.from({ length: xTickTarget }, (_, i) => {
      const idx = Math.round((i / (xTickTarget - 1)) * (n - 1));
      return { idx, label: days.buckets[idx].label };
    });
  })();

  // Y-axis ticks at 0%/25%/50%/75%/100% of `max`. Top of the canvas
  // is `max`, bottom is 0; we render the labels right-aligned in a
  // dedicated column so they sit exactly opposite their gridline.
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((p) => ({
    topPct: (1 - p) * 100,
    value:  max * p,
  }));

  // Friendly bucket-unit label for the subtitle ("Daily", "Weekly", "Hourly").
  const unitWord = days.unit === "hour" ? "Hourly" : days.unit === "week" ? "Weekly" : "Daily";

  return (
    <div className="bg-white border border-border rounded-card p-5">
      {/* Header — title + inline date filter. The DateRangeSelector
          lives in the widget chrome so the user can scope the trend
          right where they're reading it. */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
            <TrendingUp size={13} strokeWidth={1.6} className="text-text-tertiary" />
            Utilization over time
          </h3>
          <p className="text-[11.5px] text-text-secondary mt-0.5">
            {unitWord} spend for one product at a time. Switch products via the tabs below.
          </p>
        </div>
        <DateRangeSelector
          compact
          defaultPreset="30"
          onChange={(preset) => setRange(presetToDays(preset))}
        />
      </div>

      {/* Product tabs — three tabs (Contact Extraction · Enrichment ·
          AI Calling). The active tab is underlined in the product's
          own colour so the chart and the tab share a visual key. The
          per-tab total sits as a quiet caption so the user can size
          up products against each other before switching. */}
      <div
        className="flex items-center gap-0 border-b border-border-subtle mb-4 -mx-5 px-5 overflow-x-auto"
        role="tablist"
        aria-label="Product"
      >
        {WALLETS.map((w, i) => {
          const active = i === activeIdx;
          const tot    = days.walletTotals[i] ?? 0;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveIdx(i)}
              className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-[12.5px] transition-colors whitespace-nowrap ${
                active
                  ? "text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: w.chartColor, opacity: active ? 1 : 0.55 }}
              />
              <span>{w.name}</span>
              <span className="text-[10.5px] text-text-tertiary tabular-nums">
                ₹{formatNum(tot)}
              </span>
              {active && (
                <span
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                  style={{ background: w.chartColor }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Hero stat + capability legend. The hero ₹ anchors the chart
          with the headline number; the legend underneath maps each
          stacked colour band to its capability (Phone vs Email,
          Professional vs Financial, etc.) so the user can read the
          stack without guessing. Only renders when the product has
          more than one capability — for single-capability products
          (AI Calling → Talk time only) the legend would be noise. */}
      <div className="mb-4">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] tabular-nums">
          {activeWallet.name} · spend in last {range} days
        </p>
        <p className="text-[24px] font-semibold text-text-primary leading-none mt-1 tabular-nums">
          ₹{formatNum(total)}
        </p>
        {activeCaps.length > 1 && (
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-2.5">
            {activeCaps.map((c, capIdx) => {
              const tone = capLayerColor(activeWallet.chartColor, capIdx);
              return (
                <span key={c.id} className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ background: tone.fill }}
                  />
                  <span className="text-text-secondary">{c.label}</span>
                  <span className="text-text-tertiary">₹{formatNum(Math.round(capTotals[capIdx]))}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart — Y-axis label column on the left + canvas on the right.
          Splitting the layout into two columns means the Y labels
          align exactly with their gridlines and the canvas keeps its
          own coordinate space. */}
      <div className="flex">
        {/* Y-axis labels — right-aligned next to the canvas, one per
            gridline. Hidden from screen readers since they restate
            the chart values which are also in the tooltip. */}
        <div
          className="relative w-12 pr-2 text-right text-[10px] text-text-tertiary tabular-nums shrink-0"
          style={{ height: CHART_H }}
          aria-hidden
        >
          {yTicks.map((t, i) => {
            // Anchor the top tick at 0% offset and the bottom tick at
            // -100% so the labels don't overflow the canvas; middle
            // ticks centre on their gridline.
            const transform =
                i === 0                   ? "translateY(0)"
              : i === yTicks.length - 1   ? "translateY(-100%)"
              :                             "translateY(-50%)";
            return (
              <span
                key={i}
                className="absolute right-2 leading-none"
                style={{ top: `${t.topPct}%`, transform }}
              >
                ₹{formatYTick(t.value)}
              </span>
            );
          })}
        </div>

        {/* Canvas — gridlines layer + SVG path + HTML overlays for
            crosshair, hover dot, and tooltip. Using HTML for the
            crosshair and dot keeps them crisp regardless of how wide
            the chart stretches (the SVG uses
            preserveAspectRatio="none" so its own shapes would
            distort horizontally). */}
        <div className="relative flex-1 min-w-0" style={{ height: CHART_H }}>
          {/* Gridlines at the same heights as the Y-axis tick labels. */}
          {yTicks.map((t, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-dashed border-border-subtle"
              style={{ top: `${t.topPct}%`, opacity: i === 0 || i === yTicks.length - 1 ? 0.7 : 0.4 }}
              aria-hidden
            />
          ))}

          <svg
            viewBox={`0 0 ${viewW} ${CHART_H}`}
            preserveAspectRatio="none"
            className="block w-full h-full"
            onMouseMove={(e) => {
              const rect  = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const xPx   = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, xPx / rect.width));
              const idx   = Math.round(ratio * Math.max(0, series.length - 1));
              setHover(idx);
            }}
            onMouseLeave={() => setHover(null)}
          >
            {/* Stacked layers — bottom-up. Each layer is a filled
                polygon (capability's portion of the stack) plus its
                top edge as a stroke so the layer boundaries are
                visible. Painted from bottom to top so later layers
                visually sit on top of earlier ones. */}
            {layerPaths.map((paths, capIdx) => {
              const tone = capLayerColor(activeWallet.chartColor, capIdx);
              return (
                <g key={activeCaps[capIdx]?.id ?? capIdx}>
                  {paths.polyPath && (
                    <path d={paths.polyPath} fill={tone.fill} />
                  )}
                  {paths.topPath && (
                    <path
                      d={paths.topPath}
                      fill="none"
                      stroke={tone.stroke}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Crosshair — full-height vertical guide rendered as an
              HTML div so it stays exactly 1px wide regardless of
              chart width. */}
          {hover !== null && points[hover] && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${points[hover].x}%`,
                width: 1,
                borderLeft: `1px dashed ${activeWallet.chartColor}`,
                opacity: 0.45,
                transform: "translateX(-0.5px)",
              }}
              aria-hidden
            />
          )}

          {/* Hover dot — also HTML so it stays a perfect circle.
              Earlier this lived inside the SVG as <circle> which got
              stretched into a flat oval because the SVG viewBox
              isn't square-preserving. */}
          {hover !== null && points[hover] && (
            <div
              className="absolute pointer-events-none rounded-full bg-white"
              style={{
                left: `${points[hover].x}%`,
                top:  `${(points[hover].y / CHART_H) * 100}%`,
                width:  10,
                height: 10,
                transform: "translate(-50%, -50%)",
                border: `2px solid ${activeWallet.chartColor}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
              }}
              aria-hidden
            />
          )}

          {/* Tooltip — flips to the left of the cursor in the right
              third of the chart so it doesn't clip the edge. Shows
              the bucket label, per-capability breakdown, and a
              total row. For single-capability products the
              breakdown is collapsed because the per-cap row would
              just restate the total. */}
          {hover !== null && days.buckets[hover] && (() => {
            const b       = days.buckets[hover];
            const v       = b.perWallet[activeIdx] ?? 0;
            const leftPct = series.length > 1 ? (hover / (series.length - 1)) * 100 : 50;
            const align   = hover > series.length * 0.6 ? "right" : "left";
            return (
              <div
                className="absolute pointer-events-none z-10"
                style={{
                  left: `${leftPct}%`,
                  bottom: "100%",
                  transform: align === "left"
                    ? "translate(8px, -8px)"
                    : "translate(calc(-100% - 8px), -8px)",
                }}
              >
                <div className="bg-text-primary text-white rounded-[6px] px-3 py-2 shadow-md whitespace-nowrap min-w-[180px]">
                  <p className="text-[10.5px] font-medium opacity-80 mb-1 tabular-nums">
                    {b.label}
                  </p>
                  {activeCaps.length > 1 ? (
                    <>
                      <div className="space-y-0.5 mb-1.5">
                        {activeCaps.map((c, capIdx) => {
                          const tone = capLayerColor(activeWallet.chartColor, capIdx);
                          const capV = capSeries[capIdx][hover] ?? 0;
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 text-[11.5px] tabular-nums"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-[1px] shrink-0"
                                style={{ background: tone.fill }}
                              />
                              <span className="flex-1 truncate">{c.label}</span>
                              <span className="font-medium">₹{formatNum(Math.round(capV))}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-white/15 pt-1 flex items-center justify-between text-[11.5px] tabular-nums">
                        <span className="opacity-70">Total</span>
                        <span className="font-semibold">₹{formatNum(Math.round(v))}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] font-semibold tabular-nums">
                      ₹{formatNum(Math.round(v))}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* X-axis — denser tick set (9 labels over 30 days vs the old
          5) so the user can read the date at a glance. Indented by
          the Y-axis label column so each tick sits exactly under
          its bucket. */}
      <div className="flex mt-2">
        <div className="w-12 shrink-0" />
        <div className="relative h-4 flex-1 min-w-0">
          {xTicks.map(({ idx, label }) => {
            const pct = days.buckets.length > 1
              ? (idx / (days.buckets.length - 1)) * 100
              : 50;
            const transform =
              idx === 0
                ? "translateX(0)"
                : idx === days.buckets.length - 1
                ? "translateX(-100%)"
                : "translateX(-50%)";
            return (
              <span
                key={idx}
                className="absolute top-0 text-[10.5px] text-text-tertiary tabular-nums whitespace-nowrap"
                style={{ left: `${pct}%`, transform }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BillingModeSwitch — segmented Prepaid / Postpaid toggle that picks
//  the Billing-section variant for the whole page. Sits just under
//  the header on its own row because the choice is structural (it
//  swaps the entire bottom half), not a small chip-style setting.
// ────────────────────────────────────────────────────────────────────
function BillingModeSwitch() {
  const mode    = useBillingModeStore((s) => s.mode);
  const setMode = useBillingModeStore((s) => s.set);
  const order: BillingMode[] = ["prepaid", "postpaid"];
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
        Billing model
      </span>
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {order.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={active}
              className={`h-7 px-3 text-[12px] font-medium rounded-[6px] transition-colors capitalize ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BalanceStateDemoSwitch — lets the user step through the four
//  prepaid balance states (healthy / low / empty / expired) without
//  touching the data layer. Only renders when billing mode is
//  prepaid since balance is meaningless under postpaid. Labelled as
//  a demo control so it's clear this isn't a normal product
//  setting; in a real build the state would come from the wallet
//  service.
// ────────────────────────────────────────────────────────────────────
function BalanceStateDemoSwitch() {
  const balance    = useBillingModeStore((s) => s.balance);
  const setBalance = useBillingModeStore((s) => s.setBalance);
  const opts: { id: WalletBalanceState; label: string }[] = [
    { id: "healthy", label: "Healthy" },
    { id: "low",     label: "Low" },
    { id: "empty",   label: "Empty" },
    { id: "expired", label: "Expired" },
  ];
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
        Demo state
      </span>
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {opts.map((o) => {
          const active = balance === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setBalance(o.id)}
              aria-pressed={active}
              className={`h-7 px-2.5 text-[11.5px] font-medium rounded-[6px] transition-colors ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  PrepaidEmptyHero — takes the place of the normal balance card
//  when the prepaid wallet is empty or expired. Hard-stops the
//  spend story: big red number is the zero balance, secondary copy
//  explains what's happened, primary action is to send a recharge
//  request (same modal that any blocked action would surface).
// ────────────────────────────────────────────────────────────────────
function PrepaidEmptyHero({
  balance,
  onRecharge,
}: {
  balance: WalletBalanceState;
  onRecharge: () => void;
}) {
  const isExpired = balance === "expired";
  return (
    <div className="rounded-card border border-[#F5C7C7] bg-[#FEF7F7] p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[#FDE4E4] flex items-center justify-center shrink-0">
          <AlertTriangle size={18} strokeWidth={1.75} className="text-[#B42318]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-[#B42318] uppercase tracking-[0.4px] mb-1">
            {isExpired ? "Prepaid balance expired" : "Wallet out of balance"}
          </p>
          <p className="text-[26px] font-semibold text-text-primary leading-none tabular-nums">
            ₹0
          </p>
          <p className="text-[12.5px] text-text-secondary mt-2 max-w-[520px] leading-snug">
            {isExpired
              ? "Your prepaid window has lapsed. New product actions are paused until your org renews the balance. Send a recharge request and your account manager will share a fresh invoice."
              : "You've used up everything on this prepaid balance. New product actions — outreach, enrichment, calls — are paused until you top up. Send a recharge request and your account manager will share an invoice."}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={onRecharge}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#B42318] text-white text-[13px] font-medium rounded-button hover:bg-[#9F1F15] transition-colors"
            >
              <Send size={13} strokeWidth={1.8} />
              Send recharge request
            </button>
            <span className="text-[11.5px] text-text-tertiary">
              Account manager: <span className="text-text-secondary font-medium">Priya Nair</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  PrepaidBalanceHero — the headline card on the Utilization page for
//  prepaid orgs that still have balance left. Lifted out of the page
//  JSX so the page can render it conditionally (the order depends on
//  billing mode: balance first for prepaid, hidden entirely for
//  postpaid).
//
//  Anatomy:
//    - top row:    period chip on the left, "N days left · resets …"
//                  on the right so the user knows the window the plan
//                  applies to.
//    - hero grid:  big spend number (range-scoped) and the remaining
//                  balance + reset countdown. The spend number is the
//                  star; remaining sits as the supporting figure on
//                  the right so the user sees "what I used / what's
//                  left" in one glance.
//    - bar:        a single utilization bar at the bottom that fills
//                  in to show how much of the plan has been burned.
// ────────────────────────────────────────────────────────────────────
function PrepaidBalanceHero({
  rangeUtilized,
  range,
  pool,
  period,
  periodLabel,
}: {
  rangeUtilized: number;
  range: number;
  pool: { totalCredits: number; remaining: number };
  period: { daysLeft: number; end: Date };
  periodLabel: string;
}) {
  const planPct      = pool.totalCredits > 0 ? (rangeUtilized / pool.totalCredits) * 100 : 0;
  const remainingPct = pool.totalCredits > 0 ? (pool.remaining / pool.totalCredits) * 100 : 0;
  const usedPct      = Math.max(0, Math.min(100, 100 - remainingPct));
  // Colour the utilization bar by remaining headroom so finance can
  // see at a glance whether a top-up is imminent. Mirrors the spend-
  // cap tones on the postpaid hero for consistency.
  const barTone =
      usedPct >= 90 ? "#DC2626"
    : usedPct >= 75 ? "#D97706"
    :                 "rgba(15, 23, 42, 0.85)";

  return (
    <div className="bg-white border border-border rounded-card p-5">
      {/* Top row — period chip + days left */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={13} strokeWidth={1.6} className="text-text-tertiary" />
          <span className="text-[12px] font-medium text-text-secondary">Current period</span>
          <span className="text-[12px] text-text-primary font-medium">{periodLabel}</span>
        </div>
        <span className="text-[11px] font-medium text-text-tertiary">
          <span className="text-text-secondary">{period.daysLeft}</span> days left · resets {period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Hero numbers — range spend on the left, remaining on the
          right. Two-up grid so the user reads "spent / left" without
          scrolling. */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5 items-end mb-4">
        <div>
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            Spend in last {range} days
          </p>
          <p
            className="text-[36px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatAmount(rangeUtilized, "INR")}
          </p>
          <p className="text-[11.5px] text-text-tertiary mt-1.5 tabular-nums">
            {planPct.toFixed(1)}% of your {formatAmountShort(pool.totalCredits, "INR")} plan
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            Remaining
          </p>
          <p className="text-[20px] font-semibold text-text-primary tabular-nums">
            {formatAmount(pool.remaining, "INR")}
          </p>
          <p className="text-[11px] text-text-tertiary mt-1 tabular-nums">
            resets in {period.daysLeft} days
          </p>
        </div>
      </div>

      {/* Utilization bar — fills with the % of plan used. Colour
          escalates from grey → amber → red as the org approaches
          the ceiling. */}
      <div className="h-2.5 rounded-full bg-surface-secondary overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${usedPct.toFixed(2)}%`, background: barTone }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BillingPrimaryCta — the right-hand action button beside the date
//  filter. Label + behaviour shifts with the billing mode:
//    Prepaid  → "+ Add money" (opens the top-up estimator)
//    Postpaid → "View invoices" (postpaid customers don't top up)
// ────────────────────────────────────────────────────────────────────
function BillingPrimaryCta({ onAddMoney }: { onAddMoney: () => void }) {
  const mode = useBillingModeStore((s) => s.mode);
  if (mode === "prepaid") {
    return (
      <button
        type="button"
        onClick={onAddMoney}
        className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
      >
        <Plus size={13} strokeWidth={1.8} />
        Add money
      </button>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 h-9 px-4 border border-border text-text-primary bg-white text-[13px] font-medium rounded-button hover:bg-surface-page transition-colors"
    >
      <Receipt size={13} strokeWidth={1.6} />
      View invoices
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
//  PostpaidBillingHero — alternative to the prepaid balance card.
//  Headline is the *estimated bill* this cycle (no plan, no
//  remaining); cycle close date replaces the "resets" copy; an
//  optional org-level spend cap shows progress against a hard
//  ceiling (postpaid customers usually set one to avoid surprise
//  invoices).
// ────────────────────────────────────────────────────────────────────
function PostpaidBillingHero({
  rangeUtilized,
  period,
  periodLabel,
}: {
  rangeUtilized: number;
  period: { daysLeft: number; end: Date };
  periodLabel: string;
}) {
  // Pretend spend cap — in a real system this comes from the org's
  // billing settings. ₹50,000/month is a credible mid-market default.
  const cycleCap = 50000;
  const capPct = Math.min(100, (rangeUtilized / cycleCap) * 100);
  const capTone =
      capPct >= 90 ? "#DC2626"
    : capPct >= 75 ? "#D97706"
    : "rgba(15, 23, 42, 0.85)";

  return (
    <div className="bg-white border border-border rounded-card p-5">
      {/* Top row — cycle chip + days remaining */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={13} strokeWidth={1.6} className="text-text-tertiary" />
          <span className="text-[12px] font-medium text-text-secondary">Current cycle</span>
          <span className="text-[12px] text-text-primary font-medium">{periodLabel}</span>
        </div>
        <span className="text-[11px] font-medium text-text-tertiary">
          <span className="text-text-secondary">{period.daysLeft}</span> days left · cycle closes {period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Hero numbers — estimated bill is the headline (no plan,
          no remaining) and the spend cap progresses on the right. */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5 items-end mb-4">
        <div>
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            Estimated bill this cycle
          </p>
          <p
            className="text-[36px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatAmount(rangeUtilized, "INR")}
          </p>
          <p className="text-[11.5px] text-text-tertiary mt-1.5">
            Invoiced on {period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}. You&apos;ll be charged exactly what you use.
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            Spend cap
          </p>
          <p className="text-[20px] font-semibold text-text-primary tabular-nums">
            {formatAmount(cycleCap, "INR")}
          </p>
          <p className="text-[11px] text-text-tertiary mt-1 tabular-nums">
            {capPct.toFixed(0)}% used · auto-pause at cap
          </p>
        </div>
      </div>

      {/* Spend-cap progress bar — coloured to flag when the org is
          approaching its hard ceiling so finance can lift it ahead
          of the auto-pause kicking in. */}
      <div className="h-2.5 rounded-full bg-surface-secondary overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${capPct.toFixed(2)}%`, background: capTone }}
        />
      </div>
    </div>
  );
}

// `hideRate` lets the page render the "1 credit = X" caption on its
// own line below the title (cleaner header row), while keeping the
// rate inline in places where space allows.
const CurrencySwitcher = ({ hideRate = false }: { hideRate?: boolean }) => {
  const currency        = useCurrencyStore((s) => s.currency);
  const setCurrency     = useCurrencyStore((s) => s.set);
  const hydrate         = useCurrencyStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  const order: Currency[] = ["INR", "USD"];

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {order.map((cur) => {
          const c = CURRENCIES[cur];
          const active = currency === cur;
          return (
            <button
              key={cur}
              type="button"
              onClick={() => setCurrency(cur)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1 h-7 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span className="tabular-nums">{c.symbol}</span>
              {c.code}
            </button>
          );
        })}
      </div>
      {!hideRate && (
        // Rate caption used to read "1 credit = ₹1 INR" — the credits
        // model is gone, so there's nothing to print here. Kept as a
        // null branch to preserve the prop API without re-flowing
        // existing call sites.
        null
      )}
    </div>
  );
};

// Sub-line caption under the page title. Used to show the credits-
// to-currency conversion rate. Now that credits are gone and the
// page is pure INR, there is nothing to caption — this resolves to
// empty content so the page header keeps the same spacing without
// printing a stale rate line.
const CurrencyRateCaption = () => null;

type SortKey = "used" | "name" | "pct";

/**
 * Clickable column header. Active column gets a small ↓ arrow + the
 * primary text colour so the user can see at a glance which column
 * drives the row order. Right-alignment is supported for numeric
 * columns where the label should hug the data underneath.
 */
type SortHeaderProps = {
  label: string;
  colKey: SortKey;
  activeKey: SortKey;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
};

const SortHeader = ({
  label,
  colKey,
  activeKey,
  onSort,
  align = "left",
}: SortHeaderProps) => {
  const active = activeKey === colKey;
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className={`inline-flex items-center gap-1 select-none transition-colors ${
        active ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
      } ${align === "right" ? "justify-end ml-auto" : "justify-start"}`}
    >
      <span className="uppercase tracking-[0.4px]">{label}</span>
      <ArrowDown
        size={10}
        strokeWidth={2}
        className={`transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
        aria-hidden
      />
    </button>
  );
};

function ModulesTable({
  rangeDays,
  totalPool,
  currency,
  billingMode = "prepaid",
}: {
  rangeDays: number;
  totalPool: number;
  currency: Currency;
  // Same table chrome for both modes; only the second column heading
  // shifts: "% of plan" for prepaid (vs the top-up cap), "vs cap"
  // for postpaid (vs the cycle spend cap). The body cell shows the
  // same math under the hood for now.
  billingMode?: BillingMode;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("used");

  // One row per product, with embedded capability sub-rows that
  // always render. Earlier this table hid the capability detail
  // behind an expand chevron; the user asked for the spend story
  // to be visible at a glance, so we flatten it into a tree table
  // where products are headers and capabilities are indented rows
  // underneath them. Sort applies only to product order — capability
  // rows always stay attached to their parent product.
  const rows = useMemo(() => {
    return WALLETS.map((w) => {
      const series    = sliceDailyToRange(w.daily, rangeDays);
      const used      = series.reduce((s, d) => s + d.amount, 0);
      const pctOfPool = totalPool > 0 ? (used / totalPool) * 100 : 0;
      // Scale capability rows proportionally so the per-capability
      // numbers in the range sum to the product's range total.
      const ratio     = w.utilized > 0 ? used / w.utilized : 0;
      const caps      = w.capabilities.filter((c) => !c.included);
      return { module: w, used, pctOfPool, ratio, caps };
    }).sort((a, b) => {
      if (sortKey === "used") return b.used - a.used;
      if (sortKey === "pct")  return b.pctOfPool - a.pctOfPool;
      return a.module.name.localeCompare(b.module.name);
    });
  }, [rangeDays, totalPool, sortKey]);

  // Shared grid template for all rows + header + footer. Five
  // columns: name | units | rate | used | % of plan. Tweaking the
  // template here keeps everything aligned.
  const gridCols = "grid-cols-[minmax(0,1fr)_140px_100px_120px_80px]";

  // Total spend across all products in the range — used by the
  // footer. Kept as a separate calc so the footer can render
  // independently of the row mapping.
  const totalUsed = rows.reduce((s, r) => s + Math.round(r.used), 0);
  const totalPct  = rows.reduce((s, r) => s + r.pctOfPool, 0);

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Header — title only. Earlier this carried a "Daily limit"
          column which only applied to one product; we moved that
          information to a chip under the product name when it
          exists. */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-subtle">
        <h3 className="text-[13px] font-semibold text-text-primary">Products</h3>
      </div>

      {/* Column headers — sort applies only to product rows. */}
      <div className={`grid ${gridCols} gap-3 px-5 py-2 border-b border-border-subtle text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px]`}>
        <SortHeader
          label="Product / capability"
          colKey="name"
          activeKey={sortKey}
          onSort={setSortKey}
        />
        <div className="text-right">Units</div>
        <div className="text-right">Rate</div>
        <SortHeader
          label="Used"
          colKey="used"
          activeKey={sortKey}
          onSort={setSortKey}
          align="right"
        />
        <SortHeader
          label={billingMode === "postpaid" ? "vs cap" : "% of plan"}
          colKey="pct"
          activeKey={sortKey}
          onSort={setSortKey}
          align="right"
        />
      </div>

      {/* Rows — product header + always-visible capability sub-rows.
          The product header sits on a soft tint so the eye can group
          a product with its children when scanning vertically. */}
      <div>
        {rows.map(({ module: m, used, pctOfPool, ratio, caps }, productIdx) => {
          const ModIcon = m.icon;
          const dl      = m.dailyLimit;
          // Daily-limit chip tone — only escalates when the org is
          // genuinely close to the ceiling so the colour means
          // something when it appears.
          const dlPct   = dl && dl.count > 0 ? Math.min(100, (dl.used / dl.count) * 100) : 0;
          const dlTone  =
              dl && dlPct >= 90 ? "#DC2626"
            : dl && dlPct >= 75 ? "#D97706"
            : null;

          return (
            <div
              key={m.id}
              className={productIdx > 0 ? "border-t border-border-subtle" : ""}
            >
              {/* Product header row — icon + name + optional daily-
                  limit chip on the left, totals on the right. */}
              <div
                className={`grid ${gridCols} gap-3 px-5 py-3 items-center bg-surface-page/40`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: m.chartColor }}
                  />
                  <div
                    className="w-7 h-7 rounded-input flex items-center justify-center shrink-0"
                    style={{ background: m.gradient }}
                  >
                    <ModIcon size={13} strokeWidth={1.6} style={{ color: m.text }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">
                      {m.name}
                    </p>
                    {dl && (
                      <p className="text-[10.5px] text-text-tertiary tabular-nums inline-flex items-center gap-1.5 mt-0.5">
                        {dlTone && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: dlTone }}
                            aria-hidden
                          />
                        )}
                        <Timer size={10} strokeWidth={1.75} className="text-text-tertiary" />
                        Daily {formatNum(dl.used)} / {formatNum(dl.count)} {dl.unit}{dl.count === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                </div>
                {/* Units column — blank on the product header (the
                    breakdown lives in the capability rows). */}
                <div />
                {/* Rate column — blank on the product header. */}
                <div />
                {/* Used — product total */}
                <div className="text-right tabular-nums">
                  <span className="text-[13px] font-semibold text-text-primary">
                    {formatAmount(Math.round(used), currency)}
                  </span>
                </div>
                {/* % of plan — product total */}
                <div className="text-right tabular-nums text-[12.5px] font-medium text-text-secondary">
                  {pctOfPool.toFixed(1)}%
                </div>
              </div>

              {/* Capability sub-rows — indented under the product. */}
              {caps.map((c) => {
                // Per-capability range numbers. Scale by the product's
                // range/total ratio so a capability's units/spend in
                // the range match what we'd derive directly from the
                // wallet's daily series.
                const capCredits = Math.round(c.creditsUsed * ratio);
                const capUnits   = Math.round(c.unitCount * ratio);
                const capPct     = totalPool > 0 ? (capCredits / totalPool) * 100 : 0;
                const rateLabel  = Number.isInteger(c.rate)
                  ? `₹${c.rate}`
                  : `₹${c.rate.toFixed(2)}`;
                return (
                  <div
                    key={c.id}
                    className={`grid ${gridCols} gap-3 px-5 py-2.5 items-center border-t border-border-subtle`}
                  >
                    {/* Capability name — indented + a quiet leader
                        glyph to read as a child row. */}
                    <div className="flex items-center gap-2 pl-7 min-w-0">
                      <span className="text-text-tertiary/60 text-[11px] select-none shrink-0" aria-hidden>↳</span>
                      <span className="text-[12.5px] text-text-secondary truncate">
                        {c.label}
                      </span>
                    </div>
                    {/* Units */}
                    <div className="text-right tabular-nums text-[12px] text-text-secondary">
                      <span className="text-text-primary font-medium">{formatNum(capUnits)}</span>{" "}
                      <span className="text-text-tertiary">{c.unitLabel}{capUnits === 1 ? "" : "s"}</span>
                    </div>
                    {/* Rate per unit */}
                    <div className="text-right tabular-nums text-[12px] text-text-tertiary">
                      {rateLabel}
                    </div>
                    {/* Used */}
                    <div className="text-right tabular-nums text-[12.5px] text-text-primary">
                      {formatAmount(capCredits, currency)}
                    </div>
                    {/* % of plan */}
                    <div className="text-right tabular-nums text-[11.5px] text-text-tertiary">
                      {capPct.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer — total row.
          Deliberately heavier than the per-product rows: bigger
          numbers, semibold label in primary text, and a stronger
          surface-page background so the eye lands here as the
          summary, not as another data row. */}
      <div className={`grid ${gridCols} gap-3 px-5 py-3 border-t border-border bg-surface-page items-center`}>
        <div className="text-[12.5px] font-semibold text-text-primary">
          Total
          <span className="ml-1.5 text-[11px] font-medium text-text-tertiary">
            · {rows.length} product{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div />
        <div />
        <div className="text-right tabular-nums">
          <span className="text-[14.5px] font-semibold text-text-primary">
            {formatAmount(totalUsed, currency)}
          </span>
        </div>
        <div className="text-right tabular-nums text-[12.5px] font-semibold text-text-primary">
          {totalPct.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
