"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type DemoMode = "populated" | "empty";

interface DemoModeContextValue {
  mode: DemoMode;
  toggle: () => void;
  setMode: (m: DemoMode) => void;
  isEmpty: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  mode: "populated",
  toggle: () => {},
  setMode: () => {},
  isEmpty: false,
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DemoMode>("populated");
  const toggle = useCallback(
    () => setModeState((m) => (m === "populated" ? "empty" : "populated")),
    []
  );
  // Exposed so flows can drop the user back into the populated state once
  // they've finished a "first-time" journey (e.g. on Launch from /create).
  const setMode = useCallback((m: DemoMode) => setModeState(m), []);
  return (
    <DemoModeContext.Provider value={{ mode, toggle, setMode, isEmpty: mode === "empty" }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoModeContext);
}
