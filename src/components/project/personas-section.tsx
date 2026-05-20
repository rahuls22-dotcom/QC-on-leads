"use client";

import { Users, Sparkles } from "lucide-react";
import { ProjectDetail, Persona } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { PersonaCard } from "./persona-card";
import { useSpotStore } from "@/lib/spot/store";

export function PersonasSection({
  project,
  onAsk,
  onGenerateCreatives,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  /** Open the CreativesFlow modal. Optional angleId scopes the prompt. */
  onGenerateCreatives?: (angleId?: string) => void;
}) {
  const openGuided = useSpotStore((s) => s.openGuided);

  const hasNoCreatives = project.personas.every((p) =>
    p.angles.every((a) => a.concept.creatives.length === 0),
  );

  return (
    <div>
      <SectionHeader
        icon={Users}
        title="Personas"
        subtitle="Who we're selling to · each persona's angles & creatives"
        onAsk={() => onAsk("Audit personas — who's converting, who isn't?")}
        actions={
          <button
            type="button"
            onClick={() => openGuided({ kind: "new-persona", projectId: project.id })}
            className="apply-btn"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
          >
            <Sparkles size={11} /> New persona with Spot
          </button>
        }
      />
      {hasNoCreatives && onGenerateCreatives && (
        <div
          className="rounded-[12px] p-4 mb-3 flex items-center gap-4"
          style={{
            background: "linear-gradient(135deg, #FBF7FF 0%, #FFF 60%)",
            border: "1px solid #C8A8FF",
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold mb-0.5">No creatives yet</div>
            <div className="text-[12px] text-text-secondary leading-[1.5]">
              Want me to draft 2 creatives per persona to get started? You can edit each one
              afterwards.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onGenerateCreatives()}
            className="apply-btn flex-shrink-0"
            style={{
              height: 36,
              fontSize: 12.5,
              padding: "0 14px",
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            }}
          >
            <Sparkles size={12} /> Generate creatives
          </button>
        </div>
      )}
      <div className="space-y-3">
        {project.personas.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            projectId={project.id}
            onAsk={onAsk}
            onGuidedFlow={(kind: "new-angle", persona: Persona) =>
              openGuided({ kind, projectId: project.id, personaId: persona.id })
            }
            onGenerateCreatives={onGenerateCreatives}
          />
        ))}
      </div>
    </div>
  );
}
