"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Sparkles, RotateCcw } from "lucide-react";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "./spot-mark";
import { GUIDED_CONFIGS, type FieldDef, type StepDef } from "./guided-flow-configs";
import { getProject } from "@/lib/project-data";

type Draft = Record<string, string>;

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

function AcceptedBubble({ label, summary }: { label: string; summary: string }) {
  return (
    <div className="flex justify-end mb-3">
      <div
        className="flex items-start gap-2 p-2.5 max-w-[80%]"
        style={{
          background: "linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 70%)",
          border: "1px solid #BBF7D0",
          borderRadius: 10,
          borderTopRightRadius: 4,
        }}
      >
        <Check size={14} style={{ color: "var(--ok-fg)", flexShrink: 0, marginTop: 1 }} />
        <div className="min-w-0">
          <div className="uplabel" style={{ fontSize: 10, color: "var(--ok-fg)" }}>
            {label} · accepted
          </div>
          <div className="text-[12.5px] mt-0.5">{summary}</div>
        </div>
      </div>
    </div>
  );
}

function DraftField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(!!field.alwaysEdit);

  const display = (
    <div
      onClick={() => setEditing(true)}
      className="cursor-text hover:bg-[#FFF7E0] transition-colors rounded px-2 py-1.5 text-[13px]"
      title="Click to edit"
      style={{ border: "1px solid transparent" }}
    >
      {value ? (
        <span>{value}</span>
      ) : (
        <span className="text-text-tertiary italic">(empty)</span>
      )}
    </div>
  );

  const input = field.long ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => !field.alwaysEdit && setEditing(false)}
      autoFocus={!field.alwaysEdit}
      rows={field.rows || 2}
      className="w-full text-[13px] outline-none rounded px-2 py-1.5 resize-y"
      style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
    />
  ) : (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => !field.alwaysEdit && setEditing(false)}
      autoFocus={!field.alwaysEdit}
      className="w-full text-[13px] outline-none rounded px-2 py-1.5"
      style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
    />
  );

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1 flex items-baseline gap-1.5">
        {field.label}
        {field.hint && <span className="normal-case tracking-normal text-text-tertiary italic">{field.hint}</span>}
      </div>
      {editing ? input : display}
    </div>
  );
}

function DraftCard({
  step,
  draft,
  setDraft,
  onAccept,
  onRefine,
  refining,
}: {
  step: StepDef;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onAccept: () => void;
  onRefine: (text: string) => void;
  refining: boolean;
}) {
  const [showRefine, setShowRefine] = useState(false);
  const [refineText, setRefineText] = useState("");

  return (
    <div
      className="rounded-[10px] p-4 mb-3 fadeUp"
      style={{
        background: "#FFFDF6",
        border: "1px solid #E8C97A",
      }}
    >
      <div className="uplabel mb-3 flex items-center gap-1.5" style={{ fontSize: 10 }}>
        <Sparkles size={11} style={{ color: "#9C6D00" }} />
        Spot&apos;s draft · {step.label}
      </div>

      {refining ? (
        <div className="space-y-3">
          {step.fields.map((f) => (
            <div key={f.key}>
              <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1">
                {f.label}
              </div>
              <div
                className="skeleton"
                style={{ height: f.long ? 56 : 24, borderRadius: 4 }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {step.fields.map((f) => (
            <DraftField
              key={f.key}
              field={f}
              value={draft[f.key] || ""}
              onChange={(v) => setDraft({ ...draft, [f.key]: v })}
            />
          ))}
        </div>
      )}

      {!refining && (
        <>
          {showRefine ? (
            <div className="mt-4 pt-3 border-t border-[#E8C97A]">
              <textarea
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                autoFocus
                rows={2}
                placeholder={`Tell Spot what to change — "make the pain sharper", "lean less corporate"…`}
                className="w-full outline-none p-2 rounded text-[12.5px]"
                style={{ border: "1px solid #C9A86A", background: "#FFF" }}
              />
              <div className="flex justify-end gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefine(false);
                    setRefineText("");
                  }}
                  className="inline-flex items-center h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!refineText.trim()}
                  onClick={() => {
                    onRefine(refineText);
                    setRefineText("");
                    setShowRefine(false);
                  }}
                  className="apply-btn"
                >
                  <Sparkles size={11} /> Redraft
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-1.5 mt-4 pt-3 border-t border-[#E8C97A]">
              <button
                type="button"
                onClick={() => setShowRefine(true)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
              >
                <Sparkles size={11} /> Refine
              </button>
              <button type="button" onClick={onAccept} className="apply-btn">
                <Check size={11} /> Accept &amp; continue
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function GuidedFlowModal() {
  const guided = useSpotStore((s) => s.guided);
  const closeGuided = useSpotStore((s) => s.closeGuided);
  const showToast = useSpotStore((s) => s.showToast);

  const [draft, setDraft] = useState<Draft>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [refining, setRefining] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cfg = guided ? GUIDED_CONFIGS[guided.kind] : null;
  const project = guided?.projectId ? getProject(guided.projectId) : undefined;
  const persona = project?.personas.find((p) => p.id === guided?.personaId);

  // Seed when modal opens
  useEffect(() => {
    if (!guided || !cfg) return;
    setDraft(
      cfg.seed({
        projectId: guided.projectId,
        personaId: guided.personaId,
        angleId: guided.angleId,
      }),
    );
    setStepIdx(0);
    setRefining(false);
  }, [guided, cfg]);

  // Autoscroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stepIdx, refining]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!guided || !cfg) return null;
  if (!mounted || typeof document === "undefined") return null;

  const steps = cfg.steps;
  const done = stepIdx >= steps.length;
  const currentStep = steps[stepIdx];

  const refineCurrent = (delta: string) => {
    setRefining(true);
    setTimeout(() => {
      setDraft((d) => (currentStep?.refine ? currentStep.refine(d, delta) : d));
      setRefining(false);
    }, 900);
  };

  const acceptCurrent = () => {
    setStepIdx((i) => i + 1);
  };

  const onFinish = () => {
    showToast(cfg.onFinishToast);
    closeGuided();
  };

  return createPortal(
    <>
      <div className="scrim" onClick={closeGuided} />
      <div
        className="fadeInScale"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(880px, 94vw)",
          maxHeight: "90vh",
          background: "#FFF",
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          zIndex: 100,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border">
          <SpotMark size={20} />
          <div className="flex-1 min-w-0">
            <div className="uplabel" style={{ fontSize: 10 }}>
              {cfg.kicker}
            </div>
            <div className="text-[15px] font-semibold truncate">
              {cfg.title({
                projectName: project?.name.split(" · ")[0],
                personaName: persona?.name,
              })}
            </div>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 items-center mr-2">
            {steps.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: i < stepIdx ? "#22C55E" : i === stepIdx ? "#1A1A1A" : "#D4D4D4",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={closeGuided}
            className="inline-flex items-center justify-center h-8 w-8 rounded-button hover:bg-surface-secondary"
          >
            <X size={15} />
          </button>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 scroll" style={{ background: "var(--chat-bg)" }}>
          {/* Intro */}
          <SpotBubble>{cfg.intro(draft)}</SpotBubble>

          {/* Past accepted steps */}
          {steps.slice(0, stepIdx).map((s) => (
            <AcceptedBubble key={s.id} label={s.label} summary={s.summary(draft)} />
          ))}

          {/* Current step */}
          {!done && currentStep && (
            <>
              <SpotBubble>{currentStep.prompt(draft)}</SpotBubble>
              <DraftCard
                step={currentStep}
                draft={draft}
                setDraft={setDraft}
                onAccept={acceptCurrent}
                onRefine={refineCurrent}
                refining={refining}
              />
            </>
          )}

          {/* Summary card */}
          {done && (
            <>
              <SpotBubble>
                <strong>Here&apos;s the final draft.</strong> Review the summary, then add it to the
                project.
                {cfg.finishNote && <div className="mt-1.5 text-text-secondary text-[12.5px]">{cfg.finishNote}</div>}
              </SpotBubble>
              <div
                className="rounded-[12px] overflow-hidden mb-3"
                style={{
                  background: "linear-gradient(135deg, #FBF7FF 0%, #FFF 60%)",
                  border: "1px solid #C8A8FF",
                }}
              >
                <div
                  className="px-4 py-2.5"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                    color: "#FFF",
                  }}
                >
                  <div className="text-[12px] uppercase tracking-wide font-semibold">Final draft</div>
                </div>
                <div className="p-4 space-y-2.5">
                  {cfg.finalCard(draft).lines.map((l) => (
                    <div key={l.label} className="grid" style={{ gridTemplateColumns: "120px 1fr", gap: 12 }}>
                      <div className="uplabel" style={{ fontSize: 10 }}>
                        {l.label}
                      </div>
                      <div className="text-[12.5px]">{l.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStepIdx(0)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                >
                  <RotateCcw size={12} /> Start over
                </button>
                <button
                  type="button"
                  onClick={onFinish}
                  className="apply-btn"
                  style={{
                    height: 32,
                    fontSize: 13,
                    padding: "0 14px",
                    background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                  }}
                >
                  <Check size={13} /> {cfg.finishLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
