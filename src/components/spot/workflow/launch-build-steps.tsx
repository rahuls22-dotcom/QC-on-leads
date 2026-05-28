"use client";

// Consolidated launch flow — three new step canvases that replace the
// old multi-step approval cycle (personas → media-plan → angles →
// resize-qa → forms → campaigns → voice-agent).
//
//   1. launch-plan      — ONE comprehensive plan showing everything
//                         Spot will build. User approves once.
//   2. launch-building  — Async work. The user is auto-parked to the
//                         /spot homepage; this canvas only shows if
//                         they explicitly resume to see progress.
//   3. launch-review    — When Spot's done, the canvas surfaces all
//                         generated assets for final approval.
//
// Mental model: humans see + approve at the bookends. Spot does the
// rest. The launch-building step is a "Spot is working" indicator.

import {
  CheckCircle2,
  Image as ImageIcon,
  Layout,
  Megaphone,
  Mic,
  Users,
  ChartPie,
  ShieldCheck,
  Sparkles,
  Phone,
  Wifi,
  Film,
  ArrowUpRight,
  Clock,
  Target,
  FileText,
  Smartphone,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { SpotLoader } from "@/components/spot/spot-loader";
import type { LaunchWorkflow } from "@/lib/spot/workflow";
import { LAUNCH_PERSONAS, SAMPLE_FORMS } from "@/lib/spot/workflow";

const canvasStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const canvasReveal: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/* ════════════════════════════════════════════════════════════════
 * MOCK DATA — what Spot will build / has built
 * ═══════════════════════════════════════════════════════════════ */

/** Channel + budget split for the plan view. */
const PLAN_CHANNELS = [
  { id: "meta", name: "Meta Ads", share: 55, color: "#1877F2" },
  { id: "google-search", name: "Google Search", share: 18, color: "#4285F4" },
  { id: "google-discover", name: "Google Discover", share: 12, color: "#34A853" },
  { id: "outreach", name: "Outreach · Voice + WA", share: 15, color: "#15803D" },
];

/** Visual creative angles Spot will build, one per persona × theme. */
const PROPOSED_CREATIVES = [
  { id: "c1", hook: "Mentor-led classes · capped at 60 students", persona: "Engineer Parent", format: "Reel", hue: 215 },
  { id: "c2", hook: "Your kid's own progress · updated every Friday", persona: "Engineer Parent", format: "Static", hue: 28 },
  { id: "c3", hook: "Doubt-clearing in 15 minutes · live", persona: "Self-Studier", format: "Reel", hue: 145 },
  { id: "c4", hook: "24-month replay · no time pressure", persona: "Self-Studier", format: "Carousel", hue: 290 },
  { id: "c5", hook: "Mentor 1:1 every fortnight · finally heard", persona: "Coaching Hopper", format: "Static", hue: 12 },
  { id: "c6", hook: "Switching mid-year? We cover the gap", persona: "Coaching Hopper", format: "Reel", hue: 180 },
];

/** Landing pages Spot will draft. */
const PROPOSED_PAGES = [
  { id: "lp1", title: "Demo class booking · Engineer Parent", persona: "Engineer Parent", sections: 6 },
  { id: "lp2", title: "Free-mock landing · Self-Studier", persona: "Self-Studier", sections: 5 },
  { id: "lp3", title: "1:1 call landing · Coaching Hopper", persona: "Coaching Hopper", sections: 4 },
];

/** Campaign structure that will get pushed to Meta + Google. */
const PROPOSED_CAMPAIGNS = [
  { id: "cmp1", name: "Meta · TOFU · 3-bucket model", platform: "Meta", adsets: 3, ads: 9 },
  { id: "cmp2", name: "Google Search · Brand + Category", platform: "Google", adsets: 2, ads: 8 },
  { id: "cmp3", name: "Google Discover · Cold + LAL", platform: "Google", adsets: 2, ads: 6 },
];

/* ════════════════════════════════════════════════════════════════
 * LaunchPlanStep
 *
 * Single consolidated plan. Header + 5 sections + estimate + approve.
 * ═══════════════════════════════════════════════════════════════ */

export function LaunchPlanStep({ workflow }: { workflow: LaunchWorkflow }) {
  // Visible personas — pull from LAUNCH_PERSONAS, default to first 3-4.
  const personas = LAUNCH_PERSONAS.slice(0, 4);

  return (
    <motion.div
      className="px-5 py-6 max-w-[820px] mx-auto"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      {/* Hero */}
      <motion.div variants={canvasReveal} className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#FAF8F2] border border-[#E8E3D5]">
            <Sparkles size={11} strokeWidth={1.7} className="text-text-secondary" />
            <span className="text-[10.5px] uppercase tracking-wider text-text-secondary font-semibold">
              Launch plan · one approval
            </span>
          </span>
          <span className="text-[11px] text-text-tertiary">{workflow.productName}</span>
        </div>

        <div className="bg-gradient-to-br from-[#FAF8F2] to-[#F5F2E8] border border-[#E8E3D5] rounded-card p-5 relative overflow-hidden">
          <div className="absolute -top-3 -right-3 opacity-[0.06]">
            <SpotMark size={80} />
          </div>
          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-[#E8E3D5] flex items-center justify-center flex-shrink-0 shadow-sm">
              <SpotMark size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-1.5 font-semibold">
                Here's what I'll build
              </div>
              <p className="text-[14.5px] text-text-primary leading-relaxed font-medium mb-3">
                A complete launch · personas locked, channels split, 12 visual creatives + 8
                search ads + 3 landing pages + 2 lead forms + the full campaign tree + a Voice
                AI agent attached to outbound.
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-[#E8E3D5] text-[12px] text-text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={11} strokeWidth={1.7} />
                  <span>
                    <span className="text-text-primary font-medium">~2 hours</span> to build
                  </span>
                </span>
                <span className="text-text-tertiary">·</span>
                <span>You can keep using Revspot — I'll ping you when ready to review.</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Section: Personas */}
      <motion.div variants={canvasReveal} className="mb-4">
        <PlanSectionHeader
          icon={Users}
          title="Personas"
          count={`${personas.length} cohorts`}
          subtitle="Who I'll target · 3 from your library, 1 net-new I'd add."
        />
        <div className="grid grid-cols-2 gap-2.5">
          {personas.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-border rounded-card p-3 flex items-start gap-3"
            >
              <div
                className="w-9 h-9 rounded-card flex-shrink-0 flex items-center justify-center text-[12px] font-semibold text-white tabular"
                style={{
                  background: `linear-gradient(135deg, hsl(${p.hue} 60% 55%), hsl(${p.hue} 50% 42%))`,
                }}
              >
                {p.avatarLetters}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12.5px] font-semibold text-text-primary truncate">
                    {p.name}
                  </span>
                  {p.origin === "new" && (
                    <span className="pill pill-info" style={{ fontSize: 9.5 }}>
                      New
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-secondary leading-snug">
                  {p.rationale}
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Section: Channel + Budget */}
      <motion.div variants={canvasReveal} className="mb-4">
        <PlanSectionHeader
          icon={ChartPie}
          title="Channel + budget split"
          count="₹4L/week"
          subtitle="Where the money goes · proportional to expected payoff."
        />
        <div className="bg-white border border-border rounded-card p-4">
          <div className="flex h-2 rounded-full overflow-hidden mb-3">
            {PLAN_CHANNELS.map((c) => (
              <div
                key={c.id}
                style={{ width: `${c.share}%`, background: c.color }}
                title={`${c.name} · ${c.share}%`}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PLAN_CHANNELS.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: c.color }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] text-text-secondary truncate">{c.name}</div>
                  <div className="text-[12.5px] font-semibold text-text-primary tabular">
                    {c.share}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Section: Visual creatives */}
      <motion.div variants={canvasReveal} className="mb-4">
        <PlanSectionHeader
          icon={ImageIcon}
          title="Visual creatives"
          count="12 statics + 6 reels"
          subtitle="Angles per persona · grounded in your product memory."
        />
        <div className="grid grid-cols-3 gap-2.5">
          {PROPOSED_CREATIVES.map((c) => {
            const Icon = c.format === "Reel" ? Film : c.format === "Carousel" ? Layout : ImageIcon;
            return (
              <div
                key={c.id}
                className="bg-white border border-border rounded-card overflow-hidden"
              >
                <div
                  className="relative aspect-[4/3] w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${c.hue} 60% 92%), hsl(${c.hue} 50% 78%))`,
                  }}
                >
                  <div className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/85 backdrop-blur-sm">
                    <Icon size={10} strokeWidth={1.7} />
                  </div>
                  <div className="absolute top-2 right-2 text-[9.5px] font-medium text-text-secondary bg-white/85 px-1.5 rounded-sm">
                    {c.format}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[11.5px] font-medium text-text-primary leading-snug line-clamp-2 min-h-[2.6em]">
                    {c.hook}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary mt-1">{c.persona}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Two-col: Landing pages + Lead forms */}
      <motion.div variants={canvasReveal} className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <PlanSectionHeader
            icon={Layout}
            title="Landing pages"
            count={`${PROPOSED_PAGES.length} pages`}
            subtitle="One per persona · mobile-first · sticky CTA."
            compact
          />
          <div className="space-y-1.5">
            {PROPOSED_PAGES.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-border rounded-card p-2.5 flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-button bg-surface-page flex items-center justify-center flex-shrink-0">
                  <Smartphone size={12} strokeWidth={1.7} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-text-primary truncate">
                    {p.title}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary">
                    {p.sections} sections · {p.persona}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <PlanSectionHeader
            icon={FileText}
            title="Lead forms"
            count={`${SAMPLE_FORMS.length} forms`}
            subtitle="Meta lead forms + click-to-WhatsApp scripts."
            compact
          />
          <div className="space-y-1.5">
            {SAMPLE_FORMS.slice(0, 4).map((f) => (
              <div
                key={f.id}
                className="bg-white border border-border rounded-card p-2.5 flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-button bg-surface-page flex items-center justify-center flex-shrink-0">
                  <FileText size={12} strokeWidth={1.7} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-text-primary truncate">
                    {f.name}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary">{f.personaName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Section: Campaign structure */}
      <motion.div variants={canvasReveal} className="mb-4">
        <PlanSectionHeader
          icon={Megaphone}
          title="Campaign structure"
          count={`${PROPOSED_CAMPAIGNS.length} campaigns`}
          subtitle="What I'll push to Meta + Google."
        />
        <div className="bg-white border border-border rounded-card overflow-hidden">
          {PROPOSED_CAMPAIGNS.map((cmp, i) => (
            <div
              key={cmp.id}
              className={`px-4 py-2.5 flex items-center gap-3 ${
                i < PROPOSED_CAMPAIGNS.length - 1 ? "border-b border-border-subtle" : ""
              }`}
            >
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-[3px] text-white font-bold flex-shrink-0"
                style={{
                  background: cmp.platform === "Meta" ? "#1877F2" : "#fff",
                  border: cmp.platform === "Google" ? "1px solid #E5E5E5" : "none",
                  fontSize: 10,
                  color: cmp.platform === "Google" ? "#4285F4" : "#fff",
                }}
              >
                {cmp.platform === "Meta" ? "f" : "G"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary">{cmp.name}</div>
                <div className="text-[10.5px] text-text-tertiary">
                  {cmp.adsets} ad sets · {cmp.ads} ads
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Voice agent */}
      <motion.div variants={canvasReveal} className="mb-4">
        <PlanSectionHeader
          icon={Mic}
          title="Voice AI for outreach"
          count="Sherpa"
          subtitle="Voice + WhatsApp follow-up · proven on parent cohorts."
        />
        <div className="bg-white border border-border rounded-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-card bg-surface-page flex items-center justify-center flex-shrink-0">
            <Mic size={15} strokeWidth={1.7} className="text-text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text-primary">Sherpa</div>
            <div className="text-[11.5px] text-text-secondary">
              Voice-first · auto-WhatsApp follow-up if call drops · proven on Engineer Parent
              cohorts at 22% qual rate.
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Phone size={11} strokeWidth={1.7} className="text-text-tertiary" />
            <Wifi size={11} strokeWidth={1.7} className="text-text-tertiary" />
          </div>
        </div>
      </motion.div>

      {/* Guardrails strip */}
      <motion.div
        variants={canvasReveal}
        className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-3 flex items-start gap-2.5"
      >
        <ShieldCheck size={14} strokeWidth={1.7} className="text-[#15803D] flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">Guardrails I'll enforce:</span> no
          rank promises · no competitor name-checks · every asset passes the QA Agent before
          deploy · all creatives respect your product memory's avoid list.
        </div>
      </motion.div>
    </motion.div>
  );
}

function PlanSectionHeader({
  icon: Icon,
  title,
  count,
  subtitle,
  compact,
}: {
  icon: typeof Users;
  title: string;
  count: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? "mb-2" : "mb-3"}`}>
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-page">
        <Icon size={13} strokeWidth={1.7} className="text-text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-text-primary">{title}</span>
          <span className="text-[11px] text-text-tertiary tabular">{count}</span>
        </div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * LaunchBuildingStep
 *
 * Async "Spot is working" state. The user normally won't see this
 * canvas (we auto-park to homepage), but if they navigate back here
 * via the resume banner, this is what they see.
 * ═══════════════════════════════════════════════════════════════ */

const BUILD_TASKS = [
  { agent: "Creative Agent", detail: "Drafting 12 statics + 6 reels", icon: ImageIcon },
  { agent: "Resize Agent", detail: "Generating 48 size variants (1:1 · 4:5 · 9:16 · 16:9)", icon: Layers },
  { agent: "Landing Builder", detail: "Building 3 mobile-first landing pages", icon: Layout },
  { agent: "Forms Agent", detail: "2 Meta lead forms + click-to-WhatsApp scripts", icon: FileText },
  { agent: "Campaign Compiler", detail: "Pushing the campaign → ad-set → ad tree to staging", icon: Megaphone },
  { agent: "Voice Agent", detail: "Attaching Sherpa · provisioning the number + follow-ups", icon: Mic },
];

export function LaunchBuildingStep({ workflow }: { workflow: LaunchWorkflow }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-16 text-center max-w-[600px] mx-auto">
      <SpotLoader mode="orbit" size={72} className="mb-5" />

      <div className="text-section-header text-text-primary mb-1.5">
        Building {workflow.productName}
      </div>
      <div className="text-meta text-text-secondary mb-5 max-w-[440px]">
        ETA ~2 hours. Six agents running in parallel — you can navigate away.
      </div>

      <div className="bg-white border border-border rounded-card p-4 w-full text-left">
        <ul className="space-y-3">
          {BUILD_TASKS.map((t, i) => {
            const Icon = t.icon;
            return (
              <li key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-card bg-surface-page flex items-center justify-center flex-shrink-0">
                  <Icon size={13} strokeWidth={1.6} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold text-text-primary">
                      {t.agent}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] text-text-tertiary">
                      <span className="relative inline-flex items-center justify-center w-2.5 h-2.5">
                        <span
                          className="absolute inset-0 rounded-full bg-[#15803D] opacity-30 animate-ping"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                        <span className="relative w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                      </span>
                      Running
                    </span>
                  </div>
                  <div className="text-[11.5px] text-text-secondary mt-0.5">{t.detail}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
 * LaunchReviewStep
 *
 * Everything Spot built. User reviews + approves once → deploys.
 * ═══════════════════════════════════════════════════════════════ */

export function LaunchReviewStep({ workflow }: { workflow: LaunchWorkflow }) {
  const personas = LAUNCH_PERSONAS.slice(0, 4);

  return (
    <motion.div
      className="px-5 py-6 max-w-[820px] mx-auto"
      initial="hidden"
      animate="show"
      variants={canvasStagger}
    >
      {/* Hero */}
      <motion.div variants={canvasReveal} className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-[#F0FDF4] border border-[#BBF7D0]">
            <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#15803D]" />
            <span className="text-[10.5px] uppercase tracking-wider text-[#15803D] font-semibold">
              Build complete · ready to deploy
            </span>
          </span>
          <span className="text-[11px] text-text-tertiary">{workflow.productName}</span>
        </div>

        <div className="bg-white border border-border rounded-card p-4">
          <div className="grid grid-cols-5 gap-3">
            <ReviewStat label="Creatives" value="18" sub="12 statics + 6 reels" />
            <ReviewStat label="Resized variants" value="72" sub="4 sizes per angle" />
            <ReviewStat label="Landing pages" value="3" sub="mobile-first" />
            <ReviewStat label="Lead forms" value="2" sub="+ WhatsApp scripts" />
            <ReviewStat label="Campaigns" value="3" sub="Meta + Google" />
          </div>
        </div>
      </motion.div>

      {/* Generated creatives — the visual centrepiece */}
      <motion.div variants={canvasReveal} className="mb-4">
        <ReviewSectionHeader
          icon={ImageIcon}
          title="Generated creatives"
          count={`${PROPOSED_CREATIVES.length} angles · 18 assets total`}
          subtitle="Each angle resized into 4 formats. QA Agent reviewed all 72."
        />
        <div className="grid grid-cols-3 gap-2.5">
          {PROPOSED_CREATIVES.map((c) => {
            const Icon = c.format === "Reel" ? Film : c.format === "Carousel" ? Layout : ImageIcon;
            return (
              <div
                key={c.id}
                className="bg-white border border-border rounded-card overflow-hidden hover:border-border-hover transition-colors"
              >
                <div
                  className="relative aspect-[4/3] w-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${c.hue} 60% 90%), hsl(${c.hue} 50% 70%))`,
                  }}
                >
                  <div className="absolute top-2 left-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/85 backdrop-blur-sm">
                    <Icon size={10} strokeWidth={1.7} />
                  </div>
                  <div className="absolute top-2 right-2 text-[9.5px] font-medium text-text-secondary bg-white/85 px-1.5 rounded-sm">
                    {c.format}
                  </div>
                  <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[9.5px] font-medium bg-white/90 px-1.5 py-0.5 rounded-sm">
                    <CheckCircle2 size={9} strokeWidth={2} className="text-[#15803D]" />
                    <span>QA passed</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="text-[11.5px] font-medium text-text-primary leading-snug line-clamp-2 min-h-[2.6em]">
                    {c.hook}
                  </div>
                  <div className="text-[10.5px] text-text-tertiary mt-1">{c.persona}</div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Landing pages — phone-style previews */}
      <motion.div variants={canvasReveal} className="mb-4">
        <ReviewSectionHeader
          icon={Smartphone}
          title="Landing pages"
          count={`${PROPOSED_PAGES.length} pages · mobile + desktop`}
          subtitle="Mobile-first, sticky CTA above the fold, brand-aligned typography."
        />
        <div className="grid grid-cols-3 gap-2.5">
          {PROPOSED_PAGES.map((p, i) => (
            <div
              key={p.id}
              className="bg-white border border-border rounded-card p-3 flex items-start gap-3"
            >
              {/* Tiny phone preview */}
              <div className="w-14 h-24 rounded-[6px] bg-gradient-to-b from-[#FAF8F2] to-white border border-border-subtle flex-shrink-0 relative overflow-hidden">
                <div className="absolute top-1.5 left-1.5 right-1.5 h-1.5 rounded-full bg-text-tertiary/20" />
                <div className="absolute top-4 left-1.5 right-1.5 space-y-1">
                  <div className="h-1 rounded-full bg-text-tertiary/15 w-3/4" />
                  <div className="h-1 rounded-full bg-text-tertiary/15 w-full" />
                  <div className="h-1 rounded-full bg-text-tertiary/15 w-2/3" />
                </div>
                <div
                  className="absolute bottom-1.5 left-1.5 right-1.5 h-2 rounded-[2px]"
                  style={{
                    background:
                      i === 0 ? "#1877F2" : i === 1 ? "#15803D" : "#F5A623",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-text-primary leading-tight mb-0.5">
                  {p.title}
                </div>
                <div className="text-[10.5px] text-text-tertiary mb-2">
                  {p.sections} sections · {p.persona}
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 h-6 px-1.5 rounded-button text-[10.5px] text-text-tertiary hover:text-text-primary"
                >
                  <ArrowUpRight size={9} strokeWidth={1.8} />
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Forms + Campaigns + Voice — three compact rows */}
      <motion.div variants={canvasReveal} className="grid grid-cols-3 gap-2.5 mb-4">
        <ReviewBucket
          icon={FileText}
          title="Lead forms"
          count={`${SAMPLE_FORMS.length}`}
          subtitle="Meta + WhatsApp"
        />
        <ReviewBucket
          icon={Megaphone}
          title="Campaign tree"
          count="3"
          subtitle="Meta + Google · 23 ads total"
        />
        <ReviewBucket icon={Mic} title="Voice agent" count="Sherpa" subtitle="Voice + WA · provisioned" />
      </motion.div>

      {/* Final pre-deploy summary */}
      <motion.div
        variants={canvasReveal}
        className="bg-[#FAF8F2] border border-[#E8E3D5] rounded-card p-4 flex items-start gap-3"
      >
        <Target size={16} strokeWidth={1.7} className="text-text-secondary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary mb-1 font-semibold">
            Deploying will
          </div>
          <ul className="space-y-1 text-[12px] text-text-primary leading-relaxed">
            <li className="flex gap-1.5">
              <CheckCircle2 size={11} strokeWidth={2} className="text-[#15803D] flex-shrink-0 mt-0.5" />
              <span>Push 3 campaigns live on Meta + Google · ₹4L/week budget</span>
            </li>
            <li className="flex gap-1.5">
              <CheckCircle2 size={11} strokeWidth={2} className="text-[#15803D] flex-shrink-0 mt-0.5" />
              <span>Publish 3 landing pages at guyjus.com/{workflow.productName.toLowerCase().replace(/[^a-z]+/g, "-")}</span>
            </li>
            <li className="flex gap-1.5">
              <CheckCircle2 size={11} strokeWidth={2} className="text-[#15803D] flex-shrink-0 mt-0.5" />
              <span>Activate Sherpa (Voice + WhatsApp) on inbound leads</span>
            </li>
            <li className="flex gap-1.5">
              <CheckCircle2 size={11} strokeWidth={2} className="text-[#15803D] flex-shrink-0 mt-0.5" />
              <span>Start the watchers · I'll surface decisions in your dashboard</span>
            </li>
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReviewStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-[18px] font-semibold text-text-primary tabular leading-none">
        {value}
      </div>
      <div className="text-[10px] text-text-tertiary mt-1">{sub}</div>
    </div>
  );
}

function ReviewSectionHeader({
  icon: Icon,
  title,
  count,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  count: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F0FDF4] text-[#15803D]">
        <Icon size={13} strokeWidth={1.7} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-text-primary">{title}</span>
          <span className="text-[11px] text-text-tertiary">{count}</span>
        </div>
        <div className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</div>
      </div>
    </div>
  );
}

function ReviewBucket({
  icon: Icon,
  title,
  count,
  subtitle,
}: {
  icon: typeof Users;
  title: string;
  count: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} strokeWidth={1.7} className="text-text-secondary" />
        <div className="text-[11.5px] font-medium text-text-secondary">{title}</div>
        <span className="ml-auto pill pill-ok" style={{ fontSize: 9.5 }}>
          Ready
        </span>
      </div>
      <div className="text-[20px] font-semibold text-text-primary tabular leading-none mb-1">
        {count}
      </div>
      <div className="text-[10.5px] text-text-tertiary">{subtitle}</div>
    </div>
  );
}
