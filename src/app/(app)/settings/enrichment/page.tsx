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

export default function EnrichmentSettingsPage() {
  const [freshness, setFreshness] = useState<"stored" | "fresh">("stored");
  const [storage, setStorage] = useState<"store" | "none">("store");
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [sources, setSources] = useState({ revspot: true, linkedin: false, company: true });

  return (
    <div className="space-y-5 max-w-[680px]">
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary">Enrichment</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Control how leads are enriched and whether enriched data is retained.
        </p>
      </div>

      <ChannelConfigCard product="enrichment" />

      {/* Data freshness */}
      <ConfigCard
        title="Data freshness"
        description="Whether we may reuse previously-enriched data or must enrich every lead from scratch."
      >
        <ConfigChoice
          value={freshness}
          onChange={setFreshness}
          options={[
            {
              value: "stored",
              label: "Use stored data",
              helper: "Reuse prior enrichment when a lead matches — faster, cheaper.",
            },
            {
              value: "fresh",
              label: "Fresh every time",
              helper: "Never read our database. Every lead is enriched live.",
            },
          ]}
        />
      </ConfigCard>

      {/* Data storage */}
      <ConfigCard
        title="Data storage"
        description="Whether enriched data is stored in Revspot after it is delivered to your CRM."
      >
        <ConfigChoice
          value={storage}
          onChange={setStorage}
          options={[
            {
              value: "store",
              label: "Store enriched data",
              helper: "Keep enriched records for history, re-export and analytics.",
            },
            {
              value: "none",
              label: "No data storage",
              helper: "Purge enriched data right after delivery. Nothing retained.",
            },
          ]}
        />
      </ConfigCard>

      {/* Automation */}
      <ConfigCard title="Automation">
        <ConfigRow
          label="Auto-enrich new enquiries"
          helper="Automatically enrich leads as they arrive from campaigns or the CRM."
          control={<ConfigToggle enabled={autoEnrich} onToggle={() => setAutoEnrich((v) => !v)} />}
          last
        />
      </ConfigCard>

      {/* Data sources */}
      <ConfigCard title="Data sources" description="Where enrichment attributes are pulled from.">
        <ConfigRow
          label="Revspot Database"
          helper="Proprietary Revspot data — demographics, property interest signals."
          control={
            <ConfigToggle
              enabled={sources.revspot}
              onToggle={() => setSources((s) => ({ ...s, revspot: !s.revspot }))}
            />
          }
        />
        <ConfigRow
          label="LinkedIn"
          helper="Professional data — company, title, industry. Coming soon."
          control={
            <ConfigToggle
              enabled={sources.linkedin}
              onToggle={() => setSources((s) => ({ ...s, linkedin: !s.linkedin }))}
            />
          }
        />
        <ConfigRow
          label="Company data"
          helper="Firmographics — size, revenue, industry."
          control={
            <ConfigToggle
              enabled={sources.company}
              onToggle={() => setSources((s) => ({ ...s, company: !s.company }))}
            />
          }
          last
        />
      </ConfigCard>

      <SaveBar />
    </div>
  );
}
