"use client";

/**
 * WalletCard — one module's full readout.
 *
 * Credits are pooled at the workspace level, not per module — so this
 * card no longer shows an individual remaining balance. Instead it
 * answers:
 *
 *   1. Header        — module icon + name + period chip
 *   2. Spend          — credits this module has consumed this period,
 *                       and what share of total utilization that is
 *   3. Daily limit    — operational throttle (e.g. 5,000 records/day)
 *                       when the module has one. Independent of credits.
 *   4. Capability rows — rate × units → credit cost per capability
 *
 * Designed to make the per-module spend legible without duplicating
 * the "remaining balance" story that the page hero already tells.
 */

import type { Module, Wallet } from "@/lib/credits-data";
import { poolSummary, sliceDailyToRange, utilizedInRange } from "@/lib/credits-data";
import { AlertTriangle } from "lucide-react";

interface WalletCardProps {
  // Accept either name for back-compat with the older WALLETS export.
  wallet: Wallet | Module;
  // When set, all the credit + unit figures on the card are recomputed
  // for the last N days instead of the full billing period. Lets the
  // page-level date filter cascade through to every card so the
  // numbers across the whole screen tell the same story.
  rangeDays?: number;
}

function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}

// Money-only label — credits as a noun no longer appear in the UI.
function formatCredits(n: number): string {
  return `₹${formatNum(n)}`;
}

// Per-unit rate label: "₹2 each" / "₹1.5 each". Pluralisation is
// gone because we're no longer naming the unit ("credit"); the
// rate is just a rupee amount per action.
function formatRate(rate: number): string {
  if (rate === 0) return "free";
  const formatted = Number.isInteger(rate) ? rate.toString() : rate.toFixed(1);
  return `₹${formatted} each`;
}

function formatPeriodChip(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end   = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function WalletCard({ wallet, rangeDays }: WalletCardProps) {
  const Icon = wallet.icon;

  // Compute the headline credit figures. If a rangeDays is set, every
  // number on the card reflects that window — both the module's spend
  // and (proportionally) the per-capability rows. If not, the card
  // shows the full period totals.
  //
  // Capability-level spend isn't tracked daily — we only have a single
  // period total per capability and a daily total per module. So when
  // we filter by range we scale the capability numbers by the ratio
  // of (range utilized / period utilized). It's an estimate, but the
  // alternative ("show period numbers under a range header") is worse
  // — the totals on the card wouldn't add up to the headline figure.
  const pool = poolSummary();
  const moduleUtilized = rangeDays !== undefined
    ? sliceDailyToRange(wallet.daily, rangeDays).reduce((s, d) => s + d.amount, 0)
    : wallet.utilized;
  const periodUtilized = wallet.utilized;
  const ratio = periodUtilized > 0 ? moduleUtilized / periodUtilized : 0;

  // Denominator for "% of utilized" — total spend across all modules
  // in the same window, so the per-module share reads correctly when
  // a range is selected.
  const totalUtilizedNow = rangeDays !== undefined
    ? utilizedInRange(rangeDays)
    : pool.utilized;

  const pctOfPool = pool.totalCredits > 0
    ? (moduleUtilized / pool.totalCredits) * 100
    : 0;
  const pctOfUtilized = totalUtilizedNow > 0
    ? (moduleUtilized / totalUtilizedNow) * 100
    : 0;

  // Range-aware copy used in the secondary line under the hero number
  // and the "Used on" header so the user always knows what window the
  // figures cover.
  const windowLabel = rangeDays !== undefined ? `last ${rangeDays} days` : "this period";

  const spentRows    = wallet.capabilities.filter((c) => !c.included);
  const includedRows = wallet.capabilities.filter((c) => c.included);

  // Daily limit progress — only relevant for modules that ship a
  // dailyLimit (Enrichment today). Shows the count toward the cap
  // and changes tone as the user approaches it.
  const dl = wallet.dailyLimit;
  const dlPct = dl && dl.count > 0
    ? Math.min(100, (dl.used / dl.count) * 100)
    : 0;
  const dlTone =
      dlPct >= 90 ? { fg: "#DC2626", bg: "#FEF2F2" }
    : dlPct >= 75 ? { fg: "#D97706", bg: "#FFFBEB" }
    : { fg: wallet.text, bg: wallet.bg };

  return (
    <div className="bg-white border border-border rounded-card p-5 flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-input flex items-center justify-center shrink-0"
            style={{ background: wallet.gradient }}
          >
            <Icon size={16} strokeWidth={1.6} style={{ color: wallet.text }} />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-primary truncate">{wallet.name}</p>
            <p className="text-[11px] text-text-tertiary truncate">{wallet.description}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-badge shrink-0 whitespace-nowrap"
          style={{ backgroundColor: wallet.bg, color: wallet.text, border: `1px solid ${wallet.border}` }}
          title={`Period: ${formatPeriodChip(wallet.periodStart, wallet.periodEnd)}`}
        >
          {formatPeriodChip(wallet.periodStart, wallet.periodEnd)}
        </span>
      </div>

      {/* ── Spend hero — credits used + share of pool ─────────────── */}
      <div className="mb-4">
        <p
          className="text-[24px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          ₹{formatNum(Math.round(moduleUtilized))}
        </p>
        <p className="text-[11px] text-text-tertiary mt-1">
          spent in {windowLabel} · {pctOfPool.toFixed(1)}% of pool · {pctOfUtilized.toFixed(0)}% of what's used
        </p>
      </div>

      {/* ── Daily limit — Enrichment-style operational throttle ──── */}
      {dl && (
        <div
          className="mb-4 rounded-input border px-3 py-2.5"
          style={{ backgroundColor: dlTone.bg, borderColor: wallet.border }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {dlPct >= 75 && (
                <AlertTriangle size={11} strokeWidth={1.8} style={{ color: dlTone.fg }} />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: dlTone.fg }}>
                Daily limit
              </span>
            </div>
            <span className="text-[11px] tabular-nums" style={{ color: dlTone.fg }}>
              <span className="font-semibold">{formatNum(dl.used)}</span>
              <span className="opacity-70"> / {formatNum(dl.count)} {dl.unit}{dl.count === 1 ? "" : "s"} today</span>
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/70 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${dlPct.toFixed(1)}%`, background: dlTone.fg }}
            />
          </div>
        </div>
      )}

      {/* ── Capability breakdown ─────────────────────────────────────── */}
      <div className="flex-1">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">
          Used on {rangeDays !== undefined && (
            <span className="text-text-tertiary normal-case font-normal">· in {windowLabel}</span>
          )}
        </p>
        <div className="space-y-1">
          {spentRows.map((c) => {
            const CapIcon = c.icon;
            // Scale capability spend + unit count by the window ratio
            // so the breakdown sums to the headline number on the
            // card. `Math.round` keeps the numbers tidy without
            // chasing decimals.
            const credits = Math.round(c.creditsUsed * ratio);
            const units   = Math.round(c.unitCount * ratio);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-input hover:bg-surface-page transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CapIcon size={12} strokeWidth={1.6} className="text-text-tertiary shrink-0" />
                  <span className="text-[12.5px] text-text-primary truncate">{c.label}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12.5px] font-medium text-text-primary tabular-nums">
                    {formatCredits(credits)}
                  </p>
                  <p
                    className="text-[10px] text-text-tertiary tabular-nums"
                    title={`${formatNum(units)} ${c.unitLabel}${units === 1 ? "" : "s"} × ₹${c.rate} each`}
                  >
                    {formatNum(units)} {c.unitLabel}{units === 1 ? "" : "s"} · {formatRate(c.rate)}
                  </p>
                </div>
              </div>
            );
          })}
          {includedRows.length > 0 && (
            <div className="pt-1 mt-1 border-t border-border-subtle">
              {includedRows.map((c) => {
                const CapIcon = c.icon;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-input"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CapIcon size={12} strokeWidth={1.6} className="text-text-tertiary shrink-0" />
                      <span className="text-[12.5px] text-text-secondary truncate">{c.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                        Included
                      </p>
                      {c.includedNote && (
                        <p className="text-[10px] text-text-tertiary">{c.includedNote}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
