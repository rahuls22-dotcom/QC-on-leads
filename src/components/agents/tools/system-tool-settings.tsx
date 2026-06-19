"use client";

import { Languages } from "lucide-react";
import type {
  StatusMessages,
  ToolConfig,
  ToolSettings,
} from "@/lib/tools-library";
import {
  CRM_SOURCES,
  STATUS_MESSAGE_TOOLS,
  WHATSAPP_TEMPLATES,
} from "@/lib/tools-library";

export type AgentLanguages = { primary: string; additional: string[] };

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
  agentLanguages,
}: {
  tool: ToolConfig;
  settings: ToolSettings;
  onChange: (next: ToolSettings) => void;
  agentLanguages?: AgentLanguages;
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
        return <LanguageSettings languages={agentLanguages} />;
      case "send_whatsapp":
        return <WhatsappSettings settings={settings} patch={patch} />;
      case "capture_email":
        return <EmailCaptureSettings settings={settings} patch={patch} />;
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

/* ─── Transfer Call — phone + message (the "when" is the trigger) ──── */

function TransferSettings({ settings, patch }: SettingsProps) {
  return (
    <SettingsBlock title="Where to hand off">
      <Field label="Phone number" hint="the human who takes the call">
        <input
          value={settings.transferPhone ?? ""}
          onChange={(e) => patch({ transferPhone: e.target.value })}
          placeholder="+91 80 6548 1620"
          className={inputCls}
        />
      </Field>
      <Field label="What the assistant says before handing off">
        <input
          value={settings.transferMessage ?? ""}
          onChange={(e) => patch({ transferMessage: e.target.value })}
          placeholder="Connecting you to a specialist now…"
          className={inputCls}
        />
      </Field>
    </SettingsBlock>
  );
}

/* ─── Voicemail — two behaviours ──────────────────────────────────── */

function VoicemailSettings({ settings, patch }: SettingsProps) {
  const behavior = settings.voicemailBehavior ?? "leave-message";
  const options: { value: NonNullable<ToolSettings["voicemailBehavior"]>; label: string; hint: string }[] = [
    { value: "leave-message", label: "Leave a message", hint: "Speaks the message below, then hangs up." },
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

/* ─── Detect language — read-only, driven by the agent's languages ── */

function LanguageSettings({ languages }: { languages?: AgentLanguages }) {
  const additional = languages?.additional ?? [];
  const multilingual = additional.length > 0;
  const all = languages ? [languages.primary, ...additional] : [];

  return (
    <SettingsBlock title="Automatic language switching">
      <div className="flex gap-2.5 rounded-lg border border-border-subtle bg-muted/50 px-3.5 py-3">
        <Languages size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="text-[12px] leading-relaxed text-muted-foreground">
          {multilingual ? (
            <>
              This agent is multilingual, so language switching is{" "}
              <span className="font-medium text-foreground">on automatically</span>.
              The assistant detects which language the caller uses and switches
              between the agent&rsquo;s languages.
            </>
          ) : (
            <>
              This agent uses a single language, so language switching is{" "}
              <span className="font-medium text-foreground">off</span>. Add
              secondary languages in the agent&rsquo;s Configuration to turn it on.
            </>
          )}
        </div>
      </div>

      {all.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">
            Agent languages
          </div>
          <div className="flex flex-wrap gap-1.5">
            {all.map((lang, i) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[12px] font-medium text-secondary-foreground"
              >
                {lang}
                {i === 0 && (
                  <span className="text-[10px] font-normal text-muted-foreground/70">
                    primary
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
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

/* ─── Capture email ───────────────────────────────────────────────── */

function EmailCaptureSettings({ settings, patch }: SettingsProps) {
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
