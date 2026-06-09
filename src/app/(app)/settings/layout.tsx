"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Sparkles, BarChart3, CreditCard, Plug } from "lucide-react";

const ACCOUNT_NAV = [
  { name: "Agency", href: "/settings/agency", icon: Building2 },
  { name: "Workspace", href: "/settings/workspace", icon: Sparkles },
  // "Usage" is the home for the consumption story (units only — calls,
  // mins, lookups). Was previously labelled "Utilization" but the user
  // asked for plainer language. URL stays /settings/utilization to avoid
  // breaking bookmarks and any deep-links already in the wild.
  { name: "Usage", href: "/settings/utilization", icon: BarChart3 },
  { name: "Billing", href: "/settings/billing", icon: CreditCard },
];

const CONNECTIONS_NAV = [
  { name: "Integrations", href: "/settings/integrations", icon: Plug },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const renderLink = (item: { name: string; href: string; icon: typeof Building2 }) => {
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
          <nav className="space-y-4">
            <div className="space-y-0.5">
              <div className="px-2 mb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                Account
              </div>
              {ACCOUNT_NAV.map(renderLink)}
            </div>
            <div className="space-y-0.5">
              <div className="px-2 mb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                Connections
              </div>
              {CONNECTIONS_NAV.map(renderLink)}
            </div>
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
