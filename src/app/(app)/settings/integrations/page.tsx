"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Unplug,
  Check,
  Inbox,
  Webhook,
  ExternalLink,
  FlaskConical,
  Pencil,
} from "lucide-react";
import { adAccounts } from "@/lib/integrations-data";
import type { AdAccount } from "@/lib/integrations-data";
import {
  API_BASE,
  apiToken,
  PRODUCT_API,
  DOCS_BASE,
} from "@/lib/integration-data";
import { CopyField, CodeBlock } from "@/components/integrations/api-bits";
import { ALL_PRODUCTS, useProducts } from "@/lib/products";
import type { ProductKey } from "@/lib/products";
import WhatsAppConnectPage from "@/app/(app)/channels/whatsapp/page";
import { useWA } from "@/lib/whatsapp-context";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

// ── Toggle ──────────────────────────────────────────────────
function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 shrink-0 ${
        enabled ? "bg-accent" : "bg-silver-light"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Ad Account Card ─────────────────────────────────────────
function AdAccountCard({ account }: { account: AdAccount }) {
  const [connected, setConnected] = useState(account.connected);
  const [connecting, setConnecting] = useState(false);

  const platformColors = {
    meta: "bg-[#EFF6FF] text-[#1D4ED8]",
    google: "bg-[#FEF3C7] text-[#92400E]",
    linkedin: "bg-[#EFF6FF] text-[#1E40AF]",
  };

  const handleConnect = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
    }, 1500);
  };

  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center text-[11px] font-bold ${platformColors[account.platform]}`}>
            {account.label[0]}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-text-primary">{account.name}</div>
            {connected && account.accountName && (
              <div className="text-[12px] text-text-secondary">{account.accountName}</div>
            )}
          </div>
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
            <CheckCircle2 size={11} strokeWidth={2} />
            Connected
          </span>
        )}
      </div>

      {connected ? (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-text-secondary">
            {account.activeCampaigns} active campaigns · {account.monthlySpend}
          </span>
          <button
            onClick={() => setConnected(false)}
            className="text-[12px] text-text-tertiary hover:text-status-error transition-colors duration-150 flex items-center gap-1"
          >
            <Unplug size={11} strokeWidth={1.5} />
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-text-secondary mb-3">{account.description}</p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-1.5 h-8 px-4 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-70"
          >
            {connecting ? (
              <>
                <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </button>
        </>
      )}
    </div>
  );
}

// ── API & Webhooks Tab ──────────────────────────────────────
// One sub-tab per product the workspace owns. A static bearer token (shared,
// shown once at the top) authenticates every call. Each product configures its
// own callback URL so a client running two CRMs can route products separately.
//   - inbound products (enrichment, ai_calling): client calls our API, we POST
//     the result back to their callback URL.
//   - callback-only (campaigns): WE create new leads and deliver each to their
//     callback URL — no inbound call.
// Sub-tab order — Campaigns first (most clients start outbound), then the
// inbound products. Independent of ALL_PRODUCTS (which drives sidebar chips).
const TAB_ORDER: ProductKey[] = ["campaigns", "enrichment", "ai_calling"];

type TestState = { key: ProductKey; status: "sending" | "ok" } | null;

function ApiWebhooksTab() {
  const { has } = useProducts();
  const ownedProducts = TAB_ORDER.filter((k) => has(k)).map(
    (k) => ALL_PRODUCTS.find((p) => p.key === k)!,
  );
  const [active, setActive] = useState<ProductKey>(
    ownedProducts[0]?.key ?? "campaigns",
  );
  // Webhook URLs start empty — the client pastes their own endpoint.
  // `draft` = what's in the input. `committed` = the last saved value. A URL is
  // editable when it's never been saved, or the user clicked Edit on it.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [committed, setCommitted] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<ProductKey | null>(null);
  const [flash, setFlash] = useState<ProductKey | null>(null);
  const [test, setTest] = useState<TestState>(null);

  // Active product may have been toggled off in the sidebar — fall back.
  const activeKey = ownedProducts.some((p) => p.key === active)
    ? active
    : ownedProducts[0]?.key;
  if (!activeKey) return null;

  const cfg = PRODUCT_API[activeKey];
  const label = ALL_PRODUCTS.find((p) => p.key === activeKey)?.label ?? "";
  const inbound = cfg.direction === "inbound";

  const draftUrl = draft[activeKey] ?? "";
  const savedUrl = committed[activeKey];
  const isCommitted = savedUrl != null;
  const isEditing = !isCommitted || editing === activeKey;
  // The URL we'd actually test/deliver to right now.
  const effectiveUrl = isEditing ? draftUrl : savedUrl ?? "";

  const selectTab = (k: ProductKey) => {
    setActive(k);
    setTest(null);
  };
  const setUrl = (k: string, v: string) =>
    setDraft((prev) => ({ ...prev, [k]: v }));
  const save = () => {
    setCommitted((prev) => ({ ...prev, [activeKey]: draftUrl }));
    setEditing(null);
    setFlash(activeKey);
    setTimeout(() => setFlash((f) => (f === activeKey ? null : f)), 1800);
  };
  const startEdit = () => {
    setDraft((prev) => ({ ...prev, [activeKey]: savedUrl ?? "" }));
    setEditing(activeKey);
  };
  const cancelEdit = () => {
    setDraft((prev) => ({ ...prev, [activeKey]: savedUrl ?? "" }));
    setEditing(null);
  };
  const runTest = () => {
    setTest({ key: activeKey, status: "sending" });
    setTimeout(() => setTest({ key: activeKey, status: "ok" }), 1300);
  };
  const activeTest = test && test.key === activeKey ? test : null;

  return (
    <div className="max-w-[760px]">
      {/* Shared credentials */}
      <div className="bg-white border border-border rounded-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">API credentials</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
          One token authenticates every product. Send it in the{" "}
          <code className="font-mono text-text-primary">Authorization: Bearer</code> header.
        </p>
        <div className="space-y-3">
          <CopyField label="Base URL" value={API_BASE} />
          <CopyField label="API token" value={apiToken} masked />
        </div>
      </div>

      {/* Per-module sub-tabs — segmented control (owned products only) */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#E9ECF1] rounded-button mb-4">
        {ownedProducts.map((p) => {
          const on = p.key === activeKey;
          return (
            <button
              key={p.key}
              onClick={() => selectTab(p.key)}
              className={`px-3.5 h-8 rounded-[6px] text-[12.5px] font-medium transition-all duration-150 outline-none focus:outline-none focus-visible:outline-none ${
                on
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Active module panel */}
      <div className="bg-white border border-border rounded-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Webhook size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">{label}</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">{cfg.blurb}</p>

        {/* Step 1 — Call the API (inbound products only) */}
        {inbound && cfg.endpoints.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border-subtle">
            <h4 className="text-[12.5px] font-semibold text-text-primary mb-0.5">
              1 · Call the API
            </h4>
            <p className="text-[12px] text-text-secondary mb-2.5">
              Send a request with your API token to start the job.
            </p>
            <div className="rounded-card border border-border-subtle divide-y divide-border-subtle">
              {cfg.endpoints.map((e) => (
                <div key={e.path} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="text-[10.5px] font-mono font-semibold text-text-tertiary w-[40px] shrink-0">
                    {e.method}
                  </span>
                  <code className="text-[12px] font-mono text-text-primary shrink-0">{e.path}</code>
                  <span className="text-[12px] text-text-secondary ml-auto truncate">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Receive results on your webhook */}
        <div className="mt-5 pt-5 border-t border-border-subtle">
          <h4 className="text-[12.5px] font-semibold text-text-primary mb-0.5">
            {inbound ? "2 · Receive the result" : "Receive your leads"}
          </h4>
          <p className="text-[12px] text-text-secondary mb-3">
            {inbound
              ? "When the job finishes, we POST the result to your webhook URL."
              : "As each lead comes in, we POST it to your webhook URL."}
          </p>

          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
            Webhook URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={isEditing ? draftUrl : savedUrl ?? ""}
              onChange={(e) => setUrl(activeKey, e.target.value)}
              disabled={!isEditing}
              placeholder="https://your-app.com/webhooks/revspot"
              className="flex-1 min-w-0 h-9 px-3 text-[12.5px] font-mono border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary placeholder:font-sans disabled:bg-surface-secondary disabled:text-text-secondary disabled:cursor-default"
            />
            {isEditing ? (
              <>
                <button
                  onClick={save}
                  disabled={!draftUrl}
                  className="h-9 px-4 inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 shrink-0 disabled:opacity-40 disabled:hover:bg-accent"
                >
                  Save
                </button>
                {isCommitted && (
                  <button
                    onClick={cancelEdit}
                    className="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-button hover:border-border-strong hover:bg-surface-secondary transition-colors duration-150 shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={startEdit}
                className="h-9 px-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-primary border border-border rounded-button hover:border-border-strong hover:bg-surface-secondary transition-colors duration-150 shrink-0"
              >
                <Pencil size={13} strokeWidth={1.75} />
                Edit
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[11.5px] text-text-tertiary leading-relaxed">
              Delivered as JSON via HTTP POST.
            </p>
            {flash === activeKey && (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#15803D] shrink-0">
                <Check size={12} strokeWidth={2.5} />
                Saved
              </span>
            )}
          </div>

          {/* Test webhook — fires a sample payload at the URL above. */}
          <div className="flex items-center gap-2.5 mt-3">
            <button
              onClick={runTest}
              disabled={!effectiveUrl || activeTest?.status === "sending"}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-primary border border-border rounded-button hover:border-border-strong hover:bg-surface-secondary transition-colors duration-150 disabled:opacity-40 disabled:hover:bg-white"
            >
              {activeTest?.status === "sending" ? (
                <>
                  <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <FlaskConical size={13} strokeWidth={1.75} />
                  Send test event
                </>
              )}
            </button>
            {activeTest?.status === "ok" && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#15803D]">
                <CheckCircle2 size={13} strokeWidth={2} />
                200 OK — sample payload delivered
              </span>
            )}
          </div>

          {/* What lands at the webhook — nested under this section since it's
              the shape we POST to the URL above. */}
          <div className="mt-4">
            <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
              What we&apos;ll send
            </div>
            <CodeBlock>{cfg.sampleCallback}</CodeBlock>
          </div>
        </div>

        <a
          href={DOCS_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150 mt-4"
        >
          API reference
          <ExternalLink size={12} strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────
type Tab = "ad-accounts" | "api" | "whatsapp" | "notifications";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ad-accounts");
  // Sync state with the WhatsApp context so the tab can warn the user
  // when no connection exists yet. Notifications tab may grow similar
  // indicators (Slack/email) later — keep the variable name specific.
  const { isConnected: waConnected } = useWA();

  // Notification state
  const [slackUrl, setSlackUrl] = useState("");
  const [waGroupId, setWaGroupId] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  const [notifEmail, setNotifEmail] = useState("demo@godrejproperties.com");
  const [notifTriggers, setNotifTriggers] = useState({
    syncFailures: true,
    dailySummary: true,
    weeklyReport: false,
    budgetAlerts: true,
    voiceAlerts: false,
  });
  const [saved, setSaved] = useState(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: "ad-accounts", label: "Ad Accounts" },
    { key: "api", label: "API & Webhooks" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "notifications", label: "Notifications" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-5">
        <h2 className="text-[16px] font-semibold text-text-primary">Integrations</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Connect your ad platforms, lead delivery, and notification channels.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex items-center gap-0 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors duration-150 ${
              activeTab === tab.key
                ? "text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {/* Status dot — red when WhatsApp isn't connected yet, so
                  the user notices the setup is pending without having
                  to click into the tab. Easy to extend to other tabs
                  by adding more conditions. */}
              {tab.key === "whatsapp" && !waConnected && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"
                  title="WhatsApp not connected yet"
                  aria-label="Not connected"
                />
              )}
            </span>
            {activeTab === tab.key && (
              <motion.div
                layoutId="integrations-tab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                transition={{ duration: 0.15 }}
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* ── AD ACCOUNTS TAB ─────────────────────────────────── */}
      {activeTab === "ad-accounts" && (
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
          {adAccounts.map((a) => (
            <AdAccountCard key={a.id} account={a} />
          ))}
        </motion.div>
      )}

      {/* ── API & WEBHOOKS TAB ───────────────────────────────── */}
      {activeTab === "api" && (
        <motion.div variants={fadeUp}>
          <ApiWebhooksTab />
        </motion.div>
      )}

      {/* ── WHATSAPP TAB ─────────────────────────────────────── */}
      {activeTab === "whatsapp" && (
        <motion.div variants={fadeUp}>
          <WhatsAppConnectPage />
        </motion.div>
      )}

      {/* ── NOTIFICATIONS TAB ───────────────────────────────── */}
      {activeTab === "notifications" && (
        <motion.div variants={fadeUp} className="space-y-5 max-w-[680px]">
          {/* Slack */}
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-card-title text-text-primary mb-3">Slack</h3>
            <label className="block text-[12px] text-text-secondary mb-1">Webhook URL</label>
            <input
              type="text"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
            />
          </div>

          {/* WhatsApp */}
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-card-title text-text-primary mb-3">WhatsApp</h3>
            <label className="block text-[12px] text-text-secondary mb-1">Group ID</label>
            <input
              type="text"
              value={waGroupId}
              onChange={(e) => setWaGroupId(e.target.value)}
              placeholder="120363..."
              className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
            />
          </div>

          {/* Email */}
          <div className="bg-white border border-border rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-card-title text-text-primary">Email Notifications</h3>
              <Toggle enabled={emailNotif} onToggle={() => setEmailNotif(!emailNotif)} />
            </div>
            {emailNotif && (
              <input
                type="email"
                value={notifEmail}
                onChange={(e) => setNotifEmail(e.target.value)}
                className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
              />
            )}
          </div>

          {/* Triggers */}
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-card-title text-text-primary mb-3">Notification Triggers</h3>
            <div className="space-y-2.5">
              {[
                { key: "syncFailures" as const, label: "CRM sync failures" },
                { key: "dailySummary" as const, label: "Daily lead summary" },
                { key: "weeklyReport" as const, label: "Weekly performance report" },
                { key: "budgetAlerts" as const, label: "Campaign budget alerts" },
                { key: "voiceAlerts" as const, label: "Voice agent performance alerts" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifTriggers[key]}
                    onChange={() =>
                      setNotifTriggers((p) => ({ ...p, [key]: !p[key] }))
                    }
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
                  />
                  <span className="text-[13px] text-text-primary">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="pt-2 pb-8">
            <button
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
            >
              {saved ? (
                <>
                  <Check size={15} strokeWidth={2} />
                  Saved!
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
