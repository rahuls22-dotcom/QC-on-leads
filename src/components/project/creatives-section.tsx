"use client";

import { useMemo, useState } from "react";
import { Layers, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { ProjectDetail, Persona, Angle, Creative } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";

type Row = { persona: Persona; angle: Angle; creative: Creative };

type StatusFilter = "all" | "tested" | "untested";

function hueFor(id: string) {
  return (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
}

export function CreativesSection({
  project,
  onAsk,
  onGoToPersonas,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  /**
   * Routes the user to the Personas tab where the inline Spot composer
   * for drafting concepts lives. The legacy CreativesFlow modal was
   * removed in PR 2 of the project-page redesign.
   */
  onGoToPersonas?: () => void;
}) {
  const rows: Row[] = useMemo(
    () =>
      project.personas.flatMap((persona) =>
        persona.angles.flatMap((angle) =>
          angle.concept.creatives.map((creative) => ({ persona, angle, creative })),
        ),
      ),
    [project],
  );

  // An angle is "tested" once it is live in the canonical project data.
  const isTested = (row: Row) => row.angle.status === "live";

  const totalTested = rows.filter(isTested).length;
  const totalUntested = rows.length - totalTested;
  const totalAngles = new Set(rows.map((r) => r.angle.id)).size;

  // Filters: persona, angle, status. Persona/angle multi-select, status single.
  const [personaFilter, setPersonaFilter] = useState<Set<string>>(new Set());
  const [angleFilter, setAngleFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = rows.filter((r) => {
    if (personaFilter.size > 0 && !personaFilter.has(r.persona.id)) return false;
    if (angleFilter.size > 0 && !angleFilter.has(r.angle.id)) return false;
    if (statusFilter === "tested" && !isTested(r)) return false;
    if (statusFilter === "untested" && isTested(r)) return false;
    return true;
  });

  const toggle = (set: Set<string>, id: string, setter: (next: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  // Stable list of angles across all personas, deduped, with persona name appended for readability
  const angleOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string }>();
    rows.forEach((r) => {
      if (!seen.has(r.angle.id)) {
        seen.set(r.angle.id, { id: r.angle.id, label: r.angle.name });
      }
    });
    return Array.from(seen.values());
  }, [rows]);

  // ─── Empty state ───────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div>
        <SectionHeader
          icon={Layers}
          title="Creatives"
          subtitle="No creatives yet · ready to draft"
          onAsk={() => onAsk("How many creative angles should I draft per persona to start?")}
        />
        <div
          className="rounded-[14px] p-8 text-center"
          style={{
            background: "linear-gradient(135deg, #FBF7FF 0%, #FFF 60%)",
            border: "1px solid #C8A8FF",
          }}
        >
          <div
            className="inline-flex items-center justify-center mb-3"
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
              boxShadow: "0 6px 18px rgba(124,58,237,0.3)",
            }}
          >
            <Layers size={22} />
          </div>
          <div className="text-[15px] font-semibold mb-1">No creatives yet</div>
          <div
            className="text-[12.5px] text-text-secondary leading-[1.5] mx-auto mb-4"
            style={{ maxWidth: 440 }}
          >
            Creative angles live with your project — Pain × USP × Hook × CTA combinations you can
            reuse across every campaign. I&apos;ll draft 2 per persona to get you started.
          </div>
          {onGoToPersonas && (
            <button
              type="button"
              onClick={onGoToPersonas}
              className="apply-btn"
              style={{
                height: 38,
                fontSize: 13,
                padding: "0 18px",
                background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              }}
            >
              <Sparkles size={13} /> Open Personas to draft creatives
            </button>
          )}
          <div className="text-[10.5px] text-text-tertiary mt-3">
            Creatives are drafted per angle on the Personas tab — open it and
            click &quot;Draft concepts with Spot&quot; on any angle.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        icon={Layers}
        title="Creatives"
        subtitle={`${rows.length} creatives across ${totalAngles} angles · ${totalTested} tested · ${totalUntested} untested`}
        onAsk={() =>
          onAsk("Which untested angles should I prioritize? Group by persona where appropriate.")
        }
      />

      {/* Filter bar */}
      <div className="card-base p-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <FilterGroup label="Persona">
          {project.personas.map((p) => (
            <Chip
              key={p.id}
              active={personaFilter.has(p.id)}
              onClick={() => toggle(personaFilter, p.id, setPersonaFilter)}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: `oklch(0.78 0.09 ${hueFor(p.id)})`,
                }}
              />
              {p.name}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Angle">
          {angleOptions.map((a) => (
            <Chip
              key={a.id}
              active={angleFilter.has(a.id)}
              onClick={() => toggle(angleFilter, a.id, setAngleFilter)}
            >
              {a.label}
            </Chip>
          ))}
        </FilterGroup>

        <FilterGroup label="Status">
          {(["all", "tested", "untested"] as StatusFilter[]).map((s) => (
            <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s === "tested" ? (
                <>
                  <CheckCircle2 size={10} /> Tested
                </>
              ) : (
                <>
                  <Circle size={10} /> Untested
                </>
              )}
            </Chip>
          ))}
        </FilterGroup>

        {(personaFilter.size > 0 || angleFilter.size > 0 || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setPersonaFilter(new Set());
              setAngleFilter(new Set());
              setStatusFilter("all");
            }}
            className="ml-auto inline-flex items-center h-6 px-2 rounded-button text-[11px] text-text-tertiary hover:text-text-secondary"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card-base px-6 py-10 text-center">
          <div className="text-[13px] font-medium mb-1">No creatives match these filters</div>
          <div className="text-[11.5px] text-text-tertiary">
            Try clearing one of the filter chips above.
          </div>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          {filtered.map((row) => (
            <CreativeTile key={row.creative.id} row={row} tested={isTested(row)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold pr-1">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] transition-colors"
      style={{
        background: active ? "#1A1A1A" : "var(--bg-page)",
        color: active ? "#FFF" : "var(--text-2)",
        border: `1px solid ${active ? "#1A1A1A" : "var(--border)"}`,
      }}
    >
      {children}
    </button>
  );
}

function CreativeTile({ row, tested }: { row: Row; tested: boolean }) {
  const hue = hueFor(row.persona.id);
  return (
    <div
      className="card-base overflow-hidden flex flex-col"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          background: `repeating-linear-gradient(135deg, oklch(0.9 0.05 ${hue}) 0 8px, oklch(0.82 0.06 ${(hue + 30) % 360}) 8px 16px)`,
          position: "relative",
        }}
      >
        <span
          className="pill"
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            fontSize: 9.5,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {row.creative.format} · {row.creative.platform}
        </span>
        <span
          className="pill"
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            fontSize: 9.5,
            background: tested ? "var(--ok-bg)" : "rgba(255,255,255,0.92)",
            color: tested ? "var(--ok-fg)" : "var(--text-tertiary)",
            border: `1px solid ${tested ? "var(--ok-fg)" : "var(--border-subtle)"}`,
          }}
        >
          {tested ? (
            <>
              <CheckCircle2 size={9} /> Tested
            </>
          ) : (
            <>
              <Circle size={9} /> Untested
            </>
          )}
        </span>
      </div>
      <div className="p-2.5 flex-1 flex flex-col">
        <div className="text-[12px] font-medium truncate">{row.angle.name}</div>
        <div className="text-[10.5px] text-text-tertiary truncate mt-0.5">{row.persona.name}</div>
        {row.creative.cpvl != null && (
          <div className="text-[10.5px] text-text-tertiary mt-1.5 tabular-nums">
            CPVL ₹{row.creative.cpvl.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
