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

const MODE_KEY    = "revspot:billing-mode";
const BALANCE_KEY = "revspot:wallet-balance-state";

interface BillingModeState {
  mode: BillingMode;
  balance: WalletBalanceState;
  hydrated: boolean;
  set: (m: BillingMode) => void;
  setBalance: (b: WalletBalanceState) => void;
  hydrate: () => void;
}

export const useBillingModeStore = create<BillingModeState>((set, get) => ({
  mode: "prepaid",
  balance: "healthy",
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
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const rawMode = window.localStorage.getItem(MODE_KEY);
      const rawBal  = window.localStorage.getItem(BALANCE_KEY);
      const patch: Partial<BillingModeState> = { hydrated: true };
      if (rawMode === "prepaid" || rawMode === "postpaid") patch.mode = rawMode;
      if (rawBal === "healthy" || rawBal === "low" || rawBal === "empty" || rawBal === "expired") {
        patch.balance = rawBal;
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
