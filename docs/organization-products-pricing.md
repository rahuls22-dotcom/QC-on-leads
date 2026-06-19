# Organization flow — Products & Pricing tab (handoff)

> Scope: **only** the Organization detail / Products & Pricing work. (The Agent "Tools" tab is a separate effort — not covered here.)
> Status: **built locally, NOT committed, NOT pushed.** Lives in the working tree of `~/Documents/QC-on-leads` (currently on branch `agent-tools-tab`).

---

## 1. What was added

A **tabbed Organization detail view** for an existing org, with a new **Products & Pricing** tab where an operator can, per customer:

1. **Enable / disable** a product (and any of its sub-products).
2. **Set the per-unit price** (₹/unit) for each sub-product, floored at internal cost.

Tabs on the org detail, in order: **Workspaces · Products & Pricing · Members** — the new tab is #2, just before Members (as requested).

The pricing config was **lifted from the existing onboarding wizard's rate-card step** (the "client onboarding flow" with product / sub-product / per-unit price) and surfaced as a reusable tab.

---

## 2. How to run / see it

```bash
cd ~/Documents/QC-on-leads
npm run dev        # http://localhost:3000
```

Open **http://localhost:3000/organizations/godrej_properties** → **Products & Pricing** tab.
(Sidebar: Organization → Godrej Properties. Godrej is the only seeded org with billing, so it's the one that shows the detail view.)

`npm run build` passes.

---

## 3. Files

| File | Status | What |
|---|---|---|
| `src/components/organizations/products-pricing-tab.tsx` | **new** | The Products & Pricing tab. Self-contained: local `rateCard` state, enable/disable + ₹/unit editing, margin-floor validation, Save toast. Drop-in via `<ProductsPricingTab billing={clientBilling} />`. |
| `src/components/organizations/org-detail.tsx` | **new** | Tabbed org detail shell: header (name, orgId, status pill) + Workspaces / Products & Pricing / Members tabs. Workspaces & Members are read-only lists from seed data. |
| `src/app/organizations/[id]/page.tsx` | **modified** | For existing orgs **with billing** (`isEdit`), renders `<OrgDetail client={client} />` (the tabbed view). **New + onboarding orgs still use the create/edit wizard.** Added the import + an early return after the hooks. |

No new dependencies. Uses the existing blue admin design system + `@/lib/utils` `cn`.

---

## 4. Data model (reused, not new)

From `src/lib/billing-data.ts` — nothing was changed here:

- **Catalogue**: `PRODUCT_CATALOGUE: Product[]`. Two-level via fields on each product:
  - `category`: `"Features" | "Agents"` (top eyebrow grouping)
  - `bucket`: e.g. `"Contact Enrichment"`, `"Voice Agent"` → rendered as the **product** (collapsible parent)
  - the individual rows (Email, Phone, India — Mobile, …) → rendered as **sub-products**
  - `name`, `unit` (e.g. "per contact"), `internalCostRupees` (price floor), `description`
- **Per-customer rates + enabled flags** live on the org's billing:
  ```ts
  ClientBilling.rateCard: Record<string, { enabled: boolean; creditsPerUnit: number }>
  ```
  Keyed by product id. `enabled` = on/off for that customer; `creditsPerUnit` = ₹/unit price.
- Seed org with billing: `clients[].id === "godrej_properties"` (`godrejBilling()`), status `Active`.

**Terminology mapping** (the UI labels vs the data):
- "Product" = `bucket` (the collapsible parent)
- "Sub-product" = an individual `Product` row inside the bucket
- price lives at the **sub-product** level (`rateCard[productId].creditsPerUnit`)

---

## 5. Behaviour / interactions (verified)

- **Product (bucket) toggle** flips all its sub-products on/off at once; off → the sub-product table collapses. Verified: disabling Contact Enrichment moved 10/10 → 8/10 enabled and hid its 2 rows.
- **Sub-product toggle** enables/disables a single row (its price input disables when off).
- **Rate input** (`₹ / unit`) edits `creditsPerUnit`; below internal cost shows a destructive border + "min ₹X.XX" hint. Verified.
- **Save pricing** button → toast (mock; see §6).
- Header shows org name, `org_…` id, status pill; tab badges show workspace/member counts.

---

## 6. Not yet wired (for the next session)

This is a **front-end prototype on mock data** — pick these up next:

1. **Persistence** — `rateCard` edits live in component state only; "Save pricing" just toasts. Wire to the real orgs/billing API (PATCH the org's rate card).
2. **Workspaces & Members tabs** are read-only lists from seed `billing.workspaces` / `billing.members`. The screenshots show richer versions ("Add Client to Org", company/display name/industry/status columns) — build those out if needed.
3. **Wizard vs detail** — existing active orgs now open the tabbed detail **instead of** the edit wizard, so plan/KAM/commit editing isn't reachable for them. Decide whether to (a) add an "Overview/Plan" tab, (b) keep the wizard reachable via an "Edit billing" action, or (c) leave as-is.
4. **Source-of-truth mismatch** — the org admin in the reference screenshots (New Organization modal, Add Client to Org, Workspaces/Members detail tabs) does **not** exist in this repo; it was rebuilt here from the wizard. If the real target is a different app/repo, the `ProductsPricingTab` component is self-contained and can be dropped in as the 2nd tab there.

---

## 7. Open questions to confirm with product

- Should the **product (bucket)** itself carry a price, or is pricing always per **sub-product** (current behaviour)?
- Should disabling a product **clear** its saved rates or just hide them (current: keeps the values, just disables)?
- Who can edit pricing (role gating)? Not enforced in the prototype.
