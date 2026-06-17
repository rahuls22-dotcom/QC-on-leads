"use client";

/**
 * Wallet / Credit Management
 *
 * Inspired by ElevenLabs' subscription page: one place where the user
 * sees what they have, what they've used, and where it went. Three
 * pieces:
 *
 *   1. Period header — current month + a thin "days elapsed" bar, plus
 *      a combined total (₹ remaining across all wallets) so the user
 *      starts with the big picture.
 *   2. Wallet grid — one card per wallet (Enrichment, Voice, WhatsApp).
 *      Each card shows present / utilized / capability breakdown.
 *      The grouping matches how spend actually accrues — by meter
 *      under a wallet — which is also how the eventual data layer
 *      groups usage_event rows.
 *   3. Utilization over time — date-range selector (7d / 30d / 90d)
 *      and a stacked daily bar chart so the user can see spike days
 *      and which wallet drove them.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  WALLETS,
  poolSummary,
  utilizedInRange,
  periodProgress,
  sliceDailyToRange,
  billingMonthOptions,
  billingMonthFor,
  CURRENCIES,
  formatMoney,
  invoiceLineItemsFor,
} from "@/lib/credits-data";
import type { Currency, BillingMonth } from "@/lib/credits-data";
import { useCurrencyStore } from "@/lib/currency-store";
import {
  useBillingModeStore,
  isBalanceBlocking,
  type BillingMode,
  type WalletBalanceState,
} from "@/lib/billing-mode-store";
import { useProducts } from "@/lib/products";
import { LowBalanceModal } from "@/components/wallet/low-balance-modal";
import { WalletCard } from "@/components/wallet/wallet-card";
import { TopUpEstimatorModal } from "@/components/wallet/top-up-estimator-modal";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { Plus, Receipt, TrendingUp, Calendar, ArrowDown, BarChart3, AlertTriangle, Send, ChevronDown, ChevronLeft, ChevronRight, Info, Building2, Check } from "lucide-react";
import { useAccessibleWorkspaces } from "@/lib/workspace-store";

// Demo: this workspace's billing cycle starts on the 13th of each
// month — i.e. 13 May → 13 Jun, 13 Jun → 13 Jul, and so on. In a
// real product this would be per-customer config sourced from the
// backend; pinning it here keeps the demo concrete and the billing
// surface honest about cycles that don't align to the calendar.
const CYCLE_START_DAY = 13;

// "{label} cycle" reads as "Apr 2026 cycle" when the label is a
// calendar month, and as "This cycle cycle" when the label already
// carries the word — the latter is doubled. Only append the suffix
// when the label doesn't already end with "cycle" or "month".
function appendCycleSuffix(label?: string): string {
  if (!label) return "";
  const lower = label.toLowerCase();
  if (lower.endsWith("cycle") || lower.endsWith("month")) return label;
  return `${label} cycle`;
}

// The shared DateRangeSelector emits a preset string ("7", "30",
// "thismonth", "lifetime", etc.). Our daily series is keyed by N-day
// windows, so we collapse the preset down to a day count. Mapping is
// intentionally permissive — pages that need exact start/end can read
// the dates off the preset themselves later.
function presetToDays(preset: string): number {
  switch (preset) {
    case "today":      return 1;
    case "yesterday":  return 1;
    case "2d":         return 2;
    case "thisweek":   return 7;
    case "lastweek":   return 7;
    case "7":          return 7;
    case "14":         return 14;
    case "thismonth":  return 30;
    case "lastmonth":  return 30;
    case "30":         return 30;
    case "lifetime":   return 90;
    default:           return 30;
  }
}

// Whether a preset describes a closed past window (yesterday / last
// week / last month) vs an in-progress rolling window (today, this
// week, this month, last 7/14/30 days, lifetime). Drives whether
// "Remaining" is meaningful: a closed cycle has no live runway, so
// the Usage hero hides Remaining there and just shows what was used.
function isPastPreset(preset: string): boolean {
  return preset === "yesterday" || preset === "lastweek" || preset === "lastmonth";
}

// Indian comma-grouping number format — used everywhere a raw
// ₹ amount needs the en-IN grouping ("1,00,000" not "100,000").
function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}

// ── Invoice PDF builder ─────────────────────────────────────────────────────
//
// Generates a real, valid PDF as a Blob from a list of structured rows. No
// external dep — the PDF spec is text-based and a one-page invoice fits in a
// hand-crafted stream. Used by the "Download PDF" button on the Billing
// hero. For the prototype this is enough; a production version would render
// through a server-side renderer with proper typography, GSTIN, etc.
//
// The row model supports a real invoice layout (title + section headings +
// two-column line items + horizontal rules + spacers) rather than just a
// flat list of pre-padded strings. Right-aligned amounts are positioned by
// approximating Helvetica character widths — close enough that columns
// visually line up to within a pixel or two, which is what people read
// invoices for.

// Approximate width of a string in points at 11pt Helvetica. PDF doesn't
// give us font metrics for free, so we eyeball it: digits / lowercase ≈
// 6.1pt, uppercase ≈ 7.3pt, punctuation/spaces ≈ 3pt. Used only to
// right-align the amount column on each line — being off by a couple of
// points is invisible to readers.
function approxWidth11(s: string): number {
  let w = 0;
  for (const ch of s) {
    if (ch === " ") w += 3.1;
    else if (ch === "." || ch === ",") w += 3.0;
    else if (ch >= "A" && ch <= "Z") w += 7.3;
    else if (ch >= "0" && ch <= "9") w += 6.1;
    else w += 6.0;
  }
  return w;
}

// Strip non-ASCII glyphs that the Helvetica core font can't render — we
// keep the on-screen UI using ₹, but PDF text in standard Helvetica
// encoding silently drops codepoints outside Latin-1. Substituting ₹ →
// "Rs " up front is more honest than letting the symbol disappear.
function asciifyForPdf(s: string): string {
  return s.replace(/₹\s*/g, "Rs ");
}

type InvoiceRow =
  | { type: "title";   text: string }
  | { type: "section"; text: string }
  | { type: "text";    text: string; muted?: boolean }
  | { type: "kv";      left: string; right: string; bold?: boolean; indent?: number }
  | { type: "rule" }
  | { type: "spacer";  h?: number };

function buildInvoicePdf(rows: InvoiceRow[]): Blob {
  // PDF page is 595×842 (A4). Origin is bottom-left. We lay rows out
  // top-down from `cursorY`, advancing by each row's natural height.
  const PAGE_W      = 595;
  const PAGE_H      = 842;
  const MARGIN_L    = 50;
  const MARGIN_R    = 50;
  const RIGHT_X     = PAGE_W - MARGIN_R;
  const LINE_H      = 16;
  const TITLE_H     = 30;
  const SECTION_H   = 22;
  const RULE_GAP    = 8;

  // Escape parens and backslashes; replace currency glyph (see asciifyForPdf
  // note above). The result is safe to wrap in `( )` inside a PDF literal.
  const escape = (s: string) =>
    asciifyForPdf(s)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const ops: string[] = [];
  let cursorY = PAGE_H - 60;

  // Emit a single text run at (x, y) in (size, font). Font code is "F1"
  // (Helvetica), "F2" (Helvetica-Bold), or "F3" (Helvetica-Oblique for
  // the muted footer).
  const drawText = (x: number, y: number, size: number, font: string, text: string) => {
    ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escape(text)}) Tj ET`);
  };

  for (const row of rows) {
    if (row.type === "title") {
      drawText(MARGIN_L, cursorY, 20, "F2", row.text);
      cursorY -= TITLE_H;
      continue;
    }
    if (row.type === "section") {
      cursorY -= 4;
      drawText(MARGIN_L, cursorY, 11, "F2", row.text.toUpperCase());
      cursorY -= SECTION_H;
      continue;
    }
    if (row.type === "text") {
      drawText(MARGIN_L, cursorY, row.muted ? 9 : 11, row.muted ? "F3" : "F1", row.text);
      cursorY -= LINE_H;
      continue;
    }
    if (row.type === "kv") {
      const indent = (row.indent ?? 0) * 14;
      const leftX  = MARGIN_L + indent;
      const font   = row.bold ? "F2" : "F1";
      drawText(leftX, cursorY, 11, font, row.left);
      if (row.right) {
        const w = approxWidth11(asciifyForPdf(row.right));
        // Bold runs ~6% wider than regular Helvetica; nudge a touch so
        // bold totals still right-align cleanly with the rule above.
        const rightX = RIGHT_X - w * (row.bold ? 1.06 : 1.0);
        drawText(rightX, cursorY, 11, font, row.right);
      }
      cursorY -= LINE_H;
      continue;
    }
    if (row.type === "rule") {
      cursorY -= RULE_GAP / 2;
      ops.push(`0.85 0.85 0.85 RG 0.6 w ${MARGIN_L} ${cursorY} m ${RIGHT_X} ${cursorY} l S`);
      cursorY -= RULE_GAP;
      continue;
    }
    if (row.type === "spacer") {
      cursorY -= row.h ?? 8;
      continue;
    }
  }

  const stream = ops.join("\n");

  const objects: string[] = [];
  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const xref: number[] = [];
  const addObj = (body: string) => {
    xref.push(pdf.length);
    const idx = objects.length + 1;
    pdf += `${idx} 0 obj\n${body}\nendobj\n`;
    objects.push(body);
  };

  // 1: Catalog → 2: Pages → 3: Page → 4: Helvetica → 5: Bold → 6: Oblique → 7: Stream.
  addObj("<</Type /Catalog /Pages 2 0 R>>");
  addObj("<</Type /Pages /Kids [3 0 R] /Count 1>>");
  addObj(
    `<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
    "/Resources <</Font <</F1 4 0 R /F2 5 0 R /F3 6 0 R>>>> /Contents 7 0 R>>"
  );
  addObj("<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>");
  addObj("<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>");
  addObj("<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique>>");
  addObj(`<</Length ${stream.length}>>\nstream\n${stream}\nendstream`);

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of xref) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

// PDF amounts: same en-IN comma grouping as the on-screen `formatAmount`,
// but anchored to "Rs " so the rendered glyph is reliable. (₹ is outside
// Helvetica's standard encoding and gets dropped silently by some PDF
// readers — see asciifyForPdf above.)
function pdfAmount(value: number): string {
  return `Rs ${Math.round(value).toLocaleString("en-IN")}`;
}

// ── Invoice content ─────────────────────────────────────────────────────────
//
// Assemble an invoice PDF for one (BillingMonth × BillingMode × planType)
// combination. The document shape shifts so the file matches what the user
// sees on screen for that month:
//
//   Postpaid, past month       → Tax invoice — usage line items only,
//                                 status Settled.
//   Postpaid, current month    → Estimated bill — same line items as
//                                 above but flagged In progress, dated
//                                 to-date.
//   Prepaid subscription       → Tax invoice — fixed monthly plan
//                                 baseline as a line item, then usage
//                                 line items (drawn from the plan).
//                                 Adds an "amount billed this cycle"
//                                 reconciliation block at the bottom.
//   Prepaid pure               → Account statement — usage line items
//                                 only (no fixed cost; the wallet is
//                                 funded by ad-hoc top-ups).
//
// Every per-capability number comes from `invoiceLineItemsFor(month)`,
// which is the same windowing that drives the Modules table on screen
// — so the PDF can't drift from what the user just read.

function buildInvoiceForMonth(opts: {
  month:    BillingMonth;
  mode:     BillingMode;
  planType: "subscription" | "pure";
  isPast:   boolean;
  /** Monthly subscription baseline — only used when planType is
   *  "subscription". Passed in (not derived) so this function stays
   *  pure and the page can swap the value when the demo plan changes. */
  planBaseline: number;
  /** Carry-forward policy on the subscription plan. When "disabled" the
   *  Plan reconciliation block reports the unused tail as forfeited
   *  rather than carried into the next cycle. Defaults to "enabled" for
   *  back-compat with any caller that hasn't started passing it yet. */
  carryForward?: "enabled" | "disabled";
  /** Modules the customer actually has (per the module-mix demo).
   *  Filters out line items for products the customer never bought
   *  — a voice-only org's invoice shouldn't list extraction or
   *  enrichment. Omit to include all modules (default).  */
  enabledModuleIds?: readonly string[];
}): { blob: Blob; filename: string } {
  const { month, mode, planType, isPast, planBaseline, enabledModuleIds } = opts;
  const carryForward = opts.carryForward ?? "enabled";
  const { sections, total: usageTotal } = invoiceLineItemsFor(month, enabledModuleIds);

  // Figure out the [start, end] for the month, plus a readable cycle
  // label and a sensible invoice number.
  const [yearStr, mStr] = month.id.split("-");
  const year   = parseInt(yearStr, 10);
  const mIdx   = parseInt(mStr, 10) - 1;
  const start  = new Date(year, mIdx, 1);
  const end    = new Date(year, mIdx + 1, 0);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const fmt    = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const fmtShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const cycleLabel = `${fmtShort(start)} – ${fmtShort(end)}`;
  const invoiceId  = `INV-${year}-${String(mIdx + 1).padStart(2, "0")}`;

  // Document kind — drives the title at the top of the PDF and the
  // filename suffix. Subscription always reads as a tax invoice (there's
  // a fixed bill), even in the current month, because the plan baseline
  // is charged on cycle start regardless of usage. Postpaid current
  // month is an "Estimated bill". Pure prepaid is a Statement (no
  // periodic bill — it's just a record of drawdown).
  const isSubscription = mode === "prepaid" && planType === "subscription";
  const docKind =
      isSubscription                       ? "Tax invoice"
    : mode === "postpaid" && isPast        ? "Tax invoice"
    : mode === "postpaid"                  ? "Estimated bill"
    :                                        "Account statement";

  // What the bottom-line "amount" means depends on the mode. For
  // subscription, the customer is billed the plan baseline regardless of
  // usage (and unused balance carries forward). For everyone else, the
  // bill is exactly the usage total.
  const billed = isSubscription ? planBaseline : usageTotal;

  const statusLine = (() => {
    if (mode === "postpaid" && isPast) return "Settled";
    if (mode === "postpaid")           return "In progress · closes end of cycle";
    if (isSubscription && isPast)      return "Settled · within plan";
    if (isSubscription)                return "Active · in current cycle";
    return isPast ? "Closed" : "Active";
  })();

  const issuedOn = isPast
    ? fmt(end)
    : isSubscription
      ? fmt(start)        // subscription invoices are cut on cycle start
      : fmt(today);       // statement is dated as of today

  // ── Compose rows ────────────────────────────────────────────────────
  const rows: InvoiceRow[] = [];
  rows.push({ type: "title", text: docKind });
  rows.push({ type: "spacer", h: 4 });

  // Header — workspace + cycle + identifiers
  rows.push({ type: "kv", left: "Workspace",      right: "Godrej South · Bangalore" });
  rows.push({ type: "kv", left: "Billing mode",   right: mode === "postpaid" ? "Postpaid" : `Prepaid · ${planType === "subscription" ? "Subscription" : "Top-up"}` });
  rows.push({ type: "kv", left: "Billing cycle",  right: cycleLabel });
  rows.push({ type: "kv", left: "Invoice no.",    right: invoiceId });
  rows.push({ type: "kv", left: "Issued",         right: issuedOn });
  rows.push({ type: "kv", left: "Status",         right: statusLine });
  rows.push({ type: "spacer", h: 10 });

  // Fixed charges section — subscription only. This is the "fixed cost
  // line item" the user explicitly called out: when the org pays a
  // monthly plan, the invoice has to show that baseline as its own line,
  // not bury it inside the usage rollup.
  if (isSubscription) {
    rows.push({ type: "section", text: "Fixed charges" });
    rows.push({ type: "kv", left: "Monthly plan baseline", right: pdfAmount(planBaseline) });
    rows.push({ type: "text", text: "  Includes balance to draw against during this cycle.", muted: true });
    rows.push({ type: "spacer", h: 6 });
  }

  // Usage charges — per module, with each capability as a sub-line. The
  // sub-line shows the math out loud ("43,317 mins x Rs 4 = Rs 1,73,269")
  // so the customer can reconcile each line back to a unit count.
  rows.push({ type: "section", text: "Usage charges" });

  for (const sec of sections) {
    rows.push({ type: "kv", left: sec.name, right: pdfAmount(sec.subtotal), bold: true });
    for (const c of sec.capabilities) {
      const unitWord = c.unitLabel + (c.unitCount === 1 ? "" : "s");
      const left = `${c.name} — ${c.unitCount.toLocaleString("en-IN")} ${unitWord} x Rs ${c.rate}`;
      rows.push({ type: "kv", left, right: pdfAmount(c.amount), indent: 1 });
    }
    rows.push({ type: "spacer", h: 4 });
  }

  rows.push({ type: "rule" });
  rows.push({ type: "kv", left: "Usage total", right: pdfAmount(usageTotal), bold: true });

  // Subscription reconciliation — plan covers up to X, you used Y, the
  // difference carries forward (or, if overage, is added to next bill).
  // This block is what makes the subscription invoice tie out: the
  // amount billed = plan baseline, with the carry-forward shown as the
  // bridge. Without it the reader would see "Usage Rs 2L" + "Billed
  // Rs 5L" and wonder where the gap went.
  if (isSubscription) {
    rows.push({ type: "spacer", h: 6 });
    rows.push({ type: "section", text: "Plan reconciliation" });
    rows.push({ type: "kv", left: "Rollover policy",     right: carryForward === "enabled" ? "Carry-forward enabled" : "No rollover · use it or lose it" });
    rows.push({ type: "kv", left: "Plan covers up to",   right: pdfAmount(planBaseline) });
    rows.push({ type: "kv", left: "Usage in this cycle", right: pdfAmount(usageTotal) });
    if (usageTotal <= planBaseline) {
      const tail = planBaseline - usageTotal;
      rows.push({ type: "kv", left: "Within plan", right: "Yes" });
      if (carryForward === "enabled") {
        rows.push({ type: "kv", left: "Carries forward to next cycle", right: pdfAmount(tail) });
      } else {
        // Forfeit case — surface the amount so finance can see what they
        // left on the table. Keeps the invoice honest about the cost of
        // the no-rollover policy.
        rows.push({ type: "kv", left: "Forfeited at cycle end", right: pdfAmount(tail) });
      }
    } else {
      const over = usageTotal - planBaseline;
      rows.push({ type: "kv", left: "Over plan (extra charge)", right: pdfAmount(over) });
    }
    rows.push({ type: "spacer", h: 6 });
    rows.push({ type: "rule" });
    rows.push({ type: "kv", left: "Amount billed this cycle", right: pdfAmount(billed), bold: true });
  } else {
    // Non-subscription closing block — billed equals usage by definition.
    rows.push({ type: "spacer", h: 2 });
    rows.push({ type: "kv", left: mode === "postpaid"
        ? (isPast ? "Amount due"                : "Estimated amount due")
        : (isPast ? "Total drawn this cycle"    : "Drawn to date this cycle"),
      right: pdfAmount(billed), bold: true });
  }

  rows.push({ type: "spacer", h: 14 });
  rows.push({ type: "text", text: "Generated by Revspot. Numbers reflect Modules table for the same cycle. Queries: billing@revspot.ai", muted: true });

  return {
    blob:     buildInvoicePdf(rows),
    filename: `${invoiceId}-${mode}${isSubscription ? "-subscription" : ""}.pdf`,
  };
}

// Trigger a browser download of a Blob with the given filename.
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking the URL.
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

// ── WorkspaceMultiSelect ────────────────────────────────────────────────────
//
// Compact multi-select dropdown that lets the user narrow the Usage rollup
// to one or more workspaces. Sits next to the date filter in the Usage
// header. Default is "all workspaces selected" so the page reads as the
// full picture on first load; users can A/B isolate workspaces without
// losing the date filter.
//
// Behaviour mirrors the DateRangeSelector trigger: same compact pill, same
// chevron, same border/typography. The popover itself is a checkbox list
// with a single "Select all" reset (no Clear — a zero-selected state
// renders an empty Usage page and is never something the user wants).
// Each row carries an "Only" affordance on hover so isolating to one or
// two workspaces is a single click each, not a chore of unchecking
// everything else. Minimum selection is enforced at 1 — clicking the
// last selected checkbox is a no-op rather than silently nuking the
// view.
function WorkspaceMultiSelect({
  workspaces,
  selectedIds,
  onChange,
}: {
  workspaces: { id: string; name: string; region: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Click-outside to dismiss. Listening on mousedown (not click) so the
  // popover closes on the press, not after the release — feels snappier.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const allSelected = selectedIds.length === workspaces.length;
  // Label adapts to selection count so the trigger always reads truthfully —
  // "All workspaces" vs "Guyju's South" vs "2 workspaces" — without the user
  // having to open the popover to check. We never show "No workspaces"
  // because we never allow the zero-selected state.
  const label =
    allSelected
      ? "All workspaces"
      : selectedIds.length === 1
          ? workspaces.find((w) => w.id === selectedIds[0])?.name ?? "1 workspace"
          : `${selectedIds.length} workspaces`;

  // Toggle inclusion of a workspace. Refuses to drop the last selected
  // workspace — there's no useful "zero workspaces" view on Usage, so
  // we make that click a no-op rather than rendering an empty page.
  const toggle = (id: string) => {
    const checked = selectedIds.includes(id);
    if (checked && selectedIds.length === 1) return; // no-op: keep at least one
    onChange(
      checked
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  // Isolate selection to a single workspace. Click target on each row;
  // the killer affordance for "show me just this one" without the user
  // unchecking N-1 others one at a time.
  const only = (id: string) => onChange([id]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 h-9 px-3 bg-white border border-border rounded-input text-[13px] text-text-primary hover:border-border-hover transition-colors duration-150"
      >
        <Building2 size={14} strokeWidth={1.5} className="text-text-tertiary" />
        <span className="text-[12px]">{label}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Workspaces"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-[240px] bg-white border border-border rounded-card shadow-lg overflow-hidden"
        >
          {/* Header row — single "Select all" reset. Acts as the
              "back to default" affordance; greyed out when already at
              default since there's nothing to do. Clear was removed
              — a zero-selected state renders an empty Usage page and
              isn't a useful destination. */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-surface-page/60">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-text-tertiary">
              Workspaces
            </span>
            <button
              type="button"
              onClick={() => onChange(workspaces.map((w) => w.id))}
              disabled={allSelected}
              className="text-[11px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-default"
            >
              Select all
            </button>
          </div>
          <ul className="max-h-[260px] overflow-y-auto py-1">
            {workspaces.map((w) => {
              const checked = selectedIds.includes(w.id);
              const isLastSelected = checked && selectedIds.length === 1;
              return (
                // The row is two sibling buttons inside a positioned <li>:
                // the main checkbox-toggle covers the row, the "Only"
                // affordance floats on the right and appears on hover.
                // Splitting them avoids nesting a button inside another
                // button (invalid HTML) and keeps event handling clean
                // (no stopPropagation gymnastics).
                <li key={w.id} className="group relative">
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(w.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 pr-14 hover:bg-surface-page transition-colors text-left ${
                      isLastSelected ? "cursor-default" : ""
                    }`}
                    title={isLastSelected ? "At least one workspace must stay selected" : undefined}
                  >
                    <span
                      className={`flex items-center justify-center w-[14px] h-[14px] rounded border ${
                        checked
                          ? "bg-text-primary border-text-primary"
                          : "bg-white border-border"
                      }`}
                      aria-hidden
                    >
                      {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-text-primary truncate">
                        {w.name}
                      </div>
                      <div className="text-[10.5px] text-text-tertiary truncate">
                        {w.region}
                      </div>
                    </div>
                  </button>
                  {/* "Only" — appears on row hover. Hidden when this is
                      already the sole selected workspace (would be a
                      no-op) and when ALL are selected this is the
                      primary one-click path to focus mode. */}
                  {!isLastSelected && (
                    <button
                      type="button"
                      onClick={() => only(w.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10.5px] font-medium text-text-secondary hover:text-text-primary px-1.5 py-0.5 rounded border border-border-subtle bg-white transition-opacity"
                      title={`Show only ${w.name}`}
                    >
                      Only
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── BillingMonthSelector ─────────────────────────────────────────────────────
//
// Compact months-only dropdown used in place of the dynamic DateRangeSelector
// on the Billing page. Billing is anchored to calendar months (one invoice per
// month), so "Last 7 days" / "This week" / arbitrary windows don't carry
// useful meaning here — the user wants to ask "what was my March bill" or
// "what's this month's spend so far", not "spend over a sliding seven-day
// window". The list is short and static (current month + 5 past) because
// older invoices are rare and we don't want a long scrolling menu.
//
// Visually matches the compact DateRangeSelector trigger so the Billing tab
// inherits the same control affordance — the only change for the user is
// what's INSIDE the menu.

function BillingMonthSelector({
  value,
  onChange,
  options,
}: {
  value: BillingMonth;
  onChange: (m: BillingMonth) => void;
  options: BillingMonth[];
}) {
  const [open, setOpen] = useState(false);

  // Cycles are NOT calendar months — they run from the workspace's
  // CYCLE_START_DAY to the same day next month (e.g. 13 May – 13 Jun).
  // A month-name grid would force the user to disambiguate "May" as
  // either the cycle starting May or the cycle ending May, which is
  // exactly the confusion this filter is supposed to remove. The flat
  // scrollable list shows each cycle's full range so there's no
  // ambiguity, and lets the user scroll back to the first cycle in
  // one continuous motion. Newest-first ordering puts the current
  // cycle at the top — the usual entry point.
  const close = () => setOpen(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-primary border border-border rounded-button bg-white hover:border-border-strong transition-colors duration-150"
      >
        <Calendar size={12} strokeWidth={1.75} className="text-text-tertiary" />
        <span>{value.label}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`text-text-tertiary transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 bg-white border border-border rounded-card shadow-xl w-[280px] overflow-hidden">
            {/* Section label — quiet, just so the list has an
                anchor when it gets long. No actions live up here;
                Select-the-cycle is the only interaction. */}
            <div className="px-3 py-2 border-b border-border-subtle bg-surface-page/60">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-text-tertiary">
                Billing cycles
              </span>
            </div>
            {/* Scrollable cycle list. Max-height keeps the popover from
                eating the whole viewport when history is long; the user
                can scroll to the first cycle without leaving the menu. */}
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {options.map((opt) => {
                const isActive = opt.id === value.id;
                // Mark cycles by their lifecycle position so the user
                // can recognise the current and most-recent settled
                // cycles without doing date math. Everything older
                // just reads as its date range.
                const tag =
                  opt.label === "This cycle" || opt.label === "This month"
                    ? "Current"
                    : opt.label === "Last cycle" || opt.label === "Last month"
                      ? "Last"
                      : null;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        close();
                      }}
                      aria-current={isActive ? "true" : undefined}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-page transition-colors duration-100 ${
                        isActive ? "bg-surface-page" : ""
                      }`}
                    >
                      <span className="text-[12.5px] font-medium text-text-primary tabular-nums truncate">
                        {opt.range}
                      </span>
                      {tag && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.4px] text-text-tertiary">
                          {tag}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// Round a raw maximum up to a "nice" round number so the Y-axis
// labels read as clean tick values (e.g. 187 → 200, 1,432 → 1.5K)
// rather than the literal max which would force ugly tick labels.
// Standard 1/2/2.5/5/10 ladder used by most charting libraries.
function niceMax(n: number): number {
  if (n <= 0) return 1;
  const exp        = Math.floor(Math.log10(n));
  const base       = Math.pow(10, exp);
  const mantissa   = n / base;
  const niceMant   =
      mantissa <= 1   ? 1
    : mantissa <= 2   ? 2
    : mantissa <= 2.5 ? 2.5
    : mantissa <= 5   ? 5
    :                   10;
  return niceMant * base;
}

// Short Indian-grouped form used on Y-axis tick labels — the same
// "1.5K"/"2L" scheme that the wallet hero uses, but always plain
// numbers (no "credits" suffix). The chart prefixes "₹" itself.
function formatYTick(n: number): string {
  if (n === 0) return "0";
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return Math.round(n).toLocaleString("en-IN");
}

// Derive per-capability fill + stroke colours for the stacked chart
// layers. We don't store per-capability colours in the data layer —
// each product has a single `chartColor`, and we want each layer
// inside a product to share that identity. This helper picks a fill
// opacity (denser for the bottom layer, lighter for the top) so the
// stack still reads as one product but the layer boundaries are
// distinguishable. Strokes pick up the same colour at higher
// opacity so the boundary between layers is visible against the
// fill.
function capLayerColor(baseHex: string, capIdx: number): { fill: string; stroke: string } {
  // Bottom layer is the most saturated, layers above fade. Past
  // three capabilities we cycle back — products don't currently
  // have more than three capabilities so this is a safety net, not
  // a real path.
  const fillOpacities   = [0.55, 0.30, 0.18];
  const strokeOpacities = [1.00, 0.65, 0.45];
  const fO = fillOpacities[capIdx % fillOpacities.length];
  const sO = strokeOpacities[capIdx % strokeOpacities.length];
  // SVG colour with alpha — using rgba would force us to parse the
  // hex; using the colour with a hex alpha byte avoids that. We round
  // opacity to a 0–255 byte.
  const alpha = (op: number) => {
    const byte = Math.round(op * 255);
    return byte.toString(16).padStart(2, "0").toUpperCase();
  };
  return {
    fill:   `${baseHex}${alpha(fO)}`,
    stroke: `${baseHex}${alpha(sO)}`,
  };
}

// ── Currency-aware formatters ────────────────────────────────────────
// Every number on the wallet runs through one of these so that flipping
// the currency switch genuinely changes the whole page. Credits stay
// the underlying accounting unit — these just convert at render time
// using the per-credit rate from CURRENCIES.
//
// formatAmount       → headline numbers in the hero + table cells
// formatAmountShort  → compact form (K/L/M) for tight chrome
// unitLabel          → the right caption for stand-alone labels
//                      ("credits" vs "INR" vs "USD")
function formatAmount(credits: number, currency: Currency): string {
  const { symbol, perCredit, position } = CURRENCIES[currency];
  const amount = credits * perCredit;
  let display: string;
  // Exact zero gets the bare symbol — "₹0.000" was reading as a
  // formatting glitch on past-invoice rows that had no spend.
  if (amount === 0)      display = "0";
  else if (amount < 1)   display = amount.toFixed(3);
  else if (amount < 100) display = amount.toFixed(2);
  else                   display = Math.round(amount).toLocaleString("en-IN");
  return position === "prefix" ? `${symbol}${display}` : `${display}${symbol}`;
}

function formatAmountShort(credits: number, currency: Currency): string {
  const { symbol, perCredit, position } = CURRENCIES[currency];
  const amount = credits * perCredit;
  let display: string;
  if (amount >= 1_00_00_000) display = `${(amount / 1_00_00_000).toFixed(amount % 1_00_00_000 === 0 ? 0 : 1)}Cr`;
  else if (amount >= 100000) display = `${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  else if (amount >= 1000)   display = `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  else if (amount < 1)       display = amount.toFixed(2);
  else                       display = Math.round(amount).toLocaleString("en-IN");
  return position === "prefix" ? `${symbol}${display}` : `${display}${symbol}`;
}

// ────────────────────────────────────────────────────────────────────
//  Dynamic chart bucketing
//
//  Picks the time unit that makes the chart most readable for the
//  selected range. The rule of thumb: aim for 12–40 bars. Fewer and
//  the chart feels sparse; more and individual bars become unreadable
//  pixel strips. Buckets derive from the existing daily series, so
//  changing the range never refetches — it just regroups.
// ────────────────────────────────────────────────────────────────────

interface ChartBucket {
  /** ISO-ish key used by React for stable keys. */
  key:       string;
  /** Short human label shown on hover (e.g. "10 May", "Week of 5 May", "2pm"). */
  label:     string;
  /** Per-wallet amounts inside this bucket, indexed same as WALLETS order. */
  perWallet: number[];
  /** Sum of perWallet — used for max-scale + tooltip. */
  total:     number;
}

interface ChartData {
  buckets:     ChartBucket[];
  /** First/middle/last bucket labels for the X-axis ticks. */
  ticks:       [string, string, string];
  /** Per-wallet totals across the whole range — drives the pills. */
  walletTotals: number[];
  grandTotal:  number;
  maxBucket:   number;
  /** Human-readable unit name for the caption ("hour", "day", "week"). */
  unit:        "hour" | "day" | "week";
}

function buildChartBuckets(rangeDays: number): ChartData {
  const seriesPerWallet = WALLETS.map((w) => sliceDailyToRange(w.daily, rangeDays));
  const dailyDates       = seriesPerWallet[0].map((d) => d.date);

  // Choose unit based on range. The thresholds keep the bar count
  // in a readable zone:
  //   1 day            → 24 hours
  //   2–60 days        → daily
  //   61+ days         → weekly
  let unit: "hour" | "day" | "week" =
      rangeDays <= 1  ? "hour"
    : rangeDays <= 60 ? "day"
    :                   "week";

  let buckets: ChartBucket[] = [];

  if (unit === "hour") {
    // Hourly view — take the last day's total and spread it across
    // 24 hours using a typical workday curve (low overnight, peaks
    // late morning + mid-afternoon). Deterministic per wallet so the
    // chart doesn't flicker between renders.
    const lastIdx = dailyDates.length - 1;
    const dayLabel = new Date(dailyDates[lastIdx]).toLocaleString("en-IN", {
      day: "numeric", month: "short",
    });
    const hourlyShape = (h: number) => {
      // Bell-ish curve centered around 11am + 4pm. Returns a weight
      // we'll normalise; not credits directly.
      const a = Math.exp(-Math.pow((h - 11) / 3.5, 2));
      const b = Math.exp(-Math.pow((h - 16) / 4.0, 2));
      const base = 0.05; // small overnight floor
      return base + 0.55 * a + 0.4 * b;
    };
    const weights = Array.from({ length: 24 }, (_, h) => hourlyShape(h));
    const weightSum = weights.reduce((s, w) => s + w, 0);

    for (let h = 0; h < 24; h++) {
      const share = weights[h] / weightSum;
      const perWallet = seriesPerWallet.map((s) =>
        Math.round((s[lastIdx]?.amount ?? 0) * share)
      );
      const total = perWallet.reduce((s, n) => s + n, 0);
      const hr12 = ((h + 11) % 12) + 1;
      const ampm = h < 12 ? "am" : "pm";
      buckets.push({
        key:   `${dayLabel}-${h}`,
        label: `${dayLabel} · ${hr12}${ampm}`,
        perWallet,
        total,
      });
    }
  } else if (unit === "day") {
    // Daily view — one bucket per date.
    for (let i = 0; i < dailyDates.length; i++) {
      const perWallet = seriesPerWallet.map((s) => s[i].amount);
      const total = perWallet.reduce((s, n) => s + n, 0);
      const label = new Date(dailyDates[i]).toLocaleString("en-IN", {
        day: "numeric", month: "short",
      });
      buckets.push({ key: dailyDates[i], label, perWallet, total });
    }
  } else {
    // Weekly view — group runs of 7 consecutive days into a single
    // bucket; the last bucket may be a partial week, which is fine.
    for (let i = 0; i < dailyDates.length; i += 7) {
      const slice = dailyDates.slice(i, i + 7);
      const perWallet = seriesPerWallet.map((s) =>
        slice.reduce((sum, _, j) => sum + (s[i + j]?.amount ?? 0), 0)
      );
      const total = perWallet.reduce((s, n) => s + n, 0);
      const first = new Date(slice[0]);
      const label = `Week of ${first.toLocaleString("en-IN", { day: "numeric", month: "short" })}`;
      buckets.push({ key: slice[0], label, perWallet, total });
    }
  }

  const walletTotals = WALLETS.map((_, i) =>
    buckets.reduce((s, b) => s + b.perWallet[i], 0)
  );
  const grandTotal = walletTotals.reduce((s, n) => s + n, 0);
  const maxBucket  = Math.max(1, ...buckets.map((b) => b.total));

  // First / middle / last labels for X-axis ticks. Falls back gracefully
  // when there are fewer than 3 buckets.
  const ticks: [string, string, string] = [
    buckets[0]?.label ?? "",
    buckets[Math.floor(buckets.length / 2)]?.label ?? "",
    buckets[buckets.length - 1]?.label ?? "",
  ];

  return { buckets, ticks, walletTotals, grandTotal, maxBucket, unit };
}

// Direct default export — the Suspense wrapper used to exist because
// the wallet read ?topup=1 from useSearchParams to auto-open the
// estimator modal. That deep-link is gone (it was hijacking the
// dashboard), so there's nothing here that needs a Suspense
// boundary anymore. Adding credits is now strictly user-initiated.
// Three routes mount the same component with different views:
//   /settings/utilization → view = "utilization" (balance + per-product
//     consumption + utilization-over-time charts)
//   /settings/billing     → view = "billing"     (billing-mode, money
//     hero, products spend table, invoices)
//   /settings/wallet      → view = "wallet"      (legacy URL — kept
//     alive for back-compat; renders the same as "utilization")
//
// Splitting at the section level keeps the pages distinct without
// forking the underlying data hooks.
export type WalletPageView = "utilization" | "billing" | "wallet";

export default function WalletSettingsPage({ view = "utilization" }: { view?: WalletPageView } = {}) {
  // Treat the legacy "wallet" view as a synonym for "utilization" so
  // the rest of the file only has to branch on two cases.
  const v: "utilization" | "billing" = view === "billing" ? "billing" : "utilization";
  // Single credit pool — drives the hero's big remaining number.
  const pool   = useMemo(() => poolSummary(), []);
  const period = useMemo(() => periodProgress(CYCLE_START_DAY), []);

  // Page-level date range. Drives the chart and the "utilized in
  // range" stat in the hero. The pool's remaining / total figures are
  // period-based and intentionally NOT filtered — they reflect your
  // billing cycle, not whatever window you're looking at. Stored as
  // a day count so the existing data helpers don't care which
  // DateRangeSelector preset triggered the change.
  // Defaults to "thismonth" (mirrors how Billing defaults to the
  // current calendar cycle) — Usage and Billing live next to each
  // other in Settings and the user expects them to anchor to the
  // same window unless they pick otherwise. presetToDays collapses
  // the preset to a day count for downstream helpers.
  const [range, setRange] = useState<number>(presetToDays("thismonth"));
  // Track the raw preset string in parallel so any caption that
  // reads "used …" can echo the actual filter the user picked
  // ("today" / "this month" / "last month") instead of always
  // collapsing to "last N days". Plumbed down to WalletUsageChart.
  const [rangePreset, setRangePreset] = useState<string>("thismonth");

  // Workspace scope filter — multi-select. Usage rolls up across
  // workspaces the user can see; the filter narrows the rollup to
  // a chosen subset without leaving the page. Default is "all
  // workspaces selected" so the page reads as the full picture on
  // first load. Keyed by workspace id; an empty array is treated as
  // "none" (zeroes everything) so the user can A/B isolate workspaces
  // without losing the date filter.
  const accessibleWorkspaces = useAccessibleWorkspaces();
  // `useAccessibleWorkspaces` returns a freshly-filtered array on every
  // render, so depending on the array reference would re-fire the
  // effect every render and trigger an infinite setState loop. We key
  // off the joined-id string instead — stable across renders unless
  // the actual set of accessible workspaces changes.
  const accessibleWorkspaceIdsKey = accessibleWorkspaces.map((w) => w.id).join(",");
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>(() =>
    accessibleWorkspaces.map((w) => w.id),
  );
  // Re-seed if the accessible set actually changes (e.g. demo role
  // switch). Only drops entries that are no longer accessible; if
  // nothing carries over, seeds everything as selected.
  useEffect(() => {
    setSelectedWorkspaceIds((prev) => {
      const accessibleIds = accessibleWorkspaceIdsKey ? accessibleWorkspaceIdsKey.split(",") : [];
      const valid = prev.filter((id) => accessibleIds.includes(id));
      return valid.length > 0 ? valid : accessibleIds;
    });
  }, [accessibleWorkspaceIdsKey]);

  // Billing month — Billing is anchored to monthly invoice cycles, so the
  // header on the Billing view exposes a Months dropdown (not the dynamic
  // DateRangeSelector). Default = current month ("This month"). We keep
  // both selectors' state independent so the user can toggle Utilization ↔
  // Billing without one resetting the other.
  // 24 cycles' worth of history so the picker reaches back to the
  // workspace's first billed cycle. The picker itself is a flat
  // scrollable list; no need to keep this small for "presets" anymore.
  const billingMonths      = useMemo(() => billingMonthOptions(24, CYCLE_START_DAY), []);
  const [billingMonth, setBillingMonth] = useState<BillingMonth>(billingMonths[0]);

  // Effective window. Utilization always uses `range` from the DateRangeSelector
  // (offset 0 — last N days). Billing uses the month selection's
  // (days, offsetFromEnd) pair so the numbers are a true calendar-month slice
  // instead of "last 30 days" mislabelled as a month.
  const isBilling       = v === "billing";
  const effectiveDays   = isBilling ? billingMonth.days          : range;
  const effectiveOffset = isBilling ? billingMonth.offsetFromEnd : 0;

  // Hydrate the currency store once on mount so the user's last
  // chosen currency (INR or USD) sticks across reloads.
  // Currency forced to INR — the wallet is now a pure cash system.
  // The store stays around so other (legacy) consumers don't break,
  // but this page reads "INR" everywhere directly.
  const currency: Currency = "INR";

  // Billing mode picks which Billing layout renders below: prepaid
  // (top-up + balance) or postpaid (cycle-end bill). Both share the
  // Usage block above. We also pull the balance state — only prepaid
  // uses it, but it drives the empty/expired hero takeover and the
  // low-balance modal that blocks any new product action.
  const billingMode      = useBillingModeStore((s) => s.mode);
  const balanceState     = useBillingModeStore((s) => s.balance);
  // Page-level reads — Activity & invoices below needs these to know
  // what kind of document to build for each row's download (Tax invoice
  // for subscription, Account statement for pure top-up, etc.), and
  // whether to surface a "rolls forward" or "forfeit" reconciliation.
  const prepaidPlanType  = useBillingModeStore((s) => s.prepaidPlanType);
  const carryForward     = useBillingModeStore((s) => s.carryForward);
  // Enabled modules — drives which rows / chart series / line items /
  // table rows surface across Usage and Billing. Sourced from the
  // workspace's product entitlement (the sidebar's preview-mode
  // presets) so the demo doesn't need a separate ModuleMix toggle:
  // flipping to "Voice AI only" in the sidebar collapses every
  // wallet/billing surface to AI Calling in one place. Mapping
  // ProductKey → wallet moduleId is fixed here because the wallet
  // doesn't expose a "campaigns" module — campaigns spend rolls into
  // AI Calling, which is the meter that actually fires when an
  // outreach dials. So "campaigns without ai_calling" is impossible
  // by design; any preset that owns campaigns also owns ai_calling.
  const { products } = useProducts();
  const enabledModuleIds = useMemo<readonly string[]>(() => {
    const ids: string[] = [];
    if (products.includes("enrichment"))         ids.push("enrichment");
    if (products.includes("contact_extraction")) ids.push("contact-extraction");
    if (products.includes("ai_calling"))         ids.push("ai-calling");
    return ids;
  }, [products]);
  const hydrateMode      = useBillingModeStore((s) => s.hydrate);
  useEffect(() => { hydrateMode(); }, [hydrateMode]);

  // Range-windowed total — recomputed when either selector or the
  // module mix changes (a "voice-only" customer's hero stops summing
  // extraction/enrichment they don't have).
  const rangeUtilized = useMemo(
    () => utilizedInRange(effectiveDays, effectiveOffset, enabledModuleIds),
    [effectiveDays, effectiveOffset, enabledModuleIds],
  );

  // Low-balance / expired modal — shown when a prepaid org tries to
  // run any new action while its wallet is blocking. The modal also
  // serves as the "send recharge request" surface that was on the
  // wallet hero card itself in earlier versions.
  const [lowBalanceOpen, setLowBalanceOpen] = useState(false);

  // Top-up estimator modal. Only opens when the user clicks the
  // "+ Add credits" button on this page. The previous behaviour of
  // auto-opening on a ?topup=1 deep-link was hijacking the wallet
  // dashboard — the user landed on /settings/wallet from the sidebar
  // and the modal popped on top of the page they actually wanted to
  // see. Adding credits is an explicit action, not a side effect of
  // navigating to the wallet.
  const [topupOpen, setTopupOpen] = useState(false);

  // Deep-link entry from the sidebar wallet widget's "Top up" link —
  // /settings/billing?topup=1 opens the estimator immediately so the
  // user lands in the estimation flow rather than the listing page.
  // We constrain this to the Billing view + prepaid mode so the link
  // can't open the modal on Usage (where adding money makes no sense)
  // or on a postpaid org (which has no wallet to top up). The param
  // is consumed once and then dropped so a back-button + forward
  // doesn't re-open it.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (v !== "billing") return;
    if (searchParams?.get("topup") !== "1") return;
    // Defer the open by one tick so the modal mounts after the page
    // chrome (avoids a flash of empty modal during the route hop).
    const id = setTimeout(() => setTopupOpen(true), 0);
    // Drop the query param so the modal-state and URL stay consistent.
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("topup");
      window.history.replaceState({}, "", url.toString());
    }
    return () => clearTimeout(id);
  }, [v, searchParams]);

  // (The "Utilization over time" chart used to derive its bucket
  // series from this page-level `range`, but it now owns its own
  // date filter — see <WalletUsageChart/> — so there's nothing to
  // precompute here.)

  const periodLabel = `${period.start.toLocaleString("en-IN", { day: "numeric", month: "short" })} – ${period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}`;

  return (
    <div className="pb-8 space-y-6">
      {/* ── Section header ────────────────────────────────────────────
          The DateRangeSelector lives next to "Add credits" so the
          filter is visible without taking its own row — empty space
          was making the page read as dead. Uses the same component
          that drives /dashboard, /campaigns and /outreach. */}
      {/* Header — title is route-specific so each settings option
          owns its own page identity. Wallet route stays scoped to
          balance + recharge; Billing route covers usage, spend, and
          invoices. Date filter is shared chrome — both routes use
          the same range when computing range-windowed numbers. The
          right-hand CTA only appears on the wallet route since
          adding money is a wallet action. */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-text-primary">
            {v === "utilization" ? "Usage" : "Billing"}
          </h2>
          {/* Subtitle removed — the section title is self-explanatory
              and the supporting copy was just restating it. The page
              cards below carry the real context. */}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Filter — months for Billing, free-form range for Utilization.
              Billing is anchored to monthly invoice cycles, so anything
              shorter or longer than a calendar month doesn't have a stable
              meaning ("what's my bill for the last 14 days?" isn't a
              question billing answers). Utilization is consumption
              analysis where a sliding window is genuinely useful. */}
          {isBilling ? (
            <BillingMonthSelector
              value={billingMonth}
              options={billingMonths}
              onChange={setBillingMonth}
            />
          ) : (
            <>
              {/* Workspace scope — multi-select. Sits to the left of the
                  date filter so the eye reads "which workspaces ·
                  which window" in scanning order. Hidden for users
                  with only one accessible workspace (the filter would
                  be a single non-toggleable row). */}
              {accessibleWorkspaces.length > 1 && (
                <WorkspaceMultiSelect
                  workspaces={accessibleWorkspaces}
                  selectedIds={selectedWorkspaceIds}
                  onChange={setSelectedWorkspaceIds}
                />
              )}
              <DateRangeSelector
                compact
                defaultPreset="thismonth"
                onChange={(preset) => {
                  setRange(presetToDays(preset));
                  setRangePreset(preset);
                }}
              />
            </>
          )}
          {/* Add money is a billing/wallet action — only relevant on
              the Billing page and only for prepaid customers. Postpaid
              has nothing to top up against. */}
          {v === "billing" && billingMode === "prepaid" && (
            <BillingPrimaryCta
              onAddMoney={() => {
                if (isBalanceBlocking(billingMode, balanceState)) {
                  setLowBalanceOpen(true);
                } else {
                  setTopupOpen(true);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Demo controls — Billing view only. BillingModeSwitch is lifted
          out (rendered separately below) because it's a real product
          concept (the workspace IS one or the other) and it impacts
          whether the wallet shows up at all. The plan-type and balance-
          state switches are pure demo flags — they belong behind the
          disclosure so they don't clutter the production reading order.
          Usage view shows nothing here — the demo toggles don't change
          anything on the units side, so a disclosure there is just
          noise. */}
      {isBilling && (
        <div className="flex items-center gap-3 flex-wrap">
          <BillingModeSwitch />
          {billingMode === "prepaid" && (
            <details className="group">
              <summary className="inline-flex items-center gap-1.5 px-2 h-6 rounded-badge text-[11px] font-medium text-text-tertiary cursor-pointer hover:text-text-secondary hover:bg-surface-secondary transition-colors duration-150 list-none [&::-webkit-details-marker]:hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary/40 group-open:bg-accent" />
                Demo controls
                <ChevronDown size={11} strokeWidth={2} className="transition-transform duration-150 group-open:rotate-180" />
              </summary>
              {/* ModuleMix toggle dropped: the workspace's product mix
                  is now driven by the sidebar's "Product preview"
                  presets, so a duplicate switcher here would let the
                  two diverge. Pick the mix from the sidebar and every
                  surface — wallet, modules table, billing line items —
                  follows. */}
              <div className="mt-3 flex items-center gap-6 flex-wrap">
                <PrepaidPlanTypeSwitch />
                <CarryForwardSwitch />
                <BalanceStateDemoSwitch />
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Utilization route ──────────────────────────────────────────
          Utilization is the consumption story — "how much of each
          product have I used over this time period, in real units?".
          Pure units, no money. Applies identically to prepaid and
          postpaid customers (consumption is consumption; how the org
          gets billed for it doesn't change what was consumed).
      */}
      {v === "utilization" && (
        <div className="space-y-4">
          {/* Top widget — total used across all enabled products in
              the active DateRangeSelector window. Pure usage story:
              just the amount, no Remaining / balance comparison.
              Past closed presets (yesterday / last week / last
              month) read as "USED LAST MONTH" etc.; rolling presets
              collapse to "USED TILL NOW" so the cycle's running
              total reads at a glance. */}
          <UsageHero
            rangeUtilized={rangeUtilized}
            isPast={isPastPreset(rangePreset)}
            productCount={enabledModuleIds.length}
          />
          <UtilizationByProductTable rangeDays={range} enabledModuleIds={enabledModuleIds} />
        </div>
      )}

      {/* ── Billing route ──────────────────────────────────────────────
          Billing is the money story — how much have I spent, and
          (for prepaid) how much balance do I have left to draw down
          on? The hero differs by billing mode because the underlying
          model differs:

            Prepaid  → Spend in range + Remaining balance + % of
                       plan. There IS a wallet to deplete.
            Postpaid → Estimated bill this cycle + Spend cap. NO
                       balance, just an end-of-cycle invoice number.

          The Products spend table + invoices below the hero are
          shared across both modes.
      */}
      {/* ── Billing model strip ─────────────────────────────────────
          A compact one-line summary of how this workspace is billed
          (model · plan · cycle dates · carry-forward). Sits at the
          very top of the page so the user can read the "context"
          before getting into the hero numbers below. Render only on
          the Billing view — the Usage view doesn't need it. */}
      {v === "billing" && (
        <BillingModelStrip
          billingMode={billingMode}
          planType={prepaidPlanType}
          carryForward={carryForward}
          planBaseline={pool.totalCredits}
          cycleStart={period.start}
          cycleEnd={period.end}
        />
      )}
      {v === "billing" && billingMode === "prepaid" && isBalanceBlocking(billingMode, balanceState) && (
        <PrepaidEmptyHero
          balance={balanceState}
          onRecharge={() => setLowBalanceOpen(true)}
        />
      )}
      {v === "billing" && billingMode === "prepaid" && !isBalanceBlocking(billingMode, balanceState) && (
        <PrepaidBalanceHero
          rangeUtilized={rangeUtilized}
          range={effectiveDays}
          rangeOffset={effectiveOffset}
          rangeLabel={billingMonth.label}
          pool={pool}
          period={period}
          periodLabel={periodLabel}
          billingMonth={billingMonth}
          billingMode={billingMode}
          enabledModuleIds={enabledModuleIds}
        />
      )}
      {v === "billing" && billingMode === "postpaid" && (
        <BillingSpendHero
          rangeUtilized={rangeUtilized}
          range={effectiveDays}
          rangeOffset={effectiveOffset}
          rangeLabel={billingMonth.label}
          billingMode={billingMode}
          period={period}
          periodLabel={periodLabel}
          billingMonth={billingMonth}
          enabledModuleIds={enabledModuleIds}
        />
      )}

      {/* Per-product breakdown — used to live here as a sibling card
          below the hero, but now embedded directly inside the hero
          itself (PrepaidBalanceHero / BillingSpendHero) so the user
          reads the headline number and the drill-down as one block.
          See HeroProductBreakdown. */}

      {/* ── Old wallet card grid — kept disabled in case we need to
          revert. Not rendered. */}
      {false && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WALLETS.map((w) => (
            <WalletCard key={w.id} wallet={w} rangeDays={range} />
          ))}
        </div>
      )}

      {/* ── Utilization over time ──────────────────────────────────────
          Reimagined to mirror ElevenLabs' usage chart:
          - the boxy "Total spend" tile + three module pills used to
            sit above the chart and felt like dashboard widgets in
            their own right. They're now compressed into a quiet inline
            total in the header and a legend row below the chart.
          - the canvas is bigger and shows hover tooltips on every
            bucket — the previous `title` attribute relied on browser
            tooltips which delay and feel disconnected.
          - the x-axis carries 5 evenly-spaced labels rather than just
            first/mid/last, so the user can read what time a peak hit
            without counting bars.
          - credits stay the only unit on this chart (no rupee
            conversion alongside) — money already lives at the top of
            the page, repeating it here added noise. */}
      {/* Utilization over time — single chart with three product tabs
          and its own inline date filter. Lives only on the
          Utilization page because it visualises consumption rather
          than money. */}
      {v === "utilization" && (
        <WalletUsageChart
          range={range}
          enabledModuleIds={enabledModuleIds}
        />
      )}

      {/* ── Billing history ──────────────────────────────────────────
          Lives only on the Billing route. Modelled on Shopify Partners'
          billing page: a subscription summary card at the top (only
          relevant for subscription plans), then a list of recent
          settled bills as expandable rows that drop into a per-line
          breakdown + Download. A month picker handles older bills so
          the user isn't capped at the five-most-recent default. */}
      {v === "billing" && (
        <BillingHistorySection
          billingMode={billingMode}
          planType={prepaidPlanType}
          carryForward={carryForward}
          planBaseline={pool.totalCredits}
          enabledModuleIds={enabledModuleIds}
        />
      )}

      {/* Top-up estimator — mounted at the page root so the overlay
          covers the full viewport. Opened via the "Add credits" CTA
          and via the ?topup=1 deep-link from the sidebar widget. */}
      <TopUpEstimatorModal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
      />

      {/* Low-balance / expired modal — blocks new actions when a
          prepaid org has drained its wallet or its prepaid window
          has lapsed. Mounted page-level so any future action handler
          (Create outreach, Add leads, etc.) can open it with the
          same setLowBalanceOpen(true) call. */}
      <LowBalanceModal
        open={lowBalanceOpen}
        onClose={() => setLowBalanceOpen(false)}
        actionLabel="add money"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  ModulesTable — sortable, scales linearly with module count.
//  Trend column intentionally lives in the chart below — a 64px
//  sparkline can't tell a story, so we don't pretend it can.
// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
//  CurrencySwitcher — small chip next to the page title that shows
//  the current denomination and lets the user cycle through supported
//  currencies. Clicking advances to the next; the store persists the
//  choice across reloads. Chip-style so it reads as a setting, not a
//  primary action.
// ────────────────────────────────────────────────────────────────────

// Single, visible currency switch. The earlier chip read as a footnote
// ("1 credit = ₹1 INR") and didn't make it obvious that clicking it
// would change every number on the page. This is now a segmented
// toggle — the user clearly sees the two states, picks one, and every
// money number across the hero, modules table, and chart re-renders
// in the chosen currency. The per-credit rate is small and right of
// the toggle so the conversion stays visible without competing for
// attention.
// ────────────────────────────────────────────────────────────────────
//  WalletUtilizationSection — the "Utilization" half of the wallet
//  page. Currency-free by design: rows show how much *work* was done
//  in real units (phones extracted, lookups run, minutes talked), not
//  what it cost. The cost story lives in the Billing section below.
//
//  Per-capability counts come from credits-data.ts; we scale them by
//  the share of the selected range vs the full period so the numbers
//  shrink/grow when the user changes the date filter. Capabilities
//  marked `included` (plan perks like Concurrency) are filtered out
//  because they don't carry a unit count.
// ────────────────────────────────────────────────────────────────────
function WalletUtilizationSection({ rangeDays }: { rangeDays: number }) {
  // Per-product summary. Each row shows the product identity on the
  // left and a stat per capability on the right — no aggregate hero
  // number for the product. The user pointed out that "total actions
  // / total lookups / total mins" don't carry meaning across products
  // (you can't compare 2,441 actions to 526 lookups), and they hide
  // the only numbers that actually do: how many phone extractions,
  // how many email extractions, how many minutes talked.
  const moduleRows = useMemo(() => {
    return WALLETS.map((w) => {
      const rangeUtilized  = sliceDailyToRange(w.daily, rangeDays).reduce((s, d) => s + d.amount, 0);
      const periodUtilized = w.utilized;
      const ratio = periodUtilized > 0 ? rangeUtilized / periodUtilized : 0;
      const caps = w.capabilities
        .filter((c) => !c.included && c.unitCount > 0)
        .map((c) => ({
          id:        c.id,
          icon:      c.icon,
          label:     c.label,
          unitCount: Math.round(c.unitCount * ratio),
          unitLabel: c.unitLabel,
        }));
      return { module: w, caps };
    });
  }, [rangeDays]);

  return (
    <div>
      {/* Section header — title + one-line subtitle that spells out
          exactly what numbers the user is looking at. Earlier copy
          ("in real units") was jargon; this is plain English. */}
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={14} strokeWidth={1.6} className="text-text-tertiary" />
        <h3 className="text-[14px] font-semibold text-text-primary">Usage by product</h3>
      </div>
      <p className="text-[12px] text-text-secondary mb-3">
        How much each product was used in the last {rangeDays} days. Numbers reflect successful actions only.
      </p>

      {/* One row per product. Each row is a 2-column grid:
            [ product identity ]   [ capability stats — N stat blocks ]
          The product is the row's identity; each capability is its
          own headline number inside the row. No product-level total
          — that aggregate wasn't meaningful (you can't sum phones
          and emails into a useful "actions" number). */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {moduleRows.map(({ module: m, caps }, idx) => {
          const ModIcon = m.icon;
          return (
            <div
              key={m.id}
              className={`grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-x-6 gap-y-3 px-5 py-4 items-center ${
                idx > 0 ? "border-t border-border-subtle" : ""
              }`}
            >
              {/* Column 1 — product identity. No capability count
                  caption since the capabilities are visible right
                  next to it. */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: m.chartColor }}
                />
                <div
                  className="w-8 h-8 rounded-input flex items-center justify-center shrink-0"
                  style={{ background: m.gradient }}
                >
                  <ModIcon size={14} strokeWidth={1.6} style={{ color: m.text }} />
                </div>
                <p className="text-[13px] font-medium text-text-primary truncate">
                  {m.name}
                </p>
              </div>

              {/* Column 2 — capability stats. Each capability gets
                  its own headline number (big tabular figure) with
                  the capability label as a small caption underneath.
                  This way "Phone extraction 779" and "Email extraction
                  1,662" both read as first-class stats, not as
                  footnotes to an aggregate. For AI Calling there's
                  just one capability, so a single stat fills the
                  column — still consistent chrome with the others. */}
              <div className="flex items-center gap-x-10 gap-y-4 flex-wrap">
                {caps.length === 0 ? (
                  <span className="text-text-tertiary text-[11.5px]">
                    No usage yet in this range.
                  </span>
                ) : (
                  caps.map((c) => {
                    // Talk time is the only capability where the unit
                    // ("mins") actually carries information beyond the
                    // label — minutes vs hours matters. For phone /
                    // email extraction the unit ("phone", "email") is
                    // already implied by the label, so we omit it. For
                    // enrichment we don't have a meaningful unit
                    // suffix either — the label "Professional
                    // enrichment" already says what one count means.
                    const suffix = c.unitLabel === "min"
                      ? ` ${c.unitLabel}${c.unitCount === 1 ? "" : "s"}`
                      : "";
                    return (
                      <div key={c.id} className="tabular-nums">
                        <p className="text-[22px] font-semibold text-text-primary leading-none">
                          {c.unitCount.toLocaleString("en-IN")}
                          {suffix && (
                            <span className="text-[13px] font-medium text-text-secondary ml-1">
                              {suffix.trim()}
                            </span>
                          )}
                        </p>
                        <p className="text-[10.5px] text-text-tertiary uppercase tracking-[0.4px] mt-1.5">
                          {c.label}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  WalletUsageChart — the Utilization over time block, rebuilt to
//  mirror the ElevenLabs usage view.
//
//  Earlier this section opened with three big tiles (Total spend +
//  three module summaries with mini bars) before the chart even
//  started. They drew the eye away from the actual graph and made
//  the section read like a dashboard rather than a chart. The
//  redesign:
//
//  - Compresses the per-module totals into a quiet legend row below
//    the chart (dot + name + credits + share %). It functions as
//    both a key and a summary, matching how ElevenLabs labels series.
//  - Promotes the chart canvas — taller, more breathing room.
//  - Shows a hover tooltip on every bar with the bucket label and a
//    per-module breakdown, instead of relying on browser-native
//    title attributes that lag and feel disconnected.
//  - Surfaces 5 evenly-spaced x-axis ticks instead of just first/
//    mid/last so users can read times directly off the axis.
//  - Drops the "≈ ₹X" caption next to the credit total — money
//    lives at the top of the page, repeating it here was noise.
// ────────────────────────────────────────────────────────────────────
function WalletUsageChart({
  range,
  enabledModuleIds,
}: {
  range: number;
  enabledModuleIds: readonly string[];
}) {
  // Filter WALLETS down to the modules the customer actually has.
  // Doing this at the top so every downstream variable (activeWallet,
  // tabs, totals) is automatically scoped — no "this exists in data
  // but not in mix" gotchas later in the function. The chart returns
  // an empty-state card when no modules remain (e.g. a hypothetical
  // mix with zero enabled).
  const visibleWallets = useMemo(
    () => WALLETS.filter((w) => enabledModuleIds.includes(w.id)),
    [enabledModuleIds],
  );

  // Active product tab. Clamped to the visible set so flipping the
  // module mix doesn't leave the chart stuck on a hidden tab.
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const safeActiveIdx = Math.min(activeIdx, Math.max(0, visibleWallets.length - 1));

  // Bucket the daily series for the chart's local range. Reuses the
  // page-level helper so the bucketing logic stays in one place.
  const days = useMemo(() => buildChartBuckets(range), [range]);
  const activeWallet = visibleWallets[safeActiveIdx] ?? WALLETS[0];

  // Capabilities of the active product (filtering out plan-feature
  // rows like AI Calling's "Concurrency"). These drive the stacked
  // layers in the chart so the user can see WHERE within a product
  // the spend went. E.g. Contact Extraction stacks Phone + Email,
  // Enrichment stacks Professional + Financial.
  const activeCaps = activeWallet.capabilities.filter((c) => !c.included);

  // Utilization is measured in UNITS, not rupees. The wallet's daily
  // series carries ₹ amounts though, so we convert from ₹ → units by
  // proportionally redistributing the product's static unit counts
  // (from credits-data) across the active range. The bucket-to-bucket
  // shape stays identical to the rupee series; only the scale flips
  // from money to actions.
  // `walletTotals` / `b.perWallet` from `buildChartBuckets` are keyed
  // by the FULL WALLETS array, not the filtered set we render. Look
  // up the active wallet's index in the full array so the bucket
  // numbers are the right product's. Without this the chart would
  // silently pull another module's data when a partial mix is active.
  const fullActiveIdx = WALLETS.findIndex((w) => w.id === activeWallet.id);
  const totalRangeRupees = days.walletTotals[fullActiveIdx] ?? 0;

  // Each capability's unit count for the active date range. The
  // static seed counts are for the full period; we scale them down
  // by what fraction of the period falls inside the range. For real
  // data this'd come straight from a per-capability events stream;
  // the proportional approximation produces the same visual shape.
  const rangeRatio = activeWallet.utilized > 0 ? totalRangeRupees / activeWallet.utilized : 0;
  const capRangeUnits = activeCaps.map((c) => c.unitCount * rangeRatio);

  // Per-bucket per-capability unit count. We distribute each cap's
  // range total across buckets weighted by the bucket's share of the
  // range's ₹ — so a bucket with double the spend gets double the
  // units of that capability.
  const rupeeSeries = days.buckets.map((b) => b.perWallet[fullActiveIdx] ?? 0);
  const capSeries: number[][] = activeCaps.map((_, capIdx) =>
    rupeeSeries.map((v) =>
      totalRangeRupees > 0 ? (v / totalRangeRupees) * capRangeUnits[capIdx] : 0
    )
  );

  // Per-bucket TOTAL units (sum across capabilities). Drives the
  // stack's max and the tooltip's "Total" row.
  const series = rupeeSeries.map((_, bIdx) =>
    capSeries.reduce((s, row) => s + row[bIdx], 0)
  );

  // Range total in units for the active product — anchors the hero
  // stat above the chart.
  const total = capRangeUnits.reduce((s, n) => s + n, 0);

  // capPerBucketTotals[capIdx] = total units for one capability across
  // the whole range — drives the legend chips and tooltip rows.
  const capTotals = capSeries.map((row) => row.reduce((s, v) => s + v, 0));

  // Active product's display unit suffix. When all capabilities share
  // a unit (Enrichment: both "enrichment", AI Calling: just "min") we
  // use that unit + plural. When they differ (Contact Extraction:
  // phones + emails) we fall back to the product's own action verb —
  // "extractions" — instead of the generic "actions", so the caption
  // reads as a product-native count rather than a category label.
  const productFallbackLabel: Record<string, string> = {
    "contact-extraction": "extraction",
    "enrichment":         "enrichment",
    "ai-calling":         "min",
  };
  const productUnitLabel = (() => {
    if (activeCaps.length === 0) return "";
    const first = activeCaps[0].unitLabel;
    const allSame = activeCaps.every((c) => c.unitLabel === first);
    const base = allSame ? first : (productFallbackLabel[activeWallet.id] ?? "action");
    return `${base}${total === 1 ? "" : "s"}`;
  })();

  // Pad the raw max up to a round number so the Y-axis labels can be
  // clean increments (0, 50, 100, 150, 200) instead of awkward
  // fractions of the literal peak.
  const max = niceMax(Math.max(1, ...series));

  const CHART_H = 240;
  const viewW   = 100;

  // x positions are shared across all capability layers — they only
  // differ on the y axis. Pre-compute once.
  const xs = series.map((_, i) =>
    series.length > 1 ? (i / (series.length - 1)) * viewW : viewW / 2
  );

  // Stacked layer paths. layerPaths[capIdx] holds the filled polygon
  // path and the top-edge stroke path for one capability. Stacking
  // is bottom-up: layer 0 sits on the baseline, layer N sits on top
  // of the sum of layers 0..N-1.
  const layerPaths = activeCaps.map((_, capIdx) => {
    // Top edge of this layer at each bucket = sum of layers 0..capIdx
    const topVals = series.map((_, bIdx) => {
      let acc = 0;
      for (let i = 0; i <= capIdx; i++) acc += capSeries[i][bIdx];
      return acc;
    });
    // Bottom edge = sum of layers 0..capIdx-1 (or 0 for the bottom)
    const bottomVals = series.map((_, bIdx) => {
      if (capIdx === 0) return 0;
      let acc = 0;
      for (let i = 0; i < capIdx; i++) acc += capSeries[i][bIdx];
      return acc;
    });
    const toPx = (v: number) => CHART_H - (v / max) * CHART_H;
    const topPts    = xs.map((x, i) => ({ x, y: toPx(topVals[i]) }));
    const bottomPts = xs.map((x, i) => ({ x, y: toPx(bottomVals[i]) }));

    // Top edge as a path (Mx Ly Lx Ly ...). Used for the stroke
    // between layers.
    const topPath = topPts.length
      ? "M " + topPts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")
      : "";
    // Filled polygon: top edge forward, bottom edge backward, close.
    const polyPath = topPts.length
      ? topPath + " L " + bottomPts.slice().reverse()
          .map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ") + " Z"
      : "";
    return { topPath, polyPath };
  });

  // When there's only one capability (AI Calling has just Talk
  // time), the stack collapses to a single layer — but we still use
  // the layer-based rendering for consistency. The single layer
  // simply fills from baseline to the line.

  // Hit-detection still uses the total `series`; the user is
  // hovering over the whole stack, not a particular layer.
  const points = series.map((v, i) => ({
    x: xs[i],
    y: CHART_H - (v / max) * CHART_H,
    v,
    idx: i,
  }));

  const [hover, setHover] = useState<number | null>(null);

  // X-axis tick density adapts to bucket count. Earlier the chart
  // showed only 5 ticks regardless of range — for a 30-day window
  // that's a label every six days, sparse enough that the user
  // couldn't tell which date a peak sat on. The new ladder targets
  // a label every 3–4 buckets so you can read the date directly off
  // the axis without counting.
  const xTickTarget =
      days.buckets.length <= 7  ? days.buckets.length
    : days.buckets.length <= 14 ? 7
    : days.buckets.length <= 30 ? 9
    : days.buckets.length <= 60 ? 10
    :                             8;
  const xTicks = (() => {
    const n = days.buckets.length;
    if (n === 0) return [] as { idx: number; label: string }[];
    if (n <= xTickTarget) return days.buckets.map((b, idx) => ({ idx, label: b.label }));
    return Array.from({ length: xTickTarget }, (_, i) => {
      const idx = Math.round((i / (xTickTarget - 1)) * (n - 1));
      return { idx, label: days.buckets[idx].label };
    });
  })();

  // Y-axis ticks at 0%/25%/50%/75%/100% of `max`. Top of the canvas
  // is `max`, bottom is 0; we render the labels right-aligned in a
  // dedicated column so they sit exactly opposite their gridline.
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((p) => ({
    topPct: (1 - p) * 100,
    value:  max * p,
  }));

  // Friendly bucket-unit label for the subtitle ("Daily", "Weekly", "Hourly").
  const unitWord = days.unit === "hour" ? "Hourly" : days.unit === "week" ? "Weekly" : "Daily";

  return (
    <div className="bg-white border border-border rounded-card p-5">
      {/* Header — title only. The local date filter has been removed
          in favour of the page-level DateRangeSelector at the top of
          /settings/utilization — two filters competing for "what
          window am I looking at?" was confusing. */}
      <div className="mb-3">
        <h3 className="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
          <TrendingUp size={13} strokeWidth={1.6} className="text-text-tertiary" />
          Usage over time
        </h3>
        {/* Subtitle removed — the product tabs immediately below the
            title already communicate "pick a product to see its
            series", and the chart itself shows whether bars are
            daily or hourly. The description was repeating both
            without adding new information. */}
      </div>

      {/* Product tabs — three tabs (Contact Extraction · Enrichment ·
          AI Calling). The active tab is underlined in the product's
          own colour so the chart and the tab share a visual key. The
          per-tab total sits as a quiet caption so the user can size
          up products against each other before switching. */}
      <div
        className="flex items-center gap-0 border-b border-border-subtle mb-4 -mx-5 px-5 overflow-x-auto"
        role="tablist"
        aria-label="Product"
      >
        {visibleWallets.map((w, i) => {
          const active = i === safeActiveIdx;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveIdx(i)}
              className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-[12.5px] transition-colors whitespace-nowrap ${
                active
                  ? "text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: w.chartColor, opacity: active ? 1 : 0.55 }}
              />
              <span>{w.name}</span>
              {active && (
                <span
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                  style={{ background: w.chartColor }}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Hero stat + capability legend. The hero ₹ anchors the chart
          with the headline number; the legend underneath maps each
          stacked colour band to its capability (Phone vs Email,
          Professional vs Financial, etc.) so the user can read the
          stack without guessing. Only renders when the product has
          more than one capability — for single-capability products
          (AI Calling → Talk time only) the legend would be noise. */}
      <div className="mb-4">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] tabular-nums">
          {/* Neutral period phrasing — the actual window (dates,
              named preset, custom range) is already named in the
              page-level filter at the top. Echoing it here as
              "used this month" or "used in last 7 days" tied the
              caption to specific presets and broke for the rest
              (custom ranges, "today and yesterday", lifetime). */}
          {activeWallet.name} · used in this period
        </p>
        <p className="text-[24px] font-semibold text-text-primary leading-none mt-1 tabular-nums">
          {formatNum(Math.round(total))}
          {productUnitLabel && (
            <span className="text-[14px] font-medium text-text-secondary ml-1.5">
              {productUnitLabel}
            </span>
          )}
        </p>
        {activeCaps.length > 1 && (
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-2.5">
            {activeCaps.map((c, capIdx) => {
              const tone     = capLayerColor(activeWallet.chartColor, capIdx);
              const capCount = Math.round(capTotals[capIdx]);
              const capUnit  = `${c.unitLabel}${capCount === 1 ? "" : "s"}`;
              return (
                <span key={c.id} className="inline-flex items-center gap-1.5 text-[11.5px] tabular-nums">
                  <span
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ background: tone.fill }}
                  />
                  <span className="text-text-secondary">{c.label}</span>
                  <span className="text-text-tertiary">
                    {formatNum(capCount)} {capUnit}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart — Y-axis label column on the left + canvas on the right.
          Splitting the layout into two columns means the Y labels
          align exactly with their gridlines and the canvas keeps its
          own coordinate space. */}
      <div className="flex">
        {/* Y-axis labels — right-aligned next to the canvas, one per
            gridline. Hidden from screen readers since they restate
            the chart values which are also in the tooltip. */}
        <div
          className="relative w-12 pr-2 text-right text-[10px] text-text-tertiary tabular-nums shrink-0"
          style={{ height: CHART_H }}
          aria-hidden
        >
          {yTicks.map((t, i) => {
            // Anchor the top tick at 0% offset and the bottom tick at
            // -100% so the labels don't overflow the canvas; middle
            // ticks centre on their gridline.
            const transform =
                i === 0                   ? "translateY(0)"
              : i === yTicks.length - 1   ? "translateY(-100%)"
              :                             "translateY(-50%)";
            return (
              <span
                key={i}
                className="absolute right-2 leading-none"
                style={{ top: `${t.topPct}%`, transform }}
              >
                {formatYTick(t.value)}
              </span>
            );
          })}
        </div>

        {/* Canvas — gridlines layer + SVG path + HTML overlays for
            crosshair, hover dot, and tooltip. Using HTML for the
            crosshair and dot keeps them crisp regardless of how wide
            the chart stretches (the SVG uses
            preserveAspectRatio="none" so its own shapes would
            distort horizontally). */}
        <div className="relative flex-1 min-w-0" style={{ height: CHART_H }}>
          {/* Gridlines at the same heights as the Y-axis tick labels. */}
          {yTicks.map((t, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-dashed border-border-subtle"
              style={{ top: `${t.topPct}%`, opacity: i === 0 || i === yTicks.length - 1 ? 0.7 : 0.4 }}
              aria-hidden
            />
          ))}

          <svg
            viewBox={`0 0 ${viewW} ${CHART_H}`}
            preserveAspectRatio="none"
            className="block w-full h-full"
            onMouseMove={(e) => {
              const rect  = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const xPx   = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, xPx / rect.width));
              const idx   = Math.round(ratio * Math.max(0, series.length - 1));
              setHover(idx);
            }}
            onMouseLeave={() => setHover(null)}
          >
            {/* Stacked layers — bottom-up. Each layer is a filled
                polygon (capability's portion of the stack) plus its
                top edge as a stroke so the layer boundaries are
                visible. Painted from bottom to top so later layers
                visually sit on top of earlier ones. */}
            {layerPaths.map((paths, capIdx) => {
              const tone = capLayerColor(activeWallet.chartColor, capIdx);
              return (
                <g key={activeCaps[capIdx]?.id ?? capIdx}>
                  {paths.polyPath && (
                    <path d={paths.polyPath} fill={tone.fill} />
                  )}
                  {paths.topPath && (
                    <path
                      d={paths.topPath}
                      fill="none"
                      stroke={tone.stroke}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Crosshair — full-height vertical guide rendered as an
              HTML div so it stays exactly 1px wide regardless of
              chart width. */}
          {hover !== null && points[hover] && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${points[hover].x}%`,
                width: 1,
                borderLeft: `1px dashed ${activeWallet.chartColor}`,
                opacity: 0.45,
                transform: "translateX(-0.5px)",
              }}
              aria-hidden
            />
          )}

          {/* Hover dot — also HTML so it stays a perfect circle.
              Earlier this lived inside the SVG as <circle> which got
              stretched into a flat oval because the SVG viewBox
              isn't square-preserving. */}
          {hover !== null && points[hover] && (
            <div
              className="absolute pointer-events-none rounded-full bg-white"
              style={{
                left: `${points[hover].x}%`,
                top:  `${(points[hover].y / CHART_H) * 100}%`,
                width:  10,
                height: 10,
                transform: "translate(-50%, -50%)",
                border: `2px solid ${activeWallet.chartColor}`,
                boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
              }}
              aria-hidden
            />
          )}

          {/* Tooltip — flips to the left of the cursor in the right
              third of the chart so it doesn't clip the edge. Shows
              the bucket label, per-capability breakdown, and a
              total row. For single-capability products the
              breakdown is collapsed because the per-cap row would
              just restate the total. */}
          {hover !== null && days.buckets[hover] && (() => {
            const b       = days.buckets[hover];
            const v       = series[hover] ?? 0;        // total units for this bucket
            const leftPct = series.length > 1 ? (hover / (series.length - 1)) * 100 : 50;
            const align   = hover > series.length * 0.6 ? "right" : "left";
            return (
              <div
                className="absolute pointer-events-none z-10"
                style={{
                  left: `${leftPct}%`,
                  bottom: "100%",
                  transform: align === "left"
                    ? "translate(8px, -8px)"
                    : "translate(calc(-100% - 8px), -8px)",
                }}
              >
                <div className="bg-text-primary text-white rounded-[6px] px-3 py-2 shadow-md whitespace-nowrap min-w-[200px]">
                  <p className="text-[10.5px] font-medium opacity-80 mb-1 tabular-nums">
                    {b.label}
                  </p>
                  {activeCaps.length > 1 ? (
                    <>
                      <div className="space-y-0.5 mb-1.5">
                        {activeCaps.map((c, capIdx) => {
                          const tone     = capLayerColor(activeWallet.chartColor, capIdx);
                          const capV     = Math.round(capSeries[capIdx][hover] ?? 0);
                          const capUnit  = `${c.unitLabel}${capV === 1 ? "" : "s"}`;
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 text-[11.5px] tabular-nums"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-[1px] shrink-0"
                                style={{ background: tone.fill }}
                              />
                              <span className="flex-1 truncate">{c.label}</span>
                              <span className="font-medium">{formatNum(capV)} {capUnit}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-white/15 pt-1 flex items-center justify-between text-[11.5px] tabular-nums">
                        <span className="opacity-70">Total</span>
                        <span className="font-semibold">
                          {formatNum(Math.round(v))} {productUnitLabel}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[13px] font-semibold tabular-nums">
                      {formatNum(Math.round(v))}{productUnitLabel ? ` ${productUnitLabel}` : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* X-axis — denser tick set (9 labels over 30 days vs the old
          5) so the user can read the date at a glance. Indented by
          the Y-axis label column so each tick sits exactly under
          its bucket. */}
      <div className="flex mt-2">
        <div className="w-12 shrink-0" />
        <div className="relative h-4 flex-1 min-w-0">
          {xTicks.map(({ idx, label }) => {
            const pct = days.buckets.length > 1
              ? (idx / (days.buckets.length - 1)) * 100
              : 50;
            const transform =
              idx === 0
                ? "translateX(0)"
                : idx === days.buckets.length - 1
                ? "translateX(-100%)"
                : "translateX(-50%)";
            return (
              <span
                key={idx}
                className="absolute top-0 text-[10.5px] text-text-tertiary tabular-nums whitespace-nowrap"
                style={{ left: `${pct}%`, transform }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BillingModeSwitch — segmented Prepaid / Postpaid toggle that picks
//  the Billing-section variant for the whole page. Sits just under
//  the header on its own row because the choice is structural (it
//  swaps the entire bottom half), not a small chip-style setting.
// ────────────────────────────────────────────────────────────────────
function BillingModeSwitch() {
  const mode    = useBillingModeStore((s) => s.mode);
  const setMode = useBillingModeStore((s) => s.set);
  const order: BillingMode[] = ["prepaid", "postpaid"];
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
        Billing model
      </span>
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {order.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={active}
              className={`h-7 px-3 text-[12px] font-medium rounded-[6px] transition-colors capitalize ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BalanceStateDemoSwitch — lets the user step through the four
//  prepaid balance states (healthy / low / empty / expired) without
//  touching the data layer. Only renders when billing mode is
//  prepaid since balance is meaningless under postpaid. Labelled as
//  a demo control so it's clear this isn't a normal product
//  setting; in a real build the state would come from the wallet
//  service.
// ────────────────────────────────────────────────────────────────────
function BalanceStateDemoSwitch() {
  const balance    = useBillingModeStore((s) => s.balance);
  const setBalance = useBillingModeStore((s) => s.setBalance);
  const opts: { id: WalletBalanceState; label: string }[] = [
    { id: "healthy", label: "Healthy" },
    { id: "low",     label: "Low" },
    { id: "empty",   label: "Empty" },
    { id: "expired", label: "Expired" },
  ];
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
        Demo state
      </span>
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {opts.map((o) => {
          const active = balance === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setBalance(o.id)}
              aria-pressed={active}
              className={`h-7 px-2.5 text-[11.5px] font-medium rounded-[6px] transition-colors ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  PrepaidPlanTypeSwitch — demo control to flip between the two
//  prepaid sub-models. "Subscription" is a fixed monthly fee (e.g.
//  ₹50K/month) that sets the cycle's starting balance; in-cycle
//  top-ups stack on top. "Pure" is just pay-as-you-go top-ups —
//  there's no plan baseline, the balance IS whatever the org has
//  deposited.
// ────────────────────────────────────────────────────────────────────
function PrepaidPlanTypeSwitch() {
  const planType    = useBillingModeStore((s) => s.prepaidPlanType);
  const setPlanType = useBillingModeStore((s) => s.setPrepaidPlanType);
  const opts: { id: typeof planType; label: string }[] = [
    { id: "subscription", label: "Subscription" },
    { id: "pure",         label: "Pay as you go" },
  ];
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
        Plan type
      </span>
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {opts.map((o) => {
          const active = planType === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setPlanType(o.id)}
              aria-pressed={active}
              className={`h-7 px-2.5 text-[11.5px] font-medium rounded-[6px] transition-colors ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  CarryForwardSwitch — demo control to flip the rollover policy on
//  whichever prepaid plan is active. With carry-forward on, the tail
//  of one cycle's balance survives into the next; with it off it's
//  forfeited at cycle close. Used to be gated to Subscription only
//  because Pure top-up was modelled as a non-resetting wallet —
//  with the demo now supporting "Pure top-up with a monthly reset"
//  too, the toggle is live regardless of plan type.
// ────────────────────────────────────────────────────────────────────
function CarryForwardSwitch() {
  const carryForward    = useBillingModeStore((s) => s.carryForward);
  const setCarryForward = useBillingModeStore((s) => s.setCarryForward);
  // Carry-forward is no longer gated on plan type. A pure-prepaid
  // top-up customer can also have a balance that doesn't expire
  // (it just doesn't get a fixed monthly reset like Subscription
  // does), and the team wants to demo both behaviours from the
  // same control. The toggle is now always live.
  const opts: { id: typeof carryForward; label: string }[] = [
    { id: "enabled",  label: "On" },
    { id: "disabled", label: "Off" },
  ];
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
        Carry forward
      </span>
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {opts.map((o) => {
          const active = carryForward === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setCarryForward(o.id)}
              aria-pressed={active}
              className={`h-7 px-2.5 text-[11.5px] font-medium rounded-[6px] transition-colors ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// NOTE: ModuleMixSwitch removed — the workspace's product mix is now
// owned by the sidebar's "Product preview" presets (useProducts).
// Every consumer that used `moduleMix` for filtering now reads
// `products` instead, so there's a single source of truth and the
// demo can't get into a state where the sidebar says "Voice AI only"
// but the wallet still shows enrichment rows.

// ────────────────────────────────────────────────────────────────────
//  PrepaidEmptyHero — takes the place of the normal balance card
//  when the prepaid wallet is empty or expired. Hard-stops the
//  spend story: big red number is the zero balance, secondary copy
//  explains what's happened, primary action is to send a recharge
//  request (same modal that any blocked action would surface).
// ────────────────────────────────────────────────────────────────────
function PrepaidEmptyHero({
  balance,
  onRecharge,
}: {
  balance: WalletBalanceState;
  onRecharge: () => void;
}) {
  const isExpired = balance === "expired";
  return (
    <div className="rounded-card border border-[#F5C7C7] bg-[#FEF7F7] p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[#FDE4E4] flex items-center justify-center shrink-0">
          <AlertTriangle size={18} strokeWidth={1.75} className="text-[#B42318]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-[#B42318] uppercase tracking-[0.4px] mb-1">
            {isExpired ? "Prepaid balance expired" : "Wallet out of balance"}
          </p>
          <p className="text-[26px] font-semibold text-text-primary leading-none tabular-nums">
            ₹0
          </p>
          <p className="text-[12.5px] text-text-secondary mt-2 max-w-[520px] leading-snug">
            {isExpired
              ? "Your prepaid window has lapsed. New product actions are paused until your org renews the balance. Send a recharge request and your account manager will share a fresh invoice."
              : "You've used up everything on this prepaid balance. New product actions — outreach, enrichment, calls — are paused until you top up. Send a recharge request and your account manager will share an invoice."}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={onRecharge}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#B42318] text-white text-[13px] font-medium rounded-button hover:bg-[#9F1F15] transition-colors"
            >
              <Send size={13} strokeWidth={1.8} />
              Send recharge request
            </button>
            <span className="text-[11.5px] text-text-tertiary">
              Account manager: <span className="text-text-secondary font-medium">Priya Nair</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  PrepaidBalanceHero — the headline card on the Utilization page for
//  prepaid orgs that still have balance left. Lifted out of the page
//  JSX so the page can render it conditionally (the order depends on
//  billing mode: balance first for prepaid, hidden entirely for
//  postpaid).
//
//  Anatomy:
//    - top row:    period chip on the left, "N days left · resets …"
//                  on the right so the user knows the window the plan
//                  applies to.
//    - hero grid:  big spend number (range-scoped) and the remaining
//                  balance + reset countdown. The spend number is the
//                  star; remaining sits as the supporting figure on
//                  the right so the user sees "what I used / what's
//                  left" in one glance.
//    - bar:        a single utilization bar at the bottom that fills
//                  in to show how much of the plan has been burned.
// ────────────────────────────────────────────────────────────────────
function PrepaidBalanceHero({
  rangeUtilized,
  range,
  rangeOffset = 0,
  rangeLabel,
  pool,
  period,
  periodLabel,
  billingMonth,
  billingMode,
  enabledModuleIds,
}: {
  rangeUtilized: number;
  range: number;
  /** Days back from today where the window *ends*. Threaded through
   *  to the embedded product-breakdown drilldown so it scopes to the
   *  same calendar slice the hero is summarising. 0 = ends today. */
  rangeOffset?: number;
  /** Optional override for the "Used in …" column header. Set by the
   *  Billing-view's MonthSelector (e.g. "This month", "May 2026") so the
   *  card reads as a calendar month instead of "Used in last N days". */
  rangeLabel?: string;
  pool: { totalCredits: number; remaining: number };
  period: { daysLeft: number; end: Date };
  periodLabel: string;
  /** Selected billing month — drives the invoice/statement download.
   *  Optional because this hero also renders on the Utilization page
   *  (which doesn't have a month picker yet). */
  billingMonth?: BillingMonth;
  /** Mode is fixed to "prepaid" anywhere this hero shows, but we accept
   *  it as a prop so the download helper has it without us hard-coding
   *  the value in two places. */
  billingMode?: BillingMode;
  /** Modules the customer actually has — threaded into the invoice
   *  download so a voice-only customer's PDF doesn't list extraction
   *  or enrichment line items. */
  enabledModuleIds?: readonly string[];
}) {
  // Prepaid plan type drives the layout. "subscription" shows the
  // breakdown of a fixed monthly fee + any in-cycle top-ups; "pure"
  // collapses to a simpler balance + used view since there's no plan
  // baseline to compare against.
  const planType     = useBillingModeStore((s) => s.prepaidPlanType);
  // Carry-forward policy. With "enabled" (default) last cycle's unused
  // tail rolls into this cycle's balance; with "disabled" it's
  // forfeited at cycle close. Only changes anything for Subscription
  // orgs (Pure top-up never resets, so there's nothing to forfeit).
  const carryForward = useBillingModeStore((s) => s.carryForward);

  // Demo numbers. In a real backend these would come from the billing
  // ledger; here we derive them from the static poolSummary so they
  // stay consistent with the rest of the page.
  // - Subscription: planBaseline = the fixed monthly fee (treat the
  //   existing totalCredits as the subscription amount).
  //   topupBalance = additional credits the org added mid-cycle. Sized
  //   as ~20% of the plan so the demo reads as "a meaningful recharge
  //   on top of the plan" rather than rounding error.
  // - Pure: planBaseline = 0; topupBalance = total deposited so far.
  const planBaseline = planType === "subscription" ? pool.totalCredits : 0;
  const topupBalance = planType === "subscription"
    ? Math.round(pool.totalCredits * 0.2)
    : pool.totalCredits;
  // Carried forward — unused balance from the previous cycle. With
  // carry-forward DISABLED that unused tail was forfeited at last
  // cycle's close, so we start this cycle with zero from it. Gated
  // ONLY on the carry-forward flag now — Pure top-up customers can
  // also opt into a monthly reset with rollover, so the flag drives
  // the math regardless of plan type. (Earlier this was gated to
  // Subscription too, which made the toggle look broken in Pure
  // mode — flipping it changed nothing.)
  const carriedForward =
    carryForward === "enabled" ? Math.round(pool.totalCredits * 0.075) : 0;
  const totalAvailable = planBaseline + topupBalance + carriedForward;

  // Used + remaining are computed off the combined available pool so
  // the math ties out: used + remaining = totalAvailable. `used` is
  // clamped at `totalAvailable` because a prepaid wallet physically
  // can't spend more than its cap — once usage events hit the
  // ceiling, new actions block. The displayed total reads as that
  // ceiling, not a hypothetical over-spend.
  const used         = Math.min(rangeUtilized, totalAvailable);
  const remaining    = Math.max(0, totalAvailable - used);
  const usedPct      = totalAvailable > 0
    ? Math.max(0, Math.min(100, (used / totalAvailable) * 100))
    : 0;
  // Bar stays a single neutral tone regardless of % used. We used to
  // escalate to amber at 75% and red at 90% so the colour itself
  // signalled "running low", but the demo has too many ranges +
  // toggles + carry-forward combinations to keep that mapping honest
  // — a 91% bar reading red while everything else is fine made the
  // page feel alarmed when it wasn't. The number (91%) and the
  // remaining/runway copy carry the urgency; the bar stays neutral.
  const barTone = "rgba(15, 23, 42, 0.85)";

  // Cycle metadata for the download — lets us decide whether to label
  // the PDF as a settled statement (past cycle) or "to date" (current
  // cycle). BillingMonth.offsetFromEnd is 0 for the active cycle and
  // positive once the cycle has closed, so it's the direct signal —
  // and it stays correct for non-calendar-aligned cycles (13-to-13,
  // etc.) where the old "last day of month" check would mis-label.
  const monthInfo = (() => {
    if (!billingMonth) return null;
    const [yearStr, mStr] = billingMonth.id.split("-");
    const year   = parseInt(yearStr, 10);
    const month  = parseInt(mStr, 10) - 1;
    // Reconstruct the actual cycle end (cycleStartDay-1 of next month)
    // so callers that need it for date formatting still have it.
    const cycleEnd = new Date(year, month + 1, CYCLE_START_DAY);
    cycleEnd.setDate(cycleEnd.getDate() - 1);
    // Settlement falls a few days after the cycle ends — invoices are
    // issued at cycle close, then paid within the org's settlement
    // window. A deterministic 7-day offset matches a typical net-7
    // term and reads as the actual "paid on" date.
    const paidOn = new Date(cycleEnd);
    paidOn.setDate(paidOn.getDate() + 7);
    return {
      year, month, end: cycleEnd, paidOn,
      isPast: billingMonth.offsetFromEnd > 0,
    };
  })();

  // Download a real PDF for whichever month the user picked. Subscription
  // orgs get a tax invoice with the plan baseline as a fixed-cost line +
  // usage line items; pure top-up orgs get an account statement (usage
  // only). Works for any month — current, last, anything from the
  // Custom picker — so the user can grab a copy whenever they need one.
  const downloadInvoice = () => {
    if (!billingMonth || !monthInfo || !billingMode) return;
    const { blob, filename } = buildInvoiceForMonth({
      month:        billingMonth,
      mode:         billingMode,
      planType,
      isPast:       monthInfo.isPast,
      planBaseline: pool.totalCredits,
      carryForward,
      enabledModuleIds,
    });
    downloadBlob(blob, filename);
  };

  // Button label is just "Invoice" now — the verb-noun "Download
  // invoice" felt redundant when the action chrome (arrow icon,
  // clickable button) already says "download". The PDF is still
  // a statement under the hood for pure top-up cycles, but the
  // user-facing label stays single-word for both modes.

  return (
    <div className="bg-white border border-border rounded-card p-5">
      {/* Top row — days-left + (for past cycles) the closed badge +
          per-month download. The left "Current cycle [dates]" label
          used to live here too, but the page-level BillingModelStrip
          above the hero now carries that meta, so showing it again
          here was a duplicate. Past cycles still need to surface
          their own label (the strip always shows the active cycle),
          so the left side renders for those. */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        {monthInfo?.isPast ? (
          <div className="flex items-center gap-2">
            <Calendar size={13} strokeWidth={1.6} className="text-text-tertiary" />
            <span className="text-[12px] font-medium text-text-secondary">
              {appendCycleSuffix(billingMonth?.label)}
            </span>
            <span className="text-[12px] text-text-primary font-medium">{periodLabel}</span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {!monthInfo?.isPast && (
            <span className="text-[11px] font-medium text-text-tertiary">
              <span className="text-text-secondary">{period.daysLeft}</span> days left · {planType === "subscription" ? "renews" : "resets"} {period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {monthInfo?.isPast && (
            <span className="text-[11px] font-medium text-text-secondary inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
              Closed cycle
              {/* Paid-on lands after the cycle ends — the invoice is
                  issued at close and settles within the org's payment
                  window, so this date sits later than the period the
                  PDF covers. */}
              <span className="text-text-tertiary">
                · Paid on {monthInfo.paidOn.toLocaleString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </span>
          )}
          {/* Download only on closed cycles. The current cycle is still
              accruing — a PDF generated mid-month would go stale within
              hours, and the user can't pay from it anyway. Past months
              are settled and worth keeping. */}
          {billingMonth && billingMode && monthInfo?.isPast && (
            <button
              type="button"
              onClick={downloadInvoice}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11.5px] font-medium text-text-primary border border-border rounded-button bg-white hover:border-border-strong hover:bg-surface-secondary transition-colors duration-150"
            >
              <ArrowDown size={11.5} strokeWidth={1.75} />
              Invoice
            </button>
          )}
        </div>
      </div>

      {/* Past month — render a stripped-down "this is what was
          charged" card. The customer can't change a closed cycle, so
          a Remaining number, a progress bar against a current
          balance, and an inflow breakdown are all dead weight: the
          only useful information is the bill itself plus how to
          archive it (the Download button up top). For a subscription
          customer the bill is the fixed monthly plan; for pure
          top-up it's the sum of drawdowns. */}
      {monthInfo?.isPast && (() => {
        const isSubscription = planType === "subscription";
        const billed = isSubscription ? planBaseline : used;
        const monthLabel = billingMonth?.label ?? "this cycle";
        const invoiceId = monthInfo
          ? `INV-${monthInfo.year}-${String(monthInfo.month + 1).padStart(2, "0")}`
          : "";
        const settledOn = monthInfo
          ? monthInfo.end.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
          : "";
        return (
          <div className="mb-4">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
              {isSubscription ? "Charged in" : "Drawn in"} {monthLabel}
            </p>
            <p
              className="text-[36px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatAmount(billed, "INR")}
            </p>
            <p className="text-[11.5px] text-text-tertiary mt-1.5">
              {isSubscription
                ? <>Tax invoice <span className="font-mono tabular-nums">{invoiceId}</span> · settled {settledOn}.</>
                : <>Statement <span className="font-mono tabular-nums">{invoiceId}</span> · drawn from your prepaid balance.</>}
            </p>
          </div>
        );
      })()}

      {/* Current cycle — answer-first hero with Used as the headline
          and Remaining on the right. Hidden on past months because
          there's no live runway to surface. Same shape for both
          plan types; only the subtitle copy and breakdown disclosure
          below adjust. */}
      {!monthInfo?.isPast && (
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5 items-end mb-4">
        <div>
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            {rangeLabel ? `Used in ${rangeLabel.toLowerCase()}` : `Used in last ${range} days`}
          </p>
          <p
            className="text-[36px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatAmount(used, "INR")}
          </p>
          <p className="text-[11.5px] text-text-tertiary mt-1.5 tabular-nums">
            {usedPct.toFixed(1)}% of your {formatAmountShort(totalAvailable, "INR")} {planType === "subscription" ? "available balance" : "top-up balance"}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            Remaining
          </p>
          <p className="text-[20px] font-semibold text-text-primary tabular-nums">
            {formatAmount(remaining, "INR")}
          </p>
          {/* The hint under Remaining only reads when there's
              something honest to say: pure prepaid → "top up to
              extend runway"; subscription + carry-forward on →
              "rolls into next cycle if unused". When carry-forward
              is OFF we deliberately render nothing rather than name
              the policy ("forfeits at cycle end") — surfacing the
              alternative would imply a toggle that isn't part of
              this product surface. */}
          {(planType !== "subscription" || carryForward === "enabled") && (
            <p className="text-[11px] text-text-tertiary mt-1">
              {planType !== "subscription"
                ? "top up to extend runway"
                : "rolls into next cycle if unused"}
            </p>
          )}
        </div>
        </div>
      )}

      {/* Progress bar + math footer + breakdown — only relevant on
          the current cycle. A past cycle has no "runway", and the
          inflow breakdown ("plan + carry-forward + top-ups = balance")
          describes a balance that's already been depleted by the time
          you're looking at past data, so showing it on a past month
          confuses more than it clarifies. */}
      {!monthInfo?.isPast && (
      <div className="h-2.5 rounded-full bg-surface-secondary overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${usedPct.toFixed(2)}%`, background: barTone }}
        />
      </div>
      )}

      {!monthInfo?.isPast && (
      <div className="flex items-center justify-between mt-2 text-[10.5px] text-text-tertiary tabular-nums">
        <span>
          <span className="text-text-secondary font-medium">{formatAmount(used, "INR")}</span> used
          {" "}of{" "}
          <span className="text-text-secondary font-medium">{formatAmount(totalAvailable, "INR")}</span> available
        </span>
        <span>
          {usedPct.toFixed(0)}%
        </span>
      </div>
      )}

      {/* Inflow breakdown — Carried forward (live amount) + Top-ups
          this cycle + Total available. The Monthly plan column used
          to live here too, but the BillingModelStrip above the hero
          already names the plan amount, so showing it again was a
          duplicate. The column count is now the same for subscription
          and pure prepaid (the difference between them was the plan
          column). */}
      {!monthInfo?.isPast && (
        <div
          className={`mt-4 pt-4 border-t border-border-subtle grid gap-x-4 gap-y-3 ${
            carryForward === "enabled"
              ? "grid-cols-1 md:grid-cols-3"
              : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          {/* Carried-forward column only renders when the policy is on
              — when disabled, the user explicitly asked for it to drop
              out of the breakdown entirely (no "Off" placeholder). The
              policy detail still lives on the demo controls toggle and
              the downloaded invoice's reconciliation block. */}
          {carryForward === "enabled" && (
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-0.5 group/cf relative">
                Carried forward
                <Info size={10} strokeWidth={1.75} className="text-text-tertiary/70 cursor-help" />
                <div className="absolute left-0 top-full mt-1.5 w-[260px] bg-[#1a1a1a] text-white text-[11.5px] leading-relaxed px-3 py-2.5 rounded-card shadow-xl opacity-0 invisible group-hover/cf:opacity-100 group-hover/cf:visible transition-opacity duration-150 z-30 pointer-events-none normal-case">
                  <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">
                    Rollover policy
                  </div>
                  Unused balance from last cycle — including the unspent
                  portion of your plan and any top-ups you didn&apos;t use —
                  rolls over to this cycle. Your monthly plan amount still
                  resets fresh; only the tail carries over.
                  <div className="absolute -top-1.5 left-3 w-3 h-3 bg-[#1a1a1a] rotate-45" />
                </div>
              </div>
              <p className="text-[14px] font-semibold text-text-primary tabular-nums leading-tight">
                {carriedForward > 0 ? `+ ${formatAmount(carriedForward, "INR")}` : formatAmount(0, "INR")}
              </p>
              <p className="text-[10.5px] text-text-tertiary mt-0.5">unused from last cycle</p>
            </div>
          )}
          <BreakdownCell
            label="Top-ups this cycle"
            hint="added via recharge"
            value={topupBalance > 0 ? `+ ${formatAmount(topupBalance, "INR")}` : formatAmount(0, "INR")}
          />
          <BreakdownCell
            label="Total available"
            hint="across this cycle"
            value={formatAmount(totalAvailable, "INR")}
            emphasis
          />
        </div>
      )}

      {/* Per-product breakdown disclosure removed — the billing card
          should stay focused on the cycle totals, not double as a
          per-product audit. Users who want that drill-down get it
          from the Usage tab. */}
    </div>
  );
}

// ── BreakdownCell ──────────────────────────────────────────────────
// Single column in the prepaid-hero inflow breakdown strip. Pulled
// out so the three "flat" cells share one definition; the rollover
// cell is bespoke because it can render an "Off" pill instead of an
// amount.
function BreakdownCell({
  label, hint, value, emphasis,
}: {
  label:    string;
  hint:     string;
  value:    string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-0.5">
        {label}
      </p>
      <p
        className={`tabular-nums leading-tight ${
          emphasis
            ? "text-[14px] font-semibold text-text-primary"
            : "text-[14px] font-semibold text-text-primary"
        }`}
      >
        {value}
      </p>
      <p className="text-[10.5px] text-text-tertiary mt-0.5">{hint}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BillingPrimaryCta — the right-hand action button beside the date
//  filter. Label + behaviour shifts with the billing mode:
//    Prepaid  → "+ Add money" (opens the top-up estimator)
//    Postpaid → "View invoices" (postpaid customers don't top up)
// ────────────────────────────────────────────────────────────────────
function BillingPrimaryCta({ onAddMoney }: { onAddMoney: () => void }) {
  const mode = useBillingModeStore((s) => s.mode);
  if (mode === "prepaid") {
    return (
      <button
        type="button"
        onClick={onAddMoney}
        className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
      >
        <Plus size={13} strokeWidth={1.8} />
        Add money
      </button>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 h-9 px-4 border border-border text-text-primary bg-white text-[13px] font-medium rounded-button hover:bg-surface-page transition-colors"
    >
      <Receipt size={13} strokeWidth={1.6} />
      View invoices
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────
//  BillingSpendHero — universal spend hero on the Billing page,
//  works the same for both prepaid and postpaid. Billing is a pure
//  spend story — "how much have I spent over this range?" — so the
//  hero is mostly identical between modes, with just the framing
//  copy underneath shifting:
//
//    Prepaid  → "Drawn from your prepaid balance"
//    Postpaid → "Will be invoiced when the cycle closes (DD MMM)"
//
//  Postpaid also gets a side-by-side spend-cap meter so finance can
//  see how close they are to the hard ceiling. Prepaid skips that
//  because the actual ceiling is the prepaid balance, and that's
//  surfaced on the Utilization page.
// ────────────────────────────────────────────────────────────────────
function BillingSpendHero({
  rangeUtilized,
  range,
  rangeOffset = 0,
  rangeLabel,
  billingMode,
  period,
  periodLabel,
  billingMonth,
  enabledModuleIds,
}: {
  rangeUtilized: number;
  range: number;
  /** Days back from today where the window *ends*. Threaded through
   *  to the embedded product-breakdown drilldown so it scopes to the
   *  same calendar slice the hero is summarising. 0 = ends today. */
  rangeOffset?: number;
  /** Optional override for "Spent in last X days". Set by the Billing-view
   *  MonthSelector — e.g. "This month", "May 2026" — so the postpaid hero
   *  reads as a calendar month, not a sliding window. */
  rangeLabel?: string;
  billingMode: BillingMode;
  period: { daysLeft: number; end: Date };
  periodLabel: string;
  /** Selected billing month (postpaid only). Drives the cycle dates and
   *  whether the bill is shown as "estimated" (current month) or
   *  "settled invoice" (any past month). */
  billingMonth?: BillingMonth;
  /** Modules the customer has — threads into the invoice download so
   *  the PDF mirrors the customer's actual module set. */
  enabledModuleIds?: readonly string[];
}) {
  // Read the prepaid plan type from the store — drives whether the
  // downloaded invoice carries a fixed-cost line item (Subscription) or
  // is a pure statement of usage (Top-up). Ignored on postpaid.
  const prepaidPlanType    = useBillingModeStore((s) => s.prepaidPlanType);
  // Carry-forward policy threads into the invoice's Plan reconciliation
  // block so the downloaded PDF reflects the rollover state the user
  // can see on screen. Ignored on postpaid and on pure top-up where
  // there's no cycle to forfeit.
  const prepaidCarryForward = useBillingModeStore((s) => s.carryForward);

  // Derive the cycle the user picked from billingMonth (e.g. "2026-05"
  // → 1 May – 31 May). This was previously postpaid-only because only
  // postpaid past months had a download CTA. Now it runs for every
  // mode + month — prepaid statements and current-cycle bills are both
  // downloadable, so the cycle metadata has to be available either way.
  const monthInfo = (() => {
    if (!billingMonth) return null;
    const [yearStr, mStr] = billingMonth.id.split("-");
    const year   = parseInt(yearStr, 10);
    const month  = parseInt(mStr, 10) - 1;
    const start  = new Date(year, month, 1);
    const end    = new Date(year, month + 1, 0);
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = end.getTime() < new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const fmtShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return {
      start, end, isPast, year, month,
      cycleLabel:  `${fmtShort(start)} – ${fmtShort(end)}`,
      invoiceId:   `INV-${year}-${String(month + 1).padStart(2, "0")}`,
      settledOn:   fmt(end),
      daysLeft:    Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))),
    };
  })();

  // Pool drives the subscription plan baseline that ends up as the
  // "fixed charges" line item on the PDF for prepaid Subscription orgs.
  // Reads the same number the on-screen Utilization hero shows for
  // Monthly plan, so the downloaded invoice can't disagree with the UI.
  const planBaseline = poolSummary().totalCredits;

  // Download an invoice / statement / estimated-bill PDF for the selected
  // month. The doc kind, line items, and totals all derive from the
  // (mode, planType, isPast) combination — see buildInvoiceForMonth for
  // the full content shape. Works on every month and mode now (previously
  // only postpaid past months had this).
  const downloadInvoice = () => {
    if (!monthInfo || !billingMonth) return;
    const { blob, filename } = buildInvoiceForMonth({
      month:        billingMonth,
      mode:         billingMode,
      planType:     prepaidPlanType,
      isPast:       monthInfo.isPast,
      planBaseline,
      carryForward: prepaidCarryForward,
      enabledModuleIds,
    });
    downloadBlob(blob, filename);
  };

  // Button label — only rendered for past months (the current cycle
  // is still accruing and has no settled bill to issue against), so
  // we don't need an "estimate" / "to-date statement" branch here.
  // "Invoice" alone (no "Download") — the arrow icon already implies
  // the action.
  const downloadButtonLabel = "Invoice";

  // Top-row labels — works for every (mode, isPast) combination now that
  // monthInfo is always computed.
  const topLeftLabel =
      !monthInfo                       ? "Spend window"
    : monthInfo.isPast                 ? appendCycleSuffix(billingMonth?.label)
    :                                    "Current cycle";

  const topLeftPeriod = monthInfo ? monthInfo.cycleLabel : periodLabel;

  const topRightMeta = (() => {
    if (!monthInfo) return null;
    if (monthInfo.isPast) {
      // Past months on either mode read as closed — green "Settled" for
      // postpaid (where a bill was actually issued), neutral "Closed"
      // for prepaid (where the cycle ended but there's no bill to settle
      // — the wallet just drew down).
      const label = billingMode === "postpaid" ? "Settled" : "Closed";
      const tone  = billingMode === "postpaid"
        ? "text-[#15803D]"
        : "text-text-secondary";
      const dot   = billingMode === "postpaid" ? "bg-[#22C55E]" : "bg-text-tertiary";
      return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${tone}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {label} on {monthInfo.settledOn}
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium text-text-tertiary">
        <span className="text-text-secondary">{period.daysLeft}</span> days left · cycle closes{" "}
        {period.end.toLocaleString("en-IN", { day: "numeric", month: "short" })}
      </span>
    );
  })();

  // Hero label — answers "what number am I looking at?" The shape shifts
  // with mode + past/current so the headline reads as the right kind of
  // total. For an in-progress postpaid cycle we say "Bill till now" —
  // it's the live running total against the open invoice window, not
  // a projection, so framing it as an "estimate" was misleading.
  const heroLabel = (() => {
    if (billingMode === "postpaid") {
      return monthInfo?.isPast
        ? `Invoice — ${billingMonth?.label}`
        : "Bill till now";
    }
    // Prepaid (subscription or top-up) — past months read as the cycle's
    // total draw, current month as the draw to date.
    if (monthInfo?.isPast) return `Drawn in ${billingMonth?.label}`;
    return rangeLabel ? `Drawn in ${rangeLabel.toLowerCase()}` : `Drawn in last ${range} days`;
  })();

  const heroSubtitle = (() => {
    if (billingMode === "postpaid") {
      // Past cycle = an invoice that's already been settled.
      // Current cycle = a live running total. We deliberately don't
      // repeat the cycle-closes date or days-left here — the top-row
      // chip already carries that and the only thing left to say is
      // that the number is the live draw to date.
      return monthInfo?.isPast
        ? <>Invoice <span className="font-mono tabular-nums">{monthInfo.invoiceId}</span> · settled {monthInfo.settledOn}. Download to keep a copy.</>
        : <>Live draw against your open invoice. You&apos;ll be charged exactly this.</>;
    }
    // Prepaid framing — the fixed cost (if any) lives separately on the
    // Utilization page; here we're just narrating the draw.
    if (monthInfo?.isPast) {
      return prepaidPlanType === "subscription"
        ? <>Drawn from your monthly plan. Statement <span className="font-mono tabular-nums">{monthInfo.invoiceId}</span>. Download for your records.</>
        : <>Drawn from your prepaid balance. Statement <span className="font-mono tabular-nums">{monthInfo.invoiceId}</span>. Download for your records.</>;
    }
    return "Drawn from your prepaid balance over this window.";
  })();

  return (
    <div className="bg-white border border-border rounded-card p-5">
      {/* Top row — cycle label + supporting meta. Past months read as
          "settled" / "closed"; the current cycle reads as days remaining. */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar size={13} strokeWidth={1.6} className="text-text-tertiary" />
          <span className="text-[12px] font-medium text-text-secondary">{topLeftLabel}</span>
          <span className="text-[12px] text-text-primary font-medium">{topLeftPeriod}</span>
        </div>
        {topRightMeta}
      </div>

      {/* Hero number — the actual headline figure for this month + mode. */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
            {heroLabel}
          </p>
          <p
            className="text-[36px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatAmount(rangeUtilized, "INR")}
          </p>
          <p className="text-[11.5px] text-text-tertiary mt-1.5">{heroSubtitle}</p>
        </div>

        {/* Download — only on closed cycles. The current cycle is
            still accruing usage, so an in-cycle PDF would be stale by
            the next call and there's no settled bill to issue against
            it. Past months read as a real invoice / statement worth
            archiving. The PDF content still adapts: subscription orgs
            get a fixed-cost line plus usage; pure-prepaid and postpaid
            get usage only. */}
        {monthInfo?.isPast && (
          <button
            type="button"
            onClick={downloadInvoice}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[12.5px] font-medium text-text-primary border border-border rounded-button bg-white hover:border-border-strong hover:bg-surface-secondary transition-colors duration-150 shrink-0"
          >
            <ArrowDown size={13} strokeWidth={1.75} />
            {downloadButtonLabel}
          </button>
        )}
      </div>

      {/* Per-product breakdown disclosure removed — keep the postpaid
          hero focused on the cycle bill. Per-product detail lives on
          the Usage tab. */}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  PostpaidUtilizationEmpty — what the Utilization page shows for
//  postpaid orgs. Utilization is "how much of my prepaid balance
//  have I consumed?" — postpaid orgs don't have a prepaid balance,
//  so there's nothing to utilize. Point them at Billing where their
//  spend lives.
// ────────────────────────────────────────────────────────────────────
function PostpaidUtilizationEmpty() {
  const router = useRouter();
  return (
    <div className="bg-white border border-border rounded-card p-8 text-center max-w-[560px] mx-auto">
      <div className="w-12 h-12 mx-auto rounded-full bg-surface-secondary flex items-center justify-center mb-3">
        <BarChart3 size={20} strokeWidth={1.5} className="text-text-tertiary" />
      </div>
      <h3 className="text-[14px] font-semibold text-text-primary">
        Usage isn&apos;t applicable for postpaid
      </h3>
      <p className="text-[12.5px] text-text-secondary mt-1.5 max-w-[420px] mx-auto leading-snug">
        Usage tracks how much of a prepaid balance you&apos;ve consumed.
        Your workspace is on postpaid — you&apos;re invoiced at the end of the
        cycle for exactly what you use, with no balance to draw down.
      </p>
      <button
        type="button"
        onClick={() => router.push("/settings/billing")}
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors"
      >
        <Receipt size={13} strokeWidth={1.8} />
        Go to Billing
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
//  UtilizationByProductTable — same flat-tree chrome as the Billing
//  Products table, but the cells show *units* (phones extracted,
//  enrichments run, minutes talked) instead of money. Reuses the
//  same Product → Capability hierarchy so the two surfaces feel
//  like the same product viewed through two different lenses
//  (units vs money).
//
//  Daily limits live as a small chip under the product name (same
//  treatment as the Billing table).
// ────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────
//  UsageHero — top-of-page total summary for the Usage tab. Mirrors
//  the answer-first shape of the Billing hero but stripped to just
//  the consumption story across ALL enabled products in the selected
//  window. Headline = sum of usage across modules in the period.
//  Remaining renders on the right only when the window is rolling
//  (today / this week / this month / last N / lifetime). Past
//  closed presets (yesterday / last week / last month) drop the
//  Remaining column because there's no live runway against them —
//  the cycle in question is already done.
// ────────────────────────────────────────────────────────────────────
function UsageHero({
  rangeUtilized,
  isPast,
  productCount,
}: {
  rangeUtilized: number;
  /** True when the selected window is a closed past period
   *  (yesterday / last week / last month). The phrasing changes
   *  meaningfully: ongoing windows read as a *running tally*
   *  ("used till now"), while past windows are a *settled total*
   *  ("usage in this period") — calling a closed total "till now"
   *  was misleading. */
  isPast: boolean;
  /** Number of products the customer has enabled. Used in the
   *  past-period body line so the figure is unambiguous about
   *  what it was summed across. */
  productCount: number;
}) {
  // "Used till now" only makes sense while the window is still
  // accumulating. For a closed past period, the label flips to a
  // settled-total framing so the reader doesn't mistake the figure
  // for a running total. The body line for past also names the
  // exact product count so the number reads as a complete answer.
  const labelPhrase = isPast ? "USAGE IN THIS PERIOD" : "USED TILL NOW";
  const productSuffix = productCount === 1 ? "product" : "products";
  const bodyCopy = isPast
    ? `Across ${productCount} ${productSuffix}.`
    : "Across all your products.";
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
        {labelPhrase}
      </p>
      <p
        className="text-[36px] font-semibold text-text-primary leading-none tracking-[-0.01em] tabular-nums"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatAmount(rangeUtilized, "INR")}
      </p>
      <p className="text-[11.5px] text-text-tertiary mt-1.5">
        {bodyCopy}
      </p>
    </div>
  );
}

function UtilizationByProductTable({
  rangeDays,
  enabledModuleIds,
}: {
  rangeDays: number;
  enabledModuleIds: readonly string[];
}) {
  // Per-product derived rows. We scale each capability's units by
  // the ratio of range-spend to period-spend so the displayed unit
  // count maps to the selected date range. Filtered to the modules
  // this customer actually has — a voice-only org doesn't need to
  // see extraction rows at zero.
  const rows = useMemo(() => {
    return WALLETS
      .filter((w) => enabledModuleIds.includes(w.id))
      .map((w) => {
        const series = sliceDailyToRange(w.daily, rangeDays);
        const used   = series.reduce((s, d) => s + d.amount, 0);
        const ratio  = w.utilized > 0 ? used / w.utilized : 0;
        const caps   = w.capabilities.filter((c) => !c.included);
        return { module: w, ratio, caps };
      });
  }, [rangeDays, enabledModuleIds]);

  // Three columns: module/cap name · units · cost. Earlier versions
  // had a Rate column and a Share column too, but both cluttered the
  // table — Rate is a price-list lookup, and Share added a percentage
  // whose denominator (per-product cap units) wasn't comparable
  // across products. Units + Cost is the honest answer.
  const gridCols = "grid-cols-[minmax(0,1fr)_140px_120px]";

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Section title row dropped entirely — the page is already
          titled "Usage" and the column headers below carry the
          structure. The "Successful actions only" scope note moves
          to a footnote (*) anchored on the Units column header, then
          a quiet legend line at the bottom of the card. */}

      {/* Column headers — bold to anchor the table. Units carries an
          asterisk that ties to the footnote below; we deliberately
          park the marker on Units rather than Amount because the
          caveat is about what gets COUNTED (only successful actions),
          not about pricing. */}
      <div className={`grid ${gridCols} gap-3 px-5 py-2.5 border-b border-border-subtle text-[10px] font-semibold text-text-primary uppercase tracking-[0.4px]`}>
        <span>Modules</span>
        <span className="text-right">Units<sup className="text-text-tertiary font-normal ml-0.5">*</sup></span>
        <span className="text-right">Cost</span>
      </div>

      {/* Rows */}
      <div>
        {rows.map(({ module: m, ratio, caps }, productIdx) => {
          const ModIcon = m.icon;
          return (
            <div
              key={m.id}
              className={productIdx > 0 ? "border-t border-border-subtle" : ""}
            >
              {/* Product header row */}
              <div className={`grid ${gridCols} gap-3 px-5 py-3 items-center bg-surface-page/40`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: m.chartColor }}
                  />
                  <div
                    className="w-7 h-7 rounded-input flex items-center justify-center shrink-0"
                    style={{ background: m.gradient }}
                  >
                    <ModIcon size={13} strokeWidth={1.6} style={{ color: m.text }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">
                      {m.name}
                    </p>
                    {/* Daily-limit chip used to live here as a sub-line
                        on the product row. It's a per-module operational
                        concern, not a usage / billing breakdown signal,
                        so it now lives on the module's own page header
                        (e.g. /enrichment) where it belongs. */}
                  </div>
                </div>
                <div /> {/* Units col is blank on the product header */}
                <div /> {/* Cost col is blank on the product header */}
              </div>

              {/* Capability sub-rows — units + cost side by side. */}
              {caps.map((c) => {
                const capUnits = Math.round(c.unitCount * ratio);
                // Drop the unit suffix on Enrichment (the label
                // "Professional enrichment" already says everything;
                // appending "enrichments" would be redundant). Keep
                // it for phones/emails/mins where the unit gives the
                // count meaning.
                const showUnitSuffix = c.unitLabel !== "enrichment";
                return (
                  <div
                    key={c.id}
                    className={`grid ${gridCols} gap-3 px-5 py-2.5 items-center border-t border-border-subtle`}
                  >
                    <div className="flex items-center gap-3 pl-7 min-w-0">
                      {/* Vertical guide line — a quiet tree-view tick
                          that signals parent/child without the visual
                          drama of an arrow glyph. */}
                      <span className="w-px h-3.5 bg-border shrink-0" aria-hidden />
                      <span className="text-[12.5px] text-text-secondary truncate">
                        {c.label}
                      </span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-[13.5px] font-medium text-text-primary">{formatNum(capUnits)}</span>
                      {showUnitSuffix && (
                        <span className="text-[11px] text-text-tertiary ml-1.5">
                          {c.unitLabel}{capUnits === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="text-right tabular-nums text-[13px] text-text-primary">
                      {/* Cost = units × rate. Surfaced here so Usage
                          tells the cost story too, not just consumption.
                          Falls back to "—" when the capability has no
                          rate (e.g. included throttles). */}
                      {c.rate > 0 ? formatAmount(Math.round(capUnits * c.rate), "INR") : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footnote — ties the Units column asterisk to the meaning.
          Sits on the same surface tint as the product header rows so
          it reads as part of the table chrome, not a separate widget. */}
      <div className="px-5 py-2.5 border-t border-border-subtle bg-surface-page/40 text-[10.5px] text-text-tertiary">
        <span className="font-semibold">*</span> Only successful actions are charged.
      </div>
    </div>
  );
}

// `hideRate` lets the page render the "1 credit = X" caption on its
// own line below the title (cleaner header row), while keeping the
// rate inline in places where space allows.
const CurrencySwitcher = ({ hideRate = false }: { hideRate?: boolean }) => {
  const currency        = useCurrencyStore((s) => s.currency);
  const setCurrency     = useCurrencyStore((s) => s.set);
  const hydrate         = useCurrencyStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);

  const order: Currency[] = ["INR", "USD"];

  return (
    <div className="inline-flex items-center gap-2">
      <div className="inline-flex items-center bg-surface-secondary rounded-input p-0.5">
        {order.map((cur) => {
          const c = CURRENCIES[cur];
          const active = currency === cur;
          return (
            <button
              key={cur}
              type="button"
              onClick={() => setCurrency(cur)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1 h-7 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                active
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span className="tabular-nums">{c.symbol}</span>
              {c.code}
            </button>
          );
        })}
      </div>
      {!hideRate && (
        // Rate caption used to read "1 credit = ₹1 INR" — the credits
        // model is gone, so there's nothing to print here. Kept as a
        // null branch to preserve the prop API without re-flowing
        // existing call sites.
        null
      )}
    </div>
  );
};

// Sub-line caption under the page title. Used to show the credits-
// to-currency conversion rate. Now that credits are gone and the
// page is pure INR, there is nothing to caption — this resolves to
// empty content so the page header keeps the same spacing without
// printing a stale rate line.
const CurrencyRateCaption = () => null;

// "pct" sort key removed alongside the % of plan / vs cap column —
// nothing left on the table sorts by it.
type SortKey = "used" | "name";

/**
 * Clickable column header. Active column gets a small ↓ arrow + the
 * primary text colour so the user can see at a glance which column
 * drives the row order. Right-alignment is supported for numeric
 * columns where the label should hug the data underneath.
 */
type SortHeaderProps = {
  label: string;
  colKey: SortKey;
  activeKey: SortKey;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
};

const SortHeader = ({
  label,
  colKey,
  activeKey,
  onSort,
  align = "left",
}: SortHeaderProps) => {
  const active = activeKey === colKey;
  return (
    <button
      type="button"
      onClick={() => onSort(colKey)}
      className={`inline-flex items-center gap-1 select-none transition-colors ${
        active ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
      } ${align === "right" ? "justify-end ml-auto" : "justify-start"}`}
    >
      <span className="uppercase tracking-[0.4px]">{label}</span>
      <ArrowDown
        size={10}
        strokeWidth={2}
        className={`transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
        aria-hidden
      />
    </button>
  );
};

// ────────────────────────────────────────────────────────────────────
//  HeroProductBreakdown — quiet "View product breakdown" disclosure
//  rendered INSIDE a hero card (PrepaidBalanceHero / BillingSpendHero).
//  Used to live as a separate sibling widget below the hero, but the
//  designer wanted it attached to the hero itself so the user reads
//  the answer (final amount) and the drill-down ("where did this
//  come from?") as one continuous story instead of two cards.
//
//  Renders no outer card chrome — the chrome is supplied by whatever
//  wraps it. We add a `-mx-5` to push the chevron bar full-bleed
//  against the hero card edges and a `border-t` to separate it from
//  the hero content above. The expanded body reuses ModulesTable so
//  there's only one truth for the per-product split.
// ────────────────────────────────────────────────────────────────────
function HeroProductBreakdown({
  rangeDays,
  rangeOffset,
  totalPool,
  billingMode,
  billingMonth,
  enabledModuleIds,
}: {
  rangeDays: number;
  rangeOffset: number;
  totalPool: number;
  billingMode: BillingMode;
  billingMonth?: BillingMonth;
  enabledModuleIds: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  // Period label — varies with whether the hero is showing the
  // current cycle ("this month's bill") or a past one ("May 2026's
  // bill"). Keeps the disclosure copy honest about what window the
  // breakdown will summarise.
  const periodCopy = billingMonth?.label
    ? `${billingMonth.label.toLowerCase()}'s bill`
    : "this cycle's bill";
  return (
    <div className="mt-4 -mx-5 -mb-5 border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-page/60 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-text-primary">
            View product breakdown
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            See what each product contributed to {periodCopy}.
          </p>
        </div>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`text-text-tertiary shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border-subtle p-4 bg-surface-page/40 rounded-b-card">
          <ModulesTable
            rangeDays={rangeDays}
            rangeOffset={rangeOffset}
            totalPool={totalPool}
            currency="INR"
            billingMode={billingMode}
            enabledModuleIds={enabledModuleIds}
          />
        </div>
      )}
    </div>
  );
}

function ModulesTable({
  rangeDays,
  rangeOffset = 0,
  totalPool: _totalPool,
  currency,
  billingMode: _billingMode = "prepaid",
  enabledModuleIds,
}: {
  rangeDays: number;
  /** Days back from today where the window *ends*. 0 = window ends today
   *  (last N days). Non-zero slides the window back — set by the billing
   *  Months selector when the user picks a past month. */
  rangeOffset?: number;
  // Kept on the API for callers; unused inside the table now that the
  // "% of plan" / "vs cap" column has been dropped. Renamed to
  // _totalPool to silence the unused-arg lint.
  totalPool: number;
  currency: Currency;
  // Kept on the API for callers that already pass it; no longer
  // changes the table after the "% of plan" / "vs cap" column was
  // dropped. Renamed to _billingMode to silence the unused-arg lint.
  billingMode?: BillingMode;
  /** Modules the customer has — rows for any module outside this set
   *  are dropped so a voice-only org doesn't see extraction/enrichment
   *  zero rows. Omit to render all modules (default behaviour). */
  enabledModuleIds?: readonly string[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("used");

  // One row per product (restricted to the customer's module set),
  // with embedded capability sub-rows that always render. Earlier this
  // table hid the capability detail behind an expand chevron; the
  // user asked for the spend story to be visible at a glance, so we
  // flatten it into a tree table where products are headers and
  // capabilities are indented rows underneath them. Sort applies only
  // to product order — capability rows always stay attached to their
  // parent product.
  const rows = useMemo(() => {
    const list = enabledModuleIds
      ? WALLETS.filter((w) => enabledModuleIds.includes(w.id))
      : WALLETS;
    return list.map((w) => {
      const series = sliceDailyToRange(w.daily, rangeDays, rangeOffset);
      const used   = series.reduce((s, d) => s + d.amount, 0);
      // Scale capability rows proportionally so the per-capability
      // numbers in the range sum to the product's range total.
      const ratio  = w.utilized > 0 ? used / w.utilized : 0;
      const caps   = w.capabilities.filter((c) => !c.included);
      return { module: w, used, ratio, caps };
    }).sort((a, b) => {
      if (sortKey === "used") return b.used - a.used;
      return a.module.name.localeCompare(b.module.name);
    });
  }, [rangeDays, rangeOffset, sortKey, enabledModuleIds]);

  // Shared grid template for all rows + header + footer. Four
  // columns now: name | units | rate | used. The old fifth column
  // (% of plan / vs cap) was dropped — the spend headline above the
  // table already answers "how much of my plan have I used", and
  // repeating the percentage per row added noise without giving the
  // user a new decision.
  const gridCols = "grid-cols-[minmax(0,1fr)_140px_140px]";

  // Total spend across all products in the range — used by the
  // footer. Kept as a separate calc so the footer can render
  // independently of the row mapping.
  const totalUsed = rows.reduce((s, r) => s + Math.round(r.used), 0);

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Header — title only. Earlier this carried a "Daily limit"
          column which only applied to one product; we moved that
          information to a chip under the product name when it
          exists. */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border-subtle">
        <h3 className="text-[13px] font-medium text-text-secondary">Modules</h3>
      </div>

      {/* Column headers — sort applies only to product rows. Bold to
          anchor the table; first column reads plainly as "Modules" so
          users don't trip on the older "Module / capability" path. */}
      <div className={`grid ${gridCols} gap-3 px-5 py-2 border-b border-border-subtle text-[10px] font-semibold text-text-primary uppercase tracking-[0.4px]`}>
        <SortHeader
          label="Modules"
          colKey="name"
          activeKey={sortKey}
          onSort={setSortKey}
        />
        <div className="text-right">Units</div>
        <SortHeader
          label="Used"
          colKey="used"
          activeKey={sortKey}
          onSort={setSortKey}
          align="right"
        />
      </div>

      {/* Rows — product header + always-visible capability sub-rows.
          The product header sits on a soft tint so the eye can group
          a product with its children when scanning vertically. */}
      <div>
        {rows.map(({ module: m, used, ratio, caps }, productIdx) => {
          const ModIcon = m.icon;
          return (
            <div
              key={m.id}
              className={productIdx > 0 ? "border-t border-border-subtle" : ""}
            >
              {/* Product header row — icon + name + optional daily-
                  limit chip on the left, totals on the right. */}
              <div
                className={`grid ${gridCols} gap-3 px-5 py-3 items-center bg-surface-page/40`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: m.chartColor }}
                  />
                  <div
                    className="w-7 h-7 rounded-input flex items-center justify-center shrink-0"
                    style={{ background: m.gradient }}
                  >
                    <ModIcon size={13} strokeWidth={1.6} style={{ color: m.text }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">
                      {m.name}
                    </p>
                    {/* Daily-limit chip used to live here as a sub-line
                        on the product row. It's a per-module operational
                        concern, not a usage / billing breakdown signal,
                        so it now lives on the module's own page header
                        (e.g. /enrichment) where it belongs. */}
                  </div>
                </div>
                {/* Units column — blank on the product header (the
                    breakdown lives in the capability rows). */}
                <div />
                {/* Used — product total */}
                <div className="text-right tabular-nums">
                  <span className="text-[13px] font-semibold text-text-primary">
                    {formatAmount(Math.round(used), currency)}
                  </span>
                </div>
              </div>

              {/* Capability sub-rows — indented under the product. */}
              {caps.map((c) => {
                // Per-capability range numbers. Scale by the product's
                // range/total ratio so a capability's units/spend in
                // the range match what we'd derive directly from the
                // wallet's daily series.
                const capCredits = Math.round(c.creditsUsed * ratio);
                const capUnits   = Math.round(c.unitCount * ratio);
                return (
                  <div
                    key={c.id}
                    className={`grid ${gridCols} gap-3 px-5 py-2.5 items-center border-t border-border-subtle`}
                  >
                    {/* Capability name — indented + a quiet leader
                        glyph to read as a child row. */}
                    <div className="flex items-center gap-3 pl-7 min-w-0">
                      {/* Vertical guide line — a quiet tree-view tick
                          that signals parent/child without the visual
                          drama of an arrow glyph. */}
                      <span className="w-px h-3.5 bg-border shrink-0" aria-hidden />
                      <span className="text-[12.5px] text-text-secondary truncate">
                        {c.label}
                      </span>
                    </div>
                    {/* Units */}
                    <div className="text-right tabular-nums text-[12px] text-text-secondary">
                      <span className="text-text-primary font-medium">{formatNum(capUnits)}</span>{" "}
                      <span className="text-text-tertiary">{c.unitLabel}{capUnits === 1 ? "" : "s"}</span>
                    </div>
                    {/* Used */}
                    <div className="text-right tabular-nums text-[12.5px] text-text-primary">
                      {formatAmount(capCredits, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer — total row.
          Deliberately heavier than the per-product rows: bigger
          numbers, semibold label in primary text, and a stronger
          surface-page background so the eye lands here as the
          summary, not as another data row. */}
      <div className={`grid ${gridCols} gap-3 px-5 py-3 border-t border-border bg-surface-page items-center`}>
        <div className="text-[12.5px] font-semibold text-text-primary">
          Total
          <span className="ml-1.5 text-[11px] font-medium text-text-tertiary">
            · {rows.length} product{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div />
        <div className="text-right tabular-nums">
          <span className="text-[14.5px] font-semibold text-text-primary">
            {formatAmount(totalUsed, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
//  BillingHistorySection — Shopify-style billings list
//
//  Layout follows Shopify Partners' billing page:
//
//    1. Subscription summary card (only when on a subscription plan):
//       plan name, monthly amount, cycle dates, active badge.
//    2. Billings — the last 5 settled bills as expandable rows. Each
//       row's collapsed view shows PERIOD, Created date, Invoiced
//       date, and the billed amount. Expanding reveals the line items
//       (plan baseline, usage, carry-forward/forfeit) and a primary
//       Download action.
//    3. Older bills — a year-navigated month picker. Picking a month
//       pins it to the top of the list as a one-off row so the user
//       can both *see* the bill (line items, amount) and grab the
//       PDF without losing context on the recent five.
//
//  Postpaid and pure top-up modes also render here: rows + picker work
//  identically, the summary card simply hides (no fixed monthly
//  baseline to summarise) and line items show usage only.
// ════════════════════════════════════════════════════════════════════

// ── BillingModelStrip ───────────────────────────────────────────────
//
// Single-line fact strip rendered at the top of the Billing page.
// The previous version used 4 fact cards in a row, which packed a
// lot of vertical space (each card had label + value + hint stacked)
// for what's ultimately a handful of metadata bullets. This compact
// version reads as one row of label-value pairs separated by dots,
// the way a status bar would — much less real estate, same info.
//
// The pairs reshape per mode (Subscription gets a Plan amount; Pure
// prepaid + Postpaid don't; only prepaid surfaces Carry-forward) so
// the strip never carries fields that don't apply.
// ────────────────────────────────────────────────────────────────────
function BillingModelStrip({
  billingMode,
  planType,
  carryForward,
  planBaseline,
  cycleStart,
  cycleEnd,
}: {
  billingMode: BillingMode;
  planType: "subscription" | "pure";
  carryForward: "enabled" | "disabled";
  planBaseline: number;
  cycleStart: Date;
  cycleEnd: Date;
}) {
  const fmtShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const isSubscription = billingMode === "prepaid" && planType === "subscription";
  const isPostpaid     = billingMode === "postpaid";

  const modelLabel = isPostpaid     ? "Postpaid"
                   : isSubscription ? "Subscription"
                   : "Pay as you go";

  // Each pair is a tight (label, value) — rendered as
  // "LABEL value" with the label in tertiary tracking-uppercase and
  // the value as primary text. Dots between pairs come from the
  // wrapping flex.
  const Pair = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] shrink-0">
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-text-primary tabular-nums truncate">
        {value}
      </span>
    </span>
  );

  const Divider = () => (
    <span className="text-text-tertiary/60 select-none" aria-hidden>·</span>
  );

  return (
    <div className="bg-white border border-border rounded-card px-4 py-2.5 flex items-center gap-3 flex-wrap">
      <Pair
        label="Billing model"
        value={
          <span className="inline-flex items-center gap-1.5">
            {modelLabel}
            {isSubscription && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                <span className="w-1 h-1 rounded-full bg-[#22C55E]" />
                Active
              </span>
            )}
          </span>
        }
      />

      {isSubscription && (
        <>
          <Divider />
          <Pair label="Plan" value={`${formatAmount(planBaseline, "INR")} / month`} />
        </>
      )}

      <Divider />
      <Pair
        label="Current cycle"
        value={`${fmtShort(cycleStart)} – ${fmtShort(cycleEnd)}`}
      />

      {/* Carry-forward only surfaces when ON. When it's off we hide
          the pair entirely — exposing "Disabled" would suggest there
          is a toggle the user could turn on, which isn't the
          intended product surface here. */}
      {!isPostpaid && carryForward === "enabled" && (
        <>
          <Divider />
          <Pair label="Carry-forward" value="Enabled" />
        </>
      )}
    </div>
  );
}

interface BillingHistorySectionProps {
  billingMode:      BillingMode;
  planType:         "subscription" | "pure";
  carryForward:     "enabled" | "disabled";
  planBaseline:     number;
  enabledModuleIds: readonly string[];
}

function BillingHistorySection({
  billingMode, planType, carryForward, planBaseline, enabledModuleIds,
}: BillingHistorySectionProps) {
  // 24 cycles of history — the table paginates so we can comfortably
  // show this much without crowding the page. Cycles are anchored to
  // CYCLE_START_DAY so a workspace on a 13-to-13 cycle sees periods
  // that match its actual invoicing windows (not the calendar).
  const allMonths = useMemo(() => billingMonthOptions(24, CYCLE_START_DAY), []);
  // "Past" means the cycle has already closed — its window ends
  // before today. BillingMonth.offsetFromEnd is 0 for the current
  // cycle and positive for any cycle that ended in the past, so it's
  // the direct signal here.
  const isPastMonth = (m: BillingMonth) => m.offsetFromEnd > 0;

  const isSubscription = billingMode === "prepaid"  && planType === "subscription";
  const isPostpaid     = billingMode === "postpaid";

  // Active-cycle metadata. Sourced from periodProgress so the dates
  // stay in sync with the rest of the page (hero, modules table).
  const period = useMemo(() => periodProgress(CYCLE_START_DAY), []);

  // ── All invoices (current + past) ───────────────────────────────
  // The list combines the still-open current cycle (postpaid only —
  // subscription pays upfront, pure prepaid doesn't recur) with every
  // past cycle that produced a bill. We tag each one with a status
  // following Stripe's vocabulary so the UI can render the right
  // badge: Open (not yet settled), Paid (settled), Uncollectible
  // (settled-with-write-off — included for demo realism so the
  // status column doesn't read as a binary).
  type InvoiceRow = {
    month:     BillingMonth;
    invoiceId: string;
    // `createdAt` is when the invoice was issued — for subscription
    // and pure prepaid that's the cycle start day. We keep it but no
    // longer render it as its own column; the Period column already
    // implies it.
    createdAt: Date;
    // `paidAt` is when the invoice actually settled. For most rows
    // this is the same day as createdAt (auto-charged on issue) but
    // a small slice slips by 1–10 days for banking delays. Null for
    // open invoices that haven't been collected yet.
    paidAt:    Date | null;
    amount:    number;
    status:    "open" | "paid" | "uncollectible" | "refunded";
    isCurrent: boolean;
  };

  const allInvoices: InvoiceRow[] = useMemo(() => {
    const list: InvoiceRow[] = [];

    // Current cycle row — always present so the Status column has a
    // Pending entry visible at the top of the list. For postpaid this
    // is literally an unpaid invoice (collected at cycle end). For
    // subscription the cycle WAS auto-charged at cycle start, but we
    // still surface a row tagged Pending until the cycle closes — the
    // invoice itself isn't finalised until close, which is the same
    // framing Stripe uses for in-progress periods. allMonths[0] is
    // the current month (billingMonthOptions returns newest-first).
    if (allMonths.length > 0) {
      const current = allMonths[0];
      const { total } = invoiceLineItemsFor(current, enabledModuleIds);
      const currentAmount = isSubscription
        ? planBaseline + total      // baseline + usage running so far
        : total;
      const [yC, mC] = current.id.split("-").map(Number);
      list.push({
        month:     current,
        invoiceId: `INV-${yC}-${String(mC).padStart(2, "0")}`,
        // Issue date — for the in-progress cycle that's the cycle start.
        createdAt: period.start,
        // Not yet finalised — the Paid on column will read "Pending"
        // and the Status badge will too.
        paidAt:    null,
        amount:    currentAmount,
        status:    "open",
        isCurrent: true,
      });
    }

    // Past cycles — paid or uncollectible. Only months with a real
    // bill are surfaced: subscription always bills the plan baseline
    // (never zero), postpaid + pure prepaid only get invoiced when
    // there's actual usage. Skipping the empty ones avoids confusing
    // "Paid · —" rows for cycles before the workspace started.

    // Deterministic per-month variation — hashes the year+month so
    // the demo numbers are stable across reloads but vary between
    // rows. We use this to mix in:
    //   • top-ups stacked on the subscription baseline so the
    //     monthly total isn't a flat ₹5,00,000 down the column
    //   • a few days of "banking delay" on the payment date so the
    //     Created column doesn't read as the same day-of-month for
    //     every row
    //   • the occasional uncollectible row (realistic Stripe spread)
    const hashRand = (key: string): (() => number) => {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return () => {
        h = (h + 0x6D2B79F5) >>> 0;
        let t = h;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    const past = allMonths.filter(isPastMonth);
    let kept = 0;
    past.forEach((m) => {
      const { total } = invoiceLineItemsFor(m, enabledModuleIds);
      const baseBilled = isSubscription ? planBaseline : total;
      if (baseBilled === 0) return;
      const [y, mn] = m.id.split("-").map(Number);

      const rand = hashRand(m.id);
      // Top-up amount stacked on the subscription baseline. Pure
      // prepaid / postpaid already vary by usage so we leave those
      // numbers alone.
      let billed = baseBilled;
      if (isSubscription) {
        const r = rand();
        if (r < 0.30) {
          // ~30% of months: no top-ups, just the baseline.
        } else if (r < 0.80) {
          // ~50% of months: one mid-cycle top-up.
          const sizes = [25_000, 50_000, 75_000, 1_00_000, 1_50_000];
          billed += sizes[Math.floor(rand() * sizes.length)];
        } else {
          // ~20% of months: heavy usage — multiple top-ups.
          const sizes = [50_000, 75_000, 1_00_000, 1_50_000, 2_00_000];
          billed += sizes[Math.floor(rand() * sizes.length)];
          billed += sizes[Math.floor(rand() * sizes.length)];
          if (rand() < 0.4) billed += sizes[Math.floor(rand() * sizes.length)];
        }
      }

      // Payment date variation. Most settle on the cycle start day
      // itself; a smaller share land 1–2 days later (auto-pay retry
      // window), a few percent stretch to a week (manual / postpaid).
      const paymentDelay = (() => {
        const r = rand();
        if (r < 0.60) return 0;
        if (r < 0.85) return 1 + Math.floor(rand() * 2); // 1–2 days
        if (r < 0.95) return 3 + Math.floor(rand() * 3); // 3–5 days
        return 6 + Math.floor(rand() * 5);               // 6–10 days
      })();

      // Status spread for past cycles. Most settle as Paid; a small
      // share fail (uncollectible) and a smaller share end up
      // Refunded — these are the four real-world states a SaaS
      // invoice lands in, and the demo benefits from all of them
      // appearing in a 24-cycle history. Offsets are different so
      // Failed and Refunded never overlap on the same row.
      const settledStatus: "paid" | "uncollectible" | "refunded" =
        kept > 0 && kept % 7 === 0
          ? "uncollectible"
          : kept > 0 && kept % 11 === 4
            ? "refunded"
            : "paid";
      list.push({
        month:     m,
        invoiceId: `INV-${y}-${String(mn).padStart(2, "0")}`,
        // Issue date — always the cycle start, no banking variation.
        createdAt: new Date(y, mn - 1, CYCLE_START_DAY),
        // Settlement date — adds the banking delay to the issue date.
        // Uncollectible rows still get a settlement date (= when the
        // attempt failed), which we render as "Failed · DATE".
        paidAt:    new Date(y, mn - 1, CYCLE_START_DAY + paymentDelay),
        amount:    billed,
        // One in seven kept invoices reads as uncollectible — realistic
        // spread for a demo, doesn't take over the column.
        status:    settledStatus,
        isCurrent: false,
      });
      kept += 1;
    });

    return list;
  }, [allMonths, period.start, period.end, isPostpaid, isSubscription, planBaseline, enabledModuleIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pagination ──────────────────────────────────────────────────
  // 10/page matches Stripe and keeps the table at a comfortable
  // visual height. If we ever reach an invoice count where one row
  // matters (small businesses), 10 is still enough to see the
  // current cycle plus the last quarter on page 1.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(allInvoices.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = allInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = allInvoices.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(safePage * PAGE_SIZE, allInvoices.length);

  return (
    <div className="space-y-3">
      {/* ── Invoices table ──────────────────────────────────────────
          Stripe-style paginated list. Columns: Invoice ID, Created,
          Status, Amount. Rows expand inline to reveal line items +
          PDF download (when settled). Pagination at the foot —
          10/page, with Prev/Next + a "Showing X–Y of Z" readout
          so the user always knows where they are in history. */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h3 className="text-[15px] font-semibold text-text-primary">Invoices</h3>
          <p className="text-[12px] text-text-secondary mt-0.5">
            All invoices on this account — current cycle and history.
          </p>
        </div>

        {/* Column header row. Five data columns + a 36px action slot:
            Invoice · Period · Paid on · Status · Amount · ⬇. Status
            is back as its own column — Pending for the active cycle,
            Paid for most settled rows, Failed for uncollectible, and
            Refunded for the rare write-back. The Created column stays
            dropped (redundant with Period start for prepaid). */}
        <div className="grid grid-cols-[1fr_1.1fr_1fr_0.8fr_1fr_36px] items-center gap-3 px-4 py-2 bg-surface-page/60 border-b border-border-subtle text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
          <div>Invoice</div>
          <div>Period</div>
          <div>Paid on</div>
          <div>Status</div>
          <div className="text-right">Amount</div>
          <div />
        </div>

        <div className="divide-y divide-border-subtle">
          {pageRows.map((inv) => (
            <BillingHistoryRow
              key={inv.invoiceId}
              month={inv.month}
              invoiceId={inv.invoiceId}
              paidAt={inv.paidAt}
              status={inv.status}
              amount={inv.amount}
              isCurrent={inv.isCurrent}
              billingMode={billingMode}
              planType={planType}
              carryForward={carryForward}
              planBaseline={planBaseline}
              enabledModuleIds={enabledModuleIds}
            />
          ))}
          {pageRows.length === 0 && (
            <div className="px-4 py-8 text-[12.5px] text-text-tertiary text-center">
              No invoices yet. Your first invoice will appear here once your first billing cycle closes.
            </div>
          )}
        </div>

        {/* Pagination footer — matches Stripe's compact pattern:
            range readout on the left, prev/next controls on the
            right. Disabled state on the controls when at an edge so
            the user can't fall off either end. */}
        {allInvoices.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border-subtle">
            <p className="text-[11.5px] text-text-tertiary">
              Showing <span className="text-text-secondary font-medium tabular-nums">{rangeStart}–{rangeEnd}</span> of{" "}
              <span className="text-text-secondary font-medium tabular-nums">{allInvoices.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-7 px-2.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-text-secondary border border-border rounded-button hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={12} strokeWidth={1.75} />
                Prev
              </button>
              <span className="text-[11.5px] text-text-tertiary tabular-nums px-1">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-7 px-2.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-text-secondary border border-border rounded-button hover:bg-surface-page disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={12} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BillingHistoryRow ────────────────────────────────────────────────
//
// A single Stripe-style invoice row. The collapsed surface is a
// 4-column grid — Invoice ID, Created, Status, Amount — that lines
// up against the table header above it. Clicking the row toggles
// inline line items. Settled rows expose a Download PDF; the
// current cycle's open invoice doesn't (no PDF yet — there's
// nothing to settle until the cycle closes).
// ────────────────────────────────────────────────────────────────────

function BillingHistoryRow({
  month, invoiceId, paidAt, status, amount, isCurrent,
  billingMode, planType, carryForward, planBaseline, enabledModuleIds,
}: {
  month:            BillingMonth;
  invoiceId:        string;
  paidAt:           Date | null;
  status:           "open" | "paid" | "uncollectible" | "refunded";
  amount:           number;
  isCurrent:        boolean;
  billingMode:      BillingMode;
  planType:         "subscription" | "pure";
  carryForward:     "enabled" | "disabled";
  planBaseline:     number;
  enabledModuleIds: readonly string[];
}) {
  const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const onDownload = () => {
    const { blob, filename } = buildInvoiceForMonth({
      month,
      mode:        billingMode,
      planType,
      isPast:      true,
      planBaseline,
      carryForward,
      enabledModuleIds,
    });
    downloadBlob(blob, filename);
  };

  // Paid on cell — just the date for any row that has one, "—" when
  // nothing has settled yet (the Status column carries the lifecycle).
  // We no longer prefix "Failed · " on uncollectible rows because the
  // dedicated Status badge in the next column says the same thing.
  const paidOnCell = paidAt
    ? <span className="text-[12.5px] text-text-secondary tabular-nums">{fmtDate(paidAt)}</span>
    : <span className="text-[12.5px] text-text-tertiary">—</span>;

  return (
    <div className={`grid grid-cols-[1fr_1.1fr_1fr_0.8fr_1fr_36px] items-center gap-3 px-4 py-3 ${isCurrent ? "bg-amber-50/30" : "bg-white"}`}>
      <div className="min-w-0">
        <p className="text-[12.5px] font-mono text-text-primary truncate">{invoiceId}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-text-secondary tabular-nums truncate">{month.range}</p>
      </div>
      <div className="min-w-0">
        {paidOnCell}
      </div>
      <div className="min-w-0">
        <InvoiceStatusBadge status={status} />
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-text-primary tabular-nums">
          {amount > 0 ? formatAmount(amount, "INR") : "—"}
        </p>
      </div>
      <div className="flex items-center justify-end">
        {!isCurrent ? (
          <button
            type="button"
            onClick={onDownload}
            aria-label="Download invoice"
            title="Download invoice"
            className="inline-flex items-center justify-center w-7 h-7 text-text-secondary border border-border rounded-button hover:bg-surface-secondary hover:text-text-primary transition-colors"
          >
            <ArrowDown size={12} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── InvoiceStatusBadge ───────────────────────────────────────────────
// Status pill aligned with how Stripe / Razorpay / OpenAI label
// invoice lifecycle states. Four colour families:
//   Paid       — green   — money settled and stays with us
//   Pending    — amber   — finalised but not yet collected, OR
//                          mid-cycle subscription invoice not closed
//   Failed     — red     — uncollectible, written off after retries
//                          (Stripe's term; Razorpay calls it "Failed")
//   Refunded   — slate   — money was paid then returned to the customer
// Kept compact so the column doesn't crowd the row.
function InvoiceStatusBadge({ status }: { status: "open" | "paid" | "uncollectible" | "refunded" }) {
  const style = {
    paid:          { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", dot: "bg-[#15803D]", label: "Paid" },
    open:          { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", dot: "bg-[#D97706]", label: "Pending" },
    uncollectible: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", dot: "bg-[#DC2626]", label: "Failed" },
    refunded:      { bg: "bg-[#E2E8F0]", text: "text-[#475569]", dot: "bg-[#64748B]", label: "Refunded" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-badge ${style.bg} ${style.text} text-[10.5px] font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function BillingLineRow({
  label, hint, value, muted,
}: { label: string; hint: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-[12.5px] ${muted ? "opacity-60" : ""}`}>
      <span className="text-text-secondary inline-flex flex-col">
        {label}
        <span className="text-[10.5px] text-text-tertiary">{hint}</span>
      </span>
      <span className="text-text-primary font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ── OlderMonthPicker ─────────────────────────────────────────────────
//
// Year-navigable month grid for jumping to any past billing cycle —
// modelled on the payslip pickers in HRMS tools like Keka and greytHR
// (year arrow nav at the top, then a 12-month grid). The user thinks
// "let me grab last July's invoice", not "let me filter by a date
// range", so we surface a calendar metaphor instead of a date range
// picker. Past months are clickable (pins the row at the top of the
// invoices list); the current month + future months are dimmed
// because no settled bill exists yet.
// ────────────────────────────────────────────────────────────────────

function OlderMonthPicker({
  onPick, isPastMonth,
}: {
  onPick: (m: BillingMonth) => void;
  isPastMonth: (m: BillingMonth) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());

  const monthShortNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:border-border-strong hover:bg-surface-page transition-colors"
      >
        <Calendar size={12} strokeWidth={1.75} className="text-text-tertiary" />
        Pick a month
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`text-text-tertiary transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Click-outside scrim */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 bg-white border border-border rounded-card shadow-xl w-[300px] overflow-hidden">
            {/* Title row — sets the user's expectation that they're
                picking ONE month (a settled cycle) not a range. */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-[12px] font-semibold text-text-primary">
                Select a month
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5">
                Open the invoice for any past cycle.
              </p>
            </div>

            {/* Year nav — left/right arrows around a centred year. The
                right arrow disables at the current year because future
                cycles haven't happened yet; the left arrow has no lower
                bound so a 2-year-old account can walk back across as
                many years as they need. */}
            <div className="flex items-center justify-between gap-2 px-3 pb-2 border-b border-border-subtle">
              <button
                type="button"
                onClick={() => setYear((y) => y - 1)}
                aria-label="Previous year"
                className="h-7 w-7 rounded-button text-text-secondary hover:bg-surface-page hover:text-text-primary inline-flex items-center justify-center"
              >
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <span className="text-[14px] font-semibold text-text-primary tabular-nums">
                {year}
              </span>
              <button
                type="button"
                onClick={() => setYear((y) => Math.min(y + 1, today.getFullYear()))}
                disabled={year >= today.getFullYear()}
                aria-label="Next year"
                className="h-7 w-7 rounded-button text-text-secondary hover:bg-surface-page hover:text-text-primary inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>

            {/* Month grid — 3 columns × 4 rows. Past months read as
                primary text on a hover-able surface (real cycles you
                can pull an invoice for); the current month and any
                future months are dimmed and unclickable because
                there's no settled bill to show yet. */}
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {monthShortNames.map((mon, idx) => {
                const m = billingMonthFor(year, idx, CYCLE_START_DAY);
                const past = isPastMonth(m);
                const isCurrent =
                  year === today.getFullYear() && idx === today.getMonth();
                return (
                  <button
                    key={mon}
                    type="button"
                    disabled={!past}
                    onClick={() => {
                      onPick(m);
                      setOpen(false);
                    }}
                    title={
                      past
                        ? `View ${mon} ${year} invoice`
                        : isCurrent
                          ? "Current cycle — no settled bill yet"
                          : "No settled bill yet"
                    }
                    className={`h-9 text-[12.5px] font-medium rounded-button transition-colors ${
                      past
                        ? "text-text-primary bg-surface-page/60 hover:bg-surface-secondary border border-border-subtle"
                        : isCurrent
                          ? "text-text-tertiary bg-white border border-dashed border-border-subtle cursor-not-allowed"
                          : "text-text-tertiary/60 cursor-not-allowed"
                    }`}
                  >
                    {mon}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
