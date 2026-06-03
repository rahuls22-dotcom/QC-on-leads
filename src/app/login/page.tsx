"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";

// Pre-app sign-in surface. Mirrors the chrome of /get-started so the
// user never feels they've jumped tools mid-flow:
//
//   /login  →  /get-started  →  /welcome  →  /outreach
//
// The auth here is mocked — any non-empty email + password lands the
// user in /get-started. In a real build this would check whether the
// account has completed personalisation and route to /welcome (or
// straight to /dashboard) accordingly. We keep that routing intent
// visible in the code so it reads as the right shape, just stubbed.
//
// Visual language references: 11Labs, Linear and Vercel light-mode
// sign-in screens — a single centred card on a soft surface, bold
// product wordmark at the top-left, large input fields, dark primary
// CTA, neutral SSO underneath, footer links in the gutter.

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const canSubmit = email.trim() !== "" && password.length >= 4;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    // Mock auth — 600ms delay to feel like a real sign-in. Existing
    // users have an `onboarding_profile` in storage from a past
    // session; they go straight to /welcome (or could go to /outreach
    // in production). First-timers without a profile go to /signup
    // — the real sign-up entry — since /login is meant for return
    // visits, not first-time setup.
    setTimeout(() => {
      try {
        const hasProfile = !!sessionStorage.getItem("onboarding_profile");
        if (hasProfile) {
          router.push("/welcome");
          return;
        }
      } catch { /* ignore */ }
      router.push("/signup");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-surface-page relative overflow-hidden">
      {/* Multi-coloured pastel mesh — soft radial blobs in the four
          brand pastels sit in the corners of the viewport. Same
          treatment as /signup and /get-started so the whole pre-app
          journey shares one warm, playful surface. */}
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

      {/* Brand row — anchors the page top-left so the centred card
          isn't floating in nothing. Stays small. */}
      <header className="relative px-6 py-5 flex items-center gap-2">
        <SpotMark size={20} />
        <span className="text-[14px] font-semibold text-text-primary">Revspot</span>
      </header>

      <main className="relative flex items-center justify-center px-4 pb-12" style={{ minHeight: "calc(100vh - 96px)" }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* Headline pair — big, neutral, conversational. The
              subtitle is one short sentence the user can read in a
              breath; no marketing copy. */}
          <div className="mb-7 text-center">
            <h1 className="text-[28px] font-semibold text-text-primary leading-tight tracking-[-0.01em]">
              Welcome back
            </h1>
            <p className="text-[14px] text-text-secondary mt-1.5">
              Sign in to your Revspot workspace.
            </p>
          </div>

          {/* Card — white surface, generous padding. Visual weight
              comes from the form fields, not from card chrome. */}
          <div className="bg-white border border-border rounded-card shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-7 py-7">
            {/* SSO row — mock buttons but they sell the moment. Sit
                above the email form because users with an SSO account
                expect to see those options first. */}
            <div className="space-y-2">
              <SsoButton provider="Google" />
              <SsoButton provider="Microsoft" />
            </div>

            {/* "or" divider — hairline + label, centred. Same chrome
                that the existing campaign-create flow uses. */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full h-px bg-border-subtle" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11.5px] text-text-tertiary uppercase tracking-[0.5px]">
                  or with email
                </span>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-11 px-3.5 text-[13.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-tertiary"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-medium text-text-primary">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[11.5px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
              </div>

              {error && (
                <div className="text-[12px] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-input px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full h-11 inline-flex items-center justify-center gap-2 bg-accent text-white text-[13.5px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={14} strokeWidth={2} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer link — quiet, sits in the gutter below the card.
              "Create an account" routes to /signup, which is the real
              first-stop for new users (email + password + name → then
              the personalisation wizard at /get-started). */}
          <div className="mt-5 text-center text-[12.5px] text-text-secondary">
            New to Revspot?{" "}
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="font-medium text-text-primary hover:underline"
            >
              Create an account
            </button>
          </div>
        </motion.div>
      </main>

      {/* Page-bottom gutter — Privacy / Terms / Support. Three quiet
          text links, no border, anchored bottom-right. */}
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

// Outlined SSO button. Provider name + a tiny coloured wordmark dot so
// it reads as a real button (Google blue / Microsoft red) without us
// having to import provider SVGs into the prototype.
function SsoButton({ provider }: { provider: "Google" | "Microsoft" }) {
  const dot = provider === "Google" ? "#4285F4" : "#F25022";
  return (
    <button
      type="button"
      onClick={(e) => {
        // Mock SSO — same destination as email submit.
        e.preventDefault();
        const router = (window as unknown as { next?: { router?: { push: (p: string) => void } } }).next?.router;
        if (router) router.push("/get-started");
        else window.location.assign("/get-started");
      }}
      className="w-full h-11 inline-flex items-center justify-center gap-2.5 border border-border bg-white text-[13px] font-medium text-text-primary rounded-button hover:bg-surface-page transition-colors"
    >
      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
      Continue with {provider}
    </button>
  );
}
