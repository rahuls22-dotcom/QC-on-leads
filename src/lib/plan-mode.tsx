"use client";

// Compatibility shim. Plan gating moved to lib/products.tsx (entitlement layer).
// Kept so any lingering import of usePlanMode/PlanModeProvider keeps working.
// New code should use lib/products.tsx directly.

import { ProductsProvider, useProducts } from "@/lib/products";

export const PlanModeProvider = ProductsProvider;

export function usePlanMode() {
  const { enrichmentOnly, toggleProduct } = useProducts();
  // Old API exposed { enrichmentOnly, toggle }. Map toggle → flip the two
  // non-enrichment products so the workspace swings between full plan and
  // enrichment-only.
  const toggle = () => {
    toggleProduct("ai_calling");
    toggleProduct("campaigns");
  };
  return { enrichmentOnly, toggle };
}
