// Mock auth directory for the OTP sign-in flow. Prototype only — no real
// backend. The flow is:
//
//   email  →  OTP  →  (multiple orgs ? choose org : straight to launchpad)
//
// A real build would POST the email to request a code, verify the code, then
// return the orgs the account can access. Here we fake all three with a
// static directory so the demo can exercise both the multi-org and single-org
// branches by typing a known email.

export type Org = {
  id: string;
  name: string;
  // First-letter avatar tile colour.
  color: string;
};

// The full account roster (mirrors the real "Choose an Organization" screen).
export const ORGS: Record<string, Org> = {
  dsr: { id: "dsr", name: "dsr", color: "#F5A623" },
  godrej: { id: "godrej", name: "Godrej", color: "#E8772E" },
  "godrej-blr": { id: "godrej-blr", name: "Godrej BLR (Analysis)", color: "#E8772E" },
  "godrej-internal": { id: "godrej-internal", name: "Godrej Internal", color: "#E8772E" },
  "godrej-mmr": { id: "godrej-mmr", name: "Godrej MMR", color: "#E8772E" },
  "godrej-mmr-analysis": { id: "godrej-mmr-analysis", name: "Godrej MMR (Analysis)", color: "#E8772E" },
  "godrej-ncr": { id: "godrej-ncr", name: "Godrej NCR", color: "#E8772E" },
  "godrej-pune": { id: "godrej-pune", name: "Godrej Pune", color: "#E8772E" },
  "godrej-south": { id: "godrej-south", name: "Godrej South", color: "#E8772E" },
  mana: { id: "mana", name: "Mana Projects", color: "#A855F7" },
  propstar: { id: "propstar", name: "Propstar", color: "#334155" },
};

// Static demo code. A real build would send this out-of-band; we surface it as
// a hint on the OTP screen so the flow is testable.
export const DEMO_OTP = "123456";

// email → org ids the account can access. Lower-cased keys.
const DIRECTORY: Record<string, string[]> = {
  // Multi-org account — matches the reference screenshot.
  "chirag@revspot.in": Object.keys(ORGS),
  // Regional lead — a single Godrej org, goes straight to the launchpad.
  "priya@godrejproperties.com": ["godrej-south"],
};

// Resolve the orgs for an email. Unknown emails get a single org derived from
// their domain so any address still completes the flow (and lands straight in
// the launchpad, exercising the single-org branch).
export function orgsForEmail(email: string): Org[] {
  const key = email.trim().toLowerCase();
  const ids = DIRECTORY[key];
  if (ids) return ids.map((id) => ORGS[id]).filter(Boolean);

  const domain = key.split("@")[1] || "your-company.com";
  const label = domain.split(".")[0] || "Workspace";
  const name = label.charAt(0).toUpperCase() + label.slice(1);
  return [{ id: `solo-${label}`, name, color: "#E8772E" }];
}

// Mask an email for display on the OTP screen: "chirag@revspot.in" →
// "c••••@revspot.in". Keeps the first local char + the full domain.
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return email;
  const head = local.charAt(0);
  return `${head}${"•".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}
