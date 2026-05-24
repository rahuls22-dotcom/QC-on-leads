"use client";

import { BarChart3, Sparkles, TrendingUp, Users, Target } from "lucide-react";
import type { ProjectDetail } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";

/**
 * Dashboard tab — project-level analytics view. PR 1 ships a placeholder
 * with the at-a-glance numbers; the full charts + persona ranking + insights
 * land in PR 3.
 */
export function DashboardSection({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const personaCount = project.personas.length;
  const creativeCount = project.personas.reduce(
    (n, p) => n + p.angles.reduce((m, a) => m + a.concept.creatives.length, 0),
    0,
  );
  const liveAngles = project.personas.reduce(
    (n, p) => n + p.angles.filter((a) => a.status === "live").length,
    0,
  );
  const liveCampaigns = project.mediaPlan.rows.filter((r) => r.status === "live").length;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BarChart3}
        title="Dashboard"
        subtitle="how this project is doing — top of the funnel down to verified leads"
      />

      {/* At-a-glance cards */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}
      >
        <StatCard
          icon={<Target size={14} />}
          label="Verified leads"
          value={String(project.goal.achieved)}
          sub={project.goal.target > 0 ? `of ${project.goal.target} goal` : "no goal set"}
        />
        <StatCard
          icon={<Users size={14} />}
          label="Personas"
          value={String(personaCount)}
          sub={`${liveAngles} angle${liveAngles === 1 ? "" : "s"} live`}
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Live campaigns"
          value={String(liveCampaigns)}
          sub={`${project.mediaPlan.rows.length} total`}
        />
        <StatCard
          icon={<BarChart3 size={14} />}
          label="Creatives"
          value={String(creativeCount)}
          sub="across all angles"
        />
      </div>

      {/* Coming-soon panel — sets expectation for the next pass */}
      <div
        className="rounded-[12px] p-5"
        style={{
          background:
            "linear-gradient(135deg, #FBF7FF 0%, #FFFDF6 60%, #FFFFFF 100%)",
          border: "1px dashed #DCC8FF",
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
              boxShadow: "0 6px 16px rgba(124,58,237,0.22)",
            }}
          >
            <Sparkles size={16} />
          </span>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold mb-1">
              Trend charts, persona ranking, and Spot insights are coming next
            </div>
            <div className="text-[12px] text-text-secondary leading-[1.55] mb-2.5">
              Once the campaigns redesign lands you&apos;ll see verified-lead
              velocity, CPVL trends, per-persona performance and the wins/losses
              Spot has surfaced this week — all on this tab.
            </div>
            <button
              type="button"
              onClick={() =>
                onAsk(
                  "Summarize how this project is performing this week against goal",
                )
              }
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button bg-white text-[12px] text-text-secondary hover:text-text-primary"
              style={{ border: "1px solid var(--border)" }}
            >
              <Sparkles size={11} /> Ask Spot for a weekly recap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card-base p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5 text-text-tertiary">
        {icon}
        <span className="uplabel" style={{ fontSize: 9.5 }}>
          {label}
        </span>
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div className="text-[10.5px] text-text-tertiary mt-0.5">{sub}</div>
    </div>
  );
}
