"use client";

import { Upload, X, Image as ImageIcon } from "lucide-react";

interface UploadTileProps {
  title: string;
  helper: string;
  /** When provided, the tile shows the "uploaded" state with this filename. */
  fileName: string | null;
  /** Mock upload action — sets a flag in parent state. */
  onUpload: () => void;
  /** Remove the upload — sets the parent state back to null. */
  onRemove: () => void;
  /** Visual identity for the placeholder accent (icon background tint). */
  tone?: "blue" | "amber";
}

/**
 * A square preview card for an optional upload (style reference or product image).
 * Empty state = dashed card with upload prompt. Filled state = the "image" preview
 * area (mocked with a soft gradient + icon since no actual upload happens), with
 * filename + remove × at the bottom.
 */
export function UploadTile({
  title,
  helper,
  fileName,
  onUpload,
  onRemove,
  tone = "blue",
}: UploadTileProps) {
  const toneGradient =
    tone === "blue"
      ? "from-[#E0EAFF] via-[#EFF4FF] to-[#F5F8FF]"
      : "from-[#FFF1D6] via-[#FFF8E8] to-[#FFFCF1]";
  const toneIcon =
    tone === "blue" ? "text-[#3B5DAE]" : "text-[#A6701C]";

  if (fileName) {
    return (
      <div className="relative w-full bg-white border border-border rounded-card overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove upload"
          className="absolute top-2 right-2 z-10 p-1 text-text-tertiary bg-white/90 hover:text-status-error hover:bg-white rounded-full shadow-sm transition-colors duration-150"
        >
          <X size={13} strokeWidth={1.5} />
        </button>
        <div
          className={`aspect-square w-full bg-gradient-to-br ${toneGradient} flex items-center justify-center`}
        >
          <ImageIcon size={40} strokeWidth={1} className={toneIcon} />
        </div>
        <div className="px-3 py-2.5 border-t border-border-subtle">
          <div className="text-[12px] font-semibold text-text-primary truncate" title={fileName}>
            {fileName}
          </div>
          <div className="text-[10px] text-text-tertiary mt-0.5 truncate">{title}</div>
          <button
            type="button"
            onClick={onUpload}
            className="mt-1.5 text-[10px] font-medium text-text-secondary hover:text-text-primary underline-offset-2 hover:underline transition-colors"
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onUpload}
      className="w-full text-left bg-white border-2 border-dashed border-border hover:border-accent/40 hover:bg-surface-page/50 rounded-card overflow-hidden transition-all duration-150 group flex flex-col"
    >
      <div className="aspect-square w-full bg-surface-page group-hover:bg-white transition-colors flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5 text-text-tertiary group-hover:text-text-secondary transition-colors">
          <Upload size={22} strokeWidth={1.5} />
          <span className="text-[11px] font-medium">Click to upload</span>
        </div>
      </div>
      <div className="px-3 py-2.5 border-t border-border-subtle">
        <div className="text-[12px] font-semibold text-text-primary leading-snug">{title}</div>
        <div className="text-[10px] text-text-tertiary mt-0.5 leading-relaxed line-clamp-2">
          {helper}
        </div>
      </div>
    </button>
  );
}
