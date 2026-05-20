"use client";

import { useState } from "react";
import { Check, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import { Persona } from "@/lib/project-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { RichText } from "@/components/spot/rich-text";
import { AngleCard } from "./angle-card";

const MAX_ANGLES_VISIBLE = 3;

function PersonaAvatar({ id }: { id: string }) {
  const hue = (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 8,
        background: `linear-gradient(135deg, oklch(0.88 0.06 ${hue}) 0%, oklch(0.72 0.09 ${(hue + 50) % 360}) 100%)`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* abstract glyph */}
      <svg viewBox="0 0 38 38" width={38} height={38} style={{ position: "absolute", inset: 0 }}>
        <circle cx="19" cy="14" r="4.5" fill="rgba(0,0,0,0.35)" />
        <path d="M9 32c0-6 5-9 10-9s10 3 10 9z" fill="rgba(0,0,0,0.35)" />
      </svg>
    </div>
  );
}

function PersonaField({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok" | "neutral";
}) {
  const dot =
    tone === "warn" ? "#DC2626" : tone === "ok" ? "#15803D" : "#9B9B9B";
  return (
    <div className="px-4 py-3 border-r border-border-subtle last:border-r-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
        <span className="uplabel" style={{ fontSize: 10 }}>
          {label}
        </span>
      </div>
      <div className="text-[12.5px] leading-[1.45]">{value}</div>
    </div>
  );
}

export function PersonaCard({
  persona,
  projectId,
  onAsk,
  onGuidedFlow,
  onGenerateCreatives,
}: {
  persona: Persona;
  projectId: string;
  onAsk: (q: string) => void;
  onGuidedFlow: (kind: "new-angle", persona: Persona) => void;
  onGenerateCreatives?: (angleId?: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleAngles = showAll ? persona.angles : persona.angles.slice(0, MAX_ANGLES_VISIBLE);
  const hiddenCount = persona.angles.length - visibleAngles.length;
  const liveCount = persona.angles.filter((a) => a.status === "live").length;
  const creativesCount = persona.angles.reduce(
    (s, a) => s + a.concept.creatives.length,
    0,
  );

  return (
    <div
      className="card-base"
      style={{
        borderColor: persona.draft ? "#C9A86A" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3.5 px-5 py-4">
        <PersonaAvatar id={persona.id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[16px] font-semibold leading-tight">{persona.name}</h3>
            <span className="text-[12.5px] text-text-secondary">, {persona.age}</span>
            {persona.draft ? (
              <span
                className="pill"
                style={{ background: "#FFF8E1", color: "#8A6300", fontSize: 10.5 }}
              >
                Draft persona
              </span>
            ) : (
              <span className="pill pill-ok" style={{ fontSize: 10.5 }}>
                <Check size={10} /> Approved
              </span>
            )}
          </div>
          <div className="text-[12px] text-text-tertiary mt-0.5">{persona.role}</div>
        </div>
        {!persona.draft && (
          <div className="text-right flex-shrink-0">
            <div className="text-[13px] tabular-nums font-semibold">
              {persona.verifiedLeads} verified
            </div>
            <div className="text-[11px] text-text-tertiary tabular-nums">
              CPVL {persona.cpvl} · {persona.share}% mix
            </div>
          </div>
        )}
      </div>

      {/* Want / Pain / USP triplet */}
      <div className="grid border-t border-border-subtle" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <PersonaField label="Want" value={persona.want} />
        <PersonaField label="Pain point" value={persona.painPoint} tone="warn" />
        <PersonaField label="USP that resonates" value={persona.usp} tone="ok" />
      </div>

      {persona.spotNote && (
        <div
          className="px-5 py-3 flex items-start gap-2"
          style={{
            background: "var(--spot-tint)",
            borderTop: "1px solid var(--spot-stroke)",
            borderBottom: "1px solid var(--spot-stroke)",
          }}
        >
          <SpotMark size={14} />
          <div className="text-[11.5px] leading-[1.5] italic text-text-secondary">
            <RichText text={persona.spotNote} />
          </div>
        </div>
      )}

      {/* Angles & creatives */}
      <div className="px-5 py-4 bg-surface-page border-t border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={12} style={{ color: "#7C3AED" }} />
          <span className="uplabel" style={{ fontSize: 10 }}>
            Angles & creatives · {persona.angles.length} angles · {liveCount} live · {creativesCount} creatives
          </span>
          <span className="text-[10.5px] text-text-tertiary italic ml-1">
            Pain point + USP stay fixed · Hook · CTA · Angle change per test
          </span>
        </div>

        <div className="space-y-2.5">
          {visibleAngles.map((angle) => (
            <AngleCard
              key={angle.id}
              angle={angle}
              persona={persona}
              projectId={projectId}
              onAsk={onAsk}
              onGenerateCreatives={onGenerateCreatives}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          {hiddenCount > 0 ? (
            <button
              onClick={() => setShowAll(true)}
              className="inline-flex items-center gap-1 text-[11.5px] text-text-secondary hover:text-text-primary"
              type="button"
            >
              <ChevronDown size={12} /> Show {hiddenCount} more
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => onGuidedFlow("new-angle", persona)}
            className="apply-btn"
            style={{
              height: 26,
              fontSize: 11,
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            }}
            type="button"
          >
            <Sparkles size={11} /> New angle with Spot
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle">
        <div className="flex gap-1.5">
          <button
            onClick={() => onAsk(`Edit persona: ${persona.name}`)}
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white hover:border-border-hover hover:bg-surface-page text-[11.5px]"
          >
            <SpotMark size={11} /> Edit with Spot
          </button>
          <button
            onClick={() => onAsk(`Refresh ${persona.name} from latest leads`)}
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white hover:border-border-hover hover:bg-surface-page text-[11.5px]"
          >
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        {persona.draft && (
          <button
            onClick={() => onAsk(`Approve persona ${persona.name}`)}
            type="button"
            className="apply-btn"
          >
            <Check size={11} /> Approve &amp; pilot
          </button>
        )}
      </div>
    </div>
  );
}
