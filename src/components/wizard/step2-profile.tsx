"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Pencil,
  Sparkles,
  Send,
  X,
  MessageCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractedProfile, strategyData } from "@/lib/wizard-data";

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

interface Persona {
  id: string;
  name: string;
  age: number;
  role: string;
  bullets: string[];
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.4, ease: "easeOut" as const },
  }),
};

export function Step2BusinessProfile({ onNext, onBack }: Step2Props) {
  const [isGenerating, setIsGenerating] = useState(true);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [regeneratingPersonaId, setRegeneratingPersonaId] = useState<string | null>(null);
  const [manualEditingPersonaId, setManualEditingPersonaId] = useState<string | null>(null);
  const [manualEditText, setManualEditText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Editable brief fields
  const [briefFields, setBriefFields] = useState({
    positioning: extractedProfile.positioning,
    offerSummary: extractedProfile.offerSummary,
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [coreUSPs, setCoreUSPs] = useState([...extractedProfile.coreUSPs]);
  const [keyBenefits, setKeyBenefits] = useState([...extractedProfile.keyBenefits]);
  const [newUSP, setNewUSP] = useState("");
  const [addingUSP, setAddingUSP] = useState(false);
  const [newBenefit, setNewBenefit] = useState("");
  const [addingBenefit, setAddingBenefit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGenerating(false);
      setPersonas(strategyData.personas as Persona[]);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const openChat = () => {
    setChatOpen(true);
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: "ai",
          text: `You have ${personas.length} personas. You can add, remove, or modify any of them.\n\nTry:\n• "Add a persona for first-time homebuyers"\n• "Remove Suresh"\n• "Make Meera younger"\n• "Focus more on investment buyers"`,
        },
      ]);
    }
  };

  const closeChat = () => {
    setChatOpen(false);
    setChatInput("");
  };

  const formatPersonaText = (persona: Persona) =>
    `${persona.name}, ${persona.age}\n${persona.role}\n\n${persona.bullets.map((b) => `• ${b}`).join("\n")}`;

  const parsePersonaText = (text: string, original: Persona): Persona => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return original;
    // line 0: "Name, Age"
    const firstCommaIdx = lines[0].lastIndexOf(",");
    const name = firstCommaIdx > -1 ? lines[0].slice(0, firstCommaIdx).trim() : original.name;
    const ageRaw = firstCommaIdx > -1 ? parseInt(lines[0].slice(firstCommaIdx + 1).trim(), 10) : NaN;
    const age = isNaN(ageRaw) ? original.age : ageRaw;
    // line 1: role (if not a bullet)
    const roleCandidate = lines[1] && !lines[1].startsWith("•") && !lines[1].startsWith("-") ? lines[1] : original.role;
    // remaining: bullets
    const bullets = lines
      .slice(2)
      .filter((l) => l.startsWith("•") || l.startsWith("-"))
      .map((l) => l.replace(/^[•\-]\s*/, "").trim())
      .filter(Boolean);
    return { ...original, name, age, role: roleCandidate, bullets: bullets.length > 0 ? bullets : original.bullets };
  };

  const startManualEdit = (persona: Persona) => {
    setManualEditingPersonaId(persona.id);
    setManualEditText(formatPersonaText(persona));
  };

  const cancelManualEdit = () => {
    setManualEditingPersonaId(null);
    setManualEditText("");
  };

  const saveManualEdit = (persona: Persona) => {
    const updated = parsePersonaText(manualEditText, persona);
    setPersonas((prev) => prev.map((p) => (p.id === persona.id ? updated : p)));
    setManualEditingPersonaId(null);
    setManualEditText("");
  };

  const startEditPersona = (persona: Persona) => {
    setEditingPersonaId(persona.id);
    setEditInstruction("");
  };

  const cancelEditPersona = () => {
    setEditingPersonaId(null);
    setEditInstruction("");
  };

  const regeneratePersona = (persona: Persona) => {
    if (!editInstruction.trim()) return;
    const instruction = editInstruction.trim();
    setEditingPersonaId(null);
    setEditInstruction("");
    setRegeneratingPersonaId(persona.id);

    setTimeout(() => {
      const lower = instruction.toLowerCase();
      const updated: Persona = { ...persona, bullets: [...persona.bullets] };

      // Simulate AI applying the instruction
      if (lower.includes("younger") || lower.includes("young")) {
        updated.age = Math.max(22, persona.age - 6);
      } else if (lower.includes("older") || lower.includes("senior")) {
        updated.age = persona.age + 6;
      }
      if (lower.includes("investor") || lower.includes("investment")) {
        updated.role = "Real Estate Investor, High-Net-Worth Individual";
        updated.bullets = [
          "Actively looking to diversify portfolio with residential real estate in Bangalore.",
          "Focused on rental yield and capital appreciation — budget ₹2–4Cr.",
          "Prefers branded developers with strong track record and RERA compliance.",
        ];
      } else if (lower.includes("first-time") || lower.includes("first time") || lower.includes("newlywed") || lower.includes("married")) {
        updated.role = "First-Time Homebuyer, Recently Married";
        updated.bullets = [
          "Just married and looking for their first own home — currently living with parents.",
          "Budget-conscious but wants a reputed builder for peace of mind.",
          "Prefers 2BHK close to metro and shopping, with option to upgrade later.",
        ];
      } else if (lower.includes("budget") || lower.includes("affordable") || lower.includes("cheaper")) {
        updated.bullets = updated.bullets.map((b) =>
          b.includes("₹") ? b.replace(/₹[\d.]+Cr/g, "₹1.2Cr") : b
        );
      } else if (lower.includes("nri") || lower.includes("abroad") || lower.includes("overseas")) {
        updated.role = `NRI Investor, ${persona.role.split(",").slice(1).join(",").trim() || "Based Abroad"}`;
        updated.bullets = [
          "Based overseas and looking to invest in home city as a long-term asset.",
          "Wants hassle-free ownership — prefers managed properties with rental potential.",
          "Trusts branded developers; RERA compliance and transparency are non-negotiable.",
        ];
      } else {
        // Generic: append the instruction as a new insight and refresh bullets slightly
        updated.bullets = [
          ...persona.bullets.slice(0, 2),
          `${instruction.charAt(0).toUpperCase() + instruction.slice(1)}.`,
        ];
      }

      setPersonas((prev) => prev.map((p) => (p.id === persona.id ? updated : p)));
      setRegeneratingPersonaId(null);
    }, 1800);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatInput("");
    setIsAiTyping(true);

    setTimeout(() => {
      const lower = userMsg.toLowerCase();
      let responseText = "";

      if (lower.includes("add") || lower.includes("new persona")) {
        const newPersona: Persona = {
          id: `p-${Date.now()}`,
          name: "Priya",
          age: 29,
          role: "First-Time Homebuyer, Recently Married",
          bullets: [
            "Just married and looking for their first own home — currently living with parents.",
            "Budget-conscious but wants a reputed builder for peace of mind.",
            "Prefers 2BHK with option to upgrade later — close to metro and shopping.",
          ],
        };
        setPersonas((prev) => [...prev, newPersona]);
        responseText = `Added a new persona:\n\n**${newPersona.name}, ${newPersona.age} (${newPersona.role})**\n${newPersona.bullets.map((b) => `• ${b}`).join("\n")}\n\nAnything else?`;
      } else if (lower.includes("remove")) {
        const nameToRemove = personas.find((p) => lower.includes(p.name.toLowerCase()));
        if (nameToRemove) {
          setPersonas((prev) => prev.filter((p) => p.id !== nameToRemove.id));
          responseText = `Removed **${nameToRemove.name}** from the personas. You now have ${personas.length - 1} personas.\n\nAnything else?`;
        } else {
          responseText = `I couldn't find that persona. Current personas: ${personas.map((p) => p.name).join(", ")}. Which one would you like to remove?`;
        }
      } else {
        // Generic edit — simulate an update to the first matching persona
        const matchedPersona = personas.find((p) => lower.includes(p.name.toLowerCase()));
        if (matchedPersona) {
          const updated = { ...matchedPersona };
          if (lower.includes("younger")) updated.age = Math.max(22, updated.age - 5);
          if (lower.includes("older")) updated.age = updated.age + 5;
          if (lower.includes("budget") && lower.includes("lower")) {
            updated.bullets = updated.bullets.map((b) =>
              b.includes("budget") || b.includes("Budget") || b.includes("₹")
                ? b.replace(/₹[\d.]+Cr/g, "₹1.2Cr")
                : b
            );
          }
          setPersonas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          responseText = `Updated **${updated.name}**:\n\n**${updated.name}, ${updated.age} (${updated.role})**\n${updated.bullets.map((b) => `• ${b}`).join("\n")}\n\nAnything else?`;
        } else {
          responseText = `I'll adjust the personas based on your feedback. Could you be more specific? Current personas: ${personas.map((p) => `${p.name} (${p.age})`).join(", ")}.`;
        }
      }

      setChatMessages((prev) => [...prev, { role: "ai", text: responseText }]);
      setIsAiTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Campaign Brief */}
      <div className="bg-white border border-border rounded-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-semibold text-text-primary">Campaign Brief</h2>
          <button onClick={onBack}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover transition-colors duration-150">
            <Pencil size={12} strokeWidth={1.5} /> Edit
          </button>
        </div>

        {/* Row 1: Short fields */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: "Project Name", value: extractedProfile.projectName },
            { label: "Location", value: `${extractedProfile.city} — ${extractedProfile.geography}` },
            { label: "Price Range", value: extractedProfile.pricePositioning },
            { label: "Campaign Objective", value: "Lead Generation" },
          ].map((field) => (
            <div key={field.label}>
              <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-1">{field.label}</span>
              <span className="block text-[13px] text-text-primary font-medium">{field.value}</span>
            </div>
          ))}
        </div>

        {/* Row 2: Positioning (editable) */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">Positioning</span>
            {editingField !== "positioning" && (
              <button onClick={() => setEditingField("positioning")} className="p-0.5 text-text-tertiary hover:text-accent transition-colors">
                <Pencil size={10} strokeWidth={1.5} />
              </button>
            )}
          </div>
          {editingField === "positioning" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={briefFields.positioning}
                onChange={(e) => setBriefFields({ ...briefFields, positioning: e.target.value })}
                autoFocus
                className="flex-1 h-8 px-3 text-[13px] bg-white border border-accent rounded-button text-text-primary focus:outline-none"
              />
              <button onClick={() => setEditingField(null)} className="h-8 px-3 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors">
                Done
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-text-primary font-medium">{briefFields.positioning}</p>
          )}
        </div>

        {/* Row 3: Offer Summary (editable) */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px]">Offer Summary</span>
            {editingField !== "offerSummary" && (
              <button onClick={() => setEditingField("offerSummary")} className="p-0.5 text-text-tertiary hover:text-accent transition-colors">
                <Pencil size={10} strokeWidth={1.5} />
              </button>
            )}
          </div>
          {editingField === "offerSummary" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={briefFields.offerSummary}
                onChange={(e) => setBriefFields({ ...briefFields, offerSummary: e.target.value })}
                autoFocus
                className="flex-1 h-8 px-3 text-[13px] bg-white border border-accent rounded-button text-text-primary focus:outline-none"
              />
              <button onClick={() => setEditingField(null)} className="h-8 px-3 text-[12px] font-medium bg-accent text-white rounded-button hover:bg-accent-hover transition-colors">
                Done
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-text-secondary leading-relaxed">{briefFields.offerSummary}</p>
          )}
        </div>

        {/* Row 4: Core USPs as chips (add/remove) */}
        <div className="mb-4">
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">Core USPs</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {coreUSPs.map((usp, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-badge bg-accent/5 text-accent border border-accent/20">
                {usp}
                <button onClick={() => setCoreUSPs(coreUSPs.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-accent/10 rounded-full transition-colors">
                  <X size={10} strokeWidth={2} />
                </button>
              </span>
            ))}
            {addingUSP ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newUSP}
                  onChange={(e) => setNewUSP(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newUSP.trim()) { setCoreUSPs([...coreUSPs, newUSP.trim()]); setNewUSP(""); setAddingUSP(false); }
                    if (e.key === "Escape") { setNewUSP(""); setAddingUSP(false); }
                  }}
                  autoFocus
                  placeholder="Type USP..."
                  className="h-7 w-40 px-2 text-[11px] bg-white border border-accent rounded-button text-text-primary focus:outline-none placeholder:text-text-tertiary"
                />
                <button onClick={() => { if (newUSP.trim()) { setCoreUSPs([...coreUSPs, newUSP.trim()]); } setNewUSP(""); setAddingUSP(false); }} className="p-1 text-accent hover:bg-accent/10 rounded-full transition-colors">
                  <Plus size={12} strokeWidth={2} />
                </button>
              </span>
            ) : (
              <button onClick={() => setAddingUSP(true)} className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-1 rounded-badge border border-dashed border-accent/30 text-accent hover:bg-accent/5 transition-colors">
                <Plus size={11} strokeWidth={2} />
                Add
              </button>
            )}
          </div>
        </div>

        {/* Row 5: Key Benefits as chips (add/remove) */}
        <div>
          <span className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">Key Benefits</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {keyBenefits.map((benefit, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1.5 py-1 rounded-badge bg-surface-page text-text-secondary border border-border">
                {benefit}
                <button onClick={() => setKeyBenefits(keyBenefits.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-surface-secondary rounded-full transition-colors">
                  <X size={10} strokeWidth={2} />
                </button>
              </span>
            ))}
            {addingBenefit ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newBenefit.trim()) { setKeyBenefits([...keyBenefits, newBenefit.trim()]); setNewBenefit(""); setAddingBenefit(false); }
                    if (e.key === "Escape") { setNewBenefit(""); setAddingBenefit(false); }
                  }}
                  autoFocus
                  placeholder="Type benefit..."
                  className="h-7 w-44 px-2 text-[11px] bg-white border border-border rounded-button text-text-primary focus:outline-none placeholder:text-text-tertiary"
                />
                <button onClick={() => { if (newBenefit.trim()) { setKeyBenefits([...keyBenefits, newBenefit.trim()]); } setNewBenefit(""); setAddingBenefit(false); }} className="p-1 text-text-secondary hover:bg-surface-secondary rounded-full transition-colors">
                  <Plus size={12} strokeWidth={2} />
                </button>
              </span>
            ) : (
              <button onClick={() => setAddingBenefit(true)} className="inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-1 rounded-badge border border-dashed border-border text-text-secondary hover:bg-surface-page transition-colors">
                <Plus size={11} strokeWidth={2} />
                Add
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: AI Persona Generation */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.5} className="text-accent" />
            <h3 className="text-[16px] font-semibold text-text-primary">AI-Generated Personas</h3>
            {isGenerating && <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />}
          </div>
          {!isGenerating && (
            <button onClick={openChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-accent border border-accent/30 rounded-button hover:bg-accent/5 transition-colors duration-150">
              <MessageCircle size={13} strokeWidth={1.5} />
              Edit Personas
            </button>
          )}
        </div>

        {isGenerating ? (
          <div className="space-y-4">
            <div className="bg-white border border-border rounded-card p-5">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] text-text-secondary">Generating personas based on your business profile...</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white border border-border rounded-card p-5 space-y-3">
                  <div className="h-5 w-3/4 bg-surface-secondary rounded-[8px] animate-pulse" />
                  <div className="h-3 w-full bg-surface-secondary rounded-[8px] animate-pulse" />
                  <div className="space-y-2 pt-1">
                    <div className="h-3 w-full bg-surface-secondary rounded-[8px] animate-pulse" />
                    <div className="h-3 w-5/6 bg-surface-secondary rounded-[8px] animate-pulse" />
                    <div className="h-3 w-4/5 bg-surface-secondary rounded-[8px] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {personas.map((persona, i) => {
                const isEditing = editingPersonaId === persona.id;
                const isManualEditing = manualEditingPersonaId === persona.id;
                const isRegenerating = regeneratingPersonaId === persona.id;
                const anyActive = editingPersonaId !== null || manualEditingPersonaId !== null || regeneratingPersonaId !== null;
                const isLocked = anyActive && !isEditing && !isManualEditing && !isRegenerating;

                /* ── Regenerating skeleton ── */
                if (isRegenerating) {
                  return (
                    <div key={persona.id} className="bg-white border border-accent/30 rounded-card p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-[11px] font-medium text-accent">Regenerating with AI…</span>
                      </div>
                      <div className="h-4 w-2/3 bg-surface-secondary rounded-[6px] animate-pulse" />
                      <div className="h-3 w-1/2 bg-surface-secondary rounded-[6px] animate-pulse" />
                      <div className="space-y-2 pt-1">
                        <div className="h-3 w-full bg-surface-secondary rounded-[6px] animate-pulse" />
                        <div className="h-3 w-5/6 bg-surface-secondary rounded-[6px] animate-pulse" />
                        <div className="h-3 w-4/5 bg-surface-secondary rounded-[6px] animate-pulse" />
                      </div>
                    </div>
                  );
                }

                /* ── Manual edit mode ── */
                if (isManualEditing) {
                  return (
                    <motion.div
                      key={persona.id}
                      layout
                      className="bg-white border-2 border-accent rounded-card p-5 flex flex-col gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <Pencil size={12} strokeWidth={1.5} className="text-accent" />
                        <span className="text-[10px] font-semibold text-accent uppercase tracking-[0.5px]">Edit manually</span>
                      </div>
                      <textarea
                        autoFocus
                        value={manualEditText}
                        onChange={(e) => setManualEditText(e.target.value)}
                        className="flex-1 w-full px-3 py-2.5 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelManualEdit}
                          className="flex-1 h-8 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveManualEdit(persona)}
                          className="flex-1 h-8 text-[12px] font-medium text-white bg-accent rounded-button hover:bg-accent-hover transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                /* ── AI edit mode ── */
                if (isEditing) {
                  return (
                    <motion.div
                      key={persona.id}
                      layout
                      className="bg-white border-2 border-accent rounded-card p-5 flex flex-col gap-4"
                    >
                      {/* Persona header (read-only context) */}
                      <div>
                        <h4 className="text-[14px] font-semibold text-text-primary">
                          {persona.name}, {persona.age}
                        </h4>
                        <p className="text-[11px] text-text-tertiary mt-0.5">{persona.role}</p>
                      </div>

                      {/* AI instruction */}
                      <div className="flex-1 flex flex-col">
                        <label className="block text-[10px] font-semibold text-accent uppercase tracking-[0.5px] mb-2">
                          What should AI change?
                        </label>
                        <textarea
                          autoFocus
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); regeneratePersona(persona); } }}
                          placeholder="e.g., make them an NRI investor, focus on budget segment, add more urgency…"
                          className="flex-1 w-full px-3 py-2 text-[12px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent resize-none leading-relaxed placeholder:text-text-tertiary"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={cancelEditPersona}
                          className="flex-1 h-8 text-[12px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => regeneratePersona(persona)}
                          disabled={!editInstruction.trim()}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[12px] font-medium text-white bg-accent rounded-button hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RefreshCw size={12} strokeWidth={2} />
                          Regenerate
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                /* ── View mode ── */
                return (
                  <motion.div
                    key={persona.id}
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className={`bg-white border rounded-card p-5 flex flex-col transition-opacity duration-150 ${
                      isLocked ? "opacity-40 pointer-events-none" : "border-border"
                    }`}
                  >
                    <h4 className="text-[14px] font-semibold text-text-primary truncate mb-0.5">
                      {persona.name}, {persona.age}
                    </h4>
                    <p className="text-[11px] text-text-tertiary mb-3">{persona.role}</p>
                    <div className="space-y-3 flex-1">
                      {["Want", "Pain point", "Solution"].map((title, j) =>
                        persona.bullets[j] ? (
                          <div key={j}>
                            <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.5px] mb-0.5">
                              {title}
                            </div>
                            <p className="text-[12px] text-text-secondary leading-relaxed">
                              {persona.bullets[j]}
                            </p>
                          </div>
                        ) : null
                      )}
                    </div>
                    <div className="flex gap-2 pt-3 mt-4 border-t border-border">
                      <button
                        onClick={() => startManualEdit(persona)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium text-text-secondary border border-border rounded-button hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-colors"
                      >
                        <Pencil size={11} strokeWidth={1.5} />
                        Edit
                      </button>
                      <button
                        onClick={() => startEditPersona(persona)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 text-[11px] font-medium text-text-secondary border border-border rounded-button hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-colors"
                      >
                        <Sparkles size={11} strokeWidth={1.5} />
                        Refresh
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-[12px] text-text-tertiary">
              These personas will be used to generate ad sets, creatives, and targeting strategy.
            </p>
          </div>
        )}
      </div>

      {/* Global Chat Editor (Slide-over panel) */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex justify-end"
          >
            <div className="absolute inset-0 bg-black/20" onClick={closeChat} />

            <motion.div
              initial={{ x: 440 }}
              animate={{ x: 0 }}
              exit={{ x: 440 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-[440px] h-full bg-white border-l border-border flex flex-col shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <div className="text-[14px] font-semibold text-text-primary">Edit Personas</div>
                  <div className="text-[12px] text-text-secondary mt-0.5">{personas.length} personas defined</div>
                </div>
                <button onClick={closeChat} className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-secondary rounded-button transition-colors">
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>

              {/* Current Personas Preview */}
              <div className="px-5 py-3 bg-surface-page border-b border-border-subtle max-h-[200px] overflow-y-auto">
                <div className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-2">Current Personas</div>
                <div className="space-y-2">
                  {personas.map((p) => (
                    <div key={p.id} className="text-[11px]">
                      <span className="font-medium text-text-primary">{p.name}, {p.age}</span>
                      <span className="text-text-tertiary"> — {p.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-[10px] text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-accent text-white rounded-br-[4px]"
                        : "bg-surface-page text-text-primary border border-border-subtle rounded-bl-[4px]"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-[10px] bg-surface-page border border-border-subtle rounded-bl-[4px]">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-1.5 w-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 border-t border-border bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder='e.g., "Add a first-time homebuyer persona"'
                    className="flex-1 h-9 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatInput.trim() || isAiTyping}
                    className="h-9 w-9 flex items-center justify-center bg-accent text-white rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Send size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
          <ArrowLeft size={15} strokeWidth={1.5} /> Back
        </button>
        <button onClick={onNext} disabled={isGenerating}
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
          Confirm & Generate Strategy <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
