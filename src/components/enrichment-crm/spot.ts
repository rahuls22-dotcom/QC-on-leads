// Spot nudge engine, pure function.
// Inputs: which enrichment types are picked + which fields have a value.
// Output: optional upgrade line + optional name-quality note.
// Spot stays silent when (a) required fields aren't filled, or (b) the user already
// has the strongest input combination.

import type { EnrichmentType, RequiredField } from "@/lib/enrichment-crm-data";

export type SpotInput = {
  types: EnrichmentType[];
  available: Set<RequiredField>;
};

export type SpotMessage = {
  primary?: string;     // upgrade hint shown as first line
  nameNote?: boolean;   // shows "Use the exact name registered with the phone number"
};

export const SPOT_NAME_NOTE = "Use the exact name registered with the phone number.";

export function computeSpot({ types, available }: SpotInput): SpotMessage | null {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return null;

  const has = (f: RequiredField) => available.has(f);

  // Professional only ───────────────────────────────────────────────
  if (hasPro && !hasFin) {
    const proRequiredMet = has("email") || has("phone") || has("linkedin");
    if (!proRequiredMet) return null;             // static instruction takes over
    if (has("linkedin")) return null;             // strongest path, silent
    if (has("email") && has("phone")) return null; // skip per spec
    if (has("email")) {
      return {
        primary: "Add LinkedIn URL for a higher enrichment rate. Email alone still works.",
      };
    }
    if (has("phone")) {
      return {
        primary: "Add LinkedIn URL or Email for a higher enrichment rate. Phone alone still works.",
      };
    }
    return null;
  }

  // Financial only ──────────────────────────────────────────────────
  if (hasFin && !hasPro) {
    const finRequiredMet = has("name") && has("phone");
    if (!finRequiredMet) return null;
    return { nameNote: true };
  }

  // Professional + Financial ────────────────────────────────────────
  const bothRequiredMet = has("name") && has("phone");
  if (!bothRequiredMet) return null;

  // Required met. Decide if Pro upgrade also fires.
  if (has("linkedin") || has("email")) {
    // Pro path already strong enough, name note only
    return { nameNote: true };
  }

  // Only Name + Phone → nudge Pro upgrade + name note
  return {
    primary:
      "Add LinkedIn URL or Email for a higher Professional enrichment rate. Name + Phone still works.",
    nameNote: true,
  };
}

// Static instruction shown when required fields aren't filled.
// Renders in the footer area (not in Spot bubble), it's a hard requirement, not a tip.
export function staticInstruction(types: EnrichmentType[]): string | null {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return "Pick at least one enrichment type to get started.";
  if (hasPro && !hasFin) return "Add LinkedIn URL, Email, or Phone to get started.";
  if (hasFin && !hasPro) return "Add Name and Phone to get started.";
  return "Add Name and Phone to get started.";
}

// Required-fields-met check used to enable/disable the submit button.
export function requiredFieldsMet(
  types: EnrichmentType[],
  available: Set<RequiredField>,
): boolean {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  if (!hasPro && !hasFin) return false;

  const has = (f: RequiredField) => available.has(f);

  if (hasFin && (!has("name") || !has("phone"))) return false;
  if (hasPro && !hasFin && !has("email") && !has("phone") && !has("linkedin")) return false;
  return true;
}
