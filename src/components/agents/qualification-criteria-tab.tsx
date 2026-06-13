"use client";

import { useState } from "react";
import { ChevronUp, Plus, Trash2 } from "lucide-react";
import type {
  AgentMvpDetail,
  QualificationRule,
  QualificationCondition,
} from "@/lib/voice-agent-data";
import { POST_CALL_METRICS } from "@/lib/voice-agent-data";

interface QualificationCriteriaTabProps {
  agent: AgentMvpDetail;
}

let nextId = 1000;
function uid() {
  return `gen-${nextId++}`;
}

/* ─── Section (Qualified / Disqualified) ─────────────────────────── */

function CriteriaSection({
  label,
  color,
  rules,
  onChange,
}: {
  label: string;
  color: "green" | "red";
  rules: QualificationRule[];
  onChange: (rules: QualificationRule[]) => void;
}) {
  const [open, setOpen] = useState(true);

  const dotCls = color === "green" ? "bg-[#22C55E]" : "bg-[#EF4444]";
  const labelCls =
    color === "green" ? "text-text-primary" : "text-text-primary";

  const addRule = () => {
    onChange([
      ...rules,
      {
        id: uid(),
        description: "",
        conditions: [{ id: uid(), field: "budget_fit", value: "" }],
      },
    ]);
  };

  const removeRule = (ruleId: string) => {
    onChange(rules.filter((r) => r.id !== ruleId));
  };

  const updateRule = (ruleId: string, updated: Partial<QualificationRule>) => {
    onChange(
      rules.map((r) => (r.id === ruleId ? { ...r, ...updated } : r))
    );
  };

  const addCondition = (ruleId: string) => {
    onChange(
      rules.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              conditions: [
                ...r.conditions,
                { id: uid(), field: "budget_fit", value: "" },
              ],
            }
          : r
      )
    );
  };

  const removeCondition = (ruleId: string, condId: string) => {
    onChange(
      rules.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.filter((c) => c.id !== condId) }
          : r
      )
    );
  };

  const updateCondition = (
    ruleId: string,
    condId: string,
    updated: Partial<QualificationCondition>
  ) => {
    onChange(
      rules.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              conditions: r.conditions.map((c) =>
                c.id === condId ? { ...c, ...updated } : c
              ),
            }
          : r
      )
    );
  };

  return (
    <div className="bg-white border border-border rounded-card">
      {/* Section header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
          <span className={`text-[14px] font-semibold ${labelCls}`}>
            {label}
          </span>
          <span className="text-[12px] text-text-tertiary font-medium">
            {rules.length} {rules.length === 1 ? "Rule" : "Rules"}
          </span>
        </div>
        <ChevronUp
          size={16}
          strokeWidth={1.5}
          className={`text-text-tertiary transition-transform duration-150 ${
            open ? "" : "rotate-180"
          }`}
        />
      </button>

      {/* Rules */}
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="border border-border rounded-card p-4"
            >
              {/* Description row */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={rule.description}
                    onChange={(e) =>
                      updateRule(rule.id, { description: e.target.value })
                    }
                    placeholder="Describe this rule..."
                    className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                  />
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="mt-6 p-1.5 text-text-tertiary hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-button transition-colors"
                  title="Delete rule"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>

              {/* Conditions header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px]">
                  Conditions (AND)
                </span>
                <button
                  onClick={() => addCondition(rule.id)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  <Plus size={13} strokeWidth={1.5} />
                  Add Condition
                </button>
              </div>

              {/* Condition rows */}
              <div className="space-y-2">
                {rule.conditions.map((cond) => (
                  <div key={cond.id} className="flex items-center gap-2">
                    <select
                      value={cond.field}
                      onChange={(e) =>
                        updateCondition(rule.id, cond.id, {
                          field: e.target.value as QualificationCondition["field"],
                        })
                      }
                      className="h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary appearance-none cursor-pointer min-w-[180px]"
                    >
                      {POST_CALL_METRICS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <span className="text-[12px] text-text-tertiary select-none px-1">
                      &rsaquo;
                    </span>

                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) =>
                        updateCondition(rule.id, cond.id, {
                          value: e.target.value,
                        })
                      }
                      placeholder="value"
                      className="flex-1 h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                    />

                    <button
                      onClick={() => removeCondition(rule.id, cond.id)}
                      className="p-1.5 text-text-tertiary hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-button transition-colors"
                      title="Delete condition"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add rule button */}
          <button
            onClick={addRule}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Plus size={14} strokeWidth={1.5} />
            Add Rule
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Tab ───────────────────────────────────────────────────── */

export function QualificationCriteriaTab({
  agent,
}: QualificationCriteriaTabProps) {
  const [qualified, setQualified] = useState(
    agent.qualificationCriteria.qualified
  );
  const [disqualified, setDisqualified] = useState(
    agent.qualificationCriteria.disqualified
  );

  return (
    <div className="space-y-5">
      <CriteriaSection
        label="Disqualified"
        color="red"
        rules={disqualified}
        onChange={setDisqualified}
      />
      <CriteriaSection
        label="Qualified"
        color="green"
        rules={qualified}
        onChange={setQualified}
      />

      {/* Save button */}
      <div className="flex justify-end">
        <button className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors">
          Save Criteria
        </button>
      </div>
    </div>
  );
}
