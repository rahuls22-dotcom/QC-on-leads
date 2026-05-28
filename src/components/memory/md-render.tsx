"use client";

// Minimal block-level markdown renderer · zero external deps.
//
// Handles what memory's product-info.md and plan.md actually use:
//   · headings   #, ##, ###
//   · paragraphs (blank-line separated)
//   · bullet lists (- ...)
//   · horizontal rule (---)
//   · inline bold **bold**
//   · inline italic _italic_ or *italic*
//   · inline code `code`
//
// Not a full CommonMark implementation — purposely tiny. If we ever
// need tables or code blocks, swap in react-markdown.

import { Fragment } from "react";

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return <article className="md-render">{blocks.map((b, i) => renderBlock(b, i))}</article>;
}

/* ─── Block parsing ────────────────────────────────────────────── */

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "rule" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Blank — skip.
    if (!line.trim()) {
      i++;
      continue;
    }
    // Horizontal rule.
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }
    // Heading.
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
    // Bullet list (- ...).
    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items, ordered: false });
      continue;
    }
    // Ordered list (1. ...).
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "list", items, ordered: true });
      continue;
    }
    // Paragraph — accumulate until blank or block boundary.
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

/* ─── Rendering ────────────────────────────────────────────────── */

function renderBlock(b: Block, key: number) {
  switch (b.type) {
    case "heading":
      if (b.level === 1)
        return (
          <h1
            key={key}
            className="text-[22px] font-semibold text-text-primary tracking-tight mt-0 mb-3"
          >
            <Inline text={b.text} />
          </h1>
        );
      if (b.level === 2)
        return (
          <h2
            key={key}
            className="text-[15px] font-semibold text-text-primary mt-6 mb-2.5 pb-1.5 border-b border-border-subtle"
          >
            <Inline text={b.text} />
          </h2>
        );
      return (
        <h3 key={key} className="text-[13.5px] font-semibold text-text-primary mt-5 mb-2">
          <Inline text={b.text} />
        </h3>
      );
    case "paragraph":
      return (
        <p
          key={key}
          className="text-[13px] text-text-secondary leading-relaxed mb-3 last:mb-0"
        >
          <Inline text={b.text} />
        </p>
      );
    case "list":
      if (b.ordered)
        return (
          <ol
            key={key}
            className="list-decimal list-outside pl-5 space-y-1.5 mb-3 text-[13px] text-text-primary leading-relaxed"
          >
            {b.items.map((item, i) => (
              <li key={i}>
                <Inline text={item} />
              </li>
            ))}
          </ol>
        );
      return (
        <ul key={key} className="space-y-1.5 mb-3">
          {b.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] text-text-primary leading-relaxed"
            >
              <span className="text-text-tertiary flex-shrink-0">·</span>
              <span className="flex-1">
                <Inline text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "rule":
      return <hr key={key} className="border-0 border-t border-border-subtle my-5" />;
  }
}

/**
 * Inline rendering · handles **bold**, _italic_ / *italic*, `code`.
 * Tokenize once, then map. Order matters — code first (to preserve
 * its content as-is), then bold, then italic.
 */
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
  // Inline code first — protects content from later passes.
  let rest = text;
  const codeRe = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(rest))) {
    if (m.index > last) tokens.push(rest.slice(last, m.index));
    tokens.push({ kind: "code", text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < rest.length) tokens.push(rest.slice(last));

  // Expand string tokens for bold + italic.
  const expandToken = (t: InlineToken): InlineToken[] => {
    if (typeof t !== "string") return [t];
    const out: InlineToken[] = [];
    // Bold first.
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
    // _italic_ — avoid clashing with bold's ** (we run after bold).
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
  const afterBold = tokens.flatMap(expandToken);
  const final = afterBold.flatMap(expandItalic);

  // Render to React.
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
        className="px-1 py-px rounded bg-surface-page border border-border-subtle text-[12px] font-mono text-text-primary"
      >
        {tok.text}
      </code>
    );
  });
}
