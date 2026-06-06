"use client";

// Campaigns dashboard — read-only hierarchical view.
//
// Three things make this view dense without being cluttered:
//
//   1) Configurable metrics — every column past Name/Health is picked
//      from a Metrics dropdown. Default shows the 7 columns that
//      matter most; the user can add Verified, Qualified count, CPC,
//      Impressions, etc.
//
//   2) Trend deltas everywhere — top stat cards and every row cell
//      carry a ↑/↓ % delta vs the prior period. Cost metrics invert
//      colour (lower is better).
//
//   3) Per-row inline actions — no separate "Actions" column. Open in
//      Meta is a tiny inline ↗. "Edit" is a filled black SpotMark
//      pill — visually distinct so people notice they CAN ask Spot
//      to change anything, but small enough not to dominate.
//
// Top-of-page controls, left → right:
//   · Product filter   · Channel filter   · Metrics picker   · Search
// And on the right edge: Global date range (conventional placement).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Image as ImageIcon,
  Film,
  Layout,
  Search,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Sliders,
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import {
  edTechCampaigns,
  productOptions,
  type EdTechAd,
  type EdTechAdSet,
  type EdTechCampaign,
  type EdTechCampaignStatus,
  type EdTechMetrics,
  type EdTechMetricDeltas,
  type TrendDelta,
} from "@/lib/campaigns-edtech";
import {
  computeSpotTake,
  VERDICT_LABEL,
  VERDICT_TONE,
  type HealthVerdict,
  type SignalLevel,
} from "@/lib/spot/campaign-health";

/* ─── Status + health styling ──────────────────────────────────── */

const STATUS_DOT: Record<EdTechCampaignStatus, string> = {
  enabled: "bg-[#22C55E]",
  paused: "bg-[#F5A623]",
  draft: "bg-[#D4D4D4]",
};
const STATUS_LABEL: Record<EdTechCampaignStatus, string> = {
  enabled: "Live",
  paused: "Paused",
  draft: "Draft",
};

const KIND_ICON: Record<EdTechAd["kind"], typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  carousel: Layout,
  search: Search,
};

/* ─── Number helpers ────────────────────────────────────────────── */

function inr(n: number) {
  if (n === 0) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
function num(n: number) {
  if (n === 0) return "—";
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}
function pct(n: number) {
  if (n === 0) return "—";
  return `${n.toFixed(1)}%`;
}

// Freeze the lead column (campaign name + Spot's take) so it stays put while
// the metric columns scroll horizontally. `bg` must be opaque to occlude the
// scrolling cells; the right shadow marks the freeze line.
function freezeStyle(bg: string) {
  return {
    position: "sticky" as const,
    left: 0,
    zIndex: 5,
    background: bg,
    boxShadow: "6px 0 8px -6px rgba(0,0,0,0.10)",
  };
}

/* ─── Metric catalog — the configurable column set ──────────────── */

/** Every metric the user can pin to the table. Each carries a label,
 *  the matching value + delta key, how to render it, whether it's a
 *  cost (lower is better), and how wide the column should be. */
type MetricKey =
  | "spend"
  | "impressions"
  | "cpm"
  | "ctr"
  | "cpc"
  | "leads"
  | "verified"
  | "qualified"
  | "conversionRate"
  | "verificationRate"
  | "qualificationRate"
  | "cpl"
  | "cpvl"
  | "costPerQualified";

type MetricDef = {
  key: MetricKey;
  label: string;
  /** Shorter label for the column header — defaults to `label`. */
  short?: string;
  /** Column width in px. */
  width: number;
  /** Render the metric value from a metrics object to a string. */
  format: (m: EdTechMetrics) => string;
  /** Which delta to read from EdTechMetricDeltas. */
  deltaKey: keyof EdTechMetricDeltas;
};

// Derived helpers — link clicks ≈ spend / CPC; conversion rate = leads per
// link click; CPVL = spend per verified lead.
function linkClicks(m: EdTechMetrics) {
  return m.cpc > 0 ? m.spend / m.cpc : 0;
}

const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  spend: {
    key: "spend",
    label: "Spend",
    width: 88,
    format: (m) => inr(m.spend),
    deltaKey: "spend",
  },
  cpm: {
    key: "cpm",
    label: "CPM · Ad delivery cost",
    short: "CPM",
    width: 72,
    format: (m) => inr(m.cpm),
    deltaKey: "cpm",
  },
  ctr: {
    key: "ctr",
    label: "CTR · Link click-through rate",
    short: "CTR",
    width: 70,
    format: (m) => `${m.ctr.toFixed(2)}%`,
    deltaKey: "ctr",
  },
  cpc: {
    key: "cpc",
    label: "CPC · Traffic cost",
    short: "CPC",
    width: 70,
    format: (m) => inr(m.cpc),
    deltaKey: "cpc",
  },
  leads: {
    key: "leads",
    label: "Leads",
    width: 72,
    format: (m) => num(m.leads),
    deltaKey: "leads",
  },
  verified: {
    key: "verified",
    label: "Verified leads",
    short: "Verified",
    width: 80,
    format: (m) => num(m.verified),
    deltaKey: "verified",
  },
  qualified: {
    key: "qualified",
    label: "Qualified leads",
    short: "Qualified",
    width: 82,
    format: (m) => num(m.qualified),
    deltaKey: "qualified",
  },
  conversionRate: {
    key: "conversionRate",
    label: "Conversion rate · leads / link click",
    short: "Conv %",
    width: 76,
    format: (m) => {
      const c = linkClicks(m);
      return c > 0 ? pct((m.leads / c) * 100) : "—";
    },
    // No dedicated delta — track leads as the directional proxy.
    deltaKey: "leads",
  },
  verificationRate: {
    key: "verificationRate",
    label: "Verification rate",
    short: "Verif %",
    width: 78,
    format: (m) => pct(m.verificationRate),
    deltaKey: "verificationRate",
  },
  qualificationRate: {
    key: "qualificationRate",
    label: "QL rate · qualification rate",
    short: "QL %",
    width: 72,
    format: (m) => pct(m.qualificationRate),
    deltaKey: "qualificationRate",
  },
  cpl: {
    key: "cpl",
    label: "CPL · Cost per lead",
    short: "CPL",
    width: 76,
    format: (m) => inr(m.cpl),
    deltaKey: "cpl",
  },
  cpvl: {
    key: "cpvl",
    label: "CPVL · Cost per verified lead",
    short: "CPVL",
    width: 82,
    format: (m) => inr(m.verified > 0 ? Math.round(m.spend / m.verified) : 0),
    // Cost metric — borrow CPQL's inverted delta so ↑ reads red.
    deltaKey: "costPerQualified",
  },
  costPerQualified: {
    key: "costPerQualified",
    label: "CPQL · Cost per qualified lead",
    short: "CPQL",
    width: 84,
    format: (m) => inr(m.costPerQualified),
    deltaKey: "costPerQualified",
  },
  impressions: {
    key: "impressions",
    label: "Impressions",
    short: "Impr",
    width: 80,
    format: (m) => num(m.impressions),
    deltaKey: "impressions",
  },
};

// Default columns — the full ordered set the user spec'd. Impressions is
// pickable but not shown by default.
const DEFAULT_METRICS: MetricKey[] = [
  "spend",
  "cpm",
  "ctr",
  "cpc",
  "leads",
  "verified",
  "qualified",
  "conversionRate",
  "verificationRate",
  "qualificationRate",
  "cpl",
  "cpvl",
  "costPerQualified",
];

// Canonical order the picker preserves (default set + impressions option).
const ALL_METRIC_KEYS: MetricKey[] = [
  "spend",
  "cpm",
  "ctr",
  "cpc",
  "impressions",
  "leads",
  "verified",
  "qualified",
  "conversionRate",
  "verificationRate",
  "qualificationRate",
  "cpl",
  "cpvl",
  "costPerQualified",
];

/* ─── Date range ────────────────────────────────────────────────── */

const DATE_RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "custom", label: "Custom range" },
] as const;
type DateRange = (typeof DATE_RANGES)[number]["key"];

/* ─── Page ──────────────────────────────────────────────────────── */

type ChannelFilterValue = "all" | "Meta" | "Google";

export default function CampaignsPage() {
  const router = useRouter();
  // Spot's take is filled in row-by-row on the first load of the day.
  const revealedTakes = useSpotTakeReveal(edTechCampaigns.map((c) => c.id));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<"all" | string>("all");
  const [channel, setChannel] = useState<ChannelFilterValue>("all");
  const [range, setRange] = useState<DateRange>("30d");
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(DEFAULT_METRICS);

  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const products = productOptions();

  const filtered = useMemo(() => {
    return edTechCampaigns.filter((c) => {
      if (productId !== "all" && c.productId !== productId) return false;
      if (channel !== "all" && c.channel !== channel) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.productName.toLowerCase().includes(q);
    });
  }, [query, productId, channel]);

  // Roll-ups — totals + a weighted-by-current-value blended delta so
  // the top cards aren't just dead numbers. Each card delta is the
  // sum(metric · delta) / sum(metric) across the filtered set.
  const rollup = useMemo(() => {
    const sumMetric = (k: keyof EdTechMetrics) =>
      filtered.reduce((s, c) => s + (c.metrics[k] as number), 0);
    const weightedDelta = (k: keyof EdTechMetricDeltas, valueKey: keyof EdTechMetrics) => {
      const total = sumMetric(valueKey);
      if (!total) return 0;
      const weighted =
        filtered.reduce(
          (s, c) => s + (c.metrics[valueKey] as number) * c.deltas[k].pct,
          0,
        ) / total;
      return +weighted.toFixed(1);
    };
    const spend = sumMetric("spend");
    const leads = sumMetric("leads");
    const verified = sumMetric("verified");
    const qualified = sumMetric("qualified");
    const blendedCpl = leads ? Math.round(spend / leads) : 0;
    const blendedCpql = qualified ? Math.round(spend / qualified) : 0;
    // Blended CPL/CPQL deltas: derived from spend vs leads deltas;
    // approximating because we don't have prior-period absolute values.
    const spendDelta = weightedDelta("spend", "spend");
    const leadsDelta = weightedDelta("leads", "leads");
    const qualifiedDelta = weightedDelta("qualified", "qualified");
    const verifiedDelta = weightedDelta("verified", "verified");
    // Cost delta ≈ spend% − leads% (rough but useful directionally).
    const blendedCplDelta = +((spendDelta - leadsDelta) || 0).toFixed(1);
    const blendedCpqlDelta = +((spendDelta - qualifiedDelta) || 0).toFixed(1);
    return {
      spend,
      leads,
      verified,
      qualified,
      blendedCpl,
      blendedCpql,
      spendDelta,
      leadsDelta,
      qualifiedDelta,
      verifiedDelta,
      blendedCplDelta,
      blendedCpqlDelta,
    };
  }, [filtered]);

  const liveCount = filtered.filter((c) => c.status === "enabled").length;

  // Build the dynamic grid-template-columns string off the picked
  // metrics. Status dot · name(flex) · ...metrics · health(120).
  const colTemplate = useMemo(() => {
    const metricCols = selectedMetrics.map((k) => `${METRIC_DEFS[k].width}px`).join(" ");
    // Single frozen lead column (status + name + Spot's take); metrics scroll.
    return `minmax(330px,1.4fr) ${metricCols}`;
  }, [selectedMetrics]);

  return (
    <div>
      {/* Page header · one Spot button, not twenty. Open a campaign to
          dig in; Spot's take rides on every row. */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-meta text-text-secondary mb-1">Growth · Live spend</div>
          <h1 className="text-page-title text-text-primary">Campaigns</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[680px]">
            Every Meta and Google campaign in one read-only view. Open a campaign
            to dig in, jump to Meta with the inline ↗, or ask Spot anything.
          </p>
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

      {/* Filters strip — product · channel · metrics · search on the
          left; date range pinned to the right (conventional). */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <ProductFilter value={productId} onChange={setProductId} options={products} />
        <ChannelFilter value={channel} onChange={setChannel} />
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
        {/* Spacer pushes date range to the right edge. */}
        <span className="flex-1" />
        <DateRangeChip value={range} onChange={setRange} />
      </div>

      {/* Roll-up strip — each card now carries a trend delta so they
          don't read as static numbers. */}
      <div className="grid grid-cols-5 gap-2.5 mb-4">
        <StatCard
          label="Spend"
          value={inr(rollup.spend)}
          delta={{ pct: rollup.spendDelta }}
        />
        <StatCard
          label="Leads"
          value={num(rollup.leads)}
          delta={{ pct: rollup.leadsDelta }}
        />
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

      {/* Table — horizontally scrollable when many metric columns are on. */}
      <div className="bg-white border border-border rounded-card overflow-x-auto">
        <div className="min-w-max">
          <TableHeader colTemplate={colTemplate} metrics={selectedMetrics} />
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
              No campaigns match your filters.
            </div>
          ) : (
            filtered.map((c) => (
              <CampaignRow
                key={c.id}
                c={c}
                metrics={selectedMetrics}
                colTemplate={colTemplate}
                expanded={!!expanded[c.id]}
                isAdsetExpanded={(id) => !!expanded[id]}
                onToggle={() => toggle(c.id)}
                onToggleAdset={(id) => toggle(id)}
                onOpen={() => router.push(`/campaigns/${c.id}`)}
                takeRevealed={revealedTakes.has(c.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Filters ──────────────────────────────────────────────────── */

function DateRangeChip({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const current = DATE_RANGES.find((r) => r.key === value)!;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-button border border-border bg-white hover:border-border-hover text-[12px] font-medium text-text-primary"
      >
        <Calendar size={12} strokeWidth={1.7} className="text-text-secondary" />
        {current.label}
        <ChevronDown size={11} strokeWidth={1.8} className="text-text-tertiary" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Right-aligned since this chip lives on the right edge. */}
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-border rounded-card shadow-card-hover py-1">
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  onChange(r.key);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-page ${
                  r.key === value ? "text-text-primary font-medium" : "text-text-secondary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Channel filter — All / Meta / Google. Each item shows the same
 * little brand-coloured mark that appears on every row so the user
 * can instantly tie filter ↔ row marker.
 */
function ChannelFilter({
  value,
  onChange,
}: {
  value: ChannelFilterValue;
  onChange: (v: ChannelFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value === "all" ? "All channels" : value;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-button border border-border bg-white hover:border-border-hover text-[12px] font-medium text-text-primary"
      >
        {value === "all" ? (
          <Filter size={11} strokeWidth={1.7} className="text-text-secondary" />
        ) : (
          <ChannelMark channel={value} size={12} />
        )}
        {label}
        <ChevronDown size={11} strokeWidth={1.8} className="text-text-tertiary" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-border rounded-card shadow-card-hover py-1">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-page inline-flex items-center gap-2 ${
                value === "all" ? "text-text-primary font-medium" : "text-text-secondary"
              }`}
            >
              <Filter size={11} strokeWidth={1.7} className="text-text-tertiary" />
              All channels
            </button>
            <div className="my-1 h-px bg-border-subtle" />
            {(["Meta", "Google"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-page inline-flex items-center gap-2 ${
                  value === c ? "text-text-primary font-medium" : "text-text-secondary"
                }`}
              >
                <ChannelMark channel={c} size={12} />
                {c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Tiny brand mark — Meta blue square with white "f", Google card with
 * a brand-blue "G". We don't ship Lucide's deprecated brand icons;
 * these inline marks read cleanly at 12-14px.
 */
function ChannelMark({
  channel,
  size = 14,
}: {
  channel: "Meta" | "Google";
  size?: number;
}) {
  if (channel === "Meta") {
    return (
      <span
        title="Meta"
        className="inline-flex items-center justify-center rounded-[3px] bg-[#1877F2] text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.72), lineHeight: 1 }}
      >
        f
      </span>
    );
  }
  return (
    <span
      title="Google"
      className="inline-flex items-center justify-center rounded-[3px] bg-white border border-[#E5E5E5] font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.7), lineHeight: 1 }}
    >
      <span style={{ color: "#4285F4" }}>G</span>
    </span>
  );
}

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
  const current = value === "all" ? "All products" : options.find((o) => o.id === value)?.name ?? "Product";
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
              All products
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

/**
 * Metrics picker — multi-select dropdown that drives which columns
 * the table renders. Each metric has a fixed display width pulled
 * from METRIC_DEFS so the table layout stays predictable.
 */
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
      // Always keep at least one metric selected.
      if (next.size === 1) return;
      next.delete(k);
    } else {
      next.add(k);
    }
    // Preserve canonical order so columns don't shuffle on each toggle.
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

/* ─── Table chrome ─────────────────────────────────────────────── */

function TableHeader({
  colTemplate,
  metrics,
}: {
  colTemplate: string;
  metrics: MetricKey[];
}) {
  return (
    <div
      className="grid gap-2 px-3 py-2.5 border-b border-border bg-surface-page text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary items-center"
      style={{ gridTemplateColumns: colTemplate }}
    >
      <div
        className="flex items-center gap-1 pr-2"
        style={freezeStyle("var(--bg-page)")}
      >
        Campaign
        <span className="text-text-tertiary/70 normal-case font-normal tracking-normal">
          · Spot&apos;s take
        </span>
      </div>
      {metrics.map((k) => (
        <div key={k} className="text-right">
          {METRIC_DEFS[k].short ?? METRIC_DEFS[k].label}
        </div>
      ))}
    </div>
  );
}

/* ─── Rows ─────────────────────────────────────────────────────── */

function CampaignRow({
  c,
  metrics,
  colTemplate,
  expanded,
  isAdsetExpanded,
  onToggle,
  onToggleAdset,
  onOpen,
  takeRevealed,
}: {
  c: EdTechCampaign;
  metrics: MetricKey[];
  colTemplate: string;
  expanded: boolean;
  isAdsetExpanded: (id: string) => boolean;
  onToggle: () => void;
  onToggleAdset: (id: string) => void;
  onOpen: () => void;
  takeRevealed: boolean;
}) {
  return (
    <>
      <div
        className="grid gap-2 px-3 py-2.5 border-b border-border-subtle items-center hover-row"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div
          className="flex items-center gap-1.5 min-w-0 pr-2"
          style={freezeStyle("#FFFFFF")}
        >
          <StatusDot status={c.status} />
          <div className="flex-1 min-w-0">
            <NameCell
              name={c.name}
              channel={c.channel}
              sub={`${c.objective} · ${c.productName} · ${c.adsets.length} ad set${c.adsets.length === 1 ? "" : "s"}`}
              metaUrl={c.metaUrl}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
              take={{ c, revealed: takeRevealed }}
            />
          </div>
        </div>
        {metrics.map((k) => {
          const def = METRIC_DEFS[k];
          return (
            <MetricCell
              key={k}
              value={def.format(c.metrics)}
              delta={c.deltas[def.deltaKey]}
            />
          );
        })}
      </div>

      {expanded &&
        c.adsets.map((a) => (
          <AdSetRow
            key={a.id}
            a={a}
            parent={c}
            metrics={metrics}
            colTemplate={colTemplate}
            expanded={isAdsetExpanded(a.id)}
            onToggle={() => onToggleAdset(a.id)}
          />
        ))}
    </>
  );
}

function AdSetRow({
  a,
  parent,
  metrics,
  colTemplate,
  expanded,
  onToggle,
}: {
  a: EdTechAdSet;
  parent: EdTechCampaign;
  metrics: MetricKey[];
  colTemplate: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div
        className="grid gap-2 px-3 py-2 border-b border-border-subtle items-center hover-row bg-[#FAFAFA]"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div
          className="flex items-center gap-1.5 min-w-0 pr-2"
          style={freezeStyle("#FAFAFA")}
        >
          <StatusDot status={a.status} />
          <div className="flex-1 min-w-0">
            <NameCell
              name={a.name}
              channel={parent.channel}
              sub={`Ad set · ${a.ads.length} ad${a.ads.length === 1 ? "" : "s"}`}
              metaUrl={a.metaUrl}
              expanded={expanded}
              onToggle={onToggle}
              indent={1}
              dense
            />
          </div>
        </div>
        {metrics.map((k) => {
          const def = METRIC_DEFS[k];
          return (
            <MetricCell
              key={k}
              value={def.format(a.metrics)}
              delta={a.deltas[def.deltaKey]}
              dense
            />
          );
        })}
      </div>
      {expanded &&
        a.ads.map((ad) => (
          <AdRow
            key={ad.id}
            ad={ad}
            parent={parent}
            metrics={metrics}
            colTemplate={colTemplate}
          />
        ))}
    </>
  );
}

function AdRow({
  ad,
  parent,
  metrics,
  colTemplate,
}: {
  ad: EdTechAd;
  parent: EdTechCampaign;
  metrics: MetricKey[];
  colTemplate: string;
}) {
  const KIcon = KIND_ICON[ad.kind];
  return (
    <div
      className="grid gap-2 px-3 py-1.5 border-b border-border-subtle items-center hover-row bg-white"
      style={{ gridTemplateColumns: colTemplate }}
    >
      <div
        className="flex items-center gap-2 min-w-0 pr-2"
        style={freezeStyle("#FFFFFF")}
      >
        <StatusDot status={ad.status} />
        <div className="flex items-center gap-2 min-w-0 pl-7 flex-1">
          <KIcon size={11} strokeWidth={1.6} className="text-text-tertiary flex-shrink-0" />
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <span className="text-[11.5px] text-text-primary truncate">{ad.name}</span>
            <span className="text-[10px] text-text-tertiary flex-shrink-0">· {ad.format}</span>
            <a
              href={ad.metaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-text-tertiary hover:text-text-primary flex-shrink-0"
              title="Open in Meta"
            >
              <ArrowUpRight size={11} strokeWidth={1.8} />
            </a>
          </div>
        </div>
      </div>
      {metrics.map((k) => {
        const def = METRIC_DEFS[k];
        return (
          <MetricCell
            key={k}
            value={def.format(ad.metrics)}
            delta={ad.deltas[def.deltaKey]}
            dense
          />
        );
      })}
    </div>
  );
}

/* ─── Cells ────────────────────────────────────────────────────── */

function StatusDot({ status }: { status: EdTechCampaignStatus }) {
  return (
    <div
      title={STATUS_LABEL[status]}
      className="inline-flex items-center justify-center"
      style={{ width: 14 }}
    >
      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]} inline-block`} />
    </div>
  );
}

// Each verdict offers one next move with Spot.
const VERDICT_CTA: Record<HealthVerdict, string> = {
  healthy: "Scale up",
  watch: "Dive deeper",
  "at-risk": "Optimise",
  stabilizing: "What's working?",
};

const SIGNAL_DOT: Record<SignalLevel, string> = {
  green: "#22C55E",
  amber: "#CA8A04",
  red: "#EF4444",
};

/**
 * Spot's take — the health verdict, inline next to the campaign name (where
 * "Spot it" used to sit). Filled in by Spot on the first load of the day
 * (row-by-row reveal): a pulsing "reviewing…" state → a colored verdict
 * badge. On hover, a portal card opens with Spot's full reasoning and a
 * verdict-specific button to start acting (Scale up / Dive deeper /
 * Optimise / What's working?).
 */
function InlineSpotTake({ c, revealed }: { c: EdTechCampaign; revealed: boolean }) {
  const router = useRouter();
  const startScaleFlow = useSpotStore((s) => s.startScaleFlow);
  const startOptimizeFlow = useSpotStore((s) => s.startOptimizeFlow);
  const startCampaignDive = useSpotStore((s) => s.startCampaignDive);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({
        top: r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - 332),
      });
    }
    setOpen(true);
  };
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 140);
  };

  if (!revealed) {
    return (
      <span className="inline-flex items-center gap-1 text-text-tertiary flex-shrink-0">
        <span className="inline-flex animate-pulse">
          <SpotMark size={10} />
        </span>
        <span className="text-[10px] italic">reviewing…</span>
      </span>
    );
  }

  const take = computeSpotTake(c);
  const tone = VERDICT_TONE[take.verdict];

  const act = () => {
    const product = { id: c.productId, name: c.productName };
    if (take.verdict === "healthy") startScaleFlow(product);
    else if (take.verdict === "at-risk") startOptimizeFlow(product);
    else
      startCampaignDive({
        id: c.id,
        name: c.name,
        tier: "campaign",
        productId: c.productId,
        productName: c.productName,
        channel: c.channel,
        metaUrl: c.metaUrl,
      });
    router.push("/spot");
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        className="inline-flex items-center gap-1 h-[17px] px-1.5 rounded-full text-[10px] font-semibold flex-shrink-0 cursor-default"
        style={{ background: tone.bg, color: tone.text }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
        {VERDICT_LABEL[take.verdict]}
      </span>

      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
            className="fadeUp"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: 320,
              zIndex: 200,
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
              padding: 12,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-2">
              <SpotMark size={13} />
              <span className="text-[11px] font-semibold text-text-primary">
                Spot&apos;s take
              </span>
              <span
                className="ml-auto inline-flex items-center gap-1 h-[17px] px-1.5 rounded-full text-[10px] font-semibold"
                style={{ background: tone.bg, color: tone.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                {VERDICT_LABEL[take.verdict]}
              </span>
            </div>

            {/* Reasoning */}
            <div className="text-[12px] text-text-secondary leading-relaxed mb-2">
              {take.driver}
            </div>

            {/* Signal breakdown */}
            {take.signals.length > 0 && (
              <div className="space-y-1 mb-3 pt-2 border-t border-border-subtle">
                {take.signals.map((s) => (
                  <div key={s.key} className="flex items-start gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: SIGNAL_DOT[s.level] }}
                    />
                    <span className="text-[11px] text-text-secondary leading-snug">
                      <span className="font-medium text-text-primary">{s.label}</span>
                      {" · "}
                      {s.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* CTA — start acting with Spot */}
            <button
              type="button"
              onClick={act}
              className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12px] font-medium transition-colors"
            >
              <SpotMark size={12} />
              {VERDICT_CTA[take.verdict]}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * First-load-of-the-day reveal. The verdict for each campaign appears one at
 * a time with a 2–3s gap — Spot visibly "reviewing" the book. Tracked via a
 * localStorage date key so later loads the same day show everything at once.
 */
function useSpotTakeReveal(allIds: string[]): Set<string> {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const KEY = "revspot:spot-takes-revealed";
    let storedDate: string | null = null;
    let today = "";
    try {
      today = new Date().toDateString();
      storedDate = window.localStorage.getItem(KEY);
    } catch {
      // SSR / no storage — just reveal all.
    }
    if (!today || storedDate === today) {
      setRevealed(new Set(allIds));
      return;
    }
    // Animate the reveal, then stamp today's date so it only runs once/day.
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    allIds.forEach((id, i) => {
      // 2–3s per row, deterministic-ish (varies by index, no Math.random in SSR concerns).
      cumulative += 2000 + ((i * 700) % 1000);
      timers.push(
        setTimeout(() => {
          setRevealed((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
        }, cumulative),
      );
    });
    timers.push(
      setTimeout(() => {
        try {
          window.localStorage.setItem(KEY, today);
        } catch {
          /* ignore */
        }
      }, cumulative + 100),
    );
    return () => timers.forEach(clearTimeout);
    // Run once on mount — allIds is stable (module-level campaign list).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return revealed;
}

function NameCell({
  name,
  channel,
  sub,
  metaUrl,
  expanded,
  onToggle,
  onOpen,
  take,
  indent = 0,
  dense,
}: {
  name: string;
  channel?: EdTechCampaign["channel"];
  sub: string;
  metaUrl: string;
  expanded: boolean;
  onToggle: () => void;
  /** When provided, the name becomes a link that opens the detail page. */
  onOpen?: () => void;
  /** Spot's take rides inline next to the name (campaign rows only). */
  take?: { c: EdTechCampaign; revealed: boolean };
  indent?: number;
  dense?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: indent * 16 }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex-shrink-0 inline-flex items-center justify-center w-4 h-4 rounded text-text-secondary hover:bg-surface-secondary"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {/* Channel mark — first glance tells you Meta vs Google. Slightly
          dimmed on nested rows (indent > 0) so the parent reads first. */}
      {channel && (
        <span className={indent > 0 ? "opacity-60" : ""}>
          <ChannelMark channel={channel} size={dense ? 12 : 14} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {onOpen ? (
            <button
              type="button"
              onClick={onOpen}
              className={`font-medium text-text-primary truncate text-left hover:underline ${
                dense ? "text-[12px]" : "text-[12.5px]"
              }`}
              title="Open campaign"
            >
              {name}
            </button>
          ) : (
            <span className={`font-medium text-text-primary truncate ${dense ? "text-[12px]" : "text-[12.5px]"}`}>
              {name}
            </span>
          )}
          {/* Inline Open in Meta — tiny ↗ icon, no chrome */}
          <a
            href={metaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-text-tertiary hover:text-text-primary flex-shrink-0"
            title="Open in Meta"
          >
            <ArrowUpRight size={11} strokeWidth={1.8} />
          </a>
          {/* Spot's take — sits where "Spot it" used to, glanceable. */}
          {take && <InlineSpotTake c={take.c} revealed={take.revealed} />}
        </div>
        <div className={`text-text-tertiary truncate ${dense ? "text-[10.5px]" : "text-[11px]"} mt-0.5`}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/**
 * Metric value + trend arrow. Colour:
 *   · ↑ green / ↓ red for positive metrics (leads, CTR, qual rate)
 *   · ↑ red / ↓ green for cost metrics (CPL, CPM, CPQL — `invert: true`)
 * Zero / no-data renders a flat dash.
 */
function MetricCell({
  value,
  delta,
  dense,
}: {
  value: string;
  delta: TrendDelta;
  dense?: boolean;
}) {
  return (
    <div className="text-right">
      <div className={`tabular text-text-primary ${dense ? "text-[12px]" : "text-[12.5px]"}`}>{value}</div>
      {value !== "—" && <TrendDeltaBadge delta={delta} className="mt-0.5" />}
    </div>
  );
}

/** Shared inline trend badge — used in MetricCell + StatCard. */
function TrendDeltaBadge({
  delta,
  className = "",
  size = "sm",
}: {
  delta: TrendDelta;
  className?: string;
  size?: "sm" | "md";
}) {
  const pctNum = delta.pct;
  const isZero = Math.abs(pctNum) < 0.5;
  const good = delta.invert ? pctNum < 0 : pctNum > 0;
  const Icon = isZero ? Minus : pctNum > 0 ? TrendingUp : TrendingDown;
  const color = isZero
    ? "text-text-tertiary"
    : good
      ? "text-[#15803D]"
      : "text-[#B91C1C]";
  return (
    <div
      className={`inline-flex items-center gap-0.5 tabular ${color} ${className} ${
        size === "md" ? "text-[11px]" : "text-[10px]"
      }`}
    >
      <Icon size={size === "md" ? 11 : 9} strokeWidth={2} />
      <span>{isZero ? "0%" : `${Math.abs(pctNum).toFixed(1)}%`}</span>
      {size === "md" && (
        <span className="text-text-tertiary ml-0.5 text-[10.5px]">vs prior</span>
      )}
    </div>
  );
}

/**
 * Top-of-page stat card — value + label + an inline trend badge.
 * Trend lifts the cards from "static numbers" to "movement".
 */
function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta: TrendDelta;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-2.5">
      <div className="text-[11px] text-text-tertiary mb-0.5">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-[18px] font-medium text-text-primary tabular leading-tight">{value}</div>
      </div>
      <TrendDeltaBadge delta={delta} size="md" className="mt-1" />
    </div>
  );
}
