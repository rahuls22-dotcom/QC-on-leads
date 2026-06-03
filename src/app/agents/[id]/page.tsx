"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pause,
  Play,
  Pencil,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAgent,
  getAgentDetail,
  signalLabel,
  type Agent,
  type Signal,
} from "@/lib/agents-data";
import {
  AgentStatusPill,
  Breadcrumbs,
  ScoreBar,
  ScoreNumber,
} from "@/components/agents/bits";
import { useAgentsUI, useAgentStatus } from "@/components/agents/agents-ui";

export default function ScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agent = findAgent(id);
  if (!agent) notFound();

  const detail = getAgentDetail(agent);

  return (
    <div className="px-8 py-6 max-w-[1080px] mx-auto">
      <Breadcrumbs
        items={[{ label: "Agents", href: "/agents" }, { label: agent.name }]}
      />

      <Header agent={agent} />

      {agent.insufficientData ? (
        <InsufficientState agent={agent} />
      ) : detail ? (
        <FullScorecard agent={agent} detail={detail} />
      ) : (
        <MinimalScorecard agent={agent} />
      )}
    </div>
  );
}

// ── Header with pause/resume ──────────────────────────────────────────────

function Header({ agent }: { agent: Agent }) {
  const router = useRouter();
  const status = useAgentStatus(agent.id);
  const { openPause, openResume } = useAgentsUI();
  const detail = getAgentDetail(agent);

  const subtitle = detail
    ? `${agent.phone ?? agent.id} · owner @${detail.owner}`
    : `${agent.phone ?? agent.id} · ${agent.callCount} calls scored`;

  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div>
        <h1 className="text-[22px] font-bold text-foreground">{agent.name}</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <AgentStatusPill status={status} />
        {status !== "draft" &&
          (status === "paused" ? (
            <button
              onClick={() => openResume(agent.id)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-success text-white text-[13px] font-medium hover:brightness-110 transition"
            >
              <Play size={14} strokeWidth={2} />
              Resume
            </button>
          ) : (
            <button
              onClick={() => openPause(agent.id)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-destructive text-white text-[13px] font-medium hover:brightness-110 transition"
            >
              <Pause size={14} strokeWidth={2} />
              Pause
            </button>
          ))}
        <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-foreground text-[13px] hover:bg-secondary transition">
          <Pencil size={14} strokeWidth={2} />
          Edit
        </button>
        <button
          onClick={() => router.push("/agents")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-foreground text-[13px] hover:bg-secondary transition"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back
        </button>
      </div>
    </div>
  );
}

// ── Slim summary strip (replaces the old hero tiles) ──────────────────────

function StatCell({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card px-4 py-2.5 flex-1 min-w-[130px]">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[14px] font-medium text-foreground tabular">
        {children ?? value}
      </div>
    </div>
  );
}

function SummaryStrip({ cells }: { cells: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-stretch gap-px rounded-xl border border-border-subtle bg-border-subtle overflow-hidden mb-6">
      {cells}
    </div>
  );
}

// ── Full scorecard (wired demo agent) ─────────────────────────────────────

function FullScorecard({
  agent,
  detail,
}: {
  agent: Agent;
  detail: NonNullable<ReturnType<typeof getAgentDetail>>;
}) {
  const lowest = detail.signals.find((s) => s.isLowest)?.id;
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(lowest ? [lowest] : []),
  );
  const toggle = (sid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });

  return (
    <>
      <SummaryStrip
        cells={
          <>
            <StatCell label="Composite score">
              <div className="flex items-center gap-2.5">
                <ScoreNumber
                  score={agent.composite!}
                  className="text-[20px] leading-none"
                />
                <ScoreBar score={agent.composite!} className="w-16" />
              </div>
            </StatCell>
            <StatCell label="Qualification rate" value={`${detail.qr}%`} />
            <StatCell
              label="Calls in window"
              value={`${agent.callCount}`}
            />
            <StatCell label="Updated" value={detail.lastUpdated} />
          </>
        }
      />

      {/* Possible reasons — now the lead section, full width */}
      <section className="mb-7">
        <h2 className="text-[15px] font-semibold text-foreground">
          Top reasons the score dropped
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">
          The biggest contributors to the composite, most impactful first.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {detail.reasons.map((r, i) => (
            <div
              key={r.metric}
              className="rounded-xl border border-border-subtle bg-card p-4 flex flex-col"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full text-[11px] font-semibold inline-flex items-center justify-center shrink-0",
                    i === 0
                      ? "bg-destructive-bg text-destructive"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="text-[12px] text-muted-foreground truncate">
                  {r.metric} · {r.calls} calls
                </span>
              </div>
              <div className="text-[13.5px] font-medium text-foreground mt-2.5">
                {r.title}
              </div>
              <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed flex-1">
                {r.body}
              </div>
              <Link
                href={`/agents/${agent.id}/calls?focus=${encodeURIComponent(r.metric)}`}
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline mt-3"
              >
                View affected calls
                <ChevronRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Signal breakdown */}
      <section>
        <h2 className="text-[15px] font-semibold text-foreground">
          Signal breakdown
        </h2>
        <p className="text-[12px] text-muted-foreground mt-0.5 mb-3">
          Four quality signals make up the composite. Expand a signal to see the
          checks behind it.
        </p>
        <div className="space-y-2.5">
          {detail.signals.map((sig) => (
            <SignalBlock
              key={sig.id}
              agentId={agent.id}
              signal={sig}
              expanded={expanded.has(sig.id)}
              onToggle={() => toggle(sig.id)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function SignalBlock({
  agentId,
  signal,
  expanded,
  onToggle,
}: {
  agentId: string;
  signal: Signal;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        signal.isLowest
          ? "border-border-subtle border-l-2 border-l-destructive/50"
          : "border-border-subtle",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-foreground truncate">
              {signal.name}
            </span>
            {signal.isLowest && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground shrink-0">
                Lowest
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {signal.description}
          </div>
        </div>
        <span className="text-[11.5px] text-muted-foreground shrink-0 whitespace-nowrap">
          {signal.weight}% weight
        </span>
        <span className="w-24 shrink-0">
          <ScoreBar score={signal.score} />
        </span>
        <ScoreNumber
          score={signal.score}
          className="text-[14px] w-7 text-right shrink-0"
        />
        <ChevronRight
          size={15}
          strokeWidth={2}
          className={cn(
            "text-muted-foreground shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border-subtle divide-y divide-border-subtle">
          {signal.subsignals.map((sub) => (
            <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-foreground truncate">
                  {sub.name}
                </div>
                <div className="text-[11.5px] text-muted-foreground truncate">
                  {sub.description}
                </div>
              </div>
              <ScoreNumber
                score={sub.score}
                className="text-[12.5px] w-7 text-right shrink-0"
              />
              <span className="w-20 shrink-0">
                <ScoreBar score={sub.score} />
              </span>
              <Link
                href={`/agents/${agentId}/calls?focus=${encodeURIComponent(sub.name)}`}
                className="text-[12px] font-medium text-primary hover:underline whitespace-nowrap shrink-0"
              >
                {sub.calls} calls →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Minimal scorecard (agents without full detail) ────────────────────────

function MinimalScorecard({ agent }: { agent: Agent }) {
  const router = useRouter();
  return (
    <>
      <SummaryStrip
        cells={
          <>
            <StatCell label="Composite score">
              <ScoreNumber
                score={agent.composite!}
                className="text-[20px] leading-none"
              />
            </StatCell>
            <StatCell label="Calls in window" value={`${agent.callCount}`} />
            <StatCell
              label="Lowest signal"
              value={signalLabel(agent.lowestSignal)}
            />
          </>
        }
      />

      <div className="rounded-xl border border-border-subtle bg-card p-10 text-center">
        <p className="text-[13.5px] text-muted-foreground">
          Full check-by-check drill-down is wired for the demo agent only.
        </p>
        <button
          onClick={() => router.push("/agents/a3")}
          className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition mt-4"
        >
          View full demo (Ramky Fortuna)
        </button>
      </div>
    </>
  );
}

// ── Insufficient-data state ───────────────────────────────────────────────

function InsufficientState({ agent }: { agent: Agent }) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning-bg/40 p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center shrink-0">
        <AlertTriangle size={18} strokeWidth={2} />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-foreground">
          Insufficient data
        </div>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed max-w-[640px]">
          Only {agent.callCount} calls scored — composite and signal scores need
          ≥10 calls to be reliable. Alerts are disabled until then.
        </p>
      </div>
    </div>
  );
}
