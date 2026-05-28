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
import { projectsList } from "@/lib/campaign-data";
import { SPOT_SESSIONS, type SpotSession } from "@/lib/spot/mock-history";
import type { SpotMessage, SpotScope } from "@/lib/spot/types";
import { WorkflowPane } from "@/components/spot/workflow/workflow-pane";
import { PRODUCTS, diagnoseProduct } from "@/lib/products-data";
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
    out.push("Create a new product and research it");
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
 *  say "Ask Spot anything…"; the product-setup Q&A swaps in stage-
 *  specific hints so the user knows what to type next. */
function composerPlaceholderFor(workflow: SpotWorkflow | null): string | undefined {
  if (
    !workflow ||
    workflow.kind !== "launch-campaign" ||
    workflow.step !== "product-setup"
  ) {
    return undefined;
  }
  const stage = workflow.productSetupStage ?? "name";
  if (stage === "name") return "What should I call the product?";
  if (stage === "url") return "Paste a URL · or type 'skip'";
  if (stage === "files")
    return "Attach files via 📎 · or type 'skip' to start research";
  return "Ask Spot anything…";
}

export default function SpotPage() {
  const user = useCurrentUser();
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
  // Default to a generous 620 so the chat is the primary surface.
  const [chatWidth, setChatWidth] = useState(620);
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

    // Chat-driven product-setup Q&A · route the answer through the
    // store's stage machine instead of the generic askSpot path.
    if (
      workflow &&
      workflow.kind === "launch-campaign" &&
      workflow.step === "product-setup"
    ) {
      useSpotStore.getState().handleProductSetupAnswer(t);
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
        {/* Left — chat. Resizable via the drag handle on the right edge.
            Goes full-width when the canvas is minimized. */}
        <div
          className="flex flex-col border-r border-border bg-[var(--chat-bg)]"
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
            {/* Logo +30% (was 16 → 21). When an agent is running, swap
                the static mark for the orbit loader so the chat panel
                visibly reflects work-in-progress. */}
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
            {!canvasOpen && (
              <button
                type="button"
                onClick={() => useSpotStore.getState().toggleCanvas()}
                title="Show canvas"
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white hover:border-border-hover text-[11.5px] text-text-secondary hover:text-text-primary"
              >
                <PanelRightOpen size={12} strokeWidth={1.6} />
                Show canvas
              </button>
            )}
          </div>
          <div ref={threadScrollRef} className="flex-1 overflow-y-auto scroll px-4 py-4">
            {thread.map((m, i) => (
              <MessageBubble key={i} message={m} animate={i === thread.length - 1} />
            ))}
            {pending && <TypingDots />}
            <AgentTrailIndicator working={isAgentRunning || pending} />
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

        {/* Right — workflow canvas. Collapses (instead of unmounting)
            when the user minimises; state stays intact. */}
        {canvasOpen && (
          <div className="flex-1 min-w-0">
            <WorkflowPane />
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
        {/* Top bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border-subtle bg-white/70 backdrop-blur-sm">
          <SpotMark size={18} />
          <div className="flex-1">
            <div className="text-[13px] font-semibold leading-tight">Spot</div>
            <div className="text-[11px] text-text-tertiary leading-tight">Scoped to {scope.label}</div>
          </div>
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

        {/* Conversation */}
        <div ref={threadScrollRef} className="flex-1 overflow-y-auto scroll">
          <div className="max-w-[720px] mx-auto w-full px-6 py-8">
            {thread.map((m, i) => (
              <MessageBubble key={i} message={m} animate={i === thread.length - 1} />
            ))}
            {pending && <TypingDots />}
          </div>
        </div>

        {/* Composer pinned at the bottom — standard chat layout once
            we're in conversation mode. */}
        <div className="border-t border-border-subtle bg-white/50 backdrop-blur-sm">
          <div className="max-w-[720px] mx-auto w-full px-6 py-4">
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
          {SUGGESTIONS.slice(0, 2).map((s) => (
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
            Products
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
            <span className="flex-1">New product — start with research</span>
          </button>
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
  const startLaunchFlow = useSpotStore((s) => s.startLaunchFlow);
  const startNewProductFlow = useSpotStore((s) => s.startNewProductFlow);
  const startScaleFlow = useSpotStore((s) => s.startScaleFlow);
  const startOptimizeFlow = useSpotStore((s) => s.startOptimizeFlow);
  const startTestAnglesFlow = useSpotStore((s) => s.startTestAnglesFlow);
  const top = PRODUCTS.slice(0, 3);

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
        <span className="label-section">Your products</span>
        <span className="flex-1" />
        <a
          href="/products"
          className="text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          All products →
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
                      {PLAN_STATUS_LABEL[plan.status]} · {plan.dayLabel}
                    </span>
                    {plan.pendingRecs > 0 && (
                      <span className="pill pill-warn flex-shrink-0" style={{ fontSize: 9.5 }}>
                        {plan.pendingRecs} pending
                      </span>
                    )}
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
                  title="Open the launch workflow for this product"
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
              New product
            </div>
          </div>
          <div className="text-[11px] text-text-secondary leading-snug">
            I'll do deep research from a name or URL.
          </div>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-text-primary font-medium group-hover:underline mt-auto">
            <Plus size={11} strokeWidth={2} />
            Start a new product
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
  const workflow = useSpotStore((s) => s.workflow);
  const viewHomeOverride = useSpotStore((s) => s.viewHomeOverride);
  const resumeWorkflow = useSpotStore((s) => s.resumeWorkflow);

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

  // Progress bar fill animation while building.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!isBuilding) return;
    setProgress(8); // start visible
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return 92; // hold near full until step advances
        return p + Math.random() * 6;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isBuilding]);

  if (isBuilding) {
    return (
      <div className="w-full mb-5 bg-gradient-to-br from-[#FAF8F2] to-[#F5F2E8] border border-[#E8E3D5] rounded-card p-4 relative overflow-hidden">
        <div className="absolute -top-2 -right-2 opacity-[0.08]">
          <SpotMark size={64} />
        </div>
        <div className="relative">
          <div className="flex items-start gap-3 mb-3">
            {/* Orbiting Spot — matches the in-canvas loader so the
                user sees a consistent "working" signal everywhere. */}
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12">
              <SpotLoader mode="orbit" size={20} className="!gap-0" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                <span className="text-[10.5px] uppercase tracking-wider text-[#15803D] font-semibold">
                  Spot is working
                </span>
              </div>
              <div className="text-[14px] font-semibold text-text-primary leading-tight">
                Building {workflow.productName}
              </div>
              <div className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                Six agents running in parallel · Creative · Resize · Landing · Forms ·
                Campaigns · Voice. I'll ping you when it's ready to review.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#15803D] to-[#22C55E] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] text-text-secondary tabular flex-shrink-0">
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
        className="w-full mb-5 group bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border border-[#86EFAC] rounded-card p-4 flex items-center gap-3 hover:border-[#15803D] transition-colors text-left relative overflow-hidden"
      >
        <div className="absolute -top-2 -right-2 opacity-[0.08]">
          <SpotMark size={64} />
        </div>
        <div className="relative w-9 h-9 rounded-full bg-white border border-[#86EFAC] flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="relative inline-flex w-2 h-2 rounded-full bg-[#15803D]">
            <span className="absolute inset-0 rounded-full bg-[#15803D] opacity-50 animate-ping" />
          </span>
        </div>
        <div className="relative flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-wider text-[#15803D] font-semibold mb-0.5">
            Ready to review · {workflow.productName}
          </div>
          <div className="text-[13.5px] font-semibold text-text-primary leading-tight">
            Spot finished building · approve to deploy live
          </div>
          <div className="text-[11.5px] text-text-secondary mt-0.5">
            18 creatives · 72 resized variants · 3 landing pages · 2 forms · 3 campaigns
          </div>
        </div>
        <span className="relative inline-flex items-center gap-1 h-8 px-3 rounded-button bg-[#15803D] text-white text-[12px] font-medium group-hover:bg-[#0F6B30] flex-shrink-0">
          Review & approve
          <ArrowRight size={12} strokeWidth={2} />
        </span>
      </button>
    );
  }

  // Default — generic parked workflow.
  return (
    <button
      type="button"
      onClick={onResume}
      className="w-full mb-5 group bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 flex items-center gap-3 hover:border-[#D4B566] transition-colors text-left"
    >
      <SpotMark size={20} />
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-medium">
          {workflow.kind === "launch-campaign"
            ? "Launch in progress"
            : workflow.kind === "scale"
              ? "Scale plan in progress"
              : workflow.kind === "optimize"
                ? "Optimize plan in progress"
                : "Angle test in progress"}
        </div>
        <div className="text-[13px] font-medium text-text-primary truncate">
          {workflow.productName} · {STEP_LABELS[workflow.step] || workflow.step}
        </div>
      </div>
      <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] text-[11.5px] font-medium group-hover:bg-black">
        Resume
        <ArrowRight size={11} strokeWidth={2} />
      </span>
    </button>
  );
}
