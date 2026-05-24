"use client";

import { useMemo, useRef, useState } from "react";
import { Layers, Images, Upload, X, Check } from "lucide-react";
import type { ProjectDetail, ProjectImage } from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { CreativesSection } from "./creatives-section";

type SubTab = "creatives" | "images";

/**
 * Library tab — single home for the project's visual assets.
 *  · Creatives: every drafted creative across personas/angles (wraps the
 *    existing CreativesSection unchanged for PR 1).
 *  · Images: the project's image memory — extracted from research +
 *    laptop uploads — with kind/source filters and an upload tile.
 */
export function LibrarySection({
  project,
  onAsk,
  onGenerateCreatives,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
  onGenerateCreatives?: () => void;
}) {
  const [sub, setSub] = useState<SubTab>("creatives");

  const creativeCount = project.personas.reduce(
    (n, p) => n + p.angles.reduce((m, a) => m + a.concept.creatives.length, 0),
    0,
  );
  const imageCount = project.images.length;

  return (
    <div>
      {/* Segmented control — Creatives | Images */}
      <div className="flex items-center gap-1 mb-4 pt-6">
        <SubTabButton
          active={sub === "creatives"}
          onClick={() => setSub("creatives")}
          icon={<Layers size={13} />}
          label="Creatives"
          count={creativeCount}
        />
        <SubTabButton
          active={sub === "images"}
          onClick={() => setSub("images")}
          icon={<Images size={13} />}
          label="Images"
          count={imageCount}
        />
      </div>

      {sub === "creatives" ? (
        <CreativesSection
          project={project}
          onAsk={onAsk}
          onGenerateCreatives={onGenerateCreatives}
        />
      ) : (
        <ImageBrowser project={project} onAsk={onAsk} />
      )}
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-button transition-colors"
      style={{
        background: active ? "#1A1A1A" : "#FFF",
        color: active ? "#FFF" : "var(--text-2)",
        border: `1px solid ${active ? "#1A1A1A" : "var(--border)"}`,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
      }}
    >
      {icon}
      {label}
      <span
        className="tabular-nums"
        style={{
          fontSize: 10.5,
          color: active ? "rgba(255,255,255,0.7)" : "var(--text-tertiary)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Image browser ────────────────────────────────────────────────────

type KindFilter = "all" | ProjectImage["kind"];
type SourceFilter = "all" | "extracted" | "uploaded";

const KIND_OPTIONS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All kinds" },
  { key: "exterior", label: "Exterior" },
  { key: "interior", label: "Interior" },
  { key: "amenity", label: "Amenity" },
  { key: "floorplan", label: "Floorplan" },
  { key: "location", label: "Location" },
];

const KIND_BADGE: Record<ProjectImage["kind"], { bg: string; fg: string }> = {
  exterior: { bg: "#FEF3C7", fg: "#92400E" },
  interior: { bg: "#DBEAFE", fg: "#1E40AF" },
  amenity: { bg: "#DCFCE7", fg: "#15803D" },
  floorplan: { bg: "#FCE7F3", fg: "#9D174D" },
  location: { bg: "#E0E7FF", fg: "#3730A3" },
};

function ImageBrowser({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // The persisted ProjectImage shape doesn't store a `source` field yet —
  // tags say "from web" / "from upload". Until the schema migrates, infer
  // source from those tags.
  const sourceOf = (img: ProjectImage): "extracted" | "uploaded" =>
    img.tags.some((t) => t.toLowerCase().includes("upload")) ? "uploaded" : "extracted";

  const filtered = useMemo(
    () =>
      project.images.filter((img) => {
        if (kindFilter !== "all" && img.kind !== kindFilter) return false;
        if (sourceFilter !== "all" && sourceOf(img) !== sourceFilter) return false;
        return true;
      }),
    [project.images, kindFilter, sourceFilter],
  );

  const selected = filtered.find((i) => i.id === selectedId) || null;

  const handleUpload = (files: FileList | null) => {
    if (!files || !files.length) return;
    mutateRuntimeProject(project.id, (p) => {
      Array.from(files).forEach((f) => {
        p.images.push({
          id: `img-${Date.now()}-${f.name}`,
          kind: "exterior",
          name: f.name,
          hue: Math.floor(Math.random() * 360),
          tags: ["from upload"],
          usedIn: 0,
        });
      });
    });
  };

  return (
    <div>
      <SectionHeader
        icon={Images}
        title="Images"
        subtitle={`${project.images.length} image${project.images.length === 1 ? "" : "s"} in Spot's visual memory · used as creative source material`}
        onAsk={() => onAsk("Which images should I prioritize for the next set of creatives?")}
        actions={
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-button text-[11.5px] font-medium"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
              color: "#FFF",
            }}
          >
            <Upload size={11} /> Upload images
          </button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          handleUpload(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />

      {/* Filter bar */}
      <div className="card-base p-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterGroup label="Kind">
          {KIND_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.key}
              active={kindFilter === opt.key}
              onClick={() => setKindFilter(opt.key)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </FilterGroup>
        <span style={{ height: 18, width: 1, background: "var(--border-subtle)" }} />
        <FilterGroup label="Source">
          {(["all", "extracted", "uploaded"] as SourceFilter[]).map((s) => (
            <FilterChip
              key={s}
              active={sourceFilter === s}
              onClick={() => setSourceFilter(s)}
            >
              {s === "all" ? "Both" : s === "extracted" ? "From web" : "From upload"}
            </FilterChip>
          ))}
        </FilterGroup>
      </div>

      {filtered.length === 0 ? (
        <div
          className="card-base p-10 text-center text-[12.5px] text-text-tertiary"
          style={{ background: "var(--bg-page)" }}
        >
          No images match these filters. Try clearing them, or upload your own.
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Grid */}
          <div className="flex-1 min-w-0">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))" }}
            >
              {filtered.map((img) => (
                <ImageTile
                  key={img.id}
                  img={img}
                  source={sourceOf(img)}
                  active={img.id === selectedId}
                  onSelect={() => setSelectedId(img.id === selectedId ? null : img.id)}
                />
              ))}
            </div>
          </div>

          {/* Side panel */}
          {selected && (
            <ImageDetailPanel
              img={selected}
              source={sourceOf(selected)}
              onClose={() => setSelectedId(null)}
              onRemove={() => {
                mutateRuntimeProject(project.id, (p) => {
                  p.images = p.images.filter((i) => i.id !== selected.id);
                });
                setSelectedId(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ImageTile({
  img,
  source,
  active,
  onSelect,
}: {
  img: ProjectImage;
  source: "extracted" | "uploaded";
  active: boolean;
  onSelect: () => void;
}) {
  const badge = KIND_BADGE[img.kind];
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left rounded-[10px] overflow-hidden transition-shadow"
      style={{
        background: "#FFF",
        border: `1.5px solid ${active ? "#1A1A1A" : "var(--border)"}`,
        boxShadow: active ? "0 6px 18px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div
        style={{
          height: 112,
          background: `repeating-linear-gradient(135deg, oklch(0.92 0.06 ${img.hue}) 0px, oklch(0.92 0.06 ${img.hue}) 6px, oklch(0.88 0.08 ${img.hue}) 6px, oklch(0.88 0.08 ${img.hue}) 12px)`,
          position: "relative",
        }}
      >
        <span
          className="absolute top-2 left-2 inline-flex items-center"
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            background: badge.bg,
            color: badge.fg,
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: "0.3px",
            textTransform: "uppercase",
          }}
        >
          {img.kind}
        </span>
        {active && (
          <span
            className="absolute top-2 right-2 inline-flex items-center justify-center"
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: "#1A1A1A",
              color: "#FFF",
            }}
          >
            <Check size={11} />
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="text-[12px] font-medium leading-tight truncate">{img.name}</div>
        <div className="text-[10px] text-text-tertiary mt-0.5 flex items-center gap-1">
          <span>{source === "extracted" ? "from web" : "from upload"}</span>
          {img.usedIn > 0 && (
            <>
              <span>·</span>
              <span>
                used in {img.usedIn} creative{img.usedIn === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function ImageDetailPanel({
  img,
  source,
  onClose,
  onRemove,
}: {
  img: ProjectImage;
  source: "extracted" | "uploaded";
  onClose: () => void;
  onRemove: () => void;
}) {
  const badge = KIND_BADGE[img.kind];
  return (
    <div
      className="flex-shrink-0 card-base p-4 fadeUp"
      style={{ width: 280 }}
    >
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1">
          <div className="text-[13.5px] font-semibold leading-tight">{img.name}</div>
          <div className="text-[11px] text-text-tertiary mt-0.5">
            {source === "extracted" ? "Extracted from web research" : "Uploaded from laptop"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center h-7 w-7 rounded-button text-text-tertiary hover:bg-surface-secondary hover:text-text-secondary"
        >
          <X size={13} />
        </button>
      </div>

      <div
        style={{
          height: 160,
          borderRadius: 10,
          background: `repeating-linear-gradient(135deg, oklch(0.92 0.06 ${img.hue}) 0px, oklch(0.92 0.06 ${img.hue}) 6px, oklch(0.88 0.08 ${img.hue}) 6px, oklch(0.88 0.08 ${img.hue}) 12px)`,
          marginBottom: 12,
        }}
      />

      <div className="space-y-2 text-[11.5px]">
        <Detail label="Kind">
          <span
            className="inline-flex items-center"
            style={{
              padding: "2px 7px",
              borderRadius: 4,
              background: badge.bg,
              color: badge.fg,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.3px",
              textTransform: "uppercase",
            }}
          >
            {img.kind}
          </span>
        </Detail>
        <Detail label="Used in">
          {img.usedIn} creative{img.usedIn === 1 ? "" : "s"}
        </Detail>
        {img.tags.length > 0 && (
          <Detail label="Tags">
            <span className="flex flex-wrap gap-1">
              {img.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface-secondary text-text-secondary"
                >
                  {t}
                </span>
              ))}
            </span>
          </Detail>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
        <button
          type="button"
          onClick={onRemove}
          className="text-[11.5px] text-text-tertiary hover:text-text-secondary"
        >
          Remove from library
        </button>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="uplabel flex-shrink-0"
        style={{ fontSize: 9.5, width: 64 }}
      >
        {label}
      </span>
      <span className="flex-1 text-text-secondary">{children}</span>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="uplabel" style={{ fontSize: 9.5 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center h-6 px-2 rounded-button text-[11px] transition-colors"
      style={{
        background: active ? "#1A1A1A" : "#FFF",
        color: active ? "#FFF" : "var(--text-2)",
        border: `1px solid ${active ? "#1A1A1A" : "var(--border)"}`,
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}
