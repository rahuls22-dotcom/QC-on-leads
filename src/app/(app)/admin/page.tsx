"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Users, TrendingUp, TrendingDown, UserPlus, Clock } from "lucide-react";
import { RevspotLogo } from "@/components/layout/revspot-logo";
import {
  WORKSPACES,
  type Workspace,
} from "@/lib/workspace-data";
import {
  useCurrentScope,
  useCurrentUser,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import { projectsForWorkspace, projectRollup } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { PacePill } from "@/components/project/shared/pace-pill";
import { InviteUserModal } from "@/components/invite/invite-user-modal";
import { useInviteStore } from "@/lib/invite-data";

function lakhFromSpend(label: string) {
  // "₹14.6L" → 14.6
  const m = label.match(/([0-9]+(\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function fmtRupees(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function WorkspaceRow({ ws }: { ws: Workspace }) {
  const router = useRouter();
  const setScope = useWorkspaceStore((s) => s.setScope);
  const projects = projectsForWorkspace(ws.id);
  const totals = projects.reduce(
    (acc, p) => {
      const r = projectRollup(p.id)!;
      return {
        spendL: acc.spendL + lakhFromSpend(r.spend),
        totalLeads: acc.totalLeads + r.totalLeads,
        verified: acc.verified + r.verifiedLeads,
        qualified: acc.qualified + r.qualifiedLeads,
        target: acc.target + p.goal.target,
        achieved: acc.achieved + p.goal.achieved,
      };
    },
    { spendL: 0, totalLeads: 0, verified: 0, qualified: 0, target: 0, achieved: 0 },
  );
  const verifRate = totals.totalLeads ? (totals.verified / totals.totalLeads) * 100 : 0;
  const qualRate = totals.totalLeads ? (totals.qualified / totals.totalLeads) * 100 : 0;
  const goalPct = totals.target ? (totals.achieved / totals.target) * 100 : 0;
  const spendRupees = totals.spendL * 100000;
  const cpl = totals.totalLeads ? spendRupees / totals.totalLeads : null;
  const cpvl = totals.verified ? spendRupees / totals.verified : null;
  const cpql = totals.qualified ? spendRupees / totals.qualified : null;
  // Rough pace from project goal data (weighted average of paceDelta sign)
  const avgPaceDelta =
    projects.reduce((s, p) => {
      const sign = p.goal.paceDelta.startsWith("−") || p.goal.paceDelta.startsWith("-") ? -1 : p.goal.paceDelta.startsWith("+") ? 1 : 0;
      const num = parseInt(p.goal.paceDelta.replace(/[^0-9]/g, ""), 10) || 0;
      return s + sign * num;
    }, 0) / Math.max(1, projects.length);
  const pace: "ahead" | "on-pace" | "behind" =
    avgPaceDelta >= 3 ? "ahead" : avgPaceDelta <= -3 ? "behind" : "on-pace";
  const paceDelta = `${avgPaceDelta > 0 ? "+" : ""}${avgPaceDelta.toFixed(0)}%`;

  return (
    <button
      type="button"
      onClick={() => {
        setScope(ws.id);
        router.push("/projects");
      }}
      className="card-base hover-row w-full text-left p-4 flex items-start gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[15px] font-semibold leading-tight">{ws.name}</span>
          <PacePill pace={pace} delta={paceDelta} />
        </div>
        <div className="text-[11.5px] text-text-tertiary mb-3">
          {ws.region} · {ws.memberCount} members · {projects.length} project
          {projects.length === 1 ? "" : "s"}
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          <Metric label="Spend" value={`₹${totals.spendL.toFixed(1)}L`} sub={`${projects.length} projects`} />
          <Metric
            label="Leads"
            value={totals.totalLeads.toLocaleString()}
            sub={cpl ? `${fmtRupees(cpl)} CPL` : "—"}
          />
          <Metric
            label="Verified"
            value={totals.verified.toLocaleString()}
            sub={`${verifRate.toFixed(1)}% · ${cpvl ? fmtRupees(cpvl) : "—"} CPVL`}
          />
          <Metric
            label="Qualified"
            value={totals.qualified.toLocaleString()}
            sub={`${qualRate.toFixed(1)}% · ${cpql ? fmtRupees(cpql) : "—"} CPQL`}
          />
          <Metric
            label="Goal progress"
            value={`${goalPct.toFixed(0)}%`}
            sub={`${totals.achieved} / ${totals.target}`}
          />
        </div>
      </div>
      <ChevronRight size={16} className="text-text-tertiary flex-shrink-0 mt-1.5" />
    </button>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="uplabel" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <div className="tabular-nums" style={{ fontSize: 17, fontWeight: 600, marginTop: 1 }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-text-tertiary tabular-nums leading-tight">{sub}</div>}
    </div>
  );
}

function PortfolioKpi({
  label,
  value,
  delta,
  good,
}: {
  label: string;
  value: string;
  delta?: string;
  good?: boolean;
}) {
  return (
    <div className="card-base p-3.5">
      <div className="uplabel" style={{ fontSize: 10 }}>{label}</div>
      <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>
        {value}
      </div>
      {delta && (
        <div
          className="text-[11px] flex items-center gap-1 mt-0.5"
          style={{
            color: good === undefined ? "var(--text-tertiary)" : good ? "var(--ok-fg)" : "var(--err-fg)",
          }}
        >
          {good === undefined ? null : good ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {delta}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const scope = useCurrentScope();
  const askSpot = useSpotStore((s) => s.askSpot);
  const invites = useInviteStore((s) => s.invites);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Members shouldn't see this page — redirect to /projects.
  useEffect(() => {
    if (user.role !== "admin") router.replace("/projects");
  }, [user.role, router]);

  // Aggregate across all workspaces
  const allProjects = WORKSPACES.flatMap((w) => projectsForWorkspace(w.id));
  const portfolioTotals = allProjects.reduce(
    (acc, p) => {
      const r = projectRollup(p.id)!;
      return {
        spendL: acc.spendL + lakhFromSpend(r.spend),
        totalLeads: acc.totalLeads + r.totalLeads,
        verified: acc.verified + r.verifiedLeads,
        qualified: acc.qualified + r.qualifiedLeads,
        target: acc.target + p.goal.target,
        achieved: acc.achieved + p.goal.achieved,
      };
    },
    { spendL: 0, totalLeads: 0, verified: 0, qualified: 0, target: 0, achieved: 0 },
  );
  const portfolioVerifRate = portfolioTotals.totalLeads
    ? (portfolioTotals.verified / portfolioTotals.totalLeads) * 100
    : 0;
  const portfolioCPVL = portfolioTotals.verified
    ? Math.round((portfolioTotals.spendL * 100000) / portfolioTotals.verified)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[12px] text-text-secondary mb-1 flex items-center gap-1.5">
            <RevspotLogo size={13} /> All workspaces
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Portfolio overview</h1>
          <div className="text-[12.5px] text-text-secondary mt-1">
            Cross-workspace view for {user.name} ·{" "}
            <span className="pill pill-dark" style={{ fontSize: 9.5, padding: "0 5px" }}>
              Admin
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              askSpot("Compare all three workspaces — who's pulling weight, who's behind?", {
                kind: "workspace",
                label: "All workspaces",
              })
            }
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px]"
          >
            <SpotMark size={13} /> Ask Spot about portfolio
          </button>
        </div>
      </div>

      {/* Portfolio KPI strip */}
      <div className="grid mb-6" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <PortfolioKpi label="Portfolio spend" value={`₹${portfolioTotals.spendL.toFixed(1)}L`} delta="+12% w/w" />
        <PortfolioKpi label="Total leads" value={portfolioTotals.totalLeads.toLocaleString()} delta="+4% w/w" good />
        <PortfolioKpi
          label="Verified leads"
          value={portfolioTotals.verified.toString()}
          delta={`${portfolioVerifRate.toFixed(1)}% rate`}
        />
        <PortfolioKpi
          label="Portfolio CPVL"
          value={`₹${portfolioCPVL.toLocaleString()}`}
          delta="−3% vs last 30d"
          good
        />
        <PortfolioKpi
          label="Goal progress"
          value={`${Math.round((portfolioTotals.achieved / portfolioTotals.target) * 100)}%`}
          delta={`${portfolioTotals.achieved} / ${portfolioTotals.target}`}
        />
      </div>

      {/* Per-workspace rows */}
      <div className="mb-4">
        <div className="uplabel mb-3" style={{ fontSize: 10 }}>
          By workspace
        </div>
        <div className="space-y-2.5">
          {WORKSPACES.map((w) => (
            <WorkspaceRow key={w.id} ws={w} />
          ))}
        </div>
      </div>

      {/* Spot portfolio read */}
      <div className="spot-reply p-4 flex items-start gap-3 mt-6">
        <SpotMark size={20} />
        <div className="flex-1">
          <div className="uplabel mb-1">Spot · cross-workspace read</div>
          <div className="text-[13.5px] leading-[1.55]">
            <strong>NCR</strong> is pulling weight (+2% pace, CPVL holding under ₹5K).
            <strong> South</strong> is the drag — Banerghatta is 21% behind and Kukatpally is 56%
            behind. <strong>MMR</strong> is mixed — Reserve is steady, Varanya is 18% behind. The
            single biggest unlock right now is fixing Kukatpally&apos;s positioning.
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[
              "Which workspace should we shift budget to?",
              "Compare CPVL across all 3 workspaces",
              "Find winning creatives I should clone across regions",
              "Schedule a weekly portfolio review for me",
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() =>
                  askSpot(q, { kind: "workspace", label: "All workspaces" })
                }
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
              >
                <ArrowUpRight size={11} /> {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Team access card */}
      <div className="card-base mt-4 overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3.5 border-b border-border-subtle">
          <div className="flex items-center justify-center w-9 h-9 rounded-[7px] bg-surface-secondary flex-shrink-0">
            <Users size={15} />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-0.5">Team access</div>
            <div className="text-[11.5px] text-text-secondary leading-[1.5]">
              22 active members across 3 workspaces. You and 2 other admins have cross-workspace
              access; regional leads are scoped to their own.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="apply-btn flex-shrink-0"
          >
            <UserPlus size={11} /> Invite teammates
          </button>
        </div>

        {invites.length > 0 && (
          <div className="px-4 py-3 bg-surface-page">
            <div className="uplabel mb-2" style={{ fontSize: 10 }}>
              Pending invitations · {invites.length}
            </div>
            <div className="space-y-1.5">
              {invites.slice(0, 5).map((inv) => {
                const inviteWsLabels = inv.workspaceIds
                  .map((id) => WORKSPACES.find((w) => w.id === id)?.name)
                  .filter(Boolean)
                  .join(" · ");
                const minutesAgo = Math.max(1, Math.round((Date.now() - inv.invitedAt) / 60000));
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-[6px] bg-white border border-border-subtle"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-secondary flex-shrink-0 text-[10px] font-medium text-text-secondary">
                      {inv.email[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-medium truncate">{inv.email}</span>
                        <span
                          className={`pill ${inv.role === "admin" ? "pill-dark" : ""}`}
                          style={{ fontSize: 9.5, padding: "0 6px" }}
                        >
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-text-tertiary truncate">
                        {inv.role === "admin" ? "All workspaces" : inviteWsLabels} · invited{" "}
                        {minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`}
                      </div>
                    </div>
                    <span className="pill pill-warn flex-shrink-0" style={{ fontSize: 10 }}>
                      <Clock size={9} /> Pending
                    </span>
                  </div>
                );
              })}
            </div>
            {invites.length > 5 && (
              <div className="text-[11px] text-text-tertiary text-center mt-2">
                + {invites.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </motion.div>
  );
}
