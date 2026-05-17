import type { GuidedKind } from "@/lib/spot/types";
import { getProject } from "@/lib/project-data";

export type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  long?: boolean;
  rows?: number;
  alwaysEdit?: boolean;
};

export type StepDef<D = Record<string, string>> = {
  id: string;
  label: string;
  prompt: (draft: D) => string;
  fields: FieldDef[];
  summary: (draft: D) => string;
  refine?: (draft: D, deltaText: string) => D;
};

export type GuidedConfig<D = Record<string, string>> = {
  kicker: string;
  title: (ctx: { projectName?: string; personaName?: string }) => string;
  intro: (draft: D) => string;
  seed: (ctx: { projectId?: string; personaId?: string; angleId?: string }) => D;
  steps: StepDef<D>[];
  finishLabel: string;
  finishNote?: string;
  finalCard: (draft: D) => { lines: { label: string; value: string }[] };
  onFinishToast: string;
};

// ─── new-persona ─────────────────────────────────────────────────────────

type PersonaDraft = {
  name: string;
  age: string;
  role: string;
  want: string;
  painPoint: string;
  usp: string;
  hhi: string;
  geo: string;
  sourceEvidence: string;
};

const personaConfig: GuidedConfig<PersonaDraft> = {
  kicker: "Spot · new persona",
  title: ({ projectName }) => `Add a new persona to ${projectName || "this project"}`,
  intro: () =>
    "Let's add a new persona. I've already drafted them based on your brief, recent leads, and what's worked for similar projects. Walk through each field — accept what fits, edit inline, or ask me to redraft.",
  seed: ({ projectId }) => {
    const project = projectId ? getProject(projectId) : undefined;
    return {
      name: "The Returning Founder",
      age: "39",
      role: "Founder / CXO, sold a company",
      want: "A primary residence that signals 'arrived' — without going overboard.",
      painPoint:
        "Doesn't want SoBo prices. Wants the right Bengaluru address with brand assurance.",
      usp: "Branded interiors, 12-min metro access, low-density towers.",
      hhi: "₹3Cr+ post-exit",
      geo: project?.micromarket || "Bengaluru East",
      sourceEvidence:
        "Drafted from your last 4 weeks of leads — 11 of 27 qualified buyers matched this profile and aren't represented in your existing personas.",
    };
  },
  steps: [
    {
      id: "identity",
      label: "Identity",
      prompt: () =>
        "Who is this? Start with name, age, and a one-line role. Don't worry — you can refine after seeing the rest.",
      fields: [
        { key: "name", label: "Persona name" },
        { key: "age", label: "Typical age" },
        { key: "role", label: "Role / context", long: true, rows: 2 },
      ],
      summary: (d) => `${d.name}, ${d.age} · ${d.role}`,
      refine: (d, delta) => ({ ...d, role: d.role + " · refined: " + delta.slice(0, 60) }),
    },
    {
      id: "want",
      label: "Want",
      prompt: () => "What do they actually want? Frame it as a job-to-be-done — not as a feature.",
      fields: [{ key: "want", label: "Job-to-be-done", long: true, rows: 3 }],
      summary: (d) => d.want,
    },
    {
      id: "pain",
      label: "Pain & USP",
      prompt: () =>
        "What's blocking them, and which of your USPs answers it directly? Pain + USP stay fixed across creative — only hook and CTA flex.",
      fields: [
        { key: "painPoint", label: "Pain point", long: true, rows: 2 },
        { key: "usp", label: "USP that resonates", long: true, rows: 2 },
      ],
      summary: (d) => `${d.painPoint.slice(0, 70)}…`,
    },
    {
      id: "reach",
      label: "Reach",
      prompt: () => "Where do we find them, roughly?",
      fields: [
        { key: "hhi", label: "Household income" },
        { key: "geo", label: "Geography" },
      ],
      summary: (d) => `${d.hhi} · ${d.geo}`,
    },
  ],
  finishLabel: "Add persona to project",
  finishNote: "I'll save the persona, then suggest 3 starting angles you can launch.",
  finalCard: (d) => ({
    lines: [
      { label: "Name & age", value: `${d.name}, ${d.age}` },
      { label: "Role", value: d.role },
      { label: "Want", value: d.want },
      { label: "Pain", value: d.painPoint },
      { label: "USP", value: d.usp },
      { label: "Reach", value: `${d.hhi} · ${d.geo}` },
    ],
  }),
  onFinishToast: "Persona drafted — saved to project",
};

// ─── new-angle ───────────────────────────────────────────────────────────

type AngleDraft = {
  name: string;
  hook: string;
  cta: string;
  format: string;
  successMetric: string;
};

const angleConfig: GuidedConfig<AngleDraft> = {
  kicker: "Spot · new angle",
  title: ({ personaName }) => `New angle for ${personaName || "this persona"}`,
  intro: () =>
    "An angle keeps the persona's pain + USP fixed and flexes the hook, CTA, and format. I've drafted one — accept, edit, or refine.",
  seed: ({ personaId, projectId }) => {
    const persona = projectId
      ? getProject(projectId)?.personas.find((p) => p.id === personaId)
      : undefined;
    return {
      name: "Possession-Sprint",
      hook: persona ? `Today's EMI. Tomorrow's address — ${persona.name.split(" ").pop()}.` : "Today's EMI. Tomorrow's address.",
      cta: "Check today's price",
      format: "1:1 Meta Feed + 9:16 Meta Reels",
      successMetric: "Hook rate ≥ 45% · CPVL < ₹5,800",
    };
  },
  steps: [
    {
      id: "name-hook",
      label: "Name + hook",
      prompt: () =>
        "Name the angle (short, memorable) and write the hook. Keep it sharp — the hook is what decides if they stop scrolling.",
      fields: [
        { key: "name", label: "Angle name" },
        { key: "hook", label: "Hook", long: true, rows: 2 },
      ],
      summary: (d) => `"${d.name}" — ${d.hook.slice(0, 60)}…`,
    },
    {
      id: "cta",
      label: "CTA",
      prompt: () => "What's the call? Single, specific verb.",
      fields: [{ key: "cta", label: "CTA" }],
      summary: (d) => d.cta,
    },
    {
      id: "guard",
      label: "Format & metric",
      prompt: () => "Which formats? And what success metric should we judge this on?",
      fields: [
        { key: "format", label: "Target format" },
        { key: "successMetric", label: "Success metric" },
      ],
      summary: (d) => `${d.format} · ${d.successMetric}`,
    },
  ],
  finishLabel: "Add angle & open creative generator",
  finishNote:
    "I'll save the angle, then open the creative generator with this hook pre-loaded.",
  finalCard: (d) => ({
    lines: [
      { label: "Angle name", value: d.name },
      { label: "Hook", value: d.hook },
      { label: "CTA", value: d.cta },
      { label: "Formats", value: d.format },
      { label: "Win at", value: d.successMetric },
    ],
  }),
  onFinishToast: "Angle drafted — opening creative generator",
};

// ─── launch-creative ─────────────────────────────────────────────────────

type LaunchDraft = {
  angleName: string;
  formats: string;
  brief: string;
};

const launchConfig: GuidedConfig<LaunchDraft> = {
  kicker: "Spot · launch creative",
  title: ({ personaName }) => `Launch new creatives for ${personaName || "this persona"}`,
  intro: () =>
    "Two quick steps — confirm the angle and formats, then drop a short brief. I'll hand you off to the creative generator.",
  seed: ({ projectId, personaId, angleId }) => {
    const project = projectId ? getProject(projectId) : undefined;
    const persona = project?.personas.find((p) => p.id === personaId);
    const angle = persona?.angles.find((a) => a.id === angleId) || persona?.angles[0];
    return {
      angleName: angle?.name || "Lifestyle Upgrade",
      formats: "1:1 Meta Feed + 9:16 Meta Reels + 16:9 Google Display",
      brief:
        angle
          ? `Lead with the hook "${angle.hook}". Pull from project images — exterior + interior. Keep the proof points: ${
              project?.strategy.proofPoints[0] || ""
            }.`
          : "Lead with the hook. Pull from project images.",
    };
  },
  steps: [
    {
      id: "scope",
      label: "Scope",
      prompt: () => "Which angle, and what formats do you want?",
      fields: [
        { key: "angleName", label: "Angle" },
        { key: "formats", label: "Formats" },
      ],
      summary: (d) => `${d.angleName} · ${d.formats}`,
    },
    {
      id: "brief",
      label: "Brief",
      prompt: () =>
        "What should the creative emphasize? Keep it 2–3 sentences — I'll expand into a full prompt.",
      fields: [{ key: "brief", label: "Creative brief", long: true, rows: 4, alwaysEdit: true }],
      summary: (d) => d.brief.slice(0, 80) + (d.brief.length > 80 ? "…" : ""),
    },
  ],
  finishLabel: "Open creative generator",
  finalCard: (d) => ({
    lines: [
      { label: "Angle", value: d.angleName },
      { label: "Formats", value: d.formats },
      { label: "Brief", value: d.brief },
    ],
  }),
  onFinishToast: "Brief saved — opening creative generator",
};

// ─── new-campaign (stub: same skeleton, simpler steps) ───────────────────

type CampaignDraft = {
  typeId: string;
  name: string;
  objective: string;
  budgetDaily: string;
};

const campaignConfig: GuidedConfig<CampaignDraft> = {
  kicker: "Spot · new campaign",
  title: ({ projectName }) => `New campaign for ${projectName || "this project"}`,
  intro: () =>
    "I'll draft a starting campaign — type, name, objective, and a budget — based on your project stage and what's already running.",
  seed: ({ projectId }) => {
    const project = projectId ? getProject(projectId) : undefined;
    return {
      typeId: "experiment",
      name: `${project?.name.split(" · ")[0] || "Project"} · Experiment · Founder Persona`,
      objective: "Verified leads",
      budgetDaily: "₹5,000/day",
    };
  },
  steps: [
    {
      id: "basics",
      label: "Basics",
      prompt: () => "Confirm the campaign name and objective. I default to your project's primary goal metric.",
      fields: [
        { key: "name", label: "Campaign name" },
        { key: "objective", label: "Objective" },
      ],
      summary: (d) => `${d.name} · ${d.objective}`,
    },
    {
      id: "budget",
      label: "Budget",
      prompt: () => "How much per day to start? I'll suggest a 10-day pilot at low spend so we learn cheaply.",
      fields: [{ key: "budgetDaily", label: "Daily budget" }],
      summary: (d) => d.budgetDaily,
    },
  ],
  finishLabel: "Save campaign draft",
  finalCard: (d) => ({
    lines: [
      { label: "Campaign", value: d.name },
      { label: "Objective", value: d.objective },
      { label: "Daily budget", value: d.budgetDaily },
    ],
  }),
  onFinishToast: "Campaign draft saved — open Campaigns to launch",
};

// ─── new-adset (stub) ────────────────────────────────────────────────────

type AdsetDraft = {
  name: string;
  audience: string;
  optimization: string;
  budgetDaily: string;
};

const adsetConfig: GuidedConfig<AdsetDraft> = {
  kicker: "Spot · new ad set",
  title: () => "New ad set",
  intro: () => "I'll draft an ad set based on the campaign and the most likely persona.",
  seed: ({ projectId, personaId }) => {
    const project = projectId ? getProject(projectId) : undefined;
    const persona = project?.personas.find((p) => p.id === personaId) || project?.personas[0];
    return {
      name: `Lookalike · ${persona?.name || "Persona"} · 1%`,
      audience: `LAL 1% of approved buyers · ${project?.micromarket || "Bengaluru East"} · ${
        persona?.age || 35
      }-${(persona?.age || 35) + 12}`,
      optimization: "Verified leads",
      budgetDaily: "₹5,000/day",
    };
  },
  steps: [
    {
      id: "audience",
      label: "Audience",
      prompt: () => "Confirm the audience definition.",
      fields: [
        { key: "name", label: "Ad set name" },
        { key: "audience", label: "Audience definition", long: true, rows: 3 },
      ],
      summary: (d) => d.audience.slice(0, 80) + "…",
    },
    {
      id: "objective",
      label: "Objective",
      prompt: () => "What to optimize for, and at what daily budget?",
      fields: [
        { key: "optimization", label: "Optimization metric" },
        { key: "budgetDaily", label: "Daily budget" },
      ],
      summary: (d) => `${d.optimization} · ${d.budgetDaily}`,
    },
  ],
  finishLabel: "Save ad set draft",
  finalCard: (d) => ({
    lines: [
      { label: "Ad set", value: d.name },
      { label: "Audience", value: d.audience },
      { label: "Optimization", value: d.optimization },
      { label: "Daily budget", value: d.budgetDaily },
    ],
  }),
  onFinishToast: "Ad set draft saved",
};

// Cast through unknown — each per-kind draft is heterogeneous at the
// type level but always a string-record at runtime, which is all the
// shared GuidedFlow shell consumes.
export const GUIDED_CONFIGS: Record<GuidedKind, GuidedConfig<Record<string, string>>> = {
  "new-persona": personaConfig as unknown as GuidedConfig<Record<string, string>>,
  "new-angle": angleConfig as unknown as GuidedConfig<Record<string, string>>,
  "launch-creative": launchConfig as unknown as GuidedConfig<Record<string, string>>,
  "new-campaign": campaignConfig as unknown as GuidedConfig<Record<string, string>>,
  "new-adset": adsetConfig as unknown as GuidedConfig<Record<string, string>>,
};
