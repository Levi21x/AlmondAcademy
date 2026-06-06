"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Brain,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Lock,
  Moon,
  RefreshCw,
  Shield,
  Target,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  activateCrisisMode,
  generateLastNightPlan,
  getActivationStatus,
  getTeachingContent,
  recalibrateSession,
  updateTopicProgress,
  type CrisisActivationStatus,
  type CrisisHourBlock,
  type CrisisSession,
  type LastNightPlan,
  type PreparationLevel,
  type TeachingContent,
} from "@/lib/api/crisis.api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useSubjectList } from "@/lib/hooks/useSubjectList";
import { useAuthStore } from "@/lib/store/authStore";

import { AskAIPanel } from "./AskAIPanel";
import { HighYieldBoard } from "./HighYieldBoard";
import { LastNightMode } from "./LastNightMode";
import { PanicBanner } from "./PanicBanner";
import { ReadinessMeter } from "./ReadinessMeter";
import { SacrificePanel } from "./SacrificePanel";
import { TacticalTimeline } from "./TacticalTimeline";

// ── Constants ─────────────────────────────────────────────────────────────────

const PREP_OPTIONS: Array<{ key: PreparationLevel; title: string; description: string }> = [
  { key: "zero",     title: "Zero",     description: "Haven't studied anything" },
  { key: "little",   title: "Little",   description: "Less than 25% covered" },
  { key: "moderate", title: "Moderate", description: "About half covered" },
  { key: "good",     title: "Good",     description: "Need targeted revision" },
];

const LOADING_STEPS = [
  "Analysing your syllabus completion...",
  "Computing readiness score...",
  "Identifying highest-yield topics...",
  "Running the sacrifice engine...",
  "Building your hour-by-hour schedule...",
  "Finalising your War Room...",
];

type SessionTab = "today" | "strategy" | "timeline" | "ask";
type TeachTab = "explanation" | "key-points" | "exam-tips";

// ── Small helpers ─────────────────────────────────────────────────────────────

function daysLabel(examDate: string) {
  const days = Math.max(
    0,
    Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000),
  );
  if (days === 0) return "Exam day";
  if (days <= 3) return `${days}d remaining — critical`;
  if (days <= 7) return `${days}d remaining — urgent`;
  return `${days} days remaining`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CrisisWarRoom() {
  const fallbackToken = useAuthStore((s) => s.accessToken);
  const { subjects: subjectList } = useSubjectList();

  // Auth
  const getToken = useCallback(async () => {
    const sb = getSupabaseClient();
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token ?? fallbackToken ?? null;
  }, [fallbackToken]);

  // Status
  const [status, setStatus] = useState<CrisisActivationStatus | null>(null);
  const [session, setSession] = useState<CrisisSession | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activation form
  const [examName, setExamName] = useState("MBBS University Finals");
  const [examDate, setExamDate] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [prepLevel, setPrepLevel] = useState<PreparationLevel>("zero");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [stressLevel, setStressLevel] = useState(5);
  const [message, setMessage] = useState("");

  // Activation loading
  const [isActivating, setIsActivating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Last-Night mode
  const [showLastNight, setShowLastNight] = useState(false);
  const [lastNightPlan, setLastNightPlan] = useState<LastNightPlan | null>(null);
  const [generatingLastNight, setGeneratingLastNight] = useState(false);
  const [lastNightHours, setLastNightHours] = useState(6);

  // Session tabs
  const [activeTab, setActiveTab] = useState<SessionTab>("today");

  // Recalibrate modal
  const [recalibrateOpen, setRecalibrateOpen] = useState(false);
  const [recalHours, setRecalHours] = useState(8);
  const [recalPrep, setRecalPrep] = useState<PreparationLevel>("moderate");
  const [recalibrating, setRecalibrating] = useState(false);

  // Teach modal
  const [teachModal, setTeachModal] = useState<{ open: boolean; block: CrisisHourBlock | null }>({
    open: false,
    block: null,
  });
  const [teaching, setTeaching] = useState<TeachingContent | null>(null);
  const [teachLoading, setTeachLoading] = useState(false);
  const [teachTab, setTeachTab] = useState<TeachTab>("explanation");

  // ── Load status ─────────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await getActivationStatus(token);
      setStatus(res);
      setSession(res.active_session);
      if (res.active_session) {
        setRecalHours(Math.round(res.active_session.available_hours_per_day));
        setRecalPrep(res.active_session.preparation_level);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load crisis status");
    } finally {
      setLoadingStatus(false);
    }
  }, [getToken]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  // Loading step ticker
  useEffect(() => {
    if (!isActivating) return;
    const id = window.setInterval(
      () => setStepIndex((p) => Math.min(p + 1, LOADING_STEPS.length - 1)),
      2200,
    );
    return () => window.clearInterval(id);
  }, [isActivating]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const todayData = useMemo(() => {
    if (!session?.crisis_plan?.days?.length) return null;
    return (
      session.crisis_plan.days.find((day) => {
        const done = (session.topic_progress ?? []).filter(
          (e) => e.day_number === day.day && e.is_completed,
        ).length;
        return done < day.hours.length;
      }) ?? session.crisis_plan.days[0]
    );
  }, [session]);

  const todayProgress = useMemo(() => {
    if (!session || !todayData) return { done: 0, total: 0, pct: 0 };
    const total = todayData.hours.length;
    const done = (session.topic_progress ?? []).filter(
      (e) => e.day_number === todayData.day && e.is_completed,
    ).length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [session, todayData]);

  const panicInfo = session?.strategy?.panic;
  const readiness = session?.strategy?.readiness;
  const highYield = session?.strategy?.high_yield;
  const sacrifice = session?.strategy?.sacrifice;
  const survivalAdvice = session?.strategy?.survival_advice;
  const emergencyTips = session?.strategy?.emergency_tips ?? [];

  // ── Actions ──────────────────────────────────────────────────────────────────

  const toggleSubject = (s: string) =>
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const activate = async () => {
    if (!examName.trim() || !examDate || selectedSubjects.length === 0) {
      setError("Please fill in all required fields.");
      return;
    }
    setIsActivating(true);
    setStepIndex(0);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const created = await activateCrisisMode(token, {
        exam_name: examName.trim(),
        exam_date: examDate,
        subjects: selectedSubjects,
        preparation_level: prepLevel,
        available_hours_per_day: hoursPerDay,
        stress_level: stressLevel,
        mode: "standard",
        message: message.trim(),
      });
      setSession(created);
      setActiveTab("today");
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              active_session: created,
              can_activate: prev.is_premium,
              free_activation_used: prev.is_premium ? prev.free_activation_used : true,
            }
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate crisis mode");
    } finally {
      setIsActivating(false);
    }
  };

  const markComplete = async (dayNumber: number, topicName: string, done: boolean) => {
    if (!session) return;
    const token = await getToken();
    if (!token) return;
    await updateTopicProgress(token, session.id, {
      day_number: dayNumber,
      topic_name: topicName,
      is_completed: done,
    });
    await loadStatus();
  };

  const doRecalibrate = async () => {
    if (!session) return;
    setRecalibrating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const updated = await recalibrateSession(token, session.id, {
        available_hours_per_day: recalHours,
        preparation_level: recalPrep,
      });
      setSession(updated);
      setRecalibrateOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recalibration failed");
    } finally {
      setRecalibrating(false);
    }
  };

  const openTeach = async (block: CrisisHourBlock) => {
    if (!session) return;
    setTeachModal({ open: true, block });
    setTeachTab("explanation");
    setTeaching(null);
    setTeachLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Auth required");
      const content = await getTeachingContent(token, session.id, {
        topic_name: block.topic,
        subject: block.subject,
        key_points: block.key_points ?? [],
        exam_tip: block.exam_tip ?? "",
      });
      setTeaching(content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load teaching content");
    } finally {
      setTeachLoading(false);
    }
  };

  const doLastNight = async () => {
    setGeneratingLastNight(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Auth required");
      const plan = await generateLastNightPlan(token, {
        exam_name: session?.exam_name ?? examName,
        subjects: session?.subjects ?? selectedSubjects,
        hours_available: lastNightHours,
      });
      setLastNightPlan(plan);
      setShowLastNight(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate last-night plan");
    } finally {
      setGeneratingLastNight(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loadingStatus) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm" style={{ color: "var(--aa-text-3)" }}>
        <span className="aa-typing-dot" />
        <span className="aa-typing-dot" style={{ animationDelay: "0.2s" }} />
        <span className="aa-typing-dot" style={{ animationDelay: "0.4s" }} />
        <span className="ml-2">Loading Crisis Mode...</span>
      </div>
    );
  }

  // If Last-Night plan is generated, show it
  if (lastNightPlan) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={16} strokeWidth={2} className="text-[#ffb4ab]" />
            <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
              Last-Night Emergency Plan
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLastNightPlan(null)}
            className="rounded-lg border border-[#4c463d] px-3 py-1.5 text-xs text-[#cec5b9] hover:text-[#fff2de]"
          >
            Back
          </button>
        </div>
        <LastNightMode plan={lastNightPlan} />
      </div>
    );
  }

  // Premium locked
  const locked = status && !status.can_activate && !session;

  if (locked) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className="w-full max-w-md rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#5a2f2a] bg-[#2c1d1b]">
            <Lock size={20} strokeWidth={2} className="text-[#ffb4ab]" />
          </div>
          <h2 className="aa-h2 text-[var(--aa-text-1)]">Crisis Mode — Premium</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--aa-text-3)" }}>
            You have used your free activation. Upgrade for unlimited access.
          </p>
          <Link
            href="/upgrade"
            className="aa-press mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ffcf9d] px-5 py-2.5 text-sm font-semibold text-[#3f2a16]"
          >
            Upgrade to Premium
            <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Input form (no active session) ───────────────────────────────────────────

  if (!session) {
    return (
      <div className="aa-anim-fade-up space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#5a2f2a]"
            style={{ background: "rgba(255,207,157,0.06)" }}
          >
            <Zap size={16} strokeWidth={2} style={{ color: "#ffcf9d" }} />
          </div>
          <div>
            <h2 className="aa-h2 text-[var(--aa-text-1)]">Crisis War Room</h2>
            <p className="text-xs" style={{ color: "var(--aa-text-3)" }}>
              Emergency exam preparation · Tactical AI analysis
            </p>
          </div>
        </div>

        {status && !status.free_activation_used && (
          <div className="rounded-xl border border-green-800/50 bg-green-900/15 px-4 py-2.5 text-sm text-green-300">
            1 free activation available
          </div>
        )}

        {isActivating ? (
          // Loading state
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-[#5a2f2a] bg-[#131313] p-8"
          >
            <div className="mb-6 flex justify-center">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[#ffcf9d]/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <Zap size={22} strokeWidth={2} style={{ color: "#ffcf9d" }} />
              </div>
            </div>
            <p className="mb-6 text-center text-base font-semibold text-[#fff2de]">
              AlmondAI is building your War Room...
            </p>
            <div className="space-y-2">
              {LOADING_STEPS.map((step, i) => {
                const visible = i <= stepIndex;
                const complete = i < stepIndex;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2.5 text-sm transition-opacity duration-500 ${
                      visible ? "opacity-100" : "opacity-20"
                    }`}
                  >
                    {complete ? (
                      <Check size={14} strokeWidth={2.5} className="shrink-0 text-green-400" />
                    ) : (
                      <div
                        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full"
                        style={{ background: "#ffcf9d" }}
                      />
                    )}
                    <span style={{ color: "var(--aa-text-3)" }}>{step}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-center text-xs" style={{ color: "var(--aa-text-3)" }}>
              This takes 20-30 seconds
            </p>
          </motion.div>
        ) : (
          // Form — asymmetric 2-column layout (taste-skill DESIGN_VARIANCE: 8)
          <div className="rounded-2xl border border-[#353534] bg-[#131313]">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_1px_1fr]">
              {/* Left column: exam details */}
              <div className="space-y-5 p-6">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                  Exam Details
                </p>

                <label className="block">
                  <span className="mb-1.5 block text-xs text-[#cec5b9]">Exam name</span>
                  <input
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    className="aa-input w-full rounded-xl text-sm"
                    placeholder="MBBS University Finals"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs text-[#cec5b9]">Exam date</span>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="aa-input w-full rounded-xl text-sm"
                  />
                  {examDate && (
                    <p className="mt-1 text-xs" style={{ color: "#ffcf9d" }}>
                      {daysLabel(examDate)}
                    </p>
                  )}
                </label>

                {/* Preparation level */}
                <div>
                  <p className="mb-2 text-xs text-[#cec5b9]">Current preparation</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PREP_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setPrepLevel(opt.key)}
                        className={`aa-press rounded-xl border p-3 text-left transition-colors ${
                          prepLevel === opt.key
                            ? "border-[#ffcf9d] bg-[#ffcf9d]/07"
                            : "border-[#353534] bg-[#1f1f1f]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#fff2de]">{opt.title}</p>
                        <p className="text-[0.65rem] text-[#8f887e]">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hours slider */}
                <div>
                  <p className="mb-1 text-xs text-[#cec5b9]">
                    Hours per day: <span className="font-semibold text-[#fff2de]">{hoursPerDay}</span>
                  </p>
                  <input
                    type="range"
                    min={4}
                    max={16}
                    step={1}
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(Number(e.target.value))}
                    className="w-full accent-[#ffcf9d]"
                  />
                  <div className="mt-0.5 flex justify-between text-[0.58rem] text-[#4c463d]">
                    <span>4h</span>
                    <span>16h</span>
                  </div>
                </div>

                {/* Stress level */}
                <div>
                  <p className="mb-1 text-xs text-[#cec5b9]">
                    Stress level: <span className="font-semibold text-[#fff2de]">{stressLevel}/10</span>
                    {stressLevel >= 8 && (
                      <span className="ml-2 text-[0.6rem] text-[#e6c87a]">— panic detection active</span>
                    )}
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={stressLevel}
                    onChange={(e) => setStressLevel(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: stressLevel >= 8 ? "#e4b4a0" : "#d5c5a8" }}
                  />
                </div>

                {/* Optional message */}
                <div>
                  <span className="mb-1.5 block text-xs text-[#cec5b9]">
                    What's on your mind? <span className="text-[#4c463d]">(optional)</span>
                  </span>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. I haven't studied anything and I'm scared..."
                    className="aa-input w-full resize-none rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="hidden bg-[#353534] md:block" />

              {/* Right column: subjects */}
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                    Subjects to cover
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedSubjects(
                        selectedSubjects.length === subjectList.length ? [] : subjectList,
                      )
                    }
                    className="text-[0.62rem] underline"
                    style={{ color: "var(--aa-amber)" }}
                  >
                    {selectedSubjects.length === subjectList.length ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {subjectList.map((subject) => {
                    const active = selectedSubjects.includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`aa-press rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          active
                            ? "border-[#ffcf9d]/40 bg-[#ffcf9d]/07 text-[#fff2de]"
                            : "border-[#353534] bg-[#1f1f1f] text-[#cec5b9]"
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Form footer */}
            <div className="flex items-center justify-between gap-4 border-t border-[#353534] px-6 py-4">
              <p className="text-xs" style={{ color: "var(--aa-text-3)" }}>
                {status && !status.is_premium && !status.free_activation_used
                  ? "This will use your 1 free activation."
                  : ""}
              </p>
              <div className="flex items-center gap-2">
                {/* Last Night Mode shortcut */}
                <button
                  type="button"
                  onClick={() => setShowLastNight(true)}
                  className="aa-press rounded-xl border border-[#5a2f2a] bg-[#2c1d1b] px-4 py-2.5 text-sm text-[#ffb4ab] transition-colors hover:border-[#7a3f30]"
                >
                  <Moon size={13} strokeWidth={2} className="mr-1.5 inline-block" />
                  Last Night Mode
                </button>
                <button
                  type="button"
                  onClick={() => void activate()}
                  className="aa-press rounded-xl bg-[#ffcf9d] px-5 py-2.5 text-sm font-semibold text-[#3f2a16]"
                >
                  <Zap size={13} strokeWidth={2.5} className="mr-1.5 inline-block" />
                  Activate War Room
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-lg border border-[#7a3f30] bg-[#2c1d1b] px-4 py-3 text-sm"
            style={{ color: "#ffcf9d" }}
          >
            <AlertTriangle size={13} strokeWidth={2} className="mr-2 inline-block" />
            {error}
          </div>
        )}

        {/* Last Night modal */}
        <AnimatePresence>
          {showLastNight && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="w-full max-w-sm rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-headline text-lg font-bold text-[#fff2de]">Last Night Mode</h3>
                  <button
                    type="button"
                    onClick={() => setShowLastNight(false)}
                    className="rounded-md p-1 text-[#8f887e] hover:text-[#cec5b9]"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
                <p className="mb-4 text-sm text-[#cec5b9]">
                  Emergency revision plan for the night before your exam.
                </p>
                <label className="block">
                  <span className="mb-1 block text-xs text-[#cec5b9]">
                    Hours available: <strong className="text-[#fff2de]">{lastNightHours}</strong>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={lastNightHours}
                    onChange={(e) => setLastNightHours(Number(e.target.value))}
                    className="w-full accent-[#ffb4ab]"
                  />
                </label>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLastNight(false)}
                    className="flex-1 rounded-xl border border-[#4c463d] py-2.5 text-sm text-[#cec5b9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void doLastNight()}
                    disabled={generatingLastNight}
                    className="aa-press flex-1 rounded-xl bg-[#ffb4ab] py-2.5 text-sm font-semibold text-[#3f1d19] disabled:opacity-60"
                  >
                    {generatingLastNight ? "Generating..." : "Generate"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Active session War Room ──────────────────────────────────────────────────

  const TABS: Array<{ key: SessionTab; label: string; icon: React.ElementType }> = [
    { key: "today",    label: "Today",     icon: Clock },
    { key: "strategy", label: "Strategy",  icon: Target },
    { key: "timeline", label: "Timeline",  icon: Calendar },
    { key: "ask",      label: "Ask AI",    icon: Brain },
  ];

  return (
    <div className="aa-anim-fade-up space-y-4">
      {/* Session header */}
      <div className="rounded-xl border border-[#7a3f30] bg-gradient-to-r from-[#2a1d1b] to-[#1e1813] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-0.5 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#ffcf9d]">
              War Room Active
            </p>
            <h2 className="font-headline text-xl font-bold text-[#fff2de]">{session.exam_name}</h2>
            <p className="mt-0.5 text-xs text-[#ffcf9d]">{daysLabel(session.exam_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            {session.readiness_score !== null && (
              <div
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: "rgba(255,207,157,0.08)",
                  color: "#ffcf9d",
                  border: "1px solid rgba(255,207,157,0.2)",
                }}
              >
                {session.readiness_score}% ready
              </div>
            )}
            <button
              type="button"
              onClick={() => setRecalibrateOpen(true)}
              className="aa-press flex items-center gap-1.5 rounded-lg border border-[#ffcf9d]/30 px-3 py-2 text-xs text-[#fff2de]"
            >
              <RefreshCw size={11} strokeWidth={2} />
              Recalibrate
            </button>
            <button
              type="button"
              onClick={() => { setSession(null); void loadStatus(); }}
              className="aa-press rounded-lg border border-[#8f6c5a] px-3 py-2 text-xs text-[#cec5b9]"
            >
              End
            </button>
          </div>
        </div>
      </div>

      {/* Panic banner */}
      {panicInfo?.detected && (
        <PanicBanner
          severity={panicInfo.severity}
          anchorMessage={panicInfo.anchor_message}
        />
      )}

      {/* Internal tabs */}
      <div className="no-scrollbar flex gap-0 overflow-x-auto border-b border-[#353534]">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="aa-press flex shrink-0 items-center gap-1.5 px-4 py-3 text-[0.75rem] font-medium transition-colors"
              style={{
                borderBottom: isActive ? "2px solid var(--aa-amber)" : "2px solid transparent",
                color: isActive ? "var(--aa-amber)" : "var(--aa-text-3)",
                fontWeight: isActive ? 700 : 500,
                marginBottom: -1,
              }}
            >
              <Icon size={13} strokeWidth={isActive ? 2.2 : 1.9} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "today" && (
          <motion.div
            key="today"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-4"
          >
            {/* Readiness + survival advice row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
              {readiness && (
                <ReadinessMeter
                  score={session.readiness_score ?? readiness.readiness_score}
                  breakdown={readiness}
                />
              )}
              <div className="space-y-3">
                {survivalAdvice && (
                  <div className="rounded-xl border border-[#4c463d] bg-[#1f1f1f] px-4 py-3">
                    <p className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                      Survival Advice
                    </p>
                    <p className="text-sm leading-relaxed text-[#e5e2e1]">{survivalAdvice}</p>
                  </div>
                )}
                {emergencyTips.length > 0 && (
                  <div className="rounded-xl border border-[#353534] bg-[#1a1a1a] px-4 py-3">
                    <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--aa-text-3)" }}>
                      Emergency Tips
                    </p>
                    <ul className="space-y-1.5">
                      {emergencyTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#cec5b9]">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#d5c5a8]" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Today's blocks */}
            {todayData && (
              <div className="rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-headline text-xl font-bold text-[#fff2de]">
                      Day {todayData.day}
                    </h3>
                    <p className="text-sm text-[#ffcf9d]">{todayData.theme}</p>
                    <p className="text-xs text-[#8f887e]">{todayData.daily_goal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#ffcf9d]">{todayProgress.pct}%</p>
                    <p className="text-xs text-[#8f887e]">{todayProgress.done}/{todayProgress.total} done</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#353534]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#ffcf9d" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${todayProgress.pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <div className="space-y-2">
                  {todayData.hours.map((block, i) => {
                    const done = Boolean(
                      session.topic_progress?.some(
                        (p) => p.day_number === todayData.day && p.topic_name === block.topic && p.is_completed,
                      ),
                    );
                    return (
                      <div
                        key={`${block.topic}-${i}`}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-opacity ${
                          done ? "border-[#353534] bg-[#131313] opacity-55" : "border-[#4c463d] bg-[#1a1a1a]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={(e) => void markComplete(todayData.day, block.topic, e.target.checked)}
                          className="h-4 w-4 accent-[#ffcf9d]"
                          aria-label={`Mark ${block.topic} as complete`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${done ? "line-through text-[#8f887e]" : "text-[#e5e2e1]"}`}>
                            {block.topic}
                          </p>
                          <p className="text-[0.62rem] text-[#8f887e]">
                            {block.subject} · {block.time_block}
                          </p>
                        </div>
                        {!done && (
                          <button
                            type="button"
                            onClick={() => void openTeach(block)}
                            className="aa-press shrink-0 rounded-lg bg-[#ffcf9d] px-2.5 py-1.5 text-xs font-semibold text-[#3f2a16]"
                          >
                            Study
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Must-know + skip panels */}
            {(session.crisis_plan.must_know?.length > 0 ||
              session.crisis_plan.what_to_skip?.length > 0) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {session.crisis_plan.must_know?.length > 0 && (
                  <div className="rounded-xl border border-[#7a3f30] bg-[#1f1f1f] p-4">
                    <p className="mb-2 text-xs font-semibold text-[#ffcf9d]">Will appear in your exam</p>
                    <ul className="space-y-1 text-sm text-[#fff2de]">
                      {session.crisis_plan.must_know.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <Shield size={11} strokeWidth={2} className="mt-1 shrink-0 text-[#ffcf9d]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {session.crisis_plan.what_to_skip?.length > 0 && (
                  <div className="rounded-xl border border-[#353534] bg-[#1f1f1f] p-4">
                    <p className="mb-2 text-xs font-semibold text-[#8f887e]">Skip these — unlikely to appear</p>
                    <ul className="space-y-1 text-sm text-[#8f887e]">
                      {session.crisis_plan.what_to_skip.map((item) => (
                        <li key={item} className="flex items-start gap-2 line-through">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#4c463d]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "strategy" && (
          <motion.div
            key="strategy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {highYield ? (
              <HighYieldBoard highYield={highYield} survivalAdvice={survivalAdvice} />
            ) : (
              <div className="rounded-xl border border-dashed border-[#353534] bg-[#131313] p-8 text-center text-sm text-[#8f887e]">
                War Room strategy not available — try regenerating the session.
              </div>
            )}
            {sacrifice && <SacrificePanel sacrifice={sacrifice} />}
          </motion.div>
        )}

        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <TacticalTimeline
              days={session.crisis_plan.days ?? []}
              topicProgress={session.topic_progress ?? []}
              currentDayNumber={todayData?.day ?? 1}
              onToggle={markComplete}
              onStudyNow={openTeach}
            />
          </motion.div>
        )}

        {activeTab === "ask" && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <AskAIPanel sessionId={session.id} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-[#7a3f30] bg-[#2c1d1b] px-4 py-2.5 text-sm text-[#ffcf9d]">
          <AlertTriangle size={13} strokeWidth={2} className="mr-2 inline-block" />
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 text-[#8f887e]"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Recalibrate modal */}
      <AnimatePresence>
        {recalibrateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-headline text-lg font-bold text-[#fff2de]">Recalibrate Plan</h3>
                <button type="button" onClick={() => setRecalibrateOpen(false)} className="rounded-md p-1 text-[#8f887e]">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
              <p className="mb-4 text-sm text-[#8f887e]">Rebuilds the remaining schedule from today.</p>
              <label className="block">
                <span className="mb-1 block text-xs text-[#cec5b9]">
                  Hours per day: <strong className="text-[#fff2de]">{recalHours}</strong>
                </span>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={recalHours}
                  onChange={(e) => setRecalHours(Number(e.target.value))}
                  className="w-full accent-[#ffcf9d]"
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-[#cec5b9]">Preparation level now</span>
                <select
                  value={recalPrep}
                  onChange={(e) => setRecalPrep(e.target.value as PreparationLevel)}
                  className="aa-input w-full rounded-xl text-sm"
                >
                  {PREP_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.title} — {opt.description}</option>
                  ))}
                </select>
              </label>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecalibrateOpen(false)}
                  className="flex-1 rounded-xl border border-[#4c463d] py-2.5 text-sm text-[#cec5b9]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void doRecalibrate()}
                  disabled={recalibrating}
                  className="aa-press flex-1 rounded-xl bg-[#ffcf9d] py-2.5 text-sm font-semibold text-[#3f2a16] disabled:opacity-60"
                >
                  {recalibrating ? "Recalibrating..." : "Apply"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teach modal */}
      <AnimatePresence>
        {teachModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="w-full max-w-3xl rounded-2xl border border-[#5a2f2a] bg-[#1f1f1f] p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-headline text-2xl font-bold text-[#fff2de]">
                    {teachModal.block?.topic}
                  </h3>
                  <p className="text-sm text-[#ffcf9d]">{teachModal.block?.subject}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTeachModal({ open: false, block: null })}
                  className="rounded-md border border-[#4c463d] p-1.5 text-[#8f887e] hover:text-[#cec5b9]"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-2">
                {(["explanation", "key-points", "exam-tips"] as TeachTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTeachTab(t)}
                    className={`aa-press rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      teachTab === t
                        ? "bg-[#ffcf9d] text-[#3f2a16]"
                        : "border border-[#4c463d] text-[#cec5b9] hover:text-[#e5e2e1]"
                    }`}
                  >
                    {t === "explanation" ? "Explanation" : t === "key-points" ? "Key Points" : "Exam Tips"}
                  </button>
                ))}
              </div>

              <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-[#353534] bg-[#131313] p-4 text-sm text-[#e5e2e1]">
                {teachLoading && (
                  <div className="flex items-center gap-2 py-4 text-[#8f887e]">
                    <span className="aa-typing-dot" />
                    <span className="aa-typing-dot" style={{ animationDelay: "0.2s" }} />
                    <span className="aa-typing-dot" style={{ animationDelay: "0.4s" }} />
                    <span className="ml-2">Loading...</span>
                  </div>
                )}
                {!teachLoading && teachTab === "explanation" && (
                  <p className="whitespace-pre-wrap leading-relaxed">{teaching?.teaching_content ?? "No content"}</p>
                )}
                {!teachLoading && teachTab === "key-points" && (
                  <ol className="list-decimal space-y-2 pl-5">
                    {(teaching?.what_to_remember ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                )}
                {!teachLoading && teachTab === "exam-tips" && (
                  <ul className="list-disc space-y-2 pl-5">
                    {(teaching?.exam_questions ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (todayData && teachModal.block) {
                      void markComplete(todayData.day, teachModal.block.topic, true);
                    }
                    setTeachModal({ open: false, block: null });
                  }}
                  className="aa-press rounded-xl bg-[#ffcf9d] px-4 py-2.5 text-sm font-semibold text-[#3f2a16]"
                >
                  Mark as Complete
                </button>
                <Link
                  href={`/ai-tutor?subject=${encodeURIComponent(teachModal.block?.subject ?? "")}&prefill=${encodeURIComponent(`Teach me ${teachModal.block?.topic ?? ""} for my exam`)}&autosend=true`}
                  className="text-sm underline"
                  style={{ color: "var(--aa-amber)" }}
                >
                  Go deeper in AI Tutor
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
