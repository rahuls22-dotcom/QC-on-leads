"use client";

import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Wand2, Upload, Image as ImageIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { angleData, facebookPages, strategyData } from "@/lib/wizard-data";
import { CreativeGeneratorModal } from "@/components/shared/creative-generator-modal";
import type { GeneratedCreative } from "@/components/shared/creative-generator-modal";
import { UploadCreativeModal } from "@/components/shared/upload-creative-modal";

interface Step3Props {
  onNext: () => void;
  onBack: () => void;
}

interface CardCreative {
  type: "generated" | "uploaded";
  postText: string;
  sizes?: string[];
  imageFile?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.35, ease: "easeOut" as const },
  }),
};

export function Step3Creatives({ onNext, onBack }: Step3Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [cardCreatives, setCardCreatives] = useState<Record<string, CardCreative>>({});
  const [generatorModalAngle, setGeneratorModalAngle] = useState<string | null>(null);
  const [uploadModalAngle, setUploadModalAngle] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const hasAnyCreative = Object.keys(cardCreatives).length > 0;
  const activeGeneratorAngle = angleData.find((a) => a.id === generatorModalAngle);
  const activeUploadAngle = angleData.find((a) => a.id === uploadModalAngle);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-[20px] font-semibold text-text-primary">Creative Strategy</h2>
        <p className="text-meta text-text-secondary mt-1">AI has generated an angle for each persona. Generate or upload creatives for each.</p>
      </div>

      {/* Facebook Page Selection (needed before forms step) */}
      {!isLoading && (
        <div className="bg-white border border-border rounded-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[13px] font-medium text-text-primary">Facebook Page</span>
              <p className="text-[11px] text-text-tertiary mt-0.5">Required for lead forms in the next step</p>
            </div>
            <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}
              className="w-[280px] h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
              <option value="">Select page...</option>
              {facebookPages.map((pg) => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-card p-5">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-text-secondary">Generating creative strategy based on your personas...</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-border rounded-card p-5 space-y-3">
                <div className="h-5 w-2/3 bg-surface-secondary rounded-[6px] animate-pulse" />
                <div className="h-4 w-1/2 bg-surface-secondary rounded-[6px] animate-pulse" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-surface-secondary rounded-[6px] animate-pulse" />
                  <div className="h-3 w-5/6 bg-surface-secondary rounded-[6px] animate-pulse" />
                  <div className="h-3 w-4/5 bg-surface-secondary rounded-[6px] animate-pulse" />
                  <div className="h-3 w-3/4 bg-surface-secondary rounded-[6px] animate-pulse" />
                </div>
                <div className="h-8 w-full bg-surface-secondary rounded-[6px] animate-pulse mt-3" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {angleData.map((angle, i) => {
            const creative = cardCreatives[angle.id];
            return (
              <motion.div
                key={angle.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="bg-white border border-border rounded-card p-5 flex flex-col"
              >
                {/* Persona header (angle name moves below as the highlight) */}
                <div className="mb-3">
                  <h4 className="text-[13px] font-semibold text-text-primary">{angle.personaName}</h4>
                </div>

                {/* Angle Details */}
                <div className="space-y-2 mb-3 flex-1">
                  <div>
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">Pain Point</span>
                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 mt-0.5">{angle.painPoint}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">USP</span>
                    <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2 mt-0.5">{angle.usp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">Hook</span>
                    <p className="text-[11px] text-text-primary font-medium leading-relaxed mt-0.5">{angle.hook}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">CTA</span>
                    <p className="text-[11px] text-accent font-medium mt-0.5">{angle.cta}</p>
                  </div>
                </div>

                {/* Angle highlight — the direction the creative will take */}
                <div className="mb-3 rounded-[8px] bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200/70 px-3 py-2">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.5px] bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-0.5">
                    Angle
                  </div>
                  <div className="text-[12px] font-semibold text-text-primary leading-tight">
                    {angle.angleName}
                  </div>
                </div>

                {/* Creative Section */}
                <div className="border-t border-border-subtle pt-3 mt-auto">
                  {creative ? (
                    /* Meta Ad Mini Preview */
                    <div className="relative border border-border rounded-[6px] overflow-hidden group">
                      {/* Remove creative button */}
                      <button
                        onClick={() => setCardCreatives((prev) => { const next = { ...prev }; delete next[angle.id]; return next; })}
                        className="absolute top-1.5 right-1.5 z-10 p-0.5 bg-white rounded-full shadow-sm text-text-tertiary hover:text-status-error opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove creative"
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white">
                        <div className="w-5 h-5 rounded-full bg-surface-secondary flex items-center justify-center">
                          <span className="text-[7px] font-bold text-text-tertiary">GP</span>
                        </div>
                        <div>
                          <div className="text-[9px] font-semibold text-text-primary">Godrej Properties</div>
                          <div className="text-[8px] text-text-tertiary">Sponsored</div>
                        </div>
                      </div>
                      {creative.postText && (
                        <div className="px-2 py-1">
                          <p className="text-[9px] text-text-primary leading-snug line-clamp-2">{creative.postText}</p>
                        </div>
                      )}
                      <div className="aspect-[4/3] bg-surface-secondary flex items-center justify-center">
                        <ImageIcon size={20} strokeWidth={1} className="text-text-tertiary" />
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 border-t border-border-subtle bg-surface-page">
                        <span className="text-[8px] text-text-tertiary">godrejproperties.com</span>
                        <span className="text-[8px] font-medium text-accent">Learn More</span>
                      </div>
                      {creative.sizes && creative.sizes.length > 0 && (
                        <div className="px-2 py-1 bg-surface-page border-t border-border-subtle">
                          <span className="text-[8px] text-text-tertiary">{creative.sizes.length} size{creative.sizes.length > 1 ? "s" : ""} generated</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Generate / Upload buttons */
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGeneratorModalAngle(angle.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium text-accent border border-accent/30 rounded-button hover:bg-accent/5 transition-colors duration-150"
                      >
                        <Wand2 size={12} strokeWidth={1.5} />
                        Generate
                      </button>
                      <button
                        onClick={() => setUploadModalAngle(angle.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium text-text-secondary border border-border rounded-button hover:bg-surface-page transition-colors duration-150"
                      >
                        <Upload size={12} strokeWidth={1.5} />
                        Upload
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Generator Modal */}
      {activeGeneratorAngle && (
        <CreativeGeneratorModal
          open={!!generatorModalAngle}
          onClose={() => setGeneratorModalAngle(null)}
          onComplete={(creatives: GeneratedCreative[]) => {
            setCardCreatives((prev) => ({
              ...prev,
              [activeGeneratorAngle.id]: {
                type: "generated",
                postText: creatives[0]?.postText || activeGeneratorAngle.hook,
                sizes: creatives.map((c) => c.size),
              },
            }));
            setGeneratorModalAngle(null);
            setToast(
              `${creatives.length} creative${creatives.length !== 1 ? "s" : ""} added to ${activeGeneratorAngle.angleName}`
            );
          }}
          angleName={activeGeneratorAngle.angleName}
          personaName={activeGeneratorAngle.personaName}
          personaRole={strategyData.personas.find((p) => p.id === activeGeneratorAngle.personaId)?.role}
          personaBullets={strategyData.personas.find((p) => p.id === activeGeneratorAngle.personaId)?.bullets}
          painPoint={activeGeneratorAngle.painPoint}
          usp={activeGeneratorAngle.usp}
          hook={activeGeneratorAngle.hook}
          cta={activeGeneratorAngle.cta}
        />
      )}

      {/* Upload Modal */}
      {activeUploadAngle && (
        <UploadCreativeModal
          open={!!uploadModalAngle}
          onClose={() => setUploadModalAngle(null)}
          onComplete={(creative) => {
            setCardCreatives((prev) => ({
              ...prev,
              [activeUploadAngle.id]: {
                type: "uploaded",
                postText: creative.postText,
                imageFile: creative.imageFile,
              },
            }));
            setUploadModalAngle(null);
          }}
          angleName={activeUploadAngle.angleName}
          personaName={activeUploadAngle.personaName}
        />
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
          <ArrowLeft size={15} strokeWidth={1.5} /> Back
        </button>
        <button onClick={onNext} disabled={!hasAnyCreative}
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          Continue to Forms <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-text-primary text-white text-[13px] font-medium px-4 py-2.5 rounded-[8px] shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
