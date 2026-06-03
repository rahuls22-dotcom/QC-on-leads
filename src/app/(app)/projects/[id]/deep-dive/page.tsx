"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Send } from "lucide-react";
import { getProject } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { ForbiddenState, useScopeGuard } from "@/components/project/shared/scope-guard";
import { DeepDiveTable } from "@/components/project/deep-dive-view";

export default function ProjectDeepDivePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const id = (params?.id || "").toString();
  const project = getProject(id);
  const focusSpot = search.get("focus") === "spot";

  // Hide the global sidebar/Spot dock while we're in deep-dive mode. We
  // do this by toggling a `data-deep-dive` attribute on the body that
  // hides those elements; restored on unmount.
  useEffect(() => {
    document.body.setAttribute("data-deep-dive", "true");
    return () => {
      document.body.removeAttribute("data-deep-dive");
    };
  }, []);

  const guard = useScopeGuard(
    project?.workspaceId,
    project?.name.split(" · ")[0] || "This project",
  );

  if (guard.access === "forbidden") {
    return (
      <ForbiddenState workspaceName={guard.workspaceName} resourceLabel={guard.resourceLabel} />
    );
  }
  if (guard.access === "wrong-scope") return null;

  if (!project) {
    return (
      <div className="card-base p-10 text-center max-w-md mx-auto mt-12">
        <div className="text-[14px] font-medium mb-1">Project not found</div>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="inline-flex items-center gap-1 mt-3 text-[12px] text-text-secondary"
        >
          <ArrowLeft size={13} /> Back to projects
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-3 border-b border-border flex-shrink-0"
        style={{ background: "#FFF" }}
      >
        <button
          type="button"
          onClick={() => router.push(`/projects/${id}`)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white text-[12px] text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={13} /> Back to {project.name.split(" · ")[0]}
        </button>
        <div className="flex-1 min-w-0 ml-2">
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold">
            Deep dive · Campaigns
          </div>
          <div className="text-[14px] font-semibold truncate">{project.name}</div>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/projects/${id}`)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-button border border-border bg-white text-[12px] text-text-secondary"
        >
          Exit
        </button>
      </div>

      {/* Main body: left = table, right = Spot panel */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "1fr 380px" }}>
        <div className="overflow-y-auto px-6 py-5">
          <DeepDiveTable project={project} />
        </div>
        <div
          className="overflow-y-auto border-l border-border flex flex-col"
          style={{ background: "#FFF" }}
        >
          <SpotPanel project={project} autoFocus={focusSpot} />
        </div>
      </div>

      {/* Body attribute CSS hook — hide global sidebar + Ask Spot dock when in deep dive */}
      <style jsx global>{`
        body[data-deep-dive="true"] aside,
        body[data-deep-dive="true"] [aria-label="Ask Spot"] {
          display: none !important;
        }
        body[data-deep-dive="true"] main {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
      `}</style>
    </div>
  );
}

// ─── Spot panel (lightweight chat-style sidebar) ────────────────────────

const SUGGESTION_CHIPS = [
  "Why is CPVL high on Lookalike 2%?",
  "Which ad has the best hook rate?",
  "Compare verified rate across campaigns",
  "Where should I reallocate ₹20K next week?",
];

type ChatTurn = {
  id: string;
  who: "you" | "spot";
  text: string;
};

function SpotPanel({
  project,
  autoFocus,
}: {
  project: ReturnType<typeof getProject>;
  autoFocus: boolean;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const projectShort = project?.name.split(" · ")[0] || "this project";
  const intro = useMemo(
    () =>
      `Hey — I've got every metric on every ad in ${projectShort} loaded. Ask me anything about CPL, hook rates, verif rates, or what to do next.`,
    [projectShort],
  );

  const send = (text: string) => {
    if (!text.trim()) return;
    const userTurn: ChatTurn = { id: `u-${Date.now()}`, who: "you", text };
    setTurns((prev) => [...prev, userTurn]);
    setInput("");
    // Mock Spot reply
    setTimeout(() => {
      setTurns((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          who: "spot",
          text:
            "Looking now — give me a sec. (Prototype: full analysis isn't wired up yet, but in the real build I'd cite specific ad sets and metrics here.)",
        },
      ]);
    }, 600);
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2 flex-shrink-0">
        <SpotMark size={18} />
        <div>
          <div className="text-[12.5px] font-semibold">Spot · deep dive</div>
          <div className="text-[10.5px] text-text-tertiary">
            Ask anything about these campaigns
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
        {turns.length === 0 ? (
          <>
            <div
              className="p-3 rounded-[10px] text-[12.5px] leading-[1.5]"
              style={{
                background: "var(--spot-tint)",
                border: "1px solid var(--spot-stroke)",
              }}
            >
              {intro}
            </div>
            <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold mt-4">
              Try
            </div>
            <div className="flex flex-col gap-1.5">
              {SUGGESTION_CHIPS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="text-left px-3 py-2 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover hover:bg-surface-page"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        ) : (
          turns.map((t) =>
            t.who === "spot" ? (
              <div
                key={t.id}
                className="p-3 rounded-[10px] text-[12.5px] leading-[1.5]"
                style={{
                  background: "var(--spot-tint)",
                  border: "1px solid var(--spot-stroke)",
                }}
              >
                {t.text}
              </div>
            ) : (
              <div key={t.id} className="flex justify-end">
                <div
                  className="p-2.5 rounded-[10px] text-[12.5px] max-w-[80%]"
                  style={{
                    background: "#1A1A1A",
                    color: "#FFF",
                    borderTopRightRadius: 4,
                  }}
                >
                  {t.text}
                </div>
              </div>
            ),
          )
        )}
      </div>

      <div className="px-3 py-3 border-t border-border-subtle flex-shrink-0">
        <div
          className="flex items-end gap-2 rounded-[10px] p-2"
          style={{ border: "1px solid var(--border)", background: "#FFF" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask Spot…"
            className="flex-1 outline-none text-[12.5px] resize-none bg-transparent"
            style={{ minHeight: 24, maxHeight: 120, padding: "2px 4px" }}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim()}
            className="inline-flex items-center justify-center h-7 w-7 rounded-button"
            style={{
              background: input.trim()
                ? "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)"
                : "var(--bg-secondary)",
              color: input.trim() ? "#FFF" : "var(--text-tertiary)",
              cursor: input.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Send size={12} />
          </button>
        </div>
        <div className="text-[10px] text-text-tertiary mt-1.5 px-1">
          <Sparkles size={9} className="inline mr-1" />
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </>
  );
}
