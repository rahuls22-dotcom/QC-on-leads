"use client";

import { useMemo, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import type {
  ProjectDetail,
  Persona,
  Angle,
  Creative,
} from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { useSpotStore } from "@/lib/spot/store";
import {
  CreativeGeneratorModal,
  type GeneratedCreative,
} from "@/components/shared/creative-generator-modal";
import type {
  MockupCopyProjectContext,
  WorkspacePreAttach,
} from "@/components/shared/creative/types";
import {
  PROJECT_IMAGES,
  BRAND_LOGOS,
} from "@/components/shared/creative/image-gallery";

/**
 * Project-aware launcher around CreativeGeneratorModal. When the user
 * triggers "Draft static with Spot" on a persona angle, this component:
 *
 *   1. Mounts the rich generator modal (Setup → Concept → Resize) with
 *      EVERYTHING the project knows already pre-attached:
 *        · Strategy (angle + persona) attached
 *        · Brand guidelines attached
 *        · Brand logo from the built-in gallery
 *        · Project image from the built-in gallery
 *        · Mockup-copy defaults derived from project.rera / builder /
 *          typology / price band / micromarket
 *   2. Intercepts the modal's onComplete → instead of auto-persisting
 *      every generated size, it surfaces an inline "Pick which sizes to
 *      save" sheet on the angle page so the user explicitly confirms.
 *   3. On confirm, pushes the picked sizes as a new static Concept onto
 *      the angle (each sized Creative in "ready" state — generated, not
 *      yet in a campaign).
 */
export function CreativeGeneratorLauncher({
  open,
  onClose,
  project,
  persona,
  angle,
}: {
  open: boolean;
  onClose: () => void;
  project: ProjectDetail;
  persona: Persona;
  angle: Angle;
}) {
  const showToast = useSpotStore((s) => s.showToast);

  // Once the modal completes we capture the generated creatives and
  // switch this component to "review" mode — the modal is dismissed but
  // the inline sheet stays so the user can pick which sizes to save.
  const [review, setReview] = useState<GeneratedCreative[] | null>(null);

  const projectContext: MockupCopyProjectContext = useMemo(
    () => deriveProjectContext(project),
    [project],
  );
  const preAttach: WorkspacePreAttach = useMemo(
    () => ({
      brandLogo: BRAND_LOGOS[0]
        ? { sampleId: BRAND_LOGOS[0].id, name: BRAND_LOGOS[0].name }
        : null,
      projectImage: PROJECT_IMAGES[0]
        ? { sampleId: PROJECT_IMAGES[0].id, name: PROJECT_IMAGES[0].name }
        : null,
      brandGuidelinesAttached: true,
      creativeStrategyAttached: true,
    }),
    [],
  );

  const handleModalComplete = (creatives: GeneratedCreative[]) => {
    if (creatives.length === 0) {
      onClose();
      return;
    }
    // Dismiss the modal but keep the launcher open so the review sheet
    // can render on the angle below.
    setReview(creatives);
  };

  const handleCloseAll = () => {
    setReview(null);
    onClose();
  };

  if (!open && !review) return null;

  return (
    <>
      <CreativeGeneratorModal
        open={open && !review}
        onClose={onClose}
        onComplete={handleModalComplete}
        angleName={angle.name}
        personaName={persona.name}
        personaRole={persona.role}
        painPoint={persona.painPoint}
        usp={persona.usp}
        hook={angle.hook}
        cta={angle.cta}
        projectContext={projectContext}
        preAttach={preAttach}
      />
      {review && (
        <SaveSheet
          creatives={review}
          project={project}
          persona={persona}
          angle={angle}
          onCancel={handleCloseAll}
          onSave={(picked) => {
            persistCreatives(project, persona, angle, picked, () =>
              showToast(
                `Saved ${picked.length} size${picked.length === 1 ? "" : "s"} to ${angle.name}`,
              ),
            );
            handleCloseAll();
          }}
        />
      )}
    </>
  );
}

// ─── Project → context ──────────────────────────────────────────────────

function deriveProjectContext(p: ProjectDetail): MockupCopyProjectContext {
  return {
    projectName: p.name,
    builderName: p.builder,
    priceBand: p.priceBand,
    rera: p.rera,
    typology: p.typology,
    // Use the first USP as the eyebrow line if it reads like a launch tag,
    // otherwise leave the eyebrow at its sensible default.
    launchPhase:
      p.brief?.usp?.find((u) => /phase|launch|now|open/i.test(u)) || undefined,
  };
}

// ─── Save sheet ─────────────────────────────────────────────────────────

function SaveSheet({
  creatives,
  persona,
  angle,
  onCancel,
  onSave,
}: {
  creatives: GeneratedCreative[];
  project: ProjectDetail;
  persona: Persona;
  angle: Angle;
  onCancel: () => void;
  onSave: (picked: GeneratedCreative[]) => void;
}) {
  // All checked by default — the user explicitly went through Resize, so
  // the assumption is they want all the sizes they touched.
  const [pickedIds, setPickedIds] = useState<Set<string>>(
    () => new Set(creatives.map((c) => c.id)),
  );
  const toggle = (id: string) =>
    setPickedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const picked = creatives.filter((c) => pickedIds.has(c.id));

  return (
    <div
      // Modal-style overlay; matches the design language of the rest of
      // the project page so it doesn't feel like a different surface.
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(10,10,10,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5vh 16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="card-base fadeUp"
        style={{
          width: "min(520px, 100%)",
          maxHeight: "84vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-start gap-2.5 px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
            }}
          >
            <Sparkles size={13} />
          </span>
          <div className="flex-1">
            <div className="text-[13.5px] font-semibold leading-tight">
              Pick which sizes to save
            </div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">
              {persona.name} · {angle.name} · {creatives.length} generated
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-surface-secondary"
            title="Discard"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {creatives.map((c) => {
            const checked = pickedIds.has(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggle(c.id)}
                className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-[8px]"
                style={{
                  background: checked ? "var(--bg-page)" : "#FFF",
                  border: `1.5px solid ${checked ? "#1A1A1A" : "var(--border-subtle)"}`,
                }}
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: checked ? "#1A1A1A" : "transparent",
                    border: checked ? "1px solid #1A1A1A" : "1px solid var(--border)",
                    color: "#FFF",
                    marginTop: 2,
                  }}
                >
                  {checked && <Check size={10} strokeWidth={3} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[12.5px] font-semibold leading-tight">
                      {c.label}
                    </span>
                    <span className="text-[10.5px] text-text-tertiary">
                      {sizeLabel(c.size)}
                    </span>
                  </div>
                  {c.headline && (
                    <div className="text-[11.5px] text-text-secondary mt-0.5 line-clamp-2">
                      {c.headline}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-5 py-3 flex-shrink-0"
          style={{
            background: "var(--bg-page)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div className="text-[11px] text-text-tertiary">
            {picked.length === 0
              ? "Pick at least one size to save."
              : `Saving ${picked.length} size${picked.length === 1 ? "" : "s"} as a new concept`}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
            >
              Discard all
            </button>
            <button
              type="button"
              onClick={() => onSave(picked)}
              disabled={picked.length === 0}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[12.5px] font-semibold"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                color: "#FFF",
                border: "1px solid transparent",
                opacity: picked.length === 0 ? 0.55 : 1,
                cursor: picked.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Check size={12} /> Save to angle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Persist as Creative[] ──────────────────────────────────────────────

function persistCreatives(
  project: ProjectDetail,
  persona: Persona,
  angle: Angle,
  picked: GeneratedCreative[],
  afterSave: () => void,
): void {
  if (picked.length === 0) return;
  mutateRuntimeProject(project.id, (p) => {
    const persona2 = p.personas.find((pp) => pp.id === persona.id);
    const a = persona2?.angles.find((aa) => aa.id === angle.id);
    if (!a) return;
    const baseId = `${a.id}-spot-${Date.now().toString(36)}`;
    picked.forEach((g, i) => {
      const { format, surface } = sizeToFormatSurface(g.size);
      const id = `${baseId}-${i}`;
      const placeholderHue =
        (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
      const c: Creative = {
        id,
        format,
        surface,
        platform: "Meta",
        kind: "image",
        // ready state: asset generated by Spot, no spend yet.
        assetSource: "generated",
        placeholderHue,
        primaryText: g.postText,
        formHeadline: g.headline,
        ctaLabel: angle.cta,
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
      a.concept.creatives.push(c);
    });
    if (a.status === "draft" && a.concept.creatives.length > 0) {
      a.status = "live";
    }
  });
  afterSave();
}

function sizeToFormatSurface(size: string): {
  format: Creative["format"];
  surface: string;
} {
  switch (size) {
    case "sq-feed":
      return { format: "1:1", surface: "Meta Feed" };
    case "story":
      return { format: "9:16", surface: "Meta Stories" };
    case "landscape":
      return { format: "16:9", surface: "Meta In-stream" };
    case "portrait":
      return { format: "4:5", surface: "Meta Feed" };
    default:
      // Custom size — best-effort fallback to 1:1 / Meta Feed.
      return { format: "1:1", surface: "Meta Feed" };
  }
}

function sizeLabel(size: string): string {
  switch (size) {
    case "sq-feed":
      return "1:1 · Square Feed";
    case "story":
      return "9:16 · Story / Reel";
    case "landscape":
      return "16:9 · Landscape";
    case "portrait":
      return "4:5 · Portrait Feed";
    default:
      return size;
  }
}
