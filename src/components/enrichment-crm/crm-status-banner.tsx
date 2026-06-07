"use client";

import { useEnrichmentCrmStore, type CrmConnection } from "@/lib/enrichment-crm-data";
import { Database, Settings2 } from "lucide-react";

interface BannerProps {
  onViewMapping?: () => void;
  mappingOpen?: boolean;
}

// Small horizontal status strip that sits above the tabs.
// Assumes the CRM is connected, mapped, and pre-configured, this is read-only.
export function CrmStatusBanner({ onViewMapping, mappingOpen }: BannerProps = {}) {
  const conn = useEnrichmentCrmStore((s) => s.crmConnection);

  return (
    <div className="flex items-center gap-3 flex-wrap bg-white border border-border rounded-card px-4 py-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-button bg-[#F0FDF4]">
          <Database size={14} strokeWidth={1.75} className="text-[#15803D]" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-text-primary capitalize">{conn.provider}</span>
            <StatusDot status={conn.status} />
            <span className="text-[12px] text-text-secondary truncate">{conn.accountName}</span>
          </div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            Last sync {relative(conn.lastSyncedAt)} · {conn.mappedFieldCount} fields mapped · Policy: {policyLabel(conn.writeBackPolicy)}
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onViewMapping}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-button transition-colors bg-white"
          title="View field mapping (read-only)"
          aria-expanded={mappingOpen}
        >
          <Settings2 size={12} strokeWidth={1.75} />
          {mappingOpen ? "Hide mapping" : "View mapping"}
        </button>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: CrmConnection["status"] }) {
  const tone =
    status === "connected" ? "bg-[#22C55E]" :
    status === "degraded" ? "bg-[#F59E0B]" :
    "bg-[#EF4444]";
  const label = status === "connected" ? "Connected" : status === "degraded" ? "Degraded" : "Disconnected";
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-text-secondary">
      <span className={`w-1.5 h-1.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function policyLabel(p: CrmConnection["writeBackPolicy"]): string {
  return p === "fill_blanks" ? "Fill blanks only" : p === "overwrite" ? "Overwrite all" : "Selective fields";
}

function relative(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
