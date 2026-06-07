"use client";

// Right-side drawer that hosts the CRM field-mapping view. Same visual
// language as the run-drawer: scrim + sliding panel + close on Esc.

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MappingDrawer({ open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll while the drawer is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/30"
            aria-hidden
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-[71] h-screen w-full sm:w-[560px] bg-surface-page border-l border-border shadow-[0_0_40px_rgba(15,15,15,0.12)] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Field mapping"
          >
            <header className="flex items-center justify-between px-5 h-12 border-b border-border bg-white">
              <div className="text-[13px] font-semibold text-text-primary">Field mapping</div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 -mr-1.5 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
