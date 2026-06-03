"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Building2, Wifi, Users, ChevronRight, ArrowLeft, Loader2, Plus } from "lucide-react";

const STEPS = [
  { n: 1, label: "Your agency",      icon: Building2 },
  { n: 2, label: "Connect WABA",     icon: Wifi },
  { n: 3, label: "Add first client", icon: Users },
];

const VENDORS = [
  { id: "wati",    name: "Wati",    color: "#25d366", tagline: "Easy setup · India-focused" },
  { id: "gupshup", name: "Gupshup", color: "#f97316", tagline: "Enterprise-grade BSP" },
];

export default function AgencySetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [agencyName, setAgencyName] = useState("PropStar");
  const [domain, setDomain] = useState("propstar");
  const [vendor, setVendor] = useState("wati");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState([
    { name: "Godrej Properties", waba: "+91 80 4716 5400" },
  ]);
  const [newClient, setNewClient] = useState({ name: "", waba: "" });

  const connect = () => {
    if (!apiKey.trim()) return;
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setConnected(true); }, 2000);
  };

  const finish = () => router.replace("/dashboard");

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] bg-[#f97316] flex items-center justify-center text-white font-bold text-[12px]">P</div>
          <span className="text-[15px] font-semibold text-text-primary">PropStar</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f97316]/10 text-[#f97316] font-semibold">Agency setup</span>
        </div>
        <span className="text-[12px] text-text-tertiary">Step {step} of 3</span>
      </div>

      <div className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-[560px]">

          {/* Step indicators */}
          <div className="flex items-center mb-10">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.n;
              const active = step === s.n;
              return (
                <div key={s.n} className="flex items-center flex-1">
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      done ? "bg-green-500 text-white" :
                      active ? "bg-[#f97316] text-white ring-4 ring-[#f97316]/20" :
                      "bg-surface-secondary text-text-tertiary border border-border"}`}>
                      {done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={1.5} />}
                    </div>
                    <span className={`text-[12px] font-medium whitespace-nowrap ${active ? "text-text-primary" : done ? "text-green-600" : "text-text-tertiary"}`}>{s.label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px mx-3 transition-colors ${done ? "bg-green-400" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>

          {/* STEP 1 — Agency details */}
          {step === 1 && (
            <div className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="text-[18px] font-semibold text-text-primary">Set up your agency workspace</h2>
                <p className="text-[13px] text-text-secondary mt-1">This is your agency's master workspace. Clients are managed under it.</p>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Agency name</label>
                  <input value={agencyName} onChange={e => setAgencyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-border rounded-[8px] text-[14px] text-text-primary bg-white focus:outline-none focus:border-[#f97316]"
                    placeholder="e.g. PropStar" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Workspace domain</label>
                  <div className="flex items-center gap-0 border border-border rounded-[8px] overflow-hidden focus-within:border-[#f97316]">
                    <span className="px-3 py-2.5 bg-surface-secondary text-text-tertiary text-[13px] border-r border-border flex-shrink-0">revspot.ai/</span>
                    <input value={domain} onChange={e => setDomain(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                      className="flex-1 px-3 py-2.5 text-[14px] text-text-primary bg-white focus:outline-none" placeholder="your-agency" />
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1">Your clients will access their workspace at revspot.ai/{domain}/client</p>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Agency type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[{v:"real_estate",l:"Real Estate"},{v:"general",l:"General Marketing"}].map(opt => (
                      <button key={opt.v} className="px-4 py-3 rounded-[8px] border-2 border-[#f97316] bg-[#f97316]/5 text-[13px] font-semibold text-[#f97316]">
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-[#fafbfc] border-t border-border flex justify-end">
                <button onClick={() => setStep(2)} disabled={!agencyName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[#f97316] text-white disabled:opacity-40 hover:bg-orange-600 transition-colors">
                  Continue <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — WABA */}
          {step === 2 && (
            <div className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="text-[18px] font-semibold text-text-primary">Connect your agency WABA</h2>
                <p className="text-[13px] text-text-secondary mt-1">This is PropStar's own WhatsApp number — used for agency-level communications.</p>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Vendor */}
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-2">WhatsApp provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    {VENDORS.map(v => (
                      <button key={v.id} onClick={() => setVendor(v.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-[8px] border-2 text-left transition-all ${vendor === v.id ? "border-text-primary" : "border-border hover:border-text-secondary"}`}
                        style={vendor === v.id ? {background: `${v.color}08`, borderColor: v.color} : {}}>
                        <div className="w-7 h-7 rounded-[5px] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{background: v.color}}>{v.name[0]}</div>
                        <div>
                          <div className="text-[13px] font-semibold text-text-primary">{v.name}</div>
                          <div className="text-[10.5px] text-text-tertiary">{v.tagline}</div>
                        </div>
                        {vendor === v.id && <Check size={14} strokeWidth={2.5} className="ml-auto" style={{color: v.color}} />}
                      </button>
                    ))}
                  </div>
                </div>
                {/* API Key */}
                <div>
                  <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">{vendor === "wati" ? "Wati" : "Gupshup"} API Key</label>
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} disabled={connected}
                    placeholder={`Paste your ${vendor === "wati" ? "Wati" : "Gupshup"} API key…`}
                    className="w-full px-3.5 py-2.5 border border-border rounded-[8px] text-[13px] bg-white focus:outline-none focus:border-[#f97316] disabled:bg-surface-secondary" />
                </div>
                {/* Connect button / success */}
                {!connected ? (
                  <button onClick={connect} disabled={!apiKey.trim() || connecting}
                    className="w-full py-2.5 rounded-[8px] text-[13px] font-semibold bg-text-primary text-white disabled:opacity-40 hover:bg-charcoal-light transition-colors flex items-center justify-center gap-2">
                    {connecting ? <><Loader2 size={14} className="animate-spin" /> Connecting…</> : "Validate & Connect"}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-[8px]">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"><Check size={16} strokeWidth={2.5} className="text-white" /></div>
                    <div>
                      <div className="text-[13px] font-semibold text-green-800">WABA connected — PropStar</div>
                      <div className="text-[11px] text-green-600">{vendor === "wati" ? "Wati" : "Gupshup"} · Quality High · 100k/day tier</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-[#fafbfc] border-t border-border flex items-center justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-[12.5px] text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft size={14} strokeWidth={1.5} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!connected}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[#f97316] text-white disabled:opacity-40 hover:bg-orange-600 transition-colors">
                  Continue <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Add clients */}
          {step === 3 && (
            <div className="bg-white rounded-[12px] border border-border shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h2 className="text-[18px] font-semibold text-text-primary">Add your first client</h2>
                <p className="text-[13px] text-text-secondary mt-1">Each client gets their own isolated workspace with their own WABA, menus, and configurations.</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Existing clients */}
                {clients.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 bg-surface-secondary rounded-[8px] border border-border">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                      {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-text-primary">{c.name}</div>
                      <div className="text-[11px] text-text-tertiary">{c.waba}</div>
                    </div>
                    <Check size={14} strokeWidth={2.5} className="ml-auto text-green-600" />
                  </div>
                ))}

                {/* Add new client */}
                <div className="border border-dashed border-border rounded-[8px] p-4 space-y-3">
                  <div className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide">Add another client</div>
                  <input value={newClient.name} onChange={e => setNewClient(p => ({...p, name: e.target.value}))}
                    placeholder="Client name (e.g. Mana Realty)"
                    className="w-full px-3 py-2 border border-border rounded-[7px] text-[13px] bg-white focus:outline-none focus:border-text-primary" />
                  <input value={newClient.waba} onChange={e => setNewClient(p => ({...p, waba: e.target.value}))}
                    placeholder="Client WhatsApp number"
                    className="w-full px-3 py-2 border border-border rounded-[7px] text-[13px] bg-white focus:outline-none focus:border-text-primary" />
                  <button onClick={() => {
                    if (newClient.name) { setClients(p => [...p, newClient]); setNewClient({name:"",waba:""}); }
                  }} className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    <Plus size={13} strokeWidth={2.5} /> Add client
                  </button>
                </div>

                <p className="text-[11.5px] text-text-tertiary text-center">You can add more clients anytime from your agency dashboard.</p>
              </div>
              <div className="px-6 py-4 bg-[#fafbfc] border-t border-border flex items-center justify-between">
                <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-[12.5px] text-text-secondary hover:text-text-primary transition-colors">
                  <ArrowLeft size={14} strokeWidth={1.5} /> Back
                </button>
                <button onClick={finish}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold bg-[#f97316] text-white hover:bg-orange-600 transition-colors">
                  <Check size={14} strokeWidth={2.5} /> Launch PropStar workspace
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[11.5px] text-text-tertiary mt-6">
            Need help? <a href="#" className="underline text-text-secondary">Read the agency setup guide ↗</a>
          </p>
        </div>
      </div>
    </div>
  );
}
