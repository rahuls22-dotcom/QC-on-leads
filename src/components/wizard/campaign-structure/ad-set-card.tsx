"use client";

import { useState } from "react";
import { Trash2, Copy, Lock, ChevronDown, ChevronRight, X, Users, Pencil } from "lucide-react";
import type { AdSetState, PlacementSelection, AdCopy } from "./types";
import { mockInstantForms } from "./types";
import { LocationSelector } from "./location-selector";
import { ManualPlacementsSelector } from "./manual-placements";

interface AdSetCardProps {
  adSet: AdSetState;
  index: number;
  cboEnabled: boolean;
  canDelete: boolean;
  onChange: (updates: Partial<AdSetState>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const genderOptions: { value: AdSetState["gender"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export function AdSetCard({
  adSet,
  index,
  cboEnabled,
  canDelete,
  onChange,
  onDelete,
  onDuplicate,
}: AdSetCardProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0); // first ad set expanded by default

  // AI-picked audience for this ad set (single, pre-applied)
  const aiAudienceNames = [
    "Real Estate Investors 30-45 in Bangalore",
    "NRI Property Buyers — Global",
    "Family Upgraders in Whitefield/Sarjapur",
  ];
  const aiAudience = aiAudienceNames[index % aiAudienceNames.length];

  return (
    <div className={`bg-surface-page border border-border-subtle rounded-[8px] transition-shadow duration-200 ${isExpanded ? "shadow-sm" : ""}`}>
      {/* ── Header (always visible, clickable) ────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? <ChevronDown size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" /> : <ChevronRight size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0" />}
          <input
            type="text"
            value={adSet.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full h-8 px-2 text-[14px] font-semibold border border-transparent rounded-input bg-transparent text-text-primary hover:border-border focus:outline-none focus:border-accent transition-colors duration-150"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-button transition-colors"
            title="Duplicate ad set"
          >
            <Copy size={14} strokeWidth={1.5} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-text-tertiary hover:text-red-600 hover:bg-red-50 rounded-button transition-colors"
              title="Delete ad set"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
      <div className="px-5 pb-5 space-y-0 border-t border-border-subtle">
        {/* ── Conversion Location ─────────────────────────────── */}
        <div>
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
            Conversion Location
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-badge bg-surface-page text-text-secondary border border-border">
            <Lock size={11} strokeWidth={2} className="text-text-tertiary" />
            Instant Forms
          </span>
        </div>

        {/* ── Instant Form ────────────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
            Instant Form
          </span>
          <div className="relative">
            <select
              value={adSet.instantFormId}
              onChange={(e) => onChange({ instantFormId: e.target.value })}
              className="w-full h-9 px-3 pr-8 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none"
            >
              {mockInstantForms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
            />
          </div>
        </div>

        {/* ── Budget (only when CBO off) ──────────────────────── */}
        {!cboEnabled && (
          <div className="border-t border-border-subtle pt-4 mt-4">
            <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
              Budget
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[13px] text-text-secondary shrink-0">&#8377;</span>
                <input
                  type="number"
                  value={adSet.budget}
                  onChange={(e) => onChange({ budget: Number(e.target.value) || 0 })}
                  className="w-full h-9 px-3 text-[13px] font-medium border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                />
              </div>
              <div className="flex shrink-0">
                {(["daily", "lifetime"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ budgetType: t })}
                    className={`h-9 px-3 text-[12px] font-medium border transition-colors duration-150 first:rounded-l-input last:rounded-r-input ${
                      adSet.budgetType === t
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-text-secondary border-border hover:bg-surface-page"
                    }`}
                  >
                    {t === "daily" ? "Daily" : "Lifetime"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Locations ───────────────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
            Locations
          </span>
          <LocationSelector
            locations={adSet.locations}
            onChange={(locations) => onChange({ locations })}
          />
        </div>

        {/* ── Age & Gender ────────────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-3">
            Age &amp; Gender
          </span>
          <div className="flex items-end gap-6">
            {/* Age */}
            <div className="flex items-center gap-2">
              <div>
                <span className="block text-[10px] text-text-tertiary mb-1">Min</span>
                <input
                  type="number"
                  min={18}
                  max={65}
                  value={adSet.ageMin}
                  onChange={(e) =>
                    onChange({ ageMin: Math.max(18, Math.min(65, Number(e.target.value) || 18)) })
                  }
                  className="w-16 h-9 px-2 text-[13px] text-center font-medium border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                />
              </div>
              <span className="text-[12px] text-text-tertiary mt-4">&ndash;</span>
              <div>
                <span className="block text-[10px] text-text-tertiary mb-1">Max</span>
                <input
                  type="number"
                  min={18}
                  max={65}
                  value={adSet.ageMax}
                  onChange={(e) =>
                    onChange({ ageMax: Math.max(18, Math.min(65, Number(e.target.value) || 65)) })
                  }
                  className="w-16 h-9 px-2 text-[13px] text-center font-medium border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                />
              </div>
            </div>

            {/* Gender */}
            <div className="flex shrink-0">
              {genderOptions.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => onChange({ gender: g.value })}
                  className={`h-9 px-3 text-[12px] font-medium border transition-colors duration-150 first:rounded-l-input last:rounded-r-input ${
                    adSet.gender === g.value
                      ? "bg-accent text-white border-accent"
                      : "bg-white text-text-secondary border-border hover:bg-surface-page"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Detailed Targeting ──────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
            Detailed Targeting
          </span>

          {/* Show included targeting as chips */}
          {adSet.detailedTargeting.included.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {adSet.detailedTargeting.included.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-badge bg-surface-page text-text-secondary border border-border"
                >
                  {t.name}
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        detailedTargeting: {
                          ...adSet.detailedTargeting,
                          included: adSet.detailedTargeting.included.filter((i) => i.id !== t.id),
                        },
                      })
                    }
                    className="ml-0.5 text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
          >
            Browse Interests &amp; Behaviors
          </button>
        </div>

        {/* ── AI-Picked Audience ────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
            Audience
          </span>
          <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-[8px] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Users size={14} strokeWidth={1.5} className="text-accent" />
              <span className="text-[12px] font-medium text-text-primary">{aiAudience}</span>
            </div>
            <button type="button" className="p-1 text-text-tertiary hover:text-accent transition-colors" title="Edit audience">
              <Pencil size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Advantage+ Audience ─────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[12px] font-semibold text-text-primary">
                Advantage+ Audience
              </span>
              <span className="block text-[11px] text-text-tertiary mt-0.5">
                Let Meta find the best audience using AI optimisation.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ advantagePlusAudience: !adSet.advantagePlusAudience })}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                adSet.advantagePlusAudience ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  adSet.advantagePlusAudience ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* ── Advantage+ Placements ───────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-[12px] font-semibold text-text-primary">
                Advantage+ Placements
              </span>
              <span className="block text-[11px] text-text-tertiary mt-0.5">
                Automatically show ads across all available placements.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ advantagePlusPlacements: !adSet.advantagePlusPlacements })}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 shrink-0 ${
                adSet.advantagePlusPlacements ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  adSet.advantagePlusPlacements ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Manual placements when Advantage+ off */}
          {!adSet.advantagePlusPlacements && (
            <div className="mt-3 pl-1">
              <ManualPlacementsSelector
                placements={adSet.manualPlacements}
                onChange={(manualPlacements) => onChange({ manualPlacements })}
              />
            </div>
          )}
        </div>

        {/* ── Ads (Primary Text, Headlines, Descriptions, URL Params) ── */}
        {adSet.ads && adSet.ads.length > 0 && (
        <div className="border-t border-border-subtle pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">Ads ({adSet.ads.length})</span>
          </div>
          <div className="space-y-3">
            {adSet.ads.map((ad, adIdx) => (
              <details key={ad.id} className="bg-white border border-border rounded-[6px] overflow-hidden group">
                <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-surface-page/50 transition-colors list-none">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={12} strokeWidth={1.5} className="text-text-tertiary group-open:rotate-90 transition-transform" />
                    <span className="text-[12px] font-medium text-text-primary">{ad.name}</span>
                  </div>
                  <span className="text-[10px] text-text-tertiary">{ad.creativeName}</span>
                </summary>
                <div className="px-3 pb-3 space-y-2.5 border-t border-border-subtle pt-3">
                  <div>
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">Primary Text</span>
                    <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5 whitespace-pre-line line-clamp-3">{ad.primaryText}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">Headline</span>
                      <p className="text-[11px] text-text-primary font-medium mt-0.5">{ad.headline}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">Description</span>
                      <p className="text-[11px] text-text-secondary mt-0.5">{ad.description}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">URL Parameters</span>
                    <p className="text-[10px] font-mono text-text-tertiary mt-0.5 bg-surface-page rounded px-2 py-1 break-all">{ad.urlParams}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
        )}

        {/* ── Full Config link ────────────────────────────────── */}
        <div className="border-t border-border-subtle pt-4 mt-4">
          <button
            type="button"
            className="text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150 underline underline-offset-2"
          >
            Full Config (Advanced)
          </button>
        </div>
      </div>
      )}

      {/* Collapsed summary */}
      {!isExpanded && (
        <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-text-tertiary">
          <span>{adSet.locations.length > 0 ? adSet.locations.map(l => l.name).join(", ") : "No locations"}</span>
          <span className="text-border">·</span>
          <span>Age {adSet.ageMin}–{adSet.ageMax === 65 ? "65+" : adSet.ageMax}</span>
          <span className="text-border">·</span>
          <span>{aiAudience}</span>
        </div>
      )}
    </div>
  );
}
