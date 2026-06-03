"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Grid3X3,
  List,
  Image as ImageIcon,
  Sparkles,
  Video,
  Layers,
  FileText,
  Pencil,
  Trash2,
  X,
  Upload,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationCreatives, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";
import {
  CreativeGeneratorModal,
  type GeneratedCreative,
} from "@/components/shared/creative-generator-modal";
import {
  NewCreativeLauncher,
  type LaunchContext,
} from "@/components/shared/new-creative-launcher";

const fadeIn = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, ease: "easeOut" as const } };

type CreativeFormat = "image" | "video" | "carousel" | "document";

interface Creative {
  id: string;
  name: string;
  format: CreativeFormat;
  dimensions: string;
  campaign: string;
  createdAt: string;
}

const initialCreatives: Creative[] = [
  { id: "cr-1", name: "Godrej Air 3BHK Carousel v2", format: "carousel", dimensions: "1080×1080", campaign: "Godrej Air Phase 3", createdAt: "2026-03-18" },
  { id: "cr-2", name: "Godrej Air Lifestyle Video", format: "video", dimensions: "1080×1920", campaign: "Godrej Air Phase 3", createdAt: "2026-03-16" },
  { id: "cr-3", name: "Godrej Air Floor Plan Static", format: "image", dimensions: "1080×1080", campaign: "Godrej Air Phase 3", createdAt: "2026-03-14" },
  { id: "cr-4", name: "Godrej Air Amenities Carousel", format: "carousel", dimensions: "1080×1080", campaign: "Godrej Air Phase 3", createdAt: "2026-03-12" },
  { id: "cr-5", name: "Godrej Hero Shot", format: "image", dimensions: "1200×628", campaign: "Godrej Reflections Habitat", createdAt: "2026-03-10" },
  { id: "cr-6", name: "Godrej Price Anchor", format: "image", dimensions: "1080×1080", campaign: "Godrej Reflections Habitat", createdAt: "2026-03-08" },
  { id: "cr-7", name: "Godrej Eternity Walkthrough", format: "video", dimensions: "1920×1080", campaign: "Godrej Eternity", createdAt: "2026-03-06" },
  { id: "cr-8", name: "Godrej Nurture Testimonial", format: "video", dimensions: "1080×1920", campaign: "Godrej Nurture", createdAt: "2026-03-04" },
  { id: "cr-9", name: "Godrej Platinum Brochure", format: "document", dimensions: "A4", campaign: "Godrej Platinum", createdAt: "2026-03-02" },
  { id: "cr-10", name: "Godrej HNI Static", format: "image", dimensions: "1080×1080", campaign: "Godrej Reserve", createdAt: "2026-02-28" },
  { id: "cr-11", name: "Godrej Woodland Reel", format: "video", dimensions: "1080×1920", campaign: "Godrej Woodland", createdAt: "2026-02-26" },
  { id: "cr-12", name: "Godrej Summit Carousel", format: "carousel", dimensions: "1080×1080", campaign: "Godrej Summit", createdAt: "2026-02-24" },
];

const formatConfig: Record<CreativeFormat, { label: string; icon: typeof ImageIcon; cls: string }> = {
  image: { label: "Static", icon: ImageIcon, cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  video: { label: "Video", icon: Video, cls: "bg-[#FDF4FF] text-[#7C3AED]" },
  carousel: { label: "Carousel", icon: Layers, cls: "bg-[#FEF3C7] text-[#92400E]" },
  document: { label: "Document", icon: FileText, cls: "bg-surface-secondary text-text-secondary" },
};

function FormatBadge({ format }: { format: CreativeFormat }) {
  const { label, cls } = formatConfig[format];
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

export default function CreativesPage() {
  const { isEmpty } = useDemoMode();
  const [creatives, setCreatives] = useState<Creative[]>(initialCreatives);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CreativeFormat>("all");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  // Generate flow: launcher dialog -> CreativeGeneratorModal.
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [generatorCtx, setGeneratorCtx] = useState<LaunchContext | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Campaigns surfaced in the filter dropdown — derived from the current
  // (possibly mutated) library so newly-generated entries show up as options.
  const campaigns = useMemo(
    () => Array.from(new Set(creatives.map((c) => c.campaign))),
    [creatives]
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (isEmpty) return [];
    return creatives.filter((c) => {
      if (typeFilter !== "all" && c.format !== typeFilter) return false;
      if (campaignFilter && c.campaign !== campaignFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [creatives, search, typeFilter, campaignFilter, isEmpty]);

  const handleGenerated = (created: GeneratedCreative[]) => {
    if (!generatorCtx || created.length === 0) {
      setGeneratorCtx(null);
      return;
    }
    const ctx = generatorCtx;
    const tag = ctx.sourceCampaign ?? ctx.angleName ?? "Custom";
    const now = new Date().toISOString().slice(0, 10);
    // One library row per generated size — keeps the existing per-asset shape.
    const newRows: Creative[] = created.map((c, i) => ({
      id: `cr-${Date.now()}-${i}`,
      name: `${ctx.angleName} — ${c.label}`,
      format: "image",
      dimensions: c.size,
      campaign: tag,
      createdAt: now,
    }));
    setCreatives((prev) => [...newRows, ...prev]);
    setGeneratorCtx(null);
    setToast(
      `${newRows.length} creative${newRows.length !== 1 ? "s" : ""} added · ${ctx.angleName}`
    );
  };

  return (
    <motion.div {...fadeIn}>
      {/* Header */}
      <motion.div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-meta text-text-secondary mb-1">Tools</div>
          <h1 className="text-page-title text-text-primary">Creatives</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-text-secondary border border-border bg-white hover:bg-surface-page hover:text-text-primary rounded-button transition-colors duration-150"
          >
            <Upload size={14} strokeWidth={1.5} />
            Upload
          </button>
          <button
            onClick={() => setLauncherOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-[13px] font-semibold rounded-button transition-all duration-150 shadow-[0_4px_14px_-4px_rgba(139,92,246,0.5)]"
          >
            <Sparkles size={14} strokeWidth={1.5} />
            New creative
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
            {(["all", "image", "video", "carousel", "document"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors duration-150 capitalize ${
                  typeFilter === t
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t === "all" ? "All" : formatConfig[t].label}
              </button>
            ))}
          </div>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="h-9 px-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer min-w-[160px]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px] h-9 pl-8 pr-3 text-[12px] border border-border rounded-input bg-white focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
            />
          </div>
        </div>

        <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-[6px] transition-colors duration-150 ${
              view === "grid" ? "bg-white shadow-sm text-text-primary" : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <Grid3X3 size={15} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded-[6px] transition-colors duration-150 ${
              view === "list" ? "bg-white shadow-sm text-text-primary" : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <List size={15} strokeWidth={1.5} />
          </button>
        </div>
      </motion.div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-card">
          {search || typeFilter !== "all" || campaignFilter ? (
            <EmptyState
              illustration={<IllustrationSearchEmpty />}
              title="No creatives match your filters"
              description="Try a different format, campaign, or search term."
              action={
                <button onClick={() => { setSearch(""); setTypeFilter("all"); setCampaignFilter(""); }}
                  className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                  Clear filters
                </button>
              }
              compact
            />
          ) : (
            <EmptyState
              illustration={<IllustrationCreatives />}
              title="No creatives yet"
              description="Generate a new creative with AI, or upload an existing asset."
              action={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLauncherOpen(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white text-[13px] font-semibold rounded-button transition-all duration-150 shadow-[0_4px_14px_-4px_rgba(139,92,246,0.5)]"
                  >
                    <Sparkles size={14} strokeWidth={1.5} />
                    New creative
                  </button>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page hover:text-text-primary transition-colors duration-150"
                  >
                    Upload
                  </button>
                </div>
              }
            />
          )}
        </div>
      ) : view === "grid" ? (
        <motion.div className="grid grid-cols-4 gap-4">
          {filtered.map((c) => {
            const Icon = formatConfig[c.format].icon;
            return (
              <div
                key={c.id}
                className="bg-white border border-border rounded-card overflow-hidden hover:shadow-card-hover hover:-translate-y-px transition-all duration-150 group"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-surface-secondary flex items-center justify-center relative">
                  <Icon size={32} strokeWidth={1} className="text-text-tertiary/40" />
                  <div className="absolute top-2 right-2">
                    <FormatBadge format={c.format} />
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-[13px] font-medium text-text-primary truncate">{c.name}</h3>
                  <div className="text-[11px] text-text-tertiary mt-1">{c.dimensions}</div>
                  <div className="text-[11px] text-text-secondary mt-1 truncate">{c.campaign}</div>
                  <div className="text-[10px] text-text-tertiary mt-1.5">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div className="bg-white border border-border rounded-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {["", "Name", "Format", "Dimensions", "Campaign", "Created", ""].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const Icon = formatConfig[c.format].icon;
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-border-subtle last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="w-10 h-10 bg-surface-secondary rounded-[4px] flex items-center justify-center">
                        <Icon size={16} strokeWidth={1.5} className="text-text-tertiary" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-text-primary font-medium max-w-[220px] truncate">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <FormatBadge format={c.format} />
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary tabular-nums">
                      {c.dimensions}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary max-w-[180px] truncate">
                      {c.campaign}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button className="text-text-tertiary hover:text-text-primary transition-colors duration-150">
                          <Pencil size={13} strokeWidth={1.5} />
                        </button>
                        <button className="text-text-tertiary hover:text-status-error transition-colors duration-150">
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Count */}
      <motion.div className="mt-3 text-[11px] text-text-tertiary">
        {filtered.length} creative{filtered.length !== 1 ? "s" : ""}
      </motion.div>

      {/* Upload Modal */}
      {showUpload && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowUpload(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-white rounded-card border border-border shadow-lg z-50 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-text-primary">Upload Creative</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors duration-150"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-input p-8 text-center cursor-pointer hover:border-border-hover hover:bg-surface-page/50 transition-all duration-150">
                <Upload size={24} strokeWidth={1.5} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-[13px] text-text-secondary">
                  Drag & drop files, or <span className="text-accent font-medium">browse</span>
                </p>
                <p className="text-[11px] text-text-tertiary mt-1">PNG, JPG, MP4, PDF up to 50MB</p>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="Creative name..."
                  className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Format</label>
                  <select className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                    }}
                  >
                    <option value="">Select format...</option>
                    <option value="image">Static Image</option>
                    <option value="video">Video</option>
                    <option value="carousel">Carousel</option>
                    <option value="document">Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1.5">Campaign</label>
                  <select className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                    }}
                  >
                    <option value="">None (optional)</option>
                    {campaigns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowUpload(false)}
                  className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowUpload(false)}
                  className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* New-creative launcher (Step 1: pick a strategy) */}
      <NewCreativeLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onContinue={(ctx) => {
          setLauncherOpen(false);
          setGeneratorCtx(ctx);
        }}
      />

      {/* Generator modal (Step 2: full creative-generation flow) */}
      {generatorCtx && (
        <CreativeGeneratorModal
          open={!!generatorCtx}
          onClose={() => setGeneratorCtx(null)}
          onComplete={handleGenerated}
          angleName={generatorCtx.angleName}
          personaName={generatorCtx.personaName}
          personaRole={generatorCtx.personaRole}
          personaBullets={generatorCtx.personaBullets}
          painPoint={generatorCtx.painPoint}
          usp={generatorCtx.usp}
          hook={generatorCtx.hook}
          cta={generatorCtx.cta}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-text-primary text-white text-[13px] font-medium px-4 py-2.5 rounded-[8px] shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </motion.div>
  );
}
