// Versioned localStorage I/O for the dashboard. Holds saved views + chart
// card configuration. Range and active filters are NOT persisted — they
// reset on every page load by design.

import { DEFAULT_CHART_CARDS, type ChartCardId, type SavedView } from "./types";

const STORAGE_KEY = "revspot.dashboard.v1";

interface Persisted {
  v: 1;
  savedViews: SavedView[];
  chartCards: ChartCardId[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadDashboardState(): { savedViews: SavedView[]; chartCards: ChartCardId[] } {
  if (!isBrowser()) return { savedViews: [], chartCards: [...DEFAULT_CHART_CARDS] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { savedViews: [], chartCards: [...DEFAULT_CHART_CARDS] };
    const parsed: Persisted = JSON.parse(raw);
    if (parsed.v !== 1) return { savedViews: [], chartCards: [...DEFAULT_CHART_CARDS] };
    return {
      savedViews: Array.isArray(parsed.savedViews) ? parsed.savedViews : [],
      chartCards:
        Array.isArray(parsed.chartCards) && parsed.chartCards.length > 0
          ? parsed.chartCards
          : [...DEFAULT_CHART_CARDS],
    };
  } catch {
    return { savedViews: [], chartCards: [...DEFAULT_CHART_CARDS] };
  }
}

export function saveDashboardState(state: {
  savedViews: SavedView[];
  chartCards: ChartCardId[];
}): void {
  if (!isBrowser()) return;
  try {
    const payload: Persisted = { v: 1, ...state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or disabled — silently ignore. Dashboard still works in-session.
  }
}

export function newSavedViewId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sv-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
