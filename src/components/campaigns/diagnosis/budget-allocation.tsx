"use client";

import type { BudgetAllocationData } from "@/lib/types/diagnosis-payload";
import { stanceStyles, formatINR } from "@/lib/diagnosis-data";

interface BudgetAllocationProps {
  data: BudgetAllocationData;
}

export function BudgetAllocation({ data }: BudgetAllocationProps) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle">
        <h3 className="text-section-header text-text-primary">Budget allocation</h3>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          Each adset's share of spend vs share of leads — shows where money is working
          harder than its budget weight.
        </p>
      </div>

      {/* Adset table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              {[
                { label: "Adset", align: "left", tip: undefined },
                { label: "Spend share", align: "right", tip: undefined },
                { label: "Lead share", align: "right", tip: undefined },
                { label: "Qualified share", align: "right", tip: undefined },
                {
                  label: "Efficiency",
                  align: "right",
                  tip: "Lead share ÷ spend share. Above 1× means the adset delivers more leads than its budget weight; below 1× means it lags.",
                },
                { label: "Stance", align: "center", tip: undefined },
              ].map((h) => (
                <th
                  key={h.label}
                  title={h.tip}
                  className={`px-4 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-${h.align} whitespace-nowrap ${
                    h.tip ? "cursor-help underline decoration-dotted decoration-text-tertiary/40 underline-offset-2" : ""
                  }`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.adsets.map((a, i) => {
              const stance = stanceStyles[a.stance];
              const spendBarPct = Math.min(a.spend_share_pct, 100);
              const leadBarPct = Math.min(a.lead_share_pct, 100);
              const efficiencyTone =
                a.efficiency_ratio >= 1.0
                  ? "text-[#15803D]"
                  : a.efficiency_ratio >= 0.7
                  ? "text-text-primary"
                  : "text-[#B91C1C]";
              return (
                <tr
                  key={a.name}
                  className={`border-b border-border-subtle last:border-b-0 ${
                    i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                  }`}
                >
                  <td className="px-4 py-3 text-[12px] text-text-primary font-medium whitespace-nowrap max-w-[220px] truncate">
                    {a.name}
                  </td>
                  <td className="px-4 py-3">
                    <ShareBar pct={a.spend_share_pct} barPct={spendBarPct} tone="neutral" />
                  </td>
                  <td className="px-4 py-3">
                    <ShareBar pct={a.lead_share_pct} barPct={leadBarPct} tone="positive" />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-right tabular-nums text-text-secondary">
                    {a.qualified_share_pct === null
                      ? "—"
                      : `${a.qualified_share_pct.toFixed(1)}%`}
                  </td>
                  <td className={`px-4 py-3 text-[12px] text-right tabular-nums font-semibold ${efficiencyTone}`}>
                    {a.efficiency_ratio.toFixed(2)}×
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.5px] px-2 py-0.5 rounded-badge ${stance.cls}`}
                    >
                      {stance.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShareBar({
  pct,
  barPct,
  tone,
}: {
  pct: number;
  barPct: number;
  tone: "neutral" | "positive";
}) {
  const fill = tone === "positive" ? "bg-text-primary" : "bg-text-tertiary";
  return (
    <div className="flex items-center gap-2 justify-end min-w-[90px]">
      <span className="text-[12px] tabular-nums text-text-secondary font-medium">
        {pct.toFixed(1)}%
      </span>
      <div className="relative w-[60px] h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`absolute inset-y-0 left-0 rounded-full ${fill}`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

// Suppress unused import warning at compile-time
void formatINR;
