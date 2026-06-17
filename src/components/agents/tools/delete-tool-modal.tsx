"use client";

import { AlertTriangle } from "lucide-react";
import type { ToolConfig } from "@/lib/tools-library-data";
import { ModalShell } from "./modal-shell";

/**
 * Flow E — delete a custom tool. Built-in / default tools never reach
 * here (no delete control is rendered for them). The library is global,
 * so we can't count exact usage from this surface — soften the copy to a
 * non-blocking caution per the spec's "usage count unavailable" fallback.
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
    <ModalShell open={!!tool} onClose={onClose} maxWidth="max-w-[420px]">
      {tool && (
        <div className="p-5">
          <h2 className="text-[15px] font-semibold text-text-primary mb-1.5">
            Delete this tool?
          </h2>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            <span className="font-medium text-text-primary">
              &ldquo;{tool.title}&rdquo;
            </span>{" "}
            will be removed from your library.
          </p>

          <div className="flex gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-card px-3.5 py-3 mt-4">
            <AlertTriangle
              size={14}
              strokeWidth={1.5}
              className="text-[#92400E] mt-0.5 shrink-0"
            />
            <p className="text-[12px] text-[#92400E] leading-relaxed">
              This tool may be in use by other assistants. They&rsquo;ll stop
              being able to call it — remove it there first to be safe.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium border border-border rounded-button bg-white text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Keep tool
            </button>
            <button
              onClick={() => onConfirm(tool.title)}
              className="h-9 px-4 text-[13px] font-medium bg-[#DC2626] text-white rounded-button hover:bg-[#B91C1C] transition-colors"
            >
              Delete anyway
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
