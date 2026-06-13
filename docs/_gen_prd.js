const g = require("./_gen_docs.js");
const { P, H1, H2, H3, bullet, num, runs, R, table, spacer, sectionProps, titleBlock, build } = g;

const children = [];
const add = (...x) => x.forEach(e => children.push(e));

// ---- Title + TOC ----
add(...titleBlock(
  "Wallet, Utilization & Billing",
  "Product Requirements Document (PRD)",
  [
    ["Field", "Detail"],
    ["Product", "Revspot — Agency consumption & billing"],
    ["Document type", "Product Requirements Document"],
    ["Version", "1.0 (derived from prototype source, 2026-06-07)"],
    ["Status", "Draft for review"],
    ["Author", "Rahul Soren"],
    ["Last updated", "2026-06-08"],
    ["Related", "Technical Specification — Wallet, Utilization & Billing"],
  ]
));

// ---- 1. Summary ----
add(H1("1. Executive Summary"));
add(P("Revspot lets agencies consume three metered things on the platform: contact extraction (phones and emails), enrichment (professional and financial lookups), and AI calling minutes. Agencies pay either upfront (prepaid) or in arrears (postpaid)."));
add(P("The original experience collapsed three distinct concepts — what was bought, what was consumed, and what is owed — into a single “Wallet” page. That forced misleading language: a postpaid customer has no balance, yet saw a “Remaining” number; a prepaid customer gets no month-end invoice, yet saw an “Estimated bill.”"));
add(P("This PRD splits the experience into three clean concepts, each with its own home in the product:"));
add(table([3000, 6360], [
  ["Concept", "Plain-language definition"],
  ["Utilization", "What I used, in units (calls, minutes, lookups)."],
  ["Billing", "The money side — balance and spend, or estimated bill and cap."],
  ["Wallet", "The bucket of rupees I've put in (prepaid only)."],
]));
add(P("The result is one mental model the user can hold in their head, a Utilization page that works identically for both billing modes, and a mode-aware Billing page that tells each customer the truth about their money.", { italics: true }));

// ---- 2. Problem ----
add(H1("2. Problem Statement"));
add(P("Agency owners ask three different questions about their account, and the previous single-page “Wallet” conflated all of them, producing answers that were wrong for at least one customer type at all times."));
add(table([4680, 4680], [
  ["The question the user asks", "The concept that answers it"],
  ["“How much have I used this month?”", "Utilization (units)"],
  ["“How much money is left in my account?”", "Wallet (rupees)"],
  ["“What is my bill going to be?”", "Billing (rupees)"],
]));
add(P("Mixing units and money in one widget meant the user had to mentally reconcile two number systems, and the same surface lied to whichever billing mode it wasn't built for. The cost of leaving this unsolved is ongoing support load (“where do I see my balance / usage?”), eroded trust when numbers don't match expectations, and friction in the recharge loop that directly gates revenue."));

// ---- 3. Goals ----
add(H1("3. Goals & Non-Goals"));
add(H2("3.1 Goals"));
add(P("Establish one mental model:", { bold: true }));
add(runs([R("“Utilization is what I used, in units. Billing is the money side. The Wallet (if I have one) is the bucket of rupees I've put in.”", { italics: true })]));
add(bullet("Make a single Utilization page work for both prepaid and postpaid — consumption is consumption regardless of how it's paid for."));
add(bullet("Make the Billing page mode-aware: prepaid sees balance + spend; postpaid sees estimated bill + spend cap."));
add(bullet("Support two prepaid sub-models without a separate page: Subscription (fixed monthly fee) and Pure prepaid (deposit + spend down)."));
add(bullet("Surface the wallet balance prominently where it matters (sidebar widget) and hide it cleanly where it doesn't (postpaid)."));
add(bullet("Reduce “where is my balance / usage” support tickets and shorten the time from a low-balance signal to an approved top-up."));

add(H2("3.2 Non-Goals (v1)"));
add(table([4400, 4960], [
  ["Out of scope", "Why"],
  ["Mid-cycle plan upgrade / downgrade / proration", "Separate initiative; adds billing-math complexity not needed to prove the model."],
  ["Multi-currency wallets in one workspace", "A workspace has one currency (INR), with USD as a display toggle only."],
  ["Real payment integration (Razorpay / Stripe)", "“Add money” / “Recharge” surface a request to a human approver for v1."],
  ["Per-product budgets / spend caps owned by the agency end-user", "Admin-only concern; premature for end-user UI."],
  ["Auto-recharge / auto-renew flows", "Depends on payment integration; deferred."],
  ["Mode flip mid-cycle (prepaid ↔ postpaid)", "Requires closing and reopening a cycle; admin operation, not a product flow."],
]));

// ---- 4. Mental model ----
add(H1("4. Mental Model — The Three Concepts"));
add(P("Each concept has its own home in the information architecture. The user is never asked to reconcile units and money in the same widget."));
add(table([2200, 2200, 2200, 2760], [
  ["Concept", "Unit", "Applies to", "Question it answers"],
  ["Wallet", "INR (rupees)", "Prepaid only", "How much money do I have left to spend?"],
  ["Utilization", "Units (calls, mins, lookups)", "Both modes", "How much have I used this period?"],
  ["Billing", "INR (rupees)", "Both modes", "What does my month look like financially?"],
]));

// ---- 5. Modes ----
add(H1("5. Billing Modes"));
add(H2("5.1 Prepaid — Subscription"));
add(bullet("Agency pays a fixed monthly fee (the plan baseline, e.g. ₹2,00,000/month). On cycle start this amount becomes the available balance."));
add(bullet("If they burn through it mid-cycle, they can request a top-up, which accrues on top of the plan baseline for that cycle."));
add(bullet("New cycle resets the plan baseline. The unused portion of top-ups carries over."));
add(H2("5.2 Prepaid — Pure prepaid"));
add(bullet("No fixed fee. The agency deposits whatever amount they want and spends it down."));
add(bullet("The wallet balance is simply the sum of all top-ups minus consumption."));
add(bullet("No cycle reset — there is no plan, just a running balance."));
add(P("The two prepaid sub-models differ only in the Billing hero. The Utilization page and the sidebar widget are identical.", { italics: true }));
add(H2("5.3 Postpaid"));
add(bullet("No wallet, no balance, no recharge."));
add(bullet("Spend accrues against an estimated bill for the cycle."));
add(bullet("Optional spend cap — if hit, all metered actions are blocked until the next cycle (or an admin lifts it), surfaced as a progress bar against the cap."));

// ---- 6. Balance states ----
add(H1("6. Balance States (prepaid only)"));
add(P("The wallet has four states that gate the user's ability to run new actions. Blocking is enforced in one place so every product surface inherits the same gate."));
add(table([1500, 2400, 2700, 2760], [
  ["State", "Trigger", "What the user sees", "Behaviour"],
  ["healthy", "> 25% remaining", "Default UI everywhere", "All actions allowed"],
  ["low", "≤ 25%, > 0", "Yellow warning banner; sidebar reads “Low”", "Allowed, but nudged to recharge"],
  ["empty", "= 0", "Red banner; sidebar reads “Empty”", "Actions blocked → “Send recharge request” modal"],
  ["expired", "Subscription cycle ended without renewal", "Red banner, different copy", "Same as empty, worded “Plan window lapsed”"],
]));

// ---- 7. IA ----
add(H1("7. Information Architecture"));
add(P("Utilization and Billing are separate pages. They share the same DateRangeSelector control but answer different questions."));
add(table([3400, 5960], [
  ["Location", "Purpose"],
  ["Sidebar → Wallet widget", "Prepaid only. INR. Shows ₹used / ₹total · X% · Top up. Click → /settings/utilization."],
  ["Settings → Account / Utilization", "Both modes. Units only. No money."],
  ["Settings → Account / Billing", "Both modes. Money only. Mode-aware hero."],
  ["Settings → Account / Agency, Workspace", "Account configuration."],
  ["Settings → Connections / Integrations", "External connections."],
]));

// ---- 8. Screens ----
add(H1("8. Screens"));
add(H2("8.1 Settings → Utilization (both modes)"));
add(P("Header: “Utilization”, current cycle dates, and a DateRangeSelector defaulting to the last 30 days.", { bold: false }));
add(H3("Widgets, top to bottom"));
add(num([R("Utilization by Product table", { bold: true }), R(" — one row per product (Contact Extraction, Enrichment, AI Calling), each expanding into its sub-capability rows (Phone extraction, Email extraction, Professional enrichment, etc.). Numbers are unit counts only (e.g. “9,000 phones”, “13,750 mins”). No rupees on this page.")]));
add(num([R("Utilization-over-time chart", { bold: true }), R(" — stacked area chart, one layer per capability, coloured per product. Tabs foreground a chosen product. Y-axis is plain unit counts; x-axis is date. The chart respects the DateRangeSelector.")]));
add(P("Date-filter behaviour: every number and chart bar recomputes when the range changes. The current cycle dates in the header do NOT change — they reflect the billing cycle, which is independent of the analysis window.", { italics: true }));

add(H2("8.2 Settings → Billing — Prepaid Subscription"));
add(P("Header: “Billing”, DateRangeSelector, and an Add money CTA (opens a “Request sent” modal)."));
add(P("Hero — 4-column breakdown of the current cycle:", { bold: true }));
add(table([2340, 2340, 2340, 2340], [
  ["Monthly plan", "Top-ups this cycle", "Used in last X days", "Remaining"],
  ["₹2,00,000", "+ ₹40,000", "₹X (range-dependent)", "₹Y"],
  ["charged on cycle start", "added via recharge", "X% of available", "available now"],
]));
add(bullet("Below the hero: a progress bar of usedPct against total available (planBaseline + topupBalance). Colour gradates grey (< 75%) → amber (≥ 75%) → red (≥ 90%)."));
add(bullet("Below the bar: a Plan-type switch toggling the demo between Subscription and Pure prepaid views."));
add(bullet("Below that: a Modules table — the same per-product breakdown as Utilization, but with rupee figures (spend per product, % of pool used)."));
add(bullet("Footer: Invoices list (cycle close → downloadable invoice)."));

add(H2("8.3 Settings → Billing — Prepaid Pure"));
add(P("Same scaffold, simpler hero — there is no plan baseline:"));
add(table([4680, 4680], [
  ["Used in last X days", "Remaining"],
  ["₹X", "₹Y"],
  ["X% of your ₹{topup} top-up balance", "available now"],
]));
add(P("Modules table and Invoices are identical to Subscription."));

add(H2("8.4 Settings → Billing — Postpaid"));
add(P("No wallet, no balance. Hero:"));
add(bullet("Estimated bill this cycle (₹X)."));
add(bullet("Spend cap (₹Y) with progress bar."));
add(bullet("Days until cycle close."));
add(bullet("“Set spend cap” CTA if none set; “Adjust cap” if a cap exists."));
add(P("Modules table and Invoices below, same as prepaid."));

add(H2("8.5 Sidebar wallet widget (prepaid only)"));
add(bullet("Compact widget at the bottom of the sidebar. Hidden under postpaid."));
add(bullet("The big number is rupees remaining / total — not units (e.g. ₹10,200 / ₹50,000 · 20%)."));
add(bullet("Visible regardless of which products the workspace has enabled (enrichment-only, calling-only, all three)."));
add(bullet("Click anywhere → routes to /settings/utilization. “Top up” → “Request sent” modal."));

// ---- 9. Flows ----
add(H1("9. Key User Flows"));
add(H3("9.1 First-time prepaid Subscription user"));
add(num("Onboarding sets mode=prepaid, prepaidPlanType=subscription, planBaseline=₹2L."));
add(num("User lands on /dashboard; sidebar widget shows ₹0 / ₹2,00,000 · 0%."));
add(num("User runs first outreach; each call deducts from the wallet at the contracted ₹/min rate."));
add(num("Cycle close: invoice generated for what was used (or zero — they still paid the ₹2L fee). New cycle resets balance to ₹2L."));
add(H3("9.2 Mid-cycle top-up (Subscription)"));
add(num("Wallet drops below 25% → balance=low → yellow banner on Billing + sidebar."));
add(num("User clicks Add money → estimator modal → picks amount (e.g. ₹50K)."));
add(num("Submit → “Request sent” modal; approver notified (admin tooling, out of product scope)."));
add(num("Once approved, the top-up appears in topupBalance; hero shows “Top-ups this cycle: + ₹50,000.”"));
add(H3("9.3 Subscription user runs out before cycle close"));
add(num("Wallet = 0 → balance=empty → red banner; sidebar reads “Empty.”"));
add(num("Any new action surface calls isBalanceBlocking() → true → action gated."));
add(num("Modal: “You're out of balance. Send a recharge request to your admin to keep running outreach.”"));
add(num("After top-up approval, balance becomes positive, banner clears, actions unblock."));
add(H3("9.4 Pure prepaid user"));
add(num("Onboarding sets mode=prepaid, prepaidPlanType=pure, planBaseline=0."));
add(num("Wallet shows ₹0 / ₹0; sidebar hints “Add money to start.”"));
add(num("User deposits ₹1L → topupBalance=1,00,000. Wallet now ₹0 / ₹1,00,000."));
add(num("Spend draws down topupBalance; same balance gating as subscription. No cycle reset."));
add(H3("9.5 Postpaid user approaching spend cap"));
add(num("User has a ₹5L cap; currently at ₹3.5L (70%)."));
add(num("Billing hero shows estimated bill ₹3.5L with cap progress at 70%."));
add(num("Approaching 90% → amber warning. At 100% → red, actions blocked: “Spend cap hit. Contact admin to lift it or wait until cycle close.”"));

// ---- 10. User stories ----
add(H1("10. User Stories"));
add(H3("Agency owner / admin"));
add(bullet("As an agency owner, I want to see how much money is left in my wallet at a glance, so that I know whether I can keep running campaigns."));
add(bullet("As an agency owner, I want to request a top-up when my balance is low, so that my team is never blocked mid-campaign."));
add(bullet("As a postpaid admin, I want to set a spend cap, so that I never get an unexpectedly large bill."));
add(bullet("As an admin, I want to download invoices at cycle close, so that I can reconcile against my accounting."));
add(H3("Operator / day-to-day user"));
add(bullet("As an operator, I want to see how much I've used this period in calls, minutes, and lookups, so that I can manage my consumption."));
add(bullet("As an operator, I want to filter usage by date range, so that I can compare this week to last."));
add(bullet("As an operator, I want a clear message when I'm out of balance, so that I know exactly what to do next instead of hitting a silent failure."));
add(P("Note on user-story format: stories follow “As a [user], I want [capability] so that [benefit].” Detailed, testable acceptance criteria for each requirement live in the companion Technical Specification.", { italics: true }));

// ---- 11. Requirements ----
add(H1("11. Requirements"));
add(H2("11.1 Must-Have (P0)"));
add(table([1100, 5460, 2800], [
  ["#", "Requirement", "Notes"],
  ["P0-1", "Separate Utilization (units) and Billing (money) pages; never mix units and money in one widget.", "Core mental model."],
  ["P0-2", "Utilization page renders identically for prepaid and postpaid.", "Consumption is mode-agnostic."],
  ["P0-3", "Mode-aware Billing hero: prepaid → balance + spend; postpaid → estimated bill + cap.", "No misleading numbers."],
  ["P0-4", "Two prepaid sub-models (Subscription, Pure prepaid) on the same Billing page, differing only in the hero.", "Driven by prepaidPlanType."],
  ["P0-5", "Four balance states (healthy / low / empty / expired) with banners and one shared blocking gate.", "isBalanceBlocking()."],
  ["P0-6", "Sidebar wallet widget (prepaid only) showing rupees remaining / total, hidden under postpaid.", "Routes to Utilization."],
  ["P0-7", "Shared DateRangeSelector recomputes windowed numbers but never touches cycle-to-date figures.", "See section 12."],
  ["P0-8", "Recharge / Add money CTAs open a “Request sent” modal routed to a human approver.", "No payment integration in v1."],
]));
add(H2("11.2 Nice-to-Have (P1)"));
add(bullet("Auto-approve top-ups via a saved payment mandate (depends on payment integration)."));
add(bullet("Suggested top-up amount based on burn rate (“at this pace you'll run out in N days”)."));
add(bullet("Per-capability “≈ ₹/unit” tooltip on Utilization rows to bridge units and money for owners who think in rupees."));
add(bullet("Email/notification when balance hits low and when a top-up is approved."));
add(H2("11.3 Future Considerations (P2)"));
add(bullet("Promotional / free-trial credits — reserve a promoBalance field consumed before topupBalance."));
add(bullet("Per-product budgets and end-user spend caps."));
add(bullet("Auto-recharge / auto-renew."));
add(bullet("Anniversary-aligned billing cycles and mid-cycle plan changes with proration."));

// ---- 12. Date filter ----
add(H1("12. Date-Range Filter Behaviour"));
add(P("Both Utilization and Billing share the DateRangeSelector. Keeping windowed and cycle-to-date numbers distinct is essential — the user needs both “the rolling 30-day picture” and “the cycle so far” without conflation."));
add(table([4680, 4680], [
  ["Preset", "Window"],
  ["Today / Yesterday", "1 day"],
  ["Last 7 days / This week", "7 days"],
  ["Last week", "the prior 7-day window"],
  ["Last 14 days", "14 days"],
  ["Last 30 days / This month", "30 days"],
  ["Last month", "the prior 30-day window"],
  ["Lifetime", "90 days (the data window)"],
]));
add(table([4680, 4680], [
  ["The filter DOES touch", "The filter does NOT touch"],
  ["Every number on the Utilization page (table sums, chart bars)", "The Monthly Plan number (cycle baseline)"],
  ["“Used in last X days” hero column on Billing", "Top-ups this cycle (cycle-to-date)"],
  ["Modules table spend column on Billing", "Cycle dates in the header"],
  ["Utilization-over-time chart's date axis", "Sidebar wallet widget (always cycle-to-date)"],
]));

// ---- 13. Metrics ----
add(H1("13. Success Metrics"));
add(table([4400, 4960], [
  ["Question", "Metric / target"],
  ["Do users understand the model?", "< 5% of support tickets contain “I don't see my balance” / “where do I check usage” in the first week."],
  ["Does the top-up flow work?", "Median time from balance=low detection to top-up approval < 24h."],
  ["Do users hit the empty state?", "< 10% of cycles end with balance=empty for > 1 hour."],
  ["Do they use the date-range filter?", "Range changed at least once on > 60% of Utilization sessions."],
  ["Sidebar widget engagement", "Click-through to /settings/utilization > 20% of widget views."],
]));
add(P("Leading indicators (days–weeks): support-ticket rate, top-up cycle time, filter usage, widget click-through. Lagging indicators (weeks–months): reduction in balance-related support load and improved retention of prepaid agencies.", { italics: true }));

// ---- 14. Recommended decisions ----
add(H1("14. Recommended Decisions"));
add(P("The prototype left several decisions open. Each is given a recommended default below, marked proposed — needs sign-off. Recommendations favour shipping a tight v1 and deferring anything that depends on payment integration.", { italics: true }));
add(table([400, 2600, 4000, 2360], [
  ["#", "Decision", "Recommendation", "Rationale"],
  ["1", "Top-up approval flow", "Manual admin approval for v1; auto-approve via saved mandate as P1.", "Keeps a human in the loop and avoids payment integration now."],
  ["2", "Plan-type lock-in (Subscription ↔ Pure)", "Locked within a cycle; switchable only at cycle boundary, admin-initiated, current cycle closed first.", "Avoids mid-cycle billing-math ambiguity."],
  ["3", "Spend-cap default (new postpaid)", "No cap by default; prompt admin at onboarding; suggest 2× trailing-month spend once history exists.", "Don't block legitimate usage on day one; nudge toward a sensible cap."],
  ["4", "Cycle alignment", "Calendar-month aligned for v1; anniversary as P2.", "Simpler, predictable invoicing."],
  ["5", "Invoice trigger", "Generate at cycle close; deliver next business day with “your bill is ready” email.", "Predictable, low-engineering."],
  ["6", "Daily-limit enforcement", "Backend-enforced batch + queue of excess; UI surfaces today's state.", "Never silently drop work."],
  ["7", "Multi-product concurrency at empty", "FIFO at the API gateway against a single shared pool, with atomic reserve-then-debit.", "Prevents overspend / double-spend races."],
  ["8", "Credit-unit display", "Keep rupees on Billing, units on Utilization; add an ≈ ₹/unit tooltip; validate with the owner persona.", "Preserves the clean split while bridging for rupee-thinkers."],
]));

// ---- 15. Edge cases ----
add(H1("15. Edge Cases"));
add(bullet([R("Zero-day cycle. ", { bold: true }), R("Utilization renders with zeros, not a broken empty state. “Used in last X days” shows available data when the range exceeds cycle age — never extrapolate.")]));
add(bullet([R("Currency display toggle (INR ↔ USD). ", { bold: true }), R("Workspace-level switch driving every monetary number; conversion rate fixed at module load for v1.")]));
add(bullet([R("Daily caps hit. ", { bold: true }), R("Enrichment provider caps at 6K records/day; excess is batched and queued for the next day, not dropped (see decision 6).")]));
add(bullet([R("Refunds / clawbacks. ", { bold: true }), R("Top-up rejection after spend is messy; admin-only handling.")]));
add(bullet([R("Sidebar widget under single-product workspaces. ", { bold: true }), R("Still rupees; hidden only when mode=postpaid.")]));
add(bullet([R("Mode flip mid-cycle. ", { bold: true }), R("Out of scope; requires closing the current cycle and opening a new one under the new mode.")]));

// ---- 16. Open questions ----
add(H1("16. Open Questions"));
add(table([5460, 3900], [
  ["Question", "Owner"],
  ["Final sign-off on the 8 recommended decisions in section 14", "Product + Finance"],
  ["Does the agency-owner persona think in rupees or in units? (validates decision 8)", "Research / Design"],
  ["SLA and tooling for the human top-up approver", "Ops / Admin tooling"],
  ["Backend ledger source of truth replacing localStorage prototype state", "Engineering"],
  ["Notification channel for low-balance / approval events", "Product + Engineering"],
]));

// ---- 17. Appendix ----
add(H1("17. Appendix — Prototype Surfaces"));
add(P("For reference, these implemented surfaces are documented by this PRD and specified in the companion Technical Specification:"));
add(bullet("src/app/(app)/settings/wallet/page.tsx — Utilization + Billing page (router branches on view and billingMode)."));
add(bullet("src/components/layout/sidebar.tsx — sidebar wallet widget."));
add(bullet("src/lib/billing-mode-store.ts — mode + balance + plan-type state (Zustand + localStorage)."));
add(bullet("src/lib/credits-data.ts — pool, modules, daily series, helpers (utilizedInRange, poolSummary, sliceDailyToRange)."));
add(bullet("src/lib/daily-series.ts — workspace-wide daily series backbone."));

build("/sessions/busy-festive-lovelace/mnt/outputs/PRD-Wallet-Utilization-Billing.docx",
  [{ ...sectionProps("PRD — Wallet, Utilization & Billing"), children }])
  .then(() => console.log("PRD written"));
