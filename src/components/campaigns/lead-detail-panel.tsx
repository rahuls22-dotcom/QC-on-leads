"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Copy,
  Play,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  ExternalLink,
  UserPlus,
  Clock,
  PhoneOff,
  PhoneIncoming,
} from "lucide-react";
import { format } from "date-fns";
import type {
  EnquiryLead,
  CallRecord,
} from "@/lib/enquiries-data";
import {
  leadStageLabels,
  leadStageColors,
} from "@/lib/enquiries-data";

// ── Types ───────────────────────────────────────────────────
type TabKey = "overview" | "profile" | "activity";

interface LeadDetailPanelProps {
  lead: EnquiryLead | Record<string, any>;
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .replace(/\*/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "bg-[#3B82F6]",
  "bg-[#8B5CF6]",
  "bg-[#EC4899]",
  "bg-[#F59E0B]",
  "bg-[#10B981]",
  "bg-[#6366F1]",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const qualificationBadge = (q: string) => {
  if (q === "qualified") return { label: "Qualified", cls: "bg-[#F0FDF4] text-[#15803D]" };
  if (q === "not_qualified") return { label: "Disqualified", cls: "bg-[#FEF2F2] text-[#DC2626]" };
  return { label: "Pending", cls: "bg-[#FEF3C7] text-[#92400E]" };
};

const temperatureBadge = (t: string) => {
  if (t === "hot") return { label: "Hot", cls: "bg-[#FEF2F2] text-[#DC2626]" };
  if (t === "warm") return { label: "Warm", cls: "bg-[#F0FDF4] text-[#15803D]" };
  if (t === "lukewarm") return { label: "Lukewarm", cls: "bg-[#FEF3C7] text-[#92400E]" };
  return { label: "Cold", cls: "bg-surface-secondary text-text-secondary" };
};

const segmentTagColor = (tag: string) => {
  if (tag === "HNI") return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
  if (tag === "First-time Buyer") return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
  if (tag === "Site Visit Done") return "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]";
  if (tag === "Decision Maker") return "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]";
  if (tag === "Budget Qualified") return "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
  return "bg-surface-secondary text-text-secondary border-border-subtle";
};

const callStatusBadge = (status: string) => {
  if (status === "completed") return { label: "Call Completed Normally", cls: "bg-[#F0FDF4] text-[#15803D]" };
  if (status === "no_answer") return { label: "Dial No Answer", cls: "bg-[#FEF2F2] text-[#DC2626]" };
  if (status === "busy") return { label: "Line Busy", cls: "bg-[#FEF3C7] text-[#92400E]" };
  return { label: "Voicemail", cls: "bg-[#EFF6FF] text-[#1D4ED8]" };
};

// ── Component ───────────────────────────────────────────────
export function LeadDetailPanel({ lead, onClose }: LeadDetailPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isQualifying, setIsQualifying] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [manuallyQualified, setManuallyQualified] = useState(false);
  const [crmPushed, setCrmPushed] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!mounted) return null;

  // Normalize lead data
  const name: string = lead.name ?? "";
  const phone: string = lead.phone ?? "";
  const email: string = lead.email ?? "";
  const aiQualification: string = lead.aiQualification ?? "pending";
  const temperature: string = lead.temperature ?? "cold";
  const aiSummary: string = lead.aiSummary ?? "";
  const segmentTags: string[] = lead.segmentTags ?? [];
  const calls: CallRecord[] = lead.calls ?? [];
  const sentToCRM: string | null = lead.sentToCRM ?? null;
  const profileIntelligence = lead.profileIntelligence ?? {
    gender: null,
    languages: [],
    location: "",
    locationType: "",
  };

  const isQualified = aiQualification === "qualified" || manuallyQualified;
  const isSentToCRM = !!sentToCRM || crmPushed;

  const handleQualify = () => {
    if (isQualified || isQualifying) return;
    setIsQualifying(true);
    setTimeout(() => {
      setIsQualifying(false);
      setManuallyQualified(true);
    }, 800);
  };

  const handlePushCRM = () => {
    if (isSentToCRM || isPushing) return;
    setIsPushing(true);
    setTimeout(() => {
      setIsPushing(false);
      setCrmPushed(true);
    }, 1500);
  };

  const qBadge = qualificationBadge(isQualified ? "qualified" : aiQualification);
  const tBadge = temperatureBadge(temperature);
  const mostRecentCall = calls.length > 0 ? calls[0] : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "profile", label: "Profile" },
    { key: "activity", label: "Activity" },
  ];

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[640px] bg-white z-[70] shadow-lg border-l border-border flex flex-col">
        {/* ── Header ────────────────────────────────── */}
        <div className="shrink-0 border-b border-border px-6 py-5">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary transition-colors duration-150"
          >
            <X size={16} strokeWidth={1.5} />
          </button>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-[16px] font-semibold shrink-0 ${avatarColor(name)}`}
            >
              {getInitials(name)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-semibold text-text-primary leading-tight">
                  {name}
                </h2>
                <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${qBadge.cls}`}>
                  {qBadge.label}
                </span>
                <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${tBadge.cls}`}>
                  {tBadge.label}
                </span>
              </div>
              <div className="text-[13px] text-text-secondary mt-0.5">{phone}</div>
              {lead.createdAt && (
                <div className="text-[11px] text-text-tertiary mt-1 flex items-center gap-1">
                  <Clock size={10} strokeWidth={1.5} />
                  Lead created {format(new Date(lead.createdAt), "dd MMM yyyy, HH:mm")}
                </div>
              )}
              {aiSummary && (
                <p className="text-[12px] text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                  {aiSummary}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 mt-4">
            {isQualified ? (
              <button
                disabled
                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-medium rounded-button bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] cursor-default"
              >
                <Check size={13} strokeWidth={2} /> Qualified
              </button>
            ) : (
              <button
                onClick={handleQualify}
                disabled={isQualifying}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-medium rounded-button bg-accent text-white hover:bg-accent-hover transition-colors duration-150 disabled:opacity-60"
              >
                {isQualifying ? (
                  <><Loader2 size={13} strokeWidth={2} className="animate-spin" /> Qualifying...</>
                ) : (
                  "Mark as Qualified"
                )}
              </button>
            )}

          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────── */}
        <div className="shrink-0 border-b border-border px-6 flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
                activeTab === tab.key
                  ? "text-accent"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent rounded-t" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <OverviewTab
              segmentTags={segmentTags}
              aiSummary={aiSummary}
              mostRecentCall={mostRecentCall}
              campaign={lead.campaign ?? ""}
              adset={lead.adset ?? ""}
              adName={lead.adName ?? ""}
              calls={calls}
            />
          )}
          {activeTab === "profile" && (
            <ProfileTab
              phone={phone}
              email={email}
              profileIntelligence={profileIntelligence}
              copyText={copyText}
            />
          )}
          {activeTab === "activity" && (
            <ActivityTab
              calls={calls}
              expandedCallId={expandedCallId}
              setExpandedCallId={setExpandedCallId}
              createdAt={lead.createdAt ?? ""}
              lead={lead as EnquiryLead}
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Activity Summary Helper ────────────────────────────────
function buildActivitySummary(calls: CallRecord[]): string {
  if (calls.length === 0) return "No contact attempts yet.";

  const total = calls.length;
  const noAnswer = calls.filter((c) => c.status === "no_answer").length;
  const busy = calls.filter((c) => c.status === "busy").length;
  const completed = calls.filter((c) => c.status === "completed").length;
  const voicemail = calls.filter((c) => c.status === "voicemail").length;

  const parts: string[] = [];
  if (noAnswer > 0) parts.push(`${noAnswer} no answer`);
  if (busy > 0) parts.push(`${busy} busy`);
  if (voicemail > 0) parts.push(`${voicemail} voicemail`);
  if (completed > 0) {
    const lastCompleted = calls.find((c) => c.status === "completed");
    parts.push(`${completed} connected${lastCompleted ? ` (${lastCompleted.duration})` : ""}`);
  }

  const summary = `Called ${total} time${total > 1 ? "s" : ""} — ${parts.join(", ")}.`;

  if (completed > 0) {
    const lastCompleted = calls.find((c) => c.status === "completed");
    if (lastCompleted) {
      const dateStr = format(new Date(lastCompleted.date), "dd MMM");
      return `${summary} Last connected on ${dateStr}.`;
    }
  }

  return summary;
}

// ── Overview Tab ────────────────────────────────────────────
function OverviewTab({
  segmentTags,
  aiSummary,
  mostRecentCall,
  campaign,
  adset,
  adName,
  calls,
}: {
  segmentTags: string[];
  aiSummary: string;
  mostRecentCall: CallRecord | null;
  campaign: string;
  adset: string;
  adName: string;
  calls: CallRecord[];
}) {
  const activitySummary = buildActivitySummary(calls);

  return (
    <div className="space-y-5">
      {/* Activity Summary */}
      <div className="bg-surface-page rounded-[8px] p-4">
        <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
          Activity Summary
        </h3>
        <div className="flex items-start gap-2.5">
          {calls.length === 0 ? (
            <PhoneOff size={14} strokeWidth={1.5} className="text-text-tertiary mt-0.5 shrink-0" />
          ) : (
            <PhoneIncoming size={14} strokeWidth={1.5} className="text-accent mt-0.5 shrink-0" />
          )}
          <p className="text-[13px] text-text-primary leading-relaxed">{activitySummary}</p>
        </div>
      </div>

      {/* Source Attribution */}
      {(campaign || adset || adName) && (
        <div>
          <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">Source</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-[#EFF6FF] text-[#1D4ED8] border border-[#3B82F6]/15">
              <span className="text-[#1D4ED8]/60">Channel:</span> <span className="font-medium">Meta</span>
            </span>
            {campaign && (
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-surface-secondary text-text-secondary border border-border">
                <span className="text-text-tertiary">Campaign:</span> <span className="font-medium text-text-primary">{campaign}</span>
              </span>
            )}
            {adset && (
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-surface-secondary text-text-secondary border border-border">
                <span className="text-text-tertiary">Ad Set:</span> <span className="font-medium text-text-primary">{adset}</span>
              </span>
            )}
            {adName && (
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-badge bg-surface-secondary text-text-secondary border border-border">
                <span className="text-text-tertiary">Ad:</span> <span className="font-medium text-text-primary">{adName}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Segment Tags */}
      {segmentTags.length > 0 && (
        <div>
          <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
            Segment Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {segmentTags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-badge border ${segmentTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lead Summary */}
      {aiSummary && (
        <div className="bg-surface-page rounded-[8px] p-4">
          <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
            Lead Summary
          </h3>
          <p className="text-[13px] text-text-primary leading-relaxed">{aiSummary}</p>
        </div>
      )}

      {/* Most Relevant Call */}
      {mostRecentCall && <CallCard call={mostRecentCall} defaultExpanded />}
    </div>
  );
}

// ── Call Card ────────────────────────────────────────────────
function CallCard({
  call,
  defaultExpanded = false,
}: {
  call: CallRecord;
  defaultExpanded?: boolean;
}) {
  const badge = callStatusBadge(call.status);
  const criteria = call.qualificationCriteria ?? [];

  return (
    <div className="bg-surface-page rounded-[8px] p-4">
      <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">
        {defaultExpanded ? "Most Relevant Call" : "Call Record"}
      </h3>

      {/* Date + Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-text-secondary">
          {format(new Date(call.date), "dd MMM yyyy, HH:mm")}
        </span>
        <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-badge ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Audio Player Mockup */}
      <div className="flex items-center gap-3 bg-white rounded-[6px] border border-border-subtle px-3 py-2 mb-3">
        <button className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 hover:bg-accent-hover transition-colors">
          <Play size={14} strokeWidth={2} className="text-white ml-0.5" />
        </button>
        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full w-0 bg-accent rounded-full" />
        </div>
        <span className="text-[11px] text-text-tertiary whitespace-nowrap">
          0:00 / {call.duration}
        </span>
        <span className="text-[10px] font-medium text-text-secondary bg-surface-secondary px-1.5 py-0.5 rounded">
          1x
        </span>
      </div>

      {/* Qualifying Criteria Chips */}
      {criteria.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {criteria.map((c, i) => (
            <span
              key={c.key}
              className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-badge whitespace-nowrap shrink-0 ${
                i === 0
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-white text-text-secondary border border-border-subtle"
              }`}
            >
              {c.key}
            </span>
          ))}
        </div>
      )}

      {/* Criteria Key-Value Rows */}
      {criteria.length > 0 && (
        <div className="space-y-2">
          {criteria.map((c) => (
            <div key={c.key} className="bg-white rounded-[6px] border border-border-subtle p-3">
              <div className="text-[12px] font-medium text-text-primary mb-1.5">{c.key}</div>
              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-text-tertiary w-[100px] shrink-0">Result</span>
                  <span className="text-[11px] text-text-primary">{c.result}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-text-tertiary w-[100px] shrink-0">Lead Response</span>
                  <span className="text-[11px] text-text-primary">{c.leadResponse}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-text-tertiary w-[100px] shrink-0">Reasoning</span>
                  <span className="text-[11px] text-text-primary">{c.reasoning}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Profile Tab ─────────────────────────────────────────────
function ProfileTab({
  phone,
  email,
  profileIntelligence,
  copyText,
}: {
  phone: string;
  email: string;
  profileIntelligence: {
    gender: string | null;
    languages: string[];
    location: string;
    locationType: string;
  };
  copyText: (text: string) => void;
}) {
  const locationTypeLabels: Record<string, string> = {
    india_metro: "India Metro",
    india_non_metro: "India Non-Metro",
  };

  return (
    <div className="space-y-5">
      {/* Contact Details */}
      <div>
        <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">
          Contact Details
        </h3>
        <div className="bg-surface-page rounded-[8px] divide-y divide-border-subtle">
          {/* Location */}
          {profileIntelligence.location && (
            <div className="flex items-center gap-3 px-4 py-3">
              <MapPin size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
              <span className="text-[13px] text-text-primary">{profileIntelligence.location}</span>
            </div>
          )}

          {/* Phone */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Phone size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
              <span className="text-[13px] text-text-primary">{phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => copyText(phone)}
                className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
                title="Copy phone"
              >
                <Copy size={12} strokeWidth={1.5} />
              </button>
              <a
                href={`https://wa.me/${phone.replace(/\s/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#25D366] hover:underline px-1.5 py-1"
              >
                WhatsApp
                <ExternalLink size={10} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Mail size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />
              <span className="text-[13px] text-text-primary">{email}</span>
            </div>
            <button
              onClick={() => copyText(email)}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-colors"
              title="Copy email"
            >
              <Copy size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Intelligence Section */}
      <div>
        <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">
          Intelligence
        </h3>

        {/* Profile Intelligence */}
        <div className="bg-surface-page rounded-[8px] p-4 mb-3">
          <h4 className="text-[12px] font-medium text-text-primary mb-2.5">
            Profile Intelligence
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-text-tertiary">Gender</div>
              <div className="text-[13px] text-text-primary mt-0.5">
                {profileIntelligence.gender === "M"
                  ? "Male"
                  : profileIntelligence.gender === "F"
                  ? "Female"
                  : "Not Available"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary">Languages</div>
              <div className="text-[13px] text-text-primary mt-0.5">
                {profileIntelligence.languages.length > 0
                  ? profileIntelligence.languages.join(", ")
                  : "Not Available"}
              </div>
            </div>
          </div>
        </div>

        {/* Geographical Intelligence */}
        <div className="bg-surface-page rounded-[8px] p-4">
          <h4 className="text-[12px] font-medium text-text-primary mb-2.5">
            Geographical Intelligence
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-text-tertiary">Location</div>
              <div className="text-[13px] text-text-primary mt-0.5">
                {profileIntelligence.location || "Not Available"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-text-tertiary">Location Type</div>
              <div className="text-[13px] text-text-primary mt-0.5">
                {locationTypeLabels[profileIntelligence.locationType] ||
                  profileIntelligence.locationType ||
                  "Not Available"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Activity Tab ────────────────────────────────────────────
function ActivityTab({
  calls,
  expandedCallId,
  setExpandedCallId,
  createdAt,
  lead,
}: {
  calls: CallRecord[];
  expandedCallId: string | null;
  setExpandedCallId: (id: string | null) => void;
  createdAt: string;
  lead: EnquiryLead;
}) {
  return (
    <div className="space-y-2">
      {calls.map((call) => {
        const badge = callStatusBadge(call.status);
        const isExpanded = expandedCallId === call.id;

        return (
          <div key={call.id} className="bg-surface-page rounded-[8px] overflow-hidden">
            {/* Row Header */}
            <button
              onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-text-secondary">
                  {format(new Date(call.date), "dd MMM yyyy, HH:mm")}
                </span>
                <span className="text-[11px] text-text-tertiary">{call.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-badge ${badge.cls}`}>
                  {badge.label}
                </span>
                {isExpanded ? (
                  <ChevronUp size={14} strokeWidth={1.5} className="text-text-tertiary" />
                ) : (
                  <ChevronDown size={14} strokeWidth={1.5} className="text-text-tertiary" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border-subtle">
                <div className="pt-3">
                  <CallCard call={call} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Lead Created — always at the bottom (chronologically first) */}
      {createdAt && (
        <div className="bg-surface-page rounded-[8px] overflow-hidden">
          <button
            onClick={() => setExpandedCallId(expandedCallId === "__created" ? null : "__created")}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <UserPlus size={12} strokeWidth={1.5} className="text-accent" />
              </div>
              <div className="text-left">
                <span className="text-[12px] text-text-primary font-medium">Lead created</span>
                <span className="text-[11px] text-text-tertiary ml-2">
                  {format(new Date(createdAt), "dd MMM yyyy, HH:mm")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
                Meta Ads
              </span>
              {expandedCallId === "__created" ? (
                <ChevronUp size={14} strokeWidth={1.5} className="text-text-tertiary" />
              ) : (
                <ChevronDown size={14} strokeWidth={1.5} className="text-text-tertiary" />
              )}
            </div>
          </button>

          {expandedCallId === "__created" && (
            <div className="px-4 pb-4 border-t border-border-subtle">
              <div className="pt-3 grid grid-cols-2 gap-3">
                {[
                  { label: "Name", value: lead.name },
                  { label: "Phone", value: lead.phone },
                  { label: "Email", value: lead.email },
                  { label: "Source", value: "Meta Ads" },
                  { label: "Medium", value: "Paid" },
                  { label: "Campaign", value: lead.campaign },
                  { label: "Ad Set", value: lead.adset },
                  { label: "Ad", value: lead.adName },
                ].map((field) => (
                  <div key={field.label}>
                    <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-0.5">
                      {field.label}
                    </span>
                    <span className="block text-[12px] text-text-primary">
                      {field.value || "—"}
                    </span>
                  </div>
                ))}
              </div>
              {lead.formResponses && lead.formResponses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">
                    Form Responses
                  </span>
                  <div className="space-y-1.5">
                    {lead.formResponses.map((fr, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]">
                        <span className="text-text-tertiary shrink-0">{fr.question}</span>
                        <span className="text-text-primary font-medium">{fr.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
