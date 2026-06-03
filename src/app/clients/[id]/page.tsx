"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Settings as SettingsIcon,
  Users,
  Plus,
  Check,
  Trash2,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Calendar,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PRODUCT_CATALOGUE,
  MEMBER_ROLES,
  defaultBilling,
  estimateMonthlyCost,
  findClient,
  formatActivationDate,
  formatCredits,
  formatRupees,
  makeMemberId,
  type AccountType,
  type BillingCycle,
  type ClientBilling,
  type ConsumptionModel,
  type MemberRole,
  type OrgMember,
  type Product,
} from "@/lib/billing-data";

const TABS = [
  { id: "billing",  label: "Credits & Billing",     icon: CreditCard },
  { id: "config",   label: "Configuration",         icon: SettingsIcon },
  { id: "members",  label: "Organization Members",  icon: Users },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STEPS = [
  { id: 1, label: "Client details" },
  { id: 2, label: "Configuration & feature pricing" },
  { id: 3, label: "Organisation members" },
] as const;

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = findClient(id);
  if (!client) notFound();

  const [tab, setTab] = useState<TabId>("billing");
  const [billing, setBilling] = useState<ClientBilling>(
    client.billing ?? defaultBilling(),
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);
  // True once the user has completed onboarding (Confirm & Send Invites)
  // OR the client already has billing configured upstream.
  const [activated, setActivated] = useState<boolean>(Boolean(client.billing));
  const showWizard = !activated;

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-1.5">
        <Link
          href="/clients"
          aria-label="Back to clients"
          className="w-8 h-8 mt-0.5 rounded-md hover:bg-secondary text-foreground flex items-center justify-center"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-bold text-foreground">{client.name}</h1>
            <code className="text-[11.5px] font-mono px-2 py-[3px] rounded bg-secondary text-secondary-foreground">
              {client.orgId}
            </code>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            {showWizard
              ? "Onboarding flow — three steps to activate this client."
              : "Manage client settings, members, and configurations."}
          </p>
        </div>
      </div>

      {/* Top tabs — only shown once the client has been activated. During
          onboarding the wizard IS the navigation, so we don't double-up. */}
      {!showWizard && (
        <div className="border-b border-border mt-5 mb-6">
          <div className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 h-10 text-[13.5px] font-medium -mb-px transition-colors",
                    active
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showWizard ? (
        <div className="mt-6">
          <BillingWizard
            billing={billing}
            onChange={setBilling}
            onActivate={() => {
              const invites = billing.members.filter((m) => m.sendInvite && m.email).length;
              setActivated(true);
              setSavedToast(
                invites > 0
                  ? `Account activated — ${invites} invite${invites > 1 ? "s" : ""} sent.`
                  : "Account activated.",
              );
              setTimeout(() => setSavedToast(null), 3000);
            }}
          />
        </div>
      ) : (
        <>
          {tab === "billing" && <BillingSettings billing={billing} onChange={setBilling} />}
          {tab === "config" && <StubTab title="Configuration" hint="Workflow, integrations, and feature toggles per client." />}
          {tab === "members" && <MembersTab billing={billing} onChange={setBilling} />}
        </>
      )}

      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg text-success px-4 py-2.5 text-[13px] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
          <Check size={14} strokeWidth={2.25} />
          {savedToast}
        </div>
      )}
    </div>
  );
}

// ── Activated-mode views (no wizard chrome) ──────────────────────────────

/**
 * Billing tab once the client is activated. Renders the same sections as
 * Steps 1+2 of the wizard but flat — no stepper, no Next/Back. Edits save
 * directly to local state (real backend later).
 */
function BillingSettings({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  return (
    <div className="space-y-6 pb-10">
      <Step1 billing={billing} onChange={onChange} />
      <Step2 billing={billing} onChange={onChange} />
    </div>
  );
}

/**
 * Members tab — minimal post-activation view. Just the roster + add/remove,
 * no activation date or "review & activate" sections.
 */
function MembersTab({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const upd = <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) =>
    onChange({ ...billing, [k]: v });

  const updateMember = (idx: number, patch: Partial<OrgMember>) =>
    upd("members", billing.members.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  const addMember = () =>
    upd("members", [
      ...billing.members,
      { id: makeMemberId(), name: "", email: "", role: "Member", sendInvite: true },
    ]);
  const removeMember = (idx: number) =>
    upd("members", billing.members.filter((_, i) => i !== idx));

  return (
    <Section
      title="Organisation members"
      description="Manage who has access to this client's workspace. Invites can be sent for any new entries."
    >
      <div className="space-y-2">
        <div className="hidden md:grid grid-cols-[1.2fr_1.6fr_1.2fr_auto_auto] gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span className="text-center">Send invite</span>
          <span />
        </div>
        {billing.members.map((member, idx) => (
          <div
            key={member.id}
            className="grid grid-cols-1 md:grid-cols-[1.2fr_1.6fr_1.2fr_auto_auto] gap-2 items-center"
          >
            <input
              value={member.name}
              onChange={(e) => updateMember(idx, { name: e.target.value })}
              placeholder="Full name"
              className="h-10 px-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
            />
            <input
              value={member.email}
              onChange={(e) => updateMember(idx, { email: e.target.value })}
              placeholder="email@company.com"
              type="email"
              className="h-10 px-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
            />
            <SelectField
              value={member.role}
              options={MEMBER_ROLES}
              onChange={(v) => updateMember(idx, { role: v as MemberRole })}
              bare
            />
            <div className="flex items-center justify-center w-[88px] h-10">
              <Toggle
                checked={member.sendInvite}
                onChange={(on) => updateMember(idx, { sendInvite: on })}
                compact
              />
            </div>
            <button
              type="button"
              onClick={() => billing.members.length > 1 && removeMember(idx)}
              disabled={billing.members.length === 1}
              aria-label="Remove member"
              className="h-10 w-10 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addMember}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground"
        >
          <Plus size={13} strokeWidth={2} />
          Add another user
        </button>
      </div>
    </Section>
  );
}

// ── Wizard ───────────────────────────────────────────────────────────────

function BillingWizard({
  billing,
  onChange,
  onActivate,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
  onActivate: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Track which steps have been visited so the stepper can mark them complete.
  const [maxStep, setMaxStep] = useState<1 | 2 | 3>(1);
  const advance = (next: 1 | 2 | 3) => {
    setStep(next);
    if (next > maxStep) setMaxStep(next);
  };

  const stepValid = isStepValid(step, billing);

  return (
    <div>
      {/* Stepper */}
      <Stepper current={step} maxStep={maxStep} onJump={(s) => s <= maxStep && setStep(s)} />

      {/* Step content */}
      <div className="mt-6 space-y-6 pb-32">
        {step === 1 && <Step1 billing={billing} onChange={onChange} />}
        {step === 2 && <Step2 billing={billing} onChange={onChange} />}
        {step === 3 && <Step3 billing={billing} onChange={onChange} />}
      </div>

      {/* Sticky nav bar */}
      <div className="sticky bottom-4 z-30">
        <div className="rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)] px-5 py-3 flex items-center gap-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3)}
            style={step === 1 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Back
          </Button>
          {!stepValid && (
            <div className="text-[12px] text-warning">
              Complete required fields to continue
            </div>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              size="default"
              onClick={() => stepValid && advance((step + 1) as 1 | 2 | 3)}
              style={!stepValid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              Next
              <ChevronRight size={14} strokeWidth={2} />
            </Button>
          ) : (
            <Button
              size="default"
              onClick={() => stepValid && onActivate()}
              style={!stepValid ? { opacity: 0.5, pointerEvents: "none" } : undefined}
            >
              <Check size={14} strokeWidth={2.25} />
              Confirm & Send Invites
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function isStepValid(step: 1 | 2 | 3, b: ClientBilling): boolean {
  if (step === 1) {
    return (
      b.contractMonths > 0 &&
      b.initialCreditsPerCycle >= 0 &&
      b.globalDailyLimit >= 0
    );
  }
  if (step === 2) {
    // At least one product must be enabled with credits/unit > 0.
    return Object.values(b.rateCard).some((r) => r.enabled && r.creditsPerUnit > 0);
  }
  // Step 3: at least one member with name + valid-ish email + activation date set.
  return (
    !!b.activationDate &&
    b.members.some((m) => m.name.trim() !== "" && /.+@.+\..+/.test(m.email))
  );
}

function Stepper({
  current,
  maxStep,
  onJump,
}: {
  current: 1 | 2 | 3;
  maxStep: 1 | 2 | 3;
  onJump: (s: 1 | 2 | 3) => void;
}) {
  return (
    <ol className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const stepNum = s.id as 1 | 2 | 3;
        const state =
          stepNum < current ? "complete" :
          stepNum === current ? "current" :
          stepNum <= maxStep ? "visited" : "future";
        const reachable = stepNum <= maxStep;
        return (
          <li key={s.id} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}>
            <button
              type="button"
              onClick={() => reachable && onJump(stepNum)}
              disabled={!reachable}
              className={cn(
                "flex items-center gap-2.5 group disabled:cursor-default",
                reachable && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-semibold border-2 transition-colors",
                  state === "current" && "bg-primary text-primary-foreground border-primary",
                  state === "complete" && "bg-primary text-primary-foreground border-primary",
                  state === "visited" && "bg-card text-foreground border-primary",
                  state === "future" && "bg-card text-muted-foreground border-border",
                )}
              >
                {state === "complete" ? <Check size={13} strokeWidth={2.5} /> : s.id}
              </span>
              <span
                className={cn(
                  "text-[13px] font-medium",
                  state === "current" && "text-foreground",
                  (state === "complete" || state === "visited") && "text-foreground/80",
                  state === "future" && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-4",
                  stepNum < current ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Step 1 — Client details & billing cycle ──────────────────────────────

function Step1({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const upd = <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) =>
    onChange({ ...billing, [k]: v });

  return (
    <Section
      eyebrow="Step 1"
      title="Client details & billing cycle"
      description="Core contract parameters. These drive how credits are issued and when invoices land."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectField
          label="Account Type *"
          value={billing.accountType}
          options={["Sales & Outreach", "Recruitment", "Customer Support", "Custom"]}
          onChange={(v) => upd("accountType", v as AccountType)}
        />
        <SelectField
          label="Billing Cycle *"
          value={billing.billingCycle}
          options={["Monthly Billing", "Quarterly Billing", "Annual Billing"]}
          onChange={(v) => upd("billingCycle", v as BillingCycle)}
        />
        <SelectField
          label="Consumption Model *"
          value={billing.consumptionModel}
          options={["Postpaid (Quota)", "Prepaid (Wallet)"]}
          onChange={(v) => upd("consumptionModel", v as ConsumptionModel)}
        />
        <NumberField
          label="Contract Duration (Months) *"
          value={billing.contractMonths}
          min={1}
          onChange={(v) => upd("contractMonths", v)}
        />
        <NumberField
          label="Initial Credits Per Cycle *"
          value={billing.initialCreditsPerCycle}
          onChange={(v) => upd("initialCreditsPerCycle", v)}
        />
        <NumberField
          label="Global Daily Limit *"
          value={billing.globalDailyLimit}
          onChange={(v) => upd("globalDailyLimit", v)}
        />
      </div>

      <CheckboxRow
        checked={billing.enableMonthlyLapse}
        onChange={(v) => upd("enableMonthlyLapse", v)}
        label="Enable Monthly Credit Lapse"
        help="Unused credits will expire at the end of each billing cycle."
      />
    </Section>
  );
}

// ── Step 2 — Features & pricing ─────────────────────────────────────────

function Step2({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const upd = <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) =>
    onChange({ ...billing, [k]: v });

  return (
    <>
      <Section
        eyebrow="Step 2"
        title="Products & rate card"
        description="Toggle products on for this client and set credits-per-unit. Defaults came from the plan above."
      >
        <RateCardTable
          billing={billing}
          onChangeEnabled={(productId, enabled) =>
            upd("rateCard", { ...billing.rateCard, [productId]: { ...billing.rateCard[productId], enabled } })
          }
          onChangeCredits={(productId, credits) =>
            upd("rateCard", { ...billing.rateCard, [productId]: { ...billing.rateCard[productId], creditsPerUnit: credits } })
          }
        />
      </Section>

      <Section
        title="Credit pricing"
        description="Flat pay-as-you-go rate. No volume tiers — every credit costs the same."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            label="Rate (₹ / credit) *"
            value={billing.rupeesPerCredit}
            step={0.05}
            min={0}
            onChange={(v) => upd("rupeesPerCredit", v)}
            help="Charged for every credit used within the monthly cap."
          />
          <NumberField
            label="Overage rate (₹ / credit) *"
            value={billing.overageRupeesPerCredit}
            step={0.05}
            min={0}
            onChange={(v) => upd("overageRupeesPerCredit", v)}
            help="Charged on credits beyond the monthly cap."
          />
        </div>
      </Section>

      <Section
        title="Alerts, auto-recharge & expiry"
        description="Behaviour when the client approaches or exceeds their monthly cap."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-3">
            <Toggle
              label="Send usage alerts"
              checked={billing.alertThresholdsPct.length > 0}
              onChange={(on) => upd("alertThresholdsPct", on ? [75, 90] : [])}
              icon={<AlertTriangle size={13} strokeWidth={2} />}
            />
            <div className="pl-7 flex items-center gap-2 flex-wrap text-[12.5px] text-muted-foreground">
              Email alerts at
              <ThresholdPill value={75} active={billing.alertThresholdsPct.includes(75)} onClick={(v) => toggleThreshold(billing, v, upd)} />
              <ThresholdPill value={90} active={billing.alertThresholdsPct.includes(90)} onClick={(v) => toggleThreshold(billing, v, upd)} />
              <span>of monthly cap</span>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-3">
            <Toggle
              label="Auto-recharge"
              checked={billing.autoRechargeAtPct !== null}
              onChange={(on) => upd("autoRechargeAtPct", on ? 80 : null)}
              icon={<RefreshCw size={13} strokeWidth={2} />}
            />
            <div className="pl-7 flex items-center gap-2 text-[12.5px] text-muted-foreground">
              Trigger at
              <NumberInline
                value={billing.autoRechargeAtPct ?? 80}
                onChange={(v) => upd("autoRechargeAtPct", v)}
                disabled={billing.autoRechargeAtPct === null}
                suffix="%"
              />
              of monthly cap
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-3 md:col-span-2">
            <Toggle
              label="Roll over unused credits"
              checked={billing.rolloverEnabled}
              onChange={(on) => upd("rolloverEnabled", on)}
              icon={<TrendingDown size={13} strokeWidth={2} />}
            />
            <div className="pl-7 flex items-center gap-2 text-[12.5px] text-muted-foreground">
              Up to
              <NumberInline
                value={billing.rolloverCapCredits}
                onChange={(v) => upd("rolloverCapCredits", v)}
                disabled={!billing.rolloverEnabled}
                step={500}
              />
              credits/month
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

// ── Step 3 — Organisation members ────────────────────────────────────────

function Step3({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const upd = <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) =>
    onChange({ ...billing, [k]: v });

  // Seats are derived from members — every active user is a seat.
  const seats = Math.max(1, billing.members.length);
  // Keep `seatCount` in sync so the cost estimate uses the right number.
  useEffect(() => {
    if (billing.seatCount !== seats) upd("seatCount", seats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats, billing.seatCount]);

  const cost = estimateMonthlyCost({ ...billing, seatCount: seats });
  const enabledProducts = PRODUCT_CATALOGUE.filter((p) => billing.rateCard[p.id]?.enabled);
  const invitableCount = billing.members.filter((m) => m.sendInvite && m.email).length;
  const validMembers = billing.members.filter((m) => m.name.trim() && /.+@.+\..+/.test(m.email));

  const updateMember = (idx: number, patch: Partial<OrgMember>) =>
    upd("members", billing.members.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  const addMember = () =>
    upd("members", [
      ...billing.members,
      { id: makeMemberId(), name: "", email: "", role: "Member", sendInvite: true },
    ]);
  const removeMember = (idx: number) =>
    upd("members", billing.members.filter((_, i) => i !== idx));

  return (
    <>
      <Section
        eyebrow="Step 3"
        title="Organisation members"
        description="Add the users who'll have access to this client's workspace. Invites go out when you confirm at the bottom."
      >
        <div className="space-y-2">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-[1.2fr_1.6fr_1.2fr_auto_auto] gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span className="text-center">Send invite</span>
            <span />
          </div>

          {billing.members.map((member, idx) => (
            <div
              key={member.id}
              className="grid grid-cols-1 md:grid-cols-[1.2fr_1.6fr_1.2fr_auto_auto] gap-2 items-center"
            >
              <input
                value={member.name}
                onChange={(e) => updateMember(idx, { name: e.target.value })}
                placeholder="Full name"
                className="h-10 px-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
              />
              <input
                value={member.email}
                onChange={(e) => updateMember(idx, { email: e.target.value })}
                placeholder="email@company.com"
                type="email"
                className="h-10 px-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
              />
              <SelectField
                value={member.role}
                options={MEMBER_ROLES}
                onChange={(v) => updateMember(idx, { role: v as MemberRole })}
                bare
              />
              <div className="flex items-center justify-center w-[88px] h-10">
                <Toggle
                  checked={member.sendInvite}
                  onChange={(on) => updateMember(idx, { sendInvite: on })}
                  compact
                />
              </div>
              <button
                type="button"
                onClick={() => billing.members.length > 1 && removeMember(idx)}
                disabled={billing.members.length === 1}
                aria-label="Remove member"
                className="h-10 w-10 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-border text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            <Plus size={13} strokeWidth={2} />
            Add another user
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 text-[12px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border-subtle">
          <Mail size={13} strokeWidth={1.75} className="mt-[2px] shrink-0" />
          <span>
            {invitableCount > 0
              ? <>An email invite will be sent to <span className="font-medium text-foreground">{invitableCount} user{invitableCount > 1 ? "s" : ""}</span> when you confirm. They'll set their own password on first sign-in.</>
              : "No invites will be sent — toggle 'Send invite' on a member to invite them."}
          </span>
        </div>
      </Section>

      <Section
        title="Go-live"
        description="When the account becomes active and credits start counting."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[12.5px] font-medium text-foreground mb-1.5">
              Activation date *
            </div>
            <div className="relative">
              <Calendar
                size={14}
                strokeWidth={1.75}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="date"
                value={billing.activationDate}
                onChange={(e) => upd("activationDate", e.target.value)}
                className="h-10 w-full pl-9 pr-3 rounded-md border border-border bg-transparent text-[13px] tabular outline-none focus-visible:border-foreground"
              />
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-1.5">
              Credits start counting from this date.
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1">
              Seats
            </div>
            <div className="text-[18px] font-bold tabular text-foreground">
              {seats} user{seats > 1 ? "s" : ""}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              Derived from members above — one seat per user.
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Review & activate"
        description="Confirm everything below. Going back to edit a step is safe — your values are kept."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
          <SummaryRow label="Account type"            value={billing.accountType} />
          <SummaryRow label="Billing cycle"           value={billing.billingCycle} />
          <SummaryRow label="Consumption model"       value={billing.consumptionModel} />
          <SummaryRow label="Contract duration"       value={`${billing.contractMonths} months`} />
          <SummaryRow label="Seats"                   value={`${seats} user${seats > 1 ? "s" : ""}`} />
          <SummaryRow label="Initial credits / cycle" value={formatCredits(billing.initialCreditsPerCycle)} />
          <SummaryRow label="Rate"                    value={`₹${billing.rupeesPerCredit.toFixed(2)}/credit`} />
          <SummaryRow label="Overage rate"            value={`₹${billing.overageRupeesPerCredit.toFixed(2)}/credit`} />
          <SummaryRow label="Daily limit"             value={`${formatCredits(billing.globalDailyLimit)} credits/day`} />
          <SummaryRow label="Monthly lapse"           value={billing.enableMonthlyLapse ? "On" : "Off"} />
          <SummaryRow label="Auto-recharge"           value={billing.autoRechargeAtPct === null ? "Off" : `At ${billing.autoRechargeAtPct}%`} />
          <SummaryRow label="Rollover"                value={billing.rolloverEnabled ? `Up to ${formatCredits(billing.rolloverCapCredits)}` : "Off"} />
          <SummaryRow label="Usage alerts"            value={billing.alertThresholdsPct.length ? billing.alertThresholdsPct.map((t) => `${t}%`).join(" + ") : "Off"} />
          <SummaryRow label="Activation date"         value={formatActivationDate(billing.activationDate)} />
          <SummaryRow label="Estimated monthly cost"  value={formatRupees(cost.estTotal)} emphasis />
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Enabled products ({enabledProducts.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {enabledProducts.length === 0 && (
                <span className="text-[12.5px] text-muted-foreground italic">
                  No products enabled — go back to Step 2.
                </span>
              )}
              {enabledProducts.map((p) => {
                const r = billing.rateCard[p.id];
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 border border-border rounded-md px-2 py-[3px] text-[11.5px] bg-card"
                  >
                    <span className="text-foreground">{p.name}</span>
                    <span className="text-muted-foreground">{r.creditsPerUnit} cr {p.unit}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
              Members invited on activation ({invitableCount} of {validMembers.length})
            </div>
            <div className="space-y-1.5">
              {validMembers.length === 0 && (
                <span className="text-[12.5px] text-muted-foreground italic">
                  No valid members yet — add at least one above.
                </span>
              )}
              {validMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-[12.5px]">
                  <Mail
                    size={13}
                    strokeWidth={1.75}
                    className={m.sendInvite ? "text-primary" : "text-muted-foreground/40"}
                  />
                  <span className="text-foreground font-medium">{m.name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{m.email}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-foreground/80">{m.role}</span>
                  {!m.sendInvite && (
                    <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      no invite
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular text-right",
          emphasis ? "text-[16px] font-bold text-primary" : "text-foreground font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function toggleThreshold(
  billing: ClientBilling,
  value: number,
  upd: <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) => void,
) {
  const set = new Set(billing.alertThresholdsPct);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  upd("alertThresholdsPct", Array.from(set).sort((a, b) => a - b));
}

// ── Rate card table ─────────────────────────────────────────────────────

function RateCardTable({
  billing,
  onChangeEnabled,
  onChangeCredits,
}: {
  billing: ClientBilling;
  onChangeEnabled: (productId: string, enabled: boolean) => void;
  onChangeCredits: (productId: string, credits: number) => void;
}) {
  const grouped: Record<"Features" | "Agents", Product[]> = {
    Features: PRODUCT_CATALOGUE.filter((p) => p.category === "Features"),
    Agents:   PRODUCT_CATALOGUE.filter((p) => p.category === "Agents"),
  };
  return (
    <div className="space-y-5">
      {(Object.keys(grouped) as ("Features" | "Agents")[]).map((cat) => (
        <div key={cat}>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
            {cat}
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <table className="w-full text-[13px]">
              <thead className="bg-muted/40">
                <tr>
                  <Th>Enabled</Th>
                  <Th>Product</Th>
                  <Th>Unit</Th>
                  <Th align="right">Internal cost</Th>
                  <Th align="right">Credits / unit</Th>
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map((product) => {
                  const r = billing.rateCard[product.id] ?? { enabled: false, creditsPerUnit: 0 };
                  return (
                    <tr key={product.id} className={cn("border-t border-border", !r.enabled && "opacity-60")}>
                      <td className="px-4 py-3">
                        <Toggle
                          checked={r.enabled}
                          onChange={(on) => onChangeEnabled(product.id, on)}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{product.name}</div>
                        {product.description && (
                          <div className="text-[11.5px] text-muted-foreground mt-0.5">{product.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{product.unit}</td>
                      <td className="px-4 py-3 text-right tabular text-muted-foreground whitespace-nowrap">
                        {product.internalCostRupees !== undefined
                          ? `₹${product.internalCostRupees.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={r.creditsPerUnit}
                          disabled={!r.enabled}
                          min={0}
                          onChange={(e) => onChangeCredits(product.id, Number(e.target.value))}
                          className="w-[88px] h-8 px-2 rounded-md border border-border bg-transparent text-[13px] text-right tabular outline-none focus-visible:border-foreground disabled:opacity-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Form primitives ──────────────────────────────────────────────────────

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border">
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  bare,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  /** Skip the label slot — useful when used inline (e.g. POC role). */
  bare?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const control = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between h-10 px-3 rounded-md border border-border bg-transparent text-[13px] text-foreground outline-none focus-visible:border-foreground"
      >
        <span>{value}</span>
        <ChevronDown size={14} strokeWidth={2} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 rounded-lg border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.10)] py-1.5">
            {options.map((opt) => {
              const active = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
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
        </>
      )}
    </div>
  );
  if (bare) return control;
  return (
    <div>
      {label && <div className="text-[12.5px] font-medium text-foreground mb-1.5">{label}</div>}
      {control}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  help?: string;
}) {
  return (
    <div>
      <div className="text-[12.5px] font-medium text-foreground mb-1.5">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full px-3 rounded-md border border-border bg-transparent text-[13px] tabular outline-none focus-visible:border-foreground"
      />
      {help && <div className="text-[11.5px] text-muted-foreground mt-1.5">{help}</div>}
    </div>
  );
}

function NumberInline({
  value,
  onChange,
  step = 1,
  disabled,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  disabled?: boolean;
  suffix?: string;
}) {
  return (
    <span className="inline-flex items-center">
      <input
        type="number"
        value={value}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-[72px] h-7 px-2 rounded-md border border-border bg-transparent text-[12.5px] tabular outline-none focus-visible:border-foreground disabled:opacity-50"
      />
      {suffix && <span className="ml-1 text-muted-foreground">{suffix}</span>}
    </span>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mt-5 w-full flex items-start gap-3 text-left rounded-lg border border-border bg-muted/30 px-4 py-3 hover:bg-muted/60"
    >
      <span
        className={cn(
          "mt-0.5 w-4 h-4 rounded-sm border flex items-center justify-center shrink-0",
          checked ? "bg-primary border-primary" : "border-border bg-background",
        )}
      >
        {checked && <Check size={11} strokeWidth={3} className="text-primary-foreground" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-foreground">{label}</span>
        {help && <span className="block text-[12px] text-muted-foreground mt-0.5">{help}</span>}
      </span>
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  icon,
  compact,
}: {
  label?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 cursor-pointer", !compact && "w-full")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors shrink-0",
          checked ? "bg-primary" : "bg-secondary",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background border border-border transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
      {label && (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {label}
        </span>
      )}
    </label>
  );
}

function ThresholdPill({
  value,
  active,
  onClick,
}: {
  value: number;
  active: boolean;
  onClick: (v: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "inline-flex items-center h-6 px-2 rounded-md text-[12px] font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:bg-secondary",
      )}
    >
      {value}%
    </button>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[12px] font-semibold text-muted-foreground whitespace-nowrap",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function StubTab({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
      <h3 className="text-[15px] font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-[12.5px] text-muted-foreground max-w-md mx-auto">{hint}</p>
    </div>
  );
}
