"use client";

import { useEffect, useState } from "react";
import { Plug, MessageSquareQuote, Plus, Trash2, ArrowRight } from "lucide-react";
import type {
  ArgField,
  CustomConfig,
  CustomKind,
  ToolConfig,
  ToolErrors,
} from "@/lib/tools-library-data";
import {
  argsToFields,
  fieldsToArgs,
  KNOWN_PLACEHOLDERS,
  validateCustomTool,
  hasErrors,
} from "@/lib/tools-library-data";
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
          kind: "webhook" as const,
          url: draft.url.trim(),
          method: draft.method,
          headers: draft.auth.trim()
            ? { Authorization: draft.auth.trim() }
            : {},
          timeout: draft.timeout,
          args,
        }
      : { kind: "response" as const, response: draft.response.trim(), args };
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

  // (Re)initialise whenever the modal opens.
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
        <div className="p-5 grid grid-cols-2 gap-3">
          <TypeCard
            selected={webhook}
            onClick={() => set("kind", "webhook")}
            icon={<Plug size={20} strokeWidth={1.5} />}
            title="Connect to a system"
            body="The assistant gathers details from the caller and sends them to one of your systems, then uses the reply. Needs a web address from your tech team."
          />
          <TypeCard
            selected={!webhook}
            onClick={() => set("kind", "response")}
            icon={<MessageSquareQuote size={20} strokeWidth={1.5} />}
            title="Give a saved answer"
            body="The assistant reads back information already known about this call, like a reference ID. No tech setup needed."
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-surface-page">
          <button
            onClick={onClose}
            className="h-9 px-4 text-[13px] font-medium border border-border rounded-button bg-white text-text-primary hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setStep("form")}
            className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5"
          >
            Continue
            <ArrowRight size={14} strokeWidth={2} />
          </button>
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
            <Plug size={17} strokeWidth={1.5} />
          ) : (
            <MessageSquareQuote size={17} strokeWidth={1.5} />
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
          <span className="inline-flex items-center text-[10.5px] font-semibold px-2 py-0.5 rounded-badge bg-surface-secondary text-text-secondary">
            Custom
          </span>
        }
        onClose={onClose}
      />

      <div className="p-5 space-y-5">
        {/* Tool name */}
        <Field
          label="Tool name"
          hint="short, lowercase, no spaces"
          error={errors.title}
        >
          <input
            value={draft.title}
            disabled={isEdit}
            onChange={(e) => set("title", e.target.value)}
            placeholder="book_demo"
            className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary disabled:bg-surface-secondary disabled:text-text-tertiary"
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
            className="w-full px-3 py-2.5 text-[13px] bg-white border border-border rounded-input text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary resize-y leading-relaxed"
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
            <Field
              label="Where to send it"
              hint="ask your tech team for this"
              error={errors.url}
            >
              <div className="flex gap-2">
                <select
                  value={draft.method}
                  onChange={(e) =>
                    set("method", e.target.value as "POST" | "GET")
                  }
                  className="h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary appearance-none cursor-pointer"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
                <input
                  value={draft.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://api.yourcompany.com/book"
                  className="flex-1 h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
                />
              </div>
            </Field>
            <Field label="Authentication" hint="optional">
              <input
                value={draft.auth}
                onChange={(e) => set("auth", e.target.value)}
                placeholder="Authorization: Bearer …"
                className="w-full h-9 px-3 text-[13px] bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
              />
            </Field>
          </>
        ) : (
          /* Response-specific */
          <Field label="The answer to read back" error={errors.response}>
            <textarea
              value={draft.response}
              onChange={(e) => set("response", e.target.value)}
              rows={2}
              placeholder="Your reference id is {ref_id}, opened on {created_at}."
              className="w-full px-3 py-2.5 text-[13px] bg-white border border-border rounded-input text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary resize-y leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-text-tertiary">Insert:</span>
              {KNOWN_PLACEHOLDERS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    set("response", `${draft.response}{${p}}`)
                  }
                  className="text-[11px] font-medium px-2 py-0.5 rounded-badge bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors"
                >
                  {`{${p}}`}
                </button>
              ))}
            </div>
          </Field>
        )}

        {isEdit && (
          <p className="text-[11px] text-text-tertiary">
            Changes apply everywhere this tool is used.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-surface-page">
        {isEdit && (
          <button
            onClick={() => onRequestDelete(editing!)}
            className="h-9 px-3 text-[13px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-button transition-colors inline-flex items-center gap-1.5"
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Delete tool
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onClose}
            className="h-9 px-4 text-[13px] font-medium border border-border rounded-button bg-white text-text-primary hover:bg-surface-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="h-9 px-5 text-[13px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
          >
            Save tool
          </button>
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
      <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
        {label}
        {hint && (
          <span className="font-normal text-text-tertiary"> — {hint}</span>
        )}
      </label>
      {children}
      {error && <p className="mt-1.5 text-[11px] text-[#DC2626]">{error}</p>}
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
      className={`text-left rounded-card border p-4 transition-colors ${
        selected
          ? "border-accent bg-accent/[0.03]"
          : "border-border hover:border-border-hover bg-white"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-button flex items-center justify-center mb-3 ${
          selected ? "bg-accent/10 text-accent" : "bg-surface-secondary text-text-secondary"
        }`}
      >
        {icon}
      </div>
      <div className="text-[13px] font-medium text-text-primary mb-1">{title}</div>
      <p className="text-[12px] text-text-tertiary leading-relaxed">{body}</p>
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
      <label className="block text-[12px] font-medium text-text-secondary mb-1.5">
        Information to collect from the caller
      </label>

      <div className="border border-border rounded-card overflow-hidden">
        {/* header row */}
        <div className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-2 px-3 py-2 bg-surface-secondary text-[10.5px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
          <span>Field name</span>
          <span>Describe it for the assistant</span>
          <span>Required</span>
          <span />
        </div>

        {fields.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-text-tertiary">
            No fields yet — add one if the assistant needs to collect details.
          </div>
        )}

        {fields.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-2 px-3 py-2 border-t border-border items-center"
          >
            <input
              value={f.key}
              onChange={(e) => update(i, { key: e.target.value })}
              placeholder="date"
              className="h-8 px-2 text-[12.5px] font-medium bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
            />
            <input
              value={f.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="The day the caller wants"
              className="h-8 px-2 text-[12.5px] bg-white border border-border rounded-button text-text-primary focus:outline-none focus:border-accent placeholder:text-text-tertiary"
            />
            <button
              type="button"
              role="switch"
              aria-checked={f.required}
              aria-label="Required"
              onClick={() => update(i, { required: !f.required })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                f.required ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  f.required ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove field"
              className="p-1.5 text-text-tertiary hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-button transition-colors"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="w-full flex items-center gap-1.5 px-3 py-2.5 border-t border-border text-[12.5px] font-medium text-accent hover:bg-surface-page transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Add field
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-[11px] text-[#DC2626]">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-text-tertiary">
          The assistant asks the caller for these naturally during the call.
        </p>
      )}
    </div>
  );
}
