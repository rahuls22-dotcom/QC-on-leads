"use client";

import { useState } from "react";
import { Upload, ArrowRight, X, FileText, ChevronDown, Check } from "lucide-react";
import { existingClients, cities, adAccounts, facebookPages } from "@/lib/wizard-data";

interface Step1Props {
  onNext: () => void;
}

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat" as const,
  backgroundPosition: "right 12px center",
};


function SelectField({ label, options, placeholder, value, onChange, required }: {
  label: string; options: (string | { value: string; label: string })[]; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  // Custom popover dropdown — replaces the native <select> that rendered as the
  // OS's dark-grey menu. Matches the AgentPicker / CountryCode dropdowns we
  // already ship: button trigger with chevron, popover panel with hover state,
  // dedicated visual for the "Create new" escape hatch (any option whose value
  // starts with "__" is highlighted in accent purple).
  const [open, setOpen] = useState(false);
  const normalised = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );
  const selected = normalised.find((o) => o.value === value);

  return (
    <div>
      <label className="block text-[13px] font-medium text-text-primary mb-1.5">
        {label}{required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`w-full h-10 px-3 flex items-center justify-between text-left text-[13px] border border-border rounded-input bg-white transition-colors duration-150 focus:outline-none focus:border-accent ${
            selected ? "text-text-primary" : "text-text-tertiary"
          }`}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown
            size={13}
            strokeWidth={1.5}
            className={`text-text-tertiary shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-border rounded-card shadow-lg z-40 max-h-[260px] overflow-y-auto py-1">
              {normalised.map((opt) => {
                const isActive = opt.value === value;
                const isAction = opt.value.startsWith("__");
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                      isAction
                        ? "text-accent font-medium hover:bg-accent/5"
                        : isActive
                          ? "bg-accent/5 text-text-primary"
                          : "text-text-primary hover:bg-surface-page"
                    }`}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isActive && !isAction && (
                      <Check size={13} strokeWidth={2} className="text-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TextField({ label, placeholder, value, onChange, required, type = "text", helper, prefix }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; helper?: string; prefix?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-text-primary mb-1.5">
        {label}{required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-tertiary">{prefix}</span>
        )}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full h-10 ${prefix ? "pl-7" : "px-3"} pr-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary`} />
      </div>
      {helper && <p className="text-[11px] text-text-tertiary mt-1">{helper}</p>}
    </div>
  );
}

function TextAreaField({ label, placeholder, value, onChange, required, rows = 3 }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; required?: boolean; rows?: number;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-text-primary mb-1.5">
        {label}{required && <span className="text-status-error ml-0.5">*</span>}
      </label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2.5 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none leading-relaxed" />
    </div>
  );
}

export function Step1CampaignInput({ onNext }: Step1Props) {
  const [campaignName, setCampaignName] = useState("");
  const [project, setProject] = useState("");
  const [isNewProject, setIsNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [projectFiles, setProjectFiles] = useState<string[]>([]);

  const [objectiveType, setObjectiveType] = useState<"leads" | "verified_leads" | "qualified_leads">("leads");
  const [targetCount, setTargetCount] = useState("");
  const [campaignDays, setCampaignDays] = useState("");

  const [offer, setOffer] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [campaignBrief, setCampaignBrief] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["Bangalore"]);
  const [locationInput, setLocationInput] = useState("");
  const [budgetCeiling, setBudgetCeiling] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [facebookPage, setFacebookPage] = useState("");

  const handleProjectChange = (v: string) => {
    if (v === "__new__") {
      setProject("");
      setIsNewProject(true);
    } else {
      setProject(v);
      setIsNewProject(false);
    }
  };

  const locationSuggestions = ["All India", ...cities, "Dubai", "Singapore", "San Francisco", "London", "New York"].filter(
    (l) => !selectedLocations.includes(l) && l.toLowerCase().includes(locationInput.toLowerCase())
  );

  const addLocation = (loc: string) => {
    if (!selectedLocations.includes(loc)) {
      setSelectedLocations((prev) => [...prev, loc]);
    }
    setLocationInput("");
  };

  const removeLocation = (loc: string) => {
    setSelectedLocations((prev) => prev.filter((l) => l !== loc));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFiles((prev) => [...prev, "Godrej_Air_Brochure.pdf"]);
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h2 className="text-[20px] font-semibold text-text-primary">Campaign Input</h2>
        <p className="text-meta text-text-secondary mt-1">Provide campaign details and the AI will generate a complete strategy</p>
      </div>

      {/* Campaign Setup card */}
      <div className="bg-white border border-border rounded-card p-6 space-y-5">
        <div>
          <h3 className="text-[14px] font-semibold text-text-primary">Campaign Setup</h3>
          <p className="text-[12px] text-text-secondary mt-0.5">Name your campaign, select a project, and define your objective.</p>
        </div>

        {/* Campaign Name */}
        <TextField label="Campaign Name" placeholder="e.g., Godrej" value={campaignName} onChange={setCampaignName} required />

        {/* Project */}
        <div>
          <SelectField label="Project" options={[...existingClients, { value: "__new__", label: "+ Create new project" }]}
            placeholder="Select a project..." value={isNewProject ? "" : project} onChange={handleProjectChange} required />

          {isNewProject && (
            <div className="mt-3 ml-2 bg-surface-page border border-border-subtle rounded-[8px] p-4 space-y-4">
              <TextField label="Project Name" placeholder="e.g., Godrej Air Launch"
                value={newProjectName} onChange={setNewProjectName} required />
              <TextAreaField label="Description" placeholder="Brief project description (optional)"
                value={newProjectDescription} onChange={setNewProjectDescription} rows={2} />

              {/* Project Knowledge Base */}
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1.5">Project Knowledge Base <span className="text-text-tertiary font-normal">(optional)</span></label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); setProjectFiles((prev) => [...prev, "Project_Brochure.pdf"]); }}
                  onClick={() => setProjectFiles((prev) => [...prev, "Project_Brochure.pdf"])}
                  className="border-2 border-dashed border-border rounded-input p-4 text-center cursor-pointer hover:border-border-hover hover:bg-white/50 transition-all duration-150"
                >
                  <Upload size={16} strokeWidth={1.5} className="mx-auto text-text-tertiary mb-1.5" />
                  <p className="text-[12px] text-text-secondary">Upload brochures, images, or documents</p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">PDF, PPT, DOCX, JPG, PNG up to 25MB</p>
                </div>
                {projectFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {projectFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-[5px] px-2.5 py-1.5 border border-border-subtle">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} strokeWidth={1.5} className="text-text-tertiary" />
                          <span className="text-[11px] text-text-primary">{f}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setProjectFiles((prev) => prev.filter((_, j) => j !== i)); }}
                          className="text-text-tertiary hover:text-text-primary transition-colors duration-150">
                          <X size={11} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Campaign Objective */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-3">
            Campaign Objective<span className="text-status-error ml-0.5">*</span>
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Optimize for</label>
              <select value={objectiveType} onChange={(e) => setObjectiveType(e.target.value as typeof objectiveType)}
                className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239B9B9B' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                <option value="leads">Leads</option>
                <option value="verified_leads">Verified Leads</option>
                <option value="qualified_leads">AI Qualified Leads</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Target count <span className="text-status-error">*</span></label>
              <input type="number" value={targetCount} onChange={(e) => setTargetCount(e.target.value)}
                placeholder="e.g., 500"
                className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary tabular-nums" />
            </div>
            <div>
              <label className="block text-[12px] text-text-secondary mb-1">Duration (days) <span className="text-status-error">*</span></label>
              <input type="number" value={campaignDays} onChange={(e) => setCampaignDays(e.target.value)}
                placeholder="e.g., 30"
                className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary tabular-nums" />
            </div>
          </div>
        </div>
      </div>

      {/* Product & Context card */}
      <div className="bg-white border border-border rounded-card p-6 space-y-5">
        <div>
          <h3 className="text-[14px] font-semibold text-text-primary">Product & Context</h3>
          <p className="text-[12px] text-text-secondary mt-0.5">Help the AI understand your product with offer, campaign brief, and brochures.</p>
        </div>

        {/* Campaign Brief — required */}
        <TextAreaField label="Campaign Brief" required
          placeholder="Describe the campaign: target audience, positioning, key messages, competitors to beat..."
          value={campaignBrief} onChange={setCampaignBrief} rows={4} />

        {/* 4. Upload Brochures */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">Upload Brochures</label>
          <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}
            onClick={() => setFiles((prev) => [...prev, "Godrej_Air_Brochure.pdf"])}
            className="border-2 border-dashed border-border rounded-input p-6 text-center cursor-pointer hover:border-border-hover hover:bg-surface-page/50 transition-all duration-150">
            <Upload size={20} strokeWidth={1.5} className="mx-auto text-text-tertiary mb-2" />
            <p className="text-[13px] text-text-secondary">Drag & drop files here, or <span className="text-accent font-medium">browse</span></p>
            <p className="text-[11px] text-text-tertiary mt-1">PDF, PPT, DOCX up to 25MB</p>
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-surface-page rounded-[6px] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText size={14} strokeWidth={1.5} className="text-text-tertiary" />
                    <span className="text-[12px] text-text-primary">{f}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)); }}
                    className="text-text-tertiary hover:text-text-primary transition-colors duration-150">
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Project Website — required */}
        <TextField label="Project Website" required
          placeholder="https://godrejproperties.com/godrej-air" value={websiteUrl} onChange={setWebsiteUrl}
          helper="Used as context for AI to understand the project better" />

        {/* 6. Offer */}
        <TextField label="Offer" placeholder="e.g., Godrej Reflections Habitat, 3BHK Launch Offer"
          value={offer} onChange={setOffer} />

        {/* 7. RERA Number — optional */}
        <TextField label="RERA Number" placeholder="e.g., PRM/KA/RERA/1251/446/PR/170730/001234"
          value={reraNumber} onChange={setReraNumber}
          helper="Optional. Shown on ads where legally required." />
      </div>

      {/* Targeting & Budget */}
      <div className="bg-white border border-border rounded-card p-6 space-y-5">
        <h3 className="text-[14px] font-semibold text-text-primary">Targeting & Budget</h3>
        {/* 7. Target Locations */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">Target Locations</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedLocations.map((loc) => (
              <span key={loc} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-badge bg-accent text-white">
                {loc}
                <button onClick={() => removeLocation(loc)} className="hover:opacity-70"><X size={10} strokeWidth={2} /></button>
              </span>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && locationInput.trim()) {
                  e.preventDefault();
                  addLocation(locationInput.trim());
                }
              }}
              placeholder="Type a city, country, or region..."
              className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
            />
            {locationInput.length > 0 && locationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-[8px] shadow-lg z-10 max-h-[180px] overflow-y-auto">
                {locationSuggestions.slice(0, 6).map((loc) => (
                  <button key={loc} onClick={() => addLocation(loc)}
                    className="w-full text-left px-3 py-2 text-[13px] text-text-primary hover:bg-surface-page transition-colors duration-150 first:rounded-t-[8px] last:rounded-b-[8px]">
                    {loc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 8. Budget */}
        <div>
          <TextField label="Budget" placeholder="e.g., 250000" value={budgetCeiling} onChange={setBudgetCeiling} type="number" prefix="₹" />
          {budgetCeiling && targetCount && campaignDays && (() => {
            const budget = Number(budgetCeiling);
            const leads = Number(targetCount);
            const days = Number(campaignDays);
            if (!budget || !leads || !days) return null;
            const impliedCPL = Math.round(budget / leads);
            const dailyBudget = Math.round(budget / days);
            const isAggressive = impliedCPL < 500 || dailyBudget < 2000;
            const isUnrealistic = impliedCPL < 200;
            const isRealistic = impliedCPL >= 500 && impliedCPL <= 2000;
            const status = isUnrealistic ? "unrealistic" : isAggressive ? "aggressive" : isRealistic ? "realistic" : "high";
            const config = {
              unrealistic: { label: "Unrealistic", desc: `Implied CPL of ₹${impliedCPL} is too low for this market. Consider increasing budget or reducing target leads.`, cls: "bg-[#FEF2F2] border-[#DC2626]/20 text-[#DC2626]" },
              aggressive: { label: "Aggressive", desc: `Implied CPL of ₹${impliedCPL} is ambitious. You may need to optimize aggressively to hit this target.`, cls: "bg-[#FEF3C7] border-[#92400E]/20 text-[#92400E]" },
              realistic: { label: "Realistic", desc: `Implied CPL of ₹${impliedCPL} is achievable. Daily budget of ₹${dailyBudget.toLocaleString("en-IN")} looks good.`, cls: "bg-[#F0FDF4] border-[#15803D]/20 text-[#15803D]" },
              high: { label: "Comfortable", desc: `Implied CPL of ₹${impliedCPL} gives you room to optimize for quality over volume.`, cls: "bg-[#F0FDF4] border-[#15803D]/20 text-[#15803D]" },
            };
            const { label, desc, cls } = config[status];
            return (
              <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-[6px] border text-[11px] leading-relaxed ${cls}`}>
                <span className="font-semibold shrink-0">{label}:</span>
                <span>{desc}</span>
              </div>
            );
          })()}
        </div>

        {/* Ad Account */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">Ad Account <span className="text-status-error">*</span></label>
          <select value={adAccount} onChange={(e) => setAdAccount(e.target.value)}
            className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
            style={selectStyle}>
            <option value="">Select ad account...</option>
            {adAccounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>

        {/* Facebook Page */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">Facebook Page</label>
          <select value={facebookPage} onChange={(e) => setFacebookPage(e.target.value)}
            className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
            style={selectStyle}>
            <option value="">Select Facebook Page...</option>
            {facebookPages.map((pg) => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
          </select>
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end pt-2">
        <button onClick={onNext}
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150">
          Continue <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
