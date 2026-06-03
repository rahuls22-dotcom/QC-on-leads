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
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAgent,
  getAgentDetail,
  scoreTextClass,
  type Agent,
  type Signal,
} from "@/lib/agents-data";
import {
  AgentStatusPill,
  Breadcrumbs,
  ConfPill,
  ScoreBar,
  ScoreNumber,
  Sparkline,
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
    <div className="px-8 py-6 max-w-[1280px] mx-auto">
      <Breadcrumbs
        items={[
          { label: "Agents", href: "/agents" },
          { label: agent.name },
        ]}
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
    ? `${agent.phone ?? agent.id} · owner @${detail.owner} · ${agent.callCount} calls in rolling window`
    : `${agent.phone ?? agent.id} · ${agent.callCount} calls scored`;

  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
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

// ── Hero tiles ────────────────────────────────────────────────────────────

function Tile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-secondary bg-card p-4">
      <div className="text-xs text-secondary-foreground">{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function CompositeTile({ agent }: { agent: Agent }) {
  const trend = agent.trend ?? 0;
  const down = trend < 0;
  return (
    <Tile label="Composite score">
      <ScoreNumber score={agent.composite!} className="text-[34px] leading-none" />
      <ScoreBar score={agent.composite!} className="mt-3" />
      <div
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-[12px] font-medium",
          down ? "text-destructive" : "text-success",
        )}
      >
        {down ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
        {Math.abs(trend)} vs 7-day baseline
      </div>
    </Tile>
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["S1"]));
  const toggle = (sid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      return next;
    });

  const qrGood = detail.qr >= 15;

  return (
    <>
      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <CompositeTile agent={agent} />
        <Tile label="Score trend (last 9 windows)">
          <Sparkline data={detail.trendData} />
          <div className="text-[11px] text-muted-foreground mt-1">
            Rolling 20-call window · updated {detail.lastUpdated}
          </div>
        </Tile>
        <Tile label="Qualification rate">
          <span
            className={cn(
              "text-[34px] leading-none font-bold tabular",
              qrGood ? "text-success" : "text-destructive",
            )}
          >
            {detail.qr}%
          </span>
          <div className="text-[11px] text-muted-foreground mt-2">
            {agent.callCount} calls · north star ≥ 15%
          </div>
        </Tile>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        {/* Signal breakdown */}
        <div className="rounded-2xl border border-secondary bg-card p-5">
          <h2 className="text-[15px] font-semibold text-foreground">
            Signal breakdown
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">
            Click a signal to expand sub-signals · click &quot;X calls →&quot; to
            see affected calls
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
        </div>

        {/* Possible reasons */}
        <div className="rounded-2xl border border-secondary bg-card p-5">
          <h2 className="text-[15px] font-semibold text-foreground">
            Possible reasons
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">
            Top 3 contributors to composite drop
          </p>
          <div className="space-y-3">
            {detail.reasons.map((r) => (
              <div
                key={r.signal}
                className={cn(
                  "rounded-lg border border-border-subtle bg-muted/40 p-3.5 border-l-[3px]",
                  r.priority === 1
                    ? "border-l-destructive"
                    : r.priority === 2
                      ? "border-l-warning"
                      : "border-l-border",
                )}
              >
                <div className="text-[11px] font-medium text-muted-foreground tabular">
                  {r.signal} · {r.calls} calls
                </div>
                <div className="text-[13.5px] font-medium text-foreground mt-1">
                  {r.title}
                </div>
                <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                  {r.body}
                </div>
                <Link
                  href={`/agents/${agent.id}/calls?signal=${encodeURIComponent(r.signal)}`}
                  className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline mt-2"
                >
                  View affected calls
                  <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
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
        signal.isLowest ? "border-destructive/40" : "border-border-subtle",
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/40 transition-colors text-left"
      >
        <span className="text-[12px] font-semibold text-muted-foreground tabular w-7 shrink-0">
          {signal.id}
        </span>
        <span className="flex-1 min-w-0 text-[13.5px] font-medium text-foreground flex items-center gap-2">
          <span className="truncate">{signal.name}</span>
          {signal.isLowest && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-destructive-bg text-destructive shrink-0">
              Lowest
            </span>
          )}
        </span>
        <span className="text-[12px] text-muted-foreground tabular shrink-0">
          {signal.weight}%
        </span>
        <span className="w-24 shrink-0">
          <ScoreBar score={signal.score} />
        </span>
        <ScoreNumber score={signal.score} className="text-[14px] w-7 text-right shrink-0" />
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
            <div
              key={sub.id}
              className="flex items-center gap-3 px-3.5 py-2.5 pl-10"
            >
              <span className="text-[11.5px] text-muted-foreground tabular w-8 shrink-0">
                {sub.id}
              </span>
              <span className="flex-1 min-w-0 text-[12.5px] text-foreground truncate">
                {sub.name}
              </span>
              <ScoreNumber
                score={sub.score}
                className="text-[12.5px] w-7 text-right shrink-0"
              />
              <span className="w-20 shrink-0">
                <ScoreBar score={sub.score} />
              </span>
              <ConfPill conf={sub.conf} className="shrink-0" />
              <Link
                href={`/agents/${agentId}/calls?signal=${encodeURIComponent(`${signal.id}.${sub.id.split(".")[1]}`)}`}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <CompositeTile agent={agent} />
        <Tile label="Calls in window">
          <span className="text-[34px] leading-none font-bold text-foreground tabular">
            {agent.callCount}
          </span>
          <div className="text-[11px] text-muted-foreground mt-2">
            Rolling 20-call window
          </div>
        </Tile>
        <Tile label="Top offender">
          <span className="text-[26px] leading-none font-bold text-foreground tabular">
            {agent.lowestSignal ?? "—"}
          </span>
          <div className="text-[11px] text-muted-foreground mt-2">
            Lowest-scoring signal
          </div>
        </Tile>
      </div>

      <div className="rounded-2xl border border-secondary bg-card p-10 text-center">
        <p className="text-[13.5px] text-muted-foreground">
          Full sub-signal drill-down is wired for the demo agent only.
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
    <div className="rounded-2xl border border-warning/40 bg-warning-bg/40 p-6 flex items-start gap-4">
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
