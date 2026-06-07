"use client";

// Inline banner shown on Enrichment surfaces when the workspace has
// storage disabled. Lighter than EnrichedLeadsNoStorage (full-page),
// used at the top of Dashboard + Operations so the user always knows
// records won't persist.

import { EyeOff } from "lucide-react";

export function EnrichmentStorageOffNotice() {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-[#FEF3C7]/40 border border-[#F59E0B]/30 rounded-card">
      <div className="w-7 h-7 rounded-[6px] bg-white border border-[#F59E0B]/30 flex items-center justify-center flex-shrink-0">
        <EyeOff size={14} strokeWidth={1.75} className="text-[#92400E]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
          Storage off, enrichment runs in-flight
        </div>
        <div className="text-[11.5px] text-text-secondary leading-snug">
          Bulk results download as time-limited CSVs. CRM-sourced leads write straight back. Nothing is saved to Revspot.
        </div>
      </div>
    </div>
  );
}
