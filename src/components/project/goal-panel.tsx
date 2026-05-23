"use client";

import { useState } from "react";
import { ArrowRight, Settings, Target, Sparkles } from "lucide-react";
import { ProjectDetail } from "@/lib/project-data";
import { PacePill } from "./shared/pace-pill";
import { TripleProgress } from "./shared/triple-progress";
import { SpotCallout } from "./shared/spot-callout";
import { GoalEditor } from "./goal-editor";

export function GoalPanel({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const { goal, secondary } = project;
  const [editing, setEditing] = useState(false);
  // Force a re-render after a save so the panel reads the freshly-mutated goal
  const [, forceTick] = useState(0);

  const goalSet = goal.target > 0;

  // ─── Empty state — no goal configured ────────────────────────────────
  if (!goalSet) {
    return (
      <div className="card-base mb-4" style={{ padding: 22 }}>
        {editing ? (
          <GoalEditor
            project={project}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              forceTick((t) => t + 1);
            }}
          />
        ) : (
          <div className="flex items-stretch gap-4">
            {/* Empty state hero */}
            <div className="flex-1 flex items-center gap-4">
              <div
                className="inline-flex items-center justify-center flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, #F4ECFF 0%, #FDF2FF 100%)",
                  color: "#7C3AED",
                }}
              >
                <Target size={22} />
              </div>
              <div className="min-w-0">
                <div className="uplabel mb-0.5">Goal</div>
                <div className="text-[17px] font-semibold leading-tight">
                  No goal set yet
                </div>
                <div className="text-[12px] text-text-tertiary mt-0.5 leading-[1.5]">
                  Set a target (e.g. 240 verified leads in 180 days) and I&apos;ll project
                  your pace and flag the gap as data rolls in.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onAsk("Help me decide what goal to set for this project")}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-button border border-border bg-white text-[12px] text-text-secondary hover:text-text-primary"
              >
                <Sparkles size={11} /> Ask Spot
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="apply-btn"
                style={{
                  height: 32,
                  fontSize: 12.5,
                  padding: "0 14px",
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                }}
              >
                <Target size={12} /> Set goal
              </button>
            </div>
          </div>
        )}

        {/* Secondary metrics strip stays useful — shows totals even without a goal */}
        <div
          className="grid mt-5 pt-4 border-t border-border-subtle"
          style={{ gridTemplateColumns: `repeat(${secondary.length}, 1fr)`, gap: 10 }}
        >
          {secondary.map((m) => (
            <div
              key={m.label}
              className="p-3 rounded-[7px]"
              style={{
                background: "transparent",
                border: "1px solid transparent",
              }}
            >
              <div className="uplabel" style={{ fontSize: 10 }}>
                {m.label}
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}
              >
                {m.value}
              </div>
              <div className="text-[10.5px] text-text-tertiary">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Normal state — goal exists ──────────────────────────────────────
  const pct = Math.round((goal.achieved / goal.target) * 100);
  const expectedPct = goal.daysTotal
    ? Math.round((goal.daysElapsed / goal.daysTotal) * 100)
    : 0;
  const forecastPct = Math.round((goal.forecast / goal.target) * 100);

  return (
    <div className="card-base mb-4" style={{ padding: 22 }}>
      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="uplabel">Goal · {goal.kind} leads</span>
            <PacePill pace={goal.pace} delta={goal.paceDelta} />
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span
              className="tabular-nums"
              style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              {goal.achieved}
            </span>
            <span className="text-[16px] text-text-secondary">/ {goal.target}</span>
            <span className="text-[12px] text-text-tertiary ml-1">{goal.window}</span>
          </div>

          <TripleProgress pct={pct} expectedPct={expectedPct} forecastPct={forecastPct} />

          <div
            className="grid mt-2"
            style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12, fontSize: 11 }}
          >
            <div>
              <div className="text-text-tertiary">{pct}% achieved</div>
            </div>
            <div>
              <div className="text-text-tertiary">
                Expected by now ·{" "}
                <span className="text-text-primary tabular-nums">
                  {Math.round((goal.target * expectedPct) / 100)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-text-tertiary">
                Forecast end-of-window ·{" "}
                <span className="text-text-primary tabular-nums">{goal.forecast}</span>
              </div>
            </div>
            <div>
              <div className="text-text-tertiary">
                Day{" "}
                <span className="text-text-primary tabular-nums">{goal.daysElapsed}</span>{" "}
                of {goal.daysTotal}
              </div>
            </div>
          </div>
        </div>

        <SpotCallout
          label="Spot's read on the goal"
          body={goal.spotRead}
          width={320}
          actions={
            <>
              <button
                onClick={() => onAsk("Show me how to close the gap to goal")}
                className="apply-btn"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                }}
                type="button"
              >
                Plan to close gap <ArrowRight size={11} />
              </button>
              <button
                onClick={() => setEditing(true)}
                type="button"
                className="inline-flex items-center justify-center h-[26px] w-[26px] rounded-button border border-border bg-white hover:border-border-hover hover:bg-white"
                title="Edit goal"
              >
                <Settings size={12} />
              </button>
            </>
          }
        />
      </div>

      {editing && (
        <div className="mt-4">
          <GoalEditor
            project={project}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              forceTick((t) => t + 1);
            }}
            compact
          />
        </div>
      )}

      {/* Secondary metrics strip */}
      <div
        className="grid mt-5 pt-4 border-t border-border-subtle"
        style={{ gridTemplateColumns: `repeat(${secondary.length}, 1fr)`, gap: 10 }}
      >
        {secondary.map((m) => (
          <div
            key={m.label}
            className="p-3 rounded-[7px]"
            style={{
              background: m.primary ? "var(--bg-page)" : "transparent",
              border: m.primary ? "1px solid var(--border-subtle)" : "1px solid transparent",
            }}
          >
            <div className="uplabel" style={{ fontSize: 10 }}>
              {m.label}
              {m.primary && " · goal metric"}
            </div>
            <div
              className="tabular-nums"
              style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}
            >
              {m.value}
            </div>
            <div className="text-[10.5px] text-text-tertiary">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
