"use client";

// Project detail = the operational command center for one product. A "Project"
// IS a Product (id = product id). Aggregates: a metric grid, persona scorecards
// (what's working), the campaigns table (filtered to this product), and an
// enrichment placeholder — and links out to Memory, Campaigns, and Leads.

import { useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Monitor,
  FileText,
  Users,
  Sparkles,
  Package,
  Upload,
} from "lucide-react";
import { PRODUCTS } from "@/lib/products-data";
import { rollupCampaigns, campaignsForProduct } from "@/lib/campaigns-edtech-rollup";
import { projectHealth } from "@/lib/spot/project-health";
import { scorecardsForProduct } from "@/lib/spot/persona-scorecard";
import { CampaignsTable, inr, num } from "@/components/campaigns/campaigns-table";
import { PersonaScorecardCard } from "@/components/personas/persona-scorecard-card";
import { PersonasEmptyState } from "@/components/personas/personas-empty-state";
import { LeadDistribution } from "@/components/enrichment/lead-distribution";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SpotMark } from "@/components/spot/spot-mark";
import { IllustrationCampaigns, IllustrationEnrichment } from "@/components/illustrations/empty-states";
import { useDemoMode } from "@/lib/demo-mode";

type Tab = "personas" | "campaigns" | "enrichment";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

// Rollup delta -> MetricCard trend (cost metrics invert "good").
function toTrend(pctValue: number, invert = false) {
  return {
    value: Math.abs(pctValue),
    direction: (pctValue >= 0 ? "up" : "down") as "up" | "down",
    positive: invert ? pctValue < 0 : pctValue > 0,
  };
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = (params?.id || "").toString();
  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) notFound();

  const { isEmpty } = useDemoMode();
  const campaigns = campaignsForProduct(id);
  const r = rollupCampaigns(campaigns);
  const scorecards = scorecardsForProduct(id);
  const health = projectHealth(id);
  // Each tab falls back to its empty state when the data is genuinely empty
  // OR the global "Preview empty states" toggle is on.
  const hasCampaigns = !isEmpty && campaigns.length > 0;
  const hasPersonas = !isEmpty && scorecards.length > 0;
  const campaignCount = isEmpty ? 0 : campaigns.length;
  const personaCount = isEmpty ? 0 : scorecards.length;
  const [tab, setTab] = useState<Tab>("campaigns");

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => router.push("/projects")}
          className="p-1 rounded-button text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <span className="text-meta text-text-secondary">Projects &rsaquo; {product!.name}</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-card flex items-center justify-center flex-shrink-0"
            style={{ background: `${product!.accent}1A`, color: product!.accent }}
          >
            <Package size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-text-primary leading-tight">
                {product!.name}
              </h1>
              <span className={`pill ${health.tone}`} style={{ fontSize: 10.5 }} title={health.driver}>
                {health.label}
              </span>
            </div>
            <div className="text-[12.5px] text-text-secondary">
              {product!.client} &middot; {product!.category}
            </div>
          </div>
        </div>

        {/* Link-outs */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <LinkOut icon={Brain} label="Memory" onClick={() => router.push(`/memory?focus=${id}`)} />
          <LinkOut icon={Monitor} label="Campaigns" onClick={() => router.push(`/campaigns?product=${id}`)} />
          <LinkOut icon={FileText} label="Leads" onClick={() => router.push(`/enquiries?product=${id}`)} />
          <button
            type="button"
            onClick={() => router.push("/spot")}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12px] font-medium"
            title={`Ask Spot about ${product!.name}`}
          >
            <SpotMark size={12} />
            Ask Spot
          </button>
        </div>
      </div>

      {/* Metric grid */}
      <Section title="Performance" sub="Rolled up across this project's live campaigns.">
        {hasCampaigns ? (
          <div className="grid grid-cols-3 gap-2.5">
            <MetricCard label="Spend" value={inr(r.spend)} trend={toTrend(r.spendDelta)} previousLabel="vs prior" />
            <MetricCard
              label="Leads"
              value={num(r.leads)}
              subMetric={`${inr(r.blendedCpl)} CPL`}
              trend={toTrend(r.leadsDelta)}
              previousLabel="vs prior"
            />
            <MetricCard
              label="Verified leads"
              value={num(r.verified)}
              subMetric={`${r.verificationRate}% rate · ${inr(r.blendedCpvl)} CPVL`}
              trend={toTrend(r.verifiedDelta)}
              previousLabel="vs prior"
            />
            <MetricCard
              label="Qualified leads"
              value={num(r.qualified)}
              subMetric={`${r.qualificationRate}% rate · ${inr(r.blendedCpql)} CPQL`}
              trend={toTrend(r.qualifiedDelta)}
              previousLabel="vs prior"
            />
            <MetricCard
              label="Blended CPL"
              value={inr(r.blendedCpl)}
              trend={toTrend(r.blendedCplDelta, true)}
              previousLabel="vs prior"
            />
            <MetricCard
              label="Blended CPQL"
              value={inr(r.blendedCpql)}
              trend={toTrend(r.blendedCpqlDelta, true)}
              previousLabel="vs prior"
            />
          </div>
        ) : (
          <EmptyNote text="No active campaigns yet — metrics fill in once this project goes live." />
        )}
      </Section>

      {/* Tabs · Campaigns | Personas | Enrichment */}
      <div className="flex items-center gap-1 border-b border-border-subtle mb-5">
        <TabButton icon={Monitor} label="Campaigns" active={tab === "campaigns"} onClick={() => setTab("campaigns")} count={campaignCount} />
        <TabButton icon={Users} label="Personas" active={tab === "personas"} onClick={() => setTab("personas")} count={personaCount} />
        <TabButton icon={Sparkles} label="Enrichment" active={tab === "enrichment"} onClick={() => setTab("enrichment")} />
      </div>

      {tab === "campaigns" &&
        (hasCampaigns ? (
          <div>
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => router.push(`/campaigns?product=${id}`)}
                className="inline-flex items-center gap-1 text-[11.5px] text-text-tertiary hover:text-text-primary"
              >
                View all in Campaigns
                <ArrowRight size={11} strokeWidth={1.8} />
              </button>
            </div>
            <CampaignsTable
              campaigns={campaigns}
              onOpenCampaign={(cid) => router.push(`/campaigns/${cid}`)}
              emptyLabel="No campaigns for this project yet."
            />
          </div>
        ) : (
          <CampaignsEmptyState productName={product!.name} />
        ))}

      {tab === "personas" &&
        (hasPersonas ? (
          <div className="space-y-4">
            {scorecards.map((card) => (
              <PersonaScorecardCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <PersonasEmptyState compact productName={product!.name} />
        ))}

      {tab === "enrichment" &&
        (!isEmpty ? (
          <LeadDistribution productId={id} />
        ) : (
          <EnrichmentEmptyState productName={product!.name} />
        ))}
    </motion.div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: typeof Users;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 py-2.5 px-3.5 text-[13px] font-medium transition-colors ${
        active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
      }`}
    >
      <Icon size={13} strokeWidth={1.7} />
      {label}
      {typeof count === "number" && (
        <span className="text-[10.5px] text-text-tertiary tabular">{count}</span>
      )}
      {active && (
        <span aria-hidden className="absolute left-3 right-3 -bottom-px h-0.5 bg-text-primary rounded-full" />
      )}
    </button>
  );
}

/* --- Helpers --- */

function LinkOut({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Brain;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white text-[12px] font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors"
    >
      <Icon size={13} strokeWidth={1.6} />
      {label}
    </button>
  );
}

function Section({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-end justify-between gap-3 mb-2.5">
        <div>
          <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
          {sub && <div className="text-[11.5px] text-text-tertiary mt-0.5">{sub}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="bg-white border border-border rounded-card px-4 py-6 text-center text-[12.5px] text-text-tertiary italic">
      {text}
    </div>
  );
}

/** Campaigns-tab empty state — no campaigns launched or imported yet. */
function CampaignsEmptyState({ productName }: { productName: string }) {
  const router = useRouter();
  return (
    <div className="bg-white border border-border rounded-card flex flex-col items-center text-center px-6 py-12">
      <IllustrationCampaigns />
      <h3 className="text-[16px] font-semibold text-text-primary mt-4">No campaigns yet</h3>
      <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1.5 max-w-[440px]">
        Launch your first campaign for {productName} with Spot — I&apos;ll build the plan, creatives,
        and forms — or import existing campaigns from your ad accounts.
      </p>
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => router.push("/spot")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
        >
          <SpotMark size={13} />
          Launch with Spot
        </button>
        <button
          type="button"
          onClick={() => router.push("/spot")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px] font-medium text-text-secondary hover:text-text-primary"
        >
          <Upload size={14} strokeWidth={1.8} />
          Import campaigns
        </button>
      </div>
    </div>
  );
}

/** Enrichment-tab empty state — no enriched leads for this project yet. */
function EnrichmentEmptyState({ productName }: { productName: string }) {
  const router = useRouter();
  return (
    <div className="bg-white border border-border rounded-card flex flex-col items-center text-center px-6 py-12">
      <IllustrationEnrichment />
      <h3 className="text-[16px] font-semibold text-text-primary mt-4">No enrichment data yet</h3>
      <p className="text-[12.5px] text-text-secondary leading-relaxed mt-1.5 max-w-[460px]">
        Spot appends firmographic and demographic signals — company tier, seniority, location, net
        worth — to leads as they arrive. Once {productName} has enriched leads, the distribution
        shows up here.
      </p>
      <div className="mt-4">
        <button
          type="button"
          onClick={() => router.push("/enrichment")}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium"
        >
          <Sparkles size={13} strokeWidth={1.8} />
          Go to Enrichment
        </button>
      </div>
    </div>
  );
}
