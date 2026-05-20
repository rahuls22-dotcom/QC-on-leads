"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Sparkles, ArrowRight, ChevronDown } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { getProject } from "@/lib/project-data";
import {
  CreativesCard,
  autoDraftCreatives,
  type CreativesState,
  type DraftedCreative,
  type PersonaInput,
} from "@/components/project/deploy-steps";

type Stage = "creatives" | "ready";

function SpotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 mb-3 fadeUp">
      <SpotMark size={20} style={{ flexShrink: 0, marginTop: 2 }} />
      <div
        className="flex-1 min-w-0 p-3"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
          borderRadius: 10,
        }}
      >
        <div className="text-[13.5px] leading-[1.55]">{children}</div>
      </div>
    </div>
  );
}

function DraftCard({
  label,
  children,
  footer,
}: {
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[10px] p-4 mb-3 fadeUp"
      style={{ background: "#FFFDF6", border: "1px solid #E8C97A" }}
    >
      <div className="uplabel mb-3 flex items-center gap-1.5" style={{ fontSize: 10 }}>
        <Sparkles size={11} style={{ color: "#9C6D00" }} />
        Spot&apos;s draft · {label}
      </div>
      {children}
      {footer && <div className="mt-4 pt-3 border-t border-[#E8C97A]">{footer}</div>}
    </div>
  );
}

export function CreativesFlow({
  projectId,
  initialAngleId,
  onClose,
  onComplete,
}: {
  projectId: string;
  /** Optional — when triggered from a specific angle row, biases the focus. */
  initialAngleId?: string;
  onClose: () => void;
  /** action = "view" → open project page · "campaign" → start media plan flow */
  onComplete: (id: string, action: "view" | "campaign") => void;
}) {
  const project = getProject(projectId);
  const showToast = useSpotStore((s) => s.showToast);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [stage, setStage] = useState<Stage>("creatives");

  const personaInputs: PersonaInput[] = useMemo(
    () =>
      project
        ? project.personas.map((p) => ({
            id: p.id,
            name: p.name,
            share: p.share,
            role: p.role,
            angles: p.angles.map((a) => ({ id: a.id, name: a.name })),
          }))
        : [],
    [project],
  );

  // Target list: every creative Spot wants to draft, flattened in reveal order.
  const orderedTargets = useMemo(() => {
    const seeded = autoDraftCreatives(personaInputs);
    const out: Array<{ personaId: string; personaName: string; creative: DraftedCreative }> = [];
    personaInputs.forEach((p) => {
      (seeded[p.id] || []).forEach((c) => {
        out.push({ personaId: p.id, personaName: p.name, creative: c });
      });
    });
    return out;
  }, [personaInputs]);

  const [creatives, setCreatives] = useState<CreativesState>({});
  const [revealedCount, setRevealedCount] = useState(0);
  const isRevealing = revealedCount < orderedTargets.length;
  const nextTarget = orderedTargets[revealedCount];

  // Progressively reveal creatives one at a time: ~800ms before the first,
  // then 3000ms between each. Spot is "drafting" while the gap is open.
  useEffect(() => {
    if (!isRevealing || stage !== "creatives") return;
    const delay = revealedCount === 0 ? 800 : 3000;
    const t = setTimeout(() => {
      const target = orderedTargets[revealedCount];
      if (!target) return;
      setCreatives((prev) => ({
        ...prev,
        [target.personaId]: [...(prev[target.personaId] || []), target.creative],
      }));
      setRevealedCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [revealedCount, orderedTargets, isRevealing, stage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stage, revealedCount]);

  if (!mounted || typeof document === "undefined") return null;
  if (!project) return null;

  const creativeCount = Object.values(creatives).reduce((s, arr) => s + arr.length, 0);

  const focusedAngleName = initialAngleId
    ? project.personas
        .flatMap((p) => p.angles)
        .find((a) => a.id === initialAngleId)?.name
    : null;

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "5vh 16px",
          pointerEvents: "none",
        }}
      >
        <div
          className="fadeUp"
          style={{
            width: "min(1100px, 100%)",
            maxHeight: "92vh",
            background: "#FFF",
            borderRadius: 14,
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border flex-shrink-0">
            <SpotMark size={20} />
            <div className="flex-1 min-w-0">
              <div className="uplabel" style={{ fontSize: 10 }}>
                Spot · creative angles for {project.name.split(" · ")[0]}
              </div>
              <div className="text-[15px] font-semibold truncate">
                {stage === "creatives" ? "Draft creatives per persona" : "Creative angles saved"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center h-8 w-8 rounded-button hover:bg-surface-secondary flex-shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 scroll"
            style={{ background: "var(--chat-bg)" }}
          >
            {stage === "creatives" && (
              <>
                <SpotBubble>
                  {focusedAngleName ? (
                    <>
                      Drafting fresh creatives — focused on the{" "}
                      <strong>{focusedAngleName}</strong> angle. You can also tweak the others
                      below. These live with your project — every campaign you launch pulls from
                      this library.
                    </>
                  ) : isRevealing ? (
                    <>
                      Drafting <strong>{orderedTargets.length} creatives</strong> across{" "}
                      {personaInputs.length} personas — one at a time so you can watch each angle
                      take shape. {nextTarget && (
                        <>
                          Up next: <strong>{nextTarget.creative.angleName}</strong> for{" "}
                          <strong>{nextTarget.personaName}</strong>.
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Drafted <strong>{creativeCount} creatives</strong> across{" "}
                      {personaInputs.length} personas. Swap angles, refine the copy, upload your
                      own image or video, or add more. These live with your project — every
                      campaign you launch pulls from this library.
                    </>
                  )}
                </SpotBubble>

                <GenerationLog
                  orderedTargets={orderedTargets}
                  currentIndex={revealedCount}
                  isRevealing={isRevealing}
                />

                <DraftCard
                  label="Creatives"
                  footer={
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isRevealing}
                        onClick={() => {
                          showToast(`Saved ${creativeCount} creatives to your project`);
                          setStage("ready");
                        }}
                        className="apply-btn"
                        style={{
                          opacity: isRevealing ? 0.5 : 1,
                          cursor: isRevealing ? "not-allowed" : "pointer",
                        }}
                      >
                        <Check size={11} />{" "}
                        {isRevealing
                          ? `Drafting ${revealedCount} of ${orderedTargets.length}…`
                          : "Save creatives →"}
                      </button>
                    </div>
                  }
                >
                  <CreativesCard
                    personas={personaInputs}
                    state={creatives}
                    onChange={setCreatives}
                  />
                </DraftCard>
              </>
            )}

            {stage === "ready" && (
              <>
                <SpotBubble>
                  <strong>Creative angles saved.</strong> {creativeCount} creatives across{" "}
                  {project.personas.length} personas — ready to test. Want to build the media plan
                  now, or come back to it later?
                </SpotBubble>
                <div className="flex justify-end items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      showToast("Opening project page");
                      onComplete(projectId, "view");
                    }}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12.5px] text-text-secondary hover:text-text-primary"
                  >
                    Open project page <ArrowRight size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      showToast("Let's build the media plan");
                      onComplete(projectId, "campaign");
                    }}
                    className="apply-btn"
                    style={{
                      height: 36,
                      fontSize: 12.5,
                      padding: "0 14px",
                      background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                    }}
                  >
                    <Sparkles size={12} /> Build media plan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Hierarchical generation log ───────────────────────────────────────

type Target = {
  personaId: string;
  personaName: string;
  creative: DraftedCreative;
};

function GenerationLog({
  orderedTargets,
  currentIndex,
  isRevealing,
}: {
  orderedTargets: Target[];
  currentIndex: number;
  isRevealing: boolean;
}) {
  // Group by persona, preserving order
  const personaGroups = useMemo(() => {
    const groups: Array<{ personaId: string; personaName: string; targets: Array<{ globalIndex: number; target: Target }> }> = [];
    orderedTargets.forEach((t, globalIndex) => {
      let group = groups.find((g) => g.personaId === t.personaId);
      if (!group) {
        group = { personaId: t.personaId, personaName: t.personaName, targets: [] };
        groups.push(group);
      }
      group.targets.push({ globalIndex, target: t });
    });
    return groups;
  }, [orderedTargets]);

  // When all done, allow collapsing into a summary
  const [collapsed, setCollapsed] = useState(false);
  const allDone = !isRevealing;

  const totalDone = Math.min(currentIndex, orderedTargets.length);

  if (allDone && collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center gap-2 px-3 py-2 mb-3 rounded-[10px] hover:bg-surface-page"
        style={{
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
        }}
      >
        <Check size={14} style={{ color: "var(--ok-fg)" }} />
        <span className="text-[12px] font-medium" style={{ color: "var(--ok-fg)" }}>
          Drafted {orderedTargets.length} creatives
        </span>
        <span
          className="ml-auto text-[10.5px] text-text-tertiary inline-flex items-center gap-1"
        >
          Show timeline <ChevronDown size={11} />
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-[10px] mb-3 fadeUp"
      style={{
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E8C97A]/40">
        <SpotMark size={14} />
        <span className="text-[12.5px] font-semibold">
          {allDone
            ? `Drafted ${orderedTargets.length} creatives`
            : "Drafting creative angles…"}
        </span>
        {!allDone && (
          <span className="text-[11px] text-text-tertiary ml-1">
            {totalDone} of {orderedTargets.length}
          </span>
        )}
        {!allDone && (
          <span className="flex gap-1 ml-auto">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="spot-pulse"
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "var(--text-2)",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </span>
        )}
        {allDone && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="ml-auto text-[10.5px] text-text-tertiary hover:text-text-secondary inline-flex items-center gap-1"
          >
            Hide
          </button>
        )}
      </div>

      <div className="px-3 py-2.5 space-y-2">
        {personaGroups.map((group) => {
          // Persona-level status: derive from child statuses
          const childStatuses = group.targets.map((t) => {
            if (t.globalIndex < currentIndex) return "done" as const;
            if (t.globalIndex === currentIndex && isRevealing) return "generating" as const;
            return "queued" as const;
          });
          const personaState = childStatuses.every((s) => s === "done")
            ? "done"
            : childStatuses.some((s) => s === "generating")
            ? "generating"
            : childStatuses.some((s) => s === "done")
            ? "generating"
            : "queued";

          return (
            <div key={group.personaId}>
              <div className="flex items-center gap-2 mb-1">
                <StatusDot state={personaState} size={12} />
                <span
                  className="text-[12.5px] font-semibold"
                  style={{
                    color:
                      personaState === "queued"
                        ? "var(--text-tertiary)"
                        : "var(--text-1)",
                  }}
                >
                  {group.personaName}
                </span>
                {personaState === "queued" && (
                  <span className="text-[10.5px] text-text-tertiary">queued</span>
                )}
              </div>
              <div className="pl-5 space-y-1">
                {group.targets.map(({ globalIndex, target }, i) => {
                  const state = childStatuses[i];
                  return (
                    <div
                      key={target.creative.id}
                      className="flex items-center gap-2 text-[11.5px] fadeUp"
                    >
                      <StatusDot state={state} size={10} />
                      <span
                        style={{
                          color:
                            state === "queued"
                              ? "var(--text-tertiary)"
                              : state === "generating"
                              ? "var(--text-1)"
                              : "var(--text-2)",
                          fontWeight: state === "generating" ? 600 : 400,
                        }}
                      >
                        {target.creative.angleName} · {target.creative.format}
                      </span>
                      <span className="ml-auto text-[10.5px] text-text-tertiary">
                        {state === "done"
                          ? `done in ${(2.6 + ((globalIndex * 0.4) % 1.2)).toFixed(1)}s`
                          : state === "generating"
                          ? "generating…"
                          : "queued"}
                      </span>
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

function StatusDot({
  state,
  size,
}: {
  state: "queued" | "generating" | "done";
  size: number;
}) {
  if (state === "done") {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: "50%",
          background: "#15803D",
          color: "#FFF",
        }}
      >
        <Check size={Math.round(size * 0.7)} strokeWidth={3} />
      </span>
    );
  }
  if (state === "generating") {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: "50%",
          border: "1.5px solid #C026D3",
          borderTopColor: "transparent",
          animation: "gen-spin 0.9s linear infinite",
        }}
      >
        <style jsx>{`
          @keyframes gen-spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </span>
    );
  }
  return (
    <span
      className="inline-block flex-shrink-0"
      style={{
        width: size + 4,
        height: size + 4,
        borderRadius: "50%",
        border: "1.5px solid var(--border)",
        background: "transparent",
      }}
    />
  );
}
