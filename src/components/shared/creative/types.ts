/**
 * Shared types and mock data helpers for the creative generation workspace.
 * Used by Phase A (setup), Phase B (concept editor), and Phase C (resize editor).
 */

/* ------------------------------------------------------------------ */
/*  Output type — emitted to the parent (step3-creatives.tsx)         */
/* ------------------------------------------------------------------ */

export interface GeneratedCreative {
  id: string;
  size: string;
  label: string;
  postText: string;
  headline: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Phase / workspace types                                            */
/* ------------------------------------------------------------------ */

export type CreativePhase = "setup" | "concept" | "resize";

/** A single message in the concept chat. */
export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  /** When AI replies with a new version, link the version it produced. */
  version_id?: string;
  /** While the AI is "thinking", we add a placeholder message with this set. */
  pending?: boolean;
  created_at: number;
}

/**
 * Per-variant copy displayed on the AdMockup. All fields populated regardless
 * of variant so inline editing has predictable targets.
 */
export interface MockupCopy {
  // Variant 1 — bold lifestyle
  eyebrow: string;          // e.g., "Phase 3 · Now Open"
  // Variant 2 — price anchor
  priceMain: string;        // e.g., "₹1.8"
  priceUnit: string;        // e.g., "Cr"
  priceLabel: string;       // e.g., "Starting Price"
  priceSubtext: string;     // e.g., "RERA approved · Phase 3"
  brandCorner: string;      // e.g., "GODREJ"
  // Variant 3 — social proof
  quote: string;            // e.g., "Changed our lives."
  attribution: string;      // e.g., "— Rajesh & Priya"
  subAttribution: string;   // e.g., "3BHK owners · 1200+ families"
  // Variant 4 — premium dark
  brandHeader: string;      // e.g., "Godrej Air"
  titleLineA: string;       // e.g., "Luxury"
  titleLineB: string;       // e.g., "Redefined"
}

/** Default mockup copy used when seeding a new variant. */
export function defaultMockupCopy(): MockupCopy {
  return {
    eyebrow: "Phase 3 · Now Open",
    priceMain: "₹1.8",
    priceUnit: "Cr",
    priceLabel: "Starting Price",
    priceSubtext: "RERA approved · Phase 3",
    brandCorner: "GODREJ",
    quote: "Changed our lives.",
    attribution: "— Rajesh & Priya",
    subAttribution: "3BHK owners · 1200+ families",
    brandHeader: "Godrej Air",
    titleLineA: "Luxury",
    titleLineB: "Redefined",
  };
}

/**
 * Project-aware mockup-copy seed. Used when the generator is launched
 * from a Persona on the project page so the mockups land with the right
 * RERA / builder / price / project-name baked in instead of the legacy
 * Godrej Air defaults.
 *
 * Every input is optional — anything blank falls back to the default.
 */
export interface MockupCopyProjectContext {
  /** Project's display name — drops onto variant-4 brandHeader. */
  projectName?: string;
  /** Builder name shown in the bottom-corner badge. */
  builderName?: string;
  /** "₹1.6 – 2.4 Cr" — leading slice becomes priceMain+priceUnit. */
  priceBand?: string;
  /** RERA-shaped status line; falls back to "RERA approved" when truthy. */
  rera?: string;
  /** Phase / launch tag for the eyebrow line — e.g. "Phase 3 · Now Open". */
  launchPhase?: string;
  /** Typology label used in the social-proof subAttribution. */
  typology?: string;
}

export function mockupCopyFromProject(
  ctx: MockupCopyProjectContext,
): MockupCopy {
  const fallback = defaultMockupCopy();
  const [priceMain, priceUnit] = splitPriceBand(ctx.priceBand);
  const projectShort = ctx.projectName?.split(" · ")[0];
  const builderUpper = (ctx.builderName || "").toUpperCase().split(" ")[0];
  const reraLine = ctx.rera
    ? `${ctx.rera.slice(0, 18)} · ${ctx.launchPhase || "RERA approved"}`
    : ctx.launchPhase
      ? `RERA approved · ${ctx.launchPhase}`
      : fallback.priceSubtext;
  return {
    eyebrow: ctx.launchPhase || fallback.eyebrow,
    priceMain: priceMain || fallback.priceMain,
    priceUnit: priceUnit || fallback.priceUnit,
    priceLabel: "Starting Price",
    priceSubtext: reraLine,
    brandCorner: builderUpper || fallback.brandCorner,
    quote: fallback.quote,
    attribution: fallback.attribution,
    subAttribution: ctx.typology
      ? `${ctx.typology} owners · 1200+ families`
      : fallback.subAttribution,
    brandHeader: projectShort || fallback.brandHeader,
    titleLineA: "Luxury",
    titleLineB: "Redefined",
  };
}

/** Pull the leading "₹X.Y" / "Cr" from a price-band string. */
function splitPriceBand(band?: string): [string, string] {
  if (!band) return ["", ""];
  // Handles "₹1.6 – 2.4 Cr", "1.6-2.4Cr", "₹1.6Cr", "₹95L"
  const lower = band.replace(/\s+/g, "");
  const m = lower.match(/(₹?)([\d.]+)[–\-—]?[\d.]*([A-Za-z]*)/);
  if (!m) return ["", ""];
  const numeric = m[2];
  const unit = (m[3] || "").replace(/^k$/i, "K");
  const main = (m[1] || "₹") + numeric;
  return [main, unit];
}

/** A single creative version. Lives in either concept_versions (Phase B) or per-size versions (Phase C). */
export interface ConceptVersion {
  id: string;
  /** Parent version (for branching). null = root. */
  parent_id: string | null;
  /** Variant style id, drives the AdMockup variant prop (1-4). */
  variant: 1 | 2 | 3 | 4;
  /** Top-level headline — surfaced in labels/tooltips and rendered on variant 1. */
  headline: string;
  /** Post text shown in the resize phase under each size preview. */
  primary_text: string;
  /** Meta description carried through to GeneratedCreative output. */
  description: string;
  /** Per-variant text rendered on the mockup. */
  mockup: MockupCopy;
  /** Short label shown on the timeline thumbnail (e.g., "v1", "Bold"). */
  label: string;
  created_at: number;
}

/** Editable text fields on the AdMockup. "headline" is the top-level field; all others live in `mockup`. */
export type MockupField = "headline" | keyof MockupCopy;

/** Editable creative strategy values — seeded from the campaign angle on open. */
export interface CreativeStrategy {
  angleName: string;
  personaName: string;
  personaRole?: string;
  painPoint: string;
  usp: string;
  hook: string;
  cta: string;
}

/** An attached image (mock upload — picked from a small built-in gallery). */
export interface AttachedImage {
  /** Stable id of the gallery sample. */
  sampleId: string;
  /** Display name shown in the pill. */
  name: string;
}

/** The whole modal's state, threaded through the orchestrator. */
export interface CreativeWorkspace {
  // Phase A inputs (chatbox)
  prompt: string;
  style_reference: AttachedImage | null;
  project_image: AttachedImage | null;
  brand_logo: AttachedImage | null;
  /** Boolean toggle — when on, the AI is instructed to follow brand guidelines. */
  brand_guidelines_attached: boolean;
  /** Boolean toggle — when on, the campaign strategy is attached to the prompt. */
  creative_strategy_attached: boolean;
  /** Editable strategy — seeded from the campaign angle, mutable by the user. */
  strategy: CreativeStrategy;

  // Phase B (concept editor — chat + version history)
  concept_messages: ChatMessage[];
  concept_versions: ConceptVersion[];
  active_concept_version_id: string | null;

  // Phase C (resize editor — single current version per size, no chat)
  selected_sizes: string[];
  size_versions: Record<string, ConceptVersion>;
  /** One-deep undo history per size. Captured before regen / manual edit. */
  size_previous: Record<string, ConceptVersion>;
  /** User-defined custom sizes, keyed by their generated id. */
  custom_sizes: Record<string, SizeOption>;
}

/* ------------------------------------------------------------------ */
/*  Size catalog                                                       */
/* ------------------------------------------------------------------ */

export interface SizeOption {
  id: string;
  dimensions: string;
  label: string;
  aspectW: number;
  aspectH: number;
}

export const SIZE_OPTIONS: SizeOption[] = [
  { id: "sq-feed", dimensions: "1080×1080", label: "Square — Feed", aspectW: 1, aspectH: 1 },
  { id: "story", dimensions: "1080×1920", label: "Story / Reel", aspectW: 9, aspectH: 16 },
  { id: "landscape", dimensions: "1200×628", label: "Landscape — Feed", aspectW: 1200, aspectH: 628 },
  { id: "portrait", dimensions: "1080×1350", label: "Portrait — Feed", aspectW: 4, aspectH: 5 },
];

/** Visual orientation groups used to lay out the resize grid. */
export type SizeOrientation = "square" | "tall" | "wide";

export function orientationFor(sizeId: string): SizeOrientation {
  if (sizeId === "story" || sizeId === "portrait") return "tall";
  if (sizeId === "landscape") return "wide";
  return "square";
}

export function getSize(sizeId: string): SizeOption | undefined {
  return SIZE_OPTIONS.find((s) => s.id === sizeId);
}

/** Convert a size id to a CSS aspect-ratio value for preview boxes. */
export function aspectRatioFor(sizeId: string): string {
  const s = getSize(sizeId);
  if (!s) return "1 / 1";
  if (s.id === "story") return "9 / 16";
  if (s.id === "landscape") return "1200 / 628";
  if (s.id === "portrait") return "4 / 5";
  return "1 / 1";
}

/* ------------------------------------------------------------------ */
/*  Mock concept pool — used by the mock AI to "generate" new versions */
/* ------------------------------------------------------------------ */

interface ConceptCopy {
  variant: 1 | 2 | 3 | 4;
  primary_text: string;
  headline: string;
  description: string;
  label: string;
}

const CONCEPT_POOL: ConceptCopy[] = [
  {
    variant: 1,
    primary_text:
      "🏡 Your dream home is closer than you think.\n\nPremium 3BHK apartments in Whitefield, starting at ₹1.8Cr. Smart homes with world-class amenities, just 2 mins from the IT corridor.\n\n📍 Book your free site visit this weekend.",
    headline: "Premium 3BHK in Whitefield — Starting ₹1.8Cr",
    description: "RERA registered. Smart home ready. 3-acre zen gardens.",
    label: "Bold lifestyle",
  },
  {
    variant: 2,
    primary_text:
      "₹1.8 Cr.\nThat's all it takes to own a Godrej home in Whitefield.\n\n3BHK | Smart Home Ready | RERA Registered\n\nLimited units in Phase 3. Don't wait.\n\n👉 Get the brochure now.",
    headline: "₹1.8Cr — Own a Godrej Home in Whitefield",
    description: "Limited Phase 3 units. 3BHK smart homes with zen gardens.",
    label: "Price anchor",
  },
  {
    variant: 3,
    primary_text:
      "\"We moved into Godrej Air 6 months ago and it changed our lives.\"\n— Rajesh & Priya, 3BHK owners\n\n1200+ families already call Godrej Air home. Phase 3 is now open.\n\n🏠 See what they're talking about →",
    headline: "1200+ Families Chose Godrej Air — Phase 3 Now Open",
    description: "Join India's most loved residential community in Whitefield.",
    label: "Social proof",
  },
  {
    variant: 4,
    primary_text:
      "Luxury isn't just a word. It's an address.\n\nGodrej Air, Phase 3 — Where Japanese-inspired architecture meets Bangalore's most coveted location.\n\nStarting ₹1.8Cr | 3 & 4 BHK\n\n✨ Experience the walkthrough →",
    headline: "Godrej Air Phase 3 — Luxury Redefined",
    description: "Japanese-inspired architecture. Starting ₹1.8Cr.",
    label: "Premium dark",
  },
  {
    variant: 1,
    primary_text:
      "This could be your morning view. ☀️\n\nWake up to 3 acres of landscaped gardens at Godrej Air, Whitefield. Phase 3 now open for bookings.\n\nStarting ₹1.8Cr.\n\n👉 Book a site visit",
    headline: "Wake Up to 3 Acres of Gardens — Godrej Air",
    description: "Phase 3 now open. Starting ₹1.8Cr in Whitefield.",
    label: "Garden vibe",
  },
  {
    variant: 2,
    primary_text:
      "Rent: ₹45K/month. Zero ownership.\nEMI: ₹1.1L/month. 100% yours.\n\nThe math is simple. Make the switch to Godrej Air.\n\n3BHK in Whitefield | RERA Approved\n\n🏡 Get started →",
    headline: "Rent vs Own — The Math is Simple",
    description: "3BHK in Whitefield. RERA Approved. EMI from ₹1.1L/month.",
    label: "Rent-vs-own",
  },
  {
    variant: 3,
    primary_text:
      "Stop scrolling. Start living.\n\nGodrej Air Phase 3 brings you 3BHK homes designed for modern families. Zen gardens, infinity pool, and a location that puts everything within reach.\n\n📞 Talk to our team today.",
    headline: "Stop Scrolling. Start Living — Godrej Air",
    description: "3BHK homes for modern families. Zen gardens & infinity pool.",
    label: "Urgent CTA",
  },
  {
    variant: 4,
    primary_text:
      "Home is where your story begins.\n\nAt Godrej Air, every detail is designed to make life beautiful — from the zen-inspired gardens to the smartly crafted living spaces.\n\nPhase 3 | Starting ₹1.8Cr\n\n💫 Explore now",
    headline: "Home Is Where Your Story Begins",
    description: "Zen-inspired gardens. Smartly crafted living spaces.",
    label: "Soft luxury",
  },
];

/* ------------------------------------------------------------------ */
/*  Mock helpers                                                       */
/* ------------------------------------------------------------------ */

let _idCounter = 0;
export function mkId(prefix = "id"): string {
  _idCounter += 1;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

/** Return a fresh ConceptVersion picked from the pool. */
export function makeMockVersion(opts: {
  parent_id?: string | null;
  preferVariant?: 1 | 2 | 3 | 4;
  /** Used to vary the label; e.g., "v3", "Story v2". */
  labelPrefix?: string;
  /** When generating from a refinement message, we tweak the headline. */
  refinementText?: string;
  /** Project-aware mockup-copy seed. When present, overrides the legacy defaults. */
  projectContext?: MockupCopyProjectContext;
}): ConceptVersion {
  const pool = CONCEPT_POOL;
  const idx = opts.preferVariant
    ? pool.findIndex((p) => p.variant === opts.preferVariant)
    : Math.floor(Math.random() * pool.length);
  const base = pool[idx === -1 ? 0 : idx];

  // If the user asked for a refinement, prepend a hint to the headline so the
  // mocked version visibly responds to the prompt.
  let headline = base.headline;
  if (opts.refinementText) {
    const hint = summariseRefinement(opts.refinementText);
    if (hint) headline = `${headline} · ${hint}`;
  }

  return {
    id: mkId("ver"),
    parent_id: opts.parent_id ?? null,
    variant: base.variant,
    primary_text: base.primary_text,
    headline,
    description: base.description,
    mockup: mockupCopyForBase(base, headline, opts.refinementText, opts.projectContext),
    label: opts.labelPrefix ?? base.label,
    created_at: Date.now(),
  };
}

/**
 * Seed variant-specific mockup copy. The default values match what the AdMockup
 * historically rendered for each variant; refinement hints get appended to the
 * variant's most prominent visible text element so the mock visibly reacts.
 *
 * When `projectContext` is present, project-derived values (real RERA, price
 * band, builder name, project name, typology) win over the Godrej-Air defaults.
 */
function mockupCopyForBase(
  base: ConceptCopy,
  effectiveHeadline: string,
  refinementText: string | undefined,
  projectContext: MockupCopyProjectContext | undefined,
): MockupCopy {
  const hint = refinementText ? summariseRefinement(refinementText) : "";
  const copy = projectContext
    ? mockupCopyFromProject(projectContext)
    : defaultMockupCopy();
  // Variant-specific tweaks that don't depend on context.
  switch (base.variant) {
    case 1:
      // Variant 1 renders the headline directly — no mockup-specific main text.
      break;
    case 2:
      // priceMain / priceUnit / priceSubtext already wired in copy seed.
      break;
    case 3:
      if (hint) copy.quote = `${copy.quote} · ${hint}`;
      break;
    case 4:
      if (hint) copy.titleLineB = `${copy.titleLineB} · ${hint}`;
      break;
  }
  // Silence unused-var warning when no refinement is applied for v1/v2.
  void effectiveHeadline;
  return copy;
}

/**
 * Pick a fresh variant from the pool that hasn't been used in `existingVariants`.
 * Used by "Generate new option" so each new option feels distinct visually.
 */
export function pickFreshVariant(
  existingVariants: (1 | 2 | 3 | 4)[]
): 1 | 2 | 3 | 4 {
  const used = new Set(existingVariants);
  const candidates = [1, 2, 3, 4].filter((n) => !used.has(n as 1 | 2 | 3 | 4));
  if (candidates.length === 0) {
    return ((Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4);
  }
  return candidates[Math.floor(Math.random() * candidates.length)] as 1 | 2 | 3 | 4;
}

/**
 * Build a new ConceptVersion from a manual edit. Keeps the same visual variant
 * as the source and labels the result "Edited" so it shows up in the timeline.
 */
export function makeEditedVersion(
  source: ConceptVersion,
  edits: { headline: string; primary_text: string; description: string }
): ConceptVersion {
  return {
    id: mkId("ver"),
    parent_id: source.id,
    variant: source.variant,
    primary_text: edits.primary_text,
    headline: edits.headline,
    description: edits.description,
    mockup: { ...source.mockup },
    label: "Edited",
    created_at: Date.now(),
  };
}

/**
 * Build a new ConceptVersion from a single inline-text edit on the mockup.
 * Mutates one mockup field (or the top-level headline) and labels it "Edited".
 */
export function makeInlineEditedVersion(
  source: ConceptVersion,
  field: MockupField,
  value: string
): ConceptVersion {
  const trimmed = value.trim();
  const next: ConceptVersion = {
    ...source,
    id: mkId("ver"),
    parent_id: source.id,
    mockup: { ...source.mockup },
    label: "Edited",
    created_at: Date.now(),
  };
  if (field === "headline") {
    next.headline = trimmed || source.headline;
  } else {
    next.mockup[field] = trimmed || source.mockup[field];
  }
  return next;
}

/** Compose a short AI summary line for the chat reply. */
export function makeMockReply(refinementText: string): string {
  const hint = summariseRefinement(refinementText);
  if (hint) return `Done — I tried "${hint}". Take a look on the right.`;
  return "Done — here's a fresh take. Take a look on the right.";
}

function summariseRefinement(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const truncated = cleaned.length > 36 ? `${cleaned.slice(0, 36).trim()}…` : cleaned;
  return truncated;
}

/* ------------------------------------------------------------------ */
/*  Workspace defaults                                                 */
/* ------------------------------------------------------------------ */

export const DEFAULT_SIZES: string[] = ["sq-feed", "story", "landscape"];

/**
 * Pre-attached defaults when the generator is launched from a project
 * context. The persona launcher passes these so the user lands in the
 * Setup phase with the brand logo, project image, brand guidelines, and
 * strategy already attached — no manual setup needed.
 */
export interface WorkspacePreAttach {
  brandLogo?: AttachedImage | null;
  projectImage?: AttachedImage | null;
  brandGuidelinesAttached?: boolean;
  creativeStrategyAttached?: boolean;
}

export function emptyWorkspace(
  strategy?: CreativeStrategy,
  preAttach?: WorkspacePreAttach,
): CreativeWorkspace {
  return {
    prompt: "",
    style_reference: null,
    project_image: preAttach?.projectImage ?? null,
    brand_logo: preAttach?.brandLogo ?? null,
    brand_guidelines_attached: preAttach?.brandGuidelinesAttached ?? false,
    creative_strategy_attached: preAttach?.creativeStrategyAttached ?? false,
    strategy: strategy ?? {
      angleName: "",
      personaName: "",
      painPoint: "",
      usp: "",
      hook: "",
      cta: "",
    },
    concept_messages: [],
    concept_versions: [],
    active_concept_version_id: null,
    selected_sizes: [...DEFAULT_SIZES],
    size_versions: {},
    size_previous: {},
    custom_sizes: {},
  };
}

