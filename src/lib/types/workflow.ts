// Sequence types — cadence engine connecting triggers → routing → agents → follow-up rules

// ─── Sequence Status ──────────────────────────────────────────────

export type WorkflowStatus = "active" | "paused" | "draft" | "completed" | "scheduled";

// ─── Trigger ────────────────────────────────────────────────────────

export type TriggerType = "csv_upload" | "crm_webhook" | "campaign_lead" | "manual" | "workflow_trigger";

export interface WorkflowTrigger {
  type: TriggerType;
  config: {
    /** For csv_upload: file reference */
    file_ref?: string;
    /** For crm_webhook: webhook URL */
    webhook_url?: string;
    /** For campaign_lead: which campaign */
    campaign_id?: string;
    /** For workflow_trigger: source workflow ID */
    source_workflow_id?: string;
  };
}

// ─── Routing ────────────────────────────────────────────────────────

export type RoutingMode = "none" | "rules" | "ai";

export interface RoutingRule {
  id: string;
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
  value: string;
  branch_id: string;
}

export interface WorkflowBranch {
  id: string;
  label: string;
  agent_id: string;
  /** Per-branch cadence — each branch can have its own schedule & follow-up rules */
  schedule?: WorkflowSchedule;
}

export interface WorkflowRouting {
  mode: RoutingMode;
  rules?: RoutingRule[];
  ai_prompt?: string;
  branches: WorkflowBranch[];
}

// ─── Default Step (when no routing) ─────────────────────────────────

export interface WorkflowDefaultStep {
  agent_id: string;
  /** Cadence for the single-agent path */
  schedule?: WorkflowSchedule;
}

// ─── Follow-Up Rules ────────────────────────────────────────────────

export interface FollowUpRule {
  id: string;
  /** Agent outcome that triggers this rule */
  outcome: string; // "no_answer", "partially_qualified", "callback", "voicemail", "not_interested"
  /** What the sequence does */
  action: "retry" | "follow_up" | "stop";
  /** How long to wait before re-triggering (hours) */
  delay_hours: number;
  /** Human-readable description */
  description: string;
}

// ─── Schedule & Cadence ─────────────────────────────────────────────

export interface WorkflowSchedule {
  daily_limit: number;
  active_hours: { start: string; end: string };
  active_days: string[];
  retry: {
    enabled: boolean;
    max_retries: number;
    interval_hours: number;
  };
  follow_up_rules: FollowUpRule[];
}

// ─── Sequence Stats ─────────────────────────────────────────────────

export interface WorkflowStats {
  totalContacts: number;
  called: number;
  connected: number;
  qualified: number;
  notQualified: number;
  callback: number;
  noAnswer: number;
}

// ─── Sequence Log Entry ─────────────────────────────────────────────

export interface SequenceLogEntry {
  id: string;
  contact_name: string;
  timestamp: string;
  agent_outcome: string;
  agent_suggested_next: string;
  agent_reasoning: string;
  sequence_decision: string;
  sequence_reasoning: string;
  next_trigger_at?: string;
}

// ─── Full Sequence Type ─────────────────────────────────────────────

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;

  trigger: WorkflowTrigger;

  /** Optional routing — if absent, use default_step */
  routing?: WorkflowRouting;

  /** Single agent step (used when routing is absent) — includes its own cadence */
  default_step?: WorkflowDefaultStep;

  /** Runtime stats */
  stats?: WorkflowStats;

  /** Progress percentage (0-100) */
  progress?: number;

  createdAt: string;
}

// ─── Sequence List Item (for list views) ────────────────────────────

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  trigger_type: TriggerType;
  agent_names: string[];
  status: WorkflowStatus;
  progress: number;
  stats: WorkflowStats;
  createdAt: string;
}
