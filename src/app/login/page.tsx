"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Mail, RotateCw } from "lucide-react";
import Image from "next/image";
import { SpotMark } from "@/components/spot/spot-mark";
import { OtpInput } from "@/components/auth/otp-input";
import { DEMO_OTP, maskEmail, orgsForEmail, type Org } from "@/lib/auth-mock";
import Ferrofluid from "./ferrofluid";
import PixelBlast from "./pixel-blast";
import GradientBlinds from "./gradient-blinds";

type BrandBg = "pixel" | "ferro" | "blinds";
const BRAND_BGS: BrandBg[] = ["pixel", "ferro", "blinds"];

const Logo = ({ className }: { className?: string }) => (
  <Image
    src="/revspot-logo.png"
    alt="Revspot.ai"
    width={754}
    height={168}
    priority
    className={className}
  />
);

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

  // Brand-panel background variant. Default is the new PixelBlast field;
  // ?bg=ferro brings back the ferrofluid for side-by-side comparison.
  const [bg, setBg] = useState<BrandBg>("pixel");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("bg");
    if (p && (BRAND_BGS as string[]).includes(p)) setBg(p as BrandBg);
  }, []);

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
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-2">
      {/* Left — dark brand panel. The launchpad's product truth: leads land
          enriched, called, and ready. Carries the only color in the layout
          (a single radial whisper). Hidden on small screens; a slim brand
          header on the form side covers mobile. */}
      <BrandPanel bg={bg} />

      {/* Right — light auth surface. */}
      <div className="relative flex min-h-screen flex-col bg-surface-page px-6 py-7 sm:px-10">
        <header className="flex items-center gap-2 lg:hidden">
          <SpotMark size={20} />
          <span className="text-[14px] font-semibold text-text-primary">Revspot</span>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[400px]">
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

        <footer className="flex items-center gap-3 text-[11px] text-text-tertiary">
          <a href="#" className="hover:text-text-secondary transition-colors">Privacy</a>
          <span className="text-border">·</span>
          <a href="#" className="hover:text-text-secondary transition-colors">Terms</a>
          <span className="text-border">·</span>
          <a href="#" className="hover:text-text-secondary transition-colors">Support</a>
        </footer>
      </div>
    </div>
  );
}

// ── Brand panel (dark) ──────────────────────────────────────────
// Side-by-side dark half, modeled on the Revspot poster: two-tone
// statement headline, muted sub, and a monochrome dotted halftone that
// glows up from the bottom-right corner. Grayscale only — no gradient
// text (the two-tone is two solid colors), no decorative color.
function BrandPanel({ bg }: { bg: BrandBg }) {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0A0A0A] p-12 xl:p-16 lg:flex">
      {bg === "pixel" ? (
        <PixelField />
      ) : bg === "blinds" ? (
        <BlindsField />
      ) : (
        // Liquid-chrome ferrofluid — reacts to the cursor (reactbits shader).
        <div className="absolute inset-0 z-0">
          <Ferrofluid
            colors={["#ffffff", "#d6d9df", "#6b7078"]}
            turbulence={0}
            scale={3}
            speed={0.3}
            rimWidth={0.22}
            sharpness={3.2}
            shimmer={1.25}
            glow={2.3}
            mouseStrength={1.5}
            mouseRadius={0.2}
          />
        </div>
      )}

      {/* Legibility veils — keep the type crisp over the metal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, transparent 22%, transparent 55%, rgba(10,10,10,0.78) 100%)",
        }}
      />

      <div className="pointer-events-none relative z-10">
        <Logo className="h-8 w-auto" />
      </div>

      <div className="pointer-events-none relative z-10 max-w-[34rem]">
        <h2 className="text-[46px] font-semibold leading-[1.0] tracking-[-0.035em] xl:text-[58px]">
          <span className="block text-white">Most leads look interested.</span>
          <span className="block text-white/40">Very few are ready.</span>
        </h2>
        <p className="mt-7 max-w-[30rem] text-[15px] leading-relaxed text-white/50 xl:text-[16px]">
          Verified data, behavioral signals, and profile intelligence, combined
          to surface the buyers who are actually ready to move.
        </p>
      </div>
    </aside>
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
    <div className="mb-7">
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

// ── PixelBlast field (constrained) ──────────────────────────────
// reactbits PixelBlast, used deliberately: a radial mask pins the pixel
// field to the upper-right quadrant and fades it out well before the
// bottom-left headline, so the type sits on clean black. edgeFade softens
// the panel borders; the color is a cool slate that reads as texture, not
// decoration. Cursor ripples keep it alive without pulling focus.
function PixelField() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0"
      style={{
        WebkitMaskImage:
          "radial-gradient(125% 95% at 82% 16%, #000 0%, #000 34%, rgba(0,0,0,0.35) 58%, transparent 74%)",
        maskImage:
          "radial-gradient(125% 95% at 82% 16%, #000 0%, #000 34%, rgba(0,0,0,0.35) 58%, transparent 74%)",
      }}
    >
      <PixelBlast
        variant="circle"
        pixelSize={5}
        color="#7c8696"
        patternScale={2.6}
        patternDensity={1.05}
        pixelSizeJitter={0.4}
        speed={0.42}
        edgeFade={0.35}
        enableRipples
        rippleSpeed={0.3}
        rippleThickness={0.1}
        rippleIntensityScale={1.4}
        liquid={false}
        transparent
      />
    </div>
  );
}

// ── GradientBlinds field (black) ────────────────────────────────
// reactbits GradientBlinds, kept black: the gradient runs through near-black
// slates so the blinds read as a faint corduroy of light, not color. A
// mouse spotlight lifts the texture where the cursor lands. Masked to the
// right half and floored by the bottom veil so the headline stays on black.
function BlindsField() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 30%, #000 60%, #000 100%)",
        maskImage:
          "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 30%, #000 60%, #000 100%)",
      }}
    >
      <GradientBlinds
        gradientColors={["#23272f", "#6b7280", "#2a2e37"]}
        angle={20}
        noise={0.18}
        blindCount={16}
        blindMinWidth={44}
        mouseDampening={0.15}
        spotlightRadius={0.6}
        spotlightSoftness={1.1}
        spotlightOpacity={0.55}
        distortAmount={12}
        mixBlendMode="screen"
      />
    </div>
  );
}
