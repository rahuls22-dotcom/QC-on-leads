"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Unplug,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  adAccounts,
  crmOptions,
  autoSyncRules as initialSyncRules,
  fieldMappings,
  stageMappings,
  ghlStageOptions,
  syncLog,
} from "@/lib/integrations-data";
import type { AdAccount, AutoSyncRule } from "@/lib/integrations-data";
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

// ── Collapsible Section ─────────────────────────────────────
function CollapsibleSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-surface-page transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-card-title text-text-primary">{title}</h3>
          {badge && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown size={14} strokeWidth={1.5} className="text-text-tertiary" />
        ) : (
          <ChevronRight size={14} strokeWidth={1.5} className="text-text-tertiary" />
        )}
      </button>
      {open && <div className="px-5 pb-5 pt-2 border-t border-border-subtle">{children}</div>}
    </div>
  );
}

// ── Select Style ────────────────────────────────────────────
const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 10px center",
};

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

// ── Main Page ───────────────────────────────────────────────
type Tab = "ad-accounts" | "crm" | "whatsapp" | "enrichment" | "notifications";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ad-accounts");
  const [syncRules, setSyncRules] = useState(initialSyncRules);
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

  const toggleSyncRule = (id: string) => {
    setSyncRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "ad-accounts", label: "Ad Accounts" },
    { key: "crm", label: "CRM" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "enrichment", label: "Enrichment" },
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

      {/* ── CRM TAB ─────────────────────────────────────────── */}
      {activeTab === "crm" && (
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Connection Status */}
          <div className="bg-white border border-border rounded-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center text-[13px] font-bold text-[#1D4ED8]">
                  G
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-text-primary">GoHighLevel</div>
                  <div className="text-[12px] text-text-secondary">Connected 14 days ago</div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
                  <CheckCircle2 size={11} strokeWidth={2} />
                  Connected
                </span>
              </div>
              <button className="text-[12px] text-text-tertiary hover:text-status-error transition-colors duration-150 flex items-center gap-1">
                <Unplug size={11} strokeWidth={1.5} />
                Disconnect
              </button>
            </div>
          </div>

          {/* Auto-Sync Rules */}
          <CollapsibleSection title="Auto-sync rules" defaultOpen>
            <div className="space-y-0">
              {syncRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between py-3 border-b border-border-subtle last:border-0"
                >
                  <div className="pr-4">
                    <div className="text-[13px] text-text-primary font-medium">{rule.label}</div>
                    <div className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">
                      {rule.helper}
                    </div>
                  </div>
                  <Toggle enabled={rule.enabled} onToggle={() => toggleSyncRule(rule.id)} />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* Field Mapping */}
          <CollapsibleSection title="Field mapping" badge="Auto-mapped 8 fields" defaultOpen>
            <div className="flex items-center gap-2 mb-3">
              <button className="inline-flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150">
                <RefreshCw size={12} strokeWidth={1.5} />
                Auto-detect fields
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                    Revspot Field
                  </th>
                  <th className="px-1 py-2 text-[10px] text-text-tertiary">→</th>
                  <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                    GoHighLevel Field
                  </th>
                  <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                    Default
                  </th>
                </tr>
              </thead>
              <tbody>
                {fieldMappings.map((fm) => (
                  <tr key={fm.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 text-[12px] text-text-primary font-medium">
                      {fm.revspotField}
                    </td>
                    <td className="px-1 py-2 text-[10px] text-text-tertiary text-center">→</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        defaultValue={fm.crmField}
                        className="h-7 px-2 text-[12px] font-mono border border-border rounded-[4px] bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 w-full max-w-[200px]"
                      />
                    </td>
                    <td className="px-3 py-2 text-[12px] text-text-tertiary italic">
                      {fm.defaultValue || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150">
              <Plus size={12} strokeWidth={1.5} />
              Add mapping
            </button>
          </CollapsibleSection>

          {/* Pipeline Mapping */}
          <CollapsibleSection title="Pipeline & stage mapping">
            <div className="mb-4">
              <label className="block text-[12px] text-text-secondary mb-1">
                GoHighLevel Pipeline
              </label>
              <select
                defaultValue="Real Estate Sales Pipeline"
                className="h-9 px-3 pr-8 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                style={selectStyle}
              >
                <option>Real Estate Sales Pipeline</option>
                <option>Luxury Properties Pipeline</option>
                <option>Commercial Pipeline</option>
              </select>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                    Revspot Stage
                  </th>
                  <th className="px-1 py-2 text-[10px] text-text-tertiary">→</th>
                  <th className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left">
                    GoHighLevel Stage
                  </th>
                </tr>
              </thead>
              <tbody>
                {stageMappings.map((sm, i) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 text-[12px] text-text-primary font-medium">
                      {sm.revspotStage}
                    </td>
                    <td className="px-1 py-2 text-[10px] text-text-tertiary text-center">→</td>
                    <td className="px-3 py-2">
                      <select
                        defaultValue={sm.crmStage}
                        className="h-7 px-2 pr-6 text-[12px] border border-border rounded-[4px] bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                        style={selectStyle}
                      >
                        <option value="">Select stage...</option>
                        {ghlStageOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CollapsibleSection>

          {/* Sync Log */}
          <CollapsibleSection title="Sync log" badge="Last sync: 2 minutes ago">
            <div className="text-[12px] text-text-secondary mb-3">
              Today: <span className="font-medium text-text-primary">23 pushed</span> ·{" "}
              <span className="font-medium text-status-error">1 failed</span> ·{" "}
              <span className="text-text-tertiary">412 total synced</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  {["Time", "Lead", "Action", "Status", "Details"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-[10px] font-medium text-text-tertiary uppercase tracking-[0.5px] text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syncLog.map((entry) => (
                  <tr key={entry.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 text-[11px] text-text-tertiary whitespace-nowrap">
                      {entry.time}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-text-primary font-medium whitespace-nowrap">
                      {entry.leadName}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-text-secondary whitespace-nowrap">
                      {entry.action}
                    </td>
                    <td className="px-3 py-2">
                      {entry.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
                          <CheckCircle2 size={11} strokeWidth={2} />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-error">
                          <X size={11} strokeWidth={2} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-text-secondary">{entry.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150">
              View full log
              <ArrowRight size={11} strokeWidth={1.5} />
            </button>
          </CollapsibleSection>
        </motion.div>
      )}

      {/* ── WHATSAPP TAB ─────────────────────────────────────── */}
      {activeTab === "whatsapp" && (
        <motion.div variants={fadeUp}>
          <WhatsAppConnectPage />
        </motion.div>
      )}

      {/* ── ENRICHMENT TAB ───────────────────────────────────── */}
      {activeTab === "enrichment" && (
        <motion.div variants={fadeUp} className="space-y-5 max-w-[680px]">
          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-card-title text-text-primary mb-1">Auto-Enrichment</h3>
            <p className="text-[11px] text-text-tertiary mb-4">Automatically enrich new leads with additional data from connected sources.</p>
            <div className="space-y-0">
              <div className="flex items-start justify-between py-3 border-b border-border-subtle">
                <div>
                  <span className="text-[13px] text-text-primary">Auto-enrich new enquiries</span>
                  <div className="text-[11px] text-text-tertiary mt-0.5">Automatically enrich leads as they come in from campaigns</div>
                </div>
                <Toggle enabled={true} onToggle={() => {}} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-card-title text-text-primary mb-4">Data Sources</h3>
            <div className="space-y-0">
              <div className="flex items-start justify-between py-3 border-b border-border-subtle">
                <div>
                  <span className="text-[13px] text-text-primary">Revspot Database</span>
                  <div className="text-[11px] text-text-tertiary mt-0.5">Enrich with proprietary Revspot data (demographics, property interest signals)</div>
                </div>
                <Toggle enabled={true} onToggle={() => {}} />
              </div>
              <div className="flex items-start justify-between py-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-[13px] text-text-primary">LinkedIn</span>
                    <div className="text-[11px] text-text-tertiary mt-0.5">Enrich with professional data (company, title, industry)</div>
                  </div>
                  <span className="text-[10px] font-medium text-text-tertiary bg-surface-secondary px-1.5 py-0.5 rounded">Coming soon</span>
                </div>
                <Toggle enabled={false} onToggle={() => {}} />
              </div>
              <div className="flex items-start justify-between py-3">
                <div>
                  <span className="text-[13px] text-text-primary">Company data</span>
                  <div className="text-[11px] text-text-tertiary mt-0.5">Enrich with company information (size, revenue, industry)</div>
                </div>
                <Toggle enabled={true} onToggle={() => {}} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded-card p-5">
            <h3 className="text-card-title text-text-primary mb-4">Enrichment Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface-page rounded-metric px-4 py-3">
                <div className="text-[11px] text-text-tertiary uppercase tracking-[0.4px]">Contacts enriched</div>
                <div className="text-stat-md text-text-primary mt-1">612</div>
              </div>
              <div className="bg-surface-page rounded-metric px-4 py-3">
                <div className="text-[11px] text-text-tertiary uppercase tracking-[0.4px]">Enrichment rate</div>
                <div className="text-stat-md text-text-primary mt-1">72.4%</div>
              </div>
              <div className="bg-surface-page rounded-metric px-4 py-3">
                <div className="text-[11px] text-text-tertiary uppercase tracking-[0.4px]">Avg data points</div>
                <div className="text-stat-md text-text-primary mt-1">5.2</div>
              </div>
            </div>
          </div>
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
