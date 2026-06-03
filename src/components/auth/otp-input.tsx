"use client";

// Six-box one-time-code input. Handles the things users expect from a real
// OTP field: auto-advance on type, backspace to the previous box, paste a full
// code into any box, arrow-key nav, and digits-only. Reports the joined value
// up via onChange and fires onComplete when all six are filled.

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

const LEN = 6;

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").slice(0, LEN);

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LEN - 1, i))]?.focus();

  const setAt = (i: number, char: string) => {
    const next = value.split("");
    next[i] = char;
    const joined = next.join("").slice(0, LEN);
    onChange(joined);
    return joined;
  };

  const handleChange = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1); // last typed digit only
    if (!char) return;
    const joined = setAt(i, char);
    if (i < LEN - 1) focus(i + 1);
    if (joined.length === LEN && !joined.includes("")) onComplete?.(joined);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setAt(i, "");
      } else if (i > 0) {
        setAt(i - 1, "");
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!pasted) return;
    onChange(pasted);
    focus(pasted.length - 1);
    if (pasted.length === LEN) onComplete?.(pasted);
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {Array.from({ length: LEN }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digits[i] ?? ""}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-full h-13 min-w-0 flex-1 text-center text-[20px] font-semibold rounded-input border bg-white text-text-primary transition-all focus:outline-none focus:ring-2 disabled:opacity-50 ${
            error
              ? "border-[#FECACA] focus:border-[#DC2626] focus:ring-[#DC2626]/10"
              : "border-border focus:border-[#C8C8C8] focus:ring-black/[0.05]"
          }`}
          style={{ height: "52px" }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
