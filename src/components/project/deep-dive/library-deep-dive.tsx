"use client";

import type { ProjectDetail } from "@/lib/project-data";
import { LibrarySection } from "../library-section";

/**
 * Library deep-dive — the Library tab content at full deep-dive width.
 * Renders the existing browser; the Spot side panel handles attribution
 * questions ("which images haven't been used yet?" etc.).
 */
export function LibraryDeepDive({ project }: { project: ProjectDetail }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-[10px] p-3 fadeUp"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
        }}
      >
        <div className="text-[12.5px] font-semibold mb-0.5">Library deep dive</div>
        <div className="text-[11.5px] text-text-secondary leading-[1.55]">
          Every visual asset on the project — creatives and source images.
          Filter and ask Spot for attribution analysis on the right.
        </div>
      </div>
      <LibrarySection project={project} onAsk={() => {}} />
    </div>
  );
}
