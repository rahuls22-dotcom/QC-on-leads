import { CSSProperties } from "react";

/**
 * Spot brand mark — radial-gradient rounded square with a glowing dot.
 * Use as the assistant identity glyph everywhere. Sizes via inline width/height.
 */
export function SpotMark({
  size = 16,
  style,
  className,
}: {
  size?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span
      className={`spot-mark ${className || ""}`}
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.max(3, Math.round(size * 0.22)), ...style }}
    />
  );
}
