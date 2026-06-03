"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { campaignDetail, healthIndicators } from "@/lib/campaign-data";
import { DateRangeSelector } from "@/components/dashboard/date-range-selector";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricExplorer } from "./metric-explorer";

// ── Funnel Stages ───────────────────────────────────────────

const funnelStages = [
  { label: "Leads", value: 186 },
  { label: "Verified", value: 42, rate: "22.6%" },
  { label: "AI Qual", value: 34, rate: "81.0%" },
  { label: "Qualified", value: 22, rate: "64.7%" },
];

// ══════════════════════════════════════════════════════════════

export function AnalysisTab({ agentConnected = true }: { agentConnected?: boolean }) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["cpl"]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 3) return prev;
      return [...prev, key];
    });
  };

  return (
    <div className="space-y-5">
      {/* Date Range + Target CPL */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-badge bg-surface-secondary text-text-secondary">
          <Target size={13} strokeWidth={1.5} />
          Target CPL: ₹{campaignDetail.targetCPL.toLocaleString("en-IN")}
        </span>
        <DateRangeSelector compact />
      </div>

      {/* 5 metric cards — full width row */}
      <div className="grid grid-cols-5 gap-2.5">
        <MetricCard label="Spend" value="₹2.2L" previous="₹1.74L"
          delta="+₹46K" tooltip="Total amount spent in the selected period."
          trend={{ value: 25.9, direction: "up" }}
          chartKey="spend" isSelected={selectedMetrics.includes("spend")} onToggle={toggleMetric} />
        <MetricCard label="Leads" value="186" previous={166}
          delta="+20" tooltip="Total lead form submissions."
          trend={{ value: 12, direction: "up" }}
          chartKey="leads" isSelected={selectedMetrics.includes("leads")} onToggle={toggleMetric} />
        {agentConnected ? (
          <MetricCard label="Qualified" value="22" previous={20}
            delta="+2" tooltip="Leads that passed all qualification criteria."
            subMetric="11.8% qualification rate"
            trend={{ value: 7.9, direction: "up" }}
            chartKey="qualified" isSelected={selectedMetrics.includes("qualified")} onToggle={toggleMetric} />
        ) : (
          <div className="bg-[#FEF3C7]/50 border border-[#F59E0B]/20 rounded-card p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-medium text-[#92400E] uppercase tracking-[0.4px]">Qualified</span>
            <span className="text-[20px] font-bold text-[#92400E]/40 mt-1">—</span>
            <a href="/agents" className="text-[10px] font-medium text-[#92400E] underline mt-1 hover:text-[#78350F]">Connect agent</a>
          </div>
        )}
        <MetricCard label="CPL vs Target" value="-₹17" previous="₹1,245"
          delta="₹1,183" tooltip="Actual CPL ₹1,183 vs target ₹1,200. ₹17 below target."
          subMetric="₹1,183 vs ₹1,200 target"
          status="good"
          trend={{ value: 1.4, direction: "down", positive: true }}
          chartKey="cpl" isSelected={selectedMetrics.includes("cpl")} onToggle={toggleMetric} />
        {agentConnected ? (
          <MetricCard label="CPQL" value="₹10,000" previous="₹9,524"
            delta="+₹476" tooltip="True cost of acquiring a sales-ready lead."
            trend={{ value: 5, direction: "up", positive: false }}
            chartKey="cpql" isSelected={selectedMetrics.includes("cpql")} onToggle={toggleMetric} />
        ) : (
          <div className="bg-[#FEF3C7]/50 border border-[#F59E0B]/20 rounded-card p-4 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-medium text-[#92400E] uppercase tracking-[0.4px]">CPQL</span>
            <span className="text-[20px] font-bold text-[#92400E]/40 mt-1">—</span>
            <a href="/agents" className="text-[10px] font-medium text-[#92400E] underline mt-1 hover:text-[#78350F]">Connect agent</a>
          </div>
        )}
      </div>

      {/* Unified: Funnel + Health in one strip */}
      <div className="bg-white border border-border rounded-card px-5 py-2.5 flex items-center">
        {/* Funnel — left side */}
        <span className="text-[9px] font-medium text-text-tertiary uppercase tracking-[0.5px] mr-3 shrink-0">Funnel</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {funnelStages.map((stage, i) => {
            const maxVal = funnelStages[0].value;
            const widthPx = Math.max(Math.round((stage.value / maxVal) * 140), 26);
            const opacity = 0.85 - i * 0.15;
            return (
              <div key={stage.label} className="flex items-center gap-1">
                {i > 0 && <span className="text-[8px] text-text-tertiary mx-0.5">→</span>}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: widthPx }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                  className="h-[22px] rounded-[3px] flex items-center justify-center px-1.5 shrink-0"
                  style={{ backgroundColor: `rgba(26,26,26,${opacity})` }}
                >
                  <span className="text-[9px] font-semibold text-white tabular-nums whitespace-nowrap">{stage.value}</span>
                </motion.div>
                <div className="shrink-0 leading-none">
                  <div className="text-[9px] text-text-secondary">{stage.label}</div>
                  {stage.rate && <div className="text-[8px] text-text-tertiary">{stage.rate}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-4 shrink-0" />

        {/* Health — right side */}
        <span className="text-[9px] font-medium text-text-tertiary uppercase tracking-[0.5px] mr-2.5 shrink-0">Health</span>
        <div className="flex items-center gap-4 shrink-0">
          {healthIndicators.map((h) => (
            <button
              key={h.key}
              onClick={() => toggleMetric(h.key)}
              className={`flex items-center gap-1 transition-colors duration-150 ${
                selectedMetrics.includes(h.key) ? "opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              <div className={`w-[5px] h-[5px] rounded-full ${
                h.status === "green" ? "bg-status-success" : h.status === "yellow" ? "bg-status-warning" : "bg-status-error"
              }`} />
              <span className="text-[10px] text-text-secondary">{h.label}</span>
              <span className="text-[10px] font-medium text-text-primary tabular-nums">{h.value}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Metric Explorer */}
      <MetricExplorer selectedMetrics={selectedMetrics} onToggleMetric={toggleMetric} />
    </div>
  );
}
