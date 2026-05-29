"use client";

import { Sun, Moon } from "lucide-react";
import { useState } from "react";

/**
 * Slim top bar — light/dark toggle (visual only for now) + user avatar.
 * No left-side content; the project header lives in the page body.
 */
export function Topbar() {
  const [dark, setDark] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-end gap-3 px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Sun
          size={16}
          strokeWidth={2}
          className={dark ? "text-muted-foreground" : "text-warning"}
        />
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          onClick={() => setDark((v) => !v)}
          className="relative w-9 h-5 rounded-full bg-secondary transition-colors"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background border border-border transition-transform ${
              dark ? "translate-x-4" : ""
            }`}
          />
        </button>
        <Moon
          size={16}
          strokeWidth={2}
          className={dark ? "text-foreground" : "text-muted-foreground"}
        />
      </div>
      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[11px] font-semibold">
        RA
      </div>
    </header>
  );
}
