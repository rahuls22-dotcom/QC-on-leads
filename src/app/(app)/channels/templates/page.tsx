"use client";

import { useState } from "react";
import { WAGuard } from "@/components/channels/wa-guard";
import { useWA, TEMPLATES_BY_APP, WATemplate } from "@/lib/whatsapp-context";
import { CheckCircle2, Clock, XCircle, ExternalLink, ChevronDown, MessageCircle, Hash } from "lucide-react";

type TemplateStatus = "approved" | "pending" | "rejected";
const STATUS_CONFIG: Record<TemplateStatus, { label: string; className: string; icon: React.ElementType }> = {
  approved: { label: "Approved",       className: "bg-green-50 text-green-700 border-green-200",  icon: CheckCircle2 },
  pending:  { label: "Pending review", className: "bg-amber-50 text-amber-700 border-amber-200",  icon: Clock },
  rejected: { label: "Rejected",       className: "bg-red-50 text-red-700 border-red-200",        icon: XCircle },
};

function StatusBadge({ status }: { status: TemplateStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[11px] font-semibold border ${cfg.className}`}>
      <Icon size={10} strokeWidth={2.5} />{cfg.label}
    </span>
  );
}

function BodyTooltip({ text }: { text: string }) {
  return (
    <div className="absolute left-0 top-full mt-1.5 z-30 w-[360px] bg-[#1a1a1a] text-white text-[12px] leading-relaxed px-3.5 py-2.5 rounded-[8px] shadow-xl pointer-events-none">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Template body</div>
      {text}
      <div className="absolute -top-1.5 left-6 w-3 h-3 bg-[#1a1a1a] rotate-45" />
    </div>
  );
}

const CATEGORIES = ["All", "Marketing", "Utility", "Authentication"];

export default function TemplatesPage() {
  const { activeApps, vendor } = useWA();
  const vendorName = vendor === "gupshup" ? "Gupshup" : vendor === "wati" ? "Wati" : "provider";
  const vendorUrl  = vendor === "gupshup" ? "https://app.gupshup.io" : "https://app.wati.io";

  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [appDropOpen, setAppDropOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedApp = activeApps.find(a => a.id === selectedAppId) ?? null;
  const allTemplates: WATemplate[] = selectedAppId ? (TEMPLATES_BY_APP[selectedAppId] ?? []) : [];
  const filtered = activeCategory === "All" ? allTemplates : allTemplates.filter(t => t.category === activeCategory);

  const counts = {
    approved: allTemplates.filter(t => t.status === "approved").length,
    pending:  allTemplates.filter(t => t.status === "pending").length,
    rejected: allTemplates.filter(t => t.status === "rejected").length,
  };

  return (
    <WAGuard>
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[20px] font-semibold text-text-primary">WhatsApp Templates</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">
              Templates are per number. Select a number below to view its approved templates.{" "}
              <a href={vendorUrl} target="_blank" rel="noreferrer" className="text-text-primary underline underline-offset-2">
                Manage in {vendorName}
              </a>
            </p>
          </div>
          <a href={vendorUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium border border-border text-text-secondary hover:bg-surface-secondary transition-colors flex-shrink-0">
            <ExternalLink size={13} strokeWidth={1.5} />Create in {vendorName}
          </a>
        </div>

        {/* ── Number selector ───────────────────────────────────────────── */}
        <div className="mb-5">
          <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">WhatsApp number</div>
          <div className="relative inline-block">
            <button
              onClick={() => setAppDropOpen(o => !o)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-[8px] border text-[13px] font-medium transition-colors min-w-[280px] ${
                selectedApp ? "border-border text-text-primary bg-white" : "border-dashed border-border text-text-tertiary bg-white hover:border-zinc-400"
              }`}
            >
              {selectedApp ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-[#e8f7f0] flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={11} strokeWidth={2} className="text-[#15803d]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="truncate">{selectedApp.name}</div>
                    <div className="text-[10.5px] text-text-tertiary font-normal">{selectedApp.phone}</div>
                  </div>
                </>
              ) : (
                <>
                  <Hash size={14} strokeWidth={2} className="text-text-tertiary flex-shrink-0" />
                  <span className="flex-1 text-left">Select a WhatsApp number</span>
                </>
              )}
              <ChevronDown size={13} strokeWidth={2} className={`text-text-tertiary transition-transform flex-shrink-0 ${appDropOpen ? "rotate-180" : ""}`} />
            </button>

            {appDropOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAppDropOpen(false)} />
                <div className="absolute left-0 top-[calc(100%+4px)] z-20 bg-white border border-border rounded-[8px] shadow-xl py-1.5 min-w-[280px]">
                  {activeApps.map(app => (
                    <button key={app.id} onClick={() => { setSelectedAppId(app.id); setActiveCategory("All"); setAppDropOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors ${selectedAppId === app.id ? "bg-surface-secondary" : ""}`}>
                      <div className="w-7 h-7 rounded-full bg-[#e8f7f0] flex items-center justify-center flex-shrink-0">
                        <MessageCircle size={12} strokeWidth={2} className="text-[#15803d]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-semibold text-text-primary truncate">{app.name}</div>
                        <div className="text-[10.5px] text-text-tertiary">{app.phone}</div>
                      </div>
                      {selectedAppId === app.id && <CheckCircle2 size={13} strokeWidth={2} className="text-green-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── No number selected ────────────────────────────────────────── */}
        {!selectedApp && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white border border-border rounded-[8px]">
            <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center">
              <MessageCircle size={20} strokeWidth={1.5} className="text-text-tertiary" />
            </div>
            <div className="text-[13.5px] font-semibold text-text-primary">Select a number to view templates</div>
            <p className="text-[12.5px] text-text-tertiary text-center max-w-xs">
              Each WhatsApp number has its own set of approved templates. Pick a number from the dropdown above.
            </p>
          </div>
        )}

        {/* ── Templates table ───────────────────────────────────────────── */}
        {selectedApp && (
          <>
            {/* Stats */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[8px] text-[12.5px]">
                <span className="font-semibold text-text-primary">{allTemplates.length}</span>
                <span className="text-text-tertiary">templates</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[8px] text-[12.5px]">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-semibold text-green-700">{counts.approved}</span>
                <span className="text-text-tertiary">approved</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[8px] text-[12.5px]">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold text-amber-700">{counts.pending}</span>
                <span className="text-text-tertiary">pending</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border rounded-[8px] text-[12.5px]">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="font-semibold text-red-700">{counts.rejected}</span>
                <span className="text-text-tertiary">rejected</span>
              </div>
            </div>

            <div className="bg-white border border-border rounded-[8px] overflow-hidden">
              {/* Filter tabs */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <div className="flex items-center gap-1">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors ${activeCategory === cat ? "bg-surface-secondary text-text-primary" : "text-text-secondary hover:bg-surface-secondary/60"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-text-tertiary">{filtered.length} templates</span>
              </div>

              {/* Table head */}
              <div className="grid bg-[#fafbfc] border-b border-border px-4 py-2.5" style={{ gridTemplateColumns: "2fr 130px 100px 160px 100px" }}>
                {["Template", "Category", "Language", "Status", "Modified"].map(h => (
                  <div key={h} className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-wide">{h}</div>
                ))}
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-text-tertiary">No templates in this category.</div>
              ) : filtered.map(t => (
                <div key={t.id}
                  className="relative grid items-center px-4 py-3 border-b border-border last:border-0 hover:bg-[#fafbfc] transition-colors cursor-default"
                  style={{ gridTemplateColumns: "2fr 130px 100px 160px 100px" }}
                  onMouseEnter={() => setHoveredId(t.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="relative min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#e8f7f0] flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-bold text-[#15803d]">WA</span>
                      </div>
                      <span className="text-[12.5px] font-semibold text-text-primary truncate">{t.name}</span>
                    </div>
                    <p className="text-[11.5px] text-text-tertiary mt-0.5 ml-8 truncate">
                      {t.body.length > 60 ? t.body.slice(0, 60) + "…" : t.body}
                    </p>
                    {hoveredId === t.id && <BodyTooltip text={t.body} />}
                  </div>
                  <div><span className="px-2 py-0.5 rounded-[5px] bg-surface-secondary text-text-secondary text-[11.5px] font-medium border border-border">{t.category}</span></div>
                  <div className="text-[12px] text-text-secondary">{t.languages.join(", ")}</div>
                  <div><StatusBadge status={t.status as TemplateStatus} /></div>
                  <div className="text-[12px] text-text-tertiary">
                    {new Date(t.modifiedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11.5px] text-text-tertiary mt-3 text-center">
              Delivery, read and reply metrics are not available via the WABA API — use your {vendorName} dashboard for analytics.
            </p>
          </>
        )}
      </div>
    </WAGuard>
  );
}
