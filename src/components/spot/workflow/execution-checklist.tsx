"use client";

// ExecutionChecklist — a live deploy checklist. Spot's plans are one-time
// "do this now" plans, so when one is deployed we show the exact steps being
// executed, ticking off one at a time. Used by the launch-deploy step and the
// diagnostic (scale / optimize) deploy step. Dark-themed for the canvas.

import { useEffect, useState } from "react";
import { CheckCircle2, Cog } from "lucide-react";

export function ExecutionChecklist({
  title,
  subtitle,
  items,
  perItemMs = 1200,
}: {
  title: string;
  subtitle?: string;
  items: string[];
  perItemMs?: number;
}) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    setDone(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    items.forEach((_, i) => {
      timers.push(setTimeout(() => setDone(i + 1), perItemMs * (i + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, [items, perItemMs]);

  const allDone = done >= items.length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  return (
    <div className="px-6 py-8 max-w-[640px] mx-auto" style={{ color: "#F5F4EF" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        {allDone ? (
          <CheckCircle2 size={20} strokeWidth={1.9} style={{ color: "#22C55E" }} />
        ) : (
          <Cog size={18} strokeWidth={1.8} className="animate-spin" style={{ color: "#C9A86A", animationDuration: "2s" }} />
        )}
        <h1 className="text-[18px] font-semibold tracking-tight">{title}</h1>
      </div>
      {subtitle && (
        <p className="text-[12.5px] mb-4 ml-[30px]" style={{ color: "#A8A8A0" }}>{subtitle}</p>
      )}

      {/* Progress */}
      <div className="ml-[30px] mb-4 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${pct}%`,
              background: allDone ? "#22C55E" : "linear-gradient(90deg,#C9A86A,#E0C083)",
            }}
          />
        </div>
        <span className="text-[11px] tabular flex-shrink-0" style={{ color: "#A8A8A0" }}>
          {done} of {items.length}
        </span>
      </div>

      {/* Checklist */}
      <ul className="ml-[30px] space-y-1.5">
        {items.map((it, i) => {
          const isDone = i < done;
          const isRunning = i === done && !allDone;
          return (
            <li
              key={i}
              className="flex items-center gap-2.5 text-[13px] leading-relaxed transition-colors"
              style={{ color: isDone ? "#C9C8C1" : isRunning ? "#F5F4EF" : "#7A7970" }}
            >
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 size={14} strokeWidth={2} style={{ color: "#22C55E" }} />
                ) : isRunning ? (
                  <Cog size={12} strokeWidth={1.8} className="animate-spin" style={{ color: "#E0C083", animationDuration: "1.2s" }} />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full" style={{ border: "1px solid #3A3A35" }} />
                )}
              </span>
              <span className="flex-1">{it}</span>
              {isRunning && (
                <span className="text-[9.5px] uppercase tracking-wider font-semibold flex-shrink-0" style={{ color: "#E0C083" }}>
                  running…
                </span>
              )}
              {isDone && (
                <span className="text-[9.5px] uppercase tracking-wider font-semibold flex-shrink-0" style={{ color: "#22C55E" }}>
                  done
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {allDone && (
        <div className="ml-[30px] mt-4 text-[12.5px] font-medium" style={{ color: "#22C55E" }}>
          ✓ All steps executed · live. I&apos;ll report back from here as data lands.
        </div>
      )}
    </div>
  );
}

/** Publish steps for the launch-deploy phase. */
export const LAUNCH_DEPLOY_CHECKLIST = [
  "Provisioning Meta Ads Manager handles",
  "Publishing 12 creatives + 6 reels to Meta",
  "Pushing 9 ad sets across 3 campaigns",
  "Deploying 3 landing pages to the CDN",
  "Publishing the lead-gen forms",
  "Activating the Meta pixel + Conversion API",
  "Wiring the WhatsApp Business inbox",
  "Verifying tracking — firing test events",
  "Arming the watchers · CPL · sentiment · frequency",
];
