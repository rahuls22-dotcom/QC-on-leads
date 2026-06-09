"use client";

// Memory · the persistent, cross-conversation product knowledge hub.
//
// With Projects now a separate top-level surface (per-launch operational
// artifacts) and execution plans being per-conversation + consumed, Memory's
// job is the *durable* layer: what Spot has learned about a product over time,
// the ground truth every new conversation and project pulls from.
//
// Six tabs, mapping 1:1 to the storage architecture:
//
//   Overview   → memory.md ground truth          (markdown · editable source)
//   Personas   → persona scorecard + angle board (DB records · the hero)
//   Creatives  → reusable asset library          (DB + blob)
//   Brand      → voice / tone / palette guide     (markdown · editable source)
//   Knowledge  → uploaded files Spot learned from (blob + metadata)
//   History    → execution history + change log   (DB · append-only)
//
// Performance moved to /dashboard; per-launch personas/creatives/plan live
// in /projects. Memory holds only what survives across both.

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Package,
  FileText,
  Users,
  Image as ImageIcon,
  Film,
  Layout,
  Smartphone,
  ArrowUpRight,
  History as HistoryIcon,
  Search,
  Sparkles,
  Palette,
  FolderOpen,
  Download,
  Rocket,
  FileBox,
} from "lucide-react";
import { PRODUCTS } from "@/lib/products-data";
import { memoryFilesFor, type ProductMemoryFiles } from "@/lib/spot/memory-files";
import {
  PRODUCT_PLANS,
  PLAN_STATUS_TONE,
  PLAN_STATUS_LABEL,
} from "@/lib/spot/extended-flows";
import {
  scorecardsForProduct,
  buildPersonasMd,
  PERSONA_SAMPLE_GATE,
} from "@/lib/spot/persona-scorecard";
import { PersonaScorecardCard } from "@/components/personas/persona-scorecard-card";
import { Markdown } from "@/components/memory/md-render";
import { SpotMark } from "@/components/spot/spot-mark";

type TabKey = "overview" | "personas" | "creatives" | "brand" | "knowledge" | "history";

const TABS: { key: TabKey; label: string; icon: typeof FileText; file: string }[] = [
  { key: "overview", label: "Overview", icon: FileText, file: "memory.md" },
  { key: "personas", label: "Personas", icon: Users, file: "personas.json" },
  { key: "creatives", label: "Creatives", icon: ImageIcon, file: "creatives/" },
  { key: "brand", label: "Brand", icon: Palette, file: "brand.md" },
  { key: "knowledge", label: "Knowledge", icon: FolderOpen, file: "knowledge/" },
  { key: "history", label: "History", icon: HistoryIcon, file: "history/" },
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
  const initialId = (() => {
    const focus = searchParams.get("focus");
    if (focus && PRODUCTS.some((p) => p.id === focus)) return focus;
    return PRODUCTS[0]?.id ?? "";
  })();
  const [productId, setProductId] = useState(initialId);
  const [tab, setTab] = useState<TabKey>("overview");
  const files = memoryFilesFor(productId);

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
          <div className="text-meta text-text-secondary mb-0.5">Spot&apos;s brain</div>
          <h1 className="text-page-title text-text-primary">Memory</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[680px]">
            What Spot knows about each project — the durable layer every new
            conversation reads from before it acts. Personas track which angles are
            actually working; the rest is the ground truth Spot acts on.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4">
        <ProductsList active={productId} onSelect={setProductId} />

        {files && (
          <div className="bg-white border border-border rounded-card overflow-hidden">
            <ProductHeader files={files} />
            <TabNav tab={tab} onChange={setTab} files={files} />
            <div className="px-6 py-5">
              {tab === "overview" && <OverviewTab files={files} />}
              {tab === "personas" && <PersonasTab files={files} />}
              {tab === "creatives" && <CreativesTab files={files} />}
              {tab === "brand" && <BrandTab files={files} />}
              {tab === "knowledge" && <KnowledgeTab files={files} />}
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
  const personaCount = scorecardsForProduct(files.productId).length;
  const creativeCount = files.assets.creatives.length;
  const angleCount = scorecardsForProduct(files.productId).reduce(
    (s, c) => s + (c.perf?.angles.length ?? 0),
    0,
  );
  return (
    <div className="px-6 py-4 border-b border-border-subtle">
      <div className="flex items-start gap-3">
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
        {/* At-a-glance counts */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <GlanceStat label="Personas" value={personaCount} />
          <GlanceStat label="Angles" value={angleCount} />
          <GlanceStat label="Creatives" value={creativeCount} />
        </div>
      </div>
    </div>
  );
}

function GlanceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-[16px] font-semibold text-text-primary tabular leading-none">
        {value}
      </div>
      <div className="text-[9.5px] uppercase tracking-wider text-text-tertiary mt-1">
        {label}
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
  const product = PRODUCTS.find((p) => p.id === files.productId);
  const tabCounts: Partial<Record<TabKey, string>> = {
    personas: `${scorecardsForProduct(files.productId).length}`,
    creatives: `${
      files.assets.creatives.length +
      files.assets.searchAds.length +
      files.assets.landingPages.length +
      files.assets.forms.length
    }`,
    knowledge: `${product?.collateral.length ?? 0}`,
  };
  return (
    <div className="flex items-end px-6 border-b border-border-subtle bg-surface-page overflow-x-auto">
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

/* ─── Shared markdown helpers ──────────────────────────────────── */

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

function FilePathBreadcrumb({ productId, file }: { productId: string; file: string }) {
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
      <FilePathBreadcrumb productId={productId} file={file} />
      <Markdown source={rest} />
    </div>
  );
}

/* ─── Overview tab ─────────────────────────────────────────────── */

function OverviewTab({ files }: { files: ProductMemoryFiles }) {
  return (
    <MdFileBody source={files.productInfoMd} productId={files.productId} file="memory.md" />
  );
}

/* ════════════════════════════════════════════════════════════════
 * PERSONAS TAB · the hero. Scorecard + angle leaderboard.
 * ═══════════════════════════════════════════════════════════════ */

function PersonasTab({ files }: { files: ProductMemoryFiles }) {
  const cards = scorecardsForProduct(files.productId);
  const product = PRODUCTS.find((p) => p.id === files.productId);

  const onExport = () => {
    const md = buildPersonasMd(files.productId, files.productName);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personas-${files.productId.replace(/^prod-/, "")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[860px]">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0">
          Personas
        </h1>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors flex-shrink-0"
        >
          <Download size={11} strokeWidth={1.8} />
          Export personas.md
        </button>
      </div>
      <FilePathBreadcrumb productId={files.productId} file="personas.json" />
      <p className="text-[12.5px] text-text-secondary leading-relaxed mb-5 max-w-[680px]">
        The persona library for {product?.name}. Each card carries Spot&apos;s
        live verdict and an angle leaderboard — which hooks are winning, which
        are fatiguing, and which to cut. Numbers roll up from every execution;
        anything under {PERSONA_SAMPLE_GATE} leads is held as &ldquo;Testing&rdquo;
        until there&apos;s enough signal to judge.
      </p>

      <div className="space-y-4">
        {cards.map((c) => (
          <PersonaScorecardCard key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * CREATIVES TAB · reusable asset library with persona filter.
 * ═══════════════════════════════════════════════════════════════ */

function CreativesTab({ files }: { files: ProductMemoryFiles }) {
  const { creatives, searchAds, landingPages, forms } = files.assets;
  const personaNames = useMemo(
    () => Array.from(new Set(creatives.map((c) => c.personaName))),
    [creatives],
  );
  const [filter, setFilter] = useState<string>("all");
  const shown = filter === "all" ? creatives : creatives.filter((c) => c.personaName === filter);

  return (
    <div>
      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
        Creatives
      </h1>
      <FilePathBreadcrumb productId={files.productId} file="creatives/" />
      <p className="text-[12.5px] text-text-secondary leading-relaxed mb-4 max-w-[680px]">
        Every asset Spot has built for this project — reusable into any new
        campaign. Filter by persona to pull a winning angle back into play.
      </p>

      {/* Persona filter */}
      {personaNames.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          {personaNames.map((n) => (
            <FilterChip key={n} label={n} active={filter === n} onClick={() => setFilter(n)} />
          ))}
        </div>
      )}

      <div className="space-y-5">
        <section>
          <AssetSectionHeader
            icon={ImageIcon}
            title="Visual creatives"
            count={shown.length}
            subtitle="Each angle with the sizes Resize Agent has produced."
          />
          {shown.length === 0 ? (
            <div className="text-[12.5px] text-text-tertiary italic px-1">
              No creatives for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5">
              {shown.map((c) => (
                <CreativeCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </section>

        <section>
          <AssetSectionHeader
            icon={Smartphone}
            title="Landing pages"
            count={landingPages.length}
            subtitle="Mobile-first pages Spot has built for this project."
          />
          <div className="grid grid-cols-3 gap-2.5">
            {landingPages.map((lp) => (
              <LandingPageCard key={lp.id} lp={lp} />
            ))}
          </div>
        </section>

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

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors border ${
        active
          ? "bg-text-primary text-white border-text-primary"
          : "bg-white text-text-secondary border-border hover:border-border-hover hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
 * BRAND TAB · voice / tone / palette (markdown source).
 * ═══════════════════════════════════════════════════════════════ */

function BrandTab({ files }: { files: ProductMemoryFiles }) {
  return (
    <div className="max-w-[720px]">
      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
        Brand
      </h1>
      <FilePathBreadcrumb productId={files.productId} file="brand/" />
      <p className="text-[12.5px] text-text-secondary leading-relaxed mb-5 max-w-[600px]">
        The brand logo Spot uses across creatives for this project.
      </p>

      {/* Logo — the only thing we actually have. */}
      <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
        Logo
      </div>
      <div className="bg-white border border-border rounded-card p-8 flex items-center justify-center">
        <span
          className="text-[34px] font-semibold tracking-tight text-text-primary"
          style={{ fontFamily: "var(--font-heading, inherit)" }}
        >
          Guyju&apos;s
        </span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * KNOWLEDGE TAB · uploaded files + what Spot extracted.
 * ═══════════════════════════════════════════════════════════════ */

function KnowledgeTab({ files }: { files: ProductMemoryFiles }) {
  const product = PRODUCTS.find((p) => p.id === files.productId);
  const collateral = product?.collateral ?? [];
  const learnings = product?.learnings ?? [];

  return (
    <div className="max-w-[760px]">
      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
        Knowledge
      </h1>
      <FilePathBreadcrumb productId={files.productId} file="knowledge/" />
      <p className="text-[12.5px] text-text-secondary leading-relaxed mb-5 max-w-[680px]">
        Source material Spot has read — brochures, decks, demo videos — plus the
        facts it extracted. New conversations are grounded in this.
      </p>

      {/* Uploaded files */}
      <section className="mb-6">
        <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
          Uploaded files · {collateral.length}
        </div>
        {collateral.length === 0 ? (
          <div className="text-[12.5px] text-text-tertiary italic">
            No files uploaded for this project yet.
          </div>
        ) : (
          <div className="space-y-2">
            {collateral.map((c, i) => {
              const Icon = c.kind === "video" ? Film : c.kind === "deck" ? FileBox : FileText;
              return (
                <div
                  key={i}
                  className="bg-white border border-border rounded-card px-3.5 py-3 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-card bg-[#FAF8F2] border border-[#E8E3D5] flex items-center justify-center flex-shrink-0">
                    <Icon size={15} strokeWidth={1.6} className="text-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-text-primary truncate">
                      {c.name}
                    </div>
                    <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider mt-0.5">
                      {c.kind} · {c.size}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[10.5px] text-text-tertiary hover:text-text-primary flex-shrink-0"
                  >
                    <ArrowUpRight size={10} strokeWidth={1.8} />
                    Open
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* What Spot learned */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} strokeWidth={1.7} className="text-text-secondary" />
          <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            What Spot extracted · {learnings.length}
          </span>
        </div>
        {learnings.length === 0 ? (
          <div className="text-[12.5px] text-text-tertiary italic">
            Nothing extracted yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {learnings.map((l) => (
              <div
                key={l.id}
                className="bg-white border border-border rounded-card px-3.5 py-2.5 flex items-start gap-2.5"
              >
                <span
                  className="inline-flex items-center h-[17px] px-1.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider bg-surface-page text-text-tertiary flex-shrink-0 mt-0.5"
                >
                  {l.kind}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-text-primary leading-snug">{l.summary}</div>
                  {l.evidence && (
                    <div className="text-[10.5px] text-text-tertiary mt-0.5">{l.evidence}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * HISTORY TAB · execution history + append-only change log.
 * ═══════════════════════════════════════════════════════════════ */

function HistoryTab({ files }: { files: ProductMemoryFiles }) {
  const product = PRODUCTS.find((p) => p.id === files.productId);
  const plan = PRODUCT_PLANS.find((pl) => pl.productId === files.productId);
  const execEntries = plan?.history ?? [];
  const changeEntries = product?.memory ?? [];

  return (
    <div className="max-w-[760px]">
      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
        History
      </h1>
      <FilePathBreadcrumb productId={files.productId} file="history/" />
      <p className="text-[12.5px] text-text-secondary leading-relaxed mb-5 max-w-[680px]">
        Every execution plan deployed against this project, and the running log
        of every change to its memory.
      </p>

      {/* Execution history */}
      <section className="mb-6">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Rocket size={12} strokeWidth={1.7} className="text-text-secondary" />
          <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            Execution history · {execEntries.length}
          </span>
        </div>
        {execEntries.length === 0 ? (
          <div className="text-[12.5px] text-text-tertiary italic">
            No execution plans deployed yet.
          </div>
        ) : (
          <ol className="relative border-l border-border-subtle ml-1.5 space-y-3 pl-4">
            {execEntries
              .slice()
              .reverse()
              .map((h, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-text-primary"
                    aria-hidden
                  />
                  <div className="text-[12.5px] text-text-primary leading-snug">{h.entry}</div>
                  <div className="text-[10.5px] text-text-tertiary mt-0.5">
                    {h.at} · {h.who}
                  </div>
                </li>
              ))}
          </ol>
        )}
      </section>

      {/* Change log */}
      <section>
        <div className="flex items-center gap-1.5 mb-2.5">
          <HistoryIcon size={12} strokeWidth={1.7} className="text-text-secondary" />
          <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            Change log · {changeEntries.length}
          </span>
        </div>
        {changeEntries.length === 0 ? (
          <div className="text-[12.5px] text-text-tertiary italic">No changes logged yet.</div>
        ) : (
          <div className="space-y-1.5">
            {changeEntries
              .slice()
              .sort((a, b) => (a.at < b.at ? 1 : -1))
              .map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-border rounded-card px-3.5 py-2.5 flex items-start gap-2.5"
                >
                  <span className="inline-flex items-center h-[17px] px-1.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider bg-surface-page text-text-tertiary flex-shrink-0 mt-0.5">
                    {m.kind}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-text-primary leading-snug">{m.summary}</div>
                    <div className="text-[10.5px] text-text-tertiary mt-0.5">
                      {m.at} · {m.who}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Shared asset cards (reused by Creatives tab) ─────────────── */

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

function CreativeCard({ c }: { c: import("@/lib/spot/memory-files").MemoryCreative }) {
  const Icon = c.kind === "video" ? Film : c.kind === "carousel" ? Layout : ImageIcon;
  const stateColor =
    c.state === "live" ? "bg-[#22C55E]" : c.state === "ready" ? "bg-[#F5A623]" : "bg-[#D4D4D4]";
  const SIZE_ORDER: import("@/lib/spot/memory-files").CreativeSize[] = ["1:1", "4:5", "9:16", "16:9"];
  const sortedSizes = SIZE_ORDER.filter((s) => c.sizes.includes(s));
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div
        className="relative aspect-[4/3] w-full"
        style={{ background: `linear-gradient(135deg, hsl(${c.hue} 60% 90%), hsl(${c.hue} 50% 70%))` }}
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
        <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-border-subtle">
          <span className="text-[9.5px] uppercase tracking-wider text-text-tertiary mr-0.5">Sizes</span>
          {sortedSizes.map((s) => (
            <span
              key={s}
              className="inline-flex items-center justify-center h-[16px] px-1.5 rounded-[3px] bg-surface-page border border-border-subtle text-[9.5px] font-mono text-text-secondary tabular"
            >
              {s}
            </span>
          ))}
          {c.sizes.length < 4 && (
            <span className="text-[9.5px] text-text-tertiary italic">· {4 - c.sizes.length} pending</span>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchAdCard({ sa }: { sa: import("@/lib/spot/memory-files").MemorySearchAd }) {
  const strengthTone =
    sa.adStrength === "excellent" ? "pill-ok" : sa.adStrength === "good" ? "pill-info" : "pill-warn";
  const campaignBg =
    sa.campaign === "Brand"
      ? "bg-[#EFF6FF] text-[#1D4ED8]"
      : sa.campaign === "Category"
        ? "bg-[#F0FDF4] text-[#15803D]"
        : "bg-[#FEF3C7] text-[#92400E]";
  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="flex items-start gap-3">
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
            <span className={`pill ${sa.status === "live" ? "pill-ok" : "pill"}`} style={{ fontSize: 10 }}>
              {sa.status}
            </span>
            <span className="text-[10.5px] text-text-tertiary ml-auto">
              {sa.headlineVariants.length + 1} headlines
            </span>
          </div>
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
          {sa.headlineVariants.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                Headline variants · Google rotates
              </div>
              <ul className="space-y-0.5">
                {sa.headlineVariants.map((h, i) => (
                  <li key={i} className="text-[11.5px] text-text-secondary leading-snug flex gap-1.5">
                    <span className="text-text-tertiary tabular">{String(i + 2).padStart(2, "0")}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-[11px] text-text-tertiary leading-snug pt-2 border-t border-border-subtle">
            <span className="uppercase tracking-wider text-[10px] font-semibold">Keywords · </span>
            {sa.keywords}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPageCard({ lp }: { lp: import("@/lib/spot/memory-files").MemoryLandingPage }) {
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
          <span className="text-[12px] font-semibold text-text-primary truncate flex-1">{lp.title}</span>
          <span className={`pill ${lp.status === "live" ? "pill-ok" : "pill"}`} style={{ fontSize: 9 }}>
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
        <span className="w-3.5 h-3.5 rounded-full bg-[#15803D]/10 flex items-center justify-center mt-0.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12.5px] font-semibold text-text-primary truncate flex-1">{f.title}</span>
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
