"use client";

// PARKED — the Experiments tab was removed from the project page during the
// project-page redesign (Dashboard · Personas · Campaigns · Library · Settings).
// This component is left in-repo so it can be revived later — either as a
// dedicated sub-section under Campaigns or its own tab — without rebuilding
// the experiment-card UI from scratch.

import { FlaskConical, Eye, MoreHorizontal } from "lucide-react";
import { ProjectDetail, Experiment } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { SpotMark } from "@/components/spot/spot-mark";
import { RichText } from "@/components/spot/rich-text";

function ExperimentCard({ x, onAsk }: { x: Experiment; onAsk: (q: string) => void }) {
  const showVariantTable = x.status !== "proposed";
  return (
    <div className="card-base overflow-hidden bg-white">
      {/* Header strip */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="mono text-[10.5px] text-text-tertiary">{x.id.toUpperCase()}</span>
              <span
                className={`pill ${
                  x.status === "running" ? "pill-info" : x.status === "concluded" ? "pill-ok" : "pill-warn"
                }`}
                style={{ fontSize: 10 }}
              >
                {x.status}
              </span>
              <span className="text-[11px] text-text-tertiary">Primary: {x.primaryMetric}</span>
            </div>
            <div className="text-[14px] font-semibold">{x.name}</div>
            <div className="text-[11.5px] text-text-secondary leading-[1.45] mt-1">
              {x.hypothesis}
            </div>
          </div>
          <div className="text-right text-[11px] text-text-tertiary flex-shrink-0">
            {x.status === "running" && (
              <>
                <div>Day {Math.round(x.progress * 14)} of 14</div>
                <div className="w-[120px] h-1 rounded-full bg-surface-secondary overflow-hidden mt-1">
                  <div className="h-full bg-text-primary" style={{ width: `${x.progress * 100}%` }} />
                </div>
              </>
            )}
            {x.status === "concluded" && (
              <div>
                {x.startedOn} → {x.endsOn}
              </div>
            )}
            {x.status === "proposed" && <div>Awaiting your approval</div>}
          </div>
        </div>
      </div>

      {/* Variants table */}
      {showVariantTable && x.variants.length > 0 && x.variants[0].spend != null && (
        <div className="px-4 py-3 border-b border-border-subtle">
          <div className="grid text-[10.5px] uppercase tracking-[0.04em] font-semibold text-text-tertiary mb-1.5"
            style={{ gridTemplateColumns: "2fr 80px 80px 80px 90px" }}>
            <span>Variant</span>
            <span className="text-right">Spend</span>
            <span className="text-right">Leads</span>
            <span className="text-right">CPL</span>
            <span className="text-right">{x.variants[0].verifRate ? "Verif rate" : "CTR"}</span>
          </div>
          {x.variants.map((v) => (
            <div key={v.label} className="grid items-center text-[11.5px] py-1"
              style={{ gridTemplateColumns: "2fr 80px 80px 80px 90px" }}>
              <span>{v.label}</span>
              <span className="text-right tabular-nums">{v.spend ? `₹${(v.spend / 1000).toFixed(0)}K` : "—"}</span>
              <span className="text-right tabular-nums">{v.leads || "—"}</span>
              <span className="text-right tabular-nums">{v.cpl ? `₹${v.cpl}` : "—"}</span>
              <span className="text-right tabular-nums">{v.verifRate || v.ctr || "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Readout */}
      <div className="px-4 py-3 flex items-start gap-2.5" style={{ background: "var(--spot-tint)" }}>
        <SpotMark size={14} />
        <div className="flex-1 text-[12.5px] leading-[1.5]">
          <RichText text={x.readout} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {x.decision && (
            <span className="pill pill-ok" style={{ fontSize: 10 }}>
              {x.decision}
            </span>
          )}
          {x.status === "running" && (
            <button
              type="button"
              onClick={() => onAsk(`Show me the daily readout for experiment ${x.name}`)}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] border border-border bg-white hover:border-border-hover"
            >
              <Eye size={10} /> Watch live
            </button>
          )}
          {x.status === "proposed" && (
            <button
              type="button"
              onClick={() => onAsk(`Discuss experiment proposal: ${x.name}`)}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] border border-border bg-white hover:border-border-hover"
            >
              Discuss
            </button>
          )}
          {x.status === "concluded" && (
            <button
              type="button"
              onClick={() => onAsk(`Show the full readout for ${x.name}`)}
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] border border-border bg-white hover:border-border-hover"
            >
              Full readout
            </button>
          )}
          <button type="button" className="text-text-tertiary p-0.5">
            <MoreHorizontal size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  status,
  experiments,
  onAsk,
}: {
  label: string;
  status: Experiment["status"];
  experiments: Experiment[];
  onAsk: (q: string) => void;
}) {
  const items = experiments.filter((x) => x.status === status);
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="uplabel mb-2" style={{ fontSize: 10 }}>
        {label} · {items.length}
      </div>
      <div className="space-y-2.5">
        {items.map((x) => (
          <ExperimentCard key={x.id} x={x} onAsk={onAsk} />
        ))}
      </div>
    </div>
  );
}

export function ExperimentsSection({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  return (
    <div>
      <SectionHeader
        icon={FlaskConical}
        title="Experiments"
        subtitle="Running, proposed, and concluded tests"
        onAsk={() => onAsk("Propose a new experiment based on what's not working")}
      />
      <Group label="Running" status="running" experiments={project.experiments} onAsk={onAsk} />
      <Group label="Proposed" status="proposed" experiments={project.experiments} onAsk={onAsk} />
      <Group label="Concluded" status="concluded" experiments={project.experiments} onAsk={onAsk} />
    </div>
  );
}
