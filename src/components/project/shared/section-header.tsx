import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  onAsk,
  askLabel = "Refine with Spot",
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onAsk?: () => void;
  askLabel?: string;
}) {
  return (
    <div className="flex items-end gap-4 mb-3 pt-7">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-[7px] bg-surface-secondary">
          <Icon size={15} />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
          {subtitle && <div className="text-[11.5px] text-text-tertiary">{subtitle}</div>}
        </div>
      </div>
      <div className="flex-1" />
      {actions}
      {onAsk && (
        <button
          onClick={onAsk}
          type="button"
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] font-medium hover:border-border-hover hover:bg-surface-page transition-colors"
        >
          <SpotMark size={11} />
          {askLabel}
        </button>
      )}
    </div>
  );
}
