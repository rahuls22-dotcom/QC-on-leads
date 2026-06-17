"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centred modal shell shared by the Tools-library flows (built-in settings,
 * type chooser, custom form, delete). Matches the app's ModalShell pattern
 * in components/agents/modals.tsx — backdrop bg-foreground/30, card dialog,
 * Escape + backdrop click to close. Kept standalone so the tab owns its own
 * modal state without touching the AgentsUI context.
 */
export function ModalShell({
  open,
  onClose,
  children,
  width = "max-w-[560px]",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "my-auto w-full rounded-xl border border-border bg-card shadow-xl",
          width,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Standard modal header: icon tile, title, sub-line, optional badge, close. */
export function ModalHeader({
  icon,
  title,
  subtitle,
  badge,
  onClose,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border-subtle">
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-semibold text-foreground">
          {title}
        </h2>
        {subtitle && (
          <div className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {badge}
      <button
        aria-label="Close"
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
