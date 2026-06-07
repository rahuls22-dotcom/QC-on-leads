"use client";

// Project detail = the operational command center for one product. A "Project"
// IS a Product (id = product id). Aggregates: a metric grid, persona scorecards
// (what's working), the campaigns table (filtered to this product), and an
// enrichment placeholder — and links out to Memory, Campaigns, and Leads.

import { useParams, useRouter, notFound } from "next/navigation";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Monitor,
  FileText,
  Sparkles,
  Package,
} from "lucide-react";
import { PRODUCTS, diagnoseProduct } from "@/lib/products-data";
import {
  planForProduct,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
} from "@/lib/spot/extended-flows";
import { rollupCampaigns, campaignsForProduct } from "@/lib/campaigns-edtech-rollup";
import { scorecardsForProduct } from "@/lib/spot/persona-scorecard";
import { CampaignsTable, inr, num } from "@/components/campaigns/campaigns-table";
import { PersonaScorecardCard } from "@/components/personas/persona-scorecard-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { SpotMark } from "@/components/spot/spot-mark";

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

  const campaigns = campaignsForProduct(id);
  const r = rollupCampaigns(campaigns);
  const scorecards = scorecardsForProduct(id);
  const plan = planForProduct(id);
  const dx = diagnoseProduct(product!);
  const hasCampaigns = campaigns.length > 0;

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
          <div className="w-10 h-10 rounded-card bg-[#FAF8F2] border border-[#E8E3D5] flex items-center justify-center flex-shrink-0">
            <Package size={18} strokeWidth={1.5} className="text-text-secondary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-text-primary leading-tight">
                {product!.name}
              </h1>
              {plan ? (
                <span className={`pill ${PLAN_STATUS_TONE[plan.status]}`} style={{ fontSize: 10.5 }}>
                  {PLAN_STATUS_LABEL[plan.status]}
                </span>
              ) : (
                <span
                  className={`pill pill-${dx.tone === "err" ? "err" : dx.tone === "warn" ? "warn" : "info"}`}
                  style={{ fontSize: 10.5 }}
                >
                  {dx.chip}
                </span>
              )}
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
      <Section title="Performance" sub="Rolled up across this product's live campaigns.">
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
          <EmptyNote text="No active campaigns yet — metrics fill in once this product goes live." />
        )}
      </Section>

      {/* Personas */}
      <Section title="Personas · what's working" sub="Live verdict + angle leaderboard per persona.">
        {scorecards.length > 0 ? (
          <div className="space-y-4">
            {scorecards.map((card) => (
              <PersonaScorecardCard key={card.id} card={card} />
            ))}
          </div>
        ) : (
          <EmptyNote text="No personas linked to this product yet." />
        )}
      </Section>

      {/* Campaigns */}
      <Section
        title="Campaigns"
        sub="The same view as the Campaigns page, scoped to this product."
        action={
          hasCampaigns ? (
            <button
              type="button"
              onClick={() => router.push(`/campaigns?product=${id}`)}
              className="inline-flex items-center gap-1 text-[11.5px] text-text-tertiary hover:text-text-primary"
            >
              View all in Campaigns
              <ArrowRight size={11} strokeWidth={1.8} />
            </button>
          ) : undefined
        }
      >
        {hasCampaigns ? (
          <CampaignsTable
            campaigns={campaigns}
            onOpenCampaign={(cid) => router.push(`/campaigns/${cid}`)}
            emptyLabel="No campaigns for this product yet."
          />
        ) : (
          <EmptyNote text="No campaigns for this product yet — launch one from Spot." />
        )}
      </Section>

      {/* Enrichment — placeholder (design pending). */}
      <Section title="Enrichment">
        <div className="bg-white border border-border border-dashed rounded-card px-5 py-8 flex flex-col items-center justify-center text-center">
          <Sparkles size={18} strokeWidth={1.5} className="text-text-tertiary mb-2" />
          <div className="text-[12.5px] font-medium text-text-primary">Enrichment · coming soon</div>
          <div className="text-[11.5px] text-text-tertiary mt-0.5 max-w-[420px]">
            Enrichment data for this product will live here.
          </div>
        </div>
      </Section>
    </motion.div>
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
