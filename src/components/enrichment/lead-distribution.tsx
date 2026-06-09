"use client";

// Lead Distribution — the enrichment dashboard for a project. Demographic +
// firmographic breakdowns of the leads Spot's enrichment has appended.
// Mirrors the supplied design: bar, donut, pie, and horizontal-bar cards.
//
// recharts v3's ResponsiveContainer mis-measures to width(-1) under React 19,
// so we measure the card ourselves (ChartFrame) and hand the charts explicit
// pixel dimensions.

import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from "recharts";
import {
  distributionForProduct,
  distTotal,
  ENRICH_PALETTE,
  TIER_COLORS,
  LOCATION_COLORS,
  NETWORTH_COLORS,
  SENIORITY_COLORS,
  type DistItem,
} from "@/lib/enrichment-distribution";

const LABEL_STYLE = { fontSize: 12, fill: "#374151", fontWeight: 600 } as const;
const AXIS_TICK = { fontSize: 11, fill: "#6B6B63" } as const;

const TEAL_RAMP = [
  ENRICH_PALETTE.tealDark,
  ENRICH_PALETTE.teal,
  ENRICH_PALETTE.tealMid,
  ENRICH_PALETTE.teal,
  ENRICH_PALETTE.tealDark,
  ENRICH_PALETTE.tealMid,
  ENRICH_PALETTE.tealLight,
];

/** Measures its own width and renders the chart with explicit dimensions. */
function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: (width: number, height: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: "100%", height }}>
      {w > 0 ? children(w, height) : null}
    </div>
  );
}

function ChartCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-medium text-text-primary">{title}</span>
        <span className="text-[11px] text-text-tertiary">
          Total Leads <span className="text-[#2E9587] font-semibold">{count}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

/** Vertical bar chart with value labels on top. */
function BarCard({
  title,
  data,
  colors,
  height = 200,
}: {
  title: string;
  data: DistItem[];
  colors?: string[];
  height?: number;
}) {
  const ramp = colors ?? TEAL_RAMP;
  return (
    <ChartCard title={title} count={distTotal(data)}>
      <ChartFrame height={height}>
        {(w, h) => (
          <BarChart width={w} height={h} data={data} margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
            <YAxis hide domain={[0, (max: number) => Math.ceil(max * 1.18)]} />
            <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={86} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={ramp[i % ramp.length]} />
              ))}
              <LabelList dataKey="count" position="top" style={LABEL_STYLE} />
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
}

/** Horizontal bar chart with value labels at the end. */
function HBarCard({ title, data }: { title: string; data: DistItem[] }) {
  const height = Math.max(200, data.length * 30);
  return (
    <ChartCard title={title} count={distTotal(data)}>
      <ChartFrame height={height}>
        {(w, h) => (
          <BarChart
            width={w}
            height={h}
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 30, left: 8, bottom: 4 }}
          >
            <XAxis type="number" hide domain={[0, (max: number) => Math.ceil(max * 1.12)]} />
            <YAxis type="category" dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} />
            <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={20} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={TEAL_RAMP[i % TEAL_RAMP.length]} />
              ))}
              <LabelList dataKey="count" position="right" style={LABEL_STYLE} />
            </Bar>
          </BarChart>
        )}
      </ChartFrame>
    </ChartCard>
  );
}

/** Pie / donut with a left legend and number labels on the slices. */
function PieCard({
  title,
  data,
  colors,
  donut,
}: {
  title: string;
  data: DistItem[];
  colors: string[];
  donut?: boolean;
}) {
  return (
    <ChartCard title={title} count={distTotal(data)}>
      <div className="flex items-center gap-4">
        {/* Legend */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {data.map((d, i) => (
            <div key={d.label} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0"
                style={{ background: colors[i % colors.length] }}
              />
              <span className="text-[12px] text-text-secondary">{d.label}</span>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="flex-1 min-w-0">
          <ChartFrame height={200}>
            {(w, h) => (
              <PieChart width={w} height={h}>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={donut ? 48 : 0}
                  outerRadius={78}
                  paddingAngle={donut ? 1.5 : 0}
                  label={({ value }: { value?: number }) => `${value ?? ""}`}
                  labelLine
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ChartFrame>
        </div>
      </div>
    </ChartCard>
  );
}

export function LeadDistribution({ productId }: { productId: string }) {
  const d = distributionForProduct(productId);
  return (
    <div className="space-y-4">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-[#5B8D91]">
        Lead Distribution
      </div>

      <div className="grid grid-cols-2 gap-4">
        <BarCard title="Age Group" data={d.ageGroup} />
        <PieCard title="Company Tier" data={d.companyTier} colors={TIER_COLORS} donut />
        <PieCard title="Location" data={d.location} colors={LOCATION_COLORS} />
        <HBarCard title="Salary Range in INR/Lakh" data={d.salaryRange} />
        <PieCard title="Net Worth" data={d.netWorth} colors={NETWORTH_COLORS} />
        <BarCard title="Seniority Level" data={d.seniority} colors={SENIORITY_COLORS} />
      </div>

      <BarCard title="Years of Experience" data={d.yearsExperience} height={230} />
    </div>
  );
}
