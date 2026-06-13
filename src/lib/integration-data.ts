// Integration mock data. Prototype only — mirrors the real Revspot API at
// docs.revspot.ai.
//
// Model: a static bearer token identifies the client on every call. Each product
// is configured on its own tab. Two directions:
//  - inbound + callback (enrichment, ai_calling): client calls our API, we run
//    the job async and POST the result back to the client's callback URL.
//  - callback only (campaigns): WE create new leads and deliver each one to the
//    client's callback URL. Nothing to call inbound — they just give us a URL.

import type { ProductKey } from "@/lib/products";

export const DOCS_BASE = "https://docs.revspot.ai";

// ── Shared credentials (client → Revspot) ───────────────────
export const API_BASE = "https://api.revspot.ai";
// Static, long-lived. Identifies the client on every call. Does not rotate.
export const apiToken = "rvk_8f3c2a9b7d1e4056a2c91f7e";

// ── Per-product config (drives each module tab) ─────────────
export interface ProductApi {
  // Whether the client calls us (inbound) or we only deliver to them (callback).
  direction: "inbound" | "callback";
  blurb: string;
  // Inbound endpoints the client calls. Empty for callback-only products.
  endpoints: { method: string; path: string; desc: string }[];
  // What we POST to the client's callback URL.
  sampleCallback: string;
}

export const PRODUCT_API: Record<ProductKey, ProductApi> = {
  enrichment: {
    direction: "inbound",
    blurb:
      "Send leads to our API. We enrich them and POST the result to your webhook URL.",
    endpoints: [
      { method: "POST", path: "/lead/enrich/", desc: "Enrich a single lead" },
      { method: "POST", path: "/lead/bulk/enrich", desc: "Enrich a batch of leads" },
      { method: "POST", path: "/lead/file/upload", desc: "Upload a file to enrich" },
    ],
    sampleCallback: `{
  "lead_id": "xyz123",
  "enriched": true,
  "name": "Test Lead",
  "job_title": "Engineering Manager",
  "company_name": "Infosys",
  "company_industry": "IT Services",
  "professional_level": "Senior",
  "location": "Bengaluru",
  "linkedin_url": "https://linkedin.com/in/...",
  "education_field": "Computer Science"
}`,
  },
  // Contact extraction is the OCR/parse pipeline — you push raw artefacts
  // (visiting cards, intake forms, screenshots) and we POST back the
  // structured contact. Same direction-and-callback shape as Enrichment;
  // the difference is what's on the wire.
  contact_extraction: {
    direction: "inbound",
    blurb:
      "Send images, screenshots, or scans of business cards / intake forms. We OCR + structure the contact and POST it to your webhook URL.",
    endpoints: [
      { method: "POST", path: "/contact/extract",      desc: "Extract a contact from a single image" },
      { method: "POST", path: "/contact/bulk/extract", desc: "Extract contacts from a batch of images" },
      { method: "POST", path: "/contact/file/upload",  desc: "Upload a multi-page PDF/scan for extraction" },
    ],
    sampleCallback: `{
  "extraction_id": "ext_4a91c7d2",
  "extracted": true,
  "name": "Aanya Sharma",
  "job_title": "Director",
  "company_name": "Brigade Group",
  "email": "aanya.sharma@brigadegroup.com",
  "phone": "+91 98XXXXXX21",
  "source_image_url": "https://cdn.revspot.ai/ext/4a91c7d2.jpg"
}`,
  },
  ai_calling: {
    direction: "inbound",
    blurb:
      "Trigger a call via our API. When it ends we POST the recording, transcript, and summary to your webhook URL.",
    endpoints: [
      { method: "POST", path: "/lead/ai_call", desc: "Trigger an outbound AI call" },
    ],
    sampleCallback: `{
  "lead_id": "xyz123",
  "call_id": "call_8f3c2a9b",
  "call_recording": "https://cdn.revspot.ai/rec/8f3c.mp3",
  "call_transcript": "Agent: Hi Jane ... Lead: Yes, Saturday works.",
  "summary": "Interested. Site visit booked for Saturday 11am.",
  "site_visit_booked": true
}`,
  },
  campaigns: {
    direction: "callback",
    blurb:
      "We generate leads from your campaigns and POST each one to your webhook URL as it comes in.",
    endpoints: [],
    sampleCallback: `{
  "lead_id": "rl_4601",
  "name": "Aman Kapoor",
  "phone": "+91 99XXXXXX44",
  "email": "aman@example.com",
  "source_campaign": "Whitefield-Meta-Jun",
  "created_at": "2024-06-03T10:22:00Z"
}`,
  },
};
