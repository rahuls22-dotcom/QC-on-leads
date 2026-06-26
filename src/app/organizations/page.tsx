"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import {
  clients,
  MODULE_CATALOG,
  moduleMeterIds,
  displayStatus,
  activeCreditAccount,
  type Client,
  type CreditAccountType,
  type OrgDisplayStatus,
} from "@/lib/billing-data";
import { cn } from "@/lib/utils";
import { CreateOrgModal } from "@/components/organizations/create-org-modal";

const STATUS_PILL: Record<OrgDisplayStatus, string> = {
  Active: "bg-success-bg text-success",
  Sandbox: "bg-primary-soft text-primary",
  "Expiring soon": "bg-warning-bg text-warning",
  Expired: "bg-destructive-bg text-destructive",
  Draft: "bg-secondary text-muted-foreground",
};

const ACCOUNT_PILL: Record<CreditAccountType, string> = {
  trial: "bg-primary-soft text-primary",
  paid: "bg-secondary text-foreground",
};
const ACCOUNT_LABEL: Record<CreditAccountType, string> = {
  trial: "Trial",
  paid: "Paid",
};

// The org's account type = its active credit account's type, or the latest
// account's type when none is active (e.g. an expired paid org still reads "Paid").
function accountType(c: Client): CreditAccountType | null {
  const active = activeCreditAccount(c);
  if (active) return active.type;
  const accts = c.creditAccounts ?? [];
  if (!accts.length) return null;
  return accts.reduce((m, x) => (x.index > m.index ? x : m)).type;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Modules enabled for an org, derived from its rate card (a module counts as
// on when any of its tracked meters is enabled).
function enabledModuleNames(c: Client): string[] {
  // The active credit account is the source of truth for modules.
  const active = activeCreditAccount(c);
  if (active) {
    return MODULE_CATALOG.filter((m) => active.enabledModuleIds.includes(m.id)).map((m) => m.name);
  }
  const b = c.billing;
  if (!b) return [];
  if (b.enabledModuleIds) {
    return MODULE_CATALOG.filter((m) => b.enabledModuleIds!.includes(m.id)).map((m) => m.name);
  }
  return MODULE_CATALOG.filter((m) => moduleMeterIds(m).some((id) => b.rateCard[id]?.enabled)).map(
    (m) => m.name,
  );
}

type OrgKind = "all" | "paid" | "trial";

const isTrial = (c: Client) => accountType(c) === "trial" || c.status === "Sandbox";

export default function OrganizationsListPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<OrgKind>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const counts = useMemo(
    () => ({
      all: clients.length,
      paid: clients.filter((c) => !isTrial(c)).length,
      trial: clients.filter(isTrial).length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (kind === "paid" && isTrial(c)) return false;
      if (kind === "trial" && !isTrial(c)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.orgId.toLowerCase().includes(q) ||
        (c.billing?.industry ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, kind]);

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-6">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-foreground">
            Organizations <span className="text-muted-foreground">({filtered.length})</span>
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Manage organizations, workspaces, modules, pricing, and users.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="relative w-[260px]">
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
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-[filter] hover:brightness-110"
          >
            <Plus size={14} strokeWidth={2.25} />
            New Organization
          </button>
        </div>
      </header>

      {/* Account-type filter */}
      <div className="mb-4 inline-flex items-center rounded-lg border border-border-subtle bg-secondary/40 p-1">
        {([
          { key: "all", label: "All", n: counts.all },
          { key: "paid", label: "Paid", n: counts.paid },
          { key: "trial", label: "Trial", n: counts.trial },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setKind(t.key)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
              kind === t.key
                ? "border border-primary/40 bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded px-1.5 text-[11px] tabular",
                kind === t.key ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground",
              )}
            >
              {t.n}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
        {/* Table */}
        <table className="w-full text-[13px]">
          <thead className="border-y border-border-subtle bg-muted/30">
            <tr>
              <Th>Name</Th>
              <Th>Org ID</Th>
              <Th>Created</Th>
              <Th>Industry</Th>
              <Th>Account</Th>
              <Th>Modules</Th>
              <Th align="right">Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-muted-foreground">
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
  const at = accountType(c);
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
        {at ? (
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-md px-2 py-[3px] text-[11.5px] font-medium",
              ACCOUNT_PILL[at],
            )}
          >
            {ACCOUNT_LABEL[at]}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
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
        <span
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-md px-2 py-[3px] text-[11.5px] font-medium",
            STATUS_PILL[displayStatus(c)],
          )}
        >
          {displayStatus(c)}
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
