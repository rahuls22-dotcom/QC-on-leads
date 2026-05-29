"use client";

import { useEffect, useRef, useState } from "react";
import {
  Filter,
  Calendar,
  Heart,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MismatchFilter = "all" | "yes" | "no";

interface FiltersPopoverProps {
  open: boolean;
  onClose: () => void;
  mismatch: MismatchFilter;
  onMismatchChange: (v: MismatchFilter) => void;
  onClearAll: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

/* ────────────────────────────────────────────────────────────────────────
 * Filters popover — production pattern.
 *
 * Anchored card with a long list of filter rows. Each row shows the
 * filter's label and current value (e.g. "Status: All"). Clicking a row
 * opens a small floating menu beside it to pick a value.
 *
 * Only "Qualification Mismatch" is functional for the QC workflow; the
 * other filters are scaffolded with the same chrome so the popover
 * visually matches the production screen.
 * ──────────────────────────────────────────────────────────────────── */

type FilterRow = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  options: string[];
};

const STATIC_ROWS: FilterRow[] = [
  { key: "createdDate",  label: "Created Date",   icon: Calendar, options: ["All", "Last 24h", "Last 7d", "Last 30d"] },
  { key: "updatedDate",  label: "Updated Date",   icon: Calendar, options: ["All", "Last 24h", "Last 7d", "Last 30d"] },
  { key: "status",       label: "Status",         icon: Filter,   options: ["All", "Active", "Paused", "Archived"] },
  { key: "interest",     label: "Interest Level", icon: Heart,    options: ["All", "Hot", "Warm", "Lukewarm", "Cold"] },
  { key: "callDuration", label: "Call Duration (s)", icon: Clock, options: ["All", "0", "1-30", "31-60", "60+"] },
  { key: "crmStatus",    label: "CRM Status",     icon: CheckCircle2, options: ["All", "Synced", "Pending", "Failed"] },
  { key: "reviewed",     label: "Reviewed",       icon: CheckCircle2, options: ["All", "Yes", "No", "Failed"] },
  { key: "enriched",     label: "Enriched",       icon: CheckCircle2, options: ["All", "Yes", "No", "Failed"] },
  { key: "financial",    label: "Financial Data", icon: CheckCircle2, options: ["All", "Yes", "No"] },
  { key: "sqlMarked",    label: "SQL Marked",     icon: Filter,   options: ["All", "Yes", "No"] },
  { key: "source",       label: "Source",         icon: Filter,   options: ["All", "Voice Agent", "Form", "WhatsApp", "CSV"] },
  { key: "temperature",  label: "Temperature",    icon: Filter,   options: ["All", "Hot", "Warm", "Lukewarm", "Cold"] },
  { key: "aiQual",       label: "AI Qualification Status", icon: Filter,
    options: ["All", "Qualified", "Intent Qualified", "Follow up", "RnR On Voicemail", "Disqualified"] },
  { key: "whatsapp",     label: "WhatsApp Status", icon: Filter,  options: ["All", "Sent", "Delivered", "Read", "Failed"] },
];

const MISMATCH_OPTIONS: { value: MismatchFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "yes", label: "Yes" },
  { value: "no",  label: "No" },
];

export function FiltersPopover({
  open,
  onClose,
  mismatch,
  onMismatchChange,
  onClearAll,
  anchorRef,
}: FiltersPopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Which filter row currently has its dropdown open
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // Stub state for non-functional rows so the dropdown selection visually persists
  const [stubValues, setStubValues] = useState<Record<string, string>>({});

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (activeKey) setActiveKey(null);
        else onClose();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef, activeKey]);

  if (!open) return null;

  const mismatchValueLabel =
    MISMATCH_OPTIONS.find((o) => o.value === mismatch)?.label ?? "All";

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+6px)] z-50 w-[360px] rounded-lg border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      role="dialog"
      aria-label="Filters"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[15px] font-semibold">Filters</span>
        <button
          onClick={() => {
            onClearAll();
            setStubValues({});
            setActiveKey(null);
          }}
          className="text-[13px] text-primary hover:underline underline-offset-2"
        >
          Clear All
        </button>
      </div>

      <div className="px-3 py-3 space-y-2 max-h-[460px] overflow-y-auto">
        {/* Qualification Mismatch — the functional QC filter, pinned to the
            top so it's visible without scrolling. */}
        <FilterPickerRow
          icon={Filter}
          label="Qualification Mismatch"
          value={mismatchValueLabel}
          dirty={mismatch !== "all"}
          openMenu={activeKey === "mismatch"}
          onToggle={() =>
            setActiveKey((k) => (k === "mismatch" ? null : "mismatch"))
          }
          options={MISMATCH_OPTIONS.map((o) => o.label)}
          selectedOption={mismatchValueLabel}
          onPick={(opt) => {
            const match = MISMATCH_OPTIONS.find((o) => o.label === opt);
            if (match) onMismatchChange(match.value);
            setActiveKey(null);
          }}
        />

        {/* Static rows — same chrome, non-functional. */}
        {STATIC_ROWS.map((row) => {
          const Icon = row.icon;
          const value = stubValues[row.key] ?? "All";
          return (
            <FilterPickerRow
              key={row.key}
              icon={Icon}
              label={row.label}
              value={value}
              dirty={value !== "All"}
              openMenu={activeKey === row.key}
              onToggle={() =>
                setActiveKey((k) => (k === row.key ? null : row.key))
              }
              options={row.options}
              selectedOption={value}
              onPick={(opt) => {
                setStubValues((s) => ({ ...s, [row.key]: opt }));
                setActiveKey(null);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Filter row + dropdown menu ────────────────────────────────────────────

function FilterPickerRow({
  icon: Icon,
  label,
  value,
  dirty,
  openMenu,
  onToggle,
  options,
  selectedOption,
  onPick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  value: string;
  dirty: boolean;
  openMenu: boolean;
  onToggle: () => void;
  options: string[];
  selectedOption: string;
  onPick: (opt: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 h-10 rounded-md border bg-card text-left text-[13px] transition-colors",
          dirty
            ? "border-foreground"
            : "border-border hover:border-foreground/40",
        )}
      >
        <Icon size={14} strokeWidth={1.75} className="text-muted-foreground" />
        <span className="text-foreground">
          {label}: <span className={dirty ? "font-medium" : "text-muted-foreground"}>{value}</span>
        </span>
      </button>

      {/* Floating dropdown menu */}
      {openMenu && (
        <div className="absolute left-3 top-[calc(100%+4px)] z-10 min-w-[180px] rounded-lg border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-1.5">
          {options.map((opt) => {
            const active = opt === selectedOption;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onPick(opt)}
                className={cn(
                  "w-[calc(100%-12px)] mx-1.5 my-0.5 px-3 h-9 rounded-md text-left text-[13.5px] transition-colors",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
