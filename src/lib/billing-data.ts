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
  name: string;
  /** What the unit being billed is (e.g. "per email", "per minute") */
  unit: string;
  /** Internal cost in INR (helpful for the admin to see margin) */
  internalCostRupees?: number;
  /** Description shown under the product name */
  description?: string;
}

// ── Product catalogue ────────────────────────────────────────────────────
export const PRODUCT_CATALOGUE: Product[] = [
  // Features (data ops)
  { id: "feat_email",    category: "Features", name: "Data Extraction — Email",       unit: "per email",    internalCostRupees: 1.53, description: "Cheap operation, high volume." },
  { id: "feat_phone",    category: "Features", name: "Data Extraction — Phone",       unit: "per phone",    internalCostRupees: 3.70, description: "More expensive data source." },
  { id: "feat_profile",  category: "Features", name: "Data Enrichment — Profile",     unit: "per profile",  internalCostRupees: 2.00, description: "Based on complexity / fields." },
  { id: "feat_finance",  category: "Features", name: "Data Enrichment — Financial",   unit: "per profile",  internalCostRupees: 10.0, description: "Financial data overlay." },
  // Agents
  { id: "agent_chat",    category: "Agents",   name: "Agent — Chat",                  unit: "per conversation",  description: "2–5 credits based on message count." },
  { id: "agent_voice",   category: "Agents",   name: "Agent — Voice",                 unit: "per minute",        description: "$0.10–$0.30/min cost base, 2–3× markup." },
  { id: "agent_spot",    category: "Agents",   name: "Spot Revenue Intelligence",     unit: "per report",        description: "Complex multi-step analysis." },
  { id: "agent_ai_ri",   category: "Agents",   name: "AI Revenue Intelligence",       unit: "per report",        description: "Complex multi-step analysis." },
  { id: "agent_creative",category: "Agents",   name: "Creatives",                     unit: "per asset",         description: "Rates TBD — disabled by default." },
  { id: "agent_launcher",category: "Agents",   name: "Launcher",                      unit: "per launch",        description: "Rates TBD — disabled by default." },
  { id: "agent_optim",   category: "Agents",   name: "Optimizer",                     unit: "per optimization",  description: "Rates TBD — disabled by default." },
];

// ── Default rate card ────────────────────────────────────────────────────
//
// Single pay-as-you-go pricing model — no plan templates, no volume tiers,
// no seat fees. Admins set one ₹/credit rate and one overage rate per
// client, then configure how many credits each product consumes.
//
// Default per-product credit consumption (matches the Confluence pricing
// page; admins can override on a per-client basis in Step 2).
const DEFAULT_CREDIT_RATES: Record<string, number> = {
  feat_email: 1,   feat_phone: 8,    feat_profile: 5,  feat_finance: 16,
  agent_chat: 5,   agent_voice: 10,  agent_spot: 20,   agent_ai_ri: 20,
  agent_creative: 0, agent_launcher: 0, agent_optim: 0,
};

/** Default ₹/credit when a client is first created. */
export const DEFAULT_RUPEES_PER_CREDIT = 3.0;
/** Default overage ₹/credit (≥ rate; charged on usage beyond the cap). */
export const DEFAULT_OVERAGE_RUPEES_PER_CREDIT = 4.5;

// ── Client model ─────────────────────────────────────────────────────────
export type AccountType = "Sales & Outreach" | "Recruitment" | "Customer Support" | "Custom";
export type BillingCycle = "Monthly Billing" | "Quarterly Billing" | "Annual Billing";
export type ConsumptionModel = "Postpaid (Quota)" | "Prepaid (Wallet)";

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

export interface ClientBilling {
  // Basics shown in the original "Setup Credit Account" card
  accountType: AccountType;
  billingCycle: BillingCycle;
  consumptionModel: ConsumptionModel;
  contractMonths: number;
  initialCreditsPerCycle: number;
  globalDailyLimit: number;
  enableMonthlyLapse: boolean;
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
  // Step 3 — organisation members + activation
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
    billing: undefined,
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
export function defaultBilling(): ClientBilling {
  return {
    accountType: "Sales & Outreach",
    billingCycle: "Monthly Billing",
    consumptionModel: "Postpaid (Quota)",
    contractMonths: 12,
    initialCreditsPerCycle: 2500,
    globalDailyLimit: 5000,
    enableMonthlyLapse: false,
    seatCount: 1,
    rateCard: Object.fromEntries(
      PRODUCT_CATALOGUE.map((p) => [
        p.id,
        {
          enabled: DEFAULT_CREDIT_RATES[p.id] > 0,
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
    members: [
      { id: makeMemberId(), name: "", email: "", role: "Admin", sendInvite: true },
    ],
    activationDate: defaultActivationDate(),
  };
}

let _memberCounter = 0;
export function makeMemberId(): string {
  // Stable enough for a demo; for prod use crypto.randomUUID().
  _memberCounter += 1;
  return `mem_${Date.now().toString(36)}_${_memberCounter}`;
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
