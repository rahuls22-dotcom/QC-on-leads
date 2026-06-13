# Wallet, Utilization & Billing — Product Requirements Document (PRD)

| Field | Detail |
|---|---|
| Product | Revspot — Agency consumption & billing |
| Document type | Product Requirements Document |
| Version | 1.0 (derived from prototype source, 2026-06-07) |
| Status | Draft for review |
| Author | Rahul Soren |
| Last updated | 2026-06-08 |
| Related | Technical Specification — Wallet, Utilization & Billing |

---

## 1. Executive Summary

Revspot lets agencies consume three metered things on the platform: contact extraction (phones and emails), enrichment (professional and financial lookups), and AI calling minutes. Agencies pay either upfront (prepaid) or in arrears (postpaid).

The original experience collapsed three distinct concepts — what was bought, what was consumed, and what is owed — into a single "Wallet" page. That forced misleading language: a postpaid customer has no balance, yet saw a "Remaining" number; a prepaid customer gets no month-end invoice, yet saw an "Estimated bill."

This PRD splits the experience into three clean concepts, each with its own home in the product:

| Concept | Plain-language definition |
|---|---|
| Utilization | What I used, in units (calls, minutes, lookups). |
| Billing | The money side — balance and spend, or estimated bill and cap. |
| Wallet | The bucket of rupees I've put in (prepaid only). |

The result is one mental model the user can hold in their head, a Utilization page that works identically for both billing modes, and a mode-aware Billing page that tells each customer the truth about their money.

## 2. Problem Statement

Agency owners ask three different questions about their account, and the previous single-page "Wallet" conflated all of them, producing answers that were wrong for at least one customer type at all times.

| The question the user asks | The concept that answers it |
|---|---|
| "How much have I used this month?" | Utilization (units) |
| "How much money is left in my account?" | Wallet (rupees) |
| "What is my bill going to be?" | Billing (rupees) |

Mixing units and money in one widget meant the user had to mentally reconcile two number systems, and the same surface lied to whichever billing mode it wasn't built for. The cost of leaving this unsolved is ongoing support load ("where do I see my balance / usage?"), eroded trust when numbers don't match expectations, and friction in the recharge loop that directly gates revenue.

## 3. Goals & Non-Goals

### 3.1 Goals

Establish one mental model:

> "Utilization is what I used, in units. Billing is the money side. The Wallet (if I have one) is the bucket of rupees I've put in."

- Make a single Utilization page work for both prepaid and postpaid — consumption is consumption regardless of how it's paid for.
- Make the Billing page mode-aware: prepaid sees balance + spend; postpaid sees estimated bill + spend cap.
- Support two prepaid sub-models without a separate page: Subscription (fixed monthly fee) and Pure prepaid (deposit + spend down).
- Surface the wallet balance prominently where it matters (sidebar widget) and hide it cleanly where it doesn't (postpaid).
- Reduce "where is my balance / usage" support tickets and shorten the time from a low-balance signal to an approved top-up.

### 3.2 Non-Goals (v1)

| Out of scope | Why |
|---|---|
| Mid-cycle plan upgrade / downgrade / proration | Separate initiative; adds billing-math complexity not needed to prove the model. |
| Multi-currency wallets in one workspace | A workspace has one currency (INR), with USD as a display toggle only. |
| Real payment integration (Razorpay / Stripe) | "Add money" / "Recharge" surface a request to a human approver for v1. |
| Per-product budgets / spend caps owned by the agency end-user | Admin-only concern; premature for end-user UI. |
| Auto-recharge / auto-renew flows | Depends on payment integration; deferred. |
| Mode flip mid-cycle (prepaid ↔ postpaid) | Requires closing and reopening a cycle; admin operation, not a product flow. |

## 4. Mental Model — The Three Concepts

Each concept has its own home in the information architecture. The user is never asked to reconcile units and money in the same widget.

| Concept | Unit | Applies to | Question it answers |
|---|---|---|---|
| Wallet | INR (rupees) | Prepaid only | How much money do I have left to spend? |
| Utilization | Units (calls, mins, lookups) | Both modes | How much have I used this period? |
| Billing | INR (rupees) | Both modes | What does my month look like financially? |

## 5. Billing Modes

### 5.1 Prepaid — Subscription

- Agency pays a fixed monthly fee (the plan baseline, e.g. ₹2,00,000/month). On cycle start this amount becomes the available balance.
- If they burn through it mid-cycle, they can request a top-up, which accrues on top of the plan baseline for that cycle.
- New cycle resets the plan baseline. The unused portion of top-ups carries over.

### 5.2 Prepaid — Pure prepaid

- No fixed fee. The agency deposits whatever amount they want and spends it down.
- The wallet balance is simply the sum of all top-ups minus consumption.
- No cycle reset — there is no plan, just a running balance.

> The two prepaid sub-models differ only in the Billing hero. The Utilization page and the sidebar widget are identical.

### 5.3 Postpaid

- No wallet, no balance, no recharge.
- Spend accrues against an estimated bill for the cycle.
- Optional spend cap — if hit, all metered actions are blocked until the next cycle (or an admin lifts it), surfaced as a progress bar against the cap.

## 6. Balance States (prepaid only)

The wallet has four states that gate the user's ability to run new actions. Blocking is enforced in one place so every product surface inherits the same gate.

| State | Trigger | What the user sees | Behaviour |
|---|---|---|---|
| healthy | > 25% remaining | Default UI everywhere | All actions allowed |
| low | ≤ 25%, > 0 | Yellow warning banner; sidebar reads "Low" | Allowed, but nudged to recharge |
| empty | = 0 | Red banner; sidebar reads "Empty" | Actions blocked → "Send recharge request" modal |
| expired | Subscription cycle ended without renewal | Red banner, different copy | Same as empty, worded "Plan window lapsed" |

## 7. Information Architecture

Utilization and Billing are separate pages. They share the same DateRangeSelector control but answer different questions.

| Location | Purpose |
|---|---|
| Sidebar → Wallet widget | Prepaid only. INR. Shows ₹used / ₹total · X% · Top up. Click → /settings/utilization. |
| Settings → Account / Utilization | Both modes. Units only. No money. |
| Settings → Account / Billing | Both modes. Money only. Mode-aware hero. |
| Settings → Account / Agency, Workspace | Account configuration. |
| Settings → Connections / Integrations | External connections. |

## 8. Screens

### 8.1 Settings → Utilization (both modes)

Header: "Utilization", current cycle dates, and a DateRangeSelector defaulting to the last 30 days.

**Widgets, top to bottom:**

1. **Utilization by Product table** — one row per product (Contact Extraction, Enrichment, AI Calling), each expanding into its sub-capability rows (Phone extraction, Email extraction, Professional enrichment, etc.). Numbers are unit counts only (e.g. "9,000 phones", "13,750 mins"). No rupees on this page.
2. **Utilization-over-time chart** — stacked area chart, one layer per capability, coloured per product. Tabs foreground a chosen product. Y-axis is plain unit counts; x-axis is date. The chart respects the DateRangeSelector.

> Date-filter behaviour: every number and chart bar recomputes when the range changes. The current cycle dates in the header do NOT change — they reflect the billing cycle, which is independent of the analysis window.

### 8.2 Settings → Billing — Prepaid Subscription

Header: "Billing", DateRangeSelector, and an Add money CTA (opens a "Request sent" modal).

**Hero — 4-column breakdown of the current cycle:**

| Monthly plan | Top-ups this cycle | Used in last X days | Remaining |
|---|---|---|---|
| ₹2,00,000 | + ₹40,000 | ₹X (range-dependent) | ₹Y |
| charged on cycle start | added via recharge | X% of available | available now |

- Below the hero: a progress bar of usedPct against total available (planBaseline + topupBalance). Colour gradates grey (< 75%) → amber (≥ 75%) → red (≥ 90%).
- Below the bar: a Plan-type switch toggling the demo between Subscription and Pure prepaid views.
- Below that: a Modules table — the same per-product breakdown as Utilization, but with rupee figures (spend per product, % of pool used).
- Footer: Invoices list (cycle close → downloadable invoice).

### 8.3 Settings → Billing — Prepaid Pure

Same scaffold, simpler hero — there is no plan baseline:

| Used in last X days | Remaining |
|---|---|
| ₹X | ₹Y |
| X% of your ₹{topup} top-up balance | available now |

Modules table and Invoices are identical to Subscription.

### 8.4 Settings → Billing — Postpaid

No wallet, no balance. Hero:

- Estimated bill this cycle (₹X).
- Spend cap (₹Y) with progress bar.
- Days until cycle close.
- "Set spend cap" CTA if none set; "Adjust cap" if a cap exists.

Modules table and Invoices below, same as prepaid.

### 8.5 Sidebar wallet widget (prepaid only)

- Compact widget at the bottom of the sidebar. Hidden under postpaid.
- The big number is rupees remaining / total — not units (e.g. ₹10,200 / ₹50,000 · 20%).
- Visible regardless of which products the workspace has enabled (enrichment-only, calling-only, all three).
- Click anywhere → routes to /settings/utilization. "Top up" → "Request sent" modal.

## 9. Key User Flows

### 9.1 First-time prepaid Subscription user
1. Onboarding sets mode=prepaid, prepaidPlanType=subscription, planBaseline=₹2L.
2. User lands on /dashboard; sidebar widget shows ₹0 / ₹2,00,000 · 0%.
3. User runs first outreach; each call deducts from the wallet at the contracted ₹/min rate.
4. Cycle close: invoice generated for what was used (or zero — they still paid the ₹2L fee). New cycle resets balance to ₹2L.

### 9.2 Mid-cycle top-up (Subscription)
1. Wallet drops below 25% → balance=low → yellow banner on Billing + sidebar.
2. User clicks Add money → estimator modal → picks amount (e.g. ₹50K).
3. Submit → "Request sent" modal; approver notified (admin tooling, out of product scope).
4. Once approved, the top-up appears in topupBalance; hero shows "Top-ups this cycle: + ₹50,000."

### 9.3 Subscription user runs out before cycle close
1. Wallet = 0 → balance=empty → red banner; sidebar reads "Empty."
2. Any new action surface calls isBalanceBlocking() → true → action gated.
3. Modal: "You're out of balance. Send a recharge request to your admin to keep running outreach."
4. After top-up approval, balance becomes positive, banner clears, actions unblock.

### 9.4 Pure prepaid user
1. Onboarding sets mode=prepaid, prepaidPlanType=pure, planBaseline=0.
2. Wallet shows ₹0 / ₹0; sidebar hints "Add money to start."
3. User deposits ₹1L → topupBalance=1,00,000. Wallet now ₹0 / ₹1,00,000.
4. Spend draws down topupBalance; same balance gating as subscription. No cycle reset.

### 9.5 Postpaid user approaching spend cap
1. User has a ₹5L cap; currently at ₹3.5L (70%).
2. Billing hero shows estimated bill ₹3.5L with cap progress at 70%.
3. Approaching 90% → amber warning. At 100% → red, actions blocked: "Spend cap hit. Contact admin to lift it or wait until cycle close."

## 10. User Stories

### Agency owner / admin
- As an agency owner, I want to see how much money is left in my wallet at a glance, so that I know whether I can keep running campaigns.
- As an agency owner, I want to request a top-up when my balance is low, so that my team is never blocked mid-campaign.
- As a postpaid admin, I want to set a spend cap, so that I never get an unexpectedly large bill.
- As an admin, I want to download invoices at cycle close, so that I can reconcile against my accounting.

### Operator / day-to-day user
- As an operator, I want to see how much I've used this period in calls, minutes, and lookups, so that I can manage my consumption.
- As an operator, I want to filter usage by date range, so that I can compare this week to last.
- As an operator, I want a clear message when I'm out of balance, so that I know exactly what to do next instead of hitting a silent failure.

> Note on user-story format: stories follow "As a [user], I want [capability] so that [benefit]." Detailed, testable acceptance criteria for each requirement live in the companion Technical Specification.

## 11. Requirements

### 11.1 Must-Have (P0)

| # | Requirement | Notes |
|---|---|---|
| P0-1 | Separate Utilization (units) and Billing (money) pages; never mix units and money in one widget. | Core mental model. |
| P0-2 | Utilization page renders identically for prepaid and postpaid. | Consumption is mode-agnostic. |
| P0-3 | Mode-aware Billing hero: prepaid → balance + spend; postpaid → estimated bill + cap. | No misleading numbers. |
| P0-4 | Two prepaid sub-models (Subscription, Pure prepaid) on the same Billing page, differing only in the hero. | Driven by prepaidPlanType. |
| P0-5 | Four balance states (healthy / low / empty / expired) with banners and one shared blocking gate. | isBalanceBlocking(). |
| P0-6 | Sidebar wallet widget (prepaid only) showing rupees remaining / total, hidden under postpaid. | Routes to Utilization. |
| P0-7 | Shared DateRangeSelector recomputes windowed numbers but never touches cycle-to-date figures. | See section 12. |
| P0-8 | Recharge / Add money CTAs open a "Request sent" modal routed to a human approver. | No payment integration in v1. |

### 11.2 Nice-to-Have (P1)
- Auto-approve top-ups via a saved payment mandate (depends on payment integration).
- Suggested top-up amount based on burn rate ("at this pace you'll run out in N days").
- Per-capability "≈ ₹/unit" tooltip on Utilization rows to bridge units and money for owners who think in rupees.
- Email/notification when balance hits low and when a top-up is approved.

### 11.3 Future Considerations (P2)
- Promotional / free-trial credits — reserve a promoBalance field consumed before topupBalance.
- Per-product budgets and end-user spend caps.
- Auto-recharge / auto-renew.
- Anniversary-aligned billing cycles and mid-cycle plan changes with proration.

## 12. Date-Range Filter Behaviour

Both Utilization and Billing share the DateRangeSelector. Keeping windowed and cycle-to-date numbers distinct is essential — the user needs both "the rolling 30-day picture" and "the cycle so far" without conflation.

| Preset | Window |
|---|---|
| Today / Yesterday | 1 day |
| Last 7 days / This week | 7 days |
| Last week | the prior 7-day window |
| Last 14 days | 14 days |
| Last 30 days / This month | 30 days |
| Last month | the prior 30-day window |
| Lifetime | 90 days (the data window) |

| The filter DOES touch | The filter does NOT touch |
|---|---|
| Every number on the Utilization page (table sums, chart bars) | The Monthly Plan number (cycle baseline) |
| "Used in last X days" hero column on Billing | Top-ups this cycle (cycle-to-date) |
| Modules table spend column on Billing | Cycle dates in the header |
| Utilization-over-time chart's date axis | Sidebar wallet widget (always cycle-to-date) |

## 13. Success Metrics

| Question | Metric / target |
|---|---|
| Do users understand the model? | < 5% of support tickets contain "I don't see my balance" / "where do I check usage" in the first week. |
| Does the top-up flow work? | Median time from balance=low detection to top-up approval < 24h. |
| Do users hit the empty state? | < 10% of cycles end with balance=empty for > 1 hour. |
| Do they use the date-range filter? | Range changed at least once on > 60% of Utilization sessions. |
| Sidebar widget engagement | Click-through to /settings/utilization > 20% of widget views. |

Leading indicators (days–weeks): support-ticket rate, top-up cycle time, filter usage, widget click-through. Lagging indicators (weeks–months): reduction in balance-related support load and improved retention of prepaid agencies.

## 14. Recommended Decisions

The prototype left several decisions open. Each is given a recommended default below, marked **proposed — needs sign-off**. Recommendations favour shipping a tight v1 and deferring anything that depends on payment integration.

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| 1 | Top-up approval flow | Manual admin approval for v1; auto-approve via saved mandate as P1. | Keeps a human in the loop and avoids payment integration now. |
| 2 | Plan-type lock-in (Subscription ↔ Pure) | Locked within a cycle; switchable only at cycle boundary, admin-initiated, current cycle closed first. | Avoids mid-cycle billing-math ambiguity. |
| 3 | Spend-cap default (new postpaid) | No cap by default; prompt admin at onboarding; suggest 2× trailing-month spend once history exists. | Don't block legitimate usage on day one; nudge toward a sensible cap. |
| 4 | Cycle alignment | Calendar-month aligned for v1; anniversary as P2. | Simpler, predictable invoicing. |
| 5 | Invoice trigger | Generate at cycle close; deliver next business day with "your bill is ready" email. | Predictable, low-engineering. |
| 6 | Daily-limit enforcement | Backend-enforced batch + queue of excess; UI surfaces today's state. | Never silently drop work. |
| 7 | Multi-product concurrency at empty | FIFO at the API gateway against a single shared pool, with atomic reserve-then-debit. | Prevents overspend / double-spend races. |
| 8 | Credit-unit display | Keep rupees on Billing, units on Utilization; add an ≈ ₹/unit tooltip; validate with the owner persona. | Preserves the clean split while bridging for rupee-thinkers. |

## 15. Edge Cases

- **Zero-day cycle.** Utilization renders with zeros, not a broken empty state. "Used in last X days" shows available data when the range exceeds cycle age — never extrapolate.
- **Currency display toggle (INR ↔ USD).** Workspace-level switch driving every monetary number; conversion rate fixed at module load for v1.
- **Daily caps hit.** Enrichment provider caps at 6K records/day; excess is batched and queued for the next day, not dropped (see decision 6).
- **Refunds / clawbacks.** Top-up rejection after spend is messy; admin-only handling.
- **Sidebar widget under single-product workspaces.** Still rupees; hidden only when mode=postpaid.
- **Mode flip mid-cycle.** Out of scope; requires closing the current cycle and opening a new one under the new mode.

## 16. Open Questions

| Question | Owner |
|---|---|
| Final sign-off on the 8 recommended decisions in section 14 | Product + Finance |
| Does the agency-owner persona think in rupees or in units? (validates decision 8) | Research / Design |
| SLA and tooling for the human top-up approver | Ops / Admin tooling |
| Backend ledger source of truth replacing localStorage prototype state | Engineering |
| Notification channel for low-balance / approval events | Product + Engineering |

## 17. Appendix — Prototype Surfaces

For reference, these implemented surfaces are documented by this PRD and specified in the companion Technical Specification:

- `src/app/(app)/settings/wallet/page.tsx` — Utilization + Billing page (router branches on view and billingMode).
- `src/components/layout/sidebar.tsx` — sidebar wallet widget.
- `src/lib/billing-mode-store.ts` — mode + balance + plan-type state (Zustand + localStorage).
- `src/lib/credits-data.ts` — pool, modules, daily series, helpers (utilizedInRange, poolSummary, sliceDailyToRange).
- `src/lib/daily-series.ts` — workspace-wide daily series backbone.
