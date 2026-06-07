// Types used across the Spot agent surfaces (panel, palette, guided flows).
//
// In this version Spot is answer-only. There is no "actions" part type. Any
// "doing" needs to be expressed as a handoff to a guided flow.

export type ScopeKind = "workspace" | "project" | "campaign";

export type SpotScope = {
  kind: ScopeKind;
  label: string;
  target?: string;
};

export type Verdict = "ok" | "warn" | "err" | "info";

export type SpotPart =
  | { type: "text"; text: string }
  | { type: "headline"; text: string; verdict?: Verdict }
  | { type: "findings"; items: SpotFinding[] }
  | { type: "kpis"; items: SpotKpi[] }
  | { type: "handoff"; kind: GuidedKind; label: string; reason: string }
  // Inline workflow CTA — owns the "Approve & continue" action so the
  // chat (not the right-pane workspace) is where decisions get made.
  // Spent rendered the right-pane canvas as a place to *see* the work
  // and the chat as the place to *act on it*, like Claude's flows.
  | { type: "step-cta"; label: string; helper?: string; refineHint?: string }
  // Multi-option branch — two or three mutually-exclusive choices in a
  // single Spot message (e.g. "Import campaigns" vs "Launch new"). Each
  // option carries an `action` key the renderer maps to a store call.
  | { type: "choice"; prompt?: string; options: SpotChoiceOption[] }
  // Tool / agent call narration — renders a compact status row that
  // says "Spawning Persona Researcher…" with a spinner. Status flips
  // to "done" with a check once the workflow advances.
  | {
      type: "tool-call";
      id: string;
      agent: string;
      detail?: string;
      status: "running" | "done";
    };

/** Branch actions a `choice` part can trigger. Mapped to store calls in
 *  the chat renderer (ChoicePart). */
export type SpotChoiceAction =
  | "launch-new" // kickoff → draft a fresh execution plan
  | "import-campaigns" // open the import-campaigns canvas
  | "launch-after-import" // after import → jump into the launch plan
  | "analyse-performance"; // after import → open Campaigns

export type SpotChoiceIcon = "rocket" | "download" | "chart" | "sparkles";

export type SpotChoiceOption = {
  label: string;
  helper?: string;
  action: SpotChoiceAction;
  icon?: SpotChoiceIcon;
  variant?: "primary" | "secondary";
};

export type SpotFinding = {
  tone?: "concern" | "positive" | "neutral";
  title: string;
  body: string;
  evidence?: string[];
};

export type SpotKpi = {
  label: string;
  value: string;
  delta?: string;
  good?: boolean | null;
};

export type SpotMessage =
  | { role: "user"; text: string }
  | { role: "spot"; parts: SpotPart[] };

export type SpotThread = {
  id: string;
  title: string;
  scope: string; // "workspace" | "project:<id>" | "campaign:<id>"
  when: string;
  pinned?: boolean;
};

export type GuidedKind =
  | "new-persona"
  | "new-angle"
  | "launch-creative"
  | "new-campaign"
  | "new-adset";

export type GuidedPayload = {
  kind: GuidedKind;
  projectId?: string;
  personaId?: string;
  angleId?: string;
  prefillTypeId?: string;
};
