"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import type { ProjectDetail } from "@/lib/project-data";
import { MediaPlanSection } from "../media-plan-section";

/**
 * Campaigns deep-dive — roomier full-width view of every campaign × ad set
 * × ad with the full TOFU column set + filters. Wraps the populated
 * MediaPlanSection campaigns table to inherit the existing rich column
 * picker and metric derivation; the deep-dive shell hosts the Spot side
 * panel.
 */
export function CampaignsDeepDive({ project }: { project: ProjectDetail }) {
  const [channel, setChannel] = useState<"all" | "Meta" | "Google">("all");
  const [status, setStatus] = useState<"all" | "live" | "paused" | "draft">("all");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-text-tertiary text-[11.5px]">
          <Filter size={11} /> Filters
        </span>
        <FilterChip
          label="Channel"
          value={channel}
          options={["all", "Meta", "Google"] as const}
          onChange={setChannel}
        />
        <FilterChip
          label="Status"
          value={status}
          options={["all", "live", "paused", "draft"] as const}
          onChange={setStatus}
        />
      </div>

      {/* Top-of-funnel summary tiles */}
      <Summary project={project} />

      {/* The MediaPlanSection campaigns view already supports the column
          picker + metric derivation — render it inline and let the user
          customize columns from there. */}
      <MediaPlanSection
        project={project}
        onAsk={() => {}}
        mode="campaigns"
        onNewCampaign={() => {}}
      />
    </div>
  );
}

function FilterChip<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-button overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "#FFF" }}
    >
      <span
        className="uplabel px-2 py-1.5"
        style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="h-7 px-2.5 text-[11px] font-medium transition-colors"
          style={{
            background: opt === value ? "#1A1A1A" : "transparent",
            color: opt === value ? "#FFF" : "var(--text-2)",
            borderLeft: i > 0 ? "1px solid var(--border-subtle)" : undefined,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Summary({ project }: { project: ProjectDetail }) {
  const rows = project.mediaPlan.rows;
  const totalDaily = rows.reduce((s, r) => s + r.budgetDaily, 0);
  const liveCount = rows.filter((r) => r.status === "live").length;
  const totalAdSets = rows.reduce((s, r) => s + r.adSets.length, 0);
  const totalAds = rows.reduce(
    (s, r) => s + r.adSets.reduce((m, a) => m + a.ads.length, 0),
    0,
  );

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}
    >
      <Tile label="Campaigns" value={String(rows.length)} sub={`${liveCount} live`} />
      <Tile label="Ad sets" value={String(totalAdSets)} sub="across all campaigns" />
      <Tile label="Ads" value={String(totalAds)} sub="attached creatives" />
      <Tile
        label="Daily budget"
        value={`₹${totalDaily.toLocaleString()}`}
        sub={`₹${(totalDaily * 7).toLocaleString()}/wk`}
      />
      <Tile
        label="Verified"
        value={String(project.goal.achieved)}
        sub={
          project.goal.target > 0
            ? `of ${project.goal.target} goal`
            : "no goal set"
        }
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card-base p-3">
      <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div className="text-[10.5px] text-text-tertiary mt-0.5">{sub}</div>
    </div>
  );
}

