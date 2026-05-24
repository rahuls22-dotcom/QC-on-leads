"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Pencil,
  RefreshCw,
  Sparkles,
  Plus,
  X,
} from "lucide-react";
import type { Persona, ProjectDetail, Creative } from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { RichText } from "@/components/spot/rich-text";
import { AngleRow } from "./angle-row";
import { InlineSpotComposer, type StreamItem } from "./inline-spot-composer";

/**
 * The right pane of the Personas tab — a single persona's workspace.
 *
 * Layout (top to bottom):
 *   1. Header — avatar + name + role + status + verified/CPVL stats
 *   2. Want / Pain / Solution — compact triple, inline-editable
 *   3. Angles — list of AngleRows; each expands inline; "+ Add angle"
 *      composer at the bottom; draft-concept composer slides in below
 *      the relevant angle when triggered.
 *
 * No more nested cards within cards — every layer of detail is one tap
 * into the existing surface.
 */
export function PersonaWorkspace({
  project,
  persona,
  onAsk,
}: {
  project: ProjectDetail;
  persona: Persona;
  onAsk: (q: string) => void;
}) {
  // Angle / persona-edit / new-angle / draft-concept state
  const [editingPersona, setEditingPersona] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [streamItems, setStreamItems] = useState<StreamItem[] | null>(null);
  const newAnglePersist = useRef<((i: number) => void) | null>(null);

  // Inline draft-concept composer state (one at a time, keyed by angleId)
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftStream, setDraftStream] = useState<StreamItem[] | null>(null);
  const draftPersist = useRef<((i: number) => void) | null>(null);

  // Persona-edit form state
  const [name, setName] = useState(persona.name);
  const [role, setRole] = useState(persona.role);
  const [want, setWant] = useState(persona.want);
  const [pain, setPain] = useState(persona.painPoint);
  const [usp, setUsp] = useState(persona.usp);

  // If the active persona changes, reset everything so we never leak
  // edits between personas.
  useEffect(() => {
    setEditingPersona(false);
    setComposerOpen(false);
    setStreamItems(null);
    setDraftFor(null);
    setDraftStream(null);
    setName(persona.name);
    setRole(persona.role);
    setWant(persona.want);
    setPain(persona.painPoint);
    setUsp(persona.usp);
  }, [persona.id, persona.name, persona.role, persona.want, persona.painPoint, persona.usp]);

  const savePersona = () => {
    mutateRuntimeProject(project.id, (p) => {
      const target = p.personas.find((x) => x.id === persona.id);
      if (!target) return;
      target.name = name.trim() || target.name;
      target.role = role.trim() || target.role;
      target.want = want.trim() || target.want;
      target.painPoint = pain.trim() || target.painPoint;
      target.usp = usp.trim() || target.usp;
    });
    setEditingPersona(false);
  };

  const approve = () => {
    mutateRuntimeProject(project.id, (p) => {
      const target = p.personas.find((x) => x.id === persona.id);
      if (!target) return;
      target.approved = true;
      target.draft = false;
    });
  };

  const startAngleDraft = (userPrompt: string) => {
    const used = new Set(persona.angles.map((a) => a.name));
    const templates = SAMPLE_ANGLE_TEMPLATES.filter((t) => !used.has(t.name));
    const picks = (
      userPrompt
        ? [
            {
              name:
                userPrompt.length > 40
                  ? userPrompt.slice(0, 40) + "…"
                  : userPrompt,
              hook: userPrompt,
              cta: "Book a 15-min tour",
            },
            templates[0] ?? SAMPLE_ANGLE_TEMPLATES[0],
          ]
        : templates.slice(0, 2)
    ).filter(Boolean);

    const items: StreamItem[] = [];
    picks.forEach((p, i) => {
      items.push({ id: `a${i}`, label: p.name, indent: 0 });
      items.push({
        id: `a${i}-s`,
        label: "Static concept · 3 sizes",
        sub: "1:1 · 4:5 · 9:16",
        indent: 1,
      });
      items.push({
        id: `a${i}-v`,
        label: "Video concept · 2 sizes",
        sub: "9:16 · 1:1",
        indent: 1,
      });
    });

    setStreamItems(items);
    newAnglePersist.current = (i) => {
      // Last line of each angle group (i % 3 === 2) → persist that angle.
      if (i % 3 !== 2) return;
      const angleIdx = Math.floor(i / 3);
      const tpl = picks[angleIdx];
      if (!tpl) return;
      mutateRuntimeProject(project.id, (p) => {
        const persona2 = p.personas.find((pp) => pp.id === persona.id);
        if (!persona2) return;
        const slug = tpl.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 24);
        const angleId = `${persona.id}-${slug}-${Date.now().toString(36)}`;
        const hue = Math.floor(Math.random() * 360);
        persona2.angles.push({
          id: angleId,
          name: tpl.name,
          status: "draft",
          hook: tpl.hook,
          cta: tpl.cta,
          concept: {
            hue,
            layout: "hero",
            creatives: [
              ...staticSeed(angleId),
              ...videoSeed(angleId),
            ],
          },
        });
      });
    };
  };

  const closeAngleComposer = () => {
    setComposerOpen(false);
    setStreamItems(null);
    newAnglePersist.current = null;
  };

  const startDraftConcept = (angleId: string) => {
    setDraftFor(angleId);
    let angleName = "this angle";
    persona.angles.forEach((a) => {
      if (a.id === angleId) angleName = a.name;
    });
    const items: StreamItem[] = [
      { id: "s", label: `Drafting concept for ${angleName}`, indent: 0 },
      {
        id: "s-pick",
        label: "Picking concept variant",
        sub: "Spot will alternate static/video depending on what's missing",
        indent: 1,
      },
      {
        id: "s-sizes",
        label: "Drafting sizes",
        sub: "static: 1:1 · 4:5 · 9:16 · video: 9:16 · 1:1",
        indent: 1,
      },
    ];
    setDraftStream(items);
    draftPersist.current = (i) => {
      if (i !== items.length - 1) return;
      mutateRuntimeProject(project.id, (p) => {
        const persona2 = p.personas.find((pp) => pp.id === persona.id);
        const a = persona2?.angles.find((ang) => ang.id === angleId);
        if (!a) return;
        // Pick whichever concept kind is missing (or has fewer sizes).
        const hasVideo = a.concept.creatives.some((c) => c.kind === "video");
        const hasStatic = a.concept.creatives.some((c) => c.kind !== "video");
        const kind: "static" | "video" =
          hasVideo && !hasStatic
            ? "static"
            : !hasVideo && hasStatic
              ? "video"
              : Math.random() > 0.5
                ? "static"
                : "video";
        const fresh =
          kind === "video"
            ? videoSeed(`${a.id}-${Date.now().toString(36)}`)
            : staticSeed(`${a.id}-${Date.now().toString(36)}`);
        a.concept.creatives.push(...fresh);
        // Flip to live if it was a draft and now has content.
        if (a.status === "draft" && a.concept.creatives.length > 0) {
          a.status = "live";
        }
      });
    };
  };

  const closeDraftComposer = () => {
    setDraftFor(null);
    setDraftStream(null);
    draftPersist.current = null;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card-base p-4">
        <div className="flex items-start gap-3.5">
          <PersonaAvatar id={persona.id} size={44} />
          <div className="flex-1 min-w-0">
            {editingPersona ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full outline-none rounded-[6px] border border-border px-2.5 py-1.5 text-[14.5px] font-semibold"
                />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full outline-none rounded-[6px] border border-border px-2.5 py-1.5 text-[12px]"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[17px] font-semibold leading-tight">
                    {persona.name}
                  </h3>
                  <span className="text-[13px] text-text-secondary">
                    , {persona.age}
                  </span>
                  {persona.draft ? (
                    <span
                      className="pill"
                      style={{
                        background: "#FFF8E1",
                        color: "#8A6300",
                        fontSize: 10.5,
                      }}
                    >
                      Draft
                    </span>
                  ) : (
                    <span className="pill pill-ok" style={{ fontSize: 10.5 }}>
                      <Check size={10} /> Approved
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-text-tertiary mt-0.5">
                  {persona.role}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {!persona.draft && (
              <div className="text-right">
                <div className="text-[13px] tabular-nums font-semibold">
                  {persona.verifiedLeads} verified
                </div>
                <div className="text-[11px] text-text-tertiary tabular-nums">
                  CPVL {persona.cpvl} · {persona.share}% mix
                </div>
              </div>
            )}
            <div className="flex gap-1.5">
              {editingPersona ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditingPersona(false)}
                    className="inline-flex items-center h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePersona}
                    className="apply-btn"
                    style={{
                      height: 28,
                      fontSize: 11.5,
                      padding: "0 12px",
                      background:
                        "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                    }}
                  >
                    <Check size={11} /> Save
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditingPersona(true)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onAsk(`Refresh ${persona.name} from latest leads`)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Want / Pain / Solution */}
      <div className="card-base p-3">
        {editingPersona ? (
          <div className="space-y-2">
            <EditField label="Want" value={want} onChange={setWant} />
            <EditField label="Pain point" value={pain} onChange={setPain} />
            <EditField label="USP that resonates" value={usp} onChange={setUsp} />
          </div>
        ) : (
          <div
            className="grid gap-x-3 divide-x"
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            <WpsCell label="Want" value={persona.want} dot="#9B9B9B" />
            <WpsCell label="Pain point" value={persona.painPoint} dot="#DC2626" />
            <WpsCell label="USP" value={persona.usp} dot="#15803D" />
          </div>
        )}
      </div>

      {/* Spot's note (if any) */}
      {persona.spotNote && (
        <div
          className="rounded-[10px] p-3 flex items-start gap-2"
          style={{
            background: "var(--spot-tint)",
            border: "1px solid var(--spot-stroke)",
          }}
        >
          <SpotMark size={14} />
          <div className="text-[11.5px] leading-[1.5] italic text-text-secondary">
            <RichText text={persona.spotNote} />
          </div>
        </div>
      )}

      {/* Approval CTA if persona is a draft */}
      {persona.draft && (
        <div
          className="rounded-[10px] p-3 flex items-center justify-between"
          style={{ background: "#FFFCEB", border: "1px solid #E0CC95" }}
        >
          <div className="text-[12px] text-text-secondary">
            This persona is still a draft — Spot won&apos;t use it in campaign
            allocation until you approve.
          </div>
          <button
            type="button"
            onClick={approve}
            className="apply-btn"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              height: 28,
              fontSize: 11.5,
              padding: "0 12px",
            }}
          >
            <Check size={11} /> Approve & pilot
          </button>
        </div>
      )}

      {/* Angles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="uplabel" style={{ fontSize: 9.5 }}>
              Angles · {persona.angles.length}
            </span>
            <span
              className="text-[10.5px] text-text-tertiary italic"
              title="Pain + USP stay fixed across angles; only hook + CTA + concept change"
            >
              hook · CTA · concept varies per angle
            </span>
          </div>
          {!composerOpen && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="apply-btn"
              style={{
                height: 26,
                fontSize: 11,
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              }}
            >
              <Plus size={11} /> Add angle with Spot
            </button>
          )}
        </div>

        {composerOpen && (
          <div className="mb-3">
            <InlineSpotComposer
              prompt={`Draft new angles for ${persona.name}`}
              placeholder="Optional — describe the angle in a sentence…"
              primaryLabel="Draft from prompt"
              secondaryLabel="Just draft 2"
              onStart={startAngleDraft}
              onCancel={closeAngleComposer}
              streamItems={streamItems ?? undefined}
              streamHeader={`Drafting angles for ${persona.name}`}
              onItemComplete={(i) => newAnglePersist.current?.(i)}
              onDone={closeAngleComposer}
            />
          </div>
        )}

        <div className="space-y-2">
          {persona.angles.map((angle) => (
            <div key={angle.id}>
              <AngleRow
                projectId={project.id}
                persona={persona}
                angle={angle}
                onDraftConcept={startDraftConcept}
              />
              {draftFor === angle.id && (
                <div className="mt-2">
                  <InlineSpotComposer
                    prompt={`Drafting a concept for ${angle.name}`}
                    placeholder=""
                    primaryLabel="Draft"
                    onStart={() => {}}
                    onCancel={closeDraftComposer}
                    streamItems={draftStream ?? undefined}
                    streamHeader="Spot is drafting"
                    onItemComplete={(i) => draftPersist.current?.(i)}
                    onDone={closeDraftComposer}
                  />
                </div>
              )}
            </div>
          ))}
          {persona.angles.length === 0 && !composerOpen && (
            <div
              className="rounded-[10px] py-5 text-center text-[12px] text-text-tertiary"
              style={{
                border: "1px dashed var(--border)",
                background: "var(--bg-page)",
              }}
            >
              No angles yet — let Spot draft 2 to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function WpsCell({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot: string;
}) {
  return (
    <div className="px-3 py-1.5 border-border-subtle first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: dot }}
        />
        <span className="uplabel" style={{ fontSize: 9.5 }}>
          {label}
        </span>
      </div>
      <div className="text-[12px] leading-[1.45]">{value}</div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full outline-none rounded-[6px] border border-border px-2.5 py-1.5 text-[12.5px]"
      />
    </div>
  );
}

export function PersonaAvatar({ id, size = 38 }: { id: string; size?: number }) {
  const hue = (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 5,
        background: `linear-gradient(135deg, oklch(0.88 0.06 ${hue}) 0%, oklch(0.72 0.09 ${(hue + 50) % 360}) 100%)`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 38 38" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx="19" cy="14" r="4.5" fill="rgba(0,0,0,0.35)" />
        <path d="M9 32c0-6 5-9 10-9s10 3 10 9z" fill="rgba(0,0,0,0.35)" />
      </svg>
    </div>
  );
}

// ─── Seed helpers (used to seed new angles / new concepts) ──────────────

function staticSeed(angleId: string): Creative[] {
  return [
    makeCreative(`${angleId}-s11`, "1:1", "Meta Feed", "image"),
    makeCreative(`${angleId}-s45`, "4:5", "Meta Feed", "image"),
    makeCreative(`${angleId}-s916`, "9:16", "Meta Stories", "image"),
  ];
}
function videoSeed(angleId: string): Creative[] {
  return [
    makeCreative(`${angleId}-v916`, "9:16", "Meta Reels", "video"),
    makeCreative(`${angleId}-v11`, "1:1", "Meta Feed", "video"),
  ];
}
function makeCreative(
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

// ─── Angle templates (re-used for the new-angle composer) ───────────────

const SAMPLE_ANGLE_TEMPLATES = [
  {
    name: "Lifestyle Upgrade",
    hook: "Branded interiors that grow with your family",
    cta: "Book a 15-min tour",
  },
  {
    name: "School-Zone Story",
    hook: "Top-rated schools, 8 minutes door-to-door",
    cta: "See site & schools",
  },
  {
    name: "Future-Proof Investment",
    hook: "Lowest density in micromarket · resale guarantee",
    cta: "Get the pricing sheet",
  },
  {
    name: "Family Future",
    hook: "A home that holds three generations",
    cta: "Talk to a senior advisor",
  },
];

// Avoid unused warning for X — keep as utility export for callers wanting
// to close the launch flow externally.
export { X as _CloseIcon, Sparkles as _SparklesIcon };
