"use client";

import { useState } from "react";
import { Check, X, Target } from "lucide-react";
import { mutateRuntimeProject, type ProjectDetail } from "@/lib/project-data";

/**
 * Inline goal editor — used in two places:
 *  - `GoalPanel` (project hero), expanded from the gear button.
 *  - `SetupSection` (Settings tab), as the body of the Goal settings card.
 *
 * It commits via `mutateRuntimeProject`. Runtime projects only — seed
 * projects mutate too, but the change isn't persisted across reload.
 */
export function GoalEditor({
  project,
  onCancel,
  onSaved,
  compact,
}: {
  project: ProjectDetail;
  onCancel: () => void;
  onSaved: () => void;
  /** Use a slimmer layout (no surrounding border). For embedding in cards. */
  compact?: boolean;
}) {
  const goal = project.goal;
  const [kind, setKind] = useState<"leads" | "verified" | "qualified">(goal.kind);
  const [target, setTarget] = useState(String(goal.target || ""));
  const [windowStr, setWindowStr] = useState(goal.window || "");

  const save = () => {
    const t = Number(target) || 0;
    // Try to parse "180 days" → daysTotal for the progress panel
    const m = (windowStr || "").match(/(\d+)\s*(day|days)/i);
    const days = m ? Number(m[1]) : 0;
    mutateRuntimeProject(project.id, (p) => {
      p.goal.kind = kind;
      p.goal.target = t;
      p.goal.window = windowStr;
      p.goal.daysTotal = days || p.goal.daysTotal;
      // If we're setting a goal where there wasn't one before, clear the
      // "no data yet" spotRead so the panel reads correctly.
      if (t > 0) {
        p.goal.spotRead =
          p.goal.spotRead.includes("No goal set yet")
            ? `Goal set to ${t} ${kind} leads in ${windowStr}. Once campaigns gather a few days of spend, I'll start projecting pace.`
            : p.goal.spotRead;
      }
    });
    onSaved();
  };

  const containerClass = compact
    ? "p-4 rounded-[10px]"
    : "mt-4 p-4 rounded-[10px]";
  const containerStyle = compact
    ? { background: "#FFFDF6", border: "1px solid #E8C97A" }
    : { background: "#FFFDF6", border: "1px solid #E8C97A" };

  return (
    <div className={containerClass} style={containerStyle}>
      <div className="text-[12.5px] font-semibold mb-3 flex items-center gap-1.5">
        <Target size={12} /> {goal.target > 0 ? "Edit goal" : "Set your project goal"}
      </div>
      <div
        className="grid gap-3 mb-3"
        style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}
      >
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
            Goal kind
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {(["leads", "verified", "qualified"] as const).map((k) => {
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className="card-base text-left p-1.5"
                  style={{
                    background: active ? "#1A1A1A" : "#FFF",
                    color: active ? "#FFF" : "var(--text-1)",
                    borderColor: active ? "#1A1A1A" : "var(--border)",
                  }}
                >
                  <div className="text-[11px] font-medium capitalize">{k}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
            Target count
          </div>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="240"
            className="w-full text-[13px] outline-none rounded px-2 py-1.5 tabular-nums"
            style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary mb-1.5">
            Window
          </div>
          <input
            type="text"
            value={windowStr}
            onChange={(e) => setWindowStr(e.target.value)}
            placeholder="e.g. 180 days"
            className="w-full text-[13px] outline-none rounded px-2 py-1.5"
            style={{ border: "1px solid #C9A86A", background: "#FFFEF8" }}
          />
        </div>
      </div>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
        >
          <X size={11} /> Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="apply-btn"
          style={{ height: 28, fontSize: 11.5, padding: "0 10px" }}
        >
          <Check size={11} /> Save goal
        </button>
      </div>
    </div>
  );
}
