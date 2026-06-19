# Agent Tools Tab — Backend / Productionisation Spec

> Companion to [`tools-tab-spec.md`](./tools-tab-spec.md) (the shipped front-end prototype).
> This specs the requirement to make it real: persistence, API, per-agent attachment, and call runtime. Target backend: **FastAPI + MongoDB**, consumed by the existing Next.js UI.

---

## 1. Scope

Turn the in-memory prototype into a persisted, multi-tenant, runtime-wired feature. Covers the five gaps in front-end spec §9: persistence, per-agent attachment, placeholder sourcing, runtime, and removing mock state.

**In scope:** tool library CRUD, per-agent enable/config, server-side validation, secrets handling, compiling attached tools into the call platform (Vapi), seeding/migration.
**Out of scope:** the UI (already built), the voice runtime itself, billing.

---

## 2. Core model decision

Split a **tool definition** (what the tool is) from its **per-agent attachment** (whether an agent uses it and how it's configured). This is the key decision the prototype left open — settings like transfer destinations and closing messages are **per-agent**, because two agents share the "Transfer call" tool but transfer to different desks.

- **Definition** (org/global): identity, type, custom config (url/args/response).
- **Attachment** (per agent): enabled, trigger-description override, and `ToolSettings`.

Buckets:
- **Default** (`end_call`, `voice_mail_detection`) — global, `is_default`, auto-attached to every agent, enabled and non-removable; only description + settings editable.
- **System** (`transfer_call`, `detect_language`, `send_whatsapp`, `look_up_email`) — global, platform-maintained; opt-in per agent.
- **Custom** — org-owned, team-built (`webhook` | `response`); opt-in per agent.

---

## 3. Data model (MongoDB)

### 3.1 `tools` — definitions
```jsonc
{
  "_id": "ObjectId",
  "title": "transfer_call",        // unique id, ^[a-z0-9_]+$
  "scope": "global" | "org",       // global = platform catalogue; org = custom
  "org_id": "ObjectId | null",     // null for global
  "type": "standard" | "custom",
  "is_default": false,
  "icon": "transfer",
  "what_it_does": "…",             // standard only
  "config": {                       // custom only
    "kind": "webhook",
    "url": "https://…",
    "method": "POST",
    "headers_ref": "secretId",      // see §7 — never store raw secrets
    "timeout": 30,
    "args": { "type": "object", "properties": {…}, "required": [...] }
  },
  "created_by": "user@org | null",
  "created_at": "…", "updated_at": "…"
}
```
- Uniqueness: `title` unique within `(scope=global)` and within each `org_id`. A custom title may not collide with any global title.
- Indexes: `{org_id, title}` unique; `{scope}`.

### 3.2 `agent_tools` — per-agent attachment
```jsonc
{
  "_id": "ObjectId",
  "agent_id": "ObjectId",
  "tool_id": "ObjectId",           // ref tools._id
  "org_id": "ObjectId",            // denormalised for scoping
  "enabled": true,
  "description_override": "…|null",// per-agent trigger text; falls back to definition.description
  "settings": { /* ToolSettings, see front-end spec §7 */ },
  "updated_at": "…"
}
```
- Indexes: `{agent_id, tool_id}` unique; `{org_id}`.
- **Default tools:** a row is force-created per agent with `enabled=true`; `enabled` cannot be set false (server rejects).
- **Settings** mirror the existing `ToolSettings` union (transfer `destinations[]`, `voicemailBehavior`, `closingMessage`, `allowedLanguages`/`autoSwitch`, `senderNumber`/`whatsappTemplate`, `crmSource`/`matchOn`, `statusMessages`).

---

## 4. API contract

All routes are org-scoped and authenticated (§7). IDs are Mongo `_id`; UI keeps showing `title`.

### 4.1 Tool library
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/orgs/{orgId}/tools` | List catalogue: globals (default+system) + org customs, with `bucket` derived. |
| `POST` | `/orgs/{orgId}/tools` | Create a **custom** tool (webhook/response). Validates (§6). |
| `PATCH` | `/orgs/{orgId}/tools/{toolId}` | Edit a custom tool. **`title` immutable.** |
| `DELETE` | `/orgs/{orgId}/tools/{toolId}` | Delete a custom tool (globals rejected). Cascades `agent_tools` rows. |

### 4.2 Per-agent attachment
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/agents/{agentId}/tools` | Resolved list: every catalogue tool + its attachment state (`enabled`, effective description, `settings`). Defaults always present. |
| `PATCH` | `/agents/{agentId}/tools/{toolId}` | Upsert attachment: `enabled`, `description_override`, `settings`. Default tools: `enabled=false` → `409`. |

### 4.3 Runtime compile (internal)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/agents/{agentId}/runtime-tools` | Compile enabled tools → call-platform (Vapi) tool config (§8). Called on assistant create/update. |

**Response shape** (`GET /agents/{id}/tools`) maps 1:1 to the UI's `ToolConfig` + selection + `ToolSettings`, so `tools-tab.tsx` swaps mock calls for fetches with no model change.

**Errors:** `400` validation (field-keyed, mirrors `ToolErrors`), `403` cross-org, `404`, `409` (default disable / title collision), `422` malformed `args`.

---

## 5. Per-agent attachment behaviour

- On **agent create**: insert `agent_tools` for both default tools (`enabled=true`) seeded from `DEFAULT_TOOL_SETTINGS`.
- **System/custom**: no row until first toggle; first `PATCH … enabled=true` creates the row (and the UI immediately opens the config modal, as today).
- **Toggle off** (system/custom): set `enabled=false`, keep the row (preserves settings for re-enable).
- **Delete custom tool**: remove definition + all its `agent_tools` rows.

---

## 6. Server-side validation (authoritative)

Re-implement `validateCustomTool` server-side (client validation is convenience only):
- `title`: required, `^[a-z0-9_]+$`, unique in org, no collision with any global title. Immutable on edit.
- `description`: required.
- webhook: `url` required + `^https?://`; `method ∈ {POST,GET}`; `timeout` default 30s, capped.
- response: `response` text required.
- each `args` field: lowercase key (`^[a-z0-9_]+$`), description present, keys unique. Persist as JSON Schema (`fieldsToArgs` already produces the shape).

---

## 7. Security & multi-tenancy

- Every query filtered by `org_id` from the authenticated session; reject cross-org `tool_id`/`agent_id` with `403`.
- **Webhook auth headers are secrets.** Store in a secrets manager (or encrypted-at-rest), referenced by `headers_ref`; the API returns them **masked** (`"Bearer ••••"`), never plaintext. A write with a masked value = "unchanged".
- Custom-tool URLs: SSRF guard (block internal/metadata IPs) since they're called from our runtime.
- Audit `created_by` / `updated_at` on definition changes.

---

## 8. Runtime wiring (Vapi compile)

`GET /agents/{id}/runtime-tools` turns enabled attachments into the assistant's tool array:

- **end_call** → `endCall` tool; `closingMessage` → spoken close.
- **voice_mail_detection** → `voicemailDetection` + `voicemailBehavior`/`voicemailMessage` (`{{variables}}` interpolated).
- **transfer_call** → `transferCall` with `destinations[]`; `mode` maps `blind → blind-transfer`, `warm-message → warm-transfer-say-message`, `warm-summary → warm-transfer-say-summary`.
- **detect_language** → language switch config from `allowedLanguages` + `autoSwitch`.
- **send_whatsapp / look_up_email / custom webhook** → `function` / `apiRequest` tool: `url`, `method`, resolved `headers`, `args` as parameters; `statusMessages` → Vapi `messages[]` (`request-start`/`request-complete`/`request-failed`).
- **custom response** → server-side template tool: fill `{placeholders}` from the call's dynamic variables at invocation, return text to the model (no external call).
- **trigger text**: effective description (`description_override` ?? definition.description) becomes the tool's LLM-facing description.

Re-compile and push to the assistant on any attachment/definition change.

---

## 9. Placeholders (front-end §9.4)

Replace the static `KNOWN_PLACEHOLDERS` with a live source: `GET /agents/{id}/variables` returns the agent's dynamic variables; the saved-answer editor lists those as insertable chips, and the runtime fills them from call context at execution.

---

## 10. Migration / seeding

1. Seed the **global catalogue** once: the 2 default + 4 system tools (from `DEFAULT_TOOLS`/`SYSTEM_TOOLS`).
2. Optionally seed demo org-custom (`book_site_visit`) for non-prod.
3. Backfill: for every existing agent, create the two default `agent_tools` rows (enabled).
4. Front-end: replace in-memory CRUD in `tools-tab.tsx` with the §4 endpoints; remove mock reset-on-reload.

---

## 11. Non-functional

- **Idempotency:** `POST /tools` accepts a client idempotency key to avoid dupes on retry.
- **Concurrency:** attachment upserts keyed `{agent_id, tool_id}`; last-write-wins on `settings`.
- **Webhook execution:** default 30s timeout, retries off (side-effecting); log every invocation (tool, agent, latency, outcome) for observability.
- **Performance:** `GET /agents/{id}/tools` is one catalogue read + one attachment read, merged server-side.

---

## 12. Acceptance criteria

- [ ] Tools, settings, and toggles persist across reloads (no mock reset).
- [ ] Each agent's enabled tools + per-agent settings are stored and isolated per org.
- [ ] Default tools auto-attach on agent create, are always enabled, and can't be disabled (server-enforced).
- [ ] Enabling a system/custom tool persists; disabling keeps its saved settings.
- [ ] Custom create/edit/delete hit the API; `title` immutable on edit; delete cascades attachments.
- [ ] Server validation rejects bad input with field-keyed errors matching the UI.
- [ ] Webhook auth headers stored as secrets and returned masked; SSRF guard active.
- [ ] `GET /agents/{id}/runtime-tools` produces correct Vapi config (transfer modes, status messages, webhook params, response templating).
- [ ] Saved-answer placeholders come from the agent's live variables.
- [ ] Cross-org access returns 403.

---

## 13. Open questions

1. **Settings granularity** — confirmed per-agent (this spec). Any tool whose settings should be org-shared instead?
2. **System tools** — kept as a single global catalogue (recommended) vs copied per org for per-org description edits?
3. **Webhook path** — does the call platform hit the customer URL directly, or proxy through us (better for secrets/SSRF/logging)? Recommend proxy.
4. **Auth/secret store** — which secrets manager; encryption standard for `headers_ref`.
5. **Variables source** — endpoint/shape for agent dynamic variables feeding placeholders.
