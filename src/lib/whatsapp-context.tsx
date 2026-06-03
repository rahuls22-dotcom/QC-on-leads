"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type WAApp = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
};

type WAContextType = {
  vendor: string;
  apiKey: string;
  apps: WAApp[];
  isConnected: boolean;
  activeApps: WAApp[];
  connect: (vendor: string, apiKey: string, selectedIds: string[]) => void;
  toggleApp: (id: string) => void;
  disconnect: () => void;
};

const MOCK_APPS: WAApp[] = [
  { id: "app_001", name: "Acme Greens — New Launch", phone: "+91 98765 43210", active: false },
  { id: "app_002", name: "Acme Greens — Resale",     phone: "+91 87654 32109", active: false },
  { id: "app_003", name: "Customer Support",          phone: "+91 76543 21098", active: false },
];

const WAContext = createContext<WAContextType>({
  vendor: "", apiKey: "", apps: [], isConnected: false, activeApps: [],
  connect: () => {}, toggleApp: () => {}, disconnect: () => {},
});

export function WAProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apps, setApps] = useState<WAApp[]>([]);

  const connect = (v: string, key: string, selectedIds: string[]) => {
    setVendor(v); setApiKey(key);
    setApps(MOCK_APPS.map(a => ({ ...a, active: selectedIds.includes(a.id) })));
  };

  const toggleApp = (id: string) =>
    setApps(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));

  const disconnect = () => {
    setVendor("");
    setApiKey("");
    setApps([]);
  };

  const activeApps = apps.filter(a => a.active);

  return (
    <WAContext.Provider value={{ vendor, apiKey, apps, isConnected: activeApps.length > 0, activeApps, connect, toggleApp, disconnect }}>
      {children}
    </WAContext.Provider>
  );
}

export const useWA = () => useContext(WAContext);

export type WATemplate = {
  id: string; name: string; body: string;
  category: "Marketing" | "Utility" | "Authentication";
  languages: string[]; status: "approved" | "pending" | "rejected"; modifiedOn: string;
};

export const TEMPLATES_BY_APP: Record<string, WATemplate[]> = {
  app_001: [
    { id:"t1", name:"new_lead_intro",       category:"Utility",         languages:["en"],      status:"approved", modifiedOn:"2026-05-13", body:"Hi {{1}}, this is Nayana from Acme Greens. We received your enquiry — our team will call you shortly." },
    { id:"t2", name:"site_visit_invite",    category:"Marketing",       languages:["en","hi"], status:"approved", modifiedOn:"2026-05-13", body:"Hi {{1}}, would you like to visit Acme Greens this Saturday at {{2}}? You'll see the live model home." },
    { id:"t3", name:"sv_confirmation",      category:"Utility",         languages:["en"],      status:"approved", modifiedOn:"2026-05-10", body:"Your site visit at Acme Greens is confirmed for {{1}} at 12 PM. Our team will personally walk you through." },
    { id:"t4", name:"missed_call_callback", category:"Marketing",       languages:["en","hi"], status:"pending",  modifiedOn:"2026-05-14", body:"Hi {{1}}, we tried calling you about Acme Greens. When would be a good time to reconnect?" },
    { id:"t5", name:"launch_offer",         category:"Marketing",       languages:["en"],      status:"rejected", modifiedOn:"2026-04-20", body:"Limited launch offer at Acme Greens — 2% discount valid till 30th April." },
  ],
  app_002: [
    { id:"t6", name:"price_sheet_followup", category:"Utility",         languages:["en"],      status:"approved", modifiedOn:"2026-05-10", body:"Sharing the latest price sheet for 2 & 3 BHK options at Acme Greens Resale. Let us know if you have questions, {{1}}." },
    { id:"t7", name:"site_visit_reminder",  category:"Utility",         languages:["en","hi"], status:"approved", modifiedOn:"2026-05-12", body:"Hi {{1}}, reminder — your site visit is tomorrow at {{2}}. See you at the Acme Greens experience centre." },
    { id:"t8", name:"resale_new_listings",  category:"Marketing",       languages:["en"],      status:"pending",  modifiedOn:"2026-05-15", body:"New resale listings just added in Acme Greens — 3 BHK from 1.2Cr. Reply YES to see details, {{1}}." },
  ],
  app_003: [
    { id:"t9",  name:"otp_login",           category:"Authentication",  languages:["en"],      status:"approved", modifiedOn:"2026-04-28", body:"Your Acme login code is {{1}}. Expires in 10 minutes. Do not share." },
    { id:"t10", name:"support_ticket_open", category:"Utility",         languages:["en"],      status:"approved", modifiedOn:"2026-05-01", body:"Hi {{1}}, your support ticket #{{2}} has been created. We will respond within 24 hours." },
  ],
};
