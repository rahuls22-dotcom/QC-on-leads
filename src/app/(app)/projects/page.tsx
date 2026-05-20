"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronRight, Folder, ArrowUpRight } from "lucide-react";
import {
  projectsForWorkspace,
  projectDetails,
  projectRollup,
} from "@/lib/project-data";
import { CreateProjectFlow } from "@/components/project/create-project-flow";
import { CreativesFlow } from "@/components/project/creatives-flow";
import { CampaignCreationFlow } from "@/components/project/campaign-creation-flow";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { useCurrentScope, useCurrentWorkspaceLabel } from "@/lib/workspace-store";

function fmtRate(v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

/** "₹14.6L" / "14.6 L" -> 14.6  (lakhs). */
function lakhsFromDisplay(label: string | number | undefined | null): number {
  if (label === undefined || label === null) return 0;
  const m = String(label).match(/([0-9]+(\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/** ₹X formatter — auto-scales to K / L for readability. */
function fmtRupees(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

/** Stacked metric cell — primary value above, small subtext below. */
function MetricStack({
  value,
  sub,
  align = "right",
  emphasize,
}: {
  value: string | number;
  sub?: string;
  align?: "left" | "right";
  emphasize?: boolean;
}) {
  return (
    <div style={{ textAlign: align }}>
      <div
        className="tabular-nums"
        style={{
          fontSize: 13.5,
          fontWeight: emphasize ? 600 : 500,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="tabular-nums"
          style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function HealthPill({ health }: { health: "on-track" | "needs-attention" | "underperforming" }) {
  const map = {
    "on-track": { label: "On track", cls: "pill-ok" },
    "needs-attention": { label: "Attention", cls: "pill-warn" },
    underperforming: { label: "Low", cls: "pill-err" },
  } as const;
  const c = map[health];
  return <span className={`pill ${c.cls}`}>{c.label}</span>;
}

function GoalProgress({
  goal,
}: {
  goal: ReturnType<typeof projectRollup> extends infer R ? R extends { goal: infer G } ? G : never : never;
}) {
  if (!goal) return <span className="text-[11px] text-text-tertiary">no goal</span>;
  const pct = Math.min(100, Math.round((goal.achieved / goal.target) * 100));
  const expectedPct = Math.round((goal.daysElapsed / goal.daysTotal) * 100);
  const paceCls =
    goal.pace === "ahead"
      ? "pill-ok"
      : goal.pace === "on-pace"
      ? "pill-info"
      : "pill-err";
  return (
    <div>
      <div className="flex items-baseline gap-1 text-[11px] mb-1">
        <span className="tabular-nums font-semibold text-text-primary">{goal.achieved}</span>
        <span className="text-text-tertiary">/ {goal.target}</span>
        <span className={`pill ${paceCls} ml-auto`} style={{ fontSize: 9.5, padding: "1px 6px", letterSpacing: 0.3, fontWeight: 700, textTransform: "uppercase" }}>
          {goal.paceDelta}
        </span>
      </div>
      <div className="relative h-[5px] rounded-full bg-surface-secondary overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${expectedPct}%`,
            background:
              "repeating-linear-gradient(45deg, transparent 0 3px, rgba(0,0,0,0.06) 3px 6px)",
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, background: "#0A0A0A" }}
        />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [creativesFlow, setCreativesFlow] = useState<{ projectId: string } | null>(null);
  const [campaignFlow, setCampaignFlow] = useState<{ projectId: string } | null>(null);
  const askSpot = useSpotStore((s) => s.askSpot);
  const scope = useCurrentScope();
  const wsLabel = useCurrentWorkspaceLabel();

  const filteredProjects = projectsForWorkspace(scope.kind === "all" ? undefined : scope.id);
  const rows = filteredProjects.map((d) => {
    const rollup = projectRollup(d.id)!;
    const p = { id: d.id, name: d.name, category: d.category, status: d.status, health: d.health };
    return { p, d, rollup };
  });

  const totalSpend = rows.reduce((s, r) => {
    // values are like "₹14.6L" — strip and sum in lakhs
    const v = String(r.rollup.spend).replace(/[₹,L\s]/g, "");
    return s + (parseFloat(v) || 0);
  }, 0);
  const totalLeads = rows.reduce((s, r) => s + r.rollup.totalLeads, 0);
  const totalVerified = rows.reduce((s, r) => s + r.rollup.verifiedLeads, 0);
  const totalQualified = rows.reduce((s, r) => s + r.rollup.qualifiedLeads, 0);
  const totalVerifRate = totalLeads ? (totalVerified / totalLeads) * 100 : null;
  const totalQualRate = totalLeads ? (totalQualified / totalLeads) * 100 : null;

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[12px] text-text-secondary mb-1">
            {wsLabel} · Lead Generation
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Projects</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              askSpot("Audit every project — which is on pace and which needs attention?", {
                kind: "workspace",
                label: "Workspace",
              })
            }
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button border border-border bg-white hover:border-border-hover hover:bg-surface-page text-[12.5px] font-medium transition-colors"
          >
            <SpotMark size={13} />
            Ask Spot about portfolio
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button bg-accent text-white hover:bg-accent-hover text-[12.5px] font-medium transition-colors"
          >
            <Plus size={13} />
            New project
          </button>
        </div>
      </div>

      {/* Portfolio table — each lead-tier cell shows count + ratio + cost
          per unit so admins can spot funnel issues at a glance. */}
      {(() => {
        const COLS =
          "minmax(200px, 2fr) 90px 120px 120px minmax(150px, 1.4fr) 90px 20px";
        const gridStyle: React.CSSProperties = {
          gridTemplateColumns: COLS,
          columnGap: 18,
        };
        // Portfolio CPL/CPVL/CPQL (spend in lakhs * 100000)
        const portfolioSpendRupees = totalSpend * 100000;
        const portfolioCPL = totalLeads ? portfolioSpendRupees / totalLeads : null;
        const portfolioCPVL = totalVerified ? portfolioSpendRupees / totalVerified : null;
        const portfolioCPQL = totalQualified ? portfolioSpendRupees / totalQualified : null;
        return (
          <div className="card-base overflow-x-auto">
            <div style={{ minWidth: 880 }}>
              {/* Table header */}
              <div
                className="grid items-center px-5 py-2.5 border-b border-border bg-surface-page text-[10px] uppercase tracking-[0.04em] font-semibold text-text-tertiary"
                style={gridStyle}
              >
                <span>Project</span>
                <span className="text-right">Spend</span>
                <span className="text-right">Leads</span>
                <span className="text-right">Verified</span>
                <span className="text-right">Qualified</span>
                <span>Goal progress</span>
                <span className="text-right">Health</span>
                <span />
              </div>

              {rows.map(({ p, d, rollup }, i) => {
                const last = i === rows.length - 1;
                const spendRupees = lakhsFromDisplay(rollup.spend) * 100000;
                const cpl = rollup.totalLeads ? spendRupees / rollup.totalLeads : null;
                const cpvl = rollup.verifiedLeads ? spendRupees / rollup.verifiedLeads : null;
                const cpql = rollup.qualifiedLeads ? spendRupees / rollup.qualifiedLeads : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className={`hover-row text-left w-full grid items-center px-5 py-3.5 ${
                      last ? "" : "border-b border-border-subtle"
                    }`}
                    style={gridStyle}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex-shrink-0 flex items-center justify-center"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 7,
                          background: `linear-gradient(135deg, oklch(0.92 0.04 ${(p.id.length * 47) % 360}) 0%, oklch(0.78 0.06 ${
                            (p.id.length * 47 + 40) % 360
                          }) 100%)`,
                          color: "rgba(0,0,0,0.5)",
                        }}
                      >
                        <Folder size={13} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold truncate leading-tight">
                          {p.name.split(" · ")[0]}
                        </div>
                        <div className="text-[10.5px] text-text-tertiary truncate">
                          {p.category}
                          {d?.micromarket ? ` · ${d.micromarket.split(" · ")[0]}` : ""}
                        </div>
                      </div>
                    </div>
                    <MetricStack value={rollup.spend} sub="total" align="right" emphasize />
                    <MetricStack
                      value={rollup.totalLeads.toLocaleString()}
                      sub={cpl ? `${fmtRupees(cpl)} CPL` : "—"}
                      align="right"
                    />
                    <MetricStack
                      value={rollup.verifiedLeads.toLocaleString()}
                      sub={
                        rollup.verifRate
                          ? `${rollup.verifRate.toFixed(1)}% · ${cpvl ? fmtRupees(cpvl) : "—"} CPVL`
                          : "—"
                      }
                      align="right"
                    />
                    <MetricStack
                      value={rollup.qualifiedLeads.toLocaleString()}
                      sub={
                        rollup.qualRate
                          ? `${rollup.qualRate.toFixed(1)}% · ${cpql ? fmtRupees(cpql) : "—"} CPQL`
                          : "—"
                      }
                      align="right"
                    />
                    <GoalProgress goal={rollup.goal} />
                    <div className="flex justify-end">
                      <HealthPill health={p.health} />
                    </div>
                    <ChevronRight size={14} className="text-text-tertiary" />
                  </button>
                );
              })}

              {/* Footer totals */}
              <div
                className="grid items-center px-5 py-3 border-t border-border bg-surface-page text-[12px] font-medium"
                style={gridStyle}
              >
                <span>Portfolio total</span>
                <MetricStack value={`₹${totalSpend.toFixed(1)}L`} sub={`${rows.length} projects`} align="right" emphasize />
                <MetricStack
                  value={totalLeads.toLocaleString()}
                  sub={portfolioCPL ? `${fmtRupees(portfolioCPL)} CPL` : "—"}
                  align="right"
                />
                <MetricStack
                  value={totalVerified.toLocaleString()}
                  sub={
                    totalVerifRate
                      ? `${totalVerifRate.toFixed(1)}% · ${portfolioCPVL ? fmtRupees(portfolioCPVL) : "—"} CPVL`
                      : "—"
                  }
                  align="right"
                />
                <MetricStack
                  value={totalQualified.toLocaleString()}
                  sub={
                    totalQualRate
                      ? `${totalQualRate.toFixed(1)}% · ${portfolioCPQL ? fmtRupees(portfolioCPQL) : "—"} CPQL`
                      : "—"
                  }
                  align="right"
                />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Spot ambient strip — copy + chips re-template by current scope.
          When there are no projects (members in an empty workspace, or
          aggregating with zero) we skip the strip entirely. */}
      {rows.length > 0 && (() => {
        const behind = rows.filter((r) => r.rollup.goal.pace === "behind");
        const ahead = rows.filter((r) => r.rollup.goal.pace === "ahead");
        const onPace = rows.length - behind.length - ahead.length;
        const scopeQualifier =
          scope.kind === "all"
            ? `across ${rows.length} projects in all workspaces`
            : `across ${wsLabel}'s ${rows.length} project${rows.length === 1 ? "" : "s"}`;
        const summary =
          behind.length === 0
            ? `Everything's holding pace ${scopeQualifier}. I'll flag if anything starts slipping.`
            : behind.length === rows.length
            ? `Every project ${scopeQualifier} is behind pace. The portfolio needs attention — start with the worst goal-gap.`
            : `${behind.length} of ${rows.length} ${scopeQualifier} ${behind.length === 1 ? "is" : "are"} behind pace${ahead.length ? `, ${ahead.length} ahead` : ""}. ${onPace ? `The rest ${onPace === 1 ? "is" : "are"} on pace.` : ""}`;
        const worstName = behind[0]?.p.name.split(" · ")[0];
        const chips = [
          worstName ? `Why is ${worstName} behind pace?` : null,
          rows.length > 1 ? "Compare all projects on CPVL" : null,
          "Model a reallocation",
          scope.kind === "all"
            ? "Which workspace is pulling weight?"
            : `Audit ${wsLabel}'s portfolio`,
        ].filter((q): q is string => !!q);
        return (
          <div className="spot-reply mt-6 p-4 flex items-start gap-3">
            <SpotMark size={20} />
            <div className="flex-1">
              <div className="uplabel mb-1">Spot · portfolio read</div>
              <div className="text-[13.5px] leading-[1.5] text-text-primary">{summary}</div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {chips.map((q) => (
                  <button
                    key={q}
                    onClick={() =>
                      askSpot(q, {
                        kind: "workspace",
                        label: wsLabel,
                      })
                    }
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover hover:bg-surface-page"
                  >
                    <ArrowUpRight size={11} /> {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {createOpen && (
        <CreateProjectFlow
          onClose={() => setCreateOpen(false)}
          onComplete={(id, action) => {
            setCreateOpen(false);
            if (action === "creatives") {
              // Hand off to the creatives flow next.
              setCreativesFlow({ projectId: id });
            } else {
              router.push(`/projects/${id}`);
            }
          }}
        />
      )}

      {creativesFlow && (
        <CreativesFlow
          projectId={creativesFlow.projectId}
          onClose={() => setCreativesFlow(null)}
          onComplete={(id, action) => {
            setCreativesFlow(null);
            if (action === "campaign") {
              setCampaignFlow({ projectId: id });
            } else {
              router.push(`/projects/${id}`);
            }
          }}
        />
      )}

      {campaignFlow && (
        <CampaignCreationFlow
          projectId={campaignFlow.projectId}
          onClose={() => setCampaignFlow(null)}
          onLaunched={(id) => {
            setCampaignFlow(null);
            router.push(`/projects/${id}`);
          }}
        />
      )}
    </motion.div>
  );
}
