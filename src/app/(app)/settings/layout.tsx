"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Sparkles, BarChart3, CreditCard, Plug, UserCircle2, LogOut } from "lucide-react";

const ACCOUNT_NAV = [
  // Personal profile lives at the top of Account — it's the "what's
  // mine" entry (name, email, password) before the team / agency-level
  // settings that follow.
  { name: "Profile", href: "/settings/profile", icon: UserCircle2 },
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
  const router   = useRouter();

  const handleLogout = () => {
    // Prototype-grade logout — clear demo localStorage flags and route
    // to the public login page. A real implementation would call the
    // auth provider's sign-out (and revoke server-side session).
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Log out of Revspot?");
      if (!confirmed) return;
      try {
        // Clear any persisted demo state so a fresh session starts clean.
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith("revspot:"))
          .forEach((k) => window.localStorage.removeItem(k));
      } catch { /* ignore */ }
    }
    router.push("/login");
  };

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
            {/* Logout — sits at the bottom of the nav so it's reachable
                from any settings page but visually disconnected from
                the navigable sections (it's an action, not a route).
                Confirms before logging out to avoid an accidental click
                wiping the demo state. */}
            <div className="pt-3 mt-3 border-t border-border-subtle">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2 h-8 rounded-[6px] text-text-secondary hover:bg-surface-secondary/60 hover:text-[#DC2626] transition-colors duration-150"
                style={{ fontSize: "13.5px" }}
              >
                <LogOut size={16} strokeWidth={1.5} />
                <span>Log out</span>
              </button>
            </div>
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
