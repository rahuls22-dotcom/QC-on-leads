"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Sparkles,
  Rocket,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { getProject } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { ForbiddenState, useScopeGuard } from "@/components/project/shared/scope-guard";
import {
  CampaignSettingsCard,
  CreativesCard,
  AdSetsCard,
  LeadFormCard,
  StagePill,
  autoDraftCreatives,
  DEFAULT_LEAD_FORM_STATE,
  type CampaignSettings,
  type CreativesState,
  type LeadFormState,
  type PersonaInput,
} from "@/components/project/deploy-steps";

// ─── Local chat atoms ────────────────────────────────────────────────

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

// ─── Stage definitions ─────────────────────────────────────────────────

type Stage = "campaign" | "creatives" | "adsets" | "form" | "deploy";

const STAGES: { key: Stage; label: string }[] = [
  { key: "campaign", label: "Campaign settings" },
  { key: "creatives", label: "Creatives per persona" },
  { key: "adsets", label: "Ad sets per campaign" },
  { key: "form", label: "Lead form" },
  { key: "deploy", label: "Deploy" },
];

// ─── Main page ────────────────────────────────────────────────────────

export default function DeployMediaPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = (params?.id || "").toString();
  const project = getProject(id);
  const showToast = useSpotStore((s) => s.showToast);
  const askSpot = useSpotStore((s) => s.askSpot);
  const scrollRef = useRef<HTMLDivElement>(null);

  const guard = useScopeGuard(
    project?.workspaceId,
    project?.name.split(" · ")[0] || "This project",
  );

  // Prefill campaign settings from the project goal (no second-asking)
  const [settings, setSettings] = useState<CampaignSettings>(() => ({
    objective: project?.goal.kind || "verified",
    weeklyBudget: project ? String(Math.round((project.goal.target / 24) * 5800)) : "50000",
    pacing: "standard",
  }));

  const personaInputs: PersonaInput[] = project
    ? project.personas.map((p) => ({
        id: p.id,
        name: p.name,
        share: p.share,
        role: p.role,
        angles: p.angles.map((a) => ({ id: a.id, name: a.name })),
      }))
    : [];

  // Auto-draft 2 creatives per persona on entry
  const [creatives, setCreatives] = useState<CreativesState>(() =>
    autoDraftCreatives(personaInputs),
  );

  const [leadForm, setLeadForm] = useState<LeadFormState>(() => ({
    ...DEFAULT_LEAD_FORM_STATE,
  }));

  const [stageIdx, setStageIdx] = useState(0);
  const currentStage = STAGES[stageIdx]?.key;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stageIdx]);

  if (guard.access === "forbidden") {
    return (
      <ForbiddenState workspaceName={guard.workspaceName} resourceLabel={guard.resourceLabel} />
    );
  }
  if (guard.access === "wrong-scope") return null;

  if (!project) {
    return (
      <div>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="inline-flex items-center gap-1 text-text-secondary text-[12px] mb-4"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="card-base p-10 text-center">
          <div className="text-[14px] font-medium mb-1">Project not found</div>
        </div>
      </div>
    );
  }

  const totalCreatives = Object.values(creatives).reduce((s, arr) => s + arr.length, 0);
  const accepted = STAGES.slice(0, stageIdx);
  const done = stageIdx >= STAGES.length;

  const summaryFor = (s: Stage): string => {
    if (s === "campaign") {
      return `Optimize for ${settings.objective} · ₹${settings.weeklyBudget}/wk · ${settings.pacing}`;
    }
    if (s === "creatives") {
      return `${totalCreatives} creatives across ${project.personas.length} personas`;
    }
    if (s === "adsets") {
      return `4 campaigns · 4 canonical Meta playbook structures`;
    }
    if (s === "form") {
      const cnt = Object.values(leadForm.enabled).filter(Boolean).length;
      return `${cnt} fields · RERA disclaimer`;
    }
    return "";
  };

  const accept = () => setStageIdx((i) => i + 1);
  const back = () => setStageIdx((i) => Math.max(0, i - 1));

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

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-3 text-[12px] text-text-secondary">
        <button
          type="button"
          onClick={() => router.push(`/projects/${id}`)}
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-surface-secondary"
        >
          <ArrowLeft size={13} />
        </button>
        <span>Projects</span>
        <span className="text-text-tertiary">›</span>
        <span>{project.name.split(" · ")[0]}</span>
        <span className="text-text-tertiary">›</span>
        <span className="text-text-primary">Deploy media plan</span>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Deploy media plan</h1>
          <div className="text-[12.5px] text-text-secondary mt-1">
            Walk each step with Spot · review · then deploy. Nothing goes live until you click Deploy.
          </div>
        </div>
        <button
          type="button"
          onClick={() => askSpot("Review my media plan before deploy — what's the biggest risk?")}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px]"
        >
          <SpotMark size={13} /> Ask Spot to review
        </button>
      </div>

      <div
        className="card-base overflow-hidden mx-auto"
        style={{ maxWidth: 860, display: "flex", flexDirection: "column" }}
      >
        {/* Stage strip */}
        <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border-subtle bg-surface-page overflow-x-auto scroll flex-shrink-0">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-4 flex-shrink-0">
              <StagePill
                stage={s}
                current={currentStage || "deploy"}
                stages={STAGES}
                onClick={() => {
                  const idx = STAGES.findIndex((x) => x.key === s.key);
                  if (idx <= stageIdx) setStageIdx(idx);
                }}
              />
              {i < STAGES.length - 1 && <span className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Chat transcript */}
        <div
          ref={scrollRef}
          className="px-5 py-4 scroll"
          style={{ background: "var(--chat-bg)", minHeight: 400 }}
        >
          {/* Intro */}
          <SpotBubble>
            I&apos;ve drafted everything from your project brief — campaign settings prefilled from
            your goal of <strong>{project.goal.target} {project.goal.kind} leads</strong> in{" "}
            <strong>{project.goal.window}</strong>, 2 creatives per persona, 4 canonical campaigns,
            and a lead form. Walk through each step, refine what you want, then deploy.
          </SpotBubble>

          {accepted.map((s) => (
            <AcceptedBubble key={s.key} label={s.label} summary={summaryFor(s.key)} />
          ))}

          {currentStage === "campaign" && (
            <>
              <SpotBubble>
                Confirm the optimization objective and weekly budget. I&apos;ve prefilled these from
                your project goal so we don&apos;t ask twice.
              </SpotBubble>
              <DraftCard
                label="Campaign settings"
                footer={
                  <div className="flex justify-end">
                    <button type="button" onClick={accept} className="apply-btn">
                      <Check size={11} /> Accept &amp; continue
                    </button>
                  </div>
                }
              >
                <CampaignSettingsCard settings={settings} onChange={setSettings} />
              </DraftCard>
            </>
          )}

          {currentStage === "creatives" && (
            <>
              <SpotBubble>
                I&apos;ve drafted 2 creatives per persona using each persona&apos;s primary angle. Swap
                angles, refine with feedback, upload your own image or video, or add more.
              </SpotBubble>
              <DraftCard
                label="Creatives per persona"
                footer={
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={back}
                      className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                    >
                      Back
                    </button>
                    <button type="button" onClick={accept} className="apply-btn">
                      <Check size={11} /> Accept &amp; continue
                    </button>
                  </div>
                }
              >
                <CreativesCard personas={personaInputs} state={creatives} onChange={setCreatives} />
              </DraftCard>
            </>
          )}

          {currentStage === "adsets" && (
            <>
              <SpotBubble>
                Here are the 4 campaigns we&apos;ll launch — Experiment, Scaling, Cost/Bid Cap, and
                Advantage+. Each card lists its ad sets and which creatives go in each. Tap to expand.
              </SpotBubble>
              <DraftCard
                label="Ad sets per campaign"
                footer={
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={back}
                      className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                    >
                      Back
                    </button>
                    <button type="button" onClick={accept} className="apply-btn">
                      <Check size={11} /> Accept &amp; continue
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

          {currentStage === "form" && (
            <>
              <SpotBubble>
                This is how the lead form will appear to a buyer. Click <strong>Edit settings</strong>{" "}
                to adjust which fields to collect or refine the disclaimer.
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
                    <button type="button" onClick={accept} className="apply-btn">
                      <Check size={11} /> Accept &amp; continue
                    </button>
                  </div>
                }
              >
                <LeadFormCard state={leadForm} onChange={setLeadForm} />
              </DraftCard>
            </>
          )}

          {currentStage === "deploy" && (
            <>
              <SpotBubble>
                <strong>Ready to go live.</strong> Once you deploy, I&apos;ll start monitoring CPL and
                will alert you if anything spikes — but won&apos;t pause anything automatically.
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
                    onClick={() => router.push(`/projects/${id}`)}
                    className="inline-flex items-center h-10 px-4 rounded-button border border-border bg-white text-[13px]"
                  >
                    Save as draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      showToast("Media plan deployed — Spot is now monitoring");
                      router.push(`/projects/${id}`);
                    }}
                    className="apply-btn"
                    style={{
                      height: 40,
                      fontSize: 13.5,
                      padding: "0 18px",
                      background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                    }}
                  >
                    <Rocket size={14} /> Deploy media plan
                  </button>
                </div>
              </div>
            </>
          )}

          {done && !currentStage && (
            <SpotBubble>
              Everything is set. Click <strong>Deploy</strong> above to go live or{" "}
              <button
                type="button"
                onClick={() => setStageIdx(0)}
                className="inline-flex items-center gap-1 underline"
              >
                <RotateCcw size={11} /> start over
              </button>
              .
            </SpotBubble>
          )}
        </div>
      </div>
    </div>
  );
}
