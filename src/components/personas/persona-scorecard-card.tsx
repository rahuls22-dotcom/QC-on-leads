"use client";

// Persona scorecard card — extracted from the Memory page so the Project
// (= Product) detail page can render the same "what's working" view.
// Driven by the real scorecard type from spot/persona-scorecard.ts.

import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import {
  ANGLE_STATUS_LABEL,
  ANGLE_STATUS_TONE,
  PERSONA_PERF_STATUS_LABEL,
  PERSONA_PERF_STATUS_TONE,
  type PersonaScorecard,
  type PersonaAngle,
  type AngleStatus,
} from "@/lib/spot/persona-scorecard";

// Local formatters — note `pct` takes a 0–1 fraction (distinct from the
// campaigns-page `pct`, which takes an already-percent number).
const inr = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

// Sort order for angles within a leaderboard — winners up top, losers last.
const ANGLE_RANK: Record<AngleStatus, number> = {
  winner: 0,
  scaling: 1,
  testing: 2,
  fatigued: 3,
  loser: 4,
};

function trendGlyph(trend: number) {
  if (trend === 0) return { Icon: Minus, color: "#6B6B63", label: "flat" };
  // Negative CPL trend = cheaper = good (green).
  if (trend < 0) return { Icon: TrendingDown, color: "#15803D", label: `${trend}% CPL` };
  return { Icon: TrendingUp, color: "#B91C1C", label: `+${trend}% CPL` };
}

export function PersonaScorecardCard({ card }: { card: PersonaScorecard }) {
  const perf = card.perf;
  const tone = perf ? PERSONA_PERF_STATUS_TONE[perf.status] : null;
  const ageAttr = card.attributes.find((a) => /age/i.test(a.label));
  const geoAttr = card.attributes.find((a) => /geo|geography|cities|region/i.test(a.label));
  const sortedAngles = perf
    ? [...perf.angles].sort(
        (a, b) => ANGLE_RANK[a.status] - ANGLE_RANK[b.status] || a.cpl - b.cpl,
      )
    : [];
  const bestCpl = sortedAngles.length ? Math.min(...sortedAngles.map((a) => a.cpl)) : 0;

  return (
    <div className="bg-white border border-border rounded-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[14px] font-semibold text-text-primary">
              {card.shortLabel}
            </span>
            {perf && tone && (
              <span
                className="inline-flex items-center gap-1 h-[18px] px-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: tone.bg, color: tone.text }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
                {PERSONA_PERF_STATUS_LABEL[perf.status]}
              </span>
            )}
          </div>
          <div className="text-[11px] text-text-tertiary leading-snug">
            {[ageAttr?.value, geoAttr?.value, card.preferredChannels.join(" · ")]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </div>

      {perf ? (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-4 divide-x divide-border-subtle border-b border-border-subtle">
            <KpiCell label="Blended CPL" value={inr(perf.cpl)} />
            <KpiCell label="Qual rate" value={pct(perf.qualRate)} />
            <KpiCell label="Leads" value={perf.leads.toLocaleString("en-IN")} sub={`${inr(perf.spend)} spend`} />
            <KpiTrendCell trend={perf.trend} />
          </div>

          {/* Spot's verdict */}
          <div className="px-4 py-2.5 bg-[#FAFAF8] border-b border-border-subtle flex items-start gap-2">
            <SpotMark size={13} />
            <div className="text-[12px] text-text-secondary leading-relaxed">
              <span className="font-medium text-text-primary">Spot&apos;s take · </span>
              {perf.verdict}
            </div>
          </div>

          {/* Angle leaderboard */}
          <div className="px-4 py-3">
            <div className="text-[10.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
              Angle leaderboard · {sortedAngles.length}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    <th className="text-left font-semibold pb-1.5 pr-2">Angle</th>
                    <th className="text-left font-semibold pb-1.5 px-2">Status</th>
                    <th className="text-right font-semibold pb-1.5 px-2">CPL</th>
                    <th className="text-right font-semibold pb-1.5 px-2">Qual</th>
                    <th className="text-right font-semibold pb-1.5 px-2">CTR</th>
                    <th className="text-right font-semibold pb-1.5 px-2">Freq</th>
                    <th className="text-right font-semibold pb-1.5 px-2">Leads</th>
                    <th className="text-left font-semibold pb-1.5 pl-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAngles.map((a) => (
                    <AngleRow key={a.id} a={a} isBestCpl={a.cpl === bestCpl} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 py-6 text-center text-[12.5px] text-text-tertiary italic">
          No performance data yet — Spot writes results here after the first
          execution that uses this persona.
        </div>
      )}
    </div>
  );
}

function KpiCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[9.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
        {label}
      </div>
      <div className="text-[15px] font-semibold text-text-primary tabular leading-none">
        {value}
      </div>
      {sub && <div className="text-[10px] text-text-tertiary mt-1">{sub}</div>}
    </div>
  );
}

function KpiTrendCell({ trend }: { trend: number }) {
  const { Icon, color, label } = trendGlyph(trend);
  return (
    <div className="px-3 py-2.5">
      <div className="text-[9.5px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
        Trend
      </div>
      <div className="flex items-center gap-1" style={{ color }}>
        <Icon size={14} strokeWidth={2} />
        <span className="text-[13px] font-semibold tabular leading-none">{label}</span>
      </div>
      <div className="text-[10px] text-text-tertiary mt-1">vs prior window</div>
    </div>
  );
}

function AngleRow({ a, isBestCpl }: { a: PersonaAngle; isBestCpl: boolean }) {
  const tone = ANGLE_STATUS_TONE[a.status];
  return (
    <tr className="border-t border-border-subtle align-top">
      <td className="py-2 pr-2">
        <div className="text-[12px] font-medium text-text-primary leading-snug">{a.name}</div>
        {a.note && (
          <div className="text-[10.5px] text-text-tertiary leading-snug mt-0.5">{a.note}</div>
        )}
      </td>
      <td className="py-2 px-2 whitespace-nowrap">
        <span
          className="inline-flex items-center gap-1 h-[17px] px-1.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider"
          style={{ background: tone.bg, color: tone.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
          {ANGLE_STATUS_LABEL[a.status]}
        </span>
      </td>
      <td className="py-2 px-2 text-right tabular whitespace-nowrap">
        <span className={isBestCpl ? "font-semibold text-[#15803D]" : "text-text-primary"}>
          {inr(a.cpl)}
        </span>
      </td>
      <td className="py-2 px-2 text-right tabular text-text-secondary">{pct(a.qualRate)}</td>
      <td className="py-2 px-2 text-right tabular text-text-secondary">{a.ctr}%</td>
      <td className="py-2 px-2 text-right tabular text-text-secondary">
        <span className={a.frequency >= 3 ? "text-[#B91C1C] font-medium" : ""}>
          {a.frequency}
        </span>
      </td>
      <td className="py-2 px-2 text-right tabular text-text-secondary">{a.leads}</td>
      <td className="py-2 pl-2 whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-[10.5px] text-text-tertiary hover:text-text-primary cursor-pointer">
          {a.source.label}
          <ArrowUpRight size={9} strokeWidth={1.8} />
        </span>
      </td>
    </tr>
  );
}
