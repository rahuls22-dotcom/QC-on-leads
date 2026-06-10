"use client";

// Products list — the memory layer. Each card is a self-contained brain
// for one product: brief, USPs, do-not-mention list, attached collateral,
// linked personas and projects. Spot reads from here whenever it acts.
//
// Two-pane layout: list of products on the left, focused product memory
// on the right. The focused product is selected client-side; no routes
// per product yet (would be /products/[id] when needed).

import { useState } from "react";
import {
  Plus,
  Package,
  Sparkles,
  FileText,
  Video,
  Layers,
  Clock,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { PRODUCTS, readinessLabel, type ProductSummary } from "@/lib/products-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";

const KIND_ICON: Record<ProductSummary["collateral"][number]["kind"], typeof FileText> = {
  pdf: FileText,
  deck: Layers,
  video: Video,
};

const MEMORY_TONE: Record<ProductSummary["memory"][number]["kind"], string> = {
  brief: "bg-surface-secondary text-text-secondary",
  usp: "pill-info",
  "persona-link": "pill-info",
  "creative-feedback": "pill-ok",
  constraint: "pill-warn",
};

const MEMORY_LABEL: Record<ProductSummary["memory"][number]["kind"], string> = {
  brief: "Brief",
  usp: "USP",
  "persona-link": "Persona",
  "creative-feedback": "Learning",
  constraint: "Constraint",
};

export default function ProductsPage() {
  const askSpot = useSpotStore((s) => s.askSpot);
  const startLaunchFlow = useSpotStore((s) => s.startLaunchFlow);
  const [activeId, setActiveId] = useState(PRODUCTS[0]?.id ?? "");
  const active = PRODUCTS.find((p) => p.id === activeId) ?? PRODUCTS[0];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">Library · Memory</div>
          <h1 className="text-page-title text-text-primary">Projects</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[640px]">
            The shared brain across every project. Each project holds its brief, USPs, do-not-mention rules, and an append-only
            memory that Spot reads from before it acts.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
        >
          <Plus size={14} strokeWidth={2} />
          New project
        </button>
      </div>

      {/* Two-pane */}
      <div className="grid grid-cols-[300px_1fr] gap-5">
        {/* List */}
        <div className="space-y-1.5">
          {PRODUCTS.map((p) => {
            const r = readinessLabel(p.readiness);
            const isActive = p.id === active?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`w-full text-left bg-white border rounded-card p-3 transition-all duration-150 ${
                  isActive ? "border-[#111] shadow-card-hover" : "border-border hover:border-border-hover"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Package size={13} strokeWidth={1.5} className="text-text-tertiary" />
                  <div className="text-[12.5px] font-medium text-text-primary truncate">{p.name}</div>
                </div>
                <div className="text-[11px] text-text-tertiary mb-2 truncate">{p.client} · {p.category}</div>
                <div className="flex items-center gap-2">
                  <span className={`pill ${r.tone === "ok" ? "pill-ok" : r.tone === "warn" ? "pill-warn" : "pill-info"}`}>
                    {r.label}
                  </span>
                  <span className="text-[11px] text-text-tertiary tabular ml-auto">
                    {Math.round(p.readiness * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {active && (
          <div className="space-y-4">
            {/* Hero strip */}
            <div className="bg-white border border-border rounded-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-meta text-text-tertiary mb-1">{active.client} · {active.category}</div>
                  <h2 className="text-section-header text-text-primary">{active.name}</h2>
                  <p className="text-body text-text-secondary mt-1.5 max-w-[640px]">{active.tagline}</p>
                </div>
                <button
                  type="button"
                  onClick={() => askSpot(`Run deep research on ${active.name} and refresh its memory.`)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12px] font-medium"
                >
                  <SpotMark size={13} />
                  Refresh memory
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border-subtle">
                <Stat label="Linked personas" value={active.personas.length} />
                <Stat label="Active campaigns" value={active.performance.activeCampaigns} />
                <Stat label="Memory entries" value={active.memory.length} />
              </div>
            </div>

            {/* Performance — spend, leads, quality */}
            <PerformanceBlock product={active} />

            {/* USPs + Avoid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-border rounded-card p-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <CheckCircle2 size={13} strokeWidth={1.6} className="text-[#15803D]" />
                  <div className="label-section">USPs to lead with</div>
                </div>
                <ul className="space-y-1.5">
                  {active.usps.map((u, i) => (
                    <li key={i} className="text-[13px] text-text-primary leading-relaxed flex gap-2">
                      <span className="text-text-tertiary mt-0.5">·</span>
                      <span>{u}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-border rounded-card p-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <ShieldAlert size={13} strokeWidth={1.6} className="text-[#92400E]" />
                  <div className="label-section">Do not mention</div>
                </div>
                <ul className="space-y-1.5">
                  {active.avoid.map((a, i) => (
                    <li key={i} className="text-[13px] text-text-primary leading-relaxed flex gap-2">
                      <span className="text-text-tertiary mt-0.5">·</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Personas referenced — full width now that "Projects using this memory" is gone */}
            <div className="bg-white border border-border rounded-card p-4">
              <div className="label-section mb-2.5">Personas referenced</div>
              <div className="flex flex-wrap gap-1.5">
                {active.personas.map((p) => (
                  <span key={p.id} className="pill">{p.name}</span>
                ))}
              </div>
            </div>

            {/* Collateral */}
            {active.collateral.length > 0 && (
              <div className="bg-white border border-border rounded-card p-4">
                <div className="label-section mb-2.5">Attached collateral</div>
                <div className="space-y-1.5">
                  {active.collateral.map((c) => {
                    const Icon = KIND_ICON[c.kind];
                    return (
                      <div key={c.name} className="flex items-center gap-2.5 text-[13px]">
                        <Icon size={13} strokeWidth={1.5} className="text-text-tertiary" />
                        <span className="text-text-primary">{c.name}</span>
                        <span className="text-[11.5px] text-text-tertiary ml-auto">{c.size}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Memory timeline — the killer feature: append-only edit history */}
            <div className="bg-white border border-border rounded-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} strokeWidth={1.6} className="text-text-secondary" />
                  <div className="label-section">Memory · what we've learned</div>
                </div>
                <span className="text-[11px] text-text-tertiary">Append-only · most recent first</span>
              </div>
              <ol className="space-y-3 relative">
                {active.memory.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#111]" />
                      <div className="w-px flex-1 bg-border-subtle mt-1" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`pill ${MEMORY_TONE[e.kind]}`}>{MEMORY_LABEL[e.kind]}</span>
                        <span className="text-[11.5px] text-text-tertiary">{e.at}</span>
                        <span className="text-[11.5px] text-text-tertiary">·</span>
                        <span className="text-[11.5px] text-text-secondary inline-flex items-center gap-1">
                          {e.who === "Spot" ? <SpotMark size={11} /> : null}
                          {e.who}
                        </span>
                      </div>
                      <div className="text-[13px] text-text-primary leading-relaxed">{e.summary}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Spot CTA — the agentic action this surface affords */}
            <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-4 flex items-center gap-3">
              <SpotMark size={20} />
              <div className="flex-1">
                <div className="text-[13px] font-medium text-text-primary">Ready to launch with this memory?</div>
                <div className="text-[12px] text-text-secondary mt-0.5">
                  I'll pull these personas and brief the Creative Agent before we touch ad accounts.
                </div>
              </div>
              <button
                type="button"
                onClick={() => startLaunchFlow({ id: active.id, name: active.name })}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12px] font-medium"
              >
                <Sparkles size={12} strokeWidth={2} />
                Launch with Spot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-stat-md text-text-primary tabular">{value}</div>
      <div className="text-[11.5px] text-text-tertiary mt-0.5">{label}</div>
    </div>
  );
}

const HEALTH_TONE: Record<ProductSummary["performance"]["health"], { label: string; pill: string }> = {
  "on-track": { label: "On track", pill: "pill-ok" },
  "needs-attention": { label: "Needs attention", pill: "pill-warn" },
  underperforming: { label: "Underperforming", pill: "pill-err" },
};

function inr(n: number, compact = true) {
  if (compact) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

/**
 * Performance block — rolls up spend + leads + quality for this product.
 * Read-only on this page; the only edit affordance is "Ask Spot".
 */
function PerformanceBlock({ product }: { product: ProductSummary }) {
  const p = product.performance;
  const tone = HEALTH_TONE[p.health];
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle flex items-center gap-2">
        <TrendingUp size={12} strokeWidth={1.8} className="text-text-tertiary" />
        <span className="label-section">Performance</span>
        <span className="text-[11px] text-text-tertiary">· {p.window}</span>
        <span className="flex-1" />
        <span className={`pill ${tone.pill}`}>{tone.label}</span>
        <a
          href="/campaigns"
          className="inline-flex items-center gap-0.5 text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          View campaigns
          <ArrowUpRight size={11} strokeWidth={1.8} />
        </a>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border-subtle">
        <PerfStat label="Total spend" value={inr(p.totalSpend)} />
        <PerfStat label="Leads" value={p.totalLeads.toLocaleString("en-IN")} />
        <PerfStat label="Verified" value={p.verifiedLeads.toLocaleString("en-IN")} sub={`${p.verificationRate}% rate`} />
        <PerfStat label="Qualified" value={p.qualifiedLeads.toLocaleString("en-IN")} sub={`${p.qualificationRate}% rate`} />
      </div>
      <div className="grid grid-cols-3 divide-x divide-border-subtle border-t border-border-subtle">
        <PerfStat label="Avg CPL" value={inr(p.avgCpl, false)} dense />
        <PerfStat label="Cost / verified" value={inr(p.costPerVerifiedLead, false)} dense />
        <PerfStat label="Cost / qualified" value={inr(p.costPerQualifiedLead, false)} dense />
      </div>
    </div>
  );
}

function PerfStat({ label, value, sub, dense }: { label: string; value: string; sub?: string; dense?: boolean }) {
  return (
    <div className={dense ? "px-4 py-2.5" : "px-4 py-3"}>
      <div className="text-[11px] text-text-tertiary mb-0.5">{label}</div>
      <div className={`tabular text-text-primary ${dense ? "text-[14px] font-medium" : "text-stat-md"}`}>{value}</div>
      {sub && <div className="text-[11px] text-text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}
