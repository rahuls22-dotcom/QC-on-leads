# Project health — how the pill on /projects is calculated

The health pill on the Projects list (and the project detail header) is
**derived**, not a stored field. Runtime: `src/lib/spot/project-health.ts`
(`projectHealth(productId)`). A "project" is a product, so project health rolls
up the product's campaigns.

## The rule: worst live campaign dominates

1. Take the product's **live** campaigns (`status === "enabled"`).
2. If there are none → **Stabilizing** ("No live campaigns yet") — pre-launch,
   nothing to judge.
3. Otherwise compute each campaign's Spot's-take verdict via
   `computeSpotTake()` (the campaign-health logic — 4 signals, sample-gated,
   worst-signal-dominates; see `docs/campaign-health.md`).
4. Roll up across the live campaigns, worst-dominates:
   - any campaign **At-risk** → project **At risk** (`underperforming`)
   - else any **Watch** → project **Attention** (`needs-attention`)
   - else any **Healthy** → project **On track**
   - else (all still gathering signal) → **Stabilizing**

This mirrors how a growth lead reads a portfolio: the weakest live line item is
what needs attention, so it sets the project's status. The pill carries a
`driver` (e.g. _"JEE Crack · Google Search is at-risk."_) so the verdict is
explainable, never a black box.

## Why derived, not stored

The old `product.performance.health` was a hardcoded enum — it could drift out
of sync with the actual campaigns. Deriving from `computeSpotTake` means the
projects list, the project detail header, and the campaigns table's Spot's-take
column can never disagree: change a campaign's target or metrics and every
surface updates together.

## States → pill

| State | Pill | Tailwind tone |
|---|---|---|
| On track | On track | `pill-ok` (green) |
| Needs attention | Attention | `pill-warn` (amber) |
| Underperforming | At risk | `pill-err` (red) |
| Stabilizing | Stabilizing | `pill` (gray) |
