/**
 * Tiny built-in image library used as a stand-in for real uploads.
 *
 * The mock pills (Project Image / Reference Ad / Brand Logo) show a small
 * popover of these samples. Each sample is rendered as a styled CSS tile —
 * no real asset on disk — so the project stays self-contained.
 */

export interface ImageSample {
  id: string;
  name: string;
  /** Renders the visual content of the tile (sized by parent). */
  render: () => React.ReactNode;
}

/** Project (property) images — exterior, interior, aerial-style mocks. */
export const PROJECT_IMAGES: ImageSample[] = [
  {
    id: "proj-exterior",
    name: "godrej-air-exterior.jpg",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-[#3B5DAE] via-[#5C7BC9] to-[#A8B9D8] flex items-end p-2">
        <div className="text-white text-[8px] font-semibold leading-tight">
          <div className="opacity-80">GODREJ AIR</div>
          <div className="mt-0.5 opacity-60">Tower Façade</div>
        </div>
      </div>
    ),
  },
  {
    id: "proj-interior",
    name: "godrej-air-interior.jpg",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8D5BE] via-[#F0E5D4] to-[#FAF6EF] flex items-end p-2">
        <div className="text-[#5A4633] text-[8px] font-semibold leading-tight">
          <div>3BHK Living</div>
          <div className="opacity-60 mt-0.5">Interior view</div>
        </div>
      </div>
    ),
  },
  {
    id: "proj-amenities",
    name: "godrej-air-amenities.jpg",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#86D5C9] flex items-end p-2">
        <div className="text-white text-[8px] font-semibold leading-tight">
          <div>Zen Gardens</div>
          <div className="opacity-70 mt-0.5">3-acre amenity</div>
        </div>
      </div>
    ),
  },
];

/** Reference ads — competitor / inspiration creatives. */
export const REFERENCE_ADS: ImageSample[] = [
  {
    id: "ref-bold",
    name: "competitor-bold.jpg",
    render: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-[#F97373] via-[#FCA5A5] to-[#FED7AA] flex flex-col justify-end p-2">
        <div className="text-white text-[8px] font-bold leading-tight">YOUR HOME AWAITS</div>
        <div className="text-white text-[7px] opacity-80 leading-tight">Now Open · Phase 3</div>
      </div>
    ),
  },
  {
    id: "ref-premium",
    name: "competitor-premium.jpg",
    render: () => (
      <div className="absolute inset-0 bg-[#0A0A0A] flex flex-col justify-center items-center p-2">
        <div className="text-[#D4A574] text-[7px] font-semibold uppercase tracking-[1px] mb-0.5">Premium</div>
        <div className="text-white text-[9px] font-light italic">Redefined</div>
      </div>
    ),
  },
  {
    id: "ref-minimal",
    name: "competitor-minimal.jpg",
    render: () => (
      <div className="absolute inset-0 bg-[#FAFAF7] flex flex-col justify-between p-2">
        <div className="text-[#1A1A1A] text-[14px] font-bold leading-none">₹1.8</div>
        <div>
          <div className="h-[1px] w-4 bg-[#1A1A1A] mb-1" />
          <div className="text-[#1A1A1A] text-[6px] font-semibold uppercase tracking-[0.5px]">Starting at</div>
        </div>
      </div>
    ),
  },
];

/** Brand logo variants. */
export const BRAND_LOGOS: ImageSample[] = [
  {
    id: "logo-wordmark",
    name: "godrej-wordmark.svg",
    render: () => (
      <div className="absolute inset-0 bg-white flex items-center justify-center">
        <div className="text-[#2B5BA8] text-[11px] font-bold tracking-[2px]">GODREJ</div>
      </div>
    ),
  },
  {
    id: "logo-mark",
    name: "godrej-mark.svg",
    render: () => (
      <div className="absolute inset-0 bg-[#2B5BA8] flex items-center justify-center">
        <div className="text-white text-[18px] font-bold">G</div>
      </div>
    ),
  },
  {
    id: "logo-stacked",
    name: "godrej-stacked.svg",
    render: () => (
      <div className="absolute inset-0 bg-white flex flex-col items-center justify-center gap-0.5">
        <div className="w-4 h-4 rounded-full bg-[#2B5BA8] flex items-center justify-center">
          <div className="text-white text-[8px] font-bold">G</div>
        </div>
        <div className="text-[#2B5BA8] text-[6px] font-bold tracking-[1px]">GODREJ</div>
      </div>
    ),
  },
];

/** Brand guidelines — a small canonical spec used by the popover. */
export const BRAND_GUIDELINES = {
  voice: ["Aspirational", "Warm", "Premium"],
  colors: [
    { name: "Brand Blue", hex: "#2B5BA8" },
    { name: "Accent Gold", hex: "#D4A574" },
    { name: "Earth Beige", hex: "#E8D5BE" },
    { name: "Charcoal", hex: "#1A1A1A" },
  ],
  typography: {
    heading: "Inter Bold",
    body: "Inter Regular",
  },
  logoMinSize: "24px",
  /** Tone rules summarised in a single sentence each. */
  rules: [
    "Always show ₹1.8Cr starting price alongside USPs, never alone.",
    "Mention Whitefield + Bangalore for geographic clarity.",
    "Avoid pressure tactics — emphasise lifestyle benefits.",
  ],
};

export function findSample(library: ImageSample[], id: string): ImageSample | undefined {
  return library.find((s) => s.id === id);
}
