---
name: campaign-health
description: Compute Spot's take on a marketing campaign's health — a 4-state verdict (Healthy / Watch / At-risk / Stabilizing) from explainable signals, sample-gated, worst-signal-dominates. Use when judging whether a campaign is healthy, generating a "Spot's take" verdict, or explaining why a campaign is at-risk.
---

# Campaign health · Spot's take

Judge a campaign's health the way Spot does: not a fake "health %", but a
small set of explainable signals rolled up into a 4-state verdict that always
carries its driver.

Full spec: `docs/campaign-health.md`. Runtime impl: `src/lib/spot/campaign-health.ts`.

## Inputs

- Campaign metrics: `cpl`, `qualificationRate`, `ctr`, `leads`, and their
  period-over-period deltas (`ctr` trend, `leads` trend).
- **Target CPL** — from the execution plan that launched the campaign; else
  the product benchmark.
- **Qual benchmark** — the product's expected qualification rate.

## Procedure

1. **Sample gate.** If `leads < 50`, return **Stabilizing** — do not judge
   noise. Stop here.
2. **Compute four signals**, each Green / Amber / Red:
   - **Efficiency** — `cpl / targetCpl`: ≤1.0 green · ≤1.5 amber · >1.5 red.
   - **Quality** — `qualRate / benchmark`: ≥1.0 green · ≥0.7 amber · <0.7 red.
   - **Fatigue** — CTR trend / floor: holding green · (−12..25% or CTR<0.9%) amber · (−25%+ or CTR<0.6%) red.
   - **Momentum** — leads trend: flat/up green · (−12..30%) amber · (−30%+) red.
3. **Roll up (worst-signal-dominates):**
   - any Red **or** ≥2 Amber → **At-risk**
   - exactly 1 Amber, 0 Red → **Watch**
   - all Green → **Healthy**
4. **Driver** = the worst signal's one-line reason (for Healthy: "all signals
   green"). Always surface it next to the verdict.

## Rules

- Never average the signals into a score — the worst real signal drives the
  verdict, so a collapsed qual rate can't hide under a good CPL.
- Never judge below the sample gate.
- Never return a verdict without its driver.
- Prefer frequency (>2 amber, >3 red) for Fatigue and spend-vs-budget pacing
  for Momentum when those fields are available; the CTR/leads-trend proxies
  are the fallback for datasets that lack them.
