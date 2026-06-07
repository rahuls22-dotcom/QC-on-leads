"use client";

// Shared bits for the Contact-extraction UI: the verified tick, copy button,
// contact-field cell, and contact-type checkboxes. Kept tiny and presentational
// so the composer, history table, and database can all reuse them. (Verification
// is always on now — there's no longer a verify toggle.)

import { useState } from "react";
import { BadgeCheck, Check, Copy, ExternalLink } from "lucide-react";

import {
  CE_TYPE_LABEL,
  type CEContactType,
  type CEFieldResult,
} from "@/lib/contact-extraction-data";

// Official LinkedIn brand glyph (the rounded-square "in" logo), in LinkedIn
// blue. Used instead of lucide's generic outline so a link to a profile reads as
// genuinely LinkedIn.
export function LinkedInIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#0A66C2"
      aria-hidden
      focusable="false"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

// A small "Verified" badge: green check icon + tooltip on hover.
export function VerifiedTick({ label = "Verified" }: { label?: string }) {
  return (
    <span className="relative inline-flex group/vt align-middle">
      <BadgeCheck size={14} strokeWidth={2} className="text-[#059669]" />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded-[5px] bg-text-primary px-1.5 py-0.5 text-[10.5px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover/vt:opacity-100 z-20"
      >
        {label}
      </span>
    </span>
  );
}

// Copy-to-clipboard button with a check + tooltip on success. Used next to an
// extracted value so the user can grab a phone/email in one click.
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard blocked (insecure context) — fall back to a temp textarea
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className="relative inline-flex group/cp items-center justify-center w-6 h-6 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors shrink-0"
    >
      {copied ? (
        <Check size={13} strokeWidth={2} className="text-[#059669]" />
      ) : (
        <Copy size={12.5} strokeWidth={1.75} />
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded-[5px] bg-text-primary px-1.5 py-0.5 text-[10.5px] font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover/cp:opacity-100 z-20"
      >
        {copied ? "Copied" : label}
      </span>
    </button>
  );
}

// Table cell for an extracted contact field. We always surface the value when we
// have one; the green tick is the only verification signal:
//   verified            → value + green tick + copy
//   found/risky/invalid → value + copy (no tick — couldn't be verified, but
//                          still the extracted value the user can act on)
//   not_found            → muted "Not found"
//   not requested        → muted "Not requested" (this type wasn't asked for)
// Shared by the Database table and the single-lookup history so the two match.
export function ContactFieldCell({ field }: { field?: CEFieldResult }) {
  if (!field) return <span className="text-text-tertiary">Not requested</span>;
  if (!field.value) {
    return (
      <span className="text-text-tertiary">
        {field.status === "not_found" ? "Not found" : "—"}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-text-primary max-w-[220px] truncate tabular-nums">{field.value}</span>
      {field.status === "verified" && <VerifiedTick />}
      <CopyButton value={field.value} />
    </div>
  );
}

// Contact name that doubles as a link to the person's LinkedIn profile. Hover
// underlines it and reveals a small external-link glyph + native tooltip, so the
// affordance reads as "this opens their LinkedIn." Falls back to plain text when
// we have no URL (e.g. a single lookup still running).
export function ProfileNameLink({ name, linkedin }: { name: string; linkedin?: string }) {
  if (!linkedin) {
    return <span className="text-text-primary font-medium">{name}</span>;
  }
  return (
    <a
      href={linkedin}
      target="_blank"
      rel="noopener noreferrer"
      title="Open LinkedIn profile"
      className="group/ln inline-flex items-center gap-1 max-w-[220px] text-text-primary font-medium hover:underline underline-offset-2 decoration-text-tertiary"
    >
      <span className="truncate">{name}</span>
      <ExternalLink
        size={12}
        strokeWidth={1.75}
        className="shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover/ln:opacity-100"
      />
    </a>
  );
}

const ALL_TYPES: CEContactType[] = ["phone", "personal_email", "work_email"];

// Real checkbox controls (box + label), not filled pills — keeps them clearly
// secondary so they don't read as primary action buttons. No icons: the labels
// are self-explanatory and icons just add clutter.
export function TypeCheckboxes({
  selected,
  onToggle,
}: {
  selected: CEContactType[];
  onToggle: (t: CEContactType) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {ALL_TYPES.map((t) => {
        const on = selected.includes(t);
        return (
          <label
            key={t}
            className="inline-flex items-center gap-1.5 cursor-pointer select-none group/cb"
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onToggle(t)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={[
                "inline-flex items-center justify-center w-[16px] h-[16px] rounded-[4px] border transition-colors",
                on
                  ? "bg-text-primary border-text-primary text-white"
                  : "bg-white border-border group-hover/cb:border-text-tertiary",
              ].join(" ")}
            >
              {on && <Check size={11} strokeWidth={2.5} />}
            </span>
            <span
              className={[
                "text-[12.5px] font-medium transition-colors",
                on ? "text-text-primary" : "text-text-secondary group-hover/cb:text-text-primary",
              ].join(" ")}
            >
              {CE_TYPE_LABEL[t]}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// Windowed numbered pagination. Pages are 0-indexed internally; the buttons show
// 1-based labels. Always shows first/last + a window around the current page,
// collapsing the gaps to "…". Shared by the Database and history tables.
function pageItems(page: number, total: number): (number | "ellipsis")[] {
  const want = [0, total - 1, page - 1, page, page + 1];
  const pages = [...new Set(want)].filter((n) => n >= 0 && n < total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = -1;
  for (const p of pages) {
    if (prev >= 0 && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const base =
    "h-8 min-w-[32px] px-2.5 inline-flex items-center justify-center text-[12px] font-medium rounded-button border transition-colors";
  const quiet =
    "border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent";
  return (
    <nav className="flex items-center justify-center gap-1.5 mt-3" aria-label="Pagination">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(Math.max(0, page - 1))}
        className={[base, quiet].join(" ")}
      >
        Previous
      </button>
      {pageItems(page, totalPages).map((it, i) =>
        it === "ellipsis" ? (
          <span key={`e${i}`} className="px-1 text-[12px] text-text-tertiary select-none">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-current={page === it ? "page" : undefined}
            onClick={() => onChange(it)}
            className={[
              base,
              "tabular-nums",
              page === it
                ? "border-text-primary bg-text-primary text-white"
                : "border-border text-text-secondary hover:bg-surface-secondary",
            ].join(" ")}
          >
            {it + 1}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        className={[base, quiet].join(" ")}
      >
        Next
      </button>
    </nav>
  );
}
