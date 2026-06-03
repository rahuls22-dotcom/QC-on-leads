"use client";

import { useState } from "react";
import { Filter, Phone, UserCheck, Zap } from "lucide-react";
import { WAGuard } from "@/components/channels/wa-guard";

const conversations = [
  {
    id: "1",
    initials: "RM",
    number: "+91 98765 43210",
    lastMessage: "Yes, I'd like to visit on Saturday morning…",
    time: "2m",
    tag: { label: "Hot", className: "bg-green-50 text-green-700 border border-green-200" },
    active: true,
  },
  {
    id: "2",
    initials: "PS",
    number: "+91 88234 11875",
    lastMessage: "Can you share the price for 3 BHK…",
    time: "14m",
    tag: null,
    active: false,
  },
  {
    id: "3",
    initials: "AK",
    number: "+91 77990 56123",
    lastMessage: "STOP",
    time: "1h",
    tag: { label: "Opt-out", className: "bg-red-50 text-red-700 border border-red-200" },
    active: false,
  },
  {
    id: "4",
    initials: "VT",
    number: "+91 99876 11200",
    lastMessage: "Send another time please",
    time: "3h",
    tag: null,
    active: false,
  },
];

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState("1");
  const selected = conversations.find((c) => c.id === selectedId)!;

  return (
    <WAGuard>
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary leading-tight flex items-center gap-2.5">
            WhatsApp Conversations
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase tracking-wide">
              Q2 · Reply detection
            </span>
          </h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Replies captured via webhook. In Q3 the WhatsApp AI Bot continues conversations automatically — for now you can hand off to a human.
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium border border-border text-text-secondary hover:bg-surface-secondary transition-colors">
          <Filter size={13} strokeWidth={1.5} />
          Filter
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "320px 1fr" }}>
        {/* Left: conversation list */}
        <div className="bg-white border border-border rounded-[8px] overflow-hidden" style={{ height: 580 }}>
          <div className="sticky top-0 bg-white border-b border-border px-3 py-2.5">
            <input
              type="text"
              placeholder="Search conversations…"
              className="w-full px-3 py-1.5 border border-border rounded-[7px] text-[12.5px] text-text-primary bg-white focus:outline-none focus:border-text-primary"
            />
          </div>

          <div className="overflow-y-auto" style={{ height: "calc(100% - 52px)" }}>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full flex items-start gap-3 px-3.5 py-3 border-b border-border last:border-0 text-left transition-colors ${
                  selectedId === conv.id ? "bg-[#f0f9ff]" : "hover:bg-[#fafbfc]"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#e8f7f0] text-[#15803d] flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                  {conv.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-text-primary">{conv.number}</div>
                  <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">{conv.lastMessage}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] text-text-tertiary">{conv.time}</div>
                  {conv.tag && (
                    <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold border ${conv.tag.className}`}>
                      {conv.tag.label}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: chat view */}
        <div className="bg-white border border-border rounded-[8px] overflow-hidden flex flex-col" style={{ height: 580 }}>
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#e8f7f0] text-[#15803d] flex items-center justify-center text-[10px] font-bold">
                {selected.initials}
              </div>
              <div>
                <div className="font-semibold text-[13px] text-text-primary">
                  Rahul M. · {selected.number}
                </div>
                <div className="text-[11px] text-text-tertiary mt-0.5">
                  Lead from &quot;Acme Greens&quot; · Score:{" "}
                  <strong className="text-green-600">82 (Hot)</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium border border-border text-text-secondary hover:bg-surface-secondary transition-colors">
                <UserCheck size={13} strokeWidth={1.5} />
                Assign to human
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-semibold bg-text-primary text-white hover:bg-charcoal-light transition-colors">
                <Phone size={13} strokeWidth={1.5} />
                Trigger voice call
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {/* Sequence label */}
            <div className="text-center text-[10.5px] text-text-tertiary px-3 py-1.5 bg-surface-secondary rounded-[5px] self-center">
              Sequence: New lead → site visit · Step 1
            </div>

            {/* Bot message */}
            <div className="flex flex-col gap-0.5 max-w-[70%]">
              <div className="bg-white border border-border rounded-[10px] rounded-bl-[3px] shadow-sm p-2.5 text-[12.5px] leading-snug">
                <div className="bg-surface-secondary h-16 rounded-[5px] mb-2 flex items-center justify-center text-[10px] text-text-tertiary">
                  [Acme Greens header]
                </div>
                Hi <strong>Rahul</strong>, would you like to visit our Acme Greens project this Saturday at <strong>11:00 AM</strong>?
                <div className="text-[9px] text-text-tertiary mt-1 text-right">10:24 AM ✓✓</div>
              </div>
            </div>

            {/* User reply */}
            <div className="flex flex-col gap-0.5 max-w-[70%] self-end">
              <div className="bg-[#dcf8c6] rounded-[10px] rounded-br-[3px] shadow-sm p-2.5 text-[12.5px] leading-snug text-[#0b3d2c]">
                Yes, I&apos;d like to visit on Saturday morning. Can someone call me to confirm?
                <div className="text-[9px] text-[#6b7280] mt-1 text-right">10:31 AM</div>
              </div>
            </div>

            {/* Automation event */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-[5px] text-[10.5px] font-medium self-center">
              <Zap size={11} strokeWidth={2} />
              Reply detected · Branch: &quot;replied&quot; · Triggered Voice call (Step 2a)
            </div>

            {/* Bot confirmation */}
            <div className="flex flex-col gap-0.5 max-w-[70%]">
              <div className="bg-white border border-border rounded-[10px] rounded-bl-[3px] shadow-sm p-2.5 text-[12.5px] leading-snug">
                Confirmed your visit for <strong>Saturday, 11 May, 11:00 AM</strong>. Aanya from our team will call you in a moment to share directions.
                <div className="text-[9px] text-text-tertiary mt-1 text-right">10:31 AM ✓✓</div>
              </div>
            </div>

            {/* Voice call event */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#f0f9ff] border border-blue-100 text-[#0369a1] rounded-[5px] text-[10.5px] font-medium self-center">
              <Phone size={11} strokeWidth={2} />
              Voice call placed · 03:24 · qualified · site visit booked ·{" "}
              <span className="underline cursor-pointer">view transcript</span>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-[#fafbfc] flex-shrink-0">
            <input
              type="text"
              disabled
              placeholder="Type a message… (Q3 · WhatsApp AI Bot will auto-handle qualifying replies)"
              className="flex-1 px-3 py-1.5 border border-border rounded-[7px] text-[12px] text-text-secondary bg-surface-secondary cursor-not-allowed"
            />
            <button className="px-3 py-1.5 rounded-[6px] text-[11.5px] font-semibold bg-text-primary text-white opacity-50 cursor-not-allowed">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
    </WAGuard>
  );
}
