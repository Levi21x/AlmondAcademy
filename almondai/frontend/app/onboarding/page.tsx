"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Toast } from "@/components/ui/Toast";
import { createProfile, updateProfile } from "@/lib/api/auth.api";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSupabaseClient } from "@/lib/supabase/client";
import { categoryMeta } from "@/lib/utils/helpers";

type QuestionKey = "q1" | "q2" | "q3" | "q4" | "q5";

interface Answers {
  q1: string;
  q2: string[];
  q3: string[];
  q4: string;
  q5: string[];
}

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  key: QuestionKey;
  title: string;
  multiSelect: boolean;
  options: QuestionOption[];
  icon: string;
  hint?: string;
}

const questions: Question[] = [
  {
    key: "q1",
    title: "Where are you in your journey?",
    multiSelect: false,
    icon: "🎓",
    hint: "This helps us calibrate your study level",
    options: [
      { value: "1st or 2nd Year MBBS", label: "1st or 2nd Year MBBS" },
      { value: "3rd Year or Final Year MBBS", label: "3rd Year or Final Year MBBS" },
      { value: "Internship / Full-time NEET-PG prep", label: "Internship / Full-time NEET-PG prep" },
    ],
  },
  {
    key: "q2",
    title: "Be honest — how do you usually study?",
    multiSelect: true,
    icon: "📚",
    hint: "Select all that apply",
    options: [
      { value: "I study consistently throughout the year", label: "I study consistently throughout the year" },
      { value: "I study hard a few weeks before exams", label: "I study hard a few weeks before exams" },
      { value: "I start only when the exam is very close", label: "I start only when the exam is very close" },
      { value: "I try but anxiety slows me down constantly", label: "I try but anxiety slows me down constantly" },
      { value: "Honestly I don't have a system at all", label: "Honestly I don't have a system at all" },
    ],
  },
  {
    key: "q3",
    title: "What's your biggest challenge right now?",
    multiSelect: true,
    icon: "🎯",
    hint: "Be honest — AlmondAI will adapt to help you",
    options: [
      { value: "I don't understand concepts — I just memorise and forget", label: "I don't understand concepts — I just memorise and forget" },
      { value: "I don't know what to study and what to skip", label: "I don't know what to study and what to skip" },
      { value: "I know the content but I panic during exams", label: "I know the content but I panic during exams" },
      { value: "I can't stay consistent — I start and stop", label: "I can't stay consistent — I start and stop" },
      { value: "I'm preparing for NEET-PG and don't know if I'm on track", label: "I'm preparing for NEET-PG and don't know if I'm on track" },
    ],
  },
  {
    key: "q4",
    title: "How far is your next major exam?",
    multiSelect: false,
    icon: "⏱️",
    hint: "We'll adjust urgency and focus accordingly",
    options: [
      { value: "More than 3 months away", label: "More than 3 months away" },
      { value: "1 to 3 months away", label: "1 to 3 months away" },
      { value: "Less than 1 month away", label: "Less than 1 month away" },
      { value: "Less than 1 week — I need help right now", label: "Less than 1 week — I need help right now" },
    ],
  },
  {
    key: "q5",
    title: "How do you learn best?",
    multiSelect: true,
    icon: "💡",
    hint: "AlmondAI will match your preferred style",
    options: [
      { value: "Short and direct — just tell me what I need to know", label: "Short and direct — just tell me what I need to know" },
      { value: "Detailed with reasoning — I want to understand why", label: "Detailed with reasoning — I want to understand why" },
      { value: "Visual — diagrams, flowcharts, comparisons", label: "Visual — diagrams, flowcharts, comparisons" },
      { value: "Conversational — explain it like talking to a friend", label: "Conversational — explain it like talking to a friend" },
    ],
  },
];

const ONBOARDING_STORAGE_KEY = "almondai_onboarding_answers";

function resolveCategory(answers: Answers): keyof typeof categoryMeta {
  if (
    answers.q1 === "Internship / Full-time NEET-PG prep" &&
    answers.q3.includes("I'm preparing for NEET-PG and don't know if I'm on track")
  ) {
    return "strategic_climber";
  }

  if (answers.q2.includes("I start only when the exam is very close") && answers.q4 === "Less than 1 week — I need help right now") {
    return "survivor";
  }

  if (answers.q2.includes("I try but anxiety slows me down constantly")) return "anxious_grinder";

  if (answers.q2.includes("Honestly I don't have a system at all")) return "lost";

  if (
    answers.q2.includes("I study consistently throughout the year") &&
    answers.q3.includes("I don't understand concepts — I just memorise and forget")
  ) {
    return "passionate";
  }

  if (answers.q2.includes("I study hard a few weeks before exams")) return "sprinter";

  return "sprinter";
}

function resolveMode(value: string): "mbbs" | "neet_pg" | "both" {
  if (value === "Internship / Full-time NEET-PG prep") return "neet_pg";
  if (value === "3rd Year or Final Year MBBS") return "both";
  return "mbbs";
}

function resolveStyle(values: string[]): "concise" | "detailed" | "visual" | "conversational" {
  const value = values[0] ?? "";
  if (value === "Short and direct — just tell me what I need to know") return "concise";
  if (value === "Detailed with reasoning — I want to understand why") return "detailed";
  if (value === "Visual — diagrams, flowcharts, comparisons") return "visual";
  return "conversational";
}

export default function OnboardingPage() {
  const router = useRouter();
  const { bootstrapSession } = useAuth();
  const [answers, setAnswers] = useState<Answers>({
    q1: "",
    q2: [],
    q3: [],
    q4: "",
    q5: [],
  });
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [optionHover, setOptionHover] = useState<string | null>(null);

  useEffect(() => {
    const savedAnswers = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (savedAnswers) {
      try {
        const parsed = JSON.parse(savedAnswers) as { answers?: Answers; step?: number };
        if (parsed.answers) {
          setAnswers(parsed.answers);
        }
        if (parsed.step && parsed.step >= 1 && parsed.step <= 5) {
          setStep(parsed.step);
        }
      } catch {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    }

    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({
        answers,
        step: Math.min(step, 5),
      }),
    );
  }, [answers, step]);

  const currentQuestion = questions[step - 1];
  const currentAnswer = answers[currentQuestion?.key];
  const canContinue = currentQuestion?.multiSelect
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : typeof currentAnswer === "string" && currentAnswer.length > 0;
  const progress = Math.min((Math.min(step, 5) / 5) * 100, 100);
  const complete = step > 5;

  const resolved = useMemo(() => {
    if (!complete) return null;
    const category = resolveCategory(answers);
    const mode = resolveMode(answers.q1);
    const style = resolveStyle(answers.q5);
    return { category, mode, style };
  }, [answers, complete]);

  const toggleOption = (key: QuestionKey, value: string, multiSelect: boolean) => {
    setAnswers((state) => {
      if (multiSelect) {
        const selected = state[key];
        if (!Array.isArray(selected)) {
          return state;
        }

        const nextValues = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];

        return { ...state, [key]: nextValues };
      }

      return { ...state, [key]: value };
    });
  };

  const persistProfile = async () => {
    if (!resolved) {
      setError("Session expired. Please login again.");
      return;
    }

    localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ answers, step: 5 }),
    );

    setSaving(true);
    setError("");
    const joinedQ2 = answers.q2.join(", ");
    const joinedQ3 = answers.q3.join(", ");
    const joinedQ5 = answers.q5.join(", ");

    const supabaseClient = getSupabaseClient();
    const { data: { session } } = await supabaseClient.auth.getSession();

    let activeToken = session?.access_token ?? "";
    if (!activeToken) {
      const { data: refreshData } = await supabaseClient.auth.refreshSession();
      if (!refreshData.session?.access_token) {
        setSaving(false);
        setError("Unable to validate your session. Please log in again.");
        return;
      }
      activeToken = refreshData.session.access_token;
    }

    if (!activeToken) {
      setSaving(false);
      router.replace("/login?reason=session_expired");
      return;
    }

    let saveSucceeded = false;

    try {
      await createProfile(activeToken, {
        full_name: "AlmondAI Student",
        college_name: joinedQ2,
        university_name: `${joinedQ3} | ${joinedQ5}`,
        current_year: null,
        mode: resolved.mode,
        student_category: resolved.category,
        teaching_style: resolved.style,
        onboarding_completed: true,
      });
      saveSucceeded = true;
    } catch {
      try {
        await updateProfile(activeToken, {
          college_name: joinedQ2,
          university_name: `${joinedQ3} | ${joinedQ5}`,
          mode: resolved.mode,
          student_category: resolved.category,
          teaching_style: resolved.style,
          onboarding_completed: true,
        });
        saveSucceeded = true;
      } catch {
        setSaving(false);
        setError("Unable to save your onboarding profile. Please try again.");
        return;
      }
    } finally {
      setSaving(false);
      if (saveSucceeded) {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        router.push("/dashboard");
      }
    }
  };

  return (
    <main style={{ minHeight: "100svh", background: "#0d0d0d", position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: "radial-gradient(ellipse,rgba(213,197,168,0.03) 0%,transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(213,197,168,0.07) 1px,transparent 1px)", backgroundSize: "28px 28px", opacity: 0.4, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "10%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(228,180,160,0.03) 0%,transparent 70%)", pointerEvents: "none", filter: "blur(50px)" }} />

      {/* Top nav */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid rgba(76,70,61,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,rgba(213,197,168,0.18),rgba(213,197,168,0.07))", border: "1px solid rgba(213,197,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            🌰
          </div>
          <span style={{ fontFamily: "var(--aa-fd)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--aa-text-1)" }}>Almond</span><span style={{ color: "var(--aa-amber)" }}>AI</span>
          </span>
        </div>

        {/* Step pills */}
        {!complete && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                style={{
                  width: n === Math.min(step, 5) ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: n < step ? "rgba(213,197,168,0.5)" : n === Math.min(step, 5) ? "var(--aa-amber)" : "rgba(76,70,61,0.4)",
                  transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            ))}
          </div>
        )}

        <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-3)", minWidth: 60, textAlign: "right" }}>
          {complete ? "Complete ✓" : `${Math.min(step, 5)} of 5`}
        </span>
      </div>

      {/* Progress bar */}
      {!complete && (
        <div style={{ height: 2, background: "rgba(76,70,61,0.25)" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, rgba(213,197,168,0.6) 0%, var(--aa-amber) 100%)", transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)", boxShadow: "0 0 12px rgba(213,197,168,0.3)" }} />
        </div>
      )}

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "60px 24px 80px" }}>
        {!complete ? (
          <div key={step} style={{ animation: "aaFadeUp 0.35s ease-out both" }}>
            {/* Step badge */}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{currentQuestion.icon}</span>
              <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-amber)", textTransform: "uppercase", letterSpacing: "0.12em", border: "1px solid rgba(213,197,168,0.2)", borderRadius: 100, padding: "4px 12px", background: "rgba(213,197,168,0.06)" }}>
                Question {step} of 5
              </span>
              {currentQuestion.multiSelect && (
                <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)", border: "1px solid rgba(76,70,61,0.35)", borderRadius: 100, padding: "4px 10px", background: "rgba(76,70,61,0.1)" }}>
                  Select all that apply
                </span>
              )}
            </div>

            {/* Question title */}
            <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.8rem,4.5vw,2.8rem)", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: currentQuestion.hint ? 10 : 36 }}>
              {currentQuestion.title}
            </h1>
            {currentQuestion.hint && (
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)", marginBottom: 32, lineHeight: 1.5 }}>
                {currentQuestion.hint}
              </p>
            )}

            {/* Options */}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: currentQuestion.options.length <= 3 ? "1fr" : "repeat(auto-fill,minmax(300px,1fr))" }}>
              {currentQuestion.options.map((option) => {
                const selected = currentQuestion.multiSelect
                  ? (answers[currentQuestion.key] as string[]).includes(option.value)
                  : answers[currentQuestion.key] === option.value;
                const isHovered = optionHover === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(currentQuestion.key, option.value, currentQuestion.multiSelect)}
                    onMouseEnter={() => setOptionHover(option.value)}
                    onMouseLeave={() => setOptionHover(null)}
                    style={{
                      padding: "16px 20px",
                      borderRadius: 14,
                      border: `1.5px solid ${selected ? "rgba(213,197,168,0.5)" : isHovered ? "rgba(76,70,61,0.7)" : "rgba(76,70,61,0.35)"}`,
                      background: selected ? "rgba(213,197,168,0.07)" : isHovered ? "rgba(31,31,31,0.8)" : "rgba(20,20,20,0.5)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      boxShadow: selected ? "0 0 0 1px rgba(213,197,168,0.15), 0 4px 16px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: currentQuestion.multiSelect ? 6 : 11,
                      border: `1.5px solid ${selected ? "var(--aa-amber)" : "rgba(76,70,61,0.55)"}`,
                      background: selected ? "rgba(213,197,168,0.15)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.18s ease",
                    }}>
                      {selected && <span style={{ fontSize: 11, color: "var(--aa-amber)", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.92rem", color: selected ? "var(--aa-text-1)" : "var(--aa-text-2)", lineHeight: 1.45, fontWeight: selected ? 500 : 400, transition: "color 0.18s" }}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 44 }}>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((v) => Math.max(1, v - 1))}
                  style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", background: "rgba(31,31,31,0.5)", border: "1px solid rgba(76,70,61,0.35)", borderRadius: 100, cursor: "pointer", padding: "10px 20px", transition: "all 0.18s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--aa-text-1)"; e.currentTarget.style.borderColor = "rgba(76,70,61,0.7)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--aa-text-3)"; e.currentTarget.style.borderColor = "rgba(76,70,61,0.35)"; }}
                >
                  ← Back
                </button>
              ) : <span />}
              <Button disabled={!canContinue} onClick={() => setStep((v) => v + 1)}>
                {step === 5 ? "See my profile →" : "Continue →"}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", animation: "aaFadeUp 0.4s ease-out both" }}>
            {/* Completion icon */}
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(105,219,139,0.1)", border: "1px solid rgba(105,219,139,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 36, boxShadow: "0 0 40px rgba(105,219,139,0.08)" }}>
              ✓
            </div>

            <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 12 }}>
              AlmondAI is ready for you
            </h1>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "1rem", color: "var(--aa-text-3)", marginBottom: 44, lineHeight: 1.55 }}>
              We&apos;ve crafted a personalized learning experience based on your answers
            </p>

            {resolved && (
              <div style={{ background: "rgba(213,197,168,0.05)", border: "1px solid rgba(213,197,168,0.18)", borderRadius: 20, padding: "32px", marginBottom: 36, textAlign: "left", boxShadow: "0 0 60px rgba(213,197,168,0.04), 0 16px 48px rgba(0,0,0,0.4)", maxWidth: 520, margin: "0 auto 36px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(213,197,168,0.1)", border: "1px solid rgba(213,197,168,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    🌰
                  </div>
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-amber)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Your learning profile</span>
                </div>
                <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.6rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.025em", marginBottom: 10 }}>
                  {categoryMeta[resolved.category].label}
                </h2>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.92rem", color: "var(--aa-text-2)", lineHeight: 1.6, marginBottom: 16 }}>
                  {categoryMeta[resolved.category].description}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-amber)", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.18)", borderRadius: 100, padding: "4px 12px" }}>
                    {answers.q1}
                  </span>
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", background: "rgba(76,70,61,0.15)", border: "1px solid rgba(76,70,61,0.3)", borderRadius: 100, padding: "4px 12px", textTransform: "capitalize" }}>
                    {resolved.mode.replace("_", "-")} mode
                  </span>
                </div>
              </div>
            )}

            <div style={{ maxWidth: 360, margin: "0 auto" }}>
              <Button fullWidth isLoading={saving} onClick={() => void persistProfile()}>
                Start learning with AlmondAI →
              </Button>
            </div>

            {error && (
              <div style={{ marginTop: 20, maxWidth: 360, margin: "20px auto 0" }}>
                <Toast message={error} variant="error" />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
