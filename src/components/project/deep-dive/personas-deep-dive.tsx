"use client";

import type { ProjectDetail } from "@/lib/project-data";
import { PersonasSection } from "../personas-section";

/**
 * Personas deep-dive — the regular Personas tab content laid out at the
 * deep-dive container's full width. PR 3 ships this as a pass-through;
 * a future pass can add per-persona TOFU/MOFU/BOFU funnel cards beside
 * each persona card.
 */
export function PersonasDeepDive({ project }: { project: ProjectDetail }) {
  return (
    <div className="space-y-3">
      <DeepDiveCalloutCard
        title="Persona deep dive"
        body="Full Persona → Angle → Concept → Sizes hierarchy at deep-dive width. The Spot panel on the right understands persona context — ask about winning angles, untested ideas, or persona-mix performance."
      />
      <PersonasSection project={project} onAsk={() => {}} />
    </div>
  );
}

function DeepDiveCalloutCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-[10px] p-3 fadeUp"
      style={{
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
      }}
    >
      <div className="text-[12.5px] font-semibold mb-0.5">{title}</div>
      <div className="text-[11.5px] text-text-secondary leading-[1.55]">{body}</div>
    </div>
  );
}
