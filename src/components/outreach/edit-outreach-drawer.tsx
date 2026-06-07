"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Save,
  Bot,
  Clock,
  Calendar,
  Phone,
  Info,
  ChevronDown,
  Check,
  ExternalLink,
  Plus,
  ArrowRight,
} from "lucide-react";
import { voiceAgents } from "@/lib/outreach-data";

// Editable fields a caller can pre-populate when opening the drawer. Every
// field is optional because the two call sites (listing card + detail page)
// each carry a slightly different subset of outreach state — anything the
// caller doesn't supply falls back to a sensible default below.
export type IntervalUnit = "min" | "hours" | "days";

export interface EditOutreachInitial {
  id: string;
  name: string;
  voiceAgentName?: string;
  description?: string;
  activeDays?: string[];
  callingStart?: string;
  callingEnd?: string;
  maxRetries?: string;
  retryInterval?: string;
  retryIntervalUnit?: IntervalUnit;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function findAgentId(name?: string): string {
  if (!name) return voiceAgents[0]?.id ?? "";
  return voiceAgents.find((a) => a.name === name)?.id ?? voiceAgents[0]?.id ?? "";
}

// Compact agent picker — mirrors the styling of the one in create/page so
// the edit drawer feels like the same control the user originally picked
// the agent with. Inlined here to avoid coupling this component to the
// create-page module.
function AgentPicker({
  value,
  onChange,
  onCreateNew,
}: {
  value: string;
  onChange: (id: string) => void;
  onCreateNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = voiceAgents.find((a) => a.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 px-3 flex items-center justify-between text-left text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <Bot size={14} strokeWidth={1.5} className="text-text-secondary shrink-0" />
          <span className="truncate">{selected?.name ?? "Pick an agent…"}</span>
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.5}
          className={`text-text-tertiary shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-card shadow-lg z-40 overflow-hidden">
            <div className="max-h-[200px] overflow-y-auto py-1">
              {voiceAgents.map((a) => {
                const isActive = a.id === value;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onChange(a.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-accent/5 text-text-primary" : "hover:bg-surface-page"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-surface-page text-text-secondary shrink-0">
                      <Bot size={12} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 text-[12.5px] font-medium text-text-primary truncate">
                      {a.name}
                    </span>
                    {isActive && (
                      <Check size={13} strokeWidth={2} className="text-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Divider + create-new — mirrors the create-page picker so the
                user always has an escape hatch into the real agent flow. */}
            <div className="border-t border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent/5 transition-colors"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-accent/10 text-accent shrink-0">
                  <Plus size={13} strokeWidth={2} />
                </span>
                <span className="flex-1 text-[12.5px] font-medium text-accent">Create a new agent</span>
                <ArrowRight size={12} strokeWidth={1.75} className="text-accent shrink-0" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function EditOutreachDrawer({
  initial,
  onClose,
  onSaved,
}: {
  initial: EditOutreachInitial;
  onClose: () => void;
  onSaved?: (patch: { name: string; description: string; voiceAgentName: string }) => void;
}) {
  const router = useRouter();
  // Local form state seeded from whatever the caller supplied. Defaults
  // mirror the defaults used on the create page so an outreach that's
  // never had a schedule edited still opens with reasonable values.
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [agentId, setAgentId] = useState<string>(findAgentId(initial.voiceAgentName));
  const [activeDays, setActiveDays] = useState<string[]>(
    initial.activeDays ?? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  );
  const [callStart, setCallStart] = useState(initial.callingStart ?? "09:00");
  const [callEnd, setCallEnd] = useState(initial.callingEnd ?? "19:00");
  const [maxRetries, setMaxRetries] = useState(initial.maxRetries ?? "10");
  const [retryInterval, setRetryInterval] = useState(initial.retryInterval ?? "6");
  const [retryIntervalUnit, setRetryIntervalUnit] = useState<IntervalUnit>(
    initial.retryIntervalUnit ?? "hours"
  );
  const intervalBounds = retryIntervalUnit === "min" ? { min: 1, max: 60 }
    : retryIntervalUnit === "days" ? { min: 1, max: 30 }
    : { min: 1, max: 24 };

  const toggleDay = (day: string) =>
    setActiveDays((p) => (p.includes(day) ? p.filter((d) => d !== day) : [...p, day]));

  const canSave = name.trim().length > 0 && activeDays.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    // Demo-only — there's no server, so we just bubble the editable
    // metadata back to the caller so they can update their local view
    // optimistically. Schedule/churn changes aren't currently round-tripped
    // (the listing's OutreachListItem doesn't carry those fields).
    onSaved?.({
      name: name.trim(),
      description: description.trim(),
      voiceAgentName: voiceAgents.find((a) => a.id === agentId)?.name ?? initial.voiceAgentName ?? "",
    });
    onClose();
  };

  return (
    <>
      {/* Backdrop — matches the Leads detail panel's scrim (lighter, higher z) */}
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} aria-hidden />

      {/* Drawer — chrome aligned with LeadDetailPanel: left border + lighter shadow */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[560px] bg-white shadow-lg border-l border-border z-[70] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border-subtle flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-0.5">
              Edit outreach
            </div>
            <h2 className="text-[20px] font-semibold text-text-primary leading-tight truncate">
              {initial.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-page rounded-button transition-colors"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body — scrolls */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Basics */}
          <section>
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px] mb-3">
              The basics
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="text-[12.5px] font-medium text-text-primary block mb-1.5">
                  Outreach name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-text-primary block mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="A short note for your team."
                  className="w-full px-3 py-2.5 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors placeholder:text-text-tertiary resize-none"
                />
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-text-primary block mb-1.5">
                  Voice agent
                </label>
                <AgentPicker
                  value={agentId}
                  onChange={setAgentId}
                  onCreateNew={() => {
                    onClose();
                    router.push("/agents-mvp?create=1");
                  }}
                />
              </div>
            </div>
          </section>

          {/* Schedule */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Clock size={12} strokeWidth={1.75} className="text-accent" />
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px]">
                Calling schedule
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[12.5px] font-medium text-text-primary block mb-2">
                  Active days
                </label>
                <div className="flex items-center gap-1.5">
                  {DAYS.map((day) => {
                    const isOn = activeDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        aria-pressed={isOn}
                        title={day}
                        className={`w-9 h-9 text-[11px] font-bold rounded-[8px] transition-all ${
                          isOn
                            ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                            : "bg-white border border-border text-text-tertiary hover:border-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {day[0]}
                      </button>
                    );
                  })}
                </div>
                {activeDays.length === 0 && (
                  <p className="text-[11px] text-status-error mt-1.5">Pick at least one day.</p>
                )}
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-text-primary block mb-2">
                  Calling hours
                </label>
                <div className="inline-flex items-center gap-2">
                  <input
                    type="time"
                    value={callStart}
                    onChange={(e) => setCallStart(e.target.value)}
                    className="h-9 px-2.5 text-[12.5px] border border-border rounded-input"
                  />
                  <span className="text-[12px] text-text-tertiary">to</span>
                  <input
                    type="time"
                    value={callEnd}
                    onChange={(e) => setCallEnd(e.target.value)}
                    className="h-9 px-2.5 text-[12.5px] border border-border rounded-input"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Max churn */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Phone size={12} strokeWidth={1.75} className="text-accent" />
              <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.6px]">
                Max churn
              </span>
            </div>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-2">
              <span className="text-[13px] text-text-secondary shrink-0">Retry up to</span>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(e.target.value)}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isNaN(n) || n < 1) setMaxRetries("1");
                  else if (n > 20) setMaxRetries("20");
                  else setMaxRetries(String(n));
                }}
                min={1}
                max={20}
                className="h-8 w-12 px-1.5 text-[13px] tabular-nums text-center border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
              <span className="text-[13px] text-text-secondary shrink-0">
                time{maxRetries === "1" ? "" : "s"} with an interval of
              </span>
              <input
                type="number"
                value={retryInterval}
                onChange={(e) => setRetryInterval(e.target.value)}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  const { min, max } = intervalBounds;
                  if (Number.isNaN(n) || n < min) setRetryInterval(String(min));
                  else if (n > max) setRetryInterval(String(max));
                  else setRetryInterval(String(n));
                }}
                min={intervalBounds.min}
                max={intervalBounds.max}
                className="h-8 w-12 px-1.5 text-[13px] tabular-nums text-center border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors"
              />
              <select
                value={retryIntervalUnit}
                onChange={(e) => {
                  const next = e.target.value as IntervalUnit;
                  const b = next === "min" ? { min: 1, max: 60 }
                    : next === "days" ? { min: 1, max: 30 }
                    : { min: 1, max: 24 };
                  const n = parseInt(retryInterval || "0", 10);
                  if (!Number.isNaN(n)) {
                    if (n < b.min) setRetryInterval(String(b.min));
                    else if (n > b.max) setRetryInterval(String(b.max));
                  }
                  setRetryIntervalUnit(next);
                }}
                className="h-8 pl-2 pr-6 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
              >
                <option value="min">minute{retryInterval === "1" ? "" : "s"}</option>
                <option value="hours">hour{retryInterval === "1" ? "" : "s"}</option>
                <option value="days">day{retryInterval === "1" ? "" : "s"}</option>
              </select>
              <span className="text-[13px] text-text-secondary shrink-0">between calls.</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-6 py-3.5 flex items-center justify-between gap-3 bg-surface-page/50">
          <span className="text-[11.5px] text-text-tertiary">
            Changes apply to future calls only.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={13} strokeWidth={1.75} />
              Save changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
