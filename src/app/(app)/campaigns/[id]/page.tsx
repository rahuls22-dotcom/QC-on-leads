"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Check,
  Bot,
  AlertTriangle,
  Pause,
  Play,
  X,
} from "lucide-react";
import { campaignDetail, campaignsList, leadDistributionData } from "@/lib/campaign-data";
import { workspaceIdForLegacyProject } from "@/lib/project-data";
import { ForbiddenState, useScopeGuard } from "@/components/project/shared/scope-guard";
import { campaignDiagnosisPayload } from "@/lib/diagnosis-data";
import { LeadsTab } from "@/components/campaigns/leads-tab";
import { AnalysisTab } from "@/components/campaigns/analysis-tab";
import { SettingsTab } from "@/components/campaigns/settings-tab";
import { DiagnosisTab } from "@/components/campaigns/diagnosis-tab";
import { LeadInsights } from "@/components/campaigns/lead-insights";
import { CampaignBriefTab } from "@/components/campaigns/campaign-brief-tab";
import { StatusStrip } from "@/components/campaigns/diagnosis/status-strip";
import { NextBestAction } from "@/components/campaigns/diagnosis/next-best-action";
import { ActionFlowModal } from "@/components/campaigns/actions/action-flow-modal";
import { useActionFlow, fromNBA, type RenderableAction } from "@/components/campaigns/actions/use-action-flow";
import { getActionLabel } from "@/components/campaigns/actions/action-labels";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

type Tab = "analysis" | "leads" | "insights" | "diagnosis" | "brief" | "settings";

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const urlId = (params?.id || "").toString();

  // Scope guard: derive the workspace from the URL campaign id by
  // walking campaignsList → projectId → workspace. If the URL id isn't
  // in our list (legacy detail singleton case), the guard skips.
  // ALL hooks must run unconditionally, so the guard hook runs here and
  // its conditional branch is deferred until after every other hook.
  const urlCampaign = campaignsList.find((c) => c.id === urlId);
  const resourceWorkspaceId = workspaceIdForLegacyProject(urlCampaign?.projectId);
  const guard = useScopeGuard(
    resourceWorkspaceId,
    urlCampaign?.name || campaignDetail.name,
  );

  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [campaignStatus, setCampaignStatus] = useState<"enabled" | "paused">(
    campaignDetail.status === "paused" ? "paused" : "enabled"
  );
  const [statusConfirm, setStatusConfirm] = useState<"pause" | "enable" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [nbaSnoozed, setNbaSnoozed] = useState(false);
  const [agentNudgeDismissed, setAgentNudgeDismissed] = useState(false);
  const actionFlow = useActionFlow();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Now safe to short-circuit on guard verdict — every hook above has run.
  if (guard.access === "forbidden") {
    return (
      <ForbiddenState
        workspaceName={guard.workspaceName}
        resourceLabel={guard.resourceLabel}
        backHref="/campaigns"
      />
    );
  }
  if (guard.access === "wrong-scope") return null;

  const handleStatusConfirm = () => {
    if (!statusConfirm) return;
    if (statusConfirm === "pause") {
      setCampaignStatus("paused");
      setToast("Campaign paused");
    } else {
      setCampaignStatus("enabled");
      setToast("Campaign enabled");
    }
    setStatusConfirm(null);
  };

  const campaign = campaignDetail;
  const isEnabled = campaignStatus === "enabled";
  const diagnosis = campaignDiagnosisPayload;

  const handleApplyNba = () => {
    actionFlow.open(fromNBA(diagnosis.next_best_action));
  };

  const handleApplyAction = (action: RenderableAction, params?: Record<string, unknown>) => {
    const label = getActionLabel(action.verb, action.target_entity, campaign.budgetMode);
    if (params && typeof params === "object" && "newBudget" in params) {
      const newBudget = params.newBudget as number;
      setToast(`${label} · new daily budget ₹${newBudget.toLocaleString("en-IN")}`);
    } else {
      setToast(`${label} · applied`);
    }
    actionFlow.close();
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "analysis", label: "Analysis" },
    { key: "diagnosis", label: "Diagnosis" },
    { key: "insights", label: "Insights" },
    { key: "leads", label: "Leads", count: 186 },
    { key: "brief", label: "Campaign setup" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.push("/campaigns")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Lead Generation › Campaigns › {campaign.name}</span>
      </div>

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-page-title text-text-primary">{campaign.name}</h1>
            <span
              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${
                isEnabled
                  ? "bg-[#F0FDF4] text-[#15803D]"
                  : "bg-surface-secondary text-text-secondary"
              }`}
            >
              {isEnabled ? "Enabled" : "Paused"}
            </span>
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
              {campaign.platform}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
              <Calendar size={10} strokeWidth={1.5} /> Day {diagnosis.status_strip.days_live} of {diagnosis.status_strip.days_total}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-text-secondary">
            <span>Project: <Link href="/projects/proj-2" className="text-text-primary font-medium hover:underline">{campaign.client}</Link></span>
            <span className="text-border">|</span>
            <span>Owner: <span className="text-text-primary font-medium">{campaign.owner}</span></span>
            <span className="text-border">|</span>
            <span>Budget: <span className="text-text-primary font-medium">₹{campaign.dailyBudget.toLocaleString("en-IN")}/day</span></span>
          </div>
        </div>

        {/* Top-right CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          {!campaign.agentConnected && agentNudgeDismissed && (
            <button
              type="button"
              onClick={() => router.push("/agents")}
              title="Qualification metrics need an agent — connect one to enable CPQL and Qualified Leads."
              className="inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-medium text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-button hover:bg-[#FDE68A] transition-colors"
            >
              <Bot size={13} strokeWidth={1.5} /> Connect agent
            </button>
          )}
          <button
            type="button"
            onClick={() => setStatusConfirm(isEnabled ? "pause" : "enable")}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium rounded-button border transition-colors duration-150 ${
              isEnabled
                ? "text-text-secondary border-border bg-white hover:bg-surface-page hover:text-text-primary"
                : "text-white bg-[#15803D] border-[#15803D] hover:bg-[#166534]"
            }`}
          >
            {isEnabled ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
            {isEnabled ? "Pause Campaign" : "Enable Campaign"}
          </button>
        </div>
      </div>

      {/* No Agent Connected — slim, dismissable */}
      {!campaign.agentConnected && !agentNudgeDismissed && (
        <div className="mb-3 flex items-center gap-2.5 bg-[#FEF3C7] border border-[#FDE68A] rounded-card pl-3 pr-2 py-2">
          <AlertTriangle size={13} strokeWidth={1.75} className="text-[#92400E] shrink-0" />
          <p className="text-[12px] text-[#92400E] flex-1 min-w-0 truncate">
            <span className="font-semibold">No agent connected.</span>{" "}
            <span className="text-[#92400E]/85">Qualified Leads, CPQL & Qualification Rate stay blank until one is linked.</span>
          </p>
          <button
            onClick={() => router.push("/agents")}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium bg-[#92400E] text-white rounded-button hover:bg-[#78350F] transition-colors shrink-0"
          >
            <Bot size={11} strokeWidth={1.75} /> Connect agent
          </button>
          <button
            type="button"
            onClick={() => setAgentNudgeDismissed(true)}
            aria-label="Dismiss"
            className="p-1 rounded-button text-[#92400E]/70 hover:text-[#92400E] hover:bg-[#FDE68A]/60 transition-colors shrink-0"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Status strip — compact verdict + headline + primary metric */}
      <div className="mb-3">
        <StatusStrip
          data={diagnosis.status_strip}
          onOpenDiagnosis={() => setActiveTab("diagnosis")}
        />
      </div>

      {/* Next Best Action — prescriptive card */}
      {!nbaSnoozed && (
        <div className="mb-5">
          <NextBestAction
            action={diagnosis.next_best_action}
            onApply={handleApplyNba}
            onSnooze={() => setNbaSnoozed(true)}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
              activeTab === tab.key ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}>
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-[11px] text-text-tertiary font-normal tabular-nums">({tab.count})</span>
              )}
            </span>
            {activeTab === tab.key && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" transition={{ duration: 0.15 }} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "analysis" && <AnalysisTab agentConnected={campaign.agentConnected} />}
        {activeTab === "leads" && <LeadsTab />}
        {activeTab === "insights" && (
          <LeadInsights
            distributions={leadDistributionData}
          />
        )}
        {activeTab === "diagnosis" && <DiagnosisTab onOpenAction={actionFlow.open} />}
        {activeTab === "brief" && <CampaignBriefTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* Pause/Enable confirmation */}
      {statusConfirm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setStatusConfirm(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-card border border-border shadow-xl w-full max-w-[420px] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                    statusConfirm === "pause" ? "bg-surface-secondary" : "bg-[#F0FDF4]"
                  }`}
                >
                  {statusConfirm === "pause" ? (
                    <Pause size={16} strokeWidth={1.5} className="text-text-secondary" />
                  ) : (
                    <Play size={16} strokeWidth={1.5} className="text-[#15803D]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-text-primary">
                    {statusConfirm === "pause" ? "Pause campaign?" : "Enable campaign?"}
                  </h3>
                  <p className="text-[12px] text-text-secondary leading-relaxed mt-1">
                    {statusConfirm === "pause" ? (
                      <>
                        <span className="font-medium text-text-primary">{campaign.name}</span> will stop serving ads on Meta. Budget will stop spending. You can enable it again anytime.
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-text-primary">{campaign.name}</span> will resume on Meta. Ads will start serving and budget will begin spending within minutes.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusConfirm(null)}
                  className="h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusConfirm}
                  className={`inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium rounded-button transition-colors ${
                    statusConfirm === "pause"
                      ? "bg-text-primary text-white hover:bg-black"
                      : "bg-[#15803D] text-white hover:bg-[#166534]"
                  }`}
                >
                  {statusConfirm === "pause" ? (
                    <Pause size={13} strokeWidth={2} />
                  ) : (
                    <Play size={13} strokeWidth={2} />
                  )}
                  {statusConfirm === "pause" ? "Pause campaign" : "Enable campaign"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action flow modal — central modal that opens for verb-specific actions */}
      <ActionFlowModal
        action={actionFlow.active}
        budgetMode={campaign.budgetMode}
        campaignDailyBudget={campaign.dailyBudget}
        onClose={actionFlow.close}
        onApply={handleApplyAction}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] pointer-events-none">
          <div className="inline-flex items-center gap-2 bg-text-primary text-white text-[13px] font-medium px-4 py-2.5 rounded-[8px] shadow-lg">
            <Check size={14} strokeWidth={2} className="text-[#4ADE80]" />
            {toast}
          </div>
        </div>
      )}
    </motion.div>
  );
}
