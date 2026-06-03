"use client";

import { useState } from "react";
import { ArrowRight, Upload, X } from "lucide-react";

interface StepCompanyProps {
  onNext: (data: {
    companyName: string;
    industry: string;
    logoFile?: string;
    userName: string;
  }) => void;
}

export function StepCompany({ onNext }: StepCompanyProps) {
  const [logoFile, setLogoFile] = useState("");
  const [userName, setUserName] = useState("");

  const companyName = "Godrej Properties";
  const industry = "Real Estate";

  const canContinue = userName.trim().length > 0;

  return (
    <div className="max-w-[560px] mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-[24px] font-semibold text-text-primary mb-2">
          Welcome to Revspot
        </h2>
        <p className="text-[14px] text-text-secondary">
          Confirm your organization details and let&apos;s get started.
        </p>
      </div>

      <div className="bg-white border border-border rounded-card p-6 space-y-5">
        {/* Company Name — read-only */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">
            Company Name
          </label>
          <div className="w-full h-10 px-3 flex items-center text-[13px] border border-border rounded-input bg-surface-secondary text-text-primary">
            {companyName}
          </div>
        </div>

        {/* Industry — read-only */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">
            Industry
          </label>
          <div className="w-full h-10 px-3 flex items-center text-[13px] border border-border rounded-input bg-surface-secondary text-text-primary">
            {industry}
          </div>
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">
            Company Logo{" "}
            <span className="text-text-tertiary font-normal">(optional)</span>
          </label>
          {logoFile ? (
            <div className="flex items-center justify-between bg-surface-page rounded-[6px] px-3 py-2">
              <span className="text-[12px] text-text-primary">{logoFile}</span>
              <button
                onClick={() => setLogoFile("")}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setLogoFile("company_logo.png")}
              className="border-2 border-dashed border-border rounded-input p-4 text-center cursor-pointer hover:border-border-hover hover:bg-surface-page/50 transition-all duration-150"
            >
              <Upload
                size={16}
                strokeWidth={1.5}
                className="mx-auto text-text-tertiary mb-1"
              />
              <p className="text-[12px] text-text-secondary">
                Click to upload PNG, JPG, or SVG
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle pt-5" />

        {/* User Name */}
        <div>
          <label className="block text-[13px] font-medium text-text-primary mb-1.5">
            Your Name <span className="text-status-error">*</span>
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="e.g., Ankit Purohit"
            className="w-full h-10 px-3 text-[13px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
          />
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={() =>
            onNext({
              companyName,
              industry,
              logoFile: logoFile || undefined,
              userName: userName.trim(),
            })
          }
          disabled={!canContinue}
          className="inline-flex items-center gap-2 h-10 px-6 bg-accent text-white text-[13px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40"
        >
          Continue <ArrowRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
