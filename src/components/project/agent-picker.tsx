"use client";

import { Check, Phone, MessageCircle, Slash } from "lucide-react";

export type AgentOption = {
  id: string;
  name: string;
  description: string;
  channel: "voice" | "whatsapp";
};

export const AGENT_OPTIONS: AgentOption[] = [
  {
    id: "agent-qualifier",
    name: "Lead Qualifier",
    description: "Calls within 90s to verify intent, budget, and timeline.",
    channel: "voice",
  },
  {
    id: "agent-site-visit",
    name: "Site-Visit Booker",
    description: "WhatsApp follow-up that books a site visit when the lead is warm.",
    channel: "whatsapp",
  },
  {
    id: "agent-reengagement",
    name: "Re-engagement",
    description: "WhatsApp nudge for leads that go silent for 5+ days.",
    channel: "whatsapp",
  },
];

export function getAgentName(id: string | null | undefined): string | null {
  if (!id) return null;
  return AGENT_OPTIONS.find((a) => a.id === id)?.name || null;
}

export function AgentPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  compact?: boolean;
}) {
  const tileStyle = (active: boolean) =>
    ({
      borderColor: active ? "#1A1A1A" : "var(--border)",
      background: active ? "#FAF7FF" : "#FFF",
    }) as React.CSSProperties;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div
        className={compact ? "grid gap-1.5" : "grid gap-2"}
        style={{ gridTemplateColumns: compact ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {AGENT_OPTIONS.map((a) => {
          const active = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(active ? null : a.id)}
              className="card-base text-left p-2.5 flex items-start gap-2"
              style={tileStyle(active)}
            >
              <span
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: a.channel === "voice" ? "#EAF1FF" : "#E5FAEC",
                  color: a.channel === "voice" ? "#1E5BFF" : "#15803D",
                }}
              >
                {a.channel === "voice" ? <Phone size={11} /> : <MessageCircle size={11} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-semibold truncate">{a.name}</span>
                  {active && <Check size={11} style={{ color: "var(--ok-fg)" }} />}
                </div>
                <div className="text-[10.5px] text-text-tertiary leading-[1.4] mt-0.5">
                  {a.description}
                </div>
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(null)}
          className="card-base text-left p-2.5 flex items-start gap-2"
          style={tileStyle(value === null)}
        >
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: "var(--bg-secondary)",
              color: "var(--text-tertiary)",
            }}
          >
            <Slash size={11} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-semibold">No agent</span>
              {value === null && <Check size={11} style={{ color: "var(--ok-fg)" }} />}
            </div>
            <div className="text-[10.5px] text-text-tertiary leading-[1.4] mt-0.5">
              Leads go straight to your CRM.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
