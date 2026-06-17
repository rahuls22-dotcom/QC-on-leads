"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";
import type { ToolConfig, ToolSettings } from "@/lib/tools-library-data";
import {
  DEFAULT_TOOLS,
  SYSTEM_TOOLS,
  SEED_CUSTOM_TOOLS,
  DEFAULT_TOOL_SETTINGS,
} from "@/lib/tools-library-data";
import { ToolCard } from "./tools/tool-card";
import { BuiltInToolModal } from "./tools/built-in-tool-modal";
import { CustomToolModal } from "./tools/custom-tool-modal";
import { DeleteToolModal } from "./tools/delete-tool-modal";

interface ToolsTabProps {
  agent: AgentMvpDetail;
}

// Current logged-in user (mock — the app surfaces this elsewhere).
const CURRENT_USER = "ankit.purohit@guyjus.com";

export function ToolsTab({ agent }: ToolsTabProps) {
  // Library state (mock of GET /tools). Standard tools are static; custom
  // tools are mutable via the CRUD modals.
  const [customTools, setCustomTools] = useState<ToolConfig[]>(SEED_CUSTOM_TOOLS);
  const [builtInDescriptions, setBuiltInDescriptions] = useState<
    Record<string, string>
  >({});
  // Per-tool settings overrides for standard tools (Vapi-style config),
  // seeded from the catalogue defaults.
  const [toolSettings, setToolSettings] = useState<Record<string, ToolSettings>>(
    () => structuredClone(DEFAULT_TOOL_SETTINGS)
  );

  // Which non-default tools are attached to THIS agent (the "selection").
  // Seeded with a representative starting set for the prototype.
  const [enabled, setEnabled] = useState<Set<string>>(
    () =>
      new Set([
        "transfer_call",
        "detect_language",
        "send_whatsapp",
        "book_site_visit",
      ])
  );

  // Modal state
  const [builtInTool, setBuiltInTool] = useState<ToolConfig | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<ToolConfig | null>(null);
  const [deleteTool, setDeleteTool] = useState<ToolConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Apply built-in description overrides on top of the static catalogue.
  const defaultTools = applyOverrides(DEFAULT_TOOLS, builtInDescriptions);
  const systemTools = applyOverrides(SYSTEM_TOOLS, builtInDescriptions);

  const allTitles = useMemo(
    () => [
      ...DEFAULT_TOOLS.map((t) => t.title),
      ...SYSTEM_TOOLS.map((t) => t.title),
      ...customTools.map((t) => t.title),
    ],
    [customTools]
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((m) => (m === msg ? null : m)), 1900);
  };

  const visDefault = defaultTools;
  const visSystem = systemTools;
  const visCustom = customTools;

  /* ─── Mutations ────────────────────────────────────────────────── */
  const toggle = (title: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });

  const saveBuiltIn = (
    title: string,
    description: string,
    settings: ToolSettings
  ) => {
    setBuiltInDescriptions((prev) => ({ ...prev, [title]: description }));
    setToolSettings((prev) => ({ ...prev, [title]: settings }));
    setBuiltInTool(null);
    flash("Tool settings saved");
  };

  const saveCustom = (tool: ToolConfig) => {
    setCustomTools((prev) => {
      const exists = prev.some((t) => t.title === tool.title);
      return exists
        ? prev.map((t) => (t.title === tool.title ? tool : t))
        : [...prev, tool];
    });
    if (!editingCustom) {
      // Newly created tools attach to this agent by default.
      setEnabled((prev) => new Set(prev).add(tool.title));
    }
    setCustomOpen(false);
    setEditingCustom(null);
    flash("Tool saved to library");
  };

  const confirmDelete = (title: string) => {
    setCustomTools((prev) => prev.filter((t) => t.title !== title));
    setEnabled((prev) => {
      const next = new Set(prev);
      next.delete(title);
      return next;
    });
    setDeleteTool(null);
    setCustomOpen(false);
    setEditingCustom(null);
    flash("Tool deleted");
  };

  /* ─── Render ───────────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-end mb-5">
        <button
          onClick={() => {
            setEditingCustom(null);
            setCustomOpen(true);
          }}
          className="h-9 px-4 shrink-0 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
        >
          <Plus size={15} strokeWidth={2} />
          New tool
        </button>
      </div>

      {/* Built-in (Default + System) */}
      <SectionHeader
        label="Default"
        count={visDefault.length}
        note="Always on · description editable"
      />
          <CardGrid>
            {visDefault.map((t) => (
              <ToolCard
                key={t.title}
                tool={t}
                enabled
                onOpen={() => setBuiltInTool(t)}
                onToggle={() => {}}
              />
            ))}
          </CardGrid>

          <SectionHeader
            label="System"
            count={visSystem.length}
            note="Maintained by the platform · switch on to use"
          />
          <CardGrid>
            {visSystem.map((t) => (
              <ToolCard
                key={t.title}
                tool={t}
                enabled={enabled.has(t.title)}
                onOpen={() => setBuiltInTool(t)}
                onToggle={() => toggle(t.title)}
              />
            ))}
          </CardGrid>

          {/* Custom */}
          <SectionHeader
            label="Custom"
            count={visCustom.length}
            note="Built by your team"
          />
          {visCustom.length === 0 ? (
            <div className="bg-white border border-dashed border-border rounded-card px-5 py-8 text-center">
              <p className="text-[13px] text-text-secondary mb-3">
                No custom tools yet. Create one to connect your assistant to your
                systems or give saved answers.
              </p>
              <button
                onClick={() => {
                  setEditingCustom(null);
                  setCustomOpen(true);
                }}
                className="h-9 px-4 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={15} strokeWidth={2} />
                New tool
              </button>
            </div>
          ) : (
            <CardGrid>
              {visCustom.map((t) => (
                <ToolCard
                  key={t.title}
                  tool={t}
                  enabled={enabled.has(t.title)}
                  onOpen={() => {
                    setEditingCustom(t);
                    setCustomOpen(true);
                  }}
                  onToggle={() => toggle(t.title)}
                />
              ))}
            </CardGrid>
          )}

      {/* Modals */}
      <BuiltInToolModal
        tool={builtInTool}
        settings={
          builtInTool ? toolSettings[builtInTool.title] ?? {} : {}
        }
        onClose={() => setBuiltInTool(null)}
        onSave={saveBuiltIn}
      />
      <CustomToolModal
        open={customOpen}
        editing={editingCustom}
        reservedTitles={allTitles}
        createdBy={CURRENT_USER}
        onClose={() => {
          setCustomOpen(false);
          setEditingCustom(null);
        }}
        onSave={saveCustom}
        onRequestDelete={(t) => setDeleteTool(t)}
      />
      <DeleteToolModal
        tool={deleteTool}
        onClose={() => setDeleteTool(null)}
        onConfirm={confirmDelete}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-button bg-accent text-white text-[13px] font-medium shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Layout helpers ──────────────────────────────────────────────── */

function SectionHeader({
  label,
  count,
  note,
}: {
  label: string;
  count: number;
  note: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mt-6 mb-3 first:mt-0">
      <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-secondary">
        {label}
      </span>
      <span className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-tertiary">
        {count}
      </span>
      <span className="text-[12px] text-text-tertiary">· {note}</span>
    </div>
  );
}

function CardGrid({
  children,
  empty,
}: {
  children?: React.ReactNode;
  empty?: string;
}) {
  if (empty) {
    return <p className="text-[12px] text-text-tertiary py-2">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  );
}

function applyOverrides(
  tools: ToolConfig[],
  overrides: Record<string, string>
): ToolConfig[] {
  return tools.map((t) =>
    overrides[t.title] !== undefined
      ? { ...t, description: overrides[t.title] }
      : t
  );
}
