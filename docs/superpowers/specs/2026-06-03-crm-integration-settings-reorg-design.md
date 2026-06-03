# CRM Integration + Settings Reorg — Design Spec

**Date:** 2026-06-03
**Branch:** `merge-outreach-enrichment`
**Status:** Draft — awaiting user review
**Prototype reality:** This is a Next.js demo with mock data (`integrations-data.ts`, `demo-mode.tsx`). No backend. "Build" = frontend screens + mock data + local state, following existing patterns (settings sub-nav rail, `CollapsibleSection`, `Toggle`, field-mapping table). Nothing here implies a real sync engine; the screens *depict* the architecture so it demos as real.

---

## 1. Goal

One sentence: Give clients a self-serve surface to (a) connect each product to a separate location in their CRM, with field mapping + custom-field creation, and (b) manage per-product behavior config — showing only the products they purchased.

## 2. The mental model (3 nouns)

The whole design hangs off separating three concepts that "integration" currently conflates:

| Noun | What it is | Where it lives | Changes |
|---|---|---|---|
| **Connection** | One handshake to a client CRM endpoint. Holds: their CRM URL + access, the API key we issue them, and the **capability set** they granted (read / create-row / update-row / create-field). | Integrations (global) | Rare |
| **Channel** | One product's data pipeline over a Connection: source location, destination location, field map (+ fields-to-create), write-back policy (stage gate, ops). | Settings → product tab | Per-product |
| **Product Config** | Product behavior, CRM-agnostic: enrichment fresh-every-time / no-storage; AI-calling cases; lead-gen cases. | Settings → product tab | Per-product |

Split rule: **Integrations = "what are we connected to."** **Settings = "how does each product behave."**

## 3. Information architecture

### 3.1 Integrations (stays = connections only)
Tabs: **Ad Accounts · WhatsApp · CRM Connections · Notifications**

- Ad Accounts, WhatsApp, Notifications — unchanged (channel connections needed for campaigns/messaging to run).
- **CRM Connections** (replaces today's single-CRM "CRM" tab) — **Model A**: one list of all CRM connections, each row tagged with the product(s) it serves. This is the home of the connect wizard.
- The old CRM tab's field-mapping / stage-mapping / sync-log move *into* a connection's detail view (you edit a connection → see its mapping + log).

### 3.2 Settings (gains entitlement-gated product tabs)
Sub-nav rail (existing pattern in `settings/layout.tsx`):

Existing: **Agency · Workspace · Wallet · Billing**
New (gated by purchased products): **Enrichment · AI Calling · Campaigns**

- The current Integrations → **Enrichment** config tab moves here and expands (fresh / no-storage cases).
- Each product tab = that product's **Channel** config (which Connection, source/dest location, stage gate) + **Product Config** (behavior).

### 3.3 Entitlement gating
A `products` list on the workspace drives which Settings product tabs + which sidebar nav show. Single source of truth.

- Today's `plan-mode.tsx` (`enrichmentOnly` boolean) is the crude version. Generalize to a `products: ProductKey[]` concept, demo-toggleable from the sidebar (same place the enrichment variant picker lives).
- `ProductKey = "enrichment" | "ai_calling" | "campaigns"`.
- Settings rail filters product tabs against `products`. Sidebar already gates on `enrichmentOnly` — rewire to read `products`.

**[FLAG for review]** Keep `enrichmentOnly` working as a derived alias (`enrichmentOnly = products.length === 1 && products[0] === "enrichment"`) so existing locked/upsell flows don't break.

## 4. Data model (mock TypeScript in `crm-integration-data.ts`)

```ts
type ProductKey = "enrichment" | "ai_calling" | "campaigns";
type Capability = "read_rows" | "create_row" | "update_row" | "create_field";
type CrmProvider = "salesforce" | "hubspot" | "zoho" | "leadsquared" | "freshworks" | "gohighlevel" | "custom";

interface CrmConnection {
  id: string;
  provider: CrmProvider;
  label: string;              // "Godrej HubSpot — Enrichment"
  crmUrl: string;             // their endpoint
  status: "connected" | "pending" | "error";
  connectedAgo?: string;
  apiKey: string;             // the key WE issued them (client → us inbound)
  capabilities: Capability[]; // what they granted us
  products: ProductKey[];     // which products this connection serves (Model A tag)
  lastSync?: string;
}

interface FieldMap {
  id: string;
  revspotField: string;
  crmField: string;
  direction: "to_crm" | "from_crm" | "both";
  isCreated?: boolean;        // a field WE create in their CRM (enrichment outputs)
}

interface ChannelConfig {
  connectionId: string;
  product: ProductKey;
  source: { type: "push_api" | "crm_pull"; location: string };  // location = object/list/view name
  destination: { location: string; dedupKey: string };
  writeBack: {
    ops: Capability[];
    stageGate: "all" | "intent_qualified" | "qualified_only";   // AI-calling case
  };
}
```

Product Config is product-specific, kept as plain shapes per product (see §6).

## 5. CRM Connection wizard (Integrations → CRM Connections → "Add connection")

A stepped modal/drawer. Steps:

1. **Choose CRM** — 6-card grid (Salesforce, HubSpot, Zoho, LeadSquared, Freshworks, Custom/API) — matches the screenshot you have.
2. **Connect** — two halves shown together:
   - *They → us:* display the API + API key we issue (copyable), with "they paste this in their CRM to push leads to us."
   - *Us → them:* their CRM URL field + "Authorize" (OAuth mock) or API-key paste.
3. **Grant capabilities** — checkboxes: read rows / create rows / update rows / create fields. "Bidirectional" = read + write checked. Default: recommended preset (read + create-row + update-row).
4. **Assign products** — which products this connection serves (Model A tag). Multi-select against purchased products.
5. **Field mapping** — two-column mapper (reuse existing table). Auto-suggest matches. Mark enrichment output fields as *create-in-CRM*. "Create field" button → adds an `isCreated` row.
6. **Test & activate** — a "send test lead" step (mock success), then Activate.

Recommended-vs-Advanced fork: step 3-5 collapse to defaults under a "Recommended setup" path; "Advanced" expands them. (Best practice from research.)

## 6. Per-product config surfaces (Settings)

Each product tab = **Channel** card(s) + **Product Config** card(s).

### 6.1 Enrichment (`/settings/enrichment`)
- **Channel**: which Connection · pickup location (read from) · writeback location · field map link · create-fields list.
- **Product Config**:
  - Data freshness: `Use stored data` | `Fresh enrichment every time` (never read our DB).
  - Storage: `Store enriched data` | `No data storage` (purge after delivery).
  - Auto-enrich toggle + data sources (move from current Integrations Enrichment tab).

### 6.2 AI Calling (`/settings/ai-calling`)
- **Channel**: which Connection · pickup location (leads to call) · writeback location · **stage gate** (all / intent-qualified / qualified-only) · field map link.
- **Product Config**: call window, retry rules, recording writeback toggle. **[FLAG]** exact AI-calling cases TBD with you — placeholders depict the pattern.

### 6.3 Campaigns (`/settings/campaigns`)
- **Channel**: which Connection · destination (where new leads land) · status-update writeback toggle · field map link.
- **Product Config**: **[FLAG]** lead-gen cases TBD with you.

## 7. Components (new + reused)

**Reuse:** `CollapsibleSection`, `Toggle`, `selectStyle`, field-mapping table markup, settings `layout.tsx` sub-nav, `AdAccountCard` pattern.

**New:**
- `crm-connection-card.tsx` — a connection row in the list (provider icon, label, status, product tags, edit/disconnect).
- `crm-connect-wizard.tsx` — the stepped modal (§5).
- `capability-picker.tsx` — the 4 capability checkboxes + recommended preset.
- `channel-config-card.tsx` — reusable Channel editor (source/dest/stage-gate), used by all 3 product tabs.
- `settings/enrichment/page.tsx`, `settings/ai-calling/page.tsx`, `settings/campaigns/page.tsx` — new routes.
- `lib/crm-integration-data.ts` — mock data + types (§4).
- `lib/products.tsx` — entitlement context (generalize `plan-mode`).

## 8. Data flow (demo)

All local React state + mock data. Wizard writes to local state (optionally `localStorage` like `demo-mode` does) so a created connection persists across navs in the demo. No network. Test-lead + sync-log entries are canned.

## 9. Build phasing (→ becomes the plan)

1. **Entitlement foundation** — `lib/products.tsx`, demo toggle, rewire sidebar + settings rail gating.
2. **Settings reorg** — add 3 product routes; move Enrichment config out of Integrations; stub AI Calling + Campaigns.
3. **CRM Connections list** — replace Integrations CRM tab with Model-A list + connection cards + detail view (mapping/log moved in).
4. **Connect wizard** — the stepped flow (§5).
5. **Channel config card** — wire into all 3 product tabs.
6. **Verify** each phase in browser (`$B`), typecheck, commit per phase.

## 10. Out of scope (YAGNI)

- Real OAuth, real CRM API calls, real sync engine.
- Conflict resolution / DLQ / retry internals (depict as config copy, don't build).
- More than 3 products.
- Notifications / Ad Accounts / WhatsApp changes (untouched).

## 11. Open questions for you (flagged inline above)

1. AI-calling product config cases — what are the real ones? (§6.2)
2. Lead-gen / campaigns product config cases? (§6.3)
3. Keep `enrichmentOnly` alias, or fully migrate locked/upsell flows to `products`? (§3.3)
4. Connection detail view as a separate route (`/integrations/crm/[id]`) or an expand-in-place panel? (recommend route)
