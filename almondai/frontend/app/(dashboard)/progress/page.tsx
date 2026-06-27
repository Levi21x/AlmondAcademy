"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { getAchievements, type AchievementsCatalog } from "@/lib/api/achievements.api";
import {
  getProgressOverview,
  getSubjectProgress,
  getWeeklyData,
  type ProgressOverview,
  type SubjectProgress,
  type WeeklyData,
} from "@/lib/api/progress.api";
import {
  getLatestAnalysis,
  resolveIntervention,
  runAnalysis,
  type WeaknessAnalysis,
  type WeaknessGap,
} from "@/lib/api/weakness.api";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

// ── Insights helpers ──────────────────────────────────────────────────────────

const LOADING_STEPS = [
  "Analyzing MCQ performance...",
  "Processing struggle patterns...",
  "Checking syllabus completion...",
  "Reviewing AI tutor sessions...",
  "Calculating weakness scores...",
  "Generating intervention plans...",
];

function readinessColor(score: number) {
  if (score <= 40) return "#ef4444";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#facc15";
  return "#22c55e";
}

function getSubjectHeatmap(gaps: WeaknessGap[]) {
  const bucket: Record<string, { total: number; count: number }> = {};
  for (const gap of gaps) {
    if (!bucket[gap.subject]) bucket[gap.subject] = { total: 0, count: 0 };
    bucket[gap.subject].total += gap.weakness_score;
    bucket[gap.subject].count += 1;
  }
  return Object.entries(bucket).map(([subject, entry]) => ({
    subject,
    average: Math.round(entry.total / Math.max(entry.count, 1)),
    topicCount: entry.count,
  }));
}

// ── Progress helpers ──────────────────────────────────────────────────────────

const tierColors: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  bronze:   { bg: "rgba(184,115,51,0.1)",   text: "#cd7f32", border: "rgba(184,115,51,0.3)",   emoji: "🥉" },
  silver:   { bg: "rgba(192,192,192,0.1)",  text: "#a8a8a8", border: "rgba(192,192,192,0.3)",  emoji: "🥈" },
  gold:     { bg: "rgba(230,200,122,0.12)", text: "#e6c87a", border: "rgba(230,200,122,0.35)", emoji: "🥇" },
  platinum: { bg: "rgba(213,197,168,0.12)", text: "#d5c5a8", border: "rgba(213,197,168,0.35)", emoji: "💎" },
};

function initialYearFilter(year: number | null | undefined): "all" | "year1" | "year2" | "year3plus" {
  if (year === 1) return "year1";
  if (year === 2) return "year2";
  if (year && year >= 3) return "year3plus";
  return "all";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const token = useAuthStore((state) => state.accessToken);
  const profile = useAuthStore((state) => state.profile);
  const router = useRouter();
  const { isPremium } = useSubscription();

  const [activeTab, setActiveTab] = useState<"overview" | "insights">("overview");

  // ── Progress state ──────────────────────────────────────────────────────────
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData | null>(null);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [achievements, setAchievements] = useState<AchievementsCatalog | null>(null);
  const [yearFilter, setYearFilter] = useState<"all" | "year1" | "year2" | "year3plus">(() =>
    initialYearFilter(profile?.current_year),
  );
  const [subjectHover, setSubjectHover] = useState<string | null>(null);

  // ── Insights state ──────────────────────────────────────────────────────────
  const [analysis, setAnalysis] = useState<WeaknessAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [showHighRisk, setShowHighRisk] = useState(false);
  const [showModerate, setShowModerate] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(true);

  // ── Progress data load ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const activeToken = token;
    let mounted = true;

    async function loadProgress() {
      setLoading(true);
      setError(null);
      try {
        const [overviewData, weeklyData, subjectData, achievementsData] = await Promise.all([
          getProgressOverview(activeToken),
          getWeeklyData(activeToken),
          getSubjectProgress(activeToken),
          getAchievements(activeToken),
        ]);
        if (!mounted) return;
        setOverview(overviewData);
        setWeekly(weeklyData);
        setSubjects(subjectData);
        setAchievements(achievementsData);
      } catch {
        if (!mounted) return;
        setError("Progress data is temporarily unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProgress();
    return () => { mounted = false; };
  }, [token]);

  // ── Insights data load ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadLatest() {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token ?? token;
      if (!tok) return;
      const latest = await getLatestAnalysis(tok);
      if (!cancelled) setAnalysis(latest);
    }
    void loadLatest();
    return () => { cancelled = true; };
  }, [token]);

  // ── Analysis loading step ticker ────────────────────────────────────────────
  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = window.setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  // ── Insights handlers ───────────────────────────────────────────────────────
  const runFullAnalysis = async (subject?: string) => {
    setIsAnalyzing(true);
    setLoadingStep(0);
    setInsightsError(null);
    try {
      if (!isPremium && analysis?.generated_at) {
        const generatedAt = new Date(analysis.generated_at).getTime();
        if (Date.now() - generatedAt < 7 * 24 * 60 * 60 * 1000) {
          setInsightsError("Free plan allows one insights analysis per week. Upgrade for unlimited analyses.");
          return;
        }
      }
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token ?? token;
      if (!tok) { setInsightsError("Please sign in again."); return; }
      const result = await runAnalysis(tok, subject);
      if (!result.analysis_id) {
        setInsightsError("Could not generate analysis right now.");
      } else {
        setAnalysis(result);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const markResolved = async (id?: string) => {
    if (!id || !analysis) return;
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    const tok = session?.access_token ?? token;
    if (!tok) return;
    await resolveIntervention(tok, id);
    setAnalysis({ ...analysis, interventions: analysis.interventions.filter((item) => item.id !== id) });
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const allGaps = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.critical_gaps, ...analysis.high_risk, ...analysis.moderate_risk, ...analysis.strong_areas];
  }, [analysis]);

  const heatmap = useMemo(() => getSubjectHeatmap(allGaps), [allGaps]);

  const filtered = useMemo(() => {
    if (!analysis) return null;
    if (!subjectFilter) return analysis;
    const keep = (rows: WeaknessGap[]) => rows.filter((row) => row.subject === subjectFilter);
    return {
      ...analysis,
      critical_gaps: keep(analysis.critical_gaps),
      high_risk: keep(analysis.high_risk),
      moderate_risk: keep(analysis.moderate_risk),
      strong_areas: keep(analysis.strong_areas),
      interventions: analysis.interventions.filter((row) => row.subject === subjectFilter),
    };
  }, [analysis, subjectFilter]);

  const readiness = filtered?.overall_readiness_score ?? 0;
  const ringColor = readinessColor(readiness);

  const filteredSubjects = useMemo(() => {
    if (yearFilter === "year1") return subjects.filter((s) => s.year === 1);
    if (yearFilter === "year2") return subjects.filter((s) => s.year === 2);
    if (yearFilter === "year3plus") return subjects.filter((s) => s.year >= 3);
    return subjects;
  }, [subjects, yearFilter]);

  const maxQuestions = Math.max(1, ...(weekly?.days.map((d) => d.questions_asked) ?? [0]));
  const totalQuestionsEver = subjects.reduce((sum, s) => sum + (s.questions_asked ?? 0), 0);
  const unlockedBadges = (achievements?.items ?? []).filter((b) => b.unlocked);
  const nextMilestone = achievements?.next_streak_milestone ?? null;

  const statCards = [
    { emoji: "🔥", label: "Study Streak",   value: overview?.streak.current_streak ?? 0,   unit: "day streak",  note: overview?.streak.current_streak ? `Best: ${overview?.streak.longest_streak ?? 0} days` : "Start your streak today", accent: "#e4b4a0" },
    { emoji: "✅", label: "Topics Done",     value: overview?.syllabus.completed ?? 0,       unit: `of ${overview?.syllabus.total_topics ?? 0} total`, note: `${overview?.syllabus.overall_percentage ?? 0}% complete`, accent: "#69db8b" },
    { emoji: "🧠", label: "Questions Asked", value: totalQuestionsEver,                      unit: "answered",    note: `${overview?.this_week.questions_asked ?? 0} this week`, accent: "var(--aa-amber)" },
    { emoji: "📅", label: "Active Days",     value: overview?.streak.total_active_days ?? 0, unit: "days studied", note: `${overview?.streak.longest_streak ?? 0} day best streak`, accent: "var(--aa-teal)" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ animation: "aaFadeUp 0.35s ease-out both" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--aa-fd)", fontSize: "clamp(1.6rem,3vw,2rem)", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.028em", marginBottom: 6 }}>
          Progress & Insights
        </h1>
        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-3)" }}>
          Track your study activity and predict where you&apos;ll lose marks.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: "var(--aa-s2)", border: "1px solid var(--aa-border)", borderRadius: 9999, padding: 4, width: "fit-content", marginBottom: 24 }}>
        {(["overview", "insights"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 20px",
              borderRadius: 9999,
              border: "none",
              background: activeTab === tab ? "rgba(213,197,168,0.12)" : "transparent",
              color: activeTab === tab ? "var(--aa-amber)" : "var(--aa-text-3)",
              fontFamily: "var(--aa-fb)",
              fontSize: "0.83rem",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.18s",
              boxShadow: activeTab === tab ? "inset 0 0 0 1px rgba(213,197,168,0.22)" : "none",
            }}
          >
            {tab === "overview" ? "Overview" : "Weakness Analysis"}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.17 }}
          >
            {/* Stat cards */}
            <div
              className="aa-stagger"
              style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", marginBottom: 20 }}
            >
              {statCards.map((card) => (
                <div
                  key={card.label}
                  style={{ borderRadius: 16, border: "1px solid rgba(76,70,61,0.4)", background: "var(--aa-s2)", padding: "20px", borderTop: `2px solid ${card.accent}`, transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>{card.emoji}</span>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.72rem", fontWeight: 700, color: "var(--aa-text-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{card.label}</span>
                  </div>
                  <p style={{ fontFamily: "var(--aa-fd)", fontSize: "2.2rem", fontWeight: 800, color: "var(--aa-text-1)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{card.value}</p>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", marginBottom: 8 }}>{card.unit}</p>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: card.accent }}>{card.note}</p>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(228,180,160,0.3)", background: "rgba(228,180,160,0.06)", marginBottom: 16, fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-coral)" }}>
                {error}
              </div>
            )}

            {/* Weekly activity */}
            <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em", marginBottom: 20 }}>
                This Week
              </h2>
              <div style={{ display: "flex", height: 120, alignItems: "flex-end", gap: 8 }}>
                {(weekly?.days ?? []).map((day) => {
                  const ratio = day.questions_asked / maxQuestions;
                  const height = Math.max(4, Math.round(ratio * 96));
                  const isToday = day.date === new Date().toLocaleDateString("en-CA");
                  return (
                    <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ position: "relative", width: "100%", height }} title={`${day.questions_asked} questions`}>
                        <div
                          style={{
                            width: "100%", height: "100%", borderRadius: "4px 4px 0 0",
                            background: day.was_active
                              ? isToday
                                ? "linear-gradient(180deg,#fff2de,#e6c87a)"
                                : "linear-gradient(180deg,rgba(213,197,168,0.7),rgba(213,197,168,0.4))"
                              : "rgba(76,70,61,0.2)",
                            boxShadow: day.was_active && isToday ? "0 0 16px rgba(230,200,122,0.35)" : "none",
                            transition: "all 0.2s",
                          }}
                        />
                      </div>
                      <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", color: isToday ? "var(--aa-amber)" : "var(--aa-text-3)", fontWeight: isToday ? 700 : 400 }}>
                        {day.day_label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)", marginTop: 16 }}>
                {overview?.this_week.questions_asked ?? 0} questions · {overview?.this_week.topics_completed ?? 0} topics · {overview?.this_week.active_days ?? 0} active days
              </p>
            </div>

            {/* Achievements */}
            <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em" }}>🏆 Achievements</h2>
                <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.82rem", color: "var(--aa-text-3)" }}>
                  {achievements?.unlocked_count ?? unlockedBadges.length}/{achievements?.total_badges ?? 0} unlocked
                </span>
              </div>

              {nextMilestone && (
                <div style={{ marginBottom: 20, padding: "16px", borderRadius: 12, border: "1px solid rgba(213,197,168,0.2)", background: "rgba(213,197,168,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)", fontWeight: 500 }}>Next streak milestone</p>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)" }}>
                      {nextMilestone.current_streak}/{nextMilestone.target_streak} days
                    </p>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(76,70,61,0.3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min((nextMilestone.current_streak / Math.max(nextMilestone.target_streak, 1)) * 100, 100)}%`, background: "linear-gradient(90deg, rgba(213,197,168,0.7) 0%, var(--aa-amber) 100%)", borderRadius: 3, boxShadow: "0 0 8px rgba(213,197,168,0.3)", transition: "width 0.5s ease" }} />
                  </div>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginTop: 8 }}>
                    {nextMilestone.remaining_days > 0
                      ? `${nextMilestone.remaining_days} days to ${nextMilestone.badge_name ?? "next streak badge"}`
                      : `Milestone reached: ${nextMilestone.badge_name ?? "streak badge"}`}
                  </p>
                </div>
              )}

              {unlockedBadges.length > 0 ? (
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
                  {unlockedBadges.slice(0, 9).map((badge) => {
                    const tier = tierColors[badge.badge_tier?.toLowerCase() ?? ""] ?? tierColors.bronze;
                    return (
                      <div key={badge.badge_key} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${tier.border}`, background: tier.bg }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18 }}>{tier.emoji}</span>
                          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", fontWeight: 700, color: tier.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>{badge.badge_tier}</span>
                        </div>
                        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-1)", marginBottom: 4 }}>{badge.badge_name}</p>
                        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", lineHeight: 1.45 }}>{badge.description}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "24px 16px", borderRadius: 12, border: "1px solid rgba(76,70,61,0.3)", background: "rgba(14,14,14,0.4)", textAlign: "center", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>
                  Unlock achievements by asking questions, practicing MCQs, and maintaining your streak.
                </div>
              )}
            </div>

            {/* Subject progress */}
            <div style={{ background: "var(--aa-s2)", border: "1px solid rgba(76,70,61,0.4)", borderRadius: 16, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em" }}>Subject Progress</h2>
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { key: "all",       label: "All"    },
                    { key: "year1",     label: "Year 1" },
                    { key: "year2",     label: "Year 2" },
                    { key: "year3plus", label: "Year 3+" },
                  ] as const).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setYearFilter(f.key)}
                      style={{
                        padding: "5px 12px", borderRadius: 100,
                        border: `1px solid ${yearFilter === f.key ? "rgba(213,197,168,0.4)" : "rgba(76,70,61,0.4)"}`,
                        background: yearFilter === f.key ? "rgba(213,197,168,0.1)" : "transparent",
                        color: yearFilter === f.key ? "var(--aa-amber)" : "var(--aa-text-3)",
                        fontFamily: "var(--aa-fb)", fontSize: "0.78rem",
                        fontWeight: yearFilter === f.key ? 600 : 400,
                        cursor: "pointer", transition: "all 0.18s",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredSubjects.map((subject) => {
                  const key = `${subject.subject_name}-${subject.year}`;
                  const isHovered = subjectHover === key;
                  const pct = subject.completion_percentage;
                  const barColor = pct <= 25 ? "#7b7368" : pct <= 50 ? "rgba(213,197,168,0.7)" : pct <= 75 ? "#e6d5b8" : "#fff2de";
                  return (
                    <button
                      key={key}
                      type="button"
                      className="aa-press"
                      onClick={() => router.push(`/planner?tab=map`)}
                      onMouseEnter={() => setSubjectHover(key)}
                      onMouseLeave={() => setSubjectHover(null)}
                      style={{
                        padding: "14px 16px", borderRadius: 12, textAlign: "left", cursor: "pointer", transition: "all 0.18s",
                        border: `1px solid ${isHovered ? "rgba(76,70,61,0.6)" : "rgba(76,70,61,0.3)"}`,
                        background: isHovered ? "rgba(31,31,31,0.8)" : "rgba(14,14,14,0.4)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-1)", fontWeight: 500 }}>{subject.subject_name}</span>
                          <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.68rem", color: "var(--aa-amber)", background: "rgba(213,197,168,0.08)", border: "1px solid rgba(213,197,168,0.18)", borderRadius: 100, padding: "2px 8px" }}>
                            Y{subject.year}
                          </span>
                        </div>
                        <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: barColor }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: "rgba(76,70,61,0.3)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct > 75 ? "linear-gradient(90deg,rgba(213,197,168,0.6),#fff2de)" : barColor, borderRadius: 3, boxShadow: pct > 50 ? `0 0 6px ${barColor}50` : "none", transition: "width 0.5s ease" }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.17 }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {/* Upgrade prompt */}
            {!isPremium && showUpgradePrompt ? (
              <div style={{ borderRadius: 12, border: "1px solid #7a3f30", background: "#2a1d1b", padding: "16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "#ffcf9d" }}>
                    Free plan includes one predictive analysis per week. Premium unlocks unlimited runs.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Link href="/upgrade" style={{ borderRadius: 8, background: "var(--aa-text-1)", padding: "6px 12px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", fontWeight: 600, color: "#392f1b", textDecoration: "none" }}>
                      Upgrade
                    </Link>
                    <button type="button" onClick={() => setShowUpgradePrompt(false)} style={{ borderRadius: 8, border: "1px solid var(--aa-border2)", padding: "6px 12px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-2)", background: "transparent", cursor: "pointer" }}>
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Analysis header */}
            <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "24px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h2 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.2rem", fontWeight: 700, color: "var(--aa-text-1)", letterSpacing: "-0.02em", marginBottom: 4 }}>Predictive Weakness Analysis</h2>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)" }}>
                    AlmondAI analyzes your performance to predict where you&apos;ll lose marks.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)" }}>
                    Last analyzed: {analysis?.generated_at ? new Date(analysis.generated_at).toLocaleString() : "Never"}
                  </p>
                  <button
                    type="button"
                    onClick={() => void runFullAnalysis()}
                    className="aa-press"
                    style={{ marginTop: 8, borderRadius: 10, background: "var(--aa-amber)", padding: "8px 16px", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "#131313", border: "none", cursor: "pointer" }}
                  >
                    Run Full Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Loading state */}
            {isAnalyzing ? (
              <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "24px" }}>
                <h3 style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontWeight: 600, color: "var(--aa-text-1)", marginBottom: 16 }}>Running analysis...</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {LOADING_STEPS.map((step, index) => {
                    const visible = index <= loadingStep;
                    const done = index < loadingStep;
                    return (
                      <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--aa-fb)", fontSize: "0.875rem", opacity: visible ? 1 : 0.35, transition: "opacity 0.3s" }}>
                        {done
                          ? <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e", flexShrink: 0 }} />
                          : <span className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--aa-amber)", display: "inline-block", flexShrink: 0 }} />}
                        <span style={{ color: "var(--aa-text-2)" }}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {filtered ? (
              <>
                {/* Readiness ring + heatmap */}
                <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
                  <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "20px" }}>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", marginBottom: 16 }}>Readiness Score</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", background: `conic-gradient(${ringColor} ${readiness * 3.6}deg, #2a2a2a 0deg)`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--aa-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--aa-fd)", fontSize: "1.35rem", fontWeight: 800, color: "var(--aa-text-1)" }}>
                          {readiness}
                        </div>
                      </div>
                      <div>
                        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)" }}>Marks at risk: {filtered.estimated_marks_at_risk}</p>
                        <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-3)", marginTop: 4 }}>
                          Generated: {filtered.generated_at ? new Date(filtered.generated_at).toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "20px" }}>
                    <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "var(--aa-text-3)", marginBottom: 12 }}>Subject Heatmap</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8 }}>
                      {heatmap.map((item) => {
                        const avg = item.average;
                        const bg = avg > 75 ? "rgba(239,68,68,0.15)" : avg > 50 ? "rgba(245,158,11,0.15)" : avg > 25 ? "rgba(250,204,21,0.12)" : "rgba(34,197,94,0.12)";
                        const border = avg > 75 ? "rgba(239,68,68,0.4)" : avg > 50 ? "rgba(245,158,11,0.4)" : avg > 25 ? "rgba(250,204,21,0.35)" : "rgba(34,197,94,0.35)";
                        return (
                          <button
                            key={item.subject}
                            type="button"
                            onClick={() => setSubjectFilter((prev) => (prev === item.subject ? null : item.subject))}
                            className="aa-press"
                            style={{ borderRadius: 8, border: `1px solid ${border}`, background: bg, padding: "8px", textAlign: "left", cursor: "pointer", boxShadow: subjectFilter === item.subject ? "0 0 0 2px var(--aa-amber)" : "none", transition: "box-shadow 0.15s" }}
                          >
                            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.7rem", color: "var(--aa-text-1)", marginBottom: 2 }}>{item.subject}</p>
                            <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1rem", fontWeight: 700, color: "var(--aa-text-1)" }}>{item.average}</p>
                            <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.65rem", color: "var(--aa-text-3)" }}>{item.topicCount} topics</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Critical gaps */}
                <div style={{ borderRadius: 12, border: "1px solid #5a2f2a", background: "var(--aa-s2)", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0 }} />
                    <h3 style={{ fontFamily: "var(--aa-fd)", fontSize: "1.1rem", fontWeight: 700, color: "var(--aa-text-1)" }}>Critical Gaps</h3>
                  </div>
                  <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-2)", marginBottom: 16 }}>
                    These topics will almost certainly cost you marks.
                  </p>

                  {filtered.critical_gaps.length === 0
                    ? <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-3)" }}>No critical gaps detected.</p>
                    : null}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.critical_gaps.map((gap) => {
                      const intervention = filtered.interventions.find((item) => item.topic === gap.topic && item.subject === gap.subject);
                      return (
                        <article key={`${gap.subject}-${gap.topic}`} style={{ borderLeft: "4px solid rgba(239,68,68,0.6)", borderRadius: 10, background: "var(--aa-bg)", padding: "20px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                            <div>
                              <h4 style={{ fontFamily: "var(--aa-fb)", fontSize: "1rem", fontWeight: 600, color: "var(--aa-text-1)", marginBottom: 4 }}>{gap.topic}</h4>
                              <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-amber)", background: "var(--aa-s3)", borderRadius: 9999, padding: "2px 8px" }}>{gap.subject}</span>
                            </div>
                            <p style={{ fontFamily: "var(--aa-fd)", fontSize: "1.5rem", fontWeight: 700, color: "#f87171" }}>{gap.weakness_score}</p>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            <span style={{ borderRadius: 9999, border: "1px solid var(--aa-border2)", padding: "3px 8px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-2)" }}>MCQ: {gap.signals.mcq_accuracy}%</span>
                            <span style={{ borderRadius: 9999, border: "1px solid var(--aa-border2)", padding: "3px 8px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-2)" }}>Asked {gap.signals.question_frequency}×</span>
                            <span style={{ borderRadius: 9999, border: "1px solid var(--aa-border2)", padding: "3px 8px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-2)" }}>Status: {gap.signals.completion_status}</span>
                          </div>

                          {intervention ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", fontWeight: 600, color: "var(--aa-text-1)" }}>How to fix this:</p>
                              <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)" }}>{intervention.intervention_plan}</p>
                              <div style={{ borderRadius: 8, border: "1px solid rgba(213,197,168,0.3)", background: "rgba(213,197,168,0.06)", padding: "10px 12px", fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-amber)" }}>
                                Do this now: {intervention.quick_win || "Create one-page active recall notes and test yourself."}
                              </div>
                            </div>
                          ) : null}

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                            <Link
                              href={`/ai-tutor?subject=${encodeURIComponent(gap.subject)}&topic=${encodeURIComponent(gap.topic)}&prompt=${encodeURIComponent(`Teach me ${gap.topic} for exam scoring`)}`}
                              style={{ borderRadius: 8, background: "var(--aa-amber)", padding: "6px 12px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", fontWeight: 600, color: "#131313", textDecoration: "none" }}
                            >
                              Study Now
                            </Link>
                            <button
                              type="button"
                              onClick={() => void markResolved(intervention?.id)}
                              style={{ borderRadius: 8, border: "1px solid var(--aa-border2)", padding: "6px 12px", fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-2)", background: "transparent", cursor: "pointer" }}
                            >
                              Mark Resolved
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {/* High risk — collapsible */}
                <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "20px" }}>
                  <button type="button" onClick={() => setShowHighRisk((prev) => !prev)} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontWeight: 600, color: "var(--aa-text-1)" }}>High Risk Topics ({filtered.high_risk.length})</span>
                    {showHighRisk ? <ChevronUp style={{ width: 16, height: 16, color: "var(--aa-text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--aa-text-3)" }} />}
                  </button>
                  {showHighRisk ? (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {filtered.high_risk.map((gap) => (
                        <div key={`${gap.subject}-${gap.topic}`} style={{ borderRadius: 8, border: "1px solid rgba(245,158,11,0.35)", background: "var(--aa-bg)", padding: "12px" }}>
                          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)" }}>
                            {gap.topic} <span style={{ color: "var(--aa-text-3)", fontSize: "0.8rem" }}>({gap.subject})</span>
                          </p>
                          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "#f4cd84", marginTop: 2 }}>Score {gap.weakness_score}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Moderate risk — collapsible */}
                <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "20px" }}>
                  <button type="button" onClick={() => setShowModerate((prev) => !prev)} style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                    <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontWeight: 600, color: "var(--aa-text-1)" }}>Moderate Risk Topics ({filtered.moderate_risk.length})</span>
                    {showModerate ? <ChevronUp style={{ width: 16, height: 16, color: "var(--aa-text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--aa-text-3)" }} />}
                  </button>
                  {showModerate ? (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {filtered.moderate_risk.map((gap) => (
                        <div key={`${gap.subject}-${gap.topic}`} style={{ borderRadius: 8, border: "1px solid var(--aa-border2)", background: "var(--aa-bg)", padding: "12px" }}>
                          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "var(--aa-text-1)" }}>
                            {gap.topic} <span style={{ color: "var(--aa-text-3)", fontSize: "0.8rem" }}>({gap.subject})</span>
                          </p>
                          <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.75rem", color: "var(--aa-text-2)", marginTop: 2 }}>Score {gap.weakness_score}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Strong areas */}
                <div style={{ borderRadius: 12, border: "1px solid rgba(34,197,94,0.35)", background: "var(--aa-s2)", padding: "20px" }}>
                  <h3 style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", fontWeight: 600, color: "#9ce7ad", marginBottom: 12 }}>Strong Areas</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {filtered.strong_areas.slice(0, 5).map((gap) => (
                      <span key={`${gap.subject}-${gap.topic}`} style={{ borderRadius: 9999, background: "rgba(34,197,94,0.12)", padding: "4px 12px", fontFamily: "var(--aa-fb)", fontSize: "0.78rem", color: "#9ce7ad" }}>
                        {gap.topic}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ borderRadius: 12, border: "1px solid var(--aa-border)", background: "var(--aa-s2)", padding: "40px", textAlign: "center" }}>
                <BarChart3 style={{ width: 40, height: 40, color: "var(--aa-amber)", margin: "0 auto 12px" }} />
                <p style={{ fontFamily: "var(--aa-fb)", fontSize: "0.9rem", color: "var(--aa-text-2)" }}>Run weakness analysis to identify your mark-risk topics.</p>
              </div>
            )}

            {insightsError ? (
              <div style={{ borderRadius: 10, border: "1px solid #7a3f30", background: "#2a1d1b", padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: "#ffcf9d", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--aa-fb)", fontSize: "0.875rem", color: "#ffcf9d" }}>{insightsError}</span>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
