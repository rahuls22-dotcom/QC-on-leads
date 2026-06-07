"use client";

// Enrichment composer, single shape.
// Top: Bulk/Single tabs + Professional/Financial checkboxes.
// Bulk body: pre-drop = "Fields needed" card + drop zone. Post-drop = file pill + mapping table.
// Single body: 60/40 split, adaptive inputs on the left, result panel on the right.
// Footer: Spot tip area + cost + submit.

import { useEffect, useState } from "react";
import {
  useComposerState,
  TabSwitcher,
  TypeCheckboxes,
  TypeCostInfo,
  FieldsNeededCard,
  SingleInputsAdaptive,
  FileCard,
  DropZone,
  SubmitButton,
  submitLabelBulk,
  submitLabelSingle,
} from "./composer-shared";
import { MappingTable } from "./mapping-table";
import { computeSpot, staticInstruction, SPOT_NAME_NOTE } from "./spot";
import { TipCallout } from "@/components/project/shared/spot-callout";
import { LeadProfileCard } from "@/components/lead/lead-profile-card";
import { AlertTriangle } from "lucide-react";
import { IllustrationEnrichment, IllustrationSearchEmpty } from "@/components/illustrations/empty-states";

export function EnrichmentComposer({ mode }: { mode?: "bulk" | "single" } = {}) {
  const state = useComposerState(mode ?? "bulk");
  const { tab } = state;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {/* Top strip */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {!mode && <TabSwitcher tab={tab} setTab={state.setTab} />}
            {!mode && <div className="w-px h-5 bg-border-subtle" />}
            <TypeCheckboxes types={state.types} toggle={state.toggleType} />
          </div>
          <TypeCostInfo types={state.types} />
        </div>

        {/* Body */}
        {tab === "bulk" ? <BulkBody state={state} /> : <SingleBody state={state} />}

        {/* Footer, only Bulk shows the global footer (after a file is dropped).
            Single mode owns its own actions inside the left column. */}
        {tab === "bulk" && state.file && <Footer state={state} />}
      </div>
    </div>
  );
}

// ── Bulk body ──────────────────────────────────────────────────────

function BulkBody({ state }: { state: ReturnType<typeof useComposerState> }) {
  if (!state.file) {
    return (
      <div className="grid grid-cols-[260px_1fr] gap-4 px-5 py-5">
        <FieldsNeededCard hasPro={state.hasPro} hasFin={state.hasFin} />
        <DropZone
          fileInputRef={state.fileInputRef}
          onChosen={state.onFileChosen}
          hasPro={state.hasPro}
          hasFin={state.hasFin}
          sampleHref={state.sampleHref}
          sampleName={state.sampleName}
        />
      </div>
    );
  }

  return (
    <div className="px-5 py-5 space-y-4">
      <FileCard file={state.file} rowCount={state.rowCount} onClear={state.resetBulk} />
      {state.headers.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12.5px] font-semibold text-text-primary">Pick matching columns</div>
              <div className="text-[11.5px] text-text-tertiary mt-0.5">
                We auto-mapped what we recognised. Adjust the dropdown above any column to remap.
              </div>
            </div>
          </div>
          <MappingTable
            headers={state.headers}
            preview={state.preview}
            columnMap={state.columnMap}
            setColumnMap={state.setColumnMap}
            needName={state.hasFin}
            needPro={state.hasPro}
          />
        </div>
      ) : (
        <div className="text-[12px] text-text-tertiary px-3 py-2 bg-surface-page rounded-card">
          Couldn&apos;t read column headers from this file. Try a CSV with a header row.
        </div>
      )}
    </div>
  );
}

// ── Single body ────────────────────────────────────────────────────
// Left column: top tip → inputs → (push down) spot tip → actions row.
// Right column: result panel. No global footer in Single mode.

function SingleBody({ state }: { state: ReturnType<typeof useComposerState> }) {
  const spot = state.singleReady
    ? computeSpot({ types: state.types, available: state.singleAvailable })
    : null;

  const topInstruction = !state.singleReady ? staticInstruction(state.types) : null;

  return (
    <div className="grid grid-cols-2 divide-x divide-border-subtle">
      {/* Left: inputs + actions */}
      <div className="px-5 pt-5 pb-4 flex flex-col min-h-[440px]">
        {/* Instruction line, sits above inputs so the ask is visible before fields */}
        {topInstruction && (
          <p className="text-[12px] text-text-secondary mb-3">{topInstruction}</p>
        )}

        {/* Inputs */}
        <SingleInputsAdaptive
          hasPro={state.hasPro}
          hasFin={state.hasFin}
          email={state.singleEmail} setEmail={state.setSingleEmail}
          phone={state.singlePhone} setPhone={state.setSinglePhone}
          linkedin={state.singleLinkedin} setLinkedin={state.setSingleLinkedin}
          name={state.singleName} setName={state.setSingleName}
        />

        {/* Push the actions block to the bottom of the column */}
        <div className="mt-auto pt-4 space-y-3">
          {spot && (
            <TipCallout
              body={[spot.primary, spot.nameNote ? SPOT_NAME_NOTE : null]
                .filter(Boolean)
                .join("\n\n")}
            />
          )}
          <SingleActionsRow state={state} />
        </div>
      </div>

      {/* Right: result */}
      <div className="px-5 py-5">
        <ResultPanel state={state} />
      </div>
    </div>
  );
}

function SingleActionsRow({ state }: { state: ReturnType<typeof useComposerState> }) {
  const cost = state.singleCost;
  const insufficient = state.insufficientForSingle;
  const ready = state.singleReady;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {insufficient ? (
          <div className="flex items-start gap-1.5 text-[12px] text-[#DC2626]">
            <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <span>Not enough credits. Top up to continue.</span>
          </div>
        ) : ready ? (
          <span className="text-[12px] text-text-secondary tabular-nums">
            ≈ {cost} credit{cost === 1 ? "" : "s"} per lead
          </span>
        ) : null}
      </div>
      <SubmitButton
        label={submitLabelSingle(state)}
        disabled={!state.singleReady || state.insufficientForSingle}
        loading={state.isEnriching}
        onClick={state.submitSingle}
      />
    </div>
  );
}

function ResultPanel({ state }: { state: ReturnType<typeof useComposerState> }) {
  const failed =
    state.inlineResult &&
    (!state.inlineResult.profile || Object.keys(state.inlineResult.profile).length === 0);

  return (
    <div className="h-[400px] overflow-y-auto">
      {state.isEnriching ? (
        <EnrichingSkeleton types={state.types} />
      ) : failed ? (
        <FailedState />
      ) : state.inlineResult && state.inlineResult.profile ? (
        <LeadProfileCard
          profile={state.inlineResult.profile}
          variant="inline"
          onExpand={() => {
            // Page-level RunDrawer listens for this and opens with the matched run.
            const run = state.inlineResult;
            if (!run) return;
            window.dispatchEvent(new CustomEvent("enrichment-crm:open-run", { detail: { runId: run.id } }));
          }}
        />
      ) : (
        <EmptyResultState />
      )}
    </div>
  );
}

function EmptyResultState() {
  return (
    <div className="h-full border-2 border-dashed border-border rounded-card flex flex-col items-center justify-center text-center px-6 bg-surface-page">
      <div className="opacity-90 mb-2">
        <IllustrationEnrichment />
      </div>
      <div className="text-[13px] font-semibold text-text-primary">Result appears here</div>
      <div className="text-[12px] text-text-tertiary leading-[1.5] mt-1 max-w-[240px]">
        Fill the fields on the left and hit Enrich. The matched profile shows up here.
      </div>
    </div>
  );
}

function FailedState() {
  return (
    <div className="h-full border-2 border-dashed border-border rounded-card flex flex-col items-center justify-center text-center px-6 bg-surface-page">
      <div className="opacity-90 mb-2">
        <IllustrationSearchEmpty />
      </div>
      <div className="text-[13px] font-semibold text-text-primary">No match found</div>
      <div className="text-[12px] text-text-tertiary leading-[1.5] mt-1 max-w-[240px]">
        We couldn&apos;t find this lead across our sources. You were not charged.
      </div>
    </div>
  );
}

// Stepped progress while a single enrichment is "running", feels like real work.
function EnrichingSkeleton({ types }: { types: ReturnType<typeof useComposerState>["types"] }) {
  const hasPro = types.includes("professional");
  const hasFin = types.includes("financial");
  const steps = [
    "Looking up the lead",
    hasPro ? "Pulling professional data" : null,
    hasFin ? "Verifying financial profile" : null,
    "Stitching the result",
  ].filter(Boolean) as string[];

  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    const tick = Math.max(380, Math.floor(1800 / steps.length));
    const id = window.setInterval(() => {
      setActiveIdx((i) => Math.min(i + 1, steps.length - 1));
    }, tick);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className="h-full border border-border-subtle rounded-card bg-white p-4 flex flex-col">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-surface-page animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 bg-surface-page rounded animate-pulse" />
          <div className="h-2.5 w-44 bg-surface-page rounded animate-pulse" />
        </div>
      </div>
      {/* Field placeholders */}
      <div className="space-y-2 mb-5">
        <div className="h-2.5 w-full bg-surface-page rounded animate-pulse" />
        <div className="h-2.5 w-4/5 bg-surface-page rounded animate-pulse" />
        <div className="h-2.5 w-3/5 bg-surface-page rounded animate-pulse" />
      </div>
      {/* Live step list */}
      <div className="mt-auto space-y-1.5">
        {steps.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s} className="flex items-center gap-2 text-[11.5px]">
              {done ? (
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-emerald-600">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : active ? (
                <svg className="animate-spin text-text-primary" width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <span className="w-[11px] h-[11px] rounded-full border border-border-subtle" />
              )}
              <span className={done ? "text-text-secondary" : active ? "text-text-primary font-medium" : "text-text-tertiary"}>
                {s}
                {active ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────

function Footer({ state }: { state: ReturnType<typeof useComposerState> }) {
  const isBulk = state.tab === "bulk";
  const available = isBulk ? state.bulkAvailable : state.singleAvailable;
  const ready = isBulk ? state.bulkReady : state.singleReady;
  const insufficient = isBulk ? state.insufficientForBulk : state.insufficientForSingle;
  const cost = isBulk ? state.bulkCost : state.singleCost;

  // Spot speaks only when required fields are met; otherwise static instruction renders.
  const spot = ready ? computeSpot({ types: state.types, available }) : null;
  const instruction = !ready ? staticInstruction(state.types) : null;

  // Special case: bulk pre-drop → no instruction, no spot
  const preDrop = isBulk && !state.file;

  return (
    <div className="border-t border-border-subtle">
      {/* Tip / instruction area */}
      {!preDrop && (spot || instruction) && (
        <div className="px-5 pt-4 pb-1">
          {spot ? (
            <TipCallout
              body={[spot.primary, spot.nameNote ? SPOT_NAME_NOTE : null]
                .filter(Boolean)
                .join("\n\n")}
            />
          ) : (
            <div className="text-[12px] text-text-secondary">{instruction}</div>
          )}
        </div>
      )}

      {/* Submit row */}
      <div className="px-5 py-3 flex items-center gap-3 bg-surface-page/40">
        <div className="flex-1 min-w-0">
          {insufficient ? (
            <div className="flex items-start gap-1.5 text-[12px] text-[#DC2626]">
              <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              <span>Not enough credits. Top up to continue.</span>
            </div>
          ) : ready ? (
            <span className="text-[12px] text-text-secondary tabular-nums">
              {isBulk ? (
                <>
                  ≈ {cost.toLocaleString("en-IN")} credits
                  <span className="text-text-tertiary">
                    {" "}({state.rowCount.toLocaleString("en-IN")} rows × {state.perLead})
                  </span>
                </>
              ) : (
                <>≈ {cost} credit{cost === 1 ? "" : "s"} per lead</>
              )}
            </span>
          ) : (
            <span className="text-[12px] text-text-tertiary">
              {isBulk && !state.file ? "Drop a file to see the cost" : ""}
            </span>
          )}
        </div>
        <SubmitButton
          label={isBulk ? submitLabelBulk(state) : submitLabelSingle(state)}
          disabled={isBulk ? !state.bulkReady || state.insufficientForBulk : !state.singleReady || state.insufficientForSingle}
          loading={isBulk ? state.isQueuing : state.isEnriching}
          onClick={isBulk ? state.submitBulk : state.submitSingle}
        />
      </div>
    </div>
  );
}
