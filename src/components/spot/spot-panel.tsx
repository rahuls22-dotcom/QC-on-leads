"use client";

import { useEffect, useRef, useState } from "react";
import { X, History, Plus, ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "./spot-mark";
import { MessageBubble, TypingDots } from "./spot-message";
import { SpotComposer } from "./spot-composer";
import { generateReply, suggestionsFor } from "@/lib/spot/replies";
import type { SpotMessage } from "@/lib/spot/types";

export function SpotPanel() {
  const open = useSpotStore((s) => s.open);
  const maximized = useSpotStore((s) => s.maximized);
  const scope = useSpotStore((s) => s.scope);
  const pendingQuery = useSpotStore((s) => s.pendingQuery);
  const thread = useSpotStore((s) => s.thread);
  const setThread = useSpotStore((s) => s.setThread);
  const closePanel = useSpotStore((s) => s.closePanel);
  const toggleMaximize = useSpotStore((s) => s.toggleMaximize);

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // When a new query comes in via askSpot(), seed the thread.
  useEffect(() => {
    if (!pendingQuery) return;
    const { q } = pendingQuery;
    if (!q.trim()) {
      // Empty query — open a fresh chat, clear thread.
      setThread([]);
      return;
    }
    setThread([{ role: "user", text: q }]);
    setPending(true);
    const t = setTimeout(() => {
      setThread((prev) => [...prev, generateReply(q, scope)]);
      setPending(false);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery?.ts]);

  // Autoscroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread.length, pending]);

  const send = (text?: string) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft("");
    const next: SpotMessage = { role: "user", text: t };
    setThread((prev) => [...prev, next]);
    setPending(true);
    setTimeout(() => {
      setThread((prev) => [...prev, generateReply(t, scope)]);
      setPending(false);
    }, 650);
  };

  const suggestions = suggestionsFor(scope);

  // When maximized, the panel covers everything to the right of the
  // sidebar. We pin `left` to the sidebar width and let `right: 0`
  // stretch the panel. Width transitions are replaced by a left+width
  // transition for a smooth expand.
  const SIDEBAR_W = 240;
  const panelStyle: React.CSSProperties = open
    ? maximized
      ? {
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          left: SIDEBAR_W,
          width: "auto",
          background: "var(--chat-bg)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 60,
          transition: "left 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }
      : {
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          background: "var(--chat-bg)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 60,
          transition: "width 220ms cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }
    : {
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        background: "var(--chat-bg)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 60,
        transition: "width 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "hidden",
      };

  // Comfortable reading column when the panel is wide.
  const innerMaxWidth = maximized ? 780 : "100%";

  return (
    <aside style={panelStyle} className="panel-shadow">
      {open && (
        <>
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <SpotMark size={18} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight">Spot</div>
              <div className="text-[11px] text-text-tertiary leading-tight">
                Answer-only · scoped to {scope.label}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setThread([])}
              title="New chat"
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              title="History"
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary"
            >
              <History size={14} />
            </button>
            <button
              type="button"
              onClick={toggleMaximize}
              title={maximized ? "Restore" : "Maximize"}
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary"
            >
              {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              type="button"
              onClick={closePanel}
              title="Close"
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-secondary hover:bg-surface-secondary"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scope strip */}
          <div
            className="px-3.5 py-2 border-b border-border-subtle flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.5)" }}
          >
            <span className="uplabel" style={{ fontSize: 10 }}>
              Scope
            </span>
            <span
              className="pill"
              style={{
                background: "#1A1A1A",
                color: "#FFF",
                fontSize: 11,
              }}
            >
              {scope.label}
            </span>
          </div>

          {/* Messages / Empty state */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll" style={{ padding: maximized ? "24px 32px 4px" : "14px 14px 4px" }}>
            <div style={{ maxWidth: innerMaxWidth, margin: "0 auto" }}>
              {thread.length === 0 ? (
                <div className="flex flex-col items-center text-center pt-6 pb-2 px-2">
                  <SpotMark size={32} />
                  <div className="text-[16px] font-semibold mt-3">What&apos;s on your mind?</div>
                  <div className="text-[12.5px] text-text-secondary mt-1">
                    I&apos;m scoped to {scope.label} · ask me anything about it.
                  </div>
                  <div className="uplabel mt-6 mb-2 self-start" style={{ fontSize: 10 }}>
                    Try
                  </div>
                  <div className="w-full space-y-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="card-base bg-white hover-row w-full text-left flex items-center gap-2.5 p-2.5"
                      >
                        <SpotMark size={14} />
                        <span className="flex-1 text-[12.5px]">{s}</span>
                        <ArrowRight size={12} className="text-text-tertiary" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {thread.map((m, i) => (
                    <MessageBubble
                      key={i}
                      message={m}
                      animate={i === thread.length - 1}
                    />
                  ))}
                  {pending && <TypingDots />}
                </>
              )}
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-border-subtle" style={{ padding: maximized ? "12px 32px 24px" : "8px 14px 14px" }}>
            <div style={{ maxWidth: innerMaxWidth, margin: "0 auto" }}>
              <SpotComposer
                value={draft}
                onChange={setDraft}
                onSend={() => send()}
                placeholder={`Ask Spot about ${scope.label}…`}
              />
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
