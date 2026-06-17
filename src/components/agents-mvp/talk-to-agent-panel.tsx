"use client";

/**
 * Talk-to-agent panel — slide-in chat surface that closes the "create
 * → test" dopamine loop.
 *
 * Stays a chat (not WebRTC) on purpose for the demo: faster to build,
 * faster for the user to try, and the conversation is replayable. The
 * agent's responses are scripted from the calibrated system prompt /
 * greeting / intent signals — we don't call an LLM, we pattern-match
 * the user's last message against a tiny rules table and pick a reply
 * that quotes the agent's own prompt back. Feels coherent because the
 * prompt was woven from the user's own goal text upstream.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, RotateCcw } from "lucide-react";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";

type Speaker = "agent" | "user";
interface Message {
  id: string;
  speaker: Speaker;
  text: string;
}

interface Props {
  agent: AgentMvpDetail;
  open: boolean;
  onClose: () => void;
}

// Render the agent's greeting with {{customer_name}} resolved. The demo
// caller is always "Priya" — picking a real-looking name beats showing
// the raw template variable in front of the user.
function resolveGreeting(template: string): string {
  return template.replace(/\{\{\s*customer_name\s*\}\}/gi, "Priya");
}

// Pull a few short headlines from the calibrated prompt so the scripted
// reply table can quote them back. Cheap, works because the prompt has
// a stable section structure we authored ourselves.
function readPromptSignals(agent: AgentMvpDetail) {
  const t = agent.systemPrompt.toLowerCase();
  return {
    hasBudget:   /budget/.test(t),
    hasTimeline: /timeline|when/.test(t),
    hasHandoff:  /transfer|hand.?off|human/.test(t),
    hasBook:     /book|appoint|schedul|slot|meet/.test(t),
    hasSupport:  /ticket|complain|issue|support/.test(t),
  };
}

function pickReply(agent: AgentMvpDetail, userText: string, history: Message[]): string {
  const s = readPromptSignals(agent);
  const t = userText.toLowerCase();
  const turn = history.filter((m) => m.speaker === "agent").length;

  // Stop sequences first — never ignore a user trying to disengage.
  if (/^(stop|cancel|end|hang ?up|bye|nothing|not now)/.test(t)) {
    return s.hasHandoff
      ? `No problem — I'll have a human follow up if anything changes. Thanks for your time.`
      : `Got it — thanks for the time. I'll close this out.`;
  }
  if (/(human|person|agent|talk to someone)/.test(t)) {
    return s.hasHandoff
      ? `Of course — transferring you to a teammate now. One moment.`
      : `I'll note that down and have a teammate reach out shortly.`;
  }

  // Topic-driven replies — quote the agent's own purpose so the user
  // feels the prompt is doing the work.
  if (/budget|price|cost|cr|lakh|crore|₹|\$/.test(t)) {
    return s.hasBudget
      ? `Great — and that budget includes registration and amenities, or is it just the unit?`
      : `Noted. I'll log the budget and make sure the right teammate sees it.`;
  }
  if (/(when|month|quarter|year|asap|urgent|timeline|move|in a hurry)/.test(t)) {
    return s.hasTimeline
      ? `Helpful. Are you also looking to move in by then, or planning ahead?`
      : `Understood. I'll capture that and pass it along.`;
  }
  if (/(book|appoint|meet|slot|tomorrow|next week|schedule)/.test(t)) {
    return s.hasBook
      ? `I can hold either Thursday 4pm or Friday 11am — which works better?`
      : `I'll have someone reach out to find a time that works.`;
  }
  if (/(issue|broken|not working|problem|complain|ticket)/.test(t)) {
    return s.hasSupport
      ? `Sorry you're running into that. Quick check — is this blocking you right now, or more of a nuisance?`
      : `Got it — I'll log this so the right team can follow up.`;
  }

  // Conversational fallbacks — by turn so the agent doesn't loop.
  const generic = [
    `Got it. And just so I capture this correctly — what's the most important outcome for you here?`,
    `Makes sense. Anything else I should keep in mind before I wrap this up?`,
    `Okay — I'll note that. Last thing: what's the best time to reach you if we need to follow up?`,
    `Thanks for sharing. I have what I need — anything you want to ask me before we end?`,
  ];
  return generic[Math.min(turn - 1, generic.length - 1)] ?? generic[0];
}

export function TalkToAgentPanel({ agent, open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Seed the greeting when the panel opens (or reopens). Cleared on
  // close so the next open starts fresh — testing the bot isn't a
  // long-running conversation, it's a quick sanity check.
  useEffect(() => {
    if (!open) return;
    setMessages([
      { id: "g0", speaker: "agent", text: resolveGreeting(agent.greetingTemplate) },
    ]);
    setDraft("");
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, agent.id, agent.greetingTemplate]);

  // Scroll to the bottom whenever a message lands or the agent starts typing.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, agentTyping]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: Message = { id: `u-${messages.length}`, speaker: "user", text };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setAgentTyping(true);
    // Pause briefly before the reply so the exchange feels turn-based
    // rather than instant — voice agents pace themselves.
    setTimeout(() => {
      setMessages((m) => {
        const reply: Message = {
          id: `a-${m.length}`,
          speaker: "agent",
          text: pickReply(agent, text, m),
        };
        return [...m, reply];
      });
      setAgentTyping(false);
    }, 650);
  };

  const reset = () => {
    setMessages([
      { id: "g0", speaker: "agent", text: resolveGreeting(agent.greetingTemplate) },
    ]);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim — clicking it dismisses, like a drawer. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 w-[440px] bg-white border-l border-border z-50 flex flex-col shadow-2xl"
            role="dialog"
            aria-label={`Talk to ${agent.name}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-border-subtle">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#15803D]" aria-hidden />
                  <p className="text-[13px] font-semibold text-text-primary truncate">
                    Talking to {agent.name}
                  </p>
                </div>
                <p className="text-[11.5px] text-text-tertiary mt-0.5">
                  Chat-style test — same prompt, same persona.
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={reset}
                  title="Restart conversation"
                  className="p-1.5 rounded-button text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
                >
                  <RotateCcw size={14} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Close"
                  className="p-1.5 rounded-button text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors"
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Calibration breadcrumb — reminds the user this bot is
                running off the goal they typed, not magic. */}
            <div className="px-5 py-2 bg-[#FAF8F2] border-b border-[#E9DEC2] flex items-center gap-2">
              <Sparkles size={11} strokeWidth={2} className="text-[#92400E] shrink-0" />
              <p className="text-[11px] text-[#92400E] leading-snug truncate">
                Calibrated from your goal — edit the prompt to change the answers.
              </p>
            </div>

            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} agentName={agent.name} />
              ))}
              {agentTyping && (
                <div className="flex items-center gap-1 px-3 py-2 text-text-tertiary">
                  <Dot delay={0} />
                  <Dot delay={150} />
                  <Dot delay={300} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-border-subtle px-4 py-3">
              <div className="flex items-center gap-2 bg-surface-page rounded-input border border-border focus-within:border-text-primary transition-colors">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={`Reply as a caller…`}
                  className="flex-1 bg-transparent px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim()}
                  className="mr-1.5 inline-flex items-center justify-center w-7 h-7 rounded-button bg-text-primary text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  aria-label="Send"
                >
                  <Send size={12} strokeWidth={2} />
                </button>
              </div>
              <p className="text-[10.5px] text-text-tertiary mt-1.5 px-1">
                Real call testing comes later — this chat uses the agent's calibrated prompt.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ message, agentName }: { message: Message; agentName: string }) {
  const isAgent = message.speaker === "agent";
  return (
    <div className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}>
      <span className="text-[10px] text-text-tertiary mb-0.5 px-1">
        {isAgent ? agentName : "You"}
      </span>
      <div
        className={`max-w-[88%] px-3 py-2 rounded-card text-[13px] leading-snug ${
          isAgent
            ? "bg-surface-page text-text-primary"
            : "bg-text-primary text-white"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="w-1.5 h-1.5 rounded-full bg-text-tertiary"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 0.9, repeat: Infinity, delay: delay / 1000 }}
    />
  );
}
