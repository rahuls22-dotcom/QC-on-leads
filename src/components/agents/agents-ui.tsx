"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { agents, findAgent, type AgentStatus } from "@/lib/agents-data";
import { PauseModal, ResumeModal, SlackModal } from "./modals";

// Shared client state for the /agents section:
//   - status overrides   → pause/resume reflected across list + scorecard
//   - modal state        → pause/resume/slack dialogs opened from anywhere
//
// Lives at the /agents layout level so list rows and the scorecard share one
// source of truth without prop-drilling or a global store.

type ModalState =
  | { kind: "pause"; agentId: string }
  | { kind: "resume"; agentId: string }
  | { kind: "slack" }
  | null;

interface AgentsUI {
  statusOf: (id: string) => AgentStatus;
  openPause: (id: string) => void;
  openResume: (id: string) => void;
  openSlack: () => void;
}

const Ctx = createContext<AgentsUI | null>(null);

export function useAgentsUI(): AgentsUI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAgentsUI must be used within <AgentsUIProvider>");
  return ctx;
}

/** Reactive status for one agent, honoring any pause/resume override. */
export function useAgentStatus(id: string): AgentStatus {
  return useAgentsUI().statusOf(id);
}

export function AgentsUIProvider({ children }: { children: ReactNode }) {
  // Seed overrides from the source data; pause/resume mutate this map.
  const [overrides, setOverrides] = useState<Record<string, AgentStatus>>(() =>
    Object.fromEntries(agents.map((a) => [a.id, a.status])),
  );
  const [modal, setModal] = useState<ModalState>(null);

  const statusOf = useCallback(
    (id: string): AgentStatus => overrides[id] ?? findAgent(id)?.status ?? "live",
    [overrides],
  );

  const setStatus = useCallback((id: string, status: AgentStatus) => {
    setOverrides((prev) => ({ ...prev, [id]: status }));
  }, []);

  const value = useMemo<AgentsUI>(
    () => ({
      statusOf,
      openPause: (id) => setModal({ kind: "pause", agentId: id }),
      openResume: (id) => setModal({ kind: "resume", agentId: id }),
      openSlack: () => setModal({ kind: "slack" }),
    }),
    [statusOf],
  );

  const close = () => setModal(null);

  return (
    <Ctx.Provider value={value}>
      {children}

      {modal?.kind === "pause" && (
        <PauseModal
          agentId={modal.agentId}
          onConfirm={() => {
            setStatus(modal.agentId, "paused");
            close();
          }}
          onClose={close}
        />
      )}
      {modal?.kind === "resume" && (
        <ResumeModal
          agentId={modal.agentId}
          onConfirm={() => {
            setStatus(modal.agentId, "live");
            close();
          }}
          onClose={close}
        />
      )}
      {modal?.kind === "slack" && <SlackModal onClose={close} />}
    </Ctx.Provider>
  );
}
