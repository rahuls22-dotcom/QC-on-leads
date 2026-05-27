"use client";

// Campaigns dashboard — rebuilt.
//
// Read-only by design: every row is a hierarchical entity (Campaign →
// Ad Set → Ad). The only edit paths Revspot supports are:
//   · "Open in Meta" — a tiny inline arrow next to the row name
//   · "Ask Spot to edit" — a small button with the SpotMark
//
// The old version had a wide Actions column and a separate Status
// column. Both ate space we'd rather use for metrics + trends. This
// version pushes Open in Meta into the row name itself (inline ↗),
// makes Status a small dot/pill in the leftmost column, and devotes
// the rest of the row to dense metrics with up/down trend deltas.
//
// Top-of-page controls:
//   · Global date range (Last 7d / 30d / 90d)
//   · Product filter (defaults to All, or a Guyju's product)
//   · Channel filter (All / Meta / Google) — also reflected on every
//     row via a small brand-coloured mark before the campaign name.

import { useMemo, useState } from "react";
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
  type EdTechHealth,
  type TrendDelta,
} from "@/lib/campaigns-edtech";

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

const HEALTH_TONE: Record<EdTechHealth, string> = {
  "on-track": "pill-ok",
  "needs-attention": "pill-warn",
  underperforming: "pill-err",
};
const HEALTH_LABEL: Record<EdTechHealth, string> = {
  "on-track": "On track",
  "needs-attention": "Needs attention",
  underperforming: "Off",
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
  const askSpot = useSpotStore((s) => s.askSpot);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<"all" | string>("all");
  const [channel, setChannel] = useState<ChannelFilterValue>("all");
  const [range, setRange] = useState<DateRange>("30d");

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

  // Roll-ups across the filtered set.
  const totalSpend = filtered.reduce((s, c) => s + c.metrics.spend, 0);
  const totalLeads = filtered.reduce((s, c) => s + c.metrics.leads, 0);
  const totalQual = filtered.reduce((s, c) => s + c.metrics.qualified, 0);
  const liveCount = filtered.filter((c) => c.status === "enabled").length;
  const blendedCpl = totalLeads ? Math.round(totalSpend / totalLeads) : 0;
  const blendedCpql = totalQual ? Math.round(totalSpend / totalQual) : 0;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-meta text-text-secondary mb-1">Growth · Live spend</div>
          <h1 className="text-page-title text-text-primary">Campaigns</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[680px]">
            Every Meta and Google campaign in one read-only view. Spot owns the edits — tap "Ask Spot to edit" on any
            row, or jump to Meta to make the change manually.
          </p>
        </div>
        <button
          type="button"
          onClick={() => askSpot("Diagnose this week across all campaigns — where should I act?")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px] font-medium"
        >
          <SpotMark size={13} />
          Diagnose with Spot
        </button>
      </div>

      {/* Filters strip — date · product · channel · search all live at top */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <DateRangeChip value={range} onChange={setRange} />
        <ProductFilter value={productId} onChange={setProductId} options={products} />
        <ChannelFilter value={channel} onChange={setChannel} />
        <div className="relative flex-1 max-w-[280px] min-w-[160px]">
          <Search size={13} strokeWidth={1.8} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaigns…"
            className="w-full h-8 pl-7 pr-3 rounded-button border border-border bg-white text-[12.5px] placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
          />
        </div>
        <span className="ml-auto text-[11.5px] text-text-tertiary">
          {filtered.length} campaign{filtered.length === 1 ? "" : "s"} · {liveCount} live
        </span>
      </div>

      {/* Roll-up strip */}
      <div className="grid grid-cols-5 gap-2.5 mb-4">
        <Stat label="Spend" value={inr(totalSpend)} />
        <Stat label="Leads" value={num(totalLeads)} />
        <Stat label="Qualified" value={num(totalQual)} />
        <Stat label="Blended CPL" value={inr(blendedCpl)} />
        <Stat label="Blended CPQL" value={inr(blendedCpql)} />
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <TableHeader />
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
            No campaigns match your filters.
          </div>
        ) : (
          filtered.map((c) => (
            <CampaignRow
              key={c.id}
              c={c}
              expanded={!!expanded[c.id]}
              isAdsetExpanded={(id) => !!expanded[id]}
              onToggle={() => toggle(c.id)}
              onToggleAdset={(id) => toggle(id)}
              askSpot={askSpot}
            />
          ))
        )}
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
          <div
            className="absolute left-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-border rounded-card shadow-card-hover py-1"
          >
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
 * Tiny brand mark drawn inline — Meta blue rounded square with a
 * lowercase "f"; Google card with the multi-coloured "G" reduced to
 * a single brand-blue "G" on white for readability at 12-14px.
 *
 * We don't ship Lucide's deprecated brand icons; these are minimal
 * inline marks that read at glance scale.
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
          <div
            className="absolute left-0 top-full mt-1 z-20 min-w-[240px] bg-white border border-border rounded-card shadow-card-hover py-1"
          >
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

/* ─── Table chrome ─────────────────────────────────────────────── */

// Column template — narrow status pill on the left, name takes flex,
// then dense metric columns. No standalone "Actions" column anymore;
// the Ask Spot button is appended after the row name.
const COLS =
  "grid-cols-[14px_minmax(0,1.6fr)_88px_70px_70px_88px_82px_82px_92px_120px]";
// One row to rule them all: status dot · name (+ inline actions) · spend · CPM · CTR · leads · CPL · qual rate · CPQL · health

function TableHeader() {
  return (
    <div
      className={`grid ${COLS} gap-2 px-3 py-2.5 border-b border-border bg-surface-page text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary items-center`}
    >
      <div></div>
      <div>Campaign</div>
      <div className="text-right">Spend</div>
      <div className="text-right">CPM</div>
      <div className="text-right">CTR</div>
      <div className="text-right">Leads</div>
      <div className="text-right">CPL</div>
      <div className="text-right">Qual %</div>
      <div className="text-right">CPQL</div>
      <div>Health</div>
    </div>
  );
}

/* ─── Rows ─────────────────────────────────────────────────────── */

function CampaignRow({
  c,
  expanded,
  isAdsetExpanded,
  onToggle,
  onToggleAdset,
  askSpot,
}: {
  c: EdTechCampaign;
  expanded: boolean;
  isAdsetExpanded: (id: string) => boolean;
  onToggle: () => void;
  onToggleAdset: (id: string) => void;
  askSpot: (q: string) => void;
}) {
  return (
    <>
      <div
        className={`grid ${COLS} gap-2 px-3 py-2.5 border-b border-border-subtle items-center hover-row`}
      >
        <StatusDot status={c.status} />
        <NameCell
          name={c.name}
          channel={c.channel}
          sub={`${c.objective} · ${c.productName} · ${c.adsets.length} ad set${c.adsets.length === 1 ? "" : "s"}`}
          metaUrl={c.metaUrl}
          expanded={expanded}
          onToggle={onToggle}
          onAskSpot={() =>
            askSpot(`Edit campaign "${c.name}" — diagnose and propose the change, then apply on Meta.`)
          }
        />
        <MetricCell value={inr(c.metrics.spend)} delta={c.deltas.spend} />
        <MetricCell value={inr(c.metrics.cpm)} delta={c.deltas.cpm} />
        <MetricCell value={`${c.metrics.ctr.toFixed(2)}%`} delta={c.deltas.ctr} />
        <MetricCell value={num(c.metrics.leads)} delta={c.deltas.leads} />
        <MetricCell value={inr(c.metrics.cpl)} delta={c.deltas.cpl} />
        <MetricCell
          value={c.metrics.qualificationRate ? `${c.metrics.qualificationRate.toFixed(1)}%` : "—"}
          delta={c.deltas.qualificationRate}
        />
        <MetricCell value={inr(c.metrics.costPerQualified)} delta={c.deltas.costPerQualified} />
        <HealthCell health={c.health} />
      </div>

      {expanded &&
        c.adsets.map((a) => (
          <AdSetRow
            key={a.id}
            a={a}
            channel={c.channel}
            expanded={isAdsetExpanded(a.id)}
            onToggle={() => onToggleAdset(a.id)}
            askSpot={askSpot}
          />
        ))}
    </>
  );
}

function AdSetRow({
  a,
  channel,
  expanded,
  onToggle,
  askSpot,
}: {
  a: EdTechAdSet;
  channel: EdTechCampaign["channel"];
  expanded: boolean;
  onToggle: () => void;
  askSpot: (q: string) => void;
}) {
  return (
    <>
      <div
        className={`grid ${COLS} gap-2 px-3 py-2 border-b border-border-subtle items-center hover-row bg-[#FAFAFA]`}
      >
        <StatusDot status={a.status} />
        <NameCell
          name={a.name}
          channel={channel}
          sub={`Ad set · ${a.ads.length} ad${a.ads.length === 1 ? "" : "s"}`}
          metaUrl={a.metaUrl}
          expanded={expanded}
          onToggle={onToggle}
          onAskSpot={() => askSpot(`Adjust ad set "${a.name}" — audience or schedule. Apply on Meta when ready.`)}
          indent={1}
          dense
        />
        <MetricCell value={inr(a.metrics.spend)} delta={a.deltas.spend} dense />
        <MetricCell value={inr(a.metrics.cpm)} delta={a.deltas.cpm} dense />
        <MetricCell value={`${a.metrics.ctr.toFixed(2)}%`} delta={a.deltas.ctr} dense />
        <MetricCell value={num(a.metrics.leads)} delta={a.deltas.leads} dense />
        <MetricCell value={inr(a.metrics.cpl)} delta={a.deltas.cpl} dense />
        <MetricCell
          value={`${a.metrics.qualificationRate.toFixed(1)}%`}
          delta={a.deltas.qualificationRate}
          dense
        />
        <MetricCell value={inr(a.metrics.costPerQualified)} delta={a.deltas.costPerQualified} dense />
        <div />
      </div>
      {expanded && a.ads.map((ad) => <AdRow key={ad.id} ad={ad} askSpot={askSpot} />)}
    </>
  );
}

function AdRow({ ad, askSpot }: { ad: EdTechAd; askSpot: (q: string) => void }) {
  const KIcon = KIND_ICON[ad.kind];
  return (
    <div className={`grid ${COLS} gap-2 px-3 py-1.5 border-b border-border-subtle items-center hover-row bg-white`}>
      <StatusDot status={ad.status} />
      <div className="flex items-center gap-2 min-w-0 pl-9">
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
          <button
            type="button"
            onClick={() => askSpot(`Swap creative or copy on ad "${ad.name}". Propose and apply on Meta.`)}
            className="inline-flex items-center gap-1 h-5 px-1.5 rounded-[5px] hover:bg-surface-secondary text-text-tertiary hover:text-text-primary text-[10px] font-medium flex-shrink-0"
            title="Ask Spot to edit this ad"
          >
            <SpotMark size={9} />
            Edit
          </button>
        </div>
      </div>
      <MetricCell value={inr(ad.metrics.spend)} delta={ad.deltas.spend} dense />
      <MetricCell value={inr(ad.metrics.cpm)} delta={ad.deltas.cpm} dense />
      <MetricCell value={`${ad.metrics.ctr.toFixed(2)}%`} delta={ad.deltas.ctr} dense />
      <MetricCell value={num(ad.metrics.leads)} delta={ad.deltas.leads} dense />
      <MetricCell value={inr(ad.metrics.cpl)} delta={ad.deltas.cpl} dense />
      <MetricCell
        value={`${ad.metrics.qualificationRate.toFixed(1)}%`}
        delta={ad.deltas.qualificationRate}
        dense
      />
      <MetricCell value={inr(ad.metrics.costPerQualified)} delta={ad.deltas.costPerQualified} dense />
      <div />
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

function NameCell({
  name,
  channel,
  sub,
  metaUrl,
  expanded,
  onToggle,
  onAskSpot,
  indent = 0,
  dense,
}: {
  name: string;
  channel?: EdTechCampaign["channel"];
  sub: string;
  metaUrl: string;
  expanded: boolean;
  onToggle: () => void;
  onAskSpot: () => void;
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
          <span className={`font-medium text-text-primary truncate ${dense ? "text-[12px]" : "text-[12.5px]"}`}>
            {name}
          </span>
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
          {/* Inline Ask Spot — small button, SpotMark only — no separate logo */}
          <button
            type="button"
            onClick={onAskSpot}
            className={`inline-flex items-center gap-1 rounded-[5px] hover:bg-surface-secondary text-text-tertiary hover:text-text-primary font-medium flex-shrink-0 ${
              dense ? "h-5 px-1.5 text-[10px]" : "h-5 px-1.5 text-[10.5px]"
            }`}
            title="Ask Spot to edit"
          >
            <SpotMark size={9} />
            Edit
          </button>
        </div>
        <div className={`text-text-tertiary truncate ${dense ? "text-[10.5px]" : "text-[11px]"} mt-0.5`}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/**
 * Metric value + trend arrow. Trend arrows are coloured:
 *   · ↑ green / ↓ red for positive metrics (leads, CTR, qual rate)
 *   · ↑ red / ↓ green for cost metrics (CPL, CPM, CPQL — `invert: true`)
 * Zero / no-data renders a flat dash (—).
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
  const pct = delta.pct;
  const isZero = Math.abs(pct) < 0.5;
  // "good" = arrow direction colour: for normal metrics up is good.
  // For invert metrics (costs), down is good.
  const good = delta.invert ? pct < 0 : pct > 0;
  const Icon = isZero ? Minus : pct > 0 ? TrendingUp : TrendingDown;
  const color = isZero
    ? "text-text-tertiary"
    : good
      ? "text-[#15803D]"
      : "text-[#B91C1C]";

  return (
    <div className="text-right">
      <div className={`tabular text-text-primary ${dense ? "text-[12px]" : "text-[12.5px]"}`}>{value}</div>
      {value !== "—" && (
        <div className={`inline-flex items-center gap-0.5 text-[10px] tabular ${color} mt-0.5`}>
          <Icon size={9} strokeWidth={2} />
          <span>{isZero ? "0%" : `${Math.abs(pct).toFixed(1)}%`}</span>
        </div>
      )}
    </div>
  );
}

function HealthCell({ health }: { health: EdTechHealth }) {
  return (
    <span className={`pill ${HEALTH_TONE[health]}`}>{HEALTH_LABEL[health]}</span>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-border rounded-card p-2.5">
      <div className="text-[11px] text-text-tertiary mb-0.5">{label}</div>
      <div className="text-[16px] font-medium text-text-primary tabular">{value}</div>
    </div>
  );
}
