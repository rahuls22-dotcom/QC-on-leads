"use client";

// Campaign-dive canvas — opened by "Spot it" on any campaign / ad-set
// / ad row. Single step. Renders the entity in focus on the right,
// with quick-action buttons; the left chat is where the user asks
// Spot to dig deeper, scale, pause, or optimise.
//
// The data shown here is read from edTechCampaigns when the entity is
// a campaign; for ad-sets and ads we fall through to the parent
// campaign's metrics with the entity's own name in the header.

import {
  ArrowUpRight,
  Pause,
  Play,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Megaphone,
  Eye,
  Activity,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import type { CampaignDiveWorkflow } from "@/lib/spot/workflow";
import { edTechCampaigns } from "@/lib/campaigns-edtech";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
};
const reveal: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

function inr(n: number) {
  if (n === 0) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}
function num(n: number) {
  if (n === 0) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

/* ─── Channel mark (mirrors campaigns/page.tsx) ──────────────── */

function ChannelMark({ channel, size = 14 }: { channel: "Meta" | "Google"; size?: number }) {
  if (channel === "Meta") {
    return (
      <span
        title="Meta"
        className="inline-flex items-center justify-center rounded-[3px] bg-[#1877F2] text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.72), lineHeight: 1 }}
      >
        f
      </span>
    );
  }
  return (
    <span
      title="Google"
      className="inline-flex items-center justify-center rounded-[3px] bg-white border border-[#E5E5E5] font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.7), lineHeight: 1 }}
    >
      <span style={{ color: "#4285F4" }}>G</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
 * CampaignDiveStep
 * ═══════════════════════════════════════════════════════════════ */

export function CampaignDiveStep({ workflow }: { workflow: CampaignDiveWorkflow }) {
  const askSpot = useSpotStore((s) => s.askSpot);
  const startScaleFlow = useSpotStore((s) => s.startScaleFlow);
  const startOptimizeFlow = useSpotStore((s) => s.startOptimizeFlow);
  const startTestAnglesFlow = useSpotStore((s) => s.startTestAnglesFlow);

  // Pull metrics — fall back to the parent campaign for ad-sets/ads.
  const campaign =
    edTechCampaigns.find((c) => c.id === workflow.entityId) ??
    edTechCampaigns.find(
      (c) =>
        c.adsets.some((a) => a.id === workflow.entityId) ||
        c.adsets.some((a) => a.ads.some((ad) => ad.id === workflow.entityId)),
    ) ??
    edTechCampaigns[0];
  const metrics = campaign.metrics;
  const deltas = campaign.deltas;

  const tierLabel =
    workflow.entityTier === "campaign" ? "Campaign" : workflow.entityTier === "adset" ? "Ad set" : "Ad";

  const status = campaign.status;
  const isLive = status === "enabled";

  const productScope = { id: workflow.productId, name: workflow.productName };

  return (
    <motion.div
      className="px-5 py-6 max-w-[820px] mx-auto"
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      {/* Hero header */}
      <motion.div variants={reveal} className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ChannelMark channel={workflow.channel} size={14} />
          <span className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            {tierLabel} · {workflow.channel}
          </span>
          <span className="text-[10.5px] text-text-tertiary">·</span>
          <span className="text-[10.5px] text-text-secondary">{workflow.productName}</span>
          <span
            className={`pill ${isLive ? "pill-ok" : status === "paused" ? "pill-warn" : "pill"}`}
            style={{ fontSize: 10 }}
          >
            {isLive ? "Live" : status === "paused" ? "Paused" : "Draft"}
          </span>
        </div>
        <h2 className="text-[20px] font-semibold text-text-primary leading-tight">
          {workflow.entityName}
        </h2>
        <p className="text-[12.5px] text-text-secondary mt-1 leading-relaxed">
          {campaign.objective} · launched {Math.floor(Math.random() * 30) + 14} days ago. Spot
          is watching this 24/7 — anything below is current as of now.
        </p>
      </motion.div>

      {/* Metric grid */}
      <motion.div variants={reveal} className="mb-4">
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-border-subtle">
            <MetricCell
              label="Spend"
              value={inr(metrics.spend)}
              delta={deltas.spend.pct}
            />
            <MetricCell
              label="Leads"
              value={num(metrics.leads)}
              delta={deltas.leads.pct}
            />
            <MetricCell
              label="CPL"
              value={inr(metrics.cpl)}
              delta={deltas.cpl.pct}
              invert
            />
            <MetricCell
              label="Qual rate"
              value={`${metrics.qualificationRate.toFixed(1)}%`}
              delta={deltas.qualificationRate.pct}
            />
          </div>
          <div className="grid grid-cols-4 divide-x divide-border-subtle border-t border-border-subtle">
            <MetricCell
              label="CPM"
              value={inr(metrics.cpm)}
              delta={deltas.cpm.pct}
              invert
            />
            <MetricCell
              label="CTR"
              value={`${metrics.ctr.toFixed(2)}%`}
              delta={deltas.ctr.pct}
            />
            <MetricCell
              label="Verified"
              value={num(metrics.verified)}
              delta={deltas.verified.pct}
            />
            <MetricCell
              label="CPQL"
              value={inr(metrics.costPerQualified)}
              delta={deltas.costPerQualified.pct}
              invert
            />
          </div>
        </div>
      </motion.div>

      {/* Health flag */}
      <motion.div
        variants={reveal}
        className={`rounded-card border p-3 mb-4 flex items-start gap-2.5 ${
          campaign.health === "on-track"
            ? "bg-[#F0FDF4] border-[#BBF7D0]"
            : campaign.health === "needs-attention"
              ? "bg-[#FEF3C7] border-[#FDE68A]"
              : "bg-[#FEE2E2] border-[#FECACA]"
        }`}
      >
        {campaign.health === "on-track" ? (
          <TrendingUp size={14} strokeWidth={1.7} className="text-[#15803D] flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle
            size={14}
            strokeWidth={1.7}
            className={campaign.health === "needs-attention" ? "text-[#92400E]" : "text-[#B91C1C]"}
          />
        )}
        <div className="flex-1 text-[12px] text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">
            {campaign.health === "on-track"
              ? "On track."
              : campaign.health === "needs-attention"
                ? "Needs attention."
                : "Underperforming."}
          </span>{" "}
          {campaign.health === "on-track"
            ? "CPL drifting within band, qual rate stable. Headroom looks good if you want to scale."
            : campaign.health === "needs-attention"
              ? "CPL drift is creeping past +10%. Worth an optimize pass before it gets worse."
              : "Multiple metrics regressed in the last 7 days. Recommend optimize → root-cause first, then decide."}
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={reveal} className="mb-4">
        <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-2 px-1">
          Quick actions
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={TrendingUp}
            title="Scale this campaign"
            blurb="Lift budget, expand audience · Spot plans the staged rollout."
            onClick={() => startScaleFlow(productScope)}
          />
          <ActionButton
            icon={Sparkles}
            title="Optimize this campaign"
            blurb="Root-cause analysis + fix plan over 3 weeks."
            onClick={() => startOptimizeFlow(productScope)}
          />
          <ActionButton
            icon={Megaphone}
            title="Test new angles"
            blurb="Audit existing creatives → generate + A/B test new ones."
            onClick={() => startTestAnglesFlow(productScope)}
          />
          {isLive ? (
            <ActionButton
              icon={Pause}
              title="Pause this campaign"
              blurb="Stops spend immediately. Reversible from Campaigns table."
              onClick={() =>
                askSpot(
                  `Pause "${workflow.entityName}". Walk me through the budget reallocation.`,
                )
              }
              tone="warn"
            />
          ) : (
            <ActionButton
              icon={Play}
              title="Resume this campaign"
              blurb="Resumes spend at current daily budget."
              onClick={() =>
                askSpot(
                  `Resume "${workflow.entityName}". Anything I should know before un-pausing?`,
                )
              }
              tone="ok"
            />
          )}
        </div>
      </motion.div>

      {/* Recent timeline */}
      <motion.div variants={reveal} className="bg-white border border-border rounded-card p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock size={12} strokeWidth={1.7} className="text-text-secondary" />
          <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold">
            Recent events on this {tierLabel.toLowerCase()}
          </div>
        </div>
        <ol className="space-y-2.5">
          {[
            {
              when: "2 hr ago",
              who: "Spot",
              text: "Frequency on top creative crossed 3.8× · monitoring.",
              icon: Activity,
            },
            {
              when: "yesterday",
              who: "Spot",
              text: "Auto-shifted ₹6K from underperforming ad set to leader.",
              icon: TrendingUp,
            },
            {
              when: "3 days ago",
              who: "Ankit",
              text: "Approved creative rotation · 'Mentor-led' replaced 'Rank-focused'.",
              icon: Sparkles,
            },
            {
              when: "1 week ago",
              who: "Spot",
              text: "Launched · 3 ad sets, ₹9K/day, watchers armed.",
              icon: Play,
            },
          ].map((ev, i) => {
            const Icon = ev.icon;
            return (
              <li key={i} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-surface-page flex items-center justify-center flex-shrink-0">
                  <Icon size={11} strokeWidth={1.7} className="text-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[11px] text-text-tertiary">{ev.when}</span>
                    <span className="text-[11px] text-text-tertiary">·</span>
                    <span className="text-[11px] text-text-secondary inline-flex items-center gap-1">
                      {ev.who === "Spot" && <SpotMark size={9} />}
                      {ev.who}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-text-primary leading-relaxed">{ev.text}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </motion.div>

      {/* Open in Meta footer */}
      <motion.div variants={reveal} className="mt-3 flex items-center justify-end">
        <a
          href={workflow.metaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] text-text-tertiary hover:text-text-primary"
        >
          Open on {workflow.channel === "Meta" ? "Meta" : "Google Ads"}
          <ArrowUpRight size={11} strokeWidth={1.8} />
        </a>
      </motion.div>
    </motion.div>
  );
}

function MetricCell({
  label,
  value,
  delta,
  invert,
}: {
  label: string;
  value: string;
  delta: number;
  invert?: boolean;
}) {
  const isZero = Math.abs(delta) < 0.5;
  const good = invert ? delta < 0 : delta > 0;
  const color = isZero ? "text-text-tertiary" : good ? "text-[#15803D]" : "text-[#B91C1C]";
  return (
    <div className="px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
        {label}
      </div>
      <div className="text-[16px] font-semibold text-text-primary tabular leading-none">
        {value}
      </div>
      {value !== "—" && (
        <div className={`text-[10.5px] tabular mt-1 ${color}`}>
          {isZero ? "0%" : `${delta > 0 ? "↑" : "↓"} ${Math.abs(delta).toFixed(1)}%`}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  title,
  blurb,
  onClick,
  tone,
}: {
  icon: typeof TrendingUp;
  title: string;
  blurb: string;
  onClick: () => void;
  tone?: "warn" | "ok";
}) {
  const ringColor =
    tone === "warn"
      ? "border-[#FDE68A] hover:border-[#92400E]"
      : tone === "ok"
        ? "border-[#BBF7D0] hover:border-[#15803D]"
        : "border-border hover:border-text-primary";
  const iconBg =
    tone === "warn"
      ? "bg-[#FEF3C7] text-[#92400E]"
      : tone === "ok"
        ? "bg-[#F0FDF4] text-[#15803D]"
        : "bg-surface-page text-text-secondary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-card p-3 border transition-all ${ringColor} group`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-card flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={13} strokeWidth={1.7} />
        </div>
        <span className="text-[12.5px] font-semibold text-text-primary">{title}</span>
      </div>
      <div className="text-[11px] text-text-secondary leading-snug ml-9 pr-1">{blurb}</div>
    </button>
  );
}
