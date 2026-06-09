"use client";

import { AlertTriangle, Check, Info, ChevronRight, ArrowRight, Cog, Rocket, Download, BarChart3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { SpotMark } from "./spot-mark";
import { SpotLoader } from "./spot-loader";
import { RichText } from "./rich-text";
import type { SpotFinding, SpotKpi, SpotMessage, SpotPart, Verdict, GuidedKind, SpotChoiceOption, SpotChoiceIcon } from "@/lib/spot/types";
import { useSpotStore } from "@/lib/spot/store";
import type { LaunchWorkflow } from "@/lib/spot/workflow";
import {
  IMPORT_AD_ACCOUNTS,
  campaignsForAccount,
  importAccount,
  summariseImport,
  type ImportPlatform,
} from "@/lib/spot/import-campaigns-data";
import { clarifyQuestionsFor, analysisFor } from "@/lib/spot/extended-flows";

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string; Icon: typeof Check }> = {
    ok: { label: "On track", cls: "pill-ok", Icon: Check },
    warn: { label: "Intervene", cls: "pill-warn", Icon: AlertTriangle },
    err: { label: "Critical", cls: "pill-err", Icon: AlertTriangle },
    info: { label: "Note", cls: "pill-info", Icon: Info },
  };
  const { label, cls, Icon } = map[verdict];
  return (
    <span className={`pill ${cls} flex-shrink-0`} style={{ fontSize: 10.5 }}>
      <Icon size={11} /> {label}
    </span>
  );
}

function HeadlinePart({ text, verdict }: { text: string; verdict?: Verdict }) {
  return (
    <div
      className="flex items-start gap-2 mb-2"
      style={{
        padding: "7px 10px",
        background: "var(--spot-tint)",
        border: "1px solid var(--spot-stroke)",
        borderRadius: 8,
      }}
    >
      <div className="flex-1 text-[12.5px] leading-[1.5] text-text-primary">
        <RichText text={text} />
      </div>
      {verdict && <VerdictBadge verdict={verdict} />}
    </div>
  );
}

function FindingsPart({ items }: { items: SpotFinding[] }) {
  return (
    <div className="space-y-2 mb-2.5">
      {items.map((f, i) => {
        const accent =
          f.tone === "concern" ? "#F5A623" : f.tone === "positive" ? "#22C55E" : "#D4D4D4";
        return (
          <div
            key={i}
            className="card-base bg-white p-3"
            style={{ borderLeftWidth: 3, borderLeftColor: accent }}
          >
            <div className="text-[13px] font-semibold leading-tight mb-1">{f.title}</div>
            <div className="text-[12.5px] text-text-secondary leading-[1.45]">{f.body}</div>
            {f.evidence && f.evidence.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {f.evidence.map((e, j) => (
                  <span key={j} className="pill" style={{ fontSize: 10.5 }}>
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function KpisPart({ items }: { items: SpotKpi[] }) {
  return (
    <div
      className="card-base bg-white p-3 mb-2.5 grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 12 }}
    >
      {items.map((k, i) => {
        const color =
          k.good === true ? "var(--ok-fg)" : k.good === false ? "var(--err-fg)" : "var(--text-3)";
        return (
          <div key={i}>
            <div className="uplabel" style={{ fontSize: 10 }}>
              {k.label}
            </div>
            <div className="tabular-nums" style={{ fontSize: 16, fontWeight: 600 }}>
              {k.value}
            </div>
            {k.delta && (
              <div className="tabular-nums" style={{ fontSize: 10.5, color }}>
                {k.delta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Per-kind "next step" reply Spot appends inline when a handoff card
// is clicked. No modals: everything happens inside the chat thread, the
// platform pages continue their own work in the background.
const NEXT_STEP: Record<GuidedKind, SpotMessage> = {
  "new-persona": {
    role: "spot",
    parts: [
      { type: "headline", text: "Starting persona research.", verdict: "info" },
      {
        type: "findings",
        items: [
          { tone: "neutral", title: "Pulling existing personas linked to this project", body: "I'll look at every persona already approved against this project's memory and surface the ones that historically work." },
          { tone: "neutral", title: "Sweeping comparable projects", body: "Cross-checking Banerghatta + Yelahanka audience overlap to recommend net-new personas worth testing." },
          { tone: "neutral", title: "Drafting persona briefs", body: "For each candidate I'll write identity, pain, desire, and the channels where they perform — you approve or refine." },
        ],
      },
      { type: "text", text: "Reply with **approve** to lock the existing personas, or ask me to research a specific cohort first." },
    ],
  },
  "new-angle": {
    role: "spot",
    parts: [
      { type: "headline", text: "Drafting angles.", verdict: "info" },
      { type: "text", text: "I'll write 2–3 angle drafts (hook + CTA) per approved persona. Each shows up as a card on the persona's page — accept inline, no modal." },
    ],
  },
  "launch-creative": {
    role: "spot",
    parts: [
      { type: "headline", text: "Briefing the Creative Agent.", verdict: "info" },
      { type: "text", text: "The Creative Agent is generating statics + video shells against the approved angles. You'll see them appear on **Creatives** as they're ready — keep working here while I run." },
    ],
  },
  "new-campaign": {
    role: "spot",
    parts: [
      { type: "headline", text: "Structuring the campaign.", verdict: "info" },
      { type: "text", text: "I'm assembling campaign → ad sets → ads on Meta and Google. Revspot stays read-only on those entities; you'll get a link out when it's time to launch." },
    ],
  },
  "new-adset": {
    role: "spot",
    parts: [
      { type: "headline", text: "Building the ad set.", verdict: "info" },
      { type: "text", text: "Picking audiences from the linked personas and pacing budget across them." },
    ],
  },
};

function HandoffPart({ kind, label, reason }: { kind: GuidedKind; label: string; reason: string }) {
  const setThread = useSpotStore((s) => s.setThread);
  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT_STEP[kind];
        if (next) setThread((prev) => [...prev, next]);
      }}
      className="card-base hover-row text-left w-full p-3 flex items-center gap-3 mb-2.5"
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-[7px] flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #FAF8F2 0%, #FFF 100%)", border: "1px solid #E8C97A" }}
      >
        <SpotMark size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] uppercase tracking-wider text-text-tertiary font-semibold mb-0.5">
          Next step
        </div>
        <div className="text-[13.5px] font-semibold">{label}</div>
        <div className="text-[11.5px] text-text-secondary mt-0.5">{reason}</div>
      </div>
      <ChevronRight size={14} className="text-text-tertiary flex-shrink-0" />
    </button>
  );
}

function StepCtaPart({ label, helper, refineHint }: { label: string; helper?: string; refineHint?: string }) {
  const advanceWorkflow = useSpotStore((s) => s.advanceWorkflow);
  const appendMessage = useSpotStore((s) => s.appendMessage);
  const clicked = useSpotStore((s) => s.clickedCtas.has(label));
  const markClicked = useSpotStore((s) => s.markCtaClicked);

  // After the user clicks a CTA, hide the button entirely · their echo
  // message + the next Spot reply already captured the decision, so
  // showing the same dark button alongside their own dark bubble reads
  // redundant.
  if (clicked) return null;

  const handleClick = () => {
    appendMessage({ role: "user", text: label });
    markClicked(label);
    advanceWorkflow();
  };

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-semibold transition-colors"
        style={{
          background:
            "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
          color: "#0A0A09",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.15) inset, 0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        {label}
        <ArrowRight size={10} strokeWidth={2.4} />
      </button>
      {(helper || refineHint) && (
        <div className="text-[10.5px] text-text-tertiary mt-1 leading-snug">
          {helper}
          {helper && refineHint && <span> · </span>}
          {refineHint}
        </div>
      )}
    </div>
  );
}

const CHOICE_ICON: Record<SpotChoiceIcon, typeof Rocket> = {
  rocket: Rocket,
  download: Download,
  chart: BarChart3,
  sparkles: Sparkles,
};

/**
 * ChoicePart · two (or three) mutually-exclusive branch options in one
 * Spot message. Rendered as a small stack of clickable rows — primary
 * gets the gold accent, secondary stays neutral. Picking one echoes the
 * label as a user message, hides the whole choice, and dispatches the
 * option's `action` to the right store call (or navigation).
 */
function ChoicePart({ prompt, options }: { prompt?: string; options: SpotChoiceOption[] }) {
  const router = useRouter();
  const advanceWorkflow = useSpotStore((s) => s.advanceWorkflow);
  const startImportCampaigns = useSpotStore((s) => s.startImportCampaigns);
  const exitWorkflow = useSpotStore((s) => s.exitWorkflow);
  const appendMessage = useSpotStore((s) => s.appendMessage);
  const markClicked = useSpotStore((s) => s.markCtaClicked);
  // Hide the whole choice once any option has been chosen.
  const answered = useSpotStore((s) => options.some((o) => s.clickedCtas.has(o.label)));

  if (answered) return null;

  const choose = (o: SpotChoiceOption) => {
    appendMessage({ role: "user", text: o.label });
    markClicked(o.label);
    switch (o.action) {
      case "launch-new":
        advanceWorkflow(); // kickoff → launch-plan
        break;
      case "import-campaigns":
        startImportCampaigns();
        break;
      case "launch-after-import":
        advanceWorkflow(undefined, "launch-strategy");
        break;
      case "analyse-performance":
        exitWorkflow();
        router.push("/campaigns");
        break;
    }
  };

  return (
    <div className="mb-2.5">
      {prompt && (
        <div className="text-[12px] font-medium text-text-secondary mb-1.5">{prompt}</div>
      )}
      <div className="space-y-1.5">
        {options.map((o) => {
          const Icon = o.icon ? CHOICE_ICON[o.icon] : ArrowRight;
          const primary = o.variant === "primary";
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => choose(o)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] border text-left transition-colors group"
              style={{
                background: primary
                  ? "linear-gradient(135deg, rgba(201,168,106,0.16) 0%, rgba(224,192,131,0.10) 100%)"
                  : "#FFFFFF",
                borderColor: primary ? "#E0C083" : "var(--border)",
              }}
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] flex-shrink-0"
                style={{
                  background: primary ? "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)" : "var(--surface-secondary)",
                  color: primary ? "#0A0A09" : "var(--text-secondary)",
                }}
              >
                <Icon size={14} strokeWidth={2} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-semibold text-text-primary leading-tight">
                  {o.label}
                </span>
                {o.helper && (
                  <span className="block text-[10.5px] text-text-tertiary leading-snug mt-0.5">
                    {o.helper}
                  </span>
                )}
              </span>
              <ArrowRight
                size={13}
                strokeWidth={2}
                className="text-text-tertiary group-hover:text-text-primary flex-shrink-0 transition-colors"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Inline import-campaigns picker (left panel) ─────────────────── */

function importInr(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

const IMPORT_PLATFORM_COLOR: Record<ImportPlatform, string> = {
  Meta: "#4C6FFF",
  Google: "#34A853",
};

function ImportPlatformDot({ platform }: { platform: ImportPlatform }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full text-[9.5px] font-semibold flex-shrink-0"
      style={{ background: `${IMPORT_PLATFORM_COLOR[platform]}1A`, color: IMPORT_PLATFORM_COLOR[platform] }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: IMPORT_PLATFORM_COLOR[platform] }} />
      {platform}
    </span>
  );
}

function ImportCheckBox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  const on = checked || indeterminate;
  return (
    <span
      className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-[5px] flex-shrink-0 transition-colors"
      style={{
        background: on ? "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)" : "#FFFFFF",
        border: on ? "none" : "1.5px solid var(--border)",
      }}
    >
      {checked && <Check size={11} strokeWidth={3} style={{ color: "#0A0A09" }} />}
      {indeterminate && !checked && (
        <span className="w-[7px] h-[2px] rounded-full" style={{ background: "#0A0A09" }} />
      )}
    </span>
  );
}

function ImportStatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white px-2 py-2 text-center">
      <div className="text-[13.5px] font-semibold tabular text-text-primary leading-none">{value}</div>
      <div className="text-[8.5px] uppercase tracking-wider font-semibold text-text-tertiary mt-1">{label}</div>
      {sub && <div className="text-[8.5px] text-[#15803D] mt-0.5">{sub}</div>}
    </div>
  );
}

/**
 * ImportPickerPart · the whole import-campaigns selection, rendered inline
 * in the chat (left panel). Walks the workflow's importStage:
 *   select-account  → list of ad accounts to pick
 *   select-campaigns → tickable campaign list + Import button
 *   imported         → compact read-only confirmation
 * All state lives in the store; the right canvas stays on memory.md.
 */
function ImportPickerPart() {
  const workflow = useSpotStore((s) => s.workflow);
  const selectImportAdAccount = useSpotStore((s) => s.selectImportAdAccount);
  const backToImportAccounts = useSpotStore((s) => s.backToImportAccounts);
  const toggleImportCampaign = useSpotStore((s) => s.toggleImportCampaign);
  const setImportSelection = useSpotStore((s) => s.setImportSelection);
  const confirmImportCampaigns = useSpotStore((s) => s.confirmImportCampaigns);

  if (!workflow || workflow.kind !== "launch-campaign") return null;
  const w = workflow as LaunchWorkflow;
  const stage = w.importStage ?? "select-account";
  const accountId = w.importAdAccountId ?? null;

  // ── Phase 1 · choose an ad account ──
  if (stage === "select-account" || !accountId) {
    return (
      <div className="mb-2.5">
        <div className="text-[11px] text-text-tertiary mb-1.5">
          Choose an account — I&apos;ll pull every campaign in it.
        </div>
        <div className="space-y-1.5">
          {IMPORT_AD_ACCOUNTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => selectImportAdAccount(a.id)}
              className="group w-full text-left rounded-[10px] border border-border bg-white hover:border-border-hover hover:bg-surface-page px-3 py-2.5 flex items-center gap-2.5 transition-colors"
            >
              <ImportPlatformDot platform={a.platform} />
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-semibold text-text-primary truncate">{a.name}</span>
                <span className="block text-[10.5px] text-text-tertiary truncate">
                  {a.campaignCount} campaigns · {importInr(a.spend30d)}/30d
                </span>
              </span>
              <ArrowRight size={13} strokeWidth={2} className="text-text-tertiary group-hover:text-text-primary flex-shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const campaigns = campaignsForAccount(accountId);
  const account = importAccount(accountId);

  // ── Phase 3 · imported · success summary ──
  if (stage === "imported") {
    const ids = w.importedCampaignIds ?? [];
    const sum = summariseImport(ids);
    const importedRows = campaigns.filter((c) => ids.includes(c.id));
    return (
      <div className="mb-2.5 rounded-[12px] border overflow-hidden" style={{ borderColor: "#A7F3D0" }}>
        {/* Success header */}
        <div
          className="px-3.5 py-3 flex items-center gap-2.5"
          style={{ background: "linear-gradient(180deg, #ECFDF5 0%, #FFFFFF 100%)", borderBottom: "1px solid var(--border-subtle)" }}
        >
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.4)" }}
          >
            <Check size={16} strokeWidth={2.6} className="text-[#15803D]" />
          </span>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-text-primary leading-tight">
              {sum.count} campaign{sum.count === 1 ? "" : "s"} imported
            </div>
            <div className="text-[11px] text-text-tertiary truncate">
              Pulled into {w.productName}&apos;s memory{account ? ` · ${account.name}` : ""}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-4" style={{ gap: 1, background: "var(--border-subtle)" }}>
          <ImportStatTile label="Campaigns" value={`${sum.count}`} sub={`${sum.active} active`} />
          <ImportStatTile label="Spend · 30d" value={importInr(sum.spend)} />
          <ImportStatTile label="Leads · 30d" value={sum.leads.toLocaleString("en-IN")} />
          <ImportStatTile label="Blended CPL" value={importInr(sum.blendedCpl)} />
        </div>

        {/* Imported list */}
        <div className="px-3.5 py-2.5 bg-white border-t border-border-subtle">
          <div className="text-[9.5px] uppercase tracking-wider font-semibold text-text-tertiary mb-1.5">
            Imported into memory
          </div>
          <ul className="space-y-1">
            {importedRows.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[11.5px]">
                <Check size={11} strokeWidth={2.6} className="text-[#15803D] flex-shrink-0" />
                <span className="flex-1 truncate text-text-secondary">{c.name}</span>
                <span className="text-text-tertiary tabular flex-shrink-0">{importInr(c.spend)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── Phase 2 · choose campaigns ──
  const selected = w.selectedImportCampaignIds ?? [];
  const selectedSet = new Set(selected);
  const allIds = campaigns.map((c) => c.id);
  const allSelected = selected.length === campaigns.length && campaigns.length > 0;
  const sum = summariseImport(selected);

  return (
    <div className="mb-2.5">
      {/* Account header */}
      <div className="flex items-center gap-2 mb-1.5">
        {account && <ImportPlatformDot platform={account.platform} />}
        <span className="text-[12px] font-medium text-text-primary truncate flex-1">{account?.name}</span>
        <button type="button" onClick={backToImportAccounts} className="text-[11px] text-text-tertiary hover:text-text-primary">
          Change
        </button>
      </div>

      {/* Select-all bar */}
      <button
        type="button"
        onClick={() => setImportSelection(allSelected ? [] : allIds)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] border border-border bg-surface-page mb-1 text-[11.5px]"
      >
        <span className="inline-flex items-center gap-2 font-medium text-text-secondary">
          <ImportCheckBox checked={allSelected} indeterminate={!allSelected && selected.length > 0} />
          {allSelected ? "Deselect all" : "Select all"}
        </span>
        <span className="text-text-tertiary tabular">{selected.length} of {campaigns.length}</span>
      </button>

      {/* List */}
      <div className="rounded-[10px] border border-border overflow-hidden bg-white">
        {campaigns.map((c, i) => {
          const checked = selectedSet.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleImportCampaign(c.id)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-surface-page"
              style={{
                borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                background: checked ? "rgba(201,168,106,0.07)" : undefined,
              }}
            >
              <ImportCheckBox checked={checked} />
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: c.status === "active" ? "#22C55E" : "#C4C4BD" }}
                title={c.status === "active" ? "Active" : "Paused"}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[12px] font-medium text-text-primary truncate">{c.name}</span>
                <span className="block text-[10px] text-text-tertiary truncate">
                  {c.objective} · {importInr(c.spend)} · {c.leads.toLocaleString("en-IN")} leads · {importInr(c.cpl)} CPL
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-[10.5px] text-text-tertiary">
          {selected.length > 0 ? (
            <>
              Importing <span className="font-semibold text-text-secondary">{selected.length}</span> · {importInr(sum.spend)} · {sum.leads.toLocaleString("en-IN")} leads
            </>
          ) : (
            "Select at least one campaign"
          )}
        </span>
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={confirmImportCampaigns}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11.5px] font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)", color: "#0A0A09" }}
        >
          Import {selected.length > 0 ? selected.length : ""} campaign{selected.length === 1 ? "" : "s"}
          <ArrowRight size={10} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

function ToolCallPart({ agent, detail, status }: { agent: string; detail?: string; status: "running" | "done" }) {
  const running = status === "running";
  // Inline thinking line — no card, no border. Single row that reads
  // like a Claude "tool call" trace. While running, the agent name is
  // shown alone; once done it greys out so the page doesn't shout.
  return (
    <div className="mb-1.5 flex items-baseline gap-1.5 text-[11.5px] leading-[1.5]">
      {running ? (
        <Cog
          size={10}
          strokeWidth={1.8}
          className="text-text-secondary relative top-[1.5px] animate-spin"
          style={{ animationDuration: "2s" }}
        />
      ) : (
        <Check size={10} strokeWidth={2.2} className="text-[#15803D] relative top-[1.5px]" />
      )}
      <span className={running ? "text-text-secondary" : "text-text-tertiary"}>
        <span className="font-medium">{agent}</span>
        {detail && (
          <>
            <span className="text-text-tertiary"> · </span>
            <span>{detail}</span>
          </>
        )}
      </span>
    </div>
  );
}

/**
 * ClarifyQuestionsPart · the diagnostic clarify questions, rendered
 * inline in the chat (left panel) so the user answers right where Spot
 * is asking. Reads/writes the workflow's `clarifyAnswers` in the store;
 * the right canvas mirrors the captured brief. Confirmation lives in
 * the step-cta below this part.
 */
function ClarifyQuestionsPart({ kind }: { kind: "scale" | "optimize" | "test-angles" }) {
  const workflow = useSpotStore((s) => s.workflow);
  const setClarifyAnswer = useSpotStore((s) => s.setClarifyAnswer);
  const answers =
    workflow &&
    (workflow.kind === "scale" ||
      workflow.kind === "optimize" ||
      workflow.kind === "test-angles")
      ? workflow.clarifyAnswers
      : {};
  const questions = clarifyQuestionsFor(kind, analysisFor(kind));

  return (
    <div className="mb-2 space-y-2">
      {questions.map((q) => {
        const selected = answers[q.id] ?? q.defaultValue;
        return (
          <div key={q.id} className="rounded-card border border-border bg-white p-3">
            <div className="text-[12.5px] font-semibold text-text-primary mb-0.5">
              {q.question}
            </div>
            {q.why && (
              <div className="text-[11px] text-text-tertiary mb-2 leading-snug">{q.why}</div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((o) => {
                const active = selected === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setClarifyAnswer(q.id, o.value)}
                    title={o.hint}
                    className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-button text-[11.5px] font-medium transition-colors ${
                      active
                        ? "bg-[#111] text-[#FAFAF8] border border-[#111]"
                        : "bg-white border border-border text-text-secondary hover:border-border-hover hover:text-text-primary"
                    }`}
                  >
                    {active && <Check size={11} strokeWidth={2.4} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartRenderer({ part }: { part: SpotPart }) {
  switch (part.type) {
    case "headline":
      return <HeadlinePart text={part.text} verdict={part.verdict} />;
    case "findings":
      return <FindingsPart items={part.items} />;
    case "kpis":
      return <KpisPart items={part.items} />;
    case "handoff":
      return <HandoffPart kind={part.kind} label={part.label} reason={part.reason} />;
    case "step-cta":
      return <StepCtaPart label={part.label} helper={part.helper} refineHint={part.refineHint} />;
    case "choice":
      return <ChoicePart prompt={part.prompt} options={part.options} />;
    case "import-picker":
      return <ImportPickerPart />;
    case "clarify-questions":
      return <ClarifyQuestionsPart kind={part.kind} />;
    case "tool-call":
      return <ToolCallPart agent={part.agent} detail={part.detail} status={part.status} />;
    case "text":
      return (
        <div className="text-[12.5px] leading-[1.55] mb-1.5">
          <RichText text={part.text} />
        </div>
      );
  }
}

export function MessageBubble({
  message,
  animate,
}: {
  message: SpotMessage;
  animate?: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-2.5">
        <div
          style={{
            background: "var(--chat-user-bg)",
            color: "var(--chat-user-fg)",
            padding: "7px 11px",
            borderRadius: 10,
            borderBottomRightRadius: 4,
            fontSize: 12.5,
            maxWidth: "85%",
            lineHeight: 1.5,
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }
  // Spot messages render avatar-less, Claude-style. The Spot mark
  // lives in the chat header (with a live indicator when an agent is
  // actually working) so the chat thread isn't a column of repeated icons.
  return (
    <div className={`${animate ? "fadeUp" : ""} mb-2.5`}>
      {message.parts.map((p, i) => (
        <PartRenderer key={i} part={p} />
      ))}
    </div>
  );
}

export function TypingDots() {
  // Use the brand "Spot is typing" dots — three rounded-square pearls
  // in a chat bubble. Stop rendering as soon as Spot's first character
  // streams in (handled by the caller).
  return (
    <div className="mb-2.5">
      <SpotLoader mode="dots" />
    </div>
  );
}
