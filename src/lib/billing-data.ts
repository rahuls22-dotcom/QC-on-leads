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
  // Spot — AI assistant, metered by tokens consumed.
  { id: "feat_spot_tokens",   category: "Features", bucket: "Spot",               name: "Spot tokens",        unit: "per 1,000 tokens", internalCostRupees: 1.00, description: "AI assistant usage." },
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
    enables: "Multi-channel outreach sequences.",
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
    enables: "AI assistant across the workspace. Priced per 1,000 tokens.",
    features: [
      {
        id: "spot",
        name: "Spot",
        description: "AI assistant across the workspace, billed by tokens used.",
        kind: "meters",
        meterIds: ["feat_spot_tokens"],
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
  feat_spot_tokens:   2.0,
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
  /** Workspace access — "all" (every workspace, the default) or specific
   *  workspace ids the member is scoped to. */
  workspaceAccess?: "all" | string[];
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
  /**
   * Modules explicitly enabled for this org. Needed because navigation-only
   * modules (Outreach, Spot, Marketing) have no meters, so their on/off can't
   * be inferred from the rate card. When set, it is the source of truth for
   * module enablement; when absent (seed orgs) we fall back to the rate card.
   */
  enabledModuleIds?: string[];
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
  status: "Active" | "Onboarding" | "Suspended" | "Sandbox" | "Expired";
  contractStart?: string;
  primaryContact?: string;
  /** null while the credit account hasn't been activated yet. */
  billing?: ClientBilling;
  /** Present only for free-trial (sandbox) orgs — see §2.2 of the pricing doc.
   *  @deprecated superseded by `creditAccounts`; kept for the seed Brisk org. */
  trial?: TrialInfo;
  /** Versioned credit accounts. The org accumulates these over time — Credit
   *  Account 1 (Trial) → 2 (Paid) → 3 (Renewal) — one Active at a time, older
   *  ones Ended. Modules + pricing live on each account. */
  creditAccounts?: CreditAccount[];
}

export type RateCard = Record<string, { enabled: boolean; creditsPerUnit: number }>;

// Only two account types. Renewing a paid org is simply a new *paid* credit
// account; a trial can convert to paid, but paid never reverts to trial.
export type CreditAccountType = "trial" | "paid";
export type ConsumptionModel = "Prepaid" | "Postpaid";
export type PostpaidModel = "payg" | "subscription";

/**
 * One credit account = one contractual period for an org. The active account
 * drives the org's modules + pricing; ending one and creating the next is how
 * trial → paid → renewal is modelled. Status is derived (see creditAccountStatus):
 * an account is Ended once a newer one supersedes it OR its period elapses.
 */
export interface CreditAccount {
  id: string;
  index: number; // 1, 2, 3 → "Credit Account 1"
  type: CreditAccountType;
  startDate: string; // ISO — when this credit system applies from
  // Period of applicability
  validityDays?: number; // trial length
  contractMonths?: number; // paid / renewal duration
  // Credits
  creditsPerCycle: number;
  totalCredits: number; // the cap (trial) or per-cycle × cycles (paid)
  creditsUsed: number;
  // Paid / renewal billing terms
  billingCycle?: "Monthly";
  consumptionModel?: ConsumptionModel;
  /** Only when consumptionModel === "Postpaid": pay-as-you-go (billed for usage,
   *  no fixed term) vs subscription (contract term, credits recharged each cycle).
   *  Prepaid is simple (just default credits) and has no sub-model. */
  postpaidModel?: PostpaidModel;
  monthlyCreditLapse?: boolean;
  // Modules + pricing for THIS account
  enabledModuleIds: string[];
  rateCard: RateCard;
  /** Manually-uploaded invoices (invoicing runs in Zoho), keyed by billing-cycle
   *  index. Stores the file name + an in-memory object URL for download. */
  invoices?: Record<number, { name: string; url: string }>;
  /** Tier pricing can't change mid-contract. Set true once a paid/renewal
   *  account's pricing is locked in; further rate edits are rejected. */
  pricingLocked?: boolean;
  // Trial extras
  customerEmail?: string;
  usage?: TrialUsage;
}

/** Free-trial (sandbox) parameters. Trial ends when credits run out OR the
 *  validity window elapses, whichever comes first. */
export interface TrialInfo {
  credits: number; // total free credits granted = the trial cap (₹, 1 credit ≈ ₹1)
  creditsPerCycle?: number; // allocation per billing cycle (defaults to total for a one-shot trial)
  creditsUsed: number; // consumed so far
  validityDays: number; // 15 / 30 / 90 / custom (default 30)
  startedAt: string; // ISO date the trial began
  customerEmail: string; // who the access link went to
  /** Lightweight engagement signals — how much the customer is actually using
   *  the trial. Drives the CSM "extend vs add credits vs let lapse" call. */
  usage?: TrialUsage;
}

export interface TrialUsage {
  actions: number; // total billable actions run (calls, enrichments, etc.)
  activeMembers: number; // members who've logged in and done something
  lastActiveDaysAgo: number; // 0 = today; -1 = never active yet
  dau: number; // avg daily active users over the trial
  dailyUsageMin: number; // avg active minutes per day
  trend: number[]; // last 7 days of activity (sparkline)
  /** Usage share by module, highest first — surfaces the hook feature to pitch
   *  on at conversion. Percentages sum to ~100. */
  byModule: { moduleId: string; pct: number }[];
}

/** Fresh trial usage — nothing done yet. */
export const EMPTY_TRIAL_USAGE: TrialUsage = {
  actions: 0,
  activeMembers: 0,
  lastActiveDaysAgo: -1,
  dau: 0,
  dailyUsageMin: 0,
  trend: [],
  byModule: [],
};

export interface TrialState {
  daysLeft: number;
  creditsLeft: number;
  creditsPct: number; // 0..100 remaining
  expired: boolean;
  /** What ended the trial first (for messaging). */
  endedBy: "credits" | "time" | null;
}

/** Derive the live trial state for a sandbox org. */
export function trialState(c: Client): TrialState | null {
  const t = c.trial;
  if (!t) return null;
  const elapsedDays = Math.floor((Date.now() - new Date(t.startedAt).getTime()) / 86_400_000);
  const daysLeft = Math.max(0, t.validityDays - elapsedDays);
  const creditsLeft = Math.max(0, t.credits - t.creditsUsed);
  const timeUp = daysLeft <= 0;
  const creditsUp = creditsLeft <= 0;
  return {
    daysLeft,
    creditsLeft,
    creditsPct: t.credits > 0 ? Math.round((creditsLeft / t.credits) * 100) : 0,
    expired: timeUp || creditsUp,
    endedBy: creditsUp ? "credits" : timeUp ? "time" : null,
  };
}

export interface TrialOverview extends TrialState {
  daysElapsed: number; // days into the trial (capped at validity)
  daysTotal: number; // validity window
  creditsUsed: number;
  creditsTotal: number;
  usedPct: number; // credits used %, 0..100
  burnPerDay: number; // ₹/day at current pace
  /** At current burn, how many more days the credits last (null if no burn). */
  projectedDaysLeft: number | null;
  /** True when credits or time are running low but the trial is still live. */
  atRisk: boolean;
}

/** Richer trial view for the CSM monitoring panel — usage pace + projections. */
export function trialOverview(c: Client): TrialOverview | null {
  const t = c.trial;
  const s = trialState(c);
  if (!t || !s) return null;
  const elapsed = Math.floor((Date.now() - new Date(t.startedAt).getTime()) / 86_400_000);
  const daysElapsed = Math.min(Math.max(0, elapsed), t.validityDays);
  const burnPerDay = daysElapsed > 0 ? t.creditsUsed / daysElapsed : 0;
  const projectedDaysLeft = burnPerDay > 0 ? Math.ceil(s.creditsLeft / burnPerDay) : null;
  return {
    ...s,
    daysElapsed,
    daysTotal: t.validityDays,
    creditsUsed: t.creditsUsed,
    creditsTotal: t.credits,
    usedPct: t.credits > 0 ? Math.round((t.creditsUsed / t.credits) * 100) : 0,
    burnPerDay,
    projectedDaysLeft,
    atRisk: !s.expired && (s.daysLeft <= 5 || s.creditsPct <= 15),
  };
}

/** Extend a trial's validity window by N days (CSM action). */
export function extendTrial(id: string, addDays: number): void {
  const c = findClient(id);
  if (c?.trial) c.trial.validityDays += addDays;
}

/** Top up a trial's free credits by N (CSM action). */
export function addTrialCredits(id: string, amount: number): void {
  const c = findClient(id);
  if (c?.trial) c.trial.credits += amount;
}

export type OrgDisplayStatus = "Active" | "Sandbox" | "Expiring soon" | "Expired" | "Draft";

/** What badge to show in the UI. Credit-account orgs derive from their active
 *  account (none active → Expired; ≤30 days left or low credits → Expiring soon). */
export function displayStatus(c: Client): OrgDisplayStatus {
  if (c.creditAccounts?.length) {
    const active = activeCreditAccount(c);
    if (active) {
      const o = creditAccountOverview(c, active);
      if (o.expired) return "Expired";
      if (o.atRisk || o.daysLeft <= 30) return "Expiring soon";
      return "Active";
    }
    // No active account — distinguish "still being set up" from lapsed.
    const latest = c.creditAccounts.reduce((m, x) => (x.index > m.index ? x : m));
    if (creditAccountStatus(c, latest) === "draft") return "Draft";
    return "Expired";
  }
  // Legacy trial fallback (seed Brisk predates credit accounts).
  if (c.status === "Sandbox" && c.trial) {
    const t = trialState(c)!;
    if (t.expired) return "Expired";
    if (t.daysLeft <= 5 || t.creditsPct <= 15) return "Expiring soon";
    return "Sandbox";
  }
  if (c.status === "Expired") return "Expired";
  return "Active";
}

/** Move a client to the top of the list (after saving its credit account). */
export function moveClientToTop(id: string): void {
  const i = clients.findIndex((c) => c.id === id);
  if (i > 0) {
    const [c] = clients.splice(i, 1);
    clients.unshift(c);
  }
}

/** Every module id — a sandbox enables all of them. */
export const ALL_MODULE_IDS = MODULE_CATALOG.map((m) => m.id);

/** Default free-trial grant (₹) and validity, per the pricing doc §2.2. */
export const TRIAL_DEFAULT_CREDITS = 1000;
export const TRIAL_DEFAULT_DAYS = 30;
export const TRIAL_DAY_OPTIONS = [30, 60, 90] as const;

/** Max credits that can be allocated on a trial or paid account (₹). */
export const MAX_CREDITS = 10_000;
export const clampCredits = (n: number): number => Math.min(MAX_CREDITS, Math.max(0, n || 0));

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
  const wsMumbai = makeWorkspaceId();
  const wsBlr = makeWorkspaceId();
  const wsPrelaunch = makeWorkspaceId();
  b.workspaces = [
    { id: wsMumbai, name: "Godrej Properties — Mumbai", description: "Western region sales" },
    { id: wsBlr, name: "Godrej Properties — Bengaluru", description: "South region sales" },
    { id: wsPrelaunch, name: "Godrej Reflections — Pre-launch", description: "Brand-specific outreach" },
  ];
  b.members = [
    { id: makeMemberId(), name: "Rohit Mehta",   email: "demo@godrejproperties.com",    role: "Admin",   sendInvite: false, workspaceAccess: "all" },
    { id: makeMemberId(), name: "Sanjana Kapur", email: "sanjana@godrejproperties.com", role: "Manager", sendInvite: false, workspaceAccess: [wsMumbai] },
    { id: makeMemberId(), name: "Vikram Reddy",  email: "vikram@godrejproperties.com",   role: "Member",  sendInvite: false, workspaceAccess: [wsBlr, wsPrelaunch] },
  ];
  b.seatCount = b.members.length;
  b.activationDate = "2025-09-12";
  b.lastInvoiceDate = "2026-05-01";
  return b;
}

export const clients: Client[] = [
  {
    id: "t_and_t_motors",
    orgId: "org_JaPQnr1iadWymMKl",
    name: "T&T Motors",
    status: "Active",
    contractStart: "2026-05-26",
    primaryContact: "anita@tandtmotors.com",
    billing: defaultBilling({
      clientName: "T&T Motors",
      industry: "Manufacturing",
      workspaces: [
        { id: makeWorkspaceId(), name: "T&T Motors — Default", description: "Default workspace" },
      ],
      members: [
        { id: makeMemberId(), name: "Anita Desai", email: "anita@tandtmotors.com", role: "Admin", sendInvite: false },
        { id: makeMemberId(), name: "Karan Shah", email: "karan@tandtmotors.com", role: "Manager", sendInvite: false },
        { id: makeMemberId(), name: "Priya Nair", email: "priya@tandtmotors.com", role: "Member", sendInvite: false },
        { id: makeMemberId(), name: "Imran Sheikh", email: "imran@tandtmotors.com", role: "Member", sendInvite: false },
        { id: makeMemberId(), name: "Leela Rao", email: "leela@tandtmotors.com", role: "Viewer", sendInvite: false },
      ],
    }),
    creditAccounts: [
      {
        id: "ca_tnt_1",
        index: 1,
        type: "paid",
        startDate: "2026-05-26",
        contractMonths: 12,
        billingCycle: "Monthly",
        consumptionModel: "Prepaid",
        monthlyCreditLapse: false,
        creditsPerCycle: 8_000,
        totalCredits: 8_000,
        creditsUsed: 5_200,
        usage: {
          actions: 1840,
          activeMembers: 5,
          lastActiveDaysAgo: 0,
          dau: 5.2,
          dailyUsageMin: 34,
          trend: [120, 140, 160, 150, 180, 170, 165],
          byModule: [
            { moduleId: "ai_calling", pct: 52 },
            { moduleId: "extraction", pct: 24 },
            { moduleId: "marketing", pct: 14 },
            { moduleId: "enrichment", pct: 10 },
          ],
        },
        enabledModuleIds: ["ai_calling", "extraction", "enrichment", "marketing"],
        rateCard: buildRateCard(["ai_calling", "extraction", "enrichment", "marketing"]),
        pricingLocked: true,
      },
    ],
  },
  {
    id: "godrej_properties",
    orgId: "org_8x2dKwoq3LbN9aFt",
    name: "Godrej Properties",
    status: "Active",
    contractStart: "2025-09-12",
    primaryContact: "demo@godrejproperties.com",
    billing: godrejBilling(),
    creditAccounts: [
      {
        id: "ca_godrej_1",
        index: 1,
        type: "paid",
        startDate: "2025-09-12",
        contractMonths: 12,
        billingCycle: "Monthly",
        consumptionModel: "Postpaid",
        postpaidModel: "subscription",
        monthlyCreditLapse: true,
        creditsPerCycle: 9_000,
        totalCredits: 108_000,
        creditsUsed: 67_000,
        usage: {
          actions: 3120,
          activeMembers: 3,
          lastActiveDaysAgo: 0,
          dau: 7.8,
          dailyUsageMin: 41,
          trend: [200, 220, 260, 240, 300, 280, 290],
          byModule: [
            { moduleId: "ai_calling", pct: 48 },
            { moduleId: "marketing", pct: 22 },
            { moduleId: "extraction", pct: 18 },
            { moduleId: "enrichment", pct: 12 },
          ],
        },
        enabledModuleIds: ["ai_calling", "extraction", "enrichment", "marketing"],
        rateCard: buildRateCard(["ai_calling", "extraction", "enrichment", "marketing"]),
        pricingLocked: true,
      },
    ],
  },
  {
    // A live free-trial org — low credits left, so it reads "Expiring soon".
    id: "brisk_logistics",
    orgId: "org_Br1skLog9Xy2",
    name: "Brisk Logistics",
    status: "Sandbox",
    contractStart: "2026-06-02",
    primaryContact: "ops@brisklogistics.com",
    trial: {
      credits: TRIAL_DEFAULT_CREDITS,
      creditsUsed: 880,
      validityDays: TRIAL_DEFAULT_DAYS,
      startedAt: "2026-06-02",
      customerEmail: "ops@brisklogistics.com",
      usage: {
        actions: 412,
        activeMembers: 3,
        lastActiveDaysAgo: 1,
        dau: 2.4,
        dailyUsageMin: 18,
        trend: [9, 14, 22, 17, 26, 21, 12],
        byModule: [
          { moduleId: "ai_calling", pct: 46 },
          { moduleId: "outreach", pct: 22 },
          { moduleId: "extraction", pct: 18 },
          { moduleId: "enrichment", pct: 14 },
        ],
      },
    },
    billing: defaultBilling({
      clientName: "Brisk Logistics",
      industry: "Manufacturing",
      enabledModuleIds: [...ALL_MODULE_IDS],
      workspaces: [
        { id: makeWorkspaceId(), name: "Brisk Logistics — Default", description: "Default workspace" },
      ],
      members: [
        { id: makeMemberId(), name: "Ravi Menon", email: "ops@brisklogistics.com", role: "Admin", sendInvite: false },
        { id: makeMemberId(), name: "Sara Iyer", email: "sara@brisklogistics.com", role: "Member", sendInvite: false },
        { id: makeMemberId(), name: "Dev Kapoor", email: "dev@brisklogistics.com", role: "Member", sendInvite: false },
        { id: makeMemberId(), name: "Neha Rao", email: "neha@brisklogistics.com", role: "Viewer", sendInvite: false },
      ],
    }),
    creditAccounts: [
      {
        id: "ca_brisk_1",
        index: 1,
        type: "trial",
        startDate: "2026-06-02",
        validityDays: TRIAL_DEFAULT_DAYS,
        creditsPerCycle: TRIAL_DEFAULT_CREDITS,
        totalCredits: TRIAL_DEFAULT_CREDITS,
        creditsUsed: 880,
        enabledModuleIds: [...ALL_MODULE_IDS],
        rateCard: buildRateCard([...ALL_MODULE_IDS]),
        customerEmail: "ops@brisklogistics.com",
        usage: {
          actions: 412,
          activeMembers: 3,
          lastActiveDaysAgo: 1,
          dau: 2.4,
          dailyUsageMin: 18,
          trend: [9, 14, 22, 17, 26, 21, 12],
          byModule: [
            { moduleId: "ai_calling", pct: 46 },
            { moduleId: "outreach", pct: 22 },
            { moduleId: "extraction", pct: 18 },
            { moduleId: "enrichment", pct: 14 },
          ],
        },
      },
    ],
  },
  {
    // Paid org whose contract has already EXPIRED — ready to renew.
    id: "vertex_components",
    orgId: "org_Vx9Qn2LpZ4aWmT3k",
    name: "Vertex Components",
    status: "Active",
    contractStart: "2025-08-01",
    primaryContact: "ops@vertexcomponents.com",
    billing: defaultBilling({
      clientName: "Vertex Components",
      industry: "Manufacturing",
      workspaces: [
        { id: makeWorkspaceId(), name: "Vertex Components — Default", description: "Default workspace" },
      ],
      members: [
        { id: makeMemberId(), name: "Arjun Pillai", email: "ops@vertexcomponents.com", role: "Admin", sendInvite: false },
        { id: makeMemberId(), name: "Maya Joshi", email: "maya@vertexcomponents.com", role: "Member", sendInvite: false },
      ],
    }),
    creditAccounts: [
      {
        id: "ca_vertex_1",
        index: 1,
        type: "paid",
        startDate: "2025-08-01", // 6-month contract → ended ~2026-02-01 (expired)
        contractMonths: 6,
        billingCycle: "Monthly",
        consumptionModel: "Prepaid",
        monthlyCreditLapse: false,
        creditsPerCycle: 6_000,
        totalCredits: 6_000,
        creditsUsed: 5_900,
        usage: {
          actions: 410,
          activeMembers: 2,
          lastActiveDaysAgo: 140,
          dau: 1.1,
          dailyUsageMin: 9,
          trend: [20, 18, 12, 8, 5, 3, 0],
          byModule: [
            { moduleId: "ai_calling", pct: 60 },
            { moduleId: "extraction", pct: 40 },
          ],
        },
        enabledModuleIds: ["ai_calling", "extraction"],
        rateCard: buildRateCard(["ai_calling", "extraction"]),
        pricingLocked: true,
      },
    ],
  },
  {
    // Paid org whose contract is ENDING SOON (a few weeks left) — renew before it lapses.
    id: "helio_realty",
    orgId: "org_He7lioR3alty92Xb",
    name: "Helio Realty",
    status: "Active",
    contractStart: "2025-07-10",
    primaryContact: "ops@heliorealty.com",
    billing: defaultBilling({
      clientName: "Helio Realty",
      industry: "Real Estate",
      workspaces: [
        { id: makeWorkspaceId(), name: "Helio Realty — Default", description: "Default workspace" },
      ],
      members: [
        { id: makeMemberId(), name: "Rhea Kapoor", email: "ops@heliorealty.com", role: "Admin", sendInvite: false },
        { id: makeMemberId(), name: "Sahil Verma", email: "sahil@heliorealty.com", role: "Manager", sendInvite: false },
        { id: makeMemberId(), name: "Tara Menon", email: "tara@heliorealty.com", role: "Member", sendInvite: false },
        { id: makeMemberId(), name: "Nikhil Bose", email: "nikhil@heliorealty.com", role: "Member", sendInvite: false },
        { id: makeMemberId(), name: "Zoya Khan", email: "zoya@heliorealty.com", role: "Viewer", sendInvite: false },
      ],
    }),
    creditAccounts: [
      {
        id: "ca_helio_1",
        index: 1,
        type: "paid",
        startDate: "2025-07-10", // 12-month contract → ends ~2026-07-10 (a few weeks out)
        contractMonths: 12,
        billingCycle: "Monthly",
        consumptionModel: "Postpaid",
        postpaidModel: "subscription",
        monthlyCreditLapse: true,
        creditsPerCycle: 9_500,
        totalCredits: 114_000,
        creditsUsed: 103_000,
        usage: {
          actions: 2280,
          activeMembers: 5,
          lastActiveDaysAgo: 1,
          dau: 4.4,
          dailyUsageMin: 28,
          trend: [150, 160, 140, 170, 180, 175, 160],
          byModule: [
            { moduleId: "ai_calling", pct: 50 },
            { moduleId: "extraction", pct: 22 },
            { moduleId: "enrichment", pct: 16 },
            { moduleId: "marketing", pct: 12 },
          ],
        },
        enabledModuleIds: ["ai_calling", "extraction", "enrichment", "marketing"],
        rateCard: buildRateCard(["ai_calling", "extraction", "enrichment", "marketing"]),
        pricingLocked: true,
      },
    ],
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

  // Resolve dependencies — selecting a module pulls in what it requires
  // (Outreach ⇒ AI Calling), so the saved set is always consistent.
  const moduleIds = new Set(input.moduleIds);
  for (const mid of input.moduleIds) {
    const mod = MODULE_CATALOG.find((m) => m.id === mid);
    if (mod?.requires) moduleIds.add(mod.requires);
  }
  const enabledModuleIds = [...moduleIds];

  // Which meters belong to the selected modules.
  const enabledMeters = new Set(
    enabledModuleIds.flatMap((mid) => {
      const mod = MODULE_CATALOG.find((m) => m.id === mid);
      return mod ? moduleMeterIds(mod) : [];
    }),
  );

  const billing = defaultBilling({
    clientName: name,
    industry: input.industry,
    // Explicit enablement is the source of truth — covers meterless modules
    // (Outreach, Spot, Marketing) that the rate card can't represent.
    enabledModuleIds,
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
 * Create a free-trial (sandbox) org from the quick on-call flow: every module
 * on, credit-metered, the customer added as the admin member. Returns the org
 * plus the access link to hand to the customer.
 */
export function createSandbox(input: {
  name: string;
  industry?: Industry;
  customerEmail: string;
  creditsPerCycle: number;
  totalCredits: number;
  /** When the credit system starts applying (ISO date). Defaults to today;
   *  can be future-dated to schedule the trial. */
  startDate?: string;
  validityDays: number;
}): { client: Client; link: string } {
  const name = input.name.trim();
  const email = input.customerEmail.trim();
  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org";
  const rand = (n: number) => Math.random().toString(36).slice(2, 2 + n);
  const id = `${slug}-${rand(8)}`;
  const orgId = `org_${rand(16)}`;
  const today = input.startDate || new Date().toISOString().slice(0, 10);

  const billing = defaultBilling({
    clientName: name,
    industry: input.industry ?? "Other",
    enabledModuleIds: [...ALL_MODULE_IDS],
    workspaces: [
      { id: makeWorkspaceId(), name: `${name} — Default`, description: "Default workspace" },
    ],
    members: [
      { id: makeMemberId(), name: email.split("@")[0] || "Admin", email, role: "Admin", sendInvite: true },
    ],
  });

  const client: Client = {
    id,
    orgId,
    name,
    status: "Sandbox",
    contractStart: today,
    primaryContact: email,
    billing,
    trial: {
      credits: input.totalCredits,
      creditsPerCycle: input.creditsPerCycle,
      creditsUsed: 0,
      validityDays: input.validityDays,
      startedAt: today,
      customerEmail: email,
    },
  };
  clients.unshift(client);
  const link = `https://app.revspot.ai/t/${id}?invite=${rand(20)}`;
  return { client, link };
}

/** Convert a sandbox to a contractual org — drop the trial, mark Active.
 *  Module/pricing config then happens in the org's Modules + Pricing tabs. */
export function convertToContract(id: string): void {
  const c = findClient(id);
  if (!c) return;
  c.status = "Active";
  c.trial = undefined;
}

/* ─── Credit accounts (versioned per-org contracts) ───────────────────── */

export type CreditAccountStatus = "draft" | "scheduled" | "active" | "ended";

/** A paid account isn't live until its modules + pricing are confirmed (locked).
 *  Trials are active on creation (all modules on at standard rates). */
const isActivated = (a: CreditAccount): boolean => a.type === "trial" || !!a.pricingLocked;

/** Build a rate card for a set of modules — every meter at its default rate,
 *  enabled only for the chosen modules. */
export function buildRateCard(enabledModuleIds: string[]): RateCard {
  const enabledMeters = new Set(
    enabledModuleIds.flatMap((mid) => {
      const m = MODULE_CATALOG.find((mm) => mm.id === mid);
      return m ? moduleMeterIds(m) : [];
    }),
  );
  return Object.fromEntries(
    PRODUCT_CATALOGUE.map((p) => [
      p.id,
      { enabled: enabledMeters.has(p.id), creditsPerUnit: DEFAULT_RATES[p.id] ?? 0 },
    ]),
  );
}

const daysSince = (iso: string): number =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** A credit account's applicability window in days (trial validity or contract months). */
export function accountPeriodDays(a: CreditAccount): number {
  if (a.validityDays != null) return a.validityDays;
  if (a.contractMonths != null) return a.contractMonths * 30;
  return 0;
}

export interface BillingCycleRow {
  index: number; // 1-based
  start: string; // ISO
  end: string; // ISO
  creditsUsed: number; // money utilized in this cycle (₹)
  status: "billed" | "current";
  invoiceId?: string; // present once the cycle is billed
}

/** Monthly billing cycles for a paid account — every completed (billed) cycle
 *  plus the current one, newest first, with money utilized and an invoice id
 *  for billed cycles. Empty for trials or paid accounts without a fixed term. */
export function billingCycles(a: CreditAccount): BillingCycleRow[] {
  if (a.type !== "paid") return [];
  if (!a.pricingLocked) return []; // draft — not activated yet
  const months = a.contractMonths ?? 0;
  if (!months) return []; // prepaid / PAYG without a fixed term
  if (daysSince(a.startDate) < 0) return []; // scheduled — contract hasn't started
  const elapsed = Math.max(0, Math.floor(daysSince(a.startDate) / 30));
  const lastIdx = Math.min(elapsed, months - 1); // cap at contract length
  const start = new Date(a.startDate);
  const rows: BillingCycleRow[] = [];
  for (let i = 0; i <= lastIdx; i++) {
    const cs = new Date(start);
    cs.setMonth(cs.getMonth() + i);
    const ce = new Date(start);
    ce.setMonth(ce.getMonth() + i + 1);
    const billed = i < elapsed; // completed cycles are billed
    // Deterministic mock of money utilized per cycle.
    const used = billed
      ? Math.round(a.creditsPerCycle * (0.7 + ((i * 13) % 28) / 100))
      : Math.round(a.creditsPerCycle * 0.4);
    rows.push({
      index: i + 1,
      start: cs.toISOString().slice(0, 10),
      end: ce.toISOString().slice(0, 10),
      creditsUsed: used,
      status: billed ? "billed" : "current",
      invoiceId: billed ? `INV-${a.id}-${i + 1}` : undefined,
    });
  }
  return rows.reverse(); // newest (current) first
}

/** Effective status, start-date aware so only ONE account is active at a time:
 *  - future start date → Scheduled (not yet active; the current one stays active);
 *  - superseded by a newer account that has ALREADY started → Ended;
 *  - the current started account → Active until its period elapses (then Ended). */
export function creditAccountStatus(c: Client, a: CreditAccount): CreditAccountStatus {
  const accounts = c.creditAccounts ?? [];
  // Not confirmed yet (paid awaiting modules + pricing) → Draft. A draft never
  // supersedes the current account, so a trial stays live until paid is activated.
  if (!isActivated(a)) return "draft";
  if (daysSince(a.startDate) < 0) return "scheduled"; // starts in the future
  // Superseded only by a newer account that is itself activated AND has started.
  const superseded = accounts.some(
    (x) => x.index > a.index && isActivated(x) && daysSince(x.startDate) >= 0,
  );
  if (superseded) return "ended";
  const period = accountPeriodDays(a);
  if (period > 0 && daysSince(a.startDate) >= period) return "ended"; // period elapsed
  return "active";
}

/** Next billing date (ISO) — only postpaid subscriptions recharge on a recurring
 *  cycle. Null for trials, prepaid (paid upfront), postpaid PAYG (billed for
 *  usage), or ended accounts. Scheduled accounts bill from their start date. */
export function nextBillingDate(c: Client, a: CreditAccount): string | null {
  if (!(a.consumptionModel === "Postpaid" && a.postpaidModel === "subscription")) return null;
  if (creditAccountStatus(c, a) === "ended") return null;
  if (daysSince(a.startDate) < 0) return a.startDate; // scheduled → first bill at start
  const d = new Date(a.startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  while (d <= now) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/** The org's currently-active credit account, if any. */
export function activeCreditAccount(c: Client): CreditAccount | undefined {
  return (c.creditAccounts ?? []).find((a) => creditAccountStatus(c, a) === "active");
}

/** A new credit account on an existing org is always Paid (trial→paid convert,
 *  or paid→paid renewal). Only a brand-new org can start as a trial. */
export function nextAccountType(c: Client): CreditAccountType {
  const accounts = c.creditAccounts ?? [];
  return accounts.length ? "paid" : "trial";
}

export interface CreditAccountInput {
  type: CreditAccountType;
  startDate: string;
  creditsPerCycle: number;
  totalCredits: number;
  validityDays?: number; // trial
  contractMonths?: number; // paid / renewal
  billingCycle?: "Monthly";
  consumptionModel?: ConsumptionModel;
  monthlyCreditLapse?: boolean;
  customerEmail?: string;
  enabledModuleIds: string[];
}

let creditAccountSeq = 0;
const makeCreditAccountId = () =>
  `ca_${(++creditAccountSeq).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function buildCreditAccount(index: number, input: CreditAccountInput): CreditAccount {
  return {
    id: makeCreditAccountId(),
    index,
    type: input.type,
    startDate: input.startDate,
    validityDays: input.validityDays,
    contractMonths: input.contractMonths,
    creditsPerCycle: input.creditsPerCycle,
    totalCredits: input.totalCredits,
    creditsUsed: 0,
    billingCycle: input.billingCycle,
    consumptionModel: input.consumptionModel,
    monthlyCreditLapse: input.monthlyCreditLapse,
    enabledModuleIds: input.enabledModuleIds,
    rateCard: buildRateCard(input.enabledModuleIds),
    customerEmail: input.customerEmail,
  };
}

/** Append a credit account (the "+ Credit Account" action). It becomes the
 *  active account; the prior latest one is superseded. */
export function addCreditAccount(id: string, input: CreditAccountInput): CreditAccount | undefined {
  const c = findClient(id);
  if (!c) return;
  const accounts = c.creditAccounts ?? (c.creditAccounts = []);
  const index = accounts.length ? Math.max(...accounts.map((a) => a.index)) + 1 : 1;
  const acc = buildCreditAccount(index, input);
  accounts.push(acc);
  c.status = "Active";
  return acc;
}

/** Create a brand-new org whose first credit account is `account`. Returns the
 *  org and (for a trial) the customer access link. */
export function createOrgWithCreditAccount(input: {
  name: string;
  industry: Industry;
  account: CreditAccountInput;
}): { client: Client; link: string } {
  const name = input.name.trim();
  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org";
  const rand = (n: number) => Math.random().toString(36).slice(2, 2 + n);
  const id = `${slug}-${rand(8)}`;
  const orgId = `org_${rand(16)}`;
  const email = input.account.customerEmail?.trim();

  const billing = defaultBilling({
    clientName: name,
    industry: input.industry,
    workspaces: [
      { id: makeWorkspaceId(), name: `${name} — Default`, description: "Default workspace" },
    ],
    members:
      input.account.type === "trial" && email
        ? [{ id: makeMemberId(), name: email.split("@")[0] || "Admin", email, role: "Admin", sendInvite: true }]
        : [],
  });

  const client: Client = {
    id,
    orgId,
    name,
    status: "Active",
    contractStart: input.account.startDate,
    primaryContact: email,
    billing,
    creditAccounts: [],
  };
  clients.unshift(client);
  addCreditAccount(id, input.account);

  const link = input.account.type === "trial" ? `https://app.revspot.ai/t/${id}?invite=${rand(20)}` : "";
  return { client, link };
}

/** Monitoring view for a credit account — credit/time burn-down, projection,
 *  at-risk flag. Mirrors TrialOverview so the panel can render either. */
export function creditAccountOverview(c: Client, a: CreditAccount): TrialOverview {
  const period = accountPeriodDays(a);
  const elapsedRaw = Math.max(0, daysSince(a.startDate));
  const daysElapsed = period ? Math.min(elapsedRaw, period) : elapsedRaw;
  const daysLeft = period ? Math.max(0, period - elapsedRaw) : 0;
  const creditsLeft = Math.max(0, a.totalCredits - a.creditsUsed);
  const creditsPct = a.totalCredits > 0 ? Math.round((creditsLeft / a.totalCredits) * 100) : 0;
  const expired = creditAccountStatus(c, a) === "ended";
  const burnPerDay = daysElapsed > 0 ? a.creditsUsed / daysElapsed : 0;
  return {
    daysLeft,
    creditsLeft,
    creditsPct,
    expired,
    endedBy: creditsLeft <= 0 ? "credits" : daysLeft <= 0 ? "time" : null,
    daysElapsed,
    daysTotal: period,
    creditsUsed: a.creditsUsed,
    creditsTotal: a.totalCredits,
    usedPct: a.totalCredits > 0 ? Math.round((a.creditsUsed / a.totalCredits) * 100) : 0,
    burnPerDay,
    projectedDaysLeft: burnPerDay > 0 ? Math.ceil(creditsLeft / burnPerDay) : null,
    atRisk: !expired && (daysLeft <= 5 || creditsPct <= 15),
  };
}

/** Extend a credit account's period (trial validity days, or contract months). */
export function extendCreditAccount(orgId: string, accountId: string, addDays: number): void {
  const a = findClient(orgId)?.creditAccounts?.find((x) => x.id === accountId);
  if (!a) return;
  if (a.validityDays != null) a.validityDays += addDays;
  else if (a.contractMonths != null) a.contractMonths += Math.ceil(addDays / 30);
}

/** Top up a credit account's total credits. */
export function addCreditAccountCredits(orgId: string, accountId: string, amount: number): void {
  const a = findClient(orgId)?.creditAccounts?.find((x) => x.id === accountId);
  if (a) a.totalCredits += amount;
}

/** Attach a manually-uploaded invoice (from Zoho) to a billing cycle. */
export function setCycleInvoice(
  orgId: string,
  accountId: string,
  cycleIndex: number,
  file: { name: string; url: string },
): void {
  const a = findClient(orgId)?.creditAccounts?.find((x) => x.id === accountId);
  if (!a) return;
  (a.invoices ??= {})[cycleIndex] = file;
}

/** Remove a manually-uploaded invoice from a billing cycle. */
export function removeCycleInvoice(orgId: string, accountId: string, cycleIndex: number): void {
  const a = findClient(orgId)?.creditAccounts?.find((x) => x.id === accountId);
  if (a?.invoices) delete a.invoices[cycleIndex];
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
