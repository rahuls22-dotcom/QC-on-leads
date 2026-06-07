"use client";

// Custom date range popover. Same calendar visuals as the global dashboard
// date-range-selector, trimmed to a single calendar + apply/cancel, no
// compare period UI. Anchors to its trigger button (positioned by caller).

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtFull(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  /** Open state controlled by parent. */
  open: boolean;
  onClose: () => void;
  /** Initial selected range; null = nothing selected yet. */
  initialStart: Date | null;
  initialEnd: Date | null;
  /** Called on Apply with the chosen range. */
  onApply: (start: Date, end: Date) => void;
  /** Optional anchor className override for positioning. Default: top-full right-0 mt-1. */
  anchorClass?: string;
}

export function DateRangePopover({
  open,
  onClose,
  initialStart,
  initialEnd,
  onApply,
  anchorClass = "absolute z-40 top-full right-0 mt-1",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [calMonth, setCalMonth] = useState(initialStart ? initialStart.getMonth() : now.getMonth());
  const [calYear,  setCalYear]  = useState(initialStart ? initialStart.getFullYear() : now.getFullYear());

  const [selStart, setSelStart] = useState<Date | null>(initialStart);
  const [selEnd,   setSelEnd]   = useState<Date | null>(initialEnd);
  const [hovered,  setHovered]  = useState<Date | null>(null);

  // Reset selection state every time the popover opens.
  useEffect(() => {
    if (open) {
      setSelStart(initialStart);
      setSelEnd(initialEnd);
      if (initialStart) {
        setCalMonth(initialStart.getMonth());
        setCalYear(initialStart.getFullYear());
      }
    }
  }, [open, initialStart, initialEnd]);

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleDateClick = (d: Date) => {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d);
      setSelEnd(null);
      return;
    }
    if (d < selStart) {
      setSelEnd(selStart);
      setSelStart(d);
    } else {
      setSelEnd(d);
    }
  };

  const isInRange = (d: Date) => {
    if (selStart && selEnd) return d >= selStart && d <= selEnd;
    if (selStart && hovered) {
      const min = selStart < hovered ? selStart : hovered;
      const max = selStart < hovered ? hovered : selStart;
      return d >= min && d <= max;
    }
    return false;
  };
  const isStart = (d: Date) => !!(selStart && d.toDateString() === selStart.toDateString());
  const isEnd   = (d: Date) => !!(selEnd && d.toDateString() === selEnd.toDateString());

  const navMonth = (dir: number) => {
    let m = calMonth + dir;
    let y = calYear;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  const canApply = !!(selStart && selEnd);

  const applyShortcut = (days: number) => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    setSelStart(start);
    setSelEnd(end);
    setCalMonth(start.getMonth());
    setCalYear(start.getFullYear());
  };

  return (
    <div
      ref={ref}
      className={`${anchorClass} bg-white border border-border rounded-card shadow-[0_8px_24px_rgba(15,15,15,0.10)] overflow-hidden`}
    >
      <div className="flex">
        {/* Preset shortcuts */}
        <div className="w-[120px] border-r border-border-subtle py-2">
          {[
            { l: "Last 7 days",  d: 7 },
            { l: "Last 14 days", d: 14 },
            { l: "Last 30 days", d: 30 },
            { l: "Last 90 days", d: 90 },
          ].map((s) => (
            <button
              key={s.d}
              onClick={() => applyShortcut(s.d)}
              className="w-full text-left px-3 py-1.5 text-[11.5px] text-text-secondary hover:bg-surface-page hover:text-text-primary transition-colors"
            >
              {s.l}
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="w-[260px] p-3">
          <CalendarGrid
            month={calMonth}
            year={calYear}
            onNav={navMonth}
            onDateClick={handleDateClick}
            onHover={setHovered}
            isInRange={isInRange}
            isStartFn={isStart}
            isEndFn={isEnd}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-border-subtle bg-surface-page/40">
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {selStart && selEnd
            ? `${fmtShort(selStart)} – ${fmtShort(selEnd)}`
            : selStart
              ? `${fmtShort(selStart)} – …`
              : "Pick a start date"}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelStart(null);
              setSelEnd(null);
              onClose();
            }}
            className="h-7 px-3 text-[11px] font-medium text-text-secondary hover:text-text-primary rounded-button transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!canApply}
            onClick={() => {
              if (selStart && selEnd) onApply(selStart, selEnd);
            }}
            className="h-7 px-3 bg-text-primary text-white text-[11px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar grid (range-aware) ──────────────────────────────────────────

function CalendarGrid({
  month, year, onNav, onDateClick, onHover, isInRange, isStartFn, isEndFn,
}: {
  month: number;
  year: number;
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
  for (let i = firstDay - 1; i >= 0; i--) {
    calDays.push({ day: prevMonthDays - i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calDays.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - calDays.length;
  for (let d = 1; d <= remaining; d++) {
    calDays.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => onNav(-1)}
          className="p-1 hover:bg-surface-page rounded text-text-secondary"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </button>
        <span className="text-[12px] font-medium text-text-primary">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => onNav(1)}
          className="p-1 hover:bg-surface-page rounded text-text-secondary"
          aria-label="Next month"
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAY_LABELS.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-[10px] font-medium text-text-tertiary">
            {d}
          </div>
        ))}
        {calDays.map((cd, i) => {
          const inR = isInRange(cd.date);
          const start = isStartFn(cd.date);
          const end = isEndFn(cd.date);
          return (
            <button
              key={i}
              onClick={() => onDateClick(cd.date)}
              onMouseEnter={() => onHover(cd.date)}
              className={[
                "h-7 flex items-center justify-center text-[11px] transition-colors rounded-[4px]",
                !cd.inMonth
                  ? "text-text-tertiary/40"
                  : start || end
                    ? "bg-text-primary text-white font-medium"
                    : inR
                      ? "bg-surface-secondary text-text-primary"
                      : "text-text-primary hover:bg-surface-page",
              ].join(" ")}
            >
              {cd.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatRangeLabel(start: Date, end: Date): string {
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
    return fmtFull(start);
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmtShort(start)} – ${fmtShort(end)}`;
  }
  return `${fmtFull(start)} – ${fmtFull(end)}`;
}
