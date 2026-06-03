"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Plus,
  Users,
  Globe,
  Database,
  Upload,
  X,
  Search,
  MapPin,
  Sliders,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationAudiences } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

type AudienceStatus = "active" | "draft";
type AudienceSource = "revspot_db" | "website_visitors" | "crm_lookalike" | "csv_upload";

interface Audience {
  id: string;
  name: string;
  source: AudienceSource;
  size: number;
  createdAt: string;
  usedIn: string[];
  status: AudienceStatus;
  description: string;
}

const audiences: Audience[] = [
  {
    id: "aud-1", name: "HNI Whitefield 30-55", source: "revspot_db",
    size: 8420, createdAt: "2026-03-10", usedIn: ["Godrej Reflections", "Godrej Nurture"],
    status: "active", description: "High net-worth individuals in Whitefield, aged 30-55, income ₹25L+",
  },
  {
    id: "aud-2", name: "IT Corridor — Sarjapur", source: "revspot_db",
    size: 14200, createdAt: "2026-03-05", usedIn: ["Godrej Air Phase 3"],
    status: "active", description: "IT professionals along Sarjapur Road corridor, aged 28-45",
  },
  {
    id: "aud-3", name: "Website Visitors — Last 30d", source: "website_visitors",
    size: 3850, createdAt: "2026-03-15", usedIn: ["Godrej Eternity"],
    status: "active", description: "Users who visited property pages in the last 30 days",
  },
  {
    id: "aud-4", name: "CRM Lookalike — Buyers", source: "crm_lookalike",
    size: 22000, createdAt: "2026-02-28", usedIn: [],
    status: "draft", description: "Lookalike of converted buyers from CRM, 1% similarity",
  },
  {
    id: "aud-5", name: "NRI Investors — UAE+US", source: "csv_upload",
    size: 1240, createdAt: "2026-03-18", usedIn: ["Godrej Reserve"],
    status: "active", description: "NRI investors based in UAE and US, uploaded from broker network CSV",
  },
];

function sourceLabel(s: AudienceSource) {
  const map = { revspot_db: "Revspot Database", website_visitors: "Website Visitors", crm_lookalike: "CRM Lookalike", csv_upload: "CSV Upload" };
  return map[s];
}

function SourceIcon({ source }: { source: AudienceSource }) {
  const map = { revspot_db: Database, website_visitors: Globe, crm_lookalike: Users, csv_upload: Upload };
  const Icon = map[source];
  return <Icon size={14} strokeWidth={1.5} className="text-text-tertiary" />;
}

// ── Create Audience Modal ───────────────────────────────────
function CreateAudienceModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState<AudienceSource>("revspot_db");
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const sources: { key: AudienceSource; label: string; icon: typeof Database; desc: string }[] = [
    { key: "revspot_db", label: "Revspot Database", icon: Database, desc: "Filter from our proprietary data" },
    { key: "csv_upload", label: "Upload CSV", icon: Upload, desc: "Import your own audience list" },
    { key: "website_visitors", label: "Website Visitors", icon: Globe, desc: "Retarget site visitors" },
    { key: "crm_lookalike", label: "CRM Contacts", icon: Users, desc: "Build lookalike from CRM" },
  ];

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-8">
        <div className="bg-white rounded-card border border-border shadow-lg w-full max-w-[600px] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
            <h2 className="text-[16px] font-semibold text-text-primary">Create Audience</h2>
            <button onClick={onClose} className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors duration-150">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1.5">Audience Name</label>
              <input type="text" placeholder="e.g., HNI Whitefield 30-55" className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary" />
            </div>

            {/* Source */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-2">Source</label>
              <div className="grid grid-cols-2 gap-2">
                {sources.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button key={s.key} onClick={() => setSource(s.key)} className={`flex items-start gap-3 p-3 rounded-card border text-left transition-all duration-150 ${source === s.key ? "border-accent ring-1 ring-accent/20 bg-white" : "border-border bg-white hover:border-border-hover"}`}>
                      <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 ${source === s.key ? "bg-accent/10 text-accent" : "bg-surface-secondary text-text-tertiary"}`}>
                        <Icon size={16} strokeWidth={1.5} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-text-primary">{s.label}</div>
                        <div className="text-[11px] text-text-tertiary mt-0.5">{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Revspot DB Filters */}
            {source === "revspot_db" && (
              <div className="space-y-4 border-t border-border-subtle pt-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sliders size={13} strokeWidth={1.5} className="text-text-tertiary" />
                  <span className="text-[12px] font-medium text-text-secondary uppercase tracking-[0.4px]">Filters</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1">City</label>
                    <input type="text" defaultValue="Bangalore" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1">Area / Locality</label>
                    <input type="text" placeholder="e.g., Whitefield, Sarjapur" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1">Age Range</label>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue="30" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums" />
                      <span className="text-text-tertiary text-[12px]">to</span>
                      <input type="number" defaultValue="55" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1">Income Range (₹L/year)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue="25" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 tabular-nums" />
                      <span className="text-text-tertiary text-[12px]">to</span>
                      <input type="number" placeholder="∞" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-text-secondary mb-1">Industry / Occupation</label>
                  <input type="text" placeholder="e.g., IT, Finance, Business Owner" className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary" />
                </div>
                {/* Preview */}
                <div className="bg-surface-page rounded-[8px] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} strokeWidth={1.5} className="text-text-tertiary" />
                    <span className="text-[13px] text-text-primary font-medium">~8,420 profiles match</span>
                  </div>
                  <span className="text-[11px] text-text-tertiary">Based on current filters</span>
                </div>
              </div>
            )}

            {source === "csv_upload" && (
              <div className="border-2 border-dashed border-border rounded-card p-8 text-center hover:border-accent/40 transition-colors duration-150 cursor-pointer">
                <Upload size={28} strokeWidth={1} className="mx-auto text-text-tertiary mb-3" />
                <p className="text-[13px] text-text-primary font-medium">Drop your CSV file here</p>
                <p className="text-[12px] text-text-tertiary mt-1">CSV with phone numbers or emails</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-white">
            <button onClick={onClose} className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">Cancel</button>
            <button className="h-9 px-5 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">Create Audience</button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main Page ───────────────────────────────────────────────
export default function AudiencesPage() {
  const { isEmpty } = useDemoMode();
  const [showCreate, setShowCreate] = useState(false);
  const audienceList = isEmpty ? [] : audiences;

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">CRM</div>
          <h1 className="text-page-title text-text-primary">Audiences</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
          <Plus size={15} strokeWidth={2} /> Create Audience
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 mb-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold tabular-nums text-text-primary">{audiences.length}</span>
          <span className="text-[12px] text-text-tertiary">Audiences</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold tabular-nums text-text-primary">
            {(audiences.reduce((a, b) => a + b.size, 0) / 1000).toFixed(1)}K
          </span>
          <span className="text-[12px] text-text-tertiary">Total profiles</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold tabular-nums text-[#1D4ED8]">
            {audiences.filter((a) => a.status === "active").length}
          </span>
          <span className="text-[12px] text-text-tertiary">Active</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        {audienceList.length === 0 ? (
          <div className="col-span-2">
            <EmptyState
              illustration={<IllustrationAudiences />}
              title="No audiences created"
              description="Build targeted audiences from your database, CRM, or CSV uploads."
              action={
                <button onClick={() => setShowCreate(true)}
                  className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
                  Create Audience
                </button>
              }
            />
          </div>
        ) : audienceList.map((aud) => (
          <div key={aud.id} className="bg-white border border-border rounded-card p-5 hover:shadow-card-hover hover:-translate-y-px transition-all duration-150 cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-[14px] font-semibold text-text-primary">{aud.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <SourceIcon source={aud.source} />
                  <span className="text-[12px] text-text-secondary">{sourceLabel(aud.source)}</span>
                </div>
              </div>
              <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${aud.status === "active" ? "bg-[#F0FDF4] text-[#15803D]" : "bg-surface-secondary text-text-secondary"}`}>
                {aud.status === "active" ? "Active" : "Draft"}
              </span>
            </div>

            <p className="text-[12px] text-text-secondary leading-relaxed mb-3">{aud.description}</p>

            <div className="flex items-center gap-4 pt-3 border-t border-border-subtle">
              <div>
                <div className="text-[11px] text-text-tertiary">Size</div>
                <div className="text-[14px] font-semibold text-text-primary tabular-nums">{aud.size.toLocaleString("en-IN")}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-tertiary">Used in</div>
                <div className="text-[12px] text-text-primary font-medium">
                  {aud.usedIn.length > 0
                    ? aud.usedIn.length === 1
                      ? aud.usedIn[0]
                      : `${aud.usedIn.length} campaigns`
                    : "Not used yet"}
                </div>
              </div>
              <div className="ml-auto">
                <div className="text-[11px] text-text-tertiary">Created</div>
                <div className="text-[12px] text-text-secondary tabular-nums">
                  {new Date(aud.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <CreateAudienceModal onClose={() => setShowCreate(false)} />}
    </motion.div>
  );
}
