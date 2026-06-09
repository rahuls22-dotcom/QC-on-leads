"use client";

// Personas empty state. Shown when a surface has no personas to display —
// most often because campaigns were *imported* (so Spot never ran persona
// research) rather than launched. Also drives the global "Preview empty
// states" toggle on the Personas page.

import { Plus } from "lucide-react";
import { IllustrationPersonas } from "@/components/illustrations/empty-states";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";

export function PersonasEmptyState({
  compact = false,
  productName,
}: {
  compact?: boolean;
  productName?: string;
}) {
  const askSpot = useSpotStore((s) => s.askSpot);

  const body = productName
    ? `Campaigns for ${productName} were imported, so Spot hasn't built personas yet. Run persona research and Spot will draft who's converting from the imported data + the audience graph.`
    : `Your campaigns were imported, so Spot hasn't built personas yet. Run persona research and Spot will draft target groups from your campaign data and the Revspot audience graph.`;

  const researchQuery = productName
    ? `Research personas for ${productName} from my imported campaigns and propose who I should target.`
    : `Research personas from my imported campaigns and propose who I should target.`;

  return (
    <div
      className={`bg-white border border-border rounded-card flex flex-col items-center text-center ${
        compact ? "px-6 py-10" : "px-6 py-16"
      }`}
    >
      <IllustrationPersonas />
      <h3 className="text-[16px] font-semibold text-text-primary mt-4">No personas yet</h3>
      <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1.5 max-w-[440px]">
        {body}
      </p>
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => askSpot(researchQuery)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
        >
          <SpotMark size={13} />
          Research personas with Spot
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px] font-medium text-text-secondary hover:text-text-primary"
        >
          <Plus size={14} strokeWidth={2} />
          Add persona
        </button>
      </div>
    </div>
  );
}
