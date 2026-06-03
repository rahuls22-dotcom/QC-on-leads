"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Sparkles, Wallet, CreditCard } from "lucide-react";

const SETTINGS_NAV = [
  { name: "Agency", href: "/settings/agency", icon: Building2 },
  { name: "Workspace", href: "/settings/workspace", icon: Sparkles },
  { name: "Wallet", href: "/settings/wallet", icon: Wallet },
  { name: "Billing", href: "/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-text-primary">Settings</h1>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Manage your agency, workspace, wallet, and billing.
        </p>
      </div>
      <div className="flex gap-8">
        <aside className="w-[200px] flex-shrink-0">
          <nav className="space-y-0.5">
            {SETTINGS_NAV.map((item) => {
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
            })}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
