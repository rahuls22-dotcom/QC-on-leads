"use client";

import { Phone } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const DQ_COLORS = ["#1A1A1A", "#6B6B6B", "#A0A0A0", "#D4D4D4"];

interface VoiceAgentPerformanceProps {
  metrics: {
    totalCalls: number;
    connected: { value: number; rate: number };
    qualified: { value: number; rate: number };
    avgDuration: number;
  };
  disqualificationReasons: { reason: string; percentage: number }[];
}

export function VoiceAgentPerformance({
  metrics,
  disqualificationReasons,
}: VoiceAgentPerformanceProps) {
  const pieData = disqualificationReasons.map((r) => ({ name: r.reason, value: r.percentage }));

  return (
    <div className="bg-white border border-border rounded-card p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <Phone size={16} strokeWidth={1.5} className="text-text-secondary" />
        <h2 className="text-section-header text-text-primary">Voice agent performance</h2>
      </div>

      {/* Mini metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-page rounded-metric px-4 py-3">
          <span className="text-[12px] text-text-tertiary block mb-0.5">Total calls</span>
          <span className="text-stat-md text-text-primary">{metrics.totalCalls}</span>
        </div>
        <div className="bg-surface-page rounded-metric px-4 py-3">
          <span className="text-[12px] text-text-tertiary block mb-0.5">Connected</span>
          <span className="text-stat-md text-text-primary">{metrics.connected.value}</span>
          <span className="text-[12px] text-text-secondary ml-1">({metrics.connected.rate}%)</span>
        </div>
        <div className="bg-surface-page rounded-metric px-4 py-3">
          <span className="text-[12px] text-text-tertiary block mb-0.5">Qualified</span>
          <span className="text-stat-md text-text-primary">{metrics.qualified.value}</span>
          <span className="text-[12px] text-text-secondary ml-1">({metrics.qualified.rate}%)</span>
        </div>
        <div className="bg-surface-page rounded-metric px-4 py-3">
          <span className="text-[12px] text-text-tertiary block mb-0.5">Avg duration</span>
          <span className="text-stat-md text-text-primary">{metrics.avgDuration}</span>
          <span className="text-[12px] text-text-secondary ml-1">min</span>
        </div>
      </div>

      {/* Disqualification reasons — pie chart */}
      <div>
        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">
          Top disqualification reasons
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={DQ_COLORS[i % DQ_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 flex-1">
            {disqualificationReasons.map((item, i) => (
              <div key={item.reason} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DQ_COLORS[i % DQ_COLORS.length] }} />
                <span className="text-[12px] text-text-secondary flex-1">{item.reason}</span>
                <span className="text-[12px] font-medium text-text-primary tabular-nums">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
