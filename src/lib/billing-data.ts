// Client billing + rate-card data model.
//
// Built from the "Launchpad pricing" Confluence page (Tech space, page 621674507).
// Three pricing-plan templates (Current / Hybrid / Pure Credit) prefill the
// rate card and tiers; admins can then override per-product credit cost and
// volume tier rates per client.

export type ProductCategory = "Features" | "Agents";

export interface Product {
  id: string;
  category: ProductCategory;
  /** Sub-group within a category. Items in the same bucket render under a
   * single parent toggle (e.g. "Contact Enrichment" → Email + Phone). */
  bucket: string;
  name: string;
  /** What the unit being billed is (e.g. "per email", "per minute") */
  unit: string;
  /** Internal cost in INR (helpful for the admin to see margin) */
  internalCostRupees?: number;
  /** Description shown under the product name */
  description?: string;
}

/**
 * Each bucket has its own description shown next to the parent toggle, so
 * the admin sees WHY they'd enable a whole group at once.
 */
export const BUCKET_DESCRIPTIONS: Record<string, string> = {
  "Contact Enrichment": "Pull email + phone for inbound leads.",
  "Data Enrichment":    "Add profile and financial overlays on top of contacts.",
  "Agents":             "Voice agents that handle qualification calls.",
};

// ── Product catalogue ────────────────────────────────────────────────────
/**
 * Two-meter rate card per the Revspot Pricing Strategy doc (June 2026).
 *
 *   Meter 1 — Platform actions: enrichment, marketing actions, AI gen.
 *             Driven by compute + third-party data APIs.
 *   Meter 2 — Voice minutes: AI voice calls, rated by destination.
 *
 * Rupees are the unit throughout — no separate "credit" denomination. The
 * customer's wallet draws against either meter at the appropriate rate.
 */
export const PRODUCT_CATALOGUE: Product[] = [
  // Contact Enrichment — pull email or phone for a known contact.
  { id: "feat_email",         category: "Features", bucket: "Contact Enrichment", name: "Email",              unit: "per contact",    internalCostRupees: 1.60, description: "Cheap, high volume." },
  { id: "feat_phone",         category: "Features", bucket: "Contact Enrichment", name: "Phone",              unit: "per contact",    internalCostRupees: 1.80, description: "Mobile + landline lookups." },
  // Data Enrichment — add context to a known contact.
  { id: "feat_profile",       category: "Features", bucket: "Data Enrichment",    name: "Professional",       unit: "per profile",    internalCostRupees: 0.80, description: "Firmographic + role data." },
  { id: "feat_finance",       category: "Features", bucket: "Data Enrichment",    name: "Financial",          unit: "per profile",    internalCostRupees: 4.00, description: "Revenue, funding, capital structure." },
  // Marketing — automation primitives.
  { id: "act_mktg_workflow",  category: "Features", bucket: "Marketing",          name: "Workflow action",    unit: "per action",     internalCostRupees: 0.15, description: "Sends, automation steps." },
  { id: "act_ai_personalize", category: "Features", bucket: "Marketing",          name: "AI personalization", unit: "per generation", internalCostRupees: 0.40, description: "LLM inference." },
  // Voice Agent — rates split by destination (doc § 5.2).
  { id: "voice_in_landline",  category: "Agents",   bucket: "Voice Agent",        name: "India — Landline",   unit: "per minute",     internalCostRupees: 5.0,  description: "Indian landline destinations." },
  { id: "voice_in_mobile",    category: "Agents",   bucket: "Voice Agent",        name: "India — Mobile",     unit: "per minute",     internalCostRupees: 7.5,  description: "Indian mobile destinations." },
  { id: "voice_us_ca",        category: "Agents",   bucket: "Voice Agent",        name: "US / Canada",        unit: "per minute",     internalCostRupees: 9.0,  description: "North American destinations." },
  { id: "voice_row",          category: "Agents",   bucket: "Voice Agent",        name: "Rest of world",      unit: "per minute",     internalCostRupees: 12.0, description: "All other destinations." },
];

/**
 * Module → Feature model. A *module* is the bracket an operator enables for a
 * customer; enabling it turns on its *features*. Most features carry metered
 * pricing — the meters reuse the product catalogue above, so pricing still
 * flows through `rateCard`. Outreach is the exception: no metered pricing,
 * navigation is just switched on.
 */
// How a feature is configured in the Pricing tab:
//   "meters" → priced per-unit meter rows
//   "voice"  → one blended per-minute rate + pulse billing
//   "auto"   → navigation only; enabled in Modules but never priced
export type FeatureKind = "meters" | "voice" | "auto";

export interface ModuleFeature {
  id: string;
  name: string;
  description: string;
  kind: FeatureKind;
  meterIds: string[]; // product ids whose ₹/unit price configures this feature
  toggleable?: boolean; // can be turned on/off independently in the Modules tab
}

export interface ModuleDef {
  id: string;
  name: string;
  enables: string; // one-line "what enabling this turns on"
  features: ModuleFeature[];
  // Meters used only to track on/off + drive creation when none of the
  // module's features carry their own meters (Marketing is navigation-only).
  enableMeterIds?: string[];
  // Another module that must be enabled before this one can be turned on.
  // Disabling the required module cascades this one off (Outreach ⇒ AI Calling).
  requires?: string;
}

// Modules are fully flat — every capability is its own top-level module the
// operator enables individually. No bundles or sub-grouping.
export const MODULE_CATALOG: ModuleDef[] = [
  {
    id: "ai_calling",
    name: "AI Calling",
    enables: "Outbound AI voice calling.",
    features: [
      {
        id: "voice_ai",
        name: "AI Calling",
        description: "Outbound voice minutes across all agents.",
        kind: "voice",
        meterIds: ["voice_in_landline", "voice_in_mobile", "voice_us_ca", "voice_row"],
        toggleable: true,
      },
    ],
  },
  {
    id: "outreach",
    name: "Outreach",
    enables: "Multi-channel outreach sequences. Navigation only.",
    requires: "ai_calling",
    features: [
      { id: "outreach", name: "Outreach", description: "Multi-channel outreach sequences.", kind: "auto", meterIds: [], toggleable: true },
    ],
  },
  {
    id: "extraction",
    name: "Extraction",
    enables: "Verified emails & phone numbers from leads.",
    features: [
      { id: "extraction", name: "Extraction", description: "Pull verified emails and phone numbers from leads.", kind: "meters", meterIds: ["feat_email", "feat_phone"], toggleable: true },
    ],
  },
  {
    id: "enrichment",
    name: "Enrichment",
    enables: "Professional & financial profile lookups.",
    features: [
      { id: "enrichment", name: "Enrichment", description: "Professional and financial profile lookups per lead.", kind: "meters", meterIds: ["feat_profile", "feat_finance"], toggleable: true },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    // Single module — enabling it turns on Projects, Campaigns & Creatives
    // together. They are not exposed as separate options. Tracked via the
    // marketing meters so the choice persists through creation.
    enables: "Enables Projects, Campaigns & Creatives.",
    enableMeterIds: ["act_mktg_workflow", "act_ai_personalize"],
    features: [
      {
        id: "marketing",
        name: "Marketing",
        description: "Projects, Campaigns & Creatives.",
        kind: "auto",
        meterIds: [],
        toggleable: true,
      },
    ],
  },
  {
    id: "spot",
    name: "Spot",
    enables: "AI assistant across the workspace. No metered pricing.",
    features: [
      {
        id: "spot",
        name: "Spot",
        description: "AI assistant across the workspace.",
        kind: "auto",
        meterIds: [],
        toggleable: true,
      },
    ],
  },
];

export const moduleMeterIds = (mod: ModuleDef): string[] =>
  mod.enableMeterIds ?? mod.features.flatMap((f) => f.meterIds);

/** One-line summary of what a module turns on, for compact lists. */
export const moduleSummary = (mod: ModuleDef): string => mod.enables;

/**
 * Industry-standard per-unit rates (the numbers agreed earlier). These are
 * BOTH the default rate seeded into every meter AND the floor — an operator
 * can raise a price but never set it below this minimum.
 */
export const DEFAULT_RATES: Record<string, number> = {
  feat_email:         2.0,
  feat_phone:         4.0,
  feat_profile:       1.5,
  feat_finance:       7.0,
  act_mktg_workflow:  0.5,
  act_ai_personalize: 1.0,
  // AI Calling is one blended per-minute rate now; all destinations share the
  // same floor/default of ₹5 so VOICE_FLOOR (the min) resolves to 5.
  voice_in_landline:  5.0,
  voice_in_mobile:    5.0,
  voice_us_ca:        5.0,
  voice_row:          5.0,
};
// Back-compat alias — existing call sites still reference this name.
export const DEFAULT_CREDIT_RATES = DEFAULT_RATES;

/**
 * Voice minute rates by destination — meter 2 of the rate card. All values
 * are ₹/minute. Calls are charged per second of connected time. Disconnects,
 * voicemails picked up by detection, and ring-no-answer events get a flat
 * attempt fee instead.
 */
export interface VoiceRates {
  indiaLandline: number;
  indiaMobile: number;
  usCanada: number;
  restOfWorld: number;
  /** Flat ₹ per failed attempt (RNA / voicemail / disconnect). */
  attemptFee: number;
}

export const DEFAULT_VOICE_RATES: VoiceRates = {
  indiaLandline: 12,
  indiaMobile:   18,
  usCanada:      22,
  restOfWorld:   30,
  attemptFee:    0.5,
};

/**
 * Commit tiers per the doc § 6. Each tier has a monthly commit floor and a
 * percentage discount on the rate card. PAYG is the no-commit default.
 */
export type CommitTier = "PAYG" | "Starter" | "Growth" | "Scale" | "Enterprise";

export interface CommitTierDef {
  id: CommitTier;
  label: string;
  /** Monthly committed spend that unlocks this tier (₹). 0 for PAYG. */
  monthlyCommit: number;
  /** Discount applied to all rate-card lines, as a fraction (0.20 = 20%). */
  discount: number;
  bestFor: string;
}

export const COMMIT_TIERS: CommitTierDef[] = [
  { id: "PAYG",       label: "Pay-as-you-go", monthlyCommit: 0,       discount: 0.00, bestFor: "Trial, first-time buyers, intermittent users" },
  { id: "Starter",    label: "Starter",       monthlyCommit: 25_000,  discount: 0.10, bestFor: "Small teams with consistent usage" },
  { id: "Growth",     label: "Growth",        monthlyCommit: 100_000, discount: 0.20, bestFor: "Established outbound teams" },
  { id: "Scale",      label: "Scale",         monthlyCommit: 300_000, discount: 0.30, bestFor: "High-volume / multi-team customers" },
  { id: "Enterprise", label: "Enterprise",    monthlyCommit: 500_000, discount: 0.35, bestFor: "Custom SLAs, advanced compliance, dedicated support" },
];

/** Threshold above which postpaid billing unlocks (₹/month). */
export const POSTPAID_THRESHOLD = 50_000;
/** Threshold above which hybrid (commit prepaid + overage postpaid) unlocks. */
export const HYBRID_THRESHOLD = 300_000;
/** Free-trial wallet credit issued on signup (₹). */
export const FREE_TRIAL_TOPUP = 500;

// ── Client model ─────────────────────────────────────────────────────────
/**
 * Billing cycle is currently fixed at "Monthly" for every client — we don't
 * support quarterly / annual cycles yet. The type stays a string union so
 * adding cycles later is non-breaking, but the UI shows it as read-only.
 */
export type BillingCycle = "Monthly" | "Quarterly" | "Yearly";

/** Prepaid sub-mode — subscription = recurring monthly credit; payg = ad-hoc top-ups. */
export type PrepaidMode = "subscription" | "payg";

/** Postpaid invoice generation cadence. */
export type InvoiceGeneration = "auto" | "manual";
export type BillingType = "Postpaid" | "Prepaid";

/** Plain-language labels for the BillingType dropdown. */
export const BILLING_TYPE_DESCRIPTIONS: Record<BillingType, string> = {
  Postpaid: "Invoice at end of cycle",
  Prepaid: "Top up a wallet upfront",
};

/** Industry options shown on Step 1. */
export const INDUSTRIES = [
  "Real Estate",
  "Financial Services",
  "Healthcare",
  "SaaS / Technology",
  "Education",
  "E-commerce",
  "Manufacturing",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export type MemberRole = "Admin" | "Manager" | "Member" | "Viewer";

export const MEMBER_ROLES: MemberRole[] = ["Admin", "Manager", "Member", "Viewer"];

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  /** Send an invitation email when the account is activated. */
  sendInvite: boolean;
}

/**
 * Key Account Manager — the Revspot-side owner of this client. They're the
 * day-one point of contact for escalations, QBRs, and renewals.
 */
export interface KeyAccountManager {
  name: string;
  phone: string;
  email: string;
  /** Send "you've been assigned a new account" email when client activates. */
  notifyOnActivation: boolean;
}

export type AccountType = "Sales & Outreach" | "Recruitment" | "Customer Support" | "Custom";

/**
 * A workspace is a sub-tenant inside the organization — e.g. one per
 * region, brand, or team. Each workspace bills against the org's wallet
 * but can have its own description and assigned KAM-side owner.
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
}

let _workspaceCounter = 0;
export function makeWorkspaceId(): string {
  _workspaceCounter += 1;
  return `ws_${Date.now().toString(36)}_${_workspaceCounter}`;
}

/**
 * Billing model per the doc § 7.
 *
 *   prepaid — wallet top-up + real-time draws (default below ₹50K/mo).
 *   postpaid — itemized monthly invoice, Net-15/30.
 *   hybrid — commit prepaid, overage postpaid (only above ₹3L/mo).
 */
export type BillingMode = "prepaid" | "postpaid" | "hybrid";

export interface AutoRechargeConfig {
  enabled: boolean;
  /** Trigger top-up when wallet drops below this amount (₹). */
  triggerAt: number;
  /** Amount to top up when triggered (₹). */
  rechargeAmount: number;
}

export interface ClientBilling {
  // Step 1 — Organization details
  clientName: string;
  industry: Industry;
  kam: KeyAccountManager;
  contractMonths: number;
  billingCycle: BillingCycle;
  // Step 2 — Plan & commitment
  commitTier: CommitTier;
  /** Monthly committed spend in ₹ (overrideable for Enterprise). */
  monthlyCommit: number;
  /** Discount fraction applied to all rate-card lines (0.20 = 20%). */
  discountPct: number;
  /** Months of rollover for unused commit (doc § 6.1 — 3). */
  rolloverMonths: number;
  // Step 3 — Rate card (two meters)
  /** Per-platform-action retail rates in ₹ (admin overrideable per org). */
  rateCard: Record<string, { enabled: boolean; creditsPerUnit: number }>;
  /** Voice destination rates + attempt fee. */
  voiceRates: VoiceRates;
  /** Configurable maximum call duration in minutes (doc § 8.4 default 10). */
  perCallDurationCap: number;
  /** Minimum inbound wallet floor in ₹ (doc § 8.3 default 2000). */
  inboundReserve: number;
  // Step 4 — Wallet & billing
  billingMode: BillingMode;
  /** When billingMode === "prepaid", which sub-mode is active. */
  prepaidMode: PrepaidMode;
  /** When billingMode === "postpaid", how invoices are generated. */
  invoiceGeneration: InvoiceGeneration;
  /** Initial wallet top-up amount on activation (₹). */
  walletInitialTopUp: number;
  autoRecharge: AutoRechargeConfig;
  /** ISO date of the last invoice this org received. */
  lastInvoiceDate?: string;
  // Step 5 — Workspaces + Members
  workspaces: Workspace[];
  members: OrgMember[];
  /** Seats derived from members count (unlimited, free). */
  seatCount: number;
  /** ISO date — when the wallet goes live. */
  activationDate: string;
  // Legacy / vestigial — referenced by existing wizard step UI until the
  // 5-step rebuild lands. Defaulted in defaultBilling() so the new tier
  // model still works while old summary rows + Step inputs keep compiling.
  billingType: BillingType;
  initialCreditsPerCycle: number;
  globalDailyLimit: number;
  rupeesPerCredit: number;
  overageRupeesPerCredit: number;
  rolloverEnabled: boolean;
  rolloverCapCredits: number;
  alertThresholdsPct: number[];
  autoRechargeAtPct: number | null;
  autoInvoiceMonthly: boolean;
  accountType: AccountType;
}

export interface Client {
  id: string;
  orgId: string;        // shown as `org_XXX` badge
  name: string;         // company display name
  status: "Active" | "Onboarding" | "Suspended";
  contractStart?: string;
  primaryContact?: string;
  /** null while the credit account hasn't been activated yet. */
  billing?: ClientBilling;
}

// `makeMemberId` is called below during seed-client initialization, so its
// counter has to be defined BEFORE `clients` — otherwise we hit a TDZ error
// at module load. (The `makeMemberId` function itself is hoisted, but the
// `let _memberCounter` it closes over is not.)
let _memberCounter = 0;
export function makeMemberId(): string {
  // Stable enough for a demo; for prod use crypto.randomUUID().
  _memberCounter += 1;
  return `mem_${Date.now().toString(36)}_${_memberCounter}`;
}

// Helper — build a fully-configured ClientBilling for the seed Godrej client
// so the listing has at least one "Active" row with real data to show.
function godrejBilling(): ClientBilling {
  const growth = COMMIT_TIERS.find((t) => t.id === "Growth")!;
  const b = defaultBilling({
    clientName: "Godrej Properties",
    industry: "Real Estate",
    contractMonths: 24,
    commitTier: growth.id,
    monthlyCommit: growth.monthlyCommit,
    discountPct: growth.discount,
    billingMode: "postpaid",
    walletInitialTopUp: 100_000,
    autoRecharge: { enabled: true, triggerAt: 25_000, rechargeAmount: 100_000 },
    inboundReserve: 5_000,
    perCallDurationCap: 12,
  });
  b.kam = {
    name: "Neha Sharma",
    phone: "+91 98765 43210",
    email: "neha@revspot.ai",
    notifyOnActivation: false,
  };
  b.members = [
    { id: makeMemberId(), name: "Rohit Mehta",   email: "demo@godrejproperties.com",     role: "Admin",   sendInvite: false },
    { id: makeMemberId(), name: "Sanjana Kapur", email: "sanjana@godrejproperties.com",  role: "Manager", sendInvite: false },
    { id: makeMemberId(), name: "Vikram Reddy",  email: "vikram@godrejproperties.com",   role: "Member",  sendInvite: false },
  ];
  b.seatCount = b.members.length;
  b.activationDate = "2025-09-12";
  b.lastInvoiceDate = "2026-05-01";
  b.workspaces = [
    { id: makeWorkspaceId(), name: "Godrej Properties — Mumbai",      description: "Western region sales" },
    { id: makeWorkspaceId(), name: "Godrej Properties — Bengaluru",   description: "South region sales" },
    { id: makeWorkspaceId(), name: "Godrej Reflections — Pre-launch", description: "Brand-specific outreach" },
  ];
  return b;
}

export const clients: Client[] = [
  {
    id: "t_and_t_motors",
    orgId: "org_JaPQnr1iadWymMKl",
    name: "T&T Motors",
    status: "Onboarding",
    contractStart: "2026-05-26",
    primaryContact: "anita@tandtmotors.com",
    billing: undefined, // not activated yet — this is the onboarding flow
  },
  {
    id: "godrej_properties",
    orgId: "org_8x2dKwoq3LbN9aFt",
    name: "Godrej Properties",
    status: "Active",
    contractStart: "2025-09-12",
    primaryContact: "demo@godrejproperties.com",
    billing: godrejBilling(),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

export function findClient(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

/**
 * Create a brand-new organization from the Create Organization modal:
 * name + industry + the modules to enable upfront. Only the chosen modules'
 * meters are enabled in the rate card; the org starts with one default
 * workspace and no members. Prepends it to the in-memory list so it lands at
 * the top of the listing, and returns it so the caller can route to it.
 */
export function createClient(input: {
  name: string;
  industry: Industry;
  moduleIds: string[];
}): Client {
  const name = input.name.trim();
  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org";
  const rand = (n: number) => Math.random().toString(36).slice(2, 2 + n);
  const id = `${slug}-${rand(8)}`;
  const orgId = `org_${rand(16)}`;

  // Which meters belong to the selected modules.
  const enabledMeters = new Set(
    input.moduleIds.flatMap((mid) => {
      const mod = MODULE_CATALOG.find((m) => m.id === mid);
      return mod ? moduleMeterIds(mod) : [];
    }),
  );

  const billing = defaultBilling({
    clientName: name,
    industry: input.industry,
    workspaces: [
      { id: makeWorkspaceId(), name: `${name} — Default`, description: "Default workspace" },
    ],
    members: [],
  });
  // defaultBilling enables every meter; pare back to the chosen modules.
  for (const pid of Object.keys(billing.rateCard)) {
    billing.rateCard[pid] = {
      ...billing.rateCard[pid],
      enabled: enabledMeters.has(pid),
    };
  }

  const client: Client = {
    id,
    orgId,
    name,
    status: "Active",
    contractStart: new Date().toISOString().slice(0, 10),
    billing,
  };
  clients.unshift(client);
  return client;
}

/**
 * Initialise a fresh ClientBilling with pay-as-you-go defaults. Called when
 * the wizard opens for a client that hasn't been activated yet.
 */
export function defaultBilling(seed?: Partial<ClientBilling>): ClientBilling {
  const payg = COMMIT_TIERS.find((t) => t.id === "PAYG")!;
  return {
    // Step 1
    clientName: "",
    industry: "Real Estate",
    kam: { name: "", phone: "", email: "", notifyOnActivation: true },
    contractMonths: 12,
    billingCycle: "Monthly",
    // Step 2 — start every org on PAYG; admin upgrades to a commit tier.
    commitTier: payg.id,
    monthlyCommit: payg.monthlyCommit,
    discountPct: payg.discount,
    rolloverMonths: 3,
    // Step 3 — every action enabled at retail rate. Voice rates default
    // to the doc's destination table.
    rateCard: Object.fromEntries(
      PRODUCT_CATALOGUE.map((p) => [
        p.id,
        { enabled: true, creditsPerUnit: DEFAULT_RATES[p.id] ?? 0 },
      ]),
    ),
    voiceRates: { ...DEFAULT_VOICE_RATES },
    perCallDurationCap: 10,
    inboundReserve: 2_000,
    // Step 4 — prepaid wallet, subscription sub-mode by default.
    billingMode: "prepaid",
    prepaidMode: "subscription",
    invoiceGeneration: "auto",
    walletInitialTopUp: FREE_TRIAL_TOPUP,
    autoRecharge: { enabled: false, triggerAt: 5_000, rechargeAmount: 25_000 },
    // Step 5 — start blank for new orgs; KAM adds the first workspace +
    // member from empty-state CTAs.
    workspaces: [],
    members: [],
    seatCount: 0,
    activationDate: defaultActivationDate(),
    // Legacy — defaulted here so the existing step UI compiles. Will be
    // dropped once the 5-step rebuild fully replaces the old surfaces.
    billingType: "Postpaid",
    initialCreditsPerCycle: 25_000,
    globalDailyLimit: 5_000,
    rupeesPerCredit: 1,
    overageRupeesPerCredit: 1,
    rolloverEnabled: true,
    rolloverCapCredits: 0,
    alertThresholdsPct: [75, 90],
    autoRechargeAtPct: null,
    autoInvoiceMonthly: true,
    accountType: "Sales & Outreach",
    ...seed,
  };
}

function defaultActivationDate(): string {
  // Default to 7 days from "today" — gives onboarding a week of runway.
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Format an ISO date (YYYY-MM-DD) as "26 May 2026". */
export function formatActivationDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Estimate the monthly cost for this configuration. Pure pay-as-you-go:
 * cost = (initial credits × seats) × ₹/credit. No base seat fee.
 */
export function estimateMonthlyCost(b: ClientBilling) {
  const credits = b.initialCreditsPerCycle * b.seatCount;
  return {
    credits,
    estTotal: credits * b.rupeesPerCredit,
    ratePerCredit: b.rupeesPerCredit,
  };
}

export function formatRupees(amount: number): string {
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(amount % 1_00_000 === 0 ? 0 : 2)}L`;
  if (amount >= 1_000)    return `₹${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCredits(n: number): string {
  return n.toLocaleString("en-IN");
}
