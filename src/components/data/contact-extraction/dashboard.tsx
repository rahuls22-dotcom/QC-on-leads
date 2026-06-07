"use client";

// Shared run helpers for the Contact-extraction UI. The module used to have a
// standalone Dashboard tab; that's gone (the few metrics worth seeing moved to
// the top of Extracted contacts). What remains here is the run status badge and
// relative-time formatter, reused by the history table and the run drawer.

import { type CERun } from "@/lib/contact-extraction-data";

export function RunStatusBadge({ run }: { run: CERun }) {
  if (run.status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
        {Math.round(run.progress * 100)}%
      </span>
    );
  }
  if (run.status === "failed") {
    return (
      <span className="inline-flex items-center text-[11px] font-medium text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-badge px-2 py-0.5">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-medium text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-badge px-2 py-0.5">
      Done
    </span>
  );
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
