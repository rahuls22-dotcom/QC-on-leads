"use client";

// Notion-flavoured markdown renderer · zero external deps.
//
// We parse the same minimal markdown the memory files emit (# headings,
// paragraphs, bullet lists, inline bold/italic/code) but render with
// context awareness — different sections get different visual
// treatments so the canvas reads more like a Notion page than a wall
// of bullets.
//
// Section detection (driven by the preceding H2 text):
//   · "Product brief"               → 2-col icon-led key/value cards
//   · "Pricing"                     → 3-col price tiles
//   · "Offers"                      → pill row
//   · "USPs · lead with these"      → green-bordered insight cards
//   · "Do not mention"              → amber-bordered guardrail cards
//   · "Linked personas"             → persona chips
//   · "Attached collateral"         → file rows
//   · anything else                 → clean bullet list
//
// The first italic-only paragraph after H1 is rendered as a tag pill
// row (Notion-style "properties"); the first regular paragraph after
// that becomes a featured callout for the tagline. The closing italic
// paragraph after a horizontal rule becomes a footer metadata strip.

import { Fragment } from "react";
import {
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  FileText,
  Layers,
  Film,
  Image as ImageIcon,
  User,
} from "lucide-react";

/* ─── Public component ────────────────────────────────────────── */

/** Theme toggle · "dark" flips the article into Notion-style dark
 *  mode (off-black surface, light text, gold accents). Defaults to
 *  light. The class `md-dark` powers most of the colour overrides
 *  in globals.css so we don't need a per-block prop. */
export function Markdown({
  source,
  theme = "light",
}: {
  source: string;
  theme?: "light" | "dark";
}) {
  const blocks = parseBlocks(source);
  const enriched = enrichWithSections(blocks);

  return (
    <article
      className={`md-render max-w-[760px] mx-auto px-1 ${
        theme === "dark" ? "md-dark" : ""
      }`}
    >
      {enriched.map((b, i) => renderBlock(b, i))}
    </article>
  );
}

/* ─── Block parsing ──────────────────────────────────────────── */

type RawBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "rule" };

function parseBlocks(src: string): RawBlock[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: RawBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }
    const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      blocks.push({
        type: "heading",
        level: hMatch[1].length as 1 | 2 | 3,
        text: hMatch[2].trim(),
      });
      i++;
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items, ordered: false });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items, ordered: true });
      continue;
    }
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^-\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: buf.join(" ").trim() });
  }
  return blocks;
}

/* ─── Section enrichment ─────────────────────────────────────── */

/** Section kind controls list rendering style. Selected by matching
 *  the preceding H2 text against a small vocab. */
type SectionKind =
  | "brief"
  | "pricing"
  | "offers"
  | "usps"
  | "avoid"
  | "personas"
  | "collateral"
  | "default";

function sectionKindFor(heading: string): SectionKind {
  const h = heading.toLowerCase();
  if (h.includes("product brief") || h === "brief") return "brief";
  if (h.includes("pricing")) return "pricing";
  if (h.includes("offers")) return "offers";
  if (h.includes("usp")) return "usps";
  if (h.includes("do not mention") || h.includes("avoid")) return "avoid";
  if (h.includes("persona")) return "personas";
  if (h.includes("collateral") || h.includes("attached")) return "collateral";
  return "default";
}

type EnrichedBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "properties"; text: string } // italic-only paragraph after H1
  | { type: "tagline"; text: string } // first plain paragraph after props
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; kind: SectionKind; ordered: boolean }
  | { type: "rule" }
  | { type: "footer"; text: string }; // italic paragraph after final rule

function isItalicOnly(text: string): boolean {
  return /^_[^_]+_$/.test(text.trim());
}

function enrichWithSections(raw: RawBlock[]): EnrichedBlock[] {
  const out: EnrichedBlock[] = [];
  let lastH2: string | null = null;
  let sawH1 = false;
  let sawTagline = false;
  let sawRule = false;

  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];

    if (b.type === "heading") {
      if (b.level === 1) {
        out.push({ type: "h1", text: b.text });
        sawH1 = true;
        sawTagline = false;
        lastH2 = null;
        continue;
      }
      if (b.level === 2) {
        out.push({ type: "h2", text: b.text });
        lastH2 = b.text;
        continue;
      }
      out.push({ type: "h3", text: b.text });
      continue;
    }

    if (b.type === "rule") {
      out.push({ type: "rule" });
      sawRule = true;
      continue;
    }

    if (b.type === "paragraph") {
      // First italic-only paragraph after H1, before tagline → properties.
      if (sawH1 && !sawTagline && lastH2 === null && isItalicOnly(b.text)) {
        out.push({
          type: "properties",
          text: b.text.replace(/^_|_$/g, ""),
        });
        continue;
      }
      // First regular paragraph after H1 before any H2 → tagline callout.
      if (sawH1 && !sawTagline && lastH2 === null) {
        out.push({ type: "tagline", text: b.text });
        sawTagline = true;
        continue;
      }
      // Italic-only paragraph AFTER a horizontal rule → footer strip.
      if (sawRule && isItalicOnly(b.text)) {
        out.push({
          type: "footer",
          text: b.text.replace(/^_|_$/g, ""),
        });
        continue;
      }
      out.push({ type: "paragraph", text: b.text });
      continue;
    }

    if (b.type === "list") {
      const kind: SectionKind = lastH2 ? sectionKindFor(lastH2) : "default";
      out.push({
        type: "list",
        items: b.items,
        kind,
        ordered: b.ordered,
      });
      continue;
    }
  }
  return out;
}

/* ─── Rendering ──────────────────────────────────────────────── */

function renderBlock(b: EnrichedBlock, key: number) {
  switch (b.type) {
    case "h1":
      return (
        <h1
          key={key}
          className="text-[34px] font-bold text-text-primary tracking-tight leading-[1.1] mt-0 mb-3"
        >
          <Inline text={b.text} />
        </h1>
      );

    case "properties":
      return <PropertiesBar key={key} text={b.text} />;

    case "tagline":
      return (
        <div
          key={key}
          className="mt-3 mb-8 px-5 py-4 rounded-card border-l-[3px] md-tagline"
          style={{ borderLeftColor: "#C9A86A" }}
        >
          <p className="text-[14.5px] text-text-primary leading-relaxed">
            <Inline text={b.text} />
          </p>
        </div>
      );

    case "h2":
      return (
        <h2
          key={key}
          className="flex items-center gap-2 text-[20px] font-semibold text-text-primary tracking-tight mt-10 mb-4"
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "#C9A86A" }}
          />
          <span className="flex-1">
            <Inline text={b.text} />
          </span>
        </h2>
      );

    case "h3":
      return (
        <h3
          key={key}
          className="text-[15px] font-semibold text-text-primary mt-6 mb-2.5"
        >
          <Inline text={b.text} />
        </h3>
      );

    case "paragraph":
      return (
        <p
          key={key}
          className="text-[14px] text-text-secondary leading-[1.7] mb-4 last:mb-0"
        >
          <Inline text={b.text} />
        </p>
      );

    case "rule":
      return (
        <hr
          key={key}
          className="border-0 border-t border-border-subtle my-8"
        />
      );

    case "footer":
      return (
        <div
          key={key}
          className="mt-3 mb-2 text-[11px] text-text-tertiary uppercase tracking-wider font-medium"
        >
          <Inline text={b.text} />
        </div>
      );

    case "list":
      return <SectionList key={key} items={b.items} kind={b.kind} />;
  }
}

/* ─── Properties bar ─────────────────────────────────────────── */

/** Renders the `_Client · Category_` line under H1 as small pill chips. */
function PropertiesBar({ text }: { text: string }) {
  const parts = text.split("·").map((p) => p.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-5">
      {parts.map((p, i) => (
        <span
          key={i}
          className="md-property-pill inline-flex items-center h-5 px-2 rounded-full text-[10.5px] uppercase tracking-wider font-medium"
        >
          {p}
        </span>
      ))}
    </div>
  );
}

/* ─── Section-aware lists ────────────────────────────────────── */

function SectionList({
  items,
  kind,
}: {
  items: string[];
  kind: SectionKind;
}) {
  if (kind === "brief") return <BriefGrid items={items} />;
  if (kind === "pricing") return <PricingGrid items={items} />;
  if (kind === "offers") return <OfferPills items={items} />;
  if (kind === "usps") return <InsightCards items={items} tone="ok" />;
  if (kind === "avoid") return <InsightCards items={items} tone="warn" />;
  if (kind === "personas") return <PersonaChips items={items} />;
  if (kind === "collateral") return <CollateralRows items={items} />;
  return <DefaultList items={items} />;
}

/** Try to split a bullet `- 📅 **Label** · value · more`. Returns the
 *  pieces if recognisable; falls back to a single string. */
function parseKeyValueRow(raw: string): {
  emoji: string | null;
  label: string | null;
  body: string;
} {
  // Leading emoji (any single non-ascii non-space char).
  let work = raw;
  let emoji: string | null = null;
  const emojiMatch = work.match(/^([^\w\s*_`]+)\s+(.*)$/u);
  if (emojiMatch) {
    emoji = emojiMatch[1];
    work = emojiMatch[2];
  }
  // **Label** · rest
  const labelMatch = work.match(/^\*\*([^*]+)\*\*\s*[·•]\s*(.*)$/);
  if (labelMatch) {
    return { emoji, label: labelMatch[1].trim(), body: labelMatch[2].trim() };
  }
  return { emoji, label: null, body: work };
}

/** Product brief — emoji + bold label + value, 2-column grid of cards. */
function BriefGrid({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-5">
      {items.map((it, i) => {
        const { emoji, label, body } = parseKeyValueRow(it);
        return (
          <div
            key={i}
            className="bg-white border border-border-subtle rounded-card px-3.5 py-3 hover:border-border transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              {emoji && (
                <span className="text-[13px] leading-none" aria-hidden>
                  {emoji}
                </span>
              )}
              {label && (
                <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
                  {label}
                </span>
              )}
            </div>
            <div className="text-[13px] text-text-primary leading-snug">
              <Inline text={body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Pricing — `**Name** · cost cadence · _badge_`, 3-col tile grid. */
function PricingGrid({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">
      {items.map((it, i) => {
        const parts = splitOnSep(it);
        // First chunk: **Name**
        const name = stripStars(parts[0] || "");
        // Second chunk: cost + cadence
        const costChunk = parts[1] || "";
        const { lead: cost, rest: cadence } = splitCostCadence(costChunk);
        // Third chunk: italic badge (optional)
        const badge = parts[2] ? parts[2].replace(/^_|_$/g, "") : null;
        return (
          <div
            key={i}
            className="bg-white border border-border-subtle rounded-card px-3.5 py-3"
          >
            <div className="text-[11px] text-text-tertiary mb-1 truncate">
              {name}
            </div>
            <div className="text-[18px] font-semibold text-text-primary tabular leading-none">
              {cost}
            </div>
            {cadence && (
              <div className="text-[11px] text-text-tertiary mt-1">{cadence}</div>
            )}
            {badge && (
              <div className="md-price-badge mt-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] uppercase tracking-wider font-semibold">
                {badge}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Offers — pill row, optional italic meta becomes a softer tail. */
function OfferPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {items.map((it, i) => {
        const parts = splitOnSep(it);
        const label = parts[0] || it;
        const meta = parts.slice(1).join(" · ").replace(/_/g, "");
        return (
          <span
            key={i}
            className="md-offer-pill inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px]"
          >
            <Sparkles
              size={10}
              strokeWidth={1.8}
              className="md-offer-pill-icon"
            />
            <span className="font-medium md-offer-pill-label">
              <Inline text={label} />
            </span>
            {meta && (
              <span className="md-offer-pill-meta text-[10.5px]">· {meta}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** USPs / Avoid — coloured bordered cards with an icon. Dark-mode
 *  variants live in globals.css under `.md-dark .md-insight-{tone}`
 *  so the surface adapts to the canvas theme. */
function InsightCards({
  items,
  tone,
}: {
  items: string[];
  tone: "ok" | "warn";
}) {
  const Icon = tone === "ok" ? CheckCircle2 : ShieldAlert;
  const iconColour = tone === "ok" ? "#15803D" : "#92400E";
  return (
    <div className="space-y-2 mb-5">
      {items.map((it, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-card border md-insight md-insight-${tone}`}
        >
          <Icon
            size={13}
            strokeWidth={2}
            className="flex-shrink-0 mt-[3px] md-insight-icon"
            style={{ color: iconColour }}
          />
          <div className="text-[13px] text-text-primary leading-relaxed md-insight-text">
            <Inline text={it} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Try to parse `**Name** · meta · pain: text` from a persona bullet. */
function parsePersonaRow(raw: string): { name: string; meta: string; pain: string } | null {
  const m = raw.match(/^\*\*([^*]+)\*\*\s*[·•]\s*(.+?)\s*[·•]\s*pain:\s*(.+)$/i);
  if (m) return { name: m[1].trim(), meta: m[2].trim(), pain: m[3].trim() };
  return null;
}

/** Personas — stacked structured cards with avatar, name, meta,
 *  and a "Pain" tag-line. Falls back to a plain chip when the row
 *  doesn't match the expected pattern. */
function PersonaChips({ items }: { items: string[] }) {
  const parsed = items.map((it) => parsePersonaRow(it));
  const allStructured = parsed.every((p) => p !== null);

  if (!allStructured) {
    return (
      <div className="flex flex-wrap gap-1.5 mb-5">
        {items.map((it, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white border border-border text-[12px] text-text-primary"
          >
            <User size={10} strokeWidth={1.8} className="text-text-tertiary" />
            <Inline text={it} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 mb-6">
      {parsed.map((p, i) => (
        <div
          key={i}
          className="bg-white border border-border-subtle rounded-card px-4 py-3.5 hover:border-border transition-colors"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 md-persona-avatar"
            >
              <User
                size={15}
                strokeWidth={1.7}
                className="md-persona-avatar-icon"
                style={{ color: "#8C6D33" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-text-primary leading-snug">
                {p!.name}
              </div>
              <div className="text-[11.5px] text-text-tertiary mt-0.5 font-mono">
                {p!.meta}
              </div>
              <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-border-subtle">
                <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[9.5px] uppercase tracking-wider font-semibold flex-shrink-0 md-pain-pill">
                  Pain
                </span>
                <span className="text-[12.5px] text-text-primary leading-snug">
                  {p!.pain}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Collateral — file row with kind icon + meta. */
function CollateralRows({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5 mb-5">
      {items.map((it, i) => {
        const parts = splitOnSep(it);
        const name = parts[0] || it;
        const meta = parts.slice(1).join(" · ").replace(/_/g, "");
        const Icon = pickFileIcon(meta);
        return (
          <div
            key={i}
            className="flex items-center gap-2.5 px-3 py-2 rounded-card bg-surface-page border border-border-subtle hover:border-border transition-colors"
          >
            <Icon size={13} strokeWidth={1.6} className="text-text-tertiary" />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-text-primary truncate">
                <Inline text={name} />
              </div>
              {meta && (
                <div className="text-[10.5px] text-text-tertiary uppercase tracking-wider">
                  {meta}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function pickFileIcon(meta: string) {
  const m = meta.toLowerCase();
  if (m.includes("video") || m.includes("mp4") || m.includes("mov"))
    return Film;
  if (m.includes("image") || m.includes("png") || m.includes("jpg"))
    return ImageIcon;
  if (m.includes("deck") || m.includes("ppt") || m.includes("key"))
    return Layers;
  return FileText;
}

/** Default bullet list — clean indented dots. */
function DefaultList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mb-5">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex gap-2.5 text-[13.5px] text-text-primary leading-relaxed"
        >
          <span className="text-text-tertiary flex-shrink-0 mt-[8px] w-1 h-1 rounded-full bg-text-tertiary" />
          <span className="flex-1">
            <Inline text={it} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

/** Split on `·` while preserving the order. */
function splitOnSep(raw: string): string[] {
  return raw.split("·").map((p) => p.trim()).filter(Boolean);
}

function stripStars(raw: string): string {
  return raw.replace(/^\*\*|\*\*$/g, "").trim();
}

/** From "₹62,000 /month · 12 months" → { lead: "₹62,000", rest: "/month" }
 *  Heuristic: lead is the first whitespace-bounded chunk that begins
 *  with a currency symbol or digit. */
function splitCostCadence(raw: string): { lead: string; rest: string } {
  const m = raw.match(/^([₹$€£]?\d[\d,.]*\d?)\s*(.*)$/);
  if (m) return { lead: m[1], rest: m[2] };
  return { lead: raw, rest: "" };
}

/* ─── Inline (bold / italic / code) ──────────────────────────── */

function Inline({ text }: { text: string }) {
  const parts = tokenizeInline(text);
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}

type InlineToken = string | { kind: "bold" | "italic" | "code"; text: string };

function tokenizeInline(text: string): React.ReactNode[] {
  const tokens: InlineToken[] = [];
  const rest = text;
  const codeRe = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(rest))) {
    if (m.index > last) tokens.push(rest.slice(last, m.index));
    tokens.push({ kind: "code", text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < rest.length) tokens.push(rest.slice(last));

  const expandBold = (t: InlineToken): InlineToken[] => {
    if (typeof t !== "string") return [t];
    const out: InlineToken[] = [];
    const boldRe = /\*\*([^*]+)\*\*/g;
    let last2 = 0;
    let bm: RegExpExecArray | null;
    while ((bm = boldRe.exec(t))) {
      if (bm.index > last2) out.push(t.slice(last2, bm.index));
      out.push({ kind: "bold", text: bm[1] });
      last2 = bm.index + bm[0].length;
    }
    if (last2 < t.length) out.push(t.slice(last2));
    return out;
  };
  const expandItalic = (t: InlineToken): InlineToken[] => {
    if (typeof t !== "string") return [t];
    const out: InlineToken[] = [];
    const itRe = /_([^_]+)_/g;
    let last2 = 0;
    let im: RegExpExecArray | null;
    while ((im = itRe.exec(t))) {
      if (im.index > last2) out.push(t.slice(last2, im.index));
      out.push({ kind: "italic", text: im[1] });
      last2 = im.index + im[0].length;
    }
    if (last2 < t.length) out.push(t.slice(last2));
    return out;
  };
  const afterBold = tokens.flatMap(expandBold);
  const final = afterBold.flatMap(expandItalic);

  return final.map((tok, i) => {
    if (typeof tok === "string") return tok;
    if (tok.kind === "bold")
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {tok.text}
        </strong>
      );
    if (tok.kind === "italic")
      return (
        <em key={i} className="italic text-text-secondary">
          {tok.text}
        </em>
      );
    return (
      <code
        key={i}
        className="px-1.5 py-px rounded bg-surface-page border border-border-subtle text-[12px] font-mono text-text-primary"
      >
        {tok.text}
      </code>
    );
  });
}
