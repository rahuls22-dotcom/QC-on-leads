"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User as UserIcon,
  Bot,
  Pause,
  Play,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  MessageSquare,
  Plus,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { agents, scoreTextClass, type Agent } from "@/lib/agents-data";
import { AgentStatusPill } from "@/components/agents/bits";
import { useAgentsUI, useAgentStatus } from "@/components/agents/agents-ui";

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const { openSlack } = useAgentsUI();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => a.name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">
            Agents{" "}
            <span className="text-muted-foreground font-medium">
              ({agents.length})
            </span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage and configure your AI agents for automated calling.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openSlack}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-transparent text-foreground text-[13px] hover:bg-secondary transition-colors"
          >
            <MessageSquare size={14} strokeWidth={2} />
            Preview Slack alert
          </button>
          <div className="relative w-[200px]">
            <UserIcon
              size={14}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              placeholder="Filter by creator..."
              className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
            />
          </div>
          <div className="relative w-[220px]">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition">
            <Plus size={15} strokeWidth={2} />
            Create New Agent
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg bg-card">
        <table className="w-full border-collapse text-[13px] min-w-[1000px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <Th>Agent Name</Th>
              <Th>Channel</Th>
              <Th>Status</Th>
              <Th align="right">Score</Th>
              <Th>Calls</Th>
              <Th align="center">Action</Th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground text-[13px]"
                >
                  No agents match your search.
                </td>
              </tr>
            ) : (
              filtered.map((a) => <AgentRow key={a.id} agent={a} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[12px] text-muted-foreground">
          Showing 1 to {filtered.length} of {agents.length} entries
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="h-8 px-3 rounded-md border border-border text-[12.5px] text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            Previous
          </button>
          <div className="h-8 px-3 rounded-md border border-border bg-secondary text-[12.5px] text-foreground flex items-center">
            Page 1 of 1
          </div>
          <button
            disabled
            className="h-8 px-3 rounded-md border border-border text-[12.5px] text-foreground disabled:opacity-40 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[12px] font-semibold text-muted-foreground whitespace-nowrap",
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  const router = useRouter();
  const status = useAgentStatus(agent.id);
  const { openPause, openResume } = useAgentsUI();

  const open = () => router.push(`/agents/${agent.id}`);

  return (
    <tr
      onClick={open}
      className="border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30 cursor-pointer"
    >
      {/* Name + phone */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Bot size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-foreground font-medium truncate max-w-[320px]">
              {agent.name}
            </div>
            {agent.phone && (
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5">
                <Phone size={11} strokeWidth={2} />
                {agent.phone}
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {agent.channel}
      </td>

      <td className="px-4 py-3">
        <AgentStatusPill status={status} />
      </td>

      {/* Score */}
      <td
        className="px-4 py-3 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <ScoreCell agent={agent} onOpen={open} />
      </td>

      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
        {agent.callCount > 0 ? `${agent.callCount} calls` : "—"}
      </td>

      {/* Inline action */}
      <td
        className="px-4 py-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "draft" ? (
          <button
            disabled
            title="Agent is in Draft"
            className="w-8 h-8 rounded-md border border-border text-muted-foreground inline-flex items-center justify-center opacity-40 cursor-not-allowed"
          >
            <Pause size={14} strokeWidth={2} />
          </button>
        ) : status === "paused" ? (
          <button
            onClick={() => openResume(agent.id)}
            title="Resume"
            className="w-8 h-8 rounded-md border border-border text-success inline-flex items-center justify-center hover:bg-success-bg transition-colors"
          >
            <Play size={14} strokeWidth={2} />
          </button>
        ) : (
          <button
            onClick={() => openPause(agent.id)}
            title="Pause"
            className="w-8 h-8 rounded-md border border-border text-destructive inline-flex items-center justify-center hover:bg-destructive-bg transition-colors"
          >
            <Pause size={14} strokeWidth={2} />
          </button>
        )}
      </td>

      <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
        <button className="w-8 h-8 rounded-md text-muted-foreground inline-flex items-center justify-center hover:bg-secondary">
          <MoreHorizontal size={16} strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

function ScoreCell({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
  // Insufficient data: has calls but < 10 → show "— n/10".
  if (agent.composite == null && agent.insufficientData) {
    return (
      <span
        title="Insufficient data — needs ≥10 calls"
        className="inline-flex items-center gap-1 text-muted-foreground tabular"
      >
        — <span className="text-[11px]">{agent.callCount}/10</span>
      </span>
    );
  }
  // No score yet (drafts).
  if (agent.composite == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const trend = agent.trend ?? 0;
  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : ArrowRight;
  const trendCls =
    trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <button
      onClick={onOpen}
      title="Click to view scorecard"
      className="inline-flex items-center gap-1.5 tabular font-semibold hover:underline underline-offset-2"
    >
      <span className={scoreTextClass(agent.composite)}>{agent.composite}</span>
      <span className={cn("inline-flex items-center text-[11px]", trendCls)}>
        <TrendIcon size={11} strokeWidth={2.5} />
        {Math.abs(trend)}
      </span>
    </button>
  );
}
