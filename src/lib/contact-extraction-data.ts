// Contact extraction domain: types + mock data + lightweight runs store.
// V1 ports app.revspot "Contact extraction" into launchpad. No new features.
//
// The product: give us a LinkedIn profile, we extract Phone / Personal email /
// Work email, and (if requested) verify them. Works in bulk (CSV of LinkedIn
// URLs) or single (one URL). Mirrors the Enrichment module's shape:
//   Dashboard (analytics) / Operations (bulk + single) / Database (every row).

"use client";

import { useEffect } from "react";
import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────────

export type CEContactType = "phone" | "personal_email" | "work_email";

// Per-field outcome. Phone uses verified/found/not_found; emails use
// verified(=deliverable)/risky/invalid/not_found. `pending` = still running.
export type CEFieldStatus =
  | "verified"
  | "found"
  | "risky"
  | "invalid"
  | "not_found"
  | "pending";

export interface CEFieldResult {
  value: string | null;
  status: CEFieldStatus;
}

export type CERunSource = "bulk" | "single";
export type CERunStatus = "in_progress" | "done" | "failed";

export interface CEContact {
  id: string;
  runId: string;
  name: string;
  title: string;
  company: string;
  location: string;
  linkedin: string;
  phone?: CEFieldResult;
  personalEmail?: CEFieldResult;
  workEmail?: CEFieldResult;
  extractedAt: string; // ISO
}

export interface CETypeCounts {
  requested: number; // profiles this type was asked for
  found: number; // a value was returned
  verified: number; // value confirmed (phone Match/Partial, email valid)
}

export interface CERun {
  id: string;
  source: CERunSource;
  label: string; // filename (bulk) or person name (single)
  createdAt: string; // ISO
  status: CERunStatus;
  progress: number; // 0..1 (only meaningful while in_progress)
  total: number; // profiles in the run
  requestedTypes: CEContactType[];
  verifyPhone: boolean;
  counts: Record<CEContactType, CETypeCounts>;
  contactIds: string[];
}

// ── Labels / display ───────────────────────────────────────────────────────

export const CE_TYPE_LABEL: Record<CEContactType, string> = {
  phone: "Phone",
  personal_email: "Personal email",
  work_email: "Work email",
};

export const CE_TYPE_SHORT: Record<CEContactType, string> = {
  phone: "Phone",
  personal_email: "Personal",
  work_email: "Work",
};

export const CE_STATUS_LABEL: Record<CEFieldStatus, string> = {
  verified: "Verified",
  found: "Found",
  risky: "Risky",
  invalid: "Invalid",
  not_found: "Not found",
  pending: "Pending",
};

// Tailwind class tuples for a status pill: [text, bg, border]
export const CE_STATUS_STYLE: Record<CEFieldStatus, string> = {
  verified: "text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]",
  found: "text-[#1E40AF] bg-[#EFF6FF] border-[#BFDBFE]",
  risky: "text-[#92400E] bg-[#FEF3C7] border-[#FDE68A]",
  invalid: "text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]",
  not_found: "text-text-tertiary bg-surface-secondary border-border-subtle",
  pending: "text-text-secondary bg-surface-secondary border-border-subtle",
};

// ── Mock data ───────────────────────────────────────────────────────────────

const FIRST = ["Avinash", "Priya", "Rahul", "Sneha", "Karthik", "Ananya", "Vikram", "Divya", "Arjun", "Meera", "Rohan", "Nisha", "Siddharth", "Pooja", "Aditya", "Kavya", "Manish", "Shreya", "Varun", "Ishita", "Nikhil", "Tanya", "Akash", "Riya"];
const LAST = ["Sinha", "Nair", "Kapoor", "Menon", "Reddy", "Sharma", "Iyer", "Verma", "Gupta", "Rao", "Joshi", "Bose", "Pillai", "Chopra", "Bhat", "Desai", "Khanna", "Mehta", "Saxena", "Patel"];
const TITLES = ["Co-founder & CTO", "Founder & CEO", "VP Engineering", "Head of Product", "Engineering Manager", "Senior Software Engineer", "Director of Sales", "Product Manager", "CTO", "Head of Growth", "Talent Lead", "VP People"];
const COMPANIES = ["Big Pluto Technologies", "Razorpay", "Zerodha", "Meesho", "CRED", "Postman", "Groww", "BrowserStack", "Hasura", "Chargebee", "Darwinbox", "Whatfix", "Innovaccer", "Yellow.ai", "Spinny", "Slice", "Khatabook", "Vedantu"];
const CITIES = ["Bengaluru, Karnataka, India", "Gurugram, Haryana, India", "Mumbai, Maharashtra, India", "Hyderabad, Telangana, India", "Pune, Maharashtra, India", "Chennai, Tamil Nadu, India", "Noida, Uttar Pradesh, India", "Delhi, India"];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Build a phone result given the verify flag and a random draw.
function phoneResult(rnd: () => number, verify: boolean): CEFieldResult {
  const r = rnd();
  // ~85% found overall; of found, ~62% verify-match when verification on.
  if (r > 0.85) return { value: null, status: "not_found" };
  const number = `+91 ${Math.floor(70000 + rnd() * 29999)} ${Math.floor(10000 + rnd() * 89999)}`;
  if (!verify) return { value: number, status: "found" };
  return { value: number, status: rnd() < 0.62 ? "verified" : "found" };
}

function emailResult(rnd: () => number, kind: "personal" | "work", first: string, last: string, company: string): CEFieldResult {
  const r = rnd();
  // Most profiles return an email now (~90% personal, ~85% work).
  const found = kind === "personal" ? r < 0.9 : r < 0.85;
  if (!found) return { value: null, status: "not_found" };
  const domain = kind === "personal" ? pick(rnd, ["gmail.com", "outlook.com", "yahoo.com"]) : `${slug(company)}.com`;
  const value = `${slug(first)}.${slug(last)}@${domain}`;
  const v = rnd();
  // personal emails verify cleaner (~78% valid) than work (~68%).
  const validCut = kind === "personal" ? 0.78 : 0.68;
  const status: CEFieldStatus = v < validCut ? "verified" : v < validCut + 0.16 ? "risky" : "invalid";
  return { value, status };
}

function emptyCounts(): Record<CEContactType, CETypeCounts> {
  return {
    phone: { requested: 0, found: 0, verified: 0 },
    personal_email: { requested: 0, found: 0, verified: 0 },
    work_email: { requested: 0, found: 0, verified: 0 },
  };
}

function tally(counts: Record<CEContactType, CETypeCounts>, type: CEContactType, res: CEFieldResult | undefined) {
  if (!res) return;
  counts[type].requested += 1;
  if (res.status !== "not_found" && res.status !== "pending") counts[type].found += 1;
  if (res.status === "verified") counts[type].verified += 1;
}

interface GenRunOpts {
  id: string;
  source: CERunSource;
  label: string;
  createdAt: string;
  total: number;
  requestedTypes: CEContactType[];
  verifyPhone: boolean;
  status?: CERunStatus;
  progress?: number;
  seed: number;
  /** Force the first contact's name (used for single lookups). */
  nameOverride?: string;
}

function generateRun(opts: GenRunOpts): { run: CERun; contacts: CEContact[] } {
  const rnd = mulberry32(opts.seed);
  const counts = emptyCounts();
  const contacts: CEContact[] = [];
  const wants = (t: CEContactType) => opts.requestedTypes.includes(t);

  for (let i = 0; i < opts.total; i++) {
    let first = pick(rnd, FIRST);
    let last = pick(rnd, LAST);
    const company = pick(rnd, COMPANIES);
    // Single lookups carry the real looked-up name through to the one contact.
    if (i === 0 && opts.nameOverride) {
      const parts = opts.nameOverride.trim().split(/\s+/);
      first = parts[0] || first;
      last = parts.slice(1).join(" ") || last;
    }
    const name = `${first} ${last}`;
    // Verification is always on now — every requested contact is verified by
    // default. A result that can't be confirmed still returns the value, just
    // without the verified mark.
    const phone = wants("phone") ? phoneResult(rnd, true) : undefined;
    const personalEmail = wants("personal_email") ? emailResult(rnd, "personal", first, last, company) : undefined;
    const workEmail = wants("work_email") ? emailResult(rnd, "work", first, last, company) : undefined;

    tally(counts, "phone", phone);
    tally(counts, "personal_email", personalEmail);
    tally(counts, "work_email", workEmail);

    contacts.push({
      id: `${opts.id}-c${i}`,
      runId: opts.id,
      name,
      title: pick(rnd, TITLES),
      company,
      location: pick(rnd, CITIES),
      linkedin: `https://www.linkedin.com/in/${slug(first)}${slug(last)}/`,
      phone,
      personalEmail,
      workEmail,
      extractedAt: opts.createdAt,
    });
  }

  const run: CERun = {
    id: opts.id,
    source: opts.source,
    label: opts.label,
    createdAt: opts.createdAt,
    status: opts.status ?? "done",
    progress: opts.progress ?? 1,
    total: opts.total,
    requestedTypes: opts.requestedTypes,
    verifyPhone: true, // verification is always on
    counts,
    contactIds: contacts.map((c) => c.id),
  };
  return { run, contacts };
}

function iso(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Single lookups — one looked-up profile each. Enough rows to exercise the
// 10-per-page pagination on the single-lookup history. Name drives the contact
// (via nameOverride); company/title/location come from the seeded generator.
const SINGLE_LOOKUPS: { name: string; daysAgo: number; hour: number; types: CEContactType[]; verify: boolean; seed: number }[] = [
  { name: "Akash Khanna", daysAgo: 5, hour: 11, types: ["phone", "work_email"], verify: true, seed: 311 },
  { name: "Riya Bose", daysAgo: 14, hour: 16, types: ["personal_email", "work_email"], verify: false, seed: 312 },
  { name: "Avinash Sinha", daysAgo: 6, hour: 14, types: ["phone", "work_email"], verify: false, seed: 303 },
  { name: "Priya Nair", daysAgo: 15, hour: 9, types: ["personal_email", "work_email"], verify: false, seed: 606 },
  { name: "Rahul Kapoor", daysAgo: 1, hour: 10, types: ["phone", "personal_email", "work_email"], verify: true, seed: 313 },
  { name: "Sneha Menon", daysAgo: 2, hour: 13, types: ["phone", "work_email"], verify: true, seed: 314 },
  { name: "Karthik Reddy", daysAgo: 3, hour: 15, types: ["work_email"], verify: false, seed: 315 },
  { name: "Ananya Sharma", daysAgo: 4, hour: 12, types: ["phone", "personal_email"], verify: true, seed: 316 },
  { name: "Vikram Iyer", daysAgo: 7, hour: 17, types: ["phone", "work_email"], verify: true, seed: 317 },
  { name: "Divya Verma", daysAgo: 8, hour: 11, types: ["personal_email", "work_email"], verify: false, seed: 318 },
  { name: "Arjun Gupta", daysAgo: 9, hour: 14, types: ["phone", "personal_email", "work_email"], verify: true, seed: 319 },
  { name: "Meera Rao", daysAgo: 10, hour: 10, types: ["work_email"], verify: false, seed: 320 },
  { name: "Rohan Joshi", daysAgo: 11, hour: 16, types: ["phone", "work_email"], verify: false, seed: 321 },
  { name: "Nisha Pillai", daysAgo: 12, hour: 9, types: ["phone", "personal_email"], verify: true, seed: 322 },
  { name: "Siddharth Chopra", daysAgo: 13, hour: 13, types: ["phone", "work_email"], verify: true, seed: 323 },
  { name: "Pooja Bhat", daysAgo: 16, hour: 15, types: ["personal_email", "work_email"], verify: false, seed: 324 },
  { name: "Aditya Desai", daysAgo: 18, hour: 11, types: ["phone", "work_email"], verify: true, seed: 325 },
  { name: "Kavya Mehta", daysAgo: 20, hour: 14, types: ["work_email"], verify: false, seed: 326 },
  { name: "Manish Saxena", daysAgo: 23, hour: 10, types: ["phone", "personal_email", "work_email"], verify: true, seed: 327 },
  { name: "Shreya Patel", daysAgo: 25, hour: 16, types: ["personal_email", "work_email"], verify: false, seed: 328 },
  { name: "Varun Sinha", daysAgo: 27, hour: 12, types: ["phone", "work_email"], verify: true, seed: 329 },
  { name: "Ishita Nair", daysAgo: 30, hour: 9, types: ["phone", "personal_email"], verify: true, seed: 330 },
  { name: "Nikhil Kapoor", daysAgo: 34, hour: 13, types: ["work_email"], verify: false, seed: 331 },
  { name: "Tanya Menon", daysAgo: 38, hour: 15, types: ["phone", "work_email"], verify: false, seed: 332 },
  { name: "Aryan Reddy", daysAgo: 42, hour: 11, types: ["phone", "personal_email", "work_email"], verify: true, seed: 333 },
];

const SINGLE_RUNS: GenRunOpts[] = SINGLE_LOOKUPS.map((s, i) => ({
  id: `cer-s${i + 1}`,
  source: "single" as const,
  label: s.name,
  createdAt: iso(s.daysAgo, s.hour),
  total: 1,
  requestedTypes: s.types,
  verifyPhone: s.verify,
  seed: s.seed,
}));

const SEED_RUNS: GenRunOpts[] = [
  { id: "cer-1", source: "bulk", label: "REVSPOT bULK - Telugu AIML.csv", createdAt: iso(2), total: 240, requestedTypes: ["phone", "personal_email", "work_email"], verifyPhone: true, seed: 101 },
  { id: "cer-2", source: "bulk", label: "founder 100 - Sheet1.csv", createdAt: iso(5), total: 100, requestedTypes: ["phone", "personal_email", "work_email"], verifyPhone: true, seed: 202 },
  { id: "cer-4", source: "bulk", label: "CTO LinkedIn - Sheet2.csv", createdAt: iso(9), total: 180, requestedTypes: ["personal_email", "work_email"], verifyPhone: false, seed: 404 },
  { id: "cer-5", source: "bulk", label: "Y Combinator - Yc list.csv", createdAt: iso(14), total: 320, requestedTypes: ["phone", "personal_email", "work_email"], verifyPhone: true, seed: 505 },
  { id: "cer-7", source: "bulk", label: "September Contacts - Sheet1.csv", createdAt: iso(21), total: 150, requestedTypes: ["phone", "personal_email", "work_email"], verifyPhone: true, seed: 707 },
  { id: "cer-8", source: "bulk", label: "Startups - Sheet1.csv", createdAt: iso(28), total: 210, requestedTypes: ["phone", "work_email"], verifyPhone: false, seed: 808 },
  ...SINGLE_RUNS,
];

function buildSeed(): { runs: CERun[]; contacts: CEContact[] } {
  const runs: CERun[] = [];
  const contacts: CEContact[] = [];
  for (const opts of SEED_RUNS) {
    const { run, contacts: cs } = generateRun(opts);
    runs.push(run);
    contacts.push(...cs);
  }
  return { runs, contacts };
}

// ── KPI helpers ──────────────────────────────────────────────────────────

export interface CEKpi {
  type: CEContactType;
  requested: number;
  found: number;
  verified: number;
  foundRate: number; // found / requested
  verifiedRate: number; // verified / requested
}

export function computeKpis(runs: CERun[]): CEKpi[] {
  const types: CEContactType[] = ["phone", "personal_email", "work_email"];
  return types.map((type) => {
    let requested = 0;
    let found = 0;
    let verified = 0;
    for (const r of runs) {
      if (r.status !== "done") continue;
      requested += r.counts[type].requested;
      found += r.counts[type].found;
      verified += r.counts[type].verified;
    }
    return {
      type,
      requested,
      found,
      verified,
      foundRate: requested ? found / requested : 0,
      verifiedRate: requested ? verified / requested : 0,
    };
  });
}

// ── Credits ─────────────────────────────────────────────────────────────────
//
// We block credits when a bulk run starts: 1 credit per requested contact type,
// per profile (e.g. 240 profiles × {phone, work} = 480 blocked). Every field we
// can't find is refunded, so you only pay for contacts we actually deliver.
//   blocked  = Σ requested        used = Σ found        refunded = blocked − used

export interface CETypeCredit {
  type: CEContactType;
  blocked: number; // credits held for this type (= profiles requested)
  used: number; // charged (= found)
  refunded: number; // returned (= blocked − used)
}

export interface CECredits {
  blocked: number;
  used: number;
  refunded: number;
  perType: CETypeCredit[];
}

export function runCredits(run: CERun): CECredits {
  const perType: CETypeCredit[] = run.requestedTypes.map((type) => {
    const c = run.counts[type];
    return { type, blocked: c.requested, used: c.found, refunded: c.requested - c.found };
  });
  const blocked = perType.reduce((a, t) => a + t.blocked, 0);
  const used = perType.reduce((a, t) => a + t.used, 0);
  return { blocked, used, refunded: blocked - used, perType };
}

// ── Sample CSV ─────────────────────────────────────────────────────────────

export const sampleCsvFilename = "linkedin-profiles-sample.csv";

export function sampleCsvDataUrl(): string {
  const rows = [
    "linkedin_url,first_name,last_name,company",
    "https://www.linkedin.com/in/avinashsinha/,Avinash,Sinha,Big Pluto Technologies",
    "https://www.linkedin.com/in/priyanair/,Priya,Nair,Razorpay",
    "https://www.linkedin.com/in/rahulkapoor/,Rahul,Kapoor,Zerodha",
    "https://www.linkedin.com/in/snehamenon/,Sneha,Menon,Meesho",
    "https://www.linkedin.com/in/karthikreddy/,Karthik,Reddy,CRED",
  ];
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.join("\n"))}`;
}

// ── Store ──────────────────────────────────────────────────────────────────

export interface NewRunInput {
  source: CERunSource;
  label: string;
  total: number;
  requestedTypes: CEContactType[];
  verifyPhone: boolean;
}

interface CEStore {
  runs: CERun[];
  contacts: CEContact[];
  addRun: (input: NewRunInput) => string;
  tickProgress: () => void;
  getRun: (id: string) => CERun | undefined;
  contactsForRun: (id: string) => CEContact[];
  reset: () => void;
}

let SEEDED = buildSeed();
let RUN_SEQ = 1000;

export const useCEStore = create<CEStore>((set, get) => ({
  runs: SEEDED.runs,
  contacts: SEEDED.contacts,

  addRun: (input) => {
    const id = `cer-new-${RUN_SEQ++}`;
    const { run, contacts } = generateRun({
      id,
      source: input.source,
      label: input.label,
      createdAt: new Date().toISOString(),
      total: input.total,
      requestedTypes: input.requestedTypes,
      verifyPhone: input.verifyPhone,
      status: "in_progress",
      progress: 0,
      seed: RUN_SEQ * 7 + input.total,
      nameOverride: input.source === "single" ? input.label : undefined,
    });
    set((s) => ({ runs: [run, ...s.runs], contacts: [...contacts, ...s.contacts] }));
    return id;
  },

  tickProgress: () => {
    set((s) => {
      let changed = false;
      const runs = s.runs.map((r) => {
        if (r.status !== "in_progress") return r;
        changed = true;
        const next = Math.min(1, r.progress + (r.source === "single" ? 0.34 : 0.18));
        return next >= 1 ? { ...r, progress: 1, status: "done" as const } : { ...r, progress: next };
      });
      return changed ? { runs } : {};
    });
  },

  getRun: (id) => get().runs.find((r) => r.id === id),
  contactsForRun: (id) => get().contacts.filter((c) => c.runId === id),
  reset: () => {
    SEEDED = buildSeed();
    set({ runs: SEEDED.runs, contacts: SEEDED.contacts });
  },
}));

// Advances any in_progress CE runs to completion. The page shell ticks the
// enrichment store, not this one, so each CE page mounts this hook to drive its
// own runs forward.
export function useCEProgressTicker() {
  const runs = useCEStore((s) => s.runs);
  const tickProgress = useCEStore((s) => s.tickProgress);
  const hasInFlight = runs.some((r) => r.status === "in_progress");
  useEffect(() => {
    if (!hasInFlight) return;
    const id = window.setInterval(() => tickProgress(), 900);
    return () => window.clearInterval(id);
  }, [hasInFlight, tickProgress]);
}
