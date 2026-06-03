"use client";

import { TrendingUp, TrendingDown, Info } from "lucide-react";
import type {
  GoalTrackerData,
  GoalProgress,
  FunnelGoal,
} from "@/lib/types/diagnosis-payload";
import type { CampaignGoalKind } from "@/lib/campaign-data";
import { formatINR, formatINRCompact } from "@/lib/diagnosis-data";

interface GoalTrackerProps {
  data: GoalTrackerData;
  /** Which funnel stage is the campaign's primary KPI. */
  primaryGoal: CampaignGoalKind;
}

const goalLabels: Record<CampaignGoalKind, string> = {
  leads: "Leads",
  verified: "Verified leads",
  qualified: "Qualified leads",
};

export function GoalTracker({ data, primaryGoal }: GoalTrackerProps) {
  const primary: FunnelGoal =
    primaryGoal === "leads"
      ? data.leads
      : primaryGoal === "verified"
      ? data.verified
      : data.qualified;
  const label = goalLabels[primaryGoal];

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
        <h3 className="text-section-header text-text-primary">Goal tracker</h3>
        <div className="flex items-center gap-3 text-[11px] tabular-nums">
          <span className="text-text-tertiary">
            CPL <span className="text-text-secondary font-medium">{formatINR(data.current_cpl)}</span>{" "}
            / target {formatINR(data.required_cpl)}{" "}
            <span
              className={`font-semibold ${
                data.headroom_cpl < 0 ? "text-[#B91C1C]" : "text-[#15803D]"
              }`}
            >
              ({data.headroom_cpl < 0 ? "+" : "-"}
              {formatINR(Math.abs(data.headroom_cpl))})
            </span>
          </span>
          <span className="text-border">|</span>
          <span className="text-text-tertiary">
            Pacing index{" "}
            <span
              className={`font-semibold ${
                data.pacing_index > 1.1
                  ? "text-[#B91C1C]"
                  : data.pacing_index < 0.9
                  ? "text-[#92400E]"
                  : "text-[#15803D]"
              }`}
            >
              {data.pacing_index.toFixed(2)}×
            </span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border-subtle">
        <FunnelGoalCard label={label} goal={primary} />
        <BudgetTimeCard
          spent={data.budget.spent}
          total={data.budget.total}
          burnPct={data.budget.burn_pct}
          timeBurnPct={data.time.burn_pct}
          pacingIndex={data.pacing_index}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GoalCard({ label, goal }: { label: string; goal: GoalProgress }) {
  const actualPct = Math.min((goal.actual / goal.goal) * 100, 100);
  const projectedPct = Math.min((goal.projected / goal.goal) * 100, 100);
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-[24px] font-semibold text-text-primary tabular-nums leading-none">
          {goal.actual}
        </span>
        <span className="text-[12px] text-text-tertiary tabular-nums">
          / {goal.goal}
        </span>
      </div>

      <div className="relative h-1.5 bg-surface-secondary rounded-full overflow-hidden mb-2">
        {/* Projected band (lighter) */}
        <div
          className="absolute inset-y-0 left-0 bg-text-tertiary/30 rounded-full"
          style={{ width: `${projectedPct}%` }}
        />
        {/* Actual fill */}
        <div
          className="absolute inset-y-0 left-0 bg-text-primary rounded-full"
          style={{ width: `${actualPct}%` }}
        />
      </div>

      <div className="flex items-center gap-1 text-[11px] tabular-nums">
        <span className="text-text-tertiary">Projected</span>
        <span className="text-text-secondary font-medium">{goal.projected}</span>
        <span
          className={`inline-flex items-center gap-0.5 font-semibold ${
            goal.on_track ? "text-[#15803D]" : "text-[#B91C1C]"
          }`}
        >
          {goal.on_track ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {goal.gap_pct > 0 ? "+" : ""}
          {goal.gap_pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function FunnelGoalCard({ label, goal }: { label: string; goal: FunnelGoal }) {
  if (goal === null) {
    return (
      <div className="px-5 py-4">
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
          {label}
        </div>
        <div className="text-[12px] text-text-tertiary leading-relaxed">No goal set</div>
      </div>
    );
  }
  if (goal === "no_bofu_data") {
    return (
      <div className="px-5 py-4">
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
          {label}
        </div>
        <div className="flex items-start gap-1.5 text-[12px] text-[#92400E] bg-[#FEF3C7]/40 rounded-button px-2 py-1.5">
          <Info size={12} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <span className="leading-relaxed">
            BOFU data not yet available — connect a voice agent.
          </span>
        </div>
      </div>
    );
  }
  return <GoalCard label={label} goal={goal} />;
}

function BudgetTimeCard({
  spent,
  total,
  burnPct,
  timeBurnPct,
  pacingIndex,
}: {
  spent: number;
  total: number;
  burnPct: number;
  timeBurnPct: number;
  pacingIndex: number;
}) {
  const isOverBurning = pacingIndex > 1.1;
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
        Budget burn
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-[24px] font-semibold text-text-primary tabular-nums leading-none">
          {formatINRCompact(spent)}
        </span>
        <span className="text-[12px] text-text-tertiary tabular-nums">
          / {formatINRCompact(total)}
        </span>
      </div>

      {/* Stacked bar — budget vs time */}
      <div className="space-y-1 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-9 text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.4px]">
            ₹
          </span>
          <div className="relative flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${
                isOverBurning ? "bg-[#B91C1C]" : "bg-text-primary"
              }`}
              style={{ width: `${Math.min(burnPct, 100)}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-text-secondary w-9 text-right">
            {burnPct.toFixed(0)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-9 text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.4px]">
            Time
          </span>
          <div className="relative flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-text-tertiary rounded-full"
              style={{ width: `${Math.min(timeBurnPct, 100)}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-text-secondary w-9 text-right">
            {timeBurnPct.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-[11px] text-text-tertiary tabular-nums mt-2">
        {isOverBurning ? (
          <span className="text-[#B91C1C] font-semibold">
            Burning {((pacingIndex - 1) * 100).toFixed(0)}% faster than time
          </span>
        ) : pacingIndex < 0.9 ? (
          <span className="text-[#92400E] font-semibold">
            Underspending — {((1 - pacingIndex) * 100).toFixed(0)}% slower than time
          </span>
        ) : (
          <span className="text-[#15803D] font-semibold">On pace</span>
        )}
      </div>
    </div>
  );
}
