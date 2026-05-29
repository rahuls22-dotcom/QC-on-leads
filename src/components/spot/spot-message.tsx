"use client";

import { AlertTriangle, Check, Info, ChevronRight, ArrowRight, Cog } from "lucide-react";
import { SpotMark } from "./spot-mark";
import { SpotLoader } from "./spot-loader";
import { RichText } from "./rich-text";
import type { SpotFinding, SpotKpi, SpotMessage, SpotPart, Verdict, GuidedKind } from "@/lib/spot/types";
import { useSpotStore } from "@/lib/spot/store";

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string; Icon: typeof Check }> = {
    ok: { label: "On track", cls: "pill-ok", Icon: Check },
    warn: { label: "Intervene", cls: "pill-warn", Icon: AlertTriangle },
    err: { label: "Critical", cls: "pill-err", Icon: AlertTriangle },
    info: { label: "Note", cls: "pill-info", Icon: Info },
  };
  const { label, cls, Icon } = map[verdict];
  return (
    <span className={`pill ${cls} flex-shrink-0`} style={{ fontSize: 10.5 }}>
      <Icon size={11} /> {label}
    </span>
  );
}

function HeadlinePart({ text, verdict }: { text: string; verdict?: Verdict }) {
  return (
    <div
      className="flex items-start gap-2 mb-2"
      style={{
        padding: "7px 10px",
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
        borderRadius: 8,
      }}
    >
      <div className="flex-1 text-[12.5px] leading-[1.5] text-text-primary">
        <RichText text={text} />
      </div>
      {verdict && <VerdictBadge verdict={verdict} />}
    </div>
  );
}

function FindingsPart({ items }: { items: SpotFinding[] }) {
  return (
    <div className="space-y-2 mb-2.5">
      {items.map((f, i) => {
        const accent =
          f.tone === "concern" ? "#F5A623" : f.tone === "positive" ? "#22C55E" : "#D4D4D4";
        return (
          <div
            key={i}
            className="card-base bg-white p-3"
            style={{ borderLeftWidth: 3, borderLeftColor: accent }}
          >
            <div className="text-[13px] font-semibold leading-tight mb-1">{f.title}</div>
            <div className="text-[12.5px] text-text-secondary leading-[1.45]">{f.body}</div>
            {f.evidence && f.evidence.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {f.evidence.map((e, j) => (
                  <span key={j} className="pill" style={{ fontSize: 10.5 }}>
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KpisPart({ items }: { items: SpotKpi[] }) {
  return (
    <div
      className="card-base bg-white p-3 mb-2.5 grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12 }}
    >
      {items.map((k, i) => {
        const color =
          k.good === true ? "var(--ok-fg)" : k.good === false ? "var(--err-fg)" : "var(--text-3)";
        return (
          <div key={i}>
            <div className="uplabel" style={{ fontSize: 10 }}>
              {k.label}
            </div>
            <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 600 }}>
              {k.value}
            </div>
            {k.delta && (
              <div className="tabular-nums" style={{ fontSize: 10.5, color }}>
                {k.delta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Per-kind "next step" reply Spot appends inline when a handoff card
// is clicked. No modals: everything happens inside the chat thread, the
// platform pages continue their own work in the background.
const NEXT_STEP: Record<GuidedKind, SpotMessage> = {
  "new-persona": {
    role: "spot",
    parts: [
      { type: "headline", text: "Starting persona research.", verdict: "info" },
      {
        type: "findings",
        items: [
          { tone: "neutral", title: "Pulling existing personas linked to this product", body: "I'll look at every persona already approved against this product's memory and surface the ones that historically work." },
          { tone: "neutral", title: "Sweeping comparable products", body: "Cross-checking Banerghatta + Yelahanka audience overlap to recommend net-new personas worth testing." },
          { tone: "neutral", title: "Drafting persona briefs", body: "For each candidate I'll write identity, pain, desire, and the channels where they perform — you approve or refine." },
        ],
      },
      { type: "text", text: "Reply with **approve** to lock the existing personas, or ask me to research a specific cohort first." },
    ],
  },
  "new-angle": {
    role: "spot",
    parts: [
      { type: "headline", text: "Drafting angles.", verdict: "info" },
      { type: "text", text: "I'll write 2–3 angle drafts (hook + CTA) per approved persona. Each shows up as a card on the persona's page — accept inline, no modal." },
    ],
  },
  "launch-creative": {
    role: "spot",
    parts: [
      { type: "headline", text: "Briefing the Creative Agent.", verdict: "info" },
      { type: "text", text: "The Creative Agent is generating statics + video shells against the approved angles. You'll see them appear on **Creatives** as they're ready — keep working here while I run." },
    ],
  },
  "new-campaign": {
    role: "spot",
    parts: [
      { type: "headline", text: "Structuring the campaign.", verdict: "info" },
      { type: "text", text: "I'm assembling campaign → ad sets → ads on Meta and Google. Revspot stays read-only on those entities; you'll get a link out when it's time to launch." },
    ],
  },
  "new-adset": {
    role: "spot",
    parts: [
      { type: "headline", text: "Building the ad set.", verdict: "info" },
      { type: "text", text: "Picking audiences from the linked personas and pacing budget across them." },
    ],
  },
};

function HandoffPart({ kind, label, reason }: { kind: GuidedKind; label: string; reason: string }) {
  const setThread = useSpotStore((s) => s.setThread);
  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT_STEP[kind];
        if (next) setThread((prev) => [...prev, next]);
      }}
      className="card-base hover-row text-left w-full p-3 flex items-center gap-3 mb-2.5"
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-[7px] flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #FAF8F2 0%, #FFF 100%)", border: "1px solid #E8C97A" }}
      >
        <SpotMark size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
          Next step
        </div>
        <div className="text-[13.5px] font-semibold">{label}</div>
        <div className="text-[11.5px] text-text-secondary mt-0.5">{reason}</div>
      </div>
      <ChevronRight size={14} className="text-text-tertiary flex-shrink-0" />
    </button>
  );
}

function StepCtaPart({ label, helper, refineHint }: { label: string; helper?: string; refineHint?: string }) {
  const advanceWorkflow = useSpotStore((s) => s.advanceWorkflow);
  const appendMessage = useSpotStore((s) => s.appendMessage);
  const clicked = useSpotStore((s) => s.clickedCtas.has(label));
  const markClicked = useSpotStore((s) => s.markCtaClicked);

  // After the user clicks a CTA, hide the button entirely · their echo
  // message + the next Spot reply already captured the decision, so
  // showing the same dark button alongside their own dark bubble reads
  // redundant.
  if (clicked) return null;

  const handleClick = () => {
    appendMessage({ role: "user", text: label });
    markClicked(label);
    advanceWorkflow();
  };

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-semibold transition-colors"
        style={{
          background:
            "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
          color: "#0A0A09",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {label}
        <ArrowRight size={10} strokeWidth={2.4} />
      </button>
      {(helper || refineHint) && (
        <div className="text-[10.5px] text-text-tertiary mt-1 leading-snug">
          {helper}
          {helper && refineHint && <span> · </span>}
          {refineHint}
        </div>
      )}
    </div>
  );
}

function ToolCallPart({ agent, detail, status }: { agent: string; detail?: string; status: "running" | "done" }) {
  const running = status === "running";
  // Inline thinking line — no card, no border. Single row that reads
  // like a Claude "tool call" trace. While running, the agent name is
  // shown alone; once done it greys out so the page doesn't shout.
  return (
    <div className="mb-1.5 flex items-baseline gap-1.5 text-[11.5px] leading-[1.5]">
      {running ? (
        <Cog
          size={10}
          strokeWidth={1.8}
          className="text-text-secondary relative top-[1.5px] animate-spin"
          style={{ animationDuration: "2s" }}
        />
      ) : (
        <Check size={10} strokeWidth={2.2} className="text-[#15803D] relative top-[1.5px]" />
      )}
      <span className={running ? "text-text-secondary" : "text-text-tertiary"}>
        <span className="font-medium">{agent}</span>
        {detail && (
          <>
            <span className="text-text-tertiary"> · </span>
            <span>{detail}</span>
          </>
        )}
      </span>
    </div>
  );
}

function PartRenderer({ part }: { part: SpotPart }) {
  switch (part.type) {
    case "headline":
      return <HeadlinePart text={part.text} verdict={part.verdict} />;
    case "findings":
      return <FindingsPart items={part.items} />;
    case "kpis":
      return <KpisPart items={part.items} />;
    case "handoff":
      return <HandoffPart kind={part.kind} label={part.label} reason={part.reason} />;
    case "step-cta":
      return <StepCtaPart label={part.label} helper={part.helper} refineHint={part.refineHint} />;
    case "tool-call":
      return <ToolCallPart agent={part.agent} detail={part.detail} status={part.status} />;
    case "text":
      return (
        <div className="text-[12.5px] leading-[1.55] mb-1.5">
          <RichText text={part.text} />
        </div>
      );
  }
}

export function MessageBubble({
  message,
  animate,
}: {
  message: SpotMessage;
  animate?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-2.5">
        <div
          style={{
            background: "var(--chat-user-bg)",
            color: "var(--chat-user-fg)",
            padding: "7px 11px",
            borderRadius: 10,
            borderBottomRightRadius: 4,
            fontSize: 12.5,
            maxWidth: "85%",
            lineHeight: 1.5,
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }
  // Spot messages render avatar-less, Claude-style. The Spot mark
  // lives in the chat header (with a live indicator when an agent is
  // actually working) so the chat thread isn't a column of repeated icons.
  return (
    <div className={`${animate ? "fadeUp" : ""} mb-2.5`}>
      {message.parts.map((p, i) => (
        <PartRenderer key={i} part={p} />
      ))}
    </div>
  );
}

export function TypingDots() {
  // Use the brand "Spot is typing" dots — three rounded-square pearls
  // in a chat bubble. Stop rendering as soon as Spot's first character
  // streams in (handled by the caller).
  return (
    <div className="mb-2.5">
      <SpotLoader mode="dots" />
    </div>
  );
}
