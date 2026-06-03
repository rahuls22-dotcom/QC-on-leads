"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon, Check, ChevronDown } from "lucide-react";

const CTA_OPTIONS = [
  "Apply now",
  "Book now",
  "Download",
  "Get offer",
  "Get quote",
  "Learn more",
  "See details",
  "Sign up",
  "Subscribe",
];

export interface UploadCreativeModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (creative: { imageFile: string; postText: string; headline: string; description: string; sizes: string[] }) => void;
  angleName: string;
  personaName: string;
}

const SIZE_OPTIONS = [
  { id: "sq", dimensions: "1080×1080", label: "Square — Feed", aspectW: 1, aspectH: 1 },
  { id: "story", dimensions: "1080×1920", label: "Story / Reel", aspectW: 9, aspectH: 16 },
  { id: "landscape", dimensions: "1200×628", label: "Landscape — Feed", aspectW: 1200, aspectH: 628 },
  { id: "portrait", dimensions: "1080×1350", label: "Portrait — Feed", aspectW: 4, aspectH: 5 },
];

export function UploadCreativeModal({ open, onClose, onComplete, angleName, personaName }: UploadCreativeModalProps) {
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [ctaButton, setCtaButton] = useState("Learn more");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(["sq", "story"]);

  const canSubmit = imageFile && primaryText.trim().length > 0 && headline.trim().length > 0 && selectedSizes.length > 0;
  const postText = primaryText; // for preview compatibility

  const toggleSize = (id: string) => {
    setSelectedSizes((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const allSelected = SIZE_OPTIONS.every((s) => selectedSizes.includes(s.id));

  const handleComplete = () => {
    if (!imageFile || !postText.trim()) return;
    onComplete({
      imageFile,
      postText: primaryText.trim(),
      headline: headline.trim(),
      description: description.trim(),
      sizes: selectedSizes.map((id) => SIZE_OPTIONS.find((s) => s.id === id)?.dimensions || id),
    });
    setImageFile(null);
    setPrimaryText("");
    setHeadline("");
    setDescription("");
    setSelectedSizes(["sq", "story"]);
  };

  const handleClose = () => {
    setImageFile(null);
    setPrimaryText("");
    setHeadline("");
    setDescription("");
    setCtaButton("Learn more");
    setSelectedSizes(["sq", "story"]);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-card border border-border shadow-xl w-full max-w-[640px] max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-[16px] font-semibold text-text-primary">Upload Creative</h3>
                <p className="text-[12px] text-text-secondary mt-0.5">{personaName} — {angleName}</p>
              </div>
              <button onClick={handleClose} className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-button transition-colors">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Upload + Text side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">Creative (Image or Video)</label>
                  {!imageFile ? (
                    <div
                      onClick={() => setImageFile("godrej_air_creative.jpg")}
                      className="border-2 border-dashed border-border rounded-[8px] p-6 text-center cursor-pointer hover:border-border-hover hover:bg-surface-page/50 transition-all duration-150 aspect-[4/3] flex flex-col items-center justify-center"
                    >
                      <Upload size={20} strokeWidth={1.5} className="text-text-tertiary mb-2" />
                      <p className="text-[12px] text-text-secondary">Upload image or video</p>
                      <p className="text-[10px] text-text-tertiary mt-1">JPG, PNG, MP4, MOV up to 100MB</p>
                    </div>
                  ) : (
                    <div className="relative border border-border rounded-[8px] aspect-[4/3] bg-surface-secondary flex items-center justify-center">
                      <ImageIcon size={32} strokeWidth={1} className="text-text-tertiary" />
                      <span className="absolute bottom-2 left-2 right-2 text-[10px] text-text-secondary bg-white/80 rounded px-1.5 py-0.5 truncate">{imageFile}</span>
                      <button onClick={() => setImageFile(null)} className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm text-text-tertiary hover:text-text-primary">
                        <X size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1">Primary Text</label>
                    <textarea
                      value={primaryText}
                      onChange={(e) => setPrimaryText(e.target.value)}
                      rows={4}
                      placeholder="Main ad copy that appears above the image..."
                      className="w-full px-2.5 py-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary resize-none leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1">Headline</label>
                    <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Bold headline below the image"
                      className="w-full h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1">Description</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short description text"
                      className="w-full h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-text-primary mb-1">Call to Action</label>
                    <select value={ctaButton} onChange={(e) => setCtaButton(e.target.value)}
                      className="w-full h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                      {CTA_OPTIONS.map((cta) => <option key={cta} value={cta}>{cta}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Size Selection — generate other sizes from one upload */}
              {imageFile && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[12px] font-medium text-text-primary">Generate sizes from your upload</label>
                    <button onClick={() => setSelectedSizes(allSelected ? [] : SIZE_OPTIONS.map((s) => s.id))}
                      className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors">
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SIZE_OPTIONS.map((opt) => {
                      const selected = selectedSizes.includes(opt.id);
                      const maxH = 60;
                      const w = 48;
                      const ratio = opt.aspectH / opt.aspectW;
                      const shapeH = Math.min(Math.round(w * ratio), maxH);
                      const shapeW = ratio > 1 ? Math.round(shapeH / ratio) : w;
                      return (
                        <button key={opt.id} type="button" onClick={() => toggleSize(opt.id)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 border rounded-[8px] transition-all duration-150 ${
                            selected ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "border-border bg-white hover:border-accent/40"
                          }`}>
                          <div className="flex items-center justify-center" style={{ height: `${maxH}px` }}>
                            <div className={`rounded-[3px] flex items-center justify-center transition-colors ${
                              selected ? "bg-accent/15 border border-accent/30" : "bg-surface-secondary border border-border"
                            }`} style={{ width: `${shapeW}px`, height: `${shapeH}px` }}>
                              {selected && <Check size={10} strokeWidth={2} className="text-accent" />}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] font-medium text-text-primary leading-tight">{opt.label.split(" — ")[0]}</div>
                            <div className="text-[9px] text-text-tertiary font-mono">{opt.dimensions}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-2">We&apos;ll auto-resize your upload to the selected sizes</p>
                </div>
              )}

              {/* Meta Ad Preview */}
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-2">Ad Preview</label>
                <div className="border border-border rounded-[8px] overflow-hidden max-w-[300px]">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white">
                    <div className="w-7 h-7 rounded-full bg-surface-secondary flex items-center justify-center">
                      <span className="text-[9px] font-semibold text-text-tertiary">GP</span>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-text-primary">Godrej Properties</div>
                      <div className="text-[9px] text-text-tertiary">Sponsored</div>
                    </div>
                  </div>
                  {postText && (
                    <div className="px-3 py-1.5">
                      <p className="text-[11px] text-text-primary leading-relaxed line-clamp-3">{postText}</p>
                    </div>
                  )}
                  <div className={`aspect-square bg-surface-secondary flex items-center justify-center ${imageFile ? "" : "opacity-40"}`}>
                    <ImageIcon size={32} strokeWidth={1} className="text-text-tertiary" />
                  </div>
                  <div className="px-3 py-1.5 border-t border-border-subtle bg-surface-page">
                    <div className="text-[10px] text-text-secondary mb-0.5">godrejproperties.com</div>
                    {headline && <div className="text-[11px] font-semibold text-text-primary leading-snug">{headline}</div>}
                    {description && <div className="text-[10px] text-text-tertiary mt-0.5 line-clamp-1">{description}</div>}
                  </div>
                  <div className="flex items-center justify-center px-3 py-1.5 border-t border-border-subtle">
                    <span className="text-[10px] font-medium text-accent">{ctaButton}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
              <span className="text-[11px] text-text-tertiary">{selectedSizes.length} size{selectedSizes.length !== 1 ? "s" : ""} selected</span>
              <div className="flex items-center gap-2">
                <button onClick={handleClose}
                  className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
                  Cancel
                </button>
                <button onClick={handleComplete} disabled={!canSubmit}
                  className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
                  Add Creative ({selectedSizes.length} sizes)
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
