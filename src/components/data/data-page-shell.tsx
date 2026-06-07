"use client";

// Shared shell for every top-level Tools module page (Enrichment, Contact
// extraction, ...). Owns:
//   - page header with breadcrumb (Tools / [Module] / [section])
//   - run drawer state
//   - composer toast + open-run bridge
//
// Each child page just renders its content via {children}. Pass `rootLabel` +
// `rootHref` so the breadcrumb's first link points back to the module base
// (e.g. "Enrichment" → "/enrichment"). Defaults stay on "Data" / "/data" for
// any caller we haven't migrated yet.

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, X } from "lucide-react";

import { useEnrichmentCrmStore, type RunRecord } from "@/lib/enrichment-crm-data";
import { RunDrawer } from "@/components/enrichment-crm/run-drawer";
import { CrmConnectModal } from "@/components/enrichment-crm/crm-connect-modal";

interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

interface ShellProps {
  variant: "connected" | "empty";
  title: string;
  description: ReactNode;
  /** @deprecated breadcrumbs removed, prop kept for back-compat, ignored. */
  breadcrumb?: string;
  /** @deprecated breadcrumbs removed, prop kept for back-compat, ignored. */
  breadcrumbTrail?: BreadcrumbCrumb[];
  /** Optional back-arrow href shown left of the title. */
  backHref?: string;
  /** Optional element rendered top-right of the title row (e.g. a primary CTA). */
  headerAction?: ReactNode;
  /** @deprecated breadcrumbs removed. */
  rootLabel?: string;
  /** @deprecated breadcrumbs removed. */
  rootHref?: string;
  // Render-prop so children can dispatch into the shared run drawer and connect
  // flow without prop-drilling.
  children: (ctx: ShellChildCtx) => ReactNode;
}

export interface ShellChildCtx {
  openRun: (run: RunRecord) => void;
  openConnectFlow: () => void;
}

export function DataPageShell({
  variant: _variant,
  title,
  description,
  breadcrumb: _breadcrumb,
  breadcrumbTrail: _breadcrumbTrail,
  backHref,
  headerAction,
  rootLabel: _rootLabel,
  rootHref: _rootHref,
  children,
}: ShellProps) {
  const runs = useEnrichmentCrmStore((s) => s.runs);
  const markCompletionsSeen = useEnrichmentCrmStore((s) => s.markCompletionsSeen);
  const tickProgress = useEnrichmentCrmStore((s) => s.tickProgress);
  const router = useRouter();

  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    markCompletionsSeen();
  }, [markCompletionsSeen]);

  useEffect(() => {
    const hasInFlight = runs.some((r) => r.status === "in_progress");
    if (!hasInFlight) return;
    const id = window.setInterval(() => tickProgress(), 900);
    return () => window.clearInterval(id);
  }, [runs, tickProgress]);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<RawToastDetail>;
      const payload: ToastPayload = normalizeToast(ce.detail);
      setToast(payload);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 5200);
    };
    window.addEventListener("enrichment-crm:toast", handler);
    return () => {
      window.removeEventListener("enrichment-crm:toast", handler);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ runId?: string }>;
      const runId = ce.detail?.runId;
      if (!runId) return;
      const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
      if (run) setSelectedRun(run);
    };
    window.addEventListener("enrichment-crm:open-run", handler);
    return () => window.removeEventListener("enrichment-crm:open-run", handler);
  }, []);

  const openToastRun = (runId: string) => {
    const run = useEnrichmentCrmStore.getState().runs.find((r) => r.id === runId);
    if (run) setSelectedRun(run);
    setToast(null);
  };

  const onBuildAudience = (run: RunRecord) => {
    router.push(`/audiences?source=enrichment&runId=${encodeURIComponent(run.id)}`);
  };

  // Open the support-handoff modal. Real product would launch the OAuth /
  // integrations flow; for the prototype we collect the request and reach
  // out from the support side.
  const openConnectFlow = () => setCrmModalOpen(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Back"
                className="inline-flex items-center justify-center h-8 w-8 -ml-2 rounded-button text-text-tertiary hover:text-text-primary hover:bg-surface-secondary/70 transition-colors flex-shrink-0"
              >
                <ArrowLeft size={18} strokeWidth={1.75} />
              </Link>
            )}
            <h1 className="text-page-title text-text-primary truncate">{title}</h1>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
        <p className="text-[12px] text-text-secondary mt-2 leading-snug truncate">
          {description}
        </p>
      </div>

      {/* Page content */}
      {children({
        openRun: (r) => setSelectedRun(r),
        openConnectFlow,
      })}

      {/* Shared drawer */}
      <RunDrawer
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        onBuildAudience={onBuildAudience}
      />

      {/* Shared CRM connect modal (support-handoff flow) */}
      <CrmConnectModal open={crmModalOpen} onClose={() => setCrmModalOpen(false)} />

      {/* Shared toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[80] w-[380px] max-w-[calc(100vw-32px)] bg-white border border-border rounded-card shadow-[0_12px_32px_rgba(15,15,15,0.12),0_0_0_1px_rgba(15,15,15,0.04)]"
          >
            <div className="p-4 flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                <Loader2 size={14} strokeWidth={1.75} className="text-[#1D4ED8] animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-primary">{toast.title}</div>
                {toast.description && (
                  <div className="text-[12px] text-text-secondary leading-snug mt-1">{toast.description}</div>
                )}
                {toast.runId && (
                  <button
                    onClick={() => openToastRun(toast.runId!)}
                    className="text-[12px] font-medium text-text-primary underline underline-offset-2 hover:opacity-80 mt-2"
                  >
                    View run
                  </button>
                )}
              </div>
              <button
                onClick={() => setToast(null)}
                aria-label="Dismiss"
                className="p-1 -m-1 text-text-tertiary hover:text-text-primary rounded-button transition-colors"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Toast types & helpers ─────────────────────────────────────────────────

type RawToastDetail =
  | string
  | { message: string }
  | {
      kind?: string;
      title?: string;
      description?: string;
      runId?: string;
      message?: string;
    };

interface ToastPayload {
  id: string;
  title: string;
  description?: string;
  runId?: string;
}

function normalizeToast(d: RawToastDetail): ToastPayload {
  const id = `t-${Date.now()}`;
  if (typeof d === "string") return { id, title: d };
  if ("message" in d && d.message && !("title" in d && d.title)) {
    return { id, title: d.message };
  }
  const obj = d as { title?: string; description?: string; runId?: string };
  return {
    id,
    title: obj.title || "Done",
    description: obj.description,
    runId: obj.runId,
  };
}
