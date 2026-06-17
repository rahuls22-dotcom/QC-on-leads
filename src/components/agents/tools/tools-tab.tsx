"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { ToolConfig, ToolSettings } from "@/lib/tools-library";
import {
  DEFAULT_TOOLS,
  SYSTEM_TOOLS,
  SEED_CUSTOM_TOOLS,
  DEFAULT_TOOL_SETTINGS,
} from "@/lib/tools-library";
import { ToolCard } from "./tool-card";
import { BuiltInToolModal } from "./built-in-tool-modal";
import { CustomToolModal } from "./custom-tool-modal";
import { DeleteToolModal } from "./delete-tool-modal";

// Current logged-in user (mock — the app surfaces this elsewhere).
const CURRENT_USER = "ankit.purohit@guyjus.com";

export function ToolsTab() {
  // Library state (mock of GET /tools). Standard tools are static; custom
  // tools are mutable via the CRUD modals.
  const [customTools, setCustomTools] = useState<ToolConfig[]>(SEED_CUSTOM_TOOLS);
  const [builtInDescriptions, setBuiltInDescriptions] = useState<
    Record<string, string>
  >({});
  const [toolSettings, setToolSettings] = useState<Record<string, ToolSettings>>(
    () => structuredClone(DEFAULT_TOOL_SETTINGS),
  );

  // Non-default tools start switched OFF for this agent — the operator opts in.
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set());

  // Modal state
  const [builtInTool, setBuiltInTool] = useState<ToolConfig | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<ToolConfig | null>(null);
  const [deleteTool, setDeleteTool] = useState<ToolConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const defaultTools = applyOverrides(DEFAULT_TOOLS, builtInDescriptions);
  const systemTools = applyOverrides(SYSTEM_TOOLS, builtInDescriptions);

  const allTitles = useMemo(
    () => [
      ...DEFAULT_TOOLS.map((t) => t.title),
      ...SYSTEM_TOOLS.map((t) => t.title),
      ...customTools.map((t) => t.title),
    ],
    [customTools],
  );

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((m) => (m === msg ? null : m)), 1900);
  };

  /* ─── Mutations ────────────────────────────────────────────────── */
  const toggle = (title: string) =>
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  // Toggling a system tool on opens its config modal so it can be set up.
  const toggleSystem = (tool: ToolConfig) => {
    const willEnable = !enabled.has(tool.title);
    toggle(tool.title);
    if (willEnable) setBuiltInTool(tool);
  };

  const openCreate = () => {
    setEditingCustom(null);
    setCustomOpen(true);
  };

  const saveBuiltIn = (
    title: string,
    description: string,
    settings: ToolSettings,
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
    if (!editingCustom) setEnabled((prev) => new Set(prev).add(tool.title));
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
      {/* Default — always on, locked, click to configure */}
      <SectionHeader
        label="Default"
        count={defaultTools.length}
        note="Always on · click to configure"
      />
      <CardGrid>
        {defaultTools.map((t) => (
          <ToolCard
            key={t.title}
            tool={t}
            enabled
            onOpen={() => setBuiltInTool(t)}
            onToggle={() => {}}
          />
        ))}
      </CardGrid>

      {/* System — off by default; switch on to configure */}
      <SectionHeader
        label="System"
        count={systemTools.length}
        note="Switch on to use · configure each one"
      />
      <CardGrid>
        {systemTools.map((t) => (
          <ToolCard
            key={t.title}
            tool={t}
            enabled={enabled.has(t.title)}
            onOpen={() => setBuiltInTool(t)}
            onToggle={() => toggleSystem(t)}
          />
        ))}
      </CardGrid>

      {/* Custom — team-built tools + a create card */}
      <SectionHeader
        label="Custom"
        count={customTools.length}
        note="Built by your team"
      />
      <CardGrid>
        {customTools.map((t) => (
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
        <CreateToolCard onClick={openCreate} />
      </CardGrid>

      {/* Modals */}
      <BuiltInToolModal
        tool={builtInTool}
        settings={builtInTool ? toolSettings[builtInTool.title] ?? {} : {}}
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
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-foreground px-4 py-2.5 text-[13px] font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
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
    <div className="mt-6 mb-3 flex items-center gap-2.5 first:mt-0">
      <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {count}
      </span>
      <span className="text-[12px] text-muted-foreground/70">· {note}</span>
    </div>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>;
}

function CreateToolCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary-softer"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Plus size={16} strokeWidth={2} />
      </span>
      <span className="text-[13px] font-medium text-foreground">
        Create a new custom tool
      </span>
    </button>
  );
}

function applyOverrides(
  tools: ToolConfig[],
  overrides: Record<string, string>,
): ToolConfig[] {
  return tools.map((t) =>
    overrides[t.title] !== undefined
      ? { ...t, description: overrides[t.title] }
      : t,
  );
}
