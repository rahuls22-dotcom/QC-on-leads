"use client";

import { useMemo } from "react";
import type { ProjectDetail } from "@/lib/project-data";
import { MediaPlanSection } from "./media-plan-section";

/**
 * Summary tiles + a roomier campaigns table for the dedicated deep-dive
 * route. Today it composes `MediaPlanSection` in campaigns mode — over
 * time the deep dive can sprout its own controls (date range, channel
 * filters, charts) without disturbing the in-page tab.
 */
export function DeepDiveTable({ project }: { project: ProjectDetail }) {
  const live = useMemo(
    () =>
      project.mediaPlan.rows.filter(
        (r) => r.status === "live" || r.status === "paused",
      ),
    [project],
  );

  // Aggregate top-line metrics across all live ads
  const summary = useMemo(() => {
    let spend = 0;
    let leads = 0;
    let impressions = 0;
    let verified = 0;
    live.forEach((row) => {
      row.adSets.forEach((adSet) => {
        adSet.ads.forEach((ad) => {
          if (ad.spend != null) spend += ad.spend;
          if (ad.leads != null) leads += ad.leads;
          // synthesise impressions for the tile (matches table derivation)
          if (ad.spend != null) impressions += Math.round((ad.spend / 320) * 1000);
          if (ad.leads != null) verified += Math.round(ad.leads * 0.5);
        });
      });
    });
    const cpvl = verified ? Math.round(spend / verified) : null;
    const verifPct = leads ? (verified / leads) * 100 : null;
    const ctr =
      impressions && leads ? ((leads * 50) / impressions) * 100 : null; // rough proxy
    return { spend, impressions, ctr, cpvl, verifPct };
  }, [live]);

  const fmtCurrency = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
    return `₹${n}`;
  };
  const fmtNumber = (n: number | null) => {
    if (n == null) return "—";
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  return (
    <div className="space-y-5">
      {/* Filters (placeholder — wire up later) */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterPill label="Channel" />
        <FilterPill label="Status" />
        <FilterPill label="Persona" />
        <FilterPill label="Date range" />
      </div>

      {/* Summary tiles */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        <SummaryTile label="Spend" value={fmtCurrency(summary.spend)} />
        <SummaryTile label="Impressions" value={fmtNumber(summary.impressions)} />
        <SummaryTile
          label="CTR"
          value={summary.ctr != null ? `${summary.ctr.toFixed(2)}%` : "—"}
        />
        <SummaryTile label="CPVL" value={fmtCurrency(summary.cpvl)} />
        <SummaryTile
          label="Verif %"
          value={summary.verifPct != null ? `${summary.verifPct.toFixed(1)}%` : "—"}
        />
      </div>

      {/* Reuse the existing campaigns view */}
      <MediaPlanSection
        project={project}
        onAsk={() => {}}
        mode="campaigns"
        onNewCampaign={() => {}}
      />
    </div>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary"
      style={{ opacity: 0.7, cursor: "not-allowed" }}
    >
      {label} ▾
    </button>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="card-base p-4"
      style={{ background: "#FFF", border: "1px solid var(--border-subtle)" }}
    >
      <div className="uplabel mb-1.5" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <div className="text-[20px] font-semibold tracking-[-0.01em] tabular-nums">{value}</div>
    </div>
  );
}
