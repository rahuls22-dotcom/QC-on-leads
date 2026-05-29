"use client";

import { create } from "zustand";
import type { GuidedKind, GuidedPayload, SpotMessage, SpotScope } from "./types";
import {
  EMPTY_APPROVALS,
  nextStepFor,
  stepIntroMessage,
  STEP_TOOL_CALL,
  type CampaignDiveWorkflow,
  type CanvasFile,
  type DiagnosticWorkflow,
  type LaunchWorkflow,
  type ProductSetupAnswers,
  type SpotWorkflow,
  type WorkflowBudget,
  type WorkflowKind,
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

  // Active workflow — launch-campaign, scale, optimize, or test-angles.
  // null = no workflow active, single-column chat.
  workflow: SpotWorkflow | null;
  // Whether the right-pane canvas is visible. Workflow state is
  // preserved when this is false — the user just gets the chat wider
  // so they can read uninterrupted, like collapsing Claude's preview.
  canvasOpen: boolean;
  // Files currently open in the canvas. Length 0..2 — closing the
  // last one hides the canvas. Order = left-to-right pane order.
  // Drives the multi-pane canvas (Claude-style "open two files side
  // by side"). The picker dropdown lives in the chat header so the
  // user opens / focuses files from the same side they type on.
  canvasFiles: CanvasFile[];
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
  /** Handle a chat-driven answer during the product-setup Q&A. Each
   *  call advances the stage (name → url → files → ready) and appends
   *  Spot's next question. The final "ready" stage triggers
   *  startDeepResearch automatically. */
  handleProductSetupAnswer: (text: string) => void;
  /** Attach files during product-setup. Mirrors the attachment as a
   *  user message in the chat. */
  attachProductSetupFiles: (fileNames: string[]) => void;
  /** Submit the new-product modal · captures name + URL + files in one
   *  shot, mirrors the input as a user message in chat, then triggers
   *  deep research. Replaces the chat-driven Q&A for the first step. */
  submitProductSetupForm: (data: {
    name: string;
    url?: string;
    files?: string[];
  }) => void;
  /** Spot doesn't recognise the product — fake-research it in real-time. */
  startDeepResearch: (productName: string, attachedFiles?: string[]) => void;
  /** Start the Scale workflow against an existing product. */
  startScaleFlow: (product: { id: string; name: string }) => void;
  /** Start the Optimize workflow against an existing product. */
  startOptimizeFlow: (product: { id: string; name: string }) => void;
  /** Start the Test New Angles workflow against an existing product. */
  startTestAnglesFlow: (product: { id: string; name: string }) => void;
  /** Start the campaign-dive surface · chat-left + campaign-detail right.
   *  Called by the "Spot it" button on campaign / ad-set / ad rows. */
  startCampaignDive: (entity: {
    id: string;
    name: string;
    tier: "campaign" | "adset" | "ad";
    productId: string;
    productName: string;
    channel: "Meta" | "Google";
    metaUrl: string;
  }) => void;
  /** Advance the workflow to the next step + seed a Spot narration message. */
  advanceWorkflow: (narration?: string) => void;
  /** Jump to a specific step (used for "edit a previous step"). */
  gotoStep: (step: WorkflowStep) => void;
  setWorkflowBudget: (b: WorkflowBudget) => void;
  toggleWorkflowApproval: (group: "personaIds" | "angleIds" | "formIds", id: string) => void;
  /** Set an answer at the clarify step (questionId → optionId). */
  setClarifyAnswer: (questionId: string, value: string) => void;
  /** Pre-populate all clarify defaults at once (called on entering clarify). */
  primeClarifyDefaults: (defaults: Record<string, string>) => void;
  /** Pick / change the voice agent attached to outbound campaigns. */
  attachVoiceAgent: (agentId: string | null) => void;
  exitWorkflow: () => void;
  /** Collapse the right-pane canvas without losing workflow state. */
  setCanvasOpen: (open: boolean) => void;
  /** Convenience toggler used by the canvas open/close buttons. */
  toggleCanvas: () => void;
  /** Open (or focus) a file in the canvas. If already open → no-op.
   *  If 2 files are already open → replaces the second one. Opens
   *  the canvas if it was collapsed. */
  openCanvasFile: (file: CanvasFile) => void;
  /** Replace the entire canvas with a single pane showing this file.
   *  Used for workflow step transitions (kickoff → plan etc.) so
   *  advancing the workflow swaps the active file rather than
   *  stacking it as a second pane. */
  focusCanvasFile: (file: CanvasFile) => void;
  /** Close a single pane. If it was the last pane → canvas collapses. */
  closeCanvasFile: (file: CanvasFile) => void;
  /** Park the workflow and render the homepage (workflow stays alive). */
  showHomeView: () => void;
  /** Resume the active workflow (homepage banner / past-chats click). */
  resumeWorkflow: () => void;
  /** Set of step-CTA labels the user has already clicked in the
   *  current workflow. We hide the button after click so the chat
   *  doesn't render the same dark CTA next to the user's echo. */
  clickedCtas: Set<string>;
  markCtaClicked: (label: string) => void;
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

/**
 * Build the initial state for a Diagnostic flow (Scale / Optimize /
 * Test-Angles). All three share the structure — only the first step,
 * tool-call narration, and intro copy differ.
 *
 * After the fake delay, the loader resolves: `ready` flips to true and
 * the first step's intro message appears with its CTA.
 */
function startDiagnostic(
  set: (
    fn: (s: PanelState) => Partial<PanelState> | PanelState,
  ) => void,
  kind: DiagnosticWorkflow["kind"],
  product: { id: string; name: string },
  firstStep: WorkflowStep,
  copy: { headline: string; intro: string },
) {
  const callId = `tc-${Date.now()}`;
  const tc = STEP_TOOL_CALL[firstStep];

  set(() => ({
    open: true,
    maximized: false,
    canvasOpen: true,
    viewHomeOverride: false,
    clickedCtas: new Set<string>(),
    scope: { kind: "project", label: product.name, target: product.id },
    pendingQuery: null,
    workflow: {
      kind,
      step: firstStep,
      productId: product.id,
      productName: product.name,
      startedAt: Date.now(),
      ready: false,
      clarifyAnswers: {},
      planApproved: false,
    },
    thread: [
      {
        role: "spot",
        parts: [
          { type: "headline", text: copy.headline, verdict: "info" },
          { type: "text", text: copy.intro },
          {
            type: "tool-call",
            id: callId,
            agent: tc?.agent ?? "spot.analyze",
            detail: tc?.detail ?? "running analysis…",
            status: "running",
          },
        ],
      },
    ],
  }));

  // After the fake delay, reveal the canvas + drop the first step CTA.
  setTimeout(() => {
    set((s) => {
      if (!s.workflow || s.workflow.kind === "launch-campaign") return {};
      const intro = stepIntroMessage(firstStep, s.workflow);
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
      return {
        workflow: { ...s.workflow, ready: true },
        thread: intro ? [...updatedThread, intro] : updatedThread,
      };
    });
  }, tc?.delayMs ?? 3400);
}

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
  canvasFiles: ["memory"],
  viewHomeOverride: false,
  clickedCtas: new Set<string>(),
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
      clickedCtas: new Set<string>(),
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
        if (!s.workflow || s.workflow.kind !== "launch-campaign") return {};
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
              label: "Looks right — show me the plan",
              helper: "I'll fold personas, media, creatives, landing pages, and campaigns into one plan to approve.",
              refineHint: "or tell me what's missing",
            },
          ],
        };
        return { workflow: nextWorkflow, thread: [...updatedThread, summary] };
      });
    }, 4500);
  },

  // Kicks off the new-product flow. The thread leads with a user
  // bubble ("Let's start working on a new product.") so the
  // conversation reads naturally from the top — Spot's response
  // follows with the running intake tool-call. The inline question
  // card slides into the thread ~1.4s later, after the tool-call
  // resolves.
  startNewProductFlow: () => {
    const callId = `tc-form-${Date.now()}`;
    set(() => ({
      open: true,
      maximized: false,
      canvasOpen: true,
      canvasFiles: ["memory"],
      viewHomeOverride: false,
      clickedCtas: new Set<string>(),
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
        productSetupStage: "name",
        productSetupAnswers: {},
        productSetupModalOpen: false,
      },
      thread: [
        { role: "user", text: "Let's start working on a new product." },
        {
          role: "spot",
          parts: [
            {
              type: "text",
              text:
                "Got it — spinning up a quick intake. Name, brand URL, and any files you have. " +
                "I'll pull what I can and write the memory.",
            },
            {
              type: "tool-call",
              id: callId,
              agent: "Spot",
              detail: "preparing intake form…",
              status: "running",
            },
          ],
        },
      ],
    }));

    // After the fake delay, resolve the tool-call and open the
    // drawer. The drawer's own mount-effect handles the slide-up.
    setTimeout(() => {
      set((s) => {
        if (!s.workflow || s.workflow.kind !== "launch-campaign") return {};
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
        return {
          workflow: { ...s.workflow, productSetupModalOpen: true },
          thread: updatedThread,
        };
      });
    }, 1400);
  },

  // Modal submit — captures all three inputs at once. Mirrors the
  // input as a single user message, then triggers deep research.
  submitProductSetupForm: (data) => {
    const trimmedName = data.name.trim();
    if (!trimmedName) return;
    const state = useSpotStore.getState();
    const wf = state.workflow;
    if (!wf || wf.kind !== "launch-campaign" || wf.step !== "product-setup") return;

    const url = data.url?.trim() || undefined;
    const files = data.files && data.files.length > 0 ? data.files : undefined;

    const answers: ProductSetupAnswers = {
      name: trimmedName,
      url,
      files: files ?? [],
    };

    const nextWorkflow: LaunchWorkflow = {
      ...wf,
      productName: trimmedName,
      productSetupAnswers: answers,
      productSetupStage: "ready",
      productSetupModalOpen: false,
    };

    // The question card mirrors each answer as a user message as the
    // user advances — no need to append a combined summary here.
    // Just flip workflow state and let deep research take it from here.
    set(() => ({
      workflow: nextWorkflow,
    }));

    // Kick off deep research after a brief beat.
    setTimeout(() => {
      const cur = useSpotStore.getState();
      if (cur.workflow?.step !== "product-setup") return;
      cur.startDeepResearch(trimmedName, files ?? []);
    }, 600);
  },

  // Chat-driven product-setup Q&A · advances stage by stage. Each call
  // appends the user's answer as a chat message, stores the answer,
  // and either appends Spot's next question or triggers deep research
  // once all fields are captured.
  handleProductSetupAnswer: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const state = useSpotStore.getState();
    const wf = state.workflow;
    if (!wf || wf.kind !== "launch-campaign" || wf.step !== "product-setup") return;

    const stage = wf.productSetupStage ?? "name";
    const answers: ProductSetupAnswers = { ...(wf.productSetupAnswers ?? {}) };
    const userMsg: SpotMessage = { role: "user", text: trimmed };

    // "skip" / "none" treated as explicit "no value" — accepted on
    // optional stages (url, files), rejected on required (name).
    const skipped =
      stage !== "name" && /^(skip|none|no|nope|nada|nothing)\b/i.test(trimmed);

    if (stage === "name") {
      answers.name = trimmed;
      const nextWorkflow: LaunchWorkflow = {
        ...wf,
        productName: trimmed,
        productSetupAnswers: answers,
        productSetupStage: "url",
      };
      const reply: SpotMessage = {
        role: "spot",
        parts: [
          {
            type: "text",
            text: `Got it · **${trimmed}**.\n\nDo you have a brand URL or landing page I can crawl? Paste it here, or type **skip** if you don't have one yet.`,
          },
        ],
      };
      set((s) => ({
        workflow: nextWorkflow,
        thread: [...s.thread, userMsg, reply],
      }));
      return;
    }

    if (stage === "url") {
      if (!skipped) answers.url = trimmed;
      const nextWorkflow: LaunchWorkflow = {
        ...wf,
        productSetupAnswers: answers,
        productSetupStage: "files",
      };
      const acknowledged = skipped
        ? "No URL · that's fine."
        : `Reading **${trimmed}**.`;
      const reply: SpotMessage = {
        role: "spot",
        parts: [
          {
            type: "text",
            text: `${acknowledged}\n\nAnything else worth sharing? Brochures, decks, internal PDFs — drop them in chat with the **Attach** button below, or type **skip** to start research.`,
          },
        ],
      };
      set((s) => ({
        workflow: nextWorkflow,
        thread: [...s.thread, userMsg, reply],
      }));
      return;
    }

    if (stage === "files") {
      // The user is either skipping or saying something like "no, just go".
      const nextWorkflow: LaunchWorkflow = {
        ...wf,
        productSetupAnswers: answers,
        productSetupStage: "ready",
      };
      const reply: SpotMessage = {
        role: "spot",
        parts: [
          {
            type: "text",
            text: `Perfect — starting deep research on **${answers.name}** now.`,
          },
        ],
      };
      set((s) => ({
        workflow: nextWorkflow,
        thread: [...s.thread, userMsg, reply],
      }));
      // Kick off deep research after a brief beat so the reply lands.
      setTimeout(() => {
        const cur = useSpotStore.getState();
        if (cur.workflow?.step !== "product-setup") return;
        cur.startDeepResearch(answers.name ?? "Untitled product", answers.files ?? []);
      }, 700);
      return;
    }
  },

  // Files attached via the composer's Attach button during the files
  // stage. Mirrors as a user message ("📎 Attached · file1.pdf, file2.pdf")
  // and stores the names in the workflow.
  attachProductSetupFiles: (fileNames) => {
    if (fileNames.length === 0) return;
    const state = useSpotStore.getState();
    const wf = state.workflow;
    if (
      !wf ||
      wf.kind !== "launch-campaign" ||
      wf.step !== "product-setup" ||
      wf.productSetupStage !== "files"
    )
      return;

    const answers: ProductSetupAnswers = {
      ...(wf.productSetupAnswers ?? {}),
      files: [...(wf.productSetupAnswers?.files ?? []), ...fileNames],
    };
    const userMsg: SpotMessage = {
      role: "user",
      text: `📎 Attached · ${fileNames.join(", ")}`,
    };
    const reply: SpotMessage = {
      role: "spot",
      parts: [
        {
          type: "text",
          text: `Got ${fileNames.length} file${fileNames.length === 1 ? "" : "s"} · I'll parse ${fileNames.length === 1 ? "it" : "them"} as part of the research. Drop more files or type **skip** to start.`,
        },
      ],
    };
    set((s) => ({
      workflow: { ...wf, productSetupAnswers: answers },
      thread: [...s.thread, userMsg, reply],
    }));
  },

  // The user mentioned a product we don't have on file. Instead of
  // crashing on "no memory found", we kick off a deep-research arc —
  // spawn the Research Agent, show progress on the canvas, then on a
  // delay synthesise the memory and advance to kickoff. From the
  // user's POV it feels like Spot just learned about the product.
  startDeepResearch: (productName, attachedFiles = []) => {
    // Single phase: the Deep Research Agent crawls, parses, AND writes
    // the memory itself. No separate "Memory Builder" tool-call —
    // it's the same agent doing the work end-to-end. After ~8s the
    // memory reveals on the right canvas.
    const researchCallId = `tc-research-${Date.now()}`;
    const hasFiles = attachedFiles.length > 0;
    // Append (not replace) the thread so any prior turn — the user's
    // form submission, intake tool-call, or "launch a campaign for X"
    // prompt — stays visible above the research narration.
    set((s) => ({
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
        // kickoffReady stays false through both loader phases so the
        // canvas knows to keep showing the loader (not the memory).
        kickoffReady: false,
        attachedVoiceAgentId: null,
      },
      thread: [
        ...s.thread,
        {
          role: "spot",
          parts: [
            {
              type: "text",
              text: hasFiles
                ? `On it — dispatching the Deep Research Agent. Crawling the URL, parsing your ${attachedFiles.length} file${attachedFiles.length === 1 ? "" : "s"}, searching the open web, then writing everything to product memory.`
                : `On it — dispatching the Deep Research Agent. Crawling the URL, searching the open web for category signals, then writing everything to product memory.`,
            },
            {
              type: "tool-call",
              id: researchCallId,
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

    // ── Research done · flip to kickoff, reveal memory, ship CTA ──
    // After ~8s, flip the deep-research tool-call to done, transition
    // step to "kickoff" with researchedMemory populated, append the
    // kickoff intro message with the step-cta. The single tool-call
    // does it all — no separate Memory Builder.
    setTimeout(() => {
      set((s) => {
        if (!s.workflow || s.workflow.kind !== "launch-campaign") return {};
        const researched: import("./workflow").ResearchedMemory = {
          tagline: `${productName} — fresh research from Spot. Memory pre-filled; edit any field in chat.`,
          brief: [
            { icon: "📅", label: "Duration", value: "2 years · cohort-led" },
            { icon: "👥", label: "Cohort size", value: "Capped at 60 · live classes" },
            { icon: "📚", label: "Curriculum", value: "Category-standard · benchmarked against top 3 incumbents" },
            { icon: "👨‍🏫", label: "Mentors", value: "Senior alumni · 1:1 monthly review" },
            { icon: "🎯", label: "Outcome", value: "Entrance-exam preparation track" },
          ],
          personas: [
            {
              name: "Working professional · Aspiring fluent speaker",
              meta: "25-34 · tier-1/2 cities · LinkedIn-active",
              pain: "Stalled career growth from English gap",
            },
            {
              name: "College student · Interview prep",
              meta: "18-24 · semi-urban · YouTube-heavy",
              pain: "Campus placement interviews",
            },
            {
              name: "Parent · Buying for child",
              meta: "32-45 · tier-2/3 cities · WhatsApp + Facebook",
              pain: "Child's school confidence",
            },
          ],
          usps: [
            "Strongest category signal: live cohort + mentor-led delivery beats pure-recorded on retention.",
            "Pricing band sits in the median tier — room to test premium / lite variants once we have data.",
            "Closest competitor's positioning is rank-led; an outcomes-led counter-position should win on trust.",
            "60-student cap and named-mentor framing test well against generic 'best coaching' positioning.",
          ],
          avoid: [
            "Don't promise specific outcomes (ranks, jobs, admits) — likely flagged by legal.",
            "Skip celebrity-endorsement framing unless explicitly cleared.",
            "Avoid name-checking competitors (Allen, Aakash, FIITJEE) — reads as insecure.",
          ],
          pricing: [
            { name: "2-year cohort", cost: "₹62,000", cadence: "one-shot", badge: "Suggested · median band" },
            { name: "2-year · EMI", cost: "₹5,600", cadence: "/month · 12 months" },
            { name: "1-year intensive", cost: "₹36,000", cadence: "one-shot" },
          ],
          offers: [
            { label: "Early-bird · 10% off", meta: "first 14 days" },
            { label: "Sibling discount · 8%", meta: "stackable" },
            { label: "14-day money-back", meta: "no questions" },
            { label: "Refer-a-friend · ₹3K credit", meta: "post-enrol" },
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
          kickoffReady: true,
        };
        // Flip the Deep Research tool-call to done + append the kickoff
        // intro with the step-cta. Single agent does the whole arc.
        const updatedThread = s.thread.map((m) => {
          if (m.role !== "spot") return m;
          return {
            ...m,
            parts: m.parts.map((p) =>
              p.type === "tool-call" && p.id === researchCallId
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
              label: "Looks right — show me the plan",
              helper: "I'll fold personas, media, creatives, landing pages, and campaigns into one plan to approve.",
              refineHint: "or tell me what's missing",
            },
          ],
        };
        return { workflow: nextWorkflow, thread: [...updatedThread, kickoff] };
      });
    }, 14000); // Deliberately slower so each loader stage gets to breathe
  },

  // Diagnostic workflows — Scale, Optimize, Test-Angles. They all share
  // the same shape, so a helper builds the initial state. The chat opens
  // with a "what I'm about to do" line + a running tool-call for the
  // first step. The right pane shows a loader; once the tool-call
  // resolves it reveals the analysis canvas + the first step CTA.
  startScaleFlow: (product) => {
    startDiagnostic(set, "scale", product, "scale-analyze", {
      headline: `Scaling ${product.name}.`,
      intro:
        "Let me pull up what I know about this product first — recent winners, audience headroom, where money's underspent. I'll lay it out on the right, and then we'll talk about goals.",
    });
  },
  startOptimizeFlow: (product) => {
    startDiagnostic(set, "optimize", product, "opt-analyze", {
      headline: `Optimizing ${product.name}.`,
      intro:
        "First, the analysis — I'll show you what's broken and *why* (creative fatigue, sentiment, competitor moves, landing pages). Then we'll set the priority together.",
    });
  },
  startTestAnglesFlow: (product) => {
    startDiagnostic(set, "test-angles", product, "ang-analyze", {
      headline: `Testing new angles · ${product.name}.`,
      intro:
        "Auditing last 30 days of creative first — winners, losers, the pattern underneath. Then we'll set focus + budget for the test.",
    });
  },

  startCampaignDive: (entity) => {
    // Open the chat + canvas split-screen with the campaign in focus.
    // The chat seeds with a short framing message so the user can start
    // asking immediately ("why is CPL up?", "should I pause this?").
    set(() => ({
      open: true,
      maximized: false,
      canvasOpen: true,
      viewHomeOverride: false,
      scope: {
        kind: "campaign",
        label: entity.name,
        target: entity.id,
      },
      pendingQuery: null,
      workflow: {
        kind: "campaign-dive",
        step: "campaign-dive",
        productId: entity.productId,
        productName: entity.productName,
        entityId: entity.id,
        entityName: entity.name,
        entityTier: entity.tier,
        channel: entity.channel,
        metaUrl: entity.metaUrl,
        startedAt: Date.now(),
      },
      thread: [
        {
          role: "spot",
          parts: [
            {
              type: "text",
              text: `Looking at **${entity.name}** on the right. Ask me anything — why a metric moved, whether to pause, what to scale — or use the quick actions on the canvas.`,
            },
          ],
        },
      ],
    }));
  },

  advanceWorkflow: (narration) =>
    set((s) => {
      if (!s.workflow) return {};
      const upcoming = nextStepFor(s.workflow.kind, s.workflow.step);
      const tc = STEP_TOOL_CALL[upcoming];
      const callId = `tc-${Date.now()}`;
      // Flip the workflow step IMMEDIATELY so the right pane swaps to
      // the *next* step's canvas (which renders a loader while the
      // tool-call narrates in chat). Then after the fake delay, flip
      // the tool-call to done + append the step's intro message.
      const appended: SpotMessage[] = [];
      if (narration) {
        appended.push({ role: "spot", parts: [{ type: "text", text: narration }] });
      }

      const nextWorkflow: SpotWorkflow = (() => {
        if (s.workflow.kind === "launch-campaign") {
          const current = s.workflow.approvals;
          let approvals = current;
          // Pre-select sensible defaults so the user sees selected state
          // immediately on entering a step (clearer than "0 selected").
          if (upcoming === "personas" && current.personaIds.length === 0) {
            // Import lazily to avoid a circular ref at module top-level.
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { LAUNCH_PERSONAS } = require("./workflow") as typeof import("./workflow");
            const existing = LAUNCH_PERSONAS.filter(
              (p: { origin: string }) => p.origin === "existing",
            ).map((p: { id: string }) => p.id);
            approvals = { ...current, personaIds: existing };
          }
          return { ...s.workflow, step: upcoming, approvals };
        }
        // Campaign-dive is single-step — no advancement state to track.
        if (s.workflow.kind === "campaign-dive") {
          return { ...s.workflow, step: upcoming };
        }
        // Diagnostic flows — when advancing from `plan` to `live`,
        // flip planApproved so the live canvas knows the user signed
        // off (drives the dashboard recommendation feed).
        const planApproved = upcoming.endsWith("-live") ? true : s.workflow.planApproved;
        // Reset `ready` on EVERY diagnostic step transition so the
        // dark Spot loader runs through each phase (analyze →
        // clarify → plan → live). Without this, the loader only
        // fires on the first step and subsequent phases land cold.
        const ready = false;
        return { ...s.workflow, step: upcoming, planApproved, ready };
      })();

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

        // Stay in the chat panel on launch-building — the new
        // "Spot is working" drawer lives inline in the thread and
        // gives the user View memory / Spot homepage actions. No
        // forced redirect to the homepage anymore.
        const extraSetterPayload: Partial<PanelState> = {};

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
            // Diagnostic plan/live steps gate canvas reveal on `ready`.
            // When the tool-call resolves we flip ready=true so the
            // canvas blooms into the plan / live state.
            const workflow =
              s2.workflow.kind !== "launch-campaign"
                ? { ...s2.workflow, ready: true }
                : s2.workflow;
            return { thread: finalThread, workflow };
          });

          // launch-building auto-advances to launch-review after the
          // tool-call resolves. The user doesn't need to click anything —
          // Spot finished building, surfaces the review notification.
          if (upcoming === "launch-building") {
            // Small additional beat so the "Got it · working on X" intro
            // message lands and the user sees it briefly before the
            // "ready to review" intro takes over.
            setTimeout(() => {
              // Call the advance function from the live store reference.
              const store = useSpotStore.getState();
              if (store.workflow && store.workflow.step === "launch-building") {
                store.advanceWorkflow();
              }
            }, 600);
          }
        }, tc.delayMs);
        return {
          workflow: nextWorkflow,
          thread: [...s.thread, ...appended],
          ...extraSetterPayload,
        };
      }

      // No tool call configured for this transition — advance synchronously.
      const intro = stepIntroMessage(upcoming, nextWorkflow);
      if (intro) appended.push(intro);
      return { workflow: nextWorkflow, thread: [...s.thread, ...appended] };
    }),

  gotoStep: (step) =>
    set((s) => (s.workflow ? { workflow: { ...s.workflow, step } } : {})),

  setWorkflowBudget: (b) =>
    set((s) =>
      s.workflow && s.workflow.kind === "launch-campaign"
        ? { workflow: { ...s.workflow, budget: b } }
        : {},
    ),

  toggleWorkflowApproval: (group, id) =>
    set((s) => {
      if (!s.workflow || s.workflow.kind !== "launch-campaign") return {};
      const current = s.workflow.approvals[group];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return {
        workflow: {
          ...s.workflow,
          approvals: { ...s.workflow.approvals, [group]: next },
        },
      };
    }),

  setClarifyAnswer: (questionId, value) =>
    set((s) => {
      // Only diagnostic flows have clarifyAnswers.
      if (
        !s.workflow ||
        s.workflow.kind === "launch-campaign" ||
        s.workflow.kind === "campaign-dive"
      )
        return {};
      return {
        workflow: {
          ...s.workflow,
          clarifyAnswers: { ...s.workflow.clarifyAnswers, [questionId]: value },
        },
      };
    }),

  primeClarifyDefaults: (defaults) =>
    set((s) => {
      if (
        !s.workflow ||
        s.workflow.kind === "launch-campaign" ||
        s.workflow.kind === "campaign-dive"
      )
        return {};
      // Don't overwrite anything the user has already set — only fill blanks.
      // CRITICAL: bail out early if no blanks remain. The caller's useEffect
      // can fire on every render (the questions array is a fresh ref each
      // time), but as long as we don't return a new workflow object here,
      // no re-render is triggered and the loop terminates.
      const current = s.workflow.clarifyAnswers;
      let hasBlank = false;
      for (const key of Object.keys(defaults)) {
        if (!(key in current)) {
          hasBlank = true;
          break;
        }
      }
      if (!hasBlank) return {};
      const merged = { ...defaults, ...current };
      return { workflow: { ...s.workflow, clarifyAnswers: merged } };
    }),

  attachVoiceAgent: (agentId) =>
    set((s) =>
      s.workflow && s.workflow.kind === "launch-campaign"
        ? { workflow: { ...s.workflow, attachedVoiceAgentId: agentId } }
        : {},
    ),

  exitWorkflow: () =>
    set({
      workflow: null,
      canvasOpen: true,
      viewHomeOverride: false,
      clickedCtas: new Set<string>(),
    }),

  markCtaClicked: (label) =>
    set((s) => {
      if (s.clickedCtas.has(label)) return {};
      const next = new Set(s.clickedCtas);
      next.add(label);
      return { clickedCtas: next };
    }),

  setCanvasOpen: (open) => set({ canvasOpen: open }),
  toggleCanvas: () => set((s) => ({ canvasOpen: !s.canvasOpen })),

  openCanvasFile: (file) =>
    set((s) => {
      // Already open → focus by opening the canvas if needed.
      if (s.canvasFiles.includes(file)) {
        return { canvasOpen: true };
      }
      // 0 panes → open as first.
      if (s.canvasFiles.length === 0) {
        return { canvasOpen: true, canvasFiles: [file] };
      }
      // 1 pane → add as second (split view).
      if (s.canvasFiles.length === 1) {
        return { canvasOpen: true, canvasFiles: [...s.canvasFiles, file] };
      }
      // 2 panes → replace the second one (max 2 panes).
      return { canvasOpen: true, canvasFiles: [s.canvasFiles[0], file] };
    }),

  focusCanvasFile: (file) =>
    set(() => ({ canvasOpen: true, canvasFiles: [file] })),

  closeCanvasFile: (file) =>
    set((s) => {
      const next = s.canvasFiles.filter((f) => f !== file);
      if (next.length === 0) {
        return { canvasFiles: [], canvasOpen: false };
      }
      return { canvasFiles: next };
    }),

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
