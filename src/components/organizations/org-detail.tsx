"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Building2, Users, Layers, Coins, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MEMBER_ROLES,
  makeWorkspaceId,
  makeMemberId,
  type Client,
  type Workspace,
  type OrgMember,
} from "@/lib/billing-data";
import { ModulesTab, PricingTab, useModuleConfig } from "./modules-pricing";

type OrgTab = "workspaces" | "modules" | "pricing" | "members";

const STATUS_PILL: Record<Client["status"], string> = {
  Active: "bg-success-bg text-success",
  Onboarding: "bg-warning-bg text-warning",
  Suspended: "bg-destructive-bg text-destructive",
};

/**
 * Organization detail — a tabbed management view for an existing org.
 * Modules (enable features) and Pricing (set unit prices) are split into two
 * tabs that share one config object so enablement and pricing stay in sync.
 */
export function OrgDetail({ client }: { client: Client }) {
  const billing = client.billing!;
  const [tab, setTab] = useState<OrgTab>("workspaces");
  const config = useModuleConfig(billing);

  const TABS: { key: OrgTab; label: string; badge?: number }[] = [
    { key: "workspaces", label: "Workspaces", badge: billing.workspaces.length },
    { key: "modules", label: "Modules" },
    { key: "pricing", label: "Pricing" },
    { key: "members", label: "Members", badge: billing.members.length },
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
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                STATUS_PILL[client.status],
              )}
            >
              {client.status}
            </span>
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            <span className="tabular">{client.orgId}</span>
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
          {TABS.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors",
                tab === key
                  ? "border border-primary/40 bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {key === "modules" && <Layers size={13} strokeWidth={2} />}
              {key === "pricing" && <Coins size={13} strokeWidth={2} />}
              {label}
              {badge !== undefined && (
                <span
                  className={cn(
                    "rounded px-1.5 text-[11px] tabular",
                    tab === key ? "bg-secondary text-foreground" : "bg-secondary/70 text-muted-foreground",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "workspaces" && <WorkspacesTab client={client} />}
      {tab === "modules" && <ModulesTab config={config} />}
      {tab === "pricing" && <PricingTab config={config} />}
      {tab === "members" && <MembersTab client={client} />}
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
    <div className="rounded-xl border border-border-subtle bg-card">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-foreground">Workspaces</h2>
          <span className="rounded px-1.5 text-[11px] text-muted-foreground tabular">
            {workspaces.length}
          </span>
        </div>
        <PrimaryButton onClick={() => setAdding(true)}>
          <Plus size={14} strokeWidth={2.25} /> Create workspace
        </PrimaryButton>
      </div>
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

function MembersTab({ client }: { client: Client }) {
  const [members, setMembers] = useState<OrgMember[]>(client.billing!.members);
  const [adding, setAdding] = useState(false);

  const addMember = (name: string, email: string, role: OrgMember["role"]) =>
    setMembers((prev) => [
      ...prev,
      { id: makeMemberId(), name, email, role, sendInvite: true },
    ]);

  return (
    <div className="rounded-xl border border-border-subtle bg-card">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-foreground">Members</h2>
          <span className="rounded px-1.5 text-[11px] text-muted-foreground tabular">
            {members.length}
          </span>
        </div>
        <PrimaryButton onClick={() => setAdding(true)}>
          <Plus size={14} strokeWidth={2.25} /> Add member
        </PrimaryButton>
      </div>
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
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-5 py-3 font-medium text-foreground">{m.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                <td className="px-5 py-3 text-muted-foreground">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <AddMemberDialog
          onAdd={(name, email, role) => addMember(name, email, role)}
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
  onAdd,
  onClose,
}: {
  onAdd: (name: string, email: string, role: OrgMember["role"]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMember["role"]>("Member");
  const canAdd = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email);

  const submit = () => {
    if (!canAdd) return;
    onAdd(name.trim(), email.trim(), role);
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
