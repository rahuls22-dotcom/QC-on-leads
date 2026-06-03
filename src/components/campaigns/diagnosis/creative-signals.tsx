"use client";

import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Repeat,
  LayoutGrid,
  ArrowRight,
  ImageOff,
  Film,
  type LucideIcon,
} from "lucide-react";
import type { CreativeMetric } from "../diagnosis-tab";
import type { SecondaryAction } from "@/lib/types/diagnosis-payload";
import type { RenderableAction } from "../actions/use-action-flow";
import { campaignDetail } from "@/lib/campaign-data";
import { getActionLabel } from "../actions/action-labels";

interface CreativeSignalsProps {
  creatives: CreativeMetric[];
  /** More-actions list — used to link a signal to an existing action when target_entity matches a creative. */
  actions?: SecondaryAction[];
  /** Map of action_id → renderable action — when provided, the chip opens the action flow. */
  actionsById?: Record<string, RenderableAction>;
  onSelectAction?: (actionId: string) => void;
  onOpenAction?: (action: RenderableAction) => void;
}

interface Signal {
  kind:
    | "top"
    | "fatigue"
    | "weak"
    | "format"
    | "video-thumbnail"
    | "video-hook"
    | "video-pacing"
    | "video-story";
  icon: LucideIcon;
  iconCls: string;
  text: React.ReactNode;
  /** Linked action id when the signal motivates a real action in the payload. */
  actionId?: string;
  actionLabel?: string;
  /** Synthesized action — used when the signal is creative-specific (e.g., video weakness)
   *  and there's no matching action in the diagnosis payload. */
  synthesizedAction?: RenderableAction;
}

export function CreativeSignals({
  creatives,
  actions,
  actionsById,
  onSelectAction,
  onOpenAction,
}: CreativeSignalsProps) {
  const signals = computeSignals(creatives, actions ?? []);
  if (signals.length === 0) return null;

  return (
    <div className="bg-white border border-border-subtle rounded-card px-4 py-3 mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={12} strokeWidth={1.5} className="text-text-tertiary" />
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
          Creative signals
        </span>
      </div>
      <ul className="space-y-1.5">
        {signals.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed">
              <Icon size={12} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${s.iconCls}`} />
              <div className="flex-1 min-w-0 text-text-primary">
                {s.text}
                {s.actionLabel && (s.synthesizedAction || s.actionId) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (s.synthesizedAction && onOpenAction) {
                        onOpenAction(s.synthesizedAction);
                        return;
                      }
                      const linked = s.actionId ? actionsById?.[s.actionId] : undefined;
                      if (linked && onOpenAction) {
                        onOpenAction(linked);
                      } else if (s.actionId) {
                        onSelectAction?.(s.actionId);
                      }
                    }}
                    className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-accent hover:underline"
                  >
                    {s.actionLabel}
                    <ArrowRight size={10} strokeWidth={2} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal computation — deterministic, capped at 3.                   */
/* ------------------------------------------------------------------ */

function computeSignals(creatives: CreativeMetric[], actions: SecondaryAction[]): Signal[] {
  const active = creatives.filter((c) => c.status === "active");
  if (active.length === 0) return [];

  const sorted = [...active].sort((a, b) => b.ctr - a.ctr);
  const top = sorted[0];
  const avgCtr = active.reduce((s, c) => s + c.ctr, 0) / active.length;

  const out: Signal[] = [];

  // 1. Top performer (always shown when there's a clear lead).
  if (top.ctr / Math.max(avgCtr, 0.01) >= 1.1) {
    out.push({
      kind: "top",
      icon: TrendingUp,
      iconCls: "text-[#15803D]",
      text: (
        <>
          <span className="font-medium">{top.name}</span> leads — CTR{" "}
          <span className="font-semibold tabular-nums">{top.ctr}%</span>{" "}
          <span className="text-text-tertiary">
            ({(top.ctr / avgCtr).toFixed(1)}× adset avg)
          </span>
          .
        </>
      ),
    });
  }

  // 2. Video diagnostics — for video creatives, prefer a specific weakness signal
  //    (thumbnail / hook / pacing / story) over the generic fatigue/weak rule.
  const videoSignaledIds = new Set<string>();
  for (const c of active) {
    if (out.length >= 3) break;
    if (c.format !== "Video") continue;
    if (c.id === top.id) continue;
    const sig = videoWeaknessSignal(c);
    if (sig) {
      out.push(sig);
      videoSignaledIds.add(c.id);
    }
  }

  // 3. Fatigue: high frequency + CTR drift down.
  const fatigued = active.find(
    (c) =>
      c.frequency >= 2.5 &&
      c.ctrDelta7d <= -10 &&
      c.id !== top.id &&
      !videoSignaledIds.has(c.id),
  );
  if (fatigued) {
    const link = matchAction(actions, fatigued.name) ?? matchAction(actions, "REFRESH");
    out.push({
      kind: "fatigue",
      icon: Repeat,
      iconCls: "text-[#92400E]",
      text: (
        <>
          <span className="font-medium">{fatigued.name}</span> fatiguing — frequency{" "}
          <span className="font-semibold tabular-nums">{fatigued.frequency.toFixed(2)}</span>, CTR{" "}
          <span className="font-semibold tabular-nums text-[#B91C1C]">
            {fatigued.ctrDelta7d}%
          </span>{" "}
          in 7d.
        </>
      ),
      actionId: link?.id,
      actionLabel: link ? "Refresh" : undefined,
    });
  }

  // 4. Underperformer: low absolute CTR or sharp drift.
  const weak = sorted
    .slice()
    .reverse()
    .find(
      (c) =>
        c.id !== top.id &&
        c.id !== fatigued?.id &&
        !videoSignaledIds.has(c.id) &&
        (c.ctr < 1.0 || (c.ctr < 1.5 && c.ctrDelta7d <= -25)),
    );
  if (weak) {
    const pauseAction = matchAction(actions, weak.name) ?? matchAction(actions, "PAUSE");
    out.push({
      kind: "weak",
      icon: TrendingDown,
      iconCls: "text-[#B91C1C]",
      text: (
        <>
          <span className="font-medium">{weak.name}</span> dragging spend — CTR{" "}
          <span className="font-semibold tabular-nums">{weak.ctr}%</span>,{" "}
          <span className="text-text-tertiary tabular-nums">
            {(top.ctr / Math.max(weak.ctr, 0.01)).toFixed(1)}×
          </span>{" "}
          below winner.
        </>
      ),
      actionId: pauseAction?.id,
      actionLabel: pauseAction ? "Pause" : undefined,
    });
  }

  // 5. Format insight (only if room left and ≥2 formats with a clear gap).
  if (out.length < 3) {
    const formats = [...new Set(active.map((c) => c.format))];
    if (formats.length >= 2) {
      const byFormat = formats
        .map((f) => {
          const cs = active.filter((c) => c.format === f);
          return { format: f, avg: cs.reduce((s, c) => s + c.ctr, 0) / cs.length };
        })
        .sort((a, b) => b.avg - a.avg);
      const ratio = byFormat[0].avg / Math.max(byFormat[byFormat.length - 1].avg, 0.01);
      if (ratio >= 1.5) {
        out.push({
          kind: "format",
          icon: LayoutGrid,
          iconCls: "text-text-secondary",
          text: (
            <>
              <span className="font-medium">{byFormat[0].format}</span> out-performs{" "}
              <span className="font-medium">{byFormat[byFormat.length - 1].format}</span>{" "}
              <span className="text-text-tertiary tabular-nums">{ratio.toFixed(1)}×</span> on CTR — shift weight.
            </>
          ),
        });
      }
    }
  }

  return out.slice(0, 3);
}

/** Find an action whose target_entity matches the entity name (substring) or whose verb matches. */
function matchAction(actions: SecondaryAction[], needle: string): SecondaryAction | undefined {
  if (!needle) return undefined;
  const upper = needle.toUpperCase();
  // Verb-only match path.
  if (upper === "REFRESH" || upper === "PAUSE") {
    return actions.find((a) => a.verb === upper);
  }
  // Substring match against target_entity.
  return actions.find(
    (a) => a.target_entity && needle.toLowerCase().includes(a.target_entity.toLowerCase()),
  );
}

/**
 * Detect a video-specific weakness on a creative.
 * Priority order: thumbnail/preview > weak hook > pacing collapse > story incomplete.
 * Returns a Signal with a synthesized REFRESH action — chip label reads "Reformat" because
 * the fix is a rebuild of the relevant segment, not a cosmetic refresh.
 */
function videoWeaknessSignal(c: CreativeMetric): Signal | undefined {
  const ff = c.firstFrameRetention;
  const hr = c.hookRate;
  const hd = c.hookRateDelta7d;
  const hl = c.holdRate;
  const ld = c.holdRateDelta7d;
  const p95 = c.playRate95;

  // Thumbnail / preview problem.
  if (ff !== undefined && ff < 0.80) {
    return {
      kind: "video-thumbnail",
      icon: ImageOff,
      iconCls: "text-[#B91C1C]",
      text: (
        <>
          <span className="font-medium">{c.name}</span> — first-frame retention{" "}
          <span className="font-semibold tabular-nums text-[#B91C1C]">{(ff * 100).toFixed(0)}%</span>,
          viewers skip before the video plays. Likely thumbnail or preview issue.
        </>
      ),
      synthesizedAction: synthRefresh(c, `first-frame retention ${(ff * 100).toFixed(0)}%`),
      actionLabel: "Reformat",
    };
  }

  // Weak hook.
  if ((hr !== undefined && hr < 0.25) || (hd !== undefined && hd <= -5)) {
    const hrPct = hr !== undefined ? `${(hr * 100).toFixed(0)}%` : "—";
    const hdTxt = hd !== undefined ? `${hd > 0 ? "+" : ""}${hd}pp in 7d` : "drift";
    return {
      kind: "video-hook",
      icon: TrendingDown,
      iconCls: "text-[#B91C1C]",
      text: (
        <>
          <span className="font-medium">{c.name}</span> — weak hook{" "}
          <span className="font-semibold tabular-nums">{hrPct}</span>{" "}
          <span className="text-text-tertiary">({hdTxt})</span>. First 3 seconds aren't holding viewers.
        </>
      ),
      synthesizedAction: synthRefresh(c, `weak hook ${hrPct}, ${hdTxt}`),
      actionLabel: "Reformat",
    };
  }

  // Pacing collapse.
  if ((hl !== undefined && hl < 0.50) || (ld !== undefined && ld <= -8)) {
    const hlPct = hl !== undefined ? `${(hl * 100).toFixed(0)}%` : "—";
    const ldTxt = ld !== undefined ? `${ld > 0 ? "+" : ""}${ld}pp in 7d` : "drift";
    return {
      kind: "video-pacing",
      icon: Film,
      iconCls: "text-[#92400E]",
      text: (
        <>
          <span className="font-medium">{c.name}</span> — hold rate{" "}
          <span className="font-semibold tabular-nums">{hlPct}</span>{" "}
          <span className="text-text-tertiary">({ldTxt})</span>. Viewers drop off mid-video.
        </>
      ),
      synthesizedAction: synthRefresh(c, `hold rate ${hlPct}, ${ldTxt}`),
      actionLabel: "Reformat",
    };
  }

  // Story incomplete: hold is fine but few viewers finish.
  if (p95 !== undefined && p95 < 0.15 && hl !== undefined && hl >= 0.50) {
    const p95Pct = `${(p95 * 100).toFixed(0)}%`;
    return {
      kind: "video-story",
      icon: Film,
      iconCls: "text-text-secondary",
      text: (
        <>
          <span className="font-medium">{c.name}</span> — only{" "}
          <span className="font-semibold tabular-nums">{p95Pct}</span> finish despite holding through
          the middle. Ending isn't earning the watch.
        </>
      ),
      synthesizedAction: synthRefresh(c, `play-rate-95 ${p95Pct} despite healthy hold`),
      actionLabel: "Reformat",
    };
  }

  return undefined;
}

function synthRefresh(c: CreativeMetric, reasonSummary: string): RenderableAction {
  return {
    id: `synth-refresh-${c.id}`,
    verb: "REFRESH",
    headline: `Reformat ${c.name}`,
    reason: `${c.name} — ${reasonSummary}.`,
    expected: "Restores video performance; CTR and qualifier rate typically recover within 7 days of a fresh cut.",
    cta_label: getActionLabel("REFRESH", c.name, campaignDetail.budgetMode),
    target_entity: c.name,
  };
}
