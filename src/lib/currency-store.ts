"use client";

/**
 * Display currency for the wallet page. INR by default (this product
 * ships first in India), with a user-facing switch to USD for clients
 * who prefer dollar-denominated views. Persists to localStorage so the
 * preference survives reloads. SSR-safe: hydrates in a useEffect after
 * first client mount.
 */

import { create } from "zustand";
import type { Currency } from "@/lib/credits-data";

const STORAGE_KEY = "revspot:wallet-currency";

interface CurrencyState {
  currency: Currency;
  hydrated: boolean;
  set: (c: Currency) => void;
  hydrate: () => void;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: "INR",
  hydrated: false,
  set: (c) => {
    set({ currency: c });
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch { /* ignore */ }
  },
  hydrate: () => {
    if (get().hydrated) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "INR" || raw === "USD") {
        set({ currency: raw, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },
}));
