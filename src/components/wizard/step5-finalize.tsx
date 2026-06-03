"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, ExternalLink } from "lucide-react";

export function Step5Finalize() {
  return (
    <div className="text-center py-10">
      {/* Success Icon */}
      <div className="w-16 h-16 mx-auto mb-5 bg-[#F0FDF4] rounded-full flex items-center justify-center">
        <CheckCircle2 size={32} strokeWidth={1.5} className="text-status-success" />
      </div>

      <h2 className="text-[22px] font-semibold text-text-primary mb-2">
        Campaign Created Successfully
      </h2>
      <p className="text-meta text-text-secondary max-w-[480px] mx-auto mb-8">
        Your campaign &quot;Godrej Air Phase 3&quot; has been created on Meta in paused state.
        Review everything on Meta Ads Manager before going live.
      </p>

      {/* Summary Card */}
      <div className="bg-white border border-border rounded-card p-5 max-w-[500px] mx-auto mb-8 text-left">
        <h3 className="text-[12px] font-medium text-text-tertiary uppercase tracking-[0.4px] mb-4">
          What was created
        </h3>
        <div className="space-y-3">
          {[
            { label: "Campaign", value: "Godrej Air Phase 3 — Lead Gen" },
            { label: "Ad Sets", value: "3 (Whitefield HNI, Sarjapur IT, Broad Bangalore)" },
            { label: "Ads", value: "9 (3 per ad set)" },
            { label: "Lead Forms", value: "2 (High Intent, Quick Inquiry)" },
            { label: "Daily Budget", value: "₹8,000" },
            { label: "Status", value: "Paused — ready for review" },
          ].map((item) => (
            <div key={item.label} className="flex items-start justify-between">
              <span className="text-[12px] text-text-secondary">{item.label}</span>
              <span className="text-[12px] text-text-primary font-medium text-right max-w-[280px]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/campaigns/camp-7"
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
        >
          View Campaign
          <ArrowRight size={15} strokeWidth={2} />
        </Link>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150"
        >
          All Campaigns
        </Link>
        <button className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium text-text-secondary border border-border rounded-button bg-white hover:bg-surface-page transition-colors duration-150">
          <ExternalLink size={13} strokeWidth={1.5} />
          Open in Meta
        </button>
      </div>
    </div>
  );
}
