"use client";

// Mapping table, required-fields-first view.
// One row per field we need (Name/Phone/Email/LinkedIn/Lead Id).
// Each row shows which CSV column we auto-mapped to it, sample values, and
// status. User can change the source column from a dropdown of file headers.
// Unused CSV columns are tucked into a collapsed footer so they don't add noise.

import { useState } from "react";
import { ChevronDown, Check, AlertCircle } from "lucide-react";
import type { RequiredField } from "@/lib/enrichment-crm-data";

export type MapTarget = "custom" | "leadId" | RequiredField;
export type ColumnMap = Record<string, MapTarget>;

const TARGET_LABELS: Record<Exclude<MapTarget, "custom">, string> = {
  leadId: "Lead Id",
  name: "Name",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
};

interface TargetRow {
  target: Exclude<MapTarget, "custom">;
  required: boolean;
}

// Build the list of target rows to show, based on enrichment type selection.
function targetRows(needName: boolean, needPro: boolean): TargetRow[] {
  const out: TargetRow[] = [];
  if (needName) out.push({ target: "name", required: true });
  if (needPro) {
    out.push({ target: "email", required: true });
    out.push({ target: "phone", required: true });
    out.push({ target: "linkedin", required: true });
  } else {
    out.push({ target: "phone", required: true });
  }
  out.push({ target: "leadId", required: false });
  return out;
}

export function MappingTable({
  headers,
  preview,
  columnMap,
  setColumnMap,
  needName,
  needPro,
}: {
  headers: string[];
  preview: string[][];
  columnMap: ColumnMap;
  setColumnMap: (m: ColumnMap) => void;
  needName: boolean;
  needPro: boolean;
}) {
  const rows = targetRows(needName, needPro);

  // Inverse map: target → which CSV header currently maps to it (if any)
  const headerByTarget: Partial<Record<Exclude<MapTarget, "custom">, string>> = {};
  for (const h of headers) {
    const t = columnMap[h];
    if (t && t !== "custom") headerByTarget[t] = h;
  }

  // Headers already used by another target (used to disable in pickers)
  const usedHeaders = new Set(Object.values(headerByTarget).filter(Boolean) as string[]);

  // Headers not mapped to any target → shown in collapsed footer
  const unusedHeaders = headers.filter(
    (h) => !columnMap[h] || columnMap[h] === "custom",
  );

  const onPick = (target: Exclude<MapTarget, "custom">, header: string) => {
    const next: ColumnMap = { ...columnMap };
    // Clear the header currently mapped to this target (if any)
    for (const h of headers) {
      if (next[h] === target) next[h] = "custom";
    }
    // Empty string = "Not in file" → leave target unmapped
    if (header) next[header] = target;
    setColumnMap(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-[13px] font-semibold text-text-primary">
          Map your file to enrichment fields
        </h4>
        <p className="text-[12px] text-text-tertiary mt-0.5">
          We auto-detected these from your headers. Change any row to remap.
        </p>
      </div>

      <div className="border border-border rounded-card overflow-hidden bg-white">
        <table className="w-full text-[12px]">
          <thead className="bg-surface-page/60">
            <tr className="text-[10.5px] uppercase tracking-[0.4px] text-text-tertiary">
              <th className="text-left px-4 py-2 font-medium w-[180px]">Field we need</th>
              <th className="text-left px-4 py-2 font-medium w-[260px]">Column in your file</th>
              <th className="text-left px-4 py-2 font-medium">Sample values</th>
              <th className="text-right px-4 py-2 font-medium w-[100px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ target, required }) => {
              const mapped = headerByTarget[target];
              const samples = mapped ? sampleValues(preview, headers, mapped) : [];
              return (
                <tr key={target} className="border-t border-border-subtle">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-text-primary">
                        {TARGET_LABELS[target]}
                      </span>
                      {required ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-[#FEF2F2] text-[#DC2626]">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
                          Recommended
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <HeaderPicker
                      headers={headers}
                      value={mapped ?? ""}
                      usedHeaders={usedHeaders}
                      onPick={(h) => onPick(target, h)}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-[12px] text-text-secondary truncate max-w-[320px]">
                    {samples.length === 0 ? (
                      <span className="text-text-tertiary italic">No sample</span>
                    ) : (
                      <span title={samples.join(" • ")}>{samples.join("  •  ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {mapped ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#15803D]">
                        <Check size={12} strokeWidth={2.5} />
                        Mapped
                      </span>
                    ) : required ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#DC2626]">
                        <AlertCircle size={12} strokeWidth={2} />
                        Missing
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-tertiary">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {unusedHeaders.length > 0 && (
        <UnusedColumns
          unusedHeaders={unusedHeaders}
          allHeaders={headers}
          preview={preview}
        />
      )}
    </div>
  );
}

function HeaderPicker({
  headers,
  value,
  usedHeaders,
  onPick,
}: {
  headers: string[];
  value: string;
  usedHeaders: Set<string>;
  onPick: (header: string) => void;
}) {
  const isMapped = value !== "";
  return (
    <div className="relative inline-block w-full max-w-[240px]">
      <select
        value={value}
        onChange={(e) => onPick(e.target.value)}
        className={`appearance-none w-full pr-7 pl-2.5 py-1.5 text-[12px] font-medium rounded-button border bg-white focus:outline-none cursor-pointer transition-colors ${
          isMapped
            ? "border-text-primary text-text-primary"
            : "border-border text-text-secondary hover:border-border-hover"
        }`}
      >
        <option value="">Not in file</option>
        {headers.map((h) => {
          const isUsedElsewhere = usedHeaders.has(h) && h !== value;
          return (
            <option key={h} value={h} disabled={isUsedElsewhere}>
              {h}
              {isUsedElsewhere ? " (already used)" : ""}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={12}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
      />
    </div>
  );
}

function UnusedColumns({
  unusedHeaders,
  allHeaders,
  preview,
}: {
  unusedHeaders: string[];
  allHeaders: string[];
  preview: string[][];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-subtle rounded-card bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-text-secondary hover:bg-surface-page/50 transition-colors"
      >
        <span>
          <span className="font-medium text-text-primary">
            {unusedHeaders.length}
          </span>{" "}
          other column{unusedHeaders.length === 1 ? "" : "s"} in your file won&apos;t be sent
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border-subtle px-4 py-3 space-y-1.5">
          {unusedHeaders.map((h) => {
            const samples = sampleValues(preview, allHeaders, h);
            return (
              <div key={h} className="flex items-baseline gap-3 text-[11.5px]">
                <span className="font-medium text-text-secondary min-w-[140px] truncate">
                  {h}
                </span>
                <span className="text-text-tertiary truncate">
                  {samples.join(" • ") || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function sampleValues(
  preview: string[][],
  headers: string[],
  header: string,
): string[] {
  const idx = headers.indexOf(header);
  if (idx < 0) return [];
  return preview
    .slice(0, 3)
    .map((row) => (row[idx] ?? "").trim())
    .filter((v) => v.length > 0);
}

// Builds an initial ColumnMap by auto-detecting common header names.
export function autoBuildColumnMap(headers: string[]): ColumnMap {
  const out: ColumnMap = {};
  const taken = new Set<MapTarget>();
  const try_ = (header: string, candidates: MapTarget[]) => {
    for (const c of candidates) {
      if (!taken.has(c)) {
        out[header] = c;
        taken.add(c);
        return;
      }
    }
  };
  for (const h of headers) {
    const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (out[h]) continue;
    if (/email|mail/.test(norm)) try_(h, ["email"]);
    else if (/linkedin|liurl|profileurl/.test(norm)) try_(h, ["linkedin"]);
    else if (/phone|mobile|contact|tel/.test(norm)) try_(h, ["phone"]);
    else if (/^name$|fullname|leadname|firstname|lastname|givenname|surname/.test(norm)) try_(h, ["name"]);
    else if (/leadid|^id$|recordid/.test(norm)) try_(h, ["leadId"]);
    if (!out[h]) out[h] = "custom";
  }
  return out;
}

// Convert ColumnMap to a Set of mapped required fields (for spot/required checks).
export function mappedFields(columnMap: ColumnMap): Set<RequiredField> {
  const s = new Set<RequiredField>();
  for (const t of Object.values(columnMap)) {
    if (t === "name" || t === "phone" || t === "email" || t === "linkedin") {
      s.add(t);
    }
  }
  return s;
}
