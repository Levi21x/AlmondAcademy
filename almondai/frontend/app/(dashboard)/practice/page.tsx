"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Copy, Crown, Loader2, Trophy, Users, XCircle, Zap } from "lucide-react";

import {
  completeSession, createSession, generateQuestions, getAlmonds, getQuestions, submitAttempt,
  createCompeteRoom, joinCompeteRoom, getCompeteRoom, startCompeteRoom, submitCompeteAnswer,
  type AlmondStatus, type CompeteParticipant, type CompeteRoom, type Difficulty,
  type MCQAttemptResult, type MCQQuestion, type MCQSession,
} from "@/lib/api/mcq.api";
import { getTopicByName, updateTopicProgress } from "@/lib/api/syllabus.api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSubjectList } from "@/lib/hooks/useSubjectList";
import { useProfile } from "@/lib/hooks/useProfile";
import { useAuthStore } from "@/lib/store/authStore";

type Tab = "practice" | "compete" | "pyqs";
type OptionKey = "a" | "b" | "c" | "d";
type AnswerRecord = { questionId: string; selected: OptionKey; result: MCQAttemptResult; timeTakenSeconds: number };
type CompeteState = "idle" | "creating" | "waiting" | "active" | "finished";

const TOTAL_QUESTIONS = 10;

function difficultyStyle(d: Difficulty): { color: string; bg: string; label: string } {
  if (d === "easy")   return { color: "var(--aa-green)",   bg: "rgba(34,197,94,0.1)",   label: "Easy"   };
  if (d === "hard")   return { color: "var(--aa-coral)",   bg: "rgba(228,180,160,0.1)", label: "Hard"   };
  return                     { color: "var(--aa-caution)", bg: "rgba(230,200,122,0.1)", label: "Medium" };
}

function completionMessage(score: number): { text: string; emoji: string; color: string } {
  if (score >= 8) return { text: "Outstanding! You've mastered this topic.",              emoji: "🏆", color: "var(--aa-green)"   };
  if (score >= 6) return { text: "Good work! A little more practice will perfect this.", emoji: "⭐", color: "var(--aa-amber)"   };
  if (score >= 4) return { text: "Keep going! Review the explanations carefully.",        emoji: "📖", color: "var(--aa-caution)" };
  return                 { text: "This topic needs more study time.",                     emoji: "💪", color: "var(--aa-coral)"   };
}

function getOptionValue(q: MCQQuestion, key: OptionKey) {
  if (key === "a") return q.option_a;
  if (key === "b") return q.option_b;
  if (key === "c") return q.option_c;
  return q.option_d;
}

function ScoreRing({ pct, correct, total, color }: { pct: number; correct: number; total: number; color: string }) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 20px" }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--aa-s4)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ}
          style={{ animation: "aaScoreDraw 1.2s cubic-bezier(0.34,1.56,0.64,1) 0.4s forwards", ["--aa-score-offset" as string]: offset }}
          className="aa-score-ring" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--aa-fd)", fontSize: "1.6rem", fontWeight: 900, color: "var(--aa-text-1)", lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.7rem", color: "var(--aa-text-3)", marginTop: 2 }}>{correct}/{total}</span>
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 20px",
        borderRadius: 100,
        border: active ? "1px solid rgba(213,197,168,0.35)" : "1px solid transparent",
        background: active ? "rgba(213,197,168,0.08)" : "transparent",
        fontFamily: "var(--aa-fb)",
        fontSize: "0.875rem",
        fontWeight: active ? 700 : 500,
        color: active ? "var(--aa-amber)" : "var(--aa-text-3)",
        cursor: "pointer",
        transition: "all 0.18s",
      }}
    >
      {children}
    </button>
  );
}

// ─── Option button ────────────────────────────────────────────────────────────
function OptionBtn({
  optKey, text, selectedOption, submittedResult, disabled, onSelect,
}: {
  optKey: OptionKey; text: string; selectedOption: OptionKey | null;
  submittedResult: MCQAttemptResult | null; disabled: boolean; onSelect: (k: OptionKey) => void;
}) {
  const isSelected = selectedOption === optKey;
  const isCorrect  = submittedResult?.correct_option === optKey;
  const isWrong    = Boolean(submittedResult && isSelected && !submittedResult.is_correct);
  const label      = optKey.toUpperCase();

  let borderColor = "var(--aa-border)";
  let bgColor     = "rgba(31,31,31,0.6)";
  let labelBg     = "var(--aa-s3)";
  let labelColor  = "var(--aa-amber)";

  if (!submittedResult && isSelected) { borderColor = "var(--aa-amber)"; bgColor = "rgba(213,197,168,0.06)"; labelBg = "var(--aa-amber)"; labelColor = "#131313"; }
  if (submittedResult && isCorrect)   { borderColor = "var(--aa-green)"; bgColor = "rgba(34,197,94,0.06)";   labelBg = "var(--aa-green)"; labelColor = "#131313"; }
  if (submittedResult && isWrong)     { borderColor = "var(--aa-coral)"; bgColor = "rgba(228,180,160,0.06)"; labelBg = "var(--aa-coral)"; labelColor = "#131313"; }

  return (
    <button
      type="button"
      className="aa-press"
      onClick={() => { if (!submittedResult) onSelect(optKey); }}
      disabled={disabled}
      style={{ width: "100%", borderRadius: "var(--aa-r-lg)", border: `1.5px solid ${borderColor}`, background: bgColor, padding: "14px 18px", textAlign: "left", cursor: submittedResult ? "default" : "pointer", transition: "all 0.18s ease", display: "flex", alignItems: "flex-start", gap: 14, fontFamily: "var(--aa-fb)" }}
      onMouseEnter={(e) => { if (!submittedResult && !isSelected) { e.currentTarget.style.borderColor = "rgba(213,197,168,0.35)"; e.currentTarget.style.background = "rgba(213,197,168,0.03)"; } }}
      onMouseLeave={(e) => { if (!submittedResult && !isSelected) { e.currentTarget.style.borderColor = "var(--aa-border)"; e.currentTarget.style.background = "rgba(31,31,31,0.6)"; } }}
    >
      <span style={{ width: 30, height: 30, borderRadius: 8, background: labelBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--aa-fd)", fontSize: "0.8rem", fontWeight: 800, color: labelColor, flexShrink: 0, transition: "all 0.18s" }}>{label}</span>
      <span style={{ fontSize: "0.9rem", color: "var(--aa-text-1)", lineHeight: 1.6, flex: 1, paddingTop: 5 }}>{text}</span>
      {submittedResult && isCorrect && <CheckCircle2 size={18} style={{ color: "var(--aa-green)", flexShrink: 0, marginTop: 6 }} />}
      {submittedResult && isWrong   && <XCircle      size={18} style={{ color: "var(--aa-coral)", flexShrink: 0, marginTop: 6 }} />}
    </button>
  );
}

export default function PracticePage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const fallbackToken = useAuthStore((s) => s.accessToken);
  const { data: profile } = useProfile();
  const { subjects: subjectList, loaded: subjectsLoaded } = useSubjectList();

  const isTutorFlow    = searchParams.get("mode") === "tutor_flow";
  const generateMode   = searchParams.get("generate") === "true";
  const initialSubject = (searchParams.get("subject") || "Anatomy").trim() || "Anatomy";
  const requestedTopic = (searchParams.get("topic") || "").trim();
  const initialTab     = (searchParams.get("tab") || "practice") as Tab;

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // ── Practice state ──────────────────────────────────────────────────────────
  const [subject,          setSubject]          = useState(initialSubject);
  const [difficulty,       setDifficulty]       = useState<Difficulty | "all">("all");
  const [highYieldOnly,    setHighYieldOnly]    = useState(false);
  const [activeSession,    setActiveSession]    = useState<MCQSession | null>(null);
  const [questions,        setQuestions]        = useState<MCQQuestion[]>([]);
  const [currentIndex,     setCurrentIndex]     = useState(0);
  const [selectedOption,   setSelectedOption]   = useState<OptionKey | null>(null);
  const [submittedResult,  setSubmittedResult]  = useState<MCQAttemptResult | null>(null);
  const [answers,          setAnswers]          = useState<AnswerRecord[]>([]);
  const [almonds,          setAlmonds]          = useState<AlmondStatus | null>(null);
  const [lostAlmondIndex,  setLostAlmondIndex]  = useState<number | null>(null);
  const [showAlmondLostText, setShowAlmondLostText] = useState(false);
  const [sessionFinished,  setSessionFinished]  = useState(false);
  const [showExplanation,  setShowExplanation]  = useState(false);
  const [autoReturnSeconds, setAutoReturnSeconds] = useState(5);
  const [progressNotice,   setProgressNotice]   = useState<string | null>(null);
  const [loading,          setLoading]          = useState(false);
  const [generating,       setGenerating]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [elapsedSeconds,   setElapsedSeconds]   = useState(0);
  const [questionStartAt,  setQuestionStartAt]  = useState<number>(Date.now());

  const tutorAutoStartedRef = useRef(false);

  // ── Compete state ───────────────────────────────────────────────────────────
  const [competeState,     setCompeteState]     = useState<CompeteState>("idle");
  const [competeSubject,   setCompeteSubject]   = useState(initialSubject);
  const [competeTopic,     setCompeteTopic]     = useState("");
  const [competeRoom,      setCompeteRoom]      = useState<CompeteRoom | null>(null);
  const [competeQuestions, setCompeteQuestions] = useState<MCQQuestion[]>([]);
  const [competeParticipants, setCompeteParticipants] = useState<CompeteParticipant[]>([]);
  const [joinCode,         setJoinCode]         = useState("");
  const [competeIndex,     setCompeteIndex]     = useState(0);
  const [competeSelected,  setCompeteSelected]  = useState<OptionKey | null>(null);
  const [competeResult,    setCompeteResult]    = useState<{ is_correct: boolean; correct_option: OptionKey; explanation: string; score: number } | null>(null);
  const [myScore,          setMyScore]          = useState(0);
  const [competeError,     setCompeteError]     = useState<string | null>(null);
  const [competeLoading,   setCompeteLoading]   = useState(false);
  const [copiedCode,       setCopiedCode]       = useState(false);
  const pollIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const t = session?.access_token ?? fallbackToken;
    if (!t) throw new Error("Please sign in again.");
    return t;
  }, [fallbackToken]);

  const refreshAlmonds = useCallback(async () => {
    try {
      const t = await getToken();
      const status = await getAlmonds(t);
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
    if (!subjectsLoaded || subjectList.length === 0) return;
    if (!subjectList.includes(subject)) setSubject(subjectList[0]);
    if (!subjectList.includes(competeSubject)) setCompeteSubject(subjectList[0]);
  }, [subjectsLoaded, subjectList]);

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
      const t = await getToken();

      let chosen: MCQQuestion[] = [];

      if (generateMode && requestedTopic) {
        setGenerating(true);
        try {
          const generated = await generateQuestions(t, {
            subject,
            topic: requestedTopic,
            count: TOTAL_QUESTIONS,
            student_category: profile?.student_category ?? undefined,
          });
          chosen = generated.questions;
        } finally {
          setGenerating(false);
        }
      }

      if (!chosen.length) {
        const loaded = await getQuestions(t, { subject, difficulty: difficulty === "all" ? undefined : difficulty, limit: TOTAL_QUESTIONS, highYieldOnly, excludeAttempted: !isTutorFlow });
        chosen = loaded.questions;
        if (requestedTopic) {
          const topicLower   = requestedTopic.toLowerCase();
          const topicMatches = chosen.filter((q) => (q.topic || "").toLowerCase().includes(topicLower));
          if (topicMatches.length >= 4) chosen = topicMatches.slice(0, TOTAL_QUESTIONS);
        }
      }

      // No questions in DB — auto-generate with AI
      if (!chosen.length) {
        setGenerating(true);
        try {
          const generated = await generateQuestions(t, {
            subject,
            topic: requestedTopic || subject,
            count: TOTAL_QUESTIONS,
            student_category: profile?.student_category ?? undefined,
          });
          chosen = generated.questions;
        } finally {
          setGenerating(false);
        }
      }

      if (!chosen.length) throw new Error("Could not generate questions. Please try again.");

      const created = await createSession(t, { session_type: isTutorFlow ? "subject" : "daily", subject, difficulty: difficulty === "all" ? undefined : difficulty, total_questions: chosen.length });
      setActiveSession(created);
      setQuestions(chosen.slice(0, TOTAL_QUESTIONS));
      setCurrentIndex(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start practice.");
      setActiveSession(null); setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [difficulty, generateMode, getToken, highYieldOnly, isTutorFlow, profile, requestedTopic, subject]);

  useEffect(() => {
    if (!isTutorFlow || tutorAutoStartedRef.current || activeSession || sessionFinished) return;
    tutorAutoStartedRef.current = true;
    void startPractice();
  }, [activeSession, isTutorFlow, sessionFinished, startPractice]);

  const markTopicCompletedIfEligible = useCallback(async () => {
    if (!(correctCount >= 7 || accuracy >= 70)) return;
    try {
      const t       = await getToken();
      const resolved = await getTopicByName(t, topicForStudy, subject);
      if (!resolved?.id) return;
      await updateTopicProgress(t, resolved.id, "completed");
      setProgressNotice(`✓ ${topicForStudy} marked as completed in your Syllabus Map`);
    } catch {
      setProgressNotice("Great score! We could not auto-update topic progress right now.");
    }
  }, [accuracy, correctCount, getToken, subject, topicForStudy]);

  const completePracticeSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      const t = await getToken();
      await completeSession(t, activeSession.id, { correct_answers: correctCount, total_questions: totalQuestions, time_taken_seconds: elapsedSeconds });
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
      const t               = await getToken();
      const timeTakenSeconds = Math.max(1, Math.round((Date.now() - questionStartAt) / 1000));
      const result          = await submitAttempt(t, { question_id: currentQuestion.id, selected_option: selectedOption, session_id: activeSession.id, time_taken_seconds: timeTakenSeconds });
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

  // ── Compete helpers ─────────────────────────────────────────────────────────
  const stopPoll = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollRoom = useCallback(async (code: string) => {
    try {
      const t = await getToken();
      const { room, participants } = await getCompeteRoom(t, code);
      setCompeteParticipants(participants);
      setCompeteRoom(room);
      if (room.status === "active" && competeState === "waiting") {
        setCompeteState("active");
        setCompeteIndex(0);
        stopPoll();
      }
      if (room.status === "completed") {
        setCompeteState("finished");
        stopPoll();
      }
    } catch { /* resilient */ }
  }, [competeState, getToken, stopPoll]);

  useEffect(() => {
    return () => stopPoll();
  }, [stopPoll]);

  const handleCreateRoom = useCallback(async () => {
    setCompeteLoading(true); setCompeteError(null);
    try {
      const t = await getToken();
      const { room, questions: qs } = await createCompeteRoom(t, {
        subject: competeSubject,
        topic: competeTopic || competeSubject,
        question_count: 10,
      });
      setCompeteRoom(room);
      setCompeteQuestions(qs);
      setCompeteState("waiting");
      // Poll for other players joining / host starting
      pollIntervalRef.current = setInterval(() => void pollRoom(room.code), 3000);
    } catch (err: unknown) {
      setCompeteError(err instanceof Error ? err.message : "Failed to create room.");
    } finally {
      setCompeteLoading(false);
    }
  }, [competeTopic, competeSubject, getToken, pollRoom]);

  const handleJoinRoom = useCallback(async () => {
    if (!joinCode.trim()) return;
    setCompeteLoading(true); setCompeteError(null);
    try {
      const t = await getToken();
      const { room, questions: qs, participants } = await joinCompeteRoom(t, joinCode.trim(), profile?.full_name?.split(" ")[0] ?? "Player");
      setCompeteRoom(room);
      setCompeteQuestions(qs);
      setCompeteParticipants(participants);
      if (room.status === "active") {
        setCompeteState("active");
        setCompeteIndex(0);
      } else {
        setCompeteState("waiting");
        pollIntervalRef.current = setInterval(() => void pollRoom(room.code), 3000);
      }
    } catch (err: unknown) {
      setCompeteError(err instanceof Error ? err.message : "Could not join room. Check the code.");
    } finally {
      setCompeteLoading(false);
    }
  }, [getToken, joinCode, pollRoom, profile?.full_name]);

  const handleStartRoom = useCallback(async () => {
    if (!competeRoom) return;
    setCompeteLoading(true);
    try {
      const t = await getToken();
      await startCompeteRoom(t, competeRoom.code);
      setCompeteState("active");
      setCompeteIndex(0);
      stopPoll();
    } catch (err: unknown) {
      setCompeteError(err instanceof Error ? err.message : "Failed to start room.");
    } finally {
      setCompeteLoading(false);
    }
  }, [competeRoom, getToken, stopPoll]);

  const handleCompeteSubmit = useCallback(async () => {
    if (!competeRoom || !competeSelected || competeResult) return;
    const q = competeQuestions[competeIndex];
    if (!q) return;
    try {
      const t = await getToken();
      const res = await submitCompeteAnswer(t, competeRoom.code, { question_id: q.id, selected_option: competeSelected });
      setCompeteResult({ is_correct: res.is_correct, correct_option: res.correct_option as OptionKey, explanation: res.explanation, score: res.score });
      setMyScore(res.score);
      if (res.is_finished) {
        setCompeteState("finished");
        stopPoll();
        void pollRoom(competeRoom.code);
      }
    } catch (err: unknown) {
      setCompeteError(err instanceof Error ? err.message : "Failed to submit answer.");
    }
  }, [competeIndex, competeQuestions, competeResult, competeRoom, competeSelected, getToken, pollRoom, stopPoll]);

  const moveCompeteNext = () => {
    setCompeteResult(null);
    setCompeteSelected(null);
    setCompeteIndex((p) => p + 1);
  };

  const copyRoomCode = () => {
    if (!competeRoom) return;
    void navigator.clipboard.writeText(competeRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const competeQuestion = competeQuestions[competeIndex] ?? null;
  const isHost = competeRoom?.host_user_id === profile?.user_id;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", minHeight: "calc(100vh - 5.5rem)", background: "var(--aa-bg)", padding: "16px 0 48px" }}>

      {/* ── Out of almonds overlay ── */}
      {isOutOfAlmonds && activeTab === "practice" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,9,9,0.92)", backdropFilter: "blur(12px)", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 400, background: "var(--aa-s2)", border: "1px solid var(--aa-border2)", borderRadius: 24, padding: "36px 32px", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", animation: "aaScaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>○</div>
            <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.8rem", fontWeight: 800, color: "var(--aa-text-1)", marginBottom: 8, letterSpacing: "-0.02em" }}>Out of almonds</h2>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 8, lineHeight: 1.6 }}>Take a break and let AlmondAI explain this topic again.</p>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-amber)", marginBottom: 24 }}>Almonds refill in {almonds?.minutes_until_reset ?? 30} minutes</p>
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

        {/* ── Tab bar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 20, padding: "4px", background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: 100, width: "fit-content" }}>
          <TabBtn active={activeTab === "practice"} onClick={() => setActiveTab("practice")}>Practice</TabBtn>
          <TabBtn active={activeTab === "compete"}  onClick={() => setActiveTab("compete")}>⚡ Compete</TabBtn>
          <TabBtn active={activeTab === "pyqs"}     onClick={() => setActiveTab("pyqs")}>PYQs</TabBtn>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  PRACTICE TAB                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "practice" && (
          <>
            {/* Session header */}
            <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isTutorFlow && (
                    <span style={{ padding: "3px 10px", borderRadius: 100, background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.2)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--aa-amber)" }}>
                      From AI Tutor
                    </span>
                  )}
                  {generateMode && requestedTopic && (
                    <span style={{ padding: "3px 10px", borderRadius: 100, background: "rgba(213,197,168,0.06)", border: "1px solid rgba(213,197,168,0.18)", fontSize: "0.68rem", fontWeight: 600, color: "var(--aa-amber)" }}>
                      AI · {requestedTopic}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {Array.from({ length: almonds?.max_almonds ?? 5 }).map((_, index) => {
                      const filled = index < (almonds?.almonds_count ?? 5);
                      const isLost = lostAlmondIndex === index;
                      return (
                        <div key={index} style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${filled ? "rgba(213,197,168,0.3)" : "rgba(53,53,52,0.8)"}`, background: filled ? "rgba(213,197,168,0.1)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, transition: "all 0.3s", transform: isLost ? "scale(0.7) rotate(-12deg)" : "scale(1)", opacity: isLost ? 0.4 : 1 }}>
                          {filled ? "🌰" : "·"}
                        </div>
                      );
                    })}
                    {showAlmondLostText && <span style={{ fontSize: "0.75rem", color: "var(--aa-coral)", fontWeight: 600, animation: "aaFadeUp 0.3s ease-out" }}>-1</span>}
                  </div>
                </div>
                {almonds && !almonds.is_full ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 100, border: "1px solid var(--aa-border)", background: "var(--aa-s3)", fontSize: "0.8rem", color: "var(--aa-text-3)", fontFamily: "var(--aa-fb)" }}>
                    <Clock3 size={13} />
                    Refills in {almonds.minutes_until_reset ?? 30}m
                  </div>
                ) : null}
              </div>

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

            {/* Setup screen */}
            {!activeSession && !sessionFinished && !isTutorFlow && (
              <div className="aa-anim-fade-up" style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "36px 32px" }}>
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
                      {subjectList.map((s: string) => <option key={s} value={s}>{s}</option>)}
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
                  onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = "var(--aa-amber-lt)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}>
                  {loading ? "Starting session…" : "Start 10-question session →"}
                </button>
              </div>
            )}

            {/* Generating overlay */}
            {generating && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "60px 32px", background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)" }}>
                <Loader2 size={32} style={{ color: "var(--aa-amber)", animation: "spin 1s linear infinite" }} />
                <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 700, color: "var(--aa-text-1)" }}>Generating MCQs for <em>{requestedTopic}</em>…</p>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.85rem", color: "var(--aa-text-3)" }}>AlmondAI is crafting questions just for this topic</p>
              </div>
            )}

            {/* Question card */}
            {activeSession && !sessionFinished && currentQuestion && !generating && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "32px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", animation: "aaFadeUp 0.3s ease-out both" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ padding: "4px 12px", borderRadius: 100, background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.16)", fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 600, color: "var(--aa-amber)" }}>{currentQuestion.subject}</span>
                      {currentQuestion.topic && <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-3)" }}>· {currentQuestion.topic}</span>}
                    </div>
                    {diff && (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 100, background: diff.bg, fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 600, color: diff.color }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: diff.color }} />
                        {diff.label}
                      </span>
                    )}
                  </div>

                  <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 600, color: "var(--aa-text-1)", lineHeight: 1.65, marginBottom: 26, letterSpacing: "-0.01em" }}>
                    {currentQuestion.question_text}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(["a","b","c","d"] as OptionKey[]).map((key) => (
                      <OptionBtn key={key} optKey={key} text={getOptionValue(currentQuestion, key)} selectedOption={selectedOption} submittedResult={submittedResult} disabled={!!submittedResult} onSelect={setSelectedOption} />
                    ))}
                  </div>

                  <button type="button"
                    onClick={() => { if (!submittedResult) void submitCurrentAnswer(); else void moveNext(); }}
                    disabled={!submittedResult && !selectedOption}
                    style={{ marginTop: 22, width: "100%", padding: "15px 0", borderRadius: 100, fontFamily: "var(--aa-fb)", fontSize: "0.95rem", fontWeight: 700, cursor: (!submittedResult && !selectedOption) ? "not-allowed" : "pointer", transition: "all 0.2s",
                      background: (!submittedResult && !selectedOption) ? "transparent" : "var(--aa-amber)",
                      color:      (!submittedResult && !selectedOption) ? "var(--aa-text-3)" : "#131313",
                      border:     (!submittedResult && !selectedOption) ? "1px solid var(--aa-border2)" : "none",
                      boxShadow:  (!submittedResult && !selectedOption) ? "none" : "0 4px 20px rgba(213,197,168,0.2)",
                    } as React.CSSProperties}
                    onMouseEnter={(e) => { if (submittedResult || selectedOption) { e.currentTarget.style.background = "var(--aa-amber-lt)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = (!submittedResult && !selectedOption) ? "transparent" : "var(--aa-amber)"; e.currentTarget.style.transform = ""; }}>
                    {!submittedResult && !selectedOption ? "Choose an answer" : submittedResult ? (currentIndex === totalQuestions - 1 ? "View Results →" : "Continue →") : "Check Answer"}
                  </button>
                </div>

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

            {/* Results screen */}
            {sessionFinished && (() => {
              const msg = completionMessage(correctCount);
              return (
                <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "40px 32px", animation: "aaBounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                  <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--aa-text-3)", marginBottom: 16 }}>Session Complete</p>
                    <ScoreRing pct={accuracy} correct={correctCount} total={totalQuestions || TOTAL_QUESTIONS} color={msg.color} />
                    <div style={{ fontSize: "2rem", marginBottom: 10 }}>{msg.emoji}</div>
                    <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 700, color: "var(--aa-text-1)", marginBottom: 4 }}>
                      {correctCount >= 8 ? "Outstanding!" : correctCount >= 6 ? "Good work!" : correctCount >= 4 ? "Keep going!" : "Study more"}
                    </p>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)", lineHeight: 1.6 }}>{msg.text}</p>
                  </div>

                  {(correctCount >= 7 || accuracy >= 70) ? (
                    <div style={{ borderRadius: "var(--aa-r-lg)", border: "1px solid rgba(34,197,94,0.28)", background: "rgba(34,197,94,0.07)", padding: "16px 20px", marginBottom: 20 }}>
                      <p style={{ fontFamily: "var(--aa-fd)", fontSize: "0.9rem", fontWeight: 700, color: "var(--aa-green)", marginBottom: 4 }}>Topic progress updated ✓</p>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "rgba(34,197,94,0.7)", lineHeight: 1.55 }}>AlmondAI has marked this topic as understood in your Syllabus Map.</p>
                      {progressNotice && <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "rgba(34,197,94,0.6)", marginTop: 6 }}>{progressNotice}</p>}
                    </div>
                  ) : (
                    <div style={{ borderRadius: "var(--aa-r-lg)", border: "1px solid rgba(230,200,122,0.28)", background: "rgba(230,200,122,0.07)", padding: "16px 20px", marginBottom: 20 }}>
                      <p style={{ fontFamily: "var(--aa-fd)", fontSize: "0.9rem", fontWeight: 700, color: "var(--aa-caution)", marginBottom: 4 }}>Let&apos;s review this with AI Tutor</p>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "rgba(230,200,122,0.65)", lineHeight: 1.55 }}>A detailed explanation will help lock this topic in.</p>
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
                </div>
              );
            })()}

            {error && (
              <div style={{ marginTop: 12, padding: "14px 18px", borderRadius: "var(--aa-r-lg)", background: "rgba(228,180,160,0.08)", border: "1px solid rgba(228,180,160,0.25)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-coral)" }}>
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
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  COMPETE TAB                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "compete" && (
          <div className="aa-anim-fade-up">

            {/* IDLE — create or join */}
            {competeState === "idle" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Create room */}
                <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "28px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(213,197,168,0.09)", border: "1px solid rgba(213,197,168,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Crown size={18} style={{ color: "var(--aa-amber)" }} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1rem", fontWeight: 700, color: "var(--aa-text-1)" }}>Create Room</p>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)" }}>Host a live battle</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "var(--aa-fb)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--aa-text-3)", marginBottom: 6 }}>Subject</div>
                    <select value={competeSubject} onChange={(e) => setCompeteSubject(e.target.value)} className="aa-input select-aa-input">
                      {subjectList.map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "var(--aa-fb)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--aa-text-3)", marginBottom: 6 }}>Topic (optional)</div>
                    <input type="text" value={competeTopic} onChange={(e) => setCompeteTopic(e.target.value)} placeholder="e.g. Brachial Plexus" className="aa-input" style={{ width: "100%", boxSizing: "border-box" }} />
                  </div>

                  <button type="button" onClick={() => void handleCreateRoom()} disabled={competeLoading}
                    style={{ width: "100%", padding: "12px 0", borderRadius: 100, background: "var(--aa-amber)", border: "none", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 700, cursor: competeLoading ? "not-allowed" : "pointer", opacity: competeLoading ? 0.7 : 1, transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if (!competeLoading) e.currentTarget.style.background = "var(--aa-amber-lt)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}>
                    {competeLoading ? "Creating…" : "Create Room →"}
                  </button>
                </div>

                {/* Join room */}
                <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "28px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(213,197,168,0.09)", border: "1px solid rgba(213,197,168,0.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={18} style={{ color: "var(--aa-amber)" }} strokeWidth={1.8} />
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1rem", fontWeight: 700, color: "var(--aa-text-1)" }}>Join Room</p>
                      <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)" }}>Enter a friend&apos;s code</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: "var(--aa-fb)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--aa-text-3)", marginBottom: 6 }}>Room Code</div>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AB12CD"
                      maxLength={6}
                      className="aa-input"
                      style={{ width: "100%", boxSizing: "border-box", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleJoinRoom(); }}
                    />
                  </div>

                  <button type="button" onClick={() => void handleJoinRoom()} disabled={competeLoading || !joinCode.trim()}
                    style={{ width: "100%", padding: "12px 0", borderRadius: 100, border: "1px solid var(--aa-border2)", background: "transparent", color: "var(--aa-text-2)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, cursor: (competeLoading || !joinCode.trim()) ? "not-allowed" : "pointer", opacity: (competeLoading || !joinCode.trim()) ? 0.5 : 1, transition: "all 0.2s" }}
                    onMouseEnter={(e) => { if (!competeLoading && joinCode.trim()) { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; e.currentTarget.style.color = "var(--aa-amber)"; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--aa-border2)"; e.currentTarget.style.color = "var(--aa-text-2)"; }}>
                    {competeLoading ? "Joining…" : "Join Room →"}
                  </button>
                </div>
              </div>
            )}

            {/* WAITING — lobby */}
            {competeState === "waiting" && competeRoom && (
              <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "40px 32px", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.18)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Zap size={24} style={{ color: "var(--aa-amber)" }} strokeWidth={1.8} />
                </div>
                <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.4rem", fontWeight: 800, color: "var(--aa-text-1)", marginBottom: 6 }}>Waiting for players…</h2>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 28 }}>Share the room code with your peers</p>

                {/* Room code display */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 24px", borderRadius: 16, background: "var(--aa-s3)", border: "1px solid var(--aa-border2)", marginBottom: 28 }}>
                  <span style={{ fontFamily: "var(--aa-fd)", fontSize: "2rem", fontWeight: 900, color: "var(--aa-amber)", letterSpacing: "0.2em" }}>{competeRoom.code}</span>
                  <button type="button" onClick={copyRoomCode} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--aa-border)", background: "transparent", color: copiedCode ? "var(--aa-green)" : "var(--aa-text-3)", fontFamily: "var(--aa-fb)", fontSize: "0.78rem", cursor: "pointer", transition: "all 0.18s" }}>
                    <Copy size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    {copiedCode ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Participants */}
                <div style={{ marginBottom: 28 }}>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{competeParticipants.length} player{competeParticipants.length !== 1 ? "s" : ""} joined</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                    {competeParticipants.map((p) => (
                      <div key={p.user_id} style={{ padding: "6px 14px", borderRadius: 100, background: "rgba(213,197,168,0.07)", border: "1px solid rgba(213,197,168,0.18)", fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-2)" }}>
                        {p.display_name ?? "Player"}
                      </div>
                    ))}
                  </div>
                </div>

                {isHost ? (
                  <button type="button" onClick={() => void handleStartRoom()} disabled={competeLoading || competeParticipants.length < 1}
                    style={{ padding: "14px 40px", borderRadius: 100, background: "var(--aa-amber)", border: "none", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 20px rgba(213,197,168,0.25)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--aa-amber-lt)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}>
                    {competeLoading ? "Starting…" : "Start Battle →"}
                  </button>
                ) : (
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--aa-amber)" }} />
                    Waiting for host to start…
                  </p>
                )}
              </div>
            )}

            {/* ACTIVE — compete question */}
            {competeState === "active" && competeQuestion && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Score bar */}
                <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Trophy size={16} style={{ color: "var(--aa-amber)" }} />
                    <span style={{ fontFamily: "var(--aa-fd)", fontSize: "0.9rem", fontWeight: 700, color: "var(--aa-amber)" }}>Your score: {myScore}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {competeParticipants.map((p) => (
                      <div key={p.user_id} style={{ padding: "3px 10px", borderRadius: 100, background: "var(--aa-s3)", border: "1px solid var(--aa-border)", fontFamily: "var(--aa-fb)", fontSize: "0.72rem", color: "var(--aa-text-2)" }}>
                        {p.display_name ?? "Player"}: {p.score}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.8rem", color: "var(--aa-text-3)" }}>
                    {competeIndex + 1}/{competeQuestions.length}
                  </span>
                </div>

                {/* Question card */}
                <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "32px", animation: "aaFadeUp 0.3s ease-out both" }}>
                  <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 600, color: "var(--aa-text-1)", lineHeight: 1.65, marginBottom: 26, letterSpacing: "-0.01em" }}>
                    {competeQuestion.question_text}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(["a","b","c","d"] as OptionKey[]).map((key) => {
                      const isSelected  = competeSelected === key;
                      const isCorrect   = competeResult?.correct_option === key;
                      const isWrong     = Boolean(competeResult && isSelected && !competeResult.is_correct);
                      let borderColor = "var(--aa-border)";
                      let bgColor     = "rgba(31,31,31,0.6)";
                      let labelBg     = "var(--aa-s3)";
                      let labelColor  = "var(--aa-amber)";
                      if (!competeResult && isSelected) { borderColor = "var(--aa-amber)"; bgColor = "rgba(213,197,168,0.06)"; labelBg = "var(--aa-amber)"; labelColor = "#131313"; }
                      if (competeResult && isCorrect)   { borderColor = "var(--aa-green)"; bgColor = "rgba(34,197,94,0.06)";   labelBg = "var(--aa-green)"; labelColor = "#131313"; }
                      if (competeResult && isWrong)     { borderColor = "var(--aa-coral)"; bgColor = "rgba(228,180,160,0.06)"; labelBg = "var(--aa-coral)"; labelColor = "#131313"; }
                      return (
                        <button key={key} type="button"
                          onClick={() => { if (!competeResult) setCompeteSelected(key); }}
                          disabled={!!competeResult}
                          style={{ width: "100%", borderRadius: "var(--aa-r-lg)", border: `1.5px solid ${borderColor}`, background: bgColor, padding: "14px 18px", textAlign: "left", cursor: competeResult ? "default" : "pointer", transition: "all 0.18s ease", display: "flex", alignItems: "flex-start", gap: 14, fontFamily: "var(--aa-fb)" }}>
                          <span style={{ width: 30, height: 30, borderRadius: 8, background: labelBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--aa-fd)", fontSize: "0.8rem", fontWeight: 800, color: labelColor, flexShrink: 0, transition: "all 0.18s" }}>{key.toUpperCase()}</span>
                          <span style={{ fontSize: "0.9rem", color: "var(--aa-text-1)", lineHeight: 1.6, flex: 1, paddingTop: 5 }}>{getOptionValue(competeQuestion, key)}</span>
                          {competeResult && isCorrect && <CheckCircle2 size={18} style={{ color: "var(--aa-green)", flexShrink: 0, marginTop: 6 }} />}
                          {competeResult && isWrong   && <XCircle      size={18} style={{ color: "var(--aa-coral)", flexShrink: 0, marginTop: 6 }} />}
                        </button>
                      );
                    })}
                  </div>

                  <button type="button"
                    onClick={() => { if (!competeResult) void handleCompeteSubmit(); else moveCompeteNext(); }}
                    disabled={!competeResult && !competeSelected}
                    style={{ marginTop: 22, width: "100%", padding: "15px 0", borderRadius: 100, fontFamily: "var(--aa-fb)", fontSize: "0.95rem", fontWeight: 700, cursor: (!competeResult && !competeSelected) ? "not-allowed" : "pointer", transition: "all 0.2s",
                      background: (!competeResult && !competeSelected) ? "transparent" : "var(--aa-amber)",
                      color:      (!competeResult && !competeSelected) ? "var(--aa-text-3)" : "#131313",
                      border:     (!competeResult && !competeSelected) ? "1px solid var(--aa-border2)" : "none",
                      boxShadow:  (!competeResult && !competeSelected) ? "none" : "0 4px 20px rgba(213,197,168,0.2)",
                    } as React.CSSProperties}>
                    {!competeResult && !competeSelected ? "Choose an answer" : competeResult ? (competeIndex >= competeQuestions.length - 1 ? "View Results →" : "Next Question →") : "Submit Answer"}
                  </button>
                </div>

                {competeResult && (
                  <div style={{ borderRadius: "var(--aa-r-lg)", padding: "16px 20px", border: `2px solid ${competeResult.is_correct ? "rgba(34,197,94,0.35)" : "rgba(228,180,160,0.35)"}`, background: competeResult.is_correct ? "rgba(34,197,94,0.05)" : "rgba(228,180,160,0.05)" }}>
                    <p style={{ fontFamily: "var(--aa-fd)", fontSize: "0.9rem", fontWeight: 700, color: competeResult.is_correct ? "var(--aa-green)" : "var(--aa-coral)", marginBottom: 6 }}>
                      {competeResult.is_correct ? "✅ Correct!" : "❌ Incorrect"}
                    </p>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.85rem", color: "var(--aa-text-2)", lineHeight: 1.65 }}>{competeResult.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* FINISHED — compete results */}
            {competeState === "finished" && (
              <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "40px 32px", textAlign: "center", animation: "aaBounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                <div style={{ fontSize: "3rem", marginBottom: 16 }}>🏆</div>
                <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.6rem", fontWeight: 800, color: "var(--aa-text-1)", marginBottom: 6 }}>Battle Complete!</h2>
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)", marginBottom: 32 }}>Final scores</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32, maxWidth: 360, margin: "0 auto 32px" }}>
                  {[...competeParticipants].sort((a, b) => b.score - a.score).map((p, i) => (
                    <div key={p.user_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: "var(--aa-r-lg)", background: i === 0 ? "rgba(213,197,168,0.08)" : "var(--aa-s3)", border: `1px solid ${i === 0 ? "rgba(213,197,168,0.3)" : "var(--aa-border)"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 800, color: i === 0 ? "var(--aa-amber)" : "var(--aa-text-3)" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                        <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-1)" }}>{p.display_name ?? "Player"}</span>
                      </div>
                      <span style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 800, color: i === 0 ? "var(--aa-amber)" : "var(--aa-text-2)" }}>{p.score}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button type="button" onClick={() => { setCompeteState("idle"); setCompeteRoom(null); setCompeteQuestions([]); setCompeteParticipants([]); setMyScore(0); setCompeteIndex(0); setCompeteResult(null); setCompeteSelected(null); }}
                    style={{ padding: "12px 28px", borderRadius: 100, border: "1px solid var(--aa-border2)", background: "transparent", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(213,197,168,0.4)"; e.currentTarget.style.color = "var(--aa-amber)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--aa-border2)"; e.currentTarget.style.color = "var(--aa-text-2)"; }}>
                    Play Again
                  </button>
                  <button type="button" onClick={() => setActiveTab("practice")}
                    style={{ padding: "12px 28px", borderRadius: 100, background: "var(--aa-amber)", border: "none", color: "#131313", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--aa-amber-lt)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--aa-amber)"; }}>
                    Back to Practice
                  </button>
                </div>
              </div>
            )}

            {competeError && (
              <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: "var(--aa-r-lg)", background: "rgba(228,180,160,0.08)", border: "1px solid rgba(228,180,160,0.25)", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-coral)" }}>
                {competeError}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/*  PYQs TAB                                                           */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === "pyqs" && (
          <div className="aa-anim-fade-up" style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-xl)", padding: "60px 32px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(213,197,168,0.07)", border: "1px solid rgba(213,197,168,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28 }}>
              📚
            </div>
            <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.5rem", fontWeight: 800, color: "var(--aa-text-1)", marginBottom: 10, letterSpacing: "-0.02em" }}>
              Past Year Questions
            </h2>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 28px" }}>
              PYQ practice for MBBS finals and PG entrance exams is coming soon. We&apos;re curating thousands of verified past year questions across all subjects.
            </p>
            <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 32 }}>
              {["NEET-PG", "USMLE", "MBBS Finals", "AIIMS", "PGI"].map((exam) => (
                <span key={exam} style={{ padding: "6px 16px", borderRadius: 100, background: "var(--aa-s3)", border: "1px solid var(--aa-border)", fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)" }}>
                  {exam}
                </span>
              ))}
            </div>
            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--aa-amber)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              Coming soon — check back soon!
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
