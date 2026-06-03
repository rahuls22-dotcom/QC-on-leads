"use client";

import React, { useMemo, useState } from "react";
import {
  CircleCheck,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adSetsData, campaignDetail } from "@/lib/campaign-data";
import type { AdSetRow } from "@/lib/campaign-data";
import { campaignDiagnosisPayload } from "@/lib/diagnosis-data";
import { CreativeGeneratorModal } from "@/components/shared/creative-generator-modal";

import { GoalTracker } from "./diagnosis/goal-tracker";
import { BudgetAllocation } from "./diagnosis/budget-allocation";
import { DiagnosisBullets } from "./diagnosis/diagnosis-bullets";
import { MoreActions } from "./diagnosis/more-actions";
import { CreativeSignals } from "./diagnosis/creative-signals";
import { AdSetInsights } from "./diagnosis/ad-set-insights";
import { PersonaScorecard } from "./diagnosis/persona-scorecard";
import type { RenderableAction } from "./actions/use-action-flow";
import { fromSecondary, fromNBA } from "./actions/use-action-flow";

function formatCurrency(amount: number) {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function DiagnosisBadge({ diagnosis }: { diagnosis: AdSetRow["diagnosis"] }) {
  const cfg = {
    "on-track": { icon: CircleCheck, label: "On Track", cls: "text-status-success bg-[#F0FDF4]" },
    "needs-attention": { icon: AlertTriangle, label: "Attention", cls: "text-[#92400E] bg-[#FEF3C7]" },
    "pause-candidate": { icon: XCircle, label: "Pause", cls: "text-status-error bg-[#FEF2F2]" },
  };
  const { icon: Icon, label, cls } = cfg[diagnosis];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      <Icon size={11} strokeWidth={2} /> {label}
    </span>
  );
}

// ── Personas defined during campaign setup ────────────────────────
export interface CampaignPersona {
  id: string;
  name: string;
  age: number;
  role: string;
}

export const campaignPersonas: CampaignPersona[] = [
  { id: "p-rajesh", name: "Rajesh", age: 38, role: "Tech executive" },
  { id: "p-sneha", name: "Sneha", age: 34, role: "Senior lawyer" },
  { id: "p-vikram", name: "Vikram", age: 42, role: "IT director" },
  { id: "p-amit", name: "Amit", age: 45, role: "Business owner" },
];

// ── Creative metrics per ad set ──────────────────────────────────
// Same persona-ad can run in multiple adsets with placement-specific metrics.
// Used by both the AdSet Breakdown drill-in and the Persona Scorecard rollup.
export interface CreativeMetric {
  id: string;
  name: string;
  /** Foreign key to CampaignPersona — links the ad to its persona. */
  personaId: string;
  format: string;
  /** Click-through rate, %. */
  ctr: number;
  status: "active" | "paused";
  /** Average frequency over the last 7 days. */
  frequency: number;
  /** Percent change in CTR over the last 7 days. */
  ctrDelta7d: number;
  spend: number;
  leads: number;
  /** Video-only — % of impressions where the first frame fully renders. 0–1. */
  firstFrameRetention?: number;
  /** Video-only — % retained at 3 seconds. 0–1. */
  hookRate?: number;
  /** Video-only — % retained between 3s and 75% completion. 0–1. */
  holdRate?: number;
  /** Video-only — % completing 95% of the video. 0–1. */
  playRate95?: number;
  /** Video-only — 7d delta on hookRate, in percentage points. */
  hookRateDelta7d?: number;
  /** Video-only — 7d delta on holdRate, in percentage points. */
  holdRateDelta7d?: number;
}

const adSetCreatives: Record<string, CreativeMetric[]> = {
  // Whitefield HNI 30-45 — HNI-fit personas only (Rajesh, Sneha).
  "adset-1": [
    { id: "cr-rajesh-1", name: "Ad — Rajesh", personaId: "p-rajesh", format: "Video", ctr: 3.4, status: "active", frequency: 1.6, ctrDelta7d: 5, spend: 28000, leads: 22,
      firstFrameRetention: 0.92, hookRate: 0.34, holdRate: 0.61, playRate95: 0.22, hookRateDelta7d: 2, holdRateDelta7d: -1 },
    { id: "cr-sneha-1", name: "Ad — Sneha", personaId: "p-sneha", format: "Carousel", ctr: 2.8, status: "active", frequency: 3.18, ctrDelta7d: -14, spend: 35000, leads: 28 },
  ],
  // Sarjapur IT Corridor — IT-skewed personas (Sneha, Vikram).
  "adset-2": [
    { id: "cr-sneha-2", name: "Ad — Sneha", personaId: "p-sneha", format: "Carousel", ctr: 2.1, status: "active", frequency: 1.9, ctrDelta7d: -3, spend: 22000, leads: 18 },
    { id: "cr-vikram-1", name: "Ad — Vikram", personaId: "p-vikram", format: "Video", ctr: 1.9, status: "active", frequency: 1.9, ctrDelta7d: -3, spend: 22000, leads: 14,
      firstFrameRetention: 0.81, hookRate: 0.20, holdRate: 0.55, playRate95: 0.18, hookRateDelta7d: -3, holdRateDelta7d: 1 },
  ],
  // Broad Bangalore 25-55 — broad reach, all 4 personas running.
  "adset-3": [
    { id: "cr-rajesh-3", name: "Ad — Rajesh", personaId: "p-rajesh", format: "Video", ctr: 1.4, status: "active", frequency: 2.1, ctrDelta7d: -8, spend: 18000, leads: 5,
      firstFrameRetention: 0.85, hookRate: 0.21, holdRate: 0.42, playRate95: 0.11, hookRateDelta7d: -7, holdRateDelta7d: -5 },
    { id: "cr-sneha-3", name: "Ad — Sneha", personaId: "p-sneha", format: "Carousel", ctr: 0.9, status: "active", frequency: 2.5, ctrDelta7d: -18, spend: 16000, leads: 0 },
    { id: "cr-vikram-3", name: "Ad — Vikram", personaId: "p-vikram", format: "Video", ctr: 1.2, status: "active", frequency: 2.8, ctrDelta7d: -22, spend: 17000, leads: 3,
      firstFrameRetention: 0.77, hookRate: 0.18, holdRate: 0.45, playRate95: 0.12, hookRateDelta7d: -6, holdRateDelta7d: -8 },
    { id: "cr-amit-3", name: "Ad — Amit", personaId: "p-amit", format: "Video", ctr: 0.7, status: "active", frequency: 1.4, ctrDelta7d: -30, spend: 12000, leads: 1,
      firstFrameRetention: 0.72, hookRate: 0.18, holdRate: 0.38, playRate95: 0.08, hookRateDelta7d: -10, holdRateDelta7d: -8 },
  ],
};

interface DiagnosisTabProps {
  onOpenAction?: (action: RenderableAction) => void;
}

export function DiagnosisTab({ onOpenAction }: DiagnosisTabProps = {}) {
  const [expandedAdSet, setExpandedAdSet] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorAdSet, setGeneratorAdSet] = useState<string | null>(null);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);

  const payload = campaignDiagnosisPayload;

  // Map of action_id → headline for diagnosis bullets that drive an action.
  const actionHeadlines = useMemo(() => {
    const map: Record<string, string> = {
      [payload.next_best_action.id]: payload.next_best_action.headline,
    };
    for (const a of payload.more_actions) map[a.id] = a.headline;
    return map;
  }, [payload]);

  // Map of action_id → renderable action — used to launch the action flow.
  const actionsById = useMemo(() => {
    const map: Record<string, RenderableAction> = {
      [payload.next_best_action.id]: fromNBA(payload.next_best_action),
    };
    for (const a of payload.more_actions) map[a.id] = fromSecondary(a);
    return map;
  }, [payload]);

  const toggleAdSet = (id: string) => setExpandedAdSet((prev) => (prev === id ? null : id));
  const openGenerator = (adSetId: string) => {
    setGeneratorAdSet(adSetId);
    setGeneratorOpen(true);
  };
  const adSetName = adSetsData.find((a) => a.id === generatorAdSet)?.name || "Ad Set";

  return (
    <div className="space-y-5">
      {/* Goal tracker */}
      <GoalTracker data={payload.goal_tracker} primaryGoal={campaignDetail.primaryGoal} />

      {/* Budget allocation + top move */}
      <BudgetAllocation data={payload.budget_allocation} />

      {/* Diagnosis bullets — TOF/MOF/BOF chips with action linkage */}
      <DiagnosisBullets
        bullets={payload.diagnosis}
        actionHeadlines={actionHeadlines}
        actionsById={actionsById}
        highlightActionId={hoveredActionId ?? payload.next_best_action.id}
        onSelectAction={(id) => setHoveredActionId(id)}
        onOpenAction={onOpenAction}
      />

      {/* Ad set insights — adset-level rollup of creative signals & qualifier rates */}
      <AdSetInsights adsets={adSetsData} creatives={adSetCreatives} />

      {/* Persona scorecard — each persona-ad rolled up across the adsets it runs in */}
      <PersonaScorecard
        personas={campaignPersonas}
        adsets={adSetsData}
        creatives={adSetCreatives}
        onOpenAction={onOpenAction}
      />

      {/* More actions */}
      <MoreActions
        actions={payload.more_actions}
        onOpenAction={onOpenAction}
        onDismiss={() => {
          /* mock: dismiss locally — not wired */
        }}
        onHover={setHoveredActionId}
      />

      {/* Tactical Ad Set Breakdown (kept for drill-in) */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h3 className="text-section-header text-text-primary">Ad set breakdown</h3>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            Click an ad set to view and manage its creatives
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="w-6 px-2"></th>
                {[
                  { label: "Ad Set", align: "left" },
                  { label: "Spend", align: "right" },
                  { label: "Leads", align: "right" },
                  { label: "QLs", align: "right" },
                  { label: "CPL", align: "right" },
                  { label: "CPQL", align: "right" },
                  { label: "CTR", align: "right" },
                  { label: "CVR", align: "right" },
                  { label: "Freq", align: "right" },
                  { label: "Diagnosis", align: "center" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`px-3 py-2.5 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-${h.align} whitespace-nowrap`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adSetsData.map((adset, i) => {
                const isExpanded = expandedAdSet === adset.id;
                const creatives = adSetCreatives[adset.id] || [];
                return (
                  <React.Fragment key={adset.id}>
                    <tr
                      onClick={() => toggleAdSet(adset.id)}
                      className={`border-b border-border-subtle cursor-pointer transition-colors hover:bg-surface-page/60 ${
                        i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                      } ${isExpanded ? "bg-accent/5" : ""}`}
                    >
                      <td className="px-2 py-2.5 text-text-tertiary">
                        {isExpanded ? (
                          <ChevronDown size={14} strokeWidth={1.5} />
                        ) : (
                          <ChevronRight size={14} strokeWidth={1.5} />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary font-medium whitespace-nowrap max-w-[180px] truncate">
                        {adset.name}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        {formatCurrency(adset.spend)}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        {adset.leads}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        {adset.qualifiedLeads}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        ₹{adset.cpl.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        {adset.cpql > 0 ? `₹${adset.cpql.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        {adset.ctr}%
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                        {adset.ctlPercent}%
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-primary text-right tabular-nums">2.4</td>
                      <td className="px-3 py-2.5 text-center">
                        <DiagnosisBadge diagnosis={adset.diagnosis} />
                      </td>
                    </tr>

                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-surface-page px-6 py-4 border-b border-border-subtle">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <ImageIcon size={14} strokeWidth={1.5} className="text-text-tertiary" />
                                    <span className="text-[12px] font-semibold text-text-primary">
                                      Creatives in {adset.name}
                                    </span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                                      {creatives.length}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openGenerator(adset.id);
                                    }}
                                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-accent border border-accent/30 rounded-button hover:bg-accent/5 transition-colors"
                                  >
                                    <Plus size={11} strokeWidth={2} /> Add Creative
                                  </button>
                                </div>

                                <CreativeSignals
                                  creatives={creatives}
                                  actions={payload.more_actions}
                                  onSelectAction={setHoveredActionId}
                                  onOpenAction={onOpenAction}
                                  actionsById={actionsById}
                                />

                                {creatives.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-3">
                                    {creatives.map((cr) => (
                                      <div key={cr.id} className="bg-white border border-border rounded-[8px] p-3">
                                        <div className="aspect-[4/3] bg-surface-secondary rounded-[6px] flex items-center justify-center mb-2">
                                          <ImageIcon size={20} strokeWidth={1} className="text-text-tertiary" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div className="min-w-0">
                                            <div className="text-[11px] font-medium text-text-primary truncate">
                                              {cr.name}
                                            </div>
                                            <div className="text-[10px] text-text-tertiary mt-0.5">
                                              {cr.format} · CTR {cr.ctr}%
                                            </div>
                                          </div>
                                          <span
                                            className={`text-[9px] font-medium px-1.5 py-0.5 rounded-badge shrink-0 ml-2 ${
                                              cr.status === "active"
                                                ? "bg-[#F0FDF4] text-[#15803D]"
                                                : "bg-[#FEF3C7] text-[#92400E]"
                                            }`}
                                          >
                                            {cr.status === "active" ? "Active" : "Paused"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-[12px] text-text-tertiary">
                                    No creatives in this ad set yet
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreativeGeneratorModal
        open={generatorOpen}
        onClose={() => {
          setGeneratorOpen(false);
          setGeneratorAdSet(null);
        }}
        onComplete={() => {
          setGeneratorOpen(false);
          setGeneratorAdSet(null);
        }}
        angleName={adSetName}
        personaName={adSetName}
        hook="Premium living in Whitefield"
        cta="Book a site visit"
      />
    </div>
  );
}
