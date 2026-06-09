"use client";

// Shared campaigns table — extracted from the Campaigns page so the Project
// (= Product) detail page can render the exact same view, filtered to one
// product. The caller pre-filters `campaigns`; this component owns the rows,
// the metric-column system, the frozen lead column + scroll shadow, the
// Spot's-take hover card, and the once-a-day reveal animation.

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
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import {
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
import { TrendDeltaBadge } from "@/components/campaigns/metric-badges";

/* ─── Number helpers (exported for the page's rollup cards) ────── */

export function inr(n: number) {
  if (n === 0) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
export function num(n: number) {
  if (n === 0) return "—";
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}
export function pct(n: number) {
  if (n === 0) return "—";
  return `${n.toFixed(1)}%`;
}

// Freeze the lead column (campaign name + Spot's take) so it stays put while
// the metric columns scroll horizontally. The right shadow only appears once
// the table is actually scrolled.
function freezeStyle(bg: string, scrolled: boolean) {
  return {
    position: "sticky" as const,
    left: 0,
    zIndex: 5,
    background: bg,
    boxShadow: scrolled ? "6px 0 8px -6px rgba(0,0,0,0.10)" : undefined,
  };
}

/* ─── Status styling ───────────────────────────────────────────── */

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

/* ─── Metric catalog — the configurable column set ──────────────── */

export type MetricKey =
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
  short?: string;
  width: number;
  format: (m: EdTechMetrics) => string;
  deltaKey: keyof EdTechMetricDeltas;
};

// Derived helpers — link clicks ≈ spend / CPC.
function linkClicks(m: EdTechMetrics) {
  return m.cpc > 0 ? m.spend / m.cpc : 0;
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
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

// Default columns — the full ordered set. Impressions is pickable but off by default.
export const DEFAULT_METRICS: MetricKey[] = [
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
export const ALL_METRIC_KEYS: MetricKey[] = [
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

/* ─── Channel mark (shared with the page's ChannelFilter) ──────── */

/**
 * Tiny brand mark — Meta blue square with white "f", Google card with a
 * brand-blue "G". Reads cleanly at 12–14px without Lucide's brand icons.
 */
export function ChannelMark({
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

/* ═══════════════════════════════════════════════════════════════
 * The table itself.
 * ══════════════════════════════════════════════════════════════ */

export function CampaignsTable({
  campaigns,
  metrics = DEFAULT_METRICS,
  onOpenCampaign,
  emptyLabel = "No campaigns match your filters.",
}: {
  campaigns: EdTechCampaign[];
  metrics?: MetricKey[];
  onOpenCampaign?: (id: string) => void;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [scrolled, setScrolled] = useState(false);
  const revealedTakes = useSpotTakeReveal(campaigns.map((c) => c.id));
  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  const colTemplate = useMemo(() => {
    const metricCols = metrics.map((k) => `${METRIC_DEFS[k].width}px`).join(" ");
    return `minmax(330px,1.4fr) ${metricCols}`;
  }, [metrics]);

  const open = (id: string) =>
    onOpenCampaign ? onOpenCampaign(id) : router.push(`/campaigns/${id}`);

  return (
    <div
      className="bg-white border border-border rounded-card overflow-x-auto"
      onScroll={(e) => setScrolled(e.currentTarget.scrollLeft > 0)}
    >
      <div className="min-w-max">
        <TableHeader colTemplate={colTemplate} metrics={metrics} scrolled={scrolled} />
        {campaigns.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
            {emptyLabel}
          </div>
        ) : (
          campaigns.map((c) => (
            <CampaignRow
              key={c.id}
              c={c}
              metrics={metrics}
              colTemplate={colTemplate}
              expanded={!!expanded[c.id]}
              isAdsetExpanded={(id) => !!expanded[id]}
              onToggle={() => toggle(c.id)}
              onToggleAdset={(id) => toggle(id)}
              onOpen={() => open(c.id)}
              takeRevealed={revealedTakes.has(c.id)}
              scrolled={scrolled}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Table chrome ─────────────────────────────────────────────── */

function TableHeader({
  colTemplate,
  metrics,
  scrolled,
}: {
  colTemplate: string;
  metrics: MetricKey[];
  scrolled: boolean;
}) {
  return (
    <div
      className="grid gap-2 px-3 py-2.5 border-b border-border bg-surface-page text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary items-center"
      style={{ gridTemplateColumns: colTemplate }}
    >
      <div
        className="flex items-center gap-1 pr-2"
        style={freezeStyle("var(--bg-page)", scrolled)}
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
  scrolled,
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
  scrolled: boolean;
}) {
  return (
    <>
      <div
        className="grid gap-2 px-3 py-2.5 border-b border-border-subtle items-center hover-row"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div
          className="flex items-center gap-1.5 min-w-0 pr-2"
          style={freezeStyle("#FFFFFF", scrolled)}
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
            <MetricCell key={k} value={def.format(c.metrics)} delta={c.deltas[def.deltaKey]} />
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
            scrolled={scrolled}
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
  scrolled,
}: {
  a: EdTechAdSet;
  parent: EdTechCampaign;
  metrics: MetricKey[];
  colTemplate: string;
  expanded: boolean;
  onToggle: () => void;
  scrolled: boolean;
}) {
  return (
    <>
      <div
        className="grid gap-2 px-3 py-2 border-b border-border-subtle items-center hover-row bg-[#FAFAFA]"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <div
          className="flex items-center gap-1.5 min-w-0 pr-2"
          style={freezeStyle("#FAFAFA", scrolled)}
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
            <MetricCell key={k} value={def.format(a.metrics)} delta={a.deltas[def.deltaKey]} dense />
          );
        })}
      </div>
      {expanded &&
        a.ads.map((ad) => (
          <AdRow key={ad.id} ad={ad} parent={parent} metrics={metrics} colTemplate={colTemplate} scrolled={scrolled} />
        ))}
    </>
  );
}

function AdRow({
  ad,
  parent,
  metrics,
  colTemplate,
  scrolled,
}: {
  ad: EdTechAd;
  parent: EdTechCampaign;
  metrics: MetricKey[];
  colTemplate: string;
  scrolled: boolean;
}) {
  const KIcon = KIND_ICON[ad.kind];
  return (
    <div
      className="grid gap-2 px-3 py-1.5 border-b border-border-subtle items-center hover-row bg-white"
      style={{ gridTemplateColumns: colTemplate }}
    >
      <div
        className="flex items-center gap-2 min-w-0 pr-2"
        style={freezeStyle("#FFFFFF", scrolled)}
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
          <MetricCell key={k} value={def.format(ad.metrics)} delta={ad.deltas[def.deltaKey]} dense />
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
 * Spot's take — the health verdict, inline next to the campaign name. Filled in
 * on the first load of the day (row-by-row reveal). On hover, a portal card
 * opens with Spot's full reasoning + a verdict-specific button to start acting.
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
      setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 332) });
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
            <div className="flex items-center gap-1.5 mb-2">
              <SpotMark size={13} />
              <span className="text-[11px] font-semibold text-text-primary">Spot&apos;s take</span>
              <span
                className="ml-auto inline-flex items-center gap-1 h-[17px] px-1.5 rounded-full text-[10px] font-semibold"
                style={{ background: tone.bg, color: tone.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                {VERDICT_LABEL[take.verdict]}
              </span>
            </div>

            <div className="text-[12px] text-text-secondary leading-relaxed mb-2">
              {take.driver}
            </div>

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
 * First-load-of-the-day reveal. Each campaign's verdict appears one at a time
 * with a 2–3s gap; later loads the same day show everything at once (localStorage
 * date key).
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
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    allIds.forEach((id, i) => {
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
    // Run once on mount.
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
  onOpen?: () => void;
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
          <a
            href={metaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-text-tertiary hover:text-text-primary flex-shrink-0"
            title="Open in Meta"
          >
            <ArrowUpRight size={11} strokeWidth={1.8} />
          </a>
          {take && <InlineSpotTake c={take.c} revealed={take.revealed} />}
        </div>
        <div className={`text-text-tertiary truncate ${dense ? "text-[10.5px]" : "text-[11px]"} mt-0.5`}>
          {sub}
        </div>
      </div>
    </div>
  );
}

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
      <div className={`tabular text-text-primary ${dense ? "text-[12px]" : "text-[12.5px]"}`}>
        {value}
      </div>
      {value !== "—" && <TrendDeltaBadge delta={delta} className="mt-0.5" />}
    </div>
  );
}
