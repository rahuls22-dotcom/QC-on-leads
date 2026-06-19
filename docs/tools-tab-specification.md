# Agent Tools — Feature Specification

> Implementable specification for the **Tools** tab. Pairs with the functional PRD ([`tools-tab-prd.md`](./tools-tab-prd.md)) and the backend spec ([`tools-tab-backend-spec.md`](./tools-tab-backend-spec.md)). Where they differ, **this spec and the PRD are authoritative** (they reflect the latest decisions).

---

## 1. Scope

The Tools tab lets an operator pick and configure the actions an agent can take on a call. Tools sit in three buckets — **Default**, **System**, **Custom**. This spec defines the exact tool set, each tool's configuration, the states, interaction rules, validation, and the data shapes.

Location: agent detail page, tab between **Configuration** and **Knowledge Base**.

---

## 2. Tool catalogue

| id | Display name | Bucket | Enablement | Config summary |
|---|---|---|---|---|
| `end_call` | End call | Default | Always on (locked) | Optional closing message |
| `voice_mail_detection` | Detect voicemail | Default | Always on (locked) | Behaviour: leave message / hang up silently |
| `transfer_call` | Transfer call | System | Off → manual toggle | Phone number, when to hand off, message before handoff |
| `detect_language` | Detect language | System | **Auto** (on when agent is multilingual) | Derived from agent's primary + secondary languages |
| `send_whatsapp` | Send WhatsApp | System | Off → manual toggle | Sender, template, attach brochure, status messages |
| `capture_email` | Capture Email | System | Off → manual toggle | CRM source, match-on field, status messages |
| `book_site_visit` | Book site visit | Custom (seed) | Off → manual toggle | Webhook custom tool |
| *(team-built)* | — | Custom | Off → manual toggle | Webhook or saved-answer |

Display names are rendered human-readable; the underlying `id` (`lowercase_with_underscores`) is never shown.

---

## 3. Buckets & states

| Bucket | Removable | Control | Notes |
|---|---|---|---|
| **Default** | No | Lock (always on) | `end_call`, `voice_mail_detection`. Only trigger + settings editable. |
| **System** | No (switch off) | Toggle | Off by default. **Exception:** `detect_language` is enabled automatically (§5.3), not by manual toggle. |
| **Custom** | Yes (delete) | Toggle | Off by default. Two kinds: webhook ("Connect to a system"), saved answer ("Give a saved answer"). |

**Card** shows: icon, display name, badge, and a lock (Default) or toggle (System/Custom). Badges: Default → green "Always on"; Custom → "Webhook" / "Saved answer"; System → none. No description text on cards.

---

## 4. Interaction rules

- **Default** — click card → config modal (edit trigger + settings). Cannot disable or remove.
- **System** — toggle **on** → config modal opens immediately. Toggle **off** → disabled, settings retained. Click card anytime → reopen config. (`detect_language` follows §5.3 instead.)
- **Custom** — click card → edit modal (includes Delete). Toggle enables/disables for this agent.
- **Create** — Custom section ends with a "Create a new custom tool" card → 2-step create flow. No separate top-level "New tool" button.

Every predefined tool's config modal has: (1) **"When should the assistant use this?"** trigger text (editable for all), (2) a read-only "what it does" line, (3) tool-specific settings.

---

## 5. Per-tool configuration

### 5.1 End call
- `closingMessage` — optional text spoken before hanging up.

### 5.2 Detect voicemail
- `behaviour` — **one of two**: `leave-message` | `hang-up`.
- `voicemailMessage` — required when `behaviour = leave-message`; supports `{{variables}}`.
- (No "use the agent's default message" option.)

### 5.3 Detect language *(auto)*
- **Not a manual toggle.** Enabled automatically when the agent is configured as multilingual.
- Languages are **read from the agent's settings**: one primary + one or more secondary languages; the tool switches among exactly those during the call.
- If the agent is single-language, the tool stays off.
- Editable: trigger text only. No language multi-select or "switch automatically" toggle in the tool itself.

### 5.4 Transfer call
- `transferPhoneNumber` — the number the call hands off to.
- `handoffPoint` — when/under what condition the agent should transfer (text/condition).
- `handoffMessage` — what the agent says to the caller before transferring.
- (No destination list, destination type, or transfer-style options.)

### 5.5 Send WhatsApp
- `senderNumber` — WhatsApp Business number.
- `template` — message template.
- `attachBrochure` — boolean.
- `statusMessages` — start / complete / failed (§5.8).

### 5.6 Capture Email
- `crmSource` — which CRM to read from.
- `matchOn` — field used to match the caller (e.g. phone number).
- `statusMessages` — start / complete / failed (§5.8).

### 5.7 Custom tools
**Webhook ("Connect to a system")**: `method` (POST/GET), `url`, optional `authHeader`, `infoToCollect[]`, `statusMessages`.
**Saved answer ("Give a saved answer")**: `answerText` (with `{placeholder}` chips), `infoToCollect[]`.
`infoToCollect[]` rows: `name`, `description`, `required`.

### 5.8 Status messages
For external-action tools (Send WhatsApp, Capture Email, custom webhooks): optional spoken lines for **start**, **complete**, **failed**.

---

## 6. Custom tool create / edit / delete

**Create (2 steps):** (1) type chooser — "Connect to a system" vs "Give a saved answer"; (2) form — name, trigger, Information to collect, and kind-specific fields. On success the tool appears under Custom (off until toggled).
**Edit:** same form pre-filled; **name locked**; includes Delete.
**Delete:** confirmation modal with a non-blocking "may be in use" caution.

---

## 7. Validation (inline, blocks save)

- **name** — required; `^[a-z0-9_]+$`; unique; no clash with a built-in name; immutable on edit.
- **webhook** — `url` required and valid `http(s)://`; `method ∈ {POST, GET}`.
- **saved answer** — `answerText` required.
- **each collected field** — lowercase name + description; names unique.

---

## 8. Data shapes (functional)

```ts
type ToolType = "standard" | "custom";
type CustomKind = "webhook" | "response";

interface ToolConfig {
  title: string;            // id, lowercase_with_underscores
  description: string;      // trigger text — editable for all
  type: ToolType;
  is_default: boolean;      // end_call, voice_mail_detection
  icon: string;
  whatItDoes?: string;
  config?: CustomConfig;    // custom only
  created_by: string | null;
}

type CustomConfig =
  | { kind: "webhook"; url: string; method: "POST"|"GET"; authHeader?: string; args: InfoToCollect }
  | { kind: "response"; response: string; args: InfoToCollect };

// per-tool settings (only the fields each tool uses)
interface ToolSettings {
  closingMessage?: string;                                   // end_call
  voicemailBehaviour?: "leave-message" | "hang-up";          // detect voicemail (2 options)
  voicemailMessage?: string;
  transferPhoneNumber?: string; handoffPoint?: string; handoffMessage?: string; // transfer_call
  senderNumber?: string; template?: string; attachBrochure?: boolean;           // send_whatsapp
  crmSource?: string; matchOn?: string;                      // capture_email
  statusMessages?: { start: string; complete: string; failed: string };
}
// Note: detect_language has no ToolSettings — its languages derive from the agent's
// primary + secondary language configuration, and it auto-enables when multilingual.
```

---

## 9. States & edge cases

- **Default tool** can never be toggled off (UI hides the toggle; any disable attempt is rejected).
- **Single-language agent** → `detect_language` is hidden/disabled (no languages to switch between).
- **Toggle off then on** (system/custom) → previously saved settings are restored.
- **Delete a custom tool** → removed from the agent's list; confirmation required.
- **Invalid input** → inline field errors; save blocked.

---

## 10. Acceptance criteria

- [ ] Tab appears between Configuration and Knowledge Base with Default / System / Custom sections.
- [ ] Default tools (End call, Detect voicemail) are locked, always on, open config on click, can't be removed.
- [ ] System set is exactly: Transfer call, Detect language, Send WhatsApp, Capture Email.
- [ ] Detect voicemail offers only **two** behaviours: leave a message / hang up silently.
- [ ] Transfer call config shows only phone number, when to hand off, and message before handoff — no transfer styles.
- [ ] Detect language is **not** a manual toggle; it auto-enables for multilingual agents using their primary + secondary languages.
- [ ] Capture Email appears (not "Look up email") everywhere.
- [ ] Enabling a (manual) system tool opens its config modal; disabling keeps settings.
- [ ] Custom create flow: type chooser → form → appears under Custom; validation blocks bad input; edit locks name; delete confirms and removes.
- [ ] No underscores in displayed names; no JSON/"schema" wording in the UI.

---

## 11. Out of scope / dependencies

- Persistence, API, secrets, and call-runtime wiring → `tools-tab-backend-spec.md`.
- Agent language configuration (primary/secondary) is owned by the agent **Configuration** tab; Detect language consumes it.
- Saved-answer placeholders should source from the agent's dynamic variables (future).
