"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  ChevronDown,
  Rocket,
  FileText,
  ArrowRight,
  Copy,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INDUSTRIES,
  ALL_MODULE_IDS,
  createOrgWithCreditAccount,
  addCreditAccount,
  activeCreditAccount,
  TRIAL_DEFAULT_DAYS,
  TRIAL_DAY_OPTIONS,
  MAX_CREDITS,
  clampCredits,
  type Industry,
  type Client,
  type CreditAccount,
  type CreditAccountType,
  type CreditAccountInput,
  type ConsumptionModel,
} from "@/lib/billing-data";

const today = () => new Date().toISOString().slice(0, 10);

/* ─── Entry points ────────────────────────────────────────────────────── */

/** New organization — opened from the listing. A new org is only ever Trial
 *  or Paid (never a renewal), so the type is a simple switch. */
export function CreateOrgModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell onClose={onClose}>
      <NewOrgForm onClose={onClose} />
    </Shell>
  );
}

/** "+ Credit Account" on an existing org — adds the next credit account. */
export function AddCreditAccountModal({
  org,
  defaultType,
  onClose,
  onAdded,
}: {
  org: Client;
  defaultType: CreditAccountType;
  onClose: () => void;
  onAdded: (account: CreditAccount) => void;
}) {
  return (
    <Shell onClose={onClose}>
      <AccountForm onClose={onClose} org={org} defaultType={defaultType} onAdded={onAdded} />
    </Shell>
  );
}

function Shell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] rounded-xl border border-border-subtle bg-card shadow-xl">
        {children}
      </div>
    </div>
  );
}

/* ─── New-org form (Trial / Paid via a switch) ────────────────────────── */

function NewOrgForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<Industry>(INDUSTRIES[0]);
  const [paid, setPaid] = useState(false); // false = trial — chosen first
  const [startDate, setStartDate] = useState(today);
  // Trial — one standard credit pool for the whole trial (admin sets it; 0–10k)
  const [credits, setCredits] = useState(0);
  const [days, setDays] = useState<number>(TRIAL_DEFAULT_DAYS);
  // Paid
  const [consumption, setConsumption] = useState<ConsumptionModel>("Prepaid");
  const [hasSubscriptionFee, setHasSubscriptionFee] = useState(false);
  const [months, setMonths] = useState(12);
  const [paidPerCycle, setPaidPerCycle] = useState(0);

  const isSubscription = consumption === "Postpaid" && hasSubscriptionFee;
  const canCreate = name.trim().length > 0;

  const create = () => {
    if (!canCreate) return;
    const account: CreditAccountInput = paid
      ? {
          type: "paid",
          startDate,
          // Prepaid: a credit pool. Postpaid: contract term, with an optional
          // per-cycle subscription fee (otherwise pure usage-billed PAYG).
          creditsPerCycle: consumption === "Postpaid" && !hasSubscriptionFee ? 0 : paidPerCycle,
          totalCredits:
            consumption === "Postpaid"
              ? hasSubscriptionFee
                ? paidPerCycle * months
                : 0
              : paidPerCycle,
          billingCycle: "Monthly",
          consumptionModel: consumption,
          ...(consumption === "Postpaid"
            ? { contractMonths: months, postpaidModel: hasSubscriptionFee ? "subscription" : "payg" }
            : {}),
          // Modules + pricing are defined on the credit account next.
          enabledModuleIds: [],
        }
      : {
          type: "trial",
          startDate,
          // One standard credit pool for the whole trial.
          creditsPerCycle: credits,
          totalCredits: credits,
          validityDays: days,
          enabledModuleIds: [...ALL_MODULE_IDS],
        };
    const { client } = createOrgWithCreditAccount({ name, industry, account });
    onClose();
    const caId = client.creditAccounts?.[0]?.id;
    // Paid lands straight in the account to define modules & pricing; trial opens the org.
    router.push(`/organizations/${client.id}${paid && caId ? `?account=${caId}` : ""}`);
  };

  return (
    <>
      <ModalHeader
        title="Create organization"
        subtitle="Set up a client organization and its first credit account."
        onClose={onClose}
      />
      <div className="max-h-[72vh] space-y-4 overflow-y-auto px-5 py-4">
        <Field label="Organization name" required>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brisk Logistics"
            className={inputClass}
          />
        </Field>
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-foreground">Industry</span>
          <IndustrySelect value={industry} onChange={setIndustry} />
        </div>

        {/* Account type chosen first — trial and paid configs differ */}
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-foreground">Account type</span>
          <div className="inline-flex h-9 w-full items-center rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setPaid(false)}
              className={cn(
                "inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded text-[12.5px] font-medium transition-colors",
                !paid ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Rocket size={13} strokeWidth={2} /> Trial
            </button>
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={cn(
                "inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded text-[12.5px] font-medium transition-colors",
                paid ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText size={13} strokeWidth={2} /> Paid
            </button>
          </div>
        </div>

        <Field label="Start date" hint="— when the credit system applies from">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={cn(inputClass, "tabular")}
          />
        </Field>

        {/* Trial config */}
        {!paid && (
          <div className="space-y-4 rounded-lg border border-border-subtle bg-secondary/30 p-3.5">
            <Field label="Credits (₹)" hint="— used across the whole trial">
              <input
                type="number"
                min={0}
                step={500}
                value={credits}
                max={MAX_CREDITS}
                onChange={(e) => setCredits(clampCredits(Number(e.target.value)))}
                className={cn(inputClass, "tabular")}
              />
            </Field>
            <Field label="Time period">
              <div className="inline-flex h-9 w-full items-center rounded-md border border-border p-0.5">
                {TRIAL_DAY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "h-full flex-1 rounded text-[12.5px] font-medium transition-colors",
                      days === d
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </Field>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              All modules on at default pricing · ends at ₹0 or after {days} days.
            </p>
          </div>
        )}

        {/* Paid config */}
        {paid && (
          <div className="space-y-4 rounded-lg border border-border-subtle bg-secondary/30 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-foreground">Billing cycle</span>
              <span className="rounded bg-card px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">Monthly</span>
            </div>
            <Field label="Consumption model">
              <div className="inline-flex h-9 w-full items-center rounded-md border border-border p-0.5">
                {(["Prepaid", "Postpaid"] as ConsumptionModel[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConsumption(m)}
                    className={cn(
                      "h-full flex-1 rounded text-[12.5px] font-medium transition-colors",
                      consumption === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            {consumption === "Prepaid" && (
              <Field label="Default credits (₹)">
                <input
                  type="number"
                  min={0}
                  step={500}
                  max={MAX_CREDITS}
                  value={paidPerCycle}
                  onChange={(e) => setPaidPerCycle(clampCredits(Number(e.target.value)))}
                  className={cn(inputClass, "tabular")}
                />
              </Field>
            )}
            {consumption === "Postpaid" && (
              <>
                <Field label="Contract duration (months)">
                  <input
                    type="number"
                    min={1}
                    value={months}
                    onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
                    className={cn(inputClass, "tabular")}
                  />
                </Field>
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={hasSubscriptionFee}
                    onChange={(e) => setHasSubscriptionFee(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-[12px] leading-snug text-foreground">
                    Charge a subscription fee each cycle
                    <span className="block text-[11px] text-muted-foreground">A fixed monthly amount, billed on top of usage.</span>
                  </span>
                </label>
                {hasSubscriptionFee && (
                  <Field label="Monthly subscription fee (₹)">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      max={MAX_CREDITS}
                      value={paidPerCycle}
                      onChange={(e) => setPaidPerCycle(clampCredits(Number(e.target.value)))}
                      className={cn(inputClass, "tabular")}
                    />
                  </Field>
                )}
              </>
            )}
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Next: enable modules and set their per-unit pricing on the credit account.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
        <button
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={create}
          disabled={!canCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {!paid && <Rocket size={14} strokeWidth={2} />}
          Create credit account
        </button>
      </div>
    </>
  );
}

/* ─── The form (shared by create-org and add-credit-account) ──────────── */

const PAID_DEFAULT_MONTHS = 12;

function AccountForm({
  onClose,
  org,
  defaultType = "trial",
  onAdded,
}: {
  onClose: () => void;
  org?: Client; // present → add-account mode
  defaultType?: CreditAccountType;
  onAdded?: (account: CreditAccount) => void;
}) {
  const router = useRouter();
  const addMode = !!org;
  const currentActive = org ? activeCreditAccount(org) : undefined;

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<Industry>(INDUSTRIES[0]);
  // Type is fixed by context: a trial can only become Paid; a paid org can only Renew.
  const account: CreditAccountType = defaultType;
  const [startDate, setStartDate] = useState(today);

  // Trial
  const [email, setEmail] = useState("");
  const [perCycle, setPerCycle] = useState(0);
  const [total, setTotal] = useState(0);
  const [days, setDays] = useState<number>(TRIAL_DEFAULT_DAYS);

  // Paid / Renewal
  const [consumption, setConsumption] = useState<ConsumptionModel>("Prepaid");
  const [hasSubscriptionFee, setHasSubscriptionFee] = useState(false);
  const [months, setMonths] = useState(PAID_DEFAULT_MONTHS);
  const [paidPerCycle, setPaidPerCycle] = useState(0);
  const isSubscription = consumption === "Postpaid" && hasSubscriptionFee;

  const [done, setDone] = useState<{ id: string; link: string } | null>(null);

  // In add-account mode the org already exists, so name/industry aren't asked.
  const nameOk = addMode || name.trim().length > 0;
  const canCreate = account === "trial" ? nameOk && /\S+@\S+\.\S+/.test(email) : nameOk;

  const buildInput = (): CreditAccountInput =>
    account === "trial"
      ? {
          type: "trial",
          startDate,
          creditsPerCycle: perCycle,
          totalCredits: total,
          validityDays: days,
          customerEmail: email,
          enabledModuleIds: [...ALL_MODULE_IDS],
        }
      : {
          type: account,
          startDate,
          // Prepaid: a credit pool. Postpaid: contract term, with an optional
          // per-cycle subscription fee (otherwise pure usage-billed PAYG).
          creditsPerCycle: consumption === "Postpaid" && !hasSubscriptionFee ? 0 : paidPerCycle,
          totalCredits:
            consumption === "Postpaid"
              ? hasSubscriptionFee
                ? paidPerCycle * months
                : 0
              : paidPerCycle,
          billingCycle: "Monthly",
          consumptionModel: consumption,
          ...(consumption === "Postpaid"
            ? { contractMonths: months, postpaidModel: hasSubscriptionFee ? "subscription" : "payg" }
            : {}),
          // Modules + pricing are defined on the account after creation.
          enabledModuleIds: [],
        };

  const create = () => {
    if (!canCreate) return;
    const input = buildInput();
    if (addMode) {
      const acc = addCreditAccount(org!.id, input);
      onClose();
      if (acc) onAdded?.(acc);
      return;
    }
    const { client, link } = createOrgWithCreditAccount({ name, industry, account: input });
    if (account === "trial") {
      setDone({ id: client.id, link });
    } else {
      onClose();
      router.push(`/organizations/${client.id}`);
    }
  };

  if (done) {
    return (
      <SandboxSuccess
        email={email}
        link={done.link}
        onOpen={() => {
          onClose();
          router.push(`/organizations/${done.id}`);
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <ModalHeader
        title={addMode ? "Add credit account" : "Create organization"}
        subtitle={
          addMode
            ? `Add the next credit account for ${org!.name}.`
            : "Set up a client organization and its first credit account."
        }
        onClose={onClose}
      />
      <div className="max-h-[72vh] space-y-4 overflow-y-auto px-5 py-4">
        {!addMode && (
          <>
            <Field label="Organization name" required>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brisk Logistics"
                className={inputClass}
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-foreground">Industry</span>
              <IndustrySelect value={industry} onChange={setIndustry} />
            </div>
          </>
        )}

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-foreground">Account type</span>
          <div className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 text-[13px] font-medium text-foreground">
            <FileText size={14} strokeWidth={2} />
            Paid
          </div>
        </div>

        <Field label="Start date" hint="— when this credit account goes active">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={cn(inputClass, "tabular")}
          />
        </Field>

        {addMode &&
          (() => {
            const future = startDate > today();
            const when = future
              ? `on ${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
              : "today";
            const activeLabel = currentActive ? (currentActive.type === "trial" ? "Trial" : "Paid") : null;
            return (
              <div className="rounded-lg border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-[12px] leading-relaxed text-foreground">
                This becomes the org's <span className="font-medium">active</span> credit account {when}.
                {activeLabel
                  ? future
                    ? ` The current ${activeLabel} account stays active until then, then ends — only one account is ever active.`
                    : ` The current ${activeLabel} account ends immediately — only one account is ever active.`
                  : ""}
              </div>
            );
          })()}

        {/* Trial — credit system */}
        {account === "trial" && (
          <div className="space-y-4 rounded-lg border border-border-subtle bg-secondary/30 p-3.5">
            <Field label="Customer email" required hint="— gets the access link">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@customer.com"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Credits per cycle (₹)">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={perCycle}
                  max={MAX_CREDITS}
                  onChange={(e) => setPerCycle(clampCredits(Number(e.target.value)))}
                  className={cn(inputClass, "tabular")}
                />
              </Field>
              <Field label="Total credits (₹)">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={total}
                  max={MAX_CREDITS}
                  onChange={(e) => setTotal(clampCredits(Number(e.target.value)))}
                  className={cn(inputClass, "tabular")}
                />
              </Field>
            </div>
            <Field label="Time period">
              <div className="inline-flex h-9 w-full items-center rounded-md border border-border p-0.5">
                {TRIAL_DAY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "h-full flex-1 rounded text-[12.5px] font-medium transition-colors",
                      days === d
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </Field>
            <div className="rounded-md bg-card px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
              All modules enabled at default pricing · the trial ends when credits hit ₹0 or after {days} days, whichever comes first.
            </div>
          </div>
        )}

        {/* Paid — billing terms */}
        {account === "paid" && (
          <div className="space-y-4 rounded-lg border border-border-subtle bg-secondary/30 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-foreground">Billing cycle</span>
              <span className="rounded bg-card px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">Monthly</span>
            </div>
            <Field label="Consumption model">
              <div className="inline-flex h-9 w-full items-center rounded-md border border-border p-0.5">
                {(["Prepaid", "Postpaid"] as ConsumptionModel[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConsumption(m)}
                    className={cn(
                      "h-full flex-1 rounded text-[12.5px] font-medium transition-colors",
                      consumption === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            {consumption === "Prepaid" && (
              <Field label="Default credits (₹)">
                <input
                  type="number"
                  min={0}
                  step={500}
                  max={MAX_CREDITS}
                  value={paidPerCycle}
                  onChange={(e) => setPaidPerCycle(clampCredits(Number(e.target.value)))}
                  className={cn(inputClass, "tabular")}
                />
              </Field>
            )}
            {consumption === "Postpaid" && (
              <>
                <Field label="Contract duration (months)">
                  <input
                    type="number"
                    min={1}
                    value={months}
                    onChange={(e) => setMonths(Math.max(1, Number(e.target.value)))}
                    className={cn(inputClass, "tabular")}
                  />
                </Field>
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={hasSubscriptionFee}
                    onChange={(e) => setHasSubscriptionFee(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-[12px] leading-snug text-foreground">
                    Charge a subscription fee each cycle
                    <span className="block text-[11px] text-muted-foreground">A fixed monthly amount, billed on top of usage.</span>
                  </span>
                </label>
                {hasSubscriptionFee && (
                  <Field label="Monthly subscription fee (₹)">
                    <input
                      type="number"
                      min={0}
                      step={500}
                      max={MAX_CREDITS}
                      value={paidPerCycle}
                      onChange={(e) => setPaidPerCycle(clampCredits(Number(e.target.value)))}
                      className={cn(inputClass, "tabular")}
                    />
                  </Field>
                )}
              </>
            )}
            <div className="rounded-md bg-card px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
              Modules and per-unit pricing are defined on this credit account after it's created.
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
        <button
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={create}
          disabled={!canCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {account === "trial" && <Rocket size={14} strokeWidth={2} />}
          Create credit account
        </button>
      </div>
    </>
  );
}

/* ─── Shared modal chrome ─────────────────────────────────────────────── */

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-4">
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[12px] font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
        {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ─── Trial success — share the access link ───────────────────────────── */

function SandboxSuccess({
  email,
  link,
  onOpen,
  onClose,
}: {
  email: string;
  link: string;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success-bg text-success">
          <Check size={15} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-foreground">Trial ready</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            All features are on for the trial. Share the link to get them started.
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-foreground">Customer access link</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className={cn(inputClass, "flex-1 font-mono text-[12px] text-muted-foreground")}
            />
            <button
              onClick={copy}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-[12.5px] font-medium text-foreground transition hover:bg-secondary"
            >
              {copied ? <Check size={14} strokeWidth={2.5} className="text-success" /> : <Copy size={14} strokeWidth={2} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Mail size={13} strokeWidth={1.75} />
          Also emailed to <span className="font-medium text-foreground">{email}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
        <button
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          Done
        </button>
        <button
          onClick={onOpen}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:brightness-110"
        >
          Open organization
          <ArrowRight size={14} strokeWidth={2} />
        </button>
      </div>
    </>
  );
}

const inputClass =
  "h-9 w-full rounded-md border border-border bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors focus-visible:border-foreground";

/* ─── Single-select dropdown for industry ─────────────────────────────── */

function IndustrySelect({ value, onChange }: { value: Industry; onChange: (v: Industry) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left")}
      >
        <span className="text-foreground">{value}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[260px] overflow-y-auto rounded-md border border-border bg-card py-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
          {INDUSTRIES.map((ind) => {
            const selected = ind === value;
            return (
              <button
                key={ind}
                type="button"
                onClick={() => {
                  onChange(ind);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2.5 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
              >
                <span className={cn("text-[13px] text-foreground", selected && "font-medium")}>{ind}</span>
                {selected && <Check size={14} strokeWidth={2.5} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
