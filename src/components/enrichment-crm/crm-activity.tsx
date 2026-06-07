"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronRight, Download, Search, X } from "lucide-react";
import { useEnrichmentCrmStore, type RunRecord, type CrmLeadChannel } from "@/lib/enrichment-crm-data";

// ── Top-level activity tab ────────────────────────────────────────────────

type Window = "today" | "7d" | "30d" | "90d" | "6m" | "1y" | "all";
type Granularity = "hour" | "day" | "week" | "month";

export function CrmActivity({
  onOpenRun: _onOpenRun,
  scope = "crm",
  heading,
}: {
  onOpenRun: (r: RunRecord) => void;
  /**
   * "crm"  → only CRM-sourced runs (CRM activity view).
   * "all"  → every enrichment run (dashboard view across CRM + bulk + single).
   */
  scope?: "crm" | "all";
  /** Override the Overview heading. Defaults to "Overview". */
  heading?: string;
}) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const scoped = useMemo(
    () => (scope === "all" ? runs : runs.filter((r) => r.source === "crm")),
    [runs, scope],
  );

  const [windowKey, setWindowKey] = useState<Window>("7d");

  return (
    <div className="space-y-6">
      <KpiStrip runs={scoped} windowKey={windowKey} onWindowChange={setWindowKey} heading={heading} />
      <VolumeChart runs={scoped} windowKey={windowKey} />
    </div>
  );
}

// ── KPI strip ─────────────────────────────────────────────────────────────

function KpiStrip({
  runs,
  windowKey,
  onWindowChange,
  heading,
}: {
  runs: RunRecord[];
  windowKey: Window;
  onWindowChange: (w: Window) => void;
  heading?: string;
}) {
  const cutoffMs = windowMs(windowKey);
  const cutoff = cutoffMs === null ? null : Date.now() - cutoffMs;

  const cur = cutoff === null
    ? runs
    : runs.filter((r) => Date.parse(r.startedAt) >= cutoff);

  // Previous period (same length, just before cur). Skipped for "all".
  const prev = cutoffMs === null
    ? []
    : runs.filter((r) => {
        const t = Date.parse(r.startedAt);
        return t >= Date.now() - cutoffMs * 2 && t < (cutoff as number);
      });

  const incoming = cur.length;
  const enriched = cur.filter(
    (r) => r.status === "done" && r.profile?.enrichment_status !== "Zero Enrichment",
  ).length;
  const notEnriched = cur.filter(
    (r) => r.status === "done" && r.profile?.enrichment_status === "Zero Enrichment",
  ).length;
  const failed = cur.filter((r) => r.status === "failed").length;

  const incomingDelta = cutoffMs === null
    ? undefined
    : Math.round(((incoming - prev.length) / (prev.length || 1)) * 100);

  // Show Failed tile only when there's an actual system failure to report.
  const showFailed = failed > 0;
  const cols = showFailed ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-section-header text-text-primary">{heading ?? "Overview"}</h2>
        <WindowSelector value={windowKey} onChange={onWindowChange} />
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols} gap-3`}>
        <Tile label="Incoming leads"  value={incoming}     delta={incomingDelta} accent="neutral" />
        <Tile label="Enriched"        value={enriched}     sub={pct(enriched, incoming) + "% success"} accent="good" />
        <Tile
          label="Not enriched"
          value={notEnriched}
          sub={pct(notEnriched, incoming) + "%, data unavailable"}
          accent="neutral"
          hint="Lead processed but no public data found for these contacts. Expected baseline."
        />
        {showFailed && (
          <Tile
            label="Failed"
            value={failed}
            sub={pct(failed, incoming) + "%, system error"}
            accent="bad"
            hint="System-side failures (timeouts, API errors). Target is zero."
          />
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  delta,
  accent,
  hint,
}: {
  label: string;
  value: number;
  sub?: string;
  delta?: number;
  accent: "good" | "bad" | "info" | "neutral";
  hint?: string;
}) {
  const ring = accent === "good" ? "bg-[#F0FDF4] text-[#15803D]" :
               accent === "bad"  ? "bg-[#FEF2F2] text-[#DC2626]" :
               accent === "info" ? "bg-[#EFF6FF] text-[#1D4ED8]" :
               "bg-surface-secondary text-text-secondary";
  return (
    <div className="bg-white border border-border rounded-card p-4" title={hint}>
      <div className="text-[11.5px] text-text-secondary font-medium uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="text-[24px] font-semibold text-text-primary tabular-nums">{value.toLocaleString("en-IN")}</div>
        {typeof delta === "number" && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${delta >= 0 ? "text-[#15803D]" : "text-[#DC2626]"}`}>
            <ArrowUpRight size={11} strokeWidth={2} className={delta < 0 ? "rotate-90" : ""} />
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

function WindowSelector({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const opts: { k: Window; label: string }[] = [
    { k: "today", label: "Today" },
    { k: "7d",    label: "7d" },
    { k: "30d",   label: "30d" },
    { k: "90d",   label: "90d" },
    { k: "6m",    label: "6m" },
    { k: "1y",    label: "1y" },
    { k: "all",   label: "All" },
  ];
  return (
    <div className="inline-flex items-center bg-white border border-border rounded-input p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={[
            "h-7 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors",
            o.k === value
              ? "bg-text-primary text-white"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Volume chart (line, works at every range) ────────────────────────────

function VolumeChart({ runs, windowKey }: { runs: RunRecord[]; windowKey: Window }) {
  const granularity = granularityFor(windowKey);
  const bucketDefs = useMemo(() => buildBuckets(windowKey), [windowKey]);
  const data = useMemo(() => {
    const map: Record<string, { enriched: number; notEnriched: number; failed: number }> = {};
    bucketDefs.forEach((b) => (map[b.key] = { enriched: 0, notEnriched: 0, failed: 0 }));
    runs.forEach((r) => {
      const k = bucketKey(new Date(r.startedAt), granularity);
      if (!map[k]) return;
      if (r.status === "failed") map[k].failed += 1;
      else if (r.status === "done") {
        if (r.profile?.enrichment_status === "Zero Enrichment") map[k].notEnriched += 1;
        else map[k].enriched += 1;
      }
    });
    return map;
  }, [bucketDefs, runs, granularity]);

  // Scale to the largest single series value, not the stacked total. Lines
  // read better when each series has visible amplitude.
  const max = Math.max(
    4,
    ...bucketDefs.flatMap((b) => [data[b.key].enriched, data[b.key].notEnriched, data[b.key].failed]),
  );

  const rangeLabel = windowLabel(windowKey);
  const title =
    granularity === "hour"  ? "Hourly volume" :
    granularity === "day"   ? "Daily volume" :
    granularity === "week"  ? "Weekly volume" :
    "Monthly volume";

  return (
    <section className="bg-white border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-section-header text-text-primary">{title}</h3>
          <p className="text-[12px] text-text-tertiary mt-0.5">{rangeLabel} · enriched, not enriched, failed</p>
        </div>
        <Legend />
      </div>
      <LineChart bucketDefs={bucketDefs} data={data} max={max} granularity={granularity} />
    </section>
  );
}

// ── Line chart ───────────────────────────────────────────────────────────
//
// Three lines (enriched / not enriched / failed). Enriched also gets a soft
// fill underneath as the dominant series. Scales to any bucket count.

interface BucketDef { key: string; shortLabel: string; fullLabel: string }
interface BucketVal { enriched: number; notEnriched: number; failed: number }

function LineChart({
  bucketDefs,
  data,
  max,
  granularity,
}: {
  bucketDefs: BucketDef[];
  data: Record<string, BucketVal>;
  max: number;
  granularity: Granularity;
}) {
  const W = 1000; // viewBox width, actual width is responsive
  const H = 180;
  const PADDING_Y = 8;
  const innerH = H - PADDING_Y * 2;
  const n = bucketDefs.length;

  const xAt = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const yAt = (val: number) => H - PADDING_Y - (max ? (val / max) * innerH : 0);

  const sEnriched    = bucketDefs.map((b) => data[b.key].enriched);
  const sNotEnriched = bucketDefs.map((b) => data[b.key].notEnriched);
  const sFailed      = bucketDefs.map((b) => data[b.key].failed);

  const linePath = (series: number[]) => {
    if (series.length === 0) return "";
    return series.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
  };

  // Soft fill under the enriched line (closes path down to baseline).
  const fillPath = (series: number[]) => {
    if (series.length === 0) return "";
    const top = series.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
    return `${top} L ${xAt(n - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
  };

  const hasFailed = sFailed.some((v) => v > 0);

  const [hoverI, setHoverI] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const i = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
    setHoverI(i);
  };

  const tip = hoverI != null ? {
    d: bucketDefs[hoverI],
    b: data[bucketDefs[hoverI].key],
    x: xAt(hoverI),
    i: hoverI,
  } : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-[180px] block"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverI(null)}
      >
        {/* Faint horizontal gridlines (quarters) */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={0}
            y1={PADDING_Y + innerH * p}
            x2={W}
            y2={PADDING_Y + innerH * p}
            stroke="#F1F5F9"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Baseline */}
        <line x1={0} y1={H - PADDING_Y} x2={W} y2={H - PADDING_Y} stroke="#E5E7EB" strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {/* Enriched fill */}
        <path d={fillPath(sEnriched)} fill="#22C55E" opacity={0.08} />

        {/* Lines, draw failed first (least frequent, on top of others rarely),
            then not-enriched, then enriched on top so the dominant series wins. */}
        {hasFailed && (
          <path
            d={linePath(sFailed)}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <path
          d={linePath(sNotEnriched)}
          fill="none"
          stroke="#94A3B8"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={linePath(sEnriched)}
          fill="none"
          stroke="#22C55E"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Hover crosshair + dots on each series */}
        {tip && (
          <>
            <line
              x1={tip.x} y1={PADDING_Y} x2={tip.x} y2={H - PADDING_Y}
              stroke="#0F0F0F" strokeOpacity={0.25} strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={tip.x} cy={yAt(sEnriched[tip.i])} r={3.5} fill="#22C55E" stroke="white" strokeWidth={1.5} />
            <circle cx={tip.x} cy={yAt(sNotEnriched[tip.i])} r={3} fill="#94A3B8" stroke="white" strokeWidth={1.5} />
            {hasFailed && (
              <circle cx={tip.x} cy={yAt(sFailed[tip.i])} r={3} fill="#EF4444" stroke="white" strokeWidth={1.5} />
            )}
          </>
        )}
      </svg>

      {/* Tooltip (DOM, not SVG, so sizing isn't stretched by preserveAspectRatio) */}
      {tip && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: `${(tip.x / W) * 100}%`,
            transform: "translate(-50%, -100%)",
            top: 0,
          }}
        >
          <div className="bg-text-primary text-white rounded-input shadow-lg px-2.5 py-1.5 whitespace-nowrap">
            <div className="text-[11px] font-medium text-white/70 mb-0.5">{tip.d.fullLabel}</div>
            <div className="flex items-center gap-3 text-[11.5px] tabular-nums">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                {tip.b.enriched} enriched
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                {tip.b.notEnriched} not enriched
              </span>
              {tip.b.failed > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  {tip.b.failed} failed
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* X-axis labels, thinned by bucket count. */}
      <div className="flex mt-2">
        {bucketDefs.map((d, i) => {
          const show = shouldShowAxisLabel(i, bucketDefs.length, granularity);
          return (
            <div
              key={d.key}
              className="flex-1 text-[10px] text-text-tertiary tabular-nums text-center min-w-0"
            >
              {show ? d.shortLabel : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function shouldShowAxisLabel(i: number, total: number, g: Granularity): boolean {
  if (i === 0 || i === total - 1) return true;
  if (g === "month") return true;
  if (g === "week") return total <= 13 ? i % 2 === 0 : i % 4 === 0;
  if (g === "hour") return i % 4 === 0; // every 4h (00, 04, 08, 12, 16, 20, 23)
  // day
  if (total <= 14) return true;
  return i % 3 === 0;
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11.5px] text-text-secondary">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#22C55E]" />
        Enriched
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#94A3B8]" />
        Not enriched
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-[2px] bg-[#EF4444]" />
        Failed
      </span>
    </div>
  );
}

// ── Daily activity table (date-wise stats, click → drawer) ───────────────

interface DayGroup {
  key: string;
  label: string;
  dateSub: string;
  leads: RunRecord[];
  incoming: number;
  enriched: number;
  notEnriched: number;
  partial: number;
  failed: number;
  pushed: number;
}

type DateRange = "7d" | "14d" | "30d" | "all" | "custom";
const PAGE_SIZE = 10;

const COL_GRID = "grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_28px]";

function DailyActivityTable({ runs, onOpenRun }: { runs: RunRecord[]; onOpenRun: (r: RunRecord) => void }) {
  const allDays = useMemo<DayGroup[]>(() => buildDayGroups(runs), [runs]);
  const [range, setRange] = useState<DateRange>("14d");
  const [page, setPage] = useState(0);
  const [customFrom, setCustomFrom] = useState<string>(isoNDaysAgo(7));
  const [customTo, setCustomTo] = useState<string>(isoNDaysAgo(0));

  // Filter by range
  const filteredDays = useMemo(() => {
    if (range === "all") return allDays;
    if (range === "custom") {
      if (!customFrom || !customTo) return allDays;
      const from = new Date(customFrom).getTime();
      const to = new Date(customTo).getTime() + 86400000; // inclusive end day
      return allDays.filter((d) => {
        const [y, m, dd] = d.key.split("-").map(Number);
        const t = new Date(y, m - 1, dd).getTime();
        return t >= from && t < to;
      });
    }
    const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    const cutoff = Date.now() - days * 86400000;
    return allDays.filter((d) => {
      const [y, m, dd] = d.key.split("-").map(Number);
      return new Date(y, m - 1, dd).getTime() >= cutoff - 86400000;
    });
  }, [allDays, range, customFrom, customTo]);

  // Reset to first page whenever filters change
  useEffect(() => { setPage(0); }, [range, customFrom, customTo]);

  const total = filteredDays.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(total, pageStart + PAGE_SIZE);
  const pageDays = filteredDays.slice(pageStart, pageEnd);

  const [selected, setSelected] = useState<DayGroup | null>(null);

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h3 className="text-section-header text-text-primary">Daily activity</h3>
          <p className="text-[12px] text-text-tertiary mt-0.5">One row per day. Click a day to see every lead.</p>
        </div>
        <div className="flex items-center gap-2">
          <RangeChips value={range} onChange={setRange} />
          {range === "custom" && (
            <CustomDateInputs
              from={customFrom}
              to={customTo}
              onChange={(f, t) => { setCustomFrom(f); setCustomTo(t); }}
            />
          )}
          <button
            onClick={() => downloadCsv(filteredDays.flatMap((d) => d.leads), `crm-activity-${range}`)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-button bg-white transition-colors"
          >
            <Download size={12} strokeWidth={1.75} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Column header */}
        <div className={`grid ${COL_GRID} gap-3 px-4 h-9 items-center border-b border-border bg-surface-page text-[11px] font-medium uppercase tracking-wide text-text-tertiary`}>
          <div>Date</div>
          <div className="text-right">Incoming</div>
          <div className="text-right">Enriched</div>
          <div className="text-right" title="Lead processed but no public data found. Expected baseline.">Not enriched</div>
          <div className="text-right" title="System-side failures. Target is zero.">Failed</div>
          <div className="text-right">Pushed</div>
          <div className="text-right">Success</div>
          <div />
        </div>

        {total === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-text-tertiary">No CRM activity in this date range.</div>
        ) : pageDays.map((day) => {
          const successPct = day.incoming ? Math.round((day.enriched / day.incoming) * 100) : 0;
          return (
            <button
              key={day.key}
              onClick={() => setSelected(day)}
              className={`w-full text-left grid ${COL_GRID} gap-3 px-4 h-10 border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors items-center`}
            >
              <div className="text-[13px] font-medium text-text-primary tabular-nums">{day.dateSub}</div>
              <NumCell value={day.incoming} tone="neutral" />
              <NumCell value={day.enriched} tone="good" />
              <NumCell value={day.notEnriched} tone="neutral" />
              <NumCell value={day.failed} tone="bad" muted />
              <NumCell value={day.pushed} tone="info" />
              <div className="text-right text-[13px] font-medium text-text-secondary tabular-nums">{successPct}%</div>
              <ChevronRight size={14} strokeWidth={2} className="text-text-tertiary justify-self-end" />
            </button>
          );
        })}

        {/* Pagination footer */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 h-10 border-t border-border-subtle text-[12px] text-text-tertiary">
            <span className="tabular-nums">
              {total <= PAGE_SIZE
                ? `${total} day${total === 1 ? "" : "s"}`
                : `${(pageStart + 1).toLocaleString("en-IN")}–${pageEnd.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="tabular-nums">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => (pageEnd >= total ? p : p + 1))}
                  disabled={pageEnd >= total}
                  className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DayLeadsDrawer
        day={selected}
        onClose={() => setSelected(null)}
        onOpenRun={(r) => {
          setSelected(null);
          onOpenRun(r);
        }}
      />
    </section>
  );
}

function RangeChips({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const opts: { k: DateRange; label: string }[] = [
    { k: "7d",  label: "7d" },
    { k: "14d", label: "14d" },
    { k: "30d", label: "30d" },
    { k: "all", label: "All" },
    { k: "custom", label: "Custom" },
  ];
  return (
    <div className="inline-flex items-center bg-white border border-border rounded-input p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={[
            "h-7 px-2.5 text-[12px] font-medium rounded-[6px] transition-colors",
            o.k === value
              ? "bg-text-primary text-white"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomDateInputs({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 h-8 px-2 bg-white border border-border rounded-input">
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange(e.target.value, to)}
        className="text-[12px] bg-transparent text-text-primary focus:outline-none tabular-nums"
      />
      <span className="text-[11px] text-text-tertiary">to</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        max={isoNDaysAgo(0)}
        onChange={(e) => onChange(from, e.target.value)}
        className="text-[12px] bg-transparent text-text-primary focus:outline-none tabular-nums"
      />
    </div>
  );
}

function NumCell({ value, tone, muted }: { value: number; tone: "good" | "bad" | "warn" | "info" | "neutral"; muted?: boolean }) {
  if (muted && value === 0) {
    return <div className="text-right text-[13px] text-text-tertiary tabular-nums">—</div>;
  }
  const color =
    tone === "good" ? "text-[#15803D]" :
    tone === "bad"  ? "text-[#DC2626]" :
    tone === "warn" ? "text-[#B45309]" :
    tone === "info" ? "text-[#1D4ED8]" :
    "text-text-primary";
  return <div className={`text-right text-[13px] font-medium tabular-nums ${color}`}>{value.toLocaleString("en-IN")}</div>;
}

// ── Day leads drawer ─────────────────────────────────────────────────────

type StatusFilter = "any" | "enriched" | "not_enriched" | "failed" | "partial";
type ChannelFilter = "any" | CrmLeadChannel;

function DayLeadsDrawer({
  day,
  onClose,
  onOpenRun,
}: {
  day: DayGroup | null;
  onClose: () => void;
  onOpenRun: (r: RunRecord) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("any");
  const [channel, setChannel] = useState<ChannelFilter>("any");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  // Reset state whenever a new day opens
  useEffect(() => {
    if (day) {
      setQuery("");
      setStatus("any");
      setChannel("any");
      setPage(0);
    }
  }, [day]);

  // ESC to close
  useEffect(() => {
    if (!day) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [day, onClose]);

  const filtered = useMemo(() => {
    if (!day) return [];
    const q = query.trim().toLowerCase();
    return day.leads.filter((r) => {
      if (status === "enriched" && !(r.status === "done" && r.profile?.enrichment_status !== "Zero Enrichment")) return false;
      if (status === "not_enriched" && !(r.status === "done" && r.profile?.enrichment_status === "Zero Enrichment")) return false;
      if (status === "failed" && r.status !== "failed") return false;
      if (status === "partial" && r.profile?.enrichment_status !== "Partial Enrichment") return false;
      if (channel !== "any" && r.crmOrigin?.channel !== channel) return false;
      if (q) {
        const hay = `${r.profile?.contact?.name ?? ""} ${r.profile?.contact?.email ?? ""} ${r.profile?.contact?.phone ?? ""} ${r.crmOrigin?.recordId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [day, query, status, channel]);

  if (!mounted || !day) return null;

  const total = filtered.length;
  const pageStart = page * PAGE_SIZE;
  const pageEnd = Math.min(total, pageStart + PAGE_SIZE);
  const rows = filtered.slice(pageStart, pageEnd);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 w-[760px] max-w-[96vw] bg-white border-l border-border z-[70] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11.5px] text-text-tertiary uppercase tracking-wide font-medium">Daily detail</div>
            <h2 className="text-section-header text-text-primary mt-0.5 tabular-nums">{day.dateSub}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px]">
              <SummaryStat label="Incoming" value={day.incoming} tone="neutral" />
              <SummaryStat label="Enriched" value={day.enriched} tone="good" />
              <SummaryStat label="Not enriched" value={day.notEnriched} tone="neutral" />
              {day.failed > 0 && <SummaryStat label="Failed" value={day.failed} tone="bad" />}
              <SummaryStat label="Pushed" value={day.pushed} tone="info" />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Filters + export */}
        <div className="px-5 py-3 border-b border-border-subtle flex flex-wrap items-center gap-2 bg-surface-page/30">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search size={12} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search name, email, phone, ID…"
              className="h-8 pl-7 pr-3 w-full text-[12px] border border-border rounded-input bg-white placeholder:text-text-tertiary focus:outline-none focus:border-text-secondary"
            />
          </div>
          <Select
            value={status}
            onChange={(v) => { setStatus(v as StatusFilter); setPage(0); }}
            options={[
              { value: "any", label: "Any status" },
              { value: "enriched", label: "Enriched" },
              { value: "partial", label: "Partial" },
              { value: "not_enriched", label: "Not enriched" },
              { value: "failed", label: "Failed" },
            ]}
          />
          <Select
            value={channel}
            onChange={(v) => { setChannel(v as ChannelFilter); setPage(0); }}
            options={[
              { value: "any", label: "Any source" },
              { value: "Web form", label: "Web form" },
              { value: "API", label: "API" },
              { value: "Salesforce", label: "Salesforce" },
              { value: "Chat", label: "Chat" },
              { value: "Import", label: "Import" },
            ]}
          />
          <div className="flex-1" />
          <button
            onClick={() => downloadCsv(filtered, `crm-${day.key}`)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-white bg-text-primary hover:bg-accent-hover rounded-button transition-colors"
          >
            <Download size={12} strokeWidth={1.75} />
            Download {total.toLocaleString("en-IN")} leads
          </button>
        </div>

        {/* Lead table */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-[80px_minmax(220px,1fr)_140px_170px_110px] gap-3 px-5 py-2 border-b border-border-subtle bg-white sticky top-0 text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary">
            <div>Time</div>
            <div>Lead</div>
            <div title="Where the lead first landed before reaching your CRM (Web form, API, native CRM entry, Chat, Import).">Lead origin</div>
            <div>Enrichment type</div>
            <div>Status</div>
          </div>
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-[13px] text-text-tertiary">No leads match these filters.</div>
          ) : rows.map((r) => (
            <button
              key={r.id}
              onClick={() => onOpenRun(r)}
              className="w-full text-left grid grid-cols-[80px_minmax(220px,1fr)_140px_170px_110px] gap-3 px-5 py-2.5 border-b border-border-subtle last:border-b-0 hover:bg-surface-page transition-colors items-center"
            >
              <div className="text-[12px] text-text-secondary tabular-nums">{timeOnly(r.startedAt)}</div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary truncate">{r.profile?.contact?.name ?? "—"}</div>
                <div className="text-[11px] text-text-tertiary truncate">{r.profile?.contact?.email ?? r.profile?.contact?.phone ?? "—"}</div>
              </div>
              <div className="text-[12px] text-text-secondary truncate">{r.crmOrigin?.channel ?? "—"}</div>
              <div><TypePill types={r.types} /></div>
              <div><StatusPill run={r} /></div>
            </button>
          ))}
        </div>

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-[12px] text-text-tertiary bg-white">
          <span>
            {total === 0
              ? "0 leads"
              : `Showing ${(pageStart + 1).toLocaleString("en-IN")}–${pageEnd.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}`}
          </span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">Page {page + 1} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => (pageEnd >= total ? p : p + 1))}
              disabled={pageEnd >= total}
              className="h-7 px-2.5 border border-border rounded-button bg-white disabled:opacity-40 hover:text-text-primary transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "good" | "bad" | "warn" | "info" | "neutral" }) {
  const color =
    tone === "good" ? "text-[#15803D]" :
    tone === "bad"  ? "text-[#DC2626]" :
    tone === "warn" ? "text-[#B45309]" :
    tone === "info" ? "text-[#1D4ED8]" :
    "text-text-primary";
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-semibold tabular-nums ${color}`}>{value.toLocaleString("en-IN")}</span>
      <span className="text-text-tertiary">{label}</span>
    </span>
  );
}

// ── small bits ────────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-text-secondary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function TypePill({ types }: { types: RunRecord["types"] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  return (
    <div className="flex flex-wrap gap-1">
      {hasPro && (
        <span className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
          Professional
        </span>
      )}
      {hasFin && (
        <span className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded-badge bg-[#F5F3FF] text-[#6D28D9]">
          Financial
        </span>
      )}
    </div>
  );
}

function StatusPill({ run }: { run: RunRecord }) {
  if (run.status === "failed") {
    return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FEF2F2] text-[#DC2626]">Failed</span>;
  }
  if (run.profile?.enrichment_status === "Zero Enrichment") {
    return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">Not enriched</span>;
  }
  if (run.profile?.enrichment_status === "Partial Enrichment") {
    return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FFFBEB] text-[#B45309]">Partial</span>;
  }
  return <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">Enriched</span>;
}

// ── helpers ───────────────────────────────────────────────────────────────

function windowMs(w: Window): number | null {
  const DAY = 86_400_000;
  switch (w) {
    case "today": return DAY;
    case "7d":    return 7 * DAY;
    case "30d":   return 30 * DAY;
    case "90d":   return 90 * DAY;
    case "6m":    return 182 * DAY;
    case "1y":    return 365 * DAY;
    case "all":   return null;
  }
}

function windowLabel(w: Window): string {
  switch (w) {
    case "today": return "Today";
    case "7d":    return "Last 7 days";
    case "30d":   return "Last 30 days";
    case "90d":   return "Last 90 days";
    case "6m":    return "Last 6 months";
    case "1y":    return "Last 12 months";
    case "all":   return "All time";
  }
}

function granularityFor(w: Window): Granularity {
  if (w === "today") return "hour";
  if (w === "7d" || w === "30d") return "day";
  if (w === "90d" || w === "6m") return "week";
  return "month";
}

function bucketCountFor(w: Window): number {
  switch (w) {
    case "today": return 24;   // hours
    case "7d":    return 7;
    case "30d":   return 30;
    case "90d":   return 13;   // weeks
    case "6m":    return 26;   // weeks
    case "1y":    return 12;   // months
    case "all":   return 36;   // months (3-year history)
  }
}

function bucketKey(date: Date, g: Granularity): string {
  if (g === "hour") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    return `${y}-${m}-${d}T${h}`;
  }
  if (g === "day") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (g === "week") {
    // Anchor to Monday-week start.
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildBuckets(w: Window): { key: string; shortLabel: string; fullLabel: string }[] {
  const g = granularityFor(w);
  const n = bucketCountFor(w);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { key: string; shortLabel: string; fullLabel: string }[] = [];

  if (g === "hour") {
    // 24 buckets, midnight (00:00) → 23:00 of "today".
    const dateStamp = `${today.getDate()} ${MONTHS[today.getMonth()]}`;
    for (let h = 0; h < n; h++) {
      const d = new Date(today.getTime() + h * 3_600_000);
      const hh = String(d.getHours()).padStart(2, "0");
      out.push({
        key: bucketKey(d, "hour"),
        shortLabel: `${hh}:00`,
        fullLabel: `${dateStamp}, ${hh}:00`,
      });
    }
    return out;
  }

  if (g === "day") {
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86_400_000);
      const isToday = i === 0;
      const isYesterday = i === 1;
      out.push({
        key: bucketKey(d, "day"),
        shortLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        fullLabel: isToday
          ? `Today, ${d.getDate()} ${MONTHS[d.getMonth()]}`
          : isYesterday
            ? `Yesterday, ${d.getDate()} ${MONTHS[d.getMonth()]}`
            : `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`,
      });
    }
    return out;
  }

  if (g === "week") {
    // Find this week's Monday.
    const wkStart = new Date(today);
    const dow = wkStart.getDay();
    wkStart.setDate(wkStart.getDate() + (dow === 0 ? -6 : 1 - dow));
    for (let i = n - 1; i >= 0; i--) {
      const ws = new Date(wkStart.getTime() - i * 7 * 86_400_000);
      const we = new Date(ws.getTime() + 6 * 86_400_000);
      out.push({
        key: bucketKey(ws, "week"),
        shortLabel: `${ws.getDate()}/${ws.getMonth() + 1}`,
        fullLabel: `Week of ${ws.getDate()} ${MONTHS[ws.getMonth()]} – ${we.getDate()} ${MONTHS[we.getMonth()]}`,
      });
    }
    return out;
  }

  // month
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({
      key: bucketKey(m, "month"),
      shortLabel: MONTHS[m.getMonth()],
      fullLabel: `${MONTHS[m.getMonth()]} ${m.getFullYear()}`,
    });
  }
  return out;
}

function pct(part: number, total: number): string {
  if (!total) return "0";
  return Math.round((part / total) * 100).toString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function isoNDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function timeOnly(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayHeading(k: string): string {
  const [y, m, d] = k.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return WEEKDAYS[date.getDay()];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function daySubLabel(k: string): string {
  const [y, m, d] = k.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function buildDayGroups(runs: RunRecord[]): DayGroup[] {
  const map = new Map<string, RunRecord[]>();
  runs.forEach((r) => {
    const k = dayKey(r.startedAt);
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  });
  const out: DayGroup[] = [];
  Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .forEach(([k, leads]) => {
      leads.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      const enriched = leads.filter(
        (r) => r.status === "done" && r.profile?.enrichment_status !== "Zero Enrichment",
      ).length;
      const notEnriched = leads.filter(
        (r) => r.status === "done" && r.profile?.enrichment_status === "Zero Enrichment",
      ).length;
      const partial = leads.filter((r) => r.profile?.enrichment_status === "Partial Enrichment").length;
      const failed = leads.filter((r) => r.status === "failed").length;
      const pushed = leads.filter((r) => r.crmSync?.status === "synced").length;
      out.push({
        key: k,
        label: dayHeading(k),
        dateSub: daySubLabel(k),
        leads,
        incoming: leads.length,
        enriched,
        notEnriched,
        partial,
        failed,
        pushed,
      });
    });
  return out;
}

function downloadCsv(runs: RunRecord[], stem: string) {
  const header = ["Entered", "Name", "Email", "Phone", "Source", "Type", "Status", "CRM Record ID", "CRM URL"];
  const rows = runs.map((r) => [
    r.startedAt,
    r.profile?.contact?.name ?? "",
    r.profile?.contact?.email ?? "",
    r.profile?.contact?.phone ?? "",
    r.crmOrigin?.channel ?? "",
    r.types.join("+"),
    r.status === "failed"
      ? "Failed"
      : r.profile?.enrichment_status === "Zero Enrichment"
        ? "Not enriched"
        : r.profile?.enrichment_status === "Partial Enrichment"
          ? "Partial"
          : "Enriched",
    r.crmOrigin?.recordId ?? "",
    r.crmOrigin?.recordUrl ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${stem}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
