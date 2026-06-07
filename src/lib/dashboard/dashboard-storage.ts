// Versioned localStorage I/O for the dashboard. Persists the user's grid
// configuration: which preset cards are active, plus any custom-built cards.
// Range / source / page filters are NOT persisted, they reset per load.

import {
  DEFAULT_CHART_CARDS,
  type ChartCardId,
  type CustomChartCard,
} from "./types";

const STORAGE_KEY = "revspot.dashboard.v3";
const LEGACY_KEY = "revspot.dashboard.v1";

interface Persisted {
  v: 3;
  defaultCards: ChartCardId[];
  customCards: CustomChartCard[];
}

interface LegacyPersisted {
  v: 1;
  savedViews?: unknown;
  chartCards?: string[];
}

export interface DashboardPersistedState {
  defaultCards: ChartCardId[];
  customCards: CustomChartCard[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function fresh(): DashboardPersistedState {
  return { defaultCards: [...DEFAULT_CHART_CARDS], customCards: [] };
}

export function loadDashboardState(): DashboardPersistedState {
  if (!isBrowser()) return fresh();
  try {
    // v3 first.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Persisted = JSON.parse(raw);
      if (parsed.v === 3) {
        const defaults = Array.isArray(parsed.defaultCards)
          ? (parsed.defaultCards.filter((c) =>
              (DEFAULT_CHART_CARDS as string[]).includes(c),
            ) as ChartCardId[])
          : [...DEFAULT_CHART_CARDS];
        return {
          defaultCards: defaults.length > 0 ? defaults : [...DEFAULT_CHART_CARDS],
          customCards: Array.isArray(parsed.customCards) ? parsed.customCards : [],
        };
      }
    }
    // Legacy v1 migration, drop savedViews + any non-default chartCard ids
    // (the new model only retains the 5 presets as defaults).
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed: LegacyPersisted = JSON.parse(legacy);
      if (parsed.v === 1) {
        const defaults = Array.isArray(parsed.chartCards)
          ? (parsed.chartCards.filter((c) =>
              (DEFAULT_CHART_CARDS as string[]).includes(c),
            ) as ChartCardId[])
          : [...DEFAULT_CHART_CARDS];
        return {
          defaultCards: defaults.length > 0 ? defaults : [...DEFAULT_CHART_CARDS],
          customCards: [],
        };
      }
    }
    return fresh();
  } catch {
    return fresh();
  }
}

export function saveDashboardState(state: DashboardPersistedState): void {
  if (!isBrowser()) return;
  try {
    const payload: Persisted = { v: 3, ...state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or disabled, silently ignore. Dashboard still works in-session.
  }
}

export function newCardId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cc-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
