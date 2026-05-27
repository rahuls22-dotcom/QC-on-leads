"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Check,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Pencil,
  X,
  Phone,
  Mail,
  User,
  Wallet,
  Clock,
  MapPin,
  Home,
  ListChecks,
} from "lucide-react";
import type {
  ProjectDetail,
  LeadForm,
  LeadFormQuestion,
  LeadFormQuestionKind,
  Persona,
} from "@/lib/project-data";
import { mutateRuntimeProject } from "@/lib/project-data";
import { SectionHeader } from "./shared/section-header";
import { useSpotStore } from "@/lib/spot/store";

/**
 * Forms tab — lead-capture forms for the project.
 *
 * Model:
 *   · A project has 0..N forms.
 *   · Exactly one form is the **default** (personaId === null) and acts
 *     as the fallback for any persona that doesn't have its own form.
 *   · Additional forms are persona-specific (personaId !== null) — useful
 *     when different personas warrant different qualification questions
 *     (an NRI investor's questions differ from a local family buyer's).
 *
 * Empty state explicitly tells the user that forms are required for any
 * campaign to actually go live. Populated state shows a 2-pane editor
 * (list left, editor right) so users can quickly switch between forms.
 */
export function FormsSection({
  project,
  onAsk,
}: {
  project: ProjectDetail;
  onAsk: (q: string) => void;
}) {
  const forms = useMemo(() => project.forms ?? [], [project.forms]);
  const [selectedId, setSelectedId] = useState<string | null>(
    forms[0]?.id ?? null,
  );

  // Keep selection valid as forms come and go.
  useEffect(() => {
    if (forms.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!forms.find((f) => f.id === selectedId)) {
      setSelectedId(forms[0].id);
    }
  }, [forms, selectedId]);

  const selected = forms.find((f) => f.id === selectedId) ?? null;
  const publishedCount = forms.filter((f) => f.status === "published").length;

  return (
    <div>
      <SectionHeader
        icon={FileText}
        title="Forms"
        subtitle={
          forms.length === 0
            ? "Required for any campaign to go live"
            : `${forms.length} form${forms.length === 1 ? "" : "s"} · ${publishedCount} published`
        }
        onAsk={() =>
          onAsk("Draft a lead form Spot would recommend for this project")
        }
        actions={
          forms.length > 0 ? (
            <NewFormButton project={project} onCreated={setSelectedId} />
          ) : null
        }
      />

      {forms.length === 0 ? (
        <EmptyFormsState project={project} onCreated={setSelectedId} />
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "300px minmax(0, 1fr)",
            alignItems: "start",
          }}
        >
          <FormsList
            forms={forms}
            personas={project.personas}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div>
            {selected ? (
              <FormEditor
                projectId={project.id}
                personas={project.personas}
                form={selected}
              />
            ) : (
              <div
                className="card-base p-10 text-center text-[12.5px] text-text-tertiary"
                style={{ background: "var(--bg-page)" }}
              >
                Pick a form on the left to edit.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────

function EmptyFormsState({
  project,
  onCreated,
}: {
  project: ProjectDetail;
  onCreated: (id: string) => void;
}) {
  const showToast = useSpotStore((s) => s.showToast);
  const createDefault = (withSpot: boolean) => {
    const id = `form-${Date.now().toString(36)}`;
    mutateRuntimeProject(project.id, (p) => {
      const f = makeDefaultForm(id, p, withSpot);
      p.forms = [...(p.forms || []), f];
    });
    onCreated(id);
    showToast(
      withSpot
        ? "Default form drafted — review and publish to unblock campaigns"
        : "Empty default form created — fill it in",
    );
  };

  return (
    <div
      className="rounded-[14px] p-6"
      style={{
        background:
          "linear-gradient(135deg, #FFFCEB 0%, #FFF7D6 60%, #FFFFFF 100%)",
        border: "1px dashed #E0CC95",
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, #E0CC95 0%, #C9A86A 100%)",
            color: "#FFF",
          }}
        >
          <AlertTriangle size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold mb-1">
            You need at least one form before any campaign can go live
          </div>
          <div className="text-[12px] text-text-secondary leading-[1.55] mb-3 max-w-[640px]">
            Meta won&apos;t let lead-gen campaigns run without a form
            attached. Build a <strong>default form</strong> for the project
            here — Spot can draft one based on your brief and personas.
          </div>
          <div
            className="rounded-[8px] p-2.5 mb-3 max-w-[640px] text-[11.5px] leading-[1.55] text-text-secondary"
            style={{
              background: "rgba(255,255,255,0.7)",
              border: "1px solid #E0CC95",
            }}
          >
            <strong className="text-text-primary">Recommendation:</strong>{" "}
            start with a single default form for the whole project — that&apos;s
            what works for most real-estate launches and keeps lead routing
            simple. Add <strong>persona-specific variants</strong> only when
            qualification questions genuinely diverge (e.g. an NRI investor
            needs a different budget band + a residence-country dropdown
            that a local family buyer doesn&apos;t).
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => createDefault(true)}
              className="apply-btn"
              style={{
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                height: 32,
                fontSize: 12,
                padding: "0 14px",
              }}
            >
              <Sparkles size={12} /> Draft default form with Spot
            </button>
            <button
              type="button"
              onClick={() => createDefault(false)}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-button border border-border bg-white text-[12px]"
            >
              <Plus size={12} /> Start blank
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New form button (populated state) ─────────────────────────────────

function NewFormButton({
  project,
  onCreated,
}: {
  project: ProjectDetail;
  onCreated: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const create = (personaId: string | null) => {
    const id = `form-${Date.now().toString(36)}`;
    mutateRuntimeProject(project.id, (p) => {
      const f = makeFormFor(id, p, personaId);
      p.forms = [...(p.forms || []), f];
    });
    onCreated(id);
    setOpen(false);
  };

  const availablePersonas = project.personas.filter(
    (p) =>
      // A persona can only have one form; if they already have one, skip.
      !(project.forms || []).some((f) => f.personaId === p.id),
  );
  const hasDefault = (project.forms || []).some((f) => f.personaId === null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="apply-btn"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
        }}
      >
        <Plus size={11} /> New form
      </button>
      {open && (
        <div
          className="absolute fadeUp"
          style={{
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            width: 280,
            background: "#FFF",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div
            className="uplabel px-2 pt-1 pb-1.5"
            style={{ fontSize: 9.5, color: "var(--text-tertiary)" }}
          >
            Target this form at
          </div>
          {!hasDefault && (
            <button
              type="button"
              onClick={() => create(null)}
              className="w-full text-left px-2.5 py-2 rounded-[6px] hover:bg-surface-page"
            >
              <div className="text-[12.5px] font-medium">
                Default form (every persona)
              </div>
              <div className="text-[10.5px] text-text-tertiary">
                Used as fallback when a persona has no specific form
              </div>
            </button>
          )}
          {availablePersonas.length === 0 && hasDefault ? (
            <div className="px-2.5 py-3 text-[11px] text-text-tertiary">
              Every persona already has a form.
            </div>
          ) : (
            availablePersonas.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => create(persona.id)}
                className="w-full text-left px-2.5 py-2 rounded-[6px] hover:bg-surface-page"
              >
                <div className="text-[12.5px] font-medium truncate">
                  {persona.name}
                </div>
                <div className="text-[10.5px] text-text-tertiary truncate">
                  {persona.role}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Forms list ─────────────────────────────────────────────────────────

function FormsList({
  forms,
  personas,
  selectedId,
  onSelect,
}: {
  forms: LeadForm[];
  personas: Persona[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card-base p-1.5">
      <div className="space-y-1">
        {forms.map((f) => {
          const persona = f.personaId
            ? personas.find((p) => p.id === f.personaId)
            : null;
          const active = selectedId === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelect(f.id)}
              className="w-full text-left p-2.5 rounded-[8px] transition-colors"
              style={{
                background: active ? "var(--bg-page)" : "transparent",
                border: `1px solid ${active ? "#1A1A1A" : "transparent"}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[12.5px] font-semibold truncate flex-1">
                  {f.name}
                </span>
                <StatusPill status={f.status} />
              </div>
              <div className="text-[10.5px] text-text-tertiary leading-tight truncate">
                {f.personaId === null ? "Default · every persona" : persona?.name || "Persona deleted"}
                {" · "}
                {f.questions.length} question{f.questions.length === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: LeadForm["status"] }) {
  const cfg =
    status === "published"
      ? { bg: "var(--ok-bg, #ECFDF5)", fg: "var(--ok-fg, #15803D)", border: "#BBF7D0", label: "Live" }
      : { bg: "#FFFCEB", fg: "#8A6300", border: "#E0CC95", label: "Draft" };
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.fg,
        border: `1px solid ${cfg.border}`,
        fontSize: 9.5,
        fontWeight: 700,
        padding: "1.5px 6px",
        borderRadius: 4,
        textTransform: "uppercase",
        letterSpacing: 0.3,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Form editor ───────────────────────────────────────────────────────

const QUESTION_KIND_META: Record<
  LeadFormQuestionKind,
  { icon: typeof User; label: string }
> = {
  name: { icon: User, label: "Full name" },
  phone: { icon: Phone, label: "Phone" },
  email: { icon: Mail, label: "Email" },
  budget: { icon: Wallet, label: "Budget" },
  timeline: { icon: Clock, label: "Purchase timeline" },
  city: { icon: MapPin, label: "City" },
  bhk: { icon: Home, label: "BHK preference" },
  "custom-short": { icon: Pencil, label: "Custom (short answer)" },
  "custom-multiline": { icon: Pencil, label: "Custom (paragraph)" },
  "custom-single-choice": { icon: ListChecks, label: "Custom (single choice)" },
};

function FormEditor({
  projectId,
  personas,
  form,
}: {
  projectId: string;
  personas: Persona[];
  form: LeadForm;
}) {
  const showToast = useSpotStore((s) => s.showToast);
  const persona =
    form.personaId == null
      ? null
      : personas.find((p) => p.id === form.personaId) || null;

  const apply = (mutator: (f: LeadForm) => void) => {
    mutateRuntimeProject(projectId, (p) => {
      const target = (p.forms || []).find((x) => x.id === form.id);
      if (target) {
        mutator(target);
        target.updatedAt = new Date().toISOString();
      }
    });
  };

  const publish = () => {
    apply((f) => {
      f.status = "published";
    });
    showToast(`${form.name} is live — ready to attach to campaigns`);
  };

  const unpublish = () => {
    apply((f) => {
      f.status = "draft";
    });
  };

  const removeForm = () => {
    if (!window.confirm(`Delete "${form.name}"? This can't be undone.`)) return;
    mutateRuntimeProject(projectId, (p) => {
      p.forms = (p.forms || []).filter((x) => x.id !== form.id);
    });
    showToast(`${form.name} deleted`);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="card-base p-4">
        <div className="flex items-start gap-3 mb-3">
          <span
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "var(--bg-secondary)",
              color: "var(--text-1)",
            }}
          >
            <FileText size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              defaultValue={form.name}
              onBlur={(e) =>
                apply((f) => {
                  f.name = e.target.value.trim() || f.name;
                })
              }
              className="w-full outline-none border-none bg-transparent text-[15px] font-semibold leading-tight"
            />
            <div className="text-[11px] text-text-tertiary mt-0.5">
              {persona == null
                ? "Default form · every persona that doesn't have its own"
                : `Persona-specific · ${persona.name}`}
            </div>
          </div>
          <StatusPill status={form.status} />
          <div className="flex items-center gap-1.5">
            {form.status === "draft" ? (
              <button
                type="button"
                onClick={publish}
                className="apply-btn"
                style={{
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #C026D3 100%)",
                  height: 30,
                  fontSize: 12,
                  padding: "0 12px",
                }}
              >
                <ArrowUpRight size={12} /> Publish
              </button>
            ) : (
              <button
                type="button"
                onClick={unpublish}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-button border border-border bg-white text-[12px]"
              >
                Unpublish
              </button>
            )}
            <button
              type="button"
              onClick={removeForm}
              title="Delete form"
              className="inline-flex items-center justify-center h-8 w-8 rounded-button border border-border bg-white text-text-tertiary hover:text-text-secondary"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Intro */}
      <FormBlock
        title="Intro screen"
        sub="Shown before the user starts filling the form. Leave blank to use Meta's default."
      >
        <Labeled label="Headline">
          <input
            type="text"
            defaultValue={form.intro.headline}
            onBlur={(e) =>
              apply((f) => {
                f.intro.headline = e.target.value;
              })
            }
            placeholder="e.g. Get pricing for Sky Gardens"
            className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px]"
          />
        </Labeled>
        <Labeled label="Body">
          <textarea
            defaultValue={form.intro.body}
            onBlur={(e) =>
              apply((f) => {
                f.intro.body = e.target.value;
              })
            }
            rows={2}
            placeholder="A short paragraph explaining what the lead will get back."
            className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px] resize-y"
          />
        </Labeled>
      </FormBlock>

      {/* Questions */}
      <FormBlock
        title={`Questions · ${form.questions.length}`}
        sub="Keep it tight — Meta lead forms drop off fast past 5 questions."
        actions={
          <AddQuestionButton
            existingKinds={new Set(form.questions.map((q) => q.kind))}
            onAdd={(kind) =>
              apply((f) => {
                f.questions.push(makeQuestion(kind));
              })
            }
          />
        }
      >
        {form.questions.length === 0 ? (
          <div
            className="rounded-[8px] py-5 text-center text-[12px] text-text-tertiary"
            style={{
              border: "1px dashed var(--border)",
              background: "var(--bg-page)",
            }}
          >
            No questions yet. At minimum, capture Name and Phone.
          </div>
        ) : (
          <div className="space-y-2">
            {form.questions.map((q, idx) => (
              <QuestionRow
                key={q.id}
                q={q}
                idx={idx}
                total={form.questions.length}
                onChange={(next) =>
                  apply((f) => {
                    f.questions[idx] = next;
                  })
                }
                onRemove={() =>
                  apply((f) => {
                    f.questions = f.questions.filter((x) => x.id !== q.id);
                  })
                }
                onMove={(dir) =>
                  apply((f) => {
                    const j = idx + (dir === "up" ? -1 : 1);
                    if (j < 0 || j >= f.questions.length) return;
                    const arr = f.questions;
                    [arr[idx], arr[j]] = [arr[j], arr[idx]];
                  })
                }
              />
            ))}
          </div>
        )}
      </FormBlock>

      {/* Privacy */}
      <FormBlock
        title="Privacy"
        sub="One line consent text shown above the submit button."
      >
        <textarea
          defaultValue={form.privacy}
          onBlur={(e) =>
            apply((f) => {
              f.privacy = e.target.value;
            })
          }
          rows={2}
          placeholder="e.g. By submitting, you agree to be contacted by Godrej Properties about Sky Gardens."
          className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px] resize-y"
        />
      </FormBlock>

      {/* Completion */}
      <FormBlock
        title="Completion screen"
        sub="What the lead sees after they submit."
      >
        <Labeled label="Headline">
          <input
            type="text"
            defaultValue={form.completion.headline}
            onBlur={(e) =>
              apply((f) => {
                f.completion.headline = e.target.value;
              })
            }
            placeholder="Thanks — we'll be in touch shortly."
            className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px]"
          />
        </Labeled>
        <Labeled label="Body">
          <textarea
            defaultValue={form.completion.body}
            onBlur={(e) =>
              apply((f) => {
                f.completion.body = e.target.value;
              })
            }
            rows={2}
            placeholder="A line explaining what happens next."
            className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px] resize-y"
          />
        </Labeled>
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Labeled label="CTA label">
            <input
              type="text"
              defaultValue={form.completion.ctaLabel}
              onBlur={(e) =>
                apply((f) => {
                  f.completion.ctaLabel = e.target.value;
                })
              }
              className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px]"
            />
          </Labeled>
          <Labeled label="CTA URL">
            <input
              type="text"
              defaultValue={form.completion.ctaUrl}
              onBlur={(e) =>
                apply((f) => {
                  f.completion.ctaUrl = e.target.value;
                })
              }
              placeholder="https://…"
              className="w-full outline-none rounded-[6px] border border-border px-2.5 py-2 text-[13px]"
            />
          </Labeled>
        </div>
      </FormBlock>
    </div>
  );
}

// ─── Form sub-components ────────────────────────────────────────────────

function FormBlock({
  title,
  sub,
  actions,
  children,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card-base p-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <div>
          <div className="text-[13px] font-semibold leading-tight">{title}</div>
          {sub && (
            <div className="text-[11px] text-text-tertiary mt-0.5">{sub}</div>
          )}
        </div>
        {actions}
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="uplabel mb-1.5"
        style={{ fontSize: 9.5, color: "var(--text-tertiary)", letterSpacing: "0.4px" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function QuestionRow({
  q,
  idx,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  q: LeadFormQuestion;
  idx: number;
  total: number;
  onChange: (next: LeadFormQuestion) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const meta = QUESTION_KIND_META[q.kind];
  const Icon = meta.icon;
  const isCustom = q.kind.startsWith("custom-");

  return (
    <div
      className="rounded-[8px] p-2.5 flex items-start gap-2.5"
      style={{
        background: "#FFF",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <span
        className="inline-flex flex-col items-center justify-center flex-shrink-0 text-text-tertiary"
        style={{ width: 18, gap: 2 }}
      >
        <button
          type="button"
          onClick={() => onMove("up")}
          disabled={idx === 0}
          className="text-text-tertiary disabled:opacity-30"
          style={{ height: 10, lineHeight: 0, fontSize: 9 }}
          title="Move up"
        >
          ▲
        </button>
        <GripVertical size={11} />
        <button
          type="button"
          onClick={() => onMove("down")}
          disabled={idx === total - 1}
          className="text-text-tertiary disabled:opacity-30"
          style={{ height: 10, lineHeight: 0, fontSize: 9 }}
          title="Move down"
        >
          ▼
        </button>
      </span>
      <span
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: "var(--bg-secondary)",
          color: "var(--text-2)",
        }}
      >
        <Icon size={13} />
      </span>
      <div className="flex-1 min-w-0">
        {isCustom ? (
          <input
            type="text"
            defaultValue={q.label}
            onBlur={(e) =>
              onChange({ ...q, label: e.target.value.trim() || q.label })
            }
            className="w-full outline-none border-none bg-transparent text-[12.5px] font-medium"
          />
        ) : (
          <div className="text-[12.5px] font-medium">{q.label}</div>
        )}
        <div className="text-[10.5px] text-text-tertiary mt-0.5">
          {meta.label}
        </div>
        {q.kind === "custom-single-choice" && (
          <textarea
            defaultValue={(q.options || []).join("\n")}
            onBlur={(e) =>
              onChange({
                ...q,
                options: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            rows={3}
            placeholder={"Option per line\nSecond option\nThird option"}
            className="w-full outline-none rounded-[6px] border border-border px-2 py-1.5 text-[11.5px] mt-2"
          />
        )}
      </div>
      <label className="flex items-center gap-1.5 flex-shrink-0 text-[11px] text-text-secondary">
        <input
          type="checkbox"
          checked={q.required}
          onChange={(e) => onChange({ ...q, required: e.target.checked })}
        />
        Required
      </label>
      <button
        type="button"
        onClick={onRemove}
        title="Remove question"
        className="inline-flex items-center justify-center h-6 w-6 rounded-button text-text-tertiary hover:text-text-secondary"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function AddQuestionButton({
  existingKinds,
  onAdd,
}: {
  existingKinds: Set<LeadFormQuestionKind>;
  onAdd: (kind: LeadFormQuestionKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const kinds: LeadFormQuestionKind[] = [
    "name",
    "phone",
    "email",
    "budget",
    "timeline",
    "city",
    "bhk",
    "custom-short",
    "custom-multiline",
    "custom-single-choice",
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-button border border-border bg-white text-[11.5px] hover:border-border-hover"
      >
        <Plus size={11} /> Add question
      </button>
      {open && (
        <div
          className="absolute fadeUp"
          style={{
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            width: 240,
            background: "#FFF",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
          }}
        >
          {kinds.map((k) => {
            const isCustom = k.startsWith("custom-");
            // Block re-adding non-custom prebuilts that already exist.
            const disabled = !isCustom && existingKinds.has(k);
            const meta = QUESTION_KIND_META[k];
            const Icon = meta.icon;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onAdd(k);
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-1.5 rounded-[6px] flex items-center gap-2 hover:bg-surface-page disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon size={12} className="text-text-tertiary" />
                <span className="text-[12px]">{meta.label}</span>
                {disabled && (
                  <Check
                    size={10}
                    className="text-text-tertiary ml-auto"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Form factory helpers ──────────────────────────────────────────────

function makeQuestion(kind: LeadFormQuestionKind): LeadFormQuestion {
  const id = `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const meta = QUESTION_KIND_META[kind];
  const base: LeadFormQuestion = {
    id,
    kind,
    label: meta.label,
    required: kind === "name" || kind === "phone",
  };
  if (kind === "custom-single-choice") {
    base.options = ["Option A", "Option B", "Option C"];
  }
  return base;
}

function makeDefaultForm(
  id: string,
  project: ProjectDetail,
  withSpot: boolean,
): LeadForm {
  const projectShort = project.name.split(" · ")[0];
  if (!withSpot) {
    return {
      id,
      name: `${projectShort} · Default form`,
      personaId: null,
      status: "draft",
      intro: { headline: "", body: "" },
      questions: [makeQuestion("name"), makeQuestion("phone")],
      privacy: "",
      completion: {
        headline: "Thanks — we'll be in touch.",
        body: "",
        ctaLabel: "Visit website",
        ctaUrl: "",
      },
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    id,
    name: `${projectShort} · Default form`,
    personaId: null,
    status: "draft",
    intro: {
      headline: `Get pricing & site visit for ${projectShort}`,
      body: `${project.typology || "Luxury homes"} in ${project.micromarket || "the project's micromarket"} · ${project.priceBand || "premium"} pricing. Share your details — our team gets back within 24 hours.`,
    },
    questions: [
      makeQuestion("name"),
      makeQuestion("phone"),
      makeQuestion("email"),
      makeQuestion("budget"),
      makeQuestion("timeline"),
    ],
    privacy: `By submitting, you agree to be contacted by ${project.builder || "Godrej Properties"} about ${projectShort}.`,
    completion: {
      headline: "Thanks — our team will be in touch shortly.",
      body: "In the meantime, you can preview the project online.",
      ctaLabel: "Open project page",
      ctaUrl: "",
    },
    updatedAt: new Date().toISOString(),
  };
}

function makeFormFor(
  id: string,
  project: ProjectDetail,
  personaId: string | null,
): LeadForm {
  if (personaId === null) {
    return makeDefaultForm(id, project, true);
  }
  const persona = project.personas.find((p) => p.id === personaId);
  const personaName = persona?.name || "Persona";
  const projectShort = project.name.split(" · ")[0];
  return {
    id,
    name: `${projectShort} · ${personaName}`,
    personaId,
    status: "draft",
    intro: {
      headline: `${projectShort} for ${personaName.toLowerCase()}`,
      body: persona?.want || "Share your details and our team will reach out.",
    },
    questions: [
      makeQuestion("name"),
      makeQuestion("phone"),
      makeQuestion("email"),
      // Persona-flavored qualifiers — these differentiate persona forms
      // from the default. Users can tweak after.
      ...(personaName.toLowerCase().includes("nri")
        ? [makeQuestion("city"), makeQuestion("budget"), makeQuestion("timeline")]
        : [makeQuestion("bhk"), makeQuestion("budget"), makeQuestion("timeline")]),
    ],
    privacy: `By submitting, you agree to be contacted by ${project.builder || "Godrej Properties"} about ${projectShort}.`,
    completion: {
      headline: "Thanks — our team will be in touch.",
      body: "",
      ctaLabel: "Visit website",
      ctaUrl: "",
    },
    updatedAt: new Date().toISOString(),
  };
}
