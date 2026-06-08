"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWA, TEMPLATES_BY_APP, type WATemplate } from "@/lib/whatsapp-context";
import {
  Check, AlertCircle, AlertTriangle, Loader2, ExternalLink,
  ShieldCheck, ArrowLeft, WifiOff, ServerCrash,
  XCircle, Info, Sparkles, Building2, MessageCircle,
  ChevronDown, Hash, CheckCircle2, Clock, MessagesSquare,
  Unplug, Plug,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ErrorType =
  | "invalid_key"
  | "no_apps"
  | "app_disabled"
  | "network_timeout"
  | "server_error"
  | "template_fetch"
  | null;

type ErrorInfo = { type: ErrorType; httpStatus?: number };

// ─── Provider catalogue ───────────────────────────────────────────────────────
//
// Each entry carries everything the UI needs to talk about that BSP — copy,
// brand mark, dashboard / docs URLs, the path to find an API key, and per-
// provider validation hints. Adding a new BSP is a single entry here; the
// rest of the flow adapts automatically. The "other" entry is the byo-BSP
// catch-all and only collects a vendor name + a base URL alongside the key.

type Provider = {
  id: "gupshup" | "qikberry" | "other";
  name: string;
  initial: string;
  tagline: string;
  color: string;       // accent hue used in the card mark + selected ring
  bg: string;          // soft tint used in the selected card background
  badge?: string;      // optional flag on the card (e.g. "Most popular")
  features: string[];
  apiKeyLabel: string;
  apiKeyPathBlurb: string;  // short line shown above the field
  dashboardUrl: string | null;
  docsUrl: string;
  keyHelpSteps: string[];
  minKeyLen: number;
  // Other-only — when true, the user is also asked for a vendor name and
  // API base URL on Step 2.
  needsVendorDetails: boolean;
};

const PROVIDERS: Provider[] = [
  {
    id: "gupshup",
    name: "Gupshup",
    initial: "G",
    tagline: "Enterprise-grade BSP. Official Meta partner.",
    color: "#F97316",
    bg: "#FFF7ED",
    badge: "Most popular",
    features: ["High throughput", "Advanced analytics", "Multi-account support"],
    apiKeyLabel: "Gupshup API key",
    apiKeyPathBlurb: "Find it in Settings → API Keys (top-right profile menu).",
    dashboardUrl: "https://app.gupshup.io",
    docsUrl: "https://docs.gupshup.io/docs/whatsapp-api-setup",
    keyHelpSteps: [
      "Log in to app.gupshup.io",
      "Click your profile icon (top right) → Settings → API Keys",
      "Copy the 'Partner API Key' (recommended)",
      "Paste it above",
    ],
    minKeyLen: 20,
    needsVendorDetails: false,
  },
  {
    id: "qikberry",
    name: "Qikberry",
    initial: "Q",
    tagline: "India-first BSP with transparent per-message pricing.",
    color: "#0EA5E9",
    bg: "#F0F9FF",
    features: ["Hindi-native templates", "Per-message pricing", "Founder support"],
    apiKeyLabel: "Qikberry API token",
    apiKeyPathBlurb: "Generate it under Workspace → API Tokens.",
    dashboardUrl: "https://app.qikberry.com",
    docsUrl: "https://docs.qikberry.com/integrations/whatsapp",
    keyHelpSteps: [
      "Sign in at app.qikberry.com",
      "Open Workspace → API Tokens",
      "Generate a new token with 'send + template' scope",
      "Paste it above",
    ],
    minKeyLen: 16,
    needsVendorDetails: false,
  },
  {
    id: "other",
    name: "Other",
    initial: "+",
    tagline: "Bring your own BSP — we'll route through a generic adapter.",
    color: "#64748B",
    bg: "#F8FAFC",
    features: ["Custom endpoint", "Manual schema mapping", "Vendor-dependent support"],
    apiKeyLabel: "API key or token",
    apiKeyPathBlurb: "Use the credentials from your BSP's dashboard.",
    dashboardUrl: null,
    docsUrl: "https://docs.revspot.ai/whatsapp/byo-bsp",
    keyHelpSteps: [
      "Open your BSP's developer / API section",
      "Generate a key with WhatsApp send + template scope",
      "Note the API base URL — you'll enter that next",
      "Paste the key above",
    ],
    minKeyLen: 12,
    needsVendorDetails: true,
  },
];

const STEPS = [
  { n: 1, label: "Choose provider" },
  { n: 2, label: "Enter credentials" },
  { n: 3, label: "Validate & connect" },
];

const TIMEOUT_MS = 10000;

function findProvider(id: Provider["id"]) {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

// ─── Error config ─────────────────────────────────────────────────────────────

function getErrorConfig(error: ErrorInfo, provider: Provider, vendorLabel: string) {
  switch (error.type) {
    case "invalid_key":
      return {
        variant: "amber" as const,
        icon: AlertTriangle,
        title: `API ${provider.id === "other" ? "credentials look invalid" : "key is invalid"}`,
        message: `Please check it in your ${vendorLabel} dashboard and try again. Make sure you're copying the full key with no extra spaces.`,
        action: "Try again",
        link: provider.dashboardUrl
          ? { label: `Open ${vendorLabel} dashboard`, url: provider.dashboardUrl }
          : null,
      };
    case "no_apps":
      return {
        variant: "amber" as const,
        icon: AlertCircle,
        title: `Credentials are valid, but no WhatsApp apps are configured`,
        message: `Please set up a WhatsApp Business app in your ${vendorLabel} account first, then return here to connect.`,
        action: "Try again",
        link: { label: `Set up an app in ${vendorLabel} ↗`, url: provider.docsUrl },
      };
    case "app_disabled":
      return {
        variant: "amber" as const,
        icon: AlertTriangle,
        title: `Your ${vendorLabel} app is currently disabled`,
        message: `Please enable it in the ${vendorLabel} dashboard before connecting. Set the status to Active.`,
        action: "Try again",
        link: provider.dashboardUrl
          ? { label: `Go to ${vendorLabel} app settings`, url: provider.dashboardUrl }
          : null,
      };
    case "network_timeout":
      return {
        variant: "red" as const,
        icon: WifiOff,
        title: `Could not reach ${vendorLabel}`,
        message: "The request timed out after 10 seconds. Check your internet connection and try again.",
        action: "Retry",
        link: null,
      };
    case "server_error":
      return {
        variant: "red" as const,
        icon: ServerCrash,
        title: `${vendorLabel} is temporarily unavailable${error.httpStatus ? ` (${error.httpStatus})` : ""}`,
        message: `${vendorLabel}'s servers returned an error. Please wait a few minutes and try again — this isn't an issue with your API key.`,
        action: "Retry",
        link: null,
      };
    case "template_fetch":
      return {
        variant: "amber" as const,
        icon: AlertCircle,
        title: "Connected, but could not load templates",
        message: `Your WABA is connected. We couldn't fetch your templates from ${vendorLabel} just now — you can retry below.`,
        action: "Retry templates",
        link: null,
      };
    default:
      return null;
  }
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({
  error, provider, vendorLabel, onRetry, onDismiss,
}: {
  error: ErrorInfo;
  provider: Provider;
  vendorLabel: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const cfg = getErrorConfig(error, provider, vendorLabel);
  if (!cfg) return null;
  const isRed = cfg.variant === "red";
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-card border mb-4 ${
      isRed ? "bg-[#FEF2F2] border-[#FECACA]" : "bg-[#FEF3C7] border-[#FDE68A]"
    }`}>
      <Icon size={16} strokeWidth={2} className={`shrink-0 mt-0.5 ${isRed ? "text-[#DC2626]" : "text-[#D97706]"}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold ${isRed ? "text-[#991B1B]" : "text-[#92400E]"}`}>{cfg.title}</div>
        <div className={`text-[12px] mt-0.5 leading-relaxed ${isRed ? "text-[#B91C1C]" : "text-[#92400E]"}`}>{cfg.message}</div>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <button onClick={onRetry}
            className={`text-[12px] font-medium underline underline-offset-2 ${isRed ? "text-[#B91C1C] hover:text-red-900" : "text-[#92400E] hover:text-[#78350F]"}`}>
            {cfg.action}
          </button>
          {cfg.link && (
            <a href={cfg.link.url} target="_blank" rel="noreferrer"
              className={`inline-flex items-center gap-1 text-[12px] font-medium ${isRed ? "text-[#B91C1C]" : "text-[#92400E]"}`}>
              <ExternalLink size={11} strokeWidth={1.5} />{cfg.link.label}
            </a>
          )}
        </div>
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <XCircle size={14} strokeWidth={1.5} className={isRed ? "text-[#DC2626]" : "text-[#D97706]"} />
      </button>
    </div>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────
//
// Selectable card for Step 1. Selected state shows a coloured ring + check;
// hover state lifts subtly. The colour mark on the left uses the provider's
// brand hue so the user gets a quick visual lock — no logos required (still
// a prototype). The "Most popular" badge on Gupshup nudges first-time users.

function ProviderCard({
  provider, selected, onClick,
}: {
  provider: Provider;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative w-full text-left rounded-card p-4 border transition-colors duration-150 ${
        selected
          ? "border-accent bg-white"
          : "border-border bg-white hover:border-border-hover"
      }`}
    >
      {provider.badge && !selected && (
        <span className="absolute -top-2 right-3 text-[9.5px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
          {provider.badge}
        </span>
      )}
      <div className="flex flex-col items-center text-center gap-2.5">
        <div
          className="w-10 h-10 rounded-card flex items-center justify-center text-[14px] font-medium text-white"
          style={{ background: provider.color }}
          aria-hidden
        >
          {provider.initial}
        </div>
        <div className="min-w-0 w-full">
          <div className="inline-flex items-center gap-1.5">
            <span className="text-[13.5px] font-medium text-text-primary">{provider.name}</span>
            {selected && (
              <Check size={13} strokeWidth={2.5} className="text-accent" />
            )}
          </div>
          <p className="text-[11.5px] text-text-tertiary mt-0.5 leading-snug">{provider.tagline}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Templates ────────────────────────────────────────────────────────────────
//
// Shown inline once a BSP is connected. Each WhatsApp Business app has its own
// approved template set, so the surface starts with a number-selector and then
// renders the templates for the chosen number. Mirrors /channels/templates so a
// user who lands here gets the same controls without leaving the Integrations
// tab — the previous behaviour was a "manage from Templates" footer hint, which
// always required an extra click.

type TemplateStatus = "approved" | "pending" | "rejected";

const STATUS_CONFIG: Record<TemplateStatus, { label: string; cls: string; icon: React.ElementType }> = {
  approved: { label: "Approved",       cls: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",  icon: CheckCircle2 },
  pending:  { label: "Pending review", cls: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",  icon: Clock },
  rejected: { label: "Rejected",       cls: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",  icon: XCircle },
};

function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-[11px] font-medium border ${cfg.cls}`}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

const CATEGORIES = ["All", "Marketing", "Utility", "Authentication"];

function ConnectedTemplatesPanel({ vendorLabel, dashboardUrl }: { vendorLabel: string; dashboardUrl: string | null }) {
  const { activeApps } = useWA();
  const [selectedAppId, setSelectedAppId] = useState<string>(activeApps[0]?.id ?? "");
  const [appDropOpen, setAppDropOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const selectedApp = activeApps.find((a) => a.id === selectedAppId) ?? null;
  const allTemplates: WATemplate[] = selectedAppId ? (TEMPLATES_BY_APP[selectedAppId] ?? []) : [];
  const filtered = activeCategory === "All"
    ? allTemplates
    : allTemplates.filter((t) => t.category === activeCategory);

  const counts = {
    approved: allTemplates.filter((t) => t.status === "approved").length,
    pending:  allTemplates.filter((t) => t.status === "pending").length,
    rejected: allTemplates.filter((t) => t.status === "rejected").length,
  };

  return (
    <div className="bg-white border border-border rounded-card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <MessagesSquare size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">Templates</h3>
        </div>
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            <ExternalLink size={11} strokeWidth={1.75} />
            Manage in {vendorLabel}
          </a>
        )}
      </div>
      <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
        Templates are per number. Pick a number to view its approved templates.
      </p>

      {/* Number selector */}
      <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
        WhatsApp number
      </label>
      <div className="relative inline-block mb-4">
        <button
          onClick={() => setAppDropOpen((o) => !o)}
          className={`flex items-center gap-2.5 h-9 px-3 rounded-input border text-[12.5px] font-medium transition-colors duration-150 min-w-[280px] ${
            selectedApp
              ? "border-border text-text-primary bg-white hover:border-border-strong"
              : "border-dashed border-border text-text-tertiary bg-white hover:border-border-strong"
          }`}
        >
          {selectedApp ? (
            <>
              <div className="w-5 h-5 rounded-full bg-[#E8F7F0] flex items-center justify-center shrink-0">
                <MessageCircle size={10} strokeWidth={2} className="text-[#15803D]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[12.5px] text-text-primary truncate">{selectedApp.name}</div>
              </div>
              <span className="text-[11px] text-text-tertiary tabular-nums shrink-0">{selectedApp.phone}</span>
            </>
          ) : (
            <>
              <Hash size={13} strokeWidth={2} className="text-text-tertiary shrink-0" />
              <span className="flex-1 text-left">Select a WhatsApp number</span>
            </>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2}
            className={`text-text-tertiary transition-transform shrink-0 ${appDropOpen ? "rotate-180" : ""}`}
          />
        </button>

        {appDropOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAppDropOpen(false)} />
            <div className="absolute left-0 top-[calc(100%+4px)] z-20 bg-white border border-border rounded-card shadow-xl py-1.5 min-w-[280px]">
              {activeApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setSelectedAppId(app.id);
                    setActiveCategory("All");
                    setAppDropOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-secondary transition-colors ${
                    selectedAppId === app.id ? "bg-surface-secondary" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-[#E8F7F0] flex items-center justify-center shrink-0">
                    <MessageCircle size={11} strokeWidth={2} className="text-[#15803D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-text-primary truncate">{app.name}</div>
                    <div className="text-[10.5px] text-text-tertiary tabular-nums">{app.phone}</div>
                  </div>
                  {selectedAppId === app.id && (
                    <CheckCircle2 size={13} strokeWidth={2} className="text-[#15803D] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {!selectedApp ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-card border border-dashed border-border-subtle">
          <MessageCircle size={18} strokeWidth={1.5} className="text-text-tertiary" />
          <div className="text-[12.5px] font-medium text-text-primary">Select a number to view templates</div>
          <p className="text-[11.5px] text-text-tertiary text-center max-w-xs">
            Each WhatsApp number has its own approved template set.
          </p>
        </div>
      ) : (
        <>
          {/* Stat row */}
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[11.5px] rounded-badge bg-surface-secondary text-text-secondary">
              <span className="font-semibold text-text-primary tabular-nums">{allTemplates.length}</span>
              templates
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[11.5px] rounded-badge bg-[#F0FDF4] text-[#15803D]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span className="font-semibold tabular-nums">{counts.approved}</span>
              approved
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[11.5px] rounded-badge bg-[#FEF3C7] text-[#92400E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span className="font-semibold tabular-nums">{counts.pending}</span>
              pending
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 text-[11.5px] rounded-badge bg-[#FEF2F2] text-[#B91C1C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span className="font-semibold tabular-nums">{counts.rejected}</span>
              rejected
            </span>
          </div>

          {/* Category tabs — same segmented control language used elsewhere
              in the integrations tab to keep the visual grammar consistent. */}
          <div className="inline-flex items-center gap-1 p-1 bg-[#E9ECF1] rounded-button mb-3">
            {CATEGORIES.map((cat) => {
              const on = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 h-7 rounded-[5px] text-[12px] font-medium transition-all duration-150 outline-none ${
                    on
                      ? "bg-white text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Templates table */}
          <div className="rounded-card border border-border-subtle overflow-hidden">
            <div
              className="grid bg-surface-page border-b border-border-subtle px-3.5 py-2"
              style={{ gridTemplateColumns: "minmax(0, 1fr) 110px 90px 130px 90px" }}
            >
              {["Template", "Category", "Language", "Status", "Modified"].map((h) => (
                <div
                  key={h}
                  className="text-[10.5px] font-medium text-text-tertiary uppercase tracking-[0.5px]"
                >
                  {h}
                </div>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center text-[12.5px] text-text-tertiary">
                No templates in this category.
              </div>
            ) : (
              filtered.map((t) => (
                <div
                  key={t.id}
                  className="grid items-center px-3.5 py-2.5 border-b border-border-subtle last:border-0 hover:bg-surface-page transition-colors"
                  style={{ gridTemplateColumns: "minmax(0, 1fr) 110px 90px 130px 90px" }}
                >
                  <div className="min-w-0 pr-3">
                    <div className="text-[12.5px] font-medium text-text-primary truncate">{t.name}</div>
                    <div className="text-[11.5px] text-text-tertiary truncate mt-0.5">
                      {t.body.length > 70 ? t.body.slice(0, 70) + "…" : t.body}
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-badge bg-surface-secondary text-text-secondary text-[11px] font-medium">
                      {t.category}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-text-secondary">{t.languages.join(", ")}</div>
                  <div>
                    <TemplateStatusBadge status={t.status as TemplateStatus} />
                  </div>
                  <div className="text-[11.5px] text-text-tertiary tabular-nums">
                    {new Date(t.modifiedOn).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="text-[11.5px] text-text-tertiary mt-3">
            Delivery and read metrics aren't available via the WABA API — use your {vendorLabel} dashboard for analytics.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
//
// Compact horizontal indicator that fits the settings context. The previous
// version used 28×28 circles with a 4px ring and bold dividers — too much
// chrome for a panel that sits inside another tab. Slimmed down to match the
// scale of the rest of the integrations tab.

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 }) {
  if (step >= 4) return null;
  return (
    <div className="flex items-center mb-4">
      {STEPS.map((s, i) => {
        const isDone = step > s.n;
        const isCurrent = step === s.n;
        return (
          <div key={s.n} className="flex items-center flex-1">
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-150 ${
                  isDone ? "bg-[#22C55E] text-white"
                  : isCurrent ? "bg-accent text-white"
                  : "bg-surface-secondary text-text-tertiary"
                }`}
              >
                {isDone ? <Check size={10} strokeWidth={3} /> : s.n}
              </div>
              <span
                className={`text-[11.5px] font-medium whitespace-nowrap ${
                  isCurrent ? "text-text-primary" : isDone ? "text-[#15803D]" : "text-text-tertiary"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={`flex-1 h-px mx-2.5 ${isDone ? "bg-[#22C55E]" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppConnectPage() {
  // The router is intentionally unused now — earlier this page redirected
  // away to /channels/templates the moment a connection existed, which made
  // the WhatsApp tab inside Integrations unreachable for any session that
  // had ever connected. We now render an inline management view + the
  // templates table on the same surface.
  useRouter();
  const { isConnected, vendor, activeApps, disconnect, connect } = useWA();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [providerId, setProviderId] = useState<Provider["id"]>("gupshup");
  const [customVendor, setCustomVendor] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ key?: string; vendor?: string; baseUrl?: string }>({});
  const [error, setError] = useState<ErrorInfo>({ type: null });
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryExhausted, setShowRetryExhausted] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const provider = findProvider(providerId);
  const vendorLabel = provider.id === "other"
    ? (customVendor.trim() || "your provider")
    : provider.name;

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const switchProvider = (id: Provider["id"]) => {
    setProviderId(id);
    setApiKey("");
    setCustomVendor("");
    setCustomBaseUrl("");
    setFieldErrors({});
    setError({ type: null });
  };

  const simulateValidation = (key: string): Promise<{ scenario: ErrorType; httpStatus?: number }> => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ scenario: "network_timeout" }), TIMEOUT_MS);
      timeoutRef.current = timer;
      setTimeout(() => {
        clearTimeout(timer);
        if (key === "timeout") resolve({ scenario: "network_timeout" });
        else if (key === "noapp") resolve({ scenario: "no_apps" });
        else if (key === "disabled") resolve({ scenario: "app_disabled" });
        else if (key === "500") resolve({ scenario: "server_error", httpStatus: 500 });
        else if (key.startsWith("invalid") || key.length < provider.minKeyLen) resolve({ scenario: "invalid_key" });
        else resolve({ scenario: null });
      }, 2000);
    });
  };

  const validateStep2 = (): boolean => {
    const next: typeof fieldErrors = {};
    if (provider.needsVendorDetails) {
      if (!customVendor.trim()) next.vendor = "Vendor name is required";
      if (!customBaseUrl.trim()) next.baseUrl = "API base URL is required";
      else if (!/^https?:\/\//i.test(customBaseUrl.trim())) next.baseUrl = "Must start with http:// or https://";
    }
    if (!apiKey.trim()) next.key = `${provider.apiKeyLabel} is required`;
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleValidate = async () => {
    if (!validateStep2()) return;
    setError({ type: null });
    setStep(3);
    setProgress(0);

    let p = 0;
    const progressInterval = setInterval(() => {
      p = Math.min(p + 3, 85);
      setProgress(p);
    }, 60);

    const result = await simulateValidation(apiKey.trim());
    clearInterval(progressInterval);

    if (result.scenario !== null) {
      setProgress(0);
      setStep(2);
      setError({ type: result.scenario, httpStatus: result.httpStatus });
      if (result.scenario === "server_error" && retryCount < 2) {
        setRetryCount((prev) => prev + 1);
        const backoff = [1000, 2000, 4000][retryCount];
        setTimeout(() => handleValidate(), backoff);
      } else if (result.scenario === "server_error" && retryCount >= 2) {
        setShowRetryExhausted(true);
        setRetryCount(0);
      }
      return;
    }

    setProgress(100);
    await new Promise((r) => setTimeout(r, 300));
    setStep(4);
    setTimeout(() => { connect(providerId, apiKey, ["app_001", "app_002"]); }, 1200);
  };

  const handleRetry = () => {
    setError({ type: null });
    setShowRetryExhausted(false);
    setRetryCount(0);
    handleValidate();
  };

  const handleDismissError = () => {
    setError({ type: null });
    setShowRetryExhausted(false);
    setStep(2);
  };

  const canContinueFromStep1 = provider.id !== "other" || customVendor.trim().length > 0;

  // ── Connected state ────────────────────────────────────────────────────────
  // When the user already has an active WhatsApp connection, we replace the
  // setup flow with a management view + the templates table inline. Matches
  // the webhooks panel chrome (white card · border · rounded-card · p-5) so
  // the WhatsApp tab feels native to the Integrations surface instead of a
  // foreign full-bleed wizard.
  if (isConnected) {
    const connectedProvider = findProvider(
      (PROVIDERS.find((p) => p.id === vendor)?.id ?? "other")
    );
    return (
      <div className="max-w-[760px]">
        {/* Connection card — provider + status + disconnect + active apps. */}
        <div className="bg-white border border-border rounded-card p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <Plug size={15} strokeWidth={1.75} className="text-text-secondary" />
              <h3 className="text-card-title text-text-primary">WhatsApp connection</h3>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F0FDF4] text-[#15803D]">
              <CheckCircle2 size={11} strokeWidth={2} />
              Connected
            </span>
          </div>
          <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
            Templates and sequences route through your linked {connectedProvider.name} account.
          </p>

          {/* Provider strip */}
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-card border border-border-subtle bg-surface-page mb-4">
            <div
              className="shrink-0 w-8 h-8 rounded-card flex items-center justify-center text-white text-[13px] font-semibold"
              style={{ background: connectedProvider.color }}
              aria-hidden
            >
              {connectedProvider.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-text-primary">{connectedProvider.name}</div>
              <div className="text-[11.5px] text-text-tertiary mt-0.5">
                API key ending in ••••{(activeApps.length > 0 ? "live" : "—")}
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Disconnect WhatsApp? Existing sequences will pause until you reconnect.")) {
                  disconnect();
                }
              }}
              className="h-8 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-button hover:text-[#DC2626] hover:border-[#FCA5A5] hover:bg-red-50 transition-colors duration-150 shrink-0"
            >
              <Unplug size={11} strokeWidth={1.75} />
              Disconnect
            </button>
          </div>

          {/* Active apps */}
          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
            Active WhatsApp apps
          </label>
          {activeApps.length === 0 ? (
            <p className="text-[12.5px] text-text-secondary">No apps are currently active.</p>
          ) : (
            <div className="rounded-card border border-border-subtle divide-y divide-border-subtle">
              {activeApps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center gap-3 px-3.5 py-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#E8F7F0] flex items-center justify-center shrink-0">
                    <MessageCircle size={11} strokeWidth={2} className="text-[#15803D]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-text-primary truncate">{app.name}</div>
                    <div className="text-[11px] text-text-tertiary tabular-nums">{app.phone}</div>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                    Live
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates panel — pulled inline so the user gets the template
            list right where they connected, without a hop to another page. */}
        <ConnectedTemplatesPanel
          vendorLabel={connectedProvider.name}
          dashboardUrl={connectedProvider.dashboardUrl}
        />
      </div>
    );
  }

  // ── Setup flow ─────────────────────────────────────────────────────────────
  // Three steps inside a single webhook-style card. Removed the centered hero
  // and the standalone-wizard chrome — the WhatsApp tab is just one of four
  // tabs on the integrations page, so it has to look like one of four tabs.
  return (
    <div className="max-w-[760px]">
      {/* Description card — sits above the steps so first-time users have
          context. Matches the API & Webhooks "API credentials" intro card. */}
      <div className="bg-white border border-border rounded-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <MessagesSquare size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">Connect WhatsApp</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary leading-relaxed">
          Connect a WhatsApp Business Service Provider (BSP) to send template messages and
          automate sequences. We'll route through your BSP's API using a key you provide.
        </p>
      </div>

      {/* Setup card */}
      <div className="bg-white border border-border rounded-card p-5">
        <StepIndicator step={step} />

        {/* ─────── Step 1 — Choose provider ─────── */}
        {step === 1 && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-card-title text-text-primary">Pick your BSP</h3>
              <a
                href="https://docs.revspot.ai/whatsapp/bsps"
                target="_blank"
                rel="noreferrer"
                className="text-[11.5px] text-text-tertiary hover:text-accent transition-colors duration-150"
              >
                What's a BSP? ↗
              </a>
            </div>
            <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
              Choose the provider that fronts your WhatsApp Business account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {PROVIDERS.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  selected={providerId === p.id}
                  onClick={() => switchProvider(p.id)}
                />
              ))}
            </div>

            {provider.id === "other" && (
              <div className="rounded-card bg-surface-page border border-border-subtle p-3.5 mb-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-1.5">
                  <Building2 size={13} strokeWidth={1.5} className="text-text-secondary" />
                  <label className="text-[12px] font-medium text-text-primary">Which provider?</label>
                </div>
                <input
                  type="text"
                  value={customVendor}
                  onChange={(e) => setCustomVendor(e.target.value)}
                  placeholder="e.g. WATI, Interakt, MessageBird…"
                  className="w-full h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                />
                <p className="text-[11px] text-text-tertiary mt-1.5">
                  We'll route through a generic adapter. Support depends on what your BSP exposes.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end mt-5">
              <button
                onClick={() => setStep(2)}
                disabled={!canContinueFromStep1}
                className="h-9 px-4 inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:hover:bg-accent"
              >
                {canContinueFromStep1 ? `Continue with ${vendorLabel}` : "Name your provider to continue"}
              </button>
            </div>
          </div>
        )}

        {/* ─────── Step 2 — Credentials ─────── */}
        {step === 2 && (
          <div>
            {/* Provider context strip */}
            <div className="flex items-center gap-2.5 mb-4 px-3 py-2 bg-surface-page rounded-card border border-border-subtle">
              <div
                className="w-6 h-6 rounded-[5px] flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                style={{ background: provider.color }}
                aria-hidden
              >
                {provider.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-text-primary">
                  {vendorLabel}
                  {provider.id === "other" && (
                    <span className="ml-1.5 text-[10.5px] text-text-tertiary font-normal">(via generic adapter)</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setStep(1); setError({ type: null }); setApiKey(""); setFieldErrors({}); }}
                className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary transition-colors duration-150 shrink-0"
              >
                <ArrowLeft size={10} strokeWidth={2} /> Change
              </button>
            </div>

            {error.type && (
              <ErrorBanner
                error={error}
                provider={provider}
                vendorLabel={vendorLabel}
                onRetry={handleRetry}
                onDismiss={handleDismissError}
              />
            )}

            {showRetryExhausted && (
              <div className="flex items-start gap-2.5 px-3 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-card mb-4">
                <Info size={14} strokeWidth={2} className="text-[#DC2626] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[12.5px] font-semibold text-[#991B1B]">{vendorLabel} is still unavailable</div>
                  <div className="text-[11.5px] text-[#B91C1C] mt-0.5">All 3 automatic retries failed. Please wait a few minutes, then try again manually.</div>
                </div>
              </div>
            )}

            <h3 className="text-card-title text-text-primary mb-1">Enter your API credentials</h3>
            <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">{provider.apiKeyPathBlurb}</p>

            <div className="space-y-3.5">
              {provider.needsVendorDetails && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                      Vendor name
                    </label>
                    <input
                      type="text"
                      value={customVendor}
                      onChange={(e) => { setCustomVendor(e.target.value); setFieldErrors((f) => ({ ...f, vendor: undefined })); }}
                      placeholder="e.g. WATI"
                      className={`w-full h-9 px-3 text-[12.5px] border rounded-input bg-white text-text-primary focus:outline-none transition-colors duration-150 placeholder:text-text-tertiary ${
                        fieldErrors.vendor ? "border-red-400" : "border-border focus:border-accent"
                      }`}
                    />
                    {fieldErrors.vendor && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-[#DC2626]">
                        <AlertCircle size={12} strokeWidth={2} /> {fieldErrors.vendor}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                      API base URL
                    </label>
                    <input
                      type="url"
                      value={customBaseUrl}
                      onChange={(e) => { setCustomBaseUrl(e.target.value); setFieldErrors((f) => ({ ...f, baseUrl: undefined })); }}
                      placeholder="https://api.your-bsp.com/v1"
                      className={`w-full h-9 px-3 text-[12.5px] font-mono border rounded-input bg-white text-text-primary focus:outline-none transition-colors duration-150 placeholder:text-text-tertiary placeholder:font-sans ${
                        fieldErrors.baseUrl ? "border-red-400" : "border-border focus:border-accent"
                      }`}
                    />
                    {fieldErrors.baseUrl && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-[#DC2626]">
                        <AlertCircle size={12} strokeWidth={2} /> {fieldErrors.baseUrl}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
                  {provider.apiKeyLabel}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setFieldErrors((f) => ({ ...f, key: undefined })); setError({ type: null }); }}
                  onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  placeholder={`Paste your ${vendorLabel} API key…`}
                  className={`w-full h-9 px-3 text-[12.5px] font-mono border rounded-input bg-white text-text-primary focus:outline-none transition-colors duration-150 placeholder:text-text-tertiary placeholder:font-sans ${
                    fieldErrors.key ? "border-red-400" : "border-border focus:border-accent"
                  }`}
                />
                {fieldErrors.key && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-[#DC2626]">
                    <AlertCircle size={12} strokeWidth={2} /> {fieldErrors.key}
                  </div>
                )}
              </div>

              {/* Provider-specific helper — collapsed-feel inline strip */}
              {provider.id !== "other" && (
                <div className="px-3.5 py-3 rounded-card border border-border-subtle bg-surface-page space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-text-primary">
                    <Sparkles size={12} strokeWidth={2} className="text-text-tertiary" />
                    How to get your {provider.name} key
                  </div>
                  {provider.keyHelpSteps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11.5px] text-text-secondary">
                      <span className="w-4 h-4 rounded-full bg-surface-secondary text-text-primary flex items-center justify-center text-[9px] font-medium shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {s}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-surface-page border border-border-subtle rounded-card text-[11.5px] text-text-secondary leading-relaxed">
                <ShieldCheck size={13} strokeWidth={1.75} className="shrink-0 mt-0.5 text-[#16A34A]" />
                Your API key is encrypted with AES-256 and never stored in plain text. After connection, only the last 4 characters are visible.
              </div>

              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
              >
                <ExternalLink size={11} strokeWidth={1.5} />
                {provider.id === "other"
                  ? "Bring-your-own-BSP guide"
                  : `${provider.name} setup guide`}
              </a>
            </div>

            <div className="flex items-center justify-between gap-2.5 mt-5">
              <button
                onClick={() => { setStep(1); setError({ type: null }); setFieldErrors({}); }}
                className="h-9 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-text-primary border border-border rounded-button hover:border-border-strong hover:bg-surface-secondary transition-colors duration-150"
              >
                Back
              </button>
              <button
                onClick={handleValidate}
                className="h-9 px-4 inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
              >
                Validate &amp; connect
              </button>
            </div>
          </div>
        )}

        {/* ─────── Step 3 — Validating ─────── */}
        {step === 3 && (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-page flex items-center justify-center">
              <Loader2 size={22} strokeWidth={1.5} className="animate-spin text-accent" />
            </div>
            <div className="text-center">
              <div className="text-[14px] font-semibold text-text-primary">Validating your credentials</div>
              <div className="text-[12px] text-text-secondary mt-1">
                Connecting to {vendorLabel} — checking API key and WABA account…
              </div>
            </div>
            <div className="w-full max-w-[260px]">
              <div className="w-full bg-surface-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[11px] text-text-tertiary mt-1.5 text-center tabular-nums">{progress}%</div>
            </div>

            <div className="w-full max-w-[280px] space-y-2 mt-1">
              {[
                { label: `Checking API key with ${vendorLabel}`, done: progress > 30 },
                { label: "Retrieving WABA account details",        done: progress > 60 },
                { label: "Pre-fetching template list",              done: progress > 85 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[12px]">
                  {item.done ? (
                    <Check size={13} strokeWidth={2.5} className="text-[#22C55E] shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-border shrink-0" />
                  )}
                  <span className={item.done ? "text-text-primary" : "text-text-tertiary"}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────── Step 4 — Success ─────── */}
        {step === 4 && (
          <div className="flex flex-col items-center py-10 gap-4">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center">
              <Check size={24} strokeWidth={2.5} className="text-[#16A34A]" />
            </div>
            <div className="text-center">
              <div className="text-[15px] font-semibold text-text-primary">WhatsApp connected</div>
              <div className="text-[12px] text-text-secondary mt-1">
                Your {vendorLabel} account is linked. Loading your templates…
              </div>
            </div>
            <div className="w-full max-w-[300px] space-y-1.5">
              <div className="flex items-center justify-between px-3 h-8 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card">
                <span className="text-[11.5px] text-[#15803D]">Provider</span>
                <span className="text-[11.5px] font-medium text-[#166534]">{vendorLabel}</span>
              </div>
              <div className="flex items-center justify-between px-3 h-8 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card">
                <span className="text-[11.5px] text-[#15803D]">Status</span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#166534]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> Connected
                </span>
              </div>
              <div className="flex items-center justify-between px-3 h-8 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card">
                <span className="text-[11.5px] text-[#15803D]">API key</span>
                <span className="text-[11.5px] font-mono text-[#166534]">••••••••••••{apiKey.slice(-4)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Common issues — only on credentials step when there's no active error.
          Sits BELOW the main card to mirror webhook tab's documentation-link
          placement. */}
      {step === 2 && !error.type && (
        <div className="mt-4 px-4 py-3 bg-surface-page border border-border-subtle rounded-card">
          <div className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-2">Common issues</div>
          <div className="space-y-1.5">
            {[
              ["Key not working?", `Double-check that you're using the right scope. ${provider.id === "gupshup" ? "Use the Partner API Key, not the app-level one." : provider.id === "qikberry" ? "Qikberry tokens need 'send + template' scope." : "Make sure your token has WhatsApp send permission."}`],
              ["No apps showing?", `Set up a WhatsApp Business app in ${vendorLabel} first, then return here.`],
              ["Timeout?", `Try on a stable connection. ${vendorLabel} may be briefly unavailable.`],
            ].map(([title, desc]) => (
              <div key={title} className="text-[11.5px] text-text-secondary">
                <span className="text-text-primary font-medium">{title}</span> {desc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
