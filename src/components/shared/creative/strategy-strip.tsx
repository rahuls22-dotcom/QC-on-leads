"use client";

import { useState } from "react";
import { Target, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StrategyStripProps {
  angleName: string;
  personaName: string;
  personaRole?: string;
  painPoint?: string;
  usp?: string;
  hook: string;
  cta: string;
}

/**
 * A compact, collapsible strip that surfaces the creative strategy
 * (pain point / USP / hook / CTA) inside the generator modal — so the
 * user can refer back to the strategy while iterating in Phase B or C.
 */
export function StrategyStrip({
  angleName,
  personaName,
  personaRole,
  painPoint,
  usp,
  hook,
  cta,
}: StrategyStripProps) {
  const [open, setOpen] = useState(false);

  const fields: { label: string; value?: string }[] = [
    { label: "Pain point", value: painPoint },
    { label: "USP", value: usp },
    { label: "Hook", value: hook },
    { label: "CTA", value: cta },
  ];

  return (
    <div className="border-b border-border bg-[#FAFAF8]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-2 hover:bg-white transition-colors duration-150 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Target size={12} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
          <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
            Creative strategy
          </span>
          <span className="text-[11px] text-text-tertiary truncate">
            · {angleName} for {personaName}
            {personaRole && (
              <span className="text-text-tertiary/70"> · {personaRole}</span>
            )}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-text-tertiary group-hover:text-text-primary transition-colors shrink-0">
          {open ? "Hide" : "Show"}
          {open ? (
            <ChevronUp size={11} strokeWidth={1.5} />
          ) : (
            <ChevronDown size={11} strokeWidth={1.5} />
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="strategy-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-x-5 gap-y-2 px-5 pb-3 pt-1">
              {fields.map((f) => (
                <div key={f.label} className="min-w-0">
                  <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
                    {f.label}
                  </div>
                  <div
                    className="text-[12px] text-text-primary leading-snug line-clamp-3"
                    title={f.value ?? "—"}
                  >
                    {f.value ?? <span className="text-text-tertiary">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
