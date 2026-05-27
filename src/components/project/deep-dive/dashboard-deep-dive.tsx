"use client";

import type { ProjectDetail } from "@/lib/project-data";
import { DashboardSection } from "../dashboard-section";

/**
 * Dashboard deep-dive — renders the regular Dashboard tab content at
 * deep-dive width. PR C's Dashboard already has charts + click-to-
 * visualize, so the deep-dive view just gets a roomier shell.
 */
export function DashboardDeepDive({ project }: { project: ProjectDetail }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-[10px] p-3 fadeUp"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
        }}
      >
        <div className="text-[12.5px] font-semibold mb-0.5">
          Dashboard deep dive
        </div>
        <div className="text-[11.5px] text-text-secondary leading-[1.55]">
          Project pulse at full width — click any metric tile to expand a
          14-day chart with per-persona breakdown. The Spot panel on the
          right answers free-text questions about any of these numbers.
        </div>
      </div>
      <DashboardSection project={project} onAsk={() => {}} />
    </div>
  );
}
