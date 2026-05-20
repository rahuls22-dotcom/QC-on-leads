"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, Sparkles, Rocket, AlertTriangle } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { getProject, mutateRuntimeProject } from "@/lib/project-data";
import { appendLaunchedCampaign } from "@/lib/build-project";
import { AgentPicker, getAgentName } from "@/components/project/agent-picker";
import {
  AdSetsCard,
  LeadFormCard,
  autoDraftCreatives,
  DEFAULT_DISCLAIMER,
  type CampaignSettings,
  type CreativesState,
  type LeadFormState,
  type PersonaInput,
} from "@/components/project/deploy-steps";

type Stage = "mediaplan" | "leadform" | "deploy" | "launching";

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

export function CampaignCreationFlow({
  projectId,
  onClose,
  onLaunched,
}: {
  projectId: string;
  onClose: () => void;
  onLaunched: (projectId: string) => void;
}) {
  const project = getProject(projectId);
  const showToast = useSpotStore((s) => s.showToast);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [stage, setStage] = useState<Stage>("mediaplan");

  const personaInputs: PersonaInput[] = project
    ? project.personas.map((p) => ({
        id: p.id,
        name: p.name,
        share: p.share,
        role: p.role,
        angles: p.angles.map((a) => ({ id: a.id, name: a.name })),
      }))
    : [];

  const [settings] = useState<CampaignSettings>(() => ({
    objective: project?.goal.kind || "verified",
    weeklyBudget: project ? String(Math.round((project.goal.target / 24) * 5800)) : "50000",
    pacing: "standard",
  }));

  // Creatives come from the project's library. We mirror the auto-draft
  // shape here so AdSetsCard can render thumbnails per ad set without a
  // separate data pipe — in a real backend this would read from
  // Persona.angles[].concept.creatives[].
  const [creatives] = useState<CreativesState>(() => autoDraftCreatives(personaInputs));

  const [agentId, setAgentId] = useState<string | null>(null);

  const [leadForm, setLeadForm] = useState<LeadFormState>(() => ({
    enabled: { name: true, phone: true, email: true, budget: true, timeline: true, units: false },
    disclaimer: DEFAULT_DISCLAIMER,
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stage]);

  if (!mounted || typeof document === "undefined") return null;
  if (!project) return null;

  const totalCreatives = Object.values(creatives).reduce((s, arr) => s + arr.length, 0);
  const next = () => {
    const order: Stage[] = ["mediaplan", "leadform", "deploy"];
    const i = order.indexOf(stage);
    if (i < order.length - 1) setStage(order[i + 1]);
  };
  const back = () => {
    const order: Stage[] = ["mediaplan", "leadform", "deploy"];
    const i = order.indexOf(stage);
    if (i > 0) setStage(order[i - 1]);
  };

  const checks = [
    { ok: true, text: "Campaign settings complete" },
    {
      ok: totalCreatives >= project.personas.length,
      text: "All personas have at least one creative",
    },
    { ok: true, text: "4 canonical campaigns with ad sets configured" },
    {
      ok: leadForm.enabled.name && leadForm.enabled.phone,
      text: "Lead form has name + phone with RERA disclaimer",
    },
    {
      ok: settings.objective !== "qualified",
      text:
        settings.objective === "qualified"
          ? "Voice agent needed for qualified leads — not yet connected"
          : "Optimization objective ready",
    },
  ];

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
                Spot · new campaign for {project.name.split(" · ")[0]}
              </div>
              <div className="text-[15px] font-semibold truncate">
                Build the media plan, then go live
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
            {stage === "mediaplan" && (
              <>
                <SpotBubble>
                  Pulling your project goal — <strong>{project.goal.target} {project.goal.kind} leads</strong>{" "}
                  in <strong>{project.goal.window}</strong> — into the media plan. Here&apos;s a
                  starter shape: 4 canonical campaigns (Experiment, Scaling, Cost/Bid Cap,
                  Advantage+) with your project creatives slotted into the right ad sets. Tap any
                  campaign to expand.
                </SpotBubble>
                <DraftCard
                  label="Media plan · ad sets per campaign"
                  footer={
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                      >
                        Cancel
                      </button>
                      <button type="button" onClick={next} className="apply-btn">
                        <Check size={11} /> Set up the lead form →
                      </button>
                    </div>
                  }
                >
                  <AdSetsCard
                    projectShort={project.name.split(" · ")[0]}
                    personas={personaInputs}
                    creatives={creatives}
                  />
                </DraftCard>
              </>
            )}

            {stage === "leadform" && (
              <>
                <SpotBubble>
                  Here&apos;s how the lead form will appear to a buyer. Click{" "}
                  <strong>Edit settings</strong> to add or remove fields, or refine the disclaimer.
                </SpotBubble>
                <DraftCard
                  label="Lead form"
                  footer={
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={back}
                        className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                      >
                        Back
                      </button>
                      <button type="button" onClick={next} className="apply-btn">
                        <Check size={11} /> Review &amp; go live →
                      </button>
                    </div>
                  }
                >
                  <LeadFormCard state={leadForm} onChange={setLeadForm} />
                </DraftCard>
              </>
            )}

            {stage === "deploy" && (
              <>
                <SpotBubble>
                  <strong>Ready to go live.</strong> Quick review below. Optionally connect a voice
                  or WhatsApp agent — it&apos;ll qualify or follow up with leads from this campaign
                  the moment they come in.
                </SpotBubble>
                <div
                  className="rounded-[12px] p-5 mb-3"
                  style={{
                    background: "linear-gradient(135deg, #FBF7FF 0%, #FFF 60%)",
                    border: "1px solid #C8A8FF",
                  }}
                >
                  <div className="text-[14px] font-semibold mb-2">Pre-flight checks</div>
                  <div className="text-[12px] text-text-secondary leading-[1.5] mb-4">
                    {project.personas.length} personas · {totalCreatives} creatives · 4 campaigns ·
                    ₹{settings.weeklyBudget}/wk
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    {checks.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 rounded-[6px]"
                        style={{
                          background: c.ok ? "var(--ok-bg)" : "var(--warn-bg)",
                          color: c.ok ? "var(--ok-fg)" : "var(--warn-fg)",
                        }}
                      >
                        {c.ok ? (
                          <Check size={13} className="flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                        )}
                        <div className="text-[12px] leading-[1.4]">{c.text}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <DraftCard label="Voice / WhatsApp agent (optional)">
                  <AgentPicker value={agentId} onChange={setAgentId} />
                </DraftCard>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={back}
                    className="inline-flex items-center h-9 px-3.5 rounded-button border border-border bg-white text-[12.5px]"
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast("Saved as a draft in your media plan");
                        onLaunched(projectId);
                      }}
                      className="inline-flex items-center h-10 px-4 rounded-button border border-border bg-white text-[13px]"
                    >
                      Save as draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setStage("launching")}
                      className="apply-btn"
                      style={{
                        height: 40,
                        fontSize: 13.5,
                        padding: "0 18px",
                        background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                      }}
                    >
                      <Rocket size={14} /> Launch campaign
                    </button>
                  </div>
                </div>
              </>
            )}

            {stage === "launching" && (
              <LaunchSequence
                projectShort={project.name.split(" · ")[0]}
                weeklyBudget={settings.weeklyBudget}
                agentName={getAgentName(agentId)}
                onDone={() => {
                  // Persist the launched campaign onto the project's media plan
                  // so it shows up in the Campaigns tab when the user lands.
                  mutateRuntimeProject(projectId, (p) =>
                    appendLaunchedCampaign(p, {
                      settingsObjective: settings.objective,
                      weeklyBudget: Number(settings.weeklyBudget) || 0,
                      agentId,
                      agentName: getAgentName(agentId),
                    }),
                  );
                  const agentName = getAgentName(agentId);
                  showToast(
                    agentName
                      ? `Campaign live · ${agentName} connected`
                      : "Campaign live — Spot is now monitoring",
                  );
                  onLaunched(projectId);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function LaunchSequence({
  projectShort,
  weeklyBudget,
  agentName,
  onDone,
}: {
  projectShort: string;
  weeklyBudget: string;
  agentName: string | null;
  onDone: () => void;
}) {
  const steps = [
    {
      label: "Connecting to Meta Ads Manager",
      detail: "OAuth · permissions verified",
    },
    {
      label: "Creating 4 campaigns",
      detail: `Experiment · Scaling · Cost-Cap · Advantage+ for ${projectShort}`,
    },
    {
      label: "Uploading creatives and ad sets",
      detail: "Pulling from your project library · matching to ad sets",
    },
    {
      label: "Setting up lead form & CRM webhook",
      detail: "RERA disclaimer included · CRM endpoint armed",
    },
    {
      label: agentName ? `Connecting agent · ${agentName}` : "Allocating weekly budget",
      detail: agentName
        ? "Voice / WhatsApp handoff configured"
        : `₹${Number(weeklyBudget).toLocaleString("en-IN")}/wk staged across 4 campaigns`,
    },
    {
      label: "Going live",
      detail: "Spot will start monitoring CPL within the hour",
    },
  ];

  const [completed, setCompleted] = useState(0);
  const allDone = completed >= steps.length;

  useEffect(() => {
    if (allDone) return;
    const t = setTimeout(() => setCompleted((c) => c + 1), 700);
    return () => clearTimeout(t);
  }, [completed, allDone]);

  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [allDone, onDone]);

  return (
    <div
      className="fadeUp"
      style={{
        minHeight: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "40px 16px",
      }}
    >
      {/* Animated header orb */}
      <div style={{ position: "relative", width: 84, height: 84 }}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            opacity: 0.18,
            transform: "scale(1.0)",
            animation: "spot-pulse-orb 1.6s ease-out infinite",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            opacity: 0.32,
            transform: "scale(0.7)",
            animation: "spot-pulse-orb 1.6s ease-out 0.4s infinite",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
            top: 18,
            left: 18,
          }}
        >
          <Rocket size={20} />
        </span>
      </div>

      <div style={{ textAlign: "center" }}>
        <div className="text-[18px] font-semibold tracking-[-0.01em] mb-1">
          {allDone ? "Live." : "Launching your campaign…"}
        </div>
        <div className="text-[12.5px] text-text-tertiary">
          {allDone
            ? "Spot is now monitoring CPL"
            : `Step ${Math.min(completed + 1, steps.length)} of ${steps.length}`}
        </div>
      </div>

      <div style={{ width: "min(420px, 100%)" }} className="space-y-2">
        {steps.map((s, i) => {
          const state =
            i < completed ? "done" : i === completed ? "active" : "pending";
          return (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2 rounded-[8px] fadeUp"
              style={{
                background:
                  state === "active"
                    ? "var(--spot-tint)"
                    : state === "done"
                    ? "#F0FDF4"
                    : "transparent",
                border:
                  state === "active"
                    ? "1px solid var(--spot-stroke)"
                    : state === "done"
                    ? "1px solid #BBF7D0"
                    : "1px solid transparent",
                transition: "background 200ms, border-color 200ms",
              }}
            >
              <span
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background:
                    state === "done"
                      ? "#15803D"
                      : state === "active"
                      ? "#1A1A1A"
                      : "var(--bg-secondary)",
                  color: "#FFF",
                  marginTop: 2,
                }}
              >
                {state === "done" ? (
                  <Check size={11} />
                ) : state === "active" ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#FFF",
                      animation: "spot-blink 1s ease-in-out infinite",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--text-tertiary)",
                    }}
                  />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-medium"
                  style={{
                    color:
                      state === "pending" ? "var(--text-tertiary)" : "var(--text-1)",
                  }}
                >
                  {s.label}
                </div>
                <div
                  className="text-[11px] mt-0.5 leading-[1.4]"
                  style={{
                    color:
                      state === "pending"
                        ? "var(--text-tertiary)"
                        : state === "done"
                        ? "var(--ok-fg)"
                        : "var(--text-secondary)",
                  }}
                >
                  {s.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes spot-pulse-orb {
          0% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @keyframes spot-blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
