"use client";

import { useState, useRef } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type CardStatus = "good" | "warning" | "bad" | "neutral";

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Previous period value: "₹5.9L", "104" — shown as "was ₹5.9L" */
  previous?: string | number;
  /** Absolute change as chip: "+23", "-₹62", "+₹90K" */
  delta?: string;
  /** Label for the previous period: "yesterday", "last week", "in prev. period" */
  previousLabel?: string;
  tooltip?: string;
  trend?: {
    value: number;
    direction: "up" | "down";
    positive?: boolean;
  };
  /** Secondary metric shown as badge: "15% verification rate" */
  subMetric?: string;
  /** Card status for background tinting */
  status?: CardStatus;
  /** Chart selection */
  chartKey?: string;
  isSelected?: boolean;
  onToggle?: (key: string) => void;
  /** Icon component */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ComponentType<any>;
  /** Warning note shown below the card */
  warning?: string;
}

function getCardBg(status: CardStatus) {
  return { good: "bg-[#F7FDF9]", warning: "bg-[#FFFBF5]", bad: "bg-[#FEF9F9]", neutral: "bg-white" }[status];
}

function getCardBorder(status: CardStatus, isSelected: boolean) {
  if (isSelected) return "border-accent ring-1 ring-accent/20";
  return { good: "border-[#E2F5E9]", warning: "border-[#F5EDD8]", bad: "border-[#F5E2E2]", neutral: "border-border" }[status];
}

export function MetricCard({
  label, value, previous, delta, previousLabel, tooltip, trend, subMetric,
  status = "neutral", chartKey, isSelected = false, onToggle, icon: Icon, warning,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trendIsPositive = trend
    ? trend.positive !== undefined ? trend.positive : trend.direction === "up"
    : false;

  const effectiveStatus = status !== "neutral" ? status : (trend ? (trendIsPositive ? "good" : "bad") : "neutral");

  const isClickable = !!chartKey && !!onToggle;
  const Tag = isClickable ? "button" : "div";

  return (
    <Tag
      onClick={isClickable ? () => onToggle!(chartKey!) : undefined}
      className={`relative text-left w-full ${getCardBg(effectiveStatus)} border rounded-card px-4 py-3.5 transition-all duration-150 hover:shadow-card-hover hover:-translate-y-px min-h-[120px] flex flex-col ${getCardBorder(effectiveStatus, isSelected)} ${isClickable ? "cursor-pointer" : ""}`}
      onMouseEnter={() => { if (tooltip) timeoutRef.current = setTimeout(() => setShowTooltip(true), 300); }}
      onMouseLeave={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setShowTooltip(false); }}
    >
      {/* Row 1: Label + Trend % */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} strokeWidth={1.5} className="text-text-tertiary" />}
          <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">{label}</span>
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trendIsPositive ? "text-status-success" : "text-status-error"}`}>
            {trend.direction === "up" ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
            {trend.value}%
          </span>
        )}
      </div>

      {/* Row 2: Value + Delta chip */}
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-text-primary leading-tight tabular-nums">{value}</span>
        {delta && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] tabular-nums ${
            trendIsPositive ? "bg-[#E6F9F0] text-[#15803D]" : "bg-[#FEE8E8] text-[#DC2626]"
          }`}>{delta}</span>
        )}
      </div>

      {/* Row 3: Sub-metric badge */}
      {subMetric && (
        <div className="mt-1.5">
          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-[4px] bg-surface-secondary text-text-primary tabular-nums">{subMetric}</span>
        </div>
      )}

      {/* Row 4: Previous — pushed to bottom */}
      <div className="mt-auto pt-1">
        {previous !== undefined && (
          <div className="text-[10px] text-text-tertiary tabular-nums">
            was <span className="font-medium">{previous}</span>{previousLabel ? ` ${previousLabel}` : ""}
          </div>
        )}
      </div>

      {/* Warning note */}
      {warning && (
        <div className="text-[9px] text-[#92400E] mt-1 leading-tight">{warning}</div>
      )}

      {/* Selected indicator */}
      {isSelected && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent rounded-full" />}

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-charcoal text-white text-[11px] px-2.5 py-1.5 rounded-md whitespace-nowrap z-10 pointer-events-none">{tooltip}</div>
      )}
    </Tag>
  );
}
