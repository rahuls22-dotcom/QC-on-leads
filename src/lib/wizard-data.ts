// Campaign creation wizard mock data

export const existingClients = [
  "Godrej Properties",
  "Godrej Ananda",
  "Puravankara",
  "Tata Housing",
];

export const industries = [
  "Real Estate",
  "EdTech",
  "InsurTech",
  "FinTech",
  "Healthcare",
  "SaaS",
  "E-commerce",
  "Hospitality",
  "Automotive",
  "Other",
];

export const cities = [
  "Bangalore",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
];

export const languages = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Marathi"];

export const qualityPreferences = [
  { value: "volume", label: "Volume — Maximize lead count" },
  { value: "balanced", label: "Balanced — Mix of volume and quality" },
  { value: "quality", label: "Quality — Fewer but highly qualified leads" },
];

// Step 2 — Business Profile (AI-extracted)
export const extractedProfile = {
  builderName: "Godrej Properties Group",
  projectName: "Godrej Air",
  city: "Bangalore",
  industry: "Real Estate",
  geography: "Whitefield, East Bangalore",
  offerSummary:
    "Premium 3 & 4 BHK apartments starting ₹1.8Cr in Whitefield. Phase 3 launch with exclusive pre-launch pricing. RERA approved. Possession by Dec 2027.",
  pricePositioning: "Premium (₹1.8Cr – ₹3.5Cr)",
  positioning: "Premium lifestyle apartments for modern professionals in East Bangalore's fastest-growing tech corridor",
  coreUSPs: [
    "Japanese-inspired architecture",
    "2 mins from ITPL & Whitefield Metro",
    "IGBC Gold pre-certified",
  ],
  keyBenefits: [
    "Japanese-inspired architecture with zen gardens",
    "3-acre central landscaped deck",
    "2 mins from ITPL & Whitefield Metro",
    "Club house with infinity pool, co-working spaces",
    "Smart home automation in every unit",
    "IGBC Gold pre-certified",
  ],
  proofPoints: [
    "1200+ happy families across 8 projects",
    "RERA: PRM/KA/RERA/1251/310/PR/171015/001457",
    "Godrej Properties ranked #1 in customer satisfaction — Track2Realty 2025",
  ],
  primaryObjections: [
    "Price seems high for Whitefield micro-market",
    "Possession timeline is 2+ years away",
    "Traffic congestion in Whitefield area",
  ],
  assumptions: [
    "Target audience: IT professionals, 28-45, HHI > ₹25L",
    "Primary decision driver: location proximity to ITPL",
    "Budget range of audience: ₹1.5Cr - ₹3Cr",
  ],
  specialAdCategory: "housing",
};

// Step 3 — Strategy
export const strategyData = {
  campaignStrategy: {
    objective: "Lead Generation via Meta Lead Ads",
    optimization: "Optimize for lead quality using Meta Conversions API",
    placements: "Facebook Feed, Instagram Feed, Instagram Stories, Reels",
    principles: [
      "Lead with lifestyle and aspiration, not just floor plans",
      "Use social proof and scarcity to drive urgency",
      "Segment by intent level — separate warm and cold audiences",
      "Test 3 creative angles per persona in first week",
    ],
  },
  adSets: [
    {
      id: "as-1",
      name: "Whitefield HNI — 30-45",
      description: "High-net-worth IT professionals near Whitefield who can afford premium apartments",
      targeting: {
        geo: "Whitefield, ITPL, Marathahalli, Kundalahalli — 10km radius",
        audience: "Age 30-45, IT professionals, income > ₹25L, interested in luxury living",
        exclusions: "Existing Godrej leads, converted customers",
      },
    },
    {
      id: "as-2",
      name: "Sarjapur IT Corridor",
      description: "IT professionals along Sarjapur road corridor looking to move to East Bangalore",
      targeting: {
        geo: "Sarjapur Road, HSR Layout, Bellandur, Haralur — 8km radius",
        audience: "Age 28-42, IT professionals, recently engaged or married, home loan pre-approved",
        exclusions: "Existing leads from past 30 days",
      },
    },
    {
      id: "as-3",
      name: "Broad Bangalore — 25-55",
      description: "Wider Bangalore audience for brand awareness and top-of-funnel lead capture",
      targeting: {
        geo: "Bangalore city — 25km radius from MG Road",
        audience: "Age 25-55, interested in real estate, property investment, home buying",
        exclusions: "Existing leads, low-intent audiences",
      },
    },
  ],
  personas: [
    {
      id: "p-1",
      name: "Rahul",
      age: 34,
      role: "Senior IT Professional, Works at a Top Tech Company",
      bullets: [
        "Currently renting a 2BHK near Whitefield and tired of paying rent with no ownership.",
        "Wants a home close to work with modern amenities and good connectivity.",
        "Values smart home features and community living — budget is flexible up to ₹2.5Cr.",
      ],
    },
    {
      id: "p-2",
      name: "Meera",
      age: 42,
      role: "NRI Investor, Based in San Francisco",
      bullets: [
        "Looking for an investment property in Bangalore with strong rental yield and appreciation.",
        "Wants a trusted builder with RERA registration and transparent pricing.",
        "Needs end-to-end property management since she can't visit frequently — willing to pay premium for hassle-free ownership.",
      ],
    },
    {
      id: "p-3",
      name: "Suresh",
      age: 38,
      role: "Business Owner, Family of 4 Upgrading from 2BHK",
      bullets: [
        "Kids are growing up and need more space — current 2BHK feels cramped.",
        "Wife wants a gated community with good amenities, swimming pool, and play area.",
        "Budget up to ₹3Cr, prefers Whitefield/Sarjapur area for proximity to schools.",
      ],
    },
  ],
  creatives: {
    staticIdeas: [
      {
        id: "cr-1",
        name: "Hero Lifestyle Shot",
        persona: "The IT Professional",
        visual: "Aerial drone shot of the project with the green deck visible, ITPL towers in background, golden hour lighting",
        text: "Your office is 2 minutes away. Your home should feel like a resort. Godrej Air — Premium 3 & 4 BHK from ₹1.8Cr",
      },
      {
        id: "cr-2",
        name: "Price Anchor Carousel",
        persona: "The Upgrader Family",
        visual: "4-slide carousel: (1) Kitchen interior (2) Kids play area (3) Pool deck (4) Floor plan with pricing",
        text: "Phase 3 exclusive pricing won't last. 3 BHK from ₹1.8Cr — only 42 units in this release.",
      },
      {
        id: "cr-3",
        name: "Social Proof Testimonial",
        persona: "The NRI Investor",
        visual: "Video testimonial thumbnail of an existing Godrej homeowner with quote overlay",
        text: "1200+ families chose Godrej. Here's why Rajesh from San Francisco invested in Godrej Air Phase 2.",
      },
    ],
    videoScripts: [
      {
        id: "vs-1",
        name: "60s Lifestyle Walkthrough",
        scenes: [
          { timestamp: "0-5s", description: "Drone approaching the project through tree-lined avenue" },
          { timestamp: "5-15s", description: "Walking through the zen garden, water features" },
          { timestamp: "15-25s", description: "Interior shots — living room, kitchen, master bedroom" },
          { timestamp: "25-35s", description: "Amenities montage — pool, gym, co-working, kids area" },
          { timestamp: "35-50s", description: "Couple on balcony at sunset, Whitefield skyline visible" },
          { timestamp: "50-60s", description: "Logo, pricing, CTA: 'Book your site visit'" },
        ],
      },
    ],
    primaryTexts: [
      "Your office is 2 mins from ITPL. Your home should feel like a Japanese retreat. Godrej Air Phase 3 — Premium 3 & 4 BHK from ₹1.8Cr. Book your exclusive site visit today.",
      "1200+ families trust Godrej. Phase 3 of Godrej Air in Whitefield is now open. Japanese-inspired architecture, 3-acre zen gardens, smart homes. Starting ₹1.8Cr. Limited units.",
      "Stop commuting 2 hours to live in a box. Godrej Air is 2 mins from ITPL — premium 3BHK apartments with zen gardens, infinity pool, and co-working spaces. From ₹1.8Cr.",
      "Phase 3 exclusive: Only 42 units at pre-launch pricing. Godrej Air, Whitefield — RERA approved, IGBC Gold certified. 3 & 4 BHK from ₹1.8Cr. Register now.",
      "Your family deserves a 3-acre garden, not a 300 sqft balcony. Upgrade to Godrej Air — Whitefield's most premium address. Starting ₹1.8Cr. Possession Dec 2027.",
    ],
    headlines: [
      "Premium 3BHK from ₹1.8Cr",
      "2 Mins from ITPL, Whitefield",
      "Phase 3 Pre-Launch Pricing",
      "Japanese-Inspired Zen Living",
      "Only 42 Units Available",
    ],
    descriptions: [
      "RERA Approved | IGBC Gold | Godrej Air Whitefield",
      "3-Acre Zen Gardens | Smart Homes | Book Site Visit",
      "1200+ Happy Families | Trusted Builder Since 2006",
      "Infinity Pool | Co-Working | Near ITPL & Metro",
      "Exclusive Pre-Launch Offer | Register Today",
    ],
  },
  forms: [
    {
      id: "form-1",
      name: "High Intent Lead Form",
      intent: "High",
      headline: "Book Your Exclusive Site Visit",
      greeting: "Thank you for your interest in Godrej Air! Our team will reach out within 2 hours to schedule your private site visit.",
      bullets: [
        "Get exclusive Phase 3 pricing",
        "Virtual & in-person site visits available",
        "Talk to our property advisor",
      ],
      questions: [
        "What is your budget range?",
        "Preferred configuration? (2BHK / 3BHK / 4BHK)",
        "When are you planning to purchase?",
        "Your current location in Bangalore?",
      ],
    },
    {
      id: "form-2",
      name: "Quick Inquiry Form",
      intent: "Medium",
      headline: "Get Godrej Air Phase 3 Brochure",
      greeting: "Download the detailed brochure with floor plans, pricing, and amenities.",
      bullets: [
        "Detailed floor plans for all configurations",
        "Complete pricing sheet",
        "Amenity highlights and specifications",
      ],
      questions: [
        "What is your budget range?",
        "Preferred configuration?",
      ],
    },
  ],
  budgetForecast: {
    goalLeads: 200,
    cplRange: { min: 800, max: 1200 },
    dailyBudget: 8000,
  },
  scalingPlan: [
    { phase: "Day 1-3", action: "Launch all 3 ad sets with 3 creatives each at ₹5K/day. Monitor CTR and CPL." },
    { phase: "Day 4-7", action: "Kill underperforming creatives (CTR < 1%). Scale winning ad set to ₹8K/day." },
    { phase: "Day 8-14", action: "Introduce lookalike audiences from verified leads. Target ₹10K/day total spend." },
  ],
  guardrails: [
    "Pause any ad set with CPL > ₹1,500 for 3 consecutive days",
    "Alert if daily spend exceeds ₹12,000",
    "Auto-pause creatives with CTR < 0.5% after 1000 impressions",
    "Weekly review of lead quality with sales team",
  ],
};

// Step 4 — Launch
export const adAccounts = [
  { id: "act-1", name: "Godrej Properties — Primary (act_1234567890)" },
  { id: "act-2", name: "Godrej Properties — Backup (act_0987654321)" },
];

export const facebookPages = [
  { id: "pg-1", name: "Godrej Properties Official (109284756301)" },
  { id: "pg-2", name: "Bangalore Property Deals (109284756302)" },
];

// Metric chart data for Analysis tab improvement
export interface AnalysisChartDataPoint {
  date: string;
  cpl: number;
  leads: number;
  verifiedLeads: number;
  spend: number;
  qualifiedLeads: number;
  ctr: number;
  target: number;
}

export const analysisChartData: AnalysisChartDataPoint[] = [
  { date: "Feb 20", cpl: 1450, leads: 18, verifiedLeads: 3, spend: 26100, qualifiedLeads: 1, ctr: 1.2, target: 1200 },
  { date: "Feb 24", cpl: 1380, leads: 22, verifiedLeads: 4, spend: 30360, qualifiedLeads: 2, ctr: 1.4, target: 1200 },
  { date: "Feb 28", cpl: 1320, leads: 24, verifiedLeads: 5, spend: 31680, qualifiedLeads: 3, ctr: 1.6, target: 1200 },
  { date: "Mar 4", cpl: 1280, leads: 26, verifiedLeads: 6, spend: 33280, qualifiedLeads: 3, ctr: 1.7, target: 1200 },
  { date: "Mar 8", cpl: 1250, leads: 24, verifiedLeads: 5, spend: 30000, qualifiedLeads: 3, ctr: 1.8, target: 1200 },
  { date: "Mar 12", cpl: 1190, leads: 28, verifiedLeads: 7, spend: 33320, qualifiedLeads: 4, ctr: 2.0, target: 1200 },
  { date: "Mar 16", cpl: 1210, leads: 22, verifiedLeads: 5, spend: 26620, qualifiedLeads: 3, ctr: 1.9, target: 1200 },
  { date: "Mar 20", cpl: 1183, leads: 22, verifiedLeads: 7, spend: 26026, qualifiedLeads: 3, ctr: 2.1, target: 1200 },
];

export const chartMetricOptions = [
  { key: "cpl", label: "CPL", color: "#1A1A1A", format: "currency" },
  { key: "leads", label: "Leads", color: "#3B82F6", format: "number" },
  { key: "verifiedLeads", label: "Verified Leads", color: "#22C55E", format: "number" },
  { key: "spend", label: "Spend", color: "#F5A623", format: "currency" },
  { key: "qualifiedLeads", label: "Qualified Leads", color: "#8B5CF6", format: "number" },
  { key: "ctr", label: "CTR %", color: "#EC4899", format: "percent" },
] as const;

// ─── Creative Angles (per persona) ──────────────────────────────────

export const angleData = [
  {
    id: "angle-1",
    personaId: "p-1",
    personaName: "Rahul, 34",
    painPoint: "Tired of paying rent with no ownership, long daily commute to Whitefield office",
    usp: "Premium 3BHK just 2 mins from Whitefield IT corridor, smart home ready with modern amenities",
    hook: "Stop paying someone else's EMI — own your dream home in Whitefield",
    cta: "Book a free site visit this weekend",
    angleName: "Lifestyle Upgrade",
  },
  {
    id: "angle-2",
    personaId: "p-2",
    personaName: "Meera, 42",
    painPoint: "Managing investment property from abroad is a hassle, worried about builder trustworthiness",
    usp: "RERA-registered Godrej property with 8%+ rental yield, end-to-end property management included",
    hook: "Your Bangalore investment, managed end-to-end while you're abroad",
    cta: "Get the NRI investment brochure",
    angleName: "Investment Returns",
  },
  {
    id: "angle-3",
    personaId: "p-3",
    personaName: "Suresh, 38",
    painPoint: "Kids are growing up and need more space, current 2BHK feels cramped for family of 4",
    usp: "Spacious 3BHK with 3-acre zen gardens, swimming pool, play area, and top schools nearby",
    hook: "Your kids deserve a garden, not a balcony — upgrade to Godrej Air",
    cta: "See the 3BHK floor plans",
    angleName: "Family-First Living",
  },
];

// ─── Form Field Presets ─────────────────────────────────────────────

export interface FormField {
  id: string;
  name: string;
  type: "text" | "phone" | "email" | "dropdown" | "custom";
  required: boolean;
  enabled: boolean;
  options?: string[];
  placeholder?: string;
}

export const highIntentFormFields: FormField[] = [
  { id: "ff-1", name: "Full Name", type: "text", required: true, enabled: true, placeholder: "Enter your full name" },
  { id: "ff-2", name: "Phone", type: "phone", required: true, enabled: true, placeholder: "+91 XXXXX XXXXX" },
  { id: "ff-3", name: "Email", type: "email", required: false, enabled: true, placeholder: "your@email.com" },
  { id: "ff-4", name: "Budget Range", type: "dropdown", required: true, enabled: true, options: ["Below ₹1Cr", "₹1Cr – ₹2Cr", "₹2Cr – ₹3Cr", "Above ₹3Cr"] },
  { id: "ff-5", name: "Purchase Timeline", type: "dropdown", required: true, enabled: true, options: ["Within 3 months", "3–6 months", "6–12 months", "12+ months"] },
  { id: "ff-6", name: "Preferred Configuration", type: "dropdown", required: false, enabled: true, options: ["2 BHK", "3 BHK", "4 BHK", "Villa", "Plot"] },
];

export const quickInquiryFormFields: FormField[] = [
  { id: "ff-1", name: "Full Name", type: "text", required: true, enabled: true, placeholder: "Enter your full name" },
  { id: "ff-2", name: "Phone", type: "phone", required: true, enabled: true, placeholder: "+91 XXXXX XXXXX" },
  { id: "ff-3", name: "Email", type: "email", required: false, enabled: false, placeholder: "your@email.com" },
];

// ─── Campaign Structure Mock Data ───────────────────────────────────

export const campaignStructureData = {
  campaignName: "Godrej Air Phase 3 — Lead Gen",
  adSets: [
    {
      id: "as-1",
      name: "Whitefield HNI — 30-45",
      persona: "Rahul, 34 (IT Professional)",
      targeting: { geo: "Whitefield, Bangalore (10km)", audience: "IT professionals, 30-45, income 20L+", interests: "Home buying, Real estate, Premium living" },
      dailyBudget: 3000,
      assignedCreatives: ["Lifestyle Upgrade creative"],
      assignedForm: "High Intent Form",
    },
    {
      id: "as-2",
      name: "NRI — Global",
      persona: "Meera, 42 (NRI Investor)",
      targeting: { geo: "San Francisco, Dubai, Singapore, London", audience: "NRIs, 35-55, India connection", interests: "Property investment, NRI services, Bangalore real estate" },
      dailyBudget: 3000,
      assignedCreatives: ["Investment Returns creative"],
      assignedForm: "High Intent Form",
    },
    {
      id: "as-3",
      name: "Family Upgraders — Sarjapur/Whitefield",
      persona: "Suresh, 38 (Family Upgrader)",
      targeting: { geo: "Sarjapur Road, Whitefield, Bangalore (15km)", audience: "Families, 35-45, existing homeowners", interests: "Family living, Schools, Kids activities, Home upgrade" },
      dailyBudget: 2000,
      assignedCreatives: ["Family-First Living creative"],
      assignedForm: "Quick Inquiry Form",
    },
  ],
  totalDailyBudget: 8000,
  estimatedCPL: { min: 800, max: 1200 },
  estimatedLeadsPerDay: 7,
};
