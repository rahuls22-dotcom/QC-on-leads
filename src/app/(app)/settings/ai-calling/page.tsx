"use client";

import { useState } from "react";
import {
  ConfigCard,
  ConfigRow,
  ConfigToggle,
  ConfigChoice,
  SaveBar,
} from "@/components/settings/product-config";
import { ChannelConfigCard } from "@/components/settings/channel-config-card";

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 10px center",
};

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 px-2.5 pr-8 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
      style={selectStyle}
    >
      {children}
    </select>
  );
}

export default function AiCallingSettingsPage() {
  const [callStart, setCallStart] = useState("09:00");
  const [callEnd, setCallEnd] = useState("20:00");
  const [maxRetries, setMaxRetries] = useState("3");
  const [voicemail, setVoicemail] = useState<"message" | "hangup" | "retry">("message");
  const [recordingWriteback, setRecordingWriteback] = useState(true);
  const [transcriptWriteback, setTranscriptWriteback] = useState(true);

  return (
    <div className="space-y-5 max-w-[680px]">
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary">AI Calling</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Control when the AI agent calls, how it retries, and what it writes back.
        </p>
      </div>

      <ChannelConfigCard product="ai_calling" />

      {/* Call window */}
      <ConfigCard
        title="Call window"
        description="Leads are only dialled inside these hours (lead's local time)."
      >
        <ConfigRow
          label="Start time"
          control={
            <input
              type="time"
              value={callStart}
              onChange={(e) => setCallStart(e.target.value)}
              className="h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
            />
          }
        />
        <ConfigRow
          label="End time"
          control={
            <input
              type="time"
              value={callEnd}
              onChange={(e) => setCallEnd(e.target.value)}
              className="h-8 px-2.5 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
            />
          }
          last
        />
      </ConfigCard>

      {/* Retry policy */}
      <ConfigCard title="Retry policy">
        <ConfigRow
          label="Max retry attempts"
          helper="How many times to re-dial a lead that doesn't pick up."
          control={
            <Select value={maxRetries} onChange={setMaxRetries}>
              <option value="1">1 attempt</option>
              <option value="2">2 attempts</option>
              <option value="3">3 attempts</option>
              <option value="5">5 attempts</option>
            </Select>
          }
          last
        />
      </ConfigCard>

      {/* Voicemail handling */}
      <ConfigCard
        title="Voicemail handling"
        description="What the agent does when a call goes to voicemail."
      >
        <ConfigChoice
          value={voicemail}
          onChange={setVoicemail}
          options={[
            { value: "message", label: "Leave message", helper: "Play a recorded callback request." },
            { value: "hangup", label: "Hang up", helper: "Drop silently, mark as no-answer." },
            { value: "retry", label: "Retry later", helper: "Re-queue for the next attempt." },
          ]}
        />
      </ConfigCard>

      {/* Writeback */}
      <ConfigCard
        title="Call outcome writeback"
        description="What gets written back to the CRM after each call."
      >
        <ConfigRow
          label="Recording URL"
          helper="Attach the call recording link to the lead."
          control={
            <ConfigToggle
              enabled={recordingWriteback}
              onToggle={() => setRecordingWriteback((v) => !v)}
            />
          }
        />
        <ConfigRow
          label="Transcript + summary"
          helper="Write the AI transcript and call summary to the lead."
          control={
            <ConfigToggle
              enabled={transcriptWriteback}
              onToggle={() => setTranscriptWriteback((v) => !v)}
            />
          }
          last
        />
      </ConfigCard>

      <SaveBar />
    </div>
  );
}
