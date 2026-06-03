"use client";

import { use } from "react";
import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { findAgent, affectedCalls } from "@/lib/agents-data";
import {
  Breadcrumbs,
  ConfPill,
  OutcomeBadge,
} from "@/components/agents/bits";

export default function AffectedCallsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const agent = findAgent(id);
  if (!agent) notFound();

  const router = useRouter();
  const search = useSearchParams();
  const signal = search.get("signal") ?? "S1.2";

  return (
    <div className="px-8 py-6 max-w-[1280px] mx-auto">
      <Breadcrumbs
        items={[
          { label: "Agents", href: "/agents" },
          { label: agent.name, href: `/agents/${agent.id}` },
          { label: `Affected calls (${signal})` },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">
            Affected calls
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {agent.name} · filtered by {signal}
          </p>
        </div>
        <button
          onClick={() => router.push(`/agents/${agent.id}`)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-foreground text-[13px] hover:bg-secondary transition"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back to scorecard
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <span className="text-[12px] text-muted-foreground">Filters:</span>
        <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-md border border-border bg-secondary text-[12px] text-foreground">
          Signal: {signal}
          <Link
            href={`/agents/${agent.id}`}
            aria-label="Clear signal filter"
            className="w-4 h-4 rounded hover:bg-border flex items-center justify-center text-muted-foreground"
          >
            <X size={12} strokeWidth={2.5} />
          </Link>
        </span>
        <Select options={["Last 7 days", "Last 24 hours", "Last 30 days"]} />
        <Select
          options={["All outcomes", "Qualified", "Disqualified", "Hangup"]}
        />
        <span className="ml-auto text-[12px] text-muted-foreground">
          {affectedCalls.length} calls match
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <table className="w-full border-collapse text-[13px] min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <Th>Call ID</Th>
              <Th>Time</Th>
              <Th>Duration</Th>
              <Th>Outcome</Th>
              <Th>Evidence snippet</Th>
              <Th align="right">Confidence</Th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {affectedCalls.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/agents/${agent.id}/calls/${c.id}`)}
                className="border-b border-border last:border-b-0 hover:bg-secondary/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-foreground tabular whitespace-nowrap">
                  {c.id}
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular whitespace-nowrap">
                  {c.time}
                </td>
                <td className="px-4 py-3 text-muted-foreground tabular whitespace-nowrap">
                  {c.duration}
                </td>
                <td className="px-4 py-3">
                  <OutcomeBadge outcome={c.outcome} />
                </td>
                <td className="px-4 py-3 text-[12.5px] text-muted-foreground max-w-[360px]">
                  <mark className="bg-warning-bg/70 text-foreground rounded px-1 py-0.5 box-decoration-clone">
                    {c.evidence}
                  </mark>
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfPill conf={c.confidence} showLabel={false} />
                </td>
                <td className="px-2 py-3 text-center text-muted-foreground">
                  <ChevronRight size={15} strokeWidth={2} className="inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[12px] font-semibold text-muted-foreground whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Select({ options }: { options: string[] }) {
  return (
    <select className="h-7 px-2 rounded-md border border-border bg-card text-[12px] text-foreground outline-none focus-visible:border-foreground">
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );
}
