"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, Settings, Radio, Layers, BarChart3 } from "lucide-react";
import { getProject } from "@/lib/project-data";
import { ProjectHero } from "@/components/project/project-hero";
import { GoalPanel } from "@/components/project/goal-panel";
import { DashboardSection } from "@/components/project/dashboard-section";
import { PersonasSection } from "@/components/project/personas-section";
import { CampaignsTab } from "@/components/project/campaigns-tab";
import {
  LibrarySection,
  type LibrarySubTab,
} from "@/components/project/library-section";
import { SetupSection } from "@/components/project/setup-section";
import { SetupChecklist } from "@/components/project/setup-checklist";
import { ProjectAskBar } from "@/components/project/project-ask-bar";
import { useSpotStore } from "@/lib/spot/store";
import { ForbiddenState, useScopeGuard } from "@/components/project/shared/scope-guard";
import { hasAnyProjectActivity } from "@/lib/project-data";

type Tab = "dashboard" | "personas" | "campaigns" | "library" | "settings";

type TabDef = { key: Tab; label: string; icon: typeof Users; sub: string };

const ALL_TABS: TabDef[] = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3, sub: "how we're doing" },
  { key: "personas", label: "Personas", icon: Users, sub: "angles · concepts · winners" },
  { key: "campaigns", label: "Campaigns", icon: Radio, sub: "draft · live · optimize" },
  { key: "library", label: "Library", icon: Layers, sub: "creatives · images · forms" },
  { key: "settings", label: "Settings", icon: Settings, sub: "context · goal · agents" },
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = (params?.id || "").toString();
  const project = getProject(id);

  // Dashboard is only meaningful when the project has actual activity
  // (live campaigns or recorded spend / leads). New projects land on
  // Personas instead so the user starts where they can take action.
  const hasActivity = project ? hasAnyProjectActivity(project) : false;
  const visibleTabs: TabDef[] = ALL_TABS.filter(
    (t) => t.key !== "dashboard" || hasActivity,
  );
  const defaultTab: Tab = hasActivity ? "dashboard" : "personas";
  const [tab, setTab] = useState<Tab>(defaultTab);

  // Library sub-tab — used by the Forms-readiness banner to deeplink
  // straight into the Forms sub-section without forcing the user to
  // click through Creatives / Images first.
  const [librarySub, setLibrarySub] = useState<LibrarySubTab | undefined>(
    undefined,
  );

  // If the project transitions from no-activity → activity (e.g. user
  // launches the first ad set), the tab list grows. Keep the current
  // selection valid; nothing to do here unless the user was on Dashboard
  // when activity disappeared, which the data model doesn't support.

  // Listen for child-component tab-switch requests (e.g. the Campaigns
  // tab's "Go to Forms →" banner). Strongly-typed via the Tab union so
  // unknown tabs are ignored.
  useEffect(() => {
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: string; sub?: string }>).detail;
      const allowed: Tab[] = [
        "dashboard",
        "personas",
        "campaigns",
        "library",
        "settings",
      ];
      if (!detail) return;
      // Legacy "forms" target → re-route to library/forms.
      if (detail.tab === "forms") {
        setLibrarySub("forms");
        setTab("library");
        return;
      }
      if (!allowed.includes(detail.tab as Tab)) return;
      if (detail.tab === "library" && detail.sub === "forms") {
        setLibrarySub("forms");
      }
      // Block Dashboard switch when it's hidden — fall back to Personas.
      if (detail.tab === "dashboard" && !hasActivity) {
        setTab("personas");
        return;
      }
      setTab(detail.tab as Tab);
    };
    window.addEventListener("revspot:tab-switch", onSwitch);
    return () => window.removeEventListener("revspot:tab-switch", onSwitch);
  }, [hasActivity]);
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
      <SetupChecklist
        project={project}
        onGoTo={(target, sub) => {
          if (target === "library" && sub) setLibrarySub(sub);
          setTab(target);
        }}
      />

      {/* Tabs */}
      <div className="flex gap-1 mt-2 border-b border-border">
        {visibleTabs.map((t) => {
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
        {tab === "dashboard" && (
          <DashboardSection project={project} onAsk={askProject} />
        )}
        {tab === "personas" && (
          <PersonasSection project={project} onAsk={askProject} />
        )}
        {tab === "campaigns" && (
          <CampaignsTab project={project} onAsk={askProject} />
        )}
        {tab === "library" && (
          <LibrarySection
            project={project}
            onAsk={askProject}
            onGoToPersonas={() => setTab("personas")}
            initialSub={librarySub}
          />
        )}
        {tab === "settings" && (
          <SetupSection
            project={project}
            onAsk={askProject}
            onOpenLibrary={() => setTab("library")}
          />
        )}
      </div>

      <ProjectAskBar projectName={project.name} onAsk={askProject} />
    </motion.div>
  );
}

