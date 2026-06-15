"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pause,
  Play,
  Pencil,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAgent,
  getAgentDetail,
  signalLabel,
  OPTIONAL_CAPABILITIES,
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

type AgentTab = "scorecard" | "configuration";

export default function ScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agent = findAgent(id);
  if (!agent) notFound();

  const detail = getAgentDetail(agent);
  const [tab, setTab] = useState<AgentTab>("scorecard");

  return (
    <div className="px-8 py-6 max-w-[1080px] mx-auto">
      <Breadcrumbs
        items={[{ label: "Agents", href: "/agents" }, { label: agent.name }]}
      />

      <Header agent={agent} />

      {/* Tab strip — Scorecard (default) + Configuration. Underline pattern
          to stay consistent with the rest of the admin's tab affordances. */}
      <div className="flex items-center gap-6 border-b border-border mb-5">
        {(
          [
            { key: "scorecard", label: "Scorecard" },
            { key: "configuration", label: "Configuration" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "relative h-9 text-[13px] font-medium transition-colors",
              tab === key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {tab === key && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {tab === "scorecard" ? (
        agent.insufficientData ? (
          <InsufficientState agent={agent} />
        ) : detail ? (
          <FullScorecard agent={agent} detail={detail} />
        ) : (
          <MinimalScorecard agent={agent} />
        )
      ) : (
        <ConfigurationTab agent={agent} />
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
      {/* Tighter button row — status pill + primary status action (pause/resume)
          carry the weight. Edit is an icon-only ghost, Back goes back to icon
          form so it doesn't compete with the pause/resume CTA. */}
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
        <button
          aria-label="Edit"
          title="Edit"
          className="w-9 h-9 rounded-md border border-border text-foreground hover:bg-secondary transition flex items-center justify-center"
        >
          <Pencil size={14} strokeWidth={2} />
        </button>
        <button
          onClick={() => router.push("/agents")}
          aria-label="Back to agents"
          title="Back to agents"
          className="w-9 h-9 rounded-md border border-border text-foreground hover:bg-secondary transition flex items-center justify-center"
        >
          <ArrowLeft size={14} strokeWidth={2} />
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

      {/* Top reasons — flat list. Each row is one insight with the diagnosis
          on the left and a prominent "View calls" pill on the right. No
          per-row card chrome; the section sits in a single bordered shell
          with hairline dividers between rows. */}
      <section className="mb-7">
        <h2 className="text-[15px] font-semibold text-foreground mb-2.5">
          Top reasons the score dropped
        </h2>
        <div className="rounded-xl border border-border-subtle bg-card divide-y divide-border-subtle">
          {detail.reasons.map((r, i) => (
            <div
              key={r.metric}
              className="flex items-center gap-4 px-4 py-3"
            >
              <span
                className={cn(
                  "w-1 self-stretch rounded-full shrink-0",
                  i === 0 ? "bg-destructive" : i === 1 ? "bg-warning" : "bg-muted-foreground/30",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-medium text-foreground truncate">
                  {r.title}
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
                  <span className="font-medium text-foreground/80">{r.metric}</span>
                  <span className="mx-1.5">·</span>
                  {r.calls} calls
                  <span className="mx-1.5">·</span>
                  {r.body}
                </div>
              </div>
              <Link
                href={`/agents/${agent.id}/calls?focus=${encodeURIComponent(r.metric)}`}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-primary-soft text-primary text-[12.5px] font-medium hover:brightness-95 transition shrink-0"
              >
                View calls
                <ChevronRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Signal breakdown */}
      <section>
        <h2 className="text-[15px] font-semibold text-foreground mb-2.5">
          Signal breakdown
        </h2>
        <div className="space-y-2">
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
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-medium text-foreground truncate">
              {signal.name}
            </span>
            {signal.isLowest && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-destructive-bg text-destructive shrink-0">
                Weakest
              </span>
            )}
            <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
              {signal.weight}%
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {signal.description}
          </div>
        </div>
        <span className="w-24 shrink-0">
          <ScoreBar score={signal.score} />
        </span>
        <ScoreNumber
          score={signal.score}
          className="text-[15px] w-8 text-right shrink-0 font-semibold"
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

// ── Configuration tab ─────────────────────────────────────────────────────

/**
 * Holds agent-level toggles that aren't graded by QC — currently just the
 * Capabilities multiselect. Mirrors the RevSpot pattern so the same mental
 * model carries between the operator app and this admin tool.
 */
function ConfigurationTab({ agent }: { agent: Agent }) {
  const [capabilities, setCapabilities] = useState<string[]>(
    agent.capabilities ?? [],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border-subtle bg-card p-5">
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[15px] font-semibold text-foreground">
              Capabilities
            </h2>
            <span className="relative group inline-flex items-center">
              <button
                type="button"
                aria-label="About capabilities"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info size={13} strokeWidth={2} />
              </button>
              {/* Tooltip — appears on hover/focus, positioned below the icon. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-20 w-[260px] rounded-md bg-foreground text-background text-[11.5px] leading-snug px-2.5 py-1.5 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              >
                Optional tools this agent loads on every call. Core handlers
                (end call, voicemail detection) are always on and not listed
                here.
              </span>
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground tabular">
            {capabilities.length} added
          </span>
        </div>
        <CapabilitiesField
          value={capabilities}
          onChange={setCapabilities}
        />
      </section>
    </div>
  );
}

/**
 * Multiselect with removable chips + a popover that lists only the
 * unselected options. Outside-click and Escape close the popover.
 */
function CapabilitiesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedSet = new Set(value);
  const selected = OPTIONAL_CAPABILITIES.filter((c) => selectedSet.has(c.id));
  const available = OPTIONAL_CAPABILITIES.filter((c) => !selectedSet.has(c.id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="min-h-10 w-full px-2 py-1.5 bg-card border border-border rounded-md flex flex-wrap items-center gap-1.5">
        {selected.length === 0 && (
          <span className="text-[12.5px] text-muted-foreground px-1">
            No optional capabilities — agent runs with core tools only
          </span>
        )}
        {selected.map((cap) => (
          <span
            key={cap.id}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium pl-2 pr-1 py-1 rounded-md bg-secondary text-foreground"
          >
            {cap.label}
            <button
              type="button"
              aria-label={`Remove ${cap.label}`}
              onClick={() => toggle(cap.id)}
              className="w-4 h-4 inline-flex items-center justify-center rounded-full text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}

        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-md text-primary hover:bg-primary-soft/40 transition-colors ml-auto"
          >
            <Plus size={12} strokeWidth={2.5} />
            Add capability
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      {open && available.length > 0 && (
        <div className="absolute z-10 right-0 mt-1 w-[260px] bg-card border border-border rounded-md shadow-lg py-1">
          {available.map((cap) => (
            <button
              key={cap.id}
              type="button"
              onClick={() => {
                toggle(cap.id);
                if (available.length === 1) setOpen(false);
              }}
              className="w-full px-3 py-2 text-[12.5px] text-foreground hover:bg-secondary transition-colors text-left"
            >
              {cap.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
