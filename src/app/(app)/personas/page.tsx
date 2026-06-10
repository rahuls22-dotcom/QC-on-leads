"use client";

// Personas, promoted to a top-level module. Previously this concept was
// hidden inside project deep-dive. In the Agentic OS, personas are the
// reusable asset across products — Spot pulls from this library when it
// runs persona research for a new product.
//
// Each persona card surfaces:
//   - who they are (description + attributes)
//   - what motivates them (pain + desire)
//   - where they perform (preferred channels)
//   - what reuses them (linked products)
//   - actions Spot can take (research, draft angles, build audience)

import { Plus, Users, Sparkles, Layers, MapPin, Heart, Flame, Image as ImageIcon, Film, Layout } from "lucide-react";
import {
  PERSONAS,
  PERSONA_STATUS_LABEL,
  PERSONA_STATUS_TONE,
  type Persona,
  type PersonaCreative,
} from "@/lib/personas-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { useDemoMode } from "@/lib/demo-mode";
import { PersonasEmptyState } from "@/components/personas/personas-empty-state";

const CHANNEL_COLOR: Record<Persona["preferredChannels"][number], string> = {
  Meta: "pill-info",
  Google: "pill-info",
  WhatsApp: "pill-ok",
  Voice: "pill-warn",
  Email: "pill",
};

export default function PersonasPage() {
  const askSpot = useSpotStore((s) => s.askSpot);
  const { isEmpty } = useDemoMode();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">Library · Cross-product</div>
          <h1 className="text-page-title text-text-primary">Personas</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[640px]">
            Personas live outside any single product. Build one once — Spot reuses it across every product, project, and
            channel it can serve.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => askSpot("Run persona research and propose new personas I should add.")}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px] font-medium"
          >
            <SpotMark size={13} />
            Research with Spot
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
          >
            <Plus size={14} strokeWidth={2} />
            New persona
          </button>
        </div>
      </div>

      {isEmpty ? (
        <PersonasEmptyState />
      ) : (
        <>
      {/* Roll-up strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total personas" value={PERSONAS.length} />
        <Stat label="Active" value={PERSONAS.filter((p) => p.status === "active").length} />
        <Stat label="Researching" value={PERSONAS.filter((p) => p.status === "researching").length} />
        <Stat
          label="Total creatives"
          value={PERSONAS.reduce((s, p) => s + p.creatives.length, 0)}
        />
      </div>

      {/* Persona grid */}
      <div className="grid grid-cols-2 gap-4">
        {PERSONAS.map((p) => (
          <PersonaCard key={p.id} persona={p} onLaunch={() => askSpot(`Draft creative angles for "${p.name}".`)} />
        ))}
      </div>
        </>
      )}
    </div>
  );
}

function PersonaCard({ persona, onLaunch }: { persona: Persona; onLaunch: () => void }) {
  return (
    <div className="bg-white border border-border rounded-card p-5 flex flex-col gap-3.5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-button bg-surface-secondary flex items-center justify-center flex-shrink-0">
            <Users size={16} strokeWidth={1.5} className="text-text-secondary" />
          </div>
          <div>
            <div className="text-card-title text-text-primary">{persona.name}</div>
            <div className="text-[11.5px] text-text-tertiary mt-0.5">Updated {persona.updatedAt}</div>
          </div>
        </div>
        <span className={`pill ${PERSONA_STATUS_TONE[persona.status]}`}>
          {PERSONA_STATUS_LABEL[persona.status]}
        </span>
      </div>

      {/* Description */}
      <p className="text-[13px] text-text-secondary leading-relaxed">{persona.description}</p>

      {/* Attributes */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {persona.attributes.map((a) => (
          <div key={a.label} className="flex items-center gap-1.5 text-[12px]">
            <MapPin size={11} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
            <span className="text-text-tertiary">{a.label}:</span>
            <span className="text-text-primary truncate">{a.value}</span>
          </div>
        ))}
      </div>

      {/* Pain + Desire — the emotional spine for creative */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Vector
          icon={<Flame size={11} strokeWidth={1.6} className="text-[#DC2626]" />}
          label="Pain"
          items={persona.pain}
        />
        <Vector
          icon={<Heart size={11} strokeWidth={1.6} className="text-[#15803D]" />}
          label="Desire"
          items={persona.desire}
        />
      </div>

      {/* Channels + products */}
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-1 flex-wrap">
          {persona.preferredChannels.map((c) => (
            <span key={c} className={`pill ${CHANNEL_COLOR[c]}`}>{c}</span>
          ))}
        </div>
        <div className="text-[11.5px] text-text-tertiary inline-flex items-center gap-1">
          <Layers size={11} strokeWidth={1.5} />
          {persona.products.length} product{persona.products.length === 1 ? "" : "s"} · {persona.creatives.length} creative{persona.creatives.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Creatives row — what we've built for this persona so far */}
      <CreativesStrip creatives={persona.creatives} />

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onLaunch}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12px] font-medium"
        >
          <Sparkles size={12} strokeWidth={2} />
          Draft angles
        </button>
        <button
          type="button"
          className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12px] text-text-secondary hover:text-text-primary"
        >
          Build audience
        </button>
        <button
          type="button"
          className="inline-flex items-center h-8 px-2.5 rounded-button text-[12px] text-text-tertiary hover:text-text-primary ml-auto"
        >
          Open
        </button>
      </div>
    </div>
  );
}

function Vector({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <ul className="space-y-0.5">
        {items.slice(0, 2).map((it, i) => (
          <li key={i} className="text-[12px] text-text-primary leading-snug">· {it}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-border rounded-card p-3">
      <div className="text-[11.5px] text-text-tertiary mb-1">{label}</div>
      <div className="text-stat-md text-text-primary tabular">{value}</div>
    </div>
  );
}

// Lucide icons use ForwardRefExoticComponent<LucideProps> which doesn't
// match a narrow React.ComponentType. `typeof ImageIcon` captures Lucide's
// actual signature without coupling us to the LucideIcon export.
const CREATIVE_KIND_ICON: Record<PersonaCreative["kind"], typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  carousel: Layout,
};

const STATE_DOT: Record<PersonaCreative["state"], string> = {
  live: "bg-[#22C55E]",
  ready: "bg-[#F5A623]",
  shell: "bg-[#D4D4D4]",
};

const STATE_LABEL: Record<PersonaCreative["state"], string> = {
  live: "Live",
  ready: "Ready",
  shell: "Shell",
};

/**
 * Creatives row — small tile per creative with placeholder gradient
 * (no real assets in mock), kind icon, and live/ready/shell dot.
 * Read-only here; clicking would route to /creatives or Spot.
 */
function CreativesStrip({ creatives }: { creatives: PersonaCreative[] }) {
  if (creatives.length === 0) {
    return (
      <div className="text-[11.5px] text-text-tertiary italic">
        No creatives yet — ask Spot to draft angles.
      </div>
    );
  }
  return (
    <div>
      <div className="label-section mb-1.5">Creatives ({creatives.length})</div>
      <div className="flex gap-1.5 overflow-x-auto scroll pb-1">
        {creatives.map((c) => {
          const KindIcon = CREATIVE_KIND_ICON[c.kind];
          return (
            <div
              key={c.id}
              title={`${c.label} · ${STATE_LABEL[c.state]}`}
              className="relative flex-shrink-0 w-[64px] h-[64px] rounded-[6px] border border-border overflow-hidden"
              style={{
                background: `linear-gradient(135deg, hsl(${c.hue} 60% 92%) 0%, hsl(${c.hue} 50% 78%) 100%)`,
              }}
            >
              <div className="absolute top-1 left-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/85 backdrop-blur-sm">
                <KindIcon size={9} strokeWidth={1.8} />
              </div>
              <div className="absolute top-1 right-1 text-[8.5px] font-medium text-text-secondary bg-white/85 px-1 rounded-sm">
                {c.format}
              </div>
              <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOT[c.state]}`} />
                <span className="text-[8.5px] font-medium text-text-primary truncate">
                  {STATE_LABEL[c.state]}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
