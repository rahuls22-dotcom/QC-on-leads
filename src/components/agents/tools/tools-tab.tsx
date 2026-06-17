"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Agent } from "@/lib/agents-data";
import type { ToolConfig, ToolSettings } from "@/lib/tools-library";
import {
  DEFAULT_TOOLS,
  SYSTEM_TOOLS,
  SEED_CUSTOM_TOOLS,
  DEFAULT_TOOL_SETTINGS,
} from "@/lib/tools-library";
import { Button } from "@/components/ui/button";
import { ToolCard } from "./tool-card";
import { BuiltInToolModal } from "./built-in-tool-modal";
import { CustomToolModal } from "./custom-tool-modal";
import { DeleteToolModal } from "./delete-tool-modal";

// Current logged-in user (mock — the app surfaces this elsewhere).
const CURRENT_USER = "ankit.purohit@guyjus.com";

// Map the agent's existing capability ids → system tool titles, so the tab
// reflects what this agent already has switched on.
const CAP_TO_TITLE: Record<string, string> = {
  multilingual_detection: "detect_language",
  transfer_to_human: "transfer_call",
  budget_calculator: "calculate_budget",
  experience_center_info: "find_experience_center",
  email_capture: "look_up_email",
};

export function ToolsTab({ agent }: { agent: Agent }) {
  // Library state (mock of GET /tools). Standard tools are static; custom
  // tools are mutable via the CRUD modals.
  const [customTools, setCustomTools] = useState<ToolConfig[]>(SEED_CUSTOM_TOOLS);
  const [builtInDescriptions, setBuiltInDescriptions] = useState<
    Record<string, string>
  >({});
  const [toolSettings, setToolSettings] = useState<Record<string, ToolSettings>>(
    () => structuredClone(DEFAULT_TOOL_SETTINGS),
  );

  // Which non-default tools are attached to THIS agent (the "selection"),
  // seeded from the agent's capabilities where they line up.
  const [enabled, setEnabled] = useState<Set<string>>(() => {
    const fromAgent = (agent.capabilities ?? [])
      .map((c) => CAP_TO_TITLE[c])
      .filter(Boolean);
    return new Set(
      fromAgent.length
        ? fromAgent
        : ["transfer_call", "detect_language", "send_whatsapp", "book_site_visit"],
    );
  });

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
      {/* Header */}
      <div className="mb-5 flex items-center justify-end">
        <Button
          onClick={() => {
            setEditingCustom(null);
            setCustomOpen(true);
          }}
        >
          <Plus size={15} strokeWidth={2} />
          New tool
        </Button>
      </div>

      {/* Default */}
      <SectionHeader
        label="Default"
        count={defaultTools.length}
        note="Always on · description editable"
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

      {/* System */}
      <SectionHeader
        label="System"
        count={systemTools.length}
        note="Maintained by the platform · switch on to use"
      />
      <CardGrid>
        {systemTools.map((t) => (
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
      <SectionHeader label="Custom" count={customTools.length} note="Built by your team" />
      {customTools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <p className="mb-3 text-[13px] text-muted-foreground">
            No custom tools yet. Create one to connect your assistant to your
            systems or give saved answers.
          </p>
          <Button
            onClick={() => {
              setEditingCustom(null);
              setCustomOpen(true);
            }}
          >
            <Plus size={15} strokeWidth={2} />
            New tool
          </Button>
        </div>
      ) : (
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
        </CardGrid>
      )}

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
