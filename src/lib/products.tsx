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

export type ProductKey =
  | "enrichment"
  | "contact_extraction"
  | "ai_calling"
  | "campaigns";

export const ALL_PRODUCTS: { key: ProductKey; label: string }[] = [
  { key: "enrichment",         label: "Enrichment" },
  { key: "contact_extraction", label: "Contact Extraction" },
  { key: "ai_calling",         label: "AI Calling" },
  { key: "campaigns",          label: "Campaigns" },
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

const DEFAULT_PRODUCTS: ProductKey[] = [
  "enrichment",
  "contact_extraction",
  "ai_calling",
  "campaigns",
];

// Named presets — each maps to a "preview mode" toggle in the sidebar
// footer. Lets the demo flip the whole workspace to a customer profile
// in one click instead of toggling individual products. Sales loves
// these because they mirror real customer mixes.
export type ProductPreset =
  | "full"
  | "enrichment_only"
  | "voice_only"
  | "contact_extraction_only"
  | "voice_plus_enrichment";

export const PRODUCT_PRESETS: Record<ProductPreset, ProductKey[]> = {
  full:                    ["enrichment", "contact_extraction", "ai_calling", "campaigns"],
  enrichment_only:         ["enrichment"],
  voice_only:              ["ai_calling", "campaigns"],
  contact_extraction_only: ["contact_extraction"],
  voice_plus_enrichment:   ["enrichment", "ai_calling", "campaigns"],
};

// Resolve which preset (if any) the current product set matches —
// used to highlight the active toggle in the sidebar footer.
export function currentPreset(products: ProductKey[]): ProductPreset | null {
  const norm = [...products].sort().join(",");
  for (const [key, list] of Object.entries(PRODUCT_PRESETS)) {
    if ([...list].sort().join(",") === norm) return key as ProductPreset;
  }
  return null;
}

const ProductsContext = createContext<ProductsContextValue>({
  products: DEFAULT_PRODUCTS,
  has: () => true,
  setProducts: () => {},
  toggleProduct: () => {},
  enrichmentOnly: false,
});

const STORAGE_KEY = "revspot:products";

function isValidProduct(v: string): v is ProductKey {
  return (
    v === "enrichment" ||
    v === "contact_extraction" ||
    v === "ai_calling" ||
    v === "campaigns"
  );
}

// Synchronous read of the persisted product set. Used by the lazy
// useState initializer below so that the FIRST render already
// reflects the workspace's preset — without this, route guards or
// any has()-dependent UI would briefly render the "full" defaults
// before a useEffect hydrate kicked in, producing a flash of an
// unowned product surface before the redirect fires. SSR-safe: the
// window check makes it a no-op on the server.
function readStoredProducts(): ProductKey[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PRODUCTS;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return DEFAULT_PRODUCTS;
    const valid = parsed.filter(
      (x): x is ProductKey => typeof x === "string" && isValidProduct(x),
    );
    return valid.length > 0 ? valid : DEFAULT_PRODUCTS;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  // Lazy initializer reads localStorage on the very first render so
  // the sidebar and any product-route guard see the right entitlement
  // on mount, not after a useEffect tick later.
  const [products, setProductsState] = useState<ProductKey[]>(() => readStoredProducts());

  // Re-read once on mount as a belt-and-braces measure. The lazy
  // initializer above handles the common case; this catches edge
  // cases where storage is written between the initial render and
  // the effect tick (e.g. another tab toggled the preset). Skips
  // the state update if nothing actually changed so React doesn't
  // re-render needlessly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = readStoredProducts();
    setProductsState((prev) =>
      prev.length === next.length && prev.every((p, i) => p === next[i]) ? prev : next,
    );
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
