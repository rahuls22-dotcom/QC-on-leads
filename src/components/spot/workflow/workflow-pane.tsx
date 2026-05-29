"use client";

// Right-pane canvas for the launch workflow. **Read-only** — every
// approval action lives in the left chat (via the step-cta part). This
// pane just shows what Spot is working on.

import { PanelRightClose, X, Users, Package, ChartPie, Sparkles, Megaphone, Layout as LayoutIcon, PartyPopper, CheckCircle2, Check, Wifi, WifiOff, Cog, ChevronRight, ChevronDown, Pencil, Search, ShieldAlert, TrendingUp, ExternalLink, Image as ImageIcon, Mic, MessageSquare, Phone, ArrowRight, Upload, FileText, Film as FilmIcon, Layers, Paperclip, Brain, Home, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  type CanvasFile,
  type WorkflowStep,
  type LaunchWorkflow,
  type DiagnosticWorkflow,
  type SpotWorkflow,
  type Channel,
  type CampaignBucket,
} from "@/lib/spot/workflow";
import {
  AnalyzeStep,
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
  "launch-deploy": Upload,
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
// chips. CanvasFile lives in workflow.ts so the chat header (which
// owns the picker) can import the same type.
export const FILE_TABS: {
  key: CanvasFile;
  label: string;
  file: string;
  icon: typeof FileText;
}[] = [
  { key: "memory", label: "Memory", file: "memory.md", icon: FileText },
  { key: "plan", label: "Plan", file: "plan.md", icon: TrendingUp },
  { key: "analysis", label: "Analysis", file: "analysis.md", icon: Search },
  { key: "dashboard", label: "Dashboard", file: "dashboard.html", icon: ChartPie },
  { key: "assets", label: "Assets", file: "assets/", icon: ImageIcon },
];

/** Filter file tabs for a given workflow · the Analysis tab only
 *  exists for diagnostic workflows (scale / optimize / test-angles)
 *  where Spot's findings are persisted as part of product memory. */
export function fileTabsForWorkflow(workflow: SpotWorkflow | null) {
  if (!workflow) return FILE_TABS.filter((t) => t.key !== "analysis");
  const isDiagnostic =
    workflow.kind === "scale" ||
    workflow.kind === "optimize" ||
    workflow.kind === "test-angles";
  return FILE_TABS.filter((t) => t.key !== "analysis" || isDiagnostic);
}

/** Default file to focus when a workflow step changes. The chat
 *  header's picker auto-opens this file when the user advances.
 *
 *  Dashboard is ONLY the home view for `campaign-dive` (Spot it on
 *  a campaign row). Every other workflow drives the user through
 *  Plan → Assets, never the dashboard.
 */
export function defaultFileForStep(step: WorkflowStep): CanvasFile {
  // ── Launch flow ───────────────────────────────────────
  if (
    step === "product-setup" ||
    step === "deep-research" ||
    step === "kickoff"
  )
    return "memory";
  if (step === "launch-plan" || step === "launch-building") return "plan";
  if (
    step === "launch-review" ||
    step === "launch-deploy" ||
    step === "done"
  )
    return "assets";

  // ── Scale + Optimize ─────────────────────────────────
  // Analyze phase lands on the Analysis tab (Spot's findings live
  // there as part of memory). Clarify / plan / live shift to the
  // Plan tab so the user sees what's being updated.
  if (step === "scale-analyze" || step === "opt-analyze") return "analysis";
  if (step.startsWith("scale-") || step.startsWith("opt-")) return "plan";

  // ── Test Angles ──────────────────────────────────────
  // Analyze lands on Analysis (the audit of current angles); plan
  // lands on Plan; live focuses Assets where new creatives appear.
  if (step === "ang-analyze") return "analysis";
  if (step === "ang-clarify" || step === "ang-plan") return "plan";
  if (step === "ang-live") return "assets";

  // ── Campaign dive ────────────────────────────────────
  // The only workflow whose home view is the Dashboard.
  if (step === "campaign-dive") return "dashboard";

  return "memory";
}

/**
 * Right-pane canvas. Renders 1 or 2 file panes side-by-side, driven
 * by the store's `canvasFiles` array (managed from the chat header).
 * Each pane has a slim header with the filename and an X to close;
 * closing the last pane collapses the whole canvas.
 *
 * Visual treatment: rounded floating card with shadow so the canvas
 * reads as an overlay on top of the chat rather than a hard split.
 */
export function WorkflowPane() {
  const workflow = useSpotStore((s) => s.workflow);
  const canvasFiles = useSpotStore((s) => s.canvasFiles);
  const closeCanvasFile = useSpotStore((s) => s.closeCanvasFile);
  const toggleCanvas = useSpotStore((s) => s.toggleCanvas);
  const exitWorkflow = useSpotStore((s) => s.exitWorkflow);
  const focusCanvasFile = useSpotStore((s) => s.focusCanvasFile);

  // Auto-focus the most relevant file when the workflow step changes.
  // We REPLACE the canvas (not add a second pane) — advancing from
  // memory → plan should swap the file in place, the way Claude
  // Code's preview button does, not stack two panes side-by-side.
  // The user can still manually open a second pane from the picker.
  useEffect(() => {
    if (!workflow) return;
    const target = defaultFileForStep(workflow.step);
    if (canvasFiles.length === 1 && canvasFiles[0] === target) return;
    focusCanvasFile(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.step]);

  if (!workflow) return null;

  // While the user is mid-card on the left (any sub-step of product
  // setup), nothing meaningful exists to preview yet on the right.
  // Show a clean "awaiting input" pane covering the whole canvas.
  const isAwaitingSetup =
    workflow.kind === "launch-campaign" &&
    workflow.step === "product-setup";

  // After the plan is approved we enter `launch-building`. Spot is
  // assembling everything in the background — there's no file to
  // preview yet. Take the whole canvas over with a dark Spot loader
  // that walks the user through the build work.
  const isBuilding =
    workflow.kind === "launch-campaign" &&
    workflow.step === "launch-building";

  // Approve all · deploy live → enter the deploy phase. Same dark
  // Spot pattern but with deployment-specific cycling thoughts.
  const isDeploying =
    workflow.kind === "launch-campaign" &&
    workflow.step === "launch-deploy";

  // After deploy completes, the canvas lands on the celebration
  // screen. Big Spot mark, "X is live" headline, what shipped.
  const isDone =
    workflow.kind === "launch-campaign" && workflow.step === "done";

  // Diagnostic flows (scale / optimize / test-angles) reuse the dark
  // Spot loader for their analyze + plan phases. The `ready` flag on
  // the workflow gates the reveal — while it's false, the loader
  // takes the canvas; once true, the file view renders normally.
  const diagPhase =
    workflow.kind !== "launch-campaign" && workflow.kind !== "campaign-dive"
      ? diagnosticPhaseFor(workflow.step)
      : null;
  const isDiagLoading = !!(
    diagPhase &&
    workflow.kind !== "launch-campaign" &&
    workflow.kind !== "campaign-dive" &&
    !workflow.ready
  );

  // Empty canvas defensively · the chat header's "Close canvas"
  // button calls closeCanvasFile until the list is empty + sets
  // canvasOpen=false, but if for some reason we render with 0 panes
  // we just show the awaiting state.
  const panes: CanvasFile[] = canvasFiles.length > 0 ? canvasFiles : ["memory"];

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: "#161614", color: "#F5F4EF" }}
    >
      {/* File panes — 1 or 2 columns side-by-side */}
      <div className="flex-1 flex min-h-0">
        {panes.map((tab, idx) => {
          const meta = FILE_TABS.find((t) => t.key === tab) ?? FILE_TABS[0];
          const Icon = meta.icon;
          const canClose = panes.length > 1;
          const isLast = idx === panes.length - 1;
          return (
            <div
              key={tab}
              className="flex-1 min-w-0 flex flex-col"
              style={
                idx > 0 ? { borderLeft: "1px solid #262623" } : undefined
              }
            >
              {/* Pane header · slim, dark-mode, filename + close */}
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{
                  background: "#1A1A18",
                  borderBottom: "1px solid #262623",
                  color: "#B8B7B0",
                }}
              >
                <Icon size={12} strokeWidth={1.7} />
                <span className="text-[12px] font-medium" style={{ color: "#F5F4EF" }}>
                  {meta.label}
                </span>
                <span className="text-[10.5px] font-mono" style={{ color: "#8A8980" }}>
                  {meta.file}
                </span>
                <span className="flex-1" />
                {canClose && (
                  <button
                    type="button"
                    onClick={() => closeCanvasFile(tab)}
                    title="Close this pane"
                    className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-white/5"
                    style={{ color: "#8A8980" }}
                  >
                    <X size={11} strokeWidth={1.8} />
                  </button>
                )}
                {isLast && !canClose && (
                  <>
                    <button
                      type="button"
                      onClick={toggleCanvas}
                      title="Minimize canvas — chat stays full-width; workflow state is preserved."
                      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-white/5"
                      style={{ color: "#8A8980" }}
                    >
                      <PanelRightClose size={11} strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={exitWorkflow}
                      title="Close workflow — abandons progress and returns to Spot."
                      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-white/5"
                      style={{ color: "#8A8980" }}
                    >
                      <X size={11} strokeWidth={1.8} />
                    </button>
                  </>
                )}
                {isLast && canClose && (
                  <>
                    <span
                      className="w-px h-3 mx-0.5"
                      style={{ background: "#262623" }}
                    />
                    <button
                      type="button"
                      onClick={toggleCanvas}
                      title="Minimize canvas — chat stays full-width."
                      className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-white/5"
                      style={{ color: "#8A8980" }}
                    >
                      <PanelRightClose size={11} strokeWidth={1.7} />
                    </button>
                  </>
                )}
              </div>

              {/* Pane body · loader/celebration states take over;
                  otherwise normal file body. */}
              <div className="flex-1 overflow-y-auto">
                {isAwaitingSetup && tab === "memory" ? (
                  <AwaitingInputCanvas />
                ) : isBuilding && tab !== "memory" ? (
                  <LaunchBuildingLoader
                    productName={
                      workflow.kind === "launch-campaign"
                        ? workflow.productName
                        : ""
                    }
                  />
                ) : isDeploying ? (
                  <DeployingLoader
                    productName={
                      workflow.kind === "launch-campaign"
                        ? workflow.productName
                        : ""
                    }
                  />
                ) : isDone ? (
                  <ThankYouScreen
                    productName={
                      workflow.kind === "launch-campaign"
                        ? workflow.productName
                        : ""
                    }
                  />
                ) : isDiagLoading && diagPhase ? (
                  <DiagnosticPhaseLoader
                    productName={(workflow as DiagnosticWorkflow).productName}
                    kind={diagPhase.kind}
                    phase={diagPhase.phase}
                  />
                ) : (
                  <FileBody workflow={workflow} tab={tab} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * FilePickerDropdown · lives in the chat header (LEFT panel). Lets
 * the user open any of the four canvas files. The checkmark indicates
 * which files are currently open; clicking an already-open file
 * focuses (opens canvas if minimised); clicking a closed file opens
 * it (max 2 panes total — opening a third replaces the latest).
 */
export function ChatHeaderFilePicker({ compact = false }: { compact?: boolean }) {
  const canvasFiles = useSpotStore((s) => s.canvasFiles);
  const canvasOpen = useSpotStore((s) => s.canvasOpen);
  const workflow = useSpotStore((s) => s.workflow);
  const openCanvasFile = useSpotStore((s) => s.openCanvasFile);
  const setCanvasOpen = useSpotStore((s) => s.setCanvasOpen);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const availableTabs = fileTabsForWorkflow(workflow);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Label · show the active (first) pane's filename when canvas is
  // open; otherwise generic "Files" prompt.
  const primary = canvasOpen && canvasFiles[0]
    ? FILE_TABS.find((t) => t.key === canvasFiles[0]) ?? FILE_TABS[0]
    : null;
  const PrimaryIcon = primary?.icon ?? FileText;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-button border border-border bg-white hover:border-border-hover text-text-primary ${
          compact ? "h-7 px-2 text-[11.5px]" : "h-8 px-2.5 text-[12px]"
        }`}
        title={canvasOpen ? "Switch / add files" : "Open canvas files"}
      >
        <PrimaryIcon size={11} strokeWidth={1.7} className="text-text-secondary" />
        {primary ? (
          <span className="font-mono text-[11px]">{primary.file}</span>
        ) : (
          <span>Files</span>
        )}
        {canvasFiles.length === 2 && (
          <span className="inline-flex items-center justify-center h-3.5 px-1 rounded-full bg-surface-secondary text-[9.5px] tabular text-text-tertiary">
            2
          </span>
        )}
        <ChevronDown size={11} strokeWidth={1.8} className="text-text-tertiary" />
      </button>
      {open && (
        <div
          className="absolute top-[calc(100%+4px)] right-0 z-50 bg-white border border-border rounded-card py-1 min-w-[240px]"
          style={{ boxShadow: "0 8px 28px -8px rgba(0,0,0,0.14)" }}
        >
          <div className="px-3 pt-1 pb-1.5 text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
            Canvas files · up to 2 side-by-side
          </div>
          {availableTabs.map((t) => {
            const Icon = t.icon;
            const isOpen = canvasFiles.includes(t.key) && canvasOpen;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  openCanvasFile(t.key);
                  setOpen(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-3 h-8 hover:bg-surface-secondary text-[12.5px] ${
                  isOpen ? "bg-surface-secondary/60" : ""
                }`}
              >
                <Icon size={11} strokeWidth={1.7} className="text-text-tertiary" />
                <span className="text-text-primary">{t.label}</span>
                <span className="text-[10.5px] font-mono text-text-tertiary ml-auto">
                  {t.file}
                </span>
                {isOpen && (
                  <Check size={11} strokeWidth={2} className="text-text-primary ml-1" />
                )}
              </button>
            );
          })}
          {canvasOpen && (
            <>
              <div className="border-t border-border-subtle my-1" />
              <button
                type="button"
                onClick={() => {
                  setCanvasOpen(false);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center gap-2 px-3 h-8 hover:bg-surface-secondary text-[12.5px] text-text-secondary"
              >
                <PanelRightClose size={11} strokeWidth={1.7} />
                <span>Close canvas</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Awaiting-input canvas · shown when the new-product workflow is
 * mid-flight but the user hasn't submitted the drawer yet. No empty
 * file mockup, no skeleton — just a calm loader that says Spot is
 * waiting on the form. Keeps the right pane honest: there's nothing
 * to preview yet.
 */
function AwaitingInputCanvas() {
  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 py-16 text-center"
      style={{ background: "#0A0A09" }}
    >
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201, 168, 106, 0.32) 0%, transparent 65%)",
            filter: "blur(14px)",
            transform: "scale(1.6)",
          }}
        />
        <SpotLoader mode="orbit" size={56} className="!gap-0 relative" />
      </div>
      <div
        className="text-[18px] font-semibold tracking-tight"
        style={{ color: "#F5F4EF" }}
      >
        Awaiting your input
      </div>
      <div
        className="text-[13px] mt-2 max-w-[360px] leading-relaxed"
        style={{ color: "#A8A8A0" }}
      >
        Drop the basics in the form on the left. As soon as you submit, I&apos;ll
        start research and write the product memory into this workspace.
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
  tab: CanvasFile;
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

  // ── Diagnostic workflows (Scale · Optimize · Test Angles) ──────
  // Render the per-step DiagnosticStep view (AnalyzeStep / ClarifyStep
  // / PlanStep / LiveStep) regardless of which tab is selected, so the
  // user sees the analysis after the analyze loader, the clarifying
  // questions during clarify, the updated plan during plan, etc.
  // Memory tab still shows product memory; ang-live + assets shows the
  // generated creatives via AssetsFileView. (We already returned above
  // for campaign-dive, so the narrowed kind here is one of the three
  // diagnostic kinds or launch-campaign.)
  if (workflow.kind !== "launch-campaign") {
    if (tab === "memory") {
      return (
        <MemoryFileView
          workflow={workflow}
          buildingOverlay={isBuilding && tab === "memory"}
        />
      );
    }
    if (
      workflow.kind === "test-angles" &&
      workflow.step === "ang-live" &&
      tab === "assets"
    ) {
      return (
        <AssetsFileView
          workflow={workflow}
          buildingOverlay={false}
        />
      );
    }
    // Analysis tab · ALWAYS shows the analysis findings (Spot's audit
    // of what's currently happening) even after the workflow has
    // moved on to clarify/plan/live. Synthesise a "ready" view of
    // the analyze step regardless of the current step.
    if (tab === "analysis") {
      const analyzeView = {
        ...(workflow as DiagnosticWorkflow),
        ready: true,
      } as DiagnosticWorkflow;
      return (
        <div className="px-6 py-5 diagnostic-dark">
          <AnalyzeStep workflow={analyzeView} />
        </div>
      );
    }
    return (
      <div className="px-6 py-5 diagnostic-dark">
        <DiagnosticStep workflow={workflow as DiagnosticWorkflow} />
      </div>
    );
  }

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

/**
 * Sub-agents driving the deep-research memory build. Same animation
 * pattern as the plan loader — each one runs sequentially through
 * the 14-second tool-call, flipping queued → running → done.
 * Durations are deliberately slow (~2-3s each) so the user has time
 * to register each stage instead of seeing a blur of state changes.
 */
const MEMORY_BUILD_AGENTS: { id: string; label: string; duration: number }[] = [
  { id: "url.crawl", label: "Crawling the brand site · about, curriculum, pricing", duration: 2400 },
  { id: "web.scan", label: "Searching the open web for category signals", duration: 2200 },
  { id: "docs.read", label: "Reading the documents you uploaded", duration: 1800 },
  { id: "audience.match", label: "Matching against the Revspot audience graph", duration: 2100 },
  { id: "data.synth", label: "Synthesizing findings into a coherent brief", duration: 2800 },
  { id: "memory.write", label: "Writing brief · personas · pricing · USPs to memory", duration: 2700 },
];

/**
 * Scripted findings · what Spot "discovers" over the loader run.
 * Each one appears at a specific timestamp, the way a real agent
 * would emit progress events. Pacing is deliberately staged — each
 * finding gets ~600-900ms of breathing room so the user can read it
 * before the next one slides in. Bursts and pauses mimic real work.
 */
const MEMORY_FINDINGS: {
  time: number;
  category: "crawl" | "web" | "docs" | "graph" | "synth" | "write";
  icon: string;
  label: string;
}[] = [
  // ── Stage 1 · Crawling (0-3s) — quick bursts of GET requests ──
  { time: 500, category: "crawl", icon: "🌐", label: "GET /about · 200 · 1.4kb" },
  { time: 1100, category: "crawl", icon: "🌐", label: "GET /curriculum · 200 · 8.2kb" },
  { time: 1700, category: "crawl", icon: "🌐", label: "GET /pricing · 200 · 2.1kb" },
  { time: 2400, category: "crawl", icon: "🔗", label: "Extracted 47 product entities" },
  // ── Stage 2 · Web scan (3-6s) — slower, broader sources ──
  { time: 3200, category: "web", icon: "🔍", label: "Indexed 12 category review sites" },
  { time: 4000, category: "web", icon: "🔍", label: "Indexed 8 parent forum threads" },
  { time: 4800, category: "web", icon: "🏷️", label: "Found 3 competitor pricing tiers" },
  // ── Stage 3 · Docs (6-7.5s) — file parsing beats ──
  { time: 5800, category: "docs", icon: "📄", label: "Parsed uploaded brochure · 14 pages" },
  { time: 6600, category: "docs", icon: "📄", label: "Extracted 22 positioning phrases" },
  // ── Stage 4 · Graph (7.5-9s) — cross-references ──
  { time: 7400, category: "graph", icon: "🧠", label: "Matched 5 cross-product personas" },
  { time: 8200, category: "graph", icon: "🧠", label: "Cohort overlap with 2 existing products" },
  { time: 9000, category: "graph", icon: "📈", label: "Found ₹420 CPL benchmark · category median" },
  // ── Stage 5 · Synth (9-12s) — the creative work, slower beats ──
  { time: 9900, category: "synth", icon: "✨", label: "Drafted product tagline" },
  { time: 10600, category: "synth", icon: "✨", label: "Locked 4 USPs · ranked by category lift" },
  { time: 11200, category: "synth", icon: "🛡️", label: "Flagged 3 do-not-mention items" },
  { time: 11800, category: "synth", icon: "👥", label: "Drafted Persona 1 · Working professional" },
  { time: 12300, category: "synth", icon: "👥", label: "Drafted Persona 2 · College student" },
  { time: 12700, category: "synth", icon: "👥", label: "Drafted Persona 3 · Parent buying for child" },
  { time: 13100, category: "synth", icon: "💰", label: "Proposed 3 pricing tiers · median band" },
  // ── Stage 6 · Write (12.5-14s) — atomic commits to memory.md ──
  { time: 13500, category: "write", icon: "✓", label: "Committed brief → memory.md" },
  { time: 13800, category: "write", icon: "✓", label: "Committed personas → memory.md" },
  { time: 14000, category: "write", icon: "✓", label: "Memory index rebuilt · ready" },
];

/** Live counters · numbers tick up as findings accumulate. Each is
 *  bound to a finding category (or sum of categories). */
function countersFromFindings(visible: typeof MEMORY_FINDINGS) {
  return {
    pages: visible.filter((f) => f.category === "crawl" && f.label.startsWith("GET")).length,
    entities: visible.find((f) => f.label.includes("entities"))
      ? 47
      : 0,
    signals:
      visible.filter((f) => f.category === "web").length +
      visible.filter((f) => f.category === "graph").length,
    personas: visible.filter((f) => f.label.startsWith("Drafted Persona")).length,
  };
}

/** Animate a number tick from prev → next over a short duration. */
function useTickingNumber(target: number, ms = 400) {
  const [n, setN] = useState(target);
  useEffect(() => {
    if (n === target) return;
    const start = n;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(start + (target - start) * eased);
      setN(value);
      if (t >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [target, ms, n]);
  return n;
}

/**
 * LiveBuildLoader · the shared "wow" loading surface. Same composition
 * for the memory build phase and the plan build phase — just swap the
 * config in. Designed to feel ALIVE: coordinated motions, live data
 * streaming one entry at a time, counters that tick up smoothly,
 * agents that flip queued → running → done in real time.
 *
 * Composition (top → bottom):
 *
 *   1. Hero block · gradient-meshed card with the orbit SpotLoader on
 *      a soft radial glow, the page title, and a smooth gradient
 *      progress bar with a glowing tip
 *   2. Live counters · 4 big numbers ticking up as findings accumulate
 *   3. Live findings stream · scrolling terminal-style feed, one
 *      finding at a time, sliding in
 *   4. Sub-agent topology · the underlying agents ticking through
 */
type LoaderConfig = {
  agentName: string; // e.g. "Deep Research Agent"
  title: React.ReactNode; // e.g. "Building memory for {gradient-name}"
  blurb: string;
  agents: typeof MEMORY_BUILD_AGENTS;
  findings: typeof MEMORY_FINDINGS;
  counters: {
    icon: string;
    label: string;
    /** Derive the current value from the visible findings array. */
    valueOf: (visible: typeof MEMORY_FINDINGS) => number;
  }[];
};

function LiveBuildLoader({ config }: { config: LoaderConfig }) {
  const TOTAL_MS = config.agents.reduce((s, a) => s + a.duration, 0);
  const [doneCount, setDoneCount] = useState(0);
  const [progress, setProgress] = useState(2);
  const [visibleFindings, setVisibleFindings] = useState<typeof MEMORY_FINDINGS>(
    [],
  );
  const findingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDoneCount(0);
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    config.agents.forEach((a, i) => {
      cumulative += a.duration;
      timers.push(setTimeout(() => setDoneCount(i + 1), cumulative));
    });
    return () => timers.forEach(clearTimeout);
  }, [config.agents]);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(99, (elapsed / TOTAL_MS) * 100);
      setProgress(pct);
      if (pct >= 99) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [TOTAL_MS]);

  // Live findings · push one at a time at its scheduled timestamp so
  // the user sees the feed grow line-by-line (not a bulk reveal).
  useEffect(() => {
    setVisibleFindings([]);
    const timers: ReturnType<typeof setTimeout>[] = [];
    config.findings.forEach((f) => {
      timers.push(
        setTimeout(() => {
          setVisibleFindings((prev) => [...prev, f]);
        }, f.time),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [config.findings]);

  useEffect(() => {
    if (findingsRef.current) {
      findingsRef.current.scrollTop = findingsRef.current.scrollHeight;
    }
  }, [visibleFindings.length]);

  return (
    <div
      className="px-6 py-6 max-w-[820px] mx-auto"
      style={{ color: "#F5F4EF" }}
    >
      {/* ── HERO BLOCK · dark warm gradient with gold glow ─────── */}
      <div
        className="relative overflow-hidden rounded-card mb-5"
        style={{
          background:
            "linear-gradient(135deg, #1F1B14 0%, #181612 50%, #131110 100%)",
          border: "1px solid #2E2820",
          boxShadow:
            "0 16px 40px -16px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,106,0.06) inset",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 25%, rgba(201, 168, 106, 0.18) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(201,168,106,0.18) 50%, transparent 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmerSweep 3.6s ease-in-out infinite",
          }}
        />

        <div className="relative px-7 py-7">
          <div className="flex items-start gap-5">
            <div className="relative flex-shrink-0">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(201, 168, 106, 0.40) 0%, transparent 65%)",
                  filter: "blur(10px)",
                  transform: "scale(1.5)",
                }}
              />
              <SpotLoader mode="orbit" size={56} className="!gap-0 relative" />
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#22C55E]">
                  <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-60 animate-ping" />
                </span>
                <span
                  className="text-[10.5px] uppercase tracking-wider font-semibold"
                  style={{ color: "#22C55E" }}
                >
                  {config.agentName} · live
                </span>
              </div>
              <h1
                className="text-[22px] font-semibold tracking-tight leading-[1.15]"
                style={{ color: "#F5F4EF" }}
              >
                {config.title}
              </h1>
              <p
                className="text-[12.5px] mt-1.5 leading-relaxed"
                style={{ color: "#A8A8A0" }}
              >
                {config.blurb}
              </p>

              <div className="mt-4">
                <div
                  className="relative h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full transition-all duration-300 ease-out relative"
                    style={{
                      width: `${progress}%`,
                      background:
                        "linear-gradient(90deg, #C9A86A 0%, #E0C083 60%, #22C55E 100%)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                      style={{
                        background: "#22C55E",
                        boxShadow:
                          "0 0 14px 3px rgba(34, 197, 94, 0.55), 0 0 4px rgba(255,255,255,0.4)",
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span
                    className="text-[10.5px] tabular font-medium"
                    style={{ color: "#D6D6CE" }}
                  >
                    {Math.round(progress)}%
                  </span>
                  <span
                    className="text-[10.5px] tabular"
                    style={{ color: "#8A8980" }}
                  >
                    {doneCount} of {config.agents.length} sub-agents complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE COUNTERS ───────────────────────────────────── */}
      <div
        className="grid gap-2.5 mb-5"
        style={{
          gridTemplateColumns: `repeat(${config.counters.length}, minmax(0, 1fr))`,
        }}
      >
        {config.counters.map((c, i) => (
          <CounterCardLive
            key={i}
            icon={c.icon}
            label={c.label}
            target={c.valueOf(visibleFindings)}
          />
        ))}
      </div>

      {/* ── LIVE FINDINGS STREAM ───────────────────────────── */}
      <div
        className="rounded-card overflow-hidden mb-5"
        style={{
          background: "#1A1A18",
          border: "1px solid #262623",
        }}
      >
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{
            background: "#15140F",
            borderBottom: "1px solid #262623",
          }}
        >
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#C9A86A]">
            <span className="absolute inset-0 rounded-full bg-[#C9A86A] opacity-50 animate-ping" />
          </span>
          <span
            className="text-[10.5px] uppercase tracking-wider font-semibold"
            style={{ color: "#A8A8A0" }}
          >
            Live findings
          </span>
          <span className="flex-1" />
          <span
            className="text-[10.5px] tabular"
            style={{ color: "#8A8980" }}
          >
            {visibleFindings.length} events
          </span>
        </div>
        <div
          ref={findingsRef}
          className="px-4 py-2.5 h-48 overflow-y-auto scroll"
          style={{ scrollBehavior: "smooth" }}
        >
          {visibleFindings.length === 0 ? (
            <div
              className="text-[11.5px] italic py-2"
              style={{ color: "#8A8980" }}
            >
              Listening for events…
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleFindings.map((f, i) => {
                const ts = (f.time / 1000).toFixed(2);
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-[11.5px] leading-relaxed"
                    style={{
                      animation:
                        i === visibleFindings.length - 1
                          ? "findingSlide 320ms ease-out"
                          : undefined,
                    }}
                  >
                    <span
                      className="font-mono text-[10px] tabular flex-shrink-0"
                      style={{ minWidth: "44px", color: "#7A7970" }}
                    >
                      +{ts}s
                    </span>
                    <span className="flex-shrink-0 text-[12px]" aria-hidden>
                      {f.icon}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{ color: "#D6D6CE" }}
                    >
                      {f.label}
                    </span>
                    <span
                      className="text-[9.5px] uppercase tracking-wider font-semibold flex-shrink-0"
                      style={{
                        color: f.category === "write" ? "#22C55E" : "#8A8980",
                      }}
                    >
                      {f.category}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── COMPACT AGENT STRIP ────────────────────────────── */}
      <div
        className="rounded-card overflow-hidden"
        style={{
          background: "#1A1A18",
          border: "1px solid #262623",
        }}
      >
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{
            background: "#15140F",
            borderBottom: "1px solid #262623",
          }}
        >
          <Cog
            size={11}
            strokeWidth={1.8}
            className="animate-spin"
            style={{ animationDuration: "2.4s", color: "#A8A8A0" }}
          />
          <span
            className="text-[10.5px] uppercase tracking-wider font-semibold"
            style={{ color: "#A8A8A0" }}
          >
            Sub-agent topology
          </span>
        </div>
        <ul style={{ borderTop: "0" }}>
          {config.agents.map((a, i) => {
            const done = i < doneCount;
            const running = i === doneCount;
            const queued = i > doneCount;
            const bg = done
              ? "rgba(34, 197, 94, 0.06)"
              : running
                ? "rgba(201, 168, 106, 0.07)"
                : "transparent";
            return (
              <li
                key={a.id}
                className="flex items-center gap-2.5 px-4 py-1.5 transition-colors"
                style={{
                  background: bg,
                  borderTop: i > 0 ? "1px solid #262623" : undefined,
                }}
              >
                <span className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                  {done && (
                    <CheckCircle2
                      size={13}
                      strokeWidth={2}
                      style={{ color: "#22C55E" }}
                    />
                  )}
                  {running && (
                    <Cog
                      size={12}
                      strokeWidth={1.8}
                      className="animate-spin"
                      style={{ animationDuration: "1.2s", color: "#F5F4EF" }}
                    />
                  )}
                  {queued && (
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ border: "1px solid #3A3A35" }}
                    />
                  )}
                </span>
                <span
                  className="font-mono text-[11px] tabular"
                  style={{ color: queued ? "#7A7970" : "#A8A8A0" }}
                >
                  {a.id}
                </span>
                <span
                  className="text-[12px] flex-1 truncate"
                  style={{
                    color: queued
                      ? "#7A7970"
                      : done
                        ? "#A8A8A0"
                        : "#F5F4EF",
                    fontWeight: running ? 500 : 400,
                  }}
                >
                  {a.label}
                </span>
                {running && (
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold flex-shrink-0"
                    style={{ color: "#E0C083" }}
                  >
                    running…
                  </span>
                )}
                {done && (
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold flex-shrink-0"
                    style={{ color: "#22C55E" }}
                  >
                    done
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Counter card · wraps a ticking number so the parent doesn't have
 *  to plumb the hook into a render-flat config object. */
function CounterCardLive({
  icon,
  label,
  target,
}: {
  icon: string;
  label: string;
  target: number;
}) {
  const value = useTickingNumber(target);
  return <CounterCard icon={icon} label={label} value={value} pulse={target > 0} />;
}

/* ── Memory + Plan loader wrappers (pick a config, render shared body) ── */

function MemoryBuildingLoader({ productName }: { productName: string }) {
  return (
    <LiveBuildLoader
      config={{
        agentName: "Deep Research Agent",
        title: (
          <>
            Building memory for{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #8C6D33 0%, #C9A86A 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {productName}
            </span>
          </>
        ),
        blurb:
          "One agent end-to-end — crawling, reading, synthesizing, then writing everything to product memory.",
        agents: MEMORY_BUILD_AGENTS,
        findings: MEMORY_FINDINGS,
        counters: [
          {
            icon: "🌐",
            label: "Pages crawled",
            valueOf: (v) =>
              v.filter((f) => f.category === "crawl" && f.label.startsWith("GET")).length,
          },
          {
            icon: "🔗",
            label: "Entities found",
            valueOf: (v) => (v.find((f) => f.label.includes("entities")) ? 47 : 0),
          },
          {
            icon: "📊",
            label: "Signals indexed",
            valueOf: (v) =>
              v.filter((f) => f.category === "web").length +
              v.filter((f) => f.category === "graph").length,
          },
          {
            icon: "👥",
            label: "Personas drafted",
            valueOf: (v) =>
              v.filter((f) => f.label.startsWith("Drafted Persona")).length,
          },
        ],
      }}
    />
  );
}

/** Big-number counter card · dark surface, large tabular value,
 *  small label, emoji icon. Soft gold glow when value > 0. */
function CounterCard({
  icon,
  label,
  value,
  pulse,
}: {
  icon: string;
  label: string;
  value: number;
  pulse: boolean;
}) {
  return (
    <div
      className="rounded-card px-3.5 py-3 relative overflow-hidden transition-transform"
      style={{
        background: "#1A1A18",
        border: "1px solid #262623",
      }}
    >
      {pulse && value > 0 && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(201, 168, 106, 0.18) 0%, transparent 70%)",
          }}
        />
      )}
      <div className="relative flex items-baseline gap-1.5">
        <span className="text-[15px]" aria-hidden>
          {icon}
        </span>
        <span
          className="text-[22px] font-semibold tabular leading-none"
          style={{ color: "#F5F4EF" }}
        >
          {value}
        </span>
      </div>
      <div
        className="text-[10px] uppercase tracking-wider font-semibold mt-1.5"
        style={{ color: "#8A8980" }}
      >
        {label}
      </div>
    </div>
  );
}

/** Stringify the in-memory ResearchedMemory shape back into the same
 *  markdown form the existing memory files use. Lets the same Markdown
 *  renderer pick up the freshly-researched product without any new
 *  card components. */
function researchedMemoryToMd(
  productName: string,
  m: import("@/lib/spot/workflow").ResearchedMemory,
): string {
  const brief = m.brief
    .map((r) => `- ${r.icon} **${r.label}** · ${r.value}`)
    .join("\n");
  const personas = (m.personas ?? [])
    .map((p) => `- **${p.name}** · ${p.meta} · pain: ${p.pain}`)
    .join("\n");
  const pricing = m.pricing
    .map(
      (p) =>
        `- **${p.name}** · ${p.cost}${p.cadence ? ` ${p.cadence}` : ""}${p.badge ? ` · _${p.badge}_` : ""}`,
    )
    .join("\n");
  const offers = m.offers
    .map((o) => `- ${o.label}${o.meta ? ` · _${o.meta}_` : ""}`)
    .join("\n");
  const usps = m.usps.map((u) => `- ${u}`).join("\n");
  const avoid = m.avoid.map((a) => `- ${a}`).join("\n");
  const sources = m.sources.map((s) => `- ${s}`).join("\n");

  return `# ${productName}

_Freshly researched · Memory just built_

${m.tagline}

## Product brief

${brief}

${personas ? `## Personas\n\n${personas}\n\n` : ""}## Pricing

${pricing}

## Offers

${offers}

## USPs · lead with these

${usps}

## Do not mention

${avoid}

## Sources I checked

${sources}

---

_Memory built just now · Brand-new product · Edit any field in chat_
`;
}

function MemoryFileView({
  workflow,
  buildingOverlay,
}: {
  workflow: SpotWorkflow;
  buildingOverlay: boolean;
}) {
  const files = getProductFiles(workflow);

  // ── New product · research / building phase ────────────────
  // No files, no researchedMemory yet — render the cycling Spot
  // loader so the canvas shows concrete agent progress.
  const isBuildingFromScratch =
    workflow.kind === "launch-campaign" &&
    !files &&
    !workflow.researchedMemory &&
    (workflow.step === "deep-research" ||
      (workflow.step === "kickoff" && !workflow.kickoffReady));

  if (isBuildingFromScratch && workflow.kind === "launch-campaign") {
    return <MemoryBuildingLoader productName={workflow.productName} />;
  }

  // ── New product · research complete ────────────────────────
  // researchedMemory holds the synthesised brief/pricing/etc. Render
  // it via the same Markdown component used for existing memory so
  // the user sees the full Notion-grade canvas, not "No memory yet".
  if (
    !files &&
    workflow.kind === "launch-campaign" &&
    workflow.researchedMemory
  ) {
    const md = researchedMemoryToMd(
      workflow.productName,
      workflow.researchedMemory,
    );
    return (
      <div className="relative">
        <div className="px-6 py-5 max-w-[720px]">
          <Markdown source={md} theme="dark" />
        </div>
      </div>
    );
  }

  // ── Existing product · render product-info.md ─────────────
  if (!files) {
    return <EmptyFile label="No memory yet." />;
  }
  return (
    <div className="relative">
      <div className="px-6 py-5 max-w-[720px]">
        <Markdown source={files.productInfoMd} theme="dark" />
      </div>
      {buildingOverlay && <BuildingOverlay label="Spot is updating memory…" />}
    </div>
  );
}


/**
 * Plan-building loader · deliberately minimal. The Spot orb floats
 * on a dark canvas while a single sentence cycles every ~1.9s. The
 * copy frames the "no past data" reality of a brand-new product so
 * the user understands *why* Spot is recommending a conservative
 * experiment plan instead of just spinning a vague progress bar.
 */
const PLAN_THOUGHTS = [
  "Analyzing memory…",
  "We don't have any existing campaigns or goals yet.",
  "Let me plan experiment campaigns to figure out what works.",
  "Personas first — three target groups from the brief.",
  "Composing creative angles for each persona.",
  "Drafting media mix · Meta · Google · WhatsApp.",
  "Sequencing the 14-day rollout in phases.",
  "Locking budget allocations · conservative caps.",
  "Building your plan…",
];

/** Deployment thoughts · the dark Spot loader for the moment after
 *  the user clicks "Approve all · deploy live". Maps to the
 *  ad/page/form/pixel/tracker push to Meta + Google + WhatsApp. */
const DEPLOY_THOUGHTS = [
  "Provisioning Meta Ads Manager handles…",
  "Publishing 12 creatives + 6 reels to Meta…",
  "Pushing 9 ad sets across 3 campaigns…",
  "Setting up Google Search + Discover campaigns…",
  "Deploying 3 landing pages to CDN…",
  "Activating Meta pixel + Conversion API…",
  "Wiring lead forms + WhatsApp business inbox…",
  "Verifying tracking — fire test events…",
  "All ads live. Watchers are armed.",
];

/** Cycling thoughts for every phase of the three diagnostic
 *  workflows (scale · optimize · test-angles). Each step gets the
 *  same DarkSpotLoader pattern as the launch flow so the user
 *  never sees the canvas freeze between steps. */
const DIAGNOSTIC_THOUGHTS = {
  scale: {
    analyze: [
      "Reading the last 30 days of campaign performance…",
      "Finding the winners — ad sets that beat target CPL.",
      "Checking audience saturation curves.",
      "Looking for headroom · underspent winners.",
      "Modeling cost-elasticity per channel.",
      "Drafting a scale plan that won't break CPL.",
    ],
    clarify: [
      "Framing the scale goal…",
      "Narrowing the option space.",
      "Picking the right questions to ask you.",
    ],
    plan: [
      "Folding your picks into the plan…",
      "Mapping winners to scale-ready audiences.",
      "Drafting budget shifts · winners up, decay down.",
      "Adding lookalike + interest expansions per winner.",
      "Recomputing daily caps with safety margin.",
      "Locking the updated plan.",
    ],
    live: [
      "Pushing winners up · trimming decay…",
      "Activating new audience expansions.",
      "Setting Week 1 daily caps.",
      "Arming the scale watchers.",
      "Scale plan is live · I'll surface results as they come in.",
    ],
  },
  optimize: {
    analyze: [
      "Reading the last 30 days of campaign performance…",
      "Detecting creative fatigue · CTR decay curves.",
      "Finding audience saturation hot-spots.",
      "Cross-referencing landing-page bounce signals.",
      "Identifying the cleanest wins to act on.",
      "Drafting an optimization plan you can ship today.",
    ],
    clarify: [
      "Framing the optimization priority…",
      "Narrowing where to act first.",
      "Picking the right questions to ask you.",
    ],
    plan: [
      "Folding your picks into the plan…",
      "Drafting pause list · clearly broken units.",
      "Drafting creative refreshes per fatigued unit.",
      "Adding audience swaps where saturation is high.",
      "Tightening targeting on chronic underperformers.",
      "Locking the updated plan.",
    ],
    live: [
      "Pausing fatigued ad sets…",
      "Briefing the creative refreshes.",
      "Swapping audiences in saturated cohorts.",
      "Arming the optimize watchers.",
      "Optimization plan is live.",
    ],
  },
  "test-angles": {
    analyze: [
      "Reading the creative library + recent winners…",
      "Mapping current angles per persona.",
      "Identifying angle gaps + untested positioning.",
      "Brainstorming fresh angles informed by category signals.",
      "Drafting a test plan with clear success criteria.",
    ],
    clarify: [
      "Framing the angle hypothesis…",
      "Narrowing the test universe.",
      "Picking the right questions to ask you.",
    ],
    plan: [
      "Drafting the Persona × Angle test matrix…",
      "Composing 3 new creative concepts per persona.",
      "Setting budget caps + minimum learn windows.",
      "Locking the test plan.",
    ],
    live: [
      "Generating new creative concepts per persona…",
      "Pushing 6 new angles to Meta.",
      "Setting balanced traffic split.",
      "Arming the early-stop guardrail.",
      "6 angles are live · learning starts now.",
    ],
  },
} as const;

/** Maps a diagnostic step to (kind, phase) so we can pull the right
 *  thoughts array out of the table above. Every diagnostic step has
 *  a phase mapping so the loader runs through the whole flow. */
function diagnosticPhaseFor(step: WorkflowStep): {
  kind: "scale" | "optimize" | "test-angles";
  phase: "analyze" | "clarify" | "plan" | "live";
} | null {
  if (step === "scale-analyze") return { kind: "scale", phase: "analyze" };
  if (step === "scale-clarify") return { kind: "scale", phase: "clarify" };
  if (step === "scale-plan") return { kind: "scale", phase: "plan" };
  if (step === "scale-live") return { kind: "scale", phase: "live" };
  if (step === "opt-analyze") return { kind: "optimize", phase: "analyze" };
  if (step === "opt-clarify") return { kind: "optimize", phase: "clarify" };
  if (step === "opt-plan") return { kind: "optimize", phase: "plan" };
  if (step === "opt-live") return { kind: "optimize", phase: "live" };
  if (step === "ang-analyze") return { kind: "test-angles", phase: "analyze" };
  if (step === "ang-clarify") return { kind: "test-angles", phase: "clarify" };
  if (step === "ang-plan") return { kind: "test-angles", phase: "plan" };
  if (step === "ang-live") return { kind: "test-angles", phase: "live" };
  return null;
}

type DiagPhase = "analyze" | "clarify" | "plan" | "live";
type DiagKind = "scale" | "optimize" | "test-angles";

/** Dark Spot loader for diagnostic flows · same pattern as launch.
 *  Used during every phase (analyze / clarify / plan / live) so the
 *  canvas never goes blank between steps. */
function DiagnosticPhaseLoader({
  productName,
  kind,
  phase,
}: {
  productName: string;
  kind: DiagKind;
  phase: DiagPhase;
}) {
  const showHomeView = useSpotStore((s) => s.showHomeView);
  const verbs: Record<DiagKind, Record<DiagPhase, string>> = {
    scale: {
      analyze: "Analyzing scale opportunities for",
      clarify: "Framing the scale brief for",
      plan: "Drafting the scale plan for",
      live: "Pushing the scale plan live for",
    },
    optimize: {
      analyze: "Analyzing what's holding back",
      clarify: "Framing the optimization brief for",
      plan: "Drafting the optimization plan for",
      live: "Shipping the optimizations for",
    },
    "test-angles": {
      analyze: "Auditing current angles for",
      clarify: "Framing the angle-test brief for",
      plan: "Drafting the angle-test plan for",
      live: "Launching new angles for",
    },
  };
  const agentLabels: Record<DiagKind, Record<DiagPhase, string>> = {
    scale: {
      analyze: "Scale Analyst · live",
      clarify: "Scale Brief Agent · live",
      plan: "Scale Planner · live",
      live: "Scale Deploy Agent · live",
    },
    optimize: {
      analyze: "Optimization Analyst · live",
      clarify: "Optimization Brief Agent · live",
      plan: "Optimization Planner · live",
      live: "Optimization Deploy Agent · live",
    },
    "test-angles": {
      analyze: "Creative Strategist · live",
      clarify: "Angle Brief Agent · live",
      plan: "Angle Test Planner · live",
      live: "Angle Deploy Agent · live",
    },
  };
  const thoughts = DIAGNOSTIC_THOUGHTS[kind][phase] as readonly string[];
  return (
    <DarkSpotLoader
      agentLabel={agentLabels[kind][phase]}
      title={
        <>
          {verbs[kind][phase]}{" "}
          <span
            style={{
              background:
                "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {productName}
          </span>
        </>
      }
      thoughts={[...thoughts]}
      intervalMs={2000}
      actions={
        <div className="flex items-center gap-2 mt-8">
          <button
            type="button"
            onClick={showHomeView}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] transition-colors hover:bg-white/5"
            style={{ color: "#A8A8A0" }}
          >
            <Home size={12} strokeWidth={1.7} />
            Back to Spot homepage
          </button>
        </div>
      }
    />
  );
}

/** The five concrete tasks Spot runs after the user clicks
 *  "Put Spot to work". Each task has its own visible state in the
 *  LaunchBuildingTaskLoader (queued → running → done) and the
 *  durations sum to ~28s to match the launch-building tool-call. */
const LAUNCH_BUILD_TASKS: {
  id: string;
  label: string;
  sub: string;
  duration: number;
}[] = [
  {
    id: "creatives",
    label: "Building creatives, forms, landing pages",
    sub: "12 statics · 6 reels · 3 landing pages · 2 lead forms",
    duration: 6500,
  },
  {
    id: "plan",
    label: "Building the campaign plan",
    sub: "3 Meta campaigns · 9 ad sets · Google Search + Discover",
    duration: 5000,
  },
  {
    id: "crm",
    label: "Verifying CRM integrations",
    sub: "lead routing · pixel · CAPI · attribution windows",
    duration: 4500,
  },
  {
    id: "agent",
    label: "Building Pre-Sales Agent (Voice + WhatsApp)",
    sub: "agent persona · script · objection handling · escalation rules",
    duration: 6500,
  },
  {
    id: "launch",
    label: "Launching campaigns",
    sub: "publishing to Meta + Google · arming the watchers",
    duration: 5500,
  },
];

/** Shared dark-Spot loader surface used by both PlanBuildingLoader
 *  and LaunchBuildingLoader · the only thing that changes is the
 *  set of cycling thoughts, the agent eyebrow label, and optional
 *  action buttons rendered under the progress dots. */
function DarkSpotLoader({
  agentLabel,
  title,
  thoughts,
  intervalMs = 1900,
  actions,
}: {
  agentLabel: string;
  title: React.ReactNode;
  thoughts: string[];
  intervalMs?: number;
  actions?: React.ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (thoughts.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % thoughts.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [thoughts.length, intervalMs]);

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 py-12 text-center"
      style={{ background: "#0A0A09" }}
    >
      {/* Soft gold radial glow behind the orb */}
      <div className="relative mb-7">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201, 168, 106, 0.32) 0%, transparent 65%)",
            filter: "blur(14px)",
            transform: "scale(1.6)",
          }}
        />
        <SpotLoader mode="orbit" size={84} className="!gap-0 relative" />
      </div>

      <div
        className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: "#22C55E" }}
      >
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#22C55E]">
          <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
        </span>
        {agentLabel}
      </div>

      <h1
        className="text-[24px] font-semibold tracking-tight leading-tight max-w-[560px]"
        style={{ color: "#F5F4EF" }}
      >
        {title}
      </h1>

      {/* Cycling thought · key={idx} re-fires the slide-in keyframe */}
      <div
        key={idx}
        className="mt-4 text-[14px] leading-relaxed max-w-[520px]"
        style={{
          color: "#A8A8A0",
          animation: "findingSlide 320ms ease-out",
          minHeight: "44px",
        }}
      >
        {thoughts[idx]}
      </div>

      {/* Tiny progress dots · vague indicator that something's happening */}
      <div className="flex items-center gap-1.5 mt-7">
        {thoughts.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? "16px" : "4px",
              height: "4px",
              background: i <= idx ? "#C9A86A" : "#2A2A26",
            }}
          />
        ))}
      </div>

      {/* Optional action row · used by the launch-building loader to
          expose View memory / Spot homepage buttons. */}
      {actions}
    </div>
  );
}

/**
 * Launch-building canvas loader · the dark Spot canvas shown after
 * the user clicks "Put Spot to work". Designed around 5 explicit
 * tasks — each one renders as a row in a task list with state
 * (queued / running / done) and a one-line sub-label so the user
 * sees exactly what Spot is doing at each beat.
 */
function LaunchBuildingLoader({ productName }: { productName: string }) {
  const showHomeView = useSpotStore((s) => s.showHomeView);
  const router = useRouter();
  const TOTAL_MS = LAUNCH_BUILD_TASKS.reduce((s, t) => s + t.duration, 0);
  const [doneCount, setDoneCount] = useState(0);
  const [progress, setProgress] = useState(2);

  // Advance task state on each task's duration boundary.
  useEffect(() => {
    setDoneCount(0);
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    LAUNCH_BUILD_TASKS.forEach((t, i) => {
      cumulative += t.duration;
      timers.push(setTimeout(() => setDoneCount(i + 1), cumulative));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Smooth progress bar across the whole 28s run.
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(99, (elapsed / TOTAL_MS) * 100);
      setProgress(pct);
      if (pct >= 99) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [TOTAL_MS]);

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 py-12"
      style={{ background: "#0A0A09" }}
    >
      {/* Spot orb + headline */}
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201, 168, 106, 0.32) 0%, transparent 65%)",
            filter: "blur(14px)",
            transform: "scale(1.5)",
          }}
        />
        <SpotLoader mode="orbit" size={64} className="!gap-0 relative" />
      </div>

      <div
        className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: "#22C55E" }}
      >
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#22C55E]">
          <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
        </span>
        Build Agent · live · 5 tasks
      </div>

      <h1
        className="text-[22px] font-semibold tracking-tight leading-tight text-center max-w-[560px]"
        style={{ color: "#F5F4EF" }}
      >
        Spot is working on{" "}
        <span
          style={{
            background:
              "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {productName}
        </span>
      </h1>

      {/* Progress bar */}
      <div className="w-full max-w-[540px] mt-5">
        <div
          className="relative h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full transition-all duration-300 ease-out relative"
            style={{
              width: `${progress}%`,
              background:
                "linear-gradient(90deg, #C9A86A 0%, #E0C083 60%, #22C55E 100%)",
            }}
          >
            <span
              aria-hidden
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
              style={{
                background: "#22C55E",
                boxShadow:
                  "0 0 14px 3px rgba(34, 197, 94, 0.55), 0 0 4px rgba(255,255,255,0.4)",
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span
            className="text-[10.5px] tabular font-medium"
            style={{ color: "#D6D6CE" }}
          >
            {Math.round(progress)}%
          </span>
          <span
            className="text-[10.5px] tabular"
            style={{ color: "#8A8980" }}
          >
            {doneCount} of {LAUNCH_BUILD_TASKS.length} tasks complete
          </span>
        </div>
      </div>

      {/* Task list */}
      <div
        className="w-full max-w-[540px] mt-6 rounded-card overflow-hidden"
        style={{
          background: "#1A1A18",
          border: "1px solid #262623",
        }}
      >
        <ul>
          {LAUNCH_BUILD_TASKS.map((t, i) => {
            const done = i < doneCount;
            const running = i === doneCount;
            const queued = i > doneCount;
            const rowBg = done
              ? "rgba(34, 197, 94, 0.06)"
              : running
                ? "rgba(201, 168, 106, 0.07)"
                : "transparent";
            return (
              <li
                key={t.id}
                className="px-4 py-3 transition-colors flex items-start gap-3"
                style={{
                  background: rowBg,
                  borderTop: i > 0 ? "1px solid #262623" : undefined,
                }}
              >
                {/* Status glyph */}
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {done && (
                    <CheckCircle2
                      size={15}
                      strokeWidth={2}
                      style={{ color: "#22C55E" }}
                    />
                  )}
                  {running && (
                    <Cog
                      size={14}
                      strokeWidth={1.8}
                      className="animate-spin"
                      style={{ animationDuration: "1.2s", color: "#E0C083" }}
                    />
                  )}
                  {queued && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ border: "1.5px solid #3A3A35" }}
                    />
                  )}
                </span>

                {/* Step number + content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10.5px] tabular font-mono flex-shrink-0"
                      style={{
                        color: queued ? "#5A5A52" : done ? "#7A7970" : "#C9A86A",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="text-[13px] flex-1 truncate"
                      style={{
                        color: queued
                          ? "#7A7970"
                          : done
                            ? "#A8A8A0"
                            : "#F5F4EF",
                        fontWeight: running ? 600 : 500,
                      }}
                    >
                      {t.label}
                    </span>
                    {running && (
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold flex-shrink-0"
                        style={{ color: "#E0C083" }}
                      >
                        running…
                      </span>
                    )}
                    {done && (
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold flex-shrink-0"
                        style={{ color: "#22C55E" }}
                      >
                        done
                      </span>
                    )}
                  </div>
                  <div
                    className="text-[11px] mt-0.5 truncate"
                    style={{
                      color: queued ? "#5A5A52" : "#8A8980",
                    }}
                  >
                    {t.sub}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-7">
        <button
          type="button"
          onClick={() =>
            router.push("/memory?focus=prod-guyjus-spoken-english")
          }
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] font-medium transition-colors"
          style={{ background: "#FAFAF8", color: "#0A0A09" }}
        >
          View project memory
          <ArrowRight size={11} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={showHomeView}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] transition-colors hover:bg-white/5"
          style={{ color: "#A8A8A0" }}
        >
          <Home size={12} strokeWidth={1.7} />
          Back to Spot homepage
        </button>
      </div>
    </div>
  );
}

/** Deployment loader · shown for the ~14s after the user clicks
 *  "Approve all · deploy live". The Spot orb floats on black,
 *  thoughts cycle every ~1.8s, the progress dots fill, and a
 *  "Back to Spot homepage" CTA lets the user step away (the
 *  homepage gets a "Spot is deploying" section while it runs). */
function DeployingLoader({ productName }: { productName: string }) {
  const showHomeView = useSpotStore((s) => s.showHomeView);
  return (
    <DarkSpotLoader
      agentLabel="Deploy Agent · live"
      title={
        <>
          Deploying{" "}
          <span
            style={{
              background:
                "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {productName}
          </span>{" "}
          to Meta · Google · WhatsApp
        </>
      }
      thoughts={DEPLOY_THOUGHTS}
      intervalMs={1800}
      actions={
        <div className="flex items-center gap-2 mt-8">
          <button
            type="button"
            onClick={showHomeView}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] font-medium transition-colors hover:bg-white/5"
            style={{ color: "#A8A8A0" }}
          >
            <Home size={12} strokeWidth={1.7} />
            Back to Spot homepage
          </button>
        </div>
      }
    />
  );
}

/** Thank-you screen · the canvas state after deploy finishes. Big
 *  celebratory Spot orb on black, gold-gradient headline, a short
 *  list of what just went live, and a CTA to head back to home. */
function ThankYouScreen({ productName }: { productName: string }) {
  const router = useRouter();
  const exitWorkflow = useSpotStore((s) => s.exitWorkflow);
  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 py-12 text-center"
      style={{ background: "#0A0A09" }}
    >
      {/* Soft gold radial glow behind the orb */}
      <div className="relative mb-7">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(34, 197, 94, 0.30) 0%, transparent 65%)",
            filter: "blur(18px)",
            transform: "scale(1.8)",
          }}
        />
        <div className="relative">
          <SpotMark size={80} />
        </div>
      </div>

      <div
        className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold mb-3"
        style={{ color: "#22C55E" }}
      >
        <CheckCircle2 size={11} strokeWidth={2.2} />
        Deployed · live now
      </div>

      <h1
        className="text-[28px] font-semibold tracking-tight leading-tight max-w-[600px]"
        style={{ color: "#F5F4EF" }}
      >
        <span
          style={{
            background:
              "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {productName}
        </span>{" "}
        is live.
      </h1>

      <p
        className="mt-3 text-[14px] leading-relaxed max-w-[520px]"
        style={{ color: "#A8A8A0" }}
      >
        18 creatives · 3 landing pages · 2 lead forms · 3 campaigns shipped to
        Meta, Google, and WhatsApp. Watchers are armed and I&apos;ll surface
        the first results the moment data lands.
      </p>

      {/* What's live · 4 cards */}
      <div className="grid grid-cols-4 gap-2.5 mt-7 w-full max-w-[640px]">
        {[
          { icon: "📣", label: "3 campaigns", sub: "Meta + Google" },
          { icon: "🎨", label: "18 creatives", sub: "all sizes deployed" },
          { icon: "📄", label: "3 landing pages", sub: "live on CDN" },
          { icon: "📋", label: "2 lead forms", sub: "+ WhatsApp inbox" },
        ].map((c, i) => (
          <div
            key={i}
            className="rounded-card px-3.5 py-3 text-left"
            style={{
              background: "#1A1A18",
              border: "1px solid #262623",
            }}
          >
            <div className="text-[18px]" aria-hidden>
              {c.icon}
            </div>
            <div
              className="text-[12px] font-semibold mt-1"
              style={{ color: "#F5F4EF" }}
            >
              {c.label}
            </div>
            <div
              className="text-[10.5px] mt-0.5"
              style={{ color: "#8A8980" }}
            >
              {c.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-8">
        <button
          type="button"
          onClick={() => {
            exitWorkflow();
            router.push("/spot");
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] font-medium transition-colors"
          style={{ background: "#FAFAF8", color: "#0A0A09" }}
        >
          Back to Spot homepage
          <ArrowRight size={11} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() =>
            router.push("/memory?focus=prod-guyjus-spoken-english")
          }
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] transition-colors hover:bg-white/5"
          style={{ color: "#A8A8A0" }}
        >
          View project memory
        </button>
      </div>
    </div>
  );
}

function PlanBuildingLoader({ productName }: { productName: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (PLAN_THOUGHTS.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % PLAN_THOUGHTS.length);
    }, 1900);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="h-full flex flex-col items-center justify-center px-8 py-12 text-center"
      style={{ background: "#0A0A09" }}
    >
      {/* Soft gold radial glow behind the orb */}
      <div className="relative mb-7">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201, 168, 106, 0.32) 0%, transparent 65%)",
            filter: "blur(14px)",
            transform: "scale(1.6)",
          }}
        />
        <SpotLoader mode="orbit" size={84} className="!gap-0 relative" />
      </div>

      <div
        className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: "#22C55E" }}
      >
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#22C55E]">
          <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
        </span>
        Launch Plan Agent · live
      </div>

      <h1
        className="text-[24px] font-semibold tracking-tight leading-tight max-w-[520px]"
        style={{ color: "#F5F4EF" }}
      >
        Building a plan for{" "}
        <span
          style={{
            background:
              "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {productName}
        </span>
      </h1>

      {/* Cycling thought · key={idx} re-fires the slide-in keyframe */}
      <div
        key={idx}
        className="mt-4 text-[14px] leading-relaxed max-w-[480px]"
        style={{
          color: "#A8A8A0",
          animation: "findingSlide 320ms ease-out",
          minHeight: "44px",
        }}
      >
        {PLAN_THOUGHTS[idx]}
      </div>

      {/* Tiny progress dots · vague indicator that something's happening */}
      <div className="flex items-center gap-1.5 mt-7">
        {PLAN_THOUGHTS.map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === idx ? "16px" : "4px",
              height: "4px",
              background: i <= idx ? "#C9A86A" : "#2A2A26",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Hard-coded launch plan template for brand-new products. Substitutes
 *  the product name everywhere so the canvas isn't blank after the
 *  user clicks "show me the plan". Themed for an EdTech course like
 *  Guyju's Spoken English — applies cleanly to any new product the
 *  user spins up in this demo. */
function buildNewProductPlanMd(productName: string): string {
  return `# ${productName} · Launch plan

_Drafted just now · 14-day rollout · Conservative experiment_

A small-budget, persona-led launch to learn what wins before we scale. Personas come first — once we know who we're targeting, media mix and creative briefs follow. One campaign per persona, three creative angles each, tight feedback loop on CPL and qualification.

## Personas

- **Working professional · Aspiring fluent speaker** · 25-34 · tier-1/2 cities · LinkedIn-active · pain: stalled career growth from English gap
- **College student · Interview prep** · 18-24 · semi-urban · YouTube-heavy · pain: campus placement interviews
- **Parent · Buying for child** · 32-45 · tier-2/3 cities · WhatsApp + Facebook · pain: child's school confidence

## Revspot Audience · pre-built targeting

I&apos;ve identified a matching audience from the Revspot graph — high-intent users who&apos;ve engaged with adjacent EdTech products in the last 90 days but haven&apos;t converted yet. We can push this directly to Meta and Google as a Custom Audience so every campaign starts on a warm cohort instead of cold-prospecting from scratch.

- 🎯 **Revspot Audience** · ~ 480K matched users · refreshes weekly
- 🔵 **Meta** · pushed as a Custom Audience + 1% lookalike seed
- 🔴 **Google** · pushed as a Customer Match list for Search + Discover
- 📈 **Expected lift** · 2.1× higher qualification vs cold targeting (based on prior products in this category)

## CRM Workflow · Qualifier Agent

The Qualifier Agent picks up every inbound lead the moment it lands and routes it based on ICP fit. Two channels: **voice calls** + **WhatsApp**.

- 🤖 **Qualifier Agent** · always-on · voice + WhatsApp capable
- 🔍 **Step 1 · ICP match** · runs Revspot Enrichment on the lead — company, role, intent signals, prior product touches
- ✅ **High ICP match** · agent patches the call live to a human Sales rep within 90 seconds while the lead is still warm
- 🤝 **Lower ICP match** · agent qualifies on the call itself (budget, urgency, decision authority) and drops the lead into the WhatsApp nurture sequence
- 💬 **WhatsApp nurture · 10 days** · 6 sequenced touches with persona-specific content (Day 1 welcome, Day 2 social proof, Day 4 outcome story, Day 6 objection handler, Day 8 trial offer, Day 10 final nudge) — agent answers questions inline and re-qualifies the lead for sales when intent re-surfaces

## Phase 1 · Day 1-2 · Setup

- Lock the 3 personas above + write briefs to product memory
- Provision pixel + Conversion API for the brand site
- Build 3 landing pages — one per persona
- Wire Meta lead forms + WhatsApp click-to-chat
- Connect CRM webhook for real-time lead delivery
- Push Revspot Audience to Meta + Google as Custom Audience / Customer Match
- Brief the Qualifier Agent · ICP rules + voice script + 6 WhatsApp nurture templates

## Phase 2 · Day 3-7 · Launch

- Go live with 3 Meta campaigns · 1 per persona · ₹500/day each · seeded on the Revspot Audience
- Spin up Google Search on high-intent keywords · ₹400/day
- Activate Google Discover for top-of-funnel reach · ₹300/day
- Qualifier Agent live on every inbound lead · voice + WhatsApp routing
- Monitor CPL, qualification rate, agent-to-human patch rate, and creative engagement daily

## Phase 3 · Day 8-14 · Optimize

- Pause ad sets with CPL > 2x target
- Scale winners by 30% per 48h once CPL stabilises
- Promote top creatives to broader audiences
- Refresh fatigued creatives (frequency > 2.5)
- Tune Qualifier Agent ICP thresholds based on first-week conversion data

## Phase 4 · Day 15+ · Scale

- Expand to 5 ad sets per persona on the winning angle
- Test new persona variants from the audience graph
- Layer in Revspot lookalike expansion (2% → 3% → 5%)
- Hand WhatsApp nurture overflow to the Qualifier Agent for warm-lead follow-ups

## Budget

- **Meta** · ₹1,500/day · ₹21,000 over 14 days
- **Google Search** · ₹400/day · ₹5,600 over 14 days
- **Google Discover** · ₹300/day · ₹4,200 over 14 days
- **Total · 14 days** · ₹30,800
- **Daily cap** · ₹2,200

## Risks to monitor

- Audience saturation in the top persona
- Creative fatigue past 14 days
- Landing page bounce > 60%
- Lead-form drop-off > 40%

---

_Plan generated · Awaiting your approval · Edit any block in chat_
`;
}

function PlanFileView({
  workflow,
  buildingOverlay,
}: {
  workflow: SpotWorkflow;
  buildingOverlay: boolean;
}) {
  const files = getProductFiles(workflow);

  // While Spot is "generating" the plan (step transitioned to
  // launch-plan and tool-call is still running), show the cycling
  // loader. The local timer matches the launch-plan tool-call
  // delayMs (5.6s) so the loader stays up for exactly the agent run.
  const [planBuilding, setPlanBuilding] = useState(
    workflow.kind === "launch-campaign" && workflow.step === "launch-plan",
  );
  useEffect(() => {
    if (
      workflow.kind === "launch-campaign" &&
      workflow.step === "launch-plan"
    ) {
      setPlanBuilding(true);
      const id = setTimeout(() => setPlanBuilding(false), 11800);
      return () => clearTimeout(id);
    }
    setPlanBuilding(false);
  }, [workflow?.step, workflow?.kind]);

  if (
    planBuilding &&
    workflow.kind === "launch-campaign"
  ) {
    return <PlanBuildingLoader productName={workflow.productName} />;
  }

  // New product (no saved files) post-build · render the generic
  // template. Even brand-new products get a real plan to read,
  // not a "No plan yet" placeholder.
  if (!files && workflow.kind === "launch-campaign") {
    const md = buildNewProductPlanMd(workflow.productName);
    return (
      <div className="relative">
        <div className="px-6 py-5 max-w-[760px]">
          <Markdown source={md} theme="dark" />
        </div>
        {buildingOverlay && <BuildingOverlay label="Spot is drafting the plan…" />}
      </div>
    );
  }

  // Other workflow kinds without files (campaign-dive etc.) keep
  // the calm empty state.
  if (!files) {
    return (
      <div className="relative h-full">
        <EmptyCanvas
          icon={TrendingUp}
          title="No plan yet"
          body="Once the memory is approved, Spot will draft a day-by-day launch plan here — personas, media mix, creative briefs — for you to approve in chat."
        />
        {buildingOverlay && <BuildingOverlay label="Spot is drafting the plan…" />}
      </div>
    );
  }

  // Existing product · render the plan.md content.
  return (
    <div className="relative">
      <div className="px-6 py-5 max-w-[720px]">
        <Markdown source={files.planMd} theme="dark" />
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
      <EmptyCanvas
        icon={ChartPie}
        title="No dashboard yet"
        body="Campaigns haven't started. Once Spot ships the plan and ads go live, real-time performance — spend, leads, CPL, channel mix — will fill in here."
      />
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

/* ─── Dummy assets for the new-product flow ──────────────────
 * Used as placeholders until the user drops real generated
 * creatives into /public/assets/creatives/. Each card renders the
 * persona/angle name on a gradient background; if an image exists
 * at the matching `src` path it'll be loaded instead.
 * ────────────────────────────────────────────────────────────── */

type DummyCreative = {
  id: string;
  title: string;
  angle: string;
  personaName: string;
  channel: "Meta" | "Google" | "YouTube";
  format: "1:1" | "4:5" | "9:16" | "16:9";
  sizes: ("1:1" | "4:5" | "9:16" | "16:9")[];
  kind: "image" | "video" | "carousel";
  state: "ready" | "draft";
  hue: number;
  /** Optional · drop a file at this path inside /public to override
   *  the gradient placeholder. */
  src?: string;
};

// All creative thumbnails are 1:1 (square) by spec — Spot proposes the
// concept on a square hero, and the user opens a "View all sizes"
// preview to see how the same idea maps to 4:5 / 9:16 / 16:9.
// Real PNGs live in /public/assets/creatives — parent-NN and
// student-NN are the eight files the user dropped in for the new
// product launch flow. Working-professional cards still fall back to
// the gradient placeholder until that persona has real assets.
const DUMMY_CREATIVES: DummyCreative[] = [
  { id: "c01", title: "Speak confidently in 12 weeks", angle: "Outcome-led", personaName: "Working professional", channel: "Meta", format: "1:1", sizes: ["1:1", "4:5", "9:16"], kind: "image", state: "ready", hue: 28, src: undefined },
  { id: "c02", title: "Live cohort · Native trainers", angle: "Authority", personaName: "Working professional", channel: "Meta", format: "1:1", sizes: ["1:1", "4:5"], kind: "image", state: "ready", hue: 42, src: undefined },
  { id: "c03", title: "Real conversation drills", angle: "Method", personaName: "Working professional", channel: "Meta", format: "1:1", sizes: ["1:1", "9:16"], kind: "video", state: "ready", hue: 56, src: undefined },
  { id: "c04", title: "Crack any interview · 6 weeks", angle: "Outcome-led", personaName: "College student", channel: "Meta", format: "1:1", sizes: ["1:1", "4:5", "9:16"], kind: "image", state: "ready", hue: 200, src: "/assets/creatives/student-01.png" },
  { id: "c05", title: "From hesitation to fluent", angle: "Transformation", personaName: "College student", channel: "Meta", format: "1:1", sizes: ["1:1", "9:16"], kind: "video", state: "ready", hue: 215, src: "/assets/creatives/student-02.png" },
  { id: "c06", title: "Mock interviews · weekly", angle: "Method", personaName: "College student", channel: "Meta", format: "1:1", sizes: ["1:1", "4:5"], kind: "image", state: "ready", hue: 188, src: "/assets/creatives/student-03.png" },
  { id: "c07", title: "Help your child speak with confidence", angle: "Emotional", personaName: "Parent · buying for child", channel: "Meta", format: "1:1", sizes: ["1:1", "4:5"], kind: "image", state: "ready", hue: 340, src: "/assets/creatives/parent-01.png" },
  { id: "c08", title: "Trusted by 12,000+ parents", angle: "Social proof", personaName: "Parent · buying for child", channel: "Meta", format: "1:1", sizes: ["1:1", "4:5", "9:16"], kind: "image", state: "ready", hue: 320, src: "/assets/creatives/parent-02.png" },
  { id: "c09", title: "School-confidence in 8 weeks", angle: "Outcome-led", personaName: "Parent · buying for child", channel: "Meta", format: "1:1", sizes: ["1:1", "9:16"], kind: "image", state: "ready", hue: 300, src: "/assets/creatives/parent-03.png" },
  { id: "c10", title: "Try one free class", angle: "Trial-led", personaName: "Working professional", channel: "YouTube", format: "1:1", sizes: ["1:1", "16:9"], kind: "video", state: "ready", hue: 12, src: undefined },
  { id: "c11", title: "Speak in 8 weeks · ₹0 risk", angle: "Risk-reversal", personaName: "College student", channel: "YouTube", format: "1:1", sizes: ["1:1", "16:9"], kind: "video", state: "ready", hue: 230, src: "/assets/creatives/student-04.png" },
  { id: "c12", title: "Real-life parent confessions", angle: "Story", personaName: "Parent · buying for child", channel: "Meta", format: "1:1", sizes: ["1:1"], kind: "image", state: "ready", hue: 320, src: "/assets/creatives/parent-04.png" },
];

const DUMMY_SEARCH_ADS: {
  id: string;
  campaign: "Brand" | "Category" | "Competitor";
  primaryHeadline: string;
  primaryDescription: string;
  keywords: string;
  status: "live" | "draft";
}[] = [
  { id: "sa01", campaign: "Brand", primaryHeadline: "{Product} · Speak Confidently · Live Cohort", primaryDescription: "Native trainers, real conversation drills, mock interviews. Free trial class.", keywords: "guyju spoken english, guyju's spoken english", status: "live" },
  { id: "sa02", campaign: "Category", primaryHeadline: "Best Spoken English Course Online", primaryDescription: "Live cohort with native trainers. Outcomes-led syllabus. 12-week program.", keywords: "best spoken english course, spoken english classes online", status: "live" },
  { id: "sa03", campaign: "Competitor", primaryHeadline: "Smarter Than {Competitor}? You Decide", primaryDescription: "Live cohorts vs. recorded videos. Side-by-side comparison.", keywords: "{competitor} alternative, {competitor} review", status: "draft" },
];

const DUMMY_LANDING_PAGES: {
  id: string;
  title: string;
  personaName: string;
  sections: number;
  status: "live" | "draft";
}[] = [
  { id: "lp01", title: "Working professional · landing", personaName: "Working professional", sections: 9, status: "live" },
  { id: "lp02", title: "College student · landing", personaName: "College student", sections: 8, status: "live" },
  { id: "lp03", title: "Parent · landing", personaName: "Parent · buying for child", sections: 9, status: "live" },
];

const DUMMY_FORMS: {
  id: string;
  title: string;
  kind: "lead-form" | "click-to-whatsapp" | "phone-form";
  personaName: string;
  fields: number;
}[] = [
  { id: "fm01", title: "Free trial signup", kind: "lead-form", personaName: "Working professional", fields: 4 },
  { id: "fm02", title: "WhatsApp me about classes", kind: "click-to-whatsapp", personaName: "Parent · buying for child", fields: 2 },
];

function AssetsFileView({
  workflow,
  buildingOverlay,
}: {
  workflow: SpotWorkflow;
  buildingOverlay: boolean;
}) {
  const files = getProductFiles(workflow);

  // Source the data — existing products use the real memory file,
  // new products fall through to the dummy data so the assets tab
  // is never empty.
  const creatives = files?.assets.creatives
    ? files.assets.creatives.map((c) => ({
        id: c.id,
        title: c.label,
        angle: "Pre-built",
        personaName: c.personaName,
        channel: "Meta" as const,
        format: c.format,
        sizes: c.sizes,
        kind: c.kind,
        state: c.state === "live" ? ("ready" as const) : ("draft" as const),
        hue: c.hue,
        src: undefined as string | undefined,
      }))
    : DUMMY_CREATIVES;
  const searchAds = files?.assets.searchAds
    ? files.assets.searchAds.map((s) => ({
        id: s.id,
        campaign: s.campaign,
        primaryHeadline: s.primaryHeadline,
        primaryDescription: s.primaryDescription,
        keywords: s.keywords,
        status: s.status,
      }))
    : DUMMY_SEARCH_ADS;
  const landingPages = files?.assets.landingPages
    ? files.assets.landingPages.map((p) => ({
        id: p.id,
        title: p.title,
        personaName: p.personaName,
        sections: p.sections,
        status: p.status,
      }))
    : DUMMY_LANDING_PAGES;
  const forms = files?.assets.forms
    ? files.assets.forms.map((f) => ({
        id: f.id,
        title: f.title,
        kind: f.kind,
        personaName: f.personaName,
        fields: f.fields,
      }))
    : DUMMY_FORMS;

  const productSlug = files?.productId ?? "new-product";

  return (
    <div className="relative" style={{ color: "#F5F4EF" }}>
      <div className="px-6 py-5">
        {/* Header */}
        <div className="mb-5">
          <div
            className="text-[11px] mb-0.5"
            style={{ color: "#8A8980" }}
          >
            assets /
          </div>
          <h1
            className="text-[24px] font-semibold tracking-tight"
            style={{ color: "#F5F4EF" }}
          >
            {workflow.kind === "campaign-dive"
              ? workflow.productName
              : (workflow as LaunchWorkflow).productName || "New product"}
          </h1>
          <div
            className="text-[12px] mt-1"
            style={{ color: "#A8A8A0" }}
          >
            <span style={{ color: "#F5F4EF", fontWeight: 500 }}>
              {creatives.length}
            </span>{" "}
            creatives ·{" "}
            <span style={{ color: "#F5F4EF", fontWeight: 500 }}>
              {searchAds.length}
            </span>{" "}
            search ads ·{" "}
            <span style={{ color: "#F5F4EF", fontWeight: 500 }}>
              {landingPages.length}
            </span>{" "}
            landing pages ·{" "}
            <span style={{ color: "#F5F4EF", fontWeight: 500 }}>
              {forms.length}
            </span>{" "}
            forms
          </div>
          {!files && (
            <div
              className="text-[11px] mt-2 leading-relaxed"
              style={{ color: "#8A8980" }}
            >
              Placeholders below — drop real files into{" "}
              <code
                className="text-[10.5px] font-mono px-1 rounded"
                style={{
                  background: "#1F1F1D",
                  border: "1px solid #2E2E2A",
                  color: "#E8E0C8",
                }}
              >
                /public/assets/creatives/
              </code>{" "}
              to replace.
            </div>
          )}
        </div>

        {/* Creatives grid · square thumbs, 4 per row, view-sizes per card */}
        <SectionHeading title="Creatives" count={creatives.length} />
        <div className="grid grid-cols-4 gap-3 mb-7">
          {creatives.map((c) => (
            <CreativeCard key={c.id} creative={c} productSlug={productSlug} />
          ))}
        </div>

        {/* Search ads */}
        <SectionHeading title="Search ads" count={searchAds.length} />
        <div className="space-y-2.5 mb-7">
          {searchAds.map((s) => (
            <SearchAdRow key={s.id} ad={s} />
          ))}
        </div>

        {/* Landing pages */}
        <SectionHeading title="Landing pages" count={landingPages.length} />
        <div className="grid grid-cols-3 gap-3 mb-7">
          {landingPages.map((p) => (
            <LandingPageCard key={p.id} page={p} />
          ))}
        </div>

        {/* Forms */}
        <SectionHeading title="Forms" count={forms.length} />
        <div className="grid grid-cols-2 gap-3 mb-2">
          {forms.map((f) => (
            <FormCard key={f.id} form={f} />
          ))}
        </div>
      </div>
      {buildingOverlay && <BuildingOverlay label="Spot is generating creatives…" />}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div
      className="flex items-baseline gap-2 mb-3 pb-1.5"
      style={{ borderBottom: "1px solid #262623" }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: "#C9A86A" }}
      />
      <span
        className="text-[14px] font-semibold"
        style={{ color: "#F5F4EF" }}
      >
        {title}
      </span>
      <span className="text-[11px]" style={{ color: "#8A8980" }}>
        {count}
      </span>
    </div>
  );
}

/** Creative card · dark-mode card with a square (1:1) thumbnail
 *  showing the concept, regardless of the creative's source format.
 *  A small "View sizes" pill in the corner opens a modal that
 *  shows the creative rendered in every available size variant. */
function CreativeCard({
  creative,
  productSlug,
}: {
  creative: DummyCreative;
  productSlug: string;
}) {
  const [sizesOpen, setSizesOpen] = useState(false);
  const gradientBg = `linear-gradient(135deg, hsl(${creative.hue}, 65%, 70%) 0%, hsl(${creative.hue}, 55%, 55%) 60%, hsl(${(creative.hue + 30) % 360}, 60%, 45%) 100%)`;

  return (
    <>
      <div
        className="group rounded-card overflow-hidden transition-colors"
        style={{
          background: "#1A1A18",
          border: "1px solid #262623",
        }}
      >
        {/* Always 1:1 thumbnail · real image when available, gradient
            + overlay text fallback when not */}
        <div className="relative w-full" style={{ background: gradientBg }}>
          <div style={{ paddingTop: "100%" }} aria-hidden />
          {creative.src && (
            <img
              src={creative.src}
              alt={creative.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {/* Angle/title overlay · only shown when no real image so
              we never paint text on top of the dropped-in PNG */}
          {!creative.src && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              <div className="relative z-10 px-2">
                <div
                  className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 drop-shadow-sm"
                  style={{ color: "rgba(255,255,255,0.88)" }}
                >
                  {creative.angle}
                </div>
                <div
                  className="text-[13px] font-semibold leading-snug drop-shadow-sm"
                  style={{ color: "#FFFFFF" }}
                >
                  {creative.title}
                </div>
              </div>
            </div>
          )}

          {/* Kind badge (Video / Carousel) top-left */}
          {creative.kind !== "image" && (
            <div className="absolute top-2 left-2">
              <span
                className="inline-flex items-center h-5 px-1.5 rounded-full text-[9.5px] uppercase tracking-wider"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  color: "#FFFFFF",
                  backdropFilter: "blur(4px)",
                }}
              >
                {creative.kind}
              </span>
            </div>
          )}

          {/* View sizes pill · top-right · opens modal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSizesOpen(true);
            }}
            className="absolute top-2 right-2 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-medium transition-opacity"
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "#FFFFFF",
              backdropFilter: "blur(6px)",
            }}
            title="View this creative in all available sizes"
          >
            <Maximize2 size={9} strokeWidth={1.8} />
            {creative.sizes.length} sizes
          </button>

          {/* Status pill bottom-right */}
          <div className="absolute bottom-2 right-2">
            <span
              className="inline-flex items-center h-5 px-1.5 rounded-full text-[9.5px] uppercase tracking-wider font-semibold"
              style={
                creative.state === "ready"
                  ? { background: "#22C55E", color: "#0A1F14" }
                  : {
                      background: "#1A1A18",
                      color: "#D4B566",
                      border: "1px solid #3A3530",
                    }
              }
            >
              {creative.state}
            </span>
          </div>
        </div>

        {/* Card footer · dark surface, light text */}
        <div
          className="px-3 py-2.5"
          style={{ borderTop: "1px solid #262623" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[11px] font-medium truncate flex-1"
              style={{ color: "#F5F4EF" }}
            >
              {creative.personaName}
            </span>
            <span
              className="text-[10px] tabular flex-shrink-0"
              style={{ color: "#8A8980" }}
            >
              {creative.channel}
            </span>
          </div>
          <div
            className="text-[9.5px] mt-0.5 font-mono truncate"
            style={{ color: "#7A7970" }}
          >
            {productSlug}/{creative.id}
          </div>
        </div>
      </div>

      {sizesOpen && (
        <CreativeSizesModal
          creative={creative}
          gradientBg={gradientBg}
          productSlug={productSlug}
          onClose={() => setSizesOpen(false)}
        />
      )}
    </>
  );
}

/** Modal showing one creative concept across all available size
 *  variants side-by-side · square / portrait / story / landscape.
 *  Dark backdrop, dark surface, gold accents to match the canvas. */
function CreativeSizesModal({
  creative,
  gradientBg,
  productSlug,
  onClose,
}: {
  creative: DummyCreative;
  gradientBg: string;
  productSlug: string;
  onClose: () => void;
}) {
  const ratioFor = (fmt: DummyCreative["format"]) => {
    switch (fmt) {
      case "1:1":
        return "100%";
      case "4:5":
        return "125%";
      case "9:16":
        return "177.77%";
      case "16:9":
        return "56.25%";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1080px] max-h-[90vh] rounded-card overflow-hidden flex flex-col"
        style={{
          background: "#161614",
          border: "1px solid #2A2A26",
          boxShadow: "0 28px 64px -16px rgba(0,0,0,0.6)",
        }}
      >
        {/* Modal header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #262623" }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="text-[10.5px] uppercase tracking-wider font-semibold"
              style={{ color: "#C9A86A" }}
            >
              {creative.angle}
            </div>
            <div
              className="text-[16px] font-semibold leading-snug"
              style={{ color: "#F5F4EF" }}
            >
              {creative.title}
            </div>
            <div
              className="text-[11px] mt-0.5"
              style={{ color: "#8A8980" }}
            >
              {creative.personaName} · {creative.channel} ·{" "}
              <span className="font-mono">
                {productSlug}/{creative.id}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-white/5"
            style={{ color: "#A8A8A0" }}
          >
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>

        {/* Sizes grid · variant tiles laid out by aspect ratio */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5"
          style={{ background: "#0F0F0E" }}
        >
          <div className="grid grid-cols-4 gap-4 items-start">
            {creative.sizes.map((sz) => {
              const isPrimary = sz === creative.format;
              return (
                <div
                  key={sz}
                  className="rounded-card overflow-hidden flex flex-col"
                  style={{
                    background: "#1A1A18",
                    border: isPrimary
                      ? "1px solid #C9A86A"
                      : "1px solid #262623",
                  }}
                >
                  <div className="relative w-full" style={{ background: gradientBg }}>
                    <div style={{ paddingTop: ratioFor(sz) }} aria-hidden />
                    {creative.src && (
                      <img
                        src={creative.src}
                        alt={creative.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    {!creative.src && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                      <div className="relative z-10 px-1">
                        <div
                          className="text-[9px] uppercase tracking-wider font-semibold mb-1 drop-shadow-sm"
                          style={{ color: "rgba(255,255,255,0.85)" }}
                        >
                          {creative.angle}
                        </div>
                        <div
                          className="text-[11.5px] font-semibold leading-snug drop-shadow-sm"
                          style={{ color: "#FFFFFF" }}
                        >
                          {creative.title}
                        </div>
                      </div>
                    </div>
                    )}
                    <div className="absolute top-1.5 left-1.5">
                      <span
                        className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-mono tabular"
                        style={{
                          background: "rgba(0,0,0,0.55)",
                          color: "#FFFFFF",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {sz}
                      </span>
                    </div>
                  </div>
                  <div
                    className="px-2.5 py-2 flex items-center gap-1.5"
                    style={{ borderTop: "1px solid #262623" }}
                  >
                    <span
                      className="text-[10.5px] font-mono"
                      style={{ color: "#A8A8A0" }}
                    >
                      {sz}
                    </span>
                    {isPrimary && (
                      <span
                        className="text-[9px] uppercase tracking-wider font-semibold"
                        style={{ color: "#C9A86A" }}
                      >
                        primary
                      </span>
                    )}
                    <span className="flex-1" />
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "#7A7970" }}
                    >
                      {sz === "1:1"
                        ? "1080×1080"
                        : sz === "4:5"
                          ? "1080×1350"
                          : sz === "9:16"
                            ? "1080×1920"
                            : "1920×1080"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Search ad row · mimics a Google search result so the user can
 *  scan the headline/description at a glance. */
function SearchAdRow({
  ad,
}: {
  ad: {
    id: string;
    campaign: "Brand" | "Category" | "Competitor";
    primaryHeadline: string;
    primaryDescription: string;
    keywords: string;
    status: "live" | "draft";
  };
}) {
  return (
    <div
      className="rounded-card p-3.5"
      style={{
        background: "#1A1A18",
        border: "1px solid #262623",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="inline-flex items-center h-4 px-1.5 rounded text-[9.5px] uppercase tracking-wider font-semibold"
          style={{
            background: "#26261F",
            border: "1px solid #3A3530",
            color: "#D4B566",
          }}
        >
          {ad.campaign}
        </span>
        <span
          className="inline-flex items-center h-4 px-1.5 rounded text-[9.5px] uppercase tracking-wider font-semibold"
          style={
            ad.status === "live"
              ? {
                  background: "#0E2A1A",
                  border: "1px solid #1A4D2A",
                  color: "#34D399",
                }
              : {
                  background: "#1F1F1D",
                  border: "1px solid #2E2E2A",
                  color: "#8A8980",
                }
          }
        >
          {ad.status}
        </span>
        <span className="flex-1" />
        <span
          className="text-[9.5px] font-mono truncate max-w-[40%]"
          style={{ color: "#7A7970" }}
        >
          {ad.keywords}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className="text-[10.5px] uppercase tracking-wider font-semibold"
          style={{ color: "#8A8980" }}
        >
          Ad
        </span>
        <span
          className="text-[10.5px] truncate"
          style={{ color: "#8A8980" }}
        >
          guyju.com/spoken-english
        </span>
      </div>
      <div
        className="text-[14.5px] font-medium leading-snug hover:underline cursor-pointer"
        style={{ color: "#93C5FD" }}
      >
        {ad.primaryHeadline}
      </div>
      <div
        className="text-[12.5px] leading-relaxed mt-1"
        style={{ color: "#B8B7B0" }}
      >
        {ad.primaryDescription}
      </div>
    </div>
  );
}

/** Landing page mock thumbnail · stacked grayscale rectangles that
 *  represent sections. Reads as a tiny page preview. */
function LandingPageCard({
  page,
}: {
  page: {
    id: string;
    title: string;
    personaName: string;
    sections: number;
    status: "live" | "draft";
  };
}) {
  return (
    <div
      className="rounded-card overflow-hidden transition-colors"
      style={{
        background: "#1A1A18",
        border: "1px solid #262623",
      }}
    >
      <div
        className="relative h-32 px-3 py-3 flex flex-col gap-1.5"
        style={{
          background:
            "linear-gradient(180deg, #2A2520 0%, #1F1B16 50%, #15110D 100%)",
        }}
      >
        <div
          className="h-2 w-3/4 rounded"
          style={{ background: "rgba(245, 244, 239, 0.18)" }}
        />
        <div
          className="h-3 w-5/6 rounded"
          style={{ background: "rgba(245, 244, 239, 0.22)" }}
        />
        <div
          className="h-6 w-full rounded"
          style={{ background: "rgba(201, 168, 106, 0.45)" }}
        />
        <div className="grid grid-cols-3 gap-1 flex-1">
          <div
            className="rounded"
            style={{ background: "rgba(245, 244, 239, 0.12)" }}
          />
          <div
            className="rounded"
            style={{ background: "rgba(245, 244, 239, 0.12)" }}
          />
          <div
            className="rounded"
            style={{ background: "rgba(245, 244, 239, 0.12)" }}
          />
        </div>
        <span
          className="absolute top-2 right-2 inline-flex items-center h-4 px-1.5 rounded-full text-[9.5px] uppercase tracking-wider font-semibold"
          style={
            page.status === "live"
              ? { background: "#22C55E", color: "#0A1F14" }
              : {
                  background: "#1A1A18",
                  color: "#D4B566",
                  border: "1px solid #3A3530",
                }
          }
        >
          {page.status}
        </span>
      </div>
      <div
        className="px-3 py-2.5"
        style={{ borderTop: "1px solid #262623" }}
      >
        <div
          className="text-[12.5px] font-medium truncate"
          style={{ color: "#F5F4EF" }}
        >
          {page.title}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[11px] truncate flex-1"
            style={{ color: "#A8A8A0" }}
          >
            {page.personaName}
          </span>
          <span
            className="text-[10px] tabular"
            style={{ color: "#7A7970" }}
          >
            {page.sections} sections
          </span>
        </div>
      </div>
    </div>
  );
}

/** Form card · phone-frame preview with stacked field skeletons. */
function FormCard({
  form,
}: {
  form: {
    id: string;
    title: string;
    kind: "lead-form" | "click-to-whatsapp" | "phone-form";
    personaName: string;
    fields: number;
  };
}) {
  return (
    <div
      className="rounded-card overflow-hidden transition-colors"
      style={{
        background: "#1A1A18",
        border: "1px solid #262623",
      }}
    >
      <div
        className="px-4 py-4 flex items-start gap-3"
        style={{
          background:
            "linear-gradient(180deg, #1F1F1D 0%, #17171500 100%)",
        }}
      >
        {/* Phone frame */}
        <div className="w-16 flex-shrink-0">
          <div
            className="rounded-md overflow-hidden p-1.5 space-y-1"
            style={{
              background: "#26261F",
              border: "1px solid #3A3530",
            }}
          >
            <div
              className="h-1.5 w-full rounded-sm"
              style={{ background: "#1A1A18" }}
            />
            <div
              className="h-2.5 w-full rounded-sm"
              style={{ background: "#1A1A18" }}
            />
            <div
              className="h-2.5 w-full rounded-sm"
              style={{ background: "#1A1A18" }}
            />
            <div
              className="h-2.5 w-full rounded-sm"
              style={{ background: "#1A1A18" }}
            />
            <div
              className="h-3 w-full rounded-sm"
              style={{ background: "rgba(201, 168, 106, 0.6)" }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[12.5px] font-medium leading-snug"
            style={{ color: "#F5F4EF" }}
          >
            {form.title}
          </div>
          <div
            className="text-[11px] mt-0.5 truncate"
            style={{ color: "#A8A8A0" }}
          >
            {form.personaName}
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className="inline-flex items-center h-4 px-1.5 rounded-full text-[9.5px] uppercase tracking-wider font-semibold"
              style={{
                background: "#26261F",
                border: "1px solid #3A3530",
                color: "#D4B566",
              }}
            >
              {form.kind.replace("-", " ")}
            </span>
            <span
              className="text-[10px] tabular"
              style={{ color: "#7A7970" }}
            >
              {form.fields} fields
            </span>
          </div>
        </div>
      </div>
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

/**
 * Polished empty state for tabs that don't have content yet during a
 * new-product workflow. Soft circular icon + heading + one-line copy,
 * centred in the canvas. Replaces the plain "No X yet" text walls.
 */
function EmptyCanvas({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-[#FAF8F2] border border-[#E8E3D5] flex items-center justify-center mb-4">
        <Icon size={18} strokeWidth={1.6} className="text-text-secondary" />
      </div>
      <div className="text-[15px] font-semibold text-text-primary mb-1.5">
        {title}
      </div>
      <div className="text-[12.5px] text-text-secondary leading-relaxed max-w-[360px]">
        {body}
      </div>
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
