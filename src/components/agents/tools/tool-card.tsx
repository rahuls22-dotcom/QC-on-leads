"use client";

import { Lock } from "lucide-react";
import type { ToolConfig } from "@/lib/tools-library-data";
import { ToolIcon } from "./tool-icon";

/* ─── Selection toggle (reused styling from the agent tabs) ───────── */

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
        on ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
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
      <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
        Always on
      </span>
    );
  }
  if (tool.type === "standard") {
    return <Lock size={12} strokeWidth={1.5} className="text-text-tertiary" />;
  }
  const webhook = tool.config?.kind === "webhook";
  return (
    <span
      className={`inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-badge ${
        webhook ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-[#F5F3FF] text-[#6D28D9]"
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
      className="group text-left w-full bg-white border border-border rounded-card p-4 hover:border-border-hover transition-colors cursor-pointer focus:outline-none focus-visible:border-accent"
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 shrink-0 rounded-button flex items-center justify-center ${
            enabled || tool.is_default
              ? "bg-accent/10 text-accent"
              : "bg-surface-secondary text-text-tertiary"
          }`}
        >
          <ToolIcon icon={tool.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-text-primary truncate">
              {tool.title}
            </span>
            <ToolBadge tool={tool} />
          </div>
        </div>

        {tool.is_default ? (
          <span className="text-[11px] text-text-tertiary inline-flex items-center gap-1 shrink-0">
            <Lock size={11} strokeWidth={1.5} />
          </span>
        ) : (
          <Toggle
            on={enabled}
            onClick={onToggle}
            label={`${enabled ? "Disable" : "Enable"} ${tool.title}`}
          />
        )}
      </div>

      <p className="text-[12px] text-text-tertiary leading-relaxed mt-2 line-clamp-2">
        {tool.description}
      </p>
    </div>
  );
}
