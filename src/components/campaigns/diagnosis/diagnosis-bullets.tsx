"use client";

import { Sparkles, ArrowRight } from "lucide-react";
import type { DiagnosisBullet } from "@/lib/types/diagnosis-payload";
import type { RenderableAction } from "../actions/use-action-flow";
import { getActionLabel } from "../actions/action-labels";
import { campaignDetail } from "@/lib/campaign-data";

interface DiagnosisBulletsProps {
  bullets: DiagnosisBullet[];
  /** Map from action_id → action headline, used to show what each bullet drives. */
  actionHeadlines?: Record<string, string>;
  /** Map from action_id → renderable action — used to launch the action flow. */
  actionsById?: Record<string, RenderableAction>;
  /** Highlight bullets whose drives_action_id matches. */
  highlightActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  /** When provided, the action chip opens the action flow modal directly. */
  onOpenAction?: (action: RenderableAction) => void;
}

export function DiagnosisBullets({
  bullets,
  actionHeadlines,
  actionsById,
  highlightActionId,
  onSelectAction,
  onOpenAction,
}: DiagnosisBulletsProps) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle flex items-center gap-2">
        <Sparkles size={13} strokeWidth={1.5} className="text-text-tertiary" />
        <h3 className="text-section-header text-text-primary">Diagnosis</h3>
        <span className="text-[11px] text-text-tertiary">
          · {bullets.length} signals connecting top of funnel to qualification
        </span>
      </div>
      <div className="divide-y divide-border-subtle">
        {bullets.map((b, i) => {
          const isHighlighted = !!highlightActionId && b.drives_action_id === highlightActionId;
          const actionTitle =
            b.drives_action_id && actionHeadlines?.[b.drives_action_id];
          return (
            <div
              key={b.id}
              className={`px-5 py-3.5 transition-colors duration-150 ${
                isHighlighted ? "bg-[#FFFBEB]" : i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-[10px] font-semibold text-text-tertiary tabular-nums w-5 shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[13px] text-text-primary leading-relaxed">
                    {b.bullet}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {b.tof && <FunnelChip stage="TOF" text={b.tof} />}
                    {b.mof && <FunnelChip stage="MOF" text={b.mof} />}
                    {b.bof && <FunnelChip stage="BOF" text={b.bof} />}
                    {actionTitle && b.drives_action_id && (() => {
                      const linked = actionsById?.[b.drives_action_id];
                      const label = linked
                        ? getActionLabel(linked.verb, linked.target_entity, campaignDetail.budgetMode)
                        : "Drives action";
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (linked && onOpenAction) {
                              onOpenAction(linked);
                            } else {
                              onSelectAction?.(b.drives_action_id!);
                            }
                          }}
                          onMouseEnter={() => onSelectAction?.(b.drives_action_id!)}
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-badge border transition-colors ${
                            isHighlighted
                              ? "bg-accent text-white border-accent"
                              : "bg-white text-text-secondary border-border hover:border-border-hover hover:text-text-primary"
                          }`}
                        >
                          {label}
                          <ArrowRight size={9} strokeWidth={1.5} />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const stageStyles = {
  TOF: { labelBg: "bg-[#DBEAFE]", labelText: "text-[#1E40AF]", chipBg: "bg-[#EFF6FF]", chipText: "text-[#1E3A8A]" },
  MOF: { labelBg: "bg-[#FEF3C7]", labelText: "text-[#92400E]", chipBg: "bg-[#FFFBEB]", chipText: "text-[#78350F]" },
  BOF: { labelBg: "bg-[#DCFCE7]", labelText: "text-[#15803D]", chipBg: "bg-[#F0FDF4]", chipText: "text-[#14532D]" },
} as const;

function FunnelChip({ stage, text }: { stage: "TOF" | "MOF" | "BOF"; text: string }) {
  const s = stageStyles[stage];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium ${s.chipBg} ${s.chipText} px-1.5 py-0.5 rounded-badge border border-border-subtle`}
    >
      <span className={`text-[9px] font-semibold ${s.labelBg} ${s.labelText} px-1 py-[1px] rounded-[3px] tracking-[0.3px]`}>
        {stage}
      </span>
      <span>{text}</span>
    </span>
  );
}
