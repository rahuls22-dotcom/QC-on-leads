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

export default function CampaignsSettingsPage() {
  const [dedup, setDedup] = useState("60");
  const [autoPush, setAutoPush] = useState<"on_qualify" | "all" | "manual">("on_qualify");
  const [suppression, setSuppression] = useState(true);
  const [sourceTagging, setSourceTagging] = useState(true);

  return (
    <div className="space-y-5 max-w-[680px]">
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary">Campaigns</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Control how campaign leads are de-duplicated, pushed to the CRM, and tagged.
        </p>
      </div>

      <ChannelConfigCard product="campaigns" />

      {/* Push rule */}
      <ConfigCard
        title="Push to CRM"
        description="When a campaign lead is sent to your CRM."
      >
        <ConfigChoice
          value={autoPush}
          onChange={setAutoPush}
          options={[
            { value: "on_qualify", label: "On qualify", helper: "Push only once a lead is qualified." },
            { value: "all", label: "All leads", helper: "Push every lead as it arrives." },
            { value: "manual", label: "Manual", helper: "Hold leads for manual review first." },
          ]}
        />
      </ConfigCard>

      {/* Dedup */}
      <ConfigCard title="De-duplication">
        <ConfigRow
          label="Dedup window"
          helper="Suppress a lead if the same phone/email was seen within this window."
          control={
            <select
              value={dedup}
              onChange={(e) => setDedup(e.target.value)}
              className="h-8 px-2.5 pr-8 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
              style={selectStyle}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="0">No dedup</option>
            </select>
          }
          last
        />
      </ConfigCard>

      {/* Lists + tagging */}
      <ConfigCard title="Routing">
        <ConfigRow
          label="Apply suppression list"
          helper="Skip leads on the do-not-contact list before pushing."
          control={<ConfigToggle enabled={suppression} onToggle={() => setSuppression((v) => !v)} />}
        />
        <ConfigRow
          label="Tag lead source"
          helper="Stamp each lead with its campaign + ad source on writeback."
          control={<ConfigToggle enabled={sourceTagging} onToggle={() => setSourceTagging((v) => !v)} />}
          last
        />
      </ConfigCard>

      <SaveBar />
    </div>
  );
}
