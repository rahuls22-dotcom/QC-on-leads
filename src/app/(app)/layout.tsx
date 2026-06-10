"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { DemoModeProvider } from "@/lib/demo-mode";
import { ProductsProvider } from "@/lib/products";
import { SpotRoot } from "@/components/spot/spot-root";
import { useSpotStore } from "@/lib/spot/store";
import { useCurrentScope, useCurrentWorkspaceLabel } from "@/lib/workspace-store";
import { isAuthed } from "@/lib/auth";
import { WAProvider } from "@/lib/whatsapp-context";
import { WorkspaceProvider } from "@/lib/workspace-context";

/**
 * Watches workspace scope and resets Spot whenever it changes — the
 * panel scope and the conversation thread are about the workspace the
 * user just left, not the one they're now in. Keeps Spot in lock-step
 * with the sidebar switcher (per the workspace-switch spec).
 */
function SpotWorkspaceSync() {
  const scope = useCurrentScope();
  const wsLabel = useCurrentWorkspaceLabel();
  const setSpotScope = useSpotStore((s) => s.setScope);
  const setThread = useSpotStore((s) => s.setThread);
  // Only react to actual scope changes — not the initial mount, since
  // Spot already has a sensible default at boot.
  const initialised = useRef(false);
  const lastKey = useRef<string>("");

  useEffect(() => {
    const key = scope.kind === "all" ? "all" : `ws:${scope.id}`;
    if (!initialised.current) {
      initialised.current = true;
      lastKey.current = key;
      return;
    }
    if (key === lastKey.current) return;
    lastKey.current = key;
    // Re-scope Spot + clear the thread. Floating launcher / open state
    // are deliberately untouched — the panel stays open if it was open.
    setSpotScope({
      kind: "workspace",
      label: wsLabel,
      target: scope.kind === "workspace" ? scope.id : undefined,
    });
    setThread([]);
  }, [scope.kind, scope.kind === "workspace" ? scope.id : "all", wsLabel, setSpotScope, setThread]);

  return null;
}

/** Auth gate · redirects to /login if the browser isn't signed in.
 *  Renders nothing during the auth check so we don't briefly show
 *  the app shell to an unauthenticated visitor. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // null = checking (SSR + before useEffect runs)
  // true = authenticated → render children
  // false = not authenticated → redirect to login
  const [state, setState] = useState<null | boolean>(null);

  useEffect(() => {
    const ok = isAuthed();
    setState(ok);
    if (!ok) {
      const next = encodeURIComponent(pathname || "/spot");
      router.replace(`/login?next=${next}`);
    }
  }, [router, pathname]);

  if (state !== true) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "#0A0A09" }}
        aria-hidden
      />
    );
  }
  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /spot is its own canvas — it owns full width/height and supplies its
  // own background. Everywhere else gets the platform shell padding.
  const isSpotRoute = pathname === "/spot";
  return (
    <AuthGate>
      <DemoModeProvider>
        <ProductsProvider>
          <WorkspaceProvider>
            <WAProvider>
              <div className="min-h-screen bg-surface-page">
                <Sidebar />
                <main className="ml-sidebar">
                  {isSpotRoute ? (
                    children
                  ) : (
                    <div className="max-w-[1400px] mx-auto px-8 py-8">{children}</div>
                  )}
                </main>
                <SpotRoot />
                <SpotWorkspaceSync />
              </div>
            </WAProvider>
          </WorkspaceProvider>
        </ProductsProvider>
      </DemoModeProvider>
    </AuthGate>
  );
}
