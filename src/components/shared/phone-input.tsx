"use client";

// Phone input with an inline country-code dropdown.
//
// Rationale: every test/manual-entry phone field in the product was placeholder-
// hinting "+91 98765 43210", which forced users to remember and type the prefix.
// This component splits the prefix into a tight dropdown so users only type the
// 10-digit local number. The default is India because the customer base lives
// there, but the picker covers the codes we realistically see in workspaces
// (NRI buyers, regional sales reps).
//
// The prefix is intentionally not persisted into the parent's `value`. The host
// data models on the prototype only store the local digits, so adding the prefix
// would break existing validation rules. If a future caller needs the full
// E.164 string, expose `onCodeChange` and combine at the boundary.

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

const COUNTRIES: Array<{ code: string; name: string; flag: string }> = [
  { code: "+91",  name: "India",          flag: "🇮🇳" },
  { code: "+1",   name: "United States",  flag: "🇺🇸" },
  { code: "+44",  name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", name: "UAE",            flag: "🇦🇪" },
  { code: "+65",  name: "Singapore",      flag: "🇸🇬" },
  { code: "+966", name: "Saudi Arabia",   flag: "🇸🇦" },
  { code: "+61",  name: "Australia",      flag: "🇦🇺" },
  { code: "+49",  name: "Germany",        flag: "🇩🇪" },
  { code: "+33",  name: "France",         flag: "🇫🇷" },
  { code: "+86",  name: "China",          flag: "🇨🇳" },
];

export function PhoneInput({
  value,
  onChange,
  placeholder = "98765 43210",
  defaultCode = "+91",
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  defaultCode?: string;
  className?: string;
}) {
  const [code, setCode] = useState(defaultCode);
  const [open, setOpen] = useState(false);

  // Two-layer wrapper: an outer `relative` div that hosts the
  // popover, and an inner `overflow-hidden` flex row that renders
  // the country-code trigger + the digits input with clean rounded
  // corners. Splitting these is what makes the popover land *over*
  // the surrounding content instead of getting clipped by the
  // rounded container — which was the previous bug.
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-stretch h-9 border border-border rounded-input bg-white focus-within:border-accent transition-colors overflow-hidden">
        {/* Country-code trigger — opens the popover below. */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="h-full px-2.5 inline-flex items-center gap-1 text-[12.5px] text-text-primary tabular-nums border-r border-border-subtle hover:bg-surface-page transition-colors shrink-0"
        >
          <span>{code}</span>
          <ChevronDown
            size={11}
            strokeWidth={1.75}
            className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-full px-3 text-[12.5px] tabular-nums bg-transparent text-text-primary focus:outline-none placeholder:text-text-tertiary"
        />
      </div>

      {/* Popover — sits outside the overflow-hidden row so it can
          extend past the rounded container without being clipped. */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full mt-1 w-[220px] bg-white border border-border rounded-card shadow-lg z-40 max-h-[260px] overflow-y-auto py-1">
            {COUNTRIES.map((c) => {
              const isActive = c.code === code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCode(c.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                    isActive ? "bg-accent/5" : "hover:bg-surface-page"
                  }`}
                >
                  <span className="text-[14px] leading-none">{c.flag}</span>
                  <span className="flex-1 min-w-0 text-text-primary truncate">{c.name}</span>
                  <span className="text-text-tertiary tabular-nums">{c.code}</span>
                  {isActive && (
                    <Check size={12} strokeWidth={2} className="text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
