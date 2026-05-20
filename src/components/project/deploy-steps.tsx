"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Plus,
  Sparkles,
  Trash2,
  Eye,
  Settings,
  Upload as UploadIcon,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react";
import {
  CAMPAIGN_TYPE_BY_ID,
  CAMPAIGN_TYPE_ORDER,
  type CampaignTypeId,
  type PlannedAdSet,
} from "@/lib/campaign-types";

// ─── Shared types ─────────────────────────────────────────────────────

export type PersonaInput = {
  id: string;
  name: string;
  share: number;
  role: string;
  angles?: Array<{ id: string; name: string }>;
};

export type CampaignSettings = {
  objective: "leads" | "verified" | "qualified";
  weeklyBudget: string;
  pacing: "standard" | "accelerated";
};

export type DraftedCreative = {
  id: string;
  personaId: string;
  angleId?: string;
  angleName: string;
  format: string;
  upload?: { url: string; kind: "image" | "video" };
};

export type CreativesState = Record<string, DraftedCreative[]>;

export type LeadFormField = {
  k: string;
  label: string;
  type: "text" | "email" | "tel" | "select";
};

export const LEAD_FORM_FIELDS: LeadFormField[] = [
  { k: "name", label: "Full name", type: "text" },
  { k: "phone", label: "Phone number", type: "tel" },
  { k: "email", label: "Email", type: "email" },
  { k: "budget", label: "Budget range", type: "select" },
  { k: "timeline", label: "Purchase timeline", type: "select" },
  { k: "units", label: "Preferred unit type", type: "select" },
];

export const DEFAULT_DISCLAIMER =
  "PRM/MH/RERA/... · This is a RERA-registered project. By submitting, you agree to be contacted by Godrej Properties about this project. We do not share your details with third parties.";

export type LeadFormState = {
  enabled: Record<string, boolean>;
  disclaimer: string;
};

// ─── Stage strip ──────────────────────────────────────────────────────

export function StagePill<S extends string>({
  stage,
  current,
  stages,
  onClick,
}: {
  stage: { key: S; label: string };
  current: S;
  stages: ReadonlyArray<{ key: S; label: string }>;
  onClick?: () => void;
}) {
  const idx = stages.findIndex((s) => s.key === stage.key);
  const currentIdx = stages.findIndex((s) => s.key === current);
  const done = idx < currentIdx;
  const active = idx === currentIdx;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!done && !active}
      className="flex items-center gap-1.5 flex-shrink-0"
      style={{ cursor: done || active ? "pointer" : "not-allowed" }}
    >
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold flex-shrink-0"
        style={{
          background: done ? "#22C55E" : active ? "#1A1A1A" : "var(--bg-secondary)",
          color: done || active ? "#FFF" : "var(--text-3)",
        }}
      >
        {done ? "✓" : idx + 1}
      </span>
      <span
        className="text-[11.5px] hidden md:inline"
        style={{
          color: active ? "var(--text-1)" : "var(--text-3)",
          fontWeight: active ? 600 : 500,
        }}
      >
        {stage.label}
      </span>
    </button>
  );
}

// ─── PersonaAvatar ────────────────────────────────────────────────────

export function PersonaAvatar({ id, size = 40 }: { id: string; size?: number }) {
  const hue = (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: `linear-gradient(135deg, oklch(0.88 0.06 ${hue}) 0%, oklch(0.72 0.09 ${(hue + 50) % 360}) 100%)`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx="20" cy="15" r="5" fill="rgba(0,0,0,0.35)" />
        <path d="M10 34c0-6 5-9 10-9s10 3 10 9z" fill="rgba(0,0,0,0.35)" />
      </svg>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

const FALLBACK_ANGLES = [
  { id: "a-lifestyle", name: "Lifestyle Upgrade" },
  { id: "a-investment", name: "Investment Thesis" },
  { id: "a-family", name: "Family-First" },
];

export function autoDraftCreatives(personas: PersonaInput[]): CreativesState {
  const out: CreativesState = {};
  personas.forEach((p) => {
    const angles = p.angles && p.angles.length > 0 ? p.angles : FALLBACK_ANGLES;
    out[p.id] = [0, 1].map((i) => {
      const a = angles[i % angles.length];
      return {
        id: `cr-${p.id}-${i}`,
        personaId: p.id,
        angleId: a.id,
        angleName: a.name,
        format: i === 0 ? "1:1 · Meta Feed" : "9:16 · Meta Reels",
      };
    });
  });
  return out;
}

// ─── Creative tile ────────────────────────────────────────────────────

export function CreativeTile({
  creative,
  hue,
  onRefine,
  onUpload,
  onRemove,
}: {
  creative: DraftedCreative;
  hue: number;
  onRefine: (text: string) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
    e.target.value = "";
  };

  return (
    <div
      className="card-base p-2 flex flex-col gap-2"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 6,
          background: creative.upload
            ? undefined
            : `repeating-linear-gradient(135deg, oklch(0.9 0.05 ${hue}) 0 6px, oklch(0.82 0.06 ${(hue + 30) % 360}) 6px 12px)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {creative.upload?.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creative.upload.url}
            alt="uploaded creative"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {creative.upload?.kind === "video" && (
          <video
            src={creative.upload.url}
            muted
            loop
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {creative.upload && (
          <span
            className="pill"
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              fontSize: 9,
              background: "rgba(0,0,0,0.6)",
              color: "#FFF",
              border: "none",
            }}
          >
            {creative.upload.kind === "image" ? <ImageIcon size={9} /> : <VideoIcon size={9} />}{" "}
            uploaded
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="text-[11px] font-medium truncate">{creative.angleName}</div>
        <div className="text-[10px] text-text-tertiary">{creative.format}</div>
      </div>
      {refineOpen ? (
        <div className="space-y-1.5">
          <textarea
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            rows={2}
            autoFocus
            placeholder='Tell Spot what to change — "sharper hook", "use interior images"…'
            className="w-full text-[11px] outline-none rounded px-1.5 py-1 resize-none"
            style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setRefineOpen(false);
                setRefineText("");
              }}
              className="inline-flex items-center h-6 px-2 rounded-button border border-border bg-white text-[10.5px]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!refineText.trim()}
              onClick={() => {
                onRefine(refineText);
                setRefineText("");
                setRefineOpen(false);
              }}
              className="apply-btn"
              style={{ height: 24, fontSize: 10.5, padding: "0 8px" }}
            >
              <Sparkles size={10} /> Redraft
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setRefineOpen(true)}
            className="inline-flex items-center justify-center h-6 w-6 rounded-button border border-border bg-white text-text-tertiary hover:bg-surface-page"
            title="Refine"
          >
            <Sparkles size={11} />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center h-6 w-6 rounded-button border border-border bg-white text-text-tertiary hover:bg-surface-page"
            title="Upload your own image / video"
          >
            <UploadIcon size={11} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto inline-flex items-center justify-center h-6 w-6 rounded-button border border-border bg-white text-text-tertiary hover:bg-surface-page"
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Campaign settings card ────────────────────────────────────────────

export function CampaignSettingsCard({
  settings,
  onChange,
}: {
  settings: CampaignSettings;
  onChange: (next: CampaignSettings) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Optimization objective
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { k: "leads", label: "Leads", sub: "highest volume, lower quality" },
            { k: "verified", label: "Verified leads", sub: "Spot recommends" },
            { k: "qualified", label: "Qualified leads", sub: "voice-agent verified" },
          ].map(({ k, label, sub }) => {
            const active = settings.objective === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() =>
                  onChange({ ...settings, objective: k as CampaignSettings["objective"] })
                }
                className="card-base text-left p-2.5"
                style={{
                  borderColor: active ? "#1A1A1A" : "var(--border)",
                  background: active ? "#1A1A1A" : "#FFF",
                  color: active ? "#FFF" : "var(--text-1)",
                }}
              >
                <div className="text-[12px] font-semibold">{label}</div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{
                    color: active ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)",
                  }}
                >
                  {sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Weekly budget
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-text-tertiary text-[13px]">₹</span>
          <input
            type="text"
            value={settings.weeklyBudget}
            onChange={(e) =>
              onChange({
                ...settings,
                weeklyBudget: e.target.value.replace(/[^0-9]/g, ""),
              })
            }
            className="flex-1 outline-none rounded px-2 py-1.5 text-[13px] tabular-nums"
            style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
          />
          <span className="text-text-tertiary text-[11px]">/ week</span>
        </div>
        <div className="text-[10.5px] text-text-tertiary mt-1.5">
          Projected: ~{Math.round((Number(settings.weeklyBudget) * 4.3) / 1000)}K / month
        </div>
      </div>

      <div>
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Pacing
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { k: "standard", label: "Standard", sub: "spend smoothly across the day" },
            { k: "accelerated", label: "Accelerated", sub: "spend as fast as auction allows" },
          ].map(({ k, label, sub }) => {
            const active = settings.pacing === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() =>
                  onChange({ ...settings, pacing: k as CampaignSettings["pacing"] })
                }
                className="card-base text-left p-2.5"
                style={{ borderColor: active ? "#1A1A1A" : "var(--border)" }}
              >
                <div className="text-[12px] font-medium">{label}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">{sub}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Creatives card ───────────────────────────────────────────────────

export function CreativesCard({
  personas,
  state,
  onChange,
}: {
  personas: PersonaInput[];
  state: CreativesState;
  onChange: (next: CreativesState) => void;
}) {
  const totalDrafted = Object.values(state).reduce((s, arr) => s + arr.length, 0);
  const totalTarget = personas.length * 2;

  return (
    <div className="space-y-3">
      <div className="text-[11.5px] text-text-secondary leading-[1.5]">
        <strong>
          {totalDrafted} of {totalTarget}+ creatives drafted
        </strong>{" "}
        · 2 per persona to start. Refine, swap angle, upload your own image or video, or add another.
      </div>

      {personas.map((p) => {
        const hue = (p.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
        const list = state[p.id] || [];
        const angles = p.angles && p.angles.length > 0 ? p.angles : FALLBACK_ANGLES;
        return (
          <div key={p.id} className="card-base p-3.5">
            <div className="flex items-start gap-3 mb-3">
              <PersonaAvatar id={p.id} size={32} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-[13px] font-semibold">{p.name}</div>
                  <span className="pill" style={{ fontSize: 10 }}>
                    {p.share}% mix
                  </span>
                  <span className="pill pill-ok" style={{ fontSize: 10 }}>
                    <Check size={10} /> {list.length} creative{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="text-[10.5px] text-text-tertiary mt-0.5">{p.role}</div>
              </div>
            </div>

            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeating(auto-fill, minmax(140px, 1fr))" }}
            >
              <div
                className="grid gap-2 col-span-full"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
              >
                {list.map((c) => (
                  <CreativeTile
                    key={c.id}
                    creative={c}
                    hue={hue}
                    onRefine={(text) => {
                      const nextList = list.map((x) =>
                        x.id === c.id
                          ? { ...x, angleName: `${x.angleName} · ${text.slice(0, 30)}` }
                          : x,
                      );
                      onChange({ ...state, [p.id]: nextList });
                    }}
                    onUpload={(file) => {
                      const url = URL.createObjectURL(file);
                      const kind: "image" | "video" = file.type.startsWith("video")
                        ? "video"
                        : "image";
                      const nextList = list.map((x) =>
                        x.id === c.id ? { ...x, upload: { url, kind } } : x,
                      );
                      onChange({ ...state, [p.id]: nextList });
                    }}
                    onRemove={() => {
                      const nextList = list.filter((x) => x.id !== c.id);
                      onChange({ ...state, [p.id]: nextList });
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const angle = angles[list.length % angles.length];
                    const newCreative: DraftedCreative = {
                      id: `cr-${p.id}-${Date.now()}`,
                      personaId: p.id,
                      angleId: angle?.id,
                      angleName: angle?.name || "New angle",
                      format: "1:1 · Meta Feed",
                    };
                    onChange({ ...state, [p.id]: [...list, newCreative] });
                  }}
                  className="inline-flex flex-col items-center justify-center gap-1 rounded-[6px] border border-dashed border-border bg-white text-text-secondary hover:border-border-hover hover:bg-surface-page"
                  style={{ aspectRatio: "1 / 1.4", minHeight: 100 }}
                >
                  <Plus size={16} />
                  <span className="text-[10.5px]">Add another</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ad sets per campaign ─────────────────────────────────────────────

export type PlanCampaign = {
  id: string;
  typeId: CampaignTypeId;
  name: string;
  adSets: PlannedAdSet[];
};

export function deriveCampaigns(
  projectShort: string,
  personas: { id: string; name: string }[],
): PlanCampaign[] {
  return CAMPAIGN_TYPE_ORDER.map((typeId, i) => {
    const type = CAMPAIGN_TYPE_BY_ID[typeId];
    return {
      id: `pc-${typeId}-${i}`,
      typeId,
      name: `${projectShort} · ${type.short}`,
      adSets: type.defaultAdSets(personas),
    };
  });
}

export function CampaignAccordionCard({
  campaign,
  creativesByPersona,
  expanded,
  onToggle,
}: {
  campaign: PlanCampaign;
  creativesByPersona: CreativesState;
  expanded: boolean;
  onToggle: () => void;
}) {
  const type = CAMPAIGN_TYPE_BY_ID[campaign.typeId];
  const weekly = campaign.adSets.reduce((s, a) => s + a.budgetDaily, 0) * 7;
  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{
        background: "#FFF",
        border: `1px solid ${expanded ? type.accent + "55" : "var(--border)"}`,
        transition: "border-color 120ms ease",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover-row"
      >
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: type.accent,
            color: "#FFF",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {type.short.slice(0, 2).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold truncate">{type.short}</span>
            <span className="pill" style={{ fontSize: 10 }}>
              {campaign.adSets.length} ad set{campaign.adSets.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary truncate">{type.tagline}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[12.5px] font-medium tabular-nums">
            ₹{(weekly / 1000).toFixed(0)}K/wk
          </div>
          <div className="text-[10px] text-text-tertiary">{type.bidStrategy.split(" · ")[0]}</div>
        </div>
        <ChevronDown
          size={14}
          className="text-text-tertiary flex-shrink-0"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        />
      </button>

      {expanded && (
        <div
          className="border-t border-border-subtle"
          style={{ background: "var(--bg-page)" }}
        >
          <div className="divide-y divide-border-subtle">
            {campaign.adSets.length === 0 ? (
              <div className="px-4 py-3 text-[12px] text-text-tertiary italic">
                No ad sets planned yet.
              </div>
            ) : (
              campaign.adSets.map((ad) => {
                const creatives = ad.personaId
                  ? creativesByPersona[ad.personaId] || []
                  : Object.values(creativesByPersona).flat().slice(0, 2);
                return (
                  <div key={ad.id} className="px-4 py-3">
                    <div
                      className="grid items-start gap-3"
                      style={{ gridTemplateColumns: "1fr 90px" }}
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-medium mb-0.5">{ad.name}</div>
                        <div className="text-[11px] text-text-secondary leading-[1.5] mb-1">
                          {ad.audience}
                        </div>
                        <div className="text-[10.5px] text-text-tertiary">
                          Optimize for: {ad.optimization}
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-[12.5px] font-medium">
                          ₹{(ad.budgetDaily / 1000).toFixed(0)}K
                        </div>
                        <div className="text-[10px] text-text-tertiary">/ day</div>
                      </div>
                    </div>
                    {creatives.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span
                          className="uplabel"
                          style={{ fontSize: 9, color: "var(--text-tertiary)" }}
                        >
                          Creatives:
                        </span>
                        {creatives.slice(0, 4).map((c) => {
                          const hue =
                            (c.personaId.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0) *
                              47) %
                            360;
                          return (
                            <div
                              key={c.id}
                              title={c.angleName}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                background: c.upload
                                  ? `url(${c.upload.url}) center/cover`
                                  : `repeating-linear-gradient(135deg, oklch(0.9 0.05 ${hue}) 0 3px, oklch(0.82 0.06 ${(hue + 30) % 360}) 3px 6px)`,
                                border: "1px solid var(--border-subtle)",
                                flexShrink: 0,
                              }}
                            />
                          );
                        })}
                        {creatives.length > 4 && (
                          <span className="text-[10px] text-text-tertiary">
                            +{creatives.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div
            className="px-4 py-2 text-[10.5px] text-text-tertiary leading-[1.5] border-t border-border-subtle"
            style={{ background: "#FFF" }}
          >
            <strong className="text-text-secondary font-semibold">{type.name}</strong> ·{" "}
            {type.when}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdSetsCard({
  projectShort,
  personas,
  creatives,
}: {
  projectShort: string;
  personas: PersonaInput[];
  creatives: CreativesState;
}) {
  const campaigns = useMemo(
    () =>
      deriveCampaigns(
        projectShort,
        personas.map((p) => ({ id: p.id, name: p.name })),
      ),
    [projectShort, personas],
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    campaigns[0] ? { [campaigns[0].id]: true } : {},
  );

  return (
    <div className="space-y-2">
      {campaigns.map((c) => (
        <CampaignAccordionCard
          key={c.id}
          campaign={c}
          creativesByPersona={creatives}
          expanded={!!expanded[c.id]}
          onToggle={() => setExpanded((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
        />
      ))}
    </div>
  );
}

// ─── Lead form ────────────────────────────────────────────────────────

export function LeadFormCard({
  state,
  onChange,
}: {
  state: LeadFormState;
  onChange: (next: LeadFormState) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:bg-surface-page"
        >
          {editing ? <Eye size={11} /> : <Settings size={11} />}
          {editing ? "Hide settings" : "Edit settings"}
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: editing ? "1fr 1fr" : "1fr" }}>
        {/* Preview */}
        <div
          className="card-base p-4 mx-auto w-full"
          style={{ background: "#FFF", maxWidth: editing ? undefined : 380 }}
        >
          <div className="text-[12px] uppercase tracking-wide text-text-tertiary mb-2">
            Lead form preview
          </div>
          <div className="text-[15px] font-semibold mb-1">Enquire about this project</div>
          <div className="text-[11.5px] text-text-tertiary mb-3">
            Share your details. A relationship manager will reach out within 24 hours.
          </div>
          <div className="space-y-2.5">
            {LEAD_FORM_FIELDS.filter((f) => state.enabled[f.k]).map((f) => (
              <div key={f.k}>
                <div className="text-[10.5px] text-text-secondary mb-1">{f.label}</div>
                {f.type === "select" ? (
                  <div
                    className="flex items-center justify-between px-2.5 py-2 rounded-[6px] text-[12px] text-text-tertiary"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
                  >
                    Select…
                    <ChevronDown size={12} />
                  </div>
                ) : (
                  <div
                    className="px-2.5 py-2 rounded-[6px] text-[12px] text-text-tertiary"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
                  >
                    {f.label}
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              disabled
              className="apply-btn w-full justify-center mt-2"
              style={{ height: 36, fontSize: 13 }}
            >
              Submit enquiry
            </button>
          </div>
          <div className="text-[10px] text-text-tertiary leading-[1.5] mt-3 pt-3 border-t border-border-subtle">
            {state.disclaimer}
          </div>
        </div>

        {/* Settings */}
        {editing && (
          <div className="space-y-3">
            <div className="card-base p-3.5">
              <div className="text-[12px] font-semibold mb-2">Fields to collect</div>
              <div className="text-[10.5px] text-text-tertiary mb-2">
                Fewer fields = more leads. More fields = higher qualification.
              </div>
              <div className="space-y-0.5">
                {LEAD_FORM_FIELDS.map((f) => (
                  <label
                    key={f.k}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-[5px] cursor-pointer hover-row"
                  >
                    <input
                      type="checkbox"
                      checked={!!state.enabled[f.k]}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          enabled: { ...state.enabled, [f.k]: e.target.checked },
                        })
                      }
                      className="w-3.5 h-3.5"
                    />
                    <div className="flex-1 text-[12px]">{f.label}</div>
                    <span className="pill" style={{ fontSize: 9.5 }}>
                      {f.type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="card-base p-3.5">
              <div className="text-[12px] font-semibold mb-2">Privacy & disclaimer</div>
              <textarea
                value={state.disclaimer}
                onChange={(e) => onChange({ ...state, disclaimer: e.target.value })}
                rows={5}
                className="w-full text-[11.5px] outline-none rounded px-2 py-1.5 mono leading-[1.5]"
                style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
