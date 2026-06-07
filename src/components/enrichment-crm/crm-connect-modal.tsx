"use client";

// Modal that opens when user clicks "Connect CRM" anywhere in the enrichment
// product. We don't ship a self-serve OAuth flow yet, the integration is a
// support-assisted handoff. Two states:
//   1. Form — short pitch + Submit button
//   2. Success — request submitted, support will reach out
// After submit we flip a flag in useDemoMode so the banner reads "request in"
// and the modal opens directly into success on re-open.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Headset, PlugZap, X } from "lucide-react";

import { useDemoMode } from "@/lib/demo-mode";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrmConnectModal({ open, onClose }: Props) {
  const { crmRequestSubmitted, setCrmRequestSubmitted } = useDemoMode();
  // Local submitting state so the button shows a spinner. The real submit is
  // a no-op in the prototype, but we still gate the success transition on a
  // short delay to keep the feedback feeling real.
  const [submitting, setSubmitting] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = () => {
    if (crmRequestSubmitted) {
      onClose();
      return;
    }
    setSubmitting(true);
    // Simulated handoff. Real impl would POST to /api/support/crm-request.
    window.setTimeout(() => {
      setCrmRequestSubmitted(true);
      setSubmitting(false);
    }, 650);
  };

  const showSuccess = crmRequestSubmitted;

  // Portal to body so the dialog isn't trapped inside a transformed ancestor
  // (DataPageShell wraps content in a motion.div that applies transform on
  // mount, which breaks `position: fixed` for descendants).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crm-connect-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[min(440px,calc(100vw-32px))] bg-white border border-border rounded-card shadow-[0_24px_64px_rgba(15,15,15,0.18),0_0_0_1px_rgba(15,15,15,0.04)]"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
            >
              <X size={16} strokeWidth={1.75} />
            </button>

            {!showSuccess && (
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-card bg-[#FEF3C7] border border-[#FDE68A] flex-shrink-0">
                    <PlugZap size={16} strokeWidth={1.75} className="text-[#B45309]" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div
                      id="crm-connect-title"
                      className="text-[15px] font-semibold text-text-primary leading-tight"
                    >
                      Connect with support to wire up your CRM
                    </div>
                    <p className="text-[12.5px] text-text-secondary leading-snug mt-1.5">
                      Send a request and our integrations team will reach out to set up the connection.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-border-subtle">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary">
                    <Headset size={12} strokeWidth={1.75} />
                    Typically a single 30-min call.
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors disabled:opacity-60 disabled:cursor-progress"
                  >
                    {submitting ? "Submitting…" : "Request connection"}
                    {!submitting && <ArrowRight size={13} strokeWidth={2} />}
                  </button>
                </div>
              </div>
            )}

            {showSuccess && (
              <div className="p-6 text-center">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] mx-auto mb-4">
                  <CheckCircle2 size={22} strokeWidth={1.75} className="text-[#15803D]" />
                </span>
                <div className="text-[16px] font-semibold text-text-primary mb-1.5">
                  Request submitted
                </div>
                <p className="text-[12.5px] text-text-secondary leading-relaxed max-w-[340px] mx-auto mb-5">
                  Our integrations team will reach out to set up the CRM connection. No further action needed on your side.
                </p>
                <div className="pt-4 border-t border-border-subtle flex items-center justify-center">
                  <button
                    onClick={onClose}
                    className="inline-flex items-center h-9 px-5 text-[13px] font-medium text-text-primary bg-surface-secondary hover:bg-surface-page rounded-button transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
