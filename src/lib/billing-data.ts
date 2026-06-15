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
export const PRODUCT_CATALOGUE: Product[] = [
  // Contact Enrichment — pulling email / phone for a contact
  { id: "feat_email",    category: "Features", bucket: "Contact Enrichment", name: "Email",     unit: "per email",   internalCostRupees: 1.53, description: "Cheap operation, high volume." },
  { id: "feat_phone",    category: "Features", bucket: "Contact Enrichment", name: "Phone",     unit: "per phone",   internalCostRupees: 3.70, description: "More expensive data source." },
  // Data Enrichment — adding context (profile / financial) to a contact
  { id: "feat_profile",  category: "Features", bucket: "Data Enrichment",    name: "Profile",   unit: "per profile", internalCostRupees: 2.00, description: "Based on complexity / fields." },
  { id: "feat_finance",  category: "Features", bucket: "Data Enrichment",    name: "Financial", unit: "per profile", internalCostRupees: 10.0, description: "Financial data overlay." },
  // Agents — only Voice Agent is live today.
  { id: "agent_voice",   category: "Agents",   bucket: "Agents", name: "Voice Agent", unit: "per minute", internalCostRupees: 4.5, description: "$0.10–$0.30/min cost base." },
];

// ── Default rate card ────────────────────────────────────────────────────
//
// Single pay-as-you-go pricing model — no plan templates, no volume tiers,
// no seat fees. Admins set one ₹/credit rate and one overage rate per
// client, then configure how many credits each product consumes.
//
// Default per-product credit consumption (matches the Confluence pricing
// page; admins can override on a per-client basis in Step 2).
// Default credits/unit = internal cost in ₹ (1 credit ≈ ₹1 baseline). Admin
// can override per client in Step 2.
const DEFAULT_CREDIT_RATES: Record<string, number> = {
  feat_email:    1.53,
  feat_phone:    3.70,
  feat_profile:  2.00,
  feat_finance:  10.0,
  agent_voice:   4.5,
};

/** Default ₹/credit when a client is first created. */
export const DEFAULT_RUPEES_PER_CREDIT = 3.0;
/** Default overage ₹/credit (≥ rate; charged on usage beyond the cap). */
export const DEFAULT_OVERAGE_RUPEES_PER_CREDIT = 4.5;

// ── Client model ─────────────────────────────────────────────────────────
/**
 * Billing cycle is currently fixed at "Monthly" for every client — we don't
 * support quarterly / annual cycles yet. The type stays a string union so
 * adding cycles later is non-breaking, but the UI shows it as read-only.
 */
export type BillingCycle = "Monthly";
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

export interface ClientBilling {
  // About the client — Step 1
  clientName: string;
  industry: Industry;
  // Account ownership (Revspot side) — Step 1
  kam: KeyAccountManager;
  // Contract & billing — Step 1
  accountType: AccountType;
  billingCycle: BillingCycle;   // always "Monthly" for now
  billingType: BillingType;
  contractMonths: number;
  initialCreditsPerCycle: number;
  globalDailyLimit: number;
  // Seats (derived from members in Step 3 of the wizard)
  seatCount: number;
  // Rate card — credits per unit of each product, plus enabled flag
  rateCard: Record<string, { enabled: boolean; creditsPerUnit: number }>;
  // Flat pay-as-you-go rate + overage (editable copies of the plan defaults)
  rupeesPerCredit: number;
  overageRupeesPerCredit: number;
  // Alerts + auto-recharge + expiry
  alertThresholdsPct: number[];
  autoRechargeAtPct: number | null;
  rolloverEnabled: boolean;
  rolloverCapCredits: number;
  /**
   * When true, finance generates an invoice automatically on the 1st of
   * each month for the previous cycle. When false, an admin must trigger
   * "Generate invoice now" manually from the active-client view.
   */
  autoInvoiceMonthly: boolean;
  /** ISO date of the last invoice this client received (manual or auto). */
  lastInvoiceDate?: string;
  // Step 3 — workspaces (sub-tenants under this organization)
  workspaces: Workspace[];
  // Step 4 — organisation members + activation
  members: OrgMember[];
  /** ISO date — when the credit account goes live. */
  activationDate: string;
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
  const b = defaultBilling({
    clientName: "Godrej Properties",
    industry: "Real Estate",
    accountType: "Sales & Outreach",
    billingType: "Postpaid",
    contractMonths: 24,
    initialCreditsPerCycle: 10000,
    globalDailyLimit: 7500,
    rupeesPerCredit: 2.5,
    overageRupeesPerCredit: 4.0,
    rolloverEnabled: true,
  });
  // Enable a realistic working set of products
  for (const id of ["feat_email", "feat_phone", "feat_profile", "agent_voice"]) {
    b.rateCard[id] = { ...b.rateCard[id], enabled: true };
  }
  b.kam = {
    name: "Neha Sharma",
    phone: "+91 98765 43210",
    email: "neha@revspot.ai",
    notifyOnActivation: false,
  };
  b.members = [
    { id: makeMemberId(), name: "Rohit Mehta",   email: "demo@godrejproperties.com",  role: "Admin",   sendInvite: false },
    { id: makeMemberId(), name: "Sanjana Kapur", email: "sanjana@godrejproperties.com", role: "Manager", sendInvite: false },
    { id: makeMemberId(), name: "Vikram Reddy",  email: "vikram@godrejproperties.com",  role: "Member",  sendInvite: false },
  ];
  b.seatCount = b.members.length;
  b.activationDate = "2025-09-12";
  // Active client — auto-invoicing on, last invoice was the start of this
  // billing cycle (1st of last month).
  b.autoInvoiceMonthly = true;
  b.lastInvoiceDate = "2026-05-01";
  b.workspaces = [
    { id: makeWorkspaceId(), name: "Godrej Properties — Mumbai", description: "Western region sales" },
    { id: makeWorkspaceId(), name: "Godrej Properties — Bengaluru", description: "South region sales" },
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
 * Initialise a fresh ClientBilling with pay-as-you-go defaults. Called when
 * the wizard opens for a client that hasn't been activated yet.
 */
export function defaultBilling(seed?: Partial<ClientBilling>): ClientBilling {
  return {
    clientName: "",
    industry: "Real Estate",
    kam: { name: "", phone: "", email: "", notifyOnActivation: true },
    accountType: "Sales & Outreach",
    billingCycle: "Monthly",
    billingType: "Postpaid",
    contractMonths: 12,
    initialCreditsPerCycle: 2500,
    globalDailyLimit: 5000,
    seatCount: 1,
    rateCard: Object.fromEntries(
      PRODUCT_CATALOGUE.map((p) => [
        p.id,
        {
          // Start every product OFF. Admin opts in product-by-product (or by
          // bucket) on Step 2. Step-2 validation gates Next until at least
          // one is on — forces a deliberate choice rather than accepting the
          // default catalogue.
          enabled: false,
          creditsPerUnit: DEFAULT_CREDIT_RATES[p.id] ?? 0,
        },
      ]),
    ),
    rupeesPerCredit: DEFAULT_RUPEES_PER_CREDIT,
    overageRupeesPerCredit: DEFAULT_OVERAGE_RUPEES_PER_CREDIT,
    alertThresholdsPct: [75, 90],
    autoRechargeAtPct: 80,
    rolloverEnabled: true,
    rolloverCapCredits: 2500,
    // Default behaviour for new clients: auto-generate at month-end. Admin
    // can opt out per-client and fall back to the manual button.
    autoInvoiceMonthly: true,
    // Start with one blank workspace — orgs need at least one to activate.
    workspaces: [
      { id: makeWorkspaceId(), name: "", description: "" },
    ],
    members: [
      { id: makeMemberId(), name: "", email: "", role: "Admin", sendInvite: true },
    ],
    activationDate: defaultActivationDate(),
    // Seed overrides — e.g. pre-fill clientName from Client record on new flows.
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
