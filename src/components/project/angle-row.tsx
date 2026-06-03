"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Pencil,
  Star,
  Play,
  Video as VideoIcon,
  Image as ImageIcon,
  Check,
  X,
  Plus,
  Upload as UploadIcon,
} from "lucide-react";
import type { Angle, Creative, Persona } from "@/lib/project-data";
import { mutateRuntimeProject, creativeAssetState } from "@/lib/project-data";
import {
  getConcepts,
  pickHeadlineSize,
  conceptHasWinner,
  conceptAggregateCpvl,
  conceptCampaignAttachments,
  conceptShortLabel,
  type DerivedConcept,
} from "./persona-hierarchy";
import { MetaPreview } from "./meta-preview";
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
        </span>
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

          {/* Bottom action bar — add new concept(s) for this angle */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onDraftConcept?.(angle.id)}
              title="Spot drafts an image concept. For video, use Upload concept."
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] text-text-secondary hover:text-text-primary"
              style={{
                border: "1px dashed var(--border)",
                background: "transparent",
              }}
            >
              <Plus size={11} /> Draft image with Spot
            </button>
            <UploadConceptButton
              projectId={projectId}
              personaId={persona.id}
              angle={angle}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload concept (handles videos Spot can't generate) ───────────────

function UploadConceptButton({
  projectId,
  personaId,
  angle,
}: {
  projectId: string;
  personaId: string;
  angle: Angle;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    if (arr.length === 0) return;

    mutateRuntimeProject(projectId, (p) => {
      const persona2 = p.personas.find((pp) => pp.id === personaId);
      const a = persona2?.angles.find((aa) => aa.id === angle.id);
      if (!a) return;
      arr.forEach((file, i) => {
        const isVideo = file.type.startsWith("video/");
        const blobUrl = URL.createObjectURL(file);
        const baseId = `${angle.id}-up-${Date.now().toString(36)}-${i}`;
        // Build sized shells around this asset. The user uploaded one
        // file but we treat it as the canonical asset for *every* size
        // of that kind — the prototype can extend with per-size uploads
        // later (and the size drawer's inline Upload button already
        // supports replacing individual sizes).
        const sizes = isVideo
          ? videoSeedWithAsset(baseId, blobUrl)
          : staticSeedWithAsset(baseId, blobUrl);
        a.concept.creatives.push(...sizes);
        if (a.status === "draft" && a.concept.creatives.length > 0) {
          a.status = "live";
        }
      });
    });
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Upload an image or video — required for video concepts since Spot only generates static"
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] font-medium"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
          color: "#FFF",
          border: "1px solid transparent",
        }}
      >
        <UploadIcon size={11} /> Upload concept
      </button>
    </>
  );
}

// Seed helpers — variants of the workspace ones that pre-populate the
// asset URL (uploaded path). Kept here so the upload flow is
// self-contained in this file.
function staticSeedWithAsset(baseId: string, assetUrl: string): Creative[] {
  return [
    makeSizedAsset(`${baseId}-s11`, "1:1", "Meta Feed", "image", assetUrl),
    makeSizedAsset(`${baseId}-s45`, "4:5", "Meta Feed", "image", assetUrl),
    makeSizedAsset(`${baseId}-s916`, "9:16", "Meta Stories", "image", assetUrl),
  ];
}
function videoSeedWithAsset(baseId: string, assetUrl: string): Creative[] {
  return [
    makeSizedAsset(`${baseId}-v916`, "9:16", "Meta Reels", "video", assetUrl),
    makeSizedAsset(`${baseId}-v11`, "1:1", "Meta Feed", "video", assetUrl),
  ];
}
function makeSizedAsset(
  id: string,
  format: Creative["format"],
  surface: string,
  kind: Creative["kind"],
  assetUrl: string,
): Creative {
  const placeholderHue =
    (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
  return {
    id,
    format,
    surface,
    platform: "Meta",
    kind,
    assetUrl,
    assetSource: "uploaded",
    placeholderHue,
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
        className="rounded-[8px] p-2.5 relative"
        style={{ background: "var(--bg-page)" }}
      >
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Edit hook & CTA"
          className="absolute inline-flex items-center justify-center h-6 w-6 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-white"
          style={{ top: 4, right: 4 }}
        >
          <Pencil size={11} />
        </button>
        <div
          className="grid gap-x-3 gap-y-1"
          style={{
            gridTemplateColumns: "auto 1fr",
            alignItems: "baseline",
            paddingRight: 24,
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
  const winner = conceptHasWinner(concept);
  const headline = pickHeadlineSize(concept);
  const cpvl = conceptAggregateCpvl(concept);
  const isVideo = concept.kind === "video";
  // Look up campaign attachment so the user can see at a glance whether
  // this concept is actually running anywhere.
  const project = getPersistedProject(projectId);
  const attachments = conceptCampaignAttachments(concept, project);
  const shortLabel = conceptShortLabel(concept);
  const inAnyCampaign = attachments.count > 0;

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
              Concept {shortLabel}
            </span>
            <ConceptKindBadge kind={concept.kind} />
            <AttachmentChip attachments={attachments} />
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
          >
            {sizesOpen ? "Hide" : "View"} size{concept.sizes.length === 1 ? "" : "s"}
          </button>
          <button
            type="button"
            onClick={onLaunch}
            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-button text-white text-[10.5px]"
            style={{
              background: inAnyCampaign
                ? "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)"
                : "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            }}
            title={
              inAnyCampaign
                ? `Already in ${attachments.count} campaign${attachments.count === 1 ? "" : "s"} — add to another?`
                : "Attach this concept to a campaign so it can run"
            }
          >
            <Plus size={10} /> {inAnyCampaign ? "Add to another" : "Add to campaign"}
          </button>
        </div>
      </div>

      {/* Sizes drawer */}
      {sizesOpen && concept.sizes.length > 0 && (
        <SizesDrawer
          projectId={projectId}
          persona={persona}
          angle={angle}
          concept={concept}
        />
      )}
    </div>
  );
}

/**
 * Small pill that tells the user whether the concept is attached to any
 * campaign. Amber = not in a campaign (action needed); green = in N
 * campaigns. Compact enough to sit alongside the concept label.
 */
function AttachmentChip({
  attachments,
}: {
  attachments: { count: number; campaignNames: string[] };
}) {
  const inAny = attachments.count > 0;
  const title = inAny
    ? `In: ${attachments.campaignNames.join(", ")}`
    : "Not attached to any campaign yet — click Add to campaign to launch";
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 uppercase"
      style={{
        background: inAny ? "var(--ok-bg, #ECFDF5)" : "#FFFCEB",
        color: inAny ? "var(--ok-fg, #15803D)" : "#8A6300",
        border: `1px solid ${inAny ? "#BBF7D0" : "#E0CC95"}`,
        fontSize: 9,
        fontWeight: 700,
        padding: "2px 6px",
        borderRadius: 4,
        letterSpacing: 0.3,
      }}
    >
      {inAny ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "currentColor",
            }}
          />
          In {attachments.count} campaign{attachments.count === 1 ? "" : "s"}
        </>
      ) : (
        <>Not in a campaign</>
      )}
    </span>
  );
}

// ─── Sizes drawer: preview grid + Meta preview on click ────────────────

function SizesDrawer({
  projectId,
  persona,
  angle,
  concept,
}: {
  projectId: string;
  persona: Persona;
  angle: Angle;
  concept: DerivedConcept;
}) {
  const isVideo = concept.kind === "video";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  // Which size is open in the full Meta preview. Defaults to the first one.
  const [openSizeId, setOpenSizeId] = useState<string | null>(
    concept.sizes[0]?.id ?? null,
  );

  const triggerUpload = (creativeId: string) => {
    setUploadingFor(creativeId);
    fileRef.current?.click();
  };

  const handleFile = (files: FileList | null) => {
    if (!files || !uploadingFor) return;
    const file = files[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    mutateRuntimeProject(projectId, (p) => {
      const persona2 = p.personas.find((pp) => pp.id === persona.id);
      const a = persona2?.angles.find((aa) => aa.id === angle.id);
      const target = a?.concept.creatives.find((c) => c.id === uploadingFor);
      if (!target) return;
      target.assetUrl = blobUrl;
      target.assetSource = "uploaded";
    });
    setUploadingFor(null);
  };

  const openCreative =
    concept.sizes.find((s) => s.id === openSizeId) ?? concept.sizes[0];

  return (
    <div
      className="px-3 pb-3 space-y-3"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      <input
        ref={fileRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      <div className="text-[10.5px] text-text-tertiary pt-2 pb-0.5">
        {isVideo
          ? "Click a size to see its full Meta preview · FFR (frame 1) → Hook (3s) → Hold (complete)"
          : "Click a size to see its full Meta preview · CTR · CVR · CPVL"}
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)" }}
      >
        {/* Left: list of size tiles with preview thumbs + metrics */}
        <div className="space-y-2 min-w-0">
          {concept.sizes.map((c) => (
            <SizeTile
              key={c.id}
              c={c}
              kind={concept.kind}
              active={c.id === openSizeId}
              onSelect={() => setOpenSizeId(c.id)}
              onUpload={() => triggerUpload(c.id)}
            />
          ))}
        </div>

        {/* Right: full Meta-style preview of the active size */}
        <div className="min-w-0">
          <div
            className="uplabel mb-1.5"
            style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}
          >
            Meta preview · {openCreative?.format ?? "—"} · {openCreative?.surface ?? "—"}
          </div>
          {openCreative && (
            <MetaPreview
              creative={openCreative}
              persona={persona}
              angle={angle}
              onUpload={() => triggerUpload(openCreative.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Size tile (preview thumb + metrics + state) ────────────────────────

function SizeTile({
  c,
  kind,
  active,
  onSelect,
  onUpload,
}: {
  c: Creative;
  kind: "static" | "video";
  active: boolean;
  onSelect: () => void;
  onUpload: () => void;
}) {
  const state = creativeAssetState(c);
  const isWinner = c.tag === "winner";
  const bg =
    isWinner
      ? "#F0FDF4"
      : active
        ? "var(--bg-page)"
        : "#FFF";
  const border = active
    ? "#1A1A1A"
    : isWinner
      ? "#BBF7D0"
      : "var(--border-subtle)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left flex items-stretch gap-3 px-2.5 py-2 rounded-[8px] transition-shadow"
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        boxShadow: active ? "0 4px 10px rgba(0,0,0,0.04)" : "none",
      }}
    >
      {/* Preview thumb */}
      <SizeThumb creative={c} state={state} />

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold leading-tight">
              {c.format}
            </span>
            <span className="text-[10px] text-text-tertiary">{c.surface}</span>
            <StateBadge state={state} />
            {isWinner && (
              <span
                className="inline-flex items-center gap-0.5 text-white uppercase"
                style={{
                  background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1.5px 5px",
                  borderRadius: 4,
                  letterSpacing: 0.3,
                }}
              >
                <Star size={8} strokeWidth={3} /> Winner
              </span>
            )}
          </div>
        </div>

        {/* Metrics — only when live; shell + ready get a state hint */}
        {state === "live" ? (
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {kind === "video" && (
              <>
                <Metric label="FFR" v={c.firstFrameRetention} unit="pct" good={70} fair={50} />
                <Metric label="Hook" v={c.hookRate} unit="pct" good={40} fair={25} />
                <Metric label="Hold" v={c.holdRate} unit="pct" good={25} fair={15} />
              </>
            )}
            <Metric label="CTR" v={c.ctr} unit="pct" good={1.5} fair={1.0} />
            <Metric label="CVR" v={c.cvr} unit="pct" good={20} fair={10} />
            <Metric label="CPVL" v={c.cpvl} unit="currency" />
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <div className="text-[10.5px] text-text-tertiary italic flex-1 truncate">
              {state === "shell"
                ? `No ${kind === "video" ? "video" : "image"} uploaded yet`
                : "Asset ready · not in a campaign yet"}
            </div>
            {state === "shell" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpload();
                }}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-button text-[10.5px] font-medium"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                  color: "#FFF",
                  border: "1px solid transparent",
                }}
              >
                <UploadIcon size={9} /> Upload
              </button>
            )}
          </div>
        )}
      </div>

    </button>
  );
}

// Compact preview thumb that fronts each SizeTile.
function SizeThumb({
  creative,
  state,
}: {
  creative: Creative;
  state: "shell" | "ready" | "live";
}) {
  const hue = creative.placeholderHue ?? 240;
  const isVideo = creative.kind === "video";
  // Each format gets its own aspect ratio so the user can read the size
  // at a glance from the thumb's shape.
  const width = 72;
  const aspect = aspectFor(creative.format);

  if (state === "shell") {
    return (
      <div
        className="flex-shrink-0 flex items-center justify-center text-text-tertiary"
        style={{
          width,
          aspectRatio: aspect,
          background: `repeating-linear-gradient(135deg, oklch(0.94 0.03 ${hue}) 0px 5px, oklch(0.88 0.05 ${(hue + 25) % 360}) 5px 10px)`,
          border: "1px dashed var(--border)",
          borderRadius: 6,
        }}
        title={`Awaiting ${isVideo ? "video" : "image"} upload`}
      >
        <UploadIcon size={12} />
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 relative overflow-hidden"
      style={{
        width,
        aspectRatio: aspect,
        background: creative.assetUrl
          ? `#000 url(${creative.assetUrl}) center / cover no-repeat`
          : `linear-gradient(135deg, oklch(0.78 0.10 ${hue}) 0%, oklch(0.62 0.13 ${(hue + 35) % 360}) 100%)`,
        borderRadius: 6,
        border: "1px solid var(--border-subtle)",
      }}
    >
      {!creative.assetUrl && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "55% 14% 18% 14%",
            background: "rgba(0,0,0,0.55)",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            fontSize: 7.5,
            fontWeight: 600,
            padding: "2px 4px",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {creative.format}
        </div>
      )}
      {isVideo && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid #FFF",
            }}
          >
            <Play size={10} fill="#FFF" />
          </div>
        </div>
      )}
    </div>
  );
}

function aspectFor(format: Creative["format"]): string {
  switch (format) {
    case "1:1":
      return "1 / 1";
    case "4:5":
      return "4 / 5";
    case "9:16":
      return "9 / 16";
    case "16:9":
      return "16 / 9";
  }
}

function StateBadge({ state }: { state: "shell" | "ready" | "live" }) {
  if (state === "live") return null;
  const cfg =
    state === "shell"
      ? {
          label: "Drafted · no asset",
          bg: "#FFFCEB",
          fg: "#8A6300",
          border: "#E0CC95",
        }
      : {
          label: "Ready · not live",
          bg: "#EFF6FF",
          fg: "#1D4ED8",
          border: "#BFDBFE",
        };
  return (
    <span
      className="inline-flex items-center"
      style={{
        padding: "1.5px 6px",
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.fg,
        border: `1px solid ${cfg.border}`,
        letterSpacing: 0.3,
        textTransform: "uppercase",
      }}
    >
      {cfg.label}
    </span>
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
      : { bg: "var(--bg-secondary)", fg: "var(--text-2)", Icon: ImageIcon, label: "Image" };
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
