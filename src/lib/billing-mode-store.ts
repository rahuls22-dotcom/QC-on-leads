"use client";

/**
 * Billing mode + wallet balance state for the wallet page.
 *
 * - mode: "prepaid" (top up a balance) vs "postpaid" (bill at cycle end).
 *   Different layouts, different language. Postpaid orgs don't have a
 *   wallet — only prepaid does.
 *
 * - balance: only meaningful for prepaid. "healthy" is the happy path,
 *   "low" warns the user, "empty" hard-blocks new actions and forces a
 *   recharge request, "expired" is similar but worded differently
 *   (subscription / plan window lapsed rather than spent down).
 *
 *   Postpaid ignores balance entirely.
 *
 * Both fields persist to localStorage so the demo state survives
 * reloads.
 */

import { create } from "zustand";

export type BillingMode = "prepaid" | "postpaid";

export type WalletBalanceState = "healthy" | "low" | "empty" | "expired";

/**
 * Prepaid sub-models:
 *
 * - "subscription": the org pays a fixed monthly fee (e.g. ₹2L) which
 *   becomes the starting balance for the cycle. Usage draws against it.
 *   If they run out before cycle close, they can recharge — top-up
 *   credits accumulate on top of the plan baseline. New cycle resets
 *   the plan (top-ups carry over).
 *
 * - "pure": the org just deposits whatever they want into a wallet and
 *   spends it down. No fixed monthly fee, no plan baseline — only the
 *   sum of their top-ups acts as the available balance.
 *
 * Postpaid ignores planType entirely.
 */
export type PrepaidPlanType = "subscription" | "pure";

/**
 * Carry-forward policy on a subscription plan:
 *
 * - "enabled": unused balance at cycle end rolls into next cycle. The
 *   plan baseline still resets fresh each cycle (you don't get a double
 *   plan), but anything you didn't spend stays in your wallet as
 *   "carried forward" alongside next month's fresh plan and any
 *   top-ups. Friendlier policy — customers love it, sales uses it as
 *   a hook for higher commits.
 *
 * - "disabled": use it or lose it. Anything unspent at cycle close is
 *   forfeited. Common with bundled SaaS pricing (it incentivises
 *   right-sizing the plan rather than overbuying). On the hero we
 *   surface this prominently so the customer can adjust behaviour
 *   before they're surprised at month-end.
 *
 * Only meaningful for prepaid Subscription. Pure top-up never resets
 * (no cycle) so there's nothing to carry; postpaid has no balance.
 */
export type CarryForward = "enabled" | "disabled";

/**
 * Module mix — which of the three product modules a workspace has
 * actually purchased. Real customers don't always buy the full suite:
 *
 * - "full" — Contact Extraction + Enrichment + AI Calling. Default
 *   for the demo because the most interesting wallet/billing widgets
 *   only have something to show when there are three modules to
 *   stack.
 *
 * - "voice-only" — Just AI Calling. Common for outbound-calling-only
 *   customers who already have their own lead database.
 *
 * - "data-suite" — Contact Extraction + Enrichment, no calling. Data
 *   teams who use Revspot to enrich leads and pipe them into other
 *   tools.
 *
 * - "calling-extraction" — AI Calling + Contact Extraction. A "find
 *   them and call them" combo that skips deep enrichment.
 *
 * Postpaid and pure-prepaid wallets honor the same mix; the toggle
 * just changes which modules are visible across the wallet/usage/
 * billing surface and contribute to the totals.
 */
export type ModuleMix =
  | "full"
  | "voice-only"
  | "data-suite"
  | "calling-extraction";

/**
 * Module IDs that participate in each mix. Kept here so consumers in
 * the wallet UI and credits-data helpers can filter consistently
 * without duplicating the mapping.
 */
export const MODULE_MIX_IDS: Record<ModuleMix, readonly string[]> = {
  "full":               ["contact-extraction", "enrichment", "ai-calling"],
  "voice-only":         ["ai-calling"],
  "data-suite":         ["contact-extraction", "enrichment"],
  "calling-extraction": ["contact-extraction", "ai-calling"],
};

// Versioned localStorage keys. Bumping the suffix invalidates any value
// persisted under the previous version — useful when the demo's default
// landing state changes. v2 was introduced when we re-asserted prepaid as
// the default landing experience so the wallet always shows on first
// visit, even for users who previously toggled the demo to postpaid.
const MODE_KEY           = "revspot:billing-mode-v2";
const BALANCE_KEY        = "revspot:wallet-balance-state-v2";
const PLAN_TYPE_KEY      = "revspot:prepaid-plan-type-v2";
const CARRY_FORWARD_KEY  = "revspot:carry-forward-v1";
const MODULE_MIX_KEY     = "revspot:module-mix-v1";

interface BillingModeState {
  mode: BillingMode;
  balance: WalletBalanceState;
  prepaidPlanType: PrepaidPlanType;
  carryForward: CarryForward;
  moduleMix: ModuleMix;
  hydrated: boolean;
  set: (m: BillingMode) => void;
  setBalance: (b: WalletBalanceState) => void;
  setPrepaidPlanType: (p: PrepaidPlanType) => void;
  setCarryForward: (c: CarryForward) => void;
  setModuleMix: (m: ModuleMix) => void;
  hydrate: () => void;
}

export const useBillingModeStore = create<BillingModeState>((set, get) => ({
  mode: "prepaid",
  balance: "healthy",
  prepaidPlanType: "subscription",
  carryForward: "enabled",
  moduleMix: "full",
  hydrated: false,
  set: (m) => {
    set({ mode: m });
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch { /* ignore */ }
  },
  setBalance: (b) => {
    set({ balance: b });
    try {
      window.localStorage.setItem(BALANCE_KEY, b);
    } catch { /* ignore */ }
  },
  setPrepaidPlanType: (p) => {
    set({ prepaidPlanType: p });
    try {
      window.localStorage.setItem(PLAN_TYPE_KEY, p);
    } catch { /* ignore */ }
  },
  setCarryForward: (c) => {
    set({ carryForward: c });
    try {
      window.localStorage.setItem(CARRY_FORWARD_KEY, c);
    } catch { /* ignore */ }
  },
  setModuleMix: (m) => {
    set({ moduleMix: m });
    try {
      window.localStorage.setItem(MODULE_MIX_KEY, m);
    } catch { /* ignore */ }
  },
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const rawMode  = window.localStorage.getItem(MODE_KEY);
      const rawBal   = window.localStorage.getItem(BALANCE_KEY);
      const rawPlan  = window.localStorage.getItem(PLAN_TYPE_KEY);
      const rawCarry = window.localStorage.getItem(CARRY_FORWARD_KEY);
      const rawMix   = window.localStorage.getItem(MODULE_MIX_KEY);
      const patch: Partial<BillingModeState> = { hydrated: true };
      if (rawMode === "prepaid" || rawMode === "postpaid") patch.mode = rawMode;
      if (rawBal === "healthy" || rawBal === "low" || rawBal === "empty" || rawBal === "expired") {
        patch.balance = rawBal;
      }
      if (rawPlan === "subscription" || rawPlan === "pure") patch.prepaidPlanType = rawPlan;
      if (rawCarry === "enabled" || rawCarry === "disabled") patch.carryForward = rawCarry;
      if (rawMix === "full" || rawMix === "voice-only" || rawMix === "data-suite" || rawMix === "calling-extraction") {
        patch.moduleMix = rawMix;
      }
      set(patch as BillingModeState);
    } catch {
      set({ hydrated: true });
    }
  },
}));

// True when the prepaid user can NOT run new product actions. Used by
// any action handler to gate behind the "send recharge request" modal.
export function isBalanceBlocking(mode: BillingMode, balance: WalletBalanceState): boolean {
  if (mode !== "prepaid") return false;
  return balance === "empty" || balance === "expired";
}
