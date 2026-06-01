// Memory is structured by Product. Each product is a "project" inside
// memory with a tiny filesystem behind it:
//
//   product-info.md      — long-form product brief (renders on the Brief tab)
//   plan.md              — the long-lived strategic plan (renders on Plan tab)
//   performance.html     — rich metrics dashboard (NOT markdown — interactive)
//   assets/              — creatives + landing pages + forms + search ads
//   change-history.md    — append-only log of every change to the memory
//
// We keep the textual fields as actual markdown strings so the demo
// can render them through a minimal md-render and so they read like
// real files when copy-pasted out. Performance + Assets are too rich
// for markdown — those stay as TS objects rendered via React.

import type { ProductSummary } from "../products-data";
import { PRODUCTS } from "../products-data";
import { PERSONAS } from "../personas-data";
import { PRODUCT_PLANS, type ProductPlan } from "./extended-flows";

/* ────────────────────────────────────────────────────────────────
 * SHAPED ASSET TYPES — what shows up under the Assets tab.
 * ──────────────────────────────────────────────────────────────── */

export type CreativeSize = "1:1" | "4:5" | "9:16" | "16:9";

export type MemoryCreative = {
  id: string;
  label: string;
  /** Primary aspect — the source ratio Spot designed for. */
  format: CreativeSize;
  /** All resized variants available (Resize Agent output). */
  sizes: CreativeSize[];
  kind: "image" | "video" | "carousel";
  state: "live" | "ready" | "shell";
  /** Persona shortLabel. */
  personaName: string;
  /** Hue for the placeholder gradient. */
  hue: number;
};

/**
 * Google-side search ad copies that live under Assets. Each search ad
 * has a primary headline + description, a few variant copies, and a
 * Google "ad strength" diagnostic.
 */
export type MemorySearchAd = {
  id: string;
  /** Brand / Category / Competitor — which keyword bucket this ad serves. */
  campaign: "Brand" | "Category" | "Competitor";
  primaryHeadline: string;
  primaryDescription: string;
  /** Additional headline variants Google rotates between. */
  headlineVariants: string[];
  /** Keyword list (truncated · comma-separated). */
  keywords: string;
  adStrength: "excellent" | "good" | "average";
  status: "live" | "draft";
};

export type MemoryLandingPage = {
  id: string;
  title: string;
  /** Persona shortLabel. */
  personaName: string;
  status: "live" | "draft";
  /** "12 sections" / "8 sections". */
  sections: number;
  /** Latest 30d traffic. */
  visits30d: number;
  /** Conversion rate · % of visits that submitted the form. */
  conversionRate: number;
};

export type MemoryForm = {
  id: string;
  title: string;
  kind: "lead-form" | "click-to-whatsapp" | "phone-form";
  status: "live" | "draft";
  /** Persona this form serves. */
  personaName: string;
  /** Field count · "5 fields". */
  fields: number;
  /** Latest 30d submissions. */
  submissions30d: number;
};

export type MemoryAssets = {
  creatives: MemoryCreative[];
  searchAds: MemorySearchAd[];
  landingPages: MemoryLandingPage[];
  forms: MemoryForm[];
};

export type ProductPerformanceMetric = {
  key: string;
  label: string;
  value: string;
  /** % delta vs prior period. */
  delta: number;
  /** If true, ↑ is bad (cost metrics). */
  invertDelta?: boolean;
  /** Optional sparkline values · normalized 0-1. */
  spark?: number[];
};

export type ProductMemoryFiles = {
  productId: string;
  productName: string;
  /** Markdown content of product-info.md */
  productInfoMd: string;
  /** Markdown content of plan.md */
  planMd: string;
  /** Markdown content of change-history.md · append-only log */
  changeHistoryMd: string;
  /** Structured performance metrics for the rich dashboard. */
  performance: {
    headline: string;
    metrics: ProductPerformanceMetric[];
    /** Daily spend curve · last 14 days. */
    spendCurve: number[];
    /** Daily leads curve · last 14 days. */
    leadsCurve: number[];
    /** Per-channel split of the spend. */
    channelMix: { name: string; share: number; color: string }[];
  };
  /** Assets — creatives, search ads, landing pages, forms. */
  assets: MemoryAssets;
};

/* ────────────────────────────────────────────────────────────────
 * BUILDERS — generate each file from existing product data so the
 * Memory page stays in sync with the Spot world.
 * ──────────────────────────────────────────────────────────────── */

function buildProductInfoMd(p: ProductSummary): string {
  const briefRows = p.brief
    .map((r) => `- ${r.icon} **${r.label}** · ${r.value}`)
    .join("\n");
  const pricingRows = p.pricing
    .map(
      (pr) =>
        `- **${pr.name}** · ${pr.cost}${pr.cadence ? ` ${pr.cadence}` : ""}${pr.badge ? ` · _${pr.badge}_` : ""}`,
    )
    .join("\n");
  const offerRows = p.offers
    .map((o) => `- ${o.label}${o.meta ? ` · _${o.meta}_` : ""}`)
    .join("\n");
  const usps = p.usps.map((u) => `- ${u}`).join("\n");
  const avoid = p.avoid.map((a) => `- ${a}`).join("\n");
  const personas = p.personas.map((pe) => `- ${pe.name}`).join("\n");
  const collateral = p.collateral
    .map((c) => `- ${c.name} · _${c.kind.toUpperCase()}, ${c.size}_`)
    .join("\n");

  return `# ${p.name}

_${p.client} · ${p.category}_

${p.tagline}

## Product brief

${briefRows}

## Pricing

${pricingRows}

## Offers

${offerRows}

## USPs · lead with these

${usps}

## Do not mention

${avoid}

## Linked personas

${personas}

${collateral ? `## Attached collateral\n\n${collateral}\n` : ""}

---

_Memory last updated · ${p.updatedAt} · Readiness ${Math.round(p.readiness * 100)}%_
`;
}

function buildPlanMd(p: ProductSummary, plan: ProductPlan | undefined): string {
  if (!plan) {
    return `# Execution plan · ${p.name}

_No active execution plan yet._

Every time you talk to Spot, the agent drafts a fresh execution plan for that conversation. Deploy the agent to run it; once those tasks are done, the plan is finished and a new conversation will produce a new one.
`;
  }
  const phaseBlocks = plan.phases
    .map((ph, i) => {
      const actions = ph.actions.map((a) => `- ${a}`).join("\n");
      const observes = ph.observes.map((o) => `- ${o}`).join("\n");
      const decision = ph.decisionRule
        ? `\n**Decision rule** — ${ph.decisionRule}`
        : "";
      return `### ${i + 1}. ${ph.week} · ${ph.title}

_${ph.dates}_

**What I'll do**
${actions}

**What I'll watch**
${observes}
${ph.decisionAt ? `\n**Decision at** · ${ph.decisionAt}` : ""}${decision}
`;
    })
    .join("\n");
  const guardrails = plan.guardrails.map((g) => `- ${g}`).join("\n");
  const history = plan.history
    .slice()
    .reverse()
    .map((h) => `- **${h.at}** · _${h.who}_ — ${h.entry}`)
    .join("\n");

  return `# Execution plan · ${p.name}

_${plan.status.toUpperCase()} · ${plan.dayLabel}_

## Goal

${plan.goal}

## Phases

${phaseBlocks}

## Guardrails

I enforce these automatically — no need to confirm.

${guardrails}

## History

${history}

---

_Execution plan last updated · ${plan.updatedAt}_
_Next decision · ${plan.nextDecision}_
`;
}

function buildPerformance(
  p: ProductSummary,
): ProductMemoryFiles["performance"] {
  const perf = p.performance;
  // Synthesize 14-day curves with mild noise around the perf totals.
  const dailySpend = perf.totalSpend / 30;
  const dailyLeads = perf.totalLeads / 30;
  const spendCurve = Array.from(
    { length: 14 },
    (_, i) =>
      Math.round(dailySpend * (0.85 + Math.sin(i * 0.5) * 0.08 + Math.random() * 0.12)),
  );
  const leadsCurve = Array.from(
    { length: 14 },
    (_, i) =>
      Math.round(dailyLeads * (0.85 + Math.sin(i * 0.6 + 0.3) * 0.1 + Math.random() * 0.14)),
  );

  const metrics: ProductPerformanceMetric[] = [
    {
      key: "spend",
      label: "Total spend · 30d",
      value: inr(perf.totalSpend),
      delta: 12.4,
    },
    {
      key: "leads",
      label: "Total leads · 30d",
      value: perf.totalLeads.toLocaleString("en-IN"),
      delta: 18.6,
    },
    {
      key: "cpl",
      label: "Avg CPL",
      value: `₹${perf.avgCpl}`,
      delta: -5.2,
      invertDelta: true,
    },
    {
      key: "verified",
      label: "Verified leads",
      value: perf.verifiedLeads.toLocaleString("en-IN"),
      delta: 16.1,
    },
    {
      key: "qualified",
      label: "Qualified leads",
      value: perf.qualifiedLeads.toLocaleString("en-IN"),
      delta: 22.4,
    },
    {
      key: "qualRate",
      label: "Qualification rate",
      value: `${perf.qualificationRate}%`,
      delta: 3.1,
    },
    {
      key: "cpql",
      label: "Cost per qualified",
      value: `₹${perf.costPerQualifiedLead.toLocaleString("en-IN")}`,
      delta: -9.8,
      invertDelta: true,
    },
    {
      key: "verifRate",
      label: "Verification rate",
      value: `${perf.verificationRate}%`,
      delta: 1.4,
    },
  ];

  return {
    headline: `${perf.window} · ${perf.activeCampaigns} active campaign${perf.activeCampaigns === 1 ? "" : "s"}`,
    metrics,
    spendCurve,
    leadsCurve,
    channelMix: [
      { name: "Meta", share: 55, color: "#1877F2" },
      { name: "Google Search", share: 18, color: "#4285F4" },
      { name: "Google Discover", share: 12, color: "#34A853" },
      { name: "Outreach", share: 15, color: "#15803D" },
    ],
  };
}

function buildAssets(p: ProductSummary): MemoryAssets {
  // Pull creatives across all personas linked to this product.
  const creatives: MemoryCreative[] = [];
  for (const persona of PERSONAS) {
    for (const c of persona.creatives) {
      if (c.productId === p.id) {
        // Resize Agent expands each creative across the standard 4
        // formats. Live creatives have all 4 sizes baked; ready
        // creatives have the source + the two key formats; shells
        // only have their source size while waiting on Resize.
        const sizes: CreativeSize[] =
          c.state === "live"
            ? ["1:1", "4:5", "9:16", "16:9"]
            : c.state === "ready"
              ? Array.from(new Set<CreativeSize>([c.format, "1:1", "9:16"]))
              : [c.format];
        creatives.push({
          id: c.id,
          label: c.label,
          format: c.format,
          sizes,
          kind: c.kind,
          state: c.state,
          personaName: persona.shortLabel,
          hue: c.hue,
        });
      }
    }
  }
  // Synthetic landing pages — one per linked persona.
  const landingPages: MemoryLandingPage[] = p.personas.map((pe, i) => {
    const persona = PERSONAS.find((x) => x.id === pe.id);
    return {
      id: `lp-${p.id}-${i}`,
      title:
        i === 0
          ? `Demo class booking · ${persona?.shortLabel ?? pe.name}`
          : i === 1
            ? `Free-mock landing · ${persona?.shortLabel ?? pe.name}`
            : `1:1 call booking · ${persona?.shortLabel ?? pe.name}`,
      personaName: persona?.shortLabel ?? pe.name,
      status: i === 0 ? "live" : "draft",
      sections: 5 + i,
      visits30d: 2400 - i * 600,
      conversionRate: 4.2 - i * 0.6,
    };
  });
  // Synthetic forms.
  const forms: MemoryForm[] = p.personas.slice(0, 2).map((pe, i) => {
    const persona = PERSONAS.find((x) => x.id === pe.id);
    return {
      id: `form-${p.id}-${i}`,
      title:
        i === 0
          ? `Demo class booking form · ${persona?.shortLabel ?? pe.name}`
          : `Click-to-WhatsApp · ${persona?.shortLabel ?? pe.name}`,
      kind: i === 0 ? "lead-form" : "click-to-whatsapp",
      status: "live",
      personaName: persona?.shortLabel ?? pe.name,
      fields: 4 + i,
      submissions30d: 612 - i * 220,
    };
  });

  const searchAds: MemorySearchAd[] = buildSearchAds(p);

  return { creatives, searchAds, landingPages, forms };
}

/**
 * Google search ad copies per product · brand defense + category +
 * (where the product has competitor pressure) competitor-bidding ad.
 * Headlines mention the product name + leaning into the strongest USP
 * we know about (live cohort + mentor-led, biology-first for NEET, etc.).
 */
function buildSearchAds(p: ProductSummary): MemorySearchAd[] {
  const out: MemorySearchAd[] = [
    {
      id: `sa-${p.id}-brand`,
      campaign: "Brand",
      primaryHeadline: `${p.name} · official`,
      primaryDescription: p.tagline,
      headlineVariants: [
        `${p.name} · live cohort`,
        `Join ${p.name} · book a free demo`,
        `${p.name} · capped batches, real mentors`,
      ],
      keywords: `${p.name.toLowerCase()}, ${p.name.toLowerCase().replace(/'/g, "")}, guyjus ${p.name.split(" ").slice(-1)[0].toLowerCase()}`,
      adStrength: "excellent",
      status: "live",
    },
    {
      id: `sa-${p.id}-category`,
      campaign: "Category",
      primaryHeadline: `${p.category.split("·")[0].trim()} · live mentors`,
      primaryDescription:
        "Cohort capped at 60 · live doubt-clearing · weekly all-India mocks. Free demo class today.",
      headlineVariants: [
        "Live cohort · mentor-led classes",
        "Weekly all-India mocks · ranked",
        "24-month replay access",
        "Free demo class · book today",
      ],
      keywords: "online coaching, live mentor classes, best preparation online, free demo",
      adStrength: "good",
      status: "live",
    },
  ];
  // Competitor-bidding ad — only for products with category-level
  // competitive pressure flagged in memory.
  if (
    p.avoid.some((a) => /(Allen|Aakash|FIITJEE)/i.test(a)) ||
    p.id === "prod-guyjus-jee"
  ) {
    out.push({
      id: `sa-${p.id}-comp`,
      campaign: "Competitor",
      primaryHeadline: "Switching coaching? Try Guyju's",
      primaryDescription:
        "Cover the gap mid-year · live doubt-clearing · mentor 1:1 monthly. Free demo class.",
      headlineVariants: [
        "Looking for an alternative?",
        "Live online cohort · no auditorium",
        "Bring your old syllabus · we cover the gap",
      ],
      keywords: "coaching alternative, switch coaching online, online prep alternative",
      adStrength: "good",
      status: "draft",
    });
  }
  return out;
}

/**
 * Append-only log of every change to this product's memory. Pulls
 * straight from p.memory + plan.history so the timeline is always
 * sourced from real entries.
 */
function buildChangeHistoryMd(p: ProductSummary): string {
  const plan = PRODUCT_PLANS.find((pl) => pl.productId === p.id);
  // Merge product-memory entries + plan-history entries, sort newest first.
  type Row = { at: string; who: string; kind: string; entry: string };
  const rows: Row[] = [];
  for (const m of p.memory) {
    rows.push({
      at: m.at,
      who: m.who,
      kind: humaniseKind(m.kind),
      entry: m.summary,
    });
  }
  if (plan) {
    for (const h of plan.history) {
      rows.push({
        at: h.at,
        who: h.who,
        kind: "Execution plan",
        entry: h.entry,
      });
    }
  }
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));

  const body = rows
    .map((r) => `### ${r.at} · ${r.who}\n\n_${r.kind}_\n\n${r.entry}`)
    .join("\n\n---\n\n");

  return `# Change history · ${p.name}

Every change to this product's memory · append-only. Spot writes here
whenever it learns something new; humans show up when they correct,
add a constraint, or approve a change.

_${rows.length} entries · newest first_

---

${body || "_No changes yet · memory is fresh._"}
`;
}

function humaniseKind(kind: string): string {
  const map: Record<string, string> = {
    brief: "Brief",
    usp: "USP locked",
    "persona-link": "Persona linked",
    "creative-feedback": "Creative learning",
    constraint: "Constraint added",
  };
  return map[kind] ?? kind;
}

function inr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)} K`;
  return `₹${n}`;
}

/* ────────────────────────────────────────────────────────────────
 * Memory files per product · materialised once at module load.
 * ──────────────────────────────────────────────────────────────── */

export const MEMORY_FILES: ProductMemoryFiles[] = PRODUCTS.map((p) => {
  const plan = PRODUCT_PLANS.find((pl) => pl.productId === p.id);
  return {
    productId: p.id,
    productName: p.name,
    productInfoMd: buildProductInfoMd(p),
    planMd: buildPlanMd(p, plan),
    changeHistoryMd: buildChangeHistoryMd(p),
    performance: buildPerformance(p),
    assets: buildAssets(p),
  };
});

export function memoryFilesFor(productId: string): ProductMemoryFiles | undefined {
  return MEMORY_FILES.find((f) => f.productId === productId);
}
