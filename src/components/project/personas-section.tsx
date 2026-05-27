"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Plus, ArrowUpRight } from "lucide-react";
import type { ProjectDetail } from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { PersonaList } from "./persona-list";
import { PersonaWorkspace } from "./persona-workspace";
import { InlineSpotComposer, type StreamItem } from "./inline-spot-composer";

/**
 * Personas tab — two-pane workspace.
 *
 * Left: compact persona list (always visible, click to switch).
 * Right: the selected persona's workspace (header, WPS, angles).
 *
 * This replaces the old stacked-cards layout that crammed every persona's
 * angles, concepts, and sizes into one long scroll. Now you scan personas
 * on the left and work on one at a time on the right.
 *
 * "+ New persona with Spot" lives at the top — drafts a persona inline,
 * streams the fields, then auto-selects the new persona so the user
 * lands in its workspace.
 */
export function PersonasSection({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  // Selected persona — defaults to first; null when project has none.
  const [selectedId, setSelectedId] = useState<string | null>(
    project.personas[0]?.id ?? null,
  );

  // Keep selection valid when the persona list shrinks (e.g., undo) or
  // when a fresh project loads with different personas.
  useEffect(() => {
    if (project.personas.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!project.personas.find((p) => p.id === selectedId)) {
      setSelectedId(project.personas[0].id);
    }
  }, [project.personas, selectedId]);

  // Inline "+ New persona with Spot" composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [streamItems, setStreamItems] = useState<StreamItem[] | null>(null);
  const persistFn = useRef<((i: number) => void) | null>(null);
  const newlyCreatedId = useRef<string | null>(null);

  const startNewPersona = (userPrompt: string) => {
    const used = new Set(project.personas.map((p) => p.name));
    const candidates = SAMPLE_PERSONAS.filter((p) => !used.has(p.name));
    const pick = userPrompt
      ? {
          name:
            userPrompt.length > 32
              ? userPrompt.slice(0, 32) + "…"
              : userPrompt,
          role: "Drafted from your prompt",
          age: 40,
          want: userPrompt,
          pain: "(Spot will refine after you review)",
          usp: "(Spot will refine after you review)",
        }
      : candidates[0] || SAMPLE_PERSONAS[0];

    const items: StreamItem[] = [
      { id: "p", label: `Drafting "${pick.name}"`, indent: 0 },
      { id: "p-role", label: "Role + age", sub: pick.role, indent: 1 },
      { id: "p-want", label: "Want", sub: pick.want, indent: 1 },
      { id: "p-pain", label: "Pain point", sub: pick.pain, indent: 1 },
      { id: "p-usp", label: "USP that resonates", sub: pick.usp, indent: 1 },
    ];
    setStreamItems(items);
    persistFn.current = (i) => {
      if (i !== items.length - 1) return;
      const newId = `persona-${Date.now().toString(36)}`;
      newlyCreatedId.current = newId;
      mutateRuntimeProject(project.id, (p) => {
        p.personas.push({
          id: newId,
          name: pick.name,
          age: pick.age,
          role: pick.role,
          share: 0,
          approved: false,
          draft: true,
          oneLiner: pick.want,
          want: pick.want,
          painPoint: pick.pain,
          usp: pick.usp,
          demographics: [],
          motivations: [],
          objections: [],
          channels: ["Meta", "Google"],
          verifiedLeads: 0,
          cpvl: "—",
          angles: [],
        });
      });
    };
  };

  const closeNewPersona = () => {
    // If we created a persona during this composer's run, auto-select it.
    if (newlyCreatedId.current) {
      setSelectedId(newlyCreatedId.current);
      newlyCreatedId.current = null;
    }
    setComposerOpen(false);
    setStreamItems(null);
    persistFn.current = null;
  };

  const selected = project.personas.find((p) => p.id === selectedId) ?? null;

  return (
    <div>
      <SectionHeader
        icon={Users}
        title="Personas"
        subtitle={
          project.personas.length === 0
            ? "No personas yet — draft one to start"
            : `${project.personas.length} persona${project.personas.length === 1 ? "" : "s"} · click a row to work on one`
        }
        onAsk={() =>
          onAsk("Audit personas — who's converting, who isn't?")
        }
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/projects/${project.id}/deep/personas`}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
            >
              <ArrowUpRight size={11} /> Deep dive
            </a>
            {!composerOpen && (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="apply-btn"
                style={{
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                }}
              >
                <Plus size={11} /> New persona with Spot
              </button>
            )}
          </div>
        }
      />

      {composerOpen && (
        <div className="mb-3">
          <InlineSpotComposer
            prompt="Draft a new persona for this project"
            placeholder="Describe a persona in a sentence (e.g. 'NRI families in their 40s shopping for a second home with rental yield')…"
            primaryLabel="Draft from prompt"
            secondaryLabel="Just draft 1"
            onStart={startNewPersona}
            onCancel={closeNewPersona}
            streamItems={streamItems ?? undefined}
            streamHeader="Drafting persona"
            onItemComplete={(i) => persistFn.current?.(i)}
            onDone={closeNewPersona}
          />
        </div>
      )}

      {/* Two-pane body */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "260px minmax(0, 1fr)",
          alignItems: "start",
        }}
      >
        <PersonaList
          personas={project.personas}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div>
          {selected ? (
            <PersonaWorkspace project={project} persona={selected} onAsk={onAsk} />
          ) : (
            <div
              className="card-base p-10 text-center text-[12.5px] text-text-tertiary"
              style={{ background: "var(--bg-page)" }}
            >
              Pick a persona on the left to start working — or draft a new one
              above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sample personas for the new-persona composer ───────────────────────

const SAMPLE_PERSONAS = [
  {
    name: "The Senior Tech Lead",
    role: "VP Engineering · 40s · Pune East",
    age: 41,
    want: "A future-proof family home with a strong school zone",
    pain: "Long commutes from Hinjewadi cut into family time",
    usp: "8 min to top international schools · branded developer",
  },
  {
    name: "The NRI Investor",
    role: "Senior Manager · 45 · Dubai → India",
    age: 45,
    want: "Branded second home with rental yield + occasional family use",
    pain: "Hard to trust remote management while abroad",
    usp: "RERA-cleared + managed rental program + builder warranty",
  },
  {
    name: "The Pune Returnee",
    role: "Product Director · 38 · returning from Bangalore",
    age: 38,
    want: "Familiar luxury, walkable to schools and amenities",
    pain: "Pune options feel under-amenitized compared to BLR",
    usp: "Sky-clubhouse + lowest density + smart-home spec",
  },
];
