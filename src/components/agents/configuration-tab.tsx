"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";
import { OPTIONAL_CAPABILITIES } from "@/lib/voice-agent-data";

interface ConfigurationTabProps {
  agent: AgentMvpDetail;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-5">
      <h3 className="text-[14px] font-semibold text-text-primary mb-4">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
      {label}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <div>
      <FieldLabel label={label} />
      <select
        defaultValue={value}
        className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Capabilities multiselect — operators pick which optional tools an agent
 * loads at runtime. Core handlers (end_call, voice_mail_detection) are
 * always on and never appear here. Selected items render as removable
 * chips; an "Add capability" trigger reveals the unselected options.
 */
function CapabilitiesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedSet = new Set(value);
  const selected = OPTIONAL_CAPABILITIES.filter((c) => selectedSet.has(c.id));
  const available = OPTIONAL_CAPABILITIES.filter((c) => !selectedSet.has(c.id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <FieldLabel label="Capabilities" />
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {value.length} added
        </span>
      </div>

      <div ref={wrapperRef} className="relative">
        {/* Chips row + Add button. Acts like a single field. */}
        <div className="min-h-9 w-full px-2 py-1.5 bg-white border border-border rounded-button flex flex-wrap items-center gap-1.5">
          {selected.length === 0 && (
            <span className="text-[12px] text-text-tertiary px-1">
              No optional capabilities — agent runs with core tools only
            </span>
          )}
          {selected.map((cap) => (
            <span
              key={cap.id}
              className="inline-flex items-center gap-1 text-[11px] font-medium pl-2 pr-1 py-1 rounded-badge bg-surface-secondary text-text-secondary"
            >
              {cap.label}
              <button
                type="button"
                aria-label={`Remove ${cap.label}`}
                onClick={() => toggle(cap.id)}
                className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full text-text-tertiary hover:bg-border hover:text-text-primary transition-colors"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </span>
          ))}

          {available.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-badge text-accent hover:bg-accent/5 transition-colors ml-auto"
            >
              <Plus size={12} strokeWidth={2.5} />
              Add capability
              <ChevronDown
                size={12}
                strokeWidth={2.5}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Popover with unselected options. */}
        {open && available.length > 0 && (
          <div className="absolute z-10 right-0 mt-1 w-[260px] bg-white border border-border rounded-card shadow-lg py-1">
            {available.map((cap) => (
              <button
                key={cap.id}
                type="button"
                onClick={() => {
                  toggle(cap.id);
                  // Keep popover open so they can add several in a row;
                  // closes when the last available option is consumed.
                  if (available.length === 1) setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-text-primary hover:bg-surface-secondary transition-colors text-left"
              >
                <Check size={12} className="text-transparent" />
                {cap.label}
              </button>
            ))}
          </div>
        )}

        {/* Show already-selected items inside the popover too, with a
            check, so users can tell what's on without closing. */}
        {open && selected.length > 0 && available.length > 0 && (
          <div className="absolute z-10 right-0 top-[calc(100%+1px)] hidden">
            {/* placeholder for future grouping; intentionally hidden */}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-text-tertiary leading-relaxed">
        Core tools (end call, voicemail detection) are always loaded. Add only
        the optional capabilities this agent needs — fewer tools means a
        leaner prompt and faster responses.
      </p>
    </div>
  );
}

export function ConfigurationTab({ agent }: ConfigurationTabProps) {
  const [temperature, setTemperature] = useState(agent.llmConfig.temperature);
  const [speakingSpeed, setSpeakingSpeed] = useState(
    agent.otherConfig.speakingSpeed
  );
  const [concurrency, setConcurrency] = useState(agent.otherConfig.concurrency);
  const [capabilities, setCapabilities] = useState<string[]>(
    agent.capabilities ?? []
  );

  return (
    <div className="space-y-5">
      {/* LLM Configuration */}
      <SectionCard title="LLM Configuration">
        <div className="grid grid-cols-3 gap-4">
          <SelectField
            label="Provider"
            value={agent.llmConfig.provider}
            options={["Groq", "OpenAI", "Anthropic"]}
          />
          <SelectField
            label="Model"
            value={agent.llmConfig.model}
            options={[agent.llmConfig.model, "GPT-4o", "GPT-4o-mini", "Claude 3.5 Sonnet"]}
          />
          <div>
            <FieldLabel label="Temperature" />
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-accent cursor-pointer"
              />
              <span className="text-[13px] font-semibold text-accent tabular-nums w-8 text-right">
                {temperature.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-text-tertiary">Precise</span>
              <span className="text-[10px] text-text-tertiary">Creative</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* STT Configuration */}
      <SectionCard title="STT Configuration">
        <div className="grid grid-cols-3 gap-4">
          <SelectField
            label="Provider"
            value={agent.sttConfig.provider}
            options={["Deepgram", "Google", "AssemblyAI"]}
          />
          <SelectField
            label="Model"
            value={agent.sttConfig.model}
            options={["Nova 3", "Nova 2", "Whisper"]}
          />
          <SelectField
            label="Language"
            value={agent.sttConfig.language}
            options={[agent.sttConfig.language, "English (en)", "Hindi (hi)", "Kannada (kn)"]}
          />
        </div>
      </SectionCard>

      {/* Language Configuration */}
      <SectionCard title="Language Configuration">
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Primary Language"
            value={agent.languageConfig.primary}
            options={["English", "Hindi", "Kannada", "Tamil", "Telugu"]}
          />
          <div>
            <FieldLabel label="Additional Languages" />
            <div className="flex flex-wrap gap-1.5">
              {agent.languageConfig.additional.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-badge bg-surface-secondary text-text-secondary"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Other Configuration */}
      <SectionCard title="Other Configuration">
        <div className="grid grid-cols-3 gap-4">
          <SelectField
            label="Timezone"
            value={agent.otherConfig.timezone}
            options={[
              "Asia/Kolkata (IST)",
              "America/New_York (EST)",
              "Europe/London (GMT)",
            ]}
          />
          <div>
            <FieldLabel label="Concurrency" />
            <input
              type="number"
              min={1}
              max={5}
              value={concurrency}
              onChange={(e) =>
                setConcurrency(
                  Math.min(5, Math.max(1, parseInt(e.target.value) || 1))
                )
              }
              className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary"
            />
          </div>
          <div>
            <FieldLabel label="Speaking Speed" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-secondary w-8">Slow</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={speakingSpeed}
                onChange={(e) =>
                  setSpeakingSpeed(parseFloat(e.target.value))
                }
                className="flex-1 h-1.5 accent-accent cursor-pointer"
              />
              <span className="text-[11px] text-text-secondary w-8">Fast</span>
              <span className="text-[13px] font-medium text-text-primary tabular-nums w-10 text-right">
                {speakingSpeed.toFixed(1)}x
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Capabilities — optional tools the agent loads at runtime. */}
      <SectionCard title="Capabilities">
        <CapabilitiesField value={capabilities} onChange={setCapabilities} />
      </SectionCard>

      {/* Save button */}
      <div className="flex justify-end">
        <button className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
