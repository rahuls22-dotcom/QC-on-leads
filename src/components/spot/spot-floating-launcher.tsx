"use client";

import { SpotMark } from "./spot-mark";
import { useSpotStore } from "@/lib/spot/store";

export function SpotFloatingLauncher() {
  const open = useSpotStore((s) => s.open);
  const askSpot = useSpotStore((s) => s.askSpot);
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => askSpot("")}
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        zIndex: 55,
        height: 42,
        padding: "0 14px 0 12px",
        border: "1px solid var(--border)",
        background: "#FFF",
        borderRadius: 24,
        boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.10)";
      }}
    >
      <SpotMark size={20} />
      Ask Spot
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--text-3)",
          padding: "1px 5px",
          borderRadius: 4,
          background: "var(--bg-secondary)",
        }}
      >
        ⌘K
      </span>
    </button>
  );
}
