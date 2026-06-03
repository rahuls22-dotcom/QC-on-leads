"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft, ArrowRight, FolderKanban, Briefcase, Sparkles,
  Building2,
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";

// Personalisation wizard — runs after first sign-in. Style references:
// 11Labs / Linear / Vercel light-mode onboarding. Two design moves
// pull the screen out of "generic form" territory:
//
//   1. A single hero icon per step sets visual rhythm — the screen
//      isn't "fields + buttons", it's a sequence of small posters,
//      each with one question.
//   2. Big bold headlines (28 px / 600 / -0.01em tracking) with quiet
//      supporting copy. The eye lands on the question, not the chrome.
//
// Layout is full-bleed on a soft surface so the focus stays on the
// card, with a thin progress bar pinned to the top instead of a
// stepper. The user never feels they're inside the app yet — they
// enter the workspace only after this flow finishes and `/welcome`
// hands off.

// Order mirrors the Notion / 11Labs / Linear convention: workspace
// shape → who you are → what you'll do → the very first thing to
// work on. Identity (name, email, password) was captured on /signup,
// so this wizard skips the "personal details" step entirely.
const STEPS = [
  { id: 1 as const, label: "Company",       icon: Building2,     kicker: "Step 1 of 4" },
  { id: 2 as const, label: "Role",          icon: Briefcase,     kicker: "Step 2 of 4" },
  { id: 3 as const, label: "Use case",      icon: Sparkles,      kicker: "Step 3 of 4" },
  { id: 4 as const, label: "First project", icon: FolderKanban,  kicker: "Step 4 of 4" },
];
type Step = 1 | 2 | 3 | 4;

// Per-step pastel palette. Each step picks up a distinct soft hue so
// the user's journey reads as a sequence of *different* moments, not
// four screens of the same chrome. Gold leads — it's the brand
// primary alongside black + grey — and the other three are calm
// pastels that visibly cycle as the user advances.
type StepColor = {
  bg: string;        // tinted surface for hero circle + selected chips
  icon: string;      // hero icon + accent text
  border: string;    // selected-chip border
  ringRgba: string;  // selected-chip focus ring
  progress: string;  // progress bar fill for this step
};
const STEP_COLORS: Record<Step, StepColor> = {
  1: { bg: "#FEF3C7", icon: "#92400E", border: "#FDE68A", ringRgba: "rgba(245, 158, 11, 0.15)",  progress: "#F59E0B" }, // gold — brand primary
  2: { bg: "#ECFDF5", icon: "#047857", border: "#A7F3D0", ringRgba: "rgba(16, 185, 129, 0.15)",  progress: "#10B981" }, // mint
  3: { bg: "#FDF2F8", icon: "#BE185D", border: "#FBCFE8", ringRgba: "rgba(236, 72, 153, 0.15)",  progress: "#EC4899" }, // rose
  4: { bg: "#F0F9FF", icon: "#0369A1", border: "#BAE6FD", ringRgba: "rgba(14, 165, 233, 0.15)",  progress: "#0EA5E9" }, // sky
};

const INDUSTRIES = [
  "Real estate",
  "SaaS / Tech",
  "Financial services",
  "Healthcare",
  "Education",
  "Retail / e-commerce",
  "Hospitality",
  "Other",
];
const TEAM_SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];

const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit:   { opacity: 0, y: -4, transition: { duration: 0.14 } },
};

// Use cases each get a small coloured emoji-style icon dot, so step 3
// reads visually rather than as five identical text rows. Pastel +
// distinct so the user can scan the list at a glance.
const USE_CASES = [
  { id: "lead-qual", emoji: "🎯", tint: "#FEF3C7", label: "Qualify inbound leads",        sub: "Dial form-fills, qualify intent before sales reaches out" },
  { id: "follow-up", emoji: "🔁", tint: "#ECFDF5", label: "Follow up after a touchpoint", sub: "Re-call after a brochure download or site visit" },
  { id: "re-engage", emoji: "💤", tint: "#FAF5FF", label: "Re-engage old leads",          sub: "Wake up leads that went cold a quarter ago" },
  { id: "survey",    emoji: "📋", tint: "#F0F9FF", label: "Run a survey",                 sub: "Collect structured feedback at scale" },
  { id: "other",     emoji: "✨", tint: "#FDF2F8", label: "Something else",               sub: "We'll get the basics ready either way" },
];

const ROLE_OPTIONS = [
  "Founder / CEO",
  "Marketing lead",
  "Sales lead",
  "Operations",
  "Performance marketer",
  "Agency owner",
];

// Bigger input chrome than the in-app forms — `h-12` reads as the
// "primary surface" the user interacts with on each step.
const inputCls = "w-full h-12 px-4 text-[14px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-tertiary";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Identity comes from /signup — picked up on mount so we can greet
  // the user by first name on the hero copy. If the user landed here
  // directly (e.g. via a deep link without going through /signup) we
  // fall back to defaults and let them continue.
  const [credentials, setCredentials] = useState<{ fullName: string; email: string }>(
    { fullName: "", email: "" }
  );
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("user_credentials");
      if (raw) {
        const parsed = JSON.parse(raw) as { fullName?: string; email?: string };
        setCredentials({
          fullName: parsed.fullName?.trim() || "",
          email:    parsed.email?.trim()    || "",
        });
      }
    } catch { /* ignore */ }
  }, []);

  // Step 1 — Company (workspace identity)
  const [company, setCompany]   = useState("");
  const [industry, setIndustry] = useState("");

  // Step 2 — Role at the company
  const [role, setRole]         = useState("");
  const [teamSize, setTeamSize] = useState("");

  // Step 3 — Use case
  const [useCase, setUseCase]  = useState<string>("");
  const [useCaseNote, setNote] = useState("");

  // Step 4 — First project (gives the workspace a starting shape)
  const [projectName, setProjectName]     = useState("");
  const [projectMarket, setProjectMarket] = useState("");

  const canAdvance = useMemo(() => {
    if (step === 1) return company.trim() !== "" && industry !== "";
    if (step === 2) return role !== "" && teamSize !== "";
    if (step === 3) return useCase !== "";
    if (step === 4) return projectName.trim() !== "";
    return false;
  }, [step, company, industry, role, teamSize, useCase, projectName]);

  const handleNext = () => {
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    const profile = {
      // Identity (carried over from /signup)
      fullName: credentials.fullName,
      email:    credentials.email,
      // Workspace
      company: company.trim(),
      industry,
      // Role
      role,
      teamSize,
      // Use case
      useCase,
      useCaseNote: useCaseNote.trim(),
      // First project
      projectName: projectName.trim(),
      projectMarket: projectMarket.trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("onboarding_profile", JSON.stringify(profile));
      sessionStorage.setItem("onboarding_in_progress", "true");
    } catch { /* sandboxed storage */ }
    router.push("/welcome");
  };

  const back = () => { if (step > 1) setStep((s) => (s - 1) as Step); };

  const progressPct = (step / STEPS.length) * 100;
  const currentStep = STEPS[step - 1];
  const HeroIcon    = currentStep.icon;
  const colour      = STEP_COLORS[step];

  return (
    <div className="min-h-screen bg-surface-page relative overflow-hidden">
      {/* Multi-coloured pastel mesh — soft radial blobs in the four
          step colours sit in the corners of the viewport, giving the
          page a warm, playful surface without competing with the
          card. Each blob stays mostly out of frame so the centre
          stays clean for the form. */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245, 194, 107, 0.30) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 -right-40 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251, 207, 232, 0.35) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167, 243, 208, 0.28) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-44 -right-32 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(186, 230, 253, 0.32) 0%, transparent 65%)" }}
        aria-hidden
      />

      {/* Thin progress bar pinned to the top — fills with *this* step's
          colour so the user sees the page's accent move as they
          advance. The colour transition is animated so the bar feels
          like a single moving paint stroke rather than four states. */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/40 z-50">
        <motion.div
          className="h-full transition-colors duration-500"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ backgroundColor: colour.progress }}
        />
      </div>

      {/* Brand row — same as /login. Skip link in the corner is a
          calm escape hatch; doesn't apologise. */}
      <header className="relative px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SpotMark size={20} />
          <span className="text-[14px] font-semibold text-text-primary">Revspot</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/welcome")}
          className="text-[12.5px] text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Skip for now
        </button>
      </header>

      <main className="relative flex items-start justify-center px-4 pt-8 pb-16">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial="hidden"
              animate="show"
              exit="exit"
              variants={fade}
            >
              {/* Hero — large icon in a softly tinted circle that
                  picks up the step's colour. The kicker pill also
                  tints to match so the colour reads as the step's
                  identity, not decoration. */}
              <div className="flex flex-col items-center text-center mb-7">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
                  style={{ backgroundColor: colour.bg, color: colour.icon }}
                >
                  <HeroIcon size={26} strokeWidth={1.5} />
                </div>
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-[0.8px] mb-3 px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: colour.bg, color: colour.icon }}
                >
                  {currentStep.kicker}
                </span>
                <h1 className="text-[28px] font-semibold text-text-primary leading-tight tracking-[-0.01em] max-w-[440px]">
                  {step === 1 && (credentials.fullName ? `Hi ${credentials.fullName.split(" ")[0]} — tell us about your team.` : "Tell us about your team.")}
                  {step === 2 && "What's your role there?"}
                  {step === 3 && "What will Revspot help you do?"}
                  {step === 4 && "Last step — name your first project."}
                </h1>
                <p className="text-[14px] text-text-secondary mt-2 max-w-[440px] leading-relaxed">
                  {step === 1 && "Your company name becomes your workspace. Pick the industry that best describes what you sell — it tunes the sample scripts and personas we set up."}
                  {step === 2 && "Helps us decide what to show first. A sales lead and a performance marketer want different defaults."}
                  {step === 3 && "Pick the main use case. It drives which sample agent we pre-build and the script that agent runs by default."}
                  {step === 4 && "A project is the campaign or property these outreaches will dial for. You can rename or add more later — this just gives your workspace a starting shape."}
                </p>
              </div>

              {/* Body — single white card. Padding and field heights
                  are bigger than the in-app forms because this is a
                  focused one-question-per-screen moment. */}
              <div className="bg-white border border-border rounded-card shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-7 py-7">
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                        Company name
                      </label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Acme Realty"
                        className={inputCls}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-text-primary mb-2">
                        Industry
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {INDUSTRIES.map((i) => {
                          const active = industry === i;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setIndustry(i)}
                              className={`h-10 px-3 text-[12.5px] font-medium rounded-input border text-left transition-all ${
                                active
                                  ? ""
                                  : "border-border bg-white text-text-secondary hover:border-text-tertiary hover:text-text-primary"
                              }`}
                              style={active ? {
                                borderColor: colour.icon,
                                backgroundColor: colour.bg,
                                color: colour.icon,
                                boxShadow: `0 0 0 3px ${colour.ringRgba}`,
                              } : undefined}
                            >
                              {i}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-text-primary mb-2">
                        Pick the closest fit
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {ROLE_OPTIONS.map((r) => {
                          const active = role === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRole(r)}
                              className={`h-11 px-3.5 text-[13px] font-medium rounded-input border text-left transition-all ${
                                active
                                  ? ""
                                  : "border-border bg-white text-text-secondary hover:border-text-tertiary hover:text-text-primary"
                              }`}
                              style={active ? {
                                borderColor: colour.icon,
                                backgroundColor: colour.bg,
                                color: colour.icon,
                                boxShadow: `0 0 0 3px ${colour.ringRgba}`,
                              } : undefined}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-text-primary mb-2">
                        Team size
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {TEAM_SIZES.map((t) => {
                          const active = teamSize === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setTeamSize(t)}
                              className={`h-10 px-4 text-[12.5px] font-medium rounded-input border transition-all ${
                                active
                                  ? ""
                                  : "border-border bg-white text-text-secondary hover:border-text-tertiary hover:text-text-primary"
                              }`}
                              style={active ? {
                                borderColor: colour.icon,
                                backgroundColor: colour.bg,
                                color: colour.icon,
                                boxShadow: `0 0 0 3px ${colour.ringRgba}`,
                              } : undefined}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-2">
                    {USE_CASES.map((uc) => {
                      const active = useCase === uc.id;
                      return (
                        <button
                          key={uc.id}
                          type="button"
                          onClick={() => setUseCase(uc.id)}
                          className={`w-full text-left px-4 py-3.5 rounded-card border transition-all ${
                            active ? "" : "border-border bg-white hover:border-text-tertiary"
                          }`}
                          style={active ? {
                            borderColor: colour.icon,
                            backgroundColor: colour.bg,
                            boxShadow: `0 0 0 3px ${colour.ringRgba}`,
                          } : undefined}
                        >
                          <div className="flex items-start gap-3">
                            {/* Per-option pastel tile — each use case
                                gets its own soft hue so the list reads
                                visually rather than as five identical
                                rows. */}
                            <div
                              className="shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px] leading-none"
                              style={{ backgroundColor: uc.tint }}
                              aria-hidden
                            >
                              {uc.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13.5px] font-medium text-text-primary">{uc.label}</div>
                              <div className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{uc.sub}</div>
                            </div>
                            <div
                              className="mt-1 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                              style={{ borderColor: active ? colour.icon : "var(--border, #E4E4E7)" }}
                            >
                              {active && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colour.icon }} />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {useCase === "other" && (
                      <div className="pt-2">
                        <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                          Tell us more
                        </label>
                        <input
                          type="text"
                          value={useCaseNote}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="e.g. event RSVP confirmations"
                          className={inputCls}
                        />
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                        Project name
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g. Aurora Towers — Q3 launch"
                        className={inputCls}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                        Market or location
                        <span className="ml-1.5 text-text-tertiary font-normal">· optional</span>
                      </label>
                      <input
                        type="text"
                        value={projectMarket}
                        onChange={(e) => setProjectMarket(e.target.value)}
                        placeholder="e.g. Bangalore South"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Nav row — Back as a quiet text link, Continue as the
                  dominant button. */}
              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 1}
                  className="inline-flex items-center gap-1.5 h-11 px-3 text-[13px] font-medium text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft size={14} strokeWidth={1.5} />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance}
                  className="flex-1 max-w-[280px] h-11 inline-flex items-center justify-center gap-2 bg-accent text-white text-[13.5px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {step === 4 ? "Set up my workspace" : "Continue"}
                  <ArrowRight size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Step rail — small pill set at the bottom. Each pill
                  takes on its own step's colour, so the rail reads as
                  a four-stop colour journey rather than a generic
                  progress bar. Complete pills sit at full saturation,
                  the current pill is wider + at full saturation, and
                  upcoming pills hold the same colour at low opacity
                  (a "ghost" of where they'll land). */}
              <div className="mt-8 flex items-center justify-center gap-1.5">
                {STEPS.map((s) => {
                  const isComplete = step > s.id;
                  const isCurrent  = step === s.id;
                  const c = STEP_COLORS[s.id];
                  return (
                    <div
                      key={s.id}
                      className={`h-1.5 rounded-full transition-all ${isCurrent ? "w-10" : "w-6"}`}
                      style={{
                        backgroundColor: isComplete || isCurrent ? c.progress : c.bg,
                      }}
                    />
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
