"use client";

import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { clients, type Client } from "@/lib/billing-data";
import { cn } from "@/lib/utils";

const statusStyles: Record<Client["status"], string> = {
  Active:      "bg-success-bg text-success border-success-bg",
  Onboarding:  "bg-warning-bg text-warning border-warning-bg",
  Suspended:   "bg-destructive-bg text-destructive border-destructive-bg",
};

export default function ClientsListPage() {
  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold text-foreground">Clients</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Onboard new clients and manage credit accounts, rate cards, and
          billing configuration.
        </p>
      </header>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[320px]">
          <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search clients…"
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
          />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/40">
            <tr>
              <Th>Client</Th>
              <Th>Organization ID</Th>
              <Th>Status</Th>
              <Th>Primary contact</Th>
              <Th>Credit account</Th>
              <Th align="right"></Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="font-medium text-foreground hover:text-primary">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <code className="text-[11.5px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {c.orgId}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex items-center border rounded-md px-2 py-[3px] text-[11.5px] font-medium", statusStyles[c.status])}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.primaryContact}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.billing ? "Active" : <span className="italic">Not configured</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/clients/${c.id}`}
                    className="inline-flex items-center gap-1 text-[12.5px] text-primary hover:underline underline-offset-2"
                  >
                    {c.billing ? "Manage" : "Onboard"}
                    <ArrowRight size={12} strokeWidth={2} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn("px-4 py-2.5 text-[12px] font-semibold text-muted-foreground whitespace-nowrap", align === "right" ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}
