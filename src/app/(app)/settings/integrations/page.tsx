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
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { adAccounts } from "@/lib/integrations-data";
import type { AdAccount } from "@/lib/integrations-data";
import {
  inbound,
  signingSecret,
  outbound,
  recentDeliveries,
  PRODUCT_EVENTS,
  PRODUCT_EVENT_DOCS,
  DOCS_BASE,
  DOCS_LINKS,
} from "@/lib/integration-data";
import {
  CopyField,
  WebhookStatusBadge,
  EventChips,
  CodeBlock,
} from "@/components/integrations/api-bits";
import { ALL_PRODUCTS, useProducts } from "@/lib/products";
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
// Revspot is CRM-agnostic. We host ONE inbound API (client pushes leads in) and
// POST results to ONE webhook URL the CLIENT hosts. Every call carries
// `event` + `product` so the client routes server-side. No CRM handshake.
function ApiWebhooksTab() {
  const { has } = useProducts();
  const ownedProducts = ALL_PRODUCTS.filter((p) => has(p.key));
  const [webhookUrl, setWebhookUrl] = useState(outbound.url);
  const [saved, setSaved] = useState(false);

  const configured = webhookUrl.trim().length > 0;
  const status = configured ? outbound.status : "not_configured";

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-4 max-w-[860px]">
      {/* (A) Inbound API */}
      <div className="bg-white border border-border rounded-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Inbox size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">Inbound API</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
          Push leads to Revspot from your CRM or backend. Send a{" "}
          <code className="font-mono text-text-primary">{inbound.method}</code> with your
          API key in the <code className="font-mono text-text-primary">Authorization</code> header.
        </p>
        <div className="space-y-3">
          <CopyField label="Endpoint" value={`${inbound.method} ${inbound.endpoint}`} />
          <CopyField label="API key" value={inbound.apiKey} masked />
        </div>
        <a
          href={DOCS_LINKS.push}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150 mt-3.5"
        >
          How to push leads
          <ExternalLink size={12} strokeWidth={1.5} />
        </a>
      </div>

      {/* (B) Outbound webhook — ONE URL for the whole workspace */}
      <div className="bg-white border border-border rounded-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Webhook size={15} strokeWidth={1.75} className="text-text-secondary" />
            <h3 className="text-card-title text-text-primary">Outbound webhook</h3>
          </div>
          <WebhookStatusBadge status={status} />
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
          We POST every result to one webhook URL <span className="text-text-primary font-medium">your team hosts</span>.
          Each call carries an <code className="font-mono text-text-primary">event</code> and{" "}
          <code className="font-mono text-text-primary">product</code> field so you route it server-side, and is
          signed with the secret below so you can verify it came from Revspot.
        </p>

        {/* Webhook URL input + save */}
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
            Webhook URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.yourcompany.com/revspot"
              className="flex-1 min-w-0 h-9 px-3 text-[12.5px] font-mono border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary placeholder:font-sans"
            />
            <button
              onClick={save}
              className="h-9 px-4 inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 shrink-0"
            >
              {saved ? (
                <>
                  <Check size={14} strokeWidth={2} />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>

        <div className="mb-5">
          <CopyField label="Signing secret" value={signingSecret} masked />
        </div>

        {/* Per-product event reference (read-only) */}
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
          Events you'll receive
        </div>
        <div className="space-y-2.5 mb-5">
          {ownedProducts.map((p) => (
            <div key={p.key} className="rounded-card border border-border px-3.5 py-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[13px] font-semibold text-text-primary">{p.label}</span>
                <a
                  href={PRODUCT_EVENT_DOCS[p.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-text-tertiary hover:text-text-secondary transition-colors duration-150 shrink-0"
                >
                  Payload docs
                  <ExternalLink size={12} strokeWidth={1.5} />
                </a>
              </div>
              <EventChips events={PRODUCT_EVENTS[p.key]} />
            </div>
          ))}
        </div>

        {/* Recent deliveries */}
        <div className="mt-5">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
            Recent deliveries
          </div>
          <div className="rounded-card border border-border-subtle divide-y divide-border-subtle">
            {recentDeliveries.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    d.status === "delivered" ? "bg-[#15803D]" : "bg-[#DC2626]"
                  }`}
                />
                <span className="text-[11.5px] font-mono text-text-primary shrink-0 w-[120px] truncate">
                  {d.event}
                </span>
                <span className="text-[12px] text-text-secondary flex-1 min-w-0 truncate">
                  {d.detail}
                </span>
                <span className="text-[11px] font-mono text-text-tertiary shrink-0">
                  {d.responseCode}
                </span>
                <span className="text-[11px] text-text-tertiary shrink-0 w-[64px] text-right">
                  {d.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* (C) Developer docs */}
      <div className="bg-white border border-border rounded-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">Developer docs</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
          Hand these to your tech team. Everything needed to push leads and receive results.
        </p>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {[
            { label: "Push leads", href: DOCS_LINKS.push, desc: "Send leads to the inbound API" },
            { label: "Webhooks overview", href: DOCS_LINKS.webhooks, desc: "Receive results on your URL" },
            { label: "Verify signatures", href: DOCS_LINKS.signatures, desc: "Confirm calls came from us" },
            { label: "Full reference", href: DOCS_BASE, desc: "API + event catalog" },
          ].map((d) => (
            <a
              key={d.label}
              href={d.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-2 rounded-card border border-border px-3.5 py-3 hover:border-border-strong transition-colors duration-150"
            >
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-text-primary">{d.label}</div>
                <div className="text-[11.5px] text-text-tertiary truncate">{d.desc}</div>
              </div>
              <ExternalLink
                size={13}
                strokeWidth={1.5}
                className="text-text-tertiary group-hover:text-text-secondary transition-colors duration-150 shrink-0 mt-0.5"
              />
            </a>
          ))}
        </div>

        {/* Sample webhook payload */}
        <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">
          Sample webhook payload
        </div>
        <CodeBlock>{`POST {your_webhook_url}
X-Revspot-Signature: t=1717..,v1=5d4f...

{
  "event": "lead.enriched",
  "id": "evt_8f3c2a9b",
  "data": {
    "lead_id": "rl_4521",
    "enrichment": { "company": "Infosys", "job_title": "Eng Manager" }
  }
}`}</CodeBlock>
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
      <motion.div variants={fadeUp} className="mb-6">
        <div className="text-meta text-text-secondary mb-1">Tools</div>
        <h1 className="text-page-title text-text-primary">Integrations</h1>
        <p className="text-meta text-text-secondary mt-1">
          Connect your ad platforms, CRM, and notification channels.
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
