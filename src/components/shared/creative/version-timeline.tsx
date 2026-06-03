"use client";

import type { ConceptVersion } from "./types";
import { AdMockup } from "./ad-mockup";

interface VersionTimelineProps {
  versions: ConceptVersion[];
  activeVersionId: string | null;
  onSelect: (versionId: string) => void;
  /** Visual scale — "sm" for the sleek Phase B strip, "lg" kept for legacy callers. */
  size?: "lg" | "sm";
}

export function VersionTimeline({
  versions,
  activeVersionId,
  onSelect,
  size = "sm",
}: VersionTimelineProps) {
  if (versions.length === 0) return null;

  const tileSize = size === "lg" ? "h-20 w-20" : "h-8 w-8";

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
      {/* Newest first — render in reverse so the most recent version is on the left. */}
      {versions
        .map((v, chronoIdx) => ({ v, chronoIdx }))
        .reverse()
        .map(({ v, chronoIdx }) => {
          const isActive = v.id === activeVersionId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              title={`${v.label} · v${chronoIdx + 1}`}
              className={`relative ${tileSize} shrink-0 rounded-[6px] overflow-hidden border transition-all duration-150 ${
                isActive
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-border-hover opacity-80 hover:opacity-100"
              }`}
            >
              <AdMockup variant={v.variant} headline={v.headline} mockup={v.mockup} />
            </button>
          );
        })}
    </div>
  );
}
