"use client";

/**
 * TemplatePickerModal — the entry experience for agent creation.
 *
 * Mirrors how Retell.ai, Vapi, ElevenLabs Conversational AI, Bland.ai,
 * and OpenAI's Custom GPTs all do it: a centred modal triggered from
 * the listing page's "Create" button rather than a full-screen route.
 * The full-page templates layout we had before drowned in empty grey
 * canvas — three cards on a sidebar-narrowed viewport with a sea of
 * background around them. A modal sits on top of the listing the user
 * was already looking at, so the context never goes away.
 *
 * On pick, the modal closes and we navigate to /agents-mvp/create with
 * the chosen template encoded in the URL. The create page reads it and
 * jumps straight into the wizard on Step 1 — no separate templates
 * phase.
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowRight, Rocket, ListChecks, Wand2, Sparkles,
} from "lucide-react";

export type TemplateKey = "outbound" | "qualification" | "scratch";

interface TemplateCard {
  key: TemplateKey;
  name: string;
  tagline: string;
  description: string;
  recommended: boolean;
  bg: string;
  accent: string;
  border: string;
  gradient: string;
  icon: typeof Rocket;
}

const TEMPLATE_CARDS: TemplateCard[] = [
  {
    key: "outbound",
    name: "Outbound agent",
    tagline: "Reach out and pitch",
    description:
      "Calls fresh leads, introduces your offer, and books the next step. Best for proactive sales outreach.",
    recommended: true,
    bg: "#FEF3C7",
    accent: "#92400E",
    border: "#FDE68A",
    gradient: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
    icon: Rocket,
  },
  {
    key: "qualification",
    name: "Qualification agent",
    tagline: "Sort and score new leads",
    description:
      "Calls enquiries, checks intent + budget + timeline, and labels them so sales sees only the hot ones.",
    recommended: true,
    bg: "#ECFDF5",
    accent: "#047857",
    border: "#A7F3D0",
    gradient: "linear-gradient(135deg, #ECFDF5 0%, #A7F3D0 100%)",
    icon: ListChecks,
  },
  {
    key: "scratch",
    name: "Start from scratch",
    tagline: "I know what I want",
    description:
      "Empty agent. Write the personality and rules yourself — perfect if you have a prompt to paste in.",
    recommended: false,
    bg: "#F0F9FF",
    accent: "#0369A1",
    border: "#BAE6FD",
    gradient: "linear-gradient(135deg, #F0F9FF 0%, #BAE6FD 100%)",
    icon: Wand2,
  },
];

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (key: TemplateKey) => void;
}

export function TemplatePickerModal({
  open, onClose, onPick,
}: TemplatePickerModalProps) {
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
            initial={{ scale: 0.97, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-card max-w-[720px] w-full shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-2">
              <div className="min-w-0">
                <h2 className="text-[20px] font-semibold text-text-primary">
                  How would you like to start?
                </h2>
                <p className="text-[13px] text-text-secondary mt-1 max-w-[480px]">
                  Pick a template for a head-start with a voice, personality, and prompt — or start with a blank canvas.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-button text-text-tertiary hover:bg-surface-page hover:text-text-secondary transition-colors shrink-0"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-3 gap-3 px-6 py-5">
              {TEMPLATE_CARDS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => onPick(t.key)}
                    className="group relative text-left bg-white border border-border rounded-card p-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150"
                    style={{ borderColor: t.border }}
                  >
                    {t.recommended && (
                      <span
                        className="absolute -top-2 left-3 text-[10px] font-medium px-2 py-0.5 rounded-badge text-white"
                        style={{ backgroundColor: t.accent }}
                      >
                        Recommended
                      </span>
                    )}

                    <div
                      className="w-10 h-10 rounded-input flex items-center justify-center mb-3"
                      style={{ background: t.gradient }}
                    >
                      <Icon size={16} strokeWidth={1.6} style={{ color: t.accent }} />
                    </div>

                    <h3 className="text-[13px] font-semibold text-text-primary mb-0.5">
                      {t.name}
                    </h3>
                    <p
                      className="text-[11px] font-medium mb-1.5"
                      style={{ color: t.accent }}
                    >
                      {t.tagline}
                    </p>
                    <p className="text-[12px] text-text-secondary leading-relaxed">
                      {t.description}
                    </p>

                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: t.accent }}
                    >
                      Start <ArrowRight size={11} strokeWidth={2} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-6 py-3 border-t border-border-subtle bg-surface-page/50">
              <p className="text-[11px] text-text-tertiary text-center inline-flex items-center justify-center gap-1.5 w-full">
                <Sparkles size={10} strokeWidth={1.8} />
                New to building bots? <span className="font-medium text-text-secondary">Qualification agent</span> is what 70% of teams pick first.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
