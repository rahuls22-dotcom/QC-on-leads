"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface DateRangeSelectorProps {
  compact?: boolean;
  onChange?: (preset: string) => void;
  // Initial preset to display. Defaults to "30" (Last 30 days) for back-compat
  // with existing dashboards; pages that want a different opening view (e.g.
  // outreach landing → last 7 days) pass it explicitly.
  defaultPreset?: string;
}

const presets = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Today and yesterday", value: "2d" },
  { label: "This week", value: "thisweek" },
  { label: "Last week", value: "lastweek" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 14 days", value: "14" },
  { label: "Last 30 days", value: "30" },
  { label: "This month", value: "thismonth" },
  { label: "Last month", value: "lastmonth" },
  { label: "Lifetime", value: "lifetime" },
];

type CompareMode = "previous" | "previous_year" | "custom";

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function formatDate(d: Date) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function formatDateShort(d: Date) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }

function getPresetRange(value: string): { start: Date; end: Date; label: string } {
  const now = new Date(2026, 2, 23);
  const end = new Date(now);
  const start = new Date(now);
  switch (value) {
    case "today": return { start: now, end: now, label: "Today" };
    case "yesterday": start.setDate(start.getDate() - 1); return { start, end: new Date(start), label: "Yesterday" };
    case "2d": start.setDate(start.getDate() - 1); return { start, end, label: "Today and yesterday" };
    case "thisweek": start.setDate(start.getDate() - start.getDay()); return { start, end, label: "This week" };
    case "lastweek": { const s = new Date(now); s.setDate(s.getDate() - s.getDay() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); return { start: s, end: e, label: "Last week" }; }
    case "7": start.setDate(start.getDate() - 6); return { start, end, label: "Last 7 days" };
    case "14": start.setDate(start.getDate() - 13); return { start, end, label: "Last 14 days" };
    case "30": start.setDate(start.getDate() - 29); return { start, end, label: "Last 30 days" };
    case "thismonth": start.setDate(1); return { start, end, label: "This month" };
    case "lastmonth": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { start: s, end: e, label: "Last month" }; }
    case "lifetime": return { start: new Date(2026, 0, 1), end, label: "Lifetime" };
    default: start.setDate(start.getDate() - 29); return { start, end, label: "Last 30 days" };
  }
}

// ── Reusable Calendar Grid ──────────────────────────────────
function CalendarGrid({ month, year, onNav, onDateClick, onHover, isInRange, isStartFn, isEndFn }: {
  month: number; year: number;
  onNav: (dir: number) => void;
  onDateClick: (d: Date) => void;
  onHover: (d: Date) => void;
  isInRange: (d: Date) => boolean;
  isStartFn: (d: Date) => boolean;
  isEndFn: (d: Date) => boolean;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const calDays: { day: number; inMonth: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) calDays.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  for (let d = 1; d <= daysInMonth; d++) calDays.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  const remaining = 42 - calDays.length;
  for (let d = 1; d <= remaining; d++) calDays.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onNav(-1)} className="p-1 hover:bg-surface-page rounded text-text-secondary"><ChevronLeft size={14} strokeWidth={1.5} /></button>
        <span className="text-[12px] font-medium text-text-primary">{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => onNav(1)} className="p-1 hover:bg-surface-page rounded text-text-secondary"><ChevronRight size={14} strokeWidth={1.5} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAY_LABELS.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-[10px] font-medium text-text-tertiary">{d}</div>
        ))}
        {calDays.map((cd, i) => {
          const inR = isInRange(cd.date);
          const start = isStartFn(cd.date);
          const end = isEndFn(cd.date);
          return (
            <button key={i} onClick={() => onDateClick(cd.date)} onMouseEnter={() => onHover(cd.date)}
              className={`h-7 flex items-center justify-center text-[11px] transition-colors rounded-[4px] ${
                !cd.inMonth ? "text-text-tertiary/40" :
                start || end ? "bg-accent text-white font-medium" :
                inR ? "bg-surface-secondary text-text-primary" :
                "text-text-primary hover:bg-surface-page"
              }`}>
              {cd.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export function DateRangeSelector({ compact, onChange, defaultPreset = "30" }: DateRangeSelectorProps) {
  const [selected, setSelected] = useState(defaultPreset);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Primary calendar
  const [calMonth, setCalMonth] = useState(2);
  const [calYear, setCalYear] = useState(2026);
  const [selStart, setSelStart] = useState<Date | null>(null);
  const [selEnd, setSelEnd] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Comparison
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [compareMode, setCompareMode] = useState<CompareMode>("previous");
  const [compCalMonth, setCompCalMonth] = useState(1); // Feb
  const [compCalYear, setCompCalYear] = useState(2026);
  const [compSelStart, setCompSelStart] = useState<Date | null>(null);
  const [compSelEnd, setCompSelEnd] = useState<Date | null>(null);
  const [compHovered, setCompHovered] = useState<Date | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const range = getPresetRange(selected);

  // Comparison ranges
  const duration = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(range.start); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - duration + 1);
  const yearStart = new Date(range.start); yearStart.setFullYear(yearStart.getFullYear() - 1);
  const yearEnd = new Date(range.end); yearEnd.setFullYear(yearEnd.getFullYear() - 1);

  function getComparisonText() {
    if (!compareEnabled) return null;
    if (compareMode === "previous") return `vs ${formatDateShort(prevStart)} – ${formatDateShort(prevEnd)} (Previous period)`;
    if (compareMode === "previous_year") return `vs ${formatDate(yearStart)} – ${formatDate(yearEnd)} (Previous year)`;
    if (compareMode === "custom" && compSelStart && compSelEnd) return `vs ${formatDateShort(compSelStart)} – ${formatDateShort(compSelEnd)} (Custom)`;
    if (compareMode === "custom") return "vs Custom (select dates)";
    return null;
  }

  // Primary handlers
  const handlePresetClick = (value: string) => { setSelected(value); setSelStart(null); setSelEnd(null); setOpen(false); onChange?.(value); };

  const handleDateClick = (d: Date) => {
    if (!selStart || (selStart && selEnd)) { setSelStart(d); setSelEnd(null); }
    else { if (d < selStart) { setSelEnd(selStart); setSelStart(d); } else setSelEnd(d); setSelected("custom"); }
  };

  const isInRange = (d: Date) => {
    if (selStart && selEnd) return d >= selStart && d <= selEnd;
    if (selStart && hoveredDate) { const min = selStart < hoveredDate ? selStart : hoveredDate; const max = selStart < hoveredDate ? hoveredDate : selStart; return d >= min && d <= max; }
    return false;
  };
  const isStart = (d: Date) => !!(selStart && d.toDateString() === selStart.toDateString());
  const isEnd = (d: Date) => !!(selEnd && d.toDateString() === selEnd.toDateString());

  // Comparison custom handlers
  const handleCompDateClick = (d: Date) => {
    if (!compSelStart || (compSelStart && compSelEnd)) { setCompSelStart(d); setCompSelEnd(null); }
    else { if (d < compSelStart) { setCompSelEnd(compSelStart); setCompSelStart(d); } else setCompSelEnd(d); }
  };
  const compIsInRange = (d: Date) => {
    if (compSelStart && compSelEnd) return d >= compSelStart && d <= compSelEnd;
    if (compSelStart && compHovered) { const min = compSelStart < compHovered ? compSelStart : compHovered; const max = compSelStart < compHovered ? compHovered : compSelStart; return d >= min && d <= max; }
    return false;
  };
  const compIsStart = (d: Date) => !!(compSelStart && d.toDateString() === compSelStart.toDateString());
  const compIsEnd = (d: Date) => !!(compSelEnd && d.toDateString() === compSelEnd.toDateString());

  const navMonth = (dir: number) => {
    let m = calMonth + dir, y = calYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  };
  const navCompMonth = (dir: number) => {
    let m = compCalMonth + dir, y = compCalYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCompCalMonth(m); setCompCalYear(y);
  };

  const displayRange = selected === "custom" && selStart && selEnd
    ? `${formatDate(selStart)} – ${formatDate(selEnd)}`
    : `${formatDate(range.start)} – ${formatDate(range.end)}`;

  const compText = getComparisonText();

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 bg-white border border-border rounded-input text-[13px] text-text-primary hover:border-border-hover transition-colors duration-150">
        <Calendar size={14} strokeWidth={1.5} className="text-text-tertiary" />
        <span className="text-[12px]">{displayRange}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {!compact && compText && (
        <div className="text-[12px] text-text-secondary mt-1 text-right">{compText}</div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 bg-white border border-border rounded-card shadow-lg z-30 flex overflow-hidden">
          {/* Presets */}
          <div className="w-[155px] border-r border-border-subtle py-2 max-h-[460px] overflow-y-auto">
            {presets.map((p) => (
              <button key={p.value} onClick={() => handlePresetClick(p.value)}
                className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                  selected === p.value ? "text-text-primary font-medium bg-surface-secondary" : "text-text-secondary hover:bg-surface-page"
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Right Column: Calendar + Compare */}
          <div className="w-[280px]">
            {/* Primary Calendar */}
            <div className="p-3 pb-2">
              <CalendarGrid month={calMonth} year={calYear} onNav={navMonth}
                onDateClick={handleDateClick} onHover={setHoveredDate}
                isInRange={isInRange} isStartFn={isStart} isEndFn={isEnd} />
            </div>

            {/* Compare Section */}
            <div className="border-t border-border-subtle px-3 py-2.5">
              {/* Toggle */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-text-secondary">Compare</span>
                <button onClick={() => setCompareEnabled(!compareEnabled)}
                  className={`relative w-8 h-[18px] rounded-full transition-colors duration-150 ${compareEnabled ? "bg-accent" : "bg-silver-light"}`}>
                  <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-transform duration-150 ${compareEnabled ? "translate-x-[14px]" : "translate-x-0"}`} />
                </button>
              </div>

              {compareEnabled && (
                <div className="space-y-1">
                  {([
                    { value: "previous" as CompareMode, label: "Previous period", desc: `${formatDateShort(prevStart)} – ${formatDateShort(prevEnd)}` },
                    { value: "previous_year" as CompareMode, label: "Previous year", desc: `${formatDateShort(yearStart)} – ${formatDateShort(yearEnd)}, ${yearEnd.getFullYear()}` },
                    { value: "custom" as CompareMode, label: "Custom", desc: compSelStart && compSelEnd ? `${formatDateShort(compSelStart)} – ${formatDateShort(compSelEnd)}` : "Select dates" },
                  ]).map((opt) => (
                    <label key={opt.value}
                      className={`flex items-start gap-2 px-2 py-1.5 rounded-[4px] cursor-pointer transition-colors ${
                        compareMode === opt.value ? "bg-surface-secondary" : "hover:bg-surface-page"
                      }`}>
                      <input type="radio" name="compare" checked={compareMode === opt.value}
                        onChange={() => setCompareMode(opt.value)}
                        className="mt-0.5 w-3 h-3 accent-accent" />
                      <div>
                        <div className="text-[11px] font-medium text-text-primary">{opt.label}</div>
                        <div className="text-[10px] text-text-tertiary">{opt.desc}</div>
                      </div>
                    </label>
                  ))}

                  {/* Custom comparison calendar */}
                  {compareMode === "custom" && (
                    <div className="mt-2 pt-2 border-t border-border-subtle">
                      <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px] mb-1.5">Comparison period</div>
                      <CalendarGrid month={compCalMonth} year={compCalYear} onNav={navCompMonth}
                        onDateClick={handleCompDateClick} onHover={setCompHovered}
                        isInRange={compIsInRange} isStartFn={compIsStart} isEndFn={compIsEnd} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-border-subtle">
              <span className="text-[10px] text-text-tertiary max-w-[140px] truncate">
                {selStart && !selEnd ? formatDateShort(selStart) + " – ..." :
                 selStart && selEnd ? `${formatDateShort(selStart)} – ${formatDateShort(selEnd)}` :
                 `${formatDateShort(range.start)} – ${formatDateShort(range.end)}`}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setSelStart(null); setSelEnd(null); setCompSelStart(null); setCompSelEnd(null); setOpen(false); }}
                  className="h-7 px-3 text-[11px] text-text-secondary hover:text-text-primary">Cancel</button>
                <button onClick={() => setOpen(false)}
                  className="h-7 px-3 bg-accent text-white text-[11px] font-medium rounded-button hover:bg-accent-hover">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
