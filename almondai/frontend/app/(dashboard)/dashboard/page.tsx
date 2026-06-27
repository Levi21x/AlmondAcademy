"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AlmondIcons } from "@/components/ui/AlmondIcons";
import { createExam, getExams, type ExamType, type StudentExam } from "@/lib/api/planner.api";
import { getDailyStatus, type DailyStatus } from "@/lib/api/mcq.api";
import { getQuickSummary, type QuickSummary } from "@/lib/api/weakness.api";
import { PeerInsightsWidget } from "@/components/peer/PeerInsightsWidget";
import { PeerNotification } from "@/components/peer/PeerNotification";
import { getStreak, type StreakData, getWeeklyData, type WeeklyData } from "@/lib/api/progress.api";
import { getProgressSummary, type SubjectSummary } from "@/lib/api/syllabus.api";
import { getPremiumSessionStatus, type PremiumSessionStatus } from "@/lib/api/doubt_solver.api";
import { useProfile, useTodayUsage } from "@/lib/hooks/useProfile";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useAuthStore } from "@/lib/store/authStore";
import { getSupabaseClient } from "@/lib/supabase/client";

const QUICK_ACTIONS = [
  { id: "tutor",    href: "/ai-tutor",  label: "AI Tutor",      sub: "Ask anything",       icon: "brain"     as const, accent: "#d5c5a8", accentBg: "rgba(213,197,168,0.07)", accentBorder: "rgba(213,197,168,0.16)", emoji: "🧠" },
  { id: "practice", href: "/practice",  label: "Practice MCQs", sub: "10 questions daily",  icon: "clipboard" as const, accent: "#fff2de", accentBg: "rgba(255,242,222,0.05)", accentBorder: "rgba(255,242,222,0.14)", emoji: "📋" },
  { id: "syllabus", href: "/planner?tab=map",  label: "Syllabus Map",  sub: "Track your topics",   icon: "map"       as const, accent: "#cec5b9", accentBg: "rgba(206,197,185,0.06)", accentBorder: "rgba(206,197,185,0.16)", emoji: "🗺️" },
  { id: "crisis",   href: "/crisis",    label: "Crisis Mode",   sub: "Emergency revision",  icon: "alert"     as const, accent: "#e4b4a0", accentBg: "rgba(228,180,160,0.07)", accentBorder: "rgba(228,180,160,0.18)", emoji: "⚡" },
];

const subjectColors = ["var(--aa-amber)","var(--aa-teal)","var(--aa-purple)","var(--aa-coral)","var(--aa-green)"];

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const { data: profile } = useProfile();
  useTodayUsage();
  const { isPremium } = useSubscription();

  const [exams,               setExams]               = useState<StudentExam[]>([]);
  const [isExamModalOpen,     setIsExamModalOpen]     = useState(false);
  const [examDateInput,       setExamDateInput]       = useState("");
  const [examNameInput,       setExamNameInput]       = useState("");
  const [examTypeInput,       setExamTypeInput]       = useState<ExamType>("university");
  const [weakSubjects,        setWeakSubjects]        = useState<SubjectSummary[]>([]);
  const [streak,              setStreak]              = useState<StreakData | null>(null);
  const [weeklyData,          setWeeklyData]          = useState<WeeklyData | null>(null);
  const [mcqDaily,            setMcqDaily]            = useState<DailyStatus | null>(null);
  const [weaknessSummary,     setWeaknessSummary]     = useState<QuickSummary | null>(null);
  const [premiumSessionStatus,setPremiumSessionStatus]= useState<PremiumSessionStatus | null>(null);
  const [showPremiumLimitModal,setShowPremiumLimitModal]= useState(false);

  useEffect(() => {
    if (!token) return;
    void getProgressSummary(token).then((s) => setWeakSubjects(s.by_subject.slice(0, 4))).catch(() => setWeakSubjects([]));
    void getExams(token).then(setExams).catch(() => setExams([]));
    void getDailyStatus(token).then(setMcqDaily).catch(() => setMcqDaily(null));
    void getQuickSummary(token).then(setWeaknessSummary).catch(() => setWeaknessSummary(null));
    void getStreak(token).then(setStreak).catch(() => setStreak(null));
    void getWeeklyData(token).then(setWeeklyData).catch(() => setWeeklyData(null));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    void getPremiumSessionStatus(token).then((s) => { if (mounted) setPremiumSessionStatus(s); });
    return () => { mounted = false; };
  }, [token]);

  const firstName      = profile?.full_name?.split(" ")[0]?.trim() ?? "there";
  const hour           = new Date().getHours();
  const greeting       = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingEmoji  = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";
  const dayName        = new Date().toLocaleDateString("en-IN", { weekday: "long" });

  const nearestExam = useMemo(
    () => exams.filter((e) => !e.is_past).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0] ?? null,
    [exams],
  );

  const mcqLimit          = mcqDaily?.daily_limit ?? 10;
  const mcqTodayAttempted = mcqDaily?.today_attempted ?? 0;
  const mcqQuestionsLeft  = Math.max(0, mcqLimit - mcqTodayAttempted);
  const todayAccuracy     = mcqDaily?.today_accuracy ?? 0;
  const currentStreak     = streak?.current_streak ?? 0;
  const longestStreak     = streak?.longest_streak ?? 0;

  const premiumUsed    = premiumSessionStatus?.premium_sessions_used ?? 0;
  const premiumLimit   = premiumSessionStatus?.premium_sessions_limit ?? 15;
  const premiumCanUse  = premiumSessionStatus?.can_use_premium_session ?? true;

  const tomorrowIso = useMemo(() => {
    const now = new Date(); now.setDate(now.getDate() + 1); return now.toISOString().slice(0, 10);
  }, []);

  const weekDays = weeklyData?.days ?? Array.from({ length: 7 }, (_, i) => ({
    date: "", day_label: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
    questions_asked: 0, topics_completed: 0, was_active: false,
  }));

  const handleAskAlmondAI = async () => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const activeToken = session?.access_token ?? token;
    if (!activeToken) { router.push("/ai-tutor"); return; }
    const status = await getPremiumSessionStatus(activeToken);
    setPremiumSessionStatus(status);
    if (!status.can_use_premium_session) { setShowPremiumLimitModal(true); return; }
    router.push("/ai-tutor?model=claude&mode=high_yield&source=dashboard");
  };

  const openExamModal = () => { setExamDateInput(""); setExamNameInput(""); setExamTypeInput("university"); setIsExamModalOpen(true); };

  const saveExamDate = async () => {
    if (!token || !examDateInput || !examNameInput.trim()) return;
    try {
      const created = await createExam(token, { exam_name: examNameInput.trim(), exam_date: examDateInput, exam_type: examTypeInput, subjects: [] });
      setExams((prev) => [...prev, created].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
      setIsExamModalOpen(false);
    } catch { /* ignore */ }
  };

  return (
    <div className="aa-stagger" style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 64 }}>
      <PeerNotification token={token} />

      {/* ── Header ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span className="aa-badge aa-badge-teal">Learning Profile</span>
          <span className="aa-badge aa-badge-gray">{profile?.mode?.toUpperCase() ?? "MBBS"} Mode</span>
          {isPremium && <span className="aa-badge aa-badge-amber">Premium</span>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h1 className="aa-display" style={{ color: "var(--aa-text-1)", letterSpacing: "-0.03em" }}>
            {greeting}, {firstName}
          </h1>
          <span style={{ fontSize: "2rem" }}>{greetingEmoji}</span>
        </div>
        <p className="aa-body-lg" style={{ color: "var(--aa-text-2)", marginTop: 4 }}>
          AlmondAI is calibrated for your exam. Here&apos;s today&apos;s intelligence.
        </p>
      </div>

      {/* ── Today's Mission Hero ── */}
      <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#1d1c1b 0%,#191816 60%,#131313 100%)", border: "1px solid rgba(213,197,168,0.14)", borderRadius: "var(--aa-r-xl)", padding: "32px 36px" }}>
        {/* Decorative glows */}
        <div style={{ position: "absolute", top: -70, right: -70, width: 220, height: 220, background: "radial-gradient(circle,rgba(255,242,222,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -50, left: 80, width: 180, height: 180, background: "radial-gradient(circle,rgba(213,197,168,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />
        {/* Top edge highlight */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(213,197,168,0.2) 40%,transparent)", pointerEvents: "none" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span className="aa-badge aa-badge-teal">Today&apos;s Mission</span>
            <span className="aa-badge aa-badge-amber">{dayName}</span>
          </div>

          <h2 className="aa-h1" style={{ color: "var(--aa-text-1)", marginBottom: 8, maxWidth: 520 }}>
            Your daily targets are ready, {firstName}
          </h2>
          <p className="aa-body" style={{ color: "var(--aa-text-2)", marginBottom: 24, maxWidth: 460 }}>
            {mcqQuestionsLeft > 0 ? `${mcqQuestionsLeft} questions left today` : "Daily practice complete ✓"}
            {nearestExam ? (
              <> · {nearestExam.exam_name} in{" "}
                <span style={{ color: "var(--aa-coral)", fontWeight: 700 }}>{nearestExam.days_remaining} days</span>
              </>
            ) : null}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button className="aa-btn aa-btn-teal aa-btn-sm" onClick={() => void handleAskAlmondAI()}>
              <AlmondIcons.sparkles size={15} /> Start Study Session
            </button>
            <Link href="/practice" className="aa-btn aa-btn-ghost aa-btn-sm">
              <AlmondIcons.clipboard size={15} /> Practice MCQs
            </Link>
          </div>

          {/* Mini stats strip */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(53,53,52,0.8)", display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--aa-fd)", fontSize: "1.45rem", fontWeight: 800, color: "var(--aa-teal)", lineHeight: 1 }}>
                {mcqTodayAttempted}/{mcqLimit}
              </div>
              <div className="aa-label" style={{ color: "var(--aa-text-3)", marginTop: 3, fontSize: "0.6rem" }}>Questions Today</div>
            </div>
            {todayAccuracy > 0 && (
              <div>
                <div style={{ fontFamily: "var(--aa-fd)", fontSize: "1.45rem", fontWeight: 800, color: "var(--aa-green)", lineHeight: 1 }}>
                  {todayAccuracy}%
                </div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginTop: 3, fontSize: "0.6rem" }}>Accuracy</div>
              </div>
            )}
            {nearestExam && (
              <div>
                <div style={{ fontFamily: "var(--aa-fd)", fontSize: "1.45rem", fontWeight: 800, color: nearestExam.days_remaining < 10 ? "var(--aa-coral)" : "var(--aa-amber)", lineHeight: 1 }}>
                  {nearestExam.days_remaining}d
                </div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginTop: 3, fontSize: "0.6rem" }}>To {nearestExam.exam_name}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {/* Streak */}
        <Link href="/progress" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "20px", cursor: "pointer", position: "relative", overflow: "hidden", transition: "all 0.2s", height: "100%" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--aa-border2)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--aa-shadow)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--aa-border)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--aa-amber),transparent)", opacity: 0.7 }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ padding: 8, borderRadius: "var(--aa-r)", background: "rgba(213,197,168,0.1)", color: "var(--aa-amber)" }}><AlmondIcons.flame size={18} /></div>
              <span className="aa-caption" style={{ fontSize: "0.68rem" }}>Best: {longestStreak}d</span>
            </div>
            <div style={{ fontFamily: "var(--aa-fd)", fontSize: "2.2rem", fontWeight: 800, color: "var(--aa-text-1)", lineHeight: 1 }}>{currentStreak}</div>
            <div className="aa-label" style={{ color: "var(--aa-text-3)", marginTop: 6, fontSize: "0.62rem" }}>Day Streak</div>
          </div>
        </Link>

        {/* Exam countdown */}
        {nearestExam ? (
          <div style={{ background: nearestExam.days_remaining < 20 ? "rgba(228,180,160,0.04)" : "var(--aa-s2)", border: `1px solid ${nearestExam.days_remaining < 20 ? "var(--aa-coral-border)" : "var(--aa-border)"}`, borderRadius: "var(--aa-r-lg)", padding: "20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--aa-coral),transparent)", opacity: 0.7 }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ padding: 8, borderRadius: "var(--aa-r)", background: "rgba(228,180,160,0.1)", color: "var(--aa-coral)" }}><AlmondIcons.calendar size={18} /></div>
              <span className={`aa-badge ${nearestExam.days_remaining < 20 ? "aa-badge-coral" : "aa-badge-amber"}`}>Upcoming</span>
            </div>
            <div style={{ fontFamily: "var(--aa-fd)", fontSize: "2.2rem", fontWeight: 800, lineHeight: 1, color: nearestExam.days_remaining < 10 ? "var(--aa-coral)" : nearestExam.days_remaining < 30 ? "var(--aa-caution)" : "var(--aa-green)" }}>
              {nearestExam.days_remaining}
            </div>
            <div className="aa-label" style={{ color: "var(--aa-text-3)", marginTop: 6, fontSize: "0.62rem" }}>Days to {nearestExam.exam_name}</div>
          </div>
        ) : (
          <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "20px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--aa-coral),transparent)", opacity: 0.7 }} />
            <div style={{ padding: 8, borderRadius: "var(--aa-r)", background: "rgba(228,180,160,0.1)", color: "var(--aa-coral)", width: "fit-content", marginBottom: 14 }}><AlmondIcons.calendar size={18} /></div>
            <div style={{ fontFamily: "var(--aa-fd)", fontSize: "1rem", fontWeight: 600, color: "var(--aa-text-2)", lineHeight: 1.3, marginBottom: 10 }}>No exam set</div>
            <button onClick={openExamModal} className="aa-btn aa-btn-ghost aa-btn-xs">+ Add Exam</button>
          </div>
        )}

        {/* Accuracy */}
        <Link href="/progress" style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "20px", cursor: "pointer", position: "relative", overflow: "hidden", transition: "all 0.2s", height: "100%" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--aa-border2)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--aa-shadow)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--aa-border)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--aa-green),transparent)", opacity: 0.7 }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ padding: 8, borderRadius: "var(--aa-r)", background: "rgba(34,197,94,0.1)", color: "var(--aa-green)" }}><AlmondIcons.trending size={18} /></div>
              <span className="aa-caption" style={{ fontSize: "0.68rem" }}>Today</span>
            </div>
            <div style={{ fontFamily: "var(--aa-fd)", fontSize: "2.2rem", fontWeight: 800, color: "var(--aa-text-1)", lineHeight: 1 }}>
              {todayAccuracy > 0 ? `${todayAccuracy}%` : "—"}
            </div>
            <div className="aa-label" style={{ color: "var(--aa-text-3)", marginTop: 6, fontSize: "0.62rem" }}>Today&apos;s Accuracy</div>
          </div>
        </Link>
      </div>

      {/* ── Streak + AI Sessions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        {/* Streak display */}
        <div style={{ background: "linear-gradient(135deg,rgba(213,197,168,0.07) 0%,rgba(255,100,0,0.04) 100%)", border: "1px solid rgba(213,197,168,0.14)", borderRadius: "var(--aa-r-lg)", padding: "22px 26px", display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{ fontSize: "3.2rem", lineHeight: 1, animation: "aaFlicker 2s ease-in-out infinite,aaStreakGlow 2.5s ease-in-out infinite" }}>🔥</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--aa-fd)", fontSize: "2rem", fontWeight: 900, color: "var(--aa-amber)", lineHeight: 1, letterSpacing: "-0.03em" }}>
              {currentStreak} days
            </div>
            <div className="aa-body" style={{ color: "var(--aa-text-2)", marginTop: 4 }}>
              {currentStreak > 0 ? "You're on fire! Keep going 💪" : "Start your streak today!"}
            </div>
            {/* Week dots */}
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              {weekDays.map((day, i) => (
                <div key={i} title={day.day_label}
                  style={{ width: 26, height: 26, borderRadius: "var(--aa-r-sm)", background: day.was_active ? "rgba(213,197,168,0.1)" : "var(--aa-s2)", border: `1px solid ${day.was_active ? "rgba(213,197,168,0.28)" : "var(--aa-border)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: day.was_active ? "var(--aa-amber)" : "var(--aa-text-3)", transition: "all 0.2s" }}>
                  {day.was_active ? "✓" : "·"}
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="aa-label" style={{ color: "var(--aa-text-3)", fontSize: "0.6rem", marginBottom: 5 }}>Best</div>
            <div style={{ fontFamily: "var(--aa-fd)", fontSize: "1.3rem", fontWeight: 700, color: "var(--aa-text-2)" }}>
              {longestStreak}d
            </div>
          </div>
        </div>

        {/* AI Sessions */}
        <div style={{ background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: "var(--aa-r-lg)", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: 8, borderRadius: "var(--aa-r)", background: "rgba(255,242,222,0.07)", color: "var(--aa-teal)" }}>
                <AlmondIcons.sparkles size={18} />
              </div>
              <div>
                <div className="aa-h4" style={{ color: "var(--aa-text-1)" }}>AI Sessions</div>
                <div className="aa-caption">{Math.max(0, premiumLimit - premiumUsed)} of {premiumLimit} remaining</div>
              </div>
            </div>
            <span className="aa-level" style={{ color: premiumCanUse ? "var(--aa-green)" : "var(--aa-coral)" }}>
              {premiumCanUse ? "Active" : "Used up"}
            </span>
          </div>
          <div className="aa-prog-track" style={{ height: 6 }}>
            <div className="aa-prog-fill aa-prog-fill-teal" style={{ width: `${Math.min((premiumUsed / Math.max(premiumLimit, 1)) * 100, 100)}%`, animation: "aaXpLoad 1.4s ease-out" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span className="aa-caption">{premiumUsed} used</span>
            <span className="aa-caption">{premiumLimit} limit</span>
          </div>
          <button className="aa-btn aa-btn-teal aa-btn-xs" style={{ marginTop: 14, width: "100%" }} onClick={() => void handleAskAlmondAI()}>
            Start Session →
          </button>
        </div>
      </div>

      {/* ── Achievement banner (streak ≥ 7) ── */}
      {currentStreak >= 7 && (
        <div style={{ background: "linear-gradient(135deg,rgba(206,197,185,0.09) 0%,rgba(213,197,168,0.04) 100%)", border: "1px solid rgba(206,197,185,0.22)", borderRadius: "var(--aa-r-lg)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, animation: "aaBounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <div style={{ width: 50, height: 50, borderRadius: "var(--aa-r-md)", flexShrink: 0, background: "linear-gradient(135deg,rgba(206,197,185,0.14),rgba(213,197,168,0.08))", border: "1px solid rgba(206,197,185,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 0 20px rgba(206,197,185,0.1)" }}>🏅</div>
          <div style={{ flex: 1 }}>
            <div className="aa-label" style={{ color: "var(--aa-purple)", fontSize: "0.6rem", marginBottom: 3 }}>Achievement Unlocked</div>
            <div className="aa-h4" style={{ color: "var(--aa-text-1)", marginBottom: 2 }}>{currentStreak}-Day Streak!</div>
            <div className="aa-caption">You&apos;ve studied {currentStreak} days in a row · Keep going!</div>
          </div>
          <span style={{ fontSize: 26 }}>✨</span>
        </div>
      )}

      {/* ── Quick Access ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span className="aa-h3">Quick Access</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {QUICK_ACTIONS.map((item) => {
            const Icon = AlmondIcons[item.icon];
            return (
              <Link key={item.id} href={item.href} style={{ padding: "20px 16px", borderRadius: "var(--aa-r-lg)", background: item.accentBg, border: `1px solid ${item.accentBorder}`, textDecoration: "none", display: "block", transition: "all 0.22s cubic-bezier(0.25,0.46,0.45,0.94)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.35)"; e.currentTarget.style.borderColor = item.accent + "40"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = item.accentBorder; }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--aa-r)", background: `${item.accent}14`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: item.accent }}>
                  <Icon size={18} />
                </div>
                <div className="aa-h4" style={{ color: "var(--aa-text-1)", marginBottom: 3 }}>{item.label}</div>
                <div className="aa-caption" style={{ fontSize: "0.7rem" }}>{item.sub}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Weakness + Peer ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        {/* Weakness Alert */}
        <div className="aa-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ padding: 7, borderRadius: "var(--aa-r)", background: "rgba(228,180,160,0.1)", color: "var(--aa-coral)" }}>
                <AlmondIcons.alert size={16} />
              </div>
              <span className="aa-h4">Weakness Alert</span>
            </div>
            <Link href="/insights" className="aa-btn aa-btn-ghost aa-btn-xs">Insights →</Link>
          </div>
          {!weaknessSummary?.has_analysis ? (
            <p className="aa-body-sm" style={{ color: "var(--aa-text-2)" }}>
              No analysis yet. Practice MCQs to detect your weak areas.
            </p>
          ) : (
            <>
              <p className="aa-body-sm" style={{ color: "var(--aa-text-2)", marginBottom: 12 }}>
                AI detected{" "}
                <span style={{ color: "var(--aa-coral)", fontWeight: 700 }}>
                  {weaknessSummary.critical_count} critical gap{weaknessSummary.critical_count !== 1 ? "s" : ""}
                </span>{" "}
                that may cost you marks
              </p>
              {weaknessSummary.top_3_gaps.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {weaknessSummary.top_3_gaps.map((gap) => (
                    <span key={`${gap.subject}-${gap.topic}`} className="aa-badge aa-badge-coral" style={{ fontSize: "0.7rem", padding: "4px 10px" }}>
                      {gap.topic}
                    </span>
                  ))}
                </div>
              )}
              <div>
                <div style={{ height: 5, background: "var(--aa-s3)", borderRadius: "var(--aa-r-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${weaknessSummary.overall_readiness_score ?? 0}%`, borderRadius: "var(--aa-r-full)", background: "linear-gradient(90deg,var(--aa-coral),#ff9580)", boxShadow: "0 0 8px rgba(228,180,160,0.4)" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span className="aa-caption" style={{ fontSize: "0.68rem" }}>Exam readiness</span>
                  <span className="aa-caption" style={{ color: "var(--aa-coral)", fontSize: "0.68rem", fontWeight: 700 }}>
                    {weaknessSummary.overall_readiness_score ?? 0}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <PeerInsightsWidget token={token} compact />
      </div>

      {/* ── Syllabus Progress ── */}
      <div className="aa-card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span className="aa-h3">Syllabus Progress</span>
          <Link href="/planner?tab=map" className="aa-btn aa-btn-ghost aa-btn-xs">Full Map →</Link>
        </div>
        {weakSubjects.length === 0 ? (
          <p className="aa-body-sm" style={{ color: "var(--aa-text-2)" }}>
            No progress yet. Open Syllabus Map to start tracking topics.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {weakSubjects.map((subject, i) => (
              <div key={subject.subject_id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span className="aa-body-sm" style={{ width: 130, flexShrink: 0, color: "var(--aa-text-2)", fontSize: "0.82rem" }}>
                  {subject.subject_name}
                </span>
                <div style={{ flex: 1, height: 6, background: "var(--aa-s3)", borderRadius: "var(--aa-r-full)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${subject.percentage}%`, borderRadius: "var(--aa-r-full)", background: subjectColors[i % subjectColors.length], boxShadow: `0 0 8px ${subjectColors[i % subjectColors.length]}50`, transition: "width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                </div>
                <span className="aa-caption" style={{ width: 38, textAlign: "right", color: subjectColors[i % subjectColors.length], fontWeight: 700, fontSize: "0.78rem" }}>
                  {subject.percentage}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Premium upgrade banner ── */}
      {!isPremium && (
        <div style={{ background: "linear-gradient(135deg,rgba(213,197,168,0.06),rgba(213,197,168,0.03))", border: "1px solid rgba(213,197,168,0.16)", borderRadius: "var(--aa-r-lg)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="aa-h4" style={{ color: "var(--aa-amber)", marginBottom: 4 }}>Unlock Premium</div>
            <p className="aa-body-sm" style={{ color: "var(--aa-text-2)" }}>
              Unlimited MCQs, visual explainers, AI insights, planner, and crisis mode.
            </p>
          </div>
          <Link href="/upgrade" className="aa-btn aa-btn-primary aa-btn-sm" style={{ flexShrink: 0 }}>
            Upgrade Now →
          </Link>
        </div>
      )}

      {/* ── Premium Limit Modal ── */}
      {showPremiumLimitModal && (
        <div className="aa-overlay" onClick={() => setShowPremiumLimitModal(false)}>
          <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setShowPremiumLimitModal(false)} style={{ position: "absolute", right: 16, top: 16, background: "none", border: "none", cursor: "pointer", color: "var(--aa-text-2)", padding: 4 }}>
              <X size={16} />
            </button>
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,242,222,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🧠</div>
              <h3 className="aa-h3">You&apos;ve used your {premiumLimit} free high-yield sessions</h3>
              <p className="aa-caption" style={{ marginTop: 5 }}>Resets tomorrow at midnight</p>
            </div>
            <p className="aa-body-sm" style={{ color: "var(--aa-text-2)", marginBottom: 14 }}>Upgrade for unlimited high-yield sessions with Claude AI, plus:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
              {["Unlimited Crisis Mode", "Unlimited AI questions", "Advanced analytics"].map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: "var(--aa-green)", fontSize: "0.8rem" }}>✓</span>
                  <span className="aa-body-sm">{f}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href="/upgrade" className="aa-btn aa-btn-primary" style={{ width: "100%", justifyContent: "center" }}>Upgrade to Premium →</Link>
              <button type="button" className="aa-btn aa-btn-ghost" onClick={() => { setShowPremiumLimitModal(false); router.push("/ai-tutor?model=groq"); }}>
                Use Groq instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Exam Modal ── */}
      {isExamModalOpen && (
        <div className="aa-overlay" onClick={() => setIsExamModalOpen(false)}>
          <div className="aa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aa-h3" style={{ marginBottom: 18 }}>Add Exam Goal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginBottom: 7, fontSize: "0.62rem" }}>Exam Name</div>
                <input className="aa-input" placeholder="e.g. NEET-PG 2025" value={examNameInput} onChange={(e) => setExamNameInput(e.target.value)} />
              </div>
              <div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginBottom: 7, fontSize: "0.62rem" }}>Exam Date</div>
                <input type="date" min={tomorrowIso} className="aa-input" value={examDateInput} onChange={(e) => setExamDateInput(e.target.value)} />
              </div>
              <div>
                <div className="aa-label" style={{ color: "var(--aa-text-3)", marginBottom: 7, fontSize: "0.62rem" }}>Type</div>
                <select className="aa-input" value={examTypeInput} onChange={(e) => setExamTypeInput(e.target.value as ExamType)}>
                  <option value="university">University Exam</option>
                  <option value="neet_pg">NEET-PG</option>
                  <option value="fmge">FMGE</option>
                  <option value="internal">Internal Assessment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button className="aa-btn aa-btn-primary" style={{ flex: 1 }} onClick={() => void saveExamDate()}>Save Exam</button>
              <button className="aa-btn aa-btn-ghost" onClick={() => setIsExamModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
