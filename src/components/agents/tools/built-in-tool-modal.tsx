"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import type { ToolConfig, ToolSettings } from "@/lib/tools-library";
import { toolLabel } from "@/lib/tools-library";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader } from "./modal-shell";
import { ToolIcon } from "./tool-icon";
import { SystemToolSettings, type AgentLanguages } from "./system-tool-settings";

// The trigger field reads differently per tool — Transfer Call's trigger IS
// the "when to hand off" condition.
const TRIGGER_LABELS: Record<string, string> = {
  transfer_call: "When should the assistant hand off the call?",
};

/**
 * Detail / settings modal for a default or system tool. The platform owns the
 * tool's logic, but — like Vapi's predefined tools — each one exposes real
 * configuration (Transfer Call has destinations, Voicemail has a behaviour +
 * message, etc.). The builder edits the trigger description plus those
 * settings here. Default tools carry an Always-on badge and can't be removed.
 */
export function BuiltInToolModal({
  tool,
  settings,
  agentLanguages,
  onClose,
  onSave,
}: {
  tool: ToolConfig | null;
  settings: ToolSettings;
  agentLanguages?: AgentLanguages;
  onClose: () => void;
  onSave: (title: string, description: string, settings: ToolSettings) => void;
}) {
  const [description, setDescription] = useState(tool?.description ?? "");
  const [draft, setDraft] = useState<ToolSettings>(settings);

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
            title={toolLabel(tool.title)}
            subtitle={
              <span className="inline-flex items-center gap-1.5">
                <Lock size={11} strokeWidth={1.75} />
                {tool.is_default ? "Default tool" : "System tool"} · maintained by
                the platform
              </span>
            }
            badge={
              tool.is_default ? (
                <span className="inline-flex items-center rounded-md bg-success-bg px-2 py-0.5 text-[10.5px] font-semibold text-success">
                  Always on
                </span>
              ) : undefined
            }
            onClose={onClose}
          />

          <div className="max-h-[68vh] space-y-5 overflow-y-auto p-5">
            {/* Trigger description */}
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
                {TRIGGER_LABELS[tool.title] ?? "When should the assistant use this?"}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                placeholder="The assistant reads this to decide when to trigger the tool."
              />
              {tool.whatItDoes && (
                <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                  {tool.whatItDoes}
                </p>
              )}
            </div>

            <div className="border-t border-border-subtle" />

            {/* Tool-specific settings */}
            <SystemToolSettings
              tool={tool}
              settings={draft}
              onChange={setDraft}
              agentLanguages={agentLanguages}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(tool.title, description, draft)}>
              Save changes
            </Button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
