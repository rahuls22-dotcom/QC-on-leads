"use client";

// Shared metric badges — the inline trend arrow and the top-of-page stat card.
// Used by the campaigns rollup strip, the campaigns table's MetricCell, and the
// project (= product) detail metric grid, so they all read consistently.

import { Minus, TrendingUp, TrendingDown } from "lucide-react";
import type { TrendDelta } from "@/lib/campaigns-edtech";

/** Inline trend badge — ↑/↓ % with cost-metric colour inversion. */
export function TrendDeltaBadge({
  delta,
  className = "",
  size = "sm",
}: {
  delta: TrendDelta;
  className?: string;
  size?: "sm" | "md";
}) {
  const pctNum = delta.pct;
  const isZero = Math.abs(pctNum) < 0.5;
  const good = delta.invert ? pctNum < 0 : pctNum > 0;
  const Icon = isZero ? Minus : pctNum > 0 ? TrendingUp : TrendingDown;
  const color = isZero
    ? "text-text-tertiary"
    : good
      ? "text-[#15803D]"
      : "text-[#B91C1C]";
  return (
    <div
      className={`inline-flex items-center gap-0.5 tabular ${color} ${className} ${
        size === "md" ? "text-[11px]" : "text-[10px]"
      }`}
    >
      <Icon size={size === "md" ? 11 : 9} strokeWidth={2} />
      <span>{isZero ? "0%" : `${Math.abs(pctNum).toFixed(1)}%`}</span>
      {size === "md" && (
        <span className="text-text-tertiary ml-0.5 text-[10.5px]">vs prior</span>
      )}
    </div>
  );
}

/** Stat card — value + label + inline trend badge. */
export function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta: TrendDelta;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-2.5">
      <div className="text-[11px] text-text-tertiary mb-0.5">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-[18px] font-medium text-text-primary tabular leading-tight">
          {value}
        </div>
      </div>
      <TrendDeltaBadge delta={delta} size="md" className="mt-1" />
    </div>
  );
}
