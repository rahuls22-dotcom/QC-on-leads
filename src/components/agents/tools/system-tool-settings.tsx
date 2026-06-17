"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  ExperienceCentre,
  StatusMessages,
  ToolConfig,
  ToolSettings,
  TransferDestination,
} from "@/lib/tools-library";
import {
  CRM_SOURCES,
  LANGUAGE_OPTIONS,
  STATUS_MESSAGE_TOOLS,
  TRANSFER_MODES,
  WHATSAPP_TEMPLATES,
} from "@/lib/tools-library";

let _id = 0;
const uid = (p: string) => `${p}-${++_id}`;

/* ─── Shared primitives ───────────────────────────────────────────── */

const inputCls =
  "w-full h-9 px-3 text-[13px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground";
const taCls =
  "w-full px-3 py-2.5 text-[13px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground resize-y leading-relaxed";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
        {label}
        {hint && <span className="font-normal text-muted-foreground/70"> — {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        on ? "bg-primary" : "bg-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-sm transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SettingsBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ─── Entry point ─────────────────────────────────────────────────── */

export function SystemToolSettings({
  tool,
  settings,
  onChange,
}: {
  tool: ToolConfig;
  settings: ToolSettings;
  onChange: (next: ToolSettings) => void;
}) {
  const patch = (p: Partial<ToolSettings>) => onChange({ ...settings, ...p });

  const body = (() => {
    switch (tool.title) {
      case "transfer_call":
        return <TransferSettings settings={settings} patch={patch} />;
      case "voice_mail_detection":
        return <VoicemailSettings settings={settings} patch={patch} />;
      case "end_call":
        return <EndCallSettings settings={settings} patch={patch} />;
      case "detect_language":
        return <LanguageSettings settings={settings} patch={patch} />;
      case "send_whatsapp":
        return <WhatsappSettings settings={settings} patch={patch} />;
      case "calculate_budget":
        return <BudgetSettings settings={settings} patch={patch} />;
      case "find_experience_center":
        return <CentresSettings settings={settings} patch={patch} />;
      case "look_up_email":
        return <EmailLookupSettings settings={settings} patch={patch} />;
      default:
        return null;
    }
  })();

  if (!body) return null;

  return (
    <div className="space-y-5">
      {body}
      {STATUS_MESSAGE_TOOLS.has(tool.title) && (
        <StatusMessagesSection
          value={settings.statusMessages}
          onChange={(statusMessages) => patch({ statusMessages })}
        />
      )}
    </div>
  );
}

type SettingsProps = {
  settings: ToolSettings;
  patch: (p: Partial<ToolSettings>) => void;
};

/* ─── Transfer Call — the destinations editor ─────────────────────── */

function TransferSettings({ settings, patch }: SettingsProps) {
  const destinations = settings.destinations ?? [];

  const update = (id: string, p: Partial<TransferDestination>) =>
    patch({
      destinations: destinations.map((d) => (d.id === id ? { ...d, ...p } : d)),
    });
  const remove = (id: string) =>
    patch({ destinations: destinations.filter((d) => d.id !== id) });
  const add = () =>
    patch({
      destinations: [
        ...destinations,
        {
          id: uid("dest"),
          label: "",
          destType: "number",
          value: "",
          mode: "warm-summary",
          message: "",
        },
      ],
    });

  return (
    <SettingsBlock title="Transfer destinations">
      <p className="-mt-1 text-[12px] text-muted-foreground">
        Where the assistant can hand off the call. It picks the right one from
        the conversation.
      </p>

      {destinations.map((d) => (
        <div key={d.id} className="space-y-3 rounded-lg border border-border p-3.5">
          <div className="flex items-center gap-2">
            <input
              value={d.label}
              onChange={(e) => update(d.id, { label: e.target.value })}
              placeholder="Sales desk"
              className={`${inputCls} font-medium`}
            />
            <button
              type="button"
              onClick={() => remove(d.id)}
              aria-label="Remove destination"
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive-bg hover:text-destructive"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-2">
            <select
              value={d.destType}
              onChange={(e) =>
                update(d.id, {
                  destType: e.target.value as TransferDestination["destType"],
                })
              }
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              <option value="number">Phone number</option>
              <option value="sip">SIP address</option>
              <option value="agent">Another agent</option>
            </select>
            <input
              value={d.value}
              onChange={(e) => update(d.id, { value: e.target.value })}
              placeholder={
                d.destType === "number"
                  ? "+91 80 6548 1620"
                  : d.destType === "sip"
                  ? "sip:desk@company.com"
                  : "agent id"
              }
              className={inputCls}
            />
          </div>

          <Field label="Transfer style">
            <select
              value={d.mode}
              onChange={(e) =>
                update(d.id, {
                  mode: e.target.value as TransferDestination["mode"],
                })
              }
              className={`${inputCls} cursor-pointer appearance-none`}
            >
              {TRANSFER_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {TRANSFER_MODES.find((m) => m.value === d.mode)?.hint}
            </p>
          </Field>

          <Field label="What the assistant says before transferring" hint="optional">
            <input
              value={d.message}
              onChange={(e) => update(d.id, { message: e.target.value })}
              placeholder="Connecting you to a specialist now…"
              className={inputCls}
            />
          </Field>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary transition-opacity hover:opacity-80"
      >
        <Plus size={15} strokeWidth={2} />
        Add destination
      </button>
    </SettingsBlock>
  );
}

/* ─── Voicemail ───────────────────────────────────────────────────── */

function VoicemailSettings({ settings, patch }: SettingsProps) {
  const behavior = settings.voicemailBehavior ?? "leave-message";
  const options: { value: NonNullable<ToolSettings["voicemailBehavior"]>; label: string; hint: string }[] = [
    { value: "leave-message", label: "Leave a message", hint: "Speaks the message below, then hangs up." },
    { value: "use-assistant", label: "Use the agent's default message", hint: "Falls back to the assistant's voicemail line." },
    { value: "hang-up", label: "Hang up silently", hint: "Ends the call without leaving anything." },
  ];

  return (
    <SettingsBlock title="When a voicemail is reached">
      <div className="space-y-2">
        {options.map((o) => (
          <Radio
            key={o.value}
            checked={behavior === o.value}
            onSelect={() => patch({ voicemailBehavior: o.value })}
            label={o.label}
            hint={o.hint}
          />
        ))}
      </div>
      {behavior === "leave-message" && (
        <Field label="Voicemail message" hint="{{variables}} are filled at call time">
          <textarea
            rows={3}
            value={settings.voicemailMessage ?? ""}
            onChange={(e) => patch({ voicemailMessage: e.target.value })}
            placeholder="Hi, this is {{project_name}} calling about your enquiry…"
            className={taCls}
          />
        </Field>
      )}
    </SettingsBlock>
  );
}

/* ─── End call ────────────────────────────────────────────────────── */

function EndCallSettings({ settings, patch }: SettingsProps) {
  return (
    <SettingsBlock title="Before hanging up">
      <Field label="Closing message" hint="said right before the call ends; leave blank for none">
        <input
          value={settings.closingMessage ?? ""}
          onChange={(e) => patch({ closingMessage: e.target.value })}
          placeholder="Thanks for your time today — have a great day!"
          className={inputCls}
        />
      </Field>
    </SettingsBlock>
  );
}

/* ─── Detect language ─────────────────────────────────────────────── */

function LanguageSettings({ settings, patch }: SettingsProps) {
  const allowed = settings.allowedLanguages ?? [];
  const toggle = (lang: string) =>
    patch({
      allowedLanguages: allowed.includes(lang)
        ? allowed.filter((l) => l !== lang)
        : [...allowed, lang],
    });

  return (
    <SettingsBlock title="Languages the assistant can switch to">
      <div className="flex flex-wrap gap-1.5">
        {LANGUAGE_OPTIONS.map((lang) => {
          const on = allowed.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => toggle(lang)}
              className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {lang}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="text-[13px] font-medium text-foreground">
            Switch automatically
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            On: switches as soon as the caller speaks another language. Off: only
            when they ask.
          </p>
        </div>
        <Toggle
          on={settings.autoSwitch ?? true}
          onClick={() => patch({ autoSwitch: !(settings.autoSwitch ?? true) })}
          label="Switch automatically"
        />
      </div>
    </SettingsBlock>
  );
}

/* ─── Send WhatsApp ───────────────────────────────────────────────── */

function WhatsappSettings({ settings, patch }: SettingsProps) {
  return (
    <SettingsBlock title="WhatsApp message">
      <Field label="Send from" hint="your WhatsApp Business number">
        <input
          value={settings.senderNumber ?? ""}
          onChange={(e) => patch({ senderNumber: e.target.value })}
          placeholder="+91 80 6548 1615"
          className={inputCls}
        />
      </Field>
      <Field label="Message template">
        <select
          value={settings.whatsappTemplate ?? WHATSAPP_TEMPLATES[0]}
          onChange={(e) => patch({ whatsappTemplate: e.target.value })}
          className={`${inputCls} cursor-pointer appearance-none`}
        >
          {WHATSAPP_TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-foreground">
          Attach project brochure
        </div>
        <Toggle
          on={settings.attachBrochure ?? false}
          onClick={() => patch({ attachBrochure: !(settings.attachBrochure ?? false) })}
          label="Attach project brochure"
        />
      </div>
    </SettingsBlock>
  );
}

/* ─── Calculate budget ────────────────────────────────────────────── */

function BudgetSettings({ settings, patch }: SettingsProps) {
  return (
    <SettingsBlock title="Estimate assumptions">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Interest rate %">
          <input
            type="number"
            step={0.1}
            value={settings.interestRate ?? 8.5}
            onChange={(e) => patch({ interestRate: parseFloat(e.target.value) })}
            className={inputCls}
          />
        </Field>
        <Field label="Tenure (years)">
          <input
            type="number"
            value={settings.tenureYears ?? 20}
            onChange={(e) => patch({ tenureYears: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
        <Field label="Down payment %">
          <input
            type="number"
            value={settings.downPaymentPct ?? 20}
            onChange={(e) => patch({ downPaymentPct: parseInt(e.target.value) || 0 })}
            className={inputCls}
          />
        </Field>
      </div>
    </SettingsBlock>
  );
}

/* ─── Experience centres ──────────────────────────────────────────── */

function CentresSettings({ settings, patch }: SettingsProps) {
  const centres = settings.centres ?? [];
  const update = (id: string, p: Partial<ExperienceCentre>) =>
    patch({ centres: centres.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const remove = (id: string) =>
    patch({ centres: centres.filter((c) => c.id !== id) });
  const add = () =>
    patch({
      centres: [...centres, { id: uid("ec"), name: "", address: "", city: "" }],
    });

  return (
    <SettingsBlock title="Experience centres">
      {centres.map((c) => (
        <div key={c.id} className="space-y-2 rounded-lg border border-border p-3.5">
          <div className="flex items-center gap-2">
            <input
              value={c.name}
              onChange={(e) => update(c.id, { name: e.target.value })}
              placeholder="Centre name"
              className={`${inputCls} font-medium`}
            />
            <button
              type="button"
              onClick={() => remove(c.id)}
              aria-label="Remove centre"
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive-bg hover:text-destructive"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_140px] gap-2">
            <input
              value={c.address}
              onChange={(e) => update(c.id, { address: e.target.value })}
              placeholder="Street address"
              className={inputCls}
            />
            <input
              value={c.city}
              onChange={(e) => update(c.id, { city: e.target.value })}
              placeholder="City"
              className={inputCls}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary transition-opacity hover:opacity-80"
      >
        <Plus size={15} strokeWidth={2} />
        Add centre
      </button>
    </SettingsBlock>
  );
}

/* ─── Email lookup ────────────────────────────────────────────────── */

function EmailLookupSettings({ settings, patch }: SettingsProps) {
  return (
    <SettingsBlock title="Where to look">
      <Field label="Source">
        <select
          value={settings.crmSource ?? CRM_SOURCES[0]}
          onChange={(e) => patch({ crmSource: e.target.value })}
          className={`${inputCls} cursor-pointer appearance-none`}
        >
          {CRM_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Match the caller on">
        <select
          value={settings.matchOn ?? "Phone number"}
          onChange={(e) => patch({ matchOn: e.target.value })}
          className={`${inputCls} cursor-pointer appearance-none`}
        >
          <option>Phone number</option>
          <option>Name</option>
        </select>
      </Field>
    </SettingsBlock>
  );
}

/* ─── Shared: spoken status messages ──────────────────────────────── */

function StatusMessagesSection({
  value,
  onChange,
}: {
  value?: StatusMessages;
  onChange: (v: StatusMessages) => void;
}) {
  const v = value ?? { start: "", complete: "", failed: "" };
  const set = (k: keyof StatusMessages, val: string) =>
    onChange({ ...v, [k]: val });

  return (
    <SettingsBlock title="What the assistant says while it runs">
      <p className="-mt-1 text-[12px] text-muted-foreground">
        Optional spoken lines so the caller isn&rsquo;t left in silence.
      </p>
      <Field label="When it starts">
        <input
          value={v.start}
          onChange={(e) => set("start", e.target.value)}
          placeholder="One moment…"
          className={inputCls}
        />
      </Field>
      <Field label="When it finishes" hint="optional">
        <input
          value={v.complete}
          onChange={(e) => set("complete", e.target.value)}
          placeholder="All done."
          className={inputCls}
        />
      </Field>
      <Field label="If it fails">
        <input
          value={v.failed}
          onChange={(e) => set("failed", e.target.value)}
          placeholder="I couldn't do that just now."
          className={inputCls}
        />
      </Field>
    </SettingsBlock>
  );
}

/* ─── Radio (voicemail behaviour) ─────────────────────────────────── */

function Radio({
  checked,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left transition-colors ${
        checked ? "border-primary bg-primary-softer" : "border-border hover:border-primary/40"
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-primary" : "border-border"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span>
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{hint}</span>
      </span>
    </button>
  );
}
