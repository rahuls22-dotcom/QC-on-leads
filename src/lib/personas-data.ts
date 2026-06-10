// Personas are the *cross-product* asset. A persona like "The Aspiring
// Engineer Parent" is valid across Guyju's JEE Crack and Foundation 9-10
// — and can be reused on a future product without re-research. Personas
// live outside any single product and reference products via soft links.

export type PersonaCreative = {
  id: string;
  /** Display label for the angle / headline this creative carries. */
  label: string;
  format: "1:1" | "4:5" | "9:16" | "16:9";
  kind: "image" | "video" | "carousel";
  /** Stable hue (0-360) for the placeholder gradient. */
  hue: number;
  /** Asset state — live = running in a campaign, ready = built but not in spend yet, shell = concept only. */
  state: "live" | "ready" | "shell";
  /** Product this creative was made for. */
  productId: string;
};

export type Persona = {
  id: string;
  name: string;
  shortLabel: string;
  /** 1-line "who they are". Spot uses this as briefing context. */
  description: string;
  /** Demographic anchors — used by Audience Builder + media planner. */
  attributes: { label: string; value: string }[];
  /** Pain & desire — the emotional spine creative must hit. */
  pain: string[];
  desire: string[];
  /** Channels where this persona historically performs best. */
  preferredChannels: ("Meta" | "Google" | "WhatsApp" | "Voice" | "Email")[];
  /** Products this persona is linked to. */
  products: { id: string; name: string }[];
  /** Creatives built specifically for this persona, across all linked products. */
  creatives: PersonaCreative[];
  /** Live status — Spot uses this when picking who to run. */
  status: "active" | "researching" | "archived";
  updatedAt: string;
};

export const PERSONAS: Persona[] = [
  {
    id: "pers-aspiring-engineer-parent",
    name: "The Aspiring Engineer Parent",
    shortLabel: "Engineer Parent",
    description: "Parents (36–48) of Class 9–12 students aiming for JEE / IIT. Often engineers themselves; deeply involved in study routines.",
    attributes: [
      { label: "Age", value: "36–48" },
      { label: "Income", value: "₹12L–₹35L" },
      { label: "Geography", value: "Hyderabad, Pune, Bangalore, NCR, Kota" },
      { label: "Kid's class", value: "9–12" },
    ],
    pain: [
      "Offline coaching takes 3–4 hours of commute a day",
      "Hard to verify if coaching is actually working week-on-week",
      "Class 11/12 is too late to course-correct on fundamentals",
    ],
    desire: [
      "Visibility into the kid's actual progress every week",
      "Mentors with credentials (IIT alumni) the parent can trust",
      "A program that fits *around* school, not in conflict with it",
    ],
    preferredChannels: ["Meta", "WhatsApp"],
    products: [
      { id: "prod-guyjus-jee", name: "Guyju's JEE Crack" },
      { id: "prod-guyjus-foundation", name: "Guyju's Foundation 9-10" },
    ],
    creatives: [
      { id: "cr-aep-1", label: "Mentor-led classes · static", format: "1:1", kind: "image", hue: 210, state: "live", productId: "prod-guyjus-jee" },
      { id: "cr-aep-2", label: "Weekly mocks reel", format: "9:16", kind: "video", hue: 30, state: "live", productId: "prod-guyjus-jee" },
      { id: "cr-aep-3", label: "Parent dashboard demo", format: "4:5", kind: "image", hue: 280, state: "ready", productId: "prod-guyjus-jee" },
      { id: "cr-aep-4", label: "Project lab · 30s", format: "9:16", kind: "video", hue: 150, state: "ready", productId: "prod-guyjus-foundation" },
      { id: "cr-aep-5", label: "Curriculum map", format: "1:1", kind: "image", hue: 200, state: "shell", productId: "prod-guyjus-foundation" },
    ],
    status: "active",
    updatedAt: "2026-05-24",
  },
  {
    id: "pers-aspiring-doctor-parent",
    name: "The Aspiring Doctor Parent",
    shortLabel: "Doctor Parent",
    description: "Parents (38–50) of Class 11–12 NEET aspirants. Heavy on Biology, often have a doctor in the extended family.",
    attributes: [
      { label: "Age", value: "38–50" },
      { label: "Income", value: "₹15L–₹40L" },
      { label: "Geography", value: "Kerala, Tamil Nadu, Maharashtra, Delhi" },
      { label: "Kid's class", value: "11–12" },
    ],
    pain: [
      "Biology coaching is uneven across centres",
      "AIIMS / NEET cutoffs feel like a moving target",
      "Hard to push kids on long-prep cycles without burning out",
    ],
    desire: [
      "Biology-first curriculum (it's 60% of NEET marks)",
      "Mentors who themselves cracked NEET / MBBS",
      "Visibility into mock-test rankings week-on-week",
    ],
    preferredChannels: ["Meta", "WhatsApp", "Voice"],
    products: [
      { id: "prod-guyjus-neet", name: "Guyju's NEET Pro" },
    ],
    creatives: [
      { id: "cr-adp-1", label: "Biology-first hook · static", format: "1:1", kind: "image", hue: 35, state: "live", productId: "prod-guyjus-neet" },
      { id: "cr-adp-2", label: "MBBS mentor reel", format: "9:16", kind: "video", hue: 10, state: "live", productId: "prod-guyjus-neet" },
      { id: "cr-adp-3", label: "Weekly mock ranking · static", format: "16:9", kind: "video", hue: 220, state: "live", productId: "prod-guyjus-neet" },
      { id: "cr-adp-4", label: "Parent-visible dashboard", format: "4:5", kind: "image", hue: 350, state: "ready", productId: "prod-guyjus-neet" },
    ],
    status: "active",
    updatedAt: "2026-05-23",
  },
  {
    id: "pers-self-studier",
    name: "The Self-Studier",
    shortLabel: "Self-Studier",
    description: "Students (16–19) prepping on their own, often from tier-2/3 cities where good coaching isn't local. Highly motivated.",
    attributes: [
      { label: "Age", value: "16–19" },
      { label: "Geography", value: "Tier-2 + tier-3 India" },
      { label: "Pays via", value: "Parent's card · UPI" },
    ],
    pain: [
      "No quality coaching available locally",
      "Doubt resolution is the biggest gap when self-studying",
      "Mocks are hard to come by — and impossible to rank against",
    ],
    desire: [
      "Recorded library that can be paused and replayed",
      "Live doubt-clearing they can actually access",
      "All-India mocks to know where they really stand",
    ],
    preferredChannels: ["Meta", "WhatsApp"],
    products: [
      { id: "prod-guyjus-jee", name: "Guyju's JEE Crack" },
      { id: "prod-guyjus-neet", name: "Guyju's NEET Pro" },
    ],
    creatives: [
      { id: "cr-ss-1", label: "24-month replay · reel", format: "9:16", kind: "video", hue: 120, state: "live", productId: "prod-guyjus-jee" },
      { id: "cr-ss-2", label: "All-India ranking · static", format: "1:1", kind: "image", hue: 60, state: "ready", productId: "prod-guyjus-jee" },
      { id: "cr-ss-3", label: "Doubt-clearing flow · carousel", format: "4:5", kind: "image", hue: 300, state: "shell", productId: "prod-guyjus-neet" },
    ],
    status: "active",
    updatedAt: "2026-05-19",
  },
  {
    id: "pers-coaching-hopper",
    name: "The Coaching Hopper",
    shortLabel: "Coaching Hopper",
    description: "Class 11/12 student already in offline coaching (FIITJEE, Allen) who's unhappy with progress and considering a switch.",
    attributes: [
      { label: "Age", value: "16–18" },
      { label: "Geography", value: "Kota, Hyderabad, Pune, Delhi" },
      { label: "Current spend", value: "₹1.2L–₹2.5L/yr offline" },
    ],
    pain: [
      "Commute is eating into study hours",
      "Class strength of 200+ means no personal attention",
      "Coaching is unwilling to give a refund mid-year",
    ],
    desire: [
      "Online program that fits around remaining school year",
      "Mentor 1:1 — finally being heard",
      "Hybrid: keep some structure of coaching, just better delivered",
    ],
    preferredChannels: ["Voice", "WhatsApp", "Meta"],
    products: [
      { id: "prod-guyjus-jee", name: "Guyju's JEE Crack" },
    ],
    creatives: [
      { id: "cr-ch-1", label: "Offline-to-online story · reel", format: "16:9", kind: "video", hue: 25, state: "ready", productId: "prod-guyjus-jee" },
    ],
    status: "researching",
    updatedAt: "2026-05-15",
  },
];

export const PERSONA_STATUS_TONE: Record<Persona["status"], string> = {
  active: "pill-ok",
  researching: "pill-info",
  archived: "pill",
};

export const PERSONA_STATUS_LABEL: Record<Persona["status"], string> = {
  active: "Active",
  researching: "Researching",
  archived: "Archived",
};
