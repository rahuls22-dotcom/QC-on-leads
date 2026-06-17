"use client";

import { useState } from "react";
import type { AgentMvpDetail } from "@/lib/voice-agent-data";

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

export function ConfigurationTab({ agent }: ConfigurationTabProps) {
  const [temperature, setTemperature] = useState(agent.llmConfig.temperature);
  const [speakingSpeed, setSpeakingSpeed] = useState(
    agent.otherConfig.speakingSpeed
  );
  const [concurrency, setConcurrency] = useState(agent.otherConfig.concurrency);

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

      {/* Save button */}
      <div className="flex justify-end">
        <button className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors">
          Save Configuration
        </button>
      </div>
    </div>
  );
}
