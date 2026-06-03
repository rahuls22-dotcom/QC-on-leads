// Campaign-type taxonomy. Every media plan in this product is built from
// these four canonical Meta-playbook types, in this order:
//
//   1. Experiment   — broad audience + creative exploration
//   2. Scaling      — pour budget into proven winners
//   3. Cost / Bid cap — predictable CPL under a ceiling
//   4. Advantage+   — hand audience + placement to Meta's auto
//
// (The original prototype in chat-mode-handoff/.../campaign-types.jsx also
// listed Re-marketing as a fifth type. We deliberately drop it here per
// product direction — the four above are the standard structure.)

export type CampaignTypeId = "experiment" | "scaling" | "cost-cap" | "advantage-plus";

export type PersonaDraftSlim = {
  id: string;
  name: string;
};

export type PlannedAdSet = {
  id: string;
  name: string;
  audience: string;
  optimization: string;
  budgetDaily: number;
  /** Optional persona this ad set is anchored to. */
  personaId?: string;
};

export type CampaignType = {
  id: CampaignTypeId;
  name: string;
  short: string;
  tagline: string;
  description: string;
  accent: string;
  objective: string;
  bidStrategy: string;
  audienceWidth: "wide" | "narrow" | "auto";
  typicalAdSets: number;
  when: string;
  defaultAdSets: (personas: PersonaDraftSlim[]) => PlannedAdSet[];
};

const id = (prefix: string, i: number) =>
  `${prefix}-${Math.random().toString(36).slice(2, 6)}-${i}`;

export const CAMPAIGN_TYPES: CampaignType[] = [
  {
    id: "experiment",
    name: "Experiment campaign",
    short: "Experiment",
    tagline: "Test audiences, angles, and creatives broadly.",
    description:
      "Multiple ad sets, each with a different audience or creative thesis. Used to learn what converts before scaling.",
    accent: "#7C3AED",
    objective: "Lead generation",
    bidStrategy: "Lowest cost · no cap",
    audienceWidth: "wide",
    typicalAdSets: 4,
    when: "Every new project starts here.",
    defaultAdSets: (personas) => [
      {
        id: id("as-exp", 0),
        name: "Lookalike · approved buyers 1%",
        audience: personas[0]
          ? `LAL 1% of approved buyers · seeded by ${personas[0].name}`
          : "LAL 1% of approved buyers",
        optimization: "Verified leads",
        budgetDaily: 6000,
        personaId: personas[0]?.id,
      },
      {
        id: id("as-exp", 1),
        name: "Lookalike · approved buyers 2%",
        audience: personas[0]
          ? `LAL 2% of approved buyers · seeded by ${personas[0].name}`
          : "LAL 2% of approved buyers",
        optimization: "Verified leads",
        budgetDaily: 4000,
        personaId: personas[0]?.id,
      },
      {
        id: id("as-exp", 2),
        name: "Interest stack · category intent",
        audience:
          "Interest: Luxury real estate · category-adjacent professional groups · alumni networks",
        optimization: "Leads",
        budgetDaily: 4000,
      },
      {
        id: id("as-exp", 3),
        name: personas[1]
          ? `Custom · ${personas[1].name} mirror`
          : "Custom · secondary persona mirror",
        audience: personas[1]
          ? `Geo + demographic mirror of ${personas[1].name}`
          : "Geo + demographic mirror of secondary persona",
        optimization: "Verified leads",
        budgetDaily: 3000,
        personaId: personas[1]?.id,
      },
    ],
  },
  {
    id: "scaling",
    name: "Scaling campaign",
    short: "Scaling",
    tagline: "Scale spend on the audiences and creatives that already work.",
    description:
      "Mirrors the winning ad sets from Experiment at higher daily budget. No new audiences — only proven combinations.",
    accent: "#15803D",
    objective: "Lead generation",
    bidStrategy: "Lowest cost · no cap",
    audienceWidth: "wide",
    typicalAdSets: 2,
    when: "Light up after Experiment hits ₹10K+ spend with clear winners.",
    defaultAdSets: (personas) => [
      {
        id: id("as-sca", 0),
        name: "Top performer · proven LAL",
        audience:
          "Mirror of the winning Lookalike from Experiment — same seed, higher budget",
        optimization: "Verified leads",
        budgetDaily: 18000,
        personaId: personas[0]?.id,
      },
      {
        id: id("as-sca", 1),
        name: "Top performer · proven Interest",
        audience:
          "Mirror of the winning Interest stack from Experiment — same combination, higher budget",
        optimization: "Verified leads",
        budgetDaily: 12000,
      },
    ],
  },
  {
    id: "cost-cap",
    name: "Cost / Bid cap campaign",
    short: "Cost / Bid Cap",
    tagline: "Keep CPL under a hard ceiling — predictable cost per lead.",
    description:
      "Same audiences as Scaling but with a CPL ceiling enforced. Used when the team needs a known cost per lead even at the price of volume.",
    accent: "#1E5BFF",
    objective: "Lead generation",
    bidStrategy: "Cost cap · ₹950 CPL",
    audienceWidth: "wide",
    typicalAdSets: 2,
    when: "Run in parallel with Scaling once you have a known CPL target.",
    defaultAdSets: (personas) => [
      {
        id: id("as-cap", 0),
        name: "Proven LAL · cost cap ₹950",
        audience: "Mirror of winning LAL from Experiment",
        optimization: "Verified leads · cost cap ₹950",
        budgetDaily: 10000,
        personaId: personas[0]?.id,
      },
      {
        id: id("as-cap", 1),
        name: "Search · HNI Intent · cost cap ₹1,500",
        audience: "High-intent search keyword cluster · brand + locality terms",
        optimization: "Conversions · cost cap ₹1,500",
        budgetDaily: 8000,
      },
    ],
  },
  {
    id: "advantage-plus",
    name: "Advantage+ campaign",
    short: "Advantage+",
    tagline: "Hand audience + placement to Meta's auto-optimizer.",
    description:
      "Single Advantage+ ad set with the full creative library. Meta auto-discovers audience + placement. Works once you have enough creatives to feed it.",
    accent: "#C026D3",
    objective: "Lead generation",
    bidStrategy: "Lowest cost · no cap",
    audienceWidth: "auto",
    typicalAdSets: 1,
    when: "After an Advantage+ ad set inside Experiment beats your hand-built audiences by 15%+.",
    defaultAdSets: () => [
      {
        id: id("as-ap", 0),
        name: "Advantage+ · all creatives",
        audience:
          "Meta Advantage+ audience · auto-discovered across LAL + interest + behavior",
        optimization: "Verified leads · Advantage+ creative",
        budgetDaily: 14000,
      },
    ],
  },
];

export const CAMPAIGN_TYPE_BY_ID: Record<CampaignTypeId, CampaignType> = Object.fromEntries(
  CAMPAIGN_TYPES.map((c) => [c.id, c]),
) as Record<CampaignTypeId, CampaignType>;

/** Canonical order for media-plan rendering. */
export const CAMPAIGN_TYPE_ORDER: CampaignTypeId[] = [
  "experiment",
  "scaling",
  "cost-cap",
  "advantage-plus",
];
