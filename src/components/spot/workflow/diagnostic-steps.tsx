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
  ListChecks,
  Check,
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
  Lock,
  Unlock,
  Wand2,
  Pencil,
  Send,
  Loader2,
  ChevronLeft,
  Heart,
  MessageCircle,
  Bookmark,
  Music2,
  Play,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useEffect, useState } from "react";
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
  ANGLE_CANDIDATES,
  ANGLE_REVISIONS,
  type AnalysisCampaignSignal,
  type AnalysisFindings,
  type PendingRecommendation,
  type WorkflowPlan,
  type CreativeAngle,
  type AngleRevision,
} from "@/lib/spot/extended-flows";
import type { SpotMessage } from "@/lib/spot/types";

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

    case "ang-creatives":
      return <CreativeAnglesStep workflow={workflow} />;

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

export function AnalyzeStep({ workflow }: { workflow: DiagnosticWorkflow }) {
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
  const primeClarifyDefaults = useSpotStore((s) => s.primeClarifyDefaults);

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

  // The quick-pick questions now live in the chat (left panel). The
  // canvas mirrors the captured brief — it fills in live as the user
  // answers on the left.
  return (
    <motion.div
      className="px-5 py-5"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      <motion.div variants={canvasReveal}>
        <StepHeader
          title="Setup brief"
          blurb={`Answer the few quick questions in the chat — this brief fills in live with exactly what I'll work with.`}
        />
      </motion.div>

      <motion.div variants={canvasReveal}>
        <BriefCard workflow={workflow} />
      </motion.div>
    </motion.div>
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
 * CREATIVE ANGLES STEP  (test-angles only · ang-creatives)
 *
 * This is the creative-iteration surface. Spot's Creative Agent has
 * drafted a set of candidate angles; the user reviews them here and
 * iterates WITHOUT ever chatting a worker directly. Two affordances per
 * card:
 *
 *   · Revise with Spot  — the live path. User clicks a suggestion chip
 *     (or types a request); the canvas posts that request INTO the Spot
 *     chat thread, a `creative.revise` tool-call runs, and Spot redrafts
 *     the angle in place. Every revise is relayed through Spot — there's
 *     no direct user↔worker channel (Principle 1).
 *   · Edit inline       — the future path. Shown disabled ("soon") so the
 *     direction reads, but the V0 experience is the AI-revise loop.
 *
 * Locking an angle marks it as "in the test"; the header tracks the
 * locked count. Approval (fold the angles into the plan) lives in chat
 * via the step-cta, same as every other diagnostic step.
 * ═══════════════════════════════════════════════════════════════ */

// Saturated accent + gradient stops per angle. The creative mockups render
// as real ad units on a near-black card, so the gradients carry the visual.
// `dot` is the chip/accent color; `from`/`to` are the creative's backdrop.
// All applied inline (the dark theme only remaps className-based tints).
const ANGLE_HUES: Record<
  CreativeAngle["hue"],
  { dot: string; from: string; to: string }
> = {
  violet: { dot: "#8B5CF6", from: "#7C3AED", to: "#3B1380" },
  sky: { dot: "#0EA5E9", from: "#0EA5E9", to: "#0B3F66" },
  emerald: { dot: "#10B981", from: "#10B981", to: "#064E3B" },
  amber: { dot: "#F59E0B", from: "#F59E0B", to: "#9A4A09" },
  rose: { dot: "#F43F5E", from: "#F43F5E", to: "#8F1133" },
  indigo: { dot: "#6366F1", from: "#6366F1", to: "#2B2A78" },
};

type AngleHue = (typeof ANGLE_HUES)[CreativeAngle["hue"]];

/* ────────────────────────────────────────────────────────────────
 * CreativeAdPreview — renders an angle as the ACTUAL ad creative: a
 * format-specific HTML/CSS mockup (Reel 9:16 / Static square / Carousel
 * square with peek + dots), branded as the product, with the hook as the
 * scroll-stopping overlay and the CTA as a real button. This is what the
 * user sees and edits — not a markdown card.
 * ──────────────────────────────────────────────────────────────── */
function CreativeAdPreview({
  angle,
  hue,
  dimmed,
}: {
  angle: CreativeAngle;
  hue: AngleHue;
  dimmed?: boolean;
}) {
  const bg = { background: `linear-gradient(150deg, ${hue.from}, ${hue.to})` };
  const caption =
    angle.body.length > 72 ? `${angle.body.slice(0, 72).trimEnd()}…` : angle.body;

  // ── Reel · vertical 9:16 with social rail ──
  if (angle.format === "Reel") {
    return (
      <div
        className="relative"
        style={{ width: 158, height: 272, opacity: dimmed ? 0.4 : 1 }}
      >
        <div
          className="absolute inset-0 rounded-[20px] overflow-hidden flex flex-col"
          style={{ ...bg, boxShadow: "0 18px 40px -12px rgba(0,0,0,0.7)" }}
        >
          <span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0) 28%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62))",
            }}
            aria-hidden
          />
          {/* brand row */}
          <div className="relative flex items-center gap-1.5 px-2.5 pt-2.5">
            <span
              className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[9px] font-extrabold"
              style={{ color: hue.dot }}
            >
              g
            </span>
            <div className="leading-none">
              <div className="text-[8.5px] font-semibold text-white">
                guyju.learning
              </div>
              <div className="text-[7px] text-white/70 mt-[1px]">Sponsored</div>
            </div>
          </div>
          {/* play affordance */}
          <div className="relative flex-1 flex items-center justify-center">
            <span className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-[2px] flex items-center justify-center">
              <Play size={14} className="text-white ml-[1px]" fill="currentColor" />
            </span>
          </div>
          {/* hook overlay */}
          <div className="relative px-2.5">
            <p
              className="text-[12px] font-bold text-white leading-[1.18]"
              style={{ textShadow: "0 1px 10px rgba(0,0,0,0.5)" }}
            >
              {angle.hook}
            </p>
            <p className="text-[8px] text-white/80 leading-snug mt-1 line-clamp-2">
              {caption}
            </p>
          </div>
          {/* CTA */}
          <div className="relative px-2.5 pb-2.5 pt-1.5">
            <span
              className="flex items-center justify-center gap-1 h-6 rounded-md bg-white text-[9px] font-semibold"
              style={{ color: hue.dot }}
            >
              {angle.cta}
              <ArrowUpRight size={9} strokeWidth={2.6} />
            </span>
          </div>
        </div>
        {/* social rail */}
        <div className="absolute right-[-20px] bottom-4 flex flex-col items-center gap-2.5 text-white/70">
          <Heart size={13} strokeWidth={2} />
          <MessageCircle size={13} strokeWidth={2} />
          <Send size={12} strokeWidth={2} />
          <Bookmark size={12} strokeWidth={2} />
          <span className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center">
            <Music2 size={8} strokeWidth={2} />
          </span>
        </div>
      </div>
    );
  }

  // ── Static + Carousel · square ──
  const isCarousel = angle.format === "Carousel";
  return (
    <div className="relative" style={{ opacity: dimmed ? 0.4 : 1 }}>
      <div
        className="relative rounded-[16px] overflow-hidden flex flex-col"
        style={{
          ...bg,
          width: 248,
          height: 248,
          boxShadow: "0 18px 40px -12px rgba(0,0,0,0.7)",
        }}
      >
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0) 34%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.55))",
          }}
          aria-hidden
        />
        {/* brand row */}
        <div className="relative flex items-center gap-1.5 px-3 pt-3">
          <span
            className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[11px] font-extrabold"
            style={{ color: hue.dot }}
          >
            g
          </span>
          <div className="leading-none">
            <div className="text-[10px] font-semibold text-white">
              guyju.learning
            </div>
            <div className="text-[8px] text-white/70 mt-[1px]">Sponsored</div>
          </div>
          {isCarousel && (
            <div className="ml-auto flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: i === 0 ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
        {/* hook */}
        <div className="relative flex-1 flex items-center px-3.5">
          <p
            className="text-[16px] font-bold text-white leading-[1.16]"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.45)" }}
          >
            {angle.hook}
          </p>
        </div>
        {/* CTA */}
        <div className="relative px-3 pb-3">
          <span
            className="flex items-center justify-center gap-1 h-8 rounded-lg bg-white text-[11px] font-semibold"
            style={{ color: hue.dot }}
          >
            {angle.cta}
            <ArrowUpRight size={11} strokeWidth={2.6} />
          </span>
        </div>
      </div>
      {/* carousel peek strip */}
      {isCarousel && (
        <div
          className="absolute right-[-9px] top-7 bottom-7 w-2.5 rounded-r-[8px]"
          style={{ background: hue.to, opacity: 0.55 }}
          aria-hidden
        />
      )}
    </div>
  );
}

const CREATIVE_LOADER_MESSAGES = [
  "Reading the winning pattern from memory…",
  "Drafting fresh angles from the brief…",
  "Grounding each hook in specificity + autonomy…",
  "Screening against memory constraints…",
  "Laying out the candidate set…",
];

function CreativeAnglesLoader() {
  return (
    <div className="h-full flex items-center justify-center px-5 py-8">
      <SpotFullscreen
        title="Drafting fresh angles"
        messages={CREATIVE_LOADER_MESSAGES}
        size={64}
        className="!min-h-[360px]"
      />
    </div>
  );
}

function CreativeAnglesStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  const appendMessage = useSpotStore((s) => s.appendMessage);
  const setThread = useSpotStore((s) => s.setThread);

  // Per-angle version history. history[id] is the ordered list of drafts
  // (index 0 = the original). An AI-revise appends a version; a manual
  // copy edit mutates the active version in place. cursor[id] is the
  // version currently shown (undefined = latest). This is the source of
  // truth for both the rendered creative and the "v2/3" scrubber.
  const [history, setHistory] = useState<Record<string, CreativeAngle[]>>({});
  const [cursor, setCursor] = useState<Record<string, number>>({});
  // Which cards are in inline copy-edit mode.
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  // Which angles the user has locked into the test.
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  // Which card has its "revise with Spot" panel open (one at a time).
  const [openReviseFor, setOpenReviseFor] = useState<string | null>(null);
  // Free-text revise draft for the open card.
  const [draft, setDraft] = useState("");
  // The angle id Spot is currently redrafting (locks that card's UI).
  const [revising, setRevising] = useState<string | null>(null);

  if (!workflow.ready) {
    return <CreativeAnglesLoader />;
  }

  // ── Version helpers ──
  const historyFor = (base: CreativeAngle): CreativeAngle[] =>
    history[base.id] ?? [base];
  const activeIndex = (id: string, hist: CreativeAngle[]) => {
    const c = cursor[id];
    if (c === undefined) return hist.length - 1;
    return Math.max(0, Math.min(c, hist.length - 1));
  };
  const activeIndexFor = (base: CreativeAngle) =>
    activeIndex(base.id, historyFor(base));
  const activeAngle = (base: CreativeAngle): CreativeAngle =>
    historyFor(base)[activeIndexFor(base)];

  const lockedCount = ANGLE_CANDIDATES.filter((a) => locked[a.id]).length;

  // Relay a revise request THROUGH Spot: post the user's ask + a running
  // creative.revise tool-call into the chat, then after a beat flip it to
  // done, append Spot's confirmation, and APPEND a new version (jumping
  // the scrubber to it). Revises from whatever version is currently active.
  const commitRevision = (
    base: CreativeAngle,
    rev: AngleRevision,
    userText: string,
  ) => {
    if (revising) return;
    const id = base.id;
    const callId = `revise-${id}-${Date.now()}`;

    setThread((prev: SpotMessage[]) => [
      ...prev,
      { role: "user", text: userText },
      {
        role: "spot",
        parts: [
          {
            type: "tool-call",
            id: callId,
            agent: "creative.revise",
            detail:
              "redrafting the angle · keeping the winning pattern · re-screening against memory constraints…",
            status: "running",
          },
        ],
      },
    ]);
    setRevising(id);
    setOpenReviseFor(null);
    setEditing((e) => ({ ...e, [id]: false }));
    setDraft("");

    window.setTimeout(() => {
      // Flip the most recent matching tool-call to done.
      setThread((prev: SpotMessage[]) =>
        prev.map((m) =>
          m.role === "spot"
            ? {
                ...m,
                parts: m.parts.map((p) =>
                  p.type === "tool-call" && p.id === callId
                    ? { ...p, status: "done" as const }
                    : p,
                ),
              }
            : m,
        ),
      );
      appendMessage({ role: "spot", parts: [{ type: "text", text: rev.note }] });
      // Append a new version, derived from the active one so unspecified
      // fields (incl. visualConcept) carry over.
      setHistory((h) => {
        const hist = h[id] ?? [base];
        const from = hist[activeIndex(id, hist)];
        const next: CreativeAngle = {
          ...from,
          ...rev.angle,
          id: from.id,
          hue: from.hue,
          visualConcept: rev.angle.visualConcept ?? from.visualConcept,
        };
        return { ...h, [id]: [...hist, next] };
      });
      // Jump the scrubber to the freshly-appended latest version.
      setCursor((c) => {
        const n = { ...c };
        delete n[id];
        return n;
      });
      setRevising(null);
    }, 2200);
  };

  const onPickRevision = (base: CreativeAngle, rev: AngleRevision) => {
    commitRevision(
      base,
      rev,
      `Revise "${base.label}" — ${rev.changeLabel.toLowerCase()}.`,
    );
  };

  const onSubmitFreeText = (base: CreativeAngle) => {
    const text = draft.trim();
    if (!text) return;
    const revs = ANGLE_REVISIONS[base.id] ?? [];
    if (revs.length === 0) return;
    // Loosely map the free-text ask onto a pre-authored revision; fall
    // back to the first. The note quotes the user so it reads bespoke.
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matched =
      revs.find((r) =>
        words.some((w) => r.changeLabel.toLowerCase().includes(w)),
      ) ?? revs[0];
    const note = `Redrafted "${base.label}" around your note — "${text}". Kept the winning pattern (specificity + autonomy) and re-screened it against your memory constraints.`;
    commitRevision(base, { ...matched, note }, `Revise "${base.label}" — ${text}`);
  };

  // Manual inline edit — mutate the active version's copy in place. The
  // creative above updates live as the user types.
  const updateField = (
    base: CreativeAngle,
    field: "hook" | "body" | "cta",
    value: string,
  ) => {
    const id = base.id;
    setHistory((h) => {
      const hist = h[id] ?? [base];
      const idx = activeIndex(id, hist);
      const next = hist.slice();
      next[idx] = { ...next[idx], [field]: value };
      return { ...h, [id]: next };
    });
  };

  // Scrub the version history. Closes edit mode so the user isn't typing
  // into a version that's about to slide away.
  const goVersion = (base: CreativeAngle, dir: -1 | 1) => {
    const hist = historyFor(base);
    const idx = activeIndexFor(base);
    const nextIdx = Math.max(0, Math.min(hist.length - 1, idx + dir));
    setCursor((c) => ({ ...c, [base.id]: nextIdx }));
    setEditing((e) => ({ ...e, [base.id]: false }));
  };

  const toggleLock = (id: string) =>
    setLocked((l) => ({ ...l, [id]: !l[id] }));

  const toggleEditing = (id: string) => {
    setEditing((e) => ({ ...e, [id]: !e[id] }));
    setOpenReviseFor(null);
  };

  const toggleRevise = (id: string) => {
    setOpenReviseFor((cur) => (cur === id ? null : id));
    setEditing((e) => ({ ...e, [id]: false }));
  };

  return (
    <motion.div
      className="px-5 py-5 max-w-[900px] mx-auto"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      {/* Header */}
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#FAF8F2] border border-[#E8E3D5]">
            <Sparkles size={11} strokeWidth={2} className="text-text-secondary" />
            <span className="text-[10.5px] uppercase tracking-wider text-text-secondary font-semibold">
              Candidate creatives · {ANGLE_CANDIDATES.length}
            </span>
          </span>
          <span className="text-[11px] text-text-tertiary">
            Grounded in the winning pattern · {workflow.productName}
          </span>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#FAF8F2] border border-[#E8E3D5] text-[11px] font-medium ${
              lockedCount > 0 ? "text-[#15803D]" : "text-text-tertiary"
            }`}
          >
            <Lock size={11} strokeWidth={2} />
            {lockedCount} of {ANGLE_CANDIDATES.length} locked
          </span>
        </div>
        <StepHeader
          title="Fresh creatives to test"
          blurb="Each one is rendered as the actual ad — built off the winning pattern (specificity + parent autonomy) and screened against your constraints (no outcome promises, no competitor name-checks). Edit the copy right on the card, scrub each one's version history, or tell me how to revise it and I'll redraft it. Lock the ones you want in the test."
        />
      </motion.div>

      {/* Creative grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {ANGLE_CANDIDATES.map((base) => {
          const angle = activeAngle(base);
          const hue = ANGLE_HUES[angle.hue];
          const hist = historyFor(base);
          const idx = activeIndexFor(base);
          const isLocked = !!locked[base.id];
          const isRevising = revising === base.id;
          const isOpen = openReviseFor === base.id;
          const isEditing = !!editing[base.id];
          const revs = ANGLE_REVISIONS[base.id] ?? [];

          return (
            <motion.div
              key={base.id}
              variants={canvasReveal}
              className={`relative bg-white border rounded-card overflow-hidden flex flex-col ${
                isLocked ? "" : "border-border"
              }`}
              style={
                isLocked
                  ? { borderColor: hue.dot, boxShadow: `inset 0 0 0 1px ${hue.dot}` }
                  : undefined
              }
            >
              {/* Accent rail */}
              <span
                className="absolute left-0 top-0 bottom-0 w-[3px] z-10"
                style={{ background: hue.dot }}
                aria-hidden
              />

              {/* ── Creative stage — the rendered ad ── */}
              <div
                className="relative flex items-center justify-center px-4 pt-9 pb-5"
                style={{ minHeight: 308 }}
              >
                {/* hue glow behind the creative */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(58% 52% at 50% 44%, ${hue.dot}26, transparent 72%)`,
                  }}
                  aria-hidden
                />
                {/* format badge */}
                <span
                  className="absolute top-3 left-5 z-10 inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                  style={{ background: `${hue.dot}24`, color: hue.dot }}
                >
                  {angle.format}
                </span>
                {/* version scrubber */}
                {hist.length > 1 && (
                  <div className="absolute top-3 right-4 z-10 inline-flex items-center gap-0.5 h-6 px-1 rounded-full bg-[#FAF8F2] border border-[#E8E3D5]">
                    <button
                      type="button"
                      onClick={() => goVersion(base, -1)}
                      disabled={idx === 0}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-text-secondary hover:bg-[#E8E3D5] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      aria-label="Previous version"
                    >
                      <ChevronLeft size={13} strokeWidth={2.2} />
                    </button>
                    <span className="text-[10px] font-semibold text-text-secondary tabular-nums px-0.5">
                      v{idx + 1}/{hist.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => goVersion(base, 1)}
                      disabled={idx === hist.length - 1}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-text-secondary hover:bg-[#E8E3D5] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      aria-label="Next version"
                    >
                      <ChevronRight size={13} strokeWidth={2.2} />
                    </button>
                  </div>
                )}

                <CreativeAdPreview angle={angle} hue={hue} dimmed={isRevising} />

                {/* redrafting overlay */}
                {isRevising && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <span className="inline-flex items-center gap-2 h-8 px-3.5 rounded-full bg-black/60 backdrop-blur-sm text-[11.5px] font-medium text-white">
                      <Loader2 size={13} className="animate-spin" />
                      Spot is redrafting…
                    </span>
                  </div>
                )}
              </div>

              {/* ── Meta + controls ── */}
              <div className="px-4 pb-4 pl-5 border-t border-border">
                {/* label + pattern tag */}
                <div className="flex items-center gap-1.5 pt-3 mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                    {angle.label}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-text-tertiary">
                    <span
                      className="inline-flex w-1.5 h-1.5 rounded-full"
                      style={{ background: hue.dot }}
                    />
                    {angle.patternTag}
                  </span>
                </div>

                {/* art direction caption */}
                <p className="text-[11px] text-text-tertiary leading-snug mb-3">
                  <span
                    className="font-semibold uppercase tracking-wider text-[9px] mr-1.5"
                    style={{ color: hue.dot }}
                  >
                    Art direction
                  </span>
                  {angle.visualConcept}
                </p>

                {/* Action row */}
                {!isRevising && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleLock(base.id)}
                      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors ${
                        isLocked ? "" : "bg-[#FAF8F2] text-text-secondary"
                      }`}
                      style={isLocked ? { background: hue.dot, color: "#fff" } : undefined}
                    >
                      {isLocked ? (
                        <>
                          <Lock size={12} strokeWidth={2.2} /> Locked
                        </>
                      ) : (
                        <>
                          <Unlock size={12} strokeWidth={2} /> Lock in
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleEditing(base.id)}
                      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition-colors ${
                        isEditing
                          ? "bg-[#FAF8F2] border-text-tertiary text-text-primary"
                          : "bg-white border-border text-text-primary hover:bg-[#FAF8F2]"
                      }`}
                    >
                      <Pencil size={12} strokeWidth={2} />
                      {isEditing ? "Done editing" : "Edit copy"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleRevise(base.id)}
                      disabled={!!revising}
                      className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11.5px] font-medium bg-white border border-border text-text-primary hover:bg-[#FAF8F2] transition-colors disabled:opacity-40"
                    >
                      <Wand2 size={12} strokeWidth={2} />
                      Revise with Spot
                    </button>
                  </div>
                )}

                {/* Inline edit panel */}
                {isEditing && !isRevising && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Pencil size={12} strokeWidth={2} className="text-text-secondary" />
                      <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
                        Edit the copy
                      </span>
                      <span className="ml-auto text-[10px] text-text-tertiary">
                        saving to v{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleEditing(base.id)}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-text-tertiary hover:bg-[#FAF8F2] transition-colors"
                        aria-label="Close editor"
                      >
                        <X size={13} strokeWidth={2} />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                          Hook
                        </label>
                        <textarea
                          value={angle.hook}
                          onChange={(e) => updateField(base, "hook", e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-white text-[12.5px] font-semibold text-text-primary leading-snug resize-none focus:outline-none focus:border-text-tertiary"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                          Body
                        </label>
                        <textarea
                          value={angle.body}
                          onChange={(e) => updateField(base, "body", e.target.value)}
                          rows={3}
                          className="w-full px-2.5 py-1.5 rounded-md border border-border bg-white text-[12px] text-text-secondary leading-relaxed resize-none focus:outline-none focus:border-text-tertiary"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
                          Button
                        </label>
                        <input
                          value={angle.cta}
                          onChange={(e) => updateField(base, "cta", e.target.value)}
                          className="w-full h-8 px-2.5 rounded-md border border-border bg-white text-[12px] font-medium text-text-primary focus:outline-none focus:border-text-tertiary"
                        />
                      </div>
                    </div>
                    <p className="text-[10.5px] text-text-tertiary mt-2 flex items-center gap-1.5">
                      <Eye size={11} strokeWidth={2} />
                      The creative above updates live as you type.
                    </p>
                  </motion.div>
                )}

                {/* Revise-with-Spot panel */}
                {isOpen && !isRevising && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <SpotMark size={13} />
                      <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
                        Tell Spot how to revise it
                      </span>
                    </div>

                    {/* Suggestion chips */}
                    {revs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {revs.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onPickRevision(base, r)}
                            className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-medium bg-[#FAF8F2] border border-[#E8E3D5] text-text-secondary hover:border-text-tertiary hover:text-text-primary transition-colors"
                          >
                            <Sparkles size={10} strokeWidth={2} />
                            {r.changeLabel}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Free-text */}
                    <div className="flex items-center gap-1.5">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSubmitFreeText(base);
                        }}
                        placeholder='e.g. "make the hook warmer" or "lead with the mentor"'
                        className="flex-1 h-8 px-2.5 rounded-md border border-border bg-white text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-tertiary"
                      />
                      <button
                        type="button"
                        onClick={() => onSubmitFreeText(base)}
                        disabled={!draft.trim()}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white transition-opacity disabled:opacity-30"
                        style={{ background: hue.dot }}
                        aria-label="Send revise request to Spot"
                      >
                        <Send size={13} strokeWidth={2} />
                      </button>
                    </div>
                    <p className="text-[10.5px] text-text-tertiary mt-1.5">
                      Spot redrafts it as a new version and posts the change in
                      your chat — your constraints are re-checked automatically.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint — approval lives in chat */}
      <motion.div
        variants={canvasReveal}
        className="mt-4 flex items-center gap-2 text-[11.5px] text-text-tertiary"
      >
        <Check size={13} strokeWidth={2} className="text-[#15803D]" />
        When the set looks right, approve in the chat and I&apos;ll fold these
        into the time-phased test plan.
      </motion.div>
    </motion.div>
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
          blurb="The exact moves I'll make right now — one approval, and I execute the checklist. No multi-week roadmap; when the data shifts, my analyst reports back and I plan the next move then."
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

      {/* The plan — a single concrete set of moves to make now. Spot's
          plans are one-time ("do this now"), never a multi-week roadmap. */}
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="label-section mb-2">The plan · what I&apos;ll do now</div>
        <NowPlanCard phase={plan.phases[0]} />
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

/**
 * NowPlanCard · the single concrete plan Spot will execute now. No week
 * labels, no "decide later" — Spot plans only what to do right now; the
 * next move is planned when the analyst reports back. Shows the moves
 * (the checklist that gets executed) + what Spot will watch after.
 */
function NowPlanCard({ phase }: { phase: WorkflowPlan["phases"][number] }) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-page flex items-center gap-2.5">
        <ListChecks size={14} strokeWidth={1.8} className="text-text-secondary flex-shrink-0" />
        <div className="text-[13px] font-medium text-text-primary leading-tight">
          {phase.title}
        </div>
        <span className="pill pill-info inline-flex items-center gap-1 flex-shrink-0 ml-auto">
          {phase.actions.length} moves
        </span>
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Zap size={10} strokeWidth={1.8} className="text-text-secondary" />
            <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-medium">
              What I&apos;ll do now
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
              What I&apos;ll watch
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
    </div>
  );
}

const PLAN_LOADER_MESSAGES = [
  "Reading product memory…",
  "Fetching personas + audience graph…",
  "Auditing recent creatives…",
  "Pulling competitor positioning…",
  "Sequencing phases · setting guardrails…",
  "Composing the execution plan…",
];

function PlanLoader() {
  return (
    <div className="h-full flex items-center justify-center px-5 py-8">
      <SpotFullscreen
        title="Building the execution plan"
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

/** Hard-coded "what changed" diff per diagnostic workflow kind. Lets
 *  the LiveStep open with a concrete delta of the user's update vs
 *  the previous plan, instead of leaving them to guess. */
const PLAN_DELTA: Record<
  "scale" | "optimize" | "test-angles",
  {
    summary: string;
    changes: { kind: "new" | "updated" | "removed"; text: string }[];
  }
> = {
  scale: {
    summary:
      "I've folded your scale picks into the existing plan. The winning ad sets get more budget and lookalike expansions; the decay units get trimmed.",
    changes: [
      { kind: "new", text: "Scale up Class 11 LAL ad set by 2× over Week 1" },
      { kind: "new", text: "Add 1% lookalike expansion on the top mentor-led hook" },
      { kind: "updated", text: "Daily cap raised · ₹8K → ₹16K on the winners" },
      { kind: "removed", text: "Dropped the chronic-decay 'parents see weekly progress' line" },
    ],
  },
  optimize: {
    summary:
      "I've added the fix list to the existing plan — pause the broken units first, then ship the refresh briefs, then swap audiences where saturation is high.",
    changes: [
      { kind: "new", text: "Pause the fatigued 'Parents see weekly progress' Reel" },
      { kind: "new", text: "Brief Creative Agent on 2 new NEET hooks · mentor-led + biology-first" },
      { kind: "updated", text: "Re-frame: 'parents see' → 'your kid tracks their own progress'" },
      { kind: "updated", text: "Rewrite the Foundation creative brief · enforce the memory constraint" },
    ],
  },
  "test-angles": {
    summary:
      "I've added a 6-angle Persona × Angle test matrix to the execution plan. Each angle gets equal budget for the learn window; early-stop guardrail will cut losers.",
    changes: [
      { kind: "new", text: "Add 6 new angles · 3 personas × 2 hooks each" },
      { kind: "new", text: "Set 50/50 traffic split across angles within each ad set" },
      { kind: "updated", text: "Learn window · 7 days minimum before any pause" },
      { kind: "updated", text: "Daily cap held at ₹6K/angle to keep the test honest" },
    ],
  },
};

/** Animated task list that progresses queued → running → done over
 *  real seconds. Replaces the previous "i < 2 means done" hack so
 *  the live state actually feels like Spot working in the background. */
function useAnimatedTasks(taskCount: number, taskDurationMs = 6000) {
  const [doneCount, setDoneCount] = useState(0);
  const [progress, setProgress] = useState(2);
  const TOTAL = Math.max(1, taskCount) * taskDurationMs;
  useEffect(() => {
    setDoneCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < taskCount; i++) {
      timers.push(setTimeout(() => setDoneCount(i + 1), (i + 1) * taskDurationMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [taskCount, taskDurationMs]);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(99, (elapsed / TOTAL) * 100);
      setProgress(pct);
      if (pct >= 99) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [TOTAL]);
  return { doneCount, progress };
}

function LiveStep({ workflow }: { workflow: DiagnosticWorkflow }) {
  const plan = planFor(workflow.kind);
  const activePhase = plan.phases[0]; // Always start on phase 1.
  const delta = PLAN_DELTA[workflow.kind];
  const { doneCount, progress } = useAnimatedTasks(activePhase.actions.length, 5500);
  const allDone = doneCount >= activePhase.actions.length;
  // Surface recommendations for this product if any exist · we hold
  // these back until the initial task list has finished so the user
  // sees Spot work through the queue first, then the next decisions.
  const recs = allDone
    ? PENDING_RECOMMENDATIONS.filter(
        (r) =>
          r.sourceKind === workflow.kind && r.sourceProduct === workflow.productName,
      )
    : [];

  return (
    <motion.div className="px-5 py-5" initial="hidden" animate="show" variants={canvasStagger}>
      <motion.div variants={canvasReveal} className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex w-2 h-2 rounded-full bg-[#22C55E] relative">
            <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-50 animate-ping" />
          </span>
          <span className="text-[11.5px] uppercase tracking-wider text-[#15803D] font-semibold">
            {allDone ? "Execution plan live · monitoring" : "New execution plan · Spot is working on it"}
          </span>
        </div>
        <h2 className="text-section-header text-text-primary">
          {workflow.kind === "scale"
            ? "Scale execution plan"
            : workflow.kind === "optimize"
              ? "Optimization execution plan"
              : "Angle-test execution plan"}{" "}
          · {workflow.productName}
        </h2>
        <p className="text-meta text-text-secondary mt-1 max-w-[680px]">
          {delta.summary}
        </p>
      </motion.div>

      {/* ── What changed · concrete delta vs the previous execution plan ── */}
      <motion.div
        variants={canvasReveal}
        className="bg-white border border-border rounded-card p-4 mb-3"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[12px]" aria-hidden>
            ✏️
          </span>
          <div className="label-section">What changed</div>
          <span className="text-[10.5px] text-text-tertiary ml-auto">
            {delta.changes.length} updates · in this execution plan
          </span>
        </div>
        <ul className="space-y-1.5">
          {delta.changes.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px]">
              <span
                className="inline-flex items-center h-4 px-1.5 rounded-full text-[9.5px] uppercase tracking-wider font-semibold flex-shrink-0 mt-0.5"
                style={
                  c.kind === "new"
                    ? {
                        background: "#0E2A1A",
                        color: "#34D399",
                        border: "1px solid #1A4D2A",
                      }
                    : c.kind === "updated"
                      ? {
                          background: "#102A2A",
                          color: "#67E8F9",
                          border: "1px solid #1A4D4D",
                        }
                      : {
                          background: "#2A1010",
                          color: "#F87171",
                          border: "1px solid #4D1A1A",
                        }
                }
              >
                {c.kind}
              </span>
              <span className="text-text-primary leading-relaxed flex-1">{c.text}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* ── Tasks running now · animated queued → running → done ── */}
      <motion.div
        variants={canvasReveal}
        className="bg-white border border-border rounded-card p-4 mb-3"
      >
        <div className="flex items-center gap-1.5 mb-3">
          {allDone ? (
            <CheckCircle2 size={13} strokeWidth={2} className="text-[#15803D]" />
          ) : (
            <Activity size={13} strokeWidth={1.7} className="text-text-secondary" />
          )}
          <div className="label-section">
            {allDone ? "Plan deployed" : "Spot is executing the plan"}
          </div>
          <span className="text-[10.5px] text-text-tertiary ml-auto tabular">
            {doneCount} of {activePhase.actions.length} tasks complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3.5">
          <div
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full transition-all duration-300 ease-out relative"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, #C9A86A 0%, #E0C083 60%, #22C55E 100%)",
              }}
            >
              {!allDone && (
                <span
                  aria-hidden
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "#22C55E",
                    boxShadow:
                      "0 0 14px 3px rgba(34, 197, 94, 0.55), 0 0 4px rgba(255,255,255,0.4)",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {activePhase.actions.map((a, i) => {
            const done = i < doneCount;
            const running = i === doneCount;
            const queued = i > doneCount;
            return (
              <li
                key={i}
                className="flex gap-2.5 text-[12.5px] items-start py-1 transition-colors"
              >
                {done && (
                  <CheckCircle2
                    size={13}
                    strokeWidth={2}
                    className="text-[#15803D] flex-shrink-0 mt-0.5"
                  />
                )}
                {running && (
                  <Activity
                    size={13}
                    strokeWidth={1.8}
                    className="text-[#C9A86A] flex-shrink-0 mt-0.5 animate-pulse"
                  />
                )}
                {queued && (
                  <Clock
                    size={12}
                    strokeWidth={1.7}
                    className="text-text-tertiary flex-shrink-0 mt-0.5"
                  />
                )}
                <span
                  className={
                    done
                      ? "text-text-primary flex-1"
                      : running
                        ? "text-text-primary font-medium flex-1"
                        : "text-text-secondary flex-1"
                  }
                >
                  {a}
                </span>
                {done && (
                  <span className="pill pill-ok flex-shrink-0">Done</span>
                )}
                {running && (
                  <span
                    className="pill flex-shrink-0"
                    style={{
                      background: "#2A2210",
                      color: "#E0C083",
                      border: "1px solid #4D3D1A",
                    }}
                  >
                    Running…
                  </span>
                )}
                {queued && <span className="pill flex-shrink-0">Queued</span>}
              </li>
            );
          })}
        </ul>

        {!allDone && (
          <div
            className="mt-3 pt-3 border-t border-border-subtle text-[11.5px] leading-relaxed flex items-start gap-2"
            style={{ color: "#8A8980" }}
          >
            <span className="text-[12px]" aria-hidden>
              ☕
            </span>
            <span>
              Spot will keep running these in the background — feel free to
              step away. I&apos;ll surface the next decision here when one
              of the watchers fires.
            </span>
          </div>
        )}
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
                Nothing pending right now — I&apos;ll surface the next call here{" "}
                <span className="text-text-primary font-medium">when a watcher fires</span>.
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
  // Local state · "open" → buttons visible, "approved" / "dismissed"
  // → swap the footer for an outcome chip so the user sees the action
  // landed. Demo-local · in real life this would persist server-side.
  const [state, setState] = useState<"open" | "approved" | "dismissed">("open");

  return (
    <div
      className="bg-white border border-border rounded-card p-3.5 transition-opacity"
      style={state === "dismissed" ? { opacity: 0.55 } : undefined}
    >
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
        {state === "open" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setState("dismissed")}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] text-text-tertiary hover:text-text-primary hover:bg-surface-secondary"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => setState("approved")}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-button text-[11.5px] font-semibold transition-colors"
              style={{
                background:
                  "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
                color: "#0A0A09",
                boxShadow: "0 1px 0 rgba(0,0,0,0.05) inset",
              }}
            >
              <SpotMark size={10} />
              Approve · ship
            </button>
          </div>
        )}
        {state === "approved" && (
          <span
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10.5px] uppercase tracking-wider font-semibold"
            style={{
              background: "#0E2A1A",
              color: "#34D399",
              border: "1px solid #1A4D2A",
            }}
          >
            <Check size={11} strokeWidth={2.4} />
            Shipped · live
          </span>
        )}
        {state === "dismissed" && (
          <span
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10.5px] uppercase tracking-wider font-semibold"
            style={{
              background: "#1F1F1D",
              color: "#8A8980",
              border: "1px solid #2E2E2A",
            }}
          >
            Dismissed
          </span>
        )}
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
