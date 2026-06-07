"use client";

// Shared Profile Card component for a single enriched lead.
// Used by:
//   - Enrichment single-mode inline result
//   - Enrichment history drawer (single rows)
//   - Future surfaces anywhere in launchpad showing a lead profile
//
// Two tabs: "Profile" (visual card) and "JSON" (raw data + copy / download).

import { useState } from "react";
import { Copy, Download, Mail, Phone, MapPin, Briefcase, GraduationCap, TrendingUp, Home as HomeIcon, Check, ExternalLink, Maximize2 } from "lucide-react";

// Official LinkedIn brand glyph (Simple Icons path). Inline so we don't depend on lucide's stylised version.
function LinkedInGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
import type { EnrichedProfile } from "@/lib/enrichment-data";

interface LeadProfileCardProps {
  profile: EnrichedProfile;
  // When inline (single-mode result) we want a slimmer chrome.
  // When in a drawer we already have its own chrome, let parent decide.
  variant?: "inline" | "drawer";
  // Optional: when present, an expand icon appears next to the tabs.
  // Inline result hands this in to pop open the side drawer.
  onExpand?: () => void;
}

type Tab = "profile" | "json";

export function LeadProfileCard({ profile, variant = "inline", onExpand }: LeadProfileCardProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [copied, setCopied] = useState(false);

  // Not enriched = API returned nothing. There's no enrichment payload to show,
  // so hide the Raw JSON tab entirely (Profile shows the input data only).
  const notEnriched = profile.enrichment_status === "Zero Enrichment";
  const activeTab: Tab = notEnriched ? "profile" : tab;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // noop
    }
  };

  const onDownload = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-${profile.lead_id || "enriched"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={variant === "inline" ? "bg-white border border-border rounded-card" : ""}>
      {/* Tab strip */}
      <div className="flex items-center justify-between px-4 pt-3 border-b border-border-subtle">
        <div className="flex items-center gap-1">
          <TabButton active={activeTab === "profile"} onClick={() => setTab("profile")}>
            Profile
          </TabButton>
          {!notEnriched && (
            <TabButton active={activeTab === "json"} onClick={() => setTab("json")}>
              Raw JSON
            </TabButton>
          )}
        </div>
        <div className="flex items-center gap-1.5 pb-2">
          {activeTab === "json" && (
            <>
              <IconButton onClick={onCopy} label={copied ? "Copied" : "Copy"}>
                <Copy size={13} strokeWidth={1.5} />
              </IconButton>
              <IconButton onClick={onDownload} label="Download">
                <Download size={13} strokeWidth={1.5} />
              </IconButton>
            </>
          )}
          {onExpand && (
            <button
              onClick={onExpand}
              aria-label="Open in side drawer"
              title="Open in side drawer"
              className="w-7 h-7 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-button transition-colors"
            >
              <Maximize2 size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "profile" ? (
        <ProfileTab profile={profile} />
      ) : (
        <JsonTab profile={profile} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 pb-2 pt-1 text-[13px] font-medium transition-colors ${
        active ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
      }`}
    >
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-text-primary rounded-full" />}
    </button>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 h-7 px-2 text-[12px] text-text-secondary border border-border rounded-button bg-white hover:bg-surface-secondary transition-colors"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

// ── Profile tab ────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: EnrichedProfile }) {
  const pro = profile.professional;
  const fin = profile.financial;
  const contact = profile.contact;
  const notEnriched = profile.enrichment_status === "Zero Enrichment";

  // Header source of truth: pro block if present, otherwise typed input.
  const headerName = pro?.name || contact?.name || contact?.email || contact?.phone || "Unknown";

  const linkedinUrl = pro?.linkedin || contact?.linkedin;
  const locationLabel = pro?.location || [pro?.city, pro?.state].filter(Boolean).join(", ") || pro?.country;

  return (
    <div className="p-5 space-y-5">
      {/* Header, avatar + name + title + summary + LinkedIn pill */}
      {(pro || contact) && (
        <div className="flex items-start gap-4">
          <Avatar name={headerName} url={pro?.photo_url} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-[16px] font-semibold text-text-primary">{headerName}</h3>
              {profile.lead_id && (
                <span className="text-[11px] text-text-tertiary tabular-nums">{profile.lead_id}</span>
              )}
              {profile.enrichment_status && (
                <EnrichmentStatusBadge status={profile.enrichment_status} />
              )}
            </div>
            {pro?.job_title && (
              <div className="text-[13px] text-text-secondary mt-0.5">
                {pro.job_title}
                {pro.company_name && <span className="text-text-tertiary"> · {pro.company_name}</span>}
              </div>
            )}
            {pro?.profile_summary && (
              <p className="text-[12px] text-text-secondary leading-relaxed mt-2">{pro.profile_summary}</p>
            )}
            {pro?.personality && (
              <p className="text-[12px] text-text-tertiary italic leading-relaxed mt-1">{pro.personality}</p>
            )}

            {/* Inline meta row: location + age + LinkedIn pill */}
            {(locationLabel || pro?.age || linkedinUrl) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 text-[12px] text-text-secondary">
                {locationLabel && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} strokeWidth={1.5} />
                    {locationLabel}
                    {pro?.location_type && <span className="text-text-tertiary"> · {pro.location_type}</span>}
                  </span>
                )}
                {pro?.age && (
                  <span className="text-text-tertiary">
                    {pro.age} yrs
                    {pro.age_group && <span> · {pro.age_group}</span>}
                  </span>
                )}
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[12px] font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] rounded-button transition-colors"
                  >
                    <LinkedInGlyph />
                    LinkedIn
                    <ExternalLink size={11} strokeWidth={2} className="opacity-90" />
                  </a>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Contact bar, email + phone with copy. LinkedIn lives in header above.
          For not-enriched leads (Zero Enrichment) nothing came back from the
          API, so we only show the data that was input — no verification badges. */}
      <ContactBar
        email={contact?.email}
        phone={contact?.phone}
        emailVerified={notEnriched ? undefined : profile.email_verification_status}
        phoneVerified={notEnriched ? undefined : profile.phone_verification_status}
        label={notEnriched ? "Input data" : undefined}
      />

      {/* Professional sub-card */}
      {pro && (
        <DataCard
          accent="pro"
          icon={<Briefcase size={13} strokeWidth={1.75} />}
          title="Professional"
        >
          <FieldGrid
            items={[
              { label: "Job Title", value: pro.job_title },
              { label: "Company", value: pro.company_name },
              { label: "Company Tier", value: pro.company_tier },
              { label: "Industry", value: pro.company_industry },
              { label: "Experience", value: pro.years_of_experience ? `${pro.years_of_experience} yrs` : undefined },
              { label: "Level", value: pro.professional_level },
              { label: "Employed", value: pro.employed === true ? "Yes" : pro.employed === false ? "No" : undefined },
              { label: "Engineer", value: pro.engineer === true ? "Yes" : pro.engineer === false ? "No" : undefined },
            ]}
          />
          {(pro.university_tier || pro.iit_iim || pro.mba) && (
            <SubGroup icon={<GraduationCap size={11} strokeWidth={1.5} />} label="Education">
              <FieldGrid
                items={[
                  { label: "University Tier", value: pro.university_tier },
                  { label: "IIT / IIM", value: pro.iit_iim ? "Yes" : pro.iit_iim === false ? "No" : undefined },
                  { label: "MBA", value: pro.mba ? "Yes" : pro.mba === false ? "No" : undefined },
                ]}
              />
            </SubGroup>
          )}
        </DataCard>
      )}

      {/* Financial sub-card */}
      {fin && (
        <DataCard
          accent="fin"
          icon={<TrendingUp size={13} strokeWidth={1.75} />}
          title="Financial"
        >
          <FieldGrid
            items={[
              { label: "Annual earnings", value: fin.annual_earnings_inr_min && fin.annual_earnings_inr_max ? `₹${(fin.annual_earnings_inr_min / 100000).toFixed(0)}L – ₹${(fin.annual_earnings_inr_max / 100000).toFixed(0)}L` : undefined },
              { label: "Yearly earnings (est.)", value: fin.estimated_yearly_earnings ? `₹${(fin.estimated_yearly_earnings / 100000).toFixed(1)}L` : undefined },
              { label: "Lifetime earnings (est.)", value: fin.estimated_lifetime_earnings ? `₹${(fin.estimated_lifetime_earnings / 10000000).toFixed(1)}Cr` : undefined },
              { label: "Credit score", value: fin.credit_score?.toString() },
              { label: "Credit limit", value: fin.credit_limit ? `₹${(fin.credit_limit / 100000).toFixed(1)}L` : undefined },
              { label: "Credit utilization", value: fin.credit_utilization !== undefined ? `${Math.round(fin.credit_utilization * 100)}%` : undefined },
              { label: "Cards", value: fin.total_credit_cards?.toString() },
              { label: "Potential tier", value: fin.potential_tier },
              { label: "Final score", value: fin.final_score?.toString() },
            ]}
          />
          {(fin.home_loan_amount || fin.car_loan_amount || fin.home_emi || fin.total_home_loans || fin.total_cars) && (
            <SubGroup icon={<HomeIcon size={11} strokeWidth={1.5} />} label="Assets & Loans">
              <FieldGrid
                items={[
                  { label: "Home loans", value: fin.total_home_loans?.toString() },
                  { label: "Home loan", value: fin.home_loan_amount ? `₹${(fin.home_loan_amount / 100000).toFixed(1)}L` : undefined },
                  { label: "Home EMI", value: fin.home_emi ? `₹${fin.home_emi.toLocaleString("en-IN")}/mo` : undefined },
                  { label: "Cars", value: fin.total_cars?.toString() },
                  { label: "Car loan", value: fin.car_loan_amount ? `₹${(fin.car_loan_amount / 100000).toFixed(1)}L` : "None" },
                ]}
              />
            </SubGroup>
          )}
        </DataCard>
      )}

      {/* Partial enrichment: professional came back, financial didn't. Still
          counted as enriched — financial layer just shows as not available. */}
      {pro && !fin && profile.enrichment_status === "Partial Enrichment" && (
        <DataCard
          accent="fin"
          icon={<TrendingUp size={13} strokeWidth={1.75} />}
          title="Financial"
        >
          <div className="text-[12px] text-text-tertiary leading-relaxed">
            No financial data returned for this lead. No financial credits were charged.
          </div>
        </DataCard>
      )}

    </div>
  );
}

// ── Contact bar ─────────────────────────────────────────────────────

function ContactBar({
  email,
  phone,
  emailVerified,
  phoneVerified,
  label,
}: {
  email?: string;
  phone?: string;
  emailVerified?: string;
  phoneVerified?: string;
  label?: string;
}) {
  if (!email && !phone) return null;

  return (
    <section className="border border-border-subtle rounded-card bg-surface-page/60 p-3 space-y-2">
      {label && (
        <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary pb-0.5">
          {label}
        </div>
      )}
      {email && (
        <ContactRow
          icon={<Mail size={14} strokeWidth={1.5} />}
          label="Email"
          value={email}
          href={`mailto:${email}`}
          verifiedStatus={emailVerified}
        />
      )}
      {phone && (
        <ContactRow
          icon={<Phone size={14} strokeWidth={1.5} />}
          label="Phone"
          value={phone}
          href={`tel:${phone.replace(/\s/g, "")}`}
          verifiedStatus={phoneVerified}
        />
      )}
    </section>
  );
}

function EnrichmentStatusBadge({ status }: { status: string }) {
  // Partial counts as enriched: professional layer found, financial missing.
  // We bill for what returned and still call it enriched. Only Zero Enrichment
  // (API called, nothing back) reads as "Not enriched".
  const map: Record<string, { cls: string; label: string }> = {
    "Fully Enriched": { cls: "bg-[#F0FDF4] text-[#15803D]", label: "Enriched" },
    "Partial Enrichment": { cls: "bg-[#F0FDF4] text-[#15803D]", label: "Enriched" },
    "Zero Enrichment": { cls: "bg-[#FEF2F2] text-[#DC2626]", label: "Not enriched" },
  };
  const m = map[status] || { cls: "bg-surface-secondary text-text-secondary", label: status };
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-badge ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  verifiedStatus,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  verifiedStatus?: string;
}) {
  const [copied, setCopied] = useState(false);
  const isVerified = verifiedStatus && /valid|verified|available/i.test(verifiedStatus);

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // noop
    }
  };

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-text-tertiary flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.4px] text-text-tertiary font-medium">{label}</div>
        {href ? (
          <a href={href} className="text-[13px] text-text-primary hover:text-accent-hover truncate block tabular-nums">
            {value}
          </a>
        ) : (
          <div className="text-[13px] text-text-primary truncate tabular-nums">{value}</div>
        )}
      </div>
      {isVerified && (
        <span
          title={`${label}: ${verifiedStatus}`}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded-badge flex-shrink-0"
        >
          <Check size={10} strokeWidth={2.5} />
          Verified
        </span>
      )}
      <button
        onClick={onCopy}
        aria-label={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        title={copied ? "Copied" : `Copy ${label.toLowerCase()}`}
        className="w-7 h-7 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-white rounded-button transition-colors flex-shrink-0"
      >
        {copied ? <Check size={13} strokeWidth={2} className="text-[#15803D]" /> : <Copy size={13} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

function Avatar({ name, url }: { name?: string; url?: string }) {
  if (url) {
    return <img src={url} alt={name || ""} className="w-12 h-12 rounded-full object-cover bg-surface-secondary" />;
  }
  const initials = (name || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-12 h-12 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
      <span className="text-[14px] font-semibold text-text-secondary">{initials || "—"}</span>
    </div>
  );
}

function DataCard({
  accent,
  icon,
  title,
  children,
}: {
  accent: "pro" | "fin";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  // Pro = blue, Fin = purple, same tokens as type tags throughout the app.
  const tone =
    accent === "pro"
      ? { chip: "bg-[#EFF6FF] text-[#1D4ED8]", strip: "bg-[#EFF6FF]" }
      : { chip: "bg-[#F5F3FF] text-[#6D28D9]", strip: "bg-[#F5F3FF]" };

  return (
    <section className="border border-border rounded-card overflow-hidden bg-white">
      <header className={`flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle ${tone.strip}`}>
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-button ${tone.chip}`}>
          {icon}
        </span>
        <h4 className="text-[13px] font-semibold text-text-primary">{title}</h4>
      </header>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </section>
  );
}

function SubGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="pt-3 border-t border-border-subtle">
      <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-medium uppercase tracking-[0.4px] text-text-tertiary">
        <span>{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function FieldGrid({ items }: { items: { label: string; value?: string }[] }) {
  const filtered = items.filter((i) => i.value !== undefined && i.value !== "");
  if (filtered.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {filtered.map((i) => (
        <div key={i.label} className="flex flex-col">
          <span className="text-[11px] text-text-tertiary">{i.label}</span>
          <span className="text-[13px] text-text-primary tabular-nums mt-0.5">{i.value}</span>
        </div>
      ))}
    </div>
  );
}


// ── JSON tab ────────────────────────────────────────────────────────

function JsonTab({ profile }: { profile: EnrichedProfile }) {
  return (
    <pre className="p-5 text-[12px] leading-relaxed text-text-primary font-mono bg-[#FAFAFA] rounded-b-card overflow-auto max-h-[520px] whitespace-pre-wrap">
      {JSON.stringify(profile, null, 2)}
    </pre>
  );
}
