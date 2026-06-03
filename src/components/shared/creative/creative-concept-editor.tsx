"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageSquare, Pencil, RefreshCw, Sparkles, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage, ConceptVersion, MockupField } from "./types";
import { CreativeChatPanel } from "./creative-chat-panel";
import { VersionTimeline } from "./version-timeline";
import { AdMockup } from "./ad-mockup";

interface CreativeConceptEditorProps {
  messages: ChatMessage[];
  versions: ConceptVersion[];
  activeVersionId: string | null;
  isGenerating: boolean;
  /** How many initial-concept tiles to show in the 2×2 picker (default 4). */
  pickerSlots?: number;
  onSendMessage: (text: string) => void;
  onSelectVersion: (versionId: string) => void;
  /** Re-enter picker mode and generate 4 fresh concepts. */
  onStartFresh: () => void;
  /** Apply a Canva-style inline text edit on the AdMockup. */
  onInlineEdit: (field: MockupField, value: string) => void;
  /** Commit the active concept and move to the Resize phase. */
  onFinalize: () => void;
}

export function CreativeConceptEditor({
  messages,
  versions,
  activeVersionId,
  isGenerating,
  pickerSlots = 4,
  onSendMessage,
  onSelectVersion,
  onStartFresh,
  onInlineEdit,
  onFinalize,
}: CreativeConceptEditorProps) {
  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? null;
  const isPickerMode = activeVersion === null;

  // Picker candidates = root-level versions with no descendants. After Start
  // fresh, prior chains stay in `versions` but their roots have descendants
  // (refinements / edits), so they're excluded from the picker grid.
  const hasDescendants = new Set<string>();
  for (const v of versions) {
    if (v.parent_id) hasDescendants.add(v.parent_id);
  }
  const pickerCandidates = versions.filter(
    (v) => v.parent_id === null && !hasDescendants.has(v.id)
  );

  // Find the user's original prompt — the first user message in the chat — to
  // surface in picker mode so the user can see what they asked for.
  const userPrompt = messages.find((m) => m.role === "user")?.text;

  // Edit toggle — flips the AdMockup into click-to-edit (Canva-style).
  // Available both on the Selected view and inside refine mode.
  const [editMode, setEditMode] = useState(false);
  // refineOpen flips between the lightweight Selected view (default after pick)
  // and the heavier 2-column refine view (chat + version strip).
  const [refineOpen, setRefineOpen] = useState(false);

  // When the user transitions from picker (null) → picked: reset to the
  // Selected view (not refine), and clear any leftover edit toggle.
  // Subsequent activeVersionId changes (e.g., inline edits create new versions)
  // should NOT reset these — otherwise inline editing would bounce out of edit
  // mode every keystroke commit.
  const prevActiveRef = useRef<string | null>(activeVersionId);
  useEffect(() => {
    if (prevActiveRef.current === null && activeVersionId !== null) {
      setRefineOpen(false);
      setEditMode(false);
    }
    prevActiveRef.current = activeVersionId;
  }, [activeVersionId]);

  if (isPickerMode) {
    return (
      <PickerMode
        slots={pickerSlots}
        concepts={pickerCandidates}
        userPrompt={userPrompt}
        isGenerating={isGenerating}
        onPick={onSelectVersion}
      />
    );
  }

  // Selected view: between picker and refine. Shows the picked concept + 3 CTAs.
  if (!refineOpen) {
    return (
      <SelectedView
        version={activeVersion!}
        editMode={editMode}
        isGenerating={isGenerating}
        onToggleEdit={() => setEditMode((v) => !v)}
        onEditWithAi={() => {
          setEditMode(false);
          setRefineOpen(true);
        }}
        onInlineEdit={onInlineEdit}
        onFinalize={onFinalize}
      />
    );
  }

  // Refine mode: 2-column layout
  return (
    <motion.div
      key="refine"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-[2fr_3fr] h-full divide-x divide-border"
    >
      {/* Left: Chat */}
      <div className="flex flex-col min-h-0">
        <CreativeChatPanel
          messages={messages}
          isGenerating={isGenerating}
          onSend={onSendMessage}
          isPickerMode={false}
          placeholder="Refine — e.g., 'make it more luxurious', 'use a darker palette'"
          emptyMessage="Send a message to refine this concept."
        />
      </div>

      {/* Right: header strip (version thumbs + actions) + active preview */}
      <div className="flex flex-col min-h-0">
        <div className="border-b border-border bg-white px-4 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <VersionTimeline
              versions={versions}
              activeVersionId={activeVersionId}
              onSelect={onSelectVersion}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onStartFresh}
              disabled={isGenerating}
              title="Generate 4 fresh concepts"
              className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-page rounded-button transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={11} strokeWidth={1.5} />
              Start fresh
            </button>
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              disabled={isGenerating}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium rounded-button border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                editMode
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-sm"
                  : "text-text-secondary border-border bg-white hover:bg-surface-page hover:text-text-primary"
              }`}
              aria-pressed={editMode}
            >
              <Pencil size={11} strokeWidth={1.5} />
              {editMode ? "Done" : "Edit"}
            </button>
            <button
              type="button"
              onClick={onFinalize}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-button transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_3px_10px_-3px_rgba(139,92,246,0.5)]"
            >
              Finalize
              <ArrowRight size={11} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Active preview — image only */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-surface-page">
          {activeVersion ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-5">
              <div className="text-center mb-3 min-h-[28px]">
                <AnimatePresence mode="wait">
                  {editMode ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent"
                    >
                      <Pencil size={11} strokeWidth={1.5} className="text-violet-500" />
                      Editing — click any text to change it
                    </motion.div>
                  ) : (
                    <motion.h3
                      key="label"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-[13px] font-semibold text-text-primary"
                    >
                      {activeVersion.label}
                    </motion.h3>
                  )}
                </AnimatePresence>
              </div>
              <motion.div
                key={activeVersion.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`aspect-square rounded-card overflow-hidden border bg-white transition-all duration-200 ${
                  editMode
                    ? "border-violet-400/60 shadow-[0_12px_40px_-12px_rgba(139,92,246,0.45)]"
                    : "border-border"
                }`}
                style={{ width: "min(100%, 460px)" }}
              >
                <AdMockup
                  variant={activeVersion.variant}
                  headline={activeVersion.headline}
                  mockup={activeVersion.mockup}
                  onEditText={editMode ? onInlineEdit : undefined}
                />
              </motion.div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Picker mode — full-width 2×2 grid, no chat panel                   */
/* ------------------------------------------------------------------ */

interface PickerModeProps {
  slots: number;
  concepts: ConceptVersion[];
  userPrompt: string | undefined;
  isGenerating: boolean;
  onPick: (versionId: string) => void;
}

function PickerMode({ slots, concepts, userPrompt, isGenerating, onPick }: PickerModeProps) {
  // Show concepts as they arrive; remaining slots show shimmer skeletons.
  const items = Array.from({ length: slots }, (_, i) => concepts[i] ?? null);
  const readyCount = concepts.length;

  return (
    <motion.div
      key="picker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-full overflow-y-auto bg-surface-page"
    >
      <div className="max-w-[920px] mx-auto px-6 py-6">
        {userPrompt && (
          <div className="mb-3 flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-text-primary flex items-center justify-center shrink-0 mt-0.5">
              <User size={11} strokeWidth={1.5} className="text-white" />
            </div>
            <div className="bg-text-primary text-white text-[12px] leading-relaxed rounded-card px-3 py-1.5 max-w-[80%]">
              {userPrompt}
            </div>
          </div>
        )}
        <div className="mb-4 flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Sparkles size={11} strokeWidth={1.5} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-text-primary leading-relaxed">
              {readyCount === slots
                ? "Here are 4 options — click one to refine it."
                : isGenerating
                ? `Generating option ${readyCount + 1} of ${slots}…`
                : "Generating your concepts…"}
            </p>
            {isGenerating && readyCount < slots && (
              <div className="mt-1.5 h-1 w-32 bg-surface-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(readyCount / slots) * 100}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <AnimatePresence>
            {items.map((concept, i) => (
              <PickerTile
                key={concept?.id ?? `slot-${i}`}
                concept={concept}
                index={i}
                onPick={onPick}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface PickerTileProps {
  concept: ConceptVersion | null;
  index: number;
  onPick: (versionId: string) => void;
}

function PickerTile({ concept, index, onPick }: PickerTileProps) {
  if (!concept) {
    // Skeleton with shimmer sweep — Canva/Linear style.
    return (
      <div className="aspect-square rounded-card overflow-hidden border border-border bg-white relative">
        <div className="absolute inset-0 bg-surface-secondary" />
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "400%" }}
          transition={{
            duration: 1.2,
            ease: "linear",
            repeat: Infinity,
            delay: index * 0.15,
          }}
        />
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <span className="h-2 w-2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse" />
          Option {index + 1}
        </div>
      </div>
    );
  }
  return (
    <motion.button
      type="button"
      onClick={() => onPick(concept.id)}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="text-left aspect-square rounded-card overflow-hidden border-2 border-border hover:border-violet-400 hover:ring-2 hover:ring-violet-400/30 hover:shadow-[0_8px_24px_-8px_rgba(139,92,246,0.35)] transition-all duration-150 bg-white relative group"
      title={concept.label}
    >
      <AdMockup variant={concept.variant} headline={concept.headline} mockup={concept.mockup} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
        <div className="text-[11px] font-medium text-white truncate">{concept.label}</div>
      </div>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Selected view — between picker and refine                          */
/* ------------------------------------------------------------------ */

interface SelectedViewProps {
  version: ConceptVersion;
  editMode: boolean;
  isGenerating: boolean;
  onToggleEdit: () => void;
  onEditWithAi: () => void;
  onInlineEdit: (field: MockupField, value: string) => void;
  onFinalize: () => void;
}

function SelectedView({
  version,
  editMode,
  isGenerating,
  onToggleEdit,
  onEditWithAi,
  onInlineEdit,
  onFinalize,
}: SelectedViewProps) {
  return (
    <motion.div
      key="selected"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full overflow-y-auto bg-surface-page"
    >
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center mb-3 min-h-[24px]">
          <AnimatePresence mode="wait">
            {editMode ? (
              <motion.div
                key="edit-hint"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent"
              >
                <Pencil size={11} strokeWidth={1.5} className="text-violet-500" />
                Editing — click any text to change it
              </motion.div>
            ) : (
              <motion.div
                key="picked-label"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-[12px] text-text-tertiary"
              >
                Picked: <span className="font-semibold text-text-primary">{version.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          key={version.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`aspect-square rounded-card overflow-hidden border bg-white transition-all duration-200 ${
            editMode
              ? "border-violet-400/60 shadow-[0_12px_40px_-12px_rgba(139,92,246,0.45)]"
              : "border-border shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)]"
          }`}
          style={{ width: "min(100%, 460px)" }}
        >
          <AdMockup
            variant={version.variant}
            headline={version.headline}
            mockup={version.mockup}
            onEditText={editMode ? onInlineEdit : undefined}
          />
        </motion.div>

        <div className="mt-5 flex items-center gap-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={onToggleEdit}
            disabled={isGenerating}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 text-[12px] font-medium rounded-button border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              editMode
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-sm"
                : "text-text-secondary border-border bg-white hover:bg-surface-page hover:text-text-primary"
            }`}
            aria-pressed={editMode}
          >
            <Pencil size={12} strokeWidth={1.5} />
            {editMode ? "Done" : "Edit inline"}
          </button>
          <button
            type="button"
            onClick={onEditWithAi}
            disabled={isGenerating || editMode}
            title={editMode ? "Finish inline edits first" : "Open chat refine view"}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[12px] font-medium text-text-secondary border border-border bg-white hover:bg-surface-page hover:text-text-primary rounded-button transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageSquare size={12} strokeWidth={1.5} />
            Edit with AI
          </button>
          <button
            type="button"
            onClick={onFinalize}
            disabled={isGenerating || editMode}
            title={editMode ? "Finish inline edits first" : undefined}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-[12px] font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-button transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_14px_-4px_rgba(139,92,246,0.5)]"
          >
            Finalize concept
            <ArrowRight size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
