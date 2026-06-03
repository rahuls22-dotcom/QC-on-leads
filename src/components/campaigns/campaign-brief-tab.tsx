"use client";

import { useState } from "react";
import {
  Lock,
  Users,
  Sparkles,
  Layers,
  FileText,
  Zap,
  MapPin,
  Target,
  Calendar,
  Wallet,
  Megaphone,
  User,
  LayoutDashboard,
} from "lucide-react";
import { extractedProfile, strategyData, angleData, facebookPages, adAccounts, highIntentFormFields } from "@/lib/wizard-data";
import { initialAdSets } from "@/components/wizard/campaign-structure/types";

/* ──────────────────────────────────────────────────────── */
/*  Shared primitives                                       */
/* ──────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-card p-4">
      <div className="flex items-center gap-1.5 text-text-tertiary mb-2">
        <Icon size={12} strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-[0.4px]">{label}</span>
      </div>
      <div className="text-[15px] font-semibold text-text-primary tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-text-secondary mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border-subtle last:border-0 gap-4">
      <span className="text-[12px] text-text-tertiary shrink-0">{label}</span>
      <span className="text-[13px] text-text-primary text-right min-w-0">{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, badge }: { icon: typeof Users; title: string; badge?: string | number }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <Icon size={16} strokeWidth={1.5} className="text-text-secondary" />
      <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
      {badge !== undefined && (
        <span className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary tabular-nums">
          {badge}
        </span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/*  Sub-tab keys                                            */
/* ──────────────────────────────────────────────────────── */

type BriefSubTab =
  | "overview"
  | "personas"
  | "creative"
  | "adsets"
  | "leadform"
  | "offer"
  | "optimization";

/* ──────────────────────────────────────────────────────── */
/*  Main component                                          */
/* ──────────────────────────────────────────────────────── */

export function CampaignBriefTab() {
  const [activeSubTab, setActiveSubTab] = useState<BriefSubTab>("overview");

  // Mock campaign-level values (these were set during creation)
  const objective = "Verified Leads";
  const targetCount = 500;
  const durationDays = 30;
  const totalBudget = 200000;
  const dailyBudget = Math.round(totalBudget / durationDays);
  const locations = ["Whitefield, Bangalore", "Sarjapur Road, Bangalore", "Koramangala"];
  const adAccount = adAccounts[0].name;
  const facebookPage = facebookPages[0].name;
  const startDate = "18 Mar 2026";
  const endDate = "17 Apr 2026";
  const aiOptimizationOn = true;

  const subTabs: { key: BriefSubTab; label: string; icon: typeof Users }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "personas", label: "Personas", icon: Users },
    { key: "creative", label: "Creative strategy", icon: Sparkles },
    { key: "adsets", label: "Ad sets", icon: Layers },
    { key: "leadform", label: "Lead form", icon: FileText },
    { key: "offer", label: "Offer & positioning", icon: Megaphone },
    { key: "optimization", label: "AI optimization", icon: Zap },
  ];

  return (
    <div className="flex gap-5">
      {/* Sub-tab navigation */}
      <div className="w-[200px] shrink-0">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary px-3 pb-2">
          <Lock size={11} strokeWidth={1.5} />
          View-only panel
        </div>
        <div className="space-y-0.5">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] rounded-[6px] transition-colors duration-150 ${
                  activeSubTab === tab.key
                    ? "bg-surface-secondary text-text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-page hover:text-text-primary"
                }`}
              >
                <Icon size={14} strokeWidth={1.5} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-[900px]">
        {activeSubTab === "overview" && (
          <div className="space-y-4">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={Target} label="Objective" value={objective} sub={`${targetCount} target`} />
              <StatCard icon={Calendar} label="Duration" value={`${durationDays} days`} sub={`${startDate} — ${endDate}`} />
              <StatCard
                icon={Wallet}
                label="Budget"
                value={`₹${(totalBudget / 100000).toFixed(1)}L total`}
                sub={`₹${dailyBudget.toLocaleString("en-IN")}/day`}
              />
              <StatCard
                icon={MapPin}
                label="Locations"
                value={`${locations.length} ${locations.length === 1 ? "area" : "areas"}`}
                sub={locations[0] + (locations.length > 1 ? `, +${locations.length - 1} more` : "")}
              />
            </div>

            {/* Running on */}
            <div className="bg-white border border-border rounded-card p-5">
              <SectionTitle icon={LayoutDashboard} title="Running on" />
              <div className="-mt-1">
                <Row label="Ad Account" value={<span className="font-medium">{adAccount}</span>} />
                <Row label="Facebook Page" value={<span className="font-medium">{facebookPage}</span>} />
                <Row label="Project" value={<span className="font-medium">{extractedProfile.projectName}</span>} />
                <Row label="Locations" value={<span className="font-medium">{locations.join(", ")}</span>} />
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "personas" && (
          <div className="bg-white border border-border rounded-card p-5">
            <SectionTitle icon={Users} title="Personas" badge={strategyData.personas.length} />
            <div className="grid grid-cols-3 gap-3">
              {strategyData.personas.map((p) => (
                <div key={p.id} className="bg-surface-page border border-border-subtle rounded-[6px] p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User size={11} strokeWidth={1.5} className="text-text-tertiary" />
                    <span className="text-[13px] font-semibold text-text-primary">
                      {p.name}, {p.age}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mb-2.5 line-clamp-2">{p.role}</p>
                  <ul className="space-y-1">
                    {p.bullets.map((b, i) => (
                      <li key={i} className="flex gap-1.5 text-[11px] text-text-secondary leading-relaxed">
                        <span className="text-text-tertiary text-[8px] mt-[3px]">&bull;</span>
                        <span className="line-clamp-2">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === "creative" && (
          <div className="bg-white border border-border rounded-card p-5">
            <SectionTitle icon={Sparkles} title="Creative strategy" badge={angleData.length} />
            <div className="space-y-3">
              {angleData.map((a) => (
                <div key={a.id} className="bg-surface-page border border-border-subtle rounded-[6px] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-badge bg-white border border-border text-text-primary">
                      {a.personaName}
                    </span>
                    <span className="text-[12px] text-text-tertiary">&middot;</span>
                    <span className="text-[12px] font-medium text-text-primary">{a.angleName}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-0.5">
                        Hook
                      </span>
                      <p className="text-[12px] text-text-primary leading-snug">{a.hook}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-0.5">
                        CTA
                      </span>
                      <p className="text-[12px] text-text-secondary leading-snug">{a.cta}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === "adsets" && (
          <div className="bg-white border border-border rounded-card p-5">
            <SectionTitle icon={Layers} title="Ad sets" badge={initialAdSets.length} />
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {["Ad Set", "Ages", "Locations", "Budget/day", "Ads"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialAdSets.map((a) => (
                  <tr key={a.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2.5 text-[12px] text-text-primary font-medium">{a.name}</td>
                    <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums">
                      {a.ageMin}–{a.ageMax}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-text-secondary">
                      {a.locations.length > 0
                        ? a.locations.map((l) => l.name).slice(0, 2).join(", ") +
                          (a.locations.length > 2 ? `, +${a.locations.length - 2}` : "")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-text-primary tabular-nums">
                      ₹{a.budget.toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-text-secondary tabular-nums">
                      {a.ads.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === "leadform" && (
          <div className="bg-white border border-border rounded-card p-5">
            <SectionTitle icon={FileText} title="Lead form" badge={highIntentFormFields.filter((f) => f.enabled).length} />
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#EFF6FF] text-[#1D4ED8]">
                High Intent
              </span>
              <span className="text-[11px] text-text-tertiary">Qualifying form with budget + timeline</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {highIntentFormFields
                .filter((f) => f.enabled)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between px-3 py-2 bg-surface-page border border-border-subtle rounded-[6px]"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] text-text-primary font-medium truncate">{f.name}</div>
                      <div className="text-[10px] text-text-tertiary capitalize">{f.type}</div>
                    </div>
                    {f.required && (
                      <span className="text-[10px] font-medium text-text-tertiary shrink-0 ml-2">Required</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeSubTab === "offer" && (
          <div className="bg-white border border-border rounded-card p-5">
            <SectionTitle icon={Megaphone} title="Offer & positioning" />
            <div className="space-y-3">
              <div>
                <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
                  Positioning
                </span>
                <p className="text-[12px] text-text-primary leading-relaxed">{extractedProfile.positioning}</p>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">
                  Offer Summary
                </span>
                <p className="text-[12px] text-text-secondary leading-relaxed">{extractedProfile.offerSummary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
                    Core USPs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedProfile.coreUSPs.map((u, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-accent/5 text-accent border border-accent/20"
                      >
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
                    Key Benefits
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {extractedProfile.keyBenefits.slice(0, 4).map((b, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge bg-surface-page text-text-secondary border border-border-subtle"
                      >
                        {b}
                      </span>
                    ))}
                    {extractedProfile.keyBenefits.length > 4 && (
                      <span className="inline-flex items-center text-[11px] text-text-tertiary px-1 py-0.5">
                        +{extractedProfile.keyBenefits.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "optimization" && (
          <div className="bg-white border border-border rounded-card p-5">
            <SectionTitle icon={Zap} title="AI optimization" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="block text-[13px] font-semibold text-text-primary mb-0.5">
                  AI Budget Optimization
                </span>
                <span className="block text-[11px] text-text-secondary leading-relaxed max-w-[520px]">
                  {aiOptimizationOn
                    ? "AI is monitoring performance and reallocating budget across ad sets to minimize CPL."
                    : "Disabled — budget is fixed as configured at launch."}
                </span>
              </div>
              <span
                className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-badge shrink-0 ${
                  aiOptimizationOn ? "bg-[#F0FDF4] text-[#15803D]" : "bg-surface-secondary text-text-secondary"
                }`}
              >
                {aiOptimizationOn ? "On" : "Off"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
