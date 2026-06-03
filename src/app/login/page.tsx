"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Mail, RotateCw } from "lucide-react";
import { SpotMark } from "@/components/spot/spot-mark";
import { OtpInput } from "@/components/auth/otp-input";
import { DEMO_OTP, maskEmail, orgsForEmail, type Org } from "@/lib/auth-mock";

// Passwordless sign-in on a single surface. Email and code share one card —
// the code block is revealed inline once we "send" it (progressive
// disclosure), so the user never feels they jumped screens:
//
//   [ email (+ code, revealed) ]  →  (multiple orgs ? choose org : launchpad)
//
// Auth is mocked (see lib/auth-mock). Any valid email works; the code is a
// fixed demo value. A known multi-org email shows the org chooser; everything
// else resolves to a single org and lands straight in /dashboard.

const RESEND_SECONDS = 30;
const LAUNCHPAD = "/dashboard";

type Step = "auth" | "org";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("auth");
  const [codeSent, setCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!codeSent || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [codeSent, resendIn]);

  const emailValid = EMAIL_RE.test(email.trim());

  const sendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!emailValid || loading || codeSent) return;
    setLoading(true);
    setError("");
    setTimeout(() => {
      setOrgs(orgsForEmail(email));
      setOtp("");
      setResendIn(RESEND_SECONDS);
      setResent(false);
      setCodeSent(true);
      setLoading(false);
    }, 700);
  };

  const verify = (code?: string) => {
    const value = code ?? otp;
    if (value.length < 6 || loading) return;
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (value !== DEMO_OTP) {
        setError("That code isn't right. Check it and try again.");
        setOtp("");
        setLoading(false);
        return;
      }
      if (orgs.length > 1) {
        setStep("org");
        setLoading(false);
      } else {
        router.push(LAUNCHPAD);
      }
    }, 650);
  };

  const resend = () => {
    if (resendIn > 0) return;
    setResendIn(RESEND_SECONDS);
    setResent(true);
    setOtp("");
    setError("");
  };

  const changeEmail = () => {
    setCodeSent(false);
    setOtp("");
    setError("");
    setResent(false);
  };

  const chooseOrg = () => router.push(LAUNCHPAD);

  return (
    <div className="min-h-screen bg-surface-page relative overflow-hidden">
      <Mesh />

      <header className="absolute top-0 left-0 px-6 py-5 flex items-center gap-2 z-10">
        <SpotMark size={20} />
        <span className="text-[14px] font-semibold text-text-primary">Revspot</span>
      </header>

      <main className="relative flex items-center justify-center px-4 py-12 min-h-screen">
        <div className="w-full max-w-[440px] -translate-y-[6vh]">
          <AnimatePresence mode="wait">
            {step === "auth" ? (
              <StepShell key="auth">
                <AuthStep
                  email={email}
                  setEmail={setEmail}
                  emailValid={emailValid}
                  codeSent={codeSent}
                  otp={otp}
                  setOtp={setOtp}
                  loading={loading}
                  error={error}
                  resendIn={resendIn}
                  resent={resent}
                  onSendCode={sendCode}
                  onVerify={verify}
                  onResend={resend}
                  onChangeEmail={changeEmail}
                />
              </StepShell>
            ) : (
              <StepShell key="org">
                <OrgStep email={email} orgs={orgs} onChoose={chooseOrg} />
              </StepShell>
            )}
          </AnimatePresence>
        </div>
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

// ── Combined email + code step ──────────────────────────────────
function AuthStep({
  email,
  setEmail,
  emailValid,
  codeSent,
  otp,
  setOtp,
  loading,
  error,
  resendIn,
  resent,
  onSendCode,
  onVerify,
  onResend,
  onChangeEmail,
}: {
  email: string;
  setEmail: (v: string) => void;
  emailValid: boolean;
  codeSent: boolean;
  otp: string;
  setOtp: (v: string) => void;
  loading: boolean;
  error: string;
  resendIn: number;
  resent: boolean;
  onSendCode: (e?: React.FormEvent) => void;
  onVerify: (code?: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <>
      <Heading
        title="Sign in to Revspot"
        subtitle={
          codeSent ? (
            <>
              Enter the 6-digit code we sent to{" "}
              <span className="font-medium text-text-primary">{maskEmail(email)}</span>.
            </>
          ) : (
            "Enter your work email and we'll send you a sign-in code."
          )
        }
      />
      <Card>
        <form onSubmit={codeSent ? (e) => { e.preventDefault(); onVerify(); } : onSendCode} className="space-y-3.5">
          {/* Email — stays visible the whole time; locks once the code
              is sent, with a quiet "Change" affordance. */}
          <div>
            <label className="block text-[12px] font-medium text-text-primary mb-1.5">Work email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus={!codeSent}
              disabled={codeSent || loading}
              className="w-full h-11 px-3.5 text-[13.5px] border border-border rounded-input bg-white text-text-primary focus:outline-none focus:border-[#C8C8C8] focus:ring-2 focus:ring-black/[0.05] transition-all placeholder:text-text-tertiary disabled:bg-surface-secondary disabled:text-text-secondary"
            />
          </div>

          {/* Code block — revealed inline once sent. */}
          <AnimatePresence initial={false}>
            {codeSent && (
              <motion.div
                key="code"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  <label className="block text-[12px] font-medium text-text-primary mb-1.5">
                    Sign-in code
                  </label>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => onVerify(code)}
                    disabled={loading}
                    error={!!error}
                  />
                  {error ? (
                    <p className="text-[12px] text-[#DC2626] mt-2.5">{error}</p>
                  ) : resent ? (
                    <p className="inline-flex items-center gap-1.5 text-[12px] text-[#15803D] mt-2.5">
                      <Check size={13} strokeWidth={2} />
                      New code sent.
                    </p>
                  ) : (
                    <p className="text-[12px] text-text-tertiary mt-2.5">
                      Demo code: <span className="font-mono text-text-secondary">{DEMO_OTP}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary action — flips between Send code and Verify. */}
          <button
            type="submit"
            disabled={loading || (codeSent ? otp.length < 6 : !emailValid)}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-accent text-white text-[13.5px] font-medium rounded-button hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={15} strokeWidth={2} className="animate-spin" />
                {codeSent ? "Verifying…" : "Sending code…"}
              </>
            ) : (
              <>
                {codeSent ? "Verify" : "Send code"}
                <ArrowRight size={14} strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        {/* Secondary actions — both live in one centered row once the code
            is sent. Demo hint shows before sending. */}
        {codeSent ? (
          <div className="flex items-center justify-center gap-2 mt-4 text-[12px] text-text-tertiary">
            {resendIn > 0 ? (
              <span>
                Resend code in <span className="tabular-nums">0:{String(resendIn).padStart(2, "0")}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onResend}
                className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent-hover transition-colors"
              >
                <RotateCw size={12} strokeWidth={2} />
                Resend code
              </button>
            )}
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={onChangeEmail}
              className="font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Change email
            </button>
          </div>
        ) : (
          <DemoHint>
            Try <code className="font-mono text-text-secondary">chirag@revspot.in</code> for the multi-org chooser, or
            any other email to go straight in.
          </DemoHint>
        )}
      </Card>
    </>
  );
}

// ── Org chooser ─────────────────────────────────────────────────
function OrgStep({ email, orgs, onChoose }: { email: string; orgs: Org[]; onChoose: (org: Org) => void }) {
  return (
    <>
      <Heading
        title="Choose an organization"
        subtitle={
          <>
            <span className="font-medium text-text-primary">{email}</span> is part of multiple organizations.
          </>
        }
      />
      <Card>
        <div className="space-y-2 max-h-[420px] overflow-y-auto -mr-2 pr-2">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => onChoose(org)}
              className="group w-full flex items-center gap-3 px-3 py-2.5 border border-border rounded-card bg-white hover:border-border-strong hover:bg-surface-page transition-colors text-left"
            >
              <span
                className="flex items-center justify-center w-7 h-7 rounded-[6px] text-white text-[12px] font-semibold shrink-0"
                style={{ backgroundColor: org.color }}
              >
                {org.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0 truncate text-[13.5px] font-medium text-text-primary">
                {org.name}
              </span>
              <ArrowRight
                size={15}
                strokeWidth={2}
                className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              />
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

// ── Shared chrome ───────────────────────────────────────────────
function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-[26px] font-semibold text-text-primary leading-tight tracking-[-0.01em]">{title}</h1>
      <p className="text-[14px] text-text-secondary mt-1.5 leading-relaxed">{subtitle}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-card shadow-[0_1px_3px_rgba(15,23,42,0.04)] px-7 py-7">
      {children}
    </div>
  );
}

function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2 text-[11.5px] text-text-tertiary leading-relaxed">
      <Mail size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Mesh() {
  return (
    <div aria-hidden>
      <div
        className="pointer-events-none absolute -top-40 -left-40 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245, 194, 107, 0.30) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -top-32 -right-40 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251, 207, 232, 0.35) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167, 243, 208, 0.28) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-44 -right-32 w-[640px] h-[640px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(186, 230, 253, 0.32) 0%, transparent 65%)" }}
      />
    </div>
  );
}
