// "Products" are the long-lived memory layer. A product is the shared
// brain across every project, campaign, and persona that touches it:
// the brief, the USPs, the do-not-mention list, attached collateral,
// and an append-only edit history.
//
// In the Agentic OS, Spot reads from Products when it does persona
// research, drafts angles, or briefs the Creative Agent. Anything the
// user — or Spot — learns about a product gets written back here as
// a memory entry.

export type ProductMemoryEntry = {
  id: string;
  at: string; // ISO date, formatted on the client
  who: string; // "Spot" | a teammate name
  kind: "brief" | "usp" | "persona-link" | "creative-feedback" | "constraint";
  summary: string;
};

// Performance rolls up across every campaign tied to this product —
// these are the same shape ProjectItem used to carry. With Projects
// gone, Product *is* the unit you spend and report against.
export type ProductPerformance = {
  /** Window the numbers refer to. Display label only. */
  window: string;
  totalSpend: number;
  totalLeads: number;
  verifiedLeads: number;
  qualifiedLeads: number;
  avgCpl: number;
  costPerVerifiedLead: number;
  costPerQualifiedLead: number;
  verificationRate: number;
  qualificationRate: number;
  activeCampaigns: number;
  /** Health verdict Spot has called on the latest data. */
  health: "on-track" | "needs-attention" | "underperforming";
};

/** A factual line in the product brief. Spot reads from this before
 *  drafting copy / answering questions about the product. */
export type ProductBriefRow = {
  /** Single emoji prefix for a glanceable row. */
  icon: string;
  label: string;
  value: string;
};

/** One pricing plan — e.g. "2-year cohort" → ₹65,000. */
export type ProductPlan = {
  name: string;
  /** Total or per-period cost as a human string. */
  cost: string;
  /** "one-shot" / "/month" / "/year" — appended after cost. */
  cadence?: string;
  /** Tag like "Most picked" / "Limited slots". Renders as a small pill. */
  badge?: string;
};

/** Active offers and discounts on the product. */
export type ProductOffer = {
  label: string;
  /** Optional expiry / short qualifier. */
  meta?: string;
};

/** Insight Spot has captured from running campaigns on this product. */
export type ProductLearning = {
  id: string;
  /** Quick frame: "performance" / "audience" / "creative" / "channel". */
  kind: "performance" | "audience" | "creative" | "channel";
  /** One-line summary. */
  summary: string;
  /** Optional supporting numbers. */
  evidence?: string;
};

export type ProductSummary = {
  id: string;
  name: string;
  category: string;
  client: string;
  /** Short tagline / what the product *is*, in 1 line. */
  tagline: string;
  /** Structured product brief — what the product *is* in detail. */
  brief: ProductBriefRow[];
  /** Pricing plans — at least one. */
  pricing: ProductPlan[];
  /** Active offers / discounts. */
  offers: ProductOffer[];
  /** USPs — what makes it distinct. Spot leans on this when drafting copy. */
  usps: string[];
  /** Things never to claim — guarantees, legal, factual landmines. */
  avoid: string[];
  /** Linked personas, by id and name — soft references; personas live globally. */
  personas: { id: string; name: string }[];
  /** Attached collateral — brochures, decks, demo videos. */
  collateral: { name: string; kind: "pdf" | "deck" | "video"; size: string }[];
  /** Memory entries — chronological. Newest first when rendered. */
  memory: ProductMemoryEntry[];
  /** Insights derived from past campaign data on this product. */
  learnings: ProductLearning[];
  /** Coverage signal: how complete the memory is. 0..1. */
  readiness: number;
  /** Spend + leads rolled up from this product's campaigns. */
  performance: ProductPerformance;
  /** Stable brand accent (hex) — the one place product colour is defined.
   *  Used for the product icon on Projects + anywhere a per-product tint is
   *  needed. Assigned here so colours are managed centrally, not derived from
   *  a fragile id hash. */
  accent: string;
  updatedAt: string;
};

export const PRODUCTS: ProductSummary[] = [
  {
    id: "prod-guyjus-jee",
    name: "Guyju's JEE Crack",
    category: "EdTech · Engineering Entrance Prep",
    client: "Guyju's",
    tagline: "Two-year JEE Mains + Advanced program for Class 11 students with live doubt-clearing and weekly mocks.",
    brief: [
      { icon: "📅", label: "Duration", value: "2 years · Class 11 + 12" },
      { icon: "👥", label: "Cohort size", value: "Capped at 60 · live classes" },
      { icon: "📚", label: "Curriculum", value: "Physics · Chemistry · Math (NCERT + advanced)" },
      { icon: "👨‍🏫", label: "Mentors", value: "12 IIT-alum mentors · 1:1 monthly review" },
      { icon: "📝", label: "Mocks", value: "Weekly all-India · ranked against 1.2L+ aspirants" },
      { icon: "🎞️", label: "Access", value: "Recordings + library available for 24 months" },
      { icon: "🎯", label: "Outcome", value: "JEE Mains + Advanced preparation" },
    ],
    pricing: [
      { name: "2-year cohort", cost: "₹65,000", cadence: "one-shot", badge: "Most picked" },
      { name: "2-year · EMI", cost: "₹5,950", cadence: "/month · 12 months" },
      { name: "1-year intensive", cost: "₹38,000", cadence: "one-shot" },
    ],
    offers: [
      { label: "Early-bird · 12% off", meta: "till May 31" },
      { label: "Sibling discount · 8%", meta: "stackable" },
      { label: "100% refund · first 14 days", meta: "no questions" },
    ],
    usps: [
      "Live cohort classes capped at 60 — every doubt answered in-class",
      "Weekly all-India mocks ranked against 1.2L+ JEE aspirants",
      "Personal study planner reviewed by an IIT-alum mentor",
      "Recordings available for 24 months · no time pressure",
    ],
    avoid: [
      "Don't promise specific ranks or guarantees",
      "Avoid comparisons to FIITJEE / Allen by name",
      "No 'best in India' superlatives — flagged by legal",
    ],
    learnings: [
      {
        id: "l1",
        kind: "creative",
        summary: "Mentor-led hook outperforms rank-focused hook by 31% on hold-rate",
        evidence: "Past 45 days · all personas",
      },
      {
        id: "l2",
        kind: "audience",
        summary: "Self-Studier cohort: 2.4× lower CPL but 60% lower BOFU conversion",
        evidence: "Q4 cohort data",
      },
      {
        id: "l3",
        kind: "audience",
        summary: "Class 11 parents respond stronger than Class 12 — fresh cohort opening hooks land best",
        evidence: "Last 2 launches",
      },
      {
        id: "l4",
        kind: "channel",
        summary: "Hyderabad, Pune and Bangalore are top metros for paid demo-class signups",
        evidence: "30-day window",
      },
    ],
    personas: [
      { id: "pers-aspiring-engineer-parent", name: "The Aspiring Engineer Parent" },
      { id: "pers-self-studier", name: "The Self-Studier" },
      { id: "pers-coaching-hopper", name: "The Coaching Hopper" },
    ],
    collateral: [
      { name: "JEE Crack — Curriculum overview.pdf", kind: "pdf", size: "6.4 MB" },
      { name: "Mentor profiles deck.pdf", kind: "deck", size: "4.1 MB" },
      { name: "Demo class · Mechanics walkthrough.mp4", kind: "video", size: "118 MB" },
    ],
    memory: [
      {
        id: "m1",
        at: "2026-05-24",
        who: "Spot",
        kind: "creative-feedback",
        summary: "Mentor-led hook outperforms rank-focused hook by 31% on hold-rate. Rotated rank-focused to retargeting only.",
      },
      {
        id: "m2",
        at: "2026-05-20",
        who: "Ankit Purohit",
        kind: "constraint",
        summary: "Legal flagged 'guaranteed rank improvement' phrasing. Removed from approved copy list.",
      },
      {
        id: "m3",
        at: "2026-05-12",
        who: "Spot",
        kind: "persona-link",
        summary: "Linked 'The Coaching Hopper' persona — strong response on offline-to-online switch angle in tier-2 cities.",
      },
      {
        id: "m4",
        at: "2026-05-08",
        who: "Ankit Purohit",
        kind: "brief",
        summary: "Initial brief uploaded. USPs locked: live cohort, weekly mocks, IIT-alum mentors, 24-month access.",
      },
    ],
    readiness: 0.88,
    accent: "#1F5BE0",
    performance: {
      window: "Last 30 days",
      totalSpend: 642000,
      totalLeads: 1840,
      verifiedLeads: 612,
      qualifiedLeads: 248,
      avgCpl: 349,
      costPerVerifiedLead: 1049,
      costPerQualifiedLead: 2589,
      verificationRate: 33.3,
      qualificationRate: 13.5,
      activeCampaigns: 4,
      health: "on-track",
    },
    updatedAt: "2026-05-24",
  },
  {
    id: "prod-guyjus-neet",
    name: "Guyju's NEET Pro",
    category: "EdTech · Medical Entrance Prep",
    client: "Guyju's",
    tagline: "Two-year NEET prep with biology-first weekly mocks and one-on-one mentor sessions for Class 11/12.",
    brief: [
      { icon: "📅", label: "Duration", value: "2 years · Class 11 + 12" },
      { icon: "👥", label: "Cohort size", value: "Capped at 80 · live classes" },
      { icon: "📚", label: "Curriculum", value: "Biology-first · Physics · Chemistry" },
      { icon: "👨‍⚕️", label: "Mentors", value: "8 MBBS-alum mentors · bi-weekly 1:1" },
      { icon: "📝", label: "Mocks", value: "AIIMS-grade · ranked all-India · weekly" },
      { icon: "🎞️", label: "Access", value: "Recordings available for 24 months" },
      { icon: "🎯", label: "Outcome", value: "NEET-UG preparation" },
    ],
    pricing: [
      { name: "2-year cohort", cost: "₹72,000", cadence: "one-shot", badge: "Most picked" },
      { name: "2-year · EMI", cost: "₹6,500", cadence: "/month · 12 months" },
      { name: "1-year crash", cost: "₹42,000", cadence: "one-shot" },
    ],
    offers: [
      { label: "Early-bird · 10% off", meta: "till May 31" },
      { label: "Top-10% mock-ranker · ₹10K cashback", meta: "post-enrol" },
      { label: "100% refund · first 14 days" },
    ],
    usps: [
      "Biology-first curriculum — 60% of NEET marks come from one subject",
      "Bi-weekly 1:1 mentor sessions with an MBBS-alum",
      "AIIMS-grade mock papers · ranked all-India",
      "Performance dashboards parents can see weekly",
    ],
    avoid: [
      "Don't make medical-college admission claims",
      "Avoid Allen / Aakash comparisons",
    ],
    learnings: [
      {
        id: "l1",
        kind: "creative",
        summary: "'Parents see weekly progress' hook is strongest opener — 2.1× CTR vs mentor-led",
        evidence: "Last 30 days · cold cohorts",
      },
      {
        id: "l2",
        kind: "audience",
        summary: "Doctor-Parent persona pulls 18% higher BOFU than Engineer-Parent equivalent",
        evidence: "Cross-product comparison",
      },
      {
        id: "l3",
        kind: "channel",
        summary: "Kerala + Tamil Nadu account for 38% of qualified leads despite 22% spend share",
        evidence: "Last quarter rollup",
      },
    ],
    personas: [
      { id: "pers-aspiring-doctor-parent", name: "The Aspiring Doctor Parent" },
      { id: "pers-self-studier", name: "The Self-Studier" },
    ],
    collateral: [
      { name: "NEET Pro — Curriculum overview.pdf", kind: "pdf", size: "5.8 MB" },
      { name: "Sample mock — Biology.pdf", kind: "pdf", size: "2.3 MB" },
    ],
    memory: [
      {
        id: "m1",
        at: "2026-05-23",
        who: "Spot",
        kind: "creative-feedback",
        summary: "'Parents see weekly progress' hook is strongest opener — 2.1× CTR vs mentor-led. Locked as primary for cold cohorts.",
      },
      {
        id: "m2",
        at: "2026-05-15",
        who: "Spot",
        kind: "persona-link",
        summary: "Reused 'The Aspiring Parent' archetype — Doctor variant pulls 18% higher BOFU than Engineer.",
      },
    ],
    readiness: 0.74,
    accent: "#15803D",
    performance: {
      window: "Last 30 days",
      totalSpend: 488000,
      totalLeads: 786,
      verifiedLeads: 218,
      qualifiedLeads: 78,
      avgCpl: 621,
      costPerVerifiedLead: 2238,
      costPerQualifiedLead: 6256,
      verificationRate: 27.7,
      qualificationRate: 9.9,
      activeCampaigns: 2,
      health: "needs-attention",
    },
    updatedAt: "2026-05-23",
  },
  {
    id: "prod-guyjus-foundation",
    name: "Guyju's Foundation 9-10",
    category: "EdTech · K-12 Foundation",
    client: "Guyju's",
    tagline: "Class 9-10 foundation built for kids who want to clear JEE/NEET later — math + science with project labs.",
    brief: [
      { icon: "📅", label: "Duration", value: "2 years · Class 9 + 10" },
      { icon: "👥", label: "Cohort size", value: "Up to 50 · live + project labs" },
      { icon: "📚", label: "Curriculum", value: "Math + Science · CBSE + ICSE aligned" },
      { icon: "👨‍🏫", label: "Mentors", value: "6 senior school-teacher mentors" },
      { icon: "🔬", label: "Labs", value: "Hands-on project labs every fortnight" },
      { icon: "🎯", label: "Outcome", value: "Foundation for JEE / NEET prep tracks" },
    ],
    pricing: [
      { name: "2-year program", cost: "₹38,000", cadence: "one-shot", badge: "Most picked" },
      { name: "2-year · EMI", cost: "₹3,500", cadence: "/month · 12 months" },
      { name: "Single year (9 or 10)", cost: "₹22,000", cadence: "one-shot" },
    ],
    offers: [
      { label: "Early-bird · 8% off", meta: "till May 31" },
      { label: "100% refund · first 14 days" },
    ],
    usps: [
      "School-aligned (CBSE + ICSE) so it doesn't conflict with regular coursework",
      "Hands-on project labs every fortnight",
      "Builds early for JEE/NEET without burning out",
    ],
    avoid: [
      "Don't position as a school replacement",
      "Avoid 'pressure-free' framing — parents read it as unserious",
    ],
    learnings: [
      {
        id: "l1",
        kind: "audience",
        summary: "Engineer-parents lean in 2.3× harder than other parent cohorts",
        evidence: "Trial-launch data",
      },
      {
        id: "l2",
        kind: "creative",
        summary: "Lab-bench imagery outperforms classroom shots by 28% on CTR",
        evidence: "First two test runs",
      },
    ],
    personas: [
      { id: "pers-aspiring-engineer-parent", name: "The Aspiring Engineer Parent" },
    ],
    collateral: [
      { name: "Foundation 9-10 — Curriculum.pdf", kind: "pdf", size: "8.4 MB" },
    ],
    memory: [
      {
        id: "m1",
        at: "2026-05-18",
        who: "Ankit Purohit",
        kind: "brief",
        summary: "Brief uploaded. Awaiting persona research from Spot.",
      },
    ],
    readiness: 0.42,
    accent: "#7C3AED",
    performance: {
      window: "Last 30 days",
      totalSpend: 188000,
      totalLeads: 286,
      verifiedLeads: 62,
      qualifiedLeads: 19,
      avgCpl: 657,
      costPerVerifiedLead: 3032,
      costPerQualifiedLead: 9895,
      verificationRate: 21.7,
      qualificationRate: 6.6,
      activeCampaigns: 1,
      health: "underperforming",
    },
    updatedAt: "2026-05-18",
  },
  {
    // Pre-baked Spoken English product · used in demos so Spot has a
    // fresh memory to walk through end-to-end. Status is "drafting" —
    // the product was just created, no campaigns running yet.
    id: "prod-guyjus-spoken-english",
    name: "Guyju's Spoken English",
    category: "EdTech · Adult Learning",
    client: "Guyju's",
    tagline:
      "Live cohort-based Spoken English program for working adults · 12-week curriculum with 1:1 mentor sessions and weekly real-world conversation labs.",
    brief: [
      { icon: "📅", label: "Duration", value: "12 weeks · cohort-led" },
      { icon: "👥", label: "Cohort size", value: "Capped at 40 · live small groups" },
      { icon: "🎙️", label: "Format", value: "4 live classes/week · 90 min · evenings IST" },
      { icon: "👨‍🏫", label: "Mentors", value: "12 mentors · CEFR-certified · 1:1 weekly" },
      { icon: "🗣️", label: "Practice labs", value: "Weekly real-world scenarios · interviews, presentations, calls" },
      { icon: "🎯", label: "Outcome", value: "B2 (upper-intermediate) fluency for working adults" },
      { icon: "🎞️", label: "Access", value: "All sessions recorded · 18 months access" },
    ],
    pricing: [
      { name: "12-week cohort", cost: "₹24,500", cadence: "one-shot", badge: "Most picked" },
      { name: "12-week · EMI", cost: "₹2,200", cadence: "/month · 12 months" },
      { name: "Intensive · 6 weeks", cost: "₹16,500", cadence: "one-shot · double pace" },
    ],
    offers: [
      { label: "Early-bird · 15% off", meta: "first 21 days" },
      { label: "Referral · ₹2K credit", meta: "stackable" },
      { label: "100% refund · first 14 days", meta: "no questions" },
      { label: "Free placement-assessment call", meta: "all leads" },
    ],
    usps: [
      "Small-cohort format (capped at 40) — real speaking time, not lecture format",
      "Mentor 1:1 every week · personalised pronunciation + grammar feedback",
      "Weekly real-world labs — practise interviews, presentations, work calls",
      "Built for working adults · evening slots, 18-month replay access",
    ],
    avoid: [
      "Don't promise specific job/salary outcomes · keep claims on fluency framing",
      "Avoid framing as 'easy' or 'no effort' — flagged as misleading by legal",
      "Skip comparisons to Duolingo / Babbel by name · competitive landscape varies by region",
    ],
    learnings: [
      {
        id: "l1",
        kind: "audience",
        summary: "Working professionals (24-35) convert 2.7× better than students on the same creative.",
        evidence: "First trial cohort · audience split test",
      },
      {
        id: "l2",
        kind: "creative",
        summary: "Real-world scenario hooks ('Job interview · live mock') beat generic 'speak fluently' by 38% CTR.",
        evidence: "Pre-launch creative tests · last 14 days",
      },
    ],
    personas: [
      { id: "pers-self-studier", name: "The Self-Studier" },
    ],
    collateral: [
      { name: "Spoken English · Curriculum overview.pdf", kind: "pdf", size: "5.2 MB" },
      { name: "Sample mentor session — 30 min.mp4", kind: "video", size: "92 MB" },
      { name: "Cohort schedule + sample week.pdf", kind: "pdf", size: "1.8 MB" },
    ],
    memory: [
      {
        id: "m1",
        at: "2026-05-28",
        who: "Spot",
        kind: "brief",
        summary:
          "Memory built from deep research · brand site, category benchmarks, audience graph. Saved USPs, pricing, offers, do-not-mention list.",
      },
      {
        id: "m2",
        at: "2026-05-28",
        who: "Spot",
        kind: "creative-feedback",
        summary:
          "Pre-launch test: real-world scenario hooks beat generic fluency framing by 38% CTR. Locking as primary direction.",
      },
      {
        id: "m3",
        at: "2026-05-28",
        who: "Ankit Purohit",
        kind: "constraint",
        summary:
          "Don't compare to Duolingo / Babbel by name in copy. Competitive landscape varies by region.",
      },
    ],
    readiness: 0.62,
    accent: "#C9A86A",
    performance: {
      window: "Last 7 days · pre-launch",
      totalSpend: 0,
      totalLeads: 0,
      verifiedLeads: 0,
      qualifiedLeads: 0,
      avgCpl: 0,
      costPerVerifiedLead: 0,
      costPerQualifiedLead: 0,
      verificationRate: 0,
      qualificationRate: 0,
      activeCampaigns: 0,
      health: "on-track",
    },
    updatedAt: "2026-05-28",
  },
];

export function readinessLabel(r: number): { label: string; tone: "ok" | "warn" | "info" } {
  if (r >= 0.8) return { label: "Memory complete", tone: "ok" };
  if (r >= 0.6) return { label: "Mostly briefed", tone: "info" };
  return { label: "Needs more research", tone: "warn" };
}

/**
 * Derive an actionable diagnosis for a product based on its perf
 * numbers. Drives the "what should the user do here?" chip + button
 * on the homepage. More useful than a generic "On track" / "Needs
 * attention" label because it names the action.
 */
export type ProductDiagnosis = {
  /** Short label for the diagnosis chip. */
  chip: string;
  /** Pill class for the chip tone. */
  tone: "ok" | "warn" | "err" | "info";
  /** Primary action label for the CTA button. */
  action: string;
  /** Which Spot workflow this action kicks off. The /spot welcome cards
   *  dispatch on this to the right start*Flow function. */
  flow: "scale" | "optimize" | "test-angles" | "launch";
  /** Free-text fallback if a caller wants to use askSpot() instead. */
  prompt: string;
};

export function diagnoseProduct(p: ProductSummary): ProductDiagnosis {
  const perf = p.performance;
  // Bucket thresholds — tuned for the mock ranges in this repo, not
  // production. Volume bucket below ~400 leads / 30d is "low"; CPL
  // above ₹500 is "high"; qual rate below 8% is "low".
  const lowVolume = perf.totalLeads < 400;
  const highCpl = perf.avgCpl > 500;
  const lowQual = perf.qualificationRate < 8;

  // Most actionable case first.
  if (lowVolume && highCpl) {
    return {
      chip: "Low volume · high CPL",
      tone: "err",
      action: "Test new angles",
      flow: "test-angles",
      prompt: `Diagnose ${p.name} — volume is low and CPL is high. Suggest new angles and personas to test.`,
    };
  }
  if (highCpl) {
    return {
      chip: "High CPL",
      tone: "warn",
      action: "Optimize campaigns",
      flow: "optimize",
      prompt: `Optimize ${p.name} — CPL is creeping up. Find ad sets to pause and reallocate.`,
    };
  }
  if (lowVolume) {
    return {
      chip: "Low volume",
      tone: "warn",
      action: "Scale spend",
      flow: "scale",
      prompt: `Scale ${p.name} — volume is low. Recommend budget lift and new placements.`,
    };
  }
  if (lowQual) {
    // "Refine targeting" lands in the Optimize flow — the root-cause
    // analysis there already covers audience / hook / landing-page
    // mismatches that drive low qualification.
    return {
      chip: "Low qualification",
      tone: "warn",
      action: "Refine targeting",
      flow: "optimize",
      prompt: `Refine targeting on ${p.name} — qualification rate is below 8%. Identify which cohort is leaking.`,
    };
  }
  // Healthy — green light to scale.
  return {
    chip: "Healthy",
    tone: "ok",
    action: "Scale with Spot",
    flow: "scale",
    prompt: `Scale ${p.name} — performance is healthy. Recommend the next budget tier + audience expansion.`,
  };
}
