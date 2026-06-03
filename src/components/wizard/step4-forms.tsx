"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Copy,
  Check,
  Image,
} from "lucide-react";
import { motion } from "framer-motion";

interface Step4Props {
  onNext: () => void;
  onBack: () => void;
}

/* ─── Mock existing forms ─── */
const existingForms = [
  { id: "form-1", name: "Godrej Air — High Intent", type: "higher_intent" as const, fieldsCount: 6, createdAt: "2026-03-15" },
  { id: "form-2", name: "Godrej Reflections — Quick", type: "more_volume" as const, fieldsCount: 3, createdAt: "2026-03-10" },
];

/* ─── Types ─── */
type FormMode = "select" | "builder";
type ActiveSection = "form_type" | "intro" | "questions" | "privacy" | "review" | "ending";
type FormType = "more_volume" | "higher_intent";
type DescriptionFormat = "paragraph" | "list";
type EndingAction = "website" | "file" | "call";
type DeliveryMode = "optimized" | "manual";

interface ContactField {
  id: string;
  name: string;
  optional: boolean;
}

interface CustomQuestion {
  id: string;
  question: string;
}

interface Consent {
  id: string;
  label: string;
  optional: boolean;
}

interface Disclaimer {
  id: string;
  title: string;
  text: string;
  consents: Consent[];
}

/* ─── Defaults ─── */
const defaultContactFields: ContactField[] = [
  { id: "f-email", name: "Email", optional: false },
  { id: "f-name", name: "Full name", optional: false },
  { id: "f-phone", name: "Phone number", optional: false },
];

const defaultDescriptionPoints = [
  "Premium 2 & 3 BHK residences",
  "Starting at ₹1.2 Cr onwards",
  "World-class amenities & clubhouse",
  "Prime location with metro connectivity",
  "",
];

/* ─── Sidebar config ─── */
const sidebarItems: { key: ActiveSection; label: string; requiresHigherIntent?: boolean }[] = [
  { key: "form_type", label: "Form type" },
  { key: "intro", label: "Intro" },
  { key: "questions", label: "Questions" },
  { key: "privacy", label: "Privacy policy" },
  { key: "review", label: "Review screen", requiresHigherIntent: true },
  { key: "ending", label: "Ending" },
];

/* ─── Helpers ─── */
function charCounter(value: string, max: number) {
  return (
    <span className="text-[11px] text-text-tertiary">
      {value.length}/{max}
    </span>
  );
}

function isSectionComplete(
  section: ActiveSection,
  state: {
    formName: string;
    greetingHeadline: string;
    contactFields: ContactField[];
    privacyLink: string;
    endingHeadline: string;
  },
): boolean {
  switch (section) {
    case "form_type":
      return state.formName.trim().length > 0;
    case "intro":
      return state.greetingHeadline.trim().length > 0;
    case "questions":
      return state.contactFields.length > 0;
    case "privacy":
      return state.privacyLink.trim().length > 0;
    case "review":
      return true;
    case "ending":
      return state.endingHeadline.trim().length > 0;
  }
}

/* ─── Component ─── */
export function Step4Forms({ onNext, onBack }: Step4Props) {
  /* Mode */
  const [formMode, setFormMode] = useState<FormMode>("select");
  const [showExistingList, setShowExistingList] = useState(false);
  const [selectedExistingForm, setSelectedExistingForm] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>("form_type");

  /* Form Type */
  const [formName, setFormName] = useState("Godrej Air — Lead Form");
  const [formType, setFormType] = useState<FormType>("more_volume");
  const [flexibleDelivery, setFlexibleDelivery] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("optimized");

  /* Intro */
  const [backgroundImage, setBackgroundImage] = useState(false);
  const [greetingEnabled, setGreetingEnabled] = useState(true);
  const [greetingHeadline, setGreetingHeadline] = useState("Get exclusive details about Godrej Air");
  const [descriptionFormat, setDescriptionFormat] = useState<DescriptionFormat>("list");
  const [descriptionParagraph, setDescriptionParagraph] = useState("Fill this form to receive a callback from our sales team with project details, pricing, and site visit scheduling.");
  const [descriptionPoints, setDescriptionPoints] = useState<string[]>([...defaultDescriptionPoints]);

  /* Questions */
  const [contactDescription, setContactDescription] = useState("Please provide your contact details so our team can reach out.");
  const [contactFields, setContactFields] = useState<ContactField[]>([...defaultContactFields]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  /* Privacy */
  const [privacyLink, setPrivacyLink] = useState("");
  const [privacyLinkText, setPrivacyLinkText] = useState("");
  const [customDisclaimers, setCustomDisclaimers] = useState<Disclaimer[]>([]);

  /* Review */
  const [phoneVerification, setPhoneVerification] = useState(false);

  /* Ending */
  const [endingHeadline, setEndingHeadline] = useState("Thanks, you're all set.");
  const [endingDescription, setEndingDescription] = useState("Our team will reach out within 24 hours.");
  const [endingAction, setEndingAction] = useState<EndingAction>("website");
  const [endingLink, setEndingLink] = useState("");
  const [endingCTA, setEndingCTA] = useState("Visit Website");

  /* ── Handlers ── */
  const handleCreateNew = () => {
    setFormMode("builder");
    setSelectedExistingForm(null);
  };

  const handleDuplicate = (formId: string) => {
    const form = existingForms.find((f) => f.id === formId);
    if (form) {
      setFormName(form.name + " (Copy)");
      setFormType(form.type);
    }
    setFormMode("builder");
  };

  const handleUseExisting = (formId: string) => {
    setSelectedExistingForm(formId);
  };

  const addContactField = () => {
    setContactFields((prev) => [
      ...prev,
      { id: `f-${Date.now()}`, name: "New field", optional: true },
    ]);
  };

  const deleteContactField = (id: string) => {
    setContactFields((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleFieldOptional = (id: string) => {
    setContactFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, optional: !f.optional } : f)),
    );
  };

  const updateFieldName = (id: string, name: string) => {
    setContactFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f)),
    );
  };

  const addCustomQuestion = () => {
    setCustomQuestions((prev) => [
      ...prev,
      { id: `cq-${Date.now()}`, question: "" },
    ]);
  };

  const deleteCustomQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateCustomQuestion = (id: string, question: string) => {
    setCustomQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question } : q)),
    );
  };

  const addDisclaimer = () => {
    setCustomDisclaimers((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, title: "", text: "", consents: [] },
    ]);
  };

  const deleteDisclaimer = (id: string) => {
    setCustomDisclaimers((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDisclaimer = (id: string, field: "title" | "text", value: string) => {
    setCustomDisclaimers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  };

  const addConsent = (disclaimerId: string) => {
    setCustomDisclaimers((prev) =>
      prev.map((d) =>
        d.id === disclaimerId
          ? { ...d, consents: [...d.consents, { id: `c-${Date.now()}`, label: "", optional: false }] }
          : d,
      ),
    );
  };

  const deleteConsent = (disclaimerId: string, consentId: string) => {
    setCustomDisclaimers((prev) =>
      prev.map((d) =>
        d.id === disclaimerId
          ? { ...d, consents: d.consents.filter((c) => c.id !== consentId) }
          : d,
      ),
    );
  };

  const toggleConsentOptional = (disclaimerId: string, consentId: string) => {
    setCustomDisclaimers((prev) =>
      prev.map((d) =>
        d.id === disclaimerId
          ? {
              ...d,
              consents: d.consents.map((c) =>
                c.id === consentId ? { ...c, optional: !c.optional } : c,
              ),
            }
          : d,
      ),
    );
  };

  const updateDescriptionPoint = (index: number, value: string) => {
    setDescriptionPoints((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const addDescriptionPoint = () => {
    setDescriptionPoints((prev) => [...prev, ""]);
  };

  const visibleSidebarItems = sidebarItems.filter(
    (item) => !item.requiresHigherIntent || formType === "higher_intent",
  );

  const completionState = { formName, greetingHeadline, contactFields, privacyLink, endingHeadline };

  /* ─────────────── Toggle switch reusable ─────────────── */
  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 ${
        checked ? "bg-accent" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-150 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );

  /* ─────────────── SELECTION MODE ─────────────── */
  if (formMode === "select") {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-border rounded-card p-6">
          <h2 className="text-[20px] font-semibold text-text-primary mb-1">Lead Form</h2>
          <p className="text-[13px] text-text-tertiary mb-6">
            Choose how you&apos;d like to set up your lead form
          </p>

          {/* Action cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={handleCreateNew}
              className="text-left p-5 rounded-card border border-border bg-white hover:border-accent hover:bg-accent/5 transition-colors duration-150"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={16} strokeWidth={1.5} className="text-accent" />
                <span className="text-[14px] font-semibold text-text-primary">Create New</span>
              </div>
              <p className="text-[12px] text-text-tertiary">Build a new lead form from scratch</p>
            </button>
            <button
              type="button"
              onClick={() => setShowExistingList(!showExistingList)}
              className={`text-left p-5 rounded-card border transition-colors duration-150 ${
                showExistingList ? "border-accent bg-accent/5" : "border-border bg-white hover:border-accent hover:bg-accent/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Copy size={16} strokeWidth={1.5} className="text-accent" />
                <span className="text-[14px] font-semibold text-text-primary">Use Existing</span>
              </div>
              <p className="text-[12px] text-text-tertiary">Pick from your previously created forms</p>
            </button>
          </div>

          {/* Existing forms list — only shown when Use Existing is clicked */}
          {showExistingList && (
          <div className="border-t border-border pt-5">
            <h3 className="text-[13px] font-semibold text-text-tertiary uppercase tracking-[0.4px] mb-3">
              Select a Form
            </h3>
            <div className="space-y-2">
              {existingForms.map((form) => (
                <div
                  key={form.id}
                  className={`flex items-center justify-between p-4 rounded-card border transition-colors duration-150 ${
                    selectedExistingForm === form.id
                      ? "border-accent bg-accent/5"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-text-primary">{form.name}</span>
                    <span className="text-[11px] text-text-tertiary ml-2">
                      {form.fieldsCount} fields &middot; {form.createdAt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUseExisting(form.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-accent border border-accent/30 rounded-button hover:bg-accent/5 transition-colors duration-150"
                    >
                      {selectedExistingForm === form.id && <Check size={12} strokeWidth={2} />}
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(form.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-button hover:bg-surface-page transition-colors duration-150"
                    >
                      <Copy size={12} strokeWidth={1.5} />
                      Duplicate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
          >
            <ArrowLeft size={15} strokeWidth={1.5} /> Back
          </button>
          <button
            onClick={onNext}
            disabled={!selectedExistingForm}
            className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Structure <ArrowRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────── BUILDER MODE ─────────────── */

  /* ── Section renderers ── */
  const renderFormTypeSection = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
          Form name
        </label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
        />
      </div>

      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">
          Form type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "more_volume" as FormType, label: "More volume", desc: "Use a form that's quick to fill out on mobile" },
              { value: "higher_intent" as FormType, label: "Higher intent", desc: "Add a review step for people to confirm info" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFormType(opt.value)}
              className={`text-left p-4 rounded-card border transition-colors duration-150 ${
                formType === opt.value
                  ? "border-accent bg-accent/5"
                  : "border-border bg-white hover:bg-surface-page"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    formType === opt.value ? "border-accent" : "border-border"
                  }`}
                >
                  {formType === opt.value && <div className="h-2 w-2 rounded-full bg-accent" />}
                </div>
                <span className="text-[13px] font-semibold text-text-primary">{opt.label}</span>
              </div>
              <p className="text-[11px] text-text-tertiary pl-6">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[13px] font-medium text-text-primary">Flexible form delivery</span>
            <p className="text-[11px] text-text-tertiary mt-0.5">Let Meta optimize form delivery across placements</p>
          </div>
          <Toggle checked={flexibleDelivery} onChange={() => setFlexibleDelivery(!flexibleDelivery)} />
        </div>
        {flexibleDelivery && (
          <div className="flex gap-3 ml-1">
            {(["optimized", "manual"] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setDeliveryMode(mode)} className="flex items-center gap-2 cursor-pointer">
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    deliveryMode === mode ? "border-accent" : "border-border"
                  }`}
                >
                  {deliveryMode === mode && <div className="h-2 w-2 rounded-full bg-accent" />}
                </div>
                <span className="text-[12px] text-text-primary capitalize">{mode}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderIntroSection = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[13px] font-medium text-text-primary">Background image</span>
          <p className="text-[11px] text-text-tertiary mt-0.5">Add a background image to the intro screen</p>
        </div>
        <Toggle checked={backgroundImage} onChange={() => setBackgroundImage(!backgroundImage)} />
      </div>
      {backgroundImage && (
        <div className="flex items-center gap-3 p-4 border border-dashed border-border rounded-card bg-surface-page">
          <Image size={20} strokeWidth={1.5} className="text-text-tertiary" />
          <span className="text-[12px] text-text-tertiary">Upload an image or drag and drop</span>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-text-primary">Greeting</span>
          <Toggle checked={greetingEnabled} onChange={() => setGreetingEnabled(!greetingEnabled)} />
        </div>
        {greetingEnabled && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
                  Headline
                </label>
                {charCounter(greetingHeadline, 60)}
              </div>
              <input
                type="text"
                value={greetingHeadline}
                onChange={(e) => setGreetingHeadline(e.target.value.slice(0, 60))}
                className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">
                Description format
              </label>
              <div className="flex gap-3 mb-3">
                {(["paragraph", "list"] as const).map((fmt) => (
                  <button key={fmt} type="button" onClick={() => setDescriptionFormat(fmt)} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        descriptionFormat === fmt ? "border-accent" : "border-border"
                      }`}
                    >
                      {descriptionFormat === fmt && <div className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <span className="text-[12px] text-text-primary capitalize">{fmt}</span>
                  </button>
                ))}
              </div>

              {descriptionFormat === "paragraph" ? (
                <textarea
                  value={descriptionParagraph}
                  onChange={(e) => setDescriptionParagraph(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none"
                />
              ) : (
                <div className="space-y-2">
                  {descriptionPoints.map((point, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[11px] text-text-tertiary shrink-0 w-5 text-center">{i + 1}.</span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => updateDescriptionPoint(i, e.target.value.slice(0, 80))}
                          placeholder="Enter a point..."
                          className="w-full h-8 px-3 pr-12 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary">
                          {point.length}/80
                        </span>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addDescriptionPoint}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150 mt-1"
                  >
                    <Plus size={12} strokeWidth={2} /> Add point
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuestionsSection = () => (
    <div className="space-y-5">
      <button
        type="button"
        onClick={addContactField}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-accent border border-accent/30 rounded-button hover:bg-accent/5 transition-colors duration-150"
      >
        <Plus size={13} strokeWidth={1.5} /> Add question
      </button>

      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
          Contact information
        </label>
        <textarea
          value={contactDescription}
          onChange={(e) => setContactDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none"
        />
      </div>

      {/* Field list */}
      <div className="space-y-2">
        {contactFields.map((field) => (
          <div
            key={field.id}
            className="flex items-center gap-3 p-3 rounded-card border border-border-subtle bg-surface-page"
          >
            <GripVertical size={14} strokeWidth={1.5} className="text-text-tertiary shrink-0 cursor-grab" />
            <input
              type="text"
              value={field.name}
              onChange={(e) => updateFieldName(field.id, e.target.value)}
              className="flex-1 h-7 px-2 text-[13px] font-medium border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
            />
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={field.optional}
                onChange={() => toggleFieldOptional(field.id)}
                className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent/30"
              />
              <span className="text-[11px] text-text-tertiary">Optional</span>
            </label>
            <button
              type="button"
              onClick={() => deleteContactField(field.id)}
              className="shrink-0 p-1 text-text-tertiary hover:text-red-500 transition-colors duration-150"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom questions */}
      {customQuestions.length > 0 && (
        <div className="border-t border-border pt-4">
          <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">
            Custom questions
          </label>
          <div className="space-y-2">
            {customQuestions.map((q) => (
              <div key={q.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateCustomQuestion(q.id, e.target.value)}
                  placeholder="Enter your question..."
                  className="flex-1 h-8 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                />
                <button
                  type="button"
                  onClick={() => deleteCustomQuestion(q.id)}
                  className="shrink-0 p-1 text-text-tertiary hover:text-red-500 transition-colors duration-150"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={addCustomQuestion}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
      >
        <Plus size={12} strokeWidth={2} /> Add custom question
      </button>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
          Privacy policy link <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={privacyLink}
          onChange={(e) => setPrivacyLink(e.target.value)}
          placeholder="https://yoursite.com/privacy"
          className={`w-full h-9 px-3 text-[13px] border rounded-input bg-white text-text-primary focus:outline-none transition-colors duration-150 placeholder:text-text-tertiary ${
            privacyLink.trim().length > 0 ? "border-accent focus:border-accent" : "border-border focus:border-accent"
          }`}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
            Link text (optional)
          </label>
          {charCounter(privacyLinkText, 70)}
        </div>
        <input
          type="text"
          value={privacyLinkText}
          onChange={(e) => setPrivacyLinkText(e.target.value.slice(0, 70))}
          placeholder="View our privacy policy"
          className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
        />
      </div>

      {/* Custom disclaimers */}
      <div className="border-t border-border pt-4">
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-3">
          Custom notices
        </label>
        {customDisclaimers.map((disc) => (
          <div key={disc.id} className="border border-border rounded-card p-4 mb-3 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-text-tertiary">Title</span>
                    {charCounter(disc.title, 60)}
                  </div>
                  <input
                    type="text"
                    value={disc.title}
                    onChange={(e) => updateDisclaimer(disc.id, "title", e.target.value.slice(0, 60))}
                    className="w-full h-8 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-text-tertiary block mb-1">Text</span>
                  <textarea
                    value={disc.text}
                    onChange={(e) => updateDisclaimer(disc.id, "text", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 resize-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteDisclaimer(disc.id)}
                className="shrink-0 p-1 text-text-tertiary hover:text-red-500 transition-colors duration-150"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Consents */}
            {disc.consents.map((consent) => (
              <div key={consent.id} className="flex items-center gap-2 pl-2">
                <span className="text-[11px] text-text-tertiary shrink-0">Consent:</span>
                <input
                  type="text"
                  value={consent.label}
                  onChange={(e) => {
                    setCustomDisclaimers((prev) =>
                      prev.map((d) =>
                        d.id === disc.id
                          ? {
                              ...d,
                              consents: d.consents.map((c) =>
                                c.id === consent.id ? { ...c, label: e.target.value } : c,
                              ),
                            }
                          : d,
                      ),
                    );
                  }}
                  className="flex-1 h-7 px-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => toggleConsentOptional(disc.id, consent.id)}
                  className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-badge border transition-colors duration-150 ${
                    consent.optional
                      ? "bg-surface-page text-text-tertiary border-border"
                      : "bg-accent/10 text-accent border-accent/20"
                  }`}
                >
                  {consent.optional ? "Optional" : "Required"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteConsent(disc.id, consent.id)}
                  className="shrink-0 p-0.5 text-text-tertiary hover:text-red-500 transition-colors duration-150"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addConsent(disc.id)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors duration-150"
            >
              <Plus size={11} strokeWidth={2} /> Add consent row
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addDisclaimer}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-accent border border-accent/30 rounded-button hover:bg-accent/5 transition-colors duration-150"
        >
          <Plus size={13} strokeWidth={1.5} /> Add custom disclaimer
        </button>
      </div>
    </div>
  );

  const renderReviewSection = () => (
    <div className="space-y-5">
      <div className="bg-accent/5 border border-accent/20 rounded-[8px] p-4">
        <p className="text-[13px] text-text-primary leading-relaxed">
          A review screen will be shown before submission so leads can confirm their information.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[13px] font-medium text-text-primary">Phone verification</span>
          <p className="text-[11px] text-text-tertiary mt-0.5">Require phone verification with SMS code</p>
        </div>
        <Toggle checked={phoneVerification} onChange={() => setPhoneVerification(!phoneVerification)} />
      </div>
    </div>
  );

  const renderEndingSection = () => (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
            Headline
          </label>
          {charCounter(endingHeadline, 60)}
        </div>
        <input
          type="text"
          value={endingHeadline}
          onChange={(e) => setEndingHeadline(e.target.value.slice(0, 60))}
          className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
          Description
        </label>
        <textarea
          value={endingDescription}
          onChange={(e) => setEndingDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 resize-none"
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">
          Additional action
        </label>
        <div className="flex gap-3">
          {(
            [
              { value: "website" as EndingAction, label: "Go to website" },
              { value: "file" as EndingAction, label: "View file" },
              { value: "call" as EndingAction, label: "Call business" },
            ] as const
          ).map((opt) => (
            <button key={opt.value} type="button" onClick={() => setEndingAction(opt.value)} className="flex items-center gap-2 cursor-pointer">
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  endingAction === opt.value ? "border-accent" : "border-border"
                }`}
              >
                {endingAction === opt.value && <div className="h-2 w-2 rounded-full bg-accent" />}
              </div>
              <span className="text-[12px] text-text-primary">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1.5">
          Link
        </label>
        <input
          type="url"
          value={endingLink}
          onChange={(e) => setEndingLink(e.target.value)}
          placeholder="https://yoursite.com"
          className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
            Call to action
          </label>
          {charCounter(endingCTA, 60)}
        </div>
        <input
          type="text"
          value={endingCTA}
          onChange={(e) => setEndingCTA(e.target.value.slice(0, 60))}
          className="w-full h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
        />
      </div>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "form_type":
        return renderFormTypeSection();
      case "intro":
        return renderIntroSection();
      case "questions":
        return renderQuestionsSection();
      case "privacy":
        return renderPrivacySection();
      case "review":
        return renderReviewSection();
      case "ending":
        return renderEndingSection();
    }
  };

  /* ── Phone preview content ── */
  const renderPhonePreview = () => {
    switch (activeSection) {
      case "form_type":
        return (
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-[12px] bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
              <span className="text-[14px] font-bold text-accent">GP</span>
            </div>
            <div className="text-[10px] text-text-tertiary text-center">Godrej Properties</div>
            <h4 className="text-[13px] font-semibold text-text-primary text-center leading-snug">
              {formName || "Form headline"}
            </h4>
          </div>
        );
      case "intro":
        return (
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-text-primary leading-snug">
              {greetingHeadline || "Headline text"}
            </h4>
            {descriptionFormat === "paragraph" ? (
              <p className="text-[10px] text-text-secondary leading-relaxed">
                {descriptionParagraph || "Description paragraph..."}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {descriptionPoints.filter((p) => p.trim()).map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-text-secondary leading-relaxed">
                    <span className="text-accent mt-px shrink-0">&#10003;</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      case "questions":
        return (
          <div className="space-y-3">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
              Contact information
            </p>
            {contactFields.map((field) => (
              <div key={field.id}>
                <label className="block text-[10px] font-medium text-text-tertiary mb-1">
                  {field.name}
                  {!field.optional && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="w-full h-7 px-2 text-[10px] border border-gray-200 rounded-[6px] bg-gray-50 text-text-tertiary flex items-center">
                  Enter {field.name.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        );
      case "privacy":
        return (
          <div className="space-y-3">
            <h4 className="text-[13px] font-semibold text-text-primary leading-snug">
              {greetingHeadline || "Headline text"}
            </h4>
            {descriptionFormat === "list" ? (
              <ul className="space-y-1.5">
                {descriptionPoints.filter((p) => p.trim()).map((point, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-text-secondary leading-relaxed">
                    <span className="text-accent mt-px shrink-0">&#10003;</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-text-secondary leading-relaxed">
                {descriptionParagraph}
              </p>
            )}
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[9px] text-text-tertiary">
                By submitting, you agree to our{" "}
                <span className="text-accent underline">privacy policy</span>.
              </p>
            </div>
          </div>
        );
      case "review":
        return (
          <div className="space-y-3">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.3px]">
              Review your info
            </p>
            <div className="space-y-2">
              {contactFields.slice(0, 3).map((field) => (
                <div key={field.id} className="flex items-center justify-between">
                  <span className="text-[10px] text-text-tertiary">{field.name}</span>
                  <span className="text-[10px] text-text-primary">---</span>
                </div>
              ))}
            </div>
            {phoneVerification && (
              <div className="border-t border-gray-100 pt-2">
                <p className="text-[9px] text-text-tertiary">
                  A verification code will be sent via SMS
                </p>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-7 w-7 border border-gray-200 rounded-[4px] bg-gray-50" />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "ending":
        return (
          <div className="space-y-3 text-center pt-4">
            <div className="h-10 w-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto">
              <Check size={18} strokeWidth={2} className="text-green-600" />
            </div>
            <h4 className="text-[13px] font-semibold text-text-primary leading-snug">
              {endingHeadline || "Thanks, you're all set."}
            </h4>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              {endingDescription || "Description"}
            </p>
            <button
              type="button"
              className="w-full h-8 bg-accent text-white text-[11px] font-medium rounded-[8px] mt-2"
            >
              {endingCTA || "Continue"}
            </button>
          </div>
        );
    }
  };

  /* ── Builder layout ── */
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[180px_1fr_300px] gap-0 bg-white border border-border rounded-card overflow-hidden min-h-[560px]">
        {/* Left sidebar — vertical stepper */}
        <div className="bg-white border-r border-border py-3">
          <div className="px-3 mb-3">
            <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">
              Form builder
            </span>
          </div>
          <nav className="space-y-0.5 px-1.5">
            {visibleSidebarItems.map((item) => {
              const isActive = activeSection === item.key;
              const isComplete = isSectionComplete(item.key, completionState);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-left transition-colors duration-150 ${
                    isActive
                      ? "text-accent font-medium bg-accent/5"
                      : "text-text-secondary hover:bg-surface-page"
                  }`}
                >
                  {/* Status indicator */}
                  {isActive ? (
                    <div className="h-[18px] w-[18px] rounded-full border-2 border-accent flex items-center justify-center shrink-0">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                    </div>
                  ) : isComplete ? (
                    <div className="h-[18px] w-[18px] rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Check size={11} strokeWidth={3} className="text-white" />
                    </div>
                  ) : (
                    <div className="h-[18px] w-[18px] rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <span className="text-[12px]">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center column — active section content */}
        <div className="p-6 overflow-y-auto">
          <h2 className="text-[16px] font-semibold text-text-primary mb-5 capitalize">
            {visibleSidebarItems.find((s) => s.key === activeSection)?.label}
          </h2>
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderActiveSection()}

            {/* Section navigation (Next/Previous within form builder) */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-subtle">
              {(() => {
                const currentIdx = visibleSidebarItems.findIndex((s) => s.key === activeSection);
                const prevSection = currentIdx > 0 ? visibleSidebarItems[currentIdx - 1] : null;
                const nextSection = currentIdx < visibleSidebarItems.length - 1 ? visibleSidebarItems[currentIdx + 1] : null;
                return (
                  <>
                    {prevSection ? (
                      <button onClick={() => setActiveSection(prevSection.key)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors">
                        ← {prevSection.label}
                      </button>
                    ) : <div />}
                    {nextSection ? (
                      <button onClick={() => setActiveSection(nextSection.key)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors">
                        {nextSection.label} →
                      </button>
                    ) : (
                      <span className="text-[11px] text-text-tertiary">Last section — click Continue below</span>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </div>

        {/* Right column — phone preview */}
        <div className="bg-surface-page border-l border-border p-4 flex flex-col items-center">
          {/* FB/IG toggle */}
          <div className="flex items-center gap-0 mb-4 bg-white rounded-[8px] border border-border overflow-hidden">
            <div className="px-3 py-1.5 text-[11px] font-medium text-accent bg-accent/5 border-r border-border">
              FB
            </div>
            <div className="px-3 py-1.5 text-[11px] font-medium text-text-tertiary">
              IG
            </div>
          </div>

          {/* Phone frame */}
          <div className="w-[280px] rounded-[32px] border-[8px] border-[#1A1A1A] bg-white overflow-hidden shadow-lg">
            {/* Notch */}
            <div className="flex justify-center pt-2 pb-1 bg-white">
              <div className="h-[6px] w-[80px] rounded-full bg-[#1A1A1A]" />
            </div>

            {/* Background image */}
            {backgroundImage && (activeSection === "intro" || activeSection === "form_type") && (
              <div className="h-[100px] bg-gradient-to-b from-[#1a365d] via-[#2d4a7a] to-[#4a7ab5] flex items-end px-4 pb-3">
                <div className="text-white">
                  <div className="text-[9px] font-medium opacity-70">GODREJ PROPERTIES</div>
                  <div className="text-[11px] font-semibold mt-0.5">Godrej Air — Phase 3</div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-4 pb-4 pt-3 min-h-[380px] max-h-[440px] overflow-y-auto">
              {renderPhonePreview()}
            </div>

            {/* CTA button */}
            <div className="px-4 pb-3">
              <div className="w-full h-8 bg-accent text-white text-[11px] font-medium rounded-[8px] flex items-center justify-center gap-1">
                Continue <ArrowRight size={12} strokeWidth={2} />
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-2 bg-white">
              <div className="h-[4px] w-[100px] rounded-full bg-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setFormMode("select")}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
        >
          <ArrowLeft size={15} strokeWidth={1.5} /> Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
        >
          Continue to Structure <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
