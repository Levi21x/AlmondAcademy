"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return message;
    }
  }
  return "Unable to create account";
}

export default function SignupPage() {
  const router = useRouter();
  const { bootstrapSession } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptedTerms?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checks = useMemo(
    () => [
      { label: "8+ chars", ok: password.length >= 8 },
      { label: "Uppercase", ok: /[A-Z]/.test(password) },
      { label: "Number", ok: /[0-9]/.test(password) },
    ],
    [password],
  );

  const passwordStrength = checks.filter((c) => c.ok).length;
  const strengthLabel = passwordStrength === 0 ? "" : passwordStrength === 1 ? "Weak" : passwordStrength === 2 ? "Fair" : "Strong";
  const strengthColor = passwordStrength === 1 ? "#e4b4a0" : passwordStrength === 2 ? "#e6c87a" : "#69db8b";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const nextFieldErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      acceptedTerms?: string;
    } = {};

    if (!fullName.trim()) {
      nextFieldErrors.fullName = "Full name is required";
    }
    if (!email.trim()) {
      nextFieldErrors.email = "Email is required";
    }
    if (!password) {
      nextFieldErrors.password = "Password is required";
    } else {
      if (password.length < 8) {
        nextFieldErrors.password = "At least 8 characters";
      } else if (!/[A-Z]/.test(password)) {
        nextFieldErrors.password = "At least one uppercase letter";
      } else if (!/[0-9]/.test(password)) {
        nextFieldErrors.password = "At least one number";
      }
    }
    if (!confirmPassword) {
      nextFieldErrors.confirmPassword = "Confirm password is required";
    } else if (confirmPassword !== password) {
      nextFieldErrors.confirmPassword = "Passwords do not match";
    }
    if (!acceptedTerms) {
      nextFieldErrors.acceptedTerms = "You must accept Terms and Privacy Policy";
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const supabaseClient = getSupabaseClient();

      const { error: signUpError } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) {
        throw new Error(signUpError.message);
      }

      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        throw new Error(signInError.message);
      }

      await bootstrapSession();
      router.push("/onboarding");
    } catch (error: unknown) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100svh", background: "#131313", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "24px 16px" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: "radial-gradient(ellipse,rgba(213,197,168,0.045) 0%,transparent 65%)", pointerEvents: "none" }} />

      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(213,197,168,0.09) 1px,transparent 1px)", backgroundSize: "28px 28px", opacity: 0.5, pointerEvents: "none" }} />

      {/* Ambient blobs */}
      <div style={{ position: "absolute", top: "8%", right: "6%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(213,197,168,0.04) 0%,transparent 70%)", pointerEvents: "none", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(228,180,160,0.04) 0%,transparent 70%)", pointerEvents: "none", filter: "blur(32px)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 460, animation: "aaFadeUp 0.45s ease-out both" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,rgba(213,197,168,0.18),rgba(213,197,168,0.07))", border: "1px solid rgba(213,197,168,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 20px rgba(213,197,168,0.2)" }}>
              🌰
            </div>
            <span style={{ fontFamily: "var(--aa-fd)", fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.025em" }}>
              <span style={{ color: "var(--aa-text-1)" }}>Almond</span><span style={{ color: "var(--aa-amber)" }}>AI</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.55)", borderRadius: 24, padding: "36px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(213,197,168,0.06)" }}>
          <div style={{ marginBottom: 26 }}>
            <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.9rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.028em", lineHeight: 1.15, marginBottom: 6 }}>
              Create your account
            </h1>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)", lineHeight: 1.55 }}>
              Join thousands of medical students on AlmondAI
            </p>
          </div>

          {formError && (
            <div style={{ marginBottom: 18 }}>
              <Toast message={formError} variant="error" />
            </div>
          )}

          <form className="aa-stagger" style={{ display: "flex", flexDirection: "column", gap: 14 }} onSubmit={onSubmit} noValidate>
            <Input
              label="Full name"
              placeholder="Dr. Aditi Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={fieldErrors.fullName}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
            />

            {/* Password strength meter */}
            {password.length > 0 && (
              <div style={{ marginTop: -6, padding: "2px 0" }}>
                <div style={{ height: 3, borderRadius: 2, background: "rgba(76,70,61,0.3)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(passwordStrength / 3) * 100}%`, background: strengthColor, borderRadius: 2, transition: "width 0.3s ease, background 0.3s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    {checks.map((c) => (
                      <span key={c.label} style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: c.ok ? strengthColor : "var(--aa-text-3)", transition: "color 0.2s" }}>
                        {c.ok ? "✓" : "·"} {c.label}
                      </span>
                    ))}
                  </div>
                  {passwordStrength > 0 && (
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                  )}
                </div>
              </div>
            )}

            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword}
            />

            {/* Terms checkbox */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none" }}>
                <div style={{ position: "relative", width: 18, height: 18, flexShrink: 0, marginTop: 1 }}>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
                  />
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${acceptedTerms ? "var(--aa-amber)" : "rgba(76,70,61,0.7)"}`, background: acceptedTerms ? "rgba(213,197,168,0.12)" : "var(--aa-input)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", pointerEvents: "none" }}>
                    {acceptedTerms && <span style={{ fontSize: 11, color: "var(--aa-amber)", fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.85rem", color: "var(--aa-text-2)", lineHeight: 1.45 }}>
                  I agree to the{" "}
                  <span style={{ color: "var(--aa-amber)" }}>Terms of Service</span>
                  {" "}and{" "}
                  <span style={{ color: "var(--aa-amber)" }}>Privacy Policy</span>
                </span>
              </label>
              {fieldErrors.acceptedTerms && (
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-coral)", marginTop: 5, marginLeft: 28 }}>{fieldErrors.acceptedTerms}</p>
              )}
            </div>

            <div style={{ marginTop: 4 }}>
              <Button type="submit" fullWidth isLoading={isSubmitting}>
                Create my account
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--aa-border)" }} />
            <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)", letterSpacing: "0.04em" }}>Already have an account?</span>
            <div style={{ flex: 1, height: 1, background: "var(--aa-border)" }} />
          </div>

          <Link
            href="/login"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "12px 0", borderRadius: 100, border: "1px solid rgba(76,70,61,0.6)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-2)", textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.35)"; e.currentTarget.style.color = "var(--aa-amber)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.6)"; e.currentTarget.style.color = "var(--aa-text-2)"; }}
          >
            Sign in instead →
          </Link>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "rgba(183,173,160,0.45)" }}>
          Built for Indian medical students 🌰
        </p>
      </div>
    </main>
  );
}
