"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  FileInput,
  Users,
  Image,
  FileText,
  Sparkles,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Step1CampaignInput } from "@/components/wizard/step1-input";
import { Step2BusinessProfile } from "@/components/wizard/step2-profile";
import { Step3Creatives } from "@/components/wizard/step3-creatives";
import { Step4Forms } from "@/components/wizard/step4-forms";
import { Step5Structure } from "@/components/wizard/step5-structure";
import { CampaignResult } from "@/components/wizard/campaign-result";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const steps = [
  { key: "input", label: "Campaign Input", icon: FileInput },
  { key: "personas", label: "Personas", icon: Users },
  { key: "creatives", label: "Creatives", icon: Image },
  { key: "forms", label: "Forms", icon: FileText },
  { key: "structure", label: "Structure", icon: Sparkles },
] as const;

// Result is a STATE, not a step — rendered after structure completes.
const RESULT_INDEX = steps.length;

export default function CreateCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const askSpot = useSpotStore((s) => s.askSpot);
  const openGuided = useSpotStore((s) => s.openGuided);

  // Debug helper — ?start=N jumps to that step index (N = RESULT_INDEX previews the result state)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const start = parseInt(p.get("start") || "", 10);
    if (!isNaN(start) && start >= 0 && start <= RESULT_INDEX) {
      setCurrentStep(start);
    }
  }, []);

  const isResult = currentStep === RESULT_INDEX;
  const goNext = () => setCurrentStep((s) => Math.min(s + 1, RESULT_INDEX));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/campaigns")}
            className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
          <span className="text-meta text-text-secondary">
            Lead Generation › Campaigns › Create
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            askSpot("Help me set up this campaign — what should I optimize for?")
          }
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white hover:border-border-hover hover:bg-surface-page text-[11.5px]"
        >
          <SpotMark size={11} /> Ask Spot
        </button>
      </div>

      {/* Spot ambient strip — only on step 0 */}
      {currentStep === 0 && (
        <div className="spot-reply mb-6 p-3.5 flex items-start gap-3">
          <SpotMark size={18} />
          <div className="flex-1">
            <div className="uplabel mb-0.5">Spot</div>
            <div className="text-[13px] leading-[1.5]">
              You can walk the wizard yourself, or skip ahead and let me draft a starting
              campaign — type, name, objective, and budget. You'll confirm every step.
            </div>
          </div>
          <button
            type="button"
            onClick={() => openGuided({ kind: "new-campaign" })}
            className="apply-btn flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)" }}
          >
            <Sparkles size={11} /> Let Spot draft this
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex items-center justify-center mb-10">
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isComplete = i < currentStep;
            const isCurrent = i === currentStep;

            return (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => i <= currentStep && setCurrentStep(i)}
                  disabled={i > currentStep}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isComplete
                        ? "bg-status-success text-white"
                        : isCurrent
                        ? "bg-accent text-white ring-4 ring-accent/10"
                        : "bg-surface-secondary text-text-tertiary"
                    } ${i <= currentStep ? "cursor-pointer" : "cursor-not-allowed"}`}
                  >
                    {isComplete ? (
                      <Check size={14} strokeWidth={2.5} />
                    ) : (
                      <Icon size={14} strokeWidth={1.5} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium transition-colors duration-150 whitespace-nowrap ${
                      isCurrent
                        ? "text-text-primary"
                        : isComplete
                        ? "text-text-secondary"
                        : "text-text-tertiary"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {i < steps.length - 1 && (
                  <div
                    className={`w-10 h-[2px] mx-1 mt-[-18px] transition-colors duration-200 ${
                      i < currentStep ? "bg-status-success" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-[860px] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {currentStep === 0 && <Step1CampaignInput onNext={goNext} />}
            {currentStep === 1 && <Step2BusinessProfile onNext={goNext} onBack={goBack} />}
            {currentStep === 2 && <Step3Creatives onNext={goNext} onBack={goBack} />}
            {currentStep === 3 && <Step4Forms onNext={goNext} onBack={goBack} />}
            {currentStep === 4 && <Step5Structure onNext={goNext} onBack={goBack} />}
            {currentStep === 5 && <CampaignResult onRetry={() => setCurrentStep(4)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
