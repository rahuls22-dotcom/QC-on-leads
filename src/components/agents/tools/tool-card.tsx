"use client";

import { Lock } from "lucide-react";
import type { ToolConfig } from "@/lib/tools-library";
import { toolLabel } from "@/lib/tools-library";
import { ToolIcon } from "./tool-icon";

/* ─── Selection toggle ────────────────────────────────────────────── */

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ${
        on ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform duration-150 ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ─── Type badge ──────────────────────────────────────────────────── */

function ToolBadge({ tool }: { tool: ToolConfig }) {
  if (tool.is_default) {
    return (
      <span className="inline-flex items-center rounded-md bg-success-bg px-2 py-0.5 text-[10.5px] font-semibold text-success">
        Always on
      </span>
    );
  }
  if (tool.type === "standard") {
    // System tools: no lock badge — they're switched on/off, not locked.
    return null;
  }
  const webhook = tool.config?.kind === "webhook";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
        webhook ? "bg-info-bg text-info" : "bg-primary-soft text-primary"
      }`}
    >
      {webhook ? "Webhook" : "Saved answer"}
    </span>
  );
}

/* ─── Card ────────────────────────────────────────────────────────── */

export function ToolCard({
  tool,
  enabled,
  onOpen,
  onToggle,
}: {
  tool: ToolConfig;
  enabled: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group w-full cursor-pointer rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 focus:outline-none focus-visible:border-primary"
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            enabled || tool.is_default
              ? "bg-primary-soft text-primary"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <ToolIcon icon={tool.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-foreground">
              {toolLabel(tool.title)}
            </span>
            <ToolBadge tool={tool} />
          </div>
        </div>

        {tool.is_default ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Lock size={11} strokeWidth={1.75} />
          </span>
        ) : (
          <Toggle
            on={enabled}
            onClick={onToggle}
            label={`${enabled ? "Disable" : "Enable"} ${toolLabel(tool.title)}`}
          />
        )}
      </div>
    </div>
  );
}
