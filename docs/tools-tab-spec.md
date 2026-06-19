# Agent Tools Tab — Spec

> Status: **shipped to `main`** (prototype: https://qc-on-leads.vercel.app → Agents → any agent → **Tools**).
> This documents the feature as built. It's a prototype with **mock, in-memory state** — see [§9 Backend gaps](#9-backend-gaps--not-yet-wired) for what's not real yet.

---

## 1. Summary

The **Tools** tab on the agent detail page lets an operator choose which actions an
assistant can take during a call, and configure each one. Tools sit in three
buckets — **Default**, **System**, **Custom** — and each tool opens a modal to
configure it. The model mirrors Vapi / Retell / ElevenLabs: a tool is configured
once and reused, and predefined tools each carry their own settings (a Transfer
Call has destinations, a Voicemail tool has a behaviour, etc.).

**Where it lives:** 8th tab on the agent detail shell, between *Configuration* and
*Knowledge Base*.

- Route: `/agents/[id]` → `tab === "tools"`
- Entry file: [`src/app/agents/[id]/page.tsx`](../src/app/agents/[id]/page.tsx) (`AGENT_TABS` + render)
- Components: [`src/components/agents/tools/`](../src/components/agents/tools/)
- Data: [`src/lib/tools-library.ts`](../src/lib/tools-library.ts)

---

## 2. The three buckets

| Bucket | Tools | Removable? | Toggle? | Lock | Description on card |
|---|---|---|---|---|---|
| **Default** | End call, Detect voicemail | No (always on) | No | 🔒 shown | No |
| **System** | Transfer call, Detect language, Send WhatsApp, Look up email | n/a (switch on/off) | Yes (off by default) | No | No |
| **Custom** | Book site visit (seed) + any team-built tools | Yes (delete) | Yes (off by default) | No | No |

**Display names** are human-readable — titles are stored as
`lowercase_with_underscores` ids but rendered via `toolLabel()` (e.g.
`send_whatsapp` → "Send WhatsApp"). Underscores never show in the UI.

A card shows: icon, name, a badge (Default → green **Always on**; Custom →
**Webhook** / **Saved answer**; System → none), and either a lock (Default) or a
toggle (System / Custom). No description text on cards.

---

## 3. Interaction rules

- **Default tools** — locked and always on; **cannot be removed**. Clicking the
  card opens its config modal (you can edit the trigger + settings, not remove it).
- **System tools** — **disabled by default**. Toggling a tool **on opens its
  config modal** so it can be set up immediately. Clicking the card (anytime) also
  opens the config modal. Toggling off just disables it.
- **Custom tools** — clicking a card opens its **edit** modal (which includes
  Delete). Toggling enables/disables it for this agent.
- **Create** — the Custom section ends with a **"Create a new custom tool"** card
  that opens the two-step create flow (there is no top-level "New tool" button).

---

## 4. Per-tool configuration (Default + System)

Each predefined tool opens a modal with:
1. **"When should the assistant use this?"** — the trigger description (the text the
   LLM reads to decide to call the tool). Editable for every tool.
2. A short read-only "what it does" line.
3. **Tool-specific settings** (below).

| Tool | Settings |
|---|---|
| **End call** | Optional closing message spoken before hanging up. |
| **Detect voicemail** | Behaviour: *Leave a message* (with message, supports `{{variables}}`) / *Use the agent's default message* / *Hang up silently*. |
| **Transfer call** | **Destinations** list. Each: label, type (Phone number / SIP / Another agent), the number/address, **transfer style** (Blind / Warm–announce caller / Warm–say summary), and a spoken message before transferring. "Add destination". |
| **Detect language** | Multi-select of languages the assistant may switch to + "Switch automatically" toggle (auto vs only-on-request). |
| **Send WhatsApp** | Sender (WhatsApp Business number), message template, "attach brochure" toggle. + status messages. |
| **Look up email** | CRM source, match-the-caller-on field. + status messages. |

**Transfer styles** map to Vapi's `transferPlan.mode`:
`Blind → blind-transfer`, `Warm–announce caller → warm-transfer-say-message`,
`Warm–say summary → warm-transfer-say-summary`.

**Status messages** (for external-action tools) — optional spoken lines so the
caller isn't left in silence: *when it starts / finishes / fails*. Mirrors Vapi's
`messages[]` (`request-start` / `request-complete` / `request-failed`).

---

## 5. Custom tools — create / edit / delete

Two kinds, in plain language:
- **Connect to a system** (webhook): collects fields from the caller → sends to a
  URL → uses the reply. Needs a web address.
- **Give a saved answer** (response): reads back a templated answer filled from
  known call details (`{placeholders}`). No developer setup.

**Create (2 steps):**
1. **Type chooser** — pick "Connect to a system" or "Give a saved answer".
2. **Form** — Tool name (validated), trigger description, **Information to collect**
   (repeating field rows → name / describe / required), and kind-specific fields:
   - webhook: method (POST/GET) + URL + optional Authentication header.
   - saved answer: the answer text + insertable `{placeholder}` chips.

**Edit** — same form pre-filled, name locked, with a **Delete** action.
**Delete** — confirmation modal with a non-blocking "may be in use" caution.

**Validation** (inline, blocks save):
- name: required, `^[a-z0-9_]+$`, unique, no collision with a predefined name
- webhook: URL required + valid `http(s)://`
- saved answer: answer text required
- each collected field: lowercase name + a description; names unique

---

## 6. Label → data mapping

| UI label | Stored as |
|---|---|
| Tool name | `title` (lowercase id) |
| (display name, no underscores) | derived via `toolLabel(title)` |
| When should the assistant use this? | `description` |
| Connect to a system / Give a saved answer | `type: "custom"` + `config.kind: "webhook" \| "response"` |
| Information to collect | `config.args` (JSON Schema `properties` + `required`) |
| Where to send it | `config.method`, `config.url` |
| Authentication | `config.headers` |
| The answer to read back | `config.response` |
| Always on / lock | `is_default`, `type === "standard"` |
| Per-tool settings | `ToolSettings` (transfer destinations, voicemail behaviour, …) |

---

## 7. Data model (`src/lib/tools-library.ts`)

```ts
type ToolType = "standard" | "custom";
type CustomKind = "webhook" | "response";

interface ToolConfig {
  title: string;          // unique id, lowercase_with_underscores
  description: string;    // LLM trigger text (editable for all)
  type: ToolType;
  is_default: boolean;    // standard + force-attached (end_call, voicemail)
  icon: string;           // icon key → lucide
  whatItDoes?: string;    // static blurb for standard tools
  config?: CustomConfig;  // custom only
  created_by: string | null;
}

// custom config
type CustomConfig =
  | { kind: "webhook"; url; method: "POST"|"GET"; headers; timeout; args: JsonSchemaArgs }
  | { kind: "response"; response: string; args: JsonSchemaArgs };

// per-tool settings (flat superset, keyed by tool)
interface ToolSettings {
  destinations?: TransferDestination[];                 // transfer_call
  voicemailBehavior?: "leave-message"|"use-assistant"|"hang-up"; voicemailMessage?: string;
  closingMessage?: string;                              // end_call
  allowedLanguages?: string[]; autoSwitch?: boolean;    // detect_language
  senderNumber?: string; whatsappTemplate?: string; attachBrochure?: boolean; // send_whatsapp
  crmSource?: string; matchOn?: string;                 // look_up_email
  statusMessages?: { start; complete; failed };         // external-action tools
}
```

`config.args` is JSON Schema (the backend contract); the UI never shows the word
"schema" — `argsToFields` / `fieldsToArgs` convert to/from the flat row editor.

---

## 8. Files

```
src/app/agents/[id]/page.tsx            # AGENT_TABS + <ToolsTab/> render
src/lib/tools-library.ts                # ToolConfig, ToolSettings, seeds, validators, toolLabel
src/components/agents/tools/
  tools-tab.tsx                         # orchestrator: 3 sections, selection, modals, toast
  tool-card.tsx                         # card: icon, label, badge, toggle/lock
  tool-icon.tsx                         # icon-key → lucide
  modal-shell.tsx                       # modal shell (matches app ModalShell pattern)
  built-in-tool-modal.tsx               # default/system: description + settings
  system-tool-settings.tsx              # per-tool settings renderer (switch on title)
  custom-tool-modal.tsx                 # type chooser + create/edit form + args editor
  delete-tool-modal.tsx                 # delete confirmation
```

Design system: app tokens (`bg-primary` blue, `text-foreground`, `bg-card`,
`rounded-lg/xl`), `@/components/ui/button`, `@/lib/utils` `cn`. No new deps.

---

## 9. Backend gaps / not yet wired

This is a **front-end prototype**. To productionise:

1. **Persistence** — all state is in-memory (mock of `GET/POST/PATCH/DELETE /tools`).
   Edits, toggles, and created tools reset on reload. Wire to the real tools API.
2. **Per-agent attachment** — the on/off toggles ("selection") are local state.
   Persist which tools each agent has enabled.
3. **Usage count** — "used by N assistants" is intentionally omitted (not available
   from this surface); the delete copy is softened accordingly.
4. **Saved-answer placeholders** — a static common set today; should be sourced from
   the agent's dynamic variables when the tool is attached.
5. **Runtime** — transfer modes / status messages are modelled to map onto Vapi
   semantics but don't drive any real call behaviour here.

---

## 10. Acceptance checklist

- [ ] Tools tab appears between Configuration and Knowledge Base.
- [ ] Default tools are locked, always-on, open config on click, can't be removed.
- [ ] System tools are off by default, show no lock/description, and **enabling one opens its config modal**.
- [ ] Tool names render without underscores everywhere.
- [ ] System set is exactly: Transfer call, Detect language, Send WhatsApp, Look up email.
- [ ] Transfer call config shows the destinations editor (type, transfer style, message, add/remove).
- [ ] Custom section shows Book site visit + a "Create a new custom tool" card; no top-level New tool button.
- [ ] Create flow: type chooser → form → tool appears under Custom; validation blocks bad input.
- [ ] Edit prefills, name locked, Delete present; delete removes from list.
- [ ] No raw JSON / "schema" terminology in the default UI.
```
