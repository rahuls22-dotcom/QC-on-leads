"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ArrowUpRight, ArrowDownRight, Bot, Pencil, PhoneCall,
} from "lucide-react";
import { outreachesForProject } from "@/lib/outreach-data";
import type { OutreachListItem, OutreachStatus } from "@/lib/outreach-data";

// Outreach section for the project detail page.
//
// Mirrors the same chrome the main /outreach listing uses (status pill,
// table layout, KPI tints) so a user moving between project context and
// the global Outreach screen sees the same visual language. The aggregate
// header here is a lighter version — Talktime / Spend / Qualification rate
// — meant as a quick read, not the full 4-up funnel that the global list
// shows. The full breakdown is one click away on /outreach.

function StatusPill({ status }: { status: OutreachStatus }) {
  const cfg: Record<OutreachStatus, { label: string; cls: string }> = {
    in_progress: { label: "Running",   cls: "bg-[#F0FDF4] text-[#15803D]" },
    completed:   { label: "Completed", cls: "bg-surface-secondary text-text-secondary" },
    paused:      { label: "Paused",    cls: "bg-[#FEF3C7] text-[#92400E]" },
    draft:       { label: "Draft",     cls: "bg-surface-secondary text-text-tertiary" },
  };
  const { label, cls } = cfg[status];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Compact trend chip — same direction/colour logic as the global listing:
// up arrow = good unless `inverted` is passed (used by Spend / CPQL where
// rising values are bad). Returns null at zero so flat metrics stay quiet.
function TrendChip({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) return null;
  const up = delta >= 0;
  const isGood = inverted ? !up : up;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
        isGood ? "text-[#15803D]" : "text-[#DC2626]"
      }`}
    >
      {up ? <ArrowUpRight size={12} strokeWidth={2} /> : <ArrowDownRight size={12} strokeWidth={2} />}
      {Math.abs(delta)}%
    </span>
  );
}

// Compact KPI tile — narrower than the listing's MetricCard because it
// sits inside the project page's tab body alongside other sections.
// Same eyebrow + value + footer rhythm, no min-height stretch.
function KpiCard({
  label,
  value,
  unit,
  sub,
  delta,
  invertedTrend,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  delta?: number;
  invertedTrend?: boolean;
}) {
  // Same tint rule as the main outreach widgets: green when the trend is
  // in the good direction, red when it isn't, neutral white otherwise.
  // Keeps the visual language consistent so this widget reads as the
  // little sibling of the full KPI tiles on /outreach.
  const tint =
    delta === undefined || delta === 0
      ? "bg-white border-border"
      : (invertedTrend ? delta < 0 : delta > 0)
        ? "bg-[#F7FDF9] border-[#E2F5E9]"
        : "bg-[#FEF9F9] border-[#F5E2E2]";
  return (
    <div className={`${tint} border rounded-card px-4 py-3.5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
          {label}
        </span>
        {delta !== undefined && <TrendChip delta={delta} inverted={invertedTrend} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-semibold text-text-primary leading-none tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-[11.5px] text-text-secondary leading-none">{unit}</span>
        )}
      </div>
      {sub && (
        <div className="mt-2 text-[11.5px] text-text-secondary tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
}

// Single row inside the project's outreach table. Click → navigate to
// the global outreach detail. Edit pencil is omitted here on purpose —
// edits happen on the /outreach screen so we don't double up entry points.
function OutreachRow({ o, alt }: { o: OutreachListItem; alt: boolean }) {
  const router = useRouter();
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const qualRate = pct(o.qualified, o.totalContacts);
  return (
    <tr
      onClick={() => router.push(`/outreach/${o.id}`)}
      className={`group cursor-pointer border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors duration-150 ${
        alt ? "bg-surface-page/40" : "bg-white"
      }`}
    >
      <td className="px-4 py-3 max-w-[280px]">
        <div className="text-[13px] font-medium text-text-primary truncate">{o.name}</div>
        <div className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-text-tertiary">
          <Bot size={11} strokeWidth={1.5} />
          <span>{o.voiceAgent} outbound bot</span>
        </div>
      </td>
      <td className="px-3 py-3"><StatusPill status={o.status} /></td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums text-text-primary">
        {o.totalContacts.toLocaleString()}
      </td>
      <td className="px-3 py-3 text-right text-[13px] tabular-nums text-text-primary">
        {o.qualified.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-[14px] font-semibold tabular-nums text-text-primary">
          {qualRate}%
        </span>
      </td>
    </tr>
  );
}

export function ProjectOutreachSection({ projectId }: { projectId: string }) {
  const router = useRouter();
  const outreaches = useMemo(() => outreachesForProject(projectId), [projectId]);

  // Aggregate KPIs across this project's outreaches. Mirrors the same
  // shape the global Outreach listing uses, scoped to the project.
  const agg = useMemo(() => {
    return outreaches.reduce(
      (a, o) => ({
        leads:     a.leads     + o.totalContacts,
        dialed:    a.dialed    + o.called,
        connected: a.connected + o.connected,
        qualified: a.qualified + o.qualified,
        talktime:  a.talktime  + o.talktimeMins,
        spend:     a.spend     + o.spend,
      }),
      { leads: 0, dialed: 0, connected: 0, qualified: 0, talktime: 0, spend: 0 }
    );
  }, [outreaches]);

  const qualRate = agg.leads > 0 ? Math.round((agg.qualified / agg.leads) * 100) : 0;
  const cpql = agg.qualified > 0 ? Math.round(agg.spend / agg.qualified) : 0;

  // ── Empty state ────────────────────────────────────────────────────
  if (outreaches.length === 0) {
    return (
      <div className="mt-5 bg-white border border-border rounded-card px-8 py-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/5 text-accent mb-4">
          <PhoneCall size={20} strokeWidth={1.5} />
        </div>
        <h3 className="text-[16px] font-semibold text-text-primary mb-1">
          No outreaches yet
        </h3>
        <p className="text-[12.5px] text-text-secondary max-w-[440px] mx-auto leading-relaxed">
          Outreaches turn this project&apos;s lead lists into AI voice-agent dials.
          Create one and we&apos;ll pre-fill the project for you.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/outreach/create?project=${projectId}`)}
          className="inline-flex items-center gap-1.5 mt-5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Create outreach
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {/* Header — section title + Create CTA. The header is its own row,
          not part of a card, so the KPI grid below reads as the start
          of the section. */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-text-primary">
            Outreach
          </h3>
          <p className="text-[11.5px] text-text-tertiary mt-0.5">
            {outreaches.length} outreach{outreaches.length === 1 ? "" : "es"} dialing leads for this project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/outreach/create?project=${projectId}`)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-accent text-white text-[12.5px] font-medium rounded-button hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          New outreach
        </button>
      </div>

      {/* Aggregate KPI strip — talktime / spend / qualification rate.
          Trend chips are omitted here because we don't have a per-day
          series scoped to a project; the absolute values are the read. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          label="Talktime"
          value={agg.talktime.toLocaleString()}
          unit="min"
          sub={`${agg.dialed.toLocaleString()} calls placed`}
        />
        <KpiCard
          label="Spend"
          value={formatINR(agg.spend)}
          sub={agg.qualified > 0 ? `${formatINR(cpql)} per qualified` : "no qualified yet"}
        />
        <KpiCard
          label="Qualified leads"
          value={agg.qualified.toLocaleString()}
          sub={`${qualRate}% of ${agg.leads.toLocaleString()} dialled leads`}
        />
      </div>

      {/* Table — same chrome as the global outreach listing. */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <table className="w-full table-auto">
          <thead className="bg-surface-page/60 border-b border-border-subtle">
            <tr>
              <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                Outreach
              </th>
              <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                Status
              </th>
              <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                Leads
              </th>
              <th className="px-3 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                Qualified
              </th>
              <th className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-right">
                Qual %
              </th>
            </tr>
          </thead>
          <tbody>
            {outreaches.map((o, i) => (
              <OutreachRow key={o.id} o={o} alt={i % 2 === 1} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
