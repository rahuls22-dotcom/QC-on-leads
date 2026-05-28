"use client";

// Canvas components for the three diagnostic Spot workflows in the new
// 3-step model:
//
//   1. clarify  — questions + verification brief on the canvas, chat
//                 narrates and carries the "Confirm" CTA. Spot
//                 pre-picks the defaults; user just confirms or tweaks.
//   2. plan     — Spot's autonomous analysis lands here as a single
//                 time-phased plan (Week 1 / Week 2 / Week 3) with
//                 insights, actions, observations, decision rules, and
//                 guardrails. Chat carries the single "Approve" CTA.
//   3. live     — running state. Canvas shows the active phase, the
//                 phase timeline, and recommendations Spot has
//                 surfaced (which also feed the dashboard).
//
// All three workflow kinds (scale / optimize / test-angles) share these
// components — the difference is just which clarify questions and which
// plan content gets pulled in.

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  PartyPopper,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Eye,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useEffect } from "react";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { SpotLoader, SpotFullscreen } from "@/components/spot/spot-loader";
import type { DiagnosticWorkflow } from "@/lib/spot/workflow";
import {
  analysisFor,
  answerLabel,
  clarifyQuestionsFor,
  planFor,
  PENDING_RECOMMENDATIONS,
  type AnalysisCampaignSignal,
  type AnalysisFindings,
  type ClarifyQuestion,
  type PendingRecommendation,
  type WorkflowPlan,
} from "@/lib/spot/extended-flows";

const canvasStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
};
const canvasReveal: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/* ─── Dispatcher ────────────────────────────────────────────────── */

export function DiagnosticStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  switch (workflow.step) {
    case "scale-analyze":
    case "opt-analyze":
    case "ang-analyze":
      return <AnalyzeStep workflow={workflow} />;

    case "scale-clarify":
    case "opt-clarify":
    case "ang-clarify":
      return <ClarifyStep workflow={workflow} />;

    case "scale-plan":
    case "opt-plan":
    case "ang-plan":
      return <PlanStep workflow={workflow} />;

    case "scale-live":
    case "opt-live":
    case "ang-live":
      return <LiveStep workflow={workflow} />;

    case "done":
      return <DiagnosticDoneStep workflow={workflow} />;

    default:
      return null;
  }
}

/* ─── Shared bits ─────────────────────────────────────────────── */

function StepHeader({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-section-header text-text-primary">{title}</h2>
      <p className="text-meta text-text-secondary mt-1 max-w-[640px]">{blurb}</p>
    </div>
  );
}

/**
 * Compact label-value chip with optional ↑/↓ delta. Used inside the
 * analysis signal cards.
 */
function MetricChip({
  label,
  value,
  delta,
  deltaTone,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "good" | "bad";
}) {
  const deltaColor =
    deltaTone === "good"
      ? "text-[#15803D]"
      : deltaTone === "bad"
        ? "text-[#B91C1C]"
        : "text-text-tertiary";
  return (
    <div className="bg-surface-page border border-border-subtle rounded-input px-2.5 py-1.5">
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[12.5px] font-medium text-text-primary tabular">{value}</span>
        {delta && <span className={`text-[10px] tabular ${deltaColor}`}>{delta}</span>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * ANALYZE STEP
 *
 * The first step now — Spot shows what it already knows before asking
 * the user anything. Decisions in later steps adapt to these findings.
 * ═══════════════════════════════════════════════════════════════ */

const SIGNAL_TONE: Record<
  AnalysisCampaignSignal["tag"],
  { pill: string; label: string; ring: string; icon: typeof TrendingUp }
> = {
  winner: { pill: "pill-ok", label: "Winner", ring: "bg-[#F0FDF4]", icon: TrendingUp },
  decay: { pill: "pill-err", label: "Recent decay", ring: "bg-[#FEE2E2]", icon: TrendingDown },
  chronic: { pill: "pill-warn", label: "Chronic", ring: "bg-[#FEF3C7]", icon: AlertTriangle },
  neutral: { pill: "pill", label: "Underspent", ring: "bg-surface-secondary", icon: Activity },
};

function AnalyzeStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  // Wait for the agentic step to finish before revealing the analysis.
  if (!workflow.ready) {
    return <AnalyzeLoader />;
  }
  const findings = analysisFor(workflow.kind);

  // Group signals by category for visual hierarchy — winners stand
  // apart from issues, neutral context goes at the bottom.
  const winners = findings.signals.filter((s) => s.tag === "winner");
  const issues = findings.signals.filter((s) => s.tag === "decay" || s.tag === "chronic");
  const context = findings.signals.filter((s) => s.tag === "neutral");

  const analyzedCount = findings.signals.length;
  const issueCount = issues.length;
  const winnerCount = winners.length;

  return (
    <motion.div
      className="px-5 py-6 max-w-[820px] mx-auto"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      {/* Hero — the takeaway lands first and big. */}
      <motion.div variants={canvasReveal} className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#FAF8F2] border border-[#E8E3D5]">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#15803D]" />
            <span className="text-[10.5px] uppercase tracking-wider text-text-secondary font-semibold">
              Analysis complete
            </span>
          </span>
          <span className="text-[11px] text-text-tertiary">
            Reading last 30 days · {workflow.productName}
          </span>
        </div>

        <div className="bg-gradient-to-br from-[#FAF8F2] to-[#F5F2E8] border border-[#E8E3D5] rounded-card p-5 relative overflow-hidden">
          {/* Decorative Spot mark in corner */}
          <div className="absolute -top-3 -right-3 opacity-[0.06]">
            <SpotMark size={80} />
          </div>

          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-[#E8E3D5] flex items-center justify-center flex-shrink-0 shadow-sm">
              <SpotMark size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-1.5 font-semibold">
                Here's what I'm seeing
              </div>
              <p className="text-[15px] text-text-primary leading-relaxed font-medium">
                {findings.summary}
              </p>
              {findings.biggestProblem && (
                <div className="mt-3.5 pt-3.5 border-t border-[#E8E3D5] flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white border border-[#E8E3D5] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target size={10} strokeWidth={2} className="text-text-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-0.5 font-semibold">
                      Biggest single problem
                    </div>
                    <div className="text-[13px] text-text-primary leading-relaxed">
                      {findings.biggestProblem}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Numbers strip — quick read on what was analyzed */}
      <motion.div variants={canvasReveal} className="grid grid-cols-4 gap-2.5 mb-6">
        <SummaryStat label="Analyzed" value={analyzedCount} sub="campaigns + signals" />
        <SummaryStat
          label="Winning"
          value={winnerCount}
          sub={winnerCount > 0 ? "with headroom" : "none"}
          accent={winnerCount > 0 ? "ok" : undefined}
        />
        <SummaryStat
          label="Issues"
          value={issueCount}
          sub={
            findings.hasDecay && findings.hasChronic
              ? "decay + chronic"
              : findings.hasDecay
                ? "recent decay"
                : findings.hasChronic
                  ? "chronic only"
                  : "none flagged"
          }
          accent={issueCount > 0 ? "err" : undefined}
        />
        <SummaryStat
          label="Memory"
          value={findings.memoryRefs.length}
          sub="entries read"
        />
      </motion.div>

      {/* Winners section */}
      {winners.length > 0 && (
        <motion.div variants={canvasReveal} className="mb-5">
          <SectionHeader
            icon={TrendingUp}
            tone="good"
            title={`Winners · ${winners.length}`}
            blurb="Working well. Where the headroom lives."
          />
          <div className="space-y-2.5">
            {winners.map((sig, i) => (
              <BeautifulSignalCard key={i} signal={sig} rank={i + 1} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Issues section */}
      {issues.length > 0 && (
        <motion.div variants={canvasReveal} className="mb-5">
          <SectionHeader
            icon={AlertTriangle}
            tone="bad"
            title={`Problems · ${issues.length}`}
            blurb={
              findings.hasDecay && findings.hasChronic
                ? "Recent decay AND chronic underperformers — different fixes for each."
                : findings.hasDecay
                  ? "Recent decay — something changed and broke it."
                  : "Chronic — never hit target since launch."
            }
          />
          <div className="space-y-2.5">
            {issues.map((sig, i) => (
              <BeautifulSignalCard key={i} signal={sig} rank={i + 1} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Neutral context */}
      {context.length > 0 && (
        <motion.div variants={canvasReveal} className="mb-5">
          <SectionHeader
            icon={Activity}
            tone="neutral"
            title="Other context"
            blurb="Worth flagging — not winners, not problems."
          />
          <div className="space-y-2.5">
            {context.map((sig, i) => (
              <BeautifulSignalCard key={i} signal={sig} rank={i + 1} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Memory citations — chips style at the bottom */}
      <motion.div variants={canvasReveal} className="pt-4 border-t border-border-subtle">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Eye size={11} strokeWidth={1.7} className="text-text-tertiary" />
          <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            Sources · what I read from product memory
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {findings.memoryRefs.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-input bg-surface-page border border-border-subtle text-[11.5px] text-text-secondary"
            >
              <CheckCircle2 size={9} strokeWidth={2} className="text-[#15803D] flex-shrink-0" />
              {m}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: "ok" | "err";
}) {
  const valueColor =
    accent === "ok" ? "text-[#15803D]" : accent === "err" ? "text-[#B91C1C]" : "text-text-primary";
  return (
    <div className="bg-white border border-border rounded-card px-3.5 py-3">
      <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[22px] font-semibold tabular ${valueColor} leading-none`}>
          {value}
        </span>
        <span className="text-[10.5px] text-text-tertiary truncate">{sub}</span>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  tone,
  title,
  blurb,
}: {
  icon: typeof TrendingUp;
  tone: "good" | "bad" | "neutral";
  title: string;
  blurb: string;
}) {
  const ringColor =
    tone === "good"
      ? "bg-[#F0FDF4] text-[#15803D]"
      : tone === "bad"
        ? "bg-[#FEE2E2] text-[#B91C1C]"
        : "bg-surface-page text-text-secondary";
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${ringColor}`}
      >
        <Icon size={14} strokeWidth={1.7} />
      </div>
      <div>
        <div className="text-[13px] font-semibold text-text-primary">{title}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{blurb}</div>
      </div>
    </div>
  );
}

function BeautifulSignalCard({
  signal,
  rank,
}: {
  signal: AnalysisCampaignSignal;
  rank: number;
}) {
  const tone = SIGNAL_TONE[signal.tag];
  const Icon = tone.icon;
  const iconColor =
    signal.tag === "winner"
      ? "text-[#15803D]"
      : signal.tag === "decay"
        ? "text-[#B91C1C]"
        : signal.tag === "chronic"
          ? "text-[#92400E]"
          : "text-text-secondary";
  const borderAccent =
    signal.tag === "winner"
      ? "border-l-[3px] border-l-[#15803D]"
      : signal.tag === "decay"
        ? "border-l-[3px] border-l-[#B91C1C]"
        : signal.tag === "chronic"
          ? "border-l-[3px] border-l-[#F5A623]"
          : "border-l-[3px] border-l-text-tertiary/30";
  return (
    <div className={`bg-white border border-border rounded-card overflow-hidden ${borderAccent}`}>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3 mb-2.5">
          <div className={`flex items-center justify-center w-8 h-8 rounded-card flex-shrink-0 ${tone.ring}`}>
            <Icon size={14} strokeWidth={1.7} className={iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10.5px] tabular text-text-tertiary font-semibold">
                  {String(rank).padStart(2, "0")}
                </span>
                <div className="text-[13.5px] font-semibold text-text-primary leading-tight truncate">
                  {signal.name}
                </div>
              </div>
              <span className={`pill ${tone.pill} flex-shrink-0`}>{tone.label}</span>
            </div>
            <div className="text-[12.5px] text-text-secondary leading-relaxed">
              {signal.signal}
            </div>
          </div>
        </div>

        {signal.metrics.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border-subtle">
            {signal.metrics.map((m, i) => (
              <BeautifulMetric
                key={i}
                label={m.label}
                value={m.value}
                delta={m.delta}
                deltaTone={m.deltaTone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BeautifulMetric({
  label,
  value,
  delta,
  deltaTone,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "good" | "bad";
}) {
  const deltaColor =
    deltaTone === "good"
      ? "text-[#15803D]"
      : deltaTone === "bad"
        ? "text-[#B91C1C]"
        : "text-text-tertiary";
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13.5px] font-semibold text-text-primary tabular leading-none">
          {value}
        </span>
        {delta && <span className={`text-[10.5px] tabular ${deltaColor}`}>{delta}</span>}
      </div>
    </div>
  );
}

const ANALYZE_MESSAGES = [
  "Reading product memory…",
  "Scanning last-30-day performance…",
  "Fetching persona signals…",
  "Auditing competitor moves…",
  "Running sentiment analysis on comments…",
  "Synthesising findings…",
];

function AnalyzeLoader() {
  return (
    <div className="h-full flex items-center justify-center px-5 py-8">
      <SpotFullscreen
        title="Analyzing"
        messages={ANALYZE_MESSAGES}
        size={64}
        className="!min-h-[360px]"
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * CLARIFY STEP
 *
 * 2-3 questions, each with quick-pick chips. Defaults pre-selected
 * and contextual to the analysis findings. As the user answers, a
 * "Brief" card on the right fills in showing what Spot has captured.
 * Confirmation lives in the chat (step-cta).
 * ═══════════════════════════════════════════════════════════════ */

function ClarifyStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  const kind = workflow.kind;
  // Pull findings from analysis so the question options + defaults adapt
  // to what Spot actually found (e.g. hide "Stop the decay" when no
  // decay was detected, default "Recent decay only" when only decay was).
  const findings = analysisFor(kind);
  const questions = clarifyQuestionsFor(kind, findings);
  const primeClarifyDefaults = useSpotStore((s) => s.primeClarifyDefaults);
  const setClarifyAnswer = useSpotStore((s) => s.setClarifyAnswer);

  // Prime defaults on first render only. We key the effect by `kind`
  // (stable per workflow) — the questions array itself is a fresh ref
  // every render, so it can't be in the dep list without causing a
  // re-render loop. The store action is also a no-op once defaults are
  // primed, so even a re-run here wouldn't trigger another render.
  useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const q of clarifyQuestionsFor(kind, analysisFor(kind))) {
      defaults[q.id] = q.defaultValue;
    }
    primeClarifyDefaults(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <motion.div
      className="px-5 py-5"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      <motion.div variants={canvasReveal}>
        <StepHeader
          title="Quick setup"
          blurb={`A few choices that constrain how I'll work. Defaults are what I'd pick anyway — confirm or tweak, then approve in chat.`}
        />
      </motion.div>

      <div className="space-y-3 mb-4">
        {questions.map((q) => (
          <motion.div key={q.id} variants={canvasReveal}>
            <QuestionCard
              question={q}
              selected={workflow.clarifyAnswers[q.id] ?? q.defaultValue}
              onSelect={(v) => setClarifyAnswer(q.id, v)}
            />
          </motion.div>
        ))}
      </div>

      {/* Verification brief — what Spot understood */}
      <motion.div variants={canvasReveal}>
        <BriefCard workflow={workflow} />
      </motion.div>
    </motion.div>
  );
}

function QuestionCard({
  question,
  selected,
  onSelect,
}: {
  question: ClarifyQuestion;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-3.5">
      <div className="mb-0.5 text-[13px] font-semibold text-text-primary">{question.question}</div>
      {question.why && (
        <div className="text-[11.5px] text-text-tertiary mb-2.5">{question.why}</div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {question.options.map((o) => {
          const active = selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              title={o.hint}
              className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-button text-[12px] font-medium transition-colors ${
                active
                  ? "bg-[#111] text-[#FAFAF8] border border-[#111]"
                  : "bg-white border border-border text-text-secondary hover:border-border-hover hover:text-text-primary"
              }`}
            >
              {active && <CheckCircle2 size={11} strokeWidth={2} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BriefCard({ workflow }: { workflow: DiagnosticWorkflow }) {
  const kind = workflow.kind;
  const findings = analysisFor(kind);
  const questions = clarifyQuestionsFor(kind, findings);
  const verb =
    kind === "scale" ? "Scaling" : kind === "optimize" ? "Optimizing" : "Testing angles on";

  return (
    <div className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-4">
      <div className="flex items-start gap-2.5">
        <SpotMark size={18} />
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-1">
            What I'll work with
          </div>
          <div className="text-[13px] font-medium text-text-primary mb-2.5">
            {verb} <span className="text-text-primary">{workflow.productName}</span>
          </div>
          <div className="space-y-1.5">
            {questions.map((q) => {
              const value = workflow.clarifyAnswers[q.id] ?? q.defaultValue;
              return (
                <div key={q.id} className="flex items-baseline gap-2 text-[12px]">
                  <span className="text-text-tertiary">{q.question.replace(/\?$/, "")}:</span>
                  <span className="text-text-primary font-medium">
                    {answerLabel(kind, q.id, value)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-[#E8E3D5] text-[11.5px] text-text-secondary leading-relaxed">
            Once you confirm in chat, I'll run the full analysis — memory · personas ·
            creative audit · competitor signals · plan build — and come back with one
            time-phased plan to approve.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * PLAN STEP
 *
 * The "one big plan" view. Shows:
 *   · Goal statement (single line)
 *   · Insights from the analysis (cards)
 *   · 3 time phases with actions, observations, decision rules
 *   · Guardrails Spot enforces
 *   · Reporting cadence
 *
 * Approval lives in chat. No per-section approval — one plan, one CTA.
 * ═══════════════════════════════════════════════════════════════ */

function PlanStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  // Loader while the parallel agents are still "running" (gated on
  // workflow.ready, flipped after the plan-step tool-call resolves).
  if (!workflow.ready) {
    return <PlanLoader />;
  }
  const plan = planFor(workflow.kind);

  return (
    <motion.div
      className="px-5 py-5"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      <motion.div variants={canvasReveal}>
        <StepHeader
          title="Spot's plan"
          blurb="One plan · three weeks · one approval. Week 1 actions are concrete; the later phases adapt to what I observe. Guardrails fire automatically."
        />
      </motion.div>

      {/* Goal */}
      <motion.div variants={canvasReveal} className="bg-white border border-border rounded-card p-4 mb-3">
        <div className="flex items-start gap-2.5">
          <Target size={16} strokeWidth={1.7} className="text-text-secondary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-1">Goal</div>
            <div className="text-[13.5px] font-medium text-text-primary leading-relaxed">
              {plan.goal}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Insights */}
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="label-section mb-2">What I found</div>
        <div className="grid grid-cols-2 gap-2.5">
          {plan.insights.map((ins, i) => (
            <InsightCard key={i} insight={ins} />
          ))}
        </div>
      </motion.div>

      {/* Time-phased plan — the centerpiece */}
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="label-section mb-2">Time-phased plan</div>
        <div className="space-y-2.5">
          {plan.phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} total={plan.phases.length} />
          ))}
        </div>
      </motion.div>

      {/* Guardrails */}
      <motion.div variants={canvasReveal} className="bg-white border border-border rounded-card p-4 mb-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <ShieldCheck size={13} strokeWidth={1.7} className="text-[#15803D]" />
          <div className="label-section">Guardrails · I enforce these without asking</div>
        </div>
        <ul className="space-y-1.5">
          {plan.guardrails.map((g, i) => (
            <li key={i} className="text-[12.5px] text-text-primary leading-relaxed flex gap-2">
              <CheckCircle2 size={10} strokeWidth={2} className="text-[#15803D] flex-shrink-0 mt-1" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Reporting cadence */}
      <motion.div
        variants={canvasReveal}
        className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 flex items-start gap-2.5"
      >
        <SpotMark size={16} />
        <div className="text-[12px] text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">How I'll keep you in the loop:</span>{" "}
          {plan.reportingCadence}
        </div>
      </motion.div>
    </motion.div>
  );
}

function InsightCard({ insight }: { insight: WorkflowPlan["insights"][number] }) {
  const Icon =
    insight.tone === "good" ? TrendingUp : insight.tone === "warn" ? AlertTriangle : Sparkles;
  const iconColor =
    insight.tone === "good"
      ? "text-[#15803D]"
      : insight.tone === "warn"
        ? "text-[#92400E]"
        : "text-text-secondary";
  return (
    <div className="bg-white border border-border rounded-card p-3">
      <div className="flex items-start gap-2 mb-1.5">
        <Icon size={12} strokeWidth={1.7} className={`${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="text-[12.5px] font-semibold text-text-primary leading-tight">
          {insight.title}
        </div>
      </div>
      <div className="text-[11.5px] text-text-secondary leading-relaxed">{insight.detail}</div>
    </div>
  );
}

function PhaseCard({
  phase,
  index,
  total,
}: {
  phase: WorkflowPlan["phases"][number];
  index: number;
  total: number;
}) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Phase header */}
      <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-page flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#111] text-[#FAFAF8] text-[10.5px] font-bold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-text-primary uppercase tracking-wider">
              {phase.week}
            </span>
            <span className="text-[11px] text-text-tertiary">· {phase.dates}</span>
          </div>
          <div className="text-[13px] font-medium text-text-primary leading-tight mt-0.5">
            {phase.title}
          </div>
        </div>
        {phase.decisionAt && (
          <span className="pill pill-info inline-flex items-center gap-1 flex-shrink-0">
            <Clock size={9} strokeWidth={2} />
            Decide {phase.decisionAt}
          </span>
        )}
      </div>

      {/* Phase body */}
      <div className="px-4 py-3 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={10} strokeWidth={1.8} className="text-text-secondary" />
            <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-medium">
              What I'll do
            </span>
          </div>
          <ul className="space-y-1.5">
            {phase.actions.map((a, i) => (
              <li
                key={i}
                className="text-[12px] text-text-primary leading-relaxed flex gap-1.5"
              >
                <ChevronRight size={10} strokeWidth={1.8} className="text-text-tertiary flex-shrink-0 mt-0.5" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Eye size={10} strokeWidth={1.8} className="text-text-secondary" />
            <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-medium">
              What I'll watch
            </span>
          </div>
          <ul className="space-y-1.5">
            {phase.observes.map((o, i) => (
              <li key={i} className="text-[12px] text-text-secondary leading-relaxed flex gap-1.5">
                <span className="text-text-tertiary mt-0.5">·</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Decision rule */}
      {phase.decisionRule && (
        <div className="px-4 pb-3 pt-1 border-t border-border-subtle bg-surface-page">
          <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mt-2 mb-1">
            Decision rule
          </div>
          <div className="text-[11.5px] text-text-primary leading-relaxed italic">
            {phase.decisionRule}
          </div>
        </div>
      )}
    </div>
  );
}

const PLAN_LOADER_MESSAGES = [
  "Reading product memory…",
  "Fetching personas + audience graph…",
  "Auditing recent creatives…",
  "Pulling competitor positioning…",
  "Sequencing phases · setting guardrails…",
  "Composing the plan…",
];

function PlanLoader() {
  return (
    <div className="h-full flex items-center justify-center px-5 py-8">
      <SpotFullscreen
        title="Building the plan"
        messages={PLAN_LOADER_MESSAGES}
        size={64}
        className="!min-h-[360px]"
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * LIVE STEP
 *
 * Plan is approved and executing. Canvas shows:
 *   · Active phase header + week-of timeline
 *   · Current actions in motion
 *   · Recommendations Spot has surfaced (also feeds the dashboard)
 *   · Upcoming decision date
 * ═══════════════════════════════════════════════════════════════ */

function LiveStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  const plan = planFor(workflow.kind);
  const activePhase = plan.phases[0]; // Always start on phase 1.
  // Surface recommendations for this product if any exist.
  const recs = PENDING_RECOMMENDATIONS.filter(
    (r) => r.sourceKind === workflow.kind && r.sourceProduct === workflow.productName,
  );

  return (
    <motion.div className="px-5 py-5" initial="hidden" animate="show" variants={canvasStagger}>
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex w-2 h-2 rounded-full bg-[#22C55E] relative">
            <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
          </span>
          <span className="text-[11.5px] uppercase tracking-wider text-[#15803D] font-semibold">
            Plan live · day 1 of 17
          </span>
        </div>
        <h2 className="text-section-header text-text-primary">{activePhase.title}</h2>
        <p className="text-meta text-text-secondary mt-1 max-w-[640px]">
          Week 1 of 3 · {activePhase.dates}. I'll ping you at the next decision date{" "}
          <span className="text-text-primary font-medium">{activePhase.decisionAt}</span>{" "}
          with what to approve.
        </p>
      </motion.div>

      {/* Phase timeline strip */}
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="flex items-center gap-2">
          {plan.phases.map((p, i) => (
            <div
              key={p.id}
              className={`flex-1 rounded-card border p-2.5 ${
                i === 0
                  ? "border-text-primary bg-white shadow-card-hover"
                  : "border-border bg-surface-page"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {i === 0 ? (
                  <span className="inline-flex w-2 h-2 rounded-full bg-[#22C55E]" />
                ) : (
                  <span className="inline-flex w-2 h-2 rounded-full bg-text-tertiary/40" />
                )}
                <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-medium">
                  {p.week}
                </span>
                <span className="text-[10.5px] text-text-tertiary ml-auto">{p.dates}</span>
              </div>
              <div
                className={`text-[12px] leading-snug mt-1 ${
                  i === 0 ? "text-text-primary font-medium" : "text-text-secondary"
                }`}
              >
                {p.title}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* What's running now */}
      <motion.div variants={canvasReveal} className="bg-white border border-border rounded-card p-4 mb-3">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={13} strokeWidth={1.7} className="text-text-secondary" />
          <div className="label-section">Running now</div>
          <span className="text-[10.5px] text-text-tertiary ml-auto">
            Auto-deployed when you approved
          </span>
        </div>
        <ul className="space-y-2">
          {activePhase.actions.map((a, i) => {
            // Treat first two as already executed, rest as queued — gives
            // the live state a sense of motion.
            const status = i < 2 ? "done" : "queued";
            return (
              <li key={i} className="flex gap-2.5 text-[12.5px] items-start">
                {status === "done" ? (
                  <CheckCircle2 size={12} strokeWidth={2} className="text-[#15803D] flex-shrink-0 mt-0.5" />
                ) : (
                  <Clock size={12} strokeWidth={1.7} className="text-text-tertiary flex-shrink-0 mt-0.5" />
                )}
                <span
                  className={status === "done" ? "text-text-primary" : "text-text-secondary"}
                >
                  {a}
                </span>
                {status === "done" && (
                  <span className="pill pill-ok ml-auto flex-shrink-0">Done</span>
                )}
                {status === "queued" && (
                  <span className="pill ml-auto flex-shrink-0">Queued</span>
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>

      {/* Spot's recommendations — also surface on the dashboard */}
      <motion.div variants={canvasReveal} className="mb-3">
        <div className="flex items-center mb-2">
          <div className="label-section">Recommendations for you</div>
          <span className="flex-1" />
          <a
            href="/dashboard"
            className="text-[11px] text-text-tertiary hover:text-text-primary inline-flex items-center gap-1"
          >
            All on dashboard
            <ArrowUpRight size={10} strokeWidth={1.8} />
          </a>
        </div>
        <div className="space-y-2">
          {recs.length === 0 ? (
            <div className="bg-white border border-border-subtle border-dashed rounded-card p-3.5 text-center">
              <div className="text-[12px] text-text-secondary">
                Nothing pending right now — I'll surface the next call at{" "}
                <span className="text-text-primary font-medium">{activePhase.decisionAt}</span>.
              </div>
            </div>
          ) : (
            recs.map((r) => <RecommendationCard key={r.id} rec={r} />)
          )}
        </div>
      </motion.div>

      {/* Guardrails reminder */}
      <motion.div
        variants={canvasReveal}
        className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 flex items-start gap-2.5"
      >
        <ShieldCheck size={14} strokeWidth={1.7} className="text-[#15803D] flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">Guardrails active.</span> If anything
          trips — CPL drift, frequency cap, negative sentiment — I'll pause that change
          immediately and ping you here.
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Same card shape that appears on the dashboard. Reused here so users
 * see the same "recommendation chip" inside the workflow live state.
 */
export function RecommendationCard({ rec }: { rec: PendingRecommendation }) {
  const urgencyTone =
    rec.urgency === "high" ? "pill-err" : rec.urgency === "medium" ? "pill-warn" : "pill-info";
  return (
    <div className="bg-white border border-border rounded-card p-3.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className={`pill ${urgencyTone}`}>{rec.urgency} urgency</span>
            <span className="text-[10.5px] text-text-tertiary">· {rec.surfacedAt}</span>
            <span className="text-[10.5px] text-text-tertiary">·</span>
            <span className="text-[10.5px] text-text-secondary">{rec.sourceProduct}</span>
          </div>
          <div className="text-[13px] font-semibold text-text-primary leading-tight">
            {rec.title}
          </div>
        </div>
      </div>
      <div className="text-[12px] text-text-secondary leading-relaxed mb-2">{rec.detail}</div>
      <ul className="space-y-0.5 mb-2.5">
        {rec.evidence.map((e, i) => (
          <li key={i} className="text-[11.5px] text-text-tertiary flex gap-1.5">
            <span>·</span>
            <span>{e}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
        <div className="text-[11.5px] text-text-secondary">
          <span className="text-text-tertiary">If approved:</span> {rec.projectedImpact}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] text-text-tertiary hover:text-text-primary hover:bg-surface-secondary"
          >
            Dismiss
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[11.5px] font-medium"
          >
            <SpotMark size={10} />
            Approve · ship
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Shared diagnostic Done step ════════════════════════════════ */

function DiagnosticDoneStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  const label =
    workflow.kind === "scale"
      ? "Scale plan complete."
      : workflow.kind === "optimize"
        ? "Optimize plan complete."
        : "Angle test complete.";
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-[#15803D]/10 flex items-center justify-center mb-4">
        <PartyPopper size={20} strokeWidth={1.6} className="text-[#15803D]" />
      </div>
      <div className="text-section-header text-text-primary mb-2">{label}</div>
      <p className="text-meta text-text-secondary max-w-[440px] leading-relaxed mb-4">
        Learnings written to product memory · next observation cycle queued.
      </p>
      <a
        href="/dashboard"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px] font-medium"
      >
        See on Dashboard
        <ArrowUpRight size={11} strokeWidth={1.8} />
      </a>
    </div>
  );
}
