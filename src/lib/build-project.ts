import type {
  ProjectDetail,
  Persona,
  ProjectImage,
} from "@/lib/project-data";

export type ProjectDraftInput = {
  /** Project name as entered in CreateProjectFlow. */
  name: string;
  rera: string;
  micromarket: string;
  typology: string;
  priceBand: string;
  pricePerSqft: string;
  possession: string;
  keyUSPs: string[];
  locationProximity: string[];
  keyBenefits: string[];
  goalKind: "leads" | "verified" | "qualified";
  goalTarget: string;
  goalWindow: string;
  budgetTotal: string;
  personas: Array<{
    id: string;
    name: string;
    age: string;
    role: string;
    want: string;
    painPoint: string;
    solution: string;
    hhi: string;
    geo: string;
    share: number;
  }>;
  /** Uploaded project images from the Images stage. */
  images?: Array<{ id: string; url: string; name: string; kind: "image" | "video" }>;
  /** Workspace this project belongs to. */
  workspaceId: string;
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function buildProjectFromDraft(input: ProjectDraftInput): ProjectDetail {
  const id = `proj-${slug(input.name)}-${Date.now().toString(36)}`;
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  // goalKind / goalTarget / goalWindow / budgetTotal are intentionally
  // unused — the goal stage was removed from project creation. The user
  // sets the goal manually on the project page after creation.

  const personas: Persona[] = input.personas.map((p) => ({
    id: p.id,
    name: p.name,
    age: Number(p.age) || 35,
    role: p.role,
    share: p.share,
    approved: true,
    oneLiner: p.want,
    want: p.want,
    painPoint: p.painPoint,
    usp: p.solution,
    demographics: p.geo ? [p.geo] : [],
    motivations: [],
    objections: [],
    channels: ["Meta", "Google"],
    verifiedLeads: 0,
    cpvl: "—",
    angles: [],
  }));

  const projectImages: ProjectImage[] = (input.images || []).map((img, i) => ({
    id: img.id,
    kind: i % 2 === 0 ? "exterior" : "interior",
    name: img.name,
    hue: (i * 47) % 360,
    tags: [],
    usedIn: 0,
  }));

  return {
    id,
    name: input.name,
    category: "Residential",
    status: "active",
    health: "on-track",
    workspaceId: input.workspaceId,
    rera: input.rera,
    micromarket: input.micromarket,
    typology: input.typology,
    priceBand: input.priceBand,
    sizeBand: "—",
    possession: input.possession,
    inventory: "—",
    builder: "Godrej Properties",
    launchedOn: today,
    brandId: "brand-godrej-properties",
    brief: {
      updated: today,
      summary: `${input.name} — ${input.typology} in ${input.micromarket}. Priced ${input.priceBand}${
        input.pricePerSqft ? ` (${input.pricePerSqft})` : ""
      }.`,
      usp: input.keyUSPs,
      avoid: [],
      attachments: [],
    },
    // Projects created from the new flow do not have a goal set yet — the
    // user is expected to configure it later from the project page. Target=0
    // signals "no goal configured" everywhere downstream.
    goal: {
      kind: "verified",
      target: 0,
      achieved: 0,
      window: "",
      daysTotal: 0,
      daysElapsed: 0,
      pace: "on-pace",
      paceDelta: "new",
      forecast: 0,
      spotRead:
        "No goal set yet. When you set one — number of leads + window — I'll start projecting your pace and flagging the gap.",
    },
    secondary: [
      { label: "Spend to date", value: "₹0", sub: "no spend yet" },
      { label: "Total leads", value: 0, sub: "no leads yet" },
      { label: "Verified leads", value: 0, sub: "—" },
      { label: "Qualified leads", value: 0, sub: "—" },
    ],
    personas,
    strategy: {
      updated: today,
      tone: { is: [], isNot: [] },
      visualSystem: { palette: [], principles: [] },
      proofPoints: input.keyBenefits,
    },
    mediaPlan: {
      window: "Not yet scheduled",
      version: "v0",
      proposedDelta: "—",
      rows: [],
      summary: {
        liveDaily: 0,
        proposedDaily: 0,
        weeklyExpected: { leads: 0, verified: 0 },
        gapToGoal: "No goal set yet",
      },
    },
    experiments: [],
    images: projectImages,
  };
}

/**
 * Append a freshly-launched campaign row to a project's media plan.
 * Used by CampaignCreationFlow to give the user something to see in the
 * Campaigns tab right after they launch.
 */
export function appendLaunchedCampaign(
  project: ProjectDetail,
  args: {
    settingsObjective: "leads" | "verified" | "qualified";
    weeklyBudget: number;
    agentId?: string | null;
    agentName?: string | null;
  },
): void {
  const personas = project.personas;
  const firstPersona = personas[0];
  const dailyBudget = Math.round(args.weeklyBudget / 7);
  const id = `mr-launched-${Date.now().toString(36)}`;
  const projectShort = project.name.split(" · ")[0];
  project.mediaPlan.rows.push({
    id,
    channel: "Meta",
    campaign: `${projectShort} · Experiment · ${firstPersona?.name || "Audience"}`,
    personaId: firstPersona?.id || "",
    budgetDaily: dailyBudget,
    expLeads: Math.round((args.weeklyBudget / 7) / 800),
    expVerified: Math.round((args.weeklyBudget / 7) / 800 * 0.17),
    cpvl: args.weeklyBudget > 0 ? Math.round(args.weeklyBudget * 7 / Math.max(1, Math.round(args.weeklyBudget / 800))) : null,
    status: "live",
    spotChange: null,
    agentId: args.agentId || undefined,
    agentName: args.agentName || undefined,
    adSets: [],
  });
  if (project.mediaPlan.window === "Not yet scheduled") {
    project.mediaPlan.window = "Week of " + new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    project.mediaPlan.version = "v1";
  }
  project.mediaPlan.summary.liveDaily += dailyBudget;
}
