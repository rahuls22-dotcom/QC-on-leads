"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  Pause,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  workflowDetail,
  workflowContacts,
  sequenceLog,
} from "@/lib/workflow-data";
import type { ContactOutcome } from "@/lib/types/common";
import type { SequenceLogEntry } from "@/lib/types/workflow";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

function OutcomeBadge({ outcome }: { outcome: ContactOutcome }) {
  const config: Record<ContactOutcome, { label: string; cls: string }> = {
    qualified: { label: "Qualified", cls: "bg-[#F0FDF4] text-[#15803D]" },
    not_qualified: { label: "Not Qualified", cls: "bg-[#FEF2F2] text-[#DC2626]" },
    callback: { label: "Callback", cls: "bg-[#FEF3C7] text-[#92400E]" },
    no_answer: { label: "No Answer", cls: "bg-surface-secondary text-text-secondary" },
    not_called: { label: "Not Called", cls: "bg-surface-secondary text-text-tertiary" },
    busy: { label: "Busy", cls: "bg-[#FEF3C7] text-[#92400E]" },
    wrong_number: { label: "Wrong #", cls: "bg-[#FEF2F2] text-[#DC2626]" },
  };
  const { label, cls } = config[outcome];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge ${cls}`}>
      {label}
    </span>
  );
}

const PAGE_SIZE = 8;
type TabKey = "contacts" | "sequence_log" | "schedule";

export default function WorkflowDetailPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("contacts");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const d = workflowDetail;
  const stats = d.stats!;
  const schedule = d.default_step?.schedule ?? d.routing?.branches[0]?.schedule;
  const progressPercent = d.progress ?? 0;

  const triggerLabel =
    d.trigger.type === "csv_upload"
      ? "CSV Upload"
      : d.trigger.type === "crm_webhook"
      ? "CRM Webhook"
      : d.trigger.type;

  const agentLabel = d.routing
    ? d.routing.branches.map((b) => b.label).join(", ")
    : "Vox \u2014 Qualification Agent";

  // Contacts filtering + pagination
  const filtered = useMemo(() => {
    if (!search) return workflowContacts;
    const s = search.toLowerCase();
    return workflowContacts.filter(
      (c) => c.name.toLowerCase().includes(s) || c.phone.includes(s)
    );
  }, [search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "contacts", label: "Contacts" },
    { key: "sequence_log", label: "Sequence Log" },
    { key: "schedule", label: "Schedule" },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push("/workflows")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">
          Sequences &rsaquo; {d.name}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-page-title text-text-primary">{d.name}</h1>
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
              Active ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-text-secondary">
            <span>{d.description}</span>
          </div>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium rounded-button border transition-colors duration-150 ${
            isPaused
              ? "bg-accent text-white border-transparent hover:bg-accent-hover"
              : "bg-white text-text-secondary border-border hover:bg-surface-page"
          }`}
        >
          {isPaused ? (
            <>
              <Play size={14} strokeWidth={1.5} />
              Resume
            </>
          ) : (
            <>
              <Pause size={14} strokeWidth={1.5} />
              Pause
            </>
          )}
        </button>
      </div>

      {/* Flowchart Summary */}
      <div className="bg-white border border-border rounded-card p-5 mb-5">
        <h3 className="text-card-title text-text-primary mb-4">Sequence Flow</h3>
        <div className="flex items-center gap-0">
          {/* Trigger */}
          <div className="flex-shrink-0 bg-[#FDF4FF] border border-[#E9D5FF] rounded-[8px] px-4 py-3 text-center min-w-[140px]">
            <div className="text-[10px] font-medium text-[#7C3AED] uppercase tracking-[0.5px] mb-1">Trigger</div>
            <div className="text-[12px] font-medium text-text-primary">{triggerLabel}</div>
          </div>
          {/* Arrow */}
          <div className="flex items-center text-text-tertiary px-2">
            <ArrowRight size={16} strokeWidth={1.5} />
          </div>
          {/* Agent */}
          <div className="flex-shrink-0 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[8px] px-4 py-3 text-center min-w-[140px]">
            <div className="text-[10px] font-medium text-[#1D4ED8] uppercase tracking-[0.5px] mb-1">Agent</div>
            <div className="text-[12px] font-medium text-text-primary truncate max-w-[180px]">{agentLabel}</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-7 gap-2 mb-5">
        <MetricCard label="Total Contacts" value={stats.totalContacts} />
        <MetricCard label="Called" value={stats.called} subMetric={`${Math.round((stats.called / stats.totalContacts) * 100)}% coverage`} />
        <MetricCard label="Connected" value={stats.connected} subMetric={`${Math.round((stats.connected / stats.called) * 100)}% rate`} />
        <MetricCard label="Qualified" value={stats.qualified} subMetric={`${Math.round((stats.qualified / stats.connected) * 100)}% qual rate`} />
        <MetricCard label="Not Qualified" value={stats.notQualified} />
        <MetricCard label="Callback" value={stats.callback} />
        <MetricCard label="No Answer" value={stats.noAnswer} />
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-border rounded-card p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium text-text-primary">
            {stats.called} of {stats.totalContacts} called
          </span>
          <span className="text-[12px] text-text-tertiary tabular-nums">
            {stats.totalContacts - stats.called} remaining
          </span>
        </div>
        <div className="w-full bg-surface-secondary rounded-full h-2">
          <div
            className="bg-accent rounded-full h-2 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-surface-secondary rounded-input p-0.5 w-fit mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setPage(1); setSearch(""); }}
            className={`px-4 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors duration-150 ${
              activeTab === t.key
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "contacts" && (
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-section-header text-text-primary">Contacts</h3>
            <div className="relative max-w-[240px]">
              <Search
                size={14}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-8 pl-8 pr-3 text-[13px] border border-border rounded-input bg-white focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {[
                    { label: "Name", align: "left" },
                    { label: "Phone", align: "left" },
                    { label: "Outcome", align: "left" },
                    { label: "Duration", align: "right" },
                    { label: "Qualification", align: "left" },
                    { label: "Key Notes", align: "left" },
                    { label: "Called At", align: "left" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-4 py-2.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-${h.align} whitespace-nowrap`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-border-subtle last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-[13px] text-text-primary font-medium whitespace-nowrap">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary tabular-nums whitespace-nowrap">
                      {c.phone}
                    </td>
                    <td className="px-4 py-2.5">
                      <OutcomeBadge outcome={c.outcome} />
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-primary text-right tabular-nums">
                      {c.duration ?? "\u2014"}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary capitalize">
                      {c.qualification ? c.qualification.replace("_", " ") : "\u2014"}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary max-w-[200px] truncate">
                      {c.keyNotes || "\u2014"}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">
                      {c.calledAt ? format(new Date(c.calledAt), "dd MMM, HH:mm") : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
            <span className="text-[12px] text-text-tertiary">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-button text-text-secondary hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sequence_log" && (
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h3 className="text-section-header text-text-primary">Sequence Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {[
                    { label: "Contact", align: "left" },
                    { label: "Agent Outcome", align: "left" },
                    { label: "Agent Suggested", align: "left" },
                    { label: "Sequence Decision", align: "left" },
                    { label: "Next Trigger", align: "left" },
                  ].map((h) => (
                    <th
                      key={h.label}
                      className={`px-4 py-2.5 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-${h.align} whitespace-nowrap`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sequenceLog.map((entry: SequenceLogEntry, i: number) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-border-subtle last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-surface-page/40"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-[13px] text-text-primary font-medium whitespace-nowrap">
                      {entry.contact_name}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary">
                      {entry.agent_outcome}
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary max-w-[200px]">
                      <span className="line-clamp-2">{entry.agent_suggested_next}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary max-w-[200px]">
                      <span className="line-clamp-2">{entry.sequence_decision}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-text-secondary whitespace-nowrap">
                      {entry.next_trigger_at
                        ? format(new Date(entry.next_trigger_at), "dd MMM, HH:mm")
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "schedule" && schedule && (
        <div className="bg-white border border-border rounded-card p-6">
          <h3 className="text-card-title text-text-primary mb-5">Schedule Configuration</h3>
          <div className="grid grid-cols-2 gap-6">
            {/* Daily Limit */}
            <div className="bg-surface-page rounded-[8px] px-4 py-3">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1">Daily Limit</div>
              <div className="text-[16px] font-semibold text-text-primary tabular-nums">{schedule.daily_limit} contacts/day</div>
            </div>
            {/* Active Hours */}
            <div className="bg-surface-page rounded-[8px] px-4 py-3">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1">Calling Hours</div>
              <div className="text-[16px] font-semibold text-text-primary tabular-nums">
                {schedule.active_hours.start} &ndash; {schedule.active_hours.end}
              </div>
            </div>
            {/* Active Days */}
            <div className="bg-surface-page rounded-[8px] px-4 py-3">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1">Active Days</div>
              <div className="flex items-center gap-1.5 mt-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <span
                    key={day}
                    className={`w-9 h-7 flex items-center justify-center text-[11px] font-medium rounded-[6px] ${
                      schedule.active_days.includes(day)
                        ? "bg-accent text-white"
                        : "bg-white text-text-tertiary border border-border-subtle"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
            {/* Retry Settings */}
            <div className="bg-surface-page rounded-[8px] px-4 py-3">
              <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1">Retry Settings</div>
              {schedule.retry.enabled ? (
                <div className="text-[14px] font-medium text-text-primary">
                  Up to {schedule.retry.max_retries} retries, {schedule.retry.interval_hours}h apart
                </div>
              ) : (
                <div className="text-[14px] text-text-tertiary">Disabled</div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
