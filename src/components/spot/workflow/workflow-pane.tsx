"use client";

// Right-pane canvas for the launch workflow. **Read-only** — every
// approval action lives in the left chat (via the step-cta part). This
// pane just shows what Spot is working on.

import { PanelRightClose, X, Users, Package, ChartPie, Sparkles, Megaphone, Layout as LayoutIcon, PartyPopper, CheckCircle2, Check, Wifi, WifiOff, Cog, ChevronRight, Pencil, Search, ShieldAlert, TrendingUp, ExternalLink, Image as ImageIcon, Mic, MessageSquare, Phone, ArrowRight, Upload, FileText, Film as FilmIcon, Layers, Paperclip, Brain } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { useSpotStore } from "@/lib/spot/store";
import {
  STEP_LABELS,
  STEP_TOOL_CALL,
  VISIBLE_STEPS,
  VISIBLE_STEPS_BY_KIND,
  LAUNCH_PERSONAS,
  SAMPLE_ANGLES,
  SAMPLE_FORMS,
  SAMPLE_STRUCTURE,
  SAMPLE_SEARCH_ADS,
  VOICE_AGENTS,
  buildResizeReviews,
  generatePlan,
  type WorkflowStep,
  type LaunchWorkflow,
  type DiagnosticWorkflow,
  type SpotWorkflow,
  type Channel,
  type CampaignBucket,
} from "@/lib/spot/workflow";
import {
  DiagnosticStep,
} from "@/components/spot/workflow/diagnostic-steps";
import {
  LaunchPlanStep,
  LaunchBuildingStep,
  LaunchReviewStep,
} from "@/components/spot/workflow/launch-build-steps";
import { CampaignDiveStep } from "@/components/spot/workflow/campaign-dive-step";
import { SpotMark } from "@/components/spot/spot-mark";
import { SpotLoader, SpotFullscreen } from "@/components/spot/spot-loader";
import { PRODUCTS } from "@/lib/products-data";

const STEP_ICONS: Record<WorkflowStep, typeof Users> = {
  // Launch flow (new consolidated structure)
  "deep-research": Search,
  "product-setup": Package,
  kickoff: Sparkles,
  "launch-plan": Sparkles,
  "launch-building": Cog,
  "launch-review": CheckCircle2,
  // Legacy step icons — unused since these steps left STEP_ORDER, but
  // kept for type-completeness on the Record<WorkflowStep, ...> map.
  personas: Users,
  "media-plan": ChartPie,
  angles: Sparkles,
  "resize-qa": CheckCircle2,
  forms: LayoutIcon,
  campaigns: Megaphone,
  "voice-agent": Mic,
  // Diagnostic flows — 4 steps each: analyze → clarify → plan → live
  "scale-analyze": Search,
  "scale-clarify": ChartPie,
  "scale-plan": Sparkles,
  "scale-live": TrendingUp,
  "opt-analyze": Search,
  "opt-clarify": ChartPie,
  "opt-plan": Sparkles,
  "opt-live": ShieldAlert,
  "ang-analyze": Search,
  "ang-clarify": ChartPie,
  "ang-plan": Sparkles,
  "ang-live": ImageIcon,
  "campaign-dive": Megaphone,
  // Shared
  done: PartyPopper,
};

function inr(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// Stagger animation used to reveal canvas content card-by-card once
// an agent finishes its work. Slightly slower than the chat fadeUp so
// the right pane feels like it's *filling in*.
const canvasStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.05 } },
};
const canvasReveal: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

// File tabs the right pane exposes · this is the Claude-Code-style
// file browser of the product's memory: memory.md / plan.md /
// dashboard.html / assets/. The step rail is gone — workflows are
// agentic, not procedural, so we surface them as files instead of
// chips.
type FileTabKey = "memory" | "plan" | "dashboard" | "assets";

const FILE_TABS: { key: FileTabKey; label: string; file: string; icon: typeof FileText }[] = [
  { key: "memory", label: "Memory", file: "memory.md", icon: FileText },
  { key: "plan", label: "Plan", file: "plan.md", icon: TrendingUp },
  { key: "dashboard", label: "Dashboard", file: "dashboard.html", icon: ChartPie },
  { key: "assets", label: "Assets", file: "assets/", icon: ImageIcon },
];

/** Default tab to show based on the current workflow step. The user
 *  can switch tabs freely but step transitions auto-focus the most
 *  relevant file. */
function defaultTabForStep(step: WorkflowStep): FileTabKey {
  if (step === "product-setup" || step === "deep-research" || step === "kickoff")
    return "memory";
  if (step === "launch-plan" || step.endsWith("-plan") || step.endsWith("-clarify"))
    return "plan";
  if (step === "launch-building") return "plan";
  if (step === "launch-review") return "assets";
  if (step.endsWith("-live") || step.endsWith("-analyze")) return "dashboard";
  if (step === "campaign-dive") return "dashboard";
  return "memory";
}

export function WorkflowPane() {
  const workflow = useSpotStore((s) => s.workflow);
  const toggleCanvas = useSpotStore((s) => s.toggleCanvas);
  const exitWorkflow = useSpotStore((s) => s.exitWorkflow);

  // Active file tab — initialised from the workflow step, then
  // user-controlled. We update whenever the step changes, so step
  // transitions still pull the user to the relevant file.
  const [activeTab, setActiveTab] = useState<FileTabKey>(() =>
    workflow ? defaultTabForStep(workflow.step) : "memory",
  );
  useEffect(() => {
    if (workflow) setActiveTab(defaultTabForStep(workflow.step));
  }, [workflow?.step]);

  if (!workflow) return null;

  // Header verb adapts per workflow kind so the chrome reads correctly
  // ("Scaling Guyju's JEE Crack" vs. "Launching Guyju's Spoken English").
  const headerVerb =
    workflow.kind === "scale"
      ? "Scaling"
      : workflow.kind === "optimize"
        ? "Optimizing"
        : workflow.kind === "test-angles"
          ? "Testing angles ·"
          : workflow.kind === "campaign-dive"
            ? "Spot it ·"
            : "Launching ·";
  const headerTitle =
    workflow.kind === "campaign-dive" ? workflow.entityName : workflow.productName;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header — product context + canvas controls */}
      <div className="border-b border-border-subtle bg-surface-page">
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-text-tertiary leading-tight">
              {headerVerb} {headerTitle}
            </div>
            <div className="text-[14px] font-semibold text-text-primary leading-tight">
              memory / {slugFor(workflow.productId, workflow.productName)}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCanvas}
            title="Minimize canvas — chat stays full-width; workflow state is preserved."
            className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
          >
            <PanelRightClose size={14} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            onClick={exitWorkflow}
            title="Close workflow — abandons progress and returns to Spot."
            className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
          >
            <X size={14} strokeWidth={1.6} />
          </button>
        </div>

        {/* File tabs · Claude-Code style. Filename in monospace, active
            tab gets a darker bottom border. */}
        <div className="flex items-end px-5">
          {FILE_TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`relative inline-flex items-center gap-1.5 py-2.5 px-3 text-[12px] font-medium transition-colors whitespace-nowrap ${
                  active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={11} strokeWidth={1.7} />
                <span>{t.label}</span>
                <span
                  className="text-[10px] font-mono text-text-tertiary ml-0.5"
                  style={{ opacity: active ? 0.7 : 0.4 }}
                >
                  {t.file}
                </span>
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
      </div>

      {/* Body — file content */}
      <div className="flex-1 overflow-y-auto">
        <FileBody workflow={workflow} tab={activeTab} />
      </div>
    </div>
  );
}

/** Convert a productId / productName to a slug for the header breadcrumb. */
function slugFor(productId: string | null, productName: string): string {
  if (productId) return productId.replace(/^prod-/, "");
  return productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ─── File body router ──────────────────────────────────────────
 *
 * Each tab renders the corresponding file:
 *   · memory     → memory.md as rendered markdown (with live "building"
 *                  overlay for product-setup / deep-research / kickoff
 *                  while not ready)
 *   · plan       → plan.md (with proposed-changes diff on diagnostic
 *                  flows once the workflow proposes updates)
 *   · dashboard  → dashboard.html rich performance view
 *   · assets     → assets/ grid of creatives + search ads + landing
 *                  pages + forms (mirrors /memory > Assets)
 * ─────────────────────────────────────────────────────────────── */

function FileBody({
  workflow,
  tab,
}: {
  workflow: SpotWorkflow;
  tab: FileTabKey;
}) {
  // Campaign-dive keeps its dedicated single-pane view — it's tied to a
  // specific entity, not a product memory.
  if (workflow.kind === "campaign-dive") {
    return <CampaignDiveStep workflow={workflow} />;
  }

  // Active step controls overlays · "Spot is updating memory…",
  // "Spot is building the plan…", etc.
  const step = workflow.step;
  const isBuilding =
    step === "deep-research" ||
    step === "launch-building" ||
    step === "scale-plan" ||
    step === "opt-plan" ||
    step === "ang-plan";

  if (tab === "memory") {
    return <MemoryFileView workflow={workflow} buildingOverlay={isBuilding && tab === "memory"} />;
  }
  if (tab === "plan") {
    return <PlanFileView workflow={workflow} buildingOverlay={isBuilding} />;
  }
  if (tab === "dashboard") {
    return <DashboardFileView workflow={workflow} />;
  }
  if (tab === "assets") {
    return <AssetsFileView workflow={workflow} buildingOverlay={step === "launch-building"} />;
  }
  return null;
}

/* ─── File views ───────────────────────────────────────────────── */

import { MEMORY_FILES, memoryFilesFor } from "@/lib/spot/memory-files";
import { Markdown } from "@/components/memory/md-render";

/** Resolve the product id Spot is working on — could be the workflow's
 *  productId (existing product) or null (new product flow), in which
 *  case we synthesise a partial memory from setup answers. */
function getProductFiles(workflow: SpotWorkflow) {
  if (workflow.kind === "campaign-dive") {
    return memoryFilesFor(workflow.productId);
  }
  if (workflow.kind !== "launch-campaign") {
    return memoryFilesFor(workflow.productId);
  }
  if (workflow.productId) return memoryFilesFor(workflow.productId);
  return null;
}

function MemoryFileView({
  workflow,
  buildingOverlay,
}: {
  workflow: SpotWorkflow;
  buildingOverlay: boolean;
}) {
  const files = getProductFiles(workflow);

  // New product flow · memory file is being built. Show whatever the
  // user has answered so far as a sketch markdown document.
  if (!files && workflow.kind === "launch-campaign") {
    const answers = workflow.productSetupAnswers ?? {};
    const partial = buildPartialMemoryMd(workflow.productName, answers);
    return (
      <div className="relative">
        <div className="px-6 py-5 max-w-[720px]">
          <Markdown source={partial} />
        </div>
        {buildingOverlay && <BuildingOverlay label="Spot is building this file…" />}
      </div>
    );
  }

  if (!files) {
    return <EmptyFile label="No memory yet." />;
  }
  return (
    <div className="relative">
      <div className="px-6 py-5 max-w-[720px]">
        <Markdown source={files.productInfoMd} />
      </div>
      {buildingOverlay && <BuildingOverlay label="Spot is updating memory…" />}
    </div>
  );
}

function PlanFileView({
  workflow,
  buildingOverlay,
}: {
  workflow: SpotWorkflow;
  buildingOverlay: boolean;
}) {
  const files = getProductFiles(workflow);
  // New product · no plan yet, show a placeholder.
  if (!files) {
    return (
      <div className="relative">
        <div className="px-6 py-5 max-w-[720px]">
          <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-3">
            Plan
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            No plan yet. After deep research completes, Spot will draft the launch
            plan here — a written, day-by-day timeline you can approve in chat.
          </p>
        </div>
        {buildingOverlay && <BuildingOverlay label="Spot is drafting the plan…" />}
      </div>
    );
  }

  // Existing product · render the plan.md content.
  return (
    <div className="relative">
      <div className="px-6 py-5 max-w-[720px]">
        <Markdown source={files.planMd} />
      </div>
      {buildingOverlay && (
        <BuildingOverlay label="Spot is proposing plan changes…" />
      )}
    </div>
  );
}

function DashboardFileView({ workflow }: { workflow: SpotWorkflow }) {
  const files = getProductFiles(workflow);
  if (!files) {
    return (
      <EmptyFile label="No dashboard yet · campaigns haven't started." />
    );
  }
  const perf = files.performance;
  return (
    <div className="px-6 py-5">
      <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
        Dashboard
      </h1>
      <div className="text-[12px] text-text-secondary mb-4">{perf.headline}</div>
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {perf.metrics.map((m) => {
          const isZero = Math.abs(m.delta) < 0.5;
          const good = m.invertDelta ? m.delta < 0 : m.delta > 0;
          const color = isZero
            ? "text-text-tertiary"
            : good
              ? "text-[#15803D]"
              : "text-[#B91C1C]";
          const arrow = isZero ? "→" : m.delta > 0 ? "↑" : "↓";
          return (
            <div key={m.key} className="bg-white border border-border rounded-card p-3">
              <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                {m.label}
              </div>
              <div className="text-[17px] font-semibold text-text-primary tabular leading-none">
                {m.value}
              </div>
              <div className={`text-[11px] tabular mt-1.5 ${color}`}>
                {arrow} {Math.abs(m.delta).toFixed(1)}%{" "}
                <span className="text-text-tertiary">vs prior</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white border border-border rounded-card p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp size={11} strokeWidth={1.7} className="text-text-secondary" />
          <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            Channel mix
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

function AssetsFileView({
  workflow,
  buildingOverlay,
}: {
  workflow: SpotWorkflow;
  buildingOverlay: boolean;
}) {
  const files = getProductFiles(workflow);
  if (!files) {
    return <EmptyFile label="No assets yet · Spot writes them here after the plan is approved." />;
  }
  const { creatives, searchAds, landingPages, forms } = files.assets;
  return (
    <div className="relative">
      <div className="px-6 py-5">
        <h1 className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-1">
          Assets
        </h1>
        <p className="text-[12px] text-text-secondary mb-4">
          {creatives.length} creatives · {searchAds.length} search ads · {landingPages.length} landing
          pages · {forms.length} forms
        </p>
        <a
          href="/memory"
          className="inline-flex items-center gap-1 text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          See full asset library in Memory → Assets
        </a>
      </div>
      {buildingOverlay && <BuildingOverlay label="Spot is generating creatives…" />}
    </div>
  );
}

/** Tiny overlay that sits on top of a file view while Spot is updating
 *  it. Keeps the file visible behind so the user sees the BEFORE state. */
function BuildingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
      <div className="inline-flex items-center gap-3 bg-white border border-border rounded-card px-4 py-3 shadow-card-hover pointer-events-auto">
        <SpotLoader mode="orbit" size={20} className="!gap-0" />
        <div className="text-[13px] font-semibold text-text-primary">{label}</div>
      </div>
    </div>
  );
}

function EmptyFile({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center px-8 py-16 text-center">
      <div className="text-[13px] text-text-tertiary">{label}</div>
    </div>
  );
}

/** Build a partial memory.md sketch from the setup answers so the user
 *  can see the memory growing as they chat. */
function buildPartialMemoryMd(
  productName: string,
  answers: { name?: string; url?: string; files?: string[] },
): string {
  const lines: string[] = [];
  if (answers.name) {
    lines.push(`# ${answers.name}`, "");
    lines.push("_Guyju's · category to be confirmed_", "");
  } else {
    lines.push(`# ${productName}`, "");
    lines.push("_Tell me the product name in chat — I'll write it here._", "");
  }
  lines.push("## Source inputs", "");
  if (answers.url) lines.push(`- **Brand URL** · ${answers.url}`);
  else lines.push("- _URL pending · paste it in chat or type 'skip'._");
  if (answers.files && answers.files.length > 0) {
    lines.push(`- **Attached files** · ${answers.files.join(", ")}`);
  } else {
    lines.push("- _Files pending · use the 📎 button or type 'skip'._");
  }
  lines.push("", "## Memory · pending");
  lines.push(
    "",
    "Once you finish answering, the Deep Research Agent will crawl your URL, " +
      "parse your files, and synthesise:",
    "",
    "- A product brief (duration, cohort, curriculum, outcomes)",
    "- Suggested pricing plans based on category benchmarks",
    "- Promotional offers based on the competitive landscape",
    "- USPs to lead with",
    "- A do-not-mention list",
    "",
    "_I'll fill this file in automatically as I work._",
  );
  return lines.join("\n");
}

/**
 * Generic "agent at work" loader for any step that runs a background
 * tool-call. Shown on the right pane while the agent is still
 * narrating in chat — the canvas swaps to it immediately on advance.
 */
function StepLoader({
  stepLabel,
  agent,
  detail,
}: {
  stepLabel: string;
  agent: string;
  detail: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center">
      <SpotLoader
        mode="orbit"
        size={56}
        label={`Working on ${stepLabel.toLowerCase()}…`}
        sublabel={detail}
      />
      <div className="mono text-[10.5px] text-text-tertiary mt-2">{agent}</div>
    </div>
  );
}

function StepHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-section-header text-text-primary">{title}</h2>
      <p className="text-meta text-text-secondary mt-1">{blurb}</p>
    </div>
  );
}

/* ─── Deep research ──────────────────────────────────────────── */

const RESEARCH_TASKS = [
  { label: "Crawling brand site · /about, /curriculum, /pricing", status: "done" as const },
  { label: "Pulling category keyword landscape", status: "done" as const },
  { label: "Indexing category review sites + parent forums", status: "running" as const },
  { label: "Computing audience overlap from Revspot graph", status: "queued" as const },
  { label: "Synthesising USPs and avoid list", status: "queued" as const },
];

/** Status messages for the deep-research full-screen loader. Cycle
 *  every 1.8s so the user sees Spot working through each source.
 *  Each message prefixes the phase (Reading / Crawling / Pulling /
 *  Synthesising) so it reads like a series of explicit subtasks
 *  rather than abstract "thinking". */
const DEEP_RESEARCH_MESSAGES = [
  "Reading the URL you provided · /about, /curriculum, /pricing…",
  "Parsing your uploaded brochures + decks…",
  "Crawling competitor sites for positioning + price benchmarks…",
  "Pulling category signals from the open web…",
  "Sampling parent forums + category review sites…",
  "Checking the Revspot audience graph for persona overlap…",
  "Synthesising findings into a coherent brief…",
];

/** Status for the "Building memory" phase that follows deep research.
 *  This is the moment Spot is *committing* what it found into the
 *  product's memory layer — different vibe from research. */
const BUILDING_MEMORY_MESSAGES = [
  "Drafting the product tagline…",
  "Writing the structured product brief…",
  "Proposing pricing plans based on category benchmarks…",
  "Composing the offer slate from competitive landscape…",
  "Locking in the USPs to lead with…",
  "Writing the do-not-mention list to memory…",
  "Indexing memory for downstream agents…",
];

/**
 * Brain + shimmer loader · used while memory is being written. The
 * brain icon (with a soft pulsing aura behind it) reads as "thinking
 * + writing"; the cycling status reflects which memory block is
 * being committed. Skeleton bars below mimic the memory layout
 * filling in.
 */
function BuildingMemoryLoader() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % BUILDING_MEMORY_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="px-5 py-8 max-w-[640px] mx-auto">
      {/* Brain icon with soft pulsing aura */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(232, 224, 200, 0.55) 0%, transparent 65%)",
              animation: "spotAura 2.2s ease-in-out infinite",
            }}
          />
          <div className="relative w-12 h-12 rounded-full bg-white border border-[#E8E3D5] flex items-center justify-center shadow-sm">
            <Brain
              size={22}
              strokeWidth={1.4}
              className="text-text-secondary"
              style={{ animation: "spotCorePulse 2.4s ease-in-out infinite" }}
            />
          </div>
        </div>
        <div className="text-section-header text-text-primary">Building memory…</div>
        <div
          key={idx}
          className="text-[12.5px] text-text-tertiary mt-1.5 max-w-[420px] leading-relaxed"
        >
          {BUILDING_MEMORY_MESSAGES[idx]}
        </div>
      </div>

      {/* Shimmer skeleton — mirrors the kickoff memory layout so the
          transition into real content feels smooth, not jarring. */}
      <div className="space-y-3">
        {/* Tagline card */}
        <div className="bg-white border border-border rounded-card p-4 space-y-2.5">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
        {/* Brief grid */}
        <div className="bg-white border border-border rounded-card p-4 space-y-2">
          <div className="skeleton h-3 w-20 rounded mb-2" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-3 w-full rounded" />
            ))}
          </div>
        </div>
        {/* Pricing + offers */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white border border-border rounded-card p-4 space-y-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
        {/* USPs + Avoid */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white border border-border rounded-card p-4 space-y-2">
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeepResearchStep({ workflow }: { workflow: LaunchWorkflow }) {
  return (
    <div className="h-full flex items-center justify-center px-5 py-8">
      <SpotFullscreen
        title={`Researching ${workflow.productName}`}
        messages={DEEP_RESEARCH_MESSAGES}
        size={72}
      />
    </div>
  );
}

/* ─── Product setup ──────────────────────────────────────────── */

/**
 * Initial canvas for a fresh New Product flow. The user picks how Spot
 * should learn about the product: type a name and let Spot research it
 * end-to-end, paste a URL for Spot to crawl, or upload a brochure.
 *
 * Submitting fires startDeepResearch which transitions to the
 * deep-research step (loader + tool calls) and ultimately the kickoff
 * canvas with synthesised memory.
 */
/** Files the user has uploaded as research input. We don't actually
 *  parse them in this demo — they're a signal to Spot ("here's our
 *  collateral, factor it in"). The deep research step pretends to
 *  read them and folds the file names into the synthesised memory. */
type UploadedFile = {
  id: string;
  name: string;
  size: number;
  kind: "pdf" | "deck" | "video" | "image" | "doc";
};

function inferKind(file: File): UploadedFile["kind"] {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["ppt", "pptx", "key"].includes(ext)) return "deck";
  if (["mp4", "mov", "webm", "avi"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "doc";
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_KIND_ICON: Record<UploadedFile["kind"], typeof FileText> = {
  pdf: FileText,
  deck: Layers,
  video: FilmIcon,
  image: ImageIcon,
  doc: FileText,
};

/**
 * Product setup · DISPLAY ONLY.
 *
 * The right canvas reflects what Spot has captured so far from the
 * chat-driven Q&A on the left. No inputs here — the canvas is the
 * "what we know" view, the chat is the "tell me what you know" view.
 * As the user answers questions in the chat composer, this canvas
 * fills in stage by stage.
 */
function ProductSetupStep() {
  const wf = useSpotStore((s) =>
    s.workflow && s.workflow.kind === "launch-campaign" ? s.workflow : null,
  );
  if (!wf) return null;
  const answers = wf.productSetupAnswers ?? {};
  const stage = wf.productSetupStage ?? "name";
  const activeIs = (s: typeof stage) => stage === s;

  return (
    <div className="px-5 py-8 max-w-[560px] mx-auto">
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FAF8F2] border border-[#E8E3D5] mb-3">
          <Package size={16} strokeWidth={1.6} className="text-text-secondary" />
        </div>
        <h2 className="text-section-header text-text-primary">New product brief</h2>
        <p className="text-meta text-text-secondary mt-1.5 max-w-[420px] mx-auto">
          I'm filling this in as we talk. <span className="text-text-primary font-medium">Answer in the chat on the left.</span>
        </p>
      </div>

      {/* Captured fields — display only, filling in as the user answers */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <BriefRow
          label="Product name"
          value={answers.name}
          placeholder="What should I call it?"
          active={activeIs("name")}
        />
        <BriefRow
          label="Brand URL"
          value={answers.url}
          placeholder="https://… (optional)"
          active={activeIs("url")}
        />
        <BriefRow
          label="Attachments"
          value={
            answers.files && answers.files.length > 0
              ? answers.files.join(" · ")
              : undefined
          }
          placeholder="Drop PDFs, decks, brochures (optional)"
          active={activeIs("files")}
          mono
        />
      </div>

      {/* Stage hint */}
      <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 mt-4 flex items-start gap-2.5">
        <SpotMark size={16} />
        <div className="text-[12px] text-text-secondary leading-relaxed">
          {stage === "name" && (
            <>
              <span className="text-text-primary font-medium">Step 1 · Name.</span> Type the
              product name in the chat on the left.
            </>
          )}
          {stage === "url" && (
            <>
              <span className="text-text-primary font-medium">Step 2 · URL.</span> Paste a URL,
              or type <code className="text-[11.5px] bg-white border border-border px-1 rounded-sm font-mono">skip</code> to
              continue without one.
            </>
          )}
          {stage === "files" && (
            <>
              <span className="text-text-primary font-medium">Step 3 · Files.</span> Use the
              Attach button in the chat composer to upload PDFs, decks, or brochures — or
              type <code className="text-[11.5px] bg-white border border-border px-1 rounded-sm font-mono">skip</code> to
              start deep research now.
            </>
          )}
          {stage === "ready" && (
            <>
              <span className="text-text-primary font-medium">Got everything.</span> Starting
              deep research on{" "}
              <span className="text-text-primary font-medium">{answers.name}</span>…
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One row in the captured-fields card. Three states:
 *   · empty + active → shows a placeholder and a pulsing ring (Spot
 *     is waiting on this answer right now)
 *   · empty + inactive → plain placeholder
 *   · filled → green check + the captured value
 */
function BriefRow({
  label,
  value,
  placeholder,
  active,
  mono,
}: {
  label: string;
  value: string | undefined;
  placeholder: string;
  active: boolean;
  mono?: boolean;
}) {
  const hasValue = !!value && value.length > 0;
  return (
    <div
      className={`px-4 py-3 border-b border-border-subtle last:border-0 flex items-start gap-3 ${
        active ? "bg-[#FAF8F2]" : ""
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {hasValue ? (
          <CheckCircle2 size={13} strokeWidth={2} className="text-[#15803D]" />
        ) : active ? (
          <span className="relative inline-flex items-center justify-center w-3.5 h-3.5">
            <span className="absolute inset-0 rounded-full bg-[#C9A86A] opacity-40 animate-ping" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
          </span>
        ) : (
          <span className="inline-block w-3.5 h-3.5 rounded-full border border-border-subtle" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
          {label}
        </div>
        {hasValue ? (
          <div
            className={`text-[13px] text-text-primary break-words ${
              mono ? "font-mono text-[12px]" : ""
            }`}
          >
            {value}
          </div>
        ) : (
          <div className={`text-[12.5px] ${active ? "text-text-secondary" : "text-text-tertiary"}`}>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

function extractDomainName(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "");
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg ? `${host} · ${seg}` : host;
  } catch {
    return null;
  }
}

/* ─── Kickoff — display product memory ───────────────────────── */

function KickoffStep({ workflow }: { workflow: LaunchWorkflow }) {
  const product = PRODUCTS.find((p) => p.id === workflow.productId);
  // If we ran deep research instead of resolving an existing product,
  // render the freshly-researched memory in the same shape.
  const researched = workflow.researchedMemory;

  // Loading state. Two flavours:
  //   · After deep research → BRAIN icon + shimmer skeleton with cycling
  //     status. Memory is a thinking/writing act — a brain glyph reads
  //     more accurately than the Spot orb (which signals "Spot itself
  //     is doing something" rather than "memory is being written").
  //   · Loading existing product memory → quick skeleton shimmer.
  if (!workflow.kickoffReady) {
    if (!workflow.productId) {
      return <BuildingMemoryLoader />;
    }
    return <KickoffSkeleton productName={workflow.productName} />;
  }

  return (
    <div className="px-5 py-5">
      <StepHeader
        title={`What I know about ${workflow.productName}`}
        blurb={
          researched
            ? "Freshly researched memory — feel free to edit any field in chat. I'll use this to brief every downstream agent."
            : "The memory I'll brief every downstream agent with. Approve from chat when ready."
        }
      />

      {researched && !product ? (
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="pill pill-info" style={{ fontSize: 10 }}>
                <Sparkles size={9} strokeWidth={2} />
                Spot-researched
              </span>
              <span className="text-[11px] text-text-tertiary">just now</span>
              <span className="flex-1" />
              <span className="text-[10.5px] text-text-tertiary inline-flex items-center gap-1">
                <Pencil size={9} strokeWidth={1.8} />
                Click any field to edit
              </span>
            </div>
            <div className="text-card-title text-text-primary mt-1.5">{workflow.productName}</div>
            <EditableValue
              value={researched.tagline}
              multiline
              className="text-[13px] text-text-secondary leading-relaxed mt-1 block"
            />
          </div>

          {/* Structured brief — what the product IS */}
          {researched.brief && researched.brief.length > 0 && (
            <div className="bg-white border border-border rounded-card p-4">
              <div className="label-section mb-2.5">Product brief</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {researched.brief.map((row, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="text-[14px] flex-shrink-0">{row.icon}</span>
                    <span className="text-text-tertiary text-[11.5px] flex-shrink-0">
                      {row.label}:
                    </span>
                    <EditableValue
                      value={row.value}
                      className="text-text-primary flex-1 min-w-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing + Offers — side by side */}
          <div className="grid grid-cols-2 gap-3">
            {researched.pricing && researched.pricing.length > 0 && (
              <div className="bg-white border border-border rounded-card p-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-[14px]">💰</span>
                  <span className="label-section">Pricing · suggested</span>
                </div>
                <div className="space-y-1.5">
                  {researched.pricing.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-2 py-1 border-b border-border-subtle last:border-0"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <EditableValue
                          value={p.name}
                          className="text-[12.5px] font-medium text-text-primary truncate"
                        />
                        {p.badge && (
                          <EditableValue
                            value={p.badge}
                            className="text-[10px] text-text-tertiary mt-0.5"
                          />
                        )}
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0">
                        <EditableValue
                          value={p.cost}
                          className="text-[13px] font-semibold text-text-primary tabular"
                        />
                        {p.cadence && (
                          <EditableValue
                            value={p.cadence}
                            className="text-[10.5px] text-text-tertiary"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {researched.offers && researched.offers.length > 0 && (
              <div className="bg-white border border-border rounded-card p-4">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-[14px]">🎁</span>
                  <span className="label-section">Offers · proposed</span>
                </div>
                <ul className="space-y-1.5">
                  {researched.offers.map((o, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[12.5px]">
                      <CheckCircle2
                        size={10}
                        strokeWidth={2}
                        className="text-[#15803D] flex-shrink-0 mt-0.5"
                      />
                      <EditableValue
                        value={o.label}
                        className="text-text-primary flex-1 min-w-0"
                      />
                      {o.meta && (
                        <EditableValue
                          value={o.meta}
                          className="text-[10.5px] text-text-tertiary flex-shrink-0"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* USPs + Avoid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-border rounded-card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={11} strokeWidth={1.8} className="text-[#15803D]" />
                <span className="label-section">USPs to lead with</span>
              </div>
              <ul className="space-y-1.5">
                {researched.usps.map((u, i) => (
                  <li key={i} className="text-[12.5px] text-text-primary flex gap-2 leading-snug">
                    <span className="text-text-tertiary flex-shrink-0">·</span>
                    <EditableValue value={u} multiline className="flex-1 min-w-0" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-border rounded-card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert size={11} strokeWidth={1.8} className="text-[#92400E]" />
                <span className="label-section">Do not mention</span>
              </div>
              <ul className="space-y-1.5">
                {researched.avoid.map((a, i) => (
                  <li key={i} className="text-[12.5px] text-text-primary flex gap-2 leading-snug">
                    <span className="text-text-tertiary flex-shrink-0">·</span>
                    <EditableValue value={a} multiline className="flex-1 min-w-0" />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white border border-border rounded-card p-4">
            <div className="label-section mb-2">Sources I checked</div>
            <ul className="space-y-1">
              {researched.sources.map((s, i) => (
                <li key={i} className="text-[12px] text-text-secondary flex items-center gap-2 leading-snug">
                  <CheckCircle2 size={10} strokeWidth={1.8} className="text-[#15803D] flex-shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 flex items-start gap-2.5">
            <SpotMark size={16} />
            <div className="text-[12px] text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">No past campaign data yet.</span>{" "}
              I'll plan a conservative experiment campaign at the next step — small budget,
              one campaign per persona — and let the data inform scale-up.
            </div>
          </div>
        </div>
      ) : product ? (
        // Cards stagger in one by one after the loader so the page
        // doesn't slam in all at once. Each motion.div reveals at a
        // small offset; matches the agentic "filling in as I find it"
        // feel.
        <motion.div
          variants={canvasStagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* Product brief — the spine of memory: what the product is */}
          <motion.div variants={canvasReveal} className="bg-white border border-border rounded-card p-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <div className="text-[11px] text-text-tertiary mb-1">{product.client} · {product.category}</div>
                <div className="text-card-title text-text-primary">{product.name}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="pill pill-ok" style={{ fontSize: 9.5 }}>
                  Memory {Math.round(product.readiness * 100)}%
                </span>
                <span className="pill" style={{ fontSize: 9.5 }}>
                  {product.performance.activeCampaigns} live
                </span>
              </div>
            </div>
            <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{product.tagline}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-3 border-t border-border-subtle">
              {product.brief.map((r, i) => (
                <div key={i} className="flex items-baseline gap-2 text-[12.5px] leading-snug min-w-0">
                  <span className="text-[13px] flex-shrink-0" aria-hidden>{r.icon}</span>
                  <span className="text-text-tertiary flex-shrink-0">{r.label}:</span>
                  <EditableValue value={r.value} className="text-text-primary flex-1 min-w-0" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Pricing — compact 3-column cells. Name + cost stack vertically
              inside each cell so the eye doesn't have to bounce from one
              edge of the row to the other. */}
          <motion.div variants={canvasReveal} className="bg-white border border-border rounded-card p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="label-section">Pricing</span>
              <span className="text-[10.5px] text-text-tertiary">Tap any value to edit</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {product.pricing.map((p) => (
                <div
                  key={p.name}
                  className="border border-border rounded-button p-2.5 bg-surface-page hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11.5px] text-text-secondary truncate">{p.name}</span>
                    {p.badge && (
                      <span className="pill pill-info flex-shrink-0" style={{ fontSize: 9, padding: "0 4px" }}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <EditableValue
                    value={p.cost}
                    className="text-[16px] font-semibold text-text-primary tabular leading-tight"
                  />
                  {p.cadence && (
                    <div className="text-[10.5px] text-text-tertiary mt-0.5">{p.cadence}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border-subtle">
              <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider mb-1.5">
                Active offers
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.offers.map((o, i) => (
                  <span key={i} className="pill pill-warn" style={{ fontSize: 10.5 }}>
                    {o.label}
                    {o.meta && <span className="text-[10px] opacity-70 ml-1">· {o.meta}</span>}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Personas + Do-not-mention stacked side-by-side so the canvas
              uses the full width and avoids dead space. */}
          <motion.div variants={canvasReveal} className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-border rounded-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="label-section">Personas running</span>
                <span className="text-[11px] text-text-tertiary">{product.personas.length} linked</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {product.personas.map((p) => (
                  <a
                    key={p.id}
                    href={`/personas?focus=${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 pill hover:bg-surface-secondary transition-colors"
                    title="Open persona in a new tab"
                  >
                    {p.name}
                    <ExternalLink size={9} strokeWidth={1.6} className="text-text-tertiary" />
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-white border border-border rounded-card p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert size={11} strokeWidth={1.8} className="text-[#92400E]" />
                <span className="label-section">Do not mention</span>
              </div>
              <ul className="space-y-1.5">
                {product.avoid.map((a, i) => (
                  <li key={i} className="text-[12px] text-text-primary flex gap-2 leading-snug">
                    <span className="text-text-tertiary">·</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div className="bg-white border border-border rounded-card p-4 text-[12.5px] text-text-tertiary italic">
          No product memory found — start fresh in chat.
        </div>
      )}
    </div>
  );
}

/**
 * Inline-editable value. Click to enter edit mode, Enter or blur saves,
 * Escape cancels. Mock-only: edits live in component state — no global
 * memory mutation, the chat reflects intent.
 *
 * Use anywhere on the canvas you want to signal "this is editable by
 * the user" — the canvas is a workspace they share with Spot.
 */
function EditableValue({
  value,
  className = "",
  multiline,
}: {
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  const [current, setCurrent] = useState(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    const commit = () => {
      setCurrent(draft.trim() || current);
      setEditing(false);
    };
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft(current);
              setEditing(false);
            }
          }}
          className={`${className} bg-white border border-[#111] rounded-[4px] px-1 -mx-1 outline-none resize-none w-full`}
        />
      );
    }
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(current);
            setEditing(false);
          }
        }}
        className={`${className} bg-white border border-[#111] rounded-[4px] px-1 -mx-1 outline-none`}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => {
        setDraft(current);
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setDraft(current);
          setEditing(true);
        }
      }}
      className={`${className} cursor-text rounded-[3px] hover:bg-surface-secondary/60 hover:[box-shadow:0_1px_0_0_rgba(0,0,0,0.18)_inset] px-0.5 -mx-0.5 transition-all inline-flex items-baseline gap-1 group/edit`}
      title="Click to edit"
    >
      <span className="truncate">{current}</span>
      <Pencil
        size={9}
        strokeWidth={1.8}
        className="text-text-tertiary/0 group-hover/edit:text-text-tertiary/70 transition-colors flex-shrink-0"
      />
    </span>
  );
}

/**
 * Loading-state shimmer shown on the kickoff canvas while the
 * Memory Reader agent "fetches" the product file. Matches the
 * structure of the real KickoffStep so the layout doesn't jump on
 * reveal. Uses the .skeleton utility from globals.css for the shimmer.
 */
function KickoffSkeleton({ productName }: { productName: string }) {
  return (
    <div className="px-5 py-5">
      <div className="mb-5 flex items-center gap-2">
        <Cog
          size={13}
          strokeWidth={1.8}
          className="text-text-secondary animate-spin"
          style={{ animationDuration: "2s" }}
        />
        <span className="text-[12px] text-text-secondary">
          Loading <span className="text-text-primary font-medium">{productName}</span> from memory…
        </span>
      </div>

      <div className="space-y-4">
        {/* Hero card */}
        <div className="bg-white border border-border rounded-card p-4 space-y-2.5">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-5 w-1/2 rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="flex gap-3 pt-3 border-t border-border-subtle">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
        </div>

        {/* USPs + Avoid */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white border border-border rounded-card p-4 space-y-2">
              <div className="skeleton h-2.5 w-20 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-11/12 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>

        {/* Personas pills */}
        <div className="bg-white border border-border rounded-card p-4">
          <div className="skeleton h-2.5 w-24 rounded mb-2.5" />
          <div className="flex gap-1.5">
            <div className="skeleton h-4 w-28 rounded-full" />
            <div className="skeleton h-4 w-24 rounded-full" />
            <div className="skeleton h-4 w-20 rounded-full" />
          </div>
        </div>

        {/* Memory timeline */}
        <div className="bg-white border border-border rounded-card p-4 space-y-2.5">
          <div className="skeleton h-2.5 w-28 rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <div className="skeleton w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-3 w-11/12 rounded" />
                <div className="skeleton h-2.5 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="flex-1 space-y-1">
      <div className="skeleton h-2.5 w-14 rounded" />
      <div className="skeleton h-5 w-12 rounded" />
    </div>
  );
}

/* ─── Personas — recommended (combined existing + new) ──────── */

function PersonasStep() {
  // PersonasStep only ever renders inside the launch flow — narrow to
  // LaunchWorkflow so `.approvals` is type-safe.
  const approvals = useSpotStore((s) =>
    s.workflow && s.workflow.kind === "launch-campaign" ? s.workflow.approvals : null,
  );
  const toggle = useSpotStore((s) => s.toggleWorkflowApproval);
  if (!approvals) return null;
  const selectedCount = approvals.personaIds.length;

  return (
    <div className="px-5 py-5 fadeUp">
      <StepHeader
        title="Personas Spot recommends"
        blurb={`${LAUNCH_PERSONAS.length} candidates — based on past performance and audience overlap. Tap any card to include in this run. New personas are written to your global library on approval.`}
      />

      {/* Selection summary */}
      <div className="bg-white border border-border rounded-card px-4 py-2.5 mb-4 flex items-center gap-2">
        <CheckCircle2
          size={13}
          strokeWidth={2}
          className={selectedCount > 0 ? "text-[#15803D]" : "text-text-tertiary"}
        />
        <span className="text-[12.5px] text-text-primary">
          <span className="tabular font-medium">{selectedCount}</span>
          <span className="text-text-secondary"> of {LAUNCH_PERSONAS.length} selected</span>
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => {
            const allIds = LAUNCH_PERSONAS.map((p) => p.id);
            const allSelected = allIds.every((id) => approvals.personaIds.includes(id));
            if (allSelected) {
              // Deselect every persona
              allIds.forEach((id) => toggle("personaIds", id));
            } else {
              // Add the missing ones
              allIds.forEach((id) => {
                if (!approvals.personaIds.includes(id)) toggle("personaIds", id);
              });
            }
          }}
          className="text-[11.5px] text-text-secondary hover:text-text-primary"
        >
          {LAUNCH_PERSONAS.every((p) => approvals.personaIds.includes(p.id))
            ? "Deselect all"
            : "Select all"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LAUNCH_PERSONAS.map((p) => {
          const checked = approvals.personaIds.includes(p.id);
          return (
            <PersonaCard
              key={p.id}
              persona={p}
              selected={checked}
              onToggle={() => toggle("personaIds", p.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  selected,
  onToggle,
}: {
  persona: (typeof LAUNCH_PERSONAS)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  const isNew = persona.origin === "new";
  // For new personas, "selected" doubles as "approved" — the persona
  // hasn't been written to the library until the user explicitly says
  // yes. For existing personas, selection just means "include in run".
  const isNewApproved = isNew && selected;
  const isNewUnapproved = isNew && !selected;

  return (
    <div
      className={`relative rounded-card overflow-hidden transition-all ${
        isNewUnapproved
          ? // NEW unapproved: prominent dashed amber outline + warm tint
            "bg-[#FFFCEC] border-2 border-dashed border-[#E8C97A] cursor-default"
          : selected
            ? "bg-white border border-[#111] shadow-card-hover cursor-pointer"
            : "bg-white border border-border hover:border-text-tertiary cursor-pointer"
      }`}
      onClick={() => {
        // Card body toggles inclusion ONLY for already-approved personas.
        // New unapproved cards require the explicit Approve button.
        if (!isNewUnapproved) onToggle();
      }}
      role={isNewUnapproved ? undefined : "button"}
      aria-pressed={!isNewUnapproved ? selected : undefined}
    >
      {/* NEW ribbon — eyebrow strip, sparkle, prominent treatment */}
      {isNew && (
        <div
          className={`flex items-center gap-1.5 px-3 py-1 ${
            isNewUnapproved ? "bg-[#E8C97A]/40" : "bg-[#F0FDF4]"
          }`}
        >
          <Sparkles
            size={10}
            strokeWidth={2}
            className={isNewUnapproved ? "text-[#92400E]" : "text-[#15803D]"}
          />
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              isNewUnapproved ? "text-[#92400E]" : "text-[#15803D]"
            }`}
          >
            {isNewUnapproved ? "New · Spot-drafted persona" : "New · approved"}
          </span>
        </div>
      )}

      <div className="p-3">
        {/* Identity row — avatar + name + checkbox */}
        <div className="flex items-center gap-2.5 mb-2">
          {/* Compact avatar disc — 28px instead of 40 */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-semibold text-white flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, hsl(${persona.hue} 65% 45%) 0%, hsl(${persona.hue} 55% 30%) 100%)`,
            }}
          >
            {persona.avatarLetters}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-text-primary truncate leading-tight">
              {persona.name}
            </div>
            {!isNew && (
              <div className="text-[10.5px] text-text-tertiary">From library</div>
            )}
          </div>
          {/* Checkbox — only for non-NEW or approved-NEW (otherwise the
              Approve button is the action). */}
          {!isNewUnapproved && (
            <div
              className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center flex-shrink-0 ${
                selected ? "bg-[#111] border-[#111]" : "bg-white border-text-tertiary/50"
              }`}
            >
              {selected && <Check size={10} strokeWidth={3} className="text-white" />}
            </div>
          )}
        </div>

        {/* Rationale */}
        <p className="text-[11.5px] text-text-secondary leading-snug mb-2.5">{persona.rationale}</p>

        {/* Insights — single dense row, smaller chips, no icons */}
        <div className="flex flex-wrap gap-1 mb-2.5">
          {persona.insights.slice(0, 3).map((ins, i) => {
            const cls =
              ins.tone === "strong" ? "pill-ok" : ins.tone === "warn" ? "pill-warn" : "pill-info";
            return (
              <span key={i} className={`pill ${cls}`} style={{ fontSize: 9.5, padding: "1px 6px" }}>
                {ins.label}
              </span>
            );
          })}
        </div>

        {/* Action row */}
        {isNewUnapproved ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(); // Approving the new persona = adding to personaIds
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 h-7 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[11.5px] font-medium"
          >
            <Sparkles size={10} strokeWidth={2} />
            Approve persona
          </button>
        ) : (
          <a
            href={`/personas#${persona.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary"
          >
            View persona
            <ExternalLink size={9} strokeWidth={1.6} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Media plan ─────────────────────────────────────────────── */

const CHANNEL_TINT: Record<Channel["id"], string> = {
  meta: "#1877F2",
  "google-search": "#34A853",
  "google-discover": "#FBBC04",
  outreach: "#A855F7",
};

// Bucket → tone for the campaign card eyebrow chip.
const BUCKET_PILL: Record<CampaignBucket, { label: string; pill: string }> = {
  experiment: { label: "Experiment", pill: "pill-info" },
  scaling: { label: "Scaling", pill: "pill-ok" },
  "cost-cap": { label: "Cost cap", pill: "pill" },
  "search-brand": { label: "Brand", pill: "pill-info" },
  "search-category": { label: "Category", pill: "pill-info" },
  "search-competitor": { label: "Competitor", pill: "pill-warn" },
  "discover-cold": { label: "Cold", pill: "pill-info" },
  "discover-retarget": { label: "Retarget", pill: "pill-ok" },
  "discover-lookalike": { label: "Lookalike", pill: "pill-ok" },
  voice: { label: "Voice", pill: "pill-info" },
  whatsapp: { label: "WhatsApp", pill: "pill-ok" },
};

function MediaPlanStep() {
  // Launch-only step — narrow at the boundary.
  const wf = useSpotStore((s) =>
    s.workflow && s.workflow.kind === "launch-campaign" ? s.workflow : null,
  );
  const setBudget = useSpotStore((s) => s.setWorkflowBudget);
  const whatsAppConnected = useSpotStore((s) => s.whatsAppConnected);
  const connectWhatsApp = useSpotStore((s) => s.connectWhatsApp);
  if (!wf) return null;
  const channels = generatePlan(wf.budget?.amountInr || 0, whatsAppConnected);
  const totalBudget = wf.budget?.amountInr || 0;
  const days = wf.budget?.days || 7;

  return (
    <div className="px-5 py-5">
      <StepHeader
        title="Plan"
        blurb="3-bucket Meta model · Google Search and Discover lanes · Outreach for Voice + WhatsApp. Each campaign carries the reason it exists."
      />

      <BudgetCard
        amount={totalBudget}
        days={days}
        onChange={(amount, d) => setBudget({ amountInr: amount, days: d })}
        onClear={() => setBudget({ amountInr: 0, days: 7 })}
      />

      <div className="space-y-4 mt-4">
        {channels.map((ch) => {
          const channelBudget = Math.round(ch.share * totalBudget);
          return (
            <div key={ch.id} className="space-y-2">
              {/* Channel header */}
              <div className="flex items-center gap-2.5 px-1">
                <div
                  className="w-5 h-5 rounded-button flex items-center justify-center flex-shrink-0"
                  style={{ background: `${CHANNEL_TINT[ch.id]}20`, color: CHANNEL_TINT[ch.id] }}
                >
                  <Megaphone size={10} strokeWidth={1.8} />
                </div>
                <div className="text-[12.5px] font-semibold text-text-primary">{ch.name}</div>
                <div className="text-[11px] text-text-tertiary truncate flex-1 min-w-0">{ch.rationale}</div>
                <span className="text-[11px] text-text-tertiary tabular">
                  {Math.round(ch.share * 100)}%
                </span>
                {totalBudget > 0 && (
                  <span className="text-[12px] tabular text-text-primary font-medium">
                    {inr(channelBudget)}
                  </span>
                )}
              </div>
              {/* Campaign cards */}
              <div className="grid grid-cols-3 gap-2">
                {ch.campaigns.map((c) => {
                  const bucket = BUCKET_PILL[c.kind];
                  const campaignBudget = Math.round(c.budgetShare * channelBudget);
                  return (
                    <div
                      key={c.id}
                      className="bg-white border border-border rounded-card p-3 flex flex-col gap-1.5"
                    >
                      <span className={`pill ${bucket.pill} self-start`} style={{ fontSize: 9.5 }}>
                        {bucket.label}
                      </span>
                      <div className="text-[12px] font-medium text-text-primary leading-snug">
                        {c.name}
                      </div>
                      <p className="text-[11px] text-text-secondary leading-snug">{c.purpose}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.targets.map((t, i) => (
                          <span key={i} className="pill" style={{ fontSize: 9, padding: "0 5px" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-auto pt-1.5 border-t border-border-subtle">
                        <span className="text-[10.5px] tabular text-text-tertiary">
                          {Math.round(c.budgetShare * 100)}%
                        </span>
                        {totalBudget > 0 && (
                          <span className="text-[11px] tabular text-text-primary font-medium">
                            {inr(campaignBudget)}
                          </span>
                        )}
                        <span className="flex-1" />
                        {c.availability === "available" ? (
                          <span className="pill pill-ok inline-flex items-center gap-1" style={{ fontSize: 9 }}>
                            <Wifi size={8} strokeWidth={2} />
                            Live
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={connectWhatsApp}
                            className="inline-flex items-center gap-1 h-5 px-1.5 rounded-button bg-[#25D366] hover:bg-[#1FB058] text-white text-[9.5px] font-medium"
                          >
                            <WifiOff size={8} strokeWidth={2} />
                            Connect WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Budget input on the canvas. Two-mode: a quick text input + windows.
 * Empty = "experiment baseline" with a clear callout. Changing either
 * the amount or the window updates the workflow store.
 */
function BudgetCard({
  amount,
  days,
  onChange,
  onClear,
}: {
  amount: number;
  days: number;
  onChange: (amountInr: number, days: number) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(amount > 0 ? amount.toString() : "");
  const isSet = amount > 0;

  return (
    <div
      className={`rounded-card p-3.5 ${
        isSet
          ? "bg-white border border-border"
          : "bg-[#FAF8F2] border border-[#E8C97A]"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {isSet ? (
          <CheckCircle2 size={11} strokeWidth={1.8} className="text-[#15803D]" />
        ) : (
          <Sparkles size={11} strokeWidth={1.8} className="text-[#92400E]" />
        )}
        <span className="label-section">
          {isSet ? "Budget" : "Experiment baseline (no budget yet)"}
        </span>
        <span className="flex-1" />
        {isSet && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onClear();
            }}
            className="text-[11px] text-text-tertiary hover:text-text-primary"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center flex-1">
          <span className="inline-flex items-center justify-center w-7 h-8 rounded-l-input border border-r-0 border-border bg-surface-page text-[12.5px] text-text-tertiary">
            ₹
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setDraft(v);
              onChange(+v || 0, days);
            }}
            placeholder="Set a weekly cap (optional)"
            className="flex-1 h-8 px-2.5 rounded-r-input border border-border text-[13px] tabular focus:outline-none focus:border-text-primary"
          />
        </div>
        <div className="inline-flex items-center gap-0.5 bg-surface-secondary p-0.5 rounded-button">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(+draft || 0, d)}
              className={`h-7 px-2 rounded-[5px] text-[11px] font-medium ${
                days === d ? "bg-white text-text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      {!isSet && (
        <div className="text-[11px] text-text-secondary mt-2">
          I'll use historical persona payoff to allocate across channels. Set a cap to lock spend.
        </div>
      )}
    </div>
  );
}

/* ─── Creatives — tabs + one-by-one loading ────────────────── */

function CreativesStep() {
  const [activeTab, setActiveTab] = useState<"visual" | "search">("visual");
  return (
    <div className="px-5 py-5">
      <StepHeader
        title="Creative direction"
        blurb="Visual angles per persona for Meta · search ad copy for Google. The Creative Agent generates concepts one at a time per persona — watch the right pane fill in."
      />

      {/* Tabs */}
      <div className="inline-flex items-center gap-0.5 bg-surface-secondary p-0.5 rounded-button mb-4">
        <TabButton active={activeTab === "visual"} onClick={() => setActiveTab("visual")}>
          Visual ads · Meta
        </TabButton>
        <TabButton active={activeTab === "search"} onClick={() => setActiveTab("search")}>
          Search ads · Google
        </TabButton>
      </div>

      {activeTab === "visual" ? <VisualAdsTab /> : <SearchAdsTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 px-3 rounded-[5px] text-[11.5px] font-medium transition-colors ${
        active ? "bg-white text-text-primary shadow-card-hover" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Per-persona creative generation. Creatives appear ONE AT A TIME on a
 * timer. Once all creatives for a persona are done, that persona's
 * card collapses to a summary and the next persona begins. Mirrors how
 * an agent would actually do the work.
 */
function VisualAdsTab() {
  const packs = SAMPLE_ANGLES;
  // currentPersonaIdx counts forward; when it equals packs.length, all
  // personas are done. angleIdx tracks progress within the current persona.
  const [currentPersonaIdx, setCurrentPersonaIdx] = useState(0);
  const [angleIdx, setAngleIdx] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Drive the generation timer.
  useEffect(() => {
    if (currentPersonaIdx >= packs.length) return;
    const pack = packs[currentPersonaIdx];
    const PER_CREATIVE_MS = 1800;
    const PERSONA_BUFFER_MS = 900;
    const t = setTimeout(
      () => {
        if (angleIdx + 1 < pack.angles.length) {
          setAngleIdx((a) => a + 1);
        } else {
          // All angles for this persona are done — collapse + advance.
          setCollapsed((s) => new Set(s).add(pack.personaId));
          setCurrentPersonaIdx((i) => i + 1);
          setAngleIdx(0);
        }
      },
      angleIdx === 0 && currentPersonaIdx === 0 ? 800 : PER_CREATIVE_MS,
    );
    void PERSONA_BUFFER_MS;
    return () => clearTimeout(t);
  }, [currentPersonaIdx, angleIdx, packs]);

  const allDone = currentPersonaIdx >= packs.length;

  return (
    <div>
      {/* Agent activity strip — shows the current sub-step */}
      <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 mb-3 flex items-center gap-2">
        {allDone ? (
          <>
            <Check size={11} strokeWidth={2.2} className="text-[#15803D]" />
            <span className="text-[11.5px] font-medium text-text-primary">
              All visual creatives ready
            </span>
            <span className="text-[11px] text-text-tertiary">
              · {packs.length} personas · {packs.reduce((s, p) => s + p.angles.length, 0)} angles
            </span>
          </>
        ) : (
          <>
            <Cog
              size={11}
              strokeWidth={1.8}
              className="text-text-secondary animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <span className="text-[11.5px] font-medium text-text-primary">
              Creative Agent · drafting concept {angleIdx + 1} of{" "}
              {packs[currentPersonaIdx]?.angles.length}
            </span>
            <span className="text-[11px] text-text-tertiary">
              · {packs[currentPersonaIdx]?.personaName}
            </span>
          </>
        )}
      </div>

      <div className="space-y-2.5">
        {packs.map((pack, pi) => {
          const isDone = pi < currentPersonaIdx;
          const isActive = pi === currentPersonaIdx;
          const visibleCount = isDone
            ? pack.angles.length
            : isActive
              ? angleIdx + 1
              : 0;
          const isCollapsed = collapsed.has(pack.personaId);

          return (
            <PersonaCreativesCard
              key={pack.personaId}
              pack={pack}
              status={isDone ? "done" : isActive ? "active" : "queued"}
              visibleCount={visibleCount}
              collapsed={isCollapsed}
              onToggleCollapse={() =>
                setCollapsed((s) => {
                  const next = new Set(s);
                  if (next.has(pack.personaId)) next.delete(pack.personaId);
                  else next.add(pack.personaId);
                  return next;
                })
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function PersonaCreativesCard({
  pack,
  status,
  visibleCount,
  collapsed,
  onToggleCollapse,
}: {
  pack: (typeof SAMPLE_ANGLES)[number];
  status: "done" | "active" | "queued";
  visibleCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={status === "done" ? onToggleCollapse : undefined}
        className={`w-full px-3 py-2 border-b border-border-subtle flex items-center gap-2 ${
          status === "done" ? "hover:bg-surface-page cursor-pointer" : "cursor-default"
        }`}
      >
        <Users size={11} strokeWidth={1.6} className="text-text-tertiary" />
        <span className="text-[12px] font-medium text-text-primary">{pack.personaName}</span>
        <span className="text-[10.5px] text-text-tertiary">· {pack.angles.length} angles</span>
        <span className="flex-1" />
        {status === "done" && (
          <span className="pill pill-ok inline-flex items-center gap-1" style={{ fontSize: 9.5 }}>
            <Check size={9} strokeWidth={2.2} />
            Ready
          </span>
        )}
        {status === "active" && (
          <span className="pill pill-info inline-flex items-center gap-1" style={{ fontSize: 9.5 }}>
            <Cog
              size={9}
              strokeWidth={2}
              className="animate-spin"
              style={{ animationDuration: "2s" }}
            />
            Drafting
          </span>
        )}
        {status === "queued" && (
          <span className="pill" style={{ fontSize: 9.5 }}>
            Queued
          </span>
        )}
        {status === "done" && (
          <ChevronRight
            size={12}
            className={`text-text-tertiary transition-transform ${
              collapsed ? "" : "rotate-90"
            }`}
          />
        )}
      </button>

      {/* Body */}
      {(!collapsed || status !== "done") && (
        <div className="grid grid-cols-3 divide-x divide-border-subtle">
          {pack.angles.map((a, ai) => {
            if (ai >= visibleCount + (status === "active" ? 0 : 0)) {
              // Slot for an angle not yet generated.
              if (status === "active" && ai === visibleCount) {
                return <CreativeLoadingTile key={`loading-${ai}`} />;
              }
              return <CreativePlaceholderTile key={`placeholder-${ai}`} />;
            }
            return (
              <ExpandableAngleTile key={a.id} angle={a} hue={(ai * 90) % 360} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreativeLoadingTile() {
  return (
    <div className="p-3 flex flex-col items-center justify-center aspect-[4/5] bg-surface-page gap-2">
      <Cog
        size={14}
        strokeWidth={1.6}
        className="text-text-secondary animate-spin"
        style={{ animationDuration: "1.6s" }}
      />
      <div className="text-[10.5px] text-text-tertiary">Generating…</div>
    </div>
  );
}

function CreativePlaceholderTile() {
  return <div className="p-3 aspect-[4/5] bg-surface-page" />;
}

function ExpandableAngleTile({
  angle,
  hue,
}: {
  angle: { id: string; hook: string; cta: string; format: string };
  hue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="p-2 flex flex-col gap-1 text-left hover:bg-surface-page transition-colors"
      >
        <div
          className="relative aspect-[4/5] rounded-[5px] overflow-hidden"
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 65% 86%) 0%, hsl(${hue} 55% 68%) 100%)`,
          }}
        >
          <div className="absolute top-1 left-1 text-[8.5px] font-medium text-text-primary bg-white/85 px-1 rounded-sm">
            {angle.format}
          </div>
          <div className="absolute inset-1.5 flex flex-col justify-end gap-0.5">
            <div className="h-[2px] rounded-full bg-white/65 w-3/4" />
            <div className="h-[2px] rounded-full bg-white/55 w-1/2" />
            <div className="h-[3px] rounded-sm bg-text-primary/80 w-1/3 mt-0.5" />
          </div>
        </div>
        <div className="text-[10.5px] font-medium text-text-primary leading-snug line-clamp-2">
          {angle.hook}
        </div>
      </button>
      {expanded && (
        <CreativeDetailModal angle={angle} hue={hue} onClose={() => setExpanded(false)} />
      )}
    </>
  );
}

function CreativeDetailModal({
  angle,
  hue,
  onClose,
}: {
  angle: { id: string; hook: string; cta: string; format: string };
  hue: number;
  onClose: () => void;
}) {
  return (
    <div
      className="scrim"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-border rounded-card w-[640px] max-w-[90vw] max-h-[80vh] overflow-y-auto"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <span className="pill" style={{ fontSize: 9.5 }}>{angle.format}</span>
          <span className="text-[12.5px] font-medium text-text-primary flex-1 truncate">
            {angle.hook}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-button text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-[280px_1fr] gap-5">
          {/* Hero */}
          <div
            className="aspect-[4/5] rounded-card overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 65% 86%) 0%, hsl(${hue} 55% 68%) 100%)`,
            }}
          >
            <div className="absolute top-2 left-2 text-[10px] font-medium text-text-primary bg-white/85 px-1.5 rounded">
              {angle.format}
            </div>
            <div className="absolute inset-3 flex flex-col justify-end gap-1">
              <div className="h-1 rounded-full bg-white/65 w-3/4" />
              <div className="h-1 rounded-full bg-white/55 w-1/2" />
              <div className="h-2 rounded-sm bg-text-primary/80 w-1/3 mt-1.5" />
            </div>
          </div>
          {/* Details */}
          <div className="space-y-3 text-[12.5px]">
            <Field2 label="Hook" value={angle.hook} />
            <Field2 label="CTA" value={angle.cta} />
            <Field2 label="Format" value={angle.format} />
            <Field2 label="Lands in" value="Meta · Scaling campaign · Engineer Parent ad set" />
            <Field2 label="Ad strength" value="Strong · ready to ship" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}

/* ─── Search Ads tab ──────────────────────────────────────── */

function SearchAdsTab() {
  return (
    <div className="space-y-2.5">
      {SAMPLE_SEARCH_ADS.map((g) => (
        <SearchAdGroupCard key={g.id} group={g} />
      ))}
    </div>
  );
}

const AD_STRENGTH_TONE: Record<"excellent" | "good" | "average", { pill: string; label: string }> = {
  excellent: { pill: "pill-ok", label: "Excellent" },
  good: { pill: "pill-info", label: "Good" },
  average: { pill: "pill-warn", label: "Average" },
};

function SearchAdGroupCard({ group }: { group: (typeof SAMPLE_SEARCH_ADS)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const strength = AD_STRENGTH_TONE[group.adStrength];
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="pill" style={{ fontSize: 9.5 }}>{group.campaign}</span>
          <span className={`pill ${strength.pill}`} style={{ fontSize: 9.5 }}>
            Ad strength · {strength.label}
          </span>
          <span className="flex-1" />
          <span className="text-[10.5px] text-text-tertiary">
            {group.variants.length} variants
          </span>
        </div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] text-text-tertiary">Ad ·</span>
          <span className="text-[10.5px] text-[#1A0DAB] underline">
            guyjus.com/jee-crack
          </span>
        </div>
        <div className="text-[13.5px] text-[#1A0DAB] leading-tight mb-1">
          {group.primaryHeadline}
        </div>
        <div className="text-[12px] text-text-secondary leading-snug mb-2">
          {group.primaryDescription}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary"
        >
          {expanded ? "Hide" : `View all ${group.variants.length} variants`}
          <ChevronRight
            size={10}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border-subtle bg-surface-page">
          <div className="divide-y divide-border-subtle">
            {group.variants.map((v, i) => (
              <div key={i} className="px-3.5 py-2.5">
                <div className="text-[12.5px] text-[#1A0DAB] leading-tight mb-0.5">
                  {v.headline}
                </div>
                <div className="text-[11.5px] text-text-secondary leading-snug">
                  {v.description}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3.5 py-2 border-t border-border-subtle">
            <div className="text-[10.5px] text-text-tertiary">
              <span className="font-medium">Keywords:</span> {group.keywords}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Resize + QA — attachment view ───────────────────────────── */

// Where each angle lands. Keyed by (personaId, angleId) — drives the
// "Lands in" lines on the attachment view. Mirrors the 3-bucket Meta
// model + Google channels from the Plan step.
function attachmentsFor(personaName: string, angleIdx: number): string[] {
  // Distribute angles across campaigns deterministically.
  const meta = ["Scaling", "Experiment", "Cost cap"][angleIdx % 3];
  return [
    `Meta · ${meta} · ${personaName} ad set`,
    `Google Discover · Cold · ${personaName}`,
  ];
}

function ResizeQaStep() {
  const reviews = buildResizeReviews();
  const totalVariants = reviews.reduce(
    (s, p) => s + p.angles.reduce((ss, a) => ss + a.variants.length, 0),
    0,
  );
  const flagged = reviews.flatMap((p) =>
    p.angles.flatMap((a) =>
      a.variants
        .filter((v) => v.status === "needs-fix")
        .map((v) => ({ ...v, personaName: p.personaName, hook: a.hook, hue: a.hue, angleId: a.id })),
    ),
  );

  const [sizesModal, setSizesModal] = useState<{
    hook: string;
    personaName: string;
    hue: number;
    variants: import("@/lib/spot/workflow").ResizedVariant[];
  } | null>(null);

  return (
    <div className="px-5 py-5">
      <StepHeader
        title="Resize & QA · campaign attachment"
        blurb="Each angle is resized and attached to the campaigns + ad sets that will run it. Click View sizes to inspect resized variants. QA flags surface up top."
      />

      {/* Summary strip */}
      <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 mb-4 flex items-center gap-2">
        <CheckCircle2 size={11} strokeWidth={2} className="text-[#15803D]" />
        <span className="text-[11.5px] font-medium text-text-primary">QA Agent · review complete</span>
        <span className="text-[11px] text-text-tertiary">
          · <span className="tabular font-medium text-text-primary">{totalVariants - flagged.length}</span>{" "}
          clean ·{" "}
          <span className="tabular font-medium text-[#92400E]">{flagged.length}</span> flagged ·
          Resize Agent re-runs flagged on approval
        </span>
      </div>

      {/* Flagged callout */}
      {flagged.length > 0 && (
        <div className="bg-white border border-border rounded-card mb-4 overflow-hidden">
          <div className="px-3.5 py-2 border-b border-border-subtle bg-[#FEF3C7]/40 flex items-center gap-1.5">
            <span className="pill pill-warn" style={{ fontSize: 9.5 }}>
              {flagged.length} flagged
            </span>
            <span className="text-[11.5px] font-medium text-text-primary">Needs a re-render</span>
          </div>
          <div className="divide-y divide-border-subtle">
            {flagged.map((f) => (
              <div key={f.id} className="px-3.5 py-2.5 flex items-center gap-3">
                <span className="pill" style={{ fontSize: 9.5 }}>{f.format}</span>
                <span className="text-[10.5px] text-text-tertiary">{f.channel}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-text-primary truncate">
                    {f.personaName} · {f.hook}
                  </div>
                  <div className="text-[11px] text-text-secondary leading-snug mt-0.5">{f.note}</div>
                </div>
                <span className="pill pill-warn" style={{ fontSize: 10 }}>
                  Re-render queued
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-persona × angle attachments */}
      <div className="space-y-3">
        {reviews.map((p) => (
          <div key={p.personaId} className="bg-white border border-border rounded-card overflow-hidden">
            <div className="px-3.5 py-2 border-b border-border-subtle flex items-center gap-2">
              <Users size={11} strokeWidth={1.6} className="text-text-tertiary" />
              <span className="text-[12px] font-medium text-text-primary">{p.personaName}</span>
              <span className="text-[10.5px] text-text-tertiary">· {p.angles.length} angles</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {p.angles.map((a, ai) => {
                const attachments = attachmentsFor(p.personaName, ai);
                const flaggedCount = a.variants.filter((v) => v.status === "needs-fix").length;
                return (
                  <div key={a.id} className="px-3.5 py-2.5 flex items-start gap-3">
                    {/* Hero thumbnail */}
                    <div
                      className="w-12 h-12 rounded-[5px] flex-shrink-0 relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, hsl(${a.hue} 65% 86%) 0%, hsl(${a.hue} 55% 68%) 100%)`,
                      }}
                    >
                      <div className="absolute inset-1 flex flex-col justify-end gap-0.5">
                        <div className="h-[2px] rounded-full bg-white/65 w-3/4" />
                        <div className="h-[2px] rounded-full bg-white/55 w-1/2" />
                        <div className="h-[3px] rounded-sm bg-text-primary/80 w-1/3 mt-0.5" />
                      </div>
                    </div>
                    {/* Hook + attachments */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-text-primary mb-1 truncate">
                        {a.hook}
                      </div>
                      <div className="space-y-0.5">
                        {attachments.map((att, i) => (
                          <div
                            key={i}
                            className="text-[11px] text-text-secondary flex items-center gap-1 leading-snug"
                          >
                            <ArrowRight size={9} strokeWidth={1.6} className="text-text-tertiary flex-shrink-0" />
                            <span>{att}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {flaggedCount > 0 && (
                        <span className="pill pill-warn inline-flex items-center gap-1" style={{ fontSize: 9.5 }}>
                          {flaggedCount} flagged
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setSizesModal({
                            hook: a.hook,
                            personaName: p.personaName,
                            hue: a.hue,
                            variants: a.variants,
                          })
                        }
                        className="inline-flex items-center gap-1 h-6 px-2 rounded-button border border-border bg-white hover:border-border-hover text-[10.5px] font-medium text-text-secondary hover:text-text-primary"
                      >
                        <ImageIcon size={9} strokeWidth={1.8} />
                        View sizes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sizes modal */}
      {sizesModal && (
        <ResizeSizesModal
          personaName={sizesModal.personaName}
          hook={sizesModal.hook}
          hue={sizesModal.hue}
          variants={sizesModal.variants}
          onClose={() => setSizesModal(null)}
        />
      )}
    </div>
  );
}

function ResizeSizesModal({
  personaName,
  hook,
  hue,
  variants,
  onClose,
}: {
  personaName: string;
  hook: string;
  hue: number;
  variants: import("@/lib/spot/workflow").ResizedVariant[];
  onClose: () => void;
}) {
  return (
    <div className="scrim" onClick={onClose} role="dialog" aria-modal>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-border rounded-card w-[680px] max-w-[90vw] max-h-[80vh] overflow-y-auto"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
          <div className="text-[10.5px] text-text-tertiary">{personaName}</div>
          <span className="text-[12.5px] font-medium text-text-primary flex-1 truncate">
            {hook}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-button text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider mb-3">
            All resized variants
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {variants.map((v) => {
              const failed = v.status === "needs-fix";
              const dims: Record<typeof v.format, { w: number; h: number }> = {
                "1:1": { w: 120, h: 120 },
                "4:5": { w: 100, h: 125 },
                "9:16": { w: 78, h: 138 },
                "16:9": { w: 168, h: 95 },
              };
              const d = dims[v.format];
              return (
                <div key={v.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`relative rounded-[5px] border overflow-hidden ${
                      failed ? "border-[#F5A623] ring-2 ring-[#F5A623]/30" : "border-border"
                    }`}
                    style={{
                      width: d.w,
                      height: d.h,
                      background: `linear-gradient(135deg, hsl(${hue} 65% 88%) 0%, hsl(${hue} 55% 72%) 100%)`,
                    }}
                  >
                    <div className="absolute inset-2 flex flex-col justify-end gap-0.5">
                      <div className="h-[3px] rounded-full bg-white/70 w-3/4" />
                      <div className="h-[3px] rounded-full bg-white/55 w-1/2" />
                      <div className="h-[5px] rounded-sm bg-text-primary/80 w-1/3 mt-0.5" />
                    </div>
                    <div className="absolute top-1 left-1 text-[9px] font-medium text-text-primary bg-white/85 px-1 rounded-sm">
                      {v.format}
                    </div>
                    {failed && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F5A623] flex items-center justify-center">
                        <span className="text-[9px] text-white font-bold">!</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary">
                    {v.format} · {v.channel}
                  </div>
                  {failed && (
                    <div className="text-[10px] text-[#92400E] text-center max-w-[140px] leading-snug">
                      {v.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Forms & landing pages — preview-rich ────────────────── */

function FormsStep() {
  const [tab, setTab] = useState<"meta" | "landing">("meta");
  const metaForms = SAMPLE_FORMS.filter((f) => f.kind === "lead-form");
  const landingPages = SAMPLE_FORMS.filter((f) => f.kind === "landing-page");

  return (
    <div className="px-5 py-5">
      <StepHeader
        title="Forms & landing pages"
        blurb="Native Meta lead forms and standalone landing pages — preview either, edit copy via chat."
      />

      <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 mb-4 flex items-center gap-2">
        <Check size={11} strokeWidth={2.2} className="text-[#15803D]" />
        <span className="text-[11.5px] font-medium text-text-primary">
          Forms Agent · {SAMPLE_FORMS.filter((f) => f.status === "ready").length} ready
        </span>
        <span className="text-[11px] text-text-tertiary">
          · {SAMPLE_FORMS.filter((f) => f.status !== "ready").length} pending review
        </span>
      </div>

      <div className="inline-flex items-center gap-0.5 bg-surface-secondary p-0.5 rounded-button mb-4">
        <TabButton active={tab === "meta"} onClick={() => setTab("meta")}>
          Meta forms · {metaForms.length}
        </TabButton>
        <TabButton active={tab === "landing"} onClick={() => setTab("landing")}>
          Landing pages · {landingPages.length}
        </TabButton>
      </div>

      {tab === "meta" ? (
        <div className="space-y-3">
          {metaForms.map((f) => (
            <MetaFormPreview key={f.id} form={f} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {landingPages.map((f) => (
            <LandingPagePreview key={f.id} form={f} />
          ))}
        </div>
      )}
    </div>
  );
}

const FORM_STATUS_PILL: Record<typeof SAMPLE_FORMS[number]["status"], { label: string; pill: string }> = {
  ready: { label: "Ready", pill: "pill-ok" },
  "needs-review": { label: "Needs review", pill: "pill-warn" },
  drafted: { label: "Drafted", pill: "pill" },
};

/**
 * Native-Meta lead form preview. Form settings summary on the left,
 * phone-frame preview on the right showing the actual form rendering
 * the way it would appear in-feed. Settings aren't editable in this
 * mock — the user prompts Spot to make edits.
 */
function MetaFormPreview({ form }: { form: typeof SAMPLE_FORMS[number] }) {
  const status = FORM_STATUS_PILL[form.status];
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center gap-2">
        <Users size={11} strokeWidth={1.6} className="text-text-tertiary" />
        <span className="text-[12.5px] font-medium text-text-primary">{form.name}</span>
        <span className="text-[11px] text-text-tertiary">· {form.personaName}</span>
        <span className="flex-1" />
        <span className={`pill ${status.pill}`} style={{ fontSize: 9.5 }}>
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_180px] gap-4 p-4">
        {/* Settings summary (left) */}
        <div className="space-y-3 text-[12px]">
          <SettingRow label="Form type" value="Native Meta lead form · pre-filled" />
          <SettingRow label="Form headline" value="Get the free demo class · IIT-alum mentor" />
          <SettingRow label="Description" value="Live cohort · Class 11 + 12 · 60-student cap. Pick a slot — we'll WhatsApp the link." />
          <SettingRow label="Fields" value="Full name · Phone (pre-filled) · Email · Class" />
          <SettingRow label="Privacy policy" value="guyjus.com/legal/privacy" />
          <SettingRow
            label="Thank-you screen"
            value="Booked. We've sent the WhatsApp link to {phone}."
          />
          <SettingRow label="Post-fill" value="Voice AI agent calls within 5 min" />
          <div className="text-[10.5px] text-text-tertiary pt-1">
            Tap the chat to ask Spot to refine anything.
          </div>
        </div>
        {/* Phone preview (right) */}
        <PhoneFramePreview form={form} />
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-text-primary leading-snug">{value}</div>
    </div>
  );
}

/**
 * Schematic phone frame with the Meta lead form preview. Not a real
 * screenshot — a mock representation that reads like Meta's actual
 * in-feed lead form: card with brand logo, intro line, headline,
 * description, form fields, and submit button.
 */
function PhoneFramePreview({ form }: { form: typeof SAMPLE_FORMS[number] }) {
  void form;
  return (
    <div className="relative">
      <div
        className="rounded-[24px] border-[6px] border-text-primary/85 bg-white overflow-hidden mx-auto"
        style={{ width: 168, height: 320 }}
      >
        {/* Status bar */}
        <div className="bg-text-primary/85 h-2.5 flex items-center justify-between px-2">
          <span className="text-[7.5px] text-white">9:41</span>
          <span className="text-[7.5px] text-white">●●●</span>
        </div>
        {/* Body */}
        <div className="p-2 space-y-1.5 h-full bg-[#F0F2F5] overflow-hidden">
          {/* Logo + brand */}
          <div className="flex items-center gap-1 bg-white rounded p-1.5">
            <div className="w-5 h-5 rounded bg-[#1877F2] flex items-center justify-center text-[8px] font-bold text-white">
              G
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[8.5px] font-semibold text-text-primary">Guyju's JEE</div>
              <div className="text-[7px] text-text-tertiary">Sponsored</div>
            </div>
          </div>
          {/* Headline */}
          <div className="bg-white rounded p-1.5">
            <div className="text-[8.5px] font-semibold text-text-primary leading-tight mb-1">
              Get the free demo class
            </div>
            <div className="text-[7.5px] text-text-secondary leading-snug">
              Live cohort with IIT-alum mentors. Pick a slot.
            </div>
          </div>
          {/* Fields */}
          <div className="bg-white rounded p-1.5 space-y-1">
            <FieldStub label="Full name" />
            <FieldStub label="Phone · pre-filled" filled />
            <FieldStub label="Email" />
            <FieldStub label="Class" />
          </div>
          {/* Submit */}
          <div className="bg-[#1877F2] rounded p-1 text-center">
            <span className="text-[8px] font-semibold text-white">Submit</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldStub({ label, filled }: { label: string; filled?: boolean }) {
  return (
    <div className="border border-border rounded-sm px-1 py-[3px]">
      <div className="text-[6.5px] text-text-tertiary">{label}</div>
      <div className={`text-[8px] ${filled ? "text-text-primary" : "text-text-tertiary/60"}`}>
        {filled ? "+91 98XXX XXXXX" : "·"}
      </div>
    </div>
  );
}

/** Standalone landing-page card — schematic preview with editable
 *  settings via chat. */
function LandingPagePreview({ form }: { form: typeof SAMPLE_FORMS[number] }) {
  const status = FORM_STATUS_PILL[form.status];
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div
        className="relative aspect-[16/10] border-b border-border-subtle"
        style={{ background: "linear-gradient(135deg, #FAFAFA 0%, #F0F0F0 100%)" }}
      >
        <LandingMockBody />
        <span
          className={`pill ${status.pill} absolute top-1.5 right-1.5`}
          style={{ fontSize: 10 }}
        >
          {status.label}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-[12.5px] font-medium text-text-primary truncate">{form.name}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5 flex items-center justify-between">
          <span>{form.personaName}</span>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-text-secondary hover:text-text-primary"
          >
            <Pencil size={10} strokeWidth={1.6} />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function LandingMockBody() {
  return (
    <div className="absolute inset-0 p-3 flex flex-col">
      <div className="h-2 w-12 rounded-full bg-text-primary/30 mb-2" />
      <div className="h-2.5 w-3/4 rounded-full bg-text-primary/80 mb-1" />
      <div className="h-2 w-1/2 rounded-full bg-text-secondary/50 mb-2" />
      <div className="flex-1 grid grid-cols-3 gap-1">
        <div className="rounded-sm bg-white/70 border border-border-subtle" />
        <div className="rounded-sm bg-white/70 border border-border-subtle" />
        <div className="rounded-sm bg-white/70 border border-border-subtle" />
      </div>
      <div className="mt-2 h-3.5 w-20 rounded bg-text-primary self-start" />
    </div>
  );
}

/* ─── Campaigns ───────────────────────────────────────────── */

function CampaignsStep() {
  const totalAdsets = SAMPLE_STRUCTURE.reduce((s, c) => s + c.adsets.length, 0);
  const totalAds = SAMPLE_STRUCTURE.reduce(
    (s, c) => s + c.adsets.reduce((ss, a) => ss + a.adsCount, 0),
    0,
  );

  return (
    <div className="px-5 py-5">
      <StepHeader
        title="Draft campaign structure · ready to deploy"
        blurb="3 campaigns · 6 ad sets · 17 ads, mapped to the approved personas. Approve in chat — I push to Meta + Google."
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStat label="Campaigns" value={SAMPLE_STRUCTURE.length} />
        <MiniStat label="Ad sets" value={totalAdsets} />
        <MiniStat label="Ads" value={totalAds} />
      </div>

      <div className="space-y-3">
        {SAMPLE_STRUCTURE.map((c) => (
          <div key={c.id} className="bg-white border border-border rounded-card overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-border-subtle bg-surface-page flex items-center gap-2">
              <Megaphone size={11} strokeWidth={1.6} className="text-text-tertiary" />
              <span className="text-[13px] font-medium text-text-primary">{c.name}</span>
              <span className="flex-1" />
              <span className="pill" style={{ fontSize: 10 }}>{c.channel}</span>
              <span className="text-[11.5px] tabular text-text-secondary">{inr(c.budgetInr)}</span>
            </div>
            <div className="divide-y divide-border-subtle">
              {c.adsets.map((a) => (
                <div key={a.id} className="px-3.5 py-2 flex items-center gap-2 text-[12px]">
                  <ChevronRight size={11} className="text-text-tertiary ml-4" />
                  <span className="text-text-primary">{a.name}</span>
                  <span className="text-text-tertiary">· {a.personaName}</span>
                  <span className="flex-1" />
                  <span className="text-text-tertiary">{a.adsCount} ads</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-border rounded-card p-3">
      <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className="text-stat-md text-text-primary tabular">{value}</div>
    </div>
  );
}

/* ─── Voice Agent attach ────────────────────────────────────── */

const CHANNEL_ICON: Record<"Voice" | "WhatsApp" | "SMS", typeof Mic> = {
  Voice: Phone,
  WhatsApp: MessageSquare,
  SMS: MessageSquare,
};

function VoiceAgentStep() {
  // Launch-only step.
  const workflow = useSpotStore((s) =>
    s.workflow && s.workflow.kind === "launch-campaign" ? s.workflow : null,
  );
  const attachVoiceAgent = useSpotStore((s) => s.attachVoiceAgent);
  if (!workflow) return null;
  const selected = workflow.attachedVoiceAgentId;
  // Recommend Sherpa as the default since it's the balanced fit.
  const recommendedId = "agent-sherpa";

  return (
    <div className="px-5 py-5">
      <StepHeader
        title="Attach a Voice AI agent"
        blurb="Outbound campaigns route through the agent you pick. Skip if you'd rather run paid-only — outbound stays off."
      />

      <div className="space-y-2.5 mb-3">
        {VOICE_AGENTS.map((a) => {
          const isSelected = selected === a.id;
          const isRecommended = a.id === recommendedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => attachVoiceAgent(isSelected ? null : a.id)}
              className={`w-full text-left bg-white border-2 rounded-card p-4 transition-colors ${
                isSelected
                  ? "border-[#111] shadow-card-hover"
                  : "border-border hover:border-text-tertiary"
              }`}
              role="radio"
              aria-checked={isSelected}
            >
              <div className="flex items-start gap-3">
                {/* Avatar / initial */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12.5px] font-semibold ${
                    isSelected ? "bg-[#111] text-white" : "bg-surface-secondary text-text-secondary"
                  }`}
                >
                  {a.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[13.5px] font-semibold text-text-primary">
                      {a.name}
                    </span>
                    {isRecommended && (
                      <span className="pill pill-info" style={{ fontSize: 9.5 }}>
                        <Sparkles size={9} strokeWidth={2} />
                        Spot recommends
                      </span>
                    )}
                    <span className="flex-1" />
                    {a.channels.map((c) => {
                      const Ico = CHANNEL_ICON[c];
                      return (
                        <span
                          key={c}
                          className="inline-flex items-center gap-0.5 text-[10.5px] text-text-tertiary"
                          title={c}
                        >
                          <Ico size={10} strokeWidth={1.6} />
                          {c}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[12px] text-text-secondary leading-snug mb-2">{a.workflow}</p>

                  <div className="flex items-center gap-4 text-[11.5px]">
                    <div className="flex items-center gap-1">
                      <span className="text-text-tertiary">Qual rate</span>
                      <span className="tabular font-medium text-text-primary">{a.qualRate}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-text-tertiary">Connect</span>
                      <span className="tabular font-medium text-text-primary">
                        {a.connectRate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-text-tertiary">Number</span>
                      <span className="mono text-text-primary">{a.number}</span>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-text-tertiary mt-1.5 italic leading-snug">
                    Best for: {a.bestFor}
                  </div>
                </div>

                {/* Selection indicator */}
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? "bg-[#111] border-[#111]" : "border-text-tertiary/40"
                  }`}
                >
                  {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Skip option */}
      <button
        type="button"
        onClick={() => attachVoiceAgent(null)}
        className={`w-full text-left rounded-card p-3 border-2 border-dashed transition-colors ${
          selected === null
            ? "border-text-primary bg-surface-page"
            : "border-border hover:border-text-tertiary"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <X size={14} strokeWidth={1.6} className="text-text-tertiary" />
          <div className="flex-1">
            <div className="text-[12.5px] font-medium text-text-primary">No outbound · paid-only</div>
            <div className="text-[11px] text-text-tertiary">
              Skip the Voice AI lane. Leads land in your CRM; nurture is your problem.
            </div>
          </div>
          {selected === null && (
            <div className="w-5 h-5 rounded-full border-2 bg-[#111] border-[#111] flex items-center justify-center flex-shrink-0">
              <Check size={11} strokeWidth={3} className="text-white" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

/* ─── Done ────────────────────────────────────────────────── */

function DoneStep({ workflow }: { workflow: LaunchWorkflow }) {
  const exit = useSpotStore((s) => s.exitWorkflow);
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-12 h-12 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-3">
        <PartyPopper size={20} strokeWidth={1.6} className="text-[#15803D]" />
      </div>
      <h2 className="text-section-header text-text-primary">Launch complete</h2>
      <p className="text-meta text-text-secondary mt-1.5 max-w-[360px]">
        Campaigns are live for {workflow.productName}. Track them on /campaigns — Spot will keep watching and flag anything off.
      </p>
      <button
        type="button"
        onClick={exit}
        className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
      >
        Close workflow
      </button>
    </div>
  );
}
