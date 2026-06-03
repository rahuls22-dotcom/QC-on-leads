// Agent types — channel-agnostic, objective-based conversation configs

import { FieldDef, Priority, FieldType } from "./common";

// ─── Status & Templates ────────────────────────────────────────────

export type AgentStatus = "active" | "draft" | "paused";

export type AgentTemplate = "qualifying" | "follow_up" | "survey" | "onboarding" | "blank";

export type LanguageBehavior = "match_lead" | "primary_only" | "ask_preference";

export type AgentTone = "formal" | "conversational" | "friendly";

// ─── Objective (core building block) ────────────────────────────────

export interface Objective {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  required: boolean;
  /** Field to extract when this objective is achieved */
  extract_field: {
    name: string;
    type: FieldType;
    unit?: string;
  };
  /** Guidance for the LLM on how to achieve this objective */
  prompt_hint: string;
  /** Qualification rule — supports {{variable}} syntax for parameterization */
  qualification_rule?: string; // e.g., "budget >= {{min_budget}}"
}

// ─── Template Variable ──────────────────────────────────────────────

export interface AgentVariable {
  name: string; // e.g., "min_budget"
  type: "string" | "number" | "currency" | "enum";
  required: boolean;
  default?: string;
  description?: string;
  enum_values?: string[]; // if type is "enum"
}

// ─── Channel Configs (overlays on the agent) ────────────────────────

export interface VoiceConfig {
  voice_id: string;
  voice_name: string;
  max_duration_min: number;
  silence_timeout_sec: number;
  interruption_handling: boolean;
}

export interface WhatsAppConfig {
  first_message_template: string;
  quick_replies: string[];
  reply_timeout_hours: number;
  rich_media: { type: "image" | "document" | "video"; url: string; caption?: string }[];
}

// ─── Agent Identity ─────────────────────────────────────────────────

export interface AgentIdentity {
  persona: string; // "Vox"
  tone: AgentTone;
  languages: string[];
  language_behavior: LanguageBehavior;
}

// ─── Agent Knowledge Base ───────────────────────────────────────────

export interface AgentKnowledge {
  product_brief: string;
  system_prompt: string;
  faqs: { question: string; answer: string }[];
  objection_handling: string[];
  custom_docs: string[]; // file references
}

// ─── Agent Output Schema ────────────────────────────────────────────

export interface AgentOutputSchema {
  qualification_threshold: string; // e.g., "all critical + 1 high"
  custom_extract_fields: FieldDef[];
}

// ─── Full Agent Type ────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  template: AgentTemplate;

  identity: AgentIdentity;
  knowledge: AgentKnowledge;
  objectives: Objective[];
  variables: AgentVariable[];

  /** Channel-specific configs — agent supports any channel it has config for */
  voice_config?: VoiceConfig;
  whatsapp_config?: WhatsAppConfig;

  /** Contract with workflows: what the agent produces */
  output_schema: AgentOutputSchema;

  /** Runtime stats (populated from usage data) */
  stats?: {
    total_calls: number;
    connection_rate: number;
    qualification_rate: number;
    avg_duration_min: number;
    last_used: string;
  };
}

// ─── Agent List Item (for list views) ───────────────────────────────

export interface AgentListItem {
  id: string;
  name: string;
  description: string;
  template: AgentTemplate;
  status: AgentStatus;
  /** Which channels this agent supports */
  supported_channels: ("voice" | "whatsapp")[];
  languages: string[];
  objectives_count: number;
  variables_count: number;
  /** Runtime stats */
  total_calls: number;
  qualification_rate: number;
  avg_duration: number;
  last_used: string;
  post_call_summary: string;
}

// ─── Voice options (for agent creation) ─────────────────────────────

export interface VoiceOption {
  id: string;
  name: string;
  gender: "Male" | "Female";
  languages: string[];
  preview_url?: string;
}
