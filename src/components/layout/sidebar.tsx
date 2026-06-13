"use client";

// Expanded sidebar (240px). Sourced from the mvp-final layout, but the Spot
// row is a Link to /spot (demo behavior) so the full Spot workflow surface
// still owns the right pane.
//
// Order (top → bottom):
//   1. Spot               (demo)
//   2. Dashboard          (mvp)
//   3. Projects           (mvp)
//   4. Campaigns          (demo)
//   5. Memory             (demo)
//   6. Leads              (demo, route /enquiries)
//   7. Outreach           (demo)
//   8. Tools section      (mvp): Enrichment (children), Contact extraction
//                                 (children), Creatives, AI calling agents,
//                                 Audiences (Soon).
//   — no Workspace section
//   9. Wallet widget      (mvp)
//  10. Demo toggles       (mvp): Empty State, Enrichment-Only, Enrichment
//                                 demo view
//  11. User + Settings    (mvp)

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  Monitor,
  FileText,
  Globe,
  Image as ImageIcon,
  Settings,
  Eye,
  EyeOff,
  UserSearch,
  ContactRound,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Activity,
  Database,
  ScanLine,
  ListChecks,
  Lock,
  PhoneCall,
  Wallet,
  Plus,
  Send,
  Brain,
  MessageCircle,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { useBillingModeStore } from "@/lib/billing-mode-store";
import { currentCycleWallet, billingMonthOptions } from "@/lib/credits-data";
import {
  useProducts,
  currentPreset,
  PRODUCT_PRESETS,
  type ProductPreset,
  type ProductKey,
} from "@/lib/products";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "@/components/spot/spot-mark";
import { WorkspaceSwitcher, UserRolePill } from "@/components/layout/workspace-switcher";
import { useCurrentUser } from "@/lib/workspace-store";

// ─── Top standalone items (above sections) ───────────────────────
// `product` (optional) ties the item to a ProductKey. In preview mode
// (any non-"full" preset) the sidebar still renders every item — the
// ones whose `product` isn't owned just render as locked rows that
// point to the matching /locked/<product> stub. Items without a
// `product` are brand-wide (Dashboard, Projects, Memory, Leads) and
// stay accessible in every preset.
// ── Nav model ──────────────────────────────────────────────────────
//
// The sidebar is built from one Dashboard item (top, standalone) plus
// three sections: Launch / Tools / Agents. Every item carries its own
// entitlement (`product` is an array of ProductKeys; any one of them
// unlocks the item) and the locked-state target href, so the renderer
// can lock/unlock items without a giant URL-match ladder.
//
// `product` is an array (OR semantics): an item with
// product: ["enrichment", "contact_extraction"] unlocks when the
// workspace owns either product. Items without a product list are
// brand-wide / always accessible.
type NavChild = {
  name: string;
  href: string;
  icon: typeof LayoutGrid;
};
type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutGrid;
  product?: ProductKey[];
  lockedHref?: string;
  children?: NavChild[];
  comingSoon?: boolean;
  // Active-state check uses exact match instead of startsWith. Set
  // this when another sibling item lives at a sub-path of this one
  // (e.g. Voice = /agents, WhatsApp = /agents/whatsapp — otherwise
  // navigating to /agents/whatsapp would light up both rows).
  exact?: boolean;
};
type NavSection = {
  label: string;
  items: NavItem[];
};

const dashboardItem: NavItem = {
  name: "Dashboard", href: "/dashboard", icon: LayoutGrid,
};

// Launch — top-level customer-facing workflows. Every workspace sees
// the section; entitlement gates individual items.
const launchSection: NavSection = {
  label: "Launch",
  items: [
    { name: "Projects",  href: "/projects",  icon: FolderKanban },
    { name: "Campaigns", href: "/campaigns", icon: Monitor,
      product: ["campaigns"], lockedHref: "/locked/ai-calling-agents" },
    { name: "Memory",    href: "/memory",    icon: Brain },
    { name: "Outreach",  href: "/outreach",  icon: Send,
      product: ["ai_calling"], lockedHref: "/locked/ai-calling-agents" },
  ],
};

// Tools — data and ops surfaces. Enrichment + Extraction only;
// Contacts moved out into its own section because contacts are an
// object the user works *with*, not a tool they run.
const toolsSection: NavSection = {
  label: "Tools",
  items: [
    {
      name: "Enrichment", href: "/enrichment", icon: UserSearch,
      product: ["enrichment"], lockedHref: "/locked/enrichment",
      children: [
        { name: "Dashboard", href: "/enrichment", icon: LayoutGrid },
        { name: "Enrich", href: "/enrichment/operations", icon: Activity },
        { name: "History", href: "/enrichment/database", icon: Database },
      ],
    },
    {
      // Renamed from "Contact extraction" — the Tools nav now reads
      // as terse verbs (Enrichment, Extraction) rather than mixing
      // nouns and verbs.
      name: "Extraction", href: "/contact-extraction", icon: ScanLine,
      product: ["contact_extraction"], lockedHref: "/locked/contact-extraction",
      children: [
        { name: "New extraction", href: "/contact-extraction/operations", icon: ScanLine },
        { name: "All contacts",   href: "/contact-extraction/database",   icon: ListChecks },
      ],
    },
  ],
};

// Contacts — its own top-level section, parallel to Tools. The
// contacts the workspace owns aren't a tool you run; they're the
// objects every other workflow operates on, so they get their own
// label. Only Leads lives here today.
const contactsSection: NavSection = {
  label: "Contacts",
  items: [
    { name: "Leads", href: "/enquiries", icon: FileText,
      product: ["enrichment", "contact_extraction"], lockedHref: "/locked/enrichment" },
  ],
};

// Agents — every active agent the workspace can run. Voice is the
// renamed AI calling agents surface; WhatsApp is a new agent type
// not yet shipped (rendered as "Coming Soon"); Creatives moves here
// because creative generation is also "agent work" rather than a
// tool. Voice carries `exact: true` because WhatsApp lives at a
// sub-path of /agents — without exact match, navigating to
// /agents/whatsapp would light up both rows.
const agentsSection: NavSection = {
  label: "Agents",
  items: [
    { name: "Voice",     href: "/agents",          icon: PhoneCall,
      product: ["ai_calling"], lockedHref: "/locked/ai-calling-agents",
      exact: true },
    { name: "WhatsApp",  href: "/agents/whatsapp", icon: MessageCircle,
      comingSoon: true },
    { name: "Creatives", href: "/creatives",       icon: ImageIcon,
      product: ["campaigns"], lockedHref: "/locked/ai-calling-agents" },
  ],
};

// Cycle anchor used across surfaces. Mirrors the billing page's
// CYCLE_START_DAY so the sidebar's current-cycle numbers match the
// billing hero's idea of "this cycle" exactly.
const CYCLE_START_DAY = 13;

function formatInrShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function WalletWidget() {
  const router = useRouter();
  // Same store + helper the Billing hero uses — guaranteed to agree.
  const planType     = useBillingModeStore((s) => s.prepaidPlanType);
  const carryForward = useBillingModeStore((s) => s.carryForward);
  const hydrate      = useBillingModeStore((s) => s.hydrate);
  const { products } = useProducts();
  useEffect(() => { hydrate(); }, [hydrate]);

  const enabledModuleIds = useMemo<readonly string[]>(() => {
    const ids: string[] = [];
    if (products.includes("enrichment"))         ids.push("enrichment");
    if (products.includes("contact_extraction")) ids.push("contact-extraction");
    if (products.includes("ai_calling"))         ids.push("ai-calling");
    return ids;
  }, [products]);

  // Current cycle window — `billingMonthOptions(1, ...)` returns the
  // active cycle as the first (and only) entry; its `days` count is
  // what the Billing hero feeds into utilizedInRange.
  const currentCycle = useMemo(
    () => billingMonthOptions(1, CYCLE_START_DAY)[0],
    [],
  );

  const wallet = useMemo(
    () => currentCycleWallet({
      planType,
      carryForward,
      cycleDays:        currentCycle.days,
      cycleOffsetFromEnd: currentCycle.offsetFromEnd,
      enabledModuleIds,
    }),
    [planType, carryForward, currentCycle.days, currentCycle.offsetFromEnd, enabledModuleIds],
  );

  const { used, totalAvailable, pctUsed } = wallet;
  // Bar + % text stay a single neutral tone regardless of usage.
  // Earlier this escalated to amber / red as the wallet ran low,
  // but the demo has too many ranges + plan toggles for that
  // mapping to stay honest. The % number itself carries the
  // urgency; the chrome stays calm.
  const tone = { bar: "rgba(15, 23, 42, 0.78)", text: "text-text-primary" };

  return (
    <div className="px-3 pb-2">
      <div className="rounded-[8px] border border-border-subtle bg-white px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wallet size={11} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
          <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px]">
            Wallet
          </span>
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
        <div className="flex items-center justify-between mt-1.5 text-[10px] tabular-nums">
          <span className="text-text-tertiary">
            <span className="text-text-secondary font-medium">{formatInrShort(used)}</span>
            <span className="mx-0.5">/</span>
            {formatInrShort(totalAvailable)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Route to Billing with ?topup=1 — the billing page reads
              // the param on mount and opens the TopUpEstimatorModal so
              // the user lands directly in the estimation flow.
              router.push("/settings/billing?topup=1");
            }}
            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-primary hover:underline"
            title={`${formatInrShort(Math.max(0, totalAvailable - used))} left this cycle`}
          >
            <Plus size={9} strokeWidth={2.5} />
            Top up
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { isEmpty, toggle, enrichmentVariant, setEnrichmentVariant } = useDemoMode();
  const { products, setProducts, has } = useProducts();
  // Which preset (if any) matches the current products list — drives
  // the highlight on the four preview-mode buttons in the sidebar
  // footer. Null = a custom combination that doesn't match any preset.
  const activePreset = currentPreset(products);
  const spotOpen = useSpotStore((s) => s.open);
  const user = useCurrentUser();

  // Manual expand/collapse overrides per parent href. `undefined` = follow the
  // route default (expanded when current path is under the parent). Toggling
  // the caret sets an explicit boolean; navigating elsewhere doesn't reset it.
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({});

  // All demo-mode toggles (Preview Empty States, Product preview
  // presets, Enrichment demo view) live inside one collapsible block.
  // It's a power-user feature for the sales-engineer demo; default
  // collapsed so the sidebar stays focused on the real navigation.
  // State persists only for the session.
  const [demoControlsOpen, setDemoControlsOpen] = useState(false);

  const isUnder = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/spot") return pathname === "/spot";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isExactlyAt = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href;
  };

  // Parent gets "active" treatment for any sub-route, including its children —
  // EXCEPT we want the parent's row not to look pressed while a child is the
  // current page. So highlight parent only when exactly on it.
  const isActiveForParent = (item: { href: string; children?: { href: string }[]; exact?: boolean }) => {
    if (item.children && item.children.length > 0) {
      const childOwnsParentRoute = item.children.some((c) => c.href === item.href);
      if (childOwnsParentRoute) return false;
      return isExactlyAt(item.href);
    }
    // `exact` items only light up when the path is exactly the item's
    // href — used when another sibling lives at a sub-path (e.g.
    // Voice = /agents, WhatsApp = /agents/whatsapp).
    if (item.exact) return isExactlyAt(item.href);
    return isUnder(item.href);
  };

  const navLinkClass = (active: boolean) =>
    `relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
      active
        ? "bg-surface-secondary text-text-primary font-medium"
        : "text-text-secondary hover:bg-surface-secondary/60"
    }`;

  // The three labelled sections rendered in order. Each section's
  // items share the same renderer below (locking + children + coming-
  // soon are per-item flags), so adding a fourth section in the future
  // is just adding to this array.
  const sections: NavSection[] = [launchSection, toolsSection, contactsSection, agentsSection];

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white border-r border-border flex flex-col z-50">
      {/* Workspace switcher · sits in the brand row */}
      <div className="px-2 pt-3 pb-2 border-b border-border-subtle">
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 pb-2">
        {/* Spot row · standalone, top. Brand-wide surface — renders in
            every mode, including preview presets, so the user can still
            jump to Spot regardless of the demo SKU mix. */}
        <div className="mb-1 space-y-0.5">
          <Link
            href="/spot"
            className={`relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] transition-colors duration-150 ${
              isUnder("/spot") || spotOpen
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
          </Link>
        </div>

        {/* Dashboard · standalone, below Spot, above the three
            labelled sections. Brand-wide surface — no product gating,
            available in every preset. */}
        <div className="mb-3 space-y-0.5">
          <Link
            href={dashboardItem.href}
            className={navLinkClass(isUnder(dashboardItem.href))}
            style={{ fontSize: "13.5px" }}
          >
            <dashboardItem.icon size={16} strokeWidth={1.5} />
            <span>{dashboardItem.name}</span>
          </Link>
        </div>

        {/* Three labelled sections · Launch / Tools / Agents. Each
            section uses the same item renderer below, which handles
            entitlement locking, children expansion, and coming-soon
            chips uniformly. Adding a section is just appending to
            `sections` above. */}
        {sections.map((section) => {
          if (section.items.length === 0) return null;
          return (
            <div className="mb-3" key={section.label}>
              <div className="label-section px-2 mb-1">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // Each item carries its own entitlement: `product`
                  // is an array of ProductKeys (OR semantics) and
                  // `lockedHref` is where to route when the workspace
                  // doesn't own any of those products. Items with no
                  // `product` stay accessible in every preset.
                  const isLockedByEntitlement = item.product && !item.product.some(has);
                  const lockedHref = isLockedByEntitlement ? (item.lockedHref ?? null) : null;
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
                        <Lock
                          size={11}
                          strokeWidth={1.75}
                          className="ml-auto text-text-tertiary"
                          aria-label="Locked"
                        />
                      </Link>
                    );
                  }
                  const cs = "comingSoon" in item && item.comingSoon;
                  if (cs) {
                    return (
                      <div
                        key={item.href}
                        className="relative flex items-center gap-2.5 px-2 h-8 rounded-[6px] text-text-tertiary cursor-default"
                        style={{ fontSize: "13.5px" }}
                      >
                        <item.icon size={16} strokeWidth={1.5} />
                        <span>{item.name}</span>
                        <span className="ml-auto text-[8px] font-medium px-1 py-0.5 rounded bg-surface-secondary text-text-tertiary">
                          Soon
                        </span>
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
                              if (
                                enrichmentVariant === "no-storage" &&
                                child.href === "/enrichment/database"
                              ) {
                                return false;
                              }
                              return true;
                            })
                            .map((child) => {
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

      {/* Wallet — always visible above the demo controls */}
      <WalletWidget />

      {/* Demo controls — collapsible. The Empty State toggle, the
          Product preview presets, and the Enrichment demo view are
          all power-user knobs the sales-engineer flips during a
          demo. None of them are something a customer would use, so
          they default closed to keep the sidebar focused on real
          navigation. The header shows an indigo dot when any of the
          controls is in a non-default state, so the operator can see
          at a glance that "something demo-ish is on" without opening
          the section. */}
      <div className="px-3 pb-2">
        {(() => {
          const anyActive = isEmpty || !!activePreset || enrichmentVariant !== "populated";
          return (
            <>
              <button
                type="button"
                onClick={() => setDemoControlsOpen((v) => !v)}
                className="w-full flex items-center gap-1 px-1 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-text-tertiary hover:text-text-secondary transition-colors"
                aria-expanded={demoControlsOpen}
              >
                {demoControlsOpen ? (
                  <ChevronDown size={9} strokeWidth={2} className="shrink-0" />
                ) : (
                  <ChevronRight size={9} strokeWidth={2} className="shrink-0" />
                )}
                <span>Demo controls</span>
                {!demoControlsOpen && anyActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6366F1]" aria-label="A demo control is active" />
                )}
              </button>
              {demoControlsOpen && (
                <div className="space-y-1.5 mt-1">
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

                  <div className="pt-1">
                    <div className="px-1 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                      Product preview
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {([
                        { id: "enrichment_only",         label: "Enrichment only" },
                        { id: "voice_only",              label: "Voice AI only" },
                        { id: "contact_extraction_only", label: "Contact Extraction only" },
                        { id: "voice_plus_enrichment",   label: "Voice + Enrichment" },
                      ] as { id: ProductPreset; label: string }[]).map((opt) => {
                        const active = activePreset === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setProducts(
                                active
                                  ? PRODUCT_PRESETS.full
                                  : PRODUCT_PRESETS[opt.id],
                              )
                            }
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[11px] font-medium transition-all duration-150 ${
                              active
                                ? "bg-[#EEF2FF] text-[#3730A3] border border-[#C7D2FE]"
                                : "bg-surface-secondary text-text-tertiary hover:text-text-secondary"
                            }`}
                          >
                            <Lock size={12} strokeWidth={2} />
                            {active ? `${opt.label} ON` : `Preview ${opt.label}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="px-1 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
                      Enrichment demo view
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { key: "populated", label: "Populated" },
                        { key: "empty", label: "Empty" },
                        { key: "no-crm", label: "No CRM" },
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
              )}
            </>
          );
        })()}
      </div>

      {/* User row · name + role + email + Settings cog. Sign out used
          to live here too, but it's already a first-class entry inside
          Settings → Profile, and keeping it in the sidebar duplicated
          the action in two places a click apart. */}
      <div className="border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-medium text-text-secondary">
              {user.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)}
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
