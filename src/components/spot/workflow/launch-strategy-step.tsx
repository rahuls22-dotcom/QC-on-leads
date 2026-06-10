"use client";

// Campaign Strategy canvas — the launch-strategy step. Spot drafts the key
// personas (with creative angles), the targeting overview, the approach, and a
// target CPQL derived from the project's price band. Lead-gen forms only for
// now. The user approves it before Spot builds the detailed plan.
//
// Dark-themed to match the right canvas (#161614).

import { Sparkles, Target, FileText, Crosshair, TrendingUp, Workflow } from "lucide-react";
import type { LaunchWorkflow } from "@/lib/spot/workflow";
import { PRODUCTS } from "@/lib/products-data";

type StratPersona = { name: string; pain: string; angles: string[] };

/** EdTech-generic creative angles keyed off the persona archetype, so the
 *  strategy reads coherently for both researched (new) and existing products. */
function anglesForPersona(name: string, pain: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("parent"))
    return [
      "Watch your child solve a hard problem this week",
      "Weekly progress — visible to you, in the parent app",
      "Mentors who know the weak chapters by name",
    ];
  if (n.includes("coaching") || n.includes("switch"))
    return [
      "Switching coaching mid-year? We cover the gap",
      "Capped at 60, not 200 — attention, not anonymity",
      "1:1 mentor review every fortnight",
    ];
  if (n.includes("self") || n.includes("student"))
    return [
      "Doubts cleared live, in 15 minutes",
      "Rank against your whole batch, weekly",
      "24-month recordings — revise anytime",
    ];
  if (n.includes("professional") || n.includes("working"))
    return [
      "Fluency on your schedule — 20 minutes a day",
      "Speak up with confidence in the next meeting",
      "From hesitant to fluent in 90 days",
    ];
  return [
    pain ? `${pain} — addressed head-on` : "The pain, named head-on",
    "The outcome they actually want",
    "Proof it works — real cohort results",
  ];
}

function parsePrice(cost?: string): number | null {
  if (!cost) return null;
  const digits = cost.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : null;
}

function strategyFor(w: LaunchWorkflow) {
  const rm = w.researchedMemory;
  let personas: StratPersona[] = [];
  if (rm?.personas?.length) {
    personas = rm.personas
      .slice(0, 3)
      .map((p) => ({ name: p.name, pain: p.pain, angles: anglesForPersona(p.name, p.pain) }));
  } else if (w.productId) {
    const prod = PRODUCTS.find((x) => x.id === w.productId);
    personas = (prod?.personas ?? [])
      .slice(0, 3)
      .map((p) => ({ name: p.name, pain: "", angles: anglesForPersona(p.name, "") }));
  }
  if (personas.length === 0) {
    personas = [{ name: "Primary buyer", pain: "", angles: anglesForPersona("", "") }];
  }

  const price = parsePrice(rm?.pricing?.[0]?.cost);
  const cpql = price ? Math.round((price * 0.023) / 50) * 50 : 1200;
  const cpqlRationale = price
    ? `~2.3% of the ${rm?.pricing?.[0]?.cost} program price`
    : "set from the category price band";

  return { personas, cpql, cpqlRationale };
}

export function LaunchStrategyStep({ workflow }: { workflow: LaunchWorkflow }) {
  const { personas, cpql, cpqlRationale } = strategyFor(workflow);

  return (
    <div className="px-6 py-6 max-w-[760px] mx-auto" style={{ color: "#F5F4EF" }}>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: "#C9A86A" }}>
        Campaign strategy
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight leading-[1.15]">{workflow.productName}</h1>
      <p className="text-[12.5px] mt-1.5 mb-5 leading-relaxed" style={{ color: "#A8A8A0" }}>
        The personas I&apos;d target, the creative angles for each, and how we&apos;ll run it. Approve to build the detailed plan.
      </p>

      {/* Approach + key levers */}
      <div className="rounded-card p-4 mb-5" style={{ background: "#1A1A18", border: "1px solid #262623" }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={13} strokeWidth={1.8} style={{ color: "#C9A86A" }} />
          <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#A8A8A0" }}>Approach</span>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "#E8E6DF" }}>
          Launch new creatives against fresh audiences, then scale the cohorts and angles where we see good results — and cut what doesn&apos;t.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <StratStat icon={FileText} label="Campaign type" value="Lead-gen forms" sub="Lead forms only for now" />
          <StratStat icon={Target} label="Target CPQL" value={`₹${cpql.toLocaleString("en-IN")}`} sub={cpqlRationale} />
        </div>
      </div>

      {/* Targeting overview */}
      <div className="rounded-card p-4 mb-5" style={{ background: "#1A1A18", border: "1px solid #262623" }}>
        <div className="flex items-center gap-2 mb-2.5">
          <Crosshair size={13} strokeWidth={1.8} style={{ color: "#C9A86A" }} />
          <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#A8A8A0" }}>Targeting overview</span>
        </div>
        <ul className="space-y-1.5">
          {[
            "Cold prospecting on Meta · broad + interest stacks per persona",
            "Revspot Audience + 1% lookalike seed for a warm start",
            "Geo · tier-1/2/3 metros, weighted to high-intent regions",
            "Layered exclusions · existing leads + recent purchasers",
          ].map((t, i) => (
            <li key={i} className="flex gap-2 text-[12.5px]" style={{ color: "#D6D6CE" }}>
              <span className="mt-[7px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#C9A86A" }} />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Personas + creative strategy */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={13} strokeWidth={1.8} style={{ color: "#C9A86A" }} />
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#A8A8A0" }}>
          Key personas · creative strategy
        </span>
      </div>
      <div className="space-y-3">
        {personas.map((p, i) => (
          <div key={i} className="rounded-card p-4" style={{ background: "#1A1A18", border: "1px solid #262623" }}>
            <div className="text-[14px] font-semibold" style={{ color: "#F5F4EF" }}>{p.name}</div>
            {p.pain && (
              <div className="flex items-baseline gap-2 mt-1.5">
                <span
                  className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "rgba(245,158,11,0.14)", color: "#F59E0B" }}
                >
                  Pain
                </span>
                <span className="text-[12.5px]" style={{ color: "#D6D6CE" }}>{p.pain}</span>
              </div>
            )}
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #262623" }}>
              <div className="text-[9px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: "#8A8980" }}>
                Creative angles
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.angles.map((a, j) => (
                  <span
                    key={j}
                    className="text-[11.5px] px-2 py-1 rounded-[7px]"
                    style={{ background: "#222220", border: "1px solid #2E2E2A", color: "#E8E6DF" }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CRM workflow · Qualifier Agent — how inbound leads get handled once
          the ads bring them in. Lives in the strategy, not the plan. */}
      <div className="flex items-center gap-2 mb-3 mt-6">
        <Workflow size={13} strokeWidth={1.8} style={{ color: "#C9A86A" }} />
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#A8A8A0" }}>
          CRM workflow · Qualifier Agent
        </span>
      </div>
      <div className="rounded-card p-4" style={{ background: "#1A1A18", border: "1px solid #262623" }}>
        <p className="text-[12.5px] leading-relaxed" style={{ color: "#E8E6DF" }}>
          Every inbound lead is picked up the moment it lands and routed on ICP fit — voice + WhatsApp, no lead left cold.
        </p>
        <div className="mt-3.5 space-y-2.5">
          {[
            { k: "Qualifier Agent", v: "Always-on · voice + WhatsApp capable" },
            { k: "ICP match", v: "Runs Revspot Enrichment on each lead — role, intent signals, prior product touches" },
            { k: "High ICP → human", v: "Patches the call live to a Sales rep within 90s, while the lead is still warm" },
            { k: "Lower ICP → nurture", v: "Qualifies on the call, then a 10-day WhatsApp sequence (6 touches) re-qualifies when intent resurfaces" },
          ].map((s, i) => (
            <div key={i} className="flex gap-3">
              <span
                className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                style={{ background: "#222220", border: "1px solid #2E2E2A", color: "#C9A86A" }}
              >
                {i + 1}
              </span>
              <div>
                <div className="text-[12.5px] font-semibold" style={{ color: "#F5F4EF" }}>{s.k}</div>
                <div className="text-[11.5px] leading-snug mt-0.5" style={{ color: "#A8A8A0" }}>{s.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StratStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[8px] px-3 py-2.5" style={{ background: "#222220", border: "1px solid #2E2E2A" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} strokeWidth={1.8} style={{ color: "#C9A86A" }} />
        <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: "#8A8980" }}>{label}</span>
      </div>
      <div className="text-[15px] font-semibold" style={{ color: "#F5F4EF" }}>{value}</div>
      <div className="text-[10.5px] mt-0.5" style={{ color: "#8A8980" }}>{sub}</div>
    </div>
  );
}
