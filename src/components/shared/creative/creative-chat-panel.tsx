"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { motion } from "framer-motion";
import type { ChatMessage } from "./types";

interface CreativeChatPanelProps {
  messages: ChatMessage[];
  /** Disabled while the AI is generating — composer should be locked. */
  isGenerating: boolean;
  /** Called when user sends a refinement message. */
  onSend: (text: string) => void;
  /** Composer placeholder. */
  placeholder?: string;
  /** Empty-state message shown when messages array is empty. */
  emptyMessage?: string;
  /**
   * When true the user is still in picker mode (no active concept). The composer
   * is rendered visually disabled with a "pick a concept first" hint, and Enter
   * is a no-op.
   */
  isPickerMode?: boolean;
}

export function CreativeChatPanel({
  messages,
  isGenerating,
  onSend,
  placeholder = "Refine the concept… e.g., make the headline more urgent",
  emptyMessage = "Send a message to refine this concept.",
  isPickerMode = false,
}: CreativeChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever messages change.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const locked = isGenerating || isPickerMode;

  const submit = () => {
    const text = draft.trim();
    if (!text || locked) return;
    onSend(text);
    setDraft("");
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const composerPlaceholder = isPickerMode
    ? "Pick a concept on the right to start refining"
    : placeholder;

  return (
    <div className="flex flex-col h-full bg-surface-page">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-[12px] text-text-tertiary">
            {emptyMessage}
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder={composerPlaceholder}
            rows={2}
            disabled={locked}
            className="flex-1 px-3 py-2 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none leading-relaxed disabled:bg-surface-page disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || locked}
            className="h-9 w-9 inline-flex items-center justify-center bg-accent text-white rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Send"
          >
            <Send size={14} strokeWidth={1.5} />
          </button>
        </div>
        <p className="text-[10px] text-text-tertiary mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message bubble                                                     */
/* ------------------------------------------------------------------ */

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="flex justify-end"
      >
        <div className="flex items-start gap-2 max-w-[85%]">
          <div className="bg-accent text-white text-[13px] leading-relaxed rounded-card px-3 py-2 whitespace-pre-wrap">
            {message.text}
          </div>
          <div className="w-6 h-6 rounded-full bg-text-primary flex items-center justify-center shrink-0 mt-0.5">
            <User size={12} strokeWidth={1.5} className="text-white" />
          </div>
        </div>
      </motion.div>
    );
  }

  // AI bubble
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex"
    >
      <div className="flex items-start gap-2 max-w-[92%]">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <Sparkles size={12} strokeWidth={1.5} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="bg-white border border-border text-[13px] leading-relaxed text-text-primary rounded-card px-3 py-2">
            {message.pending ? (
              <div className="flex items-center gap-2 text-text-tertiary">
                <span className="h-3 w-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Thinking…
              </div>
            ) : (
              message.text
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
