"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Settings,
  Layers,
  Image as ImageIcon,
  FileText,
  Rocket,
  AlertTriangle,
  Plus,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { getProject } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { ForbiddenState, useScopeGuard } from "@/components/project/shared/scope-guard";

type Step = "campaign" | "creatives" | "adsets" | "form" | "deploy";

const STEPS: { key: Step; label: string; sub: string; Icon: typeof Settings }[] = [
  { key: "campaign", label: "Campaign settings", sub: "objective · schedule · budget", Icon: Settings },
  { key: "creatives", label: "Creatives per persona", sub: "1-3 ads per persona", Icon: ImageIcon },
  { key: "adsets", label: "Ad sets ↔ personas", sub: "audience mapping", Icon: Layers },
  { key: "form", label: "Lead form", sub: "questions & disclaimers", Icon: FileText },
  { key: "deploy", label: "Deploy", sub: "review & go live", Icon: Rocket },
];

// ─── Step bodies ──────────────────────────────────────────────────────

function CampaignSettingsStep() {
  const [objective, setObjective] = useState<"leads" | "verified" | "qualified">("verified");
  const [budget, setBudget] = useState("50000");
  const [pacing, setPacing] = useState<"standard" | "accelerated">("standard");
  return (
    <div className="space-y-4">
      <SettingsSection title="Optimization objective" hint="What Spot will tell Meta/Google to optimize for.">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { k: "leads", label: "Leads", sub: "highest volume, lower quality" },
            { k: "verified", label: "Verified leads", sub: "Spot recommends" },
            { k: "qualified", label: "Qualified leads", sub: "needs voice agent integration" },
          ].map(({ k, label, sub }) => {
            const active = objective === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setObjective(k as "leads" | "verified" | "qualified")}
                className="card-base text-left p-3"
                style={{
                  borderColor: active ? "#1A1A1A" : "var(--border)",
                  background: active ? "#1A1A1A" : "#FFF",
                  color: active ? "#FFF" : "var(--text-1)",
                }}
              >
                <div className="text-[13px] font-semibold">{label}</div>
                <div
                  className="text-[10.5px] mt-0.5"
                  style={{ color: active ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}
                >
                  {sub}
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Weekly budget" hint="Spot will split across personas in proportion to their share.">
        <div className="flex items-center gap-3">
          <span className="text-text-tertiary text-[14px]">₹</span>
          <input
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))}
            className="flex-1 outline-none border border-border rounded-button px-3 py-2 text-[14px] tabular-nums"
          />
          <span className="text-text-tertiary text-[12px]">/ week</span>
        </div>
        <div className="text-[11px] text-text-tertiary mt-1.5">
          Projected: ~{Math.round(Number(budget) * 4.3 / 1000)}K / month · ~
          {Math.round((Number(budget) * 24) / 5800)} verified leads / week
        </div>
      </SettingsSection>

      <SettingsSection title="Pacing">
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { k: "standard", label: "Standard", sub: "spend smoothly across the day" },
            { k: "accelerated", label: "Accelerated", sub: "spend as fast as the auction allows" },
          ].map(({ k, label, sub }) => {
            const active = pacing === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setPacing(k as "standard" | "accelerated")}
                className="card-base text-left p-2.5"
                style={{
                  borderColor: active ? "#1A1A1A" : "var(--border)",
                }}
              >
                <div className="text-[12.5px] font-medium">{label}</div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5">{sub}</div>
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-base p-4">
      <div className="mb-3">
        <div className="text-[13px] font-semibold leading-tight">{title}</div>
        {hint && <div className="text-[11px] text-text-tertiary mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function CreativesStep({ projectId }: { projectId: string }) {
  const project = getProject(projectId);
  const openGuided = useSpotStore((s) => s.openGuided);
  const showToast = useSpotStore((s) => s.showToast);
  // Track which personas have at least one creative
  const [creativeCount, setCreativeCount] = useState<Record<string, number>>({});

  if (!project) return null;

  const totalNeeded = project.personas.length * 3;
  const totalCreated = Object.values(creativeCount).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-3">
      <div className="card-base p-3.5 flex items-start gap-3" style={{ background: "var(--spot-tint)", borderColor: "var(--spot-stroke)" }}>
        <SpotMark size={18} />
        <div className="flex-1 text-[12.5px] leading-[1.5]">
          <strong>{totalCreated} of {totalNeeded} creatives drafted.</strong> Aim for 2-3 creatives
          per persona so we have something to test. Click <em>Launch new creative</em> on any
          persona to walk through the brief with me.
        </div>
      </div>

      {project.personas.map((p) => {
        const count = creativeCount[p.id] || 0;
        return (
          <div key={p.id} className="card-base p-4">
            <div className="flex items-start gap-3 mb-3">
              <PersonaAvatar id={p.id} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-semibold">{p.name}</div>
                  <span className="pill" style={{ fontSize: 10 }}>
                    {p.share}% mix
                  </span>
                  {count > 0 ? (
                    <span className="pill pill-ok" style={{ fontSize: 10 }}>
                      <Check size={10} /> {count} creative{count === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="pill pill-warn" style={{ fontSize: 10 }}>
                      <AlertTriangle size={10} /> No creatives yet
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-tertiary mt-0.5">{p.role}</div>
              </div>
            </div>

            <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <PersonaDetailField label="Want" body={p.want} tone="neutral" />
              <PersonaDetailField label="Pain point" body={p.painPoint} tone="warn" />
              <PersonaDetailField label="Solution" body={p.usp} tone="ok" />
            </div>

            {count > 0 && (
              <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {Array.from({ length: count }, (_, i) => (
                  <div
                    key={i}
                    className="card-base p-2 flex items-center gap-2"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 5,
                        background: `repeating-linear-gradient(135deg, oklch(0.9 0.05 ${(p.id.length * 31 + i * 80) % 360}) 0 4px, oklch(0.82 0.06 ${(p.id.length * 31 + i * 80 + 30) % 360}) 4px 8px)`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate">Creative {i + 1}</div>
                      <div className="text-[10px] text-text-tertiary">1:1 · Meta Feed</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCreativeCount({ ...creativeCount, [p.id]: count - 1 });
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary"
                >
                  Remove one
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  openGuided({
                    kind: "launch-creative",
                    projectId,
                    personaId: p.id,
                  });
                  // Optimistic increment: pretend the user finishes the guided flow.
                  setTimeout(() => {
                    setCreativeCount((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
                    showToast(`Creative drafted for ${p.name.split(" ").slice(-2).join(" ")}`);
                  }, 800);
                }}
                className="apply-btn"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
              >
                <Sparkles size={11} /> Launch new creative
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PersonaAvatar({ id, size = 40 }: { id: string; size?: number }) {
  const hue = (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: `linear-gradient(135deg, oklch(0.88 0.06 ${hue}) 0%, oklch(0.72 0.09 ${(hue + 50) % 360}) 100%)`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx="20" cy="15" r="5" fill="rgba(0,0,0,0.35)" />
        <path d="M10 34c0-6 5-9 10-9s10 3 10 9z" fill="rgba(0,0,0,0.35)" />
      </svg>
    </div>
  );
}

function PersonaDetailField({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: "neutral" | "warn" | "ok";
}) {
  const dot = tone === "warn" ? "#DC2626" : tone === "ok" ? "#15803D" : "#9B9B9B";
  return (
    <div
      className="px-3 py-2 rounded-[6px]"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: dot }} />
        <span className="uplabel" style={{ fontSize: 9.5 }}>{label}</span>
      </div>
      <div className="text-[11.5px] leading-[1.45]">{body}</div>
    </div>
  );
}

function AdSetsStep({ projectId }: { projectId: string }) {
  const project = getProject(projectId);
  if (!project) return null;
  // Mock: each persona has 2 ad sets
  return (
    <div className="space-y-3">
      <div className="card-base p-3.5 flex items-start gap-3" style={{ background: "var(--spot-tint)", borderColor: "var(--spot-stroke)" }}>
        <SpotMark size={18} />
        <div className="flex-1 text-[12.5px] leading-[1.5]">
          Each persona gets 2 ad sets by default: a tight Lookalike audience and a broader
          interest-based audience. Click any ad set to refine the audience or change optimization.
        </div>
      </div>
      {project.personas.map((p) => (
        <div key={p.id} className="card-base overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
            <PersonaAvatar id={p.id} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold">{p.name}</div>
              <div className="text-[11px] text-text-tertiary">2 ad sets</div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
            >
              <Plus size={11} /> Add ad set
            </button>
          </div>
          {[
            {
              name: "Lookalike · 1%",
              audience: `LAL 1% of approved buyers · ${project.micromarket.split(" · ")[0]} · ${p.age}-${p.age + 12}`,
              opt: "Verified leads · lowest cost",
              budget: 8000,
            },
            {
              name: "Interest · broad",
              audience: `Interest in ${p.demographics[0]} · ${project.micromarket.split(" · ")[0]} · age ${p.age - 2}-${p.age + 14}`,
              opt: "Verified leads · cost cap ₹6,000",
              budget: 6000,
            },
          ].map((set, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 hover-row"
              style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium">{set.name}</div>
                <div className="text-[10.5px] text-text-tertiary truncate">{set.audience}</div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5">{set.opt}</div>
              </div>
              <div className="text-right text-[12px] tabular-nums">
                ₹{(set.budget / 1000).toFixed(0)}K/d
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-tertiary hover:bg-surface-secondary"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LeadFormStep() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    name: true,
    phone: true,
    email: true,
    budget: true,
    timeline: true,
    units: false,
  });
  const fields = [
    { k: "name", label: "Full name", type: "text" },
    { k: "phone", label: "Phone number", type: "phone" },
    { k: "email", label: "Email", type: "email" },
    { k: "budget", label: "Budget range", type: "choice" },
    { k: "timeline", label: "Purchase timeline", type: "choice" },
    { k: "units", label: "Preferred unit type (3 BHK / 4 BHK)", type: "choice" },
  ];
  return (
    <div className="space-y-4">
      <SettingsSection title="Lead form fields" hint="Fewer fields = more leads. More fields = higher qualification.">
        <div className="space-y-1">
          {fields.map((f) => (
            <label
              key={f.k}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] cursor-pointer hover-row"
            >
              <input
                type="checkbox"
                checked={!!enabled[f.k]}
                onChange={(e) => setEnabled({ ...enabled, [f.k]: e.target.checked })}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="text-[12.5px] font-medium">{f.label}</div>
              </div>
              <span className="pill" style={{ fontSize: 10 }}>{f.type}</span>
            </label>
          ))}
        </div>
        <div className="text-[11px] text-text-tertiary mt-2">
          {Object.values(enabled).filter(Boolean).length} of {fields.length} enabled — Spot
          estimates ~3% drop in volume per added field.
        </div>
      </SettingsSection>
      <SettingsSection title="Privacy & disclaimers">
        <div
          className="px-3 py-2.5 rounded-[6px] mono text-[11px] text-text-secondary leading-[1.5]"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}
        >
          PRM/MH/RERA/... · This is a RERA-registered project. By submitting, you agree to be
          contacted by Godrej Properties about this project. We do not share your details with
          third parties.
        </div>
        <div className="flex justify-end mt-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
          >
            <SpotMark size={11} /> Refine disclaimer with Spot
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}

function DeployStep({ projectId }: { projectId: string }) {
  const project = getProject(projectId);
  const router = useRouter();
  const showToast = useSpotStore((s) => s.showToast);
  if (!project) return null;

  const checks = [
    { ok: true, text: "Campaign settings complete" },
    { ok: true, text: "All personas have at least one creative" },
    { ok: true, text: "Ad sets mapped to personas" },
    { ok: true, text: "Lead form configured with RERA disclaimer" },
    { ok: false, text: "Voice agent not yet connected (qualified leads will need this)" },
  ];

  return (
    <div className="space-y-4">
      <div
        className="rounded-[12px] p-5"
        style={{
          background: "linear-gradient(135deg, #FBF7FF 0%, #FFF 60%)",
          border: "1px solid #C8A8FF",
        }}
      >
        <div className="text-[14px] font-semibold mb-2">Ready to go live</div>
        <div className="text-[12.5px] text-text-secondary leading-[1.5] mb-4">
          {project.personas.length} personas · {project.personas.length * 2} ad sets · creatives
          drafted. Once you deploy, Spot will start monitoring CPL and will <strong>alert you</strong>{" "}
          if anything spikes — but won&apos;t pause anything automatically.
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
              {c.ok ? <Check size={13} className="flex-shrink-0 mt-0.5" /> : <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />}
              <div className="text-[12px] leading-[1.4]">{c.text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}`)}
          className="inline-flex items-center h-10 px-4 rounded-button border border-border bg-white text-[13px]"
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => {
            showToast("Media plan deployed — Spot is now monitoring");
            router.push(`/projects/${projectId}`);
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
  );
}

// ─── Page shell ───────────────────────────────────────────────────────

export default function DeployMediaPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = (params?.id || "").toString();
  const project = getProject(id);
  const [step, setStep] = useState<Step>("campaign");
  const askSpot = useSpotStore((s) => s.askSpot);

  const guard = useScopeGuard(
    project?.workspaceId,
    project?.name.split(" · ")[0] || "This project",
  );
  if (guard.access === "forbidden") {
    return (
      <ForbiddenState
        workspaceName={guard.workspaceName}
        resourceLabel={guard.resourceLabel}
      />
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

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setStep(STEPS[stepIdx + 1].key);
  };
  const goPrev = () => {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1].key);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
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

      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Deploy media plan</h1>
          <div className="text-[12.5px] text-text-secondary mt-1">
            Walk each section · review · then deploy. Nothing goes live until you click Deploy.
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

      {/* Two-column layout: step rail + step body */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "260px 1fr" }}>
        {/* Step rail */}
        <div className="card-base p-2">
          {STEPS.map((s, i) => {
            const active = step === s.key;
            const done = i < stepIdx;
            const Icon = s.Icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(s.key)}
                className="flex items-start gap-3 w-full text-left p-3 rounded-[7px] transition-colors"
                style={{
                  background: active ? "var(--bg-page)" : "transparent",
                }}
              >
                <span
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: done ? "#22C55E" : active ? "#1A1A1A" : "var(--bg-secondary)",
                    color: done || active ? "#FFF" : "var(--text-3)",
                  }}
                >
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[12.5px] leading-tight"
                    style={{ fontWeight: active ? 600 : 500, color: active ? "var(--text-1)" : "var(--text-2)" }}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary mt-0.5">{s.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step body */}
        <div className="min-w-0">
          {step === "campaign" && <CampaignSettingsStep />}
          {step === "creatives" && <CreativesStep projectId={id} />}
          {step === "adsets" && <AdSetsStep projectId={id} />}
          {step === "form" && <LeadFormStep />}
          {step === "deploy" && <DeployStep projectId={id} />}

          {step !== "deploy" && (
            <div className="flex justify-between mt-5">
              <button
                type="button"
                onClick={goPrev}
                disabled={stepIdx === 0}
                className="inline-flex items-center h-9 px-3.5 rounded-button border border-border bg-white text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="apply-btn"
                style={{ height: 32, fontSize: 12.5, padding: "0 14px" }}
              >
                Continue · {STEPS[stepIdx + 1]?.label} →
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
