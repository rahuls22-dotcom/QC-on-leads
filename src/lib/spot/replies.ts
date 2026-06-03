// Generate a Spot reply for a free-text query. Answer-only: no "actions" part.
// When the query implies a doing-verb (launch, create, add, draft, generate),
// the reply ends with a `handoff` part that lets the user open the guided flow
// for that intent.

import type { GuidedKind, SpotMessage, SpotPart, SpotScope } from "./types";

const HANDOFF_TRIGGERS: { match: RegExp; kind: GuidedKind; label: string; reason: string }[] = [
  {
    match: /new persona|add (a )?persona|draft (a )?persona/i,
    kind: "new-persona",
    label: "Walk through adding a new persona",
    reason: "I'll prompt you for identity, want, pain, USP, and reach — accept or refine each.",
  },
  {
    match: /new angle|add (an )?angle|draft (an )?angle/i,
    kind: "new-angle",
    label: "Walk through adding a new angle",
    reason: "I'll draft hook + CTA + format; you accept or refine each step.",
  },
  {
    match: /(launch|generate|draft|create) (a |new )?creative|new creative/i,
    kind: "launch-creative",
    label: "Launch new creatives",
    reason: "I'll confirm the angle and brief, then open the creative generator.",
  },
  {
    match: /new campaign|add (a )?campaign|launch (a )?campaign/i,
    kind: "new-campaign",
    label: "Set up a new campaign",
    reason: "I'll pick the right campaign type and seed ad sets from your personas.",
  },
];

function handoffFor(query: string): SpotPart | null {
  const t = HANDOFF_TRIGGERS.find((h) => h.match.test(query));
  if (!t) return null;
  return { type: "handoff", kind: t.kind, label: t.label, reason: t.reason };
}

export function generateReply(query: string, scope: SpotScope): SpotMessage {
  const q = query.trim().toLowerCase();
  const parts: SpotPart[] = [];

  // Specific narrative branches based on the demo data.

  if (/cpl.*up|why.*cpl|why is cpl/.test(q)) {
    parts.push({
      type: "headline",
      verdict: "warn",
      text:
        "Banerghatta · LeadGen CPL is up **+22% w/w**. Two ad sets are doing most of the damage; the rest of the campaign is stable.",
    });
    parts.push({
      type: "findings",
      items: [
        {
          tone: "concern",
          title: "Lookalike 2% is fatiguing",
          body: "Frequency has climbed to 3.1 and CTR has halved over 8 days. CPL up 44% on this ad set.",
          evidence: ["Freq 1.6 → 3.1", "CTR 2.1% → 1.4%", "CPL ₹980 → ₹1,420"],
        },
        {
          tone: "concern",
          title: "Whitefield Locals · Interest is converting lower",
          body: "Reach is fine but qualification rate dropped to 1.8% — buyers can't afford the price band.",
          evidence: ["QL rate 4% → 1.8%", "Verified rate 12% → 8%"],
        },
        {
          tone: "neutral",
          title: "Search and Display are stable",
          body: "Brand-keyword search is steady. Display CPM is up but CPL is flat.",
        },
      ],
    });
    parts.push({
      type: "kpis",
      items: [
        { label: "CPL", value: "₹1,210", delta: "+22% w/w", good: false },
        { label: "Verified rate", value: "9.4%", delta: "-2.6pp", good: false },
        { label: "QL rate", value: "1.9%", delta: "-2.1pp", good: false },
      ],
    });
    return { role: "spot", parts };
  }

  if (/behind.*goal|why are we behind|behind pace/.test(q)) {
    parts.push({
      type: "headline",
      verdict: "warn",
      text:
        "You're at **127 of 320 verified leads** — 21% behind pace. Two things are stretching the gap.",
    });
    parts.push({
      type: "findings",
      items: [
        {
          tone: "concern",
          title: "Lookalike audience is saturating",
          body: "The Whitefield Lookalike (1% and 2%) used to deliver verified leads at ₹4,667; it's now at ₹6,200. Frequency is past 3.",
        },
        {
          tone: "concern",
          title: "Tower-A inventory share is shifting",
          body:
            "Tower A 4 BHK inventory is now <12 units. Without that as the entry hook, qualification slowed for the Senior-Banker persona.",
        },
        {
          tone: "positive",
          title: "Search & NRI Meta are clean",
          body: "Both held CPVL inside ₹5,000. NRI verification rate is actually up 4pp.",
        },
      ],
    });
    return { role: "spot", parts };
  }

  if (/reallo|reallocate|move budget|shift budget|compare (banerghatta|kukatpally|workspaces)/.test(q)) {
    parts.push({
      type: "headline",
      verdict: "info",
      text:
        "If we model a ₹14K/wk shift from Kukatpally → Banerghatta (Search + NRI), Banerghatta forecasts land at **280 / 320** by Jun 30 instead of 248.",
    });
    parts.push({
      type: "kpis",
      items: [
        { label: "Banerghatta forecast", value: "280", delta: "+32 vs current", good: true },
        { label: "Kukatpally forecast", value: "58", delta: "−6 vs current", good: null },
        { label: "Net portfolio CPVL", value: "₹5,290", delta: "-3%", good: true },
      ],
    });
    parts.push({
      type: "text",
      text:
        "Kukatpally is already 56% behind goal and the audience can't afford the price band — pulling spend from there has a low cost. **A re-positioning experiment** would be better than more budget either way.",
    });
    return { role: "spot", parts };
  }

  if (/pause kukatpally|should i pause kukatpally/.test(q)) {
    parts.push({
      type: "headline",
      verdict: "warn",
      text:
        "Pausing isn't the answer yet — your lead volume is healthy. The audience just can't afford the **₹85L–1.4Cr** band. Try the 1BHK price-hero experiment first.",
    });
    parts.push({
      type: "findings",
      items: [
        {
          tone: "neutral",
          title: "Volume is fine, qualification is not",
          body: "1,240 leads, 22 qualified. The 2BHK hero is bringing the wrong audience.",
          evidence: ["QL rate 1.8%", "Lead vol 1,240", "Spend efficiency below median"],
        },
        {
          tone: "positive",
          title: "Experiment is ready to go",
          body:
            "Spot has a 1BHK price-hero variant drafted; 10-day pilot at ₹3K/day would tell us if a re-position recovers qualification.",
        },
      ],
    });
    return { role: "spot", parts };
  }

  if (/audit|portfolio|every project/.test(q)) {
    parts.push({
      type: "headline",
      verdict: "info",
      text: "Two projects · one behind pace, one underperforming. Here's the read.",
    });
    parts.push({
      type: "kpis",
      items: [
        { label: "Banerghatta", value: "127 / 320", delta: "behind 21%", good: false },
        { label: "Kukatpally", value: "38 / 200", delta: "behind 56%", good: false },
        { label: "Portfolio CPVL", value: "₹5,460", delta: "+8% w/w", good: false },
      ],
    });
    parts.push({
      type: "findings",
      items: [
        {
          tone: "concern",
          title: "Banerghatta — fatigue, not positioning",
          body: "Lookalike audiences are saturated. Refresh creatives + reallocate to Search/NRI.",
        },
        {
          tone: "concern",
          title: "Kukatpally — positioning, not budget",
          body:
            "Audience can't afford the band. Test 1BHK price-hero before adding spend.",
        },
      ],
    });
    return { role: "spot", parts };
  }

  // Fallback — generic acknowledgement + handoff if applicable.
  const handoff = handoffFor(query);
  if (handoff) {
    parts.push({
      type: "text",
      text: `I can walk you through that. I won't do it for you — every step needs your nod — but I've drafted the answer so you can refine and accept.`,
    });
    parts.push(handoff);
    return { role: "spot", parts };
  }

  parts.push({
    type: "text",
    text: `Scoped to ${scope.label}. I don't have a canned read for that one yet — try asking about goal pace, CPL trend, persona performance, or experiments.`,
  });
  return { role: "spot", parts };
}

export function suggestionsFor(scope: SpotScope): string[] {
  if (scope.kind === "project") {
    return [
      "Why are we behind on the goal?",
      "Which persona is converting best?",
      "Compare CPL by channel",
      "Propose 2 experiments worth running",
    ];
  }
  if (scope.kind === "campaign") {
    return [
      "Why is CPL up this week?",
      "Which ad sets should I pause?",
      "What creatives are winning?",
      "Show me the daily readout",
    ];
  }
  return [
    "Audit every project",
    "Compare CPVL across projects",
    "Find HNI leads with no follow-up",
    "Plan my day",
  ];
}
