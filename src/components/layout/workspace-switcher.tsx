"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { InviteUserModal } from "@/components/invite/invite-user-modal";
import { RevspotLogo } from "@/components/layout/revspot-logo";
import {
  useAccessibleWorkspaces,
  useCurrentScope,
  useCurrentUser,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import { getWorkspace } from "@/lib/workspace-data";
import { projectsForWorkspace } from "@/lib/project-data";

function AllMark({ size = 26 }: { size?: number }) {
  // Revspot R brand mark — used as the "All workspaces" indicator since
  // crossing workspaces means operating at org level.
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: size,
        height: size,
      }}
    >
      <RevspotLogo size={size} />
    </span>
  );
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const user = useCurrentUser();
  const accessible = useAccessibleWorkspaces();
  const scope = useCurrentScope();
  const setScope = useWorkspaceStore((s) => s.setScope);

  const [open, setOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        popRef.current &&
        !popRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isAll = scope.kind === "all";
  const currentWs = scope.kind === "workspace" ? getWorkspace(scope.id) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-[8px] hover:bg-surface-secondary transition-colors text-left"
      >
        {/* Revspot R is the only mark in the trigger — workspace identity
            is carried by the name + region text. */}
        <RevspotLogo size={22} />
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold text-text-primary leading-tight truncate">
            {isAll ? "All workspaces" : currentWs?.name}
          </div>
          <div className="text-[10.5px] text-text-tertiary truncate">
            {isAll ? `${accessible.length} workspaces` : currentWs?.region}
          </div>
        </div>
        <ChevronsUpDown size={13} className="text-text-tertiary flex-shrink-0" />
      </button>

      {open && (
        <div
          ref={popRef}
          className="fadeInScale"
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            top: "calc(100% + 6px)",
            background: "#FFF",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.10)",
            zIndex: 80,
            padding: 6,
          }}
        >
          {user.role === "admin" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setScope("all");
                  setOpen(false);
                  router.push("/admin");
                }}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[7px] hover:bg-surface-page text-left"
                style={{ background: isAll ? "var(--bg-page)" : "transparent" }}
              >
                <AllMark size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold">All workspaces</span>
                    <span className="pill" style={{ fontSize: 9.5, padding: "0 5px" }}>
                      Admin
                    </span>
                  </div>
                  <div className="text-[10.5px] text-text-tertiary">
                    Cross-workspace dashboard
                  </div>
                </div>
                {isAll && <Check size={13} className="text-text-secondary" />}
              </button>
              <div className="my-1 h-px bg-border-subtle" />
            </>
          )}

          {accessible.map((w) => {
            const projects = projectsForWorkspace(w.id);
            const active = scope.kind === "workspace" && scope.id === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setScope(w.id);
                  setOpen(false);
                  router.push("/projects");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[7px] hover:bg-surface-page text-left"
                style={{ background: active ? "var(--bg-page)" : "transparent" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{w.name}</div>
                  <div className="text-[10.5px] text-text-tertiary truncate">
                    {projects.length} project{projects.length === 1 ? "" : "s"} · {w.memberCount} members
                  </div>
                </div>
                {active && <Check size={13} className="text-text-secondary" />}
              </button>
            );
          })}

          <div className="my-1 h-px bg-border-subtle" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setInviteOpen(true);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-surface-page text-[11.5px] text-text-secondary"
          >
            <UserPlus size={12} />
            Invite teammates
          </button>
        </div>
      )}

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        defaultWorkspaceId={scope.kind === "workspace" ? scope.id : undefined}
      />
    </div>
  );
}

/** Small role + workspace pill used in the user card. */
export function UserRolePill() {
  const user = useCurrentUser();
  const setDemoRole = useWorkspaceStore((s) => s.setDemoRole);
  const next = user.role === "admin" ? "member" : "admin";
  return (
    <button
      type="button"
      onClick={() => setDemoRole(next)}
      title={`Switch to ${next} view (demo)`}
      className="pill ml-auto"
      style={{
        fontSize: 9.5,
        padding: "1px 6px",
        background: user.role === "admin" ? "#1A1A1A" : "var(--bg-secondary)",
        color: user.role === "admin" ? "#FAFAF8" : "var(--text-2)",
        cursor: "pointer",
      }}
    >
      {user.role === "admin" ? "Admin" : "Member"}
    </button>
  );
}
