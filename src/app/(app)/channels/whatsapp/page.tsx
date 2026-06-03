"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWA } from "@/lib/whatsapp-context";
import {
  Check, AlertCircle, AlertTriangle, Loader2, ExternalLink,
  ShieldCheck, ArrowLeft, WifiOff, ServerCrash,
  XCircle, Info, Sparkles, Building2,
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
      {/* Compact card — colour mark + name + one-line tagline. The brand
          colour is constrained to the small initial mark, which mirrors
          how /integrations colours platform marks (Meta / Google / etc.).
          Everything else uses the canonical near-black accent so the
          chooser doesn't compete visually with the rest of the product. */}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WhatsAppConnectPage() {
  // The router is intentionally unused now — earlier this page redirected
  // away to /channels/templates the moment a connection existed, which made
  // the WhatsApp tab inside Integrations unreachable for any session that
  // had ever connected. We now render an inline "Connected" management view
  // instead.
  useRouter();
  const { isConnected, vendor, activeApps, disconnect, connect } = useWA();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [providerId, setProviderId] = useState<Provider["id"]>("gupshup");
  // Other-only — the BSP name the user types and an API base URL.
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
  // The label users actually see — for Other, prefer their custom name when
  // they've entered one, otherwise fall back to a generic "your provider".
  const vendorLabel = provider.id === "other"
    ? (customVendor.trim() || "your provider")
    : provider.name;

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // Reset the second-step state when the user changes provider. Avoids
  // stale "Qikberry token" sitting in the field after they pick Gupshup.
  const switchProvider = (id: Provider["id"]) => {
    setProviderId(id);
    setApiKey("");
    setCustomVendor("");
    setCustomBaseUrl("");
    setFieldErrors({});
    setError({ type: null });
  };

  // Mock validation — pattern-based so the prototype exercises every error
  // branch. In production replace with real fetch() calls per provider.
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

  // ── Connected state ────────────────────────────────────────────────────
  // When the user already has an active WhatsApp connection (any provider),
  // we skip the multi-step setup and render a clean management view. The
  // previous behaviour was to redirect to /channels/templates, which made
  // the WhatsApp tab inside Integrations unreachable for any session that
  // had ever connected. Now the tab always shows something useful.
  if (isConnected) {
    const connectedProvider = findProvider(
      (PROVIDERS.find((p) => p.id === vendor)?.id ?? "other")
    );
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-start justify-center pt-8 pb-12">
        <div className="w-full max-w-[640px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#DCFCE7] mb-4">
              <Check size={26} strokeWidth={2.5} className="text-[#16A34A]" />
            </div>
            <h1 className="text-[22px] font-semibold text-text-primary">WhatsApp is connected</h1>
            <p className="text-[13px] text-text-secondary mt-1.5 max-w-[420px] mx-auto leading-relaxed">
              Templates and sequences can now route through your linked account.
            </p>
          </div>

          <div className="bg-white border border-border rounded-card overflow-hidden">
            {/* Provider strip */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
              <div
                className="shrink-0 w-9 h-9 rounded-card flex items-center justify-center text-white text-[14px] font-semibold"
                style={{ background: connectedProvider.color }}
                aria-hidden
              >
                {connectedProvider.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-text-primary">{connectedProvider.name}</div>
                <div className="inline-flex items-center gap-1.5 text-[11.5px] text-[#15803D] mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  Connected
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("Disconnect WhatsApp? Existing sequences will pause until you reconnect.")) {
                    disconnect();
                  }
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[12.5px] font-medium text-text-secondary border border-border rounded-button hover:text-[#DC2626] hover:border-[#FCA5A5] hover:bg-red-50 transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Active apps */}
            <div className="px-5 py-4">
              <div className="text-[10.5px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-2.5">
                Active WhatsApp apps
              </div>
              {activeApps.length === 0 ? (
                <p className="text-[12.5px] text-text-secondary">No apps are currently active.</p>
              ) : (
                <ul className="space-y-2">
                  {activeApps.map((app) => (
                    <li key={app.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-surface-page rounded-card">
                      <div className="min-w-0">
                        <div className="text-[13px] text-text-primary truncate">{app.name}</div>
                        <div className="text-[11.5px] text-text-tertiary tabular-nums">{app.phone}</div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] text-[#15803D]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                        Live
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer hint — templates are managed from the Templates
                section in the sidebar. We deliberately don't link out
                here because navigation breaks the Integrations-tab
                context for users embedding this page. */}
            <div className="px-5 py-3.5 border-t border-border-subtle bg-surface-page/60">
              <p className="text-[11.5px] text-text-tertiary">
                Manage your message templates from the Templates section.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-start justify-center pt-8 pb-12">
      <div className="w-full max-w-[640px]">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#DCFCE7] mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25d366"/>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="#25d366" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 className="text-[24px] font-semibold text-text-primary">Connect WhatsApp</h1>
        </div>

        {/* Step indicator — current step gets a tinted ring in the active
            provider's colour so the journey feels continuous across screens. */}
        {step < 4 && (
          <div className="flex items-center mb-8">
            {STEPS.map((s, i) => {
              const isDone = step > s.n;
              const isCurrent = step === s.n;
              return (
                <div key={s.n} className="flex items-center flex-1">
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all duration-200 ${
                        isDone ? "bg-[#22C55E] text-white"
                        : isCurrent ? "bg-accent text-white ring-4 ring-accent/10"
                        : "bg-surface-secondary text-text-tertiary border border-border"
                      }`}
                    >
                      {isDone ? <Check size={12} strokeWidth={3} /> : s.n}
                    </div>
                    <span className={`text-[12px] font-medium whitespace-nowrap transition-colors ${
                      isCurrent ? "text-text-primary" : isDone ? "text-[#15803D]" : "text-text-tertiary"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-px mx-3 transition-colors duration-300 ${isDone ? "bg-[#22C55E]" : "bg-border"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Card */}
        <div className="bg-white border border-border rounded-card overflow-hidden">

          {/* ─────── Step 1 — Choose provider ─────── */}
          {step === 1 && (
            <div className="p-6">
              {/* The step indicator already says "Choose provider". A
                  single-line link is enough ambient help — anything more
                  starts competing with the cards themselves. */}
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-[14px] font-medium text-text-primary">Pick your BSP</h2>
                <a
                  href="https://docs.revspot.ai/whatsapp/bsps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11.5px] text-text-tertiary hover:text-accent transition-colors"
                >
                  What's a BSP? ↗
                </a>
              </div>

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

              {/* When "Other" is selected, ask the user to name their vendor
                  right here so the rest of the flow can refer to it. We do
                  the API-base-URL on Step 2 so this stays a single, clear
                  question. */}
              {provider.id === "other" && (
                <div className="rounded-[10px] bg-surface-page border border-border-subtle px-4 py-3.5 mb-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Building2 size={13} strokeWidth={1.5} className="text-text-secondary" />
                    <label className="text-[12px] font-medium text-text-primary">Which provider?</label>
                  </div>
                  <input
                    type="text"
                    value={customVendor}
                    onChange={(e) => setCustomVendor(e.target.value)}
                    placeholder="e.g. WATI, Interakt, MessageBird…"
                    className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white focus:outline-none focus:border-text-secondary transition-colors"
                  />
                  <p className="text-[11px] text-text-tertiary mt-1.5">
                    We'll route through a generic adapter. Support depends on what your BSP exposes.
                  </p>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!canContinueFromStep1}
                className="w-full h-11 rounded-card text-[13.5px] font-medium bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canContinueFromStep1 ? `Continue with ${vendorLabel}` : "Name your provider to continue"}
              </button>
            </div>
          )}

          {/* ─────── Step 2 — Credentials ─────── */}
          {step === 2 && (
            <div className="p-6">
              {/* Provider context strip — small mark + name + change link.
                  This is the user's anchor: they can always see which BSP
                  they're configuring, and bail out cleanly. */}
              <div className="flex items-center gap-2.5 mb-5 px-3.5 py-2.5 bg-surface-page rounded-card border border-border-subtle">
                <div
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
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
                  <button
                    onClick={() => { setStep(1); setError({ type: null }); setApiKey(""); setFieldErrors({}); }}
                    className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <ArrowLeft size={10} strokeWidth={2} /> Change provider
                  </button>
                </div>
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

              <h2 className="text-[15px] font-semibold text-text-primary mb-1">Enter your API credentials</h2>
              <p className="text-[12.5px] text-text-secondary mb-4">{provider.apiKeyPathBlurb}</p>

              <div className="space-y-4">
                {/* Other-only: vendor confirmation + API base URL */}
                {provider.needsVendorDetails && (
                  <>
                    <div>
                      <label className="block text-[11.5px] font-medium text-text-secondary mb-1.5 uppercase tracking-[0.5px]">
                        Vendor name
                      </label>
                      <input
                        type="text"
                        value={customVendor}
                        onChange={(e) => { setCustomVendor(e.target.value); setFieldErrors((f) => ({ ...f, vendor: undefined })); }}
                        placeholder="e.g. WATI"
                        className={`w-full h-10 px-3.5 text-[13px] border rounded-card bg-white focus:outline-none transition-colors ${
                          fieldErrors.vendor ? "border-red-400" : "border-border focus:border-text-secondary"
                        }`}
                      />
                      {fieldErrors.vendor && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-[#DC2626]">
                          <AlertCircle size={12} strokeWidth={2} /> {fieldErrors.vendor}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11.5px] font-medium text-text-secondary mb-1.5 uppercase tracking-[0.5px]">
                        API base URL
                      </label>
                      <input
                        type="url"
                        value={customBaseUrl}
                        onChange={(e) => { setCustomBaseUrl(e.target.value); setFieldErrors((f) => ({ ...f, baseUrl: undefined })); }}
                        placeholder="https://api.your-bsp.com/v1"
                        className={`w-full h-10 px-3.5 text-[13px] border rounded-card bg-white focus:outline-none transition-colors ${
                          fieldErrors.baseUrl ? "border-red-400" : "border-border focus:border-text-secondary"
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
                  <label className="block text-[11.5px] font-medium text-text-secondary mb-1.5 uppercase tracking-[0.5px]">
                    {provider.apiKeyLabel}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setFieldErrors((f) => ({ ...f, key: undefined })); setError({ type: null }); }}
                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                    placeholder={`Paste your ${vendorLabel} API key…`}
                    className={`w-full h-10 px-3.5 text-[13px] border rounded-card bg-white focus:outline-none transition-colors ${
                      fieldErrors.key ? "border-red-400" : "border-border focus:border-text-secondary"
                    }`}
                  />
                  {fieldErrors.key && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px] text-[#DC2626]">
                      <AlertCircle size={12} strokeWidth={2} /> {fieldErrors.key}
                    </div>
                  )}
                </div>

                {/* Provider-specific helper — only shown for known BSPs.
                    For Other we keep the help generic via the docs link
                    below since we can't enumerate steps for an arbitrary
                    vendor. */}
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

                <div className="flex items-start gap-2.5 px-3.5 py-3 bg-surface-page border border-border rounded-card text-[12px] text-text-secondary">
                  <ShieldCheck size={14} strokeWidth={1.5} className="shrink-0 mt-0.5 text-[#16A34A]" />
                  Your API key is encrypted using AES-256 and never stored in plain text. After connection, only the last 4 characters will be visible.
                </div>

                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <ExternalLink size={11} strokeWidth={1.5} />
                  {provider.id === "other"
                    ? "Read the bring-your-own-BSP guide ↗"
                    : `Read the ${provider.name} setup guide ↗`}
                </a>
              </div>

              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => { setStep(1); setError({ type: null }); setFieldErrors({}); }}
                  className="flex-1 h-10 rounded-card text-[12.5px] font-medium border border-border text-text-secondary hover:bg-surface-page transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleValidate}
                  className="flex-[2] h-10 rounded-card text-[12.5px] font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  Validate &amp; connect
                </button>
              </div>
            </div>
          )}

          {/* ─────── Step 3 — Validating ─────── */}
          {step === 3 && (
            <div className="flex flex-col items-center py-14 px-6 gap-5">
              <div className="w-16 h-16 rounded-full bg-surface-page flex items-center justify-center">
                <Loader2 size={26} strokeWidth={1.5} className="animate-spin text-accent" />
              </div>
              <div className="text-center">
                <div className="text-[16px] font-semibold text-text-primary">Validating your credentials</div>
                <div className="text-[12.5px] text-text-secondary mt-1">
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
                <div className="text-[11px] text-text-tertiary mt-2 text-center">{progress}%</div>
              </div>

              <div className="w-full max-w-[280px] space-y-2 mt-2">
                {[
                  { label: `Checking API key with ${vendorLabel}`, done: progress > 30 },
                  { label: "Retrieving WABA account details", done: progress > 60 },
                  { label: "Pre-fetching template list", done: progress > 85 },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px]">
                    {item.done ? (
                      <Check size={14} strokeWidth={2.5} className="text-[#22C55E] shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-border shrink-0" />
                    )}
                    <span className={item.done ? "text-text-primary" : "text-text-tertiary"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────── Step 4 — Success ─────── */}
          {step === 4 && (
            <div className="flex flex-col items-center py-14 px-6 gap-5">
              <div className="w-16 h-16 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                <Check size={28} strokeWidth={2.5} className="text-[#16A34A]" />
              </div>
              <div className="text-center">
                <div className="text-[18px] font-semibold text-text-primary">WhatsApp connected</div>
                <div className="text-[12.5px] text-text-secondary mt-1.5">
                  Your {vendorLabel} account is linked. Taking you to Templates…
                </div>
              </div>
              <div className="w-full max-w-[320px] space-y-2">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card">
                  <span className="text-[12px] text-[#15803D]">Provider</span>
                  <span className="text-[12px] font-medium text-[#166534]">{vendorLabel}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card">
                  <span className="text-[12px] text-[#15803D]">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#166534]">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" /> Connected
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-card">
                  <span className="text-[12px] text-[#15803D]">API key</span>
                  <span className="text-[12px] font-mono text-[#166534]">••••••••••••{apiKey.slice(-4)}</span>
                </div>
              </div>
              <div className="text-[11.5px] text-text-tertiary text-center">
                Redirecting to Templates in a moment…
              </div>
            </div>
          )}
        </div>

        {/* Inline help — common issues, only on the credentials step when
            there's no error yet. Keeps the step from feeling like a dead end
            for someone who's never set up a BSP before. */}
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

        <p className="text-center text-[11.5px] text-text-tertiary mt-5">
          Need help?{" "}
          <a href={provider.docsUrl} target="_blank" rel="noreferrer" className="underline text-text-secondary">
            {provider.id === "other" ? "Bring-your-own-BSP guide ↗" : `${provider.name} setup guide ↗`}
          </a>
        </p>
      </div>
    </div>
  );
}
