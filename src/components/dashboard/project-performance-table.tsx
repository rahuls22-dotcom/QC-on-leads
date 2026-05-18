"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import {
  projectsForWorkspace,
  projectRollup,
  type ProjectDetail,
} from "@/lib/project-data";
import { useCurrentScope, useWorkspaceStore } from "@/lib/workspace-store";
import { WORKSPACES, type Workspace } from "@/lib/workspace-data";

function HealthPill({
  health,
}: {
  health: "on-track" | "needs-attention" | "underperforming";
}) {
  const map = {
    "on-track": { label: "On track", cls: "pill-ok" },
    "needs-attention": { label: "Attention", cls: "pill-warn" },
    underperforming: { label: "Low", cls: "pill-err" },
  } as const;
  const c = map[health];
  return (
    <span className={`pill ${c.cls}`} style={{ fontSize: 11 }}>
      {c.label}
    </span>
  );
}

function fmtRupees(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function lakhsFromDisplay(label: string | number | undefined | null): number {
  if (label === undefined || label === null) return 0;
  const m = String(label).match(/([0-9]+(\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function GoalPill({ goal }: { goal: ProjectDetail["goal"] }) {
  const pct = Math.min(100, Math.round((goal.achieved / goal.target) * 100));
  const paceCls =
    goal.pace === "ahead" ? "pill-ok" : goal.pace === "on-pace" ? "pill-info" : "pill-err";
  return (
    <div className="flex items-baseline gap-1.5 justify-end">
      <span className="text-[12.5px] tabular-nums font-medium text-text-primary">
        {goal.achieved}
      </span>
      <span className="text-[10.5px] text-text-tertiary tabular-nums">/ {goal.target}</span>
      <span
        className={`pill ${paceCls}`}
        style={{ fontSize: 9.5, padding: "1px 5px", letterSpacing: 0.3, fontWeight: 700 }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function ProjectPerformanceTable() {
  const router = useRouter();
  const scope = useCurrentScope();

  // All-workspaces view: roll up by workspace, not by project. Same
  // page, same surface — the table just switches its row entity.
  if (scope.kind === "all") {
    return <WorkspaceRollupTable />;
  }

  // scope.kind === "workspace" here — narrowed by the early return above.
  const projects = projectsForWorkspace(scope.id);

  if (projects.length === 0) {
    return (
      <div className="bg-white border border-border rounded-card p-10 text-center">
        <div className="text-section-header text-text-primary mb-1">No projects yet</div>
        <div className="text-meta text-text-tertiary mb-3">
          Create your first project to see performance here.
        </div>
        <Link
          href="/projects"
          className="text-[13px] font-medium text-text-secondary hover:text-text-primary inline-flex items-center gap-1"
        >
          Go to Projects
          <ArrowRight size={13} strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-card">
      <div className="px-6 py-5 border-b border-border-subtle">
        <h2 className="text-section-header text-text-primary">Project performance</h2>
        <div className="text-meta text-text-tertiary mt-0.5">
          Click any project to open it.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Project
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Spend
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Leads
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Verified
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Qualified
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Goal
              </th>
              <th className="text-center px-6 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Health
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const r = projectRollup(p.id)!;
              const spendRupees = lakhsFromDisplay(r.spend) * 100000;
              const cpl = r.totalLeads ? spendRupees / r.totalLeads : null;
              const cpvl = r.verifiedLeads ? spendRupees / r.verifiedLeads : null;
              const cpql = r.qualifiedLeads ? spendRupees / r.qualifiedLeads : null;
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className={`hover:bg-surface-page transition-colors duration-150 cursor-pointer ${
                    i % 2 === 0 ? "bg-white" : "bg-surface-page/50"
                  }`}
                >
                  <td className="px-6 py-3 max-w-[280px]">
                    <div className="text-[13px] text-text-primary font-medium truncate">
                      {p.name.split(" · ")[0]}
                    </div>
                    <div className="text-[11px] text-text-tertiary truncate">
                      {p.category}
                      {p.micromarket ? ` · ${p.micromarket.split(" · ")[0]}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary font-medium">{r.spend}</div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary">
                      {r.totalLeads.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-text-tertiary">
                      {cpl ? `${fmtRupees(cpl)} CPL` : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary">
                      {r.verifiedLeads.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-text-tertiary">
                      {r.verifRate !== null
                        ? `${r.verifRate.toFixed(1)}% · ${cpvl ? fmtRupees(cpvl) : "—"} CPVL`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary">
                      {r.qualifiedLeads.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-text-tertiary">
                      {r.qualRate !== null
                        ? `${r.qualRate.toFixed(1)}% · ${cpql ? fmtRupees(cpql) : "—"} CPQL`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <GoalPill goal={r.goal} />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <HealthPill health={p.health} />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <ChevronRight size={14} className="text-text-tertiary" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-border-subtle">
        <Link
          href="/projects"
          className="text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 inline-flex items-center gap-1"
        >
          View all projects
          <ArrowRight size={13} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}

// ─── All workspaces variant ───────────────────────────────────────────
//
// Same dashboard surface, different row entity: one row per workspace
// with rolled-up metrics. Clicking a row switches scope to that
// workspace and lands on /dashboard so the user can drill in without
// changing pages.

function WorkspaceRollupTable() {
  const router = useRouter();
  const setScope = useWorkspaceStore((s) => s.setScope);

  type Roll = {
    workspace: Workspace;
    projects: number;
    spendL: number;
    totalLeads: number;
    verified: number;
    qualified: number;
    target: number;
    achieved: number;
  };

  const rows: Roll[] = WORKSPACES.map((w) => {
    const projects = projectsForWorkspace(w.id);
    const init: Omit<Roll, "workspace" | "projects"> = {
      spendL: 0,
      totalLeads: 0,
      verified: 0,
      qualified: 0,
      target: 0,
      achieved: 0,
    };
    const agg = projects.reduce((acc, p) => {
      const r = projectRollup(p.id)!;
      return {
        spendL: acc.spendL + lakhsFromDisplay(r.spend),
        totalLeads: acc.totalLeads + r.totalLeads,
        verified: acc.verified + r.verifiedLeads,
        qualified: acc.qualified + r.qualifiedLeads,
        target: acc.target + p.goal.target,
        achieved: acc.achieved + p.goal.achieved,
      };
    }, init);
    return { workspace: w, projects: projects.length, ...agg };
  });

  // Portfolio totals row
  const totals = rows.reduce(
    (a, r) => ({
      spendL: a.spendL + r.spendL,
      totalLeads: a.totalLeads + r.totalLeads,
      verified: a.verified + r.verified,
      qualified: a.qualified + r.qualified,
      target: a.target + r.target,
      achieved: a.achieved + r.achieved,
    }),
    { spendL: 0, totalLeads: 0, verified: 0, qualified: 0, target: 0, achieved: 0 },
  );

  const openWorkspace = (id: string) => {
    setScope(id);
    // Stay on /dashboard — the user drills in by re-scoping, not by
    // navigating away. The Project Performance variant of this table
    // will render on the next frame.
  };

  return (
    <div className="bg-white border border-border rounded-card">
      <div className="px-6 py-5 border-b border-border-subtle">
        <h2 className="text-section-header text-text-primary">Workspace performance</h2>
        <div className="text-meta text-text-tertiary mt-0.5">
          Rolled up across {rows.length} workspaces · click any row to focus.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Workspace
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Spend
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Leads
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Verified
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Qualified
              </th>
              <th className="text-right px-3 py-3 text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                Goal
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const spendRupees = r.spendL * 100000;
              const cpl = r.totalLeads ? spendRupees / r.totalLeads : null;
              const cpvl = r.verified ? spendRupees / r.verified : null;
              const cpql = r.qualified ? spendRupees / r.qualified : null;
              const verifRate = r.totalLeads ? (r.verified / r.totalLeads) * 100 : null;
              const qualRate = r.totalLeads ? (r.qualified / r.totalLeads) * 100 : null;
              const goalPct = r.target ? Math.min(100, Math.round((r.achieved / r.target) * 100)) : 0;
              return (
                <tr
                  key={r.workspace.id}
                  onClick={() => openWorkspace(r.workspace.id)}
                  className={`hover:bg-surface-page transition-colors duration-150 cursor-pointer ${
                    i % 2 === 0 ? "bg-white" : "bg-surface-page/50"
                  }`}
                >
                  <td className="px-6 py-3 max-w-[280px]">
                    <div className="text-[13px] text-text-primary font-medium truncate">
                      {r.workspace.name}
                    </div>
                    <div className="text-[11px] text-text-tertiary truncate">
                      {r.workspace.region} · {r.projects} project{r.projects === 1 ? "" : "s"} ·{" "}
                      {r.workspace.memberCount} members
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary font-medium">
                      ₹{r.spendL.toFixed(1)}L
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary">
                      {r.totalLeads.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-text-tertiary">
                      {cpl ? `${fmtRupees(cpl)} CPL` : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary">{r.verified.toLocaleString()}</div>
                    <div className="text-[10.5px] text-text-tertiary">
                      {verifRate !== null
                        ? `${verifRate.toFixed(1)}% · ${cpvl ? fmtRupees(cpvl) : "—"} CPVL`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    <div className="text-[13px] text-text-primary">
                      {r.qualified.toLocaleString()}
                    </div>
                    <div className="text-[10.5px] text-text-tertiary">
                      {qualRate !== null
                        ? `${qualRate.toFixed(1)}% · ${cpql ? fmtRupees(cpql) : "—"} CPQL`
                        : "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-baseline gap-1.5 justify-end">
                      <span className="text-[12.5px] tabular-nums font-medium text-text-primary">
                        {r.achieved}
                      </span>
                      <span className="text-[10.5px] text-text-tertiary tabular-nums">
                        / {r.target}
                      </span>
                      <span
                        className="pill pill-info"
                        style={{ fontSize: 9.5, padding: "1px 5px", letterSpacing: 0.3, fontWeight: 700 }}
                      >
                        {goalPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <ChevronRight size={14} className="text-text-tertiary" />
                  </td>
                </tr>
              );
            })}
            {/* Totals row */}
            <tr className="border-t border-border bg-surface-page/70">
              <td className="px-6 py-3">
                <div className="text-[12.5px] text-text-primary font-medium">Portfolio total</div>
                <div className="text-[11px] text-text-tertiary">
                  across {rows.length} workspaces
                </div>
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-[12.5px] font-medium">
                ₹{totals.spendL.toFixed(1)}L
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-[12.5px]">
                {totals.totalLeads.toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-[12.5px]">
                {totals.verified.toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-[12.5px]">
                {totals.qualified.toLocaleString()}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-[12.5px]">
                {totals.achieved} / {totals.target}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-border-subtle flex items-center justify-between">
        <Link
          href="/admin"
          className="text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150 inline-flex items-center gap-1"
        >
          Open admin overview
          <ArrowRight size={13} strokeWidth={1.5} />
        </Link>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="text-[12px] text-text-tertiary hover:text-text-primary inline-flex items-center gap-1"
        >
          See projects across all workspaces
          <ArrowRight size={11} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
