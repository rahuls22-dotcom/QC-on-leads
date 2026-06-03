"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";

// Sign-up — the primary entry point for new users. The flow mirrors
// what Notion / Linear / 11Labs do on their first screen:
//
//   /signup  →  name + email + password (or SSO)
//      ↓
//   /get-started  →  workspace + role + use case + first project
//      ↓
//   /welcome  →  guided "create agent, then launch outreach" plan
//      ↓
//   /outreach (the workspace)
//
// What we capture at this step is the minimum required to *create
// the account itself*: who they are (name, email) and how to log
// them back in (password). Everything else — company, role, use
// case, first project — lives in the personalisation wizard on the
// next screen, so the sign-up form stays short and the user gets a
// quick win before they have to think about their workspace shape.
//
// Real auth is mocked; we stash the credentials in sessionStorage
// so the next screen can pre-fill "Hi, {fullName}" without forcing
// the user to retype it.

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [loading, setLoading]   = useState(false);

  // Password strength meter — three buckets, drives the bar colour
  // and the label below. Cheap rule-based scoring (length + class
  // mix) rather than zxcvbn so we don't add a dependency.
  const strength = useMemo(() => {
    if (password.length === 0) return { score: 0, label: "", colour: "" };
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
    if (password.length >= 12) s++;
    if (s <= 1) return { score: 1, label: "Weak",   colour: "#DC2626" };
    if (s <= 2) return { score: 2, label: "OK",     colour: "#D97706" };
    if (s <= 3) return { score: 3, label: "Strong", colour: "#15803D" };
    return        { score: 4, label: "Excellent", colour: "#15803D" };
  }, [password]);

  const canSubmit = fullName.trim() !== "" && /\S+@\S+\.\S+/.test(email) && password.length >= 8 && accepted;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    // Mock account creation — 700ms delay so the button state lands
    // realistically. Stash the captured identity so the personalisation
    // wizard can use the name in its greeting and skip re-asking.
    setTimeout(() => {
      try {
        sessionStorage.setItem("user_credentials", JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          createdAt: new Date().toISOString(),
        }));
      } catch { /* ignore */ }
      router.push("/get-started");
    }, 700);
  };

  return (
    <div className="min-h-screen bg-surface-page relative overflow-hidden">
      {/* Multi-coloured pastel mesh — soft radial blobs in the four
          step colours sit in the corners of the viewport. Same
          treatment as the onboarding wizard so the whole pre-app
          journey reads as one warm, playful surface. */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245, 194, 107, 0.30) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 -right-40 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251, 207, 232, 0.35) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167, 243, 208, 0.28) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-44 -right-32 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(186, 230, 253, 0.32) 0%, transparent 65%)" }}
        aria-hidden
      />

      <header className="relative px-6 py-5 flex items-center gap-2">
        <SpotMark size={20} />
        <span className="text-[14px] font-semibold text-text-primary">Revspot</span>
      </header>

      <main className="relative flex items-center justify-center px-4 pb-12" style={{ minHeight: "calc(100vh - 96px)" }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-[440px]"
        >
          <div className="mb-7 text-center">
            <h1 className="text-[28px] font-semibold text-text-primary leading-tight tracking-[-0.01em]">
              Create your account
            </h1>
            <p className="text-[14px] text-text-secondary mt-1.5">
              Set up voice agents and launch outreaches in minutes.
            </p>
          </div>

          <div className="bg-white border border-border rounded-card shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-7 py-7">
            {/* SSO row — quickest path for users with corporate IdPs.
                Sits above email so the "fast lane" is the first thing
                offered, the way Notion / Linear arrange it. */}
            <div className="space-y-2">
              <SsoButton provider="Google" onClick={() => router.push("/get-started")} />
              <SsoButton provider="Microsoft" onClick={() => router.push("/get-started")} />
            </div>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full h-px bg-border-subtle" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11.5px] text-text-tertiary uppercase tracking-[0.5px]">
                  or sign up with email
                </span>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Priya Mehra"
                  className="w-full h-11 px-3.5 text-[13.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-tertiary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="priya@company.com"
                  className="w-full h-11 px-3.5 text-[13.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-tertiary"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-11 pl-3.5 pr-10 text-[13.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-tertiary tracking-[0.05em]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                  </button>
                </div>

                {/* Strength meter — four ticks that fill as the user
                    types. Label sits to the right. Reads as a useful
                    hint, not a scolding. */}
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1">
                      {[1, 2, 3, 4].map((tick) => (
                        <div
                          key={tick}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: tick <= strength.score
                              ? strength.colour
                              : "var(--tw-border-color, #E4E4E7)",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-[11px] font-medium tabular-nums"
                      style={{ color: strength.colour }}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* T&C — opt-out style (default checked) so users don't
                  have to think about it. They can always uncheck. */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="w-3.5 h-3.5 mt-[3px] rounded border-border text-accent focus:ring-accent/20 cursor-pointer"
                />
                <span className="text-[11.5px] text-text-secondary leading-relaxed">
                  I agree to the <a href="#" className="text-text-primary hover:underline">Terms</a> and{" "}
                  <a href="#" className="text-text-primary hover:underline">Privacy Policy</a>.
                </span>
              </label>

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full h-11 inline-flex items-center justify-center gap-2 bg-accent text-white text-[13.5px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <>
                    Create account
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-5 text-center text-[12.5px] text-text-secondary">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-medium text-text-primary hover:underline"
            >
              Sign in
            </button>
          </div>

          {/* Reassurance footer — what users get on a free start. Same
              role as Notion's "No credit card required" line. */}
          <div className="mt-7 flex items-center justify-center gap-4 text-[11px] text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} strokeWidth={2} className="text-[#15803D]" />
              Free 14-day trial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} strokeWidth={2} className="text-[#15803D]" />
              No card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={12} strokeWidth={2} className="text-[#15803D]" />
              Cancel anytime
            </span>
          </div>
        </motion.div>
      </main>

      <footer className="absolute bottom-4 right-6 flex items-center gap-3 text-[11px] text-text-tertiary">
        <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
        <span className="text-border">·</span>
        <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
        <span className="text-border">·</span>
        <a href="#" className="hover:text-text-secondary transition-colors">Support</a>
      </footer>
    </div>
  );
}

function SsoButton({
  provider,
  onClick,
}: {
  provider: "Google" | "Microsoft";
  onClick: () => void;
}) {
  const dot = provider === "Google" ? "#4285F4" : "#F25022";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-11 inline-flex items-center justify-center gap-2.5 border border-border bg-white text-[13px] font-medium text-text-primary rounded-button hover:bg-surface-page transition-colors"
    >
      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
      Sign up with {provider}
    </button>
  );
}
