"use client";

import { useState } from "react";
import { X, Check, Mail, Send, AlertTriangle } from "lucide-react";
import { RevspotLogo } from "@/components/layout/revspot-logo";
import { useAccessibleWorkspaces, useCurrentUser } from "@/lib/workspace-store";
import { useInviteStore, parseEmails } from "@/lib/invite-data";
import { useSpotStore } from "@/lib/spot/store";
import type { UserRole } from "@/lib/workspace-data";

export function InviteUserModal({
  open,
  onClose,
  defaultWorkspaceId,
}: {
  open: boolean;
  onClose: () => void;
  /** Pre-select this workspace; default is the inviter's current workspace. */
  defaultWorkspaceId?: string;
}) {
  const user = useCurrentUser();
  const accessible = useAccessibleWorkspaces();
  const addInvite = useInviteStore((s) => s.addInvite);
  const showToast = useSpotStore((s) => s.showToast);

  const [emailsText, setEmailsText] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [wsIds, setWsIds] = useState<string[]>(
    defaultWorkspaceId ? [defaultWorkspaceId] : accessible.length ? [accessible[0].id] : [],
  );
  const [message, setMessage] = useState("");

  if (!open) return null;

  const validEmails = parseEmails(emailsText);
  const canSend = validEmails.length > 0 && wsIds.length > 0;
  const canInviteAdmins = user.role === "admin";

  const handleSend = () => {
    if (!canSend) return;
    validEmails.forEach((email) => {
      addInvite({
        email,
        role,
        workspaceIds: wsIds,
        invitedByUserId: user.id,
        message: message.trim() || undefined,
      });
    });
    showToast(
      `${validEmails.length} invitation${validEmails.length === 1 ? "" : "s"} sent`,
    );
    setEmailsText("");
    setMessage("");
    onClose();
  };

  const toggleWs = (wsId: string) => {
    setWsIds((prev) =>
      prev.includes(wsId) ? prev.filter((x) => x !== wsId) : [...prev, wsId],
    );
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4vh 16px",
          pointerEvents: "none",
          overflowY: "auto",
        }}
      >
        <div
          className="fadeUp"
          style={{
            width: "min(560px, 100%)",
            maxHeight: "84vh",
            background: "#FFF",
            borderRadius: 14,
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border flex-shrink-0">
            <div className="w-8 h-8 rounded-[7px] bg-surface-secondary flex items-center justify-center flex-shrink-0">
              <Mail size={15} />
            </div>
            <div className="flex-1">
              <div className="text-[14.5px] font-semibold leading-tight">
                Invite teammates
              </div>
              <div className="text-[11.5px] text-text-tertiary">
                {user.role === "admin"
                  ? "You can invite to any workspace and as admin or member."
                  : `You can invite to ${accessible[0]?.name || "your workspace"} as a member.`}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center h-8 w-8 rounded-button hover:bg-surface-secondary"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 scroll space-y-5">
            {/* Emails */}
            <Field
              label="Email addresses"
              hint="Comma- or newline-separated. We'll send each person their own invite."
            >
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                rows={3}
                placeholder="alice@godrejproperties.com, bob@godrejproperties.com"
                className="w-full outline-none rounded-[8px] border border-border px-3 py-2 text-[13px] resize-y"
              />
              <div className="text-[11px] text-text-tertiary mt-1.5 flex items-center gap-1.5">
                {validEmails.length > 0 ? (
                  <>
                    <Check size={11} className="text-[var(--ok-fg)]" />
                    <span>
                      {validEmails.length} valid email
                      {validEmails.length === 1 ? "" : "s"} ready
                    </span>
                  </>
                ) : emailsText.trim() ? (
                  <>
                    <AlertTriangle size={11} className="text-[var(--warn-fg)]" />
                    <span>No valid emails yet — check formatting.</span>
                  </>
                ) : (
                  <span>0 emails</span>
                )}
              </div>
            </Field>

            {/* Role */}
            <Field label="Role" hint="Members see only the workspaces you select. Admins see everything.">
              <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <RoleTile
                  active={role === "member"}
                  onClick={() => setRole("member")}
                  label="Member"
                  sub="Project-level access"
                />
                <RoleTile
                  active={role === "admin"}
                  onClick={() => canInviteAdmins && setRole("admin")}
                  label="Admin"
                  sub={canInviteAdmins ? "Cross-workspace + settings" : "Admins only"}
                  disabled={!canInviteAdmins}
                />
              </div>
            </Field>

            {/* Workspaces */}
            <Field
              label="Workspaces"
              hint={
                role === "admin"
                  ? "Admins automatically get access to every workspace."
                  : "Pick one or more — invitees will see only what you select."
              }
            >
              {role === "admin" ? (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[8px]"
                  style={{
                    background: "var(--spot-tint)",
                    border: "1px solid var(--spot-stroke)",
                  }}
                >
                  <RevspotLogo size={16} />
                  <span className="text-[12.5px]">
                    All {accessible.length} workspaces · cross-workspace dashboard
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {accessible.map((w) => {
                    const active = wsIds.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => toggleWs(w.id)}
                        className="card-base hover-row w-full text-left flex items-center gap-3 px-3.5 py-2.5"
                        style={{
                          borderColor: active ? "#1A1A1A" : "var(--border)",
                          background: active ? "var(--bg-page)" : "#FFF",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium leading-tight">
                            {w.name}
                          </div>
                          <div className="text-[10.5px] text-text-tertiary">
                            {w.region}
                          </div>
                        </div>
                        <span
                          className="inline-flex items-center justify-center"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: active ? "#1A1A1A" : "transparent",
                            border: active ? "1px solid #1A1A1A" : "1px solid var(--border)",
                            color: "#FFF",
                          }}
                        >
                          {active && <Check size={11} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Optional personal message */}
            <Field label="Note (optional)">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Add a short message to include in the invitation email."
                className="w-full outline-none rounded-[8px] border border-border px-3 py-2 text-[13px] resize-y"
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border flex-shrink-0 bg-surface-page">
            <div className="text-[11px] text-text-tertiary">
              {validEmails.length > 0
                ? `Sending ${validEmails.length} ${role} invite${validEmails.length === 1 ? "" : "s"}`
                : "Add at least one email to send."}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center h-8 px-3 rounded-button border border-border bg-white text-[12.5px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="apply-btn"
              >
                <Send size={11} /> Send invite{validEmails.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
    <div>
      <div className="text-[11px] uppercase tracking-[0.4px] text-text-tertiary mb-1 font-semibold">
        {label}
      </div>
      {hint && <div className="text-[11.5px] text-text-secondary mb-2 leading-[1.45]">{hint}</div>}
      {children}
    </div>
  );
}

function RoleTile({
  active,
  onClick,
  label,
  sub,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card-base text-left p-3"
      style={{
        background: active ? "#1A1A1A" : "#FFF",
        color: active ? "#FFF" : "var(--text-1)",
        borderColor: active ? "#1A1A1A" : "var(--border)",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div className="text-[13px] font-semibold">{label}</div>
      <div
        className="text-[10.5px] mt-0.5"
        style={{ color: active ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)" }}
      >
        {sub}
      </div>
    </button>
  );
}
