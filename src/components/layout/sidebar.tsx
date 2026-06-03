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
  PhoneCall,
  Wallet,
  Plus,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { WorkspaceSwitcher, UserRolePill } from "@/components/layout/workspace-switcher";
import { useCurrentUser } from "@/lib/workspace-store";

const dashboardItem = { name: "Dashboard", href: "/dashboard", icon: LayoutGrid };

// Wallet — representative balance shown in the sidebar so the user always
// knows how much head-room they have before they need to top up. The unit is
// minutes since that's what voice-agent platforms actually meter; we also
// expose the rupee equivalent for the demo persona (Indian real-estate).
// Numbers are intentionally a "real-feeling" middle state — not full, not
// empty — so the bar reads as actively in use.
const WALLET = {
  totalMinutes: 5000,
  usedMinutes:  3250,
  // Used for the secondary rupee display. ₹X per minute is editorial.
  rupeesPerMinute: 8,
};

function formatInrShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Compact sidebar wallet — sized to sit comfortably above the user row
// without crowding the nav. We dropped the inner card + decorative coin
// from the earlier version; both were eating vertical space that the nav
// items needed. What remains: utilization % + minutes used/total + a thin
// bar + a tiny Top up link. The whole widget fits in ~58 px of vertical.
function WalletWidget() {
  const { totalMinutes, usedMinutes, rupeesPerMinute } = WALLET;
  const remaining = Math.max(0, totalMinutes - usedMinutes);
  const pctUsed = totalMinutes > 0 ? Math.min(100, (usedMinutes / totalMinutes) * 100) : 0;
  // Bar tone — stays neutral dark by default. Purple was the brand accent
  // but read as decorative chrome next to the rest of the sidebar's
  // monochrome nav; the wallet shouldn't compete with active-route
  // highlighting. Keep amber + red for the genuinely-alarming thresholds
  // since those need to grab attention.
  const tone =
      pctUsed >= 90 ? { bar: "#DC2626", text: "text-[#DC2626]" }
    : pctUsed >= 75 ? { bar: "#D97706", text: "text-[#92400E]" }
    : { bar: "rgba(15, 23, 42, 0.78)", text: "text-text-primary" };

  return (
    <div className="px-3 pb-2">
      <div className="rounded-[8px] border border-border-subtle bg-white px-2.5 py-2">
        {/* Single-row header: icon + label + percent + Top up. All in one
            line so the wallet fits in the chrome without taking real-estate
            from nav items. The percent doubles as both a status indicator
            and the only header chip — no separate "used" sub-line below. */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wallet size={11} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Wallet</span>
          <span className={`text-[10px] font-semibold tabular-nums ${tone.text} ml-auto`}>
            {Math.round(pctUsed)}%
          </span>
        </div>

        {/* Bar — primary visual */}
        <div className="h-1 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctUsed.toFixed(1)}%`, background: tone.bar }}
          />
        </div>

        {/* Footer: used/total minutes + Top up */}
        <div className="flex items-center justify-between mt-1.5 text-[10px] tabular-nums">
          <span className="text-text-tertiary">
            <span className="text-text-secondary font-medium">{usedMinutes.toLocaleString()}</span>
            <span className="mx-0.5">/</span>
            {totalMinutes.toLocaleString()} min
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-primary hover:underline"
            title={`${remaining.toLocaleString()} min · ${formatInrShort(remaining * rupeesPerMinute)} left`}
          >
            <Plus size={9} strokeWidth={2.5} />
            Top up
          </button>
        </div>
      </div>
    </div>
  );
}

// Nav structure mirrors origin/main exactly — only addition is the new
// "Outreach" entry under Lead Generation. Everything else (CRM/Leads tab,
// Tools group, Workspace > Brand, original icon set and section weights)
// is preserved so the sidebar matches the deployed dashboard 1:1.
const navSections = [
  {
    label: "Lead Generation",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Campaigns", href: "/campaigns", icon: Monitor },
      { name: "Outreach", href: "/outreach", icon: PhoneCall },
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
      { name: "Integrations", href: "/integrations", icon: Plug },
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

        {/* Settings — bottom of nav */}
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <Link href="/settings" className={navLinkClass("/settings")} style={{ fontSize: "13.5px" }}>
            <Settings size={16} strokeWidth={1.5} />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Wallet — always visible above the user section so the user knows
          how much head-room they have without leaving the page. */}
      <WalletWidget />

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
