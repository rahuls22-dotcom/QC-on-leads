"use client";

// Memory hub — Spot's brain, one route.
//
// We used to scatter Products / Personas / Creatives / Performance /
// Change history across five top-level nav items. That made the rail
// noisy and the platform feel sprawling. This page consolidates all of
// them into a single tabbed surface. Spot reads from this brain before
// it acts; humans read from it to audit what Spot has learned.
//
// Tabs:
//   · Products        — long-lived briefs + USPs + avoid list per product
//   · Personas        — cross-product audience archetypes
//   · Creatives       — every angle/asset Spot has built, aggregated
//   · Performance     — spend + leads rolled up by product
//   · Change history  — append-only timeline of memory writes
//
// Products + Personas reuse their existing standalone page components.
// We hide their internal page headers via a Tailwind arbitrary variant
// so Memory's own header is the only one in view.

import { useState } from "react";
import {
  BrainCircuit,
  Package,
  Users,
  Image as ImageIcon,
  TrendingUp,
  History,
  Film,
  Layout,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import ProductsPage from "../products/page";
import PersonasPage from "../personas/page";
import { PRODUCTS, type ProductSummary } from "@/lib/products-data";
import { PERSONAS, type PersonaCreative } from "@/lib/personas-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";

type TabKey = "products" | "personas" | "creatives" | "performance" | "changelog";

const TABS: { key: TabKey; label: string; icon: typeof Package; sub: string }[] = [
  { key: "products", label: "Products", icon: Package, sub: "Briefs · USPs · constraints" },
  { key: "personas", label: "Personas", icon: Users, sub: "Cross-product archetypes" },
  { key: "creatives", label: "Creatives", icon: ImageIcon, sub: "Every angle Spot has built" },
  { key: "performance", label: "Performance", icon: TrendingUp, sub: "Spend + leads · 30d roll-up" },
  { key: "changelog", label: "Change history", icon: History, sub: "Append-only memory writes" },
];

export default function MemoryPage() {
  const [tab, setTab] = useState<TabKey>("products");

  return (
    <div>
      {/* Memory header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-card bg-[#FAF8F2] border border-[#E8E3D5] flex items-center justify-center flex-shrink-0">
            <BrainCircuit size={18} strokeWidth={1.5} className="text-text-secondary" />
          </div>
          <div>
            <div className="text-meta text-text-secondary mb-0.5">Spot's brain</div>
            <h1 className="text-page-title text-text-primary">Memory</h1>
            <p className="text-meta text-text-secondary mt-1 max-w-[680px]">
              Everything Spot knows about your products, audiences, creatives and the changes you've made — in one
              place. Spot reads from here before it ever touches an ad account.
            </p>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-0.5 mb-5 border-b border-border-subtle overflow-x-auto -mx-1 px-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? "text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={13} strokeWidth={1.7} />
              {t.label}
              {active && (
                <span
                  aria-hidden
                  className="absolute left-2.5 right-2.5 -bottom-px h-0.5 bg-text-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div>
        {tab === "products" && (
          <div className="[&>div>div:first-child]:hidden">
            <ProductsPage />
          </div>
        )}
        {tab === "personas" && (
          <div className="[&>div>div:first-child]:hidden">
            <PersonasPage />
          </div>
        )}
        {tab === "creatives" && <CreativesTab />}
        {tab === "performance" && <PerformanceTab />}
        {tab === "changelog" && <ChangelogTab />}
      </div>
    </div>
  );
}

/* ─── Creatives tab ──────────────────────────────────────────── */

const KIND_ICON: Record<PersonaCreative["kind"], typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  carousel: Layout,
};

const STATE_DOT: Record<PersonaCreative["state"], string> = {
  live: "bg-[#22C55E]",
  ready: "bg-[#F5A623]",
  shell: "bg-[#D4D4D4]",
};

const STATE_LABEL: Record<PersonaCreative["state"], string> = {
  live: "Live",
  ready: "Ready",
  shell: "Shell",
};

/**
 * Aggregate creatives across every persona — flat grid with persona +
 * product tags so people can scan what's been built. Heavy-handed
 * filtering UI lives on the standalone /creatives route; this is the
 * memory-side view.
 */
function CreativesTab() {
  const askSpot = useSpotStore((s) => s.askSpot);
  const all = PERSONAS.flatMap((p) =>
    p.creatives.map((c) => ({
      ...c,
      personaName: p.shortLabel,
      productName: PRODUCTS.find((pr) => pr.id === c.productId)?.name ?? "—",
    })),
  );
  const live = all.filter((c) => c.state === "live").length;
  const ready = all.filter((c) => c.state === "ready").length;
  const shell = all.filter((c) => c.state === "shell").length;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total creatives" value={all.length} />
        <Stat label="Live" value={live} />
        <Stat label="Ready" value={ready} />
        <Stat label="Concept" value={shell} />
      </div>

      <div className="bg-white border border-border rounded-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="label-section">Every creative · {all.length}</div>
          <button
            type="button"
            onClick={() => askSpot("Draft a new creative angle — pick the strongest performer last week and iterate.")}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[11.5px] font-medium"
          >
            <SpotMark size={11} />
            Draft new angle
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {all.map((c) => {
            const KIcon = KIND_ICON[c.kind];
            return (
              <div
                key={c.id}
                className="rounded-card border border-border bg-white overflow-hidden hover:border-border-hover transition-colors"
              >
                <div
                  className="relative aspect-[4/3] w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${c.hue} 60% 92%) 0%, hsl(${c.hue} 50% 78%) 100%)`,
                  }}
                >
                  <div className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/85 backdrop-blur-sm">
                    <KIcon size={10} strokeWidth={1.8} />
                  </div>
                  <div className="absolute top-2 right-2 text-[9.5px] font-medium text-text-secondary bg-white/85 px-1.5 rounded-sm">
                    {c.format}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOT[c.state]}`} />
                    <span className="text-[10px] font-medium text-text-primary bg-white/85 px-1.5 py-0.5 rounded-sm">
                      {STATE_LABEL[c.state]}
                    </span>
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[12px] font-medium text-text-primary truncate">{c.label}</div>
                  <div className="text-[11px] text-text-tertiary truncate mt-0.5">
                    {c.productName}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary mt-1 inline-flex items-center gap-1">
                    <Users size={9} strokeWidth={1.6} />
                    {c.personaName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Performance tab ─────────────────────────────────────────── */

function inr(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

const HEALTH_TONE: Record<ProductSummary["performance"]["health"], string> = {
  "on-track": "pill-ok",
  "needs-attention": "pill-warn",
  underperforming: "pill-err",
};
const HEALTH_LABEL: Record<ProductSummary["performance"]["health"], string> = {
  "on-track": "On track",
  "needs-attention": "Needs attention",
  underperforming: "Underperforming",
};

/**
 * Cross-product roll-up. Same numbers each product page surfaces, but
 * laid out comparatively so it's a "where's the money going" view.
 */
function PerformanceTab() {
  const totalSpend = PRODUCTS.reduce((s, p) => s + p.performance.totalSpend, 0);
  const totalLeads = PRODUCTS.reduce((s, p) => s + p.performance.totalLeads, 0);
  const totalQual = PRODUCTS.reduce((s, p) => s + p.performance.qualifiedLeads, 0);
  const blendedCpl = totalLeads ? Math.round(totalSpend / totalLeads) : 0;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Spend · 30d" value={inr(totalSpend)} />
        <Stat label="Leads · 30d" value={totalLeads.toLocaleString("en-IN")} />
        <Stat label="Qualified · 30d" value={totalQual.toLocaleString("en-IN")} />
        <Stat label="Blended CPL" value={inr(blendedCpl)} />
      </div>

      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="grid grid-cols-[1.4fr_repeat(6,1fr)_120px] gap-3 px-4 py-2.5 border-b border-border bg-surface-page text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          <div>Product</div>
          <div className="text-right">Spend</div>
          <div className="text-right">Leads</div>
          <div className="text-right">Verified</div>
          <div className="text-right">Qual</div>
          <div className="text-right">CPL</div>
          <div className="text-right">CPQL</div>
          <div>Health</div>
        </div>
        {PRODUCTS.map((p, i) => {
          const perf = p.performance;
          return (
            <div
              key={p.id}
              className={`grid grid-cols-[1.4fr_repeat(6,1fr)_120px] gap-3 px-4 py-3 items-center hover-row ${
                i < PRODUCTS.length - 1 ? "border-b border-border-subtle" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-text-primary truncate">{p.name}</div>
                <div className="text-[11px] text-text-tertiary truncate">
                  {perf.activeCampaigns} active campaign{perf.activeCampaigns === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right text-[13px] text-text-primary tabular">{inr(perf.totalSpend)}</div>
              <div className="text-right text-[13px] text-text-primary tabular">
                {perf.totalLeads.toLocaleString("en-IN")}
              </div>
              <div className="text-right text-[13px] text-text-primary tabular">
                {perf.verifiedLeads.toLocaleString("en-IN")}
                <div className="text-[10.5px] text-text-tertiary">{perf.verificationRate}%</div>
              </div>
              <div className="text-right text-[13px] text-text-primary tabular">
                {perf.qualifiedLeads.toLocaleString("en-IN")}
                <div className="text-[10.5px] text-text-tertiary">{perf.qualificationRate}%</div>
              </div>
              <div className="text-right text-[13px] text-text-primary tabular">{inr(perf.avgCpl)}</div>
              <div className="text-right text-[13px] text-text-primary tabular">{inr(perf.costPerQualifiedLead)}</div>
              <div>
                <span className={`pill ${HEALTH_TONE[perf.health]}`}>{HEALTH_LABEL[perf.health]}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-[11.5px] text-text-tertiary inline-flex items-center gap-1">
        <ArrowUpRight size={11} strokeWidth={1.6} />
        <a href="/campaigns" className="hover:text-text-primary">Open the full Campaigns dashboard</a>
      </div>
    </div>
  );
}

/* ─── Changelog tab ────────────────────────────────────────────── */

type ChangelogEntry = {
  at: string;
  who: string;
  kind: string;
  tone: string;
  productName: string;
  summary: string;
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

/**
 * Cross-product append-only changelog. Pulls every memory entry across
 * every product, sorted newest-first. This is the audit log that proves
 * what Spot has learned and where the boundaries are.
 */
function ChangelogTab() {
  const entries: ChangelogEntry[] = PRODUCTS.flatMap((p) =>
    p.memory.map((m) => ({
      at: m.at,
      who: m.who,
      kind: MEMORY_LABEL[m.kind],
      tone: MEMORY_TONE[m.kind],
      productName: p.name,
      summary: m.summary,
    })),
  ).sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <Clock size={13} strokeWidth={1.6} className="text-text-secondary" />
          <div className="label-section">Memory · what Spot has learned</div>
        </div>
        <span className="text-[11px] text-text-tertiary">
          Append-only · {entries.length} entries · newest first
        </span>
      </div>
      <ol className="space-y-3">
        {entries.map((e, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#111]" />
              {i < entries.length - 1 && <div className="w-px flex-1 bg-border-subtle mt-1" />}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center flex-wrap gap-2 mb-0.5">
                <span className={`pill ${e.tone}`}>{e.kind}</span>
                <span className="text-[11.5px] text-text-tertiary">{e.at}</span>
                <span className="text-[11.5px] text-text-tertiary">·</span>
                <span className="text-[11.5px] text-text-secondary inline-flex items-center gap-1">
                  {e.who === "Spot" ? <SpotMark size={11} /> : null}
                  {e.who}
                </span>
                <span className="text-[11.5px] text-text-tertiary">·</span>
                <span className="text-[11.5px] text-text-primary font-medium">{e.productName}</span>
              </div>
              <div className="text-[13px] text-text-primary leading-relaxed">{e.summary}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─── Shared bits ──────────────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-border rounded-card p-3">
      <div className="text-[11.5px] text-text-tertiary mb-1">{label}</div>
      <div className="text-stat-md text-text-primary tabular">{value}</div>
    </div>
  );
}
