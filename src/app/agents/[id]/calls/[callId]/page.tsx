"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAgent,
  callDetail,
  scoreTextClass,
  type CallTurn,
} from "@/lib/agents-data";
import {
  Breadcrumbs,
  ConfPill,
  OutcomeBadge,
} from "@/components/agents/bits";

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string; callId: string }>;
}) {
  const { id, callId } = use(params);
  const agent = findAgent(id);
  if (!agent) notFound();

  const router = useRouter();
  // Only one call transcript is wired in the prototype; route param is the label.
  const c = callDetail;
  const flagged = c.turns.filter((t) => t.flag).length;

  return (
    <div className="px-8 py-6 max-w-[920px] mx-auto">
      <Breadcrumbs
        items={[
          { label: "Agents", href: "/agents" },
          { label: agent.name, href: `/agents/${agent.id}` },
          { label: "Affected calls", href: `/agents/${agent.id}/calls` },
          { label: callId },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tabular">
            Call {c.id}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {agent.name} · {c.time}
          </p>
        </div>
        <button
          onClick={() => router.push(`/agents/${agent.id}/calls`)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-foreground text-[13px] hover:bg-secondary transition"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to calls
        </button>
      </div>

      {/* Meta strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px rounded-lg border border-border bg-border overflow-hidden mb-6">
        <Meta label="Duration" value={c.duration} />
        <Meta label="Outcome">
          <OutcomeBadge outcome={c.outcome} />
        </Meta>
        <Meta label="Composite">
          <span className={cn("font-bold tabular", scoreTextClass(c.composite))}>
            {c.composite}
          </span>
        </Meta>
        <Meta label="Flagged turns" value={`${flagged} / ${c.turns.length}`} />
        <Meta label="Audio">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            —
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-info-bg text-info">
              V1.1
            </span>
          </span>
        </Meta>
      </div>

      <h2 className="text-[15px] font-semibold text-foreground mb-3">
        Transcript
      </h2>
      <div className="space-y-2.5">
        {c.turns.map((t, i) => (
          <Turn key={i} turn={t} />
        ))}
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[14px] font-medium text-foreground tabular">
        {children ?? value}
      </div>
    </div>
  );
}

function Turn({ turn }: { turn: CallTurn }) {
  const isBot = turn.speaker === "bot";
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        turn.flag
          ? "border-destructive/40 bg-destructive-bg/30"
          : "border-border-subtle bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-[68px] shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
              isBot
                ? "bg-info-bg text-info"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {isBot ? "Agent" : "Customer"}
          </span>
          <div className="text-[11px] text-muted-foreground tabular mt-1">
            {turn.t}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] text-foreground leading-relaxed">
            {turn.text}
          </p>
          {turn.flag && (
            <div className="mt-2.5 rounded-lg border border-destructive/30 bg-card px-3 py-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10.5px] font-semibold bg-destructive-bg text-destructive tabular">
                  {turn.flag.signal}
                </span>
                <span className="text-[12.5px] font-semibold text-foreground">
                  {turn.flag.subsignal}
                </span>
                <ConfPill conf={turn.flag.confidence} />
              </div>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                {turn.flag.reason}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
