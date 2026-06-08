"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  UserSearch,
  ContactRound,
  ChevronRight,
  ChevronUp,
  Activity,
  Database,
  ScanLine,
  ListChecks,
  Lock,
  PhoneCall,
  Wallet,
  Plus,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { useProducts } from "@/lib/products";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { WorkspaceSwitcher, UserRolePill } from "@/components/layout/workspace-switcher";
import { useCurrentUser } from "@/lib/workspace-store";
import { poolSummary } from "@/lib/credits-data";
import { useBillingModeStore } from "@/lib/billing-mode-store";

const dashboardItem = { name: "Dashboard", href: "/dashboard", icon: LayoutGrid };

// Compact Indian-grouped rupee formatter for the sidebar widget — same
// "1.5K" / "2L" scheme the wallet page hero uses so the two readings
// agree at a glance.
function formatInrShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Sidebar wallet — drives the user's "do I still have head-room?" check
// without leaving whatever page they're on. The numbers all come from the
// same poolSummary() that backs the full wallet page, so the sidebar
// reading and the /settings/wallet reading never disagree.
//
// Visible whenever billing mode is prepaid, regardless of which products
// the workspace owns (enrichment-only, calling-only, or the full plan).
// Postpaid orgs have no balance to manage, so the widget hides itself.
// Calling is always-prepaid by design, so the widget is effectively
// always-on for calling-only customers.
function WalletWidget() {
  const router = useRouter();
  const pool   = poolSummary();
  const used      = pool.utilized;
  const total     = pool.totalCredits;
  const pctUsed   = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  // Tone escalates only when the balance is genuinely close to empty, so
  // the colour means something when it appears.
  const tone =
      pctUsed >= 90 ? { bar: "#DC2626", text: "text-[#DC2626]" }
    : pctUsed >= 75 ? { bar: "#D97706", text: "text-[#92400E]" }
    : { bar: "rgba(15, 23, 42, 0.78)", text: "text-text-primary" };

  return (
    <div className="px-3 pb-2">
      <button
        type="button"
        onClick={() => router.push("/settings/utilization")}
        className="w-full text-left rounded-[8px] border border-border-subtle bg-white hover:border-text-tertiary hover:shadow-sm transition-all px-2.5 py-2"
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wallet size={11} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">Wallet</span>
          <span className={`text-[10px] font-semibold tabular-nums ${tone.text} ml-auto`}>
            {Math.round(pctUsed)}%
          </span>
        </div>
        <div className="h-1 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pctUsed.toFixed(1)}%`, background: tone.bar }}
          />
        </div>
        {/* Used / total in pure ₹. All denominations on this widget are
            rupees — no credits, no minutes — so the sidebar reading
            matches what the wallet page shows for the same workspace. */}
        <div className="flex items-center justify-between mt-1.5 text-[10px] tabular-nums">
          <span className="text-text-tertiary">
            <span className="text-text-secondary font-medium">{formatInrShort(used)}</span>
            <span className="mx-0.5">/</span>
            {formatInrShort(total)}
          </span>
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push("/settings/utilization");
            }}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-primary hover:underline cursor-pointer"
          >
            <Plus size={9} strokeWidth={2.5} />
            Top up
          </span>
        </div>
      </button>
    </div>
  );
}

// When enrichment-only plan is on, only these hrefs survive in the Tools nav.
// All other sections (Lead Generation, CRM, Workspace) are hidden entirely.
const ENRICHMENT_ONLY_HREFS = new Set(["/enrichment", "/contact-extraction", "/agents-mvp"]);


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
      {
        name: "Enrichment",
        href: "/enrichment",
        icon: UserSearch,
        children: [
          { name: "Dashboard",          href: "/enrichment",            icon: LayoutGrid },
          { name: "Enrich",             href: "/enrichment/operations", icon: Activity },
          { name: "History", href: "/enrichment/database",   icon: Database },
        ],
      },
      {
        name: "Contact extraction",
        href: "/contact-extraction",
        icon: ContactRound,
        children: [
          { name: "New extraction", href: "/contact-extraction/operations", icon: ScanLine },
          { name: "All contacts",   href: "/contact-extraction/database",   icon: ListChecks },
        ],
      },
      { name: "Creatives", href: "/creatives", icon: ImageIcon },
      { name: "AI calling agents", href: "/agents-mvp", icon: PhoneCall },
      { name: "Audiences", href: "/audiences", icon: Globe, comingSoon: true },
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
  const pathname = usePathname() || "";
  const { isEmpty, toggle, enrichmentVariant, setEnrichmentVariant } = useDemoMode();
  const { setProducts, enrichmentOnly } = useProducts();
  const askSpot = useSpotStore((s) => s.askSpot);
  const spotOpen = useSpotStore((s) => s.open);
  const user = useCurrentUser();

  // Billing mode drives whether the sidebar wallet widget renders.
  // Prepaid orgs have a balance to track and a top-up flow; postpaid
  // orgs don't have a wallet to manage, so the widget would only
  // surface a meaningless bar — hidden entirely for them. Calling-only
  // workspaces are always prepaid by product design, so the widget is
  // effectively always-on for that customer profile.
  const billingMode    = useBillingModeStore((s) => s.mode);
  const hydrateBilling = useBillingModeStore((s) => s.hydrate);
  useEffect(() => { hydrateBilling(); }, [hydrateBilling]);
  const showWalletWidget = billingMode === "prepaid";

  // Manual expand/collapse overrides per parent href. `undefined` = follow the
  // route default (expanded when current path is under the parent). Toggling the
  // caret sets an explicit boolean; navigating elsewhere doesn't reset it.
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({});

  // Used to decide whether to render a parent's children. True when current
  // path is under the parent (e.g. /enrichment, /enrichment/operations).
  const isUnder = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Parent active highlight = exact match only when item has no children OR
  // when we're at the exact parent path. Children expand the highlight to
  // themselves when they own a deeper segment.
  const isExactlyAt = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href;
  };

  // Parent gets "active" treatment for any sub-route, including its children —
  // EXCEPT we want the parent's row not to look pressed while a child is the
  // current page. So highlight parent only when exactly on it.
  const isActiveForParent = (item: { href: string; children?: { href: string }[] }) => {
    if (item.children && item.children.length > 0) {
      // If a child shares the parent's href (parent doubles as a child route),
      // let that child own the active highlight, don't double-highlight.
      const childOwnsParentRoute = item.children.some((c) => c.href === item.href);
      if (childOwnsParentRoute) return false;
      return isExactlyAt(item.href);
    }
    return isUnder(item.href);
  };

  const navLinkClass = (active: boolean) =>
    `relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
      active
        ? "bg-surface-secondary text-text-primary font-medium"
        : "text-text-secondary hover:bg-surface-secondary/60"
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white border-r border-border flex flex-col z-50">
      {/* Workspace switcher, sits in the brand row; the workspace mark IS
          the brand mark in this product (Revspot is implicit). */}
      <div className="px-2 pt-3 pb-2 border-b border-border-subtle">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 pb-2">
        {/* Dashboard + Spot, standalone at top. Hidden in enrichment-only mode. */}
        {!enrichmentOnly && (
        <div className="mb-3 space-y-0.5">
          <Link href={dashboardItem.href} className={navLinkClass(isUnder(dashboardItem.href))} style={{ fontSize: "13.5px" }}>
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
        )}

        {/* Sections */}
        {navSections.map((section) => {
          const items = enrichmentOnly
            ? section.items.filter((it) => ENRICHMENT_ONLY_HREFS.has(it.href))
            : section.items;
          if (items.length === 0) return null;
          return (
          <div key={section.label} className="mb-3">
            <div className="label-section px-2 mb-1">{section.label}</div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const lockedHref =
                  enrichmentOnly && item.href === "/contact-extraction"
                    ? "/locked/contact-extraction"
                    : enrichmentOnly && item.href === "/agents-mvp"
                    ? "/locked/ai-calling-agents"
                    : null;
                if (lockedHref) {
                  const locked = isUnder(lockedHref);
                  return (
                    <Link
                      key={item.href}
                      href={lockedHref}
                      className={`relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
                        locked
                          ? "bg-surface-secondary text-text-primary font-medium"
                          : "text-text-tertiary hover:bg-surface-secondary/60 hover:text-text-secondary"
                      }`}
                      style={{ fontSize: "13.5px" }}
                    >
                      <item.icon size={16} strokeWidth={1.5} />
                      <span>{item.name}</span>
                      <Lock size={11} strokeWidth={1.75} className="ml-auto text-text-tertiary" aria-label="Locked" />
                    </Link>
                  );
                }
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
                const children = ("children" in item ? item.children : undefined) as
                  | { name: string; href: string; icon: typeof item.icon }[]
                  | undefined;
                const hasChildren = !!children && children.length > 0;
                const isExpanded = hasChildren
                  ? (expandedOverride[item.href] ?? isUnder(item.href))
                  : false;
                const toggleExpanded = (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpandedOverride((s) => ({ ...s, [item.href]: !isExpanded }));
                };
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (hasChildren) {
                          setExpandedOverride((s) => ({ ...s, [item.href]: true }));
                        }
                      }}
                      className={navLinkClass(isActiveForParent(item))}
                      style={{ fontSize: "13.5px" }}
                    >
                      <item.icon size={16} strokeWidth={1.5} />
                      <span>{item.name}</span>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={toggleExpanded}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                          aria-expanded={isExpanded}
                          className="ml-auto p-0.5 -mr-0.5 rounded hover:bg-surface-tertiary/60 text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp size={12} strokeWidth={2} />
                          ) : (
                            <ChevronRight size={12} strokeWidth={2} />
                          )}
                        </button>
                      )}
                    </Link>
                    {hasChildren && isExpanded && (
                      <div className="mt-0.5 mb-1 ml-[14px] pl-3 border-l border-border-subtle space-y-0.5">
                        {children!
                          .filter((child) => {
                            // No-storage clients have no persistent records DB,
                            // so the "History" sub-tab is hidden.
                            // The route still exists as a fallback for direct
                            // links and renders an explainer empty state.
                            if (
                              enrichmentVariant === "no-storage" &&
                              child.href === "/enrichment/database"
                            ) {
                              return false;
                            }
                            return true;
                          })
                          .map((child) => {
                          // When child shares the parent's href, use exact match
                          // so it doesn't stay highlighted on sibling sub-routes.
                          const childActive =
                            child.href === item.href
                              ? pathname === child.href
                              : isUnder(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`relative flex items-center gap-2 px-2 h-7 rounded-[6px] transition-colors duration-150 ${
                                childActive
                                  ? "bg-surface-secondary text-text-primary font-medium"
                                  : "text-text-secondary hover:bg-surface-secondary/60"
                              }`}
                              style={{ fontSize: "12.5px" }}
                            >
                              <child.icon size={13} strokeWidth={1.5} />
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}

      </nav>

      {/* Wallet — visible whenever billing mode is prepaid, across all
          product entitlements (enrichment-only, calling-only, full
          plan). Postpaid orgs hide it entirely since there's no
          balance to manage. */}
      {showWalletWidget && <WalletWidget />}

      {/* Demo mode toggles */}
      <div className="px-3 pb-2 space-y-1.5">
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
        {/* Enrichment-only plan toggle. ON = workspace owns only Enrichment,
            which triggers the locked/upsell flows. OFF = full product suite. */}
        <button
          onClick={() =>
            setProducts(
              enrichmentOnly
                ? ["enrichment", "ai_calling", "campaigns"]
                : ["enrichment"],
            )
          }
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[11px] font-medium transition-all duration-150 ${
            enrichmentOnly
              ? "bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]"
              : "bg-surface-secondary text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Lock size={12} strokeWidth={2} />
          {enrichmentOnly ? "Enrichment-Only Plan ON" : "Preview Enrichment-Only"}
        </button>

        {/* Enrichment demo view (4 independent radio chips). Drives every
            /enrichment tab from one place so the user can A/B states without
            leaving the sidebar. */}
        <div className="pt-1">
          <div className="px-1 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
            Enrichment demo view
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { key: "populated",  label: "Populated" },
              { key: "empty",      label: "Empty" },
              { key: "no-crm",     label: "No CRM" },
              { key: "no-storage", label: "No storage" },
            ].map((opt) => {
              const active = enrichmentVariant === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setEnrichmentVariant(opt.key as typeof enrichmentVariant)}
                  className={`px-2 py-1.5 rounded-[6px] text-[11px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-text-primary text-white"
                      : "bg-surface-secondary text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
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
          <Link
            href="/settings"
            aria-label="Settings"
            className={`p-1 transition-colors ${
              isUnder("/settings")
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Settings size={14} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
