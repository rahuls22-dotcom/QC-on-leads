"use client";

// Import-campaigns canvas · the right pane when the launch workflow is at
// the "import-campaigns" step. Two phases:
//   1. select-account   — pick an ad account to pull campaigns from
//   2. select-campaigns — tick the campaigns to import, then confirm
//   3. imported         — success summary (the next-step choice lives in chat)
//
// Dark-mode to match the canvas (#161614). All actions live in the store.

import {
  ChevronLeft,
  Check,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useSpotStore } from "@/lib/spot/store";
import type { LaunchWorkflow } from "@/lib/spot/workflow";
import {
  IMPORT_AD_ACCOUNTS,
  campaignsForAccount,
  importAccount,
  summariseImport,
  type ImportAdAccount,
  type ImportableCampaign,
  type ImportPlatform,
} from "@/lib/spot/import-campaigns-data";

function inr(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
}

const PLATFORM_COLOR: Record<ImportPlatform, string> = {
  Meta: "#4C6FFF",
  Google: "#34A853",
};

function PlatformBadge({ platform }: { platform: ImportPlatform }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-[20px] rounded-full text-[10px] font-semibold"
      style={{
        background: `${PLATFORM_COLOR[platform]}1F`,
        color: PLATFORM_COLOR[platform],
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: PLATFORM_COLOR[platform] }}
      />
      {platform}
    </span>
  );
}

export function ImportCampaignsStep({ workflow }: { workflow: LaunchWorkflow }) {
  const stage = workflow.importStage ?? "select-account";

  if (stage === "imported") {
    return <ImportedSummary workflow={workflow} />;
  }
  if (stage === "select-campaigns" && workflow.importAdAccountId) {
    return <CampaignPicker accountId={workflow.importAdAccountId} workflow={workflow} />;
  }
  return <AccountPicker />;
}

/* ─── Phase 1 · choose an ad account ─────────────────────────────── */

function AccountPicker() {
  const selectImportAdAccount = useSpotStore((s) => s.selectImportAdAccount);
  return (
    <div className="px-6 py-6 max-w-[860px] mx-auto" style={{ color: "#F5F4EF" }}>
      <div className="text-[10.5px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: "#C9A86A" }}>
        Import campaigns
      </div>
      <h1 className="text-[21px] font-semibold tracking-tight leading-[1.15]">
        Choose an ad account
      </h1>
      <p className="text-[12.5px] mt-1.5 mb-5 leading-relaxed" style={{ color: "#A8A8A0" }}>
        Spot will pull every campaign in the account you pick. You choose what to import on the next screen.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {IMPORT_AD_ACCOUNTS.map((a) => (
          <AccountCard key={a.id} account={a} onPick={() => selectImportAdAccount(a.id)} />
        ))}
      </div>
    </div>
  );
}

function AccountCard({ account, onPick }: { account: ImportAdAccount; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group text-left rounded-card p-4 border transition-all bg-[#1A1A18] border-[#262623] hover:border-[#C9A86A]/70 hover:bg-[#1F1F1B]"
    >
      <div className="flex items-center justify-between mb-2.5">
        <PlatformBadge platform={account.platform} />
        <span className="flex items-center gap-1.5 text-[10px]" style={{ color: account.status === "active" ? "#22C55E" : "#D8A657" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: account.status === "active" ? "#22C55E" : "#D8A657" }} />
          {account.status === "active" ? "Active" : "Limited"}
        </span>
      </div>
      <div className="text-[14px] font-semibold leading-tight" style={{ color: "#F5F4EF" }}>
        {account.name}
      </div>
      <div className="text-[11px] font-mono mt-0.5" style={{ color: "#8A8980" }}>
        {account.handle}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#262623]">
        <div className="text-[11.5px]" style={{ color: "#A8A8A0" }}>
          <span className="font-semibold" style={{ color: "#F5F4EF" }}>{account.campaignCount}</span> campaigns
        </div>
        <div className="text-[11.5px] tabular" style={{ color: "#A8A8A0" }}>
          {inr(account.spend30d)} · 30d
        </div>
        <ArrowRight
          size={14}
          strokeWidth={2}
          className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
          style={{ color: "#C9A86A" }}
        />
      </div>
    </button>
  );
}

/* ─── Phase 2 · choose campaigns ─────────────────────────────────── */

function CampaignPicker({
  accountId,
  workflow,
}: {
  accountId: string;
  workflow: LaunchWorkflow;
}) {
  const backToImportAccounts = useSpotStore((s) => s.backToImportAccounts);
  const toggleImportCampaign = useSpotStore((s) => s.toggleImportCampaign);
  const setImportSelection = useSpotStore((s) => s.setImportSelection);
  const confirmImportCampaigns = useSpotStore((s) => s.confirmImportCampaigns);

  const account = importAccount(accountId);
  const campaigns = campaignsForAccount(accountId);
  const selected = workflow.selectedImportCampaignIds ?? [];
  const selectedSet = new Set(selected);
  const allIds = campaigns.map((c) => c.id);
  const allSelected = selected.length === campaigns.length && campaigns.length > 0;
  const sum = summariseImport(selected);

  return (
    <div className="flex flex-col min-h-full" style={{ color: "#F5F4EF" }}>
      <div className="px-6 pt-5 pb-3 max-w-[900px] mx-auto w-full">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={backToImportAccounts}
            className="inline-flex items-center gap-1 h-7 pl-1.5 pr-2.5 rounded-button text-[12px] border border-[#262623] hover:border-[#3A3A35] hover:bg-white/5 transition-colors"
            style={{ color: "#A8A8A0" }}
          >
            <ChevronLeft size={13} strokeWidth={2} />
            Accounts
          </button>
          {account && <PlatformBadge platform={account.platform} />}
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: "#F5F4EF" }}>
              {account?.name}
            </div>
          </div>
        </div>

        {/* Select-all bar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-[8px] mb-1.5" style={{ background: "#1A1A18", border: "1px solid #262623" }}>
          <button
            type="button"
            onClick={() => setImportSelection(allSelected ? [] : allIds)}
            className="inline-flex items-center gap-2 text-[12px] font-medium"
            style={{ color: "#D6D6CE" }}
          >
            <CheckBox checked={allSelected} indeterminate={!allSelected && selected.length > 0} />
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <span className="text-[11.5px] tabular" style={{ color: "#8A8980" }}>
            {selected.length} of {campaigns.length} selected
          </span>
        </div>
      </div>

      {/* List */}
      <div className="px-6 max-w-[900px] mx-auto w-full flex-1">
        <div className="rounded-card overflow-hidden" style={{ border: "1px solid #262623" }}>
          {campaigns.map((c, i) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              checked={selectedSet.has(c.id)}
              first={i === 0}
              onToggle={() => toggleImportCampaign(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div
        className="sticky bottom-0 mt-4 px-6 py-3 backdrop-blur-sm"
        style={{ background: "rgba(22,22,20,0.86)", borderTop: "1px solid #262623" }}
      >
        <div className="max-w-[900px] mx-auto w-full flex items-center justify-between gap-3">
          <div className="text-[11.5px]" style={{ color: "#A8A8A0" }}>
            {selected.length > 0 ? (
              <>
                Importing <span className="font-semibold" style={{ color: "#F5F4EF" }}>{selected.length}</span> ·{" "}
                {inr(sum.spend)} spend · {sum.leads.toLocaleString("en-IN")} leads
              </>
            ) : (
              "Select at least one campaign to import"
            )}
          </div>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={confirmImportCampaigns}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-button text-[12px] font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)",
              color: "#0A0A09",
            }}
          >
            Import {selected.length > 0 ? selected.length : ""} campaign{selected.length === 1 ? "" : "s"}
            <ArrowRight size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignRow({
  campaign,
  checked,
  first,
  onToggle,
}: {
  campaign: ImportableCampaign;
  checked: boolean;
  first: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
      style={{
        background: checked ? "rgba(201,168,106,0.08)" : "transparent",
        borderTop: first ? undefined : "1px solid #262623",
      }}
    >
      <CheckBox checked={checked} />
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: campaign.status === "active" ? "#22C55E" : "#6B6B63" }}
        title={campaign.status === "active" ? "Active" : "Paused"}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-medium truncate" style={{ color: "#F5F4EF" }}>
          {campaign.name}
        </span>
        <span className="block text-[10.5px] truncate" style={{ color: "#8A8980" }}>
          {campaign.objective} · {campaign.platform} · {campaign.updated}
        </span>
      </span>
      <span className="hidden sm:flex items-center gap-5 flex-shrink-0 text-right">
        <Metric label="Spend" value={inr(campaign.spend)} />
        <Metric label="Leads" value={campaign.leads.toLocaleString("en-IN")} />
        <Metric label="CPL" value={inr(campaign.cpl)} />
      </span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="block min-w-[52px]">
      <span className="block text-[12px] tabular font-semibold" style={{ color: "#D6D6CE" }}>
        {value}
      </span>
      <span className="block text-[9px] uppercase tracking-wider" style={{ color: "#7A7970" }}>
        {label}
      </span>
    </span>
  );
}

function CheckBox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-[5px] flex-shrink-0 transition-colors"
      style={{
        background: checked || indeterminate ? "linear-gradient(135deg, #C9A86A 0%, #E0C083 100%)" : "transparent",
        border: checked || indeterminate ? "none" : "1.5px solid #4A4A44",
      }}
    >
      {checked && <Check size={11} strokeWidth={3} style={{ color: "#0A0A09" }} />}
      {indeterminate && !checked && (
        <span className="w-[7px] h-[2px] rounded-full" style={{ background: "#0A0A09" }} />
      )}
    </span>
  );
}

/* ─── Phase 3 · imported summary ─────────────────────────────────── */

function ImportedSummary({ workflow }: { workflow: LaunchWorkflow }) {
  const ids = workflow.importedCampaignIds ?? [];
  const sum = summariseImport(ids);
  const account = importAccount(workflow.importAdAccountId);
  const names = campaignsForAccount(workflow.importAdAccountId ?? "")
    .filter((c) => ids.includes(c.id));

  return (
    <div className="px-6 py-8 max-w-[680px] mx-auto" style={{ color: "#F5F4EF" }}>
      <div className="flex flex-col items-center text-center mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)" }}
        >
          <CheckCircle2 size={28} strokeWidth={1.8} style={{ color: "#22C55E" }} />
        </div>
        <h1 className="text-[20px] font-semibold tracking-tight">
          {sum.count} campaign{sum.count === 1 ? "" : "s"} imported
        </h1>
        <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: "#A8A8A0" }}>
          Pulled into <span style={{ color: "#F5F4EF" }}>{workflow.productName}</span>
          {account ? <> from {account.name}</> : null}. Pick what&rsquo;s next in the chat&nbsp;&larr;
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        <SummaryStat label="Campaigns" value={`${sum.count}`} sub={`${sum.active} active`} />
        <SummaryStat label="Spend · 30d" value={inr(sum.spend)} />
        <SummaryStat label="Leads · 30d" value={sum.leads.toLocaleString("en-IN")} />
        <SummaryStat label="Blended CPL" value={inr(sum.blendedCpl)} />
      </div>

      {/* Imported list */}
      <div className="rounded-card overflow-hidden" style={{ border: "1px solid #262623" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#15140F", borderBottom: "1px solid #262623" }}>
          <Sparkles size={11} strokeWidth={1.8} style={{ color: "#C9A86A" }} />
          <span className="text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: "#A8A8A0" }}>
            Imported into memory
          </span>
        </div>
        <ul>
          {names.map((c, i) => (
            <li
              key={c.id}
              className="flex items-center gap-2.5 px-4 py-2"
              style={{ borderTop: i > 0 ? "1px solid #262623" : undefined }}
            >
              <Check size={12} strokeWidth={2.4} style={{ color: "#22C55E" }} />
              <span className="flex-1 text-[12px] truncate" style={{ color: "#D6D6CE" }}>
                {c.name}
              </span>
              <span className="text-[11px] tabular" style={{ color: "#8A8980" }}>
                {inr(c.spend)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card px-3 py-2.5" style={{ background: "#1A1A18", border: "1px solid #262623" }}>
      <div className="text-[16px] font-semibold tabular leading-none" style={{ color: "#F5F4EF" }}>
        {value}
      </div>
      <div className="text-[9.5px] uppercase tracking-wider font-semibold mt-1.5" style={{ color: "#8A8980" }}>
        {label}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5" style={{ color: "#22C55E" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
