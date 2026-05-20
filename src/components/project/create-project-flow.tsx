"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  Sparkles,
  FileText,
  Upload,
  Edit3,
  ArrowRight,
  Trash2,
  Plus,
  Globe,
  Image as ImageIcon,
  BookOpen,
  Users,
  Target,
} from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { useCurrentScope, useCurrentWorkspaceLabel } from "@/lib/workspace-store";
import { addRuntimeProject } from "@/lib/project-data";
import { buildProjectFromDraft } from "@/lib/build-project";
import { PersonaAvatar } from "@/components/project/deploy-steps";

type Stage = "intent" | "brief" | "goal" | "personas" | "images" | "ready";

type ProjectImage = { id: string; url: string; name: string; kind: "image" | "video" };

const STAGES: { key: Stage; label: string }[] = [
  { key: "intent", label: "Intent" },
  { key: "brief", label: "Brief" },
  { key: "goal", label: "Goal" },
  { key: "personas", label: "Personas" },
  { key: "images", label: "Images" },
  { key: "ready", label: "Ready" },
];

type PersonaDraft = {
  id: string;
  name: string;
  age: string;
  role: string;
  want: string;
  painPoint: string;
  solution: string;
  hhi: string;
  geo: string;
  share: number;
};

type Draft = {
  source: "pdf" | "url" | "manual" | "deep-research";
  sourceLabel: string;
  name: string;
  rera: string;
  micromarket: string;
  typology: string;
  priceBand: string;
  pricePerSqft: string;
  possession: string;
  keyUSPs: string[];
  locationProximity: string[];
  keyBenefits: string[];
  goalKind: "leads" | "verified" | "qualified";
  goalTarget: string;
  goalWindow: string;
  budgetTotal: string;
  personas: PersonaDraft[];
};

const SEED_PERSONAS: PersonaDraft[] = [
  {
    id: "ps1",
    name: "The Senior Tech Lead",
    age: "34",
    role: "Director at FAANG-tier IT services",
    want:
      "A larger, branded apartment in the same Pune East catchment without a longer commute to Hinjewadi.",
    painPoint:
      "Currently in a 2.5 BHK that's outgrown the family; doesn't want to move further from work or compromise on amenities.",
    solution:
      "Spacious 3 BHK with branded interiors, dedicated WFH room, and 14-min drive to Hinjewadi tech park.",
    hhi: "₹55L+",
    geo: "Pune East (Kharadi / Magarpatta)",
    share: 38,
  },
  {
    id: "ps2",
    name: "The Pune Returnee",
    age: "39",
    role: "Senior IC returning from BLR/Mumbai",
    want:
      "A primary home in their hometown after years in another metro, ideally close to extended family.",
    painPoint:
      "Hard to evaluate options remotely; needs trust signals like RERA, builder reputation, and verifiable timelines.",
    solution:
      "RERA-cleared, Godrej-built, with a documented 8-week site-visit-anytime policy and live construction updates.",
    hhi: "₹75L+",
    geo: "BLR / Mumbai / Hyderabad (origin Pune)",
    share: 28,
  },
  {
    id: "ps3",
    name: "The NRI Investor",
    age: "43",
    role: "US/UK-based, looking at 2nd home in India",
    want:
      "A primary-quality asset that rents at premium today and becomes a return home in 6-10 years.",
    painPoint:
      "Construction risk feels remote; property management cost and yield calculation aren't visible upfront.",
    solution:
      "RERA-verified milestones + managed-rental partner integration, with a yield calculator on the listing page.",
    hhi: "$220K+",
    geo: "Bay Area / NJ / London",
    share: 22,
  },
];

const SEED: Draft = {
  source: "pdf",
  sourceLabel: "Sky Gardens — Brand Book v2.pdf",
  name: "Godrej Sky Gardens · Pune",
  rera: "PRM/MH/RERA/...",
  micromarket: "Kharadi · Pune East",
  typology: "3 BHK Apartments",
  priceBand: "₹1.6 – 2.4 Cr",
  pricePerSqft: "₹14,200 / sqft",
  possession: "Mar 2028",
  keyUSPs: [
    "Branded Italian-marble interiors as standard",
    "Sky-clubhouse on the 28th floor with infinity pool",
    "Lowest density in Kharadi — 4 units per floor",
    "Smart-home automation pre-installed",
  ],
  locationProximity: [
    "14 min to Hinjewadi IT Park",
    "8 min to EON Free Zone",
    "10 min to Phoenix Marketcity",
    "12 min to Magarpatta City",
  ],
  keyBenefits: [
    "Branded developer with 125+ year heritage",
    "RERA-cleared with documented possession timelines",
    "Managed-rental partner available for investors",
    "Site visits 7 days a week, 8am–8pm",
  ],
  goalKind: "verified",
  goalTarget: "240",
  goalWindow: "180 days",
  budgetTotal: "1500000",
  personas: SEED_PERSONAS,
};

// ─── Atoms ────────────────────────────────────────────────────────────

function ImageUploadPanel({
  images,
  onChange,
}: {
  images: ProjectImage[];
  onChange: (next: ProjectImage[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const additions: ProjectImage[] = [];
    Array.from(files).forEach((f) => {
      const url = URL.createObjectURL(f);
      const kind: "image" | "video" = f.type.startsWith("video") ? "video" : "image";
      additions.push({ id: `img-${Date.now()}-${f.name}`, url, name: f.name, kind });
    });
    onChange([...images, ...additions]);
  };

  return (
    <div>
      <div
        className="grid gap-3 mb-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
      >
        {images.map((img) => (
          <div
            key={img.id}
            className="card-base p-2 flex flex-col gap-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 6,
                overflow: "hidden",
                background: "#000",
              }}
            >
              {img.kind === "image" ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={img.url}
                  alt={img.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <video
                  src={img.url}
                  muted
                  loop
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] truncate flex-1">{img.name}</span>
              <button
                type="button"
                onClick={() => onChange(images.filter((x) => x.id !== img.id))}
                className="inline-flex items-center justify-center h-6 w-6 rounded-button text-text-tertiary hover:bg-surface-page"
                title="Remove"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex flex-col items-center justify-center gap-1.5 rounded-[8px] border-2 border-dashed border-border bg-white text-text-secondary hover:border-border-hover hover:bg-surface-page"
          style={{ aspectRatio: "1 / 1.15", minHeight: 140 }}
        >
          <Upload size={18} />
          <span className="text-[11.5px] font-medium">Add image / video</span>
          <span className="text-[10px] text-text-tertiary">drag or click</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>
      <div className="text-[11px] text-text-tertiary leading-[1.5]">
        <ImageIcon size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
        Exteriors, interiors, amenities, site-visit clips — anything I can use in creatives. You
        can always add more later from the project page.
      </div>
    </div>
  );
}

function SpotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 mb-3 fadeUp">
      <SpotMark size={20} style={{ flexShrink: 0, marginTop: 2 }} />
      <div
        className="flex-1 min-w-0 p-3"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
          borderRadius: 10,
        }}
      >
        <div className="text-[13.5px] leading-[1.55]">{children}</div>
      </div>
    </div>
  );
}

function DraftCard({
  children,
  label = "Spot's draft",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div
      className="rounded-[10px] p-4 mb-3 fadeUp"
      style={{ background: "#FFFDF6", border: "1px solid #E8C97A" }}
    >
      <div className="uplabel mb-3 flex items-center gap-1.5" style={{ fontSize: 10 }}>
        <Sparkles size={11} style={{ color: "#9C6D00" }} />
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  long,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  long?: boolean;
  rows?: number;
}) {
  return (
    <div className="mb-3">
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1">
        {label}
      </div>
      {long ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows || 2}
          className="w-full text-[13px] outline-none rounded px-2 py-1.5"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[13px] outline-none rounded px-2 py-1.5"
          style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
        />
      )}
    </div>
  );
}

function DerivedCostCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-[8px] p-2.5"
      style={{
        border: highlight ? "1px solid #1A1A1A" : "1px solid var(--border)",
        background: highlight ? "#FAF7FF" : "#FFF",
      }}
    >
      <div className="text-[9.5px] uppercase tracking-[0.4px] text-text-tertiary font-semibold mb-1">
        {label}
      </div>
      <div className="text-[16px] font-semibold tabular-nums leading-tight">{value}</div>
      <div className="text-[10.5px] text-text-tertiary mt-0.5 tabular-nums">{sub}</div>
    </div>
  );
}

function ListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-2.5">
      <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1">
        {label}
      </div>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
      >
        {values.map((v, i) => (
          <div key={i} className="group relative">
            <input
              type="text"
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="w-full text-[12px] outline-none rounded pl-2 pr-6 py-1 leading-tight"
              style={{ border: "1px solid #C9A86A", background: "#FFFEF8", height: 26 }}
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 w-5 rounded text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-white"
              title="Remove"
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="inline-flex items-center justify-center gap-1 rounded text-[11px] text-text-tertiary hover:text-text-secondary border border-dashed border-border bg-white/40 hover:bg-white"
          style={{ height: 26 }}
        >
          <Plus size={10} /> Add {placeholder || "item"}
        </button>
      </div>
    </div>
  );
}

// ─── Persona card (with Want / Pain / Solution) ─────────────────────

function PersonaCardLive({
  p,
  onRemove,
  onEditField,
}: {
  p: PersonaDraft;
  onRemove: () => void;
  onEditField: (key: keyof PersonaDraft, value: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const FieldChip = ({
    label,
    tone,
    fieldKey,
  }: {
    label: string;
    tone: "neutral" | "warn" | "ok";
    fieldKey: "want" | "painPoint" | "solution";
  }) => {
    const dot = tone === "warn" ? "#DC2626" : tone === "ok" ? "#15803D" : "#9B9B9B";
    const editing = editingId === fieldKey;
    return (
      <div className="px-3 py-2.5 border-r last:border-r-0 border-border-subtle min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
          <span className="uplabel" style={{ fontSize: 9.5 }}>
            {label}
          </span>
        </div>
        {editing ? (
          <textarea
            autoFocus
            value={p[fieldKey] as string}
            onBlur={() => setEditingId(null)}
            onChange={(e) => onEditField(fieldKey, e.target.value)}
            rows={3}
            className="w-full text-[12px] outline-none rounded px-1.5 py-1 resize-none"
            style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingId(fieldKey)}
            className="text-[12px] leading-[1.4] text-left w-full hover:bg-[#FFF7E0] rounded px-1 py-0.5 -mx-1"
            title="Click to edit"
          >
            {p[fieldKey] as string}
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className="card-base bg-white overflow-hidden fadeUp"
      style={{ borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border-subtle">
        <PersonaAvatar id={p.id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14.5px] font-semibold leading-tight">{p.name}</span>
            <span className="text-[12px] text-text-secondary">, {p.age}</span>
            <span className="pill" style={{ fontSize: 10 }}>
              {p.share}% mix
            </span>
          </div>
          <div className="text-[11.5px] text-text-tertiary mt-0.5">{p.role}</div>
          <div className="text-[10.5px] text-text-tertiary mt-0.5">
            {p.hhi} · {p.geo}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center justify-center h-7 w-7 rounded-button border border-border bg-white text-text-tertiary hover:text-text-secondary hover:bg-surface-page flex-shrink-0"
          title="Remove persona"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Want / Pain / Solution triplet */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <FieldChip label="Want" tone="neutral" fieldKey="want" />
        <FieldChip label="Pain point" tone="warn" fieldKey="painPoint" />
        <FieldChip label="Solution we offer" tone="ok" fieldKey="solution" />
      </div>
    </div>
  );
}

function PersonaSkeleton() {
  return (
    <div className="card-base bg-white overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 border-b border-border-subtle">
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 9 }} />
        <div className="flex-1">
          <div className="skeleton" style={{ height: 14, width: "55%", marginBottom: 6 }} />
          <div className="skeleton" style={{ height: 11, width: "75%" }} />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-3 py-2.5 border-r last:border-r-0 border-border-subtle">
            <div className="skeleton" style={{ height: 9, width: 50, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 10, width: "100%", marginBottom: 4 }} />
            <div className="skeleton" style={{ height: 10, width: "85%", marginBottom: 4 }} />
            <div className="skeleton" style={{ height: 10, width: "60%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Persona prompt presets — used to "draft" a new persona from free-text.
// In a real app this would hit an LLM; for the prototype we keep a small
// rotating pool of plausible fills.
const PROMPT_PERSONA_POOL: Omit<PersonaDraft, "id">[] = [
  {
    name: "The NRI Investor",
    age: "44",
    role: "Bay Area tech lead, second home in India",
    want:
      "A high-quality apartment that earns rental yield today and becomes a home base when family visits.",
    painPoint:
      "Trust gap on remote purchases — construction risk, rental management, repatriation rules.",
    solution:
      "RERA-cleared with milestones · managed-rental partner · yield calculator on the listing page.",
    hhi: "$220K+",
    geo: "Bay Area / NJ / London",
    share: 18,
  },
  {
    name: "The Returning Founder",
    age: "39",
    role: "Sold a company · settling back in India",
    want:
      "A primary residence that signals 'arrived' without going overboard — branded, low-density, close to schools.",
    painPoint:
      "Doesn't want SoBo prices. Wants the right address with brand assurance and no construction surprises.",
    solution:
      "Branded interiors, 12-min metro access, low-density towers, name-recognised builder.",
    hhi: "₹3Cr+ post-exit",
    geo: "Bengaluru East / Pune West",
    share: 12,
  },
  {
    name: "The Senior Banker",
    age: "46",
    role: "MD / VP at an investment bank",
    want:
      "A smaller, branded apartment with great amenities — kids are leaving for college, downsizing makes sense.",
    painPoint:
      "Has the budget; wants prestige + zero maintenance hassle. Sceptical of generic 'luxury' branding.",
    solution:
      "Lowest density per tower · 1:1 servicing · branded everything · concierge included.",
    hhi: "₹2.5Cr+",
    geo: "South Mumbai / Lower Parel",
    share: 14,
  },
];

// Tries to infer a fill from the user's prompt, otherwise picks from the pool.
function draftPersonaFromPrompt(prompt: string, existing: PersonaDraft[]): PersonaDraft {
  // Light-touch keyword matching to make the prototype feel responsive
  const lower = prompt.toLowerCase();
  let template = PROMPT_PERSONA_POOL[Math.floor(Math.random() * PROMPT_PERSONA_POOL.length)];
  if (/(nri|abroad|us|uk|second home|repatriation|yield)/.test(lower)) {
    template = PROMPT_PERSONA_POOL[0];
  } else if (/(founder|exited|startup|sold)/.test(lower)) {
    template = PROMPT_PERSONA_POOL[1];
  } else if (/(banker|finance|wealth|md|director|vp)/.test(lower)) {
    template = PROMPT_PERSONA_POOL[2];
  }
  // Avoid duplicating an already-existing persona name
  let name = template.name;
  let suffix = 2;
  while (existing.some((p) => p.name === name)) {
    name = `${template.name} #${suffix++}`;
  }
  return {
    ...template,
    name,
    id: `ps-prompted-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

const PERSONA_REVEAL_FIELDS: Array<keyof PersonaDraft> = [
  "name",
  "age",
  "role",
  "want",
  "painPoint",
  "solution",
  "hhi",
  "geo",
];

// Progressive persona reveal — Spot "discovers" personas one by one,
// each appearing with a skeleton → real card transition.
function ProgressivePersonas({
  personas,
  onChange,
}: {
  personas: PersonaDraft[];
  onChange: (next: PersonaDraft[]) => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const [loadingNext, setLoadingNext] = useState(true);

  // Composer / streaming state for the "Add another persona" flow
  const [composerOpen, setComposerOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  // While streaming, we hold the target draft + a count of fields revealed so far.
  const [streaming, setStreaming] = useState<{
    target: PersonaDraft;
    revealedFields: number;
  } | null>(null);

  useEffect(() => {
    if (revealed >= personas.length) {
      setLoadingNext(false);
      return;
    }
    setLoadingNext(true);
    const t = setTimeout(() => {
      setRevealed((r) => r + 1);
    }, revealed === 0 ? 600 : 1100);
    return () => clearTimeout(t);
  }, [revealed, personas.length]);

  // Stream fields into the in-progress persona one at a time, then commit
  // to the personas array.
  useEffect(() => {
    if (!streaming) return;
    if (streaming.revealedFields >= PERSONA_REVEAL_FIELDS.length) {
      // Commit
      onChange([...personas, streaming.target]);
      setRevealed((r) => r + 1);
      setStreaming(null);
      return;
    }
    const t = setTimeout(() => {
      setStreaming((s) =>
        s ? { ...s, revealedFields: s.revealedFields + 1 } : s,
      );
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  const allRevealed = revealed >= personas.length && !loadingNext && !streaming;

  const handleDraft = () => {
    if (!promptText.trim()) return;
    const target = draftPersonaFromPrompt(promptText, personas);
    setStreaming({ target, revealedFields: 0 });
    setPromptText("");
    setComposerOpen(false);
  };

  return (
    <div className="space-y-3">
      {personas.slice(0, revealed).map((p, i) => (
        <PersonaCardLive
          key={p.id}
          p={p}
          onRemove={() => {
            const next = personas.filter((_, j) => j !== i);
            onChange(next);
            setRevealed((r) => Math.min(r, next.length));
          }}
          onEditField={(key, value) => {
            const next = [...personas];
            next[i] = { ...p, [key]: value } as PersonaDraft;
            onChange(next);
          }}
        />
      ))}

      {/* Streaming card for a prompted persona being filled field-by-field */}
      {streaming && (
        <StreamingPersonaCard
          target={streaming.target}
          revealedFields={streaming.revealedFields}
        />
      )}

      {/* Auto-reveal for the seeded personas */}
      {revealed < personas.length && loadingNext && (
        <>
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] fadeUp"
            style={{
              background: "var(--spot-tint)",
              border: "1px solid var(--spot-stroke)",
            }}
          >
            <SpotMark size={14} />
            <span className="text-[12px] text-text-secondary">
              {revealed === 0
                ? "Reading the brief and recent leads…"
                : `Drafting persona ${revealed + 1} of ${personas.length}…`}
            </span>
            <span className="flex gap-1 ml-auto">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="spot-pulse"
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--text-2)",
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </span>
          </div>
          <PersonaSkeleton />
        </>
      )}

      {/* Composer for prompt-based new persona */}
      {allRevealed && !composerOpen && (
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-[10px] border border-dashed border-border bg-white text-[12.5px] text-text-secondary hover:border-border-hover hover:bg-surface-page"
        >
          <Plus size={13} /> Add another persona
        </button>
      )}

      {allRevealed && composerOpen && (
        <div className="space-y-2 fadeUp">
          <div
            className="flex gap-2.5 p-3 rounded-[10px]"
            style={{
              background: "var(--spot-tint)",
              border: "1px solid var(--spot-stroke)",
            }}
          >
            <SpotMark size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="text-[12.5px] leading-[1.5]">
              Describe a persona in a sentence or two — who they are, what they want, what&apos;s
              holding them back. I&apos;ll fill in the details.
            </div>
          </div>
          <div
            className="rounded-[10px] p-3"
            style={{ background: "#FFFDF6", border: "1px solid #E8C97A" }}
          >
            <textarea
              autoFocus
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. NRI families in their 40s, looking at a second home in India for rental yield + a place to visit twice a year"
              className="w-full text-[13px] outline-none rounded px-2 py-1.5 resize-y"
              style={{
                border: "1px solid #C9A86A",
                background: "#FFFEF8",
                minHeight: 70,
              }}
            />
            <div className="flex justify-end items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setPromptText("");
                }}
                className="inline-flex items-center h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!promptText.trim()}
                onClick={handleDraft}
                className="apply-btn"
                style={{
                  height: 28,
                  fontSize: 11.5,
                  padding: "0 10px",
                  opacity: promptText.trim() ? 1 : 0.5,
                  cursor: promptText.trim() ? "pointer" : "not-allowed",
                }}
              >
                <Sparkles size={11} /> Draft persona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// While streaming, show partial reveal of fields
function StreamingPersonaCard({
  target,
  revealedFields,
}: {
  target: PersonaDraft;
  revealedFields: number;
}) {
  const fields = PERSONA_REVEAL_FIELDS;
  const labels: Record<string, string> = {
    name: "Name",
    age: "Age",
    role: "Role",
    want: "Want",
    painPoint: "Pain point",
    solution: "Solution we offer",
    hhi: "Income",
    geo: "Geography",
  };
  return (
    <div className="card-base bg-white overflow-hidden fadeUp">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
        <SpotMark size={14} />
        <span className="text-[11.5px] text-text-secondary">
          Drafting your persona — {Math.min(revealedFields, fields.length)} of {fields.length}{" "}
          fields…
        </span>
        <span className="flex gap-1 ml-auto">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="spot-pulse"
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "var(--text-2)",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border-subtle">
        {fields.map((f, i) => {
          const isShown = i < revealedFields;
          return (
            <div key={f} className="px-3 py-2">
              <div
                className="uplabel mb-1"
                style={{ fontSize: 9.5 }}
              >
                {labels[f]}
              </div>
              {isShown ? (
                <div className="text-[12px] leading-[1.4] fadeUp">
                  {String(target[f])}
                </div>
              ) : (
                <div className="skeleton" style={{ height: 11, width: "75%" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────

export function CreateProjectFlow({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  /** action = "view" → open project page · "campaign" → start campaign flow */
  /** action = "view" → open project page · "creatives" → start creatives flow */
  onComplete: (id: string, action: "view" | "creatives") => void;
}) {
  const [stage, setStage] = useState<Stage>("intent");
  const [draft, setDraft] = useState<Draft>(SEED);
  const [researching, setResearching] = useState(false);
  const [researchFindings, setResearchFindings] = useState<string[]>([]);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const showToast = useSpotStore((s) => s.showToast);
  const scope = useCurrentScope();
  const workspaceLabel = useCurrentWorkspaceLabel();
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Build + persist the new project in the runtime store, returning its id.
   * Idempotent across both completion paths (view / creatives) — we cache
   * the created id on the ref so re-clicking the same CTA doesn't dupe.
   */
  const persistedIdRef = useRef<string | null>(null);
  const persistProject = (): string => {
    if (persistedIdRef.current) return persistedIdRef.current;
    const workspaceId =
      scope.kind === "workspace" ? scope.id : "ws-south"; // sane default for the "all" view
    const project = buildProjectFromDraft({
      name: draft.name,
      rera: draft.rera,
      micromarket: draft.micromarket,
      typology: draft.typology,
      priceBand: draft.priceBand,
      pricePerSqft: draft.pricePerSqft,
      possession: draft.possession,
      keyUSPs: draft.keyUSPs,
      locationProximity: draft.locationProximity,
      keyBenefits: draft.keyBenefits,
      goalKind: draft.goalKind,
      goalTarget: draft.goalTarget,
      goalWindow: draft.goalWindow,
      budgetTotal: draft.budgetTotal,
      personas: draft.personas,
      images: projectImages,
      workspaceId,
    });
    addRuntimeProject(project);
    persistedIdRef.current = project.id;
    return project.id;
  };
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const next = () => {
    const idx = STAGES.findIndex((s) => s.key === stage);
    if (idx < STAGES.length - 1) setStage(STAGES[idx + 1].key);
  };
  const prev = () => {
    const idx = STAGES.findIndex((s) => s.key === stage);
    if (idx > 0) setStage(STAGES[idx - 1].key);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stage, researchFindings.length]);

  const personaCount = draft.personas.length;

  const startDeepResearch = () => {
    setDraft({ ...draft, source: "deep-research", sourceLabel: "Deep research · web + RERA + builder pages" });
    setResearching(true);
    setResearchFindings([]);
    const findings = [
      "Reading the project listing page and brand microsite…",
      "Cross-referencing the RERA registry for registered milestones…",
      "Pulling comparable per-sqft pricing from 4 nearby launches…",
      "Scanning locality reports for proximity and infrastructure signals…",
      "Drafting USPs and key benefits from builder + locality data…",
    ];
    findings.forEach((f, i) => {
      setTimeout(() => {
        setResearchFindings((prev) => [...prev, f]);
        if (i === findings.length - 1) {
          setTimeout(() => {
            setResearching(false);
            setStage("brief");
          }, 600);
        }
      }, 700 * (i + 1));
    });
  };

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "5vh 16px",
          pointerEvents: "none",
        }}
      >
      <div
        className="fadeUp"
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "92vh",
          background: "#FFF",
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border flex-shrink-0">
          <SpotMark size={20} />
          <div className="flex-1 min-w-0">
            <div className="uplabel" style={{ fontSize: 10 }}>
              Spot · new project
            </div>
            <div className="text-[15px] font-semibold truncate">
              Set up a new project knowledge base
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-button hover:bg-surface-secondary flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 scroll"
          style={{ background: "var(--chat-bg)" }}
        >
          {stage === "intent" && (
            <>
              <SpotBubble>
                Let&apos;s set up your new project. The fastest path: <strong>Deep research</strong> —
                I&apos;ll scan the web, builder pages, the RERA registry, and comparable launches. Or
                drop a PDF, paste a URL, or fill it in yourself.
              </SpotBubble>
              <DraftCard>
                <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  {[
                    { k: "deep-research", label: "Deep research", sub: "Spot scans the web for you", Icon: Globe },
                    { k: "pdf", label: "Upload PDF", sub: "Brand book or sales deck", Icon: Upload },
                    { k: "url", label: "Paste URL", sub: "Project listing page", Icon: FileText },
                    { k: "manual", label: "Manual fill", sub: "Type it in yourself", Icon: Edit3 },
                  ].map(({ k, label, sub, Icon }) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDraft({ ...draft, source: k as Draft["source"] })}
                      disabled={researching}
                      className="card-base text-left p-3 flex flex-col items-start gap-1"
                      style={{
                        background: draft.source === k ? "#1A1A1A" : "#FFF",
                        color: draft.source === k ? "#FFF" : "var(--text-1)",
                        borderColor: draft.source === k ? "#1A1A1A" : "var(--border)",
                        opacity: researching ? 0.6 : 1,
                      }}
                    >
                      <Icon size={15} />
                      <span className="text-[12.5px] font-medium">{label}</span>
                      <span
                        className="text-[10.5px]"
                        style={{ color: draft.source === k ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}
                      >
                        {sub}
                      </span>
                    </button>
                  ))}
                </div>
                {draft.source !== "deep-research" && (
                  <Field
                    label="Source label"
                    value={draft.sourceLabel}
                    onChange={(v) => setDraft({ ...draft, sourceLabel: v })}
                  />
                )}
                {draft.source === "deep-research" && (
                  <Field
                    label="Project name or URL to research"
                    value={draft.name}
                    onChange={(v) => setDraft({ ...draft, name: v })}
                  />
                )}
              </DraftCard>

              {researching && (
                <div
                  className="rounded-[10px] p-4 mb-3 fadeUp"
                  style={{ background: "var(--spot-tint)", border: "1px solid var(--spot-stroke)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <SpotMark size={16} />
                    <span className="text-[12.5px] font-semibold">Spot is researching…</span>
                    <span className="flex gap-1 ml-auto">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="spot-pulse"
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "var(--text-2)",
                            animationDelay: `${i * 0.18}s`,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {researchFindings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] leading-[1.5] fadeUp">
                        <Check size={12} style={{ color: "var(--ok-fg)", flexShrink: 0, marginTop: 2 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                {draft.source === "deep-research" ? (
                  <button
                    type="button"
                    className="apply-btn"
                    onClick={startDeepResearch}
                    disabled={researching}
                  >
                    <Sparkles size={11} /> {researching ? "Researching…" : "Run deep research →"}
                  </button>
                ) : (
                  <button type="button" className="apply-btn" onClick={next}>
                    Got it — extract the basics →
                  </button>
                )}
              </div>
            </>
          )}

          {stage === "brief" && (
            <>
              <SpotBubble>
                {draft.source === "deep-research" ? (
                  <>
                    Synthesized from the web — builder microsite, RERA registry, locality reports,
                    and 4 comparable launches in <strong>{draft.micromarket}</strong>. Tap any value
                    to edit.
                  </>
                ) : (
                  <>Pulled from <strong>{draft.sourceLabel}</strong>. Tap any value to edit.</>
                )}
              </SpotBubble>
              <DraftCard label="Extracted brief">
                <div className="space-y-5">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-secondary font-semibold mb-2">
                      Project basics
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr" }}>
                      <Field
                        label="Project name"
                        value={draft.name}
                        onChange={(v) => setDraft({ ...draft, name: v })}
                      />
                      <Field
                        label="RERA"
                        value={draft.rera}
                        onChange={(v) => setDraft({ ...draft, rera: v })}
                      />
                    </div>
                    <Field
                      label="Micromarket"
                      value={draft.micromarket}
                      onChange={(v) => setDraft({ ...draft, micromarket: v })}
                    />
                    <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      <Field
                        label="Typology"
                        value={draft.typology}
                        onChange={(v) => setDraft({ ...draft, typology: v })}
                      />
                      <Field
                        label="Possession"
                        value={draft.possession}
                        onChange={(v) => setDraft({ ...draft, possession: v })}
                      />
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      <Field
                        label="Price band"
                        value={draft.priceBand}
                        onChange={(v) => setDraft({ ...draft, priceBand: v })}
                      />
                      <Field
                        label="Price per sqft"
                        value={draft.pricePerSqft}
                        onChange={(v) => setDraft({ ...draft, pricePerSqft: v })}
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-[#E8C97A]">
                    <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-secondary font-semibold mt-3 mb-2">
                      Positioning
                    </div>
                    <ListField
                      label="Key USPs"
                      values={draft.keyUSPs}
                      onChange={(next) => setDraft({ ...draft, keyUSPs: next })}
                      placeholder="USP"
                    />
                    <ListField
                      label="Location proximity"
                      values={draft.locationProximity}
                      onChange={(next) => setDraft({ ...draft, locationProximity: next })}
                      placeholder="landmark"
                    />
                    <ListField
                      label="Key benefits"
                      values={draft.keyBenefits}
                      onChange={(next) => setDraft({ ...draft, keyBenefits: next })}
                      placeholder="benefit"
                    />
                  </div>
                </div>
              </DraftCard>
              <div className="flex justify-between">
                <button
                  type="button"
                  className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                  onClick={prev}
                >
                  Back
                </button>
                <button type="button" className="apply-btn" onClick={next}>
                  Looks right — set the goal →
                </button>
              </div>
            </>
          )}

          {stage === "goal" && (() => {
            const VERIF_RATE = 0.5; // ~50% of leads verify (industry typical)
            const QUAL_RATE = 0.55; // qual as % of verified
            const target = Number(draft.goalTarget) || 0;
            const budget = Number(draft.budgetTotal) || 0;
            let leadsTarget = 0;
            let verifTarget = 0;
            let qualTarget = 0;
            if (draft.goalKind === "leads") {
              leadsTarget = target;
              verifTarget = target * VERIF_RATE;
              qualTarget = verifTarget * QUAL_RATE;
            } else if (draft.goalKind === "verified") {
              verifTarget = target;
              leadsTarget = target / VERIF_RATE;
              qualTarget = target * QUAL_RATE;
            } else {
              qualTarget = target;
              verifTarget = target / QUAL_RATE;
              leadsTarget = verifTarget / VERIF_RATE;
            }
            const cpl = leadsTarget ? budget / leadsTarget : 0;
            const cpvl = verifTarget ? budget / verifTarget : 0;
            const cpql = qualTarget ? budget / qualTarget : 0;
            const fmt = (n: number) => {
              if (!isFinite(n) || n <= 0) return "—";
              return "₹" + Math.round(n).toLocaleString("en-IN");
            };
            return (
              <>
                <SpotBubble>
                  Goal: <strong>{target || "—"} {draft.goalKind} leads</strong> in{" "}
                  <strong>{draft.goalWindow}</strong>. At a <strong>{fmt(budget)}</strong> budget
                  that lands you at ~<strong>{fmt(cpvl)} per verified lead</strong>, ~
                  <strong>{fmt(cpql)} per qualified</strong>. Recheck the budget if any of those
                  look off.
                </SpotBubble>
                <DraftCard label="Goal proposal">
                  <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-2">
                    Goal kind
                  </div>
                  <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {(["leads", "verified", "qualified"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setDraft({ ...draft, goalKind: k })}
                        className="card-base text-left p-2.5"
                        style={{
                          background: draft.goalKind === k ? "#1A1A1A" : "#FFF",
                          color: draft.goalKind === k ? "#FFF" : "var(--text-1)",
                          borderColor: draft.goalKind === k ? "#1A1A1A" : "var(--border)",
                        }}
                      >
                        <div className="text-[12.5px] font-medium capitalize">{k} leads</div>
                        {k === "verified" && (
                          <div
                            className="text-[10.5px] mt-0.5"
                            style={{
                              color:
                                draft.goalKind === k
                                  ? "rgba(255,255,255,0.7)"
                                  : "var(--text-tertiary)",
                            }}
                          >
                            Spot recommends
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <Field
                      label="Target count"
                      value={draft.goalTarget}
                      onChange={(v) => setDraft({ ...draft, goalTarget: v })}
                    />
                    <Field
                      label="Window"
                      value={draft.goalWindow}
                      onChange={(v) => setDraft({ ...draft, goalWindow: v })}
                    />
                  </div>
                  <Field
                    label="Total budget (₹)"
                    value={draft.budgetTotal}
                    onChange={(v) =>
                      setDraft({ ...draft, budgetTotal: v.replace(/[^0-9]/g, "") })
                    }
                  />
                  <div className="mt-3 pt-3 border-t border-[#E8C97A]">
                    <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-2">
                      Derived costs
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                      <DerivedCostCard
                        label="CPL"
                        value={fmt(cpl)}
                        sub={`${Math.round(leadsTarget).toLocaleString("en-IN")} leads`}
                      />
                      <DerivedCostCard
                        label="CPVL"
                        value={fmt(cpvl)}
                        sub={`${Math.round(verifTarget).toLocaleString("en-IN")} verified`}
                        highlight={draft.goalKind === "verified"}
                      />
                      <DerivedCostCard
                        label="CPQL"
                        value={fmt(cpql)}
                        sub={`${Math.round(qualTarget).toLocaleString("en-IN")} qualified`}
                        highlight={draft.goalKind === "qualified"}
                      />
                    </div>
                  </div>
                </DraftCard>
                <div className="flex justify-between">
                  <button
                    type="button"
                    className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                    onClick={prev}
                  >
                    Back
                  </button>
                  <button type="button" className="apply-btn" onClick={next}>
                    Set goal — draft personas →
                  </button>
                </div>
              </>
            );
          })()}

          {stage === "personas" && (
            <>
              <SpotBubble>
                Drafting personas from your brief, the goal you set, and what&apos;s worked for
                similar Pune luxury launches. Each one uses a <strong>Want / Pain / Solution</strong>{" "}
                frame — Pain and Solution stay fixed across creative; only hook and CTA flex per ad.
                Remove any that don&apos;t fit, edit inline, or add another.
              </SpotBubble>
              <ProgressivePersonas
                personas={draft.personas}
                onChange={(next) => setDraft({ ...draft, personas: next })}
              />
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                  onClick={prev}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="apply-btn"
                  onClick={next}
                  disabled={personaCount === 0}
                >
                  Looks good — what about images? →
                </button>
              </div>
            </>
          )}

          {stage === "images" && (
            <>
              <SpotBubble>
                Got any project images I should pull from? Exteriors, interiors, amenities, a site
                visit reel — anything I can use in your creatives later. Drop them here, or skip if
                we&apos;ll grab them from the brand book.
              </SpotBubble>
              <DraftCard label="Project images">
                <ImageUploadPanel images={projectImages} onChange={setProjectImages} />
              </DraftCard>
              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
                  onClick={prev}
                >
                  Back
                </button>
                <button type="button" className="apply-btn" onClick={next}>
                  {projectImages.length > 0
                    ? `Continue with ${projectImages.length} image${projectImages.length === 1 ? "" : "s"} →`
                    : "Skip — almost done →"}
                </button>
              </div>
            </>
          )}

          {stage === "ready" && (() => {
            const VERIF_RATE = 0.5;
            const target = Number(draft.goalTarget) || 0;
            const budget = Number(draft.budgetTotal) || 0;
            const verifTarget =
              draft.goalKind === "verified"
                ? target
                : draft.goalKind === "leads"
                ? target * VERIF_RATE
                : target / 0.55;
            const cpvl = verifTarget ? Math.round(budget / verifTarget) : 0;
            const cpvlStr = cpvl ? `₹${cpvl.toLocaleString("en-IN")}` : "—";
            const projectShort = draft.name.split(" · ")[0] || draft.name;
            const personaNames = draft.personas.slice(0, 2).map((p) => p.name).join(", ");
            const personaSummary =
              personaCount === 0
                ? "—"
                : personaCount === 1
                ? personaNames
                : personaCount === 2
                ? personaNames
                : `${personaNames} +${personaCount - 2}`;

            return (
              <ReadyCelebration
                projectShort={projectShort}
                workspaceLabel={workspaceLabel}
                personaCount={personaCount}
                personaSummary={personaSummary}
                imageCount={projectImages.length}
                uspCount={draft.keyUSPs.length}
                proximityCount={draft.locationProximity.length}
                goalTarget={target}
                goalKind={draft.goalKind}
                goalWindow={draft.goalWindow}
                cpvlStr={cpvlStr}
                onView={() => {
                  const id = persistProject();
                  showToast("Project saved — opening project page");
                  onComplete(id, "view");
                }}
                onContinue={() => {
                  const id = persistProject();
                  showToast("Project saved — let's draft creative angles");
                  onComplete(id, "creatives");
                }}
              />
            );
          })()}
        </div>
      </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Ready stage — celebration card ────────────────────────────────────

function ReadyCelebration({
  projectShort,
  workspaceLabel,
  personaCount,
  personaSummary,
  imageCount,
  uspCount,
  proximityCount,
  goalTarget,
  goalKind,
  goalWindow,
  cpvlStr,
  onView,
  onContinue,
}: {
  projectShort: string;
  workspaceLabel: string;
  personaCount: number;
  personaSummary: string;
  imageCount: number;
  uspCount: number;
  proximityCount: number;
  goalTarget: number;
  goalKind: "leads" | "verified" | "qualified";
  goalWindow: string;
  cpvlStr: string;
  onView: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[14px] fadeUp"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #FBF7FF 0%, #FFFDF6 55%, #FFFFFF 100%)",
        border: "1px solid #C8A8FF",
        padding: "40px 32px 32px",
      }}
    >
      {/* Animated stamp */}
      <div
        className="mx-auto mb-5 relative"
        style={{ width: 72, height: 72 }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            opacity: 0.18,
            transform: "scale(1.0)",
            animation: "ready-pulse 1.8s ease-out infinite",
          }}
        />
        <span
          className="absolute rounded-full"
          style={{
            top: 8,
            left: 8,
            width: 56,
            height: 56,
            background:
              "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            boxShadow: "0 10px 28px rgba(124,58,237,0.45)",
            animation: "ready-stamp-in 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
        >
          <Check size={26} strokeWidth={3} />
        </span>
      </div>

      {/* Headline */}
      <div className="text-center mb-1">
        <div className="text-[10.5px] uppercase tracking-[0.5px] text-text-tertiary font-semibold">
          Project saved
        </div>
      </div>
      <div
        className="text-center text-[22px] font-semibold tracking-[-0.01em] mb-1"
        style={{ letterSpacing: "-0.01em" }}
      >
        Your project is set up
      </div>
      <div className="text-center text-[13px] text-text-secondary mb-1">{projectShort}</div>
      <div className="text-center text-[11.5px] text-text-tertiary mb-6">
        Saved to {workspaceLabel}
      </div>

      {/* Summary chips */}
      <div
        className="grid gap-3 mx-auto mb-7"
        style={{
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          maxWidth: 720,
        }}
      >
        <SummaryChip
          icon={<BookOpen size={14} />}
          label="Brief"
          value={`${uspCount} USPs`}
          sub={`${proximityCount} proximity points${imageCount > 0 ? ` · ${imageCount} image${imageCount === 1 ? "" : "s"}` : ""}`}
        />
        <SummaryChip
          icon={<Users size={14} />}
          label="Personas"
          value={`${personaCount} persona${personaCount === 1 ? "" : "s"}`}
          sub={personaSummary}
        />
        <SummaryChip
          icon={<Target size={14} />}
          label="Goal"
          value={`${goalTarget} ${goalKind === "leads" ? "leads" : `${goalKind} leads`}`}
          sub={`${goalWindow} · ~${cpvlStr} per verified`}
        />
      </div>

      {/* What's next */}
      <div className="text-center text-[11px] uppercase tracking-[0.5px] text-text-tertiary font-semibold mb-3">
        What&apos;s next?
      </div>
      <div
        className="grid gap-3 mx-auto"
        style={{
          gridTemplateColumns: "1fr 1fr",
          maxWidth: 620,
        }}
      >
        <button
          type="button"
          onClick={onView}
          className="text-left rounded-[10px] p-4 transition-colors"
          style={{
            background: "#FFF",
            border: "1px solid var(--border)",
          }}
        >
          <div className="text-[13px] font-semibold mb-0.5">Open project page</div>
          <div className="text-[11.5px] text-text-tertiary leading-[1.5]">
            Look around first — review the brief, personas, goal.
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-text-secondary">
            Go to project <ArrowRight size={11} />
          </div>
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="text-left rounded-[10px] p-4 transition-shadow"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            border: "1px solid transparent",
            color: "#FFF",
            boxShadow: "0 8px 24px rgba(124,58,237,0.25)",
          }}
        >
          <div className="text-[13px] font-semibold mb-0.5 flex items-center gap-1.5">
            <Sparkles size={13} /> Build creative angles
          </div>
          <div
            className="text-[11.5px] leading-[1.5]"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Spot drafts 2 angles per persona · recommended next step.
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[11.5px]">
            Continue <ArrowRight size={11} />
          </div>
        </button>
      </div>

      <style jsx>{`
        @keyframes ready-pulse {
          0% {
            transform: scale(0.7);
            opacity: 0.55;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        @keyframes ready-stamp-in {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      className="rounded-[10px] p-3"
      style={{ background: "#FFF", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="inline-flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "linear-gradient(135deg, #F4ECFF 0%, #FDF2FF 100%)",
            color: "#7C3AED",
          }}
        >
          {icon}
        </span>
        <span
          className="uplabel"
          style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}
        >
          {label}
        </span>
      </div>
      <div className="text-[13px] font-semibold tabular-nums leading-tight mb-0.5">{value}</div>
      <div className="text-[10.5px] text-text-tertiary leading-[1.4] truncate">{sub}</div>
    </div>
  );
}
