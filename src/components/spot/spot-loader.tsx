"use client";

// Spot loader system. Five variants:
//
//   · <SpotLoader mode="orbit" />     — active waiting (modal / card / 2-8s)
//   · <SpotLoader mode="breathe" />   — ambient background (header indicator)
//   · <SpotLoader mode="tilt" />      — inline button / chip (0.5-3s)
//   · <SpotLoader mode="dots" />      — chat-bubble typing dots
//   · <SpotFullscreen />              — full-screen with cycling status
//
// All variants share the radial-gradient core defined in globals.css
// (`.spot-loader-core`). Wrapper CSS animations live alongside.
//
// See docs/loaders.md for the usage matrix.

import { useEffect, useState } from "react";

export type SpotLoaderMode = "orbit" | "breathe" | "tilt" | "dots";
export type SpotLoaderShape = "square" | "round";

export type SpotLoaderProps = {
  mode?: SpotLoaderMode;
  /** Loader size in px. Default = 48. Dots mode ignores size. */
  size?: number;
  /** Default "square" — match the SpotMark glyph. */
  shape?: SpotLoaderShape;
  /** Optional title under the loader. Use for waits > 3s. */
  label?: string;
  /** Optional second line under the label — describes what Spot is doing. */
  sublabel?: string;
  /** Extra className on the outer wrapper. */
  className?: string;
};

export function SpotLoader({
  mode = "orbit",
  size = 48,
  // Default to "round" everywhere — the SpotMark glyph is circular,
  // and the user-facing brand is circular orb. Pass shape="square"
  // only in rare contexts where a rounded-square reads better.
  shape = "round",
  label,
  sublabel,
  className = "",
}: SpotLoaderProps) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-3 ${className}`}
      style={{ "--size": `${size}px` } as React.CSSProperties}
    >
      {mode === "orbit" && <SpotOrbit shape={shape} />}
      {mode === "breathe" && <SpotBreathe shape={shape} />}
      {mode === "tilt" && <SpotTilt shape={shape} />}
      {mode === "dots" && <SpotDots shape={shape} />}
      {(label || sublabel) && (
        <div className="text-center">
          {label && (
            <div className="text-[13.5px] font-semibold text-text-primary leading-tight">
              {label}
            </div>
          )}
          {sublabel && (
            <div className="text-[12px] text-text-tertiary mt-1 leading-snug">
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Individual variants ──────────────────────────────────────── */

// Bulletproof stroke styles — passed inline via `style` so they beat
// any framework-level CSS rule (Tailwind preflight, custom resets,
// browser-extension overrides). Some setups were rendering the gold
// rings as the framework's default blue stroke when set via attribute.
const OUTER_RING: React.CSSProperties = {
  stroke: "#C9A86A",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeDasharray: "28 90",
  fill: "none",
  opacity: 0.85,
};
const INNER_RING: React.CSSProperties = {
  stroke: "#E8E0C8",
  strokeWidth: 1.2,
  strokeLinecap: "round",
  strokeDasharray: "10 60",
  fill: "none",
  opacity: 0.7,
};

function SpotOrbit({ shape }: { shape: SpotLoaderShape }) {
  // Square rect or round circle for the two dashed frames.
  if (shape === "round") {
    return (
      <div className="spot-orbit">
        <svg viewBox="0 0 100 100" className="sl-ring sl-ring-outer" aria-hidden>
          <circle cx="50" cy="50" r="48" style={OUTER_RING} />
        </svg>
        <svg viewBox="0 0 100 100" className="sl-ring sl-ring-inner" aria-hidden>
          <circle cx="50" cy="50" r="42" style={INNER_RING} />
        </svg>
        <div className="spot-loader-core core round" />
      </div>
    );
  }
  return (
    <div className="spot-orbit">
      <svg viewBox="0 0 100 100" className="sl-ring sl-ring-outer" aria-hidden>
        <rect x="2" y="2" width="96" height="96" rx="14" style={OUTER_RING} />
      </svg>
      <svg viewBox="0 0 100 100" className="sl-ring sl-ring-inner" aria-hidden>
        <rect x="9" y="9" width="82" height="82" rx="11" style={INNER_RING} />
      </svg>
      <div className="spot-loader-core core" />
    </div>
  );
}

function SpotBreathe({ shape }: { shape: SpotLoaderShape }) {
  return (
    <div className={`spot-breathe ${shape === "round" ? "round" : ""}`}>
      <div className="aura" />
      <div className="sl-ring-pulse" />
      <div className={`spot-loader-core core ${shape === "round" ? "round" : ""}`} />
    </div>
  );
}

function SpotTilt({ shape }: { shape: SpotLoaderShape }) {
  return (
    <div className="spot-tilt">
      <div className={`spot-loader-core core ${shape === "round" ? "round" : ""}`} />
    </div>
  );
}

function SpotDots({ shape }: { shape: SpotLoaderShape }) {
  return (
    <span className={`spot-dots ${shape === "round" ? "round" : ""}`} aria-label="Spot is typing">
      <span />
      <span />
      <span />
    </span>
  );
}

/* ─── Full-screen ──────────────────────────────────────────────── */

const DEFAULT_MESSAGES = [
  "Reading the brief…",
  "Drafting personas…",
  "Pulling competitor data…",
  "Composing the media plan…",
  "Generating creatives…",
  "Running pre-flight checks…",
  "Thinking…",
];

export type SpotFullscreenProps = {
  /** Heading above the cycling status. Default: "Spot is thinking…" */
  title?: string;
  /** Status lines that cycle. Default = generic Spot messages. */
  messages?: string[];
  /** Loader size — 64-80px recommended. */
  size?: number;
  /** Cycle interval in ms. Default 1800. */
  intervalMs?: number;
  /** Shape — default "square". */
  shape?: SpotLoaderShape;
  /** Extra className on the container. */
  className?: string;
};

/**
 * Full-screen loader. Use for app boot, first paint, and multi-step
 * agent work (>10s). The cycling status text is what makes it feel
 * less like "stuck" and more like "actively making progress".
 */
export function SpotFullscreen({
  title = "Spot is thinking…",
  messages = DEFAULT_MESSAGES,
  size = 64,
  intervalMs = 1800,
  // Round by default to match the SpotMark glyph + brand identity.
  shape = "round",
  className = "",
}: SpotFullscreenProps) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);

  return (
    <div
      className={`spot-fullscreen ${className}`}
      style={{ "--size": `${size}px` } as React.CSSProperties}
    >
      <SpotOrbit shape={shape} />
      <div className="status">
        <div className="title">{title}</div>
        <div className="msg" key={idx}>
          {messages[idx]}
        </div>
      </div>
    </div>
  );
}
