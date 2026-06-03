"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Hexagon,
  ImageIcon,
  Paperclip,
  Pencil,
  Sparkles,
  Target,
  Upload,
  X,
} from "lucide-react";
import type { AttachedImage, CreativeStrategy, CreativeWorkspace } from "./types";
import {
  BRAND_GUIDELINES,
  findSample,
  type ImageSample,
  PROJECT_IMAGES,
  REFERENCE_ADS,
} from "./image-gallery";

interface CreativeSetupPanelProps {
  workspace: CreativeWorkspace;
  onPromptChange: (text: string) => void;
  onAttachStyleRef: (image: AttachedImage | null) => void;
  onAttachProjectImage: (image: AttachedImage | null) => void;
  onAttachBrandLogo: (image: AttachedImage | null) => void;
  onToggleBrandGuidelines: () => void;
  onToggleCreativeStrategy: () => void;
  onUpdateStrategy: (next: CreativeStrategy) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const EXAMPLE_PROMPTS = [
  "Premium 3BHK in Whitefield with zen-garden lifestyle",
  "Family-friendly luxury — emphasize amenities & community",
  "Investment angle for NRI buyers — highlight RERA + rental yield",
];

export function CreativeSetupPanel({
  workspace,
  onPromptChange,
  onAttachStyleRef,
  onAttachProjectImage,
  onAttachBrandLogo,
  onToggleBrandGuidelines,
  onToggleCreativeStrategy,
  onUpdateStrategy,
  onGenerate,
  isGenerating,
}: CreativeSetupPanelProps) {
  const promptOk = workspace.prompt.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full flex flex-col items-center justify-center px-6"
    >
      <div className="w-full max-w-[780px] space-y-5">
        {/* Headline */}
        <div className="text-center space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Imagine · Create · Captivate
          </div>
          <h2 className="text-[22px] font-semibold text-text-primary">Create your ad</h2>
          <p className="text-[12px] text-text-tertiary">
            Describe what you want — attach context as you go.
          </p>
        </div>

        {/* Chatbox — overflow-visible so attachment popovers can pop out */}
        <div className="bg-white rounded-[16px] border border-violet-200/60 shadow-[0_8px_30px_-12px_rgba(124,58,237,0.18)] overflow-hidden">
          {/* Creative Strategy banner — sits above the prompt for prominence */}
          <StrategyPill
            asBanner
            active={workspace.creative_strategy_attached}
            onToggle={onToggleCreativeStrategy}
            strategy={workspace.strategy}
            onUpdate={onUpdateStrategy}
          />
          <div className="flex items-end gap-2 px-4 pt-4 pb-3">
            <Sparkles size={16} strokeWidth={1.5} className="text-violet-500 shrink-0 mb-2" />
            <textarea
              value={workspace.prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (promptOk && !isGenerating) onGenerate();
                }
              }}
              placeholder="Describe the ad you want to create. Include product details, target audience, and desired style…"
              rows={2}
              className="flex-1 px-1 py-1 text-[13px] bg-transparent text-text-primary focus:outline-none placeholder:text-text-tertiary resize-none leading-relaxed"
            />
            <button
              type="button"
              onClick={onGenerate}
              disabled={!promptOk || isGenerating}
              className="inline-flex items-center gap-1 h-9 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-[13px] font-medium rounded-[8px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-[0_4px_14px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_6px_18px_-4px_rgba(139,92,246,0.6)]"
            >
              {isGenerating ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  Go
                  <ArrowRight size={13} strokeWidth={1.5} />
                </>
              )}
            </button>
          </div>

          {/* Pills row */}
          <div className="px-3 pb-3 flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3 bg-surface-page/40">
            <ImagePickerPill
              icon={<ImageIcon size={12} strokeWidth={1.5} />}
              label="Project Image"
              library={PROJECT_IMAGES}
              attached={workspace.project_image}
              onAttach={onAttachProjectImage}
              uploadLabel="Upload your own image"
              uploadedName="my-project-image.jpg"
              moreLabel="View more"
            />
            <ImagePickerPill
              icon={<Paperclip size={12} strokeWidth={1.5} />}
              label="Reference Ad"
              library={REFERENCE_ADS}
              attached={workspace.style_reference}
              onAttach={onAttachStyleRef}
              uploadLabel="Upload your own ad"
              uploadedName="my-reference-ad.jpg"
              moreLabel="Browse Library"
            />
            <SimpleUploadPill
              icon={<Hexagon size={12} strokeWidth={1.5} />}
              label="Upload Logo"
              uploadedName="brand-logo.svg"
              attached={workspace.brand_logo}
              onAttach={onAttachBrandLogo}
            />
            <BrandGuidelinesPill
              active={workspace.brand_guidelines_attached}
              onToggle={onToggleBrandGuidelines}
            />
          </div>
        </div>

        {/* Example prompts */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-text-tertiary mr-1">Try:</span>
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPromptChange(p)}
              className="text-[11px] text-text-secondary bg-white border border-border hover:bg-surface-page hover:text-text-primary px-2.5 py-1 rounded-button transition-colors duration-150"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Popover root — shared placement helper                             */
/* ------------------------------------------------------------------ */

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      // Click on the trigger — handled by its own onClick, leave open state alone.
      if (ref.current?.contains(target)) return;
      // Click inside any portaled popover — keep open so the click can land on
      // the intended interactive element (e.g., a sample tile inside the popover).
      if (target.closest('[data-popover-content="true"]')) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/* ------------------------------------------------------------------ */
/*  Portal popover — opens upward from the anchor pill,                */
/*  rendered to document.body so it escapes any clipping ancestor.     */
/* ------------------------------------------------------------------ */

interface PopoverPortalProps {
  open: boolean;
  /** The pill/button the popover anchors to. */
  anchorRef: React.RefObject<HTMLElement>;
  width: number;
  children: React.ReactNode;
}

function PopoverPortal({ open, anchorRef, width, children }: PopoverPortalProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Anchor the popover's bottom 8px above the pill's top.
      let left = r.left;
      // Keep it inside viewport horizontally.
      const maxLeft = window.innerWidth - width - 8;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      if (left < 8) left = 8;
      setPos({ top: r.top, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorRef]);

  if (!open || !pos || typeof window === "undefined") return null;

  return createPortal(
    <div
      data-popover-content="true"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width,
        // Lift the popover so its bottom edge sits 8px above the pill top.
        transform: "translateY(-100%) translateY(-8px)",
        zIndex: 100,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*  Image picker pill — popover with a small gallery of samples        */
/* ------------------------------------------------------------------ */

interface ImagePickerPillProps {
  icon: React.ReactNode;
  label: string;
  library: ImageSample[];
  attached: AttachedImage | null;
  onAttach: (image: AttachedImage | null) => void;
  /** Filename used when the user picks "Upload your own". */
  uploadLabel: string;
  uploadedName: string;
  /** Label for the bottom action — "View more" or "Browse Library". */
  moreLabel: string;
}

function ImagePickerPill({
  icon,
  label,
  library,
  attached,
  onAttach,
  uploadLabel,
  uploadedName,
  moreLabel,
}: ImagePickerPillProps) {
  const { open, setOpen, ref } = usePopover();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const attachedSample = attached ? findSample(library, attached.sampleId) : null;

  return (
    <div ref={ref} className="relative inline-flex">
      {attached ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 h-7 pl-1 pr-1.5 text-[11px] font-medium text-violet-700 border border-violet-300 bg-violet-50 rounded-full"
        >
          <span className="relative h-5 w-5 rounded-[3px] overflow-hidden border border-violet-300 bg-white shrink-0">
            {attachedSample ? (
              attachedSample.render()
            ) : (
              <span className="absolute inset-0 bg-gradient-to-br from-violet-200 to-fuchsia-200 flex items-center justify-center text-violet-700 text-[8px] font-semibold">
                ↑
              </span>
            )}
          </span>
          <span className="max-w-[120px] truncate">{attached.name}</span>
          <span
            role="button"
            aria-label={`Remove ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onAttach(null);
            }}
            className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-violet-200 transition-colors"
          >
            <X size={10} strokeWidth={1.5} />
          </span>
        </button>
      ) : (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-text-secondary border border-border bg-white hover:bg-surface-page hover:border-border-hover hover:text-text-primary rounded-full transition-colors duration-150"
        >
          {icon}
          {label}
        </button>
      )}
      <PopoverPortal open={open} anchorRef={anchorRef} width={320}>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-border rounded-card shadow-lg overflow-hidden flex flex-col max-h-[60vh]"
        >
            <div className="px-4 py-2.5 border-b border-border-subtle shrink-0">
              <div className="text-[12px] font-semibold text-text-primary">Pick {label}</div>
              <div className="text-[10px] text-text-tertiary mt-0.5">
                Upload your own, or pick from the gallery.
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Upload row — always first */}
              <button
                type="button"
                onClick={() => {
                  onAttach({ sampleId: "__upload__", name: uploadedName });
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-50 transition-colors text-left border-b border-border-subtle"
              >
                <span className="w-9 h-9 rounded-[6px] bg-gradient-to-br from-violet-100 to-fuchsia-100 border border-violet-200/60 flex items-center justify-center text-violet-600 shrink-0">
                  <Upload size={14} strokeWidth={1.5} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium text-text-primary truncate">{uploadLabel}</span>
                  <span className="block text-[10px] text-text-tertiary truncate">From your device</span>
                </span>
              </button>
              {/* Gallery samples */}
              <div className="px-3 py-2.5">
                <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                  From gallery
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {library.map((s) => {
                    const isAttached = attached?.sampleId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onAttach({ sampleId: s.id, name: s.name });
                          setOpen(false);
                        }}
                        className={`relative aspect-square rounded-[6px] overflow-hidden border-2 transition-colors duration-150 ${
                          isAttached
                            ? "border-violet-400 ring-2 ring-violet-400/30"
                            : "border-border hover:border-violet-300"
                        }`}
                        title={s.name}
                      >
                        {s.render()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {/* Footer — View more / Browse Library */}
            <div className="border-t border-border-subtle bg-surface-page px-3 py-2 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                className="text-[11px] font-medium text-violet-600 hover:text-violet-700 transition-colors"
                title="Coming soon"
              >
                {moreLabel} →
              </button>
              {attached && (
                <button
                  type="button"
                  onClick={() => {
                    onAttach(null);
                    setOpen(false);
                  }}
                  className="text-[11px] font-medium text-text-tertiary hover:text-status-error transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
        </motion.div>
      </PopoverPortal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single-upload pill — no popover, just toggles a single attachment  */
/* ------------------------------------------------------------------ */

interface SimpleUploadPillProps {
  icon: React.ReactNode;
  label: string;
  uploadedName: string;
  attached: AttachedImage | null;
  onAttach: (image: AttachedImage | null) => void;
}

function SimpleUploadPill({ icon, label, uploadedName, attached, onAttach }: SimpleUploadPillProps) {
  if (attached) {
    return (
      <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 text-[11px] font-medium text-violet-700 border border-violet-300 bg-violet-50 rounded-full">
        {icon}
        <span className="max-w-[120px] truncate">{attached.name}</span>
        <button
          type="button"
          onClick={() => onAttach(null)}
          aria-label={`Remove ${label}`}
          className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-violet-200 transition-colors"
        >
          <X size={10} strokeWidth={1.5} />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onAttach({ sampleId: "__upload__", name: uploadedName })}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-text-secondary border border-border bg-white hover:bg-surface-page hover:border-border-hover hover:text-text-primary rounded-full transition-colors duration-150"
    >
      <Upload size={12} strokeWidth={1.5} />
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand Guidelines pill — popover with a sample brand sheet          */
/* ------------------------------------------------------------------ */

interface BrandGuidelinesPillProps {
  active: boolean;
  onToggle: () => void;
}

function BrandGuidelinesPill({ active, onToggle }: BrandGuidelinesPillProps) {
  const { open, setOpen, ref } = usePopover();
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 text-[11px] font-medium rounded-full border transition-colors duration-150 ${
          active
            ? "text-violet-600 border-violet-300 bg-violet-50"
            : "text-text-secondary border-border bg-white hover:bg-surface-page hover:border-border-hover hover:text-text-primary"
        }`}
      >
        <BookOpen size={12} strokeWidth={1.5} />
        Brand Guidelines
        <ChevronDown size={11} strokeWidth={1.5} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      <PopoverPortal open={open} anchorRef={anchorRef} width={340}>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-border rounded-card shadow-lg overflow-hidden flex flex-col max-h-[60vh]"
        >
            <div className="px-4 py-3 border-b border-border-subtle flex items-start justify-between gap-2 shrink-0">
              <div>
                <div className="text-[12px] font-semibold text-text-primary">Brand Guidelines</div>
                <div className="text-[10px] text-text-tertiary">Godrej Properties · v2.4</div>
              </div>
              <div className="text-[9px] text-text-tertiary uppercase tracking-[0.5px]">.brand</div>
            </div>
            <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
              <div>
                <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                  Voice
                </div>
                <div className="flex flex-wrap gap-1">
                  {BRAND_GUIDELINES.voice.map((v) => (
                    <span
                      key={v}
                      className="text-[10px] font-medium text-text-primary bg-surface-page border border-border-subtle rounded-button px-1.5 py-0.5"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                  Colors
                </div>
                <div className="flex items-center gap-2">
                  {BRAND_GUIDELINES.colors.map((c) => (
                    <div key={c.hex} className="flex flex-col items-center gap-0.5" title={`${c.name} · ${c.hex}`}>
                      <div className="w-7 h-7 rounded-[6px] border border-border-subtle" style={{ background: c.hex }} />
                      <div className="text-[8px] text-text-tertiary tabular-nums">{c.hex}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                  Typography
                </div>
                <div className="text-[11px] text-text-primary">
                  <span className="font-bold">{BRAND_GUIDELINES.typography.heading}</span>
                  <span className="text-text-tertiary"> · headings</span>
                </div>
                <div className="text-[11px] text-text-primary">
                  {BRAND_GUIDELINES.typography.body}
                  <span className="text-text-tertiary"> · body</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                  Copy rules
                </div>
                <ul className="space-y-1">
                  {BRAND_GUIDELINES.rules.map((r) => (
                    <li key={r} className="text-[11px] text-text-secondary leading-snug flex gap-1.5">
                      <span className="text-text-tertiary">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-border-subtle bg-surface-page flex items-center justify-between shrink-0">
              <span className="text-[11px] text-text-tertiary">
                {active ? "Attached to your prompt" : "Not attached"}
              </span>
              <button
                type="button"
                onClick={onToggle}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-button transition-colors ${
                  active
                    ? "text-text-secondary hover:text-text-primary hover:bg-white"
                    : "text-violet-600 hover:text-violet-700 bg-white border border-violet-300 hover:bg-violet-50"
                }`}
              >
                {active ? "Detach" : "Attach"}
              </button>
            </div>
        </motion.div>
      </PopoverPortal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Creative Strategy pill — editable inline                           */
/* ------------------------------------------------------------------ */

interface StrategyPillProps {
  active: boolean;
  onToggle: () => void;
  strategy: CreativeStrategy;
  onUpdate: (next: CreativeStrategy) => void;
  /** When true, renders as a wide highlighted banner instead of a small pill. */
  asBanner?: boolean;
}

function StrategyPill({ active, onToggle, strategy, onUpdate, asBanner = false }: StrategyPillProps) {
  const { open, setOpen, ref } = usePopover();
  const anchorRef = useRef<HTMLButtonElement>(null);
  // Local buffer — only used while in edit mode.
  const [draft, setDraft] = useState(strategy);
  const [editing, setEditing] = useState(false);
  // Re-seed and exit edit mode whenever the popover (re)opens.
  useEffect(() => {
    if (open) {
      setDraft(strategy);
      setEditing(false);
    }
  }, [open, strategy]);

  const dirty =
    draft.painPoint !== strategy.painPoint ||
    draft.usp !== strategy.usp ||
    draft.hook !== strategy.hook ||
    draft.cta !== strategy.cta;

  const handleSave = () => {
    onUpdate(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(strategy);
    setEditing(false);
  };

  const fields: Array<{ key: keyof CreativeStrategy; label: string; multiline?: boolean }> = [
    { key: "painPoint", label: "Pain point", multiline: true },
    { key: "usp", label: "USP", multiline: true },
    { key: "hook", label: "Hook", multiline: true },
    { key: "cta", label: "CTA" },
  ];

  return (
    <div ref={ref} className={asBanner ? "block w-full" : "relative inline-flex"}>
      {asBanner ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => {
            if (!active) onToggle();
            setOpen((o) => !o);
          }}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-violet-50 hover:from-violet-100 hover:via-fuchsia-100 hover:to-violet-100 border-b border-violet-200/70 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-sm shrink-0">
              <Target size={13} strokeWidth={1.5} className="text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.5px] bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Creative Strategy
              </span>
              <span className="block text-[11px] text-text-secondary truncate">
                {strategy.angleName}
                {strategy.personaName ? ` · ${strategy.personaName}` : ""}
              </span>
            </span>
          </div>
          <span className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                active
                  ? "bg-violet-100 text-violet-700 border border-violet-300"
                  : "bg-white text-text-tertiary border border-border"
              }`}
            >
              {active ? "Attached" : "Tap to attach"}
            </span>
            <ChevronDown
              size={13}
              strokeWidth={1.5}
              className={`text-violet-600 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      ) : (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => {
            if (!active) onToggle();
            setOpen((o) => !o);
          }}
          className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 text-[11px] font-medium rounded-full border transition-colors duration-150 ${
            active
              ? "text-violet-600 border-violet-300 bg-violet-50"
              : "text-text-secondary border-border bg-white hover:bg-surface-page hover:border-border-hover hover:text-text-primary"
          }`}
        >
          <Target size={12} strokeWidth={1.5} />
          Creative Strategy
          <ChevronDown size={11} strokeWidth={1.5} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      )}
      <PopoverPortal open={open} anchorRef={anchorRef} width={360}>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="bg-white border border-border rounded-card shadow-lg overflow-hidden flex flex-col max-h-[60vh]"
        >
            <div className="px-4 py-3 border-b border-border-subtle flex items-start justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-text-primary truncate">{strategy.angleName}</div>
                <div className="text-[11px] text-text-tertiary truncate">
                  {strategy.personaName}
                  {strategy.personaRole && <span> · {strategy.personaRole}</span>}
                </div>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  title="Edit strategy"
                  className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-full hover:bg-violet-100 transition-colors shrink-0"
                >
                  <Pencil size={10} strokeWidth={1.5} />
                  Edit
                </button>
              )}
            </div>
            <div className="px-4 py-3 space-y-3 overflow-y-auto flex-1">
              {fields.map((f) => (
                <div key={f.key}>
                  <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                    {f.label}
                  </div>
                  {editing ? (
                    f.multiline ? (
                      <textarea
                        value={draft[f.key] as string}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        rows={2}
                        className="w-full px-2 py-1.5 text-[12px] border border-violet-300 rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150 resize-none leading-relaxed"
                      />
                    ) : (
                      <input
                        type="text"
                        value={draft[f.key] as string}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        className="w-full px-2 py-1.5 text-[12px] border border-violet-300 rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150"
                      />
                    )
                  ) : (
                    <p className="text-[12px] text-text-primary leading-snug whitespace-pre-wrap">
                      {(strategy[f.key] as string) || (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border-subtle bg-surface-page flex items-center justify-between gap-2 shrink-0">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-button text-text-tertiary hover:text-text-primary hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-button bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_3px_10px_-3px_rgba(139,92,246,0.5)]"
                  >
                    Save changes
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-text-tertiary">
                    {active ? "Attached to your prompt" : "Not attached"}
                  </span>
                  <button
                    type="button"
                    onClick={onToggle}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-button transition-colors ${
                      active
                        ? "text-text-secondary hover:text-text-primary hover:bg-white"
                        : "text-violet-600 hover:text-violet-700 bg-white border border-violet-300 hover:bg-violet-50"
                    }`}
                  >
                    {active ? "Detach" : "Attach"}
                  </button>
                </>
              )}
            </div>
        </motion.div>
      </PopoverPortal>
    </div>
  );
}
