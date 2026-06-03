"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Sparkles, ArrowRight } from "lucide-react";
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

  // Seed all creatives immediately with loading: true. Each tile flips to
  // its final state after ~1.5s, one at a time, so the user sees the
  // generation rolling across the grid.
  const [creatives, setCreatives] = useState<CreativesState>(() => {
    const out: CreativesState = {};
    orderedTargets.forEach(({ personaId, creative }) => {
      out[personaId] = out[personaId] || [];
      out[personaId].push({ ...creative, loading: true });
    });
    return out;
  });
  const [revealedCount, setRevealedCount] = useState(0);
  const isRevealing = revealedCount < orderedTargets.length;

  // Flip one loading tile to done every ~1.5s.
  useEffect(() => {
    if (!isRevealing || stage !== "creatives") return;
    const delay = revealedCount === 0 ? 600 : 1500;
    const t = setTimeout(() => {
      const target = orderedTargets[revealedCount];
      if (!target) return;
      setCreatives((prev) => {
        const list = prev[target.personaId] || [];
        const next = list.map((c) =>
          c.id === target.creative.id ? { ...c, loading: false } : c,
        );
        return { ...prev, [target.personaId]: next };
      });
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
          alignItems: "center",
          justifyContent: "center",
          padding: "4vh 16px",
          pointerEvents: "none",
          overflowY: "auto",
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
                      <strong>{focusedAngleName}</strong> angle. These live with your project —
                      every campaign you launch pulls from this library.
                    </>
                  ) : isRevealing ? (
                    <>
                      Drafting <strong>{orderedTargets.length} creatives</strong> across{" "}
                      {personaInputs.length} personas — watch each tile populate as it&apos;s ready.
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

