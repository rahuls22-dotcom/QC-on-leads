// Data + generation engine for the Creative Studio — the surface where the
// user works directly with the Creative Agent ("Iris"). All EdTech-flavoured
// (Guyju's). The "generation" is deterministic-with-rotation so reveals are
// stable across re-renders and successive rounds yield fresh concepts.

import { PRODUCTS } from "@/lib/products-data";

/* ─── The Creative Agent ─────────────────────────────────────────── */

export const CREATIVE_AGENT = {
  name: "Iris",
  role: "Creative Agent",
  tagline:
    "Briefs herself from your project memory and winning angles, drafts on-brand concepts, then iterates with you.",
  capabilities: ["Static", "Reel", "Carousel", "Search copy"] as const,
  trainedOn: "Brand memory · winning angles · do-not-mention list",
  conceptsPerRun: 4,
  avgSeconds: 18,
};

/* ─── Brief options ──────────────────────────────────────────────── */

export type CreativeFormatKind = "Static" | "Reel" | "Carousel";
export const FORMATS: CreativeFormatKind[] = ["Static", "Reel", "Carousel"];

export type AngleTheme = {
  id: string;
  label: string;
  /** Short supporting line woven into the concept body. */
  detail: string;
  hooks: string[];
};

export const ANGLE_THEMES: AngleTheme[] = [
  {
    id: "mentor-led",
    label: "Mentor-led",
    detail: "Live cohort · IIT-alum mentors · capped at 60",
    hooks: [
      "Mentors who know your weak chapters by name",
      "Class capped at 60. Attention, not anonymity.",
      "1:1 mentor review, every fortnight",
      "Taught by people who've cracked it themselves",
      "Small batches. Big attention.",
      "Mentored — not just enrolled",
    ],
  },
  {
    id: "parent-dashboard",
    label: "Parent dashboard",
    detail: "Weekly mock ranks + reports in the parent app",
    hooks: [
      "See the weekly mock rank — from your phone",
      "The dashboard that ends “how was class?”",
      "Weekly progress reports, straight to parents",
      "Know exactly where your child stands",
      "Attendance, mocks, doubts — one clean view",
      "Finally, proof of real improvement",
    ],
  },
  {
    id: "doubt-clearing",
    label: "Doubt-clearing",
    detail: "Live doubts answered in-class · every session",
    hooks: [
      "Doubts cleared live, in 15 minutes",
      "The 11pm doubt that can't wait till morning",
      "Ask. Get answered. Same class.",
      "No doubt left for tomorrow",
      "Live doubt-clearing, every single class",
      "Stuck at midnight? We're still online.",
    ],
  },
  {
    id: "mock-ranks",
    label: "Mock ranks",
    detail: "Weekly all-India mocks · 24-month replay",
    hooks: [
      "Rank against your whole batch, weekly",
      "Weekly all-India mocks, ranked",
      "See where you stand — every week",
      "Mock like it's the real exam",
      "Real ranks. Real pressure. Real prep.",
      "Your rank, updated every week",
    ],
  },
  {
    id: "switch-offline",
    label: "Switch from offline",
    detail: "Mid-year switch friendly · we cover the gap",
    hooks: [
      "Switching coaching mid-year? We cover the gap.",
      "Left your offline batch? Start where you stopped.",
      "Capped at 60, not 200",
      "No 200-seat auditorium. Just your cohort.",
      "Bring your old syllabus. We'll cover the gap.",
      "Switch without losing months",
    ],
  },
  {
    id: "confidence",
    label: "Confidence",
    detail: "Two-year program · mentor-led · 24-mo recordings",
    hooks: [
      "Watch your child solve a hard problem this week",
      "The confidence to attempt the tough question",
      "From “I can't” to “let me try”",
      "Built for the long two-year climb",
      "Confidence, one solved problem at a time",
      "24-month recordings. Revise anytime.",
    ],
  },
];

const CTAS = [
  "Book a free demo class",
  "Try a free class",
  "Take a free mock",
  "Talk to a mentor",
  "Get the parent dashboard",
  "See a sample class",
];

const RATIOS: Record<CreativeFormatKind, Concept["ratio"]> = {
  Static: "1:1",
  Reel: "9:16",
  Carousel: "4:5",
};

/* ─── Persona → image mapping ────────────────────────────────────── */

type ImageKind = "parent" | "student" | "professional";

const IMAGES: Record<ImageKind, string[]> = {
  parent: [
    "/assets/creatives/parent-01.png",
    "/assets/creatives/parent-02.png",
    "/assets/creatives/parent-03.png",
    "/assets/creatives/parent-04.png",
  ],
  student: [
    "/assets/creatives/student-01.png",
    "/assets/creatives/student-02.png",
    "/assets/creatives/student-03.png",
    "/assets/creatives/student-04.png",
  ],
  professional: [
    "/assets/creatives/professional-01.png",
    "/assets/creatives/professional-02.png",
  ],
};

export function imageKindForPersona(name: string): ImageKind {
  const n = name.toLowerCase();
  if (n.includes("parent")) return "parent";
  if (n.includes("professional") || n.includes("working")) return "professional";
  return "student";
}

const HUES: Record<ImageKind, number> = { parent: 18, student: 215, professional: 268 };

/* ─── Products + personas for the brief chips ────────────────────── */

export type StudioProduct = { id: string; name: string; personas: string[] };

export const STUDIO_PRODUCTS: StudioProduct[] = PRODUCTS.map((p) => ({
  id: p.id,
  name: p.name,
  personas: p.personas.map((x) => x.name),
}));

export function personasForProduct(productId: string): string[] {
  return STUDIO_PRODUCTS.find((p) => p.id === productId)?.personas ?? [];
}

/* ─── Concepts ───────────────────────────────────────────────────── */

export type Brief = {
  productId: string;
  productName: string;
  persona: string;
  angleId: string;
  format: CreativeFormatKind;
  /** Free-text the user typed, if any. */
  note?: string;
  /** Refinement tone applied by a quick chip (e.g. "bolder", "shorter"). */
  tone?: "bolder" | "shorter" | "default";
};

export type Concept = {
  id: string;
  hook: string;
  body: string;
  cta: string;
  format: CreativeFormatKind;
  ratio: "1:1" | "4:5" | "9:16";
  persona: string;
  angleLabel: string;
  productName: string;
  src: string;
  hue: number;
  saved?: boolean;
};

/** Deterministic concept set for a brief + round. `round` rotates the hook /
 *  image / cta selection so successive generations stay fresh. */
export function generateConcepts(brief: Brief, round: number): Concept[] {
  const theme = ANGLE_THEMES.find((t) => t.id === brief.angleId) ?? ANGLE_THEMES[0];
  const kind = imageKindForPersona(brief.persona);
  const imgs = IMAGES[kind];
  const count = CREATIVE_AGENT.conceptsPerRun;

  let hooks = theme.hooks;
  if (brief.tone === "shorter") {
    hooks = [...theme.hooks].sort((a, b) => a.length - b.length);
  } else if (brief.tone === "bolder") {
    // Lead with the punchier, shorter-but-loud lines.
    hooks = [...theme.hooks].sort((a, b) => (a.includes("?") || a.includes(".") ? -1 : 0));
  }

  return Array.from({ length: count }, (_, i) => {
    const pick = (round * count + i) % hooks.length;
    const hook = hooks[pick];
    const cta = CTAS[(round + i) % CTAS.length];
    const src = imgs[(round + i) % imgs.length];
    return {
      id: `cpt-${brief.angleId}-${round}-${i}`,
      hook,
      body: `${brief.productName} · ${theme.detail}`,
      cta,
      format: brief.format,
      ratio: RATIOS[brief.format],
      persona: brief.persona,
      angleLabel: theme.label,
      productName: brief.productName,
      src,
      hue: HUES[kind],
    };
  });
}

/** One-line human summary of a brief — used as the user's chat bubble. */
export function summariseBrief(brief: Brief): string {
  const theme = ANGLE_THEMES.find((t) => t.id === brief.angleId)?.label ?? "concepts";
  const base = `${brief.format} · ${theme} · ${brief.persona}`;
  if (brief.note) return `${brief.note}`;
  if (brief.tone === "bolder") return `Make them bolder — ${base}`;
  if (brief.tone === "shorter") return `Tighten the hooks — ${base}`;
  return `Draft ${CREATIVE_AGENT.conceptsPerRun} ${base} for ${brief.productName}`;
}

/* ─── Library (saved creatives) ──────────────────────────────────── */

export type LibraryFormat = "image" | "video" | "carousel";

export type LibraryCreative = {
  id: string;
  name: string;
  format: LibraryFormat;
  dimensions: string;
  product: string;
  persona: string;
  createdAt: string;
  src: string;
  hue: number;
};

export const LIBRARY_CREATIVES: LibraryCreative[] = [
  { id: "lib-1", name: "JEE Crack · Mentor-led · Static", format: "image", dimensions: "1080×1080", product: "Guyju's JEE Crack", persona: "Aspiring Engineer Parent", createdAt: "2026-05-30", src: "/assets/creatives/parent-01.png", hue: 18 },
  { id: "lib-2", name: "JEE Crack · Weekly mocks · Reel", format: "video", dimensions: "1080×1920", product: "Guyju's JEE Crack", persona: "The Self-Studier", createdAt: "2026-05-28", src: "/assets/creatives/student-03.png", hue: 215 },
  { id: "lib-3", name: "NEET Pro · Biology hook · Static", format: "image", dimensions: "1080×1080", product: "Guyju's NEET Pro", persona: "Aspiring Doctor Parent", createdAt: "2026-05-27", src: "/assets/creatives/parent-02.png", hue: 18 },
  { id: "lib-4", name: "JEE Crack · Parent dashboard · Carousel", format: "carousel", dimensions: "1080×1080", product: "Guyju's JEE Crack", persona: "Aspiring Engineer Parent", createdAt: "2026-05-25", src: "/assets/creatives/parent-03.png", hue: 18 },
  { id: "lib-5", name: "Spoken English · Confidence · Reel", format: "video", dimensions: "1080×1920", product: "Guyju's Spoken English", persona: "Working Professional", createdAt: "2026-05-24", src: "/assets/creatives/professional-01.png", hue: 268 },
  { id: "lib-6", name: "NEET Pro · Doubt-clearing · Static", format: "image", dimensions: "1080×1350", product: "Guyju's NEET Pro", persona: "The Self-Studier", createdAt: "2026-05-22", src: "/assets/creatives/student-04.png", hue: 215 },
  { id: "lib-7", name: "Foundation · Early start · Static", format: "image", dimensions: "1080×1080", product: "Guyju's Foundation 9-10", persona: "Aspiring Engineer Parent", createdAt: "2026-05-20", src: "/assets/creatives/parent-04.png", hue: 18 },
  { id: "lib-8", name: "JEE Crack · Switch coaching · Reel", format: "video", dimensions: "1080×1920", product: "Guyju's JEE Crack", persona: "The Coaching Hopper", createdAt: "2026-05-18", src: "/assets/creatives/student-01.png", hue: 215 },
  { id: "lib-9", name: "Spoken English · Interview prep · Static", format: "image", dimensions: "1080×1080", product: "Guyju's Spoken English", persona: "College Student", createdAt: "2026-05-16", src: "/assets/creatives/professional-02.png", hue: 268 },
  { id: "lib-10", name: "JEE Crack · Mock ranks · Carousel", format: "carousel", dimensions: "1080×1080", product: "Guyju's JEE Crack", persona: "The Self-Studier", createdAt: "2026-05-14", src: "/assets/creatives/student-02.png", hue: 215 },
  { id: "lib-11", name: "NEET Pro · Mentor-led · Static", format: "image", dimensions: "1080×1350", product: "Guyju's NEET Pro", persona: "Aspiring Doctor Parent", createdAt: "2026-05-12", src: "/assets/creatives/parent-01.png", hue: 18 },
  { id: "lib-12", name: "JEE Crack · 11pm doubt · Reel", format: "video", dimensions: "1080×1920", product: "Guyju's JEE Crack", persona: "The Self-Studier", createdAt: "2026-05-10", src: "/assets/creatives/student-03.png", hue: 215 },
];

const FMT_FROM_RATIO: Record<Concept["ratio"], string> = {
  "1:1": "1080×1080",
  "4:5": "1080×1350",
  "9:16": "1080×1920",
};

const LIB_FORMAT: Record<CreativeFormatKind, LibraryFormat> = {
  Static: "image",
  Carousel: "carousel",
  Reel: "video",
};

/** Convert an approved Studio concept into a Library row. */
export function conceptToLibrary(c: Concept): LibraryCreative {
  return {
    id: `lib-${c.id}`,
    name: `${c.productName.replace(/^Guyju's /, "")} · ${c.angleLabel} · ${c.format}`,
    format: LIB_FORMAT[c.format],
    dimensions: FMT_FROM_RATIO[c.ratio],
    product: c.productName,
    persona: c.persona,
    createdAt: new Date().toISOString().slice(0, 10),
    src: c.src,
    hue: c.hue,
  };
}
