"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, Plug, UserCircle2 } from "lucide-react";

// Flat list in the order the user asked for: Usage answers "what's
// been consumed?", Billing covers cycle / invoices / top-ups,
// Integrations covers the connected systems, and Profile holds
// account actions (including Log out). URLs stay as-is so
// /settings/utilization keeps working for bookmarks.
const SETTINGS_NAV = [
  { name: "Usage",        href: "/settings/utilization",  icon: BarChart3 },
  { name: "Billing",      href: "/settings/billing",      icon: CreditCard },
  { name: "Integrations", href: "/settings/integrations", icon: Plug },
  { name: "Profile",      href: "/settings/profile",      icon: UserCircle2 },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const renderLink = (item: { name: string; href: string; icon: typeof BarChart3 }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
          active
            ? "bg-surface-secondary text-text-primary font-medium"
            : "text-text-secondary hover:bg-surface-secondary/60"
        }`}
        style={{ fontSize: "13.5px" }}
      >
        <item.icon size={16} strokeWidth={1.5} />
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-text-primary">Settings</h1>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Manage your account, integrations, and lead delivery.
        </p>
      </div>
      <div className="flex gap-5">
        <aside className="w-[176px] flex-shrink-0">
          {/* Flat list — no Account/Connections sub-headers. With only
              four items, the headers were paying rent without earning
              it: they added vertical noise and a forced grouping when
              the user just wants to scan and click. */}
          <nav className="space-y-0.5">
            {SETTINGS_NAV.map(renderLink)}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
