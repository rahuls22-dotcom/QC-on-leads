"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Plus,
  Sparkles,
  Trash2,
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
  /** True while the agent is still drafting this creative. Tile renders a
   * shimmer placeholder; controls disabled. */
  loading?: boolean;
};

export type CreativesState = Record<string, DraftedCreative[]>;

export type LeadFormField = {
  k: string;
  label: string;
  type: "text" | "email" | "tel" | "select";
  /** True when this is a stock prefill field (Meta auto-fills name/email/phone). */
  prefill?: boolean;
  /** For select-type fields. */
  options?: string[];
};

/** Stock fields that come pre-populated by Meta from the user's profile. */
export const STOCK_LEAD_FIELDS: LeadFormField[] = [
  { k: "name", label: "Full name", type: "text", prefill: true },
  { k: "email", label: "Email", type: "email", prefill: true },
  { k: "phone", label: "Phone number", type: "tel", prefill: true },
];

/** A starter pool of custom questions a builder might add. */
export const CUSTOM_QUESTION_TEMPLATES: LeadFormField[] = [
  {
    k: "budget",
    label: "What's your budget range?",
    type: "select",
    options: ["Under ₹1 Cr", "₹1 – 2 Cr", "₹2 – 4 Cr", "₹4 Cr+"],
  },
  {
    k: "timeline",
    label: "When are you planning to buy?",
    type: "select",
    options: ["This month", "1–3 months", "3–6 months", "6+ months"],
  },
  {
    k: "units",
    label: "Preferred unit type?",
    type: "select",
    options: ["2 BHK", "3 BHK", "4 BHK"],
  },
  { k: "purpose", label: "Self-use or investment?", type: "select", options: ["Self-use", "Investment"] },
  { k: "city", label: "Which city do you currently live in?", type: "text" },
];

/** Kept for back-compat with old callsites; new flows should use STOCK + custom. */
export const LEAD_FORM_FIELDS: LeadFormField[] = [
  ...STOCK_LEAD_FIELDS,
  ...CUSTOM_QUESTION_TEMPLATES,
];

export const DEFAULT_DISCLAIMER =
  "PRM/MH/RERA/... · This is a RERA-registered project. By submitting, you agree to be contacted by Godrej Properties about this project. We do not share your details with third parties.";

export type LeadFormState = {
  /** Prefill fields (name/email/phone). Keyed by the stock field key. */
  enabled: Record<string, boolean>;
  /** Custom questions the builder added after the prefill block. */
  customQuestions: LeadFormField[];

  /** Intro page — banner image + headline + supporting body. */
  bannerUrl?: string;
  introHeadline: string;
  introBody: string;

  /** Privacy step. */
  disclaimer: string;

  /** Completion screen. */
  completionHeadline: string;
  completionBody: string;
  completionCtaLabel: string;
};

export const DEFAULT_LEAD_FORM_STATE: LeadFormState = {
  enabled: { name: true, email: true, phone: true },
  customQuestions: [CUSTOM_QUESTION_TEMPLATES[0], CUSTOM_QUESTION_TEMPLATES[1]],
  bannerUrl: undefined,
  introHeadline: "Enquire about this project",
  introBody:
    "Share your details and a relationship manager will reach out within 24 hours with floor plans, pricing, and a site-visit invite.",
  disclaimer: DEFAULT_DISCLAIMER,
  completionHeadline: "Thanks — we'll be in touch",
  completionBody:
    "A relationship manager will call you within 24 hours. Meanwhile, take a look at the project website.",
  completionCtaLabel: "Visit website",
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

  const isLoading = !!creative.loading;

  return (
    <div
      className="card-base p-2 flex flex-col gap-2"
      style={{
        borderColor: isLoading ? "#C8A8FF" : "var(--border-subtle)",
        opacity: isLoading ? 0.92 : 1,
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 6,
          background: creative.upload
            ? undefined
            : isLoading
            ? "linear-gradient(135deg, #F4ECFF 0%, #FDF2FF 100%)"
            : `repeating-linear-gradient(135deg, oklch(0.9 0.05 ${hue}) 0 6px, oklch(0.82 0.06 ${(hue + 30) % 360}) 6px 12px)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Shimmer sweep while generating */}
        {isLoading && (
          <>
            <span
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
                animation: "tile-shimmer 1.4s ease-in-out infinite",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "2px solid #C026D3",
                borderTopColor: "transparent",
                animation: "tile-spin 0.9s linear infinite",
              }}
            />
            <style jsx>{`
              @keyframes tile-shimmer {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
              @keyframes tile-spin {
                from {
                  transform: translate(-50%, -50%) rotate(0deg);
                }
                to {
                  transform: translate(-50%, -50%) rotate(360deg);
                }
              }
            `}</style>
          </>
        )}
        {!isLoading && creative.upload?.kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creative.upload.url}
            alt="uploaded creative"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {!isLoading && creative.upload?.kind === "video" && (
          <video
            src={creative.upload.url}
            muted
            loop
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {!isLoading && creative.upload && (
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
        <div
          className="text-[11px] font-medium truncate"
          style={{ color: isLoading ? "var(--text-tertiary)" : undefined }}
        >
          {isLoading ? "Drafting…" : creative.angleName}
        </div>
        <div className="text-[10px] text-text-tertiary truncate">
          {isLoading ? creative.angleName : creative.format}
        </div>
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
      ) : isLoading ? (
        <div className="h-6" />
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

// ─── Lead form (multi-step Meta-style) ────────────────────────────────

type LeadFormStep = "intro" | "questions" | "privacy" | "completion";

const LEAD_FORM_STEPS: { key: LeadFormStep; label: string; sub: string }[] = [
  { key: "intro", label: "Intro", sub: "Banner + headline" },
  { key: "questions", label: "Questions", sub: "Fields you collect" },
  { key: "privacy", label: "Privacy", sub: "Disclaimer & consent" },
  { key: "completion", label: "Completion", sub: "Thank-you screen" },
];

export function LeadFormCard({
  state,
  onChange,
}: {
  state: LeadFormState;
  onChange: (next: LeadFormState) => void;
}) {
  const [activeStep, setActiveStep] = useState<LeadFormStep>("intro");

  return (
    <div className="space-y-3">
      {/* Step navigation — drives both editor and preview */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {LEAD_FORM_STEPS.map((s, i) => {
          const active = activeStep === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveStep(s.key)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button text-[11.5px]"
              style={{
                background: active ? "#1A1A1A" : "#FFF",
                color: active ? "#FFF" : "var(--text-2)",
                border: `1px solid ${active ? "#1A1A1A" : "var(--border)"}`,
                fontWeight: active ? 600 : 500,
              }}
            >
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: active ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
                  fontSize: 9.5,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1.1fr 0.9fr" }}>
        {/* Editor for the active step */}
        <div className="space-y-3">
          {activeStep === "intro" && <IntroEditor state={state} onChange={onChange} />}
          {activeStep === "questions" && <QuestionsEditor state={state} onChange={onChange} />}
          {activeStep === "privacy" && <PrivacyEditor state={state} onChange={onChange} />}
          {activeStep === "completion" && (
            <CompletionEditor state={state} onChange={onChange} />
          )}
        </div>

        {/* Meta-style phone preview */}
        <MetaFormPreview state={state} activeStep={activeStep} onStepChange={setActiveStep} />
      </div>
    </div>
  );
}

// ─── Editors ──────────────────────────────────────────────────────────

function IntroEditor({
  state,
  onChange,
}: {
  state: LeadFormState;
  onChange: (next: LeadFormState) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const url = URL.createObjectURL(f);
      onChange({ ...state, bannerUrl: url });
    }
    e.target.value = "";
  };
  return (
    <div className="card-base p-3.5">
      <div className="text-[12px] font-semibold mb-1">Banner image</div>
      <div className="text-[10.5px] text-text-tertiary mb-2.5 leading-[1.5]">
        1200 × 628 recommended. Shows above your headline when the user opens the form.
      </div>
      {state.bannerUrl ? (
        <div
          className="rounded-[8px] overflow-hidden mb-2 relative"
          style={{ aspectRatio: "1200 / 628", background: "#000" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.bannerUrl}
            alt="Banner"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <button
            type="button"
            onClick={() => onChange({ ...state, bannerUrl: undefined })}
            className="inline-flex items-center gap-1 absolute top-2 right-2 h-6 px-2 rounded-button text-[10.5px]"
            style={{ background: "rgba(0,0,0,0.65)", color: "#FFF" }}
          >
            <Trash2 size={10} /> Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-[8px] border-2 border-dashed border-border bg-white hover:border-border-hover flex flex-col items-center justify-center gap-1.5 mb-2"
          style={{ aspectRatio: "1200 / 628" }}
        >
          <UploadIcon size={20} className="text-text-tertiary" />
          <span className="text-[12px] font-medium">Upload banner</span>
          <span className="text-[10px] text-text-tertiary">PNG or JPG</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onUpload}
        style={{ display: "none" }}
      />

      <div className="mt-3">
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Headline
        </div>
        <input
          type="text"
          value={state.introHeadline}
          onChange={(e) => onChange({ ...state, introHeadline: e.target.value })}
          className="w-full text-[13px] outline-none rounded px-2 py-1.5"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      </div>
      <div className="mt-3">
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Supporting copy
        </div>
        <textarea
          rows={3}
          value={state.introBody}
          onChange={(e) => onChange({ ...state, introBody: e.target.value })}
          className="w-full text-[12.5px] outline-none rounded px-2 py-1.5 leading-[1.45] resize-y"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      </div>
    </div>
  );
}

function QuestionsEditor({
  state,
  onChange,
}: {
  state: LeadFormState;
  onChange: (next: LeadFormState) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const usedKeys = new Set(state.customQuestions.map((q) => q.k));
  const templatePool = CUSTOM_QUESTION_TEMPLATES.filter((t) => !usedKeys.has(t.k));

  return (
    <div className="card-base p-3.5">
      <div className="text-[12px] font-semibold mb-1">Contact prefill</div>
      <div className="text-[10.5px] text-text-tertiary mb-2 leading-[1.5]">
        Meta auto-fills these from the user&apos;s profile — fewer taps, higher submit rate.
      </div>
      <div className="space-y-0.5 mb-4">
        {STOCK_LEAD_FIELDS.map((f) => (
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
              prefill · {f.type}
            </span>
          </label>
        ))}
      </div>

      <div className="text-[12px] font-semibold mb-1">Custom questions</div>
      <div className="text-[10.5px] text-text-tertiary mb-2 leading-[1.5]">
        Each extra question costs ~3% in submission rate but helps Spot qualify the lead.
      </div>
      <div className="space-y-1.5 mb-2">
        {state.customQuestions.length === 0 && (
          <div className="text-[11px] text-text-tertiary italic px-2 py-2">
            No custom questions yet. Add one to qualify leads — budget, timeline, unit type.
          </div>
        )}
        {state.customQuestions.map((q, i) => (
          <div
            key={q.k}
            className="flex items-center gap-2 px-2.5 py-2 rounded-[6px]"
            style={{ background: "#FFFDF6", border: "1px solid #E8C97A" }}
          >
            <input
              type="text"
              value={q.label}
              onChange={(e) => {
                const next = [...state.customQuestions];
                next[i] = { ...q, label: e.target.value };
                onChange({ ...state, customQuestions: next });
              }}
              className="flex-1 text-[12px] outline-none bg-transparent"
            />
            <span className="pill" style={{ fontSize: 9.5 }}>
              {q.type}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...state,
                  customQuestions: state.customQuestions.filter((_, j) => j !== i),
                })
              }
              className="inline-flex items-center justify-center h-6 w-6 rounded-button text-text-tertiary hover:text-text-secondary"
              title="Remove question"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
      {addOpen ? (
        <div
          className="rounded-[8px] p-2 mt-1"
          style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}
        >
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5 px-1">
            Pick a question
          </div>
          {templatePool.length === 0 ? (
            <div className="text-[11px] text-text-tertiary italic px-2 py-2">
              You&apos;ve added every stock question. Custom builder coming soon.
            </div>
          ) : (
            <div className="space-y-0.5">
              {templatePool.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => {
                    onChange({
                      ...state,
                      customQuestions: [...state.customQuestions, t],
                    });
                    setAddOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-left hover-row"
                >
                  <div className="flex-1 text-[12px]">{t.label}</div>
                  <span className="pill" style={{ fontSize: 9.5 }}>
                    {t.type}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-1.5">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="text-[10.5px] text-text-tertiary px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-button border border-dashed border-border bg-white text-[12px] text-text-secondary hover:border-border-hover hover:bg-surface-page"
        >
          <Plus size={12} /> Add a question
        </button>
      )}
    </div>
  );
}

function PrivacyEditor({
  state,
  onChange,
}: {
  state: LeadFormState;
  onChange: (next: LeadFormState) => void;
}) {
  return (
    <div className="card-base p-3.5">
      <div className="text-[12px] font-semibold mb-1">Privacy disclaimer</div>
      <div className="text-[10.5px] text-text-tertiary mb-2 leading-[1.5]">
        Required by Meta. Include your RERA number and a one-line consent statement.
      </div>
      <textarea
        rows={7}
        value={state.disclaimer}
        onChange={(e) => onChange({ ...state, disclaimer: e.target.value })}
        className="w-full text-[11.5px] outline-none rounded px-2 py-1.5 mono leading-[1.5]"
        style={{ border: "1px solid var(--border)", background: "var(--bg-page)" }}
      />
    </div>
  );
}

function CompletionEditor({
  state,
  onChange,
}: {
  state: LeadFormState;
  onChange: (next: LeadFormState) => void;
}) {
  return (
    <div className="card-base p-3.5">
      <div className="text-[12px] font-semibold mb-1">Thank-you screen</div>
      <div className="text-[10.5px] text-text-tertiary mb-2 leading-[1.5]">
        Shown after the user submits. Set expectations for follow-up timing.
      </div>
      <div className="mb-3">
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Headline
        </div>
        <input
          type="text"
          value={state.completionHeadline}
          onChange={(e) => onChange({ ...state, completionHeadline: e.target.value })}
          className="w-full text-[13px] outline-none rounded px-2 py-1.5"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      </div>
      <div className="mb-3">
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          Body
        </div>
        <textarea
          rows={3}
          value={state.completionBody}
          onChange={(e) => onChange({ ...state, completionBody: e.target.value })}
          className="w-full text-[12.5px] outline-none rounded px-2 py-1.5 leading-[1.45] resize-y"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      </div>
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
          CTA label
        </div>
        <input
          type="text"
          value={state.completionCtaLabel}
          onChange={(e) => onChange({ ...state, completionCtaLabel: e.target.value })}
          className="w-full text-[13px] outline-none rounded px-2 py-1.5"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      </div>
    </div>
  );
}

// ─── Meta-style phone preview ─────────────────────────────────────────

function MetaFormPreview({
  state,
  activeStep,
  onStepChange,
}: {
  state: LeadFormState;
  activeStep: LeadFormStep;
  onStepChange: (s: LeadFormStep) => void;
}) {
  const stepIdx = LEAD_FORM_STEPS.findIndex((s) => s.key === activeStep);
  const enabledStock = STOCK_LEAD_FIELDS.filter((f) => state.enabled[f.k]);
  const allQuestions: LeadFormField[] = [
    ...enabledStock,
    ...state.customQuestions,
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold mb-2">
        Preview — Meta lead form
      </div>
      <div
        className="relative"
        style={{
          width: 300,
          height: 600,
          background: "#1F2937",
          borderRadius: 36,
          padding: 8,
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.12), inset 0 0 0 2px #111827",
        }}
      >
        {/* Phone screen */}
        <div
          className="relative overflow-hidden flex flex-col"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 28,
            background: "#FFF",
          }}
        >
          {/* Status bar */}
          <div
            className="flex items-center justify-between flex-shrink-0 text-text-secondary"
            style={{ height: 24, padding: "4px 14px", fontSize: 9, fontWeight: 600 }}
          >
            <span className="tabular-nums">9:41</span>
            <span
              style={{
                width: 38,
                height: 14,
                borderRadius: 7,
                background: "#1F2937",
              }}
            />
            <span className="tabular-nums">100%</span>
          </div>
          {/* Meta page header */}
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <div
              className="inline-flex items-center justify-center flex-shrink-0"
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                color: "#FFF",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              G
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-semibold leading-tight truncate">
                Godrej Properties
              </div>
              <div className="text-[8.5px] text-text-tertiary leading-tight">
                Sponsored · Lead form
              </div>
            </div>
          </div>

          {/* Step indicator (Meta's dot row) */}
          <div className="flex items-center justify-center gap-1.5 py-2 flex-shrink-0">
            {LEAD_FORM_STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onStepChange(s.key)}
                title={s.label}
                style={{
                  width: i === stepIdx ? 18 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i <= stepIdx ? "#1A1A1A" : "#E5E7EB",
                  transition: "all 160ms",
                }}
              />
            ))}
          </div>

          {/* Page body */}
          <div
            className="flex-1 overflow-y-auto scroll"
            style={{ minHeight: 0 }}
          >
            {activeStep === "intro" && (
              <div>
                {state.bannerUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={state.bannerUrl}
                    alt="banner"
                    style={{
                      width: "100%",
                      aspectRatio: "1200 / 628",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center text-text-tertiary text-[10px]"
                    style={{
                      width: "100%",
                      aspectRatio: "1200 / 628",
                      background:
                        "repeating-linear-gradient(135deg, #F4F4F5 0 8px, #E5E7EB 8px 16px)",
                    }}
                  >
                    Banner placeholder
                  </div>
                )}
                <div className="px-4 pt-3 pb-2">
                  <div className="text-[14px] font-bold leading-tight mb-1.5">
                    {state.introHeadline || "Enquire about this project"}
                  </div>
                  <div className="text-[10.5px] text-text-secondary leading-[1.5]">
                    {state.introBody}
                  </div>
                </div>
              </div>
            )}

            {activeStep === "questions" && (
              <div className="px-4 py-3">
                <div className="text-[12.5px] font-semibold mb-2">Your details</div>
                {allQuestions.length === 0 ? (
                  <div className="text-[10.5px] text-text-tertiary italic">
                    No questions enabled. Add some in the Questions step.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allQuestions.map((q) => (
                      <div key={q.k}>
                        <div className="text-[9.5px] text-text-secondary mb-0.5">{q.label}</div>
                        {q.type === "select" ? (
                          <div
                            className="flex items-center justify-between px-2 py-1.5 rounded-[5px] text-[10.5px] text-text-tertiary"
                            style={{
                              border: "1px solid #D4D4D8",
                              background: q.prefill ? "#F4F4F5" : "#FFF",
                            }}
                          >
                            Select…
                            <ChevronDown size={10} />
                          </div>
                        ) : (
                          <div
                            className="px-2 py-1.5 rounded-[5px] text-[10.5px] text-text-tertiary"
                            style={{
                              border: "1px solid #D4D4D8",
                              background: q.prefill ? "#F4F4F5" : "#FFF",
                            }}
                          >
                            {q.prefill ? "Pre-filled by Meta" : q.label}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeStep === "privacy" && (
              <div className="px-4 py-3">
                <div className="text-[12.5px] font-semibold mb-2">Privacy policy</div>
                <div
                  className="text-[10px] text-text-secondary leading-[1.5] whitespace-pre-wrap"
                  style={{ fontFamily: "ui-monospace, monospace" }}
                >
                  {state.disclaimer}
                </div>
                <label className="flex items-start gap-2 mt-3 cursor-default">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      border: "1px solid #9CA3AF",
                      background: "#FFF",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <span className="text-[9.5px] text-text-secondary leading-[1.45]">
                    I agree to be contacted by Godrej Properties about this project.
                  </span>
                </label>
              </div>
            )}

            {activeStep === "completion" && (
              <div className="px-4 py-6 text-center flex flex-col items-center justify-center h-full">
                <div
                  className="inline-flex items-center justify-center mb-3"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    background: "#15803D",
                    color: "#FFF",
                  }}
                >
                  <Check size={22} strokeWidth={3} />
                </div>
                <div className="text-[13px] font-bold leading-tight mb-1.5">
                  {state.completionHeadline}
                </div>
                <div className="text-[10.5px] text-text-secondary leading-[1.5]">
                  {state.completionBody}
                </div>
              </div>
            )}
          </div>

          {/* Sticky CTA */}
          <div
            className="flex-shrink-0 px-3 py-3"
            style={{ borderTop: "1px solid #E5E7EB", background: "#FFF" }}
          >
            <button
              type="button"
              disabled
              className="w-full inline-flex items-center justify-center rounded-[8px] text-[12px] font-semibold"
              style={{
                height: 36,
                background:
                  activeStep === "completion"
                    ? "#1A1A1A"
                    : "#1877F2",
                color: "#FFF",
                opacity: 0.95,
              }}
            >
              {activeStep === "intro" && "Continue"}
              {activeStep === "questions" && "Submit"}
              {activeStep === "privacy" && "I agree, continue"}
              {activeStep === "completion" && state.completionCtaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
