// Contacts data — deduplicated people across campaigns

export type ContactSource = "form_submission" | "csv_import" | "crm_sync";

export interface ContactEnquiry {
  id: string;
  campaign: string;
  date: string;
  status: "qualified" | "not_qualified" | "pending";
  verified: boolean;
}

export interface ActivityItem {
  id: string;
  type: "form_submission" | "call" | "qualification" | "crm_sync" | "note";
  description: string;
  date: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  enquiriesCount: number;
  firstSeen: string;
  lastActivity: string;
  source: ContactSource;
  tags: string[];
  enquiries: ContactEnquiry[];
  activities: ActivityItem[];
  notes: string;
}

export const contacts: Contact[] = [
  {
    id: "c-001", name: "Vikram Reddy", phone: "98765 43210", email: "vikram.r@gmail.com",
    enquiriesCount: 3, firstSeen: "2025-12-20", lastActivity: "2026-03-22",
    source: "form_submission", tags: ["HNI", "Whitefield", "3BHK"],
    enquiries: [
      { id: "eq-1", campaign: "Godrej Reflections", date: "2026-03-22", status: "qualified", verified: true },
      { id: "eq-2", campaign: "Godrej Nurture", date: "2026-02-15", status: "qualified", verified: true },
      { id: "eq-3", campaign: "Godrej Air Phase 3", date: "2025-12-20", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-1", type: "qualification", description: "AI qualified — Hot lead, budget ₹2Cr+", date: "2026-03-22T10:30:00" },
      { id: "a-2", type: "call", description: "Voice agent call — 4.2 min, qualified", date: "2026-03-22T09:15:00" },
      { id: "a-3", type: "form_submission", description: "Submitted form on Godrej Reflections campaign", date: "2026-03-22T08:45:00" },
      { id: "a-4", type: "crm_sync", description: "Synced to Salesforce by demo@godrejproperties.com", date: "2026-02-16T14:00:00" },
      { id: "a-5", type: "form_submission", description: "Submitted form on Godrej Nurture campaign", date: "2026-02-15T11:30:00" },
    ],
    notes: "Serious buyer — has visited Godrej Reflections site twice. Interested in east-facing 3BHK on higher floor.",
  },
  {
    id: "c-002", name: "Sneha Menon", phone: "90123 45678", email: "sneha.m@yahoo.com",
    enquiriesCount: 2, firstSeen: "2026-01-10", lastActivity: "2026-03-22",
    source: "form_submission", tags: ["IT Professional", "Sarjapur"],
    enquiries: [
      { id: "eq-4", campaign: "Godrej Eternity", date: "2026-03-22", status: "pending", verified: false },
      { id: "eq-5", campaign: "Godrej Air Phase 3", date: "2026-01-10", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-6", type: "form_submission", description: "Submitted form on Godrej Eternity campaign", date: "2026-03-22T08:45:00" },
      { id: "a-7", type: "qualification", description: "AI qualified — Warm lead, budget ₹1.5Cr", date: "2026-01-11T10:00:00" },
      { id: "a-8", type: "form_submission", description: "Submitted form on Godrej Air campaign", date: "2026-01-10T14:20:00" },
    ],
    notes: "",
  },
  {
    id: "c-003", name: "Arjun Krishnan", phone: "87654 32109", email: "arjun.k@outlook.com",
    enquiriesCount: 2, firstSeen: "2026-02-01", lastActivity: "2026-03-21",
    source: "form_submission", tags: ["NRI", "Investment"],
    enquiries: [
      { id: "eq-6", campaign: "Godrej Nurture", date: "2026-03-21", status: "qualified", verified: true },
      { id: "eq-7", campaign: "Godrej Reserve", date: "2026-02-01", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-9", type: "call", description: "Voice agent call — 5.1 min, qualified", date: "2026-03-21T16:00:00" },
      { id: "a-10", type: "form_submission", description: "Submitted form on Godrej Nurture campaign", date: "2026-03-21T14:30:00" },
    ],
    notes: "NRI based in Dubai. Looking for investment property.",
  },
  {
    id: "c-004", name: "Priya Joshi", phone: "99887 76655", email: "priya.j@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-21", lastActivity: "2026-03-21",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-8", campaign: "Godrej Platinum", date: "2026-03-21", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-11", type: "qualification", description: "AI not qualified — Budget below threshold", date: "2026-03-21T19:30:00" },
      { id: "a-12", type: "form_submission", description: "Submitted form on Godrej Platinum campaign", date: "2026-03-21T19:20:00" },
    ],
    notes: "",
  },
  {
    id: "c-005", name: "Rajesh Bhat", phone: "80123 44567", email: "rajesh.b@gmail.com",
    enquiriesCount: 2, firstSeen: "2026-01-15", lastActivity: "2026-03-21",
    source: "csv_import", tags: ["Existing Customer", "Referral"],
    enquiries: [
      { id: "eq-9", campaign: "Godrej Reserve", date: "2026-03-21", status: "qualified", verified: true },
      { id: "eq-10", campaign: "Godrej Reflections", date: "2026-01-15", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-13", type: "call", description: "Voice agent call — 3.8 min, qualified", date: "2026-03-21T15:00:00" },
      { id: "a-14", type: "crm_sync", description: "Imported via CSV on 15 Jan 2026", date: "2026-01-15T10:00:00" },
    ],
    notes: "Referred by existing customer. Very high intent.",
  },
  {
    id: "c-006", name: "Nandini Das", phone: "91234 56789", email: "nandini.d@hotmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-18", lastActivity: "2026-03-19",
    source: "form_submission", tags: ["Lukewarm"],
    enquiries: [
      { id: "eq-11", campaign: "Godrej Air Phase 3", date: "2026-03-18", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-15", type: "qualification", description: "AI not qualified — Timeline >12 months", date: "2026-03-19T10:15:00" },
      { id: "a-16", type: "call", description: "Voice agent call — 2.4 min, not qualified", date: "2026-03-19T09:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-007", name: "Mohan Sharma", phone: "96543 21098", email: "mohan.s@gmail.com",
    enquiriesCount: 3, firstSeen: "2025-11-05", lastActivity: "2026-03-18",
    source: "form_submission", tags: ["HNI", "4BHK", "Koramangala"],
    enquiries: [
      { id: "eq-12", campaign: "Godrej Air Phase 3", date: "2026-03-18", status: "qualified", verified: true },
      { id: "eq-13", campaign: "Godrej Reflections", date: "2026-01-20", status: "qualified", verified: true },
      { id: "eq-14", campaign: "Godrej Reserve", date: "2025-11-05", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-17", type: "qualification", description: "AI qualified — Hot lead, budget ₹2Cr+, immediate timeline", date: "2026-03-18T16:00:00" },
      { id: "a-18", type: "call", description: "Voice agent call — 6.3 min, qualified, site visit scheduled", date: "2026-03-18T15:00:00" },
    ],
    notes: "Repeat enquirer across 3 projects. Very serious buyer with ₹3Cr+ budget. Currently in Koramangala.",
  },
  {
    id: "c-008", name: "Kavitha Ganesan", phone: "88765 43210", email: "kavitha.g@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-18", lastActivity: "2026-03-18",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-15", campaign: "Godrej Reflections", date: "2026-03-18", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-19", type: "form_submission", description: "Submitted form on Godrej Reflections campaign", date: "2026-03-18T09:45:00" },
    ],
    notes: "",
  },
  {
    id: "c-009", name: "Deepak Tiwari", phone: "70987 65432", email: "deepak.t@gmail.com",
    enquiriesCount: 2, firstSeen: "2026-02-10", lastActivity: "2026-03-17",
    source: "crm_sync", tags: ["CRM Synced", "Follow-up"],
    enquiries: [
      { id: "eq-16", campaign: "Godrej Nurture", date: "2026-03-17", status: "qualified", verified: true },
      { id: "eq-17", campaign: "Godrej Summit", date: "2026-02-10", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-20", type: "crm_sync", description: "Synced from Salesforce CRM", date: "2026-02-10T12:00:00" },
      { id: "a-21", type: "call", description: "Voice agent call — 3.5 min, qualified", date: "2026-03-17T11:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-010", name: "Gayatri Pillai", phone: "95678 90123", email: "gayatri.p@yahoo.com",
    enquiriesCount: 1, firstSeen: "2026-03-17", lastActivity: "2026-03-17",
    source: "form_submission", tags: ["Cold"],
    enquiries: [
      { id: "eq-18", campaign: "Godrej Platinum", date: "2026-03-17", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-22", type: "form_submission", description: "Submitted form on Godrej Platinum campaign", date: "2026-03-17T14:55:00" },
    ],
    notes: "",
  },
  {
    id: "c-011", name: "Tarun Agarwal", phone: "85432 10987", email: "tarun.a@gmail.com",
    enquiriesCount: 2, firstSeen: "2026-01-02", lastActivity: "2026-03-17",
    source: "form_submission", tags: ["HNI", "MG Road"],
    enquiries: [
      { id: "eq-19", campaign: "Godrej Reflections", date: "2026-03-17", status: "qualified", verified: true },
      { id: "eq-20", campaign: "Godrej Nurture", date: "2026-01-02", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-23", type: "call", description: "Voice agent call — 4.8 min, qualified, negotiation stage", date: "2026-03-17T16:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-012", name: "Harini Venkat", phone: "93210 98765", email: "harini.v@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-16", lastActivity: "2026-03-17",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-21", campaign: "Godrej Eternity", date: "2026-03-16", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-24", type: "qualification", description: "AI not qualified — Budget below ₹70L", date: "2026-03-17T09:15:00" },
    ],
    notes: "",
  },
  {
    id: "c-013", name: "Lakshmi Rao", phone: "78901 23456", email: "lakshmi.r@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-20", lastActivity: "2026-03-20",
    source: "form_submission", tags: ["Warm", "Godrej Fan"],
    enquiries: [
      { id: "eq-22", campaign: "Godrej Reserve", date: "2026-03-20", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-25", type: "call", description: "Voice agent call — 5.5 min, qualified", date: "2026-03-20T15:45:00" },
    ],
    notes: "",
  },
  {
    id: "c-014", name: "Yogesh Nair", phone: "82345 67890", email: "yogesh.n@outlook.com",
    enquiriesCount: 1, firstSeen: "2026-03-20", lastActivity: "2026-03-20",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-23", campaign: "Godrej Air Phase 3", date: "2026-03-20", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-26", type: "form_submission", description: "Submitted form on Godrej Air campaign", date: "2026-03-20T11:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-015", name: "Bharat Choudhary", phone: "97890 12345", email: "bharat.c@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-20", lastActivity: "2026-03-20",
    source: "csv_import", tags: ["Imported"],
    enquiries: [
      { id: "eq-24", campaign: "Godrej Woodland", date: "2026-03-20", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-27", type: "crm_sync", description: "Imported via CSV upload", date: "2026-03-20T09:55:00" },
    ],
    notes: "",
  },
  {
    id: "c-016", name: "Fatima Irfan", phone: "89012 34567", email: "fatima.i@gmail.com",
    enquiriesCount: 2, firstSeen: "2026-02-05", lastActivity: "2026-03-19",
    source: "form_submission", tags: ["Hot", "Marathahalli"],
    enquiries: [
      { id: "eq-25", campaign: "Godrej Reflections", date: "2026-03-19", status: "qualified", verified: true },
      { id: "eq-26", campaign: "Godrej Platinum", date: "2026-02-05", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-28", type: "call", description: "Voice agent call — 4.0 min, qualified, site visit done", date: "2026-03-19T20:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-017", name: "Jitendra Wadhwa", phone: "94567 89012", email: "jitendra.w@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-19", lastActivity: "2026-03-19",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-27", campaign: "Godrej Nurture", date: "2026-03-19", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-29", type: "qualification", description: "AI not qualified — Budget below threshold", date: "2026-03-19T17:15:00" },
    ],
    notes: "",
  },
  {
    id: "c-018", name: "Chitra Easwaran", phone: "76543 21098", email: "chitra.e@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-19", lastActivity: "2026-03-20",
    source: "form_submission", tags: ["Warm"],
    enquiries: [
      { id: "eq-28", campaign: "Godrej Air Phase 3", date: "2026-03-19", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-30", type: "call", description: "Voice agent call — 3.2 min, qualified", date: "2026-03-20T11:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-019", name: "Om Upadhyay", phone: "83456 78901", email: "om.u@hotmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-19", lastActivity: "2026-03-19",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-29", campaign: "Godrej Eternity", date: "2026-03-19", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-31", type: "qualification", description: "AI not qualified — Timeline >12 months", date: "2026-03-19T15:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-020", name: "Waseem Zaheer", phone: "92345 67890", email: "waseem.z@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-19", lastActivity: "2026-03-19",
    source: "crm_sync", tags: ["CRM Synced"],
    enquiries: [
      { id: "eq-30", campaign: "Godrej Platinum", date: "2026-03-19", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-32", type: "crm_sync", description: "Synced from Salesforce", date: "2026-03-19T12:45:00" },
    ],
    notes: "",
  },
  {
    id: "c-021", name: "Indira Qadir", phone: "86789 01234", email: "indira.q@gmail.com",
    enquiriesCount: 2, firstSeen: "2025-12-01", lastActivity: "2026-03-18",
    source: "form_submission", tags: ["HNI", "HSR Layout"],
    enquiries: [
      { id: "eq-31", campaign: "Godrej Reflections", date: "2026-03-18", status: "qualified", verified: true },
      { id: "eq-32", campaign: "Godrej Summit", date: "2025-12-01", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-33", type: "call", description: "Voice agent call — 5.0 min, qualified, negotiation", date: "2026-03-18T21:10:00" },
    ],
    notes: "Long-term interested buyer. Has been tracking prices since Dec 2025.",
  },
  {
    id: "c-022", name: "Xander Lobo", phone: "79012 34567", email: "xander.l@yahoo.com",
    enquiriesCount: 1, firstSeen: "2026-03-18", lastActivity: "2026-03-18",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-33", campaign: "Godrej Reserve", date: "2026-03-18", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-34", type: "form_submission", description: "Submitted form on Godrej Reserve campaign", date: "2026-03-18T16:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-023", name: "Esha Hegde", phone: "81234 56789", email: "esha.h@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-18", lastActivity: "2026-03-19",
    source: "form_submission", tags: ["Warm"],
    enquiries: [
      { id: "eq-34", campaign: "Godrej Air Phase 3", date: "2026-03-18", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-35", type: "call", description: "Voice agent call — 4.1 min, qualified", date: "2026-03-19T09:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-024", name: "Umesh Fernandes", phone: "77890 12345", email: "umesh.f@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-18", lastActivity: "2026-03-18",
    source: "csv_import", tags: ["Imported", "Re-engage"],
    enquiries: [
      { id: "eq-35", campaign: "Godrej Summit", date: "2026-03-18", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-36", type: "qualification", description: "AI not qualified — Budget below threshold", date: "2026-03-18T14:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-025", name: "Rekha Banerjee", phone: "98123 45678", email: "rekha.b@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-15", lastActivity: "2026-03-16",
    source: "form_submission", tags: ["Warm", "Indiranagar"],
    enquiries: [
      { id: "eq-36", campaign: "Godrej Reflections", date: "2026-03-15", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-37", type: "call", description: "Voice agent call — 3.9 min, qualified", date: "2026-03-16T10:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-026", name: "Suraj Patil", phone: "87123 45678", email: "suraj.p@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-14", lastActivity: "2026-03-14",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-37", campaign: "Godrej Eternity", date: "2026-03-14", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-38", type: "form_submission", description: "Submitted form on Godrej Eternity", date: "2026-03-14T18:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-027", name: "Meera Iyer", phone: "90234 56789", email: "meera.i@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-12", lastActivity: "2026-03-13",
    source: "crm_sync", tags: ["CRM Synced", "Premium"],
    enquiries: [
      { id: "eq-38", campaign: "Godrej Reserve", date: "2026-03-12", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-39", type: "crm_sync", description: "Synced from Salesforce", date: "2026-03-12T09:00:00" },
      { id: "a-40", type: "call", description: "Voice agent call — 6.0 min, qualified", date: "2026-03-13T14:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-028", name: "Anil Kumar", phone: "85234 56789", email: "anil.k@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-10", lastActivity: "2026-03-11",
    source: "form_submission", tags: ["Cold"],
    enquiries: [
      { id: "eq-39", campaign: "Godrej Platinum", date: "2026-03-10", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-41", type: "qualification", description: "AI not qualified — Not interested", date: "2026-03-11T10:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-029", name: "Pooja Shetty", phone: "93456 78901", email: "pooja.s@outlook.com",
    enquiriesCount: 2, firstSeen: "2025-11-20", lastActivity: "2026-03-08",
    source: "form_submission", tags: ["HNI", "Repeat Enquirer"],
    enquiries: [
      { id: "eq-40", campaign: "Godrej Nurture", date: "2026-03-08", status: "qualified", verified: true },
      { id: "eq-41", campaign: "Godrej Reflections", date: "2025-11-20", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-42", type: "call", description: "Voice agent call — 4.5 min, qualified", date: "2026-03-08T16:30:00" },
    ],
    notes: "",
  },
  {
    id: "c-030", name: "Ramesh Gupta", phone: "88901 23456", email: "ramesh.g@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-05", lastActivity: "2026-03-06",
    source: "csv_import", tags: ["Imported"],
    enquiries: [
      { id: "eq-42", campaign: "Godrej Woodland", date: "2026-03-05", status: "pending", verified: false },
    ],
    activities: [
      { id: "a-43", type: "crm_sync", description: "Imported via CSV upload", date: "2026-03-05T10:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-031", name: "Divya Thakur", phone: "76234 56789", email: "divya.t@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-03-01", lastActivity: "2026-03-02",
    source: "form_submission", tags: ["Warm"],
    enquiries: [
      { id: "eq-43", campaign: "Godrej Air Phase 3", date: "2026-03-01", status: "qualified", verified: true },
    ],
    activities: [
      { id: "a-44", type: "call", description: "Voice agent call — 3.6 min, qualified", date: "2026-03-02T11:00:00" },
    ],
    notes: "",
  },
  {
    id: "c-032", name: "Nikhil Saxena", phone: "82567 89012", email: "nikhil.s@gmail.com",
    enquiriesCount: 1, firstSeen: "2026-02-25", lastActivity: "2026-02-26",
    source: "form_submission", tags: [],
    enquiries: [
      { id: "eq-44", campaign: "Godrej Eternity", date: "2026-02-25", status: "not_qualified", verified: false },
    ],
    activities: [
      { id: "a-45", type: "qualification", description: "AI not qualified — Not decision maker", date: "2026-02-26T09:00:00" },
    ],
    notes: "",
  },
];

export const sourceFilterOptions: { label: string; value: "all" | ContactSource }[] = [
  { label: "All Sources", value: "all" },
  { label: "Form Submission", value: "form_submission" },
  { label: "CSV Import", value: "csv_import" },
  { label: "CRM Sync", value: "crm_sync" },
];
