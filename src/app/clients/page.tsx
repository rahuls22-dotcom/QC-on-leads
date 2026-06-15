"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, Plus, ChevronDown, Filter, X } from "lucide-react";
import {
  clients,
  estimateMonthlyCost,
  formatCredits,
  formatRupees,
  INDUSTRIES,
  type Client,
} from "@/lib/billing-data";
import { cn } from "@/lib/utils";

const statusStyles: Record<Client["status"], string> = {
  Active:     "bg-success-bg text-success border-success-bg",
  Onboarding: "bg-warning-bg text-warning border-warning-bg",
  Suspended:  "bg-destructive-bg text-destructive border-destructive-bg",
};

const STATUS_OPTIONS = ["All", "Onboarding", "Active", "Suspended"] as const;
const PAYMENT_OPTIONS = ["All", "Postpaid", "Prepaid"] as const;

interface Filters {
  industry: string;       // "All" or an industry
  kam: string;            // "All" or a KAM name
  payment: string;        // "All" / Postpaid / Prepaid
  status: string;         // "All" / Onboarding / Active / Suspended
}

const EMPTY_FILTERS: Filters = {
  industry: "All",
  kam: "All",
  payment: "All",
  status: "All",
};

export default function ClientsListPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersBtnRef = useRef<HTMLButtonElement | null>(null);

  // KAM options derived from the actual client data so the popover only
  // shows names that exist in the list.
  const kamOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of clients) {
      if (c.billing?.kam.name) set.add(c.billing.kam.name);
    }
    return ["All", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (filters.status   !== "All" && c.status              !== filters.status)   return false;
      if (filters.industry !== "All" && c.billing?.industry   !== filters.industry) return false;
      if (filters.kam      !== "All" && c.billing?.kam.name   !== filters.kam)      return false;
      if (filters.payment  !== "All" && c.billing?.billingType!== filters.payment)  return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.orgId.toLowerCase().includes(q) ||
        (c.primaryContact ?? "").toLowerCase().includes(q) ||
        (c.billing?.kam.name ?? "").toLowerCase().includes(q) ||
        (c.billing?.industry ?? "").toLowerCase().includes(q)
      );
    });
  }, [search, filters]);

  const activeFilterCount = useMemo(
    () => (Object.keys(EMPTY_FILTERS) as (keyof Filters)[])
      .filter((k) => filters[k] !== "All").length,
    [filters],
  );

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-foreground">Organization</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Onboard organizations and manage credit accounts, rate cards, and
            billing configuration.
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-[filter] shrink-0"
        >
          <Plus size={14} strokeWidth={2.25} />
          Create organization
        </Link>
      </header>

      {/* Filter bar — search + single Filters popover */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients, orgs, contacts, KAM…"
            className="h-9 w-full pl-9 pr-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
          />
        </div>

        {/* Single Filters button + popover */}
        <div className="relative">
          <button
            ref={filtersBtnRef}
            onClick={() => setFiltersOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-[13px] transition-colors",
              filtersOpen || activeFilterCount > 0
                ? "border-foreground bg-secondary text-foreground"
                : "border-border text-foreground hover:bg-secondary",
            )}
          >
            <Filter size={14} strokeWidth={2} />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-foreground text-background text-[10px] font-semibold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          <FiltersPopover
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            filters={filters}
            onChange={setFilters}
            kamOptions={kamOptions}
            anchorRef={filtersBtnRef}
          />
        </div>

        {/* Active filter chips — clickable to remove individually */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(filters) as (keyof Filters)[]).map((k) =>
              filters[k] === "All" ? null : (
                <button
                  key={k}
                  onClick={() => setFilters((f) => ({ ...f, [k]: "All" }))}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-secondary text-secondary-foreground text-[11.5px] font-medium hover:bg-muted"
                >
                  <span className="text-muted-foreground">{labelOf(k)}:</span>
                  {filters[k]}
                  <X size={11} strokeWidth={2.25} />
                </button>
              ),
            )}
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[12.5px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <table className="w-full text-[13px]">
          <thead className="bg-muted/40">
            <tr>
              <Th>Client</Th>
              <Th>Industry</Th>
              <Th>Status</Th>
              <Th>Primary contact</Th>
              <Th>Key Account Manager</Th>
              <Th align="right">Credit account</Th>
              <Th align="right"></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-[13px]">
                  No clients match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((c) => <ClientRow key={c.id} client={c} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[12px] text-muted-foreground mt-3 tabular">
        Showing <span className="text-foreground font-medium">{filtered.length}</span>
        {" "}of <span className="text-foreground font-medium">{clients.length}</span> client{clients.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function labelOf(key: keyof Filters): string {
  switch (key) {
    case "industry": return "Industry";
    case "kam":      return "KAM";
    case "payment":  return "Payment";
    case "status":   return "Status";
  }
}

// ── Filters popover ──────────────────────────────────────────────────────

function FiltersPopover({
  open,
  onClose,
  filters,
  onChange,
  kamOptions,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  kamOptions: string[];
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [activeKey, setActiveKey] = useState<keyof Filters | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (activeKey) setActiveKey(null);
        else onClose();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef, activeKey]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-[calc(100%+6px)] z-50 w-[340px] rounded-lg border border-border bg-card shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      role="dialog"
      aria-label="Filters"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <span className="text-[15px] font-semibold">Filters</span>
        <button
          onClick={() => { onChange(EMPTY_FILTERS); setActiveKey(null); }}
          className="text-[13px] text-primary hover:underline underline-offset-2"
        >
          Clear All
        </button>
      </div>

      <div className="px-3 py-3 space-y-2">
        <FilterPickerRow
          label="Industry"
          value={filters.industry}
          dirty={filters.industry !== "All"}
          openMenu={activeKey === "industry"}
          onToggle={() => setActiveKey((k) => (k === "industry" ? null : "industry"))}
          options={["All", ...INDUSTRIES]}
          onPick={(opt) => { onChange({ ...filters, industry: opt }); setActiveKey(null); }}
        />
        <FilterPickerRow
          label="Key Account Manager"
          value={filters.kam}
          dirty={filters.kam !== "All"}
          openMenu={activeKey === "kam"}
          onToggle={() => setActiveKey((k) => (k === "kam" ? null : "kam"))}
          options={kamOptions}
          onPick={(opt) => { onChange({ ...filters, kam: opt }); setActiveKey(null); }}
        />
        <FilterPickerRow
          label="Payment type"
          value={filters.payment}
          dirty={filters.payment !== "All"}
          openMenu={activeKey === "payment"}
          onToggle={() => setActiveKey((k) => (k === "payment" ? null : "payment"))}
          options={[...PAYMENT_OPTIONS]}
          onPick={(opt) => { onChange({ ...filters, payment: opt }); setActiveKey(null); }}
        />
        <FilterPickerRow
          label="Status"
          value={filters.status}
          dirty={filters.status !== "All"}
          openMenu={activeKey === "status"}
          onToggle={() => setActiveKey((k) => (k === "status" ? null : "status"))}
          options={[...STATUS_OPTIONS]}
          onPick={(opt) => { onChange({ ...filters, status: opt }); setActiveKey(null); }}
        />
      </div>
    </div>
  );
}

function FilterPickerRow({
  label,
  value,
  dirty,
  openMenu,
  onToggle,
  options,
  onPick,
}: {
  label: string;
  value: string;
  dirty: boolean;
  openMenu: boolean;
  onToggle: () => void;
  options: string[];
  onPick: (opt: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 h-10 rounded-md border bg-card text-left text-[13px] transition-colors",
          dirty ? "border-foreground" : "border-border hover:border-foreground/40",
        )}
      >
        <span className="text-foreground">
          {label}: <span className={dirty ? "font-medium" : "text-muted-foreground"}>{value}</span>
        </span>
        <ChevronDown size={13} strokeWidth={2} className={cn("text-muted-foreground transition-transform", openMenu && "rotate-180")} />
      </button>
      {openMenu && (
        <div className="absolute left-3 right-3 top-[calc(100%+4px)] z-10 rounded-lg border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-1.5 max-h-[260px] overflow-y-auto">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onPick(opt)}
                className={cn(
                  "block w-[calc(100%-12px)] mx-1.5 my-0.5 px-3 h-9 rounded-md text-left text-[13px] transition-colors",
                  active ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-secondary",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────

function ClientRow({ client }: { client: Client }) {
  const b = client.billing;
  const cost = b ? estimateMonthlyCost(b) : null;
  const productCount = b ? Object.values(b.rateCard).filter((r) => r.enabled).length : 0;

  return (
    <tr className="border-t border-border hover:bg-secondary/30 transition-colors">
      <td className="px-4 py-3">
        <Link href={`/clients/${client.id}`} className="block group">
          <div className="font-medium text-foreground group-hover:text-primary transition-colors">
            {client.name}
          </div>
          <code className="text-[10.5px] font-mono text-muted-foreground mt-0.5 inline-block">
            {client.orgId}
          </code>
        </Link>
      </td>
      <td className="px-4 py-3 text-foreground/85 whitespace-nowrap">
        {b?.industry ?? <span className="text-muted-foreground italic">—</span>}
      </td>
      <td className="px-4 py-3">
        <span className={cn("inline-flex items-center border rounded-md px-2 py-[3px] text-[11.5px] font-medium", statusStyles[client.status])}>
          {client.status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {client.primaryContact ?? <span className="italic">—</span>}
      </td>
      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
        {b?.kam.name ? (
          <>
            <div className="text-foreground/90">{b.kam.name}</div>
            <div className="text-[11.5px] text-muted-foreground">{b.kam.email}</div>
          </>
        ) : (
          <span className="italic">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        {cost ? (
          <>
            <div className="font-semibold text-foreground tabular">{formatRupees(cost.estTotal)}/mo</div>
            <div className="text-[11.5px] text-muted-foreground tabular">
              {formatCredits(cost.credits)} credits · {productCount} product{productCount !== 1 ? "s" : ""}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground italic">Not configured</span>
        )}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline underline-offset-2"
        >
          {b ? "Manage" : "Onboard"}
          <ArrowRight size={12} strokeWidth={2} />
        </Link>
      </td>
    </tr>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={cn("px-4 py-2.5 text-[12px] font-semibold text-muted-foreground whitespace-nowrap", align === "right" ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}
