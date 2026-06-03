"use client";

import { useState } from "react";
import {
  Pause,
  TrendingUp,
  ArrowLeftRight,
  RefreshCw,
  Plus,
  Check,
  AlertTriangle,
  X,
  type LucideIcon,
} from "lucide-react";
import type { BudgetMode } from "@/lib/campaign-data";
import type { ActionVerb } from "@/lib/types/diagnosis-payload";
import type { RenderableAction } from "./use-action-flow";
import { getActionLabel, resolveVerb } from "./action-labels";

type Flow = "confirm" | "scale" | "shift" | "deeplink";

const verbIcons: Partial<Record<ActionVerb, LucideIcon>> = {
  PAUSE: Pause,
  SCALE: TrendingUp,
  SHIFT_BUDGET: ArrowLeftRight,
  INTERVENE: ArrowLeftRight,
  URGENT: AlertTriangle,
  REFRESH: RefreshCw,
  ADD_CREATIVE: Plus,
  ADD_ADSET: Plus,
  CONTINUE: Check,
  OPTIMIZE: TrendingUp,
};

function flowFor(verb: ActionVerb, budgetMode: BudgetMode): Flow {
  const effective = resolveVerb(verb, budgetMode);
  switch (effective) {
    case "PAUSE":
    case "CONTINUE":
      return "confirm";
    case "SCALE":
      return "scale";
    case "SHIFT_BUDGET":
      return "shift"; // only reachable under ABO; CBO collapses to PAUSE via resolveVerb
    case "REFRESH":
    case "ADD_CREATIVE":
    case "ADD_ADSET":
      return "deeplink";
    case "INTERVENE":
    case "URGENT":
    case "OPTIMIZE":
      // Composite — under CBO this is just a PAUSE of the donor (resolved by resolveVerb above
      // when verb itself is SHIFT_BUDGET; for INTERVENE we treat it as PAUSE-of-target).
      return "confirm";
    default:
      return "confirm";
  }
}

interface ActionFlowModalProps {
  action: RenderableAction | null;
  budgetMode: BudgetMode;
  /** Current campaign daily budget — used as the base for SCALE under CBO. */
  campaignDailyBudget: number;
  onClose: () => void;
  /** Apply handler — receives the action plus any user-entered params (delta, amount, etc.). */
  onApply: (action: RenderableAction, params?: Record<string, unknown>) => void;
}

export function ActionFlowModal({
  action,
  budgetMode,
  campaignDailyBudget,
  onClose,
  onApply,
}: ActionFlowModalProps) {
  if (!action) return null;
  const flow = flowFor(action.verb, budgetMode);
  const Icon = verbIcons[action.verb] ?? Check;
  const ctaLabel = getActionLabel(action.verb, action.target_entity, budgetMode);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-card border border-border shadow-xl w-full max-w-[480px] overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
              <Icon size={16} strokeWidth={1.5} className="text-text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold text-text-primary leading-snug">
                {flowTitle(action.verb, budgetMode)}
              </h3>
              <p className="text-[12px] text-text-secondary leading-relaxed mt-0.5">
                {action.headline}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-page transition-colors shrink-0"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* Body — flow-specific */}
          <div className="px-5 py-4">
            {flow === "confirm" && <ConfirmBody action={action} budgetMode={budgetMode} />}
            {flow === "scale" && (
              <ScaleBody
                action={action}
                budgetMode={budgetMode}
                campaignDailyBudget={campaignDailyBudget}
                onApply={(params) => onApply(action, params)}
                onCancel={onClose}
                ctaLabel={ctaLabel}
              />
            )}
            {flow === "shift" && (
              <ShiftBody action={action} budgetMode={budgetMode} />
            )}
            {flow === "deeplink" && <DeeplinkBody action={action} />}
          </div>

          {/* Footer — confirm/deeplink share the same footer; scale renders its own */}
          {flow !== "scale" && (
            <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-end gap-2 bg-surface-page/40">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onApply(action)}
                className="h-9 px-4 text-[13px] font-medium bg-text-primary text-white rounded-button hover:bg-black transition-colors"
              >
                {flow === "deeplink" ? "Open creative generator" : ctaLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ────────────── flow bodies ────────────── */

function ConfirmBody({
  action,
  budgetMode,
}: {
  action: RenderableAction;
  budgetMode: BudgetMode;
}) {
  const cboCollapse = budgetMode === "CBO" && action.verb === "SHIFT_BUDGET";
  const showRedistributeNote = budgetMode === "CBO" && (action.verb === "PAUSE" || action.verb === "INTERVENE" || cboCollapse);
  return (
    <div className="space-y-3">
      {action.target_entity && (
        <div>
          <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
            Target
          </div>
          <div className="text-[13px] font-medium text-text-primary">{action.target_entity}</div>
        </div>
      )}
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Why
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.reason}</p>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Expected
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.expected}</p>
      </div>
      {showRedistributeNote && action.redeploy_to && (
        <div className="flex items-start gap-2 px-3 py-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-button text-[12px] text-[#1E40AF]">
          <ArrowLeftRight size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <span>
            Campaign uses <span className="font-semibold">CBO</span> — Meta will automatically
            redistribute spend toward {action.redeploy_to}.
          </span>
        </div>
      )}
    </div>
  );
}

function ScaleBody({
  action,
  budgetMode,
  campaignDailyBudget,
  onApply,
  onCancel,
  ctaLabel,
}: {
  action: RenderableAction;
  budgetMode: BudgetMode;
  campaignDailyBudget: number;
  onApply: (params: Record<string, unknown>) => void;
  onCancel: () => void;
  ctaLabel: string;
}) {
  const isCBO = budgetMode === "CBO";
  const baseLabel = isCBO ? "Campaign daily budget" : `${action.target_entity ?? "Adset"} daily budget`;
  const [pct, setPct] = useState<number>(20);
  const [custom, setCustom] = useState<string>("");

  const effectivePct = custom ? Math.max(0, Number(custom)) : pct;
  const newBudget = Math.round(campaignDailyBudget * (1 + effectivePct / 100));

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Why
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.reason}</p>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
          {baseLabel}
        </div>
        <div className="text-[14px] font-semibold text-text-primary tabular-nums">
          ₹{campaignDailyBudget.toLocaleString("en-IN")}/day
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2">
          Increase by
        </div>
        <div className="flex items-center gap-1.5">
          {[10, 20, 50].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPct(p);
                setCustom("");
              }}
              className={`h-8 px-3 text-[12px] font-medium rounded-button border transition-colors ${
                effectivePct === p && !custom
                  ? "bg-text-primary text-white border-text-primary"
                  : "bg-white text-text-secondary border-border hover:bg-surface-page"
              }`}
            >
              +{p}%
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input
              type="number"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom"
              className="w-20 h-8 px-2 text-[12px] border border-border rounded-button focus:outline-none focus:border-text-primary"
            />
            <span className="text-[12px] text-text-tertiary">%</span>
          </div>
        </div>
        <div className="mt-2 text-[12px] text-text-secondary tabular-nums">
          New: <span className="font-semibold text-text-primary">₹{newBudget.toLocaleString("en-IN")}/day</span>
          <span className="text-text-tertiary">
            {" · "}+₹{(newBudget - campaignDailyBudget).toLocaleString("en-IN")}
          </span>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Expected
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.expected}</p>
      </div>
      <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2 -mx-5 -mb-4 px-5 py-3 bg-surface-page/40">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onApply({ pct: effectivePct, newBudget })}
          className="h-9 px-4 text-[13px] font-medium bg-text-primary text-white rounded-button hover:bg-black transition-colors"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function ShiftBody({
  action,
  budgetMode,
}: {
  action: RenderableAction;
  budgetMode: BudgetMode;
}) {
  // Only reachable under ABO. Under CBO, resolveVerb collapses SHIFT_BUDGET to PAUSE before flowFor runs.
  void budgetMode;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
            From
          </div>
          <div className="text-[13px] font-medium text-text-primary">{action.target_entity ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
            To
          </div>
          <div className="text-[13px] font-medium text-text-primary">{action.redeploy_to ?? "—"}</div>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Expected
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.expected}</p>
      </div>
    </div>
  );
}

function DeeplinkBody({ action }: { action: RenderableAction }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Why
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.reason}</p>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
          Expected
        </div>
        <p className="text-[12px] text-text-secondary leading-relaxed">{action.expected}</p>
      </div>
      <div className="flex items-start gap-2 px-3 py-2 bg-surface-page border border-border-subtle rounded-button text-[12px] text-text-secondary">
        <RefreshCw size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        <span>
          Opens the creative generator with{" "}
          <span className="font-medium text-text-primary">{action.target_entity ?? "this adset"}</span>{" "}
          prefilled.
        </span>
      </div>
    </div>
  );
}

function flowTitle(verb: ActionVerb, budgetMode: BudgetMode): string {
  const effective = resolveVerb(verb, budgetMode);
  switch (effective) {
    case "PAUSE":
      return "Pause adset?";
    case "SCALE":
      return budgetMode === "CBO" ? "Increase campaign budget" : "Increase adset budget";
    case "SHIFT_BUDGET":
      return "Shift budget";
    case "REFRESH":
    case "ADD_CREATIVE":
      return "Refresh creative";
    case "ADD_ADSET":
      return "Create adset";
    case "CONTINUE":
      return "Keep current strategy?";
    case "INTERVENE":
      // Under CBO this collapses to a pause of the donor adset.
      return budgetMode === "CBO" ? "Pause adset?" : "Apply intervention";
    case "URGENT":
      return "Apply intervention";
    default:
      return "Confirm";
  }
}

