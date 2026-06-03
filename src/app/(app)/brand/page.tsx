"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Copy,
  History,
  Plus,
  Sparkles,
  Upload,
  Check,
  Shield,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { getBrand, type BrandLogoVariant } from "@/lib/brand-data";
import { SpotMark } from "@/components/spot/spot-mark";
import { useSpotStore } from "@/lib/spot/store";
import { useCurrentWorkspaceLabel } from "@/lib/workspace-store";

export default function BrandSettingsPage() {
  const brand = getBrand();
  const askSpot = useSpotStore((s) => s.askSpot);
  const showToast = useSpotStore((s) => s.showToast);
  const wsLabel = useCurrentWorkspaceLabel();
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copy = (text: string) => {
    if (typeof window !== "undefined" && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-3 text-[12px] text-text-secondary">
        <span>{wsLabel}</span>
        <ChevronRight size={11} className="text-text-tertiary" />
        <span className="text-text-primary">Brand</span>
      </div>

      {/* Hero card */}
      <div
        className="card-base relative overflow-hidden mb-4"
        style={{ padding: 22 }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -60,
            top: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at center, rgba(201,168,106,0.22) 0%, rgba(255,255,255,0) 70%)",
            pointerEvents: "none",
          }}
        />
        <div className="relative flex items-start gap-5">
          <BrandLogoTile
            logo={{ id: "hero", label: "G mark", variant: "g-mark", hint: "" }}
            size={64}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {brand.isDefault && (
                <span className="pill pill-info" style={{ fontSize: 10.5 }}>
                  Default brand
                </span>
              )}
              <span className="pill" style={{ fontSize: 10.5 }}>
                Updated {brand.updated}
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
              {brand.name}
            </h1>
            <div className="text-[13px] text-text-secondary mt-1">{brand.tagline}</div>
            <div className="text-[11.5px] text-text-tertiary mt-2 flex items-center gap-1.5">
              <Sparkles size={11} />
              Inherited by {brand.inheritedBy} project{brand.inheritedBy === 1 ? "" : "s"} ·
              changes propagate everywhere
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => askSpot("Audit the brand — anything drifting from these rules?", { kind: "workspace", label: "Brand" })}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button bg-accent text-white hover:bg-accent-hover text-[12.5px] font-medium"
            >
              <SpotMark size={13} /> Audit brand
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button border border-border bg-white hover:border-border-hover text-[12.5px]"
            >
              <History size={12} /> Versions
            </button>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* Voice */}
        <Card
          title="Voice"
          subtitle="How everything Godrej should sound."
          onAsk={() => askSpot("Rewrite this brand voice — make it sharper.", { kind: "workspace", label: "Brand" })}
        >
          <SectionLabel>We are</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {brand.voice.is.map((t) => (
              <span key={t} className="pill pill-ok" style={{ fontSize: 11 }}>
                {t}
              </span>
            ))}
          </div>
          <SectionLabel>We're not</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {brand.voice.isNot.map((t) => (
              <span key={t} className="pill pill-err" style={{ fontSize: 11 }}>
                {t}
              </span>
            ))}
          </div>
          <SectionLabel>Enforced rules</SectionLabel>
          <ul className="space-y-2 mt-1">
            {brand.voice.rules.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-[12px] leading-[1.5]">
                <span
                  className="inline-block flex-shrink-0 mt-1.5"
                  style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-2)" }}
                />
                <span className="flex-1">{r}</span>
                <button
                  type="button"
                  className="text-text-tertiary hover:text-text-secondary p-0.5"
                  title="Remove rule"
                >
                  <X size={11} />
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10.5px] border border-dashed border-border bg-white text-text-secondary"
              >
                <Plus size={10} /> Add rule
              </button>
            </li>
          </ul>
        </Card>

        {/* Colors */}
        <Card title="Colors" subtitle="Primary, accent, surfaces.">
          <div className="space-y-2">
            {brand.colors.map((c) => (
              <div
                key={c.hex}
                className="flex items-center gap-3 px-2.5 py-2 rounded-[6px] hover-row"
              >
                <div
                  className="flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 7,
                    background: c.hex,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium leading-tight">{c.name}</div>
                  <div className="text-[10.5px] text-text-tertiary uppercase tracking-wide">
                    {c.role}
                  </div>
                </div>
                <span className="mono text-[11.5px] text-text-secondary">{c.hex}</span>
                <button
                  type="button"
                  onClick={() => {
                    copy(c.hex);
                    showToast(`Copied ${c.hex}`);
                  }}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-tertiary hover:bg-surface-secondary"
                  title="Copy hex"
                >
                  {copiedHex === c.hex ? <Check size={12} className="text-[var(--ok-fg)]" /> : <Copy size={12} />}
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Typography */}
        <Card title="Typography" subtitle="Heading, body, tabular.">
          <div className="space-y-2.5">
            {brand.fonts.map((f) => (
              <div
                key={f.slot}
                className="card-base p-3"
                style={{ background: f.slot === "tabular" ? "var(--bg-page)" : "#FFF" }}
              >
                <div className="uplabel mb-1" style={{ fontSize: 9.5 }}>
                  {f.slot} · {f.family}
                </div>
                <div
                  className={f.slot === "tabular" ? "mono tabular" : ""}
                  style={{
                    fontSize: f.slot === "heading" ? 18 : 13.5,
                    fontWeight: f.slot === "heading" ? 600 : 400,
                    letterSpacing: f.slot === "heading" ? "-0.01em" : undefined,
                    lineHeight: 1.4,
                  }}
                >
                  {f.sample}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Compliance */}
        <Card
          title="Compliance"
          subtitle="RERA, photography, claims — non-negotiable."
          icon={Shield}
        >
          <SectionLabel>RERA disclaimer · always show</SectionLabel>
          <div
            className="mono text-[11px] text-text-secondary leading-[1.55] mt-1 mb-4"
            style={{
              background: "var(--err-bg)",
              color: "var(--err-fg)",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #FECACA",
            }}
          >
            {brand.compliance.reraDisclaimer}
          </div>
          <SectionLabel>Hard rules</SectionLabel>
          <ul className="space-y-1.5 mt-1">
            {brand.compliance.rules.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2 text-[12px] leading-[1.45]"
              >
                <Check size={12} className="text-[var(--ok-fg)] flex-shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Logos */}
      <Card
        title="Logo variants"
        subtitle={`${brand.logos.length} variants · min size 24px · safe area 12px`}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
          >
            <Upload size={11} /> Upload variant
          </button>
        }
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {brand.logos.map((logo) => (
            <div key={logo.id} className="card-base overflow-hidden">
              <div
                className="flex items-center justify-center"
                style={{
                  background: logo.variant === "g-mark" && logo.label.includes("Inverted") ? "#0A0A0A" : "var(--bg-page)",
                  height: 110,
                }}
              >
                <BrandLogoTile logo={logo} size={68} />
              </div>
              <div className="px-3 py-2 border-t border-border-subtle">
                <div className="text-[11.5px] font-medium truncate">{logo.label}</div>
                <div className="text-[10.5px] text-text-tertiary truncate">{logo.hint}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Reference ads */}
      <Card
        title="Reference ads"
        subtitle="What good looks like — Spot uses these when drafting creatives."
        icon={ImageIcon}
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px]"
          >
            <Upload size={11} /> Upload reference
          </button>
        }
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {brand.referenceAds.map((ad) => (
            <div key={ad.id} className="card-base overflow-hidden hover-row">
              <div
                style={{
                  aspectRatio: ad.format.replace(":", " / "),
                  background: `repeating-linear-gradient(135deg, oklch(0.9 0.05 ${ad.hue}) 0 6px, oklch(0.82 0.06 ${(ad.hue + 30) % 360}) 6px 12px)`,
                  position: "relative",
                }}
              >
                <span
                  className="pill"
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: "rgba(255,255,255,0.85)",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {ad.format}
                </span>
              </div>
              <div className="px-3 py-2 border-t border-border-subtle">
                <div className="text-[11.5px] truncate">{ad.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Inheritance footer */}
      <div className="spot-reply p-4 flex items-start gap-3 mt-4">
        <SpotMark size={18} />
        <div className="flex-1">
          <div className="uplabel mb-0.5">Inheritance</div>
          <div className="text-[13px] leading-[1.55]">
            Every project inherits this brand. Any project can override a token — overrides
            are flagged in their sidebar. <strong>Compliance rules in red are non-negotiable</strong>
            and can&apos;t be overridden.
          </div>
        </div>
        <button
          type="button"
          onClick={() => askSpot("Show me which projects have overridden the brand.", { kind: "workspace", label: "Brand" })}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] flex-shrink-0"
        >
          See overrides
        </button>
      </div>
    </motion.div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  icon: Icon,
  actions,
  onAsk,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: typeof Sparkles;
  actions?: React.ReactNode;
  onAsk?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card-base p-4 mb-3 last:mb-0">
      <div className="flex items-start gap-3 mb-3">
        {Icon && (
          <div className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-surface-secondary flex-shrink-0">
            <Icon size={13} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold leading-tight">{title}</div>
          {subtitle && (
            <div className="text-[11.5px] text-text-tertiary mt-0.5">{subtitle}</div>
          )}
        </div>
        {actions}
        {onAsk && (
          <button
            type="button"
            onClick={onAsk}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-button border border-border bg-white text-[11.5px] text-text-secondary"
          >
            <SpotMark size={11} /> Refine
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="uplabel mb-1.5" style={{ fontSize: 10 }}>
      {children}
    </div>
  );
}

function BrandLogoTile({ logo, size = 64 }: { logo: BrandLogoVariant; size?: number }) {
  const isInverted = logo.label.toLowerCase().includes("inverted");
  const fg = isInverted ? "#FAFAF8" : "#0A0A0A";
  const bg = isInverted ? "#0A0A0A" : "#FAFAF8";
  if (logo.variant === "g-mark") {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.22),
          background: bg,
          color: fg,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.5),
          fontWeight: 700,
          letterSpacing: "-0.04em",
          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)",
          fontFamily: "Geist, Inter, sans-serif",
        }}
      >
        G
      </div>
    );
  }
  if (logo.variant === "stacked") {
    return (
      <div
        style={{
          background: bg,
          color: fg,
          padding: "6px 10px",
          borderRadius: 6,
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          fontFamily: "Geist, Inter, sans-serif",
          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)",
        }}
      >
        <span style={{ fontSize: Math.round(size * 0.32), fontWeight: 700, letterSpacing: "-0.04em" }}>G</span>
        <span style={{ fontSize: Math.round(size * 0.11), letterSpacing: "0.18em", fontWeight: 600 }}>
          GODREJ
        </span>
      </div>
    );
  }
  // wordmark
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: "10px 14px",
        borderRadius: 6,
        fontSize: Math.round(size * 0.22),
        fontWeight: 700,
        letterSpacing: "0.16em",
        fontFamily: "Geist, Inter, sans-serif",
        boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)",
      }}
    >
      GODREJ
    </div>
  );
}
