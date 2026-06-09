"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Grid3X3,
  List,
  Image as ImageIcon,
  Sparkles,
  Video,
  Layers,
  Upload,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { IllustrationCreatives, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";
import { CreativeStudio } from "@/components/creatives/creative-studio";
import { LIBRARY_CREATIVES, type LibraryCreative, type LibraryFormat } from "@/lib/creatives-studio-data";

const fadeIn = { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2, ease: "easeOut" as const } };

type Tab = "studio" | "library";

const formatConfig: Record<LibraryFormat, { label: string; icon: typeof ImageIcon; cls: string }> = {
  image: { label: "Static", icon: ImageIcon, cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  video: { label: "Reel", icon: Video, cls: "bg-[#FDF4FF] text-[#7C3AED]" },
  carousel: { label: "Carousel", icon: Layers, cls: "bg-[#FEF3C7] text-[#92400E]" },
};

function FormatBadge({ format }: { format: LibraryFormat }) {
  const { label, cls } = formatConfig[format];
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

function Thumb({ c, square = true }: { c: LibraryCreative; square?: boolean }) {
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: square ? "1 / 1" : undefined, background: `linear-gradient(135deg, hsl(${c.hue} 55% 90%), hsl(${c.hue} 45% 76%))` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.src} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      <div className="absolute top-2 right-2">
        <FormatBadge format={c.format} />
      </div>
    </div>
  );
}

export default function CreativesPage() {
  const { isEmpty } = useDemoMode();
  const [tab, setTab] = useState<Tab>("studio");
  const [library, setLibrary] = useState<LibraryCreative[]>(LIBRARY_CREATIVES);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | LibraryFormat>("all");
  const [productFilter, setProductFilter] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const products = useMemo(() => Array.from(new Set(library.map((c) => c.product))), [library]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (isEmpty) return [];
    return library.filter((c) => {
      if (typeFilter !== "all" && c.format !== typeFilter) return false;
      if (productFilter && c.product !== productFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.persona.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [library, search, typeFilter, productFilter, isEmpty]);

  const handleSave = (c: LibraryCreative) => {
    setLibrary((prev) => [c, ...prev]);
    setToast(`Saved to library · ${c.name}`);
  };

  return (
    <motion.div {...fadeIn}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-meta text-text-secondary mb-1">Tools</div>
          <h1 className="text-page-title text-text-primary">Creatives</h1>
          <p className="text-meta text-text-secondary mt-1 max-w-[560px]">
            Work directly with the Creative Agent to draft and iterate on-brand concepts — then keep the winners in your library.
          </p>
        </div>
        {tab === "library" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-text-secondary border border-border bg-white hover:bg-surface-page hover:text-text-primary rounded-button transition-colors duration-150"
            >
              <Upload size={14} strokeWidth={1.5} />
              Upload
            </button>
            <button
              onClick={() => setTab("studio")}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-white text-[13px] font-semibold rounded-button transition-all duration-150"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)", boxShadow: "0 4px 14px -4px rgba(124,58,237,0.5)" }}
            >
              <Sparkles size={14} strokeWidth={1.8} />
              Create with Iris
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle mb-5">
        <TabButton label="Studio" active={tab === "studio"} onClick={() => setTab("studio")} />
        <TabButton label="Library" active={tab === "library"} onClick={() => setTab("library")} count={isEmpty ? 0 : library.length} />
      </div>

      {tab === "studio" ? (
        <CreativeStudio onSave={handleSave} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5">
                {(["all", "image", "video", "carousel"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors duration-150 ${
                      typeFilter === t ? "bg-white text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {t === "all" ? "All" : formatConfig[t].label}
                  </button>
                ))}
              </div>

              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="h-9 px-3 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer min-w-[170px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                <option value="">All projects</option>
                {products.map((c) => (
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
              <button onClick={() => setView("grid")} className={`p-1.5 rounded-[6px] transition-colors duration-150 ${view === "grid" ? "bg-white shadow-sm text-text-primary" : "text-text-tertiary hover:text-text-primary"}`}>
                <Grid3X3 size={15} strokeWidth={1.5} />
              </button>
              <button onClick={() => setView("list")} className={`p-1.5 rounded-[6px] transition-colors duration-150 ${view === "list" ? "bg-white shadow-sm text-text-primary" : "text-text-tertiary hover:text-text-primary"}`}>
                <List size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-border rounded-card">
              {search || typeFilter !== "all" || productFilter ? (
                <EmptyState
                  illustration={<IllustrationSearchEmpty />}
                  title="No creatives match your filters"
                  description="Try a different format, product, or search term."
                  action={
                    <button onClick={() => { setSearch(""); setTypeFilter("all"); setProductFilter(""); }} className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                      Clear filters
                    </button>
                  }
                  compact
                />
              ) : (
                <EmptyState
                  illustration={<IllustrationCreatives />}
                  title="No creatives yet"
                  description="Work with the Creative Agent to draft your first concepts."
                  action={
                    <button onClick={() => setTab("studio")} className="inline-flex items-center gap-1.5 h-9 px-4 text-white text-[13px] font-semibold rounded-button transition-all duration-150" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}>
                      <Sparkles size={14} strokeWidth={1.8} />
                      Create with Iris
                    </button>
                  }
                />
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-4 gap-4">
              {filtered.map((c) => (
                <div key={c.id} className="bg-white border border-border rounded-card overflow-hidden hover:shadow-card-hover hover:-translate-y-px transition-all duration-150">
                  <Thumb c={c} />
                  <div className="p-3">
                    <h3 className="text-[13px] font-medium text-text-primary truncate">{c.name}</h3>
                    <div className="text-[11px] text-text-tertiary mt-1">{c.dimensions} · {c.persona}</div>
                    <div className="text-[11px] text-text-secondary mt-1 truncate">{c.product}</div>
                    <div className="text-[10px] text-text-tertiary mt-1.5">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-border rounded-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    {["", "Name", "Format", "Dimensions", "Product", "Persona", "Created"].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={`border-b border-border-subtle last:border-b-0 ${i % 2 === 0 ? "bg-white" : "bg-surface-page/40"}`}>
                      <td className="px-4 py-2.5">
                        <div className="w-10 h-10 rounded-[4px] overflow-hidden">
                          <Thumb c={c} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-text-primary font-medium max-w-[240px] truncate">{c.name}</td>
                      <td className="px-4 py-2.5"><FormatBadge format={c.format} /></td>
                      <td className="px-4 py-2.5 text-[12px] text-text-secondary tabular-nums">{c.dimensions}</td>
                      <td className="px-4 py-2.5 text-[12px] text-text-secondary max-w-[160px] truncate">{c.product}</td>
                      <td className="px-4 py-2.5 text-[12px] text-text-secondary max-w-[160px] truncate">{c.persona}</td>
                      <td className="px-4 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 text-[11px] text-text-tertiary">
            {filtered.length} creative{filtered.length !== 1 ? "s" : ""}
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowUpload(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-white rounded-card border border-border shadow-lg z-50 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-text-primary">Upload Creative</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors duration-150">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-input p-8 text-center cursor-pointer hover:border-border-hover hover:bg-surface-page/50 transition-all duration-150">
                <Upload size={24} strokeWidth={1.5} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-[13px] text-text-secondary">Drag & drop files, or <span className="text-accent font-medium">browse</span></p>
                <p className="text-[11px] text-text-tertiary mt-1">PNG, JPG, MP4 up to 50MB</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowUpload(false)} className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">Cancel</button>
                <button onClick={() => setShowUpload(false)} className="h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">Upload</button>
              </div>
            </div>
          </div>
        </>
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

function TabButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 py-2.5 px-3.5 text-[13px] font-medium transition-colors ${
        active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
      {typeof count === "number" && <span className="text-[10.5px] text-text-tertiary tabular-nums">{count}</span>}
      {active && <span aria-hidden className="absolute left-3 right-3 -bottom-px h-0.5 bg-text-primary rounded-full" />}
    </button>
  );
}
