"use client";

import { create } from "zustand";
import type { GuidedKind, GuidedPayload, SpotMessage, SpotScope } from "./types";

type PanelState = {
  open: boolean;
  maximized: boolean;
  scope: SpotScope;
  // Bumped each time the host calls askSpot(query) so the panel knows to
  // reset its thread and seed a reply for the new question.
  pendingQuery: { q: string; ts: number } | null;
  // Live conversation in the panel.
  thread: SpotMessage[];

  // Command palette
  paletteOpen: boolean;

  // Guided flow modal
  guided: GuidedPayload | null;

  // Toast
  toast: string | null;

  // Setters
  askSpot: (query: string, scope?: SpotScope) => void;
  setScope: (scope: SpotScope) => void;
  appendMessage: (m: SpotMessage) => void;
  setThread: (m: SpotMessage[] | ((prev: SpotMessage[]) => SpotMessage[])) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleMaximize: () => void;
  setMaximized: (v: boolean) => void;
  openPalette: () => void;
  closePalette: () => void;
  openGuided: (payload: GuidedPayload) => void;
  closeGuided: () => void;
  showToast: (text: string) => void;
  dismissToast: () => void;
};

const WORKSPACE_SCOPE: SpotScope = { kind: "workspace", label: "Workspace" };

export const useSpotStore = create<PanelState>((set) => ({
  open: false,
  maximized: false,
  scope: WORKSPACE_SCOPE,
  pendingQuery: null,
  thread: [],
  paletteOpen: false,
  guided: null,
  toast: null,

  askSpot: (query, scope) =>
    set((s) => ({
      open: true,
      scope: scope || s.scope,
      // bump ts even when the same query is repeated so subscribers re-fire
      pendingQuery: { q: query, ts: Date.now() },
    })),

  setScope: (scope) => set({ scope }),
  appendMessage: (m) => set((s) => ({ thread: [...s.thread, m] })),
  setThread: (m) =>
    set((s) => ({ thread: typeof m === "function" ? m(s.thread) : m })),

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false, maximized: false }),
  togglePanel: () => set((s) => ({ open: !s.open, maximized: s.open ? false : s.maximized })),
  toggleMaximize: () => set((s) => ({ maximized: !s.maximized, open: true })),
  setMaximized: (v) => set({ maximized: v }),

  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),

  openGuided: (payload) => set({ guided: payload }),
  closeGuided: () => set({ guided: null }),

  showToast: (text) => set({ toast: text }),
  dismissToast: () => set({ toast: null }),
}));

/** Resolve a scope object from a "workspace" | "project:<id>" | "campaign:<id>" string. */
export function scopeFromRoute(
  pathname: string,
  resolve: { project?: (id: string) => string | null; campaign?: (id: string) => string | null } = {},
): SpotScope {
  // Path patterns: /projects/<id>, /campaigns/<id>, otherwise workspace
  const projMatch = pathname.match(/^\/projects\/([^/?#]+)/);
  if (projMatch) {
    const label = resolve.project?.(projMatch[1]) || "Project";
    return { kind: "project", label, target: projMatch[1] };
  }
  const campMatch = pathname.match(/^\/campaigns\/([^/?#]+)/);
  if (campMatch) {
    const label = resolve.campaign?.(campMatch[1]) || "Campaign";
    return { kind: "campaign", label, target: campMatch[1] };
  }
  return { kind: "workspace", label: "Workspace" };
}

/** Map a guided flow kind to a friendly label. */
export const guidedKindLabel: Record<GuidedKind, string> = {
  "new-persona": "Add a new persona",
  "new-angle": "Add a new angle",
  "launch-creative": "Launch new creatives",
  "new-campaign": "New campaign",
  "new-adset": "New ad set",
};
