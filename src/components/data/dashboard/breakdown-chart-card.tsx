"use client";

// One chart card. Renders a clean horizontal-bar breakdown:
//   - kicker label + matching total
//   - up to 6 ordered bars (count + %)
//   - top bar gets a saturated accent, others a muted tone
//
// Two modes:
//   1. Preset — pass `cardId` (source/company_tier/seniority/...)
//   2. Custom build — pass `card` (CustomChartCard). Filters in `card.filters`
//      are AND-ed onto the incoming profiles before bucketing.

import { Pencil, X } from "lucide-react";
import { breakdownByDim } from "@/lib/dashboard/breakdown";
import { CHART_CARD_LABEL, CHART_CARD_TO_DIM, DIM_REGISTRY } from "@/lib/dashboard/dim-registry";
import { evalFilters, clauseLabel } from "@/lib/dashboard/filter-eval";
import type { ChartCardId, CustomChartCard, FilterDim, LeadProfile } from "@/lib/dashboard/types";

interface PresetProps {
  mode: "preset";
  cardId: ChartCardId;
  profiles: LeadProfile[];
}

interface CustomProps {
  mode: "custom";
  card: CustomChartCard;
  profiles: LeadProfile[];
  onEdit?: () => void;
  onRemove?: () => void;
}

type Props = PresetProps | CustomProps;

export function BreakdownChartCard(props: Props) {
  const isCustom = props.mode === "custom";
  const dimId: FilterDim = isCustom ? props.card.dim : CHART_CARD_TO_DIM[props.cardId];
  const dim = DIM_REGISTRY[dimId];
  const label = isCustom ? props.card.name : CHART_CARD_LABEL[props.cardId];

  // Apply local filters for custom cards.
  const scoped = isCustom
    ? props.profiles.filter((p) => evalFilters(p, props.card.filters))
    : props.profiles;

  const rows = breakdownByDim(scoped, dimId).slice(0, 6);
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  const total = scoped.length;

  return (
    <div className="group relative bg-white border border-border rounded-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary truncate">
            {isCustom ? `Slice by ${dim.label}` : label}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <div className="text-[18px] font-semibold text-text-primary tabular-nums tracking-tight truncate">
              {isCustom ? label : total.toLocaleString("en-IN")}
            </div>
            {isCustom ? (
              <span className="text-[11px] text-text-tertiary tabular-nums whitespace-nowrap">
                {total.toLocaleString("en-IN")} leads
              </span>
            ) : (
              <span className="text-[11px] text-text-tertiary">leads</span>
            )}
          </div>
        </div>

        {isCustom && (props.onEdit || props.onRemove) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {props.onEdit && (
              <button
                onClick={props.onEdit}
                aria-label={`Edit ${label}`}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <Pencil size={12} strokeWidth={1.75} />
              </button>
            )}
            {props.onRemove && (
              <button
                onClick={props.onRemove}
                aria-label={`Remove ${label}`}
                className="p-1 text-text-tertiary hover:text-text-primary"
              >
                <X size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter chips (custom cards only) */}
      {isCustom && props.card.filters.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {props.card.filters.map((c, i) => (
            <span
              key={`${c.dim}-${i}`}
              className="inline-flex items-center h-5 px-1.5 text-[10px] font-medium text-text-secondary bg-surface-secondary rounded-[4px]"
            >
              {clauseLabel(c)}
            </span>
          ))}
        </div>
      )}

      {/* Bars */}
      {rows.length === 0 ? (
        <div className="text-[12px] text-text-tertiary py-6 text-center">No data.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const widthPct = max === 0 ? 0 : Math.max(2, Math.round((r.count / max) * 100));
            const isTop = idx === 0;
            return (
              <div key={r.bucket} className="text-[11.5px]">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <div className="text-text-primary truncate">{r.bucket}</div>
                  <div className="flex items-baseline gap-1.5 flex-shrink-0 tabular-nums">
                    <span className="text-text-primary font-medium">
                      {r.count.toLocaleString("en-IN")}
                    </span>
                    <span className="text-text-tertiary text-[10.5px]">{r.pct}%</span>
                  </div>
                </div>
                <div className="h-[7px] bg-surface-secondary/70 rounded-full overflow-hidden">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      isTop ? "bg-text-primary" : "bg-text-primary/35",
                    ].join(" ")}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
