"use client";

/**
 * TopUpEstimatorModal — "tell us what you need this month → we'll size
 * the top-up for you."
 *
 * The user types in expected quantities per capability (e.g. 200 phone
 * extractions, 500 minutes of voice). Each row multiplies through its
 * rate from credits-data.ts and the footer rolls up to a grand total
 * in credits + rupees. No subtraction the user has to do, no "go look
 * at the pricing page" detour.
 *
 * Mounted from /settings/wallet (and reachable via the ?topup=1 query
 * param so the sidebar widget can deep-link straight to the estimator).
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { WALLETS, RUPEES_PER_CREDIT } from "@/lib/credits-data";

// Customer-success contact that requests get routed to. In real life
// this would come from /api/me or a workspace setting; for the
// prototype we hard-code a sensible default so the success modal
// looks real.
const CSM_CONTACT = {
  name:  "Priya Nair",
  role:  "Key Account Manager",
  email: "priya.nair@revspot.ai",
};

interface Props {
  open:    boolean;
  onClose: () => void;
}

function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}

// Pretty rate label — renders as a rupee-per-action price like
// "₹2 each" / "₹1.5 each". The credits abstraction is no longer
// shown to the user.
function formatRateLabel(rate: number): string {
  const r = Number.isInteger(rate) ? rate.toString() : rate.toFixed(1);
  return `₹${r} each`;
}

export function TopUpEstimatorModal({ open, onClose }: Props) {
  // Quantities keyed by capability id. We DON'T persist this across
  // mounts — the estimator is a one-shot planner; if you close and
  // reopen, you start fresh. That matches how product teams use it
  // (think out load this month, hit Add credits).
  const [qty, setQty] = useState<Record<string, number>>({});

  // Two-step flow inside the modal. The estimator is the default view;
  // hitting "Send request" flips to a success card confirming the CSM
  // has been notified. Reset on close so re-opening starts at the
  // estimator again.
  const [view, setView] = useState<"estimator" | "sent">("estimator");
  const closeAll = () => {
    onClose();
    // Defer the view reset so the success card doesn't flash to the
    // estimator during the modal's exit animation.
    setTimeout(() => setView("estimator"), 250);
  };

  // Step size for the +/- buttons. We tie this to the *unit type* the
  // user thinks in rather than the credit rate — that was the old
  // approach (rate >= 10 ? 5 : rate >= 5 ? 10 : 25) and it produced
  // unpredictable jumps in credits (50, 37.5, 50, 80, 100) because the
  // step varied while the rate did too. Now everything counted in
  // discrete units (phones, emails, lookups) steps by 10, and talk
  // time (minutes) steps by 30 — a sensible half-hour chunk. The step
  // is also surfaced on the button labels so the user sees exactly
  // what each click does.
  const stepFor = (unitLabel: string): number => (unitLabel === "min" ? 30 : 10);

  const bump = (id: string, unitLabel: string, delta: 1 | -1) => {
    const step = stepFor(unitLabel);
    setQty((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta * step),
    }));
  };

  const setQtyDirect = (id: string, value: number) => {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const reset = () => setQty({});

  // Compute subtotals per wallet + grand total — recomputed on every
  // keystroke. Included capabilities (Concurrency, etc.) are skipped
  // since they don't accrue credits.
  const { subtotals, grandTotal } = useMemo(() => {
    let total = 0;
    const subs: Record<string, number> = {};
    for (const w of WALLETS) {
      let sub = 0;
      for (const cap of w.capabilities) {
        if (cap.included) continue;
        sub += (qty[cap.id] || 0) * cap.rate;
      }
      subs[w.id] = sub;
      total += sub;
    }
    return { subtotals: subs, grandTotal: total };
  }, [qty]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={closeAll}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-card max-w-[640px] w-full max-h-[88vh] flex flex-col shadow-2xl"
          >
            {view === "sent" ? (
              <SentView grandTotal={grandTotal} onClose={closeAll} />
            ) : (<>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
              <div>
                <p className="text-[15px] font-semibold text-text-primary inline-flex items-center gap-2">
                  <Sparkles size={14} strokeWidth={1.6} className="text-accent" />
                  Estimate top-up
                </p>
                <p className="text-[12px] text-text-secondary mt-0.5 max-w-[440px]">
                  Tell us roughly what you'll need this month — we'll size the top-up so you don't have to do the math.
                </p>
              </div>
              <button
                onClick={closeAll}
                className="p-2 rounded-button text-text-tertiary hover:bg-surface-page hover:text-text-secondary transition-colors shrink-0"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Body — one section per wallet */}
            <div
              className="flex-1 overflow-auto px-5 py-4 space-y-5"
              style={{ overscrollBehavior: "contain" }}
            >
              {WALLETS.map((w) => {
                const Icon = w.icon;
                const real = w.capabilities.filter((c) => !c.included);
                const sub = subtotals[w.id] || 0;
                return (
                  <div key={w.id}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-input flex items-center justify-center"
                          style={{ background: w.gradient }}
                        >
                          <Icon size={13} strokeWidth={1.6} style={{ color: w.text }} />
                        </div>
                        <span className="text-[13px] font-semibold text-text-primary">{w.name}</span>
                      </div>
                      {sub > 0 && (
                        <span className="text-[11px] tabular-nums text-text-tertiary">
                          Subtotal: <span className="font-semibold text-text-secondary">₹{formatNum(sub)}</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {real.map((cap) => {
                        const q = qty[cap.id] || 0;
                        const lineTotal = q * cap.rate;
                        return (
                          <div
                            key={cap.id}
                            // Row chrome bumped from a faint border-subtle on
                            // surface-page to a solid border on white. The
                            // previous treatment had the row almost dissolve
                            // into the modal background — the user wanted the
                            // outlines to read more clearly, so each capability
                            // now sits as its own distinct card.
                            className="flex items-center gap-2 px-3 py-2 rounded-input bg-white border border-border hover:border-border-hover transition-colors"
                          >
                            {/* Label + rate hint */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] text-text-primary">
                                {cap.label}
                              </p>
                              <p className="text-[10.5px] text-text-tertiary">
                                {formatRateLabel(cap.rate)} · per {cap.unitLabel}
                              </p>
                            </div>

                            {/* Stepper — buttons read "−10" / "+10" (or
                                "−30" / "+30" for talk-time minutes) so the
                                user sees the exact step instead of guessing
                                whether the next tap adds 25, 50, or 100
                                credits. Step size is tied to the unit, not
                                the credit rate, so two clicks always
                                produce a predictable jump. */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => bump(cap.id, cap.unitLabel, -1)}
                                disabled={q === 0}
                                title={`Decrease by ${stepFor(cap.unitLabel)} ${cap.unitLabel}${cap.unitLabel === "min" ? "" : "s"}`}
                                className="h-7 min-w-[36px] px-1.5 rounded-input text-[11px] font-medium tabular-nums text-text-tertiary hover:bg-white hover:text-text-primary transition-colors inline-flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                −{stepFor(cap.unitLabel)}
                              </button>
                              <input
                                type="number"
                                value={q || ""}
                                onChange={(e) => setQtyDirect(cap.id, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                min={0}
                                className="w-20 h-7 px-2 text-[12px] tabular-nums text-center bg-white border border-border rounded-input text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
                              />
                              <button
                                onClick={() => bump(cap.id, cap.unitLabel, 1)}
                                title={`Increase by ${stepFor(cap.unitLabel)} ${cap.unitLabel}${cap.unitLabel === "min" ? "" : "s"}`}
                                className="h-7 min-w-[36px] px-1.5 rounded-input text-[11px] font-medium tabular-nums text-text-tertiary hover:bg-white hover:text-text-primary transition-colors inline-flex items-center justify-center"
                              >
                                +{stepFor(cap.unitLabel)}
                              </button>
                            </div>

                            {/* Line total */}
                            <span className="text-[11.5px] tabular-nums text-text-tertiary shrink-0 w-[88px] text-right">
                              {q === 0 ? (
                                <span className="text-text-tertiary opacity-60">—</span>
                              ) : (
                                <>
                                  <span className="text-text-primary font-medium">{formatNum(lineTotal)}</span>
                                  <span className="text-text-tertiary"> cr</span>
                                </>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer — grand total + Add CTA */}
            <div className="px-5 py-4 border-t border-border bg-surface-page">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-0.5">
                    You&apos;ll need
                  </p>
                  {/* Headline figure is the rupee total directly — the
                      credits-and-conversion layer is gone now that the
                      product runs as a pure INR cash wallet. */}
                  <p className="text-[24px] font-semibold text-text-primary leading-none tabular-nums">
                    ₹{formatNum(grandTotal * RUPEES_PER_CREDIT)}
                  </p>
                </div>
                <p className="text-[11px] text-text-tertiary tabular-nums text-right">
                  Top-up estimate
                </p>
              </div>
              {/* Action row — all three buttons right-aligned, Reset
                  rendered as a quiet text link so it doesn't compete with
                  Cancel and Send for visual weight. Earlier Reset sat
                  alone on the far left, which made it look orphaned next
                  to the Cancel/Send pair on the right. Grouped together
                  reads cleaner: Reset (link) · Cancel (outline) · Send
                  (solid) — three steps of escalating commitment. */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={reset}
                  disabled={grandTotal === 0}
                  className="h-9 px-2 text-[12.5px] font-medium text-text-tertiary hover:text-text-secondary underline-offset-4 hover:underline transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                >
                  Reset
                </button>
                <button
                  onClick={closeAll}
                  className="h-9 px-4 text-[13px] font-medium border border-border rounded-button bg-white text-text-secondary hover:bg-surface-page transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setView("sent")}
                  disabled={grandTotal === 0}
                  className="h-9 px-4 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                >
                  {grandTotal === 0 ? (
                    "Send request"
                  ) : (
                    <>
                      Send request
                      <ArrowRight size={13} strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </div>
            </div>
            </>)}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ────────────────────────────────────────────────────────────────────
//  SentView — success state shown after the user hits "Send request".
//
//  The modal stays mounted (so the close transition feels continuous);
//  we just swap the content. Communicates two things plainly:
//   1. The request *was* sent — confirmed.
//   2. *Who* it went to — name + role + email so the user knows where
//      to follow up. We don't pretend the credits were auto-added,
//      because they weren't.
// ────────────────────────────────────────────────────────────────────

function SentView({
  grandTotal,
  onClose,
}: {
  grandTotal: number;
  onClose:    () => void;
}) {
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center">
      {/* Success mark — quiet green chip, not a celebratory burst. */}
      <div className="w-12 h-12 rounded-full bg-[#F0FDF4] inline-flex items-center justify-center mb-4">
        <CheckCircle2 size={22} strokeWidth={1.75} className="text-[#15803D]" />
      </div>

      <h3 className="text-[16px] font-semibold text-text-primary mb-1">
        Request sent
      </h3>
      <p className="text-[12.5px] text-text-secondary max-w-[420px] mb-5">
        Your request to top up {grandTotal > 0 ? (
          <>
            <span className="font-medium text-text-primary tabular-nums">₹{formatNum(grandTotal * RUPEES_PER_CREDIT)}</span>{" "}
          </>
        ) : (
          "your wallet "
        )}
        has been forwarded to your Key Account Manager. They&apos;ll
        confirm and provision the balance shortly.
      </p>

      {/* CSM card — name + role + email so the user can DM directly
          if they need to chase. */}
      <div className="w-full max-w-[400px] bg-surface-page border border-border-subtle rounded-card px-4 py-3 mb-5 text-left">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
          Sent to
        </p>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-accent text-white inline-flex items-center justify-center text-[11px] font-semibold shrink-0">
            {CSM_CONTACT.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-text-primary truncate">
              {CSM_CONTACT.name}
            </p>
            <p className="text-[11.5px] text-text-tertiary truncate">
              {CSM_CONTACT.role}
            </p>
            <a
              href={`mailto:${CSM_CONTACT.email}`}
              className="text-[11.5px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 mt-0.5 hover:underline"
            >
              <Mail size={11} strokeWidth={1.75} />
              {CSM_CONTACT.email}
            </a>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
      >
        Done
      </button>
    </div>
  );
}
