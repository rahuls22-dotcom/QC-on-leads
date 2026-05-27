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
import { MessageBubble, TypingDots } from "@/components/spot/spot-message";
import { useSpotStore } from "@/lib/spot/store";
import { generateReply } from "@/lib/spot/replies";
import { useCurrentUser } from "@/lib/workspace-store";
import { projectsList } from "@/lib/campaign-data";
import { PAST_CHATS, SPOT_QUEUE, type QueueItem, type QueueStatus } from "@/lib/spot/mock-history";
import type { SpotMessage, SpotScope } from "@/lib/spot/types";
import { WorkflowPane } from "@/components/spot/workflow/workflow-pane";
import { PRODUCTS } from "@/lib/products-data";

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
  const [pending, setPending] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);

  // Drop the legacy `open` flag — the route is the surface now.
  useEffect(() => {
    closePanel();
  }, [closePanel]);

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
        {/* Left — chat. Goes full-width when the canvas is minimized. */}
        <div
          className={`flex flex-col border-r border-border bg-[var(--chat-bg)] transition-all ${
            canvasOpen ? "w-[440px]" : "flex-1"
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-white/70 backdrop-blur-sm">
            <button
              type="button"
              onClick={showHomeView}
              title="Back to Spot home · workflow stays alive"
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            >
              <Home size={14} strokeWidth={1.6} />
            </button>
            <SpotMark size={16} />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight">Spot</div>
              <div className="text-[10.5px] text-text-tertiary leading-tight truncate">
                Launching · {workflow.productName}
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
            />
          </div>
        </div>

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
  if (!isEmpty) {
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
          the welcome moment feels intimate and Claude-like. */}
      <div className="max-w-[780px] mx-auto w-full px-6 pt-14">
        {/* Resume banner — when a workflow is parked */}
        {workflow && viewHomeOverride && (
          <button
            type="button"
            onClick={resumeWorkflow}
            className="w-full mb-5 group bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 flex items-center gap-3 hover:border-[#D4B566] transition-colors text-left"
          >
            <SpotMark size={20} />
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-medium">
                Launch in progress
              </div>
              <div className="text-[13px] font-medium text-text-primary truncate">
                {workflow.productName} · paused on {workflow.step}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] text-[11.5px] font-medium group-hover:bg-black">
              Resume
              <ArrowRight size={11} strokeWidth={2} />
            </span>
          </button>
        )}

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-6">
          <SpotMark size={40} />
          <h1 className="text-[26px] leading-[1.2] font-semibold text-text-primary mt-4">
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

        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="inline-flex items-center h-8 px-3 rounded-full border border-border bg-white hover:border-border-hover text-[12.5px] text-text-secondary hover:text-text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Lower half: wider canvas. Active products row + Past chats +
          Spot's queue. Uses the full screen width so the welcome screen
          feels like a real workspace, not just a chat field. */}
      <div className="max-w-[1200px] mx-auto w-full px-6 pt-10 pb-20">
        <ActiveProductsRail />
        <div className="grid grid-cols-2 gap-3 mt-5">
          <PastChatsCard />
          <QueueCard />
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
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  scope: SpotScope;
  onChangeScope: (s: SpotScope) => void;
  scopeOpen: boolean;
  onScopeOpenChange: (b: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
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
        placeholder="Ask Spot anything…"
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
          className="inline-flex items-center gap-1.5 h-7 px-2 rounded-button text-text-secondary hover:text-text-primary hover:bg-surface-secondary text-[12px]"
          title="Attach files"
        >
          <Paperclip size={13} strokeWidth={1.6} />
          Attach
        </button>
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
  const top = PRODUCTS.slice(0, 3);

  return (
    <div>
      <div className="flex items-center mb-2.5">
        <span className="label-section">Launch a campaign for</span>
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
          const health = p.performance.health;
          const healthCls =
            health === "on-track"
              ? "pill-ok"
              : health === "needs-attention"
                ? "pill-warn"
                : "pill-err";
          const healthLabel =
            health === "on-track"
              ? "On track"
              : health === "needs-attention"
                ? "Needs attention"
                : "Underperforming";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => startLaunchFlow({ id: p.id, name: p.name })}
              className="group bg-white border border-border rounded-card p-4 text-left hover:border-text-tertiary hover:shadow-card-hover transition-all"
            >
              <div className="text-[10.5px] text-text-tertiary mb-1 truncate">{p.category}</div>
              <div className="text-[13.5px] font-medium text-text-primary leading-tight mb-2 line-clamp-2 min-h-[2.4em]">
                {p.name}
              </div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <span className={`pill ${healthCls}`} style={{ fontSize: 9.5 }}>
                  {healthLabel}
                </span>
                <span className="text-[11px] text-text-tertiary tabular">
                  {p.performance.activeCampaigns} live
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11.5px] text-text-primary font-medium group-hover:underline">
                Launch with Spot
                <ArrowRight size={11} strokeWidth={2} />
              </span>
            </button>
          );
        })}

        {/* New product slot — always present, always last */}
        <button
          type="button"
          onClick={startNewProductFlow}
          className="border-2 border-dashed border-border rounded-card p-4 text-left hover:border-text-primary hover:bg-white transition-colors group"
        >
          <div className="text-[10.5px] text-text-tertiary mb-1">Fresh start</div>
          <div className="text-[13.5px] font-medium text-text-primary leading-tight mb-2 min-h-[2.4em]">
            New product
          </div>
          <div className="text-[11px] text-text-secondary mb-3 leading-snug">
            I'll do deep research from a name or URL.
          </div>
          <span className="inline-flex items-center gap-1 text-[11.5px] text-text-primary font-medium group-hover:underline">
            <Plus size={11} strokeWidth={2} />
            Start a new product
          </span>
        </button>
      </div>
    </div>
  );
}

function PastChatsCard() {
  const workflow = useSpotStore((s) => s.workflow);
  const viewHomeOverride = useSpotStore((s) => s.viewHomeOverride);
  const resumeWorkflow = useSpotStore((s) => s.resumeWorkflow);
  // The current workflow, if any, shows as the topmost chat — it's the
  // most-recent "conversation" the user has with Spot.
  const activeWorkflowItem = workflow && viewHomeOverride;

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <PanelHeader
        icon={<MessageCircle size={12} strokeWidth={1.8} />}
        title="Past chats"
        action="See all"
      />
      <ul className="divide-y divide-border-subtle">
        {activeWorkflowItem && workflow && (
          <li>
            <button
              type="button"
              onClick={resumeWorkflow}
              className="w-full text-left px-3.5 py-3 hover-row flex items-start gap-2.5"
            >
              <SpotMark size={14} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="text-[13px] font-medium text-text-primary truncate">
                    Launching {workflow.productName}
                  </span>
                  <span className="pill pill-info" style={{ fontSize: 9.5, padding: "0 5px" }}>
                    In progress
                  </span>
                </div>
                <div className="text-[11.5px] text-text-tertiary mb-1">
                  Paused on {workflow.step} · just now
                </div>
                <div className="text-[12px] text-text-secondary truncate">
                  Resume to keep going from where we left off.
                </div>
              </div>
              <ChevronRight size={13} className="text-text-tertiary mt-0.5 flex-shrink-0" />
            </button>
          </li>
        )}
        {PAST_CHATS.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="w-full text-left px-3.5 py-3 hover-row flex items-start gap-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-medium text-text-primary truncate">{c.title}</span>
                </div>
                <div className="text-[11.5px] text-text-tertiary mb-1">
                  {c.scope} · {c.when}
                </div>
                <div className="text-[12px] text-text-secondary truncate">{c.preview}</div>
              </div>
              <ChevronRight size={13} className="text-text-tertiary mt-0.5 flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QueueCard() {
  const needsApproval = SPOT_QUEUE.filter((q) => q.status === "needs-approval");
  const otherCount = SPOT_QUEUE.length - needsApproval.length;
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <PanelHeader
        icon={<Clock size={12} strokeWidth={1.8} />}
        title="Spot's queue"
        action={`${needsApproval.length} need you`}
        actionTone="warn"
      />
      <ul className="divide-y divide-border-subtle">
        {SPOT_QUEUE.slice(0, 5).map((q) => (
          <li key={q.id}>
            <QueueRow item={q} />
          </li>
        ))}
      </ul>
      {otherCount > 5 && (
        <div className="px-3.5 py-2 text-[11px] text-text-tertiary text-center border-t border-border-subtle">
          + {otherCount} more in history
        </div>
      )}
    </div>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const Icon = STATUS_ICON[item.status];
  const isApprove = item.status === "needs-approval";
  return (
    <div className="px-3.5 py-3 hover-row flex items-start gap-2.5">
      <div
        className={`flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${STATUS_RING[item.status]}`}
      >
        <Icon size={11} strokeWidth={2} className={STATUS_ICON_COLOR[item.status]} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[13px] font-medium text-text-primary leading-tight">{item.title}</span>
          {item.agent && (
            <span className="pill" style={{ fontSize: 9.5, padding: "1px 5px" }}>
              {item.agent}
            </span>
          )}
        </div>
        <div className="text-[12px] text-text-secondary leading-snug line-clamp-2">{item.detail}</div>
        <div className="text-[11px] text-text-tertiary mt-1">{item.when}</div>
      </div>
      {isApprove && (
        <button
          type="button"
          className="apply-btn flex-shrink-0 mt-0.5"
          style={{ height: 24, padding: "0 8px", fontSize: 11 }}
        >
          Approve
        </button>
      )}
    </div>
  );
}

const STATUS_ICON: Record<QueueStatus, typeof Check> = {
  "needs-approval": Clock,
  running: Loader2,
  done: CheckCircle2,
};

const STATUS_RING: Record<QueueStatus, string> = {
  "needs-approval": "bg-[#FEF3C7]",
  running: "bg-[#EFF6FF]",
  done: "bg-[#F0FDF4]",
};

const STATUS_ICON_COLOR: Record<QueueStatus, string> = {
  "needs-approval": "text-[#92400E]",
  running: "text-[#1D4ED8] animate-spin",
  done: "text-[#15803D]",
};

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
