"use client";

import { useState } from "react";
import { X, Check, ArrowRight, Layers, Radio, Sparkles } from "lucide-react";
import type {
  ProjectDetail,
  Persona,
  Angle,
  MediaRow,
  MediaAdSet,
} from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { useSpotStore } from "@/lib/spot/store";
import {
  getConcepts,
  type DerivedConcept,
} from "./persona-hierarchy";

/**
 * Inline "Launch new creative" flow. Sits below the angle row that
 * triggered it. Replaces the old guided-flow modal.
 *
 * Three steps, side-by-side because each step has a tiny payload:
 *
 *   1. Pick a concept (already-known when triggered from a concept tile)
 *   2. Pick a campaign + ad set to attach to
 *   3. Confirm — persists a new MediaAd to the chosen ad set + closes
 */
export function LaunchCreativeFlow({
  project,
  persona,
  angle,
  /** If launched from a specific concept tile, prefill it. */
  initialConceptId,
  onClose,
}: {
  project: ProjectDetail;
  persona: Persona;
  angle: Angle;
  initialConceptId?: string;
  onClose: () => void;
}) {
  const concepts = getConcepts(angle);
  const [conceptId, setConceptId] = useState<string | null>(
    initialConceptId ?? concepts[0]?.id ?? null,
  );
  const [campaignId, setCampaignId] = useState<string | null>(
    project.mediaPlan.rows.find((r) => r.status === "live")?.id ??
      project.mediaPlan.rows[0]?.id ??
      null,
  );
  const [adSetId, setAdSetId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [done, setDone] = useState(false);
  const showToast = useSpotStore((s) => s.showToast);

  const campaign = project.mediaPlan.rows.find((r) => r.id === campaignId) || null;
  const concept = concepts.find((c) => c.id === conceptId) || null;

  // Auto-pick first ad set when campaign changes.
  if (campaign && !campaign.adSets.find((a) => a.id === adSetId)) {
    const next = campaign.adSets[0]?.id ?? null;
    if (next !== adSetId) {
      // Setting state during render is fine in React 19 with a guard.
      setAdSetId(next);
    }
  }

  const ready = !!(conceptId && campaignId && adSetId);

  const onLaunch = () => {
    if (!ready || !concept || !campaign || !adSetId) return;
    setLaunching(true);
    setTimeout(() => {
      mutateRuntimeProject(project.id, (p) => {
        const c = p.mediaPlan.rows.find((r) => r.id === campaign.id);
        const adSet = c?.adSets.find((a) => a.id === adSetId);
        if (!adSet) return;
        const adId = `ad-${Date.now().toString(36)}`;
        // Pick the first size in the concept as the canonical creative
        // for this ad. The "Add to campaign" flow can later evolve to let
        // the user pick a specific size; for now any size suffices for
        // the attachment check.
        const headlineSize = concept.sizes[0];
        adSet.ads.push({
          id: adId,
          name: `${persona.name} · ${angle.name} · ${concept.kind === "video" ? "Video" : "Image"}`,
          personaId: persona.id,
          angleIdx: 0,
          status: "live",
          spend: 0,
          leads: 0,
          cpl: null,
          creativeId: headlineSize?.id,
        });
      });
      setLaunching(false);
      setDone(true);
      showToast(
        `Added to ${campaign.campaign} · ${persona.name} · ${angle.name}`,
      );
      setTimeout(onClose, 900);
    }, 1300);
  };

  if (done) {
    return (
      <div
        className="rounded-[10px] p-3 fadeUp"
        style={{
          background: "var(--ok-bg, #ECFDF5)",
          border: "1px solid var(--ok-fg, #10B981)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "var(--ok-fg, #10B981)",
              color: "#FFF",
            }}
          >
            <Check size={14} strokeWidth={3} />
          </span>
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold leading-tight">Added to campaign</div>
            <div className="text-[11px] text-text-secondary">
              {persona.name} · {angle.name} · {concept?.kind === "video" ? "Video" : "Image"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[10px] fadeUp"
      style={{
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
        padding: 12,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            color: "#FFF",
          }}
        >
          <Sparkles size={11} />
        </span>
        <div className="text-[12px] font-semibold flex-1">
          Add this concept to a campaign
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center h-6 w-6 rounded-button text-text-tertiary hover:text-text-secondary hover:bg-white"
        >
          <X size={11} />
        </button>
      </div>

      <div className="grid gap-2.5" style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
        {/* Step 1 — concept */}
        <Step n={1} title="Concept" icon={<Layers size={11} />}>
          <select
            value={conceptId ?? ""}
            onChange={(e) => setConceptId(e.target.value)}
            className="w-full outline-none rounded-[6px] border border-border px-2 py-1.5 text-[12px] bg-white"
          >
            {concepts.length === 0 && <option value="">No concepts</option>}
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kind === "video" ? "Video" : "Image"} · {c.sizes.length} sizes
              </option>
            ))}
          </select>
        </Step>

        {/* Step 2 — campaign */}
        <Step n={2} title="Campaign" icon={<Radio size={11} />}>
          <select
            value={campaignId ?? ""}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full outline-none rounded-[6px] border border-border px-2 py-1.5 text-[12px] bg-white"
          >
            {project.mediaPlan.rows.length === 0 && (
              <option value="">No campaigns — create one first</option>
            )}
            {project.mediaPlan.rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.campaign} · {r.status}
              </option>
            ))}
          </select>
        </Step>

        {/* Step 3 — ad set */}
        <Step n={3} title="Ad set" icon={<Layers size={11} />}>
          <select
            value={adSetId ?? ""}
            onChange={(e) => setAdSetId(e.target.value)}
            className="w-full outline-none rounded-[6px] border border-border px-2 py-1.5 text-[12px] bg-white"
            disabled={!campaign || campaign.adSets.length === 0}
          >
            {(!campaign || campaign.adSets.length === 0) && (
              <option value="">No ad sets</option>
            )}
            {campaign?.adSets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Step>

        {/* Launch */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onLaunch}
            disabled={!ready || launching}
            className="apply-btn"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              height: 30,
              fontSize: 11.5,
              padding: "0 12px",
              opacity: ready && !launching ? 1 : 0.5,
              cursor: ready && !launching ? "pointer" : "not-allowed",
            }}
          >
            {launching ? "Adding…" : "Add"} <ArrowRight size={11} />
          </button>
        </div>
      </div>

      {!ready && (
        <div className="text-[10.5px] text-text-tertiary mt-2">
          Pick a concept, campaign, and ad set to launch.
        </div>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  icon,
  children,
}: {
  n: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--bg-secondary)",
            color: "var(--text-2)",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          {n}
        </span>
        <span
          className="uplabel inline-flex items-center gap-1"
          style={{ fontSize: 9.5 }}
        >
          {icon} {title}
        </span>
      </div>
      {children}
    </div>
  );
}

// Re-export concept type for callers.
export type { DerivedConcept };

// Re-export MediaRow/MediaAdSet for completeness (importers may want these).
export type { MediaRow, MediaAdSet };
