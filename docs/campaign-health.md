# Campaign health · "Spot's take"

Canonical spec for how Spot judges a campaign's health. The runtime
implementation is `src/lib/spot/campaign-health.ts`; the reusable skill is
`.claude/skills/campaign-health/SKILL.md`. Keep all three in sync.

## Why not a health score

A single "87/100 health" is fake precision — we don't have that resolution,
and a weighted average hides a critical failure under good numbers (CPL fine,
but qualification rate collapsed → still shows "healthy" → wrong).

Instead: compute a few **explainable signals**, gate on **sample size**, and
let the **worst real signal drive** a 4-state verdict. Every verdict carries
its driver — it is never a black box.

## The four states

| State | Meaning | Action |
|---|---|---|
| **Stabilizing** | Below the sample gate — too little data to judge | Wait |
| **Healthy** | All signals green | Leave it running |
| **Watch** | Exactly one amber, no red | Keep an eye on it |
| **At-risk** | Any red, or two-or-more amber | Fix it |

## Where the target comes from

The target lives **on the campaign** — `campaign.target = { cpl, qualRate,
source }` — and is set at creation time, most often inherited from the
**execution plan** that launched it (`source: "plan"`). This is the structural
key: every campaign carries what "good" looks like for it, so Spot's take
never has to guess.

Resolution order (most specific wins):

1. `campaign.target` — the campaign's own target (plan / manual).
2. `PRODUCT_BENCHMARK[productId]` — the product-level fallback (also where
   Memory → Overview surfaces the benchmark).
3. `DEFAULT_BENCHMARK` — global default.

Because the target rides on the campaign, the driver can name its source —
e.g. _"CPL ₹510 is 1.6× plan target ₹360"_ — so the insight is traceable back
to the plan that set it. The campaign structure that makes this work:

```
Product
  └─ Execution plan            (sets per-campaign target CPL + qual rate + budget)
       └─ Campaign  ← target lives here, copied from the plan at launch
            └─ Ad set
                 └─ Ad
```

Health is judged at the **campaign** level (targets are per-campaign);
ad-set / ad rows don't carry a separate verdict.

## The four signals

Each signal is a simple comparison → Green / Amber / Red.

| Signal | Green | Amber | Red |
|---|---|---|---|
| **Efficiency** — CPL vs target | ≤ target | 1.0–1.5× target | > 1.5× target |
| **Quality** — qual rate vs benchmark | ≥ benchmark | 0.7–1.0× benchmark | < 0.7× benchmark |
| **Fatigue** — CTR trend / floor | CTR holding | CTR −12..25% or < 0.9% | CTR −25%+ or < 0.6% |
| **Momentum** — leads trend | leads flat/up | leads −12..30% | leads −30%+ |

Notes on the demo data: the campaign feed has no impression-frequency or
budget-pacing field, so **Fatigue** reads the CTR trend (+ absolute CTR floor)
as the fatigue proxy, and **Momentum** reads the leads trend as the
delivery-health proxy. In a fuller dataset, Fatigue should use frequency
(amber > 2.0, red > 3.0) and Momentum should use spend-vs-budget pacing
(green 80–110%, red < 50% starved or > 130% runaway).

## Sample gate

Below **50 leads**, return **Stabilizing** — do not run the signals. Most
"campaign health is impossible" pain comes from judging noise; the gate
removes it.

## Roll-up

1. If `leads < SAMPLE_GATE_LEADS` → **Stabilizing**.
2. Else compute the four signals.
3. Any signal **Red**, OR ≥2 **Amber** → **At-risk**.
4. Exactly 1 **Amber**, 0 Red → **Watch**.
5. All Green → **Healthy**.

**Driver** = the worst signal's `detail` (e.g. _"CPL ₹520 is 1.8× target ₹320"_).
For Healthy, driver = _"All signals green — leave it running"_. The driver is
always shown next to the verdict so the user knows *why*.

## How it surfaces

The Campaigns table shows **Spot's take** as a column. On the first load of
each day, Spot fills the column in **row by row with a 2–3s delay each** — the
agent visibly "reviewing" each campaign. Subsequent loads the same day show
all verdicts immediately (tracked via a localStorage date key).
