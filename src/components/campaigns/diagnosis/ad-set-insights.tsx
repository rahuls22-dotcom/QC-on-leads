"use client";

import {
  TrendingUp,
  Repeat,
  CircleCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AdSetRow } from "@/lib/campaign-data";
import type { CreativeMetric } from "../diagnosis-tab";

type Verdict = "scale" | "hold" | "refresh" | "pause";

const verdictStyles: Record<Verdict, { label: string; pill: string; icon: LucideIcon; iconCls: string }> = {
  scale: {
    label: "Scale",
    pill: "bg-[#DCFCE7] text-[#15803D]",
    icon: TrendingUp,
    iconCls: "text-[#15803D]",
  },
  hold: {
    label: "Hold",
    pill: "bg-surface-secondary text-text-secondary",
    icon: CircleCheck,
    iconCls: "text-text-secondary",
  },
  refresh: {
    label: "Refresh",
    pill: "bg-[#DBEAFE] text-[#1E40AF]",
    icon: Repeat,
    iconCls: "text-[#1E40AF]",
  },
  pause: {
    label: "Pause",
    pill: "bg-[#FEE2E2] text-[#B91C1C]",
    icon: XCircle,
    iconCls: "text-[#B91C1C]",
  },
};

interface AdSetInsightsProps {
  adsets: AdSetRow[];
  creatives: Record<string, CreativeMetric[]>;
}

export function AdSetInsights({ adsets, creatives }: AdSetInsightsProps) {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle">
        <h3 className="text-section-header text-text-primary">Ad set insights</h3>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          How each audience is responding — synthesized from per-adset CTR, qualifier rates, and
          creative fatigue.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
        {adsets.map((a) => (
          <AdSetCard key={a.id} adset={a} creatives={creatives[a.id] ?? []} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AdSetCard({ adset, creatives }: { adset: AdSetRow; creatives: CreativeMetric[] }) {
  const insight = computeAdSetInsight(adset, creatives);
  const v = verdictStyles[insight.verdict];
  const Icon = v.icon;

  return (
    <div className="px-5 py-4 flex flex-col gap-2.5">
      {/* Header: adset name + verdict */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-semibold text-text-primary leading-snug truncate">
            {adset.name}
          </h4>
          <div className="text-[10px] text-text-tertiary mt-0.5 tabular-nums">
            ₹{(adset.spend / 1000).toFixed(0)}K spend · {adset.leads} leads
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-badge shrink-0 ${v.pill}`}
        >
          <Icon size={10} strokeWidth={2} />
          {v.label}
        </span>
      </div>

      {/* Headline insight */}
      <p className="text-[12px] text-text-primary leading-relaxed">{insight.headline}</p>

      {/* Best creative + format */}
      {insight.bestCreative && (
        <div className="flex items-start gap-1.5 text-[11px] text-text-secondary leading-relaxed">
          <TrendingUp size={11} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[#15803D]" />
          <span>
            <span className="text-text-tertiary">Top: </span>
            <span className="font-medium text-text-primary">{insight.bestCreative.format}</span>
            {" — "}
            <span className="tabular-nums">CTR {insight.bestCreative.ctr}%</span>
          </span>
        </div>
      )}

      {/* Metric chips */}
      <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
        <MetricChip label="CTR" value={`${adset.ctr}%`} tone={adset.ctr >= 2 ? "good" : adset.ctr >= 1.2 ? "neutral" : "bad"} />
        <MetricChip label="CPL" value={`₹${adset.cpl.toLocaleString("en-IN")}`} tone="neutral" />
        <MetricChip
          label="Qual"
          value={adset.qualifiedLeads === 0 ? "0" : adset.qualifiedLeads.toString()}
          tone={adset.qualifiedLeads >= 10 ? "good" : adset.qualifiedLeads === 0 ? "bad" : "neutral"}
        />
      </div>
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "neutral" | "bad";
}) {
  const cls =
    tone === "good"
      ? "text-[#15803D]"
      : tone === "bad"
      ? "text-[#B91C1C]"
      : "text-text-secondary";
  return (
    <span className="inline-flex items-baseline gap-1 text-[10px] tabular-nums">
      <span className="text-text-tertiary uppercase tracking-[0.4px] font-semibold">{label}</span>
      <span className={`font-semibold ${cls}`}>{value}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Insight synthesis — deterministic rules from adset + creative data */
/* ------------------------------------------------------------------ */

interface AdSetInsight {
  verdict: Verdict;
  headline: string;
  bestCreative?: { format: string; ctr: number; name: string };
}

function computeAdSetInsight(adset: AdSetRow, creatives: CreativeMetric[]): AdSetInsight {
  const active = creatives.filter((c) => c.status === "active");
  const sorted = [...active].sort((a, b) => b.ctr - a.ctr);
  const top = sorted[0];
  const fatigued = active.find((c) => c.frequency >= 2.5 && c.ctrDelta7d <= -10);
  const verifyRate = adset.leads > 0 ? (adset.verifiedLeads / adset.leads) * 100 : 0;
  const qualRate = adset.leads > 0 ? (adset.qualifiedLeads / adset.leads) * 100 : 0;

  // Verdict rules (in priority order).
  let verdict: Verdict;
  if (adset.diagnosis === "pause-candidate" || (adset.qualifiedLeads === 0 && adset.leads >= 30)) {
    verdict = "pause";
  } else if (fatigued) {
    verdict = "refresh";
  } else if (qualRate >= 15 || (adset.cpql > 0 && adset.cpql <= 7000)) {
    verdict = "scale";
  } else {
    verdict = "hold";
  }

  // Headline.
  let headline: string;
  if (verdict === "pause") {
    headline = adset.qualifiedLeads === 0
      ? `Audience signal weak — ${adset.leads} leads, 0 qualified. Verify rate ${verifyRate.toFixed(0)}%.`
      : `Audience underperforming — CTR ${adset.ctr}%, ${adset.qualifiedLeads} qualified at ₹${adset.cpql.toLocaleString("en-IN")} CPQL.`;
  } else if (verdict === "refresh" && fatigued && top) {
    headline = `${top.format} still resonates (CTR ${top.ctr}%), but ${fatigued.format} fatiguing — frequency ${fatigued.frequency.toFixed(2)}, CTR ${fatigued.ctrDelta7d}% in 7d.`;
  } else if (verdict === "scale" && top) {
    headline = `${top.format} drives this audience — CTR ${top.ctr}%, ${adset.qualifiedLeads} qualified at ₹${adset.cpql.toLocaleString("en-IN")} CPQL.`;
  } else if (verdict === "hold" && top) {
    headline = `Steady — verifies at ${verifyRate.toFixed(0)}%, qualifies at ${qualRate.toFixed(0)}%. Watch ${top.format} for fatigue.`;
  } else {
    headline = `CTR ${adset.ctr}%, ${adset.qualifiedLeads} qualified · ${verifyRate.toFixed(0)}% verify.`;
  }

  return {
    verdict,
    headline,
    bestCreative: top ? { format: top.format, ctr: top.ctr, name: top.name } : undefined,
  };
}
