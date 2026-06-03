"use client";

import { useRef, useState } from "react";
import {
  Radio,
  Sparkles,
  Plus,
  LayoutPanelLeft,
  PanelRight,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  AlertTriangle,
  Clock,
  X,
} from "lucide-react";
import { useSpotStore } from "@/lib/spot/store";
import {
  deployStagedChanges,
  discardAllStagedChanges,
  discardStagedChange,
} from "./campaign-staging";
import type { ProjectDetail, MediaRow } from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { MediaPlanSection } from "./media-plan-section";
import { InlineSpotComposer, type StreamItem } from "./inline-spot-composer";
import { CampaignEditor } from "./campaign-editor";

/**
 * Campaigns tab — the project's campaign workspace.
 *
 * States, in order:
 *   1. Empty → Spot strategy generator (inline composer + "Just do it").
 *   2. Populated → Refine bar pinned at top + campaign list.
 *   3. Selected → Inline campaign editor in one of two layout variants:
 *        a. "full"  — list-takes-over editor with a back button.
 *        b. "split" — left list + right editor, no back nav.
 *
 * The legacy CampaignCreationFlow modal trigger is gone — Spot drafts the
 * canonical four campaigns inline; refinements happen via the Refine bar.
 */

const CANONICAL_CAMPAIGNS = [
  { name: "Experiment", note: "Lowest cost · broad exploration" },
  { name: "Scaling", note: "Double down on what works" },
  { name: "Cost / Bid Cap", note: "CPL discipline" },
  { name: "Advantage+", note: "Meta's AI campaign" },
];

export function CampaignsTab({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const rows = project.mediaPlan.rows;
  const [variant, setVariant] = useState<"full" | "split">("full");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Spot strategy generator state
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [strategyStream, setStrategyStream] = useState<StreamItem[] | null>(null);
  const strategyPersist = useRef<((i: number) => void) | null>(null);

  // Refine bar state (lighter — just a single textarea)
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineStream, setRefineStream] = useState<StreamItem[] | null>(null);

  const startStrategy = (userPrompt: string) => {
    const items: StreamItem[] = [
      { id: "p", label: "Reading personas, brief, and goal", indent: 0 },
      { id: "s", label: "Planning canonical campaign structure", indent: 0 },
      ...CANONICAL_CAMPAIGNS.map((c) => ({
        id: `c-${c.name}`,
        label: c.name,
        sub: c.note,
        indent: 1,
      })),
      { id: "b", label: "Allocating budget across personas", indent: 0 },
    ];
    if (userPrompt) {
      items.unshift({
        id: "prompt",
        label: "Reading your prompt",
        sub: userPrompt.slice(0, 60) + (userPrompt.length > 60 ? "…" : ""),
        indent: 0,
      });
    }
    setStrategyStream(items);

    strategyPersist.current = (i) => {
      const item = items[i];
      if (!item?.id.startsWith("c-")) return;
      const tpl = CANONICAL_CAMPAIGNS.find((c) => `c-${c.name}` === item.id);
      if (!tpl) return;
      mutateRuntimeProject(project.id, (p) => {
        const id = `mr-spot-${Date.now().toString(36)}-${tpl.name.replace(/\W/g, "")}`;
        const firstPersona = p.personas[0];
        const dailyBudget = Math.round(
          (p.goal?.target ? 5000 : 3000) /
            Math.max(1, p.personas.length || 1),
        );
        p.mediaPlan.rows.push({
          id,
          channel: "Meta",
          campaign: `${p.name.split(" · ")[0]} · ${tpl.name}`,
          personaId: firstPersona?.id || "",
          budgetDaily: dailyBudget,
          expLeads: Math.round(dailyBudget / 800),
          expVerified: Math.round((dailyBudget / 800) * 0.5),
          cpvl: null,
          status: "draft",
          spotChange: tpl.note,
          adSets: p.personas.slice(0, 2).map((persona, idx) => ({
            id: `${id}-as-${idx}`,
            name: `${persona.name} · ${tpl.name === "Experiment" ? "Lookalike 1%" : "Interest stack"}`,
            audience: persona.demographics[0] || "Custom audience",
            optimization: "Leads",
            budgetDaily: Math.round(dailyBudget / Math.max(1, p.personas.length)),
            expLeads: 0,
            expVerified: 0,
            cpvl: null,
            status: "draft",
            spotChange: null,
            ads: [],
          })),
        });
      });
    };
  };

  const closeStrategy = () => {
    setStrategyOpen(false);
    setStrategyStream(null);
    strategyPersist.current = null;
  };

  const startRefine = (userPrompt: string) => {
    if (!userPrompt.trim()) {
      setRefineOpen(false);
      return;
    }
    setRefineStream([
      { id: "r1", label: "Reading your refinement", sub: userPrompt.slice(0, 60), indent: 0 },
      { id: "r2", label: "Cross-checking against live data", indent: 0 },
      { id: "r3", label: "Staging recommended changes", indent: 0 },
    ]);
  };

  const closeRefine = () => {
    setRefineOpen(false);
    setRefineStream(null);
  };

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div>
      <SectionHeader
        icon={Radio}
        title="Campaigns"
        subtitle={
          rows.length === 0
            ? "No campaigns yet — let Spot draft a strategy"
            : `${rows.length} campaign${rows.length === 1 ? "" : "s"} · click a row to edit`
        }
        actions={
          rows.length > 0 ? (
            <div className="flex items-center gap-2">
              <LayoutSwitcher value={variant} onChange={setVariant} />
              <a
                href={`/projects/${project.id}/deep/campaigns`}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
              >
                <ArrowUpRight size={11} /> Deep dive
              </a>
            </div>
          ) : null
        }
      />

      <FormsRequiredBanner project={project} />
      <StagedChangesBar project={project} />

      {/* Empty state — Spot strategy generator */}
      {rows.length === 0 && (
        <div className="space-y-3">
          {!strategyOpen ? (
            <div
              className="rounded-[14px] p-6 fadeUp"
              style={{
                background:
                  "linear-gradient(135deg, #FBF7FF 0%, #FFFDF6 60%, #FFFFFF 100%)",
                border: "1px dashed #C8A8FF",
              }}
            >
              <div className="flex items-start gap-3 mb-4">
                <span
                  className="inline-flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                    color: "#FFF",
                    boxShadow: "0 6px 16px rgba(124,58,237,0.22)",
                  }}
                >
                  <Sparkles size={17} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-semibold mb-0.5">
                    Let Spot draft your campaign strategy
                  </div>
                  <div className="text-[12px] text-text-secondary leading-[1.55]">
                    Tell Spot a constraint or a goal, or just say &quot;do it&quot; and
                    Spot drafts the four canonical campaigns (Experiment ·
                    Scaling · Cost-Cap · Advantage+) with ad sets per persona.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStrategyOpen(true)}
                  className="apply-btn"
                  style={{
                    background:
                      "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                    height: 36,
                    fontSize: 12.5,
                    padding: "0 16px",
                  }}
                >
                  <Sparkles size={12} /> Draft my strategy
                </button>
                <span className="text-[11px] text-text-tertiary">
                  Or build manually with{" "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    mutateRuntimeProject(project.id, (p) => {
                      const id = `mr-manual-${Date.now().toString(36)}`;
                      p.mediaPlan.rows.push({
                        id,
                        channel: "Meta",
                        campaign: "New campaign",
                        personaId: p.personas[0]?.id || "",
                        budgetDaily: 2000,
                        expLeads: 0,
                        expVerified: 0,
                        cpvl: null,
                        status: "draft",
                        spotChange: null,
                        adSets: [],
                      });
                      setTimeout(() => setSelectedId(id), 0);
                    });
                  }}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
                >
                  <Plus size={11} /> Add empty campaign
                </button>
              </div>
            </div>
          ) : (
            <InlineSpotComposer
              prompt="Spot's drafting your campaign strategy"
              placeholder="Optional — give Spot a constraint (e.g. 'budget ₹3L/wk · scale Lookalike 1% first')…"
              primaryLabel="Draft from prompt"
              secondaryLabel="Just do it"
              onStart={startStrategy}
              onCancel={closeStrategy}
              streamItems={strategyStream ?? undefined}
              streamHeader="Spot is drafting"
              onItemComplete={(i) => strategyPersist.current?.(i)}
              onDone={closeStrategy}
            />
          )}
        </div>
      )}

      {/* Refine bar (populated state, when no campaign selected or in split mode) */}
      {rows.length > 0 && !selectedId && (
        <RefineBar
          open={refineOpen}
          onOpen={() => setRefineOpen(true)}
          onClose={closeRefine}
          onStart={startRefine}
          stream={refineStream ?? undefined}
        />
      )}

      {/* List + editor body */}
      {rows.length > 0 && (
        <CampaignsBody
          project={project}
          onAsk={onAsk}
          variant={variant}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onClearSelection={() => setSelectedId(null)}
          selected={selected ?? null}
        />
      )}
    </div>
  );
}

// ─── Staged-changes banner ─────────────────────────────────────────────

function StagedChangesBar({ project }: { project: ProjectDetail }) {
  const showToast = useSpotStore((s) => s.showToast);
  const [expanded, setExpanded] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const staged = project.mediaPlan.stagedChanges ?? [];
  if (staged.length === 0) return null;

  const deploy = () => {
    setDeploying(true);
    // Brief delay so the Deploy button reads as "actually doing something"
    // rather than instant — this matches what real Meta deploys feel like.
    setTimeout(() => {
      const count = deployStagedChanges(project.id);
      setDeploying(false);
      setExpanded(false);
      showToast(
        count === 1
          ? "1 change deployed"
          : `${count} changes deployed`,
      );
    }, 600);
  };

  const discardAll = () => {
    if (
      !window.confirm(
        `Discard all ${staged.length} staged change${staged.length === 1 ? "" : "s"}? This can't be undone.`,
      )
    ) {
      return;
    }
    discardAllStagedChanges(project.id);
    setExpanded(false);
  };

  return (
    <div
      className="rounded-[10px] mb-3"
      style={{
        background: "#FFFCEB",
        border: "1px solid #E0CC95",
      }}
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: "linear-gradient(135deg, #C9A86A 0%, #8A6300 100%)",
            color: "#FFF",
          }}
        >
          <Clock size={12} />
        </span>
        <div className="flex-1 text-[11.5px] leading-[1.4]">
          <strong>
            {staged.length} change{staged.length === 1 ? "" : "s"} pending
          </strong>{" "}
          — saved but not yet deployed to Meta.
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary"
        >
          {expanded ? "Hide" : "Review"}
          <ChevronRight
            size={11}
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0)",
              transition: "transform 160ms",
            }}
          />
        </button>
        <button
          type="button"
          onClick={discardAll}
          disabled={deploying}
          className="inline-flex items-center h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] text-text-secondary hover:text-text-primary"
        >
          Discard all
        </button>
        <button
          type="button"
          onClick={deploy}
          disabled={deploying}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-button text-[11.5px] font-semibold"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
            color: "#FFF",
            border: "1px solid transparent",
            opacity: deploying ? 0.6 : 1,
            cursor: deploying ? "not-allowed" : "pointer",
          }}
        >
          {deploying ? "Deploying…" : "Deploy"}
          {!deploying && <ArrowRight size={11} />}
        </button>
      </div>

      {expanded && (
        <div
          className="px-3.5 pb-3 space-y-1.5 fadeUp"
          style={{ borderTop: "1px solid #E0CC95" }}
        >
          <div
            className="uplabel pt-2.5"
            style={{ fontSize: 9.5, color: "#9C6D00" }}
          >
            Saved changes
          </div>
          {staged.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[11.5px]"
              style={{
                background: "#FFF",
                border: "1px solid #EFE3C2",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#F59E0B",
                  flexShrink: 0,
                }}
              />
              <span className="flex-1 truncate">{c.label}</span>
              <button
                type="button"
                onClick={() => discardStagedChange(project.id, c.id)}
                title="Discard this change"
                className="text-text-tertiary hover:text-text-secondary"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Forms-required banner ─────────────────────────────────────────────

function FormsRequiredBanner({ project }: { project: ProjectDetail }) {
  const forms = project.forms ?? [];
  const publishedCount = forms.filter((f) => f.status === "published").length;
  if (publishedCount > 0) return null;

  return (
    <div
      className="rounded-[10px] p-3 mb-3 flex items-center gap-2.5"
      style={{
        background: "#FFFCEB",
        border: "1px solid #E0CC95",
      }}
    >
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "#E0CC95",
          color: "#FFF",
        }}
      >
        <AlertTriangle size={13} />
      </span>
      <div className="flex-1 text-[11.5px] leading-[1.5]">
        <strong>No published forms yet.</strong> Meta won&apos;t let any
        campaign go live without a lead form attached.{" "}
        {forms.length > 0 && (
          <>
            You have {forms.length} draft form
            {forms.length === 1 ? "" : "s"} — publish at least one to unblock.
          </>
        )}
      </div>
      <a
        href={`/projects/${project.id}?tab=library&sub=forms`}
        onClick={(e) => {
          // Soft client-side: dispatch the project page's tab-switch
          // event with the library/forms target so the parent doesn't
          // need a full reload.
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent("revspot:tab-switch", {
              detail: { tab: "library", sub: "forms" },
            }),
          );
        }}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] font-medium flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
          color: "#FFF",
          border: "1px solid transparent",
        }}
      >
        Go to Forms →
      </a>
    </div>
  );
}

// ─── Layout switcher ────────────────────────────────────────────────────

function LayoutSwitcher({
  value,
  onChange,
}: {
  value: "full" | "split";
  onChange: (v: "full" | "split") => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-button overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "#FFF" }}
      title="Editor layout"
    >
      <button
        type="button"
        onClick={() => onChange("full")}
        className="h-7 px-2.5 text-[11px] inline-flex items-center gap-1 transition-colors"
        style={{
          background: value === "full" ? "#1A1A1A" : "transparent",
          color: value === "full" ? "#FFF" : "var(--text-2)",
        }}
      >
        <LayoutPanelLeft size={11} /> Full editor
      </button>
      <button
        type="button"
        onClick={() => onChange("split")}
        className="h-7 px-2.5 text-[11px] inline-flex items-center gap-1 transition-colors"
        style={{
          background: value === "split" ? "#1A1A1A" : "transparent",
          color: value === "split" ? "#FFF" : "var(--text-2)",
          borderLeft: "1px solid var(--border)",
        }}
      >
        <PanelRight size={11} /> Split view
      </button>
    </div>
  );
}

// ─── Refine bar ─────────────────────────────────────────────────────────

function RefineBar({
  open,
  onOpen,
  onClose,
  onStart,
  stream,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onStart: (prompt: string) => void;
  stream?: StreamItem[];
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] mb-3 transition-colors"
        style={{
          background: "var(--spot-tint)",
          border: "1px solid var(--spot-stroke)",
          textAlign: "left",
        }}
      >
        <Sparkles size={12} style={{ color: "#7C3AED" }} />
        <span className="text-[12px] font-medium">Refine with Spot</span>
        <span className="text-[11px] text-text-tertiary">
          e.g. &quot;pause Lookalike 2% on Experiment and reallocate to Scaling&quot;
        </span>
        <ChevronRight size={12} className="text-text-tertiary ml-auto" />
      </button>
    );
  }

  return (
    <div className="mb-3">
      <InlineSpotComposer
        prompt="Refine your campaign strategy"
        placeholder="e.g. 'pause Lookalike 2% on Experiment and reallocate budget to Scaling'"
        primaryLabel="Refine"
        onStart={onStart}
        onCancel={onClose}
        streamItems={stream}
        streamHeader="Spot is refining"
        onDone={onClose}
      />
    </div>
  );
}

// ─── Body: list ± editor in either layout variant ───────────────────────

function CampaignsBody({
  project,
  onAsk,
  variant,
  selectedId,
  onSelect,
  onClearSelection,
  selected,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  variant: "full" | "split";
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  selected: MediaRow | null;
}) {
  // Full-tab swap: when something is selected, show the editor full-width
  // with a back button; otherwise show the list (the MediaPlanSection
  // `campaigns` view).
  if (variant === "full") {
    if (selected) {
      return (
        <div className="mt-2">
          <CampaignEditor
            project={project}
            campaignId={selected.id}
            onBack={onClearSelection}
            variant="full"
          />
        </div>
      );
    }
    return (
      <ClickableMediaPlan
        project={project}
        onAsk={onAsk}
        onSelect={onSelect}
        selectedId={selectedId}
      />
    );
  }

  // Split view: list on left, editor on right.
  return (
    <div
      className="grid gap-3 mt-2"
      style={{ gridTemplateColumns: "320px 1fr", alignItems: "start" }}
    >
      <CampaignList
        project={project}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <div>
        {selected ? (
          <CampaignEditor
            project={project}
            campaignId={selected.id}
            variant="split"
          />
        ) : (
          <div
            className="card-base p-8 text-center text-[12px] text-text-tertiary"
            style={{ background: "var(--bg-page)" }}
          >
            Select a campaign on the left to edit.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Embedded list view: the existing MediaPlanSection table with rows
//     clickable so the user can pick a campaign to edit. ───────────────

function ClickableMediaPlan({
  project,
  onAsk,
  onSelect,
  selectedId,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  // Add a click handler overlay via a ref+capture so we don't have to
  // rewrite the entire 1600-line MediaPlanSection. We render it and
  // then capture clicks on rows that carry a data-campaign-id attribute.
  // For now, surface a slim row picker above the table so the click is
  // obvious; the existing table stays read-only inside the tab.
  return (
    <div>
      {/* Quick picker — explicit, no DOM hacks */}
      <div className="card-base p-2.5 mb-3 flex items-center gap-2 flex-wrap">
        <span className="uplabel" style={{ fontSize: 9.5 }}>
          Edit
        </span>
        {project.mediaPlan.rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button text-[11.5px] transition-colors"
            style={{
              background: selectedId === r.id ? "#1A1A1A" : "#FFF",
              color: selectedId === r.id ? "#FFF" : "var(--text-2)",
              border: `1px solid ${
                selectedId === r.id ? "#1A1A1A" : "var(--border)"
              }`,
            }}
          >
            {r.campaign}
            <ChevronRight size={11} />
          </button>
        ))}
      </div>
      <MediaPlanSection
        project={project}
        onAsk={onAsk}
        mode="campaigns"
        onNewCampaign={() => {
          // Inline-add an empty campaign and select it for editing.
          mutateRuntimeProject(project.id, (p) => {
            const id = `mr-manual-${Date.now().toString(36)}`;
            p.mediaPlan.rows.push({
              id,
              channel: "Meta",
              campaign: "New campaign",
              personaId: p.personas[0]?.id || "",
              budgetDaily: 2000,
              expLeads: 0,
              expVerified: 0,
              cpvl: null,
              status: "draft",
              spotChange: null,
              adSets: [],
            });
            setTimeout(() => onSelect(id), 0);
          });
        }}
      />
    </div>
  );
}

// ─── Split-view list ───────────────────────────────────────────────────

function CampaignList({
  project,
  selectedId,
  onSelect,
}: {
  project: ProjectDetail;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card-base p-2">
      <div className="space-y-1">
        {project.mediaPlan.rows.map((r) => {
          const active = selectedId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className="w-full text-left px-3 py-2.5 rounded-[8px] transition-colors"
              style={{
                background: active ? "var(--bg-page)" : "#FFF",
                border: `1px solid ${active ? "#1A1A1A" : "var(--border-subtle)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="text-[12.5px] font-semibold leading-tight truncate flex-1">
                  {r.campaign}
                </div>
                <span
                  className={`pill ${
                    r.status === "live"
                      ? "pill-ok"
                      : r.status === "paused"
                        ? "pill-warn"
                        : ""
                  }`}
                  style={{
                    fontSize: 9.5,
                    background:
                      r.status === "draft" ? "var(--bg-secondary)" : undefined,
                    color: r.status === "draft" ? "var(--text-2)" : undefined,
                  }}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-[10.5px] text-text-tertiary tabular-nums">
                {r.channel} · ₹{r.budgetDaily.toLocaleString()}/d · {r.adSets.length}{" "}
                ad set{r.adSets.length === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          mutateRuntimeProject(project.id, (p) => {
            const id = `mr-manual-${Date.now().toString(36)}`;
            p.mediaPlan.rows.push({
              id,
              channel: "Meta",
              campaign: "New campaign",
              personaId: p.personas[0]?.id || "",
              budgetDaily: 2000,
              expLeads: 0,
              expVerified: 0,
              cpvl: null,
              status: "draft",
              spotChange: null,
              adSets: [],
            });
            setTimeout(() => onSelect(id), 0);
          });
        }}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 h-8 rounded-[8px] text-[11.5px] text-text-secondary hover:text-text-primary"
        style={{
          border: "1px dashed var(--border)",
          background: "transparent",
        }}
      >
        <Plus size={11} /> New campaign
      </button>
    </div>
  );
}

