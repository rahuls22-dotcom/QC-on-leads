"use client";

// Campaigns — read-only hierarchical view. The dense table itself lives in the
// shared <CampaignsTable> (so the project page can reuse it); this page owns the
// filter chrome (product / channel / metrics / search / date), the rollup stat
// strip, and feeds the filtered campaign list + selected metrics to the table.

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, ChevronDown, Sliders } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { PRODUCTS } from "@/lib/products-data";
import { edTechCampaigns, productOptions } from "@/lib/campaigns-edtech";
import { rollupCampaigns } from "@/lib/campaigns-edtech-rollup";
import {
  CampaignsTable,
  METRIC_DEFS,
  DEFAULT_METRICS,
  ALL_METRIC_KEYS,
  inr,
  num,
  type MetricKey,
} from "@/components/campaigns/campaigns-table";
import { StatCard } from "@/components/campaigns/metric-badges";

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div />}>
      <CampaignsPageInner />
    </Suspense>
  );
}

function CampaignsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link: /campaigns?product=<id> pre-selects the product filter.
  const initialProduct = (() => {
    const p = searchParams.get("product");
    return p && PRODUCTS.some((x) => x.id === p) ? p : "all";
  })();
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<"all" | string>(initialProduct);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_METRICS);

  const products = productOptions();

  const filtered = useMemo(() => {
    return edTechCampaigns.filter((c) => {
      if (productId !== "all" && c.productId !== productId) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.productName.toLowerCase().includes(q);
    });
  }, [query, productId]);

  const rollup = useMemo(() => rollupCampaigns(filtered), [filtered]);
  const liveCount = filtered.filter((c) => c.status === "enabled").length;

  return (
    <div>
      {/* Page header · compact single row. */}
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-text-primary">
            Campaigns
          </h1>
          <span className="text-[12px] text-text-tertiary truncate">
            Every Meta campaign · read-only
          </span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/spot")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium flex-shrink-0"
          title="Ask Spot about your campaigns"
        >
          <SpotMark size={13} />
          Ask Spot
        </button>
      </div>

      {/* Filters strip */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ProductFilter value={productId} onChange={setProductId} options={products} />
        <MetricsPicker selected={selectedMetrics} onChange={setSelectedMetrics} />
        <div className="relative max-w-[260px] min-w-[160px]">
          <Search
            size={13}
            strokeWidth={1.8}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full h-8 pl-7 pr-3 rounded-button border border-border bg-white text-[12.5px] placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
          />
        </div>
        <span className="text-[11.5px] text-text-tertiary">
          {filtered.length} campaign{filtered.length === 1 ? "" : "s"} · {liveCount} live
        </span>
        <span className="flex-1" />
        <DateRangeSelector compact />
      </div>

      {/* Roll-up strip */}
      <div className="grid grid-cols-5 gap-2.5 mb-4">
        <StatCard label="Spend" value={inr(rollup.spend)} delta={{ pct: rollup.spendDelta }} />
        <StatCard label="Leads" value={num(rollup.leads)} delta={{ pct: rollup.leadsDelta }} />
        <StatCard
          label="Qualified leads"
          value={num(rollup.qualified)}
          delta={{ pct: rollup.qualifiedDelta }}
        />
        <StatCard
          label="Blended CPL"
          value={inr(rollup.blendedCpl)}
          delta={{ pct: rollup.blendedCplDelta, invert: true }}
        />
        <StatCard
          label="Blended CPQL"
          value={inr(rollup.blendedCpql)}
          delta={{ pct: rollup.blendedCpqlDelta, invert: true }}
        />
      </div>

      <CampaignsTable campaigns={filtered} metrics={selectedMetrics} />
    </div>
  );
}

/* ─── Filters ──────────────────────────────────────────────────── */

function ProductFilter({
  value,
  onChange,
  options,
}: {
  value: "all" | string;
  onChange: (v: "all" | string) => void;
  options: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const current =
    value === "all" ? "All projects" : options.find((o) => o.id === value)?.name ?? "Project";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-button border border-border bg-white hover:border-border-hover text-[12px] font-medium text-text-primary"
      >
        <Filter size={11} strokeWidth={1.7} className="text-text-secondary" />
        {current}
        <ChevronDown size={11} strokeWidth={1.8} className="text-text-tertiary" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[240px] bg-white border border-border rounded-card shadow-card-hover py-1">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-page ${
                value === "all" ? "text-text-primary font-medium" : "text-text-secondary"
              }`}
            >
              All projects
            </button>
            <div className="my-1 h-px bg-border-subtle" />
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-page ${
                  value === o.id ? "text-text-primary font-medium" : "text-text-secondary"
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MetricsPicker({
  selected,
  onChange,
}: {
  selected: MetricKey[];
  onChange: (next: MetricKey[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = new Set(selected);
  const toggle = (k: MetricKey) => {
    const next = new Set(set);
    if (next.has(k)) {
      if (next.size === 1) return; // keep at least one
      next.delete(k);
    } else {
      next.add(k);
    }
    onChange(ALL_METRIC_KEYS.filter((m) => next.has(m)));
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-button border border-border bg-white hover:border-border-hover text-[12px] font-medium text-text-primary"
      >
        <Sliders size={11} strokeWidth={1.7} className="text-text-secondary" />
        {selected.length} metric{selected.length === 1 ? "" : "s"}
        <ChevronDown size={11} strokeWidth={1.8} className="text-text-tertiary" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[240px] bg-white border border-border rounded-card shadow-card-hover py-1">
            <div className="flex items-center justify-between px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-text-tertiary border-b border-border-subtle">
              <span>Show metrics</span>
              <button
                type="button"
                onClick={() => onChange(DEFAULT_METRICS)}
                className="text-text-secondary hover:text-text-primary normal-case text-[11px] tracking-normal"
              >
                Reset
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto py-1">
              {ALL_METRIC_KEYS.map((k) => {
                const def = METRIC_DEFS[k];
                const checked = set.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(k)}
                    className="w-full text-left px-3 py-1.5 hover:bg-surface-page inline-flex items-center gap-2 text-[12px]"
                  >
                    <span
                      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[3px] border ${
                        checked ? "bg-text-primary border-text-primary text-[#FAFAF8]" : "border-border"
                      }`}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path
                            d="M1.5 4.5L3.5 6.5L7.5 2"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className={checked ? "text-text-primary" : "text-text-secondary"}>
                      {def.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
