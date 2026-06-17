// ═══════════════════════════════════════════════════════════════════
// Tools Library — mock data + model
// ═══════════════════════════════════════════════════════════════════
//
// Frontend-only mock of the agent_api `tools` collection described in the
// build spec. The real backend (FastAPI + Mongo, GET/POST/PATCH/DELETE
// /tools) is a separate service; this repo is the Next.js prototype, so
// the library lives in memory and CRUD mutates local state. The data
// model mirrors `ToolConfig` exactly so the UI maps 1:1 to the eventual
// endpoints.
//
// Buckets the UI teaches:
//   • Default  — standard + is_default → "Always on", never removable,
//                only `description` editable.
//   • System   — standard, non-default → locked logic, description
//                editable; opens a read/edit modal.
//   • Custom   — team-built, two kinds in plain language:
//                  webhook  = "Connect to a system"
//                  response = "Give a saved answer"
//
// NOTE: `config.args` is stored as JSON Schema (backend contract). The UI
// never shows the word "schema" — argsToFields/fieldsToArgs convert to and
// from the flat row editor the builder actually sees.

export type ToolType = "standard" | "custom";
export type CustomKind = "webhook" | "response";

/** JSON Schema for a custom tool's collected inputs (backend contract). */
export interface JsonSchemaArgs {
  type: "object";
  properties: Record<
    string,
    { type: string; description: string; enum?: string[] }
  >;
  required: string[];
}

export interface WebhookConfig {
  kind: "webhook";
  url: string;
  method: "POST" | "GET";
  headers: Record<string, string>;
  timeout: number;
  args: JsonSchemaArgs;
}

export interface ResponseConfig {
  kind: "response";
  response: string;
  args: JsonSchemaArgs;
}

export type CustomConfig = WebhookConfig | ResponseConfig;

export interface ToolConfig {
  /** Unique id; lowercase_with_underscores. */
  title: string;
  /** LLM-facing trigger text — editable for ALL tools. */
  description: string;
  type: ToolType;
  /** standard tools force-attached to every agent (end_call, voicemail). */
  is_default: boolean;
  /** Icon key, mapped to a lucide component in the UI layer. */
  icon: string;
  /** Static reference copy for standard tools (logic lives in the runtime). */
  whatItDoes?: string;
  infoCollected?: string;
  /** Present only for custom tools. */
  config?: CustomConfig;
  created_by: string | null;
}

/* ─── Flat editor row (what the builder actually sees) ─────────────── */

export interface ArgField {
  key: string;
  description: string;
  required: boolean;
  enum?: string[];
}

const emptyArgs: JsonSchemaArgs = { type: "object", properties: {}, required: [] };

export function argsToFields(args?: JsonSchemaArgs): ArgField[] {
  if (!args?.properties) return [];
  const required = new Set(args.required ?? []);
  return Object.entries(args.properties).map(([key, v]) => ({
    key,
    description: v.description ?? "",
    required: required.has(key),
    ...(v.enum ? { enum: v.enum } : {}),
  }));
}

export function fieldsToArgs(fields: ArgField[]): JsonSchemaArgs {
  const properties: JsonSchemaArgs["properties"] = {};
  const required: string[] = [];
  for (const f of fields) {
    const key = f.key.trim();
    if (!key) continue;
    properties[key] = {
      type: "string",
      description: f.description.trim(),
      ...(f.enum && f.enum.length ? { enum: f.enum } : {}),
    };
    if (f.required) required.push(key);
  }
  return { type: "object", properties, required };
}

/* ─── Seed catalogue ──────────────────────────────────────────────── */

// Always-on. Cannot be created, deleted, or have logic/inputs changed —
// only the trigger description is editable.
export const DEFAULT_TOOLS: ToolConfig[] = [
  {
    title: "end_call",
    description:
      "Gracefully conclude the conversation once the caller's questions are answered or they ask to stop.",
    type: "standard",
    is_default: true,
    icon: "end_call",
    whatItDoes: "Ends the phone call cleanly.",
    infoCollected: "None — this tool takes no inputs.",
    created_by: null,
  },
  {
    title: "voice_mail_detection",
    description:
      "Detect when an outbound call reaches voicemail and leave a short callback message instead of talking to dead air.",
    type: "standard",
    is_default: true,
    icon: "voicemail",
    whatItDoes:
      "Recognises an answering machine and decides whether to leave a message or hang up.",
    infoCollected: "None — runs automatically.",
    created_by: null,
  },
];

// Platform-maintained, but not force-attached. Logic is fixed; the
// builder can edit the trigger description and choose whether to use it.
export const SYSTEM_TOOLS: ToolConfig[] = [
  {
    title: "transfer_call",
    description: "Hand the call to a human sales rep when the lead is hot or explicitly asks for one.",
    type: "standard",
    is_default: false,
    icon: "transfer",
    whatItDoes: "Warm-transfers the live call to a configured destination.",
    infoCollected: "None visible to the caller.",
    created_by: null,
  },
  {
    title: "detect_language",
    description: "Switch the conversation language when the caller speaks or asks in another language.",
    type: "standard",
    is_default: false,
    icon: "language",
    whatItDoes: "Detects the spoken language and switches the assistant mid-call.",
    infoCollected: "The language requested.",
    created_by: null,
  },
  {
    title: "send_whatsapp",
    description: "Send the caller a WhatsApp message with the project brochure or a booking link.",
    type: "standard",
    is_default: false,
    icon: "whatsapp",
    whatItDoes: "Sends a WhatsApp message to the caller's number.",
    infoCollected: "Which message template to send.",
    created_by: null,
  },
  {
    title: "look_up_email",
    description: "Look up the caller's email from your records to send a follow-up.",
    type: "standard",
    is_default: false,
    icon: "email",
    whatItDoes: "Fetches the caller's email from your CRM.",
    infoCollected: "The caller's phone number (already known).",
    created_by: null,
  },
];

// Team-built. Seeded so the Custom section isn't empty on first load.
export const SEED_CUSTOM_TOOLS: ToolConfig[] = [
  {
    title: "book_site_visit",
    description:
      "When the caller agrees to visit and has given a preferred date and time slot.",
    type: "custom",
    is_default: false,
    icon: "webhook",
    created_by: "ankit.purohit@guyjus.com",
    config: {
      kind: "webhook",
      url: "https://api.godrejproperties.com/visits/book",
      method: "POST",
      headers: { Authorization: "Bearer ••••••••" },
      timeout: 30,
      args: {
        type: "object",
        properties: {
          date: { type: "string", description: "The day the caller wants, e.g. 2026-07-01" },
          slot: { type: "string", description: "morning, afternoon or evening", enum: ["morning", "afternoon", "evening"] },
        },
        required: ["date", "slot"],
      },
    },
  },
];

/**
 * Human-readable display name for a tool. Titles are lowercase_with_underscores
 * ids (the backend contract), but underscores read like code — so cards and
 * modals show this instead. A few names need explicit casing.
 */
const LABEL_OVERRIDES: Record<string, string> = {
  send_whatsapp: "Send WhatsApp",
  voice_mail_detection: "Detect voicemail",
};

export function toolLabel(title: string): string {
  if (LABEL_OVERRIDES[title]) return LABEL_OVERRIDES[title];
  const spaced = title.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// ═══════════════════════════════════════════════════════════════════
// Per-tool settings (Vapi-style predefined-tool configuration)
// ═══════════════════════════════════════════════════════════════════
//
// In Vapi, every predefined tool carries its own config — Transfer Call
// has a list of destinations with a transfer mode, Voicemail has a
// behaviour mode + message, and so on. We mirror that: each standard tool
// gets a typed settings object, edited in its detail modal alongside the
// trigger description. Fields are a flat superset keyed by tool; the
// settings renderer switches on the tool title to show the right ones.

/** Transfer Call destination — mirrors Vapi's destinations[] entries. */
export interface TransferDestination {
  id: string;
  /** Friendly label, e.g. "Sales desk". */
  label: string;
  /** Where the call goes. */
  destType: "number" | "sip" | "agent";
  /** Phone number / SIP URI / agent id depending on destType. */
  value: string;
  /** How the handoff happens (Vapi transferPlan.mode, simplified). */
  mode: "blind" | "warm-message" | "warm-summary";
  /** What the assistant says to the caller before transferring (optional). */
  message: string;
}

export const TRANSFER_MODES: { value: TransferDestination["mode"]; label: string; hint: string }[] = [
  { value: "blind", label: "Blind transfer", hint: "Connects immediately without announcing the caller." },
  { value: "warm-message", label: "Warm — announce caller", hint: "Speaks your message to the rep, then connects." },
  { value: "warm-summary", label: "Warm — say summary", hint: "Reads an AI summary of the call to the rep first." },
];

/** Spoken status lines while an external tool runs (Vapi messages[] types). */
export interface StatusMessages {
  start: string;
  complete: string;
  failed: string;
}

export interface ExperienceCentre {
  id: string;
  name: string;
  address: string;
  city: string;
}

/** Flat superset of settings across all standard tools. */
export interface ToolSettings {
  // transfer_call
  destinations?: TransferDestination[];
  // voice_mail_detection
  voicemailBehavior?: "leave-message" | "use-assistant" | "hang-up";
  voicemailMessage?: string;
  // end_call
  closingMessage?: string;
  // detect_language
  allowedLanguages?: string[];
  autoSwitch?: boolean;
  // send_whatsapp
  senderNumber?: string;
  whatsappTemplate?: string;
  attachBrochure?: boolean;
  // calculate_budget
  interestRate?: number;
  tenureYears?: number;
  downPaymentPct?: number;
  // find_experience_center
  centres?: ExperienceCentre[];
  // look_up_email
  crmSource?: string;
  matchOn?: string;
  // shared (external-action tools)
  statusMessages?: StatusMessages;
}

export const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Marathi",
  "Bengali",
];

export const WHATSAPP_TEMPLATES = [
  "Project brochure",
  "Booking link",
  "Site-visit confirmation",
  "Thank-you note",
];

export const CRM_SOURCES = ["Internal CRM", "Salesforce", "HubSpot", "Zoho"];

/** Tools that perform an external action get a shared status-messages block. */
export const STATUS_MESSAGE_TOOLS = new Set([
  "send_whatsapp",
  "calculate_budget",
  "find_experience_center",
  "look_up_email",
]);

/** Seed settings per tool title. The modal edits a copy of these. */
export const DEFAULT_TOOL_SETTINGS: Record<string, ToolSettings> = {
  end_call: {
    closingMessage: "Thanks for your time today — have a great day!",
  },
  voice_mail_detection: {
    voicemailBehavior: "leave-message",
    voicemailMessage:
      "Hi, this is {{project_name}} calling about your enquiry. We'll try you again shortly, or call us back at your convenience.",
  },
  transfer_call: {
    destinations: [
      {
        id: "dest-1",
        label: "Sales desk",
        destType: "number",
        value: "+918065481620",
        mode: "warm-summary",
        message: "Connecting you to a sales specialist now — one moment.",
      },
    ],
  },
  detect_language: {
    allowedLanguages: ["English", "Hindi", "Kannada"],
    autoSwitch: true,
  },
  send_whatsapp: {
    senderNumber: "+918065481615",
    whatsappTemplate: "Project brochure",
    attachBrochure: true,
    statusMessages: {
      start: "Sure, sending that to your WhatsApp now.",
      complete: "Done — you should see it on WhatsApp shortly.",
      failed: "I couldn't send that just now; I'll have the team follow up.",
    },
  },
  calculate_budget: {
    interestRate: 8.5,
    tenureYears: 20,
    downPaymentPct: 20,
    statusMessages: {
      start: "Let me work that out for you.",
      complete: "",
      failed: "I couldn't calculate that right now.",
    },
  },
  find_experience_center: {
    centres: [
      { id: "ec-1", name: "Godrej Experience Centre — Whitefield", address: "ITPL Main Rd, Whitefield", city: "Bengaluru" },
      { id: "ec-2", name: "Godrej Experience Centre — Worli", address: "Dr. Annie Besant Rd, Worli", city: "Mumbai" },
    ],
    statusMessages: {
      start: "Let me find the nearest one for you.",
      complete: "",
      failed: "I couldn't pull that up right now.",
    },
  },
  look_up_email: {
    crmSource: "Internal CRM",
    matchOn: "Phone number",
    statusMessages: {
      start: "One moment while I pull up your details.",
      complete: "",
      failed: "I couldn't find that on file.",
    },
  },
};

/** Placeholders a saved-answer tool can drop in (per spec §9, a known set). */
export const KNOWN_PLACEHOLDERS = [
  "ref_id",
  "created_at",
  "caller_name",
  "phone_number",
  "project_name",
];

/* ─── Validation (mirrors backend; spec §8) ───────────────────────── */

const TITLE_RE = /^[a-z0-9_]+$/;
const URL_RE = /^https?:\/\/.+/i;

export interface CustomToolDraft {
  title: string;
  description: string;
  kind: CustomKind;
  fields: ArgField[];
  // webhook
  method?: "POST" | "GET";
  url?: string;
  auth?: string;
  timeout?: number;
  // response
  response?: string;
}

export type ToolErrors = Partial<
  Record<"title" | "description" | "url" | "response" | "fields", string>
>;

/**
 * Validate a custom-tool draft. `reservedTitles` are all existing titles
 * the new title must not collide with (standard + other custom).
 * `isEdit` skips the uniqueness check for the tool's own title.
 */
export function validateCustomTool(
  draft: CustomToolDraft,
  reservedTitles: string[],
  isEdit: boolean
): ToolErrors {
  const errors: ToolErrors = {};
  const title = draft.title.trim();

  if (!title) errors.title = "Give the tool a name.";
  else if (!TITLE_RE.test(title))
    errors.title = "Use lowercase letters, numbers and underscores only.";
  else if (!isEdit && reservedTitles.includes(title))
    errors.title = "A tool with this name already exists.";

  if (!draft.description.trim())
    errors.description = "Tell the assistant when to use this.";

  if (draft.kind === "webhook") {
    if (!draft.url?.trim()) errors.url = "Add the web address to send to.";
    else if (!URL_RE.test(draft.url.trim()))
      errors.url = "Must start with http:// or https://";
  } else if (!draft.response?.trim()) {
    errors.response = "Write the answer the assistant should read back.";
  }

  // Each field row needs a valid key + a description; keys unique.
  const seen = new Set<string>();
  for (const f of draft.fields) {
    const key = f.key.trim();
    if (!key && !f.description.trim()) continue; // ignore fully-blank rows
    if (!TITLE_RE.test(key) || !f.description.trim() || seen.has(key)) {
      errors.fields =
        "Each field needs a lowercase name and a short description, and names can't repeat.";
      break;
    }
    seen.add(key);
  }

  return errors;
}

export function hasErrors(errors: ToolErrors): boolean {
  return Object.keys(errors).length > 0;
}

export { emptyArgs };
