// Rich project model used by the new Chat-Mode project pages.
// Mirrors the prototype's PROJECT_DETAILS shape (project-data.jsx + v2 merge).
//
// The older `campaign-data.ts` continues to back legacy pages — this file is
// the new source of truth for `/projects` and `/projects/[id]`.

// ─── Types ──────────────────────────────────────────────────────────────

export type ProjectSummary = {
  id: string;
  name: string;
  category: string;
  status: "active" | "paused" | "completed";
  health: "on-track" | "needs-attention" | "underperforming";
};

export type ProjectGoal = {
  kind: "leads" | "verified" | "qualified";
  target: number;
  achieved: number;
  window: string;
  daysTotal: number;
  daysElapsed: number;
  pace: "ahead" | "on-pace" | "behind";
  paceDelta: string;
  forecast: number;
  spotRead: string;
};

export type SecondaryMetric = {
  label: string;
  value: number | string;
  sub: string;
  primary?: boolean;
};

export type BriefAttachment = { name: string; size: string; kind: "pdf" | "video" | "deck" };

export type ProjectBrief = {
  updated: string;
  summary: string;
  usp: string[];
  avoid: string[];
  attachments: BriefAttachment[];
};

export type Creative = {
  id: string;
  format: "1:1" | "4:5" | "9:16" | "16:9";
  surface: string;
  platform: "Meta" | "Google";
  kind: "image" | "video" | "carousel";
  spend: number | null;
  impressions: number | null;
  leads: number | null;
  verified: number | null;
  qualified: number | null;
  ctr: number | null;
  cvr: number | null;
  cpl: number | null;
  cpvl: number | null;
  cpql: number | null;
  hookRate?: number;
  holdRate?: number;
  tag?: "winner" | "loser" | null;
  note?: string;
};

export type Angle = {
  id: string;
  name: string;
  status: "live" | "draft";
  hook: string;
  cta: string;
  concept: {
    hue: number;
    layout: "hero" | "split" | "type-led" | "floorplan";
    note?: string;
    creatives: Creative[];
  };
};

export type Persona = {
  id: string;
  name: string;
  age: number;
  role: string;
  share: number; // % pipeline contribution
  approved: boolean;
  draft?: boolean;
  oneLiner: string;
  want: string;
  painPoint: string;
  usp: string;
  demographics: string[];
  motivations: string[];
  objections: string[];
  channels: string[];
  verifiedLeads: number;
  cpvl: string;
  spotNote?: string;
  angles: Angle[];
};

export type ProjectStrategy = {
  updated: string;
  tone: { is: string[]; isNot: string[] };
  visualSystem: { palette: string[]; principles: string[] };
  proofPoints: string[];
};

export type MediaAd = {
  id: string;
  name: string;
  personaId: string;
  angleIdx: number;
  status: "live" | "draft";
  spend: number | null;
  leads: number | null;
  cpl: number | null;
  tag?: "winner" | "loser" | null;
};

export type MediaAdSet = {
  id: string;
  name: string;
  audience: string;
  optimization: string;
  budgetDaily: number;
  expLeads: number;
  expVerified: number;
  cpvl: number | null;
  status: "live" | "paused" | "proposed" | "draft";
  spotChange: string | null;
  ads: MediaAd[];
};

export type MediaRow = {
  id: string;
  channel: "Meta" | "Google";
  campaign: string;
  personaId: string;
  budgetDaily: number;
  expLeads: number;
  expVerified: number;
  cpvl: number | null;
  status: "live" | "paused" | "proposed" | "draft";
  spotChange: string | null;
  adSets: MediaAdSet[];
  /** Optional voice/WhatsApp agent attached to this campaign. */
  agentId?: string;
  agentName?: string;
};

export type MediaPlan = {
  window: string;
  version: string;
  proposedDelta: string;
  rows: MediaRow[];
  summary: {
    liveDaily: number;
    proposedDaily: number;
    weeklyExpected: { leads: number; verified: number };
    gapToGoal: string;
  };
};

export type Experiment = {
  id: string;
  name: string;
  hypothesis: string;
  status: "running" | "proposed" | "concluded";
  startedOn: string | null;
  endsOn: string | null;
  primaryMetric: string;
  variants: Array<{ label: string; spend?: number | null; leads?: number | null; cpl?: number | null; ctr?: string; verifRate?: string }>;
  progress: number;
  readout: string;
  decision: string | null;
  owner: string;
};

export type ProjectImage = {
  id: string;
  kind: "exterior" | "interior" | "amenity" | "floorplan" | "location";
  name: string;
  hue: number;
  tags: string[];
  usedIn: number;
};

export type ProjectDetail = ProjectSummary & {
  workspaceId: string;
  rera: string;
  micromarket: string;
  typology: string;
  priceBand: string;
  sizeBand: string;
  possession: string;
  inventory: string;
  builder: string;
  launchedOn: string;
  brandId: string;
  brief: ProjectBrief;
  goal: ProjectGoal;
  secondary: SecondaryMetric[];
  personas: Persona[];
  strategy: ProjectStrategy;
  mediaPlan: MediaPlan;
  experiments: Experiment[];
  images: ProjectImage[];
};

// ─── Helpers ──────────────────────────────────────────────────────────

function cr(
  format: Creative["format"],
  surface: string,
  platform: Creative["platform"],
  kind: Creative["kind"],
  spend: number | null,
  leads: number | null,
  verified: number | null,
  qualified: number | null,
  metrics: Partial<Pick<Creative, "ctr" | "cvr" | "hookRate" | "holdRate" | "tag" | "note" | "impressions">> = {},
): Creative {
  const cpl = spend !== null && leads ? Math.round(spend / leads) : null;
  const cpvl = spend !== null && verified ? Math.round(spend / verified) : null;
  const cpql = spend !== null && qualified ? Math.round(spend / qualified) : null;
  return {
    id: `cr-${Math.random().toString(36).slice(2, 8)}`,
    format,
    surface,
    platform,
    kind,
    spend,
    impressions: metrics.impressions ?? (spend !== null ? Math.round(spend * 18) : null),
    leads,
    verified,
    qualified,
    ctr: metrics.ctr ?? null,
    cvr: metrics.cvr ?? null,
    cpl,
    cpvl,
    cpql,
    hookRate: metrics.hookRate,
    holdRate: metrics.holdRate,
    tag: metrics.tag ?? null,
    note: metrics.note,
  };
}

// ─── Seed: Godrej Banerghatta (flagship, behind goal) ──────────────────

const ARISTOCRAT: ProjectDetail = {
  id: "godrej-banerghatta",
  workspaceId: "ws-south",
  name: "Godrej Banerghatta · Bangalore South",
  category: "Luxury Residential",
  status: "active",
  health: "needs-attention",
  rera: "PRM/KA/RERA/1251/446/PR/180125/002841",
  micromarket: "Banerghatta Road · Bangalore South",
  typology: "3 & 4 BHK Luxury Apartments",
  priceBand: "₹2.4 – 3.8 Cr",
  sizeBand: "1,820 – 2,640 sq.ft",
  possession: "Dec 2027",
  inventory: "4 towers · 432 units · 38% sold",
  builder: "Godrej Properties",
  launchedOn: "Feb 12, 2026",
  brandId: "brand-godrej-properties",

  brief: {
    updated: "Apr 22, 2026",
    summary:
      "A sky-luxury offering positioned for tech-lead families upgrading from their first home. The story leans on **lowest density in micromarket**, branded interiors, and 12-minute access to KR Puram Metro.",
    usp: [
      "Branded Italian-marble interiors as standard",
      "Sky-clubhouse on the 32nd floor of each tower",
      "300m from ITPL Gate 4 · 12 min from KR Puram metro",
      "Lowest density in micromarket — 132 units per tower",
    ],
    avoid: [
      "Investor-only framing (qualified lead rate halves)",
      "Mid-segment lookalike audiences in Bengaluru",
      "Discount-led creative — dilutes positioning",
    ],
    attachments: [
      { name: "Banerghatta — Brand Book.pdf", size: "8.2 MB", kind: "pdf" },
      { name: "Floor plans — Tower A,B,C,D.pdf", size: "12.4 MB", kind: "pdf" },
      { name: "Site visit reel.mp4", size: "84 MB", kind: "video" },
    ],
  },

  goal: {
    kind: "verified",
    target: 320,
    achieved: 127,
    window: "Feb 12 → Jun 30, 2026",
    daysTotal: 139,
    daysElapsed: 92,
    pace: "behind",
    paceDelta: "−21%",
    forecast: 248,
    spotRead:
      "On current trajectory you'll land at **248 / 320** by Jun 30. To close the gap, the BLR South Lookalike audience has to recover OR you take ₹60K/week from Kukatpally. I can model both.",
  },

  secondary: [
    { label: "Total leads", value: 318, sub: "no target" },
    { label: "Verified leads", value: 127, sub: "of 320 target", primary: true },
    { label: "Qualified leads", value: 27, sub: "no target" },
    { label: "Spend to date", value: "₹14.6L", sub: "of ₹38L budget" },
  ],

  personas: [
    {
      id: "p1",
      name: "The Tech-Lead Upgrader",
      age: 36,
      role: "Senior IT Director, FAANG-tier",
      share: 38,
      approved: true,
      oneLiner: "32–42 senior engineer/director at FAANG-tier company in Bengaluru East.",
      want:
        "A larger floorplate in the same Whitefield catchment — proximity to ITPL, better school zone, more square-footage for the family.",
      painPoint:
        "Currently in a ₹1.6Cr 3 BHK that's outgrown the family. Doesn't want to commute further; doesn't want to compromise on amenities.",
      usp:
        "Branded Italian-marble interiors as standard, lowest-density tower in the micromarket.",
      demographics: ["32–42", "HHI ₹65L+", "Owns 1 home (₹1.5–2Cr)", "Whitefield / Marathahalli"],
      motivations: ["Status upgrade tied to job level", "Better school zones for kids 5–10", "Larger floorplate for WFH + family"],
      objections: ["EMI vs liquidity for ESOP exit", "Possession timeline vs current rental lease end"],
      channels: ["Meta · Lookalike from existing buyers", "Google · 'Whitefield 3 BHK luxury'", "LinkedIn · Senior IC titles"],
      verifiedLeads: 58,
      cpvl: "₹5,420",
      angles: [
        {
          id: "a-p1-1",
          name: "Lifestyle Upgrade",
          status: "live",
          hook: "Stop renting in Whitefield. Own the floorplate your family needs.",
          cta: "Book a site visit",
          concept: {
            hue: 30,
            layout: "hero",
            note: "Family in 3BHK living room · ITPL skyline through window",
            creatives: [
              cr("1:1", "Meta Feed", "Meta", "image", 48000, 52, 11, 4, { ctr: 1.92, cvr: 21.2, tag: "winner", note: "Highest qual rate" }),
              cr("9:16", "Meta Reels", "Meta", "video", 32000, 41, 8, 2, { ctr: 2.4, hookRate: 48, holdRate: 32 }),
              cr("16:9", "Google Display", "Google", "image", 18000, 19, 3, 1, { ctr: 0.9 }),
            ],
          },
        },
        {
          id: "a-p1-2",
          name: "School-Zone Story",
          status: "live",
          hook: "VIBGYOR, Greenwood, Inventure — all within 3km.",
          cta: "See the school radius",
          concept: {
            hue: 200,
            layout: "split",
            creatives: [
              cr("4:5", "Meta Feed", "Meta", "carousel", 22000, 28, 6, 2, { ctr: 1.6, cvr: 21.4 }),
            ],
          },
        },
        {
          id: "a-p1-3",
          name: "Sky-Clubhouse",
          status: "draft",
          hook: "32 floors up. The clubhouse you'd build if you could.",
          cta: "Walk the 32nd floor",
          concept: { hue: 280, layout: "hero", creatives: [] },
        },
      ],
    },
    {
      id: "p2",
      name: "The NRI Investor",
      age: 44,
      role: "Director, US tech / consulting",
      share: 22,
      approved: true,
      oneLiner: "Indian-origin, US-based; wants a second home in Bengaluru with eventual return optionality.",
      want: "A primary-quality asset that can rent at premium and become a return home in 5–8 years.",
      painPoint: "Buys remotely; needs trust signals (RERA, builder reputation, verifiable photos).",
      usp: "RERA-cleared, Godrej-built, with a documented 8-week site-visit-anytime policy.",
      demographics: ["38–48", "HHI ₹2Cr+ (US)", "Holds 2+ properties in India already", "Bay Area / Seattle / NJ"],
      motivations: ["Hedge against rupee", "Eventual move-back asset", "Status in extended family"],
      objections: ["Construction risk remote", "Property management cost", "FX exposure"],
      channels: ["Meta · NRI lookalike (US)", "Google · 'Bengaluru luxury apartment NRI'"],
      verifiedLeads: 31,
      cpvl: "₹7,840",
      angles: [
        {
          id: "a-p2-1",
          name: "RERA Trust",
          status: "live",
          hook: "Every floor RERA-cleared. Every milestone time-stamped.",
          cta: "View compliance pack",
          concept: {
            hue: 220,
            layout: "type-led",
            creatives: [
              cr("1:1", "Meta Feed", "Meta", "image", 38000, 22, 7, 3, { ctr: 1.4, cvr: 31.8, tag: "winner" }),
            ],
          },
        },
        {
          id: "a-p2-2",
          name: "Return-Home Asset",
          status: "live",
          hook: "When you do move back, you want it ready.",
          cta: "Lock 3BHK with terrace",
          concept: { hue: 30, layout: "hero", creatives: [
            cr("16:9", "Google Display", "Google", "image", 21000, 12, 4, 1, { ctr: 0.7 }),
          ] },
        },
      ],
    },
    {
      id: "p3",
      name: "The Senior Banker",
      age: 49,
      role: "MD / VP at investment bank",
      share: 18,
      approved: true,
      oneLiner: "Senior Mumbai/BLR banker with kids in college, looking for a downsizer-luxury 3BHK.",
      want: "A smaller, branded apartment with great amenities — kids are leaving for college soon.",
      painPoint: "Has the budget; wants prestige and zero maintenance hassle.",
      usp: "Lowest density per tower, 1:1 servicing, branded everything.",
      demographics: ["46–54", "HHI ₹1.5Cr+", "Owns 2+ properties", "South BLR / SoBo"],
      motivations: ["Prestige amenity", "Empty-nester comfort", "Brand reassurance"],
      objections: ["Locality vs SoBo", "Resale liquidity"],
      channels: ["LinkedIn · Banking titles", "Meta · Wealth-tier audiences"],
      verifiedLeads: 24,
      cpvl: "₹8,200",
      angles: [
        {
          id: "a-p3-1",
          name: "Quiet Prestige",
          status: "live",
          hook: "132 families per tower. Not a number you compromise on.",
          cta: "Reserve a 4BHK",
          concept: {
            hue: 340,
            layout: "split",
            creatives: [
              cr("1:1", "Meta Feed", "Meta", "image", 28000, 14, 5, 2, { ctr: 1.2, cvr: 35.7 }),
            ],
          },
        },
      ],
    },
    {
      id: "p4",
      name: "The Returning Founder",
      age: 39,
      role: "Founder / CXO, sold a company",
      share: 12,
      approved: false,
      draft: true,
      oneLiner: "Recent exit, looking for a primary home in BLR with status signal.",
      want: "A primary residence that signals 'arrived' — without going overboard.",
      painPoint: "Doesn't want SoBo prices. Wants the right address in BLR.",
      usp: "Branded interiors, 12-min metro access, low density.",
      demographics: ["35–44", "HHI ₹3Cr+", "Recent liquidity event"],
      motivations: ["Status anchor post-exit", "Family stability"],
      objections: ["Newer/comparable launches in Hebbal/Sarjapur"],
      channels: ["LinkedIn · Founder titles", "Meta · HNI custom audience"],
      verifiedLeads: 14,
      cpvl: "₹9,100",
      spotNote:
        "Drafted from your last 4 weeks of leads — 11 of 27 qualified buyers matched this profile and aren't represented in your existing personas. **Recommend approving and running a 10-day pilot.**",
      angles: [
        {
          id: "a-p4-1",
          name: "Arrival Story",
          status: "draft",
          hook: "You built it. Live in it.",
          cta: "Visit the 32nd floor",
          concept: { hue: 280, layout: "hero", creatives: [] },
        },
      ],
    },
  ],

  strategy: {
    updated: "Apr 18, 2026",
    tone: {
      is: ["Confident", "Specific", "Grounded in proof"],
      isNot: ["Aspirational-vague", "Discount-driven", "Investor-jargon-heavy"],
    },
    visualSystem: {
      palette: ["#0A0A0A", "#E8E0C8", "#C9A86A", "#FAFAF8", "#2A2620", "#F5F5F5"],
      principles: [
        "Real photography over CGI for amenities (verified leads 1.4× when authentic)",
        "Wide-angle floorplate shots beat balcony-view shots in qualification",
        "Avoid skyline composites — flagged in brand audit",
      ],
    },
    proofPoints: [
      "38% sold in 10 weeks",
      "Cleared RERA Phase-1 funding milestone",
      "Recognized 'Best Luxury Launch 2026' — Realty+ Awards",
    ],
  },

  mediaPlan: {
    window: "Week of May 12 → May 18",
    version: "v7 · updated 2d ago by Spot",
    proposedDelta: "+₹14K/wk reallocation",
    rows: [
      {
        id: "m1",
        channel: "Meta",
        campaign: "Banerghatta · LeadGen · BLR South Lookalike",
        personaId: "p1",
        budgetDaily: 26000,
        expLeads: 32,
        expVerified: 5,
        cpvl: 5200,
        status: "live",
        spotChange: null,
        agentId: "agent-qualifier",
        agentName: "Lead Qualifier",
        adSets: [
          {
            id: "as-m1-a",
            name: "BLR South Lookalike · 1%",
            audience: "LAL 1% of approved buyers · BLR East · 32-48",
            optimization: "Lowest cost · Verified leads",
            budgetDaily: 14000,
            expLeads: 18,
            expVerified: 3.0,
            cpvl: 4667,
            status: "live",
            spotChange: null,
            ads: [
              { id: "ad-m1-a1", name: "Lifestyle Upgrade · 1:1", personaId: "p1", angleIdx: 0, status: "live", spend: 48000, leads: 52, cpl: 923, tag: "winner" },
              { id: "ad-m1-a2", name: "Lifestyle Upgrade · 9:16", personaId: "p1", angleIdx: 0, status: "live", spend: 32000, leads: 41, cpl: 780 },
            ],
          },
          {
            id: "as-m1-b",
            name: "BLR South Lookalike · 2%",
            audience: "LAL 2% of approved buyers · BLR East · 32-48",
            optimization: "Lowest cost · Verified leads",
            budgetDaily: 12000,
            expLeads: 14,
            expVerified: 2.0,
            cpvl: 6000,
            status: "live",
            spotChange: "Pause — CPL +44% this week",
            ads: [
              { id: "ad-m1-b1", name: "School-Zone · 4:5", personaId: "p1", angleIdx: 1, status: "live", spend: 22000, leads: 17, cpl: 1294 },
            ],
          },
        ],
      },
      {
        id: "m2",
        channel: "Google",
        campaign: "Banerghatta · Search · 'Whitefield Luxury 3BHK'",
        personaId: "p1",
        budgetDaily: 18000,
        expLeads: 22,
        expVerified: 4,
        cpvl: 4500,
        status: "live",
        spotChange: null,
        adSets: [
          {
            id: "as-m2-a",
            name: "Brand + Locality keywords",
            audience: "Bengaluru East · search intent",
            optimization: "tROAS",
            budgetDaily: 18000,
            expLeads: 22,
            expVerified: 4,
            cpvl: 4500,
            status: "live",
            spotChange: null,
            ads: [
              { id: "ad-m2-a1", name: "RTA + sitelinks", personaId: "p1", angleIdx: 0, status: "live", spend: 21000, leads: 12, cpl: 1750 },
            ],
          },
        ],
      },
      {
        id: "m3",
        channel: "Meta",
        campaign: "Banerghatta · LeadGen · NRI US",
        personaId: "p2",
        budgetDaily: 14000,
        expLeads: 8,
        expVerified: 2,
        cpvl: 7000,
        status: "live",
        spotChange: null,
        agentId: "agent-site-visit",
        agentName: "Site-Visit Booker",
        adSets: [
          {
            id: "as-m3-a",
            name: "NRI · US · LAL",
            audience: "LAL of NRI buyers · US/Canada · 38-52",
            optimization: "Verified leads",
            budgetDaily: 14000,
            expLeads: 8,
            expVerified: 2,
            cpvl: 7000,
            status: "live",
            spotChange: null,
            ads: [
              { id: "ad-m3-a1", name: "RERA Trust · 1:1", personaId: "p2", angleIdx: 0, status: "live", spend: 38000, leads: 22, cpl: 1727, tag: "winner" },
            ],
          },
        ],
      },
      {
        id: "m4",
        channel: "Meta",
        campaign: "Banerghatta · Experiment · Founder Persona",
        personaId: "p4",
        budgetDaily: 0,
        expLeads: 0,
        expVerified: 0,
        cpvl: null,
        status: "proposed",
        spotChange: "Pilot 10 days · ₹5K/day",
        adSets: [
          {
            id: "as-m4-a",
            name: "Founder LAL · BLR HNI",
            audience: "LAL of recent founders · BLR · 35-44",
            optimization: "Verified leads",
            budgetDaily: 5000,
            expLeads: 4,
            expVerified: 1,
            cpvl: 5000,
            status: "proposed",
            spotChange: "New pilot",
            ads: [],
          },
        ],
      },
    ],
    summary: {
      liveDaily: 58000,
      proposedDaily: 63000,
      weeklyExpected: { leads: 406, verified: 80 },
      gapToGoal: "+12 verified vs pace · still −10 to land at 320",
    },
  },

  experiments: [
    {
      id: "x1",
      name: "Frequency cap on BLR South Lookalike",
      hypothesis: "Capping frequency at 2.4 on the BLR South Lookalike audience will recover CTR without losing reach.",
      status: "running",
      startedOn: "May 7, 2026",
      endsOn: "May 21, 2026",
      primaryMetric: "CPL",
      variants: [
        { label: "Control · uncapped", spend: 38000, leads: 38, cpl: 1000, ctr: "1.42%" },
        { label: "Variant · cap 2.4", spend: 36000, leads: 44, cpl: 818, ctr: "1.81%" },
      ],
      progress: 0.5,
      readout:
        "Variant is **18% cheaper** with no reach drop. Confidence 86%. Three days left to declare.",
      decision: null,
      owner: "Spot",
    },
    {
      id: "x2",
      name: "School-zone hook vs Lifestyle hook",
      hypothesis: "School-zone hook will convert qualified-rate higher among 32-42 audience.",
      status: "concluded",
      startedOn: "Apr 12, 2026",
      endsOn: "Apr 26, 2026",
      primaryMetric: "Qualification rate",
      variants: [
        { label: "Lifestyle hook", spend: 56000, leads: 62, cpl: 903, verifRate: "18.1%" },
        { label: "School-zone hook", spend: 54000, leads: 51, cpl: 1058, verifRate: "23.5%" },
      ],
      progress: 1,
      readout:
        "School-zone hook produced **30% higher** qualification rate at +17% CPL. Kept both running, weighted 60/40 to school-zone.",
      decision: "Applied · Apr 28",
      owner: "You",
    },
    {
      id: "x3",
      name: "Reels-first vs Feed-first creative mix",
      hypothesis: "Leading with 9:16 Reels variants will lift hook rate.",
      status: "proposed",
      startedOn: null,
      endsOn: null,
      primaryMetric: "Hook rate",
      variants: [
        { label: "Feed-first (current)" },
        { label: "Reels-first" },
      ],
      progress: 0,
      readout:
        "Spot drafted this from your last 30 days — Reels creatives index 1.4× on hook rate but only 0.8× on lead-rate. Worth 7-day pilot.",
      decision: null,
      owner: "Spot",
    },
  ],

  images: [
    { id: "img-1", kind: "exterior", name: "Tower B at dusk", hue: 25, tags: ["dusk", "tower"], usedIn: 4 },
    { id: "img-2", kind: "interior", name: "3BHK living room", hue: 35, tags: ["living"], usedIn: 6 },
    { id: "img-3", kind: "amenity", name: "Sky-clubhouse pool", hue: 200, tags: ["pool", "rooftop"], usedIn: 3 },
    { id: "img-4", kind: "floorplan", name: "Tower A · 3BHK floor plan", hue: 0, tags: ["floorplan"], usedIn: 2 },
    { id: "img-5", kind: "location", name: "ITPL Gate 4 · 300m", hue: 145, tags: ["location"], usedIn: 1 },
  ],
};

// ─── Seed: Godrej Kukatpally (underperforming — slim) ────────────────────

const SPLENDOUR: ProjectDetail = {
  id: "godrej-kukatpally",
  workspaceId: "ws-south",
  name: "Godrej Kukatpally · Hyderabad",
  category: "Mid-segment Residential",
  status: "active",
  health: "underperforming",
  rera: "PRM/TS/RERA/1251/446/PR/210925/004127",
  micromarket: "Kukatpally · Hyderabad West",
  typology: "2 & 3 BHK Apartments",
  priceBand: "₹85L – 1.4 Cr",
  sizeBand: "1,120 – 1,640 sq.ft",
  possession: "Jun 2027",
  inventory: "3 towers · 264 units · 14% sold",
  builder: "Godrej Properties",
  launchedOn: "Sep 20, 2025",
  brandId: "brand-godrej-properties",

  brief: {
    updated: "Apr 02, 2026",
    summary:
      "Mid-segment offering targeted at young Whitefield-area tech workers. **Lead volume is fine; qualification rate has been flat at 2% for 21 days.** The audience is reaching us but can't afford the price band.",
    usp: [
      "Same Whitefield catchment at 60% of Banerghatta's price",
      "Connectivity to ITPL via dedicated shuttle",
      "Smart-home ready, all units",
    ],
    avoid: ["Direct comparison with Banerghatta", "Aspirational-luxury framing"],
    attachments: [
      { name: "Kukatpally — Brand Brief.pdf", size: "5.4 MB", kind: "pdf" },
    ],
  },

  goal: {
    kind: "verified",
    target: 200,
    achieved: 38,
    window: "Sep 20, 2025 → Jul 31, 2026",
    daysTotal: 314,
    daysElapsed: 238,
    pace: "behind",
    paceDelta: "−56%",
    forecast: 64,
    spotRead:
      "Lead volume is healthy (1,240) but only **3% qualify** — the audience can't afford the price band. Recommend testing a **shift to first-time-buyer messaging at lower ticket sizes**, or pausing and re-thinking the offer.",
  },

  secondary: [
    { label: "Total leads", value: 1240, sub: "no target" },
    { label: "Verified leads", value: 38, sub: "of 200 target", primary: true },
    { label: "Qualified leads", value: 22, sub: "no target" },
    { label: "Spend to date", value: "₹11.2L", sub: "of ₹22L budget" },
  ],

  personas: [
    {
      id: "sp1",
      name: "The First-Time Buyer",
      age: 30,
      role: "Mid-level IT engineer",
      share: 70,
      approved: true,
      oneLiner: "28–34 IT engineer at non-FAANG company in Bengaluru, first-time home buyer.",
      want: "First home with good Whitefield connectivity at an affordable EMI.",
      painPoint: "Stretched on EMI. Wants minimum 2 BHK but budget for 1 BHK in better localities.",
      usp: "Smart-home ready, dedicated ITPL shuttle, Godrej brand at this price.",
      demographics: ["28–34", "HHI ₹18–28L", "First-time buyer", "Rents in BLR East"],
      motivations: ["Stop paying rent", "Build long-term equity", "Brand assurance"],
      objections: ["Affordability", "Connectivity post-shuttle expiry"],
      channels: ["Meta · Interest-based BLR IT", "Google · 'Whitefield 2BHK budget'"],
      verifiedLeads: 28,
      cpvl: "₹6,800",
      angles: [
        {
          id: "a-sp1-1",
          name: "Whitefield Address, FTB Price",
          status: "live",
          hook: "Whitefield. Smart-home. Owned, not rented.",
          cta: "See 2BHK starting prices",
          concept: {
            hue: 145,
            layout: "split",
            creatives: [
              cr("1:1", "Meta Feed", "Meta", "image", 38000, 220, 14, 5, { ctr: 1.1, cvr: 6.4, tag: "loser", note: "High volume, very low qualification" }),
            ],
          },
        },
      ],
    },
    {
      id: "sp2",
      name: "The Affordable Investor",
      age: 38,
      role: "Mid-size business owner",
      share: 25,
      approved: false,
      draft: true,
      oneLiner: "BLR-based owner looking for a second property at sub-1.5Cr.",
      want: "An affordable 2nd property in a growing micromarket for rental + appreciation.",
      painPoint: "Kukatpally's rental yield isn't visible; positioning leans 'home', not 'investment'.",
      usp: "ITPL micromarket appreciation + smart-home wiring + Godrej trust.",
      demographics: ["35–45", "HHI ₹40L+", "Owns 1 home", "BLR / Chennai"],
      motivations: ["Rental yield", "Brand-led appreciation"],
      objections: ["Yield calculation not shown", "Resale velocity"],
      channels: ["Meta · Investor lookalike", "LinkedIn · SMB owners"],
      verifiedLeads: 6,
      cpvl: "₹9,400",
      spotNote:
        "**Recommend approving and testing.** Last week's 27 qualified buyers map cleanly onto this persona — there's room here, but you're not actively selling to them.",
      angles: [],
    },
  ],

  strategy: {
    updated: "Mar 14, 2026",
    tone: {
      is: ["Direct", "Practical", "Numbers-led"],
      isNot: ["Aspirational", "Luxury-aligned", "Discount-led"],
    },
    visualSystem: {
      palette: ["#0A0A0A", "#15803D", "#FAFAF8", "#2A2620"],
      principles: [
        "Lead with floor plans and price",
        "Show real shuttle/connectivity proof",
      ],
    },
    proofPoints: [
      "14% sold in 6 months",
      "Dedicated ITPL shuttle running daily",
    ],
  },

  mediaPlan: {
    window: "Week of May 12 → May 18",
    version: "v3 · updated 5d ago",
    proposedDelta: "−₹20K/wk consolidation",
    rows: [
      {
        id: "ms1",
        channel: "Meta",
        campaign: "Kukatpally · LeadGen · BLR IT Interest",
        personaId: "sp1",
        budgetDaily: 14000,
        expLeads: 80,
        expVerified: 2.5,
        cpvl: 5600,
        status: "live",
        spotChange: "Pause — 3% qualification rate flat for 21 days",
        adSets: [],
      },
    ],
    summary: {
      liveDaily: 14000,
      proposedDaily: 8000,
      weeklyExpected: { leads: 560, verified: 18 },
      gapToGoal: "−4 verified vs pace · forecast 64 / 200",
    },
  },

  experiments: [
    {
      id: "xs1",
      name: "Switch to 1BHK creative",
      hypothesis: "Leading with a smaller, more affordable unit increases qualification rate among genuine first-time buyers.",
      status: "proposed",
      startedOn: null,
      endsOn: null,
      primaryMetric: "Qualification rate",
      variants: [
        { label: "Current · 2BHK hero" },
        { label: "Variant · 1BHK price hero" },
      ],
      progress: 0,
      readout:
        "Spot drafted this — your lead volume is fine but they can't afford 2BHK. **Worth a 10-day pilot at ₹3K/day.**",
      decision: null,
      owner: "Spot",
    },
  ],

  images: [
    { id: "img-s1", kind: "exterior", name: "Tower facade · golden hour", hue: 35, tags: ["facade"], usedIn: 2 },
    { id: "img-s2", kind: "interior", name: "2BHK kitchen", hue: 145, tags: ["kitchen"], usedIn: 1 },
    { id: "img-s3", kind: "amenity", name: "Lawn + play area", hue: 110, tags: ["lawn"], usedIn: 1 },
  ],
};

// ─── Thin entries for other workspaces (no rich personas/angles yet) ──

const ARDEN: ProjectDetail = {
  id: "godrej-arden",
  workspaceId: "ws-ncr",
  name: "Godrej Arden · Gurugram",
  category: "Premium Residential",
  status: "active",
  health: "on-track",
  rera: "PRM/HR/RERA/PMTL/4127/280/PR/220825",
  micromarket: "Sector 80 · Gurugram",
  typology: "3 & 4 BHK Premium Apartments",
  priceBand: "₹1.8 – 2.6 Cr",
  sizeBand: "1,520 – 2,180 sq.ft",
  possession: "Sep 2027",
  inventory: "5 towers · 580 units · 52% sold",
  builder: "Godrej Properties",
  launchedOn: "Apr 4, 2025",
  brandId: "brand-godrej-properties",
  brief: {
    updated: "May 02, 2026",
    summary:
      "Premium NCR offering for the dual-income tech executive family. Lead with **Cyber-City connectivity** and the school cluster.",
    usp: [
      "8 min to Cyber-City via Dwarka Expressway",
      "Walking-distance to Heritage Xperiential school",
      "Lowest density tower in Sector 80",
    ],
    avoid: ["Investor framing", "Comparison with Whitefield"],
    attachments: [{ name: "Arden — Brand Book.pdf", size: "7.4 MB", kind: "pdf" }],
  },
  goal: {
    kind: "verified",
    target: 280,
    achieved: 184,
    window: "Apr 4, 2025 → Mar 31, 2026",
    daysTotal: 362,
    daysElapsed: 312,
    pace: "on-pace",
    paceDelta: "+2%",
    forecast: 268,
    spotRead:
      "**On track** to land at 268 / 280 by Mar 31. Verified leads are flat over 14d; CTR is holding. Hold the plan.",
  },
  secondary: [
    { label: "Total leads", value: 1480, sub: "no target" },
    { label: "Verified leads", value: 184, sub: "of 280 target", primary: true },
    { label: "Qualified leads", value: 62, sub: "no target" },
    { label: "Spend to date", value: "₹26.4L", sub: "of ₹32L budget" },
  ],
  personas: [],
  strategy: {
    updated: "Mar 18, 2026",
    tone: { is: ["Confident", "Family-led", "Connectivity-first"], isNot: ["Discount-led", "Investor-jargon"] },
    visualSystem: { palette: ["#0A0A0A", "#2A2620", "#C9A86A", "#FAFAF8"], principles: ["Real family imagery", "Show school cluster on map"] },
    proofPoints: ["52% sold in 14 months", "RERA-cleared milestones"],
  },
  mediaPlan: {
    window: "Week of May 12 → May 18",
    version: "v4 · stable",
    proposedDelta: "no changes",
    rows: [],
    summary: { liveDaily: 22000, proposedDaily: 22000, weeklyExpected: { leads: 580, verified: 92 }, gapToGoal: "+0 verified vs pace" },
  },
  experiments: [],
  images: [
    { id: "img-a1", kind: "exterior", name: "Tower facade", hue: 25, tags: ["facade"], usedIn: 4 },
    { id: "img-a2", kind: "location", name: "School cluster map", hue: 145, tags: ["location"], usedIn: 2 },
  ],
};

const RESERVE: ProjectDetail = {
  id: "godrej-reserve",
  workspaceId: "ws-mmr",
  name: "Godrej Reserve · Thane",
  category: "Premium Residential",
  status: "active",
  health: "on-track",
  rera: "PRM/MH/RERA/MUMB/4127/280/PR/210525",
  micromarket: "Kandivali East · Thane",
  typology: "2 & 3 BHK Apartments",
  priceBand: "₹1.4 – 2.1 Cr",
  sizeBand: "1,180 – 1,720 sq.ft",
  possession: "Dec 2027",
  inventory: "6 towers · 720 units · 41% sold",
  builder: "Godrej Properties",
  launchedOn: "May 18, 2025",
  brandId: "brand-godrej-properties",
  brief: {
    updated: "Apr 28, 2026",
    summary:
      "Premium MMR offering on the Western suburbs. Lead with **forest-edge** and Mumbai-vs-Thane price arbitrage.",
    usp: ["Backs onto Sanjay Gandhi National Park", "10 min to Borivali station", "Italian-marble interiors as standard"],
    avoid: ["Direct Mumbai price comparisons", "Investor framing"],
    attachments: [{ name: "Reserve — Brand Brief.pdf", size: "6.1 MB", kind: "pdf" }],
  },
  goal: {
    kind: "verified",
    target: 360,
    achieved: 218,
    window: "May 18, 2025 → Jun 30, 2026",
    daysTotal: 408,
    daysElapsed: 365,
    pace: "on-pace",
    paceDelta: "+4%",
    forecast: 352,
    spotRead:
      "Holding pace — projected 352 / 360 by Jun 30. The forest-edge hook is your winner; lookalike audiences are still cheap.",
  },
  secondary: [
    { label: "Total leads", value: 2140, sub: "no target" },
    { label: "Verified leads", value: 218, sub: "of 360 target", primary: true },
    { label: "Qualified leads", value: 71, sub: "no target" },
    { label: "Spend to date", value: "₹38.2L", sub: "of ₹46L budget" },
  ],
  personas: [],
  strategy: {
    updated: "Mar 22, 2026",
    tone: { is: ["Calm", "Premium", "Specific"], isNot: ["Hype-led", "Discount-led"] },
    visualSystem: { palette: ["#0A0A0A", "#15803D", "#C9A86A", "#FAFAF8"], principles: ["Real forest photography", "Avoid CGI skyline composites"] },
    proofPoints: ["41% sold in 12 months", "Recognized 'Best Premium Launch 2025' — MMR"],
  },
  mediaPlan: {
    window: "Week of May 12 → May 18",
    version: "v6 · steady",
    proposedDelta: "no changes",
    rows: [],
    summary: { liveDaily: 32000, proposedDaily: 32000, weeklyExpected: { leads: 720, verified: 124 }, gapToGoal: "+2 verified vs pace" },
  },
  experiments: [],
  images: [
    { id: "img-r1", kind: "exterior", name: "Tower with forest backdrop", hue: 145, tags: ["forest", "facade"], usedIn: 6 },
  ],
};

const VARANYA: ProjectDetail = {
  id: "godrej-varanya",
  workspaceId: "ws-mmr",
  name: "Godrej Varanya · Pune",
  category: "Luxury Residential",
  status: "active",
  health: "needs-attention",
  rera: "PRM/MH/RERA/PUNE/4127/280/PR/090125",
  micromarket: "Kharadi · Pune East",
  typology: "3 & 4 BHK Luxury",
  priceBand: "₹2.2 – 3.4 Cr",
  sizeBand: "1,840 – 2,520 sq.ft",
  possession: "Mar 2028",
  inventory: "4 towers · 384 units · 18% sold",
  builder: "Godrej Properties",
  launchedOn: "Jan 9, 2026",
  brandId: "brand-godrej-properties",
  brief: {
    updated: "Apr 10, 2026",
    summary:
      "Luxury Pune launch targeting senior tech leads at the Hinjewadi/Kharadi tech corridor. **Brand-led trust** is the wedge.",
    usp: ["Branded interiors standard", "14 min to Hinjewadi", "Lowest density per tower"],
    avoid: ["NRI framing (no NRI brief yet)", "Discount-led copy"],
    attachments: [{ name: "Varanya — Brand Book.pdf", size: "9.1 MB", kind: "pdf" }],
  },
  goal: {
    kind: "verified",
    target: 240,
    achieved: 64,
    window: "Jan 9 → Aug 31, 2026",
    daysTotal: 235,
    daysElapsed: 128,
    pace: "behind",
    paceDelta: "−18%",
    forecast: 184,
    spotRead:
      "Behind pace · projected 184 / 240. CTR is healthy but verified rate dropped 4pp. **Suggest tightening lookalike audience** OR shifting ₹50K/wk into Search.",
  },
  secondary: [
    { label: "Total leads", value: 412, sub: "no target" },
    { label: "Verified leads", value: 64, sub: "of 240 target", primary: true },
    { label: "Qualified leads", value: 18, sub: "no target" },
    { label: "Spend to date", value: "₹9.4L", sub: "of ₹28L budget" },
  ],
  personas: [],
  strategy: {
    updated: "Apr 12, 2026",
    tone: { is: ["Specific", "Confident", "Numbers-led"], isNot: ["Discount-led", "Investor-jargon"] },
    visualSystem: { palette: ["#0A0A0A", "#2A2620", "#C9A86A", "#FAFAF8"], principles: ["Real photography", "Show tech-park proximity"] },
    proofPoints: ["18% sold in 4 months"],
  },
  mediaPlan: {
    window: "Week of May 12 → May 18",
    version: "v3 · attention",
    proposedDelta: "+₹50K/wk to Search",
    rows: [],
    summary: { liveDaily: 18000, proposedDaily: 25000, weeklyExpected: { leads: 84, verified: 14 }, gapToGoal: "−6 verified vs pace · projected 184 / 240" },
  },
  experiments: [],
  images: [
    { id: "img-v1", kind: "exterior", name: "Tower at golden hour", hue: 35, tags: ["facade"], usedIn: 2 },
  ],
};

// ─── Public API ─────────────────────────────────────────────────────────

export const projectDetails: Record<string, ProjectDetail> = {
  [ARISTOCRAT.id]: ARISTOCRAT,
  [SPLENDOUR.id]: SPLENDOUR,
  [ARDEN.id]: ARDEN,
  [RESERVE.id]: RESERVE,
  [VARANYA.id]: VARANYA,
};

export const projectsList: ProjectSummary[] = Object.values(projectDetails).map(
  ({ id, name, category, status, health }) => ({ id, name, category, status, health }),
);

/**
 * Runtime store for projects created through the in-app flow. Lives in
 * module memory only — refreshing the page resets it. Reads merge with
 * the static seed data.
 */
const runtimeProjects: Map<string, ProjectDetail> = new Map();

export function addRuntimeProject(p: ProjectDetail): void {
  runtimeProjects.set(p.id, p);
}

export function mutateRuntimeProject(id: string, mutator: (p: ProjectDetail) => void): void {
  const p = runtimeProjects.get(id);
  if (p) mutator(p);
}

export function getProject(id: string): ProjectDetail | undefined {
  return runtimeProjects.get(id) || projectDetails[id];
}

/** Projects scoped to a workspace, or all if `workspaceId` is undefined / "all". */
export function projectsForWorkspace(workspaceId?: string): ProjectDetail[] {
  const all = [...Object.values(projectDetails), ...runtimeProjects.values()];
  if (!workspaceId || workspaceId === "all") {
    return all;
  }
  return all.filter((p) => p.workspaceId === workspaceId);
}

/**
 * Legacy /campaigns data uses `proj-1..proj-4` IDs (defined in
 * `campaign-data.ts`). The new workspace concept only lives on the
 * project-data shape. This map bridges the two so we can filter the
 * legacy campaigns list by current workspace scope.
 *
 * proj-1 = Whitefield Luxury Villas → Godrej South (Bengaluru)
 * proj-2 = Godrej Air Phase 3       → Godrej NCR  (Noida)
 * proj-3 = Godrej Eternity          → Godrej MMR  (Pune-MMR cluster)
 * proj-4 = Godrej Summit            → Godrej South
 */
export const LEGACY_PROJECT_WORKSPACE: Record<string, string> = {
  "proj-1": "ws-south",
  "proj-2": "ws-ncr",
  "proj-3": "ws-mmr",
  "proj-4": "ws-south",
};

/** Resolve a workspaceId for a legacy campaign by walking project link. */
export function workspaceIdForLegacyProject(projectId: string | null | undefined): string | null {
  if (!projectId) return null;
  return LEGACY_PROJECT_WORKSPACE[projectId] || null;
}

/** Rollup metrics for the projects-list table. */
export function projectRollup(id: string) {
  const d = getProject(id);
  if (!d) return null;
  const spendStr =
    d.secondary.find((s) => s.label === "Spend to date")?.value?.toString() ||
    "—";
  const totalLeads = Number(d.secondary.find((s) => s.label === "Total leads")?.value || 0);
  const verifiedLeads = Number(d.secondary.find((s) => s.label === "Verified leads")?.value || 0);
  const qualifiedLeads = Number(d.secondary.find((s) => s.label === "Qualified leads")?.value || 0);
  const verifRate = totalLeads ? (verifiedLeads / totalLeads) * 100 : null;
  const qualRate = totalLeads ? (qualifiedLeads / totalLeads) * 100 : null;
  return {
    spend: spendStr,
    totalLeads,
    verifiedLeads,
    qualifiedLeads,
    verifRate,
    qualRate,
    goal: d.goal,
  };
}
