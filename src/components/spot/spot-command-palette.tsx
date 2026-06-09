"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Folder, Monitor, LayoutGrid } from "lucide-react";
import { useSpotStore } from "@/lib/spot/store";
import { SpotMark } from "./spot-mark";
import { projectsList } from "@/lib/project-data";
import { useAccessibleWorkspaces, useCurrentUser, useWorkspaceStore } from "@/lib/workspace-store";
import { RevspotLogo } from "@/components/layout/revspot-logo";

type Item =
  | { id: string; kind: "ask"; text: string; scope?: string; custom?: boolean }
  | { id: string; kind: "nav"; text: string; target: string; icon: typeof Folder; scope?: string }
  | { id: string; kind: "workspace"; text: string; target: string; icon: typeof Folder; scope?: string };

type Section = { section: string; items: Item[] };

function buildNavSections(args: {
  isAdmin: boolean;
  workspaces: Array<{ id: string; name: string; region: string }>;
}): Section[] {
  const projItems: Item[] = projectsList.map((p) => ({
    id: `nav-proj-${p.id}`,
    kind: "nav" as const,
    text: p.name.split(" · ")[0],
    target: `/projects/${p.id}`,
    icon: Folder,
    scope: "Project",
  }));
  const wsItems: Item[] = args.workspaces.map((w) => ({
    id: `ws-${w.id}`,
    kind: "workspace" as const,
    text: w.name,
    target: w.id,
    icon: Folder,
    scope: w.region,
  }));
  const sections: Section[] = [
    {
      section: "Ask Spot",
      items: [
        { id: "ask-1", kind: "ask", text: "Why are we behind on the goal?", scope: "Project" },
        { id: "ask-2", kind: "ask", text: "Which campaigns should I pause?", scope: "Workspace" },
        { id: "ask-3", kind: "ask", text: "Compare CPVL across projects", scope: "Workspace" },
        { id: "ask-4", kind: "ask", text: "Audit personas — who's converting?", scope: "Project" },
      ],
    },
  ];
  if (args.workspaces.length > 1 || args.isAdmin) {
    sections.push({
      section: "Switch workspace",
      items: [
        ...(args.isAdmin
          ? [
              {
                id: "ws-all",
                kind: "workspace" as const,
                text: "All workspaces",
                target: "all",
                icon: Folder,
                scope: "Admin dashboard",
              },
            ]
          : []),
        ...wsItems,
      ],
    });
  }
  sections.push({
    section: "Go to",
    items: [
      { id: "nav-dash", kind: "nav", text: "Dashboard", target: "/dashboard", icon: LayoutGrid, scope: "Workspace" },
      { id: "nav-projects", kind: "nav", text: "Projects", target: "/projects", icon: Folder, scope: "Workspace" },
      { id: "nav-campaigns", kind: "nav", text: "Campaigns", target: "/campaigns", icon: Monitor, scope: "Workspace" },
      ...projItems,
    ],
  });
  return sections;
}

export function SpotCommandPalette() {
  const open = useSpotStore((s) => s.paletteOpen);
  const close = useSpotStore((s) => s.closePalette);
  const askSpot = useSpotStore((s) => s.askSpot);
  const router = useRouter();
  const user = useCurrentUser();
  const accessible = useAccessibleWorkspaces();
  const setScope = useWorkspaceStore((s) => s.setScope);

  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const sections = useMemo(() => {
    const base = buildNavSections({
      isAdmin: user.role === "admin",
      workspaces: accessible.map((w) => ({ id: w.id, name: w.name, region: w.region })),
    });
    const q = query.trim().toLowerCase();
    const askItem: Section = {
      section: "Ask Spot",
      items: [
        {
          id: "ask-custom",
          kind: "ask",
          text: query || "Ask Spot anything",
          scope: "Workspace",
          custom: true,
        },
      ],
    };
    if (!q) return [askItem, ...base];
    const filtered = base
      .map((s) => ({
        ...s,
        items: s.items.filter((it) => it.text.toLowerCase().includes(q)),
      }))
      .filter((s) => s.items.length > 0);
    return [askItem, ...filtered];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, user.role, accessible.length]);

  const flat: Item[] = sections.flatMap((s) => s.items);

  const handle = (it: Item) => {
    if (it.kind === "ask") {
      askSpot(it.custom ? query || "" : it.text);
    } else if (it.kind === "nav") {
      router.push(it.target);
    } else if (it.kind === "workspace") {
      setScope(it.target);
      if (it.target === "all") router.push("/admin");
      else router.push("/projects");
    }
    close();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const it = flat[sel];
        if (it) handle(it);
      } else if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sel, flat.length]);

  if (!open) return null;

  let cursor = 0;
  return (
    <>
      <div className="scrim" onClick={close} />
      <div
        className="fadeInScale"
        style={{
          position: "fixed",
          top: "16vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(640px, 92vw)",
          background: "#FFF",
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          zIndex: 100,
          overflow: "hidden",
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
          <SpotMark size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            placeholder="Ask Spot, or go to…"
            className="flex-1 outline-none border-0 bg-transparent text-[15px]"
          />
          <span
            className="mono pill"
            style={{ fontSize: 10, padding: "1px 6px", background: "var(--bg-secondary)" }}
          >
            esc
          </span>
        </div>

        {/* Sections */}
        <div className="py-2 max-h-[480px] overflow-y-auto scroll">
          {sections.map((s) => (
            <div key={s.section} className="mb-1">
              <div className="uplabel px-4 py-1.5" style={{ fontSize: 10 }}>
                {s.section}
              </div>
              {s.items.map((it) => {
                const idx = cursor++;
                const active = idx === sel;
                const Icon = it.kind === "nav" || it.kind === "workspace" ? it.icon : null;
                const isAllWorkspaces = it.kind === "workspace" && it.target === "all";
                return (
                  <button
                    key={it.id}
                    type="button"
                    onMouseEnter={() => setSel(idx)}
                    onClick={() => handle(it)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left"
                    style={{
                      background: active ? "var(--bg-page)" : "transparent",
                    }}
                  >
                    {it.kind === "ask" ? (
                      <SpotMark size={14} />
                    ) : isAllWorkspaces ? (
                      <RevspotLogo size={16} />
                    ) : Icon ? (
                      <Icon size={14} className="text-text-secondary" />
                    ) : (
                      <Search size={14} className="text-text-secondary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium truncate">
                        {it.kind === "ask" && it.custom ? (
                          <>
                            <span className="text-text-tertiary">Ask Spot: </span>
                            &quot;{query || "anything"}&quot;
                          </>
                        ) : (
                          it.text
                        )}
                      </div>
                      {it.scope && (
                        <div className="text-[10.5px] text-text-tertiary">
                          Scope: {it.scope}
                        </div>
                      )}
                    </div>
                    {active && (
                      <span
                        className="mono pill"
                        style={{ fontSize: 10, padding: "1px 5px" }}
                      >
                        ↵
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border-subtle flex items-center justify-between text-[10.5px] text-text-tertiary">
          <span>↑↓ navigate · ↵ select</span>
          <span>Spot · scoped to this page</span>
        </div>
      </div>
    </>
  );
}
