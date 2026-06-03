"use client";

import {
  TrendingUp,
  TrendingDown,
  Repeat,
  CircleCheck,
  XCircle,
  ArrowRightLeft,
  ArrowRight,
  Film,
  type LucideIcon,
} from "lucide-react";
import type { AdSetRow } from "@/lib/campaign-data";
import { campaignDetail } from "@/lib/campaign-data";
import type { CampaignPersona, CreativeMetric } from "../diagnosis-tab";
import type { RenderableAction } from "../actions/use-action-flow";
import type { ActionVerb } from "@/lib/types/diagnosis-payload";
import { getActionLabel } from "../actions/action-labels";

type Verdict =
  | "scale"
  | "cross-deploy"
  | "reformat"
  | "refresh"
  | "mismatch"
  | "pause"
  | "hold";

const verdictStyles: Record<Verdict, { label: string; pill: string; icon: LucideIcon }> = {
  scale: { label: "Scale", pill: "bg-[#DCFCE7] text-[#15803D]", icon: TrendingUp },
  "cross-deploy": { label: "Cross-deploy", pill: "bg-[#EDE9FE] text-[#6D28D9]", icon: ArrowRightLeft },
  reformat: { label: "Reformat", pill: "bg-[#FFE4E6] text-[#9F1239]", icon: Film },
  refresh: { label: "Refresh", pill: "bg-[#DBEAFE] text-[#1E40AF]", icon: Repeat },
  mismatch: { label: "Mismatch", pill: "bg-[#FEF3C7] text-[#92400E]", icon: TrendingDown },
  pause: { label: "Pause", pill: "bg-[#FEE2E2] text-[#B91C1C]", icon: XCircle },
  hold: { label: "Hold", pill: "bg-surface-secondary text-text-secondary", icon: CircleCheck },
};

interface PersonaScorecardProps {
  personas: CampaignPersona[];
  adsets: AdSetRow[];
  creatives: Record<string, CreativeMetric[]>;
  /** When provided, the per-row action button opens the action flow modal. */
  onOpenAction?: (action: RenderableAction) => void;
}

interface Placement {
  adsetId: string;
  adsetName: string;
  metric: CreativeMetric;
}

interface PersonaRow {
  persona: CampaignPersona;
  placements: Placement[];
  totalSpend: number;
  totalLeads: number;
  best?: Placement;
  worst?: Placement;
  missingFromAdsets: { id: string; name: string }[];
  fatiguedPlacement?: Placement;
  verdict: Verdict;
  recommendation: string;
  /** Synthesized action this row recommends, when one applies. */
  action?: RenderableAction;
}

export function PersonaScorecard({
  personas,
  adsets,
  creatives,
  onOpenAction,
}: PersonaScorecardProps) {
  const rows = personas
    .map((p) => buildRow(p, adsets, creatives))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle">
        <h3 className="text-section-header text-text-primary">Persona scorecard</h3>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          How each persona-ad performs across the adsets it runs in. Surfaces winning matches and
          cross-deployment opportunities.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              {[
                { label: "Persona", align: "left" },
                { label: "Spend / Leads", align: "right" },
                { label: "Best placement", align: "left" },
                { label: "Worst placement", align: "left" },
                { label: "Verdict", align: "center" },
                { label: "Recommendation", align: "left" },
              ].map((h) => (
                <th
                  key={h.label}
                  className={`px-4 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-${h.align} whitespace-nowrap`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <PersonaRowView
                key={r.persona.id}
                row={r}
                striped={i % 2 === 1}
                onOpenAction={onOpenAction}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PersonaRowView({
  row,
  striped,
  onOpenAction,
}: {
  row: PersonaRow;
  striped: boolean;
  onOpenAction?: (action: RenderableAction) => void;
}) {
  const v = verdictStyles[row.verdict];
  const VIcon = v.icon;
  return (
    <tr
      className={`border-b border-border-subtle last:border-b-0 ${striped ? "bg-surface-page/40" : "bg-white"}`}
    >
      {/* Persona */}
      <td className="px-4 py-3 align-top">
        <div className="text-[12px] font-semibold text-text-primary">{row.persona.name}</div>
        <div className="text-[10px] text-text-tertiary mt-0.5">
          {row.persona.age} · {row.persona.role}
        </div>
      </td>

      {/* Spend / Leads */}
      <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
        <div className="text-[12px] text-text-primary font-medium">
          ₹{(row.totalSpend / 1000).toFixed(0)}K
        </div>
        <div className="text-[10px] text-text-tertiary mt-0.5">{row.totalLeads} leads</div>
      </td>

      {/* Best placement */}
      <td className="px-4 py-3 align-top">
        {row.best ? (
          <PlacementCell placement={row.best} tone="good" />
        ) : (
          <span className="text-[11px] text-text-tertiary">—</span>
        )}
      </td>

      {/* Worst placement */}
      <td className="px-4 py-3 align-top">
        {row.worst && row.worst.adsetId !== row.best?.adsetId ? (
          <PlacementCell placement={row.worst} tone="bad" />
        ) : (
          <span className="text-[11px] text-text-tertiary">—</span>
        )}
      </td>

      {/* Verdict */}
      <td className="px-4 py-3 align-top text-center">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-badge ${v.pill}`}
        >
          <VIcon size={10} strokeWidth={2} />
          {v.label}
        </span>
      </td>

      {/* Recommendation */}
      <td className="px-4 py-3 align-top max-w-[280px]">
        <p className="text-[12px] text-text-primary leading-relaxed">{row.recommendation}</p>
        {row.action && onOpenAction && (
          <button
            type="button"
            onClick={() => onOpenAction(row.action!)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          >
            {getActionLabel(row.action.verb, row.action.target_entity, campaignDetail.budgetMode)}
            <ArrowRight size={10} strokeWidth={2} />
          </button>
        )}
      </td>
    </tr>
  );
}

function PlacementCell({ placement, tone }: { placement: Placement; tone: "good" | "bad" }) {
  const ctrCls = tone === "good" ? "text-[#15803D]" : "text-[#B91C1C]";
  return (
    <div className="min-w-0">
      <div className="text-[12px] text-text-primary font-medium truncate max-w-[180px]">
        {placement.adsetName}
      </div>
      <div className="text-[10px] text-text-tertiary mt-0.5 tabular-nums">
        CTR <span className={`font-semibold ${ctrCls}`}>{placement.metric.ctr}%</span>
        {placement.metric.frequency >= 2.5 && (
          <>
            {" · "}
            <span className="text-[#92400E]">freq {placement.metric.frequency.toFixed(2)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row computation — deterministic, grounded in real numbers          */
/* ------------------------------------------------------------------ */

function buildRow(
  persona: CampaignPersona,
  adsets: AdSetRow[],
  creatives: Record<string, CreativeMetric[]>,
): PersonaRow {
  const placements: Placement[] = [];
  for (const a of adsets) {
    const cs = creatives[a.id] ?? [];
    const match = cs.find((c) => c.personaId === persona.id && c.status === "active");
    if (match) placements.push({ adsetId: a.id, adsetName: a.name, metric: match });
  }

  const totalSpend = placements.reduce((s, p) => s + p.metric.spend, 0);
  const totalLeads = placements.reduce((s, p) => s + p.metric.leads, 0);

  const sortedByCtr = [...placements].sort((a, b) => b.metric.ctr - a.metric.ctr);
  const best = sortedByCtr[0];
  const worst = sortedByCtr[sortedByCtr.length - 1];
  const fatiguedPlacement = placements.find(
    (p) => p.metric.frequency >= 2.5 && p.metric.ctrDelta7d <= -10,
  );
  const missingFromAdsets = adsets
    .filter((a) => !placements.some((p) => p.adsetId === a.id))
    .map((a) => ({ id: a.id, name: a.name }));

  // Campaign avg CTR across all active placements (used for "strong" thresholds).
  const allActive = adsets.flatMap((a) => (creatives[a.id] ?? []).filter((c) => c.status === "active"));
  const campaignAvgCtr =
    allActive.length > 0 ? allActive.reduce((s, c) => s + c.ctr, 0) / allActive.length : 0;

  // ── Verdict rules (priority order) ──────────────────────────────
  let verdict: Verdict = "hold";
  let recommendation = "Steady — keep monitoring CTR and qualifier rate.";
  let action: RenderableAction | undefined;

  const allWeak = placements.length > 0 && placements.every((p) => p.metric.ctr < 1.0);
  const allDry = totalLeads === 0 && placements.length > 0;
  const ctrGap = best && worst ? best.metric.ctr / Math.max(worst.metric.ctr, 0.01) : 1;

  // Video-weakness check across placements — drives the Reformat verdict.
  const videoPlacements = placements.filter((p) => p.metric.format === "Video");
  const videoWeakPlacements = videoPlacements.filter((p) => isVideoWeakness(p.metric));

  if (allWeak || allDry) {
    verdict = "pause";
    recommendation = `Pause everywhere — CTR < 1% across ${placements.length} placement${placements.length === 1 ? "" : "s"}. Persona-creative isn't landing.`;
    action = synthesizeAction(`pscore-${persona.id}-pause`, "PAUSE", `Ad — ${persona.name}`, recommendation, `Stop spending ~₹${(totalSpend / 1000).toFixed(0)}K/period on this persona-ad.`);
  } else if (
    videoPlacements.length >= 2 &&
    videoWeakPlacements.length > videoPlacements.length / 2
  ) {
    verdict = "reformat";
    const summary = describeVideoWeakness(videoWeakPlacements);
    recommendation = `Reformat — ${summary} across ${videoWeakPlacements.length} of ${videoPlacements.length} placements. Rebuild the video, don't just swap creative.`;
    action = synthesizeAction(
      `pscore-${persona.id}-reformat`,
      "REFRESH",
      `Ad — ${persona.name}`,
      recommendation,
      `Rebuilds the failing segment; restores CTR and qualifier rate.`,
    );
  } else if (fatiguedPlacement) {
    verdict = "refresh";
    recommendation = `Refresh in ${fatiguedPlacement.adsetName} — frequency ${fatiguedPlacement.metric.frequency.toFixed(2)}, CTR ${fatiguedPlacement.metric.ctrDelta7d}% in 7d.`;
    action = synthesizeAction(`pscore-${persona.id}-refresh`, "REFRESH", `Ad — ${persona.name}`, recommendation, `Restores CTR; lowers CPL across ${fatiguedPlacement.adsetName}.`);
  } else if (placements.length >= 2 && best && worst && ctrGap >= 2 && worst.metric.ctr < 1.5) {
    verdict = "mismatch";
    recommendation = `Pause in ${worst.adsetName} (CTR ${worst.metric.ctr}%) — ${ctrGap.toFixed(1)}× weaker than ${best.adsetName} (${best.metric.ctr}%). Audience-creative mismatch.`;
    action = synthesizeAction(`pscore-${persona.id}-pause-mismatch`, "PAUSE", worst.adsetName, recommendation, `Frees ~₹${(worst.metric.spend / 1000).toFixed(0)}K/period from a non-fitting placement.`);
  } else if (
    best &&
    best.metric.ctr >= campaignAvgCtr * 1.5 &&
    missingFromAdsets.length > 0
  ) {
    verdict = "cross-deploy";
    const target = missingFromAdsets[0];
    recommendation = `Strong in ${best.adsetName} (CTR ${best.metric.ctr}%, ${best.metric.leads} leads) — try in ${target.name}, not yet running there.`;
    action = synthesizeAction(`pscore-${persona.id}-deploy`, "ADD_CREATIVE", target.name, recommendation, `Test Ad — ${persona.name} in ${target.name}.`);
  } else if (best && best.metric.ctr >= campaignAvgCtr * 1.2 && totalLeads >= 15) {
    verdict = "scale";
    recommendation = `Top performer — CTR ${best.metric.ctr}% in ${best.adsetName}, ${totalLeads} leads. Increase budget on this placement.`;
    action = synthesizeAction(`pscore-${persona.id}-scale`, "SCALE", best.adsetName, recommendation, `~+20% leads on the strongest placement.`);
  } else if (placements.length === 0) {
    verdict = "hold";
    recommendation = "Not currently running.";
  }

  return {
    persona,
    placements,
    totalSpend,
    totalLeads,
    best,
    worst,
    missingFromAdsets,
    fatiguedPlacement,
    verdict,
    recommendation,
    action,
  };
}

function synthesizeAction(
  id: string,
  verb: ActionVerb,
  target: string,
  reason: string,
  expected: string,
): RenderableAction {
  return {
    id,
    verb,
    headline: reason,
    reason,
    expected,
    cta_label: getActionLabel(verb, target, campaignDetail.budgetMode),
    target_entity: target,
  };
}

/** True if this video creative shows any of the four video-weakness patterns. */
function isVideoWeakness(m: CreativeMetric): boolean {
  if (m.format !== "Video") return false;
  if (m.firstFrameRetention !== undefined && m.firstFrameRetention < 0.80) return true;
  if (m.hookRate !== undefined && m.hookRate < 0.25) return true;
  if (m.hookRateDelta7d !== undefined && m.hookRateDelta7d <= -5) return true;
  if (m.holdRate !== undefined && m.holdRate < 0.50) return true;
  if (m.holdRateDelta7d !== undefined && m.holdRateDelta7d <= -8) return true;
  if (m.playRate95 !== undefined && m.playRate95 < 0.15 && m.holdRate !== undefined && m.holdRate >= 0.50)
    return true;
  return false;
}

/** Pick the most prevalent weakness across placements and return a short phrase. */
function describeVideoWeakness(placements: Placement[]): string {
  const counts = { hook: 0, pacing: 0, thumbnail: 0, story: 0 };
  for (const p of placements) {
    const m = p.metric;
    if (m.firstFrameRetention !== undefined && m.firstFrameRetention < 0.80) counts.thumbnail++;
    else if ((m.hookRate !== undefined && m.hookRate < 0.25) || (m.hookRateDelta7d !== undefined && m.hookRateDelta7d <= -5)) counts.hook++;
    else if ((m.holdRate !== undefined && m.holdRate < 0.50) || (m.holdRateDelta7d !== undefined && m.holdRateDelta7d <= -8)) counts.pacing++;
    else if (m.playRate95 !== undefined && m.playRate95 < 0.15) counts.story++;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  switch (top[0]) {
    case "hook":
      return "weak hook";
    case "pacing":
      return "pacing collapse";
    case "thumbnail":
      return "thumbnail/preview drop";
    case "story":
      return "story incomplete";
    default:
      return "video weakness";
  }
}

