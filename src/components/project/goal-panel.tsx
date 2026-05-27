"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Settings, Target, Sparkles, ChevronDown, Edit3 } from "lucide-react";
import { ProjectDetail } from "@/lib/project-data";
import { PacePill } from "./shared/pace-pill";
import { GoalEditor } from "./goal-editor";

/**
 * Compact goal strip — slim band that sits below the project hero on every
 * tab. Full detail (Spot's read, plan-to-close-gap, secondary metrics) lives
 * inside a popover triggered from the right-hand chevron, so the working
 * surface below is not pushed off-screen.
 */
export function GoalPanel({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const { goal, secondary } = project;
  const [editing, setEditing] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Force a re-render after a goal save so the strip reads the freshly-mutated goal.
  const [, forceTick] = useState(0);

  // Close popover on outside click.
  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen]);

  const goalSet = goal.target > 0;

  // ─── Empty state — slim prompt strip ────────────────────────────────
  if (!goalSet) {
    return (
      <div className="card-base mb-4" style={{ padding: "10px 14px" }}>
        {editing ? (
          <GoalEditor
            project={project}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              forceTick((t) => t + 1);
            }}
            compact
          />
        ) : (
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, #F4ECFF 0%, #FDF2FF 100%)",
                color: "#7C3AED",
              }}
            >
              <Target size={14} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight">
                No goal set yet
              </div>
              <div className="text-[11px] text-text-tertiary leading-[1.4]">
                Set a target to track pace and forecast the gap.
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAsk("Help me decide what goal to set for this project")}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary"
            >
              <Sparkles size={10} /> Ask Spot
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="apply-btn"
              style={{
                height: 28,
                fontSize: 12,
                padding: "0 12px",
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              }}
            >
              <Target size={11} /> Set goal
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Normal state — compact strip ────────────────────────────────────
  const pct = Math.round((goal.achieved / goal.target) * 100);
  const expectedPct = goal.daysTotal
    ? Math.round((goal.daysElapsed / goal.daysTotal) * 100)
    : 0;
  const forecastPct = Math.round((goal.forecast / goal.target) * 100);
  const expectedCount = Math.round((goal.target * expectedPct) / 100);

  return (
    <div className="card-base mb-4 relative" style={{ padding: "10px 14px" }}>
      {editing ? (
        <GoalEditor
          project={project}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            forceTick((t) => t + 1);
          }}
          compact
        />
      ) : (
        <div className="flex items-center gap-3">
          {/* Goal label + pace */}
          <div className="flex flex-col gap-0.5 flex-shrink-0" style={{ minWidth: 140 }}>
            <div className="flex items-center gap-1.5">
              <span className="uplabel" style={{ fontSize: 9.5 }}>
                Goal · {goal.kind}
              </span>
              <PacePill pace={goal.pace} delta={goal.paceDelta} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="tabular-nums"
                style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.01em" }}
              >
                {goal.achieved}
              </span>
              <span className="text-[12px] text-text-secondary">/ {goal.target}</span>
            </div>
          </div>

          {/* Three-segment progress bar with markers for expected & forecast */}
          <div className="flex-1 min-w-0">
            <TripleStrip pct={pct} expectedPct={expectedPct} forecastPct={forecastPct} />
            <div className="flex items-center justify-between text-[10.5px] text-text-tertiary mt-1 tabular-nums">
              <span>{pct}% achieved</span>
              <span>
                exp {expectedCount} · fcst {goal.forecast}
              </span>
              <span>
                day {goal.daysElapsed}/{goal.daysTotal}
              </span>
            </div>
          </div>

          {/* Right-side actions */}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center justify-center h-7 w-7 rounded-button border border-border bg-white hover:border-border-hover text-text-tertiary hover:text-text-secondary"
            title="Edit goal"
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={() => setPopoverOpen((v) => !v)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary"
            title="Details"
            aria-expanded={popoverOpen}
          >
            Details
            <ChevronDown
              size={11}
              style={{
                transform: popoverOpen ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 140ms",
              }}
            />
          </button>
        </div>
      )}

      {/* Popover — Spot's read + secondary metrics + close-gap CTA */}
      {popoverOpen && !editing && (
        <div
          ref={popoverRef}
          className="absolute fadeUp"
          style={{
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            width: 460,
            background: "#FFF",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 24px 64px rgba(0,0,0,0.12)",
          }}
        >
          {/* Spot's read */}
          <div
            className="rounded-[10px] p-3 mb-3"
            style={{
              background: "var(--spot-tint)",
              border: "1px solid var(--spot-stroke)",
            }}
          >
            <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
              Spot&apos;s read on the goal
            </div>
            <div className="text-[12px] leading-[1.55] text-text-secondary mb-2.5">
              {goal.spotRead}
            </div>
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                onAsk("Show me how to close the gap to goal");
              }}
              className="apply-btn"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                height: 28,
                fontSize: 12,
                padding: "0 12px",
              }}
            >
              Plan to close gap <ArrowRight size={11} />
            </button>
          </div>

          {/* Secondary metrics */}
          <div className="uplabel mb-2" style={{ fontSize: 9.5 }}>
            Right now
          </div>
          <div
            className="grid gap-2 mb-3"
            style={{ gridTemplateColumns: `repeat(${secondary.length}, 1fr)` }}
          >
            {secondary.map((m) => (
              <div
                key={m.label}
                className="p-2 rounded-[7px]"
                style={{
                  background: m.primary ? "var(--bg-page)" : "transparent",
                  border: m.primary
                    ? "1px solid var(--border-subtle)"
                    : "1px solid transparent",
                }}
              >
                <div className="uplabel" style={{ fontSize: 9 }}>
                  {m.label}
                  {m.primary && " · goal"}
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}
                >
                  {m.value}
                </div>
                <div className="text-[10px] text-text-tertiary truncate">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div className="text-[10.5px] text-text-tertiary">
              {goal.window || `${goal.daysTotal} days`}
            </div>
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                setEditing(true);
              }}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary"
            >
              <Settings size={11} /> Edit goal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tight progress bar — same data the old TripleProgress was showing, but
 * collapsed into a single ~10px row with markers for "expected by now" and
 * "forecast end-of-window". Fill is the actual achievement.
 */
function TripleStrip({
  pct,
  expectedPct,
  forecastPct,
}: {
  pct: number;
  expectedPct: number;
  forecastPct: number;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <div
      className="relative"
      style={{
        width: "100%",
        height: 8,
        borderRadius: 4,
        background: "var(--bg-page)",
        border: "1px solid var(--border-subtle)",
        overflow: "hidden",
      }}
    >
      {/* Achievement fill */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${clamp(pct)}%`,
          background: "linear-gradient(90deg, #7C3AED 0%, #C026D3 100%)",
          transition: "width 240ms ease-out",
        }}
      />
      {/* Expected-by-now marker */}
      <span
        title={`Expected ${expectedPct}%`}
        style={{
          position: "absolute",
          top: -2,
          bottom: -2,
          left: `${clamp(expectedPct)}%`,
          width: 2,
          background: "var(--text-2)",
          opacity: 0.55,
          transform: "translateX(-1px)",
        }}
      />
      {/* Forecast marker */}
      <span
        title={`Forecast ${forecastPct}%`}
        style={{
          position: "absolute",
          top: -2,
          bottom: -2,
          left: `${clamp(forecastPct)}%`,
          width: 2,
          background: "#C026D3",
          opacity: 0.5,
          transform: "translateX(-1px)",
        }}
      />
    </div>
  );
}
