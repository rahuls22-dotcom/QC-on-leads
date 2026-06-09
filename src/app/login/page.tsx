"use client";

// Hard-coded login gate for the Revspot demo. Single account,
// credentials checked client-side, success persisted in localStorage.
// Not a security boundary — just keeps the public off the demo URL.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { isAuthed, signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A09]" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/spot";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already signed in, skip the form.
  useEffect(() => {
    if (isAuthed()) router.replace(nextPath);
  }, [router, nextPath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // Tiny artificial delay so the click feels weighty.
    setTimeout(() => {
      const ok = signIn(email, password);
      if (!ok) {
        setError("Invalid email or password.");
        setSubmitting(false);
        return;
      }
      router.replace(nextPath);
    }, 240);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "#0A0A09", color: "#F5F4EF" }}
    >
      {/* Soft gold glow underlay */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 30%, rgba(201, 168, 106, 0.10) 0%, transparent 70%)",
        }}
      />

      {/* Brand */}
      <div className="relative flex flex-col items-center mb-7">
        <div className="relative mb-3">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(201, 168, 106, 0.40) 0%, transparent 65%)",
              filter: "blur(14px)",
              transform: "scale(1.7)",
            }}
          />
          <SpotMark size={48} className="relative" />
        </div>
        <div
          className="text-[10.5px] uppercase tracking-wider font-semibold"
          style={{ color: "#8A8980" }}
        >
          Revspot · Agentic OS
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-[400px] rounded-card p-7"
        style={{
          background:
            "linear-gradient(135deg, #1A1A18 0%, #15140F 100%)",
          border: "1px solid #2A2A26",
          boxShadow:
            "0 24px 60px -16px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,106,0.06) inset",
        }}
      >
        <h1
          className="text-[20px] font-semibold tracking-tight leading-tight"
          style={{ color: "#F5F4EF" }}
        >
          Sign in to continue
        </h1>
        <p
          className="text-[12.5px] mt-1.5 leading-relaxed mb-5"
          style={{ color: "#A8A8A0" }}
        >
          This is a private demo · enter the credentials you were given.
        </p>

        <label className="block mb-3">
          <span
            className="block text-[10.5px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: "#8A8980" }}
          >
            Email
          </span>
          <input
            type="email"
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@revspot.ai"
            className="w-full h-9 px-3 rounded-input text-[13px] outline-none"
            style={{
              background: "#0F0F0E",
              border: "1px solid #2E2E2A",
              color: "#F5F4EF",
            }}
          />
        </label>

        <label className="block mb-2">
          <span
            className="block text-[10.5px] uppercase tracking-wider font-semibold mb-1.5"
            style={{ color: "#8A8980" }}
          >
            Password
          </span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 px-3 pr-9 rounded-input text-[13px] outline-none"
              style={{
                background: "#0F0F0E",
                border: "1px solid #2E2E2A",
                color: "#F5F4EF",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded hover:bg-white/5"
              style={{ color: "#8A8980" }}
              title={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? (
                <EyeOff size={13} strokeWidth={1.8} />
              ) : (
                <Eye size={13} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </label>

        {error && (
          <div
            className="text-[12px] rounded-input px-3 py-2 mb-3"
            style={{
              background: "#2A1010",
              border: "1px solid #4D1A1A",
              color: "#F87171",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="w-full inline-flex items-center justify-center gap-1.5 h-9 mt-3 rounded-button text-[12.5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#FAFAF8", color: "#0A0A09" }}
        >
          {submitting ? "Signing in…" : "Sign in"}
          {!submitting && <ArrowRight size={12} strokeWidth={2} />}
        </button>
      </form>

      <div
        className="relative mt-6 text-[11px] text-center"
        style={{ color: "#7A7970" }}
      >
        Trouble signing in? Ping the Revspot team.
      </div>
    </div>
  );
}
