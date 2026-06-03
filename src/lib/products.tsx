"use client";

// Entitlement layer. Single source of truth for which products the workspace
// has purchased. Drives sidebar nav + Settings product tabs. Generalizes the
// old plan-mode.tsx (which only knew "enrichment-only").
//
// Demo-only: products are toggled from the sidebar so you can preview how the
// app collapses for clients on different plans. Persisted to localStorage so
// the selection survives page navigation (mirrors demo-mode.tsx).

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export type ProductKey = "enrichment" | "ai_calling" | "campaigns";

export const ALL_PRODUCTS: { key: ProductKey; label: string }[] = [
  { key: "enrichment", label: "Enrichment" },
  { key: "ai_calling", label: "AI Calling" },
  { key: "campaigns", label: "Campaigns" },
];

interface ProductsContextValue {
  products: ProductKey[];
  has: (k: ProductKey) => boolean;
  setProducts: (p: ProductKey[]) => void;
  toggleProduct: (k: ProductKey) => void;
  // Derived alias for the old enrichment-only plan. True when the workspace
  // owns ONLY enrichment — keeps the locked/upsell flows working unchanged.
  enrichmentOnly: boolean;
}

const DEFAULT_PRODUCTS: ProductKey[] = ["enrichment", "ai_calling", "campaigns"];

const ProductsContext = createContext<ProductsContextValue>({
  products: DEFAULT_PRODUCTS,
  has: () => true,
  setProducts: () => {},
  toggleProduct: () => {},
  enrichmentOnly: false,
});

const STORAGE_KEY = "revspot:products";

function isValidProduct(v: string): v is ProductKey {
  return v === "enrichment" || v === "ai_calling" || v === "campaigns";
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProductsState] = useState<ProductKey[]>(DEFAULT_PRODUCTS);

  // Hydrate from localStorage so plan selection survives navs.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((x): x is ProductKey => typeof x === "string" && isValidProduct(x));
        if (valid.length > 0) setProductsState(valid);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  const persist = useCallback((next: ProductKey[]) => {
    setProductsState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const setProducts = useCallback((p: ProductKey[]) => persist(p), [persist]);

  const toggleProduct = useCallback(
    (k: ProductKey) => {
      setProductsState((prev) => {
        const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
        // Never allow an empty plan — fall back to enrichment so the app
        // always has at least one product surface.
        const safe = next.length === 0 ? (["enrichment"] as ProductKey[]) : next;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
        }
        return safe;
      });
    },
    [],
  );

  const has = useCallback((k: ProductKey) => products.includes(k), [products]);
  const enrichmentOnly = products.length === 1 && products[0] === "enrichment";

  return (
    <ProductsContext.Provider
      value={{ products, has, setProducts, toggleProduct, enrichmentOnly }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
