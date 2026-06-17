"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { ToolConfig, ToolSettings } from "@/lib/tools-library-data";
import { ModalShell, ModalHeader } from "./modal-shell";
import { ToolIcon } from "./tool-icon";
import { SystemToolSettings } from "./system-tool-settings";

/**
 * Detail / settings modal for a default or system tool. The platform owns
 * the tool's underlying logic, but — like Vapi's predefined tools — each
 * one exposes real configuration: a Transfer Call has destinations, a
 * Voicemail tool has a behaviour + message, and so on. The builder edits
 * the trigger description plus those tool-specific settings here. Default
 * tools additionally carry an Always-on badge and can't be removed.
 */
export function BuiltInToolModal({
  tool,
  settings,
  onClose,
  onSave,
}: {
  tool: ToolConfig | null;
  settings: ToolSettings;
  onClose: () => void;
  onSave: (title: string, description: string, settings: ToolSettings) => void;
}) {
  const [description, setDescription] = useState(tool?.description ?? "");
  const [draft, setDraft] = useState<ToolSettings>(settings);

  // Re-seed when a different tool opens.
  useEffect(() => {
    if (tool) {
      setDescription(tool.description);
      setDraft(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool?.title]);

  return (
    <ModalShell open={!!tool} onClose={onClose}>
      {tool && (
        <>
          <ModalHeader
            icon={<ToolIcon icon={tool.icon} size={17} />}
            title={tool.title}
            subtitle={
              <span className="inline-flex items-center gap-1.5">
                <Lock size={11} strokeWidth={1.5} />
                {tool.is_default ? "Default tool" : "System tool"} · maintained by
                the platform
              </span>
            }
            badge={
              tool.is_default ? (
                <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                  Always on
                </span>
              ) : undefined
            }
            onClose={onClose}
          />

          <div className="p-5 space-y-5 max-h-[68vh] overflow-y-auto">
            {/* Trigger description */}
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
                When should the assistant use this?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-[13px] bg-white border border-border rounded-input text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary resize-y leading-relaxed"
                placeholder="The assistant reads this to decide when to trigger the tool."
              />
              {tool.whatItDoes && (
                <p className="mt-1.5 text-[11px] text-text-tertiary">
                  {tool.whatItDoes}
                </p>
              )}
            </div>

            <div className="border-t border-border-subtle" />

            {/* Tool-specific settings */}
            <SystemToolSettings tool={tool} settings={draft} onChange={setDraft} />
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-surface-page">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium border border-border rounded-button bg-white text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(tool.title, description, draft)}
              className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
            >
              Save changes
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
