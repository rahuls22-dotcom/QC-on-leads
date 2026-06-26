"use client";

import { useState } from "react";
import { Layers, Info, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRODUCT_CATALOGUE,
  MODULE_CATALOG,
  DEFAULT_RATES,
  moduleMeterIds,
  type ClientBilling,
  type Product,
  type ModuleDef,
} from "@/lib/billing-data";

const byId: Record<string, Product> = Object.fromEntries(
  PRODUCT_CATALOGUE.map((p) => [p.id, p]),
);

const VOICE = MODULE_CATALOG.flatMap((m) => m.features).find((f) => f.kind === "voice")!;

// Industry-standard floor for a meter — also its default. Pricing can rise
// above this but never below it.
const floorRate = (meterId: string): number => DEFAULT_RATES[meterId] ?? 0;

// Voice collapses four destination rates into one per-minute price; its floor
// is the lowest of the standard destination rates.
const VOICE_FLOOR = Math.min(...VOICE.meterIds.map((id) => floorRate(id)));

// Soft per-module accent — a gentle tint for the module icon so the surface
// isn't all black-and-white. Kept minimal: a -50 bg with a -600 icon.
const MODULE_ACCENT: Record<string, string> = {
  ai_calling: "bg-sky-50 text-sky-600",
  outreach: "bg-indigo-50 text-indigo-600",
  extraction: "bg-emerald-50 text-emerald-600",
  enrichment: "bg-teal-50 text-teal-600",
  marketing: "bg-amber-50 text-amber-600",
  spot: "bg-violet-50 text-violet-600",
};
const accentOf = (id: string): string => MODULE_ACCENT[id] ?? "bg-primary-soft text-primary";

/* ─── Shared config ───────────────────────────────────────────────────────
 *
 * Lifted to the org-detail level and shared by the Modules and Pricing tabs
 * so enabling a feature in one shows up in the other. Enablement (which
 * features are on) is decoupled from pricing (the ₹/unit each meter costs).
 */

export type Pulse = "60s" | "30s";

export type ModuleConfig = {
  featureOn: Record<string, boolean>;
  setFeature: (id: string, on: boolean) => void;
  setModule: (mod: ModuleDef, on: boolean) => void;
  isModuleOn: (mod: ModuleDef) => boolean;
  rate: (meterId: string) => number;
  setRate: (meterId: string, v: number) => void;
  voicePricePerMin: number;
  setVoicePricePerMin: (v: number) => void;
  pulseEnabled: boolean;
  setPulseEnabled: (v: boolean) => void;
  pulse: Pulse;
  setPulse: (p: Pulse) => void;
};

// Accepts a full ClientBilling or just a credit account's pricing slice — both
// expose `rateCard` and (optionally) `enabledModuleIds`.
type ModuleConfigSource = { enabledModuleIds?: string[]; rateCard: ClientBilling["rateCard"] };

export function useModuleConfig(billing: ModuleConfigSource): ModuleConfig {
  const rc = billing.rateCard;

  const [featureOn, setFeatureOn] = useState<Record<string, boolean>>(() => {
    const out: Record<string, boolean> = {};
    // Prefer the explicit enabled-module list (set at creation) — it covers
    // meterless modules like Outreach/Spot. Fall back to the rate card for
    // seed orgs that predate that field.
    const explicit = billing.enabledModuleIds;
    for (const mod of MODULE_CATALOG) {
      const on = explicit
        ? explicit.includes(mod.id)
        : moduleMeterIds(mod).some((id) => rc[id]?.enabled);
      for (const f of mod.features) out[f.id] = on;
    }
    return out;
  });

  const [rates, setRates] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    // Default each meter to its industry-standard rate, never below the floor.
    for (const p of PRODUCT_CATALOGUE)
      out[p.id] = Math.max(rc[p.id]?.creditsPerUnit ?? 0, floorRate(p.id));
    return out;
  });

  // Voice defaults to its floor (the lowest standard destination rate).
  const [voicePricePerMin, setVoicePricePerMin] = useState(VOICE_FLOOR);
  const [pulseEnabled, setPulseEnabled] = useState(false);
  const [pulse, setPulse] = useState<Pulse>("60s");

  return {
    featureOn,
    setFeature: (id, on) => setFeatureOn((p) => ({ ...p, [id]: on })),
    setModule: (mod, on) =>
      setFeatureOn((p) => {
        const next = { ...p };
        const apply = (m: ModuleDef, val: boolean) => {
          for (const f of m.features) next[f.id] = val;
        };
        apply(mod, on);
        if (on && mod.requires) {
          // Enabling a module auto-enables what it depends on
          // (turning on Outreach turns on AI Calling).
          const req = MODULE_CATALOG.find((m) => m.id === mod.requires);
          if (req) apply(req, true);
        }
        if (!on) {
          // Turning a module off cascades off anything that requires it
          // (disabling AI Calling also disables Outreach).
          for (const dep of MODULE_CATALOG) if (dep.requires === mod.id) apply(dep, false);
        }
        return next;
      }),
    isModuleOn: (mod) => mod.features.some((f) => featureOn[f.id]),
    rate: (meterId) => rates[meterId] ?? 0,
    setRate: (meterId, v) => setRates((p) => ({ ...p, [meterId]: v })),
    voicePricePerMin,
    setVoicePricePerMin,
    pulseEnabled,
    setPulseEnabled,
    pulse,
    setPulse,
  };
}

/* ─── Tab 1 · Modules — enable modules & features ─────────────────────── */

export function ModulesTab({ config }: { config: ModuleConfig }) {
  const enabledCount = MODULE_CATALOG.filter(config.isModuleOn).length;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-foreground">Modules</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Enable the modules and features this organization can use. Set their unit prices in the Pricing tab.
        </p>
      </div>

      <div className="space-y-3">
        {MODULE_CATALOG.map((mod) => (
          <ModuleEnableCard key={mod.id} module={mod} config={config} />
        ))}
      </div>

      <div className="mt-4 text-[12px] text-muted-foreground tabular">
        {enabledCount} of {MODULE_CATALOG.length} modules enabled
      </div>
    </div>
  );
}

function ModuleEnableCard({ module: mod, config }: { module: ModuleDef; config: ModuleConfig }) {
  const on = config.isModuleOn(mod);
  const requiredMod = mod.requires ? MODULE_CATALOG.find((m) => m.id === mod.requires) : undefined;
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            on ? accentOf(mod.id) : "bg-secondary text-muted-foreground",
          )}
        >
          <Layers size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-foreground">{mod.name}</span>
            {requiredMod && (
              <span className="rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning">
                Requires {requiredMod.name}
              </span>
            )}
          </div>
          <div className="text-[11.5px] leading-snug text-muted-foreground">
            {mod.enables}
            {requiredMod && <span> Turning this on enables {requiredMod.name} too.</span>}
          </div>
        </div>
        <Toggle checked={on} onClick={() => config.setModule(mod, !on)} />
      </div>

      {on && mod.features.length > 1 && (
        <div className="border-t border-border-subtle px-4 py-2">
          <div className="divide-y divide-border-subtle">
            {mod.features.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-foreground">{f.name}</span>
                  <div className="text-[11.5px] leading-snug text-muted-foreground">{f.description}</div>
                </div>
                <Toggle
                  checked={!!config.featureOn[f.id]}
                  onClick={() => config.setFeature(f.id, !config.featureOn[f.id])}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab 2 · Pricing — unit prices for enabled priced features ───────── */

export function PricingTab({ config, trial = false }: { config: ModuleConfig; trial?: boolean }) {
  const priced = MODULE_CATALOG.map((mod) => ({
    mod,
    feats: mod.features.filter(
      (f) => config.featureOn[f.id] && (f.kind === "meters" || f.kind === "voice"),
    ),
  })).filter((g) => g.feats.length > 0);

  if (trial) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-foreground">Pricing</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Standard rates applied during the trial — usage draws these from the free credits. Adjust them when you convert to a contract.
          </p>
        </div>
        <div className="space-y-3">
          {priced.map(({ mod, feats }) => (
            <div key={mod.id} className="rounded-xl border border-border-subtle bg-card">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-t-xl border-b border-border-subtle px-4 py-3",
                  accentOf(mod.id),
                )}
              >
                <Layers size={16} strokeWidth={1.75} />
                <div className="text-[13.5px] font-semibold text-foreground">{mod.name}</div>
                <span className="ml-auto rounded bg-card/70 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                  default
                </span>
              </div>
              <div className="divide-y divide-border-subtle px-4">
                {feats.flatMap((f) =>
                  f.kind === "voice"
                    ? [<ReadOnlyRate key={f.id} name="Price per minute" sub="charged per connected minute" value={VOICE_FLOOR} unit="min" />]
                    : f.meterIds.map((id) => {
                        const p = byId[id];
                        return p ? (
                          <ReadOnlyRate key={id} name={p.name} sub={p.unit} value={floorRate(id)} unit="unit" />
                        ) : null;
                      }),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-[15px] font-semibold text-foreground">Pricing</h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Set the per-unit price for every enabled feature. Each defaults to the standard rate and can&rsquo;t go below it.
        </p>
      </div>

      {priced.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Coins size={18} strokeWidth={1.75} />
          </div>
          <div className="max-w-[300px] text-[13px] text-muted-foreground">
            No priced features enabled. Turn on a metered feature in the <span className="font-medium text-foreground">Modules</span> tab to set its pricing.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {priced.map(({ mod, feats }) => (
            <div key={mod.id} className="rounded-xl border border-border-subtle bg-card">
              {/* Light, per-module tinted header */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-t-xl border-b border-border-subtle px-4 py-3",
                  accentOf(mod.id),
                )}
              >
                <Layers size={16} strokeWidth={1.75} />
                <div className="text-[13.5px] font-semibold text-foreground">{mod.name}</div>
              </div>
              <div className="px-4">
                {feats.map((f) =>
                  f.kind === "voice" ? (
                    <VoicePricing key={f.id} config={config} />
                  ) : (
                    <MeterPricing key={f.id} meterIds={f.meterIds} config={config} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Combined Modules + Pricing — enable a module, price it inline ───── */

export function ModulesPricing({
  config,
  trial = false,
  embedded = false,
  disabled = false,
}: {
  config: ModuleConfig;
  trial?: boolean;
  embedded?: boolean;
  disabled?: boolean;
}) {
  const enabledCount = MODULE_CATALOG.filter(config.isModuleOn).length;
  // Read-only when it's a trial (fixed) or the account's pricing is locked.
  const readOnly = trial || disabled;
  return (
    <div>
      {!embedded && (
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold text-foreground">Modules &amp; pricing</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {trial
              ? "All modules are on for the trial, at standard rates."
              : "Turn on a module to set its per-unit pricing below it. Each rate defaults to the standard rate and can’t go lower."}
          </p>
        </div>
      )}
      <div className="space-y-3">
        {MODULE_CATALOG.map((mod) => (
          <ModulePricingCard key={mod.id} module={mod} config={config} readOnly={readOnly} />
        ))}
      </div>
      <div className="mt-4 text-[12px] text-muted-foreground tabular">
        {enabledCount} of {MODULE_CATALOG.length} modules enabled
      </div>
    </div>
  );
}

function ModulePricingCard({
  module: mod,
  config,
  readOnly,
}: {
  module: ModuleDef;
  config: ModuleConfig;
  readOnly: boolean;
}) {
  const on = config.isModuleOn(mod);
  const requiredMod = mod.requires ? MODULE_CATALOG.find((m) => m.id === mod.requires) : undefined;
  const pricedFeats = mod.features.filter((f) => f.kind === "meters" || f.kind === "voice");
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-card">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            on ? accentOf(mod.id) : "bg-secondary text-muted-foreground",
          )}
        >
          <Layers size={18} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-foreground">{mod.name}</span>
            {requiredMod && (
              <span className="rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning">
                Requires {requiredMod.name}
              </span>
            )}
          </div>
          <div className="text-[11.5px] leading-snug text-muted-foreground">{mod.enables}</div>
        </div>
        <Toggle checked={on} disabled={readOnly} onClick={() => config.setModule(mod, !on)} />
      </div>

      {on && pricedFeats.length > 0 && (
        <div className="border-t border-border-subtle bg-secondary/20 px-4">
          {pricedFeats.map((f) =>
            f.kind === "voice" ? (
              readOnly ? (
                <ReadOnlyRate key={f.id} name="Price per minute" sub="charged per connected minute" value={config.voicePricePerMin} unit="min" />
              ) : (
                <VoicePricing key={f.id} config={config} />
              )
            ) : readOnly ? (
              <div key={f.id} className="divide-y divide-border-subtle">
                {f.meterIds.map((id) => {
                  const p = byId[id];
                  return p ? <ReadOnlyRate key={id} name={p.name} sub={p.unit} value={config.rate(id)} unit="unit" /> : null;
                })}
              </div>
            ) : (
              <MeterPricing key={f.id} meterIds={f.meterIds} config={config} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function MeterPricing({ meterIds, config }: { meterIds: string[]; config: ModuleConfig }) {
  return (
    <div className="divide-y divide-border-subtle">
      {meterIds.map((id) => {
        const p = byId[id];
        if (!p) return null;
        return (
          <div key={id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-foreground">{p.name}</div>
              <div className="text-[11px] text-muted-foreground">{p.unit}</div>
            </div>
            <CreditsInput
              value={config.rate(id)}
              minCost={floorRate(id)}
              onChange={(v) => config.setRate(id, v)}
            />
          </div>
        );
      })}
    </div>
  );
}

function VoicePricing({ config }: { config: ModuleConfig }) {
  return (
    <div>
      <div className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">Price per minute</div>
          <div className="text-[11px] text-muted-foreground">charged per connected minute</div>
        </div>
        <CreditsInput
          value={config.voicePricePerMin}
          minCost={VOICE_FLOOR}
          unit="min"
          onChange={config.setVoicePricePerMin}
        />
      </div>
      <div className="py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">Pulse billing</span>
          <InfoTip text="Calls are billed in fixed time blocks, rounded up — not by the exact second. 60s bills to the next full minute; 30s bills to the next half-minute." />
          <div className="flex-1" />
          <Toggle checked={config.pulseEnabled} onClick={() => config.setPulseEnabled(!config.pulseEnabled)} />
        </div>
        {config.pulseEnabled && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[12px] text-muted-foreground">Pulse length</span>
            <Segmented
              value={config.pulse}
              onChange={config.setPulse}
              options={[
                { v: "60s", l: "60 seconds" },
                { v: "30s", l: "30 seconds" },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Primitives ──────────────────────────────────────────────────────── */

function ReadOnlyRate({
  name,
  sub,
  value,
  unit,
}: {
  name: string;
  sub: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{name}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <div className="shrink-0 text-[13px] tabular text-foreground">
        ₹{value.toFixed(2)} <span className="text-[11.5px] text-muted-foreground">/ {unit}</span>
      </div>
    </div>
  );
}

function CreditsInput({
  value,
  onChange,
  minCost,
  unit = "unit",
}: {
  value: number;
  onChange: (v: number) => void;
  minCost?: number;
  unit?: string;
}) {
  const floor = minCost ?? 0;
  const belowCost = value < floor;
  return (
    <div className="inline-flex shrink-0 flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-[12px] text-muted-foreground">₹</span>
        <input
          type="number"
          value={value}
          min={floor}
          step={0.5}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "h-8 w-[72px] rounded-md border bg-transparent px-2 text-right text-[13px] tabular outline-none transition-colors",
            belowCost
              ? "border-destructive focus-visible:border-destructive"
              : "border-border focus-visible:border-foreground",
          )}
        />
        <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">/ {unit}</span>
      </div>
      {belowCost && (
        <span className="text-[10.5px] text-destructive tabular">min ₹{floor.toFixed(2)}</span>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "h-7 whitespace-nowrap rounded px-3 text-[12.5px] font-medium transition-colors",
            value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onClick,
  disabled,
}: {
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-secondary",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full border border-border bg-background transition-transform",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="What is a pulse?"
        className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
      >
        <Info size={13} strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 hidden w-60 rounded-md bg-foreground px-2.5 py-2 text-[11.5px] leading-relaxed text-background shadow-lg group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
