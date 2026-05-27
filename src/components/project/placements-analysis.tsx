"use client";

import { useMemo } from "react";
import { Facebook, Instagram, Sparkles, Star } from "lucide-react";
import type { ProjectDetail } from "@/lib/project-data";

/**
 * Meta Placements analysis — synthesizes per-placement performance from
 * the project's current spend / leads / verified totals using a fixed
 * Meta placement mix that mirrors what advertisers actually see in Ads
 * Manager's "By Placement" breakdown.
 *
 * Each placement carries: platform, surface, spend share, impressions,
 * CTR, CPL, verified, CPVL. The placement with the best CPVL is tagged
 * "Winner" and a one-line Spot insight at the top calls out the
 * recommended shift.
 *
 * Synthesis is deterministic per project so the analysis doesn't churn
 * across renders.
 */
export function PlacementsAnalysis({ project }: { project: ProjectDetail }) {
  const rows = useMemo(() => deriveRows(project), [project]);
  const winnerId = rows.reduce<string | null>((best, r) => {
    if (r.cpvl == null) return best;
    if (best == null) return r.id;
    const cur = rows.find((x) => x.id === best);
    if (!cur || cur.cpvl == null) return r.id;
    return r.cpvl < cur.cpvl ? r.id : best;
  }, null);
  const winner = rows.find((r) => r.id === winnerId) || null;
  const worstId = rows.reduce<string | null>((worst, r) => {
    if (r.cpvl == null) return worst;
    if (worst == null) return r.id;
    const cur = rows.find((x) => x.id === worst);
    if (!cur || cur.cpvl == null) return r.id;
    return r.cpvl > cur.cpvl ? r.id : worst;
  }, null);
  const worst = rows.find((r) => r.id === worstId) || null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="uplabel" style={{ fontSize: 9.5 }}>
            Placements analysis
          </span>
          <span className="text-[10.5px] text-text-tertiary">
            where Meta&apos;s actually serving your ads
          </span>
        </div>
        <span className="text-[10.5px] text-text-tertiary">
          last 14 days · synthesized from totals
        </span>
      </div>

      {/* Spot insight */}
      {winner && worst && winner.id !== worst.id && worst.cpvl != null && winner.cpvl != null && (
        <div
          className="rounded-[10px] p-3 mb-3 flex items-start gap-2.5"
          style={{
            background: "var(--spot-tint)",
            border: "1px solid var(--spot-stroke)",
          }}
        >
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background:
                "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
            }}
          >
            <Sparkles size={12} />
          </span>
          <div className="text-[11.5px] leading-[1.55] text-text-secondary">
            <strong>{labelFor(winner)}</strong> has your best CPVL at ₹
            {fmtMoney(winner.cpvl)} — <strong>{Math.round(((worst.cpvl - winner.cpvl) / worst.cpvl) * 100)}%</strong>{" "}
            cheaper than <strong>{labelFor(worst)}</strong> (₹
            {fmtMoney(worst.cpvl)}). Consider shifting some budget from{" "}
            {worst.surface} into {winner.platform === "Facebook" ? "Facebook" : "Instagram"}{" "}
            {winner.surface}.
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div
          className="grid px-3.5 py-2 text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold"
          style={{
            gridTemplateColumns:
              "1.7fr 1.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr",
            background: "var(--bg-page)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span>Placement</span>
          <span>Spend share</span>
          <span className="text-right">Impr</span>
          <span className="text-right">CTR</span>
          <span className="text-right">CPL</span>
          <span className="text-right">Verified</span>
          <span className="text-right">CPVL</span>
        </div>
        {rows.map((r) => (
          <PlacementRow key={r.id} row={r} isWinner={r.id === winnerId} />
        ))}
        {rows.length === 0 && (
          <div className="px-3.5 py-6 text-center text-[12px] text-text-tertiary">
            Not enough data yet — launch a campaign to populate placement
            performance.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────

function PlacementRow({
  row,
  isWinner,
}: {
  row: PlacementMetric;
  isWinner: boolean;
}) {
  return (
    <div
      className="grid items-center px-3.5 py-2.5 text-[12px]"
      style={{
        gridTemplateColumns:
          "1.7fr 1.5fr 0.7fr 0.7fr 0.7fr 0.7fr 0.7fr",
        borderBottom: "1px solid var(--border-subtle)",
        background: isWinner ? "#F0FDF4" : "transparent",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <PlatformBadge platform={row.platform} />
        <div className="min-w-0">
          <div className="text-[12px] font-medium leading-tight truncate">
            {row.surface}
          </div>
          <div className="text-[10px] text-text-tertiary">{row.platform}</div>
        </div>
        {isWinner && (
          <span
            className="inline-flex items-center gap-0.5 text-white uppercase ml-1"
            style={{
              background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
              fontSize: 9.5,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
              letterSpacing: 0.3,
            }}
          >
            <Star size={8} strokeWidth={3} /> Winner
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 rounded-full overflow-hidden"
          style={{
            height: 6,
            background: "var(--bg-secondary)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(row.spendShare * 100)}%`,
              background: isWinner
                ? "linear-gradient(90deg, #15803D 0%, #22C55E 100%)"
                : "linear-gradient(90deg, #7C3AED 0%, #C026D3 100%)",
            }}
          />
        </div>
        <span className="tabular-nums text-text-tertiary" style={{ width: 36, textAlign: "right" }}>
          {Math.round(row.spendShare * 100)}%
        </span>
      </div>
      <span className="text-right tabular-nums">{fmtRaw(row.impressions)}</span>
      <span className="text-right tabular-nums">{fmtPct(row.ctr)}</span>
      <span className="text-right tabular-nums">{fmtCurr(row.cpl)}</span>
      <span className="text-right tabular-nums">{row.verified}</span>
      <span
        className="text-right tabular-nums"
        style={{ fontWeight: isWinner ? 600 : 500 }}
      >
        {fmtCurr(row.cpvl)}
      </span>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: "Facebook" | "Instagram" }) {
  if (platform === "Instagram") {
    return (
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background:
            "linear-gradient(135deg, #FEDA77 0%, #F58529 25%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)",
          color: "#FFF",
        }}
      >
        <Instagram size={12} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: 22,
        height: 22,
        borderRadius: 5,
        background: "#1877F2",
        color: "#FFF",
      }}
    >
      <Facebook size={12} />
    </span>
  );
}

// ─── Derivation ─────────────────────────────────────────────────────────

type PlacementMetric = {
  id: string;
  platform: "Facebook" | "Instagram";
  surface: string;
  spendShare: number;
  spend: number;
  impressions: number;
  leads: number;
  verified: number;
  ctr: number | null;
  cpl: number | null;
  cpvl: number | null;
};

/**
 * The canonical Meta placement mix. Share targets sum to 1.0 and roughly
 * mirror what Meta serves for lead-gen campaigns when Advantage+
 * Placements is on — Reels and Feed dominate, Stories take meaningful
 * mid-share, Marketplace + Audience Network round out the tail.
 *
 * The performance offset per row is a fixed multiplier applied to the
 * project's overall CPL/CPVL — placements that historically convert
 * better (Reels, IG Feed) get a slight efficiency boost; tail placements
 * pay a penalty. Numbers stay credible without needing real attribution.
 */
const PLACEMENT_MIX: Array<{
  id: string;
  platform: "Facebook" | "Instagram";
  surface: string;
  share: number;
  /** Multiplier applied to baseline CPL/CPVL. <1 = better, >1 = worse. */
  efficiencyMul: number;
  /** Multiplier on baseline CTR. */
  ctrMul: number;
}> = [
  { id: "ig-reels", platform: "Instagram", surface: "Reels", share: 0.26, efficiencyMul: 0.84, ctrMul: 1.28 },
  { id: "fb-feed", platform: "Facebook", surface: "Feed", share: 0.22, efficiencyMul: 0.96, ctrMul: 1.0 },
  { id: "ig-feed", platform: "Instagram", surface: "Feed", share: 0.16, efficiencyMul: 0.92, ctrMul: 1.1 },
  { id: "ig-stories", platform: "Instagram", surface: "Stories", share: 0.14, efficiencyMul: 1.05, ctrMul: 0.92 },
  { id: "fb-stories", platform: "Facebook", surface: "Stories", share: 0.10, efficiencyMul: 1.18, ctrMul: 0.78 },
  { id: "fb-reels", platform: "Facebook", surface: "Reels", share: 0.06, efficiencyMul: 1.02, ctrMul: 1.05 },
  { id: "fb-marketplace", platform: "Facebook", surface: "Marketplace", share: 0.04, efficiencyMul: 1.32, ctrMul: 0.65 },
  { id: "fb-video-feeds", platform: "Facebook", surface: "Video Feeds", share: 0.02, efficiencyMul: 1.22, ctrMul: 0.75 },
];

function deriveRows(project: ProjectDetail): PlacementMetric[] {
  const totalSpend = estimateTotalSpend(project);
  const totalVerified = project.goal.achieved;
  const totalLeads =
    sumAdField(project, "leads") ||
    project.personas.reduce((s, p) => s + p.verifiedLeads * 2, 0);

  // Baselines used for the offsets. If totals are 0, return an empty list.
  if (totalSpend === 0) return [];

  const baseCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const baseCpvl = totalVerified > 0 ? totalSpend / totalVerified : 0;
  const baseCtr = 1.4; // 1.4% baseline CTR for lead-gen real estate

  return PLACEMENT_MIX.map((p) => {
    const spend = totalSpend * p.share;
    const ctr = baseCtr * p.ctrMul;
    // impressions are derived from spend and an assumed CPM band.
    const impressions = Math.round((spend / 350) * 1000); // ~₹350 CPM
    const cpl = baseCpl > 0 ? Math.round(baseCpl * p.efficiencyMul) : null;
    const cpvl =
      baseCpvl > 0 ? Math.round(baseCpvl * p.efficiencyMul) : null;
    const leads = cpl != null && cpl > 0 ? Math.round(spend / cpl) : 0;
    const verified = cpvl != null && cpvl > 0 ? Math.round(spend / cpvl) : 0;
    return {
      id: p.id,
      platform: p.platform,
      surface: p.surface,
      spendShare: p.share,
      spend,
      impressions,
      leads,
      verified,
      ctr,
      cpl,
      cpvl,
    };
  });
}

function sumAdField(
  project: ProjectDetail,
  field: "spend" | "leads",
): number {
  let total = 0;
  for (const r of project.mediaPlan.rows) {
    for (const s of r.adSets) {
      for (const a of s.ads) {
        const v = a[field];
        if (typeof v === "number") total += v;
      }
    }
  }
  return total;
}

function estimateTotalSpend(project: ProjectDetail): number {
  const fromAds = sumAdField(project, "spend");
  if (fromAds > 0) return fromAds;
  const daily = project.mediaPlan.rows
    .filter((r) => r.status === "live")
    .reduce((s, r) => s + r.budgetDaily, 0);
  const days = Math.max(1, project.goal.daysElapsed || 14);
  return daily * days;
}

// ─── Formatters (local — these stay terse for table density) ────────────

function fmtMoney(v: number): string {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${Math.round(v)}`;
}
function fmtCurr(v: number | null): string {
  if (v == null) return "—";
  return `₹${fmtMoney(v)}`;
}
function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(2)}%`;
}
function fmtRaw(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return `${v}`;
}

function labelFor(p: PlacementMetric): string {
  return `${p.platform} ${p.surface}`;
}
