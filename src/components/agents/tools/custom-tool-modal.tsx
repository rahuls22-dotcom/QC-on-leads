"use client";

import { useEffect, useState } from "react";
import { Plug, MessageSquareQuote, Plus, Trash2, ArrowRight } from "lucide-react";
import type {
  ArgField,
  CustomConfig,
  CustomKind,
  ToolConfig,
  ToolErrors,
} from "@/lib/tools-library";
import {
  argsToFields,
  fieldsToArgs,
  KNOWN_PLACEHOLDERS,
  validateCustomTool,
  hasErrors,
} from "@/lib/tools-library";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader } from "./modal-shell";

type Step = "type" | "form";

interface Draft {
  title: string;
  description: string;
  kind: CustomKind;
  fields: ArgField[];
  method: "POST" | "GET";
  url: string;
  auth: string;
  timeout: number;
  response: string;
}

function blankDraft(kind: CustomKind): Draft {
  return {
    title: "",
    description: "",
    kind,
    fields: [],
    method: "POST",
    url: "",
    auth: "",
    timeout: 30,
    response: "",
  };
}

function draftFromTool(tool: ToolConfig): Draft {
  const cfg = tool.config!;
  const base = blankDraft(cfg.kind);
  base.title = tool.title;
  base.description = tool.description;
  base.fields = argsToFields(cfg.args);
  if (cfg.kind === "webhook") {
    base.method = cfg.method;
    base.url = cfg.url;
    base.auth = cfg.headers?.Authorization ?? "";
    base.timeout = cfg.timeout;
  } else {
    base.response = cfg.response;
  }
  return base;
}

function draftToTool(draft: Draft, createdBy: string | null): ToolConfig {
  const args = fieldsToArgs(draft.fields);
  const config: CustomConfig =
    draft.kind === "webhook"
      ? {
          kind: "webhook",
          url: draft.url.trim(),
          method: draft.method,
          headers: draft.auth.trim() ? { Authorization: draft.auth.trim() } : {},
          timeout: draft.timeout,
          args,
        }
      : { kind: "response", response: draft.response.trim(), args };
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    type: "custom",
    is_default: false,
    icon: draft.kind === "webhook" ? "webhook" : "response",
    config,
    created_by: createdBy,
  };
}

export function CustomToolModal({
  open,
  editing,
  reservedTitles,
  createdBy,
  onClose,
  onSave,
  onRequestDelete,
}: {
  open: boolean;
  editing: ToolConfig | null;
  reservedTitles: string[];
  createdBy: string | null;
  onClose: () => void;
  onSave: (tool: ToolConfig) => void;
  onRequestDelete: (tool: ToolConfig) => void;
}) {
  const isEdit = !!editing;
  const [step, setStep] = useState<Step>("type");
  const [draft, setDraft] = useState<Draft>(blankDraft("webhook"));
  const [errors, setErrors] = useState<ToolErrors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setStep("form");
      setDraft(draftFromTool(editing));
    } else {
      setStep("type");
      setDraft(blankDraft("webhook"));
    }
  }, [open, editing]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const webhook = draft.kind === "webhook";

  const handleSave = () => {
    const errs = validateCustomTool(draft, reservedTitles, isEdit);
    setErrors(errs);
    if (hasErrors(errs)) return;
    onSave(draftToTool(draft, isEdit ? editing!.created_by : createdBy));
  };

  /* ─── Step 1: type chooser ─────────────────────────────────────── */
  if (open && step === "type" && !isEdit) {
    return (
      <ModalShell open={open} onClose={onClose}>
        <ModalHeader
          title="New custom tool"
          subtitle="What kind of tool do you want to create?"
          onClose={onClose}
        />
        <div className="grid grid-cols-2 gap-3 p-5">
          <TypeCard
            selected={webhook}
            onClick={() => set("kind", "webhook")}
            icon={<Plug size={20} strokeWidth={1.75} />}
            title="Connect to a system"
            body="The assistant gathers details from the caller and sends them to one of your systems, then uses the reply. Needs a web address from your tech team."
          />
          <TypeCard
            selected={!webhook}
            onClick={() => set("kind", "response")}
            icon={<MessageSquareQuote size={20} strokeWidth={1.75} />}
            title="Give a saved answer"
            body="The assistant reads back information already known about this call, like a reference ID. No tech setup needed."
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => setStep("form")}>
            Continue
            <ArrowRight size={14} strokeWidth={2} />
          </Button>
        </div>
      </ModalShell>
    );
  }

  /* ─── Step 2: form ─────────────────────────────────────────────── */
  return (
    <ModalShell open={open && step === "form"} onClose={onClose}>
      <ModalHeader
        icon={
          webhook ? (
            <Plug size={17} strokeWidth={1.75} />
          ) : (
            <MessageSquareQuote size={17} strokeWidth={1.75} />
          )
        }
        title={
          isEdit
            ? draft.title
            : webhook
            ? "Connect to a system"
            : "Give a saved answer"
        }
        subtitle={webhook ? "Webhook tool" : "Saved-answer tool"}
        badge={
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-secondary-foreground">
            Custom
          </span>
        }
        onClose={onClose}
      />

      <div className="max-h-[68vh] space-y-5 overflow-y-auto p-5">
        {/* Tool name */}
        <Field label="Tool name" hint="short, lowercase, no spaces" error={errors.title}>
          <input
            value={draft.title}
            disabled={isEdit}
            onChange={(e) => set("title", e.target.value)}
            placeholder="book_demo"
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:bg-secondary disabled:text-muted-foreground"
          />
        </Field>

        {/* Description / trigger */}
        <Field
          label="When should the assistant use this?"
          hint="how the assistant decides to trigger it"
          error={errors.description}
        >
          <textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="e.g. When the caller agrees to book and has given a date and time."
            className="w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </Field>

        {/* Info to collect */}
        <ArgFieldsEditor
          fields={draft.fields}
          onChange={(fields) => set("fields", fields)}
          error={errors.fields}
        />

        {/* Webhook-specific */}
        {webhook ? (
          <>
            <Field label="Where to send it" hint="ask your tech team for this" error={errors.url}>
              <div className="flex gap-2">
                <select
                  value={draft.method}
                  onChange={(e) => set("method", e.target.value as "POST" | "GET")}
                  className="h-9 cursor-pointer appearance-none rounded-md border border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
                <input
                  value={draft.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://api.yourcompany.com/book"
                  className="h-9 flex-1 rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </Field>
            <Field label="Authentication" hint="optional">
              <input
                value={draft.auth}
                onChange={(e) => set("auth", e.target.value)}
                placeholder="Authorization: Bearer …"
                className="h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </Field>
          </>
        ) : (
          <Field label="The answer to read back" error={errors.response}>
            <textarea
              value={draft.response}
              onChange={(e) => set("response", e.target.value)}
              rows={2}
              placeholder="Your reference id is {ref_id}, opened on {created_at}."
              className="w-full resize-y rounded-md border border-border bg-card px-3 py-2.5 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground/70">Insert:</span>
              {KNOWN_PLACEHOLDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("response", `${draft.response}{${p}}`)}
                  className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
                >
                  {`{${p}}`}
                </button>
              ))}
            </div>
          </Field>
        )}

        {isEdit && (
          <p className="text-[11px] text-muted-foreground/70">
            Changes apply everywhere this tool is used.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border-subtle px-5 py-3.5">
        {isEdit && (
          <button
            onClick={() => onRequestDelete(editing!)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive-bg"
          >
            <Trash2 size={14} strokeWidth={1.75} />
            Delete tool
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save tool</Button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ─── Sub-components ───────────────────────────────────────────────── */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
        {label}
        {hint && <span className="font-normal text-muted-foreground/70"> — {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function TypeCard({
  selected,
  onClick,
  icon,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary-softer"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-md ${
          selected ? "bg-primary-soft text-primary" : "bg-secondary text-secondary-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="mb-1 text-[13px] font-medium text-foreground">{title}</div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{body}</p>
    </button>
  );
}

function ArgFieldsEditor({
  fields,
  onChange,
  error,
}: {
  fields: ArgField[];
  onChange: (fields: ArgField[]) => void;
  error?: string;
}) {
  const update = (i: number, patch: Partial<ArgField>) =>
    onChange(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const remove = (i: number) => onChange(fields.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...fields, { key: "", description: "", required: true }]);

  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
        Information to collect from the caller
      </label>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-2 bg-secondary px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          <span>Field name</span>
          <span>Describe it for the assistant</span>
          <span>Required</span>
          <span />
        </div>

        {fields.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-muted-foreground/70">
            No fields yet — add one if the assistant needs to collect details.
          </div>
        )}

        {fields.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1.4fr_auto_auto] items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              value={f.key}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="date"
              className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <input
              value={f.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="The day the caller wants"
              className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              role="switch"
              aria-checked={f.required}
              aria-label="Required"
              onClick={() => update(i, { required: !f.required })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                f.required ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform ${
                  f.required ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove field"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive-bg hover:text-destructive"
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2.5 text-[12.5px] font-medium text-primary transition-colors hover:bg-secondary"
        >
          <Plus size={14} strokeWidth={2} />
          Add field
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] text-destructive">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-muted-foreground/70">
          The assistant asks the caller for these naturally during the call.
        </p>
      )}
    </div>
  );
}
