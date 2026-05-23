"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import {
  completeSession, createSession, getAlmonds, getQuestions, submitAttempt,
  type AlmondStatus, type Difficulty, type MCQAttemptResult, type MCQQuestion, type MCQSession,
} from "@/lib/api/mcq.api";
import { getTopicByName, updateTopicProgress } from "@/lib/api/syllabus.api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

type OptionKey = "a" | "b" | "c" | "d";
type AnswerRecord = { questionId: string; selected: OptionKey; result: MCQAttemptResult; timeTakenSeconds: number; };

const TOTAL_QUESTIONS = 10;
const SUBJECTS = ["Anatomy","Physiology","Biochemistry","Pathology","Pharmacology","Microbiology","Forensic Medicine","Community Medicine","ENT","Ophthalmology","Medicine","Surgery","Obstetrics and Gynecology","Pediatrics"];

function difficultyStyle(d: Difficulty): { color: string; bg: string; label: string } {
  if (d === "easy")   return { color: "var(--aa-green)",  bg: "rgba(34,197,94,0.1)",    label: "Easy" };
  if (d === "hard")   return { color: "var(--aa-coral)",  bg: "rgba(228,180,160,0.1)",  label: "Hard" };
  return                     { color: "var(--aa-caution)",bg: "rgba(230,200,122,0.1)",   label: "Medium" };
}

function completionMessage(score: number): { text: string; emoji: string; color: string } {
  if (score >= 8) return { text: "Outstanding! You've mastered this topic.",  emoji: "🏆", color: "var(--aa-green)" };
  if (score >= 6) return { text: "Good work! A little more practice will perfect this.", emoji: "⭐", color: "var(--aa-amber)" };
  if (score >= 4) return { text: "Keep going! Review the explanations carefully.", emoji: "📖", color: "var(--aa-caution)" };
  return                 { text: "This topic needs more study time.",           emoji: "💪", color: "var(--aa-coral)" };
}

function getOptionValue(q: MCQQuestion, key: OptionKey) {
  if (key === "a") return q.option_a;
  if (key === "b") return q.option_b;
  if (key === "c") return q.option_c;
  return q.option_d;
}

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackToken = useAuthStore((s) => s.accessToken);

  const isTutorFlow    = searchParams.get("mode") === "tutor_flow";
  const initialSubject = (searchParams.get("subject") || "Anatomy").trim() || "Anatomy";
  const requestedTopic = (searchParams.get("topic") || "").trim();

  const [subject,        setSubject]        = useState(initialSubject);
  const [difficulty,     setDifficulty]     = useState<Difficulty | "all">("all");
  const [highYieldOnly,  setHighYieldOnly]  = useState(false);
  const [activeSession,  setActiveSession]  = useState<MCQSession | null>(null);
  const [questions,      setQuestions]      = useState<MCQQuestion[]>([]);
  const [currentIndex,   setCurrentIndex]   = useState(0);
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [submittedResult,setSubmittedResult]= useState<MCQAttemptResult | null>(null);
  const [answers,        setAnswers]        = useState<AnswerRecord[]>([]);
  const [almonds,        setAlmonds]        = useState<AlmondStatus | null>(null);
  const [lostAlmondIndex,setLostAlmondIndex]= useState<number | null>(null);
  const [showAlmondLostText,setShowAlmondLostText]= useState(false);
  const [sessionFinished,setSessionFinished]= useState(false);
  const [showExplanation,setShowExplanation]= useState(false);
  const [autoReturnSeconds,setAutoReturnSeconds]= useState(5);
  const [progressNotice, setProgressNotice] = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartAt,setQuestionStartAt]= useState<number>(Date.now());

  const tutorAutoStartedRef = useRef(false);

  const currentQuestion  = questions[currentIndex] ?? null;
  const answeredCount    = answers.length;
  const totalQuestions   = questions.length;
  const correctCount     = answers.filter((a) => a.result.is_correct).length;
  const accuracy         = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const progressPct      = Math.min((answeredCount / Math.max(totalQuestions || TOTAL_QUESTIONS, 1)) * 100, 100);

  const topicForStudy = useMemo(
    () => requestedTopic || currentQuestion?.topic || "this topic",
    [requestedTopic, currentQuestion?.topic],
  );

  const getToken = useCallback(async (): Promise<string> => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? fallbackToken;
    if (!token) throw new Error("Please sign in again.");
    return token;
  }, [fallbackToken]);

  const refreshAlmonds = useCallback(async () => {
    try {
      const token = await getToken();
      const status = await getAlmonds(token);
      setAlmonds(status);
      window.dispatchEvent(new CustomEvent("almonds-updated", { detail: status }));
    } catch { /* resilient */ }
  }, [getToken]);

  useEffect(() => {
    void refreshAlmonds();
    const id = window.setInterval(() => void refreshAlmonds(), 60_000);
    return () => window.clearInterval(id);
  }, [refreshAlmonds]);

  useEffect(() => {
    if (!activeSession || sessionFinished) return;
    const id = window.setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeSession, sessionFinished]);

  const startPractice = useCallback(async () => {
    setLoading(true); setError(null); setSessionFinished(false); setAnswers([]);
    setSelectedOption(null); setSubmittedResult(null); setElapsedSeconds(0);
    setQuestionStartAt(Date.now()); setProgressNotice(null);
    try {
      const token = await getToken();
      const created = await createSession(token, { session_type: isTutorFlow ? "subject" : "daily", subject, difficulty: difficulty === "all" ? undefined : difficulty, total_questions: TOTAL_QUESTIONS });
      const loaded  = await getQuestions(token, { subject, difficulty: difficulty === "all" ? undefined : difficulty, limit: TOTAL_QUESTIONS, highYieldOnly, excludeAttempted: !isTutorFlow });
      let chosen = loaded.questions;
      if (requestedTopic) {
        const topicLower   = requestedTopic.toLowerCase();
        const topicMatches = loaded.questions.filter((q) => (q.topic || "").toLowerCase().includes(topicLower));
        if (topicMatches.length >= 4) chosen = topicMatches.slice(0, TOTAL_QUESTIONS);
      }
      if (!chosen.length) throw new Error("No questions available for this setup. Try another subject.");
      setActiveSession(created);
      setQuestions(chosen.slice(0, TOTAL_QUESTIONS));
      setCurrentIndex(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start practice.");
      setActiveSession(null); setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [difficulty, getToken, highYieldOnly, isTutorFlow, requestedTopic, subject]);

  useEffect(() => {
    if (!isTutorFlow || tutorAutoStartedRef.current || activeSession || sessionFinished) return;
    tutorAutoStartedRef.current = true;
    void startPractice();
  }, [activeSession, isTutorFlow, sessionFinished, startPractice]);

  const markTopicCompletedIfEligible = useCallback(async () => {
    if (!(correctCount >= 7 || accuracy >= 70)) return;
    try {
      const token   = await getToken();
      const resolved = await getTopicByName(token, topicForStudy, subject);
      if (!resolved?.id) return;
      await updateTopicProgress(token, resolved.id, "completed");
      setProgressNotice(`✓ ${topicForStudy} marked as completed in your Syllabus Map`);
    } catch {
      setProgressNotice("Great score! We could not auto-update topic progress right now.");
    }
  }, [accuracy, correctCount, getToken, subject, topicForStudy]);

  const completePracticeSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      const token = await getToken();
      await completeSession(token, activeSession.id, { correct_answers: correctCount, total_questions: totalQuestions, time_taken_seconds: elapsedSeconds });
    } catch { /* graceful */ } finally {
      setSessionFinished(true);
    }
    await markTopicCompletedIfEligible();
  }, [activeSession, correctCount, elapsedSeconds, getToken, markTopicCompletedIfEligible, totalQuestions]);

  useEffect(() => {
    if (!isTutorFlow || !sessionFinished) return;
    if (!(correctCount >= 7 || accuracy >= 70)) return;
    setAutoReturnSeconds(5);
    const tick = window.setInterval(() => {
      setAutoReturnSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          router.push(`/ai-tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topicForStudy)}&prompt=${encodeURIComponent(`Explain ${topicForStudy} for my ${subject} exam`)}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [accuracy, correctCount, isTutorFlow, router, sessionFinished, subject, topicForStudy]);

  const submitCurrentAnswer = useCallback(async () => {
    if (!currentQuestion || !selectedOption || !activeSession || submittedResult) return;
    try {
      setError(null);
      const token           = await getToken();
      const timeTakenSeconds = Math.max(1, Math.round((Date.now() - questionStartAt) / 1000));
      const result          = await submitAttempt(token, { question_id: currentQuestion.id, selected_option: selectedOption, session_id: activeSession.id, time_taken_seconds: timeTakenSeconds });
      setSubmittedResult(result);
      setShowExplanation(!result.is_correct);
      setAnswers((prev) => [...prev, { questionId: currentQuestion.id, selected: selectedOption, result, timeTakenSeconds }]);
      const before = almonds?.almonds_count ?? 5;
      if (result.almond_update) {
        const next = result.almond_update;
        setAlmonds(next);
        window.dispatchEvent(new CustomEvent("almonds-updated", { detail: next }));
        if (next.almonds_count < before) {
          setLostAlmondIndex(next.almonds_count);
          setShowAlmondLostText(true);
          window.setTimeout(() => setShowAlmondLostText(false), 1200);
          window.setTimeout(() => setLostAlmondIndex(null), 500);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit answer.");
    }
  }, [activeSession, almonds?.almonds_count, currentQuestion, getToken, questionStartAt, selectedOption, submittedResult]);

  const moveNext = useCallback(async () => {
    if (!submittedResult) return;
    if (submittedResult.almond_update?.redirect_to_tutor || (almonds?.almonds_count ?? 1) <= 0) return;
    if (currentIndex >= totalQuestions - 1) { await completePracticeSession(); return; }
    setCurrentIndex((p) => p + 1);
    setSelectedOption(null); setSubmittedResult(null); setShowExplanation(false); setQuestionStartAt(Date.now());
  }, [almonds?.almonds_count, completePracticeSession, currentIndex, submittedResult, totalQuestions]);

  const resetPractice = () => {
    setActiveSession(null); setQuestions([]); setCurrentIndex(0); setSelectedOption(null);
    setSubmittedResult(null); setAnswers([]); setSessionFinished(false); setShowExplanation(false);
    setError(null); setProgressNotice(null); tutorAutoStartedRef.current = false;
  };

  const goBackToTutor = () => router.push(`/ai-tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topicForStudy)}&prompt=${encodeURIComponent(`Explain ${topicForStudy} for my ${subject} exam`)}`);
  const isOutOfAlmonds = (almonds?.almonds_count ?? 5) <= 0;

  const diff = currentQuestion ? difficultyStyle(currentQuestion.difficulty) : null;

  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 5.5rem)", background: "var(--aa-bg)", padding: "16px 0 48px" }}>

      {/* ── Out of almonds overlay ── */}
      {isOutOfAlmonds && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,9,9,0.92)", backdropFilter: "blur(12px)", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 400, background: "var(--aa-s2)", border: "1px solid var(--aa-border2)", borderRadius: 24, padding: "36px 32px", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", animation: "aaScaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>○</div>
            <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.8rem", fontWeight: 800, color: "var(--aa-text-1)", marginBottom: 8, letterSpacing: "-0.02em" }}>
              Out of almonds
            </h2>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 8, lineHeight: 1.6 }}>
              Take a break and let AlmondAI explain this topic again.
            </p>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-amber)", marginBottom: 24 }}>
              Almonds refill in {almonds?.minutes_until_reset ?? 30} minutes
            </p>
            <button onClick={goBackToTutor} style={{ width: "100%", padding: "14px 0", borderRadius: 100, background: "var(--aa-amber)", border: "none", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(213,197,168,0.25)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--aa-amber-lt)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}>
              Go back to AI Tutor →
            </button>
            <p style={{ marginTop: 12, fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)" }}>Or wait {almonds?.minutes_until_reset ?? 30} minutes to try again</p>
          </div>
        </div>
      )}

      <div style={{ margin: "0 auto", maxWidth: 760, padding: "0 16px" }}>

        {/* ── Session header ── */}
        <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* Almonds */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isTutorFlow && (
                <span style={{ padding: "3px 10px", borderRadius: 100, background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.2)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--aa-amber)" }}>
                  From AI Tutor
                </span>
              )}
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {Array.from({ length: almonds?.max_almonds ?? 5 }).map((_, index) => {
                  const filled  = index < (almonds?.almonds_count ?? 5);
                  const isLost  = lostAlmondIndex === index;
                  return (
                    <div key={index} style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${filled ? "rgba(213,197,168,0.3)" : "rgba(53,53,52,0.8)"}`, background: filled ? "rgba(213,197,168,0.1)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all 0.3s", transform: isLost ? "scale(0.7) rotate(-12deg)" : "scale(1)", opacity: isLost ? 0.4 : 1 }}>
                      {filled ? "🌰" : "·"}
                    </div>
                  );
                })}
                {showAlmondLostText && <span style={{ fontSize: "0.75rem", color: "var(--aa-coral)", fontWeight: 600, animation: "aaFadeUp 0.3s ease-out" }}>-1</span>}
              </div>
            </div>

            {/* Timer */}
            {almonds && !almonds.is_full ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 100, border: "1px solid var(--aa-border)", background: "var(--aa-s3)", fontSize: "0.8rem", color: "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>
                <Clock3 size={13} />
                Refills in {almonds.minutes_until_reset ?? 30}m
              </div>
            ) : null}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 5, background: "var(--aa-s4)", borderRadius: "var(--aa-r-full)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "var(--aa-r-full)", background: "linear-gradient(90deg,var(--aa-amber),var(--aa-amber-lt))", transition: "width 0.5s cubic-bezier(0.34,1.56,0.64,1)", width: `${progressPct}%`, boxShadow: "0 0 8px rgba(213,197,168,0.3)" }} />
            </div>
            {activeSession && !sessionFinished && (
              <span style={{ fontFamily: "var(--aa-fd)", fontSize: "0.8rem", fontWeight: 700, color: "var(--aa-text-2)", flexShrink: 0 }}>
                {answeredCount}/{totalQuestions || TOTAL_QUESTIONS}
              </span>
            )}
          </div>
        </div>

        {/* ── Setup screen ── */}
        {!activeSession && !sessionFinished && !isTutorFlow && (
          <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "36px 32px" }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: "var(--aa-r-md)", background: "rgba(213,197,168,0.09)", border: "1px solid rgba(213,197,168,0.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📋</div>
                <div>
                  <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.5rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.02em" }}>Practice MCQs</h1>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.85rem", color: "var(--aa-text-3)" }}>Build confidence with focused questions and instant feedback</p>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginBottom: 8, fontSize: "0.6rem" }}>Subject</div>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="aa-input select-aa-input">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginBottom: 8, fontSize: "0.6rem" }}>Difficulty</div>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")} className="aa-input select-aa-input">
                  <option value="all">All difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "var(--aa-r-lg)", border: "1px solid var(--aa-border)", background: "var(--aa-s3)", cursor: "pointer", marginBottom: 24, userSelect: "none" }}>
              <div>
                <div style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-1)" }}>High Yield Only</div>
                <div style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginTop: 2 }}>Focus on frequently tested topics</div>
              </div>
              <div style={{ position: "relative", width: 40, height: 22, borderRadius: 11, background: highYieldOnly ? "var(--aa-amber)" : "var(--aa-s4)", border: `1.5px solid ${highYieldOnly ? "var(--aa-amber)" : "var(--aa-border2)"}`, transition: "all 0.22s", cursor: "pointer", flexShrink: 0 }}>
                <input type="checkbox" checked={highYieldOnly} onChange={(e) => setHighYieldOnly(e.target.checked)} style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer", width: "100%", height: "100%", margin: 0 }} />
                <div style={{ position: "absolute", top: 2, left: highYieldOnly ? 20 : 2, width: 14, height: 14, borderRadius: "50%", background: highYieldOnly ? "#131313" : "var(--aa-text-3)", transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1)", pointerEvents: "none" }} />
              </div>
            </label>

            <button type="button" onClick={() => void startPractice()} disabled={loading}
              style={{ width: "100%", padding: "15px 0", borderRadius: 100, background: "var(--aa-amber)", border: "none", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.95rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: loading ? 0.6 : 1, boxShadow: "0 4px 20px rgba(213,197,168,0.2)" }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = "var(--aa-amber-lt)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(213,197,168,0.32)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = loading ? "var(--aa-amber)" : "var(--aa-amber)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(213,197,168,0.2)"; e.currentTarget.style.transform = ""; }}>
              {loading ? "Starting session…" : "Start 10-question session →"}
            </button>
          </div>
        )}

        {/* ── Question card ── */}
        {activeSession && !sessionFinished && currentQuestion && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "32px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "aaFadeUp 0.3s ease-out both" }}>
              {/* Meta row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.16)", fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 600, color: "var(--aa-amber)" }}>
                    {currentQuestion.subject}
                  </span>
                  {currentQuestion.topic && (
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)" }}>
                      · {currentQuestion.topic}
                    </span>
                  )}
                </div>
                {diff && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 100, background: diff.bg, fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 600, color: diff.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: diff.color }} />
                    {diff.label}
                  </span>
                )}
              </div>

              {/* Question text */}
              <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 600, color: "var(--aa-text-1)", lineHeight: 1.65, marginBottom: 26, letterSpacing: "-0.01em" }}>
                {currentQuestion.question_text}
              </p>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(["a","b","c","d"] as OptionKey[]).map((key) => {
                  const text         = getOptionValue(currentQuestion, key);
                  const isSelected   = selectedOption === key;
                  const isCorrect    = submittedResult?.correct_option === key;
                  const isWrong      = Boolean(submittedResult && isSelected && !submittedResult.is_correct);
                  const label        = key.toUpperCase();

                  let borderColor = "var(--aa-border)";
                  let bgColor     = "rgba(31,31,31,0.6)";
                  let labelBg     = "var(--aa-s3)";
                  let labelColor  = "var(--aa-amber)";

                  if (!submittedResult && isSelected) {
                    borderColor = "var(--aa-amber)";
                    bgColor     = "rgba(213,197,168,0.06)";
                    labelBg     = "var(--aa-amber)";
                    labelColor  = "#131313";
                  }
                  if (submittedResult && isCorrect) {
                    borderColor = "var(--aa-green)";
                    bgColor     = "rgba(34,197,94,0.06)";
                    labelBg     = "var(--aa-green)";
                    labelColor  = "#131313";
                  }
                  if (submittedResult && isWrong) {
                    borderColor = "var(--aa-coral)";
                    bgColor     = "rgba(228,180,160,0.06)";
                    labelBg     = "var(--aa-coral)";
                    labelColor  = "#131313";
                  }

                  return (
                    <button key={key} type="button"
                      onClick={() => { if (!submittedResult) setSelectedOption(key); }}
                      disabled={!!submittedResult}
                      style={{ width: "100%", borderRadius: "var(--aa-r-lg)", border: `1.5px solid ${borderColor}`, background: bgColor, padding: "14px 18px", textAlign: "left", cursor: submittedResult ? "default" : "pointer", transition: "all 0.18s ease", display: "flex", alignItems: "flex-start", gap: 14, fontFamily: "var(--aa-fb)" }}
                      onMouseEnter={(e) => { if (!submittedResult && !isSelected) { e.currentTarget.style.borderColor = "rgba(213,197,168,0.35)"; e.currentTarget.style.background = "rgba(213,197,168,0.03)"; } }}
                      onMouseLeave={(e) => { if (!submittedResult && !isSelected) { e.currentTarget.style.borderColor = "var(--aa-border)"; e.currentTarget.style.background = "rgba(31,31,31,0.6)"; } }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: labelBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--aa-fd)", fontSize: "0.8rem", fontWeight: 800, color: labelColor, flexShrink: 0, transition: "all 0.18s" }}>
                        {label}
                      </span>
                      <span style={{ fontSize: "0.9rem", color: "var(--aa-text-1)", lineHeight: 1.6, flex: 1, paddingTop: 5 }}>{text}</span>
                      {submittedResult && isCorrect && <CheckCircle2 size={18} style={{ color: "var(--aa-green)", flexShrink: 0, marginTop: 6 }} />}
                      {submittedResult && isWrong  && <XCircle      size={18} style={{ color: "var(--aa-coral)", flexShrink: 0, marginTop: 6 }} />}
                    </button>
                  );
                })}
              </div>

              {/* Action button */}
              <button type="button"
                onClick={() => { if (!submittedResult) void submitCurrentAnswer(); else void moveNext(); }}
                disabled={!submittedResult && !selectedOption}
                style={{ marginTop: 22, width: "100%", padding: "15px 0", borderRadius: 100, fontFamily: "var(--aa-fb)", fontSize: "0.95rem", fontWeight: 700, cursor: (!submittedResult && !selectedOption) ? "not-allowed" : "pointer", transition: "all 0.2s", border: "none",
                  background: (!submittedResult && !selectedOption) ? "transparent" : "var(--aa-amber)",
                  color:      (!submittedResult && !selectedOption) ? "var(--aa-text-3)" : "#131313",
                  border2:    (!submittedResult && !selectedOption) ? "1px solid var(--aa-border2)" : "none",
                  opacity:    (!submittedResult && !selectedOption) ? 1 : 1,
                  boxShadow:  (!submittedResult && !selectedOption) ? "none" : "0 4px 20px rgba(213,197,168,0.2)",
                } as React.CSSProperties}
                onMouseEnter={(e) => { if (submittedResult || selectedOption) { e.currentTarget.style.background = "var(--aa-amber-lt)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = (!submittedResult && !selectedOption) ? "transparent" : "var(--aa-amber)"; e.currentTarget.style.transform = ""; }}>
                {!submittedResult && !selectedOption ? "Choose an answer" : submittedResult ? (currentIndex === totalQuestions - 1 ? "View Results →" : "Continue →") : "Check Answer"}
              </button>
            </div>

            {/* Explanation panel */}
            {submittedResult && (
              <div style={{ borderRadius: "var(--aa-r-lg)", padding: "20px 24px", border: `2px solid ${submittedResult.is_correct ? "rgba(34,197,94,0.35)" : "rgba(228,180,160,0.35)"}`, background: submittedResult.is_correct ? "rgba(34,197,94,0.05)" : "rgba(228,180,160,0.05)", animation: "aaFadeUp 0.3s ease-out both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{submittedResult.is_correct ? "✅" : "❌"}</span>
                    <span style={{ fontFamily: "var(--aa-fd)", fontSize: "0.95rem", fontWeight: 700, color: submittedResult.is_correct ? "var(--aa-green)" : "var(--aa-coral)" }}>
                      {submittedResult.is_correct ? "Correct!" : "Not quite, but you are learning"}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)" }}>
                    {Math.max(1, Math.round((Date.now() - questionStartAt) / 1000))}s
                  </span>
                </div>

                {submittedResult.is_correct && (
                  <button type="button" onClick={() => setShowExplanation((p) => !p)}
                    style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-amber)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: showExplanation ? 10 : 0 }}>
                    {showExplanation ? "Hide explanation ▲" : "Show explanation ▼"}
                  </button>
                )}

                {(showExplanation || !submittedResult.is_correct) && (
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)", lineHeight: 1.72, marginTop: 4 }}>
                    {submittedResult.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Results screen ── */}
        {sessionFinished && (
          <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "40px 32px", animation: "aaBounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            {(() => {
              const msg        = completionMessage(correctCount);
              const scorePct   = accuracy;
              const circumference = 2 * Math.PI * 45; // r=45
              const offset     = circumference - (scorePct / 100) * circumference;
              return (
                <>
                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--aa-text-3)", marginBottom: 16 }}>Session Complete</p>

                    {/* Score ring */}
                    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 20px" }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r="45" fill="none" stroke="var(--aa-s4)" strokeWidth="8" />
                        <circle cx="60" cy="60" r="45" fill="none" stroke={msg.color} strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={circumference} strokeDashoffset={circumference}
                          style={{ animation: `aaScoreDraw 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.4s forwards`, ["--aa-score-offset" as string]: offset }}
                          className="aa-score-ring" />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "var(--aa-fd)", fontSize: "1.6rem", fontWeight: 900, color: "var(--aa-text-1)", lineHeight: 1 }}>{accuracy}%</span>
                        <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.7rem", color: "var(--aa-text-3)", marginTop: 2 }}>{correctCount}/{totalQuestions || TOTAL_QUESTIONS}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: "2rem", marginBottom: 10 }}>{msg.emoji}</div>
                    <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 700, color: "var(--aa-text-1)", marginBottom: 4 }}>
                      {correctCount >= 8 ? "Outstanding!" : correctCount >= 6 ? "Good work!" : correctCount >= 4 ? "Keep going!" : "Study more"}
                    </p>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)", lineHeight: 1.6 }}>
                      {msg.text}
                    </p>
                  </div>

                  {/* Result badges */}
                  {correctCount >= 7 || accuracy >= 70 ? (
                    <div style={{ borderRadius: "var(--aa-r-lg)", border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.07)", padding: "16px 20px", marginBottom: 20 }}>
                      <p style={{ fontFamily: "var(--aa-fd)", fontSize: "0.9rem", fontWeight: 700, color: "var(--aa-green)", marginBottom: 4 }}>Topic progress updated ✓</p>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "rgba(34,197,94,0.7)", lineHeight: 1.55 }}>
                        AlmondAI has marked this topic as understood in your Syllabus Map.
                      </p>
                      {progressNotice && <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "rgba(34,197,94,0.6)", marginTop: 6 }}>{progressNotice}</p>}
                    </div>
                  ) : (
                    <div style={{ borderRadius: "var(--aa-r-lg)", border: "1px solid rgba(230,200,122,0.28)", background: "rgba(230,200,122,0.07)", padding: "16px 20px", marginBottom: 20 }}>
                      <p style={{ fontFamily: "var(--aa-fd)", fontSize: "0.9rem", fontWeight: 700, color: "var(--aa-caution)", marginBottom: 4 }}>Let&apos;s review this with AI Tutor</p>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "rgba(230,200,122,0.65)", lineHeight: 1.55 }}>
                        A detailed explanation will help lock this topic in.
                      </p>
                    </div>
                  )}

                  {isTutorFlow && (correctCount >= 7 || accuracy >= 70) && (
                    <p style={{ textAlign: "center", fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-3)", marginBottom: 16 }}>
                      Returning to AI Tutor in {autoReturnSeconds}s…
                    </p>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <button type="button" onClick={() => { resetPractice(); void startPractice(); }}
                      style={{ flex: 1, minWidth: 140, padding: "12px 0", borderRadius: 100, border: "1px solid var(--aa-border2)", background: "transparent", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-2)", cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; e.currentTarget.style.color = "var(--aa-amber)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--aa-border2)"; e.currentTarget.style.color = "var(--aa-text-2)"; }}>
                      Practice Again
                    </button>
                    <button type="button" onClick={goBackToTutor}
                      style={{ flex: 1, minWidth: 140, padding: "12px 0", borderRadius: 100, background: "var(--aa-amber)", border: "none", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 700, color: "#131313", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(213,197,168,0.2)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--aa-amber-lt)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}>
                      Back to AI Tutor →
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {error && (
          <div style={{ padding: "14px 18px", borderRadius: "var(--aa-r-lg)", background: "rgba(228,180,160,0.08)", border: "1px solid rgba(228,180,160,0.25)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-coral)" }}>
            {error}
          </div>
        )}

        {!isTutorFlow && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/ai-tutor" style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-3)", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--aa-amber)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--aa-text-3)"; }}>
              ← Back to AI Tutor
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
