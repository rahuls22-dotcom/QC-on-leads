"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  RefreshCw,
  Play,
  Pencil,
  Star,
  Video as VideoIcon,
  Image as ImageIcon,
  Check,
  X,
  Loader2,
  Plus,
} from "lucide-react";
import type { Angle, Creative, Persona } from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import {
  getConcepts,
  pickHeadlineSize,
  conceptHasWinner,
  conceptAggregateCpvl,
  type DerivedConcept,
} from "./persona-hierarchy";
import { LaunchCreativeFlow } from "./launch-creative-flow";

/**
 * The new angle hierarchy primitive. Replaces the old AngleCard (lots of
 * nested layers) with a single compact row that expands inline. Inside
 * the expansion: hook/CTA (inline-editable), each concept as a compact
 * row with metrics + per-concept action toolbar (regen, launch, view
 * sizes). Sizes appear in a sub-drawer when the concept's "View sizes"
 * is clicked.
 *
 * Everything happens in-place — no modals, no navigation away.
 */
export function AngleRow({
  projectId,
  persona,
  angle,
  onDraftConcept,
}: {
  projectId: string;
  persona: Persona;
  angle: Angle;
  /** Trigger the inline "+ Draft another concept" composer for this angle. */
  onDraftConcept?: (angleId: string) => void;
}) {
  const concepts = getConcepts(angle);

  // Auto-expand if this angle has a winner so the user lands on data.
  const [expanded, setExpanded] = useState<boolean>(() =>
    concepts.some((c) => conceptHasWinner(c)),
  );
  const [editing, setEditing] = useState(false);
  const [launchingFor, setLaunchingFor] = useState<string | null>(null);
  const [sizesFor, setSizesFor] = useState<string | null>(null);

  // Derive the live data we display in the collapsed-row metric chip.
  const totalLive = angle.concept.creatives.filter((c) => c.spend != null);
  const totalSpend = totalLive.reduce((s, c) => s + (c.spend || 0), 0);
  const totalVerified = totalLive.reduce((s, c) => s + (c.verified || 0), 0);
  const aggCpvl = totalVerified ? Math.round(totalSpend / totalVerified) : null;

  return (
    <div
      className="rounded-[10px]"
      style={{
        background: "#FFF",
        border: `1.5px solid ${expanded ? "#1A1A1A" : "var(--border-subtle)"}`,
        overflow: "hidden",
        transition: "border-color 160ms",
      }}
    >
      {/* Row header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <ChevronRight
          size={13}
          className="text-text-tertiary flex-shrink-0"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 160ms",
          }}
        />
        <span
          style={{
            background: "linear-gradient(135deg, #F4ECFF 0%, #FDF2FF 100%)",
            color: "#7C3AED",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.3,
            flexShrink: 0,
          }}
        >
          {angle.name}
        </span>
        <span
          className={`pill ${angle.status === "live" ? "pill-ok" : "pill-warn"}`}
          style={{ fontSize: 10 }}
        >
          {angle.status === "live" ? "Live" : "Draft"}
        </span>
        <span className="text-[11px] text-text-tertiary truncate flex-1 min-w-0">
          {concepts.length} concept{concepts.length === 1 ? "" : "s"}
          {concepts.length > 0 && (
            <>
              {" "}
              · {angle.concept.creatives.length} size{angle.concept.creatives.length === 1 ? "" : "s"}
            </>
          )}
        </span>
        {angle.status === "live" && totalVerified > 0 && (
          <span className="text-[11px] tabular-nums text-text-secondary flex-shrink-0">
            {totalVerified} verified · CPVL ₹{aggCpvl?.toLocaleString() ?? "—"}
          </span>
        )}
      </button>

      {/* Expansion */}
      {expanded && (
        <div
          className="px-3 pt-1 pb-3 space-y-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {/* Hook + CTA (inline-editable) */}
          <HookCtaBlock
            projectId={projectId}
            persona={persona}
            angle={angle}
            editing={editing}
            setEditing={setEditing}
          />

          {/* Concept rows */}
          {concepts.length === 0 ? (
            <div className="rounded-[8px] py-4 text-center text-[11.5px] text-text-tertiary"
              style={{ background: "var(--bg-page)", border: "1px dashed var(--border)" }}
            >
              No concepts drafted yet.
            </div>
          ) : (
            <div className="space-y-2">
              {concepts.map((c) => (
                <ConceptRow
                  key={c.id}
                  projectId={projectId}
                  persona={persona}
                  angle={angle}
                  concept={c}
                  sizesOpen={sizesFor === c.id}
                  onToggleSizes={() =>
                    setSizesFor((cur) => (cur === c.id ? null : c.id))
                  }
                  onLaunch={() => setLaunchingFor(c.id)}
                />
              ))}
            </div>
          )}

          {/* Launch flow — appears just below concept rows when triggered */}
          {launchingFor && (
            <LaunchCreativeFlow
              project={getPersistedProject(projectId)}
              persona={persona}
              angle={angle}
              initialConceptId={launchingFor}
              onClose={() => setLaunchingFor(null)}
            />
          )}

          {/* Bottom action bar */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDraftConcept?.(angle.id)}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] text-text-secondary hover:text-text-primary"
              style={{
                border: "1px dashed var(--border)",
                background: "transparent",
              }}
            >
              <Plus size={11} /> Draft another concept with Spot
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
            >
              <Pencil size={11} /> Edit hook & CTA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hook/CTA: inline edit ──────────────────────────────────────────────

function HookCtaBlock({
  projectId,
  persona,
  angle,
  editing,
  setEditing,
}: {
  projectId: string;
  persona: Persona;
  angle: Angle;
  editing: boolean;
  setEditing: (next: boolean) => void;
}) {
  const [name, setName] = useState(angle.name);
  const [hook, setHook] = useState(angle.hook);
  const [cta, setCta] = useState(angle.cta);

  // Keep the local edit state in sync if the angle data changes from
  // somewhere else (e.g., a regen) while we're not editing.
  useEffect(() => {
    if (!editing) {
      setName(angle.name);
      setHook(angle.hook);
      setCta(angle.cta);
    }
  }, [angle.name, angle.hook, angle.cta, editing]);

  if (!editing) {
    return (
      <div
        className="rounded-[8px] p-2.5 grid gap-x-3 gap-y-1"
        style={{
          background: "var(--bg-page)",
          gridTemplateColumns: "auto 1fr",
          alignItems: "baseline",
        }}
      >
        <span className="uplabel" style={{ fontSize: 9.5 }}>
          Hook
        </span>
        <span className="text-[12px]">{angle.hook}</span>
        <span className="uplabel" style={{ fontSize: 9.5 }}>
          CTA
        </span>
        <span className="text-[12px]">{angle.cta}</span>
      </div>
    );
  }

  const save = () => {
    mutateRuntimeProject(projectId, (p) => {
      const persona2 = p.personas.find((pp) => pp.id === persona.id);
      const a = persona2?.angles.find((aa) => aa.id === angle.id);
      if (!a) return;
      a.name = name.trim() || a.name;
      a.hook = hook.trim() || a.hook;
      a.cta = cta.trim() || a.cta;
    });
    setEditing(false);
  };

  return (
    <div
      className="rounded-[8px] p-3 space-y-2"
      style={{
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.4px] font-semibold mb-1" style={{ color: "#7C3AED" }}>
        Editing angle
      </div>
      <div>
        <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
          Name
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full outline-none rounded-[6px] border border-border px-2.5 py-1.5 text-[12.5px]"
        />
      </div>
      <div>
        <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
          Hook
        </div>
        <input
          type="text"
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          className="w-full outline-none rounded-[6px] border border-border px-2.5 py-1.5 text-[12.5px]"
        />
      </div>
      <div>
        <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
          CTA
        </div>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          className="w-full outline-none rounded-[6px] border border-border px-2.5 py-1.5 text-[12.5px]"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
        >
          <X size={11} /> Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="apply-btn"
          style={{
            height: 28,
            fontSize: 11.5,
            padding: "0 12px",
            background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
          }}
        >
          <Check size={11} /> Save
        </button>
      </div>
    </div>
  );
}

// ─── Concept row + regenerate ───────────────────────────────────────────

function ConceptRow({
  projectId,
  persona,
  angle,
  concept,
  sizesOpen,
  onToggleSizes,
  onLaunch,
}: {
  projectId: string;
  persona: Persona;
  angle: Angle;
  concept: DerivedConcept;
  sizesOpen: boolean;
  onToggleSizes: () => void;
  onLaunch: () => void;
}) {
  const [regenStage, setRegenStage] = useState<
    | { phase: "idle" }
    | { phase: "regenerating"; lines: string[]; lineIdx: number }
  >({ phase: "idle" });

  const winner = conceptHasWinner(concept);
  const headline = pickHeadlineSize(concept);
  const cpvl = conceptAggregateCpvl(concept);
  const isVideo = concept.kind === "video";

  // Regen streaming — replaces the size list with a 3-line agent log while
  // running. When it ticks done, swap in new sized creatives and bounce
  // back to "idle".
  useEffect(() => {
    if (regenStage.phase !== "regenerating") return;
    const { lineIdx, lines } = regenStage;
    if (lineIdx >= lines.length) {
      // Done — replace sizes with fresh placeholders.
      mutateRuntimeProject(projectId, (p) => {
        const persona2 = p.personas.find((pp) => pp.id === persona.id);
        const a = persona2?.angles.find((aa) => aa.id === angle.id);
        if (!a) return;
        // Remove old sizes for this concept kind.
        a.concept.creatives = a.concept.creatives.filter((c) => {
          if (concept.kind === "video") return c.kind !== "video";
          return c.kind === "video"; // keep videos when regenning static
        });
        // Push new sizes (same shape pattern as the original).
        const fresh = freshSizes(concept.kind, `${angle.id}-${Date.now().toString(36)}`);
        a.concept.creatives.push(...fresh);
      });
      setRegenStage({ phase: "idle" });
      return;
    }
    const t = setTimeout(() => {
      setRegenStage({ phase: "regenerating", lines, lineIdx: lineIdx + 1 });
    }, 700);
    return () => clearTimeout(t);
  }, [regenStage, projectId, persona.id, angle.id, concept.kind]);

  const startRegen = () => {
    setRegenStage({
      phase: "regenerating",
      lines: [
        `Reading "${angle.name}" hook & CTA`,
        isVideo
          ? "Drafting two video sizes (9:16, 1:1)"
          : "Drafting three static sizes (1:1, 4:5, 9:16)",
        "Saving to your library",
      ],
      lineIdx: 0,
    });
  };

  return (
    <div
      className="rounded-[8px]"
      style={{
        background: "#FFF",
        border: `1px solid ${winner ? "#BBF7D0" : "var(--border-subtle)"}`,
      }}
    >
      {/* Concept header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <ConceptThumb hue={concept.hue} kind={concept.kind} layout={concept.layout} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[12px] font-semibold leading-tight truncate">
              {isVideo ? "Video" : "Static"}
            </span>
            <ConceptKindBadge kind={concept.kind} />
            {winner && (
              <span
                className="inline-flex items-center gap-0.5 text-white uppercase"
                style={{
                  background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  letterSpacing: 0.3,
                }}
              >
                <Star size={8} strokeWidth={3} /> Winner
              </span>
            )}
          </div>
          <div className="text-[10.5px] text-text-tertiary tabular-nums">
            {concept.sizes.length} size{concept.sizes.length === 1 ? "" : "s"}
            {headline && headline.spend != null && cpvl != null && (
              <>
                {" "}
                · CPVL ₹{cpvl.toLocaleString()}
              </>
            )}
            {isVideo && headline?.hookRate != null && (
              <>
                {" "}
                · hook {Math.round(headline.hookRate)}%
              </>
            )}
            {isVideo && headline?.firstFrameRetention != null && (
              <>
                {" "}
                · ffr {Math.round(headline.firstFrameRetention)}%
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSizes}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-button border border-border bg-white text-[10.5px]"
            disabled={regenStage.phase !== "idle"}
          >
            {sizesOpen ? "Hide" : "View"} size{concept.sizes.length === 1 ? "" : "s"}
          </button>
          <button
            type="button"
            onClick={startRegen}
            disabled={regenStage.phase !== "idle"}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-button border border-border bg-white text-[10.5px]"
            title="Regenerate this concept"
          >
            <RefreshCw size={10} /> Regen
          </button>
          <button
            type="button"
            onClick={onLaunch}
            disabled={regenStage.phase !== "idle"}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-button text-white text-[10.5px]"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            }}
          >
            <Play size={10} /> Launch
          </button>
        </div>
      </div>

      {/* Regen streaming log */}
      {regenStage.phase === "regenerating" && (
        <div
          className="px-3 pb-3 space-y-1.5"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="text-[10.5px] font-semibold pt-2.5 text-text-secondary">
            Spot is regenerating…
          </div>
          {regenStage.lines.map((line, i) => {
            const state =
              i < regenStage.lineIdx
                ? "done"
                : i === regenStage.lineIdx
                  ? "active"
                  : "queued";
            return (
              <div key={i} className="flex items-start gap-2 text-[11.5px] leading-[1.5]">
                <span className="flex-shrink-0 mt-0.5" style={{ width: 12, height: 12 }}>
                  {state === "done" && <Check size={11} style={{ color: "var(--ok-fg)" }} />}
                  {state === "active" && (
                    <Loader2 size={11} className="animate-spin" style={{ color: "#7C3AED" }} />
                  )}
                  {state === "queued" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--border)",
                        margin: 2,
                      }}
                    />
                  )}
                </span>
                <span className={state === "queued" ? "text-text-tertiary" : ""}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sizes drawer */}
      {sizesOpen && regenStage.phase === "idle" && concept.sizes.length > 0 && (
        <div
          className="px-3 pb-3 space-y-1.5"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="text-[10.5px] text-text-tertiary pt-2 pb-0.5">
            {isVideo
              ? "Video sizes · FFR (frame 1) → Hook (3s) → Hold (complete)"
              : "Static sizes · CTR · CVR · CPVL"}
          </div>
          {concept.sizes.map((c) => (
            <SizeRow key={c.id} c={c} kind={concept.kind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Size row (compact) ─────────────────────────────────────────────────

function SizeRow({ c, kind }: { c: Creative; kind: "static" | "video" }) {
  const draft = c.spend == null;
  const isWinner = c.tag === "winner";

  return (
    <div
      className="flex items-center gap-3 px-2.5 py-1.5 rounded-[6px]"
      style={{
        background: isWinner ? "#F0FDF4" : "var(--bg-page)",
        border: `1px solid ${isWinner ? "#BBF7D0" : "var(--border-subtle)"}`,
      }}
    >
      <div style={{ width: 84, flexShrink: 0 }}>
        <div className="text-[11.5px] font-semibold leading-tight">{c.format}</div>
        <div className="text-[9.5px] text-text-tertiary">{c.surface}</div>
      </div>
      {draft ? (
        <div className="flex-1 text-[10.5px] text-text-tertiary italic">
          Pending data — drafted, not launched
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-2.5">
          {kind === "video" && (
            <>
              <Metric label="FFR" v={c.firstFrameRetention} unit="pct" good={70} fair={50} />
              <Metric label="Hook" v={c.hookRate} unit="pct" good={40} fair={25} />
              <Metric label="Hold" v={c.holdRate} unit="pct" good={25} fair={15} />
              <span className="h-3 w-px bg-border-subtle" />
            </>
          )}
          <Metric label="CTR" v={c.ctr} unit="pct" good={1.5} fair={1.0} />
          <Metric label="CVR" v={c.cvr} unit="pct" good={20} fair={10} />
          <Metric label="CPVL" v={c.cpvl} unit="currency" />
        </div>
      )}
      {isWinner && (
        <span
          className="inline-flex items-center gap-0.5 text-white uppercase"
          style={{
            background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
            fontSize: 9.5,
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            letterSpacing: 0.3,
          }}
        >
          <Star size={8} strokeWidth={3} /> Winner
        </span>
      )}
    </div>
  );
}

function Metric({
  label,
  v,
  unit,
  good,
  fair,
}: {
  label: string;
  v: number | null | undefined;
  unit: "pct" | "currency";
  good?: number;
  fair?: number;
}) {
  const formatted =
    v == null
      ? "—"
      : unit === "currency"
        ? `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`
        : `${v.toFixed(label === "FFR" || label === "Hook" || label === "Hold" ? 0 : 1)}%`;
  const color =
    v == null || good == null
      ? "var(--text-1)"
      : v >= good
        ? "var(--ok-fg)"
        : fair != null && v >= fair
          ? "var(--text-1)"
          : "var(--err-fg)";
  return (
    <div className="text-center min-w-[42px]">
      <div
        className="uplabel"
        style={{ fontSize: 8.5, color: "var(--text-tertiary)" }}
      >
        {label}
      </div>
      <div
        className="tabular-nums"
        style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1.1 }}
      >
        {formatted}
      </div>
    </div>
  );
}

// ─── Concept thumbnail (compact) ────────────────────────────────────────

function ConceptThumb({
  hue,
  kind,
  layout,
}: {
  hue: number;
  kind: "static" | "video";
  layout: Angle["concept"]["layout"];
}) {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 6,
        background: `repeating-linear-gradient(135deg, oklch(0.92 0.05 ${hue}) 0px 4px, oklch(0.82 0.07 ${(hue + 25) % 360}) 4px 8px)`,
        position: "relative",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {layout === "type-led" && (
        <div style={{ position: "absolute", inset: "30% 22%", background: "#0A0A0A", borderRadius: 2 }} />
      )}
      {layout === "split" && (
        <div style={{ position: "absolute", inset: "55% 0 0 0", background: "rgba(0,0,0,0.18)" }} />
      )}
      {layout === "floorplan" && (
        <div style={{ position: "absolute", inset: 4, border: "1px solid rgba(0,0,0,0.5)", borderRadius: 2 }} />
      )}
      {kind === "video" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderLeft: "6px solid #FFF",
              filter: "drop-shadow(0 0 2px rgba(0,0,0,0.55))",
            }}
          />
        </div>
      )}
    </div>
  );
}

function ConceptKindBadge({ kind }: { kind: "static" | "video" }) {
  const cfg =
    kind === "video"
      ? { bg: "#F4ECFF", fg: "#7C3AED", Icon: VideoIcon, label: "Video" }
      : { bg: "var(--bg-secondary)", fg: "var(--text-2)", Icon: ImageIcon, label: "Static" };
  const I = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 uppercase"
      style={{
        background: cfg.bg,
        color: cfg.fg,
        fontSize: 9.5,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        letterSpacing: 0.3,
      }}
    >
      <I size={9} /> {cfg.label}
    </span>
  );
}

// ─── Fresh sizes helper (used by regen) ─────────────────────────────────

function freshSizes(kind: "static" | "video", baseId: string): Creative[] {
  if (kind === "video") {
    return [
      makeSize(`${baseId}-v916`, "9:16", "Meta Reels", "video"),
      makeSize(`${baseId}-v11`, "1:1", "Meta Feed", "video"),
    ];
  }
  return [
    makeSize(`${baseId}-s11`, "1:1", "Meta Feed", "image"),
    makeSize(`${baseId}-s45`, "4:5", "Meta Feed", "image"),
    makeSize(`${baseId}-s916`, "9:16", "Meta Stories", "image"),
  ];
}

function makeSize(
  id: string,
  format: Creative["format"],
  surface: string,
  kind: Creative["kind"],
): Creative {
  return {
    id,
    format,
    surface,
    platform: "Meta",
    kind,
    spend: null,
    impressions: null,
    leads: null,
    verified: null,
    qualified: null,
    ctr: null,
    cvr: null,
    cpl: null,
    cpvl: null,
    cpql: null,
  };
}

// ─── Tiny adapter so LaunchCreativeFlow gets a fresh project snapshot ──

import { getProject } from "@/lib/project-data";

function getPersistedProject(projectId: string) {
  // We read the latest project on demand — mutateRuntimeProject is
  // synchronous so this gives the launch flow's selectors (campaign + ad
  // set lists) an up-to-date snapshot. Named with a `get*` prefix so the
  // React hook rules don't try to enforce hook-order on it.
  const p = getProject(projectId);
  if (!p) {
    throw new Error(`Project ${projectId} not found while opening launch flow`);
  }
  return p;
}

// Avoid an unused-import warning from the `Persona` type in this file.
// (Used for prop typing only.)
export type { Persona };
