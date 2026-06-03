// Master brand data. One brand "Godrej Properties" inherited by all
// workspaces. Future: per-workspace overrides.

export type BrandColor = {
  name: string;
  role: "primary" | "ink" | "surface" | "accent" | "neutral";
  hex: string;
};

export type BrandFontSlot = {
  slot: "heading" | "body" | "tabular";
  family: string;
  sample: string;
};

export type BrandLogoVariant = {
  id: string;
  label: string;
  variant: "g-mark" | "stacked" | "wordmark";
  hint: string;
};

export type BrandReferenceAd = {
  id: string;
  format: string;
  note: string;
  hue: number;
};

export type Brand = {
  id: string;
  name: string;
  tagline: string;
  updated: string;
  isDefault: boolean;
  inheritedBy: number;
  voice: {
    is: string[];
    isNot: string[];
    rules: string[];
  };
  colors: BrandColor[];
  fonts: BrandFontSlot[];
  logos: BrandLogoVariant[];
  referenceAds: BrandReferenceAd[];
  compliance: {
    reraDisclaimer: string;
    rules: string[];
  };
};

export const GODREJ_BRAND: Brand = {
  id: "brand-godrej-properties",
  name: "Godrej Properties",
  tagline: "Building trust, every block of the way.",
  updated: "May 02, 2026",
  isDefault: true,
  inheritedBy: 5,
  voice: {
    is: ["Confident", "Specific", "Grounded in proof", "Family-led"],
    isNot: ["Aspirational-vague", "Discount-driven", "Investor-jargon-heavy", "Fear-led"],
  rules: [
      "Lead with proof, not promises (numbers, RERA, milestones)",
      "Reference the buyer's life, not the property's marble",
      "Avoid superlatives unless they're verifiable",
      "Never compare directly with named competitors",
      "Always end with a single, specific CTA",
    ],
  },
  colors: [
    { name: "Charcoal Ink", role: "ink", hex: "#0A0A0A" },
    { name: "Godrej Warm", role: "primary", hex: "#2A2620" },
    { name: "Gold Accent", role: "accent", hex: "#C9A86A" },
    { name: "Sand Cream", role: "surface", hex: "#E8E0C8" },
    { name: "Off White", role: "surface", hex: "#FAFAF8" },
    { name: "Neutral Grey", role: "neutral", hex: "#9B9B9B" },
  ],
  fonts: [
    {
      slot: "heading",
      family: "Geist · Variable",
      sample: "Lowest density in the micromarket",
    },
    {
      slot: "body",
      family: "Inter · 400/500",
      sample: "Branded Italian-marble interiors as standard, with sky-clubhouse on the 32nd floor.",
    },
    {
      slot: "tabular",
      family: "JetBrains Mono",
      sample: "₹2.4 – 3.8 Cr · 1,820 – 2,640 sq.ft · Possession Dec 2027",
    },
  ],
  logos: [
    { id: "lg-1", label: "G Mark · Primary", variant: "g-mark", hint: "App icon, favicon, small spaces" },
    { id: "lg-2", label: "G Mark · Inverted", variant: "g-mark", hint: "Dark surfaces" },
    { id: "lg-3", label: "Stacked", variant: "stacked", hint: "Square spaces, social profiles" },
    { id: "lg-4", label: "Wordmark", variant: "wordmark", hint: "Header, landing pages" },
  ],
  referenceAds: [
    { id: "ref-1", format: "1:1", note: "Lifestyle hero · Banerghatta", hue: 30 },
    { id: "ref-2", format: "9:16", note: "Reels · sky-clubhouse cut", hue: 220 },
    { id: "ref-3", format: "4:5", note: "School-zone carousel", hue: 145 },
    { id: "ref-4", format: "16:9", note: "Google Display · RERA trust", hue: 280 },
  ],
  compliance: {
    reraDisclaimer:
      "All projects are RERA-registered. RERA numbers are displayed on each project page. By submitting your details you agree to be contacted by Godrej Properties about this project.",
    rules: [
      "RERA number must appear on every creative",
      "No claims about return-on-investment in copy",
      "Floor plans shown must match approved building plans",
      "All photography must be marked CGI or REAL — never ambiguous",
    ],
  },
};

export function getBrand(_id?: string): Brand {
  return GODREJ_BRAND;
}
