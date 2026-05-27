import type { StagedChange, MediaPlan } from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";

/**
 * Helpers for the Campaigns staging buffer. The editor calls these
 * instead of directly mutating MediaRow/MediaAdSet fields — that way
 * edits accumulate until the user clicks Deploy.
 */

let counter = 0;
function nextChangeId(): string {
  counter += 1;
  return `chg-${Date.now().toString(36)}-${counter}`;
}

/**
 * Stage a campaign-level edit. If a matching staged edit (same campaign
 * + field) already exists, it's *replaced* with the new value so we
 * don't accumulate stale duplicates as the user keeps typing.
 *
 * If the new value matches the live value, any existing staged edit
 * for that field is removed (so we don't show "pending" for what's
 * effectively a no-op).
 */
export function stageCampaignEdit(
  projectId: string,
  campaignId: string,
  field: "name" | "budgetDaily",
  newValue: string | number,
): void {
  mutateRuntimeProject(projectId, (p) => {
    const plan = p.mediaPlan;
    const row = plan.rows.find((r) => r.id === campaignId);
    if (!row) return;
    if (!plan.stagedChanges) plan.stagedChanges = [];

    // MediaRow uses `campaign` for the human-readable name; map the
    // abstract "name" field through to it.
    const live: string | number =
      field === "name" ? row.campaign : row.budgetDaily;
    const existingIdx = plan.stagedChanges.findIndex(
      (c) =>
        c.scope === "campaign" && c.campaignId === campaignId && c.field === field,
    );

    if (newValue === live) {
      // Reverted to live — drop the staged change entirely.
      if (existingIdx >= 0) plan.stagedChanges.splice(existingIdx, 1);
      return;
    }

    const change: StagedChange = {
      id: existingIdx >= 0 ? plan.stagedChanges[existingIdx].id : nextChangeId(),
      stagedAt: new Date().toISOString(),
      scope: "campaign",
      campaignId,
      field,
      oldValue: live,
      newValue,
      label: labelForCampaign(field, row.campaign, live, newValue),
    };
    if (existingIdx >= 0) {
      plan.stagedChanges[existingIdx] = change;
    } else {
      plan.stagedChanges.push(change);
    }
  });
}

/** Stage an ad-set-level edit. Same dedup/no-op rules as campaign. */
export function stageAdSetEdit(
  projectId: string,
  campaignId: string,
  adSetId: string,
  field: "name" | "audience" | "budgetDaily",
  newValue: string | number,
): void {
  mutateRuntimeProject(projectId, (p) => {
    const plan = p.mediaPlan;
    const row = plan.rows.find((r) => r.id === campaignId);
    const set = row?.adSets.find((a) => a.id === adSetId);
    if (!row || !set) return;
    if (!plan.stagedChanges) plan.stagedChanges = [];

    const live = set[field];
    const existingIdx = plan.stagedChanges.findIndex(
      (c) =>
        c.scope === "adSet" &&
        c.campaignId === campaignId &&
        c.adSetId === adSetId &&
        c.field === field,
    );

    if (newValue === live) {
      if (existingIdx >= 0) plan.stagedChanges.splice(existingIdx, 1);
      return;
    }

    const change: StagedChange = {
      id: existingIdx >= 0 ? plan.stagedChanges[existingIdx].id : nextChangeId(),
      stagedAt: new Date().toISOString(),
      scope: "adSet",
      campaignId,
      adSetId,
      field,
      oldValue: live as string | number,
      newValue,
      label: labelForAdSet(field, set.name, row.campaign, live, newValue),
    };
    if (existingIdx >= 0) {
      plan.stagedChanges[existingIdx] = change;
    } else {
      plan.stagedChanges.push(change);
    }
  });
}

/** Stage an ad-level edit. Ad scope today covers name + status
 * (live / paused) — those are the two settings that make sense to
 * adjust from the project page without bouncing into Ads Manager. */
export function stageAdEdit(
  projectId: string,
  campaignId: string,
  adSetId: string,
  adId: string,
  field: "name" | "status",
  newValue: string,
): void {
  mutateRuntimeProject(projectId, (p) => {
    const plan = p.mediaPlan;
    const row = plan.rows.find((r) => r.id === campaignId);
    const set = row?.adSets.find((a) => a.id === adSetId);
    const ad = set?.ads.find((x) => x.id === adId);
    if (!row || !set || !ad) return;
    if (!plan.stagedChanges) plan.stagedChanges = [];

    const live = ad[field];
    const existingIdx = plan.stagedChanges.findIndex(
      (c) =>
        c.scope === "ad" &&
        c.campaignId === campaignId &&
        c.adSetId === adSetId &&
        c.adId === adId &&
        c.field === field,
    );

    if (newValue === live) {
      if (existingIdx >= 0) plan.stagedChanges.splice(existingIdx, 1);
      return;
    }

    const change: StagedChange = {
      id: existingIdx >= 0 ? plan.stagedChanges[existingIdx].id : nextChangeId(),
      stagedAt: new Date().toISOString(),
      scope: "ad",
      campaignId,
      adSetId,
      adId,
      field,
      oldValue: live as string,
      newValue,
      label: labelForAd(field, ad.name, set.name, live as string, newValue),
    };
    if (existingIdx >= 0) {
      plan.stagedChanges[existingIdx] = change;
    } else {
      plan.stagedChanges.push(change);
    }
  });
}

/** Deploy every staged change: copy newValue into the live entity field
 * and clear the buffer. Returns the count of changes that were applied. */
export function deployStagedChanges(projectId: string): number {
  let count = 0;
  mutateRuntimeProject(projectId, (p) => {
    const plan = p.mediaPlan;
    if (!plan.stagedChanges || plan.stagedChanges.length === 0) return;
    for (const change of plan.stagedChanges) {
      const row = plan.rows.find((r) => r.id === change.campaignId);
      if (!row) continue;
      if (change.scope === "campaign") {
        if (change.field === "name") {
          row.campaign = change.newValue as string;
        } else if (change.field === "budgetDaily") {
          row.budgetDaily = change.newValue as number;
        }
        count += 1;
      } else if (change.scope === "adSet") {
        const set = row.adSets.find((a) => a.id === change.adSetId);
        if (!set) continue;
        if (change.field === "name") set.name = change.newValue as string;
        else if (change.field === "audience")
          set.audience = change.newValue as string;
        else if (change.field === "budgetDaily")
          set.budgetDaily = change.newValue as number;
        count += 1;
      } else if (change.scope === "ad") {
        const set = row.adSets.find((a) => a.id === change.adSetId);
        const ad = set?.ads.find((x) => x.id === change.adId);
        if (!ad) continue;
        if (change.field === "name") ad.name = change.newValue;
        else if (change.field === "status")
          ad.status = change.newValue as "live" | "draft";
        count += 1;
      }
    }
    plan.stagedChanges = [];
  });
  return count;
}

/** Drop a single staged change without deploying it. */
export function discardStagedChange(projectId: string, changeId: string): void {
  mutateRuntimeProject(projectId, (p) => {
    if (!p.mediaPlan.stagedChanges) return;
    p.mediaPlan.stagedChanges = p.mediaPlan.stagedChanges.filter(
      (c) => c.id !== changeId,
    );
  });
}

/** Drop every staged change without deploying. */
export function discardAllStagedChanges(projectId: string): void {
  mutateRuntimeProject(projectId, (p) => {
    p.mediaPlan.stagedChanges = [];
  });
}

export function stagedChangeCount(plan: MediaPlan): number {
  return (plan.stagedChanges || []).length;
}

// ─── Label helpers ──────────────────────────────────────────────────────

function labelForCampaign(
  field: "name" | "budgetDaily",
  liveName: string,
  oldValue: string | number,
  newValue: string | number,
): string {
  if (field === "name") {
    return `Renamed "${oldValue}" → "${newValue}"`;
  }
  return `${liveName} · budget ₹${oldValue} → ₹${newValue}/day`;
}

function labelForAdSet(
  field: "name" | "audience" | "budgetDaily",
  liveName: string,
  campaignName: string,
  oldValue: string | number,
  newValue: string | number,
): string {
  if (field === "name") {
    return `${campaignName} · renamed "${oldValue}" → "${newValue}"`;
  }
  if (field === "audience") {
    return `${campaignName} · ${liveName} · audience → "${newValue}"`;
  }
  return `${campaignName} · ${liveName} · budget ₹${oldValue} → ₹${newValue}/day`;
}

function labelForAd(
  field: "name" | "status",
  liveName: string,
  adSetName: string,
  oldValue: string,
  newValue: string,
): string {
  if (field === "name") {
    return `${adSetName} · ad renamed "${oldValue}" → "${newValue}"`;
  }
  // status — describe the transition concisely.
  if (newValue === "draft") {
    return `${adSetName} · ${liveName} · paused (was ${oldValue})`;
  }
  return `${adSetName} · ${liveName} · resumed → live (was ${oldValue})`;
}
