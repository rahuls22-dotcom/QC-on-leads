"use client";

// Read-only view of how the connected CRM's fields map to Revspot's enrichment fields.
// Demo only, real product would let users edit the mapping. Here we just show the table
// so the user can see what gets read in and what gets written back.

import { ArrowRight, Briefcase, CircleDollarSign, Database, Pencil } from "lucide-react";

import { useEnrichmentCrmStore } from "@/lib/enrichment-crm-data";

type Direction = "read" | "write" | "both";
type Layer = "identity" | "professional" | "financial";

interface Mapping {
  crmField: string;
  crmObject?: string;
  revspotField: string;
  layer: Layer;
  direction: Direction;
}

const MAPPINGS: Mapping[] = [
  // Identity (read)
  { crmField: "Email",         crmObject: "Lead", revspotField: "contact.email",           layer: "identity",     direction: "read" },
  { crmField: "Phone",         crmObject: "Lead", revspotField: "contact.phone",           layer: "identity",     direction: "read" },
  { crmField: "Name",          crmObject: "Lead", revspotField: "contact.name",            layer: "identity",     direction: "read" },
  { crmField: "LinkedIn URL",  crmObject: "Lead", revspotField: "contact.linkedin",        layer: "identity",     direction: "read" },

  // Professional (write back)
  { crmField: "Title",                crmObject: "Lead", revspotField: "professional.job_title",        layer: "professional", direction: "write" },
  { crmField: "Company",              crmObject: "Lead", revspotField: "professional.company_name",     layer: "professional", direction: "write" },
  { crmField: "Industry",             crmObject: "Lead", revspotField: "professional.company_industry", layer: "professional", direction: "write" },
  { crmField: "rev_seniority__c",     crmObject: "Lead", revspotField: "professional.professional_level", layer: "professional", direction: "write" },
  { crmField: "rev_years_exp__c",     crmObject: "Lead", revspotField: "professional.years_of_experience", layer: "professional", direction: "write" },
  { crmField: "rev_location__c",      crmObject: "Lead", revspotField: "professional.location",        layer: "professional", direction: "write" },

  // Financial (write back)
  { crmField: "rev_income_band__c",   crmObject: "Lead", revspotField: "financial.annual_earnings_inr_max", layer: "financial", direction: "write" },
  { crmField: "rev_potential__c",     crmObject: "Lead", revspotField: "financial.potential_tier",     layer: "financial", direction: "write" },
  { crmField: "rev_credit_score__c",  crmObject: "Lead", revspotField: "financial.credit_score",       layer: "financial", direction: "write" },
  { crmField: "rev_final_score__c",   crmObject: "Lead", revspotField: "financial.final_score",        layer: "financial", direction: "write" },
];

export function CrmMappedFields() {
  const crm = useEnrichmentCrmStore((s) => s.crmConnection);

  const readCount = MAPPINGS.filter((m) => m.direction === "read" || m.direction === "both").length;
  const writeCount = MAPPINGS.filter((m) => m.direction === "write" || m.direction === "both").length;

  return (
    <section className="bg-white border border-border rounded-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border-subtle flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary">Mapped fields</div>
          <h3 className="text-[14px] font-semibold text-text-primary mt-0.5">
            {capitalize(crm.provider)} · {crm.mappedFieldCount} fields linked
          </h3>
          <p className="text-[12px] text-text-secondary mt-1 max-w-[640px] leading-relaxed">
            What we read from your CRM, and what we write back after enrichment.{" "}
            Write-back policy: <span className="font-medium text-text-primary">{policyLabel(crm.writeBackPolicy)}</span>.
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white opacity-70 cursor-not-allowed"
          title="Editing mapping ships in a future release"
        >
          <Pencil size={12} strokeWidth={1.75} />
          Edit mapping
        </button>
      </header>

      <div className="px-5 py-3 flex items-center gap-4 text-[11.5px] text-text-secondary border-b border-border-subtle bg-surface-page/30">
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="blue" /> Read from CRM
          <span className="tabular-nums text-text-primary font-medium ml-1">{readCount}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Dot tone="green" /> Write back to CRM
          <span className="tabular-nums text-text-primary font-medium ml-1">{writeCount}</span>
        </span>
      </div>

      <MappingGroup
        layer="identity"
        title="Identity"
        sub="Lead fields used to look up enrichment data."
        icon={<Database size={13} strokeWidth={1.75} />}
        rows={MAPPINGS.filter((m) => m.layer === "identity")}
      />
      <MappingGroup
        layer="professional"
        title="Professional"
        sub="Title, company, location, seniority."
        icon={<Briefcase size={13} strokeWidth={1.75} />}
        rows={MAPPINGS.filter((m) => m.layer === "professional")}
      />
      <MappingGroup
        layer="financial"
        title="Financial"
        sub="Income band, credit score, affordability."
        icon={<CircleDollarSign size={13} strokeWidth={1.75} />}
        rows={MAPPINGS.filter((m) => m.layer === "financial")}
        last
      />
    </section>
  );
}

function MappingGroup({
  layer,
  title,
  sub,
  icon,
  rows,
  last,
}: {
  layer: Layer;
  title: string;
  sub: string;
  icon: React.ReactNode;
  rows: Mapping[];
  last?: boolean;
}) {
  const tint =
    layer === "identity"
      ? "bg-surface-secondary text-text-secondary"
      : layer === "professional"
      ? "bg-[#EFF6FF] text-[#1D4ED8]"
      : "bg-[#F5F3FF] text-[#6D28D9]";
  return (
    <div className={last ? "" : "border-b border-border-subtle"}>
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-button ${tint}`}>{icon}</span>
        <div>
          <div className="text-[12.5px] font-semibold text-text-primary">{title}</div>
          <div className="text-[11px] text-text-secondary">{sub}</div>
        </div>
      </div>
      <div className="px-5 pb-4">
        <div className="grid grid-cols-[1fr_28px_1fr_88px] gap-2 px-3 py-2 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-tertiary border-b border-border-subtle">
          <div>CRM field</div>
          <div />
          <div>Revspot field</div>
          <div className="text-right">Direction</div>
        </div>
        <ul className="divide-y divide-border-subtle">
          {rows.map((m) => (
            <li key={m.crmField} className="grid grid-cols-[1fr_28px_1fr_88px] gap-2 px-3 py-2.5 items-center">
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary truncate font-mono tabular-nums">{m.crmField}</div>
                {m.crmObject && (
                  <div className="text-[10.5px] text-text-tertiary truncate">{m.crmObject}</div>
                )}
              </div>
              <div className="flex items-center justify-center text-text-tertiary">
                <ArrowRight size={12} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary truncate font-mono tabular-nums">{m.revspotField}</div>
              </div>
              <div className="flex justify-end">
                <DirectionPill direction={m.direction} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DirectionPill({ direction }: { direction: Direction }) {
  if (direction === "read") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] rounded-badge px-2 py-0.5">
        Read
      </span>
    );
  }
  if (direction === "write") {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] rounded-badge px-2 py-0.5">
        Write
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.4px] text-text-primary bg-surface-secondary border border-border rounded-badge px-2 py-0.5">
      Both
    </span>
  );
}

function Dot({ tone }: { tone: "blue" | "green" }) {
  const c = tone === "blue" ? "bg-[#3B82F6]" : "bg-[#22C55E]";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${c}`} />;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function policyLabel(p: "fill_blanks" | "overwrite" | "field_selective"): string {
  if (p === "fill_blanks") return "Fill blanks only";
  if (p === "overwrite") return "Overwrite existing";
  return "Field-by-field";
}
