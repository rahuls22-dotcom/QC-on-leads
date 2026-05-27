"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type {
  AttachedImage,
  ChatMessage,
  ConceptVersion,
  CreativePhase,
  CreativeStrategy,
  CreativeWorkspace,
  GeneratedCreative,
  MockupCopyProjectContext,
  MockupField,
  WorkspacePreAttach,
} from "./creative/types";
import {
  emptyWorkspace,
  getSize,
  makeInlineEditedVersion,
  makeMockReply,
  makeMockVersion,
  mkId,
} from "./creative/types";
import { CreativeSetupPanel } from "./creative/creative-setup-panel";
import { CreativeConceptEditor } from "./creative/creative-concept-editor";
import { CreativeResizeEditor } from "./creative/creative-resize-editor";

/* ------------------------------------------------------------------ */
/*  Public types — preserved so consumers don't change                 */
/* ------------------------------------------------------------------ */

export type { GeneratedCreative };

interface CreativeGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (creatives: GeneratedCreative[]) => void;
  angleName: string;
  personaName: string;
  personaRole?: string;
  personaBullets?: string[];
  painPoint?: string;
  usp?: string;
  hook: string;
  cta: string;
  /**
   * When launched from a project page, pre-fill mockup copy with the
   * project's real RERA / builder / price / typology / name so the
   * variants don't ship with Godrej-Air defaults.
   */
  projectContext?: MockupCopyProjectContext;
  /**
   * Pre-attach brand logo, project image, brand-guidelines toggle, and
   * strategy-attached toggle so the user lands in Setup with everything
   * already wired from the project's knowledge base.
   */
  preAttach?: WorkspacePreAttach;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" as const } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

const PHASES: { id: CreativePhase; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "concept", label: "Concept" },
  { id: "resize", label: "Resize" },
];

const MOCK_LATENCY_MS = 1400;
const INITIAL_CONCEPT_COUNT = 4;
/** Stagger delays (ms) for the 4 initial concept reveals. */
const INITIAL_REVEAL_DELAYS = [600, 950, 1300, 1650] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CreativeGeneratorModal({
  open,
  onClose,
  onComplete,
  angleName,
  personaName,
  personaRole,
  painPoint,
  usp,
  hook,
  cta,
  projectContext,
  preAttach,
}: CreativeGeneratorModalProps) {
  const [phase, setPhase] = useState<CreativePhase>("setup");
  const [workspace, setWorkspace] = useState<CreativeWorkspace>(() =>
    emptyWorkspace(
      {
        angleName,
        personaName,
        personaRole,
        painPoint: painPoint ?? "",
        usp: usp ?? "",
        hook,
        cta,
      },
      preAttach,
    ),
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset state whenever the modal is opened — re-seed the strategy from props.
  useEffect(() => {
    if (!open) return;
    setPhase("setup");
    setWorkspace(
      emptyWorkspace(
        {
          angleName,
          personaName,
          personaRole,
          painPoint: painPoint ?? "",
          usp: usp ?? "",
          hook,
          cta,
        },
        preAttach,
      ),
    );
    setIsGenerating(false);
  }, [open, angleName, personaName, personaRole, painPoint, usp, hook, cta, preAttach]);

  /* ---------- Phase A handlers ---------- */

  const handlePromptChange = (text: string) =>
    setWorkspace((w) => ({ ...w, prompt: text }));

  const handleAttachStyleRef = (image: AttachedImage | null) =>
    setWorkspace((w) => ({ ...w, style_reference: image }));

  const handleAttachProjectImage = (image: AttachedImage | null) =>
    setWorkspace((w) => ({ ...w, project_image: image }));

  const handleAttachBrandLogo = (image: AttachedImage | null) =>
    setWorkspace((w) => ({ ...w, brand_logo: image }));

  const handleToggleBrandGuidelines = () =>
    setWorkspace((w) => ({ ...w, brand_guidelines_attached: !w.brand_guidelines_attached }));

  const handleToggleCreativeStrategy = () =>
    setWorkspace((w) => ({ ...w, creative_strategy_attached: !w.creative_strategy_attached }));

  const handleUpdateStrategy = (next: CreativeStrategy) =>
    setWorkspace((w) => ({ ...w, strategy: next }));

  const handleGenerateInitialConcepts = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    const userMessage: ChatMessage = {
      id: mkId("msg"),
      role: "user",
      text: workspace.prompt,
      created_at: Date.now(),
    };
    const pendingMessage: ChatMessage = {
      id: mkId("msg"),
      role: "ai",
      text: "Generating 4 options…",
      pending: true,
      created_at: Date.now(),
    };
    setWorkspace((w) => ({
      ...w,
      concept_messages: [userMessage, pendingMessage],
      // Clear any prior state so re-entering Setup → Generate starts cleanly.
      concept_versions: [],
      active_concept_version_id: null,
    }));
    setPhase("concept");

    // Stagger 4 root-level concepts, each using a different variant so the grid
    // shows visual variety. Active version stays null until the user picks one.
    for (let i = 0; i < INITIAL_CONCEPT_COUNT; i++) {
      const variant = ((i + 1) as 1 | 2 | 3 | 4);
      const isLast = i === INITIAL_CONCEPT_COUNT - 1;
      window.setTimeout(() => {
        const newVer = makeMockVersion({
          parent_id: null,
          preferVariant: variant,
          labelPrefix: `Option ${i + 1}`,
          projectContext,
        });
        setWorkspace((w) => ({
          ...w,
          concept_versions: [...w.concept_versions, newVer],
        }));
        if (isLast) {
          const aiReply: ChatMessage = {
            id: mkId("msg"),
            role: "ai",
            text: "Here are 4 options — click one to refine it, or generate more.",
            created_at: Date.now(),
          };
          setWorkspace((w) => {
            const messagesWithoutPending = w.concept_messages.filter((m) => !m.pending);
            return {
              ...w,
              concept_messages: [...messagesWithoutPending, aiReply],
            };
          });
          setIsGenerating(false);
        }
      }, INITIAL_REVEAL_DELAYS[i]);
    }
  };

  /* ---------- Phase B handlers ---------- */

  /**
   * Pick a concept. When the user is in picker mode (no active version yet),
   * we prune any unpicked root-level options — they were exploration candidates
   * and the user has now committed to one. Root versions that already have
   * descendants (e.g., a prior chain after "Start fresh") are preserved.
   */
  const handleSelectConceptVersion = (versionId: string) => {
    setWorkspace((w) => {
      const wasPickerMode = w.active_concept_version_id === null;
      let nextVersions = w.concept_versions;
      let nextMessages = w.concept_messages;
      if (wasPickerMode) {
        const hasDescendants = new Set<string>();
        for (const v of w.concept_versions) {
          if (v.parent_id) hasDescendants.add(v.parent_id);
        }
        nextVersions = w.concept_versions.filter(
          (v) =>
            v.id === versionId ||
            v.parent_id !== null ||
            hasDescendants.has(v.id)
        );
        // Acknowledge the pick in the chat. Drop the picker prompt
        // ("Here are 4 options…") since the user has now picked one.
        const picked = w.concept_versions.find((v) => v.id === versionId);
        const pickName = picked?.label ?? "that one";
        const filtered = w.concept_messages.filter(
          (m) =>
            !(
              m.role === "ai" &&
              (m.text.startsWith("Here are 4 options") ||
                m.text.startsWith("Fresh batch"))
            )
        );
        nextMessages = [
          ...filtered,
          {
            id: mkId("msg"),
            role: "ai",
            text: `Great choice — let's refine ${pickName} further. Tell me what to tweak, or use Edit on the preview.`,
            created_at: Date.now(),
          },
        ];
      }
      return {
        ...w,
        concept_versions: nextVersions,
        active_concept_version_id: versionId,
        concept_messages: nextMessages,
      };
    });
  };

  /**
   * Start fresh — re-enter picker mode with 4 newly-generated concepts. The
   * user's prior chain stays in history (its root has descendants, so it
   * survives the next pick's pruning step).
   */
  const handleStartFresh = () => {
    if (isGenerating) return;
    setIsGenerating(true);

    // How many "starts" have happened — count root-level versions w/ descendants.
    const previousChains = workspace.concept_versions.filter((v) => {
      if (v.parent_id !== null) return false;
      return workspace.concept_versions.some((c) => c.parent_id === v.id);
    }).length;
    const round = previousChains + 1;

    setWorkspace((w) => ({ ...w, active_concept_version_id: null }));

    // Stagger 4 fresh root concepts, all four variants.
    for (let i = 0; i < INITIAL_CONCEPT_COUNT; i++) {
      const variant = ((i + 1) as 1 | 2 | 3 | 4);
      const isLast = i === INITIAL_CONCEPT_COUNT - 1;
      window.setTimeout(() => {
        const newVer = makeMockVersion({
          parent_id: null,
          preferVariant: variant,
          labelPrefix: `Option ${i + 1} · round ${round}`,
          projectContext,
        });
        setWorkspace((w) => ({
          ...w,
          concept_versions: [...w.concept_versions, newVer],
        }));
        if (isLast) {
          const aiReply: ChatMessage = {
            id: mkId("msg"),
            role: "ai",
            text: "Fresh batch — pick one to refine.",
            created_at: Date.now(),
          };
          setWorkspace((w) => ({
            ...w,
            concept_messages: [...w.concept_messages, aiReply],
          }));
          setIsGenerating(false);
        }
      }, INITIAL_REVEAL_DELAYS[i]);
    }
  };

  /**
   * Inline text edit on the AdMockup (Canva-style). Each commit creates a new
   * "Edited" version branching from the current active one and becomes active.
   */
  const handleInlineEdit = (field: MockupField, value: string) => {
    setWorkspace((w) => {
      const activeId = w.active_concept_version_id;
      if (!activeId) return w;
      const activeVer = w.concept_versions.find((v) => v.id === activeId);
      if (!activeVer) return w;
      const edited = makeInlineEditedVersion(activeVer, field, value);
      return {
        ...w,
        concept_versions: [...w.concept_versions, edited],
        active_concept_version_id: edited.id,
      };
    });
  };

  const handleSendConceptMessage = (text: string) => {
    if (isGenerating) return;
    const parent = workspace.active_concept_version_id;
    if (!parent) return; // shouldn't happen after the single-concept handoff
    setIsGenerating(true);

    const userMessage: ChatMessage = {
      id: mkId("msg"),
      role: "user",
      text,
      created_at: Date.now(),
    };
    const pendingMessage: ChatMessage = {
      id: mkId("msg"),
      role: "ai",
      text: "Refining…",
      pending: true,
      created_at: Date.now(),
    };
    setWorkspace((w) => ({
      ...w,
      concept_messages: [...w.concept_messages, userMessage, pendingMessage],
    }));

    window.setTimeout(() => {
      const newVer = makeMockVersion({
        parent_id: parent,
        labelPrefix: `v${workspace.concept_versions.length + 1}`,
        refinementText: text,
        projectContext,
      });
      const aiReply: ChatMessage = {
        id: mkId("msg"),
        role: "ai",
        text: makeMockReply(text),
        created_at: Date.now(),
      };
      setWorkspace((w) => {
        const messagesWithoutPending = w.concept_messages.filter((m) => !m.pending);
        return {
          ...w,
          concept_messages: [...messagesWithoutPending, aiReply],
          concept_versions: [...w.concept_versions, newVer],
          active_concept_version_id: newVer.id,
        };
      });
      setIsGenerating(false);
    }, MOCK_LATENCY_MS);
  };

  const handleFinalizeConcept = () => {
    const activeId = workspace.active_concept_version_id;
    if (!activeId) return;
    const activeVer = workspace.concept_versions.find((v) => v.id === activeId);
    if (!activeVer) return;

    // Seed every currently-selected size with a fresh version cloned from
    // the finalized concept. Clear any leftover undo history.
    setWorkspace((w) => {
      const nextSizeVersions: Record<string, ConceptVersion> = {};
      for (const sizeId of w.selected_sizes) {
        nextSizeVersions[sizeId] = makeSizeVersion(sizeId, activeVer);
      }
      return { ...w, size_versions: nextSizeVersions, size_previous: {} };
    });
    setPhase("resize");
  };

  /* ---------- Phase C handlers ---------- */

  const handleToggleSize = (sizeId: string) => {
    setWorkspace((w) => {
      const isSelected = w.selected_sizes.includes(sizeId);
      if (isSelected) {
        // Don't allow removing the last size.
        if (w.selected_sizes.length === 1) return w;
        const nextSizeVersions = { ...w.size_versions };
        delete nextSizeVersions[sizeId];
        const nextSizePrevious = { ...w.size_previous };
        delete nextSizePrevious[sizeId];
        const nextSelected = w.selected_sizes.filter((id) => id !== sizeId);
        return {
          ...w,
          selected_sizes: nextSelected,
          size_versions: nextSizeVersions,
          size_previous: nextSizePrevious,
        };
      }

      // Adding a new size — seed it from the finalized concept.
      const activeId = w.active_concept_version_id;
      const activeVer = activeId ? w.concept_versions.find((v) => v.id === activeId) : undefined;
      const nextSizeVersions = { ...w.size_versions };
      if (activeVer && !nextSizeVersions[sizeId]) {
        nextSizeVersions[sizeId] = makeSizeVersion(sizeId, activeVer);
      }
      return {
        ...w,
        selected_sizes: [...w.selected_sizes, sizeId],
        size_versions: nextSizeVersions,
      };
    });
  };

  /**
   * Regenerate a single size, optionally with a refinement prompt. The current
   * version is replaced (no per-size history kept — keeps the resize flow
   * intentionally lightweight).
   */
  const handleRegenerateSize = (sizeId: string, refinementText?: string) => {
    if (isGenerating) return;
    const current = workspace.size_versions[sizeId];
    if (!current) return;
    setIsGenerating(true);

    window.setTimeout(() => {
      setWorkspace((w) => {
        const cur = w.size_versions[sizeId];
        if (!cur) return w;
        const replacement = makeMockVersion({
          parent_id: cur.id,
          preferVariant: cur.variant,
          labelPrefix: `${getSize(sizeId)?.label ?? "size"} v${(extractVersionNumber(cur.label) ?? 1) + 1}`,
          refinementText: refinementText?.trim() ? refinementText : undefined,
          projectContext,
        });
        return {
          ...w,
          size_versions: { ...w.size_versions, [sizeId]: replacement },
          // Capture the version that was just displaced into one-deep history.
          size_previous: { ...w.size_previous, [sizeId]: cur },
        };
      });
      setIsGenerating(false);
    }, MOCK_LATENCY_MS);
  };

  const handleUndoSize = (sizeId: string) => {
    setWorkspace((w) => {
      const prev = w.size_previous[sizeId];
      if (!prev) return w;
      const nextPrevious = { ...w.size_previous };
      delete nextPrevious[sizeId];
      return {
        ...w,
        size_versions: { ...w.size_versions, [sizeId]: prev },
        size_previous: nextPrevious,
      };
    });
  };

  /**
   * Apply a batch of edits (headline + mockup fields) to a size's current
   * version. Replaces the size version in-place and captures the prior version
   * into `size_previous` for one-deep undo.
   */
  /** Register a user-defined custom size and select it. */
  const handleAddCustomSize = (label: string, width: number, height: number) => {
    const sizeId = mkId("size-custom");
    const sizeOption = {
      id: sizeId,
      label: label || "Custom",
      dimensions: `${width}×${height}`,
      aspectW: width,
      aspectH: height,
    };
    setWorkspace((w) => {
      // Seed the new size with a fresh version cloned from the active concept
      // so the preview renders something immediately.
      const activeId = w.active_concept_version_id;
      const activeVer = activeId ? w.concept_versions.find((v) => v.id === activeId) : undefined;
      const nextSizeVersions = { ...w.size_versions };
      if (activeVer) {
        nextSizeVersions[sizeId] = makeSizeVersion(sizeId, activeVer);
      }
      return {
        ...w,
        custom_sizes: { ...w.custom_sizes, [sizeId]: sizeOption },
        selected_sizes: [...w.selected_sizes, sizeId],
        size_versions: nextSizeVersions,
      };
    });
  };

  /** Inline Canva-style edit on a single size's AdMockup (one field per call). */
  const handleInlineEditSize = (sizeId: string, field: MockupField, value: string) => {
    setWorkspace((w) => {
      const cur = w.size_versions[sizeId];
      if (!cur) return w;
      const next = makeInlineEditedVersion(cur, field, value);
      return {
        ...w,
        size_versions: { ...w.size_versions, [sizeId]: next },
        size_previous: { ...w.size_previous, [sizeId]: cur },
      };
    });
  };

  /** Inline edit of a single size's post text (primary_text). */
  const handleEditSizePostText = (sizeId: string, postText: string) => {
    setWorkspace((w) => {
      const cur = w.size_versions[sizeId];
      if (!cur || cur.primary_text === postText) return w;
      const next: ConceptVersion = {
        ...cur,
        id: mkId("ver"),
        parent_id: cur.id,
        primary_text: postText,
        label: "Edited",
        created_at: Date.now(),
      };
      return {
        ...w,
        size_versions: { ...w.size_versions, [sizeId]: next },
        size_previous: { ...w.size_previous, [sizeId]: cur },
      };
    });
  };

  const handleConfirm = () => {
    const out: GeneratedCreative[] = [];
    for (const sizeId of workspace.selected_sizes) {
      const ver = workspace.size_versions[sizeId];
      if (!ver) continue;
      const sizeMeta = getSize(sizeId);
      out.push({
        id: `creative-${sizeId}-${Date.now()}`,
        size: sizeMeta?.dimensions ?? "1080×1080",
        label: sizeMeta?.label ?? "Square",
        postText: ver.primary_text,
        headline: ver.headline,
        description: ver.description,
      });
    }
    onComplete(out);
  };

  /* ---------- Computed ---------- */

  const phaseIndex = useMemo(() => PHASES.findIndex((p) => p.id === phase), [phase]);

  const handlePhaseClick = (target: CreativePhase) => {
    // Only allow stepping back to a phase the user has already passed through.
    const targetIndex = PHASES.findIndex((p) => p.id === target);
    if (targetIndex <= phaseIndex) {
      setPhase(target);
    }
  };

  /* ---------- Render ---------- */

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-black/30 z-[80] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-card border border-border shadow-2xl w-full max-w-[1120px] h-[88vh] max-h-[820px] overflow-hidden flex flex-col"
        >
          {/* Header — subtle creative tint via a thin gradient backdrop */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-r from-[#F5F3FF] via-white to-[#FAE8FF] relative">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles size={14} strokeWidth={1.5} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-text-primary leading-tight truncate">
                  Generate creative
                </div>
                <div className="text-[11px] text-text-tertiary leading-tight truncate">
                  {angleName} · {personaName}
                </div>
              </div>
              {/* Phase breadcrumb */}
              <div className="flex items-center gap-1 ml-4">
                {PHASES.map((p, i) => {
                  const isActive = p.id === phase;
                  const isPast = i < phaseIndex;
                  const isClickable = isActive || isPast;
                  return (
                    <div key={p.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => isClickable && handlePhaseClick(p.id)}
                        disabled={!isClickable}
                        className={`text-[11px] font-medium px-2 py-1 rounded-button transition-colors ${
                          isActive
                            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm"
                            : isPast
                            ? "text-text-secondary hover:text-text-primary hover:bg-surface-page"
                            : "text-text-tertiary cursor-default"
                        }`}
                      >
                        {i + 1}. {p.label}
                      </button>
                      {i < PHASES.length - 1 && (
                        <ChevronRight size={11} strokeWidth={1.5} className="text-text-tertiary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-button transition-colors duration-150"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Body — switches between phases */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {phase === "setup" && (
              <div className="h-full">
                <CreativeSetupPanel
                  workspace={workspace}
                  onPromptChange={handlePromptChange}
                  onAttachStyleRef={handleAttachStyleRef}
                  onAttachProjectImage={handleAttachProjectImage}
                  onAttachBrandLogo={handleAttachBrandLogo}
                  onToggleBrandGuidelines={handleToggleBrandGuidelines}
                  onToggleCreativeStrategy={handleToggleCreativeStrategy}
                  onUpdateStrategy={handleUpdateStrategy}
                  onGenerate={handleGenerateInitialConcepts}
                  isGenerating={isGenerating}
                />
              </div>
            )}

            {phase === "concept" && (
              <CreativeConceptEditor
                messages={workspace.concept_messages}
                versions={workspace.concept_versions}
                activeVersionId={workspace.active_concept_version_id}
                isGenerating={isGenerating}
                pickerSlots={INITIAL_CONCEPT_COUNT}
                onSendMessage={handleSendConceptMessage}
                onSelectVersion={handleSelectConceptVersion}
                onStartFresh={handleStartFresh}
                onInlineEdit={handleInlineEdit}
                onFinalize={handleFinalizeConcept}
              />
            )}

            {phase === "resize" && (
              <CreativeResizeEditor
                workspace={workspace}
                isGenerating={isGenerating}
                onToggleSize={handleToggleSize}
                onRegenerateSize={handleRegenerateSize}
                onUndoSize={handleUndoSize}
                onInlineEditSize={handleInlineEditSize}
                onEditSizePostText={handleEditSizePostText}
                onAddCustomSize={handleAddCustomSize}
              />
            )}
          </div>

          {/* Global modal footer — only rendered in Resize phase.
              Setup has its Go button inside the chatbox.
              Concept moves Finalize into the right-pane header. */}
          {phase === "resize" && (
            <ModalFooter
              selectedSizesCount={workspace.selected_sizes.length}
              isGenerating={isGenerating}
              onConfirm={handleConfirm}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal footer — phase-specific primary CTA                          */
/* ------------------------------------------------------------------ */

interface ModalFooterProps {
  selectedSizesCount: number;
  isGenerating: boolean;
  onConfirm: () => void;
}

function ModalFooter({ selectedSizesCount, isGenerating, onConfirm }: ModalFooterProps) {
  return (
    <div className="border-t border-border bg-white px-5 py-3 flex items-center justify-between">
      <div className="text-[11px] text-text-tertiary">
        {selectedSizesCount} size{selectedSizesCount !== 1 ? "s" : ""} ready to confirm
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={selectedSizesCount === 0 || isGenerating}
        className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirm &amp; add to campaign
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the initial version for a sizeId, seeded from the finalized concept.
 * Used both when entering Phase C and when adding a new size mid-flow.
 */
function makeSizeVersion(sizeId: string, fromVersion: ConceptVersion): ConceptVersion {
  const sizeLabel = getSize(sizeId)?.label ?? "size";
  return {
    ...fromVersion,
    id: mkId("ver"),
    parent_id: fromVersion.id,
    label: `${sizeLabel} v1`,
    created_at: Date.now(),
  };
}

/** Pull the numeric suffix off a `"… v3"` style label. */
function extractVersionNumber(label: string): number | null {
  const m = label.match(/v(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}
