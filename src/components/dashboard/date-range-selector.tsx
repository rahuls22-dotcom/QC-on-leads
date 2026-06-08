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

// Compute the immediately-preceding window of the same length. Used to anchor
// every trend chip across the app — when the user picks "Last 7 days" the
// previous 7 days become the baseline, "Last 30 days" → previous 30 days,
// "Last month" → the month before. The user previously had a Compare toggle
// to flip between Previous period / Previous year / Custom, but it added
// confusion without enough value — we now always compare to the most-natural
// baseline and surface its date range explicitly so there's no ambiguity.
export function getComparisonRange(value: string): { start: Date; end: Date; label: string } {
  const range = getPresetRange(value);
  const durationDays = Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevEnd = new Date(range.start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - durationDays + 1);
  return {
    start: prevStart,
    end: prevEnd,
    label: `${formatDateShort(prevStart)} – ${formatDateShort(prevEnd)}`,
  };
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

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const range = getPresetRange(selected);
  // Comparison is always the same-duration window immediately preceding the
  // selected range. Spelling it out under the trigger removes the guesswork:
  // when the user reads a green/red trend chip on a widget below, they know
  // exactly which baseline it's compared against.
  const comparison = getComparisonRange(selected);

  // Primary handlers
  const handlePresetClick = (value: string) => { setSelected(value); setSelStart(null); setSelEnd(null); setOpen(false); onChange?.(value); };

  // Clicking a date in the calendar applies immediately once the user picks
  // both ends of the range — no need for an Update button to "confirm".
  // The earlier flow had Cancel/Update buttons that didn't earn their place:
  // - presets already auto-applied, making the buttons silent for that path
  // - Update on a custom range was the only place they did anything, and
  //   even there an extra click felt like a tax on the user
  // So we treat custom ranges like presets: as soon as the second date is
  // picked, fire onChange and close the dropdown. Mid-selection (only start
  // picked) the popover stays open; clicking outside dismisses without
  // committing — which is the same affordance the rest of the app uses.
  const handleDateClick = (d: Date) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d);
      setSelEnd(null);
      return;
    }
    // Second click — normalise so start <= end then commit + close.
    const start = d < selStart ? d : selStart;
    const end   = d < selStart ? selStart : d;
    setSelStart(start);
    setSelEnd(end);
    setSelected("custom");
    setOpen(false);
    onChange?.("custom");
  };

  const isInRange = (d: Date) => {
    if (selStart && selEnd) return d >= selStart && d <= selEnd;
    if (selStart && hoveredDate) { const min = selStart < hoveredDate ? selStart : hoveredDate; const max = selStart < hoveredDate ? hoveredDate : selStart; return d >= min && d <= max; }
    return false;
  };
  const isStart = (d: Date) => !!(selStart && d.toDateString() === selStart.toDateString());
  const isEnd = (d: Date) => !!(selEnd && d.toDateString() === selEnd.toDateString());

  const navMonth = (dir: number) => {
    let m = calMonth + dir, y = calYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  };

  const displayRange = selected === "custom" && selStart && selEnd
    ? `${formatDate(selStart)} – ${formatDate(selEnd)}`
    : `${formatDate(range.start)} – ${formatDate(range.end)}`;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 bg-white border border-border rounded-input text-[13px] text-text-primary hover:border-border-hover transition-colors duration-150">
        <Calendar size={14} strokeWidth={1.5} className="text-text-tertiary" />
        <span className="text-[12px]">{displayRange}</span>
        <ChevronDown size={14} strokeWidth={1.5} className={`text-text-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Comparison anchor — spelled out so the trend chips on the widgets
          below this filter aren't ambiguous. The Compare toggle used to live
          inside the dropdown and let the user flip between Previous period /
          Previous year / Custom; that added complexity without much value,
          so it's gone and "vs the previous [N] days/month" is now the
          single, always-on baseline. */}
      {!compact && (
        <div className="text-[11.5px] text-text-tertiary mt-1 text-right tabular-nums">
          vs {comparison.label}
        </div>
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

          {/* Right Column: Calendar + Comparison readout */}
          <div className="w-[280px]">
            {/* Primary Calendar */}
            <div className="p-3 pb-2">
              <CalendarGrid month={calMonth} year={calYear} onNav={navMonth}
                onDateClick={handleDateClick} onHover={setHoveredDate}
                isInRange={isInRange} isStartFn={isStart} isEndFn={isEnd} />
            </div>

            {/* The dropdown is now pure date selection — no Compare toggle,
                no Compared-to readout, no Cancel/Update footer. Comparison
                info lives on the trigger label ("vs DD MMM – DD MMM") and
                on each widget's trend chip; repeating it inside the modal
                was just noise. Presets apply on click, custom ranges apply
                on the second date pick, and clicking outside dismisses. */}
            {selStart && !selEnd && (
              <div className="border-t border-border-subtle px-3 py-2 text-[10.5px] text-text-tertiary bg-surface-page/40">
                Pick an end date to apply, or click outside to cancel.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
