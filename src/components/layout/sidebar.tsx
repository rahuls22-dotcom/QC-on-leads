"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  Monitor,
  Zap,
  FileText,
  Globe,
  Image as ImageIcon,
  Plug,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { WorkspaceSwitcher, UserRolePill } from "@/components/layout/workspace-switcher";
import { useCurrentUser } from "@/lib/workspace-store";

const dashboardItem = { name: "Dashboard", href: "/dashboard", icon: LayoutGrid };

const navSections = [
  {
    label: "Lead Generation",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Campaigns", href: "/campaigns", icon: Monitor },
    ],
  },
  {
    label: "CRM",
    items: [
      { name: "Leads", href: "/enquiries", icon: FileText },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "Creatives", href: "/creatives", icon: ImageIcon },
      { name: "Agents", href: "/agents-mvp", icon: Zap },
      { name: "Audiences", href: "/audiences", icon: Globe, comingSoon: true },
      { name: "Integrations", href: "/integrations", icon: Plug, comingSoon: true },
    ],
  },
  {
    label: "Workspace",
    items: [
      { name: "Brand", href: "/brand", icon: Sparkles },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isEmpty, toggle } = useDemoMode();
  const askSpot = useSpotStore((s) => s.askSpot);
  const spotOpen = useSpotStore((s) => s.open);
  const user = useCurrentUser();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    `relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
      isActive(href)
        ? "bg-surface-secondary text-text-primary font-medium"
        : "text-text-secondary hover:bg-surface-secondary/60"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white border-r border-border flex flex-col z-50">
      {/* Workspace switcher — sits in the brand row; the workspace mark IS
          the brand mark in this product (Revspot is implicit). */}
      <div className="px-2 pt-3 pb-2 border-b border-border-subtle">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 pb-2">
        {/* Dashboard + Spot — standalone at top */}
        <div className="mb-3 space-y-0.5">
          <Link href={dashboardItem.href} className={navLinkClass(dashboardItem.href)} style={{ fontSize: "13.5px" }}>
            <dashboardItem.icon size={16} strokeWidth={1.5} />
            <span>{dashboardItem.name}</span>
          </Link>
          <button
            type="button"
            onClick={() => askSpot("")}
            className={`relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 w-full text-left ${
              spotOpen
                ? "bg-surface-secondary text-text-primary font-medium"
                : "text-text-secondary hover:bg-surface-secondary/60"
            }`}
            style={{ fontSize: "13.5px" }}
          >
            <span className="inline-flex items-center justify-center" style={{ width: 16, height: 16 }}>
              <SpotMark size={14} />
            </span>
            <span>Spot</span>
            <span
              className="ml-auto"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#1A1A1A" }}
              aria-hidden
              title="New from Spot"
            />
          </button>
        </div>

        {/* Sections */}
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            <div className="label-section px-2 mb-1">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const cs = "comingSoon" in item && item.comingSoon;
                if (cs) {
                  return (
                    <div key={item.href} className="relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] text-text-tertiary cursor-default" style={{ fontSize: "13.5px" }}>
                      <item.icon size={16} strokeWidth={1.5} />
                      <span>{item.name}</span>
                      <span className="ml-auto text-[8px] font-medium px-1 py-0.5 rounded bg-surface-secondary text-text-tertiary">Soon</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navLinkClass(item.href)}
                    style={{ fontSize: "13.5px" }}
                  >
                    <item.icon size={16} strokeWidth={1.5} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Demo mode toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[11px] font-medium transition-all duration-150 ${
            isEmpty
              ? "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
              : "bg-surface-secondary text-text-tertiary hover:text-text-secondary"
          }`}
        >
          {isEmpty ? <EyeOff size={12} strokeWidth={2} /> : <Eye size={12} strokeWidth={2} />}
          {isEmpty ? "Empty State Mode ON" : "Preview Empty States"}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-medium text-text-secondary">
              {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-text-primary leading-tight flex items-center gap-1.5">
              <span className="truncate">{user.name}</span>
              <UserRolePill />
            </div>
            <div className="text-[10px] text-text-tertiary truncate">{user.email}</div>
          </div>
          <button className="p-1 text-text-tertiary hover:text-text-secondary transition-colors">
            <Settings size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
