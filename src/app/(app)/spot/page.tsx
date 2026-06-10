"use client";

// /spot — the full-screen Spot surface.
//
// Empty state (no thread yet)
//   1. Hero        — Spot mark + greeting + tagline
//   2. Composer    — sits *right under* the hero, not at the bottom
//   3. Chips       — two short suggestion prompts
//   4. History     — Past chats | Spot's queue (needs approval / running / done)
//
// Active state (thread non-empty)
//   - Top bar with scope + New + History
//   - Thread fills the column
//   - Composer pinned at the bottom (standard chat behaviour)
//
// The hero+composer is deliberately at the top of the page — the user
// shouldn't have to scroll to find the place to type, and the page
// below the fold is for "what's already on Spot's desk".

import { useEffect, useRef, useState } from "react";
import {
  Package,
  Paperclip,
  ArrowUp,
  ArrowRight,
  ChevronDown,
  Plus,
  History,
  Check,
  MessageCircle,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  PanelRightOpen,
  Home,
  Sparkles,
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { SpotLoader } from "@/components/spot/spot-loader";
import { MessageBubble, TypingDots } from "@/components/spot/spot-message";
import { useSpotStore } from "@/lib/spot/store";
import { generateReply } from "@/lib/spot/replies";
import { useCurrentUser } from "@/lib/workspace-store";
import { useDemoMode } from "@/lib/demo-mode";
import { projectsList } from "@/lib/campaign-data";
import { SPOT_SESSIONS, type SpotSession } from "@/lib/spot/mock-history";
import type { SpotMessage, SpotScope } from "@/lib/spot/types";
import { WorkflowPane, ChatHeaderFilePicker } from "@/components/spot/workflow/workflow-pane";
import { PRODUCTS, diagnoseProduct } from "@/lib/products-data";
import { campaignsForProduct } from "@/lib/campaigns-edtech-rollup";
import { STEP_LABELS, type SpotWorkflow } from "@/lib/spot/workflow";
import {
  planForProduct,
  PLAN_STATUS_TONE,
  PLAN_STATUS_LABEL,
} from "@/lib/spot/extended-flows";

// Pull live suggestions from the products library so we never propose
// launching a product that doesn't exist. First slot = top product
// (highest spend); second slot = persona research on the second product.
const SUGGESTIONS: string[] = (() => {
  const ranked = [...PRODUCTS].sort(
    (a, b) => b.performance.totalSpend - a.performance.totalSpend,
  );
  const out: string[] = [];
  if (ranked[0]) out.push(`Launch a campaign for ${ranked[0].name}`);
  if (ranked[1]) out.push(`Run persona research on ${ranked[1].name}`);
  if (out.length === 0) {
    out.push("Create a new project and research it");
  }
  return out;
})();

function firstName(n: string) {
  return n.split(" ")[0] || n;
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Resize handle between the chat panel (left) and canvas (right).
 * Pointer-down arms a window-level drag listener; pointer-up releases.
 * The parent owns chat width state; we just emit deltas via onResize.
 */
function ResizeHandle({
  chatWidth,
  onResize,
}: {
  chatWidth: number;
  onResize: (nextWidth: number) => void;
}) {
  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    const onMove = (ev: PointerEvent) => {
      onResize(startWidth + (ev.clientX - startX));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  return (
    <div
      onPointerDown={startDrag}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat panel"
      className="group relative w-1 cursor-col-resize bg-border hover:bg-border-hover transition-colors flex-shrink-0"
    >
      {/* Wider invisible hit target so the user doesn't have to be pixel-precise. */}
      <div className="absolute inset-y-0 -left-2 -right-2" />
      {/* Tiny visual cue on hover · 3 vertical dots in the middle. */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
        <div className="flex flex-col gap-0.5">
          <span className="w-[2px] h-[2px] rounded-full bg-text-secondary" />
          <span className="w-[2px] h-[2px] rounded-full bg-text-secondary" />
          <span className="w-[2px] h-[2px] rounded-full bg-text-secondary" />
        </div>
      </div>
    </div>
  );
}

/** Context-aware placeholder for the chat composer. Most flows just
 *  say "Ask Spot anything…"; during product setup, the inline
 *  question card owns the inputs so the composer is muted. */
function composerPlaceholderFor(workflow: SpotWorkflow | null): string | undefined {
  if (
    workflow &&
    workflow.kind === "launch-campaign" &&
    workflow.step === "product-setup" &&
    !workflow.productSetupAnswers?.name
  ) {
    return "Answer in the card above to continue…";
  }
  return undefined;
}

export default function SpotPage() {
  const user = useCurrentUser();
  const { isEmpty: demoEmpty } = useDemoMode();
  const scope = useSpotStore((s) => s.scope);
  const setScope = useSpotStore((s) => s.setScope);
  const thread = useSpotStore((s) => s.thread);
  const setThread = useSpotStore((s) => s.setThread);
  const pendingQuery = useSpotStore((s) => s.pendingQuery);
  const closePanel = useSpotStore((s) => s.closePanel);
  const workflow = useSpotStore((s) => s.workflow);
  const canvasOpen = useSpotStore((s) => s.canvasOpen);
  const viewHomeOverride = useSpotStore((s) => s.viewHomeOverride);
  const showHomeView = useSpotStore((s) => s.showHomeView);
  const resumeWorkflow = useSpotStore((s) => s.resumeWorkflow);

  const [draft, setDraft] = useState("");
  // Chat-panel width (px) — user-resizable via the divider drag handle.
  // Default to 40% of the viewport so the canvas gets ~60% to render
  // the file content comfortably. Falls back to a sensible px value
  // during SSR before window is available.
  const [chatWidth, setChatWidth] = useState(() =>
    typeof window !== "undefined"
      ? Math.max(420, Math.round(window.innerWidth * 0.4))
      : 720,
  );
  const [pending, setPending] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);

  // Drop the legacy `open` flag — the route is the surface now.
  useEffect(() => {
    closePanel();
    // Default chat scope back to Workspace whenever the user lands on
    // /spot without an active workflow. Without this, the scope sticks
    // on whatever the last workflow set it to (a product or campaign).
    if (!workflow) {
      setScope({ kind: "workspace", label: "Workspace" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Honour a pending askSpot() call (e.g. arriving here from another page).
  useEffect(() => {
    if (!pendingQuery) return;
    const { q } = pendingQuery;
    if (!q.trim()) return;
    setThread([{ role: "user", text: q }]);
    setPending(true);
    const t = setTimeout(() => {
      setThread((prev) => [...prev, generateReply(q, scope)]);
      setPending(false);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery?.ts]);

  // Autoscroll the thread on new messages
  useEffect(() => {
    if (threadScrollRef.current) {
      threadScrollRef.current.scrollTop = threadScrollRef.current.scrollHeight;
    }
  }, [thread.length, pending]);

  // Auto-grow textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px";
  }, [draft]);

  const startLaunchFlow = useSpotStore((s) => s.startLaunchFlow);
  const startDeepResearch = useSpotStore((s) => s.startDeepResearch);
  const submitProductSetupForm = useSpotStore((s) => s.submitProductSetupForm);
  const exitWorkflow = useSpotStore((s) => s.exitWorkflow);

  // Detect "launch a campaign for X" intent. Either match X against a
  // known product in PRODUCTS (existing-product path) or fall back to a
  // free-text product name to research (deep-research path).
  type LaunchIntent =
    | { kind: "known"; id: string; name: string }
    | { kind: "unknown"; name: string }
    | null;

  const detectLaunchIntent = (text: string): LaunchIntent => {
    if (!/launch.*campaign|kick.{0,5}off.*campaign|start.*launch|launch.*spot/i.test(text)) {
      return null;
    }
    const lc = text.toLowerCase();
    // 1) Match against products (preferred)
    for (const p of PRODUCTS) {
      if (lc.includes(p.name.toLowerCase())) return { kind: "known", id: p.id, name: p.name };
    }
    // 2) Match against the legacy projectsList (kept for back-compat)
    for (const p of projectsList) {
      if (lc.includes(p.name.toLowerCase())) return { kind: "known", id: p.id, name: p.name };
      const short = p.name.split("—")[0].trim().toLowerCase();
      if (short.length > 4 && lc.includes(short)) return { kind: "known", id: p.id, name: p.name };
    }
    // 3) Couldn't resolve — extract whatever follows "for" / "of" as the product name
    const m = text.match(/(?:campaign|spot|launch)\s+for\s+(.+?)(?:[.?!]|$)/i);
    if (m) {
      const extracted = m[1].trim().replace(/[.?!]+$/, "");
      if (extracted.length > 1) return { kind: "unknown", name: extracted };
    }
    return null;
  };

  const send = (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft("");

    // During product setup the inline question card owns the inputs;
    // the composer is muted. Ignore any stray submissions.
    if (
      workflow &&
      workflow.kind === "launch-campaign" &&
      workflow.step === "product-setup" &&
      !workflow.productSetupAnswers?.name
    ) {
      return;
    }

    // Launch intent — branch on whether the product is known.
    const intent = detectLaunchIntent(t);
    if (intent && !workflow) {
      if (intent.kind === "known") {
        startLaunchFlow({ id: intent.id, name: intent.name });
      } else {
        startDeepResearch(intent.name);
      }
      return;
    }

    setThread((prev) => [...prev, { role: "user", text: t } as SpotMessage]);
    setPending(true);
    setTimeout(() => {
      setThread((prev) => [...prev, generateReply(t, scope)]);
      setPending(false);
    }, 650);
  };

  const isEmpty = thread.length === 0 && !pending;

  // ─── WORKFLOW MODE — split screen ──────────────────────────────
  // When a launch workflow is active *and* the user hasn't parked it
  // to view their Spot homepage, the page is two columns: chat on the
  // left (narrower), workspace UI on the right (wider).
  // Is *any* tool-call still running? Use this to animate the Spot
  // mark in the chat header — a spinning ring shows there's an agent
  // doing work right now (Claude-style live indicator).
  const isAgentRunning =
    !!workflow &&
    thread.some(
      (m) =>
        m.role === "spot" &&
        m.parts.some((p) => p.type === "tool-call" && p.status === "running"),
    );

  if (workflow && !viewHomeOverride) {
    return (
      <div className="h-screen flex bg-[var(--chat-bg)]">
        {/* Left — chat. Resizable via the drag handle on the right
            edge. Goes full-width when the canvas is minimized. */}
        <div
          className="flex flex-col bg-[var(--chat-bg)]"
          style={canvasOpen ? { width: `${chatWidth}px`, flex: "0 0 auto" } : { flex: 1 }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border-subtle bg-white/70 backdrop-blur-sm">
            <button
              type="button"
              onClick={showHomeView}
              title="Back to Spot home · workflow stays alive"
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            >
              <Home size={14} strokeWidth={1.6} />
            </button>
            {isAgentRunning ? (
              <SpotLoader mode="orbit" size={21} className="!gap-0" />
            ) : (
              <SpotMark size={21} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight">Spot</div>
              <div className="text-[10.5px] text-text-tertiary leading-tight truncate">
                {workflow.kind === "scale"
                  ? `Scaling · ${workflow.productName}`
                  : workflow.kind === "optimize"
                    ? `Optimizing · ${workflow.productName}`
                    : workflow.kind === "test-angles"
                      ? `Angle test · ${workflow.productName}`
                      : workflow.kind === "campaign-dive"
                        ? `Spot it · ${workflow.entityName}`
                        : `Launching · ${workflow.productName}`}
              </div>
            </div>
            {/* File picker · Claude-style preview button. Lives on the
                LEFT (the input side) so the user opens/closes canvas
                files from the same place they type. */}
            <ChatHeaderFilePicker compact />
            {!canvasOpen && (
              <button
                type="button"
                onClick={() => useSpotStore.getState().toggleCanvas()}
                title="Show canvas"
                className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              >
                <PanelRightOpen size={12} strokeWidth={1.6} />
              </button>
            )}
          </div>
          {/* Top-anchored chat · standard top-down message flow with
              the composer pinned at the bottom. The question card
              lives inside the thread at the end. */}
          <div ref={threadScrollRef} className="flex-1 overflow-y-auto scroll px-4 py-4">
            {thread.map((m, i) => (
              <MessageBubble key={i} message={m} animate={i === thread.length - 1} />
            ))}
            {pending && <TypingDots />}
            <AgentTrailIndicator working={isAgentRunning || pending} />

            {/* Inline question card · appears once Spot has finished
                preparing the intake. Three sequential questions:
                name → URL → files. Submitting the last one closes
                the card and kicks off deep research. */}
            {workflow.kind === "launch-campaign" &&
              workflow.step === "product-setup" &&
              workflow.productSetupModalOpen === true &&
              !workflow.productSetupAnswers?.name && (
                <ProductSetupQuestionCard
                  onSubmit={(data) => submitProductSetupForm(data)}
                  onClose={() => exitWorkflow()}
                />
              )}

          </div>
          <div className="border-t border-border-subtle px-3 py-3 bg-white/50 backdrop-blur-sm">
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={() => send()}
              scope={scope}
              onChangeScope={setScope}
              scopeOpen={scopeOpen}
              onScopeOpenChange={setScopeOpen}
              inputRef={inputRef}
              placeholder={composerPlaceholderFor(workflow)}
              onAttachFiles={
                workflow.kind === "launch-campaign" &&
                workflow.step === "product-setup" &&
                workflow.productSetupStage === "files"
                  ? (names) =>
                      useSpotStore.getState().attachProductSetupFiles(names)
                  : undefined
              }
            />
          </div>

        </div>

        {/* Drag handle — user controls chat width. 4px visible band with
            a wider invisible hit-target. Cursor flips to col-resize on
            hover. */}
        {canvasOpen && (
          <ResizeHandle
            chatWidth={chatWidth}
            onResize={(next) =>
              setChatWidth(Math.max(420, Math.min(next, window.innerWidth - 480)))
            }
          />
        )}

        {/* Right — workflow canvas. Floated as a rounded card on a
            dark surface so the markdown content reads in Notion-style
            dark mode. */}
        {canvasOpen && (
          <div className="flex-1 min-w-0 p-2 pl-0">
            <div
              className="h-full rounded-card border overflow-hidden"
              style={{
                background: "#161614",
                borderColor: "#2A2A26",
                boxShadow: "0 14px 36px -12px rgba(0,0,0,0.45)",
              }}
            >
              <WorkflowPane />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── ACTIVE THREAD ──────────────────────────────────────────────
  // Render the active-thread chat only when the user hasn't asked to
  // see the homepage. Without this guard, clicking the Home button
  // inside a workflow drops the user into a plain chat view instead
  // of the welcome screen + product cards + Resume banner.
  if (!isEmpty && !viewHomeOverride) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--chat-bg)]">
        {/* Top bar · file picker exposed here too so the user can dip
            into memory / plan / dashboard / assets without rejoining
            a workflow. Picker is hidden when no workflow context is
            scoped (workspace) — nothing to preview. */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border-subtle bg-white/70 backdrop-blur-sm">
          <SpotMark size={18} />
          <div className="flex-1">
            <div className="text-[13px] font-semibold leading-tight">Spot</div>
            <div className="text-[11px] text-text-tertiary leading-tight">Scoped to {scope.label}{scope.campaignLabel ? ` · ${scope.campaignLabel}` : ""}</div>
          </div>
          {workflow && <ChatHeaderFilePicker compact />}
          <button
            type="button"
            onClick={() => setThread([])}
            title="New chat"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-button text-[12px] text-text-secondary hover:bg-surface-secondary"
          >
            <Plus size={13} /> New
          </button>
          <button
            type="button"
            title="History"
            className="inline-flex items-center justify-center h-8 w-8 rounded-button text-text-secondary hover:bg-surface-secondary"
          >
            <History size={14} />
          </button>
        </div>

        {/* Conversation · wider column (+30%) so the chat reads as
            the primary surface, not a narrow strip. */}
        <div ref={threadScrollRef} className="flex-1 overflow-y-auto scroll">
          <div className="max-w-[1040px] mx-auto w-full px-6 py-8">
            {thread.map((m, i) => (
              <MessageBubble key={i} message={m} animate={i === thread.length - 1} />
            ))}
            {pending && <TypingDots />}
          </div>
        </div>

        {/* Composer pinned at the bottom — standard chat layout once
            we're in conversation mode. */}
        <div className="border-t border-border-subtle bg-white/50 backdrop-blur-sm">
          <div className="max-w-[1040px] mx-auto w-full px-6 py-4">
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={() => send()}
              scope={scope}
              onChangeScope={setScope}
              scopeOpen={scopeOpen}
              onScopeOpenChange={setScopeOpen}
              inputRef={inputRef}
            />
            <div className="text-center text-[10.5px] text-text-tertiary mt-3">
              Spot can run agents in the background while you keep editing on the platform.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── EMPTY STATE ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--chat-bg)]">
      {/* Top half: hero + composer + chips — narrow centered column so
          the welcome moment feels intimate and Claude-like.
          Pushed down with pt-32 (vs the old pt-14) so the hero sits in
          the visual sweet spot rather than crowding the top edge. */}
      <div className="max-w-[780px] mx-auto w-full px-6 pt-32">
        {/* Resume banner — when a workflow is parked. We give the building
            and review states their own visual treatment so the user
            understands what's happening at a glance. */}
        {workflow && viewHomeOverride && (
          <WorkflowParkBanner workflow={workflow} onResume={resumeWorkflow} />
        )}

        {/* Hero — bigger, breathing Spot mark. The breathe loader's soft
            pulsing aura signals "Spot is alive · ambient agents working"
            even when the user hasn't asked anything yet. */}
        <div className="flex flex-col items-center text-center mb-7">
          <SpotLoader mode="breathe" size={60} className="!gap-0" />
          <h1 className="text-[28px] leading-[1.2] font-semibold text-text-primary mt-3">
            {timeGreeting()}, {firstName(user.name)}.
          </h1>
          <p className="text-[13.5px] text-text-secondary mt-1.5 max-w-[480px] leading-relaxed">
            I'm Spot — your Head of Growth. Tell me what to work on and I'll dispatch the right agents.
          </p>
        </div>

        <Composer
          value={draft}
          onChange={setDraft}
          onSend={() => send()}
          scope={scope}
          onChangeScope={setScope}
          scopeOpen={scopeOpen}
          onScopeOpenChange={setScopeOpen}
          inputRef={inputRef}
        />

        {/* Suggestion chips — smaller, more subtle so they don't compete
            with the Spot focus. Show just 2 chips at reduced size. */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
          {(demoEmpty
            ? ["Create a new project and research it", "What can you help me with?"]
            : SUGGESTIONS
          ).slice(0, 2).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="inline-flex items-center h-7 px-2.5 rounded-full border border-border-subtle bg-transparent hover:bg-white hover:border-border text-[11.5px] text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lower half: wider canvas. Active products row + Sessions
          panel. Sits well below the fold so Spot stays the focus —
          users can scroll for context but the hero owns the welcome. */}
      <div className="max-w-[1200px] mx-auto w-full px-6 pt-20 pb-20">
        <ActiveProductsRail />
        <div className="mt-5">
          <SessionsCard />
        </div>
      </div>
    </div>
  );
}

/* ─── Components ───────────────────────────────────────────────── */

/**
 * Trail-end indicator. Sits below the last message in the chat. The
 * Spot mark is *always* visible (mirrors how Claude keeps the brand
 * glyph anchored at the end of the conversation). When any agent is
 * running, three tiny dots breathe next to it; when everything's
 * settled, just the static mark remains.
 */
function AgentTrailIndicator({ working }: { working: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-1 mb-1">
      <SpotMark
        size={14}
        className={working ? "spot-breath" : ""}
      />
      {working && (
        <div className="flex items-center gap-[3px]">
          <span className="spot-dot" style={{ animationDelay: "0s" }} />
          <span className="spot-dot" style={{ animationDelay: "0.18s" }} />
          <span className="spot-dot" style={{ animationDelay: "0.36s" }} />
        </div>
      )}
    </div>
  );
}

/**
 * SpotWorkingDrawer · the inline "I'm working in the background"
 * card the chat lands on after the user approves the plan. Minimal,
 * neat. Pulsing green dot + headline + one-line copy + two muted
 * actions (View memory, Spot homepage). Sized like a chat reply.
 */
function SpotWorkingDrawer({
  productName,
  onViewMemory,
  onGoHome,
}: {
  productName: string;
  onViewMemory: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="mt-4 mb-1">
      <div
        className="bg-white border border-border rounded-card overflow-hidden"
        style={{ boxShadow: "0 8px 24px -10px rgba(0,0,0,0.10)" }}
      >
        {/* Header strip · pulsing dot + working tag */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#15803D]">
            <span className="absolute inset-0 rounded-full bg-[#15803D] opacity-50 animate-ping" />
          </span>
          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[#15803D]">
            Spot is working in the background
          </span>
        </div>

        {/* Body */}
        <div className="px-4 pb-3">
          <div className="text-[14px] font-semibold text-text-primary leading-snug">
            Building everything for {productName}.
          </div>
          <p className="text-[12.5px] text-text-secondary mt-1.5 leading-relaxed">
            Personas, creatives, landing pages, lead forms, and campaigns
            are spinning up in parallel. I&apos;ll notify you the moment
            there&apos;s something to approve — feel free to step away.
          </p>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onViewMemory}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white hover:border-border-hover text-[12px] text-text-primary"
          >
            View project memory
            <ArrowRight size={11} strokeWidth={1.8} className="text-text-tertiary" />
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
          >
            <Home size={11} strokeWidth={1.7} />
            Back to Spot homepage
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ProductSetupQuestionCard — Claude-style inline question card that
 * lives inside the chat thread. Three sequential questions, one per
 * page (1 of 3 → 2 of 3 → 3 of 3): name, URL, files.
 *
 * The card uses a dark surface so it reads as an interactive widget
 * separate from regular chat messages. Header has the question, page
 * indicator with prev/next chevrons, and an X to cancel the flow.
 * Footer has Skip (on optional pages) and Continue / Start research.
 *
 * Submitting the last page → onSubmit fires with all three fields →
 * store mirrors the inputs as a user message + triggers deep research.
 */
function ProductSetupQuestionCard({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: { name: string; url?: string; files?: string[] }) => void;
  onClose: () => void;
}) {
  const TOTAL = 3;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const names = Array.from(files).map((f) => f.name);
    setFileNames((prev) => [...prev, ...names]);
  };

  const canSubmit = name.trim().length > 0;
  const isLast = step === TOTAL - 1;
  const canSkipThis = step !== 0; // name is required

  /** Mirror this step's user answer into the chat thread before
   *  advancing — so the left panel reflects the user's response
   *  even though they typed/dropped it into the card. */
  const appendUserMessage = (text: string) => {
    if (!text.trim()) return;
    useSpotStore.getState().appendMessage({ role: "user", text });
  };

  const finish = () => {
    if (!canSubmit) return;
    // Last step is "files" — mirror what they dropped (or "Skipped" if
    // they hit the Skip button, handled in handleSkip below).
    if (fileNames.length > 0) {
      const head = fileNames.slice(0, 3).join(", ");
      const more = fileNames.length > 3 ? ` +${fileNames.length - 3} more` : "";
      appendUserMessage(`📎 ${head}${more}`);
    } else {
      appendUserMessage("No files for now.");
    }
    onSubmit({
      name: name.trim(),
      url: url.trim() || undefined,
      files: fileNames.length > 0 ? fileNames : undefined,
    });
  };

  const goNext = () => {
    if (step === 0) {
      // Q1 — name. Required. Mirror as user message + advance.
      if (!canSubmit) return;
      appendUserMessage(name.trim());
      setStep(1);
    } else if (step === 1) {
      // Q2 — URL. Optional. If filled, mirror it; otherwise treat as skip.
      if (url.trim()) {
        appendUserMessage(url.trim());
      } else {
        appendUserMessage("Skipped — no URL yet.");
      }
      setStep(2);
    } else {
      // Q3 — files. finish() handles mirroring + submit.
      finish();
    }
  };

  const handleSkip = () => {
    if (step === 1) {
      appendUserMessage("Skipped — no URL yet.");
      setStep(2);
    } else if (step === 2) {
      appendUserMessage("Skipped — no files for now.");
      // Still submit so deep research kicks off.
      onSubmit({
        name: name.trim(),
        url: url.trim() || undefined,
        files: undefined,
      });
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  const question =
    step === 0
      ? "What should I call this project?"
      : step === 1
        ? "Got a brand URL I can crawl?"
        : "Any files I should learn from?";

  const subtitle =
    step === 0
      ? "I'll use this name across memory, plans, and campaigns."
      : step === 1
        ? "Pricing, curriculum, positioning — I'll pull whatever I can find."
        : "Brochures, decks, PDFs — drop anything that explains the project.";

  // Disable Continue when on Q1 with no name typed.
  const continueDisabled = step === 0 && !canSubmit;

  return (
    <div className="mt-4 mb-1">
      {/* Context line above the card · mirrors the Claude pattern */}
      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary mb-2 ml-0.5">
        <Sparkles size={10} strokeWidth={1.7} />
        <span>Setting up a new project · {TOTAL} quick questions</span>
      </div>

      {/* The interactive card itself · light surface matching the app theme */}
      <div className="bg-white border border-border rounded-card overflow-hidden shadow-card">
        {/* Header · question + pagination + close */}
        <div className="px-4 pt-4 pb-2.5 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-medium leading-snug text-text-primary">
              {question}
            </div>
            <div className="text-[11.5px] leading-relaxed mt-1 text-text-tertiary">
              {subtitle}
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] flex-shrink-0 text-text-tertiary">
            <button
              type="button"
              onClick={goPrev}
              disabled={step === 0}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous"
            >
              <ChevronLeft size={13} strokeWidth={1.8} />
            </button>
            <span className="tabular">
              {step + 1} of {TOTAL}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={continueDisabled}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next"
            >
              <ChevronRight size={13} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:text-text-primary transition-colors ml-0.5"
              title="Cancel"
            >
              <X size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Body · question-specific input */}
        <div className="px-4 pt-2 pb-3">
          {step === 0 && (
            <input
              autoFocus
              key="q-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) goNext();
              }}
              placeholder="e.g. Guyju's Spoken English"
              className="w-full rounded-input px-3 py-2.5 text-[13.5px] bg-white border border-border text-text-primary placeholder:text-text-tertiary outline-none focus:border-text-primary"
            />
          )}
          {step === 1 && (
            <input
              autoFocus
              key="q-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goNext();
              }}
              placeholder="https://…"
              className="w-full rounded-input px-3 py-2.5 text-[13.5px] bg-white border border-border text-text-primary placeholder:text-text-tertiary outline-none focus:border-text-primary"
            />
          )}
          {step === 2 && (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
                }}
                className={`rounded-input px-3 py-3.5 text-center cursor-pointer transition-colors border border-dashed ${
                  dragOver
                    ? "border-text-primary bg-surface-secondary"
                    : "border-border hover:border-border-hover bg-surface-page"
                }`}
              >
                <Paperclip
                  size={12}
                  strokeWidth={1.6}
                  className="inline mr-1.5 -mt-0.5 text-text-tertiary"
                />
                <span className="text-[12px] text-text-secondary">
                  Drop files or{" "}
                  <span className="font-medium underline-offset-2 hover:underline text-text-primary">
                    click to browse
                  </span>
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov,.webm"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0)
                      addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              {fileNames.length > 0 && (
                <div className="mt-2 space-y-1">
                  {fileNames.map((fn, i) => (
                    <div
                      key={`${fn}-${i}`}
                      className="flex items-center gap-1.5 text-[11.5px] rounded-input px-2 py-1.5 bg-surface-page border border-border-subtle text-text-secondary"
                    >
                      <Paperclip
                        size={11}
                        strokeWidth={1.6}
                        className="flex-shrink-0 text-text-tertiary"
                      />
                      <span className="flex-1 truncate">{fn}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFileNames((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="flex-shrink-0 text-text-tertiary hover:text-text-primary"
                        title="Remove"
                      >
                        <X size={11} strokeWidth={1.8} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer · Skip + Continue / Start research */}
        <div className="px-4 pb-4 pt-1 flex items-center gap-2">
          <div className="flex-1" />
          {canSkipThis && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-[12px] py-1.5 px-3 rounded-button text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={continueDisabled}
            className="inline-flex items-center gap-1.5 text-[12px] py-1.5 px-3 rounded-button font-medium bg-[#111] text-[#FAFAF8] hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? "Start research" : "Continue"}
            <ArrowRight size={11} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  scope,
  onChangeScope,
  scopeOpen,
  onScopeOpenChange,
  inputRef,
  placeholder,
  onAttachFiles,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  scope: SpotScope;
  onChangeScope: (s: SpotScope) => void;
  scopeOpen: boolean;
  onScopeOpenChange: (b: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
  /** Optional file-attach handler. When provided, the Attach button
   *  opens a file picker; selected files are passed back as names. */
  onAttachFiles?: (fileNames: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAttachClick = () => {
    if (!onAttachFiles) return;
    fileInputRef.current?.click();
  };
  return (
    <div className="composer">
      <textarea
        // React 19's RefObject<T | null> doesn't satisfy textarea's
        // LegacyRef<HTMLTextAreaElement>; cast bridges the gap without
        // changing runtime behaviour.
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder ?? "Ask Spot anything…"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          type="button"
          onClick={handleAttachClick}
          className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-button text-[12px] ${
            onAttachFiles
              ? "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
              : "text-text-tertiary cursor-default"
          }`}
          title={onAttachFiles ? "Attach files" : "Attach (available during product setup)"}
        >
          <Paperclip size={13} strokeWidth={1.6} />
          Attach
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov,.webm"
          onChange={(e) => {
            if (!onAttachFiles) return;
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const names = Array.from(files).map((f) => f.name);
            onAttachFiles(names);
            e.target.value = "";
          }}
        />
        <ScopePicker
          scope={scope}
          onChange={onChangeScope}
          open={scopeOpen}
          onOpenChange={onScopeOpenChange}
        />
        {scope.kind === "project" && scope.target && (
          <CampaignScopePicker scope={scope} onChange={onChangeScope} />
        )}
        <div className="flex-1" />
        <span className="mono text-[10px] text-text-tertiary mr-1">⏎ to send</span>
        <button
          type="button"
          disabled={!value.trim()}
          onClick={onSend}
          className="apply-btn"
          style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}
        >
          <ArrowUp size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function ScopePicker({
  scope,
  onChange,
  open,
  onOpenChange,
}: {
  scope: SpotScope;
  onChange: (s: SpotScope) => void;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const startNewProductFlow = useSpotStore((s) => s.startNewProductFlow);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  // Scope from the live Products library so the dropdown reflects what's
  // actually in this workspace (Guyju's, not the legacy real-estate list).
  const projectScopes: SpotScope[] = PRODUCTS.slice(0, 5).map((p) => ({
    kind: "project",
    label: p.name,
    target: p.id,
  }));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-1.5 h-7 px-2 rounded-button border border-border bg-white hover:border-border-hover text-[12px] text-text-secondary hover:text-text-primary"
        title="Change scope"
      >
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: "#111" }}
        />
        <span className="max-w-[180px] truncate">{scope.label}</span>
        <ChevronDown size={11} strokeWidth={1.8} />
      </button>
      {open && (
        <div
          className="absolute bottom-[calc(100%+6px)] left-0 z-50 bg-white border border-border rounded-card py-1.5 min-w-[260px]"
          style={{ boxShadow: "0 8px 28px -8px rgba(0,0,0,0.12)" }}
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
            Workspace
          </div>
          <ScopeRow
            label="Workspace"
            active={scope.kind === "workspace"}
            onSelect={() => {
              onChange({ kind: "workspace", label: "Workspace" });
              onOpenChange(false);
            }}
          />
          <div className="border-t border-border-subtle my-1" />
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
            Projects
          </div>
          {projectScopes.map((p) => (
            <ScopeRow
              key={p.target}
              label={p.label}
              active={scope.kind === "project" && scope.target === p.target}
              onSelect={() => {
                onChange(p);
                onOpenChange(false);
              }}
            />
          ))}
          <div className="border-t border-border-subtle my-1" />
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              startNewProductFlow();
            }}
            className="w-full text-left flex items-center gap-2 px-3 h-8 hover:bg-surface-secondary text-[12.5px] text-text-primary"
          >
            <Plus size={12} strokeWidth={2} className="text-text-tertiary" />
            <span className="flex-1">New project — start with research</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Campaign sub-selector — only shown when the chat is scoped to a Project.
 * Defaults to "All campaigns" (the whole project); the user can narrow to a
 * single campaign. Selecting a different Project resets this to All campaigns
 * (ScopePicker replaces the scope object without a campaign).
 */
function CampaignScopePicker({
  scope,
  onChange,
}: {
  scope: SpotScope;
  onChange: (s: SpotScope) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const campaigns = scope.target ? campaignsForProduct(scope.target) : [];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-7 px-2 rounded-button border border-border bg-white hover:border-border-hover text-[12px] text-text-secondary hover:text-text-primary"
        title="Scope to a campaign"
      >
        <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: scope.campaignId ? "#C9A86A" : "#9B9B9B" }} />
        <span className="max-w-[160px] truncate">{scope.campaignLabel ?? "All campaigns"}</span>
        <ChevronDown size={11} strokeWidth={1.8} />
      </button>
      {open && (
        <div
          className="absolute bottom-[calc(100%+6px)] left-0 z-50 bg-white border border-border rounded-card py-1.5 min-w-[260px]"
          style={{ boxShadow: "0 8px 28px -8px rgba(0,0,0,0.12)" }}
        >
          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
            Campaigns · {scope.label}
          </div>
          <ScopeRow
            label="All campaigns"
            active={!scope.campaignId}
            onSelect={() => {
              onChange({ ...scope, campaignId: undefined, campaignLabel: undefined });
              setOpen(false);
            }}
          />
          {campaigns.length > 0 && <div className="border-t border-border-subtle my-1" />}
          {campaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange({ ...scope, campaignId: c.id, campaignLabel: c.name });
                setOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-3 h-8 hover:bg-surface-secondary text-[12.5px] text-text-primary"
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: c.status === "enabled" ? "#22C55E" : "#9B9B9B" }}
              />
              <span className="flex-1 truncate">{c.name}</span>
              {scope.campaignId === c.id && (
                <Check size={12} strokeWidth={2} className="text-text-primary" />
              )}
            </button>
          ))}
          {campaigns.length === 0 && (
            <div className="px-3 py-2 text-[11.5px] text-text-tertiary italic">
              No campaigns yet for this project.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScopeRow({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left flex items-center gap-2 px-3 h-8 hover:bg-surface-secondary text-[12.5px] text-text-primary"
    >
      <span className="flex-1 truncate">{label}</span>
      {active && <Check size={12} strokeWidth={2} className="text-text-primary" />}
    </button>
  );
}

/* ─── History panels ──────────────────────────────────────────── */

/**
 * Active products rail — full-width row of product cards the user can
 * launch straight from the homepage. Clicking the launch button calls
 * startLaunchFlow which kicks off the split-screen workflow.
 */
function ActiveProductsRail() {
  const { isEmpty } = useDemoMode();
  const startLaunchFlow = useSpotStore((s) => s.startLaunchFlow);
  const startNewProductFlow = useSpotStore((s) => s.startNewProductFlow);
  const startScaleFlow = useSpotStore((s) => s.startScaleFlow);
  const startOptimizeFlow = useSpotStore((s) => s.startOptimizeFlow);
  const startTestAnglesFlow = useSpotStore((s) => s.startTestAnglesFlow);
  const top = PRODUCTS.slice(0, 3);

  // Empty-state preview — no products in the workspace yet.
  if (isEmpty) {
    return (
      <div>
        <div className="flex items-center mb-2.5">
          <span className="label-section">Your projects</span>
        </div>
        <div className="bg-white border border-border rounded-card flex flex-col items-center text-center px-6 py-12">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
            <Package size={20} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary">No projects yet</h3>
          <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1.5 max-w-[420px]">
            Spin up your first project and I&apos;ll research it, build the memory, and draft a launch plan — or import existing campaigns to start from your live data.
          </p>
          <button
            type="button"
            onClick={startNewProductFlow}
            className="inline-flex items-center gap-1.5 h-9 px-4 mt-4 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
          >
            <Plus size={14} strokeWidth={2} />
            Create your first project
          </button>
        </div>
      </div>
    );
  }

  // The chip action on each product card maps the diagnosis to a
  // workflow kind. "Healthy" → scale (best-case action is to scale
  // a winning product); "High CPL" → optimize; "Low volume + high CPL"
  // → test new angles; etc. The mapping lives on the diagnosis itself
  // (diagnoseProduct().flow).
  const startFlow = (flow: string, p: { id: string; name: string }) => {
    const pickFor = { id: p.id, name: p.name };
    if (flow === "scale") startScaleFlow(pickFor);
    else if (flow === "optimize") startOptimizeFlow(pickFor);
    else if (flow === "test-angles") startTestAnglesFlow(pickFor);
    else startLaunchFlow(pickFor);
  };

  return (
    <div>
      <div className="flex items-center mb-2.5">
        <span className="label-section">Your projects</span>
        <span className="flex-1" />
        <a
          href="/products"
          className="text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          All projects →
        </a>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {top.map((p) => {
          const dx = diagnoseProduct(p);
          const tonePill =
            dx.tone === "ok"
              ? "pill-ok"
              : dx.tone === "err"
                ? "pill-err"
                : dx.tone === "info"
                  ? "pill-info"
                  : "pill-warn";
          return (
            <div
              key={p.id}
              className="bg-white border border-border rounded-card p-3.5 flex flex-col gap-2.5"
            >
              {/* Header */}
              <div>
                <div className="text-[10.5px] text-text-tertiary mb-0.5 truncate">
                  {p.category}
                </div>
                <div className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2 min-h-[2.4em]">
                  {p.name}
                </div>
              </div>

              {/* 3-metric row — small, glanceable */}
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border-subtle">
                <ProductMetric
                  label="Leads"
                  value={p.performance.totalLeads.toLocaleString("en-IN")}
                />
                <ProductMetric
                  label="CPL"
                  value={`₹${p.performance.avgCpl}`}
                />
                <ProductMetric
                  label="Qual"
                  value={`${p.performance.qualificationRate}%`}
                />
              </div>

              {/* Diagnosis chip */}
              <span
                className={`pill ${tonePill} self-start inline-flex items-center gap-1`}
                style={{ fontSize: 10 }}
              >
                {dx.chip}
              </span>

              {/* Plan chip — long-lived plan attached to this product.
                  Tells the user what Spot is currently working on +
                  whether anything's waiting for them. */}
              {(() => {
                const plan = planForProduct(p.id);
                if (!plan) return null;
                return (
                  <a
                    href="/memory"
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-input bg-surface-page border border-border-subtle hover:border-border-hover transition-colors"
                  >
                    <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0" />
                    <span className="text-[11px] text-text-primary font-medium truncate flex-1">
                      {PLAN_STATUS_LABEL[plan.status]}
                    </span>
                  </a>
                );
              })()}

              {/* Action — health-driven · dispatches to the right Spot
                  workflow based on diagnoseProduct().flow */}
              <div className="flex items-center gap-1 mt-auto">
                <button
                  type="button"
                  onClick={() => startFlow(dx.flow, p)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[11.5px] font-medium"
                >
                  {dx.action}
                  <ArrowRight size={11} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => startLaunchFlow({ id: p.id, name: p.name })}
                  className="inline-flex items-center h-7 px-2 rounded-button text-[11px] text-text-tertiary hover:text-text-primary"
                  title="Open the launch workflow for this project"
                >
                  Launch
                </button>
              </div>
            </div>
          );
        })}

        {/* New product slot — always last */}
        <button
          type="button"
          onClick={startNewProductFlow}
          className="border-2 border-dashed border-border rounded-card p-3.5 text-left hover:border-text-primary hover:bg-white transition-colors group flex flex-col gap-2.5"
        >
          <div>
            <div className="text-[10.5px] text-text-tertiary mb-0.5">Fresh start</div>
            <div className="text-[13px] font-medium text-text-primary leading-tight min-h-[2.4em]">
              New project
            </div>
          </div>
          <div className="text-[11px] text-text-secondary leading-snug">
            I'll do deep research from a name or URL.
          </div>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-text-primary font-medium group-hover:underline mt-auto">
            <Plus size={11} strokeWidth={2} />
            Start a new project
          </span>
        </button>
      </div>
    </div>
  );
}

function ProductMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className="text-[12.5px] font-medium text-text-primary tabular leading-tight">
        {value}
      </div>
    </div>
  );
}

/**
 * Sessions panel · one card replaces the old PastChats + Queue split.
 * Every session Spot is working on — actively executing, awaiting
 * approval, or recently completed — lives here. The UI is the same
 * row shape for all three states; the right-side affordance differs:
 *   · executing       → orbit loader + progress bar
 *   · needs-approval  → "Review" button
 *   · completed       → subtle "View" link
 */
function SessionsCard() {
  const { isEmpty } = useDemoMode();
  const workflow = useSpotStore((s) => s.workflow);
  const viewHomeOverride = useSpotStore((s) => s.viewHomeOverride);
  const resumeWorkflow = useSpotStore((s) => s.resumeWorkflow);

  // Empty-state preview — no sessions run yet.
  if (isEmpty) {
    return (
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
          <SpotMark size={12} />
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            Sessions
          </span>
        </div>
        <div className="flex flex-col items-center text-center px-6 py-12">
          <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
            <SpotMark size={20} />
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary">No sessions yet</h3>
          <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1.5 max-w-[420px]">
            When you put me to work, your active and completed runs show up here — ready to review, resume, or pick up where we left off.
          </p>
        </div>
      </div>
    );
  }

  // Pinned at top: the user's current parked workflow (if any) — they
  // get a quick way back into whatever they were doing.
  const showParked = !!workflow && viewHomeOverride;

  // Sort sessions: executing first, then approval-needed, then done.
  const order: SpotSession["status"][] = ["executing", "needs-approval", "completed"];
  const sessions = [...SPOT_SESSIONS].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  );
  const needCount = sessions.filter((s) => s.status === "needs-approval").length;
  const runningCount = sessions.filter((s) => s.status === "executing").length;

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
        <SpotMark size={12} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
          Sessions
        </span>
        <span className="flex-1" />
        {needCount > 0 && (
          <span className="pill pill-warn" style={{ fontSize: 10 }}>
            {needCount} need review
          </span>
        )}
        {runningCount > 0 && (
          <span className="text-[11px] text-text-secondary inline-flex items-center gap-1">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#15803D] relative">
              <span className="absolute inset-0 rounded-full bg-[#15803D] opacity-50 animate-ping" />
            </span>
            {runningCount} executing
          </span>
        )}
      </div>
      <ul className="divide-y divide-border-subtle">
        {showParked && workflow && (
          <li>
            <button
              type="button"
              onClick={resumeWorkflow}
              className="w-full text-left px-4 py-3 hover-row flex items-center gap-3"
            >
              <SpotLoader mode="orbit" size={18} className="!gap-0 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[13px] font-semibold text-text-primary truncate">
                    {workflow.kind === "campaign-dive"
                      ? `Spot it · ${workflow.entityName}`
                      : `${workflow.kind === "launch-campaign" ? "Launching" : workflow.kind === "scale" ? "Scaling" : workflow.kind === "optimize" ? "Optimizing" : "Testing angles ·"} ${workflow.productName}`}
                  </span>
                  <span className="pill pill-info" style={{ fontSize: 9.5 }}>
                    Your current session
                  </span>
                </div>
                <div className="text-[11.5px] text-text-secondary leading-snug">
                  Tap to resume from where you left off.
                </div>
              </div>
              <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] text-[11px] font-medium flex-shrink-0">
                Resume
                <ArrowRight size={11} strokeWidth={2} />
              </span>
            </button>
          </li>
        )}
        {sessions.map((s) => (
          <li key={s.id}>
            <SessionRow session={s} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const KIND_TONE: Record<SpotSession["kind"], { ring: string; text: string }> = {
  launch: { ring: "bg-[#EFF6FF]", text: "text-[#1D4ED8]" },
  scale: { ring: "bg-[#F0FDF4]", text: "text-[#15803D]" },
  optimize: { ring: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  "test-angles": { ring: "bg-[#FEE7F2]", text: "text-[#9D174D]" },
  "campaign-dive": { ring: "bg-surface-secondary", text: "text-text-secondary" },
  other: { ring: "bg-surface-secondary", text: "text-text-secondary" },
};

function SessionRow({ session }: { session: SpotSession }) {
  const isExecuting = session.status === "executing";
  const isApproval = session.status === "needs-approval";
  const isDone = session.status === "completed";

  return (
    <div className="px-4 py-3 hover-row flex items-start gap-3">
      {/* Left affordance — orbit when executing, status ring otherwise */}
      <div className="flex-shrink-0 flex items-center justify-center mt-0.5">
        {isExecuting ? (
          <SpotLoader mode="orbit" size={18} className="!gap-0" />
        ) : (
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isApproval ? "bg-[#FEF3C7]" : "bg-[#F0FDF4]"
            }`}
          >
            {isApproval ? (
              <Clock size={12} strokeWidth={1.8} className="text-[#92400E]" />
            ) : (
              <CheckCircle2 size={12} strokeWidth={2} className="text-[#15803D]" />
            )}
          </div>
        )}
      </div>

      {/* Middle — title, scope, current step / detail */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[13px] font-semibold text-text-primary leading-tight">
            {session.title}
          </span>
        </div>
        <div className="text-[11px] text-text-tertiary mb-1">
          {session.scope} · {session.when}
        </div>
        <div className="text-[12px] text-text-secondary leading-snug line-clamp-2">
          {isExecuting && session.currentStep ? session.currentStep : session.detail}
        </div>
        {/* Executing: progress bar */}
        {isExecuting && typeof session.progress === "number" && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-surface-page overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#15803D] to-[#22C55E] transition-all duration-500"
                style={{ width: `${session.progress}%` }}
              />
            </div>
            <span className="text-[10.5px] text-text-tertiary tabular flex-shrink-0">
              {Math.round(session.progress)}%
              {session.eta && ` · ${session.eta}`}
            </span>
          </div>
        )}
      </div>

      {/* Right affordance — Review for approval, View for done */}
      {isApproval && (
        <button
          type="button"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[11.5px] font-medium flex-shrink-0"
        >
          <SpotMark size={10} />
          Review
        </button>
      )}
      {isDone && (
        <button
          type="button"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11px] text-text-tertiary hover:text-text-primary flex-shrink-0"
        >
          View
          <ChevronRight size={11} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  action,
  actionTone,
}: {
  icon: React.ReactNode;
  title: string;
  action: string;
  actionTone?: "warn";
}) {
  return (
    <div className="px-3.5 py-2.5 border-b border-border-subtle flex items-center gap-1.5">
      <span className="text-text-tertiary">{icon}</span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">{title}</span>
      <span className="flex-1" />
      <span
        className={`text-[11px] ${
          actionTone === "warn" ? "text-[#92400E] font-medium" : "text-text-tertiary hover:text-text-primary cursor-pointer"
        }`}
      >
        {action}
      </span>
    </div>
  );
}

/**
 * Banner shown on the /spot homepage when a workflow is parked. Three
 * visual states drive different copy + accents:
 *
 *   · launch-building → "Spot is working" with progress bar (no jump-in
 *     CTA; the user just waits).
 *   · launch-review   → "Ready to review" with a green pulsing dot and
 *     a primary Approve CTA — high-energy invitation back into the canvas.
 *   · anything else    → Default Resume banner.
 *
 * The launch-building bar fills from 0% → 100% over the building delay
 * so the user has something to watch.
 */
function WorkflowParkBanner({
  workflow,
  onResume,
}: {
  workflow: SpotWorkflow;
  onResume: () => void;
}) {
  const isBuilding = workflow.step === "launch-building";
  const isReview = workflow.step === "launch-review";
  const isDeploying = workflow.step === "launch-deploy";

  // Progress bar fill animation while building OR deploying.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!isBuilding && !isDeploying) return;
    setProgress(8); // start visible
    // Deploy completes in 14s, building runs longer · faster ramp for deploy.
    const stepUp = isDeploying ? 12 : 6;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return 92;
        return p + Math.random() * stepUp;
      });
    }, isDeploying ? 500 : 800);
    return () => clearInterval(interval);
  }, [isBuilding, isDeploying]);

  if (isDeploying) {
    return (
      <button
        type="button"
        onClick={onResume}
        className="w-full mb-5 rounded-card p-4 relative overflow-hidden text-left transition-colors"
        style={{
          background:
            "linear-gradient(135deg, #1F1B14 0%, #181612 50%, #131110 100%)",
          border: "1px solid #3A3530",
          boxShadow:
            "0 12px 32px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,106,0.12) inset",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 100% 0%, rgba(201, 168, 106, 0.28) 0%, transparent 70%)",
          }}
        />
        <div className="absolute -top-2 -right-2 opacity-[0.12]">
          <SpotMark size={64} />
        </div>
        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12">
              <SpotLoader mode="orbit" size={20} className="!gap-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#C9A86A]">
                  <span className="absolute inset-0 rounded-full bg-[#C9A86A] opacity-60 animate-ping" />
                </span>
                <span
                  className="text-[10.5px] uppercase tracking-wider font-semibold"
                  style={{ color: "#E0C083" }}
                >
                  Spot is deploying
                </span>
              </div>
              <div
                className="text-[14px] font-semibold leading-tight"
                style={{ color: "#F5F4EF" }}
              >
                Pushing {workflow.productName} to Meta · Google · WhatsApp
              </div>
              <div
                className="text-[12px] mt-1 leading-relaxed"
                style={{ color: "#A8A8A0" }}
              >
                Ads, landing pages, lead forms, pixels and trackers going live
                right now. I&apos;ll switch this to a launch summary the moment
                it&apos;s done.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, #C9A86A 0%, #E0C083 60%, #22C55E 100%)",
                }}
              />
            </div>
            <span
              className="text-[11px] tabular flex-shrink-0"
              style={{ color: "#A8A8A0" }}
            >
              {Math.round(progress)}% · live in seconds
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (isBuilding) {
    return (
      <div
        className="w-full mb-5 rounded-card p-4 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1F1B14 0%, #181612 50%, #131110 100%)",
          border: "1px solid #2E2820",
          boxShadow:
            "0 12px 32px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,168,106,0.06) inset",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 100% 0%, rgba(201, 168, 106, 0.20) 0%, transparent 70%)",
          }}
        />
        <div className="absolute -top-2 -right-2 opacity-[0.10]">
          <SpotMark size={64} />
        </div>
        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12">
              <SpotLoader mode="orbit" size={20} className="!gap-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#22C55E]">
                  <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
                </span>
                <span
                  className="text-[10.5px] uppercase tracking-wider font-semibold"
                  style={{ color: "#22C55E" }}
                >
                  Spot is working
                </span>
              </div>
              <div
                className="text-[14px] font-semibold leading-tight"
                style={{ color: "#F5F4EF" }}
              >
                Building {workflow.productName}
              </div>
              <div
                className="text-[12px] mt-1 leading-relaxed"
                style={{ color: "#A8A8A0" }}
              >
                Six agents running in parallel · Creative · Resize · Landing · Forms ·
                Campaigns · Voice. I&apos;ll ping you when it&apos;s ready to review.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background:
                    "linear-gradient(90deg, #C9A86A 0%, #E0C083 60%, #22C55E 100%)",
                }}
              />
            </div>
            <span
              className="text-[11px] tabular flex-shrink-0"
              style={{ color: "#A8A8A0" }}
            >
              {Math.round(progress)}% · ETA ~2 hrs
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isReview) {
    return (
      <button
        type="button"
        onClick={onResume}
        className="w-full mb-5 group rounded-card p-4 flex items-center gap-3 text-left relative overflow-hidden transition-colors"
        style={{
          background:
            "linear-gradient(135deg, #0E2A1A 0%, #0A1F14 50%, #07170E 100%)",
          border: "1px solid #1A4D2A",
          boxShadow: "0 12px 32px -12px rgba(0,0,0,0.5)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 100% 0%, rgba(34, 197, 94, 0.22) 0%, transparent 70%)",
          }}
        />
        <div className="absolute -top-2 -right-2 opacity-[0.10]">
          <SpotMark size={64} />
        </div>
        <div
          className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "#0A1F14",
            border: "1px solid #1A4D2A",
            boxShadow: "0 0 18px rgba(34, 197, 94, 0.25)",
          }}
        >
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#22C55E]">
            <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
          </span>
        </div>
        <div className="relative flex-1 min-w-0">
          <div
            className="text-[10.5px] uppercase tracking-wider font-semibold mb-0.5"
            style={{ color: "#22C55E" }}
          >
            Ready to review · {workflow.productName}
          </div>
          <div
            className="text-[13.5px] font-semibold leading-tight"
            style={{ color: "#F5F4EF" }}
          >
            Spot finished building · approve to deploy live
          </div>
          <div
            className="text-[11.5px] mt-0.5"
            style={{ color: "#A8A8A0" }}
          >
            18 creatives · 72 resized variants · 3 landing pages · 2 forms · 3 campaigns
          </div>
        </div>
        <span
          className="relative inline-flex items-center gap-1 h-8 px-3 rounded-button text-[12px] font-medium flex-shrink-0"
          style={{
            background: "#22C55E",
            color: "#0A1F14",
          }}
        >
          Review &amp; approve
          <ArrowRight size={12} strokeWidth={2} />
        </span>
      </button>
    );
  }

  // Default — generic parked workflow (dark warm tone).
  return (
    <button
      type="button"
      onClick={onResume}
      className="w-full mb-5 group rounded-card p-3 flex items-center gap-3 text-left transition-colors"
      style={{
        background: "#1A1A18",
        border: "1px solid #2E2820",
      }}
    >
      <SpotMark size={20} />
      <div className="flex-1 min-w-0">
        <div
          className="text-[10.5px] uppercase tracking-wider font-medium"
          style={{ color: "#8A8980" }}
        >
          {workflow.kind === "launch-campaign"
            ? "Launch in progress"
            : workflow.kind === "scale"
              ? "Scale plan in progress"
              : workflow.kind === "optimize"
                ? "Optimize plan in progress"
                : "Angle test in progress"}
        </div>
        <div
          className="text-[13px] font-medium truncate"
          style={{ color: "#F5F4EF" }}
        >
          {workflow.productName} · {STEP_LABELS[workflow.step] || workflow.step}
        </div>
      </div>
      <span
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] font-medium"
        style={{ background: "#FAFAF8", color: "#0A0A09" }}
      >
        Resume
        <ArrowRight size={11} strokeWidth={2} />
      </span>
    </button>
  );
}
