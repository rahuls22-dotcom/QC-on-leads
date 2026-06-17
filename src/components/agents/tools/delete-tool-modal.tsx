"use client";

import { AlertTriangle } from "lucide-react";
import type { ToolConfig } from "@/lib/tools-library";
import { Button } from "@/components/ui/button";
import { ModalShell } from "./modal-shell";

/**
 * Delete a custom tool. Built-in / default tools never reach here (no delete
 * control is rendered for them). The library is global, so exact usage isn't
 * known from this surface — soften the copy to a non-blocking caution.
 */
export function DeleteToolModal({
  tool,
  onClose,
  onConfirm,
}: {
  tool: ToolConfig | null;
  onClose: () => void;
  onConfirm: (title: string) => void;
}) {
  return (
    <ModalShell open={!!tool} onClose={onClose} width="max-w-[420px]">
      {tool && (
        <div className="p-5">
          <h2 className="mb-1.5 text-[15px] font-semibold text-foreground">
            Delete this tool?
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              &ldquo;{tool.title}&rdquo;
            </span>{" "}
            will be removed from your library.
          </p>

          <div className="mt-4 flex gap-2.5 rounded-lg border border-warning/30 bg-warning-bg px-3.5 py-3">
            <AlertTriangle
              size={14}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-warning"
            />
            <p className="text-[12px] leading-relaxed text-warning">
              This tool may be in use by other assistants. They&rsquo;ll stop
              being able to call it — remove it there first to be safe.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Keep tool
            </Button>
            <Button variant="destructive" onClick={() => onConfirm(tool.title)}>
              Delete anyway
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
