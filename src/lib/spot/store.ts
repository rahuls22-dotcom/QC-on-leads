"use client";

import { create } from "zustand";
import type { GuidedKind, GuidedPayload, SpotMessage, SpotScope } from "./types";
import {
  EMPTY_APPROVALS,
  nextStep,
  stepIntroMessage,
  STEP_TOOL_CALL,
  type LaunchWorkflow,
  type WorkflowBudget,
  type WorkflowStep,
} from "./workflow";
import { PRODUCTS } from "../products-data";

type PanelState = {
  open: boolean;
  maximized: boolean;
  scope: SpotScope;
  // Bumped each time the host calls askSpot(query) so the panel knows to
  // reset its thread and seed a reply for the new question.
  pendingQuery: { q: string; ts: number } | null;
  // Live conversation in the panel.
  thread: SpotMessage[];

  // Command palette
  paletteOpen: boolean;

  // Guided flow modal
  guided: GuidedPayload | null;

  // Toast
  toast: string | null;

  // Launch workflow — the split-screen agentic flow on /spot.
  // null = no workflow active, single-column chat.
  workflow: LaunchWorkflow | null;
  // Whether the right-pane canvas is visible. Workflow state is
  // preserved when this is false — the user just gets the chat wider
  // so they can read uninterrupted, like collapsing Claude's preview.
  canvasOpen: boolean;
  // When a workflow is active but the user has navigated back to the
  // Spot homepage (via the "Spot home" button), this is true. The
  // workflow is preserved; we just render the home view. Setting back
  // to false re-enters the split-screen.
  viewHomeOverride: boolean;

  // Setters
  askSpot: (query: string, scope?: SpotScope) => void;
  startLaunchFlow: (project: { id: string; name: string }) => void;
  /** Start the workflow at the product-setup step (new product flow). */
  startNewProductFlow: () => void;
  /** Spot doesn't recognise the product — fake-research it in real-time. */
  startDeepResearch: (productName: string, attachedFiles?: string[]) => void;
  /** Advance the workflow to the next step + seed a Spot narration message. */
  advanceWorkflow: (narration?: string) => void;
  /** Jump to a specific step (used for "edit a previous step"). */
  gotoStep: (step: WorkflowStep) => void;
  setWorkflowBudget: (b: WorkflowBudget) => void;
  toggleWorkflowApproval: (group: "personaIds" | "angleIds" | "formIds", id: string) => void;
  /** Pick / change the voice agent attached to outbound campaigns. */
  attachVoiceAgent: (agentId: string | null) => void;
  exitWorkflow: () => void;
  /** Collapse the right-pane canvas without losing workflow state. */
  setCanvasOpen: (open: boolean) => void;
  /** Convenience toggler used by the canvas open/close buttons. */
  toggleCanvas: () => void;
  /** Park the workflow and render the homepage (workflow stays alive). */
  showHomeView: () => void;
  /** Resume the active workflow (homepage banner / past-chats click). */
  resumeWorkflow: () => void;
  /** Workspace-level WhatsApp Business connection state (for media-plan). */
  whatsAppConnected: boolean;
  connectWhatsApp: () => void;
  setScope: (scope: SpotScope) => void;
  appendMessage: (m: SpotMessage) => void;
  setThread: (m: SpotMessage[] | ((prev: SpotMessage[]) => SpotMessage[])) => void;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleMaximize: () => void;
  setMaximized: (v: boolean) => void;
  openPalette: () => void;
  closePalette: () => void;
  openGuided: (payload: GuidedPayload) => void;
  closeGuided: () => void;
  showToast: (text: string) => void;
  dismissToast: () => void;
};

const WORKSPACE_SCOPE: SpotScope = { kind: "workspace", label: "Workspace" };

export const useSpotStore = create<PanelState>((set) => ({
  open: false,
  maximized: false,
  scope: WORKSPACE_SCOPE,
  pendingQuery: null,
  thread: [],
  paletteOpen: false,
  guided: null,
  toast: null,
  workflow: null,
  canvasOpen: true,
  viewHomeOverride: false,
  whatsAppConnected: false,

  askSpot: (query, scope) =>
    set((s) => ({
      open: true,
      scope: scope || s.scope,
      // bump ts even when the same query is repeated so subscribers re-fire
      pendingQuery: { q: query, ts: Date.now() },
    })),

  // Kicks off the launch workflow for an *existing* product. Chat opens
  // with a single conversational line + a "Memory Reader" tool-call. The
  // right pane shows a shimmer skeleton. After a beat both reveal — chat
  // gets a 1-line "memory looks solid" summary + the approval CTA; the
  // canvas blooms into the full memory view. Mirrors the deep-research
  // pattern but on existing memory.
  startLaunchFlow: (project) => {
    const product = PRODUCTS.find((p) => p.id === project.id);
    const callId = `tc-${Date.now()}`;

    set(() => ({
      open: true,
      maximized: false,
      canvasOpen: true,
      viewHomeOverride: false,
      scope: { kind: "project", label: project.name, target: project.id },
      pendingQuery: null,
      workflow: {
        kind: "launch-campaign",
        step: "kickoff",
        productId: project.id,
        productName: project.name,
        budget: null,
        approvals: { ...EMPTY_APPROVALS },
        startedAt: Date.now(),
        researchedMemory: null,
        kickoffReady: false,
        attachedVoiceAgentId: null,
      },
      thread: [
        {
          role: "spot",
          parts: [
            {
              type: "text",
              text: `Let me pull up what I know about **${project.name}**.`,
            },
            {
              type: "tool-call",
              id: callId,
              agent: "memory.read",
              detail: `loading product file · ${project.name}`,
              status: "running",
            },
          ],
        },
      ],
    }));

    // After the loader, reveal the canvas + drop a short conversational
    // line in chat. No findings dump — the user can read the right pane.
    setTimeout(() => {
      set((s) => {
        if (!s.workflow) return {};
        const nextWorkflow: LaunchWorkflow = { ...s.workflow, kickoffReady: true };
        const updatedThread = s.thread.map((m) => {
          if (m.role !== "spot") return m;
          return {
            ...m,
            parts: m.parts.map((p) =>
              p.type === "tool-call" && p.id === callId
                ? { ...p, status: "done" as const }
                : p,
            ),
          };
        });
        const summary: SpotMessage = {
          role: "spot",
          parts: [
            {
              type: "text",
              text: product
                ? `Got it. Memory's **${Math.round(product.readiness * 100)}% complete** — ${product.personas.length} personas linked, ${product.memory.length} entries on file. Pulled it up on the right.`
                : `Pulled what I have onto the right.`,
            },
            {
              type: "step-cta",
              label: "Looks right — start with personas",
              helper: "I'll bring up who you've been targeting.",
              refineHint: "or tell me what's missing",
            },
          ],
        };
        return { workflow: nextWorkflow, thread: [...updatedThread, summary] };
      });
    }, 4500);
  },

  // Kicks off the new-product flow. Step 1 is product memory setup;
  // every later step inherits the product the user just created.
  startNewProductFlow: () =>
    set(() => ({
      open: true,
      maximized: false,
      canvasOpen: true,
      viewHomeOverride: false,
      scope: { kind: "workspace", label: "New product" },
      pendingQuery: null,
      workflow: {
        kind: "launch-campaign",
        step: "product-setup",
        productId: null,
        productName: "Untitled product",
        budget: null,
        approvals: { ...EMPTY_APPROVALS },
        startedAt: Date.now(),
        researchedMemory: null,
        kickoffReady: true,
        attachedVoiceAgentId: null,
      },
      thread: [
        {
          role: "spot",
          parts: [
            { type: "headline", text: "Let's start from scratch.", verdict: "info" },
            {
              type: "text",
              text: "Tell me about the product on the right — brand, USPs, things to avoid. I'll build the memory layer first; everything downstream uses it.",
            },
          ],
        },
      ],
    })),

  // The user mentioned a product we don't have on file. Instead of
  // crashing on "no memory found", we kick off a deep-research arc —
  // spawn the Research Agent, show progress on the canvas, then on a
  // delay synthesise the memory and advance to kickoff. From the
  // user's POV it feels like Spot just learned about the product.
  startDeepResearch: (productName, attachedFiles = []) => {
    const callId = `tc-${Date.now()}`;
    const hasFiles = attachedFiles.length > 0;
    const fileSummary =
      attachedFiles.length === 1
        ? `“${attachedFiles[0]}”`
        : `${attachedFiles.length} files (${attachedFiles.slice(0, 2).join(", ")}${attachedFiles.length > 2 ? ", …" : ""})`;
    set(() => ({
      open: true,
      maximized: false,
      canvasOpen: true,
      viewHomeOverride: false,
      scope: { kind: "workspace", label: productName },
      pendingQuery: null,
      workflow: {
        kind: "launch-campaign",
        step: "deep-research",
        productId: null,
        productName,
        budget: null,
        approvals: { ...EMPTY_APPROVALS },
        startedAt: Date.now(),
        researchedMemory: null,
        kickoffReady: true,
        attachedVoiceAgentId: null,
      },
      thread: [
        {
          role: "spot",
          parts: [
            {
              type: "headline",
              text: `I haven't seen "${productName}" yet.`,
              verdict: "info",
            },
            {
              type: "text",
              text: hasFiles
                ? `I'll parse ${fileSummary} alongside the brand site, pull category signals from the open web, and check our audience graph — then write everything to product memory.`
                : "Let me spin up the Deep Research Agent — I'll crawl the brand site, pull category signals from the open web, and check our audience graph, then write everything to product memory.",
            },
            {
              type: "tool-call",
              id: callId,
              agent: "Deep Research Agent",
              detail: hasFiles
                ? `Parsing ${attachedFiles.length} attachment${attachedFiles.length === 1 ? "" : "s"} · brand site · category signals · audience overlap.`
                : "Crawling brand site · category signals · audience overlap.",
              status: "running",
            },
          ],
        },
      ],
    }));

    // After a beat, finish the research, synthesise memory, advance to kickoff.
    setTimeout(() => {
      set((s) => {
        if (!s.workflow) return {};
        const researched: import("./workflow").ResearchedMemory = {
          tagline: `${productName} — fresh research from Spot. Memory pre-filled; edit any field in chat.`,
          usps: [
            "Strongest category signal: live cohort + mentor-led delivery beats pure-recorded on retention.",
            "Pricing band sits in the median tier — room to test premium / lite variants once we have data.",
            "Closest competitor's positioning is rank-led; an outcomes-led counter-position should win on trust.",
          ],
          avoid: [
            "Don't promise specific outcomes (ranks, jobs, admits) — likely flagged by legal.",
            "Skip celebrity-endorsement framing unless explicitly cleared.",
          ],
          sources: [
            ...(attachedFiles.length > 0
              ? attachedFiles.slice(0, 3).map((n) => `Your upload · ${n}`)
              : []),
            ...(attachedFiles.length > 3
              ? [`Your uploads · +${attachedFiles.length - 3} more file${attachedFiles.length - 3 === 1 ? "" : "s"}`]
              : []),
            "Brand site · /about, /curriculum, /pricing",
            "Category research · top-of-funnel keyword landscape",
            "Open web · category review sites, parent forums",
            "Revspot audience graph · cross-product persona overlap",
          ],
        };
        const nextWorkflow: LaunchWorkflow = {
          ...s.workflow,
          step: "kickoff",
          researchedMemory: researched,
        };
        // Flip the tool-call to done + append the kickoff intro.
        const updatedThread = s.thread.map((m) => {
          if (m.role !== "spot") return m;
          return {
            ...m,
            parts: m.parts.map((p) =>
              p.type === "tool-call" && p.id === callId
                ? { ...p, status: "done" as const }
                : p,
            ),
          };
        });
        const kickoff: SpotMessage = {
          role: "spot",
          parts: [
            {
              type: "headline",
              text: `${productName} · memory built.`,
              verdict: "ok",
            },
            {
              type: "text",
              text: `I've drafted what I'd lead with and what to avoid. The right pane shows it — since this is brand-new with no past campaign data, I'll plan a **conservative experiment** at the next step.`,
            },
            {
              type: "step-cta",
              label: "Looks right — start with personas",
              helper: "I'll dispatch the Persona Researcher next.",
              refineHint: "or tell me what's missing",
            },
          ],
        };
        return { workflow: nextWorkflow, thread: [...updatedThread, kickoff] };
      });
    }, 2800);
  },

  advanceWorkflow: (narration) =>
    set((s) => {
      if (!s.workflow) return {};
      const upcoming = nextStep(s.workflow.step);
      const tc = STEP_TOOL_CALL[upcoming];
      const callId = `tc-${Date.now()}`;
      // Pre-select sensible defaults so the user sees selected state
      // immediately on entering a step (clearer than "0 selected").
      const preselectFor = (
        step: WorkflowStep,
        current: typeof s.workflow.approvals,
      ) => {
        if (step === "personas" && current.personaIds.length === 0) {
          // Import lazily to avoid a circular ref at module top-level.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { LAUNCH_PERSONAS } = require("./workflow") as typeof import("./workflow");
          const existing = LAUNCH_PERSONAS.filter(
            (p: { origin: string }) => p.origin === "existing",
          ).map((p: { id: string }) => p.id);
          return { ...current, personaIds: existing };
        }
        return current;
      };

      // Flip the workflow step IMMEDIATELY so the right pane swaps to
      // the *next* step's canvas (which renders a loader while the
      // tool-call narrates in chat). Then after the fake delay, flip
      // the tool-call to done + append the step's intro message.
      const appended: SpotMessage[] = [];
      if (narration) {
        appended.push({ role: "spot", parts: [{ type: "text", text: narration }] });
      }

      const nextWorkflow: LaunchWorkflow = {
        ...s.workflow,
        step: upcoming,
        approvals: preselectFor(upcoming, s.workflow.approvals),
      };

      if (tc) {
        appended.push({
          role: "spot",
          parts: [
            {
              type: "tool-call",
              id: callId,
              agent: tc.agent,
              detail: tc.detail,
              status: "running",
            },
          ],
        });
        // After the fake delay, flip the tool-call to done + append the
        // step intro. Step itself already advanced.
        setTimeout(() => {
          set((s2) => {
            if (!s2.workflow) return {};
            const intro = stepIntroMessage(upcoming, s2.workflow);
            const updatedThread = s2.thread.map((m) => {
              if (m.role !== "spot") return m;
              return {
                ...m,
                parts: m.parts.map((p) =>
                  p.type === "tool-call" && p.id === callId
                    ? { ...p, status: "done" as const }
                    : p,
                ),
              };
            });
            const finalThread = intro ? [...updatedThread, intro] : updatedThread;
            return { thread: finalThread };
          });
        }, tc.delayMs);
        return { workflow: nextWorkflow, thread: [...s.thread, ...appended] };
      }

      // No tool call configured for this transition — advance synchronously.
      const intro = stepIntroMessage(upcoming, nextWorkflow);
      if (intro) appended.push(intro);
      return { workflow: nextWorkflow, thread: [...s.thread, ...appended] };
    }),

  gotoStep: (step) =>
    set((s) => (s.workflow ? { workflow: { ...s.workflow, step } } : {})),

  setWorkflowBudget: (b) =>
    set((s) => (s.workflow ? { workflow: { ...s.workflow, budget: b } } : {})),

  toggleWorkflowApproval: (group, id) =>
    set((s) => {
      if (!s.workflow) return {};
      const current = s.workflow.approvals[group];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return {
        workflow: {
          ...s.workflow,
          approvals: { ...s.workflow.approvals, [group]: next },
        },
      };
    }),

  attachVoiceAgent: (agentId) =>
    set((s) => (s.workflow ? { workflow: { ...s.workflow, attachedVoiceAgentId: agentId } } : {})),

  exitWorkflow: () => set({ workflow: null, canvasOpen: true, viewHomeOverride: false }),

  setCanvasOpen: (open) => set({ canvasOpen: open }),
  toggleCanvas: () => set((s) => ({ canvasOpen: !s.canvasOpen })),

  showHomeView: () => set({ viewHomeOverride: true }),
  resumeWorkflow: () => set({ viewHomeOverride: false, canvasOpen: true }),

  connectWhatsApp: () =>
    set((s) => ({
      whatsAppConnected: true,
      toast: "WhatsApp Business connected · Click-to-WA ads can now run.",
      // Drop a small Spot message so the chat reflects the change.
      thread: s.workflow
        ? [
            ...s.thread,
            {
              role: "spot",
              parts: [
                {
                  type: "text",
                  text: "Connected your WhatsApp Business account. Click-to-WhatsApp + Outreach WA campaigns are now available on the right.",
                },
              ],
            },
          ]
        : s.thread,
    })),

  setScope: (scope) => set({ scope }),
  appendMessage: (m) => set((s) => ({ thread: [...s.thread, m] })),
  setThread: (m) =>
    set((s) => ({ thread: typeof m === "function" ? m(s.thread) : m })),

  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false, maximized: false }),
  togglePanel: () => set((s) => ({ open: !s.open, maximized: s.open ? false : s.maximized })),
  toggleMaximize: () => set((s) => ({ maximized: !s.maximized, open: true })),
  setMaximized: (v) => set({ maximized: v }),

  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),

  // Legacy callers across the platform still call openGuided() expecting
  // a modal. The modal is dead — we now redirect to /spot and seed a
  // thread that walks the user through the same step inline. The
  // SpotRedirector watches `open` and routes accordingly.
  openGuided: (payload) =>
    set(() => ({
      open: true,
      maximized: false,
      pendingQuery: null,
      thread: [
        {
          role: "spot",
          parts: [
            {
              type: "headline",
              text: `Starting: ${guidedKindLabel[payload.kind]}.`,
              verdict: "info",
            },
            {
              type: "text",
              text: "I'll walk us through this here — no modals. Approve each step inline and I'll dispatch the right agent in the background.",
            },
            {
              type: "handoff",
              kind: payload.kind,
              label: `Continue · ${guidedKindLabel[payload.kind]}`,
              reason: "I'll handle the next step inline.",
            },
          ],
        },
      ],
    })),
  closeGuided: () => set({ guided: null }),

  showToast: (text) => set({ toast: text }),
  dismissToast: () => set({ toast: null }),
}));

/** Resolve a scope object from a "workspace" | "project:<id>" | "campaign:<id>" string. */
export function scopeFromRoute(
  pathname: string,
  resolve: { project?: (id: string) => string | null; campaign?: (id: string) => string | null } = {},
): SpotScope {
  // Path patterns: /projects/<id>, /campaigns/<id>, otherwise workspace
  const projMatch = pathname.match(/^\/projects\/([^/?#]+)/);
  if (projMatch) {
    const label = resolve.project?.(projMatch[1]) || "Project";
    return { kind: "project", label, target: projMatch[1] };
  }
  const campMatch = pathname.match(/^\/campaigns\/([^/?#]+)/);
  if (campMatch) {
    const label = resolve.campaign?.(campMatch[1]) || "Campaign";
    return { kind: "campaign", label, target: campMatch[1] };
  }
  return { kind: "workspace", label: "Workspace" };
}

/** Map a guided flow kind to a friendly label. */
export const guidedKindLabel: Record<GuidedKind, string> = {
  "new-persona": "Add a new persona",
  "new-angle": "Add a new angle",
  "launch-creative": "Launch new creatives",
  "new-campaign": "New campaign",
  "new-adset": "New ad set",
};
