"use client";

// Spot is no longer a right-side panel — it's a route (/spot). Any UI
// action that previously called askSpot() now updates the Spot store
// AND lands the user on /spot via this redirector.
//
// What this component still does:
//   · Cmd-K  → command palette (lightweight, keep it)
//   · Cmd-J  → navigate to /spot
//   · Toast  → bottom-center confirmation strip
//   · Redirect on askSpot() / startLaunchFlow() → /spot
//
// What it no longer does:
//   · Render a right-side panel
//   · Render a guided-flow modal (handoff cards now advance inline)

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { useSpotStore } from "@/lib/spot/store";
import { SpotCommandPalette } from "./spot-command-palette";

function SpotRedirector() {
  const router = useRouter();
  const pathname = usePathname();
  const open = useSpotStore((s) => s.open);
  const pendingTs = useSpotStore((s) => s.pendingQuery?.ts ?? null);
  const threadLen = useSpotStore((s) => s.thread.length);
  const closePanel = useSpotStore((s) => s.closePanel);

  // Any signal that the user wants to talk to Spot → land on /spot.
  // We watch `open` (askSpot, togglePanel), `pendingTs` (a new query was
  // posted), and `threadLen` jumping from 0 (a thread was seeded by
  // startLaunchFlow on a non-Spot route).
  useEffect(() => {
    const shouldGo = open || pendingTs !== null || threadLen > 0;
    if (shouldGo && pathname !== "/spot") {
      router.push("/spot");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingTs, threadLen]);

  // Once we're on /spot, drop the `open` flag — the route is the
  // surface now, no panel state needed.
  useEffect(() => {
    if (pathname === "/spot" && open) closePanel();
  }, [pathname, open, closePanel]);

  return null;
}

export function SpotRoot() {
  const router = useRouter();
  const openPalette = useSpotStore((s) => s.openPalette);
  const toast = useSpotStore((s) => s.toast);
  const dismissToast = useSpotStore((s) => s.dismissToast);

  // ⌘K → palette, ⌘J → navigate to /spot
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        router.push("/spot");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette, router]);

  // Auto-dismiss toast after 2.4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismissToast(), 2400);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  return (
    <>
      <SpotRedirector />
      <SpotCommandPalette />
      {toast && (
        <div
          className="fadeUp"
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            color: "#FAFAF8",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            zIndex: 200,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Check size={14} style={{ color: "#4ADE80" }} />
          {toast}
        </div>
      )}
    </>
  );
}
