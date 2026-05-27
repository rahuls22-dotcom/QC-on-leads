"use client";

// Narrow icon rail (60px). Every nav item is a 40×40 icon button with a
// tooltip that appears to the right on hover. The full-width sidebar is
// gone — the platform is dense; vertical real-estate matters more than
// labels you read once and learn.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import {
  LayoutGrid,
  Monitor,
  FileText,
  Plug,
  Eye,
  EyeOff,
  Sparkles,
  BrainCircuit,
  Database,
  ScanLine,
  Send,
  Bot,
  Check,
} from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { SpotMark } from "@/components/spot/spot-mark";
import { RevspotLogo } from "@/components/layout/revspot-logo";
import {
  redirectAfterScopeSwitch,
  useAccessibleWorkspaces,
  useCurrentScope,
  useCurrentUser,
  useWorkspaceStore,
} from "@/lib/workspace-store";
import { getWorkspace } from "@/lib/workspace-data";
import { projectsForWorkspace } from "@/lib/project-data";

// Match Lucide's ForwardRefExoticComponent signature via `typeof LayoutGrid`
// — using a narrower React.ComponentType<{size, strokeWidth}> rejects
// Lucide icons at compile time on strict tsconfigs (Vercel-style).
type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutGrid;
  description?: string;
  comingSoon?: boolean;
};

// Sidebar philosophy (this pass): one item per row, no noise. Long-lived
// nouns (Products, Personas, Creatives, Audiences, Performance, History)
// all live inside /memory — they don't deserve top-level real estate.
// The top of the rail is the daily working set: Dashboard → Campaigns →
// Memory → Leads → outbound + data + agents → workspace.
const navGroups: NavItem[][] = [
  [
    { name: "Dashboard", href: "/dashboard", icon: LayoutGrid, description: "Metrics, leads, voice perf" },
    { name: "Campaigns", href: "/campaigns", icon: Monitor, description: "Meta · Google · live spend" },
    { name: "Memory", href: "/memory", icon: BrainCircuit, description: "Products, personas, creatives, performance & change history" },
    { name: "Leads", href: "/enquiries", icon: FileText, description: "CRM inbox" },
  ],
  [{ name: "Outreach", href: "/outreach", icon: Send, description: "Voice + WhatsApp outbound" }],
  [
    { name: "Enrichment", href: "/enrichment", icon: Database, description: "Thicken leads with verified data" },
    { name: "Contact Extraction", href: "/contact-extraction", icon: ScanLine, description: "Find net-new validated contacts" },
  ],
  [{ name: "Agents", href: "/agents-mvp", icon: Bot, description: "Voice + WhatsApp agents Spot dispatches" }],
  [
    { name: "Brand", href: "/brand", icon: Sparkles, description: "Workspace brand & voice" },
    { name: "Integrations", href: "/integrations", icon: Plug, description: "Connect ad accounts", comingSoon: true },
  ],
];

/**
 * Wraps a trigger element and renders its tooltip into document.body via
 * a portal. We portal because the rail's <nav> uses overflow-y-auto, which
 * implicitly clips horizontal overflow too — a tooltip rendered as a
 * child would never escape the 60px sidebar. Portaling sidesteps that.
 *
 * Tooltip position is computed from the trigger's getBoundingClientRect()
 * on each hover so it stays accurate even if the rail scrolls.
 */
function TooltipWrap({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  // The child is the actual trigger (a Link or button). We inject our
  // ref + hover handlers onto it via cloneElement so the trigger element
  // *is* the bounding box — no wrapper that would distort positioning.
  children: ReactElement<{
    ref?: React.Ref<HTMLElement>;
    onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  }>;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
  };

  const onEnter = () => {
    updatePosition();
    setVisible(true);
  };
  const onLeave = () => setVisible(false);

  // Inject ref + hover/focus handlers onto the trigger directly.
  const trigger = isValidElement(children)
    ? cloneElement(children, {
        ref,
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
        onFocus: onEnter,
        onBlur: onLeave,
      })
    : children;

  return (
    <>
      {trigger}
      {mounted && visible && pos &&
        createPortal(
          <div
            className="pointer-events-none fadeUp"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              transform: "translateY(-50%)",
              background: "#111",
              color: "#FAFAF8",
              padding: "6px 10px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
              zIndex: 200,
            }}
          >
            <div className="text-[12px] font-medium leading-tight">{label}</div>
            {description && (
              <div className="text-[10.5px] text-white/55 mt-0.5 font-normal">{description}</div>
            )}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: -3,
                top: "50%",
                transform: "translateY(-50%) rotate(45deg)",
                width: 7,
                height: 7,
                background: "#111",
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const className = `relative flex items-center justify-center w-10 h-10 rounded-[8px] transition-colors duration-150 ${
    active
      ? "bg-surface-secondary text-text-primary"
      : item.comingSoon
        ? "text-text-tertiary cursor-default"
        : "text-text-secondary hover:bg-surface-secondary/60 hover:text-text-primary"
  }`;
  const inner = (
    <>
      <Icon size={17} strokeWidth={1.6} />
      {item.comingSoon && (
        <span
          aria-hidden
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-text-tertiary/50"
        />
      )}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-text-primary"
        />
      )}
    </>
  );

  return (
    <TooltipWrap label={item.name} description={item.description}>
      {item.comingSoon ? (
        <div className={className}>{inner}</div>
      ) : (
        <Link href={item.href} className={className}>
          {inner}
        </Link>
      )}
    </TooltipWrap>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isEmpty, toggle } = useDemoMode();
  const user = useCurrentUser();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white border-r border-border flex flex-col items-center py-2.5 z-50">
      {/* Workspace mark — click to switch */}
      <NarrowWorkspaceTrigger />

      <Divider />

      {/* Ask Spot — the hero entry */}
      <TooltipWrap label="Ask Spot · ⌘J" description="Your Head of Growth">
        <Link
          href="/spot"
          className={`relative flex items-center justify-center w-10 h-10 rounded-[8px] transition-colors duration-150 ${
            pathname === "/spot" ? "bg-black text-[#FAFAF8]" : "bg-[#111] text-[#FAFAF8] hover:bg-black"
          }`}
        >
          <SpotMark size={18} />
        </Link>
      </TooltipWrap>

      <Divider />

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto flex flex-col items-center gap-0.5 w-full px-2">
        {navGroups.map((group, gi) => (
          <div key={gi} className="flex flex-col items-center gap-0.5 w-full">
            {group.map((item) => (
              <RailItem key={item.href} item={item} active={isActive(item.href)} />
            ))}
            {gi < navGroups.length - 1 && <Divider />}
          </div>
        ))}
      </nav>

      {/* Demo state toggle */}
      <TooltipWrap
        label={isEmpty ? "Empty-state mode ON" : "Preview empty states"}
        description="Demo toggle"
      >
        <button
          onClick={toggle}
          className={`relative flex items-center justify-center w-10 h-10 rounded-[8px] transition-colors mb-1 ${
            isEmpty
              ? "bg-[#FEF3C7] text-[#92400E]"
              : "text-text-tertiary hover:bg-surface-secondary/60 hover:text-text-secondary"
          }`}
        >
          {isEmpty ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
        </button>
      </TooltipWrap>

      {/* User avatar */}
      <TooltipWrap label={user.name} description={user.email}>
        <button
          type="button"
          className="relative flex items-center justify-center w-10 h-10"
        >
          <div className="w-[28px] h-[28px] rounded-full bg-surface-secondary flex items-center justify-center">
            <span className="text-[10px] font-medium text-text-secondary">
              {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
          </div>
        </button>
      </TooltipWrap>
    </aside>
  );
}

function Divider() {
  return <div aria-hidden className="w-6 h-px bg-border-subtle my-1.5" />;
}

/**
 * Narrow workspace trigger. Same popover behaviour as the old
 * WorkspaceSwitcher, but the trigger is just the Revspot mark; the
 * popover opens to the right (since the rail is narrow).
 */
function NarrowWorkspaceTrigger() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useCurrentUser();
  const accessible = useAccessibleWorkspaces();
  const scope = useCurrentScope();
  const setScope = useWorkspaceStore((s) => s.setScope);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const switchTo = (newScope: string) => {
    setScope(newScope);
    setOpen(false);
    const next = redirectAfterScopeSwitch({ newScope, currentPath: pathname || "/" });
    if (next) router.push(next);
  };

  const isAll = scope.kind === "all";
  const currentWs = scope.kind === "workspace" ? getWorkspace(scope.id) : null;

  return (
    <div ref={wrapRef} className="relative">
      <TooltipWrap
        label={isAll ? "All workspaces" : currentWs?.name || "Workspace"}
        description={isAll ? `${accessible.length} workspaces` : currentWs?.region}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative flex items-center justify-center w-10 h-10 rounded-[8px] hover:bg-surface-secondary"
        >
          <RevspotLogo size={22} />
        </button>
      </TooltipWrap>

      {open && (
        <div
          className="fadeInScale"
          style={{
            position: "absolute",
            left: "calc(100% + 8px)",
            top: 0,
            width: 280,
            background: "#FFF",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            zIndex: 80,
            padding: 6,
          }}
        >
          {user.role === "admin" && (
            <>
              <button
                type="button"
                onClick={() => switchTo("all")}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[7px] hover:bg-surface-page text-left"
                style={{ background: isAll ? "var(--bg-page)" : "transparent" }}
              >
                <RevspotLogo size={20} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-semibold">All workspaces</span>
                    <span className="pill" style={{ fontSize: 9.5, padding: "0 5px" }}>
                      Admin
                    </span>
                  </div>
                  <div className="text-[10.5px] text-text-tertiary">Cross-workspace dashboard</div>
                </div>
                {isAll && <Check size={13} className="text-text-secondary" />}
              </button>
              <div className="my-1 h-px bg-border-subtle" />
            </>
          )}

          {accessible.map((w) => {
            const projects = projectsForWorkspace(w.id);
            const active = scope.kind === "workspace" && scope.id === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => switchTo(w.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[7px] hover:bg-surface-page text-left"
                style={{ background: active ? "var(--bg-page)" : "transparent" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate">{w.name}</div>
                  <div className="text-[10.5px] text-text-tertiary truncate">
                    {projects.length} project{projects.length === 1 ? "" : "s"} · {w.memberCount} members
                  </div>
                </div>
                {active && <Check size={13} className="text-text-secondary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
