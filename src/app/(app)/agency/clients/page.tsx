"use client";
import { useState } from "react";
import { Building2, Plus, Users, MessageCircle, GitBranch, MoreHorizontal, Check, Pause, Trash2, ChevronRight, Zap } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import Link from "next/link";

export default function ClientsPage() {
  const { clientWorkspaces, switchWorkspace } = useWorkspace();

  const stats = [
    { label: "Total Clients", value: clientWorkspaces.length, sub: "Active sub-accounts" },
    { label: "Total Leads", value: "12,483", sub: "Across all clients" },
    { label: "Active Sequences", value: "9", sub: "Running automations" },
    { label: "WA Connected", value: `${clientWorkspaces.filter(w => w.waba).length} / ${clientWorkspaces.length}`, sub: "WhatsApp linked" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">Client Workspaces</h1>
          <p className="text-[12.5px] text-text-secondary mt-0.5">
            Each client is an isolated sub-account with its own CRM, channels, and automations.
          </p>
        </div>
        <Link href="/agency-setup"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold bg-text-primary text-white hover:bg-charcoal-light transition-colors">
          <Plus size={13} strokeWidth={2} />Add client
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-border rounded-[8px] px-4 py-3">
            <div className="text-[22px] font-bold text-text-primary">{s.value}</div>
            <div className="text-[12px] font-medium text-text-primary mt-0.5">{s.label}</div>
            <div className="text-[11px] text-text-tertiary">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Client list */}
      <div className="bg-white border border-border rounded-[8px] overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[13px] font-semibold text-text-primary">All Clients</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-secondary text-text-tertiary">{clientWorkspaces.length}</span>
        </div>

        {clientWorkspaces.map((ws, i) => (
          <div key={ws.id} className={`flex items-center gap-4 px-4 py-4 ${i < clientWorkspaces.length - 1 ? "border-b border-border" : ""} hover:bg-[#fafbfc] transition-colors group`}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0" style={{ background: ws.color }}>
              {ws.initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-semibold text-text-primary">{ws.name}</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-green-50 border border-green-200 text-[9px] font-bold text-green-700">
                  <span className="w-1 h-1 rounded-full bg-green-500 inline-block" />ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {ws.waba ? (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                    <MessageCircle size={10} strokeWidth={2} />WA Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                    <MessageCircle size={10} strokeWidth={2} />WA Not connected
                  </span>
                )}
                <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <GitBranch size={10} strokeWidth={2} />2 sequences
                </span>
                <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <Users size={10} strokeWidth={2} />3 users
                </span>
              </div>
            </div>

            {/* Lead count */}
            <div className="text-right flex-shrink-0">
              <div className="text-[14px] font-semibold text-text-primary">
                {i === 0 ? "4,281" : i === 1 ? "3,942" : "2,104"}
              </div>
              <div className="text-[10.5px] text-text-tertiary">leads</div>
            </div>

            {/* CTA */}
            <button onClick={() => switchWorkspace(ws.id)}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11.5px] font-semibold border border-border text-text-secondary hover:bg-surface-secondary transition-all">
              Open<ChevronRight size={12} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      {/* GHL-style info box */}
      <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-[8px] flex items-start gap-3">
        <Zap size={14} strokeWidth={2} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-[12px] font-semibold text-blue-900">Agency controls all sub-accounts</div>
          <p className="text-[11.5px] text-blue-700 mt-0.5">
            Each client workspace is fully isolated — its own CRM, WhatsApp, sequences, and team access.
            The agency account manages billing, permissions, and can deploy templates across clients.
          </p>
        </div>
      </div>
    </div>
  );
}
