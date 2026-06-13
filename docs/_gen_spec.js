const g = require("./_gen_docs.js");
const { P, H1, H2, H3, bullet, num, runs, R, table, spacer, sectionProps, titleBlock, build } = g;

const children = [];
const add = (...x) => x.forEach(e => children.push(e));

// monospace-ish code block: render as shaded single-cell table with Consolas
const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } = require("/usr/local/lib/node_modules_global/lib/node_modules/docx");
function code(lines) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: border, bottom: border, left: border, right: border },
      shading: { fill: "F6F8FA", type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      width: { size: 9360, type: WidthType.DXA },
      children: lines.map(l => new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: l || " ", font: "Consolas", size: 18 })] })),
    })] })],
  });
}

// ---- Title + TOC ----
add(...titleBlock(
  "Wallet, Utilization & Billing",
  "Technical Specification",
  [
    ["Field", "Detail"],
    ["Product", "Revspot — Agency consumption & billing"],
    ["Document type", "Technical Specification / Engineering Spec"],
    ["Version", "1.0 (derived from prototype source, 2026-06-07)"],
    ["Status", "Draft for engineering review"],
    ["Author", "Rahul Soren"],
    ["Last updated", "2026-06-08"],
    ["Companion", "PRD — Wallet, Utilization & Billing"],
  ]
));

// ---- 1. Overview ----
add(H1("1. Architecture Overview"));
add(P("The system models three concepts — Wallet (rupees), Utilization (units), Billing (money view) — over a per-workspace, per-cycle credit pool. The prototype encodes a credible model that a production billing-ledger service can mirror. State currently persists in localStorage; production reads from a ledger service of record."));
add(P("Key principle: all metered actions across the platform (outreach launch, contact extraction batch, enrichment batch, AI calling) consume from one shared pool and pass through a single blocking gate, so new product surfaces inherit balance enforcement for free."));
add(table([3200, 6160], [
  ["Layer", "Responsibility"],
  ["Ledger service (prod) / store (proto)", "Source of truth for pool, top-ups, spend, mode, plan type, balance state."],
  ["Helpers (credits-data.ts)", "Pure functions: utilizedInRange, poolSummary, sliceDailyToRange, isBalanceBlocking."],
  ["UI pages", "Utilization (units), Billing (money, mode-aware), sidebar widget."],
  ["API gateway", "Atomic reserve-then-debit on metered actions; FIFO ordering under contention."],
]));

// ---- 2. Data model ----
add(H1("2. Data Model"));
add(P("Current mock model (TypeScript). A production backend should mirror these shapes."));
add(H3("2.1 Credit pool — one per workspace per cycle"));
add(code([
  "CREDIT_POOL = {",
  "  totalCredits: 200000,   // INR per cycle (plan baseline if subscription)",
  "  utilized:     140000,   // sum of per-module utilized (INR)",
  "  periodStart:  Date,",
  "  periodEnd:    Date,",
  "}",
]));
add(H3("2.2 Module — per-product utilization"));
add(code([
  "Module = {",
  "  id, name, description,",
  "  utilized: number,         // INR for the cycle",
  "  capabilities: [{",
  "    label,                  // e.g. \"Talk time\"",
  "    creditsUsed,            // INR",
  "    unitCount,              // e.g. 13750 mins",
  "    unitLabel,              // e.g. \"min\"",
  "    rate,                   // INR/unit (contract rate)",
  "  }],",
  "  daily: [{ date, amount }],// 90-day daily series; amount = INR spent that day",
  "  dailyLimit?: {            // optional vendor-imposed cap",
  "    count, unit, used,      // e.g. 6000 records/day, 2400 used today",
  "  },",
  "}",
]));
add(H3("2.3 Billing-mode store"));
add(code([
  "mode:            \"prepaid\" | \"postpaid\"",
  "prepaidPlanType: \"subscription\" | \"pure\"",
  "balance:         \"healthy\" | \"low\" | \"empty\" | \"expired\"",
  "// Derived/aux fields:",
  "planBaseline:    number     // INR; 0 for pure prepaid",
  "topupBalance:    number     // INR carried/deposited top-ups",
  "spendCap?:       number     // INR; postpaid only",
  "// P2 reserve: promoBalance: number  // consumed before topupBalance",
]));
add(P("Production note: replace localStorage persistence with the billing-ledger service. balance should be derived server-side from pool figures, not stored as free-standing client state, to avoid drift.", { italics: true }));

// ---- 3. State machine ----
add(H1("3. Balance State Machine (prepaid)"));
add(P("Let pct = remaining / totalAvailable, where totalAvailable = planBaseline + topupBalance and remaining = totalAvailable − utilized."));
add(table([1500, 2400, 5460], [
  ["State", "Condition", "Transitions"],
  ["healthy", "pct > 0.25", "→ low when pct ≤ 0.25; → empty if pct hits 0 directly."],
  ["low", "0 < pct ≤ 0.25", "→ healthy on top-up raising pct > 0.25; → empty when remaining = 0."],
  ["empty", "remaining = 0", "→ healthy/low on approved top-up. Blocks actions."],
  ["expired", "subscription periodEnd passed without renewal", "→ healthy on cycle renewal. Blocks actions (copy: “Plan window lapsed”)."],
]));
add(P("Postpaid has no balance state; instead it gates on spendCap: blocked when estimatedBill ≥ spendCap.", { italics: true }));

// ---- 4. Mode matrix ----
add(H1("4. Mode × Surface Matrix"));
add(table([2400, 1750, 1750, 1750, 1710], [
  ["Surface", "Prepaid Sub", "Prepaid Pure", "Postpaid", "Source"],
  ["Sidebar wallet widget", "Shown (₹)", "Shown (₹)", "Hidden", "mode"],
  ["Utilization page", "Identical", "Identical", "Identical", "—"],
  ["Billing hero", "Plan + top-ups + used + remaining", "Used + remaining", "Est. bill + cap + days left", "mode, planType"],
  ["Plan-type switch", "Shown", "Shown", "Hidden", "mode"],
  ["Recharge / Add money", "Yes", "Yes", "No", "mode"],
  ["Invoices footer", "Yes", "Yes", "Yes", "—"],
]));

// ---- 5. Helpers / API ----
add(H1("5. Core Helpers & Functions"));
add(table([3000, 6360], [
  ["Function", "Contract"],
  ["isBalanceBlocking(mode, balance)", "→ boolean. The single gate. Returns true for prepaid empty/expired, or postpaid at/over cap. All action surfaces call this before metered work."],
  ["utilizedInRange(module|pool, start, end)", "→ INR sum over the daily series within [start, end]. Used by Utilization numbers and the Billing “Used in last X days” column."],
  ["poolSummary(pool, range)", "→ { totalAvailable, utilized, remaining, usedPct } for hero + progress bar."],
  ["sliceDailyToRange(daily, start, end)", "→ filtered daily series for chart axes."],
]));
add(H3("5.1 Proposed backend endpoints (production)"));
add(code([
  "GET  /api/billing/pool?cycle=current        -> pool + mode + planType + balance",
  "GET  /api/utilization?from&to               -> modules[] with windowed unit + INR sums",
  "POST /api/billing/topup-request {amount}    -> { requestId, status: 'pending' }",
  "GET  /api/billing/invoices                  -> invoice[] (downloadable URLs)",
  "POST /api/billing/spend-cap {amount}        -> postpaid only",
  "POST /api/actions/reserve {product, est}    -> { reservationId } | 402 if blocked",
  "POST /api/actions/commit  {reservationId}   -> debits pool atomically",
]));

// ---- 6. Acceptance criteria ----
add(H1("6. Component Specs & Acceptance Criteria"));

add(H2("6.1 Utilization page"));
add(bullet("Given any mode, when the page loads, then the by-product table and over-time chart render in unit counts only with no rupee figures."));
add(bullet("Given a date range is changed, when it is applied, then every table sum and chart bar recomputes; the header cycle dates do NOT change."));
add(bullet("Given a zero-day cycle, when the page loads, then it renders zeros (not a broken empty state)."));
add(bullet("Given a range wider than cycle age, when applied, then only available data is shown — no extrapolation."));

add(H2("6.2 Billing hero — prepaid subscription"));
add(bullet("Given prepaid+subscription, when the hero renders, then it shows Monthly plan, Top-ups this cycle, Used in last X days, and Remaining."));
add(bullet("Given usedPct, when the progress bar renders, then colour = grey (<75%), amber (≥75%), red (≥90%)."));
add(bullet("Given the date range changes, when applied, then only “Used in last X days” and the Modules spend column recompute; Monthly plan and Top-ups this cycle do NOT."));

add(H2("6.3 Billing hero — prepaid pure"));
add(bullet("Given prepaid+pure, when the hero renders, then it shows only Used in last X days and Remaining (no plan baseline)."));
add(bullet("Given a deposit is approved, when state updates, then topupBalance increases and Remaining reflects it."));

add(H2("6.4 Billing hero — postpaid"));
add(bullet("Given postpaid, when the hero renders, then it shows Estimated bill, Spend cap (if set) with progress bar, and Days until cycle close — and no balance/recharge UI."));
add(bullet("Given no cap set, when the hero renders, then a “Set spend cap” CTA appears; otherwise “Adjust cap.”"));
add(bullet("Given estimatedBill ≥ spendCap, when a metered action is attempted, then it is blocked with the cap-hit message."));

add(H2("6.5 Sidebar wallet widget"));
add(bullet("Given prepaid (any sub-model, any enabled products), when rendered, then it shows ₹remaining / ₹total and percent."));
add(bullet("Given mode=postpaid, when rendered, then the widget is hidden."));
add(bullet("Given a click anywhere on the widget, when handled, then it routes to /settings/utilization; “Top up” opens the request modal."));

add(H2("6.6 Blocking gate"));
add(bullet("Given balance ∈ {empty, expired}, when any metered action is attempted, then isBalanceBlocking returns true and the recharge-request modal appears."));
add(bullet("Given a new product surface is added, when it calls isBalanceBlocking before work, then it inherits identical gating with no bespoke logic."));

// ---- 7. Date filter spec ----
add(H1("7. Date-Range Filter Specification"));
add(table([4680, 4680], [
  ["Preset", "Window"],
  ["Today / Yesterday", "1 day"],
  ["Last 7 days / This week", "7 days"],
  ["Last week", "prior 7-day window"],
  ["Last 14 days", "14 days"],
  ["Last 30 days / This month", "30 days (default)"],
  ["Last month", "prior 30-day window"],
  ["Lifetime", "90 days (data window)"],
]));
add(table([4680, 4680], [
  ["Recomputes (windowed)", "Static (cycle-to-date)"],
  ["Utilization table sums & chart bars", "Monthly plan (cycle baseline)"],
  ["Billing “Used in last X days”", "Top-ups this cycle"],
  ["Modules spend column", "Header cycle dates"],
  ["Over-time chart date axis", "Sidebar wallet widget"],
]));

// ---- 8. Edge cases & enforcement ----
add(H1("8. Edge Cases & Enforcement"));
add(table([2600, 6760], [
  ["Case", "Required behaviour"],
  ["Zero-day cycle", "Render zeros; do not extrapolate when range > cycle age."],
  ["Currency toggle (INR↔USD)", "Workspace-level switch drives all monetary numbers; rate fixed at module load (v1)."],
  ["Daily cap hit (e.g. 6K records/day)", "Backend-enforced: batch + queue excess to next day; surface today's state in UI. Never silently drop."],
  ["Refund / clawback", "Admin-only; top-up rejection after spend handled out of the end-user flow."],
  ["Single-product workspace", "Widget still rupees; hidden only when postpaid."],
  ["Mode flip mid-cycle", "Out of scope; close current cycle, open new under new mode."],
  ["Multi-product concurrency at empty", "FIFO at API gateway; atomic reserve-then-debit to prevent overspend/double-spend."],
]));

// ---- 9. Non-functional ----
add(H1("9. Non-Functional Requirements"));
add(bullet("Consistency: balance derived server-side from pool figures to avoid client/server drift; client store is a cache."));
add(bullet("Atomicity: reserve-then-commit so concurrent metered actions cannot overspend a near-empty pool."));
add(bullet("Idempotency: top-up-request and commit endpoints must be idempotent (retry-safe via request/reservation IDs)."));
add(bullet("Auditability: every debit, top-up, and state transition recorded in the ledger for invoice reconciliation."));
add(bullet("Performance: utilizedInRange / sliceDailyToRange operate on a 90-day series; precompute daily rollups server-side for large workspaces."));

// ---- 10. Open technical questions ----
add(H1("10. Open Technical Questions"));
add(table([5460, 3900], [
  ["Question", "Owner"],
  ["Ledger service of record + migration off localStorage prototype state", "Backend"],
  ["Daily-limit enforcement: queue implementation and retry semantics", "Backend"],
  ["Concurrency model at the API gateway (FIFO, reservation TTLs)", "Backend / Platform"],
  ["Currency conversion source and refresh cadence (fixed vs. live)", "Backend"],
  ["Invoice generation trigger and delivery pipeline", "Backend / Ops"],
  ["Notification channel for low-balance / approval events", "Platform"],
]));

build("/sessions/busy-festive-lovelace/mnt/outputs/TechSpec-Wallet-Utilization-Billing.docx",
  [{ ...sectionProps("Tech Spec — Wallet, Utilization & Billing"), children }])
  .then(() => console.log("Spec written"));
