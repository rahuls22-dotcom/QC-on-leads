"use client";

import { Check } from "lucide-react";
import type { Persona } from "@/lib/project-data";
import { PersonaAvatar } from "./persona-workspace";

/**
 * Compact persona-list — the left pane of the Personas tab. One row per
 * persona, light enough to glance through. Clicking a row swaps the
 * workspace on the right; no other state.
 */
export function PersonaList({
  personas,
  selectedId,
  onSelect,
}: {
  personas: Persona[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (personas.length === 0) {
    return (
      <div
        className="card-base p-4 text-center text-[12px] text-text-tertiary"
        style={{ background: "var(--bg-page)" }}
      >
        No personas yet — draft one with Spot above.
      </div>
    );
  }

  return (
    <div className="card-base p-1.5">
      <div className="space-y-1">
        {personas.map((p) => (
          <PersonaListRow
            key={p.id}
            persona={p}
            active={p.id === selectedId}
            onClick={() => onSelect(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PersonaListRow({
  persona,
  active,
  onClick,
}: {
  persona: Persona;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[8px] text-left transition-colors"
      style={{
        background: active ? "var(--bg-page)" : "transparent",
        border: `1px solid ${active ? "#1A1A1A" : "transparent"}`,
      }}
    >
      <PersonaAvatar id={persona.id} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold truncate">
            {persona.name}
          </span>
          {persona.draft ? (
            <span
              className="pill"
              style={{
                background: "#FFF8E1",
                color: "#8A6300",
                fontSize: 9,
              }}
            >
              Draft
            </span>
          ) : (
            <Check
              size={10}
              className="text-[var(--ok-fg)] flex-shrink-0"
              strokeWidth={3}
            />
          )}
        </div>
        <div className="text-[10.5px] text-text-tertiary truncate">
          {persona.angles.length} angle{persona.angles.length === 1 ? "" : "s"}
          {!persona.draft && (
            <>
              {" · "}
              <span className="tabular-nums">{persona.verifiedLeads} verified</span>
              {" · "}
              <span className="tabular-nums">{persona.cpvl}</span>
            </>
          )}
        </div>
      </div>
      {!persona.draft && persona.share > 0 && (
        <div
          className="text-[10.5px] tabular-nums flex-shrink-0"
          style={{ color: "var(--text-tertiary)" }}
        >
          {persona.share}%
        </div>
      )}
    </button>
  );
}
