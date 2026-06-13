# PRD source — Wallet, Utilization, and Billing

A working-document writeup of how the wallet/utilization/billing system is currently modelled in the prototype. Use this as raw material for a finished PRD on Cowork — it captures the model, screens, behaviours, edge cases, and the open decisions worth making before build.

---

## 1. Context

An agency running Revspot consumes three things on our platform: contact extraction (phones / emails), enrichment (professional + financial lookups), and AI calling minutes. They pay for that consumption — either upfront (prepaid) or in arrears (postpaid). The original UX collapsed all three concepts — what they bought, what they consumed, what they owe — into a single "Wallet" page, which made it hard to answer the questions agency owners actually ask:

- **"How much have I used this month?"** → a units question (calls, mins, lookups).
- **"How much money is left in my account?"** → a wallet question (rupees).
- **"What's my bill going to be?"** → a billing question (estimated invoice or remaining balance).

Mixing the three forced confusing language. A postpaid customer doesn't have a balance, so showing a "Remaining" number for them lied. A prepaid customer doesn't get an invoice at month end, so showing "Estimated bill" lied the other way. We had to pick.

## 2. Goal

One mental model the user can hold in their head:

> **Utilization is what I used, in units. Billing is the money side. The Wallet (if I have one) is the bucket of rupees I've put in.**

Sub-goals:
- Make the same Utilization page work for both prepaid and postpaid customers — consumption is consumption regardless of how it's paid for.
- Make the Billing page mode-aware: prepaid sees balance + spend; postpaid sees estimated bill + spend cap.
- Support two prepaid sub-models without a separate page: **Subscription** (fixed monthly fee) and **Pure prepaid** (deposit + spend down).
- Surface the wallet balance prominently when it matters (sidebar widget) and hide it cleanly when it doesn't (postpaid).

## 3. Non-goals

- Mid-cycle plan upgrades / downgrades / proration.
- Multi-currency wallets in a single workspace (workspace has one currency, currently INR with USD as a display toggle).
- Real payment integration (Razorpay / Stripe wiring) — the "Add money" and "Recharge" CTAs surface a "Request sent" modal that goes to a human approver.
- Per-product budgets / spend caps owned by the agency end-user (admin-only concern).
- Auto-recharge / auto-renew flows.

## 4. Mental model — the three concepts

| Concept | Unit | Applies to | Question it answers |
|---|---|---|---|
| **Wallet** | INR (rupees) | Prepaid only | "How much money do I have left to spend?" |
| **Utilization** | Units (calls, mins, lookups) | Both modes | "How much have I used this period?" |
| **Billing** | INR (rupees) | Both modes | "What does my month look like financially?" |

Each concept has its own home in the IA. The user is never asked to reconcile units and money in the same widget.

## 5. Prepaid sub-models

A prepaid workspace is one of two sub-types. The user picks once at onboarding (or admin sets it):

### 5a. Subscription
- Agency pays a fixed monthly fee (the **plan baseline**, e.g. ₹2,00,000/month). On cycle start, this amount becomes the available balance.
- If they burn through it mid-cycle, they can request a **top-up**, which accrues on top of the plan baseline for that cycle.
- New cycle = plan baseline resets. Top-ups carry over (the unused portion).

### 5b. Pure prepaid
- No fixed fee. The agency deposits whatever amount they want and spends it down.
- The wallet balance is just the sum of all their top-ups minus consumption.
- No cycle reset — there's no "plan", just a running balance.

The UI varies between these in the Billing hero only; everything else (Utilization page, sidebar widget) is identical.

## 6. Postpaid

- No wallet, no balance, no recharge.
- Spend accrues against an **estimated bill** for the cycle.
- Optional **spend cap** — if hit, all metered actions are blocked until next cycle (or admin lifts it). Surfaced as a progress bar against the cap.

## 7. Balance states (prepaid only)

The wallet has four states that gate the user's ability to run new actions:

| State | Trigger | What the user sees | Behaviour |
|---|---|---|---|
| `healthy` | > 25% remaining | Default UI everywhere | All actions allowed |
| `low` | ≤ 25%, > 0 | Yellow warning banner; sidebar widget reads "Low" | All actions allowed but nudged to recharge |
| `empty` | = 0 | Red banner; sidebar widget reads "Empty" | Actions blocked → modal: "Send recharge request" |
| `expired` | Subscription cycle ended without renewal | Red banner with different copy | Same as `empty` but worded as "Plan window lapsed" |

The blocking is enforced in one place (`isBalanceBlocking(mode, balance)`) so any new product surface (outreach launch, contact extraction batch, etc.) inherits the same gate by calling that helper.

## 8. Information architecture

```
Sidebar
└── Wallet widget          ← prepaid only, INR, shows "₹used / ₹total · X% · Top up"
                              click → /settings/utilization

Settings
├── Account / Agency
├── Account / Workspace
├── Account / Utilization  ← BOTH modes, units only, no money
├── Account / Billing      ← BOTH modes, money only, mode-aware hero
└── Connections / Integrations
```

Note the separation: Utilization is one page, Billing is another. They share the same DateRangeSelector control at the top (and so do their widgets), but they answer different questions.

## 9. Screens

### 9a. Settings → Utilization (both modes)

**Header:** "Utilization", current cycle dates, **DateRangeSelector** (defaults to last 30 days).

**Widgets, top to bottom:**

1. **Utilization by Product table** — one row per product (Contact Extraction, Enrichment, AI Calling). Each row shows the product header and its sub-capability rows underneath (Phone extraction, Email extraction, Professional enrichment, etc.). Numbers are unit counts only (e.g. "9,000 phones", "13,750 mins"). No rupees on this page.

2. **Utilization over time chart** — stacked area chart, one layer per capability, coloured per-product. Tabs at the top let the user switch which product is foregrounded. Y-axis is plain numbers (units), x-axis is date. The chart respects the DateRangeSelector at the top.

**Date filter behaviour:** every number and chart bar must recompute when the user changes the date range. The current cycle dates in the header do NOT change — they reflect the billing cycle, which is independent of the analysis window.

### 9b. Settings → Billing — Prepaid Subscription

**Header:** "Billing", DateRangeSelector, **Add money** CTA (opens "Request sent" modal).

**Hero — 4-column breakdown of the current cycle:**

| Monthly plan | Top-ups this cycle | Used in last X days | Remaining |
|---|---|---|---|
| ₹2,00,000 | + ₹40,000 | ₹X (range-dependent) | ₹Y |
| *charged on cycle start* | *added via recharge* | *X% of available* | *available now* |

Below the hero: progress bar showing usedPct against total available (planBaseline + topupBalance). Colour gradates: grey (< 75%) → amber (≥ 75%) → red (≥ 90%).

Below the bar: **Plan-type switch** — toggles the demo between Subscription and Pure prepaid views.

Below that: **Modules table** — same per-product breakdown as Utilization but with the rupee figures (spend per product, % of pool used).

**Footer:** Invoices list (cycle close → invoice, downloadable).

### 9c. Settings → Billing — Prepaid Pure

Same scaffold, but the hero is simpler — there's no plan baseline:

| Used in last X days | Remaining |
|---|---|
| ₹X | ₹Y |
| *X% of your ₹{topup} top-up balance* | *available now* |

Everything else (Modules table, Invoices) is identical to Subscription.

### 9d. Settings → Billing — Postpaid

No wallet, no balance.

**Hero:**
- Estimated bill this cycle (₹X)
- Spend cap (₹Y) — progress bar
- Days until cycle close
- "Set spend cap" CTA if no cap set; "Adjust cap" if cap set

Modules table + Invoices below, same as prepaid.

### 9e. Sidebar wallet widget (prepaid only)

Compact widget at the bottom of the sidebar. Hidden under postpaid.

```
WALLET
₹10,200 / ₹50,000
[———————————————] 20%
Top up
```

- The big number is **rupees remaining / total**, not units.
- Visible regardless of which products the workspace has enabled (enrichment-only, calling-only, all-three).
- Click anywhere → routes to `/settings/utilization` (the home for the consumption story).
- "Top up" button → "Request sent" modal.

## 10. Date-range filter — what it controls

Both Utilization and Billing share the DateRangeSelector. Its presets and what they map to:

| Preset | Window |
|---|---|
| Today / Yesterday | 1 day |
| Last 7 days / This week | 7 days |
| Last week | the prior 7-day window |
| Last 14 days | 14 days |
| Last 30 days / This month | 30 days |
| Last month | the prior 30-day window |
| Lifetime | 90 days (the demo's data window) |

What the filter touches:
- Every number on the Utilization page (table sums, chart bars)
- "Used in last X days" hero column on Billing
- The Modules table spend column on Billing
- The Utilization-over-time chart's date axis

What it does NOT touch:
- The Monthly Plan number (that's the cycle baseline, not a windowed number)
- Top-ups this cycle (that's cycle-to-date, not the rolling window)
- Cycle dates in the header
- Sidebar wallet widget (it's always cycle-to-date)

This separation is important — the user needs both "what's the rolling 30-day picture" and "what's the cycle so far" without us conflating them.

## 11. Data model (current, mock)

The prototype already encodes a credible model that a real backend can mirror:

```ts
// One credit pool per workspace per cycle.
CREDIT_POOL = {
  totalCredits: 200000,     // INR per cycle (the plan baseline if subscription)
  utilized: 140000,         // sum of per-module utilized
  periodStart: Date,
  periodEnd:   Date,
}

// Each product has its own utilization story.
Module = {
  id, name, description,
  utilized: number,         // INR for the cycle
  capabilities: [
    {
      label,                // e.g. "Talk time"
      creditsUsed,          // INR
      unitCount,            // e.g. 13750 mins
      unitLabel,            // e.g. "min"
      rate,                 // ₹/unit (contract rate)
    },
  ],
  daily: [                  // 90-day daily series
    { date, amount },       // amount = INR spent that day
  ],
  dailyLimit?: {            // optional vendor-imposed cap
    count, unit, used,      // e.g. 6000 records/day, 2400 used today
  },
}
```

For the billing-mode store:

```ts
mode: "prepaid" | "postpaid"
prepaidPlanType: "subscription" | "pure"
balance: "healthy" | "low" | "empty" | "expired"
```

This persists in localStorage in the prototype; in production it'd come from a billing-ledger service.

## 12. Key flows

### 12a. First-time prepaid Subscription user
1. Onboarding sets `mode=prepaid, prepaidPlanType=subscription`, `planBaseline=₹2L`.
2. User lands on `/dashboard`. Sidebar wallet widget shows `₹0 / ₹2,00,000 · 0%`.
3. User runs their first outreach. Each call deducts from the wallet at the contracted ₹/min rate.
4. End of cycle: invoice generated for what was used (or zero if nothing was used — they still paid the ₹2L fee). New cycle resets balance to ₹2L.

### 12b. Mid-cycle top-up (Subscription)
1. Wallet drops below 25% → `balance=low` → yellow banner appears on Billing page + sidebar.
2. User clicks **Add money** → estimator modal opens. They pick an amount (e.g. ₹50K).
3. Submit → "Request sent" modal. Approver gets notified (out of scope for product, in scope for admin tooling).
4. Once approved, the top-up appears in the cycle's `topupBalance` field. Hero now shows `Top-ups this cycle: + ₹50,000`.

### 12c. Subscription user runs out before cycle close
1. Wallet = 0 → `balance=empty` → red banner. Sidebar widget reads "Empty".
2. Any new action surface (launch outreach, run enrichment batch) calls `isBalanceBlocking()` → returns true → action gated.
3. Modal: "You're out of balance. Send a recharge request to your admin to keep running outreach."
4. After top-up approval, balance becomes positive, banner clears, actions unblock.

### 12d. Pure prepaid user
1. Onboarding sets `mode=prepaid, prepaidPlanType=pure`, `planBaseline=0`.
2. Wallet shows `₹0 / ₹0 · 0%`. Sidebar widget hints "Add money to start".
3. User clicks Add money → deposits ₹1L → `topupBalance=1,00,000`. Wallet now `₹0 / ₹1,00,000`.
4. Spend draws down the topupBalance. Same `balance` gating as subscription.
5. No cycle reset — running balance just continues.

### 12e. Postpaid user approaching spend cap
1. User has a ₹5L spend cap on their cycle. Currently at ₹3.5L (70%).
2. Billing hero shows estimated bill ₹3.5L with cap progress bar at 70%.
3. As they approach 90% → amber warning. At 100% → red, actions blocked. Banner: "Spend cap hit. Contact admin to lift it or wait until cycle close."

## 13. Edge cases worth specifying

- **Zero-day cycle** (cycle just started, no data yet). Utilization page must render with zeros, not a broken empty state. "Used in last X days" should still recompute when range > cycle age (show available data, don't extrapolate).
- **Currency display toggle (INR ↔ USD).** Currently a workspace-level switch that drives every monetary number. Conversion rate fixed at module-load.
- **Daily caps hit.** Enrichment provider caps at 6K records/day. If the user runs more, we should batch + queue the excess for tomorrow, not silently drop. Currently the cap surfaces in the UI but enforcement isn't fully modelled — flag for backend.
- **Free trial / promotional credits.** Out of scope for v1 but worth a slot in the data model — a `promoBalance` field that gets consumed before `topupBalance`.
- **Refunds / clawbacks.** Top-up rejection after spend is messy. Should be admin-only.
- **Sidebar widget under enrichment-only or calling-only.** Still rupees. Hidden only when `mode=postpaid`.
- **Mode flip mid-cycle.** Out of scope. Admin would need to close the current cycle and open a new one under the new mode.

## 14. Success metrics

For the team to measure once this ships:

| Question | Metric |
|---|---|
| Do users understand the model? | < 5% support tickets containing "I don't see my balance" / "where do I check usage" within first week |
| Does the top-up flow work? | Median time from "balance=low" detection to top-up approval < 24h |
| Do users hit empty state? | < 10% of cycles end with `balance=empty` for > 1 hour |
| Do they use the date range filter? | Range changed at least once on > 60% of Utilization page sessions |
| Sidebar widget engagement | Click-through to /settings/utilization > 20% of widget views |

## 15. Open decisions before build

1. **Top-up approval flow** — does an admin always approve manually, or do we offer an auto-approve setting (auto-debit a saved card / Razorpay mandate)?
2. **Plan-type lock-in** — once a workspace picks Subscription vs Pure prepaid, can they switch later? At what billing cycle boundary?
3. **Spend cap default** — for new postpaid workspaces, do we set a sensible default cap (e.g. 2× last month's spend), or no cap?
4. **Cycle alignment** — is the cycle calendar-month-aligned ("1st to 30th") or anniversary-aligned ("billing day = signup day")? Calendar is simpler; anniversary is more flexible.
5. **Invoice trigger** — at cycle close, or on a fixed day of the month? Affects how we communicate "your bill is ready" to the user.
6. **Daily limit enforcement** — UI-only surfacing (today's state) or backend-enforced queue?
7. **Multi-product concurrency** — if AI Calling and Enrichment are both running and the wallet drops below `empty` mid-action, which one gets the credit? FIFO at the API gateway, presumably.
8. **Credit unit display** — we removed "credits" nomenclature in favour of plain rupees. Worth re-validating with the agency owner persona — do they think in rupees or in "calls / lookups / mins"? The Utilization page assumes the latter.

## 16. What's already built (in the prototype)

For reference — these are the implemented surfaces this PRD documents:

- `src/app/(app)/settings/wallet/page.tsx` — the Utilization + Billing page (router branches on `view` and `billingMode`)
- `src/components/layout/sidebar.tsx` — sidebar wallet widget
- `src/lib/billing-mode-store.ts` — mode + balance + plan-type state (Zustand + localStorage)
- `src/lib/credits-data.ts` — pool, modules, daily series, helpers (`utilizedInRange`, `poolSummary`, `sliceDailyToRange`)
- `src/lib/daily-series.ts` — workspace-wide daily series backbone (used by dashboard + outreach pages too)
- Demo-mode toggles in the prototype let you flip between prepaid/postpaid, plan type, and balance state without touching code.

---

*Generated from the working prototype on 2026-06-07. Update this doc when the model changes.*
