import { cn } from "@/lib/utils";

export type StatusType =
  | "success"   // Approved, qualified
  | "error"     // Rejected, failed
  | "progress"  // In review, processing
  | "warning"   // Flagged, needs attention
  | "neutral";  // Pending, idle

const styles: Record<StatusType, string> = {
  success: "bg-success-bg text-success",
  error: "bg-destructive-bg text-destructive",
  progress: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-secondary text-secondary-foreground",
};

/**
 * Read-only status indicator. Filled pill with leading dot.
 * Not interactive — `cursor-default`, no hover.
 */
export function StatusPill({
  type,
  children,
  className,
}: {
  type: StatusType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs cursor-default whitespace-nowrap",
        styles[type],
        className,
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: "currentColor" }}
      />
      {children}
    </span>
  );
}
