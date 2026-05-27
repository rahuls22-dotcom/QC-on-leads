"use client";

import { Settings, X, Play, Upload as UploadIcon } from "lucide-react";
import type { Persona, Angle, Creative } from "@/lib/project-data";
import { creativeAssetState } from "@/lib/project-data";

/**
 * Meta ad preview — mirrors how Facebook / Instagram actually render a
 * lead-gen ad in feed. Used in the Sizes drawer to show users what a
 * creative *will look like* (or already looks like) on Meta.
 *
 * Components (top → bottom):
 *   · Page chrome — brand logo, page name, "Sponsored", settings, X
 *   · Primary text — the body copy (hook above the media)
 *   · Media — image or video at the creative's aspect ratio
 *   · Form callout — bottom card with FORM label, headline, Learn more
 *
 * Shells render an empty media slot with an Upload CTA. Ready/live
 * creatives render their asset (or a deterministic hue placeholder if
 * no real asset URL is attached — typical for our prototype seeds).
 */
export function MetaPreview({
  creative,
  persona,
  angle,
  /** Brand name shown in the page header. Defaults to "Godrej Properties". */
  brandName,
  /** Compact mode (smaller, used inside grid tiles). */
  compact,
  onUpload,
}: {
  creative: Creative;
  persona: Persona;
  angle: Angle;
  brandName?: string;
  compact?: boolean;
  onUpload?: () => void;
}) {
  const state = creativeAssetState(creative);

  const primaryText = creative.primaryText ?? angle.hook;
  const formHeadline = creative.formHeadline ?? defaultHeadline(persona, angle);
  const ctaLabel = creative.ctaLabel ?? "Learn more";

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{
        background: "#FFF",
        border: "1px solid var(--border)",
        width: compact ? "100%" : 360,
        maxWidth: "100%",
      }}
    >
      {/* Page chrome */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <BrandAvatar
          name={brandName ?? "Godrej Properties"}
          hue={creative.placeholderHue ?? 240}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold leading-tight truncate">
            {brandName ?? "Godrej Properties"}
          </div>
          <div className="text-[9.5px] text-text-tertiary flex items-center gap-1">
            <span>Sponsored</span>
            <span>·</span>
            <Settings size={8} />
          </div>
        </div>
        <X size={11} className="text-text-tertiary" />
      </div>

      {/* Primary text (body copy / hook) */}
      <div className="px-3 py-2 text-[11.5px] leading-[1.4]">
        {primaryText}
      </div>

      {/* Media */}
      <MediaSlot
        creative={creative}
        state={state}
        onUpload={onUpload}
        compact={compact}
      />

      {/* Form callout — only relevant for lead-gen ads, but matches the
          screenshot's structure exactly. */}
      <div
        className="flex items-center gap-3 px-3 py-2"
        style={{
          background: "var(--bg-page)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex-1 min-w-0">
          <div
            className="uplabel mb-0.5"
            style={{ fontSize: 9, color: "var(--text-tertiary)", letterSpacing: 0.4 }}
          >
            Form
          </div>
          <div className="text-[11.5px] font-semibold leading-tight">
            {formHeadline}
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center h-7 px-3 rounded-[6px] text-[11px] font-semibold"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-1)",
            border: "1px solid var(--border)",
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Media slot ────────────────────────────────────────────────────────

function MediaSlot({
  creative,
  state,
  onUpload,
  compact,
}: {
  creative: Creative;
  state: "shell" | "ready" | "live";
  onUpload?: () => void;
  compact?: boolean;
}) {
  const aspect = aspectFor(creative.format);
  const hue = creative.placeholderHue ?? 240;
  const isVideo = creative.kind === "video";

  // Shell — show empty placeholder with "Awaiting upload" affordance
  if (state === "shell") {
    return (
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          aspectRatio: aspect,
          background: `repeating-linear-gradient(135deg, oklch(0.94 0.03 ${hue}) 0px 6px, oklch(0.88 0.05 ${(hue + 25) % 360}) 6px 12px)`,
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="rounded-[8px] px-3 py-2 text-center"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            border: "1px dashed var(--border)",
          }}
        >
          <div className="text-[11px] font-semibold mb-0.5">
            Awaiting {isVideo ? "video upload" : "image upload"}
          </div>
          <div className="text-[10px] text-text-tertiary mb-1.5">
            {creative.format} · {creative.surface}
          </div>
          {onUpload && (
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex items-center gap-1 h-6 px-2 rounded-button text-[10.5px] font-medium"
              style={{
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                color: "#FFF",
                border: "1px solid transparent",
              }}
            >
              <UploadIcon size={9} /> Upload {isVideo ? "video" : "image"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Ready / live — render the asset (or the hue-gradient stand-in)
  return (
    <div
      className="relative"
      style={{
        aspectRatio: aspect,
        background: creative.assetUrl
          ? `#000 url(${creative.assetUrl}) center / cover no-repeat`
          : `linear-gradient(135deg, oklch(0.78 0.10 ${hue}) 0%, oklch(0.62 0.13 ${(hue + 35) % 360}) 100%)`,
        borderTop: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Decorative chrome — light interior outline so the placeholder
          reads as a designed creative rather than a flat fill. */}
      {!creative.assetUrl && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: compact ? 10 : 18,
            border: "1px solid rgba(255,255,255,0.45)",
            borderRadius: 4,
          }}
        />
      )}
      {!creative.assetUrl && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: compact ? "55% 14% 12% 14%" : "65% 18% 14% 18%",
            background: "rgba(0,0,0,0.55)",
            borderRadius: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            fontSize: compact ? 9 : 11,
            fontWeight: 600,
            padding: "4px 8px",
            textAlign: "center",
          }}
        >
          {(creative.primaryText ?? "Your story here").slice(0, 42)}
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
          }}
        >
          <div
            style={{
              width: compact ? 34 : 48,
              height: compact ? 34 : 48,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(2px)",
              border: "2px solid #FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
            }}
          >
            <Play size={compact ? 14 : 18} fill="#FFF" />
          </div>
        </div>
      )}
      {/* "Ready" badge — only show when there's no spend yet (asset
          uploaded, waiting on a campaign attach). */}
      {state === "ready" && (
        <span
          className="absolute"
          style={{
            top: 8,
            left: 8,
            padding: "2px 6px",
            background: "rgba(255,255,255,0.92)",
            color: "#9C6D00",
            fontSize: 9.5,
            fontWeight: 700,
            borderRadius: 4,
            letterSpacing: 0.3,
            textTransform: "uppercase",
            border: "1px solid #E0CC95",
          }}
        >
          Ready · not in a campaign
        </span>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function BrandAvatar({ name, hue }: { name: string; hue: number }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: `linear-gradient(135deg, oklch(0.82 0.08 ${hue}) 0%, oklch(0.68 0.12 ${(hue + 40) % 360}) 100%)`,
        color: "#FFF",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {initial}
    </span>
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

function defaultHeadline(persona: Persona, angle: Angle): string {
  // Pull from the persona's USP + angle CTA. Keeps the preview feeling
  // brand-specific without making the caller wire every field manually.
  return `${angle.name} · ${persona.usp.split(".")[0]}`.slice(0, 80);
}
