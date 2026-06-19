# Agent Tools — Product Requirements (PRD)

> Functional definition of the **Tools** tab on the agent detail page. Audience: product, design, engineering. This describes *what the operator can do and see*, not how it's built.

---

## 1. Purpose

When an operator builds a voice agent, the **Tools** tab is where they choose which actions the agent can take during a call (end the call, transfer to a human, send a WhatsApp, book a visit, etc.) and configure each one. A tool is set up once and reused. The tab lives between **Configuration** and **Knowledge Base** on the agent detail page.

## 2. Goals / non-goals

**Goals**
- Let a non-technical operator turn agent capabilities on/off and configure them without seeing code, JSON, or the word "schema".
- Group tools so it's obvious which are always-on, which are optional platform tools, and which the team built.
- Make every tool's *trigger* ("when should the assistant use this?") editable, since that's what the agent reads to decide.

**Non-goals**
- Building call/runtime behaviour (handled by the calling platform).
- Showing usage analytics ("used by N agents") in this surface.

---

## 3. The tools and how they're bucketed

Tools sit in **three buckets**. Each tool is shown as a card with an icon, its display name (human-readable, never `lowercase_with_underscores`), a badge, and either a lock or a toggle.

| Bucket | What it means | Tools | On/off | Removable? | Card badge |
|---|---|---|---|---|---|
| **Default** | Always on, foundational | **End call**, **Detect voicemail** | Always on (locked) | No | Green "Always on" |
| **System** | Platform-built, optional | **Transfer call**, **Detect language**, **Send WhatsApp**, **Capture Email** | Off by default; toggle (Detect language is auto — see §4.2) | n/a (switch off) | None |
| **Custom** | Team-built for this org | **Book site visit** (seed) + any the team creates | Off by default; toggle | Yes (delete) | "Webhook" or "Saved answer" |

---

## 4. What's inside each tool (configuration)

Every predefined tool (Default + System) opens a config modal with the same top section:
1. **"When should the assistant use this?"** — the trigger text the agent reads to decide to use the tool. **Editable for every tool.**
2. A short read-only **"what it does"** line.
3. **Tool-specific settings** (below).

### 4.1 Default tools

| Tool | What it does | Config |
|---|---|---|
| **End call** | Ends the call cleanly | Optional **closing message** spoken before hanging up. |
| **Detect voicemail** | Recognises an answering machine | **Behaviour** (one of two): *Leave a message* (with a message; supports `{{variables}}`) · *Hang up silently*. |

### 4.2 System tools

| Tool | What it does | Config |
|---|---|---|
| **Transfer call** | Hands the live call to a human | Three simple settings: the **phone number** to hand off to; **when to hand off** (the point/condition at which the agent should transfer); and the **message** the agent speaks before handing off. |
| **Detect language** | Switches the conversation language | **No manual setup.** Enabled automatically when the agent is multilingual — it uses the agent's configured **primary and secondary languages** and switches between them during the call. |
| **Send WhatsApp** | Sends the caller a WhatsApp message | **Sender** (WhatsApp Business number), **message template**, **attach brochure** toggle, + **status messages** (see 4.4). |
| **Capture Email** | Captures the caller's email from the CRM | **CRM source**, **match-the-caller-on** field, + **status messages**. |

> **Detect language is special:** it is not a manual toggle. If the agent is set up as multilingual (a primary language + one or more secondary languages in the agent's details), this tool is **switched on automatically** with those selected languages. If the agent is single-language, it stays off.

### 4.3 Custom tools

Two kinds, in plain language:

| Kind | What it does | Config |
|---|---|---|
| **Connect to a system** (webhook) | Collects details from the caller, sends them to a web address, uses the reply | **Tool name**, **trigger**, **Information to collect** (one or more fields: *name / describe / required*), **method** (POST/GET), **URL**, optional **authentication** header. |
| **Give a saved answer** (response) | Reads back a templated answer filled from known call details | **Tool name**, **trigger**, **Information to collect**, and the **answer text** with insertable `{placeholder}` chips. No developer setup. |

### 4.4 Status messages (external-action tools)

For tools that perform an external action (Send WhatsApp, Capture Email, and custom webhooks), the operator can set optional spoken lines so the caller isn't left in silence — **when it starts**, **when it finishes**, and **if it fails**.

---

## 5. User flows

### Flow 1 — View the Tools tab
1. Operator opens an agent → **Tools** tab.
2. Sees three sections: **Default**, **System**, **Custom**.
3. Each card shows icon, name, badge, and a lock (Default) or toggle (System/Custom). The Custom section ends with a **"Create a new custom tool"** card. (There is no separate top "New tool" button.)

### Flow 2 — Configure a Default tool
1. Click the card (e.g. **End call**).
2. Config modal opens: edit the trigger text and the tool's settings (e.g. closing message).
3. Save. The tool **cannot** be turned off or removed.

### Flow 3 — Enable & configure a System tool
1. Toggle the tool **on** (e.g. **Transfer call**).
2. Its config modal **opens immediately** so it can be set up (e.g. set the handoff phone number and message).
3. Save → tool is enabled for this agent.
4. Toggling **off** disables it but keeps the saved settings. Clicking the card anytime reopens its config.

### Flow 4 — Create a Custom tool (2 steps)
1. Click **"Create a new custom tool"**.
2. **Step 1 — Type:** choose **Connect to a system** or **Give a saved answer**.
3. **Step 2 — Form:** enter tool name, trigger, **Information to collect** (add field rows), and the kind-specific fields (webhook: method + URL + optional auth · saved answer: the answer text + placeholder chips).
4. Validation runs inline; on success the tool appears under **Custom**.
5. Toggle it on to enable it for the agent.

### Flow 5 — Edit / delete a Custom tool
1. Click a custom tool card → **edit** modal opens, pre-filled.
2. The **name is locked**; everything else is editable. Save to update.
3. Use **Delete** → a confirmation modal appears with a non-blocking "may be in use" caution → confirming removes the tool.

---

## 6. Validation (what the operator sees)

Inline messages that block save:
- **Tool name** — required; lowercase letters, numbers, underscores only; must be unique and not clash with a built-in name.
- **Webhook** — URL required and must start with `http://` or `https://`.
- **Saved answer** — the answer text is required.
- **Each collected field** — needs a lowercase name and a short description; names can't repeat.

---

## 7. Display & behaviour rules

- Tool names render without underscores everywhere.
- Badges: Default → green **Always on**; Custom → **Webhook** / **Saved answer**; System → none.
- No raw JSON or the word "schema" anywhere in the operator UI.
- The exact system set is: **Transfer call, Detect language, Send WhatsApp, Capture Email**.
- The exact default set is: **End call, Detect voicemail**.

---

## 8. Acceptance criteria

- [ ] Tools tab appears between Configuration and Knowledge Base, with Default / System / Custom sections.
- [ ] Default tools are locked, always on, open config on click, and can't be removed.
- [ ] System tools are off by default, show no lock; **enabling one opens its config modal** (except Detect language, which auto-enables from the agent's language setup).
- [ ] Transfer call config shows the **phone number**, **when to hand off**, and the **message before handoff** — no transfer-style options.
- [ ] Detect voicemail offers only two behaviours: *Leave a message* or *Hang up silently*.
- [ ] Detect language switches on automatically when the agent is multilingual, using its primary + secondary languages.
- [ ] Custom section shows existing customs + a "Create a new custom tool" card; create flow is type-chooser → form.
- [ ] Edit pre-fills, name is locked, Delete is present and removes the tool after confirmation.
- [ ] Tool names never show underscores; no JSON/"schema" terminology in the UI.

---

## 9. Future / to confirm

- **Saved-answer placeholders** should come from the agent's own variables (dynamic), not a fixed list.
- **Settings scope** — per-agent (e.g. each agent transfers to its own desk) is the assumed behaviour.
- Persistence, runtime execution, and the tools API are covered separately in the technical companion (`tools-tab-backend-spec.md`).
