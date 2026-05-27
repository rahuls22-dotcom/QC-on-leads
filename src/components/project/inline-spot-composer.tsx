"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, X, Check, Loader2 } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";

/**
 * Inline Spot composer — sits in-context on the project page (no portal,
 * no scrim). The user types an optional prompt and clicks either:
 *   · "Just draft N for me" — Spot generates on the canonical defaults
 *   · "Draft from my prompt" — Spot uses the prompt verbatim
 *
 * Once kicked off, the composer hands rendering to a streaming log that
 * shows hierarchical progress (e.g., Persona → Angle → done) and calls
 * `onItemComplete` as each item flips. When everything is done, `onDone`
 * fires so the parent can collapse the panel.
 */
export type StreamItem = {
  /** Stable id for keying. */
  id: string;
  /** Label shown next to the bullet. */
  label: string;
  /** Optional indent level (0 = top-line, 1 = nested under previous level-0). */
  indent?: number;
  /** Optional sub-line shown below the label. */
  sub?: string;
};

export type StreamingLogProps = {
  items: StreamItem[];
  /** Ms between flipping the next item from "generating" → "done". */
  cadenceMs?: number;
  /** Called every time an item completes (index, item). */
  onItemComplete?: (i: number, item: StreamItem) => void;
  /** Called once all items are done. */
  onDone?: () => void;
};

export function StreamingLog({
  items,
  cadenceMs = 1100,
  onItemComplete,
  onDone,
}: StreamingLogProps) {
  const [completed, setCompleted] = useState(0);
  const callbackRef = useRef({ onItemComplete, onDone });

  // Keep latest callbacks without resetting the interval each render.
  useEffect(() => {
    callbackRef.current = { onItemComplete, onDone };
  });

  useEffect(() => {
    if (completed >= items.length) {
      if (items.length > 0) callbackRef.current.onDone?.();
      return;
    }
    const t = setTimeout(() => {
      const item = items[completed];
      callbackRef.current.onItemComplete?.(completed, item);
      setCompleted((c) => c + 1);
    }, completed === 0 ? Math.min(600, cadenceMs) : cadenceMs);
    return () => clearTimeout(t);
  }, [completed, items, cadenceMs]);

  if (items.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => {
        const state: "done" | "generating" | "queued" =
          i < completed ? "done" : i === completed ? "generating" : "queued";
        return (
          <li
            key={item.id}
            className="flex items-start gap-2 text-[12px] leading-[1.5]"
            style={{ paddingLeft: (item.indent ?? 0) * 18 }}
          >
            <span className="flex-shrink-0 mt-0.5" style={{ width: 14, height: 14 }}>
              {state === "done" && (
                <Check size={12} style={{ color: "var(--ok-fg)" }} />
              )}
              {state === "generating" && (
                <Loader2
                  size={12}
                  className="animate-spin"
                  style={{ color: "#7C3AED" }}
                />
              )}
              {state === "queued" && (
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "1.5px solid var(--border)",
                    margin: 2,
                  }}
                />
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span
                className={state === "queued" ? "text-text-tertiary" : "text-text-primary"}
                style={{ fontWeight: state === "generating" ? 600 : 500 }}
              >
                {item.label}
              </span>
              {item.sub && (
                <span className="text-text-tertiary ml-1">· {item.sub}</span>
              )}
            </span>
            {state === "generating" && (
              <span className="text-[10.5px] text-text-tertiary italic">
                generating…
              </span>
            )}
            {state === "queued" && (
              <span className="text-[10.5px] text-text-tertiary">queued</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type ComposerProps = {
  /** Banner copy shown at the top of the composer. */
  prompt: string;
  /** Placeholder for the textarea. */
  placeholder: string;
  /** Label for the primary "just do it" button. */
  primaryLabel: string;
  /** Optional label for the secondary "use my prompt" button. */
  secondaryLabel?: string;
  /** Called when the user kicks off generation. */
  onStart: (userPrompt: string) => void;
  /** Called when the user cancels (X). */
  onCancel: () => void;
  /** If true, render in a busy state (textarea + buttons disabled). */
  busy?: boolean;
  /** Streaming-log items, when generation is in progress. */
  streamItems?: StreamItem[];
  /** Header for the streaming log. */
  streamHeader?: string;
  /** Forwarded streaming callbacks. */
  onItemComplete?: StreamingLogProps["onItemComplete"];
  onDone?: StreamingLogProps["onDone"];
};

export function InlineSpotComposer({
  prompt,
  placeholder,
  primaryLabel,
  secondaryLabel,
  onStart,
  onCancel,
  busy,
  streamItems,
  streamHeader,
  onItemComplete,
  onDone,
}: ComposerProps) {
  const [text, setText] = useState("");
  const trimmed = useMemo(() => text.trim(), [text]);

  return (
    <div
      className="rounded-[12px] fadeUp"
      style={{
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
        padding: 14,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 mb-3">
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            color: "#FFF",
            boxShadow: "0 4px 10px rgba(124,58,237,0.22)",
          }}
        >
          <SpotMark size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold leading-tight mb-0.5">
            {prompt}
          </div>
          <div className="text-[10.5px] text-text-tertiary">
            Spot drafts in seconds · edit anything afterwards.
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center h-6 w-6 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-white"
          title="Cancel"
        >
          <X size={12} />
        </button>
      </div>

      {/* Streaming view OR composer view */}
      {streamItems && streamItems.length > 0 ? (
        <div
          className="rounded-[8px] p-3 bg-white"
          style={{ border: "1px solid var(--border-subtle)" }}
        >
          {streamHeader && (
            <div className="text-[11.5px] font-semibold mb-2.5 flex items-center gap-2">
              <Sparkles size={11} style={{ color: "#7C3AED" }} />
              {streamHeader}
            </div>
          )}
          <StreamingLog
            items={streamItems}
            onItemComplete={onItemComplete}
            onDone={onDone}
          />
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={2}
            disabled={busy}
            className="w-full outline-none rounded-[8px] px-3 py-2 text-[12.5px] resize-y"
            style={{
              border: "1px solid var(--border)",
              background: "#FFF",
              opacity: busy ? 0.6 : 1,
            }}
          />
          <div className="flex items-center justify-end gap-2 mt-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary"
              disabled={busy}
            >
              Cancel
            </button>
            {secondaryLabel && (
              <button
                type="button"
                onClick={() => onStart("")}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] font-medium hover:border-border-hover"
                disabled={busy}
              >
                <Sparkles size={11} /> {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => onStart(trimmed || "")}
              className="apply-btn"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                height: 28,
                fontSize: 12,
                padding: "0 12px",
              }}
              disabled={busy || (!secondaryLabel && trimmed.length === 0)}
            >
              <Sparkles size={11} /> {primaryLabel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
