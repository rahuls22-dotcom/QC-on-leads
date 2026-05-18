"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { USERS, type AppUser, type UserRole, WORKSPACES, getWorkspace } from "./workspace-data";

// Active scope can be a specific workspace, or "all" (admin-only — admin
// dashboard view across every workspace).
export type WorkspaceScope = string; // workspace id, or the literal "all"

type WorkspaceState = {
  currentUserId: string;
  scope: WorkspaceScope;

  setUser: (userId: string) => void;
  setScope: (scope: WorkspaceScope) => void;
  // Demo helper: flip role between admin and member to preview both views.
  setDemoRole: (role: UserRole) => void;
};

const ADMIN_ID = "u-head-marketing";
const MEMBER_ID = "u-south-lead";

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentUserId: ADMIN_ID,
      scope: "ws-south",
      setUser: (userId) => {
        const u = USERS.find((x) => x.id === userId);
        if (!u) return;
        set({ currentUserId: userId, scope: u.defaultWorkspaceId });
      },
      setScope: (scope) => set({ scope }),
      setDemoRole: (role) => {
        const u = USERS.find((x) => x.id === (role === "admin" ? ADMIN_ID : MEMBER_ID));
        if (!u) return;
        set({ currentUserId: u.id, scope: role === "admin" ? "all" : u.defaultWorkspaceId });
      },
    }),
    { name: "revspot-workspace" },
  ),
);

/** Convenience selectors. */
export function useCurrentUser(): AppUser {
  const id = useWorkspaceStore((s) => s.currentUserId);
  return USERS.find((u) => u.id === id) || USERS[0];
}

export function useAccessibleWorkspaces() {
  const user = useCurrentUser();
  return WORKSPACES.filter((w) => user.workspaceIds.includes(w.id));
}

export function useCurrentScope() {
  const scope = useWorkspaceStore((s) => s.scope);
  const user = useCurrentUser();
  // Members can never scope to "all"; force back to their default.
  if (scope === "all" && user.role !== "admin") {
    return { kind: "workspace" as const, id: user.defaultWorkspaceId };
  }
  if (scope === "all") return { kind: "all" as const };
  return { kind: "workspace" as const, id: scope };
}

export function useCurrentWorkspaceLabel() {
  const scope = useCurrentScope();
  if (scope.kind === "all") return "All workspaces";
  const w = getWorkspace(scope.id);
  return w?.name || "Workspace";
}

/**
 * Compute where a user should land after switching workspace, given their
 * current pathname. The rule (per the workspace-switch spec):
 *
 * - List/admin pages (/dashboard, /projects, /campaigns, /brand, /admin,
 *   /enquiries, /creatives, /agents-mvp) stay where they are; the pages
 *   themselves refilter against the new scope.
 * - Workspace-specific resources (project detail, deploy page, campaign
 *   detail) fall back to their parent list — the old resource doesn't
 *   belong to the new scope.
 * - "all" only routes to /admin if the user was already on a workspace-
 *   specific resource that just got abandoned; from a list page, stay
 *   put and let the list aggregate.
 *
 * Note: this is pure routing logic — the page filter wiring is the
 * caller's responsibility.
 */
export function redirectAfterScopeSwitch(args: {
  newScope: WorkspaceScope;
  currentPath: string;
}): string | null {
  const { newScope, currentPath } = args;
  // Strip trailing slash and query/hash for matching.
  const path = currentPath.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

  // List + flat pages: stay put.
  const STAY = new Set([
    "/dashboard",
    "/projects",
    "/campaigns",
    "/brand",
    "/admin",
    "/enquiries",
    "/creatives",
    "/agents-mvp",
    "/audiences",
    "/integrations",
  ]);
  if (STAY.has(path)) {
    // Special case: switching to "all" from a normal list page → /admin
    // is the canonical aggregated home, BUT staying on the same page lets
    // it aggregate. Per spec: stay (Dashboard / Projects / Campaigns all
    // aggregate under "all").
    return null;
  }

  // Workspace-specific resources — fall back to parent list.
  // /projects/<id> and /projects/<id>/anything → /projects
  if (path.startsWith("/projects/")) return "/projects";
  // /campaigns/<id> → /campaigns. /campaigns/create stays.
  if (path.startsWith("/campaigns/") && path !== "/campaigns/create") return "/campaigns";

  // When switching to "all", workspace-specific resource fallback lands
  // on /admin (the cross-workspace home) for admin-only context.
  if (newScope === "all") return "/admin";

  return null;
}
