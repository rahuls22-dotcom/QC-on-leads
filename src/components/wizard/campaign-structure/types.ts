import type { TargetingSelection } from "@/lib/targeting-options";

// Campaign
export type CampaignObjective = "awareness" | "traffic" | "engagement" | "leads" | "app_promotion" | "sales";
export type SpecialAdCategory = "credit" | "employment" | "housing" | "social_issues" | "none";
export type BidStrategy = "highest_volume" | "cost_per_result" | "bid_cap" | "roas_goal";

export interface CampaignSettings {
  name: string;
  objective: CampaignObjective;
  specialAdCategories: SpecialAdCategory[];
  cboEnabled: boolean;
  budget: number;
  budgetType: "daily" | "lifetime";
  bidStrategy: BidStrategy;
  targetCPA: number | null;
}

// Locations
export interface LocationEntry {
  id: string;
  name: string;
  type: "city" | "region" | "country";
  excluded?: boolean;
}

// Placements
export interface PlacementSelection {
  facebook: Record<string, boolean>;
  instagram: Record<string, boolean>;
  audienceNetwork: Record<string, boolean>;
  messenger: Record<string, boolean>;
}

// Ad Set
export interface AdCopy {
  id: string;
  name: string;
  primaryText: string;
  headline: string;
  description: string;
  urlParams: string;
  creativeName: string;
}

export interface AdSetState {
  id: string;
  name: string;
  instantFormId: string;
  budget: number;
  budgetType: "daily" | "lifetime";
  locations: LocationEntry[];
  ageMin: number;
  ageMax: number;
  gender: "all" | "male" | "female";
  detailedTargeting: TargetingSelection;
  advantagePlusAudience: boolean;
  advantagePlusPlacements: boolean;
  manualPlacements: PlacementSelection;
  ads: AdCopy[];
}

// Defaults
export const defaultCampaignSettings: CampaignSettings = {
  name: "Godrej Air Phase 3 — Lead Gen",
  objective: "leads",
  specialAdCategories: ["none"],
  cboEnabled: true,
  budget: 8000,
  budgetType: "daily",
  bidStrategy: "highest_volume",
  targetCPA: null,
};

export const defaultPlacements: PlacementSelection = {
  facebook: { feed: true, stories: true, reels: true, inStream: true, search: true, marketplace: true, rightColumn: true, videoFeeds: true },
  instagram: { feed: true, stories: true, reels: true, explore: true, exploreHome: true, profileFeed: true, search: true },
  audienceNetwork: { native: true, rewardedVideo: true },
  messenger: { inbox: true, stories: true },
};

// Mock forms
export const mockInstantForms = [
  { id: "form-1", name: "Godrej Air — High Intent" },
  { id: "form-2", name: "Godrej Reflections — Quick" },
  { id: "form-3", name: "Godrej Air — Brochure Download" },
];

// Mock locations for search
export const availableLocations: LocationEntry[] = [
  { id: "loc-1", name: "Bangalore", type: "city" },
  { id: "loc-2", name: "Mumbai", type: "city" },
  { id: "loc-3", name: "Delhi NCR", type: "city" },
  { id: "loc-4", name: "Hyderabad", type: "city" },
  { id: "loc-5", name: "Chennai", type: "city" },
  { id: "loc-6", name: "Pune", type: "city" },
  { id: "loc-7", name: "Kolkata", type: "city" },
  { id: "loc-8", name: "Ahmedabad", type: "city" },
  { id: "loc-9", name: "India", type: "country" },
  { id: "loc-10", name: "Karnataka", type: "region" },
  { id: "loc-11", name: "Maharashtra", type: "region" },
  { id: "loc-12", name: "Tamil Nadu", type: "region" },
  { id: "loc-13", name: "Whitefield, Bangalore", type: "city" },
  { id: "loc-14", name: "Sarjapur Road, Bangalore", type: "city" },
  { id: "loc-15", name: "Dubai", type: "city" },
  { id: "loc-16", name: "Singapore", type: "city" },
  { id: "loc-17", name: "San Francisco", type: "city" },
  { id: "loc-18", name: "London", type: "city" },
];

// AI-suggested audiences
export const suggestedAudiences = [
  { id: "sa-1", name: "Real Estate Investors 30-45", description: "IT professionals interested in property investment in Bangalore", size: "2.1M – 2.8M" },
  { id: "sa-2", name: "HNI Families Whitefield", description: "High-income families in Whitefield area looking to upgrade", size: "450K – 600K" },
  { id: "sa-3", name: "NRI Property Buyers", description: "Non-resident Indians interested in Bangalore real estate", size: "1.2M – 1.6M" },
];

// Placement groups for manual selection
export const placementGroups = [
  { platform: "Facebook", key: "facebook" as const, placements: [
    { key: "feed", label: "Feed" }, { key: "stories", label: "Stories" }, { key: "reels", label: "Reels" },
    { key: "inStream", label: "In-Stream Video" }, { key: "search", label: "Search Results" },
    { key: "marketplace", label: "Marketplace" }, { key: "rightColumn", label: "Right Column" }, { key: "videoFeeds", label: "Video Feeds" },
  ]},
  { platform: "Instagram", key: "instagram" as const, placements: [
    { key: "feed", label: "Feed" }, { key: "stories", label: "Stories" }, { key: "reels", label: "Reels" },
    { key: "explore", label: "Explore" }, { key: "exploreHome", label: "Explore Home" },
    { key: "profileFeed", label: "Profile Feed" }, { key: "search", label: "Search Results" },
  ]},
  { platform: "Audience Network", key: "audienceNetwork" as const, placements: [
    { key: "native", label: "Native, Banner & Interstitial" }, { key: "rewardedVideo", label: "Rewarded Video" },
  ]},
  { platform: "Messenger", key: "messenger" as const, placements: [
    { key: "inbox", label: "Inbox" }, { key: "stories", label: "Stories" },
  ]},
];

// Initial ad sets (from mock data)
export const initialAdSets: AdSetState[] = [
  {
    id: "as-1", name: "Whitefield HNI — 30-45", instantFormId: "form-1",
    budget: 3000, budgetType: "daily",
    locations: [{ id: "loc-13", name: "Whitefield, Bangalore", type: "city" }],
    ageMin: 30, ageMax: 45, gender: "all",
    detailedTargeting: { included: [], excluded: [], narrowing_groups: [] },
    advantagePlusAudience: true, advantagePlusPlacements: true,
    manualPlacements: { ...defaultPlacements } as PlacementSelection,
    ads: [
      { id: "ad-1a", name: "Lifestyle Upgrade — Carousel", creativeName: "Godrej Air 3BHK Carousel",
        primaryText: "🏡 Stop paying someone else's EMI — own your dream home in Whitefield.\n\nPremium 3BHK apartments, just 2 mins from the IT corridor. Smart homes with world-class amenities.\n\n📍 Book your free site visit this weekend.",
        headline: "Premium 3BHK in Whitefield — Starting ₹1.8Cr",
        description: "RERA registered. Smart home ready. 3-acre zen gardens. Book a site visit today.",
        urlParams: "utm_source=meta&utm_medium=paid&utm_campaign=godrej_air_p3&utm_content=lifestyle_carousel&utm_term=whitefield_hni" },
      { id: "ad-1b", name: "Lifestyle Upgrade — Video", creativeName: "Godrej Air Lifestyle Video",
        primaryText: "Your office is 2 minutes away. Your garden is right outside. Your kids' school is around the corner.\n\nThis isn't a dream — it's Godrej Air, Whitefield.\n\n🎯 Starting ₹1.8Cr | Limited Phase 3 units",
        headline: "2 Mins from IT Corridor — Godrej Air Whitefield",
        description: "Luxury 3BHK villas. Japanese-inspired architecture. Book a walkthrough.",
        urlParams: "utm_source=meta&utm_medium=paid&utm_campaign=godrej_air_p3&utm_content=lifestyle_video&utm_term=whitefield_hni" },
    ],
  },
  {
    id: "as-2", name: "NRI — Global", instantFormId: "form-1",
    budget: 3000, budgetType: "daily",
    locations: [{ id: "loc-15", name: "Dubai", type: "city" }, { id: "loc-16", name: "Singapore", type: "city" }, { id: "loc-17", name: "San Francisco", type: "city" }],
    ageMin: 35, ageMax: 55, gender: "all",
    detailedTargeting: { included: [], excluded: [], narrowing_groups: [] },
    advantagePlusAudience: true, advantagePlusPlacements: true,
    manualPlacements: { ...defaultPlacements } as PlacementSelection,
    ads: [
      { id: "ad-2a", name: "NRI Investment — Static", creativeName: "Godrej Air NRI Static",
        primaryText: "Your Bangalore investment, managed end-to-end while you're abroad.\n\nGodrej Air, Whitefield — RERA registered, 8%+ rental yield, fully managed property.\n\n📄 Get the NRI investment brochure →",
        headline: "Invest in Bangalore from Abroad — Godrej Air",
        description: "8%+ rental yield. Fully managed. RERA registered. NRI-friendly process.",
        urlParams: "utm_source=meta&utm_medium=paid&utm_campaign=godrej_air_p3&utm_content=nri_static&utm_term=nri_global" },
    ],
  },
  {
    id: "as-3", name: "Family Upgraders — Sarjapur", instantFormId: "form-2",
    budget: 2000, budgetType: "daily",
    locations: [{ id: "loc-14", name: "Sarjapur Road, Bangalore", type: "city" }, { id: "loc-13", name: "Whitefield, Bangalore", type: "city" }],
    ageMin: 35, ageMax: 45, gender: "all",
    detailedTargeting: { included: [], excluded: [], narrowing_groups: [] },
    advantagePlusAudience: true, advantagePlusPlacements: true,
    manualPlacements: { ...defaultPlacements } as PlacementSelection,
    ads: [
      { id: "ad-3a", name: "Family Living — Carousel", creativeName: "Godrej Air Family Carousel",
        primaryText: "Your kids deserve a garden, not a balcony.\n\nGodrej Air — spacious 3BHK with 3-acre zen gardens, swimming pool, and play area. Top schools within 5 km.\n\n🏡 See the 3BHK floor plans →",
        headline: "Upgrade to 3BHK — Godrej Air, Whitefield",
        description: "3-acre gardens. Swimming pool. Kids play area. Schools nearby. Starting ₹1.8Cr.",
        urlParams: "utm_source=meta&utm_medium=paid&utm_campaign=godrej_air_p3&utm_content=family_carousel&utm_term=sarjapur_families" },
    ],
  },
];

// Objective options for pills
export const objectiveOptions: { value: CampaignObjective; label: string }[] = [
  { value: "awareness", label: "Awareness" },
  { value: "traffic", label: "Traffic" },
  { value: "engagement", label: "Engagement" },
  { value: "leads", label: "Leads" },
  { value: "app_promotion", label: "App Promotion" },
  { value: "sales", label: "Sales" },
];

export const specialAdCategoryOptions: { value: SpecialAdCategory; label: string }[] = [
  { value: "none", label: "None" },
  { value: "credit", label: "Credit" },
  { value: "employment", label: "Employment" },
  { value: "housing", label: "Housing" },
  { value: "social_issues", label: "Social Issues" },
];

export const bidStrategyOptions: { value: BidStrategy; label: string }[] = [
  { value: "highest_volume", label: "Highest Volume" },
  { value: "cost_per_result", label: "Cost Per Result Goal" },
  { value: "bid_cap", label: "Bid Cap" },
  { value: "roas_goal", label: "ROAS Goal" },
];
