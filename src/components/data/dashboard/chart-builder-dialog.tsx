"use client";

// Modal: build a custom chart card.
//   1. Pick a slice-by dimension (grouped by Professional / Financial / Meta).
//   2. Add filters via AddFilterMenu chips (each filter is AND-ed).
//   3. Name it, see a live preview, Save.
//
// Save returns a CustomChartCard to the caller. The caller persists.

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { groupedDims, DIM_REGISTRY } from "@/lib/dashboard/dim-registry";
import { newCardId } from "@/lib/dashboard/dashboard-storage";
import { clauseLabel } from "@/lib/dashboard/filter-eval";
import type {
  CustomChartCard,
  FilterClause,
  FilterDim,
  LeadProfile,
} from "@/lib/dashboard/types";
import { AddFilterMenu } from "./add-filter-menu";
import { BreakdownChartCard } from "./breakdown-chart-card";

interface Props {
  open: boolean;
  onClose: () => void;
  /** All profiles in the active time/source window, for the live preview. */
  profiles: LeadProfile[];
  /** Existing card to edit (optional). When set, dialog opens pre-filled. */
  existing?: CustomChartCard;
  onSave: (card: CustomChartCard) => void;
}

export function ChartBuilderDialog({ open, onClose, profiles, existing, onSave }: Props) {
  const [dim, setDim] = useState<FilterDim>(existing?.dim ?? "seniority");
  const [name, setName] = useState<string>(existing?.name ?? "");
  const [filters, setFilters] = useState<FilterClause[]>(existing?.filters ?? []);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    setDim(existing?.dim ?? "seniority");
    setName(existing?.name ?? "");
    setFilters(existing?.filters ?? []);
    setFilterMenuOpen(false);
  }, [open, existing]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => groupedDims(), []);
  const dimLabel = DIM_REGISTRY[dim]?.label ?? dim;

  // Sensible default name derived from slice + filter set.
  const placeholderName = useMemo(() => {
    if (filters.length === 0) return `By ${dimLabel}`;
    return `${dimLabel} · ${filters.length} filter${filters.length === 1 ? "" : "s"}`;
  }, [dim, filters, dimLabel]);

  const previewCard: CustomChartCard = useMemo(
    () => ({
      id: existing?.id ?? "preview",
      name: name.trim() || placeholderName,
      dim,
      filters,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }),
    [existing, name, placeholderName, dim, filters],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white border border-border rounded-card w-[820px] max-w-[95vw] max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(15,15,15,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <div className="text-[14px] font-semibold text-text-primary">
              {existing ? "Edit chart" : "Build a chart"}
            </div>
            <div className="text-[11.5px] text-text-secondary mt-0.5">
              Slice your enriched leads by any dimension. Filter to narrow it down.
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary rounded-input"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex-1 min-h-0 grid grid-cols-[1fr_320px]">
          {/* Left: form */}
          <div className="p-5 border-r border-border space-y-5 overflow-visible">
            {/* Name */}
            <div>
              <label className="block text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
                Chart name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholderName}
                className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-input placeholder:text-text-tertiary focus:outline-none focus:border-text-primary/40"
              />
            </div>

            {/* Slice by */}
            <div>
              <label className="block text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
                Slice by
              </label>
              <SlicePicker value={dim} onChange={setDim} grouped={grouped} />
            </div>

            {/* Filters */}
            <div>
              <label className="block text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
                Filters
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {filters.length === 0 && (
                  <span className="text-[12px] text-text-tertiary">
                    No filters, slice covers all leads in the active window.
                  </span>
                )}
                {filters.map((c, i) => (
                  <span
                    key={`${c.dim}-${i}`}
                    className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 text-[11.5px] font-medium text-white bg-text-primary rounded-input"
                  >
                    {clauseLabel(c)}
                    <button
                      onClick={() => setFilters(filters.filter((_, j) => j !== i))}
                      aria-label="Remove filter"
                      className="p-0.5 -mr-0.5 hover:bg-white/15 rounded-[3px] transition-colors"
                    >
                      <X size={11} strokeWidth={2} />
                    </button>
                  </span>
                ))}
                <div className="relative">
                  <button
                    onClick={() => setFilterMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-medium text-text-secondary bg-white border border-border rounded-input hover:text-text-primary"
                  >
                    <Plus size={11} strokeWidth={2} />
                    Add filter
                  </button>
                  <AddFilterMenu
                    open={filterMenuOpen}
                    onClose={() => setFilterMenuOpen(false)}
                    activeDims={filters.map((f) => f.dim)}
                    onApply={(c) => setFilters([...filters, c])}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="p-5 bg-surface-page overflow-y-auto">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary mb-2">
              Preview
            </div>
            <BreakdownChartCard mode="custom" card={previewCard} profiles={profiles} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-page">
          <button
            onClick={onClose}
            className="h-8 px-3 text-[12.5px] font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const card: CustomChartCard = {
                id: existing?.id ?? newCardId(),
                name: name.trim() || placeholderName,
                dim,
                filters,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
              };
              onSave(card);
              onClose();
            }}
            className="h-8 px-4 text-[12.5px] font-medium bg-text-primary text-white rounded-button hover:bg-accent-hover transition-colors"
          >
            {existing ? "Save changes" : "Save chart"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Slice picker (grouped dropdown) ───────────────────────────────────────

function SlicePicker({
  value,
  onChange,
  grouped,
}: {
  value: FilterDim;
  onChange: (v: FilterDim) => void;
  grouped: ReturnType<typeof groupedDims>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = DIM_REGISTRY[value];

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 px-3 inline-flex items-center justify-between text-[13px] bg-white border border-border rounded-input hover:border-text-primary/40"
      >
        <span className="flex items-center gap-2">
          <span className="text-text-tertiary text-[10.5px] uppercase tracking-[0.4px]">
            {current.group}
          </span>
          <span className="text-text-primary">{current.label}</span>
        </span>
        <ChevronDown size={12} strokeWidth={1.75} className="text-text-tertiary" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 w-full max-h-[280px] overflow-y-auto bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08)] py-1">
          {(["Professional", "Financial", "Meta"] as const).map((g) => {
            const dims = grouped[g];
            if (dims.length === 0) return null;
            return (
              <div key={g}>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.5px] text-text-tertiary">
                  {g}
                </div>
                {dims.map((d) => {
                  const active = d.id === value;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        onChange(d.id);
                        setOpen(false);
                      }}
                      className={[
                        "w-full text-left px-3 py-1.5 text-[12.5px] flex items-center justify-between hover:bg-surface-page",
                        active ? "text-text-primary font-medium" : "text-text-primary",
                      ].join(" ")}
                    >
                      <span>{d.label}</span>
                      <span className="text-[10px] text-text-tertiary">{labelType(d.type)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function labelType(t: string): string {
  switch (t) {
    case "enum":
      return "categorical";
    case "range_money":
      return "money";
    case "range_number":
      return "numeric";
    case "bool":
      return "yes / no";
    default:
      return t;
  }
}
