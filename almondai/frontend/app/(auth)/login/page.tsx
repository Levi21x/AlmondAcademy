"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toast } from "@/components/ui/Toast";
import { getProfile } from "@/lib/api/auth.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return "Unable to sign in";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionExpiredReason = useMemo(() => searchParams.get("reason") === "session_expired", [searchParams]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.trim()) nextFieldErrors.email = "Email is required";
    if (!password) nextFieldErrors.password = "Password is required";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      const profile = await getProfile();
      if (!profile || !profile.onboarding_completed) {
        router.push("/onboarding");
        return;
      }
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = formatError(error);
      const lowered = message.toLowerCase();

      if (message.includes("PROFILE_NOT_FOUND") || lowered.includes("not found")) {
        router.push("/onboarding");
        return;
      }

      if (lowered.includes("email not confirmed") || lowered.includes("email_not_confirmed")) {
        try {
          const supabaseClient = getSupabaseClient();
          await supabaseClient.auth.resend({ type: "signup", email: email.trim() });
        } catch {
          // noop
        }
        setFormError("We've sent a confirmation email. Please check your inbox then try logging in again.");
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100svh", background: "#131313", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", padding: "24px 16px" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse,rgba(213,197,168,0.055) 0%,transparent 65%)", pointerEvents: "none" }} />

      {/* Dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(213,197,168,0.09) 1px,transparent 1px)", backgroundSize: "28px 28px", opacity: 0.5, pointerEvents: "none" }} />

      {/* Ambient blobs */}
      <div style={{ position: "absolute", top: "10%", left: "5%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle,rgba(213,197,168,0.04) 0%,transparent 70%)", pointerEvents: "none", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "8%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(228,180,160,0.04) 0%,transparent 70%)", pointerEvents: "none", filter: "blur(32px)" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, animation: "aaFadeUp 0.45s ease-out both" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
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
          {/* Card header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.9rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.028em", lineHeight: 1.15, marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)", lineHeight: 1.55 }}>
              Continue your NEET-PG preparation
            </p>
          </div>

          {sessionExpiredReason && (
            <div style={{ marginBottom: 20 }}>
              <Toast variant="info" message="Your session expired. Please log in again — your answers have been saved." />
            </div>
          )}
          {formError && (
            <div style={{ marginBottom: 20 }}>
              <Toast message={formError} variant="error" />
            </div>
          )}

          <form className="aa-stagger" style={{ display: "flex", flexDirection: "column", gap: 16 }} onSubmit={onSubmit} noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
            />

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", fontWeight: 600, color: "var(--aa-text-2)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Password</label>
                <Link href="/reset-password" style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-3)", textDecoration: "none", transition: "color 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--aa-amber)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--aa-text-3)" }}>
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
              <div style={{ position: "relative", width: 18, height: 18, flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
                />
                <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${rememberMe ? "var(--aa-amber)" : "rgba(76,70,61,0.7)"}`, background: rememberMe ? "rgba(213,197,168,0.12)" : "var(--aa-input)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", pointerEvents: "none" }}>
                  {rememberMe && <span style={{ fontSize: 11, color: "var(--aa-amber)", fontWeight: 700 }}>✓</span>}
                </div>
              </div>
              <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)" }}>Remember me</span>
            </label>

            <div style={{ marginTop: 4 }}>
              <Button type="submit" fullWidth isLoading={isSubmitting}>
                Sign in
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--aa-border)" }} />
            <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)", letterSpacing: "0.04em" }}>New to AlmondAI?</span>
            <div style={{ flex: 1, height: 1, background: "var(--aa-border)" }} />
          </div>

          <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "12px 0", borderRadius: 100, border: "1px solid rgba(76,70,61,0.6)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-2)", textDecoration: "none", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.35)"; e.currentTarget.style.color = "var(--aa-amber)" }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(76,70,61,0.6)"; e.currentTarget.style.color = "var(--aa-text-2)" }}>
            Create free account →
          </Link>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "rgba(183,173,160,0.45)" }}>
          Built for Indian medical students 🌰
        </p>
      </div>
    </main>
  );
}
