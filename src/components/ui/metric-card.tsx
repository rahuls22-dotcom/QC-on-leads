import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "destructive" | "warning" | "info";

const toneCls: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-bg text-success",
  destructive: "bg-destructive-bg text-destructive",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
};

/**
 * Dashboard-level KPI card. Icon circle + label + value + optional sub.
 * `tone` colors the icon circle bg/fg to signal what kind of metric this is.
 */
export function MetricCard({
  icon,
  label,
  value,
  sub,
  tone = "primary",
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border border-secondary p-4 bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
          toneCls[tone],
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-secondary-foreground truncate">
          {label}
        </div>
        <div className="text-[20px] font-bold text-foreground tabular leading-tight">
          {value}
        </div>
        {sub && (
          <div className="text-[11px] text-muted-foreground truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
