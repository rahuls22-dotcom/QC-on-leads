"use client";

/**
 * LowBalanceModal — blocking modal shown when a prepaid org tries to
 * run a product action while its wallet is empty or expired. The
 * user can't proceed with the action; the only forward path is to
 * send a recharge request to their CSM, which is also the legacy
 * "+ Add credits" flow on the wallet page.
 *
 * Postpaid orgs never see this — they don't have a balance concept
 * (usage just accrues until the cycle closes).
 *
 * Two presentations:
 *  - "empty":   you've used everything you topped up. Recharge to
 *               keep going.
 *  - "expired": your prepaid window lapsed (e.g. the credits expired
 *               12 months after purchase). Different cause, same
 *               outcome — you have to top up before you can run
 *               anything.
 *
 * Picks the right copy automatically based on the wallet state in
 * the store; the parent just decides whether to mount the modal.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useBillingModeStore } from "@/lib/billing-mode-store";

export function LowBalanceModal({
  open,
  onClose,
  // What the user was trying to do — surfaced in the headline so the
  // modal reads as a consequence of that action, not a random
  // interruption. Optional; falls back to a generic line.
  actionLabel,
}: {
  open: boolean;
  onClose: () => void;
  actionLabel?: string;
}) {
  const balance = useBillingModeStore((s) => s.balance);
  const [sent, setSent] = useState(false);

  // Reset the "sent" state every time the modal opens so the same
  // user can preview the request flow more than once in a session.
  useEffect(() => {
    if (open) setSent(false);
  }, [open]);

  const isExpired = balance === "expired";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-card max-w-[480px] w-full shadow-2xl overflow-hidden"
          >
            {/* Header — amber alert chrome so the user reads this as
                "blocked", not as a confirmation. */}
            <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FEF3C7] flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} strokeWidth={1.75} className="text-[#92400E]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-text-primary leading-tight">
                    {isExpired
                      ? "Your prepaid balance has expired"
                      : "You don't have enough balance"}
                  </h3>
                  <p className="text-[12.5px] text-text-secondary mt-1 leading-snug">
                    {actionLabel
                      ? `To ${actionLabel.toLowerCase()}, your org needs a positive prepaid balance.`
                      : "Any new activity needs a positive prepaid balance."}
                    {" "}
                    {isExpired
                      ? "Renew your balance to keep using Revspot."
                      : "Recharge to keep using Revspot."}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-page transition-colors"
                aria-label="Close"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            {sent ? (
              // After "Send request" is clicked — confirmation state.
              <div className="px-5 pb-5">
                <div className="rounded-input border border-[#D9F2E2] bg-[#F0FDF4] px-4 py-3 flex items-start gap-2.5">
                  <CheckCircle2 size={16} strokeWidth={1.75} className="text-[#15803D] shrink-0 mt-0.5" />
                  <div className="text-[12.5px] text-text-primary">
                    <p className="font-medium mb-0.5">Recharge request sent.</p>
                    <p className="text-text-secondary leading-snug">
                      Your account manager <span className="font-medium text-text-primary">Priya Nair</span> will
                      reach out within a business day to confirm the top-up amount and invoice.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={onClose}
                    className="h-9 px-4 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 pb-5">
                {/* Two-line explainer + a quiet summary of what
                    happens after the request. */}
                <div className="rounded-input border border-border-subtle bg-surface-page px-4 py-3 text-[12px] text-text-secondary leading-snug">
                  <p className="mb-1.5">
                    <span className="font-medium text-text-primary">What happens next:</span>
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>We forward the request to your account manager.</li>
                    <li>They share a top-up quote &amp; invoice in INR.</li>
                    <li>Once paid, your balance updates and pending actions resume.</li>
                  </ol>
                </div>

                {/* Action row */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={onClose}
                    className="h-9 px-4 text-[13px] font-medium border border-border bg-white text-text-secondary rounded-button hover:bg-surface-page transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setSent(true)}
                    className="h-9 px-4 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
                  >
                    <Send size={13} strokeWidth={1.75} />
                    Send recharge request
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
