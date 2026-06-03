import type { ActionVerb } from "@/lib/types/diagnosis-payload";
import type { BudgetMode } from "@/lib/campaign-data";

/** Imperative label for an action button. Always {verb} {target}; never generic. */
export function getActionLabel(
  verb: ActionVerb,
  target?: string | null,
  budgetMode?: BudgetMode,
): string {
  const t = target ?? "";
  switch (verb) {
    case "PAUSE":
      return target ? `Pause ${target}` : "Pause";
    case "SCALE":
      if (target) return `Scale ${target}`;
      return budgetMode === "CBO" ? "Increase campaign budget" : "Scale";
    case "SHIFT_BUDGET":
      return target ? `Move budget to ${target}` : "Shift budget";
    case "REFRESH":
      return target ? `Refresh ${target}` : "Refresh creative";
    case "ADD_CREATIVE":
      return target ? `Add creative for ${target}` : "Add creative";
    case "ADD_ADSET":
      return target ? `Create ${target} adset` : "Create adset";
    case "CONTINUE":
      return "Keep current strategy";
    case "WAIT":
      return "Snooze 24h";
    case "INTERVENE":
      // Under CBO, INTERVENE = pause donor (Meta redistributes). Surface the real op.
      if (budgetMode === "CBO" && target) return `Pause ${target}`;
      return target ? `Apply on ${t}` : "Apply";
    case "URGENT":
    case "OPTIMIZE":
      return target ? `Apply on ${t}` : "Apply";
    default:
      return "Apply";
  }
}

/**
 * Whether a verb is valid under the current budget mode.
 * SHIFT_BUDGET is illegal under CBO — Meta redistributes automatically.
 */
export function isVerbValid(verb: ActionVerb, budgetMode: BudgetMode): boolean {
  if (budgetMode === "CBO" && verb === "SHIFT_BUDGET") return false;
  return true;
}

/**
 * Resolve the effective verb for the current budget mode.
 * Under CBO, SHIFT_BUDGET collapses to PAUSE on the donor adset (since CBO redistributes).
 */
export function resolveVerb(verb: ActionVerb, budgetMode: BudgetMode): ActionVerb {
  if (budgetMode === "CBO" && verb === "SHIFT_BUDGET") return "PAUSE";
  return verb;
}
