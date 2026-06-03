"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles, X, Loader2, ArrowRight } from "lucide-react";
import type { ProjectDetail } from "@/lib/project-data";
import {
  deriveSetupState,
  setupIsComplete,
  planAutopilot,
  type AutopilotStep,
  type SetupStepKey,
  type SetupStepState,
} from "./setup-autopilot";
import { useSpotStore } from "@/lib/spot/store";

/**
 * Persistent setup checklist rendered between the goal panel and the
 * project-page tabs. Teaches the post-creation sequence:
 *
 *   1. Build creatives for each persona (Personas tab)
 *   2. Build & publish a lead form (Library · Forms)
 *   3. Build a campaign plan (Campaigns tab)
 *
 * Each step shows its completion status + a quick "Take me there" jump
 * to the relevant tab. A prominent "Let Spot take charge" button at the
 * top runs all three steps end-to-end via the autopilot.
 *
 * The whole strip auto-hides once every step is done — no manual dismiss
 * needed; the checklist's job is the setup window only.
 */
export function SetupChecklist({
  project,
  onGoTo,
}: {
  project: ProjectDetail;
  /** Routes the user to a top-level tab (with optional sub-tab). */
  onGoTo: (tab: "personas" | "library" | "campaigns", sub?: "forms") => void;
}) {
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const states = useMemo(() => deriveSetupState(project), [project]);
  const complete = setupIsComplete(states);
  if (complete) return null;

  // No personas yet → the checklist can't be acted on. Show a softer
  // "add a persona first" hint instead of the full checklist so the
  // CTA still makes sense.
  if (project.personas.length === 0) {
    return (
      <div
        className="rounded-[10px] mb-3 px-3.5 py-2.5 flex items-center gap-3"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
        }}
      >
        <SpotMarkBadge />
        <div className="flex-1 text-[11.5px] leading-[1.5]">
          <strong className="text-text-primary">Add a persona first.</strong>{" "}
          Once you have at least one persona, Spot can draft every creative,
          form, and campaign for you in one shot.
        </div>
        <button
          type="button"
          onClick={() => onGoTo("personas")}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] font-medium flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            color: "#FFF",
            border: "1px solid transparent",
          }}
        >
          Go to Personas →
        </button>
      </div>
    );
  }

  const doneCount = states.filter((s) => s.done).length;

  return (
    <>
      <div
        className="rounded-[12px] mb-3 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #FBF7FF 0%, #FFFDF6 60%, #FFFFFF 100%)",
          border: "1px solid #DCC8FF",
        }}
      >
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <SpotMarkBadge />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-semibold leading-tight">
              Setup checklist · {doneCount} of {states.length} done
            </div>
            <div className="text-[11px] text-text-tertiary mt-0.5">
              Three steps to deploy-ready · or let Spot do it all in one
              shot.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAutopilotOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12px] font-semibold flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
              border: "1px solid transparent",
              boxShadow: "0 4px 12px rgba(124,58,237,0.22)",
            }}
          >
            <Sparkles size={12} /> Let Spot take charge
          </button>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            borderTop: "1px solid rgba(220, 200, 255, 0.6)",
          }}
        >
          {states.map((s, i) => (
            <SetupStepCell
              key={s.key}
              step={s}
              index={i + 1}
              isLast={i === states.length - 1}
              onGo={() => navigateForStep(s.key, onGoTo)}
            />
          ))}
        </div>
      </div>

      {autopilotOpen && (
        <AutopilotModal
          project={project}
          onClose={() => setAutopilotOpen(false)}
        />
      )}
    </>
  );
}

function navigateForStep(
  key: SetupStepKey,
  onGoTo: (tab: "personas" | "library" | "campaigns", sub?: "forms") => void,
): void {
  if (key === "creatives") onGoTo("personas");
  else if (key === "form") onGoTo("library", "forms");
  else if (key === "campaigns") onGoTo("campaigns");
}

function SetupStepCell({
  step,
  index,
  isLast,
  onGo,
}: {
  step: SetupStepState;
  index: number;
  isLast: boolean;
  onGo: () => void;
}) {
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5"
      style={{
        borderRight: isLast ? "none" : "1px solid rgba(220, 200, 255, 0.6)",
      }}
    >
      <StepStatusCircle done={step.done} index={index} />
      <div className="flex-1 min-w-0">
        <div
          className="text-[11.5px] font-semibold leading-tight"
          style={{
            color: step.done ? "var(--text-2)" : "var(--text-1)",
            textDecoration: step.done ? "line-through" : "none",
          }}
        >
          {step.label}
        </div>
        <div className="text-[10.5px] text-text-tertiary mt-0.5 leading-[1.45]">
          {step.progress ?? step.description}
        </div>
        {!step.done && (
          <button
            type="button"
            onClick={onGo}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-button border border-border bg-white text-[10.5px] mt-1.5 text-text-secondary hover:text-text-primary"
          >
            Take me there <ArrowRight size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

function StepStatusCircle({ done, index }: { done: boolean; index: number }) {
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: done ? "var(--ok-fg, #10B981)" : "#FFF",
        color: done ? "#FFF" : "var(--text-2)",
        border: done ? "1px solid var(--ok-fg, #10B981)" : "1px solid var(--border)",
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      {done ? <Check size={11} strokeWidth={3.5} /> : index}
    </span>
  );
}

function SpotMarkBadge() {
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
        color: "#FFF",
      }}
    >
      <Sparkles size={13} />
    </span>
  );
}

// ─── Autopilot modal ───────────────────────────────────────────────────

type StreamState = { stage: "preview" | "running" | "done"; cursor: number };

function AutopilotModal({
  project,
  onClose,
}: {
  project: ProjectDetail;
  onClose: () => void;
}) {
  // Plan once on mount. We pin the steps to this initial plan even as
  // the project mutates underneath us so the stream stays consistent
  // (and we don't re-plan and skip steps mid-flight).
  const plan = useMemo(() => planAutopilot(project), [project]);
  const [state, setState] = useState<StreamState>({
    stage: "preview",
    cursor: 0,
  });
  const showToast = useSpotStore((s) => s.showToast);

  // Streaming runner — advances one step per tick until all are done.
  useEffect(() => {
    if (state.stage !== "running") return;
    if (state.cursor >= plan.steps.length) {
      setState({ stage: "done", cursor: state.cursor });
      const counts: string[] = [];
      if (plan.summary.angleCount > 0)
        counts.push(`${plan.summary.angleCount} angle${plan.summary.angleCount === 1 ? "" : "s"}`);
      if (plan.summary.formCount > 0) counts.push("1 form");
      if (plan.summary.campaignCount > 0)
        counts.push(`${plan.summary.campaignCount} campaign${plan.summary.campaignCount === 1 ? "" : "s"}`);
      showToast(
        counts.length > 0
          ? `Spot drafted ${counts.join(" · ")} — review before deploying`
          : "Spot ran — nothing left to draft",
      );
      // Brief pause on the done state so the user reads it, then close.
      window.setTimeout(onClose, 900);
      return;
    }
    const step = plan.steps[state.cursor];
    const t = window.setTimeout(() => {
      step.run();
      setState((cur) => ({ stage: "running", cursor: cur.cursor + 1 }));
    }, 650);
    return () => window.clearTimeout(t);
  }, [state, plan, onClose, showToast]);

  const start = () => setState({ stage: "running", cursor: 0 });
  const noWork = plan.steps.length === 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        background: "rgba(10,10,10,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5vh 16px",
      }}
      onClick={(e) => {
        // Only allow scrim-dismiss in the preview/done stage — never
        // mid-run, since the mutations are landing live.
        if (e.target === e.currentTarget && state.stage !== "running") {
          onClose();
        }
      }}
    >
      <div
        className="card-base fadeUp"
        style={{
          width: "min(560px, 100%)",
          maxHeight: "84vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
            }}
          >
            <Sparkles size={14} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold leading-tight">
              {state.stage === "done" ? "All set" : "Spot will draft this in one shot"}
            </div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              {noWork
                ? "Nothing left to draft — your project is already deploy-ready."
                : state.stage === "running"
                  ? `Step ${Math.min(state.cursor + 1, plan.steps.length)} of ${plan.steps.length}…`
                  : state.stage === "done"
                    ? "You can review and edit anything Spot drafted before deploying."
                    : `${plan.steps.length} step${plan.steps.length === 1 ? "" : "s"} · creatives + form + campaign plan`}
            </div>
          </div>
          {state.stage !== "running" && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-secondary"
              aria-label="Close"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-2">
          {plan.steps.length === 0 ? (
            <div className="text-[12px] text-text-secondary leading-[1.55]">
              Nothing left for the autopilot to do. Every step in the
              checklist is already complete.
            </div>
          ) : (
            plan.steps.map((step, i) => (
              <StreamLine
                key={step.id}
                step={step}
                stage={
                  i < state.cursor
                    ? "done"
                    : i === state.cursor && state.stage === "running"
                      ? "active"
                      : state.stage === "done"
                        ? "done"
                        : "queued"
                }
              />
            ))
          )}
        </div>

        {/* Footer */}
        {state.stage === "preview" && !noWork && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3 flex-shrink-0"
            style={{
              background: "var(--bg-page)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
            >
              I&apos;ll do it myself
            </button>
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12.5px] font-semibold"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                color: "#FFF",
                border: "1px solid transparent",
              }}
            >
              <Sparkles size={12} /> Let Spot draft it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StreamLine({
  step,
  stage,
}: {
  step: AutopilotStep;
  stage: "queued" | "active" | "done";
}) {
  return (
    <div className="flex items-start gap-2.5 px-2.5 py-2 rounded-[8px]"
      style={{
        background: stage === "active" ? "var(--spot-tint)" : "transparent",
        border:
          stage === "active"
            ? "1px solid var(--spot-stroke)"
            : "1px solid transparent",
        transition: "background 160ms",
      }}
    >
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ width: 18, height: 18, marginTop: 1 }}
      >
        {stage === "done" && (
          <Check size={13} strokeWidth={3} style={{ color: "var(--ok-fg)" }} />
        )}
        {stage === "active" && (
          <Loader2 size={13} className="animate-spin" style={{ color: "#7C3AED" }} />
        )}
        {stage === "queued" && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--border)",
              display: "inline-block",
            }}
          />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="text-[12px] font-medium leading-tight"
          style={{
            color: stage === "queued" ? "var(--text-tertiary)" : "var(--text-1)",
          }}
        >
          {step.label}
        </div>
        {step.sub && (
          <div className="text-[10.5px] text-text-tertiary mt-0.5">
            {step.sub}
          </div>
        )}
      </div>
    </div>
  );
}
