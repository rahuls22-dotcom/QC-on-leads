"use client";

// Dashboard — Spot-led Daily Brief at top, sparkline metric grid in the
// middle, a single big chart of selected metrics, then a product
// performance table, then recommendations + agents-at-work.
//
// Every metric card has an inline "Ask" button that drops the user into
// /spot pre-loaded with a question about that specific metric. The
// philosophy is consistent across the platform: see the data here, act
// on it via Spot.

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Megaphone,
  Bot,
  Mic,
  MessageSquare,
  Database,
  Image as ImageIcon,
  Pause,
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { useCurrentUser, useCurrentWorkspaceLabel } from "@/lib/workspace-store";
import { PRODUCTS, type ProductSummary } from "@/lib/products-data";
import {
  PENDING_RECOMMENDATIONS,
  PRODUCT_PLANS,
  PLAN_STATUS_TONE,
  PLAN_STATUS_LABEL,
  PLAN_ORIGIN_LABEL,
  type PendingRecommendation,
  type ProductPlan,
} from "@/lib/spot/extended-flows";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

function firstName(n: string) {
  return n.split(" ")[0] || n;
}
function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function inr(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

/* ─── Mocked content ──────────────────────────────────────────── */

type Brief = {
  timeLabel: string;
  thingsCount: number;
  body: React.ReactNode;
  prompts: { label: string; prompt: string }[];
};

const DAILY_BRIEF: Brief = {
  timeLabel: "9:02 AM",
  thingsCount: 2,
  body: (
    <>
      Yesterday: <b>118 demo-class bookings at ₹312 CPL</b> — a healthy day. But{" "}
      <b>JEE Crack · Self-Studier CPL is creeping up</b> (+22% w/w) and{" "}
      <b>NEET Pro CPQL hit ₹3.9K</b> — both worth looking at.
    </>
  ),
  prompts: [
    { label: "Explain JEE Crack CPL", prompt: "Why is Self-Studier CPL on JEE Crack up 22% week-on-week?" },
    { label: "Diagnose NEET Pro", prompt: "Diagnose NEET Pro — why did CPQL spike to ₹3.9K?" },
    { label: "Plan my day", prompt: "What should I act on first today across all my products?" },
  ],
};

type MetricDef = {
  key: string;
  label: string;
  value: string;
  delta: string;
  deltaUp: boolean;
  previous: string;
  /** 14 normalized values for the sparkline. */
  spark: number[];
  /** Spot prompt for the "Ask" button. */
  ask: string;
};

const baselineMetrics: MetricDef[] = [
  {
    key: "active",
    label: "Active campaigns",
    value: "9",
    delta: "+2",
    deltaUp: true,
    previous: "was 7",
    spark: [6, 7, 7, 7, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9],
    ask: "Which campaigns went live this week and how are they pacing?",
  },
  {
    key: "spend",
    label: "Spend · 30d",
    value: "₹12.9L",
    delta: "+₹90K",
    deltaUp: true,
    previous: "was ₹12L",
    spark: [4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9.2, 9.5, 9.8],
    ask: "Walk me through how spend has grown — which products absorbed the extra ₹90K?",
  },
  {
    key: "leads",
    label: "Total leads",
    value: "1,400",
    delta: "+91",
    deltaUp: true,
    previous: "was 1,309",
    spark: [800, 850, 880, 920, 980, 1020, 1060, 1110, 1180, 1230, 1280, 1320, 1370, 1400],
    ask: "Where did the extra leads come from — channel and persona?",
  },
  {
    key: "verified",
    label: "Verified leads",
    value: "242",
    delta: "+23",
    deltaUp: true,
    previous: "was 219 · 17% rate",
    spark: [120, 130, 140, 150, 165, 175, 185, 200, 210, 218, 225, 232, 238, 242],
    ask: "Is verification rate trending up or just absolute leads?",
  },
  {
    key: "qualified",
    label: "Qualified leads",
    value: "127",
    delta: "+5",
    deltaUp: true,
    previous: "was 122 · 9.1% rate",
    spark: [60, 65, 70, 78, 85, 92, 98, 105, 110, 115, 120, 122, 125, 127],
    ask: "Which products converted these qualified leads?",
  },
  {
    key: "cpl",
    label: "CPL",
    value: "₹919",
    delta: "-₹62",
    deltaUp: false,
    previous: "was ₹981",
    spark: [1100, 1080, 1060, 1040, 1020, 1000, 980, 970, 960, 950, 940, 930, 925, 919],
    ask: "Why is CPL improving — which campaigns drove the gain?",
  },
  {
    key: "cpvl",
    label: "CPVL",
    value: "₹5,354",
    delta: "+₹162",
    deltaUp: true, // bad: cost up
    previous: "was ₹5,192",
    spark: [4800, 4850, 4900, 4950, 5000, 5050, 5100, 5150, 5200, 5240, 5280, 5310, 5340, 5354],
    ask: "CPVL is creeping up — what's driving the drift?",
  },
  {
    key: "cpql",
    label: "CPQL",
    value: "₹10,156",
    delta: "+₹476",
    deltaUp: true, // bad
    previous: "was ₹9,680",
    spark: [9000, 9100, 9200, 9300, 9400, 9450, 9500, 9550, 9700, 9800, 9900, 10000, 10080, 10156],
    ask: "Diagnose CPQL — is it a single product or a workspace-wide drift?",
  },
];

const CHART_DATES = ["May 10","May 11","May 12","May 13","May 14","May 15","May 16","May 17","May 18","May 19","May 20","May 21","May 22","May 23"];

// Pending-approval recommendations are imported from extended-flows.ts
// so the same data drives the dashboard feed AND the workflow live state.

type AgentTask = {
  agent: string;
  icon: typeof Bot;
  detail: string;
  product?: string;
  state: "running" | "queued" | "done";
};

const AGENT_TASKS: AgentTask[] = [
  { agent: "Creative Agent", icon: ImageIcon, detail: "Drafting 8 statics for Engineer Parent", product: "JEE Crack", state: "running" },
  { agent: "Voice Agent", icon: Mic, detail: "12 demo-class follow-up calls queued", product: "JEE Crack", state: "queued" },
  { agent: "WhatsApp Agent", icon: MessageSquare, detail: "Nurture sequence · 318 leads in flight", product: "NEET Pro", state: "running" },
  { agent: "Enrichment", icon: Database, detail: "Truecaller + parent verification · 412 records", state: "running" },
];

/* ─── Page ────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const user = useCurrentUser();
  const wsLabel = useCurrentWorkspaceLabel();
  const askSpot = useSpotStore((s) => s.askSpot);

  // Product filter — all products vs a single product. Default to "all".
  const [productFilter, setProductFilter] = useState<"all" | string>("all");

  // Selected metrics for the big chart (max 2 to keep it readable).
  const [selected, setSelected] = useState<string[]>(["spend", "leads"]);
  const toggleSelected = (k: string) => {
    setSelected((curr) => {
      if (curr.includes(k)) return curr.filter((x) => x !== k);
      if (curr.length >= 2) return [curr[1], k];
      return [...curr, k];
    });
  };

  const metrics = baselineMetrics; // For now metrics don't actually filter by product; the slice is mock anyway.
  const chartMetrics = useMemo(
    () => metrics.filter((m) => selected.includes(m.key)),
    [metrics, selected],
  );

  // Aggregated product totals — used by the product perf table.
  const productRows = useMemo(() => {
    let rows = [...PRODUCTS];
    if (productFilter !== "all") rows = rows.filter((p) => p.id === productFilter);
    return rows.sort((a, b) => b.performance.totalSpend - a.performance.totalSpend);
  }, [productFilter]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-end justify-between mb-5">
        <div>
          <div className="text-meta text-text-tertiary mb-1">{wsLabel}</div>
          <h1 className="text-[22px] leading-[1.25] font-semibold text-text-primary">
            {timeGreeting()}, {firstName(user.name)}.
          </h1>
        </div>
        <ProductFilter value={productFilter} onChange={setProductFilter} />
      </motion.div>

      {/* Daily brief */}
      <motion.div variants={fadeUp} className="mb-5">
        <DailyBriefCard askSpot={askSpot} />
      </motion.div>

      {/* Active plans — long-lived plans Spot is working on, one per
          product. Status + current phase + next decision at a glance. */}
      <motion.div variants={fadeUp} className="mb-5">
        <ActivePlansCard />
      </motion.div>

      {/* Metric grid — 4×2 sparkline cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3 mb-5">
        {metrics.map((m) => (
          <MetricSparkCard
            key={m.key}
            metric={m}
            selected={selected.includes(m.key)}
            onToggle={() => toggleSelected(m.key)}
            onAsk={() => askSpot(m.ask)}
          />
        ))}
      </motion.div>

      {/* Big chart */}
      {chartMetrics.length > 0 && (
        <motion.div variants={fadeUp} className="mb-5">
          <BigChart metrics={chartMetrics} dates={CHART_DATES} />
        </motion.div>
      )}

      {/* Performance by product */}
      <motion.div variants={fadeUp} className="mb-5">
        <ProductPerformanceTable rows={productRows} />
      </motion.div>

      {/* Two-column footer */}
      <motion.div variants={fadeUp} className="grid grid-cols-[3fr_2fr] gap-4">
        <RecommendationsCard askSpot={askSpot} />
        <AgentsAtWorkCard />
      </motion.div>
    </motion.div>
  );
}

/* ─── Product filter ────────────────────────────────────────── */

function ProductFilter({ value, onChange }: { value: "all" | string; onChange: (v: "all" | string) => void }) {
  const [open, setOpen] = useState(false);
  const current = value === "all" ? "All products" : PRODUCTS.find((p) => p.id === value)?.name || "Product";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px] text-text-primary"
      >
        <span className="text-text-tertiary">Product:</span>
        <span className="font-medium">{current}</span>
        <ChevronDown size={11} strokeWidth={1.8} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 bg-white border border-border rounded-card shadow-card-hover py-1 min-w-[220px]">
            <ScopeRow label="All products" active={value === "all"} onClick={() => { onChange("all"); setOpen(false); }} />
            <div className="border-t border-border-subtle my-1" />
            {PRODUCTS.map((p) => (
              <ScopeRow
                key={p.id}
                label={p.name}
                active={value === p.id}
                onClick={() => { onChange(p.id); setOpen(false); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function ScopeRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-3 h-8 hover:bg-surface-secondary text-[12.5px] ${
        active ? "text-text-primary font-medium" : "text-text-secondary"
      }`}
    >
      <span className="flex-1 truncate">{label}</span>
      {active && <span className="text-[10px] text-text-tertiary">✓</span>}
    </button>
  );
}

/* ─── Daily Brief ───────────────────────────────────────────── */

function DailyBriefCard({ askSpot }: { askSpot: (q: string) => void }) {
  return (
    <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-4">
      <div className="flex items-start gap-3">
        <SpotMark size={22} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary">
              Daily Brief · {DAILY_BRIEF.timeLabel}
            </span>
            <span className="pill pill-warn" style={{ fontSize: 10 }}>
              {DAILY_BRIEF.thingsCount} things to look at
            </span>
          </div>
          <p className="text-[13.5px] text-text-primary leading-relaxed">{DAILY_BRIEF.body}</p>
          <div className="flex items-center flex-wrap gap-1.5 mt-3">
            {DAILY_BRIEF.prompts.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => askSpot(p.prompt)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border bg-white hover:border-border-hover text-[11.5px] text-text-secondary hover:text-text-primary"
              >
                <SpotMark size={10} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => askSpot("Walk me through this week's pulse — what's working and what's drifting?")}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] text-text-secondary hover:text-text-primary hover:bg-white/60 flex-shrink-0"
        >
          Open in chat
          <ArrowRight size={11} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

/* ─── Metric card with sparkline + Ask ───────────────────────── */

function MetricSparkCard({
  metric,
  selected,
  onToggle,
  onAsk,
}: {
  metric: MetricDef;
  selected: boolean;
  onToggle: () => void;
  onAsk: () => void;
}) {
  const DeltaIcon = metric.deltaUp ? ArrowUpRight : ArrowDownRight;
  // For cost metrics (CPL, CPVL, CPQL), "up" is bad. Crude detection: starts with ₹
  const isCost = metric.value.startsWith("₹");
  const deltaGood = isCost ? !metric.deltaUp : metric.deltaUp;
  return (
    <div
      className={`group relative bg-white border rounded-card p-3.5 transition-colors cursor-pointer ${
        selected ? "border-[#111] shadow-card-hover" : "border-border hover:border-border-hover"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[11.5px] text-text-secondary">{metric.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAsk();
          }}
          className="inline-flex items-center gap-1 h-5 px-1.5 rounded-[4px] border border-border bg-white hover:border-border-hover text-[10px] font-medium text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <SpotMark size={8} />
          Ask
        </button>
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className="text-[22px] leading-none font-semibold text-text-primary tabular">
          {metric.value}
        </div>
        <span
          className={`inline-flex items-center text-[11px] tabular ${
            deltaGood ? "text-[#15803D]" : "text-[#DC2626]"
          }`}
        >
          <DeltaIcon size={10} strokeWidth={2} />
          {metric.delta}
        </span>
      </div>
      <Sparkline values={metric.spark} good={deltaGood} />
      <div className="text-[10.5px] text-text-tertiary mt-1">{metric.previous}</div>
    </div>
  );
}

function Sparkline({ values, good }: { values: number[]; good: boolean }) {
  const W = 200;
  const H = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = W / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(" ");
  const last = values[values.length - 1];
  const lx = (values.length - 1) * stepX;
  const ly = H - ((last - min) / range) * H;
  const stroke = "#0A0A0A";
  const fill = good ? "rgba(34,197,94,0.06)" : "rgba(220,38,38,0.06)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2" preserveAspectRatio="none" style={{ height: H }}>
      <polyline
        points={`0,${H} ${points} ${W},${H}`}
        fill={fill}
        stroke="none"
      />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={2} fill="#0A0A0A" />
    </svg>
  );
}

/* ─── Big chart ─────────────────────────────────────────────── */

function BigChart({ metrics, dates }: { metrics: MetricDef[]; dates: string[] }) {
  const W = 1180;
  const H = 220;
  // Each metric line normalised independently. We'll plot up to 2 metrics.
  const colors = ["#0A0A0A", "#6B6B6B"];

  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <TrendingUp size={13} strokeWidth={1.8} className="text-text-tertiary" />
        <span className="text-[12.5px] font-medium text-text-primary">
          {metrics.length} metric{metrics.length === 1 ? "" : "s"} · last 14 days
        </span>
        <div className="flex items-center gap-2 ml-2">
          {metrics.map((m, i) => (
            <span key={m.key} className="inline-flex items-center gap-1 text-[11.5px] text-text-secondary">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: colors[i] }} />
              {m.label}
            </span>
          ))}
        </div>
        <span className="flex-1" />
        <span className="text-[11px] text-text-tertiary">Click any metric card to add or swap</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full" preserveAspectRatio="none" style={{ height: H + 30 }}>
        {/* Horizontal gridlines */}
        {[0, 1, 2, 3].map((g) => (
          <line
            key={g}
            x1={40}
            x2={W - 10}
            y1={(g / 3) * H + 10}
            y2={(g / 3) * H + 10}
            stroke="#F0F0F0"
            strokeWidth={1}
          />
        ))}
        {/* Lines */}
        {metrics.map((m, mi) => {
          const min = Math.min(...m.spark);
          const max = Math.max(...m.spark);
          const range = max - min || 1;
          const stepX = (W - 60) / Math.max(m.spark.length - 1, 1);
          const points = m.spark
            .map((v, i) => `${(i * stepX + 40).toFixed(1)},${((1 - (v - min) / range) * H + 10).toFixed(1)}`)
            .join(" ");
          const last = m.spark[m.spark.length - 1];
          const lx = (m.spark.length - 1) * stepX + 40;
          const ly = (1 - (last - min) / range) * H + 10;
          return (
            <g key={m.key}>
              <polyline
                points={points}
                fill="none"
                stroke={colors[mi]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={lx} cy={ly} r={3.5} fill={colors[mi]} />
            </g>
          );
        })}
        {/* X-axis dates */}
        {dates.map((d, i) => {
          if (i % 3 !== 0 && i !== dates.length - 1) return null;
          const stepX = (W - 60) / Math.max(dates.length - 1, 1);
          return (
            <text
              key={d}
              x={i * stepX + 40}
              y={H + 25}
              textAnchor="middle"
              fontSize={9.5}
              fill="#9B9B9B"
              fontFamily="ui-monospace, monospace"
            >
              {d}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Product performance table ──────────────────────────────── */

const HEALTH_TONE: Record<ProductSummary["performance"]["health"], { label: string; pill: string }> = {
  "on-track": { label: "On track", pill: "pill-ok" },
  "needs-attention": { label: "Needs attention", pill: "pill-warn" },
  underperforming: { label: "Underperforming", pill: "pill-err" },
};

function ProductPerformanceTable({ rows }: { rows: ProductSummary[] }) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
        <span className="label-section">Performance by product</span>
        <span className="flex-1" />
        <Link
          href="/products"
          className="inline-flex items-center gap-0.5 text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          All products
          <ArrowUpRight size={11} strokeWidth={1.8} />
        </Link>
      </div>
      <div className="grid grid-cols-[1.4fr_100px_90px_100px_100px_140px] gap-3 px-4 py-2 border-b border-border-subtle bg-surface-page text-[10.5px] font-medium uppercase tracking-wider text-text-tertiary">
        <div>Product</div>
        <div className="text-right">Spend (30d)</div>
        <div className="text-right">Leads</div>
        <div className="text-right">CPL</div>
        <div className="text-right">Qual. rate</div>
        <div>Status</div>
      </div>
      {rows.map((p) => {
        const tone = HEALTH_TONE[p.performance.health];
        return (
          <Link
            key={p.id}
            href="/products"
            className="grid grid-cols-[1.4fr_100px_90px_100px_100px_140px] gap-3 px-4 py-3 border-b border-border-subtle items-center hover-row last:border-b-0"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-text-primary truncate">{p.name}</div>
              <div className="text-[11px] text-text-tertiary truncate">
                {p.client} · {p.performance.activeCampaigns} live campaign
                {p.performance.activeCampaigns === 1 ? "" : "s"}
              </div>
            </div>
            <div className="text-right text-[13px] text-text-primary tabular">{inr(p.performance.totalSpend)}</div>
            <div className="text-right text-[13px] text-text-primary tabular">{p.performance.totalLeads.toLocaleString("en-IN")}</div>
            <div className="text-right text-[13px] text-text-primary tabular">{inr(p.performance.avgCpl)}</div>
            <div className="text-right text-[13px] text-text-primary tabular">{p.performance.qualificationRate}%</div>
            <div>
              <span className={`pill ${tone.pill}`}>{tone.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ─── Recommendations feed ──────────────────────────────────────
 *
 * Surfaces Spot's pending asks from any active diagnostic plan running
 * across the workspace. Each chip carries enough context (evidence +
 * projected impact) for a 5-second decision. Approve ships it; Dismiss
 * defers it to the next watch cycle.
 *
 * The data lives in extended-flows.ts (PENDING_RECOMMENDATIONS) so
 * the same shape can render both here and inside the workflow live state.
 */

const URGENCY_TONE: Record<PendingRecommendation["urgency"], { pill: string; ring: string; icon: string }> = {
  high: { pill: "pill-err", ring: "bg-[#FEE2E2]", icon: "text-[#B91C1C]" },
  medium: { pill: "pill-warn", ring: "bg-[#FEF3C7]", icon: "text-[#92400E]" },
  low: { pill: "pill-info", ring: "bg-[#EFF6FF]", icon: "text-[#1D4ED8]" },
};

const SOURCE_VERB: Record<PendingRecommendation["sourceKind"], string> = {
  scale: "Scale plan",
  optimize: "Optimize plan",
  "test-angles": "Angle test",
  "launch-campaign": "Launch plan",
};

function RecommendationsCard({ askSpot }: { askSpot: (q: string) => void }) {
  const recs = PENDING_RECOMMENDATIONS;
  const highCount = recs.filter((r) => r.urgency === "high").length;

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-1.5">
        <SpotMark size={12} />
        <span className="label-section">Approvals needed</span>
        <span className="flex-1" />
        {highCount > 0 && (
          <span className="pill pill-err inline-flex items-center gap-1" style={{ fontSize: 10 }}>
            {highCount} urgent
          </span>
        )}
        <span className="text-[11px] text-text-tertiary">
          {recs.length} pending · from active plans
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {recs.map((r) => (
          <DashboardRecommendation key={r.id} rec={r} askSpot={askSpot} />
        ))}
      </div>
    </div>
  );
}

function DashboardRecommendation({
  rec,
  askSpot,
}: {
  rec: PendingRecommendation;
  askSpot: (q: string) => void;
}) {
  const tone = URGENCY_TONE[rec.urgency];
  const Icon = rec.urgency === "high" ? Pause : rec.urgency === "medium" ? Megaphone : Sparkles;

  return (
    <div className="px-4 py-3 hover-row">
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ${tone.ring}`}>
          <Icon size={12} strokeWidth={1.8} className={tone.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
            <span className="text-[13px] font-semibold text-text-primary">{rec.title}</span>
            <span className={`pill ${tone.pill}`} style={{ fontSize: 10 }}>
              {rec.urgency}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary mb-1">
            {SOURCE_VERB[rec.sourceKind]} · {rec.sourceProduct} · {rec.surfacedAt}
          </div>
          <div className="text-[12px] text-text-secondary leading-snug mb-1.5">{rec.detail}</div>
          {rec.evidence.length > 0 && (
            <ul className="space-y-0.5 mb-1.5">
              {rec.evidence.slice(0, 3).map((e, i) => (
                <li key={i} className="text-[11px] text-text-tertiary flex gap-1.5">
                  <span>·</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-[11.5px] text-text-secondary mt-1.5 pt-1.5 border-t border-border-subtle">
            <span className="text-text-tertiary">If approved:</span> {rec.projectedImpact}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => askSpot(`Apply: ${rec.title}. Detail: ${rec.detail}`)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[11.5px] font-medium"
          >
            <SpotMark size={10} />
            Approve
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center h-7 px-2.5 rounded-button text-[11px] text-text-tertiary hover:text-text-primary hover:bg-surface-secondary"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Active plans ────────────────────────────────────────── */

/**
 * Compact summary of every active long-lived plan in the workspace.
 * Goal · status · current phase · next decision · pending approvals
 * count. Tapping a row drops the user into Memory > Plans.
 */
function ActivePlansCard() {
  // Order plans: active first, then drafting, then watching/paused.
  const order: ProductPlan["status"][] = ["active", "drafting", "watching", "paused"];
  const sorted = [...PRODUCT_PLANS].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  );
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-1.5">
        <SpotMark size={12} />
        <span className="label-section">Active execution plans</span>
        <span className="flex-1" />
        <Link
          href="/memory"
          className="text-[11px] text-text-tertiary hover:text-text-primary inline-flex items-center gap-1"
        >
          See all in Memory
          <ArrowUpRight size={10} strokeWidth={1.8} />
        </Link>
      </div>
      <div className="divide-y divide-border-subtle">
        {sorted.map((plan) => (
          <ActivePlanRow key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}

function ActivePlanRow({ plan }: { plan: ProductPlan }) {
  const product = PRODUCTS.find((p) => p.id === plan.productId);
  return (
    <Link
      href="/memory"
      className="block px-4 py-3 hover-row group"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
            <span className="text-[12.5px] font-semibold text-text-primary">
              {product?.name || plan.productId}
            </span>
            <span className="text-[10.5px] text-text-tertiary">·</span>
            <span className="text-[10.5px] text-text-secondary">
              {PLAN_ORIGIN_LABEL[plan.origin]}
            </span>
            <span className={`pill ${PLAN_STATUS_TONE[plan.status]}`}>
              {PLAN_STATUS_LABEL[plan.status]}
            </span>
            {plan.pendingRecs > 0 && (
              <span className="pill pill-warn" style={{ fontSize: 10 }}>
                {plan.pendingRecs} pending approval{plan.pendingRecs === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="text-[12px] text-text-secondary leading-snug truncate">
            {plan.goal}
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {plan.dayLabel}
            {plan.nextDecision !== "—" && (
              <>
                <span className="mx-1">·</span>
                next decision <span className="text-text-secondary">{plan.nextDecision}</span>
              </>
            )}
          </div>
        </div>
        <ArrowUpRight
          size={13}
          strokeWidth={1.8}
          className="text-text-tertiary group-hover:text-text-primary flex-shrink-0"
        />
      </div>
    </Link>
  );
}

/* ─── Agents at work ──────────────────────────────────────── */

function AgentsAtWorkCard() {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-1.5">
        <Bot size={12} strokeWidth={1.8} className="text-text-tertiary" />
        <span className="label-section">Agents at work</span>
        <span className="flex-1" />
        <span className="pill pill-ok inline-flex items-center gap-1" style={{ fontSize: 10 }}>
          <span className="w-1 h-1 rounded-full bg-[#22C55E] inline-block animate-pulse" />
          Live
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {AGENT_TASKS.map((t, i) => (
          <div key={i} className="px-4 py-3 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <t.icon size={12} strokeWidth={1.6} className="text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[12.5px] font-medium text-text-primary">{t.agent}</span>
                {t.product && <span className="text-[11px] text-text-tertiary">· {t.product}</span>}
              </div>
              <div className="text-[12px] text-text-secondary leading-snug">{t.detail}</div>
            </div>
            <span
              className={`pill ${
                t.state === "running" ? "pill-info" : t.state === "queued" ? "pill" : "pill-ok"
              }`}
              style={{ fontSize: 10 }}
            >
              {t.state === "running" ? "Running" : t.state === "queued" ? "Queued" : "Done"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
