"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Monitor, FlaskConical, Settings, Radio, Layers } from "lucide-react";
import { getProject } from "@/lib/project-data";
import { ProjectHero } from "@/components/project/project-hero";
import { GoalPanel } from "@/components/project/goal-panel";
import { PersonasSection } from "@/components/project/personas-section";
import { CreativesSection } from "@/components/project/creatives-section";
import { MediaPlanSection } from "@/components/project/media-plan-section";
import { ExperimentsSection } from "@/components/project/experiments-section";
import { SetupSection } from "@/components/project/setup-section";
import { ProjectAskBar } from "@/components/project/project-ask-bar";
import { CampaignCreationFlow } from "@/components/project/campaign-creation-flow";
import { CreativesFlow } from "@/components/project/creatives-flow";
import { useSpotStore } from "@/lib/spot/store";
import { ForbiddenState, useScopeGuard } from "@/components/project/shared/scope-guard";

type Tab = "personas" | "creatives" | "plan" | "campaigns" | "experiments" | "setup";

const TABS: { key: Tab; label: string; icon: typeof Users; sub: string }[] = [
  { key: "personas", label: "Personas", icon: Users, sub: "who we're selling to" },
  { key: "creatives", label: "Creatives", icon: Layers, sub: "library · tested vs untested" },
  { key: "plan", label: "Media plan", icon: Monitor, sub: "drafts you're building" },
  { key: "campaigns", label: "Campaigns", icon: Radio, sub: "what's actually live" },
  { key: "experiments", label: "Experiments", icon: FlaskConical, sub: "what we're testing" },
  { key: "setup", label: "Settings", icon: Settings, sub: "brief · strategy · images · agents" },
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = (params?.id || "").toString();
  const project = getProject(id);
  const [tab, setTab] = useState<Tab>("personas");
  const [campaignFlowOpen, setCampaignFlowOpen] = useState(false);
  const [creativesFlow, setCreativesFlow] = useState<{ angleId?: string } | null>(null);
  const askSpot = useSpotStore((s) => s.askSpot);

  // Scope guard: auto-switch if user has access; show forbidden state if not.
  const guard = useScopeGuard(
    project?.workspaceId,
    project?.name.split(" · ")[0] || "This project",
  );

  const askProject = (q: string) =>
    askSpot(q, {
      kind: "project",
      label: project?.name.split(" · ")[0] || "Project",
      target: id,
    });

  if (guard.access === "forbidden") {
    return (
      <ForbiddenState
        workspaceName={guard.workspaceName}
        resourceLabel={guard.resourceLabel}
      />
    );
  }
  // Mid-switch: scope is being updated; render nothing to avoid a flash
  // of stale (wrong-workspace) content.
  if (guard.access === "wrong-scope") return null;

  if (!project) {
    return (
      <div>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[12px] mb-4"
        >
          <ArrowLeft size={14} /> Back to projects
        </button>
        <div className="card-base p-10 text-center">
          <div className="text-[14px] font-medium mb-1">Project not found</div>
          <div className="text-[12px] text-text-tertiary">
            We don&apos;t have a knowledge base for &quot;{id}&quot; yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ paddingBottom: 40 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 text-[12px] text-text-secondary">
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-surface-secondary"
        >
          <ArrowLeft size={13} />
        </button>
        <span>Lead Generation</span>
        <span className="text-text-tertiary">›</span>
        <span>Projects</span>
        <span className="text-text-tertiary">›</span>
        <span className="text-text-primary">{project.name.split(" · ")[0]}</span>
      </div>

      <ProjectHero project={project} onAsk={askProject} />
      <GoalPanel project={project} onAsk={askProject} />

      {/* Tabs */}
      <div className="flex gap-1 mt-6 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative px-4 pt-3 pb-3 flex items-start gap-2 text-left transition-colors"
              style={{ color: active ? "var(--text-1)" : "var(--text-2)" }}
            >
              <Icon size={15} />
              <div>
                <div className="text-[13.5px]" style={{ fontWeight: active ? 600 : 500 }}>
                  {t.label}
                </div>
                <div className="text-[10.5px] text-text-tertiary">{t.sub}</div>
              </div>
              {active && (
                <span
                  className="absolute left-0 right-0 h-[2px] bg-text-primary"
                  style={{ bottom: -1 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <div className="mt-2">
        {tab === "personas" && (
          <PersonasSection
            project={project}
            onAsk={askProject}
            onGenerateCreatives={(angleId) => setCreativesFlow({ angleId })}
          />
        )}
        {tab === "creatives" && (
          <CreativesSection
            project={project}
            onAsk={askProject}
            onGenerateCreatives={() => setCreativesFlow({})}
          />
        )}
        {tab === "plan" && (
          <MediaPlanSection
            project={project}
            onAsk={askProject}
            mode="drafts"
            onNewCampaign={() => setCampaignFlowOpen(true)}
          />
        )}
        {tab === "campaigns" && (
          <MediaPlanSection
            project={project}
            onAsk={askProject}
            mode="campaigns"
            onNewCampaign={() => setCampaignFlowOpen(true)}
          />
        )}
        {tab === "experiments" && <ExperimentsSection project={project} onAsk={askProject} />}
        {tab === "setup" && <SetupSection project={project} onAsk={askProject} />}
      </div>

      <ProjectAskBar projectName={project.name} onAsk={askProject} />

      {creativesFlow && (
        <CreativesFlow
          projectId={id}
          initialAngleId={creativesFlow.angleId}
          onClose={() => setCreativesFlow(null)}
          onComplete={(_, action) => {
            setCreativesFlow(null);
            if (action === "campaign") {
              setCampaignFlowOpen(true);
            }
            // "view" stays on the current project page (no nav needed)
          }}
        />
      )}

      {campaignFlowOpen && (
        <CampaignCreationFlow
          projectId={id}
          onClose={() => setCampaignFlowOpen(false)}
          onLaunched={() => {
            setCampaignFlowOpen(false);
            setTab("campaigns");
          }}
        />
      )}
    </motion.div>
  );
}
