import type { Angle, Creative } from "@/lib/project-data";

/**
 * Derived "concept" — a creative idea inside an angle. The schema today
 * stores `angle.concept.creatives` as a flat list of sized creatives; we
 * group them here so the UI can present the Persona → Angle → Concept →
 * Sizes hierarchy the product asks for without a destructive schema
 * migration.
 *
 * Statics (image + carousel) and videos are *always* separate concepts,
 * matching the user's stated mental model.
 */
export type DerivedConcept = {
  /** Stable id derived from the angle + concept kind. */
  id: string;
  /** Display name — defaults to angle name with a kind suffix. */
  name: string;
  /** "static" covers image + carousel; "video" is its own track. */
  kind: "static" | "video";
  hue: number;
  layout: Angle["concept"]["layout"];
  /** Every sized creative that belongs to this concept. */
  sizes: Creative[];
};

/**
 * Group an angle's creatives into concepts. Always returns at least one
 * concept per kind that has at least one creative. Empty angles get an
 * empty array (the caller decides what to render).
 */
export function getConcepts(angle: Angle): DerivedConcept[] {
  const buckets: Record<"static" | "video", Creative[]> = {
    static: [],
    video: [],
  };
  angle.concept.creatives.forEach((c) => {
    if (c.kind === "video") buckets.video.push(c);
    else buckets.static.push(c);
  });

  const out: DerivedConcept[] = [];
  if (buckets.static.length > 0) {
    out.push({
      id: `${angle.id}-static`,
      name: angle.name,
      kind: "static",
      hue: angle.concept.hue,
      layout: angle.concept.layout,
      sizes: buckets.static,
    });
  }
  if (buckets.video.length > 0) {
    out.push({
      id: `${angle.id}-video`,
      name: angle.name,
      kind: "video",
      hue: angle.concept.hue,
      layout: angle.concept.layout,
      sizes: buckets.video,
    });
  }
  return out;
}

/**
 * Pick the "best" size in a concept to surface at the concept-tile level.
 * Preference order: explicit winner tag → lowest CPVL → highest CTR (static)
 * or highest hook rate (video) → first size with any metrics → first size.
 */
export function pickHeadlineSize(concept: DerivedConcept): Creative | null {
  if (concept.sizes.length === 0) return null;
  const winner = concept.sizes.find((s) => s.tag === "winner");
  if (winner) return winner;

  const sized = concept.sizes.filter((s) => s.cpvl != null);
  if (sized.length > 0) {
    return sized.reduce((best, s) => (s.cpvl! < best.cpvl! ? s : best));
  }

  if (concept.kind === "video") {
    const withHook = concept.sizes.filter((s) => s.hookRate != null);
    if (withHook.length > 0) {
      return withHook.reduce((best, s) =>
        (s.hookRate ?? 0) > (best.hookRate ?? 0) ? s : best,
      );
    }
  } else {
    const withCtr = concept.sizes.filter((s) => s.ctr != null);
    if (withCtr.length > 0) {
      return withCtr.reduce((best, s) =>
        (s.ctr ?? 0) > (best.ctr ?? 0) ? s : best,
      );
    }
  }

  return concept.sizes[0] ?? null;
}

export function conceptHasWinner(concept: DerivedConcept): boolean {
  return concept.sizes.some((s) => s.tag === "winner");
}

export function conceptTotalSpend(concept: DerivedConcept): number {
  return concept.sizes.reduce((s, c) => s + (c.spend || 0), 0);
}

export function conceptTotalVerified(concept: DerivedConcept): number {
  return concept.sizes.reduce((s, c) => s + (c.verified || 0), 0);
}

/** Aggregate CPVL across sizes — null when nothing's verified yet. */
export function conceptAggregateCpvl(concept: DerivedConcept): number | null {
  const spend = conceptTotalSpend(concept);
  const verified = conceptTotalVerified(concept);
  return verified > 0 ? Math.round(spend / verified) : null;
}

// ─── Campaign attachment lookup ────────────────────────────────────────

import type { Persona, ProjectDetail } from "@/lib/project-data";

/**
 * How many distinct campaigns reference any of this concept's sizes
 * (via MediaAd.creativeId). Returns 0 when the concept isn't in any
 * campaign yet — used to surface the "Not in a campaign" badge.
 */
export function conceptCampaignAttachments(
  concept: DerivedConcept,
  project: ProjectDetail,
): { count: number; campaignNames: string[] } {
  const ids = new Set(concept.sizes.map((s) => s.id));
  const names = new Set<string>();
  for (const row of project.mediaPlan.rows) {
    let attached = false;
    for (const adSet of row.adSets) {
      for (const ad of adSet.ads) {
        if (ad.creativeId && ids.has(ad.creativeId)) {
          attached = true;
          break;
        }
      }
      if (attached) break;
    }
    if (attached) names.add(row.campaign);
  }
  return { count: names.size, campaignNames: Array.from(names) };
}

/**
 * Produces a short stable label for a concept within its angle. Static
 * concepts get "A", videos get "B" (alphabetic by kind, since each
 * angle has at most one of each in the current model).
 */
export function conceptShortLabel(concept: DerivedConcept): string {
  return concept.kind === "static" ? "A" : "B";
}

/**
 * The "winning concept" for a persona, picked **purely on TOFU signal**:
 *   · Static concepts are scored on CTR (avg across sizes)
 *   · Video concepts are scored on Hook Rate (avg across sizes)
 * Ties are broken by CVR. Returns `null` when no concept has any TOFU
 * data yet.
 *
 * Per the product brief, winners are TOFU-defined — downstream metrics
 * (CPVL, CPQL) are *outcomes*, not the cause; the audience-attention
 * signal at the top of the funnel is what we let identify a winner.
 */
export type WinningConcept = {
  angle: Angle;
  concept: DerivedConcept;
  /** Primary TOFU metric used to pick the winner. */
  tofu: {
    label: "CTR" | "Hook Rate";
    /** Percent value, e.g. 1.45 for 1.45%. */
    value: number;
  };
  /** Conversion rate — secondary signal, surfaced alongside the TOFU number. */
  cvr: number | null;
};

export function getWinningConcept(persona: Persona): WinningConcept | null {
  let best: WinningConcept | null = null;
  for (const angle of persona.angles) {
    for (const concept of getConcepts(angle)) {
      const tofu = computeTofuScore(concept);
      if (tofu == null) continue;
      const cvr = avgMetric(concept, "cvr");
      const candidate: WinningConcept = { angle, concept, tofu, cvr };
      if (!best) {
        best = candidate;
        continue;
      }
      if (candidate.tofu.value > best.tofu.value) {
        best = candidate;
      } else if (
        Math.abs(candidate.tofu.value - best.tofu.value) < 0.01 &&
        (cvr ?? 0) > (best.cvr ?? 0)
      ) {
        // Tie-break by CVR when TOFU is within rounding distance.
        best = candidate;
      }
    }
  }
  return best;
}

function computeTofuScore(
  concept: DerivedConcept,
): WinningConcept["tofu"] | null {
  if (concept.kind === "video") {
    const hook = avgMetric(concept, "hookRate");
    if (hook == null) return null;
    return { label: "Hook Rate", value: hook };
  }
  const ctr = avgMetric(concept, "ctr");
  if (ctr == null) return null;
  return { label: "CTR", value: ctr };
}

function avgMetric(
  concept: DerivedConcept,
  field: "ctr" | "cvr" | "hookRate",
): number | null {
  const values = concept.sizes
    .map((s) => s[field])
    .filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
