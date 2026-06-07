"use client";

// Module-level tab strip shared by every top-level Tools module (Enrichment,
// Contact extraction, ...). Three tabs by convention:
//   Dashboard , analytics view (the module's base route)
//   Operations, where the user does work (composers, CRM sync, etc.)
//   Database  , the resulting record store for that module
//
// Each link is a real route so URLs are shareable and the active tab survives
// reload. Pass `basePath` (e.g. "/enrichment") and the currently active key.

import Link from "next/link";
import { Activity, Database, LayoutGrid, type LucideIcon } from "lucide-react";

export type ModuleTabKey = "dashboard" | "operations" | "database";

interface TabDef {
  key: ModuleTabKey;
  label: string;
  icon: LucideIcon;
  segment: string;
}

const TABS: TabDef[] = [
  { key: "dashboard",  label: "Dashboard",  icon: LayoutGrid, segment: "" },
  { key: "operations", label: "Operations", icon: Activity,   segment: "/operations" },
  { key: "database",   label: "Database",   icon: Database,   segment: "/database" },
];

export function ModuleTabs({
  basePath,
  active,
}: {
  basePath: string;
  active: ModuleTabKey;
}) {
  return (
    <div className="mb-6">
      <div
        role="tablist"
        aria-label="Module section"
        className="inline-flex items-center bg-surface-secondary/60 border border-border rounded-input p-1 gap-1"
      >
        {TABS.map(({ key, label, icon: Icon, segment }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={`${basePath}${segment}`}
              role="tab"
              aria-selected={isActive}
              className={[
                "inline-flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-medium rounded-[6px] transition-colors",
                isActive
                  ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(15,15,15,0.06)]"
                  : "text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              <Icon size={12.5} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
