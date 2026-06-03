"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ConceptVersion, CreativeWorkspace, MockupField, SizeOption } from "./types";
import { SIZE_OPTIONS, getSize } from "./types";
import { AdMockup } from "./ad-mockup";

/** Card width chosen so 3 cards + the "+ Add size" tile fit on one row inside the modal. */
const CARD_W = 256;
/** Inner preview area each card reserves for the rendered preview. */
const PREVIEW_BOX_W = 232;
const PREVIEW_BOX_H = 232;

/** Compute the largest preview that fits in (maxW × maxH) while keeping the size's aspect ratio. */
function fitPreview(meta: SizeOption, maxW: number, maxH: number): { width: number; height: number } {
  const ratio = meta.aspectW / meta.aspectH;
  let h = maxH;
  let w = h * ratio;
  if (w > maxW) {
    w = maxW;
    h = w / ratio;
  }
  return { width: Math.round(w), height: Math.round(h) };
}

interface CreativeResizeEditorProps {
  workspace: CreativeWorkspace;
  isGenerating: boolean;
  onToggleSize: (sizeId: string) => void;
  /** Regenerate one size, optionally with a refinement prompt. */
  onRegenerateSize: (sizeId: string, refinementText?: string) => void;
  /** Restore the size's previous version (one-deep undo). */
  onUndoSize: (sizeId: string) => void;
  /** Canva-style inline edit on a single size's mockup. */
  onInlineEditSize: (sizeId: string, field: MockupField, value: string) => void;
  /** Inline edit on a single size's post text (primary_text). */
  onEditSizePostText: (sizeId: string, postText: string) => void;
  /** Register and select a user-defined custom size. */
  onAddCustomSize: (label: string, width: number, height: number) => void;
}

export function CreativeResizeEditor({
  workspace,
  isGenerating,
  onToggleSize,
  onRegenerateSize,
  onUndoSize,
  onInlineEditSize,
  onEditSizePostText,
  onAddCustomSize,
}: CreativeResizeEditorProps) {
  const selected = workspace.selected_sizes;
  // Per-size spinner — only the card being regenerated dims.
  const [activeRegenSizeId, setActiveRegenSizeId] = useState<string | null>(null);
  // Track which card has its inline refine textarea expanded.
  const [refineOpenFor, setRefineOpenFor] = useState<string | null>(null);
  // Track which size has the right-side Edit panel open (null = closed).
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  // Scroll the grid container — used to scroll new/edited cards into view.
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Resolve a size id against both built-in catalog and the workspace's
  // user-defined custom sizes.
  const resolveSize = (id: string): SizeOption | undefined =>
    getSize(id) ?? workspace.custom_sizes[id];

  // When the edit panel opens or a size is added, scroll that card into view
  // inside the grid so the user isn't editing something off-screen.
  useEffect(() => {
    if (!editingSizeId) return;
    const node = gridScrollRef.current?.querySelector<HTMLElement>(
      `[data-size-id="${CSS.escape(editingSizeId)}"]`
    );
    node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editingSizeId]);

  // Watch selected_sizes length — when it grows (a size was added), scroll
  // the newest card into view.
  const prevSelectedLen = useRef(selected.length);
  useEffect(() => {
    if (selected.length > prevSelectedLen.current) {
      const newestId = selected[selected.length - 1];
      requestAnimationFrame(() => {
        const node = gridScrollRef.current?.querySelector<HTMLElement>(
          `[data-size-id="${CSS.escape(newestId)}"]`
        );
        node?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    prevSelectedLen.current = selected.length;
  }, [selected]);

  // Clear the per-card spinner once the global generating flag flips back.
  useEffect(() => {
    if (!isGenerating && activeRegenSizeId) {
      setActiveRegenSizeId(null);
    }
  }, [isGenerating, activeRegenSizeId]);

  // Clear edit panel if the edited size gets removed.
  useEffect(() => {
    if (editingSizeId && !selected.includes(editingSizeId)) {
      setEditingSizeId(null);
    }
  }, [selected, editingSizeId]);

  const handleRegenerate = (sizeId: string, refinement?: string) => {
    setActiveRegenSizeId(sizeId);
    onRegenerateSize(sizeId, refinement);
  };

  // Unused built-in sizes — surface in the "+ Add size" popover.
  const unusedSizes = SIZE_OPTIONS.filter((s) => !selected.includes(s.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full overflow-hidden"
    >
      <div ref={gridScrollRef} className="flex-1 min-w-0 overflow-y-auto bg-surface-page p-6">
        <div className="flex flex-wrap gap-3 justify-center">
          {selected.map((sizeId) => {
            const sizeMeta = resolveSize(sizeId);
            const ver = workspace.size_versions[sizeId];
            const previousVer = workspace.size_previous[sizeId] ?? null;
            if (!sizeMeta) return null;
            const editOpen = editingSizeId === sizeId;
            return (
              <SizeCard
                key={sizeId}
                sizeId={sizeId}
                sizeMeta={sizeMeta}
                version={ver}
                previousVersion={previousVer}
                isRegen={activeRegenSizeId === sizeId}
                isGenerating={isGenerating}
                isLastSize={selected.length === 1}
                refineOpen={refineOpenFor === sizeId}
                editOpen={editOpen}
                onRegenerate={(refinement) => handleRegenerate(sizeId, refinement)}
                onOpenRefine={() => setRefineOpenFor(sizeId)}
                onCloseRefine={() => setRefineOpenFor(null)}
                onToggleEdit={() =>
                  setEditingSizeId((cur) => (cur === sizeId ? null : sizeId))
                }
                onUndo={() => onUndoSize(sizeId)}
                onRemove={() => onToggleSize(sizeId)}
                onInlineEdit={(field, value) => onInlineEditSize(sizeId, field, value)}
                onCommitPostText={(text) => onEditSizePostText(sizeId, text)}
              />
            );
          })}
          <AddSizeTile
            unusedSizes={unusedSizes}
            onAdd={onToggleSize}
            onAddCustom={onAddCustomSize}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  SizeCard                                                           */
/* ------------------------------------------------------------------ */

interface SizeCardProps {
  sizeId: string;
  sizeMeta: SizeOption;
  version: ConceptVersion | undefined;
  previousVersion: ConceptVersion | null;
  isRegen: boolean;
  isGenerating: boolean;
  isLastSize: boolean;
  refineOpen: boolean;
  editOpen: boolean;
  onRegenerate: (refinement?: string) => void;
  onOpenRefine: () => void;
  onCloseRefine: () => void;
  onToggleEdit: () => void;
  onUndo: () => void;
  onRemove: () => void;
  onInlineEdit: (field: MockupField, value: string) => void;
  onCommitPostText: (text: string) => void;
}

function SizeCard({
  sizeId,
  sizeMeta,
  version,
  previousVersion,
  isRegen,
  isGenerating,
  isLastSize,
  refineOpen,
  editOpen,
  onRegenerate,
  onOpenRefine,
  onCloseRefine,
  onToggleEdit,
  onUndo,
  onRemove,
  onInlineEdit,
  onCommitPostText,
}: SizeCardProps) {
  const sizeLabel = sizeMeta.label;
  const sizeDimensions = sizeMeta.dimensions;
  return (
    <div
      data-size-id={sizeId}
      className={`bg-white rounded-card overflow-hidden flex flex-col shrink-0 transition-shadow duration-150 ${
        editOpen ? "border-2 border-violet-400 shadow-[0_10px_30px_-10px_rgba(217,70,239,0.35)]" : "border border-border"
      }`}
      style={{ width: CARD_W }}
    >
      {/* Title block */}
      <div className="px-3 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-text-primary truncate">{sizeLabel}</div>
          <div className="text-[10px] text-text-tertiary tabular-nums">{sizeDimensions}</div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={isLastSize || isGenerating}
          title={isLastSize ? "At least one size is required" : "Remove this size"}
          className="inline-flex items-center justify-center h-6 w-6 text-text-tertiary hover:text-status-error hover:bg-surface-page rounded-button transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Remove size"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>

      {/* Action toolbar */}
      <div className="px-2 pb-2 border-b border-border-subtle flex items-center gap-1">
        <button
          type="button"
          onClick={() => onRegenerate()}
          disabled={isGenerating}
          className="flex-1 inline-flex items-center justify-center gap-1 h-7 text-[11px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page hover:text-text-primary transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Generate a fresh variant"
        >
          <RefreshCw size={11} strokeWidth={1.5} className={isRegen ? "animate-spin" : ""} />
          {isRegen ? "…" : "Regen"}
        </button>
        <button
          type="button"
          onClick={refineOpen ? onCloseRefine : onOpenRefine}
          disabled={isGenerating}
          className={`flex-1 inline-flex items-center justify-center gap-1 h-7 text-[11px] font-medium rounded-button transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
            refineOpen
              ? "bg-violet-50 text-violet-700 border border-violet-200"
              : "text-text-secondary border border-border bg-white hover:bg-surface-page hover:text-text-primary"
          }`}
          title="Regenerate with a prompt"
        >
          <Sparkles size={11} strokeWidth={1.5} />
          Refine
        </button>
        <button
          type="button"
          onClick={onToggleEdit}
          disabled={isGenerating}
          className={`flex-1 inline-flex items-center justify-center gap-1 h-7 text-[11px] font-medium rounded-button transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
            editOpen
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border border-transparent shadow-sm"
              : "text-text-secondary border border-border bg-white hover:bg-surface-page hover:text-text-primary"
          }`}
          title="Edit copy"
          aria-pressed={editOpen}
        >
          <Pencil size={11} strokeWidth={1.5} />
          {editOpen ? "Done" : "Edit"}
        </button>
        {previousVersion && !isGenerating && (
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center justify-center h-7 w-7 text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page hover:text-text-primary transition-colors duration-150"
            title="Undo last change"
            aria-label="Undo"
          >
            <RotateCcw size={11} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Preview — Canva-style inline edit when editOpen is true */}
      <div
        className="p-3 flex items-center justify-center bg-surface-page"
        style={{ height: PREVIEW_BOX_H + 24 }}
      >
        {version ? (() => {
          const dims = fitPreview(sizeMeta, PREVIEW_BOX_W, PREVIEW_BOX_H);
          return (
            <div
              className={`rounded-card overflow-hidden bg-white transition-all duration-200 ${
                editOpen
                  ? "border-2 border-violet-400 shadow-[0_8px_24px_-8px_rgba(217,70,239,0.4)]"
                  : "border border-border"
              }`}
              style={{
                width: dims.width,
                height: dims.height,
                opacity: isRegen ? 0.4 : 1,
              }}
            >
              <AdMockup
                variant={version.variant}
                headline={version.headline}
                mockup={version.mockup}
                onEditText={editOpen ? onInlineEdit : undefined}
              />
            </div>
          );
        })() : (
          <div className="text-[11px] text-text-tertiary">No preview yet</div>
        )}
      </div>

      {/* Post-text — readonly when not editing, textarea when editing */}
      {version && (
        <div className="px-3 py-2.5 border-t border-border-subtle bg-white">
          <div className="text-[9px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1 flex items-center gap-1">
            {editOpen && <Pencil size={9} strokeWidth={1.5} className="text-violet-500" />}
            Post text
          </div>
          {editOpen ? (
            <PostTextEditor
              key={`${version.id}-editor`}
              initial={version.primary_text}
              onCommit={onCommitPostText}
            />
          ) : (
            <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {version.primary_text}
            </p>
          )}
        </div>
      )}

      {/* Inline refine strip — still inline because it's just a quick prompt input */}
      <AnimatePresence>
        {refineOpen && (
          <RefineStrip
            onCancel={onCloseRefine}
            onSubmit={(text) => {
              onRegenerate(text);
              onCloseRefine();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline refine strip                                                */
/* ------------------------------------------------------------------ */

interface RefineStripProps {
  onCancel: () => void;
  onSubmit: (text: string) => void;
}

function RefineStrip({ onCancel, onSubmit }: RefineStripProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="border-t border-border-subtle bg-white overflow-hidden"
    >
      <div className="px-3 py-2.5 space-y-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What should change? e.g., 'darker palette', 'tighter crop'"
          rows={2}
          className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150 placeholder:text-text-tertiary resize-none leading-relaxed"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-7 px-2.5 text-[11px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(text.trim() || "")}
            className="inline-flex items-center gap-1 h-7 px-2.5 bg-accent text-white text-[11px] font-medium rounded-button hover:bg-accent-hover transition-colors"
          >
            <Sparkles size={10} strokeWidth={1.5} />
            Regenerate
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Post text inline editor — buffered textarea, commits on blur       */
/* ------------------------------------------------------------------ */

interface PostTextEditorProps {
  initial: string;
  onCommit: (text: string) => void;
}

function PostTextEditor({ initial, onCommit }: PostTextEditorProps) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) onCommit(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setValue(initial);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      rows={4}
      className="w-full px-2 py-1.5 text-[11px] border border-violet-200 rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150 resize-none leading-relaxed"
      placeholder="Edit post text…"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Add-size tile + popover                                            */
/* ------------------------------------------------------------------ */

interface AddSizeTileProps {
  unusedSizes: { id: string; label: string; dimensions: string }[];
  onAdd: (sizeId: string) => void;
  onAddCustom: (label: string, width: number, height: number) => void;
}

function AddSizeTile({ unusedSizes, onAdd, onAddCustom }: AddSizeTileProps) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0 flex" style={{ width: CARD_W }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[320px] border-2 border-dashed border-border rounded-card bg-white hover:bg-surface-page hover:border-violet-400/40 transition-colors duration-150 flex flex-col items-center justify-center gap-1.5 text-text-tertiary hover:text-text-primary"
      >
        <Plus size={20} strokeWidth={1.5} />
        <span className="text-[12px] font-medium">Add size</span>
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[240px] bg-white border border-border rounded-card shadow-lg overflow-hidden z-10">
          <div className="px-3 py-2 border-b border-border-subtle text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
            Add a size
          </div>
          <div className="py-1">
            {unusedSizes.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-text-tertiary">
                All standard sizes are in use.
              </div>
            )}
            {unusedSizes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onAdd(s.id);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-surface-page transition-colors"
              >
                <div className="text-[12px] font-medium text-text-primary">{s.label}</div>
                <div className="text-[10px] text-text-tertiary tabular-nums">{s.dimensions}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCustomOpen(true);
            }}
            className="w-full text-left px-3 py-2.5 border-t border-border-subtle bg-gradient-to-r from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 transition-colors flex items-center gap-2"
          >
            <Plus size={13} strokeWidth={1.5} className="text-violet-600" />
            <div>
              <div className="text-[12px] font-medium text-violet-700">Custom size…</div>
              <div className="text-[10px] text-text-tertiary">Pick your own width × height</div>
            </div>
          </button>
        </div>
      )}
      <AnimatePresence>
        {customOpen && (
          <CustomSizeDialog
            onCancel={() => setCustomOpen(false)}
            onSubmit={(label, w, h) => {
              onAddCustom(label, w, h);
              setCustomOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom-size dialog                                                 */
/* ------------------------------------------------------------------ */

interface CustomSizeDialogProps {
  onCancel: () => void;
  onSubmit: (label: string, width: number, height: number) => void;
}

function CustomSizeDialog({ onCancel, onSubmit }: CustomSizeDialogProps) {
  const [label, setLabel] = useState("Custom");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const valid =
    label.trim().length > 0 &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= 100 &&
    height >= 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[90] bg-black/30 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-card border border-border shadow-2xl w-full max-w-[380px] overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-border-subtle flex items-start justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold text-text-primary">Custom size</div>
            <div className="text-[11px] text-text-tertiary mt-0.5">
              Pick a label and dimensions in pixels.
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-page rounded-button transition-colors"
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Hero banner"
              className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                Width (px)
              </label>
              <input
                type="number"
                min={100}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-1">
                Height (px)
              </label>
              <input
                type="number"
                min={100}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-violet-500 transition-colors duration-150 tabular-nums"
              />
            </div>
          </div>
          <p className="text-[10px] text-text-tertiary leading-relaxed">
            Aspect ratio: {(width / Math.max(height, 1)).toFixed(2)} · {width}×{height}
          </p>
        </div>
        <div className="px-5 py-3 border-t border-border-subtle bg-surface-page flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(label.trim(), width, height)}
            disabled={!valid}
            className="h-8 px-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-[12px] font-medium rounded-button transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_3px_10px_-3px_rgba(139,92,246,0.5)]"
          >
            Add size
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
