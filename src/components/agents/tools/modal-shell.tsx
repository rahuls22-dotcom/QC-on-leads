"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * Centred modal shell shared by every Tools-library flow (built-in detail,
 * type chooser, custom form, delete). Backdrop click + Escape close it;
 * the panel scrolls internally when tall. Matches the framer-motion modal
 * pattern used elsewhere in the app (e.g. template-picker-modal).
 */
export function ModalShell({
  open,
  onClose,
  children,
  maxWidth = "max-w-[560px]",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full ${maxWidth} my-auto bg-white border border-border rounded-card shadow-xl`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Standard modal header: icon tile, title, sub-line, optional badge, close. */
export function ModalHeader({
  icon,
  title,
  subtitle,
  badge,
  onClose,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
      {icon && (
        <div className="w-9 h-9 shrink-0 rounded-button bg-surface-secondary text-text-secondary flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-text-primary truncate">
          {title}
        </h2>
        {subtitle && (
          <div className="text-[12px] text-text-tertiary mt-0.5">{subtitle}</div>
        )}
      </div>
      {badge}
      <button
        onClick={onClose}
        aria-label="Close"
        className="p-1.5 -mr-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}
