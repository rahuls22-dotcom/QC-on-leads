"use client";

// Creative Studio — work directly with the Creative Agent ("Iris").
// Left: the brief + conversation. Right: a live canvas where Iris drafts
// concepts and you iterate. Self-contained (local state), EdTech data.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Send,
  Image as ImageIcon,
  Film,
  Layers,
  Bookmark,
  BookmarkCheck,
  Maximize2,
  Megaphone,
  RefreshCw,
  Wand2,
  Zap,
  Scissors,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  CREATIVE_AGENT,
  ANGLE_THEMES,
  FORMATS,
  STUDIO_PRODUCTS,
  personasForProduct,
  generateConcepts,
  summariseBrief,
  conceptToLibrary,
  type Brief,
  type Concept,
  type CreativeFormatKind,
  type LibraryCreative,
} from "@/lib/creatives-studio-data";

type Msg = { id: string; role: "user" | "agent"; text: string };
type Round = { id: string; concepts: Concept[]; summary: string };

const FORMAT_ICON: Record<CreativeFormatKind, typeof ImageIcon> = {
  Static: ImageIcon,
  Reel: Film,
  Carousel: Layers,
};

const ASPECT: Record<Concept["ratio"], string> = {
  "1:1": "1 / 1",
  "4:5": "4 / 5",
  "9:16": "9 / 16",
};

let _id = 0;
const uid = (p: string) => `${p}-${++_id}`;

export function CreativeStudio({ onSave }: { onSave: (c: LibraryCreative) => void }) {
  const firstProduct = STUDIO_PRODUCTS[0];
  const [productId, setProductId] = useState(firstProduct.id);
  const [persona, setPersona] = useState(firstProduct.personas[0]);
  const [angleId, setAngleId] = useState(ANGLE_THEMES[0].id);
  const [format, setFormat] = useState<CreativeFormatKind>("Static");
  const [note, setNote] = useState("");

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid("m"),
      role: "agent",
      text: `Hi — I'm ${CREATIVE_AGENT.name}, your Creative Agent. Pick a product, persona and angle below and I'll draft ${CREATIVE_AGENT.conceptsPerRun} on-brand concepts. Then we iterate: tell me to push bolder, tighten the hook, or try another format.`,
    },
  ]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [generating, setGenerating] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const product = STUDIO_PRODUCTS.find((p) => p.id === productId) ?? firstProduct;
  const personas = personasForProduct(productId);
  const chatRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep persona valid when product changes.
  useEffect(() => {
    if (!personas.includes(persona)) setPersona(personas[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length, generating]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function runBrief(extra?: Partial<Brief>) {
    if (generating) return;
    const effProductId = extra?.productId ?? productId;
    const effProduct = STUDIO_PRODUCTS.find((p) => p.id === effProductId) ?? product;
    const brief: Brief = {
      productId: effProductId,
      productName: effProduct.name,
      persona: extra?.persona ?? persona,
      angleId: extra?.angleId ?? angleId,
      format: extra?.format ?? format,
      note: extra?.note ?? (note.trim() || undefined),
      tone: extra?.tone ?? "default",
    };
    const round = rounds.length;
    const theme = ANGLE_THEMES.find((t) => t.id === brief.angleId) ?? ANGLE_THEMES[0];

    setMessages((m) => [...m, { id: uid("m"), role: "user", text: summariseBrief(brief) }]);
    setNote("");
    setGenerating(true);
    setDraftCount(0);

    // "Drafting concept N of 4" ticker.
    timers.current.forEach(clearTimeout);
    timers.current = [];
    for (let i = 1; i <= CREATIVE_AGENT.conceptsPerRun; i++) {
      timers.current.push(setTimeout(() => setDraftCount(i), 380 * i));
    }
    timers.current.push(
      setTimeout(() => {
        const concepts = generateConcepts(brief, round);
        setRounds((r) => [...r, { id: uid("r"), concepts, summary: `${brief.format} · ${theme.label} · ${brief.persona}` }]);
        const reply =
          brief.tone === "bolder"
            ? `Pushed bolder — ${concepts.length} louder ${brief.format.toLowerCase()} cuts on the ${theme.label.toLowerCase()} angle. Save the keepers or send me another direction.`
            : brief.tone === "shorter"
              ? `Tightened the hooks — ${concepts.length} punchier ${brief.format.toLowerCase()} concepts. Want a different angle or format next?`
              : `Here are ${concepts.length} ${brief.format.toLowerCase()} concepts on the ${theme.label.toLowerCase()} angle for ${brief.persona}. Save the ones you like, or tell me to push bolder, tighten the hook, or try another format.`;
        setMessages((m) => [...m, { id: uid("m"), role: "agent", text: reply }]);
        setGenerating(false);
        requestAnimationFrame(() => {
          if (canvasRef.current) canvasRef.current.scrollTop = 0;
        });
      }, 380 * CREATIVE_AGENT.conceptsPerRun + 500),
    );
  }

  function save(c: Concept) {
    if (savedIds.has(c.id)) return;
    setSavedIds((s) => new Set(s).add(c.id));
    onSave(conceptToLibrary(c));
  }

  function cycleFormat() {
    const next = FORMATS[(FORMATS.indexOf(format) + 1) % FORMATS.length];
    setFormat(next);
    runBrief({ format: next });
  }
  function cyclePersona() {
    const next = personas[(personas.indexOf(persona) + 1) % personas.length];
    setPersona(next);
    runBrief({ persona: next });
  }

  const hasConcepts = rounds.length > 0;
  const ordered = [...rounds].reverse(); // newest first

  return (
    <div className="flex rounded-card border border-border overflow-hidden bg-white" style={{ height: "calc(100vh - 184px)", minHeight: 560 }}>
      {/* ── LEFT · brief + conversation ─────────────────────────── */}
      <div className="w-[380px] flex-shrink-0 flex flex-col border-r border-border bg-surface-page/40">
        <AgentHeader />

        {/* Conversation */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((m) =>
            m.role === "agent" ? (
              <div key={m.id} className="flex gap-2">
                <span className="mt-0.5 flex-shrink-0">
                  <IrisGlyph size={20} />
                </span>
                <div className="text-[12.5px] leading-[1.5] text-text-primary">{m.text}</div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] text-[12.5px] leading-[1.5] px-3 py-2 rounded-[10px] rounded-br-[4px] bg-text-primary text-white">
                  {m.text}
                </div>
              </div>
            ),
          )}
          {generating && (
            <div className="flex gap-2 items-center text-[12px] text-text-secondary">
              <IrisGlyph size={20} spinning />
              Drafting concept {Math.max(1, draftCount)} of {CREATIVE_AGENT.conceptsPerRun}…
            </div>
          )}
        </div>

        {/* Refine chips */}
        {hasConcepts && !generating && (
          <div className="px-4 pt-2 flex flex-wrap gap-1.5">
            <RefineChip icon={Zap} label="Bolder" onClick={() => runBrief({ tone: "bolder" })} />
            <RefineChip icon={Scissors} label="Shorter hooks" onClick={() => runBrief({ tone: "shorter" })} />
            <RefineChip icon={RefreshCw} label="More concepts" onClick={() => runBrief()} />
            <RefineChip icon={FORMAT_ICON[FORMATS[(FORMATS.indexOf(format) + 1) % FORMATS.length]]} label={`Try a ${FORMATS[(FORMATS.indexOf(format) + 1) % FORMATS.length]}`} onClick={cycleFormat} />
            {personas.length > 1 && <RefineChip icon={Users} label="Switch persona" onClick={cyclePersona} />}
          </div>
        )}

        {/* Brief controls */}
        <div className="border-t border-border bg-white px-3 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <PillSelect label="Project" value={productId} onChange={setProductId} options={STUDIO_PRODUCTS.map((p) => ({ value: p.id, label: p.name.replace(/^Guyju's /, "") }))} />
            <PillSelect label="Persona" value={persona} onChange={setPersona} options={personas.map((p) => ({ value: p, label: p.replace(/^The /, "") }))} />
            <PillSelect label="Angle" value={angleId} onChange={setAngleId} options={ANGLE_THEMES.map((a) => ({ value: a.id, label: a.label }))} />
            <SegmentFormat value={format} onChange={setFormat} />
          </div>
          <div className="relative">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  runBrief();
                }
              }}
              rows={2}
              placeholder={`Tell ${CREATIVE_AGENT.name} what to make…`}
              className="w-full resize-none text-[12.5px] leading-snug rounded-[10px] border border-border bg-white px-3 py-2 pr-10 focus:outline-none focus:border-border-hover placeholder:text-text-tertiary"
            />
            <button
              type="button"
              onClick={() => runBrief()}
              disabled={generating}
              title="Brief Iris"
              className="absolute right-2 bottom-2 inline-flex items-center justify-center h-7 w-7 rounded-full text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
            >
              <Send size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT · live canvas ─────────────────────────────────── */}
      <div ref={canvasRef} className="flex-1 min-w-0 overflow-y-auto bg-surface-page/30">
        {!hasConcepts && !generating ? (
          <EmptyCanvas
            onExample={(b) => {
              setProductId(b.productId);
              setPersona(b.persona);
              setAngleId(b.angleId);
              setFormat(b.format);
              runBrief(b);
            }}
          />
        ) : (
          <div className="px-6 py-5">
            {generating && <GeneratingRow draftCount={draftCount} format={format} />}
            {ordered.map((round, ri) => (
              <div key={round.id} className={ri > 0 ? "mt-7 pt-6 border-t border-border-subtle" : ""}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                    {ri === 0 && !generating ? "Latest concepts" : `Round ${rounds.length - ri}`}
                  </span>
                  <span className="text-[11.5px] text-text-secondary">· {round.summary}</span>
                  <span className="text-[11px] text-text-tertiary ml-auto">{round.concepts.length} concepts</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {round.concepts.map((c, i) => (
                    <ConceptCard key={c.id} concept={c} index={i} saved={savedIds.has(c.id)} onSave={() => save(c)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Agent header ───────────────────────────────────────────────── */

function AgentHeader() {
  return (
    <div className="px-4 py-3.5 border-b border-border bg-white">
      <div className="flex items-start gap-2.5">
        <IrisGlyph size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-text-primary">{CREATIVE_AGENT.name}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED]">
              {CREATIVE_AGENT.role}
            </span>
          </div>
          <div className="text-[11px] text-text-tertiary leading-snug mt-0.5">
            Trained on {CREATIVE_AGENT.trainedOn}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2.5">
        {CREATIVE_AGENT.capabilities.map((c) => (
          <span key={c} className="text-[10.5px] px-1.5 py-0.5 rounded-[5px] bg-surface-secondary text-text-secondary">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function IrisGlyph({ size = 22, spinning }: { size?: number; spinning?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[8px] flex-shrink-0"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
    >
      {spinning ? (
        <RefreshCw size={size * 0.5} strokeWidth={2.2} className="text-white animate-spin" style={{ animationDuration: "1.1s" }} />
      ) : (
        <Sparkles size={size * 0.5} strokeWidth={2} className="text-white" />
      )}
    </span>
  );
}

/* ─── Brief controls ─────────────────────────────────────────────── */

function PillSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[9.5px] uppercase tracking-wider font-semibold text-text-tertiary mb-0.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 px-2 text-[12px] rounded-[7px] border border-border bg-white text-text-primary focus:outline-none focus:border-border-hover appearance-none cursor-pointer truncate"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
          paddingRight: 22,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SegmentFormat({ value, onChange }: { value: CreativeFormatKind; onChange: (v: CreativeFormatKind) => void }) {
  return (
    <div className="block">
      <span className="block text-[9.5px] uppercase tracking-wider font-semibold text-text-tertiary mb-0.5">Format</span>
      <div className="flex items-center gap-0.5 bg-surface-secondary rounded-[7px] p-0.5 h-8">
        {FORMATS.map((f) => {
          const Icon = FORMAT_ICON[f];
          const active = value === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              title={f}
              className={`flex-1 inline-flex items-center justify-center h-full rounded-[5px] transition-colors ${
                active ? "bg-white shadow-sm text-text-primary" : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <Icon size={13} strokeWidth={1.8} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RefineChip({ icon: Icon, label, onClick }: { icon: typeof Zap; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors"
    >
      <Icon size={11} strokeWidth={1.8} />
      {label}
    </button>
  );
}

/* ─── Canvas pieces ──────────────────────────────────────────────── */

function EmptyCanvas({ onExample }: { onExample: (b: Partial<Brief> & Brief) => void }) {
  const examples: { label: string; brief: Brief }[] = [
    { label: "Mentor-led statics for parents", brief: { productId: "prod-guyjus-jee", productName: "Guyju's JEE Crack", persona: "The Aspiring Engineer Parent", angleId: "mentor-led", format: "Static" } },
    { label: "Doubt-clearing reel for self-studiers", brief: { productId: "prod-guyjus-jee", productName: "Guyju's JEE Crack", persona: "The Self-Studier", angleId: "doubt-clearing", format: "Reel" } },
    { label: "Parent-dashboard carousel", brief: { productId: "prod-guyjus-jee", productName: "Guyju's JEE Crack", persona: "The Aspiring Engineer Parent", angleId: "parent-dashboard", format: "Carousel" } },
  ];
  // Guard examples against products/personas that may not exist.
  const valid = examples.filter((e) => STUDIO_PRODUCTS.some((p) => p.id === e.brief.productId && p.personas.includes(e.brief.persona)));
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8 py-12">
      <div className="relative mb-5">
        <div aria-hidden className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)", filter: "blur(14px)", transform: "scale(1.7)" }} />
        <IrisGlyph size={56} />
      </div>
      <h3 className="text-[17px] font-semibold text-text-primary">Brief Iris to start</h3>
      <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1.5 max-w-[420px]">
        Pick a product, persona and angle on the left — or start from one of these. Iris drafts {CREATIVE_AGENT.conceptsPerRun} concepts in ~{CREATIVE_AGENT.avgSeconds}s, then iterates with you.
      </p>
      <div className="flex flex-col gap-2 mt-5 w-full max-w-[360px]">
        {(valid.length ? valid : examples).map((e) => (
          <button
            key={e.label}
            type="button"
            onClick={() => onExample(e.brief)}
            className="group inline-flex items-center gap-2 h-10 px-3.5 rounded-[10px] border border-border bg-white hover:border-[#C4B5FD] hover:bg-[#FAF5FF] text-left transition-colors"
          >
            <Wand2 size={14} strokeWidth={1.8} className="text-[#7C3AED] flex-shrink-0" />
            <span className="text-[12.5px] font-medium text-text-primary flex-1">{e.label}</span>
            <ArrowRight size={13} className="text-text-tertiary group-hover:text-[#7C3AED] transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneratingRow({ draftCount, format }: { draftCount: number; format: CreativeFormatKind }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-3">
        <IrisGlyph size={20} spinning />
        <span className="text-[12px] font-medium text-text-primary">Drafting {format.toLowerCase()} concepts…</span>
        <span className="text-[11px] text-text-tertiary ml-auto">{Math.max(1, draftCount)} of {CREATIVE_AGENT.conceptsPerRun}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: CREATIVE_AGENT.conceptsPerRun }).map((_, i) => (
          <div key={i} className="rounded-card border border-border overflow-hidden bg-white">
            <div className={`bg-surface-secondary ${i < draftCount ? "animate-pulse" : ""}`} style={{ aspectRatio: "4 / 5" }} />
            <div className="p-2.5 space-y-1.5">
              <div className="h-2.5 rounded bg-surface-secondary w-3/4" />
              <div className="h-2 rounded bg-surface-secondary w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConceptCard({ concept, index, saved, onSave }: { concept: Concept; index: number; saved: boolean; onSave: () => void }) {
  const [resizeOpen, setResizeOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const Icon = FORMAT_ICON[concept.format];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08, ease: "easeOut" }}
      className="rounded-card border border-border overflow-hidden bg-white group"
    >
      {/* Preview */}
      <div className="relative overflow-hidden" style={{ aspectRatio: ASPECT[concept.ratio], background: `linear-gradient(135deg, hsl(${concept.hue} 55% 90%), hsl(${concept.hue} 45% 75%))` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={concept.src} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.05) 45%, transparent 70%)" }} />
        {/* Badges */}
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-white/85 backdrop-blur-sm text-[9.5px] font-semibold text-text-primary">
          <Icon size={10} strokeWidth={2} />
          {concept.format}
        </div>
        <span className="absolute top-2 right-2 px-1.5 h-5 inline-flex items-center rounded-full bg-black/35 backdrop-blur-sm text-[9.5px] font-medium text-white tabular-nums">
          {concept.ratio}
        </span>
        {/* Copy overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <div className="text-[12.5px] font-semibold leading-tight text-white" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
            {concept.hook}
          </div>
          <span className="inline-flex items-center mt-1.5 px-2 h-5 rounded-full bg-white text-[9.5px] font-semibold text-text-primary">
            {concept.cta}
          </span>
        </div>
      </div>

      {/* Meta + actions */}
      <div className="p-2.5">
        <div className="text-[10.5px] text-text-tertiary truncate">{concept.persona} · {concept.angleLabel}</div>
        <div className="flex items-center gap-1 mt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saved}
            className={`flex-1 inline-flex items-center justify-center gap-1 h-7 rounded-button text-[11.5px] font-medium transition-colors ${
              saved ? "bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]" : "bg-text-primary text-white hover:bg-black"
            }`}
          >
            {saved ? <BookmarkCheck size={12} strokeWidth={2} /> : <Bookmark size={12} strokeWidth={2} />}
            {saved ? "Saved" : "Save to library"}
          </button>
          <button type="button" onClick={() => setResizeOpen((v) => !v)} title="Resize" className="inline-flex items-center justify-center h-7 w-7 rounded-button border border-border bg-white text-text-secondary hover:text-text-primary hover:border-border-hover">
            <Maximize2 size={12} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => { setToast(true); setTimeout(() => setToast(false), 1600); }} title="Add to campaign" className="inline-flex items-center justify-center h-7 w-7 rounded-button border border-border bg-white text-text-secondary hover:text-text-primary hover:border-border-hover">
            <Megaphone size={12} strokeWidth={1.8} />
          </button>
        </div>

        {/* Resize variants */}
        {resizeOpen && (
          <div className="mt-2 flex items-end gap-2">
            {(["1:1", "4:5", "9:16"] as const).map((r) => (
              <div key={r} className="text-center">
                <div className="rounded-[5px] border border-border overflow-hidden" style={{ width: r === "9:16" ? 24 : r === "4:5" ? 32 : 36, aspectRatio: ASPECT[r] }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={concept.src} alt="" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="text-[8.5px] text-text-tertiary mt-0.5">{r}</div>
              </div>
            ))}
            <span className="text-[10px] text-text-tertiary ml-1 mb-3">Resized for every placement</span>
          </div>
        )}
        {toast && <div className="mt-1.5 text-[10.5px] text-[#15803D]">Added to a campaign draft ✓</div>}
      </div>
    </motion.div>
  );
}
