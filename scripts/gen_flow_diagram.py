#!/usr/bin/env python3
"""Generate ONE combined Excalidraw canvas covering:
   Flow 1 Create a Product  ·  Flow 2 Launch  ·  Flow 3 Optimize Campaign
Each LLM call is a rich node: header bar -> "LOADED INTO CONTEXT" -> divider -> "PRODUCED".
Plus inventory panels (Agents / Skills / Tools / Components / Markdown artefacts), legend
and a principle-changes panel.
Output: docs/flows-create-launch-optimize.excalidraw
"""
import json, random

elements = []
reg = {}              # name -> (x, y, w, h)
_seed = 5000
def nid():
    global _seed; _seed += 1
    return f"el{_seed}"

# palette ------------------------------------------------------------------
USER  = ("#a5d8ff", "#1971c2")   # blue   user
SPOT  = ("#ffd8a8", "#d9480f")   # orange Spot (orchestrator + executor)
AGENT = ("#fcc2d7", "#c2255c")   # pink   sub-agent (producer)
WORK  = ("#e5dbff", "#5f3dc4")   # purple work artefact (gated)
REF   = ("#d3f9d8", "#2f9e44")   # green  reference artefact / memory
GATE  = ("#ffc9c9", "#c92a2a")   # red    gate / write
SYS   = ("#ffec99", "#f08c00")   # yellow scheduler / nudge

def rect(x, y, w, h, fill, stroke, dashed=False, round_=True, sw=2):
    elements.append({
        "id": nid(), "type": "rectangle", "x": x, "y": y, "width": w, "height": h,
        "angle": 0, "strokeColor": stroke, "backgroundColor": fill, "fillStyle": "solid",
        "strokeWidth": sw, "strokeStyle": "dashed" if dashed else "solid", "roughness": 0,
        "opacity": 100, "groupIds": [], "frameId": None,
        "roundness": {"type": 3} if round_ else None, "seed": random.randint(1, 9**8),
        "version": 1, "versionNonce": random.randint(1, 9**8), "isDeleted": False,
        "boundElements": [], "updated": 1717000000000, "link": None, "locked": False,
    })

def text(x, y, s, size=12, color="#343a40", family=2, w=None):
    lines = s.split("\n")
    width = w if w else max(len(l) for l in lines) * size * 0.58
    elements.append({
        "id": nid(), "type": "text", "x": x, "y": y, "width": width,
        "height": len(lines) * size * 1.25, "angle": 0, "strokeColor": color,
        "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 1,
        "strokeStyle": "solid", "roughness": 0, "opacity": 100, "groupIds": [],
        "frameId": None, "roundness": None, "seed": random.randint(1, 9**8), "version": 1,
        "versionNonce": random.randint(1, 9**8), "isDeleted": False, "boundElements": [],
        "updated": 1717000000000, "link": None, "locked": False, "fontSize": size,
        "fontFamily": family, "text": s, "textAlign": "left", "verticalAlign": "top",
        "containerId": None, "originalText": s, "lineHeight": 1.25, "baseline": size,
    })

def arrow(x1, y1, x2, y2, dashed=False, color="#495057"):
    elements.append({
        "id": nid(), "type": "arrow", "x": x1, "y": y1, "width": abs(x2 - x1),
        "height": abs(y2 - y1), "angle": 0, "strokeColor": color,
        "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 2,
        "strokeStyle": "dashed" if dashed else "solid", "roughness": 0, "opacity": 100,
        "groupIds": [], "frameId": None, "roundness": {"type": 2},
        "seed": random.randint(1, 9**8), "version": 1, "versionNonce": random.randint(1, 9**8),
        "isDeleted": False, "boundElements": [], "updated": 1717000000000, "link": None,
        "locked": False, "points": [[0, 0], [x2 - x1, y2 - y1]], "lastCommittedPoint": None,
        "startBinding": None, "endBinding": None, "startArrowhead": None, "endArrowhead": "arrow",
    })

W = 300                  # default call-node width
LH = 15                  # line height inside body
HEAD = 34                # header height

def call(name, x, y, title, loaded, produced, colors, w=W):
    """Rich per-LLM-call node: header + LOADED section + divider + PRODUCED section."""
    fill, stroke = colors
    body_top = 6
    loaded_block = 16 + len(loaded) * LH
    div_gap = 10
    prod_label = 16
    prod_block = len(produced) * LH
    h = HEAD + body_top + loaded_block + div_gap + prod_label + prod_block + 12
    # body
    rect(x, y, w, h, "#ffffff", stroke)
    # header
    rect(x, y, w, HEAD, fill, stroke)
    text(x + 12, y + 9, title, size=14, color=stroke, family=2)
    cy = y + HEAD + body_top
    text(x + 12, cy, "↓ LOADED INTO CONTEXT", size=9, color="#868e96", family=2)
    cy += 16
    text(x + 14, cy, "\n".join(loaded), size=11, color="#343a40", family=2)
    cy += len(loaded) * LH + 4
    # divider
    rect(x + 10, cy, w - 20, 1.5, stroke, stroke, round_=False, sw=1)
    cy += div_gap
    text(x + 12, cy, "↑ PRODUCED", size=9, color="#868e96", family=2)
    cy += 16
    text(x + 14, cy, "\n".join(produced), size=11, color=stroke, family=2)
    reg[name] = (x, y, w, h)
    return h

def box(name, x, y, w, h, colors, title, body, dashed=False):
    """Simple labelled box for users / gates / artefacts / system nodes."""
    fill, stroke = colors
    rect(x, y, w, h, fill, stroke, dashed=dashed)
    text(x + 12, y + 10, title, size=13, color=stroke, family=2)
    text(x + 12, y + 32, body, size=10.5, color="#343a40", family=2)
    reg[name] = (x, y, w, h)

def mid_r(n): x, y, w, h = reg[n]; return (x + w, y + h / 2)
def mid_l(n): x, y, w, h = reg[n]; return (x, y + h / 2)
def mid_b(n): x, y, w, h = reg[n]; return (x + w / 2, y + h)
def mid_t(n): x, y, w, h = reg[n]; return (x + w / 2, y)

def flow(a, b, dashed=False, color="#495057"):
    x1, y1 = mid_r(a); x2, y2 = mid_l(b); arrow(x1, y1, x2, y2, dashed, color)
def down(a, b, dashed=False, color="#495057"):
    x1, y1 = mid_b(a); x2, y2 = mid_t(b); arrow(x1, y1, x2, y2, dashed, color)

def COL(i): return 60 + i * 360

# =========================================================================
# TITLE
# =========================================================================
text(60, -150, "Spot · Agentic Flows", size=32, color="#5f3dc4", family=2)
text(60, -104, "Flow 1 Create a Product  →  Flow 2 Launch  →  Flow 3 Optimize Campaign · per-LLM-call detail",
     size=15, color="#868e96", family=2)

# =========================================================================
# FLOW 1 — CREATE A PRODUCT
# =========================================================================
rect(40, -40, 2820, 50, "#f3f0ff", "#5f3dc4")
text(60, -28, "FLOW 1 · CREATE A PRODUCT   —   Phase A Strategy → Gate 1 → Phase B Campaign Plan → Gate 2",
     size=18, color="#5f3dc4", family=2)

yA = 90
call("T1", COL(0), yA, "T1 · Spot",
     ["sys prompt · tools", "skills · global memory", "user message"],
     ["thought-sig T1", "load skill/create-product", "load tool/create-product-brief", "→ asks user for inputs"], SPOT)
box("USER1", COL(1), yA + 30, 220, 90, USER, "User",
    "name · link (URL) · PDF")
call("T2", COL(2), yA, "T2 · Spot",
     ["thought-sig T1", "skill + tool", "user inputs"],
     ["thought-sig T2", "SPAWN product-brief-agent", "with brief"], SPOT)
call("T3", COL(3), yA, "T3 · Product Brief Agent",
     ["skills: create-brief,", "  deep-research", "tools: web-search,", "  url-crawl, pdf-read", "brief · global memory"],
     ["deep-research.md", "  → saved (reference)", "brief content → Spot"], AGENT)
box("DR", COL(3), yA + 290, W, 96, REF, "deep-research.md · REFERENCE",
    "market · competitors ·\naudience signals.\nKept even if Gate 1 fails.")
call("T4", COL(4), yA, "T4 · Spot",
     ["thought-sig T2", "brief content", "load skill/create-strategy"],
     ["thought-sig T3", "Persona · Creative Strategy", "· Form Strategy", "→ product-strategy.md"], SPOT)
call("T5", COL(5), yA, "T5 · Spot",
     ["thought-sig T3", "product-strategy.md"],
     ["thought-sig T4", "presents in canvas", "awaits approval"], SPOT)
box("G1", COL(6), yA + 10, 200, 150, GATE, "GATE 1",
    "Approve Product\nStrategy.\nEdit inline OR chat.\nLoops back to T4.")
box("PS", COL(7), yA, 220, 170, WORK, "product-strategy.md",
    "WORK · \U0001f6aa1 gated\n1 Brief\n2 Persona\n3 Creative Strategy\n4 Form Strategy")

flow("T1", "USER1"); flow("USER1", "T2"); flow("T2", "T3")
down("T3", "DR"); flow("T3", "T4"); flow("T4", "T5"); flow("T5", "G1"); flow("G1", "PS")
ax, ay = mid_b("G1"); arrow(ax, ay, COL(4) + W / 2, yA + reg["T4"][3], dashed=True, color="#c92a2a")

# ---- Phase B ----
yB = 560
text(60, yB - 26, "PHASE B · CAMPAIGN PLAN  (Gate 1 approved)", size=13, color="#5f3dc4", family=2)
call("T6", COL(0), yB + 90, "T6 · Spot",
     ["thought-sig T4", "approved product-strategy.md", "load skill/execute-plan"],
     ["thought-sig T5", "SPAWN 3 in parallel", "each gets its strategy section"], SPOT)
call("T7a", COL(1), yB, "T7a · Creative Agent",
     ["skill: generate-creatives", "tools: image-gen, copywriter", "brief: Persona + Creative Str."],
     ["creatives.md", "(statics + copy)"], AGENT)
call("T7b", COL(1), yB + 170, "T7b · Form Agent",
     ["skill: build-form", "tool: form-schema", "brief: Persona + Form Str."],
     ["lead-form.md", "(fields, banner, logic)"], AGENT)
call("T7c", COL(1), yB + 340, "T7c · Targeting Agent",
     ["skill: build-targeting", "tools: audience-graph,", "  lookalike-builder", "brief: Persona"],
     ["targeting.md", "(FB + Revspot audiences)"], AGENT)
call("T8", COL(2), yB + 90, "T8 · Spot",
     ["thought-sig T5", "3 sub-agent artefacts", "load assemble-campaign-plan"],
     ["thought-sig T6", "campaign-plan.md", "+ structure + budget"], SPOT)
call("T9", COL(3), yB + 90, "T9 · Spot",
     ["thought-sig T6", "campaign-plan.md"],
     ["thought-sig T7", "presents in canvas", "awaits approval"], SPOT)
box("G2", COL(4), yB + 110, 200, 150, GATE, "GATE 2",
    "Approve Campaign\nPlan. Edit OR chat.\nLoops back to T8.\n→ input to Flow 2")
box("CP", COL(5), yB + 90, 220, 160, WORK, "campaign-plan.md",
    "WORK · \U0001f6aa2 gated\ncreatives · lead form ·\ntargeting · structure ·\nbudget")

down("G1", "T6"); flow("T6", "T7a"); flow("T6", "T7b"); flow("T6", "T7c")
flow("T7a", "T8"); flow("T7b", "T8"); flow("T7c", "T8"); flow("T8", "T9"); flow("T9", "G2"); flow("G2", "CP")
gx, gy = mid_b("G2"); arrow(gx, gy, COL(2) + W / 2, yB + 90 + reg["T8"][3], dashed=True, color="#c92a2a")

# =========================================================================
# FLOW 2 — LAUNCH
# =========================================================================
yL0 = 1170
rect(40, yL0, 2820, 50, "#fff4e6", "#d9480f")
text(60, yL0 + 12, "FLOW 2 · LAUNCH   —   Spot is the executor (Pr.11). No sub-agents. Tiered write gates (Pr.12).",
     size=18, color="#d9480f", family=2)
yL = yL0 + 90
# approved plan feeds Launch
arrow(*mid_b("CP"), COL(0) + W / 2, yL, color="#2f9e44")
text(COL(5) - 40, yB + 270, "Gate 2 approved →\nLaunch (Flow 2)", size=12, color="#2f9e44", family=2)

call("L1", COL(0), yL, "L1 · Spot",
     ["approved campaign-plan.md", "load skill/launch-campaign"],
     ["thought-sig L1", "maps plan → Meta entity graph", "presents \U0001f6aa 2-S 'Build it?'"], SPOT)
box("G2S", COL(1), yL + 15, 230, 130, GATE, "GATE 2-S · STRUCTURAL",
    "BULK. One click\nauthorizes all paused /\nno-spend writes.")
call("L2", COL(2), yL, "L2 · Spot  EXECUTES (structural)",
     ["thought-sig L1", "approved entity graph"],
     ["create-lead-form · push-audience", "create-campaign (paused)", "create-adset (paused)", "publish-creative → create-ad", "records Meta IDs"], SPOT)
call("L3", COL(3), yL, "L3 · Spot",
     ["thought-sig L2", "built (paused) entities", "budget from plan"],
     ["thought-sig L3", "presents paused campaign", "\U0001f6aa 2-G per spend write"], SPOT)
box("G2G", COL(4), yL + 15, 230, 130, GATE, "GATE 2-G · SPEND",
    "ONE PER WRITE.\n'Set ₹X/day & launch\nAd Set A?'")
call("L4", COL(5), yL, "L4 · Spot  EXECUTES (spend)",
     ["thought-sig L3", "per-write approvals"],
     ["update-budget · activate-campaign", "writes launch-record.md", "→ now under daily watch"], SPOT)
box("LR", COL(5), yL + 250, W, 86, REF, "launch-record.md · REFERENCE",
    "Meta entity IDs,\nbudgets, timestamps.")

flow("L1", "G2S"); flow("G2S", "L2"); flow("L2", "L3"); flow("L3", "G2G"); flow("G2G", "L4")
down("L4", "LR")

# =========================================================================
# FLOW 3 — OPTIMIZE
# =========================================================================
yO0 = 1640
rect(40, yO0, 2820, 50, "#fff0f6", "#c2255c")
text(60, yO0 + 12, "FLOW 3 · OPTIMIZE   —   Watch (unattended) → \U0001f514 Nudge → Diagnose → Gate 3 → Fix (Spot executes)",
     size=18, color="#c2255c", family=2)

# ---- Watch ----
yW = yO0 + 100
text(60, yW - 24, "PHASE A · WATCH  (no user present)", size=13, color="#c2255c", family=2)
box("S0", COL(0), yW + 15, W, 120, SYS, "⏰ Scheduler",
    "daily cron · no LLM\nfires one Analyst run\nper product")
call("A1", COL(1), yW, "A1 · Analyst Agent (scheduled)",
     ["skill: monitor-products", "tools: fetch-performance,", "  ad-platform-read,", "  benchmark, anomaly-detect", "all products' memory"],
     ["daily-analysis.md /product", "  → saved (reference)", "ranked findings → Spot"], AGENT)
box("DA", COL(1), yW + 290, W, 86, REF, "daily-analysis.md · REFERENCE",
    "per product / day.\nperf scan + ranked findings.")
call("O1", COL(2), yW, "O1 · Spot",
     ["daily findings", "load skill/triage"],
     ["thought-sig · act / hold", "per product", "\U0001f514 raises nudge if action"], SPOT)
box("NUDGE", COL(3), yW + 15, W, 120, SYS, "\U0001f514 Nudge",
    "'CAC up 40% on X —\nwant to look?'\nshown on home")
box("USER3", COL(4), yW + 30, 220, 90, USER, "User",
    "act  ·  dismiss\n(dismiss → no flow)")
flow("S0", "A1"); down("A1", "DA"); flow("A1", "O1"); flow("O1", "NUDGE"); flow("NUDGE", "USER3")

# ---- Diagnose ----
yD = yW + 420
text(60, yD - 24, "PHASE B · DIAGNOSE  (user chose 'act')", size=13, color="#c2255c", family=2)
call("O2", COL(0), yD, "O2 · Spot",
     ["the day's finding", "user chose 'act'"],
     ["thought-sig", "SPAWN analyst-agent", "with diagnose brief"], SPOT)
call("A2", COL(1), yD, "A2 · Analyst Agent (on-demand)",
     ["skill: diagnose", "tools: fetch-performance,", "  ad-platform-read,", "  audience-graph", "product memory · finding"],
     ["diagnosis.md → saved (ref)", "root cause + problem", "  → Spot"], AGENT)
box("DG", COL(1), yD + 290, W, 80, REF, "diagnosis.md · REFERENCE",
    "root cause +\nproblem statement.")
call("O3", COL(2), yD, "O3 · Spot",
     ["diagnosis.md"],
     ["presents problem in canvas", "offers 'brainstorm or", "  build a plan'"], SPOT)
box("BRAIN", COL(3), yD + 15, W, 120, USER, "Brainstorm (optional)",
    "User chats with Spot.\nLoops on SPOT only —\nno spawn, no new skill.", dashed=True)
ux, uy = mid_b("USER3"); arrow(ux, uy, COL(0) + W / 2, yD, color="#1971c2")
flow("O2", "A2"); down("A2", "DG"); flow("A2", "O3"); flow("O3", "BRAIN", dashed=True)

# ---- Fix ----
yF = yD + 420
text(60, yF - 24, "PHASE C · FIX  (gated · Spot executes)", size=13, color="#c2255c", family=2)
call("O4", COL(0), yF, "O4 · Spot",
     ["diagnosis (+ brainstorm)", "load build-execution-plan"],
     ["thought-sig", "execution-plan.md", "budget · creatives ·", "targeting · pauses"], SPOT)
call("O5", COL(1), yF, "O5 · Spot",
     ["execution-plan.md"],
     ["presents in canvas", "awaits approval"], SPOT)
box("G3", COL(2), yF + 10, 200, 140, GATE, "GATE 3",
    "Approve execution\nplan. Edit OR chat.\nLoops back to O4.")
box("EP", COL(2), yF + 270, 200, 90, WORK, "execution-plan.md",
    "WORK · \U0001f6aa3 gated\nactions · budget ·\nnew assets · pauses")
call("O6", COL(3), yF, "O6 · Spot",
     ["approved execution-plan.md", "load skill/execute-plan"],
     ["if new assets needed:", "SPAWN producers", "they PRODUCE only —", "touch no ad account"], SPOT)
box("PROD", COL(4), yF + 20, W, 130, AGENT, "Producers (as needed)",
    "Creative Agent\nForm Agent\nTargeting Agent\n→ return artefacts only")
call("O7", COL(5), yF, "O7 · Spot  EXECUTES",
     ["produced assets", "approved plan"],
     ["thought-sig · writes:", "pause-adset · update-budget", "publish-creative", "structural bulk + spend 1-by-1"], SPOT)
box("GW", COL(6), yF + 10, 220, 140, GATE, "GATE · TIERED",
    "structural → bulk\nspend → individual\n(Pr. 8 · 11 · 12)")
bx, by = mid_b("O3"); arrow(bx, by, COL(0) + W / 2, yF, color="#495057")
flow("O4", "O5"); flow("O5", "G3"); down("G3", "EP"); flow("G3", "O6")
flow("O6", "PROD"); flow("PROD", "O7"); flow("O7", "GW")

# =========================================================================
# RIGHT COLUMN — INVENTORY
# =========================================================================
IX = 3120
def panel(x, y, w, h, title, lines, accent):
    fill, stroke = accent
    rect(x, y, w, h, "#ffffff", stroke)
    rect(x, y, w, 34, fill, stroke)
    text(x + 12, y + 9, title, size=15, color=stroke, family=2)
    text(x + 12, y + 46, lines, size=11, color="#343a40", family=2)

panel(IX, 90, 480, 270, "AGENTS  (6)",
"""Spot — orchestrator + ONLY executor
   only chat surface · the only writer
   trigger: user msg + nudge · spawns all

Product Brief Agent  · Create A
Creative Agent       · Create B / Opt C
Form Agent           · Create B / Opt C
Targeting Agent      · Create B / Opt C
   (produce only — never write)
Analyst Agent        · Opt A & B
   trigger: ⏰ schedule + spawned · read-only

Launch (Flow 2) spawns NO sub-agents.""", AGENT)

panel(IX, 380, 480, 320, "SKILLS  (15)",
"""On Spot:
  create-product · create-strategy
  execute-plan · assemble-campaign-plan
  launch-campaign
  triage · brainstorm · build-execution-plan

On Product Brief Agent:
  create-brief · deep-research
On Creative Agent:   generate-creatives
On Form Agent:       build-form
On Targeting Agent:  build-targeting
On Analyst Agent:
  monitor-products (daily) · diagnose

Loaded per phase, then unloaded (Pr.3)""", WORK)

panel(IX, 720, 480, 360, "TOOLS  (20)",
"""READ:
  web-search · url-crawl · pdf-read
  fetch-performance · ad-platform-read
  benchmark · anomaly-detect · audience-graph
GENERATE / BUILD:
  image-gen · copywriter
  form-schema · lookalike-builder
WRITE — SPOT ONLY (Pr.11):
  structural (bulk gate, Pr.12):
    create-lead-form · push-audience
    create-campaign · create-adset
    create-ad · publish-creative
  spend (individual gate, Pr.12):
    update-budget · activate-campaign
    pause-adset""", REF)

panel(IX, 1100, 480, 250, "OTHER COMPONENTS",
"""Thought signature — Spot's durable
   reasoning; survives chat pruning
Memory — per-product + global
Scheduler (cron) — fires Analyst daily;
   only non-user trigger (Pr.9)
Nudge surface — Spot → user, proactive;
   only autonomous output (Pr.10)
Meta entity graph — campaign / ad set /
   ad / form / audience that Spot writes
Gates — user approval points (Pr.8/12)""", SYS)

panel(IX, 1370, 480, 320, "MARKDOWN ARTEFACTS  (10)",
"""REFERENCE (auto-saved, ungated):
  deep-research.md   · PBA / Create A
  launch-record.md   · Spot / Launch
  daily-analysis.md  · Analyst / Opt A
  diagnosis.md       · Analyst / Opt B
  change history     · all flows
WORK (user-gated, editable):
  product-strategy.md · \U0001f6aa1
  campaign-plan.md    · \U0001f6aa2
  execution-plan.md   · \U0001f6aa3
SUB-AGENT (intermediate, merged):
  creatives.md · lead-form.md · targeting.md""", SPOT)

panel(IX, 1710, 480, 230, "LEGEND",
"""\U0001f7e7 Spot — orchestrator + executor
\U0001f7ea Work artefact (gated)
\U0001f7e5 Gate / write (user approval)
\U0001f7e9 Reference artefact / memory
\U0001f7e6 User
\U0001fa77 Sub-agent (produces only)
\U0001f7e8 System — scheduler / nudge
→ flow   -→ loop-back / optional""", USER)

# =========================================================================
# PRINCIPLE CHANGES (bottom)
# =========================================================================
PCY = yF + 360
rect(40, PCY, 3560, 50, "#fff0f6", "#c2255c")
text(60, PCY + 12, "PRINCIPLE CHANGES — what Flows 2 & 3 forced", size=18, color="#c2255c", family=2)
py = PCY + 80
box("P1", 60, py, 560, 150, USER, "P1 · AMENDED (Flow 3)",
    "'User talks to Spot' → 'All communication\nflows through Spot — both directions.'\nSpot can now INITIATE (the nudge).\nChannel still exclusive, now two-way.")
box("P2", 660, py, 560, 150, SPOT, "P2 · AMENDED (Flow 2)",
    "'Spot doesn't do the work' → 'Spot\norchestrates AND executes; sub-agents\nonly produce.' The split is now\nproduce-vs-execute. Spot owns all writes.")
box("P3", 1260, py, 560, 150, WORK, "P3 · CLARIFIED (Flow 3)",
    "'Skills loaded per phase, not always-on.'\nThe daily Analyst is SCHEDULED but each\nrun loads + unloads its own skills.\nNothing stays resident in Spot's context.")
box("P9", 1860, py, 560, 150, REF, "P9 · NEW (Flow 3)",
    "'Flows are triggered two ways: by the\nuser, or by a schedule.' A scheduled run\nmay ONLY produce reference artefacts +\nraise a nudge. No gated action alone.")
box("P10", 2460, py, 560, 150, REF, "P10 · NEW (Flow 3)",
    "'Proactive output is a nudge, never an\naction.' With Pr.8: no money moves on the\nautonomous path without a human click,\neven when the agent started the talk.")
box("P11", 3060, py, 540, 150, GATE, "P11 · NEW (Flow 2)",
    "'Only Spot executes writes.' Gates live\nwith the user, who only talks to Spot —\napproval & execution co-located. Sub-agents\nnever hold write creds, never touch money.")
box("P12", 60, py + 175, 560, 130, GATE, "P12 · NEW (Flow 2)",
    "'Write gates are tiered: structural in\nbulk, spend one-by-one.' Autopilot on the\nreversible/no-spend majority; explicit\nconsent on every rupee.")
text(660, py + 185,
"UNCHANGED & load-bearing:  P4 spawn for isolation · P5 artefacts only · P6 one level deep · "
"P7 declared spawns · P8 every artefact gated.\n\nRECOMMENDED (you asked): write-gate granularity = TIERED. Full decision process in PRD · Flow 2.",
     size=13, color="#868e96", family=2)

# =========================================================================
doc = {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
       "elements": elements,
       "appState": {"gridSize": None, "viewBackgroundColor": "#ffffff"}, "files": {}}
out = "docs/flows-create-launch-optimize.excalidraw"
with open(out, "w") as f:
    json.dump(doc, f, indent=2)
print(f"wrote {out} · {len(elements)} elements · {len(reg)} nodes")
