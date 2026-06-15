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
  Bot,
  History,
  MessageSquare,
  Phone,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findAgent,
  getAgentDetail,
  signalLabel,
  OPTIONAL_CAPABILITIES,
  DEFAULT_AGENT_CONFIG,
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

type AgentTab =
  | "agent"
  | "configuration"
  | "knowledge"
  | "faqs"
  | "post-call"
  | "qualification"
  | "scorecard";

const AGENT_TABS: { key: AgentTab; label: string; locked?: boolean }[] = [
  { key: "agent", label: "Agent", locked: true },
  { key: "configuration", label: "Configuration" },
  { key: "knowledge", label: "Knowledge Base", locked: true },
  { key: "faqs", label: "FAQs", locked: true },
  { key: "post-call", label: "Post Call Metrics", locked: true },
  { key: "qualification", label: "Qualification Criteria", locked: true },
  { key: "scorecard", label: "Quality Scorecard" },
];

export default function ScorecardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agent = findAgent(id);
  if (!agent) notFound();

  const detail = getAgentDetail(agent);
  const [tab, setTab] = useState<AgentTab>("configuration");

  return (
    <div className="px-8 py-6 max-w-[1080px] mx-auto">
      <Breadcrumbs
        items={[{ label: "Agents", href: "/agents" }, { label: agent.name }]}
      />

      <Header agent={agent} />

      {/* Tab strip — segmented style: subtle container, active tab gets a
          card-like surface with a thin primary border. Locked tabs render
          dimmed with a lock icon and a tooltip; clicks are ignored. */}
      <div className="rounded-lg border border-border-subtle bg-secondary/40 p-1 mb-5 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {AGENT_TABS.map(({ key, label, locked }) => (
            <button
              key={key}
              onClick={() => !locked && setTab(key)}
              disabled={locked}
              title={locked ? "Coming soon" : undefined}
              className={cn(
                "h-8 px-3 rounded-md whitespace-nowrap text-[13px] font-medium transition-colors inline-flex items-center gap-1.5",
                tab === key
                  ? "bg-card text-foreground border border-primary/40 shadow-sm"
                  : locked
                  ? "text-muted-foreground/60 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              {locked && <Lock size={11} strokeWidth={2.25} className="opacity-70" />}
            </button>
          ))}
        </div>
      </div>

      {tab === "agent" && <AgentTab agent={agent} />}
      {tab === "configuration" && <ConfigurationTab agent={agent} />}
      {tab === "knowledge" && <KnowledgeBaseTab />}
      {tab === "faqs" && <FaqsTab />}
      {tab === "post-call" && <PostCallMetricsTab />}
      {tab === "qualification" && (
        <QualificationCriteriaTab agent={agent} detail={detail} />
      )}
      {tab === "scorecard" &&
        (agent.insufficientData ? (
          <InsufficientState agent={agent} />
        ) : detail ? (
          <FullScorecard agent={agent} detail={detail} />
        ) : (
          <MinimalScorecard agent={agent} />
        ))}
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

  // ID-style subtitle: "Ai Call · ID: <slug>" — matches production layout.
  const idSubtitle = `${agent.channel} · ID: ${agent.id}`;

  return (
    <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={() => router.push("/agents")}
          aria-label="Back to agents"
          title="Back to agents"
          className="w-9 h-9 mt-0.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div className="w-11 h-11 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Bot size={20} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-bold text-foreground">{agent.name}</h1>
            <button
              aria-label="Rename agent"
              title="Rename agent"
              className="w-6 h-6 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition flex items-center justify-center"
            >
              <Pencil size={12} strokeWidth={2} />
            </button>
            <AgentStatusPill status={status} />
          </div>
          <p className="text-[12px] text-muted-foreground mt-1 tabular">
            {idSubtitle}
          </p>
        </div>
      </div>

      {/* Action row — Test Agent / Assign Phone Number / Version History.
          Pause / Resume folds in only when the agent is live or paused. */}
      <div className="flex items-center gap-2 shrink-0">
        <HeaderButton icon={MessageSquare} label="Test Agent" />
        <HeaderButton icon={Phone} label="Assign Phone Number" emphasised />
        <HeaderButton icon={History} label="Version History" />
        {status === "paused" && (
          <button
            onClick={() => openResume(agent.id)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-success text-white text-[13px] font-medium hover:brightness-110 transition"
          >
            <Play size={14} strokeWidth={2} />
            Resume
          </button>
        )}
        {status === "live" && (
          <button
            onClick={() => openPause(agent.id)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-destructive text-white text-[13px] font-medium hover:brightness-110 transition"
          >
            <Pause size={14} strokeWidth={2} />
            Pause
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Outline-style action button used in the agent header. `emphasised` paints
 * a soft primary background so the most-likely-clicked action stands out
 * without becoming a full primary CTA.
 */
function HeaderButton({
  icon: Icon,
  label,
  emphasised,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  emphasised?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[12.5px] font-medium transition-colors whitespace-nowrap",
        emphasised
          ? "border-primary/40 bg-primary-soft text-primary hover:bg-primary-soft/80"
          : "border-border text-foreground/80 hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon size={13} strokeWidth={2} />
      {label}
    </button>
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
 * Full agent-config surface — LLM, STT, language, runtime knobs, plus the
 * tool Capabilities multiselect. Mirrors the operator-app layout so the
 * mental model carries between products.
 */
function ConfigurationTab({ agent }: { agent: Agent }) {
  const llm = agent.llmConfig ?? DEFAULT_AGENT_CONFIG.llmConfig;
  const stt = agent.sttConfig ?? DEFAULT_AGENT_CONFIG.sttConfig;
  const lang = agent.languageConfig ?? DEFAULT_AGENT_CONFIG.languageConfig;
  const other = agent.otherConfig ?? DEFAULT_AGENT_CONFIG.otherConfig;

  const [temperature, setTemperature] = useState(llm.temperature);
  const [concurrency, setConcurrency] = useState(other.concurrency);
  const [speakingSpeed, setSpeakingSpeed] = useState(other.speakingSpeed);
  const [capabilities, setCapabilities] = useState<string[]>(
    agent.capabilities ?? [],
  );

  return (
    <div className="space-y-5">
      {/* LLM Configuration */}
      <ConfigSection title="LLM Configuration">
        <div className="grid grid-cols-3 gap-4">
          <ConfigSelect label="Provider" value={llm.provider} options={["Groq", "OpenAI", "Anthropic", "Google"]} />
          <ConfigSelect label="Model" value={llm.model} options={[llm.model, "GPT-4o", "GPT-4o-mini", "Claude 3.5 Sonnet", "Gemini 3.1 Flash Lite"]} />
          <div>
            <ConfigLabel>Temperature</ConfigLabel>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-primary cursor-pointer"
              />
              <span className="text-[13px] font-semibold text-primary tabular w-8 text-right">
                {temperature.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Precise</span>
              <span className="text-[10px] text-muted-foreground">Creative</span>
            </div>
          </div>
        </div>
      </ConfigSection>

      {/* STT Configuration */}
      <ConfigSection title="STT Configuration">
        <div className="grid grid-cols-3 gap-4">
          <ConfigSelect label="Provider" value={stt.provider} options={["Deepgram", "Google", "AssemblyAI", "Sarvam"]} />
          <ConfigSelect label="Model" value={stt.model} options={[stt.model, "Nova 3", "Nova 2", "Whisper", "Saaras V3"]} />
          <ConfigSelect label="Language" value={stt.language} options={[stt.language, "English (en)", "Hindi (hi)", "Kannada (kn)", "Tamil (ta)"]} />
        </div>
      </ConfigSection>

      {/* Language Configuration */}
      <ConfigSection title="Language Configuration">
        <div className="grid grid-cols-2 gap-4">
          <ConfigSelect label="Primary Language" value={lang.primary} options={["English", "Hindi", "Kannada", "Tamil", "Telugu", "Marathi"]} />
          <div>
            <ConfigLabel>Additional Languages</ConfigLabel>
            <div className="flex flex-wrap gap-1.5">
              {lang.additional.length === 0 && (
                <span className="text-[12px] text-muted-foreground">No additional languages</span>
              )}
              {lang.additional.map((l) => (
                <span
                  key={l}
                  className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-md bg-secondary text-foreground"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ConfigSection>

      {/* Other Configuration — runtime knobs + Capabilities live in the same
          card so they read as one cluster of agent-level controls. */}
      <ConfigSection title="Other Configuration">
        <div className="grid grid-cols-3 gap-4">
          <ConfigSelect label="Timezone" value={other.timezone} options={["Asia/Kolkata (IST)", "America/New_York (EST)", "Europe/London (GMT)"]} />
          <div>
            <ConfigLabel>Concurrency</ConfigLabel>
            <input
              type="number"
              min={1}
              max={5}
              value={concurrency}
              onChange={(e) => setConcurrency(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full h-9 px-3 text-[13px] bg-card border border-border rounded-md text-foreground"
            />
          </div>
          <div>
            <ConfigLabel>Speaking Speed</ConfigLabel>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground w-8">Slow</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={speakingSpeed}
                onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-primary cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground w-8">Fast</span>
              <span className="text-[13px] font-medium text-foreground tabular w-10 text-right">
                {speakingSpeed.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>

        {/* Capabilities sits below the runtime row — same card so they
            read as one cluster. */}
        <div className="mt-5 pt-5 border-t border-border-subtle">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <ConfigLabel className="mb-0">Capabilities</ConfigLabel>
              <span className="relative group inline-flex items-center">
                <button
                  type="button"
                  aria-label="About capabilities"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info size={12} strokeWidth={2} />
                </button>
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
          <CapabilitiesField value={capabilities} onChange={setCapabilities} />
        </div>
      </ConfigSection>

      {/* Save button */}
      <div className="flex justify-end">
        <button className="h-9 px-5 text-[13px] font-medium bg-primary text-primary-foreground rounded-md hover:brightness-110 transition">
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ── Agent tab ────────────────────────────────────────────────────────────

/**
 * The "Agent" tab hosts the editable system prompt, greeting template, and
 * the variables the prompt accepts. Read-only display for now — wiring the
 * editor up to persisting state is a follow-up.
 */
function AgentTab({ agent }: { agent: Agent }) {
  const [prompt, setPrompt] = useState(() => DEFAULT_SYSTEM_PROMPT(agent.name));
  const [greeting, setGreeting] = useState(
    "Good {{greeting_time}}, am I speaking with {{salutation}} {{customer_name}}?",
  );

  return (
    <div className="space-y-5">
      <ConfigSection title="System Prompt">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={14}
          className="w-full text-[12.5px] font-mono leading-relaxed bg-secondary/30 border border-border rounded-md p-3 text-foreground resize-y focus:outline-none focus:border-foreground/40"
        />
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          Use <code className="font-mono text-foreground">{"{{variable}}"}</code> tokens for runtime values.
        </p>
      </ConfigSection>

      <ConfigSection title="Greeting Message">
        <input
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          className="w-full h-9 px-3 text-[13px] bg-card border border-border rounded-md text-foreground"
        />
      </ConfigSection>

      <ConfigSection title="Variables">
        <div className="rounded-md border border-border-subtle overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-secondary/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Hint</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Required</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "customer_name", hint: "in hindi for better pronunciation", required: false },
                { name: "greeting_time", hint: "morning · afternoon · evening", required: false },
                { name: "salutation", hint: "Mr · Ms · Dr", required: false },
              ].map((v) => (
                <tr key={v.name} className="border-t border-border-subtle">
                  <td className="px-3 py-2 font-mono text-foreground">{`{{${v.name}}}`}</td>
                  <td className="px-3 py-2 text-muted-foreground">{v.hint}</td>
                  <td className="px-3 py-2 text-muted-foreground">{v.required ? "Yes" : "Optional"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ConfigSection>

      <div className="flex justify-end">
        <button className="h-9 px-5 text-[13px] font-medium bg-primary text-primary-foreground rounded-md hover:brightness-110 transition">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function DEFAULT_SYSTEM_PROMPT(name: string): string {
  return `SYSTEM PROMPT FOR AI VOICE ASSISTANT — ${name} (v1)

MASTER RULES
Ensure you follow the prompt properly. Do not hallucinate or deviate from
the prompt. Do not ask more than one question at a time. Do not bundle
multiple questions in one sentence. Strictly never answer on behalf of
the user. Never ask the name of the user directly.

1. IDENTITY & TONE
  - Name: Priya — introduce as "calling from ${name}"
  - Representing: ${name}, the project's sales team
  - Tone: warm, professional, never pushy

2. PRICING FORMAT
  Never say "Rs" or "Cr" or "L" — always say "Rupees", "Crores", and
  "Lakhs". Numbers must be spoken as words.

3. OPENING
  Confirm the customer's identity, then ask if it's a good time to talk.
  If not, schedule a callback. Critical rule: ask ONE question. Then
  STOP. Wait for a response.`;
}

// ── Knowledge Base tab ───────────────────────────────────────────────────

function KnowledgeBaseTab() {
  const files = [
    { name: "Ramky Fortuna — Brochure.pdf", size: "4.2 MB", uploaded: "12 May 2026" },
    { name: "Pricing Sheet Q2 2026.pdf", size: "812 KB", uploaded: "28 May 2026" },
    { name: "FAQ pack — outbound.docx", size: "234 KB", uploaded: "03 Jun 2026" },
  ];

  return (
    <div className="space-y-5">
      <ConfigSection title="Documents">
        <div className="rounded-md border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
          <p className="text-[13px] font-medium text-foreground">Drop files to upload</p>
          <p className="text-[11.5px] text-muted-foreground mt-1">
            PDF · DOCX · TXT up to 25 MB · indexed within 5 minutes
          </p>
        </div>

        <div className="mt-4 divide-y divide-border-subtle">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">
                  {f.name}
                </div>
                <div className="text-[11px] text-muted-foreground tabular">
                  {f.size} · uploaded {f.uploaded}
                </div>
              </div>
              <button
                type="button"
                className="text-[12px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </ConfigSection>
    </div>
  );
}

// ── FAQs tab ─────────────────────────────────────────────────────────────

function FaqsTab() {
  const faqs = [
    { q: "What is the price range of units?", a: "2 BHK starts at 1.2 Crores; 3 BHK from 1.8 Crores." },
    { q: "What is the possession date?", a: "Phase 1 hands over in Q4 2027; Phase 2 in Q2 2028." },
    { q: "Is home loan available?", a: "Pre-approved loans from SBI, HDFC, ICICI, and Axis at competitive rates." },
    { q: "What are the payment terms?", a: "10% on booking, then construction-linked instalments." },
  ];

  return (
    <ConfigSection title="Frequently Asked Questions">
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div
            key={i}
            className="rounded-md border border-border-subtle bg-card p-3"
          >
            <div className="text-[13px] font-medium text-foreground">{f.q}</div>
            <div className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
              {f.a}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-border text-foreground/70 hover:text-foreground hover:bg-secondary text-[12.5px] font-medium transition-colors"
        >
          <Plus size={13} strokeWidth={2} /> Add FAQ
        </button>
      </div>
    </ConfigSection>
  );
}

// ── Post Call Metrics tab ────────────────────────────────────────────────

function PostCallMetricsTab() {
  const metrics = [
    { name: "Lead qualified", desc: "Did the call result in a qualified lead?", on: true },
    { name: "Budget captured", desc: "Was the customer's budget captured during the call?", on: true },
    { name: "Site visit booked", desc: "Did the customer agree to a site visit?", on: true },
    { name: "Sentiment", desc: "Caller sentiment classified as positive / neutral / negative", on: false },
    { name: "Call outcome", desc: "Qualified / Disqualified / Hangup / Voicemail", on: true },
  ];

  return (
    <ConfigSection title="Metrics extracted after each call">
      <div className="divide-y divide-border-subtle">
        {metrics.map((m) => (
          <div key={m.name} className="flex items-start justify-between gap-4 py-3">
            <div>
              <div className="text-[13px] font-medium text-foreground">{m.name}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug">
                {m.desc}
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center text-[10.5px] font-medium px-2 py-1 rounded-md uppercase tracking-[0.04em] shrink-0",
                m.on
                  ? "bg-success-bg text-success"
                  : "bg-secondary text-muted-foreground",
              )}
            >
              {m.on ? "Enabled" : "Off"}
            </span>
          </div>
        ))}
      </div>
    </ConfigSection>
  );
}

// ── Qualification Criteria tab ───────────────────────────────────────────

function QualificationCriteriaTab({
  agent,
  detail,
}: {
  agent: Agent;
  detail: ReturnType<typeof getAgentDetail>;
}) {
  // Reuse the agent's QC signals as the qualification dimensions — same
  // shape (id, name, description, weight) but rendered as configurable
  // rules rather than scored bars.
  return (
    <ConfigSection title="Qualification dimensions">
      <p className="text-[12.5px] text-muted-foreground mb-4">
        Each call is scored on these dimensions. Adjust the weight to bias
        the composite toward what matters most for{" "}
        <span className="text-foreground font-medium">{agent.name}</span>.
      </p>
      {detail ? (
        <div className="rounded-md border border-border-subtle overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-secondary/40">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Dimension</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Weight</th>
              </tr>
            </thead>
            <tbody>
              {detail.signals.map((s) => (
                <tr key={s.id} className="border-t border-border-subtle">
                  <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                    {s.name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{s.description}</td>
                  <td className="px-3 py-2 text-right tabular text-foreground">
                    {s.weight}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted-foreground italic">
          Qualification dimensions are configured for the demo agent only.
        </p>
      )}
    </ConfigSection>
  );
}

// ── Configuration tab primitives ─────────────────────────────────────────

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-subtle bg-card p-5">
      <h2 className="text-[15px] font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ConfigLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-[12px] font-medium text-muted-foreground mb-1.5", className)}>
      {children}
    </label>
  );
}

function ConfigSelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <div>
      <ConfigLabel>{label}</ConfigLabel>
      <select
        defaultValue={value}
        className="w-full h-9 px-3 text-[13px] bg-card border border-border rounded-md text-foreground appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
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
