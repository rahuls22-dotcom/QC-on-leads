import Link from "next/link";
import { cn } from "@/lib/utils";
import { scoreFillClass, scoreTextClass } from "@/lib/agents-data";

// Small shared presentational pieces for the /agents screens.

/** Score-band-colored progress bar. */
export function ScoreBar({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-1.5 rounded-full bg-secondary overflow-hidden",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full", scoreFillClass(score))}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

/** Big band-colored number. */
export function ScoreNumber({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular font-bold", scoreTextClass(score), className)}>
      {score}
    </span>
  );
}

export function Sparkline({
  data,
  w = 240,
  h = 56,
}: {
  data: number[];
  w?: number;
  h?: number;
}) {
  const { points, lastX, lastY, rising } = sparklinePoints(data, w, h);
  const stroke = rising ? "var(--color-success)" : "var(--color-destructive)";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: h }}
    >
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
      <circle cx={lastX} cy={lastY} r={2.5} fill={stroke} />
    </svg>
  );
}

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-[12.5px] mb-4">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {c.href && !last ? (
              <Link
                href={c.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={
                  last ? "text-foreground font-medium" : "text-muted-foreground"
                }
              >
                {c.label}
              </span>
            )}
            {!last && <span className="text-border">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

const outcomeCls = {
  qualified: "bg-success-bg text-success",
  disqualified: "bg-destructive-bg text-destructive",
  hangup: "bg-secondary text-secondary-foreground",
} as const;

export function OutcomeBadge({
  outcome,
}: {
  outcome: "qualified" | "disqualified" | "hangup";
}) {
  const label =
    outcome === "qualified"
      ? "Qualified"
      : outcome === "disqualified"
        ? "Disqualified"
        : "Hangup";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-[3px] text-[11.5px] font-medium whitespace-nowrap",
        outcomeCls[outcome],
      )}
    >
      {label}
    </span>
  );
}

/** Live / Paused / Draft pill matching the leads StatusPill look. */
export function AgentStatusPill({
  status,
}: {
  status: "live" | "paused" | "draft";
}) {
  const map = {
    live: { cls: "bg-success-bg text-success", label: "Live" },
    paused: { cls: "bg-warning-bg text-warning", label: "Paused" },
    draft: { cls: "bg-secondary text-secondary-foreground", label: "Draft" },
  } as const;
  const { cls, label } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs whitespace-nowrap",
        cls,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
      {label}
    </span>
  );
}
