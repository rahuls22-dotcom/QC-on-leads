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

const MODE_KEY      = "revspot:billing-mode";
const BALANCE_KEY   = "revspot:wallet-balance-state";
const PLAN_TYPE_KEY = "revspot:prepaid-plan-type";

interface BillingModeState {
  mode: BillingMode;
  balance: WalletBalanceState;
  prepaidPlanType: PrepaidPlanType;
  hydrated: boolean;
  set: (m: BillingMode) => void;
  setBalance: (b: WalletBalanceState) => void;
  setPrepaidPlanType: (p: PrepaidPlanType) => void;
  hydrate: () => void;
}

export const useBillingModeStore = create<BillingModeState>((set, get) => ({
  mode: "prepaid",
  balance: "healthy",
  prepaidPlanType: "subscription",
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
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const rawMode = window.localStorage.getItem(MODE_KEY);
      const rawBal  = window.localStorage.getItem(BALANCE_KEY);
      const rawPlan = window.localStorage.getItem(PLAN_TYPE_KEY);
      const patch: Partial<BillingModeState> = { hydrated: true };
      if (rawMode === "prepaid" || rawMode === "postpaid") patch.mode = rawMode;
      if (rawBal === "healthy" || rawBal === "low" || rawBal === "empty" || rawBal === "expired") {
        patch.balance = rawBal;
      }
      if (rawPlan === "subscription" || rawPlan === "pure") patch.prepaidPlanType = rawPlan;
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
