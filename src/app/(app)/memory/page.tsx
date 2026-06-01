"use client";

// Memory · product-centric.
//
// Layout:
//
//   ┌──────────────┬────────────────────────────────────────────┐
//   │ Products     │ [ Brief | Plan | Performance | Assets ]    │
//   │ (sidebar)    │                                            │
//   │  • JEE Crack │  (tab content fills the rest of the area)  │
//   │  • NEET Pro  │                                            │
//   │  • Foundation│                                            │
//   └──────────────┴────────────────────────────────────────────┘
//
// Each product behaves like a project inside memory. Inside that
// project sit four "files":
//
//   product-info.md   → Brief tab (rendered markdown)
//   plan.md           → Plan tab (rendered markdown)
//   performance.html  → Performance tab (interactive dashboard)
//   assets/           → Assets tab (creatives + landing pages + forms)

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Package,
  FileText,
  Target,
  TrendingUp,
  Boxes,
  CheckCircle2,
  Image as ImageIcon,
  Film,
  Layout,
  Smartphone,
  ArrowUpRight,
  History,
  Search,
} from "lucide-react";
import { PRODUCTS } from "@/lib/products-data";
import { MEMORY_FILES, memoryFilesFor, type ProductMemoryFiles } from "@/lib/spot/memory-files";
import { PRODUCT_PLANS, PLAN_STATUS_TONE, PLAN_STATUS_LABEL } from "@/lib/spot/extended-flows";
import { Markdown } from "@/components/memory/md-render";

type TabKey = "brief" | "plan" | "performance" | "assets" | "history";

const TABS: { key: TabKey; label: string; icon: typeof FileText; file: string }[] = [
  { key: "brief", label: "Product brief", icon: FileText, file: "product-info.md" },
  { key: "plan", label: "Execution plan", icon: Target, file: "execution-plan.md" },
  { key: "performance", label: "Performance", icon: TrendingUp, file: "performance.html" },
  { key: "assets", label: "Assets", icon: Boxes, file: "assets/" },
  { key: "history", label: "Change history", icon: History, file: "change-history.md" },
];

export default function MemoryPage() {
  return (
    <Suspense fallback={<div />}>
      <MemoryPageInner />
    </Suspense>
  );
}

function MemoryPageInner() {
  const searchParams = useSearchParams();
  // `?focus=<productId>` lets callers (eg. View Project Memory from the
  // launch flow) open this page already scoped to a specific product.
  // Demo: always lands on Spoken English for new product flows.
  const initialId = (() => {
    const focus = searchParams.get("focus");
    if (focus && PRODUCTS.some((p) => p.id === focus)) return focus;
    return PRODUCTS[0]?.id ?? "";
  })();
  const [productId, setProductId] = useState(initialId);
  const [tab, setTab] = useState<TabKey>("brief");
  const files = memoryFilesFor(productId);

  // Keep URL → state in sync if the param changes (eg. back/forward nav).
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus && PRODUCTS.some((p) => p.id === focus) && focus !== productId) {
      setProductId(focus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-card bg-[#FAF8F2] border border-[#E8E3D5] flex items-center justify-center flex-shrink-0">
          <Brain size={18} strokeWidth={1.5} className="text-text-secondary" />
        </div>
        <div>
          <div className="text-meta text-text-secondary mb-0.5">Spot's brain</div>
          <h1 className="text-page-title text-text-primary">Memory</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[680px]">
            Every product is a project here. Each project carries four files Spot reads
            from before it acts — product brief, current plan, performance, and assets.
          </p>
        </div>
      </div>

      {/* Two-pane layout · products column + tabbed content */}
      <div className="grid grid-cols-[240px_1fr] gap-4">
        {/* Left · products list */}
        <ProductsList active={productId} onSelect={setProductId} />

        {/* Right · tabs + content for the active product */}
        {files && (
          <div className="bg-white border border-border rounded-card overflow-hidden">
            {/* Product header inside the detail pane */}
            <ProductHeader files={files} />
            {/* Tab navigation */}
            <TabNav tab={tab} onChange={setTab} files={files} />
            {/* Tab content */}
            <div className="px-6 py-5">
              {tab === "brief" && <BriefTab files={files} />}
              {tab === "plan" && <PlanTab files={files} />}
              {tab === "performance" && <PerformanceTab files={files} />}
              {tab === "assets" && <AssetsTab files={files} />}
              {tab === "history" && <HistoryTab files={files} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Products column (left) ───────────────────────────────────── */

function ProductsList({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden h-fit">
      <div className="px-3 py-2.5 border-b border-border-subtle flex items-center gap-1.5">
        <Package size={11} strokeWidth={1.8} className="text-text-tertiary" />
        <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
          Projects · {PRODUCTS.length}
        </span>
      </div>
      <ul>
        {PRODUCTS.map((p) => {
          const plan = PRODUCT_PLANS.find((pl) => pl.productId === p.id);
          const isActive = p.id === active;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={`w-full text-left px-3 py-2.5 border-l-[3px] transition-colors ${
                  isActive
                    ? "border-l-text-primary bg-surface-page"
                    : "border-l-transparent hover:bg-surface-page/60"
                }`}
              >
                <div className="text-[12.5px] font-semibold text-text-primary leading-tight mb-0.5 truncate">
                  {p.name}
                </div>
                <div className="text-[10.5px] text-text-tertiary truncate mb-1">
                  {p.category}
                </div>
                {plan && (
                  <span className={`pill ${PLAN_STATUS_TONE[plan.status]}`} style={{ fontSize: 9.5 }}>
                    {PLAN_STATUS_LABEL[plan.status]} · execution plan
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Product detail header (inside the right pane) ────────────── */

function ProductHeader({ files }: { files: ProductMemoryFiles }) {
  const product = PRODUCTS.find((p) => p.id === files.productId);
  return (
    <div className="px-6 py-4 border-b border-border-subtle flex items-start gap-3">
      <div className="w-9 h-9 rounded-card bg-[#FAF8F2] border border-[#E8E3D5] flex items-center justify-center flex-shrink-0">
        <Package size={14} strokeWidth={1.6} className="text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-0.5">
          {product?.client} · {product?.category}
        </div>
        <h2 className="text-[18px] font-semibold text-text-primary leading-tight">
          {files.productName}
        </h2>
        {product && (
          <div className="text-[12px] text-text-secondary mt-1 leading-snug">
            {product.tagline}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab nav ──────────────────────────────────────────────────── */

function TabNav({
  tab,
  onChange,
  files,
}: {
  tab: TabKey;
  onChange: (k: TabKey) => void;
  files: ProductMemoryFiles;
}) {
  const tabCounts: Partial<Record<TabKey, string>> = {
    assets: `${
      files.assets.creatives.length +
      files.assets.searchAds.length +
      files.assets.landingPages.length +
      files.assets.forms.length
    }`,
  };
  return (
    <div className="flex items-end px-6 border-b border-border-subtle bg-surface-page">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`relative inline-flex items-center gap-1.5 py-3 px-3 text-[12.5px] font-medium transition-colors whitespace-nowrap ${
              active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon size={12} strokeWidth={1.7} />
            <span>{t.label}</span>
            {tabCounts[t.key] && (
              <span className="text-[10px] text-text-tertiary tabular">
                {tabCounts[t.key]}
              </span>
            )}
            {active && (
              <span
                aria-hidden
                className="absolute left-3 right-3 -bottom-px h-0.5 bg-text-primary rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tiny breadcrumb-style file-path line that sits below the heading
 * inside each tab. Reads like `memory / jee-crack / product-info.md`
 * so the user knows which "file" they're looking at without it
 * cluttering the tab navigation chrome.
 */
function FilePathBreadcrumb({
  productId,
  file,
}: {
  productId: string;
  file: string;
}) {
  const slug = productId.replace(/^prod-/, "");
  return (
    <div className="font-mono text-[10.5px] text-text-tertiary mb-4 inline-flex items-center gap-1">
      <span>memory</span>
      <span className="text-text-tertiary/60">/</span>
      <span>{slug}</span>
      <span className="text-text-tertiary/60">/</span>
      <span className="text-text-secondary">{file}</span>
    </div>
  );
}

/* ─── Brief tab · markdown content ─────────────────────────────── */

/**
 * Split a markdown source into its first H1 (the heading) and the rest
 * of the body. Lets us render the file path breadcrumb between the
 * heading and the body — visually right under the heading.
 */
function splitHeading(src: string): { heading: string | null; rest: string } {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let h: string | null = null;
  const restLines: string[] = [];
  let consumed = false;
  for (const line of lines) {
    if (!consumed && /^#\s+/.test(line)) {
      h = line.replace(/^#\s+/, "");
      consumed = true;
      continue;
    }
    restLines.push(line);
  }
  return { heading: h, rest: restLines.join("\n").trimStart() };
}

function MdFileBody({
  source,
  productId,
  file,
}: {
  source: string;
  productId: string;
  file: string;
}) {
  const { heading, rest } = splitHeading(source);
  return (
    <div className="max-w-[720px]">
      {heading && (
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
          {heading}
        </h1>
      )}
      {/* File path lives right under the heading, in monospace, muted —
          present enough to orient, quiet enough not to obstruct. */}
      <FilePathBreadcrumb productId={productId} file={file} />
      <Markdown source={rest} />
    </div>
  );
}

function BriefTab({ files }: { files: ProductMemoryFiles }) {
  return (
    <MdFileBody
      source={files.productInfoMd}
      productId={files.productId}
      file="product-info.md"
    />
  );
}

function PlanTab({ files }: { files: ProductMemoryFiles }) {
  return (
    <MdFileBody source={files.planMd} productId={files.productId} file="execution-plan.md" />
  );
}

function HistoryTab({ files }: { files: ProductMemoryFiles }) {
  return (
    <MdFileBody
      source={files.changeHistoryMd}
      productId={files.productId}
      file="change-history.md"
    />
  );
}

/* ─── Performance tab · interactive dashboard ──────────────────── */

function PerformanceTab({ files }: { files: ProductMemoryFiles }) {
  const perf = files.performance;
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
          Performance
        </h1>
        <FilePathBreadcrumb productId={files.productId} file="performance.html" />
        <div className="text-[12px] text-text-secondary leading-relaxed">
          Snapshot · {perf.headline}
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {perf.metrics.map((m) => (
          <PerfMetricCard key={m.key} metric={m} />
        ))}
      </div>

      {/* Side-by-side · spend curve + leads curve */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <ChartCard
          title="Daily spend"
          subtitle="Last 14 days · ₹"
          values={perf.spendCurve}
          color="#1D4ED8"
        />
        <ChartCard
          title="Daily leads"
          subtitle="Last 14 days"
          values={perf.leadsCurve}
          color="#15803D"
        />
      </div>

      {/* Channel mix */}
      <div className="bg-white border border-border rounded-card p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp size={11} strokeWidth={1.7} className="text-text-secondary" />
          <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            Channel mix · 30d
          </div>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden mb-3">
          {perf.channelMix.map((c) => (
            <div
              key={c.name}
              style={{ width: `${c.share}%`, background: c.color }}
              title={`${c.name} · ${c.share}%`}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {perf.channelMix.map((c) => (
            <div key={c.name} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: c.color }}
              />
              <div className="min-w-0">
                <div className="text-[11px] text-text-secondary truncate">{c.name}</div>
                <div className="text-[12.5px] font-semibold text-text-primary tabular">
                  {c.share}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerfMetricCard({
  metric,
}: {
  metric: import("@/lib/spot/memory-files").ProductPerformanceMetric;
}) {
  const isZero = Math.abs(metric.delta) < 0.5;
  const good = metric.invertDelta ? metric.delta < 0 : metric.delta > 0;
  const color = isZero
    ? "text-text-tertiary"
    : good
      ? "text-[#15803D]"
      : "text-[#B91C1C]";
  const arrow = isZero ? "→" : metric.delta > 0 ? "↑" : "↓";
  return (
    <div className="bg-white border border-border rounded-card p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
        {metric.label}
      </div>
      <div className="text-[18px] font-semibold text-text-primary tabular leading-none">
        {metric.value}
      </div>
      <div className={`text-[11px] tabular mt-1.5 ${color}`}>
        {arrow} {Math.abs(metric.delta).toFixed(1)}%
        <span className="text-text-tertiary"> vs prior</span>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  values,
  color,
}: {
  title: string;
  subtitle: string;
  values: number[];
  color: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  const w = 320;
  const h = 64;
  const stepX = w / (values.length - 1);
  // Path for the line.
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return [x, y];
  });
  const linePath = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  // Area fill — line + close path along bottom.
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`;
  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <div className="text-[12.5px] font-semibold text-text-primary">{title}</div>
          <div className="text-[10.5px] text-text-tertiary">{subtitle}</div>
        </div>
        <div className="text-[11px] text-text-tertiary tabular">
          Latest · {values[values.length - 1].toLocaleString("en-IN")}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 64 }} aria-hidden>
        <defs>
          <linearGradient id={`g-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#g-${title.replace(/\s/g, "")})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ─── Assets tab ──────────────────────────────────────────────── */

function AssetsTab({ files }: { files: ProductMemoryFiles }) {
  const { creatives, searchAds, landingPages, forms } = files.assets;
  return (
    <div>
      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
        Assets
      </h1>
      <FilePathBreadcrumb productId={files.productId} file="assets/" />

      <div className="space-y-5">
        {/* Creatives */}
        <section>
          <AssetSectionHeader
            icon={ImageIcon}
            title="Visual creatives"
            count={creatives.length}
            subtitle="Every angle Spot has built · each with the sizes Resize Agent has produced."
          />
          {creatives.length === 0 ? (
            <div className="text-[12.5px] text-text-tertiary italic px-1">
              No creatives yet — Spot writes them here as it builds.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5">
              {creatives.map((c) => (
                <CreativeCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>

        {/* Search ads */}
        <section>
          <AssetSectionHeader
            icon={Search}
            title="Search ads"
            count={searchAds.length}
            subtitle="Google search ad copies · brand, category, competitor buckets."
          />
          <div className="space-y-2">
            {searchAds.map((sa) => (
              <SearchAdCard key={sa.id} sa={sa} />
            ))}
          </div>
        </section>

        {/* Landing pages */}
        <section>
          <AssetSectionHeader
            icon={Smartphone}
            title="Landing pages"
            count={landingPages.length}
            subtitle="Mobile-first pages Spot has built for this product."
          />
          <div className="grid grid-cols-3 gap-2.5">
            {landingPages.map((lp) => (
              <LandingPageCard key={lp.id} lp={lp} />
            ))}
          </div>
        </section>

        {/* Forms */}
        <section>
          <AssetSectionHeader
            icon={Layout}
            title="Lead forms"
            count={forms.length}
            subtitle="Meta lead forms + click-to-WhatsApp scripts."
          />
          <div className="grid grid-cols-2 gap-2.5">
            {forms.map((f) => (
              <FormCard key={f.id} f={f} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AssetSectionHeader({
  icon: Icon,
  title,
  count,
  subtitle,
}: {
  icon: typeof FileText;
  title: string;
  count: number;
  subtitle: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline gap-2 mb-0.5">
        <Icon size={12} strokeWidth={1.7} className="text-text-secondary" />
        <span className="text-[13px] font-semibold text-text-primary">{title}</span>
        <span className="text-[11px] text-text-tertiary tabular">{count}</span>
      </div>
      <div className="text-[11px] text-text-tertiary leading-snug">{subtitle}</div>
    </div>
  );
}

function CreativeCard({
  c,
}: {
  c: import("@/lib/spot/memory-files").MemoryCreative;
}) {
  const Icon = c.kind === "video" ? Film : c.kind === "carousel" ? Layout : ImageIcon;
  const stateColor =
    c.state === "live" ? "bg-[#22C55E]" : c.state === "ready" ? "bg-[#F5A623]" : "bg-[#D4D4D4]";
  // Canonical size order — keep chips reading left-to-right consistently.
  const SIZE_ORDER: import("@/lib/spot/memory-files").CreativeSize[] = [
    "1:1",
    "4:5",
    "9:16",
    "16:9",
  ];
  const sortedSizes = SIZE_ORDER.filter((s) => c.sizes.includes(s));
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div
        className="relative aspect-[4/3] w-full"
        style={{
          background: `linear-gradient(135deg, hsl(${c.hue} 60% 90%), hsl(${c.hue} 50% 70%))`,
        }}
      >
        <div className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/85 backdrop-blur-sm">
          <Icon size={10} strokeWidth={1.7} />
        </div>
        <div className="absolute top-2 right-2 text-[9.5px] font-medium text-text-secondary bg-white/85 px-1.5 rounded-sm">
          source · {c.format}
        </div>
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 bg-white/90 px-1.5 py-0.5 rounded-sm text-[9.5px] font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${stateColor}`} />
          <span className="capitalize">{c.state}</span>
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-[11.5px] font-medium text-text-primary leading-snug line-clamp-2 min-h-[2.6em]">
          {c.label}
        </div>
        <div className="text-[10.5px] text-text-tertiary mt-1 mb-1.5">{c.personaName}</div>
        {/* Available sizes — Resize Agent output. Tiny chips per ratio. */}
        <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-border-subtle">
          <span className="text-[9.5px] uppercase tracking-wider text-text-tertiary mr-0.5">
            Sizes
          </span>
          {sortedSizes.map((s) => (
            <span
              key={s}
              className="inline-flex items-center justify-center h-[16px] px-1.5 rounded-[3px] bg-surface-page border border-border-subtle text-[9.5px] font-mono text-text-secondary tabular"
            >
              {s}
            </span>
          ))}
          {c.sizes.length < 4 && (
            <span className="text-[9.5px] text-text-tertiary italic">
              · {4 - c.sizes.length} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchAdCard({
  sa,
}: {
  sa: import("@/lib/spot/memory-files").MemorySearchAd;
}) {
  const strengthTone =
    sa.adStrength === "excellent"
      ? "pill-ok"
      : sa.adStrength === "good"
        ? "pill-info"
        : "pill-warn";
  const campaignBg =
    sa.campaign === "Brand"
      ? "bg-[#EFF6FF] text-[#1D4ED8]"
      : sa.campaign === "Category"
        ? "bg-[#F0FDF4] text-[#15803D]"
        : "bg-[#FEF3C7] text-[#92400E]";
  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="flex items-start gap-3">
        {/* Tiny Google search-result mock */}
        <div className="w-9 h-9 rounded-card bg-white border border-border-subtle flex items-center justify-center flex-shrink-0">
          <Search size={14} strokeWidth={1.7} className="text-text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span
              className={`inline-flex items-center h-[18px] px-1.5 rounded-[3px] text-[10px] font-semibold uppercase tracking-wider ${campaignBg}`}
            >
              {sa.campaign}
            </span>
            <span className={`pill ${strengthTone}`} style={{ fontSize: 10 }}>
              Ad strength · {sa.adStrength}
            </span>
            <span
              className={`pill ${sa.status === "live" ? "pill-ok" : "pill"}`}
              style={{ fontSize: 10 }}
            >
              {sa.status}
            </span>
            <span className="text-[10.5px] text-text-tertiary ml-auto">
              {sa.headlineVariants.length + 1} headlines
            </span>
          </div>

          {/* Primary ad copy — rendered like a Google SERP result */}
          <div className="bg-surface-page border border-border-subtle rounded-input p-3 mb-2">
            <div className="text-[10px] text-text-tertiary mb-0.5 inline-flex items-center gap-1">
              <span className="font-mono">Ad ·</span>
              <span>guyjus.com</span>
            </div>
            <div className="text-[14px] font-medium leading-tight text-[#1A0DAB] mb-0.5">
              {sa.primaryHeadline}
            </div>
            <div className="text-[12px] text-text-secondary leading-relaxed">
              {sa.primaryDescription}
            </div>
          </div>

          {/* Headline variants */}
          {sa.headlineVariants.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                Headline variants · Google rotates
              </div>
              <ul className="space-y-0.5">
                {sa.headlineVariants.map((h, i) => (
                  <li
                    key={i}
                    className="text-[11.5px] text-text-secondary leading-snug flex gap-1.5"
                  >
                    <span className="text-text-tertiary tabular">
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keywords */}
          <div className="text-[11px] text-text-tertiary leading-snug pt-2 border-t border-border-subtle">
            <span className="uppercase tracking-wider text-[10px] font-semibold">
              Keywords ·{" "}
            </span>
            {sa.keywords}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPageCard({
  lp,
}: {
  lp: import("@/lib/spot/memory-files").MemoryLandingPage;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-3 flex items-start gap-3">
      <div className="w-14 h-24 rounded-[6px] bg-gradient-to-b from-[#FAF8F2] to-white border border-border-subtle flex-shrink-0 relative overflow-hidden">
        <div className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded-full bg-text-tertiary/20" />
        <div className="absolute top-4 left-1.5 right-1.5 space-y-1">
          <div className="h-1 rounded-full bg-text-tertiary/15 w-3/4" />
          <div className="h-1 rounded-full bg-text-tertiary/15 w-full" />
          <div className="h-1 rounded-full bg-text-tertiary/15 w-2/3" />
        </div>
        <div className="absolute bottom-1.5 left-1.5 right-1.5 h-2 rounded-[2px] bg-[#1877F2]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[12px] font-semibold text-text-primary truncate flex-1">
            {lp.title}
          </span>
          <span
            className={`pill ${lp.status === "live" ? "pill-ok" : "pill"}`}
            style={{ fontSize: 9 }}
          >
            {lp.status}
          </span>
        </div>
        <div className="text-[10.5px] text-text-tertiary mb-1.5">{lp.personaName}</div>
        <div className="text-[11px] text-text-secondary space-y-0.5">
          <div>{lp.sections} sections</div>
          <div>{lp.visits30d.toLocaleString("en-IN")} visits · 30d</div>
          <div>{lp.conversionRate}% conv rate</div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 mt-2 text-[10.5px] text-text-tertiary hover:text-text-primary"
        >
          <ArrowUpRight size={9} strokeWidth={1.8} />
          Preview
        </button>
      </div>
    </div>
  );
}

function FormCard({ f }: { f: import("@/lib/spot/memory-files").MemoryForm }) {
  const kindLabel =
    f.kind === "lead-form"
      ? "Meta lead form"
      : f.kind === "click-to-whatsapp"
        ? "Click-to-WhatsApp"
        : "Phone form";
  return (
    <div className="bg-white border border-border rounded-card p-3">
      <div className="flex items-start gap-2.5">
        <CheckCircle2 size={13} strokeWidth={1.7} className="text-[#15803D] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12.5px] font-semibold text-text-primary truncate flex-1">
              {f.title}
            </span>
            <span className="pill pill-ok" style={{ fontSize: 9 }}>
              {f.status}
            </span>
          </div>
          <div className="text-[10.5px] text-text-tertiary mb-1.5">
            {kindLabel} · {f.personaName}
          </div>
          <div className="text-[11px] text-text-secondary">
            {f.fields} fields · {f.submissions30d.toLocaleString("en-IN")} submissions / 30d
          </div>
        </div>
      </div>
    </div>
  );
}
