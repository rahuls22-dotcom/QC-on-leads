"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import {
  clients,
  MODULE_CATALOG,
  moduleMeterIds,
  type Client,
} from "@/lib/billing-data";
import { cn } from "@/lib/utils";
import { CreateOrgModal } from "@/components/organizations/create-org-modal";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Modules enabled for an org, derived from its rate card (a module counts as
// on when any of its tracked meters is enabled).
function enabledModuleNames(c: Client): string[] {
  const b = c.billing;
  if (!b) return [];
  // Explicit list is the source of truth (covers meterless modules); seed
  // orgs without it fall back to the rate card.
  if (b.enabledModuleIds) {
    return MODULE_CATALOG.filter((m) => b.enabledModuleIds!.includes(m.id)).map((m) => m.name);
  }
  return MODULE_CATALOG.filter((m) => moduleMeterIds(m).some((id) => b.rateCard[id]?.enabled)).map(
    (m) => m.name,
  );
}

export default function OrganizationsListPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.orgId.toLowerCase().includes(q) ||
        (c.billing?.industry ?? "").toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-6">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-foreground">Organizations</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Manage organizations, workspaces, modules, pricing, and users.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-[filter] hover:brightness-110"
        >
          <Plus size={14} strokeWidth={2.25} />
          New Organization
        </button>
      </header>

      <div className="rounded-xl border border-border-subtle bg-card">
        {/* Card header — count + search */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <span className="text-[15px] font-semibold text-foreground">
            Organizations <span className="text-muted-foreground">({filtered.length})</span>
          </span>
          <div className="relative w-full max-w-[300px]">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization"
              className="h-9 w-full rounded-md border border-border bg-transparent pl-9 pr-3 text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-[13px]">
          <thead className="border-y border-border-subtle bg-muted/30">
            <tr>
              <Th>Name</Th>
              <Th>Org ID</Th>
              <Th>Created</Th>
              <Th>Industry</Th>
              <Th>Modules</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-muted-foreground">
                  No organizations match “{search}”.
                </td>
              </tr>
            ) : (
              filtered.map((c) => <OrgRow key={c.id} client={c} />)
            )}
          </tbody>
        </table>
      </div>

      {createOpen && <CreateOrgModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function OrgRow({ client: c }: { client: Client }) {
  const modules = enabledModuleNames(c);
  return (
    <tr className="border-t border-border transition-colors hover:bg-secondary/30">
      <td className="px-5 py-3.5">
        <Link
          href={`/organizations/${c.id}`}
          className="font-semibold text-foreground transition-colors hover:text-primary"
        >
          {c.name}
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <code className="text-[11.5px] font-mono text-muted-foreground">{c.id}</code>
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
        {formatDate(c.contractStart)}
      </td>
      <td className="px-5 py-3.5 text-foreground/85">
        {c.billing?.industry || <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-5 py-3.5">
        {modules.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {modules.map((name) => (
              <span
                key={name}
                className="inline-flex h-6 items-center rounded-md bg-secondary px-2 text-[11.5px] font-medium text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        {/* Statuses arrive later — every org reads as Active for now. */}
        <span className="inline-flex items-center rounded-md bg-success-bg px-2 py-[3px] text-[11.5px] font-medium text-success">
          Active
        </span>
      </td>
    </tr>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}
