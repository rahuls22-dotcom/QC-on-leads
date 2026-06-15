"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  Users,
  Flag,
  Home,
  ListChecks,
  UserCircle2,
  Sparkles,
  Contact,
  Landmark,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

type NavSection = {
  label?: string;
  collapsible?: boolean;
  items: NavItem[];
};

// Nav matches the production admin screenshot: ungrouped Projects/Clients
// at the top, then three labelled sections. Sequences is currently the
// route that owns the QC leads view (placeholder until /leads gets its own
// proper route).
const sections: NavSection[] = [
  {
    items: [
      { name: "Projects", href: "/", icon: FolderKanban },
      { name: "Organization", href: "/clients", icon: Users },
    ],
  },
  {
    label: "LEAD GENERATION",
    collapsible: true,
    items: [
      { name: "Campaigns", href: "/campaigns", icon: Flag },
      { name: "Audiences", href: "/audiences", icon: Home },
    ],
  },
  {
    label: "LEAD QUALIFICATION",
    items: [
      { name: "Sequences", href: "/", icon: ListChecks },
      { name: "Agents", href: "/agents", icon: UserCircle2 },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { name: "Enrichment", href: "/enrichment", icon: Sparkles },
      { name: "Contacts", href: "/contacts", icon: Contact },
      { name: "Financial Enrichment", href: "/financial-enrichment", icon: Landmark },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  // Both Projects and Sequences route to "/" right now (Sequences hosts the
  // QC leads view). Active state goes to Sequences since that's what the
  // current screen represents. /clients owns the Clients item.
  const isActiveItem = (label: string) => {
    if (pathname.startsWith("/agents")) return label === "Agents";
    if (pathname === "/" || pathname.startsWith("/leads")) return label === "Sequences";
    if (pathname.startsWith("/clients")) return label === "Organization";
    return false;
  };

  return (
    <aside className="w-[224px] shrink-0 border-r border-border bg-background overflow-y-auto">
      {/* Brand */}
      <div className="px-5 pt-5 pb-6 flex items-center gap-2">
        <div className="w-5 h-5 rounded-sm bg-foreground" />
        <span className="text-[15px] font-bold tracking-[0.04em] text-foreground">
          REVSPOT
        </span>
      </div>

      <nav className="px-2.5 pb-6 space-y-5">
        {sections.map((section, sectionIdx) => (
          <div key={section.label ?? `__sec-${sectionIdx}`} className="space-y-0.5">
            {section.label && (
              <div className="px-2.5 pb-1.5 flex items-center gap-1">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
                  {section.label}
                </span>
                {section.collapsible && (
                  <ChevronDown
                    size={11}
                    strokeWidth={2}
                    className="text-muted-foreground"
                  />
                )}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActiveItem(item.name);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] transition-colors",
                    active
                      ? "bg-secondary text-foreground font-medium"
                      : "text-secondary-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
