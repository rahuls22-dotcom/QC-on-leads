"use client";

/**
 * Settings → Profile
 *
 * Personal account fields for the signed-in user — name, email, role,
 * phone, password change. Sits separately from "Agency" and
 * "Workspace" because those are *team-level* settings (everyone in the
 * agency sees the same Agency settings), while Profile is "my stuff."
 *
 * For the prototype this saves to component state and shows a "Saved"
 * confirmation — there's no backend yet. The Logout action lives on
 * the settings nav itself (see SettingsLayout) so it's reachable from
 * any settings page.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Check, UserCircle2, Lock, KeyRound } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

export default function ProfileSettingsPage() {
  // Demo defaults — match the user displayed in the sidebar footer so
  // the form reads as "this is you" rather than a generic placeholder.
  const [name,  setName]  = useState("Priya Mehra");
  const [email, setEmail] = useState("priya.mehra@godrejproperties.com");
  const [role,  setRole]  = useState("Marketing Lead");
  const [phone, setPhone] = useState("+91 98765 43210");

  // Password change form — kept blank by default. Submitting clears
  // the fields, mirroring how a real settings page would behave once
  // the request was acknowledged.
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew,     setPwdNew]     = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");

  const [savedProfile, setSavedProfile]  = useState(false);
  const [savedPwd,     setSavedPwd]      = useState(false);
  const [pwdError,     setPwdError]      = useState<string | null>(null);

  const saveProfile = () => {
    // Prototype: no server, no validation beyond required fields.
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  const savePassword = () => {
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdError("Fill all three password fields.");
      return;
    }
    if (pwdNew.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("New password and confirmation don't match.");
      return;
    }
    setPwdError(null);
    setSavedPwd(true);
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
    setTimeout(() => setSavedPwd(false), 2000);
  };

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-[680px]">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-[16px] font-semibold text-text-primary">Profile</h2>
        <p className="text-[12.5px] text-text-secondary mt-0.5">
          Your personal account details. Only you can see or edit this.
        </p>
      </div>

      {/* Personal info card */}
      <div className="bg-white border border-border rounded-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <UserCircle2 size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">Personal info</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
          Used across emails, notifications, and login.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name" value={name} onChange={setName} />
          <Field label="Work email" value={email} onChange={setEmail} type="email" />
          <Field label="Role" value={role} onChange={setRole} />
          <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={saveProfile}
            className="h-9 px-4 inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
          >
            {savedProfile ? (
              <>
                <Check size={13} strokeWidth={2} />
                Saved
              </>
            ) : (
              "Save changes"
            )}
          </button>
          {savedProfile && (
            <span className="text-[11.5px] text-[#15803D]">
              Your details have been updated.
            </span>
          )}
        </div>
      </div>

      {/* Password change card */}
      <div className="bg-white border border-border rounded-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={15} strokeWidth={1.75} className="text-text-secondary" />
          <h3 className="text-card-title text-text-primary">Password</h3>
        </div>
        <p className="text-[12.5px] text-text-secondary mb-4 leading-relaxed">
          Change the password you use to sign in.
        </p>

        <div className="space-y-3.5 max-w-[420px]">
          <Field
            label="Current password"
            value={pwdCurrent}
            onChange={setPwdCurrent}
            type="password"
            placeholder="••••••••"
          />
          <Field
            label="New password"
            value={pwdNew}
            onChange={setPwdNew}
            type="password"
            placeholder="At least 8 characters"
          />
          <Field
            label="Confirm new password"
            value={pwdConfirm}
            onChange={setPwdConfirm}
            type="password"
            placeholder="Repeat the new password"
          />
          {pwdError && (
            <p className="text-[11.5px] text-[#DC2626]">{pwdError}</p>
          )}
          {savedPwd && (
            <p className="text-[11.5px] text-[#15803D] inline-flex items-center gap-1">
              <Check size={11} strokeWidth={2.5} />
              Password updated.
            </p>
          )}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={savePassword}
            className="h-9 px-4 inline-flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-button hover:bg-accent-hover transition-colors duration-150"
          >
            <KeyRound size={13} strokeWidth={1.75} />
            Update password
          </button>
        </div>
      </div>

      {/* Logout note — the button lives in the sidebar (see
          SettingsLayout). Surface a tiny hint here so the user knows
          where to look. */}
      <p className="text-[11.5px] text-text-tertiary text-center mt-2">
        Use the <span className="text-text-secondary">Log out</span> button in the settings nav to sign out.
      </p>
    </motion.div>
  );
}

// ── Field ────────────────────────────────────────────────────────────
// Local field component — labelled input matching the rest of the
// settings styling (uppercase tertiary label, h-9 input). Kept inline
// because there's no shared form-field primitive in the codebase yet
// and pulling one out here would be over-engineering for two cards.
function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel" | "password";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-[0.5px] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-[12.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent transition-colors duration-150 placeholder:text-text-tertiary"
      />
    </div>
  );
}
