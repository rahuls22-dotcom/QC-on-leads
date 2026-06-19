"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  Calendar,
  Mail,
  Power,
  PlayCircle,
  Building2,
  UserCheck,
  Receipt,
  Layers,
  Coins,
  Bell,
  Users2,
  Rocket,
  ClipboardCheck,
  FileText,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { OrgDetail } from "@/components/organizations/org-detail";
import {
  BILLING_TYPE_DESCRIPTIONS,
  COMMIT_TIERS,
  FREE_TRIAL_TOPUP,
  HYBRID_THRESHOLD,
  INDUSTRIES,
  PRODUCT_CATALOGUE,
  POSTPAID_THRESHOLD,
  MEMBER_ROLES,
  defaultBilling,
  estimateMonthlyCost,
  findClient,
  formatActivationDate,
  formatCredits,
  formatRupees,
  makeMemberId,
  makeWorkspaceId,
  type AccountType,
  type AutoRechargeConfig,
  type BillingCycle,
  type BillingMode,
  type BillingType,
  type InvoiceGeneration,
  type PrepaidMode,
  type Client,
  type ClientBilling,
  type CommitTier,
  type Industry,
  type MemberRole,
  type OrgMember,
  type Product,
  type ProductCategory,
  type Workspace,
} from "@/lib/billing-data";

const STEPS = [
  { id: 1, label: "Organization & plan" },
  { id: 2, label: "Rate card" },
  { id: 3, label: "Workspaces & members" },
] as const;

type StepId = 1 | 2 | 3;

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Three modes:
  //   isNew  — /organizations/new → create flow, navigate to list on confirm
  //   onboarding — existing client with `billing: undefined` → activation flow
  //   editing — existing client with billing already configured → edit flow
  const isNew = id === "new";
  const client = isNew ? null : findClient(id);
  if (!isNew && !client) notFound();
  const isEdit = !!client?.billing;

  const [billing, setBilling] = useState<ClientBilling>(
    client?.billing ?? defaultBilling(
      client ? { clientName: client.name } : undefined,
    ),
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);
  // Local status — drives the Deactivate / Reactivate header CTAs. Mirrors
  // the seed status on first render; flips in-memory on confirm.
  const [status, setStatus] = useState<Client["status"]>(client?.status ?? "Onboarding");
  // Confirmation modal open-state. Null when closed.
  const [pendingStatus, setPendingStatus] = useState<null | "Active" | "Suspended">(null);

  // Existing, activated orgs open the tabbed management view (Workspaces ·
  // Products & Pricing · Members). New + onboarding orgs use the wizard.
  if (isEdit && client) {
    return <OrgDetail client={client} />;
  }

  // Header copy adapts to the mode.
  const headerDescription = isNew
    ? "Walk through the three steps. We'll create the organization on activation."
    : isEdit
    ? "Edit any step. Changes save when you confirm at the bottom."
    : "Onboarding flow — three steps to activate this client.";

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-1.5">
        <Link
          href="/organizations"
          aria-label="Back to organizations"
          className="w-8 h-8 mt-0.5 rounded-md hover:bg-secondary text-foreground flex items-center justify-center"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[22px] font-bold text-foreground">
              {isNew
                ? (billing.clientName.trim() || "Create a new organization")
                : client!.name}
            </h1>
            {isNew ? (
              <span className="text-[11.5px] font-medium px-2 py-[3px] rounded bg-primary-soft text-primary border border-primary/20">
                NEW
              </span>
            ) : (
              <code className="text-[11.5px] font-mono px-2 py-[3px] rounded bg-secondary text-secondary-foreground">
                {client!.orgId}
              </code>
            )}
            {!isNew && <StatusBadge status={status} />}
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            {headerDescription}
          </p>
        </div>

        {/* Header CTA — Deactivate (Active clients) / Reactivate (Suspended).
            Onboarding clients have no power button; they activate via the
            wizard's Confirm. */}
        {!isNew && isEdit && (
          <div className="shrink-0">
            {status === "Active" ? (
              <button
                onClick={() => setPendingStatus("Suspended")}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-foreground/80 text-[13px] font-medium hover:bg-secondary hover:text-foreground transition-colors"
              >
                <Power size={14} strokeWidth={1.75} />
                Deactivate account
              </button>
            ) : status === "Suspended" ? (
              <button
                onClick={() => setPendingStatus("Active")}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card text-foreground/80 text-[13px] font-medium hover:bg-secondary hover:text-foreground transition-colors"
              >
                <PlayCircle size={14} strokeWidth={1.75} />
                Reactivate account
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-6">
        <BillingWizard
          mode={isEdit ? "edit" : "create"}
          billing={billing}
          onChange={setBilling}
          onActivate={() => {
            if (isEdit) {
              setSavedToast("Changes saved.");
              setTimeout(() => setSavedToast(null), 2500);
              return;
            }
            const invites = billing.members.filter((m) => m.sendInvite && m.email).length;
            const kamNotified = billing.kam.notifyOnActivation && billing.kam.email;
            const created = isNew ? "Client created — " : "";
            const parts = [
              invites > 0 ? `${invites} member invite${invites > 1 ? "s" : ""} sent` : "no member invites",
              kamNotified ? "KAM notified" : null,
            ].filter(Boolean);
            setSavedToast(`${created}account activated · ${parts.join(" · ")}.`);
            setTimeout(() => setSavedToast(null), 3500);
            if (isNew) {
              setTimeout(() => router.push("/organizations"), 1700);
            }
          }}
        />
      </div>

      {savedToast && (
        <div className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-lg border border-success-bg bg-success-bg text-success px-4 py-2.5 text-[13px] font-medium shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
          <Check size={14} strokeWidth={2.25} />
          {savedToast}
        </div>
      )}

      {pendingStatus && client && (
        <StatusChangeModal
          targetStatus={pendingStatus}
          clientName={client.name}
          onCancel={() => setPendingStatus(null)}
          onConfirm={() => {
            setStatus(pendingStatus);
            setPendingStatus(null);
            setSavedToast(
              pendingStatus === "Active"
                ? "Account reactivated."
                : "Account deactivated.",
            );
            setTimeout(() => setSavedToast(null), 2500);
          }}
        />
      )}
    </div>
  );
}

/**
 * Centered confirmation modal — replaces the old two-click pattern on the
 * Deactivate / Reactivate header buttons. Subtle styling: a primary blue
 * confirm button, not destructive red, since the action is reversible.
 */
function StatusChangeModal({
  targetStatus,
  clientName,
  onCancel,
  onConfirm,
}: {
  targetStatus: "Active" | "Suspended";
  clientName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDeactivate = targetStatus === "Suspended";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card shadow-[0_24px_60px_rgba(0,0,0,0.18)] p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="status-modal-title"
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
            isDeactivate ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary",
          )}>
            {isDeactivate ? <Power size={16} strokeWidth={1.75} /> : <PlayCircle size={16} strokeWidth={1.75} />}
          </div>
          <div className="min-w-0">
            <h3 id="status-modal-title" className="text-[15px] font-semibold text-foreground">
              {isDeactivate ? "Deactivate this client?" : "Reactivate this client?"}
            </h3>
            <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
              {isDeactivate ? (
                <>
                  <span className="font-medium text-foreground">{clientName}</span>{" "}
                  will lose access to the workspace. Credit billing pauses until you reactivate.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">{clientName}</span>{" "}
                  will regain access and billing will resume on the next cycle.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-border bg-card text-foreground text-[13px] font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110"
          >
            {isDeactivate ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tiny status pill rendered next to the client name in the header. */
function StatusBadge({ status }: { status: Client["status"] }) {
  const cls =
    status === "Active"     ? "bg-success-bg text-success" :
    status === "Suspended"  ? "bg-destructive-bg text-destructive" :
                              "bg-warning-bg text-warning";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-[3px] rounded",
      cls,
    )}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
      {status}
    </span>
  );
}

// ── Wizard ───────────────────────────────────────────────────────────────

function BillingWizard({
  billing,
  onChange,
  onActivate,
  mode = "create",
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
  onActivate: () => void;
  /** "edit" surfaces a "Save changes" CTA; "create" uses "Confirm & Send Invites". */
  mode?: "create" | "edit";
}) {
  // In edit mode, the user already saw all three steps once during onboarding,
  // so let them jump freely instead of being forced to walk through linearly.
  const [step, setStep] = useState<StepId>(1);
  const [maxStep, setMaxStep] = useState<StepId>(mode === "edit" ? 3 : 1);
  const advance = (next: StepId) => {
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
        {step === 1 && <Step1 billing={billing} onChange={onChange} mode={mode} />}
        {step === 2 && <Step2 billing={billing} onChange={onChange} />}
        {step === 3 && (
          <>
            <Step3 billing={billing} onChange={onChange} />
            <Step4 billing={billing} onChange={onChange} />
          </>
        )}
      </div>

      {/* Sticky nav bar */}
      <div className="sticky bottom-4 z-30">
        <div className="rounded-xl border border-border bg-card shadow-[0_8px_24px_rgba(0,0,0,0.08)] px-5 py-3 flex items-center gap-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => step > 1 && setStep((step - 1) as StepId)}
            style={step === 1 ? { opacity: 0.5, pointerEvents: "none" } : undefined}
          >
            <ChevronLeft size={14} strokeWidth={2} />
            Back
          </Button>
          <div className="flex-1" />
          {step < 3 ? (
            <Button
              size="default"
              onClick={() => stepValid && advance((step + 1) as StepId)}
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
              {mode === "edit" ? "Save changes" : "Confirm & Send Invites"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function isStepValid(step: StepId, b: ClientBilling): boolean {
  if (step === 1) {
    // Org details + Plan & commitment: name, industry, KAM, contract,
    // tier with valid monthly commit, billing model coherent with tier.
    const orgOk =
      b.clientName.trim() !== "" &&
      !!b.industry &&
      b.kam.name.trim() !== "" &&
      /.+@.+\..+/.test(b.kam.email) &&
      b.contractMonths > 0;
    if (!orgOk) return false;
    const tier = COMMIT_TIERS.find((t) => t.id === b.commitTier);
    if (!tier) return false;
    const commitOk =
      tier.id === "Enterprise"
        ? b.monthlyCommit >= tier.monthlyCommit
        : b.monthlyCommit === tier.monthlyCommit;
    return commitOk;
  }
  if (step === 2) {
    // Rate card — margin-protection check + per-call cap + inbound reserve.
    const enabled = PRODUCT_CATALOGUE.filter((p) => b.rateCard[p.id]?.enabled);
    if (enabled.length === 0) return false;
    if (!enabled.some((p) => b.rateCard[p.id].creditsPerUnit > 0)) return false;
    const ratesOk = enabled.every((p) => {
      const cost = p.internalCostRupees ?? 0;
      return b.rateCard[p.id].creditsPerUnit >= cost;
    });
    return ratesOk && b.perCallDurationCap > 0 && b.inboundReserve >= 0;
  }
  // Step 3: at least one named workspace + one valid org member + activation date.
  return (
    !!b.activationDate &&
    b.workspaces.some((w) => w.name.trim() !== "") &&
    b.members.some((m) => m.name.trim() !== "" && /.+@.+\..+/.test(m.email))
  );
}

function Stepper({
  current,
  maxStep,
  onJump,
}: {
  current: StepId;
  maxStep: StepId;
  onJump: (s: StepId) => void;
}) {
  return (
    <ol className="flex items-center gap-0">
      {STEPS.map((s, i) => {
        const stepNum = s.id as StepId;
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
  mode,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
  mode: "create" | "edit";
}) {
  const upd = <K extends keyof ClientBilling>(k: K, v: ClientBilling[K]) =>
    onChange({ ...billing, [k]: v });

  return (
    <div className="space-y-4">
      {/* ─── Organization — identity, KAM, contract length in one card. */}
      <SectionCard title="Organization" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            required
            label="Organization name"
            value={billing.clientName}
            onChange={(v) => upd("clientName", v)}
            placeholder="e.g. T&T Motors"
          />
          <SelectField
            label="Industry"
            value={billing.industry}
            options={[...INDUSTRIES]}
            onChange={(v) => upd("industry", v as Industry)}
          />
        </div>

        <div className="mt-5 pt-5 border-t border-border-subtle">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
            Key Account Manager
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              required
              label="Name"
              value={billing.kam.name}
              onChange={(v) => upd("kam", { ...billing.kam, name: v })}
              placeholder="e.g. Neha Sharma"
            />
            <TextField
              label="Phone"
              value={billing.kam.phone}
              onChange={(v) => upd("kam", { ...billing.kam, phone: v })}
              placeholder="+91 98xxxxxxxx"
            />
            <TextField
              required
              label="Work email"
              value={billing.kam.email}
              onChange={(v) => upd("kam", { ...billing.kam, email: v })}
              placeholder="neha@revspot.ai"
              type="email"
            />
          </div>
          <CheckboxRow
            checked={billing.kam.notifyOnActivation}
            onChange={(v) => upd("kam", { ...billing.kam, notifyOnActivation: v })}
            label="Send assignment email on activation"
          />
        </div>

        <div className="mt-5 pt-5 border-t border-border-subtle">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberField
              required
              label="Contract duration (months)"
              value={billing.contractMonths}
              min={1}
              onChange={(v) => upd("contractMonths", v)}
              help="Anchors the activation date and billing cycle."
            />
          </div>
        </div>
      </SectionCard>

      {/* ─── Subscription — single configurable plan. */}
      <SubscriptionSection billing={billing} onChange={onChange} />
    </div>
  );
}

/**
 * Conditional subscription card. First choice is the billing model:
 *
 *   Prepaid  → choose Subscription (recurring monthly credit) or PAYG
 *              (ad-hoc top-ups). Subscription reveals the monthly amount
 *              + rollover toggle; PAYG hides both.
 *   Postpaid → choose the billing cycle (Monthly / Quarterly / Yearly)
 *              and how invoices are generated (Auto / Manual).
 */
function SubscriptionSection({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const setMode = (m: BillingMode) => onChange({ ...billing, billingMode: m });
  const setPrepaidMode = (m: PrepaidMode) => {
    // PAYG has no recurring credit — clear the monthly amount + rollover.
    const next: ClientBilling = { ...billing, prepaidMode: m };
    if (m === "payg") {
      next.monthlyCommit = 0;
      next.rolloverMonths = 0;
    } else if (next.monthlyCommit === 0) {
      next.monthlyCommit = 25_000;
    }
    onChange(next);
  };
  const setMonthly = (v: number) => onChange({ ...billing, monthlyCommit: v });
  const setRollover = (on: boolean) =>
    onChange({ ...billing, rolloverMonths: on ? 3 : 0 });
  const setCycle = (c: BillingCycle) => onChange({ ...billing, billingCycle: c });
  const setInvoiceGen = (g: InvoiceGeneration) =>
    onChange({ ...billing, invoiceGeneration: g });

  return (
    <SectionCard
      title="Subscription"
      description="Pick the billing model first — the rest of the controls follow."
      icon={Receipt}
    >
      {/* Step A — Billing model */}
      <FieldLabel label="Billing model" />
      <div className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-secondary/40 p-1 h-9">
        {(
          [
            { id: "prepaid", label: "Prepaid" },
            { id: "postpaid", label: "Postpaid" },
          ] as { id: BillingMode; label: string }[]
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "h-7 px-4 rounded text-[12.5px] font-medium transition-colors",
              billing.billingMode === id
                ? "bg-card text-foreground border border-primary/40 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Step B — Conditional branch */}
      {billing.billingMode === "prepaid" ? (
        <div className="mt-5 pt-5 border-t border-border-subtle space-y-4">
          <div>
            <FieldLabel label="Prepaid type" />
            <div className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-secondary/40 p-1 h-9">
              {(
                [
                  { id: "subscription", label: "Subscription" },
                  { id: "payg", label: "Pay-as-you-go" },
                ] as { id: PrepaidMode; label: string }[]
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPrepaidMode(id)}
                  className={cn(
                    "h-7 px-4 rounded text-[12.5px] font-medium transition-colors",
                    billing.prepaidMode === id
                      ? "bg-card text-foreground border border-primary/40 shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-muted-foreground mt-1.5 leading-snug">
              {billing.prepaidMode === "subscription"
                ? "Wallet is topped up automatically each month for a fixed amount."
                : "Customer tops up the wallet manually whenever they want — no recurring charge."}
            </p>
          </div>

          {billing.prepaidMode === "subscription" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberField
                  required
                  label="Monthly subscription (₹)"
                  value={billing.monthlyCommit}
                  min={1_000}
                  step={5_000}
                  onChange={setMonthly}
                  help={`Added to the wallet on the ${ordinalSuffix(new Date(billing.activationDate).getDate())} of each month.`}
                />
              </div>
              <CheckboxRow
                checked={billing.rolloverMonths > 0}
                onChange={setRollover}
                label="Allow rollover of unused credit (3 months)"
              />
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 pt-5 border-t border-border-subtle">
          <FieldLabel label="Invoice generation" />
          <div className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-secondary/40 p-1 h-9">
            {(
              [
                { id: "auto", label: "Auto at month end" },
                { id: "manual", label: "Manual" },
              ] as { id: InvoiceGeneration; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setInvoiceGen(id)}
                className={cn(
                  "h-7 px-3 rounded text-[12.5px] font-medium transition-colors",
                  billing.invoiceGeneration === id
                    ? "bg-card text-foreground border border-primary/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-2 leading-snug">
            {billing.invoiceGeneration === "auto"
              ? "Invoices are generated automatically at the end of every month, Net-15 / Net-30 terms."
              : "Invoices are generated only when the KAM triggers them from the active organization view."}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

function ordinalSuffix(d: number): string {
  if (d >= 11 && d <= 13) return `${d}th`;
  const last = d % 10;
  if (last === 1) return `${d}st`;
  if (last === 2) return `${d}nd`;
  if (last === 3) return `${d}rd`;
  return `${d}th`;
}

// ── Invoice action row (edit mode) ──────────────────────────────────────

/**
 * Compact row inside Contract & billing for the manual invoice trigger.
 * Shows last invoice context + a button that opens a confirm modal before
 * "generating" (mock — we just stamp today's date back on the billing).
 */
function InvoiceActionRow({
  activationDate,
  lastInvoiceDate,
  onGenerate,
}: {
  activationDate: string;
  lastInvoiceDate: string | undefined;
  onGenerate: (isoDate: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const lastLabel = lastInvoiceDate ? fmt(lastInvoiceDate) : "No invoices generated yet";

  // The billing cycle is anchored to the activation date: invoices are
  // due one month from activation, then rolling on the same day each
  // month. The "next" date is whatever month-anchor falls after either
  // the last invoice or today, whichever is later.
  const nextScheduled = (() => {
    const anchor = new Date(activationDate);
    if (Number.isNaN(anchor.getTime())) return null;
    const cursor = lastInvoiceDate ? new Date(lastInvoiceDate) : anchor;
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    const today = new Date();
    while (next < today) next.setMonth(next.getMonth() + 1);
    return next.toISOString().slice(0, 10);
  })();

  return (
    <>
      <div className="mt-1 rounded-lg border border-border-subtle bg-secondary/30 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-start gap-3 flex-1 min-w-[200px]">
          <div className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <FileText size={15} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-foreground">
              Invoices
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
              Last generated{" "}
              <span className="text-foreground">{lastLabel}</span>
              {nextScheduled && (
                <>
                  {" · Next billing "}
                  <span className="text-foreground">{fmt(nextScheduled)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card text-foreground/80 text-[12.5px] font-medium hover:bg-secondary hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
        >
          <FileText size={13} strokeWidth={1.75} />
          Generate invoice now
        </button>
      </div>

      {confirming && (
        <ConfirmInvoiceModal
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            const today = new Date().toISOString().slice(0, 10);
            onGenerate(today);
            setConfirming(false);
            setToast("Invoice generated and sent to finance.");
            setTimeout(() => setToast(null), 2500);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-md bg-foreground text-background text-[12.5px] px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}

function ConfirmInvoiceModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-[2px]">
      <div className="w-[440px] max-w-[90vw] rounded-xl border border-border bg-card shadow-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <FileText size={18} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-foreground">
              Generate invoice now?
            </div>
            <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
              This creates an off-cycle invoice for usage since the last
              run and emails it to the client's billing contact. The
              monthly auto-invoice schedule is unaffected.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <FileText size={13} strokeWidth={2} className="mr-1.5" />
            Generate invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Step 2 — Plan & commitment ───────────────────────────────────────────

/**
 * Tier picker. Selecting a tier auto-fills monthly commit + discount %.
 * Enterprise leaves the commit editable so sales can dial in a custom number.
 */
function StepPlan({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const selectTier = (tierId: CommitTier) => {
    const tier = COMMIT_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    onChange({
      ...billing,
      commitTier: tier.id,
      monthlyCommit: tier.monthlyCommit,
      discountPct: tier.discount,
    });
  };

  return (
    <Section
      title="Plan & commitment"
      icon={Receipt}
      description="Pick the monthly commitment level. Higher commits unlock a percentage off the rate card. Unused commit rolls forward for up to 3 months."
    >
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COMMIT_TIERS.map((tier) => {
          const active = billing.commitTier === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => selectTier(tier.id)}
              className={cn(
                "text-left rounded-lg border p-4 transition-colors h-full",
                active
                  ? "border-primary bg-primary-soft/30 ring-1 ring-primary/30"
                  : "border-border-subtle bg-card hover:border-border",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-semibold text-foreground">
                  {tier.label}
                </div>
                {tier.discount > 0 && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-primary tabular">
                    {Math.round(tier.discount * 100)}% off
                  </span>
                )}
              </div>
              <div className="text-[18px] font-bold text-foreground tabular">
                {tier.id === "PAYG"
                  ? "₹0"
                  : tier.id === "Enterprise"
                  ? `₹${(tier.monthlyCommit / 100_000).toFixed(1)}L+`
                  : `₹${(tier.monthlyCommit / 1_000).toFixed(0)}K`}
                <span className="text-[11px] font-medium text-muted-foreground ml-1">/mo</span>
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-2 leading-snug">
                {tier.bestFor}
              </p>
            </button>
          );
        })}
      </div>

      {billing.commitTier === "Enterprise" && (
        <div className="mt-4 max-w-sm">
          <NumberField
            required
            label="Custom monthly commit (₹)"
            value={billing.monthlyCommit}
            min={500_000}
            step={50_000}
            onChange={(v) => onChange({ ...billing, monthlyCommit: v })}
            help="Enterprise tier minimum is ₹5,00,000/mo."
          />
        </div>
      )}

      <div className="mt-4 rounded-md bg-secondary/40 border border-border-subtle px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
        <span className="text-foreground font-medium">Rollover policy:</span>{" "}
        Unused committed amounts roll forward for {billing.rolloverMonths} months,
        then expire. No annual lock-in — switch tiers or downgrade any time.
      </div>
    </Section>
  );
}

// ── Step 4 — Wallet & billing ───────────────────────────────────────────

/**
 * Wallet top-up + auto-recharge + billing-mode selector. Billing mode is
 * gated by the monthly commit per the doc § 7.3:
 *   < ₹50K — prepaid only
 *   ₹50K – ₹3L — prepaid or postpaid
 *   > ₹3L — also hybrid
 */
function StepWallet({
  billing,
  onChange,
  mode,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
  mode: "create" | "edit";
}) {
  const updAuto = (patch: Partial<AutoRechargeConfig>) =>
    onChange({ ...billing, autoRecharge: { ...billing.autoRecharge, ...patch } });

  // Friendly label for the billing model picked back in Step 1.
  const modeLabel =
    billing.billingMode === "prepaid"
      ? "Prepaid"
      : billing.billingMode === "postpaid"
      ? "Postpaid"
      : "Hybrid";

  return (
    <div className="space-y-6">
      <Section
        title="Wallet"
        icon={Coins}
        description={`The wallet is a single rupee balance that draws against both meters. This org is set up on ${modeLabel} (chosen in Step 1).`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField
            required
            label="Initial wallet top-up (₹)"
            value={billing.walletInitialTopUp}
            min={0}
            step={500}
            onChange={(v) => onChange({ ...billing, walletInitialTopUp: v })}
            help={mode === "edit" ? undefined : `Free trial credit of ₹${FREE_TRIAL_TOPUP} included on activation.`}
          />
        </div>
      </Section>

      <Section title="Auto-recharge" icon={RefreshCw} description="Optional — keep the wallet from hitting zero by topping it up automatically when it crosses a threshold.">
        <CheckboxRow
          checked={billing.autoRecharge.enabled}
          onChange={(v) => updAuto({ enabled: v })}
          label="Enable auto-recharge"
        />
        {billing.autoRecharge.enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
            <NumberField
              required
              label="Trigger when wallet drops below (₹)"
              value={billing.autoRecharge.triggerAt}
              min={0}
              step={500}
              onChange={(v) => updAuto({ triggerAt: v })}
            />
            <NumberField
              required
              label="Top up by (₹)"
              value={billing.autoRecharge.rechargeAmount}
              min={500}
              step={500}
              onChange={(v) => updAuto({ rechargeAmount: v })}
            />
          </div>
        )}
      </Section>

      {/* Edit-mode only — generate invoice (postpaid clients). */}
      {mode === "edit" && billing.billingMode !== "prepaid" && (
        <Section title="Invoices" icon={FileText} description="Billing cycle is anchored to the activation date. Invoices are generated one month from activation, then rolling monthly.">
          <InvoiceActionRow
            activationDate={billing.activationDate}
            lastInvoiceDate={billing.lastInvoiceDate}
            onGenerate={(date) => onChange({ ...billing, lastInvoiceDate: date })}
          />
        </Section>
      )}
    </div>
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
      <Section title="Products & rate card" icon={Layers}>
        <RateCardTable
          billing={billing}
          onChangeEnabled={(productId, enabled) =>
            upd("rateCard", { ...billing.rateCard, [productId]: { ...billing.rateCard[productId], enabled } })
          }
          onChangeCredits={(productId, credits) =>
            upd("rateCard", { ...billing.rateCard, [productId]: { ...billing.rateCard[productId], creditsPerUnit: credits } })
          }
          onBulkSetEnabled={(productIds, enabled) => {
            // Apply many enabled-flips in a single state update so React's
            // batching doesn't lose interim changes (parent-toggle on a
            // bucket needs to flip all children at once).
            const nextRateCard = { ...billing.rateCard };
            for (const id of productIds) {
              nextRateCard[id] = { ...nextRateCard[id], enabled };
            }
            upd("rateCard", nextRateCard);
          }}
        />
      </Section>

    </>
  );
}

// ── Step 3 — Workspaces ─────────────────────────────────────────────────

function Step3({
  billing,
  onChange,
}: {
  billing: ClientBilling;
  onChange: (b: ClientBilling) => void;
}) {
  const updateWorkspace = (id: string, patch: Partial<Workspace>) => {
    onChange({
      ...billing,
      workspaces: billing.workspaces.map((w) =>
        w.id === id ? { ...w, ...patch } : w,
      ),
    });
  };

  const addWorkspace = () => {
    onChange({
      ...billing,
      workspaces: [
        ...billing.workspaces,
        { id: makeWorkspaceId(), name: "", description: "" },
      ],
    });
  };

  const removeWorkspace = (id: string) => {
    // Keep at least one row so admins can always type into something.
    if (billing.workspaces.length <= 1) {
      onChange({
        ...billing,
        workspaces: [{ id: makeWorkspaceId(), name: "", description: "" }],
      });
      return;
    }
    onChange({
      ...billing,
      workspaces: billing.workspaces.filter((w) => w.id !== id),
    });
  };

  return (
    <Section
      title="Workspaces"
      icon={Boxes}
      description="Create one or more workspaces inside this organization — each one bills against the same wallet but keeps its leads, agents, and campaigns separate. You can add more later."
    >
      <div className="space-y-3">
        {billing.workspaces.map((ws, idx) => (
          <div
            key={ws.id}
            className="rounded-lg border border-border-subtle bg-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Workspace {idx + 1}
              </div>
              <button
                type="button"
                onClick={() => removeWorkspace(ws.id)}
                disabled={billing.workspaces.length <= 1}
                className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Remove workspace"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-3">
              <TextField
                required
                label="Workspace name"
                value={ws.name}
                placeholder="e.g. Mumbai — Sales"
                onChange={(v) => updateWorkspace(ws.id, { name: v })}
              />
              <TextField
                label="Description"
                value={ws.description ?? ""}
                placeholder="Optional — region, team, or use-case"
                onChange={(v) => updateWorkspace(ws.id, { description: v })}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addWorkspace}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-dashed border-border text-foreground/70 hover:text-foreground hover:bg-secondary text-[12.5px] font-medium transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          Add another workspace
        </button>
      </div>
    </Section>
  );
}

// ── Step 4 — Organisation members ────────────────────────────────────────

function Step4({
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
      <Section title="Organisation members" icon={Users2}>
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

      <Section title="Go-live" icon={Rocket}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Activation date" required />
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

      <Section title="Review & activate" icon={ClipboardCheck}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-[13px]">
          <SummaryRow label="Organization name"       value={billing.clientName || "—"} />
          <SummaryRow label="Industry"                value={billing.industry} />
          <SummaryRow label="Key Account Manager"     value={billing.kam.name ? `${billing.kam.name} · ${billing.kam.email}` : "—"} />
          <SummaryRow label="Billing cycle"           value={billing.billingCycle} />
          <SummaryRow label="Billing type"            value={billing.billingType} />
          <SummaryRow label="Contract duration"       value={`${billing.contractMonths} months`} />
          <SummaryRow label="Workspaces"              value={(() => { const named = billing.workspaces.filter((w) => w.name.trim()); return named.length ? `${named.length}` : "—"; })()} />
          <SummaryRow label="Seats"                   value={`${seats} user${seats > 1 ? "s" : ""}`} />
          <SummaryRow label="Budget per cycle"        value={formatRupees(billing.initialCreditsPerCycle)} />
          <SummaryRow label="Daily limit"             value={`${formatRupees(billing.globalDailyLimit)}/day`} />
          <SummaryRow label="Carry forward balance"   value={billing.rolloverEnabled ? "On" : "Off"} />
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
                    <span className="text-muted-foreground">₹{r.creditsPerUnit.toFixed(2)} {p.unit}</span>
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
  onBulkSetEnabled,
}: {
  billing: ClientBilling;
  onChangeEnabled: (productId: string, enabled: boolean) => void;
  onChangeCredits: (productId: string, credits: number) => void;
  onBulkSetEnabled: (productIds: string[], enabled: boolean) => void;
}) {
  // Group products by category, then by bucket within each category. Every
  // bucket renders through BucketCard so the enable/collapse behaviour is
  // identical across Features and Agents.
  const byCategory = new Map<ProductCategory, Map<string, Product[]>>();
  for (const p of PRODUCT_CATALOGUE) {
    if (!byCategory.has(p.category)) byCategory.set(p.category, new Map());
    const buckets = byCategory.get(p.category)!;
    const arr = buckets.get(p.bucket) ?? [];
    arr.push(p);
    buckets.set(p.bucket, arr);
  }

  return (
    <div className="space-y-6">
      {Array.from(byCategory.entries()).map(([category, buckets]) => (
        <div key={category}>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
            {category}
          </div>
          <div className="space-y-3">
            {Array.from(buckets.entries()).map(([bucket, products]) => (
              <BucketCard
                key={bucket}
                bucket={bucket}
                products={products}
                billing={billing}
                onChangeEnabled={onChangeEnabled}
                onChangeCredits={onChangeCredits}
                onBulkSetEnabled={onBulkSetEnabled}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A bucket card — parent header with a toggle that aggregates the state of
 * its children. Click the parent ON to enable all children at their default
 * credits; click OFF to disable them. Children are still individually
 * toggleable when the bucket is expanded.
 */
function BucketCard({
  bucket,
  products,
  billing,
  onChangeEnabled,
  onChangeCredits,
  onBulkSetEnabled,
}: {
  bucket: string;
  products: Product[];
  billing: ClientBilling;
  onChangeEnabled: (productId: string, enabled: boolean) => void;
  onChangeCredits: (productId: string, credits: number) => void;
  onBulkSetEnabled: (productIds: string[], enabled: boolean) => void;
}) {
  const enabledChildren = products.filter(
    (p) => billing.rateCard[p.id]?.enabled,
  );
  const parentOn = enabledChildren.length > 0;

  const toggleParent = () => {
    // Single bulk dispatch — flipping each child individually in a loop
    // would let React's batching keep only the last call's update.
    onBulkSetEnabled(products.map((p) => p.id), !parentOn);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-colors",
        "border-border-subtle",
      )}
    >
      {/* Parent header — flat, low-contrast. Bucket name on the left,
          price chips fill the middle, count + toggle on the right.
          No tinted background when on; the children table below carries
          the "active" affordance via its own visible content. */}
      <div className="flex items-center gap-4 px-4 py-2.5">
        <div className="min-w-0 shrink-0">
          <div className="text-[13.5px] font-semibold text-foreground whitespace-nowrap">
            {bucket}
          </div>
        </div>

        {/* Product preview chips — primary affordance for "what's in this
            bucket". Each shows the product name + its credit price. */}
        <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0">
          {products.map((p) => {
            const r = billing.rateCard[p.id];
            const isOn = !!r?.enabled;
            return (
              <span
                key={p.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 h-6 rounded text-[11.5px] whitespace-nowrap",
                  isOn
                    ? "bg-secondary text-foreground"
                    : "bg-transparent text-muted-foreground",
                )}
              >
                <span className="font-medium">{p.name}</span>
                <span className="tabular text-muted-foreground">
                  ₹{(r?.creditsPerUnit ?? 0).toFixed(2)}
                </span>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground tabular whitespace-nowrap">
            {enabledChildren.length}/{products.length}
          </span>
          <Toggle checked={parentOn} onChange={toggleParent} />
        </div>
      </div>

      {/* Children — visible only when bucket is on */}
      {parentOn && (
        <ProductTable
          products={products}
          billing={billing}
          onChangeEnabled={onChangeEnabled}
          onChangeCredits={onChangeCredits}
        />
      )}
    </div>
  );
}

/**
 * Shared product table used inside a bucket card and for the flat Agents
 * section. Each row has its own enabled toggle + credits-per-unit input.
 */
function ProductTable({
  products,
  billing,
  onChangeEnabled,
  onChangeCredits,
}: {
  products: Product[];
  billing: ClientBilling;
  onChangeEnabled: (productId: string, enabled: boolean) => void;
  onChangeCredits: (productId: string, credits: number) => void;
}) {
  return (
    <table className="w-full text-[13px]">
      <thead className="bg-muted/30">
        <tr>
          <Th>Enabled</Th>
          <Th>Product</Th>
          <Th>Unit</Th>
          <Th align="right">Internal cost</Th>
          <Th align="right">Rate (₹ / unit)</Th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
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
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{product.unit}</td>
              <td className="px-4 py-3 text-right tabular text-muted-foreground whitespace-nowrap">
                {product.internalCostRupees !== undefined
                  ? `₹${product.internalCostRupees.toFixed(2)}`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <CreditsInput
                  value={r.creditsPerUnit}
                  disabled={!r.enabled}
                  minCost={product.internalCostRupees}
                  onChange={(v) => onChangeCredits(product.id, v)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Number input for credits/unit with a margin-protection floor at the
 * product's internal cost. Below-cost values get a destructive border + a
 * one-line hint so the admin can see why the value's invalid.
 */
function CreditsInput({
  value,
  onChange,
  disabled,
  minCost,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  minCost?: number;
}) {
  const floor = minCost ?? 0;
  const belowCost = !disabled && value < floor;
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <input
        type="number"
        value={value}
        disabled={disabled}
        min={floor}
        step={0.05}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "w-[88px] h-8 px-2 rounded-md border bg-transparent text-[13px] text-right tabular outline-none disabled:opacity-50 transition-colors",
          belowCost
            ? "border-destructive focus-visible:border-destructive"
            : "border-border focus-visible:border-foreground",
        )}
      />
      {belowCost && (
        <span className="text-[10.5px] text-destructive tabular">
          min ₹{floor.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ── Form primitives ──────────────────────────────────────────────────────

type IconComp = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

/** Section heading row — optional icon in a soft-tinted circle, then the
 *  title (h2 or h3) and an optional one-line description. Used by both
 *  Section and SectionCard so the visual rhythm is consistent. */
function SectionHeading({
  icon: Icon,
  title,
  description,
  size = "md",
}: {
  icon?: IconComp;
  title: string;
  description?: string;
  size?: "md" | "lg";
}) {
  const titleCls = size === "lg" ? "text-[16px]" : "text-[15px]";
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="w-8 h-8 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
          <Icon size={16} strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0">
        {size === "lg" ? (
          <h2 className={cn(titleCls, "font-semibold text-foreground leading-tight")}>{title}</h2>
        ) : (
          <h3 className={cn(titleCls, "font-semibold text-foreground leading-tight")}>{title}</h3>
        )}
        {description && (
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Anchored section — single bordered shell, no tinted header. The heading
 * lives in the same padding zone as the content, so it reads as a block
 * without the "boxy" header-bar feel of the earlier card pattern.
 */
function Section({
  title,
  description,
  icon,
  children,
}: {
  /** Kept on the API for backward compat with old callers (unused now). */
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: IconComp;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-card px-5 py-4">
      <SectionHeading icon={icon} title={title} description={description} size="lg" />
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Same shape as Section, smaller heading. Used inside a step that has
 *  multiple peer blocks (e.g. Step 1's three sub-sections). */
function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: IconComp;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border-subtle bg-card px-5 py-4">
      <SectionHeading icon={icon} title={title} description={description} size="md" />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  bare,
  renderOption,
  help,
  required,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  /** Skip the label slot — useful when used inline (e.g. role in a row). */
  bare?: boolean;
  /** Optional formatter for menu items (closed control shows raw value). */
  renderOption?: (v: string) => string;
  /** Optional help text shown under the field. */
  help?: string;
  required?: boolean;
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
                  {renderOption ? renderOption(opt) : opt}
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
      {label && <FieldLabel label={label} required={required} />}
      {control}
      {help && <div className="text-[11.5px] text-muted-foreground mt-1.5">{help}</div>}
    </div>
  );
}

function SubGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
        {label}
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <div>
      <div className="text-[12.5px] font-medium text-foreground mb-1.5">{label}</div>
      <div className="h-10 w-full px-3 rounded-md border border-border-subtle bg-muted/40 text-[13px] text-foreground/80 flex items-center justify-between cursor-default">
        <span>{value}</span>
        <span className="text-[10.5px] font-medium text-muted-foreground uppercase tracking-wider">Fixed</span>
      </div>
      {help && <div className="text-[11.5px] text-muted-foreground mt-1.5">{help}</div>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  help,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email";
  help?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full px-3 rounded-md border border-border bg-transparent text-[13px] placeholder:text-muted-foreground outline-none focus-visible:border-foreground"
      />
      {help && <div className="text-[11.5px] text-muted-foreground mt-1.5">{help}</div>}
    </div>
  );
}

/** Shared label cell. Renders the asterisk in destructive color when the
 *  field is marked required, matching the bottom-bar hint. */
function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <div className="text-[12.5px] font-medium text-foreground mb-1.5">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
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
  required,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  help?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
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

