"use client";

import { MoreHorizontal, Sparkles, RefreshCw, Play } from "lucide-react";
import { Angle, Persona, Creative } from "@/lib/project-data";
import { useSpotStore } from "@/lib/spot/store";

function CreativeThumb({
  hue,
  layout,
  kind,
  format,
}: {
  hue: number;
  layout: Angle["concept"]["layout"];
  kind: Creative["kind"];
  format: Creative["format"];
}) {
  const ar = format === "9:16" ? 9 / 16 : format === "16:9" ? 16 / 9 : format === "4:5" ? 4 / 5 : 1;
  const w = 36;
  const h = w / ar;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 4,
        background: `repeating-linear-gradient(135deg, oklch(0.92 0.04 ${hue}) 0px 4px, oklch(0.84 0.05 ${(hue + 25) % 360}) 4px 8px)`,
        position: "relative",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {layout === "type-led" && (
        <div
          style={{
            position: "absolute",
            inset: "30% 25%",
            background: "#0A0A0A",
            borderRadius: 2,
          }}
        />
      )}
      {layout === "split" && (
        <div
          style={{
            position: "absolute",
            inset: "50% 0 0 0",
            background: "rgba(0,0,0,0.18)",
          }}
        />
      )}
      {layout === "floorplan" && (
        <div
          style={{
            position: "absolute",
            inset: 4,
            border: "1px solid rgba(0,0,0,0.45)",
            borderRadius: 2,
          }}
        />
      )}
      {kind === "video" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderLeft: "6px solid #FFF",
              filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))",
            }}
          />
        </div>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: Creative["kind"] }) {
  const map = {
    image: { fg: "var(--text-2)", bg: "var(--bg-secondary)" },
    video: { fg: "#7C3AED", bg: "#F4ECFF" },
    carousel: { fg: "#1E5BFF", bg: "#EAF1FF" },
  } as const;
  const c = map[kind];
  return (
    <span
      className="uppercase"
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 9.5,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 3,
        letterSpacing: 0.4,
      }}
    >
      {kind}
    </span>
  );
}

function MetricCell({
  label,
  value,
  good,
  fair,
}: {
  label: string;
  value: number | null | undefined;
  good?: number;
  fair?: number;
}) {
  const v = value;
  const formatted =
    v == null
      ? "—"
      : label === "CPL" || label === "CPVL" || label === "CPQL"
      ? `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}`
      : `${v.toFixed(label === "HOOK" || label === "HOLD" ? 0 : 1)}${label.endsWith("RATE") || label === "CTR" || label === "CVR" || label === "HOOK" || label === "HOLD" ? "%" : ""}`;
  const color =
    v == null || good == null
      ? "var(--text-1)"
      : v >= good
      ? "var(--ok-fg)"
      : fair != null && v >= fair
      ? "var(--text-1)"
      : "var(--err-fg)";
  return (
    <div className="text-center min-w-[44px]">
      <div className="uplabel" style={{ fontSize: 9 }}>
        {label}
      </div>
      <div className="tabular-nums" style={{ fontSize: 11.5, fontWeight: 600, color }}>
        {formatted}
      </div>
    </div>
  );
}

function CreativeRow({ c, angle }: { c: Creative; angle: Angle }) {
  const draft = c.spend == null;
  const winnerBg =
    c.tag === "winner"
      ? "linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 60%)"
      : c.tag === "loser"
      ? "linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 60%)"
      : "#FFF";
  const winnerBorder =
    c.tag === "winner" ? "#BBF7D0" : c.tag === "loser" ? "#FECACA" : "var(--border-subtle)";
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-[6px] border"
      style={{ background: winnerBg, borderColor: winnerBorder }}
    >
      <CreativeThumb hue={angle.concept.hue} layout={angle.concept.layout} kind={c.kind} format={c.format} />
      <div style={{ width: 100, flexShrink: 0 }}>
        <div className="text-[11.5px] font-semibold leading-tight">{c.format}</div>
        <div className="text-[10px] text-text-tertiary">{c.surface}</div>
      </div>
      <KindBadge kind={c.kind} />
      {draft ? (
        <div className="flex-1 text-[11px] text-text-tertiary italic">
          Pending data · creative drafted, not yet launched
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-3">
          {c.kind === "video" && (
            <>
              <MetricCell label="HOOK" value={c.hookRate} good={40} fair={25} />
              <MetricCell label="HOLD" value={c.holdRate} good={25} fair={15} />
              <span className="h-4 w-px bg-border-subtle" />
            </>
          )}
          <MetricCell label="CTR" value={c.ctr} good={1.5} fair={1.0} />
          <MetricCell label="CVR" value={c.cvr} good={20} fair={10} />
          <MetricCell label="CPL" value={c.cpl} />
          <MetricCell label="CPVL" value={c.cpvl} />
          <MetricCell label="CPQL" value={c.cpql} />
        </div>
      )}
      {c.tag === "winner" && (
        <span
          className="text-white uppercase"
          style={{
            background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
            fontSize: 9.5,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 4,
            letterSpacing: 0.4,
          }}
        >
          ★ Winner
        </span>
      )}
      {c.tag === "loser" && (
        <span className="pill pill-err uppercase" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4 }}>
          Loser
        </span>
      )}
      <button type="button" className="text-text-tertiary hover:text-text-primary p-1">
        <MoreHorizontal size={13} />
      </button>
    </div>
  );
}

export function AngleCard({
  angle,
  persona,
  projectId,
  onAsk,
  onGenerateCreatives,
}: {
  angle: Angle;
  persona: Persona;
  projectId: string;
  onAsk: (q: string) => void;
  onGenerateCreatives?: (angleId?: string) => void;
}) {
  const openGuided = useSpotStore((s) => s.openGuided);

  const liveCreatives = angle.concept.creatives.filter((c) => c.spend != null);
  const totalSpend = liveCreatives.reduce((s, c) => s + (c.spend || 0), 0);
  const totalVerified = liveCreatives.reduce((s, c) => s + (c.verified || 0), 0);
  const aggCpvl = totalVerified ? Math.round(totalSpend / totalVerified) : null;

  return (
    <div className="card-base bg-white" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <span
            style={{
              background: "linear-gradient(135deg, #F4ECFF 0%, #FDF2FF 100%)",
              color: "#7C3AED",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: 0.3,
            }}
          >
            {angle.name}
          </span>
          <span
            className={`pill ${angle.status === "live" ? "pill-ok" : "pill-warn"}`}
            style={{ fontSize: 10 }}
          >
            {angle.status === "live" ? "Live" : "Draft"}
          </span>
          {angle.status === "live" && (
            <span className="ml-auto text-[11px] tabular-nums text-text-secondary">
              ₹{(totalSpend / 1000).toFixed(0)}K spend · {totalVerified} verified
              {aggCpvl && ` · ₹${aggCpvl.toLocaleString()} CPVL`}
            </span>
          )}
        </div>
        <div
          className="grid gap-x-3 gap-y-1 text-[11.5px]"
          style={{ gridTemplateColumns: "auto 1fr auto 1fr" }}
        >
          <span className="uplabel" style={{ fontSize: 9.5 }}>
            Hook
          </span>
          <span className="text-text-primary">{angle.hook}</span>
          <span className="uplabel" style={{ fontSize: 9.5 }}>
            CTA
          </span>
          <span className="text-text-primary">{angle.cta}</span>
        </div>
      </div>

      {/* Creatives */}
      <div className="px-3.5 py-3 space-y-1.5">
        {angle.concept.creatives.length === 0 ? (
          <div className="flex items-center gap-3 py-1">
            <div className="text-[11.5px] text-text-tertiary italic flex-1">
              No creatives yet for this angle.
            </div>
            {onGenerateCreatives && (
              <button
                type="button"
                onClick={() => onGenerateCreatives(angle.id)}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] font-medium"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                  color: "#FFF",
                }}
              >
                <Sparkles size={11} /> Generate creatives
              </button>
            )}
          </div>
        ) : (
          angle.concept.creatives.map((c) => <CreativeRow key={c.id} c={c} angle={angle} />)
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-border-subtle bg-surface-page">
        <div className="flex gap-1.5">
          <button
            onClick={() => onAsk(`Edit angle "${angle.name}" for ${persona.name}`)}
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] border border-border bg-white hover:border-border-hover"
          >
            <Sparkles size={10} /> Edit angle
          </button>
          <button
            onClick={() => onAsk(`Regenerate concept for "${angle.name}"`)}
            type="button"
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] border border-border bg-white hover:border-border-hover"
          >
            <RefreshCw size={10} /> Regenerate concept
          </button>
        </div>
        <button
          onClick={() =>
            openGuided({
              kind: "launch-creative",
              projectId,
              personaId: persona.id,
              angleId: angle.id,
            })
          }
          type="button"
          className="apply-btn"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
        >
          <Play size={10} /> Launch new creative
        </button>
      </div>
    </div>
  );
}
