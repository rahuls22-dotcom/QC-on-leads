"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Bot, PhoneCall, ArrowRight, Check, Sparkles, Headphones, Mic, Volume2,
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";

// Post-signup welcome page. The user arrives here after the
// `/onboarding` wizard with two flags stashed in sessionStorage:
//   • onboarding_profile  — the captured signup info
//   • onboarding_in_progress = "true" — drives the guided plan
//
// Two more flags are watched here and flipped elsewhere in the app:
//   • onboarding_agent_done    — set when the user creates their first
//                                voice agent (via /agents)
//   • onboarding_outreach_done — set when the user launches their first
//                                outreach (via /outreach/create)
//
// The page reads them on mount + when it regains focus so the user
// sees the green check the moment they navigate back here from a flow.

type Profile = {
  fullName?: string;
  projectName?: string;
  useCase?: string;
  useCaseNote?: string;
};

const USE_CASE_LABEL: Record<string, string> = {
  "lead-qual":  "qualify inbound leads",
  "follow-up":  "follow up after a touchpoint",
  "re-engage":  "re-engage old leads",
  "survey":     "run a survey",
  "other":      "this use case",
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

export default function WelcomePage() {
  const router = useRouter();
  const [profile, setProfile]           = useState<Profile>({});
  const [agentDone, setAgentDone]       = useState(false);
  const [outreachDone, setOutreachDone] = useState(false);

  // Read flags from sessionStorage. Re-runs on focus so when the user
  // creates an agent in another tab/flow and comes back, the green
  // check appears without a hard refresh.
  const syncFromStorage = () => {
    try {
      const raw = sessionStorage.getItem("onboarding_profile");
      if (raw) setProfile(JSON.parse(raw) as Profile);
      setAgentDone(sessionStorage.getItem("onboarding_agent_done") === "true");
      setOutreachDone(sessionStorage.getItem("onboarding_outreach_done") === "true");
    } catch {
      /* ignore — sandboxed storage */
    }
  };

  useEffect(() => {
    syncFromStorage();
    const onFocus = () => syncFromStorage();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const firstName = useMemo(() => {
    const n = (profile.fullName || "").trim();
    if (!n) return "";
    return n.split(/\s+/)[0];
  }, [profile.fullName]);

  const useCaseText = profile.useCase
    ? (profile.useCase === "other" && profile.useCaseNote
        ? profile.useCaseNote
        : USE_CASE_LABEL[profile.useCase] ?? "this use case")
    : "this use case";

  const allDone = agentDone && outreachDone;

  // CTA wiring — each step navigates to its respective flow with an
  // ?onboarding=1 query param. The receiving page reads that flag and
  // (1) flips the matching done bit on success, (2) routes back here.
  const startAgent    = () => router.push("/agents?create=1&onboarding=1");
  const startOutreach = () => router.push("/outreach/create?onboarding=1");

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="max-w-[860px] mx-auto pb-12"
    >
      {/* Greeting hero — Spot mark + personalised welcome. Quiet,
          not splashy: a sentence about what we're about to do, anchored
          by a small AI mark so the user reads this as a guided moment
          rather than just another dashboard. */}
      <motion.div variants={fadeUp} className="pt-8 pb-7">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-accent/5 mb-4">
          <SpotMark size={20} />
        </div>
        <h1 className="text-[26px] font-semibold text-text-primary leading-tight">
          Welcome to Revspot{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="text-[14px] text-text-secondary leading-relaxed mt-2 max-w-[600px]">
          We&apos;ll get you to your first live outreach in two steps. Set up the
          voice agent that&apos;ll be on the call, then point it at an audience
          and watch the dialing start. Built for{" "}
          <span className="font-medium text-text-primary">{useCaseText}</span>
          {profile.projectName ? <> · {profile.projectName}</> : null}.
        </p>
      </motion.div>

      {/* Progress chip — small, sits above the two cards. Shows 0/2,
          1/2, 2/2 as the user works through. */}
      <motion.div variants={fadeUp} className="mb-4 flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-secondary">
          <span className={`w-1.5 h-1.5 rounded-full ${allDone ? "bg-[#15803D]" : "bg-text-tertiary"}`} />
          <span className="text-[11.5px] font-medium text-text-secondary tabular-nums">
            {Number(agentDone) + Number(outreachDone)} of 2 steps done
          </span>
        </div>
        {allDone && (
          <span className="text-[11.5px] text-[#15803D] font-medium">
            You&apos;re all set — your outreach is live.
          </span>
        )}
      </motion.div>

      {/* The plan — two large numbered cards, stacked. Each one names
          the concept ("Voice agent", "Outreach"), explains what it does
          in two-to-three sentences, and ends with a primary CTA that
          takes the user into the matching flow. Once the user finishes
          the flow and returns here the card flips to a "done" treatment
          (green check, muted CTA, link to view what was created). */}
      <motion.div variants={fadeUp} className="space-y-3">
        <StepCard
          number={1}
          done={agentDone}
          icon={Bot}
          title="Create your voice agent"
          headline="An agent is the AI voice that calls your leads."
          bullets={[
            { icon: Mic,        text: "Choose a voice — male/female, language, accent." },
            { icon: Sparkles,   text: "Write a short script — what the agent should say, what to qualify on." },
            { icon: Headphones, text: "Hear a sample call before going live." },
          ]}
          cta="Create agent"
          onCta={startAgent}
          doneLabel="Agent created"
          doneCtaLabel="View agents"
          onDoneCta={() => router.push("/agents")}
          locked={false}
        />

        <StepCard
          number={2}
          done={outreachDone}
          icon={PhoneCall}
          title="Launch your first outreach"
          headline="An outreach turns your contact list into AI voice-agent dials."
          bullets={[
            { icon: Volume2,  text: "Pick your agent, set how many retries are OK." },
            { icon: Sparkles, text: "Upload a CSV — name + phone columns. We validate every row." },
            { icon: PhoneCall, text: "Hit launch and watch dials, connects, and qualified leads come in." },
          ]}
          cta="Launch outreach"
          onCta={startOutreach}
          doneLabel="Outreach is live"
          doneCtaLabel="Open outreach"
          onDoneCta={() => router.push("/outreach")}
          locked={!agentDone}
          lockedReason="Create your agent first — your outreach needs a voice to use."
        />
      </motion.div>

      {/* All-done celebration band. Shows only when both steps are
          green. Doesn't try to be a separate screen — sits below the
          plan as a quiet "you're done, here's the next thing to do". */}
      {allDone && (
        <motion.div variants={fadeUp} className="mt-6 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
            <Check size={18} strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold text-[#14532D]">
              You&apos;re live, {firstName || "there"}.
            </div>
            <div className="text-[12px] text-[#15803D] mt-0.5 leading-relaxed">
              Your outreach is dialing leads right now. Keep an eye on qualified-lead count and call transcripts in your workspace.
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/outreach")}
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 text-[12.5px] font-medium text-white bg-[#15803D] hover:bg-[#166534] rounded-button transition-colors"
          >
            Open workspace
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        </motion.div>
      )}

      {/* "Skip for now" escape — only shows while the user is mid-flow.
          Routes to the workspace and clears the in-progress flag so
          we don't keep nudging on every load. */}
      {!allDone && (
        <motion.div variants={fadeUp} className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              try { sessionStorage.removeItem("onboarding_in_progress"); } catch {}
              router.push("/outreach");
            }}
            className="text-[12px] text-text-tertiary hover:text-text-secondary transition-colors"
          >
            I&apos;ll explore on my own — take me to the workspace
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Step card ──────────────────────────────────────────────────────────
// One row in the two-step plan. Has three rest states:
//   • Active   — user can click the CTA
//   • Locked   — user has to finish the previous step first
//   • Done     — green check, muted style, link to view what was made
//
// The card explains the concept in three short bullets so the user
// understands what they're about to do before they click in.

function StepCard({
  number,
  done,
  icon: Icon,
  title,
  headline,
  bullets,
  cta,
  onCta,
  doneLabel,
  doneCtaLabel,
  onDoneCta,
  locked,
  lockedReason,
}: {
  number: number;
  done: boolean;
  icon: React.ElementType;
  title: string;
  headline: string;
  bullets: Array<{ icon: React.ElementType; text: string }>;
  cta: string;
  onCta: () => void;
  doneLabel: string;
  doneCtaLabel: string;
  onDoneCta: () => void;
  locked: boolean;
  lockedReason?: string;
}) {
  // Card frame switches between three subtle states. Done = soft green
  // tint to celebrate completion without being loud. Locked = neutral
  // surface with reduced opacity on the body so the user reads it as
  // "available later". Active = clean white card.
  const frameCls = done
    ? "bg-[#F7FDF9] border-[#E2F5E9]"
    : locked
      ? "bg-surface-page border-border-subtle"
      : "bg-white border-border";

  const numberCircleCls = done
    ? "bg-[#15803D] text-white"
    : locked
      ? "bg-surface-secondary text-text-tertiary"
      : "bg-accent text-white";

  return (
    <div className={`relative ${frameCls} border rounded-card overflow-hidden`}>
      <div className="px-5 py-5 flex items-start gap-4">
        {/* Number + icon — the number anchors the step in the plan,
            the icon names the concept. Both quiet visuals. */}
        <div className="shrink-0 flex flex-col items-center gap-2 pt-0.5">
          <div className={`w-7 h-7 rounded-full text-[12px] font-semibold flex items-center justify-center ${numberCircleCls}`}>
            {done ? <Check size={14} strokeWidth={2.5} /> : number}
          </div>
          <div className={`w-10 h-10 rounded-[10px] border flex items-center justify-center ${
            done
              ? "bg-white border-[#BBF7D0] text-[#15803D]"
              : locked
                ? "bg-white border-border text-text-tertiary"
                : "bg-surface-page border-border text-text-secondary"
          }`}>
            <Icon size={18} strokeWidth={1.5} />
          </div>
        </div>

        {/* Body — title + headline + bullets */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className={`text-[15px] font-semibold leading-tight ${
              locked ? "text-text-secondary" : "text-text-primary"
            }`}>
              {title}
            </h2>
            {done && (
              <span className="inline-flex items-center text-[10.5px] font-semibold uppercase tracking-[0.5px] px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                {doneLabel}
              </span>
            )}
          </div>
          <p className={`text-[12.5px] mt-1 leading-relaxed ${
            locked ? "text-text-tertiary" : "text-text-secondary"
          }`}>
            {headline}
          </p>

          {/* Bullet list — explains what the user will do inside the
              flow. Quiet icons + short prose, no marketing tone. */}
          <ul className="mt-3 space-y-1.5">
            {bullets.map((b, i) => {
              const BIcon = b.icon;
              return (
                <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                  <BIcon
                    size={13}
                    strokeWidth={1.5}
                    className={`mt-[3px] shrink-0 ${
                      locked ? "text-text-tertiary" : "text-text-tertiary"
                    }`}
                  />
                  <span className={locked ? "text-text-tertiary" : "text-text-secondary"}>
                    {b.text}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Locked banner — explains *why* the step can't be started
              yet so the user doesn't think the CTA is broken. */}
          {locked && lockedReason && (
            <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-input bg-white border border-border-subtle text-[11.5px] text-text-tertiary">
              {lockedReason}
            </div>
          )}

          {/* CTA row — primary action that drops the user into the
              flow. When done, the CTA flips to a quiet "view" link
              that takes them to the listing of whatever they made. */}
          <div className="mt-4">
            {done ? (
              <button
                type="button"
                onClick={onDoneCta}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[12.5px] font-medium text-text-secondary border border-border bg-white rounded-button hover:bg-surface-page transition-colors"
              >
                {doneCtaLabel}
                <ArrowRight size={13} strokeWidth={1.75} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onCta}
                disabled={locked}
                className="inline-flex items-center gap-2 h-10 px-5 text-[13px] font-medium text-white bg-accent rounded-button hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cta}
                <ArrowRight size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
