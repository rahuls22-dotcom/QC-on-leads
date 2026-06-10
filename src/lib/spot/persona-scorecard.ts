// Persona scorecard — the structured performance layer that sits ON TOP
// of the qualitative persona definitions in personas-data.ts.
//
// This is the "what's working" store. Per our memory architecture:
//   · persona *identity* (who they are, pain, channels) = personas-data.ts
//   · persona *performance* (CPL, qual, the angle leaderboard) = HERE
//
// It is deliberately structured (not markdown) because it is ranked,
// rewritten after every execution, and each cell links back to the
// project that produced its numbers. `buildPersonasMd()` renders a
// read-only markdown PROJECTION for download / Spot's self-prompt — the
// records are the source of truth, the markdown is derived.

import { PERSONAS, type Persona } from "../personas-data";

/* ── Angle leaderboard ─────────────────────────────────────────── */

// One verdict per persona × angle cell. The whole point of the page.
export type AngleStatus = "winner" | "scaling" | "testing" | "fatigued" | "loser";

export type PersonaAngle = {
  id: string;
  /** The hook / angle copy this cell represents. */
  name: string;
  status: AngleStatus;
  /** ₹ cost per lead. */
  cpl: number;
  /** 0..1 — share of leads that qualified. */
  qualRate: number;
  /** Click-through rate, %. */
  ctr: number;
  /** Average impression frequency — fatigue signal. */
  frequency: number;
  /** Leads attributed — the sample size behind this cell's verdict. */
  leads: number;
  /** ₹ spent on this angle. */
  spend: number;
  /** Provenance — the project/execution that produced these numbers. */
  source: { id: string; label: string };
  /** Optional one-line note (why it's winning / why to cut it). */
  note?: string;
};

/* ── Persona-level rollup ──────────────────────────────────────── */

export type PersonaPerfStatus =
  | "winner" // best-performing persona on the product
  | "scaling" // working, budget being lifted
  | "testing" // still gathering signal
  | "paused" // intentionally off
  | "retired"; // no longer used

export type PersonaPerf = {
  status: PersonaPerfStatus;
  /** ₹ blended CPL across this persona's angles. */
  cpl: number;
  /** 0..1 blended qualification rate. */
  qualRate: number;
  /** ₹ total spend behind this persona. */
  spend: number;
  /** Total leads. */
  leads: number;
  /** Conversions used for the verdict — gates confidence (<50 = "testing"). */
  sampleSize: number;
  /** % change in CPL vs prior window. Negative = improving (cheaper). */
  trend: number;
  /** Spot's one-line take. */
  verdict: string;
  lastUpdated: string;
  angles: PersonaAngle[];
};

// Confidence gate — below this many conversions, a verdict is noise.
export const PERSONA_SAMPLE_GATE = 50;

/* ── The performance records, keyed by persona id ──────────────── */
// Written by Spot after each execution in the real product; seeded here.

export const PERSONA_PERF: Record<string, PersonaPerf> = {
  "pers-aspiring-engineer-parent": {
    status: "scaling",
    cpl: 318,
    qualRate: 0.41,
    spend: 240000,
    leads: 612,
    sampleSize: 612,
    trend: -12,
    verdict:
      "Weekly-progress-to-parents is the clear winner — scaling it. Free-diagnostic angle is fatiguing; refresh or cut.",
    lastUpdated: "2026-06-03",
    angles: [
      {
        id: "aep-ang-progress",
        name: "Weekly progress reports to parents",
        status: "winner",
        cpl: 248,
        qualRate: 0.52,
        ctr: 2.1,
        frequency: 1.8,
        leads: 280,
        spend: 69440,
        source: { id: "prj-jee-scale-q2", label: "JEE · Scale Q2" },
        note: "Best qual rate on the whole product. This is the message.",
      },
      {
        id: "aep-ang-iit",
        name: "IIT-alumni mentors you can trust",
        status: "scaling",
        cpl: 305,
        qualRate: 0.44,
        ctr: 1.7,
        frequency: 2.0,
        leads: 190,
        spend: 57950,
        source: { id: "prj-jee-launch", label: "JEE · Launch" },
      },
      {
        id: "aep-ang-batch",
        name: "Mentor-led · capped batch of 60",
        status: "testing",
        cpl: 360,
        qualRate: 0.38,
        ctr: 1.5,
        frequency: 1.6,
        leads: 96,
        spend: 34560,
        source: { id: "prj-foundation-launch", label: "Foundation · Launch" },
      },
      {
        id: "aep-ang-diagnostic",
        name: "Free diagnostic + demo class",
        status: "fatigued",
        cpl: 470,
        qualRate: 0.31,
        ctr: 1.1,
        frequency: 3.2,
        leads: 46,
        spend: 21620,
        source: { id: "prj-jee-launch", label: "JEE · Launch" },
        note: "CTR halved over 3 weeks, frequency 3.2 — refresh creative or retire.",
      },
    ],
  },

  "pers-aspiring-doctor-parent": {
    status: "winner",
    cpl: 276,
    qualRate: 0.47,
    spend: 190000,
    leads: 540,
    sampleSize: 540,
    trend: -8,
    verdict:
      "Strongest persona on NEET. Parent-visible rankings convert; the scholarship-test angle is a price-shopper trap — cut.",
    lastUpdated: "2026-06-02",
    angles: [
      {
        id: "adp-ang-ranking",
        name: "Parent-visible weekly mock rankings",
        status: "winner",
        cpl: 232,
        qualRate: 0.55,
        ctr: 2.3,
        frequency: 1.9,
        leads: 240,
        spend: 55680,
        source: { id: "prj-neet-scale", label: "NEET · Scale" },
        note: "Highest qual rate across every persona on this account.",
      },
      {
        id: "adp-ang-bio",
        name: "Biology-first · 60% of NEET marks",
        status: "scaling",
        cpl: 268,
        qualRate: 0.49,
        ctr: 2.0,
        frequency: 2.1,
        leads: 175,
        spend: 46900,
        source: { id: "prj-neet-launch", label: "NEET · Launch" },
      },
      {
        id: "adp-ang-mbbs",
        name: "Mentors who cracked NEET / MBBS",
        status: "testing",
        cpl: 312,
        qualRate: 0.42,
        ctr: 1.6,
        frequency: 1.7,
        leads: 88,
        spend: 27456,
        source: { id: "prj-neet-launch", label: "NEET · Launch" },
      },
      {
        id: "adp-ang-scholarship",
        name: "Scholarship entrance test",
        status: "loser",
        cpl: 540,
        qualRate: 0.22,
        ctr: 0.9,
        frequency: 1.4,
        leads: 37,
        spend: 19980,
        source: { id: "prj-neet-launch", label: "NEET · Launch" },
        note: "Attracts price-shoppers — qual rate is half the persona average. Cut.",
      },
    ],
  },

  "pers-self-studier": {
    status: "testing",
    cpl: 354,
    qualRate: 0.34,
    spend: 98000,
    leads: 277,
    sampleSize: 277,
    trend: 4,
    verdict:
      "Doubt-clearing is the hook that works; replay-access under-delivers. Still gathering signal on tier-3 reach.",
    lastUpdated: "2026-05-30",
    angles: [
      {
        id: "ss-ang-doubt",
        name: "Doubt-clearing in 15 minutes · live",
        status: "winner",
        cpl: 289,
        qualRate: 0.43,
        ctr: 2.0,
        frequency: 1.7,
        leads: 132,
        spend: 38148,
        source: { id: "prj-jee-scale-q2", label: "JEE · Scale Q2" },
      },
      {
        id: "ss-ang-replay",
        name: "24-month replay · no time pressure",
        status: "testing",
        cpl: 372,
        qualRate: 0.31,
        ctr: 1.4,
        frequency: 1.9,
        leads: 86,
        spend: 31992,
        source: { id: "prj-jee-launch", label: "JEE · Launch" },
      },
      {
        id: "ss-ang-mocks",
        name: "All-India mocks · know your real rank",
        status: "testing",
        cpl: 410,
        qualRate: 0.28,
        ctr: 1.3,
        frequency: 1.6,
        leads: 59,
        spend: 24190,
        source: { id: "prj-neet-launch", label: "NEET · Launch" },
        note: "Just over the sample gate — verdict still firming up.",
      },
    ],
  },

  "pers-coaching-hopper": {
    status: "testing",
    cpl: 445,
    qualRate: 0.29,
    spend: 12000,
    leads: 28,
    sampleSize: 28,
    trend: 0,
    verdict:
      "Below the 50-conversion gate — not enough data to call yet. One angle live; holding for more signal.",
    lastUpdated: "2026-05-21",
    angles: [
      {
        id: "ch-ang-switch",
        name: "Switch mid-year · we cover the gap",
        status: "testing",
        cpl: 445,
        qualRate: 0.29,
        ctr: 1.2,
        frequency: 1.3,
        leads: 28,
        spend: 12000,
        source: { id: "prj-jee-angles", label: "JEE · Angle test" },
        note: "28 leads — below the 50-conversion gate. Hold, don't judge yet.",
      },
    ],
  },
};

/* ── Merge: identity + performance ─────────────────────────────── */

export type PersonaScorecard = Persona & { perf: PersonaPerf | null };

/** Every persona linked to a product, each merged with its perf record. */
export function scorecardsForProduct(productId: string): PersonaScorecard[] {
  return PERSONAS.filter((p) => p.products.some((pr) => pr.id === productId)).map(
    (p) => ({ ...p, perf: PERSONA_PERF[p.id] ?? null }),
  );
}

/* ── Display helpers ───────────────────────────────────────────── */

export const ANGLE_STATUS_LABEL: Record<AngleStatus, string> = {
  winner: "Winner",
  scaling: "Scaling",
  testing: "Testing",
  fatigued: "Fatigued",
  loser: "Loser",
};

// Tailwind-friendly tone tuples used by the scorecard UI.
export const ANGLE_STATUS_TONE: Record<
  AngleStatus,
  { bg: string; text: string; dot: string }
> = {
  winner: { bg: "#ECFDF3", text: "#15803D", dot: "#22C55E" },
  scaling: { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  testing: { bg: "#FEFCE8", text: "#92740E", dot: "#CA8A04" },
  fatigued: { bg: "#FFF7ED", text: "#9A3412", dot: "#EA580C" },
  loser: { bg: "#FEF2F2", text: "#B91C1C", dot: "#EF4444" },
};

export const PERSONA_PERF_STATUS_LABEL: Record<PersonaPerfStatus, string> = {
  winner: "Winner",
  scaling: "Scaling",
  testing: "Testing",
  paused: "Paused",
  retired: "Retired",
};

export const PERSONA_PERF_STATUS_TONE: Record<
  PersonaPerfStatus,
  { bg: string; text: string; dot: string }
> = {
  winner: { bg: "#ECFDF3", text: "#15803D", dot: "#22C55E" },
  scaling: { bg: "#EFF6FF", text: "#1D4ED8", dot: "#3B82F6" },
  testing: { bg: "#FEFCE8", text: "#92740E", dot: "#CA8A04" },
  paused: { bg: "#F4F4F2", text: "#6B6B63", dot: "#9CA3AF" },
  retired: { bg: "#F4F4F2", text: "#6B6B63", dot: "#9CA3AF" },
};

/* ── Derived markdown export (projection, NOT the source) ───────── */

export function buildPersonasMd(productId: string, productName: string): string {
  const cards = scorecardsForProduct(productId);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const inr = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

  const blocks = cards
    .map((c) => {
      const perf = c.perf;
      const header = `## ${c.shortLabel}${
        perf ? ` · ${PERSONA_PERF_STATUS_LABEL[perf.status]}` : ""
      }`;
      const who = `_${c.description}_`;
      if (!perf) {
        return `${header}\n\n${who}\n\n_No performance data yet._`;
      }
      const kpis = [
        `- **Blended CPL** · ${inr(perf.cpl)}`,
        `- **Qual rate** · ${pct(perf.qualRate)}`,
        `- **Leads** · ${perf.leads.toLocaleString("en-IN")} (${perf.spend >= 1000 ? inr(perf.spend) : `₹${perf.spend}`} spend)`,
        `- **Trend** · ${perf.trend === 0 ? "flat" : `${perf.trend > 0 ? "+" : ""}${perf.trend}% CPL`}`,
        `- **Verdict** · ${perf.verdict}`,
      ].join("\n");
      const table = [
        "| Angle | Status | CPL | Qual | CTR | Freq | Leads | Source |",
        "|---|---|---|---|---|---|---|---|",
        ...perf.angles.map(
          (a) =>
            `| ${a.name} | ${ANGLE_STATUS_LABEL[a.status]} | ${inr(a.cpl)} | ${pct(a.qualRate)} | ${a.ctr}% | ${a.frequency} | ${a.leads} | ${a.source.label} |`,
        ),
      ].join("\n");
      return `${header}\n\n${who}\n\n${kpis}\n\n### Angle leaderboard\n\n${table}`;
    })
    .join("\n\n");

  return `# Personas · ${productName}

_Derived from the persona records · ${cards.length} personas · ${cards.reduce(
    (s, c) => s + (c.perf?.angles.length ?? 0),
    0,
  )} angles tracked_

${blocks}

---

_This file is a read-only projection of the persona scorecard. Edit the records, not this file._
`;
}
