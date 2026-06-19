"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INDUSTRIES,
  MODULE_CATALOG,
  createClient,
  type Industry,
} from "@/lib/billing-data";

/**
 * Create Organization — the modal that opens from the listing's "Create
 * organization" button. Collects the org name, industry, and the modules to
 * enable upfront, then creates the org and routes to its detail page where
 * pricing / workspaces / members are configured.
 */
export function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<Industry>(INDUSTRIES[0]);
  const [moduleIds, setModuleIds] = useState<string[]>([]);

  const canCreate = name.trim().length > 0;

  const toggleModule = (id: string) =>
    setModuleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const create = () => {
    if (!canCreate) return;
    const client = createClient({ name, industry, moduleIds });
    onClose();
    router.push(`/organizations/${client.id}`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative w-full max-w-[480px] rounded-xl border border-border-subtle bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Create organization</h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Name the org, pick its industry, and choose which modules to enable.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-foreground">Organization name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Godrej Properties"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-foreground">Industry</span>
            <div className="relative">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className={cn(inputClass, "appearance-none pr-8")}
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                strokeWidth={2}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </label>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-foreground">Modules</span>
            <ModuleMultiSelect selected={moduleIds} onToggle={toggleModule} />
            {moduleIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {moduleIds.map((id) => {
                  const mod = MODULE_CATALOG.find((m) => m.id === id);
                  if (!mod) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11.5px] font-medium text-foreground"
                    >
                      {mod.name}
                      <button
                        type="button"
                        onClick={() => toggleModule(id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${mod.name}`}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={!canCreate}
            className="inline-flex h-9 items-center rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create organization
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-9 w-full rounded-md border border-border bg-transparent px-2.5 text-[13px] text-foreground outline-none transition-colors focus-visible:border-foreground";

/* ─── Compact multi-select dropdown for modules ───────────────────────── */

function ModuleMultiSelect({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left")}
      >
        <span className={selected.length ? "text-foreground" : "text-muted-foreground"}>
          {selected.length ? `${selected.length} module${selected.length === 1 ? "" : "s"} selected` : "Select modules to enable"}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[260px] overflow-y-auto rounded-md border border-border bg-card py-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          {MODULE_CATALOG.map((mod) => {
            const on = selected.includes(mod.id);
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onToggle(mod.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-medium text-foreground">{mod.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
