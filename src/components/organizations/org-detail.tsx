"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  Users,
  Coins,
  Clock,
  Plus,
  X,
  Rocket,
  FileText,
  Check,
  CreditCard,
  CalendarPlus,
  Wallet,
  Lock,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MEMBER_ROLES,
  MODULE_CATALOG,
  makeWorkspaceId,
  makeMemberId,
  activeCreditAccount,
  creditAccountStatus,
  creditAccountOverview,
  nextAccountType,
  nextBillingDate,
  billingCycles,
  setCycleInvoice,
  extendCreditAccount,
  addCreditAccountCredits,
  MAX_CREDITS,
  clampCredits,
  type CreditAccountStatus,
  type TrialUsage,
  EMPTY_TRIAL_USAGE,
  type Client,
  type Workspace,
  type OrgMember,
  type CreditAccount,
  type CreditAccountType,
} from "@/lib/billing-data";
import { ModulesPricing, useModuleConfig } from "./modules-pricing";
import { AddCreditAccountModal } from "./create-org-modal";

type OrgTab = "credit" | "workspaces" | "members";

const ACCT_PILL: Record<CreditAccountType, string> = {
  trial: "bg-primary-soft text-primary",
  paid: "bg-secondary text-foreground",
};
const ACCT_LABEL: Record<CreditAccountType, string> = {
  trial: "Trial",
  paid: "Paid",
};
const ACCT_ICON: Record<CreditAccountType, typeof Rocket> = {
  trial: Rocket,
  paid: FileText,
};

const STATUS_STYLE: Record<CreditAccountStatus, string> = {
  draft: "bg-warning-bg text-warning",
  active: "bg-success-bg text-success",
  scheduled: "bg-primary-soft text-primary",
  ended: "bg-secondary text-muted-foreground",
};
const STATUS_LABEL: Record<CreditAccountStatus, string> = {
  draft: "Draft",
  active: "Active",
  scheduled: "Scheduled",
  ended: "Ended",
};

const fmtDate = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Organization detail — tabs: Credit · Workspaces · Members. The Credit tab
 * lists the org's versioned credit accounts (Trial → Paid → Renewal); clicking
 * one opens its config + Modules + Pricing. "+ Credit Account" adds the next.
 */
export function OrgDetail({ client }: { client: Client }) {
  const billing = client.billing!;
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<OrgTab>("credit");
  // ?account=<id> opens straight into that credit account (e.g. after creating a paid org).
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("account"));
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((s) => (s === msg ? null : s)), 2200);
  };

  const accounts = [...(client.creditAccounts ?? [])].sort((a, b) => b.index - a.index);
  const active = activeCreditAccount(client);
  const openAccount = openId ? accounts.find((a) => a.id === openId) : null;

  const TABS: { key: OrgTab; label: string; badge: number; icon: typeof CreditCard }[] = [
    { key: "credit", label: "Credit", badge: accounts.length, icon: CreditCard },
    { key: "workspaces", label: "Workspaces", badge: billing.workspaces.length, icon: Building2 },
    { key: "members", label: "Members", badge: billing.members.length, icon: Users },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-8 py-6">
      {/* Header */}
      <div className="mb-1.5 flex items-start gap-3">
        <Link
          href="/organizations"
          aria-label="Back to organizations"
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-secondary"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Building2 size={20} strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold text-foreground">{client.name}</h1>
            {active ? (
              <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", ACCT_PILL[active.type])}>
                {ACCT_LABEL[active.type]}
              </span>
            ) : (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            <span className="tabular">{client.id}</span>
            {client.primaryContact && (
              <>
                <span className="px-2 text-border">·</span>
                {client.primaryContact}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 mt-5 overflow-x-auto rounded-lg border border-border-subtle bg-secondary/40 p-1">
        <div className="flex min-w-max items-center gap-1">
          {TABS.map(({ key, label, badge, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                if (key !== "credit") setOpenId(null);
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors",
                tab === key
                  ? "border border-primary/40 bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
              <span
                className={cn(
                  "rounded px-1.5 text-[11px] tabular",
                  tab === key ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground",
                )}
              >
                {badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "credit" &&
        (openAccount ? (
          <CreditAccountView
            client={client}
            account={openAccount}
            onBack={() => setOpenId(null)}
            onChanged={rerender}
            flash={flash}
            onSaved={() => setOpenId(null)}
          />
        ) : (
          <CreditTab
            client={client}
            accounts={accounts}
            onOpen={setOpenId}
            onAdd={() => setAddOpen(true)}
          />
        ))}
      {tab === "workspaces" && <WorkspacesTab client={client} />}
      {tab === "members" && <MembersTab client={client} flash={flash} />}

      {addOpen && (
        <AddCreditAccountModal
          org={client}
          defaultType={nextAccountType(client)}
          onClose={() => setAddOpen(false)}
          onAdded={(acc) => {
            rerender();
            setTab("credit");
            setOpenId(acc.id);
            flash(`Credit Account ${acc.index} created`);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-foreground px-4 py-2.5 text-[13px] font-medium text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─── Credit tab — list of credit accounts ────────────────────────────── */

function CreditTab({
  client,
  accounts,
  onOpen,
  onAdd,
}: {
  client: Client;
  accounts: CreditAccount[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Credit accounts</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Only one account is active at a time. Older accounts are kept as history.
          </p>
        </div>
        <PrimaryButton onClick={onAdd}>
          <Plus size={14} strokeWidth={2.25} /> Create credit account
        </PrimaryButton>
      </div>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
        {accounts.length === 0 ? (
          <Empty
            icon={<CreditCard size={18} strokeWidth={1.75} />}
            text="No credit account yet."
            actionLabel="Create credit account"
            onAction={onAdd}
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30">
              <tr>
                <Th>Account</Th>
                <Th>Type</Th>
                <Th>Term</Th>
                <Th>Credits</Th>
                <Th>Next billing</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <CreditAccountRow key={a.id} client={client} account={a} onOpen={() => onOpen(a.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CreditAccountRow({
  client,
  account,
  onOpen,
}: {
  client: Client;
  account: CreditAccount;
  onOpen: () => void;
}) {
  const status = creditAccountStatus(client, account);
  const isSubscription = account.consumptionModel === "Postpaid" && account.postpaidModel === "subscription";
  const term =
    account.type === "trial"
      ? `${account.validityDays}-day trial`
      : isSubscription
        ? `${account.contractMonths}-month contract`
        : account.consumptionModel === "Postpaid"
          ? "Pay as you go"
          : "Prepaid";
  const credits =
    account.type === "trial"
      ? `₹${account.creditsUsed.toLocaleString("en-IN")} / ₹${account.totalCredits.toLocaleString("en-IN")}`
      : isSubscription
        ? `₹${account.creditsPerCycle.toLocaleString("en-IN")} / cycle`
        : `₹${account.creditsPerCycle.toLocaleString("en-IN")}`;
  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/30"
    >
      <td className="px-5 py-3 font-medium text-foreground">Credit Account {account.index}</td>
      <td className="px-5 py-3">
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", ACCT_PILL[account.type])}>
          {ACCT_LABEL[account.type]}
        </span>
      </td>
      <td className="px-5 py-3 text-muted-foreground">{term}</td>
      <td className="px-5 py-3 tabular text-muted-foreground">{credits}</td>
      <td className="px-5 py-3 tabular text-muted-foreground">{fmtDate(nextBillingDate(client, account))}</td>
      <td className="px-5 py-3">
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[status])}>
          {STATUS_LABEL[status]}
        </span>
      </td>
    </tr>
  );
}

/* ─── Credit account detail — config + modules + pricing ──────────────── */

function CreditAccountView({
  client,
  account,
  onBack,
  onChanged,
  flash,
  onSaved,
}: {
  client: Client;
  account: CreditAccount;
  onBack: () => void;
  onChanged: () => void;
  flash: (m: string) => void;
  onSaved: () => void;
}) {
  const baseConfig = useModuleConfig(account);
  const status = creditAccountStatus(client, account);
  const ended = status === "ended";
  const isTrial = account.type === "trial";
  const locked = !isTrial && !!account.pricingLocked;
  const isPrepaid = account.consumptionModel === "Prepaid";
  const cycles = billingCycles(account);
  const config = baseConfig;
  const isDraft = status === "draft"; // paid, not yet confirmed/activated
  // Pricing/modules are read-only once active (locked) or ended; editable while draft.
  const frozen = locked || ended;
  const enabledCount = MODULE_CATALOG.filter(config.isModuleOn).length;

  const addCredits = (amount: number) => {
    addCreditAccountCredits(client.id, account.id, amount);
    onChanged();
    flash(`Added ₹${amount.toLocaleString("en-IN")} in credits`);
  };
  const extend = (days: number) => {
    extendCreditAccount(client.id, account.id, days);
    onChanged();
    flash(`Extended by ${days} days`);
  };
  // A paid account goes live only once its modules + pricing are confirmed.
  const activate = () => {
    account.pricingLocked = true;
    flash(`Credit Account ${account.index} activated.`);
    onSaved();
  };

  const modulesAction = isDraft ? (
    <button
      onClick={activate}
      disabled={enabledCount === 0}
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3.5 text-[12.5px] font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Check size={14} strokeWidth={2.5} />
      Confirm &amp; activate
    </button>
  ) : frozen ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[11.5px] font-medium text-muted-foreground">
      <Lock size={12} strokeWidth={2} />
      {ended ? "Ended" : "Locked"}
    </span>
  ) : undefined;

  return (
    <div>
      {/* Breadcrumb — single, clear path back to the credit list */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Credit accounts
        </button>
        <ChevronRight size={14} strokeWidth={2} className="text-border" />
        <span className="text-[15px] font-bold text-foreground">Credit Account {account.index}</span>
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", ACCT_PILL[account.type])}>
          {ACCT_LABEL[account.type]}
        </span>
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[status])}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {isTrial ? (
        <div className="space-y-4">
          {!ended && (
            <TrialPanel client={client} account={account} onAddCredits={addCredits} onExtend={extend} />
          )}
          <Section title="Modules & pricing">
            <ModulesPricing config={config} trial embedded />
          </Section>
        </div>
      ) : (
        <div className="space-y-4">
          {isDraft && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-bg/50 px-4 py-3">
              <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-warning" />
              <div className="text-[12.5px] leading-relaxed text-foreground">
                <span className="font-medium">This account isn’t active yet.</span> Enable the modules to include
                and set their per‑unit pricing below, then{" "}
                <span className="font-medium">Confirm &amp; activate</span> to make it live.
              </div>
            </div>
          )}
          {status === "active" && (
            <Section title="Credit usage">
              <CreditUsageContent client={client} account={account} onTopUp={addCredits} />
            </Section>
          )}
          <Section title="Billing details">
            <BillingDetailsContent client={client} account={account} />
          </Section>
          {cycles.length > 0 && (
            <Section title="Invoices" flush>
              <BillingCyclesTable
                account={account}
                embedded
                onUpload={(cycleIndex, file) => {
                  const url = URL.createObjectURL(file);
                  setCycleInvoice(client.id, account.id, cycleIndex, { name: file.name, url });
                  onChanged();
                  flash(`Invoice uploaded for Cycle ${cycleIndex}`);
                }}
              />
            </Section>
          )}
          <Section title="Modules & pricing" action={modulesAction}>
            {frozen && !ended && (
              <p className="mb-3 text-[12px] text-muted-foreground">
                Pricing is locked for this credit account. Create a new credit account to change it.
              </p>
            )}
            <ModulesPricing config={config} embedded disabled={frozen} />
          </Section>
        </div>
      )}
    </div>
  );
}

const fieldInput =
  "h-9 w-full rounded-md border border-border bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors focus-visible:border-foreground";

// Editable billing & credit config for a paid/renewal account — mutates the
// in-memory account. Read-only once the contract is locked or ended.
function PaidConfig({
  account,
  onChange,
  readOnly = false,
}: {
  account: CreditAccount;
  onChange: () => void;
  readOnly?: boolean;
}) {
  const set = (patch: Partial<CreditAccount>) => {
    Object.assign(account, patch);
    onChange();
  };
  const isPostpaid = account.consumptionModel === "Postpaid";
  const isSubscription = isPostpaid && account.postpaidModel === "subscription";
  const creditsLabel = isSubscription ? "Credits per cycle (₹)" : "Default credits (₹)";
  if (readOnly) {
    const consumptionText = isPostpaid
      ? `Postpaid · ${account.postpaidModel === "payg" ? "Pay-as-you-go" : "Subscription"}`
      : account.consumptionModel ?? "—";
    const rows: { label: string; value: string }[] = [
      { label: "Start date", value: account.startDate },
      { label: "Billing cycle", value: account.billingCycle ?? "Monthly" },
      { label: "Consumption model", value: consumptionText },
      ...(isSubscription ? [{ label: "Contract duration", value: `${account.contractMonths ?? 0} months` }] : []),
      { label: isSubscription ? "Credits per cycle" : "Default credits", value: `₹${account.creditsPerCycle.toLocaleString("en-IN")}` },
      ...(isSubscription ? [{ label: "Monthly credit lapse", value: account.monthlyCreditLapse ? "On" : "Off" }] : []),
    ];
    return (
      <div className="rounded-xl border border-border-subtle bg-card">
        <div className="border-b border-border-subtle px-4 py-3 text-[13.5px] font-semibold text-foreground">
          Billing &amp; credit
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="text-[11px] text-muted-foreground">{r.label}</div>
              <div className="mt-0.5 text-[13px] font-medium tabular text-foreground">{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border-subtle bg-card">
      <div className="border-b border-border-subtle px-4 py-3 text-[13.5px] font-semibold text-foreground">
        Billing &amp; credit
      </div>
      <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Start date</span>
          <input
            type="date"
            value={account.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
            className={cn(fieldInput, "tabular")}
          />
        </label>
        <div>
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Billing cycle</span>
          <div className="flex h-9 items-center rounded-md border border-border bg-secondary/40 px-2.5 text-[13px] text-muted-foreground">
            Monthly
          </div>
        </div>
        <div className={cn(isPostpaid && "sm:col-span-2")}>
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Consumption model</span>
          <div className="inline-flex h-9 w-full max-w-[320px] items-center rounded-md border border-border p-0.5">
            {(["Prepaid", "Postpaid"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  set(
                    m === "Postpaid"
                      ? { consumptionModel: "Postpaid", postpaidModel: account.postpaidModel ?? "subscription" }
                      : { consumptionModel: "Prepaid" },
                  )
                }
                className={cn(
                  "h-full flex-1 rounded text-[12.5px] font-medium transition-colors",
                  account.consumptionModel === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          {isPostpaid && (
            <div className="mt-2 ml-3 space-y-1.5 border-l-2 border-border pl-3.5">
              <span className="block text-[11.5px] font-medium text-muted-foreground">Postpaid model</span>
              <div className="inline-flex h-9 w-full max-w-[320px] items-center rounded-md border border-border p-0.5">
                {([
                  { v: "payg", l: "Pay as you go" },
                  { v: "subscription", l: "Subscription" },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set({ postpaidModel: o.v })}
                    className={cn(
                      "h-full flex-1 rounded text-[12px] font-medium transition-colors",
                      account.postpaidModel === o.v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isSubscription && (
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] text-muted-foreground">Contract duration (months)</span>
            <input
              type="number"
              min={1}
              value={account.contractMonths ?? 12}
              onChange={(e) => set({ contractMonths: Math.max(1, Number(e.target.value)) })}
              className={cn(fieldInput, "tabular")}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[11.5px] text-muted-foreground">{creditsLabel}</span>
          <input
            type="number"
            min={0}
            max={MAX_CREDITS}
            step={500}
            value={account.creditsPerCycle}
            onChange={(e) => set({ creditsPerCycle: clampCredits(Number(e.target.value)) })}
            className={cn(fieldInput, "tabular")}
          />
        </label>
        {isSubscription && (
          <label className="flex items-center gap-2.5 sm:pt-6">
            <input
              type="checkbox"
              checked={!!account.monthlyCreditLapse}
              onChange={(e) => set({ monthlyCreditLapse: e.target.checked })}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="text-[12.5px] text-foreground">Monthly credit lapse</span>
          </label>
        )}
        {!isSubscription && (
          <p className="text-[11.5px] leading-relaxed text-muted-foreground sm:col-span-2">
            {isPostpaid
              ? "Pay-as-you-go — billed for usage each cycle; no fixed contract term."
              : "Prepaid — default credits paid upfront; recharge when they run out."}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Usage panel (engagement KPIs, shared by trial + paid) ───────────── */

function lastActiveLabel(daysAgo: number): string {
  return daysAgo < 0 ? "Not yet" : daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
}

// Whether an account has any real activity worth showing (avoid all-zero rows).
function hasUsage(u?: TrialUsage): boolean {
  return !!u && (u.actions > 0 || u.activeMembers > 0 || u.lastActiveDaysAgo >= 0);
}
const moduleName = (id: string) => MODULE_CATALOG.find((m) => m.id === id)?.name ?? id;

function PaidCreditPanel({
  client,
  account,
  onAddCredits,
}: {
  client: Client;
  account: CreditAccount;
  onAddCredits: (n: number) => void;
}) {
  const o = creditAccountOverview(client, account);
  const usage = account.usage ?? EMPTY_TRIAL_USAGE;
  const totalMembers = client.billing!.members.length;
  const isPrepaid = account.consumptionModel === "Prepaid";
  const hasContract = o.daysTotal > 0;
  const [menu, setMenu] = useState(false);

  const creditBar = o.expired ? "bg-destructive" : o.creditsPct <= 15 ? "bg-warning" : "bg-primary";
  const timeBar = o.expired ? "bg-destructive" : o.daysLeft <= 5 ? "bg-warning" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-border-subtle bg-card">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 pt-3.5">
        <span className="text-[13px] font-semibold text-foreground">Credits &amp; usage</span>
        {isPrepaid && (
          <div className="relative ml-auto">
            <button
              onClick={() => setMenu((m) => !m)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition hover:bg-secondary"
            >
              <Wallet size={13} strokeWidth={2} />
              Add credits
            </button>
            {menu && (
              <QuickMenu
                options={[
                  { l: "+ ₹500", v: 500 },
                  { l: "+ ₹1,000", v: 1000 },
                  { l: "+ ₹5,000", v: 5000 },
                ]}
                customLabel="Custom ₹"
                onPick={(v) => {
                  onAddCredits(v);
                  setMenu(false);
                }}
                onClose={() => setMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-4 px-4 py-3.5 sm:grid-cols-2">
        <Meter
          label="Credits used"
          icon={<Coins size={13} strokeWidth={1.75} />}
          iconClass="bg-primary-soft text-primary"
          value={`₹${o.creditsUsed.toLocaleString("en-IN")} / ₹${o.creditsTotal.toLocaleString("en-IN")}`}
          caption={`₹${o.creditsLeft.toLocaleString("en-IN")} left`}
          pct={o.usedPct}
          barClass={creditBar}
        />
        {hasContract && (
          <Meter
            label="Contract"
            icon={<Clock size={13} strokeWidth={1.75} />}
            iconClass="bg-emerald-50 text-emerald-600"
            value={`Day ${o.daysElapsed} of ${o.daysTotal}`}
            caption={o.expired ? "0 days left" : `${o.daysLeft} days left`}
            pct={o.daysTotal > 0 ? Math.round((o.daysElapsed / o.daysTotal) * 100) : 0}
            barClass={timeBar}
          />
        )}
      </div>

      {hasUsage(usage) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle px-4 py-2.5">
          <Kpi label="Actions run" value={usage.actions.toLocaleString("en-IN")} />
          <Kpi label="Active members" value={`${usage.activeMembers} of ${totalMembers}`} />
          <Kpi label="DAU" value={`${usage.dau}/day`} />
          <Kpi label="Daily use" value={`${usage.dailyUsageMin} min`} />
          <Kpi label="Last active" value={lastActiveLabel(usage.lastActiveDaysAgo)} />
          {usage.trend.length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              7-day
              <Sparkline data={usage.trend} />
            </span>
          )}
        </div>
      )}
      {usage.byModule.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border-subtle px-4 py-2.5 text-[12px]">
          <span className="text-muted-foreground">Most used</span>
          <span className="font-medium text-foreground">{moduleName(usage.byModule[0].moduleId)}</span>
          <span className="text-muted-foreground tabular">{usage.byModule[0].pct}%</span>
          {usage.byModule.slice(1, 3).map((m) => (
            <span key={m.moduleId} className="text-muted-foreground">
              · {moduleName(m.moduleId)} <span className="tabular">{m.pct}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Billing cycles (paid) — money used per cycle + invoice download ──── */

function BillingCyclesTable({
  account,
  onUpload,
  embedded = false,
}: {
  account: CreditAccount;
  onUpload: (cycleIndex: number, file: File) => void;
  embedded?: boolean;
}) {
  const cycles = billingCycles(account);
  if (!cycles.length) return null;
  const pick = (cycleIndex: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(cycleIndex, f);
    e.currentTarget.value = "";
  };
  return (
    <div className={cn(!embedded && "overflow-hidden rounded-xl border border-border-subtle bg-card")}>
      {!embedded && (
        <div className="border-b border-border-subtle px-4 py-3 text-[13.5px] font-semibold text-foreground">
          Billing cycles
        </div>
      )}
      <p className="px-5 pt-3 text-[11.5px] text-muted-foreground">
        Invoicing runs in Zoho — upload each cycle&apos;s invoice (PDF) here.
      </p>
      <table className="w-full text-[13px]">
        <thead className="bg-muted/30">
          <tr>
            <Th>Cycle</Th>
            <Th>Period</Th>
            <Th>Used</Th>
            <Th>Invoice</Th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((cy) => {
            const inv = account.invoices?.[cy.index];
            return (
              <tr key={cy.index} className="border-t border-border">
                <td className="px-5 py-3">
                  <span className="font-medium text-foreground">Cycle {cy.index}</span>
                  {cy.status === "current" && (
                    <span className="ml-2 rounded bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-medium text-primary">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 tabular text-muted-foreground">
                  {fmtDate(cy.start)} – {fmtDate(cy.end)}
                </td>
                <td className="px-5 py-3 tabular text-foreground">₹{cy.creditsUsed.toLocaleString("en-IN")}</td>
                <td className="px-5 py-3">
                  {inv ? (
                    <div className="flex items-center gap-3">
                      <a
                        href={inv.url}
                        download={inv.name}
                        className="inline-flex max-w-[200px] items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-foreground transition hover:bg-secondary"
                      >
                        <Download size={13} strokeWidth={2} className="shrink-0" />
                        <span className="truncate">{inv.name}</span>
                      </a>
                      <label className="cursor-pointer text-[11.5px] text-muted-foreground transition-colors hover:text-foreground">
                        Replace
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={pick(cy.index)} />
                      </label>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-foreground transition hover:bg-secondary">
                      <Upload size={13} strokeWidth={2} />
                      Upload invoice
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={pick(cy.index)} />
                    </label>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Collapsible section + paid display cards ────────────────────────── */

function Section({
  title,
  action,
  children,
  defaultOpen = true,
  flush = false,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  flush?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown
            size={16}
            strokeWidth={2.25}
            className={cn("text-muted-foreground transition-transform", !open && "-rotate-90")}
          />
          <span className="text-[14px] font-semibold text-foreground">{title}</span>
        </button>
        {action}
      </div>
      {open && (
        <div className={cn("border-t border-border-subtle", flush ? "" : "px-5 py-4")}>{children}</div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-[16px] font-bold tabular text-foreground", accent)}>{value}</div>
    </div>
  );
}

// Inline top-up — CSM enters an amount and confirms, with quick-fill chips.
function TopUpForm({ onTopUp }: { onTopUp: (n: number) => void }) {
  const [amount, setAmount] = useState("");
  const confirm = () => {
    const n = Number(amount);
    if (n > 0) {
      onTopUp(n);
      setAmount("");
    }
  };
  return (
    <div className="rounded-lg border border-border-subtle bg-secondary/30 p-4">
      <div className="text-[12.5px] font-semibold text-foreground">Top up credits</div>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">How much would you like to add to the balance?</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[500, 1000, 5000].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            className="rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            ₹{v.toLocaleString("en-IN")}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">₹</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
            placeholder="Amount"
            className="h-9 w-full rounded-md border border-border bg-transparent pl-6 pr-2.5 text-[13px] tabular outline-none focus-visible:border-foreground"
          />
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={!amount}
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}

// Self-explanatory meter: total on top, a bar (filled = used), and a legend
// tying the filled colour to "used" and the empty track to "remaining".
function UsageMeter({
  total,
  totalLabel,
  used,
  remaining,
  barClass,
}: {
  total: number;
  totalLabel: string;
  used: number;
  remaining: number;
  barClass: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((Math.min(used, total) / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">{totalLabel}</span>
        <span className="text-[13.5px] font-semibold tabular text-foreground">₹{total.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-sm", barClass)} />
          <span className="font-semibold tabular text-foreground">₹{used.toLocaleString("en-IN")}</span>
          <span className="text-muted-foreground">used</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-secondary ring-1 ring-inset ring-border" />
          <span className="font-semibold tabular text-foreground">₹{remaining.toLocaleString("en-IN")}</span>
          <span className="text-muted-foreground">remaining</span>
        </span>
      </div>
    </div>
  );
}

function CreditUsageContent({
  client,
  account,
  onTopUp,
}: {
  client: Client;
  account: CreditAccount;
  onTopUp: (n: number) => void;
}) {
  const isPrepaid = account.consumptionModel === "Prepaid";
  const isSubscription = account.consumptionModel === "Postpaid" && account.postpaidModel === "subscription";
  const canTopUp = isPrepaid || isSubscription; // PAYG is billed for usage, nothing to top up

  let usage: React.ReactNode;
  if (isPrepaid) {
    const o = creditAccountOverview(client, account);
    usage = (
      <UsageMeter
        totalLabel="Credit balance"
        total={o.creditsTotal}
        used={o.creditsUsed}
        remaining={o.creditsLeft}
        barClass={o.creditsPct <= 15 ? "bg-warning" : "bg-primary"}
      />
    );
  } else {
    const cycles = billingCycles(account);
    const current = cycles.find((c) => c.status === "current") ?? cycles[0];
    const cycleLabel = current ? `Cycle ${current.index}` : "Current cycle";
    const used = current?.creditsUsed ?? account.creditsUsed;
    if (isSubscription) {
      const quota = account.creditsPerCycle;
      const within = Math.min(used, quota);
      const remaining = Math.max(0, quota - used);
      const overage = Math.max(0, used - quota);
      usage = (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            {cycleLabel} · pre-credited
          </div>
          <UsageMeter
            totalLabel="Pre-credited this cycle"
            total={quota}
            used={within}
            remaining={remaining}
            barClass={overage > 0 || remaining === 0 ? "bg-warning" : "bg-primary"}
          />
          {overage > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md bg-warning-bg px-3 py-2">
              <span className="text-[12px] font-medium text-warning">Overage (beyond pre-credit)</span>
              <span className="text-[13px] font-semibold tabular text-warning">+ ₹{overage.toLocaleString("en-IN")} billed on top</span>
            </div>
          )}
        </div>
      );
    } else {
      usage = (
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{cycleLabel}</div>
          <Stat label="Used this cycle" value={`₹${used.toLocaleString("en-IN")}`} />
          <p className="text-[11.5px] text-muted-foreground">Pay-as-you-go — billed for usage; no preset limit.</p>
        </div>
      );
    }
  }

  if (!canTopUp) return usage;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div>{usage}</div>
      <TopUpForm onTopUp={onTopUp} />
    </div>
  );
}

function BillingDetailsContent({ client, account }: { client: Client; account: CreditAccount }) {
  const isPrepaid = account.consumptionModel === "Prepaid";
  const isPostpaid = account.consumptionModel === "Postpaid";
  const isSubscription = isPostpaid && account.postpaidModel === "subscription";
  const consumptionText = isPrepaid
    ? "Prepaid"
    : `Postpaid · ${isSubscription ? "Subscription" : "Pay as you go"}`;
  const facts: { label: string; value: string }[] = [
    { label: "Consumption model", value: consumptionText },
    { label: "Billing cycle", value: account.billingCycle ?? "Monthly" },
    ...(isPrepaid
      ? [{ label: "Default credits", value: `₹${account.creditsPerCycle.toLocaleString("en-IN")}` }]
      : []),
    ...(isPostpaid ? [{ label: "Contract", value: `${account.contractMonths} months` }] : []),
    ...(isSubscription
      ? [{ label: "Monthly subscription fee", value: `₹${account.creditsPerCycle.toLocaleString("en-IN")}` }]
      : []),
    ...(isSubscription ? [{ label: "Next billing", value: fmtDate(nextBillingDate(client, account)) }] : []),
    { label: "Start date", value: fmtDate(account.startDate) },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label}>
          <div className="text-[11px] text-muted-foreground">{f.label}</div>
          <div className="mt-0.5 text-[13px] font-medium tabular text-foreground">{f.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Trial monitoring panel (CSM view) ───────────────────────────────── */

function TrialPanel({
  client,
  account,
  onAddCredits,
  onExtend,
}: {
  client: Client;
  account: CreditAccount;
  onAddCredits: (n: number) => void;
  onExtend: (n: number) => void;
}) {
  const o = creditAccountOverview(client, account);
  const [menu, setMenu] = useState<null | "credits" | "extend">(null);

  // Risk shows as one small chip — the surface itself stays neutral.
  const risk = o.expired
    ? { label: "Expired", cls: "bg-destructive-bg text-destructive" }
    : o.creditsPct <= 15
      ? { label: "Low credits", cls: "bg-warning-bg text-warning" }
      : o.daysLeft <= 5
        ? { label: `Ends in ${o.daysLeft}d`, cls: "bg-warning-bg text-warning" }
        : null;

  const creditBar = o.expired ? "bg-destructive" : o.creditsPct <= 15 ? "bg-warning" : "bg-primary";
  const timeBar = o.expired ? "bg-destructive" : o.daysLeft <= 5 ? "bg-warning" : "bg-emerald-500";

  return (
    <div className="mt-4 rounded-xl border border-border-subtle bg-card">
      {/* Header + actions */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-4 pt-3.5">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
          <Rocket size={14} strokeWidth={1.75} className="text-muted-foreground" />
          Free trial
        </span>
        {risk ? (
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", risk.cls)}>{risk.label}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">· Active</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMenu((m) => (m === "credits" ? null : "credits"))}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition hover:bg-secondary"
            >
              <Wallet size={13} strokeWidth={2} />
              Add credits
            </button>
            {menu === "credits" && (
              <QuickMenu
                options={[
                  { l: "+ ₹500", v: 500 },
                  { l: "+ ₹1,000", v: 1000 },
                  { l: "+ ₹5,000", v: 5000 },
                ]}
                customLabel="Custom ₹"
                onPick={(v) => {
                  onAddCredits(v);
                  setMenu(null);
                }}
                onClose={() => setMenu(null)}
              />
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setMenu((m) => (m === "extend" ? null : "extend"))}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[12.5px] font-medium text-foreground transition hover:bg-secondary"
            >
              <CalendarPlus size={13} strokeWidth={2} />
              Extend
            </button>
            {menu === "extend" && (
              <QuickMenu
                options={[
                  { l: "+ 15 days", v: 15 },
                  { l: "+ 30 days", v: 30 },
                  { l: "+ 90 days", v: 90 },
                ]}
                customLabel="Custom days"
                onPick={(v) => {
                  onExtend(v);
                  setMenu(null);
                }}
                onClose={() => setMenu(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Usage meters */}
      <div className="grid gap-x-6 gap-y-4 px-4 py-3.5 sm:grid-cols-2">
        <Meter
          label="Credits used"
          icon={<Coins size={13} strokeWidth={1.75} />}
          iconClass="bg-primary-soft text-primary"
          value={`₹${o.creditsUsed.toLocaleString("en-IN")} / ₹${o.creditsTotal.toLocaleString("en-IN")}`}
          caption={`₹${o.creditsLeft.toLocaleString("en-IN")} left`}
          pct={o.usedPct}
          barClass={creditBar}
        />
        <Meter
          label="Time used"
          icon={<Clock size={13} strokeWidth={1.75} />}
          iconClass="bg-emerald-50 text-emerald-600"
          value={`Day ${o.daysElapsed} of ${o.daysTotal}`}
          caption={o.expired ? "0 days left" : `${o.daysLeft} days left`}
          pct={o.daysTotal > 0 ? Math.round((o.daysElapsed / o.daysTotal) * 100) : 0}
          barClass={timeBar}
        />
      </div>

    </div>
  );
}

function Meter({
  label,
  value,
  caption,
  pct,
  barClass,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  caption: string;
  pct: number;
  barClass: string;
  icon?: React.ReactNode;
  iconClass?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground">
          {icon && (
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-md", iconClass)}>
              {icon}
            </span>
          )}
          {label}
        </span>
        <span className="text-[12.5px] font-medium tabular text-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${clamped}%` }} />
      </div>
      <div className="mt-1 text-[11.5px] tabular text-muted-foreground">{caption}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[12px] text-muted-foreground">
      {label} <span className="font-medium tabular text-foreground">{value}</span>
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 60;
  const h = 18;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-primary">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuickMenu({
  options,
  customLabel,
  onPick,
  onClose,
}: {
  options: { l: string; v: number }[];
  customLabel: string;
  onPick: (v: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const applyCustom = () => {
    const n = Number(custom);
    if (n > 0) onPick(n);
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-[calc(100%+4px)] z-30 w-[168px] rounded-md border border-border bg-card p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
    >
      {options.map((o) => (
        <button
          key={o.l}
          type="button"
          onClick={() => onPick(o.v)}
          className="block w-full rounded px-2.5 py-1.5 text-left text-[12.5px] text-foreground transition-colors hover:bg-secondary"
        >
          {o.l}
        </button>
      ))}
      <div className="mt-1 flex items-center gap-1 border-t border-border-subtle px-1 pt-1.5">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && applyCustom()}
          placeholder={customLabel}
          className="h-7 w-full rounded border border-border bg-transparent px-2 text-[12px] tabular outline-none focus-visible:border-foreground"
        />
        <button
          type="button"
          onClick={applyCustom}
          disabled={!custom}
          className="h-7 shrink-0 rounded bg-primary px-2 text-[12px] font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* ─── Workspaces tab (list + create) ──────────────────────────────────── */

function WorkspacesTab({ client }: { client: Client }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(client.billing!.workspaces);
  const [adding, setAdding] = useState(false);

  const addWorkspace = (name: string, description: string) =>
    setWorkspaces((prev) => [
      ...prev,
      { id: makeWorkspaceId(), name, description: description.trim() || undefined },
    ]);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Workspaces</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Client workspaces under this organization.
          </p>
        </div>
        <PrimaryButton onClick={() => setAdding(true)}>
          <Plus size={14} strokeWidth={2.25} /> Create workspace
        </PrimaryButton>
      </div>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
        {workspaces.length === 0 ? (
          <Empty
            icon={<Building2 size={18} strokeWidth={1.75} />}
            text="No workspaces yet."
            actionLabel="Create workspace"
            onAction={() => setAdding(true)}
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30">
              <tr>
                <Th>Name</Th>
                <Th>Description</Th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-foreground">{w.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{w.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <AddWorkspaceDialog
          onAdd={(name, description) => addWorkspace(name, description)}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

/* ─── Members tab (list + add) ────────────────────────────────────────── */

function MembersTab({ client, flash }: { client: Client; flash: (m: string) => void }) {
  const [members, setMembers] = useState<OrgMember[]>(client.billing!.members);
  const [adding, setAdding] = useState(false);
  const workspaces = client.billing!.workspaces;

  const addMember = (
    name: string,
    email: string,
    role: OrgMember["role"],
    workspaceAccess: "all" | string[],
  ) => {
    setMembers((prev) => [...prev, { id: makeMemberId(), name, email, role, sendInvite: true, workspaceAccess }]);
    flash(`Invite link sent by email to ${email}`);
  };

  const accessLabel = (m: OrgMember): string => {
    if (!m.workspaceAccess || m.workspaceAccess === "all") return "All workspaces";
    const names = workspaces.filter((w) => (m.workspaceAccess as string[]).includes(w.id)).map((w) => w.name);
    return names.length ? names.join(", ") : "—";
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Members</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            People with access to this organization.
          </p>
        </div>
        <PrimaryButton onClick={() => setAdding(true)}>
          <Plus size={14} strokeWidth={2.25} /> Add member
        </PrimaryButton>
      </div>
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
        {members.length === 0 ? (
          <Empty
            icon={<Users size={18} strokeWidth={1.75} />}
            text="No members yet."
            actionLabel="Add member"
            onAction={() => setAdding(true)}
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-muted/30">
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Workspace access</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.role}</td>
                  <td className="px-5 py-3 text-muted-foreground">{accessLabel(m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {adding && (
        <AddMemberDialog
          workspaces={workspaces}
          onAdd={addMember}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

/* ─── Add dialogs ─────────────────────────────────────────────────────── */

function AddWorkspaceDialog({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, description: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const canCreate = name.trim().length > 0;

  const submit = () => {
    if (!canCreate) return;
    onAdd(name.trim(), description);
    onClose();
  };

  return (
    <Dialog title="Create workspace" onClose={onClose}>
      <div className="space-y-4 px-5 py-4">
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Godrej Properties — Pune"
            className={inputClass}
          />
        </Field>
        <Field label="Description" hint="Optional">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. West region sales"
            className={inputClass}
          />
        </Field>
      </div>
      <DialogFooter onClose={onClose} onSubmit={submit} submitLabel="Create" disabled={!canCreate} />
    </Dialog>
  );
}

function AddMemberDialog({
  workspaces,
  onAdd,
  onClose,
}: {
  workspaces: Workspace[];
  onAdd: (name: string, email: string, role: OrgMember["role"], workspaceAccess: "all" | string[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMember["role"]>("Member");
  const [allWorkspaces, setAllWorkspaces] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleWs = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const accessOk = allWorkspaces || selected.length > 0;
  const canAdd = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && accessOk;

  const submit = () => {
    if (!canAdd) return;
    onAdd(name.trim(), email.trim(), role, allWorkspaces ? "all" : selected);
    onClose();
  };

  return (
    <Dialog title="Add member" onClose={onClose}>
      <div className="space-y-4 px-5 py-4">
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Neha Sharma"
            className={inputClass}
          />
        </Field>
        <Field label="Work email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="neha@revspot.ai"
            className={inputClass}
          />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as OrgMember["role"])}
            className={inputClass}
          >
            {MEMBER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-foreground">Workspace access</span>
          <div className="inline-flex h-9 w-full items-center rounded-md border border-border p-0.5">
            {([
              { v: true, l: "All workspaces" },
              { v: false, l: "Specific" },
            ] as const).map((o) => (
              <button
                key={o.l}
                type="button"
                onClick={() => setAllWorkspaces(o.v)}
                className={cn(
                  "h-full flex-1 rounded text-[12.5px] font-medium transition-colors",
                  allWorkspaces === o.v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.l}
              </button>
            ))}
          </div>
          {!allWorkspaces && (
            <div className="mt-2 space-y-1 rounded-md border border-border-subtle p-1.5">
              {workspaces.map((w) => {
                const on = selected.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWs(w.id)}
                    className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-secondary/60"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {on && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="text-[13px] text-foreground">{w.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <DialogFooter onClose={onClose} onSubmit={submit} submitLabel="Add member" disabled={!canAdd} />
    </Dialog>
  );
}

/* ─── Shared bits ─────────────────────────────────────────────────────── */

const inputClass =
  "h-9 w-full rounded-md border border-border bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors focus-visible:border-foreground";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-[12px] font-medium text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition hover:brightness-110"
    >
      {children}
    </button>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-xl border border-border-subtle bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogFooter({
  onClose,
  onSubmit,
  submitLabel,
  disabled,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
      <button
        onClick={onClose}
        className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="inline-flex h-9 items-center rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function Empty({
  icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-muted-foreground">
      {icon}
      <span className="text-[13px]">{text}</span>
      {actionLabel && onAction && (
        <PrimaryButton onClick={onAction}>
          <Plus size={14} strokeWidth={2.25} /> {actionLabel}
        </PrimaryButton>
      )}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
      {children}
    </th>
  );
}
