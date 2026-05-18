"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import {
  useCurrentScope,
  useCurrentUser,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import { getWorkspace } from "@/lib/workspace-data";
import { useSpotStore } from "@/lib/spot/store";

/**
 * Workspace scope guard for a workspace-specific resource (project,
 * deploy page, campaign).
 *
 * Returns one of three states:
 * - `{ access: "ok" }` — render normally. Scope already matched, or we
 *   silently auto-switched the user's scope to the resource's workspace.
 * - `{ access: "wrong-scope" }` — short-lived; we triggered an
 *   auto-switch on this render. Caller should render nothing this frame
 *   to avoid leaking stale data.
 * - `{ access: "forbidden" }` — user has no access to the resource's
 *   workspace. Caller should render the forbidden state.
 *
 * Side effect: when access is auto-switchable, triggers `setScope` and
 * a toast in an effect.
 */
export type ScopeGuardState =
  | { access: "ok" }
  | { access: "wrong-scope"; targetWorkspaceId: string; workspaceName: string }
  | { access: "forbidden"; targetWorkspaceId: string; workspaceName: string; resourceLabel: string };

export function useScopeGuard(
  resourceWorkspaceId: string | null | undefined,
  resourceLabel: string,
): ScopeGuardState {
  const scope = useCurrentScope();
  const user = useCurrentUser();
  const setScope = useWorkspaceStore((s) => s.setScope);
  const showToast = useSpotStore((s) => s.showToast);

  const currentId = scope.kind === "workspace" ? scope.id : "all";
  const hasAccess =
    !!resourceWorkspaceId && user.workspaceIds.includes(resourceWorkspaceId);
  const needsSwitch =
    !!resourceWorkspaceId && resourceWorkspaceId !== currentId && currentId !== "all";

  useEffect(() => {
    if (needsSwitch && hasAccess && resourceWorkspaceId) {
      setScope(resourceWorkspaceId);
      const ws = getWorkspace(resourceWorkspaceId);
      if (ws) showToast(`Switched to ${ws.name}`);
    }
    // We deliberately depend on the bound ids, not setScope/showToast
    // identity — those are stable refs from zustand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceWorkspaceId, currentId]);

  if (!resourceWorkspaceId) return { access: "ok" }; // unknown resource scope → caller renders
  if (currentId === "all") return { access: "ok" };
  if (resourceWorkspaceId === currentId) return { access: "ok" };
  if (!hasAccess) {
    const ws = getWorkspace(resourceWorkspaceId);
    return {
      access: "forbidden",
      targetWorkspaceId: resourceWorkspaceId,
      workspaceName: ws?.name || "another workspace",
      resourceLabel,
    };
  }
  // Has access but we need to switch — render nothing this frame; the
  // effect above triggers the scope switch and the next render lands as "ok".
  return {
    access: "wrong-scope",
    targetWorkspaceId: resourceWorkspaceId,
    workspaceName: getWorkspace(resourceWorkspaceId)?.name || "another workspace",
  };
}

/** Forbidden-state empty card. Use when guard returns `access: "forbidden"`. */
export function ForbiddenState({
  workspaceName,
  resourceLabel,
  backHref = "/projects",
}: {
  workspaceName: string;
  resourceLabel: string;
  backHref?: string;
}) {
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-[12px] mb-4"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <div className="card-base p-10 text-center max-w-[520px] mx-auto">
        <div
          className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto mb-3"
          style={{ background: "var(--warn-bg)", color: "var(--warn-fg)" }}
        >
          <AlertTriangle size={18} />
        </div>
        <div className="text-[14px] font-semibold mb-1">Not in your workspace</div>
        <div className="text-[12.5px] text-text-secondary leading-[1.5]">
          <strong>{resourceLabel}</strong> belongs to <strong>{workspaceName}</strong>.
          You don&apos;t have access to that workspace. Ask an admin to add you, or check
          the link.
        </div>
      </div>
    </div>
  );
}
