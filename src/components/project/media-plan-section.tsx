"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Monitor,
  Sparkles,
  Check,
  RotateCcw,
  Rocket,
  Settings,
  Maximize2,
} from "lucide-react";
import { ProjectDetail, MediaRow } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import {
  CAMPAIGN_TYPE_ORDER,
  CAMPAIGN_TYPE_BY_ID,
  type CampaignTypeId,
} from "@/lib/campaign-types";

function ChannelChip({ channel }: { channel: "Meta" | "Google" }) {
  return (
    <span
      style={{
        background: channel === "Meta" ? "#EAF1FF" : "#FEF6E7",
        color: channel === "Meta" ? "#1E5BFF" : "#9C6D00",
        padding: "2px 7px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {channel}
    </span>
  );
}

function MediaStatus({ status }: { status: MediaRow["status"] }) {
  const map = {
    live: { label: "Live", bg: "var(--ok-bg)", fg: "var(--ok-fg)" },
    paused: { label: "Paused", bg: "var(--bg-secondary)", fg: "var(--text-2)" },
    proposed: { label: "Proposed", bg: "var(--info-bg)", fg: "var(--info-fg)" },
    draft: { label: "Draft", bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
  } as const;
  const m = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 pill"
      style={{ background: m.bg, color: m.fg, fontSize: 10.5 }}
    >
      {status === "live" && (
        <span
          className="spot-pulse"
          style={{ width: 5, height: 5, borderRadius: "50%", background: m.fg, display: "inline-block" }}
        />
      )}
      {m.label}
    </span>
  );
}


export function MediaPlanSection({
  project,
  onAsk,
  mode = "drafts",
  onNewCampaign,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  /** "drafts" = unsaved changes / proposed / draft. "campaigns" = currently live / paused. */
  mode?: "drafts" | "campaigns";
  /** Override the default "new campaign with Spot" action handler. */
  onNewCampaign?: () => void;
}) {
  const openGuided = useSpotStore((s) => s.openGuided);
  const mp = project.mediaPlan;

  const isCampaigns = mode === "campaigns";

  const handleNewCampaign = () => {
    if (onNewCampaign) onNewCampaign();
    else openGuided({ kind: "new-campaign", projectId: project.id });
  };

  // ─── Mode: "campaigns" — TOFU performance table with column picker ────
  if (isCampaigns) {
    const filteredRows = mp.rows.filter(
      (r) => r.status === "live" || r.status === "paused",
    );

    return (
      <CampaignsPerformanceView
        project={project}
        rows={filteredRows}
        onAsk={onAsk}
        onNewCampaign={handleNewCampaign}
      />
    );
  }

  // ─── Mode: "drafts" — recommendation queue ─────────────────────────────
  return (
    <DraftsQueueView
      project={project}
      onAsk={onAsk}
      onNewCampaign={handleNewCampaign}
    />
  );
}

function DraftsQueueView({
  project,
  onAsk,
  onNewCampaign,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  onNewCampaign: () => void;
}) {
  return (
    <DetailedMediaPlanView
      project={project}
      onAsk={onAsk}
      onNewCampaign={onNewCampaign}
    />
  );
}

// ─── Detailed media plan view ──────────────────────────────────────────

type PlanStatus = "live" | "draft" | "proposed" | "not-started";

type PlanCampaign = {
  typeId: CampaignTypeId;
  label: string;
  tagline: string;
  accent: string;
  status: PlanStatus;
  weeklyBudget: number;
  rows: MediaRow[];
};

function buildPlanCampaigns(project: ProjectDetail): PlanCampaign[] {
  const rows = project.mediaPlan.rows;
  // Naive mapping: distribute existing rows to the four canonical types
  // based on heuristics in the campaign name. New runtime campaigns
  // (`Experiment · …`) land in Experiment; anything containing "Cap" goes
  // to cost-cap; "Advantage" to advantage-plus; otherwise scaling.
  const buckets: Record<CampaignTypeId, MediaRow[]> = {
    experiment: [],
    scaling: [],
    "cost-cap": [],
    "advantage-plus": [],
  };
  rows.forEach((r) => {
    const name = r.campaign.toLowerCase();
    if (/advantage/.test(name)) buckets["advantage-plus"].push(r);
    else if (/cap|cost/.test(name)) buckets["cost-cap"].push(r);
    else if (/scaling|scale/.test(name)) buckets["scaling"].push(r);
    else buckets["experiment"].push(r);
  });
  return CAMPAIGN_TYPE_ORDER.map((typeId) => {
    const type = CAMPAIGN_TYPE_BY_ID[typeId];
    const bucketRows = buckets[typeId];
    const weeklyBudget = bucketRows.reduce(
      (s, r) => s + (r.budgetDaily || 0),
      0,
    ) * 7;
    let status: PlanStatus = "not-started";
    if (bucketRows.length > 0) {
      if (bucketRows.some((r) => r.status === "live")) status = "live";
      else if (bucketRows.some((r) => r.status === "draft" || r.status === "proposed"))
        status = "draft";
      else status = "proposed";
    }
    return {
      typeId,
      label: type.short,
      tagline: type.tagline,
      accent: type.accent,
      status,
      weeklyBudget,
      rows: bucketRows,
    };
  });
}

function StatusPill({ status }: { status: PlanStatus }) {
  const map: Record<PlanStatus, { label: string; bg: string; fg: string; dot?: boolean }> = {
    live: { label: "Live", bg: "var(--ok-bg)", fg: "var(--ok-fg)", dot: true },
    draft: { label: "Draft", bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
    proposed: { label: "Proposed", bg: "var(--info-bg)", fg: "var(--info-fg)" },
    "not-started": {
      label: "Not started",
      bg: "var(--bg-secondary)",
      fg: "var(--text-tertiary)",
    },
  };
  const c = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 pill"
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 10,
      }}
    >
      {c.dot && (
        <span
          className="spot-pulse inline-block"
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: c.fg,
          }}
        />
      )}
      {c.label}
    </span>
  );
}

function DetailedMediaPlanView({
  project,
  onAsk,
  onNewCampaign,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  onNewCampaign: () => void;
}) {
  const mp = project.mediaPlan;
  const planCampaigns = useMemo(() => buildPlanCampaigns(project), [project]);

  // Recommendation approval state — keyed by row id
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  // Track expansion state per campaign + ad set (auto-expand Experiment by default)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({
    experiment: true,
  });
  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});

  const stagedRowIds = Object.keys(approved).filter((id) => approved[id]);
  const stagedCount = stagedRowIds.length;
  const stagedNetDelta = mp.rows
    .filter((r) => approved[r.id])
    .reduce((s, r) => s + (r.budgetDaily || 0) * 7, 0);

  return (
    <div>
      <SectionHeader
        icon={Monitor}
        title={`Media plan · ${mp.window}`}
        subtitle="Spot's recommended structure · approve / dismiss inline"
        onAsk={() => onAsk("Refine the media plan — what should I tweak first?")}
        actions={
          <>
            <button
              type="button"
              onClick={() => onAsk("Walk me through every change in this media plan")}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-button border border-border bg-white text-[12px] mr-1.5"
            >
              <Sparkles size={11} /> Refine with Spot
            </button>
            <button
              type="button"
              onClick={onNewCampaign}
              className="apply-btn"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
            >
              <Sparkles size={11} /> New campaign
            </button>
          </>
        }
      />

      {/* Sticky deploy bar */}
      <div
        className="rounded-[10px] mb-4 px-4 py-2.5 flex items-center gap-3"
        style={{
          background: stagedCount > 0 ? "#FFFBE6" : "#FFF",
          border: `1px solid ${stagedCount > 0 ? "#E8C97A" : "var(--border-subtle)"}`,
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold flex items-center gap-1.5">
            {stagedCount > 0 ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#C026D3",
                  }}
                />
                {stagedCount} inline change{stagedCount === 1 ? "" : "s"} staged · net{" "}
                {stagedNetDelta >= 0 ? "+" : ""}₹{(Math.abs(stagedNetDelta) / 1000).toFixed(0)}K/wk
              </>
            ) : (
              <>Nothing staged yet</>
            )}
          </div>
          <div className="text-[10.5px] text-text-tertiary mt-0.5">
            {stagedCount > 0
              ? "Deploy applies these changes as a batch on next campaign refresh."
              : "Approve a Spot recommendation below — staged changes show up here."}
          </div>
        </div>
        <button
          type="button"
          disabled={stagedCount === 0}
          onClick={() => onAsk(`Deploy the ${stagedCount} staged changes — what's the risk?`)}
          className="apply-btn"
          style={{
            height: 32,
            fontSize: 12,
            padding: "0 12px",
            background:
              stagedCount > 0
                ? "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)"
                : "var(--bg-secondary)",
            color: stagedCount > 0 ? "#FFF" : "var(--text-tertiary)",
            cursor: stagedCount > 0 ? "pointer" : "not-allowed",
          }}
        >
          <Rocket size={11} /> Deploy plan
        </button>
      </div>

      {/* Four canonical campaign cards */}
      <div className="space-y-2.5">
        {planCampaigns.map((c) => {
          const isOpen = !!expandedCampaigns[c.typeId];
          const adSetCount = c.rows.reduce(
            (s, r) => s + (r.adSets?.length || 0),
            0,
          );
          const adCount = c.rows.reduce(
            (s, r) => s + r.adSets.reduce((a, set) => a + set.ads.length, 0),
            0,
          );
          // Aggregate of recommendations across this campaign's rows
          const pendingRecCount = c.rows.filter(
            (r) => r.spotChange && !approved[r.id] && !dismissed[r.id],
          ).length;
          return (
            <div
              key={c.typeId}
              className="card-base overflow-hidden"
              style={{
                borderColor: isOpen ? c.accent + "55" : "var(--border)",
              }}
            >
              {/* Campaign header */}
              <button
                type="button"
                onClick={() =>
                  setExpandedCampaigns((prev) => ({ ...prev, [c.typeId]: !isOpen }))
                }
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover-row"
              >
                <span
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: c.accent,
                    color: "#FFF",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {c.label.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-semibold">{c.label}</span>
                    <StatusPill status={c.status} />
                    {pendingRecCount > 0 && (
                      <span
                        className="pill"
                        style={{
                          background: "#FFF8E1",
                          color: "#9C6D00",
                          border: "1px solid #E8C97A",
                          fontSize: 9.5,
                        }}
                      >
                        ⚡ {pendingRecCount} change{pendingRecCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-tertiary truncate mt-0.5">
                    {c.tagline}
                  </div>
                </div>
                <div className="text-right text-[11.5px] tabular-nums flex-shrink-0 mr-2">
                  <div className="font-medium">
                    {c.weeklyBudget
                      ? `₹${(c.weeklyBudget / 1000).toFixed(0)}K/wk`
                      : "—"}
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    {c.rows.length === 0
                      ? "—"
                      : `${adSetCount} ad set${adSetCount === 1 ? "" : "s"} · ${adCount} ad${adCount === 1 ? "" : "s"}`}
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-text-tertiary flex-shrink-0"
                  style={{
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 160ms ease",
                  }}
                />
              </button>

              {/* Campaign body */}
              {isOpen && (
                <div
                  className="border-t border-border-subtle"
                  style={{ background: "var(--bg-page)" }}
                >
                  {c.rows.length === 0 ? (
                    <div className="px-4 py-5 text-[11.5px] text-text-tertiary italic">
                      Not started yet — Spot hasn&apos;t proposed a structure for{" "}
                      {c.label.toLowerCase()} on this project. Once Experiment gathers data,
                      you&apos;ll see ad sets suggested here.
                    </div>
                  ) : (
                    c.rows.map((row) => {
                      const personaName =
                        project.personas.find((p) => p.id === row.personaId)?.name || "—";
                      return (
                        <div
                          key={row.id}
                          className="border-t first:border-t-0 border-border-subtle"
                        >
                          <div className="px-4 py-2 bg-surface-page/50">
                            <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold">
                              {row.channel} · {personaName}
                              {row.agentName && (
                                <span className="ml-2 normal-case font-normal">
                                  · 🤖 {row.agentName}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Row-level spotChange (sometimes applies to entire campaign) */}
                          {row.spotChange &&
                            !approved[row.id] &&
                            !dismissed[row.id] && (
                              <InlineRecommendation
                                label={row.spotChange}
                                onApprove={() =>
                                  setApproved({ ...approved, [row.id]: true })
                                }
                                onDismiss={() =>
                                  setDismissed({ ...dismissed, [row.id]: true })
                                }
                              />
                            )}
                          {row.spotChange && approved[row.id] && (
                            <ApprovedBadge
                              label={row.spotChange}
                              onUndo={() => {
                                const next = { ...approved };
                                delete next[row.id];
                                setApproved(next);
                              }}
                            />
                          )}
                          {/* Ad sets */}
                          {row.adSets.map((adSet) => {
                            const adSetOpen = !!expandedAdSets[adSet.id];
                            return (
                              <div key={adSet.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedAdSets((prev) => ({
                                      ...prev,
                                      [adSet.id]: !adSetOpen,
                                    }))
                                  }
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left hover-row"
                                  style={{ paddingLeft: 38 }}
                                >
                                  <ChevronRight
                                    size={11}
                                    className="text-text-tertiary flex-shrink-0"
                                    style={{
                                      transform: adSetOpen
                                        ? "rotate(90deg)"
                                        : "rotate(0deg)",
                                      transition: "transform 160ms ease",
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-medium truncate">
                                      {adSet.name}
                                    </div>
                                    <div className="text-[10.5px] text-text-tertiary truncate">
                                      {adSet.audience}
                                    </div>
                                  </div>
                                  <div className="text-[11px] tabular-nums text-text-secondary flex-shrink-0">
                                    ₹{(adSet.budgetDaily / 1000).toFixed(0)}K/d
                                    <span className="text-text-tertiary ml-2">
                                      {adSet.expLeads} lds
                                    </span>
                                  </div>
                                </button>
                                {/* Ad-set-level spotChange (more specific) */}
                                {adSet.spotChange &&
                                  !approved[adSet.id] &&
                                  !dismissed[adSet.id] && (
                                    <InlineRecommendation
                                      label={adSet.spotChange}
                                      indent={56}
                                      onApprove={() =>
                                        setApproved({ ...approved, [adSet.id]: true })
                                      }
                                      onDismiss={() =>
                                        setDismissed({ ...dismissed, [adSet.id]: true })
                                      }
                                    />
                                  )}
                                {adSet.spotChange && approved[adSet.id] && (
                                  <ApprovedBadge
                                    label={adSet.spotChange}
                                    indent={56}
                                    onUndo={() => {
                                      const next = { ...approved };
                                      delete next[adSet.id];
                                      setApproved(next);
                                    }}
                                  />
                                )}
                                {adSetOpen &&
                                  adSet.ads.map((ad) => (
                                    <div
                                      key={ad.id}
                                      className="flex items-center gap-2 px-4 py-1.5 text-[11.5px]"
                                      style={{ paddingLeft: 64, background: "#FFF" }}
                                    >
                                      <span
                                        className="inline-block flex-shrink-0"
                                        style={{
                                          width: 4,
                                          height: 4,
                                          borderRadius: "50%",
                                          background: "var(--text-tertiary)",
                                        }}
                                      />
                                      <div className="flex-1 min-w-0 truncate text-text-secondary">
                                        {ad.name}
                                      </div>
                                      {ad.tag === "winner" && (
                                        <span
                                          className="pill pill-ok"
                                          style={{ fontSize: 9.5 }}
                                        >
                                          ★ Winner
                                        </span>
                                      )}
                                      <span className="text-[10.5px] text-text-tertiary tabular-nums">
                                        {ad.cpl ? `₹${ad.cpl} CPL` : "—"}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InlineRecommendation({
  label,
  onApprove,
  onDismiss,
  indent = 38,
}: {
  label: string;
  onApprove: () => void;
  onDismiss: () => void;
  indent?: number;
}) {
  return (
    <div
      className="flex items-center gap-2 py-1.5"
      style={{
        background: "#FFF8E1",
        borderLeft: "3px solid #E8C97A",
        paddingLeft: indent,
        paddingRight: 16,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#9C6D00",
          flexShrink: 0,
        }}
      >
        ⚡
      </span>
      <div className="flex-1 text-[11.5px] text-text-secondary leading-[1.4]">
        <strong style={{ color: "#7A5A00" }}>Spot proposes:</strong> {label}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex items-center h-6 px-2 rounded-button border border-border bg-white text-[10.5px] text-text-secondary flex-shrink-0"
      >
        Dismiss
      </button>
      <button
        type="button"
        onClick={onApprove}
        className="inline-flex items-center gap-1 h-6 px-2.5 rounded-button text-[10.5px] font-medium flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
          color: "#FFF",
        }}
      >
        <Check size={9} /> Approve
      </button>
    </div>
  );
}

function ApprovedBadge({
  label,
  onUndo,
  indent = 38,
}: {
  label: string;
  onUndo: () => void;
  indent?: number;
}) {
  return (
    <div
      className="flex items-center gap-2 py-1.5"
      style={{
        background: "#F0FDF4",
        borderLeft: "3px solid #BBF7D0",
        paddingLeft: indent,
        paddingRight: 16,
      }}
    >
      <Check size={11} style={{ color: "var(--ok-fg)", flexShrink: 0 }} />
      <div className="flex-1 text-[11.5px] leading-[1.4]" style={{ color: "var(--ok-fg)" }}>
        <strong>Approved:</strong> {label}
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 h-5 px-2 rounded-button text-[10.5px] text-text-tertiary hover:text-text-secondary"
      >
        <RotateCcw size={9} /> Undo
      </button>
    </div>
  );
}

// ─── Campaigns performance view with TOFU columns ──────────────────────

/**
 * Realistic TOFU metric derivation. The seed `MediaAd` only has spend/leads
 * — everything else we compute deterministically from those plus an id-based
 * hash so each row looks distinct without random jitter on every render.
 */
type Metrics = {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null; // %
  cpc: number | null;
  cpm: number | null;
  leads: number | null;
  cvr: number | null; // %
  cpl: number | null;
  verified: number | null;
  verifRate: number | null; // %
  cpvl: number | null;
  qualified: number | null;
  qualRate: number | null; // % of verified
  cpql: number | null;
  hookRate: number | null; // %
  holdRate: number | null; // %
};

function hash01(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

function deriveMetrics(id: string, spend: number | null, leads: number | null): Metrics {
  if (spend == null || leads == null) {
    return {
      spend,
      impressions: null,
      clicks: null,
      ctr: null,
      cpc: null,
      cpm: null,
      leads,
      cvr: null,
      cpl: null,
      verified: null,
      verifRate: null,
      cpvl: null,
      qualified: null,
      qualRate: null,
      cpql: null,
      hookRate: null,
      holdRate: null,
    };
  }
  const r = hash01(id);
  const cpmBase = 240 + r * 220; // ₹240–₹460 CPM
  const impressions = Math.round((spend / cpmBase) * 1000);
  const ctrBase = 0.012 + r * 0.012; // 1.2–2.4 %
  const clicks = Math.max(1, Math.round(impressions * ctrBase));
  const cpc = spend / clicks;
  const cpm = (spend / impressions) * 1000;
  const cvr = leads / clicks; // %
  const cpl = leads ? spend / leads : null;
  const verifRate = 0.45 + r * 0.15; // 45–60 %
  const verified = Math.round(leads * verifRate);
  const cpvl = verified ? Math.round(spend / verified) : null;
  const qualRate = 0.45 + ((r * 7) % 1) * 0.2; // 45–65 % of verified
  const qualified = Math.round(verified * qualRate);
  const cpql = qualified ? Math.round(spend / qualified) : null;
  const hookRate = 0.38 + r * 0.22; // 38–60 %
  const holdRate = 0.18 + r * 0.18; // 18–36 %
  return {
    spend,
    impressions,
    clicks,
    ctr: ctrBase * 100,
    cpc: Math.round(cpc),
    cpm: Math.round(cpm),
    leads,
    cvr: cvr * 100,
    cpl: cpl ? Math.round(cpl) : null,
    verified,
    verifRate: verifRate * 100,
    cpvl,
    qualified,
    qualRate: qualRate * 100,
    cpql,
    hookRate: hookRate * 100,
    holdRate: holdRate * 100,
  };
}

function sumMetrics(parts: Metrics[]): Metrics {
  const sum = (key: keyof Metrics): number | null => {
    const vals = parts.map((p) => p[key]).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0);
  };
  const totalSpend = sum("spend");
  const totalImpressions = sum("impressions");
  const totalClicks = sum("clicks");
  const totalLeads = sum("leads");
  const totalVerified = sum("verified");
  const totalQualified = sum("qualified");
  // Derived rates from totals
  const ctr =
    totalImpressions && totalClicks ? (totalClicks / totalImpressions) * 100 : null;
  const cpc = totalClicks && totalSpend ? Math.round(totalSpend / totalClicks) : null;
  const cpm =
    totalSpend && totalImpressions ? Math.round((totalSpend / totalImpressions) * 1000) : null;
  const cvr = totalClicks && totalLeads ? (totalLeads / totalClicks) * 100 : null;
  const cpl = totalLeads && totalSpend ? Math.round(totalSpend / totalLeads) : null;
  const verifRate =
    totalVerified && totalLeads ? (totalVerified / totalLeads) * 100 : null;
  const cpvl =
    totalVerified && totalSpend ? Math.round(totalSpend / totalVerified) : null;
  const qualRate =
    totalQualified && totalVerified ? (totalQualified / totalVerified) * 100 : null;
  const cpql =
    totalQualified && totalSpend ? Math.round(totalSpend / totalQualified) : null;
  // Hook / hold rates: spend-weighted average
  const hookRateNumer = parts.reduce(
    (s, p) => s + (p.hookRate != null && p.spend != null ? p.hookRate * p.spend : 0),
    0,
  );
  const holdRateNumer = parts.reduce(
    (s, p) => s + (p.holdRate != null && p.spend != null ? p.holdRate * p.spend : 0),
    0,
  );
  const hookRate = totalSpend ? hookRateNumer / totalSpend : null;
  const holdRate = totalSpend ? holdRateNumer / totalSpend : null;
  return {
    spend: totalSpend,
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr,
    cpc,
    cpm,
    leads: totalLeads,
    cvr,
    cpl,
    verified: totalVerified,
    verifRate,
    cpvl,
    qualified: totalQualified,
    qualRate,
    cpql,
    hookRate: hookRate || null,
    holdRate: holdRate || null,
  };
}

type MetricKey = keyof Metrics;

type MetricDef = {
  key: MetricKey;
  label: string;
  group: "Funnel" | "Reach" | "Creative";
  defaultOn: boolean;
  format: (v: number | null) => string;
};

const fmtCurrency = (v: number | null) =>
  v == null ? "—" : "₹" + Math.round(v).toLocaleString("en-IN");
const fmtCurrencyK = (v: number | null) =>
  v == null
    ? "—"
    : v >= 100000
    ? `₹${(v / 100000).toFixed(1)}L`
    : v >= 1000
    ? `₹${(v / 1000).toFixed(0)}K`
    : `₹${v.toFixed(0)}`;
const fmtNumber = (v: number | null) =>
  v == null ? "—" : Math.round(v).toLocaleString("en-IN");
const fmtNumberK = (v: number | null) =>
  v == null
    ? "—"
    : v >= 1000000
    ? `${(v / 1000000).toFixed(1)}M`
    : v >= 1000
    ? `${(v / 1000).toFixed(0)}K`
    : `${Math.round(v)}`;
const fmtPercent = (v: number | null) =>
  v == null ? "—" : `${v.toFixed(v < 10 ? 2 : 1)}%`;

const METRIC_DEFS: MetricDef[] = [
  { key: "spend", label: "Spend", group: "Funnel", defaultOn: true, format: fmtCurrencyK },
  { key: "impressions", label: "Impressions", group: "Reach", defaultOn: true, format: fmtNumberK },
  { key: "clicks", label: "Clicks", group: "Reach", defaultOn: false, format: fmtNumber },
  { key: "ctr", label: "CTR", group: "Reach", defaultOn: true, format: fmtPercent },
  { key: "cpc", label: "CPC", group: "Reach", defaultOn: true, format: fmtCurrency },
  { key: "cpm", label: "CPM", group: "Reach", defaultOn: false, format: fmtCurrency },
  { key: "leads", label: "Leads", group: "Funnel", defaultOn: true, format: fmtNumber },
  { key: "cvr", label: "CVR", group: "Funnel", defaultOn: false, format: fmtPercent },
  { key: "cpl", label: "CPL", group: "Funnel", defaultOn: true, format: fmtCurrency },
  { key: "verified", label: "Verified", group: "Funnel", defaultOn: true, format: fmtNumber },
  { key: "verifRate", label: "Verif %", group: "Funnel", defaultOn: false, format: fmtPercent },
  { key: "cpvl", label: "CPVL", group: "Funnel", defaultOn: true, format: fmtCurrency },
  { key: "qualified", label: "Qualified", group: "Funnel", defaultOn: false, format: fmtNumber },
  { key: "qualRate", label: "Qual %", group: "Funnel", defaultOn: false, format: fmtPercent },
  { key: "cpql", label: "CPQL", group: "Funnel", defaultOn: false, format: fmtCurrency },
  { key: "hookRate", label: "Hook rate", group: "Creative", defaultOn: false, format: fmtPercent },
  { key: "holdRate", label: "Hold rate", group: "Creative", defaultOn: false, format: fmtPercent },
];

function CampaignsPerformanceView({
  project,
  rows,
  onAsk,
  onNewCampaign,
}: {
  project: ProjectDetail;
  rows: MediaRow[];
  onAsk: (q: string) => void;
  onNewCampaign: () => void;
}) {
  const router = useRouter();
  const [visibleKeys, setVisibleKeys] = useState<Set<MetricKey>>(
    () => new Set(METRIC_DEFS.filter((m) => m.defaultOn).map((m) => m.key)),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>(() => ({
    [rows[0]?.id || ""]: true,
  }));
  const [expandedAdSets, setExpandedAdSets] = useState<Record<string, boolean>>({});

  const visibleMetrics = METRIC_DEFS.filter((m) => visibleKeys.has(m.key));
  const resetColumns = () =>
    setVisibleKeys(new Set(METRIC_DEFS.filter((m) => m.defaultOn).map((m) => m.key)));

  // Precompute metrics per ad / ad set / campaign
  const computeRowMetrics = (row: MediaRow): Metrics => {
    const adSetMetrics = row.adSets.map((adSet) => {
      const adMetricList = adSet.ads.map((ad) =>
        deriveMetrics(ad.id, ad.spend, ad.leads),
      );
      // If ad set has no ads with spend, leave nulls
      return adMetricList.length === 0
        ? deriveMetrics(adSet.id, null, null)
        : sumMetrics(adMetricList);
    });
    return adSetMetrics.length === 0
      ? deriveMetrics(row.id, null, null)
      : sumMetrics(adSetMetrics);
  };

  return (
    <div>
      <SectionHeader
        icon={Monitor}
        title={`Live campaigns · ${project.mediaPlan.window}`}
        subtitle={`${rows.length} live · what's actually running right now`}
        onAsk={() => onAsk("Which live campaign is driving the best CPVL?")}
        actions={
          <>
            <div className="relative inline-block mr-1.5">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-button border border-border bg-white text-[12px]"
              >
                <Settings size={11} /> Columns
                <span
                  className="ml-1 inline-flex items-center justify-center text-[10px] tabular-nums"
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text-2)",
                    padding: "1px 5px",
                    borderRadius: 9,
                    minWidth: 18,
                  }}
                >
                  {visibleKeys.size}
                </span>
              </button>
              {pickerOpen && (
                <ColumnsPickerPopover
                  visibleKeys={visibleKeys}
                  onChange={setVisibleKeys}
                  onReset={resetColumns}
                  onClose={() => setPickerOpen(false)}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(`/projects/${project.id}/deep-dive?focus=spot`)
              }
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-button border border-border bg-white text-[12px] mr-1.5"
            >
              <SpotMark size={11} /> Analyze with Spot
            </button>
            <button
              type="button"
              onClick={() => router.push(`/projects/${project.id}/deep-dive`)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-button border border-border bg-white text-[12px] mr-1.5"
            >
              <Maximize2 size={11} /> Open deep dive
            </button>
            <button
              type="button"
              onClick={onNewCampaign}
              className="apply-btn"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
            >
              <Sparkles size={11} /> Launch new campaign
            </button>
          </>
        }
      />

      {rows.length === 0 ? (
        <div className="card-base px-6 py-10 text-center">
          <div className="text-[14px] font-semibold mb-1">No live campaigns yet</div>
          <div className="text-[12px] text-text-tertiary mb-4 max-w-md mx-auto leading-[1.5]">
            Once you launch a campaign from your media plan, it shows up here.
          </div>
          <button
            type="button"
            onClick={onNewCampaign}
            className="apply-btn"
            style={{
              height: 36,
              fontSize: 13,
              padding: "0 16px",
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            }}
          >
            <Sparkles size={12} /> Set up first campaign
          </button>
        </div>
      ) : (
        <div className="card-base overflow-x-auto">
          <div style={{ minWidth: 720 + visibleMetrics.length * 96 }}>
            {/* Header */}
            <div
              className="grid items-center px-3 py-2 bg-surface-page text-[10px] uppercase tracking-[0.04em] font-semibold text-text-tertiary border-b border-border"
              style={{
                gridTemplateColumns: `minmax(280px, 1.6fr) ${visibleMetrics
                  .map(() => "96px")
                  .join(" ")} 100px`,
              }}
            >
              <span>Campaign / Ad set / Ad</span>
              {visibleMetrics.map((m) => (
                <span key={m.key} className="text-right">
                  {m.label}
                </span>
              ))}
              <span>Status</span>
            </div>

            {rows.map((row) => {
              const personaName =
                project.personas.find((p) => p.id === row.personaId)?.name || "—";
              const rowMetrics = computeRowMetrics(row);
              const isOpen = !!expandedCampaigns[row.id];
              return (
                <div key={row.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCampaigns((prev) => ({ ...prev, [row.id]: !isOpen }))
                    }
                    className="grid items-center w-full text-left hover-row border-t border-border-subtle"
                    style={{
                      gridTemplateColumns: `minmax(280px, 1.6fr) ${visibleMetrics
                        .map(() => "96px")
                        .join(" ")} 100px`,
                      padding: "12px 12px",
                      background: "#FFF",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight
                        size={12}
                        style={{
                          transform: isOpen ? "rotate(90deg)" : undefined,
                          transition: "transform 120ms",
                        }}
                        className="text-text-tertiary flex-shrink-0"
                      />
                      <ChannelChip channel={row.channel} />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold truncate">
                          {row.campaign}
                        </div>
                        <div className="text-[10.5px] text-text-tertiary truncate">
                          {personaName}
                          {row.agentName && ` · 🤖 ${row.agentName}`}
                        </div>
                      </div>
                    </div>
                    {visibleMetrics.map((m) => (
                      <span key={m.key} className="text-right text-[11.5px] tabular-nums">
                        {m.format(rowMetrics[m.key])}
                      </span>
                    ))}
                    <div>
                      <MediaStatus status={row.status} />
                    </div>
                  </button>

                  {isOpen &&
                    row.adSets.map((adSet) => {
                      const adSetOpen = !!expandedAdSets[adSet.id];
                      const adMetricList = adSet.ads.map((ad) =>
                        deriveMetrics(ad.id, ad.spend, ad.leads),
                      );
                      const adSetMetrics =
                        adMetricList.length === 0
                          ? deriveMetrics(adSet.id, null, null)
                          : sumMetrics(adMetricList);
                      return (
                        <div key={adSet.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedAdSets((prev) => ({
                                ...prev,
                                [adSet.id]: !adSetOpen,
                              }))
                            }
                            className="grid items-center w-full text-left hover-row border-t border-border-subtle"
                            style={{
                              gridTemplateColumns: `minmax(280px, 1.6fr) ${visibleMetrics
                                .map(() => "96px")
                                .join(" ")} 100px`,
                              padding: "8px 12px 8px 36px",
                              background: "var(--bg-page)",
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ChevronRight
                                size={11}
                                style={{
                                  transform: adSetOpen ? "rotate(90deg)" : undefined,
                                  transition: "transform 120ms",
                                }}
                                className="text-text-tertiary flex-shrink-0"
                              />
                              <span className="pill" style={{ fontSize: 9.5 }}>
                                Ad set
                              </span>
                              <div className="min-w-0">
                                <div className="text-[11.5px] font-medium truncate">
                                  {adSet.name}
                                </div>
                                <div className="text-[10px] text-text-tertiary truncate">
                                  {adSet.audience}
                                </div>
                              </div>
                            </div>
                            {visibleMetrics.map((m) => (
                              <span
                                key={m.key}
                                className="text-right text-[11px] tabular-nums text-text-secondary"
                              >
                                {m.format(adSetMetrics[m.key])}
                              </span>
                            ))}
                            <div>
                              <MediaStatus status={adSet.status} />
                            </div>
                          </button>

                          {adSetOpen &&
                            adSet.ads.map((ad) => {
                              const adMetrics = deriveMetrics(ad.id, ad.spend, ad.leads);
                              return (
                                <div
                                  key={ad.id}
                                  className="grid items-center hover-row border-t border-border-subtle text-[10.5px]"
                                  style={{
                                    gridTemplateColumns: `minmax(280px, 1.6fr) ${visibleMetrics
                                      .map(() => "96px")
                                      .join(" ")} 100px`,
                                    padding: "6px 12px 6px 64px",
                                    background: "#FFF",
                                  }}
                                >
                                  <div className="min-w-0 flex items-center gap-1.5">
                                    <span
                                      className="inline-block flex-shrink-0"
                                      style={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: "50%",
                                        background: "var(--text-tertiary)",
                                      }}
                                    />
                                    <span className="truncate text-text-secondary">
                                      {ad.name}
                                    </span>
                                    {ad.tag === "winner" && (
                                      <span className="pill pill-ok" style={{ fontSize: 9 }}>
                                        ★
                                      </span>
                                    )}
                                  </div>
                                  {visibleMetrics.map((m) => (
                                    <span
                                      key={m.key}
                                      className="text-right tabular-nums text-text-tertiary"
                                    >
                                      {m.format(adMetrics[m.key])}
                                    </span>
                                  ))}
                                  <div>
                                    <MediaStatus status={ad.status} />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnsPickerPopover({
  visibleKeys,
  onChange,
  onReset,
  onClose,
}: {
  visibleKeys: Set<MetricKey>;
  onChange: (next: Set<MetricKey>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const grouped = useMemo(() => {
    const out: Record<string, MetricDef[]> = { Funnel: [], Reach: [], Creative: [] };
    METRIC_DEFS.forEach((m) => out[m.group].push(m));
    return out;
  }, []);
  const toggle = (key: MetricKey) => {
    const next = new Set(visibleKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };
  return (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: 40 }}
        onClick={onClose}
      />
      <div
        className="absolute right-0 mt-1 rounded-[10px] shadow-lg bg-white"
        style={{
          zIndex: 50,
          border: "1px solid var(--border)",
          width: 340,
          padding: 12,
        }}
      >
        <div className="text-[11px] uppercase tracking-[0.4px] text-text-tertiary font-semibold mb-2">
          Columns
        </div>
        {(Object.entries(grouped) as [string, MetricDef[]][]).map(([group, items]) => (
          <div key={group} className="mb-2">
            <div className="text-[10px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
              {group}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {items.map((m) => (
                <label
                  key={m.key}
                  className="flex items-center gap-1.5 text-[12px] cursor-pointer hover:bg-surface-page rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={visibleKeys.has(m.key)}
                    onChange={() => toggle(m.key)}
                    className="w-3.5 h-3.5"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-text-secondary hover:text-text-primary"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center h-7 px-3 rounded-button border border-border bg-white text-[11.5px]"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
