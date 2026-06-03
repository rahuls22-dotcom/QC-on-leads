"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft, Pencil, Phone, Play, Volume2, CheckCircle2,
  AlertTriangle, PhoneOff, Voicemail, PhoneCall, Calendar, Target,
  PhoneIncoming, MessageSquare, ShieldCheck, Clock,
} from "lucide-react";
import { format } from "date-fns";
import { MetricCard } from "@/components/dashboard/metric-card";
import { agentDetail, agentPerformance, newAgentDetail } from "@/lib/voice-agent-data";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

type Tab = "configuration" | "call_history" | "performance";

function OutcomeIcon({ outcome }: { outcome: string }) {
  const cfg: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
    qualified: { icon: CheckCircle2, cls: "text-[#15803D]", label: "Qualified" },
    not_qualified: { icon: AlertTriangle, cls: "text-[#92400E]", label: "Not Qualified" },
    no_answer: { icon: PhoneOff, cls: "text-text-tertiary", label: "No Answer" },
    callback: { icon: PhoneCall, cls: "text-status-info", label: "Callback" },
    voicemail: { icon: Voicemail, cls: "text-text-secondary", label: "Voicemail" },
  };
  const c = cfg[outcome] || cfg.no_answer;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${c.cls}`}>
      <c.icon size={12} strokeWidth={2} /> {c.label}
    </span>
  );
}

// PerfMetricCard removed — using shared MetricCard from @/components/dashboard/metric-card

// ── Donut Chart Custom Label ────────────────────────────────
const RADIAN = Math.PI / 180;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomizedLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#0A0A0A" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11} fontWeight={600}>
      {value}
    </text>
  );
}

export default function AgentDetailPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("performance");
  const [dateRange, setDateRange] = useState("lifetime");
  const d = agentDetail;
  const perf = agentPerformance;

  const tabs: { key: Tab; label: string }[] = [
    { key: "performance", label: "Performance" },
    { key: "call_history", label: "Call History" },
    { key: "configuration", label: "Configuration" },
  ];

  const dateRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "14d", label: "Last 14 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "60d", label: "Last 60 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "lifetime", label: "Lifetime" },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.push("/agents")} className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors duration-150">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Tools › Agents › {d.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-page-title text-text-primary">{d.name}</h1>
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">Active</span>
            {newAgentDetail.voice_config && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
                <Phone size={10} strokeWidth={2} /> Voice
              </span>
            )}
            {newAgentDetail.whatsapp_config && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                <MessageSquare size={10} strokeWidth={2} /> WhatsApp
              </span>
            )}
          </div>
          <div className="text-[12px] text-text-secondary">
            {d.languages.join(", ")} · {d.template === "qualifying" ? "Qualifying" : "Custom"} template ·{" "}
            <span className="font-medium text-text-primary">{newAgentDetail.objectives.length}</span> objectives ·{" "}
            <span className="font-medium text-text-primary">{newAgentDetail.variables.length}</span> variables
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
            <Pencil size={14} strokeWidth={1.5} /> Edit
          </button>
          <button className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
            <Play size={14} strokeWidth={1.5} /> Test Agent
          </button>
        </div>
      </div>

      {/* Condensed Stats Row */}
      <div className="text-[12px] text-text-secondary mb-6">
        <span className="font-medium text-text-primary">{perf.leadMetrics.totalLeads}</span> leads ·{" "}
        <span className="font-medium text-text-primary">{perf.leadMetrics.leadsConnected}</span> connected ({perf.leadMetrics.connectRate}%) ·{" "}
        <span className="font-medium text-text-primary">{perf.leadMetrics.leadsQualified}</span> qualified ({perf.leadMetrics.qualificationRate}%) ·{" "}
        <span className="font-medium text-text-primary">₹{perf.callMetrics.cpql}</span> CPQL
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${activeTab === tab.key ? "text-text-primary" : "text-text-secondary hover:text-text-primary"}`}>
            {tab.label}
            {activeTab === tab.key && <motion.div layoutId="agent-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" transition={{ duration: 0.15 }} />}
          </button>
        ))}
      </div>

      {/* ═══ CONFIGURATION TAB ═══ */}
      {activeTab === "configuration" && (
        <div className="space-y-5">
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">Goal</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">{d.goal}</p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white border border-border rounded-card p-5">
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Voice & Delivery</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-surface-secondary flex items-center justify-center"><Volume2 size={16} className="text-text-tertiary" /></div>
                <div>
                  <div className="text-[13px] font-medium text-text-primary">{d.voice.name}</div>
                  <div className="text-[11px] text-text-tertiary">{d.voice.gender} · {d.voice.languages.join(", ")}</div>
                </div>
              </div>
              <div className="text-[12px] text-text-secondary">Tone: <span className="capitalize font-medium text-text-primary">{d.tone}</span></div>
            </div>
            <div className="bg-white border border-border rounded-card p-5">
              <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Post-Call Actions</h3>
              <div className="space-y-1.5 text-[12px]">
                {[
                  { label: "Push to CRM", value: d.postCall.pushToCRM },
                  { label: "Retry unanswered", value: d.postCall.retryUnanswered },
                  { label: "Voicemail follow-up", value: d.postCall.sendFollowUpVoicemail },
                  { label: "Notify on qualified", value: d.postCall.notifyOnQualified },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-1">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className={`font-medium ${item.value ? "text-[#15803D]" : "text-text-tertiary"}`}>{item.value ? "Enabled" : "Disabled"}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1">
                  <span className="text-text-secondary">Calling hours</span>
                  <span className="text-text-primary font-medium">{d.postCall.callingHoursStart} – {d.postCall.callingHoursEnd}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Qualification Metrics</h3>
            <div className="space-y-2">
              {d.metrics.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                  <span className="text-[13px] text-text-primary font-medium flex-1">{m.name}</span>
                  <span className="text-[11px] text-text-secondary">{m.condition}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-badge capitalize ${
                    m.weight === "critical" ? "bg-[#FEF2F2] text-[#DC2626]" : m.weight === "high" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-surface-secondary text-text-secondary"
                  }`}>{m.weight}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">System Prompt</h3>
            <pre className="text-[12px] text-text-secondary whitespace-pre-wrap leading-relaxed font-mono bg-surface-page rounded-[6px] p-3">{d.systemPrompt}</pre>
          </div>
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Conversation Flow</h3>
            <div className="space-y-2">
              {d.flow.map((s) => (
                <div key={s.id} className="flex items-start gap-3 py-2 border-b border-border-subtle last:border-0">
                  <span className="w-6 h-6 rounded-full bg-surface-secondary flex items-center justify-center text-[10px] font-semibold text-text-tertiary shrink-0 mt-0.5">{s.step}</span>
                  <div>
                    <div className="text-[13px] font-medium text-text-primary">{s.name}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">{s.script}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CALL HISTORY TAB ═══ */}
      {activeTab === "call_history" && (
        <div className="bg-white border border-border rounded-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Lead", "Phone", "Date", "Duration", "Outcome", "Qualification"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.recentCalls.map((call, i) => (
                <tr key={call.id} className={`border-b border-border-subtle last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-surface-page/40"}`}>
                  <td className="px-4 py-3 text-[13px] text-text-primary font-medium">{call.name}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary tabular-nums">{call.phone}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{format(new Date(call.date), "dd MMM, HH:mm")}</td>
                  <td className="px-4 py-3 text-[12px] text-text-primary tabular-nums">{call.duration > 0 ? `${call.duration} min` : "—"}</td>
                  <td className="px-4 py-3"><OutcomeIcon outcome={call.outcome} /></td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{call.qualification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ PERFORMANCE TAB ═══ */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* Date Range */}
          <div className="flex items-center justify-between">
            <div />
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-text-tertiary">1 Oct 2025 — 23 Mar 2026</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-8 px-3 pr-8 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                }}
              >
                {dateRangeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* LEAD METRICS */}
          <div>
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Lead Metrics</div>
            <div className="grid grid-cols-5 gap-3">
              <MetricCard icon={Target} label="Total Leads" value={perf.leadMetrics.totalLeads.toLocaleString()} subMetric={`in ${perf.dateRange.days} days`} />
              <MetricCard icon={PhoneIncoming} label="Leads Dialed" value={perf.leadMetrics.leadsDialed.toLocaleString()} subMetric={`${perf.leadMetrics.coverageRate}% coverage`} />
              <MetricCard icon={Phone} label="Connected" value={perf.leadMetrics.leadsConnected.toLocaleString()} subMetric={`${perf.leadMetrics.connectRate}% connect rate`} />
              <MetricCard icon={MessageSquare} label="Interacted" value={perf.leadMetrics.leadsInteracted.toLocaleString()} subMetric={`${perf.leadMetrics.interactionRate}% interaction rate`} />
              <MetricCard icon={ShieldCheck} label="Qualified" value={perf.leadMetrics.leadsQualified.toLocaleString()} subMetric={`${perf.leadMetrics.qualificationRate}% qualification rate`} />
            </div>
          </div>

          {/* CALL METRICS */}
          <div>
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Call Metrics</div>
            <div className="grid grid-cols-4 gap-3">
              <MetricCard label="Total Calls" value={perf.callMetrics.totalCalls.toLocaleString()} subMetric={`${perf.callMetrics.callsPerLead} calls / lead avg`} />
              <MetricCard label="Total Minutes" value={`${perf.callMetrics.totalMinutes}m`} subMetric={`${perf.callMetrics.avgMinPerLead} avg per lead`} />
              <MetricCard label="Total Cost" value={`₹${perf.callMetrics.totalCost.toLocaleString("en-IN")}`} subMetric={`₹${perf.callMetrics.costPerLead} / lead avg`} />
              <MetricCard label="CPQL" value={`₹${perf.callMetrics.cpql}`} subMetric={`₹${perf.callMetrics.spentOnQLs.toLocaleString("en-IN")} → ${perf.callMetrics.qualifiedLeads} QLs`} />
            </div>
          </div>

          {/* LEAD DISTRIBUTION */}
          <div>
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Lead Distribution</div>
            <div className="grid grid-cols-2 gap-4">
              {/* Dial Attempts Bar Chart */}
              <div className="bg-white border border-border rounded-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-text-primary">Lead Distribution by Dial Attempts</h3>
                  <span className="text-[12px] font-semibold text-accent tabular-nums">Total Leads {perf.leadMetrics.totalLeads}</span>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perf.dialAttemptsDistribution} margin={{ top: 20, right: 10, bottom: 5, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                      <XAxis dataKey="dials" tick={{ fontSize: 10, fill: "#9B9B9B" }} axisLine={{ stroke: "#E5E5E5" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9B9B9B" }} axisLine={{ stroke: "#E5E5E5" }} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E5E5", borderRadius: "6px", fontSize: "12px" }} />
                      <Bar dataKey="count" fill="#1A1A1A" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, fill: "#6B6B6B" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lead Status Donut */}
              <div className="bg-white border border-border rounded-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-text-primary">Lead Status Distribution</h3>
                  <span className="text-[12px] font-semibold text-accent tabular-nums">Total Leads {perf.leadMetrics.totalLeads}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[200px] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={perf.leadStatusDistribution}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                          label={renderCustomizedLabel}
                        >
                          {perf.leadStatusDistribution.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {perf.leadStatusDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] text-text-secondary">{item.name}</span>
                        <span className="text-[11px] font-medium text-text-primary tabular-nums ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FUNNEL & DAILY ACTIVITY */}
          <div className="grid grid-cols-2 gap-4">
            {/* Qualification Funnel */}
            <div className="bg-white border border-border rounded-card p-5">
              <h3 className="text-[14px] font-semibold text-text-primary mb-4">Qualification Funnel</h3>
              <div className="space-y-3">
                {perf.funnelData.map((item, i) => {
                  const opacity = 1 - (i * 0.15);
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-text-secondary">{item.label}</span>
                        <span className="text-[13px] font-medium text-text-primary tabular-nums">
                          {item.value.toLocaleString()} <span className="text-text-tertiary text-[11px]">({item.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-3 bg-surface-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: `rgba(26,26,26,${opacity})` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Call Activity */}
            <div className="bg-white border border-border rounded-card p-5">
              <h3 className="text-[14px] font-semibold text-text-primary mb-4">Daily Call Activity</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={perf.dailyCallActivity} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="callFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1A1A1A" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9B9B9B" }} axisLine={{ stroke: "#E5E5E5" }} tickLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: "#9B9B9B" }} axisLine={{ stroke: "#E5E5E5" }} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E5E5", borderRadius: "6px", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="calls" stroke="#1A1A1A" strokeWidth={2} fill="url(#callFill)" dot={{ r: 2, fill: "#1A1A1A", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TOP DISQUALIFICATION REASONS */}
          <div>
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-3">Top Disqualification Reasons</div>
            <div className="bg-white border border-border rounded-card p-5">
              <div className="flex items-center gap-6">
                <div className="w-[160px] h-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={perf.disqualificationReasons.map((r) => ({ name: r.reason, value: r.pct }))}
                        cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {perf.disqualificationReasons.map((_, i) => (
                          <Cell key={i} fill={["#1A1A1A", "#6B6B6B", "#A0A0A0", "#D4D4D4"][i % 4]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 flex-1">
                  {perf.disqualificationReasons.map((item, i) => (
                    <div key={item.reason} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["#1A1A1A", "#6B6B6B", "#A0A0A0", "#D4D4D4"][i % 4] }} />
                      <span className="text-[12px] text-text-secondary flex-1">{item.reason}</span>
                      <span className="text-[12px] font-medium text-text-primary tabular-nums">{item.pct}%</span>
                      <span className="text-[11px] text-text-tertiary tabular-nums">({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
