"use client";

// Per-product Channel config (Settings side of the 3-noun model). A Channel is
// the data pipeline for ONE product over a CRM connection: where leads come from
// (source), where they're written (destination), and which leads write back
// (stage gate). The Connection itself is managed in Integrations — this card
// links there and only configures product behavior.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown, Inbox, Database, ExternalLink } from "lucide-react";
import { crmConnections } from "@/lib/crm-integration-data";
import type { ChannelConfig } from "@/lib/crm-integration-data";
import type { ProductKey } from "@/lib/products";
import { ProviderMark, StatusBadge } from "@/components/integrations/crm-bits";
import { ConfigCard, ConfigChoice } from "./product-config";

type StageGate = ChannelConfig["writeBack"]["stageGate"];

const STAGE_OPTIONS: { value: StageGate; label: string; helper: string }[] = [
  { value: "all", label: "All leads", helper: "Write back every lead this product touches." },
  {
    value: "intent_qualified",
    label: "Intent-qualified",
    helper: "Only leads showing buying intent.",
  },
  {
    value: "qualified_only",
    label: "Qualified only",
    helper: "Only fully qualified, sales-ready leads.",
  },
];

function SourceLabel({ channel }: { channel: ChannelConfig }) {
  if (channel.source.type === "push_api") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Inbox size={13} strokeWidth={1.5} className="text-text-tertiary" />
        Inbound API · {channel.source.location}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Database size={13} strokeWidth={1.5} className="text-text-tertiary" />
      {channel.source.location}
    </span>
  );
}

export function ChannelConfigCard({ product }: { product: ProductKey }) {
  // Model A: find the global connection tagged with this product.
  const conn = crmConnections.find((c) => c.products.includes(product));
  const channel = conn?.channels.find((ch) => ch.product === product);
  const [stageGate, setStageGate] = useState<StageGate>(
    channel?.writeBack.stageGate ?? "all",
  );

  // Empty state — no CRM serves this product yet.
  if (!conn || !channel) {
    return (
      <ConfigCard
        title="CRM channel"
        description="No CRM connection is serving this product yet."
      >
        <div className="flex items-center justify-between rounded-card border border-dashed border-border px-4 py-4">
          <div className="text-[12.5px] text-text-secondary">
            Connect a CRM and tag it with this product to enable sync.
          </div>
          <Link
            href="/integrations"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 shrink-0"
          >
            Connect CRM
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </div>
      </ConfigCard>
    );
  }

  return (
    <ConfigCard
      title="CRM channel"
      description="How this product's leads flow to and from your CRM."
      badge={<StatusBadge status={conn.status} />}
    >
      {/* Connection header */}
      <Link
        href={`/integrations/crm/${conn.id}`}
        className="group flex items-center gap-3 rounded-card border border-border px-3.5 py-3 mb-4 hover:border-border-strong transition-colors duration-150"
      >
        <ProviderMark provider={conn.provider} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text-primary truncate">{conn.label}</div>
          <div className="text-[11.5px] text-text-tertiary font-mono truncate">{conn.crmUrl}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-text-tertiary group-hover:text-text-secondary transition-colors duration-150 shrink-0">
          Manage
          <ExternalLink size={12} strokeWidth={1.5} />
        </span>
      </Link>

      {/* Source → Destination */}
      <div className="rounded-card bg-surface-page border border-border-subtle p-3.5 mb-4">
        <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1">
          Source
        </div>
        <div className="text-[12.5px] text-text-primary">
          <SourceLabel channel={channel} />
        </div>
        <div className="flex justify-center my-1.5">
          <ArrowDown size={14} strokeWidth={1.5} className="text-text-tertiary" />
        </div>
        <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1">
          Destination
        </div>
        <div className="text-[12.5px] text-text-primary">
          {channel.destination.location}
          <span className="text-text-tertiary">
            {" "}· dedup on{" "}
            <span className="font-mono">{channel.destination.dedupKey}</span>
          </span>
        </div>
      </div>

      {/* Stage gate */}
      <div>
        <div className="text-[12.5px] font-medium text-text-primary mb-0.5">Write-back policy</div>
        <div className="text-[11px] text-text-tertiary mb-2.5 leading-relaxed">
          Which leads get pushed back to the CRM.
        </div>
        <ConfigChoice value={stageGate} onChange={setStageGate} options={STAGE_OPTIONS} />
      </div>
    </ConfigCard>
  );
}
