"use client";


import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

// ── Types ──────────────────────────────────────────────────

interface DistributionItem {
  label: string;
  count: number;
}

interface LeadInsightsProps {
  distributions: {
    ageGroups: DistributionItem[];
    locations: DistributionItem[];
    budgetRanges: DistributionItem[];
    temperatures: DistributionItem[];
    netWorth?: DistributionItem[];
    seniorityLevel?: DistributionItem[];
  };
}

// ── Colors ─────────────────────────────────────────────────

const BAR_COLOR = "#5BA3A3";
const PIE_COLORS = ["#E8927C", "#D4B96A", "#5BA3A3", "#2D3748", "#8B9EC7"];

const TEMP_COLORS: Record<string, string> = {
  Hot: "#DC2626",
  Warm: "#16A34A",
  Lukewarm: "#EA580C",
  Cold: "#2563EB",
};

// ── Helpers ────────────────────────────────────────────────

function total(items: DistributionItem[]) {
  return items.reduce((s, d) => s + d.count, 0);
}

function ChartCard({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-text-primary">{title}</span>
        <span className="text-[11px] text-text-tertiary">Total Leads {count}</span>
      </div>
      {children}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export function LeadInsights({ distributions }: LeadInsightsProps) {
  return (
    <div className="space-y-5">
      {/* Section header */}
      <h4 className="text-[14px] font-semibold text-text-primary">Lead Distribution</h4>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5">
        {/* Age Group — Bar */}
        <ChartCard title="Age Group" count={total(distributions.ageGroups)}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distributions.ageGroups}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="count" fill={BAR_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Location — Pie (donut) */}
        <ChartCard title="Location" count={total(distributions.locations)}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distributions.locations} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {distributions.locations.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Budget Range — Pie (donut) */}
        <ChartCard title="Budget Range" count={total(distributions.budgetRanges)}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distributions.budgetRanges} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {distributions.budgetRanges.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lead Temperature — Bar with colored bars */}
        <ChartCard title="Lead Temperature" count={total(distributions.temperatures)}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distributions.temperatures}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {distributions.temperatures.map((entry, i) => (
                  <Cell key={i} fill={TEMP_COLORS[entry.label] ?? BAR_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Net Worth — Pie (optional) */}
        {distributions.netWorth && (
          <ChartCard title="Net Worth" count={total(distributions.netWorth)}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={distributions.netWorth} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {distributions.netWorth.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Seniority Level — Bar (optional) */}
        {distributions.seniorityLevel && (
          <ChartCard title="Seniority Level" count={total(distributions.seniorityLevel)}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distributions.seniorityLevel}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
