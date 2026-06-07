"use client";

// Projects = the product portfolio. A "Project" IS a Product; this page lists
// the Guyju's products with live campaign rollups, plan status, and readiness,
// and links into /projects/[id] (the per-product command center).

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, ChevronRight, Folder, ArrowUpRight } from "lucide-react";
import { PRODUCTS, readinessLabel } from "@/lib/products-data";
import {
  planForProduct,
  PLAN_STATUS_LABEL,
  PLAN_STATUS_TONE,
} from "@/lib/spot/extended-flows";
import { rollupCampaigns, campaignsForProduct } from "@/lib/campaigns-edtech-rollup";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { useCurrentWorkspaceLabel } from "@/lib/workspace-store";

function fmtRupees(n: number): string {
  if (n === 0) return "—";
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function MetricStack({
  value,
  sub,
  align = "right",
  emphasize,
}: {
  value: string | number;
  sub?: string;
  align?: "left" | "right";
  emphasize?: boolean;
}) {
  return (
    <div style={{ textAlign: align }}>
      <div className="tabular-nums" style={{ fontSize: 13.5, fontWeight: emphasize ? 600 : 500, lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && (
        <div className="tabular-nums" style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function HealthPill({ health }: { health: "on-track" | "needs-attention" | "underperforming" }) {
  const map = {
    "on-track": { label: "On track", cls: "pill-ok" },
    "needs-attention": { label: "Attention", cls: "pill-warn" },
    underperforming: { label: "Low", cls: "pill-err" },
  } as const;
  const c = map[health];
  return <span className={`pill ${c.cls}`}>{c.label}</span>;
}

export default function ProjectsPage() {
  const router = useRouter();
  const askSpot = useSpotStore((s) => s.askSpot);
  const wsLabel = useCurrentWorkspaceLabel();

  const rows = PRODUCTS.map((p) => ({
    p,
    rollup: rollupCampaigns(campaignsForProduct(p.id)),
    plan: planForProduct(p.id),
  }));

  const totalSpend = rows.reduce((s, r) => s + r.rollup.spend, 0);
  const totalLeads = rows.reduce((s, r) => s + r.rollup.leads, 0);
  const totalVerified = rows.reduce((s, r) => s + r.rollup.verified, 0);
  const totalQualified = rows.reduce((s, r) => s + r.rollup.qualified, 0);
  const cpl = totalLeads ? totalSpend / totalLeads : 0;
  const cpvl = totalVerified ? totalSpend / totalVerified : 0;
  const cpql = totalQualified ? totalSpend / totalQualified : 0;

  const COLS = "minmax(200px, 2fr) 90px 120px 130px 130px 150px 80px 20px";
  const gridStyle: React.CSSProperties = { gridTemplateColumns: COLS, columnGap: 18 };

  const attention = rows.filter((r) => r.p.performance.health !== "on-track");

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[12px] text-text-secondary mb-1">{wsLabel} · Lead Generation</div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em]">Projects</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              askSpot("Audit every product — which is on pace and which needs attention?", {
                kind: "workspace",
                label: wsLabel,
              })
            }
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-button border border-border bg-white hover:border-border-hover hover:bg-surface-page text-[12.5px] font-medium transition-colors"
          >
            <SpotMark size={13} />
            Ask Spot about portfolio
          </button>
          <button
            type="button"
            onClick={() => router.push("/spot")}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button bg-[#111] text-[#FAFAF8] hover:bg-black text-[12.5px] font-medium transition-colors"
          >
            <Plus size={13} />
            New product
          </button>
        </div>
      </div>

      {/* Portfolio table */}
      <div className="card-base overflow-x-auto">
        <div style={{ minWidth: 900 }}>
          <div
            className="grid items-center px-5 py-2.5 border-b border-border bg-surface-page text-[10px] uppercase tracking-[0.04em] font-semibold text-text-tertiary"
            style={gridStyle}
          >
            <span>Product</span>
            <span className="text-right">Spend</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Verified</span>
            <span className="text-right">Qualified</span>
            <span>Plan</span>
            <span className="text-right">Health</span>
            <span />
          </div>

          {rows.map(({ p, rollup, plan }, i) => {
            const last = i === rows.length - 1;
            const r = readinessLabel(p.readiness);
            return (
              <button
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className={`hover-row text-left w-full grid items-center px-5 py-3.5 ${last ? "" : "border-b border-border-subtle"}`}
                style={gridStyle}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex-shrink-0 flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 7,
                      background: `linear-gradient(135deg, oklch(0.92 0.04 ${(p.id.length * 47) % 360}) 0%, oklch(0.78 0.06 ${(p.id.length * 47 + 40) % 360}) 100%)`,
                      color: "rgba(0,0,0,0.5)",
                    }}
                  >
                    <Folder size={13} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate leading-tight">{p.name}</div>
                    <div className="text-[10.5px] text-text-tertiary truncate">
                      {p.category} · {r.label}
                    </div>
                  </div>
                </div>
                <MetricStack value={fmtRupees(rollup.spend)} sub="total" align="right" emphasize />
                <MetricStack
                  value={rollup.leads.toLocaleString()}
                  sub={rollup.blendedCpl ? `${fmtRupees(rollup.blendedCpl)} CPL` : "—"}
                  align="right"
                />
                <MetricStack
                  value={rollup.verified.toLocaleString()}
                  sub={rollup.verificationRate ? `${rollup.verificationRate}% · ${fmtRupees(rollup.blendedCpvl)} CPVL` : "—"}
                  align="right"
                />
                <MetricStack
                  value={rollup.qualified.toLocaleString()}
                  sub={rollup.qualificationRate ? `${rollup.qualificationRate}% · ${fmtRupees(rollup.blendedCpql)} CPQL` : "—"}
                  align="right"
                />
                <div>
                  {plan ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`pill ${PLAN_STATUS_TONE[plan.status]}`} style={{ fontSize: 10 }}>
                        {PLAN_STATUS_LABEL[plan.status]}
                      </span>
                      <span className="text-[10.5px] text-text-tertiary">{plan.dayLabel}</span>
                      {plan.pendingRecs > 0 && (
                        <span className="pill pill-warn" style={{ fontSize: 9.5 }}>
                          {plan.pendingRecs} pending
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-text-tertiary">No plan yet</span>
                  )}
                </div>
                <div className="flex justify-end">
                  <HealthPill health={p.performance.health} />
                </div>
                <ChevronRight size={14} className="text-text-tertiary" />
              </button>
            );
          })}

          {/* Footer totals */}
          <div className="grid items-center px-5 py-3 border-t border-border bg-surface-page text-[12px] font-medium" style={gridStyle}>
            <span>Portfolio total</span>
            <MetricStack value={fmtRupees(totalSpend)} sub={`${rows.length} products`} align="right" emphasize />
            <MetricStack value={totalLeads.toLocaleString()} sub={cpl ? `${fmtRupees(cpl)} CPL` : "—"} align="right" />
            <MetricStack value={totalVerified.toLocaleString()} sub={cpvl ? `${fmtRupees(cpvl)} CPVL` : "—"} align="right" />
            <MetricStack value={totalQualified.toLocaleString()} sub={cpql ? `${fmtRupees(cpql)} CPQL` : "—"} align="right" />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* Spot ambient strip */}
      <div className="spot-reply mt-6 p-4 flex items-start gap-3">
        <SpotMark size={20} />
        <div className="flex-1">
          <div className="uplabel mb-1">Spot · portfolio read</div>
          <div className="text-[13.5px] leading-[1.5] text-text-primary">
            {attention.length === 0
              ? `All ${rows.length} products are holding pace. I'll flag anything that starts slipping.`
              : `${attention.length} of ${rows.length} products need attention — ${attention.map((a) => a.p.name).join(", ")}. Want me to dig in?`}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {[
              attention[0] ? `Why does ${attention[0].p.name} need attention?` : "Compare products on CPQL",
              "Where should I shift budget?",
              `Audit ${wsLabel}'s portfolio`,
            ].map((q) => (
              <button
                key={q}
                onClick={() => askSpot(q, { kind: "workspace", label: wsLabel })}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover hover:bg-surface-page"
              >
                <ArrowUpRight size={11} /> {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
