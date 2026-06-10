# PRD · Spot — the Agentic System

**Status:** Draft · **Owner:** Product · **Audience:** Engineering
**Full per-LLM-call detail:** `docs/flows-create-launch-optimize.excalidraw`

---

## Principles (12)

1. **All communication flows through Spot — both ways.** User talks only to Spot; only Spot talks to the user (incl. proactive nudges). Sub-agents have no chat surface.
2. **Spot orchestrates and executes; sub-agents only produce.** Workers return artefacts. Every *write* is Spot's alone (see 11).
3. **Skills load per phase, not always-on.** Old skills unload. Scheduled agents still load/unload per run — nothing stays resident.
4. **Spawn for context isolation; load skills for capability.** Spawn only for heavy tool use, parallel fan-out, or a different mode.
5. **Sub-agents speak via artefacts.** No agent reads another's reasoning.
6. **Spawning is one level deep.** Workers don't spawn workers.
7. **Spawns are declared in skills, not improvised.**
8. **Every artefact passes a user gate before flowing downstream.** Editable in canvas or refined via chat.
9. **Flows trigger two ways: user, or schedule.** A scheduled run may only produce reference artefacts + raise a nudge.
10. **Proactive output is a nudge, never an action.** No money moves on the autonomous path without a human click.
11. **Only Spot executes writes.** Gates live with the user, who only talks to Spot — so approval and execution are co-located. Sub-agents never hold write credentials.
12. **Write gates are tiered.** *Structural* writes (entities created paused — reversible, no spend) clear in one **bulk** gate; *spend* writes (budget/go-live) each get their **own** gate.

> **Thought signature** (Spot's decisions + why) is durable across turns; chat is ephemeral.

---

## Artefacts

- **Reference** — auto-saved, ungated, permanent. `deep-research.md`, `launch-record.md`, `daily-analysis.md`, `diagnosis.md`, change history.
- **Work** — user-gated, editable. `product-strategy.md` (🚪1), `campaign-plan.md` (🚪2), `execution-plan.md` (🚪3).
- **Sub-agent** — intermediate, merged into a work artefact. `creatives.md`, `lead-form.md`, `targeting.md`.

A reference artefact survives even if its surrounding work artefact is rejected.

---

## Flow 1 · Create a Product

**Goal:** name/URL/PDF → approved Product Strategy → approved Campaign Plan.

**Phase A · Strategy (the thinking):**
`Spot` asks for inputs → spawns **Product Brief Agent** (`create-brief` + `deep-research`) → PBA returns brief, saves `deep-research.md` → Spot writes Persona + Creative + Form strategy → **`product-strategy.md` → 🚪1**.

**Phase B · Campaign Plan (the doing), after 🚪1:**
Spot spawns **3 in parallel** — Creative (`creatives.md`), Form (`lead-form.md`), Targeting (`targeting.md`) → Spot assembles **`campaign-plan.md` → 🚪2** → feeds Flow 2.

---

## Flow 2 · Launch (Spot executes)

**Goal:** ship an approved `campaign-plan.md` to Meta. **No sub-agents** — Spot writes everything, tiered (Pr.11, 12).

- **Build (structural):** `🚪2-S` bulk approve → Spot writes form, audiences, campaign/ad-sets/ads **paused** (zero spend).
- **Go live (spend):** `🚪2-G` per spend write → Spot sets budget + activates → writes `launch-record.md` → product enters daily watch.

**Why tiered:** everything can be created paused at no cost, so the reversible structure clears in one click; only money-moving writes interrupt the user. Per-write-everything = co-pilot (too slow); one-gate-everything = one click spends everything (too risky).

---

## Flow 3 · Optimize (autonomous entry)

**Goal:** catch underperformance without being asked, then fix it on approval.

- **Watch (unattended):** ⏰ daily cron → **Analyst Agent** (`monitor-products`) writes `daily-analysis.md`, returns findings → Spot (`triage`) decides act/hold → 🔔 **nudge** (the only autonomous output).
- **Diagnose (on "act"):** Spot spawns **Analyst Agent** (`diagnose`) → `diagnosis.md` → Spot presents; user may brainstorm (Spot-only loop).
- **Fix (gated):** Spot builds **`execution-plan.md` → 🚪3** → if new assets needed, spawn producers (produce only) → **Spot executes writes**, tiered (Pr.11, 12).

---

## Inventory

**Agents (6):** Spot (orchestrator + only executor + only chat surface), Product Brief, Creative, Form, Targeting (produce only), Analyst (⏰ + spawned, read-only). *Launch spawns none.*

**Skills (15):**
- Spot: `create-product`, `create-strategy`, `execute-plan`, `assemble-campaign-plan`, `launch-campaign`, `triage`, `brainstorm`, `build-execution-plan`
- PBA: `create-brief`, `deep-research` · Creative: `generate-creatives` · Form: `build-form` · Targeting: `build-targeting` · Analyst: `monitor-products`, `diagnose`

**Tools:**
- *Read:* `web-search`, `url-crawl`, `pdf-read`, `fetch-performance`, `ad-platform-read`, `benchmark`, `anomaly-detect`, `audience-graph`
- *Generate/build:* `image-gen`, `copywriter`, `form-schema`, `lookalike-builder`
- *Write — Spot only:* structural (bulk gate) `create-lead-form`, `push-audience`, `create-campaign`, `create-adset`, `create-ad`, `publish-creative` · spend (individual gate) `update-budget`, `activate-campaign`, `pause-adset`

**Other:** thought signature · per-product/global memory · scheduler (cron) · nudge surface · gates.

---

## Principle changes (what the new flows forced)

| # | Change | Forced by |
|---|---|---|
| 1 | Amended — communication is now two-way (Spot can initiate) | Flow 3 |
| 2 | Amended — split is produce (workers) vs execute (Spot), not think vs do | Flow 2 |
| 3 | Clarified — "always-on" = scheduled, not context-resident | Flow 3 |
| 9 | New — flows trigger by user *or* schedule | Flow 3 |
| 10 | New — proactive output is a nudge, never an action | Flow 3 |
| 11 | New — only Spot executes writes | Flow 2 |
| 12 | New — tiered write gates (structural bulk / spend individual) | Flow 2 |

Unchanged: 4–8. **Write-gate recommendation: tiered** (rationale in Flow 2).

---

## Next flows

- **Flow 4 · Scale** — find headroom on winners, propose budget moves.
- **Flow 5 · Test Angles** — generate angle variants for an existing strategy.
