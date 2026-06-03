import type {
  ProjectDetail,
  Angle,
  Creative,
  MediaRow,
  MediaAdSet,
  MediaAd,
  LeadForm,
  LeadFormQuestion,
  LeadFormQuestionKind,
} from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";

/**
 * "Let Spot take charge" — the auto-pilot that walks the post-creation
 * sequence end to end so a user with zero setup can go from a fresh
 * project to a deploy-ready state in one click.
 *
 * Steps:
 *   1. For each persona that has fewer than 2 angles, draft enough
 *      template angles (with image concepts and 3 sized creatives each)
 *      to bring it up to 2.
 *   2. If no form is published, create + publish a default form derived
 *      from the project's brief.
 *   3. If no campaigns exist, build a campaign plan: one campaign per
 *      persona, with one ad set per angle and one ad per concept (size
 *      0 — the canonical creative). Status=draft so the user can review
 *      before deploying.
 *
 * The runner is split from the streaming UI so the same logic can be
 * invoked from tests / Spot chat later without a render dependency.
 */

export type AutopilotStep = {
  id: string;
  /** What the streaming log shows for this step (e.g. "Drafting angles for The Senior Tech Lead"). */
  label: string;
  /** Optional one-line sub-label with detail (e.g. "2 angles · 6 sized creatives"). */
  sub?: string;
  /** Action that actually mutates the project. */
  run: () => void;
};

export type AutopilotPlan = {
  steps: AutopilotStep[];
  /** Counts surfaced in the modal header before the run starts. */
  summary: {
    angleCount: number;
    formCount: number;
    campaignCount: number;
  };
};

/**
 * Plan what the autopilot will do given the current project state. The
 * UI calls this on mount so it can show the user what's about to
 * happen before they confirm.
 */
export function planAutopilot(project: ProjectDetail): AutopilotPlan {
  const steps: AutopilotStep[] = [];
  let angleCount = 0;
  let formCount = 0;
  let campaignCount = 0;

  // 1. Angles for personas that need them.
  for (const persona of project.personas) {
    const needed = Math.max(0, 2 - persona.angles.length);
    if (needed === 0) continue;
    angleCount += needed;
    const personaId = persona.id;
    steps.push({
      id: `angles-${personaId}`,
      label: `Drafting angles for ${persona.name}`,
      sub: `${needed} angle${needed === 1 ? "" : "s"} · ${needed * 3} sized creative${needed * 3 === 1 ? "" : "s"}`,
      run: () => addAnglesForPersona(project.id, personaId, needed),
    });
  }

  // 2. Form — only if there isn't a published one yet.
  const hasPublished = (project.forms ?? []).some((f) => f.status === "published");
  if (!hasPublished) {
    formCount = 1;
    steps.push({
      id: "form-default",
      label: "Drafting default lead form",
      sub: "5 questions · auto-published so campaigns can attach",
      run: () => addDefaultForm(project.id),
    });
  }

  // 3. Campaigns — only if none exist. We plan one Meta lead-gen
  // campaign per persona, with an ad set per angle and an ad per
  // concept (one ad per angle for now).
  if (project.mediaPlan.rows.length === 0) {
    // We use the post-step project shape (after angles + form have
    // been seeded) — but since planning is read-only, we anticipate
    // by walking the personas as they'll look after the angle steps.
    const personasForCampaigns = project.personas.length > 0 ? project.personas : [];
    if (personasForCampaigns.length > 0) {
      campaignCount = personasForCampaigns.length;
      steps.push({
        id: "campaigns",
        label: "Building campaign plan",
        sub: `${campaignCount} campaign${campaignCount === 1 ? "" : "s"} · 1 ad set per angle · drafted ready for review`,
        run: () => seedCampaignPlan(project.id),
      });
    }
  }

  return { steps, summary: { angleCount, formCount, campaignCount } };
}

// ─── Step implementations ───────────────────────────────────────────────

const ANGLE_TEMPLATES: Array<{ name: string; hook: string; cta: string }> = [
  {
    name: "Lifestyle Upgrade",
    hook: "Branded interiors that grow with your family",
    cta: "Book a 15-min tour",
  },
  {
    name: "School-Zone Story",
    hook: "Top-rated schools, 8 minutes door-to-door",
    cta: "See site & schools",
  },
  {
    name: "Future-Proof Investment",
    hook: "Lowest density in micromarket · resale guarantee",
    cta: "Get the pricing sheet",
  },
  {
    name: "Family Future",
    hook: "A home that holds three generations",
    cta: "Talk to a senior advisor",
  },
];

function addAnglesForPersona(
  projectId: string,
  personaId: string,
  needed: number,
): void {
  mutateRuntimeProject(projectId, (p) => {
    const persona = p.personas.find((x) => x.id === personaId);
    if (!persona) return;
    const used = new Set(persona.angles.map((a) => a.name));
    const candidates = ANGLE_TEMPLATES.filter((t) => !used.has(t.name));
    const picks = candidates.slice(0, needed);
    for (const tpl of picks) {
      const slug = tpl.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 24);
      const angleId = `${personaId}-${slug}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const hue = Math.floor(Math.random() * 360);
      const angle: Angle = {
        id: angleId,
        name: tpl.name,
        status: "live",
        hook: tpl.hook,
        cta: tpl.cta,
        concept: {
          hue,
          layout: "hero",
          creatives: staticSeed(angleId),
        },
      };
      persona.angles.push(angle);
    }
  });
}

function staticSeed(angleId: string): Creative[] {
  return [
    makeCreative(`${angleId}-s11`, "1:1", "Meta Feed", "image"),
    makeCreative(`${angleId}-s45`, "4:5", "Meta Feed", "image"),
    makeCreative(`${angleId}-s916`, "9:16", "Meta Stories", "image"),
  ];
}

function makeCreative(
  id: string,
  format: Creative["format"],
  surface: string,
  kind: Creative["kind"],
): Creative {
  // Hash the id into a deterministic hue so the placeholder gradient
  // is consistent across renders.
  const placeholderHue =
    (id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) * 47) % 360;
  return {
    id,
    format,
    surface,
    platform: "Meta",
    kind,
    // Spot-generated → marks the creative as "ready" (no spend yet,
    // but the asset is "there"). Matches the convention used elsewhere
    // for seeded creatives.
    assetSource: "generated",
    placeholderHue,
    spend: null,
    impressions: null,
    leads: null,
    verified: null,
    qualified: null,
    ctr: null,
    cvr: null,
    cpl: null,
    cpvl: null,
    cpql: null,
  };
}

function addDefaultForm(projectId: string): void {
  mutateRuntimeProject(projectId, (p) => {
    if (!p.forms) p.forms = [];
    const id = `form-autopilot-${Date.now().toString(36)}`;
    const projectShort = p.name.split(" · ")[0];
    const form: LeadForm = {
      id,
      name: `${projectShort} · Default form`,
      personaId: null,
      // Auto-publish so campaigns can attach without an extra click —
      // the autopilot's whole point is to land in a deploy-ready state.
      status: "published",
      intro: {
        headline: `Get pricing & site visit for ${projectShort}`,
        body: `${p.typology || "Luxury homes"} in ${p.micromarket || "the project's micromarket"} · ${p.priceBand || "premium"} pricing. Share your details — our team gets back within 24 hours.`,
      },
      questions: [
        question("q-name", "name", "Full name", true),
        question("q-phone", "phone", "Phone number", true),
        question("q-email", "email", "Email", true),
        question("q-budget", "budget", "Budget", true),
        question("q-timeline", "timeline", "Timeline", true),
      ],
      privacy: `By submitting, you agree to be contacted by ${p.builder || "Godrej Properties"} about ${projectShort}.`,
      completion: {
        headline: "Thanks — our team will be in touch shortly.",
        body: "In the meantime, you can preview the project online.",
        ctaLabel: "Open project page",
        ctaUrl: "",
      },
      updatedAt: new Date().toISOString(),
    };
    p.forms.push(form);
  });
}

function question(
  id: string,
  kind: LeadFormQuestionKind,
  label: string,
  required: boolean,
): LeadFormQuestion {
  return { id, kind, label, required };
}

function seedCampaignPlan(projectId: string): void {
  mutateRuntimeProject(projectId, (p) => {
    const projectShort = p.name.split(" · ")[0];
    const personas = p.personas;
    if (personas.length === 0) return;
    const dailyPerCampaign = 2000; // ₹2K/day baseline per campaign
    for (const persona of personas) {
      // Use the persona's angles as they are *after* the angle step;
      // since both mutations run in sequence on the same runtime
      // project, the angles seeded earlier are visible here.
      const angles = persona.angles;
      if (angles.length === 0) continue;
      const cId = `mr-autopilot-${persona.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
      const adSets: MediaAdSet[] = angles.map((angle, ai) => {
        const setId = `${cId}-set-${ai}`;
        // One ad per first concept of each angle.
        const firstCreative = angle.concept.creatives[0];
        const ads: MediaAd[] = firstCreative
          ? [
              {
                id: `${setId}-ad-0`,
                name: `${persona.name} · ${angle.name}`,
                personaId: persona.id,
                angleIdx: ai,
                status: "draft",
                spend: null,
                leads: null,
                cpl: null,
                creativeId: firstCreative.id,
              } as MediaAd,
            ]
          : [];
        const setBudget = Math.max(
          200,
          Math.round(dailyPerCampaign / Math.max(1, angles.length)),
        );
        return {
          id: setId,
          name: `${angle.name} · Open`,
          audience: persona.demographics[0] || "Broad",
          optimization: "Lead",
          budgetDaily: setBudget,
          expLeads: Math.round(setBudget / 800),
          expVerified: Math.round((setBudget / 800) * 0.5),
          cpvl: null,
          status: "draft",
          spotChange: null,
          ads,
        };
      });
      const row: MediaRow = {
        id: cId,
        channel: "Meta",
        campaign: `${projectShort} · ${persona.name}`,
        personaId: persona.id,
        budgetDaily: dailyPerCampaign,
        expLeads: Math.round(dailyPerCampaign / 800),
        expVerified: Math.round((dailyPerCampaign / 800) * 0.5),
        cpvl: null,
        status: "draft",
        spotChange: null,
        adSets,
      };
      p.mediaPlan.rows.push(row);
    }
    if (p.mediaPlan.window === "Not yet scheduled") {
      p.mediaPlan.window =
        "Week of " +
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      p.mediaPlan.version = "v1";
    }
  });
}

// ─── Checklist state derivation ─────────────────────────────────────────

export type SetupStepKey = "creatives" | "form" | "campaigns";

export type SetupStepState = {
  key: SetupStepKey;
  label: string;
  /** Plain-English completion criterion shown next to the step. */
  description: string;
  done: boolean;
  /** Optional progress hint (e.g. "2 of 3 personas have angles"). */
  progress?: string;
};

export function deriveSetupState(p: ProjectDetail): SetupStepState[] {
  const personasWithAngles = p.personas.filter((x) => x.angles.length > 0).length;
  const totalPersonas = p.personas.length;
  const allHaveCreatives =
    totalPersonas > 0 &&
    p.personas.every((x) =>
      x.angles.some((a) => a.concept.creatives.length > 0),
    );

  const publishedForms = (p.forms ?? []).filter((f) => f.status === "published").length;
  const hasForm = publishedForms > 0;

  const campaignCount = p.mediaPlan.rows.length;
  const hasCampaigns = campaignCount > 0;

  return [
    {
      key: "creatives",
      label: "Build creatives for each persona",
      description:
        "At least one angle with a sized creative per persona — Spot can draft 2 angles each.",
      done: allHaveCreatives,
      progress:
        totalPersonas === 0
          ? "No personas yet — add some on the Personas tab"
          : `${personasWithAngles} of ${totalPersonas} persona${totalPersonas === 1 ? "" : "s"} drafted`,
    },
    {
      key: "form",
      label: "Build & publish a lead form",
      description:
        "Meta won't let any campaign go live without a form attached.",
      done: hasForm,
      progress: hasForm
        ? `${publishedForms} published`
        : (p.forms ?? []).length > 0
          ? `${(p.forms ?? []).length} draft${(p.forms ?? []).length === 1 ? "" : "s"} — publish to unblock`
          : "Not started",
    },
    {
      key: "campaigns",
      label: "Build a campaign plan",
      description:
        "One Meta campaign per persona with ad sets per angle, ready to deploy.",
      done: hasCampaigns,
      progress: hasCampaigns
        ? `${campaignCount} campaign${campaignCount === 1 ? "" : "s"} drafted`
        : "Not started",
    },
  ];
}

export function setupIsComplete(states: SetupStepState[]): boolean {
  return states.every((s) => s.done);
}
