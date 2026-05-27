"use client";

// Popover invoked from "+ Add filter". Step 1: pick a dimension. Step 2: pick
// values for it (enum: checkbox list; range: min/max inputs; bool: Yes/No).
// Confirms with Apply → returns a new FilterClause to the parent.

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { DIM_REGISTRY } from "@/lib/dashboard/dim-registry";
import type { FilterClause, FilterDim } from "@/lib/dashboard/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (clause: FilterClause) => void;
  /** Dims already in the active filter set — disabled in the picker. */
  activeDims: FilterDim[];
}

export function AddFilterMenu({ open, onClose, onApply, activeDims }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState<"pick-dim" | "pick-value">("pick-dim");
  const [dim, setDim] = useState<FilterDim | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("pick-dim");
      setDim(null);
      setSelected(new Set());
      setRangeMin("");
      setRangeMax("");
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pickedDim = dim ? DIM_REGISTRY[dim] : null;

  return (
    <div
      ref={rootRef}
      className="absolute top-full left-0 mt-1 z-30 min-w-[260px] bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.08)] overflow-hidden"
    >
      {step === "pick-dim" && (
        <div className="py-1 max-h-[320px] overflow-y-auto">
          {Object.values(DIM_REGISTRY).map((d) => {
            const disabled = activeDims.includes(d.id);
            return (
              <button
                key={d.id}
                disabled={disabled}
                onClick={() => {
                  setDim(d.id);
                  setStep("pick-value");
                }}
                className={[
                  "w-full text-left px-3 py-2 text-[12.5px] flex items-center justify-between gap-3",
                  disabled
                    ? "text-text-tertiary cursor-not-allowed"
                    : "text-text-primary hover:bg-surface-page",
                ].join(" ")}
              >
                <span>{d.label}</span>
                {disabled ? (
                  <span className="text-[10px] text-text-tertiary">in use</span>
                ) : (
                  <ChevronRight size={12} strokeWidth={1.75} className="text-text-tertiary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {step === "pick-value" && pickedDim && (
        <div className="p-3 w-[260px]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
              {pickedDim.label}
            </div>
            <button
              onClick={() => setStep("pick-dim")}
              className="text-[11px] text-text-tertiary hover:text-text-primary"
            >
              ← back
            </button>
          </div>

          {pickedDim.type === "enum" && pickedDim.values && (
            <div className="space-y-1 max-h-[200px] overflow-y-auto -mx-1 px-1">
              {pickedDim.values.map((v) => {
                const checked = selected.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => {
                      const next = new Set(selected);
                      if (checked) next.delete(v);
                      else next.add(v);
                      setSelected(next);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[12.5px] rounded-input hover:bg-surface-page"
                  >
                    <span
                      className={[
                        "w-3.5 h-3.5 border rounded-[3px] flex items-center justify-center flex-shrink-0",
                        checked ? "bg-text-primary border-text-primary" : "border-border",
                      ].join(" ")}
                    >
                      {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                    </span>
                    <span className="text-text-primary">{v}</span>
                  </button>
                );
              })}
            </div>
          )}

          {(pickedDim.type === "range_money" || pickedDim.type === "range_number") && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={`min${pickedDim.unitHint ? ` (${pickedDim.unitHint})` : ""}`}
                value={rangeMin}
                onChange={(e) => setRangeMin(e.target.value)}
                className="flex-1 h-7 px-2 text-[12px] bg-white border border-border rounded-input"
              />
              <span className="text-text-tertiary text-[11px]">to</span>
              <input
                type="number"
                placeholder={`max${pickedDim.unitHint ? ` (${pickedDim.unitHint})` : ""}`}
                value={rangeMax}
                onChange={(e) => setRangeMax(e.target.value)}
                className="flex-1 h-7 px-2 text-[12px] bg-white border border-border rounded-input"
              />
            </div>
          )}

          {pickedDim.type === "bool" && (
            <div className="flex gap-2">
              {["Yes", "No"].map((v) => {
                const checked = selected.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => setSelected(new Set([v]))}
                    className={[
                      "flex-1 h-7 text-[12px] border rounded-input",
                      checked
                        ? "bg-text-primary border-text-primary text-white"
                        : "bg-white border-border text-text-primary",
                    ].join(" ")}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (!pickedDim) return;
                let clause: FilterClause | null = null;
                if (pickedDim.type === "enum" && selected.size > 0) {
                  clause = { dim: pickedDim.id, op: "in", value: [...selected] };
                } else if (pickedDim.type === "range_money" || pickedDim.type === "range_number") {
                  const scale = pickedDim.inputScale ?? 1;
                  const lo = rangeMin ? Number(rangeMin) * scale : NaN;
                  const hi = rangeMax ? Number(rangeMax) * scale : NaN;
                  if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
                    clause = { dim: pickedDim.id, op: "between", value: [lo, hi] };
                  } else if (!Number.isNaN(lo)) {
                    clause = { dim: pickedDim.id, op: "gte", value: lo };
                  } else if (!Number.isNaN(hi)) {
                    clause = { dim: pickedDim.id, op: "lte", value: hi };
                  }
                } else if (pickedDim.type === "bool" && selected.size > 0) {
                  const val = selected.has("Yes");
                  clause = { dim: pickedDim.id, op: "eq", value: val ? "Yes" : "No" };
                }
                if (clause) {
                  onApply(clause);
                  onClose();
                }
              }}
              className="h-7 px-3 text-[12px] font-medium bg-text-primary text-white rounded-button hover:bg-accent-hover transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
