"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Zap, MessageCircle, Database, Phone, Clock, GitBranch,
  Sparkles, Check, RotateCcw, ArrowRight, X, Plus, Trash2,
  Eye, EyeOff, Send, Loader2, BarChart2, GitMerge,
} from "lucide-react";
import { useWA, TEMPLATES_BY_APP } from "@/lib/whatsapp-context";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardType = "trigger" | "whatsapp" | "crm" | "voice" | "wait" | "condition";
type NodeConfig = Record<string, any>;

type FlowNode = {
  id: string; type: CardType;
  title: string; summary: string;
  config: NodeConfig;
  trueBranch?: FlowNode[]; falseBranch?: FlowNode[];
};

type Message = { id: string; role: "user" | "ai"; text: string; isTyping?: boolean };
type ConditionRow = { id: string; field: string; operator: string; value: string };
type HeaderRow    = { id: string; key: string; value: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_STAGES   = ["New Lead","Lead Dialled","Lead Connected","Lead Qualified","SV Scheduled","SV Confirmed","SV Done","Disqualified"];
const CALL_STATUSES = ["RNR","Busy","Switched Off","Connected","Voicemail","No Answer","To Be Rescheduled"];
const CAMPAIGN_SOURCES = ["All campaigns","Cold Outbound — Consumer Graph","Bhavisha / Zurich / Bilva","Bangalore Historical Pool","BTL — Sarjapur","Acme Greens — Q2 launch"];
const TRIGGERS = [
  {id:"lead_created",label:"Lead Created",hasSource:true,hasStage:false,hasCallStatus:false},
  {id:"stage_changed",label:"Stage Changed",hasSource:false,hasStage:true,hasCallStatus:false},
  {id:"call_status_changed",label:"Call Status Changed",hasSource:false,hasStage:false,hasCallStatus:true},
  {id:"visit_missed",label:"Visit Missed",hasSource:false,hasStage:false,hasCallStatus:false},
  {id:"form_filled",label:"Form Filled",hasSource:true,hasStage:false,hasCallStatus:false},
];
const CONDITION_FIELDS = [
  {id:"stage",label:"Stage",type:"select",values:LEAD_STAGES},
  {id:"call_status",label:"Call Status",type:"select",values:CALL_STATUSES},
  {id:"ai_qualification",label:"AI Qualification",type:"select",values:["Qualified","Not Qualified","Follow Up","No Answer","RNR"]},
  {id:"attempt_count",label:"Attempt Count",type:"number",values:[]},
  {id:"source",label:"Lead Source",type:"select",values:["Facebook","Website","WhatsApp","Cold Outbound"]},
  {id:"city",label:"City",type:"text",values:[]},
];
const OPERATORS   = ["is","is not","contains","does not contain","greater than","less than","is empty","is not empty"];
const AGENTS      = ["Bully Bot","Qualified Bot","Reschedule Bot","Acme Sales Agent","Voice AI — Cold Outbound"];
const HOURS       = Array.from({length:24},(_,i)=>{const h=i%12||12,ap=i<12?"AM":"PM";return`${h}:00 ${ap}`;});

// ─── Card visual config ───────────────────────────────────────────────────────

const CARD_CFG: Record<CardType,{label:string;icon:React.ElementType;iconBg:string;iconColor:string;border:string}> = {
  trigger:   {label:"Trigger",  icon:Zap,          iconBg:"bg-blue-50",  iconColor:"text-blue-600",  border:"border-blue-200"},
  whatsapp:  {label:"Action",   icon:MessageCircle,iconBg:"bg-green-50", iconColor:"text-green-600", border:"border-zinc-200"},
  crm:       {label:"Action",   icon:Database,     iconBg:"bg-slate-50", iconColor:"text-slate-500", border:"border-zinc-200"},
  voice:     {label:"Action",   icon:Phone,        iconBg:"bg-violet-50",iconColor:"text-violet-600",border:"border-zinc-200"},
  wait:      {label:"Delay",    icon:Clock,        iconBg:"bg-amber-50", iconColor:"text-amber-600", border:"border-zinc-200"},
  condition: {label:"Condition",icon:GitBranch,    iconBg:"bg-orange-50",iconColor:"text-orange-500",border:"border-orange-200"},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `n${++_uid}_${Math.random().toString(36).slice(2,5)}`;

function extractWaitTime(text:string):string{
  const m=text.match(/(\d+)\s*(minute|min|hour|hr|day)/i);
  if(!m) return "5 minutes";
  const n=m[1],u=m[2].toLowerCase();
  const unit=u.startsWith("h")?"hour":u.startsWith("d")?"day":"minute";
  return `${n} ${unit}${parseInt(n)>1?"s":""}`;
}
function extractCRMSummary(t:string):string{
  if(t.includes("salesforce")) return "Push lead to Salesforce";
  if(t.includes("hubspot"))    return "Push lead to HubSpot";
  if(t.includes("zoho"))       return "Push lead to Zoho CRM";
  return "Push lead data to CRM";
}

// ─── Flow parser ──────────────────────────────────────────────────────────────

function parseFlow(text:string):FlowNode[]|null{
  const t=text.toLowerCase();
  const hasWA        = /whatsapp|message|text|msg|send them|reach out/.test(t);
  const hasCRM       = /crm|salesforce|hubspot|zoho|push|forward|database/.test(t);
  const hasVoice     = /call|voice|ring|dial|phone/.test(t);
  const hasCondition = /if they|if no|reply|respond|check|based on|condition|answered|didn.t|did not/.test(t);
  const hasWait      = /wait|delay|after \d|pause|minute|hour/.test(t);
  const waitTime     = extractWaitTime(t);
  const crmSummary   = extractCRMSummary(t);
  if(!hasWA&&!hasCRM&&!hasVoice) return null;
  const nodes:FlowNode[]=[];
  nodes.push({id:uid(),type:"trigger",title:"Lead Created",summary:"New lead enters the system",config:{event:"lead_created"}});
  if(hasWA) nodes.push({id:uid(),type:"whatsapp",title:"Send WhatsApp",summary:"Select number and template",config:{}});
  if(hasCondition&&(hasCRM||hasVoice)){
    const cond:FlowNode={
      id:uid(),type:"condition",
      title:hasWA?"WhatsApp replied?":"Lead responded?",
      summary:"Check whether they responded",
      config:{logic:"AND",rows:[{id:"r1",field:"",operator:"is",value:""}]},
      trueBranch:[],falseBranch:[],
    };
    if(hasCRM) cond.trueBranch!.push({id:uid(),type:"crm",title:"Send to CRM",summary:crmSummary,config:{method:"POST",url:"",authType:"none",headers:[]}});
    if(hasWait) cond.falseBranch!.push({id:uid(),type:"wait",title:`Wait ${waitTime}`,summary:`Pause for ${waitTime}`,config:{duration:waitTime.split(" ")[0],unit:waitTime.split(" ")[1]||"minutes"}});
    if(hasVoice) cond.falseBranch!.push({id:uid(),type:"voice",title:"Voice AI Call",summary:"Select agent and calling window",config:{agent:"",fromHour:"9:00 AM",toHour:"7:00 PM",retries:2}});
    nodes.push(cond);
  } else {
    if(hasWait) nodes.push({id:uid(),type:"wait",title:`Wait ${waitTime}`,summary:`Pause for ${waitTime}`,config:{duration:waitTime.split(" ")[0],unit:waitTime.split(" ")[1]||"minutes"}});
    if(hasCRM)  nodes.push({id:uid(),type:"crm",title:"Send to CRM",summary:crmSummary,config:{method:"POST",url:"",authType:"none",headers:[]}});
    if(hasVoice) nodes.push({id:uid(),type:"voice",title:"Voice AI Call",summary:"Select agent and calling window",config:{agent:"",fromHour:"9:00 AM",toHour:"7:00 PM",retries:2}});
  }
  return nodes;
}

function buildConfirmation(nodes:FlowNode[]):string{
  const parts:string[]=[];
  const walk=(ns:FlowNode[])=>ns.forEach(n=>{
    if(n.type==="trigger")   parts.push("triggers when a lead is created");
    if(n.type==="whatsapp")  parts.push("sends a WhatsApp message");
    if(n.type==="crm")       parts.push("pushes the lead to CRM");
    if(n.type==="voice")     parts.push("triggers a Voice AI call");
    if(n.type==="wait")      parts.push(`waits ${n.title.replace("Wait ","")}`);
    if(n.type==="condition") parts.push(`checks for a reply — if yes: ${n.trueBranch?.map(c=>c.title).join(", ")||"continues"}; if no: ${n.falseBranch?.map(c=>c.title).join(" → ")||"ends"}`);
  });
  walk(nodes);
  return `Done! Your flow ${parts.join(", then ")}. Click any card to configure its details.`;
}

// ─── Tree update helpers ──────────────────────────────────────────────────────

function updateNodeIn(nodes:FlowNode[],id:string,patch:Partial<FlowNode>):FlowNode[]{
  return nodes.map(n=>{
    if(n.id===id) return {...n,...patch};
    return {...n,
      trueBranch:n.trueBranch?updateNodeIn(n.trueBranch,id,patch):undefined,
      falseBranch:n.falseBranch?updateNodeIn(n.falseBranch,id,patch):undefined,
    };
  });
}

// ─── Shared form components ───────────────────────────────────────────────────

const lbl = "block text-[10.5px] font-semibold text-zinc-500 uppercase tracking-wide mb-1";
const inp = "w-full px-2.5 py-1.5 border border-zinc-200 rounded-[6px] text-[12.5px] text-zinc-900 bg-white focus:outline-none focus:border-zinc-400 transition-colors";
const sel = "w-full px-2.5 py-1.5 border border-zinc-200 rounded-[6px] text-[12.5px] text-zinc-900 bg-white focus:outline-none focus:border-zinc-400";

function FLabel({children}:{children:React.ReactNode}){return <label className={lbl}>{children}</label>;}
function FInp({value,onChange,placeholder,type="text"}:{value:string;onChange:(v:string)=>void;placeholder?:string;type?:string}){
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={inp}/>;
}
function FSel({value,onChange,options,placeholder}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];placeholder?:string}){
  return <select value={value} onChange={e=>onChange(e.target.value)} className={sel}>
    {placeholder&&<option value="">{placeholder}</option>}
    {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

// ─── Config panels per card type ─────────────────────────────────────────────

function TriggerConfig({cfg,onChange}:{cfg:NodeConfig;onChange:(c:NodeConfig)=>void}){
  const trig=TRIGGERS.find(t=>t.id===cfg.event);
  return <div className="space-y-3">
    <div><FLabel>Trigger event</FLabel><FSel value={cfg.event||""} onChange={v=>onChange({event:v})} placeholder="Select trigger…" options={TRIGGERS.map(t=>({value:t.id,label:t.label}))}/></div>
    {trig?.hasSource&&<div><FLabel>Campaign source</FLabel><FSel value={cfg.source||""} onChange={v=>onChange({...cfg,source:v})} placeholder="All campaigns" options={CAMPAIGN_SOURCES.map(s=>({value:s,label:s}))}/></div>}
    {trig?.hasStage&&<div><FLabel>To stage</FLabel><FSel value={cfg.stage||""} onChange={v=>onChange({...cfg,stage:v})} placeholder="Select stage…" options={LEAD_STAGES.map(s=>({value:s,label:s}))}/></div>}
    {trig?.hasCallStatus&&<div><FLabel>Call status</FLabel><FSel value={cfg.callStatus||""} onChange={v=>onChange({...cfg,callStatus:v})} placeholder="Select status…" options={CALL_STATUSES.map(s=>({value:s,label:s}))}/></div>}
  </div>;
}

function WhatsAppConfig({cfg,onChange}:{cfg:NodeConfig;onChange:(c:NodeConfig)=>void}){
  const {isConnected,activeApps}=useWA();
  const appId=cfg.waAppId||"";
  const templates=(TEMPLATES_BY_APP[appId]||[]).filter((t:any)=>t.status==="approved");
  const selected=templates.find((t:any)=>t.id===cfg.template);
  if(!isConnected) return <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-[7px] text-[12px] text-amber-700">
    <span className="font-semibold">WhatsApp not connected. </span>
    <Link href="/channels/whatsapp" className="underline">Connect now</Link> to use this action.
  </div>;
  return <div className="space-y-3">
    <div><FLabel>Send from (number)</FLabel>
      <FSel value={appId} onChange={v=>onChange({...cfg,waAppId:v,template:""})} placeholder="Select number…"
        options={activeApps.map(a=>({value:a.id,label:`${a.name} · ${a.phone}`}))}/>
    </div>
    {appId&&<div><FLabel>Template</FLabel>
      <FSel value={cfg.template||""} onChange={v=>onChange({...cfg,template:v})} placeholder="Select template…"
        options={templates.map((t:any)=>({value:t.id,label:t.name}))}/>
      {templates.length===0&&<p className="text-[11px] text-amber-600 mt-1">No approved templates for this number.</p>}
    </div>}
    {selected&&<div className="rounded-[8px] border border-zinc-200 overflow-hidden">
      <div className="px-2.5 py-1.5 bg-[#075e54] flex items-center justify-between">
        <span className="text-[11px] font-medium text-white">Preview</span>
        <span className="text-[9px] text-white/60">{selected.category}</span>
      </div>
      <div className="bg-[#e5ddd5] p-2.5"><div className="bg-white rounded-[8px] px-2.5 py-2 max-w-[90%] shadow-sm">
        <p className="text-[11.5px] text-zinc-900 leading-snug">{selected.body}</p>
        <p className="text-[8.5px] text-zinc-400 mt-1 text-right">10:24 AM ✓✓</p>
      </div></div>
    </div>}
  </div>;
}

function ConditionConfig({cfg,onChange}:{cfg:NodeConfig;onChange:(c:NodeConfig)=>void}){
  const logic:string=cfg.logic||"AND";
  const rows:ConditionRow[]=cfg.rows||[{id:"r1",field:"",operator:"is",value:""}];
  const setRow=(id:string,patch:Partial<ConditionRow>)=>onChange({...cfg,rows:rows.map(r=>r.id===id?{...r,...patch}:r)});
  const addRow=()=>onChange({...cfg,rows:[...rows,{id:`r${Date.now()}`,field:"",operator:"is",value:""}]});
  const removeRow=(id:string)=>onChange({...cfg,rows:rows.filter(r=>r.id!==id)});
  return <div className="space-y-2">
    {rows.map((row,idx)=>{
      const fd=CONDITION_FIELDS.find(f=>f.id===row.field);
      return <div key={row.id}>
        {idx>0&&<div className="flex items-center gap-2 my-2">
          <div className="h-px flex-1 bg-zinc-100"/>
          <div className="flex rounded-[5px] border border-zinc-200 overflow-hidden text-[10.5px] font-semibold">
            {["AND","OR"].map(l=><button key={l} onClick={()=>onChange({...cfg,logic:l})} className={`px-2.5 py-0.5 transition-colors ${logic===l?"bg-zinc-900 text-white":"bg-white text-zinc-500 hover:bg-zinc-50"}`}>{l}</button>)}
          </div>
          <div className="h-px flex-1 bg-zinc-100"/>
        </div>}
        <div className="flex gap-1.5 items-start">
          <div className="flex-1 grid gap-1.5" style={{gridTemplateColumns:"1fr 0.7fr 1fr"}}>
            <FSel value={row.field} onChange={v=>setRow(row.id,{field:v,value:""})} placeholder="Field…" options={CONDITION_FIELDS.map(f=>({value:f.id,label:f.label}))}/>
            <FSel value={row.operator} onChange={v=>setRow(row.id,{operator:v})} placeholder="is…" options={OPERATORS.map(o=>({value:o,label:o}))}/>
            {fd?.type==="select"?<FSel value={row.value} onChange={v=>setRow(row.id,{value:v})} placeholder="Value…" options={fd.values.map(v=>({value:v,label:v}))}/>
            :fd?.type==="number"?<FInp value={row.value} onChange={v=>setRow(row.id,{value:v})} placeholder="e.g. 3" type="number"/>
            :<FInp value={row.value} onChange={v=>setRow(row.id,{value:v})} placeholder="Enter value…"/>}
          </div>
          {rows.length>1&&<button onClick={()=>removeRow(row.id)} className="mt-1.5 text-zinc-400 hover:text-zinc-600"><Trash2 size={13} strokeWidth={1.5}/></button>}
        </div>
      </div>;
    })}
    <button onClick={addRow} className="flex items-center gap-1 text-[11.5px] font-semibold text-zinc-500 hover:text-zinc-800 transition-colors mt-1"><Plus size={11} strokeWidth={2.5}/>Add condition</button>
  </div>;
}

function CRMConfig({cfg,onChange}:{cfg:NodeConfig;onChange:(c:NodeConfig)=>void}){
  const method=cfg.method||"POST";
  const url=cfg.url||"";
  const authType=cfg.authType||"none";
  const headers:HeaderRow[]=cfg.headers||[];
  const [testStatus,setTestStatus]=useState<"idle"|"testing"|"ok">("idle");
  const [showToken,setShowToken]=useState(false);
  const addHeader=()=>onChange({...cfg,headers:[...headers,{id:`h${Date.now()}`,key:"",value:""}]});
  const setHeader=(id:string,p:Partial<HeaderRow>)=>onChange({...cfg,headers:headers.map(h=>h.id===id?{...h,...p}:h)});
  const removeHeader=(id:string)=>onChange({...cfg,headers:headers.filter(h=>h.id!==id)});
  const test=()=>{if(!url)return;setTestStatus("testing");setTimeout(()=>setTestStatus("ok"),1800);};
  return <div className="space-y-3">
    <div className="flex gap-1.5">
      <div style={{width:72,flexShrink:0}}><FLabel>Method</FLabel><FSel value={method} onChange={v=>onChange({...cfg,method:v})} options={["POST","GET","PUT","PATCH"].map(m=>({value:m,label:m}))}/></div>
      <div className="flex-1"><FLabel>Webhook URL <span className="text-red-500">*</span></FLabel><FInp value={url} onChange={v=>onChange({...cfg,url:v})} placeholder="https://"/></div>
    </div>
    <div><FLabel>Auth type</FLabel>
      <FSel value={authType} onChange={v=>onChange({...cfg,authType:v,authToken:"",apiKeyName:"",apiKeyValue:""})} options={[{value:"none",label:"None"},{value:"bearer",label:"Bearer Token"},{value:"api_key",label:"API Key"},{value:"basic",label:"Basic Auth"}]}/>
      {authType==="bearer"&&<div className="mt-1.5 relative"><input type={showToken?"text":"password"} value={cfg.authToken||""} onChange={e=>onChange({...cfg,authToken:e.target.value})} placeholder="Bearer token" className={inp+" pr-7"}/><button className="absolute right-2 top-1.5 text-zinc-400" onClick={()=>setShowToken(s=>!s)}>{showToken?<EyeOff size={12}/>:<Eye size={12}/>}</button></div>}
      {authType==="api_key"&&<div className="mt-1.5 flex gap-1.5"><FInp value={cfg.apiKeyName||""} onChange={v=>onChange({...cfg,apiKeyName:v})} placeholder="Key name"/><FInp value={cfg.apiKeyValue||""} onChange={v=>onChange({...cfg,apiKeyValue:v})} placeholder="Key value"/></div>}
    </div>
    <div>
      <div className="flex items-center justify-between mb-1"><FLabel>Headers</FLabel><button onClick={addHeader} className="flex items-center gap-0.5 text-[10.5px] font-semibold text-blue-600"><Plus size={10} strokeWidth={2.5}/>Add</button></div>
      {headers.length===0&&<p className="text-[11px] text-zinc-400">No custom headers.</p>}
      <div className="space-y-1.5">{headers.map(h=><div key={h.id} className="flex gap-1.5 items-center"><FInp value={h.key} onChange={v=>setHeader(h.id,{key:v})} placeholder="Key"/><FInp value={h.value} onChange={v=>setHeader(h.id,{value:v})} placeholder="Value"/><button onClick={()=>removeHeader(h.id)} className="text-zinc-400 hover:text-zinc-600 flex-shrink-0"><X size={12} strokeWidth={2}/></button></div>)}</div>
    </div>
    <div className="border-t border-zinc-100 pt-3">
      <div className="flex items-center gap-2">
        <button onClick={test} disabled={!url||testStatus==="testing"} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11.5px] font-semibold border transition-all ${testStatus==="ok"?"bg-green-50 text-green-700 border-green-300":testStatus==="testing"?"bg-zinc-50 text-zinc-400 border-zinc-200":"bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 disabled:opacity-40"}`}>
          {testStatus==="testing"?<Loader2 size={11} className="animate-spin"/>:testStatus==="ok"?<Check size={11} strokeWidth={2.5}/>:<Send size={11}/>}
          {testStatus==="testing"?"Testing…":testStatus==="ok"?"200 OK":"Test"}
        </button>
        {testStatus==="ok"&&<span className="text-[11px] text-green-600 font-medium">Connected successfully</span>}
      </div>
    </div>
  </div>;
}

function VoiceConfig({cfg,onChange}:{cfg:NodeConfig;onChange:(c:NodeConfig)=>void}){
  return <div className="space-y-3">
    <div><FLabel>Bot / Agent</FLabel><FSel value={cfg.agent||""} onChange={v=>onChange({...cfg,agent:v})} placeholder="Select agent…" options={AGENTS.map(a=>({value:a,label:a}))}/></div>
    <div className="grid grid-cols-2 gap-1.5">
      <div><FLabel>Call window — from</FLabel><FSel value={cfg.fromHour||"9:00 AM"} onChange={v=>onChange({...cfg,fromHour:v})} options={HOURS.map(h=>({value:h,label:h}))}/></div>
      <div><FLabel>To</FLabel><FSel value={cfg.toHour||"7:00 PM"} onChange={v=>onChange({...cfg,toHour:v})} options={HOURS.map(h=>({value:h,label:h}))}/></div>
    </div>
    <div><FLabel>Retry attempts if no answer</FLabel>
      <div className="flex gap-1.5 items-center">
        <input type="range" min={0} max={5} value={cfg.retries??2} onChange={e=>onChange({...cfg,retries:parseInt(e.target.value)})} className="flex-1"/>
        <span className="text-[13px] font-semibold text-zinc-700 w-4 text-center">{cfg.retries??2}</span>
      </div>
      <p className="text-[11px] text-zinc-400 mt-0.5">Calls outside the window are queued automatically.</p>
    </div>
  </div>;
}

function WaitConfig({cfg,onChange}:{cfg:NodeConfig;onChange:(c:NodeConfig)=>void}){
  return <div className="flex gap-2">
    <div className="flex-1"><FLabel>Wait for</FLabel><FInp value={cfg.duration||"5"} onChange={v=>onChange({...cfg,duration:v})} placeholder="e.g. 5" type="number"/></div>
    <div className="flex-1"><FLabel>Unit</FLabel><FSel value={cfg.unit||"minutes"} onChange={v=>onChange({...cfg,unit:v})} options={[{value:"minutes",label:"Minutes"},{value:"hours",label:"Hours"},{value:"days",label:"Days"}]}/></div>
  </div>;
}

// ─── Card editor panel ────────────────────────────────────────────────────────

function CardEditor({node,onSave,onClose}:{node:FlowNode;onSave:(id:string,patch:Partial<FlowNode>)=>void;onClose:()=>void}){
  const cfg=CARD_CFG[node.type];const Icon=cfg.icon;
  const [config,setConfig]=useState<NodeConfig>({...node.config});

  const configSummary=():string=>{
    if(node.type==="trigger") return TRIGGERS.find(t=>t.id===config.event)?.label||"Lead Created";
    if(node.type==="whatsapp") return config.template?`Template: ${config.template}`:"Configure number & template";
    if(node.type==="condition"){const rows:ConditionRow[]=config.rows||[];return rows.filter(r=>r.field).map(r=>`${r.field} ${r.operator} ${r.value}`).join(` ${config.logic||"AND"} `)||"Set condition";}
    if(node.type==="crm") return config.url?config.url.slice(0,30)+"…":"Configure webhook";
    if(node.type==="voice") return config.agent?`${config.agent} · ${config.fromHour}–${config.toHour}`:"Configure agent";
    if(node.type==="wait") return `${config.duration||5} ${config.unit||"minutes"}`;
    return "";
  };

  return (
    <div className="absolute right-0 top-0 h-full w-[300px] bg-white border-l border-zinc-200 flex flex-col z-20" style={{boxShadow:"-4px 0 24px rgba(0,0,0,0.06)"}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[7px] flex items-center justify-center ${cfg.iconBg}`}>
            <Icon size={14} strokeWidth={1.8} className={cfg.iconColor}/>
          </div>
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-widest text-zinc-400">{cfg.label}</div>
            <div className="text-[13px] font-semibold text-zinc-900">{node.title}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"><X size={15} strokeWidth={2}/></button>
      </div>

      {/* Config body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {node.type==="trigger"   &&<TriggerConfig   cfg={config} onChange={setConfig}/>}
        {node.type==="whatsapp"  &&<WhatsAppConfig  cfg={config} onChange={setConfig}/>}
        {node.type==="condition" &&<ConditionConfig cfg={config} onChange={setConfig}/>}
        {node.type==="crm"       &&<CRMConfig       cfg={config} onChange={setConfig}/>}
        {node.type==="voice"     &&<VoiceConfig     cfg={config} onChange={setConfig}/>}
        {node.type==="wait"      &&<WaitConfig      cfg={config} onChange={setConfig}/>}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-100 flex gap-2">
        <button onClick={onClose} className="flex-1 py-1.5 rounded-[7px] text-[12px] font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
        <button onClick={()=>{onSave(node.id,{config,summary:configSummary()});onClose();}}
          className="flex-1 py-1.5 rounded-[7px] text-[12px] font-semibold bg-zinc-900 text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5">
          <Check size={12} strokeWidth={2.5}/>Save
        </button>
      </div>
    </div>
  );
}

// ─── Flow card ────────────────────────────────────────────────────────────────

// ─── Analytics types & funnel computation ────────────────────────────────────

type FunnelStep = {
  id: string; type: CardType; title: string;
  total: number; active: number; pct: number; dropPct: number;
  branch?: "TRUE" | "FALSE"; depth?: number;
};

// Deterministic drop rates at each card type
const PASS_RATE: Record<CardType, number> = {
  trigger: 1.00, whatsapp: 0.96, condition: 1.00,
  crm: 0.99,     voice: 0.80,    wait: 1.00,
};
// Active (stuck/processing right now) rates
const ACTIVE_RATE: Record<CardType, number> = {
  trigger: 0.00, whatsapp: 0.01, condition: 0.04,
  crm: 0.005,    voice: 0.05,    wait: 0.12,
};

function computeFunnel(nodes: FlowNode[], entry = 1247): FunnelStep[] {
  const steps: FunnelStep[] = [];
  function walk(ns: FlowNode[], parentTotal: number, depth = 0, branch?: "TRUE" | "FALSE") {
    ns.forEach((node, i) => {
      const total = i === 0 ? Math.round(parentTotal * PASS_RATE[node.type]) : Math.round(steps.find(s=>s.id===ns[i-1].id)!.total * PASS_RATE[node.type]);
      const active = Math.round(total * ACTIVE_RATE[node.type]);
      const pct = Math.round(total / entry * 100);
      const prevTotal = i === 0 ? parentTotal : steps.find(s=>s.id===ns[i-1].id)!.total;
      const dropPct = 100 - Math.round(total / prevTotal * 100);
      steps.push({ id:node.id, type:node.type, title:node.title, total, active, pct, dropPct, branch, depth });
      if (node.trueBranch?.length)  walk(node.trueBranch,  Math.round(total * 0.35), depth+1, "TRUE");
      if (node.falseBranch?.length) walk(node.falseBranch, Math.round(total * 0.65), depth+1, "FALSE");
    });
  }
  walk(nodes, entry);
  return steps;
}

// ─── Analytics funnel panel ───────────────────────────────────────────────────

function AnalyticsFunnel({ nodes }: { nodes: FlowNode[] }) {
  const entry = 1247;
  const steps = computeFunnel(nodes, entry);
  const totalActive = steps.reduce((s, n) => s + n.active, 0);

  const barColor = (pct: number) =>
    pct >= 70 ? "bg-green-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Summary strip */}
      <div className="flex gap-3 mb-6">
        {[
          { label:"Total entered", value: entry.toLocaleString(), color:"text-zinc-900" },
          { label:"Currently active", value: totalActive.toLocaleString(), color:"text-blue-600" },
          { label:"Completed flow", value: steps.filter(s=>["crm","voice"].includes(s.type)).reduce((a,b)=>a+b.total,0).toLocaleString(), color:"text-green-600" },
        ].map(s=>(
          <div key={s.label} className="flex-1 bg-white border border-zinc-200 rounded-[10px] px-4 py-3 shadow-sm">
            <div className={`text-[22px] font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11.5px] text-zinc-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel steps */}
      <div className="bg-white border border-zinc-200 rounded-[10px] overflow-hidden shadow-sm">
        <div className="grid px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-widest text-zinc-400" style={{gridTemplateColumns:"1fr 80px 80px 100px 80px"}}>
          <div>Step</div><div className="text-right">Leads in</div><div className="text-right">Active now</div><div className="px-2">Throughput</div><div className="text-right">Drop-off</div>
        </div>
        {steps.map((step, i) => {
          const cfg = CARD_CFG[step.type];
          const Icon = cfg.icon;
          return (
            <div key={step.id} className={`grid px-4 py-3 border-b border-zinc-50 last:border-0 items-center hover:bg-zinc-50 transition-colors`} style={{gridTemplateColumns:"1fr 80px 80px 100px 80px", paddingLeft: step.depth ? `${step.depth * 24 + 16}px` : 16}}>
              {/* Step name */}
              <div className="flex items-center gap-2.5 min-w-0">
                {step.branch && (
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${step.branch==="TRUE"?"bg-green-50 text-green-700 border-green-200":"bg-zinc-100 text-zinc-500 border-zinc-200"}`}>{step.branch}</span>
                )}
                <div className={`w-6 h-6 rounded-[5px] flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                  <Icon size={12} strokeWidth={1.8} className={cfg.iconColor}/>
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-zinc-900 truncate">{step.title}</div>
                  <div className="text-[10px] text-zinc-400">{cfg.label}</div>
                </div>
              </div>
              {/* Leads in */}
              <div className="text-right text-[13px] font-semibold text-zinc-700">{step.total.toLocaleString()}</div>
              {/* Active now */}
              <div className="text-right">
                {step.active > 0
                  ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>
                      {step.active}
                    </span>
                  : <span className="text-[12px] text-zinc-300">—</span>}
              </div>
              {/* Throughput bar */}
              <div className="px-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor(step.pct)}`} style={{width:`${step.pct}%`}}/>
                  </div>
                  <span className="text-[11px] text-zinc-500 flex-shrink-0 w-8 text-right">{step.pct}%</span>
                </div>
              </div>
              {/* Drop-off */}
              <div className="text-right">
                {step.dropPct > 0
                  ? <span className={`text-[12px] font-medium ${step.dropPct > 20 ? "text-red-500" : step.dropPct > 5 ? "text-amber-500" : "text-zinc-400"}`}>↓ {step.dropPct}%</span>
                  : <span className="text-[12px] text-zinc-300">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active breakdown */}
      {totalActive > 0 && (
        <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-[10px] flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0 mt-1"/>
          <div>
            <div className="text-[12.5px] font-semibold text-blue-900 mb-1">Live activity</div>
            <div className="text-[12px] text-blue-700 leading-relaxed">
              {steps.filter(s=>s.active>0).map(s=>`${s.active} leads at "${s.title}"`).join(" · ")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Flow card (with optional active count badge) ─────────────────────────────

function FlowCard({node,isSelected,onSelect,activeCount}:{node:FlowNode;isSelected:boolean;onSelect:(n:FlowNode)=>void;activeCount?:number}){
  const cfg=CARD_CFG[node.type];const Icon=cfg.icon;
  return (
    <div onClick={()=>onSelect(node)}
      className={`bg-white border rounded-[10px] flex items-start gap-3 px-3.5 py-3 w-[232px] flex-shrink-0 cursor-pointer transition-all ${
        isSelected?`${cfg.border} shadow-lg ring-2 ring-zinc-900/10`:`${cfg.border} shadow-sm hover:shadow-md`}`}>
      <div className={`w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
        <Icon size={15} strokeWidth={1.8} className={cfg.iconColor}/>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{cfg.label}</div>
        <div className="text-[13px] font-semibold text-zinc-900 leading-tight">{node.title}</div>
        <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug truncate">{node.summary}</div>
      </div>
      {activeCount !== undefined && activeCount > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 flex-shrink-0 mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
          <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"/>
          {activeCount}
        </span>
      )}
    </div>
  );
}

// ─── Connector ────────────────────────────────────────────────────────────────

function VLine({h=20}:{h?:number}){return <div style={{width:2,height:h,background:"#E4E4E7",flexShrink:0}}/>;}

function BranchLabel({label}:{label:string}){
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide border ${
    label==="TRUE"?"bg-green-50 text-green-700 border-green-200":"bg-zinc-100 text-zinc-500 border-zinc-200"}`}>{label}</span>;
}

// ─── Branch split ─────────────────────────────────────────────────────────────

function BranchSplit({node,selectedId,onSelect,funnelMap}:{node:FlowNode;selectedId:string|null;onSelect:(n:FlowNode)=>void;funnelMap?:Record<string,number>}){
  const trueNodes=node.trueBranch||[];
  const falseNodes=node.falseBranch||[];
  return (
    <div className="flex flex-col items-center">
      {/* Fork */}
      <div className="flex" style={{width:540}}>
        <div style={{flex:1,borderBottom:"2px solid #E4E4E7"}}/>
        <div style={{width:2,height:20,background:"#E4E4E7"}}/>
        <div style={{flex:1,borderBottom:"2px solid #E4E4E7"}}/>
      </div>
      {/* Columns */}
      <div className="flex items-start" style={{width:540}}>
        {/* TRUE */}
        <div className="flex-1 flex flex-col items-center py-0">
          <VLine h={10}/><BranchLabel label="TRUE"/><VLine h={10}/>
          {trueNodes.length===0
            ?<div className="w-[220px] border-2 border-dashed border-zinc-200 rounded-[10px] py-5 text-[11px] text-zinc-400 text-center">No steps</div>
            :<NodeList nodes={trueNodes} selectedId={selectedId} onSelect={onSelect} funnelMap={funnelMap}/>}
        </div>
        <div style={{width:2,background:"#F4F4F5",alignSelf:"stretch",minHeight:80,margin:"0 8px"}}/>
        {/* FALSE */}
        <div className="flex-1 flex flex-col items-center py-0">
          <VLine h={10}/><BranchLabel label="FALSE"/><VLine h={10}/>
          {falseNodes.length===0
            ?<div className="w-[220px] border-2 border-dashed border-zinc-200 rounded-[10px] py-5 text-[11px] text-zinc-400 text-center">No steps</div>
            :<NodeList nodes={falseNodes} selectedId={selectedId} onSelect={onSelect} funnelMap={funnelMap}/>}
        </div>
      </div>
    </div>
  );
}

// ─── Node list ────────────────────────────────────────────────────────────────

function NodeList({nodes,selectedId,onSelect,funnelMap}:{nodes:FlowNode[];selectedId:string|null;onSelect:(n:FlowNode)=>void;funnelMap?:Record<string,number>}){
  return (
    <div className="flex flex-col items-center">
      {nodes.map((node,i)=>(
        <div key={node.id} className="flex flex-col items-center">
          {i>0&&<VLine/>}
          <FlowCard node={node} isSelected={selectedId===node.id} onSelect={onSelect} activeCount={funnelMap?.[node.id]}/>
          {node.type==="condition"&&(<><VLine h={10}/><BranchSplit node={node} selectedId={selectedId} onSelect={onSelect} funnelMap={funnelMap}/></>)}
        </div>
      ))}
    </div>
  );
}

// ─── Chat message ─────────────────────────────────────────────────────────────

function ChatMessage({msg}:{msg:Message}){
  if(msg.role==="user") return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-zinc-900 text-white px-3.5 py-2.5 rounded-[12px] rounded-tr-[4px] text-[13px] leading-relaxed">{msg.text}</div>
    </div>
  );
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={12} strokeWidth={1.8} className="text-zinc-500"/>
      </div>
      <div className="max-w-[85%]">
        {msg.isTyping
          ?<div className="bg-zinc-50 border border-zinc-200 px-3.5 py-3 rounded-[12px] rounded-tl-[4px] flex gap-1.5 items-center h-10">
            {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
          </div>
          :<div className="bg-zinc-50 border border-zinc-200 px-3.5 py-2.5 rounded-[12px] rounded-tl-[4px] text-[13px] text-zinc-700 leading-relaxed">{msg.text}</div>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const INITIAL_MSGS:Message[]=[{id:"m0",role:"ai",text:"Hi! Describe your automation in plain English and I'll build the flow instantly. For example: \"When a lead is created, send a WhatsApp. If they reply, push to CRM. If not, call them after 5 minutes.\""}];
const DEFAULT_INPUT="When a lead is created, send a WhatsApp. If they reply, push to CRM. If not, call them after 5 minutes.";

export default function FlowsPage(){
  const [messages,setMessages]=useState<Message[]>(INITIAL_MSGS);
  const [flowNodes,setFlowNodes]=useState<FlowNode[]>([]);
  const [flowTitle,setFlowTitle]=useState("New flow");
  const [flowGenerated,setFlowGenerated]=useState(false);
  const [input,setInput]=useState(DEFAULT_INPUT);
  const [isTyping,setIsTyping]=useState(false);
  const [selectedNode,setSelectedNode]=useState<FlowNode|null>(null);
  const [canvasView,setCanvasView]=useState<"flow"|"analytics">("flow");
  const endRef=useRef<HTMLDivElement>(null);

  // Build id→activeCount map for badge display on flow cards
  const funnelMap: Record<string,number> = {};
  if(flowGenerated && flowNodes.length){
    computeFunnel(flowNodes,1247).forEach(s=>{ if(s.active>0) funnelMap[s.id]=s.active; });
  }

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const sendMessage=useCallback((text:string)=>{
    if(!text.trim()||isTyping) return;
    const uMsg:Message={id:`u${Date.now()}`,role:"user",text:text.trim()};
    const tMsg:Message={id:`t${Date.now()}`,role:"ai",text:"",isTyping:true};
    setMessages(prev=>[...prev,uMsg,tMsg]);
    setInput(""); setIsTyping(true); setSelectedNode(null);
    setTimeout(()=>{
      const parsed=parseFlow(text);
      const aiText=parsed?buildConfirmation(parsed):"I need a bit more detail — mention a channel (WhatsApp), a condition (if they reply), and what to do in each case (CRM or call). Try again!";
      setMessages(prev=>prev.filter(m=>!m.isTyping).concat({id:`a${Date.now()}`,role:"ai",text:aiText}));
      if(parsed){setFlowNodes(parsed);setFlowGenerated(true);setFlowTitle("Lead Outreach Flow");}
      setIsTyping(false);
    },1500);
  },[isTyping]);

  const handleReset=()=>{
    setMessages(INITIAL_MSGS);setFlowNodes([]);setFlowGenerated(false);
    setFlowTitle("New flow");setInput(DEFAULT_INPUT);setSelectedNode(null);
    setCanvasView("flow");_uid=0;
  };

  const handleNodeUpdate=(id:string,patch:Partial<FlowNode>)=>{
    setFlowNodes(prev=>updateNodeIn(prev,id,patch));
    setSelectedNode(prev=>prev?.id===id?{...prev,...patch}:prev);
  };

  return (
    <div className="flex gap-0 rounded-[10px] overflow-hidden border border-zinc-200 shadow-sm bg-white" style={{height:"calc(100vh - 128px)"}}>

      {/* ── LEFT: Chat ────────────────────────────────────────────────────── */}
      <div className="flex flex-col border-r border-zinc-100 flex-shrink-0" style={{width:380}}>
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center"><Sparkles size={12} strokeWidth={2} className="text-white"/></div>
            <div>
              <div className="text-[13px] font-semibold text-zinc-900">Flow Assistant</div>
              <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500"/><span className="text-[10.5px] text-zinc-400">Ready</span></div>
            </div>
          </div>
          {flowGenerated&&<button onClick={handleReset} className="flex items-center gap-1.5 text-[11.5px] text-zinc-400 hover:text-zinc-700 transition-colors"><RotateCcw size={11} strokeWidth={2}/>Start over</button>}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-0">
          {messages.map(msg=><ChatMessage key={msg.id} msg={msg}/>)}
          <div ref={endRef}/>
        </div>
        <div className="px-4 py-3 border-t border-zinc-100 flex-shrink-0">
          <div className="flex items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-[10px] px-3 py-2.5 focus-within:border-zinc-400 transition-colors">
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);}}}
              placeholder="Describe your automation…" rows={2}
              className="flex-1 bg-transparent text-[13px] text-zinc-800 placeholder:text-zinc-400 resize-none focus:outline-none leading-snug"
              style={{minHeight:40,maxHeight:120}}/>
            <button onClick={()=>sendMessage(input)} disabled={!input.trim()||isTyping}
              className="w-7 h-7 rounded-[7px] bg-zinc-900 flex items-center justify-center flex-shrink-0 hover:bg-zinc-700 disabled:opacity-30 transition-all">
              <ArrowRight size={13} strokeWidth={2.5} className="text-white"/>
            </button>
          </div>
          <div className="text-[10.5px] text-zinc-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</div>
        </div>
      </div>

      {/* ── RIGHT: Canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#FAFAFA] min-w-0 relative">
        <div className="px-5 py-3.5 border-b border-zinc-100 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <input value={flowTitle} onChange={e=>setFlowTitle(e.target.value)} className="text-[14px] font-semibold text-zinc-900 bg-transparent focus:outline-none border-b border-transparent focus:border-zinc-300 transition-colors"/>
            {flowGenerated&&<span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700"><div className="w-1 h-1 rounded-full bg-amber-500"/>Draft</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Flow / Analytics tabs — only visible when a flow exists */}
            {flowGenerated&&(
              <div className="flex rounded-[7px] border border-zinc-200 overflow-hidden text-[11.5px] font-semibold">
                <button onClick={()=>{setCanvasView("flow");setSelectedNode(null);}}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${canvasView==="flow"?"bg-zinc-900 text-white":"bg-white text-zinc-500 hover:bg-zinc-50"}`}>
                  <GitMerge size={12} strokeWidth={2}/>Flow
                </button>
                <button onClick={()=>{setCanvasView("analytics");setSelectedNode(null);}}
                  className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${canvasView==="analytics"?"bg-zinc-900 text-white":"bg-white text-zinc-500 hover:bg-zinc-50"}`}>
                  <BarChart2 size={12} strokeWidth={2}/>Analytics
                </button>
              </div>
            )}
            {flowGenerated&&<div className="flex items-center gap-2 ml-1">
              <button className="px-3 py-1.5 rounded-[7px] text-[12px] font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">Save draft</button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"><Zap size={12} strokeWidth={2}/>Publish</button>
            </div>}
          </div>
        </div>

        {!flowGenerated?(
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center"><Sparkles size={22} strokeWidth={1.5} className="text-zinc-400"/></div>
            <div>
              <div className="text-[15px] font-semibold text-zinc-800 mb-1.5">Your flow will appear here</div>
              <p className="text-[13px] text-zinc-400 leading-relaxed max-w-[240px]">The input on the left is pre-filled. Press Enter to build the flow instantly.</p>
            </div>
          </div>
        ):canvasView==="analytics"?(
          <AnalyticsFunnel nodes={flowNodes}/>
        ):(
          <div className="flex-1 overflow-y-auto overflow-x-auto" onClick={e=>{if(e.target===e.currentTarget)setSelectedNode(null);}}>
            <div className="min-h-full flex flex-col items-center pt-8 pb-20 px-8" style={{minWidth:600}}>
              <NodeList nodes={flowNodes} selectedId={selectedNode?.id??null} onSelect={setSelectedNode} funnelMap={funnelMap}/>
            </div>
          </div>
        )}

        {selectedNode&&(
          <CardEditor node={selectedNode} onSave={handleNodeUpdate} onClose={()=>setSelectedNode(null)}/>
        )}
      </div>
    </div>
  );
}
