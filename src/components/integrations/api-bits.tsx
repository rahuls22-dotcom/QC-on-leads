"use client";

// Shared display primitives for the API & Webhooks tab — copy-to-clipboard
// field and a light code/payload block.

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyField({
  value,
  label,
  mono = true,
  masked = false,
}: {
  value: string;
  label?: string;
  mono?: boolean;
  masked?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!masked);

  const display = revealed ? value : "•".repeat(Math.min(value.length, 28));

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div>
      {label && (
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
          {label}
        </div>
      )}
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 min-w-0 truncate h-9 inline-flex items-center px-3 rounded-input border border-border bg-surface-page text-[12.5px] text-text-primary ${
            mono ? "font-mono" : ""
          }`}
        >
          {display}
        </code>
        {masked && (
          <button
            onClick={() => setRevealed((v) => !v)}
            className="h-9 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button hover:border-border-strong transition-colors duration-150 shrink-0"
          >
            {revealed ? "Hide" : "Reveal"}
          </button>
        )}
        <button
          onClick={copy}
          className="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-button hover:border-border-strong transition-colors duration-150 shrink-0"
        >
          {copied ? (
            <>
              <Check size={13} strokeWidth={2} className="text-[#15803D]" />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} strokeWidth={1.5} />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-card border border-border bg-surface-page text-text-primary text-[11.5px] leading-relaxed font-mono p-3.5">
      <code>{children}</code>
    </pre>
  );
}
