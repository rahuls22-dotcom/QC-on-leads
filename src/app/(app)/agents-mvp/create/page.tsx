"use client";

/**
 * Speedrun agent create — Vapi-inspired 2-field intake.
 *
 * The old wizard (Identity → Outcomes → Brain → Behaviour → Try) was a
 * five-step interview that asked the user to make twelve decisions
 * before they could hear their bot speak. Replaced with a single screen
 * that asks two questions — name and goal — then routes straight to the
 * detail page where Talk-to-agent is one click away.
 *
 * The "calibration" between submit and route is pure UI dopamine: we
 * already have the seed object before the timer starts, but staging the
 * 1.4s "Calibrating…" beat sells the work the system did. Detail page
 * surfaces a "Spot calibrated this — edit anytime" badge so the user
 * knows the prompt is a starting point, not gospel.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { calibrateFromGoal, useAgentMvpStore } from "@/lib/agent-mvp-store";

// Example goals the user can click to seed the textarea. Picked to span
// three obvious shapes (qualify · book · support) so the user gets a feel
// for what "good" looks like without having to imagine it from scratch.
const EXAMPLE_GOALS = [
  {
    label: "Lead qualifier",
    defaultName: "Maya",
    text: "Qualify inbound leads for luxury homes in Bangalore. Ask about budget, timeline, and preferred location. Hand off to a human if budget exceeds 5 Cr.",
  },
  {
    label: "Appointment setter",
    defaultName: "Atlas",
    text: "Call back website signups and book a 20-minute discovery call with our sales team. Offer two time slots and confirm calendar holds.",
  },
  {
    label: "Customer support",
    defaultName: "Vox",
    text: "Triage incoming support calls. Identify the product, the issue, and the urgency. Escalate to a human if the caller is frustrated or the issue involves billing.",
  },
];

export default function AgentMvpCreatePage() {
  const router = useRouter();
  const upsertAgent = useAgentMvpStore((s) => s.upsertAgent);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<"form" | "calibrating">("form");
  const goalRef = useRef<HTMLTextAreaElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // Autofocus the name field — saves the user one click on landing.
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Auto-grow the goal textarea so the calibration target stays visible
  // as the user types. Beats a fixed height that scrolls — the goal IS
  // the prompt, so length matters.
  useEffect(() => {
    if (!goalRef.current) return;
    goalRef.current.style.height = "auto";
    goalRef.current.style.height = `${goalRef.current.scrollHeight}px`;
  }, [goal]);

  const canSubmit = name.trim().length >= 2 && goal.trim().length >= 12;

  const handleCreate = () => {
    if (!canSubmit) return;
    const agent = calibrateFromGoal({ name: name.trim(), goal: goal.trim() });
    upsertAgent(agent);
    setPhase("calibrating");
    // Stage the calibration beat — long enough to register, short enough
    // not to feel artificial. Routes to the detail page where the Talk-
    // to-agent CTA closes the dopamine loop.
    setTimeout(() => {
      router.push(`/agents-mvp/${agent.id}?just_created=1`);
    }, 1400);
  };

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push("/agents-mvp")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
          aria-label="Back to agents"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">
          Tools &rsaquo; Agents &rsaquo; Create
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <header className="mb-8">
              <h1 className="text-[22px] font-semibold text-text-primary leading-tight">
                Create your agent
              </h1>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
                Two quick answers. Spot calibrates the rest and you can
                test the bot in the next screen.
              </p>
            </header>

            <div className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="agent-name" className="block text-[12px] font-medium text-text-primary mb-1.5">
                  Agent name
                </label>
                <input
                  ref={nameRef}
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya"
                  className="w-full h-10 px-3 bg-white border border-border rounded-input text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary transition-colors"
                />
                <p className="text-[11.5px] text-text-tertiary mt-1.5">
                  This is what the agent calls itself on the call. You can rename it any time.
                </p>
              </div>

              {/* Goal */}
              <div>
                <label htmlFor="agent-goal" className="block text-[12px] font-medium text-text-primary mb-1.5">
                  What should this agent do?
                </label>
                <textarea
                  ref={goalRef}
                  id="agent-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={4}
                  placeholder="Describe the goal in your own words. The more specific, the better the calibration."
                  className="w-full px-3 py-2.5 bg-white border border-border rounded-input text-[14px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary transition-colors resize-none leading-relaxed min-h-[110px]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="text-[11.5px] text-text-tertiary mr-0.5 self-center">
                    Try
                  </span>
                  {EXAMPLE_GOALS.map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => {
                        setGoal(ex.text);
                        if (!name.trim()) setName(ex.defaultName);
                      }}
                      className="text-[11.5px] text-text-secondary hover:text-text-primary border border-border-subtle rounded-full px-2.5 py-0.5 hover:border-text-tertiary transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-border-subtle flex items-center justify-between">
              <p className="text-[11.5px] text-text-tertiary">
                Everything else — voice, model, FAQs, criteria — is set by default and editable later.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 h-9 px-4 bg-text-primary text-white text-[13px] font-medium rounded-button hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Sparkles size={14} strokeWidth={1.75} />
                Create agent
              </button>
            </div>
          </motion.div>
        )}

        {phase === "calibrating" && (
          <motion.div
            key="calibrating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-[360px] flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 rounded-full bg-text-primary text-white flex items-center justify-center mb-5"
            >
              <Sparkles size={20} strokeWidth={1.5} />
            </motion.div>
            <p className="text-[15px] font-medium text-text-primary mb-1.5">
              Calibrating {name.trim()}…
            </p>
            <CalibrationStatus />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Cycles through three status lines during the calibration beat so the
// user sees specific work happening, not a generic spinner. The lines
// also prime expectation for what will be pre-filled on the detail page.
function CalibrationStatus() {
  const lines = [
    "Drafting the system prompt…",
    "Picking a voice and first message…",
    "Seeding starter FAQs…",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % lines.length), 420);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-[12px] text-text-tertiary tabular-nums min-w-[220px] text-center">
      {lines[i]}
    </p>
  );
}
