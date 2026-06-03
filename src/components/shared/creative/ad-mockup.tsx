"use client";

import { useEffect, useRef, useState } from "react";
import type { MockupCopy, MockupField } from "./types";

/**
 * Visual mock for a generated creative. Renders one of 4 hard-coded styles
 * keyed by `variant`. All visible text is editable when `onEditText` is
 * provided — clicking any text element converts it to an inline editor
 * (Canva-style). Commit on blur / Enter; cancel on Escape.
 */

interface AdMockupProps {
  variant: number;
  headline: string;
  mockup?: MockupCopy;
  /** When provided, text becomes editable inline. Called on blur/Enter. */
  onEditText?: (field: MockupField, value: string) => void;
}

export function AdMockup({ variant, headline, mockup, onEditText }: AdMockupProps) {
  const m = mockup;
  const editable = !!onEditText;

  switch (variant) {
    case 1:
      // Bold typography with lifestyle imagery — warm gradient
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-[#FED7AA] via-[#FCA5A5] to-[#F97373] flex items-end p-5 overflow-hidden">
          <div className="absolute top-4 left-4 h-6 w-6 rounded-[4px] bg-white/30 backdrop-blur-sm" />
          <div className="absolute top-10 left-4 right-4 h-[1px] bg-white/30" />
          <div className="text-white z-10 w-full">
            <EditableText
              value={m?.eyebrow ?? "Phase 3 · Now Open"}
              onCommit={(v) => onEditText?.("eyebrow", v)}
              editable={editable}
              tone="onDark"
              className="text-[9px] font-semibold uppercase tracking-[2px] opacity-90 mb-1.5 block"
              singleLine
            />
            <EditableText
              value={headline}
              onCommit={(v) => onEditText?.("headline", v)}
              editable={editable}
              tone="onDark"
              className="text-[14px] font-bold leading-tight line-clamp-2 block"
            />
          </div>
        </div>
      );
    case 2:
      // Minimalist with price anchor
      return (
        <div className="relative w-full h-full bg-[#FAFAF7] flex flex-col justify-between p-5 overflow-hidden">
          <div className="text-[#1A1A1A] leading-none tracking-tight flex items-start">
            <EditableText
              value={m?.priceMain ?? "₹1.8"}
              onCommit={(v) => onEditText?.("priceMain", v)}
              editable={editable}
              tone="onLight"
              className="text-[44px] font-bold"
              singleLine
            />
            <EditableText
              value={m?.priceUnit ?? "Cr"}
              onCommit={(v) => onEditText?.("priceUnit", v)}
              editable={editable}
              tone="onLight"
              className="text-[20px] font-semibold mt-1 ml-0.5"
              singleLine
            />
          </div>
          <div>
            <div className="h-[2px] w-8 bg-[#1A1A1A] mb-2" />
            <EditableText
              value={m?.priceLabel ?? "Starting Price"}
              onCommit={(v) => onEditText?.("priceLabel", v)}
              editable={editable}
              tone="onLight"
              className="text-[9px] text-[#1A1A1A] font-semibold uppercase tracking-[1.5px] block"
              singleLine
            />
            <EditableText
              value={m?.priceSubtext ?? "RERA approved · Phase 3"}
              onCommit={(v) => onEditText?.("priceSubtext", v)}
              editable={editable}
              tone="onLight"
              className="text-[10px] text-[#6B6B6B] mt-0.5 line-clamp-1 block"
              singleLine
            />
          </div>
          <div className="absolute top-4 right-4">
            <EditableText
              value={m?.brandCorner ?? "GODREJ"}
              onCommit={(v) => onEditText?.("brandCorner", v)}
              editable={editable}
              tone="onLight"
              className="text-[9px] font-bold text-[#1A1A1A] tracking-wider"
              singleLine
            />
          </div>
        </div>
      );
    case 3:
      // Testimonial with social proof — teal
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-[#0F766E] to-[#134E4A] flex flex-col justify-center p-5 overflow-hidden">
          <div className="text-white/25 text-[56px] leading-none font-serif -mb-2">&ldquo;</div>
          <EditableText
            value={m?.quote ?? "Changed our lives."}
            onCommit={(v) => onEditText?.("quote", v)}
            editable={editable}
            tone="onDark"
            className="text-white text-[13px] leading-snug font-medium line-clamp-2 block"
          />
          <div className="mt-3">
            <div className="flex gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[10px] text-[#FCD34D]">
                  &#9733;
                </span>
              ))}
            </div>
            <EditableText
              value={m?.attribution ?? "— Rajesh & Priya"}
              onCommit={(v) => onEditText?.("attribution", v)}
              editable={editable}
              tone="onDark"
              className="text-white/80 text-[10px] font-medium block"
              singleLine
            />
            <EditableText
              value={m?.subAttribution ?? "3BHK owners · 1200+ families"}
              onCommit={(v) => onEditText?.("subAttribution", v)}
              editable={editable}
              tone="onDark"
              className="text-white/50 text-[9px] block"
              singleLine
            />
          </div>
        </div>
      );
    case 4:
      // Premium dark theme with gold accents
      return (
        <div className="relative w-full h-full bg-[#0A0A0A] flex flex-col justify-center items-center p-5 text-center overflow-hidden">
          <div className="absolute top-5 left-0 right-0 flex justify-center">
            <div className="h-[1px] w-12 bg-[#D4A574]" />
          </div>
          <EditableText
            value={m?.brandHeader ?? "Godrej Air"}
            onCommit={(v) => onEditText?.("brandHeader", v)}
            editable={editable}
            tone="onDark"
            className="text-[9px] text-[#D4A574] font-semibold uppercase tracking-[3px] mb-2 block"
            singleLine
          />
          <div className="text-white text-[14px] font-light leading-snug tracking-wide flex flex-col items-center">
            <EditableText
              value={m?.titleLineA ?? "Luxury"}
              onCommit={(v) => onEditText?.("titleLineA", v)}
              editable={editable}
              tone="onDark"
              className="block"
              singleLine
            />
            <EditableText
              value={m?.titleLineB ?? "Redefined"}
              onCommit={(v) => onEditText?.("titleLineB", v)}
              editable={editable}
              tone="onDark"
              className="italic text-[#D4A574] block"
              singleLine
            />
          </div>
          <div className="absolute bottom-5 left-0 right-0 flex justify-center">
            <div className="h-[1px] w-12 bg-[#D4A574]" />
          </div>
        </div>
      );
    default:
      return (
        <div className="w-full h-full bg-surface-secondary flex items-center justify-center">
          <span className="text-[11px] font-medium text-text-tertiary">Variant {variant}</span>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  EditableText — inline contenteditable wrapper                      */
/* ------------------------------------------------------------------ */

interface EditableTextProps {
  value: string;
  onCommit: (next: string) => void;
  editable: boolean;
  /** Visual tone for the editing affordance (matches the surrounding bg). */
  tone: "onLight" | "onDark";
  className?: string;
  /** When true, Enter commits and newlines are blocked. */
  singleLine?: boolean;
}

/**
 * Renders text as a span. When editable=true, clicking turns it into a
 * focused contenteditable. Commit on blur or Enter; cancel on Escape.
 */
function EditableText({
  value,
  onCommit,
  editable,
  tone,
  className = "",
  singleLine = false,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const initialValueRef = useRef(value);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    initialValueRef.current = value;
    // Place cursor at end after focus.
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing, value]);

  const commit = () => {
    const next = (ref.current?.innerText ?? "").replace(/ /g, " ");
    setEditing(false);
    if (next !== initialValueRef.current) {
      onCommit(next);
    }
  };

  const cancel = () => {
    setEditing(false);
    if (ref.current) ref.current.innerText = initialValueRef.current;
  };

  const handleKey = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      ref.current?.blur();
    } else if (e.key === "Enter" && (singleLine || !e.shiftKey)) {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLSpanElement>) => {
    if (!singleLine) return;
    // Strip newlines when single-line.
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s+/g, " ");
    document.execCommand("insertText", false, text);
  };

  if (!editable) {
    return <span className={className}>{value}</span>;
  }

  const hoverRing =
    tone === "onLight"
      ? "hover:outline-dashed hover:outline-1 hover:outline-violet-500/50 hover:outline-offset-2"
      : "hover:outline-dashed hover:outline-1 hover:outline-white/60 hover:outline-offset-2";
  const focusRing =
    tone === "onLight"
      ? "outline-2 outline outline-violet-500 outline-offset-2 bg-white/40"
      : "outline-2 outline outline-white/90 outline-offset-2 bg-black/30";

  return (
    <span
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={handleKey}
      onPaste={handlePaste}
      onClick={(e) => {
        if (!editing) {
          e.stopPropagation();
          setEditing(true);
          // Defer focus to after re-render.
          requestAnimationFrame(() => ref.current?.focus());
        }
      }}
      tabIndex={0}
      role="textbox"
      aria-label="Edit text"
      className={`${className} cursor-text rounded-[2px] transition-[outline,background] duration-100 ${
        editing ? focusRing : hoverRing
      }`}
    >
      {value}
    </span>
  );
}
