import { CSSProperties } from "react";

/**
 * Spot brand mark — circular radial-gradient orb with a glowing dot.
 * Use as the assistant identity glyph everywhere. Sizes via inline
 * width/height. The cream dot inside scales proportionally via CSS
 * (the .spot-mark::after pseudo-element).
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
      // borderRadius intentionally omitted — let the .spot-mark CSS
      // class own the shape (currently 50% · circular).
      style={{ width: size, height: size, ...style }}
    />
  );
}
