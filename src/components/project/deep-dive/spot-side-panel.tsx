"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X } from "lucide-react";
import type { ProjectDetail } from "@/lib/project-data";
import { useSpotStore } from "@/lib/spot/store";

/**
 * Right-side Spot chat for the deep-dive view. Compact textarea at the
 * bottom + suggestion chips at the top. Pushes prompts into the global
 * Spot store so the same conversation surfaces in the regular Spot panel
 * when the user exits deep dive.
 */
export function SpotSidePanel({
  project,
  section,
  autoFocus,
}: {
  project: ProjectDetail;
  section: "campaigns" | "personas" | "library" | "dashboard";
  autoFocus?: boolean;
}) {
  const askSpot = useSpotStore((s) => s.askSpot);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
  }, [autoFocus]);

  const send = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    askSpot(trimmed, {
      kind: "project",
      label: project.name.split(" · ")[0],
      target: project.id,
    });
    setSent((s) => [...s, trimmed]);
    setText("");
  };

  const suggestions = SUGGESTIONS_BY_SECTION[section];

  return (
    <div
      className="flex flex-col"
      style={{
        borderLeft: "1px solid var(--border)",
        background: "#FFF",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            color: "#FFF",
          }}
        >
          <Sparkles size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold leading-tight">
            Ask Spot anything
          </div>
          <div className="text-[10.5px] text-text-tertiary">
            Scoped to this project · {section}
          </div>
        </div>
      </div>

      {/* Suggestions + sent history */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
        {sent.length === 0 ? (
          <>
            <div className="text-[11px] uppercase tracking-[0.4px] text-text-tertiary font-semibold mb-2">
              Suggested
            </div>
            <div className="space-y-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="w-full text-left px-3 py-2 rounded-[8px] text-[12px] hover:bg-surface-page transition-colors"
                  style={{ border: "1px solid var(--border-subtle)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {sent.map((q, i) => (
              <SentQuestion key={i} q={q} onClose={() => {}} />
            ))}
            <div
              className="rounded-[8px] p-2.5 text-[11.5px] text-text-secondary leading-[1.5]"
              style={{
                background: "var(--spot-tint)",
                border: "1px solid var(--spot-stroke)",
              }}
            >
              Spot is preparing an answer — open the regular Spot panel to see
              the full response. (Deep-dive chat is a thin entry point; the
              conversation continues in the main dock when you exit.)
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className="px-4 py-3 flex items-end gap-2"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
          rows={2}
          placeholder="Ask anything about these campaigns…"
          className="flex-1 outline-none rounded-[8px] border border-border px-2.5 py-2 text-[12px] resize-none"
          style={{ minHeight: 36 }}
        />
        <button
          type="button"
          onClick={() => send(text)}
          disabled={!text.trim()}
          className="inline-flex items-center justify-center h-9 w-9 rounded-button"
          style={{
            background: text.trim()
              ? "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)"
              : "var(--bg-secondary)",
            color: text.trim() ? "#FFF" : "var(--text-tertiary)",
            opacity: text.trim() ? 1 : 0.6,
          }}
          title="Send"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

function SentQuestion({ q, onClose }: { q: string; onClose: () => void }) {
  return (
    <div
      className="rounded-[8px] p-2.5 flex items-start gap-2"
      style={{ background: "var(--bg-page)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="text-[11.5px] flex-1">{q}</div>
      <button
        type="button"
        onClick={onClose}
        className="text-text-tertiary hover:text-text-secondary"
      >
        <X size={10} />
      </button>
    </div>
  );
}

const SUGGESTIONS_BY_SECTION: Record<string, string[]> = {
  campaigns: [
    "Why is CPVL high on Lookalike 2%?",
    "Which ad set has the best Hook Rate?",
    "Where should I cut spend this week?",
    "Compare CPL vs CPVL by persona",
  ],
  personas: [
    "Which persona is converting best?",
    "Which angles haven't been tested yet?",
    "Show me each persona's winning creative",
    "What angles should I try next?",
  ],
  library: [
    "Which images haven't been used in creatives yet?",
    "What creatives are the top performers across personas?",
    "Group my winners by visual style",
    "Suggest new image kinds to upload",
  ],
  dashboard: [
    "How are we tracking against goal?",
    "What's the biggest risk this week?",
    "Forecast end-of-window verified leads",
    "What's the cheapest path to my goal?",
  ],
};
