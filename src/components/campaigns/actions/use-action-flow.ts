"use client";

import { useState, useCallback } from "react";
import type { ActionVerb, ActionColor } from "@/lib/types/diagnosis-payload";

/**
 * Normalized action shape consumed by the action-flow modal.
 * Both NextBestAction and SecondaryAction collapse into this so the modal
 * doesn't need to know which flavor it received.
 */
export interface RenderableAction {
  id: string;
  verb: ActionVerb;
  headline: string;
  reason: string;
  /** Expected impact / outcome — copy varies by source action shape. */
  expected: string;
  cta_label: string;
  target_entity?: string | null;
  redeploy_to?: string | null;
  color?: ActionColor;
}

export function useActionFlow() {
  const [active, setActive] = useState<RenderableAction | null>(null);

  const open = useCallback((action: RenderableAction) => {
    setActive(action);
  }, []);

  const close = useCallback(() => {
    setActive(null);
  }, []);

  return { active, open, close };
}

/* ────────────── adapters ────────────── */

import type { NextBestAction, SecondaryAction } from "@/lib/types/diagnosis-payload";

export function fromNBA(action: NextBestAction): RenderableAction {
  return {
    id: action.id,
    verb: action.verb,
    headline: action.headline,
    reason: action.reason,
    expected: action.expected_impact,
    cta_label: action.cta_label,
    target_entity: action.target_entity,
    redeploy_to: action.redeploy_to,
    color: action.color,
  };
}

export function fromSecondary(action: SecondaryAction): RenderableAction {
  return {
    id: action.id,
    verb: action.verb,
    headline: action.headline,
    reason: action.reason,
    expected: action.expected,
    cta_label: action.cta_label,
    target_entity: action.target_entity,
  };
}
