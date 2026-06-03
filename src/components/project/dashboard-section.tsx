"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Sparkles,
  Target,
  ArrowUpRight,
  Star,
  Video as VideoIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";
import type { ProjectDetail, Persona } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import {
  computeMetrics,
  computeTotalSpend,
  formatMetric,
  formatDelta,
  deltaColor,
  type MetricSnapshot,
} from "./dashboard-metrics";
import {
  Sparkline,
  ComparisonChart,
  MAX_COMPARISON_METRICS,
  colorForIndex,
} from "./metric-charts";
import { getWinningConcept, type WinningConcept } from "./persona-hierarchy";
import { PlacementsAnalysis } from "./placements-analysis";

/**
 * Dashboard tab — project pulse.
 *
 * Two metric rows only:
 *   · Outcomes — Verified · Qualified · CPVL · CPQL
 *   · Pipeline — Total leads · CPL · Verification rate · Qualification rate
 *
 * Spend lives on the pacing strip alongside the goal — it's pacing context,
 * not a comparable metric tile. Daily-burn and days-to-goal are inferable
 * from pacing + spend, so they're dropped to reduce noise.
 *
 * Click any tile to add the metric to the comparison chart. Up to four
 * metrics can be compared at once; tiles selected in the comparison show
 * a colored ring + sparkline matching the chart line.
 */
export function DashboardSection({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const metrics = useMemo(() => computeMetrics(project), [project]);

  // Up to MAX_COMPARISON_METRICS keys selected for the comparison chart.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const toggleSelected = (key: string) => {
    setSelectedKeys((cur) => {
      const isSelected = cur.includes(key);
      if (isSelected) return cur.filter((k) => k !== key);
      if (cur.length >= MAX_COMPARISON_METRICS) {
        // At capacity — drop the oldest selection to make room for the new
        // one, FIFO. This keeps the toggle action feeling immediate
        // rather than silently failing.
        return [...cur.slice(1), key];
      }
      return [...cur, key];
    });
  };

  const selectedSnapshots = selectedKeys
    .map((k) => metrics.find((m) => m.def.key === k))
    .filter((m): m is MetricSnapshot => m != null);

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={BarChart3}
        title="Dashboard"
        subtitle="project pulse · click tiles to add up to 4 metrics to one chart"
        onAsk={() =>
          onAsk("Summarize how this project is performing this week against goal")
        }
        actions={
          <a
            href={`/projects/${project.id}/deep/dashboard`}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
          >
            <ArrowUpRight size={11} /> Deep dive
          </a>
        }
      />

      <PacingStrip project={project} />

      <MetricGroup
        title="Outcomes"
        sub="goal-relevant numbers"
        metrics={metrics.filter((m) => m.def.category === "outcome")}
        selectedKeys={selectedKeys}
        onToggle={toggleSelected}
      />

      <MetricGroup
        title="Pipeline"
        sub="lead flow + conversion"
        metrics={metrics.filter((m) => m.def.category === "pipeline")}
        selectedKeys={selectedKeys}
        onToggle={toggleSelected}
      />

      {selectedSnapshots.length > 0 && (
        <ComparisonPanel
          snapshots={selectedSnapshots}
          selectedKeys={selectedKeys}
          onRemove={(key) =>
            setSelectedKeys((cur) => cur.filter((k) => k !== key))
          }
          onClearAll={() => setSelectedKeys([])}
          project={project}
        />
      )}

      <PersonaPerformance project={project} />
      <PlacementsAnalysis project={project} />
      <SpotInsightsCard project={project} onAsk={onAsk} />
    </div>
  );
}

// ─── Pacing strip ───────────────────────────────────────────────────────

function PacingStrip({ project }: { project: ProjectDetail }) {
  const goal = project.goal;
  const goalSet = goal.target > 0;
  const spend = useMemo(() => computeTotalSpend(project), [project]);
  return (
    <div
      className="rounded-[12px] p-4"
      style={{
        background:
          "linear-gradient(135deg, #FBF7FF 0%, #FFFDF6 60%, #FFFFFF 100%)",
        border: "1px solid #DCC8FF",
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
            }}
          >
            <Target size={16} />
          </span>
          <div>
            <div
              className="uplabel"
              style={{ fontSize: 9.5, color: "#7C3AED", letterSpacing: "0.4px" }}
            >
              {goalSet ? `Goal · ${goal.kind} leads` : "Goal"}
            </div>
            <div className="text-[15px] font-semibold leading-tight">
              {goalSet ? `${goal.achieved} / ${goal.target}` : "No goal set"}
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: "var(--border-subtle)" }} />

        <PacingStat
          label="Day"
          value={goalSet ? `${goal.daysElapsed} / ${goal.daysTotal}` : "—"}
        />
        <PacingStat
          label="Forecast"
          value={goalSet ? `${goal.forecast}` : "—"}
          accent={
            goalSet && goal.forecast >= goal.target
              ? "var(--ok-fg)"
              : "var(--err-fg)"
          }
        />
        <PacingStat
          label="Pace"
          value={goalSet ? goal.pace : "—"}
          accent={
            goal.pace === "ahead"
              ? "var(--ok-fg)"
              : goal.pace === "behind"
                ? "var(--err-fg)"
                : "var(--text-1)"
          }
        />
        <PacingStat
          label="Spend to date"
          value={spend > 0 ? formatSpend(spend) : "—"}
        />

        <div className="flex-1" />

        {goalSet ? (
          <div className="text-[11px] text-text-tertiary italic max-w-[280px] text-right">
            {goal.spotRead}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PacingStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="uplabel" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: accent || "var(--text-1)",
          textTransform: "capitalize",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function formatSpend(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
}

// ─── Metric group ───────────────────────────────────────────────────────

function MetricGroup({
  title,
  sub,
  metrics,
  selectedKeys,
  onToggle,
}: {
  title: string;
  sub: string;
  metrics: MetricSnapshot[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
}) {
  if (metrics.length === 0) return null;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="uplabel" style={{ fontSize: 9.5 }}>
          {title}
        </span>
        <span className="text-[10.5px] text-text-tertiary">{sub}</span>
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, minmax(0,1fr))`,
        }}
      >
        {metrics.map((m) => {
          const selectedIdx = selectedKeys.indexOf(m.def.key);
          return (
            <MetricTile
              key={m.def.key}
              snapshot={m}
              selectedIdx={selectedIdx}
              onClick={() => onToggle(m.def.key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MetricTile({
  snapshot,
  selectedIdx,
  onClick,
}: {
  snapshot: MetricSnapshot;
  /** -1 if not selected. Otherwise its index in the comparison set. */
  selectedIdx: number;
  onClick: () => void;
}) {
  const selected = selectedIdx >= 0;
  const seriesColor = selected ? colorForIndex(selectedIdx) : undefined;
  const goodTrend =
    !snapshot.delta || snapshot.delta.sign === "flat"
      ? undefined
      : snapshot.def.higherIsBetter
        ? snapshot.delta.sign === "up"
        : snapshot.delta.sign === "down";

  return (
    <button
      type="button"
      onClick={onClick}
      className="card-base p-3 text-left transition-shadow"
      style={{
        background: "#FFF",
        border: `1.5px solid ${selected ? seriesColor! : "var(--border-subtle)"}`,
        boxShadow: selected ? `0 4px 12px ${withAlpha(seriesColor!, 0.15)}` : "none",
        cursor: "pointer",
        position: "relative",
      }}
      title={
        selected
          ? `Selected — click to remove from comparison · ${snapshot.def.hint}`
          : `Click to add to the comparison chart · ${snapshot.def.hint}`
      }
    >
      {selected && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: seriesColor!,
          }}
        />
      )}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="uplabel truncate"
          style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}
        >
          {snapshot.def.label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div
            className="tabular-nums"
            style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.05 }}
          >
            {formatMetric(snapshot.current, snapshot.def.unit)}
          </div>
          <div
            className="text-[10px] tabular-nums mt-1"
            style={{
              color: deltaColor(snapshot.delta, snapshot.def.higherIsBetter),
            }}
          >
            {formatDelta(snapshot.delta)}
          </div>
        </div>
        <Sparkline
          series={snapshot.series}
          trendUp={goodTrend}
          strokeOverride={selected ? seriesColor : undefined}
          fillOverride={selected ? withAlpha(seriesColor!, 0.12) : undefined}
        />
      </div>
    </button>
  );
}

function withAlpha(hex: string, alpha: number): string {
  // Naive hex → rgba converter for the small palette we use.
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Comparison panel ───────────────────────────────────────────────────

function ComparisonPanel({
  snapshots,
  selectedKeys,
  onRemove,
  onClearAll,
  project,
}: {
  snapshots: MetricSnapshot[];
  selectedKeys: string[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  project: ProjectDetail;
}) {
  const colors = selectedKeys.map((_, i) => colorForIndex(i));
  const atCapacity = snapshots.length >= MAX_COMPARISON_METRICS;
  return (
    <div className="card-base p-4 fadeUp">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div
            className="uplabel mb-1"
            style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}
          >
            Comparison · last 14 days
          </div>
          <div className="text-[11.5px] text-text-secondary leading-[1.5]">
            {snapshots.length === 1
              ? "Pick another tile to overlay a second metric."
              : atCapacity
                ? `Showing ${snapshots.length} metrics — max ${MAX_COMPARISON_METRICS}. Click an extra tile to swap the oldest out.`
                : `Showing ${snapshots.length} metrics. Add up to ${MAX_COMPARISON_METRICS - snapshots.length} more by clicking tiles.`}
          </div>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary"
        >
          <X size={11} /> Clear all
        </button>
      </div>

      <ComparisonChart snapshots={snapshots} colors={colors} onRemove={onRemove} />

      {/* If a single metric is selected, surface its hint + per-persona
          breakdown when relevant (verified / cpvl / leads). */}
      {snapshots.length === 1 && (
        <div
          className="text-[11.5px] text-text-secondary mt-3 pt-3 leading-[1.5]"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {snapshots[0].def.hint}
        </div>
      )}
      {snapshots.length === 1 && (
        <PersonaBreakdown project={project} metricKey={snapshots[0].def.key} />
      )}
    </div>
  );
}

function PersonaBreakdown({
  project,
  metricKey,
}: {
  project: ProjectDetail;
  metricKey: string;
}) {
  if (!["verified", "cpvl", "leads"].includes(metricKey)) return null;
  const cells = project.personas.map((p) => {
    let display: string = "—";
    if (metricKey === "verified") display = String(p.verifiedLeads);
    if (metricKey === "cpvl") display = p.cpvl;
    if (metricKey === "leads") display = String(p.verifiedLeads * 2);
    return { id: p.id, name: p.name, share: p.share, display };
  });
  if (cells.length === 0) return null;
  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div className="uplabel mb-2" style={{ fontSize: 9.5 }}>
        By persona
      </div>
      <div className="space-y-1.5">
        {cells.map((c) => (
          <div key={c.id} className="flex items-center gap-3 text-[11.5px]">
            <span className="flex-1 min-w-0 truncate font-medium">{c.name}</span>
            <span
              className="tabular-nums text-text-tertiary"
              style={{ width: 48, textAlign: "right" }}
            >
              {c.share}%
            </span>
            <span className="tabular-nums" style={{ width: 96, textAlign: "right" }}>
              {c.display}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Persona performance (with TOFU-based winning concept) ──────────────

function PersonaPerformance({ project }: { project: ProjectDetail }) {
  const ranked = [...project.personas].sort((a, b) => {
    if (b.verifiedLeads !== a.verifiedLeads)
      return b.verifiedLeads - a.verifiedLeads;
    return b.share - a.share;
  });
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="uplabel" style={{ fontSize: 9.5 }}>
            Persona performance
          </span>
          <span className="text-[10.5px] text-text-tertiary">
            winning concept picked on TOFU signal only · CTR for static · Hook Rate for video
          </span>
        </div>
      </div>
      <div className="card-base overflow-hidden">
        <div
          className="grid px-3.5 py-2 text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold"
          style={{
            gridTemplateColumns:
              "32px 1.6fr 1.8fr 0.7fr 0.7fr 0.7fr 0.7fr 0.6fr",
            background: "var(--bg-page)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span>#</span>
          <span>Persona</span>
          <span>Winning concept</span>
          <span className="text-right">TOFU</span>
          <span className="text-right">CVR</span>
          <span className="text-right">Verified</span>
          <span className="text-right">CPVL</span>
          <span className="text-right">Share</span>
        </div>
        {ranked.map((p, i) => (
          <PersonaPerformanceRow key={p.id} rank={i + 1} persona={p} />
        ))}
        {project.personas.length === 0 && (
          <div className="px-3.5 py-6 text-center text-[12px] text-text-tertiary">
            No personas yet — add one on the Personas tab.
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaPerformanceRow({
  rank,
  persona,
}: {
  rank: number;
  persona: Persona;
}) {
  const winner = getWinningConcept(persona);
  return (
    <div
      className="grid items-center px-3.5 py-2.5 text-[12px]"
      style={{
        gridTemplateColumns:
          "32px 1.6fr 1.8fr 0.7fr 0.7fr 0.7fr 0.7fr 0.6fr",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span className="tabular-nums text-text-tertiary">#{rank}</span>
      <span className="font-medium truncate" title={persona.role}>
        {persona.name}
      </span>
      <WinningConceptCell winner={winner} />
      <span className="text-right tabular-nums">
        {winner ? `${winner.tofu.value.toFixed(2)}%` : "—"}
      </span>
      <span className="text-right tabular-nums">
        {winner?.cvr != null ? `${winner.cvr.toFixed(1)}%` : "—"}
      </span>
      <span className="text-right tabular-nums">{persona.verifiedLeads}</span>
      <span className="text-right tabular-nums">{persona.cpvl}</span>
      <span className="text-right tabular-nums">{persona.share}%</span>
    </div>
  );
}

function WinningConceptCell({
  winner,
}: {
  winner: WinningConcept | null;
}) {
  if (!winner) {
    return (
      <span className="text-text-tertiary italic text-[11.5px]">
        No TOFU data yet
      </span>
    );
  }
  const isVideo = winner.concept.kind === "video";
  const Icon = isVideo ? VideoIcon : ImageIcon;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="inline-flex items-center gap-1 flex-shrink-0 uppercase"
        style={{
          background: isVideo ? "#F4ECFF" : "var(--bg-secondary)",
          color: isVideo ? "#7C3AED" : "var(--text-2)",
          fontSize: 9.5,
          fontWeight: 600,
          padding: "2px 6px",
          borderRadius: 4,
          letterSpacing: 0.3,
        }}
      >
        <Icon size={9} /> {isVideo ? "Video" : "Image"}
      </span>
      <span className="truncate font-medium" title={winner.angle.name}>
        {winner.angle.name}
      </span>
      <Star
        size={10}
        strokeWidth={2.5}
        className="flex-shrink-0"
        style={{ color: "#15803D" }}
      />
    </div>
  );
}

// ─── Spot insights ──────────────────────────────────────────────────────

function SpotInsightsCard({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const insights: string[] = [];
  const liveCount = project.mediaPlan.rows.filter(
    (r) => r.status === "live",
  ).length;
  if (project.goal.target === 0) {
    insights.push(
      "Set a goal first — without a target, projected pace and gap-to-goal can't be calculated.",
    );
  } else if (project.goal.pace === "behind") {
    insights.push(
      `You're tracking behind goal — forecast is ${project.goal.forecast} of ${project.goal.target}. Open the goal popover for a plan-to-close-gap.`,
    );
  } else if (project.goal.pace === "ahead") {
    insights.push(
      `Ahead of pace by ${project.goal.paceDelta}. Consider raising the goal target or reallocating budget to a stretch persona.`,
    );
  }
  if (liveCount === 0 && project.mediaPlan.rows.length > 0) {
    insights.push(
      `${project.mediaPlan.rows.length} campaign${project.mediaPlan.rows.length === 1 ? "" : "s"} drafted, none live yet — deploy from the Campaigns tab.`,
    );
  }
  if (
    project.personas.length > 0 &&
    project.personas.every((p) => p.angles.length <= 1)
  ) {
    insights.push(
      "Most personas have only one angle — drafting a second angle per persona usually lifts CPVL within a week.",
    );
  }

  return (
    <div>
      <div className="uplabel mb-2" style={{ fontSize: 9.5 }}>
        Spot&apos;s read
      </div>
      <div
        className="rounded-[10px] p-3.5"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background:
                "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
            }}
          >
            <Sparkles size={13} />
          </span>
          <div className="flex-1 min-w-0">
            {insights.length > 0 ? (
              <ul className="space-y-1.5">
                {insights.map((line, i) => (
                  <li
                    key={i}
                    className="text-[12px] text-text-secondary leading-[1.55]"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-[12px] text-text-secondary leading-[1.55]">
                Everything looks healthy. Ask me anything about this project.
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                onAsk("Give me a week-over-week recap for this project")
              }
              className="mt-2.5 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button bg-white text-[11.5px] hover:border-border-hover"
              style={{ border: "1px solid var(--border)" }}
            >
              <Sparkles size={11} /> Ask Spot for the full recap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
